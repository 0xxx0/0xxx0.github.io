(()=>{'use strict';
const HOST_ID='lens-proof-bench';
const STORE_KEY='lens:proof:runs:v1';
const LAST_KEY='lens:proof:last:v1';
const TASKS={
  T1_LOCATE:{
    label:'T1 / LOCATE',
    prep:'AXIAL_LATEST',
    instruction:'Using normal FIELD controls, focus SCALE LENS. DONE when /fold-bloom/lens/ is the selected route.'
  },
  T2_CONTEXT:{
    label:'T2 / CONTEXT',
    prep:'VISUAL',
    instruction:'From VISUAL, visit one same-parent peer, restore the starting route, then DONE.'
  },
  T3_REFRACT_RETURN:{
    label:'T3 / REFRACT + RETURN',
    prep:'AXIAL_LATEST',
    instruction:'Open LENS. VISUAL → STRUCTURE → VISUAL → RETURN. Focus must stay on the starting route.'
  }
};
let active=null,events=[],lensActions=[];
const now=()=>new Date().toISOString();
const api=()=>window.FieldLensAPI;
const host=()=>window.FieldLensHost;
const route=()=>{try{return host()?.focus?.()||null}catch(_){return null}};
const snap=()=>{try{return api()?.snapshot?.()||null}catch(_){return null}};
const ui=()=>{try{return api()?.uiState?.()||null}catch(_){return null}};
const readRuns=()=>{try{const x=JSON.parse(localStorage.getItem(STORE_KEY)||'[]');return Array.isArray(x)?x:[]}catch(_){return []}};
const writeRuns=x=>{try{localStorage.setItem(STORE_KEY,JSON.stringify(x.slice(-60)))}catch(_){}};
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function setCondition(condition){
  const a=api(),s=snap();if(!a||!s)return;
  const on=!!s.meta?.foveate,want=condition==='FOVEATED';
  if(on!==want)a.applyLens?.('field-foveate');
}
function prep(task,condition){
  const a=api();if(!a)return;
  setCondition(condition);
  a.project?.(TASKS[task]?.prep||'AXIAL_LATEST');
}
function stateEvent(source='FIELD'){
  if(!active)return;
  const r=route(),s=snap(),u=ui();
  const e={at:now(),source,href:r?.href||null,parent:r?.parent||null,projection:s?.projection||u?.projection||null,mapRoot:u?.mapRoot||null,foveate:!!s?.meta?.foveate};
  const prev=events.at(-1);
  const sig=x=>[x?.href,x?.projection,x?.mapRoot,x?.foveate].join('|');
  if(!prev||sig(prev)!==sig(e))events.push(e);
}
function hasSubsequence(xs,seq){
  let i=0;for(const x of xs)if(x===seq[i]&&++i===seq.length)return true;return false;
}
function evaluate(run){
  const endRoute=route(),target=run.targetHref,task=run.task;
  const focusEvents=events.filter((e,i,a)=>i===0||e.href!==a[i-1]?.href);
  const projectionEvents=events.map(e=>e.projection).filter((x,i,a)=>x&&x!==a[i-1]);
  let wrong=0,peerVisits=0,completion=false,identityContinuity=true,returnSeen=lensActions.some(x=>x.action==='RETURN');
  if(task==='T1_LOCATE'){
    wrong=focusEvents.filter(e=>e.href&&e.href!==target).length;
    completion=endRoute?.href===target;
    identityContinuity=completion;
  }else if(task==='T2_CONTEXT'){
    for(const e of focusEvents){
      if(!e.href||e.href===target)continue;
      if(e.parent===run.targetParent)peerVisits++;else wrong++;
    }
    completion=endRoute?.href===target&&peerVisits>0;
    identityContinuity=endRoute?.href===target;
  }else{
    wrong=focusEvents.filter(e=>e.href&&e.href!==target).length;
    identityContinuity=wrong===0&&endRoute?.href===target;
    completion=identityContinuity&&hasSubsequence(projectionEvents,['VISUAL','STRUCTURE','VISUAL'])&&returnSeen;
  }
  return{completion,wrongRouteSelections:wrong,peerVisits,identityContinuity,returnSeen,projectionSequence:projectionEvents};
}
function start(task,condition){
  if(!api()||!host())return null;
  prep(task,condition);
  const r=route();if(!r)return null;
  events=[];lensActions=[];
  active={
    schema:'0xxx0/lens-proof-run/v0.1',
    id:'lens-proof-'+Date.now(),
    task,condition,
    startedAt:now(),
    targetHref:task==='T1_LOCATE'?'/fold-bloom/lens/':r.href,
    targetParent:task==='T1_LOCATE'?'/fold-bloom/':(r.parent||'/'),
    entryRoute:r.href,
    entryState:snap(),
    entryUI:ui()
  };
  stateEvent('START');
  render();
  return active;
}
function finish(orientationResidue='CLEAR'){
  if(!active)return null;
  stateEvent('DONE');
  const endedAt=now(),evald=evaluate(active);
  const run={...active,endedAt,durationMs:Math.max(0,Date.parse(endedAt)-Date.parse(active.startedAt)),stateTransitions:Math.max(0,events.length-1),lensActionCount:lensActions.length,events:events.slice(),lensActions:lensActions.slice(),endRoute:route()?.href||null,endState:snap(),endUI:ui(),orientationResidue,...evald};
  const runs=readRuns();runs.push(run);writeRuns(runs);try{sessionStorage.setItem(LAST_KEY,JSON.stringify(run))}catch(_){}
  active=null;events=[];lensActions=[];render();
  return run;
}
function clearRuns(){writeRuns([]);try{sessionStorage.removeItem(LAST_KEY)}catch(_){}render()}
async function copyRuns(){
  const packet={schema:'0xxx0/lens-proof-packet/v0.1',exportedAt:now(),source:location.pathname,protocol:'/control/LENS_FOVEATE_PROOF_2026-09-21.json',runs:readRuns()};
  const txt=JSON.stringify(packet,null,2);
  try{await navigator.clipboard.writeText(txt)}catch(_){prompt('Copy Lens proof receipt:',txt)}
  return packet;
}
function taskInstruction(task){
  if(task==='T2_CONTEXT'||task==='T3_REFRACT_RETURN'){
    const r=route();return (TASKS[task]?.instruction||'')+(r?' START OBJECT: '+r.href:'');
  }
  return TASKS[task]?.instruction||'';
}
function ensureUI(){
  let el=document.getElementById(HOST_ID);if(el)return el;
  el=document.createElement('aside');el.id=HOST_ID;
  el.innerHTML='<style>#lens-proof-bench{position:fixed;z-index:2147483645;right:max(8px,env(safe-area-inset-right));top:max(8px,env(safe-area-inset-top));width:min(390px,calc(100vw - 16px));border:1px solid #39454d;background:#090d0ff7;color:#edf1ef;font:9px/1.4 ui-monospace,monospace;box-shadow:0 8px 30px #000b;display:none}#lens-proof-bench.on{display:block}#lens-proof-bench *{box-sizing:border-box}#lens-proof-bench button,#lens-proof-bench select{border:0;border-radius:0;background:#0f1317;color:#edf1ef;font:inherit;padding:8px}#lens-proof-bench button{cursor:pointer}#lens-proof-bench button:hover{background:#172027}#lens-proof-bench .pbHead{display:flex;justify-content:space-between;align-items:center;padding:8px;border-bottom:1px solid #29343a}#lens-proof-bench .pbEy{font-size:7px;letter-spacing:.14em;color:#98d49b}#lens-proof-bench .pbGrid{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:#29343a}#lens-proof-bench .pbGrid>*{min-width:0}#lens-proof-bench .pbRun{display:grid;grid-template-columns:1fr 1fr 1fr;gap:1px;background:#29343a;border-top:1px solid #29343a}#lens-proof-bench .pbNote{padding:8px;color:#8b989d;border-top:1px solid #29343a}#lens-proof-bench .pbStat{padding:8px;color:#72bce7;border-top:1px solid #29343a;white-space:pre-wrap}#lens-proof-bench .hot{color:#ffd0bd}#lens-proof-bench .good{color:#98d49b}#lens-proof-bench .close{padding:4px 7px}</style><div class="pbHead"><div><div class="pbEy">PARKED COMPARATOR / OPTIONAL</div><b>PLAIN ↔ FOVEATED</b></div><button class="close">×</button></div><div class="pbGrid"><select data-p="task"><option value="T1_LOCATE">T1 / LOCATE</option><option value="T2_CONTEXT">T2 / CONTEXT</option><option value="T3_REFRACT_RETURN">T3 / REFRACT + RETURN</option></select><select data-p="condition"><option value="PLAIN">PLAIN</option><option value="FOVEATED">FOVEATED</option></select><select data-p="orientation"><option value="CLEAR">ORIENTATION / CLEAR</option><option value="MINOR">ORIENTATION / MINOR RESIDUE</option><option value="LOST">ORIENTATION / LOST</option></select><button data-p="start" class="hot">START</button></div><div class="pbNote" data-p="note">No clear gain was observed in the initial human trial. This comparator remains available only if you deliberately revisit FOVEATE.</div><div class="pbRun"><button data-p="done" class="good">DONE</button><button data-p="copy">COPY RECEIPTS</button><button data-p="clear">CLEAR LOCAL</button></div><div class="pbStat" data-p="stat">NO RUNS YET</div>';
  document.body.appendChild(el);
  const q=x=>el.querySelector('[data-p="'+x+'"]');
  el.querySelector('.close').onclick=()=>el.classList.remove('on');
  q('task').onchange=()=>{q('note').textContent=taskInstruction(q('task').value)};
  q('start').onclick=()=>{const run=start(q('task').value,q('condition').value);q('note').textContent=run?'RUNNING · '+taskInstruction(run.task):'NO FIELD FOCUS AVAILABLE'};
  q('done').onclick=()=>finish(q('orientation').value);
  q('copy').onclick=copyRuns;
  q('clear').onclick=clearRuns;
  return el;
}
function render(){
  const el=ensureUI(),q=x=>el.querySelector('[data-p="'+x+'"]'),runs=readRuns(),last=runs.at(-1);
  if(active){
    q('stat').textContent='RUNNING · '+active.task+' · '+active.condition+'\n'+active.targetHref+'\n'+events.length+' state snapshots · '+lensActions.length+' lens actions';
    q('done').disabled=false;
  }else{
    q('done').disabled=true;
    q('stat').textContent=last?[
      (last.completion?'PASS':'INCOMPLETE')+' · '+last.task+' · '+last.condition,
      last.durationMs+' ms · '+last.stateTransitions+' transitions · '+last.wrongRouteSelections+' wrong',
      'identity '+(last.identityContinuity?'OK':'BROKE')+' · return '+(last.returnSeen?'YES':'—')+' · '+last.orientationResidue,
      runs.length+' local run'+(runs.length===1?'':'s')+' retained'
    ].join('\n'):'NO RUNS YET';
  }
}
function open(){const el=ensureUI();el.classList.add('on');render();const q=el.querySelector('[data-p="task"]');el.querySelector('[data-p="note"]').textContent=taskInstruction(q.value)}
addEventListener('field-index:state',()=>stateEvent('FIELD'));
addEventListener('lens-proof:action',e=>{if(active)lensActions.push({at:now(),...(e.detail||{})})});
window.LensProof=Object.freeze({open,start,finish,copyRuns,clearRuns,readRuns,STORE_KEY,LAST_KEY});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{if(new URLSearchParams(location.search).has('lens_proof'))open()},{once:true});else if(new URLSearchParams(location.search).has('lens_proof'))open();
})();