import { availableForecasts, forecastMatchesCall, gateCellIndex, typePresentation, N } from './engine.js?v=0.13.1';
import {
  RUN_LENGTH,RUN_WIN_HITS,PUZZLE_ROUNDS,PUZZLE_WIN_STARS,DUET_ROUNDS,DUET_WIN_HITS,
  GARDEN_GENERATIONS,GARDEN_MOVES,GARDEN_SURVIVAL_TARGET,GARDEN_TRAITS,HEX_CHANGE_TARGET,HEX_CHANGE_LIMIT,
  circularDistance,relationVerb,relationName,hexChangeOutcome,
  runOutcome,puzzleStars,puzzleOutcome,duetOutcome,gardenGoalMet,gardenSummary,gardenProgress,gardenOutcome,wrap
} from './play-core.js?v=0.5';
import {
  FORM_PUZZLE_VERSION,FORM_SLOTS,FORM_CHANGE_TARGET,FORM_CHANGE_LIMIT,FORM_GLYPHS,
  formAddress,appendFormVerb,writeFormVerb,changedFormSlots,formComplete,formToken,formDelta,formChangeOutcome
} from './form-puzzle.js?v=0.1';
import {
  HEX_PROJECTION_VERSION,EXACT_FORMS_PER_HEXAGRAM,hexProjection,hexChangeProjection,relationPolarity
} from './hex-projection.js?v=0.1';
import {PLAY_LOOP_CONTRACT_VERSION,loopContract,loopContracts,loopWitness,partitionTurnDelta} from './play-loop.js?v=0.2';

const VERSION='FOLD_BLOOM_PLAY_0.6.1';
const VALID=new Set(['PLAY','PUZZLE','PATH','DUET','GARDEN','ZEN']);
const ALIASES=new Map([['CONCERT','PLAY'],['RUN','PLAY'],['FORM','PUZZLE'],['MORPH','PUZZLE'],['HEX','PUZZLE'],['YIJING','PUZZLE'],['ICHING','PUZZLE'],['PAR','PATH'],['TWO-DIAL','DUET'],['TWO_DIAL','DUET'],['ECOLOGY','GARDEN']]);
const params=new URLSearchParams(location.search);
const rawRequested=String(params.get('play')||'').toUpperCase();
const requested=ALIASES.get(rawRequested)||rawRequested;
let mode=VALID.has(requested)?requested:'PLAY';
let viewTouched=params.has('view')||params.has('still');
let stillView=params.get('view')==='still'||params.get('still')==='1';
let active=false,ended=false,releases=0,hits=0,flowGain=0,stars=0,turns=0,par=0;
let lastRotation=null,lastEventId=null,lastSeq=null,runtime=null,fieldEnter=null,root=null,result=null;
let duetPanel=null,duetB=0,duetHits=0;
let formPanel=null,formCurrent=[],formPhase='FORM',formFrom=null,formChangeMoves=0;
let gardenChoice=null,gardenGeneration=1,gardenEvents=[],gardenTrait=null,gardenSurvived=0,gardenLineage=[],gardenLastResult=null;
let feedbackTimer=null,loopEventSeq=0;
const loopListeners=new Set();
const q=s=>document.querySelector(s);
const callText=call=>!call?'OPEN':call.verb+(call.chain>1?' ×'+call.chain+'+':'');

