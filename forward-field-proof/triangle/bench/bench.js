(() => {
  'use strict';
  const Core = globalThis.DecisionBenchCore;
  const $ = id => document.getElementById(id);
  const clone = value => JSON.parse(JSON.stringify(value));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const MODEL_KEY = 'decision-bench:model:v1', RETURNS_KEY = 'decision-bench:returns:v1';
  const embedded = parent !== window && new URLSearchParams(location.search).get('embedded') === '1';
  let sourceBinding = null, lastSentState = '';
  function send(type, payload = {}) { if (embedded) parent.postMessage({type, ...payload}, location.origin); }
  if (embedded) document.body.classList.add('embedded');
  const uid = prefix => prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,7);
  function sample() {
    return {schema:Core.schema,id:uid('decision'),title:'Choose a removable work surface',sample:true,
      context:'SAMPLE NUMBERS · NOT YOUR ROOM · replace with measurements',
      criteria:[
        {id:'width',label:'Form · width',unit:'cm',direction:'min',min:null,max:80},
        {id:'area',label:'Function · area',unit:'cm²',direction:'max',min:4000,max:null},
        {id:'restore',label:'Fortitude · restore',unit:'min',direction:'min',min:null,max:15}
      ],
      options:[
        {id:'current',label:'Current table',values:{width:80,area:4800,restore:12},evidence:'Illustrative numbers, not measured in your home.',next:'Measure actual footprint and working area.'},
        {id:'clamp',label:'Clamp board',values:{width:65,area:4500,restore:[3,5]},evidence:'Illustrative range. Physical stability is not tested by this numeric model.',next:'Measure the space; test a reversible attachment before use.'},
        {id:'fold',label:'Folding cart',values:{width:[70,90],area:4200,restore:2},evidence:'Illustrative width uncertainty.',next:'Measure deployed width; it may exceed the 80 cm cap.'},
        {id:'large',label:'Large build',values:{width:100,area:6000,restore:40},evidence:'Illustrative blocked alternative.',next:'Reject under these limits, or explicitly revise the model.'}
      ],priority:'restore',selected:'clamp'};
  }
  function blank() {
    return {schema:Core.schema,id:uid('decision'),title:'What decision are you making?',sample:false,
      context:'Name the quantities, limits and options. Unknown stays unknown.',
      criteria:[{id:'a',label:'Form · measure',unit:'',direction:'min',min:null,max:null},
        {id:'b',label:'Function · measure',unit:'',direction:'max',min:null,max:null},
        {id:'c',label:'Fortitude · measure',unit:'',direction:'min',min:null,max:null}],
      options:[{id:uid('option'),label:'Option A',values:{a:null,b:null,c:null},evidence:'',next:''},
        {id:uid('option'),label:'Option B',values:{a:null,b:null,c:null},evidence:'',next:''}],
      priority:null,selected:null};
  }
  let S = sample(), returns = [], axisPage = 0, optionPage = 0, editAxis = 0, editOption = null;
  let history = [], errors = new Map(), analysis = null, storageAvailable = true;
  let triangleOn = false;
  try { const saved = localStorage.getItem(MODEL_KEY); if (saved) S = Core.restore(saved); } catch (_) {}
  try { const saved = JSON.parse(localStorage.getItem(RETURNS_KEY) || '[]'); if (Array.isArray(saved)) returns = saved.slice(0,20); } catch (_) {}
  const cells = new Map();
  const cellKey=(...parts)=>JSON.stringify(parts);
  let editingInput = null, notice = '';
  const pageSize = () => {
    const rows=innerHeight<330?1:innerHeight<560?2:innerHeight<650?3:4;
    return S.criteria.length>3&&innerWidth<500&&innerHeight<650?Math.max(1,rows-1):rows;
  };
  let renderedPageSize=0;
  const visibleAxes = () => S.criteria.slice(axisPage * 3, axisPage * 3 + 3);
  const option = id => S.options.find(o => o.id === id);
  const criterion = id => S.criteria.find(c => c.id === id);
  const fmt = value => value === null || value === undefined ? '?' : Array.isArray(value) ? value.join('..') : String(value);
  function parse(value, bounds = false) {
    const str = value.trim();
    if (!str || str === '?') return null;
    const decimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
    const parts = bounds ? [str] : str.split('..');
    if (parts.length > 2 || parts.some(s => !decimal.test(s.trim()))) throw new Error('Use a number, low..high, or ?.');
    const nums = parts.map(Number);
    if (nums.some(n => !Number.isFinite(n))) throw new Error('Use finite numbers.');
    if (nums.length === 2 && nums[0] > nums[1]) throw new Error('Low must not exceed high.');
    return nums.length === 2 ? nums : nums[0];
  }
  function stash() {
    if (errors.size) { send('decision-bench:changed', {valid:false}); return; }
    const serialized = Core.serialize(S);
    if (serialized !== lastSentState) { lastSentState = serialized; send('decision-bench:changed', {valid:true,id:S.id}); }
    try { localStorage.setItem(MODEL_KEY, Core.serialize(S)); storageAvailable = true; }
    catch (_) { storageAvailable = false; }
    $('localStatus').textContent = storageAvailable ? 'SAVED HERE · NO WORLD ACTION' : 'SESSION ONLY · EXPORT TO KEEP';
  }
  function mutate(fn) {
    const before = clone(S);
    try {
      fn(); S = Core.validate(S); notice='';
      history.push(before); if (history.length > 60) history.shift();
      render(); stash();
    } catch (error) { S = before; toast(error.message); }
  }
  function toast(message) { notice=message; $('verdict').textContent = 'CHECK INPUT'; $('reason').textContent = message; }
  function numericInput(input, key, apply, bounds = false) {
    const raw = input.value;
    if (editingInput !== input) {
      history.push(clone(S)); if (history.length > 60) history.shift();
      editingInput = input; input.addEventListener('blur', () => { editingInput = null; }, {once:true});
    }
    cells.set(key, raw);
    try {
      const v = parse(raw, bounds), next = clone(S); apply(next, v); Core.validate(next);
      S = next; notice=''; errors.delete(key); cells.delete(key); input.classList.remove('invalid'); input.removeAttribute('aria-invalid');
      redrawAnalysis(); $('undoBtn').disabled = !history.length; stash();
    } catch (error) {
      errors.set(key,error.message); input.classList.add('invalid'); input.setAttribute('aria-invalid','true'); redrawAnalysis();send('decision-bench:changed',{valid:false});
    }
  }
  function pager(id, page, count, size, setter, noun) {
    const target = $(id), pages = Math.max(1,Math.ceil(count/size)); target.replaceChildren();
    if (pages < 2) return;
    const prev = document.createElement('button'), next = document.createElement('button'), label = document.createElement('span');
    prev.textContent = '←'; next.textContent = '→'; prev.setAttribute('aria-label','Previous '+noun); next.setAttribute('aria-label','Next '+noun);
    prev.disabled = page === 0; next.disabled = page >= pages-1; label.textContent = noun+' '+(page+1)+' / '+pages;
    prev.onclick = () => { setter(page-1); render(); }; next.onclick = () => { setter(page+1); render(); };
    target.append(prev,label,next);
  }
  function render() {
    const size=pageSize();
    axisPage = Math.min(axisPage,Math.max(0,Math.ceil(S.criteria.length/3)-1));
    optionPage = Math.min(optionPage,Math.max(0,Math.ceil(S.options.length/size)-1));
    $('title').value = S.title; $('context').textContent = S.sample ? 'SAMPLE NUMBERS · NOT YOUR ROOM · replace with measurements' : S.context;
    $('criteria').style.gridTemplateColumns = 'repeat('+visibleAxes().length+',minmax(0,1fr))';
    $('criteria').innerHTML = visibleAxes().map(c => {
      const bound = edge => {
        const key = cellKey('bound',c.id,edge), value = cells.has(key) ? cells.get(key) : c[edge] === null ? '' : c[edge];
        return '<label class="limit">'+(edge==='min'?'≥':'≤')+'<input data-bound="'+edge+'" data-axis="'+esc(c.id)+'" value="'+esc(value)+'" placeholder="no limit" aria-label="'+esc(c.label)+' mandatory '+(edge==='min'?'minimum':'maximum')+'" inputmode="decimal"'+(errors.has(key)?' class="invalid" aria-invalid="true"':'')+'></label>';
      };
      return '<div class="criterion '+(S.priority===c.id?'priority':'')+'"><button class="axisName" data-axis="'+esc(c.id)+'" title="Define this measurement">'+esc(c.label)+'</button><span class="definition">'+esc(c.unit||'unit not defined')+' · '+(c.direction==='min'?'smaller preferred':'larger preferred')+'</span>'+bound('min')+bound('max')+'<button class="priorityBtn" data-priority="'+esc(c.id)+'">'+(S.priority===c.id?'MAIN PRIORITY · CLEAR':'MAKE MAIN PRIORITY')+'</button></div>';
    }).join('');
    $('criteria').querySelectorAll('.axisName').forEach(b => b.onclick = () => openModel(S.criteria.findIndex(c => c.id===b.dataset.axis)));
    $('criteria').querySelectorAll('[data-priority]').forEach(b => b.onclick = () => mutate(() => {S.priority=S.priority===b.dataset.priority?null:b.dataset.priority;}));
    $('criteria').querySelectorAll('[data-bound]').forEach(input => input.oninput = () => numericInput(input,cellKey('bound',input.dataset.axis,input.dataset.bound),(s,v)=>{s.criteria.find(c=>c.id===input.dataset.axis)[input.dataset.bound]=v;},true));
    pager('axisPager',axisPage,S.criteria.length,3,p=>axisPage=p,'AXES');
    const axes = visibleAxes(), options = S.options.slice(optionPage*size,optionPage*size+size);
    $('matrix').innerHTML = '<table><thead><tr><th>OPTION / STATE</th>'+axes.map(c=>'<th title="'+esc(c.label)+'">'+esc(c.label.replace(/^.*? · /,''))+' '+esc(c.unit)+'</th>').join('')+'</tr></thead><tbody>'+options.map(o=>'<tr data-row="'+esc(o.id)+'"><td><button class="optionSelect" data-select="'+esc(o.id)+'">'+esc(o.label)+'</button><span class="rowState"></span></td>'+axes.map(c=>{
      const key=cellKey('value',o.id,c.id), raw=cells.has(key)?cells.get(key):fmt(o.values[c.id]);
      return '<td><input data-option="'+esc(o.id)+'" data-axis="'+esc(c.id)+'" value="'+esc(raw)+'" aria-label="'+esc(o.label)+' '+esc(c.label)+'"'+(errors.has(key)?' class="invalid" aria-invalid="true"':'')+'></td>';
    }).join('')+'</tr>').join('')+'</tbody></table>';
    $('matrix').querySelectorAll('[data-select]').forEach(b=>b.onclick=()=>mutate(()=>{S.selected=b.dataset.select;}));
    $('matrix').querySelectorAll('input').forEach(input=>input.oninput=()=>numericInput(input,cellKey('value',input.dataset.option,input.dataset.axis),(s,v)=>{s.options.find(o=>o.id===input.dataset.option).values[input.dataset.axis]=v;}));
    pager('optionPager',optionPage,S.options.length,size,p=>optionPage=p,'OPTIONS');
    $('addOption').disabled=S.options.length>=40;
    $('undoBtn').disabled=!history.length && !errors.size;
    redrawAnalysis();
    renderedPageSize=size;
  }
  function drawTriangle() {
    const enabled = S.criteria.length === 3;
    if (!enabled) triangleOn = false;
    const button = $('triBtn');
    button.disabled = !enabled;
    button.title = enabled ? 'Optional triangle projection over the table; the numeric table stays canonical'
      : 'Triangle view needs exactly 3 measurements (' + S.criteria.length + ' entered)';
    button.setAttribute('aria-pressed', String(triangleOn));
    button.textContent = triangleOn ? '△ TABLE' : '△ TRIANGLE';
    $('matrix').hidden = triangleOn;
    $('optionPager').hidden = triangleOn;
    const view = $('triView');
    view.hidden = !triangleOn;
    if (triangleOn) view.innerHTML = analysis ? TriangleView.markup(S, analysis)
      : '<p class="triNote">INVALID INPUT · correct the values to draw the projection.</p>';
    else view.replaceChildren();
  }
  function redrawAnalysis() {
    if (errors.size) {
      analysis=null; $('verdict').textContent='INVALID INPUT'; $('counts').textContent='RESULT PAUSED';
      $('reason').textContent=[...errors.values()][0]; $('focus').replaceChildren(); $('returnBtn').disabled=true;if($('supportNote'))$('supportNote').textContent='RESULT PAUSED · correct invalid values before using the support count.';
      document.querySelectorAll('[data-row]').forEach(tr=>{tr.className='';tr.querySelector('.rowState').textContent='CHECK INPUT';});
      $('undoBtn').disabled=false; drawTriangle(); return;
    }
    analysis=Core.evaluate(S);
    if($('supportNote'))$('supportNote').textContent='Exact support: '+analysis.feasible.length+' / '+S.options.length+' complete options fit every entered limit. No limit changes automatically.';
    const uncertain=analysis.rows.filter(r=>r.status==='UNCERTAIN').length, blocked=analysis.rows.filter(r=>r.status==='BLOCKED').length;
    $('counts').textContent=analysis.feasible.length+' FIT · '+uncertain+' ? · '+blocked+' OUT';
    document.querySelectorAll('[data-row]').forEach(tr=>{
      const row=analysis.rows.find(r=>r.id===tr.dataset.row), dom=analysis.dominated.find(r=>r.id===row.id);
      tr.className=row.status+(S.selected===row.id?' held':'');
      tr.querySelector('.rowState').textContent=dom?'DOMINATED':row.status==='FEASIBLE'?'MODEL FIT':row.status==='UNCERTAIN'?'UNCERTAIN':'BLOCKED';
      tr.querySelector('.optionSelect').setAttribute('aria-pressed',String(S.selected===row.id));
    });
    const chosen=option(S.selected), row=analysis.rows.find(r=>r.id===S.selected);
    const names=ids=>ids.map(id=>option(id).label).join(' / ');
    if (!S.options.length) { $('verdict').textContent='ADD ALTERNATIVES'; $('reason').textContent='Enter options and measurements for this decision.'; }
    else if (!analysis.feasible.length) { $('verdict').textContent=uncertain?'MEASURE BEFORE CHOOSING':'NO FEASIBLE OPTION'; $('reason').textContent=uncertain?'No complete option fits the limits. Unknown values and ranges remain unresolved.':'Every entered option violates a hard limit. Revise an option or explicitly revise the limit.'; }
    else if (analysis.frontier.length===1 && !S.priority) { $('verdict').textContent='ONE NON-DOMINATED OPTION'; $('reason').textContent=names(analysis.frontier)+' is the only non-dominated option on entered measures.'+(uncertain?' Uncertain options remain.':''); }
    else if (analysis.leader) {
      $('verdict').textContent='PRIORITY LEADER'; $('reason').textContent=names([analysis.leader])+' leads on '+criterion(S.priority).label+' among options that fit entered limits.'+(uncertain?' '+uncertain+' uncertain option'+(uncertain===1?' remains.':'s remain.'):'');
    } else { $('verdict').textContent='TRADE-OFF REMAINS'; $('reason').textContent=analysis.frontier.length+' non-dominated option'+(analysis.frontier.length===1?'':'s')+'. '+(S.priority?'Priority values tie or overlap; no guaranteed winner.':'Choose a main priority or justify your selection.')+(uncertain?' Uncertain options remain.':''); }
    $('focus').innerHTML=chosen?'<div><span><b>HELD · '+esc(chosen.label)+'</b> · '+row.status+'</span><span class="witness">'+esc(row.reasons[0]||chosen.next||'Add evidence and an executable next step.')+'</span></div><button id="editHeld">DETAIL</button>':'<div><span>SELECT AN OPTION TO INSPECT ITS LIMITS / EVIDENCE</span></div>';
    if(chosen)$('editHeld').onclick=()=>openOption(chosen.id);
    $('returnBtn').disabled=!chosen||row.status==='BLOCKED';
    if(notice){$('verdict').textContent='CHECK INPUT';$('reason').textContent=notice;}
    drawTriangle();
  }
  function openModel(index=0) {
    editAxis=Math.min(index,S.criteria.length-1);axisPage=Math.floor(editAxis/3); renderEditor(); if(!$('modelDialog').open)$('modelDialog').showModal();
  }
  function renderEditor() {
    const c=S.criteria[editAxis]; $('criterionPosition').textContent=(editAxis+1)+' / '+S.criteria.length;
    $('prevCriterion').disabled=editAxis===0; $('nextCriterion').disabled=editAxis>=S.criteria.length-1;
    $('addCriterion').disabled=S.criteria.length>=8; $('removeCriterion').disabled=S.criteria.length<=1;
    $('criterionEditor').innerHTML='<label>Measurement name<input id="cLabel" value="'+esc(c.label)+'" maxlength="100"></label><div class="two"><label>Unit<input id="cUnit" value="'+esc(c.unit)+'" maxlength="30"></label><label>Preference<select id="cDirection"><option value="min">Smaller preferred</option><option value="max">Larger preferred</option></select></label></div><div class="two"><label>Mandatory minimum<input id="cMin" value="'+(c.min??'')+'" placeholder="none"></label><label>Mandatory maximum<input id="cMax" value="'+(c.max??'')+'" placeholder="none"></label></div><p id="supportNote"></p>';
    $('cDirection').value=c.direction;
    for(const [id,prop] of [['cLabel','label'],['cUnit','unit'],['cDirection','direction']])$(id).onchange=()=>{const v=$(id).value; mutate(()=>{S.criteria[editAxis][prop]=v;});};
    for(const [id,edge] of [['cMin','min'],['cMax','max']]){
      const key=cellKey('bound',c.id,edge);if(cells.has(key))$(id).value=cells.get(key);
      $(id).oninput=()=>numericInput($(id),key,(s,v)=>{s.criteria[editAxis][edge]=v;},true);
    }
    redrawAnalysis();
  }
  function openOption(id) {
    editOption=id; const o=option(id); $('optionTitle').textContent=o.label;
    $('optionName').value=o.label; $('optionEvidence').value=o.evidence; $('optionNext').value=o.next;
    $('optionDialog').showModal();
    $('optionName').onchange=()=>{const v=$('optionName').value;mutate(()=>{option(editOption).label=v;});};
    $('optionEvidence').onchange=()=>{const v=$('optionEvidence').value;mutate(()=>{option(editOption).evidence=v;});};
    $('optionNext').onchange=()=>{const v=$('optionNext').value;mutate(()=>{option(editOption).next=v;});};
    const detail=analysis.rows.find(r=>r.id===id);
    let witness=$('detailWitness');
    if(!witness){witness=document.createElement('p');witness.id='detailWitness';$('optionTitle').parentElement.after(witness);}
    const margin=detail.margins.map(m=>{const c=criterion(m.criterionId);return c.label+' '+(m.bound==='max'?'≤':'≥')+m.limit+' '+c.unit+': worst-case margin '+fmt(m.margin)+' '+c.unit;});
    const relaxation=analysis.relaxations.filter(x=>x.optionId===id).map(x=>criterion(x.criterionId).label+' '+x.bound+' would need '+x.to+' (currently '+x.from+').');
    const notes=[detail.status,...detail.reasons,...margin,...relaxation];
    const dom=analysis.dominated.find(x=>x.id===id);
    if(dom)notes.push('Proven inferior on these measures to '+dom.by.map(i=>option(i).label).join(' / ')+'. Other relevant measures must be added explicitly.');
    witness.replaceChildren();let noteIndex=0;
    const text=document.createElement('span'),prev=document.createElement('button'),next=document.createElement('button'),position=document.createElement('small'),controls=document.createElement('span');
    prev.type='button';next.type='button';prev.textContent='←';next.textContent='→';prev.setAttribute('aria-label','Previous constraint reason');next.setAttribute('aria-label','Next constraint reason');
    function updateNote(){text.textContent=notes[noteIndex];position.textContent=(noteIndex+1)+' / '+notes.length;prev.disabled=noteIndex===0;next.disabled=noteIndex===notes.length-1;}
    prev.onclick=()=>{noteIndex--;updateNote();};next.onclick=()=>{noteIndex++;updateNote();};controls.append(prev,position,next);witness.append(text,controls);updateNote();
  }
  function download(value,name) {
    const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function replaceModel(next) {
    const valid=Core.validate(next); sourceBinding=null; errors.clear();cells.clear();axisPage=valid.priority?Math.floor(valid.criteria.findIndex(c=>c.id===valid.priority)/3):0;optionPage=valid.selected?Math.floor(valid.options.findIndex(o=>o.id===valid.selected)/pageSize()):0;mutate(()=>{S=valid;});
  }
  function record(exportFile) {
    if(!analysis || !S.selected) return;
    if(!$('returnForm').reportValidity())return;
    const outcome=$('outcome').value.trim(), evidence=$('outcomeEvidence').value.trim();
    if(Boolean(outcome)!==Boolean(evidence)){$('returnError').textContent='An observed outcome needs both outcome and evidence. Leave both blank for a proposed choice.';return;}
    const receipt={schema:'decision-bench-return/v1',at:new Date().toISOString(),state:Core.validate(S),analysis:Core.evaluate(S),
      chosen:S.selected,view:triangleOn?'triangle':'table',rationale:$('rationale').value.trim(),next:$('nextStep').value.trim(),
      status:outcome?'OBSERVATION_REPORTED':'PROPOSED',observation:outcome?{outcome,evidence,source:'user-reported'}:null,
      authority:'LOCAL REASONING ONLY',return_path:'/forward-field-proof/triangle/bench/'};
    if(!receipt.rationale||!receipt.next){$('returnError').textContent='State the rationale and executable next step.';return;}
    if(sourceBinding) receipt.provenance={requestId:sourceBinding.requestId,label:sourceBinding.label,model_at_load:sourceBinding.model,modified_since_load:Core.serialize(S)!==Core.serialize(sourceBinding.model)};
    returns.unshift(receipt);returns=returns.slice(0,20);
    try{localStorage.setItem(RETURNS_KEY,JSON.stringify(returns));$('localStatus').textContent='RETURN SAVED HERE';}catch(_){download(receipt,'decision-return.json');$('localStatus').textContent='SESSION RETURN · FILE EXPORTED';}
    if(exportFile)download(receipt,'decision-return.json');$('returnDialog').close();
    send('decision-bench:return',{requestId:sourceBinding?.requestId||null,receipt});
  }
  $('title').onchange=()=>{const value=$('title').value;mutate(()=>{S.title=value;});};
  $('modelBtn').onclick=()=>openModel();
  $('triBtn').onclick=()=>{triangleOn=!triangleOn;drawTriangle();};
  $('moreBtn').onclick=()=>$('moreDialog').showModal();
  $('prevCriterion').onclick=()=>{editAxis--;axisPage=Math.floor(editAxis/3);renderEditor();};
  $('nextCriterion').onclick=()=>{editAxis++;axisPage=Math.floor(editAxis/3);renderEditor();};
  $('addCriterion').onclick=()=>{mutate(()=>{const id=uid('axis');S.criteria.push({id,label:'New measurement',unit:'',direction:'min',min:null,max:null});S.options.forEach(o=>o.values[id]=null);});editAxis=S.criteria.length-1;axisPage=Math.floor(editAxis/3);renderEditor();};
  $('removeCriterion').onclick=()=>{
    const c=S.criteria[editAxis];errors.delete(cellKey('bound',c.id,'min'));errors.delete(cellKey('bound',c.id,'max'));cells.delete(cellKey('bound',c.id,'min'));cells.delete(cellKey('bound',c.id,'max'));
    S.options.forEach(o=>{errors.delete(cellKey('value',o.id,c.id));cells.delete(cellKey('value',o.id,c.id));});
    mutate(()=>{S.criteria.splice(editAxis,1);S.options.forEach(o=>delete o.values[c.id]);if(S.priority===c.id)S.priority=null;});editAxis=Math.min(editAxis,S.criteria.length-1);renderEditor();
  };
  $('addOption').onclick=()=>{mutate(()=>{const id=uid('option');S.options.push({id,label:'Option '+(S.options.length+1),values:Object.fromEntries(S.criteria.map(c=>[c.id,null])),evidence:'',next:''});S.selected=id;});optionPage=Math.floor((S.options.length-1)/pageSize());render();openOption(S.selected);};
  $('removeOption').onclick=()=>{for(const c of S.criteria){errors.delete(cellKey('value',editOption,c.id));cells.delete(cellKey('value',editOption,c.id));}mutate(()=>{S.options=S.options.filter(o=>o.id!==editOption);if(S.selected===editOption)S.selected=null;});$('optionDialog').close();};
  $('undoBtn').onclick=()=>{notice='';errors.clear();cells.clear();editingInput=null;if(history.length)S=history.pop();render();stash();};
  $('newBtn').onclick=()=>{replaceModel(blank());$('moreDialog').close();openModel();};
  $('demoBtn').onclick=()=>{replaceModel(sample());$('moreDialog').close();};
  $('exportBtn').onclick=()=>{if(errors.size){$('moreDialog').close();toast('Correct invalid inputs before exporting.');return;}download(Core.validate(S),'decision-model.json');};
  $('importBtn').onclick=()=>$('fileInput').click();
  $('fileInput').onchange=async()=>{
    const file=$('fileInput').files[0];if(!file)return;
    try{if(file.size>200000)throw new Error('Use a model file smaller than 200 KB.');const parsed=JSON.parse(await file.text());replaceModel(Core.restore(parsed.state||parsed));$('moreDialog').close();}
    catch(error){$('moreDialog').close();toast('Import kept your model: '+error.message);}
    $('fileInput').value='';
  };
  $('pasteBtn').onclick=()=>{$('moreDialog').close();$('pasteHelp').textContent='One tab-separated row per option, no header: name, '+S.criteria.map(c=>c.label+' ('+c.unit+')').join(', ')+'. Blank or ? = unknown. Replaces options; UNDO restores them.';$('pasteError').textContent='';$('pasteDialog').showModal();};
  $('applyTable').onclick=()=>{
    try{
      const lines=$('tableText').value.split(/\r?\n/).filter(l=>l.trim());if(!lines.length||lines.length>40)throw new Error('Use 1–40 rows.');
      const options=lines.map((line,i)=>{const cols=line.split('\t');if(cols.length!==S.criteria.length+1||!cols[0].trim())throw new Error('Row '+(i+1)+': expected a name and '+S.criteria.length+' tab-separated values.');return{id:uid('option'),label:cols[0].trim(),values:Object.fromEntries(S.criteria.map((c,j)=>[c.id,parse(cols[j+1])])),evidence:'Imported table; source not yet noted.',next:''};});
      const next={...clone(S),options,selected:null,sample:false,context:'Imported alternatives · enter their evidence and executable next steps.'};replaceModel(next);$('pasteDialog').close();
    }catch(error){$('pasteError').textContent=error.message;}
  };
  $('returnBtn').onclick=()=>{const o=option(S.selected);$('returnTitle').textContent='RECORD · '+o.label;$('returnAnalysis').textContent=$('verdict').textContent+' · '+$('reason').textContent;$('nextStep').value=o.next;$('rationale').value='';$('outcome').value='';$('outcomeEvidence').value='';$('returnError').textContent='';$('returnDialog').showModal();};
  $('saveReturn').onclick=()=>record(false);$('downloadReturn').onclick=()=>record(true);
  $('historyBtn').onclick=()=>{
    $('moreDialog').close();const last=returns[0];$('historyText').textContent=last?[last.at,last.status,last.state?.options?.find(o=>o.id===last.chosen)?.label||last.chosen,last.rationale,'NEXT · '+last.next,last.observation?'OBSERVED (USER-REPORTED) · '+last.observation.outcome+' · '+last.observation.evidence:'No observed outcome recorded.'].join('\n\n'):'No RETURN recorded.';
    $('restoreReturn').disabled=!last;$('exportReturn').disabled=!last;$('historyDialog').showModal();
  };
  $('restoreReturn').onclick=()=>{try{replaceModel(Core.restore(returns[0].state));$('historyDialog').close();}catch(error){$('historyText').textContent='Cannot restore: '+error.message;}};
  $('exportReturn').onclick=()=>download(returns[0],'decision-return.json');
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'||event.target.closest('input,textarea,select,dialog'))return;
    if(event.key.toLowerCase()==='u'){event.preventDefault();$('undoBtn').click();}
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){
      event.preventDefault();const i=S.options.findIndex(o=>o.id===S.selected),d=event.key==='ArrowDown'?1:-1,j=(i+d+S.options.length)%S.options.length;
      if(S.options[j]){mutate(()=>{S.selected=S.options[j].id;});optionPage=Math.floor(j/pageSize());render();}
    }
  });
  document.querySelectorAll('dialog').forEach(d=>d.addEventListener('close',()=>{render();stash();}));
  let viewportWidth=innerWidth,viewportHeight=innerHeight;
  function resizeView() {
    const size=pageSize(),expectedRows=Math.min(size,Math.max(0,S.options.length-optionPage*size));
    if(innerWidth===viewportWidth&&innerHeight===viewportHeight&&renderedPageSize===size&&document.querySelectorAll('[data-row]').length===expectedRows)return;
    viewportWidth=innerWidth;viewportHeight=innerHeight;
    const active=document.activeElement;
    const focus=active?.matches('#matrix input,#criteria input')?{
      option:active.dataset.option,axis:active.dataset.axis,bound:active.dataset.bound,
      start:active.selectionStart,end:active.selectionEnd,direction:active.selectionDirection
    }:null;
    const anchor=focus?.option||S.selected;
    const index=S.options.findIndex(o=>o.id===anchor);
    if(index>=0)optionPage=Math.floor(index/pageSize());
    if(focus?.axis){const index=S.criteria.findIndex(c=>c.id===focus.axis);if(index>=0)axisPage=Math.floor(index/3);}
    render();
    if(focus){
      const next=[...document.querySelectorAll('#matrix input,#criteria input')].find(input=>
        input.dataset.axis===focus.axis&&input.dataset.option===focus.option&&input.dataset.bound===focus.bound);
      if(next){next.focus({preventScroll:true});if(focus.start!==null)next.setSelectionRange(focus.start,focus.end,focus.direction);}
    }
  }
  addEventListener('resize',resizeView);
  if(typeof ResizeObserver==='function')new ResizeObserver(resizeView).observe(document.documentElement);
  if(embedded)setInterval(()=>{if(document.visibilityState!=='hidden'&&frameElement?.getClientRects().length)resizeView();},200);
  let loadSequence=0;
  addEventListener('message',async event=>{
    if(!embedded||event.origin!==location.origin||event.source!==parent||event.data?.type!=='decision-bench:load')return;
    const {requestId,source}=event.data,sequence=++loadSequence;
    if(typeof requestId!=='string'||requestId.length>120)return;
    try {
      if(!source||typeof source.text!=='string'||source.text.length>200000)throw new Error('Use a decision source smaller than 200 KB.');
      let next;
      if(/^[\s]*[\[{]/.test(source.text)){const parsed=JSON.parse(source.text);next=Core.restore(parsed.state||parsed);}
      else {const adapter=await import('/foundry/omnitools/bench.mjs');next=adapter.parseDecisionSource(source.text,source.label);}
      if(sequence!==loadSequence)return;
      replaceModel(next); sourceBinding={requestId,label:String(source.label||'Imported source').slice(0,180),model:Core.validate(S)};
      document.querySelectorAll('dialog[open]').forEach(d=>d.close());
      send('decision-bench:loaded',{requestId,id:S.id});
    } catch(error) {if(sequence!==loadSequence)return;toast('Source kept your model: '+error.message);send('decision-bench:error',{requestId,message:error.message});}
  });
  if(S.selected)optionPage=Math.floor(Math.max(0,S.options.findIndex(o=>o.id===S.selected))/pageSize());
  if(S.priority)axisPage=Math.floor(Math.max(0,S.criteria.findIndex(c=>c.id===S.priority))/3);
  render();stash();
  send('decision-bench:ready');
})();
