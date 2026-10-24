/* SLEEPER READ PLAY — one Threadwalk model, new mobile-first reading projection.
   Lexical echoes are discovery hints, never semantic decisions or Gate proofs. */
(function(){
'use strict';
const query=new URLSearchParams(location.search);
if(query.get('bell')!=='1'&&query.get('read')!=='1')return;
const B=window.SleeperReadingBridge,T=window.Threadwalk;if(!B||!T)return;
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
const style=':host{position:fixed;inset:0;z-index:100001;display:block;overflow:auto;background:#07131c;color:#e9ebe4;font:14px/1.5 system-ui,sans-serif}*{box-sizing:border-box}button,input,select,textarea{font:inherit}button{cursor:pointer;border:1px solid #50606a;color:#eceadd;background:#102530;border-radius:3px;min-height:42px;padding:9px 13px}button:focus-visible,input:focus-visible,textarea:focus-visible{outline:2px solid #edc780;outline-offset:3px}button:disabled{opacity:.38;cursor:not-allowed}.gold{background:#e7c17b;color:#081a22;border-color:#e7c17b;font-weight:700}.ghost{border-color:#344b54;background:transparent}.tiny{font:10px/1.5 ui-monospace,monospace;letter-spacing:.09em;color:#a8bbc1;text-transform:uppercase}.top{position:sticky;top:0;z-index:9;display:flex;align-items:center;justify-content:space-between;gap:12px;background:#091824f5;backdrop-filter:blur(12px);border-bottom:1px solid #29424b;padding:10px clamp(12px,3vw,32px)}.identity{font-weight:730;letter-spacing:-.04em;font-size:18px;white-space:nowrap}.identity i{color:#e7c17b;font-style:normal}.top .actions{display:flex;gap:6px}.top button{min-height:38px;padding:6px 11px;font-size:12px}.progress{height:3px;background:#2e4148}.progress>i{display:block;height:100%;background:#e8c17a}.layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(250px,320px);min-height:calc(100dvh - 92px)}.page{padding:clamp(22px,5vw,64px) clamp(18px,6vw,90px);max-width:930px;width:100%;margin:auto;align-self:center}.page h1{font:500 clamp(34px,5vw,65px)/1.08 Georgia,serif;letter-spacing:-.045em;margin:10px 0 12px;color:#f7e9d1}.deck{font-size:14px;color:#aabfc0;max-width:60ch}.paper{border-top:1px solid #49616a;margin-top:26px;padding:20px 0 10px}.kicker{color:#e0b778;font:11px/1.5 monospace;letter-spacing:.1em;text-transform:uppercase}.passage{font:clamp(24px,2.8vw,35px)/1.55 Georgia,serif;letter-spacing:-.012em;overflow-wrap:anywhere;color:#f3eee4;white-space:pre-wrap;max-width:42ch;margin:14px 0 19px}.paper.remote .passage{color:#c7dae0}.hint{font-size:12px;color:#a7bfc4}.sentence{border:0;background:transparent;border-radius:0;min-height:0;padding:1px 2px;color:inherit;font:inherit;text-align:left;display:inline;line-height:inherit;box-decoration-break:clone;-webkit-box-decoration-break:clone}.sentence:hover,.sentence:focus-visible{background:#24424e;color:#f9d898}.sentence.held{background:#79614366;box-shadow:inset 0 -2px #e4bf78}.handle{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.handle button{font-size:12px}.status{margin:18px 0;padding:10px 12px;border-left:2px solid #d3af73;background:#132833;font-size:12px;color:#d3dcd9}.scrub{display:flex;gap:14px;align-items:center;margin-top:27px}.scrub input{accent-color:#e7bd73;flex:1;min-width:0;touch-action:pan-y}.scrub span{font:11px monospace;color:#bacacb;white-space:nowrap}.nextbar{position:sticky;bottom:0;background:#081823f7;border-top:1px solid #314d58;display:flex;justify-content:space-between;align-items:center;padding:12px clamp(18px,6vw,90px);gap:7px}.nextbar .left{display:flex;gap:7px}.side{border-left:1px solid #29434b;background:#0b1d27;padding:24px 16px;min-width:0}.side h2{font:11px monospace;letter-spacing:.12em;color:#e6be7d;margin:0 0 10px}.side section{padding-bottom:23px;margin-bottom:23px;border-bottom:1px solid #283e48}.echo{width:100%;text-align:left;margin:6px 0;padding:11px 10px;display:block}.echo b{display:block;color:#e9c689;font-size:11px;letter-spacing:.1em}.echo span{display:block;margin-top:5px;color:#d1dcd8;font:14px/1.45 Georgia,serif}.quote{padding:10px 12px;border-left:2px solid #debb7c;margin:10px 0;color:#e1e7e2;font:16px/1.5 Georgia,serif;overflow-wrap:anywhere}.compare textarea,.source textarea{width:100%;border:1px solid #57717b;background:#071923;color:#f1eee4;padding:13px;resize:vertical;min-height:90px}.compare select{width:100%;background:#122833;color:#f7ecd9;border:1px solid #57717b;padding:12px}.compare button{margin-top:8px}.notice{font:12px/1.5 system-ui;color:#e9c180}.rsvp{border:1px solid #44606a;background:#081b26;margin:16px 0;padding:20px 10px;text-align:center}.rsvpword{font:500 clamp(28px,5vw,54px)/1.4 ui-monospace,monospace;min-height:1.5em;white-space:nowrap}.rsvpword .orb{color:#efbc69}.rsvp .controls{display:flex;gap:8px;justify-content:center;align-items:center;flex-wrap:wrap}.rsvp select{background:#0f2b38;color:#f1eee4;padding:9px}.source{max-width:750px;margin:7vh auto;padding:0 22px 50px}.source h1{font:500 clamp(34px,7vw,70px)/1.08 Georgia,serif;color:#ebcb96}.source textarea{min-height:190px;font:15px/1.5 monospace}.source input{display:block;width:100%;padding:10px;background:#071923;color:#f1eee4;border:1px solid #57717b}.source .controls{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:12px}.source label{display:block;font-size:12px;color:#a5bbbf;margin:15px 0}.source label input{margin-top:5px}.source input[type=file]{width:190px}.source p{color:#9eafb4;max-width:56ch}.empty{padding:10px;color:#adc3c5}a{color:#a2d0d9}.rail{display:flex;gap:4px;margin-top:8px;flex-wrap:wrap}.rail button{padding:4px 8px;min-height:32px;font-size:11px}.rail button.here{background:#e0ba79;color:#10222b}.rail button.preview{border-color:#e9c17d}.hidden{display:none!important}@media(max-width:760px){.layout{display:flex;flex-direction:column}.page{padding:19px 19px 0}.page h1{font-size:34px}.passage{font-size:26px;line-height:1.54;max-width:none}.paper{margin-top:18px}.side{border-left:0;border-top:1px solid #29434b;padding:19px}.top{padding:8px 12px}.identity{font-size:16px}.deck{font-size:12px}.nextbar{padding:9px 12px;padding-bottom:max(10px,env(safe-area-inset-bottom))}.nextbar button{padding:9px;min-width:64px}}@media(prefers-reduced-motion:reduce){.progress i{transition:none}}';
const host=document.createElement('div');host.id='readingPlay';host.setAttribute('aria-label','SLEEPER reading experience');const dom=host.attachShadow({mode:'open'});
dom.innerHTML='<style>'+style+'</style><div id="app"></div>';
document.body.append(host);const $=id=>dom.getElementById(id);
let error='',sourceOpen=false,readIndex=0,playing=false,timer=null,rsvpVisible=false;
const snap=()=>B.snapshot(),text=s=>String(s??'');
function stop(){clearTimeout(timer);timer=null;playing=false;try{speechSynthesis.cancel()}catch(_){}}
function element(tag,className,value){const e=document.createElement(tag);if(className)e.className=className;if(value!==undefined)e.textContent=value;return e;}
function button(label,handler,className){const b=element('button',className,label);b.type='button';b.onclick=handler;return b;}
function status(msg){error=msg;$('stateStatus')&&($('stateStatus').textContent=msg);}
function action(fn){try{fn();error='';render()}catch(e){status(e.message||String(e))}}
function move(id,travel){stop();readIndex=0;action(()=>travel?B.travel(id):B.inspect(id));}
function quote(m,w){return w?m.source.slice(w.start,w.end):'';}
function clean(s){return text(s).replace(/\s+/g,' ').trim();}
async function load(source,title,url=''){stop();error='';try{await B.load(source,title,url);sourceOpen=false;readIndex=0;render()}catch(e){error=e.message||String(e);sourceOpen=true;render()}}
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
 $('sourceError').textContent=error;
 $('backSource').onclick=()=>{if(snap().model){sourceOpen=false;render()}else location.assign('./')};
 $('loadSource').onclick=()=>load($('newText').value,$('newTitle').value,$('newURL').value);
 $('demo').onclick=()=>load(DEMO,'The Bell / original reading study');
 $('newFile').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>100000){$('sourceError').textContent='SOURCE_TOO_LARGE_100000';return}$('newText').value=await f.text();$('newTitle').value=f.name};
}
function render(){
 if(sourceOpen||!snap().model){showSource();return}
 const {model:m,session:s,inspected:id}=snap(),focus=m.nodes.find(n=>n.id===s.focus);
 const node=m.nodes.find(n=>n.id===id)||focus,i=m.nodes.indexOf(node),here=node.id===focus.id;
 const prev=m.nodes[m.nodes.indexOf(focus)-1],next=m.nodes[m.nodes.indexOf(focus)+1],w=s.witnesses[node.id];
 const mark=s.selected&&m.nodes.find(n=>n.id===s.selected),comp=mark&&mark.id!==node.id,choices=T.evidenceChoices(m,node.id);
 const legal=!here&&T.neighbors(m,s).some(e=>e.id===node.id),recent=s.links.at(-1),canReturn=T.canReturn(s);
 const suggestions=T.suggestions(m,s).filter(e=>e.id!==s.focus);
 let candidates=suggestions.slice(0,3).map(e=>({id:e.id,label:'ECHO · '+e.common.join(' · ')}));
 if(!candidates.length)for(const n of m.nodes){if(n.id===focus.id||Math.abs(m.nodes.indexOf(n)-m.nodes.indexOf(focus))<2)continue;candidates.push({id:n.id,label:'DISTANT / inspect only'});if(candidates.length===3)break}
 $('app').innerHTML='<div class="top"><div class="identity"><i>回</i> SLEEPER <span class="tiny">/ READ</span></div><div class="actions"><button id="mySource">MY TEXT</button><button id="fullField">FIELD ↗</button><button id="exit">EXIT</button></div></div><div class="progress"><i id="fill"></i></div><div class="layout"><main class="page"><div class="tiny" id="title"></div><h1>Follow the words,<br>not a corridor.</h1><div class="deck">Tap a sentence to hold evidence. Find an echo. Compare passages. Make a door the text earns.</div><div class="paper" id="paper"><div class="kicker" id="where"></div><div id="passage" class="passage"></div><div class="hint" id="hint"></div><div class="status" id="stateStatus" role="status"></div><div class="handle" id="actions"></div><div class="rsvp hidden" id="rsvp"><div class="tiny">RIDE / THIS PASSAGE</div><div class="rsvpword" id="rsvpword">✳</div><div class="controls"><button id="ridePlay">▶ RIDE</button><button id="rideReset">↶</button><label class="tiny">WPM <select id="rate"><option>180</option><option selected>260</option><option>360</option><option>480</option></select></label></div></div><div class="scrub"><span id="currentNumber"></span><input id="scrub" type="range" min="0" step="1" aria-label="Preview passage"><span id="totalNumber"></span></div><div class="rail" id="rail"></div></div></main><aside class="side"><section><h2>01 / THREADS TO INSPECT</h2><div class="tiny">Lexical echo ≠ agreement</div><div id="echoList"></div></section><section class="compare"><h2>02 / TWO EXACT WITNESSES</h2><div id="compare"></div></section><section><h2>03 / WHAT CHANGED?</h2><div id="payoff"></div></section><section><h2>RETURN / SAME SOURCE</h2><div id="return"></div></section></aside></div><div class="nextbar"><div class="left"><button id="prev">← PREV</button><button id="next" class="gold">NEXT →</button></div><div class="left"><button id="here">HERE ↩</button><button id="origin">ORIGIN</button></div></div>';
 $('title').textContent=m.meta.title+' · '+m.sha256.slice(0,12);
 $('fill').style.width=((i+1)/m.nodes.length*100)+'%';
 $('where').textContent=(here?'HERE':'INSPECT / NOT TRAVERSED')+' · '+(i+1)+' / '+m.nodes.length+' · CHAR '+node.start+'–'+node.end;
 $('paper').classList.toggle('remote',!here);
 const p=$('passage');for(const [j,e] of choices.entries()){
  const b=button(m.source.slice(e.start,e.end),()=>action(()=>B.hold(node.id,j)),'sentence'+(w&&w.start===e.start&&w.end===e.end?' held':''));
  b.setAttribute('aria-pressed',String(!!w&&w.start===e.start&&w.end===e.end));
  b.title='Hold exact source witness '+e.start+'–'+e.end;p.append(b,' ');
 }
 $('hint').textContent='Tap any sentence to HOLD its exact source span. No automatic semantic verdict.';
 $('stateStatus').textContent=error||(comp?'Read these two original passages. Hold a sentence here, then make a connection below.':!here?'This passage is a preview. You may inspect freely; travel uses source order or your doors.':recent?'Your door is now traversable. Cross it, undo it, or continue reading.':'Read → hold → inspect an echo → make a door. No maze.');
 const actions=$('actions');
 actions.append(button(w?'◆ SOURCE HELD':'◇ HOLD A SENTENCE',()=>{if(!w)action(()=>B.hold(node.id,0))},w?'gold':'ghost'));
 actions.append(button('▶ RIDE / RSVP',()=>{rsvpVisible=!rsvpVisible;if(!rsvpVisible)stop();$('rsvp').classList.toggle('hidden',!rsvpVisible)},'ghost'));
 actions.append(button('◖ LISTEN',()=>{stop();if(!('speechSynthesis'in window)){status('TTS_UNAVAILABLE');return}const u=new SpeechSynthesisUtterance(node.text);u.rate=.9;speechSynthesis.speak(u)},'ghost'));
 if(here)actions.append(button(s.selected===focus.id?'◆ MARKED':'MARK PASSAGE',()=>action(()=>B.mark(focus.id)),s.selected===focus.id?'gold':'ghost'));
 else actions.append(button(legal?'CROSS THIS DOOR →':'INSPECT ONLY',()=>{if(legal)move(node.id,true)},legal?'gold':'ghost'));
 $('rsvp').classList.toggle('hidden',!rsvpVisible);$('ridePlay').onclick=play;$('rideReset').onclick=()=>{stop();readIndex=0;$('rsvpword').textContent='✳';$('ridePlay').textContent='▶ RIDE'};
 $('scrub').max=m.nodes.length-1;$('scrub').value=i;$('currentNumber').textContent=String(i+1).padStart(2,'0');$('totalNumber').textContent=m.nodes.length+' passages';
 $('scrub').oninput=e=>move(m.nodes[+e.target.value].id,false);
 m.nodes.forEach((n,j)=>{const b=button(String(j+1).padStart(2,'0'),()=>move(n.id,false),n.id===s.focus?'here':n.id===node.id?'preview':'');b.title='Inspect '+(j+1);$('rail').append(b)});
 $('prev').disabled=!prev;$('next').disabled=!next;$('prev').onclick=()=>move(prev.id,true);$('next').onclick=()=>move(next.id,true);
 $('here').disabled=here;$('here').onclick=()=>move(focus.id,false);$('origin').disabled=s.focus===m.nodes[0].id;$('origin').onclick=home;
 for(const e of candidates){const n=m.nodes.find(n=>n.id===e.id);if(!n)continue;const b=button('',()=>move(n.id,false),'echo');b.append(element('b','',e.label+' · '+(m.nodes.indexOf(n)+1)),element('span','',clean(n.text).slice(0,140)));$('echoList').append(b)}
 if(!candidates.length)$('echoList').append(element('p','empty','No distant lexical echoes. Continue reading.'));
 const panel=$('compare');
 if(mark){
  panel.append(element('div','tiny','MARKED PASSAGE '+(m.nodes.indexOf(mark)+1)),element('blockquote','quote',quote(m,s.witnesses[mark.id])||'First hold a sentence in the marked passage.'));
  if(comp){
   panel.append(element('div','tiny','INSPECTED PASSAGE '+(i+1)),element('blockquote','quote',quote(m,w)||'Now hold a sentence in the inspected passage.'));
   const relation=element('select');relation.id='relation';for(const value of ['questions','contrasts','supports']){const o=element('option','',value.toUpperCase());o.value=value;relation.append(o)}
   const why=element('textarea');why.id='reason';why.placeholder='What changes when these two exact passages are read together? (12+ characters)';
   panel.append(relation,why,button('MAKE DOOR →',()=>{if(!s.witnesses[mark.id]||!s.witnesses[node.id]){status('HOLD_BOTH_EXACT_SENTENCES');return}action(()=>B.link(node.id,relation.value,why.value));},'gold'));
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
 $('mySource').onclick=()=>{sourceOpen=true;render()};
 $('fullField').onclick=()=>{stop();B.showField();host.style.display='none';document.body.style.overflow=''};
 $('exit').onclick=()=>{stop();location.assign('./')};
 let touchX=null;p.ontouchstart=e=>{touchX=e.touches.length===1?e.touches[0].clientX:null};p.ontouchend=e=>{if(touchX===null)return;const dx=e.changedTouches[0].clientX-touchX;touchX=null;if(Math.abs(dx)>110){const n=dx<0?next:prev;if(n)move(n.id,true)}};
}
dom.addEventListener('keydown',e=>{if(sourceOpen||['INPUT','TEXTAREA','SELECT'].includes(dom.activeElement?.tagName))return;const {model,session}=snap();if(!model)return;const i=model.nodes.findIndex(n=>n.id===session.focus);if(['ArrowRight','ArrowLeft'].includes(e.key)){const n=model.nodes[i+(e.key==='ArrowRight'?1:-1)];if(n){e.preventDefault();move(n.id,true)}}if(e.key==='Escape'){stop();B.showField();host.style.display='none';document.body.style.overflow=''}});
async function start(){
 document.body.style.overflow='hidden';
 if(query.get('src')&&query.get('read')==='1'){
  let attempts=0;const poll=()=>{if(snap().model){sourceOpen=false;render();return}if(attempts++>50){error='SOURCE_NOT_LOADED / use MY TEXT';sourceOpen=true;render();return}setTimeout(poll,100)};poll();return;
 }
 if(query.get('read')==='1'&&!query.has('bell')){sourceOpen=true;render();return;}
 await load(DEMO,'The Bell / original reading study');
}
start();
})();