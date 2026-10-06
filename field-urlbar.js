import {VERSION,commandFromSearch,resolveSelector,withCommand,describeRoute,handoffPacket} from './field-urlbar-core.mjs';

const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const state={command:null,resolution:null,route:null,head:null,heads:[],routes:[],packet:null,error:null};

function activeCommand(){return commandFromSearch(location.search)}
function isRoot(){return location.pathname==='/'||/\/index\.html?$/.test(location.pathname)}
async function ready(){
  if(document.readyState==='loading')await new Promise(r=>document.addEventListener('DOMContentLoaded',r,{once:true}));
  for(let i=0;i<80;i++){
    if(globalThis.__fieldAct&&globalThis.__fieldRouteMap&&globalThis.InterphaseGlyph)return true;
    await sleep(25);
  }
  return false;
}
async function loadHeads(){
  try{
    const r=await fetch('./control/CURRENT.json',{cache:'no-store'});
    if(!r.ok)throw Error('HTTP '+r.status);
    const j=await r.json();
    return Array.isArray(j.current_heads)?j.current_heads:[];
  }catch(_){return[]}
}
function routeList(){
  try{
    const m=globalThis.__fieldRouteMap?.all?.();
    return m instanceof Map?[...m.values()]:Array.isArray(m)?m:[];
  }catch(_){return[]}
}
function headFor(route){return state.heads.find(h=>h?.route===route?.href)||null}
function commandText(route,action){
  const key=state.command?.key||'f';
  const search=withCommand(location.search,route,action,key);
  return location.pathname+search;
}
function setAddress(route,action='hold',{push=true,run=true}={}){
  const key=state.command?.key||'f';
  const search=withCommand(location.search,route,action,key);
  const url=location.pathname+search+location.hash;
  history[push?'pushState':'replaceState']({fieldUrlbar:VERSION},'',url);
  if(run)execute().catch(fail);
}
function focus(route){
  if(!route)return null;
  try{return globalThis.__fieldAct?.focus?.(route.href)||null}catch(_){return null}
}
function focusHref(){try{return globalThis.__fieldAct?.focusHref?.()||null}catch(_){return null}}
function canonicalReturn(route){
  const p=new URLSearchParams(location.search);
  p.delete('φ');p.delete('f');
  if(route?.href)p.set('focus',route.href);
  const q=p.toString();
  return location.pathname+(q?'?'+q:'');
}
function openFold(selector){
  const el=$(selector);
  if(!el)return false;
  if('open' in el)el.open=true;
  el.scrollIntoView?.({behavior:'smooth',block:'start'});
  return true;
}
function routeGlyph(route,head){
  if(!route||!globalThis.InterphaseGlyph)return'<span class="fuFallback">φ</span>';
  try{return globalThis.InterphaseGlyph.svg(describeRoute(route,head),{size:140})}catch(_){return'<span class="fuFallback">φ</span>'}
}
function sigil(action){return({hold:'◎',turn:'↗',trace:'∴',return:'↩',work:'▦',up:'↑',down:'↓',next:'→',prev:'←',visual:'⊙',structure:'≡',evolve:'⌁',versions:'↺',recent:'◴',axial:'│',handoff:'⇢'}[action]||'φ')}
function actionLabel(action){return action.toUpperCase()}
function button(route,action,label=actionLabel(action)){
  if(!route)return'';
  return'<button type="button" class="fuOp" data-fu-action="'+esc(action)+'" title="'+esc(label)+' · '+esc(commandText(route,action))+'"><b>'+sigil(action)+'</b><span>'+esc(label)+'</span></button>';
}
function bind(){
  document.querySelectorAll('[data-fu-action]').forEach(el=>el.onclick=()=>{
    if(!state.route)return;
    setAddress(state.route,el.dataset.fuAction,{push:true,run:true});
  });
  document.querySelectorAll('[data-fu-route]').forEach(el=>el.onclick=()=>{
    const route=state.routes.find(r=>r.href===el.dataset.fuRoute);if(route)setAddress(route,'hold',{push:true,run:true});
  });
  const copy=$('#fieldUrlCopy');if(copy)copy.onclick=async()=>{
    const payload=copy.dataset.payload||'';
    try{await navigator.clipboard.writeText(payload);copy.textContent='COPIED'}catch(_){copy.textContent='COPY FAILED'}
  };
  const close=$('#fieldUrlClose');if(close)close.onclick=()=>location.assign(canonicalReturn(state.route));
}
function render(){
  let host=$('#fieldUrlbar');
  if(!host){host=document.createElement('section');host.id='fieldUrlbar';host.setAttribute('aria-label','FIELD URL operator');document.body.prepend(host)}
  const cmd=state.command,route=state.route,res=state.resolution;
  const empty=cmd&&cmd.raw==='';
  const mode=state.error?'ERROR':res?.state==='ambiguous'?'AMBIGUOUS':res?.state==='unresolved'?'UNRESOLVED':empty?'READY':actionLabel(cmd?.action||'hold');
  const title=route?.title||route?.href||(empty?'FIELD URL':'NO MATCH');
  const addr=route?commandText(route,cmd?.action||'hold'):(location.pathname+location.search);
  const candidates=(res?.state==='ambiguous'||res?.state==='unresolved')?(res?.candidates||[]):[];
  const packet=state.packet;
  host.innerHTML='<style>'+CSS+'</style><div class="fuShell" data-mode="'+esc(mode)+'">'+
    '<div class="fuGlyph">'+routeGlyph(route,state.head)+'</div>'+
    '<div class="fuRead"><div class="fuEy">φ URL · '+esc(mode)+' · AUTHORITY NONE</div><div class="fuTitle">'+esc(title)+'</div><code>'+esc(addr)+'</code></div>'+
    '<div class="fuOps">'+(route?[button(route,'hold','HOLD')+button(route,'turn','TURN')+button(route,'trace','TRACE')+button(route,'work','WORK')+button(route,'handoff','HANDOFF')+button(route,'return','RETURN')]:'')+'<button id="fieldUrlClose" type="button" class="fuOp fuClose" title="exit URL operator"><b>×</b><span>EXIT</span></button></div>'+
    '<div class="fuMeta"><span><b>⌘L / CTRL+L</b> then <code>?f=desk</code> · <code>?f=house:trace</code> · <code>?f=fold-bloom:turn</code></span><span>same object · same FIELD hand · URL is projection state</span></div>'+
    (empty?'<div class="fuHelp"><b>GRAMMAR</b> target[:verb] · verbs HOLD TURN TRACE WORK HANDOFF RETURN · navigation ↑ ↓ ← → and VISUAL STRUCTURE EVOLVE VERSIONS RECENT AXIAL are also addressable.</div>':'')+
    (candidates.length?'<div class="fuCandidates"><b>'+esc(res.state)+'</b>'+candidates.map(r=>'<button type="button" data-fu-route="'+esc(r.href)+'"><span>'+esc(r.title||r.href)+'</span><code>'+esc(r.href)+'</code></button>').join('')+'</div>':'')+
    (state.error?'<div class="fuError">'+esc(state.error)+'</div>':'')+
    (packet?'<div class="fuPacket"><div><b>⇢ HANDOFF</b><span>'+esc(packet.object_ref||'—')+' · receiver owns acceptance / mutation / undo / RETURN</span></div><button id="fieldUrlCopy" data-payload="'+esc(JSON.stringify(packet,null,2))+'">COPY PACKET</button></div>':'')+
    '</div>';
  bind();
}
function updateRouteFromFocus(){
  const href=focusHref();
  const route=state.routes.find(r=>r.href===href)||state.route;
  if(route){state.route=route;state.head=headFor(route);state.resolution={state:'resolved',selector:route.href,route,candidates:[route]}}
}
async function execute(){
  state.command=activeCommand();state.packet=null;state.error=null;
  if(!state.command){$('#fieldUrlbar')?.remove();return}
  const cmd=state.command;
  const current=focusHref();
  const res=resolveSelector(cmd.selector,state.routes,state.heads,current);
  state.resolution=res;state.route=res.route;state.head=headFor(res.route);
  if(cmd.raw===''||res.state!=='resolved'){render();return}

  const route=res.route;focus(route);
  await Promise.resolve();
  switch(cmd.action){
    case'hold':break;
    case'turn':globalThis.__fieldAct?.open?.(route.href);return;
    case'trace':($('#runDockTrace')||$('#apTrace'))?.click?.();break;
    case'return':location.assign(canonicalReturn(route));return;
    case'work':openFold('.workDepth');break;
    case'up':globalThis.__fieldAct?.rise?.();updateRouteFromFocus();break;
    case'down':globalThis.__fieldAct?.dive?.();updateRouteFromFocus();break;
    case'next':globalThis.__fieldAct?.peer?.(1);updateRouteFromFocus();break;
    case'prev':globalThis.__fieldAct?.peer?.(-1);updateRouteFromFocus();break;
    case'visual':globalThis.FieldLensHost?.project?.('VISUAL');break;
    case'structure':globalThis.FieldLensHost?.project?.('STRUCTURE');break;
    case'evolve':globalThis.FieldLensHost?.project?.('EVOLVE');break;
    case'versions':globalThis.FieldLensHost?.project?.('VERSIONS');break;
    case'recent':globalThis.FieldLensHost?.project?.('RECENT');break;
    case'axial':globalThis.FieldLensHost?.project?.('AXIAL_LATEST');break;
    case'handoff':{
      let surface=null;try{surface=globalThis.FieldIndexCarrier?.actionSurface?.()||null}catch(_){surface=null}
      state.packet=handoffPacket(route,surface);
      try{sessionStorage.setItem('field.urlbar.handoff.v01',JSON.stringify(state.packet))}catch(_){/* ephemeral only */}
      break;
    }
  }
  render();
}
function fail(err){state.error=String(err?.message||err);render()}

