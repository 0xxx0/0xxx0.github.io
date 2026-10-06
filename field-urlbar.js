import {parseFieldAddress,resolveFieldRoutes,declaredFieldMoves,formatFieldAddress,VERB_GLYPH,addressLaw} from './lib/field-address.mjs';

const ROOT_PATH='/';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const text=v=>String(v??'').replace(/\s+/g,' ').trim();
const $=id=>document.getElementById(id);
const inputTarget=t=>{const tag=t?.tagName?.toLowerCase?.();return !!(t?.isContentEditable||tag==='input'||tag==='textarea'||tag==='select')};
let dock,form,input,glyph,results,status,active=-1,rows=[],observer,editing=false;

function routeMap(){return window.__fieldRouteMap}
function routes(){try{return routeMap()?.all?.()||[]}catch(_){return[]}}
function currentHref(){
  try{return window.__fieldAct?.focusHref?.()||new URLSearchParams(location.search).get('focus')||'/'}catch(_){return'/'}
}
function currentRoute(){const href=currentHref();try{return routeMap()?.get?.(href)||null}catch(_){return null}}
function routeGlyph(route,size=24){
  try{return window.FieldGlyph?.svg?.(route,{size})||'<span class="fieldURLFallback">◇</span>'}catch(_){return'<span class="fieldURLFallback">◇</span>'}
}
function commandLabel(verb){return VERB_GLYPH[verb]+' '+verb}

function installStyle(){
  if($('fieldURLStyle'))return;
  const s=document.createElement('style');s.id='fieldURLStyle';s.textContent=`
/* FIELD URLBAR — executable address, not a second command surface.
   The root URL/?focus remains identity. Existing RUN/TRACE/RETURN remain the acting hand. */
.runDock.fieldURLDock{grid-template-columns:minmax(0,1fr) auto;gap:5px 7px;padding:6px 7px}
.runDock.fieldURLDock .runDockHold{display:none!important}
.fieldURLBar{grid-column:1;min-width:0;display:grid;grid-template-columns:36px minmax(0,1fr) auto;align-items:stretch;border:1px solid #3b484e;background:#070a0c;position:relative;height:38px}
.fieldURLVerb{border:0;border-right:1px solid #303b40;background:#0b0f11;color:var(--gold);font:800 18px/1 ui-monospace,monospace;min-width:36px;padding:0;display:grid;place-items:center}
.fieldURLVerb:hover,.fieldURLVerb[aria-expanded="true"]{background:#13191c;color:var(--ink)}
.fieldURLInput{width:100%;min-width:0;border:0!important;background:transparent!important;color:var(--ink)!important;outline:0!important;padding:7px 9px;font:700 11px/1.15 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;caret-color:var(--hot)}
.fieldURLInput::placeholder{color:#536168;font-weight:500}.fieldURLInput::selection{background:var(--hot);color:#080b0d}
.fieldURLState{display:flex;align-items:center;padding:0 7px;border-left:1px solid #273136;color:var(--mut);font-size:6px;letter-spacing:.08em;white-space:nowrap}
.fieldURLResults{position:absolute;left:-1px;right:-1px;bottom:calc(100% + 5px);z-index:10001;border:1px solid #3b484e;background:#080b0d;box-shadow:0 12px 34px rgba(0,0,0,.46);max-height:min(58vh,440px);overflow:auto}
.fieldURLResults[hidden]{display:none!important}.fieldURLRow{width:100%;border:0;border-bottom:1px solid #20292e;background:#080b0d;display:grid;grid-template-columns:34px minmax(0,1fr) auto;gap:7px;align-items:center;text-align:left;padding:5px 7px;min-height:43px;color:var(--ink)}
.fieldURLRow:last-child{border-bottom:0}.fieldURLRow:hover,.fieldURLRow.on{background:#11181c;box-shadow:inset 2px 0 0 var(--hot)}.fieldURLRow.command{grid-template-columns:34px minmax(0,1fr) auto}.fieldURLMark{width:28px;height:28px;display:grid;place-items:center;color:var(--gold);font:800 16px/1 ui-monospace,monospace}.fieldURLMark svg{display:block;max-width:28px;max-height:28px}
.fieldURLMain{min-width:0}.fieldURLMain b{display:block;font:750 10px/1.1 system-ui,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fieldURLMain code{display:block;margin-top:2px;color:var(--cool);font:6.5px/1.2 ui-monospace,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fieldURLMeta{color:var(--mut);font-size:6px;letter-spacing:.06em;text-align:right;white-space:nowrap}.fieldURLMeta.hot{color:var(--hot)}
.fieldURLLaw{border-top:1px solid #303a3f;padding:5px 7px;display:flex;gap:8px;justify-content:space-between;color:#647178;font-size:5.8px;letter-spacing:.05em}.fieldURLLaw b{color:var(--gold);font-weight:600}.fieldURLFallback{font-size:16px;color:var(--gold)}
.runDock.fieldURLDock .runDockActions{grid-column:2;grid-row:1}.runDock.fieldURLDock .runDockActions a,.runDock.fieldURLDock .runDockActions button{min-height:38px;padding:5px 8px}.runDock.fieldURLDock .runDockRead{grid-column:1/-1;grid-row:2;padding-top:3px}
.runDock.fieldURLDock .runDockActions .turn::first-letter{color:var(--hot)}
html[data-theme="light"] .fieldURLBar,html[data-theme="light"] .fieldURLResults,html[data-theme="light"] .fieldURLRow{background:#fbf9f3}.fieldURLRow:hover{background:#11181c}html[data-theme="light"] .fieldURLRow:hover,html[data-theme="light"] .fieldURLRow.on{background:#efece1}html[data-theme="light"] .fieldURLVerb{background:#f7f4ec}
@media(max-width:760px){body.runDockOn{padding-bottom:118px}.runDock.fieldURLDock{grid-template-columns:1fr;padding:5px}.fieldURLBar{grid-column:1;grid-row:1;height:46px;grid-template-columns:42px minmax(0,1fr) auto}.fieldURLVerb{min-width:42px;font-size:21px}.fieldURLInput{font-size:13px;padding:8px}.fieldURLState{font-size:7px;padding:0 6px}.runDock.fieldURLDock .runDockActions{grid-column:1;grid-row:2;display:grid;grid-template-columns:minmax(0,1fr) 72px 72px}.runDock.fieldURLDock .runDockActions a,.runDock.fieldURLDock .runDockActions button{min-height:38px;font-size:8px}.runDock.fieldURLDock .runDockRead{grid-row:3;font-size:6.5px}.fieldURLResults{max-height:52vh}.fieldURLRow{min-height:48px;padding:6px 7px}.fieldURLMain b{font-size:11px}.fieldURLMain code,.fieldURLMeta{font-size:7px}.fieldURLLaw{font-size:6.5px}}
@media(prefers-reduced-motion:reduce){.fieldURLResults{scroll-behavior:auto}}
`;
  document.head.appendChild(s);
}

