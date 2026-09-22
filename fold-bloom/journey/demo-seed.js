import {validateLocalTestPackCatalog,normalizeSourceId} from '../test-packs/test-pack-core.js';

export const SHAREABLE_SEED_PACK_ID='work-trance-seed-2026-09-22';
export const SHAREABLE_SEED_DEMO_SCHEMA='fold-bloom-shareable-seed-demo/v0.1';

const ROLE_KEYS=Object.freeze(['GHOST','FORGE','WILL']);

export function buildShareableSeedDemo(catalog,{timestamp='2026-09-22T00:00:00.000Z'}={}){
  validateLocalTestPackCatalog(catalog);
  const pack=catalog.packs.find(x=>x.id===SHAREABLE_SEED_PACK_ID);
  if(!pack)throw new TypeError('shareable seed pack missing');
  if(pack.entries.length!==3)throw new TypeError('shareable seed demo expects exactly three entries');

  const entries=pack.entries.map((entry,index)=>{
    const out={
      id:'seed:'+String(index+1).padStart(2,'0'),
      sourceId:normalizeSourceId(entry.sourceId),
      weight:Number(entry.weight)||1,
      transitionOut:entry.transitionOut,
      landmarkIds:[]
    };
    if(index>0)out.transitionIn=pack.entries[index-1].transitionOut;
    return out;
  });

  const set={
    schema:'fold-bloom-experience-set/v0.1',
    id:'set:work-trance-seed-demo',
    title:pack.title,
    entries,
    note:'Exact recovered three-track seed identity. Demo witness contains metadata only; raw audio bytes remain private/local.',
    createdAt:timestamp,
    updatedAt:timestamp
  };

  const meta={};
  const bindings=pack.entries.map((entry,index)=>{
    const sourceId=normalizeSourceId(entry.sourceId);
    meta[sourceId]={
      name:entry.title,
      title:entry.title,
      artist:entry.artist||'',
      roleKey:ROLE_KEYS[index],
      role:`${ROLE_KEYS[index]} · ${entry.role}`,
      durationSeconds:Number(entry.durationSeconds),
      origin:entry.origin||null,
      packId:pack.id
    };
    return {
      sourceId,
      duration:Number(entry.durationSeconds),
      label:entry.title,
      available:true
    };
  });

  return {
    schema:SHAREABLE_SEED_DEMO_SCHEMA,
    packId:pack.id,
    set,
    meta,
    bindings,
    mediaBytesIncluded:false,
    audioAuthority:'PRIVATE_LOCAL_ONLY'
  };
}
