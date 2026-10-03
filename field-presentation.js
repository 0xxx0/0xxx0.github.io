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
/* AWAKE is a presentation projection over the live FIELD INTERPHASE carrier.
   It must never become a route, store, planner or effect authority. */
function load(){
 import('./field-awake-visor.js').catch(error=>{
  document.documentElement.dataset.fieldAwakeVisor='error';
  console.error('FIELD AWAKE visor failed to load',error);
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
