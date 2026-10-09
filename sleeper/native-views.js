'use strict';
(()=>{
const VIEWS=[
  {id:'city',label:'CITY',role:'ENCOUNTER'},
  {id:'plan',label:'PLAN',role:'LOCATE'},
  {id:'disc',label:'DISC',role:'REPROJECT'},
  {id:'trace',label:'TRACE',role:'COMPARE'}
];
let tracePlaying=false,traceCursor=0,traceLast=0;
const baseRender=render;

function fitSquare(w,h,padTop=58,padBottom=28){
  const side=Math.max(40,Math.min(w-36,h-padTop-padBottom));
  return{side,left:(w-side)/2,top:padTop+(h-padTop-padBottom-side)/2,cell:side/game.size};
}
function mapPoint(box,p){return{x:box.left+p.x*box.cell,y:box.top+p.y*box.cell}}
function routeOverlapLocal(a,b){
  if(!a?.length||!b?.length)return null;
  const A=new Set(a.map(p=>`${Math.floor((p.x??p[0])*2)/2},${Math.floor((p.y??p[1])*2)/2}`));
  const B=new Set(b.map(p=>`${Math.floor((p.x??p[0])*2)/2},${Math.floor((p.y??p[1])*2)/2}`));
  let n=0;for(const k of B)if(A.has(k))n++;
  return B.size?n/B.size:null;
}
function label(ctx,text,x,y,alpha=.7){ctx.fillStyle=`rgba(229,220,195,${alpha})`;ctx.font='10px "Courier New",monospace';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText(text,x,y)}
function syncViewUI(){
  $$('.viewbtn').forEach(b=>b.classList.toggle('on',b.dataset.view===projection));
  const trace=$('#traceControls');
  if(trace)trace.classList.toggle('hidden',projection!=='trace');
  const scrub=$('#traceScrub');
  if(scrub){const n=Math.max(0,(game?.ghost?.path?.length||1)-1);scrub.max=String(n);scrub.value=String(Math.min(n,Math.round(traceCursor)));scrub.disabled=!game?.ghost?.path?.length}
  const play=$('#tracePlay');
  if(play){play.disabled=!game?.ghost?.path?.length;play.textContent=tracePlaying?'PAUSE':'PLAY'}
}
function setView(next,announce=true){
  if(!VIEWS.some(v=>v.id===next)||!game)return;
  projection=next;game.projection=next;
  const view=VIEWS.find(v=>v.id===next);
  $('#projectionLabel').textContent=view.label;
  if(next!=='trace')tracePlaying=false;
  if(announce)addLog(`VIEW / ${view.label} · ${view.role} · PROJECTION ONLY / NO GATE PROOF.`);
  syncViewUI();
}
function drawPlan(ctx,w,h,now){
  ctx.fillStyle='rgba(5,7,7,.98)';ctx.fillRect(0,0,w,h);
  const box=fitSquare(w,h,54,24),cell=box.cell;
  label(ctx,'EXACT GRID / PLAN PROJECTION',18,18,.76);label(ctx,'GEOMETRY + GATES + CURRENT ROUTE · SAME WORLD STATE',18,34,.38);
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`${clamp(cell*.76,5,12)}px "Courier New",monospace`;
  for(let y=0;y<game.size;y++)for(let x=0;x<game.size;x++){
    const p=mapPoint(box,{x:x+.5,y:y+.5}),v=game.grid[y][x];
    if(v>0){const i=Math.abs((x*19+y*23+v)%game.sourceChars.length);ctx.fillStyle=v===9?'rgba(231,222,199,.42)':'rgba(211,202,180,.24)';ctx.fillText(game.sourceChars[i]||'#',p.x,p.y)}
    else if((x+y)%3===0){ctx.fillStyle='rgba(155,149,134,.10)';ctx.fillText('·',p.x,p.y)}
  }
  if(game.ghost?.path?.length>1){ctx.beginPath();game.ghost.path.forEach((xy,i)=>{const p=mapPoint(box,{x:xy[0],y:xy[1]});i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)});ctx.strokeStyle='rgba(124,183,191,.18)';ctx.setLineDash([3,4]);ctx.lineWidth=1;ctx.stroke();ctx.setLineDash([])}
  if(game.path.length>1){ctx.beginPath();game.path.forEach((p,i)=>{p=mapPoint(box,p);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)});ctx.strokeStyle='rgba(224,143,84,.58)';ctx.lineWidth=1.2;ctx.stroke()}
  for(const gate of game.gates){const p=mapPoint(box,gate);ctx.fillStyle=gate.collected?'rgba(222,214,191,.22)':gate.color;ctx.shadowColor=gate.color;ctx.shadowBlur=gate.collected?0:8;ctx.font=`${clamp(cell*.92,8,16)}px "Courier New",monospace`;ctx.fillText(gate.collected?'·':gate.glyph,p.x,p.y)}ctx.shadowBlur=0;
  const start=mapPoint(box,game.start);ctx.fillStyle=game.returnOpen?'#e9c16f':'rgba(233,193,111,.28)';ctx.font=`${clamp(cell*.82,8,15)}px serif`;ctx.fillText('回',start.x,start.y);
  if(game.anchor){const a=mapPoint(box,game.anchor);ctx.strokeStyle='rgba(124,183,191,.85)';ctx.strokeRect(a.x-cell*.35,a.y-cell*.35,cell*.7,cell*.7)}
  const pp=mapPoint(box,game.player),r=Math.max(4,cell*.34);ctx.save();ctx.translate(pp.x,pp.y);ctx.rotate(game.player.direction);ctx.fillStyle='#f1d487';ctx.beginPath();ctx.moveTo(r,0);ctx.lineTo(-r*.7,r*.55);ctx.lineTo(-r*.7,-r*.55);ctx.closePath();ctx.fill();ctx.restore();
}
function drawTrace(ctx,w,h,now){
  ctx.fillStyle='rgba(4,6,6,.985)';ctx.fillRect(0,0,w,h);
  const box=fitSquare(w,h,72,78),overlap=routeOverlapLocal(game.path,game.ghost?.path||[]);
  label(ctx,'ROUTE TRACE / EVIDENCE-ONLY PROJECTION',18,18,.76);
  label(ctx,game.ghost?`SAME WORLD ${game.law.key} · GHOST ${game.ghost.path.length} pts · OVERLAP ${overlap==null?'—':Math.round(overlap*100)+'%'}`:`SAME WORLD ${game.law.key} · RETURN ONCE, THEN REENTER TO ARM GHOST`,18,34,.42);
  label(ctx,`CURRENT ${game.path.length} pts · ${game.steps} steps · TRACE NEVER SATISFIES GATES`,18,49,.34);
  ctx.strokeStyle='rgba(218,205,172,.08)';ctx.lineWidth=1;for(let i=0;i<=game.size;i+=3){const x=box.left+i*box.cell,y=box.top+i*box.cell;ctx.beginPath();ctx.moveTo(x,box.top);ctx.lineTo(x,box.top+box.side);ctx.stroke();ctx.beginPath();ctx.moveTo(box.left,y);ctx.lineTo(box.left+box.side,y);ctx.stroke()}
  if(game.ghost?.path?.length>1){
    ctx.beginPath();game.ghost.path.forEach((xy,i)=>{const p=mapPoint(box,{x:xy[0],y:xy[1]});i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)});ctx.strokeStyle='rgba(124,183,191,.24)';ctx.setLineDash([4,5]);ctx.lineWidth=1.2;ctx.stroke();ctx.setLineDash([]);
    const n=game.ghost.path.length;if(tracePlaying){if(!traceLast)traceLast=now;traceCursor=(traceCursor+(now-traceLast)*.022)%n;traceLast=now}else traceLast=now;
    const gi=Math.min(n-1,Math.floor(traceCursor)),xy=game.ghost.path[gi],gp=mapPoint(box,{x:xy[0],y:xy[1]});ctx.fillStyle='#7cb7bf';ctx.beginPath();ctx.arc(gp.x,gp.y,4.5,0,TAU);ctx.fill();ctx.font='10px "Courier New",monospace';ctx.textAlign='left';ctx.fillText(`GHOST ${gi}/${n-1}`,gp.x+8,gp.y-5);
  }
  if(game.path.length>1){ctx.beginPath();game.path.forEach((p,i)=>{p=mapPoint(box,p);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)});ctx.strokeStyle='rgba(224,143,84,.72)';ctx.lineWidth=1.5;ctx.stroke()}
  const pp=mapPoint(box,game.player);ctx.fillStyle='#f1d487';ctx.beginPath();ctx.arc(pp.x,pp.y,4.5,0,TAU);ctx.fill();
  const y0=h-49,x0=18,x1=w-18,den=Math.max(1,game.steps);ctx.strokeStyle='rgba(218,205,172,.18)';ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1,y0);ctx.stroke();
  for(const p of game.proofs){const gate=game.gates.find(g=>g.name===p.gate),x=x0+(p.step/den)*(x1-x0);ctx.fillStyle=gate?.color||'#d8cfbb';ctx.font='12px "Courier New",monospace';ctx.textAlign='center';ctx.fillText(gate?.glyph||'·',x,y0-9)}
  label(ctx,'PROOF CHRONOLOGY',18,h-31,.32);
}
render=function(now){
  if(!game)return;
  if(projection==='city'||projection==='disc'){baseRender(now);syncViewUI();return}
  const{ctx,w,h,ratio}=resizeCanvas();ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,w,h);
  if(projection==='plan')drawPlan(ctx,w,h,now);else drawTrace(ctx,w,h,now);
  syncViewUI();
};

$$('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view,true)));
const play=$('#tracePlay');if(play)play.addEventListener('click',()=>{if(!game?.ghost?.path?.length)return;tracePlaying=!tracePlaying;traceLast=performance.now();syncViewUI()});
const scrub=$('#traceScrub');if(scrub)scrub.addEventListener('input',()=>{tracePlaying=false;traceCursor=Number(scrub.value)||0;syncViewUI()});
window.SleeperViews={set:setView,list:()=>VIEWS.map(v=>({...v}))};
})();
