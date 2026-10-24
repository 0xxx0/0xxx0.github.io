import {hashText} from '../lib/id.js';
import {esc,download} from '../lib/dom.js';
import {compile,at,level,containing,neighbors,describe,focusChar,zoomScope,patch,relation,validRelation,relationDoors,validateAttention,charIn,clamp,MAX_BYTES,RELATIONS} from './navigation.mjs';
const scriptLoads=new Map();let catalogPromise;
function sourceScript(path,key){
 if(globalThis[key])return Promise.resolve();
 if(!scriptLoads.has(path))scriptLoads.set(path,new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=path;s.onload=resolve;s.onerror=()=>reject(Error('Could not load '+path));document.head.append(s)}));
 return scriptLoads.get(path);
}
async function dependencies(){
 await sourceScript('/lib/document-structure.js','FieldDocumentStructure');
 await sourceScript('/lib/read-trail.js','FieldSourceTrail');
 await sourceScript('/field-aperture.js?v=0.8.7','FieldAperture');
 if(!document.querySelector('[data-interphase-continuum]')){const l=document.createElement('link');l.rel='stylesheet';l.href='/interphase/continuum.css?v=0.10.0';l.dataset.interphaseContinuum='';document.head.append(l)}
}
function safePath(value){if(!value)return '';try{const u=new URL(value,location.href);return u.origin===location.origin?u.pathname+u.search+u.hash:''}catch{return ''}}
function sourcePath(value){const p=safePath(value);return p&&/\.(json|txt|md|markdown|csv|log|ya?ml)(?:\?|$)/i.test(p.split('#')[0])?p.split('#')[0]:''}
const SHA256=/^sha256:[a-f0-9]{64}$/i,DOOR_LIMIT=64,DOOR_DEPTH=16;
function validEnd(e){return !!e&&typeof e==='object'&&!!sourcePath(e.address)&&SHA256.test(e.hash||'')&&Number.isInteger(e.start)&&Number.isInteger(e.end)&&e.start>=0&&e.end>e.start&&e.end-e.start<=20000&&typeof e.scope==='string'&&e.scope.length<=120&&typeof e.quote==='string'&&e.quote.length===e.end-e.start}
function validDoor(d){return !!d&&RELATIONS.includes(d.type)&&d.authority==='INTERPRETATION_ONLY'&&validEnd(d.from)&&validEnd(d.to)&&!(d.from.hash===d.to.hash&&d.from.address===d.to.address)&&d.from.address.length<=1024&&d.to.address.length<=1024}
function validDoorFrame(f){return !!f&&validEnd(f.at)&&f.attention&&typeof f.label==='string'&&f.label.length<=180&&Array.isArray(f.links)&&f.links.length<=128&&Array.isArray(f.marks)&&f.marks.length<=256&&Array.isArray(f.frames)&&f.frames.length<=64&&f.frames.every(x=>x.hash===f.at.hash)}

