(function(root){
'use strict';

function classifyAge(generatedAt, nowMs){
  const t=Date.parse(generatedAt||'');
  const n=Number.isFinite(nowMs)?nowMs:Date.now();
  if(!Number.isFinite(t))return{freshness:'UNKNOWN',age_seconds:null,age_label:'unknown'};
  const delta=Math.floor((n-t)/1000);
  if(delta < -300)return{freshness:'CLOCK_SKEW',age_seconds:delta,age_label:'future timestamp'};
  const age=Math.max(0,delta);
  let freshness='STALE';
  if(age<=900)freshness='CURRENT';
  else if(age<=7200)freshness='RECENT';
  else if(age<=86400)freshness='AGED';
  const d=Math.floor(age/86400),h=Math.floor((age%86400)/3600),m=Math.floor((age%3600)/60);
  const age_label=d?d+'d '+h+'h':h?h+'h '+m+'m':m+'m';
  return{freshness,age_seconds:age,age_label};
}
function describe(data,nowMs){
  data=data||{};
  const age=classifyAge(data.generated_at,nowMs);
  return Object.assign(age,{
    generated_at:data.generated_at||null,
    runtime_health_at_generation:data.runtime_health_class||'UNKNOWN',
    source_age_at_generation:data.source_age_class||'UNKNOWN',
    objects:data.counts&&Number.isFinite(data.counts.objects)?data.counts.objects:null,
    schema:data.schema||null,
    classification:data.classification||null
  });
}

const Core={classifyAge,describe};
root.HouseRuntimeWitness=Core;
if(typeof module!=='undefined'&&module.exports)module.exports=Core;
if(typeof document==='undefined'||typeof window==='undefined')return;

const esc=s=>String(s??'');
function render(d){
  const main=document.getElementById('houseRuntime');
  const meta=document.getElementById('houseRuntimeMeta');
  if(!main||!meta)return;
  const x=describe(d);
  root.HOUSE_RUNTIME_WITNESS=x;
  main.textContent='SNAPSHOT · '+x.freshness;
  meta.textContent='generated '+(x.generated_at||'—')+' · '+x.age_label+' old · runtime-at-generation '+x.runtime_health_at_generation+' · source-at-generation '+x.source_age_at_generation+' · '+(x.objects??'—')+' represented objects · not live';
  const sec=main.closest('section');if(sec)sec.dataset.witnessFreshness=x.freshness;
  window.dispatchEvent(new CustomEvent('house:runtime-witness',{detail:x}));
}
function unavailable(){
  const main=document.getElementById('houseRuntime');
  const meta=document.getElementById('houseRuntimeMeta');
  if(main)main.textContent='SNAPSHOT UNAVAILABLE';
  if(meta)meta.textContent='Spatial workbench remains usable; private HA / HOUSEBUS authority is unaffected.';
  const x={freshness:'UNAVAILABLE',age_label:'—'};
  root.HOUSE_RUNTIME_WITNESS=x;
  window.dispatchEvent(new CustomEvent('house:runtime-witness',{detail:x}));
}
function boot(){
  fetch('./state.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error(r.status);return r.json()}).then(render).catch(unavailable);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(typeof globalThis!=='undefined'?globalThis:this);
