import { VERSION, createState, restore, snapshot, rotateSteps, release, canRelease, setMode, setScene, gateCellIndex, isAligned, forecastRelease, forecastMatchesCall, callLabel, typePresentation, forecastContext, clamp, N } from './engine.js?v=0.13.2';
import { FoldBloomAudio, MIX_PARTS } from './audio.js?v=0.14';
import { Renderer } from './render.js?v=0.13.9';
import { createFieldPulse, transportDescriptor } from '../../lib/field-pulse.js';
import { $ } from '../../lib/dom.js';
import { LiveTrack } from './track.js';
import { createSectionArc, syncSectionArc, observeSectionRelease, sectionArcLabel, sectionArcView } from './section-arc.js';
import { appendReleaseDeformations, applyDeformations, pruneDeformationTape, deformationSummary } from './track-deform.js';
import { createRideState, chooseRideBranch, advanceRide, rideView } from './ride.js';
import { PracticeTrack } from './practice-track.js?v=0.2';
import { normalizePins } from '../listen/stream-lens.js';
import {normalizeRideProfile,profileKey,normalizeVisualScene,scenePresentation} from './visual-worlds.js?v=0.3';
import {putLocalMedia,getLocalMedia,listLocalMedia,localMediaFile,hasLocalMedia,requestPersistentLocalStorage} from '../local-media-store.js';
import {hashFile} from '../../lib/id.js';
import {IMAGE_GRAINS,IMAGE_SET_STORAGE,IMAGE_DWELL_SECONDS,isImageRecord,makeImageCourse,imageCourseAddressAt,stepImageCourse,createImageClock,imageSetProgress,imageSetSeconds,makeImageSetManifest,normalizeImageSetManifest,normalizeImageSetRegistry,imageCourseSummary} from './image-course.js?v=0.1';
import {mapCourse,stepCourse,courseStrip,courseAddressAt} from '../course-nav.js';
import {liveSteeringPreview,manualSteeringPulse} from './steering-preview.js';
import {buildLiveCalculation,liveCalculationSummary,forecastSeekDelta} from './live-calculus.js?v=0.2';
import {READ_GRAINS,READ_RIDE_STORAGE,READ_RETURN_STORAGE,makeReadRidePacket,normalizeReadRidePacket,makeReadCourse,readCourseAddressAt,stepReadCourse,readCourseWitness,makeReadReturnWitness,initialReadProgress,packetFromLocalFile} from '../read-course.js';
import {loadAuthoredPack,nextRecurrence,readerStats} from './authored-reader.js';

