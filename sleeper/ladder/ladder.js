/* global MoireAmbient, SleeperLadderCore */
// ladder.js — SLEEPER // LADDER, the instrument. One field at four distances:
//
//   FAR      the painting, whole, at rest
//   NEAR     the same frame at character resolution: luminance -> elevation,
//            the painting's own edges -> walls, hue -> district, texture ->
//            windows and rain
//   ENTERED  a walkable window of that field. The matter is Buddhadhamma:
//            paragraph = district, sentence = building, word = room, character
//            = material. Swipe to walk; tap or hold a cell to read it. The
//            district you stand in is one band with its weather stitched along
//            the edge, and that weather is what you carried out of the last
//            district — nothing here is assigned. The first gate is a threshold
//            that will not open until its district has been SEEN WHOLE (hold,
//            and the view rises to the shape); the other seven ask a word.
//   EXITED   the route recomposed into the painting — deterministic, and
//            returning restores the original bytes
//
// DIAGETIC BY CONSTRUCTION: there is no header, no status bar, no rail, no
// panel. The frame carries the eight lamps (the one meter), the frame's corner
// carries the distance, the cells carry their own matter, and one hairline
// strip at the foot carries the line the world wants to say right now — a
// district's line, a gate's question, the exit measurements. The only
// persistent DOM text is the provenance line, which is read live from the
// source file. 0.3.0 removed the per-cell weather marks and the per-cell
// remembered underline: one district band carries both facts now.
//
// Determinism: no Math.random, no Date, no performance.now. Every drawn number
// is a real field of a real record. Motion rides requestAnimationFrame
// timestamps and one-shot transitions only (P3: depth behind an explicit act,
// never ambient auto-play; reduced motion gets the depth with zero motion).
(function () {
  'use strict';
  const C = window.SleeperLadderCore, MA = window.MoireAmbient;
  const RAMP = ' .·:-=+*#%@';                       // elevation ramp (floor glyphs)
  const PAINTING_SRC = '/sleeper/borrowed-river/landscape.jpg';
  const HOLD_MS = 380;                               // dwell that opens a decode
  const RISE_MS = 1400;                              // sustained attention that sees a district whole
  const VOICE_H = 50;                                // the foot strip (3 lines)
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

  const cv = document.getElementById('field');
  const ctx = cv.getContext('2d', { alpha: false });
  const el = { prov: document.getElementById('prov'), live: document.getElementById('live') };

  const S = {
    distance: 'FAR', moves: [], walker: null, field: null, source: null,
    rgba: null, iw: 0, ih: 0, img: null, ready: false, error: null,
    decodeCell: null, hold: null, trans: null, exitCache: null, exitCanvas: null,
    paintingTag: null, drag: null, holdTimer: 0, revealed: false,
    gates: [], lit: null, strikes: null, gate: null, ledger: null, lastP: -1,
    voice: null, pulse: null, seen: null, rise: null, refuse: null, weather: null, lineSaid: -1,
  };
  let W = 0, H = 0, dpr = 1;

  // ── the ledger (retention) — local, clock-free, never part of the hash ────
  const LEDGER_KEY = 'sleeper.ladder.read.' + (C.SOURCE_SCHEMA || 'v1');
  function loadLedger() {
    try {
      const raw = localStorage.getItem(LEDGER_KEY);
      const v = raw ? JSON.parse(raw) : null;
      if (v && v.v === 1 && v.seen) return v;
    } catch (err) { /* private mode: the ledger is a convenience, not a claim */ }
    return C.emptyLedger();
  }
  function saveLedger() {
    try { localStorage.setItem(LEDGER_KEY, JSON.stringify(S.ledger)); } catch (err) { /* ignore */ }
  }

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
    return fetch(C.SOURCE_PATH, { cache: 'no-cache' }).then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + C.SOURCE_PATH);
      return r.json();
    });
  }
  const ready = Promise.all([loadImage(), loadSource()])
    .then(([img, derived]) => {
      S.img = img; S.iw = img.naturalWidth; S.ih = img.naturalHeight;
      const off = document.createElement('canvas');
      off.width = S.iw; off.height = S.ih;
      const octx = off.getContext('2d', { willReadFrequently: true });
      octx.drawImage(img, 0, 0);
      S.rgba = octx.getImageData(0, 0, S.iw, S.ih).data;
      S.source = C.readDerived(derived);                     // strict: a bad slice is a gap
      S.field = C.buildField(S.rgba, S.iw, S.ih, S.source);
      S.walker = S.field.start;
      S.paintingTag = C.tag8(C.PAINTING_ID + C.PAINTING_SHA256);
      const placed = C.placeGates(S.field, C.GATES, (p) => !!(S.source.districts[p] && S.source.districts[p].cloze));
      S.gates = placed.gates;
      S.lit = new Uint8Array(S.gates.length);
      S.strikes = new Uint8Array(S.gates.length);
      S.seen = new Uint8Array(S.gates.length);
      S.weather = C.weatherChain(S.field, S.moves);
      S.ledger = loadLedger();
      S.ledger.seq = S.ledger.seq || 0;
      paintProvenance();
      S.ready = true;
      fit(); updateChrome(); draw();
      return state();
    })
    .catch((err) => {
      S.error = String(err && err.message || err);
      // the gap is spoken in the world's own strip, not in a panel
      S.voice = { kind: 'gap', lines: ['GAP — ' + S.error, 'the ladder cannot resolve without both sources; nothing is faked here.'], ttl: Infinity };
      fit(); draw();
      return { error: S.error };
    });

  // Provenance is READ LIVE from the source file, never typed twice.
  function paintProvenance() {
    const p = S.source && S.source.provenance, sel = S.source && S.source.selection, n = S.source && S.source.counts;
    if (!p) return;
    const pages = (p.pages || []).length;
    const short = p.author.replace(/\s*\(.*$/, '');
    el.prov.textContent = 'text · ' + short + ', ' + p.title.replace(/:.*$/, '') +
      ' · ' + p.source_url.replace(/^https?:\/\//, '').replace(/\/$/, '') + ' · retrieved ' + p.retrieved +
      ' · ' + sel.districts + ' ¶ / ' + n.chars + ' chars sampled of ' + n.corpus + ' ¶ (' + pages + ' pages) · derived projection, not the book';
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
  const fieldH = () => Math.max(80, H - VOICE_H);

  // One geometry per distance: where the painting's own region sits, how big a
  // cell is, and which slice of the 96x32 grid is on screen.
  function geoFar(src) {
    const FH = fieldH();
    const s = Math.min(W / S.iw, FH / S.ih), w = S.iw * s, h = S.ih * s;
    // the panorama sits high in the field: the world's voice hangs directly
    // under it, so the line is attached to the object it speaks about
    const y = Math.min(FH - h, Math.max(18, FH * 0.26));
    return { src: { x: 0, y: 0, w: S.iw, h: S.ih }, dst: { x: (W - w) / 2, y, w, h }, imgA: 1, glyphA: 0 };
  }
  // NEAR is the WHOLE 96x32 frame, in the painting's own box: the composition
  // cannot survive a crop, so the field is never cropped here — the characters
  // are 4-5px at phone width and read as texture, and one hold opens a loupe
  // (resolution earned by attention, not filtering: P "one panel = one scale"
  // explicitly allows a low-res root that resolves on demand).
  function geoNear() {
    const cell = Math.max(3, Math.min(W / C.COLS, fieldH() / C.ROWS));
    const cols = C.COLS, rows = C.ROWS;
    const w = cols * cell, h = rows * cell;
    const far = geoFar();
    return {
      cell, win: { cols, rows, ox: 0, oy: 0 }, kind: 'near',
      src: { x: 0, y: 0, w: S.iw, h: S.ih },
      dst: { x: Math.round((W - w) / 2), y: Math.round(far.dst.y + (far.dst.h - h) / 2), w, h },
      imgA: 0, glyphA: 1,
    };
  }
  function geoEntered() {
    const FH = fieldH();
    const cell = Math.max(20, Math.floor(Math.min(W / 10, FH / 9)));
    const cols = Math.max(5, Math.min(C.COLS, Math.floor(W / cell)));
    const rows = Math.max(4, Math.min(C.ROWS, Math.floor(FH / cell)));
    const ox = Math.max(0, Math.min(C.COLS - cols, S.walker.cx - Math.floor(cols / 2)));
    const oy = Math.max(0, Math.min(C.ROWS - rows, S.walker.cy - Math.floor(rows / 2)));
    return {
      cell, win: { cols, rows, ox, oy }, kind: 'entered',
      src: { x: ox * S.iw / C.COLS, y: oy * S.ih / C.ROWS, w: cols * S.iw / C.COLS, h: rows * S.ih / C.ROWS },
      dst: { x: Math.round((W - cols * cell) / 2), y: Math.round((FH - rows * cell) / 2), w: cols * cell, h: rows * cell },
      imgA: 0.12, glyphA: 1,                       // you are standing IN the painting
    };
  }
  function geoExit() { const g = geoFar(); g.imgA = 1; g.glyphA = 0; return g; }
  const geoFor = (d) => (d === 'FAR' ? geoFar() : d === 'NEAR' ? geoNear() : d === 'ENTERED' ? geoEntered() : geoExit());
  const srcFor = (d) => (d === 'EXITED' && S.exitCanvas ? S.exitCanvas : S.img);

  // The rise: the same two geometries the ladder already has, held between. As
  // the hold grows, the walked window widens toward the whole 96x32 field and
  // the cells shrink — the district stops being a place you are inside and
  // becomes a shape you can see. No new camera: k interpolates ENTERED -> NEAR.
  function geoRise(k) {
    const a = geoEntered(), b = geoNear(), t = k;
    const cols = lerp(a.win.cols, b.win.cols, t), rows = lerp(a.win.rows, b.win.rows, t);
    const cell = lerp(a.cell, b.cell, t);
    const ax = a.dst.x + a.dst.w / 2, ay = a.dst.y + a.dst.h / 2;
    const bx = b.dst.x + b.dst.w / 2, by = b.dst.y + b.dst.h / 2;
    return {
      cell, win: { cols, rows, ox: lerp(a.win.ox, b.win.ox, t), oy: lerp(a.win.oy, b.win.oy, t) },
      kind: 'rise',
      src: { x: 0, y: 0, w: S.iw, h: S.ih },
      dst: { x: lerp(ax, bx, t) - cols * cell / 2, y: lerp(ay, by, t) - rows * cell / 2, w: cols * cell, h: rows * cell },
      imgA: 0.12, glyphA: 1,
    };
  }

  // ── painting layer ────────────────────────────────────────────────────────
  const lerp = (a, b, t) => a + (b - a) * t;
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

  // ── the district band: shape and weather in one line ──────────────────────
  // A district used to weather one cell at a time (this comma rains here), which
  // at phone size was invisible: 83 marks in 3,072 cells. The weather is now the
  // DISTRICT's, and it is written along the district's own boundary — the same
  // line the sight gate traces. One vocabulary, two facts: the band is where the
  // district ends and what weather it is under.
  const WEATHER_GAP = { window: 15, rain: 9, lamp: 27, beacon: 41 };   // px between marks
  function weatherFor(p) {
    if (!S.field || !S.weather) return null;
    const steps = S.weather.steps;
    const cur = steps.length ? steps[steps.length - 1] : null;
    if (cur && cur.p === p) return cur.weather;          // where you stand: what the chain says
    const rec = S.field.districts[p];
    return C.weatherOf(rec ? rec.body : null, S.weather.carry);   // anywhere else: what it would be from here
  }
  // the marks as data (the probe reads this; draw() paints it)
  function bandMarks(g, p) {
    const runs = (S.field.bands && S.field.bands[p]) || [];
    const w = weatherFor(p);
    if (!w || !runs.length) return [];
    // coarse in a room, fine in the overview: never more than about one mark per
    // cell, so the band stays a stitched edge and not a ruler
    const gap = Math.max(WEATHER_GAP[w] || 15, g.cell);
    const out = [];
    for (const r of runs) {
      const ax = g.dst.x + (r.x0 - g.win.ox) * g.cell, bx = g.dst.x + (r.x1 - g.win.ox) * g.cell;
      const y = g.dst.y + (r.y - g.win.oy) * g.cell;
      if (y < g.dst.y - 8 || y > g.dst.y + g.dst.h + 8) continue;
      const lo = Math.max(ax, g.dst.x), hi = Math.min(bx, g.dst.x + g.dst.w);
      if (hi - lo < 4) continue;
      const n = Math.max(1, Math.floor((hi - lo) / gap));
      const start = lo + ((hi - lo) - (n - 1) * gap) / 2;
      for (let i = 0; i < n; i++) out.push({ p, w, x: Math.round((start + i * gap) * 10) / 10, y: Math.round(y) + 0.5 });
    }
    return out;
  }
  function drawBand(g, p, alpha) {
    const w = weatherFor(p);
    if (!w) return;
    const marks = bandMarks(g, p);
    if (!marks.length || alpha <= 0.02) return;
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgb(190,196,204)';
    ctx.globalAlpha = alpha;
    if (w === 'beacon' || w === 'lamp') {
      ctx.beginPath();
      for (const m of marks) {
        if (w === 'beacon') { ctx.moveTo(m.x + 2.2, m.y); ctx.arc(m.x, m.y, 2.2, 0, Math.PI * 2); }
        else { ctx.moveTo(m.x - 1, m.y); ctx.lineTo(m.x + 1, m.y); ctx.moveTo(m.x, m.y - 1); ctx.lineTo(m.x, m.y + 1); }
      }
      ctx.stroke();
    } else if (w === 'window') {
      ctx.beginPath();
      for (const m of marks) { ctx.moveTo(m.x, m.y - 3); ctx.lineTo(m.x, m.y - 0.5); }
      ctx.stroke();
      ctx.globalAlpha = alpha * 0.5;
      ctx.beginPath();
      for (const m of marks) { ctx.moveTo(m.x - 1, m.y - 2); ctx.lineTo(m.x + 1, m.y - 2); }
      ctx.stroke();
    } else {
      ctx.globalAlpha = alpha * 0.85;
      ctx.beginPath();
      for (const m of marks) { ctx.moveTo(m.x - 0.5, m.y - 2.5); ctx.lineTo(m.x - 0.5, m.y + 2.5); ctx.moveTo(m.x + 1.5, m.y - 1.5); ctx.lineTo(m.x + 1.5, m.y + 1.5); }
      ctx.stroke();
    }
    ctx.restore();
  }
  // The shape itself: every side of the district that borders another district.
  function drawShape(g, p, alpha) {
    const segs = (S.field.edges && S.field.edges[p]) || [];
    if (!segs.length || alpha <= 0.02) return;
    ctx.save();
    ctx.strokeStyle = 'rgb(190,196,204)';
    ctx.lineWidth = 1;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    for (const s of segs) {
      const x0 = Math.round(g.dst.x + (s[0] - g.win.ox) * g.cell) + 0.5;
      const y0 = Math.round(g.dst.y + (s[1] - g.win.oy) * g.cell) + 0.5;
      const x1 = Math.round(g.dst.x + (s[2] - g.win.ox) * g.cell) + 0.5;
      const y1 = Math.round(g.dst.y + (s[3] - g.win.oy) * g.cell) + 0.5;
      ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
    }
    ctx.stroke();
    ctx.restore();
  }

  // NEAR: the whole visible window at character resolution. Elevation ramp on
  // floors, the source character itself on walls, weather marks, and a radial
  // resolve wave during the transition (reduced motion: no wave, no shimmer).
  function drawNear(g, alpha, wave, hold, focus) {
    const cell = g.cell, win = g.win;
    if (cell < 3 || alpha <= 0.01) return;
    ctx.save();
    ctx.font = Math.max(3, Math.round(cell * 0.96)) + 'px ' + MONO;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const midx = win.ox + win.cols / 2, midy = win.oy + win.rows / 2;
    const maxd = Math.hypot(win.cols, win.rows) / 2;
    const fx = focus ? focus.p : -1, fk = focus ? focus.k : 0;
    const x0 = Math.max(0, Math.floor(win.ox)), y0 = Math.max(0, Math.floor(win.oy));
    const x1 = Math.min(C.COLS, Math.ceil(win.ox + win.cols)), y1 = Math.min(C.ROWS, Math.ceil(win.oy + win.rows));
    for (let cy = y0; cy < y1; cy++) {
      for (let cx = x0; cx < x1; cx++) {
        const c = S.field.cells[cy * C.COLS + cx];
        const x = g.dst.x + (cx - win.ox) * cell, y = g.dst.y + (cy - win.oy) * cell;
        let a = alpha;
        if (wave != null) {
          const d = Math.hypot(cx - midx, cy - midy) / maxd;
          a *= Math.max(0, Math.min(1, wave * 1.8 - d));
        }
        if (fx >= 0 && c.unit.p !== fx) a *= 1 - 0.82 * fk;
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
      }
    }
    if (S.hold && cell < 12 && !focus) drawLoupe(g, alpha);
    if (S.decodeCell != null) crosshair(g, S.field.cells[S.decodeCell], alpha, 'rgba(220,224,230,.95)', true);
    ctx.restore();
  }

  // One hold opens a loupe: nine cells across, real characters, around the
  // finger. The field underneath is dimmed but still drawn — the loupe is the
  // same object at the resolution your attention bought, not a panel about it.
  function drawLoupe(g, alpha) {
    const N = 9;
    const px = Math.max(10, Math.floor(Math.min(W / (N + 3), fieldH() / (N + 6))));
    const size = N * px;
    const hx = g.dst.x + (S.hold.cx - g.win.ox + 0.5) * g.cell;
    const hy = g.dst.y + (S.hold.cy - g.win.oy + 0.5) * g.cell;
    const x = Math.max(6, Math.min(W - size - 6, hx - size / 2));
    const y = Math.max(6, Math.min(fieldH() - size - 6, hy - size / 2));
    ctx.save();
    ctx.globalAlpha = 0.94 * alpha;
    ctx.fillStyle = 'rgba(8,12,18,.92)';
    ctx.fillRect(x, y, size, size);
    ctx.globalAlpha = 0.8 * alpha;
    ctx.strokeStyle = 'rgba(120,128,138,.6)'; ctx.lineWidth = 0;
    ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, size - 1, size - 1);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = Math.round(px * 0.62) + 'px ' + MONO;
    const ox = S.hold.cx - Math.floor(N / 2), oy = S.hold.cy - Math.floor(N / 2);
    for (let ry = 0; ry < N; ry++) {
      for (let rx = 0; rx < N; rx++) {
        const cx = ox + rx, cy = oy + ry;
        if (cx < 0 || cy < 0 || cx >= C.COLS || cy >= C.ROWS) continue;
        const c = S.field.cells[cy * C.COLS + cx];
        const cxp = x + rx * px, cyp = y + ry * px;
        ctx.globalAlpha = 0.9 * alpha;
        ctx.fillStyle = tone(norm(c), c.wall ? 14 : 0);
        ctx.fillRect(cxp, cyp, px, px);
        ctx.globalAlpha = alpha * 0.22;
        ctx.strokeStyle = 'rgba(79,87,96,.5)';
        ctx.strokeRect(Math.round(cxp) + 0.5, Math.round(cyp) + 0.5, px - 1, px - 1);
        ctx.globalAlpha = alpha * (c.wall ? 0.98 : 0.8);
        ctx.fillStyle = c.wall ? 'rgb(190,196,204)' : 'rgb(140,148,158)';
        ctx.fillText(c.material === ' ' ? '·' : c.material, Math.round(cxp + px / 2) + 0.5, Math.round(cyp + px / 2) + 0.5);
      }
    }
    ctx.globalAlpha = alpha * 0.9; ctx.strokeStyle = 'rgba(214,220,228,.7)';
    ctx.strokeRect(Math.round(x + Math.floor(N / 2) * px) + 0.5, Math.round(y + Math.floor(N / 2) * px) + 0.5, px - 1, px - 1);
    ctx.restore();
  }

  // ENTERED: you are inside the field. District tint from the painting's own
  // hue, walls from its edges, the book's characters as material, visited
  // cells lit, remembered districts marked, the eight gates standing in it.
  function drawEntered(g, alpha, focus) {
    const cell = g.cell, win = g.win;
    if (cell < 3 || alpha <= 0.01) return;
    const walked = C.walk(S.field, S.moves);
    const litDistricts = new Set();
    for (let i = 0; i < S.gates.length; i++) if (S.lit[i]) litDistricts.add(S.gates[i].p);
    const fx = focus ? focus.p : -1, fk = focus ? focus.k : 0;
    const here = S.walker ? S.walker.unit.p : -1;
    const x0 = Math.max(0, Math.floor(win.ox)), y0 = Math.max(0, Math.floor(win.oy));
    const x1 = Math.min(C.COLS, Math.ceil(win.ox + win.cols)), y1 = Math.min(C.ROWS, Math.ceil(win.oy + win.rows));
    ctx.save();
    ctx.lineWidth = 1;
    ctx.font = Math.max(9, Math.round(cell * 0.46)) + 'px ' + MONO;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let cy = y0; cy < y1; cy++) {
      for (let cx = x0; cx < x1; cx++) {
        const c = S.field.cells[cy * C.COLS + cx];
        const x = g.dst.x + (cx - win.ox) * cell, y = g.dst.y + (cy - win.oy) * cell;
        let a = alpha;
        if (fx >= 0 && c.unit.p !== fx) a *= 1 - 0.82 * fk;
        if (a <= 0.015) continue;
        const visits = walked.visits[c.n];
        const inReach = S.field.reach[c.n] === 1;
        ctx.globalAlpha = a;
        if (c.district < 8) {                                   // colour only on approach (P8)
          ctx.fillStyle = 'hsla(' + (c.district * 45 + 18) + ',42%,58%,.09)';
          ctx.fillRect(x, y, cell, cell);
        }
        if (c.wall) { ctx.fillStyle = 'rgba(79,87,96,.18)'; ctx.fillRect(x, y, cell, cell); }
        else if (!inReach) { ctx.fillStyle = 'rgba(8,12,18,.55)'; ctx.fillRect(x, y, cell, cell); }
        if (visits) { ctx.fillStyle = 'rgba(79,87,96,.32)'; ctx.fillRect(x, y, cell, cell); }
        if (litDistricts.has(c.unit.p)) { ctx.fillStyle = 'rgba(190,196,204,.10)'; ctx.fillRect(x, y, cell, cell); }
        ctx.strokeStyle = 'rgba(79,87,96,.13)';
        ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, cell - 1, cell - 1);
        // (the per-cell "remembered" underline is gone: 3,072 of them were a
        // second, weaker district mark doing the band's job badly. The ledger
        // still speaks — through the return prompt, not through the field.)
        ctx.globalAlpha = a * (c.wall ? 0.95 : 0.62);
        ctx.fillStyle = 'rgb(79,87,96)';
        const ch = c.material && c.material !== ' ' ? c.material : (c.wall ? '#' : '·');
        ctx.fillText(ch, Math.round(x + cell / 2) + 0.5, Math.round(y + cell / 2) + 0.5);
      }
    }
    // ONE band at a time: the district you are standing in, its shape as a
    // hairline and its weather written along the edge. Nothing else in the field
    // is ruled — when you cross a boundary the band moves with you, and the
    // weather you carried decides what is written on the one you enter.
    if (fk < 0.98 && here >= 0) {
      const fade = 1 - fk;
      drawShape(g, here, alpha * fade * 0.34);
      drawBand(g, here, alpha * fade * 0.66);
    }
    drawGates(g, alpha);
    crosshair(g, S.walker, alpha * 0.95, 'rgba(190,196,204,.9)');
    if (S.decodeCell != null) crosshair(g, S.field.cells[S.decodeCell], alpha, 'rgba(220,224,230,.95)', true);
    ctx.restore();
  }

  // A gate is a mark in the city, not a widget: a hairline ring in the cell, a
  // second ring when lit. It is only visible in ENTERED (state through world).
  function drawGates(g, alpha) {
    const cell = g.cell;
    ctx.save();
    ctx.lineWidth = 1;
    for (const gt of S.gates) {
      const x = g.dst.x + (gt.cx - g.win.ox) * cell, y = g.dst.y + (gt.cy - g.win.oy) * cell;
      if (x < g.dst.x - cell || y < g.dst.y - cell || x > g.dst.x + g.dst.w || y > g.dst.y + g.dst.h) continue;
      const lit = S.lit[gt.i];
      const sight = C.gateKind(gt.i) === 'sight';
      const cxm = x + cell / 2, cym = y + cell / 2, r = cell * 0.30;
      ctx.globalAlpha = alpha * (lit ? 0.95 : sight ? 0.7 : 0.55);
      ctx.strokeStyle = lit ? 'rgb(214,220,228)' : (sight ? 'rgb(190,196,204)' : 'rgb(120,128,138)');
      // a threshold that has not been seen through is a BROKEN ring: the shape
      // of the mark is the instruction, and it is the only instruction there is.
      if (sight && !lit) ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.arc(cxm, cym, r, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      if (S.refuse && S.refuse.i === gt.i) {            // the step was held: one flare, no words
        const ph = Math.min(1, (S.refuse.phase || 0) / 3);
        ctx.globalAlpha = alpha * 0.5 * (1 - ph);
        ctx.beginPath(); ctx.arc(cxm, cym, r * (1 + ph * 2.2), 0, Math.PI * 2); ctx.stroke();
      }
      if (lit) {
        ctx.fillStyle = 'rgba(214,220,228,.85)';
        ctx.beginPath(); ctx.arc(cxm, cym, Math.max(1.2, r * 0.32), 0, Math.PI * 2); ctx.fill();
        if (S.pulse && S.pulse.i === gt.i) {                    // one-shot: the light arrives
          const ph = Math.min(1, (S.pulse.phase || 0) / 3);
          ctx.globalAlpha = alpha * 0.55 * (1 - ph);
          ctx.beginPath(); ctx.arc(cxm, cym, r * (1 + ph * 1.8), 0, Math.PI * 2); ctx.stroke();
        }
      } else {
        ctx.globalAlpha = alpha * 0.4;
        ctx.beginPath(); ctx.moveTo(cxm - r * 1.5, cym); ctx.lineTo(cxm - r * 0.9, cym); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cxm + r * 0.9, cym); ctx.lineTo(cxm + r * 1.5, cym); ctx.stroke();
      }
    }
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

  // ── the two diagetic instruments on the frame ─────────────────────────────
  // The eight lamps ARE the meter: one variable, eight notches scratched on the
  // frame's lower edge. Unlit = a hairline; lit = a filled tick. Nothing else on
  // the page says how far the walk has understood.
  function lampRects(d) {
    const n = Math.max(1, S.gates.length || C.GATES);
    const w = Math.min(9, Math.max(5, (d.w * 0.34) / n));
    const gap = Math.max(2, w * 0.55);
    const total = n * w + (n - 1) * gap;
    const x0 = d.x + 8, y = d.y + d.h - 7;
    const out = [];
    for (let i = 0; i < n; i++) out.push({ x: x0 + i * (w + gap), y, w, h: 3, total, x0 });
    return out;
  }
  // Each mark is laid twice: a pad shadow, then the ink. That is what keeps a
  // hairline legible over a bright painting without putting a panel behind it.
  function inkRect(x, y, w, h, alpha, colour) {
    ctx.globalAlpha = 0.55; ctx.fillStyle = 'rgb(8,12,18)';
    ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, Math.round(w) + 2, Math.round(h) + 2);
    ctx.globalAlpha = alpha; ctx.fillStyle = colour;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
  function drawLamps(d) {
    const rs = lampRects(d);
    ctx.save();
    for (let i = 0; i < rs.length; i++) {
      const r = rs[i], lit = S.lit && S.lit[i];
      if (lit) { inkRect(r.x + r.w / 2 - 0.5, r.y - 4, 1, 3, 0.6, 'rgb(214,220,228)'); }
      inkRect(r.x, r.y + (lit ? 0 : 1), r.w, lit ? 3 : 1, lit ? 0.98 : 0.34, lit ? 'rgb(214,220,228)' : 'rgb(150,158,168)');
    }
    ctx.restore();
  }
  const DISTANCES = ['FAR', 'NEAR', 'ENTERED', 'EXITED'];
  function notchRect(d) {
    const w = 34, h = 26;
    return { x: d.x + d.w - w - 2, y: d.y + d.h - h - 2, w, h };
  }
  function drawNotch(d) {
    const r = notchRect(d), cur = DISTANCES.indexOf(S.distance);
    ctx.save();
    for (let i = 0; i < 4; i++) {
      const x = r.x + r.w - 6 - (3 - i) * 5, y = r.y + r.h - 6;
      const lit = i === cur;
      inkRect(x, y - (lit ? 7 : 3), 1, lit ? 8 : 4, lit ? 0.95 : 0.28, lit ? 'rgb(214,220,228)' : 'rgb(150,158,168)');
    }
    ctx.restore();
  }

  // ── the three doors (a gate's answer, thumb-sized) ────────────────────────
  // The one place the instrument paints a WORD larger than a cell: a phone
  // cannot hold "mindfulness" in a 30px room, and an answer you cannot read is
  // not a check. The doors are drawn in the same ink, inside the same frame.
  function doorRects() {
    if (!S.gate) return [];
    const FH = fieldH();
    const n = S.gate.options.length;
    if (!n) return [];
    const maxW = Math.min(W - 24, 520);
    const gap = 6;
    const w = (maxW - gap * (n - 1)) / n;
    const h = 30;
    const x0 = (W - maxW) / 2, y = FH - h - 8;
    const out = [];
    for (let i = 0; i < n; i++) out.push({ x: x0 + i * (w + gap), y, w, h, i });
    return out;
  }
  function drawDoors() {
    const rs = doorRects();
    if (!rs.length) return;
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(79,87,96,.55)'; ctx.lineWidth = 1;
    for (const r of rs) {
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = 'rgba(8,12,18,.86)';
      ctx.fillRect(Math.round(r.x), Math.round(r.y), Math.round(r.w), Math.round(r.h));
      ctx.strokeRect(Math.round(r.x) + 0.5, Math.round(r.y) + 0.5, Math.round(r.w) - 1, Math.round(r.h) - 1);
      const word = S.gate.options[r.i];
      let size = 10;
      ctx.font = size + 'px ' + MONO;
      while (size > 7 && ctx.measureText(word).width > r.w - 10) { size--; ctx.font = size + 'px ' + MONO; }
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = 'rgb(190,196,204)';
      ctx.fillText(word, Math.round(r.x + r.w / 2), Math.round(r.y + r.h / 2) + 0.5);
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = 'rgb(79,87,96)';
      ctx.font = '7px ' + MONO;
      ctx.fillText(String(r.i + 1), Math.round(r.x + 7), Math.round(r.y + 7));
    }
    ctx.restore();
  }

  // ── the foot strip (the world's voice) ────────────────────────────────────
  function wrapText(text, maxW, size) {
    ctx.font = size + 'px ' + MONO;
    const words = String(text).split(/\s+/).filter(Boolean);
    const lines = [];
    let cur = '';
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
    }
    if (cur) lines.push(cur);
    return lines.slice(0, 3);
  }
  function voiceLines() {
    if (S.decodeCell != null && S.field) return decodeLines();
    if (!S.voice) return [];
    const size = 9.5;
    const out = [];
    for (const raw of S.voice.lines) {
      for (const l of wrapText(raw, W - 26, size)) out.push(l);
    }
    return out.slice(0, 3);
  }
  function drawVoice() {
    const lines = voiceLines();
    if (!lines.length) return;
    ctx.save();
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.font = '9.5px ' + MONO;
    // the strip hangs from the frame's own lower edge when the frame is small
    const d = S.field ? geoFor(S.distance).dst : null;
    const y0 = d ? Math.min(H - VOICE_H + 7, d.y + d.h + 11) : H - VOICE_H + 7;
    for (let i = 0; i < lines.length; i++) {
      const emph = i === 0 && S.voice && S.voice.kind === 'gate';
      ctx.globalAlpha = i === 0 ? (emph ? 0.92 : 0.78) : 0.6;
      ctx.fillStyle = emph ? 'rgb(214,220,228)' : 'rgb(150,158,168)';
      ctx.fillText(lines[i], 13, y0 + i * 13);
    }
    ctx.restore();
  }

  // ── the draw loop ─────────────────────────────────────────────────────────
  // The rise: two ways of drawing the same field, held between. The rooms you
  // stand in dissolve, the field you can see resolves, and one district's shape
  // comes up out of it with its weather written along the edge.
  function drawRise(g, alpha, k) {
    const p = S.rise.p;
    drawPainting(S.img, g.src, g.dst, g.imgA);
    if (k < 0.995) drawEntered(g, alpha * (1 - k), { p, k });
    drawNear(g, alpha * k, null, null, { p, k });
    frame(g.dst);
    drawShape(g, p, alpha * 0.5 * k);
    drawBand(g, p, alpha * 0.95 * Math.max(0, (k - 0.45) / 0.55));
  }

  function draw() {
    ctx.fillStyle = 'rgb(8,12,18)';
    ctx.fillRect(0, 0, W, H);
    if (!S.img) { drawVoice(); return; }
    if (S.rise) {
      const g = geoRise(S.rise.k);
      drawRise(g, 1, S.rise.k);
      const d = geoEntered().dst;                       // the frame's instruments hold still
      drawMatte();
      drawLamps(d);
      drawNotch(d);
      drawVoice();
      return;
    }
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
      if (t >= 1) { S.trans = null; frame(to.dst); }
    }
    const d = geoFor(S.distance);
    drawMatte();
    drawLamps(d.dst);
    drawNotch(d.dst);
    drawDoorStrip();
    drawTitle(d.dst);
    drawVoice();
  }

  // The matte: the painting fades into the pad at the two edges that carry
  // text, so a hairline line is legible over a bright painting without putting
  // a panel behind it. No blur, two gradients, nothing else.
  function drawMatte() {
    const top = ctx.createLinearGradient(0, 0, 0, 54);
    top.addColorStop(0, 'rgba(8,12,18,.88)');
    top.addColorStop(1, 'rgba(8,12,18,0)');
    ctx.fillStyle = top; ctx.fillRect(0, 0, W, 54);
    const bot = ctx.createLinearGradient(0, H - VOICE_H - 18, 0, H);
    bot.addColorStop(0, 'rgba(8,12,18,0)');
    bot.addColorStop(0.45, 'rgba(8,12,18,.86)');
    bot.addColorStop(1, 'rgba(8,12,18,.96)');
    ctx.fillStyle = bot; ctx.fillRect(0, H - VOICE_H - 18, W, VOICE_H + 18);
  }

  function inkText(str, x, y, alpha, size, align) {
    ctx.textAlign = align || 'left'; ctx.textBaseline = 'top';
    ctx.font = (size || 8.5) + 'px ' + MONO;
    ctx.globalAlpha = 0.5; ctx.fillStyle = 'rgb(8,12,18)';
    ctx.fillText(str, Math.round(x) + 1, Math.round(y) + 1);
    ctx.globalAlpha = alpha; ctx.fillStyle = 'rgb(190,196,204)';
    ctx.fillText(str, Math.round(x), Math.round(y));
  }
  function drawTitle(d) {
    if (S.distance !== 'FAR' && S.distance !== 'EXITED') return;
    ctx.save();
    inkText('SLEEPER // LADDER', d.x + 8, d.y + 7, 0.85);
    if (S.distance === 'FAR' && !S.revealed) inkText('tap to resolve', d.x + d.w - 8, d.y + 7, 0.7, 8.5, 'right');
    ctx.restore();
  }

  // doors are drawn after the world so they read as the city's own thresholds
  function drawDoorStrip() { if (S.distance === 'ENTERED') drawDoors(); }

  // rAF only while something is actually moving: a transition, a held shimmer,
  // a held rise, or a one-shot pulse. Nothing animates unasked.
  let rafId = 0;
  function frameLoop(ts) {
    rafId = 0;
    let live = false;
    if (S.rise) {
      if (S.rise.t0 == null) S.rise.t0 = ts;
      const raw = Math.min(1, Math.max(0, (ts - S.rise.t0) / RISE_MS));
      // reduced motion: the same act in three still steps, never a sweep
      S.rise.k = reduced ? (raw >= 1 ? 1 : Math.floor(raw * 3) / 3) : raw;
      if (C.riseMet(S.rise.k)) riseComplete(); else live = true;
    }
    if (S.trans) {
      if (S.trans.ts == null) { S.trans.t0 = ts; S.trans.ts = ts; }
      S.trans.ts = ts;
      const moving = S.trans.dur === 0 ? false : (ts - S.trans.t0) < S.trans.dur;
      live = live || moving;
      if (!moving) S.trans = null;
    }
    if (S.hold) { S.hold.phase = Math.floor((ts - (S.hold.t0 || ts)) / 130); live = true; }
    if (S.pulse) {
      if (!S.pulse.t0) S.pulse.t0 = ts;
      S.pulse.phase = Math.floor((ts - S.pulse.t0) / 90);
      if (S.pulse.phase >= 3) S.pulse = null; else live = true;
    }
    if (S.refuse) {
      if (S.refuse.t0 == null) S.refuse.t0 = ts;
      S.refuse.phase = Math.floor((ts - S.refuse.t0) / 90);
      if (S.refuse.phase >= 3) S.refuse = null; else live = true;
    }
    draw();
    if (live) rafId = requestAnimationFrame(frameLoop);
  }
  function wake() { if (!rafId) rafId = requestAnimationFrame(frameLoop); }

  // ── chrome (there is almost none; it is announced, not drawn) ─────────────
  function announce(text) { if (el.live) el.live.textContent = text; }
  function updateChrome() {
    if (S.error) { announce('gap: ' + S.error); return; }
    if (!S.field) { announce('loading the painting and the source'); return; }
    const g = S.gates.filter((x, i) => S.lit[i]).length;
    announce(S.distance.toLowerCase() + ' · ' + g + ' of ' + S.gates.length + ' gates lit · ' +
      (S.voice && S.voice.lines.length ? S.voice.lines[0] : 'the field'));
  }
  function say(lines, kind, ttl) {
    S.voice = { lines: lines.filter(Boolean), kind: kind || 'line', ttl: ttl == null ? 8 : ttl };
    updateChrome();
  }

  // ── distance ──────────────────────────────────────────────────────────────
  function setDistance(d, silent) {
    if (!S.field && (d === 'NEAR' || d === 'ENTERED')) { say(['GAP — the city needs both sources; nothing is faked here.'], 'gap', Infinity); draw(); return false; }
    if (d === S.distance) return false;
    if (d === 'EXITED') buildExit();
    S.decodeCell = null; S.gate = null; S.rise = null; S.refuse = null;
    S.trans = { from: S.distance, to: d, dur: reduced ? 0 : 700, t0: 0, ts: null };
    S.distance = d;
    if (!silent) S.revealed = true;
    if (d === 'ENTERED') districtEnter(S.walker.unit.p, true);
    if (d === 'EXITED') exitVoice();
    if (d === 'FAR' && !silent) S.voice = null;
    updateChrome();
    wake(); if (reduced) draw();
    return true;
  }
  function advance() {
    if (S.distance === 'ENTERED') { setDistance('EXITED'); return; }
    if (S.distance === 'EXITED') { resetRoute(); return; }
    setDistance(DISTANCES[Math.min(3, DISTANCES.indexOf(S.distance) + 1)]);
  }
  function resetRoute() {
    S.moves = []; S.exitCache = null; S.exitCanvas = null;
    S.walker = S.field ? S.field.start : null;
    S.gate = null; S.strikes = new Uint8Array(S.gates.length); S.lastP = -1;
    S.seen = new Uint8Array(S.gates.length); S.rise = null; S.refuse = null; S.lineSaid = -1;
    if (S.field) S.weather = C.weatherChain(S.field, []);
    setDistance('FAR');
    say(['the painting is back to its own bytes'], 'line', 5);
    draw();
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
      if (S.distance === 'EXITED') { exitVoice(); draw(); }
    });
    draw();
  }
  function exitVoice() {
    const m = S.exitCache && S.exitCache.metrics;
    const lit = S.gates.filter((x, i) => S.lit[i]).length;
    const read = Object.keys(S.ledger.seen || {}).length;
    const parts = ['exited · ' + S.moves.length + ' steps · ' + lit + '/' + S.gates.length + ' gates · ' + read + ' ¶ read'];
    if (m) parts.push('seed ' + routeSeedHex() + ' · mad64 ' + m.mad64.toFixed(4) + ' · ' + (m.sha ? 'sha ' + m.sha.slice(0, 8) : 'sha…') + ' · source ' + S.field.source.fingerprint);
    say([parts.join(' · '), 'tap the painting to return'], 'measure', Infinity);
  }

  // ── the walk ──────────────────────────────────────────────────────────────
  function step(dir) {
    if (!S.field || S.distance !== 'ENTERED') return false;
    if (S.rise) return false;                                   // the act has the floor
    const next = C.step(S.field, S.walker, dir);
    if (!next) { say(['wall — the painting’s edge says no'], 'wall', 3); draw(); return false; }
    // A threshold that has not been seen through does not open, and it does not
    // argue: the step simply does not happen and the ring flares once.
    const gate = S.gates.find((g) => g.n === next.n);
    if (gate && !C.gateAdmits(C.gateKind(gate.i), S.seen[gate.i])) {
      S.refuse = { i: gate.i, t0: null, phase: 0 };
      if (el.live) el.live.textContent = 'held · this district has not been seen whole';
      draw(); wake();
      return false;
    }
    S.walker = next;
    S.moves.push(dir);
    S.weather = C.weatherChain(S.field, S.moves);
    if (S.voice && S.voice.ttl !== Infinity && S.voice.kind !== 'gate') S.voice.ttl -= 1;
    if (S.voice && S.voice.ttl <= 0) S.voice = null;
    if (next.n === S.field.start.n && S.moves.length >= 8) {
      say(['origin retrieved — the walk closes where it began'], 'line', 4);
      buildExit();
      updateChrome(); setDistance('EXITED', true); return true;
    }
    districtEnter(next.unit.p);
    gateAt(next);
    updateChrome(); draw();
    return true;
  }

  // ── districts: read once, remembered, surfaced again when it is time ──────
  function districtLine(p, kind, extra) {
    const d = S.source.districts[p];
    if (!d) return null;
    const head = (extra ? extra + ' · ' : '') + '¶' + (d.p + 1) + ' ' + d.chapter + ' · ' + (d.heading || d.page);
    return [head, '“' + d.line + '”'];
  }
  function districtEnter(p, quiet) {
    if (!S.source || S.lastP === p) return;
    S.lastP = p;
    // a line the sight gate already spoke is not spoken twice
    if (S.lineSaid === p) {
      S.lineSaid = -1;
      S.ledger = C.ledgerMark(S.ledger, p, S.source.districts[p].heading);
      saveLedger();
      return;
    }
    const prompt = C.returnPrompt(S.ledger, p, S.source.districts, C.LEDGER_GAP);
    if (prompt) {
      say(districtLine(p, 'prompt', 'you walked this before (' + prompt.ago + ' districts ago)'), 'prompt', quiet ? 14 : 14);
    } else if (!C.ledgerRead(S.ledger, p)) {
      const l = districtLine(p);
      if (l) say(l, 'line', quiet ? 14 : 10);
    } else {
      const l = districtLine(p);
      if (l) say(l, 'line', 8);
    }
    S.ledger = C.ledgerMark(S.ledger, p, S.source.districts[p].heading);
    saveLedger();
  }

  // ── the sight gate: one act, no question ──────────────────────────────────
  // The first gate stands at a district's threshold and refuses the step until
  // the district has been seen whole. There is no prompt: the ring is broken
  // (a mark you can read as "not yet"), the step is held (a flare, no words), and
  // a sustained hold lifts the view to where the district's own shape is legible.
  // When it is, the gate lights and its line is spoken — in the same quiet voice
  // every district speaks in, and not one word before.
  function sightTarget() {
    if (!S.field || !S.walker || S.distance !== 'ENTERED') return null;
    for (const gt of S.gates) {
      if (C.gateKind(gt.i) !== 'sight' || S.seen[gt.i]) continue;
      if (Math.abs(gt.cx - S.walker.cx) + Math.abs(gt.cy - S.walker.cy) <= 1) return gt;
    }
    return null;
  }
  function riseStart(i, auto) {
    const gt = S.gates[i];
    if (!gt || S.distance !== 'ENTERED' || S.seen[gt.i] || S.rise) return false;
    if (C.gateKind(gt.i) !== 'sight') return false;
    S.rise = { i: gt.i, p: gt.p, k: 0, t0: null, auto: !!auto };
    S.decodeCell = null; S.gate = null; S.voice = null;   // the world holds its tongue while you look
    updateChrome(); draw(); wake();
    return true;
  }
  function riseEnd() {
    if (!S.rise || S.rise.auto) return false;
    S.rise = null; draw();
    return true;
  }
  function riseComplete() {
    const r = S.rise;
    if (!r) return;
    S.rise = null;
    S.seen[r.i] = 1; S.lit[r.i] = 1;
    S.pulse = { i: r.i, t0: 0, phase: 0 };
    const l = districtLine(r.p);
    if (l) { say(l, 'line', 14); S.lineSaid = r.p; }       // the reveal, after the act, in the old voice
    S.trans = { from: 'NEAR', to: 'ENTERED', dur: reduced ? 0 : 700, t0: 0, ts: null };
    updateChrome(); wake(); if (reduced) draw();
  }

  // ── the eight gates: the walk asks something of the walker ────────────────
  function gateAt(cell) {
    const gt = S.gates.find((g) => g.n === cell.n);
    if (!gt || S.lit[gt.i] || S.strikes[gt.i] >= 2) { S.gate = null; return; }
    if (C.gateKind(gt.i) === 'sight') { S.gate = null; return; }   // the sight gate is not a question
    const card = C.gateCard(S.source.districts, gt.i, gt.p, S.source.fingerprint);
    if (!card) { S.gate = null; return; }
    S.gate = Object.assign({ i: gt.i }, card);
    say(['gate ' + (gt.i + 1) + '/' + S.gates.length + ' · ¶' + (gt.p + 1) + ' ' + (card.heading || '') + ' — one word is missing',
      '“' + card.cloze + '”'], 'gate', Infinity);
  }
  function answerDoor(i) {
    if (!S.gate) return null;
    const g = S.gate, pick = g.options[i];
    const right = String(pick).toLowerCase() === String(g.answer).toLowerCase();
    if (right) {
      S.lit[g.i] = 1;
      S.gate = null; S.pulse = { i: g.i, t0: 0, phase: 0 };
      say(['lit · ' + g.answer + ' — gate ' + (g.i + 1) + ' of ' + S.gates.length], 'line', 6);
      if (navigator.vibrate) { try { navigator.vibrate(8); } catch (err) { /* no haptics */ } }
    } else {
      S.strikes[g.i] = (S.strikes[g.i] || 0) + 1;
      if (navigator.vibrate) { try { navigator.vibrate(22); } catch (err) { /* no haptics */ } }
      if (S.strikes[g.i] >= 2) {
        S.gate = null;
        say(['the gate stays shut — walk on, or return and come back to it'], 'line', 7);
      } else {
        say(['not that word · “' + g.cloze + '” · one more try'], 'gate', Infinity);
      }
    }
    updateChrome(); draw();
    return { right, answer: g.answer, lit: !!S.lit[g.i] };
  }

  // ── decode (one hold teaches the whole vocabulary) ────────────────────────
  // Drawn in the foot strip, in the same hairline ink: no panel, no box. The
  // decode names the real fields of the real record the cell came from.
  function decodeLines() {
    const cell = S.field.cells[S.decodeCell];
    if (!cell) return [];
    const u = cell.unit, d = S.source.districts[u.p] || {};
    const visited = C.walk(S.field, S.moves).visits[cell.n];
    const hue = cell.hue < 0 ? 'achromatic' : Math.round(cell.hue) + '°';
    const street = cell.wall ? 'wall' : (S.field.reach[cell.n] ? 'street' : 'closed pocket');
    // the district's weather, and the one you carried into it: the two halves of
    // the only mechanism on this page that is not about you
    const w = weatherFor(u.p), carry = S.weather ? S.weather.carry : null;
    return [
      '¶' + (u.p + 1) + ' ' + (d.chapter || '') + ' · ' + street + ' (' + cell.cx + ',' + cell.cy + ') · building ' + (u.s + 1) + '/' + (d.sentences || '?') + ' · room ' + (u.w + 1) +
        ' · material “' + (cell.material === ' ' ? 'blank' : cell.material) + '” · ' + (w || 'clear') + (carry && carry !== w ? ' (carried ' + carry + ' in)' : '') + ' · visits ' + visited,
      '“' + (d.line || '') + '”',
      (d.heading || '') + ' · ' + norm(cell).toFixed(2) + ' of the painting’s range · edge ' + cell.edge.toFixed(3) + ' · ' + hue,
    ];
  }
  function openDecode(cell) {
    if (!cell) return null;
    S.decodeCell = cell.n;
    draw();
    return cell.n;
  }
  function closeDecode() { S.decodeCell = null; draw(); }

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
  function localXY(e) {
    const r = cv.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function hit(rect, p) { return p.x >= rect.x && p.x <= rect.x + rect.w && p.y >= rect.y && p.y <= rect.y + rect.h; }
  function doorFromEvent(e) {
    const p = localXY(e);
    for (const r of doorRects()) if (hit(r, p)) return r.i;
    return -1;
  }
  cv.addEventListener('pointerdown', (e) => {
    if (!S.field) return;
    try { if (cv.setPointerCapture && e.pointerId != null) cv.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointer */ }
    S.drag = { x: e.clientX, y: e.clientY, moved: false, axis: null };
    const cell = cellFromEvent(e);
    // touch the broken ring: the rise begins under the thumb, and the same hold
    // that decodes a room now lifts the whole district into view. Holding where
    // you stand at a blocked threshold is the same act — that is what a person
    // does when the way is held, and the instrument should not punish it.
    if (cell && S.distance === 'ENTERED') {
      const sight = S.gates.find((g) => C.gateKind(g.i) === 'sight' && !S.seen[g.i]);
      if (sight) {
        const onRing = cell.n === sight.n;
        const atThreshold = cell.n === S.walker.n && Math.abs(sight.cx - S.walker.cx) + Math.abs(sight.cy - S.walker.cy) <= 1;
        if (onRing || atThreshold) { riseStart(sight.i, false); return; }
      }
    }
    if (cell && (S.distance === 'NEAR' || S.distance === 'ENTERED') && !reduced) S.hold = { cx: cell.cx, cy: cell.cy, phase: 0, t0: 0 };
    clearTimeout(S.holdTimer);
    S.holdTimer = setTimeout(() => {
      if (!S.drag) return;
      const c2 = cellFromEvent({ clientX: S.drag.x, clientY: S.drag.y });
      if (c2) { S.drag.moved = true; openDecode(c2); }
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
  function endPointer() { clearTimeout(S.holdTimer); S.hold = null; S.drag = null; wake(); draw(); }
  cv.addEventListener('pointerup', (e) => {
    const wasMoved = S.drag && S.drag.moved;
    const p = localXY(e);
    const wasRising = !!S.rise;
    endPointer();
    if (wasRising) {                                   // let go early: the district settles back
      riseEnd();
      if (e && e.pointerId != null && cv.releasePointerCapture) { try { cv.releasePointerCapture(e.pointerId); } catch (err) { /* released */ } }
      return;
    }
    if (wasMoved) {
      if (e && e.pointerId != null && cv.releasePointerCapture) { try { cv.releasePointerCapture(e.pointerId); } catch (err) { /* released */ } }
      return;
    }
    // 1. a door, if a gate is open (the only thumb-sized answer)
    if (S.gate && S.distance === 'ENTERED') {
      const di = doorFromEvent(e);
      if (di >= 0) { answerDoor(di); if (e && e.pointerId != null && cv.releasePointerCapture) { try { cv.releasePointerCapture(e.pointerId); } catch (err) { /* released */ } } return; }
    }
    // 2. the frame's distance corner
    const g = geoFor(S.distance);
    if (hit(notchRect(g.dst), p)) { advance(); if (e && e.pointerId != null && cv.releasePointerCapture) { try { cv.releasePointerCapture(e.pointerId); } catch (err) { /* released */ } } return; }
    // 3. the world itself
    if (S.distance === 'FAR') setDistance('NEAR');
    else if (S.distance === 'NEAR') setDistance('ENTERED');
    else if (S.distance === 'ENTERED') { const c = cellFromEvent(e); if (c) openDecode(c); }
    else if (S.distance === 'EXITED') resetRoute();
    if (e && e.pointerId != null && cv.releasePointerCapture) { try { cv.releasePointerCapture(e.pointerId); } catch (err) { /* released */ } }
  });
  cv.addEventListener('pointercancel', endPointer);
  cv.addEventListener('contextmenu', (e) => e.preventDefault());

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (S.rise) { S.rise = null; draw(); return; } closeDecode(); if (S.gate) { S.gate = null; draw(); } return; }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      // a keyboard cannot hold: one press begins the same sustained look
      const st = sightTarget();
      if (st) { riseStart(st.i, true); return; }
      advance(); return;
    }
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
  function routeSeedHexFor(mvs) {
    return ('00000000' + C.routeSeed(S.paintingTag, mvs).toString(16)).slice(-8);
  }
  function routeSeedHex() { return routeSeedHexFor(S.moves); }
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
  function pairwise(movesA, movesB) {
    if (!S.rgba) return Promise.reject(new Error('not ready'));
    const A = C.recompose(S.rgba, S.iw, S.ih, S.field, Array.isArray(movesA) ? movesA : String(movesA || '').split(''));
    const B = C.recompose(S.rgba, S.iw, S.ih, S.field, Array.isArray(movesB) ? movesB : String(movesB || '').split(''));
    return Promise.all([sha256(A.rgba), sha256(B.rgba)]).then(([shaA, shaB]) => ({
      witnessA: C.routeString(movesA), witnessB: C.routeString(movesB),
      identicalPixels: shaA === shaB, shaA, shaB,
      mad64: +C.mad64(C.downscale64(A.rgba, S.iw, S.ih), C.downscale64(B.rgba, S.iw, S.ih)).toFixed(6),
      changedPx: C.changedPx(A.rgba, B.rgba),
    }));
  }
  // Probe-only: the shortest U/D/L/R route from the walker to a cell, using the
  // core's own step() so the answer is a walk the instrument would accept. The
  // harness walks it with real keys; the page never calls it.
  function routeTo(target) {
    if (!S.field || !S.walker) return null;
    const want = typeof target === 'number' ? target : (target && S.gates[target] ? S.gates[target].n : null);
    if (want == null) return null;
    const prev = new Int32Array(C.CELLS).fill(-1);
    const dirOf = new Array(C.CELLS).fill('');
    const q = [S.walker.n];
    prev[S.walker.n] = S.walker.n;
    const D = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
    while (q.length) {
      const n = q.shift();
      if (n === want) break;
      const cx = n % C.COLS, cy = (n / C.COLS) | 0;
      for (const k of ['R', 'D', 'L', 'U']) {
        const x = cx + D[k][0], y = cy + D[k][1];
        if (x < 0 || y < 0 || x >= C.COLS || y >= C.ROWS) continue;
        const m = y * C.COLS + x;
        if (prev[m] !== -1 || S.field.cells[m].wall || !S.field.reach[m]) continue;
        prev[m] = n; dirOf[m] = k; q.push(m);
      }
    }
    if (prev[want] === -1) return null;
    const out = [];
    let cur = want;
    while (cur !== S.walker.n) { out.push(dirOf[cur]); cur = prev[cur]; }
    return out.reverse().join('');
  }

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
      distance: S.distance, ready: !!S.ready, error: S.error,
      witness: C.routeString(S.moves), moves: S.moves.slice(),
      walker: S.walker ? { x: S.walker.cx, y: S.walker.cy, p: S.walker.unit.p } : null,
      seed: routeSeedHex(), tag: S.paintingTag,
      painting: { id: C.PAINTING_ID, sha256: C.PAINTING_SHA256, w: S.iw, h: S.ih, src: PAINTING_SRC },
      source: S.field ? {
        path: C.SOURCE_PATH, fingerprint: S.field.source.fingerprint, sha256: S.field.source.sha256,
        counts: S.field.source.counts, drawn: S.field.drawn, districts: S.source.districts.length,
      } : null,
      field: S.field ? { cells: S.field.cells.length, walkable: S.field.walkable, reachable: S.field.reachable, cutQ: S.field.cutQ } : null,
      gates: S.gates.map((g, i) => ({ i: g.i, x: g.cx, y: g.cy, p: g.p, dist: g.dist, lit: !!S.lit[i], strikes: S.strikes[i] })),
      gate: S.gate ? { i: S.gate.i, p: S.gate.p, cloze: S.gate.cloze, answer: S.gate.answer, options: S.gate.options.slice() } : null,
      doors: doorRects().length,
      lit: Array.from(S.lit || []).reduce((n, v) => n + v, 0),
      ledger: S.ledger ? { seq: S.ledger.seq, read: Object.keys(S.ledger.seen).length, seen: S.ledger.seen } : null,
      voice: S.voice ? { kind: S.voice.kind, lines: S.voice.lines.slice() } : null,
      decode: S.decodeCell,
      // what the city is under, and what you are carrying: the chain, not a value
      weather: S.weather ? {
        carry: S.weather.carry,
        p: S.weather.steps.length ? S.weather.steps[S.weather.steps.length - 1].p : null,
        here: S.weather.steps.length ? S.weather.steps[S.weather.steps.length - 1].weather : null,
        steps: S.weather.steps.map((s) => ({ p: s.p, in: s.carryIn, out: s.weather })),
      } : null,
      sight: S.gates.length ? {
        p: S.gates[0].p, kind: C.gateKind(0), seen: !!S.seen[0],
        rise: S.rise ? { k: +S.rise.k.toFixed(3), p: S.rise.p, i: S.rise.i } : null,
      } : null,
    };
  }
  window.SleeperLadder = Object.freeze({
    version: C.version,
    ready,
    state,
    setDistance,
    advance,
    step,
    reset: resetRoute,
    answer: answerDoor,
    gateAt: (n) => { const c = S.field && S.field.cells[n]; if (c) gateAt(c); return state().gate; },
    prompt: (p) => C.returnPrompt(S.ledger, p, S.source.districts, C.LEDGER_GAP),
    districtAt: (p) => (S.source.districts[p] || null),
    ledger: () => (S.ledger ? JSON.parse(JSON.stringify(S.ledger)) : null),
    clearLedger: () => { S.ledger = C.emptyLedger(); saveLedger(); return S.ledger; },
    measure: (routes) => Promise.all((routes || [['R', 'D']]).map(measureRoute)),
    measureRoute,
    pairwise,
    greedy,
    routeTo,
    gateRoute: (i) => routeTo(S.gates[i] ? S.gates[i].n : null),
    decode: (n) => { const c = S.field && S.field.cells[n]; return c ? openDecode(c) : null; },
    closeDecode,
    // the sight gate's act, the city's weather, and the shape it is written on
    rise: (i) => riseStart(i == null ? 0 : i, true),
    riseEnd,
    adjacentSight: () => { const t = sightTarget(); return t ? { i: t.i, p: t.p, x: t.cx, y: t.cy } : null; },
    weatherOf: (p) => weatherFor(p),
    weatherInk: (p) => bandMarks(geoFor('ENTERED'), p == null ? (S.walker ? S.walker.unit.p : 0) : p),
    shape: (p) => (S.field && S.field.edges[p] ? S.field.edges[p].map((s) => s.slice()) : null),
    voice: () => voiceLines(),
    doors: () => doorRects().map((r) => ({ i: r.i, x: r.x, y: r.y, w: r.w, h: r.h })),
    layout: () => ({ w: W, h: H, voiceH: VOICE_H }),
    fieldStats: () => S.field ? {
      cutQ: S.field.cutQ, cut: +S.field.cut.toFixed(5), walkable: S.field.walkable, reachable: S.field.reachable,
      lumRange: { min: +S.field.lum.min.toFixed(4), max: +S.field.lum.max.toFixed(4) },
      drawn: S.field.drawn, sourceCounts: S.field.source.counts, start: { x: S.field.start.cx, y: S.field.start.cy },
      fingerprint: S.field.source.fingerprint, matter: S.source.matter.length, districts: S.source.districts.length,
      gates: S.gates.length,
    } : null,
  });

  fit();
  draw();
  updateChrome();
})();