export async function mount(){
  if(!isRoot()||!activeCommand())return false;
  const ok=await ready();
  if(!ok){state.command=activeCommand();state.error='FIELD host not ready';render();return false}
  state.heads=await loadHeads();state.routes=routeList();
  addEventListener('popstate',()=>execute().catch(fail));
  await execute();
  return true;
}

const CSS=`
#fieldUrlbar{position:sticky;top:0;z-index:10020;display:block;width:min(1240px,100%);margin:0 auto 6px;color:var(--ink);font:10px/1.25 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.fuShell{display:grid;grid-template-columns:42px minmax(0,1fr) auto;gap:6px 9px;align-items:center;border:1px solid var(--line);border-left:2px solid var(--hot);background:color-mix(in srgb,var(--bg) 94%,transparent);backdrop-filter:blur(10px);box-shadow:0 8px 24px rgba(0,0,0,.26)}
.fuGlyph{width:42px;height:42px;border-right:1px solid var(--line);display:grid;place-items:center;overflow:hidden}.fuGlyph svg{width:39px;height:39px;display:block}.fuFallback{font:700 20px/1 system-ui;color:var(--hot)}
.fuRead{min-width:0;padding:5px 0}.fuEy{font-size:6px;letter-spacing:.13em;color:var(--hot)}.fuTitle{font:800 12px/1.05 system-ui,sans-serif;letter-spacing:-.02em;margin:2px 0}.fuRead code{display:block;color:var(--cool);font-size:6.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fuOps{display:flex;align-self:stretch;min-width:0}.fuOp{width:48px;min-height:42px;border:0;border-left:1px solid var(--line);background:transparent;color:var(--mut);padding:3px;display:grid;place-items:center;align-content:center;gap:1px}.fuOp:hover,.fuOp:focus-visible{background:var(--p2);color:var(--ink)}.fuOp b{font:700 13px/1 ui-monospace,monospace;color:var(--ink)}.fuOp span{font-size:5px;letter-spacing:.08em}.fuOp[data-fu-action="turn"] b{color:var(--hot)}.fuOp[data-fu-action="trace"] b{color:var(--green)}.fuOp[data-fu-action="handoff"] b{color:var(--gold)}.fuOp[data-fu-action="return"] b{color:var(--cool)}.fuClose{width:34px}
.fuMeta,.fuHelp,.fuCandidates,.fuError,.fuPacket{grid-column:1/-1;border-top:1px solid var(--line);padding:4px 7px}.fuMeta{display:flex;justify-content:space-between;gap:12px;color:var(--mut);font-size:5.8px}.fuMeta b{color:var(--gold)}.fuMeta code,.fuHelp code{color:var(--cool)}
.fuHelp{color:var(--mut);font-size:6.5px}.fuHelp b{color:var(--ink);margin-right:8px}.fuCandidates{display:flex;gap:2px;overflow:auto;align-items:stretch}.fuCandidates>b{color:var(--bad);font-size:6px;letter-spacing:.1em;padding:6px}.fuCandidates button{flex:0 0 auto;max-width:180px;text-align:left;padding:5px 7px;border:1px solid var(--line);background:var(--p);color:var(--ink)}.fuCandidates button span{display:block;font-size:7px}.fuCandidates button code{display:block;color:var(--cool);font-size:5.5px;margin-top:1px}
.fuError{color:var(--bad);font-size:7px}.fuPacket{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;color:var(--mut);font-size:6px}.fuPacket b{display:block;color:var(--gold);font-size:6.5px;letter-spacing:.1em}.fuPacket span{display:block;margin-top:1px}.fuPacket button{padding:5px 7px;border:1px solid var(--gold);background:transparent;color:var(--gold);font-size:6px}
html[data-theme="light"] .fuShell{background:rgba(251,249,243,.96);box-shadow:0 8px 24px rgba(0,0,0,.12)}
@media(max-width:760px){#fieldUrlbar{margin-bottom:4px}.fuShell{grid-template-columns:36px minmax(0,1fr)}.fuGlyph{width:36px;height:36px}.fuGlyph svg{width:34px;height:34px}.fuOps{grid-column:1/-1;border-top:1px solid var(--line);overflow:auto}.fuOp{flex:1 0 46px;border-left:0;border-right:1px solid var(--line);min-height:38px}.fuMeta{display:block}.fuMeta span:last-child{display:none}.fuPacket{grid-template-columns:1fr}.fuPacket button{min-height:34px}}
@media(prefers-reduced-motion:reduce){#fieldUrlbar *{scroll-behavior:auto!important}}
`;

if(isRoot()&&activeCommand())mount().catch(fail);
