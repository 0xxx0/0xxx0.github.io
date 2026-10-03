import {parseAndEvaluate,AXES} from './bench.mjs';

const $=id=>document.getElementById(id),qa=s=>[...document.querySelectorAll(s)];
const KEY='omnitools.work-object.v01';
let mode='bench',trace=[],lastBench=null,lastPreview=null,hashSeq=0;
const panes={bench:$('benchPane'),...Object.fromEntries(qa('.toolPane').map(x=>[x.dataset.mode,x]))};
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const clip=(s,n=900)=>{s=String(s??'').replace(/\s+/g,' ').trim();return s.length>n?s.slice(0,n-1)+'…':s};
const currentObject=()=>({name:$('sourceName').value.trim()||'UNTITLED',text:$('sourceText').value});

function save(){try{sessionStorage.setItem(KEY,JSON.stringify(currentObject()))}catch{}}
function restore(){
  try{
    const o=JSON.parse(sessionStorage.getItem(KEY)||'null');
    if(o){$('sourceName').value=o.name==='UNTITLED'?'':o.name;$('sourceText').value=o.text||''}
  }catch{}
  updateSourceMeta();
}
async function digest(text){
  if(!text)return'EMPTY';
  try{
    const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
    return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('').slice(0,12);
  }catch{return'UNHASHED'}
}
async function updateSourceMeta(){
  const seq=++hashSeq,o=currentObject(),h=await digest(o.text);
  if(seq!==hashSeq)return;
  $('charCount').textContent=o.text.length;
  $('sourceHash').textContent=h;
  $('sourceSpine').textContent=o.text?o.name:'EMPTY';
  $('sourceSpineMeta').textContent=o.text?(o.text.length+' CH · sha256:'+h):'SESSION ONLY · NOTHING UPLOADED';
  save();
}
function addTrace(kind,detail,preview=''){
  trace.unshift({at:new Date().toISOString(),kind,mode,detail,preview:clip(preview,600)});
  trace=trace.slice(0,12);renderTrace();$('returnState').textContent=kind+' · '+mode.toUpperCase();
}
function renderTrace(){
  $('trace').innerHTML='<div class="traceLabel">TRACE</div>'+(trace.length?trace.map(x=>'<div class="traceItem"><b>'+esc(x.kind+' · '+x.mode.toUpperCase())+'</b><span>'+esc(x.detail)+'</span></div>').join(''):'<div class="traceItem"><b>EMPTY</b><span>load or evaluate one object</span></div>');
}
function select(next){
  if(!panes[next])return;
  mode=next;
  Object.entries(panes).forEach(([k,p])=>p.hidden=k!==mode);
  qa('[data-mode]').forEach(b=>b.classList.toggle('on',b.dataset.mode===mode));
  $('loadMode').textContent='LOAD → '+mode.toUpperCase();
  const u=new URL(location.href);u.searchParams.set('tool',mode);history.replaceState(null,'',u);
}
async function waitFrame(frame){
  if(frame.contentDocument?.readyState==='complete')return;
  await new Promise(resolve=>frame.addEventListener('load',resolve,{once:true}));
}
function setValue(el,value){
  if(!el)return false;
  el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return true;
}
async function loadIntoTool(){
  const o=currentObject();
  if(!o.text){addTrace('BLOCKED','source is empty');return}
  if(mode==='bench'){$('benchIn').value=o.text;runBench();return}
  const frame=panes[mode];
  try{
    await waitFrame(frame);
    const d=frame.contentDocument;if(!d)throw new Error('child document unavailable');
    if(mode==='scan'){setValue(d.getElementById('in'),o.text);d.getElementById('scan')?.click()}
    else if(mode==='read'){setValue(d.getElementById('in'),o.text)}
    else if(mode==='reshape'){setValue(d.getElementById('in'),o.text)}
    else if(mode==='align'){
      let v=null;try{v=JSON.parse(o.text)}catch{}
      if(v&&typeof v==='object'&&!Array.isArray(v)){
        setValue(d.getElementById('ta'),v.ta||v.tamil||'');setValue(d.getElementById('zh'),v.zh||v.chinese||'');setValue(d.getElementById('en'),v.en||v.english||'');
      }else setValue(d.getElementById('en'),o.text);
      d.getElementById('align')?.click();
    }
    addTrace('PROJECTED',o.name+' → '+mode);
    setTimeout(()=>capture(frame),260);
  }catch(e){addTrace('BLOCKED',e.message)}
}
function capture(frame){
  try{
    const d=frame.contentDocument;let s='';
    if(mode==='scan')s=d.getElementById('out')?.innerText||'';
    if(mode==='read')s=d.getElementById('grid')?.innerText||'';
    if(mode==='align')s=(d.getElementById('hint')?.innerText||'')+' '+(d.getElementById('read')?.innerText||'');
    if(mode==='reshape')s=(d.getElementById('detect')?.innerText||'')+' '+(d.getElementById('out')?.value||'');
    lastPreview={mode,summary:clip(s,1000)};addTrace('OBSERVED',lastPreview.summary||'projection rendered');
  }catch(e){addTrace('UNKNOWN','preview unavailable: '+e.message)}
}
const scoreText=s=>s.kind==='unknown'?'?':s.lo===s.hi?String(s.lo):s.lo+'..'+s.hi;
function runBench(){
  const minima={form:$('minForm').value,function:$('minFunction').value,fortitude:$('minFortitude').value};
  const out=parseAndEvaluate($('benchIn').value,minima);lastBench=out.evaluation;const e=out.evaluation;
  $('benchSummary').innerHTML='<span class="badge front">FRONT '+e.counts.FRONT+'</span><span class="badge dom">DOMINATED '+e.counts.DOMINATED+'</span><span class="badge reject">REJECT '+e.counts.REJECT+'</span>'+(out.errors.length?'<span class="badge reject">PARSE '+out.errors.length+'</span>':'');
  $('benchResults').innerHTML=(e.rows.length?e.rows.map(r=>'<div class="candidate '+r.disposition+'"><div class="candidateHead"><b>'+esc(r.name)+'</b><span>'+r.disposition+'</span></div><div class="scores">'+AXES.map(a=>'<div><span>'+a.toUpperCase()+'</span><b>'+esc(scoreText(r.scores[a]))+'</b></div>').join('')+'</div>'+(r.note?'<div class="reason">'+esc(r.note)+'</div>':'')+(r.feasibility.reasons.length?'<div class="reason">'+esc(r.feasibility.reasons.join(' · '))+'</div>':'')+(r.dominated_by_names.length?'<div class="reason">proved dominated by '+esc(r.dominated_by_names.join(', '))+'</div>':'')+(r.missing_evidence.length?'<div class="reason missing">measure next: '+esc(r.missing_evidence.join(', '))+'</div>':'')+'</div>').join(''):'<div class="note">No valid candidates.</div>')+(out.errors.length?'<div class="candidate REJECT"><b>PARSE ERRORS</b><div class="reason">'+esc(out.errors.map(x=>'line '+x.line+': '+x.error).join(' · '))+'</div></div>':'');
  addTrace('BENCH',e.counts.FRONT+' front · '+e.counts.DOMINATED+' dominated · '+e.counts.REJECT+' rejected',JSON.stringify(e.counts));
}
async function copyReturn(){
  const o=currentObject(),sha=await digest(o.text);
  const receipt={
    schema:'omnitools-return/v0.1',authority:'EVIDENCE_ONLY',
    source:{label:o.name,sha256_12:sha,characters:o.text.length},active_projection:mode,
    bench:lastBench?{minima:lastBench.minima,counts:lastBench.counts,front:lastBench.rows.filter(x=>x.disposition==='FRONT').map(x=>x.name),rejected:lastBench.rows.filter(x=>x.disposition==='REJECT').map(x=>x.name),missing_evidence:Object.fromEntries(lastBench.rows.filter(x=>x.missing_evidence.length).map(x=>[x.name,x.missing_evidence]))}:null,
    projection_preview:lastPreview,trace:trace.slice(0,8),
    laws:['SOURCE != RESULT','BENCH != RANKING','PROJECTION != EFFECT','RETURN PRESERVES EVIDENCE, NOT AUTHORITY']
  };
  try{await navigator.clipboard.writeText(JSON.stringify(receipt,null,2));addTrace('RETURN','receipt copied · authority EVIDENCE_ONLY')}
  catch{addTrace('BLOCKED','clipboard denied; receipt not copied')}
}

