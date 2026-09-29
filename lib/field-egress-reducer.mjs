const EGRESS_CLASSES=Object.freeze(['NOW','DELTA','RESIDUE','GATE','NEXT','ARCHIVE']);
const EGRESS_PRECEDENCE=Object.freeze(['GATE','NOW','RESIDUE','NEXT','DELTA','ARCHIVE']);

const arr=v=>Array.isArray(v)?v:(v==null?[]:[v]);
const isObj=v=>v&&typeof v==='object'&&!Array.isArray(v);
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
  p.state_in?.status,p.state_out?.status,p.STATE_IN?.status,p.STATE_OUT?.status,
  typeof p.STATE_IN==='string'?p.STATE_IN:null,typeof p.STATE_OUT==='string'?p.STATE_OUT:null
].map(token).filter(Boolean);
const idOf=p=>p.packet_id||p.id||p.task_id||p.return_id||p.object?.id||p.OBJECT?.id||p.subject||'packet';
const evidenceField=p=>p.EVIDENCE??p.evidence;
const sourceRefs=p=>[
  ...arr(p.source_ref),
  ...arr(p.source_refs),
  ...arr(p.sources),
  ...arr(isObj(evidenceField(p))?evidenceField(p).refs:evidenceField(p)),
  ...arr(p.return_paths)
].filter(x=>typeof x==='string'&&x.trim()).slice(0,12);

