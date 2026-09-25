import { availableForecasts, forecastMatchesCall, gateCellIndex, TYPE_NAMES, N, rotateSteps, release as simulateRelease } from './engine.js?v=0.13';
import {
  RUN_LENGTH,RUN_WIN_HITS,PUZZLE_ROUNDS,PUZZLE_WIN_STARS,DUET_ROUNDS,DUET_WIN_HITS,
  GARDEN_GENERATIONS,GARDEN_MOVES,GARDEN_SURVIVAL_TARGET,GARDEN_TRAITS,HEX_LINES,HEX_CHANGE_TARGET,HEX_CHANGE_LIMIT,
  circularDistance,relationVerb,relationName,lineBitForVerb,lineMark,trigramForBits,hexPair,hexOutcome,hexChangeOutcome,
  runOutcome,puzzleStars,puzzleOutcome,duetOutcome,gardenGoalMet,gardenSummary,gardenProgress,gardenOutcome,wrap
} from './play-core.js?v=0.5';
import {stateDescriptor,stateChange,formatState,movingLines} from '../state-language.js?v=0.1';

const VERSION='FOLD_BLOOM_PLAY_0.5';
const VALID=new Set(['PLAY','PUZZLE','PATH','DUET','GARDEN','ZEN']);
const ALIASES=new Map([['CONCERT','PLAY'],['RUN','PLAY'],['HEX','PUZZLE'],['YIJING','PUZZLE'],['ICHING','PUZZLE'],['PAR','PATH'],['TWO-DIAL','DUET'],['TWO_DIAL','DUET'],['ECOLOGY','GARDEN']]);
const params=new URLSearchParams(location.search);
const rawRequested=String(params.get('play')||'').toUpperCase();
const requested=ALIASES.get(rawRequested)||rawRequested;
let mode=VALID.has(requested)?requested:'PLAY';
let active=false,ended=false,releases=0,hits=0,flowGain=0,stars=0,turns=0,par=0;
let lastRotation=null,lastEventId=null,runtime=null,fieldEnter=null,root=null,result=null;
let duetPanel=null,duetB=0,duetHits=0;
let hexPanel=null,hexPlan=null,hexLines=[],hexPhase='FORM',hexFrom=null,hexChangeMoves=0;
let gardenChoice=null,gardenGeneration=1,gardenEvents=[],gardenTrait=null,gardenSurvived=0,gardenLineage=[],gardenLastResult=null;
let feedbackTimer=null;
const q=s=>document.querySelector(s);
const callText=call=>!call?'OPEN':call.verb+(call.chain>1?' ×'+call.chain+'+':'');

function parFor(state){
  if(!state?.call)return 0;
  const gate=gateCellIndex(state);
  const options=availableForecasts(state).filter(x=>forecastMatchesCall(state.call,x));
  return options.length?Math.min(...options.map(x=>circularDistance(gate,x.slot,N))):0;
}

