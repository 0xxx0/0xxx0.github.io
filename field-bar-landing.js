/* FIELD / one-screen glyph surface over the original native host.
   All CURRENT marks stay visible at rest and after selection. One source,
   one bar, exact native HOLD/OPEN/RETURN; no cloned map or action state. */
(()=>{
 'use strict';
 if(location.pathname!=='/'||new URLSearchParams(location.search).get('work')==='1')return;
 const doc=document,html=doc.documentElement;
 function bind(){
 const bar=doc.getElementById('fieldUrlBar'),input=doc.getElementById('fieldUrlInput');
 if(!bar||!input)return false;
 const panes=new Set(['none','hold','work','prove','browse','trace','map']);
 const $=id=>doc.getElementById(id);
 function reveal(kind='none'){
  if(!panes.has(kind))return;
  html.dataset.fieldBarPane=kind;
  if(kind==='work')$('workDepth').open=true;
  if(kind==='prove')$('refineFold').open=true;
  if(kind==='trace'){$('statusFold').open=true;$('traceFold').open=true}
  if(kind==='map'){$('statusFold').open=true;$('mapFold').open=true}
 }
 function barIsVisible(){return !!html.dataset.fieldWords&&!html.dataset.instrument}
 function held(){return window.__fieldAct?.focusHref?.()||null}
 // The canonical bar exposes current focus even when the rest of FIELD is folded.
 // CURRENT may contain multiple heads. Never silently choose one as the operator.
 function contextLabel(){
  const current=window.FieldIndexReadModel?.snapshot?.();
  const n=current?.heads?.length||0;
  return held()?'Held '+held()+' · type to address or :help':(n?n+' CURRENT heads · @ to choose · ':'')+'address / · :source · :help';
 }
 function updateHint(){if(!barIsVisible())return;input.placeholder=contextLabel()}
 updateHint();
 window.addEventListener('field-index:state',e=>{
  updateHint();
  // Existing native focus is the authoritative completion signal. A click is
  // only a gesture; cursor/focus RETURN remain owned by FIELD.
  // Browse keeps the whole glyph field visible after HOLD; the native aperture updates.
 });
 doc.addEventListener('click',e=>{
  // Aa adjusts held-object detail without replacing the glyph field.
  if(e.target.closest?.('#feedRail .feedChip')){
   // The canonical glyph grid remains visible after a mark is held.
  }
  const row=e.target.closest?.('#fieldUrlPanel .fieldUrlRow');
  if(row&&['SEARCH','HEADS'].includes(window.FieldURLBar?.parse?.()?.mode||'')){
   // The URLbar owns selecting an address. Reveal its *native* held action
   // afterwards; a mouse click cannot spawn a second selection owner.
   queueMicrotask(()=>{if(barIsVisible()&&held())reveal('hold')});
  }
 });
 input.addEventListener('keydown',e=>{
  if(e.key!=='Enter'||e.ctrlKey||e.metaKey)return;
  const mode=window.FieldURLBar?.parse?.()?.mode;
  if(mode==='SEARCH'||mode==='HEADS')queueMicrotask(()=>{if(barIsVisible()&&held())reveal('hold')});
 });
 window.addEventListener('field-omnibar',e=>{
  const cmd=e.detail?.command;
  if(!barIsVisible())return;
  const to={
   hold:held()?'hold':'none',work:'work',prove:'prove',
   read:'hold',trace:'trace',axis:'prove',glyphs:'browse',
   map:'map',recent:'map',fovea:'browse',
   up:'browse',down:'browse',prev:'hold',next:'hold',
   heads:'none',reset:'none',help:'none'
  }[cmd];
  if(to)reveal(to);
  updateHint();
 });
 window.FieldBarLanding=Object.freeze({reveal,view:()=>html.dataset.fieldBarPane});
 reveal('browse');
 return true;
 }
 // FIELD lens imports its URLbar asynchronously; bind to the real line as soon
 // as it arrives instead of silently losing native reveal handlers on cold load.
 if(!bind()){
  const observer=new MutationObserver(()=>{if(bind())observer.disconnect()});
  observer.observe(doc.querySelector('main')||doc.body,{childList:true,subtree:true});
  // A slow module import is still a valid first visit. Observe until the
  // native line arrives; disconnecting on a timer leaves CSS folding active
  // without the handlers that reveal WORK, PROVE or the held action.
 }
})();
