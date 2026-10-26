/* ring-view.js — THE RING · pure geometry + palette.
 *
 * Contract: no DOM reads, no state, no clock, no randomness. Every exported
 * function is a pure function of its arguments; `paint` writes attributes and
 * nothing else, so it can be driven by a fake element object in node.
 *
 * Angles are radians: 0 = top of the ring, positive = clockwise.
 * Lengths are in a 100x100 viewBox unit system (see GEOM), so one `d` string is
 * correct at 180x180 and at 390x844; stroke widths are px via non-scaling-stroke.
 *
 * Loaded as a classic script: (function(g){ ... g.RingView = API })(this)
 */
(function (g) {
  'use strict';

  var TAU = Math.PI * 2;
  var EPS = 1e-9;

  // A candidate sector is inset by ~1 degree on each side so three words read as
  // three things and not as a continuous ring. The hit test ignores this gap on
  // purpose (see sectorAt): a tap in the seam still answers, it just looks empty.
  var SECTOR_GAP = 0.018;

  // Half-width of an answered mark, ~2.6 degrees each side of the gate's angle.
  // Wide enough to land a 3px mark at 180px, narrow enough to stay a tick.
  var MARK_HALF = 0.045;

  // Marks leave the ring so that hue is never the only carrier (P8): a correct
  // gate steps *inward* (earned, behind you), a wrong gate steps *outward*
  // (a cost that sticks out). Same magnitude, opposite sign, different meaning.
  var MARK_OFFSET = 3.2;

  /* ------------------------------------------------------------------ *
   * PALETTE — every hue the renderer may draw. Nothing else is legal.
   * `alpha` is the RESTING opacity. The law allows 0.12 at rest for anything
   * decorative, so only ground/structure/word may sit above that, and they are
   * the three things the instrument is allowed to show with no run live.
   * ------------------------------------------------------------------ */
  var PALETTE = [
    {
      key: 'ground',
      hex: '#080c12',
      field: 'the pad behind everything',
      when: 'always',
      derivation: 'house P1 pad rgb(8,12,18)',
      alpha: 1
    },
    {
      key: 'structure',
      hex: '#4f5760',
      field: 'the ring and its rules — geometry, not content',
      when: 'always (the one hairline ring permitted at rest)',
      derivation: 'house P1 ink rgb(79,87,96)',
      alpha: 0.55
    },
    {
      key: 'word',
      hex: '#eff2ef',
      field: 'the word being read',
      when: 'always',
      derivation: 'house bone; carries no meaning beyond being the text',
      alpha: 1
    },
    {
      key: 'ask',
      hex: '#fd956e',
      field: 'a gate question that is live right now',
      when: 'only while a gate is open and unanswered',
      derivation: 'house accent; the single warm hue that means "answer me"',
      alpha: 0
    },
    {
      key: 'paid',
      hex: '#d8a15c',
      field: 'a cost already paid — a gate answered wrong this run',
      when: 'from the wrong answer until the run ends',
      derivation: 'accent rotated to amber and pulled down in chroma, so a spent cost never outranks a live ask',
      alpha: 0
    },
    {
      key: 'read',
      hex: '#5f86a0',
      field: 'arc already crossed',
      when: 'behind the word, for the length of the run',
      derivation: 'cold blue-grey, the complement of the ask; held at low alpha by law',
      alpha: 0.12
    },
    {
      key: 'gate',
      hex: '#9a9a94',
      field: 'an unvisited gate mark on the arc',
      when: 'before that gate opens',
      derivation: 'structure lifted two steps and drained of hue — a mark, not a message',
      alpha: 0.12
    }
  ];

  // Live opacities. Kept apart from PALETTE.alpha so the resting law stays
  // auditable in one place: anything above 0.12 here is only ever drawn while a
  // run is live, i.e. it is content, not decoration.
  var ALPHA = {
    read: 0.12,
    gate: 0.5,
    ok: 0.7,
    paid: 0.85,
    head: 0.9,
    askFill: 0.13,
    askLine: 0.8
  };

  /* ------------------------------------------------------------------ *
   * small numeric helpers
   * ------------------------------------------------------------------ */

  function isNum(v) {
    return typeof v === 'number' && isFinite(v);
  }

  function clamp01(v) {
    if (!isNum(v)) return 0;
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }

  // Every number that reaches a `d` string goes through f(). Three decimals is
  // sub-pixel at 390px, and rounding here is what keeps -0 and float dust out of
  // the attribute (a `d` containing "1e-17" or "-0" is valid but untestable).
  function f(v) {
    var r = Math.round(v * 1000) / 1000;
    return (r === 0 ? 0 : r).toString();
  }

  function P(cx, cy, r, a) {
    return f(cx + r * Math.sin(a)) + ' ' + f(cy - r * Math.cos(a));
  }

  /** Optional geometry overrides; defaults are the 100x100 house grid. */
  function geometryOf(gm) {
    gm = gm && typeof gm === 'object' ? gm : {};
    var size = isNum(gm.size) && gm.size > 0 ? gm.size : 100;
    return {
      cx: isNum(gm.cx) ? gm.cx : size / 2,
      cy: isNum(gm.cy) ? gm.cy : size / 2,
      r: isNum(gm.r) && gm.r > 0 ? gm.r : size * 0.44,
      band: isNum(gm.band) && gm.band > 0 ? gm.band : 8.5,
      hair: isNum(gm.hair) && gm.hair > 0 ? gm.hair : 1.2
    };
  }

  /* ------------------------------------------------------------------ *
   * paths
   * ------------------------------------------------------------------ */

  /**
   * Open arc along a circle. a0 > a1 is swapped, so a caller may hand over two
   * points in either order and always get the clockwise arc between them.
   */
  function arcPath(cx, cy, r, a0, a1) {
    if (!isNum(cx) || !isNum(cy) || !isNum(r) || !isNum(a0) || !isNum(a1)) return '';
    if (r <= 0) return '';

    var s = a0, e = a1, t;
    if (e < s) { t = s; s = e; e = t; }

    var span = e - s;

    // Zero-length arc: emit a move, not an empty string. A caller can then tell
    // "no arc here" (valid, draws nothing, sets no linecap dot) from bad input.
    if (span < EPS) return 'M ' + P(cx, cy, r, s);

    // SVG cannot express a 360-degree arc in one command: an A whose endpoints
    // coincide is a no-op. So a full (or over-full) turn is drawn as two exact
    // 180-degree halves. large-arc=0 on each half, because for antipodal points
    // there is exactly one circle of radius r and only sweep-flag picks the side.
    if (span >= TAU - EPS) {
      var m = s + Math.PI;
      var rr = f(r) + ' ' + f(r);
      return 'M ' + P(cx, cy, r, s) +
        ' A ' + rr + ' 0 0 1 ' + P(cx, cy, r, m) +
        ' A ' + rr + ' 0 0 1 ' + P(cx, cy, r, s);
    }

    var large = span > Math.PI ? 1 : 0;
    return 'M ' + P(cx, cy, r, s) +
      ' A ' + f(r) + ' ' + f(r) + ' 0 ' + large + ' 1 ' + P(cx, cy, r, e);
  }

  /**
   * Annulus sector — one gate candidate. Outer edge clockwise, inner edge
   * counter-clockwise, so the nonzero fill rule leaves a hole instead of a disc.
   */
  function sectorPath(cx, cy, r0, r1, a0, a1) {
    if (!isNum(cx) || !isNum(cy) || !isNum(r0) || !isNum(r1) || !isNum(a0) || !isNum(a1)) return '';

    var lo = Math.min(r0, r1), hi = Math.max(r0, r1);
    if (hi <= 0) return '';

    var s = Math.min(a0, a1), e = Math.max(a0, a1);
    var span = e - s;
    var rrO = f(hi) + ' ' + f(hi);
    var rrI = f(lo) + ' ' + f(lo);

    if (span >= TAU - EPS) {
      // Same two-arc trick on both edges: four semicircles make a complete washer.
      var mid = s + Math.PI;
      var d = 'M ' + P(cx, cy, hi, s) +
        ' A ' + rrO + ' 0 0 1 ' + P(cx, cy, hi, mid) +
        ' A ' + rrO + ' 0 0 1 ' + P(cx, cy, hi, s);
      if (lo > 0) {
        d += ' L ' + P(cx, cy, lo, s) +
          ' A ' + rrI + ' 0 0 0 ' + P(cx, cy, lo, mid) +
          ' A ' + rrI + ' 0 0 0 ' + P(cx, cy, lo, s);
      } else {
        d += ' L ' + f(cx) + ' ' + f(cy);
      }
      return d + ' Z';
    }

    var large = span > Math.PI ? 1 : 0;
    var d2 = 'M ' + P(cx, cy, hi, s) +
      ' A ' + rrO + ' 0 ' + large + ' 1 ' + P(cx, cy, hi, e);
    if (lo > 0) {
      d2 += ' L ' + P(cx, cy, lo, e) +
        ' A ' + rrI + ' 0 ' + large + ' 0 ' + P(cx, cy, lo, s);
    } else {
      d2 += ' L ' + f(cx) + ' ' + f(cy);
    }
    return d2 + ' Z';
  }

  /**
   * Hit test for n equal sectors laid out clockwise from the top.
   *
   * Sectors are half-open: [i*step, (i+1)*step). The top therefore belongs to
   * sector 0, and a point exactly on a seam belongs to the sector that starts
   * there — deterministic, and it matches how sectorPath draws them.
   *
   * @returns index in [0,n) or -1 outside the annulus / for bad input.
   */
  function sectorAt(px, py, cx, cy, r0, r1, n) {
    if (!isNum(px) || !isNum(py) || !isNum(cx) || !isNum(cy) ||
        !isNum(r0) || !isNum(r1) || !isNum(n)) return -1;
    if (n < 1 || Math.floor(n) !== n) return -1;

    var dx = px - cx, dy = py - cy;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var lo = Math.min(r0, r1), hi = Math.max(r0, r1);

    // Inclusive edges, with a tolerance scaled to the ring so that a caller who
    // computed px/py from a rounded centre still lands inside. A point genuinely
    // outside stays outside: the tolerance is 1e-6 of the outer radius.
    var tol = 1e-6 * Math.max(1, hi);
    if (dist < lo - tol || dist > hi + tol) return -1;

    // Exactly at the centre the angle is undefined, and atan2(0, -0) answers PI
    // (negative zero), which would silently pick the middle sector. Every sector
    // meets at the centre of a pie, so 0 is the only non-arbitrary answer.
    if (dist < EPS) return 0;

    // atan2(dx, -dy): 0 at top, +PI/2 at 3 o'clock, i.e. clockwise-positive in
    // screen space, which is the same convention as arcPath/sectorPath.
    var a = Math.atan2(dx, -dy);
    if (a < 0) a += TAU;
    if (a >= TAU) a = 0;

    var k = Math.floor(a / (TAU / n));
    if (k >= n) k = n - 1;
    return k;
  }

  /* ------------------------------------------------------------------ *
   * run -> geometry
   * ------------------------------------------------------------------ */

  /**
   * Reduce a RUN to the three numbers the ring needs.
   *
   * sweep is the leading edge (a position); read is the crossed arc (a length).
   * They coincide for a monotone progress ring, and are returned separately
   * because paint draws them as different things — an arc and a head tick.
   * Marks are sorted by angle (a stable geometric order) without touching the
   * RUN: the core owns marks, the view only reads them.
   */
  function ringState(RUN, progress) {
    var p = clamp01(progress);
    var sweep = p * TAU;

    var marks = [];
    var src = RUN && Array.isArray(RUN.marks) ? RUN.marks : [];
    for (var i = 0; i < src.length; i++) {
      var m = src[i];
      if (!m || !isNum(m.at)) continue;
      var c = clamp01(m.at) * TAU;
      marks.push({ a0: c - MARK_HALF, a1: c + MARK_HALF, ok: !!m.ok });
    }
    marks.sort(function (x, y) { return x.a0 - y.a0; });

    return { sweep: sweep, read: sweep, marks: marks };
  }

  function answeredAt(RUN, at) {
    var ms = RUN && Array.isArray(RUN.marks) ? RUN.marks : null;
    if (!ms) return false;
    for (var i = 0; i < ms.length; i++) {
      if (ms[i] && isNum(ms[i].at) && Math.abs(ms[i].at - at) < 1e-9) return true;
    }
    return false;
  }

  /* ------------------------------------------------------------------ *
   * paint
   * ------------------------------------------------------------------ */

  function sinkOf(v) {
    return v && typeof v.setAttribute === 'function' ? v : null;
  }

  // The only write path in the module. A missing or non-element sink is a
  // no-op, and a non-finite number can never become the string "NaN" in an
  // attribute — it is dropped instead. That is what makes paint safe to call
  // against a half-built DOM.
  function set(el, name, value) {
    if (!el) return;
    if (value === undefined || value === null) return;
    if (typeof value === 'number' && !isFinite(value)) return;
    el.setAttribute(name, String(value));
  }

  var HEX6 = /^#[0-9a-f]{6}$/i;

  function hexMap(palette) {
    var out = {}, i, k;
    function take(key, hex) {
      // A caller may re-state a hue, but only as a literal 6-digit hex. This is
      // what stops `red`, `currentColor` or `url(#grad)` reaching a stroke and
      // turning a declared-palette assertion into a lie.
      if (typeof key === 'string' && typeof hex === 'string' && HEX6.test(hex)) out[key] = hex;
    }
    if (Array.isArray(palette)) {
      for (i = 0; i < palette.length; i++) {
        if (palette[i]) take(palette[i].key, palette[i].hex);
      }
    } else if (palette && typeof palette === 'object') {
      for (k in palette) {
        if (Object.prototype.hasOwnProperty.call(palette, k)) take(k, palette[k]);
      }
    }
    // Missing entries fall back to the declared table: paint can therefore never
    // emit a hue that has no PALETTE row, whatever the caller passes.
    for (i = 0; i < PALETTE.length; i++) {
      if (!out[PALETTE[i].key]) out[PALETTE[i].key] = PALETTE[i].hex;
    }
    return out;
  }

  /**
   * Paint a run onto pre-made SVG nodes. Creates nothing, reads nothing from the
   * DOM, and is idempotent: calling it twice with the same arguments produces the
   * same attribute map.
   *
   *   el = {
   *     root,            // <g> — summary data-* attributes only
   *     read,            // <path> — the crossed arc
   *     sweep,           // <path> — the leading-edge head
   *     ask,             // <path> | [<path>,<path>,<path>] — the live gate
   *     marks,           // [<path>] pool — answered gates (ok inward, wrong outward)
   *     gates,           // [<path>] pool — unvisited gate ticks
   *     geometry         // optional {cx,cy,r,band,hair,size}
   *   }
   * Passing a bare element instead of a bag treats it as `root` only.
   */
  function paint(el, RUN, progress, palette) {
    var parts = el && typeof el === 'object' ? el : {};
    if (typeof parts.setAttribute === 'function') parts = { root: parts };

    var geo = geometryOf(parts.geometry);
    var hex = hexMap(palette);
    var p = clamp01(progress);
    var st = ringState(RUN, p);

    var live = !!(RUN && RUN.plan);
    var over = !!(RUN && RUN.over);
    var opened = RUN && isNum(RUN.opened) ? RUN.opened : -1;
    var wrong = RUN && isNum(RUN.wrong) ? RUN.wrong : 0;

    var root = sinkOf(parts.root);
    set(root, 'data-ring-state', !live ? 'idle' : over ? 'over' : 'run');
    set(root, 'data-ring-progress', f(p));
    set(root, 'data-ring-sweep', f(st.sweep));
    set(root, 'data-ring-marks', String(st.marks.length));
    set(root, 'data-ring-wrong', String(wrong));
    set(root, 'data-ring-open', opened >= 0 ? String(opened) : '');

    // --- the crossed arc (read) -------------------------------------
    // Drawn from 0 even with no RUN: progress is a property of the reader, not
    // of the game, so the plain RSVP surface still gets its arc.
    var read = sinkOf(parts.read);
    if (read) {
      set(read, 'd', st.read > EPS ? arcPath(geo.cx, geo.cy, geo.r, 0, st.read) : '');
      set(read, 'fill', 'none');
      set(read, 'stroke', hex.read);
      set(read, 'stroke-width', f(geo.hair));
      set(read, 'stroke-opacity', f(ALPHA.read));
      set(read, 'stroke-linecap', 'round');
      set(read, 'vector-effect', 'non-scaling-stroke');
    }

    // --- the leading edge (sweep) -----------------------------------
    var sweepEl = sinkOf(parts.sweep);
    if (sweepEl) {
      if (live && !over && st.sweep > EPS) {
        set(sweepEl, 'd', arcPath(geo.cx, geo.cy, geo.r, st.sweep - 0.028, st.sweep + 0.028));
        set(sweepEl, 'stroke', hex.word);
        set(sweepEl, 'stroke-opacity', f(ALPHA.head));
      } else {
        set(sweepEl, 'd', '');
      }
      set(sweepEl, 'fill', 'none');
      set(sweepEl, 'stroke-width', f(geo.hair * 1.5));
      set(sweepEl, 'stroke-linecap', 'round');
      set(sweepEl, 'vector-effect', 'non-scaling-stroke');
    }

    // --- the live gate (ask) ----------------------------------------
    var gate = null;
    if (live && opened >= 0 && RUN.plan && Array.isArray(RUN.plan.gates)) {
      gate = RUN.plan.gates[opened] || null;
    }
    var open = !!(gate && isNum(gate.at));

    var askList = Array.isArray(parts.ask) ? parts.ask : null;
    var askOne = askList ? null : sinkOf(parts.ask);

    if (askList) {
      var n = askList.length || 3;
      var w = TAU / n;
      for (var a = 0; a < askList.length; a++) {
        var ae = sinkOf(askList[a]);
        if (!ae) continue;
        if (open) {
          var g0 = a * w + SECTOR_GAP, g1 = (a + 1) * w - SECTOR_GAP;
          set(ae, 'd', sectorPath(geo.cx, geo.cy, geo.r - geo.band, geo.r + 1.5, g0, g1));
          set(ae, 'fill', hex.ask);
          set(ae, 'fill-opacity', f(ALPHA.askFill));
          set(ae, 'stroke', hex.ask);
          set(ae, 'stroke-opacity', f(ALPHA.askLine));
          set(ae, 'stroke-width', '1');
          set(ae, 'vector-effect', 'non-scaling-stroke');
          set(ae, 'data-slot', String(a));
        } else {
          set(ae, 'd', '');
          set(ae, 'data-slot', '');
        }
      }
    } else if (askOne) {
      if (open) {
        var c = clamp01(gate.at) * TAU;
        var hw = TAU / 6;               // one third of the ring, centred on the gate
        set(askOne, 'd', sectorPath(geo.cx, geo.cy, geo.r - geo.band, geo.r + 1.5, c - hw, c + hw));
        set(askOne, 'fill', hex.ask);
        set(askOne, 'fill-opacity', f(ALPHA.askFill));
        set(askOne, 'stroke', hex.ask);
        set(askOne, 'stroke-opacity', f(ALPHA.askLine));
      } else {
        set(askOne, 'd', '');
      }
      set(askOne, 'stroke-width', '1');
      set(askOne, 'vector-effect', 'non-scaling-stroke');
    }

    // --- answered marks ---------------------------------------------
    var pool = Array.isArray(parts.marks) ? parts.marks : null;
    if (pool) {
      for (var i = 0; i < pool.length; i++) {
        var node = sinkOf(pool[i]);
        if (!node) continue;
        var mk = i < st.marks.length ? st.marks[i] : null;
        if (mk) {
          var rr = mk.ok ? geo.r - MARK_OFFSET : geo.r + MARK_OFFSET;
          set(node, 'd', arcPath(geo.cx, geo.cy, rr, mk.a0, mk.a1));
          set(node, 'stroke', mk.ok ? hex.read : hex.paid);
          set(node, 'stroke-opacity', f(mk.ok ? ALPHA.ok : ALPHA.paid));
          set(node, 'stroke-width', f(mk.ok ? geo.hair * 1.2 : geo.hair * 1.6));
          set(node, 'data-ok', mk.ok ? '1' : '0');
        } else {
          set(node, 'd', '');
          set(node, 'data-ok', '');
        }
        set(node, 'fill', 'none');
        set(node, 'stroke-linecap', 'round');
        set(node, 'vector-effect', 'non-scaling-stroke');
      }
    }

    // --- unvisited gate ticks ---------------------------------------
    var gp = Array.isArray(parts.gates) ? parts.gates : null;
    if (gp) {
      var gates = live && RUN.plan && Array.isArray(RUN.plan.gates) ? RUN.plan.gates : [];
      for (var j = 0; j < gp.length; j++) {
        var ge = sinkOf(gp[j]);
        if (!ge) continue;
        var gg = gates[j];
        var visited = !!(gg && isNum(gg.at) && answeredAt(RUN, gg.at));
        if (gg && isNum(gg.at) && !visited) {
          var gc = clamp01(gg.at) * TAU;
          set(ge, 'd', arcPath(geo.cx, geo.cy, geo.r, gc - 0.016, gc + 0.016));
          set(ge, 'stroke', hex.gate);
          set(ge, 'stroke-opacity', f(ALPHA.gate));
          set(ge, 'stroke-width', f(geo.hair));
        } else {
          set(ge, 'd', '');
        }
        set(ge, 'fill', 'none');
        set(ge, 'stroke-linecap', 'butt');
        set(ge, 'vector-effect', 'non-scaling-stroke');
      }
    }

    return el;
  }

  /* ------------------------------------------------------------------ */

  var API = {
    arcPath: arcPath,
    sectorPath: sectorPath,
    sectorAt: sectorAt,
    ringState: ringState,
    paint: paint,
    PALETTE: PALETTE
  };

  g.RingView = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
