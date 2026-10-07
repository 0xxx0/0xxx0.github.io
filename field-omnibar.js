(()=>{'use strict';
/* FIELD OMNIBAR v0.1
 * One addressed line over the existing FIELD host. It is a projection, not a
 * store, route authority, shell, queue or executor. Exact object identity and
 * native host authority remain where they already live.
 */
if(typeof window==='undefined'||location.pathname!=='/')return;

const COMMANDS=Object.freeze([
 {id:'root',glyph:'⌂',label:'ROOT',hint:'FIELD root'},
 {id:'hold',glyph:'◎',label:'HOLD',hint:'address / shallow'},
 {id:'work',glyph:'▽',label:'WORK',hint:'semantic depth'},
 {id:'prove',glyph:'◆',label:'PROVE',hint:'evidence depth'},
 {id:'open',glyph:'↗',label:'OPEN',hint:'native surface'},
 {id:'return',glyph:'↩',label:'RETURN',hint:'same object / hold'},
 {id:'handoff',glyph:'⎘',label:'HANDOFF',hint:'copy action packet'},
 {id:'run',glyph:'▶',label:'HERMES',hint:'copy local prepare command'},
 {id:'trace',glyph:'⋮',label:'TRACE',hint:'witness'},
 {id:'read',glyph:'≡',label:'READ',hint:'reader'},
 {id:'map',glyph:'⌘',label:'MAP',hint:'visual projection'},
 {id:'recent',glyph:'◴',label:'RECENT',hint:'recent projection'}
]);
const COMMAND_BY_ID=new Map(COMMANDS.map(x=>[x.id,x]));
const GLYPH_TO_ID=new Map(COMMANDS.map(x=>[x.glyph,x.id]));
const ALIAS=Object.freeze({
 ':root':'root',':home':'root',':hold':'hold',':work':'work',':prove':'prove',':proof':'prove',
 ':open':'open',':return':'return',':back':'return',':handoff':'handoff',':copy':'handoff',
 ':run':'run',':hermes':'run',':trace':'trace',':read':'read',':map':'map',':recent':'recent',
 ':up':'up',':down':'down',':prev':'prev',':next':'next','↑':'up','↓':'down','←':'prev','→':'next'
});
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const clean=s=>String(s??'').trim();
let root,input,list,active=0,rows=[],editing=false,lastAddress='/';

function routeMap(){
 try{const m=window.__fieldRouteMap?.all?.();return m instanceof Map?m:new Map()}catch(_){return new Map()}
}
function focusHref(){return window.__fieldAct?.focusHref?.()||window.FieldLensHost?.focus?.()?.href||null}
function currentHeads(){return new Set([...document.querySelectorAll('#headList [data-href]')].map(x=>x.dataset.href).filter(Boolean))}
function routeGlyph(r,heads){
 try{const m=window.FieldGlyph?.mnemonic?.(r,{tag:''});if(m)return String(m).slice(0,5)}catch(_){}
 const s=String(r?.state||'').toUpperCase();
 if(heads.has(r?.href))return '◆';
 if(/ARCHIV|HISTOR|RETIRED|SUPERSEDED|OBSOLETE/.test(s))return '·';
 if(/LIVE|CURRENT|ACTIVE|READY/.test(s))return '◇';
 return '○';
}
function fuzzyScore(needle,hay){
 const n=clean(needle).toLowerCase(),h=clean(hay).toLowerCase();if(!n)return 1;
 if(h===n)return 9000;if(h.startsWith(n))return 5000-n.length;if(h.includes(n))return 3500-h.indexOf(n);
 let j=0,gaps=0,last=-1;for(let i=0;i<h.length&&j<n.length;i++)if(h[i]===n[j]){if(last>=0)gaps+=i-last-1;last=i;j++}
 return j===n.length?Math.max(1,1800-gaps*8-h.length):0;
}
function resolveCommand(token){
 const t=clean(token).toLowerCase();if(!t)return null;
 if(ALIAS[t])return ALIAS[t];
 if(GLYPH_TO_ID.has(token))return GLYPH_TO_ID.get(token);
 if(COMMAND_BY_ID.has(t.replace(/^:/,'')))return t.replace(/^:/,'');
 return null;
}
function parse(raw){
 let q=clean(raw),command=null;
 if(GLYPH_TO_ID.has(q))return{query:'',command:GLYPH_TO_ID.get(q)};
 const bits=q.split(/\s+/).filter(Boolean),last=bits.at(-1)||'';
 const c=resolveCommand(last);
 if(c){command=c;q=bits.slice(0,-1).join(' ')}
 else if(q.startsWith(':')){const whole=resolveCommand(q);if(whole){command=whole;q=''}}
 if(q.startsWith('@'))q=q.slice(1);
 return{query:clean(q),command};
}
function candidates(query){
 const q=clean(query),map=routeMap(),heads=currentHeads(),focus=focusHref();
 const xs=[...map.values()];
 if(!map.has('/'))xs.unshift({href:'/',title:'FIELD INDEX',state:'CURRENT'});
 const scored=[];
 for(const r of xs){
  if(!r?.href)continue;
  const href=String(r.href),title=String(r.title||''),role=String(r.role||''),kind=String(r.kind||''),hay=[href,title,role,kind].join(' ');
  let score=fuzzyScore(q,hay);if(!score)continue;
  if(q&&href===q)score+=14000;
  if(q&&href.replace(/\/$/,'')===q.replace(/\/$/,''))score+=12000;
  if(href===focus)score+=2200;
  if(heads.has(href))score+=900;
  scored.push({kind:'route',route:r,score,glyph:routeGlyph(r,heads)});
 }
 return scored.sort((a,b)=>b.score-a.score||String(a.route.href).localeCompare(String(b.route.href))).slice(0,7)
}
function commandRows(filter=''){
 const q=clean(filter).replace(/^:/,'').toLowerCase();
 return COMMANDS.filter(c=>!q||c.id.includes(q)||c.label.toLowerCase().includes(q)).slice(0,7).map((c,i)=>({kind:'command',command:c,score:100-i}))
}
function addressFor(row,parsed){
 if(row?.kind==='route')return row.route.href;
 if(parsed.query&&routeMap().has(parsed.query))return parsed.query;
 return focusHref()||'/';
}
function status(text,tone=''){
 if(!root)return;root.dataset.tone=tone||'';const s=root.querySelector('[data-omni-status]');if(s)s.textContent=text||'';
}
function emit(detail){window.dispatchEvent(new CustomEvent('field-omnibar',{detail:Object.freeze({...detail,authority:'NONE'})}))}
function shellEscape(s){return "'"+String(s).replaceAll("'","'\\''")+"'"}
async function copyText(text,label){
 try{await navigator.clipboard.writeText(text);status(label||'COPIED','ok');return true}catch(_){prompt(label||'Copy:',text);return false}
}
async function execute(command,href,reason='operator'){
 const cmd=resolveCommand(command)||command||'hold',target=href||focusHref()||'/';
 const act=window.__fieldAct,zui=window.FieldZUI,host=window.FieldLensHost;
 if(cmd==='root'){emit({command:cmd,target:'/',reason});location.assign('/');return}
 if(target&&target!=='/'&&act?.focus)act.focus(target);
 if(target==='/'&&cmd==='hold'){zui?.close?.('omnibar');status('HOLD · /','ok');syncAddress();emit({command:cmd,target,reason});return}
 switch(cmd){
  case'hold':await zui?.close?.('omnibar');status('HOLD · '+target,'ok');break;
  case'work':await zui?.open?.('WORK','omnibar');status('WORK · '+target,'ok');break;
  case'prove':await zui?.open?.('PROVE','omnibar');status('PROVE · '+target,'ok');break;
  case'open':if(target==='/'||!act?.open){status('OPEN unavailable','bad');return}act.open(target);break;
  case'return':await zui?.close?.('omnibar');document.getElementById('aperture')?.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});status('RETURN · '+target,'ok');break;
  case'handoff':document.getElementById('apCopy')?.click();status('HANDOFF · copied existing action packet','ok');break;
  case'run':{
   const commandLine='node tools/field-hermes-run.mjs --source '+shellEscape(target);
   await copyText(commandLine,'HERMES PREP COPIED');break;
  }
  case'trace':document.getElementById('apTrace')?.click();status('TRACE · '+target,'ok');break;
  case'read':document.getElementById('apInspect')?.click();status('READ · '+target,'ok');break;
  case'map':host?.project?.('VISUAL');status('MAP · '+target,'ok');break;
  case'recent':host?.project?.('RECENT');status('RECENT · '+target,'ok');break;
  case'up':host?.rise?.();status('RISE','ok');break;
  case'down':host?.dive?.();status('DIVE','ok');break;
  case'prev':host?.peer?.(-1);status('PEER ←','ok');break;
  case'next':host?.peer?.(1);status('PEER →','ok');break;
  default:status('UNKNOWN · '+cmd,'bad');return;
 }
 emit({command:cmd,target,reason});syncAddress();
}
function render(){
 if(!input||!list)return;
 const parsed=parse(input.value),raw=clean(input.value);
 rows=raw.startsWith(':')&&!parsed.command?commandRows(raw):candidates(parsed.query);
 if(parsed.command&&!parsed.query)rows=[{kind:'command',command:COMMAND_BY_ID.get(parsed.command)||{id:parsed.command,glyph:'›',label:parsed.command.toUpperCase(),hint:'current object'},score:999},...candidates('').slice(0,5)];
 active=Math.max(0,Math.min(active,Math.max(0,rows.length-1)));
 const action=parsed.command?COMMAND_BY_ID.get(parsed.command)?.glyph||'›':'◎';
 list.innerHTML=rows.length?rows.map((row,i)=>{
  if(row.kind==='command'){const c=row.command;return'<button type="button" role="option" aria-selected="'+(i===active)+'" data-omni-row="'+i+'"><i>'+esc(c.glyph)+'</i><span><b>'+esc(c.label)+'</b><small>'+esc(c.hint)+'</small></span><code>:'+esc(c.id)+'</code></button>'}
  const r=row.route;return'<button type="button" role="option" aria-selected="'+(i===active)+'" data-omni-row="'+i+'"><i>'+esc(row.glyph)+'</i><span><b>'+esc(r.title||r.href)+'</b><small>'+esc([r.state,r.operation,r.kind].filter(Boolean).join(' · '))+'</small></span><code>'+esc(r.href)+'</code><em>'+esc(action)+'</em></button>'
 }).join(''):'<div class="fieldOmniEmpty">∅ no addressed match</div>';
 list.querySelectorAll('[data-omni-row]').forEach(b=>b.onclick=()=>choose(Number(b.dataset.omniRow),'pointer'));
 root.dataset.open='1';
}
function syncAddress(){
 if(!input||editing)return;lastAddress=focusHref()||'/';input.value=lastAddress;root.dataset.depth=window.FieldZUI?.state?.()||'HOLD';root.querySelector('[data-omni-sigil]').textContent=lastAddress==='/'?'Φ':'◎';
}
function move(delta){if(!rows.length)return;active=(active+delta+rows.length)%rows.length;render();list.querySelector('[aria-selected="true"]')?.scrollIntoView({block:'nearest'})}
async function choose(index=active,reason='keyboard'){
 const parsed=parse(input.value),row=rows[index]||null;
 if(row?.kind==='command'&&!parsed.query){await execute(row.command.id,focusHref()||'/',reason);close(true);return}
 const href=addressFor(row,parsed),cmd=parsed.command||'hold';
 await execute(cmd,href,reason);close(true)
}
function open(select=true){
 if(!input)return;editing=true;root.dataset.open='1';syncAddress();if(document.activeElement!==input)input.focus({preventScroll:true});if(select)input.select();active=0;render();status('⌂ ◎ ▽ ◆ ↗ ↩ ⎘ ▶ · / or ⌘K','')
}
function close(restore=true){
 editing=false;if(root)root.dataset.open='0';rows=[];if(list)list.innerHTML='';if(restore)syncAddress();input?.blur();
}
function isEditable(t){const tag=t?.tagName?.toLowerCase?.();return !!(t?.isContentEditable||tag==='input'||tag==='textarea'||tag==='select')}
function css(){
 if(document.getElementById('field-omnibar-style'))return;
 const s=document.createElement('style');s.id='field-omnibar-style';s.textContent=`
#fieldOmnibar{position:sticky;top:max(0px,env(safe-area-inset-top));z-index:80;margin:0 0 7px;border:1px solid var(--line);background:color-mix(in srgb,var(--bg) 92%,transparent);backdrop-filter:blur(13px);box-shadow:0 10px 30px rgba(0,0,0,.18)}
.fieldOmniLine{display:grid;grid-template-columns:28px minmax(0,1fr) auto;align-items:center;min-height:34px}.fieldOmniSigil{display:grid;place-items:center;height:100%;border-right:1px solid var(--line);color:var(--hot);font-size:13px;font-weight:800}.fieldOmniInput{width:100%;min-width:0;height:32px;border:0;background:transparent!important;padding:0 9px;outline:0;font-size:9px;letter-spacing:.02em}.fieldOmniInput::selection{background:var(--cool);color:var(--bg)}
.fieldOmniKeys{display:flex;height:100%;border-left:1px solid var(--line)}.fieldOmniKeys button{min-width:29px;height:32px;padding:0 7px;border:0;border-left:1px solid color-mix(in srgb,var(--line) 65%,transparent);background:transparent;color:var(--mut);font-size:11px}.fieldOmniKeys button:hover,.fieldOmniKeys button:focus-visible{color:var(--ink);background:var(--p2)}.fieldOmniKeys button[data-command="work"]{color:var(--cool)}.fieldOmniKeys button[data-command="prove"]{color:var(--gold)}.fieldOmniKeys button[data-command="open"]{color:var(--hot)}
.fieldOmniStatus{position:absolute;right:5px;top:100%;margin-top:2px;color:var(--mut);font-size:5.5px;letter-spacing:.08em;pointer-events:none}.fieldOmniResults{position:absolute;left:-1px;right:-1px;top:100%;border:1px solid var(--line);border-top:0;background:var(--bg);box-shadow:0 16px 36px rgba(0,0,0,.34);max-height:min(58vh,360px);overflow:auto}.fieldOmniResults:empty{display:none}#fieldOmnibar[data-open="0"] .fieldOmniResults{display:none}
.fieldOmniResults button{width:100%;display:grid;grid-template-columns:32px minmax(0,1fr) minmax(80px,34%) 24px;align-items:center;gap:7px;text-align:left;padding:6px 8px;border:0;border-bottom:1px solid #1d2529;background:var(--bg)}.fieldOmniResults button:last-child{border-bottom:0}.fieldOmniResults button[aria-selected="true"]{background:var(--p2);box-shadow:inset 2px 0 0 var(--hot)}.fieldOmniResults i{font-style:normal;color:var(--gold);font-size:10px;text-align:center}.fieldOmniResults span{min-width:0}.fieldOmniResults b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:8px}.fieldOmniResults small{display:block;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:5.8px;margin-top:1px}.fieldOmniResults code{color:var(--cool);font-size:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fieldOmniResults em{font-style:normal;color:var(--hot);text-align:center}.fieldOmniEmpty{padding:9px;color:var(--mut);font-size:7px}
#fieldOmnibar[data-tone="ok"]{border-color:color-mix(in srgb,var(--green) 55%,var(--line))}#fieldOmnibar[data-tone="bad"]{border-color:var(--bad)}#fieldOmnibar[data-depth="WORK"] .fieldOmniSigil{color:var(--cool)}#fieldOmnibar[data-depth="PROVE"] .fieldOmniSigil{color:var(--gold)}
#fieldOmnibarKeys[data-tone="ok"]{box-shadow:inset 0 -2px 0 color-mix(in srgb,var(--green) 70%,transparent)}
#fieldOmnibarKeys[data-tone="bad"]{box-shadow:inset 0 -2px 0 var(--bad)}
/* FOLD: when the FIELD URLbar owns the line, its frame reserves one extra grid
   column so these glyph keys ride the SAME line instead of a second bar. */
#fieldUrlBar .fieldUrlFrame{grid-template-columns:auto 30px minmax(0,1fr) auto auto}
html[data-theme="light"] #fieldOmnibar,html[data-theme="light"] .fieldOmniResults,html[data-theme="light"] .fieldOmniResults button{background:color-mix(in srgb,var(--bg) 95%,white)}
@media(max-width:760px){#fieldOmnibar{margin-bottom:6px}.fieldOmniLine{grid-template-columns:30px minmax(0,1fr) auto;min-height:40px}.fieldOmniInput{height:38px;font-size:12px}.fieldOmniKeys button{height:38px;min-width:32px;font-size:13px}.fieldOmniKeys button:nth-child(n+5){display:none}#fieldUrlBar .fieldUrlFrame{grid-template-columns:auto 34px minmax(0,1fr) auto auto}.fieldOmniResults button{grid-template-columns:28px minmax(0,1fr) minmax(72px,38%) 20px;padding:8px}.fieldOmniResults b{font-size:10px}.fieldOmniResults small,.fieldOmniResults code{font-size:8px}.fieldOmniStatus{display:none}}
@media(prefers-reduced-motion:reduce){#fieldOmnibar *{scroll-behavior:auto!important}}
 `;document.head.appendChild(s)
}
function markup(){
 const el=document.createElement('section');el.id='fieldOmnibar';el.dataset.open='0';el.dataset.depth='HOLD';el.setAttribute('aria-label','FIELD omnibar');
 const visible=['hold','work','prove','open','return','handoff','run'];
 el.innerHTML='<div class="fieldOmniLine"><span class="fieldOmniSigil" data-omni-sigil>Φ</span><input class="fieldOmniInput" data-omni-input aria-label="Address FIELD object or enter command" autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="search"><div class="fieldOmniKeys">'+visible.map(id=>{const c=COMMAND_BY_ID.get(id);return'<button type="button" data-command="'+c.id+'" title="'+c.label+' · '+c.hint+'" aria-label="'+c.label+'">'+c.glyph+'</button>'}).join('')+'</div></div><div class="fieldOmniResults" data-omni-results role="listbox"></div><div class="fieldOmniStatus" data-omni-status></div>';
 return el
}
function keysMarkup(){
 const visible=['hold','work','prove','open','return','handoff','run'];
 return visible.map(id=>{const c=COMMAND_BY_ID.get(id);return'<button type="button" data-command="'+c.id+'" title="'+c.label+' · '+c.hint+'" aria-label="'+c.label+'">'+c.glyph+'</button>'}).join('')+'<div class="fieldOmniStatus" data-omni-status></div>';
}
function wireKeys(node){node.querySelectorAll('[data-command]').forEach(b=>b.onclick=()=>execute(b.dataset.command,focusHref()||'/','glyph'))}
/* FOLD — exactly ONE route-control line. The FIELD URLbar owns the line: its
   address grammar, ?fi= projection state, ⌘K / / : keyboard and no-authority
   rule stay byte-untouched. The omnibar contributes its glyph keys INSIDE that
   line instead of mounting a second bar (no second input, no second results
   panel, no second keyboard owner). If no URLbar ever appears, the omnibar
   mounts its own single line — never both. */
