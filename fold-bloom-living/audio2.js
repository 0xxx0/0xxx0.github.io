function scheduler() {
  if (!audio || audio.state !== 'running' || !soundOn) return;
  while (mus.next < audio.currentTime + 0.12) {
    let stepDur = 60 / currentBpm() / 4,
      swing = world().sync * 0.18 + form.sync * 0.08,
      when = mus.next + (mus.step % 2 ? stepDur * swing : 0);
    musicStep(mus.step, when);
    mus.step = (mus.step + 1) % 16;
    if (mus.step === 0) {
      pat.cycle++;
      $('#lawStrip').textContent =
        `${pat.law.toUpperCase()} · ${patternLabel()}`;
    }
    mus.next += stepDur;
  }
}
function startMusic() {
  liveStart();
  if (mus.timer) return;
  mus.next = audio.currentTime + 0.08;
  mus.timer = setInterval(scheduler, 25);
}
function transformMusic(v, special, power = 1) {
  if (v === 'BLOOM') {
    mus.energy = Math.min(0.95, mus.energy + 0.035 + 0.035 * power);
    mus.density = Math.min(0.88, mus.density + 0.025 + 0.028 * power);
    mus.voices = Math.min(4, mus.voices + (power > 1 ? 1 : 0));
  }
  if (v === 'SPLIT')
    mus.density = Math.min(0.92, mus.density + 0.05 + 0.045 * power);
  if (v === 'FOLD' && power > 1)
    mus.energy = Math.min(0.92, mus.energy + 0.025 * power);
  if (v === 'RETURN') {
    mus.energy = Math.max(0.18, mus.energy - (0.1 + 0.06 * power));
    mus.density = Math.max(0.16, mus.density - (0.08 + 0.045 * power));
    mus.voices = 3;
  }
  if (special) {
    mus.energy = Math.min(1, mus.energy + 0.16);
    mus.density = Math.min(0.94, mus.density + 0.12);
  }
}
function liveStart() {
  if (dL || !audio) return;
  dL = audio.createOscillator();
  dR = audio.createOscillator();
  gL = audio.createGain();
  gR = audio.createGain();
  dL.type = world().bass;
  dR.type = world().body;
  gL.gain.value = 0.002;
  gR.gain.value = 0.002;
  dL.connect(gL);
  dR.connect(gR);
  gL.connect(master);
  gR.connect(master);
  dL.start();
  dR.start();
}
function liveUpdate() {
  if (!audio || audio.state !== 'running' || !dL) return;
  let n = audio.currentTime,
    spd =
      Math.min(1, (Math.abs(live.vL) + Math.abs(live.vR)) * 0.5) * prefs.motion;
  dL.frequency.setTargetAtTime(mhz(degreeMidi(rawL)), n, 0.025);
  dR.frequency.setTargetAtTime(mhz(degreeMidi(rawR) + 12), n, 0.025);
  gL.gain.setTargetAtTime(soundOn ? 0.002 + spd * 0.015 : 0, n, 0.035);
  gR.gain.setTargetAtTime(soundOn ? 0.002 + spd * 0.012 : 0, n, 0.035);
  if (filter)
    filter.frequency.setTargetAtTime(
      world().cut * (0.72 + spd * 0.62),
      n,
      0.05
    );
}
function chord(v) {
  if (!audio || !soundOn) return;
  let w = world(),
    map = {
      BLOOM: [0, 2, 4],
      FOLD: [0, 2, 5],
      SPLIT: [0, 1, 3],
      RETURN: [0, 2, 4, 6],
    },
    q = map[v],
    n = audio.currentTime + 0.015;
  q.forEach((off, i) => {
    let idx = R + off,
      oct = Math.floor(idx / 6) * 12,
      pc = w.scale[wrap(idx, 6)];
    tone(
      w.root + 12 + pc + oct,
      n + i * 0.028,
      0.34,
      0.04,
      i % 2 ? w.lead : w.body,
      w.cut
    );
  });
}
function softCurve(amount = 1.25) {
  return Float32Array.from({ length: 512 }, (_, i) =>
    Math.tanh(((i / 511) * 2 - 1) * amount)
  );
}
function impulse(ctx, seconds = 1.65, decay = 2.7) {
  let len = Math.floor(ctx.sampleRate * seconds),
    b = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    let d = b.getChannelData(c);
    for (let i = 0; i < len; i++)
      d[i] = (rng() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return b;
}
async function initSound() {
  try {
    if (!audio) {
      let AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) {
        $('#soundBtn').textContent = 'NO AUDIO';
        return false;
      }
      audio = new AC();
      master = audio.createGain();
      filter = audio.createBiquadFilter();
      saturator = audio.createWaveShaper();
      comp = audio.createDynamicsCompressor();
      delay = audio.createDelay(0.8);
      feedback = audio.createGain();
      reverb = audio.createConvolver();
      wet = audio.createGain();
      master.gain.value = prefs.volume * OUT_GAIN;
      filter.type = 'lowpass';
      filter.frequency.value = world().cut;
      saturator.curve = softCurve(1.35);
      saturator.oversample = '2x';
      comp.threshold.value = -10;
      comp.knee.value = 8;
      comp.ratio.value = 10;
      comp.attack.value = 0.003;
      comp.release.value = 0.22;
      delay.delayTime.value = 0.285;
      feedback.gain.value = world().delay;
      reverb.buffer = impulse(audio);
      wet.gain.value = 0.13;
      master.connect(filter);
      filter.connect(saturator);
      saturator.connect(comp);
      filter.connect(delay);
      delay.connect(feedback);
      feedback.connect(comp);
      filter.connect(reverb);
      reverb.connect(wet);
      wet.connect(comp);
      comp.connect(audio.destination);
    }
    if (audio.state !== 'running') await audio.resume();
    applyWorldAudio();
    startMusic();
    return true;
  } catch (e) {
    console.warn(e);
    return false;
  }
}
function applyWorldAudio() {
  if (master)
    master.gain.setTargetAtTime(
      prefs.volume * OUT_GAIN,
      audio.currentTime,
      0.04
    );
  if (filter)
    filter.frequency.setTargetAtTime(world().cut, audio.currentTime, 0.08);
  if (feedback)
    feedback.gain.setTargetAtTime(world().delay, audio.currentTime, 0.08);
  if (wet)
    wet.gain.setTargetAtTime(
      prefs.world === 'STILL'
        ? 0.18
        : prefs.world === 'GLASS'
          ? 0.16
          : prefs.world === 'STRANGE'
            ? 0.15
            : 0.11,
      audio.currentTime,
      0.12
    );
  if (dL) {
    dL.type = world().bass;
    dR.type = world().body;
  }
  form.sync = Math.max(world().sync, Math.min(form.sync, 0.62));
  liveUpdate();
}
function soundCheck() {
  if (!audio) return;
  let n = audio.currentTime + 0.02;
  [0, 2, 4].forEach((d, i) =>
    tone(
      world().root + world().scale[d],
      n + i * 0.07,
      0.25,
      0.04,
      world().lead,
      world().cut
    )
  );
}
function toggleSound() {
  soundOn = !soundOn;
  $('#soundBtn').setAttribute('aria-pressed', String(soundOn));
  $('#soundBtn').textContent = soundOn ? 'SOUND' : 'MUTED';
  if (master && audio)
    master.gain.setTargetAtTime(
      soundOn ? prefs.volume * OUT_GAIN : 0,
      audio.currentTime,
      0.05
    );
  emit('sound', { on: soundOn });
}
const DEMO_OFFSETS = { BLOOM: [0], FOLD: [1, 5], RETURN: [2, 4], SPLIT: [3] };
function animateDemoTo(l, r, done) {
  let aL = rawL,
    aR = rawR,
    dLx = circularDelta(l, aL, 6),
    dRx = circularDelta(r, aR, 6),
    start = performance.now(),
    dur = 620;
  function tick(now) {
    if (!demo.on) return;
    let u = clamp((now - start) / dur, 0, 1),
      ease = 1 - Math.pow(1 - u, 3);
    rawL = wrap(aL + dLx * ease, 6);
    rawR = wrap(aR + dRx * ease, 6);
    L = wrap(Math.round(rawL), 6);
    R = wrap(Math.round(rawR), 6);
    live.vL = Math.sign(dLx) * (1 - u) * 0.75;
    live.vR = Math.sign(dRx) * (1 - u) * 0.75;
    classifyMotion();
    liveUpdate();
    updatePreview();
    hud();
    if (u < 1) demo.raf = requestAnimationFrame(tick);
    else {
      live.vL = live.vR = 0;
      classifyMotion();
      liveUpdate();
      done?.();
    }
  }
  demo.raf = requestAnimationFrame(tick);
}
function demoStep() {
  if (!demo.on) return;
  let v = requestVerb,
    opts = DEMO_OFFSETS[v],
    base = demo.i++ % 6,
    d = opts[demo.i % opts.length],
    q = { l: base, r: wrap(base + d, 6) };
  animateDemoTo(q.l, q.r, () => {
    if (!demo.on) return;
    commit();
    demo.timer = setTimeout(demoStep, 980);
  });
}
async function startDemo() {
  if (demo.on) return stopDemo(false);
  let ok = await initSound();
  if (!ok) return;
  demo.on = true;
  demo.i = 0;
  demo.prevMode = prefs.mode;
  prefs.mode = 'PLAY';
  $('#demoBtn').textContent = 'STOP DEMO';
  syncUI();
  closeDrawer();
  toast('DEMO · WATCH THE SCORE');
  demoStep();
}
function stopDemo(takeover = true) {
  if (!demo.on) return;
  demo.on = false;
  clearTimeout(demo.timer);
  cancelAnimationFrame(demo.raf);
  prefs.mode = demo.prevMode;
  live.vL = live.vR = 0;
  classifyMotion();
  syncUI();
  $('#demoBtn').textContent = 'START DEMO';
  if (takeover) toast('YOUR TURN');
}
