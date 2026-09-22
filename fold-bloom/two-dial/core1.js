'use strict';
const APP_VERSION = '0.10.3-idle-witness',
  SCHEMA = 3,
  STORE = 'fold-bloom-product-v04',
  SAVE_STORE = 'fold-bloom-cassettes-v1';
const $ = s => document.querySelector(s),
  $$ = s => [...document.querySelectorAll(s)],
  cv = $('#game'),
  g = cv.getContext('2d'),
  TAU = Math.PI * 2;
const M = ['○', '≈', '✦', '◇', '∿', '×'],
  HARM = ['Ⅰ', 'Ⅴ', 'Ⅱ', 'Ⅵ', 'Ⅲ', 'Ⅶ'];
const WORLDS = {
  STILL: {
    name: 'STILL',
    desc: 'Sparse pentatonic air. Slow pulse, wide space, gentle return.',
    scale: [0, 2, 4, 7, 9, 11],
    root: 48,
    bpm: 68,
    cut: 2800,
    delay: 0.12,
    sync: 0.12,
    pulse: [0, 6, 10],
    bass: 'sine',
    body: 'triangle',
    lead: 'sine',
  },
  DEEP: {
    name: 'DEEP',
    desc: 'Low Dorian gravity. Heavier bass and patient harmonic movement.',
    scale: [0, 2, 3, 5, 7, 10],
    root: 43,
    bpm: 76,
    cut: 2200,
    delay: 0.18,
    sync: 0.18,
    pulse: [0, 3, 8, 11],
    bass: 'sine',
    body: 'triangle',
    lead: 'sine',
  },
  GLASS: {
    name: 'GLASS',
    desc: 'Bright open fifths and close voice-leading. Clearer transient detail.',
    scale: [0, 2, 5, 7, 9, 11],
    root: 50,
    bpm: 86,
    cut: 5200,
    delay: 0.25,
    sync: 0.2,
    pulse: [0, 4, 7, 12],
    bass: 'triangle',
    body: 'sine',
    lead: 'triangle',
  },
  PULSE: {
    name: 'PULSE',
    desc: 'Bodily medium-syncopation field. Motion strongly shapes rhythm.',
    scale: [0, 2, 4, 5, 7, 9],
    root: 45,
    bpm: 98,
    cut: 3900,
    delay: 0.14,
    sync: 0.32,
    pulse: [0, 3, 6, 10, 13],
    bass: 'sine',
    body: 'triangle',
    lead: 'square',
  },
  STRANGE: {
    name: 'STRANGE',
    desc: 'Ambiguous hexatonic territory. More friction, displacement and unstable color.',
    scale: [0, 1, 4, 6, 8, 11],
    root: 46,
    bpm: 82,
    cut: 4400,
    delay: 0.31,
    sync: 0.4,
    pulse: [0, 2, 5, 9, 12, 15],
    bass: 'triangle',
    body: 'sawtooth',
    lead: 'sine',
  },
};
Object.assign(WORLDS, window.FoldBloomMusicData?.worlds || {});
const MUSIC_DATA = window.FoldBloomMusicData || {};
const VOICES = MUSIC_DATA.voices || { AIR:{name:'AIR',desc:'Fallback voice',synth:'air',brightness:1,motion:1,live:'sine'} };
const GROOVES = MUSIC_DATA.grooves || { GROUND:{name:'GROUND',desc:'Fallback groove',kick:[0,8],snare:[4,12],hats:7,rot:0,swing:0} };
const SCOPES = MUSIC_DATA.scopes || { PULSE:{name:'PULSE',desc:'Rhythm scale'}, VOICE:{name:'VOICE',desc:'Voice scale'}, MOTIF:{name:'MOTIF',desc:'Motif scale'}, FORM:{name:'FORM',desc:'Form scale'} };
function voice(){ return VOICES[prefs?.voice] || VOICES.AIR; }
function groove(){ return GROOVES[prefs?.groove] || GROOVES.GROUND; }
function scopeDef(){ return SCOPES[prefs?.scope] || SCOPES.PULSE; }
const MODE_DESC = {
  PLAY: 'One-player game/instrument. The field asks for a transformation, not an answer-position. Fulfil it anywhere; absolute position changes the harmony and future sediment.',
  OPEN: 'No target authority. The two dials define the verb directly: an instrument for improvisation and discovery.',
  DUET: 'Same algebra, split socially. Best in landscape: one person owns MATTER, the other HARMONY; together you manufacture the requested transformation.',
  SCALE: 'Recovered scale-of-consequence mode. The same BLOOM/FOLD/SPLIT/RETURN relation is aimed deliberately at PULSE, VOICE, MOTIF or FORM instead of changing every musical layer at once.',
};
let W = 0,
  H = 0,
  D = 1,
  t = 0,
  run = false,
  audio = null,
  master = null,
  filter = null,
  comp = null,
  delay = null,
  feedback = null,
  reverb = null,
  wet = null,
  saturator = null,
  noiseBuffer = null;
