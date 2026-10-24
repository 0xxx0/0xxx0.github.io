function startFieldWork(){
 const query=new URLSearchParams(location.search);
 if(location.pathname!=='/'||query.get('instrument')==='0'||query.get('work')!=='1')return;
 const begin=async()=>{
  const release=new URL(import.meta.url).search;
  const {mountContinuum}=await import('./interphase/continuum.mjs'+release);
  let native;for(let i=0;i<150;i++){native=window.FieldInstrument;if(native&&document.getElementById('fieldInstrument')&&document.getElementById('fiView'))break;await new Promise(r=>setTimeout(r,80))}
  if(!native)throw Error('Native FIELD did not open.');
  const root=document.getElementById('fieldInstrument'),host=document.createElement('div');host.id='interphaseWorkspace';root.append(host);root.dataset.work='1';document.documentElement.dataset.fieldWork='1';
  const css=document.createElement('link');css.rel='stylesheet';css.href='/field-work.css'+release;document.head.append(css);
  const get=id=>document.getElementById(id);let lastNative=null,api,ready=false;
  api=await mountContinuum(host,{route:'/',onRoute:href=>{if(href!==lastNative){lastNative=href;native.hold(href)}},onFocus:s=>{
   // A new source consumes the caller's old FIELD selection; reload must resume this source.
   if(!s.route&&new URLSearchParams(location.search).has('focus')){const u=new URL(location.href);u.searchParams.delete('focus');history.replaceState(history.state,'',u)}
   if(get('fiBarName'))get('fiBarName').textContent=s.label;
   if(get('fiBarMeta'))get('fiBarMeta').textContent=`${s.scopeLabel} · ${s.index} / ${s.count}`;
   if(get('fiScopeGlyph'))get('fiScopeGlyph').textContent='☷';
   if(get('fiScopeScale'))get('fiScopeScale').textContent='SOURCE';
   if(get('fiParent'))get('fiParent').setAttribute('aria-label','Source and work');
   if(get('fiReturn')){get('fiReturn').setAttribute('aria-label','Return to previous source context');get('fiReturn').hidden=!s.back}
   if(get('fiMenu'))get('fiMenu').hidden=true;
   // The three visible source tabs own the projection; no second view control.
  }});
  // No host-level shadow view toggle. All views retain the same native source.
  get('fiParent').onclick=e=>{e.stopPropagation();native.closeEditor();api.toggleSource()};
  get('fiReturn').onclick=e=>{e.stopPropagation();api.returnStep()};
  get('fiAddress').addEventListener('click',()=>api.stop());
  const input=get('fieldUrlInput');input.placeholder='Source /path · find words · :walk · :dial · :return';
  input.addEventListener('input',e=>{if(native.active())e.stopImmediatePropagation()},true);
  input.addEventListener('keydown',e=>{
   if(e.key!=='Enter'||!native.active())return;e.preventDefault();e.stopImmediatePropagation();
   const value=input.value;native.closeEditor();api.command(value).catch(x=>{const s=host.querySelector('[data-ip=status]');s.textContent=x.message;s.dataset.error='1'}).finally(()=>{api.refresh();if(value!==':source')host.querySelector('[data-ip=space]').focus()});
  },true);
  window.addEventListener('field-instrument:frame',e=>{if(!ready)return;const href=native.heldAddress();if(!href||href===lastNative){api.refresh();return}lastNative=href;api.loadRoute(href).catch(()=>{})});
  new MutationObserver(()=>{if(root.hidden)api.stop()}).observe(root,{attributes:true,attributeFilter:['hidden']});
  let resize;window.addEventListener('resize',()=>{clearTimeout(resize);resize=setTimeout(()=>api.refresh(),180)});
  // Native FIELD already captures the original navigation parameters before restoring its URL.
  const incoming=window.FieldIndexReadModel.entry().focus;
  if(incoming)await api.loadRoute(incoming);else await api.resume(native.heldAddress()||'/');lastNative=native.heldAddress();ready=true;
  // One native reader, addressed from the root palette. A URL only selects its
  // existing perspective/drawer; source/cursor/RETURN still belong to api.
  const requestedView=query.get('view');
  if(['plain','walk','dial'].includes(requestedView))api.perspective(requestedView);
  if(query.get('source')==='1')api.command(':source');
  window.InterphaseInstrument=api;
  window.FieldWork=Object.freeze({active:()=>native.active()&&!host.hidden,show:()=>{native.enter();host.hidden=false;api.refresh()},snapshot:api.snapshot,instrument:api});
 };
 begin().catch(e=>{const host=document.getElementById('interphaseWorkspace');if(host)host.textContent='Source could not open: '+e.message;console.error(e)});
}
startFieldWork();
