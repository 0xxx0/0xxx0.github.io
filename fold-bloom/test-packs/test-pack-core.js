export const LOCAL_TEST_PACK_SCHEMA='fold-bloom-local-test-packs/v0.1';

const clean=v=>String(v??'').trim();

export function normalizeSourceId(value){
  const raw=clean(value).toLowerCase();
  if(!raw)return'';
  return raw.startsWith('sha256:')?raw:'sha256:'+raw;
}

export function validateLocalTestPackCatalog(catalog){
  if(!catalog||catalog.schema!==LOCAL_TEST_PACK_SCHEMA)throw new TypeError('invalid local test pack schema');
  if(!Array.isArray(catalog.packs))throw new TypeError('catalog.packs must be an array');
  const packIds=new Set();
  for(const pack of catalog.packs){
    if(!clean(pack.id)||packIds.has(pack.id))throw new TypeError('pack id missing or duplicated');
    packIds.add(pack.id);
    if(!Array.isArray(pack.entries)||!pack.entries.length)throw new TypeError('pack entries required');
    const seen=new Set();
    for(const entry of pack.entries){
      const id=normalizeSourceId(entry.sourceId);
      if(!/^sha256:[0-9a-f]{64}$/.test(id))throw new TypeError('pack sourceId must be exact sha256');
      if(seen.has(id))throw new TypeError('duplicate source in pack '+pack.id);
      seen.add(id);
      if(!clean(entry.title))throw new TypeError('pack entry title required');
      if(!Number.isFinite(Number(entry.durationSeconds))||Number(entry.durationSeconds)<=0)throw new TypeError('durationSeconds required');
      if(!['CUT','DISSOLVE','CARRY','RESET','RETURN'].includes(entry.transitionOut))throw new TypeError('invalid transitionOut');
    }
    if(pack.entries.at(-1).transitionOut!=='RETURN')throw new TypeError('pack must close with RETURN');
  }
  return catalog;
}

export function catalogSourceIndex(catalog){
  validateLocalTestPackCatalog(catalog);
  const index=new Map();
  for(const pack of catalog.packs){
    pack.entries.forEach((entry,position)=>{
      const id=normalizeSourceId(entry.sourceId),item={...entry,sourceId:id,packId:pack.id,packTitle:pack.title,packKind:pack.kind,position};
      const current=index.get(id)||[];current.push(item);index.set(id,current);
    });
  }
  return index;
}

export function sourceDescriptors(catalog,sourceId){
  return catalogSourceIndex(catalog).get(normalizeSourceId(sourceId))||[];
}

export function packProgress(catalog,sourceIds=[]){
  validateLocalTestPackCatalog(catalog);
  const ids=new Set(sourceIds.map(normalizeSourceId).filter(Boolean));
  return catalog.packs.map(pack=>{
    const expected=pack.entries.map(entry=>normalizeSourceId(entry.sourceId));
    const matched=expected.filter(id=>ids.has(id));
    const missing=expected.filter(id=>!ids.has(id));
    return {
      id:pack.id,title:pack.title,kind:pack.kind,default:!!pack.default,
      matched:matched.length,total:expected.length,complete:missing.length===0,
      ratio:matched.length/expected.length,missing
    };
  }).sort((a,b)=>Number(b.complete)-Number(a.complete)||b.ratio-a.ratio||Number(b.default)-Number(a.default)||a.id.localeCompare(b.id));
}

export function bestPackProgress(catalog,sourceIds=[]){
  return packProgress(catalog,sourceIds)[0]||null;
}

export function buildPackPlan(catalog,packId,sourceIds=[]){
  validateLocalTestPackCatalog(catalog);
  const pack=catalog.packs.find(x=>x.id===packId);
  if(!pack)throw new TypeError('unknown pack '+packId);
  const present=sourceIds.map(normalizeSourceId).filter(Boolean),presentSet=new Set(present);
  const orderedPackIds=pack.entries.map(entry=>normalizeSourceId(entry.sourceId));
  const missing=orderedPackIds.filter(id=>!presentSet.has(id));
  const extras=present.filter(id=>!orderedPackIds.includes(id));
  return {
    pack,
    complete:missing.length===0,
    missing,
    orderedSourceIds:[...orderedPackIds.filter(id=>presentSet.has(id)),...extras],
    entries:pack.entries.map(entry=>({...entry,sourceId:normalizeSourceId(entry.sourceId)})),
    title:pack.title
  };
}
