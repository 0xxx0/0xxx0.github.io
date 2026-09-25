import {getLocalMedia} from '../local-media-store.js';
import {courseFromEventTape,classifySwing,collectMisses,updateClockEstimate,trackTimeForHostPerf,boundedHitTrace,buildReturn} from './saber-core.js';

const $=s=>document.querySelector(s), HANDOFF='fold-bloom.saber.handoff.v01';
const params=new URLSearchParams(location.search),controllerRole=String(params.get('controller')||'').toUpperCase();
const controllerMode=controllerRole==='LEFT'||controllerRole==='RIGHT';
const audio=$('#audio'),canvas=$('#course'),ctx=canvas?.getContext?.('2d');
let handoff=null,course=null,trace=[],resolved=new Set(),localHand='LEFT',remoteHand='RIGHT',motionOn=false,motionSeq=0,lastSwingAt=0,peer=null,channel=null,clock=null,pingTimer=0,objectUrl=null,lastFrame=performance.now();

function loadHandoff(){
  try{return JSON.parse(sessionStorage.getItem(HANDOFF)||'null')}catch(_){return null}
}
function fmt(t){t=Math.max(0,Number(t)||0);return Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0')}
function safeText(s){return String(s||'').replace(/[\u0000-\u001f]/g,' ').slice(0,4000)}
function encodeSignal(desc){return btoa(unescape(encodeURIComponent(JSON.stringify(desc)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function decodeSignal(code){const raw=String(code||'').trim().replace(/-/g,'+').replace(/_/g,'/');const pad=raw+'='.repeat((4-raw.length%4)%4);return JSON.parse(decodeURIComponent(escape(atob(pad))))}
function waitIce(pc,limit=3500){if(pc.iceGatheringState==='complete')return Promise.resolve();return new Promise(resolve=>{const end=setTimeout(resolve,limit);const f=()=>{if(pc.iceGatheringState==='complete'){clearTimeout(end);pc.removeEventListener('icegatheringstatechange',f);resolve()}};pc.addEventListener('icegatheringstatechange',f)})}
function rtc(){return new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]})}
function setFlash(outcome){const f=$('#flash');if(!f)return;f.style.background=outcome==='HIT'?'var(--gold)':outcome==='GRAZE'?'var(--left)':'var(--right)';f.classList.add('on');setTimeout(()=>f.classList.remove('on'),70)}
function vibrate(outcome){try{navigator.vibrate?.(outcome==='HIT'?[18,20,18]:outcome==='GRAZE'?12:5)}catch(_){}}
function roleSync(){remoteHand=localHand==='LEFT'?'RIGHT':'LEFT';$('#leftLocal')?.classList.toggle('primary',localHand==='LEFT');$('#rightLocal')?.classList.toggle('primary',localHand==='RIGHT');$('#remoteLink').textContent=location.origin+location.pathname+'?controller='+remoteHand}
function stats(){const c={HIT:0,GRAZE:0,MISS:0};for(const x of trace)if(c[x.outcome]!==undefined)c[x.outcome]++;$('#hit').textContent=c.HIT;$('#graze').textContent=c.GRAZE;$('#miss').textContent=c.MISS;$('#notes').textContent=course?.noteCount||0}
function addOutcome(x,notify=true){
  if(!x||resolved.has(x.noteId))return false;
  resolved.add(x.noteId);trace=boundedHitTrace(trace,x);stats();setFlash(x.outcome);if(notify)vibrate(x.outcome);
  return true;
}
function transportTimeAt(hostPerf){
  return trackTimeForHostPerf({audioTime:audio.currentTime,hostNow:performance.now(),sampleHostPerf:hostPerf,playing:!audio.paused});
}
function processSample(sample,hostPerf=performance.now(),reply=false){
  if(!course)return;
  const t=transportTimeAt(hostPerf),x=classifySwing(course,resolved,sample,t);
  if(!x)return;
  if(addOutcome(x,!reply)&&reply&&channel?.readyState==='open')channel.send(JSON.stringify({type:'RESULT',result:x}));
}
function motionSample(e,hand){
  const rr=e.rotationRate||{},a=e.acceleration||{};
  return {hand,seq:++motionSeq,clientTime:performance.now(),rotationRate:{alpha:Number(rr.alpha)||0,beta:Number(rr.beta)||0,gamma:Number(rr.gamma)||0},acceleration:{x:Number(a.x)||0,y:Number(a.y)||0,z:Number(a.z)||0}};
}
function motionHandler(e){
  const sample=motionSample(e,controllerMode?controllerRole:localHand);
  const mag=Math.hypot(sample.rotationRate.alpha,sample.rotationRate.beta,sample.rotationRate.gamma);
  if(mag<72||performance.now()-lastSwingAt<90)return;
  lastSwingAt=performance.now();
  if(controllerMode){if(channel?.readyState==='open')channel.send(JSON.stringify({type:'MOTION',sample}))}
  else processSample(sample,performance.now(),false);
}
async function enableMotion(remote=false){
  try{
    if(typeof DeviceMotionEvent!=='undefined'&&typeof DeviceMotionEvent.requestPermission==='function'){
      const p=await DeviceMotionEvent.requestPermission();if(p!=='granted')throw Error('permission denied');
    }
    addEventListener('devicemotion',motionHandler,{passive:true});motionOn=true;
    if(remote){$('#remoteMotionState').textContent=controllerRole+' MOTION ON';$('#remoteMotion').textContent='MOTION ON'}
    else{$('#motionState').textContent=localHand+' MOTION ON';$('#motion').textContent='MOTION ON'}
  }catch(e){const el=remote?$('#remoteMotionState'):$('#motionState');if(el)el.textContent='MOTION BLOCKED · '+safeText(e.message)}
}

function wireHostChannel(dc){
  channel=dc;channel.onopen=()=>{
    $('#pairState').textContent='REMOTE '+remoteHand+' ONLINE';
    clearInterval(pingTimer);pingTimer=setInterval(()=>{if(channel?.readyState==='open'){const hostSent=performance.now();channel.send(JSON.stringify({type:'PING',hostSent}))}},1200)
  };
  channel.onclose=()=>{$('#pairState').textContent='REMOTE OFFLINE';clearInterval(pingTimer)};
  channel.onmessage=e=>{
    let m;try{m=JSON.parse(e.data)}catch(_){return}
    if(m.type==='PONG'){const hostRecv=performance.now();clock=updateClockEstimate(clock,{hostSent:m.hostSent,hostRecv,clientNow:m.clientNow});$('#clockState').textContent='CLOCK '+clock.offsetMs.toFixed(0)+'ms · RTT '+clock.rttMs.toFixed(0)+'ms'}
    if(m.type==='MOTION'&&m.sample){const hostPerf=(Number(m.sample.clientTime)||0)+(clock?.offsetMs||0);processSample({...m.sample,hand:remoteHand},hostPerf,true)}
  };
}
async function createOffer(){
  try{
    peer?.close?.();peer=rtc();const dc=peer.createDataChannel('saber',{ordered:false,maxRetransmits:0});wireHostChannel(dc);
    await peer.setLocalDescription(await peer.createOffer());await waitIce(peer);
    $('#offerCode').value=encodeSignal(peer.localDescription);$('#pairState').textContent='OFFER READY · REMOTE '+remoteHand;
  }catch(e){$('#pairState').textContent='PAIR ERROR · '+safeText(e.message)}
}
async function applyAnswer(){
  try{if(!peer)throw Error('create offer first');await peer.setRemoteDescription(decodeSignal($('#answerCode').value));$('#pairState').textContent='ANSWER APPLIED · CONNECTING'}
  catch(e){$('#pairState').textContent='ANSWER ERROR · '+safeText(e.message)}
}
async function shareText(title,text){
  try{if(navigator.share){await navigator.share({title,text});return}await navigator.clipboard.writeText(text)}
  catch(_){try{await navigator.clipboard.writeText(text)}catch(_){}}
}
async function controllerAccept(){
  try{
    peer?.close?.();peer=rtc();peer.ondatachannel=e=>{
      channel=e.channel;channel.onopen=()=>{$('#controllerState').textContent='PAIRED · '+controllerRole;$('#remoteMotion').disabled=false};
      channel.onclose=()=>{$('#controllerState').textContent='DISCONNECTED'};
      channel.onmessage=ev=>{let m;try{m=JSON.parse(ev.data)}catch(_){return}
        if(m.type==='PING'&&channel.readyState==='open')channel.send(JSON.stringify({type:'PONG',hostSent:m.hostSent,clientNow:performance.now()}));
        if(m.type==='RESULT'){setFlash(m.result?.outcome||'GRAZE');vibrate(m.result?.outcome||'GRAZE');$('#controllerState').textContent=(m.result?.outcome||'SWING')+' · '+fmt(m.result?.sourceTime)}
      };
    };
    await peer.setRemoteDescription(decodeSignal($('#remoteOffer').value));await peer.setLocalDescription(await peer.createAnswer());await waitIce(peer);
    $('#remoteAnswer').value=encodeSignal(peer.localDescription);$('#controllerState').textContent='ANSWER READY · SEND TO HOST';
  }catch(e){$('#controllerState').textContent='PAIR ERROR · '+safeText(e.message)}
}

async function hydrateSource(){
  handoff=loadHandoff();
  if(!handoff?.eventTape){$('#courseMeta').textContent='No event tape. Open LISTEN, map a track, then USE TRACK → SABER · TWO PHONES.';return}
  course=courseFromEventTape(handoff.eventTape);$('#source').textContent=(handoff.sourceName||handoff.sourceId||'SOURCE')+' · '+course.noteCount+' NOTES';$('#courseMeta').textContent='EVENT TAPE '+course.eventTapeSchema+' · '+(handoff.annotations?.marks?.length||0)+' MARKS CARRIED';stats();
  const id=handoff.sourceId;
  if(id){
    const record=await getLocalMedia(id).catch(()=>null);
    if(record?.blob){objectUrl=URL.createObjectURL(record.blob);audio.src=objectUrl;$('#play').disabled=false;$('#returnBtn').disabled=false;return}
  }
  if(/^https?:/i.test(String(handoff.sourceAddress||''))){audio.src=handoff.sourceAddress;$('#play').disabled=false;$('#returnBtn').disabled=false;return}
  $('#courseMeta').textContent+=' · SOURCE BYTES NOT PRESENT ON THIS DEVICE';$('#returnBtn').disabled=false;
}

function draw(){
  if(!ctx||controllerMode){requestAnimationFrame(draw);return}
  const dpr=Math.min(devicePixelRatio||1,2),w=canvas.clientWidth,h=canvas.clientHeight;
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)}
  ctx.clearRect(0,0,w,h);ctx.fillStyle='#05070b';ctx.fillRect(0,0,w,h);
  const mid=w/2,hitY=h*.83;ctx.strokeStyle='#273139';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(mid,0);ctx.lineTo(mid,h);ctx.moveTo(0,hitY);ctx.lineTo(w,hitY);ctx.stroke();
  const t=audio.currentTime||0,look=3.2;
  if(course){
    for(const note of course.notes){
      if(resolved.has(note.id))continue;
      const dt=note.t-t;if(dt<-.5||dt>look)continue;
      const p=1-clamp(dt/look,0,1),y=40+p*(hitY-70),half=note.hand==='LEFT',x=(half?w*.27:w*.73)+((note.lane%2)-.5)*w*.12;
      const size=12+20*p;ctx.save();ctx.translate(x,y);ctx.rotate(({UP:0,RIGHT:Math.PI/2,DOWN:Math.PI,LEFT:-Math.PI/2}[note.direction]||0));ctx.strokeStyle=half?'#7bd5ff':'#ef7849';ctx.lineWidth=2;ctx.strokeRect(-size,-size,size*2,size*2);ctx.beginPath();ctx.moveTo(0,size*.55);ctx.lineTo(0,-size*.55);ctx.moveTo(0,-size*.55);ctx.lineTo(-size*.24,-size*.28);ctx.moveTo(0,-size*.55);ctx.lineTo(size*.24,-size*.28);ctx.stroke();ctx.restore();
    }
  }
  $('#now').textContent=fmt(t);const next=course?.notes.find(x=>!resolved.has(x.id)&&x.t>=t-.1);$('#call').textContent=next?(next.hand+' · '+next.direction):course?'RETURN':'OPEN LISTEN';
  for(const miss of collectMisses(course,resolved,t))addOutcome(miss,false);
  requestAnimationFrame(draw);
}

