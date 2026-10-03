(function(root){
'use strict';

const FRAME_SCHEMA='house-crew-frame/v0.1';
const OFFER_SCHEMA='house-crew-offer/v0.1';
const RESPONSE_SCHEMA='house-crew-response/v0.1';
const OFFER_KEY='house.crew.offer.v01';
const RESPONSE_KEY='house.crew.response.v01';
const GATES=Object.freeze(['NONE','PING','CHOOSE','WORLD_RETURN']);
const RESPONSES=Object.freeze(['KEEP','PARK','WRONG_FRAME']);
const clean=v=>String(v==null?'':v).trim();
const arr=v=>Array.isArray(v)?v:[];
const now=()=>new Date().toISOString();
const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));

function gateFor(design={}){
  const step=clean(design.focus_step).toLowerCase();
  const missing=new Set(arr(design.missing).map(x=>clean(x).toLowerCase()));
  if(step==='before'||missing.has('before'))return{class:'WORLD_RETURN',reason:'Current physical condition must be observed; agents cannot manufacture this evidence.'};
  if(step==='intent'||missing.has('intent'))return{class:'CHOOSE',reason:'Preferred outcome is a human choice.'};
  if(step==='change'||missing.has('change'))return{class:'NONE',reason:'Crew may propose bounded reversible interventions; no physical effect is authorized.'};
  if(step==='verify'||missing.has('verify'))return{class:'NONE',reason:'Crew may propose a discriminating verification test.'};
  if(step==='after'||missing.has('after'))return{class:'WORLD_RETURN',reason:'After-state must come from the world / human observation.'};
  if(step==='decision')return{class:'CHOOSE',reason:'ADOPT / REVISE / REVERT / HOLD remains a human decision.'};
  if(step==='return'||design.state==='RETURN_READY')return{class:'PING',reason:'Receipt is ready; human may choose whether it is worth exporting / carrying onward.'};
  return{class:'NONE',reason:'No irreducible human gate is currently identified.'};
}

function nextFor(design={}){
  const step=clean(design.focus_step).toLowerCase();
  const table={
    before:[{id:'OBSERVE_BEFORE',label:'Observe current locus',owner:'HUMAN / WORLD',gate:'WORLD_RETURN',authority:'OFFER'}],
    intent:[{id:'SET_INTENT',label:'Choose preferred outcome',owner:'HUMAN',gate:'CHOOSE',authority:'OFFER'}],
    change:[
      {id:'PROPOSE_CHANGE',label:'Propose ≤3 reversible changes',owner:'CREW',gate:'NONE',authority:'OFFER'},
      {id:'CHECK_CONSTRAINTS',label:'Check known constraints / residues',owner:'CREW',gate:'NONE',authority:'VIEW'}
    ],
    verify:[{id:'PROPOSE_VERIFY',label:'Propose discriminating verification',owner:'CREW',gate:'NONE',authority:'OFFER'}],
    after:[{id:'OBSERVE_AFTER',label:'Observe consequence in the world',owner:'HUMAN / WORLD',gate:'WORLD_RETURN',authority:'OFFER'}],
    decision:[{id:'DECIDE',label:'ADOPT / REVISE / REVERT / HOLD',owner:'HUMAN',gate:'CHOOSE',authority:'OFFER'}],
    return:[
      {id:'RETURN',label:'Carry receipt / consequence onward',owner:'HUMAN / HOST',gate:'PING',authority:'NAVIGATION'},
      {id:'REPLAN',label:'Replan from residue',owner:'CREW',gate:'NONE',authority:'OFFER'}
    ]
  };
  return clone(table[step]||[{id:'INSPECT',label:'Inspect held locus',owner:'CREW',gate:'NONE',authority:'VIEW'}]).slice(0,3);
}

