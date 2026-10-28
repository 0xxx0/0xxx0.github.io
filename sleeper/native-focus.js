/* ONE RETURN // LOOK. Reading and experiments inside native POV.
   Native game owns movement, walls, Gates and RETURN. These are authored notes. */
(function(){
'use strict';
const stage=document.querySelector('#view-wrap'),app=document.querySelector('#app');
if(!stage||!app)return;
let opened=false,source='',words=[],index=0,scope=1,timer=null,wpm=260;
let key=null,pending=null,records=[];
const css=document.createElement('style');
css.textContent=[
 '#focusBtn{position:absolute;z-index:11;top:12px;left:12px;padding:10px 12px;min-height:42px;border:1px solid #bba46a;background:#071012e8;color:#f5dca4;font:12px monospace}',
 '#focusBtn[hidden],#focusLens[hidden],#focusLens [hidden]{display:none!important}',
 '#focusLens{position:absolute;z-index:18;left:8px;right:8px;bottom:8px;max-height:min(71vh,670px);overflow:auto;background:#061016f5;border:1px solid #9f885a;color:#e7ece6;box-shadow:0 0 80px #000b;padding:15px;font:13px/1.48 ui-monospace,monospace;touch-action:pan-y}',
 '#focusLens header{display:flex;align-items:center;justify-content:space-between;gap:8px;border-bottom:1px solid #35454a;padding-bottom:8px}',
 '#focusLens button{padding:8px 10px;min-height:42px;border:1px solid #627276;background:#0f2028;color:#e9e8df}',
 '#focusLens button.chosen{border-color:#d9b977;color:#ffdfa3}',
 '#focusLens textarea{display:block;box-sizing:border-box;width:100%;min-height:68px;padding:10px;resize:vertical;color:#edece6;background:#091920;border:1px solid #607079;line-height:1.5}',
 '#focusLens .row{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:9px 0}',
 '#focusLens .fine{color:#a4bbc1;font-size:11px;line-height:1.55;overflow-wrap:anywhere}',
 '#focusLens .focus{font:500 clamp(27px,7vw,44px)/1.2 Georgia,serif;color:#f2dca1;min-height:48px;margin:9px 0;overflow-wrap:anywhere}',
 '#focusLens .passage{font:17px/1.6 Georgia,serif;white-space:pre-wrap;color:#eff0df;overflow-wrap:anywhere;margin:12px 0}',
 '#focusLens .passage button{font:inherit;color:inherit;border:0;background:transparent;min-height:0;padding:0 1px}',
 '#focusLens .passage button.chosen{border-bottom:2px solid #e8c882;background:#e8c88228}',
 '#focusLens input[type=range]{flex:1;min-width:85px;accent-color:#e8c882}',
 '#focusLens .trace{border-left:2px solid #dfbd7d;padding-left:10px;white-space:pre-wrap;margin:12px 0;color:#c8d5d3}',
 '#focusLens .divider{border-top:1px solid #324348;padding-top:12px;margin-top:12px}',
 '#focusLens .gold{color:#e8c882}',
 '@media(min-width:900px){#focusLens{width:min(650px,calc(100% - 28px));left:50%;right:auto;transform:translateX(-50%)}}'
].join('');
document.head.append(css);
const launch=document.createElement('button');launch.id='focusBtn';launch.type='button';launch.textContent='◉ LOOK / READ';launch.hidden=true;stage.append(launch);
const lens=document.createElement('section');lens.id='focusLens';lens.hidden=true;lens.setAttribute('aria-label','ONE RETURN source and experiment lens');
lens.innerHTML=[
 '<header><div><strong class="gold">LOOK / ONE RETURN</strong><div class="fine" id="fWhere"></div></div><button id="fClose">↩ POV</button></header>',
 '<div class="fine" id="fSourceId"></div>',
 '<div class="row"><button data-focus="0">WORD</button><button data-focus="1" class="chosen">PHRASE</button><button data-focus="2">SOURCE</button><span class="fine">AXIS / SCALE</span></div>',
 '<div class="focus" id="fFocus"></div><div class="passage" id="fPassage"></div>',
 '<div class="row"><button id="fPrev">←</button><button id="fPlay">▶ RSVP</button><button id="fNext">→</button><button id="fSpeed">260 WPM</button>',
 '<input type="range" min="0" max="0" value="0" id="fScrub" aria-label="Exact source word position"></div>',
 '<div class="fine" id="fOffset"></div><div class="trace" id="fGate"></div>',
 '<div class="divider"><div class="gold">ONE TEST / PREDICT → ACT → COMPARE</div>',
 '<p class="fine">Your interpretation cannot open Gates. Predict what a native action will change, return to this same POV, act, and inspect the real result.</p>',
 '<textarea id="fBefore" placeholder="If I ... then I expect ..."></textarea>',
 '<div class="row"><button id="fTry">TRY IT IN THE WORLD ↗</button><button id="fDiscard" hidden>DISCARD TEST</button></div>',
 '<div id="fCompare" hidden><div class="trace" id="fActual"></div><textarea id="fAfter" placeholder="What actually happened? Which assumption changed, or remains untested?"></textarea>',
 '<div class="row"><button id="fCarry">CARRY COMPARISON</button></div></div>',
 '<div id="fReceipt" class="fine"></div></div>',
 '<p class="fine">SOURCE = your phrase or selected exact excerpt. RSVP is an attention clock, not a proof. Human interpretations remain separate from the eight canonical Gate receipts.</p>'
].join('');
stage.append(lens);
const $=id=>lens.querySelector('#'+id);
function stop(){if(timer)clearInterval(timer);timer=null;$('fPlay').textContent='▶ RSVP'}
function split(text){
 const arr=[],re=/[\p{L}\p{N}][\p{L}\p{M}\p{N}'’\-]*/gu;let m;
 while((m=re.exec(text)))arr.push({from:m.index,to:m.index+m[0].length,word:m[0]});
 return arr;
}
function spanAt(pos){
 let from=0,to=source.length;for(const m of source.matchAll(/[.!?;।॥]+(?:\s+|$)/gu)){
  if(m.index+m[0].length<=pos)from=m.index+m[0].length;
  else{to=m.index+m[0].length;break}
 }
 return source.slice(from,to).trim();
}
function focus(i){
 index=Math.max(0,Math.min(words.length-1,Number(i)||0));
 const word=words[index]||{from:0,to:0,word:''};
 $('fFocus').textContent=scope===0?word.word:scope===1?spanAt(word.from):source;
 $('fOffset').textContent='SOURCE '+word.from+'–'+word.to+' · '+(index+1)+'/'+words.length+' words · scope '+['WORD','PHRASE','SOURCE'][scope];
 $('fScrub').value=index;
 lens.querySelectorAll('#fPassage button').forEach((b,j)=>b.classList.toggle('chosen',j===index));
}
function showWords(){
 const frag=document.createDocumentFragment();let last=0;
 words.forEach((w,i)=>{
  frag.append(document.createTextNode(source.slice(last,w.from)));
  const b=document.createElement('button');b.type='button';b.textContent=w.word;
  b.setAttribute('aria-label','Focus word '+(i+1)+' '+w.word);
  b.addEventListener('click',()=>{stop();focus(i)});
  frag.append(b);last=w.to;
 });
 frag.append(document.createTextNode(source.slice(last)));
 $('fPassage').replaceChildren(frag);
}
function snapshot(){
 return{worldKey:game.law.key,steps:game.steps,position:[+game.player.x.toFixed(3),+game.player.y.toFixed(3)],
  proofs:game.proofs.map(p=>p.gate+':'+p.token),events:game.routeEvents.length,cuts:game.routeEvents.filter(e=>e.type==='cut').length};
}
function comparison(){
 if(!pending)return;
 const before=pending.before,now=snapshot(),events=game.routeEvents.slice(before.events);
 const newProof=now.proofs.filter(x=>!before.proofs.includes(x));
 const acts=events.filter(x=>x.type==='operator').map(x=>x.operator);
 const dist=Math.hypot(now.position[0]-before.position[0],now.position[1]-before.position[1]);
 $('fActual').textContent=
  'Same world: '+String(before.worldKey===now.worldKey)+'\nMoved: '+dist.toFixed(2)+' world units · '+(now.steps-before.steps)+' steps\n'+
  'Actions: '+(acts.join(' → ')||'none')+'\nWalls cut: '+(now.cuts-before.cuts)+'\nNew native Gate proofs: '+(newProof.join(', ')||'none');
 $('fBefore').value=pending.prediction;$('fBefore').disabled=true;
 $('fTry').hidden=true;$('fDiscard').hidden=false;$('fCompare').hidden=false;
}
function resetTest(){
 pending=null;$('fBefore').value='';$('fBefore').disabled=false;$('fAfter').value='';
 $('fCompare').hidden=true;$('fTry').hidden=false;$('fDiscard').hidden=true;
 $('fReceipt').textContent=records.length+' carried in this world; no automatic doctrinal claim';
}
function open(){
 if(!game||opened||app.classList.contains('hidden'))return false;
 if(key!==game.law.key){key=game.law.key;index=0;records=[];resetTest()}
 source=String(game.law.source||'');words=split(source);
 $('fScrub').max=Math.max(0,words.length-1);
 $('fSourceId').textContent=game.sourceWitness
  ?'EXACT DOCUMENT '+game.sourceWitness.document.sha256.slice(0,16)+'… · '+game.sourceWitness.span.start+'–'+game.sourceWitness.span.end
  :'WORLD PHRASE · local identity '+SleeperSourceAperture.hash(source)+' (not a SHA-256 document witness)';
 const ng=nearestGate(game,5);
 $('fGate').textContent=ng?ng.gate.glyph+' '+ng.gate.name+' / '+ng.gate.token+'\n'+ng.gate.instruction:'No Gate within five units · attention is not a Gate';
 $('fWhere').textContent=key+' · x'+game.player.x.toFixed(1)+' y'+game.player.y.toFixed(1)+' · '+game.gateCount+'/8 native Gates';
 showWords();focus(index);if(pending)comparison();
 else $('fReceipt').textContent=records.length+' carried comparisons · session-only until RETURN';
 game.keys.clear();game.lastMovedAt=performance.now();opened=true;lens.hidden=false;$('fClose').focus();return true;
}
function close(){
 stop();opened=false;lens.hidden=true;if(game){game.keys.clear();game.lastMovedAt=performance.now()}
 launch.focus();return true;
}
launch.addEventListener('click',open);$('fClose').addEventListener('click',close);
lens.querySelectorAll('[data-focus]').forEach(b=>b.addEventListener('click',()=>{
 scope=Number(b.dataset.focus);lens.querySelectorAll('[data-focus]').forEach(x=>x.classList.toggle('chosen',x===b));focus(index)
}));
$('fPrev').addEventListener('click',()=>{stop();focus(index-1)});
$('fNext').addEventListener('click',()=>{stop();focus(index+1)});
$('fScrub').addEventListener('input',e=>{stop();focus(e.target.value)});
$('fPlay').addEventListener('click',()=>{
 if(timer){stop();return}if(!words.length)return;if(index>=words.length-1)focus(0);
 $('fPlay').textContent='❚❚ PAUSE';
 timer=setInterval(()=>{if(index>=words.length-1){stop();return}focus(index+1)},Math.round(60000/wpm));
});
$('fSpeed').addEventListener('click',()=>{wpm=wpm===260?340:wpm===340?180:260;$('fSpeed').textContent=wpm+' WPM';stop()});
$('fTry').addEventListener('click',()=>{
 const prediction=$('fBefore').value.trim(),w=words[index];
 if(prediction.length<4){$('fReceipt').textContent='Name an expected consequence first, or return to the POV without a test.';return}
 pending={prediction,before:snapshot(),range:w?[w.from,w.to]:[0,0],word:w?.word||''};
 close();
});
$('fDiscard').addEventListener('click',resetTest);
$('fCarry').addEventListener('click',()=>{
 const observed=$('fAfter').value.trim();if(observed.length<4){$('fReceipt').textContent='State what you observed, including uncertainty.';return}
 records.push({schema:'sleeper.pov-attention-record/v0.1',authority:'HUMAN_INTERPRETATION_NOT_GATE_PROOF',
  worldKey:key,sourceHash:SleeperSourceAperture.hash(source),
  range:pending.range,exactQuote:pending.word,
  document:game.sourceWitness?{sha256:game.sourceWitness.document.sha256,span:game.sourceWitness.span}:null,
  prediction:pending.prediction,observation:observed,before:pending.before,after:snapshot(),
  nativeEvents:game.routeEvents.slice(pending.before.events).map(e=>({type:e.type,step:e.step,gate:e.gate||null,operator:e.operator||null}))});
 resetTest();$('fReceipt').textContent='CARRIED · '+records.length+' comparison(s). Native Gate proofs unchanged.';
});
document.addEventListener('keydown',e=>{
 if(!opened)return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();return}
 if(!['TEXTAREA','INPUT'].includes(e.target.tagName)&&/^(w|a|s|d|q|e|c|k|p|8|ArrowUp|ArrowDown|ArrowLeft|ArrowRight)$/.test(e.key)){
  e.preventDefault();e.stopImmediatePropagation();
 }
},true);
new MutationObserver(()=>{
 const active=!app.classList.contains('hidden');launch.hidden=!active;if(!active&&opened)close();
}).observe(app,{attributes:true,attributeFilter:['class']});
window.SleeperFocus=Object.freeze({open,close,isOpen:()=>opened,
 state:()=>({opened,worldKey:key,scope,index,words:words.length,pending:!!pending,records:records.length}),
 selection:()=>{const w=words[index];return w?Object.freeze({word:w.word,start:w.from,end:w.to}):null;},
 sidecar:()=>({schema:'sleeper.pov-attention-sidecar/v0.1',worldKey:key,authority:'HUMAN_INTERPRETATION_NOT_GATE_PROOF',records:records.map(r=>JSON.parse(JSON.stringify(r))),echo:window.SleeperEcho?.sidecar?.()||null})
});
})();