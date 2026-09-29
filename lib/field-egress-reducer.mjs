const EGRESS_CLASSES=Object.freeze(['NOW','DELTA','RESIDUE','GATE','NEXT','ARCHIVE']);
const EGRESS_PRECEDENCE=Object.freeze(['GATE','NOW','RESIDUE','NEXT','DELTA','ARCHIVE']);
const CANONICAL_PACKET_SCHEMA='field-work-packet/v0.1';
const RETURN_DISPOSITIONS=Object.freeze(['CLOSE','RESIDUE','WAITING','CONTRADICTION','TRIGGER']);

const arr=v=>Array.isArray(v)?v:(v==null?[]:[v]);
const isObj=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const nonempty=v=>{
  if(v==null||v===false)return false;
  if(Array.isArray(v))return v.length>0;
  if(isObj(v)){
    if('exists' in v&&v.exists===false)return false;
    return Object.keys(v).length>0;
  }
  return String(v).trim().length>0;
};
const token=v=>String(v??'').trim().toUpperCase().replace(/[\s-]+/g,'_');
const flatten=v=>{
  if(v==null)return'';
  if(Array.isArray(v))return v.map(flatten).filter(Boolean).join(' · ');
  if(isObj(v))return Object.entries(v).map(([k,x])=>k+': '+flatten(x)).filter(x=>!/: $/.test(x)).join(' · ');
  return String(v).replace(/[ \t\r\n]+/g,' ').trim();
};
const textTokens=p=>[
  p.state,p.status,p.disposition,p.surface_state,p.lifecycle,p.classification,
  p.STATE_IN,p.STATE_OUT,p.STOP
].map(token).filter(Boolean);
const objectOf=p=>p?.object??p?.OBJECT;
const authorityOf=p=>p?.authority??p?.AUTHORITY;
const evidenceOf=p=>p?.evidence??p?.EVIDENCE;
const stopOf=p=>p?.stop??p?.STOP;
const idOf=p=>p.packet_id||p.id||p.task_id||p.return_id||objectOf(p)?.id||p.subject||'packet';
const sourceRefs=p=>[
  ...arr(p.source_ref),
  ...arr(p.source_refs),
  ...arr(p.sources),
  ...arr(isObj(evidenceOf(p))?evidenceOf(p).refs:evidenceOf(p)),
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

function returnDisposition(packet){
  return token(packet?.return?.disposition||packet?.RETURN?.disposition||packet?.return_disposition||packet?.RETURN_DISPOSITION);
}

function stopHasCondition(packet){
  if(nonempty(packet?.stop_condition)||nonempty(packet?.STOP_CONDITION))return true;
  const stop=stopOf(packet);
  if(isObj(stop)){
    return ['condition','when','until','trigger','requires','dependency'].some(k=>nonempty(stop[k]));
  }
  return typeof stop==='string'&&/\b(until|when|once|await|unless|requires?|needs?)\b/i.test(stop);
}

function stopExplicit(packet){
  const stop=stopOf(packet);
  if(stop===true)return true;
  if(typeof stop==='string')return stop.trim().length>0;
  if(isObj(stop)){
    if('explicit' in stop)return stop.explicit===true;
    return Object.keys(stop).length>0;
  }
  return false;
}

function waitingPresent(packet){
  const w=packet?.WAITING??packet?.waiting;
  if(isObj(w)&&'exists' in w)return w.exists===true;
  return nonempty(w);
}

function externalGate(packet){
  const ts=textTokens(packet);
  const w=packet?.WAITING??packet?.waiting;
  const stop=stopOf(packet);
  if(returnDisposition(packet)==='WAITING')return true;
  if(isObj(stop)&&stop.explicit===true&&nonempty(stop.until))return true;
  if(stopHasCondition(packet))return true;
  if(isObj(w)&&w.exists===true&&(w.external!==false))return true;
  if(Array.isArray(w)&&w.length>0)return true;
  if(typeof w==='string'&&w.trim())return true;
  if(nonempty(packet?.waiting_on)||nonempty(packet?.gate)||nonempty(packet?.gates)||nonempty(packet?.human_questions)||nonempty(packet?.blocked_by))return true;
  if(/EXTERNAL|REAL_DEVICE|PRIVATE_INPUT|PHYSICAL|WORLD_EVENT|HUMAN_ACTION|ORDINARY_USE/.test(token(packet?.dependency_kind)))return true;
  return ts.some(x=>/WAITING_(REAL_DEVICE|PRIVATE|PHYSICAL|WORLD|HUMAN)|BLOCKED_EXTERNAL|REAL_DEVICE|PRIVATE_INPUT|PHYSICAL_GATE|WORLD_EVENT|HUMAN_ACTION|ORDINARY_USE/.test(x));
}

function deltaPresent(packet){
  const d=packet?.DELTA??packet?.delta;
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
  const e=evidenceOf(packet);
  if(isObj(e)&&'sufficient' in e)return e.sufficient===true;
  if(isObj(e)&&Array.isArray(e.refs))return e.refs.length>0;
  return nonempty(e)||nonempty(packet?.proof)||nonempty(packet?.verification)||nonempty(packet?.receipts)||nonempty(packet?.tests);
}

function nextValues(packet){
  return [packet?.NEXT,packet?.next,packet?.one_next,packet?.next_executable,packet?.next_single_action].flatMap(arr);
}

function inertNext(v){
  const s=flatten(v).toUpperCase();
  if(!s)return true;
  if(isObj(v)&&'exists' in v&&v.exists!==true)return true;
  if(isObj(v)&&'executable' in v&&v.executable!==true)return true;
  return /^(?:RETURN(?: TO)? (?:CURRENT|FIELD).*\bREPLAN\b|REPLAN\b)/i.test(s)||
    /^(?:NONE|NO NEXT|STOP|PARK(?:ED)?|ARCHIVE)$/i.test(s)||
    /NO AUTOMATIC SEQUEL/.test(s)||
    /DO NOT (?:AUTO[- ]?CONTINUE|CONTINUE|RESURRECT)/.test(s);
}

function executableNextValues(packet){
  return nextValues(packet).filter(v=>nonempty(v)&&!inertNext(v));
}

function residuePresent(packet,{unverifiedDelta=false,authorityConflict=false}={}){
  const r=packet?.RESIDUE??packet?.residue;
  if(isObj(r)&&'exists' in r&&r.exists===true)return true;
  if(!(isObj(r)&&'exists' in r)&&nonempty(r))return true;
  if(waitingPresent(packet)&&!(isObj(packet?.waiting)&&packet.waiting.external===true)&&!Array.isArray(packet?.waiting))return true;
  return unverifiedDelta||
    authorityConflict||
    returnDisposition(packet)==='RESIDUE'||
    returnDisposition(packet)==='CONTRADICTION'||
    nonempty(packet?.unknowns)||
    nonempty(packet?.conflicts)||
    nonempty(packet?.contradictions)||
    nonempty(packet?.anti_merge_holds)||
    nonempty(packet?.unresolved)||
    nonempty(packet?.open_residue);
}

function canonicalSchema(packet){
  const s=String(packet?.schema||'').trim().toLowerCase();
  return s===CANONICAL_PACKET_SCHEMA||s.endsWith('/'+CANONICAL_PACKET_SCHEMA);
}

export function isCanonicalPacket(packet){
  return !!packet&&typeof packet==='object'&&!Array.isArray(packet)&&(
    canonicalSchema(packet)||
    (Object.prototype.hasOwnProperty.call(packet,'object')||Object.prototype.hasOwnProperty.call(packet,'OBJECT'))&&
    (Object.prototype.hasOwnProperty.call(packet,'authority')||Object.prototype.hasOwnProperty.call(packet,'AUTHORITY'))
  );
}

export function validateCanonicalPacket(packet){
  const errors=[];
  if(!packet||typeof packet!=='object'||Array.isArray(packet))return{ok:false,errors:['PACKET_OBJECT_REQUIRED']};
  if(!nonempty(objectOf(packet)))errors.push('OBJECT_REQUIRED');
  if(!nonempty(authorityOf(packet)))errors.push('AUTHORITY_REQUIRED');
  const rd=returnDisposition(packet);
  if(rd&&!RETURN_DISPOSITIONS.includes(rd))errors.push('RETURN_DISPOSITION_UNKNOWN');
  return{ok:errors.length===0,errors};
}

function canonicalTriggerAuthorized(packet,context){
  if(context.authorized===true)return true;
  const a=authorityOf(packet);
  if(isObj(a))return a.next===true||a.execute_next===true||a.can_execute_next===true;
  return false;
}

function result(packet_id,klass,reason,refs,hint,extra={}){
  const out={packet_id,class:klass,reason,source_refs:refs,...extra};
  if(hint&&hint!==klass)out.input_egress_hint=hint;
  return out;
}

function reduceCanonical(packet,context,packet_id,refs,hint){
  const validation=validateCanonicalPacket(packet);
  if(!validation.ok){
    return result(packet_id,'ARCHIVE','invalid_canonical_packet',refs,hint,{canonical:true,validation_errors:validation.errors});
  }

  const rd=returnDisposition(packet);
  const next=executableNextValues(packet);
  const selectionRequested=context.now===true||context.selected===true;
  const a=authorityOf(packet);
  const packetForbidsNow=isObj(a)&&a.can_select_now===false;
  const authorizedNow=selectionRequested&&!packetForbidsNow;
  const triggerBlocked=rd==='TRIGGER'&&(!next.length||!canonicalTriggerAuthorized(packet,context));

  if(externalGate(packet)||triggerBlocked){
    return result(packet_id,'GATE',triggerBlocked?'return_trigger_not_executable':'human_world_or_conditional_stop',refs,hint,{canonical:true});
  }

  if(rd==='CLOSE'){
    return result(packet_id,'ARCHIVE','return_close',refs,hint,{canonical:true});
  }

  const hasDelta=deltaPresent(packet);
  const witnessedDelta=hasDelta&&evidenceSufficient(packet);
  const authorityConflict=selectionRequested&&packetForbidsNow;
  const hasResidue=residuePresent(packet,{unverifiedDelta:hasDelta&&!witnessedDelta,authorityConflict});

  // STOP is a terminal disposition after a conditional STOP has already become GATE.
  // It never leaks into NEXT: unresolved material survives as RESIDUE; otherwise it closes.
  if(stopExplicit(packet)){
    if(hasResidue){
      return result(packet_id,'RESIDUE',authorityConflict?'selected_without_now_authority':(hasDelta&&!witnessedDelta?'unverified_delta':'stopped_with_residue'),refs,hint,{canonical:true});
    }
    return result(packet_id,'ARCHIVE','explicit_stop',refs,hint,{canonical:true});
  }

  // Recovered one-bucket precedence: GATE -> NOW -> RESIDUE -> NEXT -> DELTA -> ARCHIVE.
  if(authorizedNow){
    return result(packet_id,'NOW','current_authority_selected',refs,hint,{canonical:true});
  }

  if(hasResidue){
    return result(packet_id,'RESIDUE',authorityConflict?'selected_without_now_authority':(hasDelta&&!witnessedDelta?'unverified_delta':'unresolved_nonblocking_material'),refs,hint,{canonical:true});
  }

  if(next.length>3){
    return result(packet_id,'RESIDUE','next_exceeds_3',refs,hint,{canonical:true,next_count:next.length});
  }

  if(next.length){
    return result(packet_id,'NEXT',rd==='TRIGGER'?'authorized_return_trigger':'explicit_next_without_gate_or_residue',refs,hint,{canonical:true,next_count:next.length});
  }

  if(witnessedDelta){
    return result(packet_id,'DELTA','witnessed_bounded_change',refs,hint,{canonical:true});
  }

  return result(packet_id,'ARCHIVE','no_live_egress',refs,hint,{canonical:true});
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

  // New packets enter a strict lane. Recovered historical shapes keep the broad adapter below.
  if(isCanonicalPacket(packet))return reduceCanonical(packet,context,packet_id,refs,hint);

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
  const hasResidue=residuePresent(packet,{unverifiedDelta:hasDelta&&!witnessedDelta,authorityConflict});

  // STOP dominates continuation: after GATE, only unresolved material survives.
  if(stopExplicit(packet)){
    if(hasResidue)return result(packet_id,'RESIDUE',authorityConflict?'selected_without_now_authority':(hasDelta&&!witnessedDelta?'unverified_delta':'stopped_with_residue'),refs,hint);
    return result(packet_id,'ARCHIVE','explicit_stop',refs,hint);
  }

  if(hasResidue){
    return result(packet_id,'RESIDUE',authorityConflict?'selected_without_now_authority':(hasDelta&&!witnessedDelta?'unverified_delta':'unresolved_nonblocking_material'),refs,hint);
  }

  if(executableNextValues(packet).length){
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

export {
  EGRESS_CLASSES,EGRESS_PRECEDENCE,CANONICAL_PACKET_SCHEMA,RETURN_DISPOSITIONS
};
