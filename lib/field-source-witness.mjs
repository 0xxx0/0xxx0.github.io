const arr=v=>Array.isArray(v)?v:(v==null?[]:[v]);
const txt=v=>String(v??'').trim();
const tok=v=>txt(v).toUpperCase();
const parseTime=v=>{const n=Date.parse(v||'');return Number.isFinite(n)?n:null};
const humanGate=s=>/HUMAN|ORDINARY_USE|REAL_DEVICE|PRIVATE|PHYSICAL|WAIT|WORLD/.test(tok(s));

function currentGates(current={}){
  return arr(current.current_heads).flatMap(h=>{
    const n=h?.next_executable;
    if(!n||!humanGate(n.state))return[];
    return [{id:n.id||('gate:'+txt(h.lineage||h.route)),route:h.route||null,state:n.state||null}];
  });
}
function sameIds(a,b){
  const A=[...new Set(a.filter(Boolean).map(txt))].sort(),B=[...new Set(b.filter(Boolean).map(txt))].sort();
  return A.length===B.length&&A.every((x,i)=>x===B[i]);
}
function sourceAt(name,source,repoTouches){
  if(name==='GIT')return repoTouches?.[0]?.date||null;
  return source?.updated||source?.generated||null;
}
export function sourceWitness(name,source,{current={},repoTouches=[],derivedAt}={}){
  if(!derivedAt)throw new Error('FIELD_SOURCE_WITNESS_DERIVED_AT_REQUIRED');
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
export function deriveSourceWitnesses({current={},waiting={},queue={},atlas={},repoTouches=[],derivedAt}={}){
  return [
    sourceWitness('CURRENT',current,{current,repoTouches,derivedAt}),
    sourceWitness('WAITING',waiting,{current,repoTouches,derivedAt}),
    sourceWitness('QUEUE',queue,{current,repoTouches,derivedAt}),
    sourceWitness('ATLAS',atlas,{current,repoTouches,derivedAt}),
    sourceWitness('GIT',null,{current,repoTouches,derivedAt})
  ];
}
export {currentGates};
