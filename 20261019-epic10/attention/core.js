/* core.js — ATTN·SPIRAL (lane "attention") — pure geometry, data and frame builder.
   ZERO dependencies. Deterministic: mark geometry is a pure function of the data
   (no Math.random, no time, no view state beyond the selection tuple).

   Encoding law (one way, stated once — P5/P8 omnibar glyph law):
     arc    = day        (14 days, 41deg each, Archimedean spiral wound around a
                         FIXED central bar — position is stable, nothing scrolls)
     lane   = project    (8 fixed radial lanes, inner->outer, lane order = PROJECTS)
     length = volume     (arc length of the mark = messages + artifacts, linear
                         against the window maximum; alpha also rises with volume)
     tick   = state      (radial tick at the mark's leading end: length = shipped
                         share; mark solid when shipped-dominant, dashed when open)
     dot    = open share (trailing-end dot radius = open share — the complement)
     gauge  = split      (central bar column: total height = context share of the
                         14-day window, bottom=shipped, top=open)

   Quiet law (P1/P3): every rest alpha <= QUIET_CAP (0.12); accents (gold/cool)
   appear only when reveal > 0, i.e. only on approach. frame() returns a plain
   display list so selftest.mjs can assert the law without a browser.

   Identity law (P2, absorbed from lib/moire-ambient.js v0.2 — same FNV-1a hash32
   and same bit-slice derivation, so tags match the house microlib's): each
   project's moire stamp is a pure function of its name. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ATTN = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DEG = Math.PI / 180;
  const r2 = (n) => Math.round(n * 100) / 100;
  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

  /* ---- palette (house pixel truth 2026-10-07: pad (8,12,18), lines (79,87,96)) ---- */
  const PAD  = Object.freeze([8, 12, 18]);
  const INK  = Object.freeze([79, 87, 96]);
  const GOLD = Object.freeze([215, 174, 103]);  // warm — shipped, approach only
  const COOL = Object.freeze([114, 188, 231]);  // cool — open, approach only
  const QUIET_CAP = 0.12;

  /* ---- projects: lane order is data, never sorted at render time ---- */
  const PROJECTS = Object.freeze([
    'the-field', 'fleet-ops', 'fold-house-os', 'art-borrowed-hand',
    'care', 'maker-hardware', 'research-absorb', 'comms',
  ]);

  /* ---- hash32: FNV-1a. Identical to lib/moire-ambient.js v0.2 (house microlib)
          so identity tags agree with /field/ and /fovea/. Absorbed, not forked. ---- */
  function hash32(str) {
    let h = 0x811c9dc5;
    const s = String(str);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  }

  /* identity — deterministic moire identity from a content hash (P2):
     same seed -> identical pattern, different seed -> distinct, human-legible
     8-hex tag rides the legend. Near-parallel hairline gratings: strong beats. */
  function identity(seed, n) {
    const h = hash32(seed);
    const tag = ('00000000' + h.toString(16)).slice(-8);
    const layers = clamp(n == null ? 3 : n, 1, 5);
    const out = [];
    for (let i = 0; i < layers; i++) {
      const b1 = (h >>> (i * 5)) & 1023;
      const b2 = (h >>> (i * 7 + 3)) & 2047;
      const b3 = (Math.imul(h ^ (0x9e3779b9 * (i + 1)), 0x85ebca6b) >>> 0);
      out.push(Object.freeze({
        key: 'id' + (i + 1),
        angle: r2(1 + (b1 % 1000) / 1000 * 10),
        pitch: r2(5 + (b2 % 5)),
        phase: r2((b3 % 997) / 997 * 7),
        alpha: r2(0.06 + ((b2 >> 2) % 4) * 0.01),
      }));
    }
    return Object.freeze({ seed: String(seed), tag, layers: Object.freeze(out) });
  }

  /* ---- view (logical pixels; the canvas is CSS-scaled, geometry never rescales) ---- */
  const NDAYS = 14;
  const VIEW = Object.freeze({
    W: 390, H: 430, CX: 195, CY: 215,
    DAY_ANGLE: 52,        // deg of arc per day (2.02 turns wound around the bar)
    B: 6.6,               // Archimedean growth, px per radian (turn gap > lane band)
    R0: 58,               // spine radius at t=0 (clear of the bar corners: hypot(28,46)=54)
    LANE_PITCH: 4.6,      // lane = project (radial)
    LANES: PROJECTS.length,
    MAX_FILL: 0.90,       // the max-volume mark fills this fraction of a day arc
    BAR_HALF_W: 28, BAR_HALF_H: 46,
    TICK_MIN: 0.8, TICK_GAIN: 2.4,   // tick length = shipped share
    DOT_MIN: 0.5, DOT_GAIN: 1.1,     // dot radius = open share
    QUIET_MIN: 0.035, QUIET_GAIN: 0.085,
    REVEAL_MIN: 0.50, REVEAL_GAIN: 0.30,
  });
  const DAY_SPAN = VIEW.DAY_ANGLE * DEG;
  const TMAX = NDAYS * DAY_SPAN;
  /* LREF — the length law: a mark's ARC LENGTH is exactly LREF * volume / maxVolume,
     measured along its own lane. The spiral's radius then sets only how much of the
     day sector it covers, so an equal volume always draws an equal-length mark. */
  const LREF = r2(VIEW.MAX_FILL * DAY_SPAN * VIEW.R0);

  /* ---- dataset: 14 days, 2026-10-06..10-19, per project [messages, artifacts,
         shipped, open]. s + o === m + a by construction (selftest enforces).
         Heavy around 10-07 (epic kickoff) and 10-18 (moire ambient layers);
         quiet elsewhere. Realistic, hand-authored — no generation at runtime. ---- */
  function D(date, c) { return Object.freeze({ date, c: Object.freeze(c.map(Object.freeze)) }); }
  const DATA = Object.freeze([
    D('2026-10-06', [[4,1,3,2],[3,0,2,1],[0,0,0,0],[2,1,1,2],[2,0,1,1],[0,0,0,0],[3,1,1,3],[4,0,2,2]]),
    D('2026-10-07', [[14,6,12,8],[6,2,5,3],[5,1,4,2],[3,2,2,3],[1,0,0,1],[2,1,1,2],[5,2,3,4],[9,1,6,4]]),
    D('2026-10-08', [[8,3,7,4],[4,1,3,2],[3,0,2,1],[2,1,1,2],[2,0,1,1],[1,1,1,1],[4,1,2,3],[6,0,3,3]]),
    D('2026-10-09', [[3,1,2,2],[2,0,1,1],[0,0,0,0],[1,1,1,1],[3,0,2,1],[0,0,0,0],[2,1,1,2],[3,0,2,1]]),
    D('2026-10-10', [[2,0,1,1],[0,0,0,0],[1,0,0,1],[3,2,3,2],[4,0,2,2],[2,1,2,1],[1,0,0,1],[2,0,1,1]]),
    D('2026-10-11', [[1,0,0,1],[1,0,1,0],[0,0,0,0],[2,1,2,1],[5,0,3,2],[1,0,0,1],[2,0,1,1],[2,0,1,1]]),
    D('2026-10-12', [[6,2,5,3],[3,1,3,1],[2,1,2,1],[1,0,1,0],[2,0,1,1],[3,2,4,1],[3,1,2,2],[4,0,2,2]]),
    D('2026-10-13', [[5,1,4,2],[2,0,1,1],[3,1,3,1],[1,1,1,1],[2,0,1,1],[1,0,0,1],[2,1,1,2],[3,0,2,1]]),
    D('2026-10-14', [[7,2,6,3],[4,1,3,2],[2,0,1,1],[2,1,2,1],[2,0,1,1],[2,1,2,1],[4,2,3,3],[5,1,4,2]]),
    D('2026-10-15', [[3,1,2,2],[2,0,1,1],[1,0,1,0],[2,0,1,1],[3,0,2,1],[0,0,0,0],[3,1,2,2],[3,0,1,2]]),
    D('2026-10-16', [[6,2,4,4],[3,1,2,2],[4,1,3,2],[2,1,1,2],[1,0,0,1],[2,1,2,1],[6,2,4,4],[5,1,3,3]]),
    D('2026-10-17', [[2,0,1,1],[1,0,1,0],[2,1,2,1],[3,2,3,2],[3,0,2,1],[2,1,2,1],[2,0,1,1],[2,0,1,1]]),
    D('2026-10-18', [[16,7,15,8],[5,2,4,3],[6,2,5,3],[4,2,3,3],[2,0,1,1],[3,1,2,2],[7,3,5,5],[11,2,8,5]]),
    D('2026-10-19', [[12,8,9,11],[6,3,4,5],[5,2,3,4],[3,2,2,3],[2,0,1,1],[3,2,3,2],[6,3,3,6],[9,2,5,6]]),
  ]);

  /* ---- cell accessors ---- */
  const vol   = (cell) => cell[0] + cell[1];
  const total = (cell) => cell[2] + cell[3];
  const share = (cell) => (total(cell) ? cell[2] / total(cell) : 0);
  const state = (cell) => (cell[2] >= cell[3] ? 'shipped' : 'open');

  function maxVol(data) {
    let m = 1;
    for (const d of data) for (const c of d.c) { const v = vol(c); if (v > m) m = v; }
    return m;
  }

  /* ---- spiral primitives (pure) ---- */
  const spineR = (t) => VIEW.R0 + VIEW.B * t;
  const laneR  = (t, k) => spineR(t) + k * VIEW.LANE_PITCH;
  function polar(t, r) {
    const a = VIEW.DAY_ANGLE * 0 + t + (-90 * DEG); // start at 12 o'clock, clockwise
    return { x: r2(VIEW.CX + r * Math.cos(a)), y: r2(VIEW.CY + r * Math.sin(a)) };
  }
  const dayT = (d) => [d * DAY_SPAN, (d + 1) * DAY_SPAN];

  /* polyline along one lane's spiral over [t0,t1], sampled ~every 3px of arc */
  function lanePolyline(t0, t1, k) {
    const pts = [];
    const rMid = laneR((t0 + t1) / 2, k);
    const n = Math.max(2, Math.ceil((t1 - t0) * rMid / 3));
    for (let i = 0; i <= n; i++) {
      const t = t0 + (t1 - t0) * (i / n);
      const p = polar(t, laneR(t, k));
      pts.push([p.x, p.y]);
    }
    return pts;
  }

  /* ---- marks: the datum-bearing layer. Pure function of (data, view).
          Length law: arc length = LREF * volume / maxVolume, exactly — because
          ∫(R0 + B·t)dt over an interval centred on tc equals (R0 + B·tc)·Δt, so
          Δt = L / laneR(tc) gives the target length to the pixel. ---- */
  function buildMarks(data) {
    const mx = maxVol(data);
    const out = [];
    for (let d = 0; d < data.length; d++) {
      const [t0, t1] = dayT(d);
      const tc = (t0 + t1) / 2;
      for (let k = 0; k < data[d].c.length; k++) {
        const cell = data[d].c[k];
        const v = vol(cell);
        if (v <= 0) continue;                    // P4: no datum -> no layer
        const L = LREF * (v / mx);               // exact arc length for this volume
        const rm = laneR(tc, k);
        const hw = L / (2 * rm);
        const mt0 = tc - hw, mt1 = tc + hw;
        const sh = share(cell);
        const p1 = polar(mt1, laneR(mt1, k));
        const tickOut = r2(VIEW.TICK_MIN + VIEW.TICK_GAIN * sh);
        const pe = polar(mt1, laneR(mt1, k) + tickOut);
        const openShare = 1 - sh;
        const dotR = r2(VIEW.DOT_MIN + VIEW.DOT_GAIN * openShare);
        const pd = polar(mt0, laneR(mt0, k));
        const cm = polar(tc, rm);
        out.push(Object.freeze({
          d, k, name: data[d].date, project: PROJECTS[k],
          m: cell[0], a: cell[1], s: cell[2], o: cell[3],
          v, share: r2(sh), state: state(cell),
          t0: r2(mt0), t1: r2(mt1), lane: r2(rm),
          len: r2(L),
          quiet: r2(VIEW.QUIET_MIN + VIEW.QUIET_GAIN * (v / mx)),
          reveal: r2(VIEW.REVEAL_MIN + VIEW.REVEAL_GAIN * (v / mx)),
          solid: cell[2] >= cell[3],              // shipped-dominant -> solid stroke
          tick: Object.freeze({ x0: p1.x, y0: p1.y, x1: pe.x, y1: pe.y, len: tickOut }),
          dot: cell[3] > 0 ? Object.freeze({ x: pd.x, y: pd.y, r: dotR }) : null,
          pts: Object.freeze(lanePolyline(mt0, mt1, k)),
          cx: cm.x, cy: cm.y,
        }));
      }
    }
    return Object.freeze(out);
  }

  /* ---- reports: the numbers behind the bloom (hover metadata) ---- */
  function report(data, d) {
    const day = data[d];
    const rows = [];
    const r = { date: day.date, day: d, total: 0, msg: 0, art: 0, shipped: 0, open: 0, rows };
    for (let k = 0; k < day.c.length; k++) {
      const c = day.c[k];
      const id = identity(PROJECTS[k]);
      rows.push(Object.freeze({
        k, name: PROJECTS[k], tag: id.tag,
        m: c[0], a: c[1], s: c[2], o: c[3],
        v: vol(c), share: r2(share(c)), state: state(c),
      }));
      r.msg += c[0]; r.art += c[1]; r.shipped += c[2]; r.open += c[3];
    }
    r.total = r.msg + r.art;
    return Object.freeze(r);
  }
  function window_(data) {
    const r = { total: 0, msg: 0, art: 0, shipped: 0, open: 0, days: data.length, maxDay: 0, maxDayIdx: 0 };
    for (let d = 0; d < data.length; d++) {
      const x = report(data, d);
      r.total += x.total; r.msg += x.msg; r.art += x.art; r.shipped += x.shipped; r.open += x.open;
      if (x.total > r.maxDay) { r.maxDay = x.total; r.maxDayIdx = d; }
    }
    return Object.freeze(r);
  }

  /* ---- hit test: pointer -> {d, k} by nearest lane band. Turn disambiguation is
          safe because 2*pi*B (45.2px) exceeds the lane band + tick (39.9px). ---- */
  function hitTest(data, x, y) {
    const dx = x - VIEW.CX, dy = y - VIEW.CY;
    const rr = Math.hypot(dx, dy);
    let base = Math.atan2(dy, dx) - (-90 * DEG);
    base = ((base % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    let best = null;
    for (let m = 0; m <= 3; m++) {
      const t = base + m * 2 * Math.PI;
      if (t > TMAX) break;
      const d = Math.floor(t / DAY_SPAN);
      if (d < 0 || d >= data.length) continue;
      let dist = Infinity, k = -1;
      for (let j = 0; j < VIEW.LANES; j++) {
        const dd = Math.abs(rr - laneR(t, j));
        if (dd < dist) { dist = dd; k = j; }
      }
      if (!best || dist < best.dist) best = { d, k, dist: r2(dist) };
    }
    return (best && best.dist <= VIEW.LANE_PITCH / 2 + 2) ? best : null;
  }

  /* ---- frame: the whole render as a pure display list. app.js only paints it.
          sel = { d: <dayIdx|null>, reveal: 0..1 }. ---- */
  function frame(data, sel) {
    const s = sel || {};
    const active = s.d == null ? null : s.d;
    const rev = clamp(s.reveal || 0, 0, 1);
    const mx = maxVol(data), win = window_(data);
    const ops = [];
    const push = (o) => ops.push(Object.freeze(o));

    /* 1 — central bar: the fixed reference, never reflows (P5) */
    const bw = VIEW.BAR_HALF_W, bh = VIEW.BAR_HALF_H;
    push({ t: 'rect', x: VIEW.CX - bw, y: VIEW.CY - bh, w: bw * 2, h: bh * 2, c: INK, a: 0.035, fill: true });
    push({ t: 'line', x0: VIEW.CX - bw, y0: VIEW.CY - bh, x1: VIEW.CX - bw, y1: VIEW.CY + bh, c: INK, a: 0.12, w: 1 });
    push({ t: 'line', x0: VIEW.CX + bw, y0: VIEW.CY - bh, x1: VIEW.CX + bw, y1: VIEW.CY + bh, c: INK, a: 0.12, w: 1 });

    /* gauge: context total as a share of the 14-day window, split shipped/open */
    const day = active == null ? null : report(data, active);
    const ctxTotal = day ? day.total : win.total;
    const ctxShip = day ? day.shipped : win.shipped;
    const ctxOpen = day ? day.open : win.open;
    const gFull = (bh * 2) - 16;
    const gH = r2(gFull * (ctxTotal / win.total));
    const gShipH = r2(gH * (ctxShip / Math.max(1, ctxTotal)));
    const gY = VIEW.CY + bh - 8;
    push({ t: 'rect', x: VIEW.CX - 1.5, y: gY - gH, w: 3, h: r2(gH - gShipH), c: (rev > 0 && active != null) ? COOL : INK, a: (rev > 0 && active != null) ? r2(0.12 + 0.45 * rev) : 0.10, fill: true });
    push({ t: 'rect', x: VIEW.CX - 1.5, y: gY - gShipH, w: 3, h: gShipH, c: (rev > 0 && active != null) ? GOLD : INK, a: (rev > 0 && active != null) ? r2(0.12 + 0.45 * rev) : 0.10, fill: true });

    /* 2 — lane guides: the 8 project spirals (lane = project) */
    for (let k = 0; k < VIEW.LANES; k++) {
      push({ t: 'poly', pts: lanePolyline(0, TMAX, k), c: INK, a: 0.028, w: 1, stroke: true });
    }
    /* 3 — day boundary spokes (arc = day) */
    for (let d = 0; d <= data.length; d++) {
      const t = d * DAY_SPAN;
      const p0 = polar(t, laneR(t, 0));
      const p1 = polar(t, laneR(t, VIEW.LANES - 1) + 2);
      push({ t: 'line', x0: p0.x, y0: p0.y, x1: p1.x, y1: p1.y, c: INK, a: 0.045, w: 1 });
    }

    /* 4 — bloom sector behind the selected day (depth behind explicit reveal) */
    if (active != null && rev > 0) {
      const [st, et] = dayT(active);
      const outer = [];
      for (let i = 0; i <= 12; i++) { const t = st + (et - st) * (i / 12); outer.push(polar(t, laneR(t, VIEW.LANES - 1) + 4)); }
      const inner = [];
      for (let i = 12; i >= 0; i--) { const t = st + (et - st) * (i / 12); inner.push(polar(t, laneR(t, 0) - 2)); }
      push({ t: 'poly', pts: outer.concat(inner), c: INK, a: r2(0.05 * rev), fill: true });
      for (const t of [st, et]) {
        const p0 = polar(t, laneR(t, 0) - 2), p1 = polar(t, laneR(t, VIEW.LANES - 1) + 4);
        push({ t: 'line', x0: p0.x, y0: p0.y, x1: p1.x, y1: p1.y, c: INK, a: r2(0.18 + 0.24 * rev), w: 1 });
      }
    }

    /* 5 — marks (length = volume, tick = shipped share, dot = open share) */
    for (const mk of buildMarks(data)) {
      const selDay = active != null && mk.d === active;
      let a = mk.quiet;
      if (active != null) a = selDay ? r2(mk.quiet + (mk.reveal - mk.quiet) * rev) : r2(mk.quiet * (1 - 0.55 * rev));
      const useAccent = selDay && rev > 0;
      const c = useAccent ? (mk.state === 'shipped' ? GOLD : COOL) : INK;
      push({ t: 'poly', pts: mk.pts, c, a, w: 2.2, stroke: true, dash: mk.solid ? null : [1.6, 2.6] });
      push({ t: 'line', x0: mk.tick.x0, y0: mk.tick.y0, x1: mk.tick.x1, y1: mk.tick.y1, c, a, w: 1.6 });
      if (mk.dot) push({ t: 'dot', x: mk.dot.x, y: mk.dot.y, r: mk.dot.r, c, a, fill: true });
    }
    return Object.freeze(ops);
  }

  /* ---- stampLines: a project's moire identity as hairline segments in a wxh box ---- */
  function stampLines(name, w, h) {
    const id = identity(name);
    const out = [];
    const diag = Math.hypot(w, h);
    for (const L of id.layers) {
      const rad = L.angle * DEG;
      const cos = Math.cos(rad), sin = Math.sin(rad);
      const lines = [];
      const off0 = -(diag / 2) + (L.phase % L.pitch);
      for (let off = off0; off < diag / 2; off += L.pitch) {
        const x0 = w / 2 + off * cos - (-diag / 2) * sin;
        const y0 = h / 2 + off * sin + (-diag / 2) * cos;
        const x1 = w / 2 + off * cos - (diag / 2) * sin;
        const y1 = h / 2 + off * sin + (diag / 2) * cos;
        lines.push([r2(x0), r2(y0), r2(x1), r2(y1)]);
      }
      out.push(Object.freeze({ key: L.key, alpha: L.alpha, lines: Object.freeze(lines) }));
    }
    return Object.freeze({ tag: id.tag, layers: Object.freeze(out) });
  }

  /* ---- geometry signature: same data -> same hash (selftest regression) ---- */
  function geomSignature(data) {
    const parts = [];
    for (const mk of buildMarks(data)) {
      parts.push([mk.d, mk.k, mk.t0.toFixed(2), mk.t1.toFixed(2), mk.lane.toFixed(2),
        mk.tick.x1.toFixed(2), mk.tick.y1.toFixed(2), mk.tick.len.toFixed(2),
        mk.dot ? mk.dot.r.toFixed(2) : 'x', mk.pts.length].join('.'));
    }
    const s = parts.join('|');
    return Object.freeze({ hash: ('00000000' + hash32(s).toString(16)).slice(-8), n: parts.length, sig: s });
  }

  return Object.freeze({
    version: '1.0', DEG, r2, clamp,
    PAD, INK, GOLD, COOL, QUIET_CAP,
    PROJECTS, DATA, NDAYS, DAY_SPAN, TMAX, VIEW, LREF,
    hash32, identity, stampLines,
    vol, total, share, state, maxVol,
    spineR, laneR, polar, dayT, lanePolyline,
    buildMarks, report, window: window_, hitTest, frame, geomSignature,
  });
});