function makeFrame(input={}){
  const context=input.context||{};
  const design=input.design||{};
  const runtime=input.runtime||{};
  const reality=input.reality||{};
  const address=clean(context.address||design.address);
  const gate=gateFor(design);
  const frame={
    schema:FRAME_SCHEMA,
    generated_at:now(),
    authority:'NONE / COORDINATION ONLY',
    object:{
      id:address?'house:'+address:'house:unselected',
      owner:'HOUSE',
      address,
      label:clean(context.label||address||'HOUSE locus'),
      projection:clean(context.projection||'PLAN')
    },
    intent:{
      text:clean(design.intent),
      source:design.trial_id?'house-design-trial/v0.1':'UNSET'
    },
    constraints:clean(design.constraints)?[clean(design.constraints)]:[],
    stage:{
      state:clean(design.state||'UNSET'),
      focus:clean(design.focus_step||'UNSET'),
      missing:arr(design.missing).map(clean).filter(Boolean),
      decision:clean(design.decision||'HOLD')
    },
    human_gate:gate,
    next:nextFor(design),
    witness:{
      design_state:clean(design.state||'UNSET'),
      runtime_freshness:clean(runtime.freshness||'UNKNOWN'),
      runtime_age:clean(runtime.age_label),
      reality_layer:clean(reality.layer||'ROOM')
    },
    open:{
      assumptions:arr(input.assumptions).map(clean).filter(Boolean).slice(0,3),
      residue:clean(design.residue)
    },
    return:{route:'/house/',address},
    protocol_hints:{
      interphase:'interphase-carrier/v0.1',
      external_agents:'compile/bridge at boundary; do not widen HOUSE authority',
      ui:'host-native rendering; remote offers are data, never executable UI/code'
    }
  };
  return frame;
}

function changed(prev,next){
  if(!prev)return['INITIAL'];
  const keys=['object','intent','constraints','stage','human_gate','next','witness','open','return'];
  return keys.filter(k=>JSON.stringify(prev[k])!==JSON.stringify(next[k]));
}

function validateOffer(raw,frame){
  const x=raw&&typeof raw==='object'?raw:{};
  const errors=[];
  if(x.schema!==OFFER_SCHEMA)errors.push('schema');
  if(x.authority!=='OFFER_ONLY')errors.push('authority');
  const address=clean(x.object&&x.object.address);
  if(!address||address!==clean(frame&&frame.object&&frame.object.address))errors.push('address');
  const proposals=arr(x.proposals);
  if(!proposals.length||proposals.length>3)errors.push('proposals');
  const allowed=new Set(['RESEARCH','PROPOSE','CHECK','DRAFT','NAVIGATE']);
  proposals.forEach((p,i)=>{
    if(!p||!clean(p.id)||!clean(p.label))errors.push('proposal '+i+' id/label');
    if(!allowed.has(clean(p.kind).toUpperCase()))errors.push('proposal '+i+' kind');
    if(p.effect===true||clean(p.authority).toUpperCase()==='EFFECT')errors.push('proposal '+i+' effect');
  });
  return{ok:!errors.length,errors,offer:{
    schema:OFFER_SCHEMA,
    offered_at:clean(x.offered_at||now()),
    authority:'OFFER_ONLY',
    from:{id:clean(x.from&&x.from.id||'external-worker'),label:clean(x.from&&x.from.label||'CREW')},
    object:{address},
    summary:clean(x.summary),
    proposals:proposals.slice(0,3).map(p=>({id:clean(p.id),label:clean(p.label),kind:clean(p.kind).toUpperCase(),note:clean(p.note),target:clean(p.target)})),
    return_to:clean(x.return_to||'/house/')
  }};
}

function makeResponse(action,offer,frame){
  const a=clean(action).toUpperCase();
  if(!RESPONSES.includes(a))throw new Error('HOUSE_CREW_RESPONSE_INVALID');
  return{
    schema:RESPONSE_SCHEMA,
    at:now(),
    action:a,
    authority:'COORDINATION_ONLY',
    object:{address:clean(frame&&frame.object&&frame.object.address)},
    offer_from:clean(offer&&offer.from&&offer.from.id),
    proposal_ids:arr(offer&&offer.proposals).map(p=>clean(p.id)).filter(Boolean),
    meaning:a==='KEEP'?'keep this offer in the active coordination frame; no native effect':a==='PARK'?'retain as residue / later possibility; no native effect':'current framing is wrong; reframe before proposing further work',
    return_to:'/house/'
  };
}

