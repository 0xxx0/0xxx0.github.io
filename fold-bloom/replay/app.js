import {
  OP_TYPES,PRESETS,absoluteMs,activeWord,addOperation,applyPreset,clipDurationMs,decodeShare,defaultScore,
  normalizeScore,packetBytes,relativeP,removeOperation,setContext,setExperience,setMessage,setOperation,setWordCue,
  shareUrl,sampleScore,visualSignature,wordsOf
} from './score.js';
import {profileKey} from '../live/visual-worlds.js';

const $=id=>document.getElementById(id);
const cv=$('stage'),ctx=cv.getContext('2d');
let score=defaultScore(),started=performance.now(),playing=true,scrubP=0,syncListen=false,selectedWord=0,selectedOp=0,recording=false;
let dpr=1,w=0,h=0,lastListenPoll=0,listenOk=false;

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number(v)||0));
const fmtMs=ms=>{const s=Math.max(0,Number(ms)||0)/1000,m=Math.floor(s/60),r=(s-m*60).toFixed(2).padStart(5,'0');return m+':'+r};
const html=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const handoffKey='fold-bloom.replay.handoff.v02';

function listenApi(){
  try{
    const w=window.opener;
    return w&&!w.closed&&w.location.origin===location.origin&&w.FoldBloomListen?.boot==='ready'?w.FoldBloomListen:null;
  }catch{return null}
}
function readHandoff(){
  let raw=null;
  try{raw=sessionStorage.getItem(handoffKey)||localStorage.getItem(handoffKey)}catch(_){}
  if(!raw)return null;
  try{
    const p=JSON.parse(raw);
    if(p?.schema!=='fold-bloom-replay-handoff/v0.2')return null;
    if(p.expires&&Date.now()>p.expires)return null;
    try{localStorage.removeItem(handoffKey)}catch(_){}
    return p;
  }catch{return null}
}
function scoreFromHandoff(p){
  const src=p.source||{},interval=Array.isArray(p.interval_ms)?p.interval_ms:[0,Math.min(Number(src.duration_ms)||12000,12000)];
  const cells=p.addressedMessage?.path?.cells||[],nearest=cells.slice().sort((a,b)=>Math.abs((a.p??0)-.5)-Math.abs((b.p??0)-.5))[0];
  const message=(nearest?.label||nearest?.note||p.suggestedMessage||'MEET ME HERE').slice(0,180);
  return normalizeScore({
    source:{
      id:src.id||src.key||'listen:source',profile_key:src.profile_key||src.key||src.id,name:src.name||'LISTEN SOURCE',kind:src.kind||'AUDIO_MAP',
      duration_ms:src.duration_ms||Math.max(interval[1]||12000,12000),interval_ms:interval,address:src.address||'',public_address:src.public_address||''
    },
    context:{
      title:p.context?.title||'WHY THIS MOMENT',
      body:p.context?.body||((p.scope||'ADDRESS')+' · '+cells.length+' authored mark'+(cells.length===1?'':'s')+' · source evidence from LISTEN')
    },
    message,
    operations:p.operations||[
      {type:'COMPRESS',at:.14,span:.12,intensity:.7},{type:'MESSAGE',at:.28,span:.18,intensity:.9},
      {type:'DROP',at:.5,span:.08,intensity:1},{type:'BLOOM',at:.58,span:.18,intensity:.9},{type:'RETURN',at:.92,span:.14,intensity:1}
    ],
    experience:{layer:p.layer||'IMMERSION',scene:p.scene||'DEEP',profile:p.rideProfile||{}},
    evidence:p.evidence||{},
    returnAddress:p.returnAddress||'/fold-bloom/listen/'
  });
}
async function fromHash(){
  const m=location.hash.match(/(?:^#|&)s=([^&]+)/);
  if(!m)return false;
  try{score=await decodeShare(decodeURIComponent(m[1]));return true}
  catch(e){console.warn('REPLAY share decode failed',e);return false}
}
function resize(){
  dpr=Math.min(devicePixelRatio||1,2);w=cv.clientWidth;h=cv.clientHeight;cv.width=Math.max(1,Math.round(w*dpr));cv.height=Math.max(1,Math.round(h*dpr));ctx.setTransform(dpr,0,0,dpr,0,0);
}
addEventListener('resize',resize,{passive:true});resize();

function readProfileStore(){
  try{
    const raw=localStorage.getItem(profileKey(score.source.profile_key||score.source.id));
    if(raw)score=setExperience(score,{profile:JSON.parse(raw)});
  }catch(_){}
}
function writeProfileStore(){
  try{localStorage.setItem(profileKey(score.source.profile_key||score.source.id),JSON.stringify(score.experience.profile))}catch(_){}
}
function currentMs(now=performance.now()){
  if(syncListen&&listenOk)return scrubP*clipDurationMs(score);
  if(!playing)return scrubP*clipDurationMs(score);
  return (now-started)%clipDurationMs(score);
}
function currentP(now=performance.now()){return clamp(currentMs(now)/clipDurationMs(score))}
function setPlayhead(p,{seekListen=true}={}){
  scrubP=clamp(p);started=performance.now()-scrubP*clipDurationMs(score);
  if(syncListen&&seekListen){
    const api=listenApi();if(api){try{api.seek(absoluteMs(score,scrubP)/1000)}catch(_){}}
  }
  $('scrub').value=String(Math.round(scrubP*1000));syncReadouts(scrubP);
}
function syncListenState(now){
  if(now-lastListenPoll<80)return;
  lastListenPoll=now;const api=listenApi();listenOk=!!api;
  if(!api){if(syncListen){syncListen=false;updateSyncButton()}return}
  if(!syncListen)return;
  try{
    const st=api.state(),key=String(st?.sourcePinKey||''),ours=String(score.source.profile_key||score.source.id||'');
    if(key&&ours&&key!==ours&&!ours.includes(key)&&!key.includes(ours))return;
    const abs=(Number(st.time)||0)*1000;setPlayhead(relativeP(score,abs),{seekListen:false});
    if(st.rideProfile)score=setExperience(score,{profile:st.rideProfile});
  }catch(_){}
}
function updateSyncButton(){
  $('syncListen').textContent=syncListen?'LISTEN · LINKED':'SYNC LISTEN';
  $('syncListen').classList.toggle('on',syncListen);
  document.documentElement.dataset.replayListenSync=syncListen?'on':'off';
}
function activeOperationIndex(p){
  let best=-1,d=.06;score.operations.forEach((o,i)=>{const x=Math.abs(o.at-p);if(x<d){d=x;best=i}});return best;
}
function updateWords(){
  const words=wordsOf(score.message),host=$('words');
  host.innerHTML=words.map((word,i)=>`<button data-word="${i}" class="${i===selectedWord?'on':''}"><b>${html(word)}</b><span>${Math.round((score.wordCues[i]?.at||0)*100)}%</span></button>`).join('');
  host.querySelectorAll('[data-word]').forEach(b=>b.onclick=()=>{selectedWord=Number(b.dataset.word)||0;syncWordControls();updateWords()});
  syncWordControls();
}
function syncWordControls(){
  selectedWord=Math.max(0,Math.min(score.wordCues.length-1,selectedWord));
  const cue=score.wordCues[selectedWord]||{at:.5,hold:.09,emphasis:1},word=wordsOf(score.message)[selectedWord]||'—';
  $('wordName').textContent=word;$('wordAt').value=String(Math.round(cue.at*1000));$('wordHold').value=String(Math.round(cue.hold*1000));$('wordEmphasis').value=String(Math.round(cue.emphasis*100));
  $('wordAtVal').textContent=Math.round(cue.at*100)+'%';$('wordHoldVal').textContent=Math.round(cue.hold*clipDurationMs(score))+'ms';$('wordEmphasisVal').textContent=cue.emphasis.toFixed(2)+'×';
}
function updateOps(){
  const host=$('ops');
  host.innerHTML=score.operations.map((o,i)=>`<button data-op="${i}" class="${i===selectedOp?'on':''}"><b>${o.type}</b><span>${Math.round(o.at*100)}%</span></button>`).join('');
  host.querySelectorAll('[data-op]').forEach(b=>b.onclick=()=>{selectedOp=Number(b.dataset.op)||0;syncOpControls();updateOps()});
  syncOpControls();
}
function syncOpControls(){
  selectedOp=Math.max(0,Math.min(score.operations.length-1,selectedOp));
  const o=score.operations[selectedOp]||{type:'MESSAGE',at:.5,span:.1,intensity:1};
  $('opType').value=o.type;$('opAt').value=String(Math.round(o.at*1000));$('opSpan').value=String(Math.round(o.span*1000));$('opIntensity').value=String(Math.round(o.intensity*100));
  $('opAtVal').textContent=Math.round(o.at*100)+'%';$('opSpanVal').textContent=Math.round(o.span*100)+'%';$('opIntensityVal').textContent=o.intensity.toFixed(2)+'×';
}
function syncExperience(){
  const p=score.experience.profile;
  document.querySelectorAll('[data-layer]').forEach(b=>b.classList.toggle('on',b.dataset.layer===score.experience.layer));
  document.querySelectorAll('[data-scene]').forEach(b=>b.classList.toggle('on',b.dataset.scene===score.experience.scene));
  for(const [id,key,scale] of [['solid','solidity',100],['immersion','immersion',100],['drop','dropGain',100],['anticipation','anticipation',100],['motion','motionGain',100],['textOffset','textOffset',100]]){
    $(id).value=String(Math.round(p[key]*scale));
  }
  $('solidVal').textContent=Math.round(p.solidity*100)+'%';$('immersionVal').textContent=p.immersion.toFixed(2)+'×';$('dropVal').textContent=p.dropGain.toFixed(2)+'×';
  $('anticipationVal').textContent=p.anticipation.toFixed(2)+'×';$('motionVal').textContent=p.motionGain.toFixed(2)+'×';$('textOffsetVal').textContent=(p.textOffset>=0?'+':'')+p.textOffset.toFixed(2)+'s';
}
function updateEvidence(){
  const e=score.evidence,host=$('marks');
  host.innerHTML=e.marks.length?e.marks.map(m=>`<button data-mark="${m.p}"><b>${html(m.kind)}</b><span>${html(m.label||m.note||m.address||'MARK')}</span></button>`).join(''):'<span>NO LISTEN MARKS IN THIS ARTIFACT</span>';
  host.querySelectorAll('[data-mark]').forEach(b=>b.onclick=()=>setPlayhead(Number(b.dataset.mark)||0));
  $('evidenceRead').textContent=[e.bpm?e.bpm+' BPM':null,e.stage&&e.stage!=='UNKNOWN'?e.stage:null,e.marks.length?e.marks.length+' MARKS':null].filter(Boolean).join(' · ')||'NO MAP EVIDENCE';
}
function updateMeta(){
  $('source').textContent=score.source.name+' · '+score.source.id;$('interval').textContent=fmtMs(score.source.interval_ms[0])+' → '+fmtMs(score.source.interval_ms[1]);
  $('bytes').textContent=packetBytes(score)+' B';$('signature').textContent=visualSignature(score);
  $('publicSource').hidden=!score.source.public_address;$('publicSource').href=score.source.public_address||'#';
  $('return').href=score.returnAddress||'/fold-bloom/';
}
function updateUi(){
  $('message').value=score.message;$('contextTitle').value=score.context.title;$('contextBody').value=score.context.body;
  updateWords();updateOps();syncExperience();updateEvidence();updateMeta();updateSyncButton();
  document.documentElement.dataset.foldBloomReplay='ready';
}
function syncReadouts(p){
  $('scrub').value=String(Math.round(p*1000));$('position').textContent=fmtMs(absoluteMs(score,p))+' · '+Math.round(p*100)+'%';
}
function worldColor(scene){
  return ({DEEP:['#05070b','#7bd5ff'],TRANCE:['#0b0611','#d8b4ff'],WOOD:['#0e0904','#e9b86f'],VOID:['#000000','#958da9']})[scene]||['#05070b','#7bd5ff'];
}
function draw(now){
  syncListenState(now);
  const t=currentMs(now),p=clamp(t/clipDurationMs(score)),s=sampleScore(score,t),word=activeWord(score,t),[bg,accent]=worldColor(score.experience.scene);
  if(!syncListen&&playing)scrubP=p;
  ctx.clearRect(0,0,w,h);ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  const cx=w*.5,baseY=h*s.horizon,r=Math.max(30,Math.min(w,h)*.22*s.radius);
  ctx.strokeStyle='rgba(120,140,150,.22)';ctx.lineWidth=1;
  for(let i=1;i<7;i++){ctx.beginPath();ctx.arc(cx,baseY,r*i*.34,0,Math.PI*2);ctx.stroke()}
  for(const q of score.evidence.sections){const x=q*w;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.strokeStyle='rgba(215,180,109,.10)';ctx.stroke()}
  if(s.beat>.05){ctx.beginPath();ctx.arc(cx,baseY,r*(1.12+s.beat*.22),0,Math.PI*2);ctx.strokeStyle='rgba(215,180,109,'+(s.beat*.3)+')';ctx.stroke()}
  const fork=s.fork*Math.min(w*.24,160);
  for(const sign of [-1,1]){ctx.beginPath();ctx.moveTo(cx,baseY+r*.1);ctx.bezierCurveTo(cx+sign*fork*.3,baseY-r*.3,cx+sign*fork,baseY-r*.9,cx+sign*fork*1.15,baseY-r*1.5);ctx.strokeStyle=sign<0?'rgba(123,213,255,'+(0.2+s.contrast*.65)+')':'rgba(239,120,73,'+(0.2+s.contrast*.65)+')';ctx.lineWidth=1+s.contrast*2.4;ctx.stroke()}
  ctx.beginPath();ctx.arc(cx,baseY,r,0,Math.PI*2);ctx.strokeStyle=accent;ctx.globalAlpha=.25+s.contrast*.65;ctx.lineWidth=1+s.contrast*2;ctx.stroke();ctx.globalAlpha=1;
  ctx.beginPath();ctx.moveTo(0,baseY);ctx.lineTo(w,baseY);ctx.strokeStyle='rgba(215,180,109,.28)';ctx.stroke();
  if(word?.text){
    const emph=word.emphasis||1;ctx.save();ctx.globalAlpha=Math.min(1,.5+s.messageOpacity*.65);ctx.fillStyle='#f2f3ef';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font='900 '+Math.max(22,Math.min(64,w*.075*emph))+'px system-ui,sans-serif';ctx.fillText(word.text,cx,Math.max(46,baseY-r*1.8));ctx.restore();
  }
  const opi=activeOperationIndex(p),phase=opi>=0?score.operations[opi].type:'FIELD';
  $('phase').textContent=phase;$('clock').textContent=fmtMs(absoluteMs(score,p));syncReadouts(p);
  requestAnimationFrame(draw);
}
function changeWord(){
  score=setWordCue(score,selectedWord,{at:Number($('wordAt').value)/1000,hold:Number($('wordHold').value)/1000,emphasis:Number($('wordEmphasis').value)/100});
  syncWordControls();updateWords();updateMeta();
}
function changeOp(){
  score=setOperation(score,selectedOp,{type:$('opType').value,at:Number($('opAt').value)/1000,span:Number($('opSpan').value)/1000,intensity:Number($('opIntensity').value)/100});
  syncOpControls();updateOps();updateMeta();
}
function saveExperience(){
  writeProfileStore();syncExperience();updateMeta();
}
function setProfileKey(key,value,scale=100){
  score=setExperience(score,{profile:{[key]:Number(value)/scale}});saveExperience();
}
async function share(){
  const url=await shareUrl(score,location.origin+location.pathname),text=(score.context.title?score.context.title+' — ':'')+score.message;
  $('shareLen').textContent=url.length+' chars';
  history.replaceState(null,'',url);
  try{
    if(navigator.share){await navigator.share({title:'FOLD//BLOOM · '+score.source.name,text,url});$('share').textContent='SHARED';return}
  }catch(e){if(e?.name==='AbortError')return}
  try{await navigator.clipboard.writeText(url);$('share').textContent='LINK COPIED'}catch{$('share').textContent='LINK IN ADDRESS BAR'}
}
function downloadJson(){
  const blob=new Blob([JSON.stringify(score,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='fold-bloom-replay-'+Date.now()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1200);
}
async function exportWebm(){
  if(recording)return;
  if(!cv.captureStream||typeof MediaRecorder==='undefined'){const a=document.createElement('a');a.href=cv.toDataURL('image/png');a.download='fold-bloom-replay.png';a.click();$('clip').textContent='PNG FRAME EXPORTED';return}
  recording=true;$('clip').textContent='RECORDING VISUAL…';const prevSync=syncListen,prevPlay=playing,prevP=scrubP;
  syncListen=false;playing=true;started=performance.now();scrubP=0;updateSyncButton();
  const stream=cv.captureStream(30),types=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'],type=types.find(t=>MediaRecorder.isTypeSupported?.(t))||'';
  const rec=new MediaRecorder(stream,type?{mimeType:type}:undefined),chunks=[];rec.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};
  const done=new Promise(resolve=>rec.onstop=resolve);rec.start(250);
  await new Promise(r=>setTimeout(r,clipDurationMs(score)+180));rec.stop();await done;
  const blob=new Blob(chunks,{type:rec.mimeType||'video/webm'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='fold-bloom-replay-'+Date.now()+'.webm';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);
  syncListen=prevSync;playing=prevPlay;setPlayhead(prevP,{seekListen:false});recording=false;$('clip').textContent='EXPORT VISUAL · WEBM';updateSyncButton();
}

$('replay').onclick=()=>{playing=true;setPlayhead(0);$('pause').textContent='PAUSE'};
$('pause').onclick=()=>{playing=!playing;if(playing)started=performance.now()-scrubP*clipDurationMs(score);$('pause').textContent=playing?'PAUSE':'PLAY'};
$('scrub').oninput=e=>{playing=false;$('pause').textContent='PLAY';setPlayhead(Number(e.target.value)/1000)};
$('syncListen').onclick=()=>{const api=listenApi();if(!api){$('syncListen').textContent='OPEN FROM LISTEN TO LINK';return}syncListen=!syncListen;listenOk=!!api;updateSyncButton()};
$('message').onchange=e=>{score=setMessage(score,e.target.value);selectedWord=Math.min(selectedWord,Math.max(0,score.wordCues.length-1));updateUi()};
$('contextTitle').onchange=e=>{score=setContext(score,{title:e.target.value});updateMeta()};
$('contextBody').onchange=e=>{score=setContext(score,{body:e.target.value});updateMeta()};
['wordAt','wordHold','wordEmphasis'].forEach(id=>$(id).oninput=changeWord);
$('wordSnap').onclick=()=>{score=setWordCue(score,selectedWord,{at:scrubP});updateWords();updateMeta()};
['opType','opAt','opSpan','opIntensity'].forEach(id=>$(id).oninput=changeOp);
$('opSnap').onclick=()=>{score=setOperation(score,selectedOp,{at:scrubP});updateOps();updateMeta()};
$('opAdd').onclick=()=>{score=addOperation(score,$('newOpType').value,scrubP);selectedOp=score.operations.length-1;updateOps();updateMeta()};
$('opDelete').onclick=()=>{score=removeOperation(score,selectedOp);selectedOp=Math.max(0,selectedOp-1);updateOps();updateMeta()};
document.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{score=applyPreset(score,b.dataset.preset);saveExperience()});
document.querySelectorAll('[data-layer]').forEach(b=>b.onclick=()=>{score=setExperience(score,{layer:b.dataset.layer});saveExperience()});
document.querySelectorAll('[data-scene]').forEach(b=>b.onclick=()=>{score=setExperience(score,{scene:b.dataset.scene});saveExperience()});
for(const [id,key,scale] of [['solid','solidity',100],['immersion','immersion',100],['drop','dropGain',100],['anticipation','anticipation',100],['motion','motionGain',100],['textOffset','textOffset',100]])$(id).oninput=e=>setProfileKey(key,e.target.value,scale);
$('share').onclick=()=>{void share()};$('json').onclick=downloadJson;$('clip').onclick=()=>{void exportWebm()};
$('reset').onclick=()=>{score=defaultScore();syncListen=false;selectedWord=selectedOp=0;history.replaceState(null,'',location.pathname);setPlayhead(0,{seekListen:false});updateUi()};
$('addMarkOp').onclick=()=>{const m=score.evidence.marks[0];if(!m)return;score=addOperation(score,'MESSAGE',m.p);selectedOp=score.operations.length-1;updateOps();updateMeta()};
document.querySelectorAll('[data-tool]').forEach(a=>a.addEventListener('click',e=>{if(a.dataset.tool==='LISTEN'&&window.opener&&!window.opener.closed){try{e.preventDefault();window.opener.focus()}catch(_){}}}));

(async function init(){
  const shared=await fromHash(),handoff=!shared?readHandoff():null;
  if(handoff)score=scoreFromHandoff(handoff);
  readProfileStore();
  const api=listenApi();if(api&&handoff){syncListen=true;listenOk=true}
  setPlayhead(0,{seekListen:false});updateUi();
  try{
    const probe=await shareUrl(score,location.origin+location.pathname),token=(probe.split('#s=')[1]||''),round=await decodeShare(token);
    const pass=round.source.id===score.source.id&&visualSignature(round)===visualSignature(score);
    document.documentElement.dataset.replayShareRoundtrip=pass?'pass':'fail';
    document.documentElement.dataset.replayShareEncoding=token.startsWith('z.')?'gzip':'raw';
    document.documentElement.dataset.replayShareLength=String(probe.length);
    $('shareLen').textContent=probe.length+' chars · '+(token.startsWith('z.')?'compressed':'compact');
  }catch(e){document.documentElement.dataset.replayShareRoundtrip='fail';console.warn('REPLAY share selftest failed',e)}
  requestAnimationFrame(draw);
  window.FoldBloomReplay={
    boot:'ready',state:()=>normalizeScore(score),share:()=>shareUrl(score,location.origin+location.pathname),
    setPlayhead:p=>setPlayhead(p),syncListen:()=>{syncListen=!!listenApi();updateSyncButton();return syncListen}
  };
})();