const STORE='fb-live-0.1';
const cv=$('#field'), renderer=new Renderer(cv);
function normalizeLoadedState(s){
  if(!s)return null;
  const scene=normalizeVisualScene(s.scene);
  return scene===s.scene?s:{...s,scene};
}
let state=normalizeLoadedState(load()) || createState();
let dragging=false,startX=0,startY=0,lastX=0,stepAccum=0,pointerTravel=0,lastT=0,dragAngle=0,raf=0;
let demo={on:false,timer:0,releases:0,preview:false,startState:null,startRide:null,startTape:null,startArc:null};
const audio=new FoldBloomAudio(step=>renderer.beatPulse(step));
const fieldPulse=createFieldPulse('FOLD_BLOOM_LIVE');
let linkedTrack=null,externalTrack=null,lastLinkedBeat=-1,trackStatus='FIELD COURSE',sectionArc=createSectionArc(),deformationTape=[],ride=createRideState(),latestWorld=null,lastLoopT=performance.now(),lastHudAt=0,sourceLandmarks=[],textOn=true,lastTextKey='',lastDropHapticId=null,rideProfile=normalizeRideProfile(),layerMode='IMMERSION',vaultCache=[],publicDemoReady=false,publicDemoLoading=null,courseMode='FLOW',courseGrain='PHRASE',lastCoursePaint=-1,steeringPulse=null,steeringView=null,readRide=null,readEcho=null,readEchoThread=null,authoredReader=null,gardenOpen=false,gardenReturn=null,perf={emaMs:16.7,fps:60,modelHz:0};
// IMAGE SET — the third addressed source, beside audio and addressed text. The BYTES
// never pass through here: they stay in the browser vault keyed by sha256. What lives
// here is the declaration, the course built from its metadata, and the clock that lets
// FLOW advance the address when no audio source exists to drive it.
let imageSet=null,imageRegistry=[],imageUrlCache=new Map(),imageUrlPending=new Map(),imageStageKey='',imageTrailKey='',imageTick=0;
// The addressed readout must not depend on the render loop. rAF is throttled in
// headless and in a backgrounded tab, while the set clock keeps running on
// performance.now(); without this the address would move but the readout would not.
// This is a 4 Hz readout tick, not a second render loop.
function startImageTicker(){
  if(imageTick)return imageTick;
  imageTick=setInterval(()=>{if(!imageSet)return;syncImageStage();syncImageSetReadouts()},250);
  return imageTick;
}
const CENTER_MASS_SOURCE='2b09a703-1881-4471-bf65-cc51c976d32c';
const CENTER_MASS_URL='https://cdn1.suno.ai/'+CENTER_MASS_SOURCE+'.mp3';
const PUBLIC_DEMO_URL='./demo/center-mass-demo.mp3';
const RIDE_PRESETS=Object.freeze({
  NORMAL:{solidity:1,immersion:1,dropGain:1,anticipation:1,motionGain:1},
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
  const law=$('#layerLaw');
  if(law)law.textContent=readRide
    ?'SOURCE = exact session text. MAP = addressed SENTENCE / PARAGRAPH / SECTION structure. IMMERSION = MAP + LIVE field response. READFIELD/source authority does not move into LIVE.'
    :'SOURCE = original audio. MAP = measured BEAT / PHRASE / SECTION terrain. IMMERSION = MAP + experience response. FIELD synth remains an explicit opt-in.';
  const back=$('#readfieldReturn'),mark=$('#readTrailMark');
  if(back){back.hidden=!readRide?.packet?.returnAddress;back.textContent='↩ '+(readRide?.packet?.sourceIdentity?.authority==='READFIELD'?'READFIELD':'SOURCE')}
  if(mark){
    mark.hidden=!readRide;const t=readTrailSnapshot(),trailState=t?.storageState||'NO_IDENTITY',writable=['EMPTY','READY'].includes(trailState);
    mark.disabled=!!readRide&&!writable;
    mark.textContent=readRide?(writable?('MARK HERE'+(t?.marks?.length?' · '+t.marks.length:'')):('MARK · '+trailState)):'MARK HERE';
    document.documentElement.dataset.foldBloomReadTrail=String(trailState).toLowerCase();
  }
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
  if(layerMode!=='IMMERSION')audio.setSound(false);
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
const VIBE_ORDER=['NORMAL','DRIVE','TRANCE','SOFT'];
function syncVibeQuick(){
  const b=$('#vibeQuick');if(!b)return;
  const p=ridePresetName();b.textContent='VIBE · '+(p==='CUSTOM'?'CUSTOM':p);
  b.dataset.vibe=p;
}
function cycleVibe(){
  stopDemo(true);
  const current=ridePresetName(),i=VIBE_ORDER.indexOf(current),next=VIBE_ORDER[(i<0?0:i+1)%VIBE_ORDER.length];
  applyRidePreset(next,true);renderer.setProfile(effectiveRideProfile());syncVibeQuick();update();
}
const practiceTrack=new PracticeTrack();
const liveTrack=new LiveTrack($('#trackAudio'),{
  onState:t=>{trackStatus=t;update()},
  onMap:m=>{syncSourceLandmarks(m);syncRideProfile(m);if(m)toast(m?.stage==='DEEP'?'SONG MAP · DEEP':'SONG MAP · PREVIEW')}
});
liveTrack.setVolume(.78);
const AUDIO_COURSE_GRAINS=['BEAT','PHRASE','SECTION'];
function activeCourseGrains(){return readRide?[...READ_GRAINS]:imageSet?[...IMAGE_GRAINS]:AUDIO_COURSE_GRAINS}
function readRideCourse(){
  if(!readRide)return null;
  if(!readRide.course||readRide.course.grain!==courseGrain)readRide.course=makeReadCourse(readRide.packet,{grain:courseGrain});
  return readRide.course;
}
function rebuildImageCourse(grain=courseGrain){
  if(!imageSet)return null;
  imageSet.course=makeImageCourse(imageSet.entries,{grain,setKey:imageSet.setKey,dwell:imageSet.dwell,label:imageSet.label,loop:imageSet.loop!==false});
  return imageSet.course;
}
// ONE addressed source at a time, resolved the same way for all three kinds.
function liveCourse(){
  if(readRide)return readRideCourse();
  if(imageSet)return imageSet.course;
  return liveTrack.mapped()?mapCourse(liveTrack.map,{grain:courseGrain}):null;
}
function exactReadVisit(hit){
  const p=hit?.point;if(!readRide||!p)return null;
  return {source_id:readRide.packet.sourceIdentity?.id||'',start:Number(p.start),end:Number(p.end),grain:String(p.kind||courseGrain),address:String(hit.address||p.address||'')};
}
function recordExactReadVisit(hit,{reset=false}={}){
  if(!readRide)return null;const v=exactReadVisit(hit);if(!v)return null;
  if(reset){readRide.origin=v;readRide.visited=[v];return v}
  const last=readRide.visited?.at(-1);
  if(!last||last.start!==v.start||last.end!==v.end||last.grain!==v.grain)readRide.visited=[...(readRide.visited||[]),v].slice(-64);
  return v
}
function resetExactReadTrail(){
  if(!readRide)return null;const course=readRideCourse(),hit=readCourseAddressAt(course,readRide.progress);return recordExactReadVisit(hit,{reset:true})
}
function liveCourseProgress(){
  if(readRide)return Math.max(0,Math.min(1,Number(readRide.progress)||0));
  // A set clock exists without audio. This is the whole point: FLOW has something to
  // read even when nothing is playing, so the address moves with no tap.
  if(imageSet)return imageSetProgress(imageSet.course,imageSet.clock);
  const duration=Number(liveTrack.map?.duration)||0;
  return duration>0?Math.max(0,Math.min(1,(Number($('#trackAudio')?.currentTime)||0)/duration)):0;
}
function courseAddress(course,p){
  return readRide?readCourseAddressAt(course,p):courseAddressAt(course,p);
}
function courseStep(course,p,delta){
  if(readRide)return stepReadCourse(course,p,delta);
  if(imageSet)return stepImageCourse(course,p,delta,{loop:imageSet.course?.loop!==false});
  return stepCourse(course,p,delta);
}
function courseModeLabel(value=courseMode){return value==='RELEASE_STEP'?'RELEASE→STEP':value}
function courseModeLaw(value=courseMode){
  if(readRide){
    if(value==='RELEASE_STEP')return 'RELEASE writes LIVE consequence → then advances exactly one '+courseGrain+' address. The text source itself is never rewritten.';
    return 'STEP changes only the addressed '+courseGrain+' witness. RELEASE writes LIVE consequence and holds the text address.';
  }
  if(imageSet){
    const dwell=Number(imageSet.course?.dwell)||IMAGE_DWELL_SECONDS;
    if(value==='RELEASE_STEP')return 'RELEASE writes LIVE consequence → then advances exactly one '+courseGrain+' address of the set. The set clock stays held.';
    if(value==='STEP')return '← / → or map tap moves exactly one '+courseGrain+' address. The set clock is held; the declared images are never re-picked.';
    return 'SET CLOCK advances address continuously — one '+courseGrain+' every '+dwell+'s, cycling at the seam. No audio source required. RELEASE writes LIVE consequence but never seeks the set.';
  }
  if(value==='RELEASE_STEP')return 'RELEASE writes LIVE consequence → then advances exactly one '+courseGrain+' address. Source playback stays paused.';
  if(value==='STEP')return '← / → or map tap moves exactly one '+courseGrain+' address. RELEASE writes LIVE consequence and holds the source address.';
  return 'SOURCE CLOCK advances address continuously. RELEASE writes LIVE consequence but never seeks the source.';
}
function traversalCalculationInput(){
  const course=liveCourse();if(!course)return null;
  const p=liveCourseProgress(),hit=courseAddress(course,p),next=courseMode==='RELEASE_STEP'?courseStep(course,p,1):null;
  return {
    mode:courseMode,grain:courseGrain,address:hit?.address||null,index:hit?.index??null,count:course.points?.length||0,
    next_address:courseMode==='RELEASE_STEP'?(next?.address||null):null,
    policy:courseMode==='RELEASE_STEP'?'RELEASE_THEN_ONE_ADDRESS':courseMode==='STEP'?'MANUAL_ADDRESS_ONLY':'SOURCE_CLOCK',
    law:courseModeLaw()
  };
}
function syncCourseControls(){
  const mode=$('#courseMode'),grain=$('#courseGrain'),address=$('#courseAddress'),quick=$('#courseQuick'),witness=$('#courseWitness'),law=$('#courseLaw'),course=liveCourse(),p=liveCourseProgress();
  const label=courseModeLabel();
  if(mode){mode.textContent=label;mode.classList.toggle('on',courseMode==='STEP'||courseMode==='RELEASE_STEP')}
  if(grain)grain.textContent=courseGrain;
  const hit=course?courseAddress(course,p):null,empty=readRide?'read://empty':imageSet?'course://image_set/empty':'course://audio_map/empty',count=course?.points?.length||0,index=hit?.index??-1;
  if(address)address.textContent=hit?.address||empty;
  if(witness)witness.textContent=course?(label+' · '+courseGrain+' · '+Math.max(1,index+1)+' / '+count+(imageSet&&course?(' · '+(imageSet.clock?.paused?'HELD':'RUNNING')):'')):(label+' · '+courseGrain+' · NO SOURCE MAP');
  if(law)law.textContent=courseModeLaw();
  if(quick){quick.hidden=!course;quick.textContent=label+' · '+courseGrain;quick.classList.toggle('on',courseMode!=='FLOW');quick.setAttribute('aria-label','Traversal '+label+' at '+courseGrain+' grain')}
  document.documentElement.dataset.foldBloomCourseMode=courseMode;
  document.documentElement.dataset.foldBloomCoursePolicy=courseMode==='RELEASE_STEP'?'RELEASE_THEN_ONE_ADDRESS':courseMode==='STEP'?'MANUAL_ADDRESS_ONLY':'SOURCE_CLOCK';
  document.documentElement.dataset.foldBloomCourseGrain=courseGrain;
  document.documentElement.dataset.foldBloomCourseAddress=hit?.address||empty;
  document.documentElement.dataset.foldBloomCourseKind=readRide?'READFIELD_TEXT':imageSet?'IMAGE_SET':(liveTrack.mapped()?'AUDIO_MAP':'NONE');
  return hit;
}
function drawCourseMap(force=false){
  const cv=$('#courseMap');if(!cv)return null;
  const course=liveCourse(),progress=liveCourseProgress(),key=course?(readRide?'r:':imageSet?'i:':'a:')+Math.round(progress*2000)+':'+courseGrain+':'+courseMode:'empty';
  if(!force&&key===lastCoursePaint)return null;lastCoursePaint=key;
  const g=cv.getContext('2d'),w=cv.width,h=cv.height;g.clearRect(0,0,w,h);g.fillStyle='#05070b';g.fillRect(0,0,w,h);
  if(!course){
    g.fillStyle='#46515a';g.font='8px ui-monospace,monospace';g.fillText(readRide?'READ SOURCE EMPTY':imageSet?'IMAGE SET EMPTY':'LOAD TRACK OR READ SOURCE',8,25);syncCourseControls();return null
  }
  g.fillStyle='rgba(255,255,255,.10)';g.fillRect(0,h/2,w,1);
  if(imageSet){
    // The set has no measured internal structure to draw, so the strip shows only what
    // is true: where the address boundaries are and where the clock currently points.
    const pts=course.points||[],stride=Math.max(1,Math.ceil(pts.length/180));
    g.fillStyle='rgba(123,213,255,.62)';for(let i=0;i<pts.length;i+=stride)g.fillRect(Math.round(pts[i].p*w),h*.23,1,h*.54);
    g.fillStyle='#f2f3ef';g.fillRect(Math.round(progress*w)-1,2,3,h-4);
    syncCourseControls();return {schema:course.schema,progress,points:pts.length,grain:course.grain};
  }
  if(readRide){
    const pts=course.points||[],stride=Math.max(1,Math.ceil(pts.length/180));
    g.fillStyle='rgba(215,180,109,.68)';for(let i=0;i<pts.length;i+=stride)g.fillRect(Math.round(pts[i].p*w),h*.23,1,h*.54);
    g.fillStyle='#f2f3ef';g.fillRect(Math.round(progress*w)-1,2,3,h-4);
    syncCourseControls();return {schema:'fold-bloom-read-strip/v0.1',progress,points:pts.length,grain:course.grain}
  }
  const map=liveTrack.map,time=Number($('#trackAudio')?.currentTime)||0,strip=courseStrip(map,time,{maxBeats:64});
  g.fillStyle='rgba(123,213,255,.22)';for(const p of strip.beats)g.fillRect(Math.round(p*w),h*.44,1,h*.12);
  g.fillStyle='rgba(215,180,109,.58)';for(const p of strip.phrases)g.fillRect(Math.round(p*w),h*.28,1,h*.44);
  g.fillStyle='rgba(239,120,73,.90)';for(const p of strip.sections)g.fillRect(Math.round(p*w),h*.12,2,h*.76);
  g.fillStyle='#f2f3ef';g.fillRect(Math.round(strip.progress*w)-1,2,3,h-4);
  syncCourseControls();return strip;
}
function setCourseMode(next,announce=true){
  const requested=String(next||'FLOW').toUpperCase();
  const validModes=['FLOW','STEP','RELEASE_STEP'];
  const nextMode=validModes.includes(requested)?requested:'FLOW';
  courseMode=readRide?(nextMode==='RELEASE_STEP'?'RELEASE_STEP':'STEP'):nextMode;
  if(courseMode==='STEP'||courseMode==='RELEASE_STEP'){
    if(liveTrack.sourceActive())$('#trackAudio').pause();
    // STEP holds the set clock — the same word the course law already uses.
    if(imageSet)imageSet.clock.hold();
  }else if(imageSet)imageSet.clock.start();
  if(imageSet)refreshImageVault();
  drawCourseMap(true);update();
  if(announce)toast((readRide?'READ':imageSet?'SET':'TRACK')+' · '+courseModeLabel()+(courseMode==='STEP'||courseMode==='RELEASE_STEP'?' · '+courseGrain:''));
  return courseMode;
}
function cycleCourseMode(){
  const modes=readRide?['STEP','RELEASE_STEP']:['FLOW','STEP','RELEASE_STEP'];
  const current=Math.max(0,modes.indexOf(courseMode)),next=modes[(current+1)%modes.length];
  return setCourseMode(next);
}
function cycleCourseGrain(){
  const grains=activeCourseGrains();let i=grains.indexOf(courseGrain);if(i<0)i=0;courseGrain=grains[(i+1)%grains.length];
  if(readRide){readRide.course=null;resetExactReadTrail()}
  // A grain change re-addresses the SAME set at the SAME set-time — the clock is not
  // touched, so continuity of position survives the projection change.
  else if(imageSet){rebuildImageCourse(courseGrain);recordImageVisit(imageCourseAddressAt(imageSet.course,liveCourseProgress()));syncImageStage(true)}
  drawCourseMap(true);lastTextKey='';updateTextWitness();toast('STEP GRAIN · '+courseGrain);return courseGrain;
}
function seekCourseProgress(p,{keepMode=true}={}){
  const course=liveCourse();if(!course)return null;
  const next=Math.max(0,Math.min(1,Number(p)||0));
  if(readRide){
    readRide.progress=next;if(courseMode!=='RELEASE_STEP')courseMode='STEP';const hit=readCourseAddressAt(course,next);recordExactReadVisit(hit);lastTextKey='';drawCourseMap(true);const w=updateTextWitness();recordReadRideVisit(w);update();return hit;
  }
  if(imageSet){
    // Seeking re-anchors the set clock; it does not fabricate a progress value. A held
    // set stays held, a running set keeps running from the new anchor.
    if((courseMode==='STEP'||courseMode==='RELEASE_STEP')||!keepMode)imageSet.clock.hold();
    imageSet.clock.seekSeconds(next*Number(imageSet.course?.duration||0));
    lastCoursePaint=-1;lastTextKey='';drawCourseMap(true);updateTextWitness();
    const hit=imageCourseAddressAt(course,next);recordImageVisit(hit);syncImageStage(true);update();
    return hit;
  }
  const duration=Number(liveTrack.map?.duration)||0;
  if((courseMode==='STEP'||courseMode==='RELEASE_STEP')||!keepMode)$('#trackAudio').pause();
  $('#trackAudio').currentTime=next*duration;lastLinkedBeat=-1;lastTextKey='';drawCourseMap(true);updateTextWitness();update();
  return courseAddressAt(course,next);
}
function stepTrackCourse(delta){
  stopDemo(true);
  const course=liveCourse();if(!course){toast(readRide?'READ SOURCE EMPTY':'MAP A TRACK FIRST');return null}
  setCourseMode(courseMode==='RELEASE_STEP'?'RELEASE_STEP':'STEP',false);
  const hit=courseStep(course,liveCourseProgress(),delta);seekCourseProgress(hit.p);
  toast(courseModeLabel()+' · '+courseGrain+' · '+Math.max(1,hit.index+1)+' / '+course.points.length);return hit;
}
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

function rideSourceKey(map=liveTrack.map){return readRide?.packet?.sourceIdentity?.id||map?.source?.hash||liveTrack.metadata()?.sourceAddress||linkedTrack?.sourceHash||(liveTrack.sourceActive()?'AUDIO_SOURCE':'FIELD_PRACTICE')}
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
  syncVibeQuick();
  document.documentElement.dataset.foldBloomRideProfile=[rideProfile.solidity,rideProfile.immersion,rideProfile.dropGain,rideProfile.anticipation,rideProfile.motionGain,rideProfile.textOffset].map(x=>Number(x).toFixed(2)).join(':');
}
function syncMixUI(){
  for(const part of MIX_PARTS){
    const tune=$('#'+part+'Tune'),val=$('#'+part+'Val'),pct=Math.round(clamp(Number(audio.mix[part]),0,2)*100);
    if(tune)tune.value=String(pct);
    if(val)val.textContent=pct+'%';
  }
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
  if(!f)return `SEEK ${typePresentation(state.targetType).text}`;
  const op=`${f.verb}${f.chain>1?' ×'+f.chain:''}`;
  return callHit(f)?`${op} · HIT CALL`:`${op} · RELEASE`;
}


function imageWitness(){
  // The addressed image IS the witness: same element the lyric band uses, so the
  // addressed object stays one object across projections.
  const course=imageSet?.course,hit=course?imageCourseAddressAt(course,liveCourseProgress()):null,p=hit?.point;
  if(!p)return null;
  return {kind:'IMAGE',mode:'SET',grain:course.grain,address:hit.address,index:hit.index,count:course.points.length,start:null,alignment:null,name:p.name,text:String(p.label||p.name||'')};
}
const ECHO_THREAD_STORAGE='prison-age.echo-thread.v01',ECHO_THREAD_RETURN_STORAGE='prison-age.echo-thread.return.v01';
function isEchoWalk(){return readRide?.packet?.sourceIdentity?.source_set==='PRISON_AGE'&&!!globalThis.PrisonAgeEchoThread}
function echoPoint(witness=readCourseWitness(liveCourse(),liveCourseProgress()),identity=readRide?.packet?.sourceIdentity){
  if(!witness||!identity)return null;
  return{source_id:String(identity.source_id||''),path:String(identity.address||''),title:String(identity.title||readRide?.packet?.label||identity.source_id||''),start:Number(witness.start),end:Number(witness.end),address:String(witness.address||'')}
}
function saveEchoThread(){
  if(!readEchoThread)return;
  try{sessionStorage.setItem(ECHO_THREAD_STORAGE,JSON.stringify(readEchoThread))}catch(_){}
}
function restoreEchoThread(){
  if(!isEchoWalk())return null;
  try{const raw=sessionStorage.getItem(ECHO_THREAD_STORAGE);if(raw)readEchoThread=globalThis.PrisonAgeEchoThread.normalize(raw)}catch(_){readEchoThread=null}
  return readEchoThread
}
function ensureEchoThread(){
  if(!isEchoWalk())return null;
  if(readEchoThread)return readEchoThread;
  restoreEchoThread();if(readEchoThread)return readEchoThread;
  const p=echoPoint();if(!p)return null;
  try{readEchoThread=globalThis.PrisonAgeEchoThread.create(p);saveEchoThread();return readEchoThread}catch(_){return null}
}
function clearReadEcho(){readEcho=null;const box=$('#sourceEchoLive'),follow=$('#sourceEchoFollow'),thread=$('#sourceEchoThread');if(box)box.hidden=true;if(follow)follow.hidden=true;if(thread)thread.hidden=true;delete document.documentElement.dataset.foldBloomSourceEcho;delete document.documentElement.dataset.foldBloomSourceEchoSource}
function syncReadEcho(w){
 const box=$('#sourceEchoLive'),link=$('#sourceEchoLiveLink'),basis=$('#sourceEchoLiveBasis'),follow=$('#sourceEchoFollow'),thread=$('#sourceEchoThread');if(!box)return null;
 if(!readRide||!readEcho?.index||!w?.text){box.hidden=true;if(follow)follow.hidden=true;document.documentElement.dataset.foldBloomSourceEcho=readEcho?'silent':'off';return null}
 const hit=globalThis.FieldSourceEcho?.best?.(readEcho.index,{sourceId:readEcho.sourceId,text:w.text});
 readEcho.hit=hit||null;
 if(!hit){box.hidden=true;if(follow)follow.hidden=true;document.documentElement.dataset.foldBloomSourceEcho='silent';return null}
 const e=hit.entry,u=new URL('/docs/',location.origin);u.searchParams.set('src',e.path);u.searchParams.set('ap_scale','SENT');u.searchParams.set('ap_char',String(e.start));u.searchParams.set('echo',readEcho.url);u.searchParams.set('echo_source',e.source_id);if(readRide.packet.returnAddress)u.searchParams.set('return',readRide.packet.returnAddress);
 link.href=u.pathname+u.search;link.textContent=e.title+' · “'+String(e.text).slice(0,180)+'”';basis.textContent='shared '+hit.shared.join(' · ')+(hit.phrases.length?' · phrase '+hit.phrases.join(' / '):'')+' · exact fragment · evidence only';
 const walk=isEchoWalk();if(follow){follow.hidden=!walk;follow.disabled=!walk}if(thread){const t=walk?ensureEchoThread():null;thread.hidden=!walk;thread.textContent='THREAD '+String(t?.hops?.length||0)+' · READER PATH / NOT CANON'}
 box.hidden=false;document.documentElement.dataset.foldBloomSourceEcho='shown';document.documentElement.dataset.foldBloomSourceEchoSource=e.source_id;document.documentElement.dataset.foldBloomEchoWalk=walk?'ready':'off';return hit
}
async function loadReadEcho(packet){
 clearReadEcho();const cfg=packet?.echo;if(!cfg?.index||!cfg?.source_id||!globalThis.FieldSourceEcho)return null;
 try{
  const u=new URL(cfg.index,location.href);if(u.origin!==location.origin)throw Error('ECHO_ORIGIN');
  const r=await fetch(u.pathname+u.search,{cache:'no-store'});if(!r.ok)throw Error('ECHO '+r.status);
  const index=await r.json(),v=globalThis.FieldSourceEcho.validateIndex(index);if(!v.ok)throw Error(v.errors.join(' / '));
  if(!globalThis.FieldSourceEcho.sourceValid(index,{sourceId:cfg.source_id,text:packet.source}))throw Error('ECHO_STALE_SOURCE');
  readEcho={index,url:u.pathname+u.search,sourceId:String(cfg.source_id),hit:null};
  if(packet?.sourceIdentity?.source_set==='PRISON_AGE')restoreEchoThread();
  syncReadEcho(readCourseWitness(liveCourse(),liveCourseProgress()));return readEcho
 }catch(error){console.warn('SOURCE ECHO',error);document.documentElement.dataset.foldBloomSourceEcho='rejected';return null}
}
async function followReadEcho(){
 const hit=readEcho?.hit,R=globalThis.FieldSourceEcho,T=globalThis.PrisonAgeEchoThread;
 if(!isEchoWalk()||!hit?.entry||!R||!T)return false;
 const fromWitness=readCourseWitness(liveCourse(),liveCourseProgress()),from=echoPoint(fromWitness);
 if(!from)return false;
 const e=hit.entry,src=(readEcho.index?.sources||[]).find(x=>x.id===e.source_id);
 if(!src?.path)return false;
 try{
  const response=await fetch(src.path,{cache:'no-store'});if(!response.ok)throw Error('ECHO_TARGET '+response.status);
  const source=await response.text();
  if(!R.sourceValid(readEcho.index,{sourceId:e.source_id,text:source}))throw Error('ECHO_TARGET_STALE');
  if(source.slice(Number(e.start),Number(e.end))!==String(e.text||''))throw Error('ECHO_TARGET_SPAN');
  let thread=ensureEchoThread()||T.create(from);
  const to={source_id:e.source_id,path:e.path,title:e.title,start:Number(e.start),end:Number(e.end),address:e.address};
  thread=T.append(thread,{from,to,evidence:{entry_id:e.id,shared:hit.shared,phrases:hit.phrases,score:hit.score}});
  readEchoThread=thread;saveEchoThread();
  const fp=src.fingerprint||null,packet=makeReadRidePacket({
    source,label:e.title,
    sourceIdentity:{address:e.path,hash:fp?fp.algo+':'+fp.value:undefined,kind:'PRISON_AGE_SOURCE',format:'MD',authority:'PRISON_AGE',source_set:'PRISON_AGE',source_id:e.source_id,title:e.title},
    focus:{char_index:Number(e.start),source_progress:Number(e.start)/Math.max(1,source.length)},
    from:'/fold-bloom/live/?experience=echo-walk',
    returnAddress:'/prison-age/?story='+encodeURIComponent(e.source_id),
    echo:{index:readEcho.url,source_id:e.source_id,source_path:e.path,source_fingerprint:fp,authority:'EVIDENCE_ONLY'}
  });
  loadReadRidePacket(packet,{announce:false});courseGrain='PARAGRAPH';readRide.course=null;setCourseMode('STEP',false);drawCourseMap(true);updateTextWitness();update();
  document.documentElement.dataset.foldBloomEchoWalk='followed';toast('FOLLOW ECHO · '+e.title);return true
 }catch(error){console.warn('FOLLOW ECHO',error);document.documentElement.dataset.foldBloomEchoWalk='rejected';toast('ECHO DOOR CLOSED');return false}
}
function updateTextWitness(){
  const box=$('#lyric'),mode=$('#lyricMode'),body=$('#lyricText');
  const w=textOn
    ?(readRide?readCourseWitness(liveCourse(),liveCourseProgress()):(imageSet?imageWitness():(liveTrack.active()?liveTrack.textWitness(undefined,rideProfile.textOffset):null)))
    :null;
  if(!w?.text){if(!box.hidden)box.hidden=true;lastTextKey='';syncReadEcho(null);syncAuthoredReaderUI();return null}
  const key=readRide?[w.grain,w.address,w.text].join('|'):imageSet?[w.grain,w.address,w.text].join('|'):[w.mode,w.alignment,w.start,w.text].join('|');
  if(key!==lastTextKey){
    lastTextKey=key;box.hidden=false;
    mode.textContent=readRide?('READ · '+w.grain):imageSet?('SET · '+w.grain):(w.mode==='TIMED'?((w.kind||'TEXT')+' · TIMED'):((w.kind||'TEXT')+' · FLOAT / UNALIGNED'));
    body.textContent=String(w.text||'').slice(0,readRide?520:320);
  }
  syncReadEcho(w);syncAuthoredReaderUI();return w;
}

function refreshSteeringPreview(now=Date.now()){
  if(!steeringPulse){steeringView=null;renderer.setSteeringPreview(null);document.documentElement.dataset.foldBloomSteering='off';return null}
  const next=liveSteeringPreview(state,steeringPulse,{now,maxAgeMs:15000});
  if(!next.ok){steeringPulse=null;steeringView=null;renderer.setSteeringPreview(null);document.documentElement.dataset.foldBloomSteering='off';return null}
  steeringView=next;renderer.setSteeringPreview(next);document.documentElement.dataset.foldBloomSteering=String(next.verb||'on').toLowerCase();return next;
}
function setManualSteeringPreview(verb){
  steeringPulse=manualSteeringPulse(verb);const view=refreshSteeringPreview();update();
  if(view)toast(`LENS ${view.verb} · ${view.candidate_count} LAWFUL`);
  return view;
}
function clearSteeringPreview(){steeringPulse=null;steeringView=null;renderer.setSteeringPreview(null);document.documentElement.dataset.foldBloomSteering='off';update()}

function currentLiveCalculation(){
  const steering=refreshSteeringPreview();
  return buildLiveCalculation({
    nativeContext:forecastContext(state),
    currentForecast:currentForecast(),
    history:state.history,
    steering,
    traversal:traversalCalculationInput()
  });
}
function syncCalculationUI(calc){
  if(!calc)return null;
  const native=$('#calcNative'),recent=$('#calcRecent'),lens=$('#calcSteering'),step=$('#calcTraversal'),formula=$('#calcFormula'),summary=$('#calcSummary');
  const selected=calc.native.selected;
  if(summary)summary.textContent=liveCalculationSummary(calc);
  if(native)native.textContent=selected
    ?`HERE ${selected.verb}${selected.chain>1?'×'+selected.chain:''} · ${calc.native.candidate_count} lawful · ambiguity ${calc.native.candidate_ambiguity_bits} bits`
    :`SEEK · ${calc.native.candidate_count} lawful forecast candidates · ambiguity ${calc.native.candidate_ambiguity_bits} bits`;
  if(recent)recent.textContent=calc.recent.hex
    ?`${calc.recent.hex.token} · 64 exact six-verb histories / HEX · −${calc.recent.hex.information_loss_bits} bits · HISTORY ≠ CONTROL`
    :`RECENT EXACT VERBS · ${calc.recent.count}/6 · HEX appears only after six authored releases`;
  if(lens)lens.textContent=calc.steering
    ?`${calc.steering.verb} · ${calc.steering.native_candidate_count}/${calc.native.candidate_count} native candidates · PREVIEW ONLY`
    :'OFF · model/manual steering support is preview-only and grants no RELEASE authority';
  if(step)step.textContent=calc.traversal
    ?`${calc.traversal.mode==='RELEASE_STEP'?'RELEASE→STEP':calc.traversal.mode} · ${calc.traversal.grain} ${calc.traversal.index!=null&&calc.traversal.count?((calc.traversal.index+1)+'/'+calc.traversal.count):''}${calc.traversal.next_address?' · NEXT '+calc.traversal.next_address:''}`
    :'NO ADDRESSED SOURCE COURSE';
  if(formula)formula.textContent='4^6 exact histories → 2^6 HEX · steering support = matching native forecasts / all native forecasts · RELEASE→STEP = commit LIVE operation, then +1 addressed grain';
  document.documentElement.dataset.foldBloomCalculus=calc.recent.hex?'hex-history-ready':'forming-history';
  return calc;
}
function statusText(calc){
  const idx=gateCellIndex(state),c=state.cells[idx],f=currentForecast(),track=layerMode!=='SOURCE'&&linkedTrack?.playing?` · TRACK B${Math.max(0,linkedTrack.beatIndex)+1} ${timingNow().label} · ROAD ${deformationSummary(deformationTape,Number(linkedTrack.time)||0)}`:(liveTrack.sourceActive()?' · SOURCE PLAYBACK':'');
  const forecast=f?` · HERE ${f.verb}${f.chain>1?'×'+f.chain:''}${callHit(f)?' ✓':''}`:'';
  const hex=calc?.recent?.hex?` · HEX ${calc.recent.hex.token}`:(calc?.recent?.count?` · FORM ${calc.recent.count}/6`:'');
  const lens=calc?.steering?` · LENS ${calc.steering.verb} · ${calc.steering.native_candidate_count}/${calc.native.candidate_count}`:'';
  const nav=calc?.traversal&&calc.traversal.mode!=='FLOW'?` · ${calc.traversal.mode==='RELEASE_STEP'?'RELEASE→STEP':calc.traversal.mode} ${calc.traversal.grain}`:'';
  return `GATE ${String(idx).padStart(2,'0')} · ${typePresentation(c.type).text} · CALL ${callLabel(state.call)} · ${state.creases.length} CREASE${state.creases.length===1?'':'S'}${forecast}${hex}${lens}${nav}${track}`;
}

function syncAutopilotUI(){
  const label=demo.on?'TAKE OVER':'AUTOPILOT';
  for(const id of ['#autoBtn','#demoSettingsBtn']){const el=$(id);if(!el)continue;el.textContent=label;el.classList.toggle('on',demo.on);el.setAttribute('aria-pressed',demo.on?'true':'false')}
  const intro=$('#demoBtn');if(intro)intro.textContent=demo.on?'TAKE OVER →':'AUTOPILOT →';
}

function update(){
  const calc=currentLiveCalculation();
  $('#flow').textContent=state.flow.toLocaleString();
  $('#chain').textContent=state.bestChain>1?state.bestChain+'×':'—';
  $('#target').textContent=typePresentation(state.targetType).text;
  $('#call').textContent=callLabel(state.call);
  $('#streak').textContent=state.callStreak>1?state.callStreak+'×':'—';
  $('#timing').textContent=layerMode!=='SOURCE'&&linkedTrack?.playing?timingNow().label:'—';
  $('#arc').textContent=layerMode==='SOURCE'?'SOURCE':sectionArcLabel(sectionArc,linkedTrack);
  $('#route').textContent=rideView(ride,latestWorld).label;
  $('#speed').textContent=latestWorld?`${Number(latestWorld.currentSpeed||1).toFixed(2)}×`:'—';
  const g=Number(latestWorld?.currentGrade)||0;$('#grade').textContent=!latestWorld?'—':Math.abs(g)<.08?'LEVEL':g>0?`UP ${Math.round(g*100)}`:`DOWN ${Math.round(Math.abs(g)*100)}`;
  $('#trackState').textContent=readRide?('READ · '+readRide.packet.label):(liveTrack.sourceActive()?trackStatus+(sourceLandmarks.length?` · ${sourceLandmarks.length} MARKS`:''):(externalTrack?`${externalTrack._pulseLabel||'FIELD'} PULSE`:'FIELD COURSE · STILL'));
  $('#textBtn').textContent=textOn?'TEXT AUTO':'TEXT OFF';
  $('#trackToggle').disabled=!!readRide||!liveTrack.sourceActive();
  $('#trackToggle').textContent=readRide?'NO TEXT CLOCK':(liveTrack.sourceActive()?($('#trackAudio').paused?'PLAY SOURCE':'PAUSE SOURCE'):'PLAY / PAUSE');
  if($('#sourceQuick'))$('#sourceQuick').textContent=authoredReader?'PROVENANCE':readRide?'READ SOURCE':'CHOOSE SONG';
  syncLayerUI();
  $('#mode').textContent=state.mode;
  const sceneMeta=scenePresentation(state.scene);
  $('#scene').textContent=sceneMeta.label;
  $('#modeBtn').textContent=state.mode;
  $('#modeDrawerBtn').textContent='RIDE MODE · '+state.mode;$('#modeDrawerBtn').setAttribute('aria-label','Ride mode: '+state.mode+'. Tap to toggle between RATCHET and FLOW.');
  $('#sceneBtn').textContent=sceneMeta.plain;
  $('#sceneBtn').title='Generated sound palette + field presentation: '+sceneMeta.plain+'. '+sceneMeta.detail;
  $('#sceneBtn').setAttribute('aria-label','Cycle generated sound palette and field presentation. Current preset: '+sceneMeta.plain+'. '+sceneMeta.detail);
  document.querySelectorAll('[data-sound-scene]').forEach(b=>{const selected=b.dataset.soundScene===state.scene;b.classList.toggle('on',selected);b.setAttribute('aria-pressed',String(selected))});
  const releaseReady=canRelease(state),releaseControl=$('#releaseBtn');
  releaseControl.disabled=!releaseReady;
  releaseControl.textContent=releaseReady?releaseLabel():'TURN UNTIL READY';
  releaseControl.setAttribute('aria-label',releaseReady?releaseLabel():'Turn left or right until the release action is ready');
  $('#chargeBar').style.width=`${Math.min(100,state.charge/1.75*100)}%`;
  $('#status').textContent=statusText(calc);
  syncCalculationUI(calc);
  $('#soundBtn').textContent=audio.soundOn?'♪':'×';
  $('#build').textContent=readRide
    ?`${VERSION} · READFIELD TEXT × addressed course × LIVE POV → READ-RIDE · ${courseGrain} · ${Math.round(liveCourseProgress()*100)}%`
    :imageSet
      ?`${VERSION} · LOCAL IMAGE SET × self-driving set clock → addressed source · ${imageCourseSummary(imageSet.course)} · ${courseGrain} · ${Math.round(liveCourseProgress()*100)}%`
      :`${VERSION} · AUDIO MAP × deformation tape × ride trace → traversable TRACKFIELD · ${deformationTape.length} road ops · ${ride.branchChoices} branch choices`;
  syncAutopilotUI();syncAuthoredReaderUI();
  renderer.setDrag(dragAngle);
  save();
}

function readTrailKeyFor(packet=readRide?.packet){
  if(!packet)return '';
  if(packet.trailKey)return String(packet.trailKey);
  const s=packet.sourceIdentity||{};
  return globalThis.FieldSourceTrail?.sourceKey?.({address:s.address||'',id:s.hash||s.id||''})||'';
}
function readTrailSnapshot(packet=readRide?.packet){
  const key=readTrailKeyFor(packet);return globalThis.FieldSourceTrail?.read?.(key||'')||null;
}
function recordReadRideVisit(witness=null){
  if(!readRide)return null;const course=liveCourse(),w=witness||readCourseWitness(course,liveCourseProgress()),key=readTrailKeyFor();
  if(!w||!key)return null;
  return globalThis.FieldSourceTrail?.record?.(key,{address:w.address||'',progress:Number(w.progress)||0,focus:String(w.text||'').slice(0,220),charIndex:Number.isFinite(Number(w.start))?Number(w.start):null,scale:w.grain||courseGrain,via:'LIVE_READ_RIDE'})||null;
}
function markReadRide(){
  if(!readRide)return null;const w=readCourseWitness(liveCourse(),liveCourseProgress()),key=readTrailKeyFor();if(!w||!key){toast('READ TRAIL · NO EXACT IDENTITY');syncLayerUI();return null}
  const t=globalThis.FieldSourceTrail?.addMark?.(key,{address:w.address||'',progress:Number(w.progress)||0,label:(w.grain||courseGrain)+' · '+String(w.text||'').slice(0,96),charIndex:Number.isFinite(Number(w.start))?Number(w.start):null,scale:w.grain||courseGrain,via:'LIVE_READ_RIDE'});
  if(t?.storageState==='READY')toast('READ MARK · '+(w.grain||courseGrain)+' · '+Math.round((w.progress||0)*100)+'%');
  else toast('READ TRAIL · '+String(t?.storageState||'UNAVAILABLE'));
  syncLayerUI();update();return t;
}

function readRideCarrier(witness){
  if(!readRide||!globalThis.InterphaseCarrier)return readRide?.packet?.carrier||null;
  const C=globalThis.InterphaseCarrier,parent=readRide.packet.carrier||null,s=readRide.packet.sourceIdentity||{},id=String(parent?.object?.id||s.id||s.hash||s.address||'readfield:source');
  try{return C.make({
    object:parent?.object||{id,kind:s.kind||'TEXT',label:readRide.packet.label,owner:s.authority||'READFIELD',address:s.address||('read://'+encodeURIComponent(id)),contract:'field-read-ride/v0.1'},
    focus:{id,label:readRide.packet.label,address:witness?.address||parent?.focus?.address||s.address||id,aperture:'LIVE_READ_RIDE'},
    next:[
      {id:'STEP_PREV',label:'STEP PREV',authority:'NAVIGATION',target:witness?.address||id},
      {id:'STEP_NEXT',label:'STEP NEXT',authority:'NAVIGATION',target:witness?.address||id},
      {id:'RETURN_SOURCE',label:'RETURN SOURCE',authority:'NAVIGATION',target:readRide.packet.returnAddress||readRide.packet.from||'/'}
    ],
    witness:witness?{class:'OBSERVED',summary:(witness.grain||courseGrain)+' · '+Math.round((witness.progress||0)*100)+'% · '+String(witness.text||'').slice(0,120),evidenceRefs:[]}:(parent?.witness||{}),
    return:parent?.return||{address:readRide.packet.returnAddress||readRide.packet.from||'/',owner:parent?.object?.owner||s.authority||'READFIELD',label:'RETURN TO SOURCE'},
    projection:{host:'FOLD_BLOOM_LIVE',name:'READ_RIDE',channels:['identity','address','content','depth','evidence'],residue:['raw source remains native READ/RIDE payload; carrier has no source/effect authority']},
    sourceRefs:[s.address||'',readRide.packet.from||''].filter(Boolean),
    parentFrameId:parent?.frameId||'',
    meta:{readRideSchema:readRide.packet.schema,grain:courseGrain,courseMode}
  })}catch(_){return parent}
}
function readRideState(){
  if(!readRide)return null;
  const course=liveCourse(),witness=course?readCourseWitness(course,liveCourseProgress()):null;
  const carrier=readRideCarrier(witness);
  return {
    schema:'fold-bloom-live-read-ride/v0.1',
    source:{
      id:readRide.packet.sourceIdentity?.id||null,
      label:readRide.packet.label,
      kind:readRide.packet.sourceIdentity?.kind||null,
      authority:readRide.packet.sourceIdentity?.authority||'READFIELD',
      address:readRide.packet.sourceIdentity?.address||null,
      format:readRide.packet.sourceIdentity?.format||null
    },
    course:{grain:courseGrain,mode:courseMode,progress:+liveCourseProgress().toFixed(8),address:witness?.address||null,index:witness?.index??null,count:witness?.count??null},
    witness:witness?{...witness,text:String(witness.text||'').slice(0,800)}:null,
    trail:(()=>{const t=readTrailSnapshot();return t?{schema:t.schema,storageState:t.storageState,furthest:t.furthest,marks:t.marks.length,last:t.last?{address:t.last.address,progress:t.last.progress,charIndex:t.last.charIndex,scale:t.last.scale,via:t.last.via}:null,law:t.law}:null})(),
    traversal:{origin:readRide.origin?{...readRide.origin}:null,visited:(readRide.visited||[]).map(x=>({...x}))},
    echo:readEcho?{schema:readEcho.index?.schema||null,source_set:readEcho.index?.source_set||null,source_id:readEcho.sourceId,url:readEcho.url,authority:'EVIDENCE_ONLY'}:null,
    carrier:carrier?{schema:carrier.schema,frameId:carrier.frameId,authority:carrier.authority,object:carrier.object,focus:carrier.focus,next:carrier.next,witness:carrier.witness,return:carrier.return,projection:carrier.projection,lineage:carrier.lineage}:null,
    returnAddress:readRide.packet.returnAddress||null
  };
}
function clearReadRide({silent=false}={}){
  if(!readRide)return false;
  readRide=null;authoredReader=null;document.documentElement.dataset.foldBloomAuthoredReader='off';clearReadEcho();syncAuthoredReaderUI();
  if(READ_GRAINS.includes(courseGrain))courseGrain='PHRASE';
  courseMode='STEP';lastCoursePaint=-1;lastTextKey='';
  delete document.documentElement.dataset.foldBloomReadRide;
  delete document.documentElement.dataset.foldBloomReadAuthority;
  syncRideProfile();syncLayerUI();drawCourseMap(true);updateTextWitness();
  if(!silent)toast('READ SOURCE RETURNED');
  return true;
}
function loadReadRidePacket(raw,{announce=true,authored=null}={}){
  const packet=normalizeReadRidePacket(raw);authoredReader=authored;document.documentElement.dataset.foldBloomAuthoredReader=authoredReader?'on':'off';
  stopDemo(false);
  clearImageSet({silent:true});
  try{$('#trackAudio').pause()}catch(_){}
  liveTrack.clearSource();linkedTrack=null;externalTrack=null;lastLinkedBeat=-1;sourceLandmarks=[];renderer.setLandmarks([]);
  deformationTape=[];sectionArc=createSectionArc();ride=createRideState();latestWorld=null;
  readRide={packet,progress:initialReadProgress(packet),course:null,origin:null,visited:[]};clearReadEcho();
  courseGrain='PARAGRAPH';courseMode='STEP';textOn=true;lastCoursePaint=-1;lastTextKey='';
  resetExactReadTrail();
  layerMode='IMMERSION';renderer.setProfile(effectiveRideProfile());syncRideProfile();syncLayerUI();
  document.documentElement.dataset.foldBloomReadRide='ready';
  document.documentElement.dataset.foldBloomReadAuthority=String(packet.sourceIdentity?.authority||'READFIELD').toLowerCase();
  $('#intro').classList.remove('on');syncSoundGate(false);drawCourseMap(true);const readWitness=updateTextWitness();recordReadRideVisit(readWitness);update();
  void loadReadEcho(packet);if(announce)toast('READ / RIDE · '+packet.label);
  return readRideState();
}
function authoredReaderStats(rs=readRideState()){
  const historyStart=Math.max(0,Number(authoredReader?.historyStart)||0);
  const scoped={...state,history:Array.isArray(state?.history)?state.history.slice(historyStart):[]};
  return readerStats(rs,scoped);
}
function authoredOverlap(witness){
  if(!authoredReader||!witness)return null;
  const a=Number(witness.start),b=Number(witness.end);
  for(const group of authoredReader.pack.recurrence||[]){
    const hits=(group.variants||[]).filter(v=>Number(v.start)<b&&Number(v.end)>a);
    if(hits.length)return{group,hits};
  }
  return null;
}
function syncAuthoredReaderUI(){
  const frame=$('#authoredReaderFrame'),prov=$('#readerProvenance'),ret=$('#readerReturn');
  if(!frame)return null;
  if(!authoredReader||!readRide){
    frame.hidden=true;if(prov)prov.hidden=true;if(ret)ret.hidden=true;
    document.documentElement.dataset.foldBloomAuthoredReader='off';return null;
  }
  document.documentElement.dataset.foldBloomAuthoredReader='on';frame.hidden=false;
  const rs=readRideState(),w=rs?.witness,pack=authoredReader.pack,overlap=authoredOverlap(w),stats=authoredReaderStats(rs);
  $('#readerAuthority').textContent=pack.authority.replaceAll('_',' ');
  $('#readerPackTitle').textContent=pack.title;
  $('#readerSourceMeta').textContent=pack.internal_date+' · '+pack.source_artifact+' · '+pack.source_status+' · '+authoredReader.hash.slice(0,19)+'…';
  $('#readerAddress').textContent=w?.address||'read://—';
  $('#readerProgress').textContent=(w?((w.index+1)+' / '+w.count+' · '):'')+Math.round((rs?.course?.progress||0)*100)+'% · '+stats.revisits+' revisit'+(stats.revisits===1?'':'s');
  const recur=$('#readerRecurrence');
  if(overlap){
    recur.hidden=false;$('#readerRecurrenceLabel').textContent=overlap.group.label;
    $('#readerRecurrenceBody').textContent=overlap.hits.map(x=>x.label).join(' · ')+' · LETTERS '+overlap.group.signature+' · '+overlap.group.boundary;
  }else recur.hidden=true;
  $('#liveSubtitle').textContent='LIVE READER · PROVENANCE / TRAVERSE / RECURRENCE / RETURN';
  return{rs,w,stats,overlap};
}
function showAuthoredProvenance(){
  if(!authoredReader)return false;const p=authoredReader.pack;
  $('#readerProvTitle').textContent=p.title+' · '+p.subtitle;
  $('#readerProvBody').innerHTML=[
    ['AUTHORITY',p.authority.replaceAll('_',' ')],
    ['SOURCE',p.source_artifact+' · internally dated '+p.internal_date],
    ['STATUS',p.source_status+' · '+p.authorship],
    ['RECOVERY BOUNDARY',p.recovery_note],
    ['EXCLUDED FROM DEFAULT',p.exclusions.join(' / ')],
    ['IDENTITY',authoredReader.hash+' · '+p.source_path]
  ].map(([k,v])=>'<div><b>'+k+'</b>'+String(v).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]))+'</div>').join('');
  $('#readerRawSource').href=p.source_path;$('#readerProvenance').hidden=false;return true
}
function jumpAuthoredRecurrence(direction=1){
  if(!authoredReader||!readRide)return null;
  const w=readCourseWitness(liveCourse(),liveCourseProgress()),offset=Math.round(liveCourseProgress()*Math.max(1,authoredReader.source.length)),next=nextRecurrence(authoredReader.pack,offset,direction);
  if(!next)return null;
  authoredReader.jumps=Array.isArray(authoredReader.jumps)?authoredReader.jumps:[];
  authoredReader.jumps.push({from:offset,to:next.start,label:next.label,group:next.groupId,at:new Date().toISOString()});authoredReader.jumps=authoredReader.jumps.slice(-64);
  seekCourseProgress(next.start/Math.max(1,authoredReader.source.length));
  toast('RECURRENCE · '+next.label);syncAuthoredReaderUI();return next
}
function currentAuthoredReturn(){
  if(!authoredReader||!readRide)return null;
  const course=liveCourse(),rs=readRideState(),witness=makeReadReturnWitness(course,{
    origin:readRide.origin,visited:readRide.visited,current:liveCourseProgress(),returnAddress:readRide.packet.returnAddress
  });
  const stats=authoredReaderStats(rs),pack=authoredReader.pack;
  return{
    schema:'fold-bloom-authored-reading-return/v0.1',authority:'EVIDENCE_ONLY',
    source:{id:authoredReader.hash,address:pack.source_path,title:pack.title,provenance:pack.source_artifact,internal_date:pack.internal_date,status:pack.source_status},
    traversal:witness,recurrence:{groups:(pack.recurrence||[]).map(x=>({id:x.id,label:x.label,relation:x.relation,signature:x.signature})),revisits:stats.revisits,jumps:(authoredReader.jumps||[]).map(x=>({...x}))},
    live:{release_count:stats.releases,verbs:(Array.isArray(state?.history)?state.history:[]).slice(Math.max(0,Number(authoredReader?.historyStart)||0)).map(x=>x.verb).filter(Boolean),law:'LIVE consequences are reader-authored field operations and never rewrite recovered source bytes.'},
    return:{source_reader:pack.return.source_reader,field_index:pack.return.field_index},
    created_at:new Date().toISOString()
  }
}
function showAuthoredReturn(){
  const r=currentAuthoredReturn();if(!r)return false;const rs=readRideState(),stats=authoredReaderStats(rs);
  $('#readerVisits').textContent=String(stats.visits);$('#readerRevisits').textContent=String(stats.revisits);$('#readerReleases').textContent=String(stats.releases);$('#readerFinalProgress').textContent=Math.round(stats.progress*100)+'%';
  $('#readerReturnWitness').textContent='SOURCE '+r.source.id+'\nFINAL '+String(r.traversal?.final?.address||'—')+'\nRECURRENCE '+r.recurrence.groups.map(x=>x.label+' ['+x.signature+']').join(' · ')+'\nRECURRENCE JUMPS '+r.recurrence.jumps.length+' · '+(r.recurrence.jumps.map(x=>x.label).join(' → ')||'NONE')+'\nLIVE '+(r.live.verbs.length?r.live.verbs.join(' → '):'NO RELEASES')+'\nAUTHORITY '+r.authority;
  $('#readerReturn').hidden=false;document.documentElement.dataset.foldBloomAuthoredReturn='open';return r
}
function closeAuthoredReturn(){const x=$('#readerReturn');if(x)x.hidden=true;delete document.documentElement.dataset.foldBloomAuthoredReturn}
async function openAuthoredReader(id='prison-age-2021',{announce=true}={}){
  const loaded=await loadAuthoredPack(id);
  const p=loaded.pack,packet=makeReadRidePacket({
    source:loaded.source,label:p.title,
    sourceIdentity:{id:loaded.hash,hash:loaded.hash,address:p.source_path,authority:p.authority,kind:'AUTHORED_RECOVERED_TEXT',format:'TXT',provenance:p.source_artifact},
    focus:{source_progress:0},returnAddress:p.return.source_reader,from:'/fold-bloom/live/?reader='+encodeURIComponent(p.id)
  });
  const authored={pack:p,source:loaded.source,hash:loaded.hash,jumps:[],historyStart:Array.isArray(state?.history)?state.history.length:0};
  const out=loadReadRidePacket(packet,{announce:false,authored});
  courseGrain=String(p.default_grain||'PARAGRAPH');readRide.course=null;resetExactReadTrail();setCourseMode(String(p.default_mode||'RELEASE_STEP'),false);
  layerMode='IMMERSION';audio.setSound(false);syncSoundGate(false);$('#intro').classList.remove('on');syncAuthoredReaderUI();drawCourseMap(true);updateTextWitness();update();
  if(announce)toast('AUTHORED SOURCE · '+p.title);return out
}
function loadReadText(source,{label='READ SOURCE',sourceIdentity={kind:'SESSION_TEXT',authority:'READFIELD'},focus={source_progress:0},returnAddress='/fold-bloom/live/',from='/fold-bloom/live/'}={}){
  return loadReadRidePacket(makeReadRidePacket({source,label,sourceIdentity,focus,returnAddress,from}));
}
async function loadReadFile(file){
  if(!file)return null;
  try{
    const packet=await packetFromLocalFile(file,{returnAddress:'/fold-bloom/live/',from:'/fold-bloom/live/'});
    return loadReadRidePacket(packet);
  }catch(error){console.warn(error);toast('READ FILE ERROR');return null}
}
function consumeReadRideHandoff(){
  let raw=null;
  try{raw=sessionStorage.getItem(READ_RIDE_STORAGE);sessionStorage.removeItem(READ_RIDE_STORAGE)}catch(_){}
  if(!raw)return null;
  try{return loadReadRidePacket(raw,{announce:false})}catch(error){console.warn('READ/RIDE handoff',error);toast('READ HANDOFF REJECTED');return null}
}
function returnReadRide(){
  const target=readRide?.packet?.returnAddress;if(!target)return false;
  try{
    const u=new URL(target,location.href);if(u.origin!==location.origin)return false;
    const course=liveCourse(),witness=makeReadReturnWitness(course,{
      origin:readRide.origin,visited:readRide.visited,current:liveCourseProgress(),returnAddress:u.pathname+u.search+u.hash
    });
    sessionStorage.setItem(READ_RETURN_STORAGE,JSON.stringify(witness));
    if(isEchoWalk()&&readEchoThread){
      const T=globalThis.PrisonAgeEchoThread,thread=T.normalize(readEchoThread);
      const threadReturn={
        schema:'prison-age.echo-thread-return/v0.1',authority:'EVIDENCE_ONLY',
        thread,compact:T.compact(thread),final:witness,
        current_source:{source_id:readRide.packet.sourceIdentity?.source_id||null,path:readRide.packet.sourceIdentity?.address||null,title:readRide.packet.sourceIdentity?.title||readRide.packet.label},
        created_at:new Date().toISOString(),
        law:'Chosen source-to-source traversal evidence only. Thread order is not canon order, theme, causality, equivalence or comprehension.'
      };
      sessionStorage.setItem(ECHO_THREAD_RETURN_STORAGE,JSON.stringify(threadReturn));u.searchParams.set('thread_return','1');
    }
    u.searchParams.set('ride_return','1');
    location.href=u.pathname+u.search+u.hash;return true;
  }catch(error){console.warn('READ/RIDE return',error);return false}
}

