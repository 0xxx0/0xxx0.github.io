(()=>{'use strict';
/*
FIELD PRESENTATION v0.2 — semantic scale, not CSS zoom.
Viewport width chooses presentation density automatically. Legacy explicit
density locks are cleared on boot; scale is an implementation projection, not
a root control. Route identity, focus, authority and browser zoom are never
mutated by this projection.
*/
const LEVELS=[
  {name:'MARK',max:520,band:'FIELD'},
  {name:'COMPACT',max:900,band:'ROUTE'},
  {name:'FULL',max:Infinity,band:'OBJECT'}
];
const KEY='field-semantic-scale/v0.1';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function widthNow(){return Math.max(document.documentElement.clientWidth||0,window.innerWidth||0)}
function indexOfDensity(name){const i=LEVELS.findIndex(x=>x.name===name);return i<0?null:i}
function indexOfBand(name){const s=String(name||'').toUpperCase(),i=LEVELS.findIndex(x=>x.band===s);return i<0?null:i}
function levelFor(width){return LEVELS.find(x=>width<=x.max)?.name||'FULL'}
function readOverride(){
 try{localStorage.removeItem(KEY)}catch(_){}
 return null;
}
let override=readOverride(),lastScaleKey='';
function baseline(width=widthNow()){return levelFor(width)}
function effective(width=widthNow()){return override||baseline(width)}
function state(width=widthNow()){
 const base=baseline(width),density=effective(width),level=LEVELS[indexOfDensity(density)??1];
 return Object.freeze({density,band:level.band,baseline:base,auto:!override,override:override||null,width});
}
function emitScale(prev,next,reason){
 const key=[next.density,next.band,next.baseline,next.auto?'AUTO':'LOCK'].join('|');
 if(key===lastScaleKey&&reason!=='force')return;
 lastScaleKey=key;
 window.dispatchEvent(new CustomEvent('field-scale',{detail:{...next,from:prev?.density||null,reason:reason||'apply'}}));
}
function apply(reason='layout'){
 const root=document.documentElement,prevDensity=root.dataset.density||null,prevBand=root.dataset.scaleBand||null,next=state();
 root.dataset.density=next.density;
 root.dataset.scaleBand=next.band;
 root.dataset.scaleMode=next.auto?'FIT':'LOCKED';
 root.style.setProperty('--field-density',next.density);
 root.style.setProperty('--field-scale-band',next.band);
 if(prevDensity!==next.density)window.dispatchEvent(new CustomEvent('field-density',{detail:{from:prevDensity,to:next.density,width:next.width,band:next.band,reason}}));
 emitScale(prevDensity?{density:prevDensity,band:prevBand}:null,next,reason);
 return next.density;
}
function persist(){
 try{
  if(override)localStorage.setItem(KEY,JSON.stringify({schema:'field-semantic-scale/v0.1',density:override}));
  else localStorage.removeItem(KEY);
 }catch(_){}
}
function setDensity(name,reason='operator'){
 const i=indexOfDensity(String(name||'').toUpperCase());if(i===null)return effective();
 override=LEVELS[i].name;persist();return apply(reason);
}
function setBand(name,reason='operator'){
 const i=indexOfBand(name);if(i===null)return effective();
 return setDensity(LEVELS[i].name,reason);
}
function step(delta,reason='operator'){
 const current=indexOfDensity(effective())??1,target=clamp(current+Number(delta||0),0,LEVELS.length-1);
 return setDensity(LEVELS[target].name,reason);
}
function fit(reason='fit'){
 override=null;persist();return apply(reason);
}
function choose(spec,level=document.documentElement.dataset.density||apply()){
 return spec?.[level]??spec?.FULL??spec?.COMPACT??spec?.MARK??null;
}
let ro;try{ro=new ResizeObserver(()=>apply('layout'));ro.observe(document.documentElement)}catch(_){window.addEventListener('resize',()=>apply('layout'),{passive:true})}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>apply('boot'),{once:true}):apply('boot');
window.FieldPresentation=Object.freeze({LEVELS,levelFor,baseline,effective,state,apply,choose,setDensity,setBand,step,fit});
})();