function compileCarrier(frame,Carrier){
  if(!Carrier||typeof Carrier.make!=='function')return null;
  return Carrier.make({
    object:{id:frame.object.id,kind:'house-locus',label:frame.object.label,owner:'HOUSE',address:frame.object.address,contract:'/house/contract.json'},
    focus:{id:frame.object.id,label:frame.object.label,address:frame.object.address,aperture:'CREW'},
    next:frame.next.map(x=>({id:x.id,label:x.label,authority:x.authority||'OFFER',target:frame.object.address,requires:x.gate&&x.gate!=='NONE'?[x.gate]:[]})),
    witness:{class:frame.stage.state==='RETURN_READY'?'RETURN':'OBSERVED',summary:'crew seam · '+frame.stage.focus+' · human gate '+frame.human_gate.class,evidenceRefs:[]},
    return:{address:'/house/',owner:'HOUSE',label:'RETURN HOUSE'},
    projection:{host:'HOUSE',name:'CREW',channels:['intent','gate','next','witness'],residue:frame.open.residue?[frame.open.residue]:[]},
    meta:{crew:{schema:FRAME_SCHEMA,human_gate:frame.human_gate.class,changed:frame.changed||[]}}
  });
}

const Core={FRAME_SCHEMA,OFFER_SCHEMA,RESPONSE_SCHEMA,OFFER_KEY,RESPONSE_KEY,GATES,RESPONSES,gateFor,nextFor,makeFrame,changed,validateOffer,makeResponse,compileCarrier};
root.HouseCrewSeamCore=Core;
if(typeof module!=='undefined'&&module.exports)module.exports=Core;
if(typeof document==='undefined'||typeof window==='undefined')return;

let context=root.HOUSE_CONTEXT||{},design=root.HOUSE_DESIGN_STATE||{},runtime=root.HOUSE_RUNTIME_WITNESS||{},reality={layer:'ROOM'};
let frame=null,offer=null,response=null;
function sessionGet(key){try{return JSON.parse(sessionStorage.getItem(key)||'null')}catch(_){return null}}
function sessionSet(key,value){try{sessionStorage.setItem(key,JSON.stringify(value))}catch(_){}}
function publish(){
  const next=makeFrame({context,design,runtime,reality});
  next.changed=changed(frame,next);
  frame=next;
  root.HOUSE_CREW_FRAME=clone(frame);
  root.HOUSE_CREW_CARRIER=compileCarrier(frame,root.InterphaseCarrier);
  window.dispatchEvent(new CustomEvent('house:crew-frame',{detail:clone(frame)}));
}
function receive(raw){
  const v=validateOffer(raw,frame||makeFrame({context,design,runtime,reality}));
  if(!v.ok){window.dispatchEvent(new CustomEvent('house:crew-offer-rejected',{detail:{errors:v.errors}}));return false}
  offer=v.offer;sessionSet(OFFER_KEY,offer);root.HOUSE_CREW_OFFER=clone(offer);
  window.dispatchEvent(new CustomEvent('house:crew-offer-accepted',{detail:clone(offer)}));
  publish();return true;
}
function respond(action){
  if(!offer)return null;
  response=makeResponse(action,offer,frame);
  sessionSet(RESPONSE_KEY,response);root.HOUSE_CREW_RESPONSE=clone(response);
  window.dispatchEvent(new CustomEvent('house:crew-response',{detail:clone(response)}));
  if(action==='WRONG_FRAME'){offer=null;try{sessionStorage.removeItem(OFFER_KEY)}catch(_){}}
  publish();return clone(response);
}
function clearOffer(){offer=null;response=null;try{sessionStorage.removeItem(OFFER_KEY);sessionStorage.removeItem(RESPONSE_KEY)}catch(_){};publish()}
function snapshot(){return{frame:clone(frame),offer:clone(offer),response:clone(response),carrier:clone(root.HOUSE_CREW_CARRIER)}}
root.HouseCrewSeam=Object.freeze({snapshot,receive,respond,clearOffer,publish});

window.addEventListener('house:selection',e=>{context=Object.assign({},context,e.detail||{});publish()});
window.addEventListener('house:design-state',e=>{design=Object.assign({},design,e.detail||{});publish()});
window.addEventListener('house:runtime-witness',e=>{runtime=Object.assign({},runtime,e.detail||{});publish()});
window.addEventListener('house:reality-layer',e=>{reality={layer:clean(e.detail&&e.detail.layer||'ROOM')};publish()});
window.addEventListener('house:crew-offer',e=>receive(e.detail));

const stored=sessionGet(OFFER_KEY);publish();if(stored)receive(stored);
})(typeof globalThis!=='undefined'?globalThis:this);
