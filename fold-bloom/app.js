import {
  loadInstrumentState,persistInstrumentState,bindObject,clearObject,setFocus,setOperation,setProjection,
  checkpoint,doReturn,supportFor,projectionHref,foldHref,defaultBloomProjection,identityDescriptor
} from './instrument-state.js';
import {listLocalMedia,putLocalMedia} from './local-media-store.js';
import {createExperienceSet,appendSource,prepareSet} from './set/set-core.js';
import {decodeExperienceSet,encodeExperienceSet} from './experience-set/experience-set.js';

const $=s=>document.querySelector(s);
const SET_STORE='fold-bloom.set-compositor.v01',META_STORE='fold-bloom.set-compositor.meta.v01';
let state=loadInstrumentState(),textRuntime=null,vault=[];

function toast(t){const e=$('#toast');e.textContent=t;e.classList.remove('on');void e.offsetWidth;e.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('on'),1400)}
function save(){state=persistInstrumentState(state);render()}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function hashHex(buf){return crypto.subtle.digest('SHA-256',buf).then(h=>Array.from(new Uint8Array(h),b=>b.toString(16).padStart(2,'0')).join(''))}
async function hashFile(file){return 'sha256:'+await hashHex(await file.arrayBuffer())}
async function hashText(text){return 'sha256:'+await hashHex(new TextEncoder().encode(text))}
function setTextRuntime(id,text){textRuntime=text;try{sessionStorage.setItem('fold-bloom.instrument.text.v01:'+id,text)}catch(_){}}
function getTextRuntime(id){if(textRuntime!=null)return textRuntime;try{return sessionStorage.getItem('fold-bloom.instrument.text.v01:'+id)||''}catch(_){return''}}

