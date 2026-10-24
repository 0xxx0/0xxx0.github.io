/* ROOM projection bridge: DOM is the only executable program.
   ROOM and PLAIN are readonly projections; RAIL retains the original editing surface. */
(()=>{'use strict';
const RM=window.RoomMaterial;
if(!RM){document.documentElement.dataset.projectionError='missing-room-material';return}
const program=()=>document.getElementById('program');
const block=id=>id?[...program().querySelectorAll('.block')].find(e=>e.id===id)||null:null;
const directSeam=el=>el?.querySelector(':scope > .body > .seam.out > a[rel="next"]')||null;
const nextId=el=>(directSeam(el)?.getAttribute('href')||'').replace(/^#/,'');
const typeOf=(el,key)=>el?.dataset?.[key]||'UNSPECIFIED';
const labelOf=el=>el?.querySelector(':scope > summary')?.childNodes[0]?.textContent.trim()||el?.id||'UNMAPPED';
const descOf=el=>el?.querySelector(':scope > .body > .desc')?.textContent.trim()||'No description recorded';
const findPredecessor=id=>[...program().querySelectorAll('.block')].find(el=>nextId(el)===id)||null;
const $=s=>document.querySelector(s);
const faces=[
 {id:'F',axis:'+Z',role:'PRESENT',rx:0,ry:0},
 {id:'L',axis:'-X',role:'INPUT',rx:0,ry:90},
 {id:'U',axis:'+Y',role:'INTENTION',rx:90,ry:0},
 {id:'R',axis:'+X',role:'OUTPUT',rx:0,ry:-90},
 {id:'B',axis:'-Z',role:'RETURN',rx:0,ry:180},
 {id:'D',axis:'-Y',role:'GROUND',rx:-90,ry:0}
];
let mode='plain',face='F';
const stage=$('.stage'),toolbar=$('.tools');
const chooser=document.createElement('label');
chooser.className='projectionChoice';
chooser.textContent='VIEW ';
const select=document.createElement('select');
select.id='projectionMode';select.setAttribute('aria-label','Projection of the same program');
[['plain','PLAIN / read'],['rail','RAIL / compose'],['room','ROOM / relations']].forEach(([v,t])=>{
 const opt=document.createElement('option');opt.value=v;opt.textContent=t;select.appendChild(opt)
});
chooser.appendChild(select);toolbar.prepend(chooser);
const lens=document.createElement('aside');
lens.id='roomLens';lens.setAttribute('aria-label','ROOM semantic relation projection');
lens.innerHTML='<div class="roomLensHead"><b>ROOM / SIX RELATIONS</b><span>One DOM program · no second graph</span></div><div class="cubeStage"><div id="relationCube" class="relationCube" aria-hidden="false"></div></div><div class="roomLensBottom"><div id="faceNavigation" class="faceNavigation" role="group" aria-label="Room faces"></div><p class="roomReadout" id="roomReadout"></p><button type="button" id="unfoldRoom">UNFOLD → PLAIN</button></div>';
stage.appendChild(lens);
const cube=lens.querySelector('#relationCube'),nav=lens.querySelector('#faceNavigation');
const sections={};
faces.forEach(f=>{
 const section=document.createElement('section');section.className='cubeFace';section.dataset.face=f.id;
 const side=document.createElement('div');side.className='cubeContent';
 const ey=document.createElement('div');ey.className='cubeEy';
 const title=document.createElement('strong');title.className='cubeTitle';
 const detail=document.createElement('div');detail.className='cubeDetail';
 const action=document.createElement('button');action.className='cubeAction';action.type='button';
 side.append(ey,title,detail,action);section.appendChild(side);cube.appendChild(section);
 sections[f.id]={section,ey,title,detail,action};
 const b=document.createElement('button');b.type='button';b.textContent=f.id;b.title=f.axis+' / '+f.role;
 b.setAttribute('aria-label',f.role+' '+f.axis);
 b.dataset.face=f.id;b.addEventListener('click',()=>setFace(f.id));
 nav.appendChild(b)
});
function inspect(){
 const focus=RM.snapshot().focus,held=block(focus),root=block(program()?.dataset?.entry);
 const parent=held?.parentElement?.closest('.block')||null;
 const pred=findPredecessor(focus);
 const successor=block(nextId(held));
 const verifier=[...program().querySelectorAll('.block')].find(el=>el.dataset.op==='VERIFY')||null;
 const terminal=[...program().querySelectorAll('.block')].find(el=>el.dataset.op==='RETURN')||null;
 const receipt=RM.returnReceipt(),run=receipt?.run;
 const seam=directSeam(held);
 const out=typeOf(held,'typeOut'),into=typeOf(successor,'typeIn');
 const match=!seam||!!successor&&(out===into||out==='ANY'||into==='ANY');
 return {
  focus,entry:root?.id||null,mode,face,
  relations:{
   F:{target:held?.id||null,title:labelOf(held),detail:held?'#'+held.id+' · '+(held.dataset.op||'PASS')+' · '+typeOf(held,'typeIn')+' → '+out+'\n'+descOf(held):'No held block'},
   L:{target:(pred||parent)?.id||null,title:labelOf(pred||parent),detail:pred?'Comes from #'+pred.id+' · '+typeOf(pred,'typeOut')+' → '+typeOf(held,'typeIn')+'\n'+descOf(pred):parent?'Contained in #'+parent.id+'\n'+descOf(parent):'No declared incoming seam'},
   U:{target:(parent||root)?.id||null,title:labelOf(parent||root),detail:parent?'This block is implemented inside #'+parent.id+'\n'+descOf(parent):'Program entry #'+(root?.id||'UNKNOWN')+'\n'+descOf(root)},
   R:{target:successor?.id||null,title:successor?labelOf(successor):'NO OUTPUT',detail:seam?(match?'TYPE MATCH · ':'TYPE MISMATCH · ')+out+' → '+into+'\n'+(successor?descOf(successor):'Broken target #'+nextId(held)):'No declared outgoing seam'},
   B:{target:terminal?.id||null,title:run?'RUN RECEIPT':'NOT YET RUN',detail:run?'Steps '+run.trace.length+' · result '+(run.result?.status||'recorded')+'\nExecution trace is available under RETURN.':'No execution witness. Run the visible DOM before treating this as proof.'},
   D:{target:verifier?.id||null,title:verifier?labelOf(verifier):'NO VERIFY',detail:verifier?'#'+verifier.id+' · '+descOf(verifier)+'\nPhysical contract remains independent.':'No evidence operator declared'}
  }
 }
}
function unfoldAt(id){
 setView('plain');
 const target=block(id);
 if(!target)return;
 for(let i=0;i<16;i++){
  const scope=RM.snapshot().scope;
  if(!scope||block(scope)?.contains(target))break;
  RM.back();
 }
 RM.focusOn(id);
}
function draw(){
 if(!program())return;
 const s=inspect(),r=s.relations;
 faces.forEach(f=>{
  const el=sections[f.id],d=r[f.id];
  el.ey.textContent=f.id+' '+f.axis+' / '+f.role;
  el.title.textContent=d.title;
  el.detail.textContent=d.detail;
  el.action.textContent=d.target?'UNFOLD AT #'+d.target:'UNFOLD AT HELD';
  el.action.disabled=false;
  el.action.onclick=()=>unfoldAt(d.target||s.focus)
 });
 const active=faces.find(f=>f.id===face)||faces[0];
 cube.style.setProperty('--cube-rx',active.rx+'deg');
 cube.style.setProperty('--cube-ry',active.ry+'deg');
 faces.forEach(f=>sections[f.id].section.classList.toggle('active',f.id===face));
 [...nav.querySelectorAll('button')].forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.face===face)));
 lens.querySelector('#roomReadout').textContent='#'+(s.focus||'—')+' · '+active.axis+' '+active.role+' · '+(r[face].target?'#'+r[face].target:'NO TARGET');
}
function setFace(id){
 if(!faces.some(f=>f.id===id))return;
 face=id;if(mode==='room')draw();
}
function setView(next){
 if(!['plain','rail','room'].includes(next))throw new Error('Unknown projection '+next);
 mode=next;document.body.dataset.projection=next;select.value=next;
 if(next==='room')draw();
}
select.addEventListener('change',()=>setView(select.value));
lens.querySelector('#unfoldRoom').addEventListener('click',()=>setView('plain'));
function audit(){
 const all=[...program().querySelectorAll('.block')],ids=all.map(x=>x.id),issues=[];
 if(new Set(ids).size!==ids.length)issues.push('DUPLICATE_BLOCK_ID');
 for(const el of all){const a=directSeam(el);if(!a)continue;
  const dest=block(nextId(el)),out=typeOf(el,'typeOut'),into=typeOf(dest,'typeIn');
  if(!dest)issues.push('MISSING_TARGET '+el.id+' → '+nextId(el));
  else if(out!==into&&out!=='ANY'&&into!=='ANY')issues.push('TYPE_MISMATCH '+el.id+' → '+dest.id+' ('+out+' / '+into+')');
 }
 return{blocks:all.length,links:all.filter(directSeam).length,issues};
}
function roundTrip(){
 const original=mode,faceBefore=face,src=RM.source(),state=RM.snapshot(),bindingBefore=JSON.stringify(RM.binding());
 setView('room');setFace('R');setView('plain');setView('rail');
 const equal=src===RM.source(),snapshotSame=JSON.stringify(RM.snapshot())===JSON.stringify(state),bindingSame=JSON.stringify(RM.binding())===bindingBefore;
 face=faceBefore;setView(original);
 return{pass:equal&&snapshotSame&&bindingSame,same_program:equal,same_snapshot:snapshotSame,same_binding:bindingSame,original_view:original,audit:audit()};
}
let requested=String(new URLSearchParams(location.search).get('view')||'plain').toLowerCase();
setView(['plain','rail','room'].includes(requested)?requested:'plain');
document.addEventListener('click',e=>{if(e.target.closest('.tools,.viewport'))requestAnimationFrame(()=>{if(mode==='room')draw()})});
document.addEventListener('input',()=>{if(mode==='room')requestAnimationFrame(draw)});
document.addEventListener('keydown',e=>{
 if(mode!=='room')return;
 if(e.target.closest('#roomLens')&&e.key==='Enter'){e.stopPropagation();return}
 if(e.target.closest('input,textarea,select'))return;
 const i=faces.findIndex(f=>f.id===face);
 if(e.key==='ArrowLeft'){e.preventDefault();e.stopPropagation();setFace(faces[(i+faces.length-1)%faces.length].id)}
 else if(e.key==='ArrowRight'){e.preventDefault();e.stopPropagation();setFace(faces[(i+1)%faces.length].id)}
 else if(e.key.toLowerCase()==='p'){e.preventDefault();setView('plain')}
 else if(e.key>='1'&&e.key<='6'){e.preventDefault();setFace(faces[Number(e.key)-1].id)}
},true);
new MutationObserver(()=>{if(mode==='room')draw()}).observe($('.viewport'),{subtree:true,childList:true});
window.RoomProjection={setView,setFace,inspect,audit,roundTrip,snapshot:()=>({mode,face,focus:RM.snapshot().focus})};
if(new URLSearchParams(location.search).has('projectiontest')){
 const p=document.createElement('pre');p.id='projectionTest';p.className='projectionTest';stage.appendChild(p);
 try{const r=roundTrip();p.textContent=(r.pass?'PASS':'FAIL')+' · SAME DOM / FOCUS · '+r.audit.issues.join(' | ')}catch(e){p.textContent='FAIL · '+e.message}
}
})();