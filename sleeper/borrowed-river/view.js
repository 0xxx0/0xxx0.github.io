const $=id=>document.getElementById(id), canvas=$('canvas'), ctx=canvas.getContext('2d');
const STORAGE='sleeper.borrowed-river.v1';
let state=fresh(), draft=[], proof=null, travel=null, camera=0, cameraAim=0, scale=1, offsetY=0, w=1000,h=600, whole=false, reveal=false, dragging=false, cursor=null, pointer=null, saved=true;
let reduced=matchMedia('(prefers-reduced-motion: reduce)').matches, sounding=false, audio=null, last=0, time=0, arrivalUntil=0, booted=false;
try{const stored=localStorage.getItem(STORAGE);if(stored)state=validate(JSON.parse(stored));}catch{saved=false;}
const art=new Image();art.onload=()=>{booted=true;$('loading').hidden=true;resize();paint();};art.onerror=()=>{$('loading').textContent='The painting could not open. Reload to try again.';};art.src=LANDSCAPE;
function save(){try{localStorage.setItem(STORAGE,JSON.stringify(state));saved=true;}catch{saved=false;}}
function say(text){$('instruction').textContent=text;}
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);}
function dialog(html){release();$('panelBody').innerHTML=html;if(!$('panel').open)$('panel').showModal();}
function setCamera(x){cameraAim=Math.max(0,Math.min(WIDTH-w/scale,x));}
function focusBoat(){whole=false;$('overview').setAttribute('aria-pressed','false');resize();setCamera(port(state.at).x-w/scale*.23);}
function resize(){const box=canvas.getBoundingClientRect();w=box.width;h=box.height;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);scale=whole?Math.min(w/WIDTH,h/HEIGHT):Math.max(w/1550,Math.min(h/HEIGHT,w/1050));offsetY=whole?(h-HEIGHT*scale)/2:h-HEIGHT*scale;setCamera(cameraAim);}
function position(){return travel?pointAt(travel.points,travel.distance):{...port(state.at),angle:0};}
function update(){
  const p=port(state.at);$('place').textContent=p.title.toUpperCase();
  proof=draft.length>1?inspect(draft,state.at):null;
  const used=proof?.cost??length(draft);$('inkLevel').style.width=Math.max(0,100-used/INK*100)+'%';$('inkLevel').style.background=proof&&!proof.ok?'#a84232':'#527e72';$('inkValue').textContent=Math.max(0,Math.round(INK-used));
  $('sail').disabled=!!travel||(!state.returning&&!proof?.ok&&!state.complete);
  $('sail').textContent=state.complete?'Keep this river ↗':state.returning?'Bring the light home ←':travel?'Sailing…':proof?.ok?'Sail to '+port(proof.to).title.split(' ')[0]+' →':'Sail this line →';
  $('undo').disabled=!!travel||!draft.length||state.returning;
  $('journey').textContent=state.complete?'THE RIVER RETURNS':state.returning?'THE FAR SHORE / HOMEWARD':String(state.legs.length+1).padStart(2,'0')+' / '+(state.legs.length?'FIND A WAY THROUGH':'THE FIRST CROSSING');
  if(travel)say(travel.home?'The water remembers every bend. Your river is bringing the light home.':'Your brushstroke is now a passage.');
  else if(state.complete)say('You brought the light home. This river exists because of the way you travelled.');
  else if(state.returning)say('Turn the current. Follow your own river home; every landing will keep a little light.');
  else if(proof)say(proof.ok?'A clear passage. Sail it, or lift the brush and try another bend.':proof.why);
  else if(state.at==='home')say('Begin at the little boat. Draw around the stone to the red lantern.');
  else if(state.at==='reed')say('The river forks: the high bell or the low willow. Draw toward either lantern.');
  else if(state.at==='moon')say('Carry the light onward. Rain above, a patient stone below: choose your passage.');
  else say('The brush is full again. Draw toward the next lantern, bending around the dark stone.');
  $('sceneCaption').textContent=state.complete?'The line you drew became a way back.':state.returning?'Nothing to collect now. Only a way home.':'Every landing renews the brush.';
  $('motion').setAttribute('aria-pressed',String(reduced));
}
function tone(index=0){if(!sounding)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();const frequencies=[220,261.63,293.66,329.63,392,440,523.25,587.33];const now=audio.currentTime;for(let i=0;i<3;i++){const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=frequencies[(index+i*2)%frequencies.length];g.gain.setValueAtTime(0,now+i*.16);g.gain.linearRampToValueAtTime(.035/(i+1),now+i*.16+.01);g.gain.exponentialRampToValueAtTime(.0001,now+i*.16+2.6);o.connect(g);g.connect(audio.destination);o.start(now+i*.16);o.stop(now+i*.16+2.7);}}catch{sounding=false;$('sound').textContent='Sound unavailable';}}
function arrive(){const finished=travel;travel=null;if(finished.home){state=finish(state);whole=true;$('overview').setAttribute('aria-pressed','true');resize();cameraAim=0;setTimeout(()=>{if(state.complete)showReturn();},reduced?0:1500);}else{const result=sail(state,finished.points);if(!result.ok){say(result.why);return;}state=result.state;const p=port(state.at);$('arrival').textContent=p.line;$('arrival').classList.add('show');arrivalUntil=time+8;tone(PORTS.indexOf(p));focusBoat();}draft=[];proof=null;save();update();}
function launch(){
  if(travel)return;if(state.complete){showReturn();return;}
  if(state.returning){travel={points:homeward(state),distance:0,home:true};whole=false;resize();}
  else{const r=inspect(draft,state.at);if(!r.ok){say(r.why);return;}travel={points:r.points,distance:0,home:false};}
  tone(state.legs.length);update();
}
function clear(){if(travel||state.returning||state.complete)return;draft=[];proof=null;cursor=null;update();}
function add(p){if(travel||state.returning||state.complete||draft.length>=2500)return;if(!draft.length)draft=[{x:port(state.at).x,y:port(state.at).y}];if(dist(draft.at(-1),p)>5)draft.push({x:p.x,y:p.y});update();}
function worldPoint(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)/scale+(whole?0:camera),y:(e.clientY-r.top-offsetY)/scale};}
canvas.addEventListener('pointerdown',e=>{
  if(!booted||travel||state.returning||state.complete)return;e.preventDefault();canvas.focus();
  if(whole){const p=worldPoint(e);whole=false;$('overview').setAttribute('aria-pressed','false');resize();setCamera(p.x-w/scale/2);return;}
  pointer={x:e.clientX,y:e.clientY};const p=worldPoint(e);cursor=p;
  if(dist(p,port(state.at))<65)draft=[{x:port(state.at).x,y:port(state.at).y}];else add(p);
  dragging=true;canvas.setPointerCapture(e.pointerId);update();
});
canvas.addEventListener('pointermove',e=>{if(!dragging)return;pointer={x:e.clientX,y:e.clientY};const p=worldPoint(e);cursor=p;add(p);});
function release(){dragging=false;pointer=null;update();}
canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
canvas.addEventListener('keydown',e=>{
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','Enter','Backspace','h','H','Escape'].includes(e.key))e.preventDefault();
  if(e.key==='Escape'||e.key==='Backspace'){clear();return;}if(e.key==='Enter'){launch();return;}if(e.key.toLowerCase()==='h'){toggleReveal();return;}
  if(travel||state.returning||state.complete)return;
  cursor??={...port(state.at)};
  const step=e.shiftKey?8:24;
  if(e.key.startsWith('Arrow')){if(whole){whole=false;resize();}cursor={x:Math.max(70,Math.min(3250,cursor.x+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0))),y:Math.max(510,Math.min(945,cursor.y+(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0)))};if(cursor.x>camera+w/scale-70)setCamera(cameraAim+step);if(cursor.x<camera+70)setCamera(cameraAim-step);}
  if(e.key===' ')add(cursor);
});
function toggleReveal(){reveal=!reveal;$('listen').setAttribute('aria-pressed',String(reveal));$('listen').textContent=reveal?'Water revealed':'Reveal water';}
$('listen').onclick=toggleReveal;$('undo').onclick=clear;$('sail').onclick=launch;
$('back').onclick=()=>{if(whole){whole=false;resize();}$('overview').setAttribute('aria-pressed','false');setCamera(cameraAim-w/scale*.55);};
$('ahead').onclick=()=>{if(whole){whole=false;resize();}$('overview').setAttribute('aria-pressed','false');setCamera(cameraAim+w/scale*.55);};
$('follow').onclick=()=>{focusBoat();if(travel)setCamera(position().x-w/scale*.35);};
$('overview').onclick=()=>{whole=!whole;$('overview').setAttribute('aria-pressed',String(whole));resize();};
$('sound').onclick=()=>{sounding=!sounding;$('sound').setAttribute('aria-pressed',String(sounding));$('sound').textContent=sounding?'Sound on':'Sound off';if(sounding)tone(2);else audio?.suspend();};
$('motion').onclick=()=>{reduced=!reduced;update();};
$('close').onclick=()=>$('panel').close();
$('panel').addEventListener('click',e=>{if(e.target===$('panel')){const r=$('panel').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('panel').close();}});
function showHelp(){dialog('<p class="kicker">ONE BRUSH · A FINITE RIVER</p><h2>Water follows your hand.</h2><ol><li>Draw from the boat to a red lantern. Go around the dark rocks. You may drag a continuous line, or tap successive bends.</li><li>The brush holds 790 lengths of ink. A landing renews it. Red ink means the line needs another try; nothing is spent until you sail.</li><li>Choose upper or lower landings. Their words, lights and your river become the painting you take home.</li><li>At the far shore, reverse the current. The boat follows the river you made.</li></ol><small>Keyboard: focus the painting; arrows move the brush (Shift = finer movement), Space adds a bend, Enter sails, Backspace lifts the brush. H outlines the rocks. Arrow buttons above the painting look along the scroll. Play needs no sound or timer. Your last landing saves on this device.</small>');}
$('help').onclick=showHelp;
function showMenu(){dialog('<p class="kicker">SLEEPER / BORROWED RIVER</p><h2>A line becomes a passage.</h2><p>An original small painting game about finding a way through and bringing something back. Landscape and text are newly authored; this is not a historical museum painting.</p><p>Our museum references supplied inhabited space and consequential objects. Here, the river you draw is the actual route the boat must travel. Stone and a finite brush give the line its stakes.</p><div class="row"><button id="saveVoyage">Save voyage</button><button id="loadVoyage">Load voyage</button><button id="newVoyage">Begin again</button></div><p><a href="/recovery/sleeper/painting-path/">Open the earlier painting / reading study ↗</a></p><small>That study retains image import, region authoring and multilingual PULSE. Its annotations are a different kind of object; they are not silently converted into playable terrain.</small><p><a href="https://www.dpm.org.cn/classify_detail/248504.html" target="_blank" rel="noopener">Ink, Mountains and Mystery · Palace Museum</a><br><a href="https://theme.npm.edu.tw/exh108/NPMxKMFA/en/page-3.html" target="_blank" rel="noopener">Into the Painting · Taiwan NPM</a></p><small>Original AI-generated landscape with authored interactive boat, rocks, reeds, lights and river. Device-local save '+(saved?'is available.':'is unavailable here; download your voyage to keep it.')+' No accounts or uploads.</small>');
  $('saveVoyage').onclick=()=>download(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),'borrowed-river-voyage.json');$('loadVoyage').onclick=()=>$('load').click();$('newVoyage').onclick=()=>{dialog('<h2>Let this river go?</h2><p>Your current local voyage will be replaced. A downloaded voyage can always be loaded again.</p><div class="row"><button id="keepVoyage">Keep travelling</button><button id="resetVoyage">Begin a new river</button></div>');$('keepVoyage').onclick=()=>$('panel').close();$('resetVoyage').onclick=()=>{state=fresh();travel=null;draft=[];proof=null;cursor=null;camera=0;cameraAim=0;whole=false;reveal=false;$('listen').setAttribute('aria-pressed','false');$('listen').textContent='Reveal water';$('arrival').classList.remove('show');save();focusBoat();update();$('panel').close();};};
}
$('menu').onclick=showMenu;
$('load').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>2000000)throw Error('This file is too large for a voyage.');const candidate=validate(JSON.parse(await file.text()));state=candidate;travel=null;draft=[];proof=null;cursor=null;save();focusBoat();update();$('panel').close();say('Your river is restored. '+(state.returning?'Bring the light home.':'Continue from '+port(state.at).title+'.'));}catch(err){say(err.message);$('panel').close();}finally{e.target.value='';}};
function showReturn(){
  const receipt=witness(state),words=receipt.words;
  dialog('<p class="kicker">ONE RETURN / YOUR PAINTING</p><h2>You made a way back.</h2><canvas class="return-art" id="returnArt" width="1360" height="430"></canvas><p class="words">'+words.join(' · ')+'</p><p>'+receipt.crossings+' crossings. '+receipt.distance+' lengths of ink. The bends and choices are yours; the words belong to the places you reached.</p><div class="row"><button id="keepPainting">Keep the painting</button><button id="keepTrace">Keep the voyage</button><button id="stay">Stay by the water</button></div><small>This return records actual paths and landings. It is available to other Sleeper tools as a versioned JSON object; no claim of automatic import into every project.</small>');
  const out=$('returnArt'),c=out.getContext('2d');c.fillStyle='#eeeade';c.fillRect(0,0,1360,430);c.save();c.scale(.4,.4);drawWorld(c,0,true);c.restore();c.fillStyle='#395a4e';c.font='12px Georgia';c.fillText('BORROWED RIVER  /  '+words.join(' · '),25,419);
  $('keepPainting').onclick=()=>out.toBlob(b=>{if(b)download(b,'borrowed-river.png');});$('keepTrace').onclick=()=>download(new Blob([JSON.stringify(receipt,null,2)],{type:'application/json'}),'borrowed-river-return.json');$('stay').onclick=()=>$('panel').close();
}
// One renderer drives play and the actual returned painting.
function path(c,points){c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));}
function river(c,points,color,width){if(points.length<2)return;c.lineCap='round';c.lineJoin='round';c.strokeStyle=color;c.lineWidth=width;path(c,points);c.stroke();}
function tree(c,x,y,kind,lit){
  c.save();c.translate(x,y);c.strokeStyle='#485e48';c.lineWidth=2;
  if(kind==='willow'){c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(-8,-35,2,-64);c.stroke();for(let i=0;i<9;i++){const dx=(i-4)*7;c.beginPath();c.moveTo(0,-58);c.quadraticCurveTo(dx,-82,dx*1.5,-12+(i%3)*8);c.strokeStyle=lit?'#648568':'#677264';c.stroke();}}
  else if(kind==='reed'||kind==='rain'){for(let i=0;i<11;i++){c.beginPath();c.moveTo((i-5)*5,0);c.quadraticCurveTo((i-5)*7,-12,(i-5)*7+9,-18-i%4*9);c.stroke();}}
  else{c.beginPath();c.moveTo(0,0);c.lineTo(-3,-40);c.lineTo(2,-65);c.stroke();for(let i=0;i<5;i++){let yy=-25-i*8;c.beginPath();c.moveTo(-2,yy);c.lineTo(-24+i*3,yy-9);c.moveTo(-1,yy-4);c.lineTo(21-i*2,yy-12);c.stroke();for(let j=0;j<6;j++){c.beginPath();c.moveTo(-24+i*3+j*7,yy-9);c.lineTo(-28+i*3+j*7,yy-16);c.stroke();}}}
  c.restore();
}
function rock(c,r){
  c.save();c.translate(r.x,r.y);c.fillStyle='#38554a18';c.beginPath();c.ellipse(8,r.ry*.6,r.rx*1.18,r.ry*.35,0,0,Math.PI*2);c.fill();
  const g=c.createLinearGradient(-r.rx,-r.ry,r.rx,r.ry);g.addColorStop(0,'#7c8e77');g.addColorStop(.45,'#526d5d');g.addColorStop(1,'#263f39');c.fillStyle=g;c.strokeStyle='#334d42';c.lineWidth=2;c.beginPath();
  for(let i=0;i<=24;i++){const a=i/24*Math.PI*2,j=.91+.06*Math.sin(i*5+r.seed),x=Math.cos(a)*r.rx*j,y=Math.sin(a)*r.ry*j;if(i)c.lineTo(x,y);else c.moveTo(x,y);}c.closePath();c.fill();c.stroke();
  c.strokeStyle='#b4b99b66';c.lineWidth=1.5;for(let i=0;i<7;i++){c.beginPath();c.moveTo(-r.rx*.7+i*r.rx*.19,-r.ry*.15);c.lineTo(-r.rx*.25+i*r.rx*.08,-r.ry*.8);c.lineTo(i*r.rx*.07,r.ry*.3);c.stroke();}
  if(reveal){c.setLineDash([5,6]);c.strokeStyle='#a84232bb';c.lineWidth=1.5;c.beginPath();c.ellipse(0,0,r.rx+13,r.ry+13,0,0,Math.PI*2);c.stroke();c.setLineDash([]);}c.restore();
}
function dock(c,p,t,still){
  const lit=state.visited.includes(p.id),near=dist(p,port(state.at))<=INK+40||p.id===state.at;
  c.save();c.translate(p.x,p.y);c.fillStyle='#81917b20';c.beginPath();c.ellipse(0,7,52,14,0,0,Math.PI*2);c.fill();c.strokeStyle='#6b7761';c.lineWidth=3;c.beginPath();c.moveTo(-34,2);c.quadraticCurveTo(0,-10,35,4);c.stroke();c.restore();
  tree(c,p.x-17,p.y-5,p.id,lit);
  c.save();c.translate(p.x+20,p.y-20);const pulse=still?1:.88+Math.sin(t*2+p.x)*.12;
  if(lit||near){const glow=c.createRadialGradient(0,-16,1,0,-16,45);glow.addColorStop(0,lit?'#f4bd5f80':'#bd6a4544');glow.addColorStop(1,'#dda26300');c.fillStyle=glow;c.fillRect(-45,-61,90,90);}
  c.strokeStyle='#495d4c';c.lineWidth=1.8;c.beginPath();c.moveTo(0,20);c.lineTo(0,-36);c.lineTo(17,-36);c.stroke();c.strokeStyle='#9a4937';c.fillStyle=lit?'#e3a359':'#ad533a';c.globalAlpha=near||lit?1:.65;c.fillRect(9,-32,13,19);c.strokeRect(9,-32,13,19);c.fillStyle='#f3d99c';c.globalAlpha=lit?pulse:.5;c.fillRect(14,-29,3,13);c.globalAlpha=1;c.restore();
  if(near||lit||whole){c.save();c.fillStyle=lit?'#456155':'#795e4b';c.font='17px Georgia';c.textAlign='center';c.fillText(p.title,p.x,p.y+41);if(lit&&p.id!=='home'){c.font='italic 15px Georgia';c.fillStyle='#a24d38';c.fillText(p.word,p.x,p.y+62);}c.restore();}
}
function boat(c,p,t,light){c.save();c.translate(p.x,p.y);const angle=travel?p.angle:0;c.rotate(angle);c.strokeStyle='#57726544';c.lineWidth=1.4;for(let i=0;i<3;i++){c.beginPath();c.ellipse(-22-i*13,0,14+i*9,6+i*5,0,-1.3,1.3);c.stroke();}c.fillStyle='#233f38';c.beginPath();c.moveTo(-27,-9);c.quadraticCurveTo(-17,17,29,0);c.quadraticCurveTo(3,-1,-27,-9);c.fill();c.strokeStyle='#ad8c66';c.lineWidth=2;c.beginPath();c.moveTo(-18,-6);c.lineTo(22,0);c.stroke();c.fillStyle='#943f31';c.beginPath();c.moveTo(-6,-4);c.lineTo(-9,-19);c.lineTo(2,-18);c.lineTo(7,0);c.fill();c.fillStyle='#263b34';c.beginPath();c.arc(-4,-23,4,0,Math.PI*2);c.fill();c.strokeStyle='#57604b';c.lineWidth=2;c.beginPath();c.moveTo(-5,-12);c.lineTo(-16,17);c.stroke();if(light){const g=c.createRadialGradient(6,-8,1,6,-8,50);g.addColorStop(0,'#f7d18bbc');g.addColorStop(1,'#e8aa5100');c.fillStyle=g;c.fillRect(-44,-58,100,100);c.fillStyle='#fbe0a6';c.beginPath();c.arc(6,-8,5,0,Math.PI*2);c.fill();}c.restore();}
function drawWorld(c,t,still=false){
  c.drawImage(art,0,0,WIDTH,HEIGHT);
  // Completed crossings are a persistent change to the painting, not a UI overlay.
  state.legs.forEach(l=>{river(c,l.points,'#477c7520',29);river(c,l.points,'#3f716760',15);river(c,l.points,'#eee8c5aa',3);});
  if(state.returning||state.complete){state.legs.forEach(l=>river(c,l.points,'#dab27855',8));}
  ROCKS.forEach(r=>rock(c,r));PORTS.forEach(p=>dock(c,p,t,still));
  if(!still&&!reduced){c.lineWidth=1;c.strokeStyle='#496e6340';for(let i=0;i<19;i++){const x=(i*181+79)%WIDTH,y=535+(i*83)%400;c.beginPath();c.ellipse(x,y,17+Math.sin(t+i)*3,2,0,.2,2.8);c.stroke();}}
  if(state.visited.includes('reed')){c.strokeStyle='#354e46';c.lineWidth=1.5;for(let i=0;i<5;i++){const x=730+i*34+(still?0:Math.sin(t*.14)*40),y=460-i*13;c.beginPath();c.moveTo(x-9,y+3);c.quadraticCurveTo(x-4,y-(still?5:Math.sin(t*3+i)*5),x,y);c.quadraticCurveTo(x+4,y-5,x+10,y+1);c.stroke();}}
  if(state.visited.includes('moon')){const g=c.createRadialGradient(1760,670,0,1760,670,170);g.addColorStop(0,'#fff4bc35');g.addColorStop(1,'#fff4bc00');c.fillStyle=g;c.fillRect(1590,500,340,340);}
  if(state.complete){for(let i=0;i<state.visited.length;i++){const p=port(state.visited[i]);c.fillStyle='#b76c42';c.fillRect(p.x+35,405-(i%3)*45,8,12);}}
  if(!still&&draft.length>1&&!travel){river(c,draft,proof?.ok?'#a54235b0':'#a5423580',7);river(c,draft,'#faf0d488',2);if(proof?.at){c.strokeStyle='#983626';c.lineWidth=2;c.beginPath();c.arc(proof.at.x,proof.at.y,22,0,Math.PI*2);c.stroke();}}
  if(travel&&!still){river(c,travel.points,'#4d807866',18);const traveled=[];let n=0;traveled.push(travel.points[0]);for(let i=1;i<travel.points.length;i++){n+=dist(travel.points[i-1],travel.points[i]);if(n>travel.distance)break;traveled.push(travel.points[i]);}traveled.push(position());river(c,traveled,'#4a776c90',16);river(c,traveled,'#f4ddb699',3);}
  boat(c,still?port('home'):position(),t,state.visited.includes('moon')||state.returning||state.complete);
  if(!still&&cursor&&!travel&&!state.returning){c.strokeStyle='#a54235';c.lineWidth=1;c.beginPath();c.arc(cursor.x,cursor.y,9,0,Math.PI*2);c.moveTo(cursor.x-15,cursor.y);c.lineTo(cursor.x+15,cursor.y);c.moveTo(cursor.x,cursor.y-15);c.lineTo(cursor.x,cursor.y+15);c.stroke();}
}
function paint(){ctx.clearRect(0,0,w,h);ctx.fillStyle='#eeeade';ctx.fillRect(0,0,w,h);if(!booted)return;ctx.save();ctx.translate(whole?0:-camera*scale,offsetY);ctx.scale(scale,scale);drawWorld(ctx,time,reduced);ctx.restore();}
function frame(ms){const dt=Math.min(.04,(ms-last)/1000||0);last=ms;if(!document.hidden&&!$('panel').open){time+=dt;
  if(travel){travel.distance+=dt*(travel.home?360:155);const p=position();if(!whole)setCamera(p.x-w/scale*.35);if(travel.distance>=length(travel.points))arrive();}
  if(dragging&&pointer){const r=canvas.getBoundingClientRect(),xx=pointer.x-r.left;if(xx>w-30||xx<30){setCamera(cameraAim+(xx>w-30?1:-1)*dt*240);const p={x:xx/scale+camera,y:(pointer.y-r.top-offsetY)/scale};add(p);}}
  camera=reduced?cameraAim:camera+(cameraAim-camera)*Math.min(1,dt*5);if(time>arrivalUntil)$('arrival').classList.remove('show');paint();
}requestAnimationFrame(frame);}
window.addEventListener('resize',resize);window.addEventListener('blur',release);document.addEventListener('visibilitychange',()=>{if(document.hidden){release();audio?.suspend();}else if(sounding)audio?.resume();});
resize();focusBoat();update();if(!saved)say('Saved voyage unavailable. Start here or load a downloaded voyage from the menu.');requestAnimationFrame(frame);
