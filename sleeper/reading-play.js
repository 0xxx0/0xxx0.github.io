/* SLEEPER READ PLAY — one Threadwalk model, new mobile-first reading projection.
   Lexical echoes are discovery hints, never semantic decisions or Gate proofs. */
(function(){
'use strict';
const query=new URLSearchParams(location.search);
if(query.get('bell')!=='1'&&query.get('read')!=='1')return;
const B=window.SleeperReadingBridge,T=window.Threadwalk,W=window.ThreadwalkWork;if(!B||!T)return;
const DEMO=[
'The bell rang once in the garden. Mara heard its bright edge and felt a brief pleasure. The sound ended before she could name it. Yet she stood still, listening for more.',
'She remembered a bell from childhood, and that memory made the garden seem familiar. The memory was not the sound. It had arrived after the sound had already faded.',
'When the next bell rang, Mara felt her attention lean toward it. She called this movement wanting. The feeling was real; it did not tell her what she had to do.',
'She walked along the path to hear it again. At the end of the path she found the same bell, still swinging. Walking had changed her place, not the sound that had brought her there.',
'The gardener asked what she was following: the bell, the pleasure, or the promise of another pleasure. Mara could point to the bell, but not to the promise.',
'She stayed when the bell was silent. Her hand tightened around the idea that it should ring again. The silence did not command her hand to tighten.',
'When she opened her hand, the bell remained where it was. The change was neither in the metal nor in the air. She could now leave the garden without needing the next sound.',
'Later she wrote a question in her notebook: what in this account was observed, and what was inferred? The bell could be checked. The promise of pleasure needed a different kind of evidence.'
].join('\n\n');
const style=':host{position:fixed;inset:0;z-index:100001;display:block;overflow:auto;background:#07131c;color:#e9ebe4;font:14px/1.5 system-ui,sans-serif}*{box-sizing:border-box}button,input,select,textarea{font:inherit}button{cursor:pointer;border:1px solid #50606a;color:#eceadd;background:#102530;border-radius:3px;min-height:42px;padding:9px 13px}button:focus-visible,input:focus-visible,textarea:focus-visible{outline:2px solid #edc780;outline-offset:3px}button:disabled{opacity:.38;cursor:not-allowed}.gold{background:#e7c17b;color:#081a22;border-color:#e7c17b;font-weight:700}.ghost{border-color:#344b54;background:transparent}.tiny{font:10px/1.5 ui-monospace,monospace;letter-spacing:.09em;color:#a8bbc1;text-transform:uppercase}.top{position:sticky;top:0;z-index:9;display:flex;align-items:center;justify-content:space-between;gap:12px;background:#091824f5;backdrop-filter:blur(12px);border-bottom:1px solid #29424b;padding:10px clamp(12px,3vw,32px)}.identity{font-weight:730;letter-spacing:-.04em;font-size:18px;white-space:nowrap}.identity i{color:#e7c17b;font-style:normal}.top .actions{display:flex;gap:6px}.top button{min-height:38px;padding:6px 11px;font-size:12px}.progress{height:3px;background:#2e4148}.progress>i{display:block;height:100%;background:#e8c17a}.layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(250px,320px);min-height:calc(100dvh - 92px)}.page{padding:clamp(22px,5vw,64px) clamp(18px,6vw,90px);max-width:930px;width:100%;margin:auto;align-self:center}.page h1{font:500 clamp(34px,5vw,65px)/1.08 Georgia,serif;letter-spacing:-.045em;margin:10px 0 12px;color:#f7e9d1}.deck{font-size:14px;color:#aabfc0;max-width:60ch}.paper{border-top:1px solid #49616a;margin-top:26px;padding:20px 0 10px}.kicker{color:#e0b778;font:11px/1.5 monospace;letter-spacing:.1em;text-transform:uppercase}.passage{font:clamp(24px,2.8vw,35px)/1.55 Georgia,serif;letter-spacing:-.012em;overflow-wrap:anywhere;color:#f3eee4;white-space:pre-wrap;max-width:42ch;margin:14px 0 19px}.paper.remote .passage{color:#c7dae0}.hint{font-size:12px;color:#a7bfc4}.sentence{border:0;background:transparent;border-radius:0;min-height:0;padding:1px 2px;color:inherit;font:inherit;text-align:left;display:inline;line-height:inherit;box-decoration-break:clone;-webkit-box-decoration-break:clone}.sentence:hover,.sentence:focus-visible{background:#24424e;color:#f9d898}.sentence.held{background:#79614366;box-shadow:inset 0 -2px #e4bf78}.sentence mark.echoWord{background:#4c564e;color:#f3d69c;border-bottom:1px dotted #efd18f}.quick{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0 4px}.quick button{min-height:36px;font-size:11px;background:#193541;border-color:#47646b;color:#eac78b;padding:7px 10px;max-width:100%;overflow-wrap:anywhere}.handle{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.handle button{font-size:12px}.status{margin:18px 0;padding:10px 12px;border-left:2px solid #d3af73;background:#132833;font-size:12px;color:#d3dcd9}.scrub{display:flex;gap:14px;align-items:center;margin-top:27px}.scrub input{accent-color:#e7bd73;flex:1;min-width:0;touch-action:pan-y}.scrub span{font:11px monospace;color:#bacacb;white-space:nowrap}.nextbar{position:sticky;bottom:0;background:#081823f7;border-top:1px solid #314d58;display:flex;justify-content:space-between;align-items:center;padding:12px clamp(18px,6vw,90px);gap:7px}.nextbar .left{display:flex;gap:7px}.side{border-left:1px solid #29434b;background:#0b1d27;padding:24px 16px;min-width:0}.side h2{font:11px monospace;letter-spacing:.12em;color:#e6be7d;margin:0 0 10px}.side section{padding-bottom:23px;margin-bottom:23px;border-bottom:1px solid #283e48}.echo{width:100%;text-align:left;margin:6px 0;padding:11px 10px;display:block}.echo b{display:block;color:#e9c689;font-size:11px;letter-spacing:.1em}.echo span{display:block;margin-top:5px;color:#d1dcd8;font:14px/1.45 Georgia,serif}.quote{padding:10px 12px;border-left:2px solid #debb7c;margin:10px 0;color:#e1e7e2;font:16px/1.5 Georgia,serif;overflow-wrap:anywhere}.compare textarea,.source textarea{width:100%;border:1px solid #57717b;background:#071923;color:#f1eee4;padding:13px;resize:vertical;min-height:90px}.compare select{width:100%;background:#122833;color:#f7ecd9;border:1px solid #57717b;padding:12px}.compare button{margin-top:8px}.notice{font:12px/1.5 system-ui;color:#e9c180}.rsvp{border:1px solid #44606a;background:#081b26;margin:16px 0;padding:20px 10px;text-align:center}.rsvpword{font:500 clamp(28px,5vw,54px)/1.4 ui-monospace,monospace;min-height:1.5em;white-space:nowrap}.rsvpword .orb{color:#efbc69}.rsvp .controls{display:flex;gap:8px;justify-content:center;align-items:center;flex-wrap:wrap}.rsvp select{background:#0f2b38;color:#f1eee4;padding:9px}.source{max-width:750px;margin:7vh auto;padding:0 22px 50px}.source h1{font:500 clamp(34px,7vw,70px)/1.08 Georgia,serif;color:#ebcb96}.source textarea{min-height:190px;font:15px/1.5 monospace}.source input{display:block;width:100%;padding:10px;background:#071923;color:#f1eee4;border:1px solid #57717b}.source .controls{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:12px}.source label{display:block;font-size:12px;color:#a5bbbf;margin:15px 0}.source label input{margin-top:5px}.source input[type=file]{width:190px}.source p{color:#9eafb4;max-width:56ch}.empty{padding:10px;color:#adc3c5}a{color:#a2d0d9}.rail{display:flex;gap:4px;margin-top:8px;flex-wrap:wrap}.rail button{padding:4px 8px;min-height:32px;font-size:11px}.rail button.here{background:#e0ba79;color:#10222b}.rail button.preview{border-color:#e9c17d}.hidden{display:none!important}@media(max-width:760px){.layout{display:flex;flex-direction:column}.page{padding:19px 19px 0}.page h1{font-size:27px;margin:6px 0 12px}.passage{font-size:26px;line-height:1.54;max-width:none}.paper{margin-top:18px}.side{display:none;border-left:0;border-top:1px solid #29434b;padding:19px}.side.open{display:block}.top{padding:8px 8px;gap:4px}.top .actions{min-width:0;gap:2px}.top button{font-size:10px;padding:5px 3px;min-height:36px}.identity{font-size:14px}.identity .tiny{font-size:9px}.deck{font-size:12px}.nextbar{padding:8px 6px;padding-bottom:max(8px,env(safe-area-inset-bottom));gap:3px}.nextbar .left{flex:1;min-width:0;gap:3px}.nextbar .left:first-child{flex:.9}.nextbar .left:last-child{flex:1.1}.nextbar button{padding:7px 1px;min-width:0;flex:1;font-size:10px;white-space:nowrap}}@media(min-width:761px){#threadToggle,#bottomThreads{display:none}}@media(max-width:380px){.identity .tiny{display:none}.top button{padding:6px 7px;font-size:11px}.top .identity{font-size:14px}}:host([data-aperture]) .top .actions{flex-wrap:wrap;justify-content:flex-end}:host([data-aperture]) .sentence{display:inline-block;max-width:100%;overflow-wrap:anywhere;white-space:pre-wrap;vertical-align:top}.readingTools{position:relative}.readingTools summary{list-style:none;cursor:pointer;border:1px solid #50606a;padding:7px 10px;min-height:38px;font-size:12px}.readingTools>div{position:absolute;right:0;top:100%;z-index:20;min-width:180px;background:#091824;border:1px solid #50606a;padding:6px}.readingTools>div button{display:block;width:100%;text-align:left;min-height:42px;margin:3px 0}.readingTools:not([open])>div{display:none}@media(max-width:760px){.readingTools summary{font-size:10px;padding:6px;min-height:36px}}@media(prefers-reduced-motion:reduce){.progress i{transition:none}}';
const bookMapCSS='.bookMap{border-top:1px solid #344e58;margin:12px 0;padding-top:8px}.bookMap summary{font:11px ui-monospace,monospace;letter-spacing:.06em;color:#e9c488;cursor:pointer}.bookMap ol{margin:8px 0;padding:0 0 0 20px}.bookMap li{padding:6px 0}.bookMap li a{display:block;font:11px ui-monospace,monospace;color:#afd3d9}.bookMap li span{font:14px/1.45 Georgia,serif;color:#d7ddcf;display:block;margin:3px 0 6px}';
const host=document.createElement('div');host.id='readingPlay';host.setAttribute('aria-label','SLEEPER reading experience');const dom=host.attachShadow({mode:'open'});
dom.innerHTML='<style>'+style+bookMapCSS+'</style><div id="app"></div>';
document.body.append(host);const $=id=>dom.getElementById(id);
let error='',sourceOpen=false,readIndex=0,playing=false,timer=null,rsvpVisible=false,threadOpen=false,ladderLesson=null;
let bellComparison=null,bellCarry=null,ladderProjectionPromise=null,apertureCarrier=null,saveTimer=null,workStoreState='EMPTY',workBaseSavedAt=0;
const composers=new Map();
const composerKey=(from,to)=>from+'|'+to;
async function compareLadder(index){
 const state=snap(),at=state.inspected,sha=state.model?.sha256;
 if(!sha||state.model.source!==DEMO)throw Error('BELL_SOURCE_CHANGED');
 if(!window.SleeperLadderThread)throw Error('LADDER_SOURCE_ADAPTER_MISSING');
 const expected=SleeperLadderThread.bellLensAt(index);
 ladderProjectionPromise ||= fetch('./ladder/source-dhamma.json',{cache:'no-store'}).then(r=>{
  if(!r.ok)throw Error('LADDER_SOURCE_HTTP_'+r.status);
  return r.json();
 }).then(raw=>SleeperLadderThread.create(raw)).catch(e=>{ladderProjectionPromise=null;throw e});
 const projection=await ladderProjectionPromise;
 const current=snap();
 if(current.model?.sha256!==sha||current.inspected!==at)throw Error('COMPARISON_POSITION_CHANGED');
 const factor=projection.entries[expected.factor];
 if(!factor||factor.index!==expected.factor)throw Error('LADDER_FACTOR_MISMATCH');
 bellComparison=Object.freeze({sha,at,index,factor,selectionSha256:projection.originalSelectionSha256});
 render();
 return bellComparison;
}
const snap=()=>B.snapshot(),text=s=>String(s??'');
function stop(){clearTimeout(timer);timer=null;playing=false;try{speechSynthesis.cancel()}catch(_){}}
function element(tag,className,value){const e=document.createElement(tag);if(className)e.className=className;if(value!==undefined)e.textContent=value;return e;}
function button(label,handler,className){const b=element('button',className,label);b.type='button';b.onclick=handler;return b;}
function status(msg){error=msg;if($('stateStatus'))$('stateStatus').textContent=msg;if($('compareError'))$('compareError').textContent=msg;}
function action(fn){try{captureComposer();stop();fn();error='';render();scheduleSave()}catch(e){status(e.message||String(e))}}
function move(id,travel){stop();readIndex=0;threadOpen=false;action(()=>travel?B.travel(id):B.inspect(id));host.scrollTo({top:0,behavior:'instant'});}
function quote(m,w){return w?m.source.slice(w.start,w.end):'';}
function paintEchoText(button,value,terms){let cursor=0;for(const match of value.matchAll(/[\p{L}\p{N}]+/gu)){const start=match.index,word=match[0];if(start>cursor)button.append(document.createTextNode(value.slice(cursor,start)));button.append(terms.has(word.toLowerCase())?element('mark','echoWord',word):document.createTextNode(word));cursor=start+word.length;}if(cursor<value.length)button.append(document.createTextNode(value.slice(cursor)));}
function holdAt(id,choice){action(()=>{B.hold(id,choice);if(!snap().session.selected)B.mark(id)})}
function clean(s){return text(s).replace(/\s+/g,' ').trim();}
async function load(source,title,url='',keepLadder=false){checkpointAperture();stop();error='';bellComparison=null;bellCarry=null;if(!keepLadder)ladderLesson=null;try{await B.load(source,title,url);resumeStored();sourceOpen=false;threadOpen=false;readIndex=0;render();host.scrollTo(0,0)}catch(e){error=e.message||String(e);sourceOpen=true;render()}}
function home(){stop();action(()=>{const m=snap().model;let cap=m.nodes.length+2;while(cap-->0){const s=snap().session,path=T.routeHome(m,s);if(path.length<=1)break;B.originStep()}B.inspect(m.nodes[0].id);});}
function result(){action(()=>{const obj=B.returnArtifact(),json=JSON.stringify(obj,null,2);const url=URL.createObjectURL(new Blob([json],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='threadwalk-'+obj.source.hash+'-return.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});}
function play(){
 if(playing){stop();$('ridePlay').textContent='▶ RIDE';return}
 const m=snap().model,n=m.nodes.find(n=>n.id===snap().inspected),words=n.text.match(/\S+/gu)||[];
 if(readIndex>=words.length)readIndex=0;
 playing=true;
 function tick(){
  if(!playing)return;
  const w=words[readIndex];
  if(!w){stop();$('ridePlay').textContent='↺ REPLAY';return}
  const box=$('rsvpword');if(!box)return;const parts=T.orp(w);
  box.replaceChildren(element('span','',parts[0]),element('span','orb',parts[1]),element('span','',parts[2]));
  readIndex++;const rate=Number($('rate').value)||260;
  timer=setTimeout(tick,Math.max(90,60000/rate)*Math.max(1,w.length/7)*(/[.!?。！？]$/.test(w)?1.5:1));
 }
 $('ridePlay').textContent='Ⅱ PAUSE';tick();
}
function showSource(){
 stop();sourceOpen=true;const app=$('app');
 app.innerHTML='<div class="top"><div class="identity"><i>回</i> SLEEPER / READ</div><button id="backSource">↩ READING</button></div><div class="source"><div class="tiny">YOUR SOURCE / SOURCE-EXACT</div><h1>Read a text.<br>Find a thread.</h1><p>Paste text or load TXT / MD / JSON. The full text stays in this tab. The Bell study is original illustrative writing, not an excerpt from Buddhadhamma.</p><label>TITLE<input id="newTitle" value="My source"></label><label>SOURCE<textarea id="newText" placeholder="Paste two or more paragraphs separated by blank lines."></textarea></label><label>SOURCE URL (OPTIONAL)<input id="newURL" placeholder="https://…"></label><div class="controls"><button id="loadSource" class="gold">READ THIS →</button><label>FILE<input id="newFile" type="file" accept=".txt,.md,.json,text/plain,application/json"></label><button id="demo" class="ghost">BELL STUDY</button></div><p id="sourceError" class="notice"></p></div>';
 $('sourceError').textContent=error;const current=snap().model;if(current){$('newText').value=current.source;$('newTitle').value=current.meta.title;$('newURL').value=current.meta.url;}
 $('backSource').onclick=()=>{if(snap().model){sourceOpen=false;render()}else location.assign('./')};
 $('loadSource').onclick=()=>load($('newText').value,$('newTitle').value,$('newURL').value);
 $('demo').onclick=()=>load(DEMO,'The Bell / original reading study');
 $('newFile').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>2000000){$('sourceError').textContent='WORK_FILE_TOO_LARGE_2000000';return}const raw=await f.text();let work;try{work=JSON.parse(raw)}catch(_){}
 if(work?.schema==='sleeper.threadwalk-work/v1'){
  try{
   if(typeof work.source?.text!=='string')throw Error('WORK_SOURCE_REQUIRED');
   const candidate=await T.seal(T.createModel(work.source.text,{title:work.source.title,url:work.source.url}));
   if(candidate.sha256!==work.source.sha256||candidate.source!==work.source.text)throw Error('WORK_SOURCE_MISMATCH');
   const cp=W.validate(candidate,work.checkpoint);
   checkpointAperture();await B.load(candidate.source,candidate.meta.title,candidate.meta.url);B.resume(cp);restoreComposers(cp);const stored=W.read(candidate,localStorage);workBaseSavedAt=stored.checkpoint?.savedAt||0;workStoreState=stored.state;sourceOpen=false;checkpointAperture();render();
  }catch(e){$('sourceError').textContent='WORK FILE HELD · '+e.message}
 }else{$('newText').value=raw;$('newTitle').value=f.name}};
}
function render(){
 captureComposer();
 if(sourceOpen||!snap().model){showSource();return}
 const {model:m,session:s,inspected:id}=snap(),focus=m.nodes.find(n=>n.id===s.focus);
 const node=m.nodes.find(n=>n.id===id)||focus,i=m.nodes.indexOf(node),here=node.id===focus.id;
 const prev=m.nodes[i-1],next=m.nodes[i+1],w=s.witnesses[node.id];
 const mark=s.selected&&m.nodes.find(n=>n.id===s.selected),comp=mark&&mark.id!==node.id,choices=T.evidenceChoices(m,node.id);
 const legal=!here&&T.neighbors(m,s).some(e=>e.id===node.id),recent=s.links.at(-1),canReturn=T.canReturn(s);
 const suggestions=T.suggestions(m,{...s,focus:node.id}).filter(e=>e.id!==node.id);
 let candidates=suggestions.slice(0,3).map(e=>({id:e.id,label:'ECHO · '+e.common.join(' · ')}));
 if(!candidates.length)for(const n of m.nodes){if(n.id===focus.id||Math.abs(m.nodes.indexOf(n)-m.nodes.indexOf(focus))<2)continue;candidates.push({id:n.id,label:'DISTANT / inspect only'});if(candidates.length===3)break}
 $('app').innerHTML='<div class="top"><div class="identity"><i>回</i> SLEEPER <span class="tiny">/ READ</span></div><div class="actions"><button id="threadToggle">THREADS</button><details class="readingTools" id="readingTools"><summary>TOOLS</summary><div><button id="mySource">SOURCE</button><button id="saveWork">EXPORT WORK</button><button id="fullField">FIELD ↗</button></div></details><button id="exit">EXIT</button></div></div><div class="progress"><i id="fill"></i></div><div class="layout"><main class="page"><div class="tiny" id="title"></div><h1 id="readingTitle"></h1><div class="deck">Tap a sentence to hold evidence. Find an echo. Compare passages. Make a door the text earns.</div><div class="paper" id="paper"><div class="kicker" id="where"></div><div id="passage" class="passage"></div><div class="hint" id="hint"></div><div id="ladderContext"></div><div id="quickThreads" class="quick" aria-label="Source echoes"></div><div class="status" id="stateStatus" role="status"></div><div class="handle" id="actions"></div><div class="rsvp hidden" id="rsvp"><div class="tiny">RIDE / THIS PASSAGE</div><div class="rsvpword" id="rsvpword">✳</div><div class="controls"><button id="ridePlay">▶ RIDE</button><button id="rideReset">↶</button><label class="tiny">WPM <select id="rate"><option>180</option><option selected>260</option><option>360</option><option>480</option></select></label></div></div><div class="scrub"><span id="currentNumber"></span><input id="scrub" type="range" min="0" step="1" aria-label="Preview passage"><span id="totalNumber"></span></div><div class="rail" id="rail"></div></div></main><aside class="side" id="threadPane"><section><h2>01 / THREADS TO INSPECT</h2><div class="tiny">Lexical echo ≠ agreement</div><div id="echoList"></div></section><section class="compare"><h2>02 / TWO EXACT WITNESSES</h2><div id="compare"></div><div id="compareError" class="notice" role="status"></div></section><section><h2>03 / WHAT CHANGED?</h2><div id="payoff"></div></section><section><h2>RETURN / SAME SOURCE</h2><div id="return"></div></section></aside></div><div class="nextbar"><div class="left"><button id="prev">← PREV</button><button id="next" class="gold">NEXT →</button></div><div class="left"><button id="bottomThreads">THREADS</button><button id="here">HERE ↩</button><button id="origin">ORIGIN</button></div></div>';
 $('title').textContent=m.nodes.length+' PASSAGES · '+workSaveLabel();$('title').title='SOURCE SHA-256 '+m.sha256;$('readingTitle').textContent=m.meta.title; $('threadPane').classList.toggle('open',threadOpen);
 if(apertureCarrier){
  const section=element('section',''),details=element('details','');
  details.append(element('summary','','HELD IN APERTURE · '+apertureCarrier.apertureOrigin.witnesses.length+' source ranges'));
  for(const r of apertureCarrier.apertureOrigin.witnesses){
   const n=m.nodes.find(n=>r.start>=n.start&&r.start<n.end);
   details.append(element('blockquote','quote',r.quote));
   if(n)details.append(button('INSPECT '+r.start+'–'+r.end,()=>move(n.id,false),'ghost'));
  }
  section.append(details);$('threadPane').prepend(section);
 }
 $('fill').style.width=((i+1)/m.nodes.length*100)+'%';
 $('where').textContent=(here?'HERE':'INSPECT / NOT TRAVERSED')+' · '+(i+1)+' / '+m.nodes.length+' · CHAR '+node.start+'–'+node.end;
 $('paper').classList.toggle('remote',!here);
 const heldText=comp?quote(m,s.witnesses[mark.id]):'';
 const sourceTerms=heldText?T.words(heldText):new Set(),visibleTerms=T.words(node.text);
 const echoTerms=new Set([...sourceTerms].filter(term=>visibleTerms.has(term)));
 
 const context=$('ladderContext');
 if(ladderLesson){
  const entry=ladderLesson.entries[i];
  if(entry){
   context.append(element('div','tiny','LADDER / '+(entry.index+1)+'/8 · '+entry.name.toUpperCase()+' · '+entry.locator));
   context.append(element('p','notice','ATTEND: '+entry.question));
   context.append(element('p','tiny','ABRIDGED DERIVED SELECTION · SOURCE OFFSETS ARE FOR THIS SELECTION · NO GATE PROOF'));
   const refs=element('div','quick');
   const chapter=element('a','', 'PAYUTTO CHAPTER ↗');chapter.href=entry.canonical;chapter.rel='noopener';chapter.target='_blank';refs.append(chapter);
   for(const ref of entry.references){const a=element('a','',ref.id+' ↗');a.href=ref.url;a.title=ref.label;a.rel='noopener';a.target='_blank';refs.append(a);}
   const bell=element('a','','BELL / CONDITIONS ↗');bell.href='./axis-score.html?bell=1';bell.target='_blank';bell.rel='noopener';refs.append(bell);
   context.append(refs);
   const map=document.createElement('details');map.className='bookMap';
   const heading=document.createElement('summary');heading.textContent='BOOK MAP / FIVE QUESTIONS';map.append(heading);
   const list=document.createElement('ol');
   for(const stage of SleeperLadderThread.READING_MAP){
    const li=document.createElement('li'),a=element('a','',stage.lens+' / '+stage.chapter+' / '+stage.title);
    a.href=stage.url;a.rel='noopener noreferrer';a.target='_blank';
    li.append(a,element('span','',stage.question));list.append(li);
   }
   map.append(list,element('p','tiny','Questions are editorial navigation, not quotes or doctrinal proof.'));
   context.append(map);
  }
 }
 if(!ladderLesson&&m.source===DEMO&&window.SleeperLadderThread){
  const lesson=SleeperLadderThread.bellLensAt(i);
  context.append(element('div','tiny','BELL / '+lesson.phase+' · EDITORIAL READING LENS'));
  context.append(element('p','notice',lesson.question));
  const refs=element('div','quick');
  for(const [name,url] of [['PAYUTTO / '+lesson.book.chapter,lesson.book.url],[lesson.sutta.id,lesson.sutta.url],['LADDER / PAINTING','./ladder/']]){
   const a=element('a','',name+' ↗');a.href=url;a.target='_blank';a.rel='noopener noreferrer';refs.append(a);
  }
  context.append(refs);
  const compare=button('↔ READ THE RELATED PATH FACTOR',()=>{
   compare.disabled=true;compare.textContent='CHECKING SOURCE…';
   compareLadder(i).catch(e=>{status('CROSS_SOURCE_UNAVAILABLE · '+(e.message||e));compare.disabled=false;compare.textContent='↔ RETRY SOURCE';});
  },'ghost');
  compare.title='Read a verified Ladder excerpt alongside Bell without moving or changing your source';context.append(compare);
  if(bellComparison?.sha===m.sha256&&bellComparison.at===node.id&&bellComparison.index===i){
   const e=bellComparison.factor,frame=element('div','bookMap');
   frame.append(element('div','tiny','LADDER / '+e.name.toUpperCase()+' · '+e.locator+' · SEPARATE ABRIDGED SOURCE'));
   frame.append(element('blockquote','quote',e.excerpt));
   frame.append(element('p','notice','Editorial comparison only. These offsets address the Ladder projection, not the book or Bell. No Gate proof or cross-source door.'));
   for(const [name,url] of [['OPEN PAYUTTO CHAPTER',e.canonical],['READ FULL LADDER THREADWALK','./axis-score.html?read=1&ladderFactor='+e.index]]){
    const a=element('a','',name+' ↗');a.href=url;a.target='_blank';a.rel='noopener noreferrer';frame.append(a,document.createTextNode(' · '));
   }
   context.append(frame);
   // The only transfer is a human-authored comparison with TWO visibly distinct
   // source identities. This cannot move the Threadwalk cursor or open a gate.
   const carry=element('div','bookMap');
   carry.id='bellCarry';
   carry.append(element('div','tiny','BELL ↔ LADDER / HOLD · CHECK · CARRY'));
   const witness=s.witnesses[node.id];
   if(witness)carry.append(element('blockquote','quote',quote(m,witness)));
   else carry.append(element('p','notice','First tap an exact Bell sentence above. The Ladder excerpt cannot stand in for Bell evidence.'));
   const claim=element('textarea');claim.id='bellClaim';
   claim.placeholder='What does this Bell sentence suggest when read with the Path factor? Your interpretation, not the book\'s verdict.';
   claim.setAttribute('aria-label','Your cross-source interpretation');
   claim.maxLength=300;
   const check=element('textarea');check.id='bellCheck';
   check.placeholder='What would you notice, try, or check that might change your interpretation?';
   check.setAttribute('aria-label','A test or alternative reading');
   check.maxLength=240;
   const existing=bellCarry&&bellCarry.bell?.sourceSha256===m.sha256&&bellCarry.bell.passageIndex===i&&bellCarry.ladder.factorIndex===e.index&&w&&bellCarry.bell.span.quoteHash===w.quoteHash&&bellCarry.bell.span.start===w.start&&bellCarry.bell.span.end===w.end?bellCarry:null;
   if(existing){claim.value=existing.interpretation;check.value=existing.check;}
   carry.append(element('p','notice','VIEW: distinguish what the quote says. EFFORT: propose a different reading or action. MINDFULNESS: name what would make you revise it. These are practice prompts, not certified attainment.'));
   carry.append(claim,check);
   const save=button(existing?'REVISE CARRY':'CARRY THIS DISTINCTION',()=>{
    const held=snap().session.witnesses[node.id];
    if(!held||held.node!==node.id){status('HOLD_EXACT_BELL_SENTENCE_FIRST');return;}
    const excerpt=m.source.slice(held.start,held.end);
    if(T.hash(excerpt)!==held.quoteHash){status('BELL_SOURCE_WITNESS_CHANGED');return;}
    const interpretation=claim.value.trim(),recheck=check.value.trim();
    if(interpretation.length<12||interpretation.length>300){status('INTERPRETATION_NEEDS_12_TO_300_CHARACTERS');return;}
    if(recheck.length<8||recheck.length>240){status('CHECK_NEEDS_8_TO_240_CHARACTERS');return;}
    if(bellComparison?.sha!==m.sha256||bellComparison?.at!==node.id){status('CROSS_SOURCE_POSITION_CHANGED');return;}
    bellCarry=Object.freeze({
      schema:'sleeper.bell-ladder-carry/v1',
      authority:'USER_INTERPRETATION_NOT_SEMANTIC_OR_GATE_PROOF',
      bell:{sourceSha256:m.sha256,passageIndex:i,span:{start:held.start,end:held.end,node:held.node,quoteHash:held.quoteHash},exactQuote:excerpt},
      ladder:{selectionSha256:bellComparison.selectionSha256,factorIndex:e.index,name:e.name,locator:e.locator,abridgedExcerpt:e.excerpt,canonical:e.canonical},
      interpretation,check:recheck,
      parallel:{id:lesson.sutta.id,url:lesson.sutta.url},
      verification:'BELL_EXACT_WITNESS / LADDER_VERIFIED_DERIVED_SLICE / INTERPRETATION_UNVERIFIED'
    });
    status('CARRIED · two source identities retained; no gate or Threadwalk route changed');
    render();
   },'gold');
   save.id='saveBellCarry';
   save.disabled=!witness;
   carry.append(save);
   if(existing){
    carry.append(element('p','notice','CARRIED · Bell SHA256 '+existing.bell.sourceSha256.slice(0,12)+' / Ladder selection SHA256 '+existing.ladder.selectionSha256.slice(0,12)+'. Full sources are not embedded; only these two excerpts are carried.'));
    const exportButton=button('EXPORT CARRY JSON ↓',()=>{
      const json=JSON.stringify(existing,null,2),url=URL.createObjectURL(new Blob([json],{type:'application/json'})),a=document.createElement('a');
      a.href=url;a.download='sleeper-bell-ladder-carry.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    },'ghost');
    exportButton.id='exportBellCarry';carry.append(exportButton);
   }
   context.append(carry);
  }
  const map=document.createElement('details');map.className='bookMap';
  map.append(element('summary','','BOOK MAP / WHAT IS WORTH READING'));
  const list=document.createElement('ol');
  for(const stage of SleeperLadderThread.READING_MAP){
   const li=document.createElement('li'),a=element('a','',stage.lens+' · '+stage.chapter+' · '+stage.title);
   a.href=stage.url;a.rel='noopener noreferrer';a.target='_blank';
   li.append(a,element('span','',stage.question));list.append(li);
  }
  map.append(list,element('p','tiny','Editorial attention prompts, not canonical quotations or automatic doctrine.'));
  context.append(map);
 }
 const p=$('passage');for(const [j,e] of choices.entries()){
  const exact=m.source.slice(e.start,e.end);
  const b=button(exact,()=>holdAt(node.id,j),'sentence'+(w&&w.start===e.start&&w.end===e.end?' held':''));
  if(echoTerms.size){b.textContent='';paintEchoText(b,exact,echoTerms)}
  b.setAttribute('aria-pressed',String(!!w&&w.start===e.start&&w.end===e.end));
  b.title='Hold exact source witness '+e.start+'–'+e.end;p.append(b,' ');
 }
 $('hint').textContent='Tap any sentence to HOLD its exact source span. No automatic semantic verdict.';
 const relevantDoor=recent&&(recent.from===node.id||recent.to===node.id);
 $('stateStatus').textContent=error||(relevantDoor?'Your door is now traversable. Cross it, undo it, or continue reading.':comp?'Compare the exact held sentences. THREADS opens the connection editor.':!here?'Preview only: no teleport. Hold a sentence to compare or continue browsing.':w?'WITNESS HELD · follow a ↝ echo to compare.': 'Tap a sentence to hold it. Find its ↝ echo.');
 const actions=$('actions');
 actions.append(button(w?'◆ SOURCE HELD':'◇ HOLD A SENTENCE',()=>{if(!w)holdAt(node.id,0)},w?'gold':'ghost'));
 $('readingTools').querySelector('div').append(button('▶ RIDE / RSVP',()=>{rsvpVisible=!rsvpVisible;if(!rsvpVisible)stop();$('rsvp').classList.toggle('hidden',!rsvpVisible)},'ghost'));
 $('readingTools').querySelector('div').append(button('◖ LISTEN',()=>{stop();if(!('speechSynthesis'in window)){status('TTS_UNAVAILABLE');return}const u=new SpeechSynthesisUtterance(node.text);u.rate=.9;speechSynthesis.speak(u)},'ghost'));
 if(here)actions.append(button(s.selected===focus.id?'◆ MARKED':'MARK PASSAGE',()=>action(()=>B.mark(focus.id)),s.selected===focus.id?'gold':'ghost'));
 else actions.append(button(legal?'CROSS THIS DOOR →':'INSPECT ONLY',()=>{if(legal)move(node.id,true)},legal?'gold':'ghost'));
 $('rsvp').classList.toggle('hidden',!rsvpVisible);$('ridePlay').onclick=play; $('ridePlay').textContent=playing?'Ⅱ PAUSE':'▶ RIDE';$('rideReset').onclick=()=>{stop();readIndex=0;$('rsvpword').textContent='✳';$('ridePlay').textContent='▶ RIDE'};
 $('scrub').max=m.nodes.length-1;$('scrub').value=i;$('currentNumber').textContent=String(i+1).padStart(2,'0');$('totalNumber').textContent=m.nodes.length+' passages';
 $('scrub').onchange=e=>move(m.nodes[+e.target.value].id,false);
 m.nodes.forEach((n,j)=>{const b=button(String(j+1).padStart(2,'0'),()=>move(n.id,false),n.id===s.focus?'here':n.id===node.id?'preview':'');b.title='Inspect '+(j+1);$('rail').append(b)});
 // Looking ahead is not a move. PREV/NEXT may traverse source order only
 // when the currently displayed passage is the committed reading position.
 const advance=n=>{if(!n)return;move(n.id,here&&T.neighbors(m,s).some(e=>e.id===n.id))};
 $('prev').disabled=!prev;$('next').disabled=!next;$('prev').onclick=()=>advance(prev);$('next').onclick=()=>advance(next);
 $('here').disabled=here;$('here').onclick=()=>move(focus.id,false);$('origin').disabled=s.focus===m.nodes[0].id;$('origin').onclick=home;
 if(ladderLesson){
  const entry=ladderLesson.entries[i];
  if(entry){
   // MN 117 treats these factors as continually supporting one another,
   // not three extra Gates. Inspecting a factor never travels or earns proof.
   const lead=element('a','tiny','MN 117 · VIEW / EFFORT / MINDFULNESS ↗');
   lead.href='https://suttacentral.net/mn117/en/sujato';
   lead.target='_blank';lead.rel='noopener noreferrer';
   $('quickThreads').append(lead);
   const names={0:'VIEW · DISCERN',5:'EFFORT · ADJUST',6:'MINDFULNESS · CHECK'};
   for(const j of entry.compareIndices){
    const other=ladderLesson.entries[j];
    const jump=button('↝ '+(j+1)+' · '+names[j],()=>move(m.nodes[j].id,false),'echoQuick');
    jump.title='Inspect '+other.name+' in the same source; no Gate proof or inferred agreement';
    $('quickThreads').append(jump);
   }
  }
 }
 for(const e of candidates.slice(0,2)){const n=m.nodes.find(n=>n.id===e.id);if(!n)continue;const common=(e.common||[]).slice(0,2).join(' · ');$('quickThreads').append(button('↝ '+String(m.nodes.indexOf(n)+1).padStart(2,'0')+' · '+(common||'distant passage'),()=>move(n.id,false),'echoQuick'));}
 for(const e of candidates){const n=m.nodes.find(n=>n.id===e.id);if(!n)continue;const b=button('',()=>move(n.id,false),'echo');b.append(element('b','',e.label+' · '+(m.nodes.indexOf(n)+1)),element('span','',clean(n.text).slice(0,140)));$('echoList').append(b)}
 if(!candidates.length)$('echoList').append(element('p','empty','No distant lexical echoes. Continue reading.'));
 const panel=$('compare');
 if(mark){
  panel.append(element('div','tiny','MARKED PASSAGE '+(m.nodes.indexOf(mark)+1)),element('blockquote','quote',quote(m,s.witnesses[mark.id])||'First hold a sentence in the marked passage.'));
  if(comp){
   panel.append(element('div','tiny','INSPECTED PASSAGE '+(i+1)),element('blockquote','quote',quote(m,w)||'Now hold a sentence in the inspected passage.'));
   const relation=element('select');relation.id='relation';for(const value of ['questions','contrasts','supports']){const o=element('option','',value.toUpperCase());o.value=value;relation.append(o)}
   const why=element('textarea');why.id='reason';why.maxLength=400;why.dataset.from=mark.id;why.dataset.to=node.id;why.dataset.source=m.sha256;why.placeholder='What changes when these two exact passages are read together? (12–400 characters)';
   const pending=composers.get(composerKey(mark.id,node.id));
   if(pending){why.value=pending.reason;relation.value=pending.relation}
   why.oninput=relation.onchange=()=>{captureComposer();scheduleSave()};
   panel.append(relation,why,button('MAKE DOOR →',()=>{if(!s.witnesses[mark.id]||!s.witnesses[node.id]){status('HOLD_BOTH_EXACT_SENTENCES');return}action(()=>{B.link(node.id,relation.value,why.value);composers.delete(composerKey(mark.id,node.id));why.value=''});},'gold'));
  }else panel.append(element('div','empty','Inspect an echo or distant passage; hold a sentence there to compare.'));
 }else panel.append(element('div','empty','Hold a sentence. MARK this passage. Inspect a different passage to compare.'));
 const payoff=$('payoff');if(recent){
  const delta=T.effect(m,s,recent);
  payoff.append(element('div','tiny',recent.relation.toUpperCase()+' · '+(m.nodes.findIndex(n=>n.id===recent.from)+1)+' ↔ '+(m.nodes.findIndex(n=>n.id===recent.to)+1)),element('blockquote','quote',recent.reason),element('p','notice',delta.stepsSaved>0?'Door saves '+delta.stepsSaved+' source-order moves. Structural only.':'The door can be crossed; it is not evidence of semantic agreement.'));
  payoff.append(button('UNDO',()=>action(()=>B.undo()),'ghost'));
  if(s.future.length)payoff.append(button('REDO',()=>action(()=>B.redo()),'ghost'));
 }else payoff.append(element('p','empty','Your authored connection will change lawful travel and remain reversible.'));
 const re=$('return');re.append(element('div','tiny',s.path.length+' stops · '+s.links.length+' doors · '+s.moves.filter(x=>x.via==='COMMITTED').length+' crossed'));
 re.append(element('p','notice',canReturn?'RETURN READY: source and crossed route checked.':T.hasCrossed(s)?'You crossed a door. Return to passage 01.':'To export, cross one authored door and come back to the source origin.'));
 re.append(button(canReturn?'EXPORT SOURCE RETURN ↓':'↩ BACK TO ORIGIN',canReturn?result:home,canReturn?'gold':'ghost'));
 const link=element('p','');if(m.meta.url){const a=element('a','', 'OPEN CANONICAL SOURCE ↗');a.href=m.meta.url;a.target='_blank';a.rel='noopener';link.append(a)}else link.textContent='LOCAL SOURCE · NEVER PUBLISHED';re.append(link);
 const toggleThreads=()=>{threadOpen=!threadOpen;$('threadPane').classList.toggle('open',threadOpen);if(threadOpen)$('threadPane').scrollIntoView({block:'start',behavior:'smooth'});else host.scrollTo({top:0,behavior:'smooth'});};
 $('threadToggle').onclick=toggleThreads;$('bottomThreads').onclick=toggleThreads;
 $('mySource').onclick=()=>{checkpointAperture();sourceOpen=true;render()};
 $('saveWork').onclick=()=>action(exportWork);
 $('fullField').onclick=()=>{stop();B.showField();host.style.display='none';document.body.style.overflow=''};
 $('exit').textContent=apertureCarrier?'↩ APERTURE':ladderLesson?'↩ LADDER':'EXIT';$('exit').onclick=()=>{stop();if(apertureCarrier)return returnAperture();if(ladderLesson)return closeLadder();location.assign('./')};
 let touchX=null;p.ontouchstart=e=>{touchX=e.touches.length===1?e.touches[0].clientX:null};p.ontouchend=e=>{if(touchX===null)return;const dx=e.changedTouches[0].clientX-touchX;touchX=null;if(Math.abs(dx)>110){const n=dx<0?next:prev;if(n)advance(n)}};
}
dom.addEventListener('keydown',e=>{if(sourceOpen||['INPUT','TEXTAREA','SELECT'].includes(dom.activeElement?.tagName))return;const {model,session}=snap();if(!model)return;const i=model.nodes.findIndex(n=>n.id===session.focus);if(['ArrowRight','ArrowLeft'].includes(e.key)){const n=model.nodes[i+(e.key==='ArrowRight'?1:-1)];if(n){e.preventDefault();move(n.id,true)}}if(e.key==='Escape'){stop();if(ladderLesson){closeLadder();return}B.showField();host.style.display='none';document.body.style.overflow=''}});

function captureComposer(){
 const field=$('reason'),relation=$('relation'),m=snap().model;if(!field||!relation||field.dataset.source!==m?.sha256)return;
 const item={from:field.dataset.from,to:field.dataset.to,relation:relation.value,reason:field.value.slice(0,400)};
 const key=composerKey(item.from,item.to);
 if(item.reason.trim()){
  if(!composers.has(key)&&composers.size>=64){error='64 unfinished comparisons retained; export this work before adding more.';return}
  composers.set(key,item);
 }else composers.delete(key);
}
function restoreComposers(cp){composers.clear();for(const c of cp?.reading?.composers||[])composers.set(composerKey(c.from,c.to),c)}
function resumeStored(){
 composers.clear();if(!W)return;
 let saved;try{saved=W.read(snap().model,localStorage)}catch(e){saved={state:'BLOCKED',error:e.message}}
 workStoreState=saved.state;workBaseSavedAt=saved.checkpoint?.savedAt||0;
 if(saved.state==='READY'){B.resume(saved.checkpoint);restoreComposers(saved.checkpoint)}
 else if(saved.state==='CORRUPT')error='Saved work held: '+saved.error;
}
function workSaveLabel(){return workStoreState==='READY'?'SAVED ON THIS DEVICE':workStoreState==='BLOCKED'?'SESSION ONLY · DEVICE SAVE UNAVAILABLE':['CORRUPT','CONFLICT'].includes(workStoreState)?'SAVED WORK HELD · EXPORT CURRENT WORK':'LOCAL WORK'}
function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try{checkpointAperture();const label=$('title');if(label)label.textContent=snap().model.nodes.length+' PASSAGES · '+workSaveLabel()}catch(e){status('Work not saved: '+e.message)}},250)}
function checkpointAperture(){
 const m=snap().model;if(!m)return null;captureComposer();
 const cp={...B.checkpoint(),reading:{composers:[...composers.values()]},savedAt:Math.max(Date.now(),workBaseSavedAt+1),conflict:workStoreState==='CONFLICT'};
 const checkpoint=W?W.validate(m,cp):cp;
 if(W)try{const stored=W.write(m,checkpoint,localStorage,workBaseSavedAt);workStoreState=stored.state;if(workStoreState==='READY'){workBaseSavedAt=stored.checkpoint.savedAt;checkpoint.savedAt=workBaseSavedAt;checkpoint.conflict=false}}catch(e){workStoreState='BLOCKED'}
 if(workStoreState==='CONFLICT'){checkpoint.conflict=true;checkpoint.savedAt=workBaseSavedAt}
 if(apertureCarrier&&m.source===apertureCarrier.raw){
  apertureCarrier.threadwalkDraft=checkpoint;sessionStorage.setItem('rsvp.handoff.v1',JSON.stringify(apertureCarrier));
 }
 return checkpoint;
}
function exportWork(){
 const m=snap().model,checkpoint=checkpointAperture();if(!m||!checkpoint)return;
 const work={schema:'sleeper.threadwalk-work/v1',source:{text:m.source,title:m.meta.title,url:m.meta.url,sha256:m.sha256},checkpoint};
 const blob=new Blob([JSON.stringify(work,null,2)],{type:'application/json'});if(blob.size>2000000)throw Error('Work file exceeds 2 MB; current work is retained.');const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='threadwalk-'+m.sha256.slice(0,12)+'-work.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function returnAperture(){
 stop();
 try{
  checkpointAperture();
  const origin=apertureCarrier.apertureOrigin,saved=JSON.parse(sessionStorage.getItem('interphase.continuum.v1')||'null');
  const u=new URL(origin.returnAddress,location.href);
  if(saved?.source?.hash!==origin.revision||saved.source.raw!==apertureCarrier.raw||u.origin!==location.origin||u.searchParams.get('resume')!==origin.revision)throw Error('APERTURE_CALLER_CHANGED');
  location.assign(u.href);
 }catch(e){status('RETURN HELD · '+e.message)}
}
addEventListener('visibilitychange',()=>{if(document.hidden)try{checkpointAperture()}catch(e){console.error(e)}});
addEventListener('pagehide',()=>{try{checkpointAperture()}catch(e){console.error('Threadwalk draft not saved',e)}});
function closeLadder(){
 if(window.parent!==window)window.parent.postMessage({schema:'sleeper.ladder-reader-close/v1'},location.origin);
 else location.assign('./ladder/');
}
async function start(){
 document.body.style.overflow='hidden';
 if(query.get('aperture')==='1'){
  try{
   const p=JSON.parse(sessionStorage.getItem('rsvp.handoff.v1')||'null'),o=p?.apertureOrigin;
   if(typeof p?.raw!=='string'||p.raw.length>100000||p.raw.normalize('NFC')!==p.raw||o?.schema!=='source-aperture-excursion/v1')throw Error('APERTURE_SOURCE_REQUIRED');
   const {hashText}=await import('/lib/id.js');
   if(await hashText(p.raw)!==p.hash||p.hash!==o.revision||!Number.isInteger(o.anchor)||o.anchor<0||o.anchor>=p.raw.length)throw Error('APERTURE_SOURCE_MISMATCH');
   if(!Array.isArray(o.witnesses)||o.witnesses.length>16||[o.range,...o.witnesses].some(r=>!r||!Number.isInteger(r.start)||!Number.isInteger(r.end)||r.start<0||r.end>p.raw.length||r.start>=r.end||p.raw.slice(r.start,r.end)!==r.quote))throw Error('APERTURE_RANGE_MISMATCH');
   const saved=JSON.parse(sessionStorage.getItem('interphase.continuum.v1')||'null'),u=new URL(o.returnAddress,location.href);
   if(saved?.source?.hash!==p.hash||saved.source.raw!==p.raw||u.origin!==location.origin||u.searchParams.get('resume')!==p.hash)throw Error('APERTURE_CALLER_MISMATCH');
   // Validate segmentation and any saved work before replacing the live source.
   const candidate=await T.seal(T.createModel(p.raw,{title:p.label}));
   if(p.threadwalkDraft)W.validate(candidate,p.threadwalkDraft);
   await B.load(p.raw,p.label);
   if(p.threadwalkDraft){
    const inbound=W.validate(candidate,p.threadwalkDraft);let saved;try{saved=W.read(candidate,localStorage)}catch(e){saved={state:'BLOCKED'}}
    const cp=!inbound.conflict&&saved.state==='READY'&&saved.checkpoint.savedAt>inbound.savedAt?saved.checkpoint:inbound;
    workStoreState=inbound.conflict?'CONFLICT':saved.state;workBaseSavedAt=inbound.conflict?inbound.savedAt:saved.checkpoint?.savedAt||0;B.resume(cp);restoreComposers(cp);
   }
   else{
    resumeStored();
    const n=snap().model.nodes.find(n=>o.anchor>=n.start&&o.anchor<n.end);
    if(n&&workStoreState!=='READY')B.inspect(n.id); // Inspection is not a traversed edge or evidence selection.
   }
   apertureCarrier=p;host.dataset.aperture='1';sourceOpen=false;render();scheduleSave();
  }catch(e){error='APERTURE HELD · '+e.message;sourceOpen=true;render()}
  return;
 }
 if(query.has('ladderFactor')){
  try{
   if(query.get('read')!=='1'||!window.SleeperLadderThread)throw Error('LADDER_READER_UNAVAILABLE');
   const index=SleeperLadderThread.selectedIndex(query.get('ladderFactor'));
   const response=await fetch('./ladder/source-dhamma.json',{cache:'no-store'});
   if(!response.ok)throw Error('LADDER_SOURCE_HTTP_'+response.status);
   const projection=SleeperLadderThread.create(await response.json());
   await load(projection.text,projection.title,'',true);
   if(!snap().model||snap().model.nodes.length!==8)throw Error('LADDER_PROJECTION_MISMATCH');
   ladderLesson=projection;B.inspect(snap().model.nodes[index].id);render();
  }catch(e){ladderLesson=null;error='LADDER_SOURCE_REJECTED · '+(e.message||e);sourceOpen=true;render();}
  return;
 }
 if(query.get('src')&&query.get('read')==='1'){
  let attempts=0;const poll=()=>{if(snap().model){resumeStored();sourceOpen=false;render();return}if(attempts++>50){error='SOURCE_NOT_LOADED / use MY TEXT';sourceOpen=true;render();return}setTimeout(poll,100)};poll();return;
 }
 if(query.get('read')==='1'&&!query.has('bell')){sourceOpen=true;render();return;}
 await load(DEMO,'The Bell / original reading study');
}
start();
})();