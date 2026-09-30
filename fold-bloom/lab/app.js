import {compileEventTape,toBeatSaberV4Draft} from '../beat/event-tape.js';
import {InkField} from '../ink/ink-engine.js';
import {createFieldPulse} from '../../lib/field-pulse.js';
import {$,$$,esc} from '../../lib/dom.js';
import {TAU} from '../../lib/polar-control.js';
import {kv,skv} from '../../lib/store.js';
import {nextPulseMode, pulseModeLabel, paceWpmFromTransport, transportWitness, boundedFocus} from './read-bridge.js';
import {buildTextCourse,nodeForProgress,courseReturn} from './course.js';
import {lineSpans,makeTextMark,marksForRange,normalizeTextMarks,replayHandoff,textSourceKey,verseHandoff} from './text-marks.js';
import {normalizeStateBits,stateChange,stateDescriptor,lineMark,formatState} from '../state-language.js?v=0.1';
import {transparentStateCalculation,stepOrderAt,steerStepOrder,steppedStatePath,changeLatticeCalculation,stateFrontierCalculation,residueLadder} from '../convergence/change-calculus/kernel.mjs';
import {changePathInkGuide} from './change-ink-guide.js?v=0.1';
import {createLiveChangeBridgeState,reduceLiveChangeBridge,captureLiveChangeWindow,compareLiveChangeCaptures,liveChangeBridgeReturn} from './live-change-bridge.js?v=0.1';
import {appendLabTrace,compileLabReturn} from './lab-return.js?v=0.3.3';
import {estimatePitch,hzToMidi,midiToHz,midiToName,centsBetween,patternTarget,stabilityCents} from '../voice/pitch.js';
import {spectrumFeatures} from '../voice/spectrum.js';
import {appendVoiceTrace,logFrequencyY,summarizeVoiceTrace} from '../voice/training-trace.js';
import {
  PULSE_PSYCHOPHYSICS_VERSION,pulseIntervals,pulseRings,phaseAt,makeTrainerState,trainerTarget,trainerProgress,
  advanceTrainer,evaluateTap,summarizeTapTrace,returnDelta
} from '../pulse/psychophysics.js?v=0.1';

const canvas=$('#field'),ctx=canvas.getContext('2d');
let W=1,H=1,DPR=1,mode='RIDE',profile='CLEAR',panelHidden=false,last=performance.now(),mx=.5,my=.5;
document.documentElement.dataset.fieldLabPanel='open';
const fieldPulse=createFieldPulse('FOLD_BLOOM_FIELD_LAB');
const liveChange={bridge:createLiveChangeBridgeState(),from:null,to:null,comparison:null};
const stopLiveChangePulse=fieldPulse.subscribe(handleLiveChangePulse);
let lastTransport=null;
const labStartedAt=Date.now();
let labTrace=[];
function recordLabTrace(kind='STATE'){
  labTrace=appendLabTrace(labTrace,{kind,mode,profile,address:$('#addressRead')?.textContent||'',source:$('#sourceRead')?.textContent||'',atMs:Date.now()-labStartedAt});
  document.documentElement.dataset.fieldLabTrace=String(labTrace.length);
  return labTrace;
}

const PROFILES={
  CLEAR:{motion:1,trail:.16,gain:.55,bleed:.7},
  DRIVE:{motion:1.35,trail:.10,gain:.78,bleed:.8},
  TRANCE:{motion:.82,trail:.055,gain:.64,bleed:1.18},
  SOFT:{motion:.55,trail:.26,gain:.36,bleed:.48}
};
const MODES={
  RIDE:['EMBODY','audio → terrain → gesture → consequence','RIDE / LIVE','existing embodied engine'],
  PULSE:['ENTRAIN','ring → clock → tap → feedback / event tape','PULSE / RHYTHM CLOCK','free play or staged timing practice'],
  VOICE:['TUNE','voice → pitch / spectrum → optional borrowed clock','VOICE / SPECTRUM','local voice practice; PULSE link optional'],
  VERSE:['COMPOSE','text → line → mark → carry / replay','VERSE / POEM','Poem Map authority + cross-layer marks'],
  READ:['PACE','text → address → RSVP / regress / return','READ / READFIELD','canonical APERTURE reader + optional trainer'],
  LOCI:['REMEMBER','cell → path → place → recall','LOCI / PATH','spatial mnemonic route'],
  INK:['DEPOSIT','gesture → water / pigment → diffusion → dry','INK / PAPER','brush and capillary study'],
  DATA:['REFRACT','object → path → aperture → focus','DATA / FIELD','small addressed explorer']
};

function resize(){
  DPR=Math.min(devicePixelRatio||1,2);W=canvas.clientWidth;H=canvas.clientHeight;
  canvas.width=Math.max(1,Math.round(W*DPR));canvas.height=Math.max(1,Math.round(H*DPR));
  ctx.setTransform(DPR,0,0,DPR,0,0);
}
addEventListener('resize',resize,{passive:true});resize();

function setStatus(t){$('#status').textContent=t}
function setAddress(t){$('#addressRead').textContent=t}
function setSource(t){$('#sourceRead').textContent=t}
function selectMode(next){
  mode=next;
  $$('.mode').forEach(b=>b.classList.toggle('on',b.dataset.mode===mode));
  $$('.controls').forEach(s=>s.classList.toggle('on',s.dataset.controls===mode));
  const [verb,law,title,sub]=MODES[mode];
  $('#modeVerb').textContent=verb;$('#modeName').textContent=mode;$('#modeLaw').textContent=law;
  $('#panelTitle').textContent=title;$('#panelSub').textContent=sub;
  document.documentElement.dataset.fieldLabMode=mode;
  setStatus(mode+' · '+law);
  if(mode==='READ')queueMicrotask(()=>ensureReader());
  if(mode==='VERSE')queueMicrotask(()=>ensureVerse());
  setAddress('field://lab/'+mode.toLowerCase());
  if(mode==='DATA'&&!data.nodes.length)loadData();
  if(mode==='LOCI'&&!loci.nodes.length)buildLoci();
  queueMicrotask(()=>recordLabTrace('MODE'));
}
$$('.mode').forEach(b=>b.onclick=()=>selectMode(b.dataset.mode));
$('#hidePanel').onclick=()=>{
  panelHidden=!panelHidden;$('#panelBody').hidden=panelHidden;$('#hidePanel').textContent=panelHidden?'+':'—';
  document.documentElement.dataset.fieldLabPanel=panelHidden?'collapsed':'open';
  queueMicrotask(resize);
};
$$('[data-profile]').forEach(b=>b.onclick=()=>{
  profile=b.dataset.profile;$$('[data-profile]').forEach(x=>x.classList.toggle('on',x.dataset.profile===profile));
  $('#profileRead').textContent=profile;document.documentElement.dataset.fieldLabProfile=profile;recordLabTrace('PROFILE');
});

$('#enterRide').onclick=()=>location.href='../live/?return='+encodeURIComponent('/fold-bloom/lab/');
$('#enterListen').onclick=()=>location.href='../listen/';
$('#dataLens').onclick=()=>location.href='../lens/';

/* ---------- PULSE ---------- */
const pulse={ratio:[3,2],bpm:96,timbre:'WOOD',mode:'FREE',lane:'M',playing:false,ac:null,timer:null,start:0,nextM:0,nextA:0,nextB:0,lastA:-1,lastB:-1,taps:[],flashA:0,flashB:0,lastPublish:0,trainer:makeTrainerState(),lastTap:null,metrics:null,lastReturn:null};
const voice={pattern:'NOTE',baseMidi:60,manualStep:0,linked:false,stream:null,source:null,analyser:null,samples:null,freqBins:null,mic:false,lastAnalysis:0,history:[],trace:[],traceStartedAt:0,wasVoiced:false,lastTraceBeat:null,lastSpectrum:null,frames:0,voiced:0,onTarget:0,absCents:0,centroidHz:0,spectralFrames:0};
function voiceStep(){return voice.linked&&pulse.playing&&lastTransport?Math.max(0,Number(lastTransport.beatIndex)||0):voice.manualStep}
function voiceTarget(){
  const midi=patternTarget(voice.baseMidi,voice.pattern,voiceStep());
  return midi===null?null:{midi,hz:midiToHz(midi),name:midiToName(midi)};
}
function syncVoiceTarget(){
  const target=voiceTarget();if($('#voiceTarget'))$('#voiceTarget').textContent=target?.name||'HUM';
}
async function startLabVoiceMic(){
  if(voice.mic)return;
  if(!navigator.mediaDevices?.getUserMedia){setStatus('VOICE · MICROPHONE API UNAVAILABLE');return}
  try{
    const ac=ensureAudio();await ac.resume();
    voice.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});
    voice.source=ac.createMediaStreamSource(voice.stream);voice.analyser=ac.createAnalyser();voice.analyser.fftSize=2048;voice.analyser.smoothingTimeConstant=.18;
    voice.samples=new Float32Array(voice.analyser.fftSize);voice.freqBins=new Float32Array(voice.analyser.frequencyBinCount);voice.source.connect(voice.analyser);voice.mic=true;voice.history=[];voice.trace=[];voice.traceStartedAt=performance.now();voice.wasVoiced=false;voice.lastTraceBeat=null;
    $('#voiceMic').textContent='STOP MIC';$('#voiceMic').classList.add('cool');document.documentElement.dataset.fieldLabVoice='live';setStatus('VOICE · MIC LIVE · LOCAL ANALYSIS');
  }catch(error){setStatus('VOICE · MIC BLOCKED · '+String(error?.name||'PERMISSION'))}
}
function stopLabVoiceMic(){
  voice.mic=false;try{voice.source?.disconnect()}catch(_){};voice.source=null;voice.analyser=null;voice.samples=null;voice.freqBins=null;
  try{voice.stream?.getTracks?.().forEach(t=>t.stop())}catch(_){};voice.stream=null;
  if($('#voiceMic')){$('#voiceMic').textContent='START MIC';$('#voiceMic').classList.remove('cool')}document.documentElement.dataset.fieldLabVoice='off';
}
async function hearLabVoiceTarget(){
  const target=voiceTarget()||{hz:midiToHz(voice.baseMidi),name:midiToName(voice.baseMidi)},ac=ensureAudio();await ac.resume();
  const o=ac.createOscillator(),g=ac.createGain(),now=ac.currentTime;o.type='sine';o.frequency.setValueAtTime(target.hz,now);
  g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(.10,now+.015);g.gain.exponentialRampToValueAtTime(.0001,now+.38);o.connect(g).connect(ac.destination);o.start(now);o.stop(now+.42);
  setStatus('VOICE · REFERENCE · '+target.name);
}
function drawLabVoiceSpectrum(feature,pitch,transport){
  const cv=$('#voiceSpectrum');if(!cv||!feature)return;const g=cv.getContext('2d'),w=cv.width,h=cv.height;
  g.drawImage(cv,-1,0);g.fillStyle='#05070b';g.fillRect(w-1,0,1,h);
  if(transport&&transport.beatIndex!==voice.lastTraceBeat){voice.lastTraceBeat=transport.beatIndex;g.fillStyle='rgba(215,180,109,.50)';g.fillRect(w-1,0,1,h)}
  const bands=feature.bands||[],bh=h/Math.max(1,bands.length);
  for(let i=0;i<bands.length;i++){const v=Math.max(0,Math.min(1,bands[i]||0));if(v<.04)continue;g.fillStyle=v>.72?'rgba(239,120,73,'+(.25+.72*v)+')':'rgba(123,213,255,'+(.16+.72*v)+')';g.fillRect(w-1,h-(i+1)*bh,1,Math.max(1,bh+1))}
  const target=voiceTarget(),targetY=logFrequencyY(target?.hz,{minHz:70,maxHz:6000,height:h}),heardY=logFrequencyY(pitch?.hz,{minHz:70,maxHz:6000,height:h});
  if(targetY!==null){g.fillStyle='rgba(215,180,109,.95)';g.fillRect(w-4,Math.max(0,targetY-1),4,2)}
  if(heardY!==null){g.fillStyle='rgba(242,243,239,.98)';g.fillRect(w-3,Math.max(0,heardY-1),3,2)}
}
function analyzeLabVoice(t){
  if(!voice.mic||!voice.analyser||t-voice.lastAnalysis<70)return;voice.lastAnalysis=t;syncVoiceTarget();
  voice.analyser.getFloatTimeDomainData(voice.samples);voice.analyser.getFloatFrequencyData(voice.freqBins);
  const pitch=estimatePitch(voice.samples,pulse.ac.sampleRate,{minHz:70,maxHz:950}),spec=spectrumFeatures(voice.freqBins,pulse.ac.sampleRate,voice.analyser.fftSize,{bands:48,minHz:70,maxHz:6000}),target=voiceTarget(),transport=voice.linked&&pulse.playing?lastTransport:null,voiced=!!(pitch.hz>0),onset=voiced&&!voice.wasVoiced;
  voice.wasVoiced=voiced;voice.lastSpectrum=spec;voice.frames++;voice.spectralFrames++;voice.centroidHz+=spec.centroidHz;drawLabVoiceSpectrum(spec,pitch,transport);$('#voiceCentroid').textContent=Math.round(spec.centroidHz)+' Hz';
  voice.trace=appendVoiceTrace(voice.trace,{atMs:t-voice.traceStartedAt,heardHz:pitch.hz,targetHz:target?.hz,clarity:pitch.clarity,centroidHz:spec.centroidHz,beatIndex:transport?.beatIndex,beatPhase:transport?.beatPhase,bpm:transport?.bpm,onset});
  const summary=summarizeVoiceTrace(voice.trace);
  if($('#voiceOnset'))$('#voiceOnset').textContent=summary.meanAbsOnsetMs==null?'—':summary.meanAbsOnsetMs+'ms';
  if($('#voiceHold'))$('#voiceHold').textContent=summary.longestCenteredFrames?Math.round(summary.longestCenteredFrames*70/100)/10+'s':'—';
  if(!(pitch.hz>0)){$('#voiceHeard').textContent='—';$('#voiceCents').textContent='—';$('#voiceStable').textContent='…';return}
  voice.voiced++;const heardMidi=hzToMidi(pitch.hz);voice.history.push(heardMidi*100);voice.history=voice.history.slice(-12);
  const spread=stabilityCents(voice.history);$('#voiceHeard').textContent=midiToName(heardMidi);$('#voiceStable').textContent=spread==null?'…':Math.round(spread)+'¢';
  if(!target){$('#voiceCents').textContent='FREE';return}
  const cents=centsBetween(pitch.hz,target.hz),abs=Math.abs(cents);voice.absCents+=abs;if(abs<=35)voice.onTarget++;$('#voiceCents').textContent=(cents>0?'+':'')+Math.round(cents)+'¢';
}

