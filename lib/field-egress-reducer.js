(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.FieldEgressReducer=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const VERSION='field-egress-reducer/v0.1';
  const EGRESS_FIELDS=Object.freeze(['OBJECT','AUTHORITY','STATE_IN','DELTA','EVIDENCE','STATE_OUT','RESIDUE','WAITING','NEXT','STOP']);
  const RETURN_CLASSES=Object.freeze(['CLOSE','RESIDUE','WAITING','CONTRADICTION']);
  const FIELD_BUCKETS=Object.freeze(['NOW','DELTA','RESIDUE','GATE','NEXT','ARCHIVE']);

  const text=v=>String(v==null?'':v).trim();
  const nonEmpty=v=>{
    if(v==null)return false;
    if(typeof v==='string')return !!v.trim();
    if(Array.isArray(v))return v.some(nonEmpty);
    if(typeof v==='object')return Object.keys(v).length>0;
    return true;
  };
  const list=v=>v==null?[]:(Array.isArray(v)?v:[v]);
  const uniq=(xs,key=x=>JSON.stringify(x))=>{
    const seen=new Set();
    return xs.filter(x=>{const k=key(x);if(seen.has(k))return false;seen.add(k);return true});
  };
  const parseTime=v=>{
    const n=Date.parse(v||'');
    return Number.isFinite(n)?n:null;
  };
  const machineSubject=s=>/^(?:comms|nexus):\s.*refresh\b/i.test(text(s));

  function normalizePacket(packet={}){
    const out={};
    for(const k of EGRESS_FIELDS)out[k]=Object.prototype.hasOwnProperty.call(packet,k)?packet[k]:null;
    return Object.freeze(out);
  }

  function returnClass(packet={}){
    const p=normalizePacket(packet),state=text(p.STATE_OUT).toUpperCase(),stop=text(p.STOP).toUpperCase();
    const evidenceConflict=!!(p.EVIDENCE&&typeof p.EVIDENCE==='object'&&(p.EVIDENCE.conflict===true||p.EVIDENCE.contradiction===true));
    if(evidenceConflict||/CONFLICT|CONTRADICTION/.test(state)||/CONFLICT|CONTRADICTION/.test(stop))return'CONTRADICTION';
    if(nonEmpty(p.WAITING))return'WAITING';
    if(nonEmpty(p.RESIDUE))return'RESIDUE';
    return'CLOSE';
  }

  function nextList(v){
    return list(v).filter(nonEmpty).slice(0,3);
  }

  function reducePacket(packet={},context={}){
    const p=normalizePacket(packet),rc=returnClass(p);
    const buckets={
      NOW:context.current===true,
      DELTA:nonEmpty(p.DELTA),
      RESIDUE:nonEmpty(p.RESIDUE)||rc==='RESIDUE',
      GATE:nonEmpty(p.WAITING)||rc==='WAITING'||rc==='CONTRADICTION',
      NEXT:nextList(p.NEXT),
      ARCHIVE:false
    };
    const closed=/CLOSE|CLOSED|DONE|SUPERSEDED|ARCHIVE|ARCHIVED|STOP/.test(text(p.STOP).toUpperCase());
    buckets.ARCHIVE=!buckets.NOW&&!buckets.DELTA&&!buckets.GATE&&!buckets.NEXT.length&&(closed||rc==='CLOSE');
    const primary=buckets.GATE?'GATE':buckets.NOW?'NOW':buckets.DELTA?'DELTA':buckets.NEXT.length?'NEXT':buckets.RESIDUE?'RESIDUE':'ARCHIVE';
    return Object.freeze({schema:VERSION,packet:p,return_class:rc,primary,buckets:Object.freeze(buckets)});
  }

  function humanGateState(v){
    return /HUMAN|ORDINARY_USE|REAL_DEVICE|PRIVATE|PHYSICAL|WAIT|WORLD/.test(text(v).toUpperCase());
  }

  function currentGates(current={}){
    return list(current.current_heads).flatMap(h=>{
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
      const qids=list(source.live).map(x=>x&&(x.id||x.front_id)).filter(Boolean);
      const cids=list(current.active_fronts).map(x=>x&&x.id).filter(Boolean);
      if(!compareIdSet(qids,cids)){status='CONFLICT';reason='QUEUE live ids diverge from CURRENT attention';}
      else if(sourceMs!=null&&currentMs!=null&&sourceMs<currentMs){status='STALE';reason='compatibility projection predates CURRENT';}
    }else if(name==='WAITING'&&current){
      const active=list(source.items).filter(x=>text(x&&x.surface_state).toUpperCase()==='ACTIVE').map(x=>x&&x.id).filter(Boolean);
      const gates=currentGates(current).map(x=>x.id);
      if(active.some(id=>!gates.includes(id))){status='CONFLICT';reason='WAITING ACTIVE item lacks CURRENT gate';}
      else if(sourceMs!=null&&currentMs!=null&&sourceMs<currentMs){status='STALE';reason='registry revision predates CURRENT';}
    }else if(name==='ATLAS'&&current&&sourceMs!=null&&currentMs!=null&&sourceMs<currentMs){
      status='STALE';reason='planning projection predates CURRENT';
    }else if(sourceMs==null){
      status='STALE';reason='no parseable source revision time';
    }
    const ageMs=sourceMs==null?null:Math.max(0,derivedMs-sourceMs);
    return Object.freeze({
      source:name,
      head:sourceAt?name+'@'+sourceAt:name+'@?',
      source_at:sourceAt,
      derived_at:derivedAt,
      source_age_ms:ageMs,
      status,
      reason
    });
  }

  function reduceField({current={},waiting={},queue={},atlas={},repoTouches=[]}={}){
    const now=list(current.active_fronts).slice(0,3).map(x=>({
      id:x.id||'front',label:x.center||x.objective||x.id||'front',state:x.state||null,authority:'CURRENT'
    }));

    const currentAt=parseTime(current.updated);
    const delta=uniq(list(repoTouches).filter(c=>{
      if(!c||machineSubject(c.subject))return false;
      const t=parseTime(c.date);
      return currentAt==null||t==null||t>currentAt;
    }),x=>x.sha||x.subject).slice(0,12).map(c=>({
      id:c.sha||c.subject,label:c.subject||'(semantic mutation)',at:c.date||null,authority:'GIT'
    }));

    const gates=currentGates(current);
    const gateIds=new Set(gates.map(x=>x.id));
    for(const x of list(waiting.items)){
      if(text(x&&x.surface_state).toUpperCase()!=='ACTIVE')continue;
      if(gateIds.has(x.id))continue;
      gates.push({id:x.id||'waiting',route:x.route||null,state:x.state||null,objective:x.human_move||x.why||null,authority:'WAITING_UNBACKED'});
    }

    const next=[];
    if(current.next_single_action&&nonEmpty(current.next_single_action.instruction)){
      next.push({id:current.next_single_action.id||'next-single-action',label:current.next_single_action.instruction,authority:'CURRENT'});
    }
    for(const h of list(current.current_heads)){
      const n=h&&h.next_executable;
      if(!n||humanGateState(n.state)||!nonEmpty(n.objective))continue;
      next.push({id:n.id||('next:'+text(h.lineage||h.route)),label:n.objective,route:h.route||null,authority:'CURRENT'});
    }

    const residue=[];
    for(const x of list(queue.held))residue.push({id:x.id||'queue-held',label:x.reason||x.id||'held',kind:'QUEUE_HELD',authority:'QUEUE'});
    for(const x of list(waiting.items)){
      const s=text(x&&x.surface_state).toUpperCase();
      if(s==='PARKED')residue.push({id:x.id||'waiting-parked',label:x.why||x.human_move||x.id||'parked',kind:'WAITING_PARKED',authority:'WAITING'});
    }
    for(const p of list(atlas.provinces))for(const x of list(p&&p.items)){
      if(!/LATER|HOLD/.test(text(x&&x.horizon).toUpperCase()))continue;
      residue.push({id:x.id||x.title||'atlas-residue',label:x.title||x.label||x.id||'atlas residue',kind:'ATLAS_'+text(x.horizon).toUpperCase(),authority:'ATLAS'});
    }

    const archive=list(waiting.items).filter(x=>text(x&&x.surface_state).toUpperCase()==='REMOVED').map(x=>({
      id:x.id||'waiting-history',label:x.removed_reason||x.why||x.id||'removed',kind:'WAITING_HISTORY',authority:'WAITING'
    }));

    return Object.freeze({
      schema:VERSION,
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

  return Object.freeze({
    VERSION,EGRESS_FIELDS,RETURN_CLASSES,FIELD_BUCKETS,
    normalizePacket,returnClass,reducePacket,humanGateState,currentGates,
    sourceWitness,sourceWitnesses,reduceField,machineSubject
  });
});