(()=>{'use strict';
/* FIELD SEMANTIC ZUI v0.1
 *
 * ZUI means disclosure depth over one addressed object, not page magnification.
 * HOLD / WORK / PROVE are existing DOM apertures over the same focus. This
 * adapter coordinates them without creating a store, route, scale control or
 * navigation authority. Browser pinch/zoom and FOVEA remain independent.
 *
 * STATE SOURCE: the two native <details>.open booleans only.
 * MOTION: progressive View Transition enhancement; reduced motion is instant.
 * TRACE: field-zui CustomEvent is transient authority NONE for other crew.
 */
if(typeof window==='undefined'||location.pathname!=='/')return;
const IDS=Object.freeze({WORK:'workDepth',PROVE:'refineFold'});
const root=document.documentElement;
const reduced=()=>!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const details=depth=>document.getElementById(IDS[depth]||'');
const focusHref=()=>window.__fieldAct?.focusHref?.()||window.FieldLensHost?.focus?.()?.href||null;
function state(){
 const work=details('WORK'),prove=details('PROVE');
 return prove?.open?'PROVE':work?.open?'WORK':'HOLD';
}
function sync(){
 const depth=state();root.dataset.zuiDepth=depth;return depth;
}
function emit(from,to,reason){
 window.dispatchEvent(new CustomEvent('field-zui',{detail:Object.freeze({from,to,focus:focusHref(),reason:reason||'operator',authority:'NONE'})}));
}
function mutate(target){
 const work=details('WORK'),prove=details('PROVE');
 if(!work||!prove)return;
 work.open=target==='WORK';
 prove.open=target==='PROVE';
 sync();
}
function transition(target,reason='operator'){
 const to=String(target||'HOLD').toUpperCase();
 if(!['HOLD','WORK','PROVE'].includes(to))return Promise.resolve(state());
 const from=state();if(from===to)return Promise.resolve(to);
 const change=()=>mutate(to);
 const canAnimate=!reduced()&&typeof document.startViewTransition==='function';
 if(!canAnimate){change();emit(from,to,reason);return Promise.resolve(to)}
 try{
  const vt=document.startViewTransition(change);
  return Promise.resolve(vt.finished).catch(()=>{}).then(()=>{emit(from,to,reason);return to});
 }catch(_){change();emit(from,to,reason);return Promise.resolve(to)}
}
function open(depth,reason='operator'){return transition(depth,reason)}
function close(reason='operator'){return transition('HOLD',reason)}
function toggle(depth,reason='operator'){
 const d=String(depth||'').toUpperCase();return transition(state()===d?'HOLD':d,reason);
}
function installStyle(){
 if(document.getElementById('field-zui-style'))return;
 const s=document.createElement('style');s.id='field-zui-style';s.textContent=`
#aperture{view-transition-name:field-zui-held}
#workDepth{view-transition-name:field-zui-work}
#refineFold{view-transition-name:field-zui-prove}
::view-transition-group(field-zui-held),::view-transition-group(field-zui-work),::view-transition-group(field-zui-prove){animation-duration:210ms;animation-timing-function:cubic-bezier(.2,.75,.25,1)}
::view-transition-old(field-zui-held),::view-transition-new(field-zui-held),::view-transition-old(field-zui-work),::view-transition-new(field-zui-work),::view-transition-old(field-zui-prove),::view-transition-new(field-zui-prove){mix-blend-mode:normal}
html[data-zui-depth="WORK"] #workDepth>summary,html[data-zui-depth="PROVE"] #refineFold>summary{outline:1px solid var(--cool);outline-offset:-1px}
html[data-zui-depth="PROVE"] #refineFold>summary{outline-color:var(--gold)}
@media(prefers-reduced-motion:reduce){::view-transition-group(field-zui-held),::view-transition-group(field-zui-work),::view-transition-group(field-zui-prove){animation-duration:1ms!important}}
 `;document.head.appendChild(s);
}
function bind(){
 const work=details('WORK'),prove=details('PROVE');if(!work||!prove)return;
 installStyle();sync();
 for(const [depth,node] of [['WORK',work],['PROVE',prove]]){
  const peer=depth==='WORK'?prove:work;
  const summary=node.querySelector(':scope > summary');if(!summary)continue;
  summary.addEventListener('click',e=>{e.preventDefault();toggle(depth,'summary')});
  node.addEventListener('toggle',()=>{if(node.open&&peer.open)peer.open=false;sync()});
 }
 document.addEventListener('keydown',e=>{
  if(e.key!=='Escape'||state()==='HOLD')return;
  const t=e.target,tag=t?.tagName?.toLowerCase?.();
  if(t?.isContentEditable||tag==='input'||tag==='textarea'||tag==='select')return;
  e.preventDefault();e.stopImmediatePropagation();close('escape');
 },true);
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',bind,{once:true}):bind();
window.FieldZUI=Object.freeze({state,open,close,toggle,transition});
})();

(()=>{'use strict';
/* AWAKE is a presentation projection over the live FIELD INTERPHASE carrier.
   OMNIBAR is co-mounted as a projection; neither may become a route, store,
   planner, executor or effect authority. */
function load(){
 import('./field-awake-visor.js').catch(error=>{
  document.documentElement.dataset.fieldAwakeVisor='error';
  console.error('FIELD AWAKE visor failed to load',error);
 });
 import('./field-omnibar.js').catch(error=>{
  document.documentElement.dataset.fieldOmnibar='error';
  console.error('FIELD omnibar failed to load',error);
 });
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',load,{once:true}):queueMicrotask(load);
})();

(()=>{'use strict';
/*
FIELD axis scroll ownership guard.
The root centers selected axis tokens with scrollIntoView(). That presentation
scroll must never be reinterpreted as operator navigation by the root's scroll
listener. A real pointer/touch/wheel gesture disarms the guard immediately, so
human scrolling keeps its existing nearest-token behavior.
*/
if(typeof window==='undefined'||location.pathname!=='/'||!window.Element)return;
const proto=Element.prototype,native=proto.scrollIntoView;
if(typeof native!=='function'||proto.__fieldAxisScrollOwnershipGuard)return;
const mutedUntil=new WeakMap(),now=()=>performance?.now?.()??Date.now();
Object.defineProperty(proto,'__fieldAxisScrollOwnershipGuard',{value:true,configurable:false});
proto.scrollIntoView=function(...args){
 const viewport=this.closest?.('.axisViewport');
 if(viewport)mutedUntil.set(viewport,now()+900);
 return native.apply(this,args);
};
const userOwns=e=>{
 const viewport=e.target?.closest?.('.axisViewport');
 if(viewport)mutedUntil.delete(viewport);
};
for(const type of ['pointerdown','touchstart','wheel'])document.addEventListener(type,userOwns,{capture:true,passive:true});
document.addEventListener('scroll',e=>{
 const viewport=e.target;
 if(!viewport?.classList?.contains('axisViewport'))return;
 if(now()<(mutedUntil.get(viewport)||0))e.stopImmediatePropagation();
},{capture:true,passive:true});
})();
