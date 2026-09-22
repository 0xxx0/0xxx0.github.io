function minimalSnapshot() {
  return {
    schema: SCHEMA,
    app: APP_VERSION,
    seed: rngState >>> 0,
    prefs: {
      mode: demo.on ? demo.prevMode : prefs.mode,
      world: prefs.world,
      voice: prefs.voice,
      groove: prefs.groove,
      scope: prefs.scope,
      surface: prefs.surface,
      volume: prefs.volume,
      memory: prefs.memory,
      motion: prefs.motion,
      haptic: prefs.haptic,
      quiet: prefs.quiet,
      pulseLink: prefs.pulseLink,
    },
    L,
    R,
    rawL,
    rawR,
    target,
    next,
    requestVerb,
    nextVerb,
    fulfilled,
    phrasePlan,
    phrasePos,
    phraseCount,
    currentPhraseMoves,
    phraseHistory,
    lastPhraseSig,
    pairMemory,
    score,
    chain,
    splitCharge,
    scarsL,
    scarsR,
    phrase,
    learnCursor,
    form: { ...form, motif: form.motif, lastMotif: form.lastMotif },
    mus: { energy: mus.energy, density: mus.density, voices: mus.voices },
    pat: { ...pat },
    events: events.slice(-48),
  };
}
function shareSnapshot() {
  let x = minimalSnapshot();
  delete x.events;
  return x;
}
function restore(x) {
  if (!x || !x.prefs) return false;
  prefs = { ...prefs, ...x.prefs };
  rngState = x.seed || rngState;
  L = x.L || 0;
  R = x.R || 0;
  rawL = x.rawL ?? L;
  rawR = x.rawR ?? R;
  requestVerb = x.requestVerb || requestVerb;
  nextVerb = x.nextVerb || nextVerb;
  fulfilled = x.fulfilled || 0;
  phrasePlan = x.phrasePlan || phrasePlan;
  phrasePos = x.phrasePos || 0;
  phraseCount = x.phraseCount || 0;
  currentPhraseMoves = x.currentPhraseMoves || [];
  phraseHistory = x.phraseHistory || [];
  lastPhraseSig = x.lastPhraseSig || '';
  pairMemory = x.pairMemory || pairMemory;
  scarsL = x.scarsL || scarsL;
  scarsR = x.scarsR || scarsR;
  phrase = x.phrase || phrase;
  learnCursor = x.learnCursor || 0;
  form = { ...form, ...(x.form || {}) };
  mus = { ...mus, ...(x.mus || {}) };
  pat = { ...pat, ...(x.pat || {}) };
  events = Array.isArray(x.events) ? x.events : [];
  eventSeq = events.reduce((m, e) => Math.max(m, e.n || 0), 0);
  syncUI();
  applyWorldAudio();
  hud();
  return true;
}
function saveLocal() {
  if (demo?.preview) return;
  try {
    localStorage.setItem(STORE, JSON.stringify(minimalSnapshot()));
  } catch (e) {}
}
function loadLocal() {
  try {
    return restore(JSON.parse(localStorage.getItem(STORE) || 'null'));
  } catch (e) {
    return false;
  }
}
function b64enc(obj) {
  let s = encodeURIComponent(JSON.stringify(obj)).replace(
    /%([0-9A-F]{2})/g,
    (_, p) => String.fromCharCode('0x' + p)
  );
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64dec(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  let bin = atob(s),
    pct = [...bin]
      .map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join('');
  return JSON.parse(decodeURIComponent(pct));
}
function shareCode() {
  return 'FOLDBLOOM2:' + b64enc(shareSnapshot());
}
function hostedURL() {
  if (!/^https?:$/.test(location.protocol)) return null;
  let u = new URL(location.href);
  u.hash = 's=' + b64enc(shareSnapshot());
  return u.toString();
}
function showCode(c) {
  let box = $('#shareOut');
  box.style.display = 'block';
  box.value = c;
  box.focus();
  box.select();
}
async function shareNow() {
  let url = hostedURL(),
    text = url || shareCode();
  try {
    if (url && navigator.share) {
      await navigator.share({
        title: 'FOLD//BLOOM',
        text: 'A returned two-dial composition.',
        url,
      });
      toast('SHARED');
      return;
    }
  } catch (e) {
    if (e.name === 'AbortError') return;
  }
  showCode(text);
  try {
    await navigator.clipboard.writeText(text);
    toast('COPIED');
  } catch (e) {
    toast('CODE READY');
  }
}
async function copyCode() {
  let c = shareCode();
  showCode(c);
  try {
    await navigator.clipboard.writeText(c);
    toast('CODE COPIED');
  } catch (e) {
    toast('CODE READY');
  }
}
function exportPacket() {
  let packet = {
    kind: 'FOLD_BLOOM_RETURN',
    version: APP_VERSION,
    created: new Date().toISOString(),
    state: minimalSnapshot(),
    summary: {
      world: prefs.world,
      voice: prefs.voice,
      groove: prefs.groove,
      scope: prefs.scope,
      mode: prefs.mode,
      form: form.state,
      phrases: phraseCount,
      motif: form.motif,
    },
  };
  let blob = new Blob([JSON.stringify(packet, null, 2)], {
      type: 'application/json',
    }),
    a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `fold-bloom-${prefs.world.toLowerCase()}-${Date.now()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function savedAll() {
  try {
    return JSON.parse(localStorage.getItem(SAVE_STORE) || '[]');
  } catch (e) {
    return [];
  }
}
function saveCassette() {
  let arr = savedAll(),
    snap = minimalSnapshot(),
    name = `${prefs.world}/${prefs.voice}/${prefs.groove} · ${prefs.mode} · ${String(arr.length + 1).padStart(2, '0')}`;
  arr.unshift({ id: crypto.randomUUID?.() || String(Date.now()), name, snap });
  arr = arr.slice(0, 12);
  localStorage.setItem(SAVE_STORE, JSON.stringify(arr));
  renderSaves();
  toast('SAVED');
}
function renderSaves() {
  let el = $('#savedList'),
    arr = savedAll();
  el.innerHTML = '';
  if (!arr.length) {
    el.innerHTML = '<div class="tiny">No saved cassettes yet.</div>';
    return;
  }
  arr.forEach((x, i) => {
    let row = document.createElement('div');
    row.className = 'saveitem';
    row.innerHTML = `<button class="secondary">${x.name}</button><button class="secondary">×</button>`;
    row.children[0].onclick = () => {
      restore(x.snap);
      closeDrawer();
      toast('LOADED');
    };
    row.children[1].onclick = () => {
      arr.splice(i, 1);
      localStorage.setItem(SAVE_STORE, JSON.stringify(arr));
      renderSaves();
    };
    el.appendChild(row);
  });
}
function importCode() {
  let box = $('#shareOut');
  box.style.display = 'block';
  let txt = box.value.trim();
  if (!txt) {
    box.placeholder =
      'Paste a FOLDBLOOM2 code here, then press IMPORT CODE again.';
    box.focus();
    toast('PASTE CODE');
    return;
  }
  txt = txt.replace(/^FOLDBLOOM2:/, '');
  try {
    restore(b64dec(txt));
    saveLocal();
    toast('IMPORTED');
  } catch (e) {
    toast('BAD CODE');
  }
}
function newField() {
  rngState = Date.now() >>> 0 || 1;
  L = R = rawL = rawR = 0;
  score = chain = splitCharge = fulfilled = 0;
  phraseCount = 0;
  phraseHistory = [];
  lastPhraseSig = '';
  pairMemory = Array.from({ length: 6 }, () => Array(6).fill(0));
  beginPhrase(['BLOOM', 'FOLD', 'SPLIT', 'RETURN']);
  scarsL = [0, 0, 0, 0, 0, 0];
  scarsR = [0, 0, 0, 0, 0, 0];
  phrase = Array.from({ length: 16 }, () => ({ m: 0, h: 0, w: 0, verb: '' }));
  learnCursor = 0;
  form = {
    state: 'GROUND',
    bars: 0,
    tension: 0,
    sync: world().sync,
    motif: [],
    lastMotif: [],
    cadence: 0,
  };
  mus.energy = 0.28;
  mus.density = 0.28;
  mus.voices = 3;
  pat = { cycle: 0, rotation: 0, fold: false, bloom: 0, split: 0, law: 'seq' };
  events = [];
  eventSeq = 0;
  saveLocal();
  hud();
  toast('NEW FIELD');
}
function syncUI() {
  $$('.choice[data-mode]').forEach(b =>
    b.classList.toggle('active', b.dataset.mode === prefs.mode)
  );
  $$('.choice[data-surface]').forEach(b =>
    b.classList.toggle('active', b.dataset.surface === prefs.surface)
  );
  $('#modeDesc').textContent = MODE_DESC[prefs.mode];
  $('#scopeSection').hidden = prefs.mode !== 'SCALE';
  $$('.choice[data-world]').forEach(b =>
    b.classList.toggle('active', b.dataset.world === prefs.world)
  );
  $('#worldDesc').textContent = world().desc;
  $$('.choice[data-voice]').forEach(b => b.classList.toggle('active', b.dataset.voice === prefs.voice));
  $('#voiceDesc').textContent = voice().desc;
  $$('.choice[data-groove]').forEach(b => b.classList.toggle('active', b.dataset.groove === prefs.groove));
  $('#grooveDesc').textContent = groove().desc;
  $$('.choice[data-scope]').forEach(b => b.classList.toggle('active', b.dataset.scope === prefs.scope));
  $('#scopeDesc').textContent = scopeDef().desc;
  [
    ['vol', 'volume'],
    ['memory', 'memory'],
    ['motion', 'motion'],
  ].forEach(([id, k]) => {
    $('#' + id).value = Math.round(prefs[k] * 100);
    $('#' + id + 'V').textContent = Math.round(prefs[k] * 100);
  });
  renderScore();
  $('#hapticBtn').textContent = prefs.haptic ? 'HAPTIC ON' : 'HAPTIC OFF';
  $('#quietBtn').textContent = prefs.quiet ? 'VISUAL QUIET' : 'VISUAL FULL';
  hud();
}
function setMode(m) {
  if(demo.on)stopDemo(true);
  prefs.mode = m;
  document.body.classList.toggle('duet',m==='DUET');
  emit('mode', { mode: m });
  syncUI();
  saveLocal();
}
function setWorld(w) {
  if(demo.on)stopDemo(true);
  prefs.world = w; applyWorldAudio(); emit('world', { world: w }); syncUI(); saveLocal(); toast(w);
}
function setVoice(v) { if(demo.on)stopDemo(true); prefs.voice=v; applyWorldAudio(); emit('voice',{voice:v}); syncUI(); saveLocal(); toast(v); }
function setGroove(v) { if(demo.on)stopDemo(true); prefs.groove=v; emit('groove',{groove:v}); syncUI(); saveLocal(); toast(v); }
function setScope(v) { if(demo.on)stopDemo(true); prefs.scope=v; emit('scope',{scope:v}); syncUI(); saveLocal(); toast(v); }
function setMenuPane(v){ $('#drawer').dataset.pane=v; $$('#menuTabs [data-pane]').forEach(b=>b.classList.toggle('active',b.dataset.pane===v)); }
function openDrawer() {
  $('#drawer').classList.add('open');
  renderSaves();
}
function closeDrawer() {
  $('#drawer').classList.remove('open');
}
Object.keys(WORLDS).forEach(k => {
  let b=document.createElement('button'); b.className='choice'; b.dataset.world=k; b.textContent=k; b.onclick=()=>setWorld(k); $('#worldChoices').appendChild(b);
});
Object.keys(VOICES).forEach(k=>{let b=document.createElement('button');b.className='choice';b.dataset.voice=k;b.textContent=k;b.onclick=()=>setVoice(k);$('#voiceChoices').appendChild(b)});
Object.keys(GROOVES).forEach(k=>{let b=document.createElement('button');b.className='choice';b.dataset.groove=k;b.textContent=k;b.onclick=()=>setGroove(k);$('#grooveChoices').appendChild(b)});
Object.keys(SCOPES).forEach(k=>{let b=document.createElement('button');b.className='choice';b.dataset.scope=k;b.textContent=k;b.onclick=()=>setScope(k);$('#scopeChoices').appendChild(b)});
$$('#menuTabs [data-pane]').forEach(b=>b.onclick=()=>setMenuPane(b.dataset.pane));
$$('.choice[data-mode]').forEach(
  b => (b.onclick = () => setMode(b.dataset.mode))
);
$$('.choice[data-surface]').forEach(
  b =>
    (b.onclick = () => {
      prefs.surface = b.dataset.surface;
      syncUI();
      saveLocal();
      toast(b.dataset.surface);
    })
);
$('#menuBtn').onclick = openDrawer;
$('#closeMenu').onclick = closeDrawer;
$('#drawer').onclick = e => {
  if (e.target === $('#drawer')) closeDrawer();
};
$('#helpBtn').onclick = () => $('#help').classList.add('show');
$('#backBtn').onclick = () => $('#help').classList.remove('show');
$('#soundBtn').onclick = async () => {
  if (!audio) {
    let ok = await initSound();
    if (ok) {
      soundOn = true;
      soundCheck();
    }
  } else toggleSound();
};
$('#demoBtn').onclick = () => { if (demo.on) stopDemo(true); else startDemo(true,true); };
$('#shareBtn').onclick = shareNow;
$('#copyBtn').onclick = copyCode;
$('#exportBtn').onclick = exportPacket;
$('#saveBtn').onclick = saveCassette;
$('#importBtn').onclick = importCode;
$('#newBtn').onclick = () => {
  let b = $('#newBtn'),
    now = Date.now();
  if (now > resetArm) {
    resetArm = now + 4200;
    b.textContent = 'CONFIRM NEW';
    toast('PRESS AGAIN TO RESET');
    return;
  }
  resetArm = 0;
  b.textContent = 'NEW FIELD';
  newField();
  closeDrawer();
};
$('#hapticBtn').onclick = () => {
  prefs.haptic = !prefs.haptic;
  syncUI();
  saveLocal();
};
$('#quietBtn').onclick = () => {
  prefs.quiet = !prefs.quiet;
  syncUI();
  saveLocal();
};
[
  ['vol', 'volume'],
  ['memory', 'memory'],
  ['motion', 'motion'],
].forEach(
  ([id, k]) =>
    ($('#' + id).oninput = e => {
      prefs[k] = +e.target.value / 100;
      $('#' + id + 'V').textContent = e.target.value;
      saveLocal();
    })
);
$('#playBtn').onclick = async () => {
  if (demo.on) stopDemo(false);
  await initSound();
  $('#intro').style.display = 'none';
  run = true;
  soundCheck();
  hud();
};
$('#buildInfo').textContent =
  `BUILD ${APP_VERSION} · WORLD × VOICE × GROOVE · SCALE mode · bounded phrase return`;
let fromHash = false;
if (location.hash.startsWith('#s=')) {
  try {
    fromHash = restore(b64dec(location.hash.slice(3)));
  } catch (e) {}
}
if (!fromHash) loadLocal();
if (!phrasePlan?.length) beginPhrase(['BLOOM', 'FOLD', 'SPLIT', 'RETURN']);
setMenuPane('PLAY');
syncUI();
renderSaves();
hud();
setTimeout(()=>{if($('#intro')?.style.display!=='none'&&!demo.on)startDemo(true,false)},700);
window.FoldBloom = {
  version: APP_VERSION,
  state: () => minimalSnapshot(),
  setMode,
  setWorld,
  setVoice,
  setGroove,
  setScope,
  setPulseLink,
  updatePulseContext,
  pulseState: () => ({ ...pulseLink, active: pulseIsLive(), tempo: pulseTempo() }),
  startIdle: () => startDemo(true,true),
  stopIdle: takeover => stopDemo(takeover!==false),
  subscribeEvents: fn => {
    if (typeof fn !== 'function') return () => {};
    fieldEventListeners.add(fn);
    return () => fieldEventListeners.delete(fn);
  },
};
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol))
  window.addEventListener('load', () =>
    navigator.serviceWorker.register('./sw.js').catch(() => {})
  );
