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
/* M1 · ONE REGISTRY — the union of the old field-urlbar COMMANDS and the old
 field-omnibar COMMANDS/ALIAS tables, one glyph per id. Canonical glyphs are the
 operator's mapping (ROOT ⌂ HOLD ◎ WORK ▽ PROVE ◆ OPEN ↗) plus the key strip's
 RETURN ↩ HANDOFF ⎘ HERMES ▶ as rendered today; drifted ids are reconciled as
 aliases (returns≡return, copy≡handoff). `nav`/`copy` mark plain-address route
 commands: the bar addresses, never executes (authority NONE). field-omnibar.js
 binds this table through FieldURLBarCore — there is no second copy. */
const COMMANDS=Object.freeze([
 {id:'root',glyph:'⌂',label:'ROOT',hint:'FIELD root',keywords:'index home',aliases:['home']},
 {id:'hold',glyph:'◎',label:'HOLD',hint:'address / shallow',keywords:'focus close zui'},
 {id:'work',glyph:'▽',label:'WORK',hint:'semantic depth',keywords:'depth zui'},
 {id:'prove',glyph:'◆',label:'PROVE',hint:'evidence depth',keywords:'verify test compare zui',aliases:['proof']},
 {id:'open',glyph:'↗',label:'OPEN',hint:'native surface',keywords:'open external'},
 {id:'return',glyph:'↩',label:'RETURN',hint:'durable evidence / re-entry',keywords:'receipts return evidence',aliases:['returns','back'],nav:'/returns/'},
 {id:'handoff',glyph:'⎘',label:'HANDOFF',hint:'copy action packet',keywords:'clipboard action copy',aliases:['copy']},
 {id:'run',glyph:'▶',label:'HERMES',hint:'copy local prepare command',keywords:'hermes prepare copy',aliases:['hermes']},
 {id:'trace',glyph:'⋮',label:'TRACE',hint:'focus-bound policy trace',keywords:'evidence verify witness'},
 {id:'read',glyph:'≡',label:'READ',hint:'inspect held action',keywords:'inspect read'},
 {id:'map',glyph:'⌘',label:'MAP',hint:'visual projection',keywords:'visual structure graph'},
 {id:'recent',glyph:'◴',label:'RECENT',hint:'explicit chronology projection',keywords:'latest time history'},
 {id:'up',glyph:'↑',label:'UP',hint:'rise one structural depth',keywords:'rise parent'},
 {id:'down',glyph:'↓',label:'DOWN',hint:'dive one depth',keywords:'dive child'},
 {id:'prev',glyph:'←',label:'PREV',hint:'previous peer',keywords:'peer left'},
 {id:'next',glyph:'→',label:'NEXT',hint:'next peer',keywords:'peer right'},
 {id:'heads',glyph:'中',label:'HEADS',hint:'CURRENT head address set',keywords:'now attention current'},
 {id:'desk',glyph:'工',label:'DESK',hint:'work desk',keywords:'workspace hermes desktop',nav:'/desk/'},
 {id:'reader',glyph:'☰',label:'READER',hint:'archive reader route',keywords:'archive local reader',nav:'/reader/'},
 {id:'hub',glyph:'⊞',label:'HUB',hint:'copy reader hub URL (localhost :8777)',keywords:'hub ops reader',copy:'http://127.0.0.1:8777/hub'},
 {id:'calls',glyph:'☏',label:'CALLS',hint:'copy reader calls URL (localhost :8777)',keywords:'phone meeting reader',copy:'http://127.0.0.1:8777/calls'},
 {id:'digests',glyph:'▣',label:'DIGESTS',hint:'/digests/ · passphrase field focused locally',keywords:'encrypted digest passphrase',nav:'/digests/#pp'},
 {id:'fovea',glyph:'◉',label:'FOVEA',hint:'toggle local detail lens',keywords:'lens projection'},
 {id:'theme',glyph:'◐',label:'THEME',hint:'toggle light / dark',keywords:'appearance'},
 {id:'reset',glyph:'⟲',label:'RESET',hint:'clear learned ranking + recents',keywords:'ranking frecency recents clear default order',aliases:['rerank']},
 {id:'help',glyph:'?',label:'HELP',hint:'registry + sigil legend',keywords:'help man ls registry commands'}
]);
/* One alias map + one resolver + one parser over the table: leading ':cmd args'
   and trailing 'target :cmd' (legacy omnibar style) are the SAME grammar. */
const COMMAND_ALIAS=Object.freeze((()=>{const m={};for(const c of COMMANDS){m[':'+c.id]=c.id;for(const a of c.aliases||[])m[':'+a]=c.id}return m})());
const GLYPH_COMMAND=new Map(COMMANDS.map(c=>[c.glyph,c.id]));
function resolveCommand(token){
 const raw=String(token??'').trim();if(!raw)return null;
 const bare=raw.startsWith(':')?raw.slice(1).toLowerCase():raw.toLowerCase();
 if(COMMAND_ALIAS[':'+bare])return COMMAND_ALIAS[':'+bare];
 const sym=raw.startsWith(':')?raw.slice(1):raw;
 return GLYPH_COMMAND.get(sym)||null;
}
function parseCommand(raw=''){
 const s=text(raw);
 if(!s)return Object.freeze({query:'',command:null,style:''});
 if(GLYPH_COMMAND.has(s))return Object.freeze({query:'',command:GLYPH_COMMAND.get(s),style:'glyph'});
 if(s.startsWith(':')){const id=resolveCommand(s);return Object.freeze(id?{query:'',command:id,style:'leading'}:{query:s,command:null,style:''})}
 const bits=s.split(/\s+/),last=bits[bits.length-1];
 if(last.startsWith(':')||GLYPH_COMMAND.has(last)){const id=resolveCommand(last);if(id)return Object.freeze({query:bits.slice(0,-1).join(' '),command:id,style:'trailing'})}
 return Object.freeze({query:s,command:null,style:''});
}