function syncActionGlyphs(){
  const turn=$('runDockTurn'),trace=$('runDockTrace'),ret=$('runDockReturn');
  if(turn){const raw=text(turn.textContent).replace(/^→\s*/, '')||'TURN';const next='→ '+raw;if(turn.textContent!==next)turn.textContent=next}
  if(trace&&trace.textContent!=='⋯ TRACE')trace.textContent='⋯ TRACE';
  if(ret&&ret.textContent!=='↩ RETURN')ret.textContent='↩ RETURN';
}

function setInputFromFocus(force=false){
  if(!input||(!force&&editing))return;
  const href=currentHref();input.value=href||'/';glyph.textContent=VERB_GLYPH.HOLD;status.textContent='φ '+routes().length;
}

function commandRows(route){
  if(!route)return[];
  const href=route.href||currentHref();
  const out=[
    {kind:'command',verb:'HOLD',route,title:'HOLD',sub:'address without leaving FIELD'},
    {kind:'command',verb:'TURN',route,title:text($('runDockTurn')?.textContent).replace(/^→\s*/,'')||route.operation||'TURN',sub:'existing host-native move'},
    {kind:'command',verb:'TRACE',route,title:'TRACE',sub:'inspect witness / proof'},
    {kind:'command',verb:'RETURN',route,title:'RETURN',sub:'re-enter exact addressed object'}
  ];
  const native=declaredFieldMoves(route);
  if(native.length){out[1].sub=native.map(x=>x.label).slice(0,3).join(' · ')+' · ≤3 declared'}
  return out.map(x=>({...x,href}));
}

