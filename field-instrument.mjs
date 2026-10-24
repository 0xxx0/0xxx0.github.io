// Existing FIELD root adapter: effects live here; projection laws live in core.
import {hashText,stableKey} from './lib/id.js';
import {esc,download} from './lib/dom.js';
import {kv} from './lib/store.js';
import './lib/moire-ambient.js';
// One HTML release address invalidates this adapter and its coupled projection.
const release=new URL(import.meta.url).search;
const C=await import('./field-instrument-core.mjs'+release);

// localStorage, not sessionStorage: the frame and the RETURN pin belong to the
// position, and a position that dies with the tab is not a position.
const MEMORY=kv('field.instrument.frame.v01');
const $=s=>document.querySelector(s);
let state=C.initial(),rows=[],seen={},view=null,root=null,plane=null,reading=null,bar=null,anchor=null,hostAnchor=null;
let enabled=false,menu=false,menuExpanded=false,probe=null,revisions=[],loadEpoch=0,noticeTimer=0,ready=false,editing=false,entered=false,readingMarkup='';
let flights=[],room=null,roomTimer=0;
// THE VIEW CYCLE. The substrate is one ordered map; STRIP and PLAN are two
// observer maps of it, and the room is the third state (reached by folding a
// mark). The mode is deliberately NOT part of the frame: switching views can
// never move the held object, the pin or a single room slot (position truth).
let planView=false,listView=false,listPage=0,decodeOpen=false,decodeRelease=false,releaseTimer=0,plan=null;
const digests=new Map();
const owner=()=>window.FieldIndexReadModel;
const held=()=>rows.find(r=>r.id===state.focus);
const entryText=()=>state.intent&&state.intent!=='SEARCH'?(window.FieldURLBarCore?.MODE_META?.[state.intent]?.ascii||'')+' '+state.query:state.query;
const blankQuery=()=>{const i=$('#fieldUrlInput');if(i)i.value='';const u=new URL(location.href);u.searchParams.delete('fi');history.replaceState(history.state,'',u)};
function notice(msg){const n=$('#fiNotice');if(!n)return;n.textContent=msg;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>{n.textContent=''},5000)}
function remember(){MEMORY.set({schema:'field-instrument-position/v0.1',frame:C.frame(state),anchor,host:window.FieldLensHost?.uiState?.()||null,hostAnchor})}
function commit(next,{native=false}={}){
  stopFlight();
  if(stableKey(next)===stableKey(state))return;
  revisions.push(C.frame(state));if(revisions.length>40)revisions.shift();
  state=next;probe=null;
  if(native&&held())window.__fieldAct?.focus(held().address);
  remember();render();
}
function camera(){return `rotateX(${plane.style.getPropertyValue('--fi-tilt')||'0deg'}) rotateY(${plane.style.getPropertyValue('--fi-yaw')||'0deg'}) scale(${plane.style.getPropertyValue('--fi-scale')||'1'})`}
function stopFlight(){flights.forEach(a=>a.cancel());flights=[];root?.querySelectorAll('.fiTransit').forEach(n=>n.remove());if(plane)plane.style.pointerEvents=''}
function travel(next,{foldId,reverse=false,native=false}={}){
  // In the PLAN the plane is not on screen and reduced motion never flies:
  // either way the walk IS the commit — same frame, same revision, no camera.
  if(planView||matchMedia('(prefers-reduced-motion:reduce)').matches){commit(next,{native});return}
  stopFlight();
  const past=plane.cloneNode(true),priorCamera=camera();
  let target=[...plane.querySelectorAll('[data-fold]')].find(b=>b.dataset.fold===foldId);
  let box=target?.getBoundingClientRect(),bounds=plane.getBoundingClientRect();
  commit(next,{native});
  if(reverse){target=[...plane.querySelectorAll('[data-fold]')].find(b=>b.dataset.fold===foldId);box=target?.getBoundingClientRect();bounds=plane.getBoundingClientRect()}
  const dx=box?box.x+box.width/2-bounds.x-bounds.width/2:0,dy=box?box.y+box.height/2-bounds.y-bounds.height/2:0;
  past.removeAttribute('id');past.classList.add('fiTransit');past.inert=true;past.setAttribute('aria-hidden','true');
  past.innerHTML=past.innerHTML.replaceAll('fiGrain','fiPastGrain');
  $('#fiField').append(past);plane.style.pointerEvents='none';
  const rest=camera(),small=`translate(${dx}px,${dy}px) translateZ(-140px) scale(.28) rotateY(12deg)`,large=`translate(${-dx*3}px,${-dy*3}px) translateZ(170px) scale(3.2) rotateY(-10deg)`;
  const timing={duration:440,easing:'cubic-bezier(.2,.7,.2,1)',fill:'both'};
  const a=past.animate(reverse?[{opacity:1,transform:priorCamera},{opacity:0,transform:small}]:[{opacity:1,transform:priorCamera},{opacity:0,transform:large}],timing);
  const b=plane.animate(reverse?[{opacity:0,transform:large},{opacity:1,transform:rest}]:[{opacity:0,transform:small},{opacity:1,transform:rest}],timing);
  flights=[a,b];b.finished.then(()=>{if(flights.includes(b))stopFlight()}).catch(()=>{});
}
function putReading(html){if(html!==readingMarkup){reading.innerHTML=html;readingMarkup=html}}
function quiet(e){
  if(e?.relatedTarget&&reading?.contains(e.relatedTarget))return;
  probe=null;root?.querySelectorAll('[data-reading]').forEach(el=>el.dataset.reading='0');renderReading();renderBearing();
}
function edit(seed){
  if(!enabled)return;editing=true;$('#fieldUrlBar').dataset.editing='1';
  const input=$('#fieldUrlInput');if(seed!=null)input.value=seed;
  input.focus();input.setSelectionRange(input.value.length,input.value.length);
  if(!input.value)toggleMenu(true,'root');
  renderBearing();
}
function endEdit(){editing=false;delete $('#fieldUrlBar').dataset.editing;$('#fieldUrlInput').blur();renderBearing()}
function scopeOut(){
  endEdit();toggleMenu(false);closeRoom();
  if(state.path.length){const last=state.path.at(-1),next=C.parent(state),v=C.project(rows,next,seen),g=v.folds.find(g=>g.dim===last.dim&&stableKey(g.values)===stableKey(last.values));travel(next,{foldId:g?.id,reverse:true})}else{blankQuery();commit({...state,query:'',scale:0,page:0})}
}
function wire(){
  if(root)return;
  const style=document.createElement('link');style.rel='stylesheet';style.href='./field-instrument.css'+release;document.head.append(style);
  root=document.createElement('section');root.id='fieldInstrument';root.hidden=true;root.setAttribute('aria-label','FIELD instrument');
  root.innerHTML=`<div class="fiNotice" id="fiNotice" role="status" aria-live="polite"></div>
    <nav class="fiViewTabs" id="fiViewTabs" role="tablist" aria-label="One FIELD, three readings" hidden>
      <button type="button" role="tab" data-view="list" aria-selected="false">≡ LIST</button>
      <button type="button" role="tab" data-view="strip" aria-selected="true">⌁ STRIP</button>
      <button type="button" role="tab" data-view="plan" aria-selected="false">⬡ PLAN</button>
    </nav>
    <div class="fiField" id="fiField" aria-label="Tap a region to enter it. The VIEW chip in the bar switches the strip map and the hex plan of the same field; holding any mark decodes it. UP moves out; RETURN restores your pinned place." tabindex="0"><div class="fiPlane" id="fiPlane"></div><div class="fiPlan" id="fiPlan"></div><section class="fiList" id="fiList" role="tabpanel" aria-label="Readable FIELD records"></section></div>
    <section class="fiReading" id="fiReading" aria-label="Reading at current position"></section>
    <nav class="fiMenu" id="fiMenuPanel" aria-label="Instrument operations" hidden></nav>`;
  document.querySelector('main').append(root);plane=$('#fiPlane');reading=$('#fiReading');
  const frame=document.querySelector('.fieldUrlFrame');
  // The map is its own strip, not a child of the address button: a tick tap must
  // locate an object without also opening the address editor.
  frame.insertAdjacentHTML('beforeend',`<button type="button" id="fiParent" aria-label="Unfold scope"><span id="fiScopeGlyph">⌁</span><small id="fiScopeScale"></small></button><button type="button" id="fiAddress"><span class="fiBarName" id="fiBarName"></span><span class="fiBarMeta" id="fiBarMeta"></span></button><button type="button" id="fiReturn" aria-label="Return to pinned position">↩</button><button type="button" id="fiView" data-map="strip" aria-controls="fiViewTabs" aria-expanded="false" aria-label="Choose list, strip, or plan reading of the same field."><span id="fiViewName">⌁ STRIP</span></button><svg id="fiRibbon" viewBox="0 0 264 51" preserveAspectRatio="none" role="img" aria-label="Whole-field map"></svg>`);
  bar=document.createElement('button');bar.id='fiMenu';bar.type='button';bar.textContent='···';bar.setAttribute('aria-label','Instrument operations');bar.setAttribute('aria-expanded','false');
  frame.append(bar);bar.onclick=()=>toggleMenu();
  $('#fiAddress').onclick=()=>edit(entryText());
  $('#fiParent').onclick=()=>editing?(endEdit(),toggleMenu(false)):state.path.length||state.query?scopeOut():toggleMenu(true,'views');
  $('#fiReturn').onclick=()=>{endEdit();returnPosition()};
  // THE VIEW CYCLE: STRIP <-> PLAN. The room is the third state and is reached
  // by folding a mark, never by this chip — and the chip moves no frame field.
  $('#fiView').onclick=()=>toggleViews();
  const readingTabs=$('#fiViewTabs');
  readingTabs.querySelectorAll('[data-view]').forEach(b=>{
    b.onclick=()=>setView(b.dataset.view);
    b.onkeydown=e=>{
      const tabs=[...readingTabs.querySelectorAll('[data-view]')],i=tabs.indexOf(b);
      if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){
        e.preventDefault();e.stopPropagation();
        const k=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
        tabs[k].focus({preventScroll:true});return
      }
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();toggleViews(false)}
    };
  });
  wireRibbon();wirePlan();wireDecode();
  let resizeTimer=0;
  // The plan re-fits its box, like the strip: the sizing law is pure, the box is not.
  window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(enabled&&view){renderBearing();if(planView)renderPlan();if(listView)renderList()}},150)});
  $('#fieldUrlInput').addEventListener('blur',()=>setTimeout(()=>{
    if(editing&&!$('#fieldUrlBar').contains(document.activeElement)&&!$('#fiMenuPanel').contains(document.activeElement))endEdit();
  },0));
  $('#fieldUrlBar').addEventListener('keydown',e=>{if(e.key==='Escape'&&enabled){e.preventDefault();e.stopPropagation();endEdit();toggleMenu(false)}});
  $('#fiField').addEventListener('pointerleave',quiet);
  reading.addEventListener('pointerleave',quiet);
  reading.addEventListener('focusout',quiet);
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
  menu=value;menuExpanded=menu?menuExpanded:false;
  $('#fiMenuPanel').hidden=!menu;bar.setAttribute('aria-expanded',String(menu));
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
    // Folding, never clipping: what does not fit prints its own count (+N).
    const capped=C.foldOps(ops,6),shown=menuExpanded?ops:capped.shown,
      more=menuExpanded?0:capped.hidden,less=menuExpanded?capped.hidden:0;
    $('#fiMenuPanel').innerHTML=shown.map(([id,label,hint])=>`<button type="button" data-op="${id}">${label}<small>${hint}</small></button>`).join('')
      +(more?`<button type="button" data-op="__more" aria-expanded="false">+${more}<small>MORE OPERATIONS</small></button>`:'')
      +(less?`<button type="button" data-op="__less" aria-expanded="true">−${less}<small>FOLD AWAY</small></button>`:'');
    $('#fiMenuPanel').querySelectorAll('[data-op]').forEach(b=>b.onclick=()=>{
      if(b.dataset.op==='__more'){menuExpanded=true;toggleMenu(true,section);return}
      if(b.dataset.op==='__less'){menuExpanded=false;toggleMenu(true,section);return}
      command(b.dataset.op);
    });
  }
  renderBearing();
}
/* ---- THE GOD'S-EYE MAP -------------------------------------------------
   The whole-field strip is a positioned instrument: stacked lanes (never a
   sub-pixel smear), tick order = the turned axis, in-scope brighter than
   out-of-scope, held object unmistakable, and a printed count per lane. */
