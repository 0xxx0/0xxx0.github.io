import {mountContinuum} from './interphase/continuum.mjs?v=0.10.0';
function startFieldWork(){
 if(location.pathname!=='/'||new URLSearchParams(location.search).get('instrument')==='0'||new URLSearchParams(location.search).get('work')==='0')return;
 const begin=async()=>{
  let native;for(let i=0;i<150;i++){native=window.FieldInstrument;if(native&&document.getElementById('fieldInstrument')&&document.getElementById('fiView'))break;await new Promise(r=>setTimeout(r,80))}
  if(!native)throw Error('Native FIELD did not open.');
  const root=document.getElementById('fieldInstrument'),host=document.createElement('div');host.id='interphaseWorkspace';root.append(host);root.dataset.work='1';document.documentElement.dataset.fieldWork='1';
  const css=document.createElement('link');css.rel='stylesheet';css.href='/field-work.css?v=0.10.0';document.head.append(css);
  const get=id=>document.getElementById(id);let lastNative=null,api,ready=false;
  api=await mountContinuum(host,{route:'/',onRoute:href=>{if(href!==lastNative){lastNative=href;native.hold(href)}},onFocus:s=>{
   if(get('fiBarName'))get('fiBarName').textContent=s.label;
   if(get('fiBarMeta'))get('fiBarMeta').textContent=`${s.scopeLabel} · ${s.index} / ${s.count}`;
   if(get('fiScopeGlyph'))get('fiScopeGlyph').textContent='☷';
   if(get('fiScopeScale'))get('fiScopeScale').textContent='SOURCE';
   if(get('fiParent'))get('fiParent').setAttribute('aria-label','Source and work');
   if(get('fiReturn')){get('fiReturn').setAttribute('aria-label','Return to previous source context');get('fiReturn').hidden=!s.back}
   if(get('fiMenu'))get('fiMenu').hidden=true;
   if(get('fiViewName'))get('fiViewName').textContent=s.view==='walk'?'◇ WALK':'⊞ PLAIN';
  }});
  const view=get('fiView');view.setAttribute('aria-label','Change source perspective: plain or walk');view.onclick=e=>{e.stopPropagation();api.perspective(api.snapshot()?.attention.view==='walk'?'plain':'walk')};
  get('fiParent').onclick=e=>{e.stopPropagation();native.closeEditor();api.toggleSource()};
  get('fiReturn').onclick=e=>{e.stopPropagation();api.returnStep()};
  get('fiAddress').addEventListener('click',()=>api.stop());
  const input=get('fieldUrlInput');input.placeholder='Source /path · find words · :walk · :read · :return';
  input.addEventListener('input',e=>{if(native.active())e.stopImmediatePropagation()},true);
  input.addEventListener('keydown',e=>{
   if(e.key!=='Enter'||!native.active())return;e.preventDefault();e.stopImmediatePropagation();
   const value=input.value;native.closeEditor();api.command(value).catch(x=>{const s=host.querySelector('[data-ip=status]');s.textContent=x.message;s.dataset.error='1'}).finally(()=>{api.refresh();if(value!==':source')host.querySelector('[data-ip=space]').focus()});
  },true);
  window.addEventListener('field-instrument:frame',e=>{if(!ready)return;const href=native.heldAddress();if(!href||href===lastNative){api.refresh();return}lastNative=href;api.loadRoute(href).catch(()=>{})});
  new MutationObserver(()=>{if(root.hidden)api.stop()}).observe(root,{attributes:true,attributeFilter:['hidden']});
  let resize;window.addEventListener('resize',()=>{clearTimeout(resize);resize=setTimeout(()=>api.refresh(),180)});
  await api.resume();ready=true;
  window.InterphaseInstrument=api;
  window.FieldWork=Object.freeze({active:()=>native.active()&&!host.hidden,show:()=>{native.enter();host.hidden=false;api.refresh()},snapshot:api.snapshot,instrument:api});
 };
 begin().catch(e=>{const host=document.getElementById('interphaseWorkspace');if(host)host.textContent='Source could not open: '+e.message;console.error(e)});
}
startFieldWork();
