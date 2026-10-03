const CONTRIBUTION_CLASSES=new Set(['DELTA','EVIDENCE','DONOR','RETURN','UNRESOLVED']);
const EVIDENCE_CLASSES=new Set(['BYTES','SPEC','IMAGE','RECEIPT']);
const MOVE_AUTHORITIES=new Set(['VIEW','NAVIGATION','EDIT','EFFECT','OFFER','HANDOFF','NONE']);
const STATE_ENUM=new Set(['SOURCE_REQUIRED','HOLD_REQUIRED','HOLD_READY','TURN_READY']);
const HUMAN_GATE_ENUM=new Set(['NONE','PING','CHOOSE','WORLD_RETURN','UNSPECIFIED']);

const text=v=>String(v??'').replace(/\s+/g,' ').trim();
const stable=v=>Array.isArray(v)?v.map(stable):(v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v);
const fnv64=s=>{let h=0xcbf29ce484222325n;for(let i=0;i<s.length;i++){h^=BigInt(s.charCodeAt(i));h=BigInt.asUintN(64,h*0x100000001b3n)}return h.toString(16).padStart(16,'0')};
const handle=v=>'crew:'+fnv64(JSON.stringify(stable(v)));
const arr=v=>Array.isArray(v)?v:[];
const required=(o,k)=>{const v=o?.[k];if(v==null||text(v)==='')throw new Error('FIELD_HANDOFF_MISSING_'+k.toUpperCase());return v};

function normalizeMove(move,index){
  if(!move||typeof move!=='object'||Array.isArray(move))throw new Error('FIELD_HANDOFF_MOVE_OBJECT_REQUIRED_'+(index+1));
  const id=text(move.id||('move-'+(index+1)));
  const label=text(required(move,'label'));
  const authority=text(required(move,'authority')).toUpperCase();
  if(!MOVE_AUTHORITIES.has(authority))throw new Error('FIELD_HANDOFF_MOVE_AUTHORITY_'+authority);
  const target=text(required(move,'target'));
  const reversibility=text(required(move,'reversibility'));
  const commit_boundary=text(required(move,'commit_boundary'));
  return {id,label,authority,target,reversibility,commit_boundary};
}

function normalizeHumanGate(raw){
  if(raw==null||raw==='')return{
    class:'UNSPECIFIED',
    reason:'No explicit human gate travelled with this handoff. Continue only lawful non-effect inspect/research/check/draft work; resolve the gate before any human/world claim or effect boundary.',
    source_ref:null,
    law:'Human gate describes interruption need, not effect authority.'
  };
  const obj=typeof raw==='string'?{class:raw}:raw;
  if(!obj||typeof obj!=='object'||Array.isArray(obj))throw new Error('FIELD_HANDOFF_HUMAN_GATE_OBJECT_REQUIRED');
  const gate=text(obj.class||obj.kind||obj.status).toUpperCase();
  if(!HUMAN_GATE_ENUM.has(gate))throw new Error('FIELD_HANDOFF_HUMAN_GATE_'+gate);
  return{
    class:gate,
    reason:text(obj.reason)||(
      gate==='NONE'?'No irreducible human interruption is required for lawful non-effect continuation.':
      gate==='PING'?'One lightweight acknowledgement may materially choose continuation.':
      gate==='CHOOSE'?'Preference, framing, adoption or decision belongs to the human.':
      gate==='WORLD_RETURN'?'Fresh physical, subjective or external-world evidence must come from the human/world.':
      'No explicit human gate was supplied.'
    ),
    source_ref:text(obj.source_ref)||null,
    law:'NONE permits only otherwise-lawful continuation; PING requests one acknowledgement; CHOOSE reserves preference/framing/adoption; WORLD_RETURN reserves irreducible world evidence; no gate grants EFFECT/merge/NOW authority.'
  };
}