async function manifest(refresh=false){
 if(refresh)catalogPromise=null;
 if(!catalogPromise)catalogPromise=(async()=>{const r=await fetch('/showcase-manifest.json',{cache:'no-store'});if(!r.ok)throw Error('FIELD source unavailable.');const raw=await r.text(),data=JSON.parse(raw),spans=FieldAperture.jsonSpans(raw),routeSpans=spans.filter(n=>/^\$\.routes\[\d+\]$/.test(n.path)).map(n=>({...n,routeIndex:Number(n.path.match(/\[(\d+)\]$/)[1])}));return{raw,data,spans,routeSpans,hash:await hashText(raw)}})().catch(e=>{catalogPromise=null;throw e});
 return catalogPromise;
}
async function mountContinuum(target,{route='/',onRoute=()=>{},onFocus=()=>{}}={}){
 await dependencies();
 const root=document.createElement('section');root.className='ip-continuum';root.dataset.view='plain';
 root.innerHTML=`<header class="ip-heading"><button class="ip-source" data-ip="source" aria-expanded="false"><b>INTERPHASE</b><span data-ip="label">Opening source…</span></button><button data-ip="view" aria-label="Change perspective">WALK ↗</button></header>
 <section class="ip-drawer" data-ip="drawer" hidden aria-label="Source and work"><div class="ip-drawer-head"><b>SOURCE</b><button data-ip="close">CLOSE ×</button></div>
 <form data-ip="path-form" class="ip-row"><input data-ip="path" aria-label="Source address" placeholder="/path/to/text.md or JSON"><button>OPEN</button><label class="ip-button">FILE<input data-ip="file" type="file" accept="text/*,.txt,.md,.markdown,.json,.csv,.log" hidden></label><button type="button" data-ip="field">FIELD</button></form>
 <details><summary>Paste text / JSON</summary><textarea data-ip="paste" aria-label="Paste source" placeholder="Bring the actual source."></textarea><button data-ip="load-paste">OPEN PASTE</button></details>
 <form data-ip="find-form" class="ip-row"><input data-ip="find" type="search" maxlength="200" aria-label="Find words in source" placeholder="Find words · warp this reading"><button>FIND</button><button type="button" data-ip="clear">CLEAR</button></form>
 <div class="ip-row"><label>Scope <select data-ip="scope" aria-label="Scope"></select></label><label>WPM <input data-ip="wpm" type="number" min="60" max="6000" step="20" value="260" aria-label="Words per minute"></label><button data-ip="mark">MARK</button><button data-ip="marks">NEXT MARK</button></div>
 <div class="ip-row"><button data-ip="edit">EDIT THIS RANGE</button><button data-ip="undo" disabled>UNDO</button><button data-ip="redo" disabled>REDO</button></div>
 <details><summary>Connect passages / sources</summary><p>HOLD FIRST → open another text/JSON source → CONNECT HERE. Local links stay local; cross-source DOORs verify both revisions and RETURN precisely.</p><div class="ip-row"><button data-ip="link-start">HOLD FIRST</button><select data-ip="relation" aria-label="Relation type">${RELATIONS.map(x=>`<option>${x}</option>`).join('')}</select><button data-ip="link-end" disabled>CONNECT HERE</button></div><p data-ip="link-note"></p></details>
 <div class="ip-row"><button data-ip="export">EXPORT RETURN</button><label class="ip-button">IMPORT RETURN<input data-ip="import" type="file" accept="application/json,.json" hidden></label><a data-ip="reader" href="/docs/">READER ↗</a><a data-ip="wrist" href="/rsvp/">WRIST ↗</a></div>
 <details><summary>Exact source / retained tools</summary><p data-ip="identity"></p><button data-ip="raw-open">SHOW EXACT RANGE</button><pre data-ip="raw" hidden></pre><div class="ip-doors" data-ip="more-ports"></div><p><a href="/interphase/?legacy=1">Recovered Ω / history / Dayline / AXIS workbench ↗</a> · <a href="/?work=0">Native FIELD map ↗</a> · <a href="/interphase/SPEC.md">Specification ↗</a></p><p>Search is lexical. Links are interpretations. Native effects stay with their host. The exported RETURN carries the current revision, not the session undo stack.</p></details></section>
 <p class="ip-status" data-ip="status" role="status">Opening the source.</p>
 <div class="ip-space" data-ip="space" tabindex="0" aria-label="Source space. Left/right move, up widens scope, down narrows scope, space reads."><div class="ip-scene">
 <article class="ip-passage ip-before"><button data-ip="before" aria-label="Previous source range"></button></article>
 <article class="ip-passage ip-held" data-ip="held"><div class="ip-range"><span data-ip="range"></span><button data-ip="back" hidden>↶ RETURN</button></div><h1 data-ip="title"></h1><div class="ip-word" aria-hidden="true"><span data-ip="word-before"></span><b data-ip="word-mark"></b><span data-ip="word-after"></span></div><div class="ip-body" data-ip="body"></div><p class="ip-residue" data-ip="residue"></p><div class="ip-doors" data-ip="doors"></div></article>
 <article class="ip-passage ip-after"><button data-ip="after" aria-label="Next source range"></button></article>
 </div></div>
 <div class="ip-axis"><button data-ip="widen" aria-label="Widen scope">−</button><svg data-ip="ring" viewBox="0 0 180 180" role="slider" tabindex="0" aria-label="Source position and scope" aria-valuemin="0" aria-valuemax="100"><circle class="ip-track" cx="90" cy="90" r="69"/><circle class="ip-scope-track" cx="90" cy="90" r="45"/><path class="ip-window" data-ip="window"/><circle class="ip-dot" data-ip="dot" r="6"/><text x="90" y="82" text-anchor="middle" data-ip="scope-label"></text><text x="90" y="102" text-anchor="middle" data-ip="position-label"></text></svg><button data-ip="narrow" aria-label="Narrow scope">+</button></div>
 <nav class="ip-transport" aria-label="Traversal"><button data-ip="previous" aria-label="Previous">←</button><button data-ip="play">▶ READ</button><button data-ip="next" aria-label="Next">→</button></nav>
 <section class="ip-editor" data-ip="editor" hidden role="dialog" aria-modal="true" aria-label="Local source edit"><b data-ip="edit-range"></b><textarea data-ip="replacement" aria-label="Replacement source text" maxlength="100000"></textarea><div class="ip-row"><button data-ip="commit">COMMIT LOCAL EDIT</button><button data-ip="cancel">CANCEL</button></div><p>Only this exact range changes. Native source ownership stays unchanged.</p></section>`;
 target.append(root);
 const el=id=>root.querySelector(`[data-ip="${id}"]`);
 let ap=null,source=null,model=null,catalog=null,nativeRecord=null,activeRoute=null,lastNotifiedRoute=null,scope='PARA',view='plain',query='',links=[],doors=[],doorFrames=[],marks=[],frames=[],undo=[],redo=[],pendingLink=null,editing=null,epoch=0,loading=false,disposed=false,lastPersist=0,persistTimer=null,bodyKey='';
 const snap=()=>ap?.snapshot(),char=()=>snap()?.char_index??0;
 const attention=()=>({char:char(),scope,view,wpm:snap()?.wpm||260,query});
 const frame=()=>({hash:source.hash,...attention()});
 const endpoint=()=>{const u=at(model,char(),scope);return{address:sourcePath(source.address),hash:source.hash,start:u.start,end:u.end,scope,quote:source.raw.slice(u.start,u.end)}};
 async function verifiedEnd(e){
  if(!validEnd(e))throw Error('DOOR endpoint has no verifiable source address.');
  const request=epoch,r=await fetch(e.address,{cache:'no-store'});
  if(!r.ok)throw Error('DOOR source unavailable: HTTP '+r.status);
  const raw=await r.text();
  if(request!==epoch||disposed)throw Error('DOOR cancelled by newer source request.');
  const digest=await hashText(raw);if(request!==epoch||disposed)throw Error('DOOR cancelled by newer source request.');
  if(digest!==e.hash||raw.slice(e.start,e.end)!==e.quote)throw Error('DOOR revision/quote drift. Current source unchanged.');
  return raw;
 }
 async function cross(e,remember=true){
  const raw=await verifiedEnd(e);
  const from=remember?{at:endpoint(),label:source.label,attention:attention(),links:structuredClone(links),marks:[...marks],frames:structuredClone(frames),returnTo:source.returnTo}:null;
  const request=++epoch;
  await load(raw,e.address.split('/').at(-1),e.address,{request,hash:e.hash,attention:{...attention(),char:e.start,scope:e.scope,query:''}});
  if(from){doorFrames.push(from);if(doorFrames.length>DOOR_DEPTH)doorFrames.shift()}
  persist(snap(),true);
 }
 const revision=()=>({source:{...source},attention:attention(),links:structuredClone(links),doors:structuredClone(doors),doorFrames:structuredClone(doorFrames),marks:[...marks],frames:structuredClone(frames),catalog,nativeRecord,activeRoute});
 function checkpoint(){undo.push(revision());if(undo.length>16)undo.shift();redo=[]}
 function status(message,error=false){el('status').textContent=message;if(error)el('status').dataset.error='1';else delete el('status').dataset.error}
 const run=fn=>async e=>{try{await fn(e)}catch(error){status(error.message||String(error),true)}};
 function drawer(show){el('drawer').hidden=!show;el('source').setAttribute('aria-expanded',String(show));if(show){ap?.stop();el('find').focus()}else el('space').focus({preventScroll:true})}
 function persist(s=snap(),force=false){
  if(!source||!s||loading||disposed)return;
  const now=Date.now(),interval=s.playing?1000:250;
  if(!force&&now-lastPersist<interval){if(!persistTimer)persistTimer=setTimeout(()=>{persistTimer=null;persist(snap(),true)},interval-(now-lastPersist));return}
  if(persistTimer){clearTimeout(persistTimer);persistTimer=null}lastPersist=now;
  const key=FieldSourceTrail.sourceKey({address:source.address,id:source.hash});
  FieldSourceTrail.record(key,{charIndex:s.char_index,address:s.address,scale:s.scale,wpm:s.wpm,progress:s.source_progress,focus:s.focus,via:'INTERPHASE'});
  try{sessionStorage.setItem('interphase.continuum.v1',JSON.stringify({source:{raw:source.raw,label:source.label,address:source.address,hash:source.hash},attention:attention(),links,doors,doorFrames,marks,frames:frames.filter(f=>f.hash===source.hash).slice(-64),returnTo:source.returnTo}))}
  catch{if(!root.dataset.storage){root.dataset.storage='session-only';status('This source remains here; export RETURN to keep it.',true)}}
 }
 function seek(c,{remember=false}={}){
  if(!source)return;ap.stop();if(remember){frames.push(frame());if(frames.length>64)frames.shift()}
  ap.selectChar(clamp(c,0,source.raw.length-1));bodyKey='';paint();persist();
 }
 function walk(direction){
  if(!model)return;const n=neighbors(model,char(),scope,query),unit=direction<0?n.before:n.after;
  if(!unit)return status(direction<0?'Beginning of this reading.':'End of this reading.');
  seek(focusChar(model,unit),{remember:true});
 }
 function setScope(id){if(!model||!model.levels.some(l=>l.id===id))return;ap.stop();scope=id;bodyKey='';paint();persist()}
 function zoom(direction){
  if(!model)return;const next=zoomScope(model,char(),scope,direction);
  if(next===scope)return status('No further source scope at this exact position.');setScope(next);
 }
 function perspective(next){
  view=next==='walk'?'walk':'plain';root.dataset.view=view;el('view').textContent=view==='walk'?'PLAIN ↙':'WALK ↗';el('view').setAttribute('aria-pressed',String(view==='walk'));paint();persist();
 }
 function highlight(body,start,text,anchor){
  const word=model.words.find(w=>w.start<=anchor&&anchor<w.end);
  if(!word||word.start<start||word.end>start+text.length){body.textContent=text;return}
  const m=document.createElement('mark');m.textContent=text.slice(word.start-start,word.end-start);
  body.replaceChildren(document.createTextNode(text.slice(0,word.start-start)),m,document.createTextNode(text.slice(word.end-start)));
 }
 function nativeActions(){
  if(!source?.trusted||!nativeRecord)return [];
  const native=globalThis.FieldIndexReadModel?.actions?.(nativeRecord.href);
  const actions=(native||nativeRecord.field?.exit_paths?.filter(x=>String(x.status).toUpperCase()==='AVAILABLE'&&x.target)||[]).slice(0,3);
  return actions.length?actions:nativeRecord.href!=='/'?[{label:'OPEN',target:nativeRecord.href,authority:'NAVIGATION_ONLY'}]:[];
 }
 function paint(){
  if(!model||!ap||disposed||loading)return;
  const s=snap(),anchor=s.char_index,n=neighbors(model,anchor,scope,query),u=n.current,d=describe(model,u);
  if(catalog&&source.trusted){const row=catalog.routeSpans.find(r=>r.start<=anchor&&anchor<r.end);nativeRecord=row?catalog.data.routes[row.routeIndex]:null;activeRoute=nativeRecord?.href||null}
  root.dataset.view=view;root.dataset.playing=s.playing?'1':'0';root.dataset.sourceHash=source.hash;root.dataset.anchor=String(anchor);root.dataset.scope=scope;
  el('label').textContent=source.label;el('range').textContent=`${level(model,scope).label} · ${u?.path||''} · ${u?.start??0}–${u?.end??0}`;
  el('scope').value=scope;el('scope-label').textContent=level(model,scope).label;el('position-label').textContent=`${Math.max(0,n.index+1)} / ${n.units.length}`;
  el('wpm').value=s.wpm;el('play').textContent=s.playing?'Ⅱ PAUSE':'▶ READ';el('back').hidden=!frames.length&&!doorFrames.length&&!source.returnTo;
  el('view').textContent=view==='walk'?'PLAIN ↙':'WALK ↗';el('previous').disabled=!n.before;el('next').disabled=!n.after;
  for(const [id,node] of [['before',n.before],['after',n.after]]){const a=describe(model,node);el(id).disabled=!node;el(id).textContent=node?(a.title||a.body).slice(0,180):(id==='before'?'BEGINNING':'END')}
  const key=[source.hash,u?.path,u?.start,scope,query].join('|');
  if(bodyKey!==key){
   bodyKey=key;el('title').textContent=d.title||(model.kind==='TEXT'?containing(model.sections,anchor)?.key:'')||'';el('title').hidden=!el('title').textContent;
   const detailScope=model.kind==='TEXT'&&['WORD','PHRASE','SENT'].includes(scope)?at(model,anchor,'PARA'):u;
   const detail=describe(model,detailScope),text=detail.body.slice(0,5000);
   el('body').dataset.start=String(detailScope?.start||0);el('body').dataset.exactText=model.kind==='TEXT'?'1':'0';el('body').dataset.bodyText=text;el('body').textContent=text;
   el('residue').dataset.base=[d.hidden?`${d.hidden} other fields · exact range in SOURCE`:'',detail.body.length>5000?`${detail.body.length-5000} characters beyond this aperture`:'',u&&!(u.start<=anchor&&anchor<u.end)?'Caret is outside this scope; the nearest range is shown. Widen to inspect.':'',query?`${n.units.length} / ${n.total} units match “${query}” · lexical order`:n.total>1?`${n.total-1} other ranges remain in the source`:''].filter(Boolean).join(' · ');
   el('raw').hidden=true;
  }
  if(el('body').dataset.exactText==='1')highlight(el('body'),Number(el('body').dataset.start),el('body').dataset.bodyText,anchor);
  const word=model.words.find(w=>w.start<=anchor&&anchor<w.end)||model.words[0],p=FieldAperture.orpParts(word?.text||s.focus||'');
  el('word-before').textContent=p.before;el('word-mark').textContent=p.mark;el('word-after').textContent=p.after;
  const range=at(model,anchor,scope),f=range?clamp((anchor-range.start)/Math.max(1,range.end-range.start-1),0,1):0,angle=-Math.PI/2+2*Math.PI*f;
  el('dot').setAttribute('cx',String(90+69*Math.cos(angle)));el('dot').setAttribute('cy',String(90+69*Math.sin(angle)));
  el('ring').setAttribute('aria-valuenow',String(Math.round(100*f)));el('ring').setAttribute('aria-valuetext',`${level(model,scope).label}, character ${anchor}`);
  const a0=-Math.PI/2+2*Math.PI*(range?.start||0)/source.raw.length,a1=-Math.PI/2+2*Math.PI*(range?.end||0)/source.raw.length;
  el('window').setAttribute('d',`M ${90+78*Math.cos(a0)} ${90+78*Math.sin(a0)} A 78 78 0 ${a1-a0>Math.PI?1:0} 1 ${90+78*Math.cos(a1-.0001)} ${90+78*Math.sin(a1-.0001)}`);
  el('doors').replaceChildren();el('more-ports').replaceChildren();const port=node=>(el('doors').children.length<3?el('doors'):el('more-ports')).append(node);
  for(const door of relationDoors(model,source.hash,links,anchor)){
   const b=document.createElement('button');b.className='ip-relation';b.textContent=`${door.direction} ${door.type} · ${door.destination.quote.slice(0,85)}`;b.title='Authored interpretation with exact source quotes';
   b.onclick=()=>{frames.push(frame());if(frames.length>64)frames.shift();scope=door.destination.scope;seek(door.destination.start);status('Followed the '+door.type+' relation. RETURN restores the exact departure and scope.')};port(b);
  }
  for(const d of doors.filter(validDoor)){
   const forward=d.from.hash===source.hash&&d.from.address===source.address&&anchor>=d.from.start&&anchor<d.from.end;
   const reverse=d.to.hash===source.hash&&d.to.address===source.address&&anchor>=d.to.start&&anchor<d.to.end;
   if(!forward&&!reverse)continue;
   const to=forward?d.to:d.from,b=document.createElement('button');
   b.className='ip-relation';b.textContent='DOOR '+(forward?'→ ':'← ')+d.type+' · '+to.address+' · '+to.quote.slice(0,55);
   b.title='Cross-source interpretation. Destination bytes and quote verified before crossing; RETURN restores exact departure.';
   b.onclick=run(()=>cross(to));port(b);
  }
  for(const action of nativeActions()){const a=document.createElement('a');a.href=action.target;a.textContent=(action.label||action.via||action.class||'OPEN')+' ↗';a.title='Native owner: '+(nativeRecord.field?.owner||'FIELD ROUTE');port(a)}
  if(source.returnTo){const a=document.createElement('a');a.href=source.returnTo;a.textContent='↩ CALLER';port(a)}
  el('residue').textContent=[el('residue').dataset.base,el('more-ports').children.length?`${el('more-ports').children.length} other moves retained in SOURCE`:''].filter(Boolean).join(' · ');
  el('undo').disabled=!undo.length;el('redo').disabled=!redo.length;
  el('identity').textContent=`${source.hash} · ${source.address||'held source'} · ${source.raw.length} characters · ${links.length} local links · ${doors.length} source doors`;
  onFocus({id:source.hash,label:nativeRecord?.title||source.label,route:activeRoute,char:anchor,scope,scopeLabel:level(model,scope).label,view,playing:s.playing,index:n.index+1,count:n.units.length,back:frames.length||!!source.returnTo});
  if(activeRoute&&activeRoute!==lastNotifiedRoute){lastNotifiedRoute=activeRoute;const hash=source.hash,href=activeRoute;queueMicrotask(()=>{if(source?.hash===hash&&activeRoute===href)onRoute(href)})}
 }
 async function prepare(raw,label,address,opt={}){
  if(typeof raw!=='string'||!raw.trim())throw Error('Choose a non-empty source.');
  if(new TextEncoder().encode(raw).length>MAX_BYTES)throw Error('Source exceeds 2 MB.');
  if(typeof raw.isWellFormed==='function'&&!raw.isWellFormed())throw Error('Source contains an unpaired Unicode surrogate.');
  const hash=await hashText(raw);if(opt.hash&&opt.hash!==hash)throw Error('Source revision mismatch.');
  let json=null,spans=[];
  try{JSON.parse(raw);spans=FieldAperture.jsonSpans(raw);if(spans.some(n=>n.ambiguous))throw Error('Repeated JSON keys have ambiguous source addresses.');json=FieldAperture.analyze(raw,label,'en','AUTO')}
  catch(error){if(/\.json(?:#|$)/i.test(address||label)||/^\s*[\[{]/.test(raw))throw Error('Invalid or unsupported JSON: '+error.message)}
  const candidate=document.createElement('field-aperture');candidate.hidden=true;candidate.setAttribute('headless','');candidate.setAttribute('aria-hidden','true');root.append(candidate);
  try{
   candidate.load(raw,{label,format:json?'TXT':'AUTO',scale:'WORD',wpm:opt.attention?.wpm||260,charIndex:opt.attention?.char??0});
   const next=compile(raw,candidate.A,json,spans),defaultScope=next.kind==='JSON'?(Array.isArray(json.data)?'COLLECTION:$':'ROOT'):(next.levels.some(l=>l.id==='PARA')?'PARA':next.levels[0].id);
   const desired={char:0,scope:defaultScope,view,query:'',wpm:260,...opt.attention};
   if(opt.rebase&&!next.levels.some(l=>l.id===desired.scope))desired.scope=defaultScope;
   const a=validateAttention(next,desired),nextLinks=opt.links||[],nextMarks=opt.marks||[];
   if(!Array.isArray(nextLinks)||nextLinks.length>128||nextLinks.some(l=>!validRelation(next,hash,l)))throw Error('RETURN relation quotes or revision do not match.');
   if(!Array.isArray(nextMarks)||nextMarks.length>256||nextMarks.some(c=>!Number.isInteger(c)||c<0||c>=raw.length))throw Error('Invalid RETURN marks.');
   return{candidate,model:next,source:{raw,label:String(label||'Untitled').slice(0,180),address:safePath(address),hash,trusted:!!opt.trusted,returnTo:safePath(opt.returnTo)},attention:a,links:nextLinks,marks:nextMarks};
  }catch(error){candidate.remove();throw error}
 }
 async function load(raw,label,address='',opt={}){
  const request=opt.request??++epoch;if(request!==epoch||disposed)return;ap?.stop();
  const next=await prepare(raw,label,address,opt);if(request!==epoch||disposed){next.candidate.remove();return}
  loading=true;ap?.remove();ap=next.candidate;source=next.source;model=next.model;scope=next.attention.scope;view=next.attention.view;query=next.attention.query;links=structuredClone(next.links);doors=structuredClone(opt.doors??doors);doorFrames=structuredClone(opt.doorFrames??doorFrames);marks=[...next.marks];frames=opt.frames||[];catalog=opt.catalog||null;nativeRecord=opt.nativeRecord||null;activeRoute=opt.route||null;lastNotifiedRoute=null;bodyKey='';
  ap.addEventListener('aperture-focus',()=>{paint();persist()});ap.selectChar(next.attention.char);ap.setWpm(next.attention.wpm);
  el('scope').innerHTML=model.levels.map(l=>`<option value="${esc(l.id)}">${esc(l.label)}</option>`).join('');
  el('find').value=query;el('link-end').disabled=!pendingLink;el('link-note').textContent=pendingLink?'First range held from '+(pendingLink.address||'unaddressed source'):'';
  if(!opt.keepHistory){undo=[];redo=[]}
  loading=false;paint();persist(snap(),true);drawer(false);status(`${model.kind==='JSON'?'Structured source':'Exact source'} · ${model.words.length} units · ← → move · − + scope · READ`);
  return api.snapshot();
 }
 async function loadRoute(href){
  const request=++epoch;ap?.stop();const m=await manifest();if(request!==epoch||disposed)return;
  const index=m.data.routes.findIndex(r=>r.href===href);if(index<0)throw Error('Unknown FIELD route.');
  const range=m.routeSpans.find(r=>r.routeIndex===index);if(!range)throw Error('FIELD source range unavailable.');
  const readable=m.spans.find(n=>n.path===range.path+'.role')||m.spans.find(n=>n.path===range.path+'.title')||range;
  const result=await load(m.raw,'FIELD','/showcase-manifest.json',{request,catalog:m,trusted:true,route:href,attention:{scope:'COLLECTION:$.routes',char:readable.contentStart??readable.start}});
  if(result)route=href;return result;
 }
 async function openPath(value){
  const request=++epoch;ap?.stop();const path=safePath(value),u=path&&new URL(path,location.origin);
  if(!u||!/\.(json|txt|md|markdown|csv|log|ya?ml)$/i.test(u.pathname))throw Error('Use a same-origin text or JSON source.');
  const response=await fetch(u.pathname+u.search,{cache:'no-store'});if(!response.ok)throw Error('Source returned HTTP '+response.status);
  const raw=await response.text();if(request!==epoch||disposed)return;
  return load(raw,u.pathname.split('/').at(-1),u.pathname+u.search,{request});
 }
 async function restoreRevision(r){return load(r.source.raw,r.source.label,r.source.address,{...r.source,attention:r.attention,links:r.links,doors:r.doors,doorFrames:r.doorFrames,marks:r.marks,frames:r.frames,catalog:r.catalog,nativeRecord:r.nativeRecord,route:r.activeRoute,keepHistory:true})}
 async function returnStep(){
  if(doorFrames.length){
   const previous=doorFrames.at(-1);if(!validDoorFrame(previous))throw Error('Invalid DOOR return frame.');
   const raw=await verifiedEnd(previous.at),request=++epoch;
   await load(raw,previous.label,previous.at.address,{request,hash:previous.at.hash,attention:previous.attention,links:previous.links,marks:previous.marks,frames:previous.frames,returnTo:previous.returnTo});
   doorFrames.pop();persist(snap(),true);status('DOOR RETURN · exact prior source, revision, scope and cursor.');return;
  }
  const previous=frames.pop();
  if(previous&&previous.hash===source.hash){scope=previous.scope;query=previous.query;view=previous.view;ap.setWpm(previous.wpm);seek(previous.char);status('Returned to the exact departure.');paint()}
  else if(source?.returnTo){persist(snap(),true);location.href=source.returnTo}
  else status('No earlier source context is held.');
 }
 function packet(){return{schema:'interphase.continuation/v1',source:{raw:source.raw,label:source.label,address:source.address,hash:source.hash},attention:attention(),links:structuredClone(links),doors:structuredClone(doors),doorFrames:structuredClone(doorFrames),marks:[...marks],frames:frames.filter(f=>f.hash===source.hash).slice(-64),returnTo:source.returnTo,authority:'LOCAL_SOURCE_ONLY',residue:{undoFrames:undo.length,policy:'CURRENT_REVISION_ONLY; session undo is not transported; native ports are resolved from the current host, never imported'}}}
 async function importPacket(p){
  const request=++epoch;
  if(!p||p.schema!=='interphase.continuation/v1'||p.authority!=='LOCAL_SOURCE_ONLY'||typeof p.source?.raw!=='string'||typeof p.source?.hash!=='string'||typeof p.source?.label!=='string'||typeof p.source?.address!=='string'||!p.attention||!Array.isArray(p.links)||!Array.isArray(p.marks)||!Array.isArray(p.frames)||p.frames.length>64)throw Error('Unsupported RETURN.');
  if(p.source.address&&!safePath(p.source.address))throw Error('Unsupported RETURN source address.');
  if(p.returnTo&&!safePath(p.returnTo))throw Error('Unsupported RETURN destination.');
  const incomingDoors=p.doors??[],incomingFrames=p.doorFrames??[];
  if(!Array.isArray(incomingDoors)||incomingDoors.length>DOOR_LIMIT||incomingDoors.some(x=>!validDoor(x)))throw Error('Invalid cross-source DOOR.');
  if(!Array.isArray(incomingFrames)||incomingFrames.length>DOOR_DEPTH||incomingFrames.some(x=>!validDoorFrame(x)))throw Error('Invalid DOOR return stack.');
  const prepared=await prepare(p.source.raw,p.source.label,p.source.address,{hash:p.source.hash,attention:p.attention,links:p.links,marks:p.marks,returnTo:p.returnTo});
  try{validateAttention(prepared.model,p.attention);for(const f of p.frames){if(f.hash!==p.source.hash)throw Error('RETURN path revision mismatch.');validateAttention(prepared.model,f)}}finally{prepared.candidate.remove()}
  const live=p.source.address==='/showcase-manifest.json'?await manifest(true):null,current=live?.hash===p.source.hash;
  return load(p.source.raw,p.source.label,p.source.address,{request,catalog:current?live:null,trusted:current,hash:p.source.hash,attention:p.attention,links:p.links,marks:p.marks,frames:p.frames,doors:incomingDoors,doorFrames:incomingFrames,returnTo:p.returnTo});
 }
 el('source').onclick=()=>drawer(el('drawer').hidden);
 el('close').onclick=()=>{drawer(false);if(el('status').dataset.error)status('The held source is unchanged.')};
 el('view').onclick=()=>perspective(view==='walk'?'plain':'walk');
 el('previous').onclick=()=>walk(-1);el('next').onclick=()=>walk(1);el('before').onclick=()=>walk(-1);el('after').onclick=()=>walk(1);
 el('play').onclick=()=>{if(!ap)return;const s=snap();if(!s.playing&&s.index>=s.count-1)return status('End of source. Choose an earlier position to read again.');drawer(false);ap.toggleRSVP();paint()};
 el('widen').onclick=()=>zoom(-1);el('narrow').onclick=()=>zoom(1);el('scope').onchange=e=>setScope(e.target.value);el('wpm').onchange=e=>ap?.setWpm(e.target.value);
 el('back').onclick=run(returnStep);
 el('field').onclick=run(()=>loadRoute(route));
 el('path-form').onsubmit=run(e=>{e.preventDefault();return openPath(el('path').value)});
 el('load-paste').onclick=run(()=>load(el('paste').value,'Pasted source'));
 el('file').onchange=run(async e=>{const request=++epoch,f=e.target.files?.[0];if(!f)return;ap?.stop();if(f.size>MAX_BYTES)throw Error('File exceeds 2 MB.');await load(await f.text(),f.name,'',{request})});
 el('find-form').onsubmit=e=>{
  e.preventDefault();if(!model)return status('Choose a source first.');ap.stop();
  const previous=frame(),next=el('find').value.trim().slice(0,200);if(next!==query){frames.push(previous);if(frames.length>64)frames.shift()}
  query=next;bodyKey='';const n=neighbors(model,char(),scope,query);if(n.index<0&&n.units[0])seek(focusChar(model,n.units[0]));
  paint();persist();drawer(false);status(query?(n.units.length?'Lexical match order; source bytes unchanged.':'No matches; the previous range remains held.'):'Source order restored.');
 };
 el('clear').onclick=()=>{el('find').value='';el('find-form').dispatchEvent(new Event('submit',{cancelable:true}))};
 el('raw-open').onclick=()=>{if(!model)return;const u=at(model,char(),scope);el('raw').textContent=model.raw.slice(u.start,u.end);el('raw').hidden=false};
 el('mark').onclick=()=>{if(!source)return;if(!marks.includes(char())&&marks.length<256){checkpoint();marks.push(char())}status('Marked this exact source position.');paint();persist()};
 el('marks').onclick=()=>{if(!source)return;const all=[...marks].sort((a,b)=>a-b);if(!all.length)return status('No marks in this source.');seek(all.find(c=>c>char())??all[0],{remember:true});drawer(false)};
 el('link-start').onclick=()=>{if(!model)return;ap.stop();const u=at(model,char(),scope);pendingLink={hash:source.hash,address:sourcePath(source.address),span:{start:u.start,end:u.end,scope},quote:source.raw.slice(u.start,u.end)};el('link-note').textContent='Held: '+source.raw.slice(u.start,Math.min(u.end,u.start+120));el('link-end').disabled=false;drawer(false);status('First range held. Open another text/JSON source or move locally, then CONNECT HERE.')};
 el('link-end').onclick=run(()=>{
  if(!pendingLink)throw Error('HOLD FIRST before connecting.');
  const u=at(model,char(),scope),type=el('relation').value;
  if(pendingLink.hash===source.hash&&pendingLink.address===sourcePath(source.address)){
   if(links.length>=128)throw Error('128 relation limit.');
   const r=relation(model,source.hash,pendingLink.span,{...u,scope},type);
   checkpoint();links.push(r);status('Exact same-source relation connected.');
  }else{
   if(doors.length>=DOOR_LIMIT)throw Error('64 cross-source DOOR limit.');
   const start={address:pendingLink.address,hash:pendingLink.hash,...pendingLink.span,quote:pendingLink.quote},end=endpoint();
   const d={type,from:start,to:end,authority:'INTERPRETATION_ONLY'};
   if(!validDoor(d))throw Error('DOOR needs two distinct same-origin, revision-addressed text/JSON sources. File/paste and local drafts remain unaddressed.');
   checkpoint();doors.push(d);status('DOOR linked across two verified source addresses. RETURN will preserve exact departure.');
  }
  pendingLink=null;el('link-end').disabled=true;el('link-note').textContent='Connected; exact quote and revision are required at crossing.';paint();persist();drawer(false);
 });
 el('edit').onclick=()=>{if(!model)return;ap.stop();editing={hash:source.hash,span:{...at(model,char(),scope)}};el('replacement').value=model.raw.slice(editing.span.start,editing.span.end);el('edit-range').textContent=`LOCAL EDIT · ${editing.span.start}–${editing.span.end}`;el('editor').hidden=false;el('replacement').focus()};
 el('cancel').onclick=()=>{el('editor').hidden=true;editing=null};
 el('commit').onclick=run(async()=>{
  if(!editing||editing.hash!==source.hash)throw Error('The source changed while editing.');
  const change=patch(model,editing.span,el('replacement').value);
  if(!change.changed){el('editor').hidden=true;editing=null;return status('Exact source unchanged.')}
  const before=revision(),oldChar=char(),oldSpan=editing.span,delta=change.raw.length-source.raw.length;
  const nextChar=clamp(oldChar<oldSpan.start?oldChar:oldChar>=oldSpan.end?oldChar+delta:oldSpan.start+Math.min(oldChar-oldSpan.start,Math.max(0,change.span.end-change.span.start-1)),0,change.raw.length-1);
  await load(change.raw,source.label.replace(/ · local draft$/,'')+' · local draft','',{attention:{...attention(),char:nextChar},returnTo:source.returnTo,keepHistory:true,rebase:true});
  undo.push(before);if(undo.length>16)undo.shift();redo=[];el('editor').hidden=true;editing=null;paint();status('Local revision changed. Prior-revision links remain with UNDO; none silently rebound.');
 });
 el('undo').onclick=run(async()=>{if(!undo.length)return;const prior=undo.pop(),now=revision();await restoreRevision(prior);redo.push(now);paint();status('Restored exact prior bytes, annotations and attention.')});
 el('redo').onclick=run(async()=>{if(!redo.length)return;const next=redo.pop(),now=revision();await restoreRevision(next);undo.push(now);paint();status('Restored the exact local revision.')});
 el('export').onclick=run(()=>{if(!source)return;ap.stop();const data=JSON.stringify(packet(),null,2),blob=new Blob([data],{type:'application/json'});if(blob.size>16_000_000)throw Error('RETURN exceeds 16 MB; reduce quoted relations before exporting.');download('interphase-return.json',blob,'application/json');status('RETURN contains this exact source, focus, scopes and quoted links.')});
 el('import').onchange=run(async e=>{const request=++epoch,f=e.target.files?.[0];if(!f)return;if(f.size>16_000_000)throw Error('RETURN exceeds 16 MB.');const text=await f.text();if(request!==epoch)return;await importPacket(JSON.parse(text));drawer(false);status('RETURN verified; exact source and attention restored.')});
 function handoff(destination){
  if(!source)return;ap.stop();const s=snap(),returnAddress=location.pathname+location.search+location.hash;
  try{
   if(destination.startsWith('/docs/'))sessionStorage.setItem('readfield.handoff.v1',JSON.stringify({source:source.raw,label:source.label,focus:s,sourceIdentity:{id:source.hash,hash:source.hash,address:source.address,format:'TXT'},from:returnAddress,returnAddress}));
   else sessionStorage.setItem('rsvp.handoff.v1',JSON.stringify({raw:source.raw,label:source.label,hash:source.hash,sourceAddress:source.address,returnAddress,focus:s}));
  }catch(error){throw Error('Reader handoff unavailable: '+error.message)}
  persist(snap(),true);location.href=destination;
 }
 el('reader').onclick=run(e=>{e.preventDefault();handoff('/docs/?handoff=1')});el('wrist').onclick=run(e=>{e.preventDefault();handoff('/rsvp/?handoff=1')});
 let drag=null;
 const ringPoint=e=>{const r=el('ring').getBoundingClientRect(),x=(e.clientX-r.left)*180/r.width-90,y=(e.clientY-r.top)*180/r.height-90;return{x,y,r:Math.hypot(x,y)}};
 function ringMove(e){
  if(!drag||e.pointerId!==drag.id)return;const p=ringPoint(e),delta=p.r-drag.r;
  if(Math.abs(delta)>22){setScope(zoomScope(model,char(),drag.scope,delta>0?-1:1));return}
  const fraction=((Math.atan2(p.y,p.x)+Math.PI/2)/(Math.PI*2)+1)%1;ap.selectChar(charIn(model,drag.span,fraction));paint();persist();
 }
 el('ring').onpointerdown=e=>{if(!model)return;ap.stop();const p=ringPoint(e);drag={id:e.pointerId,r:p.r,scope,span:{...at(model,char(),scope)}};el('ring').setPointerCapture(e.pointerId);ringMove(e)};
 el('ring').onpointermove=ringMove;el('ring').onpointerup=e=>{drag=null;try{el('ring').releasePointerCapture(e.pointerId)}catch{}};el('ring').onpointercancel=()=>{drag=null};
 root.addEventListener('keydown',e=>{
  e.stopPropagation();
  if(e.key==='Escape'){e.preventDefault();if(!el('editor').hidden)el('cancel').click();else{ap?.stop();drawer(false)}return}
  if(!el('drawer').hidden||!el('editor').hidden||e.target.closest('input,textarea,select')||(e.key===' '&&e.target.closest('button,a')))return;
  const keys={ArrowLeft:()=>walk(-1),ArrowRight:()=>walk(1),ArrowUp:()=>zoom(-1),ArrowDown:()=>zoom(1),' ':()=>el('play').click()};if(keys[e.key]){e.preventDefault();keys[e.key]()}
 });
 el('body').onclick=e=>{
  if(model?.kind!=='TEXT'||snap()?.playing)return;
  const caret=document.caretPositionFromPoint?.(e.clientX,e.clientY)||document.caretRangeFromPoint?.(e.clientX,e.clientY),node=caret?.offsetNode||caret?.startContainer,offset=caret?.offset??caret?.startOffset;
  if(!node||!el('body').contains(node)||node.nodeType!==Node.TEXT_NODE)return;
  const range=document.createRange();range.selectNodeContents(el('body'));range.setEnd(node,offset);seek(Number(el('body').dataset.start)+range.toString().length);
 };
 async function command(text){
  const input=String(text).trim();
  if(!input.startsWith(':')){
   if(/^\/(?!\/)/.test(input)){if(/\.(md|txt|json|csv|log|ya?ml)(?:\?|$)/i.test(input))await openPath(input);else await loadRoute(input);return true}
   el('find').value=input;el('find-form').dispatchEvent(new Event('submit',{cancelable:true}));return true;
  }
  const m=input.match(/^:([a-z]+)(?:\s+([\s\S]*))?$/i);if(!m){status('Unsupported source command.');return false}
  const name=m[1].toLowerCase(),actions={source:()=>drawer(true),read:()=>el('play').click(),pause:()=>ap?.stop(),next:()=>walk(1),prev:()=>walk(-1),widen:()=>zoom(-1),narrow:()=>zoom(1),plain:()=>perspective('plain'),walk:()=>perspective('walk'),return:returnStep,undo:()=>el('undo').onclick(),redo:()=>el('redo').onclick(),find:()=>{el('find').value=m[2]||'';el('find-form').dispatchEvent(new Event('submit',{cancelable:true}))}};
  if(!actions[name]){status('That move is not supported in this source. The native FIELD map is under SOURCE.');el('space').focus();return false}
  await actions[name]();if(name!=='source'&&el('drawer').hidden)el('space').focus();paint();return true;
 }
 const visibility=()=>{if(document.hidden){ap?.stop();persist(snap(),true)}},leaving=()=>persist(snap(),true);
 document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',leaving);
 const api={
  root,load,loadRoute,openPath,seek,setScope,perspective,walk,packet,importPacket,command,stop:()=>ap?.stop(),refresh:paint,toggleSource:()=>drawer(el('drawer').hidden),returnStep,
  snapshot:()=>source?{source:{raw:source.raw,hash:source.hash,label:source.label,address:source.address},attention:attention(),links:structuredClone(links),doors:structuredClone(doors),doorFrames:structuredClone(doorFrames),frames:structuredClone(frames),edits:undo.length,playing:snap()?.playing,nativeRoute:activeRoute}:null,
  async resume(fallback=route){try{const p=JSON.parse(sessionStorage.getItem('interphase.continuum.v1')||'null');if(p?.source?.raw)return await importPacket({schema:'interphase.continuation/v1',authority:'LOCAL_SOURCE_ONLY',...p})}catch(error){status('Saved session held: '+error.message,true)}return loadRoute(fallback)},
  dispose(){disposed=true;++epoch;ap?.stop();if(persistTimer)clearTimeout(persistTimer);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',leaving);root.remove()}
 };
 return api;
}
export {dependencies,mountContinuum};
