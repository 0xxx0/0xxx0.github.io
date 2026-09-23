import {listLocalMedia,putLocalMedia} from './local-media-store.js';
import {createExperienceSet,appendSource,prepareSet} from './set/set-core.js';
import {decodeExperienceSet,encodeExperienceSet} from './experience-set/experience-set.js';
import {normalizeActive,supportFor,defaultBloomProjection,routeFor,foldRoute,projectionSpec,identityDescriptor} from './instrument-support.js';

const $=s=>document.querySelector(s);
document.documentElement.dataset.fbModule='ready';
const I=globalThis.Interphase;
if(!I)throw new Error('INTERPHASE 0.2 REQUIRED');

const SET_STORE='fold-bloom.set-compositor.v01';
const META_STORE='fold-bloom.set-compositor.meta.v01';
const ACTIVE_KEY='fold-bloom.instrument.active.v01';
const RETURN_KEY='fold-bloom.instrument.return-handoff.v01';
const TEXT_PREFIX='fold-bloom.instrument.text.v01:';

let active=loadActive(),operation='FOCUS',textRuntime=null,vault=[];

function clone(x){return JSON.parse(JSON.stringify(x))}
function toast(t){const e=$('#toast');e.textContent=t;e.classList.remove('on');void e.offsetWidth;e.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('on'),1400)}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[m]))}
function hashHex(buf){return crypto.subtle.digest('SHA-256',buf).then(h=>Array.from(new Uint8Array(h),b=>b.toString(16).padStart(2,'0')).join(''))}
async function hashFile(file){return 'sha256:'+await hashHex(await file.arrayBuffer())}
async function hashText(text){return 'sha256:'+await hashHex(new TextEncoder().encode(text))}

function loadActive(){try{return normalizeActive(JSON.parse(sessionStorage.getItem(ACTIVE_KEY)||'null'))}catch(_){return normalizeActive()}}
function persistActive(){try{sessionStorage.setItem(ACTIVE_KEY,JSON.stringify(active))}catch(_){}return active}
function clearActivePointer(){active=normalizeActive();persistActive()}
function setTextRuntime(id,text){textRuntime=text;try{sessionStorage.setItem(TEXT_PREFIX+id,text)}catch(_){}}
function getTextRuntime(id){if(textRuntime!=null&&active.id===id)return textRuntime;try{return sessionStorage.getItem(TEXT_PREFIX+id)||''}catch(_){return''}}
function readSet(){try{const raw=localStorage.getItem(SET_STORE);return raw?decodeExperienceSet(raw):null}catch(_){return null}}
function readSetMeta(){try{return JSON.parse(localStorage.getItem(META_STORE)||'{}')||{}}catch(_){return{}}}

