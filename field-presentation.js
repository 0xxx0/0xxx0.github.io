(()=>{'use strict';
/*
FIELD PRESENTATION v0.2 — semantic scale, not CSS zoom.
Adaptive FIT chooses a density from viewport width. An explicit operator choice
locks FIELD / ROUTE / OBJECT until FIT is restored. Route identity, focus,
authority and browser zoom are never mutated by this projection.
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
 try{
  const raw=JSON.parse(localStorage.getItem(KEY)||'null');
  return raw&&indexOfDensity(raw.density)!==null?raw.density:null;
 }catch(_){return null}
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