let L = 0,
  R = 0,
  rawL = 0,
  rawR = 0,
  target = { m: 0, h: 1 },
  next = { m: 2, h: 4 },
  score = 0,
  chain = 0,
  splitCharge = 0;
const VERBS = ['BLOOM', 'FOLD', 'SPLIT', 'RETURN'],
  VG = { BLOOM: '✦', FOLD: '⌁', SPLIT: '⋔', RETURN: '↺' };
let requestVerb = 'BLOOM',
  nextVerb = 'FOLD',
  fulfilled = 0;
let phrasePlan = ['BLOOM', 'FOLD', 'SPLIT', 'RETURN'],
  phrasePos = 0,
  phraseCount = 0,
  currentPhraseMoves = [],
  phraseHistory = [],
  lastPhraseSig = '',
  resetArm = 0;
let pairMemory = Array.from({ length: 6 }, () => Array(6).fill(0)),
  preview = { power: 1, echo: 0, gravity: 0, label: '' };
let scarsL = [0, 0, 0, 0, 0, 0],
  scarsR = [0, 0, 0, 0, 0, 0],
  particles = [],
  waves = [],
  pointers = new Map();
let live = { vL: 0, vR: 0, mode: 'STILL' },
  phrase = Array.from({ length: 16 }, () => ({ m: 0, h: 0, w: 0, verb: '' })),
  learnCursor = 0;
const fieldEventListeners = new Set();
let pulseLink = {
  connected: false,
  playing: false,
  bpm: 0,
  time: 0,
  duration: 0,
  beatIndex: -1,
  phraseIndex: -1,
  phraseProgress: null,
  sectionIndex: -1,
  energy: 0,
  flux: 0,
  brightness: 0,
  scope: '',
  stage: '',
  sourceHash: null,
  sourceKind: null,
  sourceAddress: null,
  wall: 0,
};
let form = {
  state: 'GROUND',
  bars: 0,
  tension: 0,
  sync: 0.18,
  motif: [],
  lastMotif: [],
  cadence: 0,
};
let mus = {
  step: 0,
  next: 0,
  timer: 0,
  energy: 0.28,
  density: 0.28,
  voices: 3,
  lastVoicing: [60, 64, 67],
};
let pat = {
  cycle: 0,
  rotation: 0,
  fold: false,
  bloom: 0,
  split: 0,
  law: 'seq',
};
let prefs = {
  mode: 'PLAY',
  world: 'DEEP',
  voice: 'AIR',
  groove: 'GROUND',
  scope: 'PULSE',
  surface: 'INK',
  volume: 0.84,
  memory: 0.62,
  motion: 0.7,
  haptic: true,
  quiet: false,
  pulseLink: false,
};
let rngState = Date.now() >>> 0 || 1,
  events = [],
  eventSeq = 0,
  soundOn = true,
  dL = null,
  dR = null,
  gL = null,
  gR = null;
