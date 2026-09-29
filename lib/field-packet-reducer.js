(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.FieldPacketReducer=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='field-packet-reducer/v0.1';
  const BUCKETS=Object.freeze(['NOW','DELTA','RESIDUE','GATE','NEXT','ARCHIVE']);
  const RETURN_DISPOSITIONS=Object.freeze(['CLOSE','RESIDUE','WAITING','CONTRADICTION','TRIGGER']);
  const isObj=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
  const nonempty=x=>{
    if(x==null||x===false)return false;
    if(Array.isArray(x))return x.length>0;
    if(typeof x==='string')return x.trim().length>0;
    if(isObj(x))return Object.keys(x).length>0;
    return !!x;
  };
  const upper=x=>String(x||'').trim().toUpperCase();
  const evidenceOf=p=>Array.isArray(p?.evidence)?p.evidence.filter(nonempty):nonempty(p?.evidence)?[p.evidence]:[];
  const nextOf=p=>Array.isArray(p?.next)?p.next.filter(nonempty):[];
  const returnDisposition=p=>upper(p?.return?.disposition||p?.return_disposition);

  function explicitCurrentAuthority(p){
    if(p?.authority?.current===true)return true;
    const a=upper(isObj(p?.authority)?p.authority.state||p.authority.mode:p?.authority);
    const s=upper(p?.state_out?.attention||p?.state_out?.state||p?.state_out);
    return ['CURRENT','CURRENT_AUTHORITY','ACTIVE_NOW','NOW'].includes(a)||['CURRENT','ACTIVE_NOW','NOW'].includes(s);
  }
  function materialDelta(p){
    if(!nonempty(p?.delta))return false;
    if(isObj(p.delta)&&p.delta.material===false)return false;
    return true;
  }
  function validate(packet){
    const errors=[];
    if(!isObj(packet))return{ok:false,errors:['PACKET_NOT_OBJECT']};
    if(!nonempty(packet.object))errors.push('OBJECT_REQUIRED');
    if(!nonempty(packet.authority))errors.push('AUTHORITY_REQUIRED');
    const n=nextOf(packet);
    if(n.length>3)errors.push('NEXT_EXCEEDS_3');
    const rd=returnDisposition(packet);
    if(rd&&!RETURN_DISPOSITIONS.includes(rd))errors.push('UNKNOWN_RETURN_DISPOSITION');
    return{ok:errors.length===0,errors};
  }
  function inspect(packet){
    const v=validate(packet),rd=returnDisposition(packet),ev=evidenceOf(packet),next=nextOf(packet);
    const contradiction=rd==='CONTRADICTION'||packet?.contradiction===true;
    const close=rd==='CLOSE'||packet?.stop===true||upper(packet?.state_out?.state)==='CLOSED';
    const gate=rd==='WAITING'||nonempty(packet?.waiting);
    const residue=rd==='RESIDUE'||nonempty(packet?.residue)||contradiction;
    const now=explicitCurrentAuthority(packet);
    const delta=materialDelta(packet);
    const deltaUnproved=delta&&ev.length===0;
    const nextOverflow=next.length>3;
    return{
      valid:v.ok,errors:v.errors,return_disposition:rd||null,contradiction,close,gate,residue,now,delta,
      delta_proved:delta&&!deltaUnproved,delta_unproved:deltaUnproved,next_count:next.length,
      next_overflow:nextOverflow,next_valid:next.length>0&&!nextOverflow,evidence_count:ev.length
    };
  }
  function reduce(packet){
    const x=inspect(packet);
    let bucket='ARCHIVE',reason='NO_LIVE_CONDITION',control_effect='NONE';
    if(!x.valid){bucket='ARCHIVE';reason='INVALID_PACKET_QUARANTINED'}
    else if(x.contradiction){bucket='RESIDUE';reason='RETURN_CONTRADICTION';control_effect='REVIEW_REQUIRED'}
    else if(x.close){bucket='ARCHIVE';reason='RETURN_CLOSE'}
    else if(x.gate){bucket='GATE';reason='EXTERNAL_PREREQUISITE';control_effect='PARK_UNTIL_TRIGGER'}
    else if(x.residue){bucket='RESIDUE';reason='UNRESOLVED_RETURNED_WORK';control_effect='REPLAN_REQUIRED'}
    else if(x.now){bucket='NOW';reason='EXPLICIT_CURRENT_AUTHORITY';control_effect='ATTENTION'}
    else if(x.delta_unproved){bucket='RESIDUE';reason='MATERIAL_DELTA_WITHOUT_EVIDENCE';control_effect='PROVE_OR_RETRACT'}
    else if(x.delta_proved){bucket='DELTA';reason='EVIDENCED_MATERIAL_CHANGE';control_effect='SURFACE_CHANGE'}
    else if(x.next_overflow){bucket='RESIDUE';reason='NEXT_EXCEEDS_3';control_effect='CONTRACT_NEXT'}
    else if(x.next_valid){bucket='NEXT';reason=x.return_disposition==='TRIGGER'?'RETURN_TRIGGER':'LAWFUL_CANDIDATE_MOVES';control_effect='OFFER_ONLY'}
    return{schema:'field-packet-reduction/v0.1',reducer:VERSION,id:packet?.id||null,bucket,reason,control_effect,attention:bucket!=='ARCHIVE',inspection:x};
  }
  function project(packets){
    const xs=(Array.isArray(packets)?packets:[]).map((packet,index)=>({packet,index,reduction:reduce(packet)}));
    const buckets=Object.fromEntries(BUCKETS.map(k=>[k,[]]));
    xs.forEach(x=>buckets[x.reduction.bucket].push(x));
    return{
      schema:'field-packet-projection/v0.1',reducer:VERSION,
      counts:Object.fromEntries(BUCKETS.map(k=>[k,buckets[k].length])),
      buckets,attention:xs.filter(x=>x.reduction.attention),archived:buckets.ARCHIVE
    };
  }
  return Object.freeze({VERSION,BUCKETS,RETURN_DISPOSITIONS,validate,inspect,reduce,project});
});
