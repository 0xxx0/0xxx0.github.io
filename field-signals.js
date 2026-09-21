(()=>{'use strict';
const KEY='field.signals.v01', MAX=512;
const now=()=>new Date().toISOString();
const route=()=>location.pathname||'/';
function load(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(_){return[]}}
function save(xs){try{localStorage.setItem(KEY,JSON.stringify(xs.slice(-MAX)))}catch(_){}}
function emit(kind,detail={}){
  const x={at:now(),route:route(),kind,detail};
  const xs=load(); xs.push(x); save(xs);
  try{window.dispatchEvent(new CustomEvent('field:signal',{detail:x}))}catch(_){}
  return x;
}
function choices(group){
  const counts={}; let n=0;
  for(const x of load()){
    if(x.kind!=='choice'||x.detail?.group!==group)continue;
    const v=x.detail?.value;if(!v)continue;
    counts[v]=(counts[v]||0)+1;n++;
  }
  return {n,counts};
}
function preference(group,allowed){
  const {n,counts}=choices(group);
  const ranked=Object.entries(counts)
    .filter(([v])=>!allowed||allowed.includes(v))
    .sort((a,b)=>b[1]-a[1]);
  if(!ranked.length||n<3)return null;
  const [value,count]=ranked[0],share=count/n;
  if(count<2||share<.6)return null;
  return {value,count,n,share};
}
function choice(group,value,meta={}){
  return emit('choice',{group,value,...meta});
}
function exportSignals(){return {schema:'field/signals/v0.1',exported_at:now(),signals:load()}}
function clear(){try{localStorage.removeItem(KEY)}catch(_){}}
let entered=Date.now(),active=true;
emit('enter',{referrer_same_origin:document.referrer.startsWith(location.origin)});
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='hidden'&&active){emit('dwell',{ms:Date.now()-entered});active=false}
  else if(document.visibilityState==='visible'&&!active){entered=Date.now();active=true}
},{passive:true});
window.addEventListener('pagehide',()=>{if(active)emit('dwell',{ms:Date.now()-entered})},{passive:true});
document.addEventListener('click',e=>{
  const el=e.target.closest?.('[data-mode],[data-filter],[data-route],a[href],button[id]');
  if(!el)return;
  if(el.dataset?.mode) return choice('field-map-mode',el.dataset.mode,{source:'direct'});
  if(el.dataset?.filter) return choice('field-map-filter',el.dataset.filter,{source:'direct'});
  if(el.dataset?.route) return choice('human-port-route',el.dataset.route,{source:'direct'});
  if(el.tagName==='A'){
    let href='';try{href=new URL(el.href,location.href).pathname}catch(_){}
    if(href)emit('navigate',{href});
    return;
  }
  if(el.id)emit('control',{id:el.id});
},true);
window.FieldSignals={emit,choice,choices,preference,export:exportSignals,clear,key:KEY};
})();