let ribbonLayout=null,ribbonHold=null;
function ribbonStates(){return C.stateScale(rows)}
// Measure the strip's OWN box, never the frame's and never a transformed rect:
// the VIEW chip owns the map's first column, and the page's entry transform
// would otherwise shrink the map into sub-pixel lanes on the very first render.
function ribbonWidth(){
  const svg=$('#fiRibbon'),frame=svg?.parentElement,
    own=Math.round(svg?.clientWidth||0),host=Math.round(frame?.clientWidth||0);
  // Prefer the strip's own box; fall back to the frame minus the VIEW chip's
  // fixed 44px column (and 264 before either exists), so the very first paint
  // already carries the right lane count instead of a bar that snaps shut.
  return Math.max(64,own>64?own:host>108?host-44:264);
}
function renderRibbon(next){
  const svg=$('#fiRibbon');if(!svg||!view)return;
  const map=C.overview(rows,view,state.focus,C.axis(state)),ax=C.axis(state),W=ribbonWidth();
  const R=C.ribbon(map,W),laneH=C.RIBBON.lane,gap=C.RIBBON.gap,states=ribbonStates();
  const maxDepth=Math.max(1,...rows.map(r=>Number(r.depth)||0)),offBudget=laneH-13,maxLen=10;
  const step=states.length>1?offBudget/(states.length-1):0,lenOf=d=>3+(maxLen-3)*Math.min(1,Math.max(0,Number(d)||0)/maxDepth);
  const preview=new Set(next?.ids||[]);
  const lanes=R.groups.map(g=>{
    const base=g.y+laneH-3,ticks=g.items.map((p,k)=>{
      const x=(1+(k+.5)*R.pitch).toFixed(2),row=rows.find(r=>r.id===p.id),rd=C.reading(row||{depth:0,state:states[0]},states);
      const t=Math.max(0,rd.tick),bottom=(base-t*step).toFixed(1),top=(base-t*step-lenOf(row?.depth)).toFixed(1);
      const cls=['tick',p.inside?'in':'out',p.held?'held':'',preview.has(p.id)?'preview':''].filter(Boolean).join(' ');
      // Held is unmistakable by SHAPE: full lane height + a cap diamond. Only the
      // tick itself carries the id — exactly one tick per destination, always.
      if(p.held)return `<path class="${cls}" data-map-id="${esc(p.id)}" data-tick="${t}" d="M${x} ${g.y+1}V${base}"/><path class="heldCap" data-map-cap="${esc(p.id)}" d="M${x} ${g.y}l3 3-3 3-3-3z"/>`;
      return `<path class="${cls}" data-map-id="${esc(p.id)}" data-tick="${t}" d="M${x} ${top}V${bottom}"/>`;
    }).join('');
    return `<path class="laneRule" d="M1 ${(g.y+laneH-1.5).toFixed(1)}H${(R.usable+1).toFixed(1)}"/>${ticks}<text class="laneN" x="${W-3}" y="${(g.y+laneH-7).toFixed(1)}" text-anchor="end">${g.count}</text>`;
  }).join('');
  const laneList=R.groups.map(g=>g.count).join(' + ');
  svg.setAttribute('viewBox',`0 0 ${W} ${R.height}`);
  svg.setAttribute('data-lanes',String(R.lanes));
  svg.setAttribute('data-pitch',R.pitch.toFixed(2));
  svg.setAttribute('data-axis',ax);
  svg.classList.toggle('preview',!!next);
  svg.setAttribute('aria-label',`Whole field map: ${map.length} destinations folded into ${R.lanes} lane${R.lanes===1?'':'s'} of ${laneList}, ordered by ${ax}. ${view.inside} in scope, ${view.outside} outside, ${view.total} total. Tap a tick to locate that object; tap it again to enter its room.`);
  // YOU-ARE-HERE: while the room is open the held mark carries a dot on its own map
  // tick — the whole never leaves (god's-eye law), and the dot is a real datum.
  let here='';
  const heldHere=room?R.groups.find(g=>g.items.some(p=>p.id===room.id)):null,k=heldHere?heldHere.items.findIndex(p=>p.id===room.id):-1;
  if(k>=0)here=`<circle class="here" cx="${(1+(k+.5)*R.pitch).toFixed(2)}" cy="${(heldHere.y+laneH/2).toFixed(1)}" r="3.5"/>`;
  if(room)svg.dataset.room='1';else delete svg.dataset.room;
  svg.innerHTML=lanes+here;
  ribbonLayout={map,lanes:R.lanes,per:R.per,pitch:R.pitch,left:1,laneH,gap,groups:R.groups,width:W};
  document.documentElement.style.setProperty('--fi-ribbon-h',`${R.height}px`);
}
function ribbonTick(e){
  const L=ribbonLayout;if(!L||!L.map.length||!L.groups.length)return null;
  const box=$('#fiRibbon').getBoundingClientRect(),x=e.clientX-box.left,y=e.clientY-box.top;
  const idx=Math.max(0,Math.min(L.lanes-1,Math.floor(y/(L.laneH+L.gap))));
  const g=L.groups.find(g=>g.lane===idx)||L.groups.at(-1);
  const k=Math.max(0,Math.min(g.items.length-1,Math.round((x-L.left)/L.pitch-.5)));
  return g.items[k];
}
function readTick(r){
  probe=null;root?.querySelectorAll('[data-fold]').forEach(el=>el.dataset.reading='0');
  renderReading({object:r,ids:[r.id],count:1,dim:'id',values:[r.id],label:r.title,range:false,
    changed:null,unknown:0,unbased:0,profile:{kinds:[],states:[],sources:[],needs:0}});
  renderBearing();
}
// First tap locates (the object becomes the held position); the second tap on the
// same tick enters its fold. An object outside the lens is entered exactly.
function locateTick(id){
  const r=rows.find(x=>x.id===id);if(!r)return;
  const fold=view?.folds.find(f=>f.ids.includes(id));
  endEdit();toggleMenu(false);
  // Tap the SAME tick again = enter the object's OWN fold: locate it exactly, then
  // hinge its room up at that mark's screen coordinates.
  if(state.focus===id&&fold){
    commit(C.locate(state,r),{native:true});
    const g=view.folds.find(f=>f.object&&f.object.id===r.id);
    if(!g){activate(fold);return}
    const mark=[...plane.querySelectorAll('[data-fold]')].find(b=>b.dataset.fold===g.id);
    read(g);openRoom(g,mark?markPoint(mark):null);return;
  }
  closeRoom();
  commit({...state,focus:id,page:0},{native:true});
  readTick(r);
}
function wireRibbon(){
  const svg=$('#fiRibbon'),address=$('#fiAddress');
  // The map re-folds itself to the strip it is actually given, however the strip
  // is later re-laid out (rotate, resize, another fold opening). It observes the
  // STRIP's own box, because that is the box ribbonWidth() measures — the VIEW
  // chip now owns the frame's first column, so the frame is no longer the datum.
  const observe=new ResizeObserver(()=>{const w=ribbonWidth();if(enabled&&view&&w&&w!==ribbonLayout?.width)renderRibbon(null)});
  observe.observe(svg);observe.observe(svg.parentElement||svg);
  const end=()=>{svg.classList.remove('bloom');ribbonHold=null};
  svg.addEventListener('pointerdown',e=>{
    // While the address field is open, taps belong to the bar — the map stays quiet.
    if(!enabled||!view||editing)return;
    svg.classList.add('bloom');
    const hit=ribbonTick(e);ribbonHold={id:hit?.id||null,x:e.clientX,y:e.clientY,t:Date.now()};
    if(hit)locateTick(hit.id);
  });
  svg.addEventListener('pointermove',e=>{
    if(!ribbonHold)return;
    const hit=ribbonTick(e);
    if(hit&&hit.id!==ribbonHold.id&&Date.now()-ribbonHold.t>120){ribbonHold.id=hit.id;ribbonHold.t=Date.now();locateTick(hit.id)}
  });
  svg.addEventListener('pointerup',end);svg.addEventListener('pointercancel',end);svg.addEventListener('pointerleave',end);
  svg.addEventListener('click',e=>{e.preventDefault();e.stopPropagation()});
  // Keyboard: the map is reachable from the address control, never pointer-only.
  address.addEventListener('keydown',e=>{
    if(!enabled||editing||!ribbonLayout?.map.length)return;
    const delta={ArrowRight:1,ArrowLeft:-1,ArrowDown:ribbonLayout.per,ArrowUp:-ribbonLayout.per}[e.key];
    if(delta===undefined)return;
    e.preventDefault();e.stopImmediatePropagation();
    const map=ribbonLayout.map,at=Math.max(0,map.findIndex(p=>p.id===state.focus));
    locateTick(map[(at+delta+map.length)%map.length].id);
  });
}

