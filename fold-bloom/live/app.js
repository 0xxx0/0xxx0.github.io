import { VERSION, createState, restore, snapshot, rotateSteps, release, canRelease, setMode, setScene, gateCellIndex, isAligned, forecastRelease, forecastMatchesCall, callLabel, TYPE_NAMES, N } from './engine.js';
import { FoldBloomAudio } from './audio.js';
import { Renderer } from './render.js';
import { createFieldPulse, transportDescriptor } from '../../lib/field-pulse.js';
import { LiveTrack } from './track.js';
import { createSectionArc, syncSectionArc, observeSectionRelease, sectionArcLabel, sectionArcView } from './section-arc.js';
import { appendReleaseDeformations, applyDeformations, pruneDeformationTape, deformationSummary } from './track-deform.js';
import { createRideState, chooseRideBranch, advanceRide, rideView } from './ride.js';
import { PracticeTrack } from './practice-track.js';
import { normalizePins } from '../listen/stream-lens.js';
import {normalizeRideProfile,profileKey} from './visual-worlds.js';
import {putLocalMedia,getLocalMedia,listLocalMedia,localMediaFile,requestPersistentLocalStorage} from '../local-media-store.js';

const $=s=>document.querySelector(s), STORE='fb-live-0.1';
const cv=$('#field'), renderer=new Renderer(cv);
let state=load() || createState();
let dragging=false,startX=0,lastX=0,stepAccum=0,lastT=0,dragAngle=0,raf=0;
let demo={on:false,timer:0,releases:0,preview:false,startState:null,startRide:null,startTape:null,startArc:null};
const audio=new FoldBloomAudio(step=>renderer.beatPulse(step));
const fieldPulse=createFieldPulse('FOLD_BLOOM_LIVE');
let linkedTrack=null,externalTrack=null,lastLinkedBeat=-1,trackStatus='FIELD COURSE',sectionArc=createSectionArc(),deformationTape=[],ride=createRideState(),latestWorld=null,lastLoopT=performance.now(),lastHudAt=0,sourceLandmarks=[],textOn=true,lastTextKey='',lastDropHapticId=null,rideProfile=normalizeRideProfile(),layerMode='IMMERSION',vaultCache=[],perf={emaMs:16.7,fps:60,modelHz:0};
const CENTER_MASS_SOURCE='2b09a703-1881-4471-bf65-cc51c976d32c';
const CENTER_MASS_URL='https://cdn1.suno.ai/'+CENTER_MASS_SOURCE+'.mp3';
const RIDE_PRESETS=Object.freeze({
  CLEAR:{solidity:1,immersion:.82,dropGain:.82,anticipation:.88,motionGain:.82},
  DRIVE:{solidity:1,immersion:1.12,dropGain:1.28,anticipation:1.12,motionGain:1.18},
  TRANCE:{solidity:.94,immersion:1.22,dropGain:1.08,anticipation:1.48,motionGain:.82},
  SOFT:{solidity:1,immersion:.64,dropGain:.62,anticipation:.72,motionGain:.56}
});
function effectiveRideProfile(){
  if(layerMode==='SOURCE')return normalizeRideProfile({...rideProfile,immersion:.45,dropGain:.55,anticipation:.65,motionGain:.45});
  if(layerMode==='MAP')return normalizeRideProfile({...rideProfile,immersion:.68,dropGain:.72,anticipation:.86,motionGain:.64});
  return rideProfile;
}
function syncLayerUI(){
  if($('#layerRead'))$('#layerRead').textContent=layerMode;
  document.querySelectorAll('[data-layer-mode]').forEach(b=>b.classList.toggle('on',b.dataset.layerMode===layerMode));
  document.documentElement.dataset.foldBloomLayer=layerMode;
}
function applyLayerMode(name,announce=true){
  const next=String(name||'').toUpperCase();
  if(!['SOURCE','MAP','IMMERSION'].includes(next))return false;
  if(liveTrack.sourceActive()&&!liveTrack.mapped()&&next!=='SOURCE'){
    if(announce)toast('MAP NOT LOCAL · SOURCE ONLY');
    return false;
  }
  layerMode=next;
  renderer.setProfile(effectiveRideProfile());
  if(layerMode==='IMMERSION'){if(audio.ctx)audio.setSound(true)}else audio.setSound(false);
  syncLayerUI();update();
  if(announce)toast('LAYER · '+layerMode);
  return true;
}
function ridePresetName(p=rideProfile){
  for(const [name,x] of Object.entries(RIDE_PRESETS)){
    if(['solidity','immersion','dropGain','anticipation','motionGain'].every(k=>Math.abs(Number(p?.[k])-x[k])<.035))return name;
  }
  return 'CUSTOM';
}
function applyRidePreset(name,announce=true){
  const x=RIDE_PRESETS[name];if(!x)return;
  rideProfile=normalizeRideProfile({...rideProfile,...x});saveRideProfile();if(announce)toast('EXPERIENCE · '+name);
}
const practiceTrack=new PracticeTrack();
const liveTrack=new LiveTrack($('#trackAudio'),{
  onState:t=>{trackStatus=t;update()},
  onMap:m=>{syncSourceLandmarks(m);syncRideProfile(m);if(m)toast(m?.stage==='DEEP'?'SONG MAP · DEEP':'SONG MAP · PREVIEW')}
});
liveTrack.setVolume(.78);
audio.hydrate(state);renderer.setScene(state.scene);renderer.setProfile(effectiveRideProfile());