const text=v=>String(v??'').replace(/\s+/g,' ').trim();
const norm=v=>text(v).toLocaleLowerCase();
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const uniq=xs=>[...new Set(xs.filter(Boolean))];

function parse(raw=''){
 const source=String(raw??''),trimmed=source.trimStart();
 if(!trimmed)return Object.freeze({raw:source,mode:MODES.SEARCH,query:'',prefix:'',command:null});
 const c=trimmed[0];
 const map={'@':MODES.HEADS,'>':MODES.TURN,'!':MODES.HERMES,'^':MODES.RISE,':':MODES.COMMAND};
 const mode=map[c]||MODES.SEARCH;
 // M2 · one parser, two entry styles: leading ':cmd args' stays COMMAND mode
 // (ranked through the registry above); trailing 'target :cmd' — the legacy
 // omnibar style — resolves through the SAME registry into the same dispatcher.
 if(mode===MODES.SEARCH){
  const p=parseCommand(trimmed);
  if(p.style==='trailing')return Object.freeze({raw:source,mode:MODES.COMMAND,query:p.query,command:p.command,prefix:''});
 }
 return Object.freeze({raw:source,mode,query:mode===MODES.SEARCH?trimmed:text(trimmed.slice(1)),prefix:mode===MODES.SEARCH?'':c,command:null});
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
 // Palette learning (bounded local cache): recents order + frecency tie-break.
 const pal=ctx.palette||null,recents=pal?.recents||[],use=pal?.use||{};
 const pos=h=>{const i=recents.indexOf(h);return i<0?Number.MAX_SAFE_INTEGER:i};
 const frec=h=>{const e=use[h];if(!e)return 0;const ageDays=Math.max(0,Date.now()-(e.ts||0))/86400000;return (e.n||1)*1000000/(1+ageDays)};
 if(!text(parsed.query)){
  // Empty input is orientation, not recommendation. Held object first — the one
  // item he came for can never fall below the fold — then surfaces in USE order
  // (Obsidian quick switcher: empty query = most recent), then CURRENT heads
  // alphabetically so recorded CURRENT order cannot masquerade as priority.
  const useRecents=parsed.mode!==MODES.HEADS&&recents.length>0;
  return xs.sort((a,b)=>{
   const af=a.route.href===ctx.focus?-1:0,bf=b.route.href===ctx.focus?-1:0;if(af!==bf)return af-bf;
   if(useRecents){const ra=pos(a.route.href),rb=pos(b.route.href);if(ra!==rb)return ra-rb}
   const ah=ctx.heads?.has(a.route.href)?0:1,bh=ctx.heads?.has(b.route.href)?0:1;if(ah!==bh)return ah-bh;
   return String(a.route.title||a.route.href).localeCompare(String(b.route.title||b.route.href));
  }).slice(0,limit).map(x=>x.route);
 }
 // Fuzzy/address evidence decides; frecency only breaks a TIE (Raycast order:
 // exact → prefix → title → keyword → frecency), then href for determinism.
 return xs.sort((a,b)=>b.score-a.score||frec(b.route.href)-frec(a.route.href)||String(a.route.href).localeCompare(String(b.route.href))).slice(0,limit).map(x=>x.route);
}
/* G2 · match highlighting — a row must show WHY it matched. Every segment is
   escaped BEFORE it is wrapped, so neither the row text nor the query can ever
   inject markup (esc() is the only path to innerHTML). */
function highlight(value,query){
 const s=String(value??''),q=norm(query);if(!q||!s)return esc(s);
 const v=s.toLocaleLowerCase();if(v.length!==s.length)return esc(s); // length-preserving lowercase only
 const runs=[];
 if(v===q)runs.push([0,s.length]);
 else{
  let at=v.indexOf(q);
  if(at>=0)while(at>=0){runs.push([at,at+q.length]);at=v.indexOf(q,at+q.length)}
  else{let j=0;const hit=[];for(let i=0;i<v.length&&j<q.length;i++)if(v[i]===q[j]){hit.push(i);j++}
       if(j===q.length)for(const i of hit)runs.push([i,i+1])}
 }
 if(!runs.length)return esc(s);
 const merged=[];
 for(const r of runs.sort((a,b)=>a[0]-b[0])){const last=merged[merged.length-1];
  if(last&&r[0]<=last[1])last[1]=Math.max(last[1],r[1]);else merged.push([r[0],r[1]])}
 let out='',pos=0;
 for(const[a,b]of merged){out+=esc(s.slice(pos,a))+'<mark>'+esc(s.slice(a,b))+'</mark>';pos=b}
 return out+esc(s.slice(pos));
}
function commandHay(c){return[c.id,c.label,c.glyph,c.keywords,c.hint,(c.aliases||[]).map(a=>':'+a).join(' ')].join(' ')}
/* G1 · command ranking — the store noteUse('cmd:'+id) writes is READ back
   here: text evidence decides the rank, frecency (frequency × recency read
   straight from the store — pure arithmetic, no clock, so one store always
   ranks the same) breaks a tie, and alphabetical order is the untouched
   default when nothing has been learned. Frecency never outranks a stronger
   text match. */
