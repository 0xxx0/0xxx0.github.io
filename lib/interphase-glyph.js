(function(root,factory){
  'use strict';
  const ring=(typeof module==='object'&&module.exports)?require('./interphase-ring.js'):root?.InterphaseRing;
  const api=factory(ring);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.InterphaseGlyph=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(RING){
  'use strict';
  if(!RING)throw new Error('INTERPHASE_RING_REQUIRED');
  const VERSION='interphase-glyph/v0.1',TAU=RING.TAU;
  const CHANNELS=['identity','address','content','depth','time','authority','raster','evidence'];
  const clamp=RING.clamp;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function hash(input=''){let h=2166136261>>>0;for(const c of String(input)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)>>>0}return h>>>0}
  const polar=RING.polar;
  function polygon(seed,cx,cy,r){
    const n=3+(seed%6),rot=-Math.PI/2+((seed>>>8)%360)*Math.PI/180,pts=[];
    for(let i=0;i<n;i++){const a=rot+TAU*i/n;pts.push(polar(cx,cy,r,a))}
    return pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(2)+' '+p[1].toFixed(2)).join(' ')+' Z';
  }
  function array(x){return Array.isArray(x)?x:[]}
  function finite(x){const n=Number(x);return Number.isFinite(n)?n:null}
  function domainGlyph(desc={}){
    const g=desc?.value?.glyph||desc?.glyph||null;
    if(!g||!Array.isArray(g.radial)||g.radial.length<3)return null;
    return g;
  }
  function depthSpec(desc={}){
    const v=desc.value||{},chain=array(v.chain),structure=array(v.structure),scales=array(v.scales);
    if(chain.length)return{count:chain.length,active:Math.max(0,chain.length-1),labels:chain.map(x=>x.label||x.id||'')};
    if(scales.length){
      const current=String(v.scale||v.scopeName||'').toUpperCase(),i=scales.findIndex(x=>String(x.id||x.label||x).toUpperCase()===current);
      return{count:scales.length,active:Math.max(0,i),labels:scales.map(x=>x.label||x.id||String(x))};
    }
    if(structure.length)return{count:structure.length,active:0,labels:structure.map(x=>x.label||x.id||'')};
    const kids=array(desc.children);if(desc.parent||kids.length)return{count:Math.max(1,kids.length+1),active:0,labels:[]};
    return null;
  }
  function timeSpec(desc={}){
    const v=desc.value||{},t=v.transport||{},clock=desc.clock||{};
    const duration=finite(t.duration)??finite(clock.duration),current=finite(t.time)??finite(clock.current);
    const sections=array(v.map?.sections||v.sections),pins=array(v.pins);
    if(duration==null&&current==null&&!sections.length&&!pins.length)return null;
    return{
      duration:Math.max(.001,duration||1),current:clamp(current||0,0,Math.max(.001,duration||1)),
      sections:sections.map(x=>finite(x?.t??x)).filter(x=>x!=null),
      pins:pins.map(x=>finite(x?.address??x?.time??x)).filter(x=>x!=null)
    };
  }
  function model(desc={},opt={}){
    const id=String(desc.id||'unaddressed'),seed=hash(id),channels=[...new Set(array(desc.channels).filter(x=>CHANNELS.includes(x)))],
      ops=array(desc.operations).map(x=>typeof x==='string'?{id:x,authority:'VIEW'}:{id:String(x?.id||''),authority:String(x?.authority||'VIEW')}).filter(x=>x.id),
      residue=array(opt.residue),depth=depthSpec(desc),time=timeSpec(desc),g=domainGlyph(desc);
    return{
      schema:VERSION,id,seed,kind:String(desc.kind||'object'),label:String(desc.label||id),
      channels,operations:ops,residue,depth,time,domainGlyph:g,
      address:desc.address||null,authority:String(desc.authority||'VIEW'),
      projection:String(opt.projection||'GLYPH'),focusGate:Number.isFinite(Number(opt.focusGate))?Number(opt.focusGate):-Math.PI/2
    };
  }
  function ringTicks(cx,cy,r,count,active=-1,{len=7,gate=null}={}){
    if(!count)return'';
    let s='';
    for(let i=0;i<count;i++){
      const a=RING.slotAngle(i,count),[x1,y1]=polar(cx,cy,r-len,a),[x2,y2]=polar(cx,cy,r,a);
      s+='<path d="M'+x1.toFixed(2)+' '+y1.toFixed(2)+' L'+x2.toFixed(2)+' '+y2.toFixed(2)+'" class="'+(i===active?'active':'tick')+'"/>';
    }
    if(gate!=null){const [x1,y1]=polar(cx,cy,r-len*1.8,gate),[x2,y2]=polar(cx,cy,r+3,gate);s+='<path d="M'+x1.toFixed(2)+' '+y1.toFixed(2)+' L'+x2.toFixed(2)+' '+y2.toFixed(2)+'" class="gate"/>'}
    return s;
  }
  function audioCore(g,cx,cy,r){
    const rot=finite(g.rotation)||0,rad=array(g.radial),pts=rad.map((v,i)=>polar(cx,cy,r*clamp(Number(v)||0,.15,1),rot-Math.PI/2+TAU*i/rad.length)),
      path=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(2)+' '+p[1].toFixed(2)).join(' ')+' Z';
    let spokes='';
    for(let i=0;i<array(g.chroma).length;i++){const v=clamp(Number(g.chroma[i])||0,0,1),a=rot-Math.PI/2+TAU*i/g.chroma.length,[x1,y1]=polar(cx,cy,r*.18,a),[x2,y2]=polar(cx,cy,r*(.3+.6*v),a);spokes+='<path d="M'+x1.toFixed(2)+' '+y1.toFixed(2)+' L'+x2.toFixed(2)+' '+y2.toFixed(2)+'" class="data" opacity="'+(.18+.65*v).toFixed(3)+'"/>'}
    return'<path d="'+path+'" class="domain"/>'+spokes;
  }
  function svg(input={},opt={}){
    const m=input?.schema===VERSION?input:model(input,opt),S=Math.max(120,Number(opt.size)||400),c=S/2,R=S*.43,gate=m.focusGate;
    const coreR=R*.42,depthR=R*.57,timeR=R*.72,channelR=R*.86,opR=R*.98;
    let core=m.domainGlyph?audioCore(m.domainGlyph,c,c,coreR):'<path d="'+polygon(m.seed,c,c,coreR*.88)+'" class="domain"/><circle cx="'+c+'" cy="'+c+'" r="'+(coreR*.16).toFixed(2)+'" class="center"/>';
    let depth='';
    if(m.depth){
      const n=Math.max(1,m.depth.count);
      for(let i=0;i<n;i++){const rr=depthR-(n-1-i)*Math.min(8,R*.035);depth+='<circle cx="'+c+'" cy="'+c+'" r="'+rr.toFixed(2)+'" class="'+(i===m.depth.active?'scale activeScale':'scale')+'"/>'}
      depth+=ringTicks(c,c,depthR,n,m.depth.active,{len:Math.max(5,R*.035),gate});
    }
    let time='';
    if(m.time){
      time+='<circle cx="'+c+'" cy="'+c+'" r="'+timeR.toFixed(2)+'" class="time"/>';
      const a=gate+TAU*(m.time.current/m.time.duration),[x1,y1]=polar(c,c,timeR-10,a),[x2,y2]=polar(c,c,timeR+9,a);
      time+='<path d="M'+x1.toFixed(2)+' '+y1.toFixed(2)+' L'+x2.toFixed(2)+' '+y2.toFixed(2)+'" class="cursor"/>';
      for(const t of m.time.sections){const q=clamp(t/m.time.duration,0,1),aa=gate+TAU*q,[u1,v1]=polar(c,c,timeR-7,aa),[u2,v2]=polar(c,c,timeR+7,aa);time+='<path d="M'+u1.toFixed(2)+' '+v1.toFixed(2)+' L'+u2.toFixed(2)+' '+v2.toFixed(2)+'" class="section"/>'}
      for(const t of m.time.pins){const q=clamp(t/m.time.duration,0,1),aa=gate+TAU*q,[x,y]=polar(c,c,timeR+13,aa);time+='<circle cx="'+x.toFixed(2)+'" cy="'+y.toFixed(2)+'" r="3" class="pin"/>'}
    }
    let channels='<circle cx="'+c+'" cy="'+c+'" r="'+channelR.toFixed(2)+'" class="channelRing"/>';
    for(let i=0;i<CHANNELS.length;i++){
      const on=m.channels.includes(CHANNELS[i]),a=gate+TAU*(i+.5)/CHANNELS.length,[x1,y1]=polar(c,c,channelR-6,a),[x2,y2]=polar(c,c,channelR+6,a);
      channels+='<path d="M'+x1.toFixed(2)+' '+y1.toFixed(2)+' L'+x2.toFixed(2)+' '+y2.toFixed(2)+'" class="'+(on?'channel on':'channel off')+'"/>';
    }
    let ops='<circle cx="'+c+'" cy="'+c+'" r="'+opR.toFixed(2)+'" class="opRing"/>';
    const n=Math.max(1,m.operations.length);
    m.operations.forEach((o,i)=>{const a=gate+TAU*(i+.5)/n,[x1,y1]=polar(c,c,opR-8,a),[x2,y2]=polar(c,c,opR+2,a);ops+='<path d="M'+x1.toFixed(2)+' '+y1.toFixed(2)+' L'+x2.toFixed(2)+' '+y2.toFixed(2)+'" class="op '+esc(o.authority.toLowerCase())+'"/>'});
    const residue=m.residue.length?'<circle cx="'+c+'" cy="'+c+'" r="'+(opR+5).toFixed(2)+'" class="residue"/>':'';
    const [gx1,gy1]=polar(c,c,coreR*.15,gate),[gx2,gy2]=polar(c,c,opR+8,gate);
    return'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+S+' '+S+'" role="img" aria-label="'+esc(m.label)+'" data-interphase-glyph="'+VERSION+'">'+
      '<style>.bg{fill:#05070b}.domain,.scale,.time,.channelRing,.opRing{fill:none;stroke:#e8f0f3;stroke-width:1.3}.domain{stroke:#dbe8ee;opacity:.78}.center{fill:none;stroke:#efad57;stroke-width:1.6}.data{fill:none;stroke:#dbe8ee}.scale{opacity:.12}.activeScale{opacity:.58;stroke:#76c9ff}.time{opacity:.22}.tick{stroke:#64727a;stroke-width:1}.active{stroke:#76c9ff;stroke-width:2}.gate{stroke:#ef7548;stroke-width:2.4}.cursor{stroke:#fff;stroke-width:2.7}.section{stroke:#76c9ff;stroke-width:1.8}.pin{fill:#efad57}.channelRing,.opRing{opacity:.12}.channel{stroke-width:2}.channel.on{stroke:#b9c8cf}.channel.off{stroke:#283238}.op{stroke-width:2}.op.view{stroke:#76c9ff}.op.edit{stroke:#efad57}.op.effect{stroke:#ef7548}.residue{fill:none;stroke:#d78298;stroke-width:1;stroke-dasharray:3 5}.focusSpine{stroke:#ef7548;stroke-width:2}</style>'+
      '<rect class="bg" width="'+S+'" height="'+S+'"/>'+core+depth+time+channels+ops+residue+
      '<path d="M'+gx1.toFixed(2)+' '+gy1.toFixed(2)+' L'+gx2.toFixed(2)+' '+gy2.toFixed(2)+'" class="focusSpine"/></svg>';
  }
  function render(target,desc,opt={}){if(!target)throw new Error('GLYPH_TARGET_REQUIRED');target.innerHTML=svg(desc,opt);return model(desc,opt)}
  return Object.freeze({VERSION,CHANNELS,model,svg,render});
});