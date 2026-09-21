import { VERSION, createState, restore, snapshot, rotateSteps, release, canRelease, setMode, setScene, gateCellIndex, isAligned, forecastRelease, forecastMatchesCall, callLabel, TYPE_NAMES, N } from './engine.js';
import { FoldBloomAudio } from './audio.js';
import { Renderer } from './render.js';
import { createFieldPulse } from '../../lib/field-pulse.js';
import { LiveTrack } from './track.js';

const $=s=>document.querySelector(s), STORE='fb-live-0.1';
const cv=$('#field'), renderer=new Renderer(cv);
let state=load() || createState();
let dragging=false,startX=0,lastX=0,stepAccum=0,lastT=0,dragAngle=0,raf=0;
let demo={on:false,timer:0,releases:0};
const audio=new FoldBloomAudio(step=>renderer.beatPulse(step));
const fieldPulse=createFieldPulse('FOLD_BLOOM_LIVE');
let linkedTrack=null,lastLinkedBeat=-1,trackStatus='NONE';
const liveTrack=new LiveTrack($('#trackAudio'),{
  onState:t=>{trackStatus=t;update()},
  onMap:m=>toast(m?.stage==='DEEP'?'SONG MAP · DEEP':'SONG MAP · PREVIEW')
});
liveTrack.setVolume(.78);
audio.hydrate(state);

function save(){try{localStorage.setItem(STORE,JSON.stringify(snapshot(state)))}catch(_){}}
function load(){try{return restore(JSON.parse(localStorage.getItem(STORE)||'null'))}catch(_){return null}}
function haptic(ms=5){try{navigator.vibrate?.(ms)}catch(_){}}
function toast(text){const el=$('#toast');el.textContent=text;el.classList.remove('on');void el.offsetWidth;el.classList.add('on')}
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
function currentForecast(){return forecastRelease(state)}
function callHit(f=currentForecast()){return forecastMatchesCall(state.call,f)}
function releaseLabel(){
  const f=currentForecast();
  if(!f)return `SEEK ${TYPE_NAMES[state.targetType]}`;
  const op=`${f.verb}${f.chain>1?' ×'+f.chain:''}`;
  return callHit(f)?`${op} · HIT CALL`:`${op} · RELEASE`;
}

function statusText(){
  const idx=gateCellIndex(state),c=state.cells[idx],f=currentForecast(),track=linkedTrack?.playing?` · TRACK B${Math.max(0,linkedTrack.beatIndex)+1} ${timingNow().label}`:'';
  const forecast=f?` · HERE ${f.verb}${f.chain>1?'×'+f.chain:''}${callHit(f)?' ✓':''}`:'';
  return `GATE ${String(idx).padStart(2,'0')} · ${TYPE_NAMES[c.type]} · CALL ${callLabel(state.call)} · ${state.creases.length} CREASE${state.creases.length===1?'':'S'}${forecast}${track}`;
}
function update(){
  $('#flow').textContent=state.flow.toLocaleString();
  $('#chain').textContent=state.bestChain>1?state.bestChain+'×':'—';
  $('#target').textContent=TYPE_NAMES[state.targetType];
  $('#call').textContent=callLabel(state.call);
  $('#streak').textContent=state.callStreak>1?state.callStreak+'×':'—';
  $('#timing').textContent=linkedTrack?.playing?timingNow().label:'—';
  $('#trackState').textContent=trackStatus;
  $('#trackToggle').disabled=!liveTrack.active();
  $('#trackToggle').textContent=liveTrack.active()?($('#trackAudio').paused?'PLAY SONG':'PAUSE SONG'):'PLAY / PAUSE';
  $('#mode').textContent=state.mode;
  $('#scene').textContent=state.scene;
  $('#modeBtn').textContent=state.mode;
  $('#sceneBtn').textContent=state.scene;
  $('#releaseBtn').disabled=!canRelease(state);
  $('#releaseBtn').textContent=canRelease(state)?releaseLabel():`SEEK ${TYPE_NAMES[state.targetType]}`;
  $('#chargeBar').style.width=`${Math.min(100,state.charge/1.75*100)}%`;
  $('#status').textContent=statusText();
  $('#soundBtn').textContent=audio.soundOn?'♪':'×';
  $('#build').textContent=`${VERSION} · visible forecasts + achievable calls · bounded 8-note motif · ${state.history.length} recent events`;
  renderer.setDrag(dragAngle);
  save();
}

