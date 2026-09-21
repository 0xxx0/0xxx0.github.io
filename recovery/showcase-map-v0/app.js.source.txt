(()=>{'use strict';
const $=s=>document.querySelector(s),svg=$('#map'),ap=$('#aperture'),search=$('#search');
const NS='http://www.w3.org/2000/svg',cx=500,cy=500,TAU=Math.PI*2,OPS=['CAPTURE','PLAY','REPRESENT','PLAN','PROVE'];
let manifest=null,fed=null,changes=null,artifacts=[],records=[],events=[],selection=null,mode='ALL',zoom=1;
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const E=(tag,a={})=>{const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(a))n.setAttribute(k,v);return n};
const polar=(r,a)=>[cx+Math.cos(a)*r,cy+Math.sin(a)*r];
const norm=a=>((a%TAU)+TAU)%TAU;
function add(tag,a={},parent=svg){const n=E(tag,a);parent.append(n);return n}
function text(x,y,t,cls='',parent=svg,anchor='middle'){const n=add('text',{x,y,class:cls,'text-anchor':anchor},parent);n.textContent=t;return n}
function arcPath(r,a0,a1){const p0=polar(r,a0),p1=polar(r,a1);return 'M '+p0[0]+' '+p0[1]+' A '+r+' '+r+' 0 '+(norm(a1-a0)>Math.PI?1:0)+' 1 '+p1[0]+' '+p1[1]}
function node(g,op,x,y,r=13){
  if(op==='PLAY')add('circle',{cx:x,cy:y,r,class:'node'},g);
  else if(op==='CAPTURE')add('rect',{x:x-r,y:y-r,width:r*2,height:r*2,class:'node'},g);
  else if(op==='REPRESENT')add('path',{d:'M '+x+' '+(y-r-2)+' L '+(x+r+2)+' '+y+' L '+x+' '+(y+r+2)+' L '+(x-r-2)+' '+y+' Z',class:'node'},g);
  else if(op==='PROVE')add('path',{d:'M '+x+' '+(y-r-3)+' L '+(x+r+3)+' '+(y+r)+' L '+(x-r-3)+' '+(y+r)+' Z',class:'node'},g);
  else{add('path',{d:'M '+(x-r-2)+' '+(y+5)+' A '+(r+4)+' '+(r+4)+' 0 0 1 '+(x+r+2)+' '+(y+5),class:'node'},g);add('line',{x1:x,y1:y-11,x2:x,y2:y+11,stroke:'var(--ink)','stroke-width':1.5},g)}
}
function artifactAngles(){
  const by=Object.fromEntries(OPS.map(k=>[k,[]])),out=new Map();
  artifacts.forEach(a=>(by[a.operation]||by.REPRESENT).push(a));
  OPS.forEach((op,oi)=>{const arr=by[op],center=-Math.PI/2+oi*TAU/OPS.length,spread=.66;arr.forEach((a,i)=>out.set(a.href,center+(i-(arr.length-1)/2)*spread/Math.max(1,arr.length-1)))});
  return out;
}
function eventAngle(e){
  const ts=events.map(x=>+new Date(x.at)),min=Math.min(...ts),max=Math.max(...ts),den=Math.max(1,max-min);
  return -Math.PI/2+(+new Date(e.at)-min)/den*TAU;
}
function render(){
  svg.replaceChildren();
  const q=search.value.trim().toLowerCase(),angles=artifactAngles(),dimHeads=mode==='FED'||mode==='CHANGES',dimFed=mode==='HEADS'||mode==='CHANGES',dimCh=mode==='HEADS'||mode==='FED';
  [122,220,300,355,430].forEach((r,i)=>add('circle',{cx,cy,r,class:'ring '+(i===1||i===4?'major':'')}));
  OPS.forEach((op,i)=>{const a=-Math.PI/2+i*TAU/OPS.length,p=polar(165,a);text(p[0],p[1],op,'opLabel')});
  const prov=fed?.provinces||[];let start=-Math.PI/2,total=records.length||1;
  prov.forEach(p=>{const span=TAU*(p.items.length/total),gap=.014,a0=start+gap,a1=start+span-gap,arc=add('path',{d:arcPath(326,a0,a1),class:'provinceArc'+(selection?.province===p.province?' active':'')});arc.style.opacity=dimFed?.05:'';arc.onclick=()=>{selection={kind:'province',province:p.province,data:p};mode='FED';syncMode();render()};const mid=(a0+a1)/2,tp=polar(302,mid);text(tp[0],tp[1],String(p.items.length),'tiny');p._a0=start;p._span=span;start+=span});
  records.forEach(r=>{const p=prov.find(x=>x.province===r.__province);if(!p)return;const local=r.__index/Math.max(1,p.items.length-1),a=p._a0+.018+local*(p._span-.036),p1=polar(341,a),p2=polar(367,a),hit=!q||[r.id,r.title,r.subprogram,r.type,r.state,r.priority,r.horizon,r.purpose].join(' ').toLowerCase().includes(q),active=selection?.kind==='record'&&selection.data.id===r.id,l=add('line',{x1:p1[0],y1:p1[1],x2:p2[0],y2:p2[1],class:'fedTick'+(active?' active':'')});l.style.opacity=dimFed?.05:(hit?'':'0.05');l.onclick=()=>{selection={kind:'record',province:r.__province,data:r};mode='FED';syncMode();render()}});
  artifacts.forEach(a=>{const ang=angles.get(a.href),p=polar(220,ang),l=polar(176,ang),g=add('g',{class:'artifact'+(selection?.kind==='artifact'&&selection.data.href===a.href?' active':'')});g.style.opacity=dimHeads?.18:'';add('line',{x1:l[0],y1:l[1],x2:p[0],y2:p[1],class:'link'},g);node(g,a.operation,p[0],p[1],14);const hit=!q||[a.title,a.operation,a.state,a.version,a.family,...(a.transfer||[])].join(' ').toLowerCase().includes(q);if(!hit)g.style.opacity='.05';const tp=polar(252,ang),anchor=Math.cos(ang)>.15?'start':Math.cos(ang)<-.15?'end':'middle';text(tp[0],tp[1],a.title.replace(/\s0\.\d+$/,''),'',g,anchor);g.onclick=()=>{selection={kind:'artifact',data:a};mode='HEADS';syncMode();render()}});
  events.forEach(e=>{const a=eventAngle(e),p=polar(430,a),hit=!q||[e.kind,e.summary,e.surface,e.sha].join(' ').toLowerCase().includes(q),active=selection?.kind==='change'&&selection.data.id===e.id,c=add('circle',{cx:p[0],cy:p[1],r:active?6:4,class:'changeTick'+(active?' active':'')});c.style.opacity=dimCh?.08:(hit?'':'0.06');c.onclick=()=>{selection={kind:'change',data:e};mode='CHANGES';syncMode();render()}});
  relations(angles);seal();aperture();viewBox();
}
function relations(angles){
  if(!selection)return;
  if(selection.kind==='change'){const e=selection.data,a=angles.get(e.surface);if(a!=null){const p1=polar(430,eventAngle(e)),p2=polar(220,a);add('path',{d:'M '+p1[0]+' '+p1[1]+' Q 500 500 '+p2[0]+' '+p2[1],class:'relation'})}}
  else if(selection.kind==='artifact'){const a=angles.get(selection.data.href),p1=polar(220,a),p2=polar(405,a);add('line',{x1:p1[0],y1:p1[1],x2:p2[0],y2:p2[1],class:'selectedRay'});events.filter(e=>e.surface===selection.data.href).forEach(e=>{const ep=polar(430,eventAngle(e));add('line',{x1:ep[0],y1:ep[1],x2:p2[0],y2:p2[1],class:'relation'})})}
}
function seal(){add('circle',{cx,cy,r:105,class:'centerSeal'+(selection?' hot':'')});add('circle',{cx,cy,r:94,fill:'none',stroke:'var(--line)','stroke-width':1});text(cx,cy-46,selection?selection.kind.toUpperCase():'APERTURE','tiny');text(cx,cy+59,mode==='ALL'?'ALL RESOLUTIONS':mode,'tiny')}
function aperture(){
  if(!selection){ap.innerHTML='<div class="ey">CENTER MASS</div><h1>9 heads over 117 records.</h1><p>Select a runnable head, federation tick, province arc, or outer change mark. Resolution changes; identity does not.</p><div class="meta">INNER · current public operations<br>MIDDLE · recovered federation IDs<br>OUTER · curated meaningful public deltas</div>';return}
  if(selection.kind==='artifact'){const a=selection.data,ev=events.filter(e=>e.surface===a.href).sort((x,y)=>new Date(y.at)-new Date(x.at)),last=ev[0];ap.innerHTML='<div class="ey">'+esc(a.operation)+' · '+esc(a.state||'')+'</div><h1>'+esc(a.title)+'</h1><p>'+esc(a.contract?.transforms?.verb||a.transfer?.join(' · ')||'Runnable public head')+'</p><div class="meta">'+esc(a.version||'')+' · '+ev.length+' mapped Δ'+(last?'<br>LAST · '+esc(last.kind)+' · '+esc(last.summary):'')+'</div><div class="actions"><a class="primary" href="'+esc(a.href)+'">OPEN →</a>'+(a.receipt?'<a href="'+esc(a.receipt)+'">RECEIPT</a>':'')+'<button id="showChanges">Δ '+ev.length+'</button></div>';$('#showChanges')?.addEventListener('click',()=>{mode='CHANGES';syncMode();render()})}
  else if(selection.kind==='record'){const r=selection.data;ap.innerHTML='<div class="ey">'+esc(selection.province)+' · '+esc(r.id)+'</div><h1>'+esc(r.title)+'</h1><p>'+esc(r.purpose)+'</p><div class="meta">'+esc(r.subprogram)+' · '+esc(r.type)+'<br>'+esc(r.state)+' · '+esc(r.priority)+' / '+esc(r.horizon)+' · '+esc(r.epistemic_status)+'</div>'}
  else if(selection.kind==='province'){const p=selection.data;ap.innerHTML='<div class="ey">FEDERATION PROVINCE</div><h1>'+esc(p.province)+'</h1><p>'+p.items.length+' stable registry records. Geometry is proportional count only; proximity inside the arc does not assert semantic similarity.</p><div class="meta">SELECT A TICK TO DESCEND · / SEARCH TO FILTER</div>'}
  else{const e=selection.data;ap.innerHTML='<div class="ey">Δ '+esc(e.kind)+' · '+new Date(e.at).toLocaleString()+'</div><h1>'+esc(e.summary)+'</h1><p>'+esc(e.surface)+'</p><div class="meta">'+esc(e.sha.slice(0,12))+' · curated public delta, not raw commit noise</div><div class="actions"><a class="primary" href="https://github.com/0xxx0/0xxx0.github.io/commit/'+esc(e.sha)+'">COMMIT →</a>'+(e.surface!=='/'?'<a href="'+esc(e.surface)+'">SURFACE</a>':'')+'</div>'}
}
function syncMode(){document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));$('#scopeRead').textContent=mode==='FED'?'FEDERATION / SOURCE':mode==='CHANGES'?'CHANGE / TIME':mode==='HEADS'?'HEADS / OPERATE':'ALL / SOURCE DEPTH'}
function viewBox(){const base=1000/zoom,x=500-base/2,y=500-base/2;svg.setAttribute('viewBox',x+' '+y+' '+base+' '+base)}
function load(){
  Promise.all([fetch('../showcase-manifest.json',{cache:'no-store'}).then(r=>r.json()),fetch('../federation-atlas.json',{cache:'no-store'}).then(r=>r.json()),fetch('./showcase-changes.json',{cache:'no-store'}).then(r=>r.json())]).then(([m,f,c])=>{
    manifest=m;fed=f;changes=c;artifacts=m.routes.filter(r=>r.kind==='artifact'&&r.showcase_card!==false&&OPS.includes(r.operation));records=f.provinces.flatMap(p=>p.items.map((x,i)=>({...x,__province:p.province,__index:i})));events=c.events||[];$('#selCount').textContent=artifacts.length+' / '+records.length+' / '+events.length+'Δ';render()
  }).catch(err=>{ap.innerHTML='<div class="ey">LOAD FAULT</div><h1>Projection data unavailable.</h1><p>'+esc(err.message||err)+'</p><div class="actions"><a href="../">RETURN SHOWCASE</a></div>'})
}
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;selection=null;syncMode();render()});search.oninput=render;
$('#zoomIn').onclick=()=>{zoom=Math.min(1.75,zoom+.15);viewBox()};$('#zoomOut').onclick=()=>{zoom=Math.max(.82,zoom-.15);viewBox()};
addEventListener('keydown',e=>{if(e.key==='/'&&document.activeElement!==search){e.preventDefault();search.focus()}if(e.key==='Escape'){search.value='';selection=null;mode='ALL';syncMode();render();search.blur()}if(e.key==='+'||e.key==='=')$('#zoomIn').click();if(e.key==='-')$('#zoomOut').click()});
load();
})();