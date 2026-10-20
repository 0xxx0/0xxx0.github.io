// Existing FIELD root adapter: effects live here; projection laws live in core.
import * as C from './field-instrument-core.mjs';
import {hashText,stableKey} from './lib/id.js';
import {esc,download} from './lib/dom.js';
import {skv} from './lib/store.js';
import './lib/moire-ambient.js';

const KINDS=['root','system','hub','workbench','experiment','artifact','rendezvous','alias','recovery','documentation','control','evidence','validator','route','index','utility','tool','lab','donor','donor-hub','source','adapter','derivative','art'];
const STATES=['ACTIVE','STABLE','CORE_ACTIVE','ACTIVE_NOW','ACTIVE_MAINTENANCE','PROOF_REQUIRED','RECOVER','CANDIDATE','PARKED','DONOR','FROZEN_DONOR','REFERENCE','UTILITY','UNKNOWN'];
const MEMORY=skv('field.instrument.frame.v01');
const $=s=>document.querySelector(s);
let state=C.initial(),rows=[],seen={},view=null,root=null,plane=null,reading=null,bar=null,anchor=null,hostAnchor=null;
let enabled=false,menu=false,probe=null,revisions=[],loadEpoch=0,noticeTimer=0,ready=false,editing=false,entered=false;
const digests=new Map();
const owner=()=>window.FieldIndexReadModel;
const held=()=>rows.find(r=>r.id===state.focus);
const entryText=()=>state.intent&&state.intent!=='SEARCH'?(window.FieldURLBarCore?.MODE_META?.[state.intent]?.ascii||'')+' '+state.query:state.query;
const blankQuery=()=>{const i=$('#fieldUrlInput');if(i)i.value='';const u=new URL(location.href);u.searchParams.delete('fi');history.replaceState(history.state,'',u)};
function notice(msg){const n=$('#fiNotice');if(!n)return;n.textContent=msg;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>{n.textContent=''},5000)}
function remember(){MEMORY.set({schema:'field-instrument-position/v0.1',frame:C.frame(state),anchor,host:window.FieldLensHost?.uiState?.()||null,hostAnchor})}
function commit(next,{native=false}={}){
  if(stableKey(next)===stableKey(state))return;
  revisions.push(C.frame(state));if(revisions.length>40)revisions.shift();
  state=next;probe=null;
  if(native&&held())window.__fieldAct?.focus(held().address);
  remember();render();
}
function quiet(){probe=null;root?.querySelectorAll('[data-reading]').forEach(el=>el.dataset.reading='0');renderReading();renderBearing()}
function edit(seed){
  if(!enabled)return;editing=true;$('#fieldUrlBar').dataset.editing='1';
  const input=$('#fieldUrlInput');if(seed!=null)input.value=seed;
  input.focus();input.setSelectionRange(input.value.length,input.value.length);
  if(!input.value)toggleMenu(true,'root');
  renderBearing();
}
function endEdit(){editing=false;delete $('#fieldUrlBar').dataset.editing;$('#fieldUrlInput').blur();renderBearing()}
function scopeOut(){
  endEdit();toggleMenu(false);
  if(state.path.length)commit(C.parent(state));else{blankQuery();commit({...state,query:'',scale:0,page:0})}
}
function wire(){
  if(root)return;
  const style=document.createElement('link');style.rel='stylesheet';style.href='./field-instrument.css';document.head.append(style);
  root=document.createElement('section');root.id='fieldInstrument';root.hidden=true;root.setAttribute('aria-label','FIELD instrument');
  root.innerHTML=`<div class="fiNotice" id="fiNotice" role="status" aria-live="polite"></div>
    <div class="fiField" id="fiField" aria-label="Counted folds. Tap to unfold; arrow keys to read." tabindex="0"><div class="fiPlane" id="fiPlane"></div></div>
    <section class="fiReading" id="fiReading" aria-label="Reading at current position"></section>
    <nav class="fiMenu" id="fiMenuPanel" aria-label="Instrument operations" hidden></nav>`;
  document.querySelector('main').append(root);plane=$('#fiPlane');reading=$('#fiReading');
  const frame=document.querySelector('.fieldUrlFrame');
  frame.insertAdjacentHTML('beforeend',`<button type="button" id="fiParent" aria-label="Unfold scope"><span id="fiScopeGlyph">⌁</span><small id="fiScopeScale"></small></button><button type="button" id="fiAddress"><span class="fiBarName" id="fiBarName"></span><span class="fiBarMeta" id="fiBarMeta"></span><svg id="fiRibbon" viewBox="0 0 1000 8" preserveAspectRatio="none" aria-hidden="true"></svg></button><button type="button" id="fiReturn" aria-label="Return to pinned position">↩</button>`);
  bar=document.createElement('button');bar.id='fiMenu';bar.type='button';bar.textContent='···';bar.setAttribute('aria-label','Instrument operations');bar.setAttribute('aria-expanded','false');
  frame.append(bar);bar.onclick=()=>toggleMenu();
  $('#fiAddress').onclick=()=>edit(entryText());
  $('#fiParent').onclick=()=>editing?(endEdit(),toggleMenu(false)):state.path.length||state.query?scopeOut():toggleMenu();
  $('#fiReturn').onclick=()=>{endEdit();returnPosition()};
  $('#fieldUrlInput').addEventListener('blur',()=>setTimeout(()=>{
    if(editing&&!$('#fieldUrlBar').contains(document.activeElement)&&!$('#fiMenuPanel').contains(document.activeElement))endEdit();
  },0));
  $('#fieldUrlBar').addEventListener('keydown',e=>{if(e.key==='Escape'&&enabled){e.preventDefault();e.stopPropagation();endEdit();toggleMenu(false)}});
  $('#fiField').addEventListener('pointerleave',quiet);
  let sweep=null,suppressTap=false;
  $('#fiField').addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse')sweep={x:e.clientX,y:e.clientY,moved:false}});
  $('#fiField').addEventListener('pointermove',e=>{
    if(!sweep||e.pointerType==='mouse')return;
    if(Math.hypot(e.clientX-sweep.x,e.clientY-sweep.y)>8)sweep.moved=true;
    if(sweep.moved){const b=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-fold]'),g=view?.folds.find(g=>g.id===b?.dataset.fold);if(g)read(g)}
  });
  $('#fiField').addEventListener('pointerup',()=>{suppressTap=!!sweep?.moved;sweep=null;if(suppressTap){quiet();setTimeout(()=>suppressTap=false,0)}});
  $('#fiField').addEventListener('pointercancel',()=>{sweep=null;quiet()});
  $('#fiField').addEventListener('click',e=>{if(suppressTap){e.preventDefault();e.stopImmediatePropagation();suppressTap=false}},true);
  // Only this explicit instrument owns these keys. Browser BACK and Ctrl-Z stay native.
  root.addEventListener('keydown',key);
  window.addEventListener('pagehide',()=>{if(enabled)remember()});
}
function toggleMenu(value=!menu,section='root'){
  menu=value;$('#fiMenuPanel').hidden=!menu;bar.setAttribute('aria-expanded',String(menu));
  if(menu){
    const groups={
      root:[['menu:views','⌁ SCOPE','CURRENT / ALL / CHANGES'],['menu:position','⌖ POSITION','TURN / PIN / REWIND'],['menu:local','··· FIELD','NEARBY / SEEN / SOURCE']],
      views:[['heads','⌖ CURRENT','native retained heads'],['field','⌁ ALL','every addressed destination'],['delta','∆ CHANGES','native local acknowledgements']],
      position:[['turn','⤾ TURN','fold plane into depth'],['anchor','⌖ PIN RETURN','retain this exact position'],['rewind','← REWIND VIEW','previous local frame']],
      local:[['relations','↔ NEARBY','declared parent / children / peers'],['menu:ack','✓ SEEN','ACKNOWLEDGE / INVERSE'],['menu:depth','⋮ SOURCE','MARK KEY / RECEIPT / PLAIN']],
      ack:[['seen','✓ SEEN','acknowledge held object; else field'],['rewind-seen','↶ UNDO SEEN','native acknowledgement inverse'],['field','⌁ ALL','all destinations']],
      depth:[['help','? READ THE MARK','encoding + limitations'],['receipt','↩ RETURN RECEIPT','download evidence + position'],['plain','≡ PLAIN','existing root interface']]
    };
    if(held())groups.native=owner().actions(held().address).map(a=>['native:'+a.id,a.label,'declared native exit']);
    const ops=groups[section]||groups.root;
    $('#fiMenuPanel').innerHTML=ops.map(([id,label,hint])=>`<button type="button" data-op="${id}">${label}<small>${hint}</small></button>`).join('');
    $('#fiMenuPanel').querySelectorAll('[data-op]').forEach(b=>b.onclick=()=>command(b.dataset.op));
  }
  renderBearing();
}
function renderBearing(next){
  if(!enabled||!view)return;
  const b=C.bearing(rows,state,view,anchor),addr=$('#fiAddress');
  $('#fiBarName').textContent=next?(({parent:'↑ ',child:'↓ ',peer:'↔ '}[next.relation]||'')+(next.object?.title||next.label)):b.title;
  $('#fiBarMeta').textContent=`${b.near?'↔':state.mode==='DELTA'?'∆':'⌁'} ${b.inside}/${b.total}${next?' → '+next.count:''} · ${b.delta===null?'∆?':'∆'+b.delta+(b.unmeasured?'+?':'')}${b.needs?' · !'+b.needs:''}${b.heldOutside?' · HOLD↗':''}`;
  addr.setAttribute('aria-label',b.label+(next?' Next fold: '+next.count+' objects.':''));addr.title=b.address;
  $('#fiScopeGlyph').textContent=editing?'×':state.path.length||state.query?'↑':({'FIELD':'⌁','DELTA':'∆','RELATIONS':'⋈'}[state.mode]||'⌁');
  $('#fiScopeScale').textContent=b.near?'d'+b.sourceDepth:String(state.scale+1)+'/5';
  $('#fiParent').setAttribute('aria-label',editing?'Close address input':state.path.length||state.query?'Unfold one scope decision':'Field operations');
  $('#fiReturn').hidden=!b.away||editing||menu;bar.hidden=b.away&&!editing&&!menu;
  const patterns=`<defs><pattern id="fiDeltaInk" width="7" height="8" patternUnits="userSpaceOnUse"><path d="M0 8 7 0" stroke="currentColor" stroke-width="1"/></pattern><pattern id="fiUnknownInk" width="9" height="8" patternUnits="userSpaceOnUse"><path d="M3 3h1" stroke="currentColor" stroke-width="2"/></pattern></defs>`;
  $('#fiRibbon').innerHTML=patterns+b.ribbon.map(p=>`<rect x="${1000*p.start/Math.max(1,b.total)}" y="1" width="${1000*p.count/Math.max(1,b.total)}" height="6" fill="${p.key==='changed'?'url(#fiDeltaInk)':p.key==='unknown'?'url(#fiUnknownInk)':'currentColor'}" opacity="${p.key==='outside'?'.08':p.key==='known'?'.16':'.42'}"/>`).join('')+(next?`<path d="M0 7H${1000*next.count/Math.max(1,b.total)}" stroke="currentColor" stroke-width="1.2"/>`:'');
}
export async function enter(){
  if(!ready){notice('FIELD source is still loading');return}
  wire();enabled=true;root.hidden=false;document.documentElement.dataset.instrument='1';
  const stored=MEMORY.get(),entry=entered?null:owner().entry(),incoming=entry?entry.focus:new URLSearchParams(location.search).get('focus');entered=true;
  try{
    if(stored?.schema==='field-instrument-position/v0.1'){
      state=C.restore(stored.frame);anchor=C.restore(stored.anchor);hostAnchor=stored.hostAnchor;
      if(stored.host)window.FieldLensHost?.restore(stored.host);
    }else{state={...C.initial(),intent:'HEADS',focus:rows.find(r=>r.address===window.__fieldAct?.focusHref?.())?.id||null};anchor=C.frame(state);hostAnchor=window.FieldLensHost?.uiState?.()||null}
  }catch(_){state=C.initial();anchor=C.frame(state);hostAnchor=window.FieldLensHost?.uiState?.()||null;notice('Stored position rejected; source FIELD remains intact')}
  const target=rows.find(r=>r.address===incoming);
  if(target&&target.id!==state.focus){state=C.locate(C.initial(),target);window.__fieldAct?.focus(target.address);anchor=C.frame(state);hostAnchor=window.FieldLensHost?.uiState?.()||null}
  if(incoming==='/'){state={...C.initial(),intent:'HEADS'};window.FieldLensHost?.restore({...window.FieldLensHost?.uiState?.(),focusHref:null});anchor=C.frame(state);hostAnchor=window.FieldLensHost?.uiState?.()||null}
  if(entry?.expression){const p=window.FieldURLBarCore.parse(entry.expression);if(p.mode!=='COMMAND'&&(p.query!==state.query||p.mode!==state.intent)){state={...state,scale:0,path:[],query:p.query,intent:p.mode,mode:'FIELD',page:0};anchor=C.frame(state);hostAnchor=window.FieldLensHost?.uiState?.()||null}}
  const u=new URL(location.href);u.searchParams.set('instrument','1');history.replaceState(history.state,'',u);
  const input=$('#fieldUrlInput');input.setAttribute('role','searchbox');input.setAttribute('aria-label','Locate FIELD address or narrow feature coordinates');input.setAttribute('aria-autocomplete','none');input.removeAttribute('aria-activedescendant');input.removeAttribute('aria-expanded');input.placeholder='address / source:git / :delta';
  window.FoveaLens?.radial?.close?.();window.FoveaLens?.toggle?.(false);window.FieldAwakeVisor?.hide?.();
  $('#fieldUrlInput').value=entryText();render();remember();
}
function exit(){
  endEdit();remember();enabled=false;root.hidden=true;delete document.documentElement.dataset.instrument;toggleMenu(false);
  const input=$('#fieldUrlInput');input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-expanded','false');input.placeholder='address · glyph · command';
  const u=new URL(location.href);u.searchParams.set('instrument','0');history.replaceState(history.state,'',u);
  window.FieldLensHost?.notify?.();
}
function returnPosition(){
  if(!anchor)return;blankQuery();
  if(hostAnchor)window.FieldLensHost?.restore(hostAnchor);
  toggleMenu(false);commit(C.restore(anchor));
}
function command(op){
  if(op.startsWith('menu:')){toggleMenu(true,op.slice(5));return}
  toggleMenu(false);endEdit();$('#fieldUrlInput').value=entryText();
  if(op.startsWith('native:')){openNative(held(),op.slice(7));return}
  if(['field','delta','relations','heads'].includes(op)){blankQuery();commit({...state,mode:op==='field'||op==='heads'?'FIELD':op.toUpperCase(),scale:0,path:[],query:'',intent:op==='heads'?'HEADS':'SEARCH',page:0});return}
  switch(op){
    case'turn':commit({...state,turn:(state.turn+1)%4});break;
    case'out':commit(C.parent(state));break;
    case'return':returnPosition();break;
    case'anchor':anchor=C.frame(state);hostAnchor=window.FieldLensHost?.uiState?.()||null;remember();notice('RETURN pinned here');break;
    case'rewind':{const prev=revisions.pop();if(prev){state=prev;probe=null;if(held())window.__fieldAct?.focus(held().address);else window.FieldLensHost?.restore({...window.FieldLensHost?.uiState?.(),focusHref:null});remember();render()}else notice('No earlier local frame');break}
    case'seen':owner().seen(held()?.address||null);load();notice('Native local SEEN applied');break;
    case'rewind-seen':if(owner().snapshot().canRewind){owner().rewind();load();notice('Native local acknowledgement restored')}else notice('No local SEEN action to undo');break;
    case'theme':$('#fiTheme')?.click();break;
    case'plain':exit();break;
    case'receipt':{
      const p={schema:'field-instrument-return/v0.1',authority:'EVIDENCE_ONLY',source:'/showcase-manifest.json',
        at:new Date().toISOString(),object:held()?.id||null,frame:C.frame(state),return_to:anchor,
        witness:{total:view.total,inside:view.inside,outside:view.outside,foldSum:view.folds.reduce((n,g)=>n+g.count,0)},
        residue:[view.residue,'Manifest adapter only; archive not connected','Human recognition and task advantage unmeasured'],next:'NONE_UNTIL_REPLAN'};
      download('field-position-return.json',JSON.stringify(p,null,2),'application/json');notice('Position + count witness downloaded');break;
    }
    case'help':showHelp();break;
    default:{
      // One native command registry/dispatcher; no shadow implementation of tools.
      const native=window.FieldURLBarCore?.resolveCommand?.(op);
      if(native&&native!=='instrument'){
        remember();if(['work','prove','read','trace','fovea','map','recent','up','down','hold','axis'].includes(native))exit();
        window.FieldOmnibar?.execute?.(native,held()?.address||'/','instrument');return;
      }
      notice('Unknown command. Tap the coordinate to reveal operations.');
    }
  }
  renderBearing();
}
function showHelp(){
  reading.innerHTML=`<div class="fiName">Read the mark</div><code>angle · kind / length · depth / lane · git</code><p>Nearby: ↑ parent, ↓ children, ↔ peers. Other slots pack counted folds. Arc: day of year. Tick: state. Pattern: content witness.</p><small>9 targets max · full address resolves lookalikes<br>Archive not connected · recognition unmeasured</small><div class="fiActions"><button data-close>RETURN TO FIELD</button></div>`;
  reading.querySelector('[data-close]').onclick=()=>renderReading();
}
function mark(g){
  if(g.relation){
    const paths={parent:'M60 43V15m-6 6 6-6 6 6',child:'M60 15v28m-6-6 6 6 6-6',peer:'M35 29h50m-6-6 6 6-6 6m-38-12-6 6 6 6'};
    return `<svg viewBox="0 0 120 60" aria-hidden="true"><path d="${paths[g.relation]}" stroke="currentColor" fill="none"/><path d="M43 51h${34*g.count/Math.max(1,view.inside)}" stroke="currentColor" opacity=".5"/></svg>`;
  }
  const r=g.object;
  if(!r){
    const polar=window.InterphaseRing.polar;
    const spokes=g.profile.kinds.map(([kind,n])=>{
      const slot=KINDS.indexOf(kind),a=(slot<0?Math.PI:slot*Math.PI/KINDS.length)-Math.PI,
        p=polar(60,31,8,a),q=polar(60,31,12+22*n/g.count,a);
      return `<path d="M${p[0]} ${p[1]}L${q[0]} ${q[1]}"/>`;
    }).join('');
    const ticks=g.profile.states.map(([st,n])=>{const i=STATES.indexOf(st);return `<path d="M${24+(i<0?15:i)*4} 44v${2+6*n/g.count}"/>`}).join('');
    return `<svg viewBox="0 0 120 60" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1">${spokes}<path d="M35 34h50m-4-3 4 3-4 3" opacity=".5"/>${ticks}</g>${g.changed?'<path d="M96 22v12m-3-6h6" stroke="currentColor" fill="none"/>':''}</svg>`;
  }
  const m=C.reading(r,KINDS,STATES),x=60-m.length/2,end=60+m.length/2;
  const arc=m.arc===null?'':`<path d="M47 41Q60 ${41-15*m.arc} 73 41" opacity=".55"/>`;
  // Known source: git is lane 1. Unknown categories are explicitly labelled in reading.
  const tick=m.tick<0?'M90 41l4 4m0-4-4 4':`M${24+m.tick*4} 45v4`;
  return `<svg viewBox="0 0 120 60" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1"><g transform="rotate(${m.angle??0} 60 27)"><path d="M${x} 27H${end}m-4-3 4 3-4 3"/></g><path d="M20 ${38+m.lane*3}h8M${m.lane<0?20:20+m.lane*3} 38v6" opacity=".5"/>${arc}<path d="${tick}"/></g>${m.angle===null?'<text x="91" y="30" fill="currentColor" font-size="10">?</text>':''}</svg>`;
}
function read(g){
  probe=g.id;root.querySelectorAll('[data-fold]').forEach(el=>el.dataset.reading=el.dataset.fold===g.id?'1':'0');renderReading(g);renderBearing(g);
}
function renderReading(g){
  if(!enabled)return;
  const r=g?.object||(!g&&held()),d=view.delta;
  if(!r&&!g){
    const title=state.mode==='DELTA'?(d.hasBaseline?`${d.changed.length} measured changes`:'No SEEN baseline'):'Choose a fold',unmeasured=d.unknown.length+d.unbased.length;
    reading.innerHTML=`<div class="fiName">${esc(title)}</div><code>${view.folds.length} folds · ${esc(view.dim)} · +1 root host</code><p>${state.mode==='DELTA'?'Each changed object counts once. SEEN is local and reversible.':'Tap to move in. Sweep or focus to read. The bar keeps your position.'}</p><small>${d.needs.length} need world · ${d.stalled.length} stalled · ${unmeasured} unmeasured<br>${d.hasBaseline?'timestamp-only delta':'∆? · no SEEN baseline'}</small><div class="fiActions"><button data-action="${!d.hasBaseline||d.unbased.length?'seen':'delta'}">${!d.hasBaseline||d.unbased.length?'✓ SEEN ALL':'∆ SINCE SEEN'}</button><button data-action="${owner().snapshot().canRewind?'rewind-seen':'help'}">${owner().snapshot().canRewind?'↶ UNDO SEEN':'? KEY'}</button></div>`;
  }else if(g&&!r){
    const members=rows.filter(x=>g.ids.includes(x.id)),parents=new Set(members.map(x=>x.parent).filter(Boolean));
    reading.innerHTML=`<div class="fiName">${esc(g.label)}</div><code>${g.count} objects · ${g.values.length} ${esc(g.dim)} value${g.values.length===1?'':'s'}</code><p>${g.changed===null?'Delta unknown (no SEEN baseline)':g.changed+' measured changes'} · ${g.unknown+g.unbased} unmeasured. ${state.mode==='RELATIONS'?parents.size+' declared parents.':'Unfold; held address survives.'}</p><small>Every member retained · no absorbed/deleted source</small><div class="fiActions"><button data-action="unfold">UNFOLD ${g.count}</button><button data-action="help">? KEY</button></div>`;
  }else{
    const offers=owner().actions(r.address),primary=offers[0],source=`${r.title} · ${r.address} · ${r.state} · ${r.kind} · ${r.payload.operation||'No move declared'} · ${r.payload.role||''}`,
      page=C.textPage(source,Math.max(0,state.page-1),innerWidth<360?85:105),when=r.time?new Date(r.time).toISOString().slice(0,10):'UNKNOWN',
      move=String(r.payload.operation||'No move declared').split(/\s*\/\s*/)[0],overview=`${move} · ${r.state} · ${r.payload.field?.owner||r.kind}`;
    const action=offers.length>1?`<button data-open>${offers.length} MOVES →</button>`:`<a data-open href="${esc(primary?.target||r.address)}">${esc(primary?.label||'OPEN')} ↗</a>`;
    reading.innerHTML=`<div class="fiName">${esc(r.title)}</div><code title="${esc(r.address)}">${esc(r.address)}</code><p>${esc(state.page?page.text:overview)}</p><small>${when} · d${r.depth} · ${esc(r.source)} · ${esc((r.digest||'').slice(7,15))}<br>${state.page?'source '+(page.at+1)+'/'+page.count:'source · '+page.count+' parts'} · ${page.total} characters</small><div class="fiActions">${action}<button data-page>${state.page?'SOURCE '+(page.at+1)+'/'+page.count:'READ'} →</button><button data-near>↔ NEARBY</button></div>`;
    reading.querySelector('[data-open]').onclick=e=>{
      if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
      e.preventDefault();
      if(offers.length>1){commit({...state,focus:r.id},{native:true});toggleMenu(true,'native')}
      else if(primary)openNative(r,primary.id);else openObject(r);
    };
    reading.querySelector('[data-near]').onclick=()=>{commit({...state,focus:r.id},{native:true});command('relations')};
    reading.querySelector('[data-page]').onclick=()=>{state={...state,page:(state.page+1)%(page.count+1)};remember();renderReading(g);renderBearing()};
  }
  reading.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>b.dataset.action==='unfold'?activate(g):command(b.dataset.action));
}
function openObject(r){
  state={...state,focus:r.id};window.__fieldAct?.focus(r.address);remember();
  // Navigation only. The receiving native host owns its next action and effect.
  window.__fieldAct?.open(r.address);
}
function openNative(r,id){
  if(!r||typeof owner()?.openAction!=='function'){notice('Native move unavailable');return}
  state={...state,focus:r.id};window.__fieldAct?.focus(r.address);remember();
  if(!owner().openAction(r.address,id))notice('Native move rejected; source unchanged');
}
function activate(g){
  if(!g)return;
  if(g.object&&g.object.id===state.focus){openObject(g.object);return}
  endEdit();toggleMenu(false);commit(C.into(rows,state,g,seen),{native:!!g.object});
  // The object remains the same field mark; detail is a field state, no overlay lens.
  if(g.object)read(g);
}
function render(){
  if(!enabled)return;
  const priorMark=document.activeElement?.closest?.('[data-fold]')?.dataset.fold;
  view=C.project(rows,state,seen);
  plane.style.setProperty('--fi-tilt',[0,-12,-24,-34][state.turn]+'deg');
  plane.style.setProperty('--fi-yaw',state.mode==='RELATIONS'?'0deg':[0,-5,0,5][state.turn]+'deg');
  plane.style.setProperty('--fi-scale',state.mode==='RELATIONS'?'1':'.92');
  const tags=C.addressTags(view.folds.map(g=>g.object).filter(Boolean));
  const places=C.placements(view),walking=state.mode==='RELATIONS'&&held();
  const edges=view.folds.map((g,i)=>{
    const p=places[i],width=.6+1.4*Math.sqrt(g.count/Math.max(1,view.inside));
    return `<path d="${walking?'M500 480L':'M500 0Q500 '+(p.y*6+90)+' '}${(p.x+15)*10} ${(p.y+14)*10}" stroke-width="${width}"/>`;
  }).join('');
  plane.innerHTML=(walking?`<button class="fiOrigin" data-origin aria-label="Open held ${esc(held().title)}" title="${esc(held().address)}">◎</button>`:'')+(view.folds.length?`<svg class="fiCreases" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="currentColor">${edges}</g></svg>`+view.folds.map((g,i)=>{
    const {x,y}=places[i];
    return `<button type="button" class="fiMark" data-fold="${esc(g.id)}" data-relation="${g.relation||''}" data-held="${g.ids.includes(state.focus)?'1':'0'}" style="left:${x}%;top:${y}%" aria-label="${g.relation?g.label+': ':''}${esc(g.object?g.object.title+' · '+g.object.address:g.label)} · ${g.count} objects${g.range?' · range fold':''}">${mark(g)}<span class="fiLabel">${esc(g.object?g.object.title:g.label)}</span><span class="fiCount">${g.object?esc(tags.get(g.object.id)):g.count}${g.changed?' ∆'+g.changed:''}</span></button>`;
  }).join(''):`<div class="fiEmpty">${walking?'No declared neighbours.\nThe address remains held.':state.mode==='DELTA'&&!view.delta.hasBaseline?'No SEEN baseline.\nUse SEEN ALL below to start.':'No objects in this lens.\nUnfold ↑ returns context.'}</div>`);
  const origin=plane.querySelector('[data-origin]');if(origin){origin.onclick=()=>openObject(held());origin.onfocus=quiet}
  plane.querySelectorAll('[data-fold]').forEach((b,i)=>{
    const g=view.folds[i];
    // Reuse the shared content-identity gratings, reveal only while reading.
    const members=new Set(g.ids),digest=g.object?.digest||stableKey(rows.filter(r=>members.has(r.id)).map(r=>[r.id,r.digest]).sort(([a],[b])=>a.localeCompare(b)));
    if(digest){
      const layers=globalThis.MoireAmbient.fromState({custom:globalThis.MoireAmbient.identity(digest)});
      b.style.setProperty('--fi-pattern',layers.map(l=>`repeating-linear-gradient(${90+l.angle}deg,transparent 0 ${l.pitch-1}px,color-mix(in srgb,var(--cool) ${l.reveal*100}%,transparent) ${l.pitch-1}px ${l.pitch}px)`).join(','));
      b.style.setProperty('--fi-phase',layers.map(l=>`${l.phase||0}px 0`).join(','));
    }
    b.onclick=()=>activate(g);b.onpointerenter=e=>{if(e.pointerType==='mouse')read(g)};b.onfocus=()=>read(g);b.onblur=quiet;
  });
  if(priorMark){const same=[...plane.querySelectorAll('[data-fold]')].find(b=>b.dataset.fold===priorMark);(same||$('#fiField')).focus({preventScroll:true})}
  renderReading();renderBearing();
}
function address(q){
  if(!enabled)return;
  const parsed=window.FieldURLBarCore.parse(q);if(parsed.mode==='COMMAND')return;
  if(parsed.query===state.query&&parsed.mode===state.intent)return;
  // Query narrows the current coordinate; it never picks an arbitrary first route.
  if(menu)toggleMenu(false);state={...state,query:parsed.query,intent:parsed.mode,page:0};probe=null;render();
}
function key(e){
  if(!enabled)return false;
  const typing=e.target?.id==='fieldUrlInput';
  if(e.key==='Escape'){
    e.preventDefault();e.stopImmediatePropagation();
    if(menu)toggleMenu(false);if(typing){blankQuery();state={...state,query:''};render();endEdit()}else quiet();return true;
  }
  if(e.key==='Enter'&&typing){
    e.preventDefault();e.stopImmediatePropagation();const q=e.target.value.trim();
    const parsed=window.FieldURLBarCore.parse(q);
    if(parsed.mode==='COMMAND'){
      if(parsed.command){
        const target=parsed.query&&rows.find(r=>r.address===parsed.query||r.id===parsed.query);
        if(parsed.query&&!target){notice('Exact native command target required');return true}
        if(target)commit(C.locate(state,target),{native:true});
        command(parsed.command);return true
      }
      command(parsed.query||'help');return true
    }
    if(parsed.mode==='RISE'){command('up');return true}
    if(parsed.command){
      const target=parsed.query&&rows.find(r=>r.address===parsed.query||r.id===parsed.query);
      if(parsed.query&&!target){notice('Exact native command target required');return true}
      if(target)commit(C.locate(state,target),{native:true});command(parsed.command);return true;
    }
    const r=rows.find(r=>r.address===parsed.query||r.id===parsed.query);
    if(r){blankQuery();endEdit();toggleMenu(false);commit(C.locate(state,r),{native:true});if(parsed.mode==='TURN')command('open');else if(parsed.mode==='HERMES')command('run');return true}
    if(view.inside===1){const r=rows.find(r=>r.id===view.folds[0]?.ids[0]);blankQuery();endEdit();toggleMenu(false);commit(C.locate(state,r),{native:true});if(parsed.mode==='TURN')command('open');else if(parsed.mode==='HERMES')command('run');return true}
    endEdit();return true; // The counted field already answers an ambiguous expression.
  }
  if(['ArrowDown','ArrowUp','ArrowLeft','ArrowRight'].includes(e.key)){
    if(typing&&['ArrowLeft','ArrowRight'].includes(e.key))return false;
    e.preventDefault();e.stopImmediatePropagation();const marks=[...plane.querySelectorAll('[data-fold]')];if(!marks.length)return true;
    const index=marks.indexOf(document.activeElement),delta=e.key==='ArrowDown'?3:e.key==='ArrowUp'?-3:e.key==='ArrowLeft'?-1:1;
    marks[((Math.max(0,index)+delta)%marks.length+marks.length)%marks.length].focus();return true;
  }
  return false;
}
async function load(){
  const snapshot=owner()?.snapshot();if(!snapshot?.routes?.length)return;
  const epoch=++loadEpoch;let next;
  try{
    next=C.records(snapshot.routes,snapshot.heads);
    await Promise.all(next.map(async r=>{
      const bytes=stableKey(r.payload),cached=digests.get(r.id);
      r.digest=cached?.bytes===bytes?cached.digest:await hashText(bytes);
      digests.set(r.id,{bytes,digest:r.digest});
    }));
  }catch(e){if(enabled)notice('FIELD source rejected: '+e.message);return}
  if(epoch!==loadEpoch)return;
  rows=next;seen=snapshot.seen;ready=true;
  if(enabled){const href=window.__fieldAct?.focusHref?.(),r=rows.find(r=>r.address===href);if(r)state={...state,focus:r.id};render()}
}
function boot(){
  if(location.pathname!=='/')return;
  window.FieldInstrument=Object.freeze({enter,exit,edit,active:()=>enabled,address,key,
    turn:()=>{if(!enabled)return false;command('turn');return true},
    snapshot:()=>({frame:C.frame(state),anchor:C.frame(anchor),view:view&&{total:view.total,inside:view.inside,outside:view.outside,counts:view.folds.map(g=>g.count)}})});
  window.addEventListener('field-index:state',()=>load());
  let attempts=0;
  const start=async()=>{
    if(!window.FieldURLBar||!owner()?.snapshot()?.routes?.length){if(++attempts<120)setTimeout(start,100);return}
    wire();await load();
    const mode=new URLSearchParams(location.search).get('instrument');
    if(mode==='1'||(mode!=='0'&&!owner().entry().native))await enter();
  };start();
}
boot();