function focusDescriptor(id){
  if(!id)return null;
  try{return host.describe(id)}catch(_){return{id,label:id,address:{value:id}}}
}
function textToken(id){
  if(active.kind!=='TEXT'||!id.startsWith(active.id+'#token:'))return null;
  const n=Number(id.slice(id.lastIndexOf(':')+1)),tokens=getTextRuntime(active.id).trim().split(/\s+/).filter(Boolean);
  return Number.isInteger(n)&&tokens[n]!=null?{index:n,text:tokens[n]}:null;
}
function setCell(id){
  if(active.kind!=='SET')return null;
  const set=readSet(),i=set?.entries?.findIndex(e=>e.sourceId===id)??-1;
  return i>=0?{index:i,entry:set.entries[i]}:null;
}
function describeRef(ref){
  const id=String(ref||active.id||'');
  const token=textToken(id);
  if(token)return{id,kind:'token',label:token.text,address:{source:active.id,token:token.index},channels:['identity','address','content'],capabilities:['read'],operations:[],authority:'VIEW',value:{text:token.text,index:token.index}};
  const cell=setCell(id);
  if(cell){const meta=readSetMeta()[id]||{};return{id,kind:'source-cell',label:meta.name||('CELL '+(cell.index+1)),address:{set:active.id,index:cell.index,sourceId:id},channels:['identity','address','content','depth','authority'],capabilities:['read'],operations:[],authority:'VIEW',value:{entry:cell.entry,meta}}}
  if(id!==active.id)throw new Error('FOLD_BLOOM_REF_UNRESOLVED:'+id);
  const base={id:active.id||'fold-bloom:empty',label:active.label,address:{id:active.id},capabilities:['read'],authority:'VIEW'};
  if(active.kind==='AUDIO')return{...base,kind:'audio-source',channels:['identity','address','content','time','authority','evidence'],operations:[{id:'MAP',authority:'VIEW'},{id:'RIDE',authority:'VIEW'},{id:'FOLD',authority:'EDIT'}],value:{...active.meta}};
  if(active.kind==='TEXT')return{...base,kind:'text-source',channels:['identity','address','content','depth','authority'],operations:[{id:'READ',authority:'VIEW'}],value:{chars:active.meta?.chars||getTextRuntime(active.id).length}};
  if(active.kind==='SET')return{...base,kind:'experience-set',channels:['identity','address','content','depth','authority','evidence'],operations:[{id:'FOLD',authority:'EDIT'},{id:'RIDE',authority:'VIEW'}],value:{entries:active.meta?.entries||readSet()?.entries?.length||0}};
  return{...base,kind:'empty',channels:['identity','address'],operations:[],value:null};
}
const adapter={
  id:'fold-bloom',
  idOf:r=>String(r||active.id||'fold-bloom:empty'),
  resolve:r=>String(r||active.id||'fold-bloom:empty'),
  describe:describeRef,
  read:ref=>describeRef(ref).value,
  capture:()=>({active:clone(active)}),
  restore:s=>{active=normalizeActive(s?.active);persistActive()},
  invoke:(_r,op)=>({ok:false,reason:'DOMAIN_OPERATION_OWNED_BY_HOST:'+op})
};
const host=I.createHost(adapter,{id:'FOLD_BLOOM',projection:'GLYPH',projections:projectionSpec()});
document.documentElement.dataset.fbHost='ready';

function returnFrames(){try{const x=JSON.parse(sessionStorage.getItem(RETURN_KEY)||'[]');return Array.isArray(x)?x:[]}catch(_){return[]}}
function writeReturnFrames(xs){try{sessionStorage.setItem(RETURN_KEY,JSON.stringify(xs.slice(-12)))}catch(_){}}
function captureExternalReturn(label){
  const frame=host.captureReturn(label),xs=returnFrames();xs.push(frame);writeReturnFrames(xs);return frame;
}
function restoreFrame(frame){
  if(!frame)return false;
  adapter.restore(frame.adapter);
  host.clearSelection();host.clearFocus();
  for(const id of frame.state?.selection||[])host.select(id,{add:true});
  for(const x of frame.state?.focus||[])host.focus(x.id,{add:true,aperture:x.aperture||'DETAIL'});
  host.project(frame.state?.projection||'GLYPH',frame.state?.projectionParams||{});
  return true;
}
function explicitReturn(){
  let frame=host.return();
  if(!frame){const xs=returnFrames();frame=xs.pop()||null;writeReturnFrames(xs);if(frame)restoreFrame(frame)}
  operation='RETURN';render();if(frame)toast('RETURN');else toast('NO RETURN FRAME');
}
function syncHost({resetProjection=true}={}){
  host.clearSelection();host.clearFocus();
  if(active.kind!=='EMPTY'&&active.id){host.select(active.id);host.focus(active.id,{aperture:'WHOLE'})}
  if(resetProjection)host.project('GLYPH',{host:'FOLD_BLOOM'});
}
function bindActive(next,{resetProjection=true}={}){
  active=normalizeActive(next);persistActive();operation='FOCUS';syncHost({resetProjection});render();return active;
}