function readSet(){
  try{const raw=localStorage.getItem(SET_STORE);return raw?decodeExperienceSet(raw):null}catch(_){return null}
}
function readSetMeta(){try{return JSON.parse(localStorage.getItem(META_STORE)||'{}')||{}}catch(_){return{}}}
function bindLastSet(){
  const set=readSet();
  if(!set||!set.entries?.length){toast('NO AUTHORED SET IN THIS BROWSER');return}
  state=bindObject(state,{kind:'SET',id:set.id,label:set.title||'EXPERIENCE SET',meta:{entries:set.entries.length}});
  save();
}
function ensureAudioInSet(){
  if(state.object.kind!=='AUDIO')return null;
  let set=readSet()||createExperienceSet('UNTITLED SET');
  if(!set.entries.some(e=>e.sourceId===state.object.id))set=appendSource(set,state.object.id);
  set=prepareSet(set);
  const meta=readSetMeta(),record=vault.find(x=>x.sourceId===state.object.id);
  meta[state.object.id]={...(meta[state.object.id]||{}),name:state.object.label,durationSeconds:record?.meta?.durationSeconds||null,origin:'INSTRUMENT'};
  localStorage.setItem(SET_STORE,encodeExperienceSet(set));localStorage.setItem(META_STORE,JSON.stringify(meta));
  return set;
}
function syncSetIdentity(){
  if(state.object.kind!=='SET')return;
  const set=readSet();
  if(set&&set.entries?.length&&set.id!==state.object.id){
    state=bindObject(state,{kind:'SET',id:set.id,label:set.title||'EXPERIENCE SET',meta:{entries:set.entries.length}});
    persistInstrumentState(state);
  }
}
async function bindAudio(file){
  if(!file)return;
  toast('HASHING SOURCE');
  const sourceId=await hashFile(file);
  await putLocalMedia({sourceId,blob:file,name:file.name,type:file.type,size:file.size,lastModified:file.lastModified||0,meta:{origin:'INSTRUMENT',storedAt:new Date().toISOString()}});
  state=bindObject(state,{kind:'AUDIO',id:sourceId,label:file.name,meta:{size:file.size,type:file.type}});
  save();await refreshVault();toast('AUDIO BOUND · EXACT HASH');
}
async function bindText(){
  const text=$('#textInput').value;
  if(!text.trim()){toast('PASTE OR TYPE TEXT');return}
  const id=await hashText(text);
  setTextRuntime(id,text);
  state=bindObject(state,{kind:'TEXT',id,label:'TEXT · '+text.trim().slice(0,42),meta:{chars:text.length}});
  save();toast('TEXT BOUND · SESSION LOCAL');
}
async function refreshVault(){
  vault=await listLocalMedia().catch(()=>[]);
  const box=$('#vaultList');
  if(!vault.length){box.innerHTML='<span class="sourceId">NO LOCAL AUDIO BOUND YET</span>';return}
  box.innerHTML=vault.slice().reverse().map((x,i)=>'<button class="vaultItem" data-vault="'+i+'"><b>'+esc(x.name||'LOCAL AUDIO')+'</b><span>'+esc(x.sourceId)+'</span></button>').join('');
  box.querySelectorAll('[data-vault]').forEach(b=>b.onclick=()=>{
    const x=vault.slice().reverse()[Number(b.dataset.vault)];
    state=bindObject(state,{kind:'AUDIO',id:x.sourceId,label:x.name||x.sourceId,meta:{size:x.size||0,type:x.type||''}});save();
  });
}
function polygon(desc,R){
  const pts=[],cx=200,cy=200,rot=(desc.rotation-90)*Math.PI/180;
  for(let i=0;i<desc.sides;i++){const a=rot+i*Math.PI*2/desc.sides;pts.push([cx+Math.cos(a)*R,cy+Math.sin(a)*R])}
  return pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ')+' Z';
}
function renderGlyph(){
  const id=state.focus.id||state.object.id||'EMPTY',d=identityDescriptor(id),g=$('#glyph');
  const outer=polygon(d,128),inner=polygon(d,128*d.inner);
  g.innerHTML='<circle cx="200" cy="200" r="150" fill="none" stroke="#202a31"/><path d="'+outer+'" fill="#7bd5ff" fill-opacity=".055" stroke="#7bd5ff" stroke-width="2"/><path d="'+inner+'" fill="none" stroke="#ef7849" stroke-width="1.4"/><circle cx="200" cy="200" r="4" fill="#d7b46d"/>';
}
function renderFocusCells(){
  const box=$('#focusCells');box.innerHTML='';
  if(state.object.kind==='TEXT'){
    const text=getTextRuntime(state.object.id),tokens=text.trim().split(/\s+/).filter(Boolean).slice(0,48);
    tokens.forEach((t,i)=>{const id=state.object.id+'#token:'+i,b=document.createElement('button');b.textContent=t;b.className=state.focus.id===id?'on':'';b.onclick=()=>{state=setFocus(state,{id,label:t,address:'token://'+i});save()};box.appendChild(b)});
  }else if(state.object.kind==='SET'){
    const set=readSet(),meta=readSetMeta();
    (set?.entries||[]).forEach((e,i)=>{const b=document.createElement('button');b.textContent=meta[e.sourceId]?.name||('CELL '+(i+1));b.className=state.focus.id===e.sourceId?'on':'';b.onclick=()=>{state=setFocus(state,{id:e.sourceId,label:b.textContent,address:'set://'+set.id+'/'+i});save()};box.appendChild(b)});
  }else if(state.object.kind==='AUDIO'){
    const b=document.createElement('button');b.textContent='WHOLE SOURCE';b.className='on';box.appendChild(b);
  }else box.innerHTML='<span class="sourceId">BIND A SOURCE OR SET</span>';
}
function prepareReadHandoff(){
  const text=getTextRuntime(state.object.id);
  if(!text)throw new Error('TEXT SOURCE IS NO LONGER BOUND IN THIS SESSION');
  sessionStorage.setItem('readfield.handoff.v1',JSON.stringify({source:text,label:state.object.label,returnAddress:'/fold-bloom/',sourceKind:'LOCAL_TEXT',sourceHash:state.object.id}));
}
function launchProjection(proj){
  if(proj==='GLYPH'){state=setProjection(state,'GLYPH');save();return}
  if(state.object.kind==='TEXT'&&proj==='READ')prepareReadHandoff();
  state=checkpoint(setProjection(state,proj),'before '+proj);
  persistInstrumentState(state);
  location.assign(projectionHref(state,proj));
}
function runFold(){
  state=checkpoint(setOperation(state,'FOLD'),'before FOLD');
  if(state.object.kind==='AUDIO'){
    const set=ensureAudioInSet();
    state=bindObject(state,{kind:'SET',id:set.id,label:set.title||'EXPERIENCE SET',meta:{entries:set.entries.length}});
    state=setOperation(state,'FOLD');
  }
  persistInstrumentState(state);location.assign(foldHref(state));
}
function runBloom(){
  state=setOperation(state,'BLOOM');persistInstrumentState(state);
  const p=defaultBloomProjection(state);
  if(p==='GLYPH'){save();return}
  launchProjection(p);
}
function renderNext(){
  const support=supportFor(state),box=$('#nextList'),kind=state.object.kind,items=[];
  if(kind==='AUDIO'){
    items.push(['MAP · LISTEN','exact source → AUDIO MAP','MAP'],['RIDE · LIVE','same source hash → embodied terrain','RIDE'],['FOLD · SET','add exact source ref to current set','FOLD']);
  }else if(kind==='SET'){
    items.push(['FOLD · SET','edit order / weight / seams','FOLD'],['RIDE · SET','current Journey seam sequencer','RIDE']);
  }else if(kind==='TEXT'){
    items.push(['READ · READFIELD','same exact text via session handoff','READ']);
  }else items.push(['BIND ONE OBJECT','audio / text / existing set',null]);
  box.innerHTML=items.map(x=>'<'+(x[2]?'a href="#" data-next="'+x[2]+'"':'span')+' class="'+(x[2]?'ready':'blocked')+'"><b>'+x[0]+'</b><small>'+x[1]+'</small></'+(x[2]?'a':'span')+'>').join('');
  box.querySelectorAll('[data-next]').forEach(a=>a.onclick=e=>{e.preventDefault();const x=a.dataset.next;if(x==='FOLD')runFold();else launchProjection(x)});
}
function render(){
  const support=supportFor(state);
  $('#sourceType').textContent=state.object.kind;$('#sourceName').textContent=state.object.label;$('#sourceId').textContent=state.object.id||'bind one exact object';
  $('#objectKind').textContent=state.object.kind;$('#revision').textContent=state.revision;$('#focusState').textContent=state.focus.label||'—';
  $('#focusLabel').textContent=state.focus.label||state.object.label;$('#focusAddress').textContent=state.focus.address||state.object.id||'—';
  $('#stSource').textContent=state.object.kind+' · '+(state.object.id||'—');$('#stFocus').textContent=state.focus.address||'—';$('#stOp').textContent=state.operation;$('#stProj').textContent=state.projection;$('#stReturn').textContent=state.returnStack.length;
  document.querySelectorAll('[data-op]').forEach(b=>{const op=b.dataset.op;b.disabled=!support.operations.includes(op);b.classList.toggle('on',state.operation===op);b.classList.toggle('supported',support.operations.includes(op))});
  document.querySelectorAll('[data-proj]').forEach(b=>{const p=b.dataset.proj;b.disabled=!support.projections.includes(p);b.classList.toggle('on',state.projection===p);b.classList.toggle('supported',support.projections.includes(p))});
  $('#stage').dataset.foldBloomInstrument='ready';$('#stage').dataset.objectKind=state.object.kind;$('#stage').dataset.support=support.projections.join(',');
  renderGlyph();renderFocusCells();renderNext();
}
$('#audioFile').onchange=e=>{const f=e.target.files?.[0];if(f)bindAudio(f).catch(err=>toast(err.message));e.target.value=''};
$('#bindText').onclick=()=>bindText().catch(err=>toast(err.message));
$('#lastSet').onclick=bindLastSet;
$('#clearSource').onclick=()=>{state=clearObject(state);save()};
document.querySelectorAll('[data-op]').forEach(b=>b.onclick=()=>{
  const op=b.dataset.op;
  try{
    if(op==='FOLD'){runFold();return}
    if(op==='BLOOM'){runBloom();return}
    if(op==='RETURN'){state=doReturn(state);persistInstrumentState(state);render();toast('RETURN');return}
    state=setOperation(state,op);save();
  }catch(err){toast(err.message)}
});
document.querySelectorAll('[data-proj]').forEach(b=>b.onclick=()=>{try{launchProjection(b.dataset.proj)}catch(err){toast(err.message)}});
syncSetIdentity();await refreshVault();render();
window.FoldBloomInstrument={state:()=>JSON.parse(JSON.stringify(state)),support:()=>supportFor(state),bindLastSet,render};