function injectStyle(){
  if(q('#fbPlayStyle'))return;
  const style=document.createElement('style');style.id='fbPlayStyle';
  style.textContent=`
  .fbPlayEntry{margin:16px 0 2px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.025);padding:12px}
  .fbPlayEntry .law{font-size:9px;line-height:1.55;letter-spacing:.07em;color:#dce3ea;margin-bottom:10px}.fbPlayEntry .law b{color:#fff}
  .fbPlayEntry .modes{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.fbPlayEntry button{min-height:48px;padding:9px 10px;font-size:8px;font-weight:1000;letter-spacing:.08em}
  .fbPlayEntry button[data-play-mode="PLAY"]{background:#fff;color:#05070b;border-color:#fff}
  .fbGame{position:absolute;left:50%;top:max(58px,calc(env(safe-area-inset-top) + 54px));transform:translateX(-50%);z-index:6;width:min(680px,calc(100vw - 20px));pointer-events:auto;display:none}.fbGame.on{display:block}
  .fbGameBar{border:1px solid rgba(255,255,255,.16);background:rgba(5,8,12,.9);backdrop-filter:blur(10px);display:grid;grid-template-columns:auto 1fr auto;align-items:stretch;min-height:50px}
  .fbGameMode{display:flex;align-items:center;padding:0 10px;border-right:1px solid rgba(255,255,255,.12);font-size:7px;font-weight:1000;letter-spacing:.13em;color:#fff}
  .fbGameMission{min-width:0;padding:7px 10px}.fbGameMission b{display:block;font-size:10px;letter-spacing:.06em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fbGameMission span{display:block;margin-top:3px;font-size:7px;letter-spacing:.08em;color:rgba(255,255,255,.58);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .fbGameProgress{display:flex;align-items:center;gap:4px;padding:5px;border-left:1px solid rgba(255,255,255,.12);overflow-x:auto}.fbGameProgress b{font-size:8px;min-width:60px;text-align:center}.fbGameProgress button{min-width:36px;height:34px;padding:0 5px;font-size:6.5px;font-weight:1000}.fbGameProgress button.on{background:#fff;color:#05070b;border-color:#fff}
  .fbGameFeedback{margin-top:5px;border:1px solid transparent;background:rgba(5,8,12,.88);font:800 8px/1.35 ui-monospace,monospace;letter-spacing:.08em;text-align:center;padding:0 8px;max-height:0;opacity:0;overflow:hidden;transition:max-height .12s ease,opacity .12s ease,padding .12s ease}.fbGameFeedback.on{max-height:34px;opacity:1;padding:7px 8px;border-color:rgba(255,255,255,.13)}.fbGameFeedback[data-kind="hit"]{background:rgba(255,255,255,.94);color:#05070b}.fbGameFeedback[data-kind="miss"]{color:rgba(255,255,255,.72)}
  .fbDuetPanel,.fbHexPanel{position:absolute;left:50%;bottom:max(10px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:7;width:min(620px,calc(100vw - 20px));border:1px solid rgba(255,255,255,.16);background:rgba(5,8,12,.93);padding:9px;display:none;gap:8px;align-items:center;text-align:center;pointer-events:auto}.fbDuetPanel{grid-template-columns:1fr auto 1fr}.fbDuetPanel.on{display:grid}.fbHexPanel.on{display:block}
  .fbHexTitle{font:800 8px/1.4 ui-monospace,monospace;letter-spacing:.09em}.fbHexTitle b{font-size:12px}.fbHexLines{display:grid;grid-template-columns:repeat(6,1fr);gap:4px;margin:8px 0}.fbHexLine{border:1px solid rgba(255,255,255,.11);padding:6px 2px;font:900 11px/1 ui-monospace,monospace}.fbHexLine small{display:block;margin-top:4px;font-size:6px;color:rgba(255,255,255,.45)}.fbHexNow .fbHexLine.hit{background:#fff;color:#05070b}.fbHexLegend{font:7px/1.45 ui-monospace,monospace;letter-spacing:.06em;color:rgba(255,255,255,.48)}
  .fbDialBox{border:1px solid rgba(255,255,255,.12);padding:7px;font:700 8px/1.3 ui-monospace,monospace;letter-spacing:.08em}.fbDialBox b{display:block;font-size:18px;margin-top:3px}.fbDialCtl{display:flex;gap:4px;justify-content:center;margin-top:5px}.fbDialCtl button{width:44px;height:34px;font-size:16px;font-weight:900}
  .fbRelation{min-width:150px;font:800 8px/1.35 ui-monospace,monospace;letter-spacing:.08em}.fbRelation b{display:block;font-size:14px;margin:3px 0}.fbLegend{grid-column:1/-1;font:7px/1.4 ui-monospace,monospace;letter-spacing:.07em;color:rgba(255,255,255,.5)}
  .fbResult,.fbGardenChoice{position:absolute;inset:0;z-index:12;background:rgba(3,5,8,.91);backdrop-filter:blur(8px);display:none;align-items:center;justify-content:center;padding:18px;pointer-events:auto}.fbResult.on,.fbGardenChoice.on{display:flex}
  .fbResultCard,.fbGardenCard{width:min(560px,100%);border:1px solid rgba(255,255,255,.18);background:#080c12;padding:18px}.fbResultCard .ey,.fbGardenCard .ey{font-size:8px;color:#74808d;letter-spacing:.16em}.fbResultCard h2,.fbGardenCard h2{font-size:clamp(34px,10vw,68px);line-height:.9;letter-spacing:-.055em;margin:8px 0 12px}.fbResultCard p,.fbGardenCard p{font:10px/1.55 system-ui,-apple-system,sans-serif;color:#aab5c1;margin:0 0 14px}
  .fbResultCard .row{display:flex;gap:6px;flex-wrap:wrap}.fbResultCard button,.fbGardenCard button{min-height:46px;font-size:8px;font-weight:1000;letter-spacing:.08em}.fbResultCard button.primary{background:#fff;color:#05070b;border-color:#fff}
  .fbKids{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.fbKids button{padding:10px 8px;text-align:left}.fbKids button b{display:block;font-size:10px;margin-bottom:5px}.fbKids button span{display:block;font:7px/1.45 system-ui,sans-serif;color:rgba(255,255,255,.58)}
  html[data-fb-play-mode="ZEN"] .callpill,html[data-fb-play-mode="ZEN"] .diag{display:none!important}
  @media(max-width:720px){.fbPlayEntry .modes{grid-template-columns:1fr 1fr}.fbPlayEntry button[data-play-mode="PLAY"]{grid-column:1/-1}}
  @media(max-width:620px){.fbGame{top:max(54px,calc(env(safe-area-inset-top) + 50px));width:calc(100vw - 16px)}.fbGameBar{grid-template-columns:54px 1fr auto;min-height:50px}.fbGameMode{padding:0 6px;font-size:6px}.fbGameMission{padding:7px}.fbGameMission b{font-size:8px}.fbGameMission span{font-size:6px}.fbGameProgress{gap:2px;padding:3px}.fbGameProgress b{display:none}.fbGameProgress button{min-width:32px;height:32px;padding:0 3px;font-size:6px}.fbDuetPanel,.fbHexPanel{width:calc(100vw - 16px)}.fbDuetPanel{grid-template-columns:1fr 1fr}.fbRelation{grid-column:1/-1;grid-row:1}.fbLegend{font-size:6px}.fbKids{grid-template-columns:1fr}.fbResultCard,.fbGardenCard{max-height:calc(100vh - 28px);overflow:auto}}
  `;document.head.appendChild(style);
}

