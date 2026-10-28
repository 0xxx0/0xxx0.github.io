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
//            district — nothing here is assigned. THE EIGHT GATES ARE THE EIGHT
//            PATH FACTORS, in the doctrine's own order; five are thresholds you
//            cannot pass until you have DONE the factor (seen, let go, said
//            none, walked, gone back, stayed), two ask one word of the text's
//            own sentence, and the walk is paid for in breath.
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
// 0.4.0 — the answers to the first walk, and nothing else:
//   the walk up   walls wear their FACE now (the painting's ridge was always
//                 there; it was drawn as floor), a refused step marks the edge
//                 that refused and names the sides still open, and the wall you
//                 hit is a block whose height is its own measured edge
//   the eye       two fingers (or a held press on the distance corner) stand you
//                 inside the field: a ground-plane projection of the same cells,
//                 the same walls, the same gates, with the city's far edge as
//                 the horizon. Hold raises the eye line; the horizon never moves
//   the reading   the ring seam where "now" sits: a hairline ring on your cell
//                 whose arc is your place in the district's own text order,
//                 revealed on the same hold that decodes a room
//   the note      one crop-mark at the frame's top-left (or #note) sets the
//                 field note over the field, verbatim, and puts it away on tap
// 0.5.0 — the eight gates become the eight path factors, and the walk costs:
//   the binding  gate i asks factor i (right view … right concentration), quoted
//                from the paragraph where the text gives that factor's own
//                account, with its locator. Where the city kept the paragraph,
//                the gate speaks the room it stands in.
//   the acts     right view = hold until the shape resolves (0.4.0, unchanged);
//                right thought = let go of the three wrong thoughts, one hold
//                each; right speech = say none of the four, keep off the ring;
//                right effort = the four endeavours, four steps; right
//                mindfulness = go back onto ground you have walked; right
//                concentration = stay still on one point.
//   the stake    breath = the city's own sentences + its own paragraphs (78).
//                Every step spends one; a failed gate spends three. At zero the
//                walk ends where it stands. Nothing refills inside a walk.
// No route, no panel, no persistent control: one toggle and one reveal.
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
  const HOLD_MS = 340;                               // dwell that opens a decode
  const RISE_MS = 1400;                              // sustained attention that sees a district whole
  const VOICE_H = 50;                                // the foot strip (3 lines)
  const LETGO_MS = 620;                              // one wrong thought, held until it goes
  const SPEECH_MS = 700;                             // one wrong speech, unsaid
  const STAY_MS = 2400;                              // one point, kept
  const RIDE_MS = 800;                               // hold past the decode = the line rides
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
    // 0.5.0 — the eight factors, the act a gate asks, and the breath that pays for the walk
    factors: null, act: null, breath: null, breathMax: null, ended: null, visited: new Set(),
    // 0.4.0 — the eye, the block, and one note
    fpv: false,        // the first-person view of the same field (a toggle, no chrome)
    eyeK: 0,           // how far the eye has been raised by a held press
    eyeDir: 0,         // +1 raising while held, 0 settling
    block: null,       // the edge the city just refused: {n, dir}
    note: false,       // the field note (a reveal, no chrome)
    pointers: 0,       // two fingers = the view; measured, never a button
    // 0.6.0 — the wave: a held line rides at its own pace; release at the end
    ride: null, rideTimer: 0, rides: {}, loop: false,
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
      S.visited = new Set([S.field.start.n]);
      S.paintingTag = C.tag8(C.PAINTING_ID + C.PAINTING_SHA256);
      // the gate layer: eight factors, eight gates, placed ON this city by the
      // walk's own distance field inside the breath the text allows
      S.factors = S.source.factors;
      S.breathMax = C.breathBudget(S.source.counts);
      S.breath = S.breathMax;
      const placed = C.placeFactors(S.field, S.factors, S.breathMax);
      S.gates = placed.gates;
      S.lit = new Uint8Array(S.gates.length);
      S.strikes = new Uint8Array(S.gates.length);
      S.seen = new Uint8Array(S.gates.length);      // the gate's act is done
      S.weather = C.weatherChain(S.field, S.moves);
      S.ledger = loadLedger();
      S.rides = S.ledger.rides || {};
      S.taughtRide = !!S.ledger.taught;
      S.ledger.seq = S.ledger.seq || 0;
      paintProvenance();
      S.edgeMax = 0;
      for (const c of S.field.cells) if (c.edge > S.edgeMax) S.edgeMax = c.edge;
      S.ready = true;
      fit(); updateChrome(); draw();
      readHash();
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
  // #note and #fpv are the two deep links into the same two reveals the corner
  // holds open — nothing is added to the page for them.
  window.addEventListener('hashchange', () => { if (S.ready) readHash(); });
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
  // FPV is the same window, stood in. The camera is on the walker's own cell
  // (its centre is under your feet), the eye is `eye` cell-heights up, and the
  // view is the whole field area — the horizon has to be the city's far edge,
  // not the top of a crop. `cell` is only a nominal size for the marks that are
  // drawn in screen space; the field itself is drawn by the projection.
  function geoFpv() {
    const FH = fieldH();
    const eye = C.FPV.eye + (C.FPV.eyeHigh - C.FPV.eye) * Math.max(0, Math.min(1, S.eyeK));
    const lay = C.fpvLayout(W, FH, eye);
    return {
      kind: 'fpv', cell: lay.f / 7, win: null,
      src: { x: 0, y: 0, w: S.iw, h: S.ih },
      dst: { x: 0, y: 0, w: W, h: FH }, imgA: 0, glyphA: 1,
      lay, camX: S.walker.cx + 0.5, camY: S.walker.cy + 0.5,
    };
  }
  function geoExit() { const g = geoFar(); g.imgA = 1; g.glyphA = 0; return g; }
  const geoFor = (d) => (d === 'FAR' ? geoFar() : d === 'NEAR' ? geoNear() : d === 'ENTERED' ? (S.fpv ? geoFpv() : geoEntered()) : geoExit());
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
    drawWalls(g, alpha, x0, y0, x1, y1);
    drawGates(g, alpha);
    crosshair(g, S.walker, alpha * 0.95, 'rgba(190,196,204,.9)');
    drawHead(g, alpha, 'flat');
    if (S.decodeCell != null) crosshair(g, S.field.cells[S.decodeCell], alpha, 'rgba(220,224,230,.95)', true);
    ctx.restore();
  }

  // ── walls are walls ───────────────────────────────────────────────────────
  // 0.3.0 drew a wall as a slightly warmer floor: 675 cells of the painting's own
  // strong edges, indistinguishable from a room, so walking north stopped for no
  // visible reason. A wall now wears its FACE — the one side that meets ground you
  // could walk on — as a hairline. An interior wall has no face and stays quiet;
  // the city's rim gets its line from the frame. What you see is what you can walk.
  const FACE_INK = { N: [0, 0, 1, 0], S: [0, 1, 1, 1], W: [0, 0, 0, 1], E: [1, 0, 1, 1] };
  function drawWalls(g, alpha, cx0, cy0, cx1, cy1) {
    const cell = g.cell;
    ctx.save();
    ctx.lineWidth = 1;
    for (let cy = cy0; cy < cy1; cy++) {
      for (let cx = cx0; cx < cx1; cx++) {
        const c = S.field.cells[cy * C.COLS + cx];
        if (!c.wall) continue;
        const f = C.wallFaces(S.field, c.n);
        if (!f) continue;
        const x = g.dst.x + (cx - g.win.ox) * cell, y = g.dst.y + (cy - g.win.oy) * cell;
        ctx.globalAlpha = alpha * 0.5;
        ctx.strokeStyle = 'rgb(150,158,168)';
        for (const k of ['N', 'E', 'S', 'W']) {
          if (!f[k]) continue;
          const s = FACE_INK[k];
          ctx.beginPath();
          ctx.moveTo(Math.round(x + s[0] * cell) + 0.5, Math.round(y + s[1] * cell) + 0.5);
          ctx.lineTo(Math.round(x + s[2] * cell) + 0.5, Math.round(y + s[3] * cell) + 0.5);
          ctx.stroke();
        }
      }
    }
    // the edge the last step was refused on, marked once, where it happened: the
    // boundary is never just "no" — it is a line you can see and walk along
    const b = S.block;
    if (b) {
      const c = S.field.cells[b.n];
      if (c) {
        const x = g.dst.x + (c.cx - g.win.ox) * cell, y = g.dst.y + (c.cy - g.win.oy) * cell;
        const s = FACE_INK[b.dir] || FACE_INK.N;
        ctx.globalAlpha = alpha * 0.9;
        ctx.strokeStyle = 'rgb(214,220,228)';
        ctx.beginPath();
        ctx.moveTo(Math.round(x + s[0] * cell) + 0.5, Math.round(y + s[1] * cell) + 0.5);
        ctx.lineTo(Math.round(x + s[2] * cell) + 0.5, Math.round(y + s[3] * cell) + 0.5);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // ── the reading head (the ring seam where "now" sits) ─────────────────────
  // THE RING (/rsvp/) reads a source as a game: one ring, its sweep is progress,
  // its seam is where the reading stands. The ladder is a walk, not a clock, so
  // it carries the smallest faithful part of that instrument: a hairline ring on
  // the cell you stand in whose ARC is your position in the district's own text
  // order (cell 47 of 178, row-major — the order the matter was projected in),
  // and whose SEAM is now. It reveals on the same hold that decodes a room; at
  // rest there is no ring, because at rest there is nothing to say about time.
  function headArc(head) {
    return { t: Math.max(0, Math.min(1, head ? head.t : 0)), seam: -Math.PI / 2 + Math.max(0, Math.min(1, head ? head.t : 0)) * Math.PI * 2 };
  }
  function drawHead(g, alpha, mode) {
    const open = S.decodeCell != null || !!S.hold;
    if (!open || !S.walker) return;
    const h = C.readingHead(S.field, S.walker.n);
    if (!h) return;
    const a = headArc(h);
    ctx.save();
    ctx.lineWidth = 1;
    let cx, cy, r, ry;
    if (mode === 'fpv') { cx = W / 2; cy = g.dst.h - 15; r = 11; ry = 4.6; }
    else {
      const cell = g.cell;
      cx = g.dst.x + (S.walker.cx - g.win.ox + 0.5) * cell;
      cy = g.dst.y + (S.walker.cy - g.win.oy + 0.5) * cell;
      r = cell * 0.62; ry = r;              // a ring AROUND the cell, not inside it
    }
    // the seam first: a hairline radius at "now", then the arc that has been read
    ctx.globalAlpha = alpha * 0.9;
    ctx.strokeStyle = 'rgb(214,220,228)';
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a.seam) * (r - 1.5), cy + Math.sin(a.seam) * (ry - 1.5));
    ctx.lineTo(cx + Math.cos(a.seam) * (r + 2.5), cy + Math.sin(a.seam) * (ry + 2.5));
    ctx.stroke();
    ctx.globalAlpha = alpha * 0.62;
    ctx.strokeStyle = 'rgb(150,158,168)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, ry, 0, -Math.PI / 2, -Math.PI / 2 + a.t * Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // ── FPV: the same field, from inside it ───────────────────────────────────
  // The view is the closed-form ground-plane camera in ladder-core (fpvLayout /
  // fpvQuad): the walker's cell is under your feet, the eye is a cell-height up,
  // and the rows of glyphs recede to the city's own far edge, drawn as the
  // horizon. Nothing new is read: every quad is a cell of the same field, every
  // wall its own edge energy (a wall is now a block whose height is its measured
  // edge), every gate its own ring on the ground. Hold raises the eye line; the
  // horizon does not move, so the horizon is the stable law of the view.
  function quadPath(q) {
    ctx.beginPath();
    ctx.moveTo(q.xFL + 0.5, q.yF + 0.5);
    ctx.lineTo(q.xFR + 0.5, q.yF + 0.5);
    ctx.lineTo(q.xNR + 0.5, q.yN + 0.5);
    ctx.lineTo(q.xNL + 0.5, q.yN + 0.5);
    ctx.closePath();
  }
  function edgeNorm(c) {
    const lo = S.field.cut, hi = Math.max(lo + 1e-6, S.edgeMax || lo + 1e-6);
    return Math.max(0, Math.min(1, (c.edge - lo) / (hi - lo)));
  }
  function drawFpv(g, alpha, focus) {
    const lay = g.lay, camX = g.camX, camY = g.camY;
    const fx = focus ? focus.p : -1, fk = focus ? focus.k : 0;
    const FH = g.dst.h;
    // the horizon: the city's far edge. One hairline; above it is the pad.
    ctx.save();
    ctx.strokeStyle = 'rgba(79,87,96,.34)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, Math.round(lay.horizon) + 0.5); ctx.lineTo(W, Math.round(lay.horizon) + 0.5); ctx.stroke();
    ctx.restore();

    const nearRow = Math.floor(camY) - 1;
    for (let cy = 0; cy <= nearRow; cy++) {                 // far -> near: painter's order
      const d = camY - (cy + 0.5);
      if (d > C.FPV.maxDepth) continue;
      const probe = C.fpvQuad(lay, camX, camY, 0, cy);
      if (!probe || probe.yN < lay.horizon - 2 || probe.yF > FH + 2) continue;
      const half = Math.ceil(((W / 2) + 48) * d / lay.f);
      const cx0 = Math.max(0, Math.floor(camX - half)), cx1 = Math.min(C.COLS, Math.ceil(camX + half));
      for (let cx = cx0; cx < cx1; cx++) {
        const c = S.field.cells[cy * C.COLS + cx];
        const q = C.fpvQuad(lay, camX, camY, cx, cy);
        if (!q) continue;
        if (q.xNL > W + 60 || q.xNR < -60) continue;
        let a = alpha * (0.62 + 0.38 * Math.max(0, 1 - q.far / 22));
        if (fx >= 0 && c.unit.p !== fx) a *= 1 - 0.82 * fk;
        if (a <= 0.012) continue;
        const nn = norm(c);
        ctx.globalAlpha = a;
        if (c.wall) {
          // a block: its near face and its top, both measured from the cell's own
          // edge energy — the ridge that used to be invisible is a wall you walk up to
          const hh = 0.22 + 1.15 * edgeNorm(c);
          const dyN = lay.f * hh / q.near, dyF = lay.f * hh / q.far;
          ctx.fillStyle = tone(nn, 10);
          ctx.beginPath();
          ctx.moveTo(q.xNL + 0.5, q.yN + 0.5); ctx.lineTo(q.xNR + 0.5, q.yN + 0.5);
          ctx.lineTo(q.xNR + 0.5, q.yN - dyN + 0.5); ctx.lineTo(q.xNL + 0.5, q.yN - dyN + 0.5);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = tone(nn, 26);
          ctx.beginPath();
          ctx.moveTo(q.xNL + 0.5, q.yN - dyN + 0.5); ctx.lineTo(q.xNR + 0.5, q.yN - dyN + 0.5);
          ctx.lineTo(q.xFR + 0.5, q.yF - dyF + 0.5); ctx.lineTo(q.xFL + 0.5, q.yF - dyF + 0.5);
          ctx.closePath(); ctx.fill();
          ctx.globalAlpha = a * 0.55; ctx.strokeStyle = 'rgb(150,158,168)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(q.xNL + 0.5, q.yN - dyN + 0.5); ctx.lineTo(q.xNR + 0.5, q.yN - dyN + 0.5); ctx.stroke();
          // the block is still made of its character: the material is painted on
          // the face you walk up to, so a wall is a wall of text, not a blank slab
          const fs = Math.min(dyN * 0.72, q.w * 0.8);
          if (fs >= 4) {
            ctx.globalAlpha = a * 0.8;
            ctx.fillStyle = 'rgb(150,158,168)';
            ctx.font = Math.max(5, Math.round(fs)) + 'px ' + MONO;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            const chw = c.material && c.material !== ' ' ? c.material : '#';
            ctx.fillText(chw, Math.round((q.xNL + q.xNR) / 2) + 0.5, Math.round(q.yN - dyN / 2) + 0.5);
          }
        } else {
          ctx.fillStyle = tone(nn, 0);
          quadPath(q); ctx.fill();
          const size = Math.min((q.yN - q.yF) * 0.96, q.wFar * 0.96);
          if (size >= 3.2) {
            // the material is the light in this city: the same ink the plan uses,
            // and it LIES on the ground — squashed by the same foreshortening that
            // squeezes the row, so a character is pavement, not a sign
            const k = Math.max(0.32, Math.min(1, (q.yN - q.yF) / Math.max(1, q.wFar)));
            ctx.globalAlpha = a * 0.92;
            ctx.fillStyle = 'rgb(168,176,186)';
            ctx.font = Math.max(5, Math.round(size)) + 'px ' + MONO;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            const ch = c.material && c.material !== ' ' ? c.material : '·';
            ctx.save();
            ctx.translate(Math.round(q.cx) + 0.5, Math.round(q.cy) + 0.5);
            ctx.scale(1, k);
            ctx.fillText(ch, 0, 0);
            ctx.restore();
          }
        }
      }
    }
    // the one band, on the ground: the district you stand in, its boundary drawn
    // in perspective with its weather stitched along it in the same rhythm
    if (S.walker && fk < 0.98) drawBandFpv(g, S.walker.unit.p, alpha * (1 - fk));
    drawGates(g, alpha, 'fpv');
    drawHead(g, alpha, 'fpv');
    ctx.save();
    ctx.globalAlpha = alpha * 0.55; ctx.strokeStyle = 'rgb(190,196,204)'; ctx.lineWidth = 1;
    ctx.beginPath();                                  // "you are here": the ground under the camera
    ctx.moveTo(W / 2 - 5, FH - 3.5); ctx.lineTo(W / 2, FH - 8.5); ctx.lineTo(W / 2 + 5, FH - 3.5);
    ctx.stroke();
    ctx.restore();
  }
  function drawBandFpv(g, p, alpha) {
    const lay = g.lay, camX = g.camX, camY = g.camY;
    const segs = (S.field.edges && S.field.edges[p]) || [];
    const w = weatherFor(p);
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(150,158,168,.42)';
    for (const s of segs) {
      const a = C.fpvPoint(lay, camX, camY, s[0], s[1]), b = C.fpvPoint(lay, camX, camY, s[2], s[3]);
      if (!a || !b) continue;
      ctx.globalAlpha = alpha * 0.5;
      ctx.beginPath(); ctx.moveTo(a.x + 0.5, a.y + 0.5); ctx.lineTo(b.x + 0.5, b.y + 0.5); ctx.stroke();
      if (!w) continue;
      // one mark per room along the edge: the grid is the spacing, so the rhythm
      // survives the perspective instead of collapsing at the horizon
      const len = Math.hypot(s[2] - s[0], s[3] - s[1]);
      const n = Math.max(1, Math.round(len * 1.4));
      for (let i = 1; i < n; i++) {
        const t = i / n;
        const q = C.fpvPoint(lay, camX, camY, s[0] + (s[2] - s[0]) * t, s[1] + (s[3] - s[1]) * t);
        if (!q) continue;
        const ink = Math.min(1, 0.5 + (lay.f / Math.max(1, q.depth)));
        const sz = Math.max(1.2, Math.min(4, (lay.f / Math.max(1, q.depth)) * 0.16));
        ctx.globalAlpha = alpha * 0.55 * ink;
        ctx.strokeStyle = 'rgb(190,196,204)';
        ctx.beginPath();
        if (w === 'rain') { ctx.moveTo(q.x, q.y); ctx.lineTo(q.x, q.y + sz * 1.6); }
        else if (w === 'window') { ctx.moveTo(q.x - sz, q.y); ctx.lineTo(q.x + sz, q.y); }
        else if (w === 'lamp') { ctx.moveTo(q.x - sz, q.y - sz); ctx.lineTo(q.x + sz, q.y + sz); ctx.moveTo(q.x - sz, q.y + sz); ctx.lineTo(q.x + sz, q.y - sz); }
        else { ctx.arc(q.x, q.y, Math.max(1, sz * 0.75), 0, Math.PI * 2); }
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // the act, drawn as the gate's own ring divided into as many arcs as the factor
  // has parts; each arc fills as that part is done. One mark, no panel.
  function actProgress(a) {
    if (!a) return 0;
    const now = a.ts == null ? (a.t0 || 0) : a.ts;
    if (a.kind === 'letgo') return Math.min(1, a.holdT / LETGO_MS);
    if (a.kind === 'silence') return a.t0 == null ? 0 : Math.min(1, (now - a.t0) / SPEECH_MS - a.got);
    if (a.kind === 'stay') return a.t0 == null ? 0 : Math.min(1, (now - a.t0) / STAY_MS - a.got);
    return 0;
  }
  function drawActRing(cxm, cym, r, ry, alpha) {
    const a = S.act;
    if (!a) return;
    const n = Math.max(1, a.need);
    ctx.save();
    ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgb(214,220,228)';
    for (let k = 0; k < n; k++) {
      const frac = k < a.got ? 1 : (k === a.got ? actProgress(a) : 0);
      if (frac <= 0) continue;
      const a0 = -Math.PI / 2 + (k / n) * Math.PI * 2 + 0.07;
      const a1 = a0 + (Math.PI * 2 / n - 0.14) * frac;
      ctx.globalAlpha = alpha * 0.85;
      ctx.beginPath(); ctx.ellipse(cxm, cym, r * 1.6, ry * 1.6, 0, a0, a1); ctx.stroke();
    }
    ctx.restore();
  }

  // A gate is a mark in the city, not a widget: a hairline ring in the cell, a
  // second ring when lit. It is only visible in ENTERED (state through world).
  function drawGates(g, alpha, mode) {
    const cell = g.cell;
    const fpv = mode === 'fpv';
    ctx.save();
    ctx.lineWidth = 1;
    for (const gt of S.gates) {
      let cxm, cym, r, ry;
      if (fpv) {
        // the ring lies on the ground, so it projects to an ellipse
        const q = C.fpvQuad(g.lay, g.camX, g.camY, gt.cx, gt.cy);
        if (!q || q.yN < g.lay.horizon || q.yN > g.dst.h + 4) continue;
        r = Math.max(1.5, q.w * 0.30); ry = Math.max(1, r * 0.42);
        cxm = q.cx; cym = q.cy;
      } else {
        const x = g.dst.x + (gt.cx - g.win.ox) * cell, y = g.dst.y + (gt.cy - g.win.oy) * cell;
        if (x < g.dst.x - cell || y < g.dst.y - cell || x > g.dst.x + g.dst.w || y > g.dst.y + g.dst.h) continue;
        r = cell * 0.30; ry = r; cxm = x + cell / 2; cym = y + cell / 2;
      }
      const lit = S.lit[gt.i];
      const sight = kindOf(gt.i) === 'sight';
      ctx.globalAlpha = alpha * (lit ? 0.95 : sight ? 0.7 : 0.55);
      ctx.strokeStyle = lit ? 'rgb(214,220,228)' : (sight ? 'rgb(190,196,204)' : 'rgb(120,128,138)');
      // a threshold that has not been seen through is a BROKEN ring: the shape
      // of the mark is the instruction, and it is the only instruction there is.
      if (sight && !lit) ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.ellipse(cxm, cym, r, ry, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      if (S.act && S.act.i === gt.i) drawActRing(cxm, cym, r, ry, alpha);
      if (S.refuse && S.refuse.i === gt.i) {            // the step was held: one flare, no words
        const ph = Math.min(1, (S.refuse.phase || 0) / 3);
        ctx.globalAlpha = alpha * 0.5 * (1 - ph);
        ctx.beginPath(); ctx.ellipse(cxm, cym, r * (1 + ph * 2.2), ry * (1 + ph * 2.2), 0, 0, Math.PI * 2); ctx.stroke();
      }
      if (lit) {
        ctx.fillStyle = 'rgba(214,220,228,.85)';
        ctx.beginPath(); ctx.arc(cxm, cym, Math.max(1.2, r * 0.32), 0, Math.PI * 2); ctx.fill();
        if (S.pulse && S.pulse.i === gt.i) {                    // one-shot: the light arrives
          const ph = Math.min(1, (S.pulse.phase || 0) / 3);
          ctx.globalAlpha = alpha * 0.55 * (1 - ph);
          ctx.beginPath(); ctx.ellipse(cxm, cym, r * (1 + ph * 1.8), ry * (1 + ph * 1.8), 0, 0, Math.PI * 2); ctx.stroke();
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
  // breath is the frame's own remaining ink: a hairline along the inner top edge
  // that shortens as you walk. No meter, no number at rest — the world shows it.
  function drawBreath(d) {
    if (S.breath == null || S.breathMax == null || !S.breathMax) return;
    const w = Math.max(0, Math.min(1, S.breath / S.breathMax));
    const x0 = d.x + 8, y = d.y + 5, full = Math.max(0, d.w - 16);
    if (full <= 0) return;
    if (w <= 0) { inkRect(x0, y, 3, 1, 0.16, 'rgb(150,158,168)'); return; }
    inkRect(x0, y, full * w, 1, 0.30, 'rgb(150,158,168)');
    inkRect(x0 + full * w - 0.5, y - 2, 1, 5, 0.42, 'rgb(190,196,204)');
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
    // the eye: a fifth tick in the same corner when the first-person view is on.
    // No button, no label — the corner that already carries the distance carries
    // one more fact, and the world itself (a horizon) is the rest of the state.
    if (S.fpv) inkRect(r.x + r.w - 6 - 4 * 5 - 3, r.y + r.h - 6 - 8, 1, 9, 0.9, 'rgb(214,220,228)');
    ctx.restore();
  }
  // the note's corner: one crop-mark, hairline, top-left of the frame. Hold it to
  // read the field note, hold again (or tap) to put it away.
  function noteTickRect(d) { return { x: d.x + 3, y: d.y + 3, w: 24, h: 24 }; }
  function drawNoteTick(d) {
    const r = noteTickRect(d);
    ctx.save();
    ctx.strokeStyle = 'rgb(150,158,168)'; ctx.lineWidth = 1;
    ctx.globalAlpha = S.note ? 0.85 : 0.24;
    ctx.beginPath();
    ctx.moveTo(r.x + 0.5, r.y + 8.5); ctx.lineTo(r.x + 0.5, r.y + 0.5); ctx.lineTo(r.x + 8.5, r.y + 0.5);
    ctx.stroke();
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
  // A gate has to say three things at once on a phone: WHO it is, WHAT the text
  // says, and WHAT it asks. So each of its lines gets one line of the strip and
  // is ellipsized if it does not fit — a quote that eats the instruction is a
  // gate that cannot be passed. A word gate is the exception: its BLANK must be
  // readable, so the sentence gets two lines and the third line is the doors.
  function fitLine(text, maxW, size) {
    const all = wrapText(text, maxW, size);
    if (all.length <= 1) return all;
    return [all[0].replace(/[,;:.\s]+$/, '') + '…'];
  }
  function voiceLines() {
    if (S.ride) return rideVoiceLines();
    if (S.decodeCell != null && S.field) return decodeLines();
    const teaching = !S.taughtRide && Object.keys(S.rides || {}).length === 0;
    const hint = S.distance === 'FAR' ? 'tap the painting · it resolves into a city'
      : S.distance === 'NEAR' ? 'tap again · enter the city'
      : (S.hold ? 'keep holding · the line rides' : 'swipe to walk · hold a room · release at the bright arc');
    if (!S.voice) return teaching ? [hint] : [];
    const size = 9.5;
    const raw = S.voice.lines;
    if (S.voice.kind === 'gate' && raw.length >= 3 && S.gates.length) {
      const who = fitLine(raw[0], W - 26, size);
      if (S.gate) {
        const cloze = wrapText(raw[1], W - 26, size).slice(0, 2);
        return who.concat(cloze).slice(0, 3);
      }
      const says = fitLine(raw[1], W - 26, size);
      const asks = fitLine(raw.slice(2).join(' · '), W - 26, size);
      return who.concat(says, asks).slice(0, 3);
    }
    const out = [];
    for (const r of raw) {
      for (const l of wrapText(r, W - 26, size)) out.push(l);
    }
    // before the first ride the strip says what to do at THIS distance, then stops
    if (teaching && S.voice && S.voice.kind !== 'gate') {
      out[0] = hint;
    }
    return out.slice(0, 3);
  }
  // the ride is drawn word by word: the sentence lights up at its own pace and
  // the strip says only what the body should do next. No clock, no counter.
  function drawRideVoice() {
    // 0.6.6 — the ride is an RSVP ring, not a sentence to squint at.
    // One word at the focal point; the ring is the whole score: clause ticks,
    // progress, and the bright release window. The painting stays behind it.
    const r = S.ride, p = r.plan;
    const at = C.rideAt(r, p, r.t);
    const words = p.line.split(' ');
    const rewind = r.rewindUntil ? (r.rewindU || 0) : null;
    const frac = r.over ? 1 : (rewind != null
      ? r.rewindFrom + (r.rewindTo - r.rewindFrom) * rewind : at.charFrac);
    ctx.save();
    ctx.fillStyle = 'rgba(6,10,15,0.62)';
    ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H * 0.44;
    const R = Math.max(96, Math.min(W * 0.34, H * 0.26));
    const a0 = -Math.PI / 2, TAU = Math.PI * 2;
    // the disc: enough contrast for a word, not a panel
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU);
    ctx.fillStyle = 'rgba(9,14,20,0.58)'; ctx.fill();
    // base ring
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU);
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(198,209,220,0.16)'; ctx.stroke();
    // clause ticks: the same marks as the rail, on the ring itself
    for (const t of (p.tickChars || [])) {
      if (t >= 1) continue;
      const a = a0 + t * TAU;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (R - 5), cy + Math.sin(a) * (R - 5));
      ctx.lineTo(cx + Math.cos(a) * (R + 5), cy + Math.sin(a) * (R + 5));
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(210,220,230,0.26)'; ctx.stroke();
    }
    // the release window: the one part of the ring that is bright before you reach it
    const wf = p.windowFrom || 0;
    ctx.beginPath(); ctx.arc(cx, cy, R, a0 + wf * TAU, a0 + TAU);
    ctx.lineWidth = 4.5; ctx.strokeStyle = 'rgba(236,242,248,0.82)'; ctx.stroke();
    // progress
    ctx.beginPath(); ctx.arc(cx, cy, R, a0, a0 + Math.max(0.003, frac) * TAU);
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(240,245,250,0.95)'; ctx.stroke();
    // the playhead: a dot on the ring, and a short radial breath
    const ang = a0 + frac * TAU;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(ang) * (R - 9), cy + Math.sin(ang) * (R - 9));
    ctx.lineTo(cx + Math.cos(ang) * (R + 2), cy + Math.sin(ang) * (R + 2));
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(250,252,255,0.85)'; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R, 3.2, 0, TAU);
    ctx.fillStyle = 'rgb(246,249,252)'; ctx.fill();
    // the word — one at a time, sized to the ring
    const verdictWord = r.verdict === 'sharp' ? 'held' : r.verdict === 'blown' ? 'late' : 'early';
    const word = r.over ? verdictWord : (words[Math.max(0, Math.min(at.i, words.length - 1))] || '');
    let size = Math.min(46, Math.max(24, W * 0.09));
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = size + 'px ' + MONO;
    while (ctx.measureText(word).width > R * 1.8 && size > 15) { size -= 2; ctx.font = size + 'px ' + MONO; }
    ctx.globalAlpha = 0.97; ctx.fillStyle = 'rgb(238,243,248)';
    ctx.fillText(word, cx, cy);
    // the instruction, under the ring; it changes with the moment, not with a timer
    const note = r.over
      ? (r.verdict === 'sharp' ? 'held to the end' : r.verdict === 'blown' ? 'late · past the end' : 'early · three times')
      : (rewind != null ? 'early · again from the clause'
        : (at.phase === 'window' ? 'let go · the end' : 'let go at the bright arc'));
    ctx.font = '10px ' + MONO; ctx.textBaseline = 'top';
    ctx.globalAlpha = r.over || rewind != null || at.phase === 'window' ? 0.94 : 0.64;
    ctx.fillStyle = r.over || rewind != null || at.phase === 'window' ? 'rgb(232,238,244)' : 'rgb(176,187,198)';
    ctx.fillText(note, cx, cy + R + 20);
    ctx.restore();
  }
  function drawVoice() {
    if (S.ride) { drawRideVoice(); return; }
    const lines = voiceLines();
    if (!lines.length) return;
    ctx.save();
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.font = '9.5px ' + MONO;
    // the strip hangs from the frame's own lower edge when the frame is small
    const d = S.field ? geoFor(S.distance).dst : null;
    const y0 = d ? Math.min(H - VOICE_H + 7, d.y + d.h + 11) : H - VOICE_H + 7;
    // at rest the sentence already shows its shape: the rail is the mechanic.
    // It reads the district you are standing in, not a hidden selection.
    if (S.distance === 'ENTERED' && S.walker) {
      const pl = planForCell(S.walker);
      if (pl) drawRail(Math.min(H - 8, y0 + 44), pl, null, 'rest', null);
    }
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

  // one place decides how a distance is drawn, so FPV cannot fork the ladder
  function drawField(g, alpha, hold, wave) {
    if (g.kind === 'fpv') return drawFpv(g, alpha);
    if (g.kind === 'near') return drawNear(g, alpha, wave, hold);
    return drawEntered(g, alpha);
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
      drawBreath(d);
      drawNotch(d);
      drawNoteTick(d);
      drawVoice();
      if (S.note) drawNote();
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
      if (to.glyphA > 0) drawField(to, to.glyphA, S.hold, null);
      if (S.distance === 'FAR' || S.distance === 'EXITED') frame(to.dst);
    } else {
      // one morph: the painting's own region flies into the next frame while
      // the next resolution resolves on top of it
      const a = S.trans.from, b = S.trans.to;
      drawPainting(srcFor(a), { x: lerp(from.src.x, to.src.x, t), y: lerp(from.src.y, to.src.y, t), w: lerp(from.src.w, to.src.w, t), h: lerp(from.src.h, to.src.h, t) },
        { x: lerp(from.dst.x, to.dst.x, t), y: lerp(from.dst.y, to.dst.y, t), w: lerp(from.dst.w, to.dst.w, t), h: lerp(from.dst.h, to.dst.h, t) },
        lerp(from.imgA, to.imgA, t));
      drawPainting(srcFor(b), to.src, to.dst, to.imgA * t);
      if (from.glyphA > 0) drawField(from, from.glyphA * (1 - t), null, null);
      if (to.glyphA > 0) drawField(to, to.glyphA * t, S.hold, b === 'NEAR' && a === 'FAR' ? t : null);
      if (t >= 1) { S.trans = null; frame(to.dst); }
    }
    const d = geoFor(S.distance);
    drawMatte();
    drawLamps(d.dst);
    if (S.distance === 'ENTERED' || S.distance === 'EXITED') drawBreath(d.dst);
    drawNotch(d.dst);
    drawNoteTick(d.dst);
    drawDoorStrip();
    drawTitle(d.dst);
    drawVoice();
    if (S.note) drawNote();
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

  // ── the field note (a reveal, not a panel) ────────────────────────────────
  // The operator's own reading of the build, verbatim, set in the same quiet
  // type. It is not help and not a caption: it is the self-critique, and the
  // instrument carries it without editing it. Reachable by holding the frame's
  // top-left crop-mark or by the URL hash #note; no element is added to the page.
  const NOTE = [
    'FIELD NOTE — the ladder, after walking it',
    '',
    'I built this and then walked it, which is not the same as knowing whether it works.',
    '',
    "What's special, if anything: the world is not decorated with the text — it is made of it, and the same inputs always make the same city. You can check that. Nothing here is random, nothing is generated fresh each load. That's rarer than it sounds.",
    '',
    "What's weak: the mapping is a machine for making decisions I didn't make. Paragraph equals district because I chose that; nothing in the text demanded it. The gates ask you to notice the text, which is reading, not understanding. And the weather wheel is a rule I picked because the simpler rules were boring — that's taste, not truth.",
    '',
    'How it might be used: as a slow reading. One district a day, a gate that makes you find a word you\'d have skimmed, and a mark left in the painting when you leave. Nothing to win. After enough walks the painting is a record of what you actually read.',
    '',
    "What I'd cut if nobody used it: all of it. It earns its place only if walking it tells you something a page doesn't.",
  ];
  function wrapAll(text, maxW, size) {
    ctx.font = size + 'px ' + MONO;
    const words = String(text).split(/\s+/).filter(Boolean);
    const out = [];
    let cur = '';
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t;
    }
    if (cur) out.push(cur);
    return out;
  }
  function drawNote() {
    const pad = 9, box = { x: pad, y: pad, w: W - pad * 2, h: fieldH() - pad * 2 };
    ctx.save();
    ctx.fillStyle = 'rgba(8,12,18,.965)';
    ctx.fillRect(0, 0, W, fieldH());
    ctx.strokeStyle = 'rgba(79,87,96,.34)'; ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(box.x) + 0.5, Math.round(box.y) + 0.5, Math.round(box.w) - 1, Math.round(box.h) - 1);
    const maxW = box.w - 24;
    let size = 9.5, lead = 13.6, laid = null;
    for (const s of [9.5, 9, 8.5, 8, 7.5, 7]) {
      const lh = Math.round(s * 1.44 * 10) / 10;
      const rows = [];
      for (const para of NOTE) {
        if (!para) { rows.push(''); continue; }
        for (const l of wrapAll(para, maxW, s)) rows.push(l);
      }
      if (rows.length * lh <= box.h - 26) { size = s; lead = lh; laid = rows; break; }
      laid = rows; size = s; lead = lh;
    }
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.font = size + 'px ' + MONO;
    let y = box.y + 13;
    for (let i = 0; i < laid.length; i++) {
      if (!laid[i]) { y += lead * 0.42; continue; }
      ctx.globalAlpha = i === 0 ? 0.92 : 0.74;
      ctx.fillStyle = i === 0 ? 'rgb(214,220,228)' : 'rgb(170,178,188)';
      ctx.fillText(laid[i], box.x + 12, Math.round(y));
      y += lead;
    }
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
    // an act in progress runs on frame time: a hold that fills or drains, a
    // silence that counts itself out, a point that stays. No clock is read.
    if (S.act && actTick(ts)) live = true;
    // the eye line: a held press raises it, letting go settles it. Frame deltas
    // only (no wall clock), and the ramp stops the moment it is done — so nothing
    // animates unasked and the view is the same at rest on every load.
    if (S.eyeDir > 0 || S.eyeK > 0) {
      const dt = Math.min(64, Math.max(0, ts - (S.lastTs || ts)));
      S.lastTs = ts;
      const target = S.eyeDir > 0 ? 1 : 0;
      const rate = dt / (S.eyeDir > 0 ? 900 : 520);
      const gap = target - S.eyeK;
      S.eyeK = Math.abs(gap) <= rate ? target : S.eyeK + (gap > 0 ? rate : -rate);
      live = true;
    } else S.lastTs = ts;
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
    // the ride runs on frame time; a throttled tab pauses it, it cannot skip it.
    // a soft release pauses the clock for the 700 ms rewind, then resumes from
    // the clause — the notice and the playhead share the same interval.
    if (S.ride && !S.ride.over) {
      if (S.ride.rewindUntil) {
        if (S.ride.rewindStart == null) S.ride.rewindStart = ts;
        S.ride.rewindUntil = S.ride.rewindStart + C.WAVE_REWIND;
        S.ride.rewindU = Math.min(1, Math.max(0, (ts - S.ride.rewindStart) / C.WAVE_REWIND));
        if (ts >= S.ride.rewindUntil) {
          S.ride.rewindUntil = 0;
          S.ride.t0 = ts - S.ride.t;
          S.ride.markChar = null;
        }
      } else {
        if (!S.ride.t0) S.ride.t0 = ts - S.ride.t;
        S.ride.t = ts - S.ride.t0;
      }
      const p = S.ride.plan;
      if (!S.ride.rewindUntil && S.ride.t > p.endMs + p.windowMs + 300) {
        const out = C.rideRelease(S.ride, p, S.ride.t);
        S.ride = Object.assign(S.ride, out.ride);
        say(['late · past the end'], 'line', 5);
      } else live = true;
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
      (S.fpv ? 'the eye · ' : '') + (S.note ? 'field note · ' : '') +
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
    S.decodeCell = null; S.gate = null; S.rise = null; S.refuse = null; S.ride = null;
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

  // ── the eye (0.4.0) ───────────────────────────────────────────────────────
  // One toggle, no button: two fingers on the field, or a held press on the
  // distance corner. It only exists inside the walk, because the eye is a way of
  // standing in the city, not a mode of the painting. The view says so itself —
  // the plan becomes a horizon — and the corner gains one tick.
  function toggleFpv(on) {
    const want = on === undefined ? !S.fpv : !!on;
    if (want && S.distance !== 'ENTERED') return false;
    S.fpv = want;
    S.decodeCell = null; S.gate = null; S.block = null;
    if (!S.fpv) { S.eyeK = 0; S.eyeDir = 0; }
    // the eye line is a real field of the view: say it, once, in the world's voice
    say([S.fpv ? 'the eye · standing in the city, looking north · hold to raise the eye' : 'the plan · the city from above'], 'line', 5);
    updateChrome(); draw(); wake();
    return S.fpv;
  }
  // the note is a reveal, not a mode: it does not change the field, it covers it
  // until you put it away.
  function toggleNote(on) {
    S.note = on === undefined ? !S.note : !!on;
    if (S.note) { S.decodeCell = null; S.gate = null; }
    draw(); wake();
    return S.note;
  }
  function readHash() {
    if (!S.field) return;
    const h = String(location.hash || '').replace(/^#/, '');
    if (h === 'note') { toggleNote(true); return; }
    if (h === 'fpv') {
      if (S.distance !== 'ENTERED') setDistance('ENTERED');
      toggleFpv(true);
      refreshEye();
      draw();
    }
  }
  function refreshEye() {
    if (S.ready && S.distance === 'ENTERED' && S.fpv) { fit(); draw(); }
  }
  function resetRoute() {
    S.moves = []; S.exitCache = null; S.exitCanvas = null;
    S.walker = S.field ? S.field.start : null;
    S.gate = null; S.strikes = new Uint8Array(S.gates.length); S.lastP = -1;
    S.seen = new Uint8Array(S.gates.length); S.rise = null; S.refuse = null; S.lineSaid = -1;
    // a new walk: the breath comes back whole, the acts do not carry over
    S.act = null; S.ended = null; S.breath = S.breathMax; S.visited = new Set(S.field ? [S.field.start.n] : []);
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
    const parts = ['exited · ' + S.moves.length + ' steps · ' + lit + '/' + S.gates.length + ' gates · ' + read + ' ¶ read · breath ' + S.breath + ' of ' + S.breathMax];
    if (m) parts.push('seed ' + routeSeedHex() + ' · mad64 ' + m.mad64.toFixed(4) + ' · ' + (m.sha ? 'sha ' + m.sha.slice(0, 8) : 'sha…') + ' · source ' + S.field.source.fingerprint);
    say([parts.join(' · '), 'tap the painting to return'], 'measure', Infinity);
  }

  // ── the walk ──────────────────────────────────────────────────────────────
  function step(dir) {
    if (!S.field || S.distance !== 'ENTERED') return false;
    if (S.rise) return false;                                   // the act has the floor
    if (S.act && S.act.kind === 'stay') actFail('that was a move');
    const next = C.step(S.field, S.walker, dir);
    if (!next) {
      // The refusal is a place, not a margin. Mark the shared edge in the cell
      // that refused (the wall's face toward you) and name the sides the city
      // does leave open, from the same field the walk reads.
      const D = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
      const FACE = { U: 'S', D: 'N', L: 'E', R: 'W' };
      const dx = D[dir] ? D[dir][0] : 0, dy = D[dir] ? D[dir][1] : 0;
      const wx = S.walker.cx + dx, wy = S.walker.cy + dy;
      const inside = wx >= 0 && wy >= 0 && wx < C.COLS && wy < C.ROWS;
      const wall = inside ? S.field.cells[wy * C.COLS + wx] : null;
      S.block = wall && wall.wall ? { n: wall.n, dir: FACE[dir] } : null;
      const open = C.openSides(S.field, S.walker, (c) => {
        const gt = S.gates.find((g) => g.n === c.n);
        return !(gt && !C.gateAdmits(kindOf(gt.i), S.seen[gt.i]));
      });
      const name = { N: 'north', E: 'east', S: 'south', W: 'west' };
      say(['wall — the painting’s edge says no' + (open.length ? ' · open ' + open.map((k) => name[k]).join(', ') : ' · this room is closed')], 'wall', 3);
      updateChrome(); draw(); return false;
    }
    S.block = null;
    // A threshold that has not been seen through does not open, and it does not
    // argue: the step simply does not happen and the ring flares once.
    const gate = S.gates.find((g) => g.n === next.n);
    const kind = gate ? kindOf(gate.i) : null;
    if (gate && !C.gateAdmits(kind, S.seen[gate.i])) {
      // the refusal is still silent about blame, but the gate now says what it
      // is and what it wants: a factor you cannot pass without doing it
      S.refuse = { i: gate.i, t0: null, phase: 0 };
      gateSays(gate.i);
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
    // a step is what the walk costs; the act you are in may be paid for by it
    const a = S.act;
    const wasWalked = S.visited.has(next.n);
    S.visited.add(next.n);
    if (a && a.kind === 'walk' && next.unit.p === a.p) {
      a.got++;
      if (a.got >= a.need) actDone();
    } else if (a && a.kind === 'return' && wasWalked) {
      actDone();
    } else {
      gateAt(next);
    }
    spend(C.BREATH_STEP);
    if (S.distance === 'ENTERED') { updateChrome(); draw(); }
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

  // ── the eight gates: the eight path factors, asked of the walk ────────────
  // Gate i asks factor i. What it asks is the factor's own act, named by the
  // text: five are gestures the walk can make (see, let go, say none, walk, go
  // back, stay), two are a word of the text's own sentence. A sight or act gate
  // refuses the step until the act is done; a word gate opens a card on arrival.
  function kindOf(i) { return C.gateKind(S.factors, i); }
  // the unlit gate you are standing on, or standing beside — the only gates a
  // press can address. A gate you have already done is not a gate any more.
  function gateNear(cell) {
    if (!cell) return null;
    const here = cell.n === (S.walker && S.walker.n);
    return S.gates.find((g) => !S.seen[g.i] && (g.n === cell.n ||
      (here && Math.abs(g.cx - S.walker.cx) + Math.abs(g.cy - S.walker.cy) <= 1))) || null;
  }
  function clip(t, max) {
    const s2 = String(t || '').replace(/\s+/g, ' ').trim();
    if (s2.length <= max) return s2;
    const cut = s2.slice(0, max - 1), at = cut.lastIndexOf(' ');
    return (at > max * 0.5 ? cut.slice(0, at) : cut).replace(/[,;:.\s]+$/, '') + '…';
  }
  const ACT_HINT = {
    see: 'hold, and the district rises',
    letgo: 'let go: hold each until it goes',
    silence: 'say none: keep off the ring',
    walk: 'walk four steps in this district',
    return: 'go back onto ground you have walked',
    stay: 'stay still: one point',
    word: 'one word is missing',
  };
  // what a gate says, in three lines: WHO it is (the doctrine's own name, its
  // Pali, its locator), WHAT the text says (its own sentence), WHAT it asks.
  function gateVoice(i) {
    const gt = S.gates[i];
    if (!gt) return null;
    const fl = C.factorLine(S.factors, S.source.districts, i, gt.p);
    if (!fl) return null;
    const word = kindOf(i) === 'word';
    const line3 = word ? ACT_HINT.word : ACT_HINT[fl.act] + (fl.items ? ' · ' + fl.items.join(' · ') : '');
    // a word gate must show its own BLANK: the sentence with the word in it is the answer
    const shown = word && S.gate && S.gate.i === i ? S.gate.cloze : clip(fl.line, word ? 118 : 58);
    return [
      (i + 1) + '/' + S.gates.length + ' ' + fl.en + ' (' + fl.pali + ') · ' + fl.locator,
      '“' + shown + '”',
      line3,
    ];
  }
  function gateSays(i, ttl) {
    const v = gateVoice(i);
    if (v) say(v, 'gate', ttl == null ? Infinity : ttl);
    if (el.live && v) el.live.textContent = v.join(' · ');
    return v;
  }

  function riseStart(i, auto) {
    const gt = S.gates[i];
    if (!gt || S.distance !== 'ENTERED' || S.seen[gt.i] || S.rise || S.act) return false;
    if (kindOf(gt.i) !== 'sight') return false;
    S.rise = { i: gt.i, p: gt.p, k: 0, t0: null, auto: !!auto };
    S.decodeCell = null; S.gate = null;
    gateSays(gt.i);                                     // the gate names itself while you look
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

  // ── the acts: one press begins the factor, then the factor says what it wants
  function actStart(i, auto) {
    const gt = S.gates[i];
    if (!gt || S.distance !== 'ENTERED' || S.seen[gt.i] || S.act || S.rise) return false;
    const kind = kindOf(gt.i);
    if (kind === 'word') return false;
    if (kind === 'sight') return riseStart(gt.i, auto);
    const fl = C.factorLine(S.factors, S.source.districts, gt.i, gt.p);
    if (!fl) return false;
    const need = fl.act === 'walk' ? 4 : (fl.items ? fl.items.length : 1);
    S.act = {
      i: gt.i, key: fl.key, kind: fl.act, need, got: 0,
      p: S.walker.unit.p,          // "this district" = the one you are standing in
      t0: null, ts: null, holdT: 0, holdT0: null, held: false, auto: !!auto,
    };
    S.decodeCell = null; S.gate = null;
    gateSays(gt.i);
    updateChrome(); draw(); wake();
    return true;
  }
  function actDone() {
    const a = S.act;
    if (!a) return;
    const gt = S.gates[a.i];
    S.act = null;
    S.seen[a.i] = 1; S.lit[a.i] = 1;
    S.pulse = { i: a.i, t0: 0, phase: 0 };
    const fl = C.factorLine(S.factors, S.source.districts, a.i, gt.p);
    const name = fl ? fl.en : 'the gate';
    say([(a.i + 1) + '/' + S.gates.length + ' ' + name + ' — done · the threshold opens',
      'breath ' + S.breath + ' of ' + S.breathMax], 'line', 10);
    updateChrome(); draw();
  }
  function actFail(reason) {
    const a = S.act;
    S.act = null;
    if (navigator.vibrate) { try { navigator.vibrate(18); } catch (err) { /* no haptics */ } }
    spend(C.BREATH_FAIL, reason);
    if (S.distance === 'ENTERED') say([reason + ' · −' + C.BREATH_FAIL + ' breath · ' + S.breath + ' of ' + S.breathMax], 'line', 6);
    updateChrome(); draw();
  }
  // the act's own clock: the instrument reads requestAnimationFrame timestamps,
  // never Date — the same law as the rise
  function actTick(ts) {
    const a = S.act;
    if (!a || S.distance !== 'ENTERED') return false;
    if (a.ts == null) a.ts = ts;
    const dt = Math.max(0, Math.min(120, ts - a.ts));
    a.ts = ts;
    if (a.kind === 'letgo') {
      // absolute frame time, not accumulated deltas: a throttled tab (or a slow
      // phone) fires rAF rarely, and a delta-sum would starve the hold
      if (a.held || a.auto) {
        if (a.holdT0 == null) a.holdT0 = ts;
        a.holdT = ts - a.holdT0;
        if (a.holdT >= LETGO_MS) {
          a.got++; a.holdT = 0; a.holdT0 = ts;
          if (a.got >= a.need) { actDone(); return false; }
        }
      } else { a.holdT0 = null; a.holdT = 0; }
      return true;
    }
    if (a.kind === 'silence' || a.kind === 'stay') {
      if (a.t0 == null) a.t0 = ts;
      const per = a.kind === 'stay' ? STAY_MS : SPEECH_MS;
      const got = Math.min(a.need, Math.floor((ts - a.t0) / per));
      if (got > a.got) { a.got = got; }
      if (a.got >= a.need) { actDone(); return false; }
      return true;
    }
    return false;                                       // walk / return finish on a step
  }
  function actTouch() {                                  // a touch while an act is open
    const a = S.act;
    if (!a) return false;
    if (a.kind === 'silence' && a.got < a.need) { actFail('that was speech'); return true; }
    if (a.kind === 'stay') { actFail('that was a move'); return true; }
    return false;
  }

  // ── breath: the walk's stake ─────────────────────────────────────────────
  function spend(cost, reason) {
    if (S.breath == null) return;
    S.breath = C.spendBreath(S.breath, cost);
    if (S.breath <= 0) endWalk(reason);
  }
  function endWalk(reason) {
    if (S.distance !== 'ENTERED') return;
    const lit = S.lit.reduce((n, v) => n + v, 0);
    S.ended = reason || 'the breath is spent';
    S.act = null; S.gate = null; S.rise = null; S.refuse = null;
    setDistance('EXITED', true);
    say([
      'out of breath — ' + S.ended + ' · ' + S.moves.length + ' steps · ' + lit + '/' + S.gates.length + ' gates · 0 of ' + S.breathMax,
      'the walk ends where it stands; nothing is given back inside a walk',
    ], 'measure', Infinity);
    updateChrome(); draw();
  }

  // ── the word gates: one word of the text's own sentence ──────────────────
  function gateAt(cell) {
    const gt = S.gates.find((g) => g.n === cell.n);
    if (!gt || S.lit[gt.i] || S.strikes[gt.i] >= 2) { S.gate = null; return; }
    if (kindOf(gt.i) !== 'word') { S.gate = null; return; }   // an act gate is not a question
    const card = C.factorCard(S.factors, S.source.districts, gt.i, gt.p, S.source.fingerprint);
    if (!card) { S.gate = null; return; }
    S.gate = Object.assign({ i: gt.i }, card);
    say(gateVoice(gt.i), 'gate', Infinity);
  }
  function answerDoor(i) {
    if (!S.gate) return null;
    const g = S.gate, pick = g.options[i];
    const right = String(pick).toLowerCase() === String(g.answer).toLowerCase();
    if (right) {
      S.lit[g.i] = 1;
      S.seen[g.i] = 1;
      S.gate = null; S.pulse = { i: g.i, t0: 0, phase: 0 };
      say(['lit · ' + g.answer + ' — ' + (g.i + 1) + '/' + S.gates.length + ' ' + g.en + ' · breath ' + S.breath + ' of ' + S.breathMax], 'line', 6);
      if (navigator.vibrate) { try { navigator.vibrate(8); } catch (err) { /* no haptics */ } }
    } else {
      S.strikes[g.i] = (S.strikes[g.i] || 0) + 1;
      if (navigator.vibrate) { try { navigator.vibrate(22); } catch (err) { /* no haptics */ } }
      if (S.strikes[g.i] >= 2) {
        S.gate = null;
        spend(C.BREATH_FAIL, 'not that word');
        if (S.distance === 'ENTERED') say(['the gate stays shut — walk on, or return and come back to it · −' + C.BREATH_FAIL + ' breath'], 'line', 7);
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
    const head = C.readingHead(S.field, cell.n);
    const hue = cell.hue < 0 ? 'achromatic' : Math.round(cell.hue) + '°';
    const street = cell.wall ? 'wall' : (S.field.reach[cell.n] ? 'street' : 'closed pocket');
    // the district's weather, and the one you carried into it: the two halves of
    // the only mechanism on this page that is not about you
    const w = weatherFor(u.p), carry = S.weather ? S.weather.carry : null;
    // first ride: the strip teaches the one gesture that is new, then goes back
    // to being an instrument. No tutorial layer, no second glyph.
    const teaching = !S.taughtRide && Object.keys(S.rides || {}).length === 0;
    return [
      teaching ? (S.hold ? 'keep holding · the line rides' : 'hold · let go at the end') :
      (head ? 'reading head ' + head.i + '/' + head.of + ' of ¶' + (head.p + 1) + ' · ' : '') +
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

  // the rail: the sentence drawn as time. Always visible at ENTERED, so the
  // shape of the ride is legible before anyone holds anything. Ticks are the
  // clause marks; the brighter stretch is where letting go is true.
  function planForCell(cell) {
    if (!cell || !cell.unit || !S.source) return null;
    const d = S.source.districts[cell.unit.p];
    if (!d || !d.line) return null;
    const k = 'p' + cell.unit.p;
    if (!S.plans) S.plans = {};
    if (!S.plans[k]) S.plans[k] = C.waveOf(d.line);
    return S.plans[k];
  }
  function drawRail(y, plan, frac, phase, mark) {
    const r = C.railOf(plan);
    const x0 = 13, x1 = W - 13, w = x1 - x0;
    ctx.save();
    ctx.lineWidth = 1;
    // the sentence's length
    ctx.globalAlpha = 0.34; ctx.strokeStyle = 'rgb(200,208,218)';
    ctx.beginPath(); ctx.moveTo(x0, y + 0.5); ctx.lineTo(x1, y + 0.5); ctx.stroke();
    // the last clause: where a release is true. A faint band, not a highlight.
    const wx = x0 + r.windowFrom * w;
    ctx.globalAlpha = phase === 'window' ? 0.26 : 0.12;
    ctx.fillStyle = 'rgb(214,220,228)';
    ctx.fillRect(wx, y - 2, x1 - wx, 4);
    ctx.globalAlpha = phase === 'window' ? 0.95 : 0.55;
    ctx.beginPath(); ctx.moveTo(wx, y + 0.5); ctx.lineTo(x1, y + 0.5); ctx.stroke();
    // one tick per clause mark, and the start of the track
    ctx.globalAlpha = 0.55; ctx.strokeStyle = 'rgb(180,188,198)';
    ctx.beginPath(); ctx.moveTo(x0, y - 3); ctx.lineTo(x0, y + 3); ctx.stroke();
    for (let i = 0; i < r.ticks.length; i++) {
      const x = x0 + r.ticks[i] * w;
      ctx.beginPath(); ctx.moveTo(x, y - (i === r.ticks.length - 1 ? 4 : 2.5)); ctx.lineTo(x, y + 2); ctx.stroke();
    }
    // the playhead: where the line has arrived
    if (frac != null) {
      const x = x0 + Math.max(0, Math.min(1, frac)) * w;
      ctx.globalAlpha = 0.95; ctx.strokeStyle = 'rgb(232,236,240)';
      ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x, y + 3); ctx.stroke();
    }
    // the mark a release leaves: solid sharp, open soft, double blown
    if (mark && mark.frac != null) {
      const x = x0 + Math.max(0, Math.min(1, mark.frac)) * w;
      ctx.globalAlpha = 0.9; ctx.strokeStyle = 'rgb(232,236,240)';
      if (mark.verdict === 'sharp') { ctx.beginPath(); ctx.moveTo(x, y - 3); ctx.lineTo(x, y + 3); ctx.stroke(); }
      else if (mark.verdict === 'soft') { ctx.strokeRect(x - 1.5, y - 3, 3, 6); }
      else { ctx.beginPath(); ctx.moveTo(x - 2, y - 3); ctx.lineTo(x - 2, y + 3); ctx.moveTo(x + 2, y - 3); ctx.lineTo(x + 2, y + 3); ctx.stroke(); }
    }
    ctx.restore();
  }

  // ── 0.6.0 · the ride ──────────────────────────────────────────────────────
  // Holding a cell past the decode sets the district's own line riding at its
  // own pace. Let go at the end. A ride spends no breath: breath is the
  // walk's stake; attention is the ride's.
  function startRide(cell) {
    if (!cell || !S.source || !cell.unit) return null;
    const d = S.source.districts[cell.unit.p];
    if (!d || !d.line) return null;
    S.ride = { plan: C.waveOf(d.line), t: 0, t0: 0, misses: 0, over: false, verdict: null, p: cell.unit.p };
    S.decodeCell = null;
    S.loop = false;                                     // a new attempt is not the old loop
    if (S.drag) S.drag.moved = true;                    // the hold already acted (probes may have no drag)
    wake();                                             // the ride needs frame time
    draw();
    return S.ride.plan;
  }
  function endRide() {
    if (!S.ride || S.ride.over) return null;
    const out = C.rideRelease(S.ride, S.ride.plan, S.ride.t);
    const relAt = C.rideAt(S.ride, S.ride.plan, S.ride.t);
    S.ride = Object.assign(S.ride, out.ride, { markChar: relAt.charFrac });
    if (out.verdict === 'soft') {
      // the instrument bends: the line rewinds to the clause you were in, and
      // the strip says so while the playhead walks back
      const toAt = C.rideAt(S.ride, S.ride.plan, out.rewindToMs);
      S.ride.t0 = 0; S.ride.t = out.rewindToMs; S.ride.over = false; S.ride.verdict = null;
      S.ride.rewindFrom = relAt.charFrac; S.ride.rewindTo = toAt.charFrac;
      S.ride.rewindStart = null; S.ride.rewindU = 0; S.ride.rewindUntil = 1;
    } else if (out.verdict === 'sharp') {
      S.rides[S.ride.p] = (S.rides[S.ride.p] || 0) + 1;
      S.taughtRide = true; S.loop = false;
      if (S.ledger) { S.ledger.rides = S.rides; S.ledger.taught = true; saveLedger(); }
      say(['held to the end'], 'line', 5);
      if (window.SleeperLadderRead) window.SleeperLadderRead.refresh();
    } else if (out.verdict === 'blown') {
      say(['late · past the end'], 'line', 5);
    } else if (out.verdict === 'lost') {
      S.loop = true;                                  // three early releases: the loop won
      say(['the loop is stronger than the line · tap the source line'], 'line', 6);
      if (window.SleeperLadderRead) window.SleeperLadderRead.refresh();
    }
    draw();
    return out.verdict;
  }
  function rideVoiceLines() {
    const r = S.ride, p = r.plan;
    if (r.over) return [p.line, r.verdict === 'sharp' ? 'held to the end' : (r.verdict === 'blown' ? 'late · past the end' : 'early · three times')];
    if (r.rewindUntil) return [p.line, 'early · again from the clause'];
    const at = C.rideAt(r, p, r.t);
    return [p.line, at.phase === 'window' ? 'let go · the end' : 'keep holding · let go at the end'];
  }

  // ── pointer + keyboard (touch-first) ──────────────────────────────────────
  function cellFromEvent(e) {
    if (!S.field) return null;
    const r = cv.getBoundingClientRect();
    const g = geoFor(S.distance);
    const x = e.clientX - r.left, y = e.clientY - r.top;
    if (g.kind === 'fpv') {
      // the inverse of the same projection: a screen point is a ray, and where
      // the ray meets the ground is the room under the finger. Above the horizon
      // is the sky (the city's far edge) and there is nothing there to touch.
      const lay = g.lay, dy = y - lay.horizon;
      if (!(dy > 0.5)) return null;
      const d = lay.f * lay.eye / dy;
      if (!(d > 0.05)) return null;
      const cx = Math.floor(g.camX + (x - lay.w / 2) * d / lay.f), cy = Math.floor(g.camY - d);
      if (cx < 0 || cy < 0 || cx >= C.COLS || cy >= C.ROWS) return null;
      return S.field.cells[cy * C.COLS + cx];
    }
    if (!g.win) return null;
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
    if (S.ride && S.ride.over) S.ride = null;           // a finished ride clears on the next touch
    S.pointers = (S.pointers || 0) + 1;
    // TWO FINGERS = THE EYE. The view has no button: the second finger is the
    // whole control, it costs no pixel at rest, and it cannot be hit by accident
    // while walking (a walk is one finger).
    if (S.pointers >= 2) {
      if (!S.twoFinger) {
        S.twoFinger = true;
        clearTimeout(S.holdTimer); clearTimeout(S.cornerTimer);
        S.hold = null; S.drag = null;
        if (S.distance === 'ENTERED') toggleFpv(); else say(['the eye belongs to the walk — enter the city first'], 'line', 4);
        draw();
      }
      return;
    }
    try { if (cv.setPointerCapture && e.pointerId != null) cv.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointer */ }
    S.drag = { x: e.clientX, y: e.clientY, moved: false, axis: null };
    // a held corner tick opens a reveal: top-left is the note, bottom-right (the
    // distance corner) is the eye. Same hold, no new surface, no button.
    const g0 = geoFor(S.distance);
    const p0 = localXY(e);
    const corner = hit(noteTickRect(g0.dst), p0) ? 'note' : (hit(notchRect(g0.dst), p0) ? 'fpv' : null);
    if (corner) {
      clearTimeout(S.cornerTimer);
      S.cornerTimer = setTimeout(() => {
        if (!S.drag) return;
        S.drag.moved = true;
        if (corner === 'note') toggleNote();
        else if (S.distance === 'ENTERED') toggleFpv();
        else say(['the eye belongs to the walk — enter the city first'], 'line', 4);
        draw();
      }, 560);
    }
    if (S.note) return;                                  // the note takes the next tap
    const cell = cellFromEvent(e);
    // touch the broken ring: the rise begins under the thumb, and the same hold
    // that decodes a room now lifts the whole district into view. Holding where
    // you stand at a blocked threshold is the same act — that is what a person
    // does when the way is held, and the instrument should not punish it.
    if (cell && S.distance === 'ENTERED') {
      const gt = gateNear(cell);
      if (gt) {
        if (S.drag) S.drag.moved = true;      // the gate took the touch; no decode behind it
        if (S.act && S.act.i === gt.i) {
          if (S.act.kind === 'letgo') { S.act.held = true; wake(); return; }
          if (S.act.kind === 'silence' || S.act.kind === 'stay') { actTouch(); return; }
          return;                                   // a step-act is paid for in steps
        }
        if (!S.seen[gt.i]) { actStart(gt.i, false); return; }
      }
      // in the eye, the held press is the eye line itself: it rises while held
      // and settles when you let go. The decode still opens on a touch-tap.
      if (S.fpv) { S.eyeDir = 1; wake(); }
    }
    if (cell && (S.distance === 'NEAR' || S.distance === 'ENTERED') && !reduced && !S.fpv) S.hold = { cx: cell.cx, cy: cell.cy, phase: 0, t0: 0 };
    clearTimeout(S.holdTimer); clearTimeout(S.rideTimer);
    if (!S.fpv && !S.act) {
      S.holdTimer = setTimeout(() => {
        if (!S.drag) return;
        const c2 = cellFromEvent({ clientX: S.drag.x, clientY: S.drag.y });
        if (c2) { S.drag.moved = true; openDecode(c2); }
      }, HOLD_MS);
      // keep holding: the decode becomes the ride
      S.rideTimer = setTimeout(() => {
        if (!S.drag || !S.decodeCell) return;
        const c2 = cellFromEvent({ clientX: S.drag.x, clientY: S.drag.y });
        if (c2) startRide(c2);
      }, RIDE_MS);
    }
    wake();
  });
  cv.addEventListener('pointermove', (e) => {
    if (!S.drag || !S.field) return;
    const dx = e.clientX - S.drag.x, dy = e.clientY - S.drag.y;
    // a thumb is not a mouse: 10 px of natural drift must not cancel a hold.
    // 16 px still ends a hold long before a walk step (~0.8 of a cell).
    if (Math.hypot(dx, dy) > 16) { S.drag.moved = true; clearTimeout(S.holdTimer); clearTimeout(S.rideTimer); }
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
    clearTimeout(S.holdTimer); clearTimeout(S.cornerTimer); clearTimeout(S.rideTimer);
    S.hold = null; S.drag = null; S.eyeDir = 0;
    wake(); draw();
  }
  cv.addEventListener('pointerup', (e) => {
    if (S.ride && !S.ride.over) {
      endRide();
      S.drag = null; S.hold = null;
      S.pointers = Math.max(0, (S.pointers || 1) - 1);
      if (S.pointers === 0) S.twoFinger = false;
      if (e && e.pointerId != null && cv.releasePointerCapture) { try { cv.releasePointerCapture(e.pointerId); } catch (err) { /* released */ } }
      return;
    }
    if (S.act && S.act.held) S.act.held = false;      // a let-go that is let go drains
    S.pointers = Math.max(0, (S.pointers || 1) - 1);
    const wasTwo = !!S.twoFinger;
    if (S.pointers === 0) S.twoFinger = false;
    const wasMoved = S.drag && S.drag.moved;
    const p = localXY(e);
    const wasRising = !!S.rise;
    const noteWasOpen = S.note;
    endPointer();
    const release = () => { if (e && e.pointerId != null && cv.releasePointerCapture) { try { cv.releasePointerCapture(e.pointerId); } catch (err) { /* released */ } } };
    if (wasTwo) { release(); return; }                 // the second finger already chose
    if (wasRising) {                                   // let go early: the district settles back
      riseEnd();
      release();
      return;
    }
    if (wasMoved) { release(); return; }               // a hold or a drag already acted
    if (noteWasOpen) { toggleNote(false); release(); return; }
    // 1. a door, if a gate is open (the only thumb-sized answer)
    if (S.gate && S.distance === 'ENTERED') {
      const di = doorFromEvent(e);
      if (di >= 0) { answerDoor(di); release(); return; }
    }
    // 2. the frame's two corners: the note (top-left) and the distance (bottom-right)
    const g = geoFor(S.distance);
    if (hit(noteTickRect(g.dst), p)) { toggleNote(); release(); return; }
    if (hit(notchRect(g.dst), p)) { advance(); release(); return; }
    // 3. the world itself
    if (S.distance === 'FAR') setDistance('NEAR');
    else if (S.distance === 'NEAR') setDistance('ENTERED');
    else if (S.distance === 'ENTERED') { const c = cellFromEvent(e); if (c) openDecode(c); }
    else if (S.distance === 'EXITED') resetRoute();
    if (e && e.pointerId != null && cv.releasePointerCapture) { try { cv.releasePointerCapture(e.pointerId); } catch (err) { /* released */ } }
  });
  cv.addEventListener('pointercancel', (e) => {
    // a browser gesture can cancel a touch mid-ride (iOS does it on a long
    // press that drifts). The release still has to count; never leave a ride
    // running with no finger on it. A rewind already counts as released.
    if (S.ride && !S.ride.over && !S.ride.rewindUntil) { endRide(); S.drag = null; S.hold = null; }
    endPointer();
  });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (S.rise) { S.rise = null; draw(); return; } closeDecode(); if (S.gate) { S.gate = null; draw(); } return; }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      // a keyboard cannot hold: one press begins the same act, and the act runs
      const st = S.distance === 'ENTERED' ? gateNear(S.walker) : null;
      if (st) { actStart(st.i, true); return; }
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
      gates: S.gates.map((g, i) => {
        const f = S.factors && S.factors[i];
        return { i: g.i, x: g.cx, y: g.cy, p: g.p, dist: g.dist, lit: !!S.lit[i], strikes: S.strikes[i],
          factor: f ? f.key : null, en: f ? f.en : null, act: f ? f.act : null, kind: kindOf(i) };
      }),
      breath: S.breath, breathMax: S.breathMax, ended: S.ended,
      act: S.act ? { i: S.act.i, key: S.act.key, kind: S.act.kind, need: S.act.need, got: S.act.got } : null,
      gate: S.gate ? { i: S.gate.i, p: S.gate.p, cloze: S.gate.cloze, answer: S.gate.answer, options: S.gate.options.slice() } : null,
      doors: doorRects().length,
      lit: Array.from(S.lit || []).reduce((n, v) => n + v, 0),
      ledger: S.ledger ? { seq: S.ledger.seq, read: Object.keys(S.ledger.seen).length, seen: S.ledger.seen } : null,
      voice: S.voice ? { kind: S.voice.kind, lines: S.voice.lines.slice() } : null,
      decode: S.decodeCell,
      // 0.4.0: the eye, the boundary, the reading head — each a real field of the
      // view, not a flag about the UI
      view: {
        fpv: !!S.fpv, eyeK: +S.eyeK.toFixed(3),
        horizon: S.fpv ? +(C.fpvLayout(W, fieldH(), C.FPV.eye + (C.FPV.eyeHigh - C.FPV.eye) * S.eyeK).horizon).toFixed(2) : null,
        eye: S.fpv ? +(C.FPV.eye + (C.FPV.eyeHigh - C.FPV.eye) * S.eyeK).toFixed(3) : null,
        note: !!S.note, block: S.block ? { n: S.block.n, face: S.block.dir } : null,
      },
      head: S.walker ? C.readingHead(S.field, S.walker.n) : null,
      // what the city is under, and what you are carrying: the chain, not a value
      weather: S.weather ? {
        carry: S.weather.carry,
        p: S.weather.steps.length ? S.weather.steps[S.weather.steps.length - 1].p : null,
        here: S.weather.steps.length ? S.weather.steps[S.weather.steps.length - 1].weather : null,
        steps: S.weather.steps.map((s) => ({ p: s.p, in: s.carryIn, out: s.weather })),
      } : null,
      sight: S.gates.length ? {
        p: S.gates[0].p, kind: kindOf(0), seen: !!S.seen[0],
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
    adjacentSight: () => { const t = gateNear(S.walker); return t ? { i: t.i, p: t.p, x: t.cx, y: t.cy, kind: kindOf(t.i) } : null; },
    // 0.5.0 probes: the factor a gate asks, the act, and the breath the walk costs
    factors: () => (S.factors ? JSON.parse(JSON.stringify(S.factors)) : []),
    factor: (i) => (S.factors ? S.factors[i] || null : null),
    gateVoice: (i) => gateVoice(i == null ? 0 : i),
    act: (i) => actStart(i == null ? 0 : i, true),
    breath: (n) => {
      if (n == null) return { breath: S.breath, max: S.breathMax };
      S.breath = Math.max(0, Math.min(S.breathMax == null ? 0 : S.breathMax, Number(n) || 0));
      draw(); return S.breath;
    },
    // 0.4.0 probes: the eye, the note, the reading head, and the projection itself
    fpv: (on) => toggleFpv(on),
    note: (on) => toggleNote(on),
    eye: (k) => { S.eyeK = Math.max(0, Math.min(1, Number(k) || 0)); S.eyeDir = 0; draw(); return S.eyeK; },
    head: (n) => C.readingHead(S.field, n == null ? (S.walker ? S.walker.n : 0) : n),
    fpvRows: (eye) => {
      const lay = C.fpvLayout(W, fieldH(), eye == null ? C.FPV.eye : eye);
      const out = [];
      for (let cy = (S.walker ? S.walker.cy : 15) - 1; cy >= 0; cy--) out.push({ cy, row: C.fpvRow(lay, (S.walker ? S.walker.cy + 0.5 : 15.5) - (cy + 0.5)) });
      return { lay: { w: lay.w, h: lay.h, f: lay.f, horizon: lay.horizon, eye: lay.eye }, rows: out };
    },
    walls: (n) => C.wallFaces(S.field, n),
    // probe-only: where a cell sits on screen (CSS px), so a proof can touch the
    // real control path instead of calling the handler it is meant to exercise
    screenOf: (n) => {
      const g = geoFor(S.distance);
      if (!g || !g.win || !S.field) return null;
      const c = S.field.cells[n];
      return { x: g.dst.x + (c.cx - g.win.ox + 0.5) * g.cell, y: g.dst.y + (c.cy - g.win.oy + 0.5) * g.cell };
    },
    openSides: () => C.openSides(S.field, S.walker),
    weatherOf: (p) => weatherFor(p),
    weatherInk: (p) => bandMarks(geoEntered(), p == null ? (S.walker ? S.walker.unit.p : 0) : p),
    shape: (p) => (S.field && S.field.edges[p] ? S.field.edges[p].map((s) => s.slice()) : null),
    voice: () => voiceLines(),
    doors: () => doorRects().map((r) => ({ i: r.i, x: r.x, y: r.y, w: r.w, h: r.h })),
    layout: () => ({ w: W, h: H, voiceH: VOICE_H }),
    // 0.6.0 probes: the ride's own state and score (never a UI)
    ride: () => (S.ride ? { p: S.ride.p, t: +S.ride.t.toFixed(1), over: S.ride.over, verdict: S.ride.verdict, misses: S.ride.misses, plan: S.ride.plan } : null),
    rideAt: () => (S.ride ? C.rideAt(S.ride, S.ride.plan, S.ride.t) : null),
    rides: () => JSON.parse(JSON.stringify(S.rides || {})),
    taught: () => !!S.taughtRide,
    loop: () => !!S.loop,
    lines: () => voiceLines(),
    redraw: () => { draw(); return true; },
    rail: () => { if (S.distance !== 'ENTERED' || !S.field) return null; const cell = S.decodeCell != null ? S.field.cells[S.decodeCell] : S.walker; const pl = planForCell(cell); return pl ? { windowFrom: +pl.windowCharFrom.toFixed(4), ticks: pl.tickChars.map((c) => +c.toFixed(4)), words: pl.words, chars: pl.chars } : null; },
    startRideAt: (n) => { const c = S.field && S.field.cells[n]; return c ? startRide(c) : null; },
    rideState: () => S.ride ? {
      t: Math.round(S.ride.t), over: !!S.ride.over, verdict: S.ride.verdict, misses: S.ride.misses,
      rewind: !!S.ride.rewindUntil, rewindU: +(S.ride.rewindU || 0).toFixed(3),
      markChar: S.ride.markChar == null ? null : +S.ride.markChar.toFixed(4),
      phase: C.rideAt(S.ride, S.ride.plan, S.ride.t).phase,
    } : null,
    frameRect: () => { const g = geoFor(S.distance); return g && g.dst ? { x: g.dst.x, y: g.dst.y, w: g.dst.w, h: g.dst.h } : null; },
    fieldStats: () => S.field ? {
      cutQ: S.field.cutQ, cut: +S.field.cut.toFixed(5), walkable: S.field.walkable, reachable: S.field.reachable,
      lumRange: { min: +S.field.lum.min.toFixed(4), max: +S.field.lum.max.toFixed(4) },
      drawn: S.field.drawn, sourceCounts: S.field.source.counts, start: { x: S.field.start.cx, y: S.field.start.cy },
      fingerprint: S.field.source.fingerprint, matter: S.source.matter.length, districts: S.source.districts.length,
      gates: S.gates.length, factors: S.factors ? S.factors.length : 0,
      breath: S.breath, breathMax: S.breathMax,
    } : null,
  });

  fit();
  draw();
  updateChrome();
})();
