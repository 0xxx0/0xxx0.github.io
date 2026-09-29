import {reducePacket,EGRESS_CLASSES} from './field-egress-reducer.mjs';

const arr=v=>Array.isArray(v)?v:(v==null?[]:[v]);
const txt=v=>String(v??'').trim();
const tok=v=>txt(v).toUpperCase();
const parseTime=v=>{const n=Date.parse(v||'');return Number.isFinite(n)?n:null};
const humanGate=s=>/HUMAN|ORDINARY_USE|REAL_DEVICE|PRIVATE|PHYSICAL|WAIT|WORLD/.test(tok(s));
const machine=s=>/^(?:nexus|comms):/i.test(txt(s));

function currentGates(current={}){
  return arr(current.current_heads).flatMap(h=>{
    const n=h?.next_executable;
    if(!n||!humanGate(n.state))return[];
    return [{id:n.id||('gate:'+txt(h.lineage||h.route)),route:h.route||null,state:n.state||null,label:n.objective||n.id||'world gate'}];
  });
}
function sourceAt(name,source,repoTouches){
  if(name==='GIT')return repoTouches?.[0]?.date||null;
  return source?.updated||source?.generated||null;
}
function sameIds(a,b){
  const A=[...new Set(a.filter(Boolean).map(txt))].sort(),B=[...new Set(b.filter(Boolean).map(txt))].sort();
  return A.length===B.length&&A.every((x,i)=>x===B[i]);
}
function witness(name,source,{current={},repoTouches=[],derivedAt}={}){
  const at=sourceAt(name,source,repoTouches),ms=parseTime(at),cur=parseTime(current.updated),now=parseTime(derivedAt);
  let status='VALID',reason='source revision parsed',head=name+'@'+(at||'?');
  if(name==='GIT'){
    const h=repoTouches?.[0];
    head=h?.sha?('GIT@'+h.sha.slice(0,12)):'GIT@?';
    if(!h){status='STALE';reason='chronology unavailable or still loading';}
    else if(h.cached){status='STALE';reason='cached chronology; live API unavailable';}
    else reason='live master chronology';
  }else if(!source||source.__error){
    status='CONFLICT';reason='source unreadable';
  }else if(name==='QUEUE'){
    const q=arr(source.live).map(x=>x?.id||x?.front_id);
    const c=arr(current.active_fronts).map(x=>x?.id);
    if(!sameIds(q,c)){status='CONFLICT';reason='QUEUE live ids diverge from CURRENT attention';}
    else if(ms!=null&&cur!=null&&ms<cur){status='STALE';reason='compatibility projection predates CURRENT';}
  }else if(name==='WAITING'){
    const registry=arr(source.items).filter(x=>tok(x?.surface_state)==='ACTIVE').map(x=>x?.id);
    const gates=currentGates(current).map(x=>x.id);
    if(registry.some(id=>!gates.includes(id))){status='CONFLICT';reason='WAITING ACTIVE item lacks CURRENT gate';}
    else if(ms!=null&&cur!=null&&ms<cur){status='STALE';reason='registry revision predates CURRENT';}
  }else if(name==='ATLAS'&&ms!=null&&cur!=null&&ms<cur){
    status='STALE';reason='planning projection predates CURRENT';
  }else if(ms==null){
    status='STALE';reason='no parseable source revision time';
  }
  return {
    source:name,head,source_at:at,derived_at:derivedAt,
    source_age_ms:ms==null||now==null?null:Math.max(0,now-ms),status,reason
  };
}
function addBucket(buckets,packet,context,meta={}){
  const r=reducePacket(packet,context);
  buckets[r.class].push({...r,...meta});
}
export function deriveFieldSourceCut({current={},waiting={},queue={},atlas={},repoTouches=[],derivedAt}={}){
  if(!derivedAt)throw new Error('FIELD_SOURCE_CUT_DERIVED_AT_REQUIRED');
  const buckets=Object.fromEntries(EGRESS_CLASSES.map(k=>[k,[]]));

  for(const f of arr(current.active_fronts).slice(0,3)){
    addBucket(buckets,{packet_id:'current:'+txt(f?.id),state:f?.state||'ACTIVE_NOW'}, {now:true},
      {id:f?.id||'front',label:f?.center||f?.objective||f?.id||'current front',authority:'CURRENT'});
  }

  const curMs=parseTime(current.updated);
  for(const c of arr(repoTouches)){
    if(!c||machine(c.subject))continue;
    const t=parseTime(c.date);
    if(curMs!=null&&t!=null&&t<=curMs)continue;
    addBucket(buckets,{packet_id:'git:'+txt(c.sha),delta:c.subject||'semantic mutation',evidence:[c.url].filter(Boolean)}, {},
      {id:c.sha||c.subject,label:c.subject||'semantic mutation',at:c.date||null,authority:'GIT'});
  }

  const gateIds=new Set();
  for(const g of currentGates(current)){
    gateIds.add(g.id);
    addBucket(buckets,{packet_id:'current-gate:'+g.id,state:g.state,waiting:g.label}, {},
      {...g,authority:'CURRENT'});
  }
  for(const x of arr(waiting.items)){
    const s=tok(x?.surface_state);
    if(s==='ACTIVE'&&!gateIds.has(x?.id)){
      addBucket(buckets,{packet_id:'waiting:'+txt(x?.id),state:x?.state||'WAITING_EXTERNAL',waiting:x?.why||x?.human_move||'unbacked active dependency'}, {},
        {id:x?.id||'waiting',label:x?.why||x?.human_move||x?.id||'active dependency',route:x?.route||null,authority:'WAITING_UNBACKED'});
    }
    if(s==='PARKED'){
      addBucket(buckets,{packet_id:'waiting:'+txt(x?.id),residue:x?.why||x?.human_move||x?.id||'parked'}, {},
        {id:x?.id||'waiting',label:x?.why||x?.human_move||x?.id||'parked',authority:'WAITING'});
    }
    if(s==='REMOVED'){
      addBucket(buckets,{packet_id:'waiting:'+txt(x?.id),disposition:'HISTORICAL',residue:x?.removed_reason||x?.id}, {},
        {id:x?.id||'history',label:x?.removed_reason||x?.why||x?.id||'removed',authority:'WAITING'});
    }
  }

  for(const x of arr(queue.held)){
    addBucket(buckets,{packet_id:'queue-held:'+txt(x?.id),residue:x?.reason||x?.id||'held'}, {},
      {id:x?.id||'held',label:x?.reason||x?.id||'held',authority:'QUEUE'});
  }
  for(const p of arr(atlas.provinces))for(const x of arr(p?.items)){
    if(!/LATER|HOLD/.test(tok(x?.horizon)))continue;
    addBucket(buckets,{packet_id:'atlas:'+txt(x?.id||x?.title),residue:x?.title||x?.label||x?.id||'latent planning item'}, {},
      {id:x?.id||x?.title||'atlas',label:x?.title||x?.label||x?.id||'latent planning item',authority:'ATLAS'});
  }

  const next=[];
  if(current.next_single_action?.instruction)next.push({
    packet:{packet_id:'current-next:'+txt(current.next_single_action.id),one_next:current.next_single_action.instruction},
    meta:{id:current.next_single_action.id||'next',label:current.next_single_action.instruction,authority:'CURRENT'}
  });
  for(const h of arr(current.current_heads)){
    const n=h?.next_executable;
    if(!n||humanGate(n.state)||!n.objective)continue;
    next.push({packet:{packet_id:'head-next:'+txt(n.id),one_next:n.objective},
      meta:{id:n.id||('next:'+txt(h.lineage)),label:n.objective,route:h.route||null,authority:'CURRENT'}});
  }
  for(const n of next.slice(0,3))addBucket(buckets,n.packet,{},n.meta);

  const witnesses=[
    witness('CURRENT',current,{current,repoTouches,derivedAt}),
    witness('WAITING',waiting,{current,repoTouches,derivedAt}),
    witness('QUEUE',queue,{current,repoTouches,derivedAt}),
    witness('ATLAS',atlas,{current,repoTouches,derivedAt}),
    witness('GIT',null,{current,repoTouches,derivedAt})
  ];
  return {schema:'field-source-cut/v0.1',derived_at:derivedAt,witnesses,buckets};
}
export {currentGates,witness as sourceWitness};
