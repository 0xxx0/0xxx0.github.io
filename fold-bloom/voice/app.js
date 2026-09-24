import {createFieldPulse,transportDescriptor,pulseAge} from '../../lib/field-pulse.js';
import {VOICE_TRAINER_SCHEMA,estimatePitch,hzToMidi,midiToHz,midiToName,centsBetween,patternTarget,stabilityCents} from './pitch.js';

const $=s=>document.querySelector(s),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const fieldPulse=createFieldPulse('FOLD_BLOOM_VOICE');
const query=new URLSearchParams(location.search);
let pattern='NOTE',baseMidi=60,manualStep=0,pulseLinked=query.get('pulse')==='1';
let pulseMessage=null,pulseClock=null,lastBeat=null;
let ac=null,stream=null,source=null,analyser=null,samples=null,micOn=false,lastAnalysis=0;
let heardHistory=[];
const stats={startedAt:null,frames:0,voiced:0,onTarget:0,absCents:0,clarity:0};

function status(t){$('#status').textContent=t}
function fmt1(v){return Number.isFinite(v)?Number(v).toFixed(1):'—'}
function downloadJSON(name,value){
  const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json'}),a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function noteForStep(step){
  const midi=patternTarget(baseMidi,pattern,step);
  return midi===null?null:{midi,hz:midiToHz(midi),name:midiToName(midi)};
}
function livePulse(){
  if(!pulseLinked||!pulseMessage||!pulseClock)return null;
  const data=pulseMessage.data||{},bpm=Number(pulseClock.bpm)||0;
  if(!(bpm>0))return null;
  const period=60/bpm;
  if(pulseClock.clock==='AUDIO'&&pulseAge(pulseMessage)>1800)return null;
  const age=Math.max(0,pulseAge(pulseMessage)/1000);
  const phase0=Number(data.beatPhase)||0,total=phase0+age/period;
  const beatAdvance=Math.floor(total),beatPhase=((total%1)+1)%1;
  return{
    label:pulseClock.label,clock:pulseClock.clock,bpm,
    beatIndex:(Number(data.beatIndex)||0)+beatAdvance,
    beatPhase,
    quantum:Number(data.quantum)||4,
    sourceKind:data.sourceKind||'UNKNOWN'
  };
}
function currentStep(){
  const p=livePulse();
  return p?Math.max(0,p.beatIndex):manualStep;
}
function renderTarget(){
  const p=livePulse(),target=noteForStep(currentStep());
  $('#patternRead').textContent=pattern==='CALL'?'1·3·5·3':pattern==='SCALE'?'1·2·3·4·5·4·3·2':pattern;
  $('#baseRead').textContent=midiToName(baseMidi);
  $('#targetNote').textContent=target?.name||'HUM';
  $('#targetHz').textContent=target?fmt1(target.hz)+' Hz':'STABILITY';
  $('#pulseBtn').textContent=pulseLinked?'PULSE ON':'PULSE OFF';
  $('#pulseBtn').classList.toggle('on',pulseLinked);
  $('#pulseRead').textContent=p?(p.label+' · '+Math.round(p.bpm)+' BPM · B'+(p.beatIndex+1)):(pulseLinked?'WAITING':'FREE');
  document.documentElement.dataset.voicePulse=p?.clock||'OFF';
}
function receivePulse(msg){
  const d=transportDescriptor(msg);if(!d)return;
  pulseMessage=msg;pulseClock=d;renderTarget();
}
fieldPulse.subscribe(receivePulse);
const last=fieldPulse.last(),lastDesc=transportDescriptor(last);
if(lastDesc){pulseMessage=last;pulseClock=lastDesc}

