const $=id=>document.getElementById(id),qa=s=>[...document.querySelectorAll(s)];
const KEY='omnitools.work-object.v01',ORIGIN=location.origin;
let mode='bench',trace=[],lastBench=null,lastPreview=null,hashSeq=0;
const panes=Object.fromEntries(qa('.toolPane').map(x=>[x.dataset.mode,x]));
const pending=new Map(),bindings=new Map();
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const clip=(s,n=600)=>{s=String(s??'').replace(/\s+/g,' ').trim();return s.length>n?s.slice(0,n-1)+'…':s;};
const currentObject=()=>({label:$('sourceName').value.trim()||'UNTITLED',text:$('sourceText').value});
const uid=()=>Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
function save(){try{const o=currentObject();sessionStorage.setItem(KEY,JSON.stringify({name:o.label,text:o.text}));}catch{}}
function restore(){try{const o=JSON.parse(sessionStorage.getItem(KEY)||'null');if(o){$('sourceName').value=o.name==='UNTITLED'?'':String(o.name||'');$('sourceText').value=String(o.text||'');}}catch{}updateSourceMeta();}
async function digest(text){if(!text)return'EMPTY';try{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');}catch{return'UNHASHED';}}
async function snapshot(){const o=currentObject();return Object.freeze({...o,sha256:await digest(o.text)});}
const sourceSummary=o=>o?{label:o.label,sha256_12:o.sha256.slice(0,12),characters:o.text.length}:null;
const matches=(record,o)=>!!record?.source&&record.source.label===o.label&&record.source.text===o.text&&record.source.sha256===o.sha256;
async function updateSourceMeta(){const seq=++hashSeq,o=await snapshot();if(seq!==hashSeq)return;$('charCount').textContent=o.text.length;$('sourceHash').textContent=o.sha256.slice(0,12);$('sourceSpine').textContent=o.text?o.label:'EMPTY';$('sourceSpineMeta').textContent=o.text?o.text.length+' CH · sha256:'+o.sha256.slice(0,12):'SESSION ONLY · NOTHING UPLOADED';save();}
function addTrace(kind,detail,source=null,projection=mode){trace.unshift({at:new Date().toISOString(),kind,mode:projection,detail:clip(detail),source:sourceSummary(source)});trace=trace.slice(0,12);renderTrace();$('returnState').textContent=kind+' · '+projection.toUpperCase();}
function renderTrace(){$('trace').innerHTML=trace.length?trace.map(x=>'<div class="traceItem"><b>'+esc(x.kind+' · '+x.mode.toUpperCase())+'</b><span>'+esc(x.detail)+(x.source?' · sha:'+esc(x.source.sha256_12):'')+'</span></div>').join(''):'<div class="traceItem"><b>EMPTY</b><span>load one source</span></div>';}
const dock=$('sourceDock'),toggle=$('sourceToggle');
function closeSource(){if(dock.open)dock.close();toggle.setAttribute('aria-expanded','false');}
function openSource(){if(!dock.open)dock.showModal();toggle.setAttribute('aria-expanded','true');}
function select(next){if(!panes[next])return;mode=next;Object.entries(panes).forEach(([k,p])=>p.hidden=k!==mode);qa('nav [data-mode]').forEach(b=>b.classList.toggle('on',b.dataset.mode===mode));$('loadMode').textContent='LOAD → '+mode.toUpperCase();const u=new URL(location.href);u.searchParams.set('tool',mode);history.replaceState(null,'',u);}
async function waitFrame(frame){if(frame.contentDocument?.readyState==='complete')return;await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('tool load timeout')),4000);frame.addEventListener('load',()=>{clearTimeout(timer);resolve();},{once:true});});}
function setValue(el,value){if(!el)throw Error('tool input missing');el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}
async function loadIntoTool(){
  const projection=mode,o=await snapshot();if(!o.text){addTrace('BLOCKED','source is empty',o,projection);return;}
  const frame=panes[projection];
  try{
    await waitFrame(frame);
    if(projection==='bench'){
      const requestId=uid();pending.set(requestId,{source:o,at:Date.now()});lastBench=null;
      frame.contentWindow.postMessage({type:'decision-bench:load',requestId,source:{label:o.label,text:o.text}},ORIGIN);
      setTimeout(()=>{if(pending.has(requestId)){pending.delete(requestId);addTrace('BLOCKED','native Bench did not acknowledge load',o,'bench');}},5000);
      return;
    }
    const d=frame.contentDocument;if(!d)throw Error('child document unavailable');
    let inputs;
    if(['scan','read','reshape'].includes(projection)){setValue(d.getElementById('in'),o.text);inputs={in:o.text};if(projection==='scan')d.getElementById('scan')?.click();}
    else{
      let v=null;try{v=JSON.parse(o.text);}catch{}
      if(v&&typeof v==='object'&&!Array.isArray(v)){inputs={ta:String(v.ta||v.tamil||''),zh:String(v.zh||v.chinese||''),en:String(v.en||v.english||'')};}
      else inputs={ta:'',zh:'',en:o.text};
      for(const [id,value]of Object.entries(inputs))setValue(d.getElementById(id),value);d.getElementById('align')?.click();
    }
    addTrace('PROJECTED',o.label+' → '+projection,o,projection);closeSource();setTimeout(()=>capture(frame,projection,o,inputs),300);
  }catch(error){addTrace('BLOCKED',error.message,o,projection);}
}
function capture(frame,projection,source,inputs){
  try{
    const d=frame.contentDocument;if(Object.entries(inputs).some(([id,value])=>d.getElementById(id)?.value!==value)){addTrace('INPUT_CHANGED','preview is not bound to the launching source',source,projection);return;}
    let summary='';if(projection==='scan')summary=d.getElementById('out')?.innerText||'';if(projection==='read')summary=d.getElementById('grid')?.innerText||'';if(projection==='align')summary=(d.getElementById('hint')?.innerText||'')+' '+(d.getElementById('read')?.innerText||'');if(projection==='reshape')summary=(d.getElementById('detect')?.innerText||'')+' '+(d.getElementById('out')?.value||'');
    lastPreview={mode:projection,source,inputs:Object.freeze({...inputs}),observed_at:new Date().toISOString(),summary:clip(summary,1000)};addTrace('OBSERVED',summary||'projection rendered',source,projection);
  }catch(error){addTrace('UNKNOWN','preview unavailable: '+error.message,source,projection);}
}
window.addEventListener('message',event=>{
  if(event.origin!==ORIGIN||event.source!==panes.bench.contentWindow)return;
  const m=event.data;if(!m||typeof m!=='object')return;
  if(m.type==='decision-bench:ready'){lastBench=null;return;}
  if(m.type==='decision-bench:changed'){lastBench=null;return;}
  if(m.type==='decision-bench:loaded'){
    const p=pending.get(m.requestId);if(!p)return;pending.delete(m.requestId);bindings.set(m.requestId,{...p,id:m.id});if(bindings.size>30)bindings.delete(bindings.keys().next().value);
    addTrace('PROJECTED',p.source.label+' → native Bench '+m.id,p.source,'bench');closeSource();return;
  }
  if(m.type==='decision-bench:error'){const p=pending.get(m.requestId);if(!p)return;pending.delete(m.requestId);addTrace('BLOCKED','Bench kept its model: '+String(m.message||'invalid source'),p.source,'bench');return;}
  if(m.type==='decision-bench:return'){
    const binding=bindings.get(m.requestId),receipt=m.receipt;
    if(!binding||!receipt||receipt.schema!=='decision-bench-return/v1'){lastBench=null;addTrace('UNBOUND_RETURN','Native decision remains at its own RETURN; no source binding',null,'bench');return;}
    lastBench={source:binding.source,requestId:m.requestId,receipt};addTrace('RETURN','native decision recorded · '+String(receipt.status||'PROPOSED'),binding.source,'bench');
  }
});
async function copyReturn(){
  const o=await snapshot(),bench=matches(lastBench,o)?{requestId:lastBench.requestId,source:sourceSummary(lastBench.source),receipt:lastBench.receipt}:null;
  const preview=matches(lastPreview,o)?{mode:lastPreview.mode,source:sourceSummary(lastPreview.source),inputs:lastPreview.inputs,observed_at:lastPreview.observed_at,summary:lastPreview.summary}:null;
  const receipt={schema:'omnitools-return/v0.2',authority:'EVIDENCE_ONLY',source:sourceSummary(o),active_projection:mode,bench,projection_preview:preview,trace:trace.slice(0,8),laws:['SOURCE != RESULT','BENCH != RANKING','PROJECTION != EFFECT','RETURN PRESERVES EVIDENCE, NOT AUTHORITY']};
  try{await navigator.clipboard.writeText(JSON.stringify(receipt,null,2));addTrace('RETURN','carrier receipt copied · matching-source evidence only',o);}catch{addTrace('BLOCKED','clipboard denied; receipt not copied',o);}
}
qa('nav [data-mode]').forEach(b=>b.onclick=()=>{select(b.dataset.mode);closeSource();});
$('loadMode').onclick=loadIntoTool;$('copyReturn').onclick=copyReturn;
$('clearSource').onclick=()=>{$('sourceName').value='';$('sourceText').value='';updateSourceMeta();addTrace('CLEARED','session source cleared');};
$('sourceName').addEventListener('input',updateSourceMeta);$('sourceText').addEventListener('input',updateSourceMeta);
toggle.onclick=()=>dock.open?closeSource():openSource();$('closeSource').onclick=closeSource;dock.addEventListener('close',()=>toggle.setAttribute('aria-expanded','false'));
const drop=$('drop');for(const n of ['dragenter','dragover'])drop.addEventListener(n,e=>{e.preventDefault();drop.classList.add('over');});for(const n of ['dragleave','drop'])drop.addEventListener(n,e=>{e.preventDefault();drop.classList.remove('over');});
drop.addEventListener('drop',e=>{const file=e.dataTransfer?.files?.[0];if(!file)return;if(file.size>200000){addTrace('BLOCKED','use a text file smaller than 200 KB');return;}const r=new FileReader();r.onload=()=>{$('sourceName').value=file.name;$('sourceText').value=String(r.result);updateSourceMeta();addTrace('SOURCE','dropped '+file.name+' · '+file.size+' bytes');};r.readAsText(file);});
document.addEventListener('keydown',e=>{if(e.altKey&&['1','2','3','4','5'].includes(e.key)){e.preventDefault();select(['bench','scan','read','align','reshape'][Number(e.key)-1]);closeSource();}});
restore();select(new URL(location.href).searchParams.get('tool')||'bench');renderTrace();