function exportReturn(){
  if(!course)return;const packet=buildReturn({course,trace,roles:{local:localHand,remote:remoteHand}}),a=document.createElement('a'),blob=new Blob([JSON.stringify(packet,null,2)],{type:'application/json'});a.href=URL.createObjectURL(blob);a.download='fold-bloom-saber-return-'+Date.now()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)
}

function bootController(){
  document.querySelectorAll('.host').forEach(x=>x.classList.add('off'));$('#controller').classList.add('on');$('#handMark').textContent=controllerRole;$('#handMark').className='handMark '+controllerRole;$('#remoteLink')?.remove?.();
  $('#acceptOffer').onclick=()=>void controllerAccept();$('#shareAnswer').onclick=()=>void shareText('FOLD BLOOM SABER answer',$('#remoteAnswer').value);$('#remoteMotion').onclick=()=>void enableMotion(true);
}
function bootHost(){
  roleSync();void hydrateSource();$('#leftLocal').onclick=()=>{localHand='LEFT';roleSync()};$('#rightLocal').onclick=()=>{localHand='RIGHT';roleSync()};$('#motion').onclick=()=>void enableMotion(false);
  $('#offer').onclick=()=>void createOffer();$('#applyAnswer').onclick=()=>void applyAnswer();$('#shareOffer').onclick=()=>void shareText('FOLD BLOOM SABER offer',(location.origin+location.pathname+'?controller='+remoteHand)+'\n\n'+$('#offerCode').value);
  $('#play').onclick=async()=>{if(!audio.src)return;if(audio.paused){await audio.play().catch(()=>{});$('#play').textContent=audio.paused?'PLAY':'PAUSE'}else{audio.pause();$('#play').textContent='PLAY'}};
  $('#reset').onclick=()=>{audio.pause();audio.currentTime=0;trace=[];resolved.clear();stats();$('#play').textContent='PLAY'};
  $('#returnBtn').onclick=exportReturn;
}
addEventListener('pagehide',()=>{try{peer?.close?.();if(objectUrl)URL.revokeObjectURL(objectUrl);clearInterval(pingTimer)}catch(_){}});
if(controllerMode)bootController();else bootHost();
document.documentElement.dataset.foldBloomSaber='ready';document.documentElement.dataset.saberRole=controllerMode?controllerRole:'HOST';
window.FoldBloomSaber={boot:'ready',role:controllerMode?controllerRole:'HOST',state:()=>({handoff,course,localHand,remoteHand,trace:[...trace],resolved:[...resolved],clock:clock?{...clock}:null,paired:channel?.readyState==='open',motionOn}),courseFromEventTape};
requestAnimationFrame(draw);
