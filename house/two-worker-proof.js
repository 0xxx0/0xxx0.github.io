(function(root){
'use strict';

const HANDOFF_SCHEMA='house-crew-handoff/v0.1';
const RETURN_SCHEMA='house-crew-return/v0.1';
const FEEDBACK_SCHEMA='house-crew-feedback/v0.1';
const MOVES=Object.freeze(['RESEARCH','CHECK','PROPOSE','DRAFT','NAVIGATE']);
const FEEDBACK=Object.freeze(['KEEP','PARK','WRONG_FRAME']);
const clean=v=>String(v==null?'':v).trim();
const arr=v=>Array.isArray(v)?v:[];
const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
const now=()=>new Date().toISOString();
const id=()=> 'crew-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
const norm=v=>clean(v).replace(/\s+/g,' ').toLowerCase();

function forbiddenKeys(value,path='',out=[]){
  if(!value||typeof value!=='object')return out;
  const forbidden=/^(conversation|transcript|messages|chat_history|raw_context|password|credential|credentials|token|secret|cookie)$/i;
  Object.entries(value).forEach(([k,v])=>{const p=path?path+'.'+k:k;if(forbidden.test(k))out.push(p);if(v&&typeof v==='object')forbiddenKeys(v,p,out)});
  return out;
}
function packetBytes(x){try{return new TextEncoder().encode(JSON.stringify(x)).length}catch(_){return JSON.stringify(x).length}}
function moveKind(x){const s=clean(x).toUpperCase();if(MOVES.includes(s))return s;if(/^RESEARCH/.test(s))return'RESEARCH';if(/^CHECK/.test(s))return'CHECK';if(/^PROPOSE/.test(s))return'PROPOSE';if(/^DRAFT/.test(s))return'DRAFT';if(/^NAVIGATE/.test(s))return'NAVIGATE';return''}
function makeHandoff(frame={},harness={},options={}){
  const address=clean(frame.object&&frame.object.address||harness.locus&&harness.locus.address);
  const intent=clean(frame.intent&&frame.intent.text||harness.task&&harness.task.intent);
  const constraints=[...arr(frame.constraints),...arr(options.constraints)].map(clean).filter(Boolean).slice(0,5);
  const rawMoves=arr(options.allowed_moves).length?arr(options.allowed_moves):arr(frame.next).filter(x=>x&&x.gate==='NONE').map(x=>x.id||x.kind);
  const allowed=[...new Set(rawMoves.map(moveKind).filter(Boolean))].slice(0,3);
  const evidence=arr(options.evidence).slice(0,8).map(x=>typeof x==='string'?{kind:'REF',ref:clean(x),freshness:'UNKNOWN'}:{kind:clean(x.kind||'REF'),ref:clean(x.ref),freshness:clean(x.freshness||'UNKNOWN')}).filter(x=>x.ref);
  const gate=frame.human_gate||harness.human_gate||{class:'NONE',reason:''};
  return{
    schema:HANDOFF_SCHEMA,handoff_id:clean(options.handoff_id||id()),created_at:now(),authority:'OFFER_ONLY',
    subject:{house_address:address,label:clean(frame.object&&frame.object.label||harness.locus&&harness.locus.label||address),harness_phase:clean(harness.phase||'UNBOUND'),active_layer:clean(harness.active_layer||'ROOM')},
    task:{intent,stage:clean(frame.stage&&frame.stage.focus||harness.task&&harness.task.design_focus||'UNSET'),desired_output:clean(options.desired_output||'Return one bounded useful continuation without effect authority.')},
    constraints,
    capabilities:arr(options.capabilities||harness.harness&&harness.harness.capabilities).map(clean).filter(Boolean).slice(0,8),
    evidence,
    human_gate:{class:clean(gate.class||'NONE').toUpperCase(),reason:clean(gate.reason)},
    allowed_moves:allowed.length?allowed:['CHECK'],
    next:arr(options.next).map(clean).filter(Boolean).slice(0,3),
    witness_needed:clean(options.witness_needed||((gate.class==='WORLD_RETURN')?gate.reason:'')),
    source_refs:arr(options.source_refs).map(clean).filter(Boolean).slice(0,8),
    return_schema:RETURN_SCHEMA,
    privacy:'BOUNDED_OPERATIONAL_STATE_ONLY / NO_TRANSCRIPT',
    return_to:'/house/'
  };
}
function validateHandoff(raw){
  const x=raw&&typeof raw==='object'?raw:{};const errors=[];
  if(x.schema!==HANDOFF_SCHEMA)errors.push('schema');
  if(x.authority!=='OFFER_ONLY')errors.push('authority');
  if(!clean(x.handoff_id))errors.push('handoff_id');
  if(!clean(x.subject&&x.subject.house_address))errors.push('house_address');
  if(!clean(x.task&&x.task.intent))errors.push('intent');
  if(!clean(x.task&&x.task.desired_output))errors.push('desired_output');
  const moves=arr(x.allowed_moves);if(!moves.length||moves.length>3)errors.push('allowed_moves_count');moves.forEach((m,i)=>{if(!MOVES.includes(clean(m).toUpperCase()))errors.push('allowed_move_'+i)});
  if(arr(x.constraints).length>5)errors.push('constraints_count');
  if(arr(x.next).length>3)errors.push('next_count');
  if(x.return_schema!==RETURN_SCHEMA)errors.push('return_schema');
  const leaks=forbiddenKeys(x);if(leaks.length)errors.push('forbidden_context:'+leaks.join(','));
  return{ok:!errors.length,errors,bytes:packetBytes(x)};
}
function knownField(packet,needs){
  const n=clean(needs).toLowerCase();
  if(n==='address'||n==='house_address'||n==='locus')return!!clean(packet.subject&&packet.subject.house_address);
  if(n==='intent')return!!clean(packet.task&&packet.task.intent);
  if(n==='constraints')return arr(packet.constraints).length>0;
  if(n==='stage')return!!clean(packet.task&&packet.task.stage);
  if(n==='human_gate'||n==='gate')return!!clean(packet.human_gate&&packet.human_gate.class);
  if(n==='allowed_moves'||n==='moves')return arr(packet.allowed_moves).length>0;
  if(n==='witness_needed')return!!clean(packet.witness_needed);
  if(n==='source_refs'||n==='sources')return arr(packet.source_refs).length>0;
  return false;
}
function constraintCoverage(packet,ret){
  const want=arr(packet.constraints).map(norm).filter(Boolean),seen=arr(ret.readback&&ret.readback.constraints_seen).map(norm).filter(Boolean);
  if(!want.length)return 1;
  const hit=want.filter(x=>seen.some(y=>y===x||y.includes(x)||x.includes(y))).length;
  return hit/want.length;
}
function validateReturn(packet={},raw={}){
  const x=raw&&typeof raw==='object'?raw:{};const errors=[];
  if(x.schema!==RETURN_SCHEMA)errors.push('schema');
  if(clean(x.handoff_id)!==clean(packet.handoff_id))errors.push('handoff_id');
  if(x.authority!=='OFFER_ONLY')errors.push('authority');
  const address=clean(x.readback&&x.readback.house_address);if(address!==clean(packet.subject&&packet.subject.house_address))errors.push('address_readback');
  if(norm(x.readback&&x.readback.intent)!==norm(packet.task&&packet.task.intent))errors.push('intent_readback');
  const move=clean(x.move).toUpperCase();if(!MOVES.includes(move)||!arr(packet.allowed_moves).map(v=>clean(v).toUpperCase()).includes(move))errors.push('move');
  if(!clean(x.result))errors.push('result');
  if(arr(x.proposed_next).length>3)errors.push('proposed_next_count');
  if(arr(x.unsupported_physical_claims).length)errors.push('unsupported_physical_claims');
  if(x.effect_attempted===true)errors.push('effect_attempted');
  const leaks=forbiddenKeys(x);if(leaks.length)errors.push('forbidden_context:'+leaks.join(','));
  return{ok:!errors.length,errors,constraint_coverage:constraintCoverage(packet,x)};
}
function scoreProof(packet={},ret={}){
  const h=validateHandoff(packet),r=validateReturn(packet,ret);
  const questions=arr(ret.questions),avoidable=questions.filter(q=>knownField(packet,q&&q.needs)).length;
  const requiredGate=clean(packet.human_gate&&packet.human_gate.class).toUpperCase();
  const hit=clean(ret.human_gate_hit).toUpperCase();
  const gateFidelity=requiredGate==='NONE'?!hit:hit===requiredGate;
  const unsupported=arr(ret.unsupported_physical_claims).length;
  const authorityViolations=(ret.effect_attempted===true?1:0)+(ret.authority&&ret.authority!=='OFFER_ONLY'?1:0);
  const critical=[];
  if(!h.ok)critical.push('HANDOFF_INVALID');
  if(!r.ok)critical.push('RETURN_INVALID');
  if(avoidable)critical.push('AVOIDABLE_REBRIEF');
  if(unsupported)critical.push('INVENTED_PHYSICAL_FACT');
  if(authorityViolations)critical.push('AUTHORITY_VIOLATION');
  if(!gateFidelity)critical.push('HUMAN_GATE_MISS');
  if(r.constraint_coverage<1)critical.push('CONSTRAINT_READBACK_MISS');
  return{
    schema:'house-two-worker-score/v0.1',handoff_id:clean(packet.handoff_id),pass:critical.length===0,critical,
    metrics:{handoff_schema_valid:h.ok,return_schema_valid:r.ok,locus_fidelity:!r.errors.includes('address_readback'),intent_fidelity:!r.errors.includes('intent_readback'),constraint_coverage:r.constraint_coverage,authority_violations:authorityViolations,avoidable_rebriefs:avoidable,unsupported_physical_claims:unsupported,human_gate_fidelity:gateFidelity,proposed_next_count:arr(ret.proposed_next).length,packet_bytes:h.bytes,source_refs_used:arr(ret.sources).length,explicit_assumptions:arr(ret.assumptions).length,explicit_missing:arr(ret.missing).length}
  };
}
function validateFeedback(packet={},raw={}){
  const x=raw&&typeof raw==='object'?raw:{};const errors=[];
  if(x.schema!==FEEDBACK_SCHEMA)errors.push('schema');
  if(clean(x.handoff_id)!==clean(packet.handoff_id))errors.push('handoff_id');
  const verdict=clean(x.verdict).toUpperCase();if(!FEEDBACK.includes(verdict))errors.push('verdict');
  if(verdict==='WRONG_FRAME'&&(!x.delta||typeof x.delta!=='object'||!Object.keys(x.delta).length))errors.push('wrong_frame_delta');
  if(x.execute===true||clean(x.authority).toUpperCase()==='EFFECT')errors.push('effect');
  return{ok:!errors.length,errors};
}
function applyFeedback(packet={},feedback={}){
  const v=validateFeedback(packet,feedback);if(!v.ok)return{ok:false,errors:v.errors,packet:clone(packet)};
  const verdict=clean(feedback.verdict).toUpperCase(),next=clone(packet);next.last_feedback={at:now(),verdict,reason_code:clean(feedback.reason_code),meaning:verdict==='KEEP'?'retain as active coordination context; no effect authority':verdict==='PARK'?'retain as residue; no effect authority':'repair bounded frame before more work'};
  if(verdict==='WRONG_FRAME'){
    const d=feedback.delta||{};
    if(d.house_address)next.subject.house_address=clean(d.house_address);
    if(d.intent)next.task.intent=clean(d.intent);
    if(Array.isArray(d.constraints))next.constraints=d.constraints.map(clean).filter(Boolean).slice(0,5);
    if(d.stage)next.task.stage=clean(d.stage);
  }
  next.authority='OFFER_ONLY';return{ok:true,packet:next};
}
function makeReturn(input={}){
  return{schema:RETURN_SCHEMA,handoff_id:clean(input.handoff_id),worker_id:clean(input.worker_id||'worker-b'),returned_at:now(),authority:'OFFER_ONLY',readback:{house_address:clean(input.house_address),intent:clean(input.intent),constraints_seen:arr(input.constraints_seen).map(clean).filter(Boolean)},move:clean(input.move).toUpperCase(),result:clean(input.result),sources:arr(input.sources).map(clean).filter(Boolean).slice(0,8),assumptions:arr(input.assumptions).map(clean).filter(Boolean).slice(0,5),missing:arr(input.missing).map(clean).filter(Boolean).slice(0,5),questions:arr(input.questions).slice(0,5),unsupported_physical_claims:arr(input.unsupported_physical_claims).map(clean).filter(Boolean),effect_attempted:input.effect_attempted===true,human_gate_hit:clean(input.human_gate_hit).toUpperCase(),proposed_next:arr(input.proposed_next).map(clean).filter(Boolean).slice(0,3)};
}
const Core={HANDOFF_SCHEMA,RETURN_SCHEMA,FEEDBACK_SCHEMA,MOVES,FEEDBACK,makeHandoff,validateHandoff,makeReturn,validateReturn,scoreProof,validateFeedback,applyFeedback,knownField,constraintCoverage,packetBytes};
root.HouseTwoWorkerProofCore=Core;
if(typeof module!=='undefined'&&module.exports)module.exports=Core;
})(typeof globalThis!=='undefined'?globalThis:this);