function mountKeys(){
 if(document.getElementById('fieldOmnibarKeys'))return true;
 const bar=document.getElementById('fieldUrlBar');if(!bar)return false;
 const frame=bar.querySelector('.fieldUrlFrame')||bar;
 document.getElementById('fieldOmnibar')?.remove();
 const keys=document.createElement('span');keys.id='fieldOmnibarKeys';keys.className='fieldOmniKeys';
 keys.innerHTML=keysMarkup();
 frame.appendChild(keys);
 wireKeys(keys);
 root=keys;input=null;list=null;editing=false;rows=[];
 document.documentElement.dataset.fieldOmnibar='keys';
 return true;
}
function mountOwn(){
 if(document.getElementById('fieldOmnibar'))return;
 const main=document.querySelector('main');if(!main)return;
 root=markup();main.prepend(root);input=root.querySelector('[data-omni-input]');list=root.querySelector('[data-omni-results]');
 root.querySelectorAll('[data-command]').forEach(b=>b.onclick=()=>execute(b.dataset.command,focusHref()||'/','glyph'));
 input.addEventListener('focus',()=>open(false));
 input.addEventListener('input',()=>{editing=true;active=0;render()});
 input.addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(true);return}
  if(e.key==='ArrowDown'){e.preventDefault();move(1);return}
  if(e.key==='ArrowUp'){e.preventDefault();move(-1);return}
  if(e.key==='Tab'&&rows[active]?.kind==='route'){e.preventDefault();input.value=rows[active].route.href+(parse(input.value).command?' :'+parse(input.value).command:'');input.setSelectionRange(input.value.length,input.value.length);render();return}
  if(e.key==='Enter'){e.preventDefault();choose(active,'enter')}
 });
 document.addEventListener('keydown',e=>{
  if(document.getElementById('fieldUrlBar'))return;
  if(isEditable(e.target)||e.defaultPrevented)return;
  if(e.key==='/'&&!e.metaKey&&!e.ctrlKey&&!e.altKey){e.preventDefault();open(true);return}
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();open(true)}
 },true);
 window.addEventListener('field-index:state',()=>{if(!editing)syncAddress()});
 window.addEventListener('field-zui',()=>{if(root&&root.id==='fieldOmnibar')root.dataset.depth=window.FieldZUI?.state?.()||'HOLD'});
 document.addEventListener('pointerdown',e=>{if(root?.dataset?.open==='1'&&!root.contains(e.target))close(true)},{passive:true});
 let tries=0;const boot=()=>{syncAddress();if(window.__fieldRouteMap?.all?.()?.size)return;if(++tries<80)setTimeout(boot,75)};boot();
 document.documentElement.dataset.fieldOmnibar='mounted';
 // Module-load race: if the URLbar line arrives after this fallback mounted,
 // converge to the keys mount so exactly one line remains visible.
 try{
  const mo=new MutationObserver(()=>{if(mountKeys())mo.disconnect()});
  mo.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>mo.disconnect(),20000);
 }catch(_){}
}
function decide(tries=0){
 if(mountKeys())return;
 // The URLbar sets its boot flag synchronously before inserting (or permanently
 // bails if the host is missing), so a set flag + no element means: never.
 if(window.__fieldURLBarBooted){mountOwn();return}
 if(tries<30)setTimeout(()=>decide(tries+1),100);else mountOwn();
}
function bind(){
 if(document.getElementById('fieldOmnibarKeys'))return;
 css();decide();
}
window.FieldOmnibar=Object.freeze({open:()=>open(true),close:()=>close(true),execute:(command,href)=>execute(command,href,'api'),address:()=>focusHref()||'/',commands:COMMANDS.map(({id,glyph,label})=>({id,glyph,label}))});
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',bind,{once:true}):bind();
})();
