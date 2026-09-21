(()=>{'use strict';
const HOST_ID='lens-focus-ring';
const RECEIPT_KEY='lens:focus-ring:last-receipt:v2';
const DEFAULT_MODES=['VISUAL','PULSE','STRUCTURE','EVOLVE','RECENT'];
function esc(s){return String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]||c))}
function attach(api,options={}){
  if(!api||document.getElementById(HOST_ID))return null;
  const host=document.createElement('div');host.id=HOST_ID;
  const inline=options.placement==='inline';
  if(inline)host.dataset.placement='inline';
  const sh=host.attachShadow({mode:'open'});
  sh.innerHTML='<style>:host{all:initial}:host([data-placement="inline"]){display:block;width:100%}.trigger{position:fixed;right:max(8px,env(safe-area-inset-right));bottom:max(8px,env(safe-area-inset-bottom));z-index:2147483646;width:42px;height:42px;border:1px solid #718087;border-radius:0;background:#090d0ff2;color:#eef1ed;font:800 18px ui-monospace,monospace;cursor:pointer}.panel{position:fixed;right:max(8px,env(safe-area-inset-right));bottom:max(58px,calc(env(safe-area-inset-bottom) + 58px));z-index:2147483646;width:min(370px,calc(100vw - 16px));border:1px solid #39454d;border-radius:0;background:#090d0ff7;color:#eef1ed;font:9px/1.4 ui-monospace,monospace;box-shadow:0 8px 30px #000b;display:none}.panel.on{display:block}:host([data-placement="inline"]) .trigger{display:none}:host([data-placement="inline"]) .panel{position:relative;right:auto;bottom:auto;z-index:auto;width:100%;border:0;border-top:1px solid #39454d;box-shadow:none;background:#080b0d}.head{display:flex;justify-content:space-between;gap:10px;padding:8px;border-bottom:1px solid #29343a}.ey{font-size:7px;letter-spacing:.14em;color:#ed7447}.close{border:0;border-left:1px solid #29343a;background:#0f1317;color:#99a5aa;min-width:32px;cursor:pointer}.focus{padding:10px;background:#0a1013;border-bottom:1px solid #29343a}.lock{color:#98d49b;font-size:6.5px;letter-spacing:.12em}.focus b{display:block;margin-top:4px;font:800 16px/1.05 system-ui,sans-serif;letter-spacing:-.03em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.focus code{display:block;margin-top:5px;color:#72bce7;font-size:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.focus span{display:block;margin-top:4px;color:#78868c;font-size:7px}.scope{display:grid;grid-template-columns:1fr minmax(110px,1.35fr) 1fr;gap:1px;background:#29343a;border-bottom:1px solid #29343a}.scope button,.rim button,.acts button,.stackBtn,.stackRow button{border:0;border-radius:0;background:#0f1317;color:#e9eeec;font:800 8px ui-monospace,monospace;cursor:pointer}.scope button,.rim button{min-height:36px}.scope button:hover,.scope button:focus,.rim button:hover,.rim button:focus,.acts button:hover,.acts button:focus,.stackBtn:hover,.stackBtn:focus,.stackRow button:hover,.stackRow button:focus{background:#172027;outline:1px solid #72bce7;outline-offset:-1px}.scopeState{display:grid;place-items:center;background:#0a1013;padding:5px;text-align:center}.scopeState span{display:block;color:#66747a;font-size:6px;letter-spacing:.12em}.scopeState b{display:block;margin-top:2px;color:#d8dedc;font-size:8px;max-width:150px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rim{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:#29343a}.rim button.on{color:#dff4ff;background:#10202a}.meta{display:grid;grid-template-columns:1fr auto;border-top:1px solid #29343a;border-bottom:1px solid #29343a}.meta div{padding:7px 8px;color:#77868c}.meta b{color:#d8dedc}.stackBtn{min-height:32px;border-left:1px solid #29343a;padding:0 9px}.stack{display:none;padding:7px 8px;border-bottom:1px solid #29343a;color:#9ba6aa}.stack.on{display:block}.stackRow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;padding:5px 0;border-bottom:1px solid #20282c}.stackRow:last-child{border-bottom:0}.stackRow small{display:block;color:#718087;margin-top:2px}.stackRow button{border:1px solid #344148;padding:5px 7px;font-size:7px}.stackRow .inherited{color:#66747a;font-size:6.5px;letter-spacing:.08em}.supportHead{margin-top:7px;padding-top:6px;border-top:1px solid #29343a;color:#718087;font-size:7px;letter-spacing:.12em}.supportRow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px;align-items:center;padding:5px 0;border-bottom:1px solid #20282c}.supportRow small{display:block;color:#66747a;margin-top:2px}.supportRow button{border:1px solid #344148;border-radius:0;background:#0d1316;color:#e9eeec;font:800 7px ui-monospace,monospace;padding:5px 7px}.supportRow.dead{opacity:.42}.supportRow.dead button{display:none}.supportRow.parked{opacity:.68}.supportRow.parked button{color:#d7b978}.acts{display:grid;grid-template-columns:1fr 1fr 1fr;gap:1px;background:#29343a}.acts button{min-height:38px}.return{color:#d5ad68!important}.copy{color:#98d49b!important}.studio{color:#72bce7!important}.note{padding:7px 8px;color:#67747a;font-size:7px}@media(max-width:420px){.panel{width:calc(100vw - 16px)}:host([data-placement="inline"]) .panel{width:100%}.scope{grid-template-columns:1fr 1fr}.scopeState{grid-column:1/-1;grid-row:1}.acts{grid-template-columns:1fr 1fr}.acts .copy{grid-column:1/-1;grid-row:2}}</style><button class="trigger" aria-label="Open Lens" aria-expanded="false" aria-controls="lens-panel" title="Lens">◎</button><section class="panel" id="lens-panel" aria-label="Lens aperture" aria-hidden="true"><div class="head"><div><div class="ey">LENS / REFRACTION · HOST OWNS SELECT</div><b>FOCUS RING</b></div><button class="close" aria-label="Close">×</button></div><div class="focus"><div class="lock">IDENTITY LOCK</div><b>—</b><code>—</code><span>—</span></div><div class="scope"><button class="rise">← APERTURE OUT</button><div class="scopeState"><span>APERTURE</span><b class="ap">—</b></div><button class="dive">APERTURE IN →</button></div><div class="rim"></div><div class="meta"><div>VIEW <b class="proj">—</b> · OBJECT <b class="obj">—</b></div><button class="stackBtn" aria-expanded="false" aria-controls="lens-stack">STACK <span>0</span></button></div><div class="stack" id="lens-stack"></div><div class="acts"><button class="return">↩ RETURN</button><button class="copy">COPY STATE</button><button class="studio">DEEP LAB →</button></div><div class="note">SELECT stays with FIELD/AXIAL · LENS changes aperture / view / stack · parked lenses stay optional · RETURN restores the entry state</div></section>';
  const anchor=inline?(typeof options.anchor==='string'?document.querySelector(options.anchor):options.anchor):null;
  if(anchor?.insertAdjacentElement)anchor.insertAdjacentElement('afterend',host);else document.documentElement.appendChild(host);
  const panel=sh.querySelector('.panel'),trigger=sh.querySelector('.trigger'),focus=sh.querySelector('.focus'),rim=sh.querySelector('.rim'),stack=sh.querySelector('.stack'),stackBtn=sh.querySelector('.stackBtn');
  if(options.showTrigger===false||inline)trigger.hidden=true;
  let origin=null,startedAt=null,trace=[],invoker=null;
  function snap(){try{return api.snapshot?.()||null}catch(_){return null}}
  function mark(action){const s=snap(),entry={at:new Date().toISOString(),action,focusId:s?.focusId||null,objectId:s?.objectId||null,aperture:s?.aperture||null,projection:s?.projection||null,foveate:!!s?.meta?.foveate,stack:(s?.lensStack||[]).map(x=>x.lensId)};trace.push(entry);window.dispatchEvent(new CustomEvent('lens-proof:action',{detail:entry}))}
  function writeReceipt(exit){const endedAt=new Date().toISOString(),receipt={schema:'0xxx0/lens-focus-ring-interaction/v0.2',startedAt,endedAt,durationMs:startedAt?Math.max(0,Date.parse(endedAt)-Date.parse(startedAt)):null,exit,origin,end:api.uiState?.()||null,actions:trace.slice(),actionCount:Math.max(0,trace.length-1),policy:'HOST_SELECT__LENS_REFRACT'};try{sessionStorage.setItem(RECEIPT_KEY,JSON.stringify(receipt))}catch(_){}return receipt}
  async function copyState(){
    const s=snap();if(!s)return;
    let payload='';try{payload=window.LensState?.serialize?LensState.serialize(s,2):JSON.stringify(s,null,2)}catch(_){payload=JSON.stringify(s,null,2)}
    try{await navigator.clipboard.writeText(payload);const b=sh.querySelector('.copy'),old=b.textContent;b.textContent='COPIED';setTimeout(()=>b.textContent=old,800)}catch(_){prompt('Copy LensState:',payload)}
    mark('COPY_STATE');
  }
  function render(){
    const s=snap();if(!s)return;
    const title=s.meta?.title||s.focusId||s.objectId||'—';
    focus.querySelector('b').textContent=title;
    focus.querySelector('code').textContent=s.focusId||s.objectId||'—';
    focus.querySelector('span').textContent=(s.meta?.state||'')+(s.meta?.family?' · '+s.meta.family:'');
    sh.querySelector('.ap').textContent=String(s.aperture?.range||s.aperture?.level||'—');
    sh.querySelector('.proj').textContent=s.projection||'—';
    sh.querySelector('.obj').textContent=s.objectId||'—';
    const xs=s.lensStack||[],catalog=api.catalog?.()||[],activeIds=new Set(xs.map(x=>x.lensId)),catalogIds=new Set(catalog.map(x=>x.lensId));
    const support=window.LensState?.supportCatalog?LensState.supportCatalog(s,catalog).filter(x=>!activeIds.has(x.descriptor?.lensId)):[];
    stackBtn.querySelector('span').textContent=String(xs.length);
    const active=xs.length?xs.map((x,i)=>'<div class="stackRow"><div><b>'+(i+1)+' · '+esc(x.lensId)+'</b><small>'+esc(x.kind)+' / '+esc(x.authority)+'</small></div>'+(catalogIds.has(x.lensId)?'<button data-remove-lens="'+esc(x.lensId)+'">REMOVE</button>':'<span class="inherited">INHERITED</span>')+'</div>').join(''):'<div>PLAIN · NO COMPOSED VIEW LENSES</div>';
    const next=support.length?'<div class="supportHead">LAWFUL NEXT / DEAD STAYS VISIBLE</div>'+support.map(x=>{const parked=String(x.descriptor?.status||'').startsWith('PARKED');return '<div class="supportRow '+(x.support?'live':'dead')+(parked?' parked':'')+'"><div><b>'+esc(x.descriptor?.lensId||'—')+'</b><small>'+(parked?'PARKED · OPTIONAL · ':'')+(x.support?esc(x.currentContract)+' → '+esc(x.nextContract):esc((x.reasons||[]).join(' · ')))+'</small></div><button data-lens="'+esc(x.descriptor?.lensId||'')+'">'+(x.support?(parked?'TRY':'APPLY'):'DEAD')+'</button></div>'}).join(''):'';
    stack.innerHTML=active+next;
    stack.querySelectorAll('[data-lens]').forEach(b=>b.onclick=()=>{api.applyLens?.(b.dataset.lens);mark('LENS_APPLY_'+b.dataset.lens);render()});
    stack.querySelectorAll('[data-remove-lens]').forEach(b=>b.onclick=()=>{(api.removeLens||api.applyLens)?.call(api,b.dataset.removeLens);mark('LENS_REMOVE_'+b.dataset.removeLens);render()});
    const modes=api.projections?.()||DEFAULT_MODES;rim.innerHTML=modes.map(m=>'<button data-mode="'+m+'" aria-pressed="'+String(m===s.projection)+'" class="'+(m===s.projection?'on':'')+'">'+(m==='STRUCTURE'?'STRUCT':m.replace('_LATEST',''))+'</button>').join('');
    rim.style.gridTemplateColumns='repeat('+Math.max(1,Math.min(6,modes.length))+',1fr)';
    rim.querySelectorAll('button').forEach(b=>b.onclick=()=>{api.project?.(b.dataset.mode);mark('VIEW_'+b.dataset.mode);render()});
  }
  function open(){if(!origin){origin=api.uiState?.()||null;startedAt=new Date().toISOString();trace=[];invoker=sh.activeElement||document.activeElement||null;mark('OPEN')}panel.classList.add('on');panel.setAttribute('aria-hidden','false');trigger.setAttribute('aria-expanded','true');render()}
  function close(){panel.classList.remove('on');panel.setAttribute('aria-hidden','true');stack.classList.remove('on');stackBtn.setAttribute('aria-expanded','false');trigger.setAttribute('aria-expanded','false');if(invoker&&typeof invoker.focus==='function')try{invoker.focus()}catch(_){}}
  trigger.onclick=()=>panel.classList.contains('on')?close():open();
  sh.querySelector('.close').onclick=close;
  sh.querySelector('.rise').onclick=()=>{api.rise?.();mark('APERTURE_OUT');render()};
  sh.querySelector('.dive').onclick=()=>{api.dive?.();mark('APERTURE_IN');render()};
  stackBtn.onclick=()=>{const on=stack.classList.toggle('on');stackBtn.setAttribute('aria-expanded',String(on))};
  sh.querySelector('.return').onclick=()=>{if(origin)api.restore?.(origin);mark('RETURN');writeReceipt('RETURN');origin=null;startedAt=null;render();close()};
  sh.querySelector('.copy').onclick=copyState;
  sh.querySelector('.studio').onclick=()=>{mark('OPEN_STUDIO');writeReceipt('OPEN_STUDIO');api.openStudio?.()};
  addEventListener('field-lens:state',()=>{if(panel.classList.contains('on'))render()});
  addEventListener('keydown',e=>{if(e.key==='Escape'&&panel.classList.contains('on'))close()});
  return Object.freeze({render,open,close,isOpen:()=>panel.classList.contains('on'),lastReceipt:()=>{try{return JSON.parse(sessionStorage.getItem(RECEIPT_KEY)||'null')}catch(_){return null}}});
}
function readReceipt(){try{return JSON.parse(sessionStorage.getItem(RECEIPT_KEY)||'null')}catch(_){return null}}
let activeInstance=null;
window.LensFocusRing=Object.freeze({attach:(api,opt)=>activeInstance=attach(api,opt),RECEIPT_KEY,readReceipt,open:()=>activeInstance?.open(),close:()=>activeInstance?.close(),render:()=>activeInstance?.render(),isOpen:()=>activeInstance?.isOpen?.()});
function boot(){if(window.FieldLensAPI)activeInstance=attach(window.FieldLensAPI,window.FieldLensOptions||{})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
