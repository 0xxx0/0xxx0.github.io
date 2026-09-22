export const SOURCE_BUNDLE_SCHEMA='fold-bloom-source-bundle/v0.1';
const s=(v,n=512)=>String(v??'').slice(0,n);
const n=v=>Number.isFinite(Number(v))?Number(v):null;

export function normalizeSourceBundle(x={}){
  const exact=x.exact||{},origin=x.origin||null,collection=x.collection||null,text=x.text||null,display=x.display||{};
  return {
    schema:SOURCE_BUNDLE_SCHEMA,
    exact:{
      hash:s(exact.hash||x.hash,128),
      name:s(exact.name||x.sourceFileName||x.name,256),
      size:Math.max(0,Math.trunc(n(exact.size??x.size)||0)),
      mediaType:s(exact.mediaType||x.type,96),
      duration:n(exact.duration??x.duration)
    },
    origin:origin?{
      kind:s(origin.kind,48),address:s(origin.address,1024),id:origin.id==null?null:s(origin.id,160),
      resolution:origin.resolution==null?null:s(origin.resolution,96)
    }:null,
    display:{
      title:s(display.title||x.title,256),artist:s(display.artist||x.artist,256),
      album:s(display.album||x.album,256),tags:s(display.tags||x.tags,512)
    },
    text:text?{
      kind:s(text.kind||'TEXT',48),alignment:s(text.alignment||'UNALIGNED',96),
      chars:Math.max(0,Math.trunc(n(text.chars)||0)),cues:Math.max(0,Math.trunc(n(text.cues)||0)),
      language:text.language==null?null:s(text.language,48)
    }:null,
    collection:collection?{
      kind:s(collection.kind||'PLAYLIST',48),name:s(collection.name,256),address:s(collection.address,1024),
      id:collection.id==null?null:s(collection.id,160),count:n(collection.count)
    }:null,
    analysis:{
      bpm:n(x.analysis?.bpm??x.providerBpm),key:x.analysis?.key??x.providerKey??null,
      timeSignature:x.analysis?.timeSignature??x.providerTimeSignature??null,
      stage:s(x.analysis?.stage||'',48)
    },
    metadataSource:s(x.metadataSource||'',160)
  };
}
export function sourceBundleFromMeta(meta={}){
  const textEvidence=Array.isArray(meta.textEvidence)?meta.textEvidence[0]:null,lyrics=String(meta.lyrics||'');
  return normalizeSourceBundle({
    hash:meta.hash,name:meta.sourceFileName||meta.name,size:meta.size,type:meta.type,duration:meta.duration,
    title:meta.title,artist:meta.artist,album:meta.album,tags:meta.tags,
    origin:meta.origin||null,collection:meta.collection||null,
    text:(textEvidence||lyrics)?{
      kind:textEvidence?.kind||(lyrics?'LYRICS':'TEXT'),
      alignment:textEvidence?.alignment||meta.lyricsAlignment||'UNALIGNED',
      chars:textEvidence?.chars??lyrics.length,cues:textEvidence?.cueCount||0,language:meta.lyricsLanguage||null
    }:null,
    providerBpm:meta.providerBpm,providerKey:meta.providerKey,providerTimeSignature:meta.providerTimeSignature,
    metadataSource:meta.metadataSource
  });
}
export function sourceBundleSummary(bundle){
  const b=normalizeSourceBundle(bundle),out=[];
  if(b.exact.hash)out.push('HASH');
  if(b.origin)out.push(b.origin.kind||'ORIGIN');
  if(b.display.title||b.display.artist)out.push('META');
  if(b.text)out.push(b.text.cues?'TIMED TEXT':'TEXT');
  if(b.collection)out.push(b.collection.kind||'COLLECTION');
  return out.length?out.join(' × '):'UNBOUND';
}