function routeRows(query,verb){
  const xs=resolveFieldRoutes(routes(),query||currentHref(),{limit:8});
  return xs.map(route=>({kind:'route',verb:verb||'HOLD',route,href:route.href,title:route.title||route.href,sub:[route.operation,route.state].filter(Boolean).join(' · ')}));
}

function buildRows(){
  const parsed=parseFieldAddress(input.value,currentHref());
  glyph.textContent=parsed.glyph;
  const same=text(parsed.query)===text(currentHref());
  if(parsed.explicitVerb){
    if(!parsed.query||same){
      const r=currentRoute();return r?[{kind:'command',verb:parsed.verb,route:r,href:r.href,title:parsed.verb,sub:commandRows(r).find(x=>x.verb===parsed.verb)?.sub||'existing FIELD operation'}]:[];
    }
    return routeRows(parsed.query,parsed.verb);
  }
  if(!text(input.value)||same)return commandRows(currentRoute());
  return routeRows(parsed.query,'HOLD');
}

function rowHTML(row,index){
  const command=row.kind==='command',mark=command?`<span>${esc(VERB_GLYPH[row.verb]||'◎')}</span>`:routeGlyph(row.route,26);
  const meta=command?(row.verb==='HOLD'?'FOCUS':'AUTH NONE'):[row.route?.kind,row.route?.state].filter(Boolean).join(' · ');
  return `<button type="button" class="fieldURLRow${command?' command':''}${index===active?' on':''}" data-field-url-index="${index}" role="option" aria-selected="${index===active?'true':'false'}"><span class="fieldURLMark">${mark}</span><span class="fieldURLMain"><b>${esc(row.title)}</b><code>${esc(row.href||'/')} · ${esc(row.sub||'')}</code></span><span class="fieldURLMeta${row.verb==='TURN'?' hot':''}">${esc(meta)}</span></button>`;
}

function renderResults({open=true}={}){
  if(!results)return;
  rows=buildRows();if(active>=rows.length)active=rows.length-1;if(active<0&&rows.length)active=0;
  const law=addressLaw();
  results.innerHTML=rows.map(rowHTML).join('')+`<div class="fieldURLLaw"><span><b>φ ADDRESS</b> · ${esc(law.authority)}</span><span>◎ hold · → turn · ⋯ trace · ↩ return</span></div>`;
  results.hidden=!open||!rows.length;glyph.setAttribute('aria-expanded',String(!results.hidden));
  results.querySelectorAll('[data-field-url-index]').forEach(el=>el.onclick=()=>executeRow(Number(el.dataset.fieldUrlIndex)));
  const on=results.querySelector('.fieldURLRow.on');on?.scrollIntoView?.({block:'nearest'});
}

function focusRoute(href){
  try{return window.__fieldAct?.focus?.(href)||null}catch(_){return null}
}
function clickAfterFocus(id,href){
  focusRoute(href);
  requestAnimationFrame(()=>requestAnimationFrame(()=>$(id)?.click()));
}
function execute(row){
  if(!row?.href)return;
  const href=row.href,verb=row.verb||'HOLD';
  results.hidden=true;glyph.setAttribute('aria-expanded','false');editing=false;
  if(verb==='HOLD'){
    focusRoute(href);input.value=href;input.blur();return;
  }
  if(verb==='TURN'){input.value=formatFieldAddress('TURN',href);clickAfterFocus('runDockTurn',href);return}
  if(verb==='TRACE'){input.value=formatFieldAddress('TRACE',href);clickAfterFocus('runDockTrace',href);return}
  if(verb==='RETURN'){input.value=formatFieldAddress('RETURN',href);clickAfterFocus('runDockReturn',href)}
}
function executeRow(i){const row=rows[i];if(row)execute(row)}

function submit(){
  const parsed=parseFieldAddress(input.value,currentHref()),matched=resolveFieldRoutes(routes(),parsed.query||currentHref(),{limit:1})[0];
  const route=matched||(parsed.query===currentHref()?currentRoute():null);
  if(!route){status.textContent='NO ADDRESS';renderResults({open:true});return}
  execute({kind:'command',verb:parsed.verb,route,href:route.href,title:parsed.verb});
}