async function ensureAudio(){try{await audio.init();return true}catch(_){return false}}
async function loadLocalSong(file){
  if(!file)return;
  try{
    await ensureAudio();trackStatus='DECODING';update();await liveTrack.load(file);
    $('#intro').classList.remove('on');toast('CUSTOM SONG READY');update();
  }catch(error){console.warn(error);trackStatus='SONG ERROR';toast('SONG DECODE ERROR');update()}
}

function step(dir,count=1){
  const n=Math.max(1,Math.min(8,Math.abs(count|0)));
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
  state=out.state; audio.release(out.event); renderer.pulse(out.event); haptic(Math.min(28,7+out.event.chain*3+(out.event.callMet?3:0)));
  fieldPulse.publish('operation',{operation:out.event.verb,cadence:out.event.cadence,operations:out.event.operations,slot:out.event.slot,type:out.event.typeName,chain:out.event.chain,charge:out.event.charge,power:out.event.power,scene:out.event.scene,call:out.event.call,callMet:out.event.callMet,timing:out.event.timing,flowGain:out.event.flowGain,trackTime:linkedTrack?.time??null,trackBeat:linkedTrack?.beatIndex??null});
  const timing=out.event.timing&&out.event.timing!=='FREE'?' · '+out.event.timing:'';
  toast(`${out.event.callMet?'CALL ✓':'OPEN'} · ${out.event.verb}${out.event.chain>1?' ×'+out.event.chain:''}${timing}`); dragAngle=0; update();
}

function toggleMode(){state=setMode(state,state.mode==='RATCHET'?'FLOW':'RATCHET');toast(state.mode);update()}
function cycleScene(){const names=audio.sceneNames(),i=names.indexOf(state.scene),name=names[(i+1)%names.length];state=setScene(state,name);audio.setScene(name);toast(name);update()}

function stopDemo(takeover=false){
  if(!demo.on)return;demo.on=false;clearTimeout(demo.timer);demo.timer=0;
  if(takeover)toast('YOUR TURN');
}
async function demoTick(){
  if(!demo.on)return;
  const forecast=currentForecast();
  if(canRelease(state) && callHit(forecast)){
    await doRelease();demo.releases++;
    if(demo.releases%3===0)cycleScene();
    if(demo.releases>=12){stopDemo(false);toast('DEMO RETURN · YOUR TURN');return}
    demo.timer=setTimeout(demoTick,620);
  }else{
    step(1);demo.timer=setTimeout(demoTick,270);
  }
}
async function startDemo(){
  if(demo.on)return;await ensureAudio();state=setMode(state,'RATCHET');demo={on:true,timer:0,releases:0};
  $('#intro').classList.remove('on');toast('WATCH · CHARGE → RELEASE');update();demoTick();
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
    const stepAngle=Math.PI*2/N,delta=Math.round(dragAngle/stepAngle);if(delta)state=rotateSteps(state,delta);dragAngle=0;audio.setMotion(state.rotation,0);update();if(canRelease(state))doRelease();
  }else{dragAngle=0;renderer.setDrag(0);update()}
}
cv.addEventListener('pointerdown',pointDown);cv.addEventListener('pointermove',pointMove);cv.addEventListener('pointerup',pointUp);cv.addEventListener('pointercancel',pointUp);