function bindLastSet(){
  const set=readSet();
  if(!set||!set.entries?.length){toast('NO AUTHORED SET IN THIS BROWSER');return}
  bindActive({kind:'SET',id:set.id,label:set.title||'EXPERIENCE SET',meta:{entries:set.entries.length}});
}
function ensureAudioInSet(){
  if(active.kind!=='AUDIO')return null;
  let set=readSet()||createExperienceSet('UNTITLED SET');
  if(!set.entries.some(e=>e.sourceId===active.id))set=appendSource(set,active.id);
  set=prepareSet(set);
  const meta=readSetMeta(),record=vault.find(x=>x.sourceId===active.id);
  meta[active.id]={...(meta[active.id]||{}),name:active.label,durationSeconds:record?.meta?.durationSeconds||null,origin:'INSTRUMENT'};
  localStorage.setItem(SET_STORE,encodeExperienceSet(set));localStorage.setItem(META_STORE,JSON.stringify(meta));
  return set;
}
function syncSetIdentity(){
  if(active.kind!=='SET')return;
  const set=readSet();
  if(set&&set.entries?.length&&set.id!==active.id){
    active=normalizeActive({kind:'SET',id:set.id,label:set.title||'EXPERIENCE SET',meta:{entries:set.entries.length}});
    persistActive();
  }
}
async function bindAudio(file){
  if(!file)return;
  toast('HASHING SOURCE');
  const sourceId=await hashFile(file);
  await putLocalMedia({sourceId,blob:file,name:file.name,type:file.type,size:file.size,lastModified:file.lastModified||0,meta:{origin:'INSTRUMENT',storedAt:new Date().toISOString()}});
  bindActive({kind:'AUDIO',id:sourceId,label:file.name,meta:{size:file.size,type:file.type}});
  await refreshVault();toast('AUDIO BOUND · EXACT HASH');
}
async function bindText(){
  const text=$('#textInput').value;
  if(!text.trim()){toast('PASTE OR TYPE TEXT');return}
  const id=await hashText(text);
  setTextRuntime(id,text);
  bindActive({kind:'TEXT',id,label:'TEXT · '+text.trim().slice(0,42),meta:{chars:text.length}});
  toast('TEXT BOUND · SESSION LOCAL');
}
async function refreshVault(){
  vault=await listLocalMedia().catch(()=>[]);
  const box=$('#vaultList');
  if(!vault.length){box.innerHTML='<span class="sourceId">NO LOCAL AUDIO BOUND YET</span>';return}
  const rev=vault.slice().reverse();
  box.innerHTML=rev.map((x,i)=>'<button class="vaultItem" data-vault="'+i+'"><b>'+esc(x.name||'LOCAL AUDIO')+'</b><span>'+esc(x.sourceId)+'</span></button>').join('');
  box.querySelectorAll('[data-vault]').forEach(b=>b.onclick=()=>{const x=rev[Number(b.dataset.vault)];bindActive({kind:'AUDIO',id:x.sourceId,label:x.name||x.sourceId,meta:{size:x.size||0,type:x.type||''}})});
}

