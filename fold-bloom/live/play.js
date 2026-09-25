import { availableForecasts, forecastMatchesCall, gateCellIndex, TYPE_NAMES, N } from './engine.js';
import {
  RUN_LENGTH,RUN_WIN_HITS,PUZZLE_ROUNDS,PUZZLE_WIN_STARS,DUET_ROUNDS,DUET_WIN_HITS,
  GARDEN_GENERATIONS,GARDEN_MOVES,GARDEN_SURVIVAL_TARGET,GARDEN_TRAITS,
  circularDistance,relationVerb,relationName,runOutcome,puzzleStars,puzzleOutcome,
  duetOutcome,gardenGoalMet,gardenSummary,gardenOutcome,wrap
} from './play-core.js';

const VERSION='FOLD_BLOOM_PLAY_0.2';
const VALID=new Set(['PLAY','PUZZLE','DUET','GARDEN','ZEN']);
const params=new URLSearchParams(location.search);
const requested=String(params.get('play')||'').toUpperCase();
let mode=VALID.has(requested)?requested:'PLAY';
let active=false,ended=false,releases=0,hits=0,flowGain=0,stars=0,turns=0,par=0;
let lastRotation=null,lastEventId=null,runtime=null,fieldEnter=null,root=null,result=null;
let duetPanel=null,duetB=0,duetHits=0;
let gardenChoice=null,gardenGeneration=1,gardenEvents=[],gardenTrait=null,gardenSurvived=0,gardenLineage=[],gardenLastResult=null;
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
  .fbPlayEntry .modes{display:grid;grid-template-columns:1.35fr repeat(4,1fr);gap:6px}.fbPlayEntry button{min-height:48px;padding:9px 10px;font-size:8px;font-weight:1000;letter-spacing:.08em}
  .fbPlayEntry button[data-play-mode="PLAY"]{background:#fff;color:#05070b;border-color:#fff}
  .fbGame{position:absolute;left:50%;top:max(58px,calc(env(safe-area-inset-top) + 54px));transform:translateX(-50%);z-index:6;width:min(680px,calc(100vw - 20px));pointer-events:auto;display:none}.fbGame.on{display:block}
  .fbGameBar{border:1px solid rgba(255,255,255,.16);background:rgba(5,8,12,.9);backdrop-filter:blur(10px);display:grid;grid-template-columns:auto 1fr auto;align-items:stretch;min-height:50px}
  .fbGameMode{display:flex;align-items:center;padding:0 10px;border-right:1px solid rgba(255,255,255,.12);font-size:7px;font-weight:1000;letter-spacing:.13em;color:#fff}
  .fbGameMission{min-width:0;padding:7px 10px}.fbGameMission b{display:block;font-size:10px;letter-spacing:.06em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fbGameMission span{display:block;margin-top:3px;font-size:7px;letter-spacing:.08em;color:rgba(255,255,255,.58);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .fbGameProgress{display:flex;align-items:center;gap:4px;padding:5px;border-left:1px solid rgba(255,255,255,.12);overflow-x:auto}.fbGameProgress b{font-size:8px;min-width:60px;text-align:center}.fbGameProgress button{min-width:36px;height:34px;padding:0 5px;font-size:6.5px;font-weight:1000}.fbGameProgress button.on{background:#fff;color:#05070b;border-color:#fff}
  .fbDuetPanel{position:absolute;left:50%;bottom:max(10px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:7;width:min(620px,calc(100vw - 20px));border:1px solid rgba(255,255,255,.16);background:rgba(5,8,12,.93);padding:9px;display:none;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;text-align:center;pointer-events:auto}.fbDuetPanel.on{display:grid}
  .fbDialBox{border:1px solid rgba(255,255,255,.12);padding:7px;font:700 8px/1.3 ui-monospace,monospace;letter-spacing:.08em}.fbDialBox b{display:block;font-size:18px;margin-top:3px}.fbDialCtl{display:flex;gap:4px;justify-content:center;margin-top:5px}.fbDialCtl button{width:44px;height:34px;font-size:16px;font-weight:900}
  .fbRelation{min-width:150px;font:800 8px/1.35 ui-monospace,monospace;letter-spacing:.08em}.fbRelation b{display:block;font-size:14px;margin:3px 0}.fbLegend{grid-column:1/-1;font:7px/1.4 ui-monospace,monospace;letter-spacing:.07em;color:rgba(255,255,255,.5)}
  .fbResult,.fbGardenChoice{position:absolute;inset:0;z-index:12;background:rgba(3,5,8,.91);backdrop-filter:blur(8px);display:none;align-items:center;justify-content:center;padding:18px;pointer-events:auto}.fbResult.on,.fbGardenChoice.on{display:flex}
  .fbResultCard,.fbGardenCard{width:min(560px,100%);border:1px solid rgba(255,255,255,.18);background:#080c12;padding:18px}.fbResultCard .ey,.fbGardenCard .ey{font-size:8px;color:#74808d;letter-spacing:.16em}.fbResultCard h2,.fbGardenCard h2{font-size:clamp(34px,10vw,68px);line-height:.9;letter-spacing:-.055em;margin:8px 0 12px}.fbResultCard p,.fbGardenCard p{font:10px/1.55 system-ui,-apple-system,sans-serif;color:#aab5c1;margin:0 0 14px}
  .fbResultCard .row{display:flex;gap:6px;flex-wrap:wrap}.fbResultCard button,.fbGardenCard button{min-height:46px;font-size:8px;font-weight:1000;letter-spacing:.08em}.fbResultCard button.primary{background:#fff;color:#05070b;border-color:#fff}
  .fbKids{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.fbKids button{padding:10px 8px;text-align:left}.fbKids button b{display:block;font-size:10px;margin-bottom:5px}.fbKids button span{display:block;font:7px/1.45 system-ui,sans-serif;color:rgba(255,255,255,.58)}
  html[data-fb-play-mode="ZEN"] .callpill,html[data-fb-play-mode="ZEN"] .diag{display:none!important}
  @media(max-width:720px){.fbPlayEntry .modes{grid-template-columns:1fr 1fr}.fbPlayEntry button[data-play-mode="PLAY"]{grid-column:1/-1}}
  @media(max-width:620px){.fbGame{top:max(54px,calc(env(safe-area-inset-top) + 50px));width:calc(100vw - 16px)}.fbGameBar{grid-template-columns:54px 1fr auto;min-height:50px}.fbGameMode{padding:0 6px;font-size:6px}.fbGameMission{padding:7px}.fbGameMission b{font-size:8px}.fbGameMission span{font-size:6px}.fbGameProgress{gap:2px;padding:3px}.fbGameProgress b{display:none}.fbGameProgress button{min-width:32px;height:32px;padding:0 3px;font-size:6px}.fbDuetPanel{width:calc(100vw - 16px);grid-template-columns:1fr 1fr}.fbRelation{grid-column:1/-1;grid-row:1}.fbLegend{font-size:6px}.fbKids{grid-template-columns:1fr}.fbResultCard,.fbGardenCard{max-height:calc(100vh - 28px);overflow:auto}}
  `;document.head.appendChild(style);
}

async function enterFromIntro(nextMode){
  const fieldBtn=q('#playBtn');
  if(fieldEnter&&fieldBtn){await fieldEnter.call(fieldBtn);start(nextMode);return;}
  start(nextMode);
}
function injectEntry(){
  const card=q('#intro .card');if(!card||q('#fbPlayEntry'))return;
  const lede=card.querySelector('.lede');if(lede)lede.textContent='Music shapes the road. You decide what gets written into it. Turn, read the consequence, match the CALL, release.';
  const box=document.createElement('div');box.id='fbPlayEntry';box.className='fbPlayEntry';
  box.innerHTML='<div class="law"><b>ONE MOVE:</b> TURN → READ CONSEQUENCE → MATCH CALL → RELEASE.<br><b>WIN A RUN:</b> hit 6 of 8 calls. Misses still write the road; there are no lives.<br><span style="color:rgba(255,255,255,.48)">ROAD: measured BEAT / PHRASE / SECTION terrain; your releases deform it.</span><br><a href="../../foundry/axial/fan8-print.svg" target="_blank" rel="noopener" style="display:inline-block;margin-top:7px;color:#dce3ea;text-decoration:none;border-bottom:1px solid rgba(255,255,255,.28)">FAN/8 · PRINT PHYSICAL CONTROLLER ↗</a></div><div class="modes"><button data-play-mode="PLAY">RUN · HOLD 6 / 8</button><button data-play-mode="PUZZLE">PUZZLE · SOLVE 10★ / 15</button><button data-play-mode="DUET">DUET · SYNC 5 / 6</button><button data-play-mode="GARDEN">GARDEN · KEEP 2 / 2</button><button data-play-mode="ZEN">ZEN · FREE</button></div>';
  card.insertBefore(box,card.querySelector('.startRow')||null);
  box.querySelectorAll('[data-play-mode]').forEach(btn=>btn.addEventListener('click',()=>enterFromIntro(btn.dataset.playMode)));
  const fieldBtn=q('#playBtn');
  if(fieldBtn&&!fieldBtn.dataset.fbPlayWrapped){fieldEnter=fieldBtn.onclick;fieldBtn.dataset.fbPlayWrapped='1';fieldBtn.textContent='PLAY FIELD COURSE · RUN →';fieldBtn.onclick=async event=>{if(fieldEnter)await fieldEnter.call(fieldBtn,event);start('PLAY');};}
}
function injectHud(){
  if(q('#fbGame'))return;
  root=document.createElement('div');root.id='fbGame';root.className='fbGame';
  root.innerHTML='<div class="fbGameBar"><div class="fbGameMode" id="fbMode">RUN</div><div class="fbGameMission"><b id="fbObjective">GOAL —</b><span id="fbCoach">TURN THE RING</span></div><div class="fbGameProgress"><b id="fbProgress">0 / 8</b><button data-switch="PLAY">RUN</button><button data-switch="PUZZLE">PUZ</button><button data-switch="DUET">2D</button><button data-switch="GARDEN">ECO</button><button data-switch="ZEN">ZEN</button></div></div>';
  document.body.appendChild(root);root.querySelectorAll('[data-switch]').forEach(btn=>btn.addEventListener('click',()=>start(btn.dataset.switch)));
  duetPanel=document.createElement('div');duetPanel.id='fbDuetPanel';duetPanel.className='fbDuetPanel';
  duetPanel.innerHTML='<div class="fbDialBox">RING / DIAL A<b id="fbDialA">0</b></div><div class="fbRelation"><span id="fbRelationName">SAME</span><b id="fbRelationVerb">BLOOM</b><span id="fbDuetState">MAKE BOTH AGREE</span></div><div class="fbDialBox">PARTNER / DIAL B<b id="fbDialB">0</b><div class="fbDialCtl"><button id="fbDialMinus" aria-label="Partner dial left">−</button><button id="fbDialPlus" aria-label="Partner dial right">+</button></div></div><div class="fbLegend">SAME → BLOOM · NEAR → FOLD · FAR → RETURN · OPPOSITE → SPLIT</div>';
  document.body.appendChild(duetPanel);q('#fbDialMinus').onclick=()=>bumpPartner(-1);q('#fbDialPlus').onclick=()=>bumpPartner(1);
  gardenChoice=document.createElement('div');gardenChoice.id='fbGardenChoice';gardenChoice.className='fbGardenChoice';
  gardenChoice.innerHTML='<div class="fbGardenCard"><div class="ey" id="fbGardenEy">GENERATION RETURN</div><h2>WHAT SURVIVES?</h2><p id="fbGardenBody"></p><div class="fbKids"><button data-garden-trait="BODY"><b>BODY</b><span>CHAIN ×2+ · preserve density.</span></button><button data-garden-trait="PATH"><b>PATH</b><span>2 structural ops · preserve topology.</span></button><button data-garden-trait="VOICE"><b>VOICE</b><span>3/4 CALL hits · preserve response.</span></button></div></div>';
  document.body.appendChild(gardenChoice);gardenChoice.querySelectorAll('[data-garden-trait]').forEach(btn=>btn.addEventListener('click',()=>chooseGardenTrait(btn.dataset.gardenTrait)));
  result=document.createElement('div');result.id='fbResult';result.className='fbResult';
  result.innerHTML='<div class="fbResultCard"><div class="ey" id="fbResultEy">RUN RETURN</div><h2 id="fbResultBig">ROAD HELD</h2><p id="fbResultBody"></p><div class="row"><button class="primary" data-result="AGAIN">AGAIN</button><button data-result="PLAY">RUN</button><button data-result="PUZZLE">PUZZLE</button><button data-result="DUET">DUET</button><button data-result="GARDEN">GARDEN</button><button data-result="ZEN">ZEN</button><button data-result="DONOR" id="fbDonorBtn" hidden>OPEN DONOR</button><button data-result="EXPORT">EXPORT RUN</button></div></div>';
  document.body.appendChild(result);result.querySelectorAll('[data-result]').forEach(btn=>btn.addEventListener('click',()=>{const action=btn.dataset.result;if(action==='EXPORT'){exportPlayReturn();return;}if(action==='DONOR'){openDonor();return;}start(action==='AGAIN'?mode:action);}));
}
function bumpPartner(delta){duetB=wrap(duetB+delta,6);if(runtime)update(runtime.state());}
function resetModeState(){
  active=true;ended=false;releases=0;hits=0;flowGain=0;stars=0;turns=0;duetB=0;duetHits=0;
  gardenGeneration=1;gardenEvents=[];gardenTrait=null;gardenSurvived=0;gardenLineage=[];gardenLastResult=null;gardenChoice?.classList.remove('on');
}
function start(nextMode='PLAY'){
  mode=VALID.has(nextMode)?nextMode:'PLAY';runtime?.autopilot?.stop?.();q('#intro')?.classList.remove('on');result?.classList.remove('on');document.documentElement.dataset.fbPlayMode=mode;resetModeState();
  const state=runtime.state();lastRotation=state.rotation;lastEventId=state.history?.at(-1)?.id??null;par=parFor(state);root.classList.add('on');duetPanel.classList.toggle('on',mode==='DUET');update(state);
}
function finish(state){
  active=false;ended=true;root.classList.remove('on');duetPanel.classList.remove('on');gardenChoice.classList.remove('on');
  const best=Math.max(1,Number(state.bestChain)||1),donor=q('#fbDonorBtn');donor.hidden=!['DUET','GARDEN'].includes(mode);donor.textContent=mode==='DUET'?'FULL TWO DIAL':'FULL ECOLOGY';
  if(mode==='PLAY'){const out=runOutcome(hits,releases);q('#fbResultEy').textContent=(out.clear?'RUN CLEAR':'RUN RETURN')+' · WIN '+RUN_WIN_HITS+'/'+RUN_LENGTH;q('#fbResultBig').textContent=out.label;q('#fbResultBody').textContent=hits+' / '+RUN_LENGTH+' CALLs hit · FLOW +'+flowGain+' · best chain '+best+'×. Every miss still changed topology; the road is the receipt.';}
  else if(mode==='PUZZLE'){const out=puzzleOutcome(stars);q('#fbResultEy').textContent=(out.clear?'PUZZLE CLEAR':'PUZZLE RETURN')+' · CLEAR '+PUZZLE_WIN_STARS+'/15';q('#fbResultBig').textContent=out.label;q('#fbResultBody').textContent=stars+' / 15 stars · '+hits+' / '+PUZZLE_ROUNDS+' CALLs hit · FLOW +'+flowGain+'. Three stars means the shortest known turn path.';}
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
  releases+=1;if(event.callMet)hits+=1;flowGain+=Number(event.flowGain)||0;
  if(mode==='PUZZLE')stars+=puzzleStars(event.callMet,turns,par);
  if(mode==='DUET'&&event.callMet&&relationVerb(state.rotation,duetB,6)===event.verb)duetHits+=1;
  if(mode==='GARDEN')gardenEvents.push(event);
  turns=0;par=parFor(state);
  if(mode==='PLAY'&&releases>=RUN_LENGTH)finish(state);else if(mode==='PUZZLE'&&releases>=PUZZLE_ROUNDS)finish(state);else if(mode==='DUET'&&releases>=DUET_ROUNDS)finish(state);else if(mode==='GARDEN'&&gardenEvents.length>=GARDEN_MOVES)finishGardenGeneration(state);
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
function updateGarden(state,forecast,hitReady){
  if(gardenTrait){q('#fbObjective').textContent='GEN '+gardenGeneration+' · KEEP '+gardenTrait;q('#fbCoach').textContent=GARDEN_TRAITS[gardenTrait].short.toUpperCase()+' · '+normalCoach(state,forecast,hitReady);}else{q('#fbObjective').textContent='GEN 1 · OBSERVE THE PARENT';q('#fbCoach').textContent=normalCoach(state,forecast,hitReady);}
  q('#fbProgress').textContent='G'+gardenGeneration+'/3 · '+gardenEvents.length+'/4 · '+gardenSurvived+'/2';
}
function update(state){
  if(!active||!root)return;const forecast=runtime.forecast?.(),call=state.call,aligned=!!forecast,hitReady=aligned&&forecastMatchesCall(call,forecast);
  q('#fbMode').textContent=mode==='PLAY'?'RUN':mode;root.querySelectorAll('[data-switch]').forEach(btn=>btn.classList.toggle('on',btn.dataset.switch===mode));duetPanel.classList.toggle('on',mode==='DUET');
  if(mode==='ZEN'){q('#fbObjective').textContent='FREE RIDE';q('#fbCoach').textContent=aligned?'RELEASE '+forecast.verb+' · OR KEEP TURNING':'TURN · FEEL THE FIELD · RELEASE WHEN IT WAKES';q('#fbProgress').textContent='OPEN';return;}
  if(mode==='DUET'){updateDuet(state,forecast,hitReady);return;}if(mode==='GARDEN'){updateGarden(state,forecast,hitReady);return;}
  q('#fbObjective').textContent='GOAL '+callText(call);q('#fbCoach').textContent=normalCoach(state,forecast,hitReady);q('#fbProgress').textContent=mode==='PUZZLE'?(releases+1)+'/'+PUZZLE_ROUNDS+' · '+stars+'★/'+PUZZLE_WIN_STARS+' · PAR '+par+' · '+turns+'T':releases+'/'+RUN_LENGTH+' · '+hits+'/'+RUN_WIN_HITS+' HIT';
}
function poll(){
  if(!runtime)return;const state=runtime.state();if(active&&lastRotation!==null&&state.rotation!==lastRotation)turns+=circularDistance(lastRotation,state.rotation,N);lastRotation=state.rotation;
  const event=state.history?.at(-1);if(active&&event&&event.id!==lastEventId){lastEventId=event.id;onRelease(event,state);}else if(event)lastEventId=event.id;if(active)update(state);
}
function playState(){
  return {version:VERSION,mode,active,ended,releases,hits,flowGain,stars,turns,par,duet:{partner:duetB,hits:duetHits},garden:{generation:gardenGeneration,trait:gardenTrait,survived:gardenSurvived,lineage:[...gardenLineage],events:[...gardenEvents]},win:{run:mode==='PLAY'?runOutcome(hits,releases):null,puzzle:mode==='PUZZLE'?puzzleOutcome(stars):null,duet:mode==='DUET'?duetOutcome(duetHits,releases):null,garden:mode==='GARDEN'?gardenOutcome(gardenSurvived):null}};
}
function exportPlayReturn(){
  const packet={kind:'FOLD_BLOOM_PLAY_RETURN',version:VERSION,created:new Date().toISOString(),play:playState(),live:runtime?.state?.()||null,donors:{twoDial:'/fold-bloom/two-dial/',ecology:'/fold-bloom/ecology/',foldWeave:'/recovery/fold-bloom/fold-weave-0.1/'}};
  const blob=new Blob([JSON.stringify(packet,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='fold-bloom-play-'+mode.toLowerCase()+'-'+Date.now()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function openDonor(){if(mode==='DUET')window.open('../two-dial/','fold-bloom-two-dial');else if(mode==='GARDEN')window.open('../ecology/','fold-bloom-ecology');}
function boot(){
  runtime=window.FoldBloomLive;if(!runtime){setTimeout(boot,80);return;}injectStyle();injectEntry();injectHud();document.documentElement.dataset.foldBloomPlay=VERSION;if(VALID.has(requested))setTimeout(()=>start(requested),120);setInterval(poll,120);window.FoldBloomPlay={version:VERSION,start,state:playState,relation:(a,b)=>({name:relationName(a,b,6),verb:relationVerb(a,b,6)})};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
