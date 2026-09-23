import {decodeExperienceSet} from '../experience-set/experience-set.js';
import {getLocalMedia,localMediaFile} from '../local-media-store.js';
import {
  LIVE_SET_RIDE_VERSION,createLiveSetRide,syncLiveSetRide,setRideSeamAction,
  dissolveJourneyTime,markLiveSetRideEvent,completeLiveSetRide,liveSetRideReturn
} from './set-ride-core.js';

const SET_STORE='fold-bloom.set-compositor.v01',META_STORE='fold-bloom.set-compositor.meta.v01';
const params=new URLSearchParams(location.search),requestedSet=params.get('set'),returnAddress=params.get('return')||'../set/';
const primary=document.getElementById('trackAudio');
let set=null,meta={},records=new Map(),session=null,transitioning=false,dissolve=null,bridge=null,bridgeUrl=null,raf=0;

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const fmt=t=>{const x=Math.max(0,Number(t)||0),m=Math.floor(x/60),s=x-m*60;return `${String(m).padStart(2,'0')}:${s.toFixed(1).padStart(4,'0')}`};
function status(text){const el=document.getElementById('setRideStatus');if(el)el.textContent=text}
function titleFor(sourceId){return meta[sourceId]?.name||meta[sourceId]?.title||records.get(sourceId)?.name||sourceId}
function cleanBridge(){if(bridge){try{bridge.pause();bridge.removeAttribute('src');bridge.load()}catch(_){}bridge=null}if(bridgeUrl){URL.revokeObjectURL(bridgeUrl);bridgeUrl=null}}
function waitForLive(limit=15000){const start=performance.now();return new Promise(async(resolve)=>{while(performance.now()-start<limit){if(window.FoldBloomLive?.loadFiles){resolve(true);return}await sleep(60)}resolve(false)})}

async function probeDuration(record){
  const hinted=Number(record?.meta?.durationSeconds||record?.meta?.duration||meta[record?.sourceId]?.durationSeconds||0);if(hinted>0)return hinted;
  return new Promise(resolve=>{
    const audio=document.createElement('audio'),url=URL.createObjectURL(record.blob);let done=false;
    const finish=value=>{if(done)return;done=true;URL.revokeObjectURL(url);resolve(Number.isFinite(value)?value:0)};
    const timer=setTimeout(()=>finish(0),6000);audio.preload='metadata';audio.onloadedmetadata=()=>{clearTimeout(timer);finish(audio.duration)};audio.onerror=()=>{clearTimeout(timer);finish(0)};audio.src=url;
  });
}

function installSurface(){
  if(document.getElementById('setRideBar'))return;
  const bar=document.createElement('section');bar.id='setRideBar';bar.innerHTML=`<div class="setRideId"><b>SET RIDE ${LIVE_SET_RIDE_VERSION}</b><span id="setRideStatus">RECOVERING SET…</span></div><div class="setRideClock"><span id="setRideCell">—</span><b id="setRideTime">00:00.0 / 00:00.0</b><span id="setRideSeam">—</span></div><div class="setRideActions"><button id="setRidePlay" type="button">PLAY SET</button><button id="setRideReturn" type="button">RETURN</button><button id="setRideExport" type="button">EXPORT</button></div>`;
  const style=document.createElement('style');style.textContent=`#setRideBar{position:fixed;z-index:35;left:max(8px,env(safe-area-inset-left));right:max(8px,env(safe-area-inset-right));top:max(58px,calc(env(safe-area-inset-top) + 52px));display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:8px;align-items:center;padding:7px 8px;border:1px solid rgba(255,255,255,.18);background:rgba(5,8,12,.86);backdrop-filter:blur(9px);font:800 8px ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;pointer-events:auto}.setRideId,.setRideClock{display:flex;gap:8px;align-items:center;min-width:0}.setRideId span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#9fb4c8}.setRideClock b{color:#fff;white-space:nowrap}.setRideActions{display:flex;gap:5px}.setRideActions button{min-height:32px;padding:0 8px;border:1px solid rgba(255,255,255,.2);background:#0a0e14;color:#dbe9f6;font:inherit}@media(max-width:700px){#setRideBar{top:max(52px,calc(env(safe-area-inset-top) + 48px));grid-template-columns:1fr auto}.setRideClock{grid-column:1/-1;order:3}.setRideActions button{min-height:36px}.setRideActions #setRideExport{display:none}}`;
  document.head.append(style);document.body.append(bar);
  document.getElementById('setRidePlay').onclick=()=>primary?.play?.().catch(()=>status('PLAY BLOCKED · TAP TRACK PLAY'));
  document.getElementById('setRideReturn').onclick=()=>location.assign(returnAddress);
  document.getElementById('setRideExport').onclick=exportReturn;
}

