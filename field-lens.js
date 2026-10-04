(()=>{'use strict';
const L=()=>window.LensState,H=()=>window.FieldLensHost;
let foveate=false,interferenceState=null,interferenceEpoch=0,interferenceRefreshQueued=false;
let interferenceCorePromise=null,interferenceTruthPromise=null;
const FIELD_FOVEATE={
  lensId:'field-foveate',lensVersion:'0.2',kind:'VIEW_LENS',
  status:'PARKED_NO_CLEAR_GAIN',
  note:'Initial human PLAIN↔FOVEATED trial produced no notable or self-evident task advantage; retain as optional donor, not primary Lens path.',
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
function compactInterference(){
  const s=interferenceState,p=s?.pair;if(!p)return null;
  return{material:!!s.material,threshold:s.threshold,current:s.current,alternative:s.alternative,total:p.total,channel:p.channel,coordinate:p.coordinate};
}
function uiState(){const h=H();return{...(h?.uiState?.()||{}),foveate,interference:compactInterference()}}
function restore(st){if(!st)return;foveate=!!st.foveate;H()?.restore?.(st);sync()}
function projections(){return['AXIAL_LATEST','VISUAL','PULSE','STRUCTURE','EVOLVE','RECENT']}
function catalog(){return[FIELD_FOVEATE,SCALE_SPATIAL]}
function setFoveate(next){
  foveate=!!next;
  if(foveate&&H()?.projection?.()!=='VISUAL')H()?.project?.('VISUAL');
  sync();return snapshot();
}
function applyLens(id){
  if(id==='field-foveate')return setFoveate(true);
  return snapshot();
}
function removeLens(id){
  if(id==='field-foveate')return setFoveate(false);
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
function ensureInterferenceStyle(){
  if(document.getElementById('fieldInterferenceStyle'))return;
  const st=document.createElement('style');st.id='fieldInterferenceStyle';
  st.textContent=`
#apGlyph{position:relative}
.fieldMismatchMark{--fi-a:0deg;--fi-b:18deg;--fi-gap:2.4px;--fi-alpha:.72;position:absolute;right:-7px;top:-7px;width:18px;height:18px;min-width:18px;padding:0;border:1px solid var(--line);border-radius:50%;background:var(--bg);overflow:hidden;cursor:pointer;z-index:8;box-shadow:0 0 0 2px var(--bg);opacity:.9}
.fieldMismatchMark::before,.fieldMismatchMark::after{content:"";position:absolute;inset:2px;border-radius:50%;pointer-events:none}
.fieldMismatchMark::before{background:repeating-linear-gradient(var(--fi-a),transparent 0 1px,rgba(114,188,231,var(--fi-alpha)) 1px 2px,transparent 2px var(--fi-gap))}
.fieldMismatchMark::after{background:repeating-linear-gradient(var(--fi-b),transparent 0 1px,rgba(237,116,71,var(--fi-alpha)) 1px 2px,transparent 2px var(--fi-gap));mix-blend-mode:screen}
html[data-theme="light"] .fieldMismatchMark::after{mix-blend-mode:multiply}
.fieldMismatchMark:hover,.fieldMismatchMark:focus-visible{border-color:var(--gold);outline:1px solid var(--gold);outline-offset:1px;opacity:1}
.fieldMismatchMark[data-level="high"]{border-color:var(--hot)}
.fieldMismatchMark[data-level="mid"]{border-color:var(--gold)}
@media(prefers-reduced-motion:no-preference){.fieldMismatchMark[data-live="1"]::after{animation:fiPhase 4.2s linear infinite}@keyframes fiPhase{to{transform:rotate(360deg)}}}
`;
  document.head.appendChild(st);
}
function clearInterferenceMark(){document.querySelector('.fieldMismatchMark')?.remove();interferenceState=null}
function interferenceCore(){return interferenceCorePromise||(interferenceCorePromise=import('/field/moire-route/pair.mjs'))}
function interferenceTruth(){
  return interferenceTruthPromise||(interferenceTruthPromise=Promise.all([
    fetch('/showcase-manifest.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('manifest '+r.status);return r.json()}),
    fetch('/control/CURRENT.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('CURRENT '+r.status);return r.json()})
  ]).then(([manifest,current])=>({manifest,current})));
}
function mismatchHref(focus,projection,alternative){
  const p=new URLSearchParams({focus,projection,compare:alternative});
  const a=H()?.uiState?.()?.axisState||{};
  if(a.state&&a.state!=='ANY')p.set('ax_state',a.state);
  if(a.operation&&a.operation!=='ANY')p.set('ax_op',a.operation);
  if(a.mode&&a.mode!=='ANY')p.set('ax_mode',a.mode);
  return '/field/moire-route/?'+p.toString();
}
async function syncInterferenceMark(){
  const epoch=++interferenceEpoch;clearInterferenceMark();
  const host=H(),route=host?.focus?.(),rawProjection=host?.projection?.()||'AXIAL_LATEST';
  if(!route?.href)return;
  try{
    const [P,truth]=await Promise.all([interferenceCore(),interferenceTruth()]);
    const projection=P.normalizeProjection?P.normalizeProjection(rawProjection):String(rawProjection||'AXIAL_LATEST');
    const choice=P.chooseCounterProjection(truth.manifest,truth.current,route.href,projection,{threshold:.24});
    const currentRoute=H()?.focus?.(),currentProjection=H()?.projection?.()||'AXIAL_LATEST';
    if(epoch!==interferenceEpoch||currentRoute?.href!==route.href)return;
    if(P.normalizeProjection&&P.normalizeProjection(currentProjection)!==projection)return;
    interferenceState=choice;
    if(!choice?.material||!choice.pair||!choice.alternative)return;
    const pair=choice.pair,hostEl=document.getElementById('apGlyph');if(!hostEl)return;
    ensureInterferenceStyle();
    const b=document.createElement('button');b.type='button';b.className='fieldMismatchMark';b.dataset.live='1';
    b.dataset.level=pair.total>=.5?'high':'mid';
    const delta=Math.round(6+42*Math.min(1,pair.coordinate));
    const gap=(3.35-1.45*Math.min(1,pair.total)).toFixed(2)+'px';
    const alpha=(.42+.48*Math.min(1,pair.channel+.25*pair.coordinate)).toFixed(2);
    b.style.setProperty('--fi-a','0deg');b.style.setProperty('--fi-b',delta+'deg');b.style.setProperty('--fi-gap',gap);b.style.setProperty('--fi-alpha',alpha);
    const pc=n=>Math.round(n*100)+'%';
    b.setAttribute('aria-label','Representation disagreement '+pc(pair.total)+'; open interference instrument');
    b.title='REPRESENTATION DISAGREEMENT '+pc(pair.total)+' · '+pair.left_label+' ↔ '+pair.right_label+' · channels '+pc(pair.channel)+' · coordinates '+pc(pair.coordinate)+' · open instrument';
    b.onclick=e=>{e.preventDefault();e.stopPropagation();location.assign(mismatchHref(route.href,choice.current,choice.alternative))};
    hostEl.appendChild(b);
  }catch(_){
    if(epoch===interferenceEpoch)clearInterferenceMark();
  }
}
function scheduleInterferenceMark(){
  if(interferenceRefreshQueued)return;interferenceRefreshQueued=true;
  requestAnimationFrame(()=>{interferenceRefreshQueued=false;syncInterferenceMark()});
}
function sync(){
  applyFoveation();const s=snapshot();if(s)window.dispatchEvent(new CustomEvent('field-lens:state',{detail:s}));syncInterferenceMark();
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
  snapshot,uiState,restore,projections,catalog,applyLens,removeLens,
  rise:()=>{H()?.rise?.();sync()},
  dive:()=>{H()?.dive?.();sync()},
  project:m=>{H()?.project?.(m);sync()},
  interference:()=>compactInterference(),
  openStudio
});
window.FieldLensOptions={showTrigger:false,placement:'inline',anchor:'#aperture'};
window.addEventListener('field-index:state',sync);
window.addEventListener('field-density',()=>requestAnimationFrame(sync));
const b=document.getElementById('apLens');if(b){b.textContent='◎ LENS';b.title='Refract the current FIELD focus without changing selection';b.onclick=()=>window.LensFocusRing?.open?.()}
const apGlyph=document.getElementById('apGlyph');
if(apGlyph&&window.MutationObserver)new MutationObserver(()=>{
  if(interferenceState?.material&&H()?.focus?.()?.href&&!apGlyph.querySelector('.fieldMismatchMark'))scheduleInterferenceMark();
}).observe(apGlyph,{childList:true});
requestAnimationFrame(sync);
})();