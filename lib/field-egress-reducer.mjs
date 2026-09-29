const EGRESS_CLASSES=Object.freeze(['NOW','DELTA','RESIDUE','GATE','NEXT','ARCHIVE']);
const EGRESS_PRECEDENCE=Object.freeze(['GATE','NOW','RESIDUE','NEXT','DELTA','ARCHIVE']);
const EGRESS_FIELDS=Object.freeze(['OBJECT','AUTHORITY','STATE_IN','DELTA','EVIDENCE','STATE_OUT','RESIDUE','WAITING','NEXT','STOP']);
const RETURN_CLASSES=Object.freeze(['CLOSE','RESIDUE','WAITING','CONTRADICTION']);
const FIELD_BUCKETS=Object.freeze(['NOW','DELTA','RESIDUE','GATE','NEXT','ARCHIVE']);

const arr=v=>Array.isArray(v)?v:(v==null?[]:[v]);
const nonempty=v=>{
  if(v==null)return false;
  if(Array.isArray(v))return v.some(nonempty);
  if(typeof v==='object')return Object.keys(v).length>0;
  return String(v).trim().length>0;
};
const token=v=>String(v??'').trim().toUpperCase().replace(/[\s-]+/g,'_');
const text=v=>String(v==null?'':v).trim();
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
const uniq=(xs,key=x=>JSON.stringify(x))=>{
  const seen=new Set();
  return xs.filter(x=>{const k=key(x);if(seen.has(k))return false;seen.add(k);return true});
};
const parseTime=v=>{
  const n=Date.parse(v||'');
  return Number.isFinite(n)?n:null;
};
const machineSubject=s=>/^(?:comms|nexus):\s.*refresh\b/i.test(text(s));

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
  const stop=packet?.stop??packet?.STOP;
  if(stop&&typeof stop==='object'){
    return ['condition','when','until','trigger','requires','dependency'].some(k=>nonempty(stop[k]));
  }
  return typeof stop==='string'&&/\b(until|when|once|await|unless|requires?|needs?)\b/i.test(stop);
}

function stopHasUnresolved(packet){
  const stop=packet?.stop??packet?.STOP;
  if(stop&&typeof stop==='object'){
    return ['unknown','unresolved','conflict','contradiction','missing','ambiguity'].some(k=>nonempty(stop[k]));
  }
  return typeof stop==='string'&&/\b(unknown|unresolved|conflict|contradiction|missing|ambiguous|ambiguity)\b/i.test(stop);
}

function hasStop(packet){
  return nonempty(packet?.stop)||nonempty(packet?.STOP);
}

function gated(packet){
  const ts=textTokens(packet);
  return nonempty(packet?.waiting)||
    nonempty(packet?.WAITING)||
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
    nonempty(packet?.DELTA)||
    nonempty(packet?.delta_or_packet)||
    nonempty(packet?.host_delta)||
    nonempty(packet?.changes)||
    nonempty(packet?.mutation)||
    nonempty(packet?.changed_paths);
}

function hasNext(packet){
  return nonempty(packet?.one_next)||
    nonempty(packet?.next)||
    nonempty(packet?.NEXT)||
    nonempty(packet?.next_executable)||
    nonempty(packet?.next_single_action);
}

function hasResidue(packet){
  const ts=textTokens(packet);
  return nonempty(packet?.residue)||
    nonempty(packet?.RESIDUE)||
    nonempty(packet?.unknowns)||
    nonempty(packet?.conflicts)||
    nonempty(packet?.contradictions)||
    nonempty(packet?.anti_merge_holds)||
    nonempty(packet?.unresolved)||
    stopHasUnresolved(packet)||
    ts.some(x=>/UNKNOWN|INDETERMINATE|UNRESOLVED/.test(x));
}

function normalizePacket(packet={}){
  const out={};
  for(const k of EGRESS_FIELDS){
    const lower=k.toLowerCase();
    out[k]=Object.prototype.hasOwnProperty.call(packet,k)?packet[k]:
      Object.prototype.hasOwnProperty.call(packet,lower)?packet[lower]:null;
  }
  return Object.freeze(out);
}

function returnClass(packet={}){
  const p=normalizePacket(packet),state=token(p.STATE_OUT),stop=text(p.STOP).toUpperCase();
  const evidenceConflict=!!(p.EVIDENCE&&typeof p.EVIDENCE==='object'&&(p.EVIDENCE.conflict===true||p.EVIDENCE.contradiction===true));
  if(evidenceConflict||/CONFLICT|CONTRADICTION/.test(state)||/CONFLICT|CONTRADICTION/.test(stop))return'CONTRADICTION';
  if(nonempty(p.WAITING))return'WAITING';
  if(nonempty(p.RESIDUE)||stopHasUnresolved(packet))return'RESIDUE';
  return'CLOSE';
}

