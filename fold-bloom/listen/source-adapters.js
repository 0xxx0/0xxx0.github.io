const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_REMOTE_BYTES=96*1024*1024;
export function parseSunoId(input=''){
  const raw=String(input||'').trim();
  if(UUID_RE.test(raw))return raw.toLowerCase();
  try{
    const u=new URL(raw);
    if(!/(^|\.)suno\.com$/i.test(u.hostname))return null;
    const parts=u.pathname.split('/').filter(Boolean);
    const ix=parts.findIndex(x=>x.toLowerCase()==='song');
    const id=ix>=0?parts[ix+1]:parts.find(x=>UUID_RE.test(x));
    return id&&UUID_RE.test(id)?id.toLowerCase():null;
  }catch(_){return null}
}
export function parseSunoPlaylistId(input=''){
  const raw=String(input||'').trim();
  try{
    const u=new URL(raw);if(!/(^|\.)suno\.com$/i.test(u.hostname))return null;
    const parts=u.pathname.split('/').filter(Boolean),ix=parts.findIndex(x=>x.toLowerCase()==='playlist'),id=ix>=0?parts[ix+1]:null;
    return id||null;
  }catch(_){return null}
}
export function classifySourceAddress(input=''){
  const raw=String(input||'').trim(),playlistId=parseSunoPlaylistId(raw),sunoId=parseSunoId(raw);
  if(playlistId)return {kind:'SUNO_PLAYLIST',playlistId,address:raw};
  if(sunoId)return {kind:'SUNO',sunoId,address:raw};
  try{
    const u=new URL(raw);
    if(!/^https?:$/.test(u.protocol))throw Error('unsupported protocol');
    return {kind:'REMOTE_AUDIO',address:u.href};
  }catch(_){throw Error('Paste a Suno song URL, UUID, or http(s) audio URL')}
}
export async function resolveSourceAddress(input='',fetcher=globalThis.fetch){
  const c=classifySourceAddress(input);
  if(c.kind==='SUNO_PLAYLIST')return {...c,title:'SUNO PLAYLIST',resolution:'PLAYLIST_ADDRESS_ONLY',audioUrl:null};
  if(c.kind!=='SUNO')return {...c,audioUrl:c.address,title:new URL(c.address).pathname.split('/').pop()||'REMOTE AUDIO',resolution:'DIRECT_URL'};
  const metadataUrl=`https://studio-api-prod.suno.com/api/clip/${c.sunoId}`;
  let clip=null,metadataError=null;
  if(typeof fetcher==='function'){
    try{
      const r=await fetcher(metadataUrl,{mode:'cors',credentials:'omit'});
      if(r?.ok)clip=await r.json();else metadataError=`HTTP ${r?.status||'ERR'}`;
    }catch(e){metadataError=String(e?.message||e)}
  }
  const meta=clip?.metadata||{},audioUrl=clip?.audio_url||`https://cdn1.suno.ai/${c.sunoId}.mp3`;
  return {
    ...c,metadataUrl,audioUrl,
    title:clip?.title||'SUNO TRACK',
    artist:clip?.display_name||clip?.handle||'',
    duration:Number(meta.duration)||null,
    tags:meta.tags||'',
    lyrics:typeof meta.prompt==='string'?meta.prompt:'',
    providerBpm:Number(meta.bpm??meta.tempo)||null,
    providerKey:meta.key||meta.key_signature||meta.keySignature||null,
    providerTimeSignature:meta.time_signature||meta.timeSignature||null,
    resolution:clip?'PUBLIC_CLIP_METADATA':'UUID_CDN_FALLBACK',
    metadataError
  };
}
export async function fetchRemoteAudio(source,fetcher=globalThis.fetch,maxBytes=MAX_REMOTE_BYTES){
  if(!source?.audioUrl||typeof fetcher!=='function')throw Error('remote audio fetch unavailable');
  const r=await fetcher(source.audioUrl,{mode:'cors',credentials:'omit'});
  if(!r?.ok)throw Error(`audio HTTP ${r?.status||'ERR'}`);
  const declared=Number(r.headers?.get?.('content-length')||0);
  if(declared&&declared>maxBytes)throw Error(`remote audio exceeds ${Math.round(maxBytes/1048576)} MB limit`);
  const bytes=await r.arrayBuffer();
  if(bytes.byteLength>maxBytes)throw Error(`remote audio exceeds ${Math.round(maxBytes/1048576)} MB limit`);
  const type=r.headers?.get?.('content-type')||'audio/mpeg';
  return {bytes,type,size:bytes.byteLength};
}
export {MAX_REMOTE_BYTES};