const OUT_GAIN = 0.68;
let demo = { on: false, i: 0, timer: 0, prevMode: 'PLAY', raf: 0, preview: false, startState: null };
function wrap(n, m) {
  return ((n % m) + m) % m;
}
function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
function rng() {
  rngState |= 0;
  rngState = (rngState + 0x6d2b79f5) | 0;
  let x = rngState;
  x = Math.imul(x ^ (x >>> 15), 1 | x);
  x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
}
function emit(type, data = {}) {
  const event = { n: ++eventSeq, type, ...data };
  events.push(event);
  if (events.length > 160) events.shift();
  if (!demo?.preview) {
    for (const fn of fieldEventListeners) {
      try { fn(event); } catch (_) {}
    }
  }
}
function normalizedPulseBpm(raw) {
  let bpm = Number(raw);
  if (!Number.isFinite(bpm) || bpm <= 0) return null;
  while (bpm < 64) bpm *= 2;
  while (bpm > 136) bpm /= 2;
  return clamp(bpm, 56, 136);
}
function pulseIsLive(now = Date.now()) {
  return !!(
    prefs.pulseLink &&
    pulseLink.connected &&
    pulseLink.playing &&
    normalizedPulseBpm(pulseLink.bpm) &&
    now - pulseLink.wall < 2800
  );
}
function pulseTempo() {
  return pulseIsLive() ? normalizedPulseBpm(pulseLink.bpm) : null;
}
function updatePulseContext(data = {}, wall = Date.now()) {
  pulseLink = {
    ...pulseLink,
    connected: true,
    playing: !!data.playing,
    bpm: Number(data.bpm) || 0,
    time: Number(data.time) || 0,
    duration: Number(data.duration) || 0,
    beatIndex: Number.isFinite(Number(data.beatIndex)) ? Number(data.beatIndex) : -1,
    phraseIndex: Number.isFinite(Number(data.phraseIndex)) ? Number(data.phraseIndex) : -1,
    phraseProgress: Number.isFinite(Number(data.phraseProgress)) ? Number(data.phraseProgress) : null,
    sectionIndex: Number.isFinite(Number(data.sectionIndex)) ? Number(data.sectionIndex) : -1,
    energy: clamp(Number(data.energy) || 0, 0, 1.5),
    flux: clamp(Number(data.flux) || 0, 0, 1.5),
    brightness: clamp(Number(data.brightness) || 0, 0, 1.5),
    scope: String(data.scope || ''),
    stage: String(data.stage || ''),
    sourceHash: data.sourceHash || null,
    sourceKind: data.sourceKind || null,
    sourceAddress: data.sourceAddress || null,
    wall: Number(wall) || Date.now(),
  };
  return { ...pulseLink, active: pulseIsLive(), tempo: pulseTempo() };
}
function setPulseLink(enabled) {
  prefs.pulseLink = !!enabled;
  emit('pulse-link', { enabled: prefs.pulseLink });
  saveLocal();
  hud();
  return prefs.pulseLink;
}
function world() {
  return WORLDS[prefs.world];
}
function resize() {
  D = Math.min(2, devicePixelRatio || 1);
  W = innerWidth;
  H = innerHeight;
  cv.width = W * D;
  cv.height = H * D;
  g.setTransform(D, 0, 0, D, 0, 0);
}
addEventListener('resize', resize);
resize();
function centers() {
  let landscape = W > H,
    r = Math.min(landscape ? H * 0.29 : W * 0.205, H * 0.25);
  return landscape
    ? [
        { x: W * 0.24, y: H * 0.56, r },
        { x: W * 0.76, y: H * 0.56, r },
      ]
    : [
        { x: W * 0.28, y: H * 0.55, r },
        { x: W * 0.72, y: H * 0.55, r },
      ];
}
function relationFromPair(l = L, r = R) {
  let d = wrap(r - l, 6);
  if (d === 0) return 'BLOOM';
  if (d === 1 || d === 5) return 'FOLD';
  if (d === 2 || d === 4) return 'RETURN';
  return 'SPLIT';
}
function rel() {
  return relationFromPair();
}
function shuffleVerbs() {
  let a = [...VERBS];
  for (let i = a.length - 1; i > 0; i--) {
    let j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  if (form.tension > 0.55) {
    let k = a.indexOf('RETURN');
    [a[k], a[3]] = [a[3], a[k]];
  }
  return a;
}
function beginPhrase(plan = null) {
  phrasePlan = plan || shuffleVerbs();
  phrasePos = 0;
  requestVerb = phrasePlan[0];
  nextVerb = phrasePlan[1];
  currentPhraseMoves = [];
  renderScore();
}
function renderScore() {
  let el = $('#scoreLine');
  if (!el) return;
  if (prefs.mode === 'OPEN') {
    el.innerHTML = '<span class="phraseNo">OPEN SCORE</span>';
    return;
  }
  el.innerHTML =
    phrasePlan
      .map(
        (v, i) =>
          `<span class="op ${i < phrasePos ? 'done' : i === phrasePos ? 'now' : ''}" title="${v}">${VG[v]}</span>`
      )
      .join('') +
    `<span class="phraseNo">PHRASE ${String(phraseCount + 1).padStart(2, '0')}</span>`;
}
function pairMidi(l, r, oct = 12) {
  let w = world(),
    idx = wrap(l + r, 6);
  return w.root + w.scale[idx] + oct;
}
function replayPhrase(moves) {
  if (!moves.length) return;
  let sig = moves.map(m => VG[m.v]).join('');
  lastPhraseSig = sig;
  if (audio && soundOn) {
    let now = audio.currentTime + 0.08,
      unit = 60 / currentBpm() / 2;
    moves.forEach((m, i) => {
      let pan = (m.r - 2.5) / 3.3,
        vel = Math.min(1, 0.46 + m.power * 0.11);
      pluck(pairMidi(m.l, m.r), now + i * unit, vel, pan);
      if (m.v === 'RETURN')
        tone(
          world().root + 12,
          now + i * unit + 0.05,
          0.42,
          0.035,
          world().body,
          world().cut
        );
    });
  }
  emit('phrase_return', {
    n: phraseCount,
    sig,
    moves: moves.map(m => ({ l: m.l, r: m.r, v: m.v, power: m.power })),
  });
  $('#lawStrip').textContent =
    `PHRASE RETURN ${String(phraseCount).padStart(2, '0')} // ${sig}`;
  toast(`PHRASE ${String(phraseCount).padStart(2, '0')} · RETURN`);
}
function completePhrase() {
  phraseCount++;
  let moves = currentPhraseMoves.map(m => ({ ...m }));
  phraseHistory.push({
    n: phraseCount,
    sig: moves.map(m => m.v[0]).join(''),
    moves,
  });
  phraseHistory = phraseHistory.slice(-12);
  replayPhrase(moves);
  beginPhrase();
}
function homeDistance(r = R) {
  let d = Math.abs(r) % 6;
  return Math.min(d, 6 - d);
}
function pairEcho(l = L, r = R) {
  return pairMemory[wrap(l, 6)][wrap(r, 6)] || 0;
}
function operatorPower(l = L, r = R) {
  let wear = (scarsL[wrap(l, 6)] + scarsR[wrap(r, 6)]) / 2,
    echo = pairEcho(l, r);
  return 1 + Math.min(2, Math.floor((wear + echo * 1.5) / 4));
}
function consequence(l = L, r = R) {
  let v = relationFromPair(l, r),
    power = operatorPower(l, r),
    echo = pairEcho(l, r),
    gravity = homeDistance(r),
    grav = gravity === 0 ? 'HOME' : gravity === 1 ? 'NEAR' : 'FAR',
    e = echo > 0 ? 'ECHO' : 'NEW';
  return { v, power, echo, gravity, label: `${v} ×${power} · ${e} · ${grav}` };
}
function updatePreview() {
  preview = consequence();
}
function colors(v) {
  return (
    { BLOOM: '#77d7ff', FOLD: '#ffd56b', SPLIT: '#ff8da1', RETURN: '#b6ff9b' }[
      v
    ] || '#7890a2'
  );
}
