(()=>{'use strict';
const G=globalThis,I=G.Interphase,api=G.DaylineConfluence;
if(!I||!api||typeof api.interphaseObject!=='function')return;
let projection='FOVEA';
try{
  const q=new URLSearchParams(G.location?.search||'');
  const p=String(q.get('ip')||q.get('interphase')||'FOVEA').toUpperCase();
  if(['PAGE','FOVEA','LINE','RING'].includes(p))projection=p;
}catch(_){}
const current=()=>api.interphaseObject();
const adapter={
  id:'dayline-workfield',
  idOf:r=>typeof r==='string'?r:r?.id,
  resolve:r=>{
    const x=current();
    if(!x)return null;
    if(typeof r==='string')return x.id===r?x:null;
    return r;
  },
  describe:r=>{
    if(!r)throw new Error('DAYLINE_INTERPHASE_UNRESOLVED');
    return{
      id:r.id,kind:r.kind||'dayline-object',label:r.title||r.id,
      address:{text:r.address||'',route:r.route||'',return_to:r.returnTo||''},
      channels:Array.isArray(r.channels)?r.channels:['identity','address','content','time','authority','evidence'],
      capabilities:['read'],operations:[],
      authority:'VIEW',
      parent:r.route||null,
      children:[],
      value:{
        owner:r.owner||'DAYLINE',status:r.status||null,moves:r.moves||[],
        witness:r.witness||null,source_link:r.sourceLink||null,
        inherited_interphase:r.inheritedInterphase||null,
        authority:r.authority||'VIEW / NATIVE_DAYLINE_EFFECTS_ONLY'
      }
    };
  },
  read:r=>({
    id:r.id,title:r.title,owner:r.owner,address:r.address,route:r.route,status:r.status,
    moves:r.moves,witness:r.witness,sourceLink:r.sourceLink,inheritedInterphase:r.inheritedInterphase,returnTo:r.returnTo
  }),
  capture:()=>({object_id:current()?.id||null,projection}),
  invoke:()=>({ok:false,reason:'DAYLINE_NATIVE_EFFECTS_ONLY'})
};
const host=I.createHost(adapter,{id:'DAYLINE',projection});
function sync(){
  const x=current();if(!x?.id)return;
  host.select(x);host.focus(x,{aperture:'WORK'});
  host.project(projection,{source:'dayline-workfield'});
  render();
  try{G.dispatchEvent(new CustomEvent('dayline-interphase:state',{detail:host.projectionResult()}))}catch(_){}
}
function offices(x){
  const source=(x?.sourceLink?.source?.route||x?.route||'LOCAL').replace(/^\//,'')||'LOCAL';
  const frame=x?.owner||'DAYLINE',focus=x?.title||'EMPTY',operate=(x?.moves||[]).length+' MOVE'+((x?.moves||[]).length===1?'':'S');
  const witness=x?.witness?'RECORDED':'OPEN',ret=x?.returnTo||'/';
  return[
    ['SOURCE',source],['FRAME',frame],['FOCUS',focus],['OPERATE',operate],['WITNESS',witness],['RETURN',ret]
  ];
}
function render(){
  const doc=G.document;if(!doc)return;
  const x=current(),rail=doc.getElementById('interphaseRail');if(!rail||!x)return;
  const result=host.projectionResult();
  const label=doc.getElementById('ipProjection'),obj=doc.getElementById('ipObject'),res=doc.getElementById('ipResidue'),officeHost=doc.getElementById('ipOffices');
  if(label)label.textContent=result.projection;
  if(obj)obj.textContent=(x.inheritedInterphase?.host?x.inheritedInterphase.host+' → ':'')+'DAYLINE · '+x.id;
  if(res)res.textContent=result.residue.length?result.residue.length+' CHANNEL'+(result.residue.length===1?'':'S')+' HELD AS RESIDUE':'LOSSLESS FOR HELD CHANNELS';
  if(officeHost)officeHost.innerHTML=offices(x).map(([k,v])=>'<span><b>'+esc(k)+'</b><i>'+esc(v)+'</i></span>').join('');
  doc.querySelectorAll('[data-ip-projection]').forEach(b=>b.classList.toggle('on',b.dataset.ipProjection===projection));
}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
const doc=G.document;
if(doc){
  doc.addEventListener('click',e=>{
    const b=e.target?.closest?.('[data-ip-projection]');if(!b)return;
    const p=String(b.dataset.ipProjection||'').toUpperCase();
    if(!['PAGE','FOVEA','LINE','RING'].includes(p))return;
    projection=p;sync();
  });
}
if(typeof G.addEventListener==='function')G.addEventListener('dayline:state',sync);
G.DaylineInterphase=host;
sync();
})();
