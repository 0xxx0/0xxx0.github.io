import {GLYPHS,PARAMS,trial,score} from './recognition.mjs';
import {svg} from './core.mjs';
const $=id=>document.getElementById(id),host=$('recognition');
let items=[],answers=[],shown=0,started='',sessionSeed=0,receipt=null;
for(const glyph of [...GLYPHS,'?']){
  const b=document.createElement('button');b.type='button';b.textContent=glyph==='?'?'UNREADABLE':glyph;
  b.onclick=()=>answer(glyph);$('recognitionChoices').append(b);
}
function show(){
  $('recognitionProgress').textContent=`${answers.length+1} / ${items.length} · type or select`;
  $('recognitionGlyph').innerHTML=svg(items[answers.length].strokes,{size:32});
  $('recognitionGlyph').querySelector('svg').setAttribute('aria-label','Unlabelled diagnostic glyph');
  requestAnimationFrame(()=>{shown=performance.now();$('recognitionChoices').inert=false;$('recognitionChoices').querySelector('button').focus()});
}
function answer(response){
  if(!items.length||answers.length===items.length||$('recognitionChoices').inert)return;
  $('recognitionChoices').inert=true;
  answers.push({response,ms:Math.round(performance.now()-shown)});
  if(answers.length<items.length)return show();
  const result=score(items,answers);
  receipt={schema:'lab-type/recognition-001',started,completed:new Date().toISOString(),sessionSeed,params:PARAMS,
    viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},result,
    trials:items.map(({strokes,...item},i)=>({...item,...answers[i]}))};
  $('recognitionProgress').textContent=`SOURCE ${result.sourceCorrect}/12 · VARIANTS ${result.variantCorrect}/24 · ${result.decision}`;
  $('recognitionGlyph').replaceChildren();$('recognitionChoices').hidden=true;$('recognitionExport').hidden=false;
  document.querySelector('main').classList.remove('recognition-running');$('recognitionStart').disabled=false;$('recognitionStart').textContent='REPEAT';$('recognitionStart').focus();
}
$('recognitionStart').onclick=()=>{
  sessionSeed=crypto.getRandomValues(new Uint32Array(1))[0];items=trial(sessionSeed);answers=[];receipt=null;started=new Date().toISOString();
  document.querySelector('main').classList.add('recognition-running');$('recognitionStart').disabled=true;$('recognitionExport').hidden=true;$('recognitionChoices').hidden=false;$('recognitionChoices').inert=true;
  show();$('recognitionChoices').querySelector('button').focus();
};
host.addEventListener('keydown',e=>{
  if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.target===$('recognitionStart'))return;
  const key=e.key.toUpperCase();if([...GLYPHS,'?'].includes(key)){e.preventDefault();answer(key)}
});
$('recognitionExport').onclick=()=>{
  if(!receipt)return;const url=URL.createObjectURL(new Blob([JSON.stringify(receipt,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='lab-type-recognition.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