/* ==== THE PLAN WALK — the field as a place ===============================
   The strip maps the field in lanes; the PLAN walks it. Same ordered map, same
   counts, same held object, same pin — only the observer changes. The rooms
   are flat-top hexagons in the turned axis's order, spiralling out from the
   centre: adjacent rooms are adjacent in the axis, so "next" is "next door".
   Tap a room and the cube-net room hinges AT that tile (openRoom, the one
   room both views share). Where the phone cannot hold 206 legible rooms the
   outer rings fold and print their counts at the edge. */
const planMap=()=>C.overview(rows,view,state.focus,C.axis(state));
function tileFold(id){
  const r=rows.find(x=>x.id===id),g=view?.folds.find(f=>f.ids.includes(id));
  if(g)return g;
  // An object outside the current lens still has a room; it just has no group.
  return r?{id:'tile:'+r.id,ids:[r.id],count:1,dim:'id',values:[r.id],label:r.title,range:false,
    object:r,changed:null,unknown:0,unbased:0,profile:{kinds:[],states:[],sources:[],needs:0}}:null;
}
function renderPlan(){
  const host=$('#fiPlan');if(!host||!view||!enabled)return;
  const map=planMap(),box=$('#fiField').getBoundingClientRect(),
    L=C.planLayout(map,{width:Math.max(1,Math.round(box.width)),height:Math.max(1,Math.round(box.height))}),
    states=C.stateScale(rows),w=L.width2,h=L.height2,s3=Math.sqrt(3)/2;
  plan=L;
  // The folded periphery: one dashed edge at the drawn boundary, and the counts
  // of everything beyond it printed in the caption. A number, never a hidden tail.
  const edge=L.folded>0?`<svg class="fiPlanEdge" viewBox="0 0 ${L.width} ${L.height}" preserveAspectRatio="none" aria-hidden="true"><polygon points="${[[1.5,0],[.75,s3],[-.75,s3],[-1.5,0],[-.75,-s3],[.75,-s3]]
    .map(([x,y])=>`${(L.cx+x*L.edge).toFixed(1)},${(L.cy+y*L.edge).toFixed(1)}`).join(' ')}"/></svg>`:'';
  const caption=`<div class="fiPlanCap"><b>${esc(C.axis(state).toUpperCase())}</b><span>${L.total} ROOMS · ${L.shown} ON MAP${L.folded?` · <i>+${L.folded} FOLDED</i>`:' · ALL ON MAP'}</span></div>`;
  const tiles=L.tiles.map(t=>{
    const r=rows.find(x=>x.id===t.id);if(!r)return '';
    const g=tileFold(t.id),count=g?Math.max(1,g.count):1;
    return `<button type="button" class="fiHex${t.inside?'':' out'}${t.held?' held':''}" data-plan-id="${esc(t.id)}" data-fold="${esc(g?g.id:'tile:'+t.id)}" data-ring="${t.ring}" data-slot="${t.index+1}"`
      +` style="left:${(t.x-w/2).toFixed(1)}px;top:${(t.y-h/2).toFixed(1)}px;width:${w}px;height:${h}px"`
      +` aria-label="${esc(`${r.title} · ring ${t.ring} · slot ${t.index+1} of ${L.shown}${count>1?` · ${count} objects folded`:''} · ${r.state} · ${r.address}`)}">`
      +C.planTile(r,{size:L.size,states,count,ring:t.ring})+`</button>`;
  }).join('');
  host.setAttribute('aria-label',`Plan walk: ${L.total} rooms in ${C.axis(state)} order. ${L.shown} drawn to ring ${L.rings}${L.folded?`; ${L.folded} folded at the edge (${L.per.map(p=>`ring ${p.ring} +${p.count}`).join(' · ')})`:''}. Adjacent rooms are adjacent in the axis. Tap a room to hinge its cube room at the tile; hold it to decode.`);
  host.innerHTML=caption+edge+tiles;
  host.querySelectorAll('[data-plan-id]').forEach(b=>{
    b.onclick=()=>tapTile(b);
    b.onpointerenter=e=>{if(e.pointerType==='mouse'){const g=tileFold(b.dataset.planId);if(g)read(g)}};
    b.onfocus=()=>{const g=tileFold(b.dataset.planId);if(g)read(g)};
    b.onblur=quiet;
  });
}
// One room, one hinge: the tile IS the mark, so the cube-net room opens AT the
// tile and the two views share that single room. Locating the object is the
// same move the strip tick makes — the position stays the datum.
function tapTile(b){
  const id=b?.dataset?.planId,r=rows.find(x=>x.id===id);if(!r)return;
  endEdit();toggleMenu(false);
  const box=b.getBoundingClientRect(),point={x:box.x+box.width/2,y:box.y+box.height/2};
  commit(C.locate(state,r),{native:true});
  const g=tileFold(id);if(!g)return;
  read(g);openRoom(g,point);
}
// Switching readings cannot move the frame, native focus or pinned RETURN.
// LIST carries one persistent held-address seam; WALK is an existing RELATIONS
// projection of declared source edges, never title similarity or a second graph.
// Each tab is a reversible projection, not a new frame, store or route.
function toggleViews(show=$('#fiViewTabs').hidden){
  const tabs=$('#fiViewTabs');tabs.hidden=!show;
  $('#fiView').setAttribute('aria-expanded',String(show));
  if(show)tabs.querySelector('[aria-selected="true"]')?.focus({preventScroll:true});
  else $('#fiView').focus({preventScroll:true});
}
function setView(mode){
  if(!['list','strip','plan'].includes(mode))return false;
  if(editing)endEdit();
  if(menu)toggleMenu(false);
  closeDecode();if(room)closeRoom();stopFlight();
  planView=mode==='plan';listView=mode==='list';
  root.dataset.map=mode;$('#fiView').dataset.map=mode;
  $('#fiViewName').textContent=({list:'≡ LIST',strip:'⌁ STRIP',plan:'⬡ PLAN'})[mode];
  $('#fiView').setAttribute('aria-label','Choose list, strip or plan. Current: '+mode);
  $('#fiViewTabs').querySelectorAll('[data-view]').forEach(b=>{b.setAttribute('aria-selected',String(b.dataset.view===mode));b.tabIndex=b.dataset.view===mode?0:-1});
  toggleViews(false);listPage=0;render();
  notice(mode.toUpperCase()+' · same source, focus and RETURN');
  return true;
}
// LIST uses exactly the route identities of the ribbon and plan, in AXIS order.
function renderList(){
  const host=$('#fiList');if(!enabled||!view||!host)return;
  const ordered=C.overview(rows,view,state.focus,C.axis(state));
  const inScope=ordered.filter(p=>p.inside),byId=new Map(rows.map(r=>[r.id,r]));
  const pin=held(),walking=state.mode==='RELATIONS'&&!!pin;
  // WALK is a projection of the same route records. Only explicit parent edges
  // make a neighbour; the visual relation groups are not fuzzy search results.
  const edges=walking?C.neighbours(rows,pin.id):[];
  const relations=new Map(edges.flatMap(g=>g.members.map(r=>[r.id,g.relation])));
  const scopedById=new Map(inScope.map(p=>[p.id,p]));
  const items=walking?edges.flatMap(g=>g.members.map(r=>scopedById.get(r.id)).filter(Boolean)):inScope;
  // The held source is independent of pagination, filtering, and walk scope.
  // It stays in one fixed seam; it is not duplicated in the countable rows.
  const pageSize=Math.max(1,Math.min(10,Math.floor(($('#fiField').clientHeight-124)/48)));
  const pages=Math.max(1,Math.ceil(items.length/pageSize));listPage=Math.min(Math.max(0,listPage),pages-1);
  const page=items.slice(listPage*pageSize,(listPage+1)*pageSize);
  const edgeCount=edges.reduce((n,g)=>n+g.members.length,0);
  host.innerHTML=`<header class="fiListHead"><b>${walking?'WALK · '+edgeCount+' LINKS':view.inside+' IN SCOPE'} · ${view.total} SOURCE</b><span>${listPage+1}/${pages} · ${walking?'DECLARED':esc(C.axis(state).toUpperCase())}</span></header>
    <div class="fiListPin" aria-label="Held source and walk controls">
      <span class="fiListPinSource"><b>${pin?'◎ '+esc(pin.title):'○ NO HELD SOURCE'}</b><code>${pin?esc(pin.address):'Tap a source to hold it'}</code></span>
      <button type="button" data-list-walk aria-label="${walking?'Show the whole field':'Walk declared parent, child and peer links'}" ${pin?'':'disabled'}>${walking?'ALL':'↔ WALK'}</button>
      <button type="button" data-list-back aria-label="Restore previous FIELD position" ${revisions.length?'':'disabled'}>↶</button>
    </div>
    <div class="fiListRows">${page.map(p=>{
      const r=byId.get(p.id);if(!r)return '';
      const relation=relations.get(p.id);
      const glyph=p.held?'◎':relation==='parent'?'↑':relation==='child'?'↓':relation==='peer'?'↔':p.inside?'◇':'·';
      return `<button type="button" class="fiListRow${p.held?' held':''}" data-list-id="${esc(p.id)}" aria-label="${esc(r.title+' · '+r.address+(relation?' · '+relation:'')+(p.held?' · held':''))}">
        <span class="fiListGlyph">${glyph}</span>
        <span class="fiListText"><b>${esc(r.title)}</b><code>${esc(r.address)}</code></span>
        <span class="fiListState">${esc(relation?relation.toUpperCase():r.state||'UNKNOWN')}</span>
      </button>`
    }).join('')||`<p class="fiListNone">${walking?'∅ No declared neighbours. No similarity inferred.':'∅ No records match. Edit the coordinate or use UP.'}</p>`}</div>
    <footer class="fiListFoot"><button type="button" data-list-page="prev" ${listPage===0?'disabled':''}>← PREV</button><span>${items.length} addressed · ${view.total-inScope.length} outside</span><button type="button" data-list-page="next" ${listPage+1===pages?'disabled':''}>NEXT →</button></footer>`;
  host.querySelectorAll('[data-list-id]').forEach(b=>{
    b.onclick=()=>locateTick(b.dataset.listId);
    b.onfocus=()=>{const r=byId.get(b.dataset.listId);if(r)readTick(r)};
    b.onpointerenter=e=>{if(e.pointerType==='mouse'){const r=byId.get(b.dataset.listId);if(r)readTick(r)}}
  });
  host.querySelector('[data-list-walk]').onclick=()=>command(walking?'field':'relations');
  host.querySelector('[data-list-back]').onclick=()=>command('rewind');
  host.querySelector('[data-list-page="prev"]').onclick=()=>{listPage--;renderList()};
  host.querySelector('[data-list-page="next"]').onclick=()=>{listPage++;renderList()};
}
function wirePlan(){
  const host=$('#fiPlan');
  // Full bloom is earned: the plan holds its breath until a finger is on it.
  const drop=()=>host.classList.remove('bloom');
  host.addEventListener('pointerdown',()=>{if(enabled&&planView)host.classList.add('bloom')});
  host.addEventListener('pointerup',drop);host.addEventListener('pointercancel',drop);
  host.addEventListener('pointerleave',drop);window.addEventListener('pointerup',drop);
  window.addEventListener('pointercancel',drop);
}

