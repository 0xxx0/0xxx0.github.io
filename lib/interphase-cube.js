// lib/interphase-cube.js — CUBE-NET FOLD geometry microlib (one implementation).
//
// ABSORBED 2026-10-20 from the browser-verified donor
//   ~/void-anchor/AXIS/work/cube-net-2026-10-20/{index.html,core.js} (read-only, untouched).
// The donor proved the laws this module keeps; this file is the single absorbed copy so
// the field instrument and its selftest argue from the SAME model, never a fork.
//
// LAWS kept here (all pure — no DOM, no clock, no chance):
//   1. ONE OBJECT, TWO FOLD STATES, SIX READINGS. The cube and its flat cross net are the
//      same six panels: net = every hinge at 0°, cube = each hinge swung onto its wall.
//      Nothing is created, hidden or re-laid-out between states — the fold is a transform.
//   2. IDENTITY = FNV-1a-32. Geometry hashes derive from content canon, never from
//      chance — no dice exist anywhere in this module (the gate scans for them).
//   3. THE FOLD PIVOTS AT THE MARK. The plane's transform-origin is the anchor cell (1,1)
//      centre — 50% / 37.5% of the 3×4 net — and the perspective origin is the same point
//      in the field's frame. Both fold states share that origin, so the anchor point [x,y]
//      is INVARIANT across net ↔ cube ↔ net (the position law the donor proved).
//   4. Load modes: classic <script src> (window.InterphaseCube) AND CommonJS/ESM side
//      effect (module.exports + globalThis), like the rest of lib/interphase-*.
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  if (root) root.InterphaseCube = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION = 'interphase-cube/v0.1';
  // The six readings of one held object, in room order.
  const ORDER = Object.freeze(['OBJECT', 'ADDRESS', 'STATE', 'TRANSFORM', 'PROVE', 'RETURN']);

  /* face normals in the plane frame (screen y is down), same map as the donor room */
  const NORM = Object.freeze({
    OBJECT: [0, 0, 1], RETURN: [0, 0, -1], TRANSFORM: [1, 0, 0],
    ADDRESS: [-1, 0, 0], STATE: [0, -1, 0], PROVE: [0, 1, 0]
  });

  /* ── identity: FNV-1a-32 over the canon (never chance) ──────────────────── */
  function fnv1a32(str) {
    const bytes = new TextEncoder().encode(String(str));
    let h = 0x811c9dc5;
    for (let k = 0; k < bytes.length; k++) {
      h ^= bytes[k];
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  }
  function hex8(n) { return ('00000000' + (n >>> 0).toString(16)).slice(-8); }

  /* ── the net: 6 cells, 4 hinge groups, 1 nested (second-level) hinge ────── */
  /* cell = position inside the parent frame; unit cell is 1×1, plane is z=0.  */
  const LAYOUT = Object.freeze([
    Object.freeze({ face: 'OBJECT',    cell: [1, 1], hinge: 'none',   parent: null }),
    Object.freeze({ face: 'ADDRESS',   cell: [0, 1], hinge: 'left',   parent: null }),
    Object.freeze({ face: 'STATE',     cell: [1, 0], hinge: 'top',    parent: null }),
    Object.freeze({ face: 'TRANSFORM', cell: [2, 1], hinge: 'right',  parent: null }),
    Object.freeze({ face: 'PROVE',     cell: [1, 2], hinge: 'bottom', parent: null }),
    Object.freeze({ face: 'RETURN',    cell: [0, 1], hinge: 'bottom', parent: 'PROVE' })
  ]);

  /* hinge axis, origin on the shared edge (matches the 4 CSS groups), cube angle */
  const HINGE = Object.freeze({
    none:   Object.freeze({ axis: null, origin: [0, 0, 0],   cube: 0,  css: 'none' }),
    top:    Object.freeze({ axis: 'x',  origin: [0.5, 1, 0], cube: 90,  css: '50% 100%' }),
    bottom: Object.freeze({ axis: 'x',  origin: [0.5, 0, 0], cube: -90, css: '50% 0%' }),
    left:   Object.freeze({ axis: 'y',  origin: [1, 0.5, 0], cube: -90, css: '100% 50%' }),
    right:  Object.freeze({ axis: 'y',  origin: [0, 0.5, 0], cube: 90,  css: '0% 50%' })
  });

  /* ── 4×4 matrices, row-major, column vectors (p' = M p) ─────────────────── */
  function ident() { return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; }
  function mul(a, b) {
    const o = new Array(16);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[r * 4 + k] * b[k * 4 + c];
      o[r * 4 + c] = s;
    }
    return o;
  }
  function trans(x, y, z) { return [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z, 0, 0, 0, 1]; }
  function rotX(deg) {
    const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    return [1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0, 0, 0, 0, 1];
  }
  function rotY(deg) {
    const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    return [c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0, 0, 0, 0, 1];
  }
  /* rotation about a hinge line: T(origin) · R · T(−origin) */
  function hingeM(name, deg) {
    const h = HINGE[name];
    if (!h || !h.axis) return ident();
    const o = h.origin, T = trans(o[0], o[1], o[2]), Ti = trans(-o[0], -o[1], -o[2]);
    const R = h.axis === 'x' ? rotX(deg) : rotY(deg);
    return mul(T, mul(R, Ti));
  }
  function applyPoint(m, p) {
    return [
      m[0] * p[0] + m[1] * p[1] + m[2] * p[2] + m[3],
      m[4] * p[0] + m[5] * p[1] + m[6] * p[2] + m[7],
      m[8] * p[0] + m[9] * p[1] + m[10] * p[2] + m[11]
    ];
  }
  function applyDir(m, p) {
    return [
      m[0] * p[0] + m[1] * p[1] + m[2] * p[2],
      m[4] * p[0] + m[5] * p[1] + m[6] * p[2],
      m[8] * p[0] + m[9] * p[1] + m[10] * p[2]
    ];
  }

  /* ── geometry states ───────────────────────────────────────────────────── */
  function geometry(state) {
    const cube = state === 'cube';
    return LAYOUT.map(e => ({
      face: e.face, cell: [e.cell[0], e.cell[1]], hinge: e.hinge, parent: e.parent,
      angleDeg: cube ? HINGE[e.hinge].cube : 0
    }));
  }
  /* FOLD: each hinge swings to its cube angle (nested chain, not a re-layout) */
  function fold(geo) {
    return geo.map(e => ({
      face: e.face, cell: [e.cell[0], e.cell[1]], hinge: e.hinge, parent: e.parent,
      angleDeg: HINGE[e.hinge].cube
    }));
  }
  /* UNFOLD: the exact inverse — apply the opposite rotation on the same hinge */
  function unfold(geo) {
    return geo.map(e => ({
      face: e.face, cell: [e.cell[0], e.cell[1]], hinge: e.hinge, parent: e.parent,
      angleDeg: e.angleDeg - HINGE[e.hinge].cube
    }));
  }
  function entry(geo, face) {
    for (let i = 0; i < geo.length; i++) if (geo[i].face === face) return geo[i];
    return null;
  }
  /* world matrix of one face: parent chain · cell translation · hinge rotation */
  function worldMatrices(geo) {
    const out = {};
    for (let i = 0; i < geo.length; i++) {
      const e = geo[i], parent = (e.parent && out[e.parent]) || ident();
      out[e.face] = mul(mul(parent, trans(e.cell[0], e.cell[1], 0)), hingeM(e.hinge, e.angleDeg));
    }
    return out;
  }
  function round9(v) { if (Math.abs(v) < 5e-10) v = 0; return v.toFixed(9); }
  function hashGeometry(geo) {
    const mats = worldMatrices(geo), parts = [];
    for (let i = 0; i < ORDER.length; i++) {
      const f = ORDER[i], e = entry(geo, f), m = mats[f];
      let s = f + ':' + e.cell[0] + ',' + e.cell[1] + ':' + e.hinge + ':' +
              (e.parent || '-') + ':' + e.angleDeg + '|';
      for (let k = 0; k < 16; k++) s += round9(m[k]) + (k === 15 ? '' : ',');
      parts.push(s);
    }
    return hex8(fnv1a32(parts.join(';')));
  }
  /* expected closed-cube placement (anchor cell 1,1 spans x1..2 y1..2 z0..−1) */
  const CUBE_WALL = Object.freeze({
    OBJECT:    { c: [1.5, 1.5, 0],   n: [0, 0, 1] },
    STATE:     { c: [1.5, 1, -0.5],  n: [0, -1, 0] },
    PROVE:     { c: [1.5, 2, -0.5],  n: [0, 1, 0] },
    ADDRESS:   { c: [1, 1.5, -0.5],  n: [-1, 0, 0] },
    TRANSFORM: { c: [2, 1.5, -0.5],  n: [1, 0, 0] },
    RETURN:    { c: [1.5, 1.5, -1],  n: [0, 0, -1] }
  });
  function cubeCloses(geo) {
    const mats = worldMatrices(geo);
    let worst = 0;
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    for (let i = 0; i < ORDER.length; i++) {
      const f = ORDER[i], m = mats[f], want = CUBE_WALL[f];
      const c = applyPoint(m, [0.5, 0.5, 0]), n = applyDir(m, [0, 0, 1]);
      for (let k = 0; k < 3; k++) worst = Math.max(worst, Math.abs(c[k] - want.c[k]), Math.abs(n[k] - want.n[k]));
      /* rigid: basis stays orthonormal, no scale, no shear */
      const d0 = [m[0], m[4], m[8]], d1 = [m[1], m[5], m[9]], d2 = [m[2], m[6], m[10]];
      worst = Math.max(worst, Math.abs(dot(d0, d0) - 1), Math.abs(dot(d1, d1) - 1),
                       Math.abs(dot(d2, d2) - 1), Math.abs(dot(d0, d1)),
                       Math.abs(dot(d0, d2)), Math.abs(dot(d1, d2)));
    }
    return worst;
  }
  /* net → cube → net: identical geometry hash, matrices back within 1e-9 */
  function roundTrip() {
    const net = geometry('net'), cube = fold(net), back = unfold(cube);
    const a = worldMatrices(net), b = worldMatrices(back);
    let delta = 0;
    for (let i = 0; i < ORDER.length; i++) for (let k = 0; k < 16; k++)
      delta = Math.max(delta, Math.abs(a[ORDER[i]][k] - b[ORDER[i]][k]));
    const netHash = hashGeometry(net), cubeHash = hashGeometry(cube), backHash = hashGeometry(back);
    const closes = cubeCloses(cube);
    return { netHash, cubeHash, backHash, delta, closes,
      ok: netHash === backHash && netHash !== cubeHash && delta < 1e-9 && closes < 1e-9 };
  }

  /* ── THE FOLD PIVOTS AT THE MARK ────────────────────────────────────────── */
  /* Plane transform-origin, in % of the 3×4 net = the anchor cell (1,1) centre.
     Both fold states set it, so the anchor point is the fixed point of the fold. */
  const GRID = Object.freeze({ cols: 3, rows: 4 });
  function anchorCell() {
    const e = LAYOUT.find(x => x.face === 'OBJECT');
    return { cell: [e.cell[0], e.cell[1]], grid: GRID,
      originPct: { x: (e.cell[0] + 0.5) / GRID.cols * 100, y: (e.cell[1] + 0.5) / GRID.rows * 100 } };
  }
  /* The anchor cell centre is a fixed point of the plane transform in BOTH fold
     states, for two independent reasons that must agree:
       · the fold world matrix never moves it (OBJECT's hinge is 'none');
       · the plane rotation is applied ABOUT it (transform-origin == its centre),
         and a rotation about a point fixes that point exactly. */
  function anchorInvariant() {
    const anchor = [1.5, 1.5, 0], pct = anchorCell().originPct;
    /* transform-origin resolved back into plane units: % of the 3×4 net box */
    const originPlane = [pct.x / 100 * GRID.cols, pct.y / 100 * GRID.rows, 0];
    const faces = ['net', 'cube'].map(state => applyPoint(worldMatrices(geometry(state)).OBJECT, [0.5, 0.5, 0]));
    const rotations = [ident(), mul(rotX(-16), rotY(26))];
    /* T(o)·R·T(−o) applied to the anchor: the exact CSS transform-origin law */
    const pivot = rotations.map(R => {
      const o = originPlane, T = trans(o[0], o[1], o[2]), Ti = trans(-o[0], -o[1], -o[2]);
      const q = applyPoint(mul(T, mul(R, Ti)), anchor);
      return Math.max(Math.abs(q[0] - anchor[0]), Math.abs(q[1] - anchor[1]), Math.abs(q[2] - anchor[2]));
    });
    const faceDelta = Math.max(...faces.flatMap(c => c.map((v, k) => Math.abs(v - anchor[k]))));
    const originDelta = Math.max(...originPlane.map((v, k) => Math.abs(v - anchor[k])));
    const pivotDelta = Math.max(...pivot);
    return { anchor, faces, originPlane, faceDelta, originDelta, pivotDelta,
      ok: faceDelta < 1e-9 && originDelta < 1e-9 && pivotDelta < 1e-9 };
  }
  /* Room placement: the plane is positioned so the anchor cell centre sits exactly
     on the mark's screen point, and the net is clamped to the field box by sizing
     only — the anchor itself never moves (position is the datum, size is the fit). */
  function roomGeometry(point, box, bounds) {
    const min = Math.max(32, Number(bounds && bounds.min) || 44), max = Number(bounds && bounds.max) || 128;
    const ax = Number(point.x) - Number(box.left), ay = Number(point.y) - Number(box.top);
    const fit = Math.min(
      Number(box.width) / GRID.cols - 8, Number(box.height) / GRID.rows - 8,
      (ax - 4) / 1.5, (Number(box.width) - ax - 4) / 1.5,
      (ay - 4) / 1.5, (Number(box.height) - ay - 4) / 2.5);
    const s = Math.max(min, Math.min(max, fit));
    return { s, ax, ay, left: ax - 1.5 * s, top: ay - 1.5 * s,
      anchor: [Number(point.x), Number(point.y)], originPct: anchorCell().originPct };
  }

  return {
    VERSION, ORDER, NORM, LAYOUT, HINGE, GRID, CUBE_WALL,
    fnv1a32, hex8, ident, mul, trans, rotX, rotY, hingeM, applyPoint, applyDir,
    geometry, fold, unfold, worldMatrices, hashGeometry, cubeCloses, roundTrip,
    anchorCell, anchorInvariant, roomGeometry
  };
});
