(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.FieldPacketReducer=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const PRECEDENCE=Object.freeze(['GATE','NOW','RESIDUE','NEXT','DELTA','ARCHIVE']);
  const DISPLAY_ORDER=Object.freeze(['NOW','DELTA','RESIDUE','GATE','NEXT','ARCHIVE']);
  const LIMITS=Object.freeze({NOW:2,NEXT:3});

  const own=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
  function pick(o,keys){
    for(const k of keys)if(own(o,k)&&o[k]!==undefined&&o[k]!==null)return o[k];
    return null;
  }
  function flatten(v){
    if(v===undefined||v===null)return'';
    if(Array.isArray(v))return v.map(flatten).filter(Boolean).join(' · ');
    if(typeof v==='object')return Object.entries(v).map(([k,x])=>k+': '+flatten(x)).filter(x=>!/: $/.test(x)).join(' · ');
    return String(v).replace(/[ \t\r\n]+/g,' ').trim();
  }
  function meaningful(v){
    const s=flatten(v).trim();
    if(!s)return false;
    return !/^(?:NONE|CLEAR|N\/A|NA|NO|NULL|UNSET|—|-)$/i.test(s);
  }
  function normalizePacket(packet){
    const p=packet&&typeof packet==='object'&&!Array.isArray(packet)?packet:{};
    return Object.freeze({
      OBJECT:pick(p,['OBJECT','object','object_ref','target','route','id']),
      AUTHORITY:pick(p,['AUTHORITY','authority','authority_used','owner']),
      STATE_IN:pick(p,['STATE_IN','state_in','before','current_state','state_before']),
      DELTA:pick(p,['DELTA','delta','host_delta','changes','actual_delta','delta_or_question']),
      EVIDENCE:pick(p,['EVIDENCE','evidence','verification','verify','proof_available','evidence_tests']),
      STATE_OUT:pick(p,['STATE_OUT','state_out','after','actual_after','result','state_after','state','status']),
      RESIDUE:pick(p,['RESIDUE','residue','unresolved','open_residue']),
      WAITING:pick(p,['WAITING','waiting','waiting_on','gate','blocked_by']),
      NEXT:pick(p,['NEXT','next','one_next','next_state','reentry']),
      STOP:pick(p,['STOP','stop','stop_condition','stop_conditions'])
    });
  }
  function tokenText(...xs){return flatten(xs).toUpperCase()}
  function gateReason(n){
    if(meaningful(n.WAITING))return'WAITING';
    const s=tokenText(n.STOP);
    if(/\b(?:WAIT|WAITING|BLOCK|BLOCKED|GATE|HUMAN|WORLD|DEVICE|PHYSICAL|PRIVATE|MISSING|AUTHORITY|EXTERNAL|UNKNOWN)\b/.test(s))return'STOP_GATE';
    return null;
  }
  function isNow(packet,n){
    if(packet?.now===true||packet?.active_now===true)return true;
    const s=tokenText(n.STATE_IN,n.STATE_OUT,packet?.horizon,packet?.state,packet?.status);
    return /\b(?:ACTIVE_NOW|IN_PROGRESS|EXECUTING|RUNNING|NOW)\b/.test(s);
  }
  function nextItems(v){return Array.isArray(v)?v:[v]}
  function inertNext(v){
    const s=flatten(v).toUpperCase();
    if(!s)return true;
    return /^(?:RETURN(?: TO)? (?:CURRENT|FIELD).*REPLAN|REPLAN(?:\.|$)|NONE|NO NEXT|STOP|PARK(?:ED)?|ARCHIVE)$/i.test(s)
      || /NO AUTOMATIC SEQUEL/.test(s)
      || /DO NOT RESURRECT/.test(s);
  }
  function actionableNext(v){
    if(!meaningful(v))return false;
    return nextItems(v).some(x=>meaningful(x)&&!inertNext(x));
  }
  function reducePacket(packet){
    const source=packet&&typeof packet==='object'&&!Array.isArray(packet)?packet:{};
    const normalized=normalizePacket(source);
    let disposition='ARCHIVE',reason='NO_ACTIONABLE_EGRESS';
    const gate=gateReason(normalized);
    if(gate){disposition='GATE';reason=gate}
    else if(isNow(source,normalized)){disposition='NOW';reason='EXPLICIT_ACTIVE_STATE'}
    else if(meaningful(normalized.RESIDUE)){disposition='RESIDUE';reason='UNRESOLVED_RESIDUE'}
    else if(meaningful(normalized.DELTA)&&!meaningful(normalized.EVIDENCE)){disposition='RESIDUE';reason='DELTA_WITHOUT_EVIDENCE'}
    else if(actionableNext(normalized.NEXT)){disposition='NEXT';reason='EXPLICIT_CANDIDATE_NEXT'}
    else if(meaningful(normalized.DELTA)&&meaningful(normalized.EVIDENCE)){disposition='DELTA';reason='PROVED_DELTA'}
    return Object.freeze({
      schema:'field-packet-disposition/v0.1',
      disposition,
      reason,
      normalized,
      source_schema:source.schema||null,
      source_id:source.id||null
    });
  }
  function aggregatePackets(packets){
    const reduced=(Array.isArray(packets)?packets:[]).map(reducePacket);
    const buckets=Object.fromEntries(PRECEDENCE.map(k=>[k,[]]));
    reduced.forEach(r=>buckets[r.disposition].push(r));
    const visible={...buckets,NOW:buckets.NOW.slice(0,LIMITS.NOW),NEXT:buckets.NEXT.slice(0,LIMITS.NEXT)};
    const overflow={NOW:buckets.NOW.slice(LIMITS.NOW),NEXT:buckets.NEXT.slice(LIMITS.NEXT)};
    return Object.freeze({schema:'field-packet-reducer/v0.1',precedence:PRECEDENCE,display_order:DISPLAY_ORDER,limits:LIMITS,reduced,buckets,visible,overflow});
  }
  return Object.freeze({VERSION:'0.1.0',PRECEDENCE,DISPLAY_ORDER,LIMITS,flatten,meaningful,normalizePacket,actionableNext,reducePacket,aggregatePackets});
});