$('#releaseBtn').onclick=()=>{stopDemo(true);doRelease()};$('#modeBtn').onclick=()=>{stopDemo(true);toggleMode()};$('#sceneBtn').onclick=()=>{stopDemo(true);cycleScene()};
$('#soundBtn').onclick=async()=>{if(!audio.ctx)await ensureAudio();else audio.setSound(!audio.soundOn);update()};
$('#menuBtn').onclick=()=>$('#settings').classList.toggle('on');$('#closeSettings').onclick=()=>$('#settings').classList.remove('on');
$('#vol').value=Math.round(audio.volume*100);$('#vol').oninput=e=>audio.setVolume(+e.target.value/100);
$('#trackVol').value=Math.round($('#trackAudio').volume*100);$('#trackVol').oninput=e=>liveTrack.setVolume(+e.target.value/100);
$('#trackLoad').onclick=()=>$('#trackFile').click();$('#songIntroBtn').onclick=()=>$('#trackFile').click();
$('#trackFile').onchange=e=>loadLocalSong(e.target.files?.[0]);
$('#trackToggle').onclick=()=>liveTrack.toggle().then(()=>update()).catch(()=>toast('SONG PLAY BLOCKED'));
$('#listenBtn').onclick=()=>window.open('../listen/','fold-bloom-listen');
$('#exportBtn').onclick=()=>{
  const packet={kind:'FOLD_BLOOM_LIVE_RETURN',version:VERSION,created:new Date().toISOString(),source:{foldWeave:'/recovery/fold-bloom/fold-weave-0.1/',twoDial:'/fold-bloom/two-dial/'},state:snapshot(state)};
  const blob=new Blob([JSON.stringify(packet,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`fold-bloom-live-${Date.now()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('RETURN EXPORTED')
};
$('#resetBtn').onclick=()=>{const now=Date.now(),b=$('#resetBtn');if(!b.dataset.arm||now>+b.dataset.arm){b.dataset.arm=now+3500;b.textContent='CONFIRM RESET';toast('PRESS AGAIN');return}delete b.dataset.arm;b.textContent='NEW FIELD';state=createState();audio.hydrate(state);dragAngle=0;update();toast('NEW FIELD')};
$('#playBtn').onclick=async()=>{stopDemo(false);await ensureAudio();$('#intro').classList.remove('on');update()};
$('#mutePlay').onclick=()=>{stopDemo(false);$('#intro').classList.remove('on');audio.setSound(false);update()};
$('#demoBtn').onclick=startDemo;

addEventListener('keydown',e=>{
  if(e.repeat)return;stopDemo(true);
  if(e.key==='ArrowLeft'){e.preventDefault();step(-1)}
  else if(e.key==='ArrowRight'){e.preventDefault();step(1)}
  else if(e.code==='Space'||e.key==='Enter'){e.preventDefault();doRelease()}
  else if(e.key.toLowerCase()==='r')toggleMode();
  else if(e.key.toLowerCase()==='s')cycleScene();
  else if(e.key.toLowerCase()==='m'){audio.setSound(!audio.soundOn);update()}
  else if(e.key==='Escape')$('#settings').classList.toggle('on');
});

fieldPulse.subscribe(msg=>{
  if(msg.source!=='FOLD_BLOOM_LISTEN'||msg.kind!=='transport'||liveTrack.active())return;
  linkedTrack=msg.data?{...msg.data,_receivedAt:performance.now()}:null;
  const beat=Number(linkedTrack?.beatIndex);
  if(Number.isFinite(beat)&&beat>=0&&beat!==lastLinkedBeat){lastLinkedBeat=beat;renderer.beatPulse(beat,Number(linkedTrack.energy)||0)}
  update();
});

document.addEventListener('visibilitychange',()=>{if(document.hidden){stopDemo(false);audio.stop()}else if(audio.ctx)audio.start()});
function loop(t){
  const local=liveTrack.transport();
  if(local){linkedTrack=local;const beat=Number(local.beatIndex);if(Number.isFinite(beat)&&beat>=0&&beat!==lastLinkedBeat){lastLinkedBeat=beat;renderer.beatPulse(beat,Number(local.energy)||0)}}
  renderer.draw(state,t);raf=requestAnimationFrame(loop)
}raf=requestAnimationFrame(loop);
update();
document.documentElement.dataset.foldBloomLive='ready';
window.FoldBloomLive={version:VERSION,state:()=>({...snapshot(state),linkedTrack}),release:doRelease,step,forecast:()=>currentForecast(),timing:()=>timingNow()};