function polygon(desc,R){
  const pts=[],cx=200,cy=200,rot=(desc.rotation-90)*Math.PI/180;
  for(let i=0;i<desc.sides;i++){const a=rot+i*Math.PI*2/desc.sides;pts.push([cx+Math.cos(a)*R,cy+Math.sin(a)*R])}
  return pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ')+' Z';
}
function drawGlyph(id,label,address,{draft=false}={}){
  const d=identityDescriptor(id||'EMPTY'),g=$('#glyph'),outer=polygon(d,128),inner=polygon(d,128*d.inner);
  g.innerHTML='<circle cx="200" cy="200" r="150" fill="none" stroke="#202a31"/><path d="'+outer+'" fill="#7bd5ff" fill-opacity="'+(draft?'.025':'.055')+'" stroke="#7bd5ff" stroke-width="2"/><path d="'+inner+'" fill="none" stroke="#ef7849" stroke-width="1.4"/><circle cx="200" cy="200" r="4" fill="#d7b46d"/>';
  $('#focusLabel').textContent=label||'NO SOURCE';$('#focusAddress').textContent=address||'—';
}
function currentFocus(){
  const s=host.snapshot().state,x=s.focus[s.focus.length-1]||null;
  if(!x)return null;const d=focusDescriptor(x.id);return{x,...d};
}
function renderGlyph(){
  const f=currentFocus(),id=f?.id||active.id||'EMPTY';
  drawGlyph(id,f?.label||active.label,f?.address?.token!=null?('token://'+f.address.token):(f?.address?.index!=null?('set://'+f.address.set+'/'+f.address.index):(active.id||'—')));
}
function renderFocusCells(){
  const box=$('#focusCells');box.innerHTML='';const f=currentFocus();
  if(active.kind==='TEXT'){
    const tokens=getTextRuntime(active.id).trim().split(/\s+/).filter(Boolean).slice(0,72);
    tokens.forEach((t,i)=>{const id=active.id+'#token:'+i,b=document.createElement('button');b.textContent=t;b.className=f?.id===id?'on':'';b.onclick=()=>{operation='FOCUS';host.focus(id,{aperture:'TOKEN'});render()};box.appendChild(b)});
  }else if(active.kind==='SET'){
    const set=readSet(),meta=readSetMeta();
    (set?.entries||[]).forEach((e,i)=>{const b=document.createElement('button');b.textContent=meta[e.sourceId]?.name||('CELL '+(i+1));b.className=f?.id===e.sourceId?'on':'';b.onclick=()=>{operation='FOCUS';host.focus(e.sourceId,{aperture:'CELL'});render()};box.appendChild(b)});
  }else if(active.kind==='AUDIO'){
    const b=document.createElement('button');b.textContent='WHOLE SOURCE';b.className='on';b.onclick=()=>{host.focus(active.id,{aperture:'WHOLE'});render()};box.appendChild(b);
  }else box.innerHTML='<span class="sourceId">BIND A SOURCE OR SET</span>';
}
function prepareReadHandoff(){
  const text=getTextRuntime(active.id);
  if(!text)throw new Error('TEXT SOURCE IS NO LONGER BOUND IN THIS SESSION');
  sessionStorage.setItem('readfield.handoff.v1',JSON.stringify({source:text,label:active.label,returnAddress:'/fold-bloom/',sourceKind:'LOCAL_TEXT',sourceHash:active.id}));
}
function launchProjection(proj){
  if(proj==='GLYPH'){operation='FOCUS';host.project('GLYPH',{host:'FOLD_BLOOM'});render();return}
  if(active.kind==='TEXT'&&proj==='READ')prepareReadHandoff();
  captureExternalReturn('before '+proj);
  host.project(proj,{source:active.id});
  persistActive();
  location.assign(routeFor(active,proj));
}
function runFold(){
  operation='FOLD';captureExternalReturn('before FOLD');
  if(active.kind==='AUDIO'){
    const set=ensureAudioInSet();
    active=normalizeActive({kind:'SET',id:set.id,label:set.title||'EXPERIENCE SET',meta:{entries:set.entries.length}});
    persistActive();syncHost({resetProjection:true});
  }
  location.assign(foldRoute(active));
}
function runBloom(){
  operation='BLOOM';const p=defaultBloomProjection(active);
  if(p==='GLYPH'){host.project('GLYPH',{host:'FOLD_BLOOM'});render();return}
  launchProjection(p);
}
function renderNext(){
  const box=$('#nextList'),kind=active.kind,items=[];
  if(kind==='AUDIO')items.push(['MAP · LISTEN','exact source → AUDIO MAP','MAP'],['RIDE · LIVE','same exact source → embodied terrain','RIDE'],['FOLD · SET','source ref → authored set','FOLD']);
  else if(kind==='SET')items.push(['FOLD · SET','edit order / weight / seams','FOLD'],['RIDE · SET','current Journey seam sequencer','RIDE']);
  else if(kind==='TEXT')items.push(['READ · READFIELD','same exact text via session handoff','READ']);
  else items.push(['BIND ONE OBJECT','audio / text / existing set',null]);
  box.innerHTML=items.map(x=>'<'+(x[2]?'a href="#" data-next="'+x[2]+'"':'span')+' class="'+(x[2]?'ready':'blocked')+'"><b>'+x[0]+'</b><small>'+x[1]+'</small></'+(x[2]?'a':'span')+'>').join('');
  box.querySelectorAll('[data-next]').forEach(a=>a.onclick=e=>{e.preventDefault();const x=a.dataset.next;if(x==='FOLD')runFold();else launchProjection(x)});
}
function returnDepth(){return host.snapshot().return_depth+returnFrames().length}
function render(){
  const support=supportFor(active),snap=host.snapshot(),f=currentFocus();
  $('#sourceType').textContent=active.kind;$('#sourceName').textContent=active.label;$('#sourceId').textContent=active.id||'bind one exact object';
  $('#objectKind').textContent=active.kind;$('#revision').textContent=snap.state.revision;$('#focusState').textContent=f?.label||'—';
  $('#stSource').textContent=active.kind+' · '+(active.id||'—');$('#stFocus').textContent=f?.id||'—';$('#stOp').textContent=operation;$('#stProj').textContent=snap.state.projection;$('#stReturn').textContent=returnDepth();
  document.querySelectorAll('[data-op]').forEach(b=>{const op=b.dataset.op,ok=support.operations.includes(op)&&(op!=='RETURN'||returnDepth()>0);b.disabled=!ok;b.classList.toggle('on',operation===op);b.classList.toggle('supported',ok)});
  document.querySelectorAll('[data-proj]').forEach(b=>{const p=b.dataset.proj,ok=support.projections.includes(p);b.disabled=!ok;b.classList.toggle('on',snap.state.projection===p);b.classList.toggle('supported',ok)});
  $('#stage').dataset.foldBloomInstrument='ready';$('#stage').dataset.objectKind=active.kind;$('#stage').dataset.support=support.projections.join(',');$('#stage').dataset.interphase=I.VERSION;
  renderGlyph();renderFocusCells();renderNext();
}

