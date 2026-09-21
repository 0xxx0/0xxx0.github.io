function dial(C, v, raw, labels, col, scars) {
  g.save();
  g.translate(C.x, C.y);
  for (let k = 0; k < 6; k++) {
    let a = -Math.PI / 2 + (k * TAU) / 6,
      on = k === v,
      sc = scars[k];
    g.strokeStyle = on
      ? col
      : `rgba(140,180,205,${0.12 + Math.min(0.36, sc * 0.052)})`;
    g.lineWidth = on ? 3 : 1 + Math.min(3.5, sc * 0.32);
    g.beginPath();
    g.arc(0, 0, C.r * 0.85, a - 0.35, a + 0.35);
    g.stroke();
    g.fillStyle = on ? '#fff' : '#7890a2';
    g.font =
      (on ? '700 ' : '400 ') + Math.max(12, C.r * 0.14) + 'px ui-monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(labels[k], Math.cos(a) * C.r * 0.7, Math.sin(a) * C.r * 0.7);
  }
  g.strokeStyle = 'rgba(150,190,215,.2)';
  g.lineWidth = 1;
  g.beginPath();
  g.arc(0, 0, C.r * 0.48, 0, TAU);
  g.stroke();
  g.fillStyle = col;
  g.shadowBlur = 20;
  g.shadowColor = col;
  g.beginPath();
  g.arc(0, 0, C.r * 0.095, 0, TAU);
  g.fill();
  g.shadowBlur = 0;
  g.fillStyle = '#061018';
  g.font = '800 ' + Math.max(12, C.r * 0.13) + 'px ui-monospace';
  g.fillText(labels[v], 0, 1);
  let a = -Math.PI / 2 + (raw * TAU) / 6;
  g.strokeStyle = col;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(Math.cos(a) * C.r * 0.17, Math.sin(a) * C.r * 0.17);
  g.lineTo(Math.cos(a) * C.r * 0.43, Math.sin(a) * C.r * 0.43);
  g.stroke();
  g.restore();
}
function targetMarks(C) {
  if (prefs.mode === 'OPEN') return;
  let ds =
      requestVerb === 'BLOOM'
        ? [0]
        : requestVerb === 'FOLD'
          ? [1, 5]
          : requestVerb === 'RETURN'
            ? [2, 4]
            : [3],
    col = colors(requestVerb);
  g.save();
  g.globalAlpha = 0.2;
  g.strokeStyle = col;
  g.lineWidth = 2;
  ds.forEach(d => {
    let k = wrap(L + d, 6),
      a = -Math.PI / 2 + (k * TAU) / 6,
      x = C[1].x + Math.cos(a) * C[1].r * 0.99,
      y = C[1].y + Math.sin(a) * C[1].r * 0.99;
    g.beginPath();
    g.arc(x, y, 7, 0, TAU);
    g.stroke();
  });
  g.restore();
}
function bridge(C) {
  let v = rel(),
    c = colors(v),
    phase = ((rawL - rawR) * TAU) / 6,
    amp = 9 + 30 * Math.abs(Math.sin(phase)),
    cx = W / 2,
    cy = H * 0.55;
  g.save();
  for (let n = 0; n < 2; n++) {
    g.strokeStyle = c;
    g.globalAlpha = v === 'RETURN' ? 0.12 : 0.18;
    g.lineWidth = 1;
    g.beginPath();
    for (let i = 0; i <= 36; i++) {
      let u = i / 36,
        x =
          C[0].x +
          C[0].r * 0.17 +
          (C[1].x - C[1].r * 0.17 - C[0].x - C[0].r * 0.17) * u,
        y =
          cy +
          Math.sin(u * TAU + phase + n * Math.PI) * amp * Math.sin(u * Math.PI);
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke();
  }
  g.globalAlpha = 0.78;
  g.strokeStyle = c;
  g.lineWidth = 2.2;
  if (v === 'BLOOM') {
    g.beginPath();
    g.moveTo(C[0].x + C[0].r * 0.16, C[0].y);
    g.bezierCurveTo(
      W * 0.43,
      H * 0.48,
      W * 0.57,
      H * 0.48,
      C[1].x - C[1].r * 0.16,
      C[1].y
    );
    g.stroke();
    for (let i = 0; i < 5; i++) {
      let a = -Math.PI / 2 + (i * TAU) / 5,
        r = 16 + 5 * Math.sin(t * 2 + i);
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      g.stroke();
    }
  } else if (v === 'FOLD') {
    for (let q of [-1, 1]) {
      g.beginPath();
      g.moveTo(C[0].x + C[0].r * 0.16, C[0].y);
      g.quadraticCurveTo(cx, cy + q * 34, C[1].x - C[1].r * 0.16, C[1].y);
      g.stroke();
    }
  } else if (v === 'SPLIT') {
    for (let q of [-1, 1]) {
      g.beginPath();
      g.moveTo(C[0].x + C[0].r * 0.16, C[0].y);
      g.bezierCurveTo(
        W * 0.42,
        cy + q * 42,
        W * 0.58,
        cy + q * 42,
        C[1].x - C[1].r * 0.16,
        C[1].y
      );
      g.stroke();
    }
  } else {
    g.beginPath();
    g.moveTo(C[0].x + C[0].r * 0.16, C[0].y);
    g.bezierCurveTo(
      W * 0.42,
      cy - 44,
      W * 0.58,
      cy - 44,
      C[1].x - C[1].r * 0.16,
      C[1].y
    );
    g.stroke();
    g.globalAlpha = 0.32;
    g.beginPath();
    g.arc(cx, cy, 18, phase, phase + TAU * 1.55);
    g.stroke();
  }
  g.globalAlpha = 1;
  g.fillStyle = c;
  g.font = '800 10px ui-monospace';
  g.textAlign = 'center';
  g.fillText(v, cx, cy + 3);
  g.restore();
}
function queueDraw() {
  if (prefs.mode === 'OPEN') return;
  let cx = W / 2,
    y = H * 0.19,
    c = colors(requestVerb);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.strokeStyle = c;
  g.globalAlpha = 0.5;
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(cx, y, 22 + 2 * Math.sin(t * 3), 0, TAU);
  g.stroke();
  g.globalAlpha = 1;
  g.fillStyle = c;
  g.font = '800 16px ui-monospace';
  g.fillText(VG[requestVerb], cx, y - 1);
  g.fillStyle = '#eaf7ff';
  g.font = '800 8px ui-monospace';
  g.fillText('MAKE ' + requestVerb, cx, y + 34);
  g.globalAlpha = 0.28;
  g.fillStyle = colors(nextVerb);
  g.font = '700 8px ui-monospace';
  g.fillText('NEXT ' + VG[nextVerb] + ' ' + nextVerb, cx, y - 40);
  g.globalAlpha = 1;
  if (splitCharge) {
    g.fillStyle = '#ff8da1';
    g.fillText('CHARGED', cx, y + 50);
  }
}
function forecastLens() {
  updatePreview();
  let cx = W / 2,
    cy = H * 0.67,
    c = colors(preview.v),
    match = prefs.mode === 'OPEN' || preview.v === requestVerb;
  g.save();
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.globalAlpha = match ? 0.9 : 0.28;
  g.fillStyle = match ? c : '#718794';
  g.font = '800 9px ui-monospace';
  g.fillText(preview.label, cx, cy);
  for (let i = 0; i < 3; i++) {
    g.globalAlpha = i < preview.power ? 0.78 : 0.12;
    g.fillStyle = c;
    g.beginPath();
    g.arc(cx + (i - 1) * 12, cy + 15, 2.2, 0, TAU);
    g.fill();
  }
  g.restore();
}
function formArc() {
  let cx = W / 2,
    cy = H * 0.55,
    r = Math.min(W, H) * 0.235,
    a0 = -Math.PI * 0.72,
    a1 = a0 + Math.PI * 1.44 * form.tension;
  g.strokeStyle = 'rgba(255,215,140,.18)';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(cx, cy, r, a0, a1);
  g.stroke();
}
function memoryHalo() {
  let cx = W / 2,
    cy = H * 0.55,
    r = Math.min(W, H) * 0.19;
  for (let i = 0; i < 16; i++) {
    let q = phrase[i];
    if (q.w < 0.05) continue;
    let a = -Math.PI / 2 + (i * TAU) / 16,
      x = cx + Math.cos(a) * r,
      y = cy + Math.sin(a) * r;
    g.globalAlpha = 0.1 + 0.3 * q.w * prefs.memory;
    g.fillStyle =
      q.verb === 'SPLIT'
        ? '#ff8da1'
        : q.verb === 'RETURN'
          ? '#a8ffd4'
          : '#dff5ff';
    g.beginPath();
    g.arc(x, y, 1.4 + 3 * q.w, 0, TAU);
    g.fill();
  }
  g.globalAlpha = 1;
}
function fx() {
  if (prefs.quiet) {
    particles.length = Math.min(particles.length, 12);
    waves.length = Math.min(waves.length, 2);
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.a -= 0.024;
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.98;
    p.vy *= 0.98;
    if (p.a <= 0) {
      particles.splice(i, 1);
      continue;
    }
    g.globalAlpha = p.a;
    g.fillStyle = p.c;
    g.beginPath();
    g.arc(p.x, p.y, 2 + p.a * 3, 0, TAU);
    g.fill();
  }
  g.globalAlpha = 1;
  for (let i = waves.length - 1; i >= 0; i--) {
    let q = waves[i];
    q.a -= 0.024;
    q.r += 4;
    if (q.a <= 0) {
      waves.splice(i, 1);
      continue;
    }
    g.strokeStyle = `rgba(255,255,255,${q.a * 0.35})`;
    g.beginPath();
    g.arc(W / 2, H * 0.55, q.r, 0, TAU);
    g.stroke();
  }
}
function frame() {
  t += 0.016;
  document.body.classList.toggle('duet', prefs.mode === 'DUET');
  let bg = g.createRadialGradient(
      W / 2,
      H * 0.52,
      0,
      W / 2,
      H * 0.52,
      Math.max(W, H) * 0.72
    ),
    inner =
      prefs.surface === 'QUIET'
        ? '#0a1217'
        : prefs.surface === 'TRACE'
          ? '#0b2030'
          : prefs.world === 'STRANGE'
            ? '#20182b'
            : prefs.world === 'GLASS'
              ? '#112b32'
              : '#102431';
  bg.addColorStop(0, inner);
  bg.addColorStop(1, '#050b10');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  let C = centers();
  if (prefs.surface !== 'QUIET') {
    formArc();
    memoryHalo();
  }
  bridge(C);
  forecastLens();
  dial(C[0], L, rawL, M, '#77d7ff', scarsL);
  dial(C[1], R, rawR, HARM, '#ffd56b', scarsR);
  targetMarks(C);
  queueDraw();
  fx();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
function rawFromPoint(side, x, y) {
  let C = centers()[side],
    a = Math.atan2(y - C.y, x - C.x) + Math.PI / 2;
  return wrap((a / TAU) * 6, 6);
}
function circularDelta(a, b, n = 6) {
  let d = (a - b) % n;
  if (d > n / 2) d -= n;
  if (d < -n / 2) d += n;
  return d;
}
function dialSide(x, y) {
  let C = centers();
  return Math.hypot(x - C[0].x, y - C[0].y) < Math.hypot(x - C[1].x, y - C[1].y)
    ? 0
    : 1;
}
function pointerMove(e) {
  let p = pointers.get(e.pointerId);
  if (!p) return;
  let raw = rawFromPoint(p.side, e.clientX, e.clientY),
    now = performance.now(),
    dt = Math.max(8, now - p.t),
    dv = (circularDelta(raw, p.raw || raw, 6) / dt) * 120;
  p.raw = raw;
  p.t = now;
  let k = wrap(Math.round(raw), 6),
    old = p.side ? R : L,
    delta = circularDelta(k, old, 6);
  if (p.side === 0) {
    rawL = raw;
    live.vL = clamp(dv, -1, 1);
    if (delta) {
      L = k;
      scarsL[L] = Math.min(9, scarsL[L] + 0.03);
      buzz();
    }
  } else {
    rawR = raw;
    live.vR = clamp(dv, -1, 1);
    if (delta) {
      R = k;
      scarsR[R] = Math.min(9, scarsR[R] + 0.03);
      buzz();
    }
  }
  classifyMotion();
  liveUpdate();
  updatePreview();
  hud();
}
function classifyMotion() {
  let a = Math.sign(live.vL),
    b = Math.sign(live.vR);
  live.mode =
    a && b ? (a === b ? 'PARALLEL' : 'COUNTER') : a || b ? 'ANCHOR' : 'STILL';
}
cv.onpointerdown = e => {
  if (!run) return;
  if (demo.on) stopDemo(true);
  e.preventDefault();
  let side = dialSide(e.clientX, e.clientY),
    raw = rawFromPoint(side, e.clientX, e.clientY);
  pointers.set(e.pointerId, { side, raw, t: performance.now() });
  cv.setPointerCapture?.(e.pointerId);
  pointerMove(e);
};
cv.onpointermove = e => {
  if (pointers.has(e.pointerId)) {
    e.preventDefault();
    pointerMove(e);
  }
};
cv.onpointerup = e => {
  if (!pointers.has(e.pointerId)) return;
  e.preventDefault();
  pointers.delete(e.pointerId);
  if (!pointers.size) {
    live.vL = live.vR = 0;
    classifyMotion();
    liveUpdate();
    commit();
  }
};
cv.onpointercancel = e => pointers.delete(e.pointerId);
function burst(v) {
  let c = colors(v),
    base = prefs.surface === 'QUIET' ? 4 : prefs.surface === 'TRACE' ? 14 : 25,
    n = prefs.quiet ? Math.ceil(base * 0.4) : base;
  for (let i = 0; i < n; i++) {
    let a = rng() * TAU,
      s = 1 + rng() * 5;
    particles.push({
      x: W / 2,
      y: H * 0.55,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      a: 0.55 + rng() * 0.4,
      c,
    });
  }
  waves.push({ r: 8, a: 1 });
}
function captureMotif() {
  let recent = [];
  for (let i = 0; i < 6; i++) {
    let q = phrase[wrap(learnCursor - 1 - i, 16)];
    if (q.w > 0.1) recent.unshift({ m: q.m, h: q.h, v: q.verb });
  }
  if (recent.length < 3) return;
  let sig = recent
      .slice(-4)
      .map(q => `${q.m}${q.h}${q.v[0]}`)
      .join('|'),
    old = form.motif.map(q => `${q.m}${q.h}${q.v[0]}`).join('|');
  if (sig !== old) {
    form.lastMotif = form.motif;
    form.motif = recent.slice(-4);
    emit('motif', { sig });
  }
}
function advanceForm(v, power = 1) {
  form.bars++;
  if (v === 'SPLIT') {
    form.tension = Math.min(1, form.tension + 0.16 + 0.07 * power);
    form.sync = Math.min(0.62, form.sync + 0.04 + 0.035 * power);
  } else if (v === 'FOLD')
    form.tension = Math.min(1, form.tension + 0.07 + 0.05 * power);
  else if (v === 'BLOOM')
    form.tension = Math.max(0, form.tension - 0.025 * power);
  else if (v === 'RETURN') {
    form.tension = Math.max(0, form.tension - (0.26 + 0.14 * power));
    form.sync = Math.max(world().sync, form.sync - (0.08 + 0.06 * power));
    form.cadence = Math.max(form.cadence, power);
  }
  form.state =
    form.tension < 0.18
      ? 'GROUND'
      : form.tension < 0.42
        ? 'OPEN'
        : form.tension < 0.7
          ? 'DEVELOP'
          : 'TENSION';
  if (v === 'RETURN') form.state = 'RETURN';
  captureMotif();
}
function commit() {
  let original = rel(),
    requested = requestVerb,
    c = consequence(),
    power = c.power,
    echoBefore = c.echo,
    learned = phrase[learnCursor];
  learned.m = L;
  learned.h = R;
  learned.w = Math.min(1, learned.w + (0.22 + 0.12 * power) * prefs.memory);
  learned.verb = original;
  learnCursor = (learnCursor + 1) % 16;
  let special = splitCharge && original === 'FOLD';
  pairMemory[L][R] = Math.min(9, pairMemory[L][R] + 1);
  scarsL[L] = Math.min(9, scarsL[L] + 0.6 + 0.35 * power);
  scarsR[R] = Math.min(9, scarsR[R] + 0.6 + 0.35 * power);
  burst(original);
  chord(original);
  if (prefs.mode === 'SCALE') {
    if (prefs.scope === 'PULSE') applyPatternVerb(original, power);
    else if (prefs.scope === 'VOICE') transformMusic(original, false, power);
    else if (prefs.scope === 'MOTIF') applyMemoryVerb(original, power);
    else if (prefs.scope === 'FORM') { transformMusic(original, false, Math.max(1,power-1)); advanceForm(original, power); }
  } else {
    applyPatternVerb(original, power);
    transformMusic(original, false, power);
    advanceForm(original, power);
    applyMemoryVerb(original, power);
  }
  if (echoBefore > 0 && audio && soundOn) {
    let n = audio.currentTime + 0.12;
    pluck(
      pairMidi(L, R),
      n,
      Math.min(1, 0.35 + echoBefore * 0.08),
      R < 3 ? -0.28 : 0.28
    );
  }
  if (special) {
    splitCharge = 0;
    setTimeout(() => {
      chord('BLOOM');
      if (prefs.mode === 'SCALE') {
        if (prefs.scope === 'PULSE') applyPatternVerb('BLOOM',1);
        else if (prefs.scope === 'VOICE') transformMusic('BLOOM',true,1);
        else if (prefs.scope === 'MOTIF') applyMemoryVerb('BLOOM',1);
        else if (prefs.scope === 'FORM') { transformMusic('BLOOM',true,1); advanceForm('BLOOM',1); }
      } else {
        applyPatternVerb('BLOOM', 1);
        transformMusic('BLOOM', true, 1);
        advanceForm('BLOOM', 1);
        applyMemoryVerb('BLOOM', 1);
      }
      burst('BLOOM');
      emit('compose', { ops: ['FOLD', 'BLOOM'] });
      saveLocal();
      hud();
    }, 90);
  }
  if (original === 'SPLIT') splitCharge = 1;
  if (original === 'RETURN') {
    let reduction = 0.65 + 0.35 * power;
    scarsL = scarsL.map(x => Math.max(0, x - reduction));
    scarsR = scarsR.map(x => Math.max(0, x - reduction));
  }
  let matched = prefs.mode !== 'OPEN' && original === requested;
  if (matched) {
    fulfilled++;
    currentPhraseMoves.push({
      l: L,
      r: R,
      v: original,
      power,
      echo: echoBefore,
      gravity: c.gravity,
    });
    phrasePos++;
    if (phrasePos >= phrasePlan.length) completePhrase();
    else {
      requestVerb = phrasePlan[phrasePos];
      nextVerb = phrasePlan[(phrasePos + 1) % phrasePlan.length];
      renderScore();
      buzz();
      setTimeout(buzz, 55);
      toast(
        special ? 'RETURNED · FOLD→BLOOM' : `RETURNED · ${original} ×${power}`
      );
    }
  } else toast(special ? 'FOLD→BLOOM' : `${original} ×${power}`);
  emit('commit', {
    v: original,
    power,
    matched,
    L,
    R,
    mode: prefs.mode,
    form: form.state,
    world: prefs.world,
    voice: prefs.voice,
    groove: prefs.groove,
    scope: prefs.mode === 'SCALE' ? prefs.scope : 'ALL',
    request: requested,
    phrase: phraseCount + 1,
    phrasePos,
  });
  updatePreview();
  saveLocal();
  hud();
}
function toast(v) {
  let z = $('#toast');
  z.textContent = v;
  z.style.color = colors(v) || '#fff';
  z.classList.add('on');
  setTimeout(() => z.classList.remove('on'), 420);
}
function buzz() {
  if (demo?.preview || !prefs.haptic) return;
  try {
    navigator.vibrate?.(5);
  } catch (e) {}
}
function hud() {
  let commits = events.filter(e => e.type === 'commit').length,
    motifN = form.motif?.length || 0;
  $('#flow').textContent = prefs.mode === 'OPEN' ? commits : phraseCount;
  $('#chain').textContent = motifN;
  $('#verb').textContent =
    prefs.mode === 'OPEN' ? rel() : `MAKE ${requestVerb}`;
  const pulseWitness = pulseIsLive()
    ? ` · PULSE ${Math.round(pulseTempo())}`
    : prefs.pulseLink ? ' · PULSE WAIT' : '';
  $('#future').textContent =
    (live.mode === 'STILL' ? 'FIELD' : live.mode) +
    (splitCharge ? ' · CHARGED' : '') +
    ` · ${form.state} · ${prefs.world} · ${prefs.voice}${prefs.mode === 'SCALE' ? ' · '+prefs.scope : ''}${pulseWitness}`;
  $('#leftHud').firstChild.textContent =
    prefs.mode === 'OPEN' ? 'MOVES ' : 'PHRASES ';
  $('#rightHud').firstChild.textContent = 'MOTIF ';
  renderScore();
}
