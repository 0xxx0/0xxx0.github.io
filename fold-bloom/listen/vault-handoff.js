import {getLocalMedia,putLocalMedia,localMediaFile,normalizeLocalMediaId,requestPersistentLocalStorage} from '../local-media-store.js';

const $=s=>document.querySelector(s),params=new URLSearchParams(location.search),requested=params.get('source'),returnAddress=params.get('return')||'../set/';

function installReturn(){
  const header=document.querySelector('header');if(!header||document.getElementById('vaultReturn'))return;
  const a=document.createElement('a');a.id='vaultReturn';a.href=returnAddress;a.textContent='↩ RETURN';
  a.style.cssText='pointer-events:auto;color:#6dbdff;text-decoration:none;border:1px solid rgba(255,255,255,.16);background:rgba(5,8,12,.82);padding:7px 9px;font-size:8px;letter-spacing:.1em;white-space:nowrap';
  header.append(a);
}

async function hashFile(file){
  const buf=await file.arrayBuffer(),hash=await crypto.subtle.digest('SHA-256',buf);
  return 'sha256:'+Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
}

async function retainFiles(files){
  const xs=[...(files||[])].filter(file=>file.type?.startsWith('audio/')||/\.(mp3|m4a|wav|flac|ogg|aac|webm|mp4)$/i.test(file.name||''));
  if(!xs.length)return;
  requestPersistentLocalStorage().catch(()=>false);
  for(const file of xs){
    try{
      const sourceId=await hashFile(file);
      await putLocalMedia({sourceId,blob:file,name:file.name,type:file.type,size:file.size,lastModified:file.lastModified||0,meta:{origin:'LISTEN',storedAt:new Date().toISOString()}});
    }catch(error){console.warn('LISTEN local vault store failed',error)}
  }
}

$('#file')?.addEventListener('change',e=>retainFiles(e.target.files),{capture:true});
$('#drop')?.addEventListener('drop',e=>retainFiles(e.dataTransfer?.files),{capture:true});

function dispatchFile(file){
  const input=$('#file');if(!input)return false;
  try{
    const dt=new DataTransfer();dt.items.add(file);input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));return true;
  }catch(error){console.warn('local vault handoff could not synthesize FileList',error);return false}
}

async function waitForListen(limit=12000){
  const start=performance.now();
  while(performance.now()-start<limit){if(window.FoldBloomListen?.boot==='ready')return true;await new Promise(r=>setTimeout(r,60))}
  return false;
}

async function loadRequested(){
  installReturn();
  if(!requested){document.documentElement.dataset.localVaultSource='none';return}
  let id;
  try{id=normalizeLocalMediaId(requested)}catch(error){$('#status').textContent='INVALID SOURCE ADDRESS';document.documentElement.dataset.localVaultSource='invalid';return}
  $('#status').textContent='OPENING LOCAL SOURCE VAULT';
  const record=await getLocalMedia(id).catch(()=>null);
  if(!record){
    $('#status').textContent='SOURCE HASH KNOWN · LOCAL BYTES MISSING · CHOOSE FILE ONCE';
    $('#meta').textContent='This browser has the address but not the audio blob. Bind the exact file once; future SET / LISTEN / JOURNEY transitions reuse it.';
    $('#chooseLabel').textContent='BIND THIS SOURCE ONCE';
    document.documentElement.dataset.localVaultSource='missing';
    document.documentElement.dataset.requestedSource=id;
    return;
  }
  await waitForListen();
  const file=localMediaFile(record),ok=dispatchFile(file);
  if(!ok){
    $('#status').textContent='LOCAL BYTES FOUND · TAP CHOOSE AUDIO IF THIS BROWSER BLOCKS HANDOFF';
    document.documentElement.dataset.localVaultSource='blocked';return;
  }
  document.documentElement.dataset.localVaultSource='loading';
  document.documentElement.dataset.requestedSource=id;
  const raw=id.replace(/^sha256:/,'');
  const start=performance.now();
  while(performance.now()-start<20000){
    const state=window.FoldBloomListen?.state?.();
    if(state?.fileMeta?.hash===raw){
      document.documentElement.dataset.localVaultSource='ready';
      $('#status').textContent=(state.stage==='DEEP'?'READY · DEEP MAP':'PREVIEW READY')+' · LOCAL VAULT';
      return;
    }
    await new Promise(r=>setTimeout(r,100));
  }
  document.documentElement.dataset.localVaultSource='timeout';
}

loadRequested();
window.FoldBloomVaultHandoff={requested,returnAddress,loadRequested,retainFiles};