/* ==== DECODE — hold any mark, in either view ==============================
   The pattern-semantics fix: a mark you cannot decode on sight is a bug, so
   one press-and-hold decodes the mark IN PLACE, from the real record — kind,
   state, depth, lane/ring, count and address — over a field dimmed but never
   gone. One decoder for both observer maps, and READ THE MARK opens the same
   overlay with the key, so every style on screen is learnable after one hold. */
function laneOf(id){const g=ribbonLayout?.groups.find(g=>g.items.some(p=>p.id===id));return g?g.lane+1:null}
function decodeAt(el,point){
  if(!enabled||!view)return;
  const map=planMap(),id=el?.dataset?.mapId||el?.dataset?.planId||null,
    row=id?rows.find(r=>r.id===id):null,
    foldId=el?.dataset?.fold,g=foldId?view.folds.find(f=>f.id===foldId):null,
    rawRing=el?.dataset?.ring,slot=id?map.findIndex(p=>p.id===id)+1:null,
    box=$('#fiField').getBoundingClientRect();
  openDecode(C.decodeMark({row,group:g&&!g.object?g:null,rows,states:C.stateScale(rows),
    lane:id?laneOf(id):null,ring:rawRing==null||rawRing===''?null:Number(rawRing),slot,total:map.length}),
    // The card sits beside the mark and never on top of the reading panel.
    point,{max:Math.max(96,Math.round(box.top+box.height)-420)});
}
function openDecode(payload,point=null,opts={}){
  let host=$('#fiDecode');
  if(!host){
    host=document.createElement('div');host.id='fiDecode';host.className='fiDecode';
    host.setAttribute('role','dialog');host.setAttribute('aria-label','Decode the mark under the crosshair');
    root.append(host);
  }
  const at=point?{x:point.x,y:point.y,max:opts.max}:{max:opts.max};
  host.innerHTML=C.decodeMarkup(payload,at);
  host.dataset.open='1';decodeOpen=true;
  // The KEY opens without a mark: it keeps the whole reading panel clear, so
  // the panel's own line and its way back stay exactly where they were.
  const card=host.querySelector('.fiDecodeCard'),panel=$('#fiReading');
  if(card&&panel&&!point){
    const limit=panel.getBoundingClientRect().top-8,top=Math.max(56,limit-card.getBoundingClientRect().height);
    card.style.setProperty('--cy',`${top.toFixed(1)}px`);
  }
  // The hold's own release fires a click: swallow exactly that ONE click, or
  // the overlay would close on the very gesture that opened it. The next
  // deliberate tap — whenever it comes — is the dismissal.
  decodeRelease=true;clearTimeout(releaseTimer);releaseTimer=setTimeout(()=>{decodeRelease=false},700);
  // The card's own way back: a real button, wired to the one dismiss law.
  const close=host.querySelector('[data-decode-close]');
  if(close)close.onclick=e=>{e.stopPropagation();closeDecode()};
}
function closeDecode(){
  const host=$('#fiDecode');decodeOpen=false;decodeRelease=false;clearTimeout(releaseTimer);
  if(!host)return;delete host.dataset.open;host.innerHTML='';
}
function wireDecode(){
  let holdTimer=0,holdAt=null,holdEl=null;
  const stop=()=>{clearTimeout(holdTimer);holdTimer=0;holdEl=null;holdAt=null};
  // Press-and-hold on ANY mark: a strip tick, a plan tile, a fold. The sweep
  // keeps its own meaning — moving cancels the hold, so reading never decodes
  // by accident and decoding never moves the position.
  // The bar and its map strip are the PAGE's own chrome, outside this section —
  // so the hold listens on the document: a mark decodes identically wherever it
  // lives, a strip tick, a plan tile, a fold in the plane.
  document.addEventListener('pointerdown',e=>{
    if(!enabled||editing||decodeOpen||!e.target?.closest)return;
    const el=e.target.closest('[data-fold],[data-map-id]');if(!el)return;
    holdEl=el;holdAt={x:e.clientX,y:e.clientY};clearTimeout(holdTimer);
    holdTimer=setTimeout(()=>{
      if(!holdEl)return;const at=holdAt,target=holdEl;stop();decodeAt(target,at);
    },620);
  });
  window.addEventListener('pointermove',e=>{if(holdTimer&&holdAt&&Math.hypot(e.clientX-holdAt.x,e.clientY-holdAt.y)>8)stop()});
  window.addEventListener('pointerup',stop);
  // The STRIP re-folds itself the moment it is pressed (locate on touch), which
  // can pull the held mark out of the DOM and fire a pointercancel that is not
  // the letting go. A cancel whose mark is still on screen ends the hold; a
  // cancel through a re-render leaves the finger pressing, so the hold stands.
  window.addEventListener('pointercancel',()=>{if(holdEl&&!holdEl.isConnected)return;stop()});
  // One dismiss law: a tap anywhere returns to the field. The marks below stay
  // live behind the transparent backdrop (the reading panel included), so the
  // first tap after a hold is the hold's own release — swallowed, never a move.
  document.addEventListener('click',e=>{
    if(!decodeOpen)return;
    // The hold's own release lands ON the mark it just decoded: swallow that
    // one, or a hold would move the position it is merely reading. Any other
    // click — the panel, the card, the bare field — is a real act and stands.
    if(decodeRelease&&e.target?.closest?.('[data-fold],[data-map-id]')){
      decodeRelease=false;e.preventDefault();e.stopPropagation();return;
    }
    decodeRelease=false;
    if(e.target?.closest?.('.fiDecodeCard'))return;
    // The reading panel keeps its own actions live: its click still runs its
    // own work AND dismisses the overlay on the way through — one tap, the
    // field back under your finger. Everything else: the tap IS the dismiss.
    if(e.target?.closest?.('#fiReading')){closeDecode();return}
    e.preventDefault();e.stopPropagation();closeDecode();
  },true);
}

