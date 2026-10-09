import {lenses as I, history as H, extensions as E, glyph as G} from '/lib/interphase.mjs';
import {esc, $, download} from '/lib/dom.js';
import {mountResearch, fieldSeed} from './research.mjs';
import {historyDisc, dayView, axisView, daylineSnapshot, taskObject, daylineKey, sourceAddress} from './projections.mjs';
(async()=>{'use strict';
  if(!I){document.body.innerHTML='<pre>INTERPHASE LENSES FAILED TO LOAD</pre>';return}
  const route=new URLSearchParams(location.search).get('route');
  let initial=I.createGenesisObject();
  if(route){
    const response=await fetch('/showcase-manifest.json');
    if(!response.ok)throw new Error('FIELD_MANIFEST_UNAVAILABLE');
    const manifest=await response.json(),record=manifest.routes.find(r=>r.href===route);
    if(!record)throw new Error('FIELD_ROUTE_UNRESOLVED:'+route);
    initial=H.objectFromRoute(record);
  }
  let key='interphase.history.v01:'+initial.id;
  let graph=H.createHistory(initial),storageMessage='LOCAL · edits stay on this device';
  function checkedHistory(doc){
    const restored=H.restoreHistory(doc);
    if(restored.object_id!==initial.id)throw new Error('IMPORT_OBJECT_MISMATCH');
    for(const n of restored.nodes()){
      // Only the three native lens fields may vary. Import is not a way to
      // replace a protected payload, provenance or arbitrary source property.
      if(H.stable(n.snapshot)!==H.stable(I.applySemantic(initial,I.semantic(n.snapshot))))throw new Error('IMPORT_PROTECTED_SOURCE_MISMATCH');
      if(!Object.hasOwn(I.STATES,n.snapshot.state))throw new Error('IMPORT_STATE_INVALID');
    }
    return restored;
  }
  try{const raw=localStorage.getItem(key);if(raw)graph=checkedHistory(JSON.parse(raw));}
  catch(e){storageMessage='RECOVERY HELD · '+e.message+' · stored bytes retained';}
  let recoveryHeld=storageMessage.startsWith('RECOVERY HELD');
  function persist(){
    if(recoveryHeld){storageMessage='RECOVERY HELD · export this session before replacing stored bytes';return;}
    try{localStorage.setItem(key,JSON.stringify(graph.serialize()));storageMessage='SAVED LOCALLY · '+graph.head().slice(0,16);}
    catch(e){storageMessage='SESSION ONLY · save failed · EXPORT to keep this work';}
  }
  const anchor=()=>({projection:mode,focus:initial.id,viewport:fieldLocal});
  function traceNodes(){
    const nodes=new Map(graph.nodes().map(n=>[n.id,n])),seen=new Set(),ordered=[];
    const walk=id=>{if(seen.has(id))return;seen.add(id);const n=nodes.get(id);for(const p of n.parents)walk(p);if(n.op!=='IMPORT')ordered.push(n);};
    walk(graph.head());return ordered;
  }
  const store={
    source:()=>graph.source(),
    snapshot:()=>({source:graph.source(),revision:graph.nodes().length-1,history:traceNodes().map(n=>({id:n.id,op:n.op,lens:n.meta.lens,delta:n.patch,cause:n.meta.cause,revision:n.id===graph.head()?'HEAD':'',parents:n.parents}))}),
    project:(id,view)=>I.lens(id).project(graph.source(),view),
    edit(id,view,meta={}){const after=I.lens(id).put(graph.source(),view);if(!admitCandidate(after))return;const r=graph.commit(I.semantic(after),{lens:id,cause:meta.cause,anchor:anchor()});persist();return r;},
    editPlain(patch,meta={}){const after=I.applySemantic(graph.source(),patch);if(!admitCandidate(after))return;const r=graph.commit(I.semantic(after),{lens:'PLAIN',cause:meta.cause,anchor:anchor()});persist();return r;},
    returnLast(){const head=graph.nodes().find(n=>n.id===graph.head());if(!head.parents.length)return;if(!admitCandidate(graph.snapshot(head.parents[0])))return;graph.returnTo(head.parents[0],{cause:'USER_RETURN',anchor:anchor()});persist();}
  };
  let mode='COMPACT',routes=[],axisSelection={},receiptSelection=null;
  const plugins=[E.native];let catalog=E.compose(plugins);
  let disposeResearch=null,researchData=null;
  try{const raw=localStorage.getItem('interphase.research.v04');if(raw)researchData=JSON.parse(raw)}catch{}
  try{const r=await fetch('/showcase-manifest.json');if(r.ok)routes=(await r.json()).routes||[]}catch{}
  function chooseSource(source){
    if(source.id===initial.id)return;
    initial=structuredClone(source);key='interphase.history.v01:'+initial.id;graph=H.createHistory(initial);recoveryHeld=false;
    storageMessage='LOCAL DRAFT · source owner remains unchanged';
    try{const raw=localStorage.getItem(key);if(raw)graph=checkedHistory(JSON.parse(raw))}catch(e){recoveryHeld=true;storageMessage='RECOVERY HELD · '+e.message}
    fieldLocal.focus=initial.id;receiptSelection=null;
  }
  const fieldLocal={focus:initial.id,camera:{x:0,y:0,z:0,rx:-10,ry:24,rz:0},aperture:'DETAIL'};
  let drag=null;

  const nextState=s=>s==='SOURCE'?'HOLD':s==='HOLD'?'RETURN':'SOURCE';
  const states=current=>Object.values(I.STATES).map(s=>`<button type="button" data-state="${s.name}" class="${s.name===current?'active':''}">${s.mark} ${s.name}</button>`).join('');
  const stateSelect=current=>Object.keys(I.STATES).map(s=>`<option ${s===current?'selected':''}>${s}</option>`).join('');

  function probeLaws(source){
    const c=I.COMPACT.get(source),f=I.FIELD.get(source);
    const cProbe={...c,title:c.title+'·',line:c.line+' ·',state:nextState(c.state),id:'obj:forbidden'};
    const fProbe={...f,title:f.title+'·',thesis:f.thesis+' ·',state:nextState(f.state),id:'obj:forbidden'};
    const C=I.checkLens('COMPACT',source,cProbe),F=I.checkLens('FIELD',source,fProbe),V=I.checkFieldLocality(source,I.FIELD.project(source,fieldLocal));
    return [
      ['C·GETPUT',C.get_put],['C·PUTGET',C.put_get],['F·GETPUT',F.get_put],['F·PUTGET',F.put_get],['IDENTITY',C.identity_preserved&&F.identity_preserved],['VIEWLOCAL',V.pass]
    ];
  }
  function admitCandidate(source){
    const checks={object:E.check(catalog,'object',source),...E.inspect(catalog,source)};
    const bad=Object.entries(checks).find(([,v])=>!v.ok);
    if(bad){storageMessage='EDIT REJECTED · '+bad[0]+' · '+bad[1].errors.map(e=>e.path+': '+e.message).join('; ');return false}
    return true;
  }
  function renderLaws(source){
    $('#lawStatus').innerHTML=probeLaws(source).map(([k,v])=>`<span class="law ${v?'pass':'fail'}">${esc(k)} ${v?'✓':'×'}</span>`).join('');
  }

  function renderTrace(){
    const snap=store.snapshot(),xs=[...snap.history].reverse();
    $('#traceCount').textContent=String(xs.length).padStart(2,'0');
    $('#traceList').innerHTML=xs.length?xs.map(r=>{
      const ds=Object.entries(r.delta||{}).map(([k,v])=>`<div><b>${esc(k)}</b> · ${esc(v.before)} → ${esc(v.after)}</div>`).join('');
      return `<article class="receipt ${r.op==='RETURN'?'return-receipt':''}"><div class="rrow"><span class="rid">${esc(r.id)}</span><span class="rop">${esc(r.op)} / ${esc(r.lens)}</span><span class="rrev">r${r.revision}</span></div><div class="delta">${ds}</div>${r.cause?`<div class="micro">cause · ${esc(r.cause)}</div>`:''}</article>`;
    }).join(''):'<div class="empty">No semantic edits yet.<br>Move FIELD’s camera: TRACE must remain empty.</div>';
  }

  function setMode(next){disposeResearch?.();disposeResearch=null;$('#surfaceBody').classList.remove('research');mode=next;$('#control').open=false;render()}
  function render(){
    const snap=store.snapshot(),source=snap.source;document.body.dataset.interphaseMode=mode;
    $('#storageStatus').textContent=storageMessage;
    $('#railId').textContent=source.id;$('#railRev').textContent='r'+snap.revision;$('#sourceStamp').textContent='SOURCE · '+source.id;
    document.querySelectorAll('.mode').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
    $('#focusTitle').textContent=source.title;$('#focusLine').textContent=source.thesis;
    $('#viewLabel').textContent=mode;$('#receiptPreview').hidden=mode!=='DISC'||!receiptSelection;
    const address=sourceAddress(source);$('#openSource').hidden=!address;if(address)$('#openSource').href=address;
    renderLaws(source);renderTrace();
    if(mode==='PLAIN')renderPlain(source);else if(mode==='COMPACT')renderCompact(source);else if(mode==='FIELD')renderField(source);else renderProjection(source);
  }

  function renderProjection(source){
    $('#surfaceName').textContent=mode;$('#surfaceDesc').textContent='same focus · explicit source';
    const body=$('#surfaceBody');
    if(mode==='RESEARCH'){
      const objects=[source,...routes.filter(r=>'route:'+r.href!==source.id).map(H.objectFromRoute)];
      disposeResearch=mountResearch(body,researchData||fieldSeed(objects),object=>{chooseSource(object);$('#railId').textContent=initial.id;$('#railRev').textContent='r'+(graph.nodes().length-1);const address=sourceAddress(graph.source());$('#openSource').hidden=!address;if(address)$('#openSource').href=address;$('#focusTitle').textContent=graph.source().title;$('#focusLine').textContent=graph.source().thesis;renderTrace()},data=>{researchData=data;try{localStorage.setItem('interphase.research.v04',JSON.stringify(data))}catch(e){storageMessage='RESEARCH SESSION ONLY · export/import the benchmark to keep it'}},initial.id);
    }else if(mode==='DISC'){
      const nodes=graph.nodes();body.innerHTML=historyDisc(nodes,graph.head(),receiptSelection);
      body.querySelectorAll('[data-receipt]').forEach(b=>b.onclick=()=>{receiptSelection=b.dataset.receipt;const n=nodes.find(n=>n.id===receiptSelection);$('#receiptPreview').hidden=false;$('#receiptSnapshot').textContent=JSON.stringify(n.snapshot,null,2);renderProjection(graph.source())});
    }else if(mode==='DAYLINE'||mode==='FAN'){
      try{const d=daylineSnapshot();body.innerHTML=dayView(d,source.id,mode==='FAN');body.querySelectorAll('[data-task]').forEach(b=>b.onclick=()=>{chooseSource(taskObject(d.tasks.find(t=>t.id===b.dataset.task)));render()})}
      catch(e){body.textContent=e.message}
    }else if(mode==='AXIS'){
      body.innerHTML=axisView(routes,axisSelection);
      body.querySelectorAll('[data-axis]').forEach(s=>s.onchange=()=>{axisSelection={...axisSelection,[s.dataset.axis]:s.value};renderProjection(graph.source())});
      body.querySelectorAll('[data-route]').forEach(b=>b.onclick=()=>{chooseSource(H.objectFromRoute(routes.find(r=>r.href===b.dataset.route)));render()});
    }
  }

  function renderPlain(source){
    $('#surfaceName').textContent='PLAIN';$('#surfaceDesc').textContent='source witness · no geometry';
    $('#surfaceBody').innerHTML=`
      <div class="plain-callout">Edit a local draft. Identity and provenance stay with the source.</div>
      <form class="form" id="plainForm">
        <div class="field"><label>identity · protected</label><input class="locked" value="${esc(source.id)}" disabled></div>
        <div class="field"><label>title</label><input name="title" value="${esc(source.title)}"></div>
        <div class="field"><label>thesis</label><textarea name="thesis">${esc(source.thesis)}</textarea></div>
        <div class="field"><label>state</label><select name="state">${stateSelect(source.state)}</select></div>
        <div class="actions"><button class="btn hot" type="submit">COMMIT PLAIN</button><span class="micro">semantic source edit · appends receipt</span></div>
      </form>
      <pre class="raw">${esc(JSON.stringify(source,null,2))}</pre>`;
    $('#plainForm').addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(e.currentTarget);store.editPlain({title:fd.get('title'),thesis:fd.get('thesis'),state:fd.get('state')},{cause:'PLAIN'});render()});
  }

  function renderCompact(source){
    const v=store.project('COMPACT');
    $('#surfaceName').textContent='COMPACT';$('#surfaceDesc').textContent='lens 01 · readable minimum';
    $('#surfaceBody').innerHTML=`<div class="compact-card">
      <div class="compact-mark"><div class="sigil">${G.svg({id:source.id,label:source.title,channels:['identity','address'],operations:[]},{size:80})}</div><div class="compact-meta"><div class="object-id">${esc(v.id)} · ${esc(v.mark)} ${esc(v.state)}</div><h2>${esc(v.title)}</h2></div></div>
      <form class="form" id="compactForm">
        <div class="field"><label>title</label><input name="title" value="${esc(v.title)}"></div>
        <div class="field"><label>line · thesis projected compactly</label><textarea name="line">${esc(v.line)}</textarea></div>
        <div class="field"><label>state</label><div class="statebar" id="compactState">${states(v.state)}</div><input type="hidden" name="state" value="${esc(v.state)}"></div>
        <div class="actions"><button class="btn hot" type="submit">COMMIT THROUGH LENS</button><span class="micro">mark + glyph derive from state; identity cannot be edited here</span></div>
      </form></div>`;
    $('#compactState').addEventListener('click',e=>{const b=e.target.closest('[data-state]');if(!b)return;$('#compactForm [name=state]').value=b.dataset.state;$('#compactState').querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b))});
    $('#compactForm').addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(e.currentTarget);store.edit('COMPACT',{...v,title:fd.get('title'),line:fd.get('line'),state:fd.get('state')},{cause:'COMPACT'});render()});
  }

  function roomFaces(){return `
    <div class="face" style="transform:translateZ(140px)"></div><div class="face" style="transform:rotateY(180deg) translateZ(140px)"></div>
    <div class="face" style="transform:rotateY(90deg) translateZ(140px)"></div><div class="face" style="transform:rotateY(-90deg) translateZ(140px)"></div>
    <div class="face" style="transform:rotateX(90deg) translateZ(140px)"></div><div class="face" style="transform:rotateX(-90deg) translateZ(140px)"></div>`}
  function contextFrames(source){
    const current=source.provenance?.href;let r=routes.find(r=>r.href===current),seen=new Set(),parents=[];
    while(r?.parent&&!seen.has(r.parent)&&parents.length<5){seen.add(r.parent);r=routes.find(x=>x.href===r.parent);if(r)parents.push(r)}
    return parents.map((r,i)=>`<div class="context-frame" style="--level:${i}"><span>${esc(r.title)} · ${esc(r.href)}</span></div>`).join('');
  }
  function cubeFaces(glyph){return `<i style="transform:translateZ(32px)"></i><i style="transform:rotateY(180deg) translateZ(32px)"></i><i style="transform:rotateY(90deg) translateZ(32px)"></i><i style="transform:rotateY(-90deg) translateZ(32px)"></i><i style="transform:rotateX(90deg) translateZ(32px)"></i><i style="transform:rotateX(-90deg) translateZ(32px)"></i><em class="glyph3">${G.svg({id:initial.id,label:graph.source().title,channels:['identity','address'],operations:[]},{size:64})}</em>`}
  function renderField(source){
    const v=store.project('FIELD',fieldLocal);
    $('#surfaceName').textContent='FIELD';$('#surfaceDesc').textContent='lens 02 · spatial orientation + readable semantics';
    $('#surfaceBody').innerHTML=`<div class="field-grid">
      <div class="stage" id="stage"><div class="viewport"><div class="camera"><div class="room" id="room">${roomFaces()}${contextFrames(source)}<div class="cube" id="cube">${cubeFaces(v.representation.glyph)}</div></div></div></div><div class="stage-address">${esc(v.id)} · ${esc(v.representation.mark)} ${esc(v.state)}</div></div>
      <div class="field-edit"><form class="form" id="fieldForm">
        <div class="field"><label>identity · protected</label><input class="locked" value="${esc(v.id)}" disabled></div>
        <div class="field"><label>title</label><input name="title" value="${esc(v.title)}"></div>
        <div class="field"><label>thesis · remains readable</label><textarea name="thesis">${esc(v.thesis)}</textarea></div>
        <div class="field"><label>state</label><select name="state">${stateSelect(v.state)}</select></div>
        <div class="field"><label>camera · $view only</label><div class="camread"><span>RX<b id="camRx"></b></span><span>RY<b id="camRy"></b></span><span>SOURCE Δ<b class="zero">0</b></span></div></div>
        <div class="actions"><button class="btn hot" type="submit">COMMIT SEMANTICS</button><button class="btn" type="button" id="resetCamera">RESET VIEW</button></div>
        <div class="micro">Drag the room. If canonical revision or TRACE changes, this lens is broken.</div>
      </form></div></div>`;
    bindStage();updateRoom();
    $('#fieldForm').addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(e.currentTarget);store.edit('FIELD',{...v,title:fd.get('title'),thesis:fd.get('thesis'),state:fd.get('state')},{cause:'FIELD'});render()});
    $('#resetCamera').addEventListener('click',()=>{Object.assign(fieldLocal.camera,{x:0,y:0,z:0,rx:-10,ry:24,rz:0});updateRoom();renderLaws(store.source())});
  }

  function updateRoom(){
    const room=$('#room');if(!room)return;const c=fieldLocal.camera;room.style.transform=`translate3d(${c.x}px,${c.y}px,${c.z}px) rotateX(${c.rx}deg) rotateY(${c.ry}deg) rotateZ(${c.rz}deg)`;
    if($('#camRx'))$('#camRx').textContent=Math.round(c.rx)+'°';if($('#camRy'))$('#camRy').textContent=Math.round(c.ry)+'°';
  }
  function bindStage(){
    const stage=$('#stage');if(!stage)return;
    stage.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,rx:fieldLocal.camera.rx,ry:fieldLocal.camera.ry};stage.classList.add('drag');stage.setPointerCapture(e.pointerId)});
    stage.addEventListener('pointermove',e=>{if(!drag)return;fieldLocal.camera.ry=drag.ry+(e.clientX-drag.x)*.42;fieldLocal.camera.rx=Math.max(-78,Math.min(78,drag.rx-(e.clientY-drag.y)*.34));updateRoom()});
    const end=()=>{drag=null;stage.classList.remove('drag');renderLaws(store.source())};stage.addEventListener('pointerup',end);stage.addEventListener('pointercancel',end);
  }

  document.querySelectorAll('.mode').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
  $('#returnBtn').addEventListener('click',()=>{store.returnLast({cause:'USER_RETURN'});render()});
  $('#exportBtn').addEventListener('click',()=>download('interphase-return.json',JSON.stringify({history:graph.serialize(),returnToken:graph.makeReturnToken(graph.head(),anchor())},null,2),'application/json'));
  $('#importFile').addEventListener('change',async e=>{
    const file=e.target.files[0];if(!file)return;
    try{
      const packet=JSON.parse(await file.text()),next=checkedHistory(packet.history);
      const resolved=next.resolveReturn(packet.returnToken);
      if(!admitCandidate(next.snapshot(resolved.change)))throw Error('active extension law failed');
      next.checkout(resolved.change);graph=next;recoveryHeld=false;
      mode=['PLAIN','COMPACT','FIELD','DISC','DAYLINE','FAN','AXIS','RESEARCH'].includes(resolved.anchor.projection)?resolved.anchor.projection:'COMPACT';
      const view=I.FIELD.project(graph.source(),resolved.anchor.viewport||{}).$view;
      Object.assign(fieldLocal,view,{focus:initial.id});persist();
    }catch(err){storageMessage='IMPORT REJECTED · '+err.message;}
    e.target.value='';render();
  });
  $('#omnibar').addEventListener('input',e=>{
    const q=e.target.value.trim().toLowerCase();const commands=['COMPACT','PLAIN','FIELD','DISC','DAYLINE','FAN','AXIS','RESEARCH'];
    const matches=routes.filter(r=>(r.href+' '+r.title).toLowerCase().includes(q)).slice(0,12);
    $('#omniResults').innerHTML=commands.filter(c=>('/'+c.toLowerCase()).includes(q)).map(c=>`<button data-view="${c}">/${c.toLowerCase()}</button>`).join('')+matches.map(r=>`<button data-address="${esc(r.href)}">${esc(r.title)} <small>${esc(r.href)}</small></button>`).join('');
    $('#omniResults').querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setMode(b.dataset.view));
    $('#omniResults').querySelectorAll('[data-address]').forEach(b=>b.onclick=()=>{chooseSource(H.objectFromRoute(routes.find(r=>r.href===b.dataset.address)));setMode('COMPACT')});
  });
  $('#omniForm').onsubmit=e=>{e.preventDefault();$('#omniResults button')?.click()};
  document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#control').open=!$('#control').open;if($('#control').open)$('#omnibar').focus()}else if(e.key==='Escape')$('#control').open=false});
  $('#receiptReturn').onclick=()=>{if(!receiptSelection)return;if(!admitCandidate(graph.snapshot(receiptSelection))){render();return}graph.returnTo(receiptSelection,{cause:'USER_RECEIPT_RETURN',anchor:anchor()});persist();$('#receiptPreview').hidden=true;render()};
  $('#extensionFile').onchange=async e=>{
    const f=e.target.files[0];if(!f)return;
    try{if(f.size>100000)throw Error('extension exceeds 100 KB');const p=E.fromJSON(JSON.parse(await f.text()));const next=E.compose([...plugins,p]);plugins.push(p);catalog=next;$('#extensionStatus').textContent='ADDED · '+p.id+'@'+p.version;runExtensionChecks()}
    catch(err){$('#extensionStatus').textContent='REJECTED · '+err.message}e.target.value='';
  };
  function runExtensionChecks(){
    $('#extensionResults').textContent=JSON.stringify({plugins:catalog.plugins,type:E.check(catalog,'object',graph.source()),laws:E.inspect(catalog,graph.source())},null,2);
  }
  $('#checkExtensions').onclick=runExtensionChecks;
  $('#loadExample').onclick=async()=>{try{const r=await fetch('./extensions/title.json');if(!r.ok)throw Error('extension unavailable');const p=E.fromJSON(await r.json());const next=E.compose([...plugins,p]);plugins.push(p);catalog=next;$('#loadExample').disabled=true;$('#extensionStatus').textContent='ADDED · readable-title@1.0.0';runExtensionChecks()}catch(e){$('#extensionStatus').textContent=e.message}};
  window.addEventListener('storage',e=>{if(e.key===daylineKey&&['DAYLINE','FAN'].includes(mode))render()});
  const requested=new URLSearchParams(location.search).get('view')?.toUpperCase();
  if(['PLAIN','COMPACT','FIELD','DISC','DAYLINE','FAN','AXIS','RESEARCH'].includes(requested))mode=requested;
  render();
})().catch(e=>{document.querySelector('#surfaceBody').textContent='SOURCE UNRESOLVED · '+e.message;});