function render(){
  if(!session?.ride)return;
  const a=session.ride.address,entry=session.plan.entries[a.entryIndex],cell=document.getElementById('setRideCell'),clock=document.getElementById('setRideTime'),seam=document.getElementById('setRideSeam');
  if(cell)cell.textContent=`${a.entryIndex+1}/${session.plan.entries.length} · ${titleFor(entry.sourceId)}`;
  if(clock)clock.textContent=`${fmt(a.sourceTime)} / ${fmt(a.journeyTime)}`;
  if(seam)seam.textContent=a.seam?.phase==='SOURCE'?(entry.law||'CUT'):`${a.seam?.law||entry.law} · ${a.seam?.phase||'SOURCE'}`;
  document.documentElement.dataset.foldBloomSetRide=session.status==='RETURNED'?'returned':'ready';
  document.documentElement.dataset.foldBloomSetId=session.plan.setId;
  document.documentElement.dataset.foldBloomSetSource=a.sourceId||'';
}

async function makeBridge(index,{volume=1,play=true}={}){
  cleanBridge();const entry=session.plan.entries[index],record=records.get(entry.sourceId);if(!record?.blob)throw new Error('NEXT SOURCE BYTES MISSING');
  bridge=new Audio();bridge.preload='auto';bridge.volume=Math.max(0,Math.min(1,Number(volume)||0));bridgeUrl=URL.createObjectURL(record.blob);bridge.src=bridgeUrl;
  if(play)await bridge.play().catch(()=>{});
  return bridge;
}

async function loadEntry(index,{sourceTime=0,bridgeFirst=false,resetLive=false}={}){
  if(transitioning)return;transitioning=true;
  const entry=session.plan.entries[index],record=records.get(entry.sourceId);
  try{
    if(!record)throw new Error('SOURCE BYTES MISSING · '+entry.sourceId);
    if(resetLive)window.FoldBloomLive?.reset?.({silent:true});
    let handoff=bridge;
    if(bridgeFirst&&!handoff)handoff=await makeBridge(index,{volume:primary?.volume??.78,play:true});
    const oldVolume=primary?.volume??.78;if(primary&&handoff)primary.volume=0;
    status(`LOADING ${index+1}/${session.plan.entries.length} · ${titleFor(entry.sourceId)}`);
    await window.FoldBloomLive.loadFiles([localMediaFile(record)]);
    const bridgeTime=Math.max(0,Number(handoff?.currentTime)||Number(sourceTime)||0);
    if(primary){try{primary.currentTime=Math.min(Number(entry.duration)||bridgeTime,bridgeTime)}catch(_){}primary.volume=oldVolume;if(handoff&&!handoff.paused)await primary.play().catch(()=>{})}
    cleanBridge();session=syncLiveSetRide(session,{entryIndex:index,sourceTime:bridgeTime});session=markLiveSetRideEvent(session,'SOURCE_ENTER',{law:entry.law||'RETURN'});status(`RIDING · ${titleFor(entry.sourceId)}`);render();
  }catch(error){console.warn('SET RIDE load failed',error);status(String(error?.message||error).toUpperCase());document.documentElement.dataset.foldBloomSetRide='blocked'}finally{transitioning=false}
}

async function beginDissolve(action){
  if(transitioning||dissolve)return;transitioning=true;
  try{
    const b=await makeBridge(action.nextIndex,{volume:0,play:true});
    dissolve={nextIndex:action.nextIndex,started:performance.now(),duration:Math.max(.05,Number(action.durationSeconds)||2.4),bridge:b,primaryVolume:primary?.volume??.78};
    session=markLiveSetRideEvent(session,'DISSOLVE_START',{toIndex:action.nextIndex,durationSeconds:dissolve.duration});status(`DISSOLVE → ${titleFor(session.plan.entries[action.nextIndex].sourceId)}`);
  }catch(error){console.warn(error);status('DISSOLVE BLOCKED · '+String(error?.message||error))}finally{transitioning=false}
}

async function finishDissolve(){
  if(!dissolve||transitioning)return;transitioning=true;const d=dissolve;dissolve=null;
  try{
    if(primary){primary.pause();primary.volume=d.primaryVolume}
    if(d.bridge)d.bridge.volume=d.primaryVolume;
    session=syncLiveSetRide(session,{entryIndex:d.nextIndex,sourceTime:Number(d.bridge?.currentTime)||d.duration});session=markLiveSetRideEvent(session,'DISSOLVE_COMPLETE',{fromIndex:d.nextIndex-1,toIndex:d.nextIndex});
    const record=records.get(session.plan.entries[d.nextIndex].sourceId);if(!record)throw new Error('DISSOLVE SOURCE BYTES MISSING');
    const oldVolume=primary?.volume??d.primaryVolume;if(primary)primary.volume=0;
    await window.FoldBloomLive.loadFiles([localMediaFile(record)]);
    const t=Math.max(0,Number(d.bridge?.currentTime)||d.duration);if(primary){try{primary.currentTime=Math.min(Number(session.plan.entries[d.nextIndex].duration)||t,t)}catch(_){}primary.volume=oldVolume;if(d.bridge&&!d.bridge.paused)await primary.play().catch(()=>{})}
    cleanBridge();status(`RIDING · ${titleFor(session.plan.entries[d.nextIndex].sourceId)}`);render();
  }catch(error){console.warn(error);status('DISSOLVE HANDOFF BLOCKED · '+String(error?.message||error));document.documentElement.dataset.foldBloomSetRide='blocked'}finally{transitioning=false}
}

