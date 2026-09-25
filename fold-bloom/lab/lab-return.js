export const LAB_RETURN_SCHEMA='fold-bloom-field-lab-return/v0.1';

const clean=(value,max=180)=>String(value??'').trim().slice(0,max);
const finite=v=>Number.isFinite(Number(v))?Number(v):0;

export function appendLabTrace(trace,entry,max=64){
  const list=Array.isArray(trace)?trace.slice():[];
  const next={
    kind:clean(entry?.kind||'STATE',24),
    mode:clean(entry?.mode,24),
    profile:clean(entry?.profile,24),
    address:clean(entry?.address,180),
    source:clean(entry?.source,180),
    atMs:Math.max(0,Math.round(finite(entry?.atMs)))
  };
  const last=list.at(-1),sig=x=>[x?.kind,x?.mode,x?.profile,x?.address,x?.source].join('|');
  if(!last||sig(last)!==sig(next))list.push(next);
  return list.slice(-Math.max(1,Math.trunc(Number(max)||64)));
}

export function compileLabReturn({
  startedAt,
  endedAt=Date.now(),
  mode='',
  profile='',
  address='',
  source='',
  trace=[],
  projection=null
}={}){
  const end=finite(endedAt)||Date.now(),start=finite(startedAt)||end;
  const route=(Array.isArray(trace)?trace:[]).map(x=>({
    kind:clean(x?.kind||'STATE',24),
    mode:clean(x?.mode,24),
    profile:clean(x?.profile,24),
    address:clean(x?.address,180),
    source:clean(x?.source,180),
    atMs:Math.max(0,Math.round(finite(x?.atMs)))
  }));
  const modes=[...new Set(route.map(x=>x.mode).filter(Boolean))];
  return {
    kind:'FOLD_BLOOM_FIELD_LAB_RETURN',
    schema:LAB_RETURN_SCHEMA,
    created:new Date(end).toISOString(),
    operation:'TRAIN / EXPLORE',
    authority:'EVIDENCE_ONLY',
    session:{started:new Date(start).toISOString(),durationMs:Math.max(0,Math.round(end-start))},
    final:{mode:clean(mode,24),profile:clean(profile,24),address:clean(address,180),source:clean(source,180)},
    route,
    evidence:{modes,modesVisited:modes.length,events:route.length},
    projection:projection&&typeof projection==='object'?projection:null,
    law:'Projection evidence only. Source, reading, poetry, audio, route and domain state remain authoritative in their owning surfaces.'
  };
}
