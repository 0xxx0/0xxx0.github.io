export const AUTHORED_PACK_SCHEMA='fold-bloom-authored-reader-pack/v0.1';

const cleanLetters=value=>String(value??'').normalize('NFC').toUpperCase().replace(/[^A-Z]/g,'');
export const conservationSignature=value=>[...cleanLetters(value)].sort().join('');

export function validateAuthoredPack(pack,source){
  const errors=[];
  if(!pack||pack.schema!==AUTHORED_PACK_SCHEMA)errors.push('PACK_SCHEMA');
  if(!pack?.id||!pack?.title)errors.push('PACK_IDENTITY');
  if(pack?.authority!=='RECOVERED_AUTHORED_SOURCE')errors.push('PACK_AUTHORITY');
  if(!String(source||'').trim())errors.push('SOURCE_EMPTY');
  if(!/^sha256:[a-f0-9]{64}$/.test(String(pack?.source_hash||'')))errors.push('SOURCE_HASH_SHAPE');
  for(const fragment of pack?.fragments||[]){
    if(fragment?.status!=='V')errors.push('FRAGMENT_STATUS:'+String(fragment?.id||'?'));
    if(!String(source||'').includes(String(fragment?.text||'')))errors.push('FRAGMENT_MISSING:'+String(fragment?.id||'?'));
  }
  for(const group of pack?.recurrence||[]){
    const sig=String(group.signature||'');
    for(const v of group?.variants||[]){
      const actual=conservationSignature(v.text);
      if(actual!==sig)errors.push('RECURRENCE_SIGNATURE:'+String(v.label||'?'));
      const slice=String(source||'').slice(Number(v.start),Number(v.end));
      if(slice!==v.text)errors.push('RECURRENCE_SPAN:'+String(v.label||'?'));
    }
  }
  return{ok:errors.length===0,errors};
}

export async function sha256Text(source){
  const bytes=new TextEncoder().encode(String(source??''));
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return 'sha256:'+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
}

export async function loadAuthoredPack(id='prison-age-2021'){
  const safe=String(id||'').toLowerCase().replace(/[^a-z0-9-]/g,'');
  if(!safe)throw Error('AUTHORED_PACK_ID');
  const packRes=await fetch('./authored/'+safe+'.json',{cache:'no-store'});
  if(!packRes.ok)throw Error('AUTHORED_PACK_FETCH');
  const pack=await packRes.json();
  if(pack.id!==safe)throw Error('AUTHORED_PACK_ID_MISMATCH');
  const srcRes=await fetch(pack.source_path,{cache:'no-store'});
  if(!srcRes.ok)throw Error('AUTHORED_SOURCE_FETCH');
  const source=await srcRes.text(),validated=validateAuthoredPack(pack,source);
  if(!validated.ok)throw Error(validated.errors.join(' / '));
  const hash=await sha256Text(source);
  if(hash!==pack.source_hash)throw Error('AUTHORED_SOURCE_HASH');
  return{pack,source,hash};
}

export function recurrenceAt(pack,sourceOffset=0){
  const offset=Math.max(0,Number(sourceOffset)||0);
  for(const group of pack?.recurrence||[]){
    const hit=(group.variants||[]).find(v=>offset>=Number(v.start)&&offset<Number(v.end));
    if(hit)return{group,hit};
  }
  return null;
}

export function nextRecurrence(pack,currentOffset=0,direction=1){
  const variants=(pack?.recurrence||[]).flatMap(group=>(group.variants||[]).map(v=>({...v,groupId:group.id,groupLabel:group.label}))).sort((a,b)=>a.start-b.start);
  if(!variants.length)return null;
  const current=Math.max(0,Number(currentOffset)||0),dir=Number(direction)<0?-1:1;
  if(dir>0)return variants.find(v=>v.start>current+1)||variants[0];
  for(let i=variants.length-1;i>=0;i--)if(variants[i].start<current-1)return variants[i];
  return variants.at(-1);
}

export function readerStats(readState,liveState){
  const visited=Array.isArray(readState?.traversal?.visited)?readState.traversal.visited:[],
    keys=visited.map(v=>v.start+':'+v.end),unique=new Set(keys),counts={};
  for(const k of keys)counts[k]=(counts[k]||0)+1;
  return{
    visits:visited.length,
    unique:unique.size,
    revisits:Object.values(counts).reduce((n,x)=>n+Math.max(0,x-1),0),
    releases:Array.isArray(liveState?.history)?liveState.history.length:0,
    final:readState?.witness?.address||null,
    progress:Number(readState?.course?.progress)||0
  };
}