function rankCommands(query='',limit=9,pal=null){
 const q=norm(query);
 const use=(pal&&typeof pal.use==='object')?pal.use:{};
 const recents=(pal&&Array.isArray(pal.recents))?pal.recents:[];
 const frec=id=>{const key='cmd:'+id,e=use[key];if(!e||typeof e!=='object')return 0;
  const i=recents.indexOf(key);return(i<0?0:PALETTE_RECENTS-i)*1000+(Number(e.n)||1)};
 const byId=(a,b)=>String(a.id).localeCompare(String(b.id));
 const rows=COMMANDS.map(command=>({command,score:q?evidenceScore(q,commandHay(command)):0,f:frec(command.id)}))
  .filter(x=>Number.isFinite(x.score));
 // Empty query = orientation: scores are uniform, so learning (then pure
 // alphabetical order) decides — recorded use can never masquerade as rank.
 return rows.sort((a,b)=>b.score-a.score||b.f-a.f||byId(a.command,b.command)).slice(0,limit).map(x=>x.command);
}
/* G3 · a 0-match panel teaches instead of dying: the two nearest commands by
   fuzzy score (positive score only), so a typo still lands near its target. */
function nearScore(query,value){
 const q=norm(query),v=norm(value);if(!q||!v)return -Infinity;
 const exact=evidenceScore(q,v);if(Number.isFinite(exact))return exact;
 const chars=[...new Set([...q])];let hit=0;
 for(const ch of chars)if(v.includes(ch))hit++;
 return hit?hit/chars.length:-Infinity;
}
function nearestCommands(query='',limit=2){
 const q=norm(query);if(!q)return [];
 return COMMANDS.map(command=>({command,score:nearScore(q,commandHay(command))}))
  .filter(x=>x.score>0)
  .sort((a,b)=>b.score-a.score||String(a.command.id).localeCompare(String(b.command.id)))
  .slice(0,limit).map(x=>x.command);
}
function emptyHint(query,count){
 if(count>0||!text(query))return '';
 const near=nearestCommands(query,2);
 const nearTxt=near.length?' · nearest '+near.map(c=>':'+c.id).join(' '):'';
 return '<div class="fieldUrlStatus"><span>no match · :help for all commands'+esc(nearTxt)+'</span><span>esc clear</span></div>';
}
/* ===== unified command-palette layer (donor brief §2 move 2) =============
 Raycast ranking · Obsidian quick switcher · Notion ⌘K, onto the glyph grammar:
   1. exact single-letter glyph alias  (h/o/w/p/r → ⌂ ROOT ◎ HOLD ▽ WORK ◆ PROVE ↗ OPEN)
   2. fuzzy / address evidence score
   3. frecency (frequency × recency) — LAST tie-break only, never a rank of its own
 An alias NEVER outranks an exact typed path/address (falsifier: inverted intent).
 Empty query = held object, then most-recently-used surfaces, then CURRENT heads
 alphabetically; the list is bounded so the target never falls below the fold.
 Learning lives in ONE bounded local cache (localStorage, ≤8 recents) and is a
 convenience ordering layer only — authority stays NONE, canonical state stays
 showcase-manifest + CURRENT. `:reset` (Raycast "Reset Ranking") clears it. */
const PALETTE_ALIAS=Object.freeze({h:'root',o:'hold',w:'work',p:'prove',r:'open'});
const PALETTE_KEY='field.palette.v1',PALETTE_RECENTS=8,EMPTY_ROWS=5;
// Alias-row labels derive from the ONE registry — no second glyph map to drift.
const ALIAS_GLYPH=id=>{const c=COMMANDS.find(x=>x.id===id);return c?[c.glyph,c.label,c.hint]:[id,'›',String(id).toUpperCase()]};
function aliasMap(){
 // One grammar, one map: the omnibar owns the glyph keys, so prefer its table
 // and fall back to the identical copy here when the omnibar is not mounted.
 try{if(typeof window!=='undefined'){const a=window.FieldOmnibar?.aliases;if(a&&typeof a==='object')return a}}catch(_){}
 return PALETTE_ALIAS;
}
function aliasId(query,routes){
 const q=String(query??'').trim();
 if(q.length!==1)return null;
 const map=aliasMap();
 const id=map[q]||map[q.toLowerCase()];
 if(!id)return null;
 // FALSIFIER — an exact typed path/address must never lose to an alias.
 if(q==='/'||q.startsWith('/'))return null;
 const forms=[q,'/'+q+'/',q+'/'];
 for(const r of routes||[]){const h=String(r?.href||'');if(forms.includes(h)||(h.endsWith('/')&&forms.includes(h.slice(0,-1))))return null}
 return id;
}
function aliasRow(id){const g=ALIAS_GLYPH(id);return{kind:'alias',id,glyph:g[0],label:g[1],hint:g[2]}}
/* The board is the site's own refresh-pipeline artifact (ops-hub generator,
   committed by `nexus: board refresh`). Reading its counts AND its own
   `generated … UTC` stamp from the same bytes is what makes the readout
   impossible to stale silently: the age travels with the numbers. */
