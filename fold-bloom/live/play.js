import { availableForecasts, forecastMatchesCall, gateCellIndex, TYPE_NAMES, N } from './engine.js';

const VERSION = 'FOLD_BLOOM_PLAY_0.1';
const VALID = new Set(['PLAY','PUZZLE','ZEN']);
const params = new URLSearchParams(location.search);
const requested = String(params.get('play') || '').toUpperCase();
let mode = VALID.has(requested) ? requested : 'PLAY';

let active = false;
let ended = false;
let releases = 0;
let hits = 0;
let flowGain = 0;
let stars = 0;
let turns = 0;
let par = 0;
let lastRotation = null;
let lastEventId = null;
let runtime = null;
let root = null;
let result = null;

const q = s => document.querySelector(s);
const circularDistance = (a,b) => {
  const d = Math.abs(Number(a)-Number(b)) % N;
  return Math.min(d, N-d);
};
const callText = call => !call ? 'OPEN' : call.verb + (call.chain > 1 ? ' ×' + call.chain + '+' : '');

function parFor(state){
  if(!state?.call) return 0;
  const gate = gateCellIndex(state);
  const options = availableForecasts(state).filter(x => forecastMatchesCall(state.call,x));
  if(!options.length) return 0;
  return Math.min(...options.map(x => circularDistance(gate,x.slot)));
}

function injectStyle(){
  if(q('#fbPlayStyle')) return;
  const style = document.createElement('style');
  style.id = 'fbPlayStyle';
  style.textContent = `
  .fbPlayEntry{margin:16px 0 2px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.025);padding:12px}
  .fbPlayEntry .law{font-size:9px;line-height:1.55;letter-spacing:.07em;color:#dce3ea;margin-bottom:10px}
  .fbPlayEntry .law b{color:#fff}
  .fbPlayEntry .modes{display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:6px}
  .fbPlayEntry button{min-height:48px;padding:9px 10px;font-size:8px;font-weight:1000;letter-spacing:.09em}
  .fbPlayEntry button[data-play-mode="PLAY"]{background:#fff;color:#05070b;border-color:#fff}
  .fbGame{position:absolute;left:50%;top:max(58px,calc(env(safe-area-inset-top) + 54px));transform:translateX(-50%);z-index:6;width:min(620px,calc(100vw - 20px));pointer-events:auto;display:none}
  .fbGame.on{display:block}
  .fbGameBar{border:1px solid rgba(255,255,255,.16);background:rgba(5,8,12,.88);backdrop-filter:blur(10px);display:grid;grid-template-columns:auto 1fr auto;align-items:stretch;min-height:48px}
  .fbGameMode{display:flex;align-items:center;padding:0 10px;border-right:1px solid rgba(255,255,255,.12);font-size:7px;font-weight:1000;letter-spacing:.13em;color:#fff}
  .fbGameMission{min-width:0;padding:7px 10px}
  .fbGameMission b{display:block;font-size:10px;letter-spacing:.06em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .fbGameMission span{display:block;margin-top:3px;font-size:7px;letter-spacing:.08em;color:rgba(255,255,255,.54);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .fbGameProgress{display:flex;align-items:center;gap:5px;padding:5px;border-left:1px solid rgba(255,255,255,.12)}
  .fbGameProgress b{font-size:8px;min-width:48px;text-align:center}
  .fbGameProgress button{min-width:40px;height:34px;padding:0 6px;font-size:7px;font-weight:1000}
  .fbGameProgress button.on{background:#fff;color:#05070b;border-color:#fff}
  .fbResult{position:absolute;inset:0;z-index:12;background:rgba(3,5,8,.90);backdrop-filter:blur(8px);display:none;align-items:center;justify-content:center;padding:18px;pointer-events:auto}
  .fbResult.on{display:flex}
  .fbResultCard{width:min(540px,100%);border:1px solid rgba(255,255,255,.18);background:#080c12;padding:18px}
  .fbResultCard .ey{font-size:8px;color:#74808d;letter-spacing:.16em}
  .fbResultCard h2{font-size:clamp(38px,11vw,72px);line-height:.88;letter-spacing:-.06em;margin:8px 0 12px}
  .fbResultCard p{font:10px/1.55 system-ui,-apple-system,sans-serif;color:#aab5c1;margin:0 0 14px}
  .fbResultCard .row{display:flex;gap:6px;flex-wrap:wrap}
  .fbResultCard button{min-height:46px;font-size:8px;font-weight:1000;letter-spacing:.09em}
  .fbResultCard button.primary{background:#fff;color:#05070b;border-color:#fff}
  html[data-fb-play-mode="ZEN"] .callpill,
  html[data-fb-play-mode="ZEN"] .diag{display:none!important}
  @media(max-width:620px){
    .fbPlayEntry .modes{grid-template-columns:1fr}
    .fbGame{top:max(54px,calc(env(safe-area-inset-top) + 50px));width:calc(100vw - 16px)}
    .fbGameBar{grid-template-columns:68px 1fr auto;min-height:50px}
    .fbGameMode{padding:0 7px;font-size:6.5px}
    .fbGameMission{padding:7px 8px}
    .fbGameMission b{font-size:9px}
    .fbGameMission span{font-size:6.5px}
    .fbGameProgress{gap:3px;padding:4px}
    .fbGameProgress b{display:none}
    .fbGameProgress button{min-width:36px;height:34px;padding:0 4px;font-size:6.5px}
  }`;
  document.head.appendChild(style);
}