async function ensureAudio(){try{await audio.init();return true}catch(_){return false}}
function syncSoundGate(show,mode='FIELD'){
  const gate=$('#soundGate');if(!gate)return;
  gate.hidden=!show;gate.dataset.mode=mode;gate.textContent=mode==='SOURCE'?'TAP FOR SOURCE':'TAP FOR FIELD SOUND';gate.setAttribute('aria-hidden',show?'false':'true');
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
  // The image set lives in the SAME vault store. Audio selects must not offer image
  // records as tracks, so the split is by measured type, not by a new store or schema.
  vaultCache=(await listLocalMedia().catch(()=>[])).filter(x=>x?.blob&&!isImageRecord(x)).sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));
  select.innerHTML='<option value="">REMEMBERED TRACKS…</option>'+vaultCache.map(x=>`<option value="${String(x.sourceId).replaceAll('"','&quot;')}">${String(x.name||x.sourceId).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]))}</option>`).join('');
  if(read)read.textContent=String(vaultCache.length);
  const open=$('#vaultOpen');if(open)open.disabled=!vaultCache.length;
  return vaultCache;
}

// ── IMAGE SET — the third addressed source ──────────────────────────────────
//
// Same vault pattern as audio, extended to images: declare local files ONCE, the
// browser keeps the bytes in IndexedDB keyed by their exact sha256 source id, and the
// declaration is remembered so later opens need no picker. Nothing is uploaded and
// nothing is written to the repo; the course is built from metadata only, which is why
// the clock can drive the set while the bytes never leave this device.
function imageRegistryLoad(){
  try{return normalizeImageSetRegistry(localStorage.getItem(IMAGE_SET_STORAGE)||'[]')}catch(_){return []}
}
function imageRegistrySave(list){
  imageRegistry=normalizeImageSetRegistry(list);
  try{localStorage.setItem(IMAGE_SET_STORAGE,JSON.stringify(imageRegistry))}catch(_){}
  return imageRegistry;
}
function imageSetView(){
  if(!imageSet)return null;
  const course=imageSet.course,hit=course?imageCourseAddressAt(course,liveCourseProgress()):null;
  return {
    setKey:imageSet.setKey,label:imageSet.label,grain:course?.grain||null,mode:courseMode,
    running:!!imageSet.clock&&!imageSet.clock.paused,
    seconds:+imageSetSeconds(course,imageSet.clock).toFixed(3),
    address:hit?.address||null,index:hit?.index??null,points:course?.points?.length||0,
    summary:imageCourseSummary(course),
    trail:(imageSet.visited||[]).map(x=>({...x})),
    entries:(imageSet.entries||[]).map(x=>({sourceId:x.sourceId,name:x.name}))
  };
}
function recordImageVisit(hit){
  if(!imageSet||!hit?.point)return null;
  const last=imageSet.visited?.at(-1);
  if(last&&last.address===hit.address)return last;
  const visit={address:hit.address,grain:imageSet.course?.grain||courseGrain,index:hit.index,
    sourceId:hit.point.sourceId,label:hit.point.label||hit.point.name||'',
    seconds:+imageSetSeconds(imageSet.course,imageSet.clock).toFixed(3)};
  imageSet.visited=[...(imageSet.visited||[]),visit].slice(-64);
  return visit;
}
function trimImageUrls(pin){
  if(imageUrlCache.size<=16)return;
  for(const key of [...imageUrlCache.keys()]){
    if(imageUrlCache.size<=16)break;
    if(key===pin)continue;
    try{URL.revokeObjectURL(imageUrlCache.get(key))}catch(_){}
    imageUrlCache.delete(key);
  }
}
function imageBlobUrl(sourceId){
  const id=String(sourceId||'');if(!id)return Promise.resolve(null);
  if(imageUrlCache.has(id))return Promise.resolve(imageUrlCache.get(id));
  if(imageUrlPending.has(id))return imageUrlPending.get(id);
  const pending=getLocalMedia(id).then(record=>{
    imageUrlPending.delete(id);
    if(!record?.blob)return null;
    const url=URL.createObjectURL(record.blob);
    imageUrlCache.set(id,url);trimImageUrls(id);
    return url;
  }).catch(()=>{imageUrlPending.delete(id);return null});
  imageUrlPending.set(id,pending);
  return pending;
}
function syncImageStage(force=false){
  const img=$('#imageStage');if(!img)return null;
  if(!imageSet){if(!img.hidden){img.hidden=true;img.removeAttribute('src');imageStageKey=''}return null}
  const course=imageSet.course,hit=course?imageCourseAddressAt(course,liveCourseProgress()):null;
  if(!hit?.point){img.hidden=true;return null}
  img.hidden=false;
  if(!force&&imageStageKey===hit.address)return hit;
  imageStageKey=hit.address;img.dataset.address=hit.address;img.dataset.grain=course.grain;
  if(img.dataset.source!==hit.point.sourceId){
    img.dataset.source=hit.point.sourceId;
    const wanted=hit.address;
    void imageBlobUrl(hit.point.sourceId).then(url=>{
      if(!url||imageStageKey!==wanted)return; // the set moved on; this frame is past
      img.src=url;img.alt=String(hit.point.label||hit.point.name||'addressed image');
    });
    // Warm the next address so a running set never waits on IndexedDB at the seam.
    const next=stepImageCourse(course,hit.p,1,{loop:course.loop!==false});
    if(next?.point&&next.point.sourceId!==hit.point.sourceId)void imageBlobUrl(next.point.sourceId);
  }
  return hit;
}
function syncImageSetReadouts(){
  if(!imageSet)return null;
  const course=imageSet.course,hit=course?imageCourseAddressAt(course,liveCourseProgress()):null;
  recordImageVisit(hit);
  const trail=(imageSet.visited||[]).map(v=>`${v.index}@${v.seconds}`).join(';');
  if(trail!==imageTrailKey){
    imageTrailKey=trail;
    const root=document.documentElement;
    root.dataset.foldBloomImageTrail=trail;
    root.dataset.foldBloomImageAdvances=String(Math.max(0,(imageSet.visited||[]).length-1));
    root.dataset.foldBloomImageAddress=hit?.address||'course://image_set/empty';
    root.dataset.foldBloomImageRunning=imageSet.clock?.paused?'HELD':'RUNNING';
    const law=$('#imageSetLaw');
    if(law)law.textContent=`${imageCourseSummary(course)} · ${imageSet.clock?.paused?'HELD':'RUNNING'} · ${courseModeLabel()}`;
  }
  return hit;
}
async function declareImageSet(files,{label='IMAGE SET'}={}){
  const list=[...(files||[])].filter(f=>isImageRecord(f));
  if(!list.length){toast('IMAGE SET · NO IMAGE FILES');return null}
  requestPersistentLocalStorage().catch(()=>false);
  const entries=[];
  for(const [index,file] of list.entries()){
    let id=null;
    try{id=await hashFile(file)}catch(error){console.warn('IMAGE SET hash failed',error);continue}
    await putLocalMedia({sourceId:id,blob:file,name:file.name||id,type:file.type||'image/*',size:file.size,lastModified:file.lastModified||0,meta:{origin:'LIVE_IMAGE_SET',order:index,storedAt:new Date().toISOString()}}).catch(error=>console.warn('IMAGE SET vault store failed',error));
    entries.push({sourceId:id,name:file.name||id,type:file.type||'',size:file.size,order:index});
  }
  if(!entries.length){toast('IMAGE SET · NOTHING STORED');return null}
  const course=makeImageCourse(entries,{grain:'FRAME',dwell:IMAGE_DWELL_SECONDS,label});
  const manifest=makeImageSetManifest(course);
  imageRegistrySave([manifest,...imageRegistryLoad().filter(x=>x.setKey!==manifest.setKey)]);
  return openImageSetManifest(manifest);
}
function openImageSetManifest(raw,{announce=true}={}){
  const manifest=normalizeImageSetManifest(raw);
  stopDemo(false);
  clearReadRide({silent:true});
  try{$('#trackAudio').pause()}catch(_){}
  liveTrack.clearSource();linkedTrack=null;externalTrack=null;lastLinkedBeat=-1;
  deformationTape=[];sectionArc=createSectionArc();ride=createRideState();latestWorld=null;
  courseGrain=manifest.grain||'FRAME';
  imageSet={setKey:manifest.setKey,label:manifest.label,dwell:manifest.dwell,loop:true,entries:manifest.entries,course:null,clock:createImageClock(),visited:[]};
  imageStageKey='';imageTrailKey='';rebuildImageCourse(courseGrain);
  courseMode='FLOW';
  // The clock starts itself. FLOW does not wait for a click — that is the fix.
  imageSet.clock.seekSeconds(0);imageSet.clock.start();
  lastCoursePaint=-1;lastTextKey='';
  recordImageVisit(imageCourseAddressAt(imageSet.course,liveCourseProgress()));
  layerMode='IMMERSION';renderer.setProfile(effectiveRideProfile());syncLayerUI();syncSoundGate(false);
  const root=document.documentElement;
  root.dataset.foldBloomImageSet=manifest.setKey;
  root.dataset.foldBloomImageGrain=courseGrain;
  $('#intro').classList.remove('on');
  drawCourseMap(true);updateTextWitness();syncImageStage(true);update();refreshImageVault();
  startImageTicker();
  if(announce)toast(`IMAGE SET · ${manifest.label} · ${imageCourseSummary(imageSet.course)} · RUNNING`);
  return imageSetView();
}
function openImageSetByKey(setKey,{announce=true}={}){
  const manifest=imageRegistryLoad().find(m=>m.setKey===String(setKey||''));
  if(!manifest){toast('IMAGE SET · NOT REMEMBERED HERE');return null}
  return openImageSetManifest(manifest,{announce});
}
async function openImageSetFromVault(){
  const setKey=$('#imageSetSelect')?.value;if(!setKey)return null;
  const manifest=imageRegistryLoad().find(m=>m.setKey===setKey);
  if(!manifest){toast('IMAGE SET · MISSING');await refreshImageVault();return null}
  const seen=await Promise.all(manifest.entries.map(e=>hasLocalMedia(e.sourceId).catch(()=>false)));
  const missing=seen.filter(ok=>!ok).length;
  const out=openImageSetManifest(manifest,{announce:false});
  toast(missing?`IMAGE SET · ${missing}/${manifest.entries.length} BYTES MISSING`:`IMAGE SET · ${manifest.label} · RUNNING`);
  return out;
}
function clearImageSet({silent=false}={}){
  if(!imageSet)return false;
  stopImageTicker();
  for(const url of imageUrlCache.values()){try{URL.revokeObjectURL(url)}catch(_){}}
  imageUrlCache=new Map();imageUrlPending=new Map();imageStageKey='';imageTrailKey='';
  const img=$('#imageStage');if(img){img.hidden=true;img.removeAttribute('src');delete img.dataset.address;delete img.dataset.source}
  imageSet=null;
  if(IMAGE_GRAINS.includes(courseGrain))courseGrain='PHRASE';
  courseMode='FLOW';lastCoursePaint=-1;lastTextKey='';
  const root=document.documentElement;
  delete root.dataset.foldBloomImageSet;delete root.dataset.foldBloomImageTrail;
  delete root.dataset.foldBloomImageAdvances;delete root.dataset.foldBloomImageAddress;
  delete root.dataset.foldBloomImageRunning;delete root.dataset.foldBloomImageGrain;
  syncRideProfile();syncLayerUI();drawCourseMap(true);updateTextWitness();update();refreshImageVault();
  if(!silent)toast('IMAGE SET RETURNED');
  return true;
}
function stopImageTicker(){
  if(imageTick){clearInterval(imageTick);imageTick=0}
  return 0;
}
function refreshImageVault(){
  const select=$('#imageSetSelect'),count=$('#imageSetCount'),law=$('#imageSetLaw');
  imageRegistry=imageRegistryLoad();
  if(select){
    select.innerHTML='<option value="">REMEMBERED SETS…</option>'+imageRegistry.map(m=>`<option value="${String(m.setKey).replaceAll('"','&quot;')}"${imageSet&&imageSet.setKey===m.setKey?' selected':''}>${String(m.label||m.setKey).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))} · ${m.count}</option>`).join('');
  }
  if(count)count.textContent=String(imageRegistry.length);
  if(law)law.textContent=imageSet
    ?`${imageCourseSummary(imageSet.course)} · ${imageSet.clock?.paused?'HELD':'RUNNING'} · ${courseModeLabel()}`
    :'Local images stay in this browser vault. Declare a set once — it advances on its own clock, never on a click.';
  return imageRegistry;
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
  clearReadRide({silent:true});clearImageSet({silent:true});stopDemo(false);
  courseGrain='PHRASE';courseMode='FLOW';
  try{
    deformationTape=[];sectionArc=createSectionArc();ride=createRideState();latestWorld=null;linkedTrack=null;externalTrack=null;lastLinkedBeat=-1;
    trackStatus='DECODING';update();await liveTrack.loadFiles(files);
    if(retain)await retainLiveSource(files);
    layerMode='IMMERSION';renderer.setProfile(effectiveRideProfile());syncLayerUI();
    $('#intro').classList.remove('on');toast(label);update();
  }catch(error){console.warn(error);trackStatus='SONG ERROR';toast('SONG DECODE ERROR');update()}
}
function waitForRemoteReady(timeout=5000){
  const el=$('#trackAudio');if(!el)return Promise.reject(Error('NO AUDIO ELEMENT'));
  if(el.readyState>=1)return Promise.resolve(true);
  return new Promise((resolve,reject)=>{
    let settled=false;
    const clear=()=>{clearTimeout(timer);el.removeEventListener('loadedmetadata',ok);el.removeEventListener('canplay',ok);el.removeEventListener('error',fail)};
    const finish=(good,error)=>{if(settled)return;settled=true;clear();good?resolve(true):reject(error||Error('REMOTE SOURCE ERROR'))};
    const ok=()=>finish(true),fail=()=>finish(false,Error('REMOTE SOURCE ERROR')),timer=setTimeout(()=>finish(false,Error('REMOTE SOURCE TIMEOUT')),timeout);
    el.addEventListener('loadedmetadata',ok,{once:true});el.addEventListener('canplay',ok,{once:true});el.addEventListener('error',fail,{once:true});
  });
}
async function enterCenterMass(){
  clearReadRide({silent:true});clearImageSet({silent:true});stopDemo(false);
  courseGrain='PHRASE';courseMode='FLOW';
  try{
    trackStatus='PROBING OPTIONAL REMOTE SOURCE';update();
    liveTrack.loadStream({url:CENTER_MASS_URL,name:'CENTER MASS (Work-Trance Cut)',title:'CENTER MASS (Work-Trance Cut)',artist:'stgoh',sourceAddress:CENTER_MASS_SOURCE,sourceKind:'SUNO',provider:'SUNO'});
    await waitForRemoteReady();
    layerMode='SOURCE';renderer.setProfile(effectiveRideProfile());audio.setSound(false);syncLayerUI();
    trackStatus='READY · OPTIONAL REMOTE · CENTER MASS';$('#intro').classList.remove('on');update();
    const played=await liveTrack.toggle().then(()=>true).catch(()=>false);
    if(!played||$('#trackAudio').paused){syncSoundGate(true,'SOURCE');toast('REMOTE SOURCE READY · TAP FOR SOURCE')}
    else{syncSoundGate(false,'SOURCE');toast('CENTER MASS · OPTIONAL REMOTE SOURCE')}
    update();
  }catch(error){
    console.warn(error);liveTrack.clearSource();linkedTrack=null;externalTrack=null;lastLinkedBeat=-1;layerMode='IMMERSION';renderer.setProfile(effectiveRideProfile());syncLayerUI();syncSoundGate(false);
    trackStatus='FIELD COURSE · REMOTE SOURCE UNAVAILABLE';$('#intro').classList.add('on');update();toast('REMOTE SOURCE UNAVAILABLE · LIVE READY');
  }
}