function landmarkKey(map=liveTrack.map){const h=map?.source?.hash;return h?`fold-bloom.listen.pins.v01:${h}`:null}
function syncSourceLandmarks(map=liveTrack.map){
  const key=landmarkKey(map);sourceLandmarks=[];
  if(key){try{sourceLandmarks=normalizePins(JSON.parse(localStorage.getItem(key)||'[]'),map?.source?.hash||null)}catch(_){}}
  renderer.setLandmarks(sourceLandmarks);
  document.documentElement.dataset.foldBloomLandmarks=String(sourceLandmarks.length);
  return sourceLandmarks;
}
addEventListener('storage',e=>{if(e.key&&e.key===landmarkKey())syncSourceLandmarks();if(e.key&&e.key===rideStoreKey())syncRideProfile()});

function rideSourceKey(map=liveTrack.map){return map?.source?.hash||liveTrack.metadata()?.sourceAddress||linkedTrack?.sourceHash||(liveTrack.sourceActive()?'AUDIO_SOURCE':'FIELD_PRACTICE')}
function rideStoreKey(map=liveTrack.map){return profileKey(rideSourceKey(map))}
function readRideProfile(map=liveTrack.map){try{return normalizeRideProfile(JSON.parse(localStorage.getItem(rideStoreKey(map))||'{}'))}catch(_){return normalizeRideProfile()}}
function syncRideProfile(map=liveTrack.map){
  rideProfile=readRideProfile(map);renderer.setProfile(effectiveRideProfile());syncRideControls();return rideProfile
}
function saveRideProfile(){
  rideProfile=normalizeRideProfile(rideProfile);renderer.setProfile(effectiveRideProfile());
  try{localStorage.setItem(rideStoreKey(),JSON.stringify(rideProfile))}catch(_){}
  syncRideControls();
}
function syncRideControls(){
  const set=(id,v)=>{const e=$(id);if(e)e.value=String(v)};
  set('#solidTune',Math.round(rideProfile.solidity*100));set('#immersionTune',Math.round(rideProfile.immersion*100));set('#dropGainTune',Math.round(rideProfile.dropGain*100));set('#anticipationTune',Math.round(rideProfile.anticipation*100));set('#motionGainTune',Math.round(rideProfile.motionGain*100));set('#textSyncTune',Math.round(rideProfile.textOffset*100));
  if($('#solidVal'))$('#solidVal').textContent=Math.round(rideProfile.solidity*100)+'%';
  if($('#immersionVal'))$('#immersionVal').textContent=rideProfile.immersion.toFixed(2)+'×';
  if($('#dropGainVal'))$('#dropGainVal').textContent=rideProfile.dropGain.toFixed(2)+'×';
  if($('#anticipationVal'))$('#anticipationVal').textContent=rideProfile.anticipation.toFixed(2)+'×';
  if($('#motionGainVal'))$('#motionGainVal').textContent=rideProfile.motionGain.toFixed(2)+'×';
  if($('#textSyncVal'))$('#textSyncVal').textContent=(rideProfile.textOffset>=0?'+':'')+rideProfile.textOffset.toFixed(2)+'s';
  const preset=ridePresetName();if($('#xpPresetRead'))$('#xpPresetRead').textContent=preset;
  document.querySelectorAll('[data-xp-preset]').forEach(b=>b.classList.toggle('on',b.dataset.xpPreset===preset));
  document.documentElement.dataset.foldBloomRideProfile=[rideProfile.solidity,rideProfile.immersion,rideProfile.dropGain,rideProfile.anticipation,rideProfile.motionGain,rideProfile.textOffset].map(x=>Number(x).toFixed(2)).join(':');
}


function save(){if(demo.preview)return;try{localStorage.setItem(STORE,JSON.stringify(snapshot(state)))}catch(_){}}
function load(){try{return restore(JSON.parse(localStorage.getItem(STORE)||'null'))}catch(_){return null}}
function haptic(ms=5){if(demo.preview)return;try{navigator.vibrate?.(ms)}catch(_){}}
function toast(text){const el=$('#toast');el.textContent=text;el.classList.remove('on');void el.offsetWidth;el.classList.add('on')}
function extrapolateSyntheticClock(track,now=performance.now()){
  if(!track?._pulseSeed||track._pulseClock!=='SYNTH'||!track.playing)return track;
  const bpm=Number(track.bpm)||0;if(!(bpm>0))return track;
  const period=60/bpm,dt=Math.max(0,(now-Number(track._receivedAt||now))/1000);
  const basePhase=Number(track.beatPhase)||0,total=basePhase+dt/period,steps=Math.floor(total);
  const beatPhase=((total%1)+1)%1,quantum=Math.max(1,Number(track.quantum)||4);
  const quantumPhase=(((Number(track.quantumPhase)||0)+dt/(period*quantum))%1+1)%1;
  return {...track,time:(Number(track.time)||0)+dt,beatIndex:(Number(track.beatIndex)||0)+steps,beatPhase,beatDistance:Math.min(beatPhase,1-beatPhase)*period,quantumPhase,sectionProgress:quantumPhase,sourceProgress:quantumPhase};
}
function timingNow(){
  if(!linkedTrack?.playing)return {timing:'FREE',timingMultiplier:1,label:'FREE'};
  const bpm=Number(linkedTrack.bpm)||0,period=bpm>0?60/bpm:0;
  let d=Number(linkedTrack.beatDistance);
  if(period>0&&Number.isFinite(Number(linkedTrack.beatPhase))&&Number.isFinite(Number(linkedTrack._receivedAt))){
    const dt=Math.max(0,(performance.now()-linkedTrack._receivedAt)/1000),phase=((Number(linkedTrack.beatPhase)+dt/period)%1+1)%1;
    d=Math.min(phase,1-phase)*period;
  }
  if(!Number.isFinite(d))return {timing:'FREE',timingMultiplier:1,label:'FREE'};
  d=Math.max(0,d);
  if(d<=.09)return {timing:'PERFECT',timingMultiplier:1.4,label:'PERFECT'};
  if(d<=.20)return {timing:'GOOD',timingMultiplier:1.18,label:'GOOD'};
  return {timing:'OPEN',timingMultiplier:1,label:'OPEN'};
}
function syncArc(track=linkedTrack,announce=false){
  const out=syncSectionArc(sectionArc,track);
  sectionArc=out.arc;
  renderer.setSectionArc(sectionArcView(sectionArc,track));
  if(announce&&out.event?.kind==='SECTION_CHANGE'){
    toast(out.event.previous?.sealed?`SECTION ${out.event.from+1} SEALED → ${out.event.to+1}`:`SECTION ${out.event.from+1} → ${out.event.to+1}`);
  }
  return out.event;
}
function currentForecast(){return forecastRelease(state)}
function callHit(f=currentForecast()){return forecastMatchesCall(state.call,f)}
function releaseLabel(){
  const f=currentForecast();
  if(!f)return `SEEK ${TYPE_NAMES[state.targetType]}`;
  const op=`${f.verb}${f.chain>1?' ×'+f.chain:''}`;
  return callHit(f)?`${op} · HIT CALL`:`${op} · RELEASE`;
}