qa('[data-mode]').forEach(b=>b.onclick=()=>select(b.dataset.mode));
$('loadMode').onclick=loadIntoTool;$('loadSource').onclick=loadIntoTool;
$('sourceToBench').onclick=()=>{select('bench');$('benchIn').value=$('sourceText').value;runBench()};
$('evaluate').onclick=runBench;
$('demoBench').onclick=()=>{
  $('benchIn').value='Wall rail | 82 | 74..88 | 90 | reversible clamp\nFloor frame | 70..85 | 93 | 68 | fast deployment\nUnknown donor | ? | 95 | 80 | measure FORM first\nWeak duplicate | 50 | 60 | 60 | should fall only if guaranteed';
  $('minForm').value=55;$('minFunction').value=60;$('minFortitude').value=60;runBench();
};
$('clearBench').onclick=()=>{$('benchIn').value='';$('benchResults').innerHTML='<div class="note">Cleared. No decision persisted.</div>';$('benchSummary').innerHTML='<span class="badge">NO RUN</span>';lastBench=null};
$('clearSource').onclick=()=>{$('sourceName').value='';$('sourceText').value='';lastPreview=null;updateSourceMeta();addTrace('CLEARED','session source cleared')};
$('copyReturn').onclick=copyReturn;$('sourceName').addEventListener('input',updateSourceMeta);$('sourceText').addEventListener('input',updateSourceMeta);
const dock=$('sourceDock'),sourceToggle=$('sourceToggle');
sourceToggle.onclick=e=>{e.stopPropagation();dock.classList.toggle('open');sourceToggle.setAttribute('aria-expanded',String(dock.classList.contains('open')))};
const drop=$('drop');
for(const n of ['dragenter','dragover'])drop.addEventListener(n,e=>{e.preventDefault();drop.classList.add('over')});
for(const n of ['dragleave','drop'])drop.addEventListener(n,e=>{e.preventDefault();drop.classList.remove('over')});
drop.addEventListener('drop',e=>{const f=e.dataTransfer?.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{$('sourceName').value=f.name;$('sourceText').value=String(r.result);updateSourceMeta();addTrace('SOURCE','dropped '+f.name+' · '+f.size+' bytes')};r.readAsText(f)});
const help=$('help'),hb=$('helpToggle');hb.onclick=()=>{const o=help.classList.toggle('open');hb.textContent=o?'CLOSE LAW':'CLI / LAW'};
document.addEventListener('keydown',e=>{
  if(e.altKey&&['1','2','3','4','5'].includes(e.key)){e.preventDefault();select(['bench','scan','read','align','reshape'][Number(e.key)-1])}
  if(e.key==='Escape'){help.classList.remove('open');dock.classList.remove('open');sourceToggle.setAttribute('aria-expanded','false')}
});

restore();select(new URL(location.href).searchParams.get('tool')||'bench');renderTrace();