async function preparePublicDemo(){
  clearReadRide({silent:true});clearImageSet({silent:true});
  if(publicDemoReady&&liveTrack.mapped())return true;
  if(publicDemoLoading)return publicDemoLoading;
  publicDemoLoading=(async()=>{
    document.documentElement.dataset.foldBloomDemoSource='loading';
    trackStatus='LOADING · PUBLIC AUDIO EXAMPLE';update();
    // no-cache (not force-cache): a replaced excerpt must revalidate. With force-cache,
    // any visitor who cached the previous asset stays stuck on DAMAGED indefinitely
    // (measured 2026-09-27: stale cache served the truncated 1.25s copy after the fix).
    const response=await fetch(PUBLIC_DEMO_URL,{cache:'no-cache'});
    if(!response.ok)throw Error('PUBLIC DEMO '+response.status);
    const blob=await response.blob(),file=new File([blob],'CENTER MASS — public demo excerpt.mp3',{type:blob.type||'audio/mpeg'});
    stopDemo(false);liveTrack.clearSource();deformationTape=[];sectionArc=createSectionArc();ride=createRideState();latestWorld=null;linkedTrack=null;externalTrack=null;lastLinkedBeat=-1;
    await liveTrack.loadFiles([file]);
    const decodedSeconds=Number(liveTrack.map?.duration)||0;
    if(decodedSeconds<6){liveTrack.clearSource();throw Error(`BUNDLED AUDIO DECODES TO ONLY ${decodedSeconds.toFixed(2)} SECONDS`)}
    $('#trackAudio').pause();$('#trackAudio').loop=true;
    layerMode='IMMERSION';renderer.setProfile(effectiveRideProfile());syncLayerUI();
    publicDemoReady=true;trackStatus='READY · PUBLIC DEMO · CENTER MASS';
    document.documentElement.dataset.foldBloomDemoSource='ready';
    for(const id of ['#publicDemoBtn','#publicDemoSettingsBtn']){const b=$(id);if(b)b.textContent='PLAY AUDIO EXAMPLE'}
    update();return true;
  })().catch(error=>{
    console.warn(error);publicDemoReady=false;document.documentElement.dataset.foldBloomDemoSource='error';
    trackStatus='AUDIO EXAMPLE DAMAGED · USE FIELD COURSE';update();toast('AUDIO EXAMPLE DAMAGED · USE FIELD COURSE');return false;
  }).finally(()=>{publicDemoLoading=null});
  return publicDemoLoading;
}
async function enterPublicDemo(){
  stopDemo(false);
  const wasReady=publicDemoReady&&liveTrack.mapped(),ok=wasReady?true:await preparePublicDemo();
  if(!ok)return false;
  $('#intro').classList.remove('on');applyLayerMode('IMMERSION',false);
  // Public audio example starts at a deliberately conservative level; the visible slider remains live.
  liveTrack.setVolume(.24);$('#trackVol').value='24';
  const played=$('#trackAudio').paused?await liveTrack.toggle().then(()=>true).catch(()=>false):true;
  if(!played||$('#trackAudio').paused){syncSoundGate(true,'SOURCE');toast('AUDIO EXAMPLE READY · TAP FOR SOURCE')}
  else{syncSoundGate(false,'SOURCE');toast('CENTER MASS EXCERPT · SOURCE + MAP + IMMERSION')}
  update();return played;
}

