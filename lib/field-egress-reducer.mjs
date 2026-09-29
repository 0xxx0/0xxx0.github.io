const EGRESS_CLASSES=Object.freeze(['NOW','DELTA','RESIDUE','GATE','NEXT','ARCHIVE']);
const EGRESS_PRECEDENCE=Object.freeze(['GATE','NOW','RESIDUE','NEXT','DELTA','ARCHIVE']);

const arr=v=>Array.isArray(v)?v:(v==null?[]:[v]);
const nonempty=v=>{
  if(v==null)return false;
  if(Array.isArray(v))return v.length>0;
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
const textTokens=p=>[
  p.state,p.status,p.disposition,p.surface_state,p.lifecycle,p.classification,
  p.STATE_IN,p.STATE_OUT,p.STOP
].map(token).filter(Boolean);
const idOf=p=>p.packet_id||p.id||p.task_id||p.return_id||p.subject||'packet';
const sourceRefs=p=>[
  ...arr(p.source_ref),
  ...arr(p.source_refs),
  ...arr(p.sources),
  ...arr(p.evidence),
  ...arr(p.EVIDENCE),
  ...arr(p.return_paths)
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

function stopValue(packet){return packet?.stop??packet?.STOP}

function stopHasCondition(packet){
  if(nonempty(packet?.stop_condition)||nonempty(packet?.STOP_CONDITION))return true;
  const stop=stopValue(packet);
  if(stop&&typeof stop==='object'){
    return ['condition','when','until','trigger','requires','dependency'].some(k=>nonempty(stop[k]));
  }
  return typeof stop==='string'&&/\b(until|when|once|await|unless|requires?|needs?)\b/i.test(stop);
}

function terminalStop(packet){
  const stop=stopValue(packet);
  return nonempty(stop)&&!stopHasCondition(packet);
}

function gated(packet){
  const ts=textTokens(packet);
  return nonempty(packet?.WAITING)||
    nonempty(packet?.waiting)||
    nonempty(packet?.waiting_on)||
    nonempty(packet?.gate)||
    nonempty(packet?.gates)||
    nonempty(packet?.dependency)||
    nonempty(packet?.dependency_kind)||
    nonempty(packet?.human_questions)||
    nonempty(packet?.blocked_by)||
    stopHasCondition(packet)||
    ts.some(x=>/WAIT|BLOCKED_EXTERNAL|REAL_DEVICE|PRIVATE_INPUT|PHYSICAL|WORLD_EVENT|HUMAN_ACTION|ORDINARY_USE/.test(x));
}

function hasDelta(packet){
  return nonempty(packet?.DELTA)||
    nonempty(packet?.delta)||
    nonempty(packet?.delta_or_packet)||
    nonempty(packet?.delta_or_question)||
    nonempty(packet?.host_delta)||
    nonempty(packet?.actual_delta)||
    nonempty(packet?.changes)||
    nonempty(packet?.mutation)||
    nonempty(packet?.changed_paths);
}

function nextValues(packet){
  return [packet?.NEXT,packet?.next,packet?.one_next,packet?.next_executable,packet?.next_single_action].flatMap(arr);
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
  const ts=textTokens(packet);
  return nonempty(packet?.RESIDUE)||
    nonempty(packet?.residue)||
    nonempty(packet?.unknowns)||
    nonempty(packet?.conflicts)||
    nonempty(packet?.contradictions)||
    nonempty(packet?.anti_merge_holds)||
    nonempty(packet?.unresolved)||
    nonempty(packet?.open_residue)||
    ts.some(x=>/UNKNOWN|INDETERMINATE|UNRESOLVED/.test(x));
}

export function reducePacket(packet={},context={}){
  if(!packet||typeof packet!=='object'||Array.isArray(packet))throw new Error('FIELD_EGRESS_PACKET_OBJECT_REQUIRED');
  const packet_id=idOf(packet);
  const refs=sourceRefs(packet);

  // History is a hard non-promotion boundary. Only current authority may reactivate it.
  if(historical(packet)&&context.reactivated!==true){
    return {packet_id,class:'ARCHIVE',reason:'historical_or_superseded',source_refs:refs};
  }

  // Canonical one-bucket precedence recovered from the packet/RETURN work:
  // GATE → NOW → RESIDUE → NEXT → DELTA → ARCHIVE.
  // Explicit packet labels are advisory and may not manufacture GATE/NOW authority.
  const explicit=explicitClass(packet);
  if(gated(packet)){
    return {packet_id,class:'GATE',reason:'human_world_or_conditional_stop',source_refs:refs};
  }

  // NOW is caller-owned attention. Packet state/current/egress labels cannot mint it.
  if(context.now===true||context.selected===true){
    return {packet_id,class:'NOW',reason:'current_authority_selected',source_refs:refs};
  }

  // A terminal STOP closes continuation. Conditional STOP was already classified as GATE.
  if(terminalStop(packet)){
    if(hasResidue(packet)||explicit==='RESIDUE')return {packet_id,class:'RESIDUE',reason:'terminal_stop_with_residue',source_refs:refs};
    return {packet_id,class:'ARCHIVE',reason:'terminal_stop',source_refs:refs};
  }

  if(hasResidue(packet)||explicit==='RESIDUE'){
    return {packet_id,class:'RESIDUE',reason:'unresolved_fact_or_nonblocking_material',source_refs:refs};
  }

  if(hasNext(packet)||explicit==='NEXT'){
    return {packet_id,class:'NEXT',reason:'explicit_next_without_gate_or_residue',source_refs:refs};
  }

  if(hasDelta(packet)||explicit==='DELTA'){
    return {packet_id,class:'DELTA',reason:'bounded_change_without_higher_egress',source_refs:refs};
  }

  if(explicit==='ARCHIVE'){
    return {packet_id,class:'ARCHIVE',reason:'explicit_non_authoritative_egress',source_refs:refs};
  }

  return {packet_id,class:'ARCHIVE',reason:'no_live_egress',source_refs:refs};
}

export function reducePackets(packets=[],contextFor=()=>({})){
  return arr(packets).map((packet,i)=>reducePacket(packet,contextFor(packet,i)||{}));
}

export {EGRESS_CLASSES,EGRESS_PRECEDENCE};