function updateTextWitness(){
  const box=$('#lyric'),mode=$('#lyricMode'),body=$('#lyricText');
  const w=textOn&&liveTrack.active()?liveTrack.textWitness(undefined,rideProfile.textOffset):null;
  if(!w?.text){if(!box.hidden)box.hidden=true;lastTextKey='';return null}
  const key=[w.mode,w.alignment,w.start,w.text].join('|');
  if(key!==lastTextKey){
    lastTextKey=key;box.hidden=false;
    mode.textContent=w.mode==='TIMED'?((w.kind||'TEXT')+' · TIMED'):((w.kind||'TEXT')+' · FLOAT / UNALIGNED');
    body.textContent=String(w.text||'').slice(0,320);
  }
  return w;
}

function statusText(){
  const idx=gateCellIndex(state),c=state.cells[idx],f=currentForecast(),track=layerMode!=='SOURCE'&&linkedTrack?.playing?` · TRACK B${Math.max(0,linkedTrack.beatIndex)+1} ${timingNow().label} · ROAD ${deformationSummary(deformationTape,Number(linkedTrack.time)||0)}`:(liveTrack.sourceActive()?' · SOURCE PLAYBACK':'');
  const forecast=f?` · HERE ${f.verb}${f.chain>1?'×'+f.chain:''}${callHit(f)?' ✓':''}`:'';
  return `GATE ${String(idx).padStart(2,'0')} · ${TYPE_NAMES[c.type]} · CALL ${callLabel(state.call)} · ${state.creases.length} CREASE${state.creases.length===1?'':'S'}${forecast}${track}`;
}

function syncAutopilotUI(){
  const label=demo.on?'TAKE OVER':'AUTOPILOT';
  for(const id of ['#autoBtn','#demoSettingsBtn']){const el=$(id);if(!el)continue;el.textContent=label;el.classList.toggle('on',demo.on);el.setAttribute('aria-pressed',demo.on?'true':'false')}
  const intro=$('#demoBtn');if(intro)intro.textContent=demo.on?'TAKE OVER →':'AUTOPILOT →';
}

function update(){
  $('#flow').textContent=state.flow.toLocaleString();
  $('#chain').textContent=state.bestChain>1?state.bestChain+'×':'—';
  $('#target').textContent=TYPE_NAMES[state.targetType];
  $('#call').textContent=callLabel(state.call);
  $('#streak').textContent=state.callStreak>1?state.callStreak+'×':'—';
  $('#timing').textContent=layerMode!=='SOURCE'&&linkedTrack?.playing?timingNow().label:'—';
  $('#arc').textContent=layerMode==='SOURCE'?'SOURCE':sectionArcLabel(sectionArc,linkedTrack);
  $('#route').textContent=rideView(ride,latestWorld).label;
  $('#speed').textContent=latestWorld?`${Number(latestWorld.currentSpeed||1).toFixed(2)}×`:'—';
  const g=Number(latestWorld?.currentGrade)||0;$('#grade').textContent=!latestWorld?'—':Math.abs(g)<.08?'LEVEL':g>0?`UP ${Math.round(g*100)}`:`DOWN ${Math.round(Math.abs(g)*100)}`;
  $('#trackState').textContent=liveTrack.sourceActive()?trackStatus+(sourceLandmarks.length?` · ${sourceLandmarks.length} MARKS`:''):(externalTrack?`${externalTrack._pulseLabel||'FIELD'} PULSE`:'FIELD COURSE');
  $('#textBtn').textContent=textOn?'TEXT AUTO':'TEXT OFF';
  $('#trackToggle').disabled=!liveTrack.sourceActive();
  $('#trackToggle').textContent=liveTrack.sourceActive()?($('#trackAudio').paused?'PLAY SOURCE':'PAUSE SOURCE'):'PLAY / PAUSE';
  syncLayerUI();
  $('#mode').textContent=state.mode;
  $('#scene').textContent=state.scene;
  $('#modeBtn').textContent=state.mode;
  $('#sceneBtn').textContent=state.scene;
  $('#releaseBtn').disabled=!canRelease(state);
  $('#releaseBtn').textContent=canRelease(state)?releaseLabel():`SEEK ${TYPE_NAMES[state.targetType]}`;
  $('#chargeBar').style.width=`${Math.min(100,state.charge/1.75*100)}%`;
  $('#status').textContent=statusText();
  $('#soundBtn').textContent=audio.soundOn?'♪':'×';
  $('#build').textContent=`${VERSION} · AUDIO MAP × deformation tape × ride trace → traversable TRACKFIELD · ${deformationTape.length} road ops · ${ride.branchChoices} branch choices`;
  syncAutopilotUI();
  renderer.setDrag(dragAngle);
  save();
}