function practiceFieldOnly(){return !readRide&&!liveTrack.sourceActive()&&!externalTrack}
function advancePracticeField(beats=1){
  if(!practiceFieldOnly())return null;
  return practiceTrack.advance(beats);
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
function seekForecastSlot(slot,{announce=true}={}){
  stopDemo(true);
  const context=forecastContext(state),forecast=context.forecasts.find(x=>Number(x.slot)===Number(slot));
  if(!forecast)return {ok:false,reason:'NOT_A_LAWFUL_CURRENT_FORECAST',slot:Number(slot),authority:'HUMAN_NAVIGATION_ONLY'};
  const before={seq:state.seq,rotation:state.rotation,history:state.history.length};
  const delta=forecastSeekDelta(state.rotation,forecast.slot,N);
  if(delta){
    state=rotateSteps(state,delta);
    audio.setMotion(state.rotation,Math.min(1,Math.abs(delta)*.24));
    haptic(Math.min(16,4+Math.abs(delta)*2));
  }
  dragAngle=0;renderer.setDrag(0);update();
  const aligned=currentForecast(),out={
    ok:true,
    schema:'fold-bloom-live-native-choice/v0.1',
    authority:'HUMAN_NAVIGATION_ONLY',
    slot:forecast.slot,
    verb:forecast.verb,
    chain:forecast.chain,
    delta,
    before,
    after:{seq:state.seq,rotation:state.rotation,history:state.history.length},
    aligned:!!aligned&&aligned.slot===forecast.slot,
    release_committed:false,
    law:'direct forecast selection seeks one already-lawful native gate through TURN state; RELEASE remains a separate authored effect'
  };
  document.documentElement.dataset.foldBloomChoice=out.aligned?'aligned':'seek';
  if(announce)toast(`SEEK · ${forecast.verb}${forecast.chain>1?' ×'+forecast.chain:''} · RELEASE SEPARATE`);
  return out;
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
  const audioReady=audio.soundOn?ensureAudio().catch(()=>false):Promise.resolve(false);
  const out=release(state,timingNow()); if(!out.event)return;
  state=out.state;
  advancePracticeField(1);
  deformationTape=appendReleaseDeformations(deformationTape,out.event,linkedTrack);
  const arcOut=observeSectionRelease(sectionArc,out.event,linkedTrack);
  sectionArc=arcOut.arc;
  if(arcOut.bonus){
    state.flow+=arcOut.bonus;
    const last=state.history[state.history.length-1];
    if(last)last.sectionArc={sectionIndex:sectionArc.sectionIndex,sealed:true,bonus:arcOut.bonus,hits:sectionArc.hits,verbs:[...sectionArc.verbs]};
  }
  renderer.setSectionArc(sectionArcView(sectionArc,layerMode==='SOURCE'?null:linkedTrack));
  audioReady.then(ok=>{if(ok)audio.release(out.event)}).catch(()=>{});
  renderer.pulse(out.event); haptic(Math.min(34,7+out.event.chain*3+(out.event.callMet?3:0)+(arcOut.bonus?5:0)));
  fieldPulse.publish('operation',{operation:out.event.verb,cadence:out.event.cadence,operations:out.event.operations,slot:out.event.slot,type:out.event.typeName,chain:out.event.chain,charge:out.event.charge,power:out.event.power,scene:out.event.scene,call:out.event.call,callMet:out.event.callMet,timing:out.event.timing,flowGain:out.event.flowGain,mix:audio.mixSnapshot(),sectionIndex:linkedTrack?.sectionIndex??null,sectionProgress:linkedTrack?.sectionProgress??null,sectionSeal:arcOut.event?.kind==='SECTION_SEAL',sectionBonus:arcOut.bonus||0,trackTime:linkedTrack?.time??null,trackBeat:linkedTrack?.beatIndex??null,trackDeformationCount:deformationTape.length});
  const timing=out.event.timing&&out.event.timing!=='FREE'?' · '+out.event.timing:'';
  const arc=arcOut.bonus?` · SECTION SEALED +${arcOut.bonus}`:'';
  const road=linkedTrack?` · ROAD ${out.event.operations.join('→')}`:'';
  toast(`${out.event.callMet?'CALL ✓':'OPEN'} · ${out.event.verb}${out.event.chain>1?' ×'+out.event.chain:''}${timing}${arc}${road}`); dragAngle=0;
  if(courseMode==='RELEASE_STEP') stepTrackCourse(1);
  update();
}

function toggleMode(){state=setMode(state,state.mode==='RATCHET'?'FLOW':'RATCHET');toast(state.mode);update()}
function selectSoundScene(name){if(!audio.sceneNames().includes(name))return;stopDemo(true);const meta=scenePresentation(name);state=setScene(state,name);audio.setScene(name);renderer.setScene(name);toast(`SOUND PALETTE · ${meta.plain} · ${meta.short.toUpperCase()}`);update()}
function cycleScene(){const names=audio.sceneNames(),i=names.indexOf(state.scene);selectSoundScene(names[(i+1)%names.length])}

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
  stopDemo(true);dragging=true;startX=lastX=e.clientX;startY=e.clientY;stepAccum=0;pointerTravel=0;lastT=performance.now();try{cv.setPointerCapture?.(e.pointerId)}catch(_){};if(audio.soundOn)ensureAudio();
}
function pointMove(e){
  if(!dragging)return;e.preventDefault();const now=performance.now(),dx=e.clientX-lastX,total=e.clientX-startX,threshold=Math.max(20,innerWidth*.045),dir=Math.sign(dx)||1;
  pointerTravel=Math.max(pointerTravel,Math.hypot(e.clientX-startX,e.clientY-startY));
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
  const tapLimit=Math.max(9,Math.min(18,innerWidth*.025)),picked=e.type==='pointerup'&&pointerTravel<=tapLimit?renderer.pickForecast(state,e.clientX,e.clientY):null;
  if(picked){seekForecastSlot(picked.slot);return}
  if(state.mode==='FLOW'){
    const stepAngle=Math.PI*2/N,delta=Math.round(dragAngle/stepAngle);if(delta){steerRide(Math.sign(delta));state=rotateSteps(state,delta)}dragAngle=0;audio.setMotion(state.rotation,0);update();if(canRelease(state))doRelease();
  }else{dragAngle=0;renderer.setDrag(0);update()}
}
function pointCancel(){if(!dragging)return;dragging=false;dragAngle=0;renderer.setDrag(0);update()}
cv.addEventListener('pointerdown',pointDown);cv.addEventListener('pointermove',pointMove);cv.addEventListener('pointerup',pointUp);cv.addEventListener('pointercancel',pointCancel);

