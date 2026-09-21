import { VERSION, createState, restore, snapshot, rotateSteps, release, canRelease, setMode, setScene, gateCellIndex, isAligned, TYPE_NAMES, N } from './engine.js';
import { FoldBloomAudio } from './audio.js';
import { Renderer } from './render.js';

const $=s=>document.querySelector(s), STORE='fb-live-0.1';
const cv=$('#field'), renderer=new Renderer(cv);
let state=load() || createState();
let dragging=false,startX=0,lastX=0,stepAccum=0,lastT=0,dragAngle=0,raf=0;
const audio=new FoldBloomAudio(step=>renderer.beatPulse(step));
audio.hydrate(state);

function save(){try{localStorage.setItem(STORE,JSON.stringify(snapshot(state)))}catch(_){}}
function load(){try{return restore(JSON.parse(localStorage.getItem(STORE)||'null'))}catch(_){return null}}
function haptic(ms=5){try{navigator.vibrate?.(ms)}catch(_){}}
function toast(text){const el=$('#toast');el.textContent=text;el.classList.remove('on');void el.offsetWidth;el.classList.add('on')}

function update(){
  $('#flow').textContent=state.flow.toLocaleString();
  $('#chain').textContent=state.bestChain>1?state.bestChain+'×':'—';
  $('#target').textContent=TYPE_NAMES[state.targetType];
  $('#mode').textContent=state.mode;
  $('#scene').textContent=state.scene;
  $('#modeBtn').textContent=state.mode;
  $('#sceneBtn').textContent=state.scene;
  $('#releaseBtn').disabled=!canRelease(state);
  $('#releaseBtn').textContent=canRelease(state)?(state.mode==='RATCHET'?'RELEASE':'BLOOM'):'SEEK MATCH';
  $('#chargeBar').style.width=`${Math.min(100,state.charge/1.75*100)}%`;
  const idx=gateCellIndex(state), c=state.cells[idx];
  $('#status').textContent=`GATE ${String(idx).padStart(2,'0')} · ${TYPE_NAMES[c.type]} · ${state.creases.length} CREASE${state.creases.length===1?'':'S'} · ${state.blooms} BLOOMS`;
  $('#soundBtn').textContent=audio.soundOn?'♪':'×';
  $('#build').textContent=`${VERSION} · deterministic topology · bounded 8-note motif · ${state.history.length} recent events`;
  renderer.setDrag(dragAngle);
  save();
}

async function ensureAudio(){try{await audio.init();return true}catch(_){return false}}

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
  const out=release(state); if(!out.event)return;
  state=out.state; audio.release(out.event); renderer.pulse(out.event); haptic(Math.min(24,7+out.event.chain*3));
  toast(`${out.event.verb}${out.event.chain>1?' ×'+out.event.chain:''}${out.event.cadence?' → '+out.event.cadence:''}`); dragAngle=0; update();
}

function toggleMode(){state=setMode(state,state.mode==='RATCHET'?'FLOW':'RATCHET');toast(state.mode);update()}
function cycleScene(){const names=audio.sceneNames(),i=names.indexOf(state.scene),name=names[(i+1)%names.length];state=setScene(state,name);audio.setScene(name);toast(name);update()}

function pointDown(e){
  if($('#intro').classList.contains('on')||$('#settings').classList.contains('on'))return;
  dragging=true;startX=lastX=e.clientX;stepAccum=0;lastT=performance.now();cv.setPointerCapture?.(e.pointerId);ensureAudio();
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

$('#releaseBtn').onclick=doRelease;$('#modeBtn').onclick=toggleMode;$('#sceneBtn').onclick=cycleScene;
$('#soundBtn').onclick=async()=>{if(!audio.ctx)await ensureAudio();else audio.setSound(!audio.soundOn);update()};
$('#menuBtn').onclick=()=>$('#settings').classList.toggle('on');$('#closeSettings').onclick=()=>$('#settings').classList.remove('on');
$('#vol').value=Math.round(audio.volume*100);$('#vol').oninput=e=>audio.setVolume(+e.target.value/100);
$('#exportBtn').onclick=()=>{
  const packet={kind:'FOLD_BLOOM_LIVE_RETURN',version:VERSION,created:new Date().toISOString(),source:{foldWeave:'/recovery/fold-bloom/fold-weave-0.1/',twoDial:'/fold-bloom/two-dial/'},state:snapshot(state)};
  const blob=new Blob([JSON.stringify(packet,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`fold-bloom-live-${Date.now()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('RETURN EXPORTED')
};
$('#resetBtn').onclick=()=>{const now=Date.now(),b=$('#resetBtn');if(!b.dataset.arm||now>+b.dataset.arm){b.dataset.arm=now+3500;b.textContent='CONFIRM RESET';toast('PRESS AGAIN');return}delete b.dataset.arm;b.textContent='NEW FIELD';state=createState();audio.hydrate(state);dragAngle=0;update();toast('NEW FIELD')};
$('#playBtn').onclick=async()=>{await ensureAudio();$('#intro').classList.remove('on');update()};
$('#mutePlay').onclick=()=>{$('#intro').classList.remove('on');audio.setSound(false);update()};

addEventListener('keydown',e=>{
  if(e.repeat)return;
  if(e.key==='ArrowLeft'){e.preventDefault();step(-1)}
  else if(e.key==='ArrowRight'){e.preventDefault();step(1)}
  else if(e.code==='Space'||e.key==='Enter'){e.preventDefault();doRelease()}
  else if(e.key.toLowerCase()==='r')toggleMode();
  else if(e.key.toLowerCase()==='s')cycleScene();
  else if(e.key.toLowerCase()==='m'){audio.setSound(!audio.soundOn);update()}
  else if(e.key==='Escape')$('#settings').classList.toggle('on');
});

document.addEventListener('visibilitychange',()=>{if(document.hidden)audio.stop();else if(audio.ctx)audio.start()});
function loop(t){renderer.draw(state,t);raf=requestAnimationFrame(loop)}raf=requestAnimationFrame(loop);
update();
window.FoldBloomLive={version:VERSION,state:()=>snapshot(state),release:doRelease,step};