async function onPrimaryEnded(){
  if(!session?.ready||transitioning||dissolve||session.status==='RETURNED')return;
  const action=setRideSeamAction(session,{sourceTime:session.plan.entries[session.index]?.duration||0,ended:true});
  if(action.type==='RETURN'){
    session=completeLiveSetRide(session);status('RETURNED · SET COMPLETE');render();return;
  }
  if(action.type==='RESET_NEXT'){
    session=markLiveSetRideEvent(session,'RESET_GAP',{gapSeconds:action.gapSeconds});window.FoldBloomLive?.reset?.({silent:true});status(`RESET · ${action.gapSeconds.toFixed(2)}s GAP`);await sleep(action.gapSeconds*1000);await loadEntry(action.nextIndex,{bridgeFirst:true});return;
  }
  if(action.type==='LOAD_NEXT')await loadEntry(action.nextIndex,{bridgeFirst:true});
}

function exportReturn(){
  if(!session)return;const packet=liveSetRideReturn(session),blob=new Blob([JSON.stringify(packet,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`fold-bloom-live-set-return-${Date.now()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),900);status('RETURN EXPORTED')
}

function tick(){
  if(session?.ready&&session.status!=='RETURNED'){
    if(dissolve){
      const elapsed=Math.max(0,(performance.now()-dissolve.started)/1000),p=Math.max(0,Math.min(1,elapsed/dissolve.duration));
      if(primary)primary.volume=dissolve.primaryVolume*(1-p);if(dissolve.bridge)dissolve.bridge.volume=dissolve.primaryVolume*p;
      const jt=dissolveJourneyTime(session,dissolve.nextIndex,elapsed);session=syncLiveSetRide(session,{journeyTime:jt});render();if(p>=1)finishDissolve();
    }else if(!transitioning){
      const live=window.FoldBloomLive?.state?.(),sourceTime=Number(live?.linkedTrack?.time??primary?.currentTime)||0;
      session=syncLiveSetRide(session,{entryIndex:session.index,sourceTime});
      const action=setRideSeamAction(session,{sourceTime,ended:false,transitioning:false});
      if(action.type==='START_DISSOLVE'&&primary&&!primary.paused)beginDissolve(action);
      render();
    }
  }
  raf=requestAnimationFrame(tick);
}

async function boot(){
  if(!requestedSet){document.documentElement.dataset.foldBloomSetRide='none';return}
  installSurface();
  if(!await waitForLive()){status('LIVE HOST BLOCKED');document.documentElement.dataset.foldBloomSetRide='blocked';return}
  try{
    const raw=localStorage.getItem(SET_STORE);if(!raw)throw new Error('NO AUTHORED SET IN THIS BROWSER');set=decodeExperienceSet(raw);
    if(set.id!==requestedSet)throw new Error(`SET ADDRESS MISMATCH · ${requestedSet} ≠ ${set.id}`);
    try{meta=JSON.parse(localStorage.getItem(META_STORE)||'{}')||{}}catch(_){meta={}}
    const bindings=[];records=new Map();
    for(const entry of set.entries){const record=await getLocalMedia(entry.sourceId).catch(()=>null);if(record){records.set(entry.sourceId,record);bindings.push({sourceId:entry.sourceId,duration:await probeDuration(record),label:titleFor(entry.sourceId),available:true})}}
    session=createLiveSetRide(set,bindings,{live:window.FoldBloomLive.state?.().ride||null});
    if(!session.ready)throw new Error(`SET SOURCE BYTES MISSING · ${session.plan.missing.length}`);
    session=markLiveSetRideEvent(session,'SET_ENTER',{setId:set.id});
    primary?.addEventListener('ended',onPrimaryEnded);
    await loadEntry(0,{sourceTime:0});
    document.documentElement.dataset.foldBloomSetRide='ready';status(`READY · ${set.title}`);render();raf=requestAnimationFrame(tick);
  }catch(error){console.warn('SET RIDE boot failed',error);status(String(error?.message||error).toUpperCase());document.documentElement.dataset.foldBloomSetRide='blocked'}
}

addEventListener('beforeunload',()=>{cancelAnimationFrame(raf);cleanBridge()});
boot();
window.FoldBloomSetRide={version:LIVE_SET_RIDE_VERSION,state:()=>session?structuredClone(session):null,return:()=>session?liveSetRideReturn(session):null,export:exportReturn,advance:onPrimaryEnded};
