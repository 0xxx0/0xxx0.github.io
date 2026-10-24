/* global MoireAmbient, SleeperLadderCore */
// ladder.js — SLEEPER // LADDER, the instrument. Four distances over ONE field:
//
//   FAR      the painting, whole, at rest
//   NEAR     the same frame at character resolution: luminance -> elevation,
//            the painting's own edges -> walls, hue -> district, texture ->
//            windows and rain; tap-and-hold makes the characters move
//   ENTERED  a walkable window of that field, matter carried in from the
//            canonical contract (paragraph=district, sentence=building,
//            word=room, character=material, punctuation=weather); swipe or
//            arrow keys step; the walk is a compressed U/D/L/R witness
//   EXITED   the route recomposed into the painting — deterministic, and
//            returning restores the original bytes
//
// Determinism: no Math.random, no Date, no performance.now. Motion rides
// requestAnimationFrame timestamps and one-shot transitions only (P3: depth
// behind an explicit act, never ambient auto-play; reduced motion gets the
// depth with zero motion). Every drawn number is a real field of a real record.
(function () {
  'use strict';
  const C = window.SleeperLadderCore, MA = window.MoireAmbient;
  const RAMP = ' .·:-=+*#%@';                       // elevation ramp (floor glyphs)
  const PAINTING_SRC = '/sleeper/borrowed-river/landscape.jpg';
  const HOLD_MS = 420;                               // dwell that opens a decode
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const cv = document.getElementById('field');
  const ctx = cv.getContext('2d', { alpha: false });
  const el = {
    status: document.getElementById('status'), primary: document.getElementById('primary'),
    rail: document.getElementById('rail'), decode: document.getElementById('decode'),
    gap: document.getElementById('gap'), identity: document.getElementById('identity'),
    identityTag: document.getElementById('identity-tag'), headSub: document.getElementById('head-sub'),
  };
  const VERB = { FAR: 'Resolve', NEAR: 'Enter', ENTERED: 'Exit', EXITED: 'Return' };

  const S = {
    distance: 'FAR', moves: [], walker: null, field: null, parsed: null,
    rgba: null, iw: 0, ih: 0, img: null, ready: false, sourceError: null,
    decodeCell: null, hold: null, trans: null, exitCache: null, originRetrieved: false,
    identity: null, paintingTag: null, drag: null, holdTimer: 0, revealed: false,
  };
  let W = 0, H = 0, dpr = 1;

  // ── boot ──────────────────────────────────────────────────────────────────
  function loadImage() {
    return new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => rej(new Error('painting unavailable: ' + PAINTING_SRC));
      im.src = PAINTING_SRC;
    });
  }
  function loadSource() {
    return fetch(C.SOURCE_PATH).then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    });
  }
  const ready = Promise.all([loadImage(), loadSource()])
    .then(([img, text]) => {
      S.img = img; S.iw = img.naturalWidth; S.ih = img.naturalHeight;
      const off = document.createElement('canvas');
      off.width = S.iw; off.height = S.ih;
      const octx = off.getContext('2d', { willReadFrequently: true });
      octx.drawImage(img, 0, 0);
      S.rgba = octx.getImageData(0, 0, S.iw, S.ih).data;
      S.parsed = C.parseSource(text);
      S.field = C.buildField(S.rgba, S.iw, S.ih, text);
      S.walker = S.field.start;
      S.paintingTag = C.tag8(C.PAINTING_ID + C.PAINTING_SHA256);
      S.identity = MA.mount(el.identity, MA.fromState({ custom: MA.identity(identitySeed()) }));
      S.ready = true;
      fit(); updateChrome(); draw();
      return state();
    })
    .catch((err) => {
      S.sourceError = String(err && err.message || err);
      el.gap.style.display = 'block';
      el.gap.textContent = 'GAP — ' + S.sourceError + '. The ladder cannot resolve without its two sources; nothing is faked here.';
      el.primary.disabled = true;
      fit(); draw();
      return { error: S.sourceError };
    });

  function identitySeed() {
    return 'sleeper.ladder:' + S.paintingTag + ':' + routeSeedHex();
  }
  function routeSeedHex() {
    return ('00000000' + C.routeSeed(S.paintingTag || 'boot', S.moves).toString(16)).slice(-8);
  }

  // ── layout ────────────────────────────────────────────────────────────────
  function fit() {
    const r = cv.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    dpr = Math.min(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', () => { fit(); draw(); });

  // One geometry per distance: where the painting's own region sits, how big a
  // cell is, and which slice of the 96x32 grid is on screen.
  function geoFar(src) {
    const s = Math.min(W / S.iw, H / S.ih), w = S.iw * s, h = S.ih * s;
    return { src: { x: 0, y: 0, w: S.iw, h: S.ih }, dst: { x: (W - w) / 2, y: (H - h) / 2, w, h }, imgA: 1, glyphA: 0 };
  }
  function geoNear() {
    const cell = Math.max(6, Math.floor(Math.min(W / 46, H / 22)));
    const cols = Math.max(8, Math.min(C.COLS, Math.floor(W / cell)));
    const rows = Math.max(4, Math.min(C.ROWS, Math.floor(H / cell)));
    const ox = Math.floor((C.COLS - cols) / 2), oy = Math.floor((C.ROWS - rows) / 2);
    return {
      cell, win: { cols, rows, ox, oy }, kind: 'near',
      src: { x: ox * S.iw / C.COLS, y: oy * S.ih / C.ROWS, w: cols * S.iw / C.COLS, h: rows * S.ih / C.ROWS },
      dst: { x: Math.round((W - cols * cell) / 2), y: Math.round((H - rows * cell) / 2), w: cols * cell, h: rows * cell },
      imgA: 0, glyphA: 1,
    };
  }
  function geoEntered() {
    const cell = Math.max(18, Math.floor(Math.min(W / 11, H / 9)));
    const cols = Math.max(6, Math.min(C.COLS, Math.floor(W / cell)));
    const rows = Math.max(4, Math.min(C.ROWS, Math.floor(H / cell)));
    const ox = Math.max(0, Math.min(C.COLS - cols, S.walker.cx - Math.floor(cols / 2)));
    const oy = Math.max(0, Math.min(C.ROWS - rows, S.walker.cy - Math.floor(rows / 2)));
    return {
      cell, win: { cols, rows, ox, oy }, kind: 'entered',
      src: { x: ox * S.iw / C.COLS, y: oy * S.ih / C.ROWS, w: cols * S.iw / C.COLS, h: rows * S.ih / C.ROWS },
      dst: { x: Math.round((W - cols * cell) / 2), y: Math.round((H - rows * cell) / 2), w: cols * cell, h: rows * cell },
      imgA: 0.12, glyphA: 1,                       // you are standing IN the painting
    };
  }
  function geoExit() {
    const g = geoFar(); g.imgA = 1; g.glyphA = 0; return g;
  }
  const geoFor = (d) => (d === 'FAR' ? geoFar() : d === 'NEAR' ? geoNear() : d === 'ENTERED' ? geoEntered() : geoExit());
  const srcFor = (d) => (d === 'EXITED' && S.exitCanvas ? S.exitCanvas : S.img);

  // ── painting layer ────────────────────────────────────────────────────────
  function lerp(a, b, t) { return a + (b - a) * t; }
  function drawPainting(src, s, d, alpha) {
    if (alpha <= 0.004 || !src) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.drawImage(src, s.x, s.y, s.w, s.h, d.x, d.y, d.w, d.h);
    ctx.restore();
  }
  function frame(d) {                                     // hairline frame, P1
    ctx.save();
    ctx.strokeStyle = 'rgba(79,87,96,.30)'; ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(d.x) + 0.5, Math.round(d.y) + 0.5, Math.round(d.w) - 1, Math.round(d.h) - 1);
    ctx.restore();
  }
  // cell tone: the cell's luminance stretched over the PAINTING'S OWN range
  // (field.lum), mapped pad -> line pixel. Darkest cell rests at the pad,
  // brightest lands on rgb(79,87,96) — so the composition still reads at
  // character resolution instead of flattening into one value.
  function tone(n, boost) {
    const k = boost || 0;
    return 'rgb(' + Math.round(8 + n * 71 + k) + ',' + Math.round(12 + n * 75 + k) + ',' + Math.round(18 + n * 78 + k) + ')';
  }
  function norm(c) {
    const r = S.field.lum.max - S.field.lum.min;
    return r > 1e-6 ? (c.lum - S.field.lum.min) / r : 0.5;
  }

  // ── glyph layers ──────────────────────────────────────────────────────────
  function weatherMark(c, x, y, cell, a) {
    if (!c.weather || a <= 0.02) return;
    ctx.save();
    ctx.lineWidth = 1;
    if (c.weather === 'window') {
      ctx.globalAlpha = a * 0.85; ctx.fillStyle = 'rgb(150,160,170)';
      const s = Math.max(1, Math.round(cell * 0.14));
      ctx.fillRect(Math.round(x + cell * 0.68), Math.round(y + cell * 0.2), s, s);
    } else if (c.weather === 'rain') {
      ctx.globalAlpha = a * 0.55; ctx.strokeStyle = 'rgb(79,87,96)';
      const rx = Math.round(x + cell * 0.33) + 0.5;
      ctx.beginPath(); ctx.moveTo(rx, y + cell * 0.12); ctx.lineTo(rx, y + cell * 0.58); ctx.stroke();
    } else if (c.weather === 'lamp') {
      ctx.globalAlpha = a * 0.8; ctx.fillStyle = 'rgb(170,176,184)';
      const s = Math.max(1, Math.round(cell * 0.1));
      ctx.fillRect(Math.round(x + cell * 0.46), Math.round(y + cell * 0.16), s, s);
      ctx.globalAlpha = a * 0.4; ctx.strokeStyle = 'rgb(79,87,96)';
      const rx = Math.round(x + cell * 0.5) + 0.5;
      ctx.beginPath(); ctx.moveTo(rx, y + cell * 0.16); ctx.lineTo(rx, y + cell * 0.42); ctx.stroke();
    } else if (c.weather === 'beacon') {
      ctx.globalAlpha = a * 0.9; ctx.strokeStyle = 'rgb(190,196,204)';
      ctx.beginPath(); ctx.arc(x + cell * 0.5, y + cell * 0.5, Math.max(2, cell * 0.2), 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  // NEAR: the whole visible window at character resolution. Elevation ramp on
  // floors, the source character itself on walls, weather marks, and a radial
  // resolve wave during the transition (reduced motion: no wave, no shimmer).
  function drawNear(g, alpha, wave, hold) {
    const cell = g.cell, win = g.win;
    if (cell < 5 || alpha <= 0.01) return;
    ctx.save();
    ctx.font = Math.max(6, Math.round(cell * 0.92)) + 'px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const midx = win.ox + win.cols / 2, midy = win.oy + win.rows / 2;
    const maxd = Math.hypot(win.cols, win.rows) / 2;
    for (let ry = 0; ry < win.rows; ry++) {
      for (let rx = 0; rx < win.cols; rx++) {
        const cx = win.ox + rx, cy = win.oy + ry;
        const c = S.field.cells[cy * C.COLS + cx];
        const x = g.dst.x + rx * cell, y = g.dst.y + ry * cell;
        let a = alpha;
        if (wave != null) {
          const d = Math.hypot(cx - midx, cy - midy) / maxd;
          a *= Math.max(0, Math.min(1, wave * 1.8 - d));
        }
        if (a <= 0.015) continue;
        const nn = norm(c);
        ctx.globalAlpha = a;
        ctx.fillStyle = tone(nn, c.wall ? 18 : 0);
        ctx.fillRect(x, y, cell, cell);
        let glyph = null, ga = 0.5;
        if (c.wall) { glyph = c.material || '#'; ga = 0.95; }
        else {
          // elevation ramp: the same stretched luminance that set the tone
          let idx = Math.round(nn * (RAMP.length - 1));
          if (hold) {
            const dd = Math.hypot(cx - hold.cx, cy - hold.cy);
            if (dd < 4.5) idx = (idx + C.hash32(cx + ':' + cy + ':' + hold.phase)) % RAMP.length; // held -> moving
          }
          glyph = RAMP[idx];
        }
        if (glyph && glyph !== ' ') {
          ctx.globalAlpha = a * ga;
          ctx.fillStyle = 'rgb(79,87,96)';
          ctx.fillText(glyph, Math.round(x + cell / 2) + 0.5, Math.round(y + cell / 2) + 0.5);
        }
        weatherMark(c, x, y, cell, a);
      }
    }
    if (S.decodeCell != null) crosshair(g, S.field.cells[S.decodeCell], alpha, 'rgba(220,224,230,.95)', true);
    ctx.restore();
  }

  // ENTERED: you are inside the field. District tint from the painting's own
  // hue, walls from its edges, the contract's characters as material, visited
  // cells lit (colour is the change), the walker as a hairline crosshair.
  function drawEntered(g, alpha) {
    const cell = g.cell, win = g.win;
    if (cell < 10 || alpha <= 0.01) return;
    const walked = C.walk(S.field, S.moves);
    ctx.save();
    ctx.lineWidth = 1;
    ctx.font = Math.max(9, Math.round(cell * 0.46)) + 'px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let ry = 0; ry < win.rows; ry++) {
      for (let rx = 0; rx < win.cols; rx++) {
        const cx = win.ox + rx, cy = win.oy + ry;
        const c = S.field.cells[cy * C.COLS + cx];
        const x = g.dst.x + rx * cell, y = g.dst.y + ry * cell;
        const visits = walked.visits[c.n];
        const inReach = S.field.reach[c.n] === 1;
        ctx.globalAlpha = alpha;
        if (c.district < 8) {                                   // colour only on approach (P8)
          ctx.fillStyle = 'hsla(' + (c.district * 45 + 18) + ',42%,58%,.09)';
          ctx.fillRect(x, y, cell, cell);
        }
        if (c.wall) { ctx.fillStyle = 'rgba(79,87,96,.18)'; ctx.fillRect(x, y, cell, cell); }
        else if (!inReach) { ctx.fillStyle = 'rgba(8,12,18,.55)'; ctx.fillRect(x, y, cell, cell); }
        if (visits) { ctx.fillStyle = 'rgba(79,87,96,.32)'; ctx.fillRect(x, y, cell, cell); }
        ctx.strokeStyle = 'rgba(79,87,96,.13)';
        ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, cell - 1, cell - 1);
        ctx.globalAlpha = alpha * (c.wall ? 0.95 : 0.62);
        ctx.fillStyle = 'rgb(79,87,96)';
        const ch = c.material && c.material !== ' ' ? c.material : (c.wall ? '#' : '·');
        ctx.fillText(ch, Math.round(x + cell / 2) + 0.5, Math.round(y + cell / 2) + 0.5);
        weatherMark(c, x, y, cell, alpha);
      }
    }
    crosshair(g, S.walker, alpha * 0.95, 'rgba(190,196,204,.9)');
    if (S.decodeCell != null) crosshair(g, S.field.cells[S.decodeCell], alpha, 'rgba(220,224,230,.95)', true);
    ctx.restore();
  }
  function crosshair(g, cell, alpha, colour, box) {
    const x = g.dst.x + (cell.cx - g.win.ox) * g.cell, y = g.dst.y + (cell.cy - g.win.oy) * g.cell;
    if (x < g.dst.x - g.cell || y < g.dst.y - g.cell || x > g.dst.x + g.dst.w || y > g.dst.y + g.dst.h) return;
    ctx.save();
    ctx.globalAlpha = alpha; ctx.strokeStyle = colour; ctx.lineWidth = 1;
    const mx = Math.round(x + g.cell / 2) + 0.5, my = Math.round(y + g.cell / 2) + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, my); ctx.lineTo(x + g.cell, my);
    ctx.moveTo(mx, y); ctx.lineTo(mx, y + g.cell);
    ctx.stroke();
    if (box) { ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, g.cell - 1, g.cell - 1); }
    ctx.restore();
  }

  // ── the draw loop ─────────────────────────────────────────────────────────
  function draw() {
    ctx.fillStyle = 'rgb(8,12,18)';
    ctx.fillRect(0, 0, W, H);
    if (!S.img) return;
    let t = 1, from = null, to = geoFor(S.distance);
    if (S.trans) {
      const e = S.trans.dur ? Math.min(1, (S.trans.ts - S.trans.t0) / S.trans.dur) : 1;
      t = e * e * (3 - 2 * e);
      from = geoFor(S.trans.from);
    }
    if (!S.trans) {
      drawPainting(srcFor(S.distance), to.src, to.dst, to.imgA);
      if (to.glyphA > 0) (S.distance === 'NEAR' ? drawNear(to, to.glyphA, null, S.hold) : drawEntered(to, to.glyphA));
      if (S.distance === 'FAR' || S.distance === 'EXITED') frame(to.dst);
    } else {
      // one morph: the painting's own region flies into the next frame while
      // the next resolution resolves on top of it
      const a = S.trans.from, b = S.trans.to;
      drawPainting(srcFor(a), { x: lerp(from.src.x, to.src.x, t), y: lerp(from.src.y, to.src.y, t), w: lerp(from.src.w, to.src.w, t), h: lerp(from.src.h, to.src.h, t) },
        { x: lerp(from.dst.x, to.dst.x, t), y: lerp(from.dst.y, to.dst.y, t), w: lerp(from.dst.w, to.dst.w, t), h: lerp(from.dst.h, to.dst.h, t) },
        lerp(from.imgA, to.imgA, t));
      drawPainting(srcFor(b), to.src, to.dst, to.imgA * t);
      if (from.glyphA > 0) (a === 'NEAR' ? drawNear(from, from.glyphA * (1 - t), null, null) : drawEntered(from, from.glyphA * (1 - t)));
      if (to.glyphA > 0) (b === 'NEAR' ? drawNear(to, to.glyphA * t, b === 'NEAR' && a === 'FAR' ? t : null, S.hold) : drawEntered(to, to.glyphA * t));
      if (t >= 1) { S.trans = null; }
    }
  }

  // rAF only while something is actually moving: a transition, a held shimmer,
  // or a decode crosshair. Nothing animates unasked.
  let rafId = 0;
  function frameLoop(ts) {
    rafId = 0;
    let live = false;
    if (S.trans) {
      if (S.trans.ts == null) { S.trans.t0 = ts; S.trans.ts = ts; }
      S.trans.ts = ts;
      live = S.trans.dur === 0 ? false : (ts - S.trans.t0) < S.trans.dur;
      if (!live) S.trans = null;
    }
    if (S.hold) { S.hold.phase = Math.floor((ts - (S.hold.t0 || ts)) / 130); live = true; }
    draw();
    if (live) rafId = requestAnimationFrame(frameLoop);
  }
  function wake() { if (!rafId) rafId = requestAnimationFrame(frameLoop); }

  // ── chrome ────────────────────────────────────────────────────────────────
  function updateChrome() {
    Array.prototype.forEach.call(el.rail.querySelectorAll('button'), (b) => {
      b.setAttribute('aria-pressed', b.dataset.d === S.distance ? 'true' : 'false');
    });
    el.primary.textContent = VERB[S.distance];
    el.primary.disabled = S.distance === 'ENTERED' && !S.field;
    el.headSub.textContent = S.paintingTag ? 'identity ' + S.paintingTag : 'four distances · one object';
    if (S.identity) el.identityTag.textContent = 'identity ' + S.paintingTag + ' · route ' + routeSeedHex();
    updateStatus();
  }
  function updateStatus(extra) {
    if (S.sourceError) { el.status.innerHTML = '<em>gap</em> · ' + escapeHtml(S.sourceError); return; }
    if (!S.field) { el.status.innerHTML = '<em>far</em> · loading the two sources'; return; }
    if (S.distance === 'FAR') {
      el.status.innerHTML = '<em>far</em> · the painting · 1 object at 1/1 resolution';
    } else if (S.distance === 'NEAR') {
      el.status.innerHTML = '<em>near</em> · ' + S.field.walkable + ' walkable of ' + S.field.cells.length + ' cells · hold a finger down to resolve';
    } else if (S.distance === 'ENTERED') {
      const w = S.walker;
      el.status.innerHTML = '<em>entered</em> · cell (' + w.cx + ',' + w.cy + ') · ' + S.moves.length + ' steps · witness <b>' +
        escapeHtml(C.routeString(S.moves) || '—') + '</b>' + (S.originRetrieved ? ' · origin retrieved' : '');
    } else {
      const m = S.exitCache && S.exitCache.metrics;
      el.status.innerHTML = '<em>exited</em> · ' + S.moves.length + ' steps · seed ' + routeSeedHex() +
        (m ? ' · mad64 ' + m.mad64.toFixed(4) + ' vs original' + (m.sha ? ' · sha ' + m.sha.slice(0, 8) : '') : ' · recomposing…') +
        (S.originRetrieved ? ' · returned to origin' : '');
    }
    if (extra) el.status.innerHTML += ' · ' + extra;
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function showGap(msg) {
    el.gap.style.display = 'block';
    el.gap.textContent = msg;
  }

  // ── distance ──────────────────────────────────────────────────────────────
  function setDistance(d, silent) {
    if (!S.field && (d === 'NEAR' || d === 'ENTERED')) { showGap('GAP — the city needs both sources; nothing is faked here.'); return false; }
    if (d === S.distance) return false;
    if (d === 'EXITED') buildExit();
    S.decodeCell = null; closeDecode();
    S.trans = { from: S.distance, to: d, dur: reduced ? 0 : 700, t0: 0, ts: null };
    S.distance = d;
    if (!silent) { S.revealed = true; }
    updateChrome();
    wake(); if (reduced) draw();
    return true;
  }
  function primaryAct() {
    const order = { FAR: 'NEAR', NEAR: 'ENTERED', ENTERED: 'EXITED', EXITED: 'FAR' };
    if (S.distance === 'EXITED') return resetRoute();
    setDistance(order[S.distance]);
  }
  function resetRoute() {
    S.moves = []; S.originRetrieved = false; S.exitCache = null; S.exitCanvas = null;
    S.walker = S.field ? S.field.start : null;
    setDistance('FAR');
    updateChrome(); draw();
  }

  // ── the recomposition (EXITED) ────────────────────────────────────────────
  function buildExit() {
    const key = C.routeString(S.moves);
    if (S.exitCache && S.exitCache.key === key) return;
    const rec = C.recompose(S.rgba, S.iw, S.ih, S.field, S.moves);
    const off = document.createElement('canvas');
    off.width = S.iw; off.height = S.ih;
    off.getContext('2d').putImageData(new ImageData(rec.rgba, S.iw, S.ih), 0, 0);
    S.exitCanvas = off;
    const d0 = C.downscale64(S.rgba, S.iw, S.ih);
    const dR = C.downscale64(rec.rgba, S.iw, S.ih);
    S.exitCache = {
      key, rec,
      metrics: { mad64: C.mad64(d0, dR), changedPx: C.changedPx(S.rgba, rec.rgba), visited: rec.visited, seed: routeSeedHex() },
    };
    sha256(rec.rgba).then((sha) => {
      if (!S.exitCache || S.exitCache.key !== key) return;
      S.exitCache.metrics.sha = sha;
      updateStatus();
      if (S.distance === 'EXITED') draw();
    });
    S.identity.update(MA.fromState({ custom: MA.identity(identitySeed()) }));
  }

  // ── the walk ──────────────────────────────────────────────────────────────
  function step(dir) {
    if (!S.field || S.distance !== 'ENTERED') return false;
    const next = C.step(S.field, S.walker, dir);
    if (!next) { updateStatus('wall'); return false; }          // the city says no
    S.walker = next;
    S.moves.push(dir);
    if (next.n === S.field.start.n && S.moves.length >= 8 && !S.originRetrieved) {
      S.originRetrieved = true;                                 // ninth gate: retrieve the start coordinate
      buildExit();
      updateChrome(); setDistance('EXITED', true); return true;
    }
    updateChrome(); draw();
    return true;
  }

  // ── decode (one hold teaches the vocabulary) ──────────────────────────────
  const VOCAB = 'wall = the painting’s strongest edges (carrying the contract’s characters) · cell tone + floor glyph = elevation (the cell’s luminance over the painting’s own range, pad → line) · district tint = the painting’s own hue · . window  , rain  ; lamp  ? beacon';
  function openDecode(g, cell) {
    S.decodeCell = cell.n;
    const u = cell.unit, sent = S.parsed.sentences[u.si], para = S.parsed.blocks[u.p];
    const hue = cell.hue < 0 ? 'achromatic' : Math.round(cell.hue) + '°';
    const dist = cell.district === 8 ? 'neutral' : 'district ' + cell.district + ' (' + ['red', 'amber', 'yellow', 'green', 'spring', 'azure', 'violet', 'magenta'][cell.district] + ')';
    const visited = C.walk(S.field, S.moves).visits[cell.n];
    el.decode.innerHTML =
      '<dl>' +
      '<dt>cell</dt><dd>(' + cell.cx + ',' + cell.cy + ') of ' + C.COLS + '×' + C.ROWS + ' · ' + (cell.wall ? 'wall' : (S.field.reach[cell.n] ? 'street' : 'closed pocket')) + '</dd>' +
      '<dt>district ¶</dt><dd>' + (u.p + 1) + ' · “' + escapeHtml(clip(para)) + '”</dd>' +
      '<dt>building</dt><dd>sentence ' + (u.si + 1) + ' · “' + escapeHtml(clip(sent ? sent.text : '')) + '”</dd>' +
      '<dt>room</dt><dd>“' + escapeHtml(clip(u.room, 40)) + '” · word ' + (u.w + 1) + ' of its sentence</dd>' +
      '<dt>material</dt><dd>' + escapeHtml(cell.material === ' ' ? 'blank' : cell.material) + ' · U+' + cell.material.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0') + '</dd>' +
      '<dt>elevation</dt><dd>' + cell.lum.toFixed(3) + ' luminance = ' + norm(cell).toFixed(3) + ' of the painting’s range · edge ' + cell.edge.toFixed(3) + ' · tex ' + cell.tex.toFixed(3) + '</dd>' +
      '<dt>colour</dt><dd>' + hue + ' → ' + dist + '</dd>' +
      '<dt>weather</dt><dd>' + (cell.weather || 'none') + '</dd>' +
      '<dt>visits</dt><dd>' + visited + '</dd>' +
      '</dl><div class="vocab">' + VOCAB + '</div>';
    el.decode.style.display = 'block';
    draw();
  }
  function clip(s, n) {
    const t = String(s || '').replace(/\s+/g, ' ').trim();
    return t.length > (n || 78) ? t.slice(0, (n || 78) - 1) + '…' : t;
  }
  function closeDecode() {
    S.decodeCell = null;
    el.decode.style.display = 'none';
    draw();
  }

  // ── pointer + keyboard (touch-first) ──────────────────────────────────────
  function cellFromEvent(e) {
    if (!S.field) return null;
    const r = cv.getBoundingClientRect();
    const g = geoFor(S.distance);
    if (!g.win) return null;
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const rx = Math.floor((x - g.dst.x) / g.cell), ry = Math.floor((y - g.dst.y) / g.cell);
    if (rx < 0 || ry < 0 || rx >= g.win.cols || ry >= g.win.rows) return null;
    const cx = g.win.ox + rx, cy = g.win.oy + ry;
    return S.field.cells[cy * C.COLS + cx];
  }
  cv.addEventListener('pointerdown', (e) => {
    if (!S.field) return;
    try { if (cv.setPointerCapture && e.pointerId != null) cv.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointer: not an active pointer */ }
    S.drag = { x: e.clientX, y: e.clientY, moved: false, axis: null, acc: 0 };
    const cell = cellFromEvent(e);
    if (cell && S.distance === 'NEAR' && !reduced) S.hold = { cx: cell.cx, cy: cell.cy, phase: 0, t0: 0 };
    clearTimeout(S.holdTimer);
    S.holdTimer = setTimeout(() => {
      const c2 = cellFromEvent({ clientX: S.drag.x, clientY: S.drag.y });
      if (c2) { S.drag.moved = true; openDecode(geoFor(S.distance), c2); }
    }, HOLD_MS);
    wake();
  });
  cv.addEventListener('pointermove', (e) => {
    if (!S.drag || !S.field) return;
    const dx = e.clientX - S.drag.x, dy = e.clientY - S.drag.y;
    if (Math.hypot(dx, dy) > 10) { S.drag.moved = true; clearTimeout(S.holdTimer); }
    if (S.distance === 'NEAR' && S.hold) {
      const c = cellFromEvent(e);
      if (c) { S.hold.cx = c.cx; S.hold.cy = c.cy; wake(); }
    }
    if (S.distance === 'ENTERED' && Math.hypot(dx, dy) > 10) {
      const cell = geoFor('ENTERED').cell;
      if (!S.drag.axis) S.drag.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      const d = S.drag.axis === 'x' ? dx : dy;
      if (Math.abs(d) > cell * 0.8) {
        const dir = S.drag.axis === 'x' ? (d > 0 ? 'R' : 'L') : (d > 0 ? 'D' : 'U');
        step(dir);
        S.drag.x = e.clientX; S.drag.y = e.clientY; S.drag.axis = null;
      }
    }
  });
  function endPointer() {
    clearTimeout(S.holdTimer);
    S.hold = null;
    S.drag = null;
    wake(); draw();
  }
  cv.addEventListener('pointerup', (e) => {
    const wasMoved = S.drag && S.drag.moved;
    endPointer();
    if (!wasMoved && S.distance === 'FAR' && S.field) setDistance('NEAR');
    else if (!wasMoved && S.distance !== 'FAR') { /* the rail and the primary button carry the rest */ }
    if (e && e.pointerId != null && cv.releasePointerCapture) { try { cv.releasePointerCapture(e.pointerId); } catch (err) { /* released already */ } }
  });
  cv.addEventListener('pointercancel', endPointer);
  cv.addEventListener('contextmenu', (e) => e.preventDefault());

  el.rail.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-d]');
    if (b) setDistance(b.dataset.d);
  });
  el.primary.addEventListener('click', primaryAct);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeDecode(); return; }
    if (S.distance !== 'ENTERED') return;
    const m = { ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R', w: 'U', s: 'D', a: 'L', d: 'R' }[e.key];
    if (m) { e.preventDefault(); step(m); }
  });

  // ── measurement + probe API (the instrument reads its own derivations) ────
  function sha256(u8) {
    const copy = new Uint8Array(u8.byteLength);
    copy.set(u8);
    return crypto.subtle.digest('SHA-256', copy).then((b) => Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, '0')).join(''));
  }
  function measureRoute(moves) {
    if (!S.rgba) return Promise.reject(new Error('not ready'));
    const mvs = Array.isArray(moves) ? moves : String(moves || '').split('');
    const rec = C.recompose(S.rgba, S.iw, S.ih, S.field, mvs);
    const d0 = C.downscale64(S.rgba, S.iw, S.ih);
    const dR = C.downscale64(rec.rgba, S.iw, S.ih);
    return sha256(rec.rgba).then((sha) => ({
      witness: C.routeString(mvs), moves: mvs.length, seed: routeSeedHexFor(mvs), tag: S.paintingTag,
      sha256: sha, mad64VsOriginal: +C.mad64(d0, dR).toFixed(6),
      changedPx: C.changedPx(S.rgba, rec.rgba), visitedCells: rec.visited, px: rec.tiles,
    }));
  }
  function routeSeedHexFor(mvs) {
    return ('00000000' + C.routeSeed(S.paintingTag, mvs).toString(16)).slice(-8);
  }
  // Two routes, head to head: how far apart are the two recomposed paintings?
  function pairwise(movesA, movesB) {
    if (!S.rgba) return Promise.reject(new Error('not ready'));
    const A = C.recompose(S.rgba, S.iw, S.ih, S.field, Array.isArray(movesA) ? movesA : String(movesA || '').split(''));
    const B = C.recompose(S.rgba, S.iw, S.ih, S.field, Array.isArray(movesB) ? movesB : String(movesB || '').split(''));
    return Promise.all([sha256(A.rgba), sha256(B.rgba)]).then(([shaA, shaB]) => ({
      witnessA: C.routeString(movesA), witnessB: C.routeString(movesB),
      identicalPixels: shaA === shaB,
      shaA, shaB,
      mad64: +C.mad64(C.downscale64(A.rgba, S.iw, S.ih), C.downscale64(B.rgba, S.iw, S.ih)).toFixed(6),
      changedPx: C.changedPx(A.rgba, B.rgba),
    }));
  }
  // A deterministic greedy traverse per priority order — probe-only, used to
  // prove determinism with two REAL routes through the real painting. Avoids
  // backtracking and revisits when it can, so the witness is a real walk and
  // not a wall-hug.
  function greedy(order, len) {
    let pos = S.field.start; const mv = [];
    const dirs = order.filter((x) => ['R', 'D', 'L', 'U'].indexOf(x) >= 0);
    const opp = { U: 'D', D: 'U', L: 'R', R: 'L' };
    const seen = new Set([pos.n]);
    let last = null;
    const n = len || 40;
    for (let i = 0; i < n; i++) {
      const open = (d) => { const nx = C.step(S.field, pos, d); return nx && !seen.has(nx.n) ? nx : null; };
      const safe = (d) => C.step(S.field, pos, d);
      let d = dirs.find((x) => x !== opp[last] && open(x));
      let nx = d && open(d);
      if (!nx) { d = dirs.find((x) => safe(x)); nx = d && safe(d); }
      if (!d || !nx) break;
      pos = nx; seen.add(nx.n); last = d; mv.push(d);
    }
    return mv;
  }
  function state() {
    return {
      distance: S.distance, ready: !!S.ready, sourceError: S.sourceError,
      witness: C.routeString(S.moves), moves: S.moves.slice(),
      walker: S.walker ? { x: S.walker.cx, y: S.walker.cy } : null,
      seed: routeSeedHex(), tag: S.paintingTag, originRetrieved: S.originRetrieved,
      painting: { id: C.PAINTING_ID, sha256: C.PAINTING_SHA256, w: S.iw, h: S.ih, src: PAINTING_SRC },
      source: S.field ? { path: C.SOURCE_PATH, counts: S.field.source.counts, drawn: S.field.drawn } : null,
      field: S.field ? { cells: S.field.cells.length, walkable: S.field.walkable, reachable: S.field.reachable, cutQ: S.field.cutQ } : null,
    };
  }
  window.SleeperLadder = Object.freeze({
    version: C.version,
    ready,
    state,
    setDistance,
    step,
    reset: resetRoute,
    measure: (routes) => Promise.all((routes || [['R', 'D']]).map(measureRoute)),
    measureRoute,
    pairwise,
    greedy,
    decode: (n) => { const c = S.field && S.field.cells[n]; if (c) openDecode(geoFor(S.distance), c); return c ? c.n : null; },
    closeDecode,
    fieldStats: () => S.field ? {
      cutQ: S.field.cutQ, cut: +S.field.cut.toFixed(5), walkable: S.field.walkable, reachable: S.field.reachable,
      lumRange: { min: +S.field.lum.min.toFixed(4), max: +S.field.lum.max.toFixed(4) },
      drawn: S.field.drawn, sourceCounts: S.field.source.counts, start: { x: S.field.start.cx, y: S.field.start.cy },
    } : null,
  });

  fit();
  draw();
  updateChrome();
})();