function emitLoopEvent(type,detail={}){
  const packet={
    kind:'FOLD_BLOOM_PLAY_LOOP_EVENT',
    version:PLAY_LOOP_CONTRACT_VERSION,
    seq:++loopEventSeq,
    created:new Date().toISOString(),
    type:String(type||'WITNESS').toUpperCase(),
    loop:playState().loop,
    detail:{...detail}
  };
  for(const listener of [...loopListeners]){try{listener(packet)}catch(error){console.warn('PLAY loop listener failed',error)}}
  try{window.dispatchEvent(new CustomEvent('fold-bloom-play-loop',{detail:packet}))}catch(_){}
  return packet;
}
function subscribeLoop(listener){
  if(typeof listener!=='function')return ()=>{};
  loopListeners.add(listener);
  return ()=>loopListeners.delete(listener);
}
function markPrimaryControls(){
  const ids=['modeBtn','releaseBtn','sceneBtn'];
  const clear=ids.every(id=>{
    const el=document.getElementById(id);if(!el)return false;
    const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,top=document.elementFromPoint(x,y);
    return top===el||el.contains(top);
  });
  document.documentElement.dataset.fbPrimaryControls=clear?'clear':'occluded';
  return clear;
}
function schedulePrimaryControlCheck(){requestAnimationFrame(()=>requestAnimationFrame(markPrimaryControls))}

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
  .fbPlayEntry{margin:10px 0 0;border-top:1px solid rgba(255,255,255,.10);padding-top:8px}
  .fbModeMore summary{cursor:pointer;list-style:none;font-size:8px;letter-spacing:.12em;color:rgba(255,255,255,.52);padding:8px 0}.fbModeMore summary::-webkit-details-marker{display:none}.fbModeMore[open] summary{color:#fff}
  .fbPlayEntry .law{font-size:8px;line-height:1.45;letter-spacing:.05em;color:rgba(255,255,255,.48);margin-top:8px}
  .fbPlayEntry .modes{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}.fbPlayEntry button{min-height:44px;padding:8px 9px;font-size:7.5px;font-weight:900;letter-spacing:.06em}
  .fbPlayEntry button[data-play-mode="PLAY"]{background:rgba(255,255,255,.92);color:#05070b;border-color:#fff}
  .fbGame{position:absolute;left:50%;top:max(58px,calc(env(safe-area-inset-top) + 54px));transform:translateX(-50%);z-index:6;width:min(680px,calc(100vw - 20px));pointer-events:none;display:none}.fbGame.on{display:block}
  .fbGameBar{border:1px solid rgba(255,255,255,.16);background:rgba(5,8,12,.9);backdrop-filter:blur(10px);display:grid;grid-template-columns:auto 1fr auto;align-items:stretch;min-height:50px}
  .fbGameMode{display:flex;align-items:center;padding:0 10px;border-right:1px solid rgba(255,255,255,.12);font-size:7px;font-weight:1000;letter-spacing:.13em;color:#fff}
  .fbGameMission{min-width:0;padding:7px 10px}.fbGameMission b{display:block;font-size:10px;letter-spacing:.06em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fbGameMission span{display:block;margin-top:3px;font-size:7px;letter-spacing:.08em;color:rgba(255,255,255,.58);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .fbGameProgress{display:flex;align-items:center;gap:4px;padding:5px;border-left:1px solid rgba(255,255,255,.12);overflow-x:auto}.fbGameProgress b{font-size:8px;min-width:60px;text-align:center}.fbGameProgress button{min-width:36px;height:34px;padding:0 5px;font-size:6.5px;font-weight:1000;pointer-events:auto}.fbGameProgress button.on{background:#fff;color:#05070b;border-color:#fff}.fbGameProgress #fbStillView{min-width:46px;border-color:rgba(255,255,255,.22)}.fbGameProgress #fbStillView[aria-pressed="true"]{background:rgba(255,255,255,.88);color:#05070b;border-color:#fff}
  .fbGameFeedback{margin-top:5px;border:1px solid transparent;background:rgba(5,8,12,.88);font:800 8px/1.35 ui-monospace,monospace;letter-spacing:.08em;text-align:center;padding:0 8px;max-height:0;opacity:0;overflow:hidden;transition:max-height .12s ease,opacity .12s ease,padding .12s ease}.fbGameFeedback.on{max-height:34px;opacity:1;padding:7px 8px;border-color:rgba(255,255,255,.13)}.fbGameFeedback[data-kind="hit"]{background:rgba(255,255,255,.94);color:#05070b}.fbGameFeedback[data-kind="miss"]{color:rgba(255,255,255,.72)}
  html[data-fb-play-mode="PLAY"] .fbGameBar{border-color:rgba(114,228,182,.34)}
  html[data-fb-play-mode="PUZZLE"] .fbGameBar{border-color:rgba(255,215,109,.62);box-shadow:inset 3px 0 0 rgba(255,215,109,.82)}
  html[data-fb-play-mode="PATH"] .fbGameBar{border-color:rgba(215,180,109,.46);box-shadow:inset 3px 0 0 rgba(215,180,109,.68)}
  html[data-fb-play-mode="DUET"] .fbGameBar{border-color:rgba(123,213,255,.60);box-shadow:inset 3px 0 0 rgba(123,213,255,.85)}
  html[data-fb-play-mode="GARDEN"] .fbGameBar{border-color:rgba(114,228,182,.58);box-shadow:inset 3px 0 0 rgba(114,228,182,.78)}
  html[data-fb-play-mode="ZEN"] .fbGameBar{border-color:rgba(255,255,255,.08);background:rgba(5,8,12,.60)}

  .fbDuetPanel,.fbFormPanel{position:absolute;left:50%;bottom:calc(max(10px,env(safe-area-inset-bottom)) + 72px);transform:translateX(-50%);z-index:7;width:min(620px,calc(100vw - 20px));border:1px solid rgba(255,255,255,.16);background:rgba(5,8,12,.93);padding:9px;display:none;gap:8px;align-items:center;text-align:center;pointer-events:none}.fbDuetPanel{grid-template-columns:1fr auto 1fr}.fbDuetPanel.on{display:grid}.fbFormPanel.on{display:block}
  .fbFormTitle{font:800 8px/1.4 ui-monospace,monospace;letter-spacing:.09em}.fbFormTitle b{font-size:12px}.fbFormLines{display:grid;grid-template-columns:repeat(6,1fr);gap:4px;margin:8px 0}.fbFormLine{border:1px solid rgba(255,255,255,.11);padding:6px 2px;font:900 11px/1 ui-monospace,monospace}.fbFormLine small{display:block;margin-top:4px;font-size:6px;color:rgba(255,255,255,.45)}.fbFormLine[data-verb="BLOOM"]{border-color:rgba(114,228,182,.50)}.fbFormLine[data-verb="FOLD"]{border-color:rgba(255,179,109,.52)}.fbFormLine[data-verb="SPLIT"]{border-color:rgba(200,179,255,.50)}.fbFormLine[data-verb="RETURN"]{border-color:rgba(244,247,245,.58)}.fbFormLine.address{box-shadow:inset 0 -3px rgba(215,180,109,.92)}.fbFormNow .fbFormLine.hit{background:#fff;color:#05070b}.fbHexTeach{font:800 7px/1.45 ui-monospace,monospace;letter-spacing:.08em;color:rgba(255,215,109,.82);margin-top:5px}.fbFormLegend{font:7px/1.45 ui-monospace,monospace;letter-spacing:.06em;color:rgba(255,255,255,.48);margin-top:3px}
  .fbDialBox{border:1px solid rgba(255,255,255,.22);padding:8px;font:800 8px/1.3 ui-monospace,monospace;letter-spacing:.09em}.fbDialBox:first-child{border-color:rgba(123,213,255,.55)}.fbDialBox:nth-child(3){border-color:rgba(239,120,73,.55)}.fbDialBox b{display:block;font-size:22px;margin-top:3px}.fbDialCtl{display:flex;gap:4px;justify-content:center;margin-top:5px}.fbDialCtl button{width:44px;height:34px;font-size:16px;font-weight:900;pointer-events:auto}.fbDuetActions{grid-column:1/-1;display:flex;gap:5px;justify-content:center}.fbDuetActions button{pointer-events:auto;min-height:34px;padding:6px 9px;font:900 7px ui-monospace,monospace;letter-spacing:.08em}
  .fbRelation{min-width:150px;font:800 8px/1.35 ui-monospace,monospace;letter-spacing:.08em}.fbRelation b{display:block;font-size:14px;margin:3px 0}.fbLegend{grid-column:1/-1;font:7px/1.4 ui-monospace,monospace;letter-spacing:.07em;color:rgba(255,255,255,.5)}
  .fbResult,.fbGardenChoice{position:absolute;inset:0;z-index:12;background:rgba(3,5,8,.76);backdrop-filter:blur(5px);display:none;align-items:center;justify-content:center;padding:18px;pointer-events:none}.fbResult.on,.fbGardenChoice.on{display:flex}
  .fbResultCard,.fbGardenCard{width:min(560px,100%);border:1px solid rgba(255,255,255,.18);background:#080c12;padding:18px;pointer-events:auto}.fbResultCard .ey,.fbGardenCard .ey{font-size:8px;color:#74808d;letter-spacing:.16em}.fbResultCard h2,.fbGardenCard h2{font-size:clamp(34px,10vw,68px);line-height:.9;letter-spacing:-.055em;margin:8px 0 12px}.fbResultCard p,.fbGardenCard p{font:10px/1.55 system-ui,-apple-system,sans-serif;color:#aab5c1;margin:0 0 14px}
  .fbResultCard .row{display:flex;gap:6px;flex-wrap:wrap}.fbResultCard button,.fbGardenCard button{min-height:46px;font-size:8px;font-weight:1000;letter-spacing:.08em}.fbResultCard button.primary{background:#fff;color:#05070b;border-color:#fff}
  .fbKids{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.fbKids button{padding:10px 8px;text-align:left}.fbKids button b{display:block;font-size:10px;margin-bottom:5px}.fbKids button span{display:block;font:7px/1.45 system-ui,sans-serif;color:rgba(255,255,255,.58)}
  html[data-fb-play-mode="ZEN"] .callpill,html[data-fb-play-mode="ZEN"] .diag{display:none!important}
  @media(max-width:720px){.fbPlayEntry .modes{grid-template-columns:1fr 1fr}.fbPlayEntry button[data-play-mode="PLAY"]{grid-column:1/-1}}
  @media(max-width:620px){
    .fbGame{top:max(54px,calc(env(safe-area-inset-top) + 50px));width:calc(100vw - 16px)}
    .fbGameBar{grid-template-columns:54px 1fr auto;min-height:50px}
    .fbGameMode{padding:0 6px;font-size:6px}.fbGameMission{padding:7px}.fbGameMission b{font-size:8px}.fbGameMission span{font-size:6px}
    .fbGameProgress{gap:2px;padding:3px}.fbGameProgress b{display:none}.fbGameProgress button{min-width:32px;height:32px;padding:0 3px;font-size:6px}
    .fbFormPanel{top:max(112px,calc(env(safe-area-inset-top) + 108px));bottom:auto;width:calc(100vw - 16px);padding:6px;background:rgba(5,8,12,.78);backdrop-filter:blur(6px)}
    .fbFormPanel.on{display:block}
    .fbFormTitle{display:flex;justify-content:space-between;align-items:center;font-size:6px;line-height:1.2}.fbFormTitle b{font-size:8px}
    .fbFormLines{gap:2px;margin:3px 0}.fbFormLine{padding:3px 1px;font-size:8px}.fbFormLine small{margin-top:2px;font-size:5px}.fbFormLegend{display:none}
    .fbDuetPanel{top:max(112px,calc(env(safe-area-inset-top) + 108px));bottom:auto;width:calc(100vw - 16px);grid-template-columns:1fr 1fr;padding:6px;background:rgba(5,8,12,.78);backdrop-filter:blur(6px)}
    .fbRelation{grid-column:1/-1;grid-row:1}.fbLegend{display:none}
    .fbKids{grid-template-columns:1fr}
    .fbResult,.fbGardenChoice{inset:auto 8px calc(max(8px,env(safe-area-inset-bottom)) + 64px) 8px;background:transparent;backdrop-filter:none;padding:0;align-items:flex-end}
    .fbResultCard,.fbGardenCard{max-height:min(46dvh,390px);overflow:auto;padding:12px;background:rgba(8,12,18,.96)}
    .fbResultCard h2,.fbGardenCard h2{font-size:clamp(28px,9vw,46px)}
    #intro .keys{display:none}
    #intro .introMore{margin-top:4px}
    #intro .card{width:calc(100vw - 16px);max-height:calc(100dvh - 24px);overflow:auto;padding:14px;background:rgba(8,12,18,.92)}
    #intro h1{font-size:clamp(44px,15vw,68px);margin:6px 0 10px}
    #intro .lede{font-size:10px;line-height:1.5}
    #intro .startRow{display:grid;grid-template-columns:1fr;gap:6px;margin-top:12px}
    #intro .startRow button{min-height:50px}
    .fbPlayEntry{margin-top:8px;padding-top:6px}
    .fbPlayEntry .modes{grid-template-columns:1fr 1fr;gap:5px}
    .fbPlayEntry .modes button{min-height:46px}
    .fbPlayEntry .law{margin:7px 1px 0;font-size:7px;line-height:1.4}
    .fbFanLink{display:none}
  }
  `;document.head.appendChild(style);
}

async function enterFromIntro(nextMode){
  const fieldBtn=q('#playBtn');
  if(fieldEnter&&fieldBtn){await fieldEnter.call(fieldBtn);start(nextMode);return;}
  start(nextMode);
}
function enterRide(){
  active=false;ended=false;root?.classList.remove('on');duetPanel?.classList.remove('on');formPanel?.classList.remove('on');gardenChoice?.classList.remove('on');result?.classList.remove('on');
  runtime?.gameProjection?.set?.(null);
  delete document.documentElement.dataset.fbPlayMode;delete document.documentElement.dataset.fbInstrument;delete document.documentElement.dataset.fbLoopArchetype;delete document.documentElement.dataset.fbFormVisual;document.documentElement.dataset.fbSurface='ride';
  schedulePrimaryControlCheck();emitLoopEvent('EXIT',{to:'RIDE'});
}
function injectEntry(){
  const card=q('#intro .card');if(!card||q('#fbPlayEntry'))return;
  const box=document.createElement('div');box.id='fbPlayEntry';box.className='fbPlayEntry';
  box.innerHTML='<details class="fbModeMore"><summary>SHORT CHALLENGES · OPTIONAL</summary><div class="modes"><button data-play-mode="PLAY">RUN · 6 HITS / 8 RELEASES</button><button data-play-mode="PUZZLE">HEX · CAST → CHANGE</button><button data-play-mode="PATH">PATH · FIND A ROUTE</button><button data-play-mode="DUET">TWO DIAL · PLAY TOGETHER</button><button data-play-mode="GARDEN">ECOLOGY · GROW / INHERIT</button><button data-play-mode="ZEN">ZEN · OPEN ENDED</button></div><div class="law">Challenge goals are fixed counts, not timed sessions; a goal can end quickly. Choose ZEN or RIDE for open play. RIDE remains the default. <a class="fbFanLink" href="../../foundry/axial/fan8-print.svg" target="_blank" rel="noopener" style="color:#dce3ea;text-decoration:none;border-bottom:1px solid rgba(255,255,255,.28)">FAN/8 ↗</a></div></details>';
  const startRow=card.querySelector('.startRow');if(startRow)startRow.insertAdjacentElement('afterend',box);else card.appendChild(box);
  box.querySelectorAll('[data-play-mode]').forEach(btn=>btn.addEventListener('click',()=>enterFromIntro(btn.dataset.playMode)));
  const fieldBtn=q('#playBtn');
  if(fieldBtn&&!fieldBtn.dataset.fbPlayWrapped){fieldEnter=fieldBtn.onclick;fieldBtn.dataset.fbPlayWrapped='1';fieldBtn.textContent='RIDE FIELD COURSE →';fieldBtn.onclick=async event=>{if(fieldEnter)await fieldEnter.call(fieldBtn,event);enterRide();};}
}
function injectHud(){
  if(q('#fbGame'))return;
  root=document.createElement('div');root.id='fbGame';root.className='fbGame';
  root.innerHTML='<div class="fbGameBar"><div class="fbGameMode" id="fbMode">RUN</div><div class="fbGameMission"><b id="fbObjective">GOAL —</b><span id="fbCoach">TURN THE RING</span></div><div class="fbGameProgress"><b id="fbProgress">0 / 8</b><button data-switch="PLAY">RUN</button><button data-switch="PUZZLE">HEX</button><button data-switch="PATH">PAR</button><button data-switch="DUET">2D</button><button data-switch="GARDEN">ECO</button><button data-switch="ZEN">ZEN</button><button id="fbStillView" aria-pressed="false" title="Stop/start ride motion without changing source or game state">STILL</button></div></div><div class="fbGameFeedback" id="fbGameFeedback" aria-live="polite"></div>';
  document.body.appendChild(root);root.querySelectorAll('[data-switch]').forEach(btn=>btn.addEventListener('click',()=>start(btn.dataset.switch)));q('#fbStillView').onclick=()=>toggleStillView();
  duetPanel=document.createElement('div');duetPanel.id='fbDuetPanel';duetPanel.className='fbDuetPanel';
  duetPanel.innerHTML='<div class="fbDialBox">OUTER / DIAL A · ROAD<b id="fbDialA">0</b></div><div class="fbRelation"><span id="fbRelationName">SAME</span><b id="fbRelationVerb">BLOOM</b><span id="fbDuetState">MAKE BOTH AGREE</span></div><div class="fbDialBox">INNER / DIAL B · RELATION<b id="fbDialB">0</b><div class="fbDialCtl"><button id="fbDialMinus" aria-label="Partner dial left">−</button><button id="fbDialPlus" aria-label="Partner dial right">+</button></div></div><div class="fbDuetActions"><button id="fbLandscape">LANDSCAPE ↔</button><button id="fbFullTwoDial">FULL TWO DIAL ↗</button></div><div class="fbLegend">OUTER A = LIVE ROAD · INNER B = SECOND DIAL · SAME → BLOOM · NEAR → FOLD · FAR → RETURN · OPPOSITE → SPLIT</div>';
  document.body.appendChild(duetPanel);q('#fbDialMinus').onclick=()=>bumpPartner(-1);q('#fbDialPlus').onclick=()=>bumpPartner(1);q('#fbLandscape').onclick=()=>requestLandscape();q('#fbFullTwoDial').onclick=()=>window.open('../two-dial/?mode=DUET','fold-bloom-two-dial');
  formPanel=document.createElement('div');formPanel.id='fbFormPanel';formPanel.className='fbFormPanel';
  formPanel.innerHTML='<div class="fbFormTitle">FROM HEXAGRAM <b id="fbFormFromName">—</b></div><div class="fbFormLines fbFormFrom" id="fbFormFrom"></div><div class="fbFormTitle">NOW / CHANGE <b id="fbFormNowName">—</b></div><div class="fbFormLines fbFormNow" id="fbFormNow"></div><div class="fbHexTeach" id="fbHexTeach">64 HEXAGRAMS · 8 LOWER × 8 UPPER TRIGRAMS · 64 EXACT VERB-FORMS PER HEXAGRAM</div><div class="fbFormLegend">FOLD//BLOOM projection: SAME / NEAR → YANG · SOLID; FAR / OPPOSITE → YIN · BROKEN. The exact BLOOM / FOLD / RETURN / SPLIT verb remains under every line. This quotient is game-specific; it does not claim proximity/farness are traditional Yijing meanings.</div>';
  document.body.appendChild(formPanel);
  gardenChoice=document.createElement('div');gardenChoice.id='fbGardenChoice';gardenChoice.className='fbGardenChoice';
  gardenChoice.innerHTML='<div class="fbGardenCard"><div class="ey" id="fbGardenEy">GENERATION RETURN</div><h2>WHAT SURVIVES?</h2><p id="fbGardenBody"></p><div class="fbKids"><button data-garden-trait="BODY"><b>BODY</b><span>CHAIN ×2+ · preserve density.</span></button><button data-garden-trait="PATH"><b>PATH</b><span>2 structural ops · preserve topology.</span></button><button data-garden-trait="VOICE"><b>VOICE</b><span>3/4 CALL hits · preserve response.</span></button></div></div>';
  document.body.appendChild(gardenChoice);gardenChoice.querySelectorAll('[data-garden-trait]').forEach(btn=>btn.addEventListener('click',()=>chooseGardenTrait(btn.dataset.gardenTrait)));
  result=document.createElement('div');result.id='fbResult';result.className='fbResult';
  result.innerHTML='<div class="fbResultCard"><div class="ey" id="fbResultEy">RUN RETURN</div><h2 id="fbResultBig">ROAD HELD</h2><p id="fbResultBody"></p><div class="row"><button class="primary" data-result="AGAIN">AGAIN</button><button data-result="PLAY">RUN</button><button data-result="PUZZLE">HEX</button><button data-result="PATH">PATH</button><button data-result="DUET">DUET</button><button data-result="GARDEN">GARDEN</button><button data-result="ZEN">ZEN</button><button data-result="DONOR" id="fbDonorBtn" hidden>OPEN DONOR</button><button data-result="EXPORT">EXPORT RUN</button></div></div>';
  document.body.appendChild(result);result.querySelectorAll('[data-result]').forEach(btn=>btn.addEventListener('click',()=>{const action=btn.dataset.result;if(action==='EXPORT'){exportPlayReturn();return;}if(action==='DONOR'){openDonor();return;}start(action==='AGAIN'?mode:action);}));
}
function flash(text,kind=''){
  const el=q('#fbGameFeedback');if(!el)return;clearTimeout(feedbackTimer);el.textContent=text;el.dataset.kind=kind;el.classList.remove('on');void el.offsetWidth;el.classList.add('on');feedbackTimer=setTimeout(()=>el.classList.remove('on'),1050);
}
async function requestLandscape(){
  if(innerWidth>innerHeight){flash('LANDSCAPE · BOTH DIALS VISIBLE','hit');return true;}
  let entered=false;
  try{
    if(screen.orientation?.lock){
      if(!document.fullscreenElement&&document.documentElement.requestFullscreen){await document.documentElement.requestFullscreen({navigationUI:'hide'});entered=true;}
      await screen.orientation.lock('landscape');flash('LANDSCAPE LOCKED · TWO DIAL','hit');return true;
    }
  }catch(_){if(entered&&document.fullscreenElement)try{await document.exitFullscreen()}catch(_){}}
  flash('ROTATE PHONE ↔ · TWO DIAL WANTS WIDTH','');
  return false;
}
function updateStillControl(){
  const btn=q('#fbStillView');document.documentElement.dataset.fbView=stillView?'still':'ride';
  if(btn){btn.textContent=stillView?'RIDE':'STILL';btn.setAttribute('aria-pressed',stillView?'true':'false');btn.title=stillView?'Restore source ride motion':'Hold the field still; source clock and gameplay continue';}
}
function toggleStillView(){
  viewTouched=true;stillView=!stillView;updateStillControl();
  if(runtime)update(runtime.state());
  flash(stillView?'STILL VIEW · SOURCE CLOCK CONTINUES':'RIDE VIEW · SOURCE MOTION RESTORED',stillView?'hit':'');
  emitLoopEvent('VIEW',{still:stillView});
}
function bumpPartner(delta){duetB=wrap(duetB+delta,6);if(runtime)update(runtime.state());}
function hexName(projection){
  if(!projection?.complete)return 'H[---|---]';
  const lo=projection.lower,hi=projection.upper;
  return projection.token+' · '+(lo?lo.glyph+' '+lo.han+' '+lo.image:'—')+' / '+(hi?hi.glyph+' '+hi.han+' '+hi.image:'—');
}
function formCell(verb,i,{changed=false,address=false}={}){
  const v=String(verb||''),p=relationPolarity(v),glyph=p?.line||'·';
  return '<div class="fbFormLine '+(changed?'hit ':'')+(address?'address ':'')+'" data-verb="'+v+'" data-polarity="'+(p?.polarity||'OPEN')+'"><b>'+glyph+'</b><small>'+(i+1)+' · '+(p?p.polarity+' · '+v:'OPEN')+'</small></div>';
}
function renderFormPanel(){
  if(!formPanel)return;
  const from=formFrom||[],now=formCurrent||[],delta=new Set(formFrom?changedFormSlots(formFrom,formCurrent):[]),address=formPhase==='MORPH'?formAddress(runtime?.state?.()?.rotation):null;
  const fromHex=hexProjection(from),nowHex=hexProjection(now),hexChange=formFrom?hexChangeProjection(formFrom,formCurrent):null;
  q('#fbFormFromName').textContent=formPhase==='FORM'?'CASTING · '+now.length+'/'+FORM_SLOTS:hexName(fromHex);
  q('#fbFormNowName').textContent=nowHex.complete?hexName(nowHex):'H[---|---] · '+now.length+'/'+FORM_SLOTS;
  q('#fbFormFrom').innerHTML=Array.from({length:FORM_SLOTS},(_,i)=>formCell(from[i],i,{changed:false,address:false})).join('');
  q('#fbFormNow').innerHTML=Array.from({length:FORM_SLOTS},(_,i)=>formCell(now[i],i,{changed:!!hexChange?.moving?.includes(i+1)||delta.has(i+1),address:i===address})).join('');
}
function resetModeState(){
  active=true;ended=false;releases=0;hits=0;flowGain=0;stars=0;turns=0;duetB=0;duetHits=0;formCurrent=[];formPhase='FORM';formFrom=null;formChangeMoves=0;
  gardenGeneration=1;gardenEvents=[];gardenTrait=null;gardenSurvived=0;gardenLineage=[];gardenLastResult=null;gardenChoice?.classList.remove('on');
}
function start(nextMode='PLAY'){
  mode=VALID.has(nextMode)?nextMode:'PLAY';runtime?.autopilot?.stop?.();const intro=q('#intro');if(intro){intro.classList.remove('on');intro.hidden=true;}result?.classList.remove('on');
  document.documentElement.dataset.fbPlayMode=mode;document.documentElement.dataset.fbSurface='active';document.documentElement.dataset.fbInstrument=mode==='PUZZLE'?'HEX':mode==='DUET'?'TWO_DIAL':mode==='GARDEN'?'ECOLOGY':mode==='PATH'?'PATH':mode==='ZEN'?'ZEN':'RUN';
  document.documentElement.dataset.fbFormVisual=mode==='PUZZLE'?'exact-verbs-underlay':'off';document.documentElement.dataset.fbHexVisual=mode==='PUZZLE'?'six-lines':'off';document.documentElement.dataset.fbLoopArchetype=loopContract(mode).archetype;updateStillControl();resetModeState();
  const state=runtime.state();lastRotation=state.rotation;lastEventId=state.history?.at(-1)?.id??null;lastSeq=Number(state.seq)||0;par=parFor(state);root.classList.add('on');duetPanel.classList.toggle('on',mode==='DUET');formPanel.classList.toggle('on',mode==='PUZZLE');renderFormPanel();update(state);emitLoopEvent('START',{mode});
}
function finish(state){
  active=false;ended=true;root.classList.remove('on');duetPanel.classList.remove('on');formPanel.classList.remove('on');gardenChoice.classList.remove('on');runtime?.gameProjection?.set?.(null);
  const best=Math.max(1,Number(state.bestChain)||1),donor=q('#fbDonorBtn');donor.hidden=!['DUET','GARDEN'].includes(mode);donor.textContent=mode==='DUET'?'FULL TWO DIAL':'FULL ECOLOGY';
  if(mode==='PLAY'){const out=runOutcome(hits,releases);q('#fbResultEy').textContent=(out.clear?'RUN CLEAR':'RUN RETURN')+' · WIN '+RUN_WIN_HITS+'/'+RUN_LENGTH;q('#fbResultBig').textContent=out.label;q('#fbResultBody').textContent=hits+' / '+RUN_LENGTH+' CALLs hit · FLOW +'+flowGain+' · best chain '+best+'×. Every miss still changed topology; the road is the receipt.';}
  else if(mode==='PUZZLE'){
    const fromHex=formFrom?hexProjection(formFrom):null,nowHex=hexProjection(formCurrent),hexDelta=formFrom?hexChangeProjection(formFrom,formCurrent):null;
    const change=fromHex?.bits&&nowHex?.bits?hexChangeOutcome(fromHex.bits,nowHex.bits,formChangeMoves):null,delta=formFrom?formDelta(formFrom,formCurrent):null,clear=!!change?.clear;
    q('#fbResultEy').textContent=clear?'HEXAGRAM CHANGE CLEAR':'HEXAGRAM RETURN';
    q('#fbResultBig').textContent=clear?'HEXAGRAM CHANGED':change?.label||'HEXAGRAM CAST';
    q('#fbResultBody').textContent=hexDelta?(hexDelta.token+' · '+formChangeMoves+' CHANGE releases · exact receipt '+delta.token+'. Six-line projection is reversible to the exact verbs only because both layers are retained.'):(hexName(nowHex)+' · exact '+formToken(formCurrent)+' · six LIVE consequences cast the hexagram.');
  }
  else if(mode==='PATH'){const out=puzzleOutcome(stars);q('#fbResultEy').textContent=(out.clear?'PATH CLEAR':'PATH RETURN')+' · CLEAR '+PUZZLE_WIN_STARS+'/15';q('#fbResultBig').textContent=out.label;q('#fbResultBody').textContent=stars+' / 15 stars · '+hits+' / '+PUZZLE_ROUNDS+' CALLs hit · FLOW +'+flowGain+'. Three stars means the shortest known turn path.';}
  else if(mode==='DUET'){const out=duetOutcome(duetHits,releases);q('#fbResultEy').textContent=(out.clear?'DUET CLEAR':'DUET RETURN')+' · WIN '+DUET_WIN_HITS+'/'+DUET_ROUNDS;q('#fbResultBig').textContent=out.label;q('#fbResultBody').textContent=duetHits+' / '+DUET_ROUNDS+' synchronized CALLs. The road chose a consequence; the second dial had to name the same relation before release.';}
  else if(mode==='GARDEN'){const out=gardenOutcome(gardenSurvived,GARDEN_SURVIVAL_TARGET);q('#fbResultEy').textContent=(out.clear?'GARDEN CLEAR':'GARDEN RETURN')+' · WIN '+GARDEN_SURVIVAL_TARGET+'/'+GARDEN_SURVIVAL_TARGET+' TRAITS';q('#fbResultBig').textContent=out.label;q('#fbResultBody').textContent=gardenSurvived+' / '+GARDEN_SURVIVAL_TARGET+' inherited pressures survived · lineage '+(gardenLineage.join(' → ')||'ROOT')+'. Each four-move generation changed what the next one had to preserve.';}
  else{q('#fbResultEy').textContent='RETURN';q('#fbResultBig').textContent='OPEN';q('#fbResultBody').textContent='The field remains live.';}
  result.classList.add('on');schedulePrimaryControlCheck();emitLoopEvent('FINISH',{mode});
}
function showGardenChoice(){
  const s=gardenSummary(gardenEvents),inherited=gardenTrait?(gardenLastResult?'SURVIVED':'DID NOT SURVIVE'):'ROOT OBSERVED';
  q('#fbGardenEy').textContent='GEN '+gardenGeneration+' RETURN · '+inherited;
  q('#fbGardenBody').textContent='Parent: '+s.hits+'/4 CALLs · best chain '+s.best+'× · '+s.structural+' structural ops. Choose one trait-family to become the next generation’s pressure. This is Ecology: selection changes what must persist.';
  active=false;gardenChoice.classList.add('on');schedulePrimaryControlCheck();emitLoopEvent('CHOICE_REQUIRED',{kind:'GARDEN_TRAIT',generation:gardenGeneration});
}
function chooseGardenTrait(trait){
  if(!GARDEN_TRAITS[trait])return;gardenLineage.push(trait);gardenTrait=trait;gardenGeneration+=1;gardenEvents=[];gardenLastResult=null;gardenChoice.classList.remove('on');active=true;update(runtime.state());emitLoopEvent('CHOICE',{kind:'GARDEN_TRAIT',trait,generation:gardenGeneration});
}
function finishGardenGeneration(state){
  if(gardenTrait){gardenLastResult=gardenGoalMet(gardenTrait,gardenEvents);if(gardenLastResult)gardenSurvived+=1;}else gardenLastResult=null;
  if(gardenGeneration>=GARDEN_GENERATIONS){finish(state);return;}showGardenChoice();
}
function onRelease(event,state){
  const usedTurns=turns,targetPar=par,gain=Number(event.flowGain)||0;let shouldFinishPuzzle=false;
  releases+=1;if(event.callMet)hits+=1;flowGain+=gain;
  if(mode==='PUZZLE'){
    if(formPhase==='FORM'){
      formCurrent=appendFormVerb(formCurrent,event.verb);
      const p=relationPolarity(event.verb);
      flash('LINE '+formCurrent.length+' · '+(p?.polarity||'OPEN')+' '+(p?.line||'·')+' · exact '+event.verb+' · '+formCurrent.length+'/'+FORM_SLOTS,'hit');
      if(formComplete(formCurrent)){
        formFrom=[...formCurrent];formPhase='MORPH';formChangeMoves=0;
        flash('HEXAGRAM CAST · '+hexName(hexProjection(formCurrent))+' · TURN TO ADDRESS A CHANGING LINE','hit');
      }
    }else{
      formChangeMoves+=1;
      const address=formAddress(state.rotation),before=formCurrent[address],beforePolarity=relationPolarity(before);
      formCurrent=writeFormVerb(formCurrent,address,event.verb);
      const after=formCurrent[address],afterPolarity=relationPolarity(after),fromHex=hexProjection(formFrom||[]),nowHex=hexProjection(formCurrent);
      const exactChanged=before!==after,lineChanged=beforePolarity?.bit!==afterPolarity?.bit,out=fromHex.bits&&nowHex.bits?hexChangeOutcome(fromHex.bits,nowHex.bits,formChangeMoves):{complete:false,changed:[]};
      flash('LINE '+(address+1)+' · '+before+' → '+after+' · '+(lineChanged?'MOVING '+(beforePolarity?.polarity||'—')+'→'+(afterPolarity?.polarity||'—'):exactChanged?'EXACT VERB CHANGED · HEX LINE HELD':'HELD')+' · '+out.changed.length+'/'+HEX_CHANGE_TARGET,lineChanged?'hit':exactChanged?'':'miss');
      shouldFinishPuzzle=out.complete;
    }
    renderFormPanel();
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
  turns=0;par=parFor(state);emitLoopEvent('RELEASE',{verb:event.verb,callMet:!!event.callMet,chain:Number(event.chain)||1,flowGain:gain});
  if(mode==='PUZZLE'&&shouldFinishPuzzle)finish(state);else if(mode==='PLAY'&&releases>=RUN_LENGTH)finish(state);else if(mode==='PATH'&&releases>=PUZZLE_ROUNDS)finish(state);else if(mode==='DUET'&&releases>=DUET_ROUNDS)finish(state);else if(mode==='GARDEN'&&gardenEvents.length>=GARDEN_MOVES)finishGardenGeneration(state);
}
function normalCoach(state,forecast,hitReady){
  if(hitReady)return 'HIT READY · RELEASE '+forecast.verb;
  if(forecast)return 'HERE '+forecast.verb+(forecast.chain>1?' ×'+forecast.chain:'')+' · KEEP TURNING FOR GOAL '+callText(state.call);
  return 'TURN · FIND '+typePresentation(state.targetType).text+' · SAME SHAPE FAMILY WAKES THE CENTER';
}
function updateDuet(state,forecast,hitReady){
  const a=wrap(state.rotation,6),rel=relationVerb(a,duetB,6),name=relationName(a,duetB,6),agrees=!!forecast&&rel===forecast.verb;
  q('#fbDialA').textContent=a;q('#fbDialB').textContent=duetB;q('#fbRelationName').textContent=name;q('#fbRelationVerb').textContent=rel;q('#fbDuetState').textContent=!forecast?'SEEK A ROAD CONSEQUENCE':agrees?'DIALS AGREE':'TUNE PARTNER TO '+forecast.verb;q('#fbObjective').textContent='GOAL '+callText(state.call);
  if(!forecast)q('#fbCoach').textContent='DIAL A IS THE RING · TURN UNTIL THE ROAD WAKES';else if(!hitReady)q('#fbCoach').textContent='ROAD '+forecast.verb+' · TURN RING FOR CALL '+callText(state.call);else if(!agrees)q('#fbCoach').textContent='ROAD '+forecast.verb+' ✓ · TUNE DIAL B UNTIL RELATION ALSO SAYS '+forecast.verb;else q('#fbCoach').textContent='DUET LOCKED · ROAD + RELATION AGREE · RELEASE';
  q('#fbProgress').textContent=releases+'/'+DUET_ROUNDS+' · '+duetHits+' SYNC';
}
function updateForm(state,forecast){
  renderFormPanel();
  if(formPhase==='FORM'){
    const index=formCurrent.length,p=forecast?relationPolarity(forecast.verb):null;
    q('#fbObjective').textContent='CAST HEXAGRAM · LINE '+Math.min(index+1,FORM_SLOTS)+' / '+FORM_SLOTS;
    q('#fbCoach').textContent=forecast?'RELEASE '+forecast.verb+' → '+(p?.polarity||'—')+' '+(p?.line||''):'TURN · FIND ANY LAWFUL RELEASE';
    q('#fbProgress').textContent=index+'/'+FORM_SLOTS+' · exact '+formToken(formCurrent);
  }else{
    const address=formAddress(state.rotation),before=formCurrent[address],next=forecast?.verb||null,beforeP=relationPolarity(before),nextP=relationPolarity(next),exactDelta=changedFormSlots(formFrom||[],formCurrent),fromHex=hexProjection(formFrom||[]),nowHex=hexProjection(formCurrent),hexOut=fromHex.bits&&nowHex.bits?hexChangeOutcome(fromHex.bits,nowHex.bits,formChangeMoves):{changed:[]};
    q('#fbObjective').textContent='CHANGE · LINE '+(address+1)+' · '+(beforeP?.polarity||'—')+(next?' → '+(nextP?.polarity||'—'):'');
    if(!forecast)q('#fbCoach').textContent='TURN · ADDRESS A LINE + WAKE A CONSEQUENCE';
    else if(beforeP?.bit!==nextP?.bit)q('#fbCoach').textContent='MOVING LINE READY · '+before+' → '+next;
    else if(before!==next)q('#fbCoach').textContent='EXACT VERB CHANGES · HEX LINE HOLDS · '+before+' → '+next;
    else q('#fbCoach').textContent='THIS HOLDS '+before+' · KEEP TURNING OR RELEASE';
    q('#fbProgress').textContent='MOVING '+hexOut.changed.length+'/'+HEX_CHANGE_TARGET+' · exact Δ '+exactDelta.length+' · MOVE '+formChangeMoves+'/'+HEX_CHANGE_LIMIT;
  }
}
function updateGarden(state,forecast,hitReady){
  if(gardenTrait){const p=gardenProgress(gardenTrait,gardenEvents);q('#fbObjective').textContent='GEN '+gardenGeneration+' · KEEP '+gardenTrait+' · '+p.label;q('#fbCoach').textContent=GARDEN_TRAITS[gardenTrait].short.toUpperCase()+' · '+normalCoach(state,forecast,hitReady);}else{q('#fbObjective').textContent='GEN 1 · OBSERVE THE PARENT';q('#fbCoach').textContent=normalCoach(state,forecast,hitReady);}
  q('#fbProgress').textContent='G'+gardenGeneration+'/'+GARDEN_GENERATIONS+' · '+gardenEvents.length+'/'+GARDEN_MOVES+' · '+gardenSurvived+'/'+GARDEN_SURVIVAL_TARGET;
}
function projectionView(state,forecast){
  const rel=relationVerb(wrap(state.rotation,6),duetB,6),relName=relationName(wrap(state.rotation,6),duetB,6);
  return {mode,active,releases,hits,stars,turns,par,forecast:forecast?{verb:forecast.verb,chain:forecast.chain}:null,
    view:{still:stillView},
    form:{phase:formPhase,from:formFrom||[],current:[...formCurrent],address:formAddress(state.rotation),writeIndex:formPhase==='FORM'?Math.min(formCurrent.length,FORM_SLOTS-1):formAddress(state.rotation),changed:formFrom?changedFormSlots(formFrom,formCurrent):[],moves:formChangeMoves,targetChanges:FORM_CHANGE_TARGET,moveLimit:FORM_CHANGE_LIMIT,token:formToken(formCurrent),hex:hexProjection(formCurrent),hexChange:formFrom?hexChangeProjection(formFrom,formCurrent):null},
    duet:{a:wrap(state.rotation,6),b:duetB,relation:relName,verb:rel,hits:duetHits},
    garden:{generation:gardenGeneration,trait:gardenTrait,survived:gardenSurvived,events:gardenEvents.length},
    path:{round:releases+1,stars,par,turns}};
}
function update(state){
  if(!active||!root)return;updateStillControl();const forecast=runtime.forecast?.(),call=state.call,aligned=!!forecast,hitReady=aligned&&forecastMatchesCall(call,forecast);runtime?.gameProjection?.set?.(projectionView(state,forecast));
  q('#fbMode').textContent=mode==='PLAY'?'RUN':mode==='PUZZLE'?'HEX':mode==='PATH'?'PAR':mode;root.querySelectorAll('[data-switch]').forEach(btn=>btn.classList.toggle('on',btn.dataset.switch===mode));duetPanel.classList.toggle('on',mode==='DUET');formPanel.classList.toggle('on',mode==='PUZZLE');
  schedulePrimaryControlCheck();
  if(mode==='ZEN'){q('#fbObjective').textContent='FREE RIDE';q('#fbCoach').textContent=aligned?'RELEASE '+forecast.verb+' · OR KEEP TURNING':'TURN · FEEL THE FIELD · RELEASE WHEN IT WAKES';q('#fbProgress').textContent='OPEN';return;}
  if(mode==='PUZZLE'){updateForm(state,forecast);return;}if(mode==='DUET'){updateDuet(state,forecast,hitReady);return;}if(mode==='GARDEN'){updateGarden(state,forecast,hitReady);return;}
  q('#fbObjective').textContent='GOAL '+callText(call);q('#fbCoach').textContent=normalCoach(state,forecast,hitReady);q('#fbProgress').textContent=mode==='PATH'?(releases+1)+'/'+PUZZLE_ROUNDS+' · '+stars+'★/'+PUZZLE_WIN_STARS+' · PAR '+par+' · '+turns+'T':releases+'/'+RUN_LENGTH+' · '+hits+'/'+RUN_WIN_HITS+' HIT';
}
function poll(){
  if(!runtime)return;
  const state=runtime.state(),seq=Number(state.seq)||0,event=state.history?.at(-1),newRelease=!!(active&&event&&event.id!==lastEventId);
  if(active){
    const part=partitionTurnDelta(lastSeq,seq,newRelease?event.id:null);
    turns+=part.before;
    if(newRelease){lastEventId=event.id;onRelease(event,state);if(active)turns+=part.after;}
    else if(event)lastEventId=event.id;
  }else if(event)lastEventId=event.id;
  lastSeq=seq;lastRotation=state.rotation;
  if(active)update(state);
}
function playState(){
  const formChange=formFrom?formChangeOutcome(formFrom,formCurrent,formChangeMoves):null,formDeltaState=formFrom?formDelta(formFrom,formCurrent):null;
  const out={version:VERSION,mode,active,ended,releases,hits,flowGain,stars,turns,par,form:{version:FORM_PUZZLE_VERSION,phase:formPhase,from:formFrom?[...formFrom]:null,current:[...formCurrent],token:formToken(formCurrent),moves:formChangeMoves,change:formChange,delta:formDeltaState,hex:hexProjection(formCurrent),hexChange:formFrom?hexChangeProjection(formFrom,formCurrent):null},duet:{partner:duetB,hits:duetHits},garden:{generation:gardenGeneration,trait:gardenTrait,survived:gardenSurvived,lineage:[...gardenLineage],events:[...gardenEvents],choice:!!gardenChoice?.classList.contains('on')},win:{run:mode==='PLAY'?runOutcome(hits,releases):null,path:mode==='PATH'?puzzleOutcome(stars):null,duet:mode==='DUET'?duetOutcome(duetHits,releases):null,garden:mode==='GARDEN'?gardenOutcome(gardenSurvived):null}};
  out.loop=loopWitness(mode,out);
  return out;
}
function exportPlayReturn(){
  const formLanguage=mode==='PUZZLE'?{version:FORM_PUZZLE_VERSION,authority:'EXACT_VERB_SUBSTRATE',phase:formPhase,from:formFrom?[...formFrom]:null,current:[...formCurrent],token:formToken(formCurrent),delta:formFrom?formDelta(formFrom,formCurrent):null,changeMoves:formChangeMoves}:null;
  const stateLanguage=mode==='PUZZLE'?{version:HEX_PROJECTION_VERSION,authority:'PROJECTION_ONLY',law:'SAME/NEAR → solid YANG; FAR/OPPOSITE → broken YIN. This is a FOLD//BLOOM relation quotient, not a claim about traditional Yijing meanings.',exactFormsPerHexagram:EXACT_FORMS_PER_HEXAGRAM,from:formFrom?hexProjection(formFrom):null,current:hexProjection(formCurrent),change:formFrom?hexChangeProjection(formFrom,formCurrent):null}:null;
  emitLoopEvent('RETURN',{format:'JSON'});const packet={kind:'FOLD_BLOOM_PLAY_RETURN',version:VERSION,created:new Date().toISOString(),contract:loopContract(mode),play:playState(),formLanguage,stateLanguage,live:runtime?.state?.()||null,donors:{twoDial:'/fold-bloom/two-dial/',ecology:'/fold-bloom/ecology/',foldWeave:'/recovery/fold-bloom/fold-weave-0.1/',stateLanguage:'/fold-bloom/STATE_CHANGE.md',formPuzzle:'/fold-bloom/live/form-puzzle.js',hexProjection:'/fold-bloom/live/hex-projection.js'}};
  const blob=new Blob([JSON.stringify(packet,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='fold-bloom-play-'+mode.toLowerCase()+'-'+Date.now()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function openDonor(){if(mode==='DUET')window.open('../two-dial/','fold-bloom-two-dial');else if(mode==='GARDEN')window.open('../ecology/','fold-bloom-ecology');}
function boot(){
  runtime=window.FoldBloomLive;if(!runtime){setTimeout(boot,80);return;}injectStyle();injectEntry();injectHud();document.documentElement.dataset.foldBloomPlay=VERSION;document.documentElement.dataset.foldBloomPlayLoop=PLAY_LOOP_CONTRACT_VERSION;if(VALID.has(requested))start(requested);else schedulePrimaryControlCheck();setInterval(poll,120);window.FoldBloomPlay={version:VERSION,start,state:playState,contract:modeName=>loopContract(modeName||mode),contracts:loopContracts,subscribe:subscribeLoop,relation:(a,b)=>({name:relationName(a,b,6),verb:relationVerb(a,b,6)})};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