$('#turnLeft').onclick=()=>{stopDemo(true);step(-1)};$('#turnRight').onclick=()=>{stopDemo(true);step(1)};$('#releaseBtn').onclick=()=>{stopDemo(true);doRelease()};$('#modeBtn').onclick=()=>{stopDemo(true);toggleMode()};$('#sceneBtn').onclick=()=>{stopDemo(true);cycleScene()};$('#modeDrawerBtn').onclick=()=>{stopDemo(true);toggleMode()};
document.querySelectorAll('[data-sound-scene]').forEach(b=>b.addEventListener('click',()=>selectSoundScene(b.dataset.soundScene)));
$('#soundBtn').onclick=async()=>{if(!audio.ctx){await enableFieldAudio();return}audio.setSound(!audio.soundOn);syncSoundGate(false);update()};
const setMenuOpen=open=>{
  const on=!!open,drawer=$('#settings');
  drawer.classList.toggle('on',on);
  document.documentElement.classList.toggle('fbMenuOpen',on);
  document.body.classList.toggle('fbMenuOpen',on);
  drawer.setAttribute('aria-hidden',on?'false':'true');
  if(on)drawer.scrollTop=0;
};
$('#menuBtn').onclick=()=>setMenuOpen(!$('#settings').classList.contains('on'));
const closeMenuEvent=e=>{e?.preventDefault?.();e?.stopPropagation?.();setMenuOpen(false)};
$('#closeSettings').addEventListener('pointerdown',closeMenuEvent);
$('#closeSettings').onclick=closeMenuEvent;
$('#menuDismiss').addEventListener('pointerdown',closeMenuEvent);

