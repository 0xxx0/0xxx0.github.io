/* ONE RETURN / ECHO
   An exact source-word address projected onto one reachable point of the
   SAME native glyph city. A traversed route becomes its own counterfactual
   witness. Projection, never Gate proof, never an authored doctrinal claim. */
(function(){
'use strict';
const L=window.SleeperFocus,E=window.SleeperWordEcho;
const stage=document.querySelector('#view-wrap'),focus=document.querySelector('#focusLens');
if(!L||!E||!stage||!focus)return;
let bound=null,run=null,drawnAt=0;
const css=document.createElement('style');
css.textContent=[
 '#eFollow{border-color:#d7b775!important;color:#ffdfaa!important;background:#17241c!important}',
 '#ePreview{border-left:2px solid #a88e5d;padding:7px 10px;margin:8px 0;color:#c9d5d2;font:11px/1.45 ui-monospace,monospace}',
 '#ePreview .rail{height:3px;background:#263538;margin:7px 0 4px;overflow:hidden}',
 '#ePreview .rail i{display:block;height:100%;background:#dfbf80}',
 '#ePreview .sub{color:#a0b4b7}',
 '#eHud{position:absolute;z-index:10;left:50%;top:66px;transform:translateX(-50%);width:min(310px,calc(100% - 20px));padding:9px 10px;text-align:center;pointer-events:auto;background:rgba(5,11,13,.91);border:1px solid #725f42;color:#f2e9d2;font:11px/1.4 ui-monospace,monospace;text-shadow:0 1px 2px #000}',
 '#eHud[hidden],#eHud [hidden]{display:none!important}',
 '#eHud .sub{color:#bbc3c0;font-size:10px;margin-top:4px}',
 '#eHud .anchor{font-size:17px;color:#f1d49b;font-weight:600}',
 '#eHud .actions{display:flex;justify-content:center;gap:6px;margin-top:7px}',
 '#eHud button{background:#0a1719;border:1px solid #8b7651;color:#f0dbaa;padding:6px 9px;min-height:38px;font:11px ui-monospace,monospace}',
 '#eHud button:focus-visible{outline:2px solid #f6d389;outline-offset:2px}',
 '#eHud .dir{display:inline-block;font-size:18px;color:#d8e8e2;min-width:20px}',
 '@media(max-width:389px){#eHud{top:61px;font-size:10px;padding:7px}#eHud .anchor{font-size:15px}}'
].join('');
document.head.append(css);
const follow=document.createElement('button');follow.id='eFollow';follow.type='button';follow.textContent='⌖ FOLLOW THIS WORD';
follow.setAttribute('aria-label','Project this exact source word onto a reachable position in the same first-person labyrinth');
const row=focus.querySelector('#fOffset');row.parentElement.insertBefore(follow,row.nextSibling);
const preview=document.createElement('div');preview.id='ePreview';preview.setAttribute('role','status');
preview.innerHTML='<div id="ePreviewLine"></div><div class="rail"><i id="ePreviewMark"></i></div><div class="sub">Earlier source words are nearer the world origin. Distance follows actual open corridors.</div>';
follow.after(preview);
function previewSource(){
 if(!game||!L.isOpen()){preview.hidden=true;return}
 const selected=L.selection?.();
 const p=selected&&E.locate(game,game.player,selected.start,selected.word);
 if(!p){preview.hidden=true;return}
 preview.hidden=false;
 preview.querySelector('#ePreviewLine').textContent=
  'WORD '+(p.sourceOrdinal+1)+' / '+p.sourceTotal+
  '  →  '+p.steps+' walkable steps from the origin · same native maze';
 preview.querySelector('#ePreviewMark').style.width=Math.max(0,Math.min(100,(p.steps-6)/10*100))+'%';
}
new MutationObserver(previewSource).observe(row,{childList:true,characterData:true,subtree:true});
const hud=document.createElement('section');hud.id='eHud';hud.hidden=true;hud.setAttribute('aria-label','Native word echo and route memory');hud.setAttribute('role','status');
hud.innerHTML=[
 '<div class="anchor" id="eName"></div><div class="sub" id="eWhere"></div>',
 '<div><span class="dir" id="eDir"></span><span id="eRange"></span></div>',
 '<div class="sub" id="eInstruction"></div>',
 '<div class="actions"><button id="eRepeat" hidden>RETRACE</button><button id="eRelease">LET PASS</button></div>'
].join('');
stage.append(hud);
const $=id=>hud.querySelector('#'+id);
const at=(x,y)=>({x:+x.toFixed(3),y:+y.toFixed(3)});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function state(){
 if(!run)return null;
 return {
  phase:run.phase,word:run.word,range:run.range,waypoint:run.target,
  origin:run.origin,first:run.first?.length||0,second:run.second?.length||0,
  comparison:run.comparison||null
 };
}
function bearing(point){
 const x=point.x-game.player.x,y=point.y-game.player.y;
 const delta=normalAngle(Math.atan2(y,x)-game.player.direction);
 if(Math.abs(delta)<.23)return '↑';
 return delta<0?'↶':'↷';
}
function leg(){
 if(!run)return null;
 if(run.phase==='seek'||run.phase==='seek2')return run.target;
 if(run.phase==='return'||run.phase==='return2')return run.origin;
 return null;
}
function alive(){return game&&run&&bound===game&&run.worldKey===game.law.key}
function snapshotRoute(){
 const path=E.trackSegment(game.path,run.pathFrom,run.origin,game.player);
 return path;
}
function switchPhase(){
 if(!alive()||L.isOpen()||!leg())return;
 const target=leg();
 if(distance(game.player,target)>.75)return;
 const previous=run.phase;
 if(run.phase==='seek'){run.phase='return';run.outward=snapshotRoute()}
 else if(run.phase==='seek2'){run.phase='return2';run.outward2=snapshotRoute()}
 else if(run.phase==='return'){
  run.first=snapshotRoute();
  run.phase='choice';
 }else if(run.phase==='return2'){
  run.second=snapshotRoute();
  run.comparison=E.compare(run.first,run.second);
  run.phase='done';
 }
 if(run.phase!==previous)describe();
}
function describe(){
 if(!alive()||run.phase==='released'||L.isOpen()){hud.hidden=true;return}
 hud.hidden=false;$('eName').textContent='「'+run.word+'」';
 const p=leg();
 const count=run.phase.endsWith('2')?'II':'I';
 const phases={seek:'FIND THE WORD',return:'RETURN TO WHERE YOU STOOD',choice:'MEMORY HOLDS',seek2:'FIND IT AGAIN',return2:'RETURN AGAIN',done:'TWO REAL ROUTES'};
 $('eWhere').textContent=(phases[run.phase]||'WORD ECHO')+' · '+count+' / WORD '+(run.target.sourceOrdinal+1)+'/'+run.target.sourceTotal+' / SAME WORLD';
 if(p){
  const d=distance(game.player,p),hop=E.nextHop(game,game.player,p);
  $('eDir').textContent=hop?bearing(hop):'×';
  $('eRange').textContent=hop?(hop.align?'ALIGN IN THIS CORRIDOR · ':hop.steps+' walkable steps · ')+d.toFixed(1)+' straight-line units':'NO OPEN ROUTE · inspect the native walls';
 }else{$('eDir').textContent='⌁';$('eRange').textContent='Your first route is now visible as a trace.'}
 if(run.phase==='choice'){
  $('eInstruction').textContent='Follow your former footsteps—or let the invitation end. Neither choice earns a Gate.';
 }else if(run.phase==='done'){
  const r=run.comparison;
  $('eInstruction').textContent=r.overlap==null?'No comparable route':Math.round(r.overlap*100)+'% of the second route occupied cells of the first · '+r.firstLength.toFixed(1)+' / '+r.secondLength.toFixed(1)+' world units walked.';
 }else $('eInstruction').textContent='Source order moves outward through walkable distances. This is a map of reading order, not a translation or a Gate.';
 $('eRepeat').hidden=run.phase!=='choice';
 $('eRelease').textContent=run.phase==='done'?'CLOSE ECHO':'LET PASS';
}
function update(now){
 if(!game)return;
 if(bound!==game){bound=game;run=null;hud.hidden=true}
 if(!run)return;
 switchPhase();
 if(now-drawnAt>90){drawnAt=now;describe()}
}
function drawPOV(){
 if(!alive()||L.isOpen()||projection!=='city'||run.phase==='released'||!game)return;
 const canvas=document.querySelector('#view'),ctx=canvas.getContext('2d');
 const w=canvas.clientWidth,h=canvas.clientHeight,r=Math.min(window.devicePixelRatio||1,2);
 if(!(w>0&&h>0))return;
 const fov=Math.PI/2.9;
 ctx.save();ctx.setTransform(r,0,0,r,0,0);
 // The ghost is the previous *actual* native path. It is not another actor:
 // points behind walls or outside the field of view do not render.
 if(run.first?.length&&(run.phase==='seek2'||run.phase==='return2'||run.phase==='done'||run.phase==='choice')){
  for(let i=0;i<run.first.length;i+=Math.max(1,Math.floor(run.first.length/72))){
   const p=run.first[i],dx=p[0]-game.player.x,dy=p[1]-game.player.y,d=Math.hypot(dx,dy);
   if(d<.35||d>14)continue;
   const a=normalAngle(Math.atan2(dy,dx)-game.player.direction);
   if(Math.abs(a)>fov*.49||!lineOfSight(game,p[0],p[1]))continue;
   const sx=w/2+(a/(fov/2))*(w/2),sy=h*.52+h*.24/Math.max(1,d),size=Math.max(2,Math.min(17,14/d));
   ctx.fillStyle='rgba(126,203,205,'+Math.max(.16,Math.min(.60,.72-d*.038)).toFixed(3)+')';
   ctx.font=Math.round(size+5)+'px ui-monospace,monospace';ctx.textAlign='center';
   ctx.fillText('·',sx,sy);
  }
 }
 const p=leg();
 if(p){
  const d=distance(game.player,p);
  const a=normalAngle(Math.atan2(p.y-game.player.y,p.x-game.player.x)-game.player.direction);
  if(Math.abs(a)<fov*.46&&d<13&&lineOfSight(game,p.x,p.y)){
   const sx=w/2+(a/(fov/2))*(w/2),sy=h*.47;
   const size=Math.max(15,Math.min(42,92/Math.max(1,d)));
   ctx.font='600 '+size+'px Georgia,serif';ctx.fillStyle='#f0d6a2';
   ctx.textAlign='center';ctx.shadowColor='#b0884b';ctx.shadowBlur=8;
   ctx.fillText(p===run.origin?'回':run.word,sx,sy,w*.7);ctx.shadowBlur=0;
  }
 }
 ctx.restore();
}
function begin(){
 if(!game||!L.isOpen()||!window.SleeperFocus.selection)return;
 const selected=L.selection();if(!selected||!selected.word)return;
 const origin=at(game.player.x,game.player.y);
 const point=E.locate(game,origin,selected.start,selected.word);
 if(!point){follow.textContent='NO REACHABLE WORD SITE';return}
 bound=game;run={
  worldKey:game.law.key,sourceHash:SleeperSourceAperture.hash(game.law.source),
  origin,target:point,word:selected.word,range:[selected.start,selected.end],
  phase:'seek',pathFrom:Math.max(0,game.path.length-1),
  first:null,second:null,comparison:null,outward:null,outward2:null
 };
 follow.textContent='⌖ FOLLOW THIS WORD';
 L.close();describe();
}
function repeat(){
 if(!alive()||run.phase!=='choice')return;
 run.phase='seek2';run.pathFrom=Math.max(0,game.path.length-1);describe();
}
function release(){
 if(!alive())return;
 if(run.phase==='done'){hud.hidden=true;run.phase='released';return}
 run.releasedAt=at(game.player.x,game.player.y);
 run.phase='released';hud.hidden=true;
}
follow.addEventListener('click',begin);
$('eRepeat').addEventListener('click',repeat);
$('eRelease').addEventListener('click',release);
const baseRender=render;
render=function(now){baseRender(now);update(now);drawPOV()};
function sidecar(){
 if(!alive())return null;
 return{
  schema:'sleeper.pov-word-echo/v0.1',
  authority:'EVIDENCE_ONLY / SOURCE_WAYPOINT_IS_PROJECTION_NOT_GATE_PROOF',
  worldKey:run.worldKey,sourceHash:run.sourceHash,sourceRange:run.range,
  quote:run.word,origin:[run.origin.x,run.origin.y],
  projectedWaypoint:[run.target.x,run.target.y],projectedSteps:run.target.steps,
  projection:run.target.mapping,sourceOrdinal:run.target.sourceOrdinal,sourceTotal:run.target.sourceTotal,
  phase:run.phase,first:run.first?run.first.map(p=>p.slice()):null,
  second:run.second?run.second.map(p=>p.slice()):null,
  comparison:run.comparison?{...run.comparison}:null,
  releasedAt:run.releasedAt?[run.releasedAt.x,run.releasedAt.y]:null
 };
}
window.SleeperEcho=Object.freeze({begin,repeat,release,sidecar,state});
})();