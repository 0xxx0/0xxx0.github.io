(()=>{'use strict';
const PROJECTIONS=['OBJECT','TRANSFER','CONTRACT','EVIDENCE','RETURN'];
const SCALES=['OVERVIEW','MECHANISM','STATE','EVENT','RAW'];
const STORAGE='axial:compositor:0.1';
const els=id=>document.getElementById(id);
const ui={
  object:els('objectSelect'),prev:els('prevObject'),next:els('nextObject'),stage:els('stage'),body:els('body'),
  ringTop:els('ringTop'),ringMid:els('ringMid'),ringBot:els('ringBot'),thetaTicks:els('thetaTicks'),scaleTicks:els('scaleTicks'),
  thetaRead:els('thetaRead'),zRead:els('zRead'),coreLabel:els('coreLabel'),coreScale:els('coreScale'),
  projectionTitle:els('projectionTitle'),projectionBody:els('projectionBody'),stateTitle:els('stateTitle'),stateBody:els('stateBody'),
  trace:els('trace'),traceCount:els('traceCount'),memory:els('memory'),commit:els('commitBtn'),export:els('exportBtn'),reset:els('resetBtn'),
  status:els('status'),kObject:els('kObject'),kTheta:els('kTheta'),kZ:els('kZ')
};
let objects=[],state={objectIndex:0,theta:0,z:0},events=[],memory=[],seq=0,pointer=null;

function clampWrap(n,len){return ((n%len)+len)%len}
function now(){return new Date().toISOString()}
function clone(x){return JSON.parse(JSON.stringify(x))}
function active(){return objects[state.objectIndex]||null}
function snap(){const o=active();return {object_id:o?o.href:null,projection:PROJECTIONS[state.theta],scale:SCALES[state.z],theta_index:state.theta,z_index:state.z}}
function eventId(){seq+=1;return 'ax-'+String(seq).padStart(4,'0')}
function persist(){try{localStorage.setItem(STORAGE,JSON.stringify({state:state,events:events,memory:memory,seq:seq}))}catch(_){}}
function restoreLocal(){
  try{
    const x=JSON.parse(localStorage.getItem(STORAGE)||'null');
    if(!x)return;
    if(x.state)state=x.state;
    if(Array.isArray(x.events))events=x.events;
    if(Array.isArray(x.memory))memory=x.memory;
    if(Number.isInteger(x.seq))seq=x.seq;
  }catch(_){}
}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function compact(v){
  if(v==null)return 'none';
  if(Array.isArray(v))return v.join(' · ');
  if(typeof v==='object')return Object.keys(v).join(' · ');
  return String(v);
}
function addEvent(kind,axis,delta,before,after,input,extra){
  const o=active();
  const e={
    event_id:eventId(),t:now(),object_id:o?o.href:null,
    state_before:before,gesture:{kind:kind,axis:axis,delta:delta,input:input||'ui'},state_after:after,
    evidence:{source:'/showcase-manifest.json',route:o?o.href:null,manifest_state:o&&o.state?o.state:null},
    parent_event:events.length?events[events.length-1].event_id:null
  };
  if(extra)e.meta=extra;
  events.push(e);persist();renderTrace();
  return e;
}
function rotate(delta,input){
  if(!objects.length||!delta)return;
  const before=snap();state.theta=clampWrap(state.theta+delta,PROJECTIONS.length);const after=snap();
  addEvent('rotate','theta',delta,before,after,input);render();
}
function translate(delta,input){
  if(!objects.length||!delta)return;
  const before=snap();state.z=Math.max(0,Math.min(SCALES.length-1,state.z+delta));const after=snap();
  if(before.z_index===after.z_index)return;
  addEvent('translate','z',after.z_index-before.z_index,before,after,input);render();
}
function selectObject(i,input){
  if(!objects.length)return;
  const before=snap();state.objectIndex=clampWrap(i,objects.length);const after=snap();
  addEvent('address','object',state.objectIndex,before,after,input||'selector');render();
}
function commit(input){
  if(!objects.length)return;
  const before=snap(),after=snap();
  const e=addEvent('press','r',1,before,after,input||'commit',{commit:true});
  const m={commit_id:'detent-'+String(memory.length+1).padStart(3,'0'),event_id:e.event_id,t:e.t,state:clone(after)};
  memory.unshift(m);persist();renderMemory();status('COMMITTED / '+m.commit_id+' / '+after.projection+' × '+after.scale);
}
function projectionValue(o,name){
  if(!o)return {title:'NO OBJECT',body:'Manifest unavailable.'};
  const c=o.contract||{};
  if(name==='OBJECT')return {title:o.title||o.href,body:(o.role||((o.operation||'OBJECT')+' · '+(o.state||'UNSPECIFIED')+(o.version?' · '+o.version:'')))};
  if(name==='TRANSFER')return {title:'TRANSFER',body:compact(o.transfer||['No transfer field declared'])};
  if(name==='CONTRACT')return {title:'CONTRACT',body:(c.transforms&&c.transforms.verb?c.transforms.verb:'No transform verb')+' / accepts: '+compact(c.accepts&&c.accepts.kinds)+' / emits: '+compact(c.emits&&c.emits.kinds)};
  if(name==='EVIDENCE')return {title:'EVIDENCE',body:'checks: '+compact(c.evidence&&c.evidence.checks)+' / receipt: '+compact(o.receipt||(c.evidence&&c.evidence.receipt))};
  return {title:'RETURN',body:(c.evidence&&c.evidence.return_path)||o.href||'/'};
}
function scaleValue(o,name){
  const c=o&&o.contract?o.contract:{};
  if(name==='OVERVIEW')return {title:'OVERVIEW',body:(o&&o.operation?o.operation:'—')+' / '+(o&&o.state?o.state:'—')};
  if(name==='MECHANISM')return {title:'MECHANISM',body:(c.transforms&&c.transforms.verb)||'No transform declared'};
  if(name==='STATE')return {title:'STATE',body:'preserves: '+compact(c.transforms&&c.transforms.preserves)+' / reversibility: '+compact(c.transforms&&c.transforms.reversibility)};
  if(name==='EVENT')return {title:'EVENT',body:events.length?events[events.length-1].event_id+' ← '+(events[events.length-1].parent_event||'ROOT'):'No events yet'};
  return {title:'RAW',body:o?JSON.stringify({href:o.href,operation:o.operation,state:o.state,receipt:o.receipt}):'{}'};
}
function renderRings(){
  const labels=PROJECTIONS;
  [ui.ringTop,ui.ringMid,ui.ringBot].forEach((ring,ri)=>{
    ring.style.setProperty('--rot',(state.theta*72+(ri-1)*8)+'deg');
    ring.innerHTML=labels.map((x,i)=>'<span class="'+(i===state.theta?'active':'')+'">'+esc(x)+'</span>').join('');
  });
  ui.body.style.setProperty('--zpx',((state.z-2)*13)+'px');
}
function renderTicks(){
  ui.thetaTicks.innerHTML=PROJECTIONS.map((x,i)=>'<div class="tick '+(i===state.theta?'on':'')+'">'+esc(x)+'<small>'+String(i).padStart(2,'0')+'</small></div>').join('');
  ui.scaleTicks.innerHTML=SCALES.map((x,i)=>'<div class="tick '+(i===state.z?'on':'')+'">'+esc(x)+'<small>z'+i+'</small></div>').join('');
}
function renderTrace(){
  ui.traceCount.textContent=events.length+' event'+(events.length===1?'':'s');
  if(!events.length){ui.trace.innerHTML='<div class="event"><div class="id">ROOT</div><div><b>NO EVENTS</b><p>Manipulate θ / z or commit a detent.</p></div></div>';return}
  ui.trace.innerHTML=events.slice().reverse().map((e,i)=>'<div class="event '+(e.meta&&e.meta.commit?'commit ':'')+(i===0?'current':'')+'"><div class="id">'+esc(e.event_id)+'</div><div><b>'+esc(e.gesture.kind.toUpperCase())+' / '+esc(e.gesture.axis)+'</b><p>'+esc(e.state_before.projection)+' × '+esc(e.state_before.scale)+' → '+esc(e.state_after.projection)+' × '+esc(e.state_after.scale)+'</p></div></div>').join('');
}
function renderMemory(){
  if(!memory.length){ui.memory.innerHTML='<div class="mem"><div><b>NO DETENTS</b><small>PRESS / COMMIT stores the addressed state locally.</small></div></div>';return}
  ui.memory.innerHTML=memory.map((m,i)=>'<div class="mem"><div><b>'+esc(m.commit_id)+' · '+esc(m.state.projection)+' × '+esc(m.state.scale)+'</b><small>'+esc(m.state.object_id)+' · '+esc(m.event_id)+'</small></div><button data-restore="'+i+'">RESTORE</button></div>').join('');
  ui.memory.querySelectorAll('[data-restore]').forEach(b=>b.onclick=()=>{
    const m=memory[Number(b.dataset.restore)],idx=objects.findIndex(o=>o.href===m.state.object_id),before=snap();
    if(idx>=0)state.objectIndex=idx;
    state.theta=m.state.theta_index;state.z=m.state.z_index;
    addEvent('restore','memory',Number(b.dataset.restore),before,snap(),'memory',{from:m.commit_id});render();status('RESTORED / '+m.commit_id);
  });
}
function render(){
  const o=active();if(!o)return;
  state.objectIndex=Math.max(0,Math.min(objects.length-1,state.objectIndex));
  ui.object.value=String(state.objectIndex);
  const p=projectionValue(o,PROJECTIONS[state.theta]),s=scaleValue(o,SCALES[state.z]);
  ui.thetaRead.textContent=PROJECTIONS[state.theta];ui.zRead.textContent=SCALES[state.z];ui.coreLabel.textContent=PROJECTIONS[state.theta];ui.coreScale.textContent=SCALES[state.z];
  ui.projectionTitle.textContent=p.title;ui.projectionBody.textContent=p.body;ui.stateTitle.textContent=s.title;ui.stateBody.textContent=s.body;
  ui.kObject.textContent=(o.title||o.href).replace(/\s+\d+(\.\d+)*$/,'').slice(0,18);ui.kTheta.textContent=PROJECTIONS[state.theta];ui.kZ.textContent=SCALES[state.z];
  renderRings();renderTicks();renderTrace();renderMemory();persist();
}
function status(x){ui.status.textContent=x}
function receipt(){
  return {
    schema:'axial-receipt/v1',surface:'AXIAL COMPOSITOR 0.1',generated:now(),source:'/showcase-manifest.json',
    state:snap(),detents:memory,events:events,
    invariants:['object identity remains manifest address','every state mutation emits before/after event','commit creates explicit restorable detent','state remains local unless exported']
  };
}
function exportReceipt(){
  const r=receipt(),blob=new Blob([JSON.stringify(r,null,2)],{type:'application/json'}),a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download='axial-receipt-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),500);
  status('EXPORTED / '+events.length+' events / '+memory.length+' detents');
}
function reset(){
  state={objectIndex:0,theta:0,z:0};events=[];memory=[];seq=0;try{localStorage.removeItem(STORAGE)}catch(_){};render();status('RESET / local AXIAL state cleared');
}
async function boot(){
  try{
    const data=await fetch('/showcase-manifest.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(String(r.status));return r.json()});
    objects=(data.routes||[]).filter(x=>x.kind==='artifact'&&x.href!=='/axial/');
    if(!objects.length)throw new Error('no artifact routes');
    restoreLocal();
    state.objectIndex=Math.max(0,Math.min(objects.length-1,state.objectIndex||0));
    ui.object.innerHTML=objects.map((o,i)=>'<option value="'+i+'">'+esc(o.title||o.href)+'</option>').join('');
    ui.object.onchange=()=>selectObject(Number(ui.object.value),'selector');
    ui.prev.onclick=()=>selectObject(state.objectIndex-1,'button');
    ui.next.onclick=()=>selectObject(state.objectIndex+1,'button');
    ui.commit.onclick=()=>commit('button');ui.export.onclick=exportReceipt;ui.reset.onclick=reset;
    render();status('READY / '+objects.length+' addressed showcase artifacts / local persistence ON');
  }catch(err){status('BOOT ERROR / '+err.message);ui.projectionBody.textContent='Could not load /showcase-manifest.json';}
}
ui.stage.addEventListener('pointerdown',e=>{pointer={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY};ui.stage.setPointerCapture(e.pointerId);ui.stage.focus()});
ui.stage.addEventListener('pointermove',e=>{
  if(!pointer||pointer.id!==e.pointerId)return;
  const dx=e.clientX-pointer.lastX,dy=e.clientY-pointer.lastY;
  if(Math.abs(dx)>=28){const d=dx>0?1:-1;rotate(d,'pointer');pointer.lastX=e.clientX;}
  if(Math.abs(dy)>=28){const d=dy>0?1:-1;translate(d,'pointer');pointer.lastY=e.clientY;}
});
function endPointer(e){if(pointer&&pointer.id===e.pointerId)pointer=null}
ui.stage.addEventListener('pointerup',endPointer);ui.stage.addEventListener('pointercancel',endPointer);
ui.stage.addEventListener('wheel',e=>{e.preventDefault();if(e.shiftKey)rotate(e.deltaY>0?1:-1,'wheel');else translate(e.deltaY>0?1:-1,'wheel')},{passive:false});
addEventListener('keydown',e=>{
  const tag=(document.activeElement&&document.activeElement.tagName)||'';
  if(tag==='SELECT'||tag==='INPUT')return;
  if(e.key==='ArrowLeft'){e.preventDefault();rotate(-1,'keyboard')}
  else if(e.key==='ArrowRight'){e.preventDefault();rotate(1,'keyboard')}
  else if(e.key==='ArrowUp'){e.preventDefault();translate(-1,'keyboard')}
  else if(e.key==='ArrowDown'){e.preventDefault();translate(1,'keyboard')}
  else if(e.key==='['){e.preventDefault();selectObject(state.objectIndex-1,'keyboard')}
  else if(e.key===']'){e.preventDefault();selectObject(state.objectIndex+1,'keyboard')}
  else if(e.key===' '||e.key==='Enter'){if(document.activeElement===ui.stage||tag==='BODY'){e.preventDefault();commit('keyboard')}}
});
boot();
})();