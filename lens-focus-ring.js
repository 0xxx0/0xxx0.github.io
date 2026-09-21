(()=>{'use strict';
const HOST_ID='lens-focus-ring';
const RECEIPT_KEY='lens:focus-ring:last-receipt:v1';
const MODES=['VISUAL','PULSE','STRUCTURE','RECENT'];
function esc(s){return String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]||c))}
function attach(api){
  if(!api||document.getElementById(HOST_ID))return null;
  const host=document.createElement('div');host.id=HOST_ID;
  const sh=host.attachShadow({mode:'open'});
  sh.innerHTML='<style>:host{all:initial}.trigger{position:fixed;right:max(8px,env(safe-area-inset-right));bottom:max(8px,env(safe-area-inset-bottom));z-index:2147483646;width:42px;height:42px;border:1px solid #718087;border-radius:0;background:#090d0ff2;color:#eef1ed;font:800 18px ui-monospace,monospace;cursor:pointer}.panel{position:fixed;right:max(8px,env(safe-area-inset-right));bottom:max(58px,calc(env(safe-area-inset-bottom) + 58px));z-index:2147483646;width:min(344px,calc(100vw - 16px));border:1px solid #39454d;border-radius:0;background:#090d0ff7;color:#eef1ed;font:9px/1.4 ui-monospace,monospace;box-shadow:0 8px 30px #000b;display:none}.panel.on{display:block}.head{display:flex;justify-content:space-between;gap:10px;padding:8px;border-bottom:1px solid #29343a}.ey{font-size:7px;letter-spacing:.14em;color:#ed7447}.close{border:0;border-left:1px solid #29343a;background:#0f1317;color:#99a5aa;min-width:32px;cursor:pointer}.cross{display:grid;grid-template-columns:58px 1fr 58px;grid-template-rows:38px minmax(78px,auto) 38px;gap:1px;background:#29343a;border-bottom:1px solid #29343a}.cross button,.rim button,.acts button,.stackBtn{border:0;border-radius:0;background:#0f1317;color:#e9eeec;font:800 8px ui-monospace,monospace;cursor:pointer}.cross button:hover,.cross button:focus,.rim button:hover,.rim button:focus,.acts button:hover,.acts button:focus,.stackBtn:hover,.stackBtn:focus{background:#172027;outline:1px solid #72bce7;outline-offset:-1px}.rise{grid-column:2}.prev{grid-column:1;grid-row:2}.focus{grid-column:2;grid-row:2;background:#0a1013;padding:10px;overflow:hidden}.next{grid-column:3;grid-row:2}.dive{grid-column:2;grid-row:3}.focus b{display:block;font:800 15px/1.05 system-ui,sans-serif;letter-spacing:-.03em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.focus code{display:block;margin-top:6px;color:#72bce7;font-size:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.focus span{display:block;margin-top:5px;color:#78868c;font-size:7px}.rim{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:#29343a}.rim button{min-height:34px}.rim button.on{color:#dff4ff;background:#10202a}.meta{display:grid;grid-template-columns:1fr auto;border-top:1px solid #29343a;border-bottom:1px solid #29343a}.meta div{padding:7px 8px;color:#77868c}.meta b{color:#d8dedc}.stackBtn{min-height:32px;border-left:1px solid #29343a;padding:0 9px}.stack{display:none;padding:7px 8px;border-bottom:1px solid #29343a;color:#9ba6aa}.stack.on{display:block}.stackRow{display:grid;grid-template-columns:1fr auto;gap:8px;padding:5px 0;border-bottom:1px solid #20282c}.stackRow:last-child{border-bottom:0}.stackRow span{color:#718087}.acts{display:grid;grid-template-columns:1fr 1fr 1fr;gap:1px;background:#29343a}.acts button{min-height:38px}.return{color:#d5ad68!important}.foveate{color:#98d49b!important}.studio{color:#72bce7!important}.note{padding:7px 8px;color:#67747a;font-size:7px}@media(max-width:420px){.panel{width:calc(100vw - 16px)}.cross{grid-template-columns:54px 1fr 54px}}</style><button class="trigger" aria-label="Open Focus Ring" title="Focus Ring">◎</button><section class="panel" aria-label="Focus Ring"><div class="head"><div><div class="ey">LENS-02 / ACTIVE APERTURE</div><b>FOCUS RING</b></div><button class="close" aria-label="Close">×</button></div><div class="cross"><button class="rise">↑ RISE</button><button class="prev">← PEER</button><div class="focus"><b>—</b><code>—</code><span>—</span></div><button class="next">PEER →</button><button class="dive">↓ DIVE</button></div><div class="rim"></div><div class="meta"><div>APERTURE <b class="ap">—</b> · PROJECTION <b class="proj">—</b></div><button class="stackBtn">STACK <span>0</span></button></div><div class="stack"></div><div class="acts"><button class="return">↩ RETURN</button><button class="foveate">FOVEATE OFF</button><button class="studio">OPEN STUDIO →</button></div><div class="note">identity stays centered · aperture changes scope · rim changes projection · RETURN restores entry state</div></section>';
  document.documentElement.appendChild(host);
  const panel=sh.querySelector('.panel'),trigger=sh.querySelector('.trigger'),focus=sh.querySelector('.focus'),rim=sh.querySelector('.rim'),stack=sh.querySelector('.stack'),stackBtn=sh.querySelector('.stackBtn');
  let origin=null,startedAt=null,trace=[];
  function snap(){try{return api.snapshot?.()||null}catch(_){return null}}
  function mark(action){const s=snap();trace.push({at:new Date().toISOString(),action,focusId:s?.focusId||null,objectId:s?.objectId||null,aperture:s?.aperture||null,projection:s?.projection||null,foveate:!!s?.meta?.foveate,stack:(s?.lensStack||[]).map(x=>x.lensId)})}
  function writeReceipt(exit){const receipt={schema:'0xxx0/lens-focus-ring-interaction/v0.1',startedAt,endedAt:new Date().toISOString(),exit,origin,end:api.uiState?.()||null,actions:trace.slice(),actionCount:Math.max(0,trace.length-1)};try{sessionStorage.setItem(RECEIPT_KEY,JSON.stringify(receipt))}catch(_){}return receipt}
  function render(){
    const s=snap();if(!s)return;
    const title=s.meta?.title||s.focusId||s.objectId||'—';
    focus.querySelector('b').textContent=title;
    focus.querySelector('code').textContent=s.focusId||s.objectId||'—';
    focus.querySelector('span').textContent=(s.meta?.state||'')+(s.meta?.family?' · '+s.meta.family:'');
    sh.querySelector('.ap').textContent=String(s.aperture?.range||s.aperture?.level||'—');
    sh.querySelector('.proj').textContent=s.projection||'—';
    const xs=s.lensStack||[];stackBtn.querySelector('span').textContent=String(xs.length);const fv=sh.querySelector('.foveate');fv.textContent=s.meta?.foveate?(s.projection==='VISUAL'?'FOVEATE ON':'FOVEATE HELD'):'FOVEATE OFF';
    stack.innerHTML=xs.length?xs.map((x,i)=>'<div class="stackRow"><b>'+(i+1)+' · '+esc(x.lensId)+'</b><span>'+esc(x.kind)+' / '+esc(x.authority)+'</span></div>').join(''):'<div>NO COMPOSED VIEW LENSES</div>';
    rim.innerHTML=MODES.map(m=>'<button data-mode="'+m+'" class="'+(m===s.projection?'on':'')+'">'+(m==='STRUCTURE'?'STRUCT':m)+'</button>').join('');
    rim.querySelectorAll('button').forEach(b=>b.onclick=()=>{api.project?.(b.dataset.mode);mark('PROJECT_'+b.dataset.mode);render()});
  }
  function open(){if(!origin){origin=api.uiState?.()||null;startedAt=new Date().toISOString();trace=[];mark('OPEN')}panel.classList.add('on');render()}
  function close(){panel.classList.remove('on');stack.classList.remove('on')}
  trigger.onclick=()=>panel.classList.contains('on')?close():open();
  sh.querySelector('.close').onclick=close;
  sh.querySelector('.rise').onclick=()=>{api.rise?.();mark('RISE');render()};
  sh.querySelector('.dive').onclick=()=>{api.dive?.();mark('DIVE');render()};
  sh.querySelector('.prev').onclick=()=>{api.peer?.(-1);mark('PEER_PREV');render()};
  sh.querySelector('.next').onclick=()=>{api.peer?.(1);mark('PEER_NEXT');render()};
  stackBtn.onclick=()=>stack.classList.toggle('on');
  sh.querySelector('.return').onclick=()=>{if(origin)api.restore?.(origin);mark('RETURN');writeReceipt('RETURN');origin=null;startedAt=null;render()};
  sh.querySelector('.foveate').onclick=()=>{api.foveate?.(!Boolean(snap()?.meta?.foveate));mark('FOVEATE_TOGGLE');render()};
  sh.querySelector('.studio').onclick=()=>{mark('OPEN_STUDIO');writeReceipt('OPEN_STUDIO');api.openStudio?.()};
  addEventListener('field-lens:state',()=>{if(panel.classList.contains('on'))render()});
  addEventListener('keydown',e=>{if(e.key==='Escape'&&panel.classList.contains('on'))close()});
  return Object.freeze({render,open,close,lastReceipt:()=>{try{return JSON.parse(sessionStorage.getItem(RECEIPT_KEY)||'null')}catch(_){return null}}});
}
window.LensFocusRing=Object.freeze({attach,RECEIPT_KEY});
function boot(){if(window.FieldLensAPI)attach(window.FieldLensAPI)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