async function ensureAudio(){try{await audio.init();return true}catch(_){return false}}
function syncSoundGate(show){
  const gate=$('#soundGate');if(!gate)return;
  gate.hidden=!show;gate.setAttribute('aria-hidden',show?'false':'true');
}
async function enableFieldAudio(){
  audio.setSound(true);
  const ok=await ensureAudio();
  syncSoundGate(false);
  toast(ok?'FIELD COURSE · SOUND ON':'AUDIO UNAVAILABLE');
  update();
  return ok;
}
function audioFileOf(files){return [...(files||[])].find(f=>f?.type?.startsWith?.('audio/')||/\.(mp3|m4a|wav|flac|ogg|aac|webm|mp4)$/i.test(f?.name||''))||null}
async function refreshVault(){
  const select=$('#vaultSelect'),read=$('#vaultCount');if(!select)return [];
  vaultCache=(await listLocalMedia().catch(()=>[])).filter(x=>x?.blob).sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));
  select.innerHTML='<option value="">REMEMBERED TRACKS…</option>'+vaultCache.map(x=>`<option value="${String(x.sourceId).replaceAll('"','&quot;')}">${String(x.name||x.sourceId).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]))}</option>`).join('');
  if(read)read.textContent=String(vaultCache.length);
  const open=$('#vaultOpen');if(open)open.disabled=!vaultCache.length;
  return vaultCache;
}
async function retainLiveSource(files){
  const file=audioFileOf(files),meta=liveTrack.metadata();if(!file||!meta?.hash)return false;
  requestPersistentLocalStorage().catch(()=>false);
  await putLocalMedia({sourceId:'sha256:'+meta.hash,blob:file,name:file.name,type:file.type,size:file.size,lastModified:file.lastModified||0,meta:{origin:'LIVE',storedAt:new Date().toISOString()}}).catch(error=>console.warn('LIVE local vault store failed',error));
  await refreshVault();return true;
}
async function openVaultSource(){
  const id=$('#vaultSelect')?.value;if(!id)return;
  const record=await getLocalMedia(id).catch(()=>null);
  if(!record?.blob){toast('SAVED BYTES MISSING');await refreshVault();return}
  await loadLocalSong([localMediaFile(record)],{retain:false,label:'SAVED TRACK READY'});
}
async function loadLocalSong(files,{retain=true,label='CUSTOM SONG READY'}={}){
  if(!files||!files.length)return;
  stopDemo(false);
  try{
    deformationTape=[];sectionArc=createSectionArc();ride=createRideState();latestWorld=null;linkedTrack=null;externalTrack=null;lastLinkedBeat=-1;
    ensureAudio().catch(()=>false);trackStatus='DECODING';update();await liveTrack.loadFiles(files);
    if(retain)await retainLiveSource(files);
    layerMode='IMMERSION';renderer.setProfile(effectiveRideProfile());syncLayerUI();
    $('#intro').classList.remove('on');toast(label);update();
  }catch(error){console.warn(error);trackStatus='SONG ERROR';toast('SONG DECODE ERROR');update()}
}
async function enterCenterMass(){
  stopDemo(false);
  try{
    trackStatus='OPENING CENTER MASS · SOURCE';
    liveTrack.loadStream({url:CENTER_MASS_URL,name:'CENTER MASS (Work-Trance Cut)',title:'CENTER MASS (Work-Trance Cut)',artist:'stgoh',sourceAddress:CENTER_MASS_SOURCE,sourceKind:'SUNO',provider:'SUNO'});
    layerMode='SOURCE';renderer.setProfile(effectiveRideProfile());audio.setSound(false);syncLayerUI();
    trackStatus='READY · SOURCE · CENTER MASS';$('#intro').classList.remove('on');update();
    await liveTrack.toggle().catch(()=>false);
    update();toast($('#trackAudio').paused?'CENTER MASS READY · TAP PLAY':'CENTER MASS · SOURCE');
  }catch(error){console.warn(error);trackStatus='SOURCE ERROR';toast('CENTER MASS SOURCE BLOCKED');update()}
}

function steerRide(dir){
  const out=chooseRideBranch(ride,dir,latestWorld,Number(linkedTrack?.time)||0);
  ride=out.state;
  if(out.event&&!demo.preview){
    toast(`ROUTE · ${out.event.label}`);
    haptic(7);
    fieldPulse.publish('operation',{operation:'BRANCH',branch:out.event.label,direction:out.event.direction,splitId:out.event.splitId,trackTime:linkedTrack?.time??null});
  }
  return out.event;
}
function step(dir,count=1){
  const n=Math.max(1,Math.min(8,Math.abs(count|0)));
  steerRide(dir);
  for(let i=0;i<n;i++){
    state=rotateSteps(state,dir);
    audio.ratchet(dir,state.charge);
    haptic(state.mode==='RATCHET'?4:2);
  }
  audio.setMotion(state.rotation, Math.min(1,n*.24));
  update();
  if(state.mode==='FLOW' && canRelease(state)) doRelease();
}

