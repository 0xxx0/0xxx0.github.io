(()=>{'use strict';
const L=()=>window.LensState,H=()=>window.FieldLensHost;
let foveate=false;
const FIELD_FOVEATE={
  lensId:'field-foveate',lensVersion:'0.2',kind:'VIEW_LENS',
  params:{bands:['FOVEA','PARA','PERIPHERY']},
  inputContract:'field-route/v0.1',outputContract:'field-route/v0.1',
  preserves:['objectId','focusId','route-position'],hides:['periphery-subdetail'],
  derives:['semantic-distance-band'],authority:'PREVIEW'
};
const SCALE_SPATIAL={
  lensId:'scale-spatial-lineage',lensVersion:'1',kind:'VIEW_LENS',
  params:{surface:'studio'},inputContract:'scale-*',outputContract:'scale-snapshot/v0.1',
  preserves:['objectId','focusId'],hides:[],derives:['spatial-context'],authority:'PREVIEW'
};
function constraintDescriptor(st){
  const a=st?.axisState||{},active=Object.entries(a).filter(([,v])=>v&&v!=='ANY');
  if(!active.length)return null;
  return{
    lensId:'field-axial-constraints',lensVersion:'0.1',kind:'VIEW_LENS',
    params:Object.fromEntries(active),inputContract:'field-route/v0.1',outputContract:'field-route/v0.1',
    preserves:['objectId','focusId'],hides:['unsupported-routes'],derives:['lawful-support-set'],authority:'PREVIEW'
  };
}
function routePacket(r){
  return{schema:'field-route/v0.1',id:r?.id||r?.href||'/',href:r?.href||'/',title:r?.title||'FIELD INDEX',
    kind:r?.kind||'root',state:r?.state||'CORE',operation:r?.operation||'ORIENT',role:r?.role||'',
    index:r?.index||null,parent:r?.parent||'/',family:r?.family||'FIELD'};
}
function snapshot(){
  const h=H(),l=L();if(!h||!l)return null;
  const r=h.focus?.()||routePacket(null),ui=h.uiState?.()||{};
  let s=l.fromFieldRoute(routePacket(r),{returnAddress:location.pathname+location.search+location.hash});
  s.aperture={level:ui.mapDepth??0,range:ui.mapRoot||'/',shape:'field-focus'};
  s.projection=ui.projection||'AXIAL_LATEST';
  s.meta={...s.meta,axisState:ui.axisState||{},foveate,mapRoot:ui.mapRoot||'/',source:'field-index-axial-latest'};
  const axial=constraintDescriptor(ui);
  if(axial)s=l.compose(s,axial);
  if(foveate&&s.projection==='VISUAL')s=l.compose(s,FIELD_FOVEATE);
  return l.normalize(s);
}
function uiState(){const h=H();return{...(h?.uiState?.()||{}),foveate}}
function restore(st){if(!st)return;foveate=!!st.foveate;H()?.restore?.(st);sync()}
function projections(){return['AXIAL_LATEST','VISUAL','PULSE','STRUCTURE','EVOLVE','RECENT']}
function catalog(){return[FIELD_FOVEATE,SCALE_SPATIAL]}
function applyLens(id){
  if(id==='field-foveate'){
    foveate=!foveate;
    if(foveate&&H()?.projection?.()!=='VISUAL')H()?.project?.('VISUAL');
    sync();return snapshot();
  }
  return snapshot();
}
function clearFoveation(){
  const svg=document.getElementById('fieldMap');if(!svg)return;
  svg.querySelectorAll('.mapNode').forEach(g=>{g.style.opacity='';const r=g.querySelector('rect');if(r){r.style.stroke='';r.style.strokeWidth=''}const t=g.querySelector('text');if(t)t.style.fontSize=''});
  const center=svg.querySelector(':scope > text');if(center)center.style.opacity='';
  svg.querySelectorAll('.mapEdge').forEach(x=>x.style.opacity='');
}
function applyFoveation(){
  clearFoveation();
  const h=H(),ui=h?.uiState?.();if(!foveate||ui?.projection!=='VISUAL')return;
  const svg=document.getElementById('fieldMap'),kids=h?.visualKids?.()||[],focusHref=h?.focus?.()?.href;if(!svg)return;
  const nodes=[...svg.querySelectorAll('.mapNode')],edges=[...svg.querySelectorAll('.mapEdge')],center=svg.querySelector(':scope > text');
  const focusAtCenter=focusHref&&focusHref===ui?.mapRoot;
  if(center)center.style.opacity=focusAtCenter?'1':'.82';
  nodes.forEach((g,i)=>{
    const href=kids[i]?.href,isFocus=href&&href===focusHref;
    const para=focusAtCenter||isFocus;
    g.dataset.lensBand=isFocus?'FOVEA':para?'PARA':'PERIPHERY';
    g.style.opacity=isFocus?'1':para?'.9':'.36';
    const rect=g.querySelector('rect');if(rect&&isFocus){rect.style.stroke='#72bce7';rect.style.strokeWidth='2.4'}
    const t=g.querySelector('text');if(t&&!para)t.style.fontSize='7px';
    if(edges[i])edges[i].style.opacity=isFocus?'.95':para?'.7':'.2';
  });
}
function sync(){
  applyFoveation();const s=snapshot();if(s)window.dispatchEvent(new CustomEvent('field-lens:state',{detail:s}));
}
function openStudio(){
  const h=H(),l=L(),s=snapshot(),r=h?.focus?.();if(!l||!s||!r)return;
  const route=routePacket(r),text=JSON.stringify(route,null,2),label='FIELD · '+(r.title||r.href);
  try{
    l.storeHandoff(s,{title:label,sourceUrl:r.href,text});
    sessionStorage.setItem('scale.lens.handoff.v01',JSON.stringify({text,label,created_at:new Date().toISOString(),source:'field-index-axial-latest'}));
  }catch(_){}
  location.assign('./fold-bloom/lens/');
}
window.FieldLensAPI=Object.freeze({
  snapshot,uiState,restore,projections,catalog,applyLens,
  rise:()=>{H()?.rise?.();sync()},
  dive:()=>{H()?.dive?.();sync()},
  peer:d=>{H()?.peer?.(d);sync()},
  project:m=>{H()?.project?.(m);sync()},
  openStudio
});
window.FieldLensOptions={showTrigger:false};
window.addEventListener('field-index:state',sync);
window.addEventListener('field-density',()=>requestAnimationFrame(sync));
const b=document.getElementById('apLens');if(b){b.textContent='◎ LENS';b.onclick=()=>window.LensFocusRing?.open?.()}
requestAnimationFrame(sync);
})();