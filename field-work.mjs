// Root aperture onto the existing INTERPHASE host. FIELD still owns its frame,
// native effects and RETURN. The child owns data work; messages select sources
// only, on this exact same-origin window pair.
const query=new URLSearchParams(location.search);
if(location.pathname==='/'&&query.get('instrument')!=='0'&&query.get('work')!=='0'){
 let attempts=0;
 function boot(){
  const native=window.FieldInstrument,root=document.getElementById('fieldInstrument'),view=document.getElementById('fiView');
  if(!native?.active()||!root||!view){if(attempts++<150)setTimeout(boot,80);return}
  const iframe=document.createElement('iframe');iframe.id='interphaseWorkspace';iframe.title='INTERPHASE+ · source, compose, result';
  iframe.src='/interphase/?embedded=1&view=WORK';iframe.setAttribute('allow','clipboard-write');root.append(iframe);
  const style=document.createElement('link');style.rel='stylesheet';style.href='/field-work.css?v=0.9.0';document.head.append(style);
  let work=true,ready=false,childRoute=null,childFocus=null,lastSent=null;
  const oldView=view.onclick;
  const sendTheme=()=>{if(!ready)return;const computed=getComputedStyle(document.documentElement),palette={};for(const key of ['--bg','--ink','--mut','--line','--cool','--hot','--bad']){const value=computed.getPropertyValue(key).trim();if(CSS.supports('color',value))palette[key]=value}iframe.contentWindow.postMessage({type:'INTERPHASE_THEME',palette},location.origin)};
  new MutationObserver(sendTheme).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme','class','style']});
  function paint(){
   root.dataset.work=work?'1':'0';document.documentElement.dataset.fieldWork=work?'1':'0';iframe.hidden=!work;
   if(work){
    document.getElementById('fiViewName').textContent='Ω WORK';view.setAttribute('aria-label','View: INTERPHASE work. Switch to the Field strip.');
    const name=document.getElementById('fiBarName'),meta=document.getElementById('fiBarMeta');
    name.textContent='INTERPHASE+';meta.textContent=childFocus?`${childFocus.label} · ${childFocus.view||'WORK'} · ${childFocus.steps||0} steps`:'SOURCE → COMPOSE → RESULT';
    document.getElementById('fiAddress').setAttribute('aria-label','Find a FIELD object; work stays held');
   }else{
    const plan=native.snapshot().map==='plan';document.getElementById('fiViewName').textContent=plan?'⌁ PLAN':'⌁ STRIP';view.setAttribute('aria-label',plan?'View: Field plan. Switch to INTERPHASE work.':'View: Field strip. Switch to the Field plan.');
   }
  }
  function selectHeld(){
   if(!ready)return;
   const href=native.heldAddress();
   if(href&&href!=='/'&&href!==childRoute&&href!==lastSent){lastSent=href;iframe.contentWindow.postMessage({type:'INTERPHASE_SELECT_ROUTE',route:href},location.origin)}
  }
  view.onclick=e=>{
   if(work){work=false;oldView?.call(view,e);if(native.snapshot().map==='plan')oldView?.call(view,e);paint();return}
   if(native.snapshot().map==='strip'){oldView?.call(view,e);paint();return}
   oldView?.call(view,e);work=true;selectHeld();paint();
  };
  document.getElementById('fieldUrlInput').addEventListener('focus',()=>{work=false;paint()});
  window.addEventListener('field-instrument:frame',()=>{selectHeld();paint()});
  window.addEventListener('message',e=>{
   if(e.origin!==location.origin||e.source!==iframe.contentWindow||!e.data)return;
   if(e.data.type==='INTERPHASE_READY'){ready=true;sendTheme();selectHeld();paint()}
   if(e.data.type==='INTERPHASE_FOCUS'){
    childFocus=e.data;childRoute=e.data.route||null;lastSent=null;
    if(childRoute&&native.heldAddress()!==childRoute)native.hold(childRoute);
    paint();
   }
  });
  window.FieldWork=Object.freeze({active:()=>work,show(){work=true;selectHeld();paint()},hide(){work=false;paint()},snapshot:()=>({active:work,ready,source:childFocus&&{id:childFocus.id,label:childFocus.label,route:childRoute}})});
  paint();
 }
 boot();
}
