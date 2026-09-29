const EGRESS_CLASSES=Object.freeze(['NOW','DELTA','RESIDUE','GATE','NEXT','ARCHIVE']);
const REDUCTION_PRECEDENCE=Object.freeze(['ARCHIVE:HISTORY','GATE','NOW:AUTHORITY','RESIDUE','NEXT','DELTA:EVIDENCED','ARCHIVE:DEFAULT']);

const arr=v=>Array.isArray(v)?v:(v==null?[]:[v]);
const nonempty=v=>{
  if(v==null)return false;
  if(Array.isArray(v))return v.some(nonempty);
  if(typeof v==='object')return Object.keys(v).length>0;
  return String(v).trim().length>0;
};
const token=v=>String(v??'').trim().toUpperCase().replace(/[\s-]+/g,'_');
const flatten=v=>{
  if(v==null)return'';
  if(Array.isArray(v))return v.map(flatten).filter(Boolean).join(' · ');
  if(typeof v==='object')return Object.entries(v).map(([k,x])=>k+': '+flatten(x)).filter(x=>!/: $/.test(x)).join(' · ');
  return String(v).replace(/[ \t\r\n]+/g,' ').trim();
};
const values=(p,...keys)=>keys.filter(k=>Object.prototype.hasOwnProperty.call(p||{},k)).map(k=>p[k]);
const any=(p,...keys)=>values(p,...keys).some(nonempty);
const textTokens=p=>[
  p.state,p.status,p.disposition,p.surface_state,p.lifecycle,p.classification,
  p.STATE_IN,p.STATE_OUT,p.STOP,p.stop
].map(token).filter(Boolean);
const idOf=p=>p.packet_id||p.id||p.task_id||p.return_id||p.subject||p.OBJECT||p.object||p.object_ref||'packet';
const sourceRefs=p=>[
  ...arr(p.source_ref),...arr(p.source_refs),...arr(p.sources),...arr(p.evidence),
  ...arr(p.EVIDENCE),...arr(p.return_paths)
].filter(x=>typeof x==='string'&&x.trim()).slice(0,12);

function explicitClass(packet){
  for(const k of ['egress','egress_class','field_egress']){
    const v=token(packet?.[k]);
    if(EGRESS_CLASSES.includes(v))return v;
  }
  return null;
}

function historical(packet){
  const ts=textTokens(packet);
  return packet?.archived===true||
    packet?.superseded===true||
    ts.some(x=>/HISTORICAL|SUPERSEDED|ARCHIV|RETIRED|OBSOLETE|DONOR_ONLY/.test(x));
}

function gated(packet){
  const ts=textTokens(packet);
  return any(packet,'WAITING','waiting','waiting_on','gate','gates','dependency','dependency_kind','human_questions','blocked_by')||
    ts.some(x=>/WAIT|BLOCKED_EXTERNAL|REAL_DEVICE|PRIVATE_INPUT|PHYSICAL|WORLD_EVENT|HUMAN_ACTION|ORDINARY_USE/.test(x));
}

function hasDelta(packet){
  return any(packet,'DELTA','delta','delta_or_packet','delta_or_question','host_delta','changes','actual_delta','mutation','changed_paths');
}

function hasEvidence(packet){
  return any(packet,'EVIDENCE','evidence','verification','verify','proof_available','evidence_tests','proof','receipt','receipts');
}

function nextValues(packet){
  return values(packet,'NEXT','next','one_next','next_executable','next_single_action').flatMap(arr);
}

function inertNext(v){
  const s=flatten(v).toUpperCase();
  if(!s)return true;
  return /^(?:RETURN(?: TO)? (?:CURRENT|FIELD).*\bREPLAN\b|REPLAN\b)/i.test(s)||
    /^(?:NONE|NO NEXT|STOP|PARK(?:ED)?|ARCHIVE)$/i.test(s)||
    /NO AUTOMATIC SEQUEL/.test(s)||
    /DO NOT (?:AUTO[- ]?CONTINUE|CONTINUE|RESURRECT)/.test(s);
}

function hasNext(packet){
  return nextValues(packet).some(v=>nonempty(v)&&!inertNext(v));
}

function hasResidue(packet){
  return any(packet,'RESIDUE','residue','unknowns','conflicts','anti_merge_holds','unresolved','open_residue');
}

function currentAuthority(packet,context){
  const ts=textTokens(packet);
  return context.now===true||context.selected===true||packet.current===true||
    ts.some(x=>x==='ACTIVE_NOW'||x==='NOW');
}

export function reducePacket(packet={},context={}){
  if(!packet||typeof packet!=='object'||Array.isArray(packet))throw new Error('FIELD_EGRESS_PACKET_OBJECT_REQUIRED');
  const packet_id=idOf(packet),refs=sourceRefs(packet),explicit=explicitClass(packet);
  const out=(klass,reason)=>({packet_id,class:klass,reason,source_refs:refs});

  // Hard non-promotion boundary. Only an explicit authority context may reactivate history.
  if(historical(packet)&&context.reactivated!==true)return out('ARCHIVE','historical_or_superseded');

  // Explicit ARCHIVE is always a safe contraction; other explicit labels remain claims,
  // not authority, and must survive the structural precedence below.
  if(explicit==='ARCHIVE')return out('ARCHIVE','explicit_archive');

  // GATE outranks every live continuation claim, including an explicit NEXT.
  if(explicit==='GATE'||gated(packet))return out('GATE','human_world_or_external_dependency');

  // NOW is authority-derived. A packet cannot self-promote merely by declaring egress: NOW.
  if(currentAuthority(packet,context))return out('NOW','current_authority_selected');
  if(explicit==='NOW')return out('RESIDUE','explicit_now_without_current_authority');

  // Unresolved material outranks NEXT/DELTA. An asserted delta without evidence is residue,
  // not a completed change.
  if(explicit==='RESIDUE'||hasResidue(packet))return out('RESIDUE','unresolved_nonblocking_material');
  if((explicit==='DELTA'||hasDelta(packet))&&!hasEvidence(packet))return out('RESIDUE','delta_without_evidence');

  // NEXT is a candidate egress only; it never inherits execution authority.
  if(explicit==='NEXT'||hasNext(packet))return out('NEXT','explicit_next_without_gate_or_residue');

  // DELTA requires evidence once it is no longer current work.
  if((explicit==='DELTA'||hasDelta(packet))&&hasEvidence(packet))return out('DELTA','evidenced_bounded_change');

  return out('ARCHIVE','no_live_egress');
}

export function reducePackets(packets=[],contextFor=()=>({})){
  return arr(packets).map((packet,i)=>reducePacket(packet,contextFor(packet,i)||{}));
}

export {EGRESS_CLASSES,REDUCTION_PRECEDENCE};
