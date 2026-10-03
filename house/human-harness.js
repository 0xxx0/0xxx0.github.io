(function(root){
'use strict';

const SCHEMA='house-human-harness-state/v0.1';
const PHASES=Object.freeze(['UNBOUND','ORIENTED','EQUIPPED','ENGAGED','ACTED','WITNESSED','RETURNED']);
const GATES=Object.freeze(['NONE','PING','CHOOSE','WORLD_RETURN']);
const EFFECT_AUTHORITIES=Object.freeze(['NONE','HUMAN_PHYSICAL','HOST_NATIVE','HA_HOUSEBUS_PRIVATE']);
const clean=v=>String(v==null?'':v).trim();
const arr=v=>Array.isArray(v)?v:[];
const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
const now=()=>new Date().toISOString();

function phaseFrom(input={}){
  const context=input.context||{},design=input.design||{};
  if(!clean(context.address||design.address))return'UNBOUND';
  const focus=clean(design.focus_step).toLowerCase();
  const map={before:'ORIENTED',intent:'ORIENTED',change:'EQUIPPED',verify:'ENGAGED',after:'ACTED',decision:'WITNESSED',return:'RETURNED'};
  if(design.state==='RETURN_READY')return'RETURNED';
  return map[focus]||'ORIENTED';
}
function activeLayer(phase){return({UNBOUND:'ROOM',ORIENTED:'ROOM',EQUIPPED:'HARNESS',ENGAGED:'OBJECT',ACTED:'OBJECT',WITNESSED:'ROOM',RETURNED:'HOUSE'})[phase]||'ROOM'}
function fallbackGate(input={}){
  const d=input.design||{},focus=clean(d.focus_step).toLowerCase(),missing=new Set(arr(d.missing).map(x=>clean(x).toLowerCase()));
  if(focus==='before'||missing.has('before'))return{class:'WORLD_RETURN',reason:'Fresh current-world observation is required.'};
  if(focus==='intent'||missing.has('intent'))return{class:'CHOOSE',reason:'Preferred outcome belongs to the human.'};
  if(focus==='after'||missing.has('after'))return{class:'WORLD_RETURN',reason:'Fresh after-state must come from the world / human / native host.'};
  if(focus==='decision')return{class:'CHOOSE',reason:'Adoption / revision / reversion / hold is a human decision.'};
  if(focus==='return'||d.state==='RETURN_READY')return{class:'PING',reason:'The receipt is ready; a lightweight carry/park choice may matter.'};
  return{class:'NONE',reason:'Crew may continue non-effectful inspection, research, checks, drafts or proposals.'};
}
function normalizeGate(g){const c=clean(g&&g.class).toUpperCase();return GATES.includes(c)?{class:c,reason:clean(g.reason)}:{class:'NONE',reason:''}}
function makeState(input={}){
  const context=input.context||{},design=input.design||{},crew=input.crew||{},runtime=input.runtime||{},phase=phaseFrom(input),gate=normalizeGate(crew.human_gate||fallbackGate(input));
  const address=clean(context.address||design.address);
  return{
    schema:SCHEMA,generated_at:now(),authority:'NONE / COORDINATION AND PROJECTION ONLY',
    locus:{address,label:clean(context.label||design.address_label||address||'HOUSE locus'),projection:clean(context.projection||design.projection||'PLAN')},
    phase,active_layer:activeLayer(phase),human_gate:gate,effect_authority:'NONE',
    task:{intent:clean(design.intent||crew.intent&&crew.intent.text),constraints:arr(crew.constraints).map(clean).filter(Boolean).slice(0,5),design_state:clean(design.state),design_focus:clean(design.focus_step)},
    harness:{capabilities:arr(input.capabilities).map(clean).filter(Boolean).slice(0,8),target:clean(input.target),verification:clean(input.verification)},
    witness:{runtime_freshness:clean(runtime.freshness||crew.witness&&crew.witness.runtime_freshness||'UNKNOWN'),design_state:clean(design.state||crew.witness&&crew.witness.design_state),refs:arr(input.evidence_refs).map(clean).filter(Boolean).slice(0,8)},
    crew:{frame_schema:clean(crew.schema),next:arr(crew.next).slice(0,3),changed:arr(crew.changed).map(clean).filter(Boolean)},
    return:{route:'/house/',residue:clean(design.residue||crew.open&&crew.open.residue)}
  };
}

const TRANSITIONS={
 BIND:{from:['UNBOUND'],to:'ORIENTED',gate:'NONE'},
 SET_INTENT:{from:['ORIENTED'],to:'ORIENTED',gate:'CHOOSE'},
 EQUIP:{from:['ORIENTED'],to:'EQUIPPED',gate:'NONE'},
 ENGAGE:{from:['EQUIPPED'],to:'ENGAGED',gate:'NONE'},
 ACT:{from:['ENGAGED'],to:'ACTED',gate:'PING_OR_CHOOSE'},
 WITNESS:{from:['ACTED'],to:'WITNESSED',gate:'WORLD_RETURN'},
 RETURN:{from:['WITNESSED'],to:'RETURNED',gate:'CHOOSE_OR_PING'},
 CONTINUE:{from:['RETURNED'],to:'ORIENTED',gate:'NONE'},
 REFRAME:{from:PHASES,to:'ORIENTED',gate:'CONDITIONAL'},
 PARK:{from:PHASES,to:null,gate:'NONE'}
};
function transition(state,event={}){
  const s=clone(state||{}),type=clean(event.type).toUpperCase(),spec=TRANSITIONS[type];
  if(!spec)return{ok:false,error:'UNKNOWN_EVENT',state:s};
  if(!spec.from.includes(s.phase))return{ok:false,error:'ILLEGAL_PHASE',state:s,expected:spec.from};
  if(type==='BIND'&&!clean(event.address||s.locus&&s.locus.address))return{ok:false,error:'ADDRESS_REQUIRED',state:s};
  if(type==='SET_INTENT'&&!clean(event.intent))return{ok:false,error:'INTENT_REQUIRED',state:s};
  if(type==='EQUIP'&&!arr(event.capabilities).length)return{ok:false,error:'CAPABILITY_REQUIRED',state:s};
  if(type==='ENGAGE'&&(!clean(event.target)||!clean(event.verification)))return{ok:false,error:'TARGET_AND_VERIFICATION_REQUIRED',state:s};
  if(type==='ACT'){
    const authority=clean(event.effect_authority).toUpperCase();
    if(!EFFECT_AUTHORITIES.includes(authority)||authority==='NONE')return{ok:false,error:'NATIVE_EFFECT_AUTHORITY_REQUIRED',state:s};
    if(event.human_gate_cleared!==true)return{ok:false,error:'HUMAN_EFFECT_GATE_REQUIRED',state:s};
    s.effect_authority=authority;
  }
  if(type==='WITNESS'&&(!event.fresh||!clean(event.evidence_ref)))return{ok:false,error:'FRESH_WORLD_WITNESS_REQUIRED',state:s};
  if(type==='RETURN'&&!clean(event.decision))return{ok:false,error:'DECISION_REQUIRED',state:s};
  if(type==='REFRAME'&&!event.delta)return{ok:false,error:'FRAME_DELTA_REQUIRED',state:s};
  if(type==='PARK'){s.parked=true;s.park_reason=clean(event.reason);s.generated_at=now();return{ok:true,state:s,event:type,human_gate:'NONE'}}
  s.phase=spec.to;s.active_layer=activeLayer(s.phase);s.generated_at=now();
  if(type==='BIND'&&event.address)s.locus.address=clean(event.address);
  if(type==='SET_INTENT')s.task.intent=clean(event.intent);
  if(type==='EQUIP')s.harness.capabilities=arr(event.capabilities).map(clean).filter(Boolean).slice(0,8);
  if(type==='ENGAGE'){s.harness.target=clean(event.target);s.harness.verification=clean(event.verification)}
  if(type==='WITNESS')s.witness.refs=[clean(event.evidence_ref)];
  if(type==='RETURN'){s.return.decision=clean(event.decision);s.return.residue=clean(event.residue)}
  if(type==='REFRAME'){s.reframe_delta=clone(event.delta);if(event.delta.address)s.locus.address=clean(event.delta.address);if(event.delta.intent)s.task.intent=clean(event.delta.intent)}
  return{ok:true,state:s,event:type,human_gate:spec.gate};
}
function makeCrewHandoffInput(state,crewFrame){
  const s=state||{},c=crewFrame||{};
  return{
    context:{address:s.locus&&s.locus.address,label:s.locus&&s.locus.label,projection:s.locus&&s.locus.projection},
    harness:s,
    crew:c,
    desired_output:'Continue the bounded HOUSE task without requiring full conversation context.',
    allowed_moves:arr(c.next).filter(x=>x&&x.gate==='NONE').map(x=>clean(x.id)).filter(Boolean).slice(0,3),
    evidence_refs:arr(s.witness&&s.witness.refs)
  };
}
const Core={SCHEMA,PHASES,GATES,EFFECT_AUTHORITIES,TRANSITIONS,phaseFrom,activeLayer,fallbackGate,makeState,transition,makeCrewHandoffInput};
root.HouseHumanHarnessCore=Core;
if(typeof module!=='undefined'&&module.exports)module.exports=Core;
if(typeof document==='undefined'||typeof window==='undefined')return;

let context=root.HOUSE_CONTEXT||{},design=root.HOUSE_DESIGN_STATE||{},crew=root.HOUSE_CREW_FRAME||{},runtime=root.HOUSE_RUNTIME_WITNESS||{},state=null;
function publish(reason){state=makeState({context,design,crew,runtime});root.HOUSE_HUMAN_HARNESS_STATE=clone(state);window.dispatchEvent(new CustomEvent('house:harness-state',{detail:Object.assign({reason:clean(reason||'UPDATE')},clone(state))}));return state}
function snapshot(){return clone(state||publish('SNAPSHOT'))}
function transitionRuntime(event){const out=transition(snapshot(),event);if(out.ok){state=out.state;root.HOUSE_HUMAN_HARNESS_STATE=clone(state);window.dispatchEvent(new CustomEvent('house:harness-transition',{detail:{event:clean(event&&event.type).toUpperCase(),state:clone(state)}}));window.dispatchEvent(new CustomEvent('house:harness-state',{detail:Object.assign({reason:'TRANSITION'},clone(state))}))}return clone(out)}
function makeCrewHandoff(){return makeCrewHandoffInput(snapshot(),crew)}
root.HouseHumanHarness=Object.freeze({snapshot,transition:transitionRuntime,makeCrewHandoff,publish});
window.addEventListener('house:selection',e=>{context=Object.assign({},context,e.detail||{});publish('SELECTION')});
window.addEventListener('house:design-state',e=>{design=Object.assign({},design,e.detail||{});publish('DESIGN')});
window.addEventListener('house:crew-frame',e=>{crew=Object.assign({},crew,e.detail||{});publish('CREW')});
window.addEventListener('house:runtime-witness',e=>{runtime=Object.assign({},runtime,e.detail||{});publish('RUNTIME')});
publish('BOOT');
})(typeof globalThis!=='undefined'?globalThis:this);
