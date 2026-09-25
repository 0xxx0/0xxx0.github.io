import {defaultScore,decodeScore,encodeScore,normalizeScore,packetBytes,retimeOperation,sampleScore,visualSignature} from './score.js';

const $=id=>document.getElementById(id);
const canvas=$('stage'),ctx=canvas.getContext('2d');
let score=defaultScore(),started=performance.now(),playing=true;
let dpr=1,w=0,h=0;

function fromHash(){
  const m=location.hash.match(/(?:^#|&)score=([^&]+)/);
  if(!m)return;
  try{score=decodeScore(decodeURIComponent(m[1]))}catch(e){console.warn('score decode failed',e)}
}
fromHash();

function resize(){
  dpr=Math.min(devicePixelRatio||1,2);w=canvas.clientWidth;h=canvas.clientHeight;
  canvas.width=Math.max(1,Math.round(w*dpr));canvas.height=Math.max(1,Math.round(h*dpr));
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
addEventListener('resize',resize,{passive:true});resize();

function updateUi(){
  $('message').value=score.message;
  $('source').textContent=score.source.id;
  $('bytes').textContent=packetBytes(score)+' B';
  $('signature').textContent=visualSignature(score);
  $('ops').innerHTML=score.operations.map(o=>'<span>'+o.type+' '+Math.round(o.at*100)+'%</span>').join('');
  document.documentElement.dataset.foldBloomMessageReplay='ready';
}
function currentMs(now=performance.now()){
  return playing?(now-started)%score.source.duration_ms:0;
}
function draw(now){
  const t=currentMs(now),s=sampleScore(score,t);
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle='#05070b';ctx.fillRect(0,0,w,h);
  const cx=w*.5,baseY=h*s.horizon,r=Math.max(34,Math.min(w,h)*.22*s.radius);
  ctx.strokeStyle='rgba(106,126,139,.28)';ctx.lineWidth=1;
  for(let i=1;i<7;i++){ctx.beginPath();ctx.arc(cx,baseY,r*i*.34,0,Math.PI*2);ctx.stroke()}
  const fork=s.fork*Math.min(w*.22,150);
  for(const sign of [-1,1]){
    ctx.beginPath();
    ctx.moveTo(cx,baseY+r*.12);
    ctx.bezierCurveTo(cx+sign*fork*.25,baseY-r*.22,cx+sign*fork,baseY-r*.9,cx+sign*fork*1.15,baseY-r*1.55);
    ctx.strokeStyle=sign<0?'rgba(123,213,255,'+(0.28+s.contrast*.55)+')':'rgba(239,120,73,'+(0.28+s.contrast*.55)+')';
    ctx.lineWidth=1.5+s.contrast*2;ctx.stroke();
  }
  ctx.beginPath();ctx.arc(cx,baseY,r,0,Math.PI*2);
  ctx.strokeStyle='rgba(242,243,239,'+(0.28+s.contrast*.62)+')';ctx.lineWidth=1+s.contrast*2;ctx.stroke();
  ctx.beginPath();ctx.moveTo(0,baseY);ctx.lineTo(w,baseY);ctx.strokeStyle='rgba(215,180,109,.26)';ctx.lineWidth=1;ctx.stroke();
  const pulse=s.weights.DROP+s.weights.BLOOM;
  if(pulse>.05){ctx.beginPath();ctx.arc(cx,baseY,r*(1.12+pulse*.5),0,Math.PI*2);ctx.strokeStyle='rgba(239,120,73,'+(pulse*.45)+')';ctx.stroke()}
  ctx.save();ctx.globalAlpha=s.messageOpacity;ctx.fillStyle='#f2f3ef';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='800 '+Math.max(18,Math.min(42,w*.06))+'px system-ui,sans-serif';ctx.fillText(score.message,cx,Math.max(40,baseY-r*1.9));ctx.restore();
  $('time').textContent=(t/1000).toFixed(2)+'s';
  $('phase').textContent=Object.entries(s.weights).sort((a,b)=>b[1]-a[1])[0][1]>.08?Object.entries(s.weights).sort((a,b)=>b[1]-a[1])[0][0]:'FIELD';
  requestAnimationFrame(draw);
}
$('replay').onclick=()=>{started=performance.now();playing=true;$('replay').textContent='REPLAYING'};
$('pause').onclick=()=>{playing=!playing;if(playing)started=performance.now();$('pause').textContent=playing?'PAUSE':'PLAY'};
$('mutate').onclick=()=>{score=retimeOperation(score,'BLOOM',.045);started=performance.now();updateUi()};
$('message').addEventListener('change',e=>{score=normalizeScore({...score,message:e.target.value});started=performance.now();updateUi()});
$('reset').onclick=()=>{score=defaultScore();started=performance.now();updateUi();history.replaceState(null,'',location.pathname)};
$('copy').onclick=async()=>{
  const url=location.origin+location.pathname+'#score='+encodeURIComponent(encodeScore(score));
  history.replaceState(null,'',url);
  try{await navigator.clipboard.writeText(url);$('copy').textContent='COPIED SCORE LINK'}catch{$('copy').textContent='LINK IN ADDRESS BAR'}
};
updateUi();requestAnimationFrame(draw);
window.FoldBloomMessageReplay={get score(){return normalizeScore(score)},replay:()=>{started=performance.now();playing=true}};