async function enterFromIntro(nextMode){
  const fieldBtn=q('#playBtn');
  if(fieldEnter&&fieldBtn){await fieldEnter.call(fieldBtn);start(nextMode);return;}
  start(nextMode);
}
function injectEntry(){
  const card=q('#intro .card');if(!card||q('#fbPlayEntry'))return;
  const lede=card.querySelector('.lede');if(lede)lede.textContent='Music shapes the road. You write it. Turn until the center predicts the CALL — BLOOM, FOLD, SPLIT or RETURN — then release.';
  const box=document.createElement('div');box.id='fbPlayEntry';box.className='fbPlayEntry';
  box.innerHTML='<div class="law"><b>ONE MOVE:</b> TURN → PREDICT → MATCH CALL → RELEASE.<br><b>WIN A RUN:</b> hit 6 of 8 calls. Every release changes the road, even a miss.<br><span style="color:rgba(255,255,255,.48)">ROAD: measured BEAT / PHRASE / SECTION terrain; your releases deform it.<br>PUZZLE = FORM → CHANGE: build six lines, then alter the state · PATH = shortest turns · TWO DIAL = relations · ECOLOGY = inheritance.</span><br><a href="../../foundry/axial/fan8-print.svg" target="_blank" rel="noopener" style="display:inline-block;margin-top:7px;color:#dce3ea;text-decoration:none;border-bottom:1px solid rgba(255,255,255,.28)">FAN/8 · PRINT PHYSICAL CONTROLLER ↗</a></div><div class="modes"><button data-play-mode="PLAY">RUN · HIT 6 / 8</button><button data-play-mode="PUZZLE">HEX · FORM → CHANGE</button><button data-play-mode="PATH">PATH · SHORTEST TURNS</button><button data-play-mode="DUET">TWO DIAL · RELATIONS</button><button data-play-mode="GARDEN">ECOLOGY · INHERIT</button><button data-play-mode="ZEN">ZEN · FREE</button></div>';
  card.insertBefore(box,card.querySelector('.startRow')||null);
  box.querySelectorAll('[data-play-mode]').forEach(btn=>btn.addEventListener('click',()=>enterFromIntro(btn.dataset.playMode)));
  const fieldBtn=q('#playBtn');
  if(fieldBtn&&!fieldBtn.dataset.fbPlayWrapped){fieldEnter=fieldBtn.onclick;fieldBtn.dataset.fbPlayWrapped='1';fieldBtn.textContent='PLAY FIELD COURSE · RUN →';fieldBtn.onclick=async event=>{if(fieldEnter)await fieldEnter.call(fieldBtn,event);start('PLAY');};}
}
function injectHud(){
  if(q('#fbGame'))return;
  root=document.createElement('div');root.id='fbGame';root.className='fbGame';
  root.innerHTML='<div class="fbGameBar"><div class="fbGameMode" id="fbMode">RUN</div><div class="fbGameMission"><b id="fbObjective">GOAL —</b><span id="fbCoach">TURN THE RING</span></div><div class="fbGameProgress"><b id="fbProgress">0 / 8</b><button data-switch="PLAY">RUN</button><button data-switch="PUZZLE">HEX</button><button data-switch="PATH">PAR</button><button data-switch="DUET">2D</button><button data-switch="GARDEN">ECO</button><button data-switch="ZEN">ZEN</button></div></div><div class="fbGameFeedback" id="fbGameFeedback" aria-live="polite"></div>';
  document.body.appendChild(root);root.querySelectorAll('[data-switch]').forEach(btn=>btn.addEventListener('click',()=>start(btn.dataset.switch)));
  duetPanel=document.createElement('div');duetPanel.id='fbDuetPanel';duetPanel.className='fbDuetPanel';
  duetPanel.innerHTML='<div class="fbDialBox">RING / DIAL A<b id="fbDialA">0</b></div><div class="fbRelation"><span id="fbRelationName">SAME</span><b id="fbRelationVerb">BLOOM</b><span id="fbDuetState">MAKE BOTH AGREE</span></div><div class="fbDialBox">PARTNER / DIAL B<b id="fbDialB">0</b><div class="fbDialCtl"><button id="fbDialMinus" aria-label="Partner dial left">−</button><button id="fbDialPlus" aria-label="Partner dial right">+</button></div></div><div class="fbLegend">SAME → BLOOM · NEAR → FOLD · FAR → RETURN · OPPOSITE → SPLIT</div>';
  document.body.appendChild(duetPanel);q('#fbDialMinus').onclick=()=>bumpPartner(-1);q('#fbDialPlus').onclick=()=>bumpPartner(1);
  hexPanel=document.createElement('div');hexPanel.id='fbHexPanel';hexPanel.className='fbHexPanel';
  hexPanel.innerHTML='<div class="fbHexTitle">TARGET <b id="fbHexTargetName">—</b></div><div class="fbHexLines fbHexTarget" id="fbHexTarget"></div><div class="fbHexTitle">YOU <b id="fbHexNowName">—</b></div><div class="fbHexLines fbHexNow" id="fbHexNow"></div><div class="fbHexLegend">FORM: BUILD 6 LINES BOTTOM → TOP · CHANGE: RING POSITION ADDRESSES LINE 1–6; RELEASE WRITES SOLID/BROKEN · SOLID = BLOOM/FOLD · BROKEN = SPLIT/RETURN</div>';
  document.body.appendChild(hexPanel);
  gardenChoice=document.createElement('div');gardenChoice.id='fbGardenChoice';gardenChoice.className='fbGardenChoice';
  gardenChoice.innerHTML='<div class="fbGardenCard"><div class="ey" id="fbGardenEy">GENERATION RETURN</div><h2>WHAT SURVIVES?</h2><p id="fbGardenBody"></p><div class="fbKids"><button data-garden-trait="BODY"><b>BODY</b><span>CHAIN ×2+ · preserve density.</span></button><button data-garden-trait="PATH"><b>PATH</b><span>2 structural ops · preserve topology.</span></button><button data-garden-trait="VOICE"><b>VOICE</b><span>3/4 CALL hits · preserve response.</span></button></div></div>';
  document.body.appendChild(gardenChoice);gardenChoice.querySelectorAll('[data-garden-trait]').forEach(btn=>btn.addEventListener('click',()=>chooseGardenTrait(btn.dataset.gardenTrait)));
  result=document.createElement('div');result.id='fbResult';result.className='fbResult';
  result.innerHTML='<div class="fbResultCard"><div class="ey" id="fbResultEy">RUN RETURN</div><h2 id="fbResultBig">ROAD HELD</h2><p id="fbResultBody"></p><div class="row"><button class="primary" data-result="AGAIN">AGAIN</button><button data-result="PLAY">RUN</button><button data-result="PUZZLE">PUZZLE</button><button data-result="PATH">PATH</button><button data-result="DUET">DUET</button><button data-result="GARDEN">GARDEN</button><button data-result="ZEN">ZEN</button><button data-result="DONOR" id="fbDonorBtn" hidden>OPEN DONOR</button><button data-result="EXPORT">EXPORT RUN</button></div></div>';
  document.body.appendChild(result);result.querySelectorAll('[data-result]').forEach(btn=>btn.addEventListener('click',()=>{const action=btn.dataset.result;if(action==='EXPORT'){exportPlayReturn();return;}if(action==='DONOR'){openDonor();return;}start(action==='AGAIN'?mode:action);}));
}
function flash(text,kind=''){
  const el=q('#fbGameFeedback');if(!el)return;clearTimeout(feedbackTimer);el.textContent=text;el.dataset.kind=kind;el.classList.remove('on');void el.offsetWidth;el.classList.add('on');feedbackTimer=setTimeout(()=>el.classList.remove('on'),1050);
}
function bumpPartner(delta){duetB=wrap(duetB+delta,6);if(runtime)update(runtime.state());}
function signedRotationToSlot(state,slot){
  const target=wrap(-Number(slot),N),current=wrap(Number(state?.rotation)||0,N);let d=wrap(target-current,N);if(d>N/2)d-=N;return d;
}
function makeHexPlan(state){
  let sim=state,bits=[],proof=[],salt=((Number(state?.seed)||1)^Math.imul((Number(state?.seq)||0)+1,0x9e3779b1))>>>0;
  for(let i=0;i<HEX_LINES;i++){
    const options=availableForecasts(sim);if(!options.length)break;
    const preferred=(salt>>>((i*3)%24))&1;
    let candidates=options.filter(o=>lineBitForVerb(o.verb)===preferred);if(!candidates.length)candidates=options;
    const choice=candidates[(salt+i*5)%candidates.length],bit=lineBitForVerb(choice.verb);
    bits.push(bit);proof.push({slot:choice.slot,verb:choice.verb,bit});
    sim=rotateSteps(sim,signedRotationToSlot(sim,choice.slot));
    const next=simulateRelease(sim);if(!next.event)break;sim=next.state;
    salt=Math.imul((salt^((Number(next.event.degree)||0)+31*(i+1)))>>>0,2654435761)>>>0;
  }
  const pair=hexPair(bits);return {lines:bits,proof,lower:pair.lower,upper:pair.upper};
}
function renderHexPanel(){
  if(!hexPanel||!hexPlan)return;
  const targetBits=hexPhase==='FORM'?hexPlan.lines:(hexFrom||hexPlan.lines),targetPair=hexPair(targetBits),nowPair=hexPair(hexLines),target=q('#fbHexTarget'),now=q('#fbHexNow'),delta=hexPhase==='CHANGE'?new Set(movingLines(hexFrom||[],hexLines)) : new Set();
  q('#fbHexTargetName').textContent=(hexPhase==='FORM'?'TARGET ':'FROM ')+(targetPair.lower?.glyph||'')+' '+(targetPair.lower?.key||'—')+' / '+(targetPair.upper?.glyph||'')+' '+(targetPair.upper?.key||'—');
  q('#fbHexNowName').textContent=(hexPhase==='CHANGE'?'NOW ':'YOU ')+(nowPair.lower?.glyph||'')+' '+(nowPair.lower?.key||'…')+(hexLines.length>=6?' / '+(nowPair.upper?.glyph||'')+' '+(nowPair.upper?.key||'…'):'');
  target.innerHTML=targetBits.map((bit,i)=>'<div class="fbHexLine">'+lineMark(bit)+'<small>'+(i+1)+'</small></div>').join('');
  now.innerHTML=Array.from({length:HEX_LINES},(_,i)=>{const has=i<hexLines.length,bit=has?hexLines[i]:null,hit=hexPhase==='FORM'?has&&Number(bit)===Number(hexPlan.lines[i]):delta.has(i+1);return '<div class="fbHexLine '+(hit?'hit':'')+'">'+(has?lineMark(bit):'···')+'<small>'+(delta.has(i+1)?'Δ':'')+(i+1)+'</small></div>'}).join('');
}
function resetModeState(){
  active=true;ended=false;releases=0;hits=0;flowGain=0;stars=0;turns=0;duetB=0;duetHits=0;hexPlan=null;hexLines=[];hexPhase='FORM';hexFrom=null;hexChangeMoves=0;
  gardenGeneration=1;gardenEvents=[];gardenTrait=null;gardenSurvived=0;gardenLineage=[];gardenLastResult=null;gardenChoice?.classList.remove('on');
}
function start(nextMode='PLAY'){
  mode=VALID.has(nextMode)?nextMode:'PLAY';runtime?.autopilot?.stop?.();q('#intro')?.classList.remove('on');result?.classList.remove('on');document.documentElement.dataset.fbPlayMode=mode;resetModeState();
  const state=runtime.state();lastRotation=state.rotation;lastEventId=state.history?.at(-1)?.id??null;par=parFor(state);if(mode==='PUZZLE')hexPlan=makeHexPlan(state);root.classList.add('on');duetPanel.classList.toggle('on',mode==='DUET');hexPanel.classList.toggle('on',mode==='PUZZLE');renderHexPanel();update(state);
}
function finish(state){
  active=false;ended=true;root.classList.remove('on');duetPanel.classList.remove('on');hexPanel.classList.remove('on');gardenChoice.classList.remove('on');runtime?.gameProjection?.set?.(null);
  const best=Math.max(1,Number(state.bestChain)||1),donor=q('#fbDonorBtn');donor.hidden=!['DUET','GARDEN'].includes(mode);donor.textContent=mode==='DUET'?'FULL TWO DIAL':'FULL ECOLOGY';
  if(mode==='PLAY'){const out=runOutcome(hits,releases);q('#fbResultEy').textContent=(out.clear?'RUN CLEAR':'RUN RETURN')+' · WIN '+RUN_WIN_HITS+'/'+RUN_LENGTH;q('#fbResultBig').textContent=out.label;q('#fbResultBody').textContent=hits+' / '+RUN_LENGTH+' CALLs hit · FLOW +'+flowGain+' · best chain '+best+'×. Every miss still changed topology; the road is the receipt.';}
  else if(mode==='PUZZLE'){
    const form=hexOutcome(hexPlan?.lines||[],hexPhase==='FORM'?hexLines:(hexFrom||[])),change=hexPhase==='CHANGE'?hexChangeOutcome(hexFrom||[],hexLines,hexChangeMoves):null,pair=hexPair(hexLines),delta=hexFrom?stateChange(hexFrom,hexLines):null,clear=hexPhase==='CHANGE'&&change?.clear;
    q('#fbResultEy').textContent=clear?'STATE CHANGE CLEAR':form.clear?'FORM HELD · CHANGE OPEN':'HEXAGRAM RETURN';
    q('#fbResultBig').textContent=clear?'STATE CHANGED':form.clear?'CHANGE OPEN':form.label;
    q('#fbResultBody').textContent=clear?(delta.token+' · '+hexChangeMoves+' change releases. The same releases changed the LIVE road; Δ names only the six-line projection.'):(form.clear?'Built '+stateDescriptor(hexFrom||hexLines).token+', but fewer than '+HEX_CHANGE_TARGET+' final lines changed before the '+HEX_CHANGE_LIMIT+'-release limit.':'Form '+form.matches+' / '+HEX_LINES+' lines matched. Solid/broken encodes LIVE topology continuity; the Yijing supplies the six-line grammar, not the gameplay meanings.');
  }
  else if(mode==='PATH'){const out=puzzleOutcome(stars);q('#fbResultEy').textContent=(out.clear?'PATH CLEAR':'PATH RETURN')+' · CLEAR '+PUZZLE_WIN_STARS+'/15';q('#fbResultBig').textContent=out.label;q('#fbResultBody').textContent=stars+' / 15 stars · '+hits+' / '+PUZZLE_ROUNDS+' CALLs hit · FLOW +'+flowGain+'. Three stars means the shortest known turn path.';}
  else if(mode==='DUET'){const out=duetOutcome(duetHits,releases);q('#fbResultEy').textContent=(out.clear?'DUET CLEAR':'DUET RETURN')+' · WIN '+DUET_WIN_HITS+'/'+DUET_ROUNDS;q('#fbResultBig').textContent=out.label;q('#fbResultBody').textContent=duetHits+' / '+DUET_ROUNDS+' synchronized CALLs. The road chose a consequence; the second dial had to name the same relation before release.';}
  else if(mode==='GARDEN'){const out=gardenOutcome(gardenSurvived,GARDEN_SURVIVAL_TARGET);q('#fbResultEy').textContent=(out.clear?'GARDEN CLEAR':'GARDEN RETURN')+' · WIN '+GARDEN_SURVIVAL_TARGET+'/'+GARDEN_SURVIVAL_TARGET+' TRAITS';q('#fbResultBig').textContent=out.label;q('#fbResultBody').textContent=gardenSurvived+' / '+GARDEN_SURVIVAL_TARGET+' inherited pressures survived · lineage '+(gardenLineage.join(' → ')||'ROOT')+'. Each four-move generation changed what the next one had to preserve.';}
  else{q('#fbResultEy').textContent='RETURN';q('#fbResultBig').textContent='OPEN';q('#fbResultBody').textContent='The field remains live.';}
  result.classList.add('on');
}
function showGardenChoice(){
  const s=gardenSummary(gardenEvents),inherited=gardenTrait?(gardenLastResult?'SURVIVED':'DID NOT SURVIVE'):'ROOT OBSERVED';
  q('#fbGardenEy').textContent='GEN '+gardenGeneration+' RETURN · '+inherited;
  q('#fbGardenBody').textContent='Parent: '+s.hits+'/4 CALLs · best chain '+s.best+'× · '+s.structural+' structural ops. Choose one trait-family to become the next generation’s pressure. This is Ecology: selection changes what must persist.';
  active=false;gardenChoice.classList.add('on');
}
function chooseGardenTrait(trait){
  if(!GARDEN_TRAITS[trait])return;gardenLineage.push(trait);gardenTrait=trait;gardenGeneration+=1;gardenEvents=[];gardenLastResult=null;gardenChoice.classList.remove('on');active=true;update(runtime.state());
}
function finishGardenGeneration(state){
  if(gardenTrait){gardenLastResult=gardenGoalMet(gardenTrait,gardenEvents);if(gardenLastResult)gardenSurvived+=1;}else gardenLastResult=null;
  if(gardenGeneration>=GARDEN_GENERATIONS){finish(state);return;}showGardenChoice();
}
function onRelease(event,state){
  const usedTurns=turns,targetPar=par,gain=Number(event.flowGain)||0;
  releases+=1;if(event.callMet)hits+=1;flowGain+=gain;
  if(mode==='PUZZLE'){
    const bit=lineBitForVerb(event.verb);
    if(hexPhase==='FORM'){
      const index=hexLines.length,expected=hexPlan?.lines?.[index];hexLines.push(bit);const locked=Number(bit)===Number(expected);
      flash((locked?'LINE LOCK · ':'LINE DRIFT · ')+(bit===1?'SOLID':'BROKEN')+' · '+event.verb,locked?'hit':'miss');
      if(hexLines.length>=HEX_LINES){
        const form=hexOutcome(hexPlan?.lines||[],hexLines);
        if(form.clear){hexFrom=[...hexLines];hexPhase='CHANGE';hexChangeMoves=0;flash('FORM LOCKED · NOW CHANGE '+HEX_CHANGE_TARGET+' LINES','hit');}
        else {renderHexPanel();turns=0;par=parFor(state);finish(state);return;}
      }
    }else{
      hexChangeMoves+=1;
      const line=wrap(state.rotation,6),before=hexLines[line];hexLines[line]=bit;const changed=Number(before)!==Number(bit),delta=movingLines(hexFrom||[],hexLines),out=hexChangeOutcome(hexFrom||[],hexLines,hexChangeMoves);
      flash('LINE '+(line+1)+' · '+(changed?'CHANGED':'HELD')+' · '+(bit===1?'SOLID':'BROKEN')+' · Δ{'+delta.join(',')+'}',changed?'hit':'miss');
      if(out.complete){renderHexPanel();turns=0;par=parFor(state);finish(state);return;}
    }
    renderHexPanel();
  }else if(mode==='PATH'){
    const gained=puzzleStars(event.callMet,usedTurns,targetPar);stars+=gained;
    flash(event.callMet?gained+'★ · '+usedTurns+'T / PAR '+targetPar+' · '+event.verb:'0★ · '+event.verb+' · CALL MISSED',event.callMet?'hit':'miss');
  }else if(mode==='DUET'){
    const synced=!!event.callMet&&relationVerb(state.rotation,duetB,6)===event.verb;if(synced)duetHits+=1;
    flash(synced?'SYNC · '+event.verb+' · '+duetHits+'/'+DUET_WIN_HITS:event.callMet?'CALL HIT · RELATION MISSED':'ROAD '+event.verb+' · CALL MISSED',synced?'hit':'miss');
  }else if(mode==='GARDEN'){
    gardenEvents.push(event);const p=gardenProgress(gardenTrait,gardenEvents);
    flash((gardenTrait?p.label:'PARENT SAMPLE')+' · '+event.verb+' · '+gardenEvents.length+'/'+GARDEN_MOVES,p.complete?'hit':'');
  }else if(mode==='PLAY'){
    flash(event.callMet?'CALL HIT · '+event.verb+' · +'+gain+' FLOW':'ROAD CHANGED · '+event.verb+' · CALL MISSED',event.callMet?'hit':'miss');
  }
  turns=0;par=parFor(state);
  if(mode==='PLAY'&&releases>=RUN_LENGTH)finish(state);else if(mode==='PATH'&&releases>=PUZZLE_ROUNDS)finish(state);else if(mode==='DUET'&&releases>=DUET_ROUNDS)finish(state);else if(mode==='GARDEN'&&gardenEvents.length>=GARDEN_MOVES)finishGardenGeneration(state);
}
function normalCoach(state,forecast,hitReady){
  if(hitReady)return 'HIT READY · RELEASE '+forecast.verb;
  if(forecast)return 'HERE '+forecast.verb+(forecast.chain>1?' ×'+forecast.chain:'')+' · KEEP TURNING FOR GOAL '+callText(state.call);
  return 'TURN · FIND '+(TYPE_NAMES[state.targetType]||'')+' · CENTER BUTTON WAKES ON A MATCH';
}
function updateDuet(state,forecast,hitReady){
  const a=wrap(state.rotation,6),rel=relationVerb(a,duetB,6),name=relationName(a,duetB,6),agrees=!!forecast&&rel===forecast.verb;
  q('#fbDialA').textContent=a;q('#fbDialB').textContent=duetB;q('#fbRelationName').textContent=name;q('#fbRelationVerb').textContent=rel;q('#fbDuetState').textContent=!forecast?'SEEK A ROAD CONSEQUENCE':agrees?'DIALS AGREE':'TUNE PARTNER TO '+forecast.verb;q('#fbObjective').textContent='GOAL '+callText(state.call);
  if(!forecast)q('#fbCoach').textContent='DIAL A IS THE RING · TURN UNTIL THE ROAD WAKES';else if(!hitReady)q('#fbCoach').textContent='ROAD '+forecast.verb+' · TURN RING FOR CALL '+callText(state.call);else if(!agrees)q('#fbCoach').textContent='ROAD '+forecast.verb+' ✓ · TUNE DIAL B UNTIL RELATION ALSO SAYS '+forecast.verb;else q('#fbCoach').textContent='DUET LOCKED · ROAD + RELATION AGREE · RELEASE';
  q('#fbProgress').textContent=releases+'/'+DUET_ROUNDS+' · '+duetHits+' SYNC';
}
function updateHex(state,forecast){
  renderHexPanel();
  if(hexPhase==='FORM'){
    const index=hexLines.length,desired=hexPlan?.lines?.[index],current=forecast?lineBitForVerb(forecast.verb):null,want=desired===1?'SOLID':'BROKEN',targetPair=hexPair(hexPlan?.lines||[]);
    q('#fbObjective').textContent='FORM · LINE '+Math.min(index+1,HEX_LINES)+' / '+HEX_LINES+' · WANT '+want;
    if(!forecast)q('#fbCoach').textContent='TURN · FIND A '+want+' CONSEQUENCE';
    else if(current===desired)q('#fbCoach').textContent=want+' READY · '+forecast.verb+' · RELEASE';
    else q('#fbCoach').textContent=(current===1?'SOLID':'BROKEN')+' HERE · '+forecast.verb+' · KEEP TURNING FOR '+want;
    q('#fbProgress').textContent=index+'/'+HEX_LINES+' · '+(targetPair.lower?.glyph||'')+(targetPair.upper?.glyph||'');
  }else{
    const line=wrap(state.rotation,6),before=hexLines[line],current=forecast?lineBitForVerb(forecast.verb):null,delta=movingLines(hexFrom||[],hexLines),willChange=forecast&&Number(current)!==Number(before);
    q('#fbObjective').textContent='CHANGE · LINE '+(line+1)+' · '+(before===1?'SOLID':'BROKEN')+' → '+(before===1?'BROKEN':'SOLID');
    if(!forecast)q('#fbCoach').textContent='TURN · ADDRESS A LINE + FIND ITS OPPOSITE CONSEQUENCE';
    else if(willChange)q('#fbCoach').textContent='CHANGE READY · '+forecast.verb+' WRITES '+(current===1?'SOLID':'BROKEN')+' · RELEASE';
    else q('#fbCoach').textContent='LINE '+(line+1)+' WOULD HOLD '+(before===1?'SOLID':'BROKEN')+' · KEEP TURNING';
    q('#fbProgress').textContent='Δ '+delta.length+'/'+HEX_CHANGE_TARGET+' · MOVE '+hexChangeMoves+'/'+HEX_CHANGE_LIMIT;
  }
}
function updateGarden(state,forecast,hitReady){
  if(gardenTrait){const p=gardenProgress(gardenTrait,gardenEvents);q('#fbObjective').textContent='GEN '+gardenGeneration+' · KEEP '+gardenTrait+' · '+p.label;q('#fbCoach').textContent=GARDEN_TRAITS[gardenTrait].short.toUpperCase()+' · '+normalCoach(state,forecast,hitReady);}else{q('#fbObjective').textContent='GEN 1 · OBSERVE THE PARENT';q('#fbCoach').textContent=normalCoach(state,forecast,hitReady);}
  q('#fbProgress').textContent='G'+gardenGeneration+'/'+GARDEN_GENERATIONS+' · '+gardenEvents.length+'/'+GARDEN_MOVES+' · '+gardenSurvived+'/'+GARDEN_SURVIVAL_TARGET;
}
function projectionView(state,forecast){
  const rel=relationVerb(wrap(state.rotation,6),duetB,6),relName=relationName(wrap(state.rotation,6),duetB,6);
  return {mode,active,releases,hits,stars,turns,par,forecast:forecast?{verb:forecast.verb,chain:forecast.chain}:null,
    hex:{phase:hexPhase,target:hexPlan?.lines||[],from:hexFrom||[],lines:[...hexLines],changed:hexFrom?movingLines(hexFrom,hexLines):[],moves:hexChangeMoves,targetChanges:HEX_CHANGE_TARGET,moveLimit:HEX_CHANGE_LIMIT},
    duet:{a:wrap(state.rotation,6),b:duetB,relation:relName,verb:rel,hits:duetHits},
    garden:{generation:gardenGeneration,trait:gardenTrait,survived:gardenSurvived,events:gardenEvents.length},
    path:{round:releases+1,stars,par,turns}};
}
function update(state){
  if(!active||!root)return;const forecast=runtime.forecast?.(),call=state.call,aligned=!!forecast,hitReady=aligned&&forecastMatchesCall(call,forecast);runtime?.gameProjection?.set?.(projectionView(state,forecast));
  q('#fbMode').textContent=mode==='PLAY'?'RUN':mode==='PUZZLE'?'HEX':mode==='PATH'?'PAR':mode;root.querySelectorAll('[data-switch]').forEach(btn=>btn.classList.toggle('on',btn.dataset.switch===mode));duetPanel.classList.toggle('on',mode==='DUET');hexPanel.classList.toggle('on',mode==='PUZZLE');
  if(mode==='ZEN'){q('#fbObjective').textContent='FREE RIDE';q('#fbCoach').textContent=aligned?'RELEASE '+forecast.verb+' · OR KEEP TURNING':'TURN · FEEL THE FIELD · RELEASE WHEN IT WAKES';q('#fbProgress').textContent='OPEN';return;}
  if(mode==='PUZZLE'){updateHex(state,forecast);return;}if(mode==='DUET'){updateDuet(state,forecast,hitReady);return;}if(mode==='GARDEN'){updateGarden(state,forecast,hitReady);return;}
  q('#fbObjective').textContent='GOAL '+callText(call);q('#fbCoach').textContent=normalCoach(state,forecast,hitReady);q('#fbProgress').textContent=mode==='PATH'?(releases+1)+'/'+PUZZLE_ROUNDS+' · '+stars+'★/'+PUZZLE_WIN_STARS+' · PAR '+par+' · '+turns+'T':releases+'/'+RUN_LENGTH+' · '+hits+'/'+RUN_WIN_HITS+' HIT';
}
function poll(){
  if(!runtime)return;const state=runtime.state();if(active&&lastRotation!==null&&state.rotation!==lastRotation)turns+=circularDistance(lastRotation,state.rotation,N);lastRotation=state.rotation;
  const event=state.history?.at(-1);if(active&&event&&event.id!==lastEventId){lastEventId=event.id;onRelease(event,state);}else if(event)lastEventId=event.id;if(active)update(state);
}
function playState(){
  return {version:VERSION,mode,active,ended,releases,hits,flowGain,stars,turns,par,hex:{phase:hexPhase,target:hexPlan?.lines||[],from:hexFrom||[],lines:[...hexLines],pair:hexPair(hexLines),form:mode==='PUZZLE'?hexOutcome(hexPlan?.lines||[],hexPhase==='FORM'?hexLines:(hexFrom||[])):null,change:mode==='PUZZLE'&&hexPhase==='CHANGE'?hexChangeOutcome(hexFrom||[],hexLines,hexChangeMoves):null,delta:hexFrom?stateChange(hexFrom,hexLines):null,moves:hexChangeMoves},duet:{partner:duetB,hits:duetHits},garden:{generation:gardenGeneration,trait:gardenTrait,survived:gardenSurvived,lineage:[...gardenLineage],events:[...gardenEvents]},win:{run:mode==='PLAY'?runOutcome(hits,releases):null,path:mode==='PATH'?puzzleOutcome(stars):null,duet:mode==='DUET'?duetOutcome(duetHits,releases):null,garden:mode==='GARDEN'?gardenOutcome(gardenSurvived):null}};
}
function exportPlayReturn(){
  const hexLanguage=mode==='PUZZLE'&&hexPlan?.lines?.length===HEX_LINES?{
    target:stateDescriptor(hexPlan.lines),
    formed:hexFrom?stateDescriptor(hexFrom):null,
    authored:hexLines.length===HEX_LINES?stateDescriptor(hexLines):{valid:false,bits:[...hexLines],token:'H['+formatState([...hexLines,...Array(Math.max(0,HEX_LINES-hexLines.length)).fill(0)])+']'},
    delta:hexFrom&&hexLines.length===HEX_LINES?stateChange(hexFrom,hexLines):null,
    phase:hexPhase,
    changeMoves:hexChangeMoves
  }:null;
  const packet={kind:'FOLD_BLOOM_PLAY_RETURN',version:VERSION,created:new Date().toISOString(),play:playState(),stateLanguage:hexLanguage,live:runtime?.state?.()||null,donors:{twoDial:'/fold-bloom/two-dial/',ecology:'/fold-bloom/ecology/',foldWeave:'/recovery/fold-bloom/fold-weave-0.1/',stateLanguage:'/fold-bloom/STATE_CHANGE.md'}};
  const blob=new Blob([JSON.stringify(packet,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='fold-bloom-play-'+mode.toLowerCase()+'-'+Date.now()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function openDonor(){if(mode==='DUET')window.open('../two-dial/','fold-bloom-two-dial');else if(mode==='GARDEN')window.open('../ecology/','fold-bloom-ecology');}
function boot(){
  runtime=window.FoldBloomLive;if(!runtime){setTimeout(boot,80);return;}injectStyle();injectEntry();injectHud();document.documentElement.dataset.foldBloomPlay=VERSION;if(VALID.has(requested))setTimeout(()=>start(requested),120);setInterval(poll,120);window.FoldBloomPlay={version:VERSION,start,state:playState,relation:(a,b)=>({name:relationName(a,b,6),verb:relationVerb(a,b,6)})};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