function injectEntry(){
  const card = q('#intro .card');
  if(!card || q('#fbPlayEntry')) return;
  const lede = card.querySelector('.lede');
  if(lede) lede.textContent = 'Turn the ring. Find the named symbol. Keep turning until the center button says the GOAL. Release. Every move writes the road.';
  const box = document.createElement('div');
  box.id = 'fbPlayEntry';
  box.className = 'fbPlayEntry';
  box.innerHTML = '<div class="law"><b>ONE MOVE:</b> TURN → FIND THE SYMBOL → MATCH THE GOAL → RELEASE.<br><b>ONE RUN:</b> eight releases. No lives. No dead moves; misses still change the field.</div><div class="modes"><button data-play-mode="PLAY">PLAY A RUN · 8 MOVES</button><button data-play-mode="PUZZLE">PUZZLE · 5 CALLS</button><button data-play-mode="ZEN">ZEN · FREE RIDE</button></div>';
  const more = card.querySelector('.introMore');
  card.insertBefore(box, more || null);
  box.querySelectorAll('[data-play-mode]').forEach(btn => btn.addEventListener('click', () => start(btn.dataset.playMode)));
}

function injectHud(){
  if(q('#fbGame')) return;
  root = document.createElement('div');
  root.id = 'fbGame';
  root.className = 'fbGame';
  root.innerHTML = '<div class="fbGameBar"><div class="fbGameMode" id="fbMode">PLAY</div><div class="fbGameMission"><b id="fbObjective">GOAL —</b><span id="fbCoach">TURN THE RING</span></div><div class="fbGameProgress"><b id="fbProgress">0 / 8</b><button data-switch="PLAY">RUN</button><button data-switch="PUZZLE">PUZ</button><button data-switch="ZEN">ZEN</button></div></div>';
  document.body.appendChild(root);
  root.querySelectorAll('[data-switch]').forEach(btn => btn.addEventListener('click', () => start(btn.dataset.switch)));

  result = document.createElement('div');
  result.id = 'fbResult';
  result.className = 'fbResult';
  result.innerHTML = '<div class="fbResultCard"><div class="ey" id="fbResultEy">RUN RETURN</div><h2 id="fbResultBig">0 / 8</h2><p id="fbResultBody"></p><div class="row"><button class="primary" data-result="AGAIN">AGAIN</button><button data-result="PUZZLE">PUZZLE</button><button data-result="ZEN">ZEN</button><button data-result="EXPORT">EXPORT RETURN</button></div></div>';
  document.body.appendChild(result);
  result.querySelectorAll('[data-result]').forEach(btn => btn.addEventListener('click', () => {
    const action = btn.dataset.result;
    if(action === 'EXPORT'){ q('#exportBtn')?.click(); return; }
    start(action === 'AGAIN' ? mode : action);
  }));
}

function start(nextMode='PLAY'){
  mode = VALID.has(nextMode) ? nextMode : 'PLAY';
  runtime?.autopilot?.stop?.();
  q('#intro')?.classList.remove('on');
  result?.classList.remove('on');
  document.documentElement.dataset.fbPlayMode = mode;
  active = true;
  ended = false;
  releases = 0;
  hits = 0;
  flowGain = 0;
  stars = 0;
  turns = 0;
  const state = runtime.state();
  lastRotation = state.rotation;
  lastEventId = state.history?.at(-1)?.id ?? null;
  par = parFor(state);
  root.classList.add('on');
  update(state);
}

