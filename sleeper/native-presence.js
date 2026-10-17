'use strict';
// Presentation adapter over the one native world. Audio is explicitly opt-in.
(()=>{
const E=SleeperEncounter,atlas=new Map();
let material='woven',sound=false,audio=null,lastCue='';
const reduced=()=>globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;
function tile(char,ink){
  const key=ink+':'+char;if(atlas.has(key))return atlas.get(key);
  const c=document.createElement('canvas');c.width=20;c.height=24;
  const ctx=c.getContext('2d');ctx.font='19px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle=ink==='source'?'#e9c16f':'#8faab4';ctx.fillText(char,10,12);
  if(atlas.size>=256)atlas.delete(atlas.keys().next().value);atlas.set(key,c);return c;
}
function drawWoven(ctx,w,h,now){
  ctx.fillStyle='#06090d';ctx.fillRect(0,0,w,h);
  const cols=Math.min(112,Math.max(48,Math.floor(w/7))),rows=Math.min(48,Math.max(24,Math.floor(h/12))),cw=w/cols,ch=h/rows,fov=Math.PI/2.9;
  const phase=game.pulseUntil>now&&!reduced()?(now%9000)*.001:0;
  // One native DDA ray per column; the cached glyphs are material, not geometry.
  for(let col=0;col<cols;col++){
    const angle=game.player.direction+((col+.5)/cols-.5)*fov,hit=castRay(game,angle);
    const depth=Math.max(.08,hit.distance*Math.cos(angle-game.player.direction));
    const height=Math.min(h*2.1,h*.88/depth),top=h/2-height/2,bottom=top+height;
    const light=Math.max(.045,Math.min(.8,1/(1+depth*.32)))*(hit.side?.68:1);
    ctx.fillStyle=`rgba(145,126,86,${light*.12})`;ctx.fillRect(col*cw,top,cw+.5,height);
    for(let row=Math.max(0,Math.floor(top/ch));row<Math.min(rows,Math.ceil(bottom/ch));row++){
      const v=((row+.5)*ch-top)/height,s=E.wallSample(game.law,hit,v,phase);
      ctx.globalAlpha=light*s.alpha;ctx.drawImage(tile(s.glyph,s.ink),col*cw,row*ch,cw,ch);
      if(s.ink==='source'){ctx.fillStyle='#e9c16f';ctx.fillRect(col*cw,(row+1)*ch-1,cw,1)}
    }
    // Floor points are anchored in world coordinates, so motion reads as traversal.
    for(let row=Math.max(Math.ceil(bottom/ch),Math.floor(rows/2)+1);row<rows;row++){
      const d=(h*.44)/Math.max(ch,(row+.5)*ch-h/2),wx=game.player.x+Math.cos(angle)*d,wy=game.player.y+Math.sin(angle)*d;
      const seam=Math.min(wx-Math.floor(wx),wy-Math.floor(wy));
      if(seam<.1){ctx.globalAlpha=.1+.18*row/rows;ctx.fillStyle='#99a5ae';ctx.fillRect(col*cw,row*ch,cw*.65,1)}
    }
  }
  ctx.globalAlpha=1;
  // Proven words progressively inhabit the sky; no fabricated text or lore.
  ctx.font='11px monospace';ctx.fillStyle='rgba(233,193,111,.44)';ctx.textAlign='center';
  ctx.fillText(game.proofs.map(p=>p.token).join(' · '),w/2,32,w-30);
  drawGateSprites(ctx,w,h,game,now,fov);
  ctx.strokeStyle='rgba(233,193,111,.55)';ctx.beginPath();ctx.moveTo(w/2-4,h/2);ctx.lineTo(w/2+4,h/2);ctx.moveTo(w/2,h/2-4);ctx.lineTo(w/2,h/2+4);ctx.stroke();
  if(game.pulseUntil>now){
    const progress=1-(game.pulseUntil-now)/game.law.figure.conchMs;
    ctx.strokeStyle=`rgba(124,183,191,${.35*(1-progress)})`;ctx.beginPath();ctx.ellipse(w/2,h/2,w*(reduced()?.4:progress),h*.34,0,0,TAU);ctx.stroke();
  }
}
const originalCity=drawCity;
drawCity=function(ctx,w,h,now){material==='woven'?drawWoven(ctx,w,h,now):originalCity(ctx,w,h,now)};

function tone(kind,accent=''){
  if(!sound||!game)return;
  const AC=globalThis.AudioContext||globalThis.webkitAudioContext;if(!AC)return;
  try{
    audio=audio||new AC();if(audio.state==='suspended')void audio.resume();
    const now=audio.currentTime,tokenValue=Array.from(accent).reduce((sum,ch)=>sum+(ch.codePointAt(0)||0),0);
    const transpose=2**((((game.law.seed+tokenValue)%9)-4)/12);
    const frequencies={gate:[196,294,441],conch:[132,396],keris:[880,164],w8:[72,48],spiral:[174,261,522],return:[147,220,330,440]}[kind];
    if(!frequencies)return;
    frequencies.forEach((hz,i)=>{
      const osc=audio.createOscillator(),gain=audio.createGain(),t=now+i*.075;
      osc.type=kind==='keris'?'sawtooth':game.law.figure.id==='slothcake'||kind==='w8'?'sine':game.law.figure.id==='kite'?'triangle':'square';
      osc.frequency.setValueAtTime(hz*transpose,t);
      if(kind==='conch')osc.frequency.exponentialRampToValueAtTime(hz*transpose*2.2,t+.7);
      gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(kind==='w8'?.06:.035,t+.018);gain.gain.exponentialRampToValueAtTime(.0001,t+(kind==='conch'?.8:.38));
      osc.connect(gain);gain.connect(audio.destination);osc.start(t);osc.stop(t+(kind==='conch'?.82:.42));
      osc.onended=()=>{osc.disconnect();gain.disconnect()};
    });
  }catch{sound=false;$('#soundBtn').textContent='SOUND UNAVAILABLE';$('#soundBtn').setAttribute('aria-pressed','false')}
}
const nativeEvent=recordEvent;
recordEvent=function(type,data={}){
  nativeEvent(type,data);
  if(type==='operator'&&data.operator!=='keris')tone(data.operator);
  if(type==='cut')tone('keris');
  if(type==='gate'){
    const gate=game.gates.find(g=>g.name===data.gate);
    tone('gate',data.token);const node=$('#proofMoment');node.textContent=`${gate.glyph} ${gate.name} / ${gate.token}. ${gate.line}`;node.classList.add('shown');
    setTimeout(()=>node.classList.remove('shown'),1800);
  }
  if(type==='return')tone('return');
};
function paintCue(){
  if(!game)return;
  const a=E.aperture(game,performance.now(),castRay(game,game.player.direction,1.5));if(!a)return;
  const key=a.title+'|'+a.line+'|'+a.phase;
  if(key!==lastCue){$('#cueTitle').textContent=a.title;$('#cueLine').textContent=a.line;$('#encounterCue').dataset.phase=a.phase;lastCue=key}
  $('#cueProgress').style.width=`${Math.round(a.progress*100)}%`;
  $$('.tool').forEach(b=>{b.classList.toggle('suggested',b.dataset.tool===a.tool);b.setAttribute('aria-label',`${b.dataset.tool.toUpperCase()}. ${b.querySelector('span').textContent}`)});
  const anchor=$('[data-tool="w8"] span');anchor.textContent=game.anchor?'8 · recover mark':'8 · set mark';
}
const nativeHUD=renderHUD;
renderHUD=function(){nativeHUD();paintCue()};
const nativeStart=start;
start=function(...args){lastCue='';$('#proofMoment').classList.remove('shown');atlas.clear();nativeStart(...args);paintCue()};
const nativeReturn=showReturn;
showReturn=function(artifact,trace){
  nativeReturn(artifact,trace);
  const b=document.createElement('button');b.id='downloadWeave';b.textContent='DOWNLOAD WOVEN TRACE';b.onclick=()=>downloadSVG(`${game.law.key}-woven-trace.svg`,E.wovenTraceSVG(game));$('#modalCard .modal-actions').append(b);
};
function downloadSVG(name,text){const url=URL.createObjectURL(new Blob([text],{type:'image/svg+xml'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
$$('[data-material]').forEach(b=>b.addEventListener('click',()=>{
  material=b.dataset.material;$$('[data-material]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
}));
$('#soundBtn').onclick=()=>{sound=!sound;$('#soundBtn').textContent=sound?'SOUND ON':'SOUND OFF';$('#soundBtn').setAttribute('aria-pressed',String(sound));if(sound)tone('conch');else if(audio)void audio.suspend()};
const menu=$('#menuBtn');menu.addEventListener('click',()=>{
  const on=$('#side').classList.contains('show');menu.setAttribute('aria-expanded',String(on));menu.textContent=on?'CLOSE':'FIELD';game?.keys.clear();if(game)game.lastMovedAt=performance.now();
});
addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#side').classList.contains('show'))menu.click()});
window.SleeperPresence=Object.freeze({material:()=>material,sound:()=>sound,atlasSize:()=>atlas.size});
})();
