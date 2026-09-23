import {compileEventTape,toBeatSaberV4Draft} from '../beat/event-tape.js';

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const canvas=$('#field'),ctx=canvas.getContext('2d');
const TAU=Math.PI*2;
let W=1,H=1,DPR=1,mode='RIDE',profile='CLEAR',panelHidden=false,last=performance.now(),mx=.5,my=.5;

const PROFILES={
  CLEAR:{motion:1,trail:.16,gain:.55,bleed:.7},
  DRIVE:{motion:1.35,trail:.10,gain:.78,bleed:.8},
  TRANCE:{motion:.82,trail:.055,gain:.64,bleed:1.18},
  SOFT:{motion:.55,trail:.26,gain:.36,bleed:.48}
};
const MODES={
  RIDE:['EMBODY','audio → terrain → gesture → consequence','RIDE / LIVE','existing embodied engine'],
  PULSE:['ENTRAIN','ratio → pulse → tap → event tape','PULSE / POLYRHYTHM','play, tap, export events'],
  READ:['PACE','text → temporal address → race / regress','READ / RACE','ghost pace versus typed recall'],
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
  setAddress('field://lab/'+mode.toLowerCase());
  if(mode==='DATA'&&!data.nodes.length)loadData();
  if(mode==='LOCI'&&!loci.nodes.length)buildLoci();
}
$$('.mode').forEach(b=>b.onclick=()=>selectMode(b.dataset.mode));
$('#hidePanel').onclick=()=>{
  panelHidden=!panelHidden;$('#panelBody').hidden=panelHidden;$('#hidePanel').textContent=panelHidden?'+':'—';
};
$$('[data-profile]').forEach(b=>b.onclick=()=>{
  profile=b.dataset.profile;$$('[data-profile]').forEach(x=>x.classList.toggle('on',x.dataset.profile===profile));
  $('#profileRead').textContent=profile;document.documentElement.dataset.fieldLabProfile=profile;
});

$('#enterRide').onclick=()=>location.href='../live/?return='+encodeURIComponent('/fold-bloom/lab/');
$('#enterListen').onclick=()=>location.href='../listen/';
$('#dataLens').onclick=()=>location.href='../lens/';