function gardenState(){
  return {open:gardenOpen,host:'FOLD_BLOOM_LIVE',authority:'ECOLOGY',canonical:'/fold-bloom/ecology/',sourceClockBridge:false,releaseAuthority:false,heldCourseMode:gardenReturn?.courseMode||null};
}
function openGarden({announce=true}={}){
  const frame=$('#gardenFrame'),view=$('#gardenView');if(!frame||!view)return gardenState();
  if(gardenOpen)return gardenState();
  const sourceWasPlaying=!!(liveTrack.sourceActive()&&!$('#trackAudio').paused);
  const imageWasRunning=!!(imageSet?.clock&&!imageSet.clock.paused);
  gardenReturn={courseMode,sourceWasPlaying,imageWasRunning,audioSoundOn:!!audio.soundOn};
  stopDemo(true);
  try{$('#trackAudio').pause()}catch(_){}
  if(imageSet?.clock)imageSet.clock.hold();
  audio.setSound(false);syncSoundGate(false);setMenuOpen(false);
  gardenOpen=true;frame.hidden=false;
  document.documentElement.classList.add('fbGardenOpen');document.body.classList.add('fbGardenOpen');
  document.documentElement.dataset.foldBloomGarden='open';
  if(!view.dataset.loaded){view.src=view.dataset.src||'../ecology/?embedded=live&garden=1';view.dataset.loaded='1'}
  $('#intro').classList.remove('on');
  if(announce)toast('GARDEN · ECOLOGY AUTHORITY · LIVE HELD');
  update();return gardenState();
}
async function closeGarden({restore=true,announce=true}={}){
  const frame=$('#gardenFrame');if(!gardenOpen){if(frame)frame.hidden=true;return gardenState()}
  const held=gardenReturn;gardenOpen=false;gardenReturn=null;
  if(frame)frame.hidden=true;
  const view=$('#gardenView');if(view){view.src='about:blank';delete view.dataset.loaded}
  document.documentElement.classList.remove('fbGardenOpen');document.body.classList.remove('fbGardenOpen');
  document.documentElement.dataset.foldBloomGarden='closed';
  if(restore&&held){
    setCourseMode(held.courseMode||'STEP',false);
    if(held.sourceWasPlaying&&liveTrack.sourceActive()&&$('#trackAudio').paused)await liveTrack.toggle().catch(()=>{});
    if(held.imageWasRunning&&imageSet?.clock&&held.courseMode==='FLOW'&&imageSet.clock.paused)imageSet.clock.start();
    if(held.audioSoundOn&&audio.ctx)audio.setSound(true);
  }
  if(announce)toast('RETURN LIVE · HELD CONTEXT RESTORED');
  update();return gardenState();
}
$('#gardenOpenBtn').onclick=()=>openGarden();
$('#gardenClose').onclick=()=>{void closeGarden()};
$('#vol').value=Math.round(audio.volume*100);$('#vol').oninput=e=>audio.setVolume(+e.target.value/100);
$('#trackVol').value=Math.round($('#trackAudio').volume*100);$('#trackVol').oninput=e=>liveTrack.setVolume(+e.target.value/100);
for(const part of MIX_PARTS){
  const tune=$('#'+part+'Tune');
  if(!tune)continue;
  tune.oninput=()=>{audio.setPartLevel(part,Number(tune.value)/100);syncMixUI()};
}
$('#mixResetBtn').onclick=()=>{audio.mixReset();syncMixUI();toast('MIX RESET')};
const chooseSong=()=>{stopDemo(true);setMenuOpen(false);$('#trackFile').click()};
const chooseRead=()=>{stopDemo(true);setMenuOpen(false);$('#readFile').click()};
$('#trackLoad').onclick=chooseSong;$('#readLoad').onclick=chooseRead;
$('#sourceQuick')?.addEventListener('click',()=>authoredReader?showAuthoredProvenance():readRide?chooseRead():chooseSong());
$('#vibeQuick')?.addEventListener('click',cycleVibe);
$('#songIntroBtn').onclick=()=>{stopDemo(false);setMenuOpen(false);$('#trackFile').click()};
$('#readIntroBtn')?.addEventListener('click',chooseRead);
$('#authoredIntroBtn')?.addEventListener('click',()=>{void openAuthoredReader('prison-age-2021')});
$('#readerProvBtn')?.addEventListener('click',showAuthoredProvenance);$('#readerProvClose')?.addEventListener('click',()=>{$('#readerProvenance').hidden=true});
$('#readerPrev')?.addEventListener('click',()=>stepTrackCourse(-1));$('#readerNext')?.addEventListener('click',()=>stepTrackCourse(1));
$('#readerRecurrencePrev')?.addEventListener('click',()=>jumpAuthoredRecurrence(-1));$('#readerRecurrenceNext')?.addEventListener('click',()=>jumpAuthoredRecurrence(1));
$('#readerMark')?.addEventListener('click',markReadRide);$('#readerReturnBtn')?.addEventListener('click',showAuthoredReturn);
$('#readerReturnClose')?.addEventListener('click',closeAuthoredReturn);$('#readerAgain')?.addEventListener('click',()=>{closeAuthoredReturn();seekCourseProgress(0);syncAuthoredReaderUI();toast('READ AGAIN · SAME SOURCE')});
$('#readerReturnSource')?.addEventListener('click',()=>{const r=currentAuthoredReturn();if(r)try{sessionStorage.setItem('fold-bloom.authored-reading.return.v01',JSON.stringify(r))}catch(_){};if(!returnReadRide())toast('SOURCE RETURN BLOCKED')});
$('#imageIntroBtn')?.addEventListener('click',()=>{stopDemo(true);setMenuOpen(false);$('#imageFile').click()});
$('#publicDemoBtn')?.addEventListener('click',()=>{void enterPublicDemo()});$('#publicDemoSettingsBtn')?.addEventListener('click',()=>{void enterPublicDemo()});
$('#centerMassBtn')?.addEventListener('click',()=>{void enterCenterMass()});$('#centerMassSettingsBtn')?.addEventListener('click',()=>{void enterCenterMass()});
$('#vaultOpen')?.addEventListener('click',()=>{void openVaultSource()});
// IMAGE SET — three reachable ops and no more: declare, open a remembered set, return.
$('#imagePickBtn')?.addEventListener('click',()=>{stopDemo(true);setMenuOpen(false);$('#imageFile').click()});
$('#imageFile').onchange=e=>{const files=[...(e.target.files||[])];e.target.value='';if(files.length)void declareImageSet(files)};
$('#imageSetSelect')?.addEventListener('change',e=>{const setKey=e.target.value;if(setKey)void openImageSetFromVault()});
$('#imageClearBtn')?.addEventListener('click',()=>clearImageSet());
$('#trackFile').onchange=e=>loadLocalSong(e.target.files);
$('#readFile').onchange=e=>{const file=e.target.files?.[0];e.target.value='';if(file)void loadReadFile(file)};
$('#readfieldReturn')?.addEventListener('click',()=>{if(!returnReadRide())toast('NO READFIELD RETURN')});$('#sourceEchoFollow')?.addEventListener('click',()=>{void followReadEcho()});
$('#readTrailMark')?.addEventListener('click',()=>markReadRide());
$('#trackToggle').onclick=()=>{stopDemo(true);if($('#trackAudio').paused&&(courseMode==='STEP'||courseMode==='RELEASE_STEP'))setCourseMode('FLOW',false);liveTrack.toggle().then(()=>{drawCourseMap(true);update()}).catch(()=>toast('SONG PLAY BLOCKED'))};
$('#courseMode').onclick=cycleCourseMode;
$('#courseQuick')?.addEventListener('click',cycleCourseMode);
$('#courseGrain').onclick=cycleCourseGrain;
$('#courseBack').onclick=()=>stepTrackCourse(-1);$('#courseNext').onclick=()=>stepTrackCourse(1);
$('#courseMap').addEventListener('pointerdown',e=>{if(!liveCourse())return;const r=e.currentTarget.getBoundingClientRect(),p=(e.clientX-r.left)/Math.max(1,r.width);stopDemo(true);seekCourseProgress(p);e.preventDefault()});
$('#textBtn').onclick=()=>{textOn=!textOn;lastTextKey='';updateTextWitness();update()};
const tune=(id,key,scale=100)=>{const el=$(id);if(!el)return;el.oninput=e=>{rideProfile=normalizeRideProfile({...rideProfile,[key]:Number(e.target.value)/scale});saveRideProfile();lastTextKey='';updateTextWitness();update()}};
tune('#solidTune','solidity');tune('#immersionTune','immersion');tune('#anticipationTune','anticipation');tune('#motionGainTune','motionGain');tune('#dropGainTune','dropGain');tune('#textSyncTune','textOffset');
document.querySelectorAll('[data-xp-preset]').forEach(b=>b.onclick=()=>applyRidePreset(b.dataset.xpPreset));
document.querySelectorAll('[data-layer-mode]').forEach(b=>b.onclick=()=>applyLayerMode(b.dataset.layerMode));
$('#listenBtn').onclick=()=>window.open('../listen/','fold-bloom-listen');
$('#exportBtn').onclick=()=>{
  const packet={kind:'FOLD_BLOOM_LIVE_RETURN',version:VERSION,created:new Date().toISOString(),source:{foldWeave:'/recovery/fold-bloom/fold-weave-0.1/',twoDial:'/fold-bloom/two-dial/',readRide:readRideState()},state:snapshot(state),mix:audio.mixSnapshot(),performance:{sectionArc,deformationTape,ride:{...ride,trace:(ride.trace||[]).map(x=>({...x}))}}};
  const blob=new Blob([JSON.stringify(packet,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`fold-bloom-live-${Date.now()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('RETURN EXPORTED')
};
function resetLiveState({silent=false}={}){stopDemo(false);state=createState();sectionArc=createSectionArc();deformationTape=[];ride=createRideState();latestWorld=null;practiceTrack.reset();audio.hydrate(state);renderer.setScene(state.scene);syncRideProfile();dragAngle=0;update();if(!silent)toast('NEW FIELD');return snapshot(state)}
$('#resetBtn').onclick=()=>{const now=Date.now(),b=$('#resetBtn');if(!b.dataset.arm||now>+b.dataset.arm){b.dataset.arm=now+3500;b.textContent='CONFIRM RESET';toast('PRESS AGAIN');return}delete b.dataset.arm;b.textContent='NEW FIELD';resetLiveState()};
$('#playBtn').onclick=()=>{stopDemo(false);applyRidePreset('DRIVE',false);renderer.setProfile(effectiveRideProfile());syncVibeQuick();audio.setSound(false);practiceTrack.pause();courseMode='STEP';syncSoundGate(true,'FIELD');$('#intro').classList.remove('on');update();toast('DRIVE FIELD · STILL · RELEASE ADVANCES ONE BEAT')};
$('#mutePlay').onclick=()=>{stopDemo(false);$('#intro').classList.remove('on');audio.setSound(false);syncSoundGate(false);update()};
$('#soundGate')?.addEventListener('click',()=>{
  const gate=$('#soundGate');
  if(gate?.dataset.mode==='SOURCE'){
    liveTrack.toggle().then(()=>{syncSoundGate(false,'SOURCE');update();toast('SOURCE · PLAYING')}).catch(()=>toast('SOURCE PLAY BLOCKED'));
    return;
  }
  void enableFieldAudio();
});
const toggleAutopilot=async()=>{
  if(demo.on){stopDemo(true);return}
  if(audio.soundOn)await ensureAudio();
  syncSoundGate(false);
  startDemo({preview:true,playTrack:true});
};
$('#demoBtn').onclick=toggleAutopilot;$('#demoSettingsBtn')?.addEventListener('click',toggleAutopilot);$('#autoBtn')?.addEventListener('click',toggleAutopilot);

addEventListener('keydown',e=>{
  if(e.repeat)return;
  if(e.key==='Escape'){e.preventDefault();setMenuOpen(false);return}
  if(e.key.toLowerCase()==='d'){e.preventDefault();if(demo.on)stopDemo(true);else startDemo({preview:true,playTrack:true});return}
  stopDemo(true);
  if(e.key==='ArrowLeft'){e.preventDefault();step(-1)}
  else if(e.key==='ArrowRight'){e.preventDefault();step(1)}
  else if(e.code==='Space'||e.key==='Enter'){e.preventDefault();doRelease()}
  else if(e.key.toLowerCase()==='r')toggleMode();
  else if(e.key.toLowerCase()==='s')cycleScene();
  else if(e.key.toLowerCase()==='m'){if(!audio.soundOn&&!audio.ctx)void enableFieldAudio();else{audio.setSound(!audio.soundOn);update()}}
});

fieldPulse.subscribe(msg=>{
  if(msg?.kind==='steering'){
    steeringPulse=msg;const view=refreshSteeringPreview();if(view)toast(`LENS ${view.verb} · ${view.candidate_count} LAWFUL`);update();return;
  }
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
if(pulseHandoff?.kind==='steering')steeringPulse=pulseHandoff;
if(new URLSearchParams(location.search).get('from')==='field-lab'&&pulseHandoffClock?.source==='FOLD_BLOOM_FIELD_LAB'){
  externalTrack={...pulseHandoff.data,playing:true,_receivedAt:performance.now(),_pulseLabel:pulseHandoffClock.label,_pulseSource:pulseHandoffClock.source,_pulseClock:pulseHandoffClock.clock,_pulseSeed:true};
  linkedTrack=externalTrack;
}

document.addEventListener('visibilitychange',()=>{if(document.hidden){stopDemo(false);audio.stop()}else if(audio.ctx&&audio.soundOn)audio.start()});
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
  renderer.setMotionActive(!!linkedTrack?.playing);
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
    const source=liveTrack.sourceActive()?(liveTrack.mapped()?'LOCAL_FILE':'SOURCE_ONLY'):externalFresh?'FIELD_PULSE':'FIELD_PRACTICE';
    document.documentElement.dataset.trackfieldSource=source;
    document.documentElement.dataset.trackfieldMotion=latestWorld?`${Number(latestWorld.currentSpeed||1).toFixed(2)}:${Number(latestWorld.currentGrade||0).toFixed(2)}:${Number(latestWorld.currentBend||0).toFixed(2)}`:'NONE';
    document.documentElement.dataset.foldBloomPerf=`${perf.fps.toFixed(0)}fps:${modelSlices}slices`;
    const pe=$('#perfState');if(pe)pe.textContent=`PERF · ${perf.fps.toFixed(0)} FPS · ${modelSlices} MODEL SLICES · MODEL ≤36 HZ`;
  }
  renderer.setTrackfield(latestWorld);
  drawCourseMap();
  syncImageStage();
  syncImageSetReadouts();
  updateTextWitness();
  renderer.setSectionArc(sectionArcView(sectionArc,layerMode==='SOURCE'?null:linkedTrack));
  renderer.draw(state,t);raf=requestAnimationFrame(loop)
}raf=requestAnimationFrame(loop);
syncRideProfile();syncLayerUI();refreshVault();refreshImageVault();drawCourseMap(true);syncMixUI();update();
document.documentElement.dataset.foldBloomLive='ready';document.documentElement.dataset.foldBloomPov='embodied-v0.4';document.documentElement.dataset.foldBloomMacroDrop='v0.2';document.documentElement.dataset.foldBloomIdleLaw='witness-v0.1';document.documentElement.dataset.foldBloomIdle='off';document.documentElement.dataset.foldBloomAutopilot='off';document.documentElement.dataset.foldBloomLandmarks='0';
window.FoldBloomLive={boot:'ready',version:VERSION,garden:{open:openGarden,close:closeGarden,current:gardenState},authored:{open:openAuthoredReader,current:()=>authoredReader?{pack:JSON.parse(JSON.stringify(authoredReader.pack)),hash:authoredReader.hash,state:readRideState(),return:currentAuthoredReturn()}:null,recurrence:jumpAuthoredRecurrence,showReturn:showAuthoredReturn,showProvenance:showAuthoredProvenance},course:{mode:()=>courseMode,grain:()=>courseGrain,setMode:setCourseMode,cycleGrain:cycleCourseGrain,step:stepTrackCourse,seek:seekCourseProgress,strip:()=>readRide?drawCourseMap(true):(liveTrack.map?courseStrip(liveTrack.map,Number($('#trackAudio')?.currentTime)||0):null),address:()=>syncCourseControls()?.address||null},state:()=>({...snapshot(state),mix:audio.mixSnapshot(),garden:gardenState(),linkedTrack,sectionArc,deformationTape,ride,trackfield:latestWorld,textWitness:readRide?readCourseWitness(liveCourse(),liveCourseProgress()):liveTrack.textWitness(undefined,rideProfile.textOffset),sourceMeta:readRide?readRideState()?.source:liveTrack.metadata(),readRide:readRideState(),imageSet:imageSetView(),rideProfile:{...rideProfile},layerMode,publicDemoReady,autopilot:demo.on,forecastContext:forecastContext(state),perf:{fps:+perf.fps.toFixed(1),modelSlices:innerWidth<620?46:56}}),loadFiles:loadLocalSong,openExample:enterPublicDemo,prepareExample:preparePublicDemo,openCenterMass:enterCenterMass,refreshVault,release:doRelease,step,forecast:()=>currentForecast(),timing:()=>timingNow(),sectionArc:()=>sectionArcView(sectionArc,linkedTrack),trackfield:()=>latestWorld,deformations:()=>deformationTape.map(x=>({...x})),ride:()=>rideView(ride,latestWorld),read:{loadPacket:loadReadRidePacket,loadText:loadReadText,loadFile:loadReadFile,current:readRideState,clear:clearReadRide,return:returnReadRide,followEcho:followReadEcho,echoThread:()=>readEchoThread?JSON.parse(JSON.stringify(readEchoThread)):null},images:{declare:declareImageSet,open:openImageSetByKey,openFromVault:openImageSetFromVault,clear:clearImageSet,current:imageSetView,list:()=>imageRegistryLoad(),summary:()=>imageCourseSummary(imageSet?.course)},layers:{apply:applyLayerMode,current:()=>layerMode},autopilot:{start:()=>startDemo({preview:true,playTrack:true}),stop:()=>stopDemo(true),toggle:toggleAutopilot},profile:{apply:applyRidePreset,current:()=>({...rideProfile}),name:()=>ridePresetName()},gameProjection:{set:view=>renderer.setGameProjection(view),clear:()=>renderer.setGameProjection(null)},choice:{seek:seekForecastSlot,targets:()=>renderer.forecastTargets(state).map(x=>({...x})),context:()=>currentLiveCalculation().native},steering:{preview:setManualSteeringPreview,clear:clearSteeringPreview,current:()=>steeringView?JSON.parse(JSON.stringify(steeringView)):null,context:()=>forecastContext(state)},calculus:()=>currentLiveCalculation(),reset:resetLiveState,practice:()=>practiceTrack.map};
const launchParams=new URLSearchParams(location.search),launchPreset=String(launchParams.get('profile')||'').toUpperCase(),launchLayer=String(launchParams.get('layer')||'').toUpperCase(),launchSource=String(launchParams.get('source')||'').toLowerCase(),launchReader=String(launchParams.get('reader')||'').toLowerCase(),launchExperience=String(launchParams.get('experience')||'').toLowerCase(),launchGarden=['1','true','open','garden'].includes(String(launchParams.get('garden')||'').toLowerCase());
if(RIDE_PRESETS[launchPreset])applyRidePreset(launchPreset,false);
if(launchGarden){document.documentElement.dataset.foldBloomLaunch='garden';openGarden({announce:false})}
else if(launchReader){document.documentElement.dataset.foldBloomLaunch='authored-reader';void openAuthoredReader(launchReader,{announce:false}).catch(error=>{console.warn('AUTHORED READER',error);document.documentElement.dataset.foldBloomAuthoredReader='error';toast('AUTHORED SOURCE REJECTED')})}
else if(launchSource==='readfield'){document.documentElement.dataset.foldBloomLaunch=launchExperience==='echo-walk'?'echo-walk':'readfield';consumeReadRideHandoff();if(launchExperience==='echo-walk'&&isEchoWalk()){courseGrain='SENTENCE';readRide.course=null;resetExactReadTrail();setCourseMode('RELEASE_STEP',false);drawCourseMap(true);updateTextWitness();update();document.documentElement.dataset.foldBloomEchoWalk='active';toast('ECHO WALK · RELEASE → SENTENCE')}}
if(['SOURCE','MAP','IMMERSION'].includes(launchLayer))applyLayerMode(launchLayer,false);
// A remembered set can be opened by name, exactly like a remembered audio source
// (`?source=`). The picker is a one-time act; the address is addressable after it.
const launchImages=String(launchParams.get('images')||'').trim();
if(launchImages){document.documentElement.dataset.foldBloomLaunch='image-set';openImageSetByKey(launchImages,{announce:false})}
if(launchGarden){/* hosted GARDEN owns launch */}
else if(launchReader){/* authored reader owns launch */}
else if(launchSource==='example'){document.documentElement.dataset.foldBloomLaunch='public-demo';preparePublicDemo().then(ok=>{if(ok)toast('AUDIO EXAMPLE READY · TAP PLAY')})}
else if(launchSource==='center-mass'){document.documentElement.dataset.foldBloomLaunch='legacy-center-mass';setTimeout(()=>{toast('OLD CENTER MASS LINK · LIVE RESTORED · REMOTE IS OPTIONAL')},180)}
else if(launchParams.get('demo')==='1'){document.documentElement.dataset.foldBloomLaunch='demo';setTimeout(()=>{$('#intro').classList.remove('on');syncSoundGate(!audio.ctx,'FIELD');startDemo({preview:true});toast('FIELD COURSE · TAP FOR FIELD SOUND')},180)}
else document.documentElement.dataset.foldBloomLaunch='still';
