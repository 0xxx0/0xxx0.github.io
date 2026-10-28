/* THE BELL / SLEEPER — an original, playable causal model.
Source inspiration: Payutto, Buddhadhamma, Chapter 4, Dependent Origination.
Does not reproduce book text or claim that a playthrough proves doctrine. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else{root.SleeperBell=api;if(root.document)root.addEventListener('DOMContentLoaded',api.mount)}})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const TAU=2*Math.PI,clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const SOURCE='https://buddhadhamma.github.io/dependent-origination.html';
const grid=Array.from({length:17},()=>Array(25).fill(1));
for(let x=1;x<=21;x++)grid[8][x]=0;
for(let x=9;x<=21;x++)grid[3][x]=0;
for(let y=3;y<=8;y++){grid[y][9]=0;grid[y][21]=0}
for(let y=8;y<=13;y++)grid[y][18]=0;
for(let x=18;x<=23;x++)grid[13][x]=0;
function create(){return{x:2.5,y:8.5,a:0,heard:false,choice:null,opened:false,loops:0,won:false,seconds:0,steps:0,history:[],ghost:[],stamp:0,note:'Approach the bell. There is no question to answer yet.'}}
function snapshot(s){return{x:s.x,y:s.y,a:s.a,heard:s.heard,choice:s.choice,opened:s.opened,loops:s.loops,won:s.won,seconds:s.seconds,steps:s.steps,note:s.note}}
function record(s){
 const p=snapshot(s),q=s.history.at(-1);
 if(q&&Math.hypot(p.x-q.x,p.y-q.y)<.045&&Math.abs(Math.atan2(Math.sin(p.a-q.a),Math.cos(p.a-q.a)))<.06&&p.heard===q.heard&&p.choice===q.choice&&p.opened===q.opened&&p.loops===q.loops&&p.won===q.won)return false;
 s.history.push(p);
 if(s.history.length>700){
  const keep=new Set([0,s.history.findIndex(x=>x.heard),s.history.findIndex(canChoose),s.history.findIndex(x=>x.loops>0),s.history.findIndex(x=>x.opened),s.history.findIndex(x=>x.won)]);
  const drop=s.history.findIndex((_,i)=>i>0&&!keep.has(i));
  if(drop>0)s.history.splice(drop,1);
 }
 return true;
}
function openCell(s,x,y){const X=Math.floor(x),Y=Math.floor(y);return X>=0&&Y>=0&&X<25&&Y<17&&grid[Y][X]===0&&!(X===18&&Y===10&&!s.opened)}
function canChoose(s){return s.heard&&!s.choice&&s.x>13.3&&s.x<15.4&&Math.abs(s.y-8.5)<.85&&!s.won}
function choose(s,v){if(!s.heard||s.won)throw Error('HEAR_FIRST');if(v==='follow'&&canChoose(s)){s.choice='follow';s.note='Follow the upper road. Its far end returns to the bell.'}else if(v==='notice'&&(canChoose(s)||(s.choice==='follow'&&s.loops>0))){s.choice='notice';s.opened=true;s.note='The sound persists. The lower gate is now permeable.'}else throw Error('DECISION_NOT_AVAILABLE');record(s);return s}
function step(s,f,turn,dt){if(s.won)return s;dt=clamp(Number(dt)||0,0,.05);s.seconds+=dt;s.a=(s.a+TAU+turn*dt*2.6)%TAU;
const distance=clamp(f,-1,1)*dt*3.1,dx=Math.cos(s.a)*distance,dy=Math.sin(s.a)*distance,r=.17;
const free=(x,y)=>[[x-r,y-r],[x+r,y-r],[x-r,y+r],[x+r,y+r]].every(p=>openCell(s,p[0],p[1]));
if(distance){if(free(s.x+dx,s.y)){s.x+=dx;s.steps+=Math.abs(dx)}if(free(s.x,s.y+dy)){s.y+=dy;s.steps+=Math.abs(dy)}}
if(!s.heard&&Math.hypot(s.x-9.5,s.y-8.5)<1.05){s.heard=true;s.note='Contact → pleasant feeling. Keep walking to the crossroads.';record(s)}
if(canChoose(s))s.note='Wanting is not a command. Continue forward to follow its pull, or press the AXIS core to separate the event from the route.';
// Crossing the fork enacts the habitual loop as movement; no answer button is required.
if(s.choice===null&&s.heard&&s.x>15.5&&Math.abs(s.y-8.5)<.7){s.choice='follow';s.note='The pull now folds the upper corridor back to the bell. Reach the fold, then press the AXIS core to change the route.';record(s)}
if(s.choice==='follow'&&!s.opened&&s.x<10.4&&s.y<4.3){s.x=9.5;s.y=8.5;s.a=0;s.loops++;s.note='The road folded back to its cause. You can now cut the pull.';record(s)}
if(s.opened&&s.x>22.3&&Math.abs(s.y-13.5)<.9){s.won=true;s.note='A new passage was traversed; the bell has not changed.';record(s)}
if(s.seconds-s.stamp>.14&&record(s))s.stamp=s.seconds;return s}
function rewind(s,i){if(s.history.length<2)return s;const n=clamp(Math.round(i),0,s.history.length-1),p=s.history[n];s.ghost=s.history.slice(n).map(q=>[q.x,q.y]);Object.assign(s,p);s.history=s.history.slice(0,n+1);s.stamp=s.seconds;s.note='Previous future retained as a ghost. A different continuation is possible.';return s}
function ray(s,a){const dx=Math.cos(a),dy=Math.sin(a),dX=Math.abs(1/(Math.abs(dx)<.00001?.00001:dx)),dY=Math.abs(1/(Math.abs(dy)<.00001?.00001:dy));let mx=Math.floor(s.x),my=Math.floor(s.y),sx=(dx<0?s.x-mx:mx+1-s.x)*dX,sy=(dy<0?s.y-my:my+1-s.y)*dY,side=0;
for(let i=0;i<65;i++){if(sx<sy){sx+=dX;mx+=dx<0?-1:1;side=0}else{sy+=dY;my+=dy<0?-1:1;side=1}if(!openCell(s,mx+.5,my+.5))return{d:clamp(side===0?sx-dX:sy-dY,.06,40),side,gate:mx===18&&my===10&&!s.opened}}return{d:40,side:0,gate:false}}

function ghostProjection(s,width,height){
 if(!s.ghost?.length||!(width>0&&height>0))return [];
 const out=[],c=Math.cos(s.a),d=Math.sin(s.a),view=Math.tan(.5);
 const stride=Math.max(1,Math.ceil(s.ghost.length/75));
 for(let i=0;i<s.ghost.length;i+=stride){
  const p=s.ghost[i],dx=p[0]-s.x,dy=p[1]-s.y;
  const forward=dx*c+dy*d,lateral=dy*c-dx*d,range=Math.hypot(dx,dy);
  if(forward<.32||Math.abs(lateral/forward)>view*.95||range>16)continue;
  if(ray(s,Math.atan2(dy,dx)).d+.18<range)continue;
  out.push({x:width*(.5+.5*lateral/(forward*view)),y:height*(.51+.26/Math.max(.6,forward)),radius:clamp(height*.055/Math.max(.6,forward),2,16),range,phase:i/Math.max(1,s.ghost.length-1)});
 }
 return out;
}
function exportState(s){return{schema:'sleeper.bell-conditions/v0.1',source:{url:SOURCE,passage:'Chapter 4 / Dependent Origination',bytesRedistributed:false},authority:'ORIGINAL_INTERACTIVE_MODEL_NOT_DOCTRINAL_PROOF',actions:{heard:s.heard,choice:s.choice,opened:s.opened,loops:s.loops,won:s.won},trajectory:s.history.map(p=>[+p.x.toFixed(2),+p.y.toFixed(2),p.choice,p.opened]),note:'One rule of this illustrative space changes while its stimulus remains.'}}
// Physical dial hit bands are source-of-truth, not a decorative label.
// 40 / 90 * 107px = 47.6px mobile action diameter.
function ringZone(radius){return radius>62?'TURN':radius>40?'REWIND':'CORE'}
function bindDrive(btn,held,key,unlock){
 btn.style.touchAction='none';
 btn.addEventListener('pointerdown',e=>{e.preventDefault();if(e.button!==0)return;unlock();try{btn.setPointerCapture(e.pointerId)}catch(_){}held.add(key)});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])btn.addEventListener(event,()=>held.delete(key));
 return()=>held.delete(key);
}
function mount(){
const anchor=document.querySelector('#enter');if(!anchor||document.querySelector('#bellEntry'))return;
const entry=document.createElement('button');entry.id='bellEntry';entry.className='primary';entry.textContent='ENTER THE BELL / POV';anchor.parentNode.insertBefore(entry,anchor);
const css=document.createElement('style');
css.textContent=[
'#bellExperience{position:fixed;inset:0;z-index:99999;display:none;flex-direction:column;color:#ecf1ed;background:#051018;font:12px/1.5 ui-monospace,Menlo,monospace}#bellExperience.active{display:flex}',
'#bellExperience *{box-sizing:border-box}#bellExperience button{border-radius:0;border:1px solid #435c64;color:#e1ede9;background:#10232b;padding:8px 11px;cursor:pointer;min-height:42px;font:inherit}#bellExperience button.gold{background:#f0c47e;color:#09141b;border-color:#f0c47e;font-weight:800}',
'#bellExperience header{background:#061118;border-bottom:1px solid #27414b;padding:8px;display:flex;gap:10px;align-items:center;justify-content:space-between}#bellExperience header b{color:#f0c47e;font-size:13px}#bellExperience .row{display:flex;gap:6px}',
'#bellStage{position:relative;min-height:0;flex:1}#bellScene{width:100%;height:100%;display:block;touch-action:none}#bellText{position:absolute;left:14px;top:16px;pointer-events:none;max-width:min(500px,85vw);text-shadow:0 2px 12px #000}#bellHeading{font:bold clamp(18px,3vw,30px)/1.2 system-ui,sans-serif;max-width:24ch}#bellNote{border-left:2px solid #f0c47e;background:#051018d9;padding:9px;margin-top:12px;max-width:43ch;color:#bfcfd0;font-size:11px}#bellPhase{letter-spacing:.12em;color:#ecc783;font-size:10px;margin-bottom:8px}',
'#bellAction{position:absolute;left:50%;transform:translateX(-50%);bottom:172px;background:#091a23f2;border:1px solid #e2b876;padding:12px;display:none;width:min(550px,calc(100% - 18px));box-shadow:0 0 30px #0008}#bellAction.active{display:block;pointer-events:none}#bellAction p{margin:0;color:#c3d4d2;letter-spacing:.04em}',
'#bellControls{position:absolute;bottom:0;left:0;right:0;display:flex;align-items:end;justify-content:space-between;gap:8px;padding:9px 12px 14px;background:linear-gradient(transparent,#071119ef 18%)}#bellPad{display:flex;gap:5px}#bellPad button{min-width:54px;min-height:58px;font-size:20px}#bellRing{width:140px;height:140px;touch-action:none;cursor:crosshair}#bellDialArea{text-align:center;color:#a3b7be;font-size:9px;letter-spacing:.04em}',
'#bellCover{position:absolute;inset:0;background:#061018d9;display:grid;place-items:center;padding:14px}#bellCover[hidden]{display:none!important}#bellCard{max-width:590px;background:#0e1d25;border-top:3px solid #f0c47e;padding:clamp(22px,4vw,42px)}#bellCard h1{font:750 clamp(33px,6vw,54px)/1 system-ui,sans-serif;letter-spacing:-.065em;margin:5px 0 20px}#bellCard p{font:15px/1.7 system-ui,sans-serif;color:#cad8d5}#bellCard .row{flex-wrap:wrap;margin-top:15px}#bellCard small{display:block;margin-top:15px;color:#9db0ba}',
'@media(max-width:660px){#bellPad button{min-width:43px;min-height:52px;padding:5px}#bellRing{width:107px;height:107px}#bellControls{padding:6px 6px max(10px,env(safe-area-inset-bottom))}#bellAction{bottom:143px}#bellText{max-width:75vw}#bellExperience header span{display:none}#bellCard p{font-size:14px}}'
].join('');document.head.append(css);
const root=document.createElement('section');root.id='bellExperience';root.setAttribute('role','dialog');root.setAttribute('aria-label','The Bell: first person encounter');
root.innerHTML=[
'<header><b>THE BELL <span> / A WORLD OF CONDITIONS</span></b><div class="row"><button id="bellLens">APERTURE / POV</button><button id="bellQuit">EXIT</button></div></header>',
'<div id="bellStage"><canvas id="bellScene" tabindex="0" aria-label="First person scene. W/S walk, A/D turn."></canvas>',
'<div id="bellText"><div id="bellPhase">01 / CONTACT</div><div id="bellHeading">A sound is ahead.</div><div id="bellNote"></div></div>',
'<div id="bellAction"><p id="bellQuestion">CONTINUE → THE UPPER ROAD FOLDS. PRESS THE AXIS CORE TO CUT THE PULL.</p></div>',
'<div id="bellControls"><div id="bellPad"><button data-drive="left" aria-label="Turn left">↶</button><button data-drive="forward" aria-label="Forward">↑</button><button data-drive="back" aria-label="Backward">↓</button><button data-drive="right" aria-label="Turn right">↷</button></div><div id="bellDialArea"><canvas id="bellRing" width="180" height="180" aria-label="Outer ring turns, inner ring rewinds, center cuts the pull when available. The APERTURE button changes view."></canvas><div>TURN · REWIND · CORE CUT</div></div></div>',
'<div id="bellCover"><div id="bellCard"><div style="color:#f0c47e;letter-spacing:.16em">CHAPTER 4 / CONDITIONALITY / ORIGINAL ILLUSTRATION</div><h1 id="bellCardTitle">THE BELL</h1><p id="bellCardText">You hear a bell. Its sound is pleasant. You recognize it and want to hear it again.<br><br>Walk into this situation. A decision at the crossroads will change the reachable world. The bell itself will not change.</p><div class="row"><button class="gold" id="bellBegin">ENTER WORLD →</button><button id="bellBook">READ ORIGINAL CHAPTER ↗</button><button id="bellBefore" hidden>REWIND TO FORK</button><button id="bellSave" hidden>EXPORT TRACE</button></div><small>W/S walk · A/D turn · touch arrows · OUTER DIAL turns · INNER DIAL rewinds actual state · CORE cuts the pull at the fork · SPACE also cuts · APERTURE changes view.</small></div></div>',
'</div>'
].join('');
document.body.append(root);
const $=id=>root.querySelector('#'+id),cv=$('bellScene'),cx=cv.getContext('2d'),dial=$('bellRing'),dc=dial.getContext('2d');
let s=create(),view='POV',pressed=new Set(),frameId=0,last=0,audio=null,dialAct=null,finished=false;
function unlockSound(){try{if(!audio)audio=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')void audio.resume().catch(()=>{})}catch(e){}}
function bellSound(){try{unlockSound();if(!audio)return;const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=440;g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+1.2);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+1.21)}catch(e){}}
function resize(){const box=cv.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);cv.width=Math.round(box.width*d);cv.height=Math.round(box.height*d);cx.setTransform(d,0,0,d,0,0)}
function showWin(){if(finished)return;finished=true;$('bellCover').hidden=false;$('bellCardTitle').textContent='THE SOUND DID NOT CHANGE';$('bellCardText').textContent='The lower passage was reachable only after one transition changed. The bell remained. Replay from the origin to try the other future; the dial rewinds the living world before completion.';$('bellBegin').textContent='REPLAY FROM ORIGIN';$('bellBefore').hidden=false;$('bellSave').hidden=false}
function ui(){let state=!s.heard?'01 / CONTACT':!s.choice?'02 / FEELING':!s.opened?'03 / GRASP':'04 / RELEASE';
$('bellPhase').textContent=state;$('bellHeading').textContent=!s.heard?'A sound is ahead.':!s.choice?'Pleasure becomes a wish.':!s.opened?'The road returns to the bell.':s.won?'The bell remains.':'A different road is open.';
$('bellNote').textContent=s.note;
const act=canChoose(s)||(s.choice==='follow'&&!s.opened&&s.loops>0);
$('bellAction').classList.toggle('active',act);
$('bellQuestion').textContent=s.choice==='follow'?'YOU CROSSED THE FOLD. TOUCH THE RING CORE OR PRESS SPACE TO CHANGE THE LAW.':'CONTINUE EAST TO FOLLOW THE PULL, OR TOUCH THE RING CORE TO CUT IT.';
if(s.won)showWin();
}
function paint(){
const w=cv.clientWidth,h=cv.clientHeight;if(w<1||h<1)return;
cx.fillStyle='#0d1c25';cx.fillRect(0,0,w,h);
if(view==='POV'){
let sky=cx.createLinearGradient(0,0,0,h*.5);sky.addColorStop(0,'#07131e');sky.addColorStop(1,'#183543');cx.fillStyle=sky;cx.fillRect(0,0,w,h*.5);
let ground=cx.createLinearGradient(0,h*.5,0,h);ground.addColorStop(0,'#263a3f');ground.addColorStop(1,'#030709');cx.fillStyle=ground;cx.fillRect(0,h*.5,w,h*.5);
const N=Math.min(280,Math.max(90,Math.floor(w/3))),bw=w/N,FOV=1.0;
for(let i=0;i<N;i++){const a=s.a+Math.atan((2*(i+.5)/N-1)*Math.tan(FOV/2)),r=ray(s,a),d=r.d*Math.cos(a-s.a),ht=Math.min(h*2,h/(d*.8)),top=(h-ht)/2;const light=clamp(1/(1+d*.11),.11,1),color=r.gate?[160,72,51]:r.side?[65,116,126]:[93,155,163];cx.fillStyle='rgb('+color.map(n=>Math.round(n*light)).join(',')+')';cx.fillRect(i*bw,top,bw+1,ht)}
// Counterfactual traces are visible but never become a player or a gate.
for(const g of ghostProjection(s,w,h)){
 cx.strokeStyle='rgba(128,222,207,'+(1-g.phase*.42).toFixed(3)+')';cx.lineWidth=1.7;
 cx.beginPath();cx.ellipse(g.x,g.y,g.radius,g.radius*.3,0,0,TAU);cx.stroke();
 cx.beginPath();cx.moveTo(g.x,g.y-2*g.radius);cx.lineTo(g.x,g.y-g.radius*.5);cx.stroke();
}
let goal=!s.heard?{x:9.5,y:8.5,label:'◉ THE BELL'}:!s.opened?{x:21.5,y:3.5,label:'↶ THE UPPER LOOP'}:{x:23.5,y:13.5,label:'↳ EXIT'};
const da=Math.atan2(goal.y-s.y,goal.x-s.x)-s.a,offset=Math.atan2(Math.sin(da),Math.cos(da)),dist=Math.hypot(goal.x-s.x,goal.y-s.y);
if(Math.abs(offset)<.7&&dist>1){cx.fillStyle='#f0c47e';cx.textAlign='center';cx.font='bold '+clamp(22+60/dist,22,50)+'px monospace';cx.fillText(goal.label,w*(.5+Math.tan(offset)*.7),h*.37)}
cx.strokeStyle=s.choice==='follow'&&!s.opened?'#e78e7b':'#9fced4';cx.beginPath();cx.moveTo(w/2-12,h/2);cx.lineTo(w/2+12,h/2);cx.moveTo(w/2,h/2-12);cx.lineTo(w/2,h/2+12);cx.stroke();
if(s.choice==='follow'&&!s.opened){cx.strokeStyle='#cf745559';for(let j=0;j<4;j++){cx.beginPath();cx.arc(w/2,h/2,90+j*57,s.seconds*.35,s.seconds*.35+Math.PI*.86);cx.stroke()}}
}else{
const unit=Math.min(w/26,h/19),ox=(w-25*unit)/2,oy=(h-17*unit)/2;
for(let y=0;y<17;y++)for(let x=0;x<25;x++){const block=!openCell(s,x+.5,y+.5);cx.fillStyle=block?(x===18&&y===10&&!s.opened?'#c66e55':'#29414a'):'#102630';cx.fillRect(ox+x*unit+.4,oy+y*unit+.4,unit-.8,unit-.8)}
if(s.ghost.length){cx.strokeStyle='#8db3be88';cx.setLineDash([3,4]);cx.beginPath();s.ghost.forEach((p,i)=>i?cx.lineTo(ox+p[0]*unit,oy+p[1]*unit):cx.moveTo(ox+p[0]*unit,oy+p[1]*unit));cx.stroke();cx.setLineDash([])}
cx.strokeStyle='#d8ae75';cx.lineWidth=1.4;cx.beginPath();s.history.forEach((p,i)=>i?cx.lineTo(ox+p.x*unit,oy+p.y*unit):cx.moveTo(ox+p.x*unit,oy+p.y*unit));cx.stroke();
cx.fillStyle='#f0c47e';cx.beginPath();cx.arc(ox+s.x*unit,oy+s.y*unit,Math.max(3,unit*.28),0,TAU);cx.fill();
cx.strokeStyle='#f0c47e';cx.beginPath();cx.moveTo(ox+s.x*unit,oy+s.y*unit);cx.lineTo(ox+(s.x+Math.cos(s.a))*unit,oy+(s.y+Math.sin(s.a))*unit);cx.stroke();
cx.font='11px monospace';cx.textAlign='center';cx.fillStyle='#ddcaac';for(const [t,x,y] of [['BELL',9.5,8.5],['FORK',14,8.5],['EXIT',23,13.5]])cx.fillText(t,ox+x*unit,oy+(y-.65)*unit);
if(view==='CAUSE'){cx.fillStyle='#07151bdd';cx.fillRect(0,0,w,66);cx.textAlign='center';cx.fillStyle='#efc585';cx.font='bold 12px monospace';cx.fillText('CONTACT → FEELING → WANTING → CHOICE → CONSEQUENCE',w/2,35)}
}
}
let dialPreview=null;
function ringPaint(){
dc.clearRect(0,0,180,180);dc.save();dc.translate(90,90);
const arc=(r,col,width,start,end)=>{dc.beginPath();dc.strokeStyle=col;dc.lineWidth=width;dc.arc(0,0,r,start,end);dc.stroke()};
arc(75,'#374b54',12,0,TAU);arc(49,'#36515a',12,0,TAU);
arc(75,'#e9b978',5,-Math.PI/2,s.a-Math.PI/2);
dc.fillStyle='#e9b978';dc.beginPath();dc.arc(75*Math.cos(s.a-Math.PI/2),75*Math.sin(s.a-Math.PI/2),5,0,TAU);dc.fill();
const n=s.history.length;
if(n>1){
 const stage=p=>!p.heard?0:!p.choice?1:!p.opened?2:!p.won?3:4;
 const colors=['#627b86','#84c2cc','#d6ad73','#91b995','#e6e9df'];
 const count=Math.min(180,n-1);
 for(let k=0;k<count;k++){
  const idx=Math.floor(k*(n-1)/count),phase=stage(s.history[idx]);
  arc(49,colors[phase],5,-Math.PI/2+(k/count)*TAU,-Math.PI/2+((k+.94)/count)*TAU);
 }
 const selected=dialPreview==null?n-1:dialPreview,ang=-Math.PI/2+selected/(n-1)*TAU;
 dc.fillStyle=dialPreview==null?'#eff6f2':'#f0c47e';dc.beginPath();dc.arc(49*Math.cos(ang),49*Math.sin(ang),5.4,0,TAU);dc.fill();
}
dc.fillStyle='#e7d3ad';dc.font='bold 13px monospace';dc.textAlign='center';const cutReady=canChoose(s)||(s.choice==='follow'&&!s.opened&&s.loops>0);
dc.fillStyle=s.opened?'#91b995':cutReady?'#f0c47e':'#60777e';dc.fillText(s.opened?'OPEN':'CUT',0,2);dc.font='9px monospace';dc.fillStyle='#9db5be';
dc.fillText(dialPreview==null?'↶ TIME':(dialPreview+1)+' / '+s.history.length,0,17);dc.restore();
}
function tick(t){const dt=clamp((t-last)/1000,0,.04);last=t;if($('bellCover').hidden){const was=s.heard;step(s,Number(pressed.has('forward'))-Number(pressed.has('back')),Number(pressed.has('right'))-Number(pressed.has('left')),dt);if(s.heard&&!was)bellSound();ui()}paint();ringPaint();frameId=requestAnimationFrame(tick)}
function start(){unlockSound();s=create();record(s);finished=false;pressed.clear();view='POV';$('bellLens').textContent='APERTURE / POV';$('bellCover').hidden=true;$('bellBefore').hidden=true;last=performance.now();cv.focus()}
function enter(){root.classList.add('active');document.body.style.overflow='hidden';s=create();record(s);finished=false;$('bellCover').hidden=false;$('bellCardTitle').textContent='THE BELL';$('bellCardText').innerHTML='You hear a bell. Its sound is pleasant. You recognize it and want to hear it again.<br><br>Walk into this situation. At the crossroads your action will change the reachable world. The bell itself will not change.';$('bellBegin').textContent='ENTER WORLD →';$('bellBefore').hidden=true;$('bellSave').hidden=true;resize();ui();if(!frameId){last=performance.now();frameId=requestAnimationFrame(tick)}}
function exit(){root.classList.remove('active');document.body.style.overflow='';pressed.clear();cancelAnimationFrame(frameId);frameId=0;if(typeof location!=='undefined'&&new URLSearchParams(location.search).get('maze')==='1')location.replace('./');}
function lens(){view=view==='POV'?'PLAN':view==='PLAN'?'CAUSE':'POV';$('bellLens').textContent='APERTURE / '+view}
function coreAction(){if(!$('bellCover').hidden)return;if(canChoose(s)||(s.choice==='follow'&&s.loops>0&&!s.opened)){choose(s,'notice');ui()}else if(!s.opened){s.note='The core changes a causal connection only at the crossroads, or after the loop is lived. Continue walking.';ui()}}
entry.onclick=enter;$('bellQuit').onclick=exit;$('bellBegin').onclick=start;$('bellLens').onclick=lens;$('bellBefore').onclick=()=>{const ix=s.history.findIndex(p=>canChoose(p));if(ix<0)return;rewind(s,ix);finished=false;$('bellCover').hidden=true;$('bellBefore').hidden=true;$('bellSave').hidden=true;ui();cv.focus()};$('bellBook').onclick=()=>window.open(SOURCE,'_blank','noopener');
// The encounter is enacted through walking and the central ring, not a two-answer dialogue.
$('bellSave').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(exportState(s),null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='sleeper-bell-return.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1200)};
root.querySelectorAll('[data-drive]').forEach(btn=>bindDrive(btn,pressed,btn.dataset.drive,unlockSound));
let drag=null;
function dialTouch(e){
 const r=dial.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*180-90,y=(e.clientY-r.top)/r.height*180-90;
 const radius=Math.hypot(x,y),fraction=((Math.atan2(y,x)+Math.PI/2)/TAU+1)%1;
 if(!drag)drag=ringZone(radius);
 if(drag==='TURN')s.a=fraction*TAU;
 if(drag==='REWIND'&&s.history.length>1)dialPreview=Math.round(fraction*(s.history.length-1));
}
dial.addEventListener('pointerdown',e=>{e.preventDefault();drag=null;unlockSound();dial.setPointerCapture(e.pointerId);dialTouch(e)});
dial.addEventListener('pointermove',e=>{if(e.buttons&&drag)dialTouch(e)});
dial.addEventListener('pointerup',()=>{if(drag==='CORE')coreAction();if(drag==='REWIND'&&dialPreview!==null){rewind(s,dialPreview);ui()}drag=null;dialPreview=null});
dial.addEventListener('pointercancel',()=>{drag=null;dialPreview=null});
const keys={w:'forward',ArrowUp:'forward',s:'back',ArrowDown:'back',a:'left',ArrowLeft:'left',d:'right',ArrowRight:'right'};
document.addEventListener('keydown',e=>{if(!root.classList.contains('active'))return;if(e.key==='Escape'){exit();return}if(e.key===' '||e.key==='e'||e.key==='E'){e.preventDefault();coreAction();return}if(keys[e.key]){e.preventDefault();unlockSound();pressed.add(keys[e.key])}});
document.addEventListener('keyup',e=>pressed.delete(keys[e.key]));window.addEventListener('blur',()=>pressed.clear());window.addEventListener('resize',()=>{if(root.classList.contains('active'))resize()});
if(typeof location!=='undefined'&&new URLSearchParams(location.search).get('maze')==='1'){enter();start();}
}
return Object.freeze({create,step,choose,rewind,canChoose,openCell,ray,ghostProjection,ringZone,bindDrive,exportState,mount,grid:()=>grid.map(row=>row.slice())});
});