/* ---------- PULSE ---------- */
const pulse={ratio:[3,2],bpm:96,timbre:'WOOD',playing:false,ac:null,timer:null,start:0,nextA:0,nextB:0,lastA:-1,lastB:-1,taps:[],flashA:0,flashB:0};
function parseRatio(v){return v.split(':').map(Number)}
$$('[data-ratio]').forEach(b=>b.onclick=()=>{
  pulse.ratio=parseRatio(b.dataset.ratio);$$('[data-ratio]').forEach(x=>x.classList.toggle('cool',x===b));
  $('#ratioRead').textContent=b.dataset.ratio;if(pulse.playing)restartPulse();
});
$$('[data-timbre]').forEach(b=>b.onclick=()=>{
  pulse.timbre=b.dataset.timbre;$$('[data-timbre]').forEach(x=>x.classList.toggle('cool',x===b));
});
$('#bpm').oninput=e=>{pulse.bpm=+e.target.value;$('#bpmRead').textContent=pulse.bpm;if(pulse.playing)restartPulse()};
function ensureAudio(){if(!pulse.ac)pulse.ac=new (window.AudioContext||window.webkitAudioContext)();return pulse.ac}
function pluck(at,voice){
  const ac=ensureAudio(),p=PROFILES[profile],g=ac.createGain(),f=ac.createBiquadFilter(),o=ac.createOscillator();
  const base=voice==='A'?196:294;
  let freq=base,type='triangle',decay=.085;
  if(pulse.timbre==='QIN'){freq=voice==='A'?196:247;type='sine';decay=.32;f.frequency.value=1500;f.Q.value=1.4}
  else if(pulse.timbre==='DRONE'){freq=voice==='A'?110:165;type='sine';decay=.48;f.frequency.value=900;f.Q.value=.7}
  else {freq=voice==='A'?520:760;type='triangle';decay=.07;f.frequency.value=1900;f.Q.value=2}
  o.type=type;o.frequency.setValueAtTime(freq,at);f.type='lowpass';
  g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime((voice==='A'?.14:.10)*p.gain,at+.006);g.gain.exponentialRampToValueAtTime(.0001,at+decay);
  o.connect(f).connect(g).connect(ac.destination);o.start(at);o.stop(at+decay+.03);
}
function restartPulse(){stopPulse();startPulse()}
function startPulse(){
  const ac=ensureAudio();ac.resume();
  pulse.playing=true;const bar=4*60/pulse.bpm;pulse.start=ac.currentTime+.06;pulse.nextA=pulse.start;pulse.nextB=pulse.start;
  pulse.timer=setInterval(()=>{
    if(!pulse.playing)return;const now=ac.currentTime,horizon=now+.12,bar=4*60/pulse.bpm,ia=bar/pulse.ratio[0],ib=bar/pulse.ratio[1];
    while(pulse.nextA<horizon){pluck(pulse.nextA,'A');pulse.nextA+=ia}
    while(pulse.nextB<horizon){pluck(pulse.nextB,'B');pulse.nextB+=ib}
  },24);
  $('#pulsePlay').textContent='STOP PULSE';setStatus('PULSE · '+pulse.ratio.join(':')+' · '+pulse.bpm+' BPM');
}
function stopPulse(){pulse.playing=false;if(pulse.timer)clearInterval(pulse.timer);pulse.timer=null;$('#pulsePlay').textContent='START PULSE'}
$('#pulsePlay').onclick=()=>pulse.playing?stopPulse():startPulse();
function tapPulse(){
  if(!pulse.playing)startPulse();
  const ac=ensureAudio(),t=ac.currentTime,bar=4*60/pulse.bpm,intervals=[bar/pulse.ratio[0],bar/pulse.ratio[1]];
  const errs=intervals.map(iv=>{const k=Math.round((t-pulse.start)/iv);return Math.abs(t-(pulse.start+k*iv))});
  const err=Math.min(...errs),score=Math.max(0,Math.round(100-err*500));
  pulse.taps.push({t:t-pulse.start,score});pulse.taps=pulse.taps.slice(-32);$('#syncRead').textContent=score+'%';
  pluck(t,'B');
}
$('#tap').onclick=tapPulse;
function syntheticMap(seconds=16){
  const beat=60/pulse.bpm,beats=[];for(let t=0;t<=seconds+1e-6;t+=beat)beats.push(+t.toFixed(6));
  const frames=Array.from({length:Math.ceil(seconds*20)},(_,i)=>({energy:.3+.3*Math.sin(i*.27)**2,flux:.2+.6*(i%10===0)}));
  return {duration:seconds,bpm:pulse.bpm,frameRate:20,beats,phrases:[{t:0},{t:seconds/2},{t:seconds}],sections:[{t:0},{t:seconds}],frames};
}
function downloadJSON(name,value){
  const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
$('#exportTape').onclick=()=>{
  const map=syntheticMap(16),ops=pulse.taps.map((x,i)=>({t:x.t,op:i%4===0?'BLOOM':'MARK',strength:x.score/100}));
  const tape=compileEventTape(map,{sourceId:'field://lab/pulse',operations:ops});
  const beatSaberV4=toBeatSaberV4Draft(tape,{laneSeed:pulse.ratio[0]*10+pulse.ratio[1]});
  downloadJSON('fold-bloom-event-tape.json',{eventTape:tape,beatSaberV4Draft:beatSaberV4});
  setStatus('PULSE · EVENT TAPE + BEAT SABER V4 DRAFT EXPORTED');
};

/* ---------- READ / RACE ---------- */
const read={tokens:[],you:0,ghost:0,started:false,paused:false,startAt:0,pauseAt:0,wpm:300};
function tokenize(text){
  try{return [...new Intl.Segmenter(undefined,{granularity:'word'}).segment(text)].filter(x=>x.isWordLike).map(x=>x.segment)}
  catch(_){return text.trim().split(/\s+/).filter(Boolean)}
}
function resetRead(){
  read.tokens=tokenize($('#readSource').value);read.you=0;read.ghost=0;read.started=false;read.paused=false;read.startAt=0;$('#raceInput').value='';syncReadUI()
}
function syncReadUI(){
  $('#youWord').textContent=read.you;$('#ghostWord').textContent=read.ghost;$('#raceDelta').textContent=read.you-read.ghost;
  const tok=read.tokens[read.you]||'';$('#raceInput').placeholder=tok?'type: '+tok:'complete';
}
$('#wpm').oninput=e=>{read.wpm=+e.target.value;$('#wpmRead').textContent=read.wpm+' WPM'};
$('#readStart').onclick=()=>{
  if(!read.tokens.length)resetRead();
  if(!read.started){read.started=true;read.paused=false;read.startAt=performance.now()-read.ghost*(60000/read.wpm);$('#readStart').textContent='RESTART'}
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
resetRead();

/* ---------- LOCI ---------- */
const loci={nodes:[],hidden:false,step:0,hits:0};
function buildLoci(){
  const words=tokenize($('#lociSource').value).slice(0,12);loci.nodes=words.map((text,i)=>({text,i}));
  loci.hidden=false;loci.step=0;loci.hits=0;syncLoci();
}
function syncLoci(){$('#lociStep').textContent=loci.step+'/'+loci.nodes.length;$('#lociHits').textContent=loci.hits}
$('#lociBuild').onclick=buildLoci;
$('#lociRecall').onclick=()=>{if(!loci.nodes.length)buildLoci();loci.hidden=!loci.hidden;loci.step=0;syncLoci()};
$('#lociReset').onclick=()=>{loci.hidden=false;loci.step=0;loci.hits=0;syncLoci()};
buildLoci();

/* ---------- INK ---------- */
const IW=180,IH=120,N=IW*IH;
const ink={p:new Float32Array(N),w:new Float32Array(N),tmpP:new Float32Array(N),tmpW:new Float32Array(N),wet:.62,brush:18,trace:true,lastX:null,lastY:null,down:false,simAt:0};
$('#wetness').oninput=e=>{ink.wet=+e.target.value/100;$('#wetRead').textContent=e.target.value};
$('#brush').oninput=e=>{ink.brush=+e.target.value;$('#brushRead').textContent=e.target.value};
$('#inkClear').onclick=()=>{ink.p.fill(0);ink.w.fill(0)};
$('#inkDry').onclick=()=>{for(let i=0;i<N;i++)ink.w[i]*=.08};
$('#inkTrace').onclick=()=>{ink.trace=!ink.trace;$('#inkTrace').classList.toggle('cool',ink.trace)};
function inkDeposit(px,py,speed=0){
  const gx=px/W*IW,gy=py/H*IH,rad=Math.max(1,ink.brush*(.55+ink.wet*.6)*(1-Math.min(.55,speed*.008))*IW/W);
  const minX=Math.max(0,Math.floor(gx-rad)),maxX=Math.min(IW-1,Math.ceil(gx+rad)),minY=Math.max(0,Math.floor(gy-rad)),maxY=Math.min(IH-1,Math.ceil(gy+rad));
  const heavy=.28+.65*(1-Math.min(1,speed*.02)),water=.25+ink.wet*.72;
  for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
    const d=Math.hypot(x-gx,y-gy)/rad;if(d>1)continue;const q=(1-d)*(1-d),i=x+y*IW;
    ink.p[i]=Math.min(1,ink.p[i]+q*heavy);ink.w[i]=Math.min(1,ink.w[i]+q*water);
  }
}
function stepInk(){
  const p=ink.p,w=ink.w,np=ink.tmpP,nw=ink.tmpW,bleed=PROFILES[profile].bleed;
  for(let y=0;y<IH;y++)for(let x=0;x<IW;x++){
    const i=x+y*IW,l=x?i-1:i,r=x<IW-1?i+1:i,u=y?i-IW:i,d=y<IH-1?i+IW:i;
    const wa=(w[l]+w[r]+w[u]+w[d])*.25,pa=(p[l]+p[r]+p[u]+p[d])*.25;
    const wet=Math.max(w[i],wa),diff=.035*bleed*wet;
    nw[i]=Math.max(0,Math.min(1,w[i]+(wa-w[i])*.13*bleed-.0055));
    np[i]=Math.max(0,Math.min(1,p[i]+(pa-p[i])*diff-.00008*(1-wet)));
  }
  ink.p=ink.tmpP;ink.tmpP=p;ink.w=ink.tmpW;ink.tmpW=w;
}

/* ---------- DATA ---------- */
const data={nodes:[],maxDepth:0,aperture:8,focus:-1};
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

/* ---------- POINTER / KEY ---------- */
canvas.addEventListener('pointerdown',e=>{
  const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;mx=x/W;my=y/H;
  if(mode==='PULSE')tapPulse();
  if(mode==='INK'){ink.down=true;ink.lastX=x;ink.lastY=y;inkDeposit(x,y,0);canvas.setPointerCapture?.(e.pointerId)}
  if(mode==='LOCI'){
    const pos=lociPositions(),hit=pos.reduce((best,p,i)=>{const d=Math.hypot(x-p.x,y-p.y);return d<(best?.d??32)?{i,d}:best},null);
    if(hit&&hit.i===loci.step){loci.step++;loci.hits++;if(loci.step>=loci.nodes.length){loci.hidden=false;setStatus('LOCI · ROUTE RECALLED')}syncLoci()}
  }
});
canvas.addEventListener('pointermove',e=>{
  const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;mx=x/W;my=y/H;
  if(mode==='INK'&&ink.down){const sp=ink.lastX==null?0:Math.hypot(x-ink.lastX,y-ink.lastY);inkDeposit(x,y,sp);ink.lastX=x;ink.lastY=y}
  if(mode==='DATA'){const pos=dataPositions(),hit=pos.reduce((best,p,i)=>{const d=Math.hypot(x-p.x,y-p.y);return d<(best?.d??24)?{i,d}:best},null);data.focus=hit?.i??-1;if(data.focus>=0)setAddress(data.nodes[data.focus].path)}
});
canvas.addEventListener('pointerup',()=>{ink.down=false;ink.lastX=ink.lastY=null});
canvas.addEventListener('pointercancel',()=>{ink.down=false;ink.lastX=ink.lastY=null});
canvas.addEventListener('wheel',e=>{if(mode!=='DATA')return;e.preventDefault();data.aperture=Math.max(0,Math.min(data.maxDepth,data.aperture+(e.deltaY>0?-1:1)));$('#dataDepth').textContent=data.aperture},{passive:false});
addEventListener('keydown',e=>{
  if((e.code==='Space'||e.key===' ')&&document.activeElement?.tagName!=='TEXTAREA'&&document.activeElement?.tagName!=='INPUT'){e.preventDefault();if(mode==='PULSE')tapPulse()}
  const map={1:'RIDE',2:'PULSE',3:'READ',4:'LOCI',5:'INK',6:'DATA'};if(map[e.key])selectMode(map[e.key]);
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
function drawPulse(t){
  clear(.16);cross();const cx=W/2,cy=H/2,p=PROFILES[profile],ac=pulse.ac,bar=4*60/pulse.bpm;
  const tt=pulse.playing&&ac?Math.max(0,ac.currentTime-pulse.start):t/1000;
  const a=pulse.ratio[0],b=pulse.ratio[1],phA=(tt%(bar/a))/(bar/a),phB=(tt%(bar/b))/(bar/b);
  const rr=Math.min(W,H)*.23;
  for(const [ph,col,rad] of [[phA,'123,213,255',rr],[phB,'239,120,73',rr*.72]]){
    ctx.strokeStyle='rgba('+col+',.55)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,cy,rad,0,TAU);ctx.stroke();
    const an=-Math.PI/2+ph*TAU;ctx.fillStyle='rgb('+col+')';ctx.beginPath();ctx.arc(cx+Math.cos(an)*rad,cy+Math.sin(an)*rad,5+4*p.motion,0,TAU);ctx.fill();
  }
  ctx.fillStyle='#d7b46d';ctx.font='700 12px ui-monospace';ctx.textAlign='center';ctx.fillText(a+':'+b,cx,cy+4);
}
function drawRead(){
  clear(.18);cross();const n=Math.max(1,read.tokens.length),cx=W/2,cy=H/2,ghost=read.tokens[read.ghost]||'—',prev=read.tokens[Math.max(0,read.ghost-1)]||'',next=read.tokens[Math.min(n-1,read.ghost+1)]||'';
  ctx.textAlign='center';ctx.font='900 '+Math.min(54,Math.max(28,W*.06))+'px ui-sans-serif';ctx.fillStyle='#f2f3ef';ctx.fillText(ghost,cx,cy+8);
  ctx.font='500 14px ui-monospace';ctx.fillStyle='#69767d';ctx.fillText(prev,cx-W*.22,cy);ctx.fillText(next,cx+W*.22,cy);
  const y1=cy+H*.17,y2=cy+H*.23,x0=W*.16,x1=W*.84;ctx.strokeStyle='#263139';ctx.beginPath();ctx.moveTo(x0,y1);ctx.lineTo(x1,y1);ctx.moveTo(x0,y2);ctx.lineTo(x1,y2);ctx.stroke();
  const gx=x0+(x1-x0)*(read.ghost/n),yx=x0+(x1-x0)*(read.you/n);ctx.fillStyle='#ef7849';ctx.beginPath();ctx.arc(gx,y1,6,0,TAU);ctx.fill();ctx.fillStyle='#7bd5ff';ctx.beginPath();ctx.arc(yx,y2,6,0,TAU);ctx.fill();
  ctx.font='8px ui-monospace';ctx.fillStyle='#69767d';ctx.fillText('GHOST',x0-28,y1+3);ctx.fillText('YOU',x0-28,y2+3);
}
function lociPositions(){
  const cx=W/2,cy=H/2,r=Math.min(W,H)*.28,n=Math.max(1,loci.nodes.length),out=[];
  for(let i=0;i<n;i++){const a=-Math.PI/2+i/n*TAU;const wobble=(i%2?.84:1.06);out.push({x:cx+Math.cos(a)*r*wobble,y:cy+Math.sin(a)*r*wobble})}
  return out;
}
function drawLoci(){
  clear(.2);const pos=lociPositions(),n=loci.nodes.length;ctx.strokeStyle='#2a3840';ctx.lineWidth=1.2;ctx.beginPath();pos.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
  pos.forEach((p,i)=>{const active=i===loci.step,done=i<loci.step;ctx.fillStyle=done?'#7bd5ff':active?'#ef7849':'#0a0f13';ctx.strokeStyle='#52616a';ctx.beginPath();ctx.arc(p.x,p.y,active?12:9,0,TAU);ctx.fill();ctx.stroke();if(!loci.hidden||done){ctx.fillStyle=done?'#9edcf6':'#cdd3d5';ctx.font='9px ui-monospace';ctx.textAlign='center';ctx.fillText(loci.nodes[i]?.text||'',p.x,p.y-15)}ctx.fillStyle='#69767d';ctx.font='7px ui-monospace';ctx.fillText('@'+i,p.x,p.y+22)});
}
function drawInk(t){
  if(t-ink.simAt>28){stepInk();ink.simAt=t}
  const off=document.createElement('canvas');off.width=IW;off.height=IH;const ox=off.getContext('2d'),im=ox.createImageData(IW,IH),d=im.data;
  for(let y=0;y<IH;y++)for(let x=0;x<IW;x++){const i=x+y*IW,k=i*4,grain=((x*17+y*31+x*y*3)%19)/19,pg=ink.p[i],water=ink.w[i];const paper=239-grain*10;d[k]=Math.max(10,paper-pg*218-water*7);d[k+1]=Math.max(12,paper-3-pg*214-water*5);d[k+2]=Math.max(16,paper-8-pg*202);d[k+3]=255}
  ox.putImageData(im,0,0);ctx.clearRect(0,0,W,H);ctx.imageSmoothingEnabled=true;ctx.drawImage(off,0,0,W,H);
  if(ink.trace){ctx.save();ctx.globalAlpha=.10;ctx.fillStyle='#36505b';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 '+Math.min(W,H)*.45+'px "Noto Serif CJK SC","Songti SC",serif';ctx.fillText('永',W/2,H/2);ctx.restore()}
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
  data.nodes.forEach((n,i)=>{if(n.depth>data.aperture||!pos[i])return;const f=i===data.focus;ctx.fillStyle=f?'#ef7849':n.depth===0?'#d7b46d':'#7bd5ff';ctx.globalAlpha=f?1:.65;ctx.beginPath();ctx.arc(pos[i].x,pos[i].y,f?7:3.5,0,TAU);ctx.fill();if(f){ctx.globalAlpha=1;ctx.fillStyle='#f2f3ef';ctx.font='9px ui-monospace';ctx.textAlign='center';ctx.fillText(n.path+' = '+String(n.value).slice(0,44),W/2,H*.14)}});ctx.globalAlpha=1;
}
function tick(now){
  const dt=Math.min(.05,(now-last)/1000);last=now;
  if(read.started&&!read.paused&&read.tokens.length){const dwell=60000/read.wpm;read.ghost=Math.min(read.tokens.length,Math.floor((now-read.startAt)/dwell));syncReadUI()}
  if(mode==='RIDE')drawRide(now);else if(mode==='PULSE')drawPulse(now);else if(mode==='READ')drawRead();else if(mode==='LOCI')drawLoci();else if(mode==='INK')drawInk(now);else if(mode==='DATA')drawData();
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
selectMode('RIDE');
document.documentElement.dataset.foldBloomFieldLab='ready';
window.FoldBloomFieldLab={mode:()=>mode,profile:()=>profile,eventTape:()=>compileEventTape(syntheticMap(16),{sourceId:'field://lab/pulse'})};
