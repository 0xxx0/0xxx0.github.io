/* READFIELD interpretation: exact source ranges + human-authored meaning.
 * Storage remains FieldSourceTrail; playback remains FieldAperture. */
(function(root,factory){
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.ReadfieldReviewModel=api;
 if(typeof document!=='undefined'&&root.ReadfieldSource)api.mount(root.ReadfieldSource);
})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
 const SCHEMA='readfield-review/v0.1',KINDS=['NOTE','QUESTION','APPLIED'];
 const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 const validRevision=s=>/^sha256:[a-f0-9]{64}$/.test(String(s));
 function bound(mark,source){
  return validRevision(source.revision)&&mark.revision===source.revision&&Number.isInteger(mark.charIndex)&&Number.isInteger(mark.endIndex)&&mark.charIndex>=0&&mark.endIndex>mark.charIndex&&mark.endIndex<=source.raw.length&&mark.quote===source.raw.slice(mark.charIndex,mark.endIndex);
 }
 function interpret(source){
  const all=source.trail?.marks||[],marks=all.filter(m=>bound(m,source));
  const ranges=marks.map(m=>[m.charIndex,m.endIndex]).sort((a,b)=>a[0]-b[0]);let covered=0,end=0;
  for(const [a,b] of ranges){covered+=Math.max(0,b-Math.max(a,end));end=Math.max(end,b)}
  return {marks,unbound:all.length-marks.length,covered,coverage:source.raw.length?covered/source.raw.length:0,open:marks.filter(m=>m.kind==='QUESTION'&&!m.resolved).length,applied:marks.filter(m=>m.kind==='APPLIED').length};
 }
 function find(raw,terms,limit=1000){
  const xs=[...new Set(String(terms||'').split(';').map(x=>x.trim()).filter(Boolean))].slice(0,12),matches=[];
  let truncated=false;
  for(const term of xs){
   const re=new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'giu');
   for(const m of raw.matchAll(re)){
    if(matches.length>=limit){truncated=true;break}
    matches.push({start:m.index,end:m.index+m[0].length,term,quote:m[0]});
   }
   if(truncated)break;
  }
  matches.sort((a,b)=>a.start-b.start||a.end-b.end);return {matches,truncated};
 }
 function packet(source){return {schema:SCHEMA,source:{revision:source.revision,address:source.address,label:source.label},review:source.trail?.review||{},marks:interpret(source).marks,parked:(source.trail?.marks||[]).filter(m=>!bound(m,source))}}
 function accept(input,source){
  if(input?.schema!==SCHEMA||!validRevision(source.revision)||input.source?.revision!==source.revision)throw Error('Source revision differs. Open the exact original source before importing.');
  if(!Array.isArray(input.marks)||input.marks.length>64||input.marks.some(m=>!m||!bound(m,source)||!KINDS.includes(m.kind)||typeof m.id!=='string'||!m.id||typeof m.note!=='string'||!m.note.trim()||m.note.length>500||m.quote.length>12000))throw Error('Invalid annotation range, quote or kind. Nothing imported.');
  const parked=input.parked||[];if(!Array.isArray(parked)||parked.length>64||parked.some(m=>!m||typeof m.id!=='string'||m.revision===source.revision||typeof m.note!=='string'||m.note.length>500||typeof m.quote!=='string'||m.quote.length>12000))throw Error('Invalid parked marks. Nothing imported.');
  const byId=new Map((source.trail?.marks||[]).map(m=>[m.id,m]));for(const m of [...parked,...input.marks])byId.set(m.id,m);
  if(byId.size>64)throw Error('Import would exceed 64 annotations. Export existing work first.');
  const review=input.review;if(!review||typeof review!=='object'||['purpose','terms','conclusion'].some(k=>typeof review[k]!=='string'))throw Error('Invalid reading purpose. Nothing imported.');
  return {marks:[...byId.values()],review:{purpose:review.purpose.slice(0,500),terms:review.terms.slice(0,300),conclusion:review.conclusion.slice(0,2000)}};
 }
 function markdown(source){
  const p=packet(source),s=interpret(source),q=p.review;
  return ['# '+source.label,'',source.address||'Local source',source.revision,'','## Seeking',q.purpose||'—','','## Working conclusion',q.conclusion||'—','',`${s.marks.length} annotations · ${s.open} open questions · ${Math.round(s.coverage*100)}% of source annotated. This records authored work, not measured comprehension.`,'',...p.marks.flatMap(m=>[`## ${m.kind}${m.kind==='QUESTION'?(m.resolved?' · resolved':' · open'):''} · char ${m.charIndex}:${m.endIndex}`,'',...m.quote.split('\n').map(l=>'> '+l),'',m.note||'—',''])].join('\n');
 }
 function mount(host){
  const ap=document.getElementById('docAperture'),reading=document.getElementById('reading');
  let source=host.snapshot(),model=interpret(source),matches=[],truncated=false,view='',editing=null,selection=null,notice='',undo=null,sourceEpoch=source.epoch;
  const sheet=document.createElement('dialog');sheet.className='rf-review-sheet';sheet.setAttribute('aria-label','Annotation');document.body.append(sheet);
  const band=document.createElement('section');band.className='rf-intent';band.innerHTML=`<label><span>SEEKING</span><input id="rf-purpose" maxlength="500" placeholder="What do you want from this work?" aria-label="What I am seeking"></label><details><summary title="Find exact terms">FIND</summary><input id="rf-terms" maxlength="300" placeholder="term; another phrase" aria-label="Exact terms, separated by semicolons"><span>Literal matches only · separate terms with ;</span></details><output id="rf-review-status"></output>`;
  document.querySelector('.apStage').before(band);
  const folded=document.createElement('section');folded.className='rf-fold';folded.hidden=true;folded.setAttribute('aria-label','Folded source passages');reading.after(folded);
  const purpose=band.querySelector('#rf-purpose'),terms=band.querySelector('#rf-terms'),status=band.querySelector('output');
  function write(delta){
   const r=host.write(delta);if(!r||r.storageState!=='READY'){notice='Unable to save in this browser. Your draft remains open.';return false}notice='';return true;
  }
  function saveIntent(){const old=host.snapshot().trail?.review||{};write({review:{...old,purpose:purpose.value,terms:terms.value}});refresh()}
  purpose.onchange=terms.onchange=saveIntent;
  function refresh(){
   source=host.snapshot();model=interpret(source);const found=find(source.raw,source.trail?.review?.terms);matches=found.matches;truncated=found.truncated;
   if(source.epoch!==sourceEpoch){sourceEpoch=source.epoch;selection=null;editing=null;undo=null;if(sheet.open)sheet.close();view='';notice=''}
   if(document.activeElement!==purpose)purpose.value=source.trail?.review?.purpose||'';
   if(document.activeElement!==terms)terms.value=source.trail?.review?.terms||'';
   const store=source.trail?.storageState;
   status.textContent=notice||(!validRevision(source.revision)?'Identifying source…':!['READY','EMPTY'].includes(store)?'Annotations unavailable · '+store:`${model.marks.length} notes · ${model.open} open · ${Math.round(model.coverage*100)}% annotated${terms.value?' · '+matches.length+(truncated?'+':'')+' matches':''}${model.unbound?' · '+model.unbound+' unbound marks':''}`);
   paintGlyph();if(view&&!folded.contains(document.activeElement))renderFold();
   window.dispatchEvent(new CustomEvent('readfield-review-state',{detail:{count:model.marks.length,open:model.open,view}}));
  }
  function polar(r,p){const a=-Math.PI/2+p*Math.PI*2;return [60+Math.cos(a)*r,60+Math.sin(a)*r]}
  function paintGlyph(){
   const svg=ap.shadowRoot?.querySelector('svg');if(!svg)return;
   let g=svg.querySelector('#reviewWitness');if(!g){g=document.createElementNS('http://www.w3.org/2000/svg','g');g.id='reviewWitness';svg.append(g)}
   const length=Math.max(1,source.raw.length),arc=(a,b)=>{const [x,y]=polar(39,a),[xx,yy]=polar(39,Math.min(a+.9999,Math.max(b,a+.006)));return `M${x} ${y} A39 39 0 ${b-a>.5?1:0} 1 ${xx} ${yy}`};
   const bars=matches.slice(0,250).map(m=>{const p=m.start/length,[x,y]=polar(53,p),[xx,yy]=polar(57,p);return `<path d="M${x} ${y} L${xx} ${yy}" stroke="#8a969b"/>`}).join('');
   g.innerHTML=bars+model.marks.map(m=>{const p=m.charIndex/length,[x,y]=polar(39,p),shape=m.kind==='QUESTION'&&!m.resolved?`<circle cx="${x}" cy="${y}" r="2.8" fill="#080b0d" stroke="#eee"/>`:m.kind==='APPLIED'?`<rect x="${x-2.5}" y="${y-2.5}" width="5" height="5" fill="#eee"/>`:`<path d="${arc(p,m.endIndex/length)}" fill="none" stroke="#eee" stroke-width="2.5"/>`;return `<g data-review-id="${esc(m.id)}"><title>${esc(m.kind+': '+(m.note||m.quote))}</title>${shape}</g>`}).join('');
   g.onpointerdown=e=>{const id=e.target.closest('[data-review-id]')?.getAttribute('data-review-id');if(!id)return;e.stopPropagation();const m=model.marks.find(x=>x.id===id);if(m){host.seek(m.charIndex);annotate(m)}};
   svg.setAttribute('aria-label','Source ring: angle is position; outer ticks are exact term matches; inner lines are annotations, hollow circles are open questions, squares are applied ideas.');
  }
  function captureSelection(){
   const sel=getSelection();if(!sel||sel.isCollapsed||!reading.contains(sel.anchorNode)||!reading.contains(sel.focusNode)||!reading.dataset.sourceStart){selection=null;return}
   const range=sel.getRangeAt(0),prefix=document.createRange();prefix.selectNodeContents(reading);prefix.setEnd(range.startContainer,range.startOffset);
   const start=Number(reading.dataset.sourceStart)+prefix.toString().length-Number(reading.dataset.sourcePrefix||0),quote=range.toString(),end=start+quote.length;
   const s=host.snapshot();selection=start>=0&&s.raw.slice(start,end)===quote?{start,end,quote,epoch:s.epoch}:null;
  }
  reading.addEventListener('pointerup',captureSelection);
  document.addEventListener('selectionchange',()=>{const sel=getSelection();if(sel&&!sel.isCollapsed&&reading.contains(sel.anchorNode)&&reading.contains(sel.focusNode))captureSelection()});
  function draft(mark){
   if(mark)return {...mark};
   host.text();const s=host.snapshot(),span=s.focus?.span;
   const picked=selection?.epoch===s.epoch?selection:span?{start:span.start,end:span.end,quote:s.raw.slice(span.start,span.end)}:null;
   if(!validRevision(s.revision)||!picked?.quote||picked.quote.length>12000)throw Error('Select a passage of up to 12,000 characters after the source is identified.');
   return {id:'review:'+s.revision+':'+picked.start+':'+picked.end,charIndex:picked.start,endIndex:picked.end,quote:picked.quote,revision:s.revision,progress:picked.start/Math.max(1,s.raw.length),address:s.focus.address,scale:s.focus.scale,index:s.focus.index,wpm:s.focus.wpm,kind:'NOTE',note:'',resolved:false,at:new Date().toISOString(),via:'READFIELD'};
  }
  function annotate(mark=null){
   ap.stop?.();try{editing=draft(mark)}catch(e){notice=e.message;refresh();return}
   const found=model.marks.find(m=>m.id===editing.id);if(found)editing={...found};
   sheet.innerHTML=`<form method="dialog"><header><b>ANNOTATE · ${editing.charIndex}:${editing.endIndex}</b><button value="cancel" aria-label="Close annotation">×</button></header><blockquote>${esc(editing.quote)}</blockquote><label>My reading<textarea id="rf-note" maxlength="500" placeholder="What does this mean to you? What follows from it?">${esc(editing.note)}</textarea></label><div class="rf-note-kind"><label>Kind<select id="rf-kind">${KINDS.map(k=>`<option${editing.kind===k?' selected':''}>${k}</option>`).join('')}</select></label><label><input type="checkbox" id="rf-resolved"${editing.resolved?' checked':''}> Question resolved</label></div><p class="rf-note-error" role="status"></p><footer>${found?'<button type="button" data-delete>REMOVE</button>':''}<button type="button" data-save>SAVE</button></footer></form>`;
   sheet.querySelector('[data-save]').onclick=()=>{
    const s=host.snapshot();if(!bound(editing,s)){sheet.querySelector('[role=status]').textContent='Source changed. Draft was not attached to different text.';return}
    const marks=s.trail.marks.filter(m=>m.id!==editing.id);if(marks.length>=64){sheet.querySelector('[role=status]').textContent='64 annotation limit. Export or remove an annotation first.';return}
    const note=sheet.querySelector('#rf-note').value.trim();if(!note){sheet.querySelector('[role=status]').textContent='Write your interpretation or question before saving.';return}
    const kind=sheet.querySelector('#rf-kind').value;
    marks.push({...editing,note,label:editing.quote.slice(0,180),kind,resolved:kind==='QUESTION'&&sheet.querySelector('#rf-resolved').checked});
    if(write({marks})){selection=null;sheet.close();refresh()}else sheet.querySelector('[role=status]').textContent=notice;
   };
   const del=sheet.querySelector('[data-delete]');if(del)del.onclick=()=>{undo={epoch:source.epoch,marks:source.trail.marks};if(write({marks:source.trail.marks.filter(m=>m.id!==editing.id)})){sheet.close();refresh()}};
   if(!sheet.open)sheet.showModal();sheet.querySelector('#rf-note').focus();
  }
  function show(which='notes'){ap.stop?.();view=view===which?'':which;renderFold();refresh()}
  function renderFold(){
   folded.hidden=!view;reading.hidden=!!view;document.documentElement.dataset.readfieldFold=view||'context';if(!view)return;
   const s=host.snapshot(),review=s.trail?.review||{},items=view==='matches'?matches:model.marks;
   folded.innerHTML=`<div class="rf-fold-head"><button data-fold="context">← CONTEXT</button><button data-fold="notes" aria-pressed="${view==='notes'}">NOTES ${model.marks.length}</button><button data-fold="matches" aria-pressed="${view==='matches'}">MATCHES ${matches.length}${truncated?'+':''}</button></div>${view==='notes'?`<label class="rf-conclusion">What I take from this work<textarea maxlength="2000" placeholder="Your working conclusion, decision or next use">${esc(review.conclusion)}</textarea></label>`:''}<p class="rf-fold-legend">${view==='matches'?'Exact term occurrences in source order. Up to 1,000 results; 250 ring ticks.':'Inner ring: line = note · ○ = open question · ■ = applied. Annotation coverage measures marked characters.'}</p><ol>${items.map((m,i)=>{const start=m.charIndex??m.start,end=m.endIndex??m.end,excerpt=view==='matches'?s.raw.slice(Math.max(0,start-100),Math.min(s.raw.length,end+180)):m.quote;return `<li><div><button data-seek="${start}">${view==='matches'?esc(m.term):esc(m.kind+(m.kind==='QUESTION'?(m.resolved?' · resolved':' · open'):''))} · ${start}:${end}</button>${view==='notes'?`<button data-edit="${i}">EDIT</button>`:''}</div><blockquote>${esc(excerpt)}</blockquote>${m.note?`<p>${esc(m.note)}</p>`:''}</li>`}).join('')}</ol>${!items.length?`<p>${view==='matches'?'Set literal terms above to find passages.':'Select text or choose a scope, tap ANNOTATE, and write what you make of it.'}</p>`:''}${model.unbound?`<details class="rf-parked"><summary>${model.unbound} unbound marks · retained, excluded from coverage</summary>${s.trail.marks.filter(m=>!bound(m,s)).map(m=>`<blockquote>${esc(m.quote||m.label)}</blockquote><p>${esc(m.note)}</p><small>${esc(m.revision||'Legacy bookmark · no exact revision')}</small>`).join('')}</details>`:''}<div class="rf-fold-footer"><button data-export="md">EXPORT .md</button><button data-export="json">BACKUP .json</button><button data-import>IMPORT</button>${undo?'<button data-undo>UNDO REMOVE</button>':''}<input type="file" hidden accept=".json,application/json" id="rf-import"></div>`;
   folded.querySelectorAll('[data-fold]').forEach(b=>b.onclick=()=>{view=b.dataset.fold==='context'?'':b.dataset.fold;renderFold();refresh()});
   folded.querySelectorAll('[data-seek]').forEach(b=>b.onclick=()=>{const at=Number(b.dataset.seek);view='';renderFold();host.seek(at);reading.scrollIntoView({block:'nearest'})});
   folded.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>annotate(model.marks[Number(b.dataset.edit)]));
   const conclusion=folded.querySelector('textarea');if(conclusion)conclusion.onchange=()=>{write({review:{...host.snapshot().trail.review,conclusion:conclusion.value}});refresh()};
   folded.querySelectorAll('[data-export]').forEach(b=>b.onclick=()=>{const type=b.dataset.export,s=host.snapshot(),text=type==='json'?JSON.stringify(packet(s),null,2):markdown(s),blob=new Blob([text],{type:type==='json'?'application/json':'text/markdown'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='readfield-review.'+type;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
   const file=folded.querySelector('#rf-import');folded.querySelector('[data-import]').onclick=()=>file.click();file.onchange=async()=>{const selected=file.files?.[0],epoch=source.epoch;if(!selected)return;try{if(selected.size>2000000)throw Error('Review file exceeds 2 MB.');const p=JSON.parse(await selected.text());if(epoch!==host.snapshot().epoch)throw Error('Source changed during import.');write(accept(p,host.snapshot()))}catch(e){notice=e.message}refresh()};
   const un=folded.querySelector('[data-undo]');if(un)un.onclick=()=>{if(undo.epoch===source.epoch)write({marks:undo.marks});undo=null;refresh()};
  }
  ap.addEventListener('aperture-focus',()=>{selection=null;paintGlyph()});
  window.addEventListener('readfield-source',refresh);window.addEventListener('readfield-review-change',refresh);
  window.ReadfieldReview=Object.freeze({annotate,show,refresh,state:()=>({view,...model,matches,truncated,notice})});refresh();
 }
 return Object.freeze({SCHEMA,bound,interpret,find,packet,accept,markdown,mount});
});