function pulseTrainView(){
  const p=trainerProgress(pulse.trainer),summary=summarizeTapTrace(pulse.taps);
  pulse.metrics=summary;
  return {progress:p,summary,target:trainerTarget(pulse.trainer),returnDelta:returnDelta(pulse.taps)};
}
function syncPulseTrainingUI(){
  const v=pulseTrainView(),sample=pulse.lastTap,p=v.progress;
  if($('#syncRead'))$('#syncRead').textContent=v.summary.lock==null?'—':v.summary.lock+'%';
  if($('#pulseTarget'))$('#pulseTarget').textContent=p.phase+' · '+p.target+' · '+(Math.min(p.value+1,p.targetTaps))+'/'+p.targetTaps;
  if($('#pulseError'))$('#pulseError').textContent=!sample?'—':(sample.errorMs>0?'+':'')+Math.round(sample.errorMs)+'ms';
  if($('#pulseBias'))$('#pulseBias').textContent=v.summary.biasMs==null?'—':(v.summary.biasMs>0?'+':'')+Math.round(v.summary.biasMs)+'ms';
  if($('#pulseJitter'))$('#pulseJitter').textContent=v.summary.jitterMs==null?'—':Math.round(v.summary.jitterMs)+'ms';
  if($('#pulseCorr'))$('#pulseCorr').textContent=v.summary.phaseCorrection==null?'—':v.summary.phaseCorrection.toFixed(2);
  document.documentElement.dataset.fieldLabPulseTrain=p.phase;
  document.documentElement.dataset.fieldLabPulseTarget=p.target;
  document.documentElement.dataset.fieldLabPulsePsychophysics=PULSE_PSYCHOPHYSICS_VERSION;
}
function resetPulseTraining(announce=false){
  pulse.trainer=makeTrainerState();pulse.taps=[];pulse.lastTap=null;pulse.metrics=null;pulse.lastReturn=null;syncPulseTrainingUI();
  if(announce)setStatus('PULSE · TRAIN RESET · LOCK METER');
}
function parseRatio(v){return v.split(':').map(Number)}
function setPulseMode(next){
  pulse.mode=String(next||'FREE').toUpperCase()==='TRAIN'?'TRAIN':'FREE';
  if($('#pulseMode')){$('#pulseMode').textContent=pulse.mode;$('#pulseMode').classList.toggle('cool',pulse.mode==='FREE')}
  setStatus('PULSE · '+pulse.mode+' · CLICK RING / TAP');return pulse.mode
}
function adjustRatio(lane,delta){
  const i=lane==='B'?1:0,next=[...pulse.ratio];next[i]=Math.max(1,Math.min(8,next[i]+delta));pulse.ratio=next;
  $('#ratioRead').textContent=pulse.ratio.join(':');$$('[data-ratio]').forEach(x=>x.classList.toggle('cool',x.dataset.ratio===pulse.ratio.join(':')));
  resetPulseTraining();if(pulse.playing)restartPulse();syncPulseLaneReadouts();return pulse.ratio
}
$$('[data-ratio]').forEach(b=>b.onclick=()=>{
  pulse.ratio=parseRatio(b.dataset.ratio);$$('[data-ratio]').forEach(x=>x.classList.toggle('cool',x===b));
  $('#ratioRead').textContent=b.dataset.ratio;resetPulseTraining();if(pulse.playing)restartPulse();
});
$$('[data-timbre]').forEach(b=>b.onclick=()=>{
  pulse.timbre=b.dataset.timbre;$$('[data-timbre]').forEach(x=>x.classList.toggle('cool',x===b));
});
$('#bpm').oninput=e=>{pulse.bpm=+e.target.value;$('#bpmRead').textContent=pulse.bpm;resetPulseTraining();if(pulse.playing)restartPulse()};
function ensureAudio(){if(!pulse.ac)pulse.ac=new (window.AudioContext||window.webkitAudioContext)();return pulse.ac}
function pluck(at,voice){
  const ac=ensureAudio(),p=PROFILES[profile],g=ac.createGain(),f=ac.createBiquadFilter(),o=ac.createOscillator();
  const meter=voice==='M',tap=voice==='T';
  let freq=voice==='A'?196:294,type='triangle',decay=.085,amp=voice==='A'?.14:.10;
  if(meter){freq=164;type='sine';decay=.055;amp=.052;f.frequency.value=850;f.Q.value=.6}
  else if(tap){freq=980;type='triangle';decay=.035;amp=.045;f.frequency.value=2400;f.Q.value=1.2}
  else if(pulse.timbre==='QIN'){freq=voice==='A'?196:247;type='sine';decay=.32;amp=voice==='A'?.13:.095;f.frequency.value=1500;f.Q.value=1.4}
  else if(pulse.timbre==='DRONE'){freq=voice==='A'?110:165;type='sine';decay=.48;amp=voice==='A'?.11:.085;f.frequency.value=900;f.Q.value=.7}
  else {freq=voice==='A'?520:760;type='triangle';decay=.07;f.frequency.value=1900;f.Q.value=2}
  o.type=type;o.frequency.setValueAtTime(freq,at);f.type='lowpass';
  g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(amp*p.gain,at+.006);g.gain.exponentialRampToValueAtTime(.0001,at+decay);
  o.connect(f).connect(g).connect(ac.destination);o.start(at);o.stop(at+decay+.03);
}
function restartPulse(){stopPulse();startPulse()}
function startPulse(){
  const ac=ensureAudio();ac.resume();
  pulse.playing=true;const bar=4*60/pulse.bpm;pulse.start=ac.currentTime+.06;pulse.nextM=pulse.start;pulse.nextA=pulse.start;pulse.nextB=pulse.start;
  pulse.timer=setInterval(()=>{
    if(!pulse.playing)return;const now=ac.currentTime,horizon=now+.12,iv=pulseIntervals({bpm:pulse.bpm,ratio:pulse.ratio}),ia=iv.a,ib=iv.b;
    while(pulse.nextM<horizon){pluck(pulse.nextM,'M');pulse.nextM+=iv.beat}
    while(pulse.nextA<horizon){pluck(pulse.nextA,'A');pulse.nextA+=ia}
    while(pulse.nextB<horizon){pluck(pulse.nextB,'B');pulse.nextB+=ib}
  },24);
  $('#pulsePlay').textContent='STOP PULSE';setStatus('PULSE · '+pulse.ratio.join(':')+' · '+pulse.bpm+' BPM');
}
function stopPulse(){
  const stoppedAt=pulse.ac?Math.max(0,pulse.ac.currentTime-pulse.start):0;
  pulse.playing=false;if(pulse.timer)clearInterval(pulse.timer);pulse.timer=null;$('#pulsePlay').textContent='START PULSE';
  publishPulseTransport(performance.now(),true,stoppedAt);
}
$('#pulsePlay').onclick=()=>pulse.playing?stopPulse():startPulse();
function tapPulse(laneOverride=null){
  if(!pulse.playing)startPulse();
  const ac=ensureAudio(),t=ac.currentTime,progress=trainerProgress(pulse.trainer),lane=laneOverride||((pulse.mode==='TRAIN')?progress.target:pulse.lane||'M'),phase=pulse.mode==='TRAIN'?pulse.trainer.phase:'FREE';
  pulse.lane=lane;
  const sample=evaluateTap({time:t,start:pulse.start,bpm:pulse.bpm,ratio:pulse.ratio,lane});
  const tap={...sample,t:t-pulse.start,score:sample.lock,trainPhase:phase,trainCycle:pulse.trainer.cycle,trainTap:pulse.trainer.phaseTap+1,lane};
  pulse.taps.push(tap);pulse.taps=pulse.taps.slice(-32);pulse.lastTap=tap;pluck(t,'T');
  if(pulse.mode==='TRAIN'){
    const advanced=advanceTrainer(pulse.trainer);pulse.trainer=advanced.state;
    if(advanced.cycleComplete)pulse.lastReturn=returnDelta(pulse.taps);
    syncPulseTrainingUI();
    if(advanced.transition){const v=trainerProgress(pulse.trainer),returnNote=advanced.cycleComplete&&pulse.lastReturn?.available?' · RETURN Δ '+(pulse.lastReturn.deltaMs>0?'+':'')+pulse.lastReturn.deltaMs+'ms':'';setStatus('PULSE · '+advanced.transition+' · NEXT '+v.phase+' / '+v.target+returnNote)}
  }else{
    const sign=sample.errorMs>0?'+':'',msg=lane+' · '+sign+Math.round(sample.errorMs)+'ms · LOCK '+Math.round(sample.lock)+'%';
    setStatus('PULSE · FREE · '+msg);if($('#pulseError'))$('#pulseError').textContent=sign+Math.round(sample.errorMs)+'ms';if($('#syncRead'))$('#syncRead').textContent=Math.round(sample.lock)+'%';
  }
}
$('#tap').onclick=()=>tapPulse();
$('#pulseMode')?.addEventListener('click',()=>setPulseMode(pulse.mode==='FREE'?'TRAIN':'FREE'));
$('#pulseAMinus')?.addEventListener('click',()=>adjustRatio('A',-1));$('#pulseAPlus')?.addEventListener('click',()=>adjustRatio('A',1));
$('#pulseBMinus')?.addEventListener('click',()=>adjustRatio('B',-1));$('#pulseBPlus')?.addEventListener('click',()=>adjustRatio('B',1));
$('#pulseVoice')?.addEventListener('click',()=>selectMode('VOICE'));
$('#pulseTrainReset')?.addEventListener('click',()=>resetPulseTraining(true));
function syntheticMap(seconds=16){
  const beat=60/pulse.bpm,beats=[];for(let t=0;t<=seconds+1e-6;t+=beat)beats.push(+t.toFixed(6));
  const frames=Array.from({length:Math.ceil(seconds*20)},(_,i)=>({energy:.3+.3*Math.sin(i*.27)**2,flux:.2+.6*(i%10===0)}));
  return {duration:seconds,bpm:pulse.bpm,frameRate:20,beats,phrases:[{t:0},{t:seconds/2},{t:seconds}],sections:[{t:0},{t:seconds}],frames};
}
function downloadJSON(name,value){
  const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function launchPulseTarget(url){
  if(!pulse.playing)startPulse();
  publishPulseTransport(performance.now(),true);
  location.href=url;
}
$('#pulseRead').onclick=()=>launchPulseTarget('/docs/?pulse=4&from=field-lab');
$('#pulseRide').onclick=()=>launchPulseTarget('/fold-bloom/live/?from=field-lab');
$('#pulseCompose').onclick=()=>launchPulseTarget('/fold-bloom/two-dial/?pulse=1&from=field-lab');
$('#exportTape').onclick=()=>{
  const map=syntheticMap(16),ops=pulse.taps.map((x,i)=>({t:x.t,op:i%4===0?'BLOOM':'MARK',strength:x.score/100}));
  const tape=compileEventTape(map,{sourceId:'field://lab/pulse',operations:ops});
  const beatSaberV4=toBeatSaberV4Draft(tape,{laneSeed:pulse.ratio[0]*10+pulse.ratio[1]});
  downloadJSON('fold-bloom-event-tape.json',{eventTape:tape,beatSaberV4Draft:beatSaberV4});
  setStatus('PULSE · EVENT TAPE + BEAT SABER V4 DRAFT EXPORTED');
};
$('#voiceMic')?.addEventListener('click',()=>voice.mic?stopLabVoiceMic():startLabVoiceMic());
$('#voiceHear')?.addEventListener('click',hearLabVoiceTarget);
$('#voiceNext')?.addEventListener('click',()=>{voice.manualStep++;syncVoiceTarget()});
$('#voicePulseLink')?.addEventListener('click',()=>{voice.linked=!voice.linked;syncPulseLaneReadouts();setStatus('VOICE · CLOCK '+(voice.linked?'LINKED TO PULSE':'FREE'))});
$('#voiceBaseDown')?.addEventListener('click',()=>{voice.baseMidi=Math.max(43,voice.baseMidi-1);syncVoiceTarget()});
$('#voiceBaseUp')?.addEventListener('click',()=>{voice.baseMidi=Math.min(76,voice.baseMidi+1);syncVoiceTarget()});
$$('[data-voice-pattern]').forEach(b=>b.onclick=()=>{voice.pattern=b.dataset.voicePattern;voice.manualStep=0;$$('[data-voice-pattern]').forEach(x=>x.classList.toggle('cool',x===b));syncVoiceTarget();setStatus('VOICE · '+voice.pattern)});
syncVoiceTarget();document.documentElement.dataset.fieldLabVoice='ready';syncPulseLaneReadouts();

/* ---------- VERSE / TEXT MARKS ---------- */
const verse={lines:[],focus:0,marks:[],sourceKey:'',returnAddress:''};
const TEXT_MARK_STORE='fold-bloom.lab.text-marks.v01:',textMarkCache=new Map();
function storedMarks(source){
  const text=String(source??''),key=textSourceKey(text);
  if(textMarkCache.has(key))return textMarkCache.get(key);
  try{const marks=normalizeTextMarks(kv(TEXT_MARK_STORE+key,[]).get(),text,key);textMarkCache.set(key,marks);return marks}
  catch(_){textMarkCache.set(key,[]);return []}
}
function saveTextMarks(source,marks){
  const text=String(source??''),key=textSourceKey(text),clean=normalizeTextMarks(marks,text,key);
  textMarkCache.set(key,clean);
  kv(TEXT_MARK_STORE+key).set(clean);
  if(verse.sourceKey===key){verse.marks=clean;syncVerseUi()}
  return clean;
}
function toggleTextMark(source,mark){
  const current=storedMarks(source),i=current.findIndex(m=>m.kind===mark.kind&&m.start===mark.start&&m.end===mark.end);
  if(i>=0)current.splice(i,1);else current.push(mark);
  return saveTextMarks(source,current);
}
function currentVerseLine(){return verse.lines[Math.max(0,Math.min(verse.lines.length-1,verse.focus))]||null}
function safeLocalReturn(value=''){
  try{const u=new URL(String(value||''),location.href);return u.origin===location.origin?u.pathname+u.search+u.hash:''}catch(_){return''}
}
function recoverVerseInboundHandoff(){
  try{
    const q=new URLSearchParams(location.search);if(!q.has('handoff'))return null;
    const h=skv('field.verse.handoff.v01',null).get();
    sessionStorage.removeItem('field.verse.handoff.v01');
    if(h?.schema!=='field-verse-handoff/v0.1'||typeof h.source!=='string'||!h.source.trim())return null;
    h.from=safeLocalReturn(h.from);return h;
  }catch(_){return null}
}
function bindVerse({focusStart=null,announce=true}={}){
  const source=String($('#verseSource').value||'');
  verse.sourceKey=textSourceKey(source);verse.lines=lineSpans(source);verse.marks=storedMarks(source);
  if(Number.isFinite(Number(focusStart))){
    const at=Number(focusStart);
    let best=0,d=Infinity;
    verse.lines.forEach((ln,i)=>{const q=at<ln.start?ln.start-at:at>ln.end?at-ln.end:0;if(q<d){d=q;best=i}});
    verse.focus=best;
  }else verse.focus=Math.max(0,Math.min(verse.focus,verse.lines.length-1));
  syncVerseUi();setSource('TEXT / VERSE');const line=currentVerseLine();if(line)setAddress(line.address);
  if(announce)setStatus('VERSE · EXACT TEXT + HUMAN MARKS BOUND');
}
function ensureVerse(){if(!verse.lines.length)bindVerse({announce:false});return currentVerseLine()}
function syncVerseUi(){
  const source=String($('#verseSource').value||''),line=currentVerseLine();
  $('#verseLineRead').textContent=(line?line.line+1:0)+'/'+Math.max(1,verse.lines.length);
  $('#verseMarksRead').textContent=String(verse.marks.length);
  $('#verseKeyRead').textContent=verse.sourceKey?verse.sourceKey.split(':').at(-1).toUpperCase():'LOCAL';
  $('#verseLines').innerHTML=verse.lines.map((ln,i)=>{
    const marked=marksForRange(verse.marks,ln.start,ln.end).length>0;
    return `<button class="verseLine ${i===verse.focus?'on':''} ${marked?'marked':''}" data-verse-line="${i}"><b>${String(i+1).padStart(2,'0')}</b><span>${esc(ln.text||'∅')}</span><i>${marked?'MARK':'@'+ln.start}</i></button>`;
  }).join('');
  $$('#verseLines [data-verse-line]').forEach(b=>b.onclick=()=>{verse.focus=Number(b.dataset.verseLine)||0;syncVerseUi();const x=currentVerseLine();if(x)setAddress(x.address)});
  if(mode==='VERSE'&&line)setAddress(line.address);
}
function markVerse(kind){
  const source=String($('#verseSource').value||''),line=ensureVerse();if(!line)return;
  const mark=makeTextMark({source,start:line.start,end:kind==='ARC'?line.end:line.start,kind,label:String(line.text||'').trim().slice(0,100),projection:'VERSE'});
  toggleTextMark(source,mark);setStatus('VERSE · '+kind+' · '+line.address);
}
function loadReadAt(source,start=0,address=null){
  const text=String(source??''),at=Math.max(0,Math.min(text.length,Number(start)||0));
  $('#readSource').value=text;
  window.FieldAperture?.handoff?.(text,{label:'FIELD LAB TEXT',from:location.pathname+location.search,focus:{scale:'WORD',char_index:at,source_progress:text.length?at/text.length:0,address:address||`text://${at}:${at}`,wpm:read.wpm}});
  read.readerLoaded=false;return loadReader({preferHandoff:true});
}
function carryVerseToRead(){
  const source=String($('#verseSource').value||''),line=ensureVerse();if(!line)return;
  loadReadAt(source,line.start,line.address);selectMode('READ');setSource('TEXT / CARRIED FROM VERSE');setStatus('READ · VERSE SOURCE + FOCUS PRESERVED');
}
function carryVerseToLoci(){
  const source=String($('#verseSource').value||''),line=ensureVerse();if(!line)return;
  $('#lociSource').value=source;buildLoci();
  const hit=nodeForProgress(loci.course,source.length?line.start/source.length:0);if(hit)loci.step=Math.max(0,loci.nodes.findIndex(n=>n.id===hit.id));
  syncLoci();selectMode('LOCI');setSource('TEXT / CARRIED FROM VERSE');setAddress(hit?.address||line.address);setStatus('LOCI · VERSE SOURCE + FOCUS PRESERVED');
}
function openVersePoemMap(){
  const source=String($('#verseSource').value||''),line=ensureVerse();if(!line)return;
  skv('field.verse.handoff.v01').set(verseHandoff({source,focus:line,marks:verse.marks,from:location.pathname+location.search}));
  location.href='/poetry/map/?handoff=1&from=field-lab';
}
function replayVerseMark(){
  const source=String($('#verseSource').value||''),line=ensureVerse();if(!line)return;
  const packet=replayHandoff({source,focus:line,marks:verse.marks,returnAddress:'/fold-bloom/lab/?mode=VERSE'});
  skv('fold-bloom.replay.handoff.v02').set(packet);
  location.href='/fold-bloom/replay/';
}
$('#verseBind').onclick=()=>bindVerse();
$('#verseBookmark').onclick=()=>markVerse('BOOKMARK');
$('#verseFlag').onclick=()=>markVerse('FLAG');
$('#verseArc').onclick=()=>markVerse('ARC');
$('#verseClearMarks').onclick=()=>saveTextMarks(String($('#verseSource').value||''),[]);
$('#verseRead').onclick=carryVerseToRead;
$('#verseLoci').onclick=carryVerseToLoci;
$('#versePoemMap').onclick=openVersePoemMap;
$('#verseReplay').onclick=replayVerseMark;
bindVerse({announce:false});

/* ---------- READ / READFIELD / RACE ---------- */
const readQuery=new URLSearchParams(location.search),requestedReadPulse=Number(readQuery.get('pulse'));
const read={tokens:[],you:0,ghost:0,started:false,paused:false,startAt:0,pauseAt:0,wpm:300,pulseMode:requestedReadPulse===4?'PACE4':'WITNESS',readerLoaded:false,boundSourceKey:''};
const reader=$('#labReader');
function tokenize(text){
  try{return [...new Intl.Segmenter(undefined,{granularity:'word'}).segment(text)].filter(x=>x.isWordLike).map(x=>x.segment)}
  catch(_){return text.trim().split(/\s+/).filter(Boolean)}
}
function recoverHandoff(){
  try{
    const x=skv('field.aperture.handoff.v01',null).get();
    if(x&&typeof x.source==='string'&&x.source.trim())return x;
  }catch(_){}
  return null;
}
function readerSource(){return String($('#readSource').value||'')}
function loadReader({announce=false,preferHandoff=false}={}){
  if(!reader||typeof reader.load!=='function')return null;
  const h=preferHandoff?recoverHandoff():null,source=h?.source??readerSource(),hf=h?.focus||null,sourceKey=textSourceKey(source),sourceChanged=sourceKey!==read.boundSourceKey;
  if(h?.source!=null)$('#readSource').value=h.source;
  const snap=reader.load(source,{label:h?.label||'FIELD LAB READ',scale:hf?.scale||'WORD',wpm:hf?.wpm||read.wpm,address:hf?.address||undefined,charIndex:Number.isFinite(Number(hf?.char_index))?Number(hf.char_index):undefined,index:Number.isFinite(Number(hf?.index))?Number(hf.index):undefined});
  read.readerLoaded=true;read.boundSourceKey=sourceKey;read.wpm=Number(snap?.wpm)||read.wpm;
  if(sourceChanged)resetRead();
  document.documentElement.dataset.fieldLabReader=snap?.scale?'ready':'empty';
  document.documentElement.dataset.fieldLabReaderScale=snap?.scale||'NONE';
  const sourceAperture=$('#readSourceAperture');if(sourceAperture)sourceAperture.open=false;
  document.documentElement.dataset.fieldLabReadSource='bound';
  if($('#wpm'))$('#wpm').value=String(Math.max(120,Math.min(1600,read.wpm)));
  if($('#wpmRead'))$('#wpmRead').textContent=read.wpm+' WPM';
  syncReadApertureUi(snap);
  if(lastTransport&&read.pulseMode!=='OFF')applyTransport(lastTransport);
  if(announce)setStatus('READ · APERTURE / RSVP LOADED');
  return snap;
}
function ensureReader(){return read.readerLoaded?reader?.snapshot?.():loadReader({preferHandoff:true})}
function syncPulseButton(){const b=$('#readPulse');if(b)b.textContent=pulseModeLabel(read.pulseMode)}
function applyTransport(data){
  const view=transportWitness(data);if(!view)return;
  lastTransport=data;
  if(read.pulseMode==='OFF'){reader?.setExternalPulse?.(null);return}
  reader?.setExternalPulse?.(view);
  if(read.pulseMode==='PACE4'){
    const wpm=paceWpmFromTransport(data,4);
    if(wpm){read.wpm=wpm;reader?.setWpm?.(wpm);$('#wpm').value=String(Math.max(120,Math.min(720,wpm)));$('#wpmRead').textContent=wpm+' WPM'}
  }
}
fieldPulse.subscribe(msg=>{if(msg.kind==='transport'&&msg.data)applyTransport(msg.data)});
const lastPulse=fieldPulse.last();
if(lastPulse?.kind==='transport'&&lastPulse.data)lastTransport=lastPulse.data;
function syncReadApertureUi(snap=reader?.snapshot?.()){
  if(!snap)return null;
  if($('#readScaleRead'))$('#readScaleRead').textContent=snap.scale_label||snap.scale||'—';
  if($('#readPosRead'))$('#readPosRead').textContent=(Math.max(0,Number(snap.index)||0)+1)+'/'+Math.max(0,Number(snap.count)||0);
  if($('#readApertureWpm'))$('#readApertureWpm').textContent=String(Number(snap.wpm)||read.wpm);
  const r=$('#readRsvp');if(r){r.textContent=snap.playing?'Ⅱ RSVP':'▶ RSVP';r.classList.toggle('primary',!!snap.playing)}
  return snap;
}
function setReaderScale(id){
  ensureReader();const want=String(id||'').toUpperCase(),i=reader?.A?.scales?.findIndex(x=>String(x.id||'').toUpperCase()===want);
  if(i>=0)reader.setScale(i);return reader?.snapshot?.()||null;
}
reader?.addEventListener('aperture-focus',e=>{syncReadApertureUi(e.detail);const focus=boundedFocus(e.detail);if(!focus)return;fieldPulse.publish('focus',focus);if(mode==='READ')setAddress(focus.address||('text://'+Math.round(focus.sourceProgress*10000)))});
$('#readLoad').onclick=()=>loadReader({announce:true});
$('#readPulse').onclick=()=>{
  read.pulseMode=nextPulseMode(read.pulseMode);syncPulseButton();
  document.documentElement.dataset.fieldLabReadPulse=read.pulseMode;
  if(read.pulseMode==='OFF')reader?.setExternalPulse?.(null);else if(lastTransport)applyTransport(lastTransport);
  setStatus('READ · '+pulseModeLabel(read.pulseMode));
};
$('#readFast').onclick=()=>{
  const snap=ensureReader();if(!snap)return;
  setReaderScale('WORD');read.wpm=900;reader?.setWpm?.(900);
  if($('#wpm'))$('#wpm').value='900';if($('#wpmRead'))$('#wpmRead').textContent='900 WPM';
  if(!reader?.snapshot?.()?.playing)reader?.toggleRSVP?.();
  syncReadApertureUi();setStatus('READ · FAST · WORD · 900 WPM · SAME SOURCE / CURSOR');
};
$('#readReview').onclick=()=>{
  if(!ensureReader())return;reader?.stop?.();setReaderScale('SENT');syncReadApertureUi();
  setStatus('READ · REVIEW · SENTENCE · MOTION STOPPED · CURSOR PRESERVED');
};
$('#readRsvp').onclick=()=>{if(!ensureReader())return;reader?.toggleRSVP?.();syncReadApertureUi();setStatus('READ · '+(reader?.snapshot?.()?.playing?'RSVP PLAY':'RSVP PAUSE'))};
$('#readFull').onclick=()=>{
  const source=readerSource(),focus=reader?.snapshot?.()||ensureReader()||null;window.FieldAperture?.handoff?.(source,{label:'FIELD LAB READ',from:location.pathname+location.search,focus});
  const q=read.pulseMode==='PACE4'?'?pulse=4&from=field-lab':'?from=field-lab';location.href='/docs/'+q;
};
$('#readToLoci').onclick=()=>{
  const snap=reader?.snapshot?.()||ensureReader()||{};
  $('#lociSource').value=readerSource();buildLoci();
  const hit=nodeForProgress(loci.course,Number(snap.source_progress)||0);if(hit)loci.step=Math.max(0,loci.nodes.findIndex(n=>n.id===hit.id));
  syncLoci();selectMode('LOCI');setSource('TEXT / CARRIED FROM READ');setAddress(hit?.address||'field://lab/loci');setStatus('LOCI · SAME TEXT · EXACT ADDRESSED COURSE');
};
$('#readToData').onclick=()=>{
  const snap=reader?.snapshot?.()||ensureReader()||{};
  $('#dataSource').value=JSON.stringify({source:readerSource(),focus:boundedFocus(snap)},null,2);
  loadData();selectMode('DATA');setSource('TEXT + FOCUS / CARRIED FROM READ');setStatus('DATA · READ SOURCE + FOCUS WITNESS');
};
$('#readMark').onclick=()=>{
  const source=readerSource(),snap=reader?.snapshot?.()||ensureReader()||{},at=Number(snap.char_index);
  const start=Number.isFinite(at)?at:Math.round((Number(snap.source_progress)||0)*source.length);
  toggleTextMark(source,makeTextMark({source,start,kind:'BOOKMARK',label:snap.address||'READ MARK',projection:'READ'}));
  setStatus('READ · MARKED · '+(snap.address||`text://${start}:${start}`));
};
$('#readNextMark').onclick=()=>{
  const source=readerSource(),marks=storedMarks(source);if(!marks.length){setStatus('READ · NO MARKS FOR THIS SOURCE');return}
  const snap=reader?.snapshot?.()||ensureReader()||{},at=Number.isFinite(Number(snap.char_index))?Number(snap.char_index):Math.round((Number(snap.source_progress)||0)*source.length);
  const next=marks.find(m=>m.start>at)||marks[0];loadReadAt(source,next.start,next.address);setStatus('READ · NEXT MARK · '+next.kind);
};
$('#readToVerse').onclick=()=>{
  const source=readerSource(),snap=reader?.snapshot?.()||ensureReader()||{},at=Number.isFinite(Number(snap.char_index))?Number(snap.char_index):Math.round((Number(snap.source_progress)||0)*source.length);
  $('#verseSource').value=source;bindVerse({focusStart:at,announce:false});selectMode('VERSE');setSource('TEXT / CARRIED FROM READ');setStatus('VERSE · READ FOCUS PRESERVED');
};
function resetRead(){read.tokens=tokenize(readerSource());read.you=0;read.ghost=0;read.started=false;read.paused=false;read.startAt=0;$('#raceInput').value='';syncReadUI()}
function syncReadUI(){
  $('#youWord').textContent=read.you;$('#ghostWord').textContent=read.ghost;$('#raceDelta').textContent=read.you-read.ghost;
  const tok=read.tokens[read.you]||'';$('#raceInput').placeholder=tok?'type: '+tok:'complete';
}
$('#wpm').oninput=e=>{read.wpm=+e.target.value;$('#wpmRead').textContent=read.wpm+' WPM';reader?.setWpm?.(read.wpm)};
$('#readStart').onclick=()=>{
  if(!read.tokens.length)resetRead();
  if(!read.started){read.started=true;read.paused=false;read.startAt=performance.now()-read.ghost*(60000/read.wpm);$('#readStart').textContent='RESTART RACE'}
  else{read.ghost=0;read.you=0;read.startAt=performance.now();read.paused=false}
  $('#raceInput').focus();syncReadUI();
};
$('#readPause').onclick=()=>{
  if(!read.started)return;read.paused=!read.paused;
  if(read.paused)read.pauseAt=performance.now();else read.startAt+=performance.now()-read.pauseAt;
  $('#readPause').textContent=read.paused?'RESUME':'PAUSE';
};
$('#readReset').onclick=resetRead;
$('#readBack').onclick=()=>{
  if(!read.tokens.length)return;read.you=Math.max(0,read.you-1);read.ghost=Math.max(0,read.ghost-1);
  if(read.started)read.startAt=performance.now()-read.ghost*(60000/read.wpm);$('#raceInput').value='';syncReadUI();
};
$('#raceInput').addEventListener('input',e=>{
  const want=(read.tokens[read.you]||'').replace(/[^\p{L}\p{N}]+/gu,'').toLowerCase(),got=e.target.value.replace(/[^\p{L}\p{N}]+/gu,'').toLowerCase();
  if(want&&got===want){read.you=Math.min(read.tokens.length,read.you+1);e.target.value='';syncReadUI()}
});
syncPulseButton();document.documentElement.dataset.fieldLabReadPulse=read.pulseMode;resetPulseTraining();resetRead();queueMicrotask(()=>ensureReader());

/* ---------- LOCI ---------- */
const loci={nodes:[],course:null,hidden:false,step:0,hits:0};
function buildLoci(){
  const raw=String($('#lociSource').value||'');
  loci.course=buildTextCourse(raw,{maxLoci:16});
  loci.nodes=loci.course.nodes.map(n=>({...n,text:n.label}));
  loci.hidden=false;loci.step=0;loci.hits=0;syncLoci();
  $('#lociWords').textContent=loci.course.wordCount;
  document.documentElement.dataset.fieldLabLociNodes=String(loci.nodes.length);
  document.documentElement.dataset.fieldLabLociWords=String(loci.course.wordCount);
  setSource('TEXT COURSE / '+loci.course.strategy);
}
function syncLoci(){
  $('#lociStep').textContent=Math.min(loci.step,loci.nodes.length)+'/'+loci.nodes.length;$('#lociHits').textContent=loci.hits;
  const n=loci.nodes[Math.min(loci.step,Math.max(0,loci.nodes.length-1))];if(mode==='LOCI'&&n)setAddress(n.address);
}
$('#lociBuild').onclick=buildLoci;
$('#lociRecall').onclick=()=>{if(!loci.nodes.length)buildLoci();loci.hidden=!loci.hidden;loci.step=0;syncLoci()};
$('#lociReset').onclick=()=>{loci.hidden=false;loci.step=0;loci.hits=0;syncLoci()};
$('#lociExport').onclick=()=>{
  if(!loci.course)buildLoci();
  downloadJSON('fold-bloom-loci-return.json',courseReturn(loci.course,{step:loci.step,hits:loci.hits,hidden:loci.hidden}));
  setStatus('LOCI · ADDRESSED COURSE RETURN EXPORTED');
};
$('#lociMark').onclick=()=>{
  if(!loci.course)buildLoci();const source=String($('#lociSource').value||''),node=loci.nodes[Math.min(loci.step,Math.max(0,loci.nodes.length-1))];if(!node)return;
  toggleTextMark(source,makeTextMark({source,start:node.start,end:node.end,kind:'ARC',label:node.label,projection:'LOCI'}));
  setStatus('LOCI · LOCUS MARKED · '+node.address);
};
$('#lociNextMark').onclick=()=>{
  if(!loci.course)buildLoci();const source=String($('#lociSource').value||''),marks=storedMarks(source);if(!marks.length){setStatus('LOCI · NO MARKS FOR THIS SOURCE');return}
  const node=loci.nodes[Math.min(loci.step,Math.max(0,loci.nodes.length-1))],at=node?.start||0,next=marks.find(m=>m.start>at)||marks[0],hit=nodeForProgress(loci.course,source.length?next.start/source.length:0);
  if(hit)loci.step=Math.max(0,loci.nodes.findIndex(n=>n.id===hit.id));syncLoci();setAddress(hit?.address||next.address);setStatus('LOCI · NEXT MARK · '+next.kind);
};
$('#lociToVerse').onclick=()=>{
  const source=String($('#lociSource').value||''),node=loci.nodes[Math.min(loci.step,Math.max(0,loci.nodes.length-1))];
  $('#verseSource').value=source;bindVerse({focusStart:node?.start||0,announce:false});selectMode('VERSE');setSource('TEXT / CARRIED FROM LOCI');setStatus('VERSE · LOCUS FOCUS PRESERVED');
};
buildLoci();

/* ---------- INK ---------- */
const IW=192,IH=128,inkCanvas=document.createElement('canvas'),inkCtx=inkCanvas.getContext('2d');inkCanvas.width=IW;inkCanvas.height=IH;
const inkImage=inkCtx.createImageData(IW,IH),inkField=new InkField({width:IW,height:IH,seed:23});
const ink={field:inkField,wet:.62,load:.76,brush:18,absorb:.58,mode:'SUMI',guide:0,pathGuide:null,lastX:null,lastY:null,lastT:0,strokeSeed:0,down:false,simAt:0,metricAt:0};
const INK_GUIDES=['永','一','○',''];
$('#wetness').oninput=e=>{ink.wet=+e.target.value/100;$('#wetRead').textContent=e.target.value};
$('#inkLoad').oninput=e=>{ink.load=+e.target.value/100;$('#loadRead').textContent=e.target.value};
$('#brush').oninput=e=>{ink.brush=+e.target.value;$('#brushRead').textContent=e.target.value};
$('#paperAbsorb').oninput=e=>{ink.absorb=+e.target.value/100;$('#paperRead').textContent=e.target.value};
$('#inkClear').onclick=()=>{ink.field.clear();syncInkMetrics()};
$('#inkDry').onclick=()=>{ink.field.dry(.035);setStatus('INK · PAPER DRIED');syncInkMetrics()};
function syncInkGuideUI(){
  const path=ink.pathGuide?.ok?ink.pathGuide:null,glyph=INK_GUIDES[ink.guide];
  const label=path?'PATH':glyph||'OFF';
  $('#inkTrace').textContent='GUIDE '+label;
  $('#inkTrace').classList.toggle('cool',!!path||!!glyph);
  if($('#inkGuideRead'))$('#inkGuideRead').textContent=path?'CHANGE PATH · '+path.points.length+' STATES':glyph?'GLYPH '+glyph:'OFF';
}
$('#inkTrace').onclick=()=>{
  ink.pathGuide=null;ink.guide=(ink.guide+1)%INK_GUIDES.length;syncInkGuideUI();
  const g=INK_GUIDES[ink.guide];setStatus('INK · '+(g?'GLYPH GUIDE '+g:'GUIDE OFF'));
};
syncInkGuideUI();
$$('[data-ink-mode]').forEach(b=>b.onclick=()=>{ink.mode=b.dataset.inkMode;$$('[data-ink-mode]').forEach(x=>x.classList.toggle('cool',x===b));setStatus('INK · '+ink.mode)});
function syncInkMetrics(){
  const m=ink.field.metrics();$('#inkMass').textContent=Math.round(m.pigment);$('#waterMass').textContent=Math.round(m.water);
}
function inkBrushOpts({speed=0,pressure=.5,tiltX=0,tiltY=0,flow=null}={}){
  const size=.018+ink.brush/42*.095;
  return {speed,pressure:pressure||.5,tiltX,tiltY,size,water:ink.wet,load:ink.load,mode:ink.mode,strokeSeed:ink.strokeSeed,...(flow==null?{}:{flow})};
}
function inkDeposit(px,py,opt={}){
  ink.field.deposit(px/Math.max(1,W),py/Math.max(1,H),inkBrushOpts(opt));
}
function inkStroke(x0,y0,x1,y1,opt={}){
  ink.field.strokeSegment(x0/Math.max(1,W),y0/Math.max(1,H),x1/Math.max(1,W),y1/Math.max(1,H),inkBrushOpts(opt));
}
function stepInk(){
  ink.field.step({bleed:PROFILES[profile].bleed,absorb:.25+ink.absorb*1.05,evaporation:.0045+.004*ink.absorb});
}

/* ---------- DATA ---------- */
const data={nodes:[],maxDepth:0,aperture:8,focus:-1,stateChange:null,stateCalc:null,stateStep:null,stateLattice:null,stateFrontier:null,stateResidue:null,stateStepCursor:0,stateOrderIndex:0,stateFlow:false,stateFlowAt:0,stateLatticeHits:[]};
function flattenData(value,path='$',depth=0,parent=-1,out=[]){
  if(out.length>=72)return out;const i=out.length,type=Array.isArray(value)?'array':value===null?'null':typeof value;
  out.push({path,value:(value&&typeof value==='object')?type:String(value),depth,parent,type});
  if(value&&typeof value==='object'&&depth<8){
    for(const [k,v] of Object.entries(value)){if(out.length>=72)break;flattenData(v,path+(Array.isArray(value)?'['+k+']':'.'+k),depth+1,i,out)}
  }
  return out;
}
function loadData(){
  const raw=$('#dataSource').value;let v;try{v=JSON.parse(raw)}catch(_){v=raw.split(/\n+/).filter(Boolean)}
  data.nodes=flattenData(v);data.maxDepth=Math.max(0,...data.nodes.map(n=>n.depth));data.aperture=data.maxDepth;data.focus=-1;
  $('#dataNodes').textContent=data.nodes.length;$('#dataDepth').textContent=data.maxDepth;setSource('DATA / LOCAL');
}
$('#dataLoad').onclick=loadData;loadData();

function captureMatchesState(capture,input){
  const bits=normalizeStateBits(input);
  return !!(capture?.ok&&bits&&capture.bits?.length===bits.length&&capture.bits.every((x,i)=>Number(x)===Number(bits[i])));
}
function liveCaptureLabel(capture){
  if(!capture?.ok)return '—';
  return capture.hex_token+' · '+capture.exact_form.join('→')+' · LIVE #'+capture.first_seq+'–'+capture.last_seq;
}
function syncLiveChangeUI(){
  const window=liveChange.bridge?.window,ready=!!window?.ready,fromAttached=captureMatchesState(liveChange.from,$('#stateFrom')?.value),toAttached=captureMatchesState(liveChange.to,$('#stateTo')?.value);
  if($('#liveChangeWindow'))$('#liveChangeWindow').textContent=ready
    ?'LIVE WINDOW · '+window.hex_token+' · '+window.exact_form.join(' → ')+' · #'+window.first_seq+'–'+window.last_seq
    :'LIVE WINDOW · '+(window?.count||0)+'/6 RELEASES · OPEN LIVE IN ANOTHER TAB';
  if($('#liveCaptureFrom')){$('#liveCaptureFrom').disabled=!ready;$('#liveCaptureFrom').classList.toggle('cool',ready)}
  if($('#liveCaptureTo')){$('#liveCaptureTo').disabled=!ready;$('#liveCaptureTo').classList.toggle('cool',ready)}
  if($('#liveFromRead'))$('#liveFromRead').textContent=liveCaptureLabel(liveChange.from)+(liveChange.from?.ok?(fromAttached?' · ATTACHED':' · DETACHED'):'');
  if($('#liveToRead'))$('#liveToRead').textContent=liveCaptureLabel(liveChange.to)+(liveChange.to?.ok?(toAttached?' · ATTACHED':' · DETACHED'):'');
  const cmp=liveChange.comparison?.ok?liveChange.comparison:null;
  if($('#liveExactDelta'))$('#liveExactDelta').textContent=cmp?String(cmp.exact_changed_lines):'—';
  if($('#liveHexDelta'))$('#liveHexDelta').textContent=cmp?String(cmp.quotient_changed_lines):'—';
  if($('#liveInvisible'))$('#liveInvisible').textContent=cmp?String(cmp.quotient_invisible_exact_changes):'—';
  const native=cmp?.native_next,fromNative=native?.from,toNative=native?.to;
  if($('#liveNativeNext'))$('#liveNativeNext').textContent=!native?.available?'—':native.equal?'SAME':'DIFF';
  if($('#liveChangeNative'))$('#liveChangeNative').textContent=native?.available
    ?'NATIVE NEXT · FROM '+fromNative.candidate_count+' CANDIDATES / TARGET '+fromNative.target_type+' / CALL '+(fromNative.call?.verb||'OPEN')+' → TO '+toNative.candidate_count+' CANDIDATES / TARGET '+toNative.target_type+' / CALL '+(toNative.call?.verb||'OPEN')+(native.same_hex_unequal_native?' · SAME HEX ≠ SAME NEXT':'')
    :'NATIVE NEXT · WAITING FOR POST-RELEASE FORECAST WITNESSES FROM LIVE';
  if($('#liveChangeResidue'))$('#liveChangeResidue').textContent=cmp
    ?'QUOTIENT RESIDUE · EXACT Δ '+cmp.exact_changed_lines+' · HEX-VISIBLE '+cmp.quotient_changed_lines+' · INVISIBLE '+cmp.quotient_invisible_exact_changes+' · FIBER '+cmp.exact_forms_per_hexagram+'×'+(cmp.same_hex_endpoints?' · SAME HEX ENDPOINTS':'')+(native?.same_hex_unequal_native?' · CONTROL-SUFFICIENCY COUNTEREXAMPLE OBSERVED':'')
    :'QUOTIENT RESIDUE · CAPTURE LIVE FROM + TO WINDOWS';
  const steering=liveChange.bridge?.steering;
  if($('#liveChangeSteering'))$('#liveChangeSteering').textContent=steering
    ?'J-SPACE WITNESS · '+steering.direction_label+' · STRENGTH '+Number(steering.strength).toFixed(2)+' · AUTHORITY '+steering.authority+(steering.direction_ref?' · '+steering.direction_ref:'')
    :'J-SPACE WITNESS · NONE RECEIVED · AUTHORITY NONE';
  document.documentElement.dataset.fieldLabLiveChange=ready?'window-ready':window?.count?'collecting':'idle';
  document.documentElement.dataset.fieldLabLiveCompare=cmp?(cmp.quotient_invisible_exact_changes?'residue-visible':'compared'):'open';
}
function handleLiveChangePulse(message){
  const previousInstance=liveChange.bridge?.live_instance||null;
  const next=reduceLiveChangeBridge(liveChange.bridge,message);
  if(next===liveChange.bridge)return;
  if(previousInstance&&next.live_instance&&next.live_instance!==previousInstance){
    liveChange.from=null;liveChange.to=null;liveChange.comparison=null;
    setStatus('LIVE CHANGE · SOURCE INSTANCE CHANGED · CAPTURES RESET');
  }
  liveChange.bridge=next;
  syncLiveChangeUI();
}
function captureLiveChange(role){
  const captured=captureLiveChangeWindow(liveChange.bridge,role);
  if(!captured.ok){setStatus('LIVE CHANGE · '+captured.reason+' · '+captured.count+'/6');return captured}
  if(role==='FROM'){
    liveChange.from=captured;
    $('#stateFrom').value=formatState(captured.bits);
  }else{
    liveChange.to=captured;
    $('#stateTo').value=formatState(captured.bits);
  }
  liveChange.comparison=compareLiveChangeCaptures(liveChange.from,liveChange.to);
  syncStateChange();
  syncLiveChangeUI();
  setSource('LIVE / FIELD PULSE WITNESS');
  setStatus('LIVE CHANGE · '+role+' CAPTURED · '+captured.hex_token+' · EXACT RELEASE IDENTITY RETAINED');
  recordLabTrace('LIVE_CHANGE_'+role);
  return captured;
}
$('#liveCaptureFrom')?.addEventListener('click',()=>captureLiveChange('FROM'));
$('#liveCaptureTo')?.addEventListener('click',()=>captureLiveChange('TO'));
syncLiveChangeUI();

function stateLabel(desc){
  if(!desc?.valid)return 'INVALID';
  return (desc.lower?.glyph||'')+' '+(desc.lower?.key||'OPEN')+' / '+(desc.upper?.glyph||'')+' '+(desc.upper?.key||'OPEN');
}
function stateFlowClock(){
  return pulse.playing?{label:'PULSE '+pulse.bpm+' BPM',interval:Math.max(180,60000/pulse.bpm)}:{label:'LOCAL 720ms',interval:720};
}
function statePreviewBits(){
  const step=data.stateStep,cursor=data.stateStepCursor;
  if(!step?.ok)return data.stateChange?.from?.bits||null;
  if(cursor<=0||!step.steps.length)return normalizeStateBits(step.from_token);
  return normalizeStateBits(step.steps[Math.min(cursor-1,step.steps.length-1)].after_binary);
}
function refreshStateFrontier(){
  const step=data.stateStep,calc=data.stateCalc;
  data.stateFrontier=calc?.ok&&step?.ok
    ?stateFrontierCalculation($('#stateFrom')?.value,$('#stateTo')?.value,step.selected_order,data.stateStepCursor)
    :null;
  return data.stateFrontier;
}
function syncStateFrontierUI(frontier=refreshStateFrontier()){
  const box=$('#stateFrontierRead');if(!box)return;
  box.replaceChildren();
  if(!frontier?.ok){const span=document.createElement('span');span.className='stateFrontierEmpty';span.textContent='NEXT · UNRESOLVED';box.append(span);return}
  if(!frontier.candidates.length){const span=document.createElement('span');span.className='stateFrontierEmpty';span.textContent='NEXT · TARGET REACHED · '+frontier.current.token;box.append(span);return}
  for(const candidate of frontier.candidates){
    const button=document.createElement('button');
    button.type='button';button.className=candidate.selected_by_current_order?'cool':'';
    button.dataset.stateNextLine=String(candidate.line);
    const before=candidate.before_trigram?.glyph||'',after=candidate.after_trigram?.glyph||'';
    button.textContent='L'+candidate.line+' · '+candidate.transition+' = '+candidate.iching_line_value+' · '+before+'→'+after+' · '+candidate.future_paths_after+' FUTURE';
    button.title='Choose L'+candidate.line+' next · path '+(candidate.order_index_if_chosen+1)+'/'+(data.stateStep?.possible_one_line_orders||1)+' · '+candidate.histories_collapsed_at_successor+' histories meet at successor';
    button.onclick=()=>steerStateNextLine(candidate.line);
    box.append(button);
  }
}
function syncStateStepUI(){
  const calc=data.stateCalc,step=data.stateStep,cursor=data.stateStepCursor,clock=stateFlowClock(),frontier=refreshStateFrontier();
  if($('#stateHamming'))$('#stateHamming').textContent=calc?.ok?calc.metrics.hamming_distance+'/6':'—';
  if($('#stateStable'))$('#stateStable').textContent=calc?.ok?String(calc.metrics.stable_lines):'—';
  if($('#stateOrders'))$('#stateOrders').textContent=step?.ok?String(step.possible_one_line_orders):'—';
  if($('#stateAmbiguity'))$('#stateAmbiguity').textContent=step?.ok?step.order_ambiguity_bits+'b':'—';
  if($('#stateLineValues'))$('#stateLineValues').textContent=calc?.ok?calc.iching_projection.line_values.join(' · '):'—';
  if($('#statePathIndex'))$('#statePathIndex').textContent=step?.ok?(step.selected_order_index+1)+'/'+step.possible_one_line_orders:'—';
  const lattice=data.stateLattice;
  if($('#stateVertices'))$('#stateVertices').textContent=lattice?.ok?String(lattice.vertices):'—';
  if($('#stateEdges'))$('#stateEdges').textContent=lattice?.ok?String(lattice.edges):'—';
  if($('#stateWidth'))$('#stateWidth').textContent=lattice?.ok?String(lattice.widest_rank):'—';
  if($('#stateOrder'))$('#stateOrder').textContent=step?.ok&&step.selected_order.length?'ORDER ▶ '+(step.selected_order_index+1)+'/'+step.possible_one_line_orders:'ORDER · ∅';
  if($('#stateOrderPrev'))$('#stateOrderPrev').disabled=!step?.ok||step.possible_one_line_orders<=1;
  if($('#stateStep'))$('#stateStep').textContent=step?.ok&&step.steps.length?'STEP · '+cursor+'/'+step.steps.length:'STEP · STABLE';
  if($('#stateFlow')){
    $('#stateFlow').textContent=data.stateFlow?'FLOW · '+clock.label:'FLOW';
    $('#stateFlow').classList.toggle('cool',data.stateFlow);
  }
  if($('#stateStepRead')){
    if(!step?.ok)$('#stateStepRead').textContent='STEP path unavailable';
    else if(!step.steps.length)$('#stateStepRead').textContent='STABLE · '+step.from_token+' = '+step.to_token;
    else if(cursor<=0)$('#stateStepRead').textContent='PATH '+(step.selected_order_index+1)+'/'+step.possible_one_line_orders+' · START · '+step.from_token+' · '+step.selected_order.map(x=>'L'+x).join(' → ');
    else{
      const x=step.steps[Math.min(cursor-1,step.steps.length-1)];
      $('#stateStepRead').textContent='PATH '+(step.selected_order_index+1)+'/'+step.possible_one_line_orders+' · STEP '+x.step+'/'+step.steps.length+' · L'+x.line+' · '+x.from_bit+'→'+x.to_bit+' = '+x.iching_line_value+' · '+x.after_token;
    }
  }
  syncStateFrontierUI(frontier);
  if($('#stateResidueRead')){
    const ladder=data.stateResidue,moving=ladder?.levels?.find(x=>x.id==='MOVING_SET');
    if(!ladder||!moving)$('#stateResidueRead').textContent='RESIDUE · UNRESOLVED';
    else{
      const n=Number(moving.alternatives)||1,bits=Number(moving.ambiguity_bits)||0,path=step?.ok?(step.selected_order_index+1)+'/'+step.possible_one_line_orders:'—';
      $('#stateResidueRead').textContent='RESIDUE · Δ SET COLLAPSES '+n+' ORDER'+(n===1?'':'S')+' ('+bits+'b) · PATH '+path+' RESTORES ONE ADDRESSED SEQUENCE · '+ladder.strongest_claim;
    }
  }
}
function syncStateChange({preserveOrder=false}={}){
  const from=$('#stateFrom')?.value,to=$('#stateTo')?.value;
  const change=stateChange(from,to),calc=transparentStateCalculation(from,to);
  data.stateChange=change;data.stateCalc=calc;data.stateStepCursor=0;
  if(!preserveOrder){data.stateOrderIndex=0;data.stateFlow=false}
  const indexed=calc?.ok?stepOrderAt(calc.moving,data.stateOrderIndex):null;
  if(indexed?.ok)data.stateOrderIndex=indexed.index;
  data.stateStep=calc?.ok?steppedStatePath(from,to,indexed?.ok?indexed.order:null):null;
  data.stateLattice=calc?.ok?changeLatticeCalculation(from,to):null;
  data.stateFrontier=calc?.ok&&data.stateStep?.ok?stateFrontierCalculation(from,to,data.stateStep.selected_order,data.stateStepCursor):null;
  data.stateResidue=residueLadder({state:calc,stateStep:data.stateStep,lattice:data.stateLattice});
  if($('#stateToken'))$('#stateToken').textContent=change.token;
  if($('#stateFromName'))$('#stateFromName').textContent=stateLabel(change.from);
  if($('#stateToName'))$('#stateToName').textContent=stateLabel(change.to);
  if($('#stateDelta'))$('#stateDelta').textContent=change.moving.length?change.moving.join(','):'∅';
  syncStateStepUI();
  if(change.valid){setSource('STATE / LOCAL');setStatus('DATA · '+change.token+' · d_H '+calc.metrics.hamming_distance+' · '+calc.metrics.one_line_step_orders+' STEP ORDER'+(calc.metrics.one_line_step_orders===1?'':'S'));setAddress('field://lab/data/state/'+formatState(change.to.bits))}
  else setStatus('DATA · STATE NEEDS SIX 0/1 BITS');
  syncLiveChangeUI();
  return change;
}
function stateLayout(){
  const gap=Math.max(22,Math.min(38,H*.055)),cy=H*.51,w=Math.max(42,Math.min(76,W*.115));
  return {leftX:W*.18,midX:W*.50,rightX:W*.82,cy,gap,w};
}
function drawStateLine(x,y,w,bit,changed=false){
  ctx.save();ctx.lineWidth=changed?3:2;ctx.strokeStyle=changed?'#ef7849':'#d7b46d';ctx.globalAlpha=changed?1:.72;
  ctx.beginPath();
  if(Number(bit)===1){ctx.moveTo(x-w/2,y);ctx.lineTo(x+w/2,y)}
  else{ctx.moveTo(x-w/2,y);ctx.lineTo(x-w*.12,y);ctx.moveTo(x+w*.12,y);ctx.lineTo(x+w/2,y)}
  ctx.stroke();ctx.restore();
}
function selectedStatePathMasks(){
  const lattice=data.stateLattice,step=data.stateStep;
  if(!lattice?.ok||!step?.ok)return [0];
  const byLine=new Map(lattice.moving_lines.map((line,i)=>[line,i]));
  const out=[0];let mask=0;
  for(const line of step.selected_order){
    const bit=byLine.get(line);if(bit===undefined)continue;
    mask|=(1<<bit);out.push(mask);
  }
  return out;
}
function drawStateLattice(){
  const lattice=data.stateLattice,step=data.stateStep;
  data.stateLatticeHits=[];
  if(!lattice?.ok)return;
  const k=lattice.dimensions,pathMasks=selectedStatePathMasks(),pathSet=new Set(pathMasks),activeMask=pathMasks[Math.min(data.stateStepCursor,pathMasks.length-1)]??0;
  const nextEdges=lattice.edge_set.filter(e=>e.from_mask===activeMask),nextByMask=new Map(nextEdges.map(e=>[e.to_mask,e.line]));
  const x0=W*.17,x1=W*.83,top=H*.79,bottom=H*.94,band=Math.max(1,bottom-top),pos=new Map();
  const grouped=new Map();
  for(const v of lattice.vertex_set){if(!grouped.has(v.depth))grouped.set(v.depth,[]);grouped.get(v.depth).push(v)}
  for(const [depth,list] of grouped){
    const x=k?x0+(x1-x0)*(depth/k):(x0+x1)/2;
    list.forEach((v,i)=>{
      const y=list.length===1?(top+bottom)/2:top+band*(i/(list.length-1));
      pos.set(v.mask,{x,y,v});
    });
  }
  data.stateLatticeHits=nextEdges.map(e=>{const p=pos.get(e.to_mask);return p?{line:e.line,mask:e.to_mask,x:p.x,y:p.y}:null}).filter(Boolean);
  ctx.save();
  ctx.font='700 7px ui-monospace';ctx.textAlign='center';ctx.fillStyle='#5f6d75';
  ctx.fillText('ORDER SPACE · '+lattice.dimensions+'D · '+lattice.vertices+' STATES · '+lattice.maximal_one_line_paths+' CHAINS',W/2,top-10);
  const pathEdges=new Set();
  for(let i=1;i<pathMasks.length;i++)pathEdges.add(pathMasks[i-1]+'>'+pathMasks[i]);
  for(const e of lattice.edge_set){
    const a=pos.get(e.from_mask),b=pos.get(e.to_mask);if(!a||!b)continue;
    const onPath=pathEdges.has(e.from_mask+'>'+e.to_mask);
    ctx.strokeStyle=onPath?'rgba(123,213,255,.74)':'rgba(78,96,107,.20)';
    ctx.lineWidth=onPath?1.7:.65;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  }
  for(const [mask,p] of pos){
    const onPath=pathSet.has(mask),active=mask===activeMask,candidate=nextByMask.has(mask);
    ctx.fillStyle=active?'#ef7849':onPath?'#7bd5ff':'#40515b';
    ctx.globalAlpha=active?1:(onPath ? .92 : candidate ? .78 : .48);ctx.beginPath();ctx.arc(p.x,p.y,active?4.8:onPath?3.1:candidate?3.0:2.0,0,TAU);ctx.fill();
    if(candidate&&!active){
      ctx.globalAlpha=.92;ctx.strokeStyle='#d7b46d';ctx.lineWidth=1;ctx.beginPath();ctx.arc(p.x,p.y,7,0,TAU);ctx.stroke();
      ctx.fillStyle='#d7b46d';ctx.font='700 6px ui-monospace';ctx.fillText('L'+nextByMask.get(mask),p.x,p.y-9);
    }
  }
  ctx.globalAlpha=1;
  if(step?.ok&&step.selected_order.length){
    ctx.fillStyle='#78858c';ctx.font='700 7px ui-monospace';
    ctx.fillText('SELECTED · '+step.selected_order.map(x=>'L'+x).join(' → '),W/2,bottom+11);
  }
  ctx.restore();
}
function drawStateChange(){
  const change=data.stateChange;if(!change?.valid)return;
  const {leftX,midX,rightX,cy,gap,w}=stateLayout(),moving=new Set(change.moving),step=data.stateStep,cursor=data.stateStepCursor;
  const future=new Set(step?.selected_order?.slice(cursor)||[]);
  const previewBits=statePreviewBits()||change.from.bits,preview=stateDescriptor(previewBits);
  const activeLine=cursor>0&&step?.steps.length?step.steps[Math.min(cursor-1,step.steps.length-1)].line:null;
  ctx.save();
  ctx.font='800 8px ui-monospace';ctx.textAlign='center';ctx.fillStyle='#78858c';
  ctx.fillText('FROM · '+formatState(change.from.bits),leftX,cy-gap*4);
  ctx.fillStyle='#7bd5ff';ctx.fillText('PATH · '+formatState(previewBits),midX,cy-gap*4);
  ctx.fillStyle='#78858c';ctx.fillText('TO · '+formatState(change.to.bits),rightX,cy-gap*4);
  for(let i=0;i<6;i++){
    const y=cy+gap*(2.5-i),changed=moving.has(i+1),active=activeLine===i+1;
    drawStateLine(leftX,y,w,change.from.bits[i],changed);
    drawStateLine(midX,y,w,previewBits[i],active);
    drawStateLine(rightX,y,w,change.to.bits[i],changed);
    if(changed){
      ctx.strokeStyle='rgba(123,213,255,.20)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(leftX+w*.6,y);ctx.lineTo(midX-w*.6,y);ctx.moveTo(midX+w*.6,y);ctx.lineTo(rightX-w*.6,y);ctx.stroke();
      ctx.fillStyle=active?'#ef7849':future.has(i+1)?'#d7b46d':'#7bd5ff';ctx.font='700 7px ui-monospace';ctx.fillText('L'+(i+1),midX,y-5);
      if(future.has(i+1)){ctx.fillStyle='#d7b46d';ctx.fillText('›',midX-w*.62,y-5)}
    }
  }
  ctx.fillStyle='#f2f3ef';ctx.font='900 18px ui-monospace';
  ctx.fillText(change.from.lower?.glyph||'',leftX,cy+gap*3.05);ctx.fillText(change.from.upper?.glyph||'',leftX,cy-gap*3.05);
  ctx.fillStyle='#7bd5ff';ctx.fillText(preview.lower?.glyph||'',midX,cy+gap*3.05);ctx.fillText(preview.upper?.glyph||'',midX,cy-gap*3.05);
  ctx.fillStyle='#f2f3ef';ctx.fillText(change.to.lower?.glyph||'',rightX,cy+gap*3.05);ctx.fillText(change.to.upper?.glyph||'',rightX,cy-gap*3.05);
  ctx.fillStyle='#d7b46d';ctx.font='800 9px ui-monospace';ctx.fillText(change.mask,midX,cy-gap*3.3);
  if(step?.ok){
    ctx.fillStyle='#7bd5ff';ctx.font='700 8px ui-monospace';
    ctx.fillText('PATH '+(step.selected_order_index+1)+'/'+step.possible_one_line_orders+' · STEP '+cursor+'/'+step.steps.length,midX,cy+gap*3.7);
  }
  ctx.restore();
  drawStateLattice();
}
function stateLineAt(x,y){
  const change=data.stateChange;if(!change?.valid)return -1;
  const {rightX,cy,gap,w}=stateLayout();if(Math.abs(x-rightX)>w*.8)return -1;
  let best=-1,dist=18;for(let i=0;i<6;i++){const yy=cy+gap*(2.5-i),d=Math.abs(y-yy);if(d<dist){best=i;dist=d}}return best;
}
function flipStateLine(index){
  const bits=normalizeStateBits($('#stateTo')?.value);if(!bits||index<0||index>5)return;
  bits[index]=bits[index]?0:1;$('#stateTo').value=formatState(bits);syncStateChange();
}
function stateSteerLineAt(x,y){
  const step=data.stateStep;if(!step?.ok||!step.steps.length)return null;
  const {midX,cy,gap,w}=stateLayout();if(Math.abs(x-midX)>w*.82)return null;
  const remaining=new Set(step.selected_order.slice(data.stateStepCursor));
  let best=null,dist=18;
  for(const line of remaining){
    const yy=cy+gap*(2.5-(line-1)),d=Math.abs(y-yy);
    if(d<dist){best=line;dist=d}
  }
  return best;
}
function stateLatticeCandidateAt(x,y){
  let best=null,dist=15;
  for(const hit of data.stateLatticeHits||[]){
    const d=Math.hypot(x-hit.x,y-hit.y);
    if(d<dist){best=hit;dist=d}
  }
  return best;
}
function steerStateNextLine(line){
  const calc=data.stateCalc,step=data.stateStep,cursor=data.stateStepCursor;
  if(!calc?.ok||!step?.ok)return null;
  const steered=steerStepOrder(calc.moving,step.selected_order,cursor,line);
  if(!steered.ok){setStatus('STATE STEER · '+steered.reason);return steered}
  const next=steppedStatePath($('#stateFrom')?.value,$('#stateTo')?.value,steered.order);
  if(!next.ok){setStatus('STATE STEER · PATH REBUILD FAILED');return next}
  data.stateOrderIndex=steered.index;data.stateStep=next;data.stateFlow=false;data.stateStepCursor=Math.min(cursor,next.steps.length);
  data.stateResidue=residueLadder({state:calc,stateStep:next,lattice:data.stateLattice});syncStateStepUI();
  const here=data.stateStepCursor>0?next.steps[data.stateStepCursor-1]?.address:next.path_address;
  setAddress(here||next.path_address);
  setStatus('STATE STEER · PREFIX '+data.stateStepCursor+'/'+next.steps.length+' HELD · NEXT L'+line+' · PATH '+(next.selected_order_index+1)+'/'+next.possible_one_line_orders);
  recordLabTrace('STATE_STEER');
  return steered;
}
$('#stateProject').onclick=syncStateChange;
$('#stateSwap').onclick=()=>{const a=$('#stateFrom').value;$('#stateFrom').value=$('#stateTo').value;$('#stateTo').value=a;syncStateChange()};
$('#stateCopy').onclick=async()=>{const change=syncStateChange();if(!change.valid)return;try{await navigator.clipboard.writeText(change.token);setStatus('STATE TOKEN COPIED · '+change.mask)}catch(_){setStatus('STATE TOKEN · '+change.token)}};
function advanceStateStep(){
  const step=data.stateStep;if(!step?.ok||!step.steps.length){setStatus('STATE STEP · NO MOVING LINES');return null}
  data.stateStepCursor=(data.stateStepCursor+1)%(step.steps.length+1);syncStateStepUI();
  if(data.stateStepCursor===0){setStatus('STATE STEP · RETURN TO START · '+step.from_token);return null}
  const x=step.steps[data.stateStepCursor-1];setAddress(x.address);setStatus('STATE STEP · PATH '+(step.selected_order_index+1)+'/'+step.possible_one_line_orders+' · L'+x.line+' · '+x.before_token+' → '+x.after_token);return x;
}
function shiftStateOrder(delta){
  const count=data.stateStep?.possible_one_line_orders||1;
  if(count<=1){setStatus('STATE STEP · ONLY ONE ORDER');return}
  data.stateOrderIndex=((data.stateOrderIndex+Number(delta||0))%count+count)%count;
  data.stateFlow=false;syncStateChange({preserveOrder:true});
  setAddress(data.stateStep.path_address);setStatus('STATE PATH · '+(data.stateStep.selected_order_index+1)+'/'+count+' · '+data.stateStep.selected_order.map(x=>'L'+x).join(' → '));
}
$('#stateStep')?.addEventListener('click',()=>advanceStateStep());
$('#stateOrder')?.addEventListener('click',()=>shiftStateOrder(1));
$('#stateOrderPrev')?.addEventListener('click',()=>shiftStateOrder(-1));
$('#stateFlow')?.addEventListener('click',()=>{
  const step=data.stateStep;if(!step?.ok||!step.steps.length){setStatus('STATE FLOW · NO MOVING LINES');return}
  data.stateFlow=!data.stateFlow;data.stateFlowAt=performance.now();syncStateStepUI();
  setStatus('STATE FLOW · '+(data.stateFlow?stateFlowClock().label:'PAUSED')+' · WITNESS ONLY');
});
$('#stateResearch')?.addEventListener('click',e=>{const change=syncStateChange();if(!change.valid){e.preventDefault();return}e.preventDefault();const q=new URLSearchParams({from:formatState(change.from.bits),to:formatState(change.to.bits),order:String(data.stateStep?.selected_order_index||0),fromLab:'1'});location.href='/fold-bloom/convergence/change-calculus/?'+q.toString()});
$('#stateInk')?.addEventListener('click',()=>{
  const guide=changePathInkGuide(data.stateStep);
  if(!guide.ok){setStatus('STATE → INK · PATH UNAVAILABLE');return}
  ink.pathGuide=guide;ink.guide=INK_GUIDES.length-1;syncInkGuideUI();selectMode('INK');
  setSource('STATE PATH / PROJECTION GUIDE');setAddress(guide.address);setStatus('INK · CHANGE PATH GUIDE · TRACE REMAINS HUMAN AUTHORED');
});
$('#stateFrom').onchange=syncStateChange;$('#stateTo').onchange=syncStateChange;syncStateChange();

/* ---------- POINTER / KEY ---------- */
canvas.addEventListener('pointerdown',e=>{
  const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;mx=x/W;my=y/H;
  if(mode==='PULSE'){
    const cx=W/2,cy=H/2,rr=Math.min(W,H)*.245,d=Math.hypot(x-cx,y-cy);
    if(d<rr*.30){pulse.playing?stopPulse():startPulse();setStatus('PULSE · '+(pulse.playing?'PLAY':'STOP'));return}
    const lanes=[['M',rr],['A',rr*.78],['B',rr*.56]].sort((a,b)=>Math.abs(d-a[1])-Math.abs(d-b[1]));
    if(Math.abs(d-lanes[0][1])<22){tapPulse(lanes[0][0]);return}
    tapPulse();
  }
  if(mode==='DATA'){
    const line=stateLineAt(x,y);if(line>=0){flipStateLine(line);return}
    const nextLine=stateSteerLineAt(x,y);if(nextLine){steerStateNextLine(nextLine);return}
    const candidate=stateLatticeCandidateAt(x,y);if(candidate){steerStateNextLine(candidate.line);return}
  }
  if(mode==='VOICE'){return {kind:'VOICE',pattern:voice.pattern,baseMidi:voice.baseMidi,clock:voice.linked?'PULSE_LINKED':'FREE',mic:voice.mic,frames:voice.frames,voiced:voice.voiced,training:summarizeVoiceTrace(voice.trace)}}
  if(mode==='VERSE'){
    const hit=versePositions().reduce((best,p)=>{const d=Math.abs(y-p.y);return d<(best?.d??30)?{i:p.i,d}:best},null);
    if(hit){verse.focus=hit.i;syncVerseUi();const line=currentVerseLine();if(line)setAddress(line.address)}
  }
  if(mode==='INK'){ink.down=true;ink.lastX=x;ink.lastY=y;ink.lastT=performance.now();ink.strokeSeed=(ink.strokeSeed+1)>>>0;inkDeposit(x,y,{speed:0,pressure:e.pressure||.55,tiltX:e.tiltX||0,tiltY:e.tiltY||0,flow:.5});canvas.setPointerCapture?.(e.pointerId)}
  if(mode==='LOCI'){
    const pos=lociPositions(),hit=pos.reduce((best,p,i)=>{const d=Math.hypot(x-p.x,y-p.y);return d<(best?.d??32)?{i,d}:best},null);
    if(hit&&hit.i===loci.step){const node=loci.nodes[hit.i];loci.step++;loci.hits++;if(node)setAddress(node.address);if(loci.step>=loci.nodes.length){loci.hidden=false;setStatus('LOCI · ROUTE RECALLED · EXACT SOURCE ADDRESSES PRESERVED')}syncLoci()}
  }
});
canvas.addEventListener('pointermove',e=>{
  const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;mx=x/W;my=y/H;
  if(mode==='INK'&&ink.down){const now=performance.now(),dt=Math.max(4,now-ink.lastT),sp=ink.lastX==null?0:Math.hypot(x-ink.lastX,y-ink.lastY)/(dt/16.7);inkStroke(ink.lastX??x,ink.lastY??y,x,y,{speed:sp,pressure:e.pressure||.55,tiltX:e.tiltX||0,tiltY:e.tiltY||0});ink.lastX=x;ink.lastY=y;ink.lastT=now}
  if(mode==='DATA'){const pos=dataPositions(),hit=pos.reduce((best,p,i)=>{const d=Math.hypot(x-p.x,y-p.y);return d<(best?.d??24)?{i,d}:best},null);data.focus=hit?.i??-1;if(data.focus>=0)setAddress(data.nodes[data.focus].path)}
});
canvas.addEventListener('pointerup',()=>{ink.down=false;ink.lastX=ink.lastY=null});
canvas.addEventListener('pointercancel',()=>{ink.down=false;ink.lastX=ink.lastY=null});
canvas.addEventListener('wheel',e=>{if(mode!=='DATA')return;e.preventDefault();data.aperture=Math.max(0,Math.min(data.maxDepth,data.aperture+(e.deltaY>0?-1:1)));$('#dataDepth').textContent=data.aperture},{passive:false});
addEventListener('keydown',e=>{
  if((e.code==='Space'||e.key===' ')&&document.activeElement?.tagName!=='TEXTAREA'&&document.activeElement?.tagName!=='INPUT'){e.preventDefault();if(mode==='PULSE')tapPulse()}
  const map={1:'RIDE',2:'PULSE',3:'VOICE',4:'READ',5:'LOCI',6:'INK',7:'DATA',8:'VERSE'};if(map[e.key])selectMode(map[e.key]);
});

/* ---------- DRAW ---------- */
function clear(alpha=.2){ctx.fillStyle='rgba(5,7,11,'+alpha+')';ctx.fillRect(0,0,W,H)}
function cross(){
  ctx.strokeStyle='#132029';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(W/2,0);ctx.lineTo(W/2,H);ctx.moveTo(0,H/2);ctx.lineTo(W,H/2);ctx.stroke();
}
function drawRide(t){
  clear(PROFILES[profile].trail);cross();const p=PROFILES[profile],cx=W/2,hz=H*.42,phase=(t*.00014*p.motion)%1;
  ctx.strokeStyle='rgba(123,213,255,.35)';ctx.lineWidth=1;
  for(let i=0;i<12;i++){const q=((i/12+phase)%1),y=hz+(H-hz)*q*q,xspan=W*(.04+.52*q*q);ctx.beginPath();ctx.moveTo(cx-xspan,y);ctx.lineTo(cx+xspan,y);ctx.stroke()}
  ctx.strokeStyle='rgba(239,120,73,.55)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cx-W*.035,hz);ctx.lineTo(W*.13,H);ctx.moveTo(cx+W*.035,hz);ctx.lineTo(W*.87,H);ctx.stroke();
}
function updatePulseReadout(data){
  if($('#pulseClock'))$('#pulseClock').textContent=data.playing?'OUT':'LAST';
  if($('#pulseBeat'))$('#pulseBeat').textContent=String(Math.max(0,Number(data.beatIndex)||0)+1);
  if($('#pulsePhase'))$('#pulsePhase').textContent=Math.round((Number(data.beatPhase)||0)*100)+'%';
  syncPulseLaneReadouts();
}
function syncPulseLaneReadouts(){
  const rings=pulseRings({ratio:pulse.ratio});
  if($('#ringsRead'))$('#ringsRead').textContent=String(rings.rings);
  const linked=voice.linked&&pulse.playing;
  if($('#voiceLinkState'))$('#voiceLinkState').textContent=linked?'LINKED · LAB PULSE · '+pulse.bpm+' BPM':'FREE';
  if($('#voicePulseLink')){$('#voicePulseLink').textContent=linked?'CLOCK · LINKED':'CLOCK · FREE';$('#voicePulseLink').classList.toggle('cool',!linked)}
}
function publishPulseTransport(t,force=false,timeOverride=null){
  if(!force&&t-pulse.lastPublish<120)return;
  pulse.lastPublish=t;
  const ac=pulse.ac,bar=4*60/pulse.bpm,tt=Number.isFinite(Number(timeOverride))?Number(timeOverride):(pulse.playing&&ac?Math.max(0,ac.currentTime-pulse.start):0);
  const beatDur=60/pulse.bpm,beatPhase=((tt/beatDur)%1+1)%1,quantumPhase=((tt/bar)%1+1)%1;
  const data={playing:pulse.playing,time:tt,duration:bar,bpm:pulse.bpm,tempoConfidence:1,beatIndex:Math.floor(tt/beatDur),sectionIndex:0,scope:'BAR',scopeStart:0,scopeEnd:bar,energy:.45+.18*Math.sin(tt*Math.PI*2/beatDur)**2,flux:.18,brightness:.52,stage:'SYNTH',sourceHash:null,sourceKind:'FIELD_LAB_SYNTH',sourceAddress:'field://lab/pulse',clockSource:'SYNTH',quantum:4,quantumPhase,beatTime:Math.floor(tt/beatDur)*beatDur,beatPhase,beatDistance:Math.min(beatPhase,1-beatPhase)*beatDur,sectionProgress:quantumPhase,sectionCount:1,sectionStart:0,sectionEnd:bar,sourceProgress:quantumPhase};
  lastTransport=data;fieldPulse.publish('transport',data);updatePulseReadout(data);if(read.pulseMode!=='OFF')applyTransport(data);
}
function drawPulseRing(cx,cy,rad,phase,count,col,label,target=false){
  ctx.strokeStyle='rgba('+col+','+(target?'.92':'.32')+')';ctx.lineWidth=target?3:1.25;ctx.beginPath();ctx.arc(cx,cy,rad,0,TAU);ctx.stroke();
  const ticks=Math.max(1,Math.trunc(count)||1);
  for(let i=0;i<ticks;i++){const an=-Math.PI/2+i*TAU/ticks,inner=rad-(target?8:5);ctx.strokeStyle='rgba('+col+','+(target?'.74':'.30')+')';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(cx+Math.cos(an)*inner,cy+Math.sin(an)*inner);ctx.lineTo(cx+Math.cos(an)*rad,cy+Math.sin(an)*rad);ctx.stroke()}
  const an=-Math.PI/2+phase*TAU;ctx.fillStyle='rgb('+col+')';ctx.beginPath();ctx.arc(cx+Math.cos(an)*rad,cy+Math.sin(an)*rad,target?6:4,0,TAU);ctx.fill();
  ctx.fillStyle='rgba('+col+','+(target?'.95':'.55')+')';ctx.font='700 8px ui-monospace';ctx.textAlign='left';ctx.fillText(label,cx+rad+7,cy+3);
}
function drawPulse(t){
  publishPulseTransport(t);
  clear(.16);cross();const cx=W/2,cy=H/2,p=PROFILES[profile],ac=pulse.ac,iv=pulseIntervals({bpm:pulse.bpm,ratio:pulse.ratio}),rings=pulseRings({ratio:pulse.ratio});
  const tt=pulse.playing&&ac?Math.max(0,ac.currentTime-pulse.start):t/1000,train=trainerProgress(pulse.trainer),target=pulse.mode==='TRAIN'?train.target:pulse.lane;
  const phM=phaseAt(tt,0,iv.beat),phA=phaseAt(tt,0,iv.a),phB=phaseAt(tt,0,iv.b),rr=Math.min(W,H)*.245;
  drawPulseRing(cx,cy,rr,phM,rings.ticks.M,'215,180,109','M · BEAT',target==='M');
  drawPulseRing(cx,cy,rr*.78,phA,rings.ticks.A,'123,213,255','A · '+rings.ticks.A,target==='A');
  drawPulseRing(cx,cy,rr*.56,phB,rings.ticks.B,'239,120,73','B · '+rings.ticks.B,target==='B');
  if(pulse.lastTap){
    const rad=target==='M'?rr:target==='A'?rr*.78:rr*.56,e=Math.max(-.22,Math.min(.22,Number(pulse.lastTap.phaseError)||0)),an=-Math.PI/2+e*TAU;
    ctx.strokeStyle='rgba(242,243,239,.75)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cx+Math.cos(an)*(rad-10),cy+Math.sin(an)*(rad-10));ctx.lineTo(cx+Math.cos(an)*(rad+7),cy+Math.sin(an)*(rad+7));ctx.stroke();
  }
  const summary=summarizeTapTrace(pulse.taps);
  ctx.textAlign='center';ctx.fillStyle='#f2f3ef';ctx.font='900 14px ui-monospace';ctx.fillText((pulse.mode==='TRAIN'?train.phase:'FREE')+' · '+target,cx,cy-3);
  ctx.fillStyle='#7f8d94';ctx.font='700 8px ui-monospace';ctx.fillText((pulse.mode==='TRAIN'?(train.value+1)+' / '+train.targetTaps:'CLICK RING / TAP')+' · RATIO '+iv.ratio.join(':')+' · LOCK '+(summary.lock??'—'),cx,cy+15);
}
function drawVoice(){
  clear(.18);cross();const cx=W/2,cy=H/2,target=voiceTarget(),last=voice.trace.at(-1),heard=Number(last?.heardHz)||0,targetHz=Number(target?.hz)||0;
  const maxR=Math.min(W,H)*.30;ctx.strokeStyle='rgba(123,213,255,.24)';ctx.lineWidth=1;
  for(let i=1;i<=4;i++){ctx.beginPath();ctx.arc(cx,cy,maxR*i/4,0,TAU);ctx.stroke()}
  if(targetHz>0){ctx.strokeStyle='#d7b46d';ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,cy,maxR*.72,0,TAU);ctx.stroke()}
  if(heard>0&&targetHz>0){const cents=centsBetween(heard,targetHz),a=-Math.PI/2+Math.max(-1,Math.min(1,cents/100))*Math.PI*.78;ctx.strokeStyle=Math.abs(cents)<=35?'#7bd5ff':'#ef7849';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a)*maxR*.88,cy+Math.sin(a)*maxR*.88);ctx.stroke()}
  ctx.textAlign='center';ctx.fillStyle='#f2f3ef';ctx.font='900 '+Math.max(30,Math.min(72,Math.min(W,H)*.11))+'px system-ui,sans-serif';ctx.fillText(target?.name||'HUM',cx,cy+4);
  ctx.fillStyle='#78858c';ctx.font='700 9px ui-monospace';const cents=heard>0&&targetHz>0?centsBetween(heard,targetHz):null;ctx.fillText(heard>0?('HEARD '+midiToName(hzToMidi(heard))+' · '+(cents==null?'FREE':((cents>0?'+':'')+Math.round(cents)+'¢'))):'VOICE · '+(voice.linked?'PULSE-LINKED':'FREE CLOCK'),cx,cy+30);
}
function versePositions(){
  ensureVerse();const max=11,n=verse.lines.length,start=Math.max(0,Math.min(Math.max(0,n-max),verse.focus-Math.floor(max/2))),end=Math.min(n,start+max),rows=Math.max(1,end-start);
  const top=H*.22,bottom=H*.78,step=rows>1?(bottom-top)/(rows-1):0;
  return verse.lines.slice(start,end).map((ln,j)=>({i:start+j,line:ln,y:rows===1?H*.5:top+j*step}));
}
function drawVerse(){
  clear(.2);cross();ensureVerse();const source=String($('#verseSource').value||''),marks=storedMarks(source),positions=versePositions();
  ctx.textAlign='center';ctx.textBaseline='middle';
  positions.forEach(p=>{
    const active=p.i===verse.focus,marked=marksForRange(marks,p.line.start,p.line.end).length>0;
    ctx.fillStyle=active?'#f2f3ef':'#7f8d94';ctx.font=(active?'700 ':'500 ')+(active?'16':'12')+'px ui-serif,Georgia,serif';
    ctx.fillText(String(p.line.text||'∅').slice(0,Math.max(12,Math.floor(W/11))),W*.5,p.y);
    if(marked){ctx.fillStyle='#d7b46d';ctx.beginPath();ctx.arc(W*.12,p.y,active?5:3,0,TAU);ctx.fill()}
    if(active){ctx.strokeStyle='#ef7849';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(W*.18,p.y+14);ctx.lineTo(W*.82,p.y+14);ctx.stroke()}
  });
  ctx.fillStyle='#5f6d75';ctx.font='8px ui-monospace';ctx.fillText(verse.sourceKey?verse.sourceKey:'TEXT',W*.5,H*.88);
}
function drawRead(){
  clear(.18);cross();
  const n=Math.max(1,read.tokens.length),cx=W/2,cy=H/2,x0=W*.14,x1=W*.86;
  const snap=reader?.snapshot?.()||null,p=Math.max(0,Math.min(1,Number(snap?.source_progress)||0));
  ctx.strokeStyle='#263139';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x0,cy);ctx.lineTo(x1,cy);ctx.stroke();
  ctx.fillStyle='#f2f3ef';ctx.beginPath();ctx.arc(x0+(x1-x0)*p,cy,4,0,TAU);ctx.fill();
  if(read.started){
    const gp=Math.max(0,Math.min(1,read.ghost/n)),yp=Math.max(0,Math.min(1,read.you/n));
    const gy=cy+H*.10,yy=cy+H*.16;
    ctx.strokeStyle='#263139';ctx.beginPath();ctx.moveTo(x0,gy);ctx.lineTo(x1,gy);ctx.moveTo(x0,yy);ctx.lineTo(x1,yy);ctx.stroke();
    ctx.fillStyle='#ef7849';ctx.beginPath();ctx.arc(x0+(x1-x0)*gp,gy,6,0,TAU);ctx.fill();
    ctx.fillStyle='#7bd5ff';ctx.beginPath();ctx.arc(x0+(x1-x0)*yp,yy,6,0,TAU);ctx.fill();
    ctx.font='8px ui-monospace';ctx.textAlign='left';ctx.fillStyle='#69767d';ctx.fillText('GHOST',x0,gy-9);ctx.fillText('YOU',x0,yy-9);
  }
}
function lociPositions(){
  const cx=W/2,cy=H/2,r=Math.min(W,H)*.28,n=Math.max(1,loci.nodes.length),out=[];
  for(let i=0;i<n;i++){const a=-Math.PI/2+i/n*TAU;const wobble=(i%2?.84:1.06);out.push({x:cx+Math.cos(a)*r*wobble,y:cy+Math.sin(a)*r*wobble})}
  return out;
}
function drawLoci(){
  clear(.2);const pos=lociPositions(),n=loci.nodes.length;ctx.strokeStyle='#2a3840';ctx.lineWidth=1.2;ctx.beginPath();pos.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
  const source=String($('#lociSource').value||''),marks=storedMarks(source);
  pos.forEach((p,i)=>{const node=loci.nodes[i],active=i===loci.step,done=i<loci.step,marked=!!node&&marksForRange(marks,node.start,node.end).length>0;ctx.fillStyle=done?'#7bd5ff':active?'#ef7849':'#0a0f13';ctx.strokeStyle=marked?'#d7b46d':'#52616a';ctx.lineWidth=marked?2:1;ctx.beginPath();ctx.arc(p.x,p.y,active?12:9,0,TAU);ctx.fill();ctx.stroke();if(!loci.hidden||done){ctx.fillStyle=done?'#9edcf6':'#cdd3d5';ctx.font='9px ui-monospace';ctx.textAlign='center';ctx.fillText(String(loci.nodes[i]?.text||'').slice(0,22),p.x,p.y-15)}ctx.fillStyle='#69767d';ctx.font='7px ui-monospace';ctx.fillText('@'+i,p.x,p.y+22)});
}
function drawInkPathGuide(){
  const guide=ink.pathGuide;if(!guide?.ok||!Array.isArray(guide.points)||guide.points.length<1)return;
  const x0=W*.16,x1=W*.84,y0=H*.16,y1=H*.84;
  ctx.save();ctx.lineWidth=1;
  ctx.strokeStyle='rgba(123,213,255,.08)';
  for(let i=0;i<8;i++){
    const x=x0+(x1-x0)*(i/7),y=y0+(y1-y0)*(i/7);
    ctx.beginPath();ctx.moveTo(x,y0);ctx.lineTo(x,y1);ctx.stroke();
    ctx.beginPath();ctx.moveTo(x0,y);ctx.lineTo(x1,y);ctx.stroke();
  }
  const pts=guide.points.map(p=>({x:x0+(x1-x0)*p.x,y:y0+(y1-y0)*p.y,p}));
  ctx.setLineDash([5,5]);ctx.strokeStyle='rgba(123,213,255,.46)';ctx.lineWidth=1.4;ctx.beginPath();
  pts.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));ctx.stroke();ctx.setLineDash([]);
  pts.forEach((q,i)=>{ctx.fillStyle=i===0?'#d7b46d':i===pts.length-1?'#ef7849':'#7bd5ff';ctx.beginPath();ctx.arc(q.x,q.y,i===0||i===pts.length-1?4:3,0,TAU);ctx.fill()});
  ctx.fillStyle='rgba(154,166,172,.78)';ctx.font='700 7px ui-monospace';ctx.textAlign='center';
  ctx.fillText('CHANGE PATH · LOWER TRIGRAM → X · UPPER TRIGRAM → Y',W/2,H*.11);
  ctx.fillText(guide.order.map(x=>'L'+x).join(' → '),W/2,H*.90);
  ctx.restore();
}
function drawInk(t){
  if(t-ink.simAt>26){stepInk();ink.simAt=t}
  inkImage.data.set(ink.field.rgba({warmth:.10}));inkCtx.putImageData(inkImage,0,0);
  ctx.clearRect(0,0,W,H);ctx.imageSmoothingEnabled=true;ctx.drawImage(inkCanvas,0,0,W,H);
  drawInkPathGuide();
  const guide=INK_GUIDES[ink.guide];
  if(guide&&!ink.pathGuide){ctx.save();ctx.globalAlpha=.105;ctx.fillStyle='#344952';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 '+Math.min(W,H)*.45+'px "Noto Serif CJK SC","Songti SC",serif';ctx.fillText(guide,W/2,H/2);ctx.restore()}
  if(t-ink.metricAt>180){ink.metricAt=t;syncInkMetrics()}
}
function dataPositions(){
  const visible=data.nodes.filter(n=>n.depth<=data.aperture),byDepth=new Map();visible.forEach((n,i)=>{if(!byDepth.has(n.depth))byDepth.set(n.depth,[]);byDepth.get(n.depth).push({n,index:data.nodes.indexOf(n)})});
  const cx=W/2,cy=H/2,maxR=Math.min(W,H)*.38,out=Array(data.nodes.length);
  for(const [depth,list] of byDepth){const r=depth===0?0:maxR*(depth/Math.max(1,data.aperture));list.forEach((x,j)=>{const a=-Math.PI/2+j/list.length*TAU+(depth*.37);out[x.index]={x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r}})}
  return out;
}
function drawData(){
  clear(.18);const pos=dataPositions();ctx.lineWidth=1;
  data.nodes.forEach((n,i)=>{if(n.depth>data.aperture||!pos[i])return;if(n.parent>=0&&pos[n.parent]){ctx.strokeStyle='rgba(70,88,99,.45)';ctx.beginPath();ctx.moveTo(pos[n.parent].x,pos[n.parent].y);ctx.lineTo(pos[i].x,pos[i].y);ctx.stroke()}});
  data.nodes.forEach((n,i)=>{if(n.depth>data.aperture||!pos[i])return;const f=i===data.focus;ctx.fillStyle=f?'#ef7849':n.depth===0?'#d7b46d':'#7bd5ff';ctx.globalAlpha=f?1:.65;ctx.beginPath();ctx.arc(pos[i].x,pos[i].y,f?7:3.5,0,TAU);ctx.fill();if(f){ctx.globalAlpha=1;const val=typeof n.value==='object'&&n.value!==null?(Array.isArray(n.value)?'ARRAY '+n.value.length:'OBJECT '+Object.keys(n.value).length):String(n.value);ctx.fillStyle='#f2f3ef';ctx.font='900 '+Math.max(18,Math.min(42,Math.min(W,H)*.06))+'px system-ui,sans-serif';ctx.textAlign='center';ctx.fillText(String(n.key||n.path).slice(0,28),W/2,H*.48,Math.max(180,W*.5));ctx.fillStyle='#7bd5ff';ctx.font='700 9px ui-monospace';ctx.fillText(n.path,W/2,H*.53,Math.max(180,W*.64));ctx.fillStyle='#9aa6ac';ctx.font='700 10px ui-monospace';ctx.fillText(val.slice(0,72),W/2,H*.57,Math.max(180,W*.66))}});ctx.globalAlpha=1;
  drawStateChange();
}
function tick(now){
  const dt=Math.min(.05,(now-last)/1000);last=now;
  if(read.started&&!read.paused&&read.tokens.length){const dwell=60000/read.wpm;read.ghost=Math.min(read.tokens.length,Math.floor((now-read.startAt)/dwell));syncReadUI()}
  analyzeLabVoice(now);
  if(mode==='DATA'&&data.stateFlow&&data.stateStep?.steps.length){
    const clock=stateFlowClock();
    if(now-data.stateFlowAt>=clock.interval){data.stateFlowAt=now;advanceStateStep()}
  }
  if(mode==='RIDE')drawRide(now);else if(mode==='PULSE')drawPulse(now);else if(mode==='VOICE')drawVoice();else if(mode==='VERSE')drawVerse();else if(mode==='READ')drawRead();else if(mode==='LOCI')drawLoci();else if(mode==='INK')drawInk(now);else if(mode==='DATA')drawData();
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
function currentProjectionEvidence(){
  if(mode==='PULSE'){const train=pulseTrainView();return {kind:'PULSE',psychophysics:PULSE_PSYCHOPHYSICS_VERSION,bpm:pulse.bpm,ratio:pulse.ratio.join(':'),rings:pulseRings({ratio:pulse.ratio}),timbre:pulse.timbre,playing:pulse.playing,taps:pulse.taps.length,lastSync:pulse.taps.at(-1)?.score??null,train:{...train.progress,summary:train.summary,returnDelta:train.returnDelta},voice:{pattern:voice.pattern,baseMidi:voice.baseMidi,frames:voice.frames,voiced:voice.voiced,onTargetRatio:voice.voiced?+(voice.onTarget/voice.voiced).toFixed(3):null,meanAbsCents:voice.voiced?+(voice.absCents/voice.voiced).toFixed(2):null,meanCentroidHz:voice.spectralFrames?+(voice.centroidHz/voice.spectralFrames).toFixed(1):null}};}
  if(mode==='VERSE'){
    const line=currentVerseLine();
    return {kind:'VERSE',sourceKey:verse.sourceKey||textSourceKey(String($('#verseSource').value||'')),focus:line?.address||null,line:line?line.line+1:null,marks:verse.marks.length};
  }
  if(mode==='READ'){
    const source=readerSource(),focus=boundedFocus(reader?.snapshot?.()||ensureReader()||{});
    return {kind:'READ',sourceKey:textSourceKey(source),focus,pulseMode:read.pulseMode};
  }
  if(mode==='LOCI'){
    const source=String($('#lociSource').value||''),node=loci.nodes[Math.min(loci.step,Math.max(0,loci.nodes.length-1))];
    return {kind:'LOCI',sourceKey:textSourceKey(source),strategy:loci.course?.strategy||null,nodes:loci.nodes.length,step:loci.step,hits:loci.hits,focus:node?.address||null};
  }
  if(mode==='INK'){
    const metrics=ink.field.metrics();
    return {kind:'INK',mode:ink.mode,wet:+ink.wet.toFixed(3),load:+ink.load.toFixed(3),brush:ink.brush,absorb:+ink.absorb.toFixed(3),pigment:Math.round(metrics.pigment),water:Math.round(metrics.water),guide:ink.pathGuide?.ok?{kind:'CHANGE_PATH',address:ink.pathGuide.address,states:ink.pathGuide.points.length,order:[...ink.pathGuide.order],projection:'LOWER_TRIGRAM_X__UPPER_TRIGRAM_Y'}:(INK_GUIDES[ink.guide]?{kind:'GLYPH',glyph:INK_GUIDES[ink.guide]}:null)};
  }
  if(mode==='DATA'){
    const change=data.stateChange,calc=data.stateCalc,step=data.stateStep,lattice=data.stateLattice,ladder=data.stateResidue,liveWitness=liveChangeBridgeReturn(liveChange.bridge,{fromCapture:liveChange.from,toCapture:liveChange.to});
    return {kind:'DATA',nodes:data.nodes.length,maxDepth:data.maxDepth,aperture:data.aperture,focus:data.focus,liveChange:liveWitness,stateChange:change?.valid?{token:change.token,moving:[...change.moving],from:formatState(change.from.bits),to:formatState(change.to.bits),calculation:calc?.ok?{hamming:calc.metrics.hamming_distance,normalizedHamming:calc.metrics.normalized_hamming,stable:calc.metrics.stable_lines,lineValues:[...calc.iching_projection.line_values],stepOrders:calc.metrics.one_line_step_orders,orderAmbiguityBits:calc.metrics.step_order_ambiguity_bits}:null,step:step?.ok?{order:[...step.selected_order],orderIndex:step.selected_order_index,orderCount:step.possible_one_line_orders,pathAddress:step.path_address,cursor:data.stateStepCursor,flow:data.stateFlow,flowClock:stateFlowClock().label,path:step.steps.map(x=>({address:x.address,line:x.line,lineValue:x.iching_line_value,before:x.before_token,after:x.after_token}))}:null,frontier:data.stateFrontier?.ok?{current:data.stateFrontier.current.token,currentAddress:data.stateFrontier.current.address,futurePaths:data.stateFrontier.current_future_paths,historyCount:data.stateFrontier.current_histories_collapsed,candidates:data.stateFrontier.candidates.map(x=>({line:x.line,transition:x.transition,lineValue:x.iching_line_value,after:x.after_token,futurePaths:x.future_paths_after,historyCount:x.histories_collapsed_at_successor,orderIndex:x.order_index_if_chosen}))}:null,lattice:lattice?.ok?{dimensions:lattice.dimensions,vertices:lattice.vertices,edges:lattice.edges,maximalChains:lattice.maximal_one_line_paths,widestRank:lattice.widest_rank}:null,residue:ladder?{strongestClaim:ladder.strongest_claim,levels:ladder.levels.map(x=>({id:x.id,claim:x.claim,authority:x.authority}))}:null}:null};
  }
  return {kind:'RIDE',target:'/fold-bloom/live/'};
}
function labReturnPacket(){
  recordLabTrace('RETURN');
  return compileLabReturn({
    startedAt:labStartedAt,endedAt:Date.now(),mode,profile,
    address:$('#addressRead')?.textContent||'',source:$('#sourceRead')?.textContent||'',
    trace:labTrace,projection:currentProjectionEvidence()
  });
}
$('#exportLabReturn')?.addEventListener('click',()=>{
  const packet=labReturnPacket();
  downloadJSON('fold-bloom-field-lab-return.json',packet);
  setStatus('FIELD LAB · SESSION RETURN EXPORTED · '+packet.evidence.modesVisited+' MODES');
});
document.documentElement.dataset.fieldLabReturn='ready';

const bootQuery=new URLSearchParams(location.search),initialMode=String(bootQuery.get('mode')||'RIDE').toUpperCase();
let verseHandoffRestored=false,lociHandoffRestored=false;
if(initialMode==='VERSE'&&bootQuery.has('handoff')){
  const h=recoverVerseInboundHandoff();
  if(h?.source){
    $('#verseSource').value=h.source;
    if(Array.isArray(h.marks)&&h.marks.length)saveTextMarks(h.source,h.marks);
    bindVerse({focusStart:Number(h.focus?.start),announce:false});
    verse.returnAddress=h.from||'';
    const rb=$('#verseReturn');if(rb&&verse.returnAddress){rb.href=verse.returnAddress;rb.hidden=false}
    verseHandoffRestored=true;document.documentElement.dataset.fieldLabVerseHandoff='focus-restored';
  }
}
if(initialMode==='LOCI'&&bootQuery.has('handoff')){
  const h=recoverHandoff(),p=Number(h?.focus?.source_progress);
  if(h?.source){
    $('#lociSource').value=h.source;buildLoci();
    if(Number.isFinite(p)){const hit=nodeForProgress(loci.course,p);if(hit)loci.step=Math.max(0,loci.nodes.findIndex(n=>n.id===hit.id))}
    syncLoci();lociHandoffRestored=true;document.documentElement.dataset.fieldLabLociHandoff='focus-restored';
  }
}
syncPulseButton();
document.documentElement.dataset.fieldLabReadPulse=read.pulseMode;
selectMode(MODES[initialMode]?initialMode:'RIDE');
if(verseHandoffRestored){syncVerseUi();setSource('TEXT / CARRIED FROM POEM MAP');setStatus('VERSE · SOURCE + LINE FOCUS RESTORED')}
if(lociHandoffRestored){syncLoci();setSource('TEXT / CARRIED FROM READFIELD');setStatus('LOCI · SOURCE + FOCUS RESTORED')}
document.documentElement.dataset.foldBloomFieldLab='ready';document.documentElement.dataset.foldBloomState=data.stateChange?.valid?'ready':'invalid';
const labBootWitness=$('#labBootWitness');if(labBootWitness)labBootWitness.textContent='LAB_READY';
window.FoldBloomFieldLab={mode:()=>mode,profile:()=>profile,eventTape:()=>compileEventTape(syntheticMap(16),{sourceId:'field://lab/pulse'}),reader:()=>reader?.snapshot?.()||null,pulse:()=>({...lastTransport,mode:pulse.mode,lane:pulse.lane,training:pulseTrainView()}),voice:()=>({pattern:voice.pattern,baseMidi:voice.baseMidi,linked:voice.linked,mic:voice.mic,frames:voice.frames,voiced:voice.voiced,training:summarizeVoiceTrace(voice.trace),spectrum:voice.lastSpectrum?{centroidHz:voice.lastSpectrum.centroidHz,peakHz:voice.lastSpectrum.peakHz,brightness:voice.lastSpectrum.brightness}:null}),verse:()=>({source:String($('#verseSource').value||''),focus:currentVerseLine(),marks:[...verse.marks],sourceKey:verse.sourceKey}),state:()=>data.stateChange,changeCalc:()=>data.stateCalc,stateStep:()=>({path:data.stateStep,lattice:data.stateLattice,frontier:data.stateFrontier,cursor:data.stateStepCursor,flow:data.stateFlow,clock:stateFlowClock(),next:(data.stateFrontier?.candidates||[]).map(x=>({...x}))}),liveChange:()=>liveChangeBridgeReturn(liveChange.bridge,{fromCapture:liveChange.from,toCapture:liveChange.to}),ink:()=>({mode:ink.mode,guide:ink.pathGuide?.ok?ink.pathGuide:null,glyph:ink.pathGuide?null:INK_GUIDES[ink.guide]}),trace:()=>labTrace.map(x=>({...x})),returnPacket:labReturnPacket};
addEventListener('pagehide',()=>{stopLabVoiceMic();try{stopLiveChangePulse?.()}catch(_){}try{fieldPulse.close?.()}catch(_){}});