async function ensureAudio(){
  if(!ac)ac=new (window.AudioContext||window.webkitAudioContext)();
  if(ac.state==='suspended')await ac.resume();
  return ac;
}
async function startMic(){
  if(micOn)return;
  if(!navigator.mediaDevices?.getUserMedia){status('MICROPHONE API UNAVAILABLE');return}
  try{
    const ctx=await ensureAudio();
    stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});
    source=ctx.createMediaStreamSource(stream);analyser=ctx.createAnalyser();analyser.fftSize=2048;analyser.smoothingTimeConstant=0;
    samples=new Float32Array(analyser.fftSize);source.connect(analyser);micOn=true;heardHistory=[];
    stats.startedAt=stats.startedAt||new Date().toISOString();
    $('#micBtn').textContent='STOP MIC';$('#micBtn').classList.add('on');status('MIC LIVE · AUDIO STAYS LOCAL');
  }catch(error){status('MIC BLOCKED · '+String(error?.name||'PERMISSION'))}
}
function stopMic(){
  micOn=false;try{source?.disconnect()}catch(_){};source=null;analyser=null;
  try{stream?.getTracks?.().forEach(t=>t.stop())}catch(_){};stream=null;
  $('#micBtn').textContent='START MIC';$('#micBtn').classList.remove('on');status('MIC OFF');
}
async function hearTarget(){
  const target=noteForStep(currentStep())||{hz:midiToHz(baseMidi),name:midiToName(baseMidi)};
  const ctx=await ensureAudio(),o=ctx.createOscillator(),g=ctx.createGain(),now=ctx.currentTime;
  o.type='sine';o.frequency.setValueAtTime(target.hz,now);
  g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(.11,now+.018);g.gain.exponentialRampToValueAtTime(.0001,now+.42);
  o.connect(g).connect(ctx.destination);o.start(now);o.stop(now+.46);status('REFERENCE · '+target.name);
}
function renderPitch(result){
  stats.frames++;
  const target=noteForStep(currentStep());
  if(!(result.hz>0)){
    $('#heardNote').textContent='—';$('#heardHz').textContent='LISTENING';$('#cents').textContent='—';
    $('#needle').style.left='50%';$('#relation').textContent='NO STABLE PITCH';$('#relation').dataset.state='idle';
    $('#clarity').textContent='—';$('#stability').textContent='—';return;
  }
  stats.voiced++;stats.clarity+=result.clarity;
  const heardMidi=hzToMidi(result.hz),heardName=midiToName(heardMidi);
  heardHistory.push(heardMidi*100);heardHistory=heardHistory.slice(-12);
  const spread=stabilityCents(heardHistory);
  $('#heardNote').textContent=heardName;$('#heardHz').textContent=fmt1(result.hz)+' Hz';$('#clarity').textContent=Math.round(result.clarity*100)+'%';$('#stability').textContent=spread===null?'…':fmt1(spread)+'¢';
  if(!target){
    $('#cents').textContent='FREE';$('#needle').style.left='50%';
    $('#relation').textContent=spread!==null&&spread<18?'STEADY':'HOLD';$('#relation').dataset.state=spread!==null&&spread<18?'on':'near';
    return;
  }
  const cents=centsBetween(result.hz,target.hz),abs=Math.abs(cents);
  stats.absCents+=abs;if(abs<=35)stats.onTarget++;
  $('#cents').textContent=(cents>0?'+':'')+Math.round(cents)+'¢';
  $('#needle').style.left=(50+clamp(cents,-50,50))+'%';
  const state=abs<=15?'CENTER':abs<=35?'NEAR':cents<0?'FLAT':'SHARP';
  $('#relation').textContent=state;$('#relation').dataset.state=abs<=15?'on':abs<=35?'near':'off';
}
function tick(t){
  const p=livePulse();
  if(p&&p.beatIndex!==lastBeat){
    lastBeat=p.beatIndex;renderTarget();document.documentElement.dataset.voiceBeat=String(p.beatIndex);
    $('#beatFlash').classList.remove('hit');void $('#beatFlash').offsetWidth;$('#beatFlash').classList.add('hit');
  }
  if(micOn&&analyser&&t-lastAnalysis>70){lastAnalysis=t;analyser.getFloatTimeDomainData(samples);renderPitch(estimatePitch(samples,ac.sampleRate,{minHz:70,maxHz:950}))}
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

$('#micBtn').onclick=()=>micOn?stopMic():startMic();
$('#hearBtn').onclick=hearTarget;
$('#nextBtn').onclick=()=>{manualStep++;renderTarget()};
$('#pulseBtn').onclick=()=>{pulseLinked=!pulseLinked;renderTarget();status(pulseLinked?'PULSE LINK ON':'PULSE LINK OFF')};
$('#baseDown').onclick=()=>{baseMidi=clamp(baseMidi-1,43,76);renderTarget()};
$('#baseUp').onclick=()=>{baseMidi=clamp(baseMidi+1,43,76);renderTarget()};
document.querySelectorAll('[data-pattern]').forEach(b=>b.onclick=()=>{
  pattern=b.dataset.pattern;manualStep=0;
  document.querySelectorAll('[data-pattern]').forEach(x=>x.classList.toggle('on',x===b));
  renderTarget();status('PATTERN · '+b.textContent);
});
$('#exportBtn').onclick=()=>{
  const p=livePulse(),voiced=Math.max(1,stats.voiced);
  downloadJSON('fold-bloom-voice-return.json',{
    kind:'FOLD_BLOOM_VOICE_RETURN',schema:VOICE_TRAINER_SCHEMA,created:new Date().toISOString(),
    practice:{pattern,baseMidi,baseNote:midiToName(baseMidi),pulse:p?{label:p.label,clock:p.clock,bpm:p.bpm}:null},
    evidence:{startedAt:stats.startedAt,frames:stats.frames,voicedFrames:stats.voiced,onTargetFrames:stats.onTarget,onTargetRatio:pattern==='HUM'?null:+(stats.onTarget/voiced).toFixed(3),meanAbsCents:pattern==='HUM'?null:+(stats.absCents/voiced).toFixed(2),meanClarity:+(stats.clarity/voiced).toFixed(3)},
    privacy:{audioRecorded:false,rawMicExported:false}
  });status('RETURN EXPORTED · NO AUDIO');
};
$('#backBtn').onclick=()=>history.length>1?history.back():location.assign('../');
document.addEventListener('visibilitychange',()=>{if(document.hidden&&micOn)stopMic()});
addEventListener('pagehide',()=>{stopMic();fieldPulse.close();try{ac?.close()}catch(_){}});
renderTarget();
document.documentElement.dataset.foldBloomVoice='ready';
window.FoldBloomVoice={state:()=>({pattern,baseMidi,pulseLinked,pulse:livePulse(),micOn,stats:{...stats}})};