export function compileCrewHandoff(submission){
  if(!submission||typeof submission!=='object'||Array.isArray(submission))throw new Error('FIELD_HANDOFF_SUBMISSION_OBJECT_REQUIRED');
  for(const k of ['source_ref','intent','object_ref','contribution_class','evidence_class','delta_or_question','proof_available'])required(submission,k);

  const contributionClass=text(submission.contribution_class).toUpperCase();
  const evidenceClass=text(submission.evidence_class).toUpperCase();
  if(!CONTRIBUTION_CLASSES.has(contributionClass))throw new Error('FIELD_HANDOFF_CONTRIBUTION_CLASS_'+contributionClass);
  if(!EVIDENCE_CLASSES.has(evidenceClass))throw new Error('FIELD_HANDOFF_EVIDENCE_CLASS_'+evidenceClass);

  const objectRef=text(submission.object_ref);
  const hostResolved=objectRef!==''&&objectRef.toUpperCase()!=='UNRESOLVED';
  const execution=submission.execution&&typeof submission.execution==='object'&&!Array.isArray(submission.execution)?submission.execution:{};
  const rawMoves=arr(execution.moves);
  if(rawMoves.length>3)throw new Error('FIELD_HANDOFF_TOO_MANY_MOVES');
  const moves=rawMoves.map(normalizeMove);
  const selectedId=text(execution.selected_move_id||'')||null;
  if(selectedId&&!moves.some(m=>m.id===selectedId))throw new Error('FIELD_HANDOFF_SELECTED_MOVE_NOT_FOUND');
  if(selectedId&&!hostResolved)throw new Error('FIELD_HANDOFF_UNRESOLVED_CANNOT_SELECT_TURN');

  const returnTo=text(execution.return_to||submission.return_to||(hostResolved?objectRef:'/'))||'/';
  const source={
    ref:text(submission.source_ref),
    intent:text(submission.intent),
    object_ref:objectRef,
    contribution_class:contributionClass,
    evidence_class:evidenceClass,
    delta_or_question:text(submission.delta_or_question)
  };
  const contextHandle=handle(source);
  let state=hostResolved?(moves.length?(selectedId?'TURN_READY':'HOLD_READY'):'HOLD_REQUIRED'):'SOURCE_REQUIRED';
  if(!STATE_ENUM.has(state))throw new Error('FIELD_HANDOFF_STATE_INTERNAL');

  const requires=state==='SOURCE_REQUIRED'
    ?['resolve one exact host/object_ref before action']
    :state==='HOLD_REQUIRED'
      ?['derive 1–3 host-native moves without inventing authority']
      :state==='HOLD_READY'
        ?['select exactly one declared move; selection alone grants no effect authority']
        :['execute only the selected native TURN; explicit host-native RELEASE/commit is still required for EFFECT'];

  const evidenceRefs=arr(execution.evidence_refs).map(text).filter(Boolean);
  const humanGate=normalizeHumanGate(submission.human_gate);
  return {
    schema:'field-crew-handoff/v0.1',
    authority:'NONE / TRANSIENT HANDOFF ONLY',
    context_handle:contextHandle,
    status:{state,requires},
    crew:{
      contributor_ref:text(submission.contributor_ref||'')||null,
      receiver_hint:text(submission.receiver_hint||'')||null,
      law:'Crew labels aid routing and continuity; they never grant host, effect, priority, NOW or merge authority.'
    },
    human_gate:humanGate,
    source,
    hold:{
      focus:hostResolved?objectRef:null,
      desired_delta:text(submission.delta_or_question),
      moves,
      selected_move_id:selectedId,
      return_to:returnTo
    },
    trace:{
      proof_available:submission.proof_available,
      evidence_refs:evidenceRefs,
      law:'Evidence pointers travel with the object; claims remain OBSERVED / DERIVED / UNKNOWN until the receiver verifies them.'
    },
    return:{
      target:returnTo,
      next_authority:'NONE',
      law:'RETURN closes this bounded handoff. The receiver must re-read current truth before any consequential successor move.'
    },
    laws:[
      'SAME OBJECT, NOT SHARED INTERNAL STATE.',
      'HANDOFF PRESERVES INTENT + ADDRESS + BOUNDED MOVES + EVIDENCE + RETURN; IT DOES NOT PRESERVE HIDDEN CHAIN OF THOUGHT.',
      'AT MOST THREE DECLARED MOVES; ZERO IS VALID AND MEANS HOLD_REQUIRED.',
      'HUMAN GATE CONTROLS INTERRUPTION NEED, NOT EFFECT/NOW/MERGE AUTHORITY.',
      'SELECTED MOVE != EFFECT AUTHORITY. EFFECT STILL REQUIRES EXPLICIT HOST-NATIVE RELEASE/COMMIT.',
      'THE HANDOFF IS STATELESS AND TRANSIENT; DO NOT COMMIT IT AS A SECOND QUEUE OR MEMORY STORE.'
    ]
  };
}

export function crewHandoffMarkdown(h){
  const out=['# FIELD CREW HANDOFF','handle: '+h.context_handle,'state: '+h.status.state,'authority: '+h.authority,''];
  out.push('## SOURCE','- '+h.source.object_ref+' · '+h.source.contribution_class+' / '+h.source.evidence_class,'- intent: '+h.source.intent,'- delta/question: '+h.source.delta_or_question);
  out.push('','## HUMAN GATE','- '+h.human_gate.class+' · '+h.human_gate.reason+(h.human_gate.source_ref?' · '+h.human_gate.source_ref:''));
  out.push('','## HOLD');
  if(!h.hold.moves.length)out.push('- no declared native moves');
  for(const m of h.hold.moves)out.push('- '+(h.hold.selected_move_id===m.id?'SELECTED ':'')+m.id+' · '+m.label+' ['+m.authority+'] → '+m.target+' · commit '+m.commit_boundary+' · reverse '+m.reversibility);
  out.push('','## RECEIVER');
  for(const r of h.status.requires)out.push('- '+r);
  if(h.human_gate.class==='NONE')out.push('- do not interrupt the human merely because a stage exists; continue otherwise-lawful non-effect work');
  if(h.human_gate.class==='PING')out.push('- ask for one lightweight acknowledgement only if it materially chooses continuation');
  if(h.human_gate.class==='CHOOSE')out.push('- stop before preference/framing/adoption; return bounded options to the human');
  if(h.human_gate.class==='WORLD_RETURN')out.push('- prepare/reduce/precompute freely, but do not invent the required world observation');
  if(h.human_gate.class==='UNSPECIFIED')out.push('- gate is unspecified; continue only default non-effect work and resolve it before a human/world/effect boundary');
  out.push('','## TRACE','- proof available: '+JSON.stringify(h.trace.proof_available));
  if(h.trace.evidence_refs.length)out.push('- refs: '+h.trace.evidence_refs.join(' · '));
  out.push('','## RETURN','- '+h.return.target+' · next_authority NONE','');
  return out.join('\n')+'\n';
}