function nextList(packet){
  const v=packet?.NEXT??packet?.next??packet?.one_next??packet?.next_executable??packet?.next_single_action;
  return arr(v).filter(nonempty).slice(0,3);
}

export function reducePacket(packet={},context={}){
  if(!packet||typeof packet!=='object'||Array.isArray(packet))throw new Error('FIELD_EGRESS_PACKET_OBJECT_REQUIRED');
  const packet_id=idOf(packet);
  const refs=sourceRefs(packet);

  // Historical state is a hard non-promotion boundary. Reactivation only makes
  // the packet eligible to be re-evaluated; it does not itself grant NOW.
  if(historical(packet)&&context.reactivated!==true){
    return {packet_id,class:'ARCHIVE',reason:'historical_or_superseded',source_refs:refs};
  }

  // Canonical precedence recovered from packet/RETURN work:
  // GATE → NOW → RESIDUE → NEXT → DELTA → ARCHIVE.
  // STOP dominates continuation. Packet-owned labels/state may never mint NOW.
  if(gated(packet)){
    return {packet_id,class:'GATE',reason:'external_wait_or_conditional_stop',source_refs:refs};
  }

  if(hasResidue(packet)&&hasStop(packet)){
    return {packet_id,class:'RESIDUE',reason:'stop_with_unresolved_fact',source_refs:refs};
  }

  if(hasStop(packet)){
    return {packet_id,class:'ARCHIVE',reason:'stop_closed_without_live_residue',source_refs:refs};
  }

  if(context.now===true||context.selected===true){
    return {packet_id,class:'NOW',reason:'external_current_or_native_selection',source_refs:refs};
  }

  if(hasResidue(packet)){
    return {packet_id,class:'RESIDUE',reason:'unresolved_fact_or_nonexternal_material',source_refs:refs};
  }

  if(hasNext(packet)){
    return {packet_id,class:'NEXT',reason:'explicit_next_without_gate_residue_or_stop',source_refs:refs};
  }

  if(hasDelta(packet)){
    return {packet_id,class:'DELTA',reason:'bounded_change_without_higher_egress',source_refs:refs};
  }

  // Explicit lower-order labels may help legacy packets, but NOW/GATE must be
  // established above from external authority/evidence and can never self-mint.
  const explicit=explicitClass(packet);
  if(explicit&&['RESIDUE','NEXT','DELTA','ARCHIVE'].includes(explicit)){
    return {packet_id,class:explicit,reason:'explicit_non_authoritative_egress',source_refs:refs};
  }

  return {packet_id,class:'ARCHIVE',reason:'no_live_egress',source_refs:refs};
}

export function reducePackets(packets=[],contextFor=()=>({})){
  return arr(packets).map((packet,i)=>reducePacket(packet,contextFor(packet,i)||{}));
}

function humanGateState(v){
  return /HUMAN|ORDINARY_USE|REAL_DEVICE|PRIVATE|PHYSICAL|WAIT|WORLD/.test(token(v));
}

function currentGates(current={}){
  return arr(current.current_heads).flatMap(h=>{
    const n=h&&h.next_executable;
    if(!n||!humanGateState(n.state))return[];
    return [{
      id:n.id||('gate:'+text(h.lineage||h.route||'unknown')),
      route:h.route||null,
      state:n.state||null,
      objective:n.objective||null,
      authority:'CURRENT'
    }];
  });
}

function sourceTimestamp(name,source){
  if(!source||source.__error)return null;
  if(name==='ATLAS')return source.generated||source.updated||null;
  return source.updated||source.generated||null;
}

function compareIdSet(a,b){
  const A=[...new Set(a.map(text).filter(Boolean))].sort(),B=[...new Set(b.map(text).filter(Boolean))].sort();
  return A.length===B.length&&A.every((x,i)=>x===B[i]);
}

function sourceWitness(name,source,{current=null,derivedAt=new Date().toISOString()}={}){
  const sourceAt=sourceTimestamp(name,source),sourceMs=parseTime(sourceAt),currentMs=parseTime(current&&current.updated),derivedMs=parseTime(derivedAt)||Date.now();
  let status='VALID',reason='source parsed';
  if(!source||source.__error){status='CONFLICT';reason='source unreadable';}
  else if(name==='QUEUE'&&current){
    const qids=arr(source.live).map(x=>x&&(x.id||x.front_id)).filter(Boolean);
    const cids=arr(current.active_fronts).map(x=>x&&x.id).filter(Boolean);
    if(!compareIdSet(qids,cids)){status='CONFLICT';reason='QUEUE live ids diverge from CURRENT attention';}
    else if(sourceMs!=null&&currentMs!=null&&sourceMs<currentMs){status='STALE';reason='compatibility projection predates CURRENT';}
  }else if(name==='WAITING'&&current){
    const active=arr(source.items).filter(x=>token(x&&x.surface_state)==='ACTIVE').map(x=>x&&x.id).filter(Boolean);
    const gates=currentGates(current).map(x=>x.id);
    if(active.some(id=>!gates.includes(id))){status='CONFLICT';reason='WAITING ACTIVE item lacks CURRENT gate';}
    else if(sourceMs!=null&&currentMs!=null&&sourceMs<currentMs){status='STALE';reason='registry revision predates CURRENT';}
  }else if(name==='ATLAS'&&current&&sourceMs!=null&&currentMs!=null&&sourceMs<currentMs){
    status='STALE';reason='planning projection predates CURRENT';
  }else if(sourceMs==null){
    status='STALE';reason='no parseable source revision time';
  }
  const ageMs=sourceMs==null?null:Math.max(0,derivedMs-sourceMs);
  return Object.freeze({source:name,head:sourceAt?name+'@'+sourceAt:name+'@?',source_at:sourceAt,derived_at:derivedAt,source_age_ms:ageMs,status,reason});
}

