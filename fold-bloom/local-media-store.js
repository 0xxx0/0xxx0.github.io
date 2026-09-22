export const LOCAL_MEDIA_DB='fold-bloom-local-media-v1';
export const LOCAL_MEDIA_STORE='media';
export const LOCAL_MEDIA_SCHEMA='fold-bloom-local-media/v0.1';

const HEX64=/^[a-f0-9]{64}$/i;

export function normalizeLocalMediaId(value){
  const raw=String(value??'').trim();
  if(!raw)throw new TypeError('sourceId required');
  if(HEX64.test(raw))return 'sha256:'+raw.toLowerCase();
  if(/^sha256:/i.test(raw)){
    const hash=raw.slice(7);
    if(!HEX64.test(hash))throw new TypeError('sha256 sourceId must contain 64 hex characters');
    return 'sha256:'+hash.toLowerCase();
  }
  return raw;
}

function requireBlob(value){
  if(typeof Blob==='undefined'||!(value instanceof Blob))throw new TypeError('blob must be a Blob/File');
  return value;
}

function openDb(){
  if(typeof indexedDB==='undefined')return Promise.reject(new Error('IndexedDB unavailable'));
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(LOCAL_MEDIA_DB,1);
    request.onupgradeneeded=()=>{
      const db=request.result;
      if(!db.objectStoreNames.contains(LOCAL_MEDIA_STORE)){
        const store=db.createObjectStore(LOCAL_MEDIA_STORE,{keyPath:'sourceId'});
        store.createIndex('updatedAt','updatedAt');
      }
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error||new Error('IndexedDB open failed'));
    request.onblocked=()=>reject(new Error('IndexedDB upgrade blocked'));
  });
}

function request(storeName,mode,operate){
  return openDb().then(db=>new Promise((resolve,reject)=>{
    const tx=db.transaction(storeName,mode),store=tx.objectStore(storeName);
    let result;
    try{result=operate(store)}catch(error){db.close();reject(error);return}
    tx.oncomplete=()=>{db.close();resolve(result?.result)};
    tx.onerror=()=>{const error=tx.error||result?.error||new Error('IndexedDB transaction failed');db.close();reject(error)};
    tx.onabort=()=>{const error=tx.error||new Error('IndexedDB transaction aborted');db.close();reject(error)};
  }));
}

export async function putLocalMedia({sourceId,blob,name='',type='',size,lastModified=0,meta=null}={}){
  const id=normalizeLocalMediaId(sourceId),body=requireBlob(blob),now=new Date().toISOString();
  const record={
    schema:LOCAL_MEDIA_SCHEMA,
    sourceId:id,
    blob:body,
    name:String(name||body.name||id),
    type:String(type||body.type||'application/octet-stream'),
    size:Number.isFinite(Number(size))?Number(size):body.size,
    lastModified:Number.isFinite(Number(lastModified))?Number(lastModified):0,
    meta:meta&&typeof meta==='object'?JSON.parse(JSON.stringify(meta)):null,
    updatedAt:now
  };
  await request(LOCAL_MEDIA_STORE,'readwrite',store=>store.put(record));
  return {...record,blob:undefined,stored:true};
}

export async function getLocalMedia(sourceId){
  const id=normalizeLocalMediaId(sourceId);
  const result=await request(LOCAL_MEDIA_STORE,'readonly',store=>store.get(id));
  return result||null;
}

export async function hasLocalMedia(sourceId){return !!(await getLocalMedia(sourceId))}

export async function listLocalMedia(sourceIds=null){
  if(Array.isArray(sourceIds)){
    const out=[];
    for(const id of sourceIds){const record=await getLocalMedia(id).catch(()=>null);if(record)out.push(record)}
    return out;
  }
  const result=await request(LOCAL_MEDIA_STORE,'readonly',store=>store.getAll());
  return Array.isArray(result)?result:[];
}

export async function deleteLocalMedia(sourceId){
  const id=normalizeLocalMediaId(sourceId);
  await request(LOCAL_MEDIA_STORE,'readwrite',store=>store.delete(id));
  return true;
}

export function localMediaFile(record){
  if(!record?.blob)throw new TypeError('local media record with blob required');
  const name=String(record.name||record.sourceId||'local-audio'),options={type:record.type||record.blob.type||'application/octet-stream',lastModified:Number(record.lastModified)||0};
  if(typeof File!=='undefined')return new File([record.blob],name,options);
  const blob=record.blob.slice(0,record.blob.size,options.type);
  try{Object.defineProperty(blob,'name',{value:name,configurable:true})}catch(_){}
  return blob;
}

export async function requestPersistentLocalStorage(){
  try{return !!(await globalThis.navigator?.storage?.persist?.())}catch(_){return false}
}

export async function localStorageEstimate(){
  try{
    const estimate=await globalThis.navigator?.storage?.estimate?.();
    return {usage:Number(estimate?.usage)||0,quota:Number(estimate?.quota)||0};
  }catch(_){return {usage:0,quota:0}}
}
