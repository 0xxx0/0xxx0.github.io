import {run,sourceObject,sourceData,receipt,PRESETS,VERSION,type,count,path,pointer} from './workflow.mjs';
import {esc,download} from '../lib/dom.js';
import {hashText,stableKey} from '../lib/id.js';
import '../lib/interphase-cube.js';
const memory=new Map();let epoch=0;
const pretty=v=>typeof v==='string'?v:JSON.stringify(v,null,2);
const short=v=>v===undefined?'MISSING':v===null?'null':typeof v==='object'?JSON.stringify(v):String(v);
const own=(v,k)=>v!=null&&Object.hasOwn(Object(v),k);
const safeAddress=value=>{const u=new URL(value,location.href);if(u.origin!==location.origin||!/^\//.test(u.pathname)||!/\.(?:json|txt|md|csv|log|ya?ml)$/i.test(u.pathname))throw Error('Choose a same-origin data/text path');return u.pathname+u.search};
export function mountWork(target,source,hooks={}){
 const ticket=++epoch,input=sourceData(source);
 let state=memory.get(source.id);
 if(!state){state={steps:own(input,'current_heads')?structuredClone(PRESETS.heads):own(input,'routes')?structuredClone(PRESETS.routes):[],view:'TABLE',focus:null,undo:[],redo:[],reader:null,selectedStep:null,folded:true,rx:-15,ry:24};memory.set(source.id,state);if(memory.size>12)memory.delete(memory.keys().next().value)}
 let result,error='',message='',panel='',disposed=false;
 const q=s=>target.querySelector(s),all=s=>[...target.querySelectorAll(s)];
 const alive=()=>!disposed&&ticket===epoch;
 function notice(e){message=String(e?.message||e);paint()}
 function changed(steps){message='';state.undo.push(structuredClone(state.steps));state.undo=state.undo.slice(-32);state.redo=[];state.steps=structuredClone(steps);state.selectedStep=null;state.focus=null;state.reader=null;paint()}
 function undo(){const last=state.undo.pop();if(!last)return;state.redo.push(state.steps);state.steps=last;state.selectedStep=null;state.focus=null;state.reader=null;paint()}
 async function openRaw(raw,label,address='',steps=null){
  try{const obj=await sourceObject(raw,label,address);if(!alive())return;if(steps)memory.set(obj.id,{...state,steps:structuredClone(steps),undo:[],redo:[],focus:null,selectedStep:null,reader:null});hooks.choose(obj)}catch(e){if(alive())notice(e)}
 }
 async function repo(address){
  try{const url=safeAddress(address),r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('Source HTTP '+r.status);const raw=await r.text();if(alive())await openRaw(raw,url.split('/').at(-1),url)}catch(e){if(alive())notice(e)}
 }
 function sourceForm(){
  return `<section class="iw-panel"><b>ONE SOURCE</b><div class="iw-presets"><button data-repo="/control/CURRENT.json">CURRENT</button><button data-repo="/showcase-manifest.json">FIELD DATA</button><label class="iw-file">LOCAL FILE<input id="iwFile" type="file" accept=".json,.txt,.md,.csv,.log,.yml,.yaml,text/*,application/json"></label><label class="iw-file">IMPORT RETURN<input id="iwImport" type="file" accept=".json,application/json"></label></div><form id="iwPathForm"><input id="iwPath" aria-label="Source path" placeholder="/control/CURRENT.json"><button>OPEN</button></form><form id="iwPasteForm"><textarea id="iwPaste" aria-label="Paste a source" placeholder="Paste text or JSON. Source stays in this tab."></textarea><button>HOLD SOURCE</button></form><p class="iw-muted">Local source stays in this tab. EXPORT RETURN carries its bytes and workflow in one local file.</p></section>`;
 }
 function addForm(){
  return `<form id="iwStepForm" class="iw-panel"><label>Operation<select id="iwOp"><option value="at">AT · enter a field</option><option value="where">WHERE · keep matching rows</option><option value="pick">PICK · show fields</option><option value="sort">SORT · order rows</option><option value="take">TAKE · bound the result</option><option value="unique">UNIQUE · distinct values</option></select></label><label id="iwArgLabel">JSON pointer<input id="iwArg" placeholder="/current_heads" autocomplete="off"></label><div id="iwWhere"><label>Comparison<select id="iwTest"><option value="contains">contains</option><option value="equals">equals</option><option value="not">does not equal</option><option value="exists">exists</option><option value="gt">greater than</option><option value="lt">less than</option></select></label><label>Value<input id="iwValue" placeholder="READ"></label></div><label id="iwDesc"><input id="iwDescending" type="checkbox">descending</label><div id="iwSuggestions"></div><button>APPEND STEP</button><span class="iw-muted">Order changes the result. Every step keeps its original source addresses.</span></form>`;
 }
 function stepLabel(s){return s.op.toUpperCase()+' '+(s.op==='pick'?s.fields.join(' '):s.op==='take'?s.count:(s.path||'/')+(s.op==='where'?' '+s.test+' '+JSON.stringify(s.value):s.desc?' ↓':''))}
 function controls(){
  return `<div class="iw-tools" role="toolbar" aria-label="Work on this source"><button data-panel="source" aria-expanded="${panel==='source'}">SOURCE</button><button data-panel="step" aria-expanded="${panel==='step'}">+ STEP</button><details class="iw-view"><summary>${state.view} ▾</summary><div>${['TABLE','READ','ROOM'].map(v=>`<button data-view="${v}" aria-pressed="${v===state.view}">${v}</button>`).join('')}<details><summary>OTHER READINGS</summary><button data-native="RESEARCH">Ω AUDIT</button><button data-native="DISC">HISTORY</button><button data-native="DAYLINE">DAYLINE</button><button data-native="FAN">FAN</button><button data-native="AXIS">AXIS</button><button data-native="COMPACT">LOCAL DRAFT</button><button data-native="PLAIN">OBJECT SOURCE</button></details><button id="iwExport">EXPORT RETURN</button><button id="iwReset">RETURN TO SOURCE</button></div></details></div>`;
 }
 function table(value,refs,columns){
  if(!Array.isArray(value))return `<div class="iw-value">${value&&typeof value==='object'?Object.entries(value).slice(0,200).map(([k,v])=>`<button class="iw-property" data-enter="${esc(pointer([k]))}"><b>${esc(k)}</b><span>${esc(type(v))} · ${count(v)}${Array.isArray(v)?' rows':''}</span><span>${esc(short(v).slice(0,130))}</span></button>`).join(''):`<pre>${esc(pretty(value))}</pre>`}${value&&typeof value==='object'&&Object.keys(value).length>200?'<p class="iw-muted">200 of '+Object.keys(value).length+' fields shown. AT can address every source field.</p>':''}</div>`;
  const names=[...new Set(value.slice(0,100).flatMap(v=>v&&typeof v==='object'&&!Array.isArray(v)?Object.keys(v):['value']))],shown=names.slice(0,innerWidth<=560?3:6);
  const compact=innerWidth<=560;
  const rows=value.slice(0,200).map((row,i)=>`<tr data-row="${i}" tabindex="0" aria-selected="${state.focus===i}"><th>${i+1}</th>${shown.map(k=>{const v=k==='value'&&(row==null||typeof row!=='object')?row:own(row,k)?row[k]:undefined;return `<td title="${esc(short(v))}"><span class="iw-cell">${esc(short(v).slice(0,180))}</span></td>`}).join('')}${compact?'':`<td><code>${esc(pointer(refs[i]||[]))||'/'}</code></td>`}</tr>`).join('');
  return `<div class="iw-table-scroll"><table><thead><tr><th>#</th>${shown.map(k=>`<th>${esc(k)}</th>`).join('')}${compact?'':'<th>SOURCE ADDRESS</th>'}</tr></thead><tbody>${rows}</tbody></table></div>${!value.length?'<p class="iw-muted">No matches. Remove or edit a step; the source remains held.</p>':''}<div class="iw-muted">${Math.min(200,value.length)} of ${value.length} rows shown${names.length>shown.length?' · '+(names.length-shown.length)+' fields behind each row':''}. Select a row for full cells and its source address.</div>`;
 }
 function room(value){
  const titles={OBJECT:source.title,ADDRESS:source.payload?.address||source.id,STATE:`${type(value)} · ${count(value)}${Array.isArray(value)?' rows':''}`,TRANSFORM:state.steps.length?state.steps.map(stepLabel).join('\n'):'SOURCE · no transform',PROVE:result.trace.map(t=>`${t.index+1} ${t.step.op}: ${t.before.count} → ${t.after.count}`).join('\n')||'Source held; no transformation',RETURN:'Original source unchanged.\nTap to unfold the same six readings.'};
  const cube=globalThis.InterphaseCube,geo=cube.geometry(state.folded?'cube':'net'),matrices=cube.worldMatrices(geo),size=Math.max(76,Math.min(128,(target.clientWidth-24)/3));
  const face=name=>{const m=matrices[name],css=[];for(let c=0;c<4;c++)for(let r=0;r<4;r++)css.push(m[r*4+c]*(c===3&&r<3?size:1));return `<button class="iw-face" data-face="${name}" style="transform:matrix3d(${css.join(',')})"><b>${name}</b><span>${esc(titles[name])}</span>${name==='STATE'?`<small>${esc(short(value).slice(0,160))}</small>`:''}</button>`};
  return `<div class="iw-room" data-fold="${state.folded?'cube':'net'}" style="--face:${size}px"><div class="iw-room-camera" style="--rx:${state.rx}deg;--ry:${state.ry}deg"><div class="iw-net" data-geometry="${cube.hashGeometry(geo)}">${cube.ORDER.map(face).join('')}</div></div></div><div class="iw-room-controls"><button id="iwUnfold">${state.folded?'UNFOLD':'FOLD'}</button><button data-view="TABLE">PLAIN RESULT</button><span>Drag to turn · six readings of the same source and workflow</span></div>`;
 }
 function paint(){
  if(disposed)return;error='';try{result=run(input,state.steps)}catch(e){result=null;error=e.message}
  const selected=result&&state.selectedStep!=null?result.trace[state.selectedStep]:null,value=selected?selected.value:result?.value,refs=selected?.refs??result?.refs??[],columns=selected?null:result?.columns;
  target.classList.add('iw-work');target.dataset.object=source.id;target.dataset.view=state.view;
  target.innerHTML=`${controls()}<div class="iw-source"><span>${source.kind==='DATA_SOURCE'?esc(source.payload.format):'MANIFEST RECORD'} · <b>${esc(source.title)}</b></span><code>${esc(source.payload?.address||source.id)}</code>${hooks.owner?`<a class="iw-owner" href="${esc(hooks.owner)}" target="${window.parent!==window?'_top':'_self'}">${source.kind==='DATA_SOURCE'?'OPEN SOURCE':'OPEN OWNER'} ↗</a>`:''}</div>${panel==='source'?sourceForm():panel==='step'?addForm():''}<div class="iw-chain" aria-label="Workflow">${state.steps.map((s,i)=>`<div class="iw-step ${state.selectedStep===i?'selected':''}"><button data-prefix="${i}" title="Inspect this step's output">${i+1} ${esc(stepLabel(s))}</button><button data-up="${i}" aria-label="Move step ${i+1} earlier" ${i?'':'disabled'}>↑</button><button data-down="${i}" aria-label="Move step ${i+1} later" ${i<state.steps.length-1?'':'disabled'}>↓</button><button data-remove="${i}" aria-label="Remove step ${i+1}">×</button></div>`).join('')}${state.undo.length?'<button id="iwUndo">↶ UNDO STEP</button>':''}</div><div class="iw-result-meta"><b>${result?(selected?'AFTER STEP '+(state.selectedStep+1)+' · ':'RESULT · ')+type(value).toUpperCase()+' · '+count(value):'WORKFLOW BLOCKED'}</b>${selected?'<button id="iwFinal">FINAL RESULT</button>':''}<span>source Δ 0</span></div><div class="iw-error" role="status">${esc(message||error)}</div><section class="iw-result">${!result?'':state.view==='ROOM'?room(value):state.view==='READ'?'<field-aperture id="iwReader" reader focusfield></field-aperture>':table(value,refs,columns)}</section><aside id="iwInspect"></aside><details class="iw-evidence"><summary>TRACE / ${result?.trace.length||0} steps · ${result?.losses.length||0} reductions</summary>${result?result.trace.map(t=>`<p>${t.index+1} ${esc(stepLabel(t.step))} · ${t.before.type} ${t.before.count} → ${t.after.type} ${t.after.count}${t.loss?' · '+esc(t.loss):''}</p>`).join(''):''}<p>Derived view; no host data is written. EXPORT RETURN preserves source + workflow + result evidence.</p></details>`;
  bind();
  if(result&&state.view==='READ'){
   const reader=q('#iwReader'),raw=pretty(value);reader.load(raw,{label:source.title+' / WORK RESULT',format:'TXT',scale:'WORD'});
   if(state.reader?.raw===raw)reader.restore(state.reader.focus);
   reader.addEventListener('aperture-focus',e=>{state.reader={raw,focus:e.detail}});
  }
  if(state.focus!=null&&Array.isArray(value)&&value[state.focus]!==undefined)inspect(state.focus,value,refs,columns);
  hooks.publish?.({id:source.id,label:source.title,address:source.payload?.address||source.provenance?.href||'',steps:state.steps.length,rows:result?count(value):null,view:state.view});
 }
 function inspect(i,value,refs,columns){
  state.focus=i;const row=value[i],ref=refs[i]||[];all('[data-row]').forEach(n=>n.setAttribute('aria-selected',String(+n.dataset.row===i)));
  const href=row?.href||row?.route,owner=typeof href==='string'&&hooks.resolveRoute?.(href);
  q('#iwInspect').innerHTML=`<div class="iw-inspector"><div><b>ROW ${i+1}</b><code>${esc(pointer(ref))||'/'}</code><button id="iwCloseInspect" aria-label="Close row">×</button></div><pre>${esc(pretty(row))}</pre>${owner?'<button id="iwWorkObject">HOLD THIS OBJECT</button>':''}<details><summary>Source witness</summary><pre>${esc(pretty(ref.reduce((v,k)=>own(v,k)?v[k]:undefined,input)))}</pre></details></div>`;
  q('#iwCloseInspect').onclick=()=>{state.focus=null;q('#iwInspect').replaceChildren()};if(owner)q('#iwWorkObject').onclick=()=>hooks.choose(owner);
 }
 function bind(){
  all('[data-panel]').forEach(b=>b.onclick=()=>{panel=panel===b.dataset.panel?'':b.dataset.panel;paint()});
  all('[data-native]').forEach(b=>b.onclick=()=>hooks.project?.(b.dataset.native));
  all('[data-view]').forEach(b=>b.onclick=()=>{q('#iwReader')?.stop();state.view=b.dataset.view;panel='';paint()});
  all('[data-enter]').forEach(b=>b.onclick=()=>changed([...state.steps,{op:'at',path:b.dataset.enter}]));
  all('[data-prefix]').forEach(b=>b.onclick=()=>{state.selectedStep=Number(b.dataset.prefix);state.focus=null;paint()});
  all('[data-remove]').forEach(b=>b.onclick=()=>changed(state.steps.filter((_,i)=>i!==Number(b.dataset.remove))));
  all('[data-up],[data-down]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.up??b.dataset.down),j=i+(b.hasAttribute('data-up')?-1:1),steps=state.steps.slice();[steps[i],steps[j]]=[steps[j],steps[i]];changed(steps)});
  all('[data-row]').forEach(b=>{const choose=()=>{const t=state.selectedStep==null?result:result.trace[state.selectedStep];inspect(Number(b.dataset.row),t.value,t.refs,t.columns)};b.onclick=choose;b.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose()}}});
  if(q('#iwUndo'))q('#iwUndo').onclick=undo;if(q('#iwFinal'))q('#iwFinal').onclick=()=>{state.selectedStep=null;paint()};
  q('#iwReset').onclick=()=>changed([]);
  q('#iwExport').onclick=async()=>{try{if(!result)throw Error('Repair the workflow before export');const packet=await receipt(source,state.steps,result,{row:state.focus,reader:state.reader,step:state.selectedStep,room:{folded:state.folded,rx:state.rx,ry:state.ry}},state.view);packet.input=source.kind==='DATA_SOURCE'?source.payload.raw:stableKey(input);download('interphase-return.json',JSON.stringify(packet,null,2),'application/json')}catch(e){notice(e)}};
  all('[data-repo]').forEach(b=>b.onclick=()=>repo(b.dataset.repo));
  if(q('#iwPathForm'))q('#iwPathForm').onsubmit=e=>{e.preventDefault();repo(q('#iwPath').value)};
  if(q('#iwPasteForm'))q('#iwPasteForm').onsubmit=e=>{e.preventDefault();openRaw(q('#iwPaste').value,'Pasted source')};
  if(q('#iwFile'))q('#iwFile').onchange=async e=>{const f=e.target.files[0];if(f){if(f.size>2e6)return notice('Source exceeds 2 MB');await openRaw(await f.text(),f.name)}};
  if(q('#iwImport'))q('#iwImport').onchange=async e=>{
   try{const f=e.target.files[0];if(!f)return;if(f.size>8e6)throw Error('Return exceeds 8 MB');const p=JSON.parse(await f.text());if(p.schema!==VERSION||typeof p.input!=='string'||await hashText(p.input)!==p.source?.hash)throw Error('Return source identity mismatch');let data;try{data=JSON.parse(p.input)}catch{data=p.input}if(!['TABLE','READ','ROOM'].includes(p.view))throw Error('Return view invalid');const next=run(data,p.steps);if(await hashText(stableKey(next.value))!==p.outputHash)throw Error('Return result mismatch');
    const object=p.source.id?.startsWith('route:')?hooks.resolveRoute?.(p.source.id.slice(6)):null;
    if(object&&await hashText(stableKey(sourceData(object)))===p.source.hash){memory.set(object.id,{...state,steps:p.steps,view:p.view,focus:p.focus?.row??null,undo:[],redo:[],reader:p.focus?.reader||null,selectedStep:p.focus?.step??null,...p.focus?.room});hooks.choose(object)}
    else{const obj=await sourceObject(p.input,p.source.label,p.source.address);if(!alive())return;memory.set(obj.id,{...state,steps:structuredClone(p.steps),view:p.view,focus:p.focus?.row??null,undo:[],redo:[],reader:p.focus?.reader||null,selectedStep:p.focus?.step??null,...p.focus?.room});hooks.choose(obj);}
   }catch(e){notice(e)}
  };
  if(q('#iwStepForm')){
   const update=()=>{const op=q('#iwOp').value;q('#iwWhere').hidden=op!=='where';q('#iwDesc').hidden=op!=='sort';q('#iwArgLabel').firstChild.textContent=op==='take'?'Row limit':op==='pick'?'Fields · comma separated pointers':'JSON pointer';q('#iwArg').placeholder=op==='take'?'10':op==='pick'?'/title, /href':'/state';const value=result?.value,keys=value&&typeof value==='object'?Object.keys(Array.isArray(value)?value.find(x=>x&&typeof x==='object')||{}:value):[];q('#iwSuggestions').innerHTML=keys.slice(0,16).map(k=>`<button type="button" data-key="${esc(pointer([k]))}">${esc(k)}</button>`).join('');all('[data-key]').forEach(b=>b.onclick=()=>{const arg=q('#iwArg');arg.value=op==='pick'&&arg.value?arg.value+', '+b.dataset.key:b.dataset.key})};
   q('#iwOp').onchange=update;update();q('#iwStepForm').onsubmit=e=>{e.preventDefault();try{const op=q('#iwOp').value,arg=q('#iwArg').value.trim(),step={op};if(op==='take')step.count=Number(arg);else if(op==='pick')step.fields=arg.split(',').map(s=>s.trim());else step.path=arg;if(op==='where'){step.test=q('#iwTest').value;const v=q('#iwValue').value;try{step.value=JSON.parse(v)}catch{step.value=v}}if(op==='sort')step.desc=q('#iwDescending').checked;run(input,[...state.steps,step]);panel='';changed([...state.steps,step])}catch(e){q('.iw-error').textContent=e.message}};
  }
  if(q('#iwUnfold')){
   q('#iwUnfold').onclick=()=>{state.folded=!state.folded;paint()};all('[data-face]').forEach(b=>b.onclick=()=>{state.folded=false;paint();q(`[data-face="${b.dataset.face}"]`)?.focus()});
   const stage=q('.iw-room');let drag=null;stage.onpointerdown=e=>{drag={id:e.pointerId,x:e.clientX,y:e.clientY,rx:state.rx,ry:state.ry};stage.setPointerCapture(e.pointerId)};stage.onpointermove=e=>{if(!drag||!state.folded)return;state.rx=Math.max(-70,Math.min(70,drag.rx-(e.clientY-drag.y)*.4));state.ry=drag.ry+(e.clientX-drag.x)*.4;q('.iw-room-camera').style.setProperty('--rx',state.rx+'deg');q('.iw-room-camera').style.setProperty('--ry',state.ry+'deg')};stage.onpointerup=stage.onpointercancel=()=>{drag=null};
  }
 }
 paint();return {dispose(){disposed=true;q('#iwReader')?.stop()},snapshot:()=>({source:source.id,steps:structuredClone(state.steps),view:state.view,focus:state.focus,result:result&&{value:result.value,refs:result.refs},error:message||error}),setSteps:steps=>{run(input,steps);changed(steps)},setView:view=>{if(!['TABLE','READ','ROOM'].includes(view))throw Error('Unknown work view');state.view=view;paint()},open:repo};
}