function parseBoard(html){
 const s=String(html||'');
 const open=/(\d+) open · \d+ done · hermes kanban/.exec(s),stamp=/generated (\d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC)/.exec(s);
 if(!open||!stamp)return null;
 const col=k=>{const m=new RegExp('<h3>'+k+'<b>(\\d+)<\\/b>').exec(s);return m?Number(m[1]):0};
 return Object.freeze({open:Number(open[1]),blocked:col('BLOCKED'),running:col('RUNNING'),stamp:stamp[1]});
}
function stampMs(stamp){const t=Date.parse(String(stamp||'').replace(' ','T').replace(' UTC','Z'));return Number.isFinite(t)?t:0}
function ageLabel(ms){const m=Math.max(0,Math.round(ms/60000));return m<60?m+'m':m<1440?Math.round(m/60)+'h':Math.round(m/1440)+'d'}
function freshStore(){return{v:1,recents:[],use:{}}}
function shellQuote(value){return "'"+String(value??'').replace(/'/g,"'\\''")+"'"};
function hermesPrepare(routeOrHref){
 const href=typeof routeOrHref==='string'?routeOrHref:routeOrHref?.href;
 if(!text(href))throw new Error('FIELD_URLBAR_HERMES_SOURCE_REQUIRED');
 return 'node tools/field-hermes-run.mjs --source '+shellQuote(href);
}

function boot(win){
 if(win.__fieldURLBarBooted||win.location.pathname!=='/')return;win.__fieldURLBarBooted=true;
 const doc=win.document,main=doc.querySelector('main'),header=main?.querySelector(':scope > header');if(!main||!header)return;
 let routes=[],heads=new Set(),selected=0,results=[],currentParsed=parse(''),focusHref=null,flashTimer=0,helpOpen=false,moved=false;
 const routeMap=()=>new Map(routes.map(r=>[r.href,r]));
 const glyphMnemonic=r=>win.FieldGlyph?.mnemonic?.(r)||'';
 const existing=new URLSearchParams(win.location.search).get('fi')||'';

 const style=doc.createElement('style');style.id='field-urlbar-style';style.textContent=`
.fieldUrlBar{position:sticky;top:max(0px,env(safe-area-inset-top));z-index:70;margin:7px 0 9px;background:color-mix(in srgb,var(--bg) 94%,transparent);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
.fieldUrlFrame{height:42px;display:grid;grid-template-columns:auto 30px minmax(0,1fr) auto auto;align-items:center;border:1px solid var(--line);background:var(--p);box-shadow:inset 3px 0 0 var(--cool)}
.fieldUrlProto{padding:0 8px;font-size:8px;letter-spacing:.12em;color:var(--cool);white-space:nowrap}.fieldUrlGlyph{width:30px;height:30px;display:grid;place-items:center;overflow:hidden}.fieldUrlGlyph svg{width:28px!important;height:28px!important}.fieldUrlInput{height:40px;width:100%;min-width:0;border:0!important;outline:0;background:transparent!important;padding:0 8px!important;font:700 12px/1.1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.01em}.fieldUrlInput::placeholder{color:#566268}.fieldUrlMode{height:100%;display:flex;align-items:center;gap:6px;padding:0 8px;border-left:1px solid var(--line);white-space:nowrap}.fieldUrlMode b{font:800 15px/1 system-ui,sans-serif;color:var(--gold)}.fieldUrlMode span{font-size:6px;letter-spacing:.12em;color:var(--mut)}
.fieldUrlPanel{position:absolute;left:0;right:0;top:100%;border:1px solid var(--line);border-top:0;background:var(--p);box-shadow:0 14px 35px rgba(0,0,0,.45);max-height:min(56vh,460px);overflow:auto}.fieldUrlRow{width:100%;display:grid;grid-template-columns:34px minmax(0,1fr) auto;gap:7px;align-items:center;text-align:left;border:0;border-bottom:1px solid #20282c;background:var(--p);padding:6px 8px;min-height:42px}.fieldUrlRow:last-child{border-bottom:0}.fieldUrlRow[aria-selected="true"],.fieldUrlRow:hover{background:var(--p2);box-shadow:inset 2px 0 0 var(--hot)}.fieldUrlMark{width:30px;height:30px;display:grid;place-items:center;font:800 17px/1 system-ui,sans-serif;color:var(--gold)}.fieldUrlMark svg{width:28px!important;height:28px!important}.fieldUrlBody{min-width:0}.fieldUrlBody b{display:block;font:750 11px/1.15 system-ui,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fieldUrlBody code{display:block;margin-top:2px;color:var(--cool);font:7px/1.25 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fieldUrlTail{text-align:right;color:var(--mut);font-size:6px;line-height:1.25;max-width:18ch}.fieldUrlTail b{display:block;color:var(--ink);font-size:7px}.fieldUrlRow mark{background:color-mix(in srgb,var(--gold) 30%,transparent);color:var(--ink);padding:0 1px;border-radius:2px}.fieldUrlStatus{display:flex;justify-content:space-between;gap:8px;padding:5px 8px;background:#080b0d;color:var(--mut);font-size:6px;letter-spacing:.06em}.fieldUrlStatus b{color:var(--gold)}
/* status spine (donor brief §2 move 1, Dead Space RIG): one inline span on the
   SAME line — counts carry their age, labels ride on desktop, compact
   counts+age on a phone so the address input keeps its width. */
.fieldUrlSpine{display:flex;align-items:center;height:100%;padding:0 7px;border-left:1px solid var(--line);color:var(--mut);font:700 7px/1.1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.04em;white-space:nowrap;text-decoration:none;overflow:hidden;min-width:0}
.fieldUrlSpine b{color:var(--ink);font-weight:800}
.fieldUrlSpine i{font-style:normal;padding:0 2px;color:var(--mut)}
.fieldUrlSpine .lbl{color:var(--cool);font-weight:700}
.fieldUrlSpine .age{display:none;padding-left:4px;color:var(--gold)}
.fieldUrlSpine .stale{color:var(--hot)}
.fieldUrlSpine:hover,.fieldUrlSpine:focus-visible{color:var(--ink);background:var(--p2)}
html[data-theme="light"] .fieldUrlBar{background:color-mix(in srgb,var(--bg) 94%,transparent)}html[data-theme="light"] .fieldUrlFrame,html[data-theme="light"] .fieldUrlPanel,html[data-theme="light"] .fieldUrlRow{background:#fbf9f3}html[data-theme="light"] .fieldUrlRow[aria-selected="true"],html[data-theme="light"] .fieldUrlRow:hover{background:#efece1}html[data-theme="light"] .fieldUrlStatus{background:#f7f4ec}html[data-theme="light"] .fieldUrlRow{border-color:#e2dccd}
@media(max-width:760px){.fieldUrlBar{margin:5px 0 8px}.fieldUrlFrame{height:48px;grid-template-columns:auto 34px minmax(0,1fr) auto auto}.fieldUrlProto{padding:0 6px;font-size:8px}.fieldUrlInput{font-size:16px;height:46px;padding:0 6px!important}.fieldUrlMode{padding:0 6px}.fieldUrlMode span{display:none}.fieldUrlMode b{font-size:17px}.fieldUrlPanel{max-height:58vh}.fieldUrlRow{min-height:52px;padding:8px}.fieldUrlBody b{font-size:14px}.fieldUrlBody code{font-size:10px}.fieldUrlTail{font-size:9px}.fieldUrlTail b{font-size:10px}.fieldUrlStatus{font-size:9px;line-height:1.35}.fieldUrlStatus span:last-child{display:none}.fieldUrlSpine{font-size:7px;padding:0 4px;letter-spacing:0}.fieldUrlSpine i{padding:0 1px}.fieldUrlSpine .lbl{display:none}.fieldUrlSpine .age{display:inline;padding-left:0}}
@media(prefers-reduced-motion:reduce){.fieldUrlBar *{scroll-behavior:auto!important}}
 `;doc.head.appendChild(style);

 const shell=doc.createElement('section');shell.className='fieldUrlBar';shell.id='fieldUrlBar';shell.setAttribute('aria-label','FIELD URL bar');shell.innerHTML=`
 <div class="fieldUrlFrame">
  <span class="fieldUrlProto">FIELD://</span>
  <span class="fieldUrlGlyph" id="fieldUrlGlyph" aria-hidden="true">Φ</span>
  <input class="fieldUrlInput" id="fieldUrlInput" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" role="combobox" aria-autocomplete="list" aria-controls="fieldUrlPanel" aria-expanded="false" placeholder="address · glyph · command" value="${esc(existing)}">
  <span class="fieldUrlMode" id="fieldUrlMode"><b>位</b><span>ADDRESS</span></span>
  <a class="fieldUrlSpine" id="fieldUrlSpine" href="/nexus/board.html" title="status spine — board counts as of the board's own generation stamp" aria-label="status spine: board counts, click for the board"><b>·</b></a>
 </div>
 <div class="fieldUrlPanel" id="fieldUrlPanel" role="listbox" hidden></div>`;
 header.insertAdjacentElement('afterend',shell);
 const input=doc.getElementById('fieldUrlInput'),panel=doc.getElementById('fieldUrlPanel'),modeNode=doc.getElementById('fieldUrlMode'),glyphNode=doc.getElementById('fieldUrlGlyph');

 /* ---- palette learning store (bounded, local, authority NONE) ---- */
 const spine=doc.getElementById('fieldUrlSpine');
 let pal=paletteLoad(),board=null,aliasHit=null;
 function paletteLoad(){
  try{const raw=win.localStorage.getItem(PALETTE_KEY),s=raw?JSON.parse(raw):null;
   if(!s||!Array.isArray(s.recents)||typeof s.use!=='object'||s.v!==1)return freshStore();
   s.recents=s.recents.filter(x=>typeof x==='string'&&x).slice(0,PALETTE_RECENTS);return s
  }catch(_){return freshStore()}
 }
 function paletteSave(){try{win.localStorage.setItem(PALETTE_KEY,JSON.stringify(pal))}catch(_){}}
 function noteUse(key){
  if(!text(key))return;
  const t=Date.now(),e=pal.use[key]||{n:0,ts:0};
  pal.use[key]={n:Number(e.n||0)+1,ts:t};
  pal.recents=[key,...pal.recents.filter(k=>k!==key)].slice(0,PALETTE_RECENTS);
  paletteSave();
 }
 function resetLearning(){pal=freshStore();try{win.localStorage.removeItem(PALETTE_KEY)}catch(_){}}
 const learned=()=>!!(pal.recents.length||Object.keys(pal.use).length);
 /* status spine — counts + age travel together, so the readout can never be
    stale silently; a stamp older than 24h says so in words, not just colour. */
 function spineTitle(){return board
  ?'open '+board.open+' · blocked '+board.blocked+' · running '+board.running+' · as of '+board.stamp+' ('+ageLabel(Date.now()-stampMs(board.stamp))+' ago) · source /nexus/board.html'
  :'status spine: /nexus/board.html could not be read — counts unknown'}
 function paintSpine(err){
  if(!spine)return;
  if(!board){spine.innerHTML='<b>board</b><i>·</i><span class="age"> ?</span>';spine.title=spineTitle()+' · '+String(err||'');spine.setAttribute('aria-label',spineTitle());return}
  const age=Date.now()-stampMs(board.stamp),stale=age>86400000;
  spine.innerHTML='<span class="lbl">open </span><b>'+board.open+'</b><i>·</i><span class="lbl">blk </span><b>'+board.blocked+'</b><i>·</i><span class="lbl">run </span><b>'+board.running+'</b>'+
   '<span class="lbl as'+(stale?' stale':'')+'"> · as of '+esc(board.stamp.replace(/^\d{4}-/,''))+(stale?' STALE':'')+'</span>'+
   '<span class="age'+(stale?' stale':'')+'">·'+ageLabel(age)+(stale?'!':'')+'</span>';
  spine.title=spineTitle();spine.setAttribute('aria-label',spineTitle());
 }
 function loadBoard(){
  return fetch('./nexus/board.html',{cache:'no-store'})
   .then(r=>{if(!r.ok)throw Error('board '+r.status);return r.text()})
   .then(h=>{const parsed=parseBoard(h);if(!parsed)throw Error('board grammar unrecognized');board=parsed;paintSpine();return board})
   .catch(err=>{board=null;paintSpine(err&&err.message);return null});
 }
 paintSpine('loading');
 loadBoard();
 // Age is the anti-staleness stamp: re-stamp every minute, re-read the board
 // every fifth minute, so a stopped refresh pipeline shows its own grey.
 let spineTick=0;
 setInterval(()=>{if(++spineTick%5===0)loadBoard();else paintSpine()},60000);
 win.FieldPalette=Object.freeze({
  store:()=>JSON.parse(JSON.stringify(pal)),
  noteUse,
  reset:()=>{resetLearning();try{paint({forceOpen:true})}catch(_){}},
  alias:q=>aliasId(q,routes),
  spine:()=>board?Object.assign({},board,{ageMs:Date.now()-stampMs(board.stamp)}):null
 });

 function syncURL(raw){
  const p=new URLSearchParams(win.location.search);if(text(raw))p.set('fi',String(raw));else p.delete('fi');
  const q=p.toString();win.history.replaceState(null,'',win.location.pathname+(q?'?'+q:'')+win.location.hash);
 }
 function context(){return{heads,focus:focusHref,mnemonic:glyphMnemonic,palette:pal}}
 function setMode(parsed){
  const m=MODE_META[parsed.mode]||MODE_META.SEARCH;modeNode.innerHTML='<b>'+esc(m.sigil)+'</b><span>'+esc(m.label)+'</span>';
  shell.dataset.mode=parsed.mode;
 }
 function routeRow(r,i){
  const mnemonic=glyphMnemonic(r),glyph=win.FieldGlyph?.svg?.(r,{size:28,head:heads.has(r.href)})||'<span>◇</span>',q=currentParsed.query;
  const selectedAttr=i===selected?'true':'false';
  return '<button class="fieldUrlRow" type="button" role="option" aria-selected="'+selectedAttr+'" data-index="'+i+'" data-href="'+esc(r.href)+'"><span class="fieldUrlMark">'+glyph+'</span><span class="fieldUrlBody"><b>'+highlight(r.title||r.href,q)+'</b><code>'+highlight(r.href,q)+' · '+esc(mnemonic)+'</code></span><span class="fieldUrlTail"><b>'+esc(r.operation||r.kind||'—')+'</b>'+esc(r.state||'—')+(heads.has(r.href)?' · HEAD':'')+'</span></button>';
 }
 function commandRow(c,i){
  // M6 — the row carries id, glyph, hint, aliases and where a route command
  // points, so the palette AND :help render from the same markup.
  const q=currentParsed.query;
  const al=c.aliases&&c.aliases.length?' · = '+c.aliases.map(a=>':'+a).join(' '):'';
  const dest=c.nav?' · → '+c.nav:c.copy?' · ⧉ copy URL':'';
  return '<button class="fieldUrlRow" type="button" role="option" aria-selected="'+(i===selected?'true':'false')+'" data-index="'+i+'" data-command="'+esc(c.id)+'"><span class="fieldUrlMark">'+esc(c.glyph)+'</span><span class="fieldUrlBody"><b>'+highlight(':'+c.id+' · '+c.label,q)+'</b><code>'+highlight(c.hint+al+dest,q)+'</code></span><span class="fieldUrlTail"><b>COMMAND</b>authority none</span></button>'
 }
 function aliasRow(id,i){
  const g=ALIAS_GLYPH(id);
  return '<button class="fieldUrlRow fieldUrlAlias" type="button" role="option" aria-selected="'+(i===selected?'true':'false')+'" data-index="'+i+'" data-alias="'+esc(id)+'"><span class="fieldUrlMark">'+esc(g[0])+'</span><span class="fieldUrlBody"><b>'+esc(g[1])+' · alias "'+esc(id)+'"</b><code>'+esc(g[2])+' · exact glyph alias, ranks first</code></span><span class="fieldUrlTail"><b>ALIAS</b>authority none</span></button>';
 }
 function statusLine(parsed,count){
  const m=MODE_META[parsed.mode]||MODE_META.SEARCH;
  const grammar='<b>'+esc(m.sigil)+'</b> '+esc(m.label)+' · '+count+' match'+(count===1?'':'es');
  // The board stamp rides the open palette too: counts + as-of in words, at rest
  // in the line and in full here, so neither surface can go stale silently.
  const boardTxt=board?(' · board '+board.open+'·'+board.blocked+'·'+board.running+' @ '+esc(board.stamp)):' · board unavailable';
  const keys='⌃K focus · ↑↓ choose · ↵ hold · ⌘/ctrl+↵ turn · esc clear'+(learned()?' · ⟲ :reset clears ranking':'');
  return '<div class="fieldUrlStatus"><span>'+grammar+' · authority NONE'+boardTxt+'</span><span>'+keys+'</span></div>';
 }
 /* M6 · :help — the YubNub `ls`/`man` mechanic inside the bar: the full
   registry (id · glyph · hint · aliases · destination) plus the sigil legend,
   rendered by the same paint()/row machinery as the normal COMMAND palette. */
 function helpLegend(){
  return '<div class="fieldUrlStatus"><span><b>令</b> words · /path · @ · > · ^ · : · ! · authority NONE</span><span>address · exact · heads · turn · rise · command · hermes prep · '+COMMANDS.length+' commands</span></div>';
 }
 function paint({forceOpen=false}={}){
  currentParsed=parse(input.value);setMode(currentParsed);selected=Math.max(0,selected);
  if(currentParsed.mode===MODES.RISE){aliasHit=null;results=[];panel.innerHTML='<div class="fieldUrlStatus"><span><b>上</b> RISE · one structural depth · authority NONE</span><span>↵ apply</span></div>';panel.hidden=false;input.setAttribute('aria-expanded','true');return}
  if(currentParsed.mode===MODES.COMMAND){
   aliasHit=null;
   if(helpOpen)results=COMMANDS.slice();
   else if(currentParsed.command){const c=COMMANDS.find(x=>x.id===currentParsed.command);results=c?[c]:[]}
   else results=rankCommands(currentParsed.query,COMMANDS.length,pal);
   if(selected>=results.length)selected=Math.max(0,results.length-1);
   panel.innerHTML=(helpOpen?helpLegend():'')+results.map(commandRow).join('')+emptyHint(currentParsed.query,results.length)+statusLine(currentParsed,results.length)
  }
  else{
   // Alias-first: an exact single-letter glyph alias outranks every fuzzy match
   // (Raycast: exact alias → prefix → title → keyword → frecency), but only
   // when no route IS the typed address — see aliasId().
   aliasHit=currentParsed.mode===MODES.SEARCH?aliasId(currentParsed.query,routes):null;
   const off=aliasHit?1:0,empty=!text(currentParsed.query);
   results=rank(routes,currentParsed,context(),empty?EMPTY_ROWS:9);
   if(selected>=results.length+off)selected=Math.max(0,results.length-1+off);
   panel.innerHTML=(aliasHit?aliasRow(aliasHit,0):'')+results.map((r,i)=>routeRow(r,i+off)).join('')+emptyHint(currentParsed.query,results.length+off)+statusLine(currentParsed,results.length+off);
  }
  const open=forceOpen||doc.activeElement===input;panel.hidden=!open;input.setAttribute('aria-expanded',String(open));
  panel.querySelectorAll('.fieldUrlRow').forEach(row=>{
   row.addEventListener('pointerdown',e=>e.preventDefault());
   row.addEventListener('click',()=>{selected=Number(row.dataset.index)||0;applySelection(false)});
  });
  const active=panel.querySelector('[aria-selected="true"]');if(active){active.id='fieldUrlActive';input.setAttribute('aria-activedescendant','fieldUrlActive')}else input.removeAttribute('aria-activedescendant');
 }
 function currentRoute(){
  if(currentParsed.mode===MODES.COMMAND)return null;
  const off=currentParsed.mode===MODES.SEARCH&&aliasHit?1:0;
  if(off&&selected===0)return null;
  return results[selected-off]||null;
 }
 function flash(message){
  clearTimeout(flashTimer);const old=modeNode.innerHTML;modeNode.innerHTML='<b>✓</b><span>'+esc(message)+'</span>';flashTimer=setTimeout(()=>{modeNode.innerHTML=old},1700);
 }
 async function copy(value){
  try{await win.navigator.clipboard.writeText(value);return true}catch(_){
   try{const ta=doc.createElement('textarea');ta.value=value;ta.setAttribute('readonly','');ta.style.position='fixed';ta.style.opacity='0';doc.body.appendChild(ta);ta.select();const ok=doc.execCommand('copy');ta.remove();return ok}catch(_){return false}
  }
 }
 function clearInput(){input.value='';selected=0;helpOpen=false;moved=false;syncURL('');paint({forceOpen:doc.activeElement===input})}
 /* M6 · one entry to the registry: ':help' (any style), ':' + ↵ or an empty
   bar + ↵ all land here — the bar seeds its own :help projection so the panel
   state stays re-enterable through ?fi= like every other input. */
 function showHelp(){input.value=':help';helpOpen=true;selected=0;syncURL(input.value);paint({forceOpen:true})}
 function executeCommand(id,target){
  // M2/M3 · ONE dispatcher: every ':' command routes through the omnibar's
  // execute() (the authority-NONE event source) when it is mounted, so glyph
  // keys, trailing style and leading style all end in the same switch. This
  // fallback only runs when field-omnibar.js never loaded (reversibility).
  const omni=win.FieldOmnibar;
  if(typeof omni?.execute==='function'){omni.execute(id,target||focusHref||'/','urlbar');return}
  const rid=resolveCommand(id)||id;
  noteUse('cmd:'+rid);
  const entry=COMMANDS.find(c=>c.id===rid)||null;
  // M4 · route commands are registry DATA — plain address / copy, no new API.
  if(entry?.nav){win.location.assign(entry.nav);return}
  if(entry?.copy){copy(entry.copy).then(ok=>flash(ok?rid.toUpperCase()+' URL COPIED':'COPY FAILED'));return}
  if(rid==='help'){showHelp();return}
  switch(rid){
   case'hold':win.FieldZUI?.close?.('urlbar');break;
   case'work':win.FieldZUI?.open?.('WORK','urlbar');break;
   case'prove':win.FieldZUI?.open?.('PROVE','urlbar');break;
   case'trace':doc.getElementById('apTrace')?.click();break;
   case'map':win.FieldLensHost?.project?.('VISUAL');break;
   case'recent':win.FieldLensHost?.project?.('RECENT');break;
   case'heads':input.value='@ ';selected=0;syncURL(input.value);paint({forceOpen:true});return;
   case'handoff':doc.getElementById('apCopy')?.click();break;
   case'run':{const prep=hermesPrepare(target||focusHref||'/');copy(prep).then(ok=>flash(ok?'HERMES PREP COPIED':'COPY FAILED'));return}
   case'fovea':doc.getElementById('foveaToggle')?.click();break;
   case'theme':doc.getElementById('fiTheme')?.click();break;
   // Raycast "Reset Ranking": drop the learned frecency + recents in one move.
   case'reset':resetLearning();input.value='';selected=0;syncURL('');paint({forceOpen:true});break;
   default:return;
  }
  flash(id.toUpperCase());
 }
 function executeAlias(id){
  const href=focusHref||'/';
  // The glyph grammar's real actions live in field-omnibar.js — the palette
  // RANKS them, the omnibar EXECUTES them (one dispatcher, no second copy).
  // noteUse runs on whichever side dispatches, so a use is never counted twice.
  const omni=win.FieldOmnibar;
  if(typeof omni?.execute==='function'){omni.execute(id,href);return}
  noteUse('cmd:'+id);
  if(id==='root'){win.location.assign('/');return}
  if(id==='open'){if(href!=='/'&&win.__fieldAct?.open){win.__fieldAct.open(href);flash('OPEN')}else flash('OPEN unavailable');return}
  executeCommand(id);
 }
 async function applySelection(forceTurn=false,source='pointer'){
  currentParsed=parse(input.value);
  // M6 · ↵ with nothing to act on renders the registry instead of firing an
  // arbitrary first-ranked command (arrow-moved selections stay commands/routes).
  if(source==='enter'&&!moved){
   if(!text(input.value)){showHelp();return}
   if(currentParsed.mode===MODES.COMMAND&&!text(currentParsed.query)){showHelp();return}
  }
  if(currentParsed.mode===MODES.RISE){win.__fieldAct?.rise?.();flash('RISE');return}
  if(currentParsed.mode===MODES.COMMAND){
   if(helpOpen&&source==='enter'&&!moved){helpOpen=false;paint({forceOpen:true});return}
   if(currentParsed.command){executeCommand(currentParsed.command,addressedHref(currentParsed.query));return}
   const c=results[selected];if(c)executeCommand(c.id);return
  }
  if(currentParsed.mode===MODES.SEARCH){
   aliasHit=aliasId(currentParsed.query,routes);
   if(aliasHit&&selected===0){executeAlias(aliasHit);return}
  }
  const route=currentRoute();if(!route)return;
  noteUse(route.href);
  if(currentParsed.mode===MODES.HERMES){
   const cmd=hermesPrepare(route);const ok=await copy(cmd);flash(ok?'HERMES PREP COPIED':'COPY FAILED');return;
  }
  if(currentParsed.mode===MODES.TURN||forceTurn){win.__fieldAct?.open?.(route.href);return}
  win.__fieldAct?.focus?.(route.href);focusHref=route.href;input.value=route.href;syncURL(input.value);selected=0;paint({forceOpen:false});input.blur();
 }
 function addressedHref(q){
  // Trailing-style target: exact route address only, else the held object
  // (mirrors the omnibar's addressFor — a command never guesses a route).
  const t=text(q);if(!t)return focusHref;
  const hit=routes.find(r=>r.href===t||(r.href.endsWith('/')&&r.href.slice(0,-1)===t));
  return hit?hit.href:focusHref;
 }
 function move(delta){
  moved=true;
  // Index space includes the alias row when one is showing, so ↑↓ walks it.
  const total=results.length+(currentParsed.mode===MODES.SEARCH&&aliasHit?1:0);
  if(!total)return;
  selected=(selected+delta+total)%total;paint({forceOpen:true});panel.querySelector('[aria-selected="true"]')?.scrollIntoView({block:'nearest'})
 }
 function focusBar(seed){input.focus();if(seed!=null){input.value=seed;input.setSelectionRange(input.value.length,input.value.length);syncURL(input.value)}selected=0;helpOpen=false;moved=false;paint({forceOpen:true})}
 function syncHeld(href){
  focusHref=href||win.__fieldAct?.focusHref?.()||null;const r=focusHref&&routeMap().get(focusHref);
  glyphNode.innerHTML=r&&win.FieldGlyph?.svg?.(r,{size:28,head:heads.has(r.href)})||'Φ';glyphNode.title=r?(glyphMnemonic(r)+' · '+r.href):'FIELD';
 }
 function targetIsTyping(t){const tag=t?.tagName?.toLowerCase?.();return t?.isContentEditable||tag==='input'||tag==='textarea'||tag==='select'}

 input.addEventListener('focus',()=>paint({forceOpen:true}));
 input.addEventListener('input',()=>{selected=0;helpOpen=false;moved=false;syncURL(input.value);paint({forceOpen:true})});
 input.addEventListener('keydown',e=>{
  if(e.key==='ArrowDown'){e.preventDefault();move(1);return}
  if(e.key==='ArrowUp'){e.preventDefault();move(-1);return}
  if(e.key==='Enter'){e.preventDefault();applySelection(e.ctrlKey||e.metaKey,'enter');return}
  if(e.key==='Escape'){e.preventDefault();if(input.value){clearInput();input.focus()}else{panel.hidden=true;input.setAttribute('aria-expanded','false');input.blur()}return}
 });
 input.addEventListener('blur',()=>setTimeout(()=>{if(!shell.contains(doc.activeElement)){panel.hidden=true;input.setAttribute('aria-expanded','false')}},80));
 doc.addEventListener('keydown',e=>{
  // M3 · THE single document-level entry owner — ⌘K / / / : live only here;
  // field-omnibar.js keeps a passthrough listener for its fallback line only.
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

 win.FieldURLBar=Object.freeze({VERSION,focus:focusBar,parse:()=>parse(input.value),results:()=>results.slice(),showHelp,hermesPrepare:()=>{const r=currentRoute()||routeMap().get(focusHref);return r?hermesPrepare(r):null}});
 }

return Object.freeze({VERSION,MODES,MODE_META,COMMANDS,COMMAND_ALIAS,parse,parseCommand,resolveCommand,evidenceScore,scoreRoute,rank,rankCommands,highlight,nearestCommands,emptyHint,shellQuote,hermesPrepare,boot,aliasId,parseBoard,stampMs,ageLabel,PALETTE_ALIAS,PALETTE_KEY,PALETTE_RECENTS,EMPTY_ROWS});
});
