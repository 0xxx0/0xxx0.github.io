(()=>{'use strict';
const DB_NAME='human-port-object-store-v01',STORE='objects',VERSION=1;
const enc=new TextEncoder();
const hex=buf=>[...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
const sha256=async data=>hex(await crypto.subtle.digest('SHA-256',data));
function open(){
 return new Promise((resolve,reject)=>{
  const req=indexedDB.open(DB_NAME,VERSION);
  req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE)){const s=db.createObjectStore(STORE,{keyPath:'id'});s.createIndex('created_at','created_at');}};
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
 });
}
async function tx(mode,fn){
 const db=await open();
 return new Promise((resolve,reject)=>{
  const t=db.transaction(STORE,mode),s=t.objectStore(STORE);let out;
  try{out=fn(s)}catch(e){db.close();reject(e);return}
  t.oncomplete=()=>{db.close();resolve(out?.result??out)};
  t.onerror=()=>{db.close();reject(t.error)};
 });
}
async function putRecord(record){await tx('readwrite',s=>s.put(record));return record}
async function fromFile(file){
 const ab=await file.arrayBuffer(),hash=await sha256(ab),id='portobj:sha256:'+hash.slice(0,24);
 const media=file.type==='application/json'||/\.json$/i.test(file.name)?'JSON':file.type.startsWith('image/')?'IMAGE':file.type.startsWith('text/')?'TEXT':'FILE';
 const record={
  id,blob:new Blob([ab],{type:file.type||'application/octet-stream'}),
  envelope:{schema:'human-port-object/v0.1',object_id:id,source_class:'LOCAL_FILE',media_class:media,label:file.name,mime:file.type||'application/octet-stream',size_bytes:file.size,sha256:hash,created_at:new Date().toISOString(),retention:'LOCAL_STASH',provenance:{origin:'browser-local-file',source_ref:null},payload_ref:id,text_payload:null,focus:null}
 };
 await putRecord(record);return record.envelope;
}
async function fromText(text,label='Untitled intake'){
 const raw=String(text),ab=enc.encode(raw),hash=await sha256(ab),id='portobj:text:'+hash.slice(0,24);
 return {schema:'human-port-object/v0.1',object_id:id,source_class:'TEXT_ENTRY',media_class:(()=>{try{JSON.parse(raw);return'JSON'}catch(_){return'TEXT'}})(),label:String(label||'Untitled intake').slice(0,160),mime:'text/plain',size_bytes:ab.byteLength,sha256:hash,created_at:new Date().toISOString(),retention:'SESSION',provenance:{origin:'human-port-text-entry',source_ref:null},payload_ref:null,text_payload:raw,focus:null};
}
async function get(id){const r=await tx('readonly',s=>s.get(id));return r||null}
async function remove(id){await tx('readwrite',s=>s.delete(id));return true}
async function list(){
 const db=await open();
 return new Promise((resolve,reject)=>{
  const t=db.transaction(STORE,'readonly'),s=t.objectStore(STORE),q=s.getAll();
  q.onsuccess=()=>resolve((q.result||[]).map(x=>x.envelope).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))));
  q.onerror=()=>reject(q.error);t.oncomplete=()=>db.close();
 });
}
async function clear(){await tx('readwrite',s=>s.clear());return true}
async function textFor(envelope){
 if(!envelope)return'';
 if(typeof envelope.text_payload==='string')return envelope.text_payload;
 const rec=await get(envelope.payload_ref||envelope.object_id);if(!rec?.blob)return'';
 return await rec.blob.text();
}
async function blobFor(envelope){const rec=await get(envelope?.payload_ref||envelope?.object_id);return rec?.blob||null}
window.PortObjectStore=Object.freeze({fromFile,fromText,get,remove,list,clear,textFor,blobFor,sha256});
})();