function reduceField({current={},waiting={},queue={},atlas={},repoTouches=[]}={}){
  const now=arr(current.active_fronts).slice(0,3).map(x=>({
    id:x.id||'front',label:x.center||x.objective||x.id||'front',state:x.state||null,authority:'CURRENT'
  }));

  const currentAt=parseTime(current.updated);
  const delta=uniq(arr(repoTouches).filter(c=>{
    if(!c||machineSubject(c.subject))return false;
    const t=parseTime(c.date);
    return currentAt==null||t==null||t>currentAt;
  }),x=>x.sha||x.subject).slice(0,12).map(c=>({
    id:c.sha||c.subject,label:c.subject||'(semantic mutation)',at:c.date||null,authority:'GIT'
  }));

  const gates=currentGates(current);
  const gateIds=new Set(gates.map(x=>x.id));
  for(const x of arr(waiting.items)){
    if(token(x&&x.surface_state)!=='ACTIVE')continue;
    if(gateIds.has(x.id))continue;
    gates.push({id:x.id||'waiting',route:x.route||null,state:x.state||null,objective:x.human_move||x.why||null,authority:'WAITING_UNBACKED'});
  }

  const next=[];
  if(current.next_single_action&&nonempty(current.next_single_action.instruction)){
    next.push({id:current.next_single_action.id||'next-single-action',label:current.next_single_action.instruction,authority:'CURRENT'});
  }
  for(const h of arr(current.current_heads)){
    const n=h&&h.next_executable;
    if(!n||humanGateState(n.state)||!nonempty(n.objective))continue;
    next.push({id:n.id||('next:'+text(h.lineage||h.route)),label:n.objective,route:h.route||null,authority:'CURRENT'});
  }

  const residue=[];
  for(const x of arr(queue.held))residue.push({id:x.id||'queue-held',label:x.reason||x.id||'held',kind:'QUEUE_HELD',authority:'QUEUE'});
  for(const x of arr(waiting.items)){
    const s=token(x&&x.surface_state);
    if(s==='PARKED')residue.push({id:x.id||'waiting-parked',label:x.why||x.human_move||x.id||'parked',kind:'WAITING_PARKED',authority:'WAITING'});
  }
  for(const p of arr(atlas.provinces))for(const x of arr(p&&p.items)){
    if(!/LATER|HOLD/.test(token(x&&x.horizon)))continue;
    residue.push({id:x.id||x.title||'atlas-residue',label:x.title||x.label||x.id||'atlas residue',kind:'ATLAS_'+token(x.horizon),authority:'ATLAS'});
  }

  const archive=arr(waiting.items).filter(x=>token(x&&x.surface_state)==='REMOVED').map(x=>({
    id:x.id||'waiting-history',label:x.removed_reason||x.why||x.id||'removed',kind:'WAITING_HISTORY',authority:'WAITING'
  }));

  return Object.freeze({
    schema:'field-egress-cut/v0.1',
    NOW:Object.freeze(now),
    DELTA:Object.freeze(delta),
    RESIDUE:Object.freeze(uniq(residue,x=>[x.authority,x.kind,x.id].join(':'))),
    GATE:Object.freeze(gates),
    NEXT:Object.freeze(uniq(next,x=>x.id).slice(0,3)),
    ARCHIVE:Object.freeze(archive)
  });
}

function sourceWitnesses({current={},waiting={},queue={},atlas={},derivedAt=new Date().toISOString()}={}){
  return Object.freeze([
    sourceWitness('CURRENT',current,{current,derivedAt}),
    sourceWitness('WAITING',waiting,{current,derivedAt}),
    sourceWitness('QUEUE',queue,{current,derivedAt}),
    sourceWitness('ATLAS',atlas,{current,derivedAt})
  ]);
}

export {
  EGRESS_CLASSES,EGRESS_PRECEDENCE,EGRESS_FIELDS,RETURN_CLASSES,FIELD_BUCKETS,
  normalizePacket,returnClass,humanGateState,currentGates,sourceWitness,sourceWitnesses,reduceField,machineSubject
};
