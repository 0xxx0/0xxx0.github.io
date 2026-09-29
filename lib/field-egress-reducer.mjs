const EGRESS_CLASSES=Object.freeze(['NOW','DELTA','RESIDUE','GATE','NEXT','ARCHIVE']);
const CANONICAL_PACKET_SCHEMA='field-work-packet/v0.1';
const RETURN_DISPOSITIONS=Object.freeze(['CLOSE','RESIDUE','WAITING','CONTRADICTION','TRIGGER']);

const arr=v=>Array.isArray(v)?v:(v==null?[]:[v]);
const nonempty=v=>{
  if(v==null||v===false)return false;
  if(Array.isArray(v))return v.length>0;
  if(typeof v==='object')return Object.keys(v).length>0;
  return String(v).trim().length>0;
};
const token=v=>String(v??'').trim().toUpperCase().replace(/[\s-]+/g,'_');
const textTokens=p=>[
  p.state,p.status,p.disposition,p.surface_state,p.lifecycle,p.classification
].map(token).filter(Boolean);
const idOf=p=>p.packet_id||p.id||p.task_id||p.return_id||p.subject||p.object?.id||p.object||'packet';
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

function gated(packet){
  const ts=textTokens(packet);
  return nonempty(packet?.waiting)||
    nonempty(packet?.gate)||
    nonempty(packet?.gates)||
    nonempty(packet?.dependency)||
    nonempty(packet?.dependency_kind)||
    nonempty(packet?.human_questions)||
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

function nextItems(packet){
  if(Object.prototype.hasOwnProperty.call(packet||{},'next'))return arr(packet.next).filter(nonempty);
  for(const k of ['one_next','next_executable','next_single_action']){
    if(nonempty(packet?.[k]))return arr(packet[k]).filter(nonempty);
  }
  return [];
}

function hasNext(packet){
  return nextItems(packet).length>0;
}

function hasResidue(packet){
  return nonempty(packet?.residue)||
    nonempty(packet?.unknowns)||
    nonempty(packet?.conflicts)||
    nonempty(packet?.anti_merge_holds)||
    nonempty(packet?.unresolved);
}

function returnDisposition(packet){
  return token(packet?.return?.disposition||packet?.return_disposition);
}

function canonicalSchema(packet){
  const s=String(packet?.schema||'').trim().toLowerCase();
  return s===CANONICAL_PACKET_SCHEMA||s.endsWith('/'+CANONICAL_PACKET_SCHEMA);
}

export function isCanonicalPacket(packet){
  return !!packet&&typeof packet==='object'&&!Array.isArray(packet)&&(
    canonicalSchema(packet)||
    (Object.prototype.hasOwnProperty.call(packet,'object')&&Object.prototype.hasOwnProperty.call(packet,'authority'))
  );
}

export function validateCanonicalPacket(packet){
  const errors=[];
  if(!packet||typeof packet!=='object'||Array.isArray(packet))return{ok:false,errors:['PACKET_OBJECT_REQUIRED']};
  if(!nonempty(packet.object))errors.push('OBJECT_REQUIRED');
  if(!nonempty(packet.authority))errors.push('AUTHORITY_REQUIRED');
  const rd=returnDisposition(packet);
  if(rd&&!RETURN_DISPOSITIONS.includes(rd))errors.push('RETURN_DISPOSITION_UNKNOWN');
  return{ok:errors.length===0,errors};
}

function canonicalCurrent(packet,context){
  if(context.now===true||context.selected===true)return true;
  if(packet?.authority?.current===true)return true;
  const a=token(typeof packet?.authority==='object'?(packet.authority.state||packet.authority.mode):packet?.authority);
  const s=token(packet?.state_out?.attention||packet?.state_out?.state||packet?.state_out);
  return ['CURRENT','CURRENT_AUTHORITY','ACTIVE_NOW','NOW'].includes(a)||
    ['CURRENT','ACTIVE_NOW','NOW'].includes(s);
}

function reduceCanonicalPacket(packet,context={}){
  const packet_id=idOf(packet),refs=sourceRefs(packet);
  if(historical(packet)&&context.reactivated!==true){
    return {packet_id,class:'ARCHIVE',reason:'historical_or_superseded',source_refs:refs,canonical:true};
  }

  const validation=validateCanonicalPacket(packet);
  if(!validation.ok){
    return {
      packet_id,class:'ARCHIVE',reason:'invalid_canonical_packet',source_refs:refs,canonical:true,
      validation_errors:validation.errors
    };
  }

  const rd=returnDisposition(packet);
  const closed=packet.stop===true||rd==='CLOSE'||token(packet?.state_out?.state)==='CLOSED';
  if(closed)return {packet_id,class:'ARCHIVE',reason:'return_close_or_stop',source_refs:refs,canonical:true};

  if(rd==='CONTRADICTION'||packet.contradiction===true){
    return {packet_id,class:'RESIDUE',reason:'return_contradiction',source_refs:refs,canonical:true};
  }

  if(rd==='WAITING'||gated(packet)){
    return {packet_id,class:'GATE',reason:'human_world_or_external_dependency',source_refs:refs,canonical:true};
  }

  if(rd==='RESIDUE'||hasResidue(packet)){
    return {packet_id,class:'RESIDUE',reason:'returned_unresolved_material',source_refs:refs,canonical:true};
  }

  if(canonicalCurrent(packet,context)){
    return {packet_id,class:'NOW',reason:'current_authority_selected',source_refs:refs,canonical:true};
  }

  if(hasDelta(packet)){
    if(!nonempty(packet.evidence)){
      return {packet_id,class:'RESIDUE',reason:'material_delta_without_evidence',source_refs:refs,canonical:true};
    }
    return {packet_id,class:'DELTA',reason:'evidenced_bounded_change',source_refs:refs,canonical:true};
  }

  const next=nextItems(packet);
  if(next.length>3){
    return {packet_id,class:'RESIDUE',reason:'next_exceeds_3',source_refs:refs,canonical:true,next_count:next.length};
  }
  if(next.length){
    return {
      packet_id,class:'NEXT',reason:rd==='TRIGGER'?'return_trigger':'explicit_next_without_gate',
      source_refs:refs,canonical:true,next_count:next.length
    };
  }

  return {
    packet_id,class:'ARCHIVE',
    reason:rd==='TRIGGER'?'trigger_without_next':'no_live_egress',
    source_refs:refs,canonical:true
  };
}

export function reducePacket(packet={},context={}){
  if(!packet||typeof packet!=='object'||Array.isArray(packet))throw new Error('FIELD_EGRESS_PACKET_OBJECT_REQUIRED');

  // Canonical packets take the strict lane. Legacy packets retain the broad recovery adapter below.
  if(isCanonicalPacket(packet))return reduceCanonicalPacket(packet,context);

  const packet_id=idOf(packet);
  const refs=sourceRefs(packet);

  // History is a hard non-promotion boundary. Only current authority may reactivate it.
  if(historical(packet)&&context.reactivated!==true){
    return {packet_id,class:'ARCHIVE',reason:'historical_or_superseded',source_refs:refs};
  }

  const explicit=explicitClass(packet);
  if(explicit){
    return {packet_id,class:explicit,reason:'explicit_egress',source_refs:refs};
  }

  if(gated(packet)){
    return {packet_id,class:'GATE',reason:'human_world_or_external_dependency',source_refs:refs};
  }

  const ts=textTokens(packet);
  if(context.now===true||context.selected===true||packet.current===true||ts.some(x=>x==='ACTIVE_NOW'||x==='NOW')){
    return {packet_id,class:'NOW',reason:'current_authority_selected',source_refs:refs};
  }

  if(hasDelta(packet)){
    return {packet_id,class:'DELTA',reason:'bounded_change_present',source_refs:refs};
  }

  if(hasNext(packet)){
    return {packet_id,class:'NEXT',reason:'explicit_next_without_gate',source_refs:refs};
  }

  if(hasResidue(packet)){
    return {packet_id,class:'RESIDUE',reason:'unresolved_nonblocking_material',source_refs:refs};
  }

  return {packet_id,class:'ARCHIVE',reason:'no_live_egress',source_refs:refs};
}

export function reducePackets(packets=[],contextFor=()=>({})){
  return arr(packets).map((packet,i)=>reducePacket(packet,contextFor(packet,i)||{}));
}

export {EGRESS_CLASSES,CANONICAL_PACKET_SCHEMA,RETURN_DISPOSITIONS};