/* ==== THE ROOM — FOLD A ROOM AT THE MARK =====================================
   The moment the two things meet: entering a held object's fold is the CUBE-NET FOLD
   at that mark's exact screen coordinates. Six readings of the real route record
   (OBJECT title · ADDRESS · STATE · TRANSFORM from the revision stack · PROVE from
   evidence.checks · RETURN = the pin) hinge up from the flat field into the room
   around the mark's position; the fold IS the orientation cue. Same transform-origin
   law as the donor (lib/interphase-cube.js carries the absorbed geometry): the plane's
   origin is the anchor cell (1,1) centre and the perspective origin is that same point,
   so the anchor [x,y] is identical across net ↔ cube ↔ net — RETURN/UP unfolds the room
   back flat INTO the same mark cell. Interruptible by construction: the hinges are live
   CSS transitions, so a mid-fold tap completes or reverses from exactly where it is, and
   prefers-reduced-motion swaps instantly with no spatial loss. The whole never leaves:
   the map strip stays above this layer and the held mark carries a you-are-here dot. */
const reduced=()=>matchMedia('(prefers-reduced-motion:reduce)').matches;
const markPoint=el=>{const b=el.getBoundingClientRect();return{x:b.x+b.width/2,y:b.y+b.height/2}};
function openRoom(g,point){
  if(!g?.object)return;
  const field=$('#fiField');if(!field)return;
  // Already in this object's room: its position is the datum, never re-anchored.
  if(room&&room.id===g.object.id&&field.querySelector('.fiRoom'))return;
  const box=field.getBoundingClientRect(),
    geo=C.roomAnchor(point||{x:box.left+box.width/2,y:box.top+box.height/2},
      {left:box.left,top:box.top,width:box.width,height:box.height},{min:44,max:128});
  clearTimeout(roomTimer);
  field.querySelectorAll('.fiRoom').forEach(n=>n.remove());
  const el=document.createElement('div');
  el.className='fiRoom';el.id='fiRoom';
  el.setAttribute('role','group');
  el.setAttribute('aria-label',`Room of ${g.object.title}: six readings hinged at the mark. ${g.count} object.`);
  el.innerHTML=C.roomMarkup(C.roomReadings(g.object,{revisions,pin:anchor}));
  field.append(el);
  const plane=el.querySelector('.fiRoomPlane');
  // Position FIRST, then fold: the plane's own origin is the anchor cell centre, so
  // the whole hinge-up pivots at the mark's screen coordinates and nowhere else.
  plane.style.setProperty('--fi-room-s',`${geo.s.toFixed(2)}px`);
  plane.style.left=`${geo.left.toFixed(2)}px`;plane.style.top=`${geo.top.toFixed(2)}px`;
  el.style.perspectiveOrigin=`${geo.ax.toFixed(2)}px ${geo.ay.toFixed(2)}px`;
  const fold=el.querySelector('[data-room-fold]');
  const toggle=()=>{plane.dataset.fold=plane.dataset.fold==='cube'?'net':'cube'};
  fold.onclick=toggle;
  fold.onkeydown=e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();e.stopPropagation();toggle()}};
  room={id:g.object.id,anchor:[geo.anchor[0],geo.anchor[1]],s:geo.s};
  plane.dataset.fold='net';
  void plane.offsetWidth;                 // start flat AT the mark, then hinge up
  plane.dataset.fold='cube';
  renderRibbon(null);                     // you-are-here dot on the held map tick
}
function closeRoom(){
  const field=$('#fiField'),el=field?.querySelector('.fiRoom');
  clearTimeout(roomTimer);room=null;
  if(!el)return;
  const plane=el.querySelector('.fiRoomPlane');
  const drop=()=>{el.remove();renderRibbon(null)};
  if(reduced()||!plane){drop();return}
  plane.dataset.fold='net';               // unfold back FLAT into the same mark cell
  roomTimer=setTimeout(drop,320);
}
function renderBearing(next){
  if(!enabled||!view)return;
  const b=C.bearing(rows,state,view,anchor),addr=$('#fiAddress');
  $('#fiBarName').textContent=next?(({parent:'↑ ',child:'↓ ',peer:'↔ '}[next.relation]||'')+(next.object?.title||next.label)):b.title;
  // The position line is a projection law (C.bearing → line): axis · rung ·
  // n/total · what moved · breadcrumb. Zero reading required to know where you are.
  $('#fiBarMeta').textContent=b.line+(next?' → '+next.count:'');
  addr.setAttribute('aria-label',b.label+(next?' Next fold: '+next.count+' objects.':''));addr.title=b.address;
  $('#fiScopeGlyph').textContent=editing?'×':state.path.length||state.query?'↑':({'FIELD':'⌁','DELTA':'∆','RELATIONS':'⋈'}[state.mode]||'⌁');
  $('#fiScopeScale').textContent=editing?'CLOSE':state.path.length||state.query?'UP':'SCOPE';
  $('#fiParent').setAttribute('aria-label',editing?'Close address input':state.path.length||state.query?'Unfold one scope decision':'Choose ALL, CURRENT or CHANGES');
  $('#fiReturn').hidden=!b.away||editing||menu;bar.hidden=b.away&&!editing&&!menu;
  renderRibbon(next);
}
export async function enter(){
  if(!ready){notice('FIELD source is still loading');return}
  wire();enabled=true;root.hidden=false;document.documentElement.dataset.instrument='1';
  const stored=MEMORY.get(),entry=entered?null:owner().entry(),incoming=entry?entry.focus:new URLSearchParams(location.search).get('focus');entered=true;
  try{
    if(stored?.schema==='field-instrument-position/v0.1'){
      state=C.restore(stored.frame);anchor=C.restore(stored.anchor);hostAnchor=stored.hostAnchor;
      if(stored.host)window.FieldLensHost?.restore(stored.host);
    }else{state={...C.initial(),focus:rows.find(r=>r.address===window.__fieldAct?.focusHref?.())?.id||null};anchor=anchor??C.frame(state);hostAnchor=hostAnchor??(window.FieldLensHost?.uiState?.()||null)}
  }catch(_){state=C.initial();anchor=anchor??C.frame(state);hostAnchor=hostAnchor??(window.FieldLensHost?.uiState?.()||null);notice('Stored position rejected; source FIELD remains intact')}
  // A deep link MOVES you; it never re-pins you. The RETURN anchor is seeded only
  // when none is stored — incoming focus, '/' and an fi-expression all leave it alone.
  const target=rows.find(r=>r.address===incoming);
  if(target&&target.id!==state.focus){state=C.locate(C.initial(),target);window.__fieldAct?.focus(target.address);anchor=anchor??C.frame(state);hostAnchor=hostAnchor??(window.FieldLensHost?.uiState?.()||null)}
  if(incoming==='/'){state=C.initial();window.FieldLensHost?.restore({...window.FieldLensHost?.uiState?.(),focusHref:null});anchor=anchor??C.frame(state);hostAnchor=hostAnchor??(window.FieldLensHost?.uiState?.()||null)}
  if(entry?.expression){const p=window.FieldURLBarCore.parse(entry.expression);if(p.mode!=='COMMAND'&&(p.query!==state.query||p.mode!==state.intent)){state={...state,scale:0,path:[],query:p.query,intent:p.mode,mode:'FIELD',page:0};anchor=anchor??C.frame(state);hostAnchor=hostAnchor??(window.FieldLensHost?.uiState?.()||null)}}
  const u=new URL(location.href);u.searchParams.set('instrument','1');history.replaceState(history.state,'',u);
  const input=$('#fieldUrlInput');input.setAttribute('role','searchbox');input.setAttribute('aria-label','Locate FIELD address or narrow feature coordinates');input.setAttribute('aria-autocomplete','none');input.removeAttribute('aria-activedescendant');input.removeAttribute('aria-expanded');input.placeholder='address / source:git / :delta';
  window.FoveaLens?.radial?.close?.();window.FoveaLens?.toggle?.(false);window.FieldAwakeVisor?.hide?.();
  $('#fieldUrlInput').value=entryText();render();remember();
}
function exit(){
  endEdit();remember();closeRoom();closeDecode();enabled=false;root.hidden=true;delete document.documentElement.dataset.instrument;toggleMenu(false);
  const input=$('#fieldUrlInput');input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-expanded','false');input.placeholder='address · glyph · command';
  const u=new URL(location.href);u.searchParams.set('instrument','0');history.replaceState(history.state,'',u);
  window.FieldLensHost?.notify?.();
}
function returnPosition(){
  stopFlight();closeRoom();closeDecode();
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
    case'list':setView('list');break;
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
// A decode table, not a legend: every row is the geometry actually on screen,
// generated from the SAME motif and material vocabulary the marks draw. The
// table now lives in the DECODE overlay — the same surface a hold opens — so
// the key and any single mark are always read through one decoder.
function showHelp(){
  reading.dataset.mode='help';
  const glyph=g=>`<svg class="fiKeyGlyph" viewBox="0 0 20 20" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.5">${g}</g></svg>`;
  const mats=[...Object.keys(C.MATERIALS),'object'];
  const table=mats.map(m=>`<span>${glyph(C.MOTIFS[m])}</span><b>${m}</b><i>${m==='object'?'anything not listed':C.MATERIALS[m].join(' · ')}</i>`).join('')
    +`<span>${glyph('<path d="M4 3v14M10 6v11M16 9v8"/>')}</span><b>state</b><i>notch angle on the tile · tick height on the mark</i>`
    +`<span>${glyph('<path d="M5 17V4M13 17V10"/>')}</span><b>depth</b><i>bar height = reading().length</i>`
    +`<span>${glyph('<path d="M3 7h14M3 14h9" stroke-width="2"/>')}</span><b>count</b><i>underline share of the fold</i>`
    +`<span>${glyph('<path d="M3 4v9M8 6v7M13 5v8M18 7v6"/><path d="M2 17h16"/>')}</span><b>map</b><i>tap tick / room = locate · hold = decode · tap again = room</i>`
    +`<span class="fiKeyWide"><b>residue</b><i>${esc(view.witness)} — ${esc(view.residue)}</i></span>`;
  openDecode({key:true,name:'Read the mark',code:mats.join(' · '),table});
  putReading(`<div class="fiName">Read the mark</div><code>${mats.join(' · ')}</code><p>Hold any mark — a strip tick, a plan room — and it decodes in place: kind, state, depth, lane, count, address.</p><small><span>${view.foldSum}/${view.inside} in folds · ${esc(view.witness)}</span></small><div class="fiActions"><button data-close>RETURN TO FIELD</button></div>`);
  reading.querySelector('[data-close]').onclick=()=>{closeDecode();renderReading()};
}
// The glyph is drawn by the projection law itself (C.markGlyph) so the selftest
// can assert the rendered channels without a browser. This wrapper only passes context.
function mark(g){
  return C.markGlyph(g,{rows,states:C.stateScale(rows),inside:view.inside,slot:Math.max(0,view.folds.findIndex(f=>f.id===g.id))});
}

function read(g){
  probe=g.id;root.querySelectorAll('[data-fold]').forEach(el=>el.dataset.reading=el.dataset.fold===g.id?'1':'0');renderReading(g);renderBearing(g);
}
function renderReading(g){
  if(!enabled)return;
  delete reading.dataset.mode;
  const r=g?.object||(!g&&(state.mode==='RELATIONS'||view.folds.some(f=>f.ids.includes(state.focus)))?held():null),d=view.delta;
  if(!r&&!g){
    const catching=state.mode==='DELTA',unmeasured=d.unknown.length+d.unbased.length,
      title=catching?(d.hasBaseline?`${d.changed.length} measured changes`:'Start catch-up'):`${view.inside} ${state.intent==='HEADS'?'current tools':'places'}`,
      actions=catching?`<button data-action="seen">✓ SEEN ALL</button><button data-action="${owner().snapshot().canRewind?'rewind-seen':'field'}">${owner().snapshot().canRewind?'↶ UNDO SEEN':'ALL '+view.total}</button>`:`<button data-action="${state.intent==='HEADS'?'field':'heads'}">${state.intent==='HEADS'?'ALL '+view.total:'CURRENT '+rows.filter(r=>r.head).length}</button><button data-action="delta">CHANGES ${d.hasBaseline?d.changed.length:'?'}</button><button data-action="help">? KEY</button>`;
    putReading(`<div class="fiName">${esc(title)}</div><code>${esc(view.witness)} · folds ${view.foldSum}/${view.inside} · ${view.folds.length} regions · ${view.outside} out</code><p>${catching?'SEEN sets a local return boundary. Changes without timestamps remain unknown.':state.intent==='HEADS'?'Native retained heads. Tap a tool, then OPEN; ALL widens to every place.':'Tap a region to enter. Tap a tool to bring it forward; OPEN uses it.'}</p><small>${d.needs.length} need world · ${d.stalled.length} stalled · ${unmeasured} unmeasured<br>${d.hasBaseline?'timestamp-only delta':'∆? · no SEEN baseline'}</small><div class="fiActions">${actions}</div>`);
  }else if(g&&!r){
    const members=rows.filter(x=>g.ids.includes(x.id)),parents=new Set(members.map(x=>x.parent).filter(Boolean));
    putReading(`<div class="fiName">${esc(g.label)}</div><code>${g.count} objects · ${g.values.length} ${esc(g.dim)} value${g.values.length===1?'':'s'}</code><p>${g.changed===null?'Delta unknown (no SEEN baseline)':g.changed+' measured changes'} · ${g.unknown+g.unbased} unmeasured. ${state.mode==='RELATIONS'?parents.size+' declared parents.':'Unfold; held address survives.'}</p><small>Every member retained · no absorbed/deleted source</small><div class="fiActions"><button data-action="unfold">ENTER ${g.count}</button><button data-action="help">? KEY</button></div>`);
  }else{
    const offers=owner().actions(r.address),primary=offers[0],source=`${r.title} · ${r.address} · ${r.state} · ${r.kind} · ${r.payload.operation||'No move declared'} · ${r.payload.role||''}`,
      page=C.textPage(source,Math.max(0,state.page-1),innerWidth<360?85:105),when=r.time?new Date(r.time).toISOString().slice(0,10):'UNKNOWN',
      move=String(r.payload.operation||'No move declared').split(/\s*\/\s*/)[0],overview=`${move} · ${r.state} · ${r.payload.field?.owner||r.kind}`;
    const action=offers.length>1?`<button data-open>${offers.length} MOVES →</button>`:`<a data-open href="${esc(primary?.target||r.address)}">${esc(primary?.label||'OPEN')} ↗</a>`;
    putReading(`<div class="fiName">${esc(r.title)}</div><code title="${esc(r.address)}">${esc(r.address)}</code><p>${esc(state.page?page.text:overview)}</p><small>${when} · d${r.depth} · ${esc(r.source)} · ${esc((r.digest||'').slice(7,15))}<br>${state.page?'source '+(page.at+1)+'/'+page.count:'source · '+page.count+' parts'} · ${page.total} characters</small><div class="fiActions">${action}<button data-page>${state.page?'SOURCE '+(page.at+1)+'/'+page.count:'READ'} →</button><button data-near>↔ NEARBY</button></div>`);
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
  if(g.object&&g.object.id===state.focus&&view.inside===1){openObject(g.object);return}
  endEdit();toggleMenu(false);
  // The fold pivots AT the mark: measure the tapped mark before the commit re-lays the
  // plane out, so the room hinges up from — and RETURN unfolds back into — that cell.
  // In the PLAN the mark is the object's own room tile; both views hinge the same room.
  const mark=g.object?(planView?[...$('#fiPlan').querySelectorAll('[data-plan-id]')].find(b=>b.dataset.planId===g.object.id)
    :[...plane.querySelectorAll('[data-fold]')].find(b=>b.dataset.fold===g.id)):null,
    point=mark?markPoint(mark):null;
  travel(C.into(rows,state,g,seen),{foldId:g.id,native:!!g.object});
  // The object remains the same field mark; detail is a field state, no overlay lens.
  if(g.object){read(g);openRoom(g,point)}
}
function render(){
  if(!enabled)return;
  const priorMark=document.activeElement?.closest?.('[data-fold]')?.dataset.fold;
  view=C.project(rows,state,seen);
  // A room belongs to exactly one held object's own fold. Any move that leaves that
  // fold unfolds it back into its mark cell — the position is the datum, the room is
  // only ever the view the user asked for.
  if(room&&!(state.focus===room.id&&view.folds.some(f=>f.object&&f.object.id===room.id)))closeRoom();
  // TURN now MEASURES (axis swap in core). The camera is a secondary cue only:
  // a shallower tilt, still reduced-motion aware, never the carrier of meaning.
  plane.style.setProperty('--fi-tilt',[0,-6,-13,-20][state.turn]+'deg');
  const single=state.mode!=='RELATIONS'&&view.inside===1&&!!view.folds[0]?.object;plane.dataset.detail=single?'1':'0';
  plane.style.setProperty('--fi-yaw',state.mode==='RELATIONS'?'0deg':[0,-3,0,3][state.turn]+'deg');
  plane.style.setProperty('--fi-scale',state.mode==='RELATIONS'?'1':'.92');
  const tags=C.addressTags(view.folds.map(g=>g.object).filter(Boolean));
  const places=C.placements(view),walking=state.mode==='RELATIONS'&&held();
  const edges=view.folds.map((g,i)=>{
    const p=places[i],width=.6+1.4*Math.sqrt(g.count/Math.max(1,view.inside));
    return `<path d="${walking?'M500 480L':'M500 0Q500 '+(p.y*6+90)+' '}${(p.x+15)*10} ${(p.y+14)*10}" stroke-width="${width}"/>`;
  }).join('');
  plane.innerHTML=(walking?`<button class="fiOrigin" data-origin aria-label="Open held ${esc(held().title)}" title="${esc(held().address)}">◎</button>`:'')+(view.folds.length?`<svg class="fiCreases" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="currentColor">${edges}</g></svg>`+view.folds.map((g,i)=>{
    const {x,y}=places[i];
    return `<button type="button" class="fiMark" data-fold="${esc(g.id)}" data-relation="${g.relation||''}" data-held="${g.ids.includes(state.focus)?'1':'0'}" style="left:${x}%;top:${y}%" aria-label="${single?'Open ':'Enter '}${g.relation?g.label+': ':''}${esc(g.object?g.object.title+' · '+g.object.address:g.label)} · ${g.count} objects${g.range?' · range fold':''}">${mark(g)}<span class="fiLabel">${esc(g.object?g.object.title:g.label)}</span><span class="fiCount">${single?'OPEN ↗':g.object?esc(tags.get(g.object.id)):'ENTER · '+g.count}${g.changed?' ∆'+g.changed:''}</span></button>`;
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
  // The plan is rebuilt with the plane, so the room slots never drift between
  // renders — and focus returns to the mark in the view the user is actually in.
  if(planView)renderPlan();
  if(listView)renderList();
  if(priorMark){const same=[...root.querySelectorAll('[data-fold]')].find(b=>b.dataset.fold===priorMark&&b.offsetParent!==null);(same||$('#fiField')).focus({preventScroll:true})}
  renderReading();renderBearing();
  window.dispatchEvent(new CustomEvent('field-instrument:frame',{detail:{focus:state.focus}}));
}
function address(q){
  if(!enabled)return;
  const parsed=window.FieldURLBarCore.parse(q);if(parsed.mode==='COMMAND')return;
  if(parsed.query===state.query&&parsed.mode===state.intent)return;
  // Query narrows the current coordinate; it never picks an arbitrary first route.
  // Typed moves go through commit(): they are rewound, remembered and rendered
  // exactly like every other move — no side door past revisions or persistence.
  if(menu)toggleMenu(false);commit({...state,query:parsed.query,intent:parsed.mode,page:0});
}
function key(e){
  if(!enabled)return false;
  const typing=e.target?.id==='fieldUrlInput';
  if(e.key==='Escape'){
    e.preventDefault();e.stopImmediatePropagation();
    if(menu)toggleMenu(false);else if(decodeOpen)closeDecode();else if(room)closeRoom();
    if(typing){blankQuery();state={...state,query:''};render();endEdit()}else quiet();return true;
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
    e.preventDefault();e.stopImmediatePropagation();
    // Only the marks that are actually on screen take the arrows: the strip's
    // folds, or the plan's rooms — never the hidden map's ghosts.
    const marks=[...root.querySelectorAll('[data-fold]')].filter(n=>n.offsetParent!==null);if(!marks.length)return true;
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
  window.FieldInstrument=Object.freeze({enter,exit,edit,closeEditor:()=>{endEdit();toggleMenu(false)},active:()=>enabled,address,key,
    turn:()=>{if(!enabled)return false;command('turn');return true},
    view:mode=>enabled&&setView(mode),
    heldAddress:()=>held()?.address||null,
    hold:address=>{const r=rows.find(r=>r.address===address);if(!r)return false;commit(C.locate(state,r),{native:true});return true},
    snapshot:()=>({frame:C.frame(state),anchor:C.frame(anchor),view:view&&{total:view.total,inside:view.inside,outside:view.outside,counts:view.folds.map(g=>g.count),
      axis:C.axis(state),dim:view.dim,witness:view.witness,folds:view.folds.length},
      // The room is a view of one held object: its id, the mark's screen anchor and
      // which fold state the hinges are in right now.
      room:room?{id:room.id,anchor:room.anchor.slice(),s:room.s,fold:document.querySelector('.fiRoomPlane')?.dataset.fold||null}:null,
      // The observer map is not part of the frame: it is stated, never stored,
      // so a view switch can never move the position it reports.
      map:listView?'list':planView?'plan':'strip',decode:decodeOpen,
      plan:plan?{size:plan.size,rings:plan.rings,shown:plan.shown,folded:plan.folded,total:plan.total,per:plan.per.map(p=>[p.ring,p.count])}:null})});
  window.addEventListener('field-index:state',()=>load());
  let attempts=0;
  const start=async()=>{
    if(!window.FieldURLBar||!owner()?.snapshot()?.routes?.length){if(++attempts<120)setTimeout(start,100);return}
    wire();await load();
    const query=new URLSearchParams(location.search),mode=query.get('instrument');
    // The readable host is the entry. Saved experiments never replace it on reload.
    // work=0 retains the published native-projection address; work=1 opts into the reader.
    if(mode==='1'||(mode!=='0'&&['0','1'].includes(query.get('work'))))await enter();
  };start();
}
boot();
