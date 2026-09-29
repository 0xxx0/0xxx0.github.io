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
const textTokens=p=>[
  p.state,p.status,p.disposition,p.surface_state,p.lifecycle,p.classification
].map(token).filter(Boolean);
const idOf=p=>p.packet_id||p.id||p.task_id||p.return_id||p.subject||'packet';
const sourceRefs=p=>[
  ...arr(p.source_ref),
  ...arr(p.source_refs),
  ...arr(p.sources),
  ...arr(p.evidence),
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

function stopHasCondition(packet){
  if(nonempty(packet?.stop_condition))return true;
  const stop=packet?.stop;
  if(stop&&typeof stop==='object'){
    return ['condition','when','until','trigger','requires','dependency'].some(k=>nonempty(stop[k]));
  }
  return typeof stop==='string'&&/\b(until|when|once|await|unless|requires?|needs?)\b/i.test(stop);
}

function gated(packet){
  const ts=textTokens(packet);
  return nonempty(packet?.waiting)||
    nonempty(packet?.gate)||
    nonempty(packet?.gates)||
    nonempty(packet?.dependency)||
    nonempty(packet?.dependency_kind)||
    nonempty(packet?.human_questions)||
    stopHasCondition(packet)||
    ts.some(x=>/WAIT|BLOCKED_EXTERNAL|REAL_DEVICE|PRIVATE_INPUT|PHYSICAL|WORLD_EVENT|HUMAN_ACTION|ORDINARY_USE/.test(x));
}

function hasDelta(packet){
  return nonempty(packet?.delta)||
    nonempty(packet?.delta_or_packet)||
    nonempty(packet?.host_delta)||
    nonempty(packet?.changes)||
    nonempty(packet?.mutation)||
    nonempty(packet?.changed_paths);
}

function hasNext(packet){
  return nonempty(packet?.one_next)||
    nonempty(packet?.next)||
    nonempty(packet?.next_executable)||
    nonempty(packet?.next_single_action);
}

function hasResidue(packet){
  const ts=textTokens(packet);
  return nonempty(packet?.residue)||
    nonempty(packet?.unknowns)||
    nonempty(packet?.conflicts)||
    nonempty(packet?.contradictions)||
    nonempty(packet?.anti_merge_holds)||
    nonempty(packet?.unresolved)||
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
  if(gated(packet)){
    return {packet_id,class:'GATE',reason:'human_world_or_conditional_stop',source_refs:refs};
  }

  const ts=textTokens(packet);
  if(context.now===true||context.selected===true||packet.current===true||ts.some(x=>x==='ACTIVE_NOW'||x==='NOW')){
    return {packet_id,class:'NOW',reason:'current_authority_selected',source_refs:refs};
  }

  if(hasResidue(packet)){
    return {packet_id,class:'RESIDUE',reason:'unresolved_fact_or_nonblocking_material',source_refs:refs};
  }

  if(hasNext(packet)){
    return {packet_id,class:'NEXT',reason:'explicit_next_without_gate_or_residue',source_refs:refs};
  }

  if(hasDelta(packet)){
    return {packet_id,class:'DELTA',reason:'bounded_change_without_higher_egress',source_refs:refs};
  }

  const explicit=explicitClass(packet);
  if(explicit&&explicit!=='NOW'&&explicit!=='GATE'){
    return {packet_id,class:explicit,reason:'explicit_non_authoritative_egress',source_refs:refs};
  }

  return {packet_id,class:'ARCHIVE',reason:'no_live_egress',source_refs:refs};
}

export function reducePackets(packets=[],contextFor=()=>({})){
  return arr(packets).map((packet,i)=>reducePacket(packet,contextFor(packet,i)||{}));
}

export {EGRESS_CLASSES,EGRESS_PRECEDENCE};