function finish(state){
  active = false;
  ended = true;
  root.classList.remove('on');
  const best = Math.max(1, Number(state.bestChain) || 1);
  q('#fbResultEy').textContent = mode === 'PUZZLE' ? 'PUZZLE RETURN' : 'RUN RETURN';
  q('#fbResultBig').textContent = mode === 'PUZZLE' ? stars + ' / 15' : hits + ' / 8';
  q('#fbResultBody').textContent = mode === 'PUZZLE'
    ? 'Five calls resolved · ' + hits + ' hits · FLOW +' + flowGain + ' · best chain ' + best + '×. The road you wrote remains live.'
    : 'Eight releases · ' + hits + ' calls hit · FLOW +' + flowGain + ' · best chain ' + best + '×. Misses still wrote topology; nothing was discarded.';
  result.classList.add('on');
}

function puzzleStars(event, used, targetPar){
  if(!event?.callMet) return 0;
  if(used <= targetPar) return 3;
  if(used <= targetPar + 1) return 2;
  return 1;
}

function onRelease(event, state){
  releases += 1;
  if(event.callMet) hits += 1;
  flowGain += Number(event.flowGain) || 0;
  if(mode === 'PUZZLE') stars += puzzleStars(event, turns, par);
  turns = 0;
  par = parFor(state);
  if((mode === 'PLAY' && releases >= 8) || (mode === 'PUZZLE' && releases >= 5)) finish(state);
}

function update(state){
  if(!active || !root) return;
  const forecast = runtime.forecast?.();
  const call = state.call;
  const aligned = !!forecast;
  const hitReady = aligned && forecastMatchesCall(call, forecast);

  q('#fbMode').textContent = mode === 'PLAY' ? 'RUN' : mode;
  root.querySelectorAll('[data-switch]').forEach(btn => btn.classList.toggle('on', btn.dataset.switch === mode));

  if(mode === 'ZEN'){
    q('#fbObjective').textContent = 'FREE RIDE';
    q('#fbCoach').textContent = aligned ? 'RELEASE ' + forecast.verb + ' · OR KEEP TURNING' : 'TURN · FEEL THE FIELD · RELEASE WHEN IT WAKES';
    q('#fbProgress').textContent = 'OPEN';
    return;
  }

  q('#fbObjective').textContent = 'GOAL ' + callText(call);
  if(hitReady){
    q('#fbCoach').textContent = 'HIT READY · RELEASE ' + forecast.verb;
  }else if(aligned){
    q('#fbCoach').textContent = 'HERE ' + forecast.verb + (forecast.chain > 1 ? ' ×' + forecast.chain : '') + ' · KEEP TURNING FOR GOAL ' + callText(call);
  }else{
    q('#fbCoach').textContent = 'TURN · FIND ' + (TYPE_NAMES[state.targetType] || '') + ' · CENTER BUTTON WAKES ON A MATCH';
  }

  if(mode === 'PUZZLE'){
    q('#fbProgress').textContent = (releases + 1) + '/5 · PAR ' + par + ' · ' + turns + 'T';
  }else{
    q('#fbProgress').textContent = releases + '/8 · ' + hits + ' HIT';
  }
}

function poll(){
  if(!runtime) return;
  const state = runtime.state();
  if(active && lastRotation !== null && state.rotation !== lastRotation){
    turns += circularDistance(lastRotation, state.rotation);
  }
  lastRotation = state.rotation;

  const event = state.history?.at(-1);
  if(active && event && event.id !== lastEventId){
    lastEventId = event.id;
    onRelease(event, state);
  }else if(event){
    lastEventId = event.id;
  }
  if(active) update(state);
}

function boot(){
  runtime = window.FoldBloomLive;
  if(!runtime){ setTimeout(boot,80); return; }
  injectStyle();
  injectEntry();
  injectHud();
  document.documentElement.dataset.foldBloomPlay = VERSION;
  if(VALID.has(requested)) setTimeout(() => start(requested), 120);
  setInterval(poll, 120);
  window.FoldBloomPlay = {version:VERSION,start,state:()=>({mode,active,ended,releases,hits,flowGain,stars,turns,par})};
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
else boot();