async function doRelease(){
  if(!canRelease(state)) return;
  await ensureAudio();
  const out=release(state,timingNow()); if(!out.event)return;
  state=out.state;
  deformationTape=appendReleaseDeformations(deformationTape,out.event,linkedTrack);
  const arcOut=observeSectionRelease(sectionArc,out.event,linkedTrack);
  sectionArc=arcOut.arc;
  if(arcOut.bonus){
    state.flow+=arcOut.bonus;
    const last=state.history[state.history.length-1];
    if(last)last.sectionArc={sectionIndex:sectionArc.sectionIndex,sealed:true,bonus:arcOut.bonus,hits:sectionArc.hits,verbs:[...sectionArc.verbs]};
  }
  renderer.setSectionArc(sectionArcView(sectionArc,layerMode==='SOURCE'?null:linkedTrack));
  audio.release(out.event); renderer.pulse(out.event); haptic(Math.min(34,7+out.event.chain*3+(out.event.callMet?3:0)+(arcOut.bonus?5:0)));
  fieldPulse.publish('operation',{operation:out.event.verb,cadence:out.event.cadence,operations:out.event.operations,slot:out.event.slot,type:out.event.typeName,chain:out.event.chain,charge:out.event.charge,power:out.event.power,scene:out.event.scene,call:out.event.call,callMet:out.event.callMet,timing:out.event.timing,flowGain:out.event.flowGain,sectionIndex:linkedTrack?.sectionIndex??null,sectionProgress:linkedTrack?.sectionProgress??null,sectionSeal:arcOut.event?.kind==='SECTION_SEAL',sectionBonus:arcOut.bonus||0,trackTime:linkedTrack?.time??null,trackBeat:linkedTrack?.beatIndex??null,trackDeformationCount:deformationTape.length});
  const timing=out.event.timing&&out.event.timing!=='FREE'?' · '+out.event.timing:'';
  const arc=arcOut.bonus?` · SECTION SEALED +${arcOut.bonus}`:'';
  const road=linkedTrack?` · ROAD ${out.event.operations.join('→')}`:'';
  toast(`${out.event.callMet?'CALL ✓':'OPEN'} · ${out.event.verb}${out.event.chain>1?' ×'+out.event.chain:''}${timing}${arc}${road}`); dragAngle=0; update();
}

function toggleMode(){state=setMode(state,state.mode==='RATCHET'?'FLOW':'RATCHET');toast(state.mode);update()}
function cycleScene(){const names=audio.sceneNames(),i=names.indexOf(state.scene),name=names[(i+1)%names.length];state=setScene(state,name);audio.setScene(name);renderer.setScene(name);toast(`WORLD · ${name}`);update()}

function stopDemo(takeover=false){
  if(!demo.on)return;
  const wasPreview=demo.preview,start=demo.startState,startRide=demo.startRide,startTape=demo.startTape,startArc=demo.startArc;
  demo.on=false;clearTimeout(demo.timer);demo.timer=0;document.documentElement.dataset.foldBloomIdle='off';document.documentElement.dataset.foldBloomAutopilot='off';
  if(wasPreview&&start){const restored=restore(start);if(restored)state=restored;if(startRide)ride={...startRide,trace:(startRide.trace||[]).map(x=>({...x}))};if(startTape)deformationTape=startTape.map(x=>({...x}));if(startArc)sectionArc={...startArc,verbs:[...(startArc.verbs||[])]};dragAngle=0;renderer.setDrag(0)}
  demo.preview=false;demo.startState=null;demo.startRide=null;demo.startTape=null;demo.startArc=null;
  update();
  if(takeover)toast('YOUR TURN');
}
async function demoTick(){
  if(!demo.on)return;
  const rv=rideView(ride,latestWorld);
  if(rv.opportunity&&!rv.choice){
    const dir=demo.releases%2===0?-1:1;
    steerRide(dir);
  }
  const forecast=currentForecast();
  if(canRelease(state) && callHit(forecast)){
    if(demo.preview){
      const out=release(state,{timing:'FREE',timingMultiplier:1});
      if(out.event){state=out.state;deformationTape=appendReleaseDeformations(deformationTape,out.event,linkedTrack);renderer.pulse(out.event)}
    }else await doRelease();
    demo.releases++;
    if(!demo.preview&&demo.releases%3===0)cycleScene();
    if(demo.releases>=12){
      if(demo.preview&&$('#intro').classList.contains('on')){
        const restored=restore(demo.startState);if(restored)state=restored;
        if(demo.startRide)ride={...demo.startRide,trace:(demo.startRide.trace||[]).map(x=>({...x}))};
        if(demo.startTape)deformationTape=demo.startTape.map(x=>({...x}));
        if(demo.startArc)sectionArc={...demo.startArc,verbs:[...(demo.startArc.verbs||[])]};
        demo.releases=0;dragAngle=0;renderer.setDrag(0);update();demo.timer=setTimeout(demoTick,780);return
      }
      stopDemo(false);toast('AUTOPILOT RETURN · YOUR TURN');return
    }
    update();demo.timer=setTimeout(demoTick,demo.preview?520:620);
  }else{
    if(demo.preview&&state.mode==='FLOW'){
      const bend=Number(latestWorld?.currentBend)||0,beat=Number(linkedTrack?.beatIndex)||0;
      const dir=Math.abs(bend)>.12?Math.sign(bend):(beat%2?1:-1);
      state=rotateSteps(state,dir||1);
      audio.setMotion(state.rotation,.35);
      update();
      demo.timer=setTimeout(demoTick,105);
    }else{
      step(1);demo.timer=setTimeout(demoTick,demo.preview?210:270);
    }
  }
}
async function startDemo({preview=true,playTrack=false}={}){
  // AUTOPILOT is a witness projection: always snapshot/restore authored state.
  preview=true;
  if(playTrack&&liveTrack.active()&&$('#trackAudio').paused)await liveTrack.toggle().catch(()=>{});

  if(demo.on)return;
  if(!preview)await ensureAudio();
  const startState=snapshot(state);
  demo={on:true,timer:0,releases:0,preview,startState,startRide:{...ride,trace:(ride.trace||[]).map(x=>({...x}))},startTape:deformationTape.map(x=>({...x})),startArc:{...sectionArc,verbs:[...(sectionArc.verbs||[])]}};
  document.documentElement.dataset.foldBloomIdle='on';document.documentElement.dataset.foldBloomAutopilot='on';
  if(!$('#intro').classList.contains('on'))toast(liveTrack.active()?'AUTOPILOT · SOURCE CLOCK / NO AUTHORSHIP':'AUTOPILOT · WITNESS ONLY')
  update();demoTick();
}

