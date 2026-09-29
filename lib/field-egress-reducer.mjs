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
  p.state,p.status,p.disposition,p.surface_state,p.lifecycle,p.classification,p.state_out?.status,
  p.STATE_IN,isObj(p.STATE_OUT)?p.STATE_OUT.status:p.STATE_OUT
].map(token).filter(Boolean);
const idOf=p=>p.packet_id||p.id||p.task_id||p.return_id||p.object?.id||p.OBJECT?.id||p.subject||'packet';
const sourceRefs=p=>{
  const e=p.evidence??p.EVIDENCE;
  return[
    ...arr(p.source_ref),
    ...arr(p.source_refs),
    ...arr(p.sources),
    ...arr(isObj(e)?e.refs:e),
    ...arr(p.return_paths)
  ].filter(x=>typeof x==='string'&&x.trim()).slice(0,12);
};

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

function waitingPresent(packet){
  const w=packet?.waiting??packet?.WAITING;
  if(isObj(w)&&'exists' in w)return w.exists===true;
  return nonempty(w);
}

function externalGate(packet){
  const ts=textTokens(packet);
  const canonicalWaiting=packet?.WAITING,w=packet?.waiting??canonicalWaiting,stop=packet?.stop??packet?.STOP;
  if(nonempty(canonicalWaiting))return true; // canonical RETURN WAITING is a gate declaration
  if(isObj(stop)&&stop.explicit===true&&nonempty(stop.until))return true;
  if(isObj(w)&&w.exists===true&&w.external===true)return true;
  if(Array.isArray(w)&&w.length>0)return true; // transcript supplies already-resolved external gates
  if(nonempty(packet?.waiting_on)||nonempty(packet?.blocked_by)||nonempty(packet?.gate)||nonempty(packet?.gates)||nonempty(packet?.human_questions))return true;
  if(/EXTERNAL|REAL_DEVICE|PRIVATE_INPUT|PHYSICAL|WORLD_EVENT|HUMAN_ACTION|ORDINARY_USE/.test(token(packet?.dependency_kind)))return true;
  return ts.some(x=>/WAITING_(REAL_DEVICE|PRIVATE|PHYSICAL|WORLD|HUMAN)|BLOCKED_EXTERNAL|REAL_DEVICE|PRIVATE_INPUT|PHYSICAL_GATE|WORLD_EVENT|HUMAN_ACTION|ORDINARY_USE/.test(x));
}

function deltaPresent(packet){
  const d=packet?.delta??packet?.DELTA;
  if(isObj(d)&&'material' in d)return d.material===true;
  return nonempty(d)||
    nonempty(packet?.delta_or_packet)||
    nonempty(packet?.delta_or_question)||
    nonempty(packet?.host_delta)||
    nonempty(packet?.actual_delta)||
    nonempty(packet?.changes)||
    nonempty(packet?.mutation)||
    nonempty(packet?.changed_paths);
}

function evidenceSufficient(packet){
  const e=packet?.evidence??packet?.EVIDENCE;
  if(isObj(e)&&'sufficient' in e)return e.sufficient===true;
  return nonempty(e)||nonempty(packet?.proof)||nonempty(packet?.verification)||nonempty(packet?.verify)||nonempty(packet?.receipts)||nonempty(packet?.tests)||nonempty(packet?.evidence_tests);
}

function inertNext(v){
  const s=flatten(v).toUpperCase();
  if(!s)return true;
  return /^(?:RETURN(?: TO)? (?:CURRENT|FIELD).*\bREPLAN\b|REPLAN\b)/i.test(s)||
    /^(?:NONE|NO NEXT|STOP|PARK(?:ED)?|ARCHIVE)$/i.test(s)||
    /NO AUTOMATIC SEQUEL/.test(s)||
    /DO NOT (?:AUTO[- ]?CONTINUE|CONTINUE|RESURRECT)/.test(s);
}

function nextPresent(packet){
  const candidates=[packet?.next??packet?.NEXT,packet?.one_next,packet?.next_executable,packet?.next_single_action].flatMap(arr);
  return candidates.some(n=>{
    if(isObj(n)&&'exists' in n){
      if(n.exists!==true)return false;
      if('executable' in n&&n.executable!==true)return false;
      return true;
    }
    return nonempty(n)&&!inertNext(n);
  });
}

function residuePresent(packet,{unverifiedDelta=false}={}){
  const r=packet?.residue??packet?.RESIDUE,w=packet?.waiting??packet?.WAITING;
  if(isObj(r)&&'exists' in r&&r.exists===true)return true;
  if(!(isObj(r)&&'exists' in r)&&nonempty(r))return true;
  if(waitingPresent(packet)&&!nonempty(packet?.WAITING)&&!(isObj(w)&&w.external===true)&&!Array.isArray(w))return true;
  return unverifiedDelta||
    nonempty(packet?.unknowns)||
    nonempty(packet?.conflicts)||
    nonempty(packet?.contradictions)||
    nonempty(packet?.anti_merge_holds)||
    nonempty(packet?.unresolved)||
    nonempty(packet?.open_residue);
}

function stopExplicit(packet){
  const s=packet?.stop??packet?.STOP;
  if(s===true)return true;
  if(typeof s==='string')return s.trim().length>0; // legacy RETURN packets used STOP prose
  if(isObj(s))return s.explicit===true;
  return false;
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
  const packetForbidsNow=isObj(packet.authority)&&packet.authority.can_select_now===false;
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
