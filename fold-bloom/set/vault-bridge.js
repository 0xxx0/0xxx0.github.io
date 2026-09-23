import {putLocalMedia,hasLocalMedia,requestPersistentLocalStorage,localStorageEstimate} from '../local-media-store.js';

const input=document.getElementById('files'),drop=document.getElementById('drop'),rail=document.getElementById('rail');
const syntheticDemo=new URLSearchParams(location.search).has('demo');
let storing=0,stored=0,failed=0,refreshing=false,refreshQueued=false,observer=null;

async function hashFile(file){
  const buf=await file.arrayBuffer(),hash=await crypto.subtle.digest('SHA-256',buf);
  return 'sha256:'+Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
}

function ensureWitness(){
  let el=document.getElementById('vaultState');
  if(el)return el;
  el=document.createElement('span');el.id='vaultState';el.textContent=syntheticDemo?'VAULT · SYNTHETIC / BYTE-FREE':'VAULT · LOCAL';
  document.querySelector('.drop .stats')?.append(el);
  return el;
}

async function storeFiles(files){
  const xs=[...(files||[])].filter(x=>x instanceof Blob);if(!xs.length)return;
  storing+=xs.length;ensureWitness().textContent=`VAULT · STORING ${storing}`;
  requestPersistentLocalStorage().catch(()=>false);
  for(const file of xs){
    try{
      const sourceId=await hashFile(file);
      await putLocalMedia({sourceId,blob:file,name:file.name||sourceId,type:file.type,size:file.size,lastModified:file.lastModified||0,meta:{origin:'SET',storedAt:new Date().toISOString()}});
      stored++;
    }catch(error){failed++;console.warn('SET local vault store failed',error)}
    finally{storing--}
  }
  const estimate=await localStorageEstimate(),mb=Math.round(estimate.usage/1048576);
  ensureWitness().textContent=`VAULT · ${stored} STORED${failed?` · ${failed} FAILED`:''}${mb?` · ${mb} MB`:''}`;
  queueRefresh();
}

input?.addEventListener('change',e=>storeFiles(e.target.files),{capture:true});
drop?.addEventListener('drop',e=>storeFiles(e.dataTransfer?.files),{capture:true});

function sourceHref(sourceId){
  const q=new URLSearchParams({source:sourceId,return:location.pathname+location.search});
  return '../listen/?'+q.toString();
}

async function decorateBlock(block,index,state){
  const entry=state?.set?.entries?.[index];if(!entry)return;
  let btn=block.querySelector('[data-vault-listen]');
  if(!btn){
    btn=document.createElement('button');btn.type='button';btn.dataset.vaultListen='1';btn.className='vaultListen';
    block.querySelector('.mini')?.append(btn);
  }
  const available=syntheticDemo?false:await hasLocalMedia(entry.sourceId).catch(()=>false);
  const label=available?'LISTEN':'LISTEN · BIND';
  const title=available?'Open this exact local source in LISTEN':syntheticDemo?'Synthetic demo contains hashes only; select the real local file once':'The source hash is known, but this browser does not hold its bytes yet';
  if(btn.textContent!==label)btn.textContent=label;
  if(btn.title!==title)btn.title=title;
  btn.onclick=()=>location.assign(sourceHref(entry.sourceId));
  const mediaState=available?'ready':'missing';
  if(block.dataset.localMedia!==mediaState)block.dataset.localMedia=mediaState;
}

async function refreshButtons(){
  if(refreshing)return;
  const state=window.FoldBloomSet?.state?.();if(!state)return;
  refreshing=true;observer?.disconnect();
  try{
    const blocks=[...document.querySelectorAll('#rail .block')];
    await Promise.all(blocks.map((block,index)=>decorateBlock(block,index,state)));
    const ride=document.getElementById('journeyBtn'),entries=state?.set?.entries||[],setId=state?.set?.id;
    if(ride){
      if(setId&&entries.length){const q=new URLSearchParams({set:setId,return:location.pathname+location.search}),target=new URL('../live/',location.href);target.search=q.toString();ride.dataset.href=target.href;ride.disabled=false;ride.title='Ride this exact authored set in LIVE'}
      else{delete ride.dataset.href;ride.disabled=true;ride.title='Add at least one source first'}
    }
    document.documentElement.dataset.localVault=syntheticDemo?'synthetic':'ready';
  }finally{
    refreshing=false;
    if(rail&&observer)observer.observe(rail,{childList:true,subtree:true});
  }
}

function queueRefresh(){
  if(refreshQueued)return;
  refreshQueued=true;
  queueMicrotask(()=>{refreshQueued=false;refreshButtons()});
}

function ensureJourneyAction(){
  if(document.getElementById('journeyBtn'))return;
  const actions=document.querySelector('.hero .actions');if(!actions)return;
  const btn=document.createElement('button');btn.id='journeyBtn';btn.type='button';btn.textContent='RIDE SET';btn.disabled=true;
  btn.onclick=()=>{const href=btn.dataset.href;if(href)location.assign(href);else ensureWitness().textContent='VAULT · SET NOT READY'};
  const debug=document.createElement('button');debug.id='journeyDebugBtn';debug.type='button';debug.textContent='JOURNEY';debug.title='Traversal/debug witness';
  debug.onclick=()=>location.assign('./journey.html?return='+encodeURIComponent(location.pathname+location.search));
  actions.append(btn,debug);
}

const style=document.createElement('style');style.textContent='.block .mini{flex-wrap:wrap}.block .mini .vaultListen{flex:1 0 100%;color:var(--cool)}';document.head.append(style);
observer=new MutationObserver(queueRefresh);
if(rail)observer.observe(rail,{childList:true,subtree:true});
ensureWitness();ensureJourneyAction();
const wait=setInterval(()=>{if(window.FoldBloomSet){clearInterval(wait);queueRefresh()}},60);
setTimeout(()=>clearInterval(wait),12000);

window.FoldBloomLocalVault={storeFiles,refresh:refreshButtons,sourceHref,syntheticDemo};
