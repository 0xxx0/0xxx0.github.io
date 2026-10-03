(function(root){
'use strict';
const CORE=root.PrisonAgePassageCore,ATLAS='/prison-age/evidence-atlas.json',PACK='/prison-age/sources.json';
if(!CORE)return;
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let atlas=null,pack=null,trail=[],current=null,sourceCache=new Map(),mode='CLOSED',renderSeq=0;
const bootQuery=new URLSearchParams(location.search);

function style(){
  if($('paPassageStyle'))return;
  const s=document.createElement('style');s.id='paPassageStyle';s.textContent=`
.paPassage{position:fixed;inset:0;z-index:96;background:#050606;color:#efeee9;overflow:auto;font:10px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace}.paPassage[hidden]{display:none}.papShell{min-height:100dvh;max-width:1180px;margin:auto;padding:max(10px,env(safe-area-inset-top)) 14px max(18px,env(safe-area-inset-bottom));display:grid;grid-template-rows:auto 1fr auto}.papHead{position:sticky;top:0;z-index:4;background:#050606ee;border-bottom:1px solid #303735;padding:8px 0;display:flex;justify-content:space-between;gap:12px;align-items:end}.papEy{font-size:7px;letter-spacing:.17em;color:#d6b36a}.papHead h2{margin:2px 0;font:900 clamp(30px,7vw,72px)/.83 system-ui,sans-serif;letter-spacing:-.065em}.papHeadActions{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end}.paPassage button,.paPassage a{font:inherit;border:1px solid #36403c;border-radius:0;background:#090c0a;color:inherit;padding:8px;text-decoration:none;cursor:pointer}.paPassage button:disabled{opacity:.35;cursor:default}.papMain{display:grid;align-content:center;padding:24px 0;min-height:0}.papIntro{max-width:920px;margin:auto;width:100%}.papIntro h3{margin:0 0 12px;font:900 clamp(30px,8vw,88px)/.82 system-ui,sans-serif;letter-spacing:-.065em}.papIntro h3 b{color:#e86f43}.papIntroLaw{max-width:760px;color:#8f9994;font-size:10px;border-left:2px solid #34433c;padding:8px 11px;margin:16px 0}.papRoot{border:1px solid #4a4130;padding:12px;margin:18px 0;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;background:#0c0b08}.papRoot strong{font:900 19px/1 system-ui}.papRoot span{display:block;color:#9a9079;margin-top:5px}.papDoors{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));border-top:1px solid #303735;border-left:1px solid #303735}.papDoor{text-align:left!important;border:0!important;border-right:1px solid #303735!important;border-bottom:1px solid #303735!important;padding:13px!important;min-height:150px;display:grid;grid-template-rows:auto auto 1fr;align-content:start;background:#080a09!important}.papDoor:hover,.papDoor:focus{background:#e9e6dc!important;color:#0d0f0e!important}.papDoorNum{font:900 26px/1 system-ui}.papDoorTitle{font:800 15px/1.08 system-ui;margin:7px 0}.papDoorText{font:14px/1.35 Georgia,serif;align-self:end}.papRoute{display:none;grid-template-columns:minmax(0,1fr) 290px;gap:20px;align-items:start;width:100%}.papRoute.on{display:grid}.papStage{min-width:0}.papSource{font-size:8px;letter-spacing:.13em;color:#86d7ff}.papFragment{font:clamp(28px,5.5vw,70px)/1.03 Georgia,'Times New Roman',serif;letter-spacing:-.035em;text-wrap:balance;margin:18px 0;max-width:900px}.papContext{border-top:1px solid #303735;border-bottom:1px solid #303735;padding:14px 0;font:16px/1.5 Georgia,serif;color:#aeb7b2;white-space:pre-wrap}.papContext mark{background:#e8e3d4;color:#111;padding:0 2px}.papEvidence{margin:8px 0;color:#7f8c86;font-size:8px;overflow-wrap:anywhere}.papEvidence b{color:#d6b36a}.papActions{display:flex;gap:5px;flex-wrap:wrap;margin-top:14px}.papActions button,.papActions a{min-height:42px;padding:10px 12px}.papCross{border-color:#86d7ff!important;color:#c9efff!important;font-weight:900}.papRead{border-color:#e86f43!important;color:#ffd3c3!important}.papRide{border-color:#d6b36a!important;color:#f1dda9!important}.papTurns{margin-top:12px;border-top:1px solid #242b28;padding-top:9px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px}.papTurn{text-align:left!important;min-height:74px}.papTurn span{display:block;color:#738079;font-size:7px;margin-top:5px}.papTrail{position:sticky;top:86px;border-left:1px solid #303735;padding-left:12px}.papTrail h4{font:900 14px/1 system-ui;margin:0 0 8px}.papTrailItem{border-top:1px solid #252c29;padding:7px 0;display:grid;grid-template-columns:24px 1fr;gap:6px}.papTrailItem i{font-style:normal;color:#d6b36a}.papTrailItem b{display:block;font-size:8px}.papTrailItem span{display:block;color:#7b8781;font:11px/1.3 Georgia,serif;margin-top:2px}.papTrailLaw{color:#65716b;font-size:7px;margin-top:10px}.papReturn{display:none;max-width:900px;margin:auto;width:100%}.papReturn.on{display:block}.papReturn h3{font:900 clamp(35px,9vw,100px)/.78 system-ui,sans-serif;letter-spacing:-.07em;margin:0 0 22px}.papReturn h3 b{color:#d6b36a}.papReturnNode{border-top:1px solid #303735;padding:13px 0}.papReturnNode .src{font-size:7px;color:#86d7ff;letter-spacing:.12em}.papReturnNode p{margin:5px 0;font:19px/1.35 Georgia,serif}.papSeam{color:#7c8782;font-size:8px;padding:4px 0}.papReturnActions{position:sticky;bottom:0;background:#050606ef;border-top:1px solid #303735;padding:8px 0;display:flex;gap:5px;flex-wrap:wrap}.papStatus{border-top:1px solid #303735;padding-top:7px;color:#747f7a;font-size:8px;display:flex;justify-content:space-between;gap:12px}.papStatus b{color:#b9c1bd}
@media(max-width:780px){.papShell{padding-left:10px;padding-right:10px}.papHead{align-items:start}.papHead h2{font-size:34px}.papRoute.on{grid-template-columns:1fr}.papTrail{position:relative;top:auto;border-left:0;border-top:1px solid #303735;padding:10px 0 0}.papDoors{grid-template-columns:1fr}.papDoor{min-height:118px}.papFragment{font-size:clamp(28px,9vw,52px)}.papContext{font-size:15px}.papTurns{grid-template-columns:1fr}.papActions{position:sticky;bottom:max(4px,env(safe-area-inset-bottom));z-index:3;background:#050606e8;padding:7px 0}.papRoot{grid-template-columns:1fr}.papHeadActions button{padding:6px}.papStatus{display:block}}
`;document.head.appendChild(s)
}
function currentUrl(){const u=new URL(location.href);u.searchParams.set('passage','1');u.searchParams.delete('atlas');u.searchParams.delete('card');if(trail.length)u.searchParams.set('trail',CORE.encodeTrail(trail));else u.searchParams.delete('trail');return u.pathname+u.search+u.hash}
function writeUrl(){history.replaceState(null,'',currentUrl())}
function sourceMeta(id){return pack?.stories?.[id]||null}
async function sourceText(node){
  const path=node?.endpoint?.path;if(!path)throw Error('PASSAGE_SOURCE_PATH');
  if(sourceCache.has(path))return sourceCache.get(path);
  const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw Error('SOURCE '+r.status);const raw=await r.text();
  if(raw.slice(Number(node.endpoint.start),Number(node.endpoint.end))!==node.endpoint.text)throw Error('PASSAGE_SOURCE_DRIFT');
  sourceCache.set(path,raw);return raw
}
function paragraph(raw,start,end){
  const before=raw.lastIndexOf('\n\n',Math.max(0,start-1)),after=raw.indexOf('\n\n',end);
  const a=before<0?0:before+2,b=after<0?raw.length:after,fragA=start-a,fragB=end-a,chunk=raw.slice(a,b);
  return esc(chunk.slice(0,fragA))+'<mark>'+esc(chunk.slice(fragA,fragB))+'</mark>'+esc(chunk.slice(fragB))
}
function evidenceLabel(n){const xs=n.phrases?.length?n.phrases:n.shared;return xs.slice(0,4).join(' · ')||n.class}
function transitionLabel(a,b){const t=CORE.transition(atlas,a,b);if(!t)return'—';if(t.kind==='CROSS_ECHO'){const xs=t.evidence.phrases?.length?t.evidence.phrases:t.evidence.shared;return'CROSS ECHO · '+xs.slice(0,3).join(' · ')}return'TURN SOURCE'}
function renderTrail(){
  $('papTrailList').innerHTML=trail.map((k,i)=>{const n=CORE.nodeOf(atlas,k);return'<div class="papTrailItem"><i>'+String(i+1).padStart(2,'0')+'</i><div><b>'+esc(n.endpoint.title)+' · '+esc(n.endpoint.address)+'</b><span>'+esc(n.endpoint.text)+'</span></div></div>'}).join('')||'<div class="papTrailLaw">NO STEPS YET</div>';
  $('papTrailLaw').textContent='READER PATH · '+trail.length+' / '+CORE.MAX_TRAIL+' · exact source spans only · evidence only';
}
function renderIntro(){
  renderSeq++;current=null;mode='INTRO';$('papIntro').hidden=false;$('papRoute').classList.remove('on');$('papReturn').classList.remove('on');
  const entries=CORE.entryNodes(atlas);$('papDoors').innerHTML=entries.map(n=>'<button class="papDoor" data-enter="'+n.key+'"><span class="papDoorNum">'+esc(sourceMeta(n.endpoint.source_id)?.number||String(n.card).padStart(2,'0'))+'</span><span class="papDoorTitle">'+esc(n.endpoint.title)+'</span><span class="papDoorText">'+esc(n.endpoint.text)+'</span></button>').join('');
  $('papDoors').querySelectorAll('[data-enter]').forEach(b=>b.onclick=()=>enter(b.dataset.enter));renderTrail();writeUrl()
}
async function renderNode(){
  const seq=++renderSeq,heldKey=trail.at(-1),held=CORE.nodeOf(atlas,heldKey);current=held;if(!held)return renderIntro();mode='ROUTE';
  const meta=sourceMeta(held.endpoint.source_id),raw=await sourceText(held);
  if(seq!==renderSeq||trail.at(-1)!==heldKey)return;
  const c=CORE.choices(atlas,held.key,trail);
  $('papIntro').hidden=true;$('papReturn').classList.remove('on');$('papRoute').classList.add('on');
  $('papSource').textContent=(meta?.number||'—')+' · '+held.endpoint.title+' · '+String(meta?.source_class||'SOURCE').replaceAll('_',' ');
  $('papFragment').textContent=held.endpoint.text;$('papContext').innerHTML=paragraph(raw,Number(held.endpoint.start),Number(held.endpoint.end));
  $('papEvidence').innerHTML='<b>'+esc(held.class)+'</b> · '+esc(evidenceLabel(held))+' · '+esc(held.endpoint.address)+' · evidence score '+held.score;
  $('papCross').disabled=!c.cross;$('papCross').textContent=c.cross?'CROSS ECHO → '+c.cross.endpoint.title:'CROSS ECHO';$('papCross').onclick=()=>c.cross&&move(c.cross.key);
  $('papTurns').innerHTML=c.turns.map(n=>'<button class="papTurn" data-turn="'+n.key+'"><b>TURN · '+esc(evidenceLabel(n))+'</b><span>'+esc(n.endpoint.text)+'</span></button>').join('')||'<button disabled>NO UNUSED SOURCE TURN</button>';
  $('papRead').href=readHref(held);$('papRead').onclick=null;$('papRide').onclick=()=>void rideCurrent();$('papRaw').href=held.endpoint.path;
  $('papReturnBtn').disabled=trail.length<2;renderTrail();writeUrl();
  $('papState').textContent='HELD '+held.key.toUpperCase()+' · '+held.endpoint.source_id+' · '+trail.length+' steps';
}
function enter(key){trail=[CORE.parseNode(key)?.key].filter(Boolean);return renderNode()}
function move(key){try{trail=CORE.append(atlas,trail,key);return renderNode()}catch(e){$('papState').textContent='MOVE REJECTED · '+String(e.message||e)}}
function readHref(n){const u=new URL('/docs/',location.origin);u.searchParams.set('src',n.endpoint.path);u.searchParams.set('ap_scale','SENT');u.searchParams.set('ap_char',String(n.endpoint.start));u.searchParams.set('echo','/prison-age/echo-index.json');u.searchParams.set('echo_source',n.endpoint.source_id);u.searchParams.set('return',currentUrl());return u.pathname+u.search}
async function makeRidePacket(n=current){
  if(!n)throw Error('PASSAGE_NO_NODE');const raw=await sourceText(n),meta=sourceMeta(n.endpoint.source_id);if(!meta)throw Error('PASSAGE_SOURCE_META');
  const mod=await import('/fold-bloom/read-course.js');const fp=meta.source_fingerprint||null;
  const packet=mod.makeReadRidePacket({source:raw,label:'PRISON AGE · '+n.endpoint.title,sourceIdentity:{address:n.endpoint.path,hash:fp?fp.algo+':'+fp.value:undefined,kind:'PRISON_AGE_SOURCE',format:'MD',authority:'PRISON_AGE'},focus:{char_index:Number(n.endpoint.start)},from:currentUrl(),returnAddress:currentUrl()});
  packet.echo={index:'/prison-age/echo-index.json',source_id:n.endpoint.source_id,source_path:n.endpoint.path,source_fingerprint:fp,authority:'EVIDENCE_ONLY'};
  packet.passage={schema:CORE.SCHEMA,route:CORE.routePacket(atlas,trail),held:n.key};return packet
}
async function rideCurrent(){
  try{const mod=await import('/fold-bloom/read-course.js'),packet=await makeRidePacket();sessionStorage.setItem(mod.READ_RIDE_STORAGE,JSON.stringify(packet));$('papState').textContent='RIDE READY · exact source + exact char address · RETURN PASSAGE';location.href='/fold-bloom/live/?source=readfield&course=STEP'}catch(e){$('papState').textContent='RIDE REJECTED · '+String(e.message||e)}
}
function renderReturn(){
  if(!trail.length)return renderIntro();renderSeq++;const packet=CORE.routePacket(atlas,trail);mode='RETURN';$('papIntro').hidden=true;$('papRoute').classList.remove('on');$('papReturn').classList.add('on');
  $('papReturnBody').innerHTML=packet.nodes.map((n,i)=>{const seam=i?'<div class="papSeam">'+esc(transitionLabel(packet.nodes[i-1].key,n.key))+'</div>':'';return seam+'<div class="papReturnNode"><div class="src">'+String(i+1).padStart(2,'0')+' · '+esc(n.title)+' · '+esc(n.address)+'</div><p>'+esc(n.text)+'</p></div>'}).join('');
  $('papReturnMeta').textContent=packet.nodes.length+' exact source spans · '+packet.transitions.filter(x=>x.kind==='CROSS_ECHO').length+' cross-source echoes · '+packet.transitions.filter(x=>x.kind==='TURN_SOURCE').length+' source turns · authority EVIDENCE ONLY';renderTrail();writeUrl()
}
async function copyRoute(){
  const packet=CORE.routePacket(atlas,trail),share=location.origin+currentUrl(),payload=JSON.stringify({...packet,share},null,2);try{await navigator.clipboard.writeText(payload)}catch(_){const t=document.createElement('textarea');t.value=payload;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove()}$('papCopy').textContent='COPIED WITNESS';setTimeout(()=>$('papCopy').textContent='COPY WITNESS',1000)
}
async function shareRoute(){
  const url=location.origin+currentUrl();if(navigator.share){try{await navigator.share({title:'PRISON AGE / PASSAGE',url});return}catch(_){}}
  try{await navigator.clipboard.writeText(url);$('papShare').textContent='LINK COPIED';setTimeout(()=>$('papShare').textContent='SHARE PASSAGE',1000)}catch(_){location.hash='share'}
}
function open(){
  $('paPassage').hidden=false;const raw=new URLSearchParams(location.search).get('trail'),v=CORE.validateTrail(atlas,CORE.decodeTrail(raw));trail=v.ok?v.trail:[];if(trail.length)void renderNode();else renderIntro()
}
function close(){renderSeq++;current=null;$('paPassage').hidden=true;const u=new URL(location.href);u.searchParams.delete('passage');u.searchParams.delete('trail');history.replaceState(null,'',u.pathname+u.search+u.hash)}
function rootRide(){const meta=pack?.stories?.['proto-root-2021'];if(!meta?.authored_reader)return;const u=new URL(meta.authored_reader.target,location.origin);u.searchParams.set('reader_return',currentUrl());location.href=u.pathname+u.search}
function reset(){trail=[];renderIntro()}
function mount(){
  let b=$('passageBtn');if(!b){b=document.createElement('button');b.id='passageBtn';b.type='button';b.textContent='PASSAGE';const head=document.querySelector('.head');head?.insertBefore(b,head.firstElementChild)}b.onclick=open
}
async function init(){
  style();const box=document.createElement('section');box.id='paPassage';box.className='paPassage';box.hidden=true;box.innerHTML=`<div class="papShell"><header class="papHead"><div><div class="papEy">PRISON AGE / EXACT SOURCE ROUTE</div><h2>PASSAGE</h2></div><div class="papHeadActions"><button id="papShare">SHARE PASSAGE</button><button id="papClose">RETURN SOURCE</button></div></header><main class="papMain"><section id="papIntro" class="papIntro"><div class="papEy">NOT A GENERATED STORY</div><h3>THE STORY IS <b>THE PATH</b></h3><div class="papIntroLaw">Choose an exact authored fragment. CROSS ECHO may move only across one shipped lexical/phrase relation. TURN stays inside the same source and moves to another evidenced relation. Nothing between fragments is written for you.</div><div class="papRoot"><div><div class="papEy">2021 / PROVENANCE-DISTINCT ROOT</div><strong>PRISON AGE · 9 GATE CITY · SINGAPORE</strong><span>Recovered authored fragment. Separate recurrence law; not flattened into the 2026 cross-source atlas.</span></div><button id="papRootRide">RIDE ROOT</button></div><div id="papDoors" class="papDoors"></div></section><section id="papRoute" class="papRoute"><div class="papStage"><div id="papSource" class="papSource">—</div><div id="papFragment" class="papFragment">—</div><div id="papContext" class="papContext"></div><div id="papEvidence" class="papEvidence"></div><div class="papActions"><button id="papCross" class="papCross">CROSS ECHO</button><a id="papRead" class="papRead">READ CONTEXT</a><button id="papRide" class="papRide">RIDE CONTEXT</button><a id="papRaw">SOURCE</a><button id="papReturnBtn">RETURN / SEE PASSAGE</button></div><div id="papTurns" class="papTurns"></div></div><aside class="papTrail"><h4>YOUR PASSAGE</h4><div id="papTrailList"></div><div id="papTrailLaw" class="papTrailLaw"></div></aside></section><section id="papReturn" class="papReturn"><div class="papEy">RETURN / READER-MADE SEQUENCE</div><h3>WHAT <b>SURVIVED</b></h3><div id="papReturnMeta" class="papEvidence"></div><div id="papReturnBody"></div><div class="papReturnActions"><button id="papAgain">BEGIN AGAIN</button><button id="papCopy">COPY WITNESS</button><button id="papShare2">SHARE PASSAGE</button></div></section></main><footer class="papStatus"><span id="papState">SOURCE-DERIVED · EVIDENCE ONLY</span><span><b>RECURRENCE ≠ ECHO ≠ NARRATIVE CLAIM</b></span></footer></div>`;document.body.appendChild(box);mount();
  [atlas,pack]=await Promise.all([fetch(ATLAS,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('ATLAS '+r.status);return r.json()}),fetch(PACK,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('PACK '+r.status);return r.json()})]);
  $('papClose').onclick=close;$('papShare').onclick=shareRoute;$('papShare2').onclick=shareRoute;$('papReturnBtn').onclick=renderReturn;$('papAgain').onclick=reset;$('papCopy').onclick=copyRoute;$('papRootRide').onclick=rootRide;
  $('papTurns').onclick=e=>{const b=e.target.closest?.('[data-turn]');if(b&&$('papTurns').contains(b))move(b.dataset.turn)};
  if(bootQuery.get('passage')==='1')open()
}
root.PrisonAgePassage=Object.freeze({open,close,reset,renderReturn,makeRidePacket,packet:()=>atlas?CORE.routePacket(atlas,trail):null,snapshot:()=>({mode,trail:[...trail],current:current?current.key:null,url:currentUrl(),renderSeq})});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>void init().catch(e=>console.warn('PASSAGE',e)));else void init().catch(e=>console.warn('PASSAGE',e));
})(globalThis);