function explicitClass(packet){
  for(const k of ['egress','egress_class','field_egress','EGRESS']){
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

function semanticPresent(v){
  if(isObj(v)&&'exists' in v)return v.exists===true;
  return nonempty(v);
}

function waitingValue(packet){
  return packet?.WAITING??packet?.waiting;
}

function stopValue(packet){
  return packet?.STOP??packet?.stop;
}

function stopHasCondition(packet){
  if(nonempty(packet?.stop_condition)||nonempty(packet?.STOP_CONDITION))return true;
  const stop=stopValue(packet);
  if(isObj(stop)){
    if(stop.explicit===false)return false;
    return ['condition','when','until','trigger','requires','dependency'].some(k=>nonempty(stop[k]));
  }
  return typeof stop==='string'&&/\b(until|when|once|await|unless|requires?|needs?)\b/i.test(stop);
}

function externalGate(packet){
  const ts=textTokens(packet);
  const w=waitingValue(packet);
  if(stopHasCondition(packet))return true;
  if(isObj(w)&&w.exists===true&&w.external===true)return true;
  if(Array.isArray(w)&&w.length>0)return true;
  if(typeof w==='string'&&w.trim())return true;
  if(semanticPresent(packet?.waiting_on)||semanticPresent(packet?.gate)||semanticPresent(packet?.gates)||semanticPresent(packet?.human_questions)||semanticPresent(packet?.blocked_by))return true;
  if(/EXTERNAL|REAL_DEVICE|PRIVATE_INPUT|PHYSICAL|WORLD_EVENT|HUMAN_ACTION|ORDINARY_USE/.test(token(packet?.dependency_kind)))return true;
  if(semanticPresent(packet?.dependency)&&/EXTERNAL|REAL_DEVICE|PRIVATE|PHYSICAL|WORLD|HUMAN|ORDINARY_USE/.test(token(flatten(packet.dependency))))return true;
  return ts.some(x=>/WAITING_(REAL_DEVICE|PRIVATE|PHYSICAL|WORLD|HUMAN)|BLOCKED_EXTERNAL|REAL_DEVICE|PRIVATE_INPUT|PHYSICAL_GATE|WORLD_EVENT|HUMAN_ACTION|ORDINARY_USE/.test(x));
}

function deltaFieldPresent(v){
  if(isObj(v)&&'material' in v)return v.material===true;
  return nonempty(v);
}

function deltaPresent(packet){
  return deltaFieldPresent(packet?.DELTA)||
    deltaFieldPresent(packet?.delta)||
    nonempty(packet?.delta_or_packet)||
    nonempty(packet?.delta_or_question)||
    nonempty(packet?.host_delta)||
    nonempty(packet?.actual_delta)||
    nonempty(packet?.changes)||
    nonempty(packet?.mutation)||
    nonempty(packet?.changed_paths);
}

function evidenceSufficient(packet){
  const e=evidenceField(packet);
  if(isObj(e)&&'sufficient' in e)return e.sufficient===true;
  return nonempty(e)||nonempty(packet?.proof)||nonempty(packet?.verification)||nonempty(packet?.receipts)||nonempty(packet?.tests);
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

function nextCandidate(v){
  if(isObj(v)&&'exists' in v){
    if(v.exists!==true)return false;
    if('executable' in v&&v.executable!==true)return false;
  }
  return nonempty(v)&&!inertNext(v);
}

function nextPresent(packet){
  return nextValues(packet).some(nextCandidate);
}

function residueFieldPresent(v){
  if(isObj(v)&&'exists' in v)return v.exists===true;
  return nonempty(v);
}

function waitingPresent(packet){
  return semanticPresent(waitingValue(packet));
}

function residuePresent(packet,{unverifiedDelta=false}={}){
  const ts=textTokens(packet);
  const w=waitingValue(packet);
  const internalWaiting=waitingPresent(packet)&&isObj(w)&&w.external===false;
  return residueFieldPresent(packet?.RESIDUE)||
    residueFieldPresent(packet?.residue)||
    internalWaiting||
    unverifiedDelta||
    nonempty(packet?.unknowns)||
    nonempty(packet?.conflicts)||
    nonempty(packet?.contradictions)||
    nonempty(packet?.anti_merge_holds)||
    nonempty(packet?.unresolved)||
    nonempty(packet?.open_residue)||
    ts.some(x=>/UNKNOWN|INDETERMINATE|UNRESOLVED/.test(x));
}

function stopExplicit(packet){
  const s=stopValue(packet);
  if(s===true)return true;
  if(typeof s==='string')return s.trim().length>0;
  if(isObj(s))return s.explicit!==false&&nonempty(s);
  return false;
}

function packetAuthority(packet){
  return packet?.AUTHORITY??packet?.authority;
}

function result(packet_id,klass,reason,refs,hint){
  const out={packet_id,class:klass,reason,source_refs:refs};
  if(hint&&hint!==klass)out.input_egress_hint=hint;
  return out;
}

export function reducePacket(packet={},context={}){
  if(!packet||typeof packet!=='object'||Array.isArray(packet))throw new Error('FIELD_EGRESS_PACKET_OBJECT_REQUIRED');
  const packet_id=idOf(packet);
  const refs=sourceRefs(packet);
  const hint=explicitClass(packet);

  // History is a hard non-promotion boundary. Reactivation only reopens evaluation;
  // it does not itself grant NOW or continuation authority.
  if(historical(packet)&&context.reactivated!==true){
    return result(packet_id,'ARCHIVE','historical_or_superseded',refs,hint);
  }

  if(externalGate(packet)){
    return result(packet_id,'GATE','human_world_or_external_dependency',refs,hint);
  }

  // NOW is caller-authorized attention, never a property a packet can grant itself.
  const selectionRequested=context.now===true||context.selected===true;
  const authority=packetAuthority(packet);
  const packetForbidsNow=isObj(authority)&&authority.can_select_now===false;
  const authorizedNow=selectionRequested&&!packetForbidsNow;
  if(authorizedNow&&!stopExplicit(packet)){
    return result(packet_id,'NOW','current_authority_selected',refs,hint);
  }

  const authorityConflict=selectionRequested&&packetForbidsNow;
  const hasDelta=deltaPresent(packet);
  const witnessedDelta=hasDelta&&evidenceSufficient(packet);
  const hasResidue=residuePresent(packet,{unverifiedDelta:hasDelta&&!witnessedDelta})||authorityConflict;

  // STOP dominates continuation: after GATE, only unresolved material survives.
  if(stopExplicit(packet)){
    if(hasResidue)return result(packet_id,'RESIDUE',authorityConflict?'selected_without_now_authority':(hasDelta&&!witnessedDelta?'unverified_delta':'stopped_with_residue'),refs,hint);
    return result(packet_id,'ARCHIVE','explicit_stop',refs,hint);
  }

  if(hasResidue){
    return result(packet_id,'RESIDUE',authorityConflict?'selected_without_now_authority':(hasDelta&&!witnessedDelta?'unverified_delta':'unresolved_nonblocking_material'),refs,hint);
  }

  if(nextPresent(packet)){
    return result(packet_id,'NEXT','explicit_next_without_gate_or_residue',refs,hint);
  }

  if(witnessedDelta){
    return result(packet_id,'DELTA','witnessed_bounded_change',refs,hint);
  }

  return result(packet_id,'ARCHIVE','no_live_egress',refs,hint);
}

export function reducePackets(packets=[],contextFor=()=>({})){
  return arr(packets).map((packet,i)=>reducePacket(packet,contextFor(packet,i)||{}));
}

export {EGRESS_CLASSES,EGRESS_PRECEDENCE};