function pointDown(e){
  if($('#intro').classList.contains('on')||$('#settings').classList.contains('on'))return;
  stopDemo(true);dragging=true;startX=lastX=e.clientX;stepAccum=0;lastT=performance.now();cv.setPointerCapture?.(e.pointerId);ensureAudio();
}
function pointMove(e){
  if(!dragging)return;e.preventDefault();const now=performance.now(),dx=e.clientX-lastX,total=e.clientX-startX,threshold=Math.max(20,innerWidth*.045),dir=Math.sign(dx)||1;
  if(state.mode==='RATCHET'){
    stepAccum+=dx;
    while(Math.abs(stepAccum)>=threshold){const d=stepAccum>0?1:-1;step(d);stepAccum-=d*threshold}
    dragAngle=(stepAccum/threshold)*(Math.PI*2/N);
  }else{
    dragAngle=(total/Math.max(innerWidth,360))*Math.PI*2*.95;
    audio.setMotion(state.rotation + dragAngle/(Math.PI*2/N), Math.min(1,Math.abs(dx)/Math.max(1,now-lastT)*10));
  }
  lastX=e.clientX;lastT=now;renderer.setDrag(dragAngle)
}
function pointUp(e){
  if(!dragging)return;dragging=false;
  if(state.mode==='FLOW'){
    const stepAngle=Math.PI*2/N,delta=Math.round(dragAngle/stepAngle);if(delta){steerRide(Math.sign(delta));state=rotateSteps(state,delta)}dragAngle=0;audio.setMotion(state.rotation,0);update();if(canRelease(state))doRelease();
  }else{dragAngle=0;renderer.setDrag(0);update()}
}
cv.addEventListener('pointerdown',pointDown);cv.addEventListener('pointermove',pointMove);cv.addEventListener('pointerup',pointUp);cv.addEventListener('pointercancel',pointUp);

