import {parseFieldAddress,rankFieldRoutes,addressMode,normalizeFieldRoute} from './lib/field-address-grammar.mjs';

/* FIELD ADDRESS LINE v0.1
 *
 * One persistent route-control affordance. Browser-omnibox / Acme-address /
 * selection→action donor mechanics, but the semantics stay native FIELD:
 * exact object first, then a bounded operation. This module owns no canonical
 * state, queue, history, permission, shell or execution authority.
 */
if(typeof window!=='undefined'&&location.pathname==='/'){
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const routeOnly=v=>String(v||'').split(/[?#]/)[0]||'/';
const focusFromHost=()=>{
  const ap=String($('apPath')?.textContent||'').trim();
  if(ap.startsWith('/'))return routeOnly(ap);
  const q=new URLSearchParams(location.search).get('focus');
  return routeOnly(q||'/');
};
let routes=[],byHref=new Map(),selected=0,results=[],typing=false,ready=false;

function installStyle(){
 if($('field-address-style'))return;
 const s=document.createElement('style');s.id='field-address-style';s.textContent=`
#fieldAddressLine{position:sticky;top:max(0px,env(safe-area-inset-top));z-index:90;margin:0 0 7px;background:var(--bg);border-bottom:1px solid var(--line);padding-top:4px}
.fieldAddressBar{position:relative;display:grid;grid-template-columns:29px auto minmax(0,1fr) auto;align-items:center;min-height:39px;border:1px solid var(--line);background:var(--p);box-shadow:inset 2px 0 0 var(--hot)}
.fieldAddressGlyph{width:29px;height:29px;display:grid;place-items:center;border-right:1px solid var(--line);overflow:hidden}.fieldAddressGlyph svg{display:block}
.fieldAddressScheme{padding:0 7px;color:var(--hot);font-size:8px;font-weight:800;letter-spacing:.08em;white-space:nowrap}
#fieldAddressInput{width:100%;height:37px;min-width:0;border:0!important;outline:0;background:transparent!important;color:var(--ink);padding:0 8px 0 0;font:700 12px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;caret-color:var(--hot)}
#fieldAddressInput::selection{background:var(--hot);color:var(--bg)}
#fieldAddressMode{padding:0 8px;color:var(--mut);font-size:6.5px;letter-spacing:.1em;white-space:nowrap;border-left:1px solid var(--line);height:23px;display:flex;align-items:center}
#fieldAddressLine[data-verb="READ"] .fieldAddressBar{box-shadow:inset 2px 0 0 var(--cool)}
#fieldAddressLine[data-verb="PROVE"] .fieldAddressBar{box-shadow:inset 2px 0 0 var(--gold)}
#fieldAddressLine[data-verb="RETURN"] .fieldAddressBar{box-shadow:inset 2px 0 0 var(--green)}
#fieldAddressResults{position:absolute;left:-1px;right:-1px;top:100%;z-index:95;border:1px solid #4c5a60;border-top:0;background:var(--bg);box-shadow:0 10px 26px rgba(0,0,0,.42);max-height:min(56vh,430px);overflow:auto}
.fieldAddressResult{width:100%;border:0;border-bottom:1px solid var(--line);background:var(--p);display:grid;grid-template-columns:27px minmax(0,1fr) auto;align-items:center;gap:7px;min-height:37px;padding:4px 7px;text-align:left}.fieldAddressResult:last-child{border-bottom:0}.fieldAddressResult[aria-selected="true"],.fieldAddressResult:hover{background:var(--p2);outline:1px solid var(--hot);outline-offset:-1px}
.fieldAddressResultGlyph{width:24px;height:24px;display:grid;place-items:center}.fieldAddressResultText{min-width:0}.fieldAddressResultText b{display:block;font-size:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fieldAddressResultText span{display:block;color:var(--mut);font-size:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fieldAddressResultMeta{color:var(--mut);font-size:5.8px;letter-spacing:.06em;text-align:right;white-space:nowrap}
.fieldAddressHelp{padding:6px 8px;color:var(--mut);font-size:6.5px;line-height:1.65}.fieldAddressHelp b{color:var(--ink)}.fieldAddressHelp code{color:var(--cool);font:inherit}.fieldAddressLaw{display:flex;justify-content:space-between;gap:8px;padding:3px 2px 4px;color:#56636a;font-size:5.6px;letter-spacing:.05em}.fieldAddressLaw b{color:#69777e;font-weight:500}
html[data-theme="light"] .fieldAddressBar,html[data-theme="light"] .fieldAddressResult{background:#fbf9f3}html[data-theme="light"] .fieldAddressResult[aria-selected="true"],html[data-theme="light"] .fieldAddressResult:hover{background:#efece1}html[data-theme="light"] #fieldAddressResults{background:#f2efe8;box-shadow:0 10px 26px rgba(0,0,0,.16)}
@media(max-width:560px){#fieldAddressLine{margin-inline:-2px}.fieldAddressBar{grid-template-columns:29px 25px minmax(0,1fr) auto}.fieldAddressScheme{padding:0 6px;font-size:0}.fieldAddressScheme::after{content:'φ';font-size:11px}.fieldAddressLaw span:last-child{display:none}#fieldAddressMode{padding:0 6px;font-size:0}#fieldAddressMode::first-letter{font-size:9px}.fieldAddressResult{grid-template-columns:25px minmax(0,1fr)}.fieldAddressResultMeta{display:none}}
@media(prefers-reduced-motion:reduce){#fieldAddressResults{scroll-behavior:auto}}
 `;document.head.appendChild(s);
}

function install(){
 if($('fieldAddressLine'))return $('fieldAddressLine');
 const header=document.querySelector('main>header');if(!header)return null;
 const box=document.createElement('section');box.id='fieldAddressLine';box.dataset.verb='ADDRESS';box.setAttribute('aria-label','FIELD address line');
 box.innerHTML=`<div class="fieldAddressBar"><div class="fieldAddressGlyph" id="fieldAddressGlyph" aria-hidden="true"></div><span class="fieldAddressScheme">FIELD://</span><input id="fieldAddressInput" type="search" autocomplete="off" autocapitalize="none" spellcheck="false" aria-label="Address, find or operate on a FIELD object" aria-autocomplete="list" aria-controls="fieldAddressResults" placeholder="位 /route  ·  ? find  ·  :help"><span id="fieldAddressMode">位 ADDRESS</span><div id="fieldAddressResults" role="listbox" hidden></div></div><div class="fieldAddressLaw"><span>OBJECT → OPERATION · <b>authority NONE</b></span><span>/ focus · ? find · 讀 work · 驗 prove · 行 turn · 回 return</span></div>`;
 header.insertAdjacentElement('afterend',box);return box;
}
function fieldGlyph(route,size=23){
 if(!window.FieldGlyph)return'';
 try{return window.FieldGlyph.svg(route||{kind:'route',operation:'ADDRESS',state:'ACTIVE'},{size})}catch{return''}
}
function routeFor(href){return byHref.get(routeOnly(href))||null}
function syncGlyph(parsed=null){
 const href=focusFromHost(),route=routeFor(href),verb=parsed?.verb||'ADDRESS',mode=addressMode(parsed||{verb});
 const operation=verb==='SEARCH'?'ADDRESS':verb==='HOLD'?'ADDRESS':verb==='CURRENT'?'ADDRESS':verb;
 const synthetic={kind:route?.kind||'route',operation,state:route?.state||'ACTIVE'};
 const glyph=parsed&&verb!=='ADDRESS'&&verb!=='SEARCH'?synthetic:(route||synthetic);
 if($('fieldAddressGlyph'))$('fieldAddressGlyph').innerHTML=fieldGlyph(glyph,23);
 if($('fieldAddressMode'))$('fieldAddressMode').textContent=mode[0]+' '+mode[1];
 const host=$('fieldAddressLine');if(host)host.dataset.verb=verb;
}
function syncInput(force=false){
 const input=$('fieldAddressInput');if(!input||(!force&&(typing||document.activeElement===input)))return;
 input.value=focusFromHost();syncGlyph(parseFieldAddress(input.value));
}
function closeResults(){const box=$('fieldAddressResults');if(box){box.hidden=true;box.innerHTML=''}results=[];selected=0}
function renderHelp(){
 const box=$('fieldAddressResults');if(!box)return;
 box.hidden=false;box.innerHTML=`<div class="fieldAddressHelp"><b>ADDRESS IS THE TUI.</b><br><code>/route</code> hold; repeat exact held address to open · <code>? words</code> find · <code>讀</code>/<code>:work</code> inspect same object · <code>驗</code>/<code>:prove</code> proof depth · <code>行</code> expose declared TURN, never auto-execute · <code>回</code> exact receipt when declared, else RETURN index · <code>復</code> recovery · <code>映</code> map · <code>:desk</code> work desk. <b>No shell. No secret. No authority gain.</b></div>`;
}
function queryFor(parsed){
 if(parsed.kind==='ROUTE')return routeOnly(parsed.route);
 return parsed.query||'';
}
function renderResults(parsed){
 const box=$('fieldAddressResults');if(!box)return;
 if(parsed.verb==='HELP'){renderHelp();return}
 const q=queryFor(parsed);
 if(!q||['READ','PROVE','TURN','RETURN','RECOVER','PROJECT','PLAY','DESK','CURRENT','RETURNS','ROOT','HOLD'].includes(parsed.verb)){closeResults();return}
 results=rankFieldRoutes(routes,q,7);selected=Math.min(selected,Math.max(0,results.length-1));
 if(!results.length){box.hidden=false;box.innerHTML='<div class="fieldAddressHelp">NO ADDRESSED MATCH · type <code>:help</code> for grammar</div>';return}
 box.hidden=false;box.innerHTML=results.map((r,i)=>`<button class="fieldAddressResult" role="option" aria-selected="${i===selected?'true':'false'}" data-i="${i}"><span class="fieldAddressResultGlyph">${fieldGlyph(r,21)}</span><span class="fieldAddressResultText"><b>${esc(r.title||r.href)}</b><span>${esc(r.href)}</span></span><span class="fieldAddressResultMeta">${esc(r.operation||'ADDRESS')} · ${esc(r.state||'')}</span></button>`).join('');
 box.querySelectorAll('[data-i]').forEach(node=>{
  node.onpointerenter=()=>{selected=Number(node.dataset.i)||0;paintSelection()};
  node.onclick=()=>{selected=Number(node.dataset.i)||0;const r=results[selected];if(r)holdRoute(r)};
 });
}
function paintSelection(){
 const box=$('fieldAddressResults');if(!box)return;
 [...box.querySelectorAll('[data-i]')].forEach(n=>n.setAttribute('aria-selected',Number(n.dataset.i)===selected?'true':'false'));
 const n=box.querySelector(`[data-i="${selected}"]`);n?.scrollIntoView?.({block:'nearest'});
}
function routeToken(href){
 return [...document.querySelectorAll('.axisToken.route[data-value]')].find(n=>routeOnly(n.dataset.value)===routeOnly(href))||
        [...document.querySelectorAll('[data-href]')].find(n=>routeOnly(n.dataset.href)===routeOnly(href))||null;
}
function holdRoute(route,{openIfHeld=true}={}){
 if(!route)return false;
 const href=routeOnly(route.href),held=routeOnly(focusFromHost())===href,token=routeToken(href);
 closeResults();typing=false;
 if(token){
  if(held&&!openIfHeld){syncInput(true);return true}
  token.click();
  queueMicrotask(()=>syncInput(true));setTimeout(()=>syncInput(true),60);return true;
 }
 if(held&&openIfHeld){location.assign('.'+(route.alias_of||route.href));return true}
 const u=new URL(location.href);u.pathname='/';u.searchParams.set('focus',href);u.hash='';location.assign(u.href);return true;
}
function exactOrBest(parsed){
 const q=queryFor(parsed),normalized=normalizeFieldRoute(q,location.origin+'/');
 const exact=normalized&&routeFor(normalized);return exact||rankFieldRoutes(routes,q,1)[0]||null;
}
function revealTurn(){
 closeResults();window.FieldZUI?.close?.('address-line-turn');
 const moves=$('capMoves');moves?.scrollIntoView?.({block:'center',behavior:matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
 const first=moves?.querySelector?.('button,a,[tabindex]');first?.focus?.({preventScroll:true});
 window.dispatchEvent(new CustomEvent('field-address-turn',{detail:Object.freeze({focus:focusFromHost(),authority:'NONE',law:'TURN reveal only; native host owns RELEASE/effect'})}));
}
function go(path){closeResults();location.assign(path)}
function exactReturn(){
 const r=routeFor(focusFromHost());
 if(r?.receipt){go('.'+r.receipt);return}
 const cap=$('capReturn');const a=cap?.querySelector?.('a[href]');if(a){a.click();return}
 go('./returns/');
}
function projectMap(){
 closeResults();const fold=$('mapFold');if(fold)fold.open=true;
 const target=fold||$('fieldMap');target?.scrollIntoView?.({block:'start',behavior:matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
 $('mapSearch')?.focus?.({preventScroll:true});
}
function filterOperation(name){
 const input=$('fieldAddressInput');if(!input)return;
 input.value='? '+name.toLowerCase();typing=true;const parsed=parseFieldAddress(input.value);syncGlyph(parsed);renderResults(parsed);input.focus();
}
function execute(parsed){
 const input=$('fieldAddressInput');
 if(parsed.verb==='UNKNOWN'){renderHelp();return}
 if(parsed.verb==='HELP'){renderHelp();return}
 if(parsed.verb==='HOLD'){window.FieldZUI?.close?.('address-line');closeResults();syncInput(true);return}
 if(parsed.verb==='READ'){
   if(parsed.query){const r=exactOrBest(parsed);if(r)holdRoute(r,{openIfHeld:false})}
   window.FieldZUI?.open?.('WORK','address-line');closeResults();return;
 }
 if(parsed.verb==='PROVE'){
   if(parsed.query){const r=exactOrBest(parsed);if(r)holdRoute(r,{openIfHeld:false})}
   window.FieldZUI?.open?.('PROVE','address-line');closeResults();return;
 }
 if(parsed.verb==='TURN'){if(parsed.query){const r=exactOrBest(parsed);if(r)holdRoute(r,{openIfHeld:false})}setTimeout(revealTurn,0);return}
 if(parsed.verb==='RETURN'||parsed.verb==='RETURNS'){exactReturn();return}
 if(parsed.verb==='RECOVER'){go('./recovery/');return}
 if(parsed.verb==='PROJECT'){projectMap();return}
 if(parsed.verb==='PLAY'){go('./field-play.html');return}
 if(parsed.verb==='DESK'){go('./desk/');return}
 if(parsed.verb==='CURRENT'){go('./control/');return}
 if(parsed.verb==='ROOT'){const root=routeFor('/');if(root)holdRoute(root);else go('./');return}
 if(parsed.verb==='CAPTURE'){filterOperation('capture');return}
 if(parsed.verb==='TRANSFORM'){filterOperation('transform');return}
 const r=results[selected]||exactOrBest(parsed);
 if(r){holdRoute(r);return}
 if(parsed.kind==='ROUTE'&&parsed.route)go('.'+parsed.route);
 else{renderResults(parsed);input?.focus()}
}
function onInput(){
 const input=$('fieldAddressInput');if(!input)return;
 typing=true;selected=0;const parsed=parseFieldAddress(input.value);syncGlyph(parsed);renderResults(parsed);
}
function onKey(e){
 const input=$('fieldAddressInput');if(!input)return;
 if(e.key==='Escape'){e.preventDefault();typing=false;closeResults();syncInput(true);input.blur();return}
 if(e.key==='ArrowDown'&&results.length){e.preventDefault();selected=(selected+1)%results.length;paintSelection();return}
 if(e.key==='ArrowUp'&&results.length){e.preventDefault();selected=(selected-1+results.length)%results.length;paintSelection();return}
 if(e.key==='Tab'&&results.length){e.preventDefault();const r=results[selected];if(r){input.value=r.href;onInput();input.select()}return}
 if(e.key==='Enter'){e.preventDefault();typing=false;execute(parseFieldAddress(input.value))}
}
async function loadRoutes(){
 try{
  const res=await fetch('./showcase-manifest.json',{headers:{Accept:'application/json'}});if(!res.ok)throw new Error('manifest '+res.status);
  const data=await res.json();routes=(data.routes||data.entries||[]).filter(r=>r&&r.href);byHref=new Map(routes.map(r=>[routeOnly(r.href),r]));ready=true;syncInput(true);
 }catch(error){document.documentElement.dataset.fieldAddress='manifest-error';console.error('FIELD address manifest unavailable',error)}
}
function bindGlobalKeys(){
 document.addEventListener('keydown',e=>{
  const target=e.target,tag=target?.tagName?.toLowerCase?.(),typingTarget=target?.isContentEditable||tag==='input'||tag==='textarea'||tag==='select';
  if((e.key==='/'&&!typingTarget)||((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k')){
   e.preventDefault();const input=$('fieldAddressInput');if(!input)return;typing=true;input.focus();input.select();
  }
 },true);
}
function observeFocus(){
 const ap=$('apPath');if(ap)new MutationObserver(()=>{if(!typing)syncInput(true)}).observe(ap,{childList:true,subtree:true,characterData:true});
 window.addEventListener('popstate',()=>{typing=false;syncInput(true)});
 window.addEventListener('field-zui',()=>syncGlyph(parseFieldAddress($('fieldAddressInput')?.value||'')));
}
function boot(){
 installStyle();if(!install())return;
 const input=$('fieldAddressInput');input.addEventListener('input',onInput);input.addEventListener('keydown',onKey);input.addEventListener('focus',()=>{typing=true;syncGlyph(parseFieldAddress(input.value))});input.addEventListener('blur',()=>setTimeout(()=>{if(document.activeElement?.closest?.('#fieldAddressResults'))return;typing=false;closeResults();syncInput(true)},100));
 bindGlobalKeys();observeFocus();loadRoutes();syncInput(true);
 document.documentElement.dataset.fieldAddress='ready';
}

document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
window.FieldAddressLine=Object.freeze({authority:'NONE',focus:()=>focusFromHost(),parse:parseFieldAddress,rank:(q,n)=>rankFieldRoutes(routes,q,n),ready:()=>ready});
}