function onKey(e){
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){
    e.preventDefault();if(results.hidden)renderResults({open:true});
    if(rows.length){active=(active+(e.key==='ArrowDown'?1:-1)+rows.length)%rows.length;renderResults({open:true})}return;
  }
  if(e.key==='Enter'){e.preventDefault();if(!results.hidden&&rows[active])executeRow(active);else submit();return}
  if(e.key==='Escape'){
    e.preventDefault();results.hidden=true;glyph.setAttribute('aria-expanded','false');editing=false;setInputFromFocus(true);input.blur();return;
  }
  if(e.key==='Tab'&&!results.hidden&&rows[active]){
    e.preventDefault();const row=rows[active];input.value=formatFieldAddress(row.verb,row.href);input.setSelectionRange(input.value.length,input.value.length);renderResults({open:true});
  }
}

function openGlyphMenu(){
  const href=currentHref();input.value=href;active=0;editing=true;renderResults({open:true});input.focus();
}

function mount(){
  if(location.pathname!==ROOT_PATH||$('fieldURLInput'))return true;
  dock=$('runDock');if(!dock||!window.__fieldAct||!routeMap()?.all?.().length)return false;
  installStyle();dock.classList.add('fieldURLDock');
  const hold=dock.querySelector('.runDockHold');
  form=document.createElement('form');form.className='fieldURLBar';form.id='fieldURLBar';form.setAttribute('role','search');form.setAttribute('aria-label','FIELD executable address');
  form.innerHTML=`<button class="fieldURLVerb" id="fieldURLVerb" type="button" aria-label="Show address operations" aria-expanded="false">◎</button><input class="fieldURLInput" id="fieldURLInput" type="text" inputmode="search" autocomplete="off" autocapitalize="off" spellcheck="false" aria-autocomplete="list" aria-controls="fieldURLResults" placeholder="/route · → turn · ⋯ trace · ↩ return"><span class="fieldURLState" id="fieldURLState">φ</span><div class="fieldURLResults" id="fieldURLResults" role="listbox" hidden></div>`;
  hold.before(form);input=$('fieldURLInput');glyph=$('fieldURLVerb');results=$('fieldURLResults');status=$('fieldURLState');
  form.onsubmit=e=>{e.preventDefault();submit()};
  input.onfocus=()=>{editing=true;active=0;renderResults({open:true})};
  input.oninput=()=>{editing=true;active=0;renderResults({open:true})};
  input.onkeydown=onKey;
  input.onblur=()=>setTimeout(()=>{if(!dock?.contains(document.activeElement)){editing=false;results.hidden=true;glyph.setAttribute('aria-expanded','false');setInputFromFocus(true)}},100);
  glyph.onclick=openGlyphMenu;
  syncActionGlyphs();setInputFromFocus(true);

  window.addEventListener('field-index:state',()=>{syncActionGlyphs();setInputFromFocus();if(!results.hidden)renderResults({open:true})});
  window.addEventListener('popstate',()=>{setInputFromFocus(true);if(!results.hidden)renderResults({open:true})});
  observer=new MutationObserver(()=>{syncActionGlyphs();setInputFromFocus()});
  const p=$('runDockPath');if(p)observer.observe(p,{childList:true,characterData:true,subtree:true});
  document.addEventListener('keydown',e=>{
    if(e.defaultPrevented||e.metaKey||e.ctrlKey||e.altKey||inputTarget(e.target))return;
    if(e.key==='/'){e.preventDefault();editing=true;input.focus();input.select();renderResults({open:true});return}
    if(['→','⋯','…','↩'].includes(e.key)){
      e.preventDefault();input.value=e.key+' '+currentHref();editing=true;input.focus();input.setSelectionRange(input.value.length,input.value.length);renderResults({open:true});
    }
  });
  document.documentElement.dataset.fieldURLBar='ready';
  return true;
}

function boot(){
  if(mount())return;let tries=0;const timer=setInterval(()=>{if(mount()||++tries>120)clearInterval(timer)},50);
}

document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
window.FieldURLBar=Object.freeze({parse:parseFieldAddress,resolve:q=>resolveFieldRoutes(routes(),q),law:addressLaw,focus:()=>input?.focus(),state:()=>({href:currentHref(),editing,rows:rows.length,ready:!!input})});
