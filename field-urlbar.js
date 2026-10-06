(function(root,factory){
'use strict';
const api=factory();
if(typeof module==='object'&&module.exports)module.exports=api;
if(root)root.FieldURLBarCore=api;
if(root?.document&&root?.location?.pathname==='/')api.boot(root);
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';

/*
 FIELD URLBAR v0.1

 The TUI is the URL bar. One line projects the existing FIELD object graph into
 keyboard-addressable HOLD / TURN / TRACE / RETURN work. It is not a new store,
 planner, queue, shell or authority surface.

 Grammar
   words       fuzzy FIELD address / title / state / operation / glyph mnemonic
   /path       exact-address-biased search
   @ words     CURRENT heads only
   > words     TURN / open one selected route (navigation only)
   ! words     copy safe local Hermes PREP command; never --execute
   ^           rise one structural depth
   : command   existing FIELD command / projection

 URL state lives in ?fi=. Existing FIELD sync preserves unknown query keys, so
 the input itself is a shareable/re-enterable projection while canonical state
 remains showcase-manifest + CURRENT + native hosts.
*/

const VERSION='field-urlbar/v0.1';
const MODES=Object.freeze({SEARCH:'SEARCH',HEADS:'HEADS',TURN:'TURN',HERMES:'HERMES',RISE:'RISE',COMMAND:'COMMAND'});
const MODE_META=Object.freeze({
 SEARCH:{sigil:'位',ascii:'/',label:'ADDRESS'},
 HEADS:{sigil:'中',ascii:'@',label:'HEADS'},
 TURN:{sigil:'行',ascii:'>',label:'TURN'},
 HERMES:{sigil:'器',ascii:'!',label:'HERMES PREP'},
 RISE:{sigil:'上',ascii:'^',label:'RISE'},
 COMMAND:{sigil:'令',ascii:':',label:'COMMAND'}
});
const COMMANDS=Object.freeze([
 {id:'hold',glyph:'中',label:'HOLD',hint:'collapse to held object',keywords:'focus close zui'},
 {id:'work',glyph:'工',label:'WORK',hint:'recover held work depth',keywords:'depth zui'},
 {id:'prove',glyph:'驗',label:'PROVE',hint:'open refine / proof depth',keywords:'verify test compare zui'},
 {id:'trace',glyph:'跡',label:'TRACE',hint:'open focus-bound policy trace',keywords:'evidence verify'},
 {id:'map',glyph:'圖',label:'MAP',hint:'visual projection; same focus',keywords:'visual structure graph'},
 {id:'recent',glyph:'時',label:'RECENT',hint:'explicit chronology projection',keywords:'latest time history'},
 {id:'heads',glyph:'中',label:'HEADS',hint:'CURRENT head address set',keywords:'now attention current'},
 {id:'desk',glyph:'工',label:'DESK',hint:'work desk',keywords:'workspace hermes desktop'},
 {id:'returns',glyph:'回',label:'RETURNS',hint:'durable evidence / re-entry',keywords:'receipts return evidence'},
 {id:'copy',glyph:'收',label:'COPY',hint:'copy existing held action',keywords:'clipboard action'},
 {id:'fovea',glyph:'◎',label:'FOVEA',hint:'toggle local detail lens',keywords:'lens projection'},
 {id:'theme',glyph:'◐',label:'THEME',hint:'toggle light / dark',keywords:'appearance'}
]);

const text=v=>String(v??'').replace(/\s+/g,' ').trim();
const norm=v=>text(v).toLocaleLowerCase();
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const uniq=xs=>[...new Set(xs.filter(Boolean))];

function parse(raw=''){
 const source=String(raw??''),trimmed=source.trimStart();
 if(!trimmed)return Object.freeze({raw:source,mode:MODES.SEARCH,query:'',prefix:''});
 const c=trimmed[0];
 const map={'@':MODES.HEADS,'>':MODES.TURN,'!':MODES.HERMES,'^':MODES.RISE,':':MODES.COMMAND};
 const mode=map[c]||MODES.SEARCH;
 return Object.freeze({raw:source,mode,query:mode===MODES.SEARCH?trimmed:text(trimmed.slice(1)),prefix:mode===MODES.SEARCH?'':c});
}

function subsequenceScore(needle,haystack){
 if(!needle)return 0;
 let j=0,gaps=0,last=-1;
 for(let i=0;i<haystack.length&&j<needle.length;i++)if(haystack[i]===needle[j]){if(last>=0)gaps+=Math.max(0,i-last-1);last=i;j++}
 return j===needle.length?Math.max(1,120-gaps*3-haystack.length*.15):-Infinity;
}
function evidenceScore(q,value,{weight=1}={}){
 const v=norm(value);if(!q||!v)return -Infinity;
 if(v===q)return 10000*weight;
 if(v.startsWith(q))return (6000-Math.min(500,v.length-q.length))*weight;
 const words=v.split(/[^\p{L}\p{N}_/.-]+/u).filter(Boolean);
 if(words.some(w=>w===q))return 4800*weight;
 const wi=words.findIndex(w=>w.startsWith(q));if(wi>=0)return (3800-wi*40)*weight;
 const pos=v.indexOf(q);if(pos>=0)return (2500-Math.min(1200,pos*20))*weight;
 const fuzzy=subsequenceScore(q,v);return Number.isFinite(fuzzy)?fuzzy*weight:-Infinity;
}
function routeTerms(route,mnemonic=''){
 return [
  {v:route?.href,w:1.55},{v:route?.title,w:1.35},{v:mnemonic,w:1.5},
  {v:route?.operation,w:1.05},{v:route?.kind,w:.85},{v:route?.state,w:.8},
  {v:route?.role,w:.7},{v:route?.parent,w:.55},
  ...((route?.index?.work_modes||[]).map(v=>({v,w:.65})))
 ];
}
function scoreRoute(route,parsed,ctx={}){
 if(!route?.href)return -Infinity;
 if(parsed.mode===MODES.HEADS&&ctx.heads&&!ctx.heads.has(route.href))return -Infinity;
 const q=norm(parsed.query);
 if(!q)return ctx.focus===route.href?20000:100;
 const mnemonic=ctx.mnemonic?ctx.mnemonic(route):'';
 let best=-Infinity;
 for(const t of routeTerms(route,mnemonic))best=Math.max(best,evidenceScore(q,t.v,{weight:t.w}));
 // Slash input means the operator is addressing, not free-text searching.
 if(q.startsWith('/')&&norm(route.href)===q)best+=9000;
 if(q.startsWith('/')&&norm(route.href).startsWith(q))best+=1800;
 return best;
}
function rank(routes,parsed,ctx={},limit=9){
 const xs=(routes||[]).map((route,index)=>({route,index,score:scoreRoute(route,parsed,ctx)})).filter(x=>Number.isFinite(x.score));
 if(!text(parsed.query)){
  // Empty input is orientation, not recommendation. Held object first, then CURRENT
  // heads alphabetically so recorded CURRENT order cannot masquerade as priority.
  return xs.sort((a,b)=>{
   const af=a.route.href===ctx.focus?-1:0,bf=b.route.href===ctx.focus?-1:0;if(af!==bf)return af-bf;
   const ah=ctx.heads?.has(a.route.href)?0:1,bh=ctx.heads?.has(b.route.href)?0:1;if(ah!==bh)return ah-bh;
   return String(a.route.title||a.route.href).localeCompare(String(b.route.title||b.route.href));
  }).slice(0,limit).map(x=>x.route);
 }
 return xs.sort((a,b)=>b.score-a.score||String(a.route.href).localeCompare(String(b.route.href))).slice(0,limit).map(x=>x.route);
}
function rankCommands(query='',limit=9){
 const q=norm(query);
 return COMMANDS.map((command,index)=>{
  const hay=[command.id,command.label,command.glyph,command.keywords,command.hint].join(' ');
  const score=q?evidenceScore(q,hay,{weight:1}):100-index;
  return{command,index,score};
 }).filter(x=>Number.isFinite(x.score)).sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,limit).map(x=>x.command);
}
function shellQuote(value){return "'"+String(value??'').replace(/'/g,"'\\''")+"'"}
function hermesPrepare(routeOrHref){
 const href=typeof routeOrHref==='string'?routeOrHref:routeOrHref?.href;
 if(!text(href))throw new Error('FIELD_URLBAR_HERMES_SOURCE_REQUIRED');
 return 'node tools/field-hermes-run.mjs --source '+shellQuote(href);
}

function boot(win){
 if(win.__fieldURLBarBooted||win.location.pathname!=='/')return;win.__fieldURLBarBooted=true;
 const doc=win.document,main=doc.querySelector('main'),header=main?.querySelector(':scope > header');if(!main||!header)return;
 let routes=[],heads=new Set(),selected=0,results=[],currentParsed=parse(''),focusHref=null,flashTimer=0;
 const routeMap=()=>new Map(routes.map(r=>[r.href,r]));
 const glyphMnemonic=r=>win.FieldGlyph?.mnemonic?.(r)||'';
 const existing=new URLSearchParams(win.location.search).get('fi')||'';

 const style=doc.createElement('style');style.id='field-urlbar-style';style.textContent=`
.fieldUrlBar{position:sticky;top:max(0px,env(safe-area-inset-top));z-index:70;margin:7px 0 9px;background:color-mix(in srgb,var(--bg) 94%,transparent);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
.fieldUrlFrame{height:42px;display:grid;grid-template-columns:auto 30px minmax(0,1fr) auto;align-items:center;border:1px solid var(--line);background:var(--p);box-shadow:inset 3px 0 0 var(--cool)}
.fieldUrlProto{padding:0 8px;font-size:8px;letter-spacing:.12em;color:var(--cool);white-space:nowrap}.fieldUrlGlyph{width:30px;height:30px;display:grid;place-items:center;overflow:hidden}.fieldUrlGlyph svg{width:28px!important;height:28px!important}.fieldUrlInput{height:40px;width:100%;min-width:0;border:0!important;outline:0;background:transparent!important;padding:0 8px!important;font:700 12px/1.1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.01em}.fieldUrlInput::placeholder{color:#566268}.fieldUrlMode{height:100%;display:flex;align-items:center;gap:6px;padding:0 8px;border-left:1px solid var(--line);white-space:nowrap}.fieldUrlMode b{font:800 15px/1 system-ui,sans-serif;color:var(--gold)}.fieldUrlMode span{font-size:6px;letter-spacing:.12em;color:var(--mut)}
.fieldUrlPanel{position:absolute;left:0;right:0;top:100%;border:1px solid var(--line);border-top:0;background:var(--p);box-shadow:0 14px 35px rgba(0,0,0,.45);max-height:min(56vh,460px);overflow:auto}.fieldUrlRow{width:100%;display:grid;grid-template-columns:34px minmax(0,1fr) auto;gap:7px;align-items:center;text-align:left;border:0;border-bottom:1px solid #20282c;background:var(--p);padding:6px 8px;min-height:42px}.fieldUrlRow:last-child{border-bottom:0}.fieldUrlRow[aria-selected="true"],.fieldUrlRow:hover{background:var(--p2);box-shadow:inset 2px 0 0 var(--hot)}.fieldUrlMark{width:30px;height:30px;display:grid;place-items:center;font:800 17px/1 system-ui,sans-serif;color:var(--gold)}.fieldUrlMark svg{width:28px!important;height:28px!important}.fieldUrlBody{min-width:0}.fieldUrlBody b{display:block;font:750 11px/1.15 system-ui,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fieldUrlBody code{display:block;margin-top:2px;color:var(--cool);font:7px/1.25 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fieldUrlTail{text-align:right;color:var(--mut);font-size:6px;line-height:1.25;max-width:18ch}.fieldUrlTail b{display:block;color:var(--ink);font-size:7px}.fieldUrlStatus{display:flex;justify-content:space-between;gap:8px;padding:5px 8px;background:#080b0d;color:var(--mut);font-size:6px;letter-spacing:.06em}.fieldUrlStatus b{color:var(--gold)}
html[data-theme="light"] .fieldUrlBar{background:color-mix(in srgb,var(--bg) 94%,transparent)}html[data-theme="light"] .fieldUrlFrame,html[data-theme="light"] .fieldUrlPanel,html[data-theme="light"] .fieldUrlRow{background:#fbf9f3}html[data-theme="light"] .fieldUrlRow[aria-selected="true"],html[data-theme="light"] .fieldUrlRow:hover{background:#efece1}html[data-theme="light"] .fieldUrlStatus{background:#f7f4ec}html[data-theme="light"] .fieldUrlRow{border-color:#e2dccd}
@media(max-width:760px){.fieldUrlBar{margin:5px 0 8px}.fieldUrlFrame{height:48px;grid-template-columns:auto 34px minmax(0,1fr) auto}.fieldUrlProto{padding:0 6px;font-size:8px}.fieldUrlInput{font-size:16px;height:46px;padding:0 6px!important}.fieldUrlMode{padding:0 6px}.fieldUrlMode span{display:none}.fieldUrlMode b{font-size:17px}.fieldUrlPanel{max-height:58vh}.fieldUrlRow{min-height:52px;padding:8px}.fieldUrlBody b{font-size:14px}.fieldUrlBody code{font-size:10px}.fieldUrlTail{font-size:9px}.fieldUrlTail b{font-size:10px}.fieldUrlStatus{font-size:9px;line-height:1.35}.fieldUrlStatus span:last-child{display:none}}
@media(prefers-reduced-motion:reduce){.fieldUrlBar *{scroll-behavior:auto!important}}
 `;doc.head.appendChild(style);

 const shell=doc.createElement('section');shell.className='fieldUrlBar';shell.id='fieldUrlBar';shell.setAttribute('aria-label','FIELD URL bar');shell.innerHTML=`
 <div class="fieldUrlFrame">
  <span class="fieldUrlProto">FIELD://</span>
  <span class="fieldUrlGlyph" id="fieldUrlGlyph" aria-hidden="true">Φ</span>
  <input class="fieldUrlInput" id="fieldUrlInput" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" role="combobox" aria-autocomplete="list" aria-controls="fieldUrlPanel" aria-expanded="false" placeholder="address · glyph · command" value="${esc(existing)}">
  <span class="fieldUrlMode" id="fieldUrlMode"><b>位</b><span>ADDRESS</span></span>
 </div>
 <div class="fieldUrlPanel" id="fieldUrlPanel" role="listbox" hidden></div>`;
 header.insertAdjacentElement('afterend',shell);
 const input=doc.getElementById('fieldUrlInput'),panel=doc.getElementById('fieldUrlPanel'),modeNode=doc.getElementById('fieldUrlMode'),glyphNode=doc.getElementById('fieldUrlGlyph');

 function syncURL(raw){
  const p=new URLSearchParams(win.location.search);if(text(raw))p.set('fi',String(raw));else p.delete('fi');
  const q=p.toString();win.history.replaceState(null,'',win.location.pathname+(q?'?'+q:'')+win.location.hash);
 }
 function context(){return{heads,focus:focusHref,mnemonic:glyphMnemonic}}
 function setMode(parsed){
  const m=MODE_META[parsed.mode]||MODE_META.SEARCH;modeNode.innerHTML='<b>'+esc(m.sigil)+'</b><span>'+esc(m.label)+'</span>';
  shell.dataset.mode=parsed.mode;
 }
 function routeRow(r,i){
  const mnemonic=glyphMnemonic(r),glyph=win.FieldGlyph?.svg?.(r,{size:28,head:heads.has(r.href)})||'<span>◇</span>';
  const selectedAttr=i===selected?'true':'false';
  return '<button class="fieldUrlRow" type="button" role="option" aria-selected="'+selectedAttr+'" data-index="'+i+'" data-href="'+esc(r.href)+'"><span class="fieldUrlMark">'+glyph+'</span><span class="fieldUrlBody"><b>'+esc(r.title||r.href)+'</b><code>'+esc(r.href)+' · '+esc(mnemonic)+'</code></span><span class="fieldUrlTail"><b>'+esc(r.operation||r.kind||'—')+'</b>'+esc(r.state||'—')+(heads.has(r.href)?' · HEAD':'')+'</span></button>';
 }
 function commandRow(c,i){return '<button class="fieldUrlRow" type="button" role="option" aria-selected="'+(i===selected?'true':'false')+'" data-index="'+i+'" data-command="'+esc(c.id)+'"><span class="fieldUrlMark">'+esc(c.glyph)+'</span><span class="fieldUrlBody"><b>:'+esc(c.id)+' · '+esc(c.label)+'</b><code>'+esc(c.hint)+'</code></span><span class="fieldUrlTail"><b>COMMAND</b>authority none</span></button>'}
 function statusLine(parsed,count){
  const grammar='<b>'+esc((MODE_META[parsed.mode]||MODE_META.SEARCH).sigil)+'</b> '+esc((MODE_META[parsed.mode]||MODE_META.SEARCH).label)+' · '+count+' match'+(count===1?'':'es');
  const keys='⌃K focus · ↑↓ choose · ↵ hold · ⌘/ctrl+↵ turn · esc clear';
  return '<div class="fieldUrlStatus"><span>'+grammar+' · authority NONE</span><span>'+keys+'</span></div>';
 }
 function paint({forceOpen=false}={}){
  currentParsed=parse(input.value);setMode(currentParsed);selected=Math.max(0,selected);
  if(currentParsed.mode===MODES.RISE){results=[];panel.innerHTML='<div class="fieldUrlStatus"><span><b>上</b> RISE · one structural depth · authority NONE</span><span>↵ apply</span></div>';panel.hidden=false;input.setAttribute('aria-expanded','true');return}
  if(currentParsed.mode===MODES.COMMAND){results=rankCommands(currentParsed.query,9);if(selected>=results.length)selected=Math.max(0,results.length-1);panel.innerHTML=results.map(commandRow).join('')+statusLine(currentParsed,results.length)}
  else{results=rank(routes,currentParsed,context(),9);if(selected>=results.length)selected=Math.max(0,results.length-1);panel.innerHTML=results.map(routeRow).join('')+statusLine(currentParsed,results.length)}
  const open=forceOpen||doc.activeElement===input;panel.hidden=!open;input.setAttribute('aria-expanded',String(open));
  panel.querySelectorAll('.fieldUrlRow').forEach(row=>{
   row.addEventListener('pointerdown',e=>e.preventDefault());
   row.addEventListener('click',()=>{selected=Number(row.dataset.index)||0;applySelection(false)});
  });
  const active=panel.querySelector('[aria-selected="true"]');if(active){active.id='fieldUrlActive';input.setAttribute('aria-activedescendant','fieldUrlActive')}else input.removeAttribute('aria-activedescendant');
 }
 function currentRoute(){return currentParsed.mode===MODES.COMMAND?null:results[selected]||null}
 function flash(message){
  clearTimeout(flashTimer);const old=modeNode.innerHTML;modeNode.innerHTML='<b>✓</b><span>'+esc(message)+'</span>';flashTimer=setTimeout(()=>{modeNode.innerHTML=old},1700);
 }
 async function copy(value){
  try{await win.navigator.clipboard.writeText(value);return true}catch(_){
   try{const ta=doc.createElement('textarea');ta.value=value;ta.setAttribute('readonly','');ta.style.position='fixed';ta.style.opacity='0';doc.body.appendChild(ta);ta.select();const ok=doc.execCommand('copy');ta.remove();return ok}catch(_){return false}
  }
 }
 function clearInput(){input.value='';selected=0;syncURL('');paint({forceOpen:doc.activeElement===input})}
 function executeCommand(id){
  switch(id){
   case'hold':win.FieldZUI?.close?.('urlbar');break;
   case'work':win.FieldZUI?.open?.('WORK','urlbar');break;
   case'prove':win.FieldZUI?.open?.('PROVE','urlbar');break;
   case'trace':doc.getElementById('apTrace')?.click();break;
   case'map':win.FieldLensHost?.project?.('VISUAL');break;
   case'recent':win.FieldLensHost?.project?.('RECENT');break;
   case'heads':input.value='@ ';selected=0;syncURL(input.value);paint({forceOpen:true});return;
   case'desk':win.location.assign('/desk/');return;
   case'returns':win.location.assign('/returns/');return;
   case'copy':doc.getElementById('apCopy')?.click();break;
   case'fovea':doc.getElementById('foveaToggle')?.click();break;
   case'theme':doc.getElementById('fiTheme')?.click();break;
   default:return;
  }
  flash(id.toUpperCase());
 }
 async function applySelection(forceTurn=false){
  currentParsed=parse(input.value);
  if(currentParsed.mode===MODES.RISE){win.__fieldAct?.rise?.();flash('RISE');return}
  if(currentParsed.mode===MODES.COMMAND){const c=results[selected];if(c)executeCommand(c.id);return}
  const route=currentRoute();if(!route)return;
  if(currentParsed.mode===MODES.HERMES){
   const cmd=hermesPrepare(route);const ok=await copy(cmd);flash(ok?'HERMES PREP COPIED':'COPY FAILED');return;
  }
  if(currentParsed.mode===MODES.TURN||forceTurn){win.__fieldAct?.open?.(route.href);return}
  win.__fieldAct?.focus?.(route.href);focusHref=route.href;input.value=route.href;syncURL(input.value);selected=0;paint({forceOpen:false});input.blur();
 }
 function move(delta){if(!results.length)return;selected=(selected+delta+results.length)%results.length;paint({forceOpen:true});panel.querySelector('[aria-selected="true"]')?.scrollIntoView({block:'nearest'})}
 function focusBar(seed){input.focus();if(seed!=null){input.value=seed;input.setSelectionRange(input.value.length,input.value.length);syncURL(input.value)}selected=0;paint({forceOpen:true})}
 function syncHeld(href){
  focusHref=href||win.__fieldAct?.focusHref?.()||null;const r=focusHref&&routeMap().get(focusHref);
  glyphNode.innerHTML=r&&win.FieldGlyph?.svg?.(r,{size:28,head:heads.has(r.href)})||'Φ';glyphNode.title=r?(glyphMnemonic(r)+' · '+r.href):'FIELD';
 }
 function targetIsTyping(t){const tag=t?.tagName?.toLowerCase?.();return t?.isContentEditable||tag==='input'||tag==='textarea'||tag==='select'}

 input.addEventListener('focus',()=>paint({forceOpen:true}));
 input.addEventListener('input',()=>{selected=0;syncURL(input.value);paint({forceOpen:true})});
 input.addEventListener('keydown',e=>{
  if(e.key==='ArrowDown'){e.preventDefault();move(1);return}
  if(e.key==='ArrowUp'){e.preventDefault();move(-1);return}
  if(e.key==='Enter'){e.preventDefault();applySelection(e.ctrlKey||e.metaKey);return}
  if(e.key==='Escape'){e.preventDefault();if(input.value){clearInput();input.focus()}else{panel.hidden=true;input.setAttribute('aria-expanded','false');input.blur()}return}
 });
 input.addEventListener('blur',()=>setTimeout(()=>{if(!shell.contains(doc.activeElement)){panel.hidden=true;input.setAttribute('aria-expanded','false')}},80));
 doc.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();focusBar();return}
  if(e.key==='/'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!targetIsTyping(e.target)){e.preventDefault();focusBar('/');return}
  if(e.key===':'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!targetIsTyping(e.target)){e.preventDefault();focusBar(':');return}
 });
 win.addEventListener('field-index:state',e=>syncHeld(e.detail?.focus||null));

 Promise.all([
  fetch('./showcase-manifest.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('manifest '+r.status);return r.json()}),
  fetch('./control/CURRENT.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('current '+r.status);return r.json()})
 ]).then(([manifest,current])=>{
  routes=(manifest.routes||manifest.entries||[]).filter(r=>r?.href&&r.href!=='/');
  heads=new Set((current.current_heads||[]).map(h=>h.route).filter(Boolean));
  syncHeld(win.__fieldAct?.focusHref?.()||new URLSearchParams(win.location.search).get('focus'));
  paint({forceOpen:false});
  if(existing){selected=0;paint({forceOpen:false})}
 }).catch(err=>{
  const hostMap=win.__fieldRouteMap?.all?.();if(hostMap instanceof Map)routes=[...hostMap.values()];
  panel.innerHTML='<div class="fieldUrlStatus"><span>URLBAR SOURCE DEGRADED · '+esc(err.message)+'</span><span>authority NONE</span></div>';
 });

 win.FieldURLBar=Object.freeze({VERSION,focus:focusBar,parse:()=>parse(input.value),results:()=>results.slice(),hermesPrepare:()=>{const r=currentRoute()||routeMap().get(focusHref);return r?hermesPrepare(r):null}});
 }

return Object.freeze({VERSION,MODES,MODE_META,COMMANDS,parse,evidenceScore,scoreRoute,rank,rankCommands,shellQuote,hermesPrepare,boot});
});