$('#audioFile').onchange=e=>{const f=e.target.files?.[0];if(f)bindAudio(f).catch(err=>toast(err.message));e.target.value=''};
$('#bindText').onclick=()=>bindText().catch(err=>toast(err.message));
$('#lastSet').onclick=bindLastSet;
$('#clearSource').onclick=()=>{clearActivePointer();bindActive(active)};
$('#textInput').oninput=e=>{
  const text=e.target.value;
  if(!text.trim()||active.kind!=='EMPTY')return renderGlyph();
  drawGlyph('draft:'+text,'DRAFT INPUT · '+text.length+' CHARS','UNBOUND · projection only',{draft:true});
};
document.querySelectorAll('[data-op]').forEach(b=>b.onclick=()=>{
  try{
    const op=b.dataset.op;
    if(op==='FOLD')return runFold();
    if(op==='BLOOM')return runBloom();
    if(op==='RETURN')return explicitReturn();
    operation='FOCUS';render();
  }catch(err){toast(err.message)}
});
document.querySelectorAll('[data-proj]').forEach(b=>b.onclick=()=>{try{launchProjection(b.dataset.proj)}catch(err){toast(err.message)}});

syncSetIdentity();syncHost({resetProjection:true});render();document.documentElement.dataset.fbReady='ready';refreshVault().catch(()=>{});
window.FoldBloomInstrument={host,state:()=>({active:clone(active),interphase:host.snapshot(),operation,support:supportFor(active)}),support:()=>supportFor(active),bindLastSet,render};
