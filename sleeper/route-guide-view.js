'use strict';
/* Read-only guide. No movement, wall, proof, operator, or Return Artifact writes. */
(()=>{
const G=globalThis.SleeperRouteGuide;
if(!G||!document.querySelector('#side'))return;
const anchor=document.querySelector('#nearGate')?.closest('.section');
const panel=document.createElement('div');
panel.className='section route-section';
panel.innerHTML='<h2>ONE WALKABLE APERTURE</h2><div class="route-actions"><button id="routeToggle" type="button" aria-pressed="false">SHOW ROUTE</button><label for="routeTarget">TARGET<select id="routeTarget" aria-label="Route target"><option value="auto">NEAREST ACTIONABLE</option></select></label></div><div id="routeStatus" class="small" role="status" aria-live="polite">Optional path through the actual city. Never moves or proves a Gate.</div><div class="tiny dim">PLAN shows the route. CITY shows the next turn. You must still enact every proof.</div>';
anchor?.parentNode.insertBefore(panel,anchor);
const cue=document.createElement('div');
cue.id='routeCue';cue.className='route-cue hidden';cue.setAttribute('aria-live','off');
document.querySelector('#view-wrap').appendChild(cue);
const button=document.querySelector('#routeToggle'),select=document.querySelector('#routeTarget'),status=document.querySelector('#routeStatus');
let enabled=false,route=null,selection='auto',lastSolve=-Infinity,lastWorld='',lastStatus='',lastCue='';
function refreshTargets(){
  if(!game)return;
  const key=game.law.key;
  if(key===lastWorld)return;
  lastWorld=key;selection='auto';enabled=false;route=null;lastSolve=-Infinity;
  select.replaceChildren(new Option('NEAREST ACTIONABLE','auto'));
  for(const g of game.gates)select.add(new Option(g.name,g.name));
  select.value='auto';syncButton();
}
function syncButton(){button.textContent=enabled?'HIDE ROUTE':'SHOW ROUTE';button.setAttribute('aria-pressed',String(enabled));cue.classList.toggle('hidden',!enabled)}
function direction(r){
  if(!game||!r?.path?.length)return '';
  const next=r.path.length>1?r.path[1]:r.path[0];
  const theta=Math.atan2(next.y-game.player.y,next.x-game.player.x)-game.player.direction;
  const a=Math.atan2(Math.sin(theta),Math.cos(theta));
  if(r.steps===0)return 'AT TARGET';
  if(Math.abs(a)<.36)return 'AHEAD';
  if(Math.abs(a)>2.7)return 'TURN AROUND';
  return a>0?'TURN RIGHT':'TURN LEFT';
}
function recalc(now){
  if(!game){route=null;return}
  refreshTargets();
  if(!enabled){route=null;return}
  if(now-lastSolve<180)return;
  lastSolve=now;
  if(selection!=='auto'&&game.gates.find(g=>g.name===selection)?.collected){selection='auto';select.value='auto'}
  route=G.solve({grid:game.grid,player:game.player,gates:game.gates,start:game.start,law:game.law,returnOpen:game.returnOpen,selected:selection});
  const copy=route.status==='ok'
    ?route.target+' / '+route.steps+' WALKABLE CELLS. '+route.instruction
    :(route.detail||'No route in the current field.');
  if(copy!==lastStatus){status.textContent=copy;lastStatus=copy}
  const hint=route.status==='ok'?direction(route)+' · '+route.target+' · '+route.steps+' CELLS':'ROUTE / '+route.status.toUpperCase();
  if(hint!==lastCue){cue.textContent=hint;lastCue=hint}
}
button.addEventListener('click',()=>{
  if(!game)return;enabled=!enabled;syncButton();lastSolve=-Infinity;recalc(performance.now());
  if(enabled&&innerWidth<=820&&document.querySelector('#side')?.classList.contains('show'))document.querySelector('#menuBtn')?.click();
});
select.addEventListener('change',()=>{
  if(!game)return;selection=select.value;enabled=true;syncButton();lastSolve=-Infinity;recalc(performance.now());
});
const previousStart=start;
start=function(...args){
  lastWorld='';lastStatus='';lastCue='';enabled=false;selection='auto';route=null;syncButton();
  const value=previousStart(...args);refreshTargets();return value;
};
const previousRender=render;
render=function(now){
  previousRender(now);
  if(!game)return;
  recalc(now);
  if(!enabled||projection!=='plan'||route?.status!=='ok')return;
  const c=document.querySelector('#view'),rect=c.getBoundingClientRect(),w=rect.width,h=rect.height;
  if(!w||!h)return;
  const ctx=c.getContext('2d'),side=Math.max(40,Math.min(w-36,h-54-24)),scale=side/game.size;
  const left=(w-side)/2,top=54+(h-54-24-side)/2;
  ctx.save();ctx.strokeStyle='#e9c16f';ctx.lineWidth=Math.max(1.5,scale*.22);ctx.globalAlpha=.92;ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();
  route.path.forEach((p,i)=>{const x=left+p.x*scale,y=top+p.y*scale;i?ctx.lineTo(x,y):ctx.moveTo(x,y)});
  ctx.stroke();
  const end=route.path[route.path.length-1];ctx.fillStyle='#e9c16f';ctx.beginPath();ctx.arc(left+end.x*scale,top+end.y*scale,Math.max(3,scale*.36),0,Math.PI*2);ctx.fill();
  ctx.restore();
};
globalThis.SleeperGuideView=Object.freeze({enabled:()=>enabled,target:()=>route?.target||null,status:()=>route?.status||'off'});
})();