$('#releaseBtn').onclick=()=>{stopDemo(true);doRelease()};$('#modeBtn').onclick=()=>{stopDemo(true);toggleMode()};$('#sceneBtn').onclick=()=>{stopDemo(true);cycleScene()};
$('#soundBtn').onclick=async()=>{if(!audio.ctx){await enableFieldAudio();return}audio.setSound(!audio.soundOn);syncSoundGate(false);update()};
$('#menuBtn').onclick=()=>$('#settings').classList.toggle('on');$('#closeSettings').onclick=()=>$('#settings').classList.remove('on');
$('#vol').value=Math.round(audio.volume*100);$('#vol').oninput=e=>audio.setVolume(+e.target.value/100);
$('#trackVol').value=Math.round($('#trackAudio').volume*100);$('#trackVol').oninput=e=>liveTrack.setVolume(+e.target.value/100);
$('#trackLoad').onclick=()=>{stopDemo(true);$('#trackFile').click()};$('#songIntroBtn').onclick=()=>{stopDemo(false);$('#trackFile').click()};
$('#centerMassBtn')?.addEventListener('click',()=>{void enterCenterMass()});$('#centerMassSettingsBtn')?.addEventListener('click',()=>{void enterCenterMass()});
$('#vaultOpen')?.addEventListener('click',()=>{void openVaultSource()});
$('#trackFile').onchange=e=>loadLocalSong(e.target.files);
$('#trackToggle').onclick=()=>{stopDemo(true);liveTrack.toggle().then(()=>update()).catch(()=>toast('SONG PLAY BLOCKED'))};
$('#textBtn').onclick=()=>{textOn=!textOn;lastTextKey='';updateTextWitness();update()};
const tune=(id,key,scale=100)=>{const el=$(id);if(!el)return;el.oninput=e=>{rideProfile=normalizeRideProfile({...rideProfile,[key]:Number(e.target.value)/scale});saveRideProfile();lastTextKey='';updateTextWitness();update()}};
tune('#solidTune','solidity');tune('#immersionTune','immersion');tune('#anticipationTune','anticipation');tune('#motionGainTune','motionGain');tune('#dropGainTune','dropGain');tune('#textSyncTune','textOffset');
document.querySelectorAll('[data-xp-preset]').forEach(b=>b.onclick=()=>applyRidePreset(b.dataset.xpPreset));
document.querySelectorAll('[data-layer-mode]').forEach(b=>b.onclick=()=>applyLayerMode(b.dataset.layerMode));
$('#listenBtn').onclick=()=>window.open('../listen/','fold-bloom-listen');
$('#exportBtn').onclick=()=>{
  const packet={kind:'FOLD_BLOOM_LIVE_RETURN',version:VERSION,created:new Date().toISOString(),source:{foldWeave:'/recovery/fold-bloom/fold-weave-0.1/',twoDial:'/fold-bloom/two-dial/'},state:snapshot(state),performance:{sectionArc,deformationTape,ride:{...ride,trace:(ride.trace||[]).map(x=>({...x}))}}};
  const blob=new Blob([JSON.stringify(packet,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`fold-bloom-live-${Date.now()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('RETURN EXPORTED')
};
function resetLiveState({silent=false}={}){stopDemo(false);state=createState();sectionArc=createSectionArc();deformationTape=[];ride=createRideState();latestWorld=null;practiceTrack.reset();audio.hydrate(state);renderer.setScene(state.scene);syncRideProfile();dragAngle=0;update();if(!silent)toast('NEW FIELD');return snapshot(state)}
$('#resetBtn').onclick=()=>{const now=Date.now(),b=$('#resetBtn');if(!b.dataset.arm||now>+b.dataset.arm){b.dataset.arm=now+3500;b.textContent='CONFIRM RESET';toast('PRESS AGAIN');return}delete b.dataset.arm;b.textContent='NEW FIELD';resetLiveState()};
$('#playBtn').onclick=async()=>{stopDemo(false);await enableFieldAudio();$('#intro').classList.remove('on');update()};
$('#mutePlay').onclick=()=>{stopDemo(false);$('#intro').classList.remove('on');audio.setSound(false);syncSoundGate(false);update()};
$('#soundGate')?.addEventListener('click',()=>{void enableFieldAudio()});
const toggleAutopilot=async()=>{
  if(demo.on){stopDemo(true);return}
  if(audio.soundOn)await ensureAudio();
  syncSoundGate(false);
  startDemo({preview:true,playTrack:true});
};
$('#demoBtn').onclick=toggleAutopilot;$('#demoSettingsBtn')?.addEventListener('click',toggleAutopilot);$('#autoBtn')?.addEventListener('click',toggleAutopilot);

addEventListener('keydown',e=>{
  if(e.repeat)return;
  if(e.key.toLowerCase()==='d'){e.preventDefault();if(demo.on)stopDemo(true);else startDemo({preview:true,playTrack:true});return}
  stopDemo(true);
  if(e.key==='ArrowLeft'){e.preventDefault();step(-1)}
  else if(e.key==='ArrowRight'){e.preventDefault();step(1)}
  else if(e.code==='Space'||e.key==='Enter'){e.preventDefault();doRelease()}
  else if(e.key.toLowerCase()==='r')toggleMode();
  else if(e.key.toLowerCase()==='s')cycleScene();
  else if(e.key.toLowerCase()==='m'){audio.setSound(!audio.soundOn);update()}
  else if(e.key==='Escape')$('#settings').classList.toggle('on');
});

fieldPulse.subscribe(msg=>{
  const clock=transportDescriptor(msg);
  if(!clock||liveTrack.active())return;
  externalTrack=msg.data?{...msg.data,_receivedAt:performance.now(),_pulseLabel:clock.label,_pulseSource:clock.source,_pulseClock:clock.clock}:null;
  linkedTrack=externalTrack;
  syncArc(linkedTrack,true);
  const beat=Number(linkedTrack?.beatIndex);
  if(Number.isFinite(beat)&&beat>=0&&beat!==lastLinkedBeat){lastLinkedBeat=beat;renderer.beatPulse(beat,Number(linkedTrack.energy)||0)}
  update();
});

const pulseHandoff=fieldPulse.last(),pulseHandoffClock=transportDescriptor(pulseHandoff);
if(new URLSearchParams(location.search).get('from')==='field-lab'&&pulseHandoffClock?.source==='FOLD_BLOOM_FIELD_LAB'){
  externalTrack={...pulseHandoff.data,playing:true,_receivedAt:performance.now(),_pulseLabel:pulseHandoffClock.label,_pulseSource:pulseHandoffClock.source,_pulseClock:pulseHandoffClock.clock,_pulseSeed:true};
  linkedTrack=externalTrack;
}

document.addEventListener('visibilitychange',()=>{if(document.hidden){stopDemo(false);audio.stop()}else if(audio.ctx)audio.start()});
function loop(t){
  const frameMs=Math.max(1,t-lastLoopT);lastLoopT=t;perf.emaMs+=(frameMs-perf.emaMs)*.055;perf.fps=1000/Math.max(1,perf.emaMs);
  const dt=Math.max(0,Math.min(.12,frameMs/1000||.016)),modelSlices=innerWidth<620?46:56;
  const local=liveTrack.transport(),sourceOnly=liveTrack.sourceActive()&&!liveTrack.mapped();
  const externalFresh=!!(externalTrack&&(externalTrack._pulseSeed||t-Number(externalTrack._receivedAt||0)<1800));
  let baseWorld=null;
  if(local){
    linkedTrack=local;baseWorld=liveTrack.trackfield(13.5,modelSlices);
  }else if(sourceOnly){
    linkedTrack=null;baseWorld=null;
  }else if(externalFresh){
    linkedTrack=extrapolateSyntheticClock(externalTrack,t);
  }else{
    if(externalTrack&&!externalFresh)externalTrack=null;
    linkedTrack=practiceTrack.transport(t);baseWorld=practiceTrack.trackfield(13.5,modelSlices,t);
  }
  if(linkedTrack){
    syncArc(linkedTrack,true);
    const beat=Number(linkedTrack.beatIndex);
    if(Number.isFinite(beat)&&beat>=0&&beat!==lastLinkedBeat){lastLinkedBeat=beat;renderer.beatPulse(beat,Number(linkedTrack.energy)||0)}
    deformationTape=pruneDeformationTape(deformationTape,Number(linkedTrack.time)||0);
  }
  latestWorld=layerMode==='SOURCE'?null:(baseWorld?applyDeformations(baseWorld,deformationTape):null);
  const drop=latestWorld?.drop;
  if(drop&&Number(drop.ahead)>=0&&Number(drop.ahead)<=.28&&drop.id!==lastDropHapticId){
    lastDropHapticId=drop.id;
    haptic(Math.round(14+26*(Number(drop.strength)||0)));
  }
  ride=advanceRide(ride,latestWorld,dt,Number(linkedTrack?.time)||0);
  const rv=rideView(ride,latestWorld);
  renderer.setRide(rv);
  if(t-lastHudAt>100){
    lastHudAt=t;
    $('#route').textContent=rv.label;
    $('#speed').textContent=latestWorld?Number(latestWorld.currentSpeed||1).toFixed(2)+'×':'—';
    const grade=Number(latestWorld?.currentGrade)||0;$('#grade').textContent=!latestWorld?'—':Math.abs(grade)<.08?'LEVEL':grade>0?'UP '+Math.round(grade*100):'DOWN '+Math.round(Math.abs(grade)*100);
    const source=liveTrack.sourceActive()?(liveTrack.mapped()?'MAPPED_AUDIO':'SOURCE_ONLY'):externalFresh?'FIELD_PULSE':'FIELD_PRACTICE';
    document.documentElement.dataset.trackfieldSource=source;
    document.documentElement.dataset.trackfieldMotion=latestWorld?`${Number(latestWorld.currentSpeed||1).toFixed(2)}:${Number(latestWorld.currentGrade||0).toFixed(2)}:${Number(latestWorld.currentBend||0).toFixed(2)}`:'NONE';
    document.documentElement.dataset.foldBloomPerf=`${perf.fps.toFixed(0)}fps:${modelSlices}slices`;
    const pe=$('#perfState');if(pe)pe.textContent=`PERF · ${perf.fps.toFixed(0)} FPS · ${modelSlices} MODEL SLICES · MODEL ≤36 HZ`;
  }
  renderer.setTrackfield(latestWorld);
  updateTextWitness();
  renderer.setSectionArc(sectionArcView(sectionArc,layerMode==='SOURCE'?null:linkedTrack));
  renderer.draw(state,t);raf=requestAnimationFrame(loop)
}raf=requestAnimationFrame(loop);
syncRideProfile();syncLayerUI();refreshVault();update();
document.documentElement.dataset.foldBloomLive='ready';document.documentElement.dataset.foldBloomPov='embodied-v0.4';document.documentElement.dataset.foldBloomMacroDrop='v0.2';document.documentElement.dataset.foldBloomIdleLaw='witness-v0.1';document.documentElement.dataset.foldBloomIdle='off';document.documentElement.dataset.foldBloomAutopilot='off';document.documentElement.dataset.foldBloomLandmarks='0';
window.FoldBloomLive={boot:'ready',version:VERSION,state:()=>({...snapshot(state),linkedTrack,sectionArc,deformationTape,ride,trackfield:latestWorld,textWitness:liveTrack.textWitness(undefined,rideProfile.textOffset),sourceMeta:liveTrack.metadata(),rideProfile:{...rideProfile},layerMode,autopilot:demo.on,perf:{fps:+perf.fps.toFixed(1),modelSlices:innerWidth<620?46:56}}),loadFiles:loadLocalSong,openCenterMass:enterCenterMass,refreshVault,release:doRelease,step,forecast:()=>currentForecast(),timing:()=>timingNow(),sectionArc:()=>sectionArcView(sectionArc,linkedTrack),trackfield:()=>latestWorld,deformations:()=>deformationTape.map(x=>({...x})),ride:()=>rideView(ride,latestWorld),layers:{apply:applyLayerMode,current:()=>layerMode},autopilot:{start:()=>startDemo({preview:true,playTrack:true}),stop:()=>stopDemo(true),toggle:toggleAutopilot},profile:{apply:applyRidePreset,current:()=>({...rideProfile}),name:()=>ridePresetName()},reset:resetLiveState,practice:()=>practiceTrack.map};
const launchParams=new URLSearchParams(location.search),launchPreset=String(launchParams.get('profile')||'').toUpperCase(),launchLayer=String(launchParams.get('layer')||'').toUpperCase(),launchSource=String(launchParams.get('source')||'').toLowerCase();
if(RIDE_PRESETS[launchPreset])applyRidePreset(launchPreset,false);
if(['SOURCE','MAP','IMMERSION'].includes(launchLayer))applyLayerMode(launchLayer,false);
if(launchSource==='center-mass'){document.documentElement.dataset.foldBloomLaunch='center-mass';setTimeout(()=>{void enterCenterMass()},80)}
else if(launchParams.get('demo')==='1'){document.documentElement.dataset.foldBloomLaunch='demo';setTimeout(()=>{$('#intro').classList.remove('on');syncSoundGate(!audio.ctx);startDemo({preview:true});toast('FIELD COURSE · TAP FOR SOUND')},180)}
else setTimeout(()=>{if($('#intro').classList.contains('on')&&!demo.on)startDemo({preview:true})},650);
