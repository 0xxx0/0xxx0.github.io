import {getLocalMedia,localMediaFile,normalizeLocalMediaId} from '../local-media-store.js';

const params=new URLSearchParams(location.search),requested=params.get('source'),returnAddress=params.get('return')||'../listen/';

function installReturn(){
  if(!requested||document.getElementById('vaultReturn'))return;
  const header=document.querySelector('header');if(!header)return;
  const a=document.createElement('a');a.id='vaultReturn';a.href=returnAddress;a.textContent='↩ LISTEN';
  a.style.cssText='margin-left:auto;color:#6dbdff;text-decoration:none;border:1px solid rgba(255,255,255,.18);padding:7px 9px;font:800 8px ui-monospace,monospace;letter-spacing:.1em;background:rgba(5,8,12,.84);white-space:nowrap';
  header.append(a);
}

async function waitForLive(limit=12000){
  const start=performance.now();
  while(performance.now()-start<limit){
    if(window.FoldBloomLive?.loadFiles)return true;
    await new Promise(r=>setTimeout(r,60));
  }
  return false;
}

async function loadRequested(){
  installReturn();
  if(!requested){document.documentElement.dataset.localVaultSource='none';return}
  let id;
  try{id=normalizeLocalMediaId(requested)}
  catch(_){document.documentElement.dataset.localVaultSource='invalid';return}
  document.documentElement.dataset.requestedSource=id;
  const record=await getLocalMedia(id).catch(()=>null);
  if(!record){
    document.documentElement.dataset.localVaultSource='missing';
    const state=document.getElementById('trackState');if(state)state.textContent='SOURCE HASH KNOWN · LOCAL BYTES MISSING';
    return;
  }
  if(!await waitForLive()){document.documentElement.dataset.localVaultSource='blocked';return}
  document.documentElement.dataset.localVaultSource='loading';
  const file=localMediaFile(record);
  await window.FoldBloomLive.loadFiles([file]).catch(()=>null);
  const raw=id.replace(/^sha256:/,'');
  const start=performance.now();
  while(performance.now()-start<20000){
    const state=window.FoldBloomLive?.state?.();
    if(state?.sourceMeta?.hash===raw){
      document.documentElement.dataset.localVaultSource='ready';
      document.documentElement.dataset.requestedSourceHash=raw;
      return;
    }
    await new Promise(r=>setTimeout(r,100));
  }
  document.documentElement.dataset.localVaultSource='timeout';
}

loadRequested();
window.FoldBloomLiveVault={requested,returnAddress,loadRequested};
