/* app.js — DOM/canvas layer for the RIDE LOG instrument.
   One canvas = one aligned ribbon: four stacked hairline lanes over ONE time axis.
   At rest every trace sits at alpha <= 0.12; the bloom exists only while the ribbon
   is being scrubbed (hover / drag / tap) or focused. Deterministic: no randomness, no
   animation
   loop — the reveal is a redraw, so prefers-reduced-motion gets the same depth
   with zero motion. */
(function () {
  'use strict';
  var RC = window.RideCore;
  var $ = function (id) { return document.getElementById(id); };

  var cv = $('cv'), ctx = cv.getContext('2d');
  var ta = $('csv'), errEl = $('err'), tagEl = $('tag'), circEl = $('circ');
  var formulaEl = $('formula');
  var FORMULA_DEFAULT = 'HOVER / TAP A FIGURE FOR ITS FORMULA';

  var PAD = 'rgb(8,12,18)';           // design law P1
  var INK = 'rgb(79,87,96)';
  var REST_A = 0.11;                  // per-layer alpha at rest (<= 0.12)
  var BLOOM_A = 0.72;                 // only behind explicit reveal
  var DOT_A = 0.92;
  var SCRUB_A = 0.42;
  var WIN = 25;                       // samples either side of the scrub that bloom
  var MONO = '8px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  var MONO_S = '8.5px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

  var state = { rows: null, summary: null, circ: 0.5, idx: null, reveal: false, vals: null };

  var LANES = [
    { key: 'speed', label: 'SPD', unit: 'km/h', dp: 1, zero: true,
      get: function (r) { return RC.speedFromErpm(r.erpm, state.circ) * 3.6; } },
    { key: 'current_a', label: 'I', unit: 'A', dp: 1, zero: true,
      get: function (r) { return r.current_a; } },
    { key: 'duty', label: 'DUTY', unit: '', dp: 3, zero: true,
      get: function (r) { return r.duty; } },
    { key: 'temp_c', label: 'TEMP', unit: '\u00b0C', dp: 2, zero: false,
      get: function (r) { return r.temp_c; } }
  ];

  /* ---------- geometry (shared by draw and scrub mapping) ---------- */
  function geom() {
    var cssW = cv.clientWidth || 272, cssH = cv.clientHeight || 270;
    var padL = 4, padR = 6, padT = 6, padB = 20;
    return {
      cssW: cssW, cssH: cssH, padL: padL, padR: padR, padT: padT, padB: padB,
      plotW: cssW - padL - padR, laneH: (cssH - padT - padB) / 4
    };
  }
  function px(v) { return Math.round(v) + 0.5; }
  function ink(a) { return 'rgba(79,87,96,' + a + ')'; }
  function txt(s, x, y, a, font) {
    ctx.font = font || MONO;
    ctx.fillStyle = ink(a);
    ctx.fillText(s, x, y);
  }

  function niceStep(span) {
    var steps = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 1800, 3600];
    for (var i = 0; i < steps.length; i++) if (span / steps[i] <= 6) return steps[i];
    return 3600;
  }

  /* ---------- render ---------- */
  function draw() {
    var g = geom();
    var dpr = window.devicePixelRatio || 1;
    var bw = Math.max(1, Math.round(g.cssW * dpr)), bh = Math.max(1, Math.round(g.cssH * dpr));
    if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, g.cssW, g.cssH);
    ctx.fillStyle = PAD;
    ctx.fillRect(0, 0, g.cssW, g.cssH);

    var rows = state.rows;
    if (!rows || rows.length === 0) {                       // P4 negative arm: no datum, no layer
      txt('NO LOG', g.cssW / 2 - 18, g.cssH / 2, 0.4, MONO_S);
      txt('LOAD SAMPLE / PASTE CSV', g.cssW / 2 - 52, g.cssH / 2 + 12, 0.28);
      return;
    }

    var n = rows.length;
    var t0 = rows[0].t_ms, t1 = rows[n - 1].t_ms;
    var span = Math.max(1, t1 - t0);
    var mapX = function (i) { return g.padL + ((rows[i].t_ms - t0) / span) * g.plotW; };

    for (var li = 0; li < LANES.length; li++) {
      var lane = LANES[li], vals = state.vals[li];
      var y0 = g.padT + li * g.laneH, y1 = y0 + g.laneH - 7;
      var lo = vals[0], hi = vals[0];
      for (var i = 1; i < n; i++) { if (vals[i] < lo) lo = vals[i]; if (vals[i] > hi) hi = vals[i]; }
      if (lane.zero) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
      if (hi === lo) { hi = lo + 1; }
      var padv = (hi - lo) * 0.08;
      lo -= padv; hi += padv;
      var mapY = function (v) { return y1 - ((v - lo) / (hi - lo)) * (y1 - y0); };

      if (lo < 0 && hi > 0) {                               // zero line = the channel's own 0
        ctx.beginPath();
        ctx.moveTo(px(g.padL), px(mapY(0)));
        ctx.lineTo(px(g.cssW - g.padR), px(mapY(0)));
        ctx.lineWidth = 1; ctx.strokeStyle = ink(0.05); ctx.stroke();
      }

      ctx.beginPath();                                      // resting hairline trace
      for (var k = 0; k < n; k++) {
        var x = px(mapX(k)), y = px(mapY(vals[k]));
        if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.lineWidth = 1; ctx.strokeStyle = ink(REST_A); ctx.stroke();

      txt(lane.label, g.padL + 3, y0 + 9, 0.42, MONO_S);
      var rng = hi2fmt(lane, vals);
      txt(rng, g.cssW - g.padR - ctx.measureText(rng).width, y0 + 9, 0.3);
    }

    drawAxis(g, t0, t1, span, mapX);
    if (state.reveal && state.idx != null) drawBloom(g, mapX, mapY4(g));
  }

  function hi2fmt(lane, vals) {
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    return lo.toFixed(lane.dp) + '..' + hi.toFixed(lane.dp) + (lane.unit ? ' ' + lane.unit : '');
  }

  /* y-mappers rebuilt exactly as in draw(), for the reveal dots */
  function mapY4(g) {
    var rows = state.rows, n = rows.length, out = [];
    for (var li = 0; li < LANES.length; li++) {
      var lane = LANES[li], vals = state.vals[li];
      var y0 = g.padT + li * g.laneH, y1 = y0 + g.laneH - 7;
      var lo = vals[0], hi = vals[0];
      for (var i = 1; i < n; i++) { if (vals[i] < lo) lo = vals[i]; if (vals[i] > hi) hi = vals[i]; }
      if (lane.zero) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
      if (hi === lo) { hi = lo + 1; }
      var padv = (hi - lo) * 0.08; lo -= padv; hi += padv;
      out[li] = { lo: lo, hi: hi, y0: y0, y1: y1, vals: vals };
    }
    return out;
  }

  function drawAxis(g, t0, t1, span, mapX) {
    var ay = g.cssH - g.padB + 2;
    ctx.beginPath();                                       // the time axis itself
    ctx.moveTo(px(g.padL), px(ay));
    ctx.lineTo(px(g.cssW - g.padR), px(ay));
    ctx.lineWidth = 1; ctx.strokeStyle = ink(0.1); ctx.stroke();
    var step = niceStep(span / 1000);
    var t = Math.ceil(t0 / (step * 1000)) * step * 1000;
    for (; t <= t1; t += step * 1000) {
      var x = g.padL + ((t - t0) / span) * g.plotW;
      ctx.beginPath();
      ctx.moveTo(px(x), px(ay));
      ctx.lineTo(px(x), px(ay + 3));
      ctx.lineWidth = 1; ctx.strokeStyle = ink(0.16); ctx.stroke();
      var lab = (t / 1000) + 's';
      txt(lab, Math.min(x, g.cssW - g.padR - 14), ay + 12, 0.34);
    }
  }

  function drawBloom(g, mapX, maps) {
    var rows = state.rows, n = rows.length, idx = state.idx;
    var lo = Math.max(0, idx - WIN), hi = Math.min(n - 1, idx + WIN);
    var x = px(mapX(idx));

    for (var li = 0; li < LANES.length; li++) {
      var m = maps[li], vals = m.vals;
      var mapY = function (v) { return m.y1 - ((v - m.lo) / (m.hi - m.lo)) * (m.y1 - m.y0); };
      ctx.beginPath();                                     // local brightened window
      for (var i = lo; i <= hi; i++) {
        var xx = px(mapX(i)), yy = px(mapY(vals[i]));
        if (i === lo) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
      }
      ctx.lineWidth = 1.4; ctx.strokeStyle = ink(BLOOM_A); ctx.stroke();
      ctx.beginPath();                                     // exact value dot at t
      ctx.arc(x, px(mapY(vals[idx])), 1.8, 0, Math.PI * 2);
      ctx.fillStyle = ink(DOT_A); ctx.fill();
    }
    ctx.beginPath();                                       // scrub line across all lanes
    ctx.moveTo(x, px(g.padT));
    ctx.lineTo(x, px(g.cssH - g.padB));
    ctx.lineWidth = 1; ctx.strokeStyle = ink(SCRUB_A); ctx.stroke();
  }

  /* ---------- data ---------- */
  function buildVals() {
    state.vals = LANES.map(function (lane) {
      return state.rows.map(lane.get);
    });
  }

  function readCirc() {
    var v = Number(circEl.value);
    return isFinite(v) && v > 0 ? v : NaN;
  }

  function showError(msg) {
    errEl.textContent = msg ? 'ERR ' + msg : '';
  }

  function setCell(id, text) { $(id).textContent = text; }

  function renderSummary() {
    var s = state.summary;
    if (!s) {
      ['v-dist', 'v-energy', 'v-peaki', 'v-peakt', 'v-regens', 'v-net', 'v-dur', 'v-rows', 'v-regenwh']
        .forEach(function (id) { setCell(id, '\u2014'); });
      tagEl.textContent = '\u2014';
      return;
    }
    setCell('v-dist', s.distance_m.toFixed(1));
    setCell('v-energy', s.energy_wh.toFixed(2));
    setCell('v-peaki', s.peak_current_a.toFixed(1));
    setCell('v-peakt', s.peak_temp_c.toFixed(2));
    setCell('v-regens', s.regen_s.toFixed(1));
    setCell('v-net', s.net_wh.toFixed(2));
    setCell('v-regenwh', s.regen_wh.toFixed(2));
    setCell('v-dur', s.duration_s.toFixed(1));
    setCell('v-rows', String(s.samples));
    tagEl.textContent = RC.hashSummary(s) + ' \u00b7 ' + s.samples + ' ROWS';
  }

  function updateReadout() {
    var rows = state.rows;
    var r = (rows && state.idx != null) ? rows[state.idx] : null;
    $('readout').classList.toggle('live', !!r && state.reveal);
    var dash = '\u2014';
    $('ro-t').textContent = r ? (r.t_ms / 1000).toFixed(1) + ' s' : dash;
    $('ro-r').textContent = r ? (state.idx + 1) + ' / ' + rows.length : dash;
    $('ro-spd').textContent = r ? (RC.speedFromErpm(r.erpm, state.circ) * 3.6).toFixed(1) : dash;
    $('ro-erpm').textContent = r ? r.raw[1] : dash;
    $('ro-i').textContent = r ? r.raw[2] + ' A' : dash;
    $('ro-duty').textContent = r ? r.raw[3] : dash;
    $('ro-v').textContent = r ? r.raw[4] + ' V' : dash;
    $('ro-c').textContent = r ? r.raw[5] + ' \u00b0C' : dash;
  }

  function runParse() {
    var res = RC.parseCsv(ta.value);
    if (!res.ok) {
      state.rows = null; state.summary = null; state.idx = null; state.reveal = false;
      showError(res.error); renderSummary(); updateReadout(); draw();
      return;
    }
    state.rows = res.rows;
    state.circ = readCirc();
    var sum = RC.summarize(state.rows, { circ_m: state.circ });
    if (!sum.ok) { showError(sum.error); state.summary = null; renderSummary(); draw(); return; }
    state.summary = sum;
    state.idx = null; state.reveal = false;
    buildVals(); showError(''); renderSummary(); updateReadout(); draw();
  }

  function recirc() {
    if (!state.rows) return;
    var c = readCirc();
    if (!isFinite(c)) { showError('wheel circumference must be a positive number'); return; }
    state.circ = c;
    var sum = RC.summarize(state.rows, { circ_m: c });
    if (!sum.ok) { showError(sum.error); return; }
    state.summary = sum;
    buildVals(); showError(''); renderSummary(); updateReadout(); draw();
  }

  /* ---------- scrub ---------- */
  function nearestIdx(tMs) {
    var rows = state.rows, lo = 0, hi = rows.length - 1;
    while (lo < hi) {
      var mid = (lo + hi) >> 1;
      if (rows[mid].t_ms < tMs) lo = mid + 1; else hi = mid;
    }
    if (lo > 0 && Math.abs(rows[lo - 1].t_ms - tMs) <= Math.abs(rows[lo].t_ms - tMs)) lo--;
    return lo;
  }

  function scrubTo(clientX) {
    var g = geom(), r = cv.getBoundingClientRect();
    var u = (clientX - r.left - g.padL) / g.plotW;
    u = u < 0 ? 0 : u > 1 ? 1 : u;
    var rows = state.rows;
    var t = rows[0].t_ms + u * (rows[rows.length - 1].t_ms - rows[0].t_ms);
    setScrub(nearestIdx(t), true);
  }

  function setScrub(i, reveal) {
    state.idx = i; state.reveal = reveal;
    updateReadout(); draw();
  }

  function quiet() {                                        // ornament off, values kept
    state.reveal = false;
    updateReadout(); draw();
  }

  var dragging = false;
  cv.addEventListener('pointerdown', function (e) {
    if (!state.rows) return;
    dragging = true;
    if (cv.setPointerCapture) { try { cv.setPointerCapture(e.pointerId); } catch (x) {} }
    scrubTo(e.clientX);
  });
  cv.addEventListener('pointermove', function (e) {
    if (!state.rows) return;
    var touchish = e.pointerType === 'touch' || e.pointerType === 'pen';
    if (touchish && !dragging) return;
    scrubTo(e.clientX);
  });
  window.addEventListener('pointerup', function () { dragging = false; });
  window.addEventListener('pointercancel', function () { dragging = false; });
  cv.addEventListener('pointerleave', function (e) {          // release returns to quiet
    if (e.pointerType === 'mouse' && state.reveal) quiet();
  });
  cv.addEventListener('focus', function () {
    if (!state.rows) return;
    setScrub(state.idx == null ? 0 : state.idx, true);
  });
  cv.addEventListener('blur', function () { quiet(); });
  cv.addEventListener('keydown', function (e) {
    if (!state.rows) return;
    var n = state.rows.length, step = e.shiftKey ? 10 : 1;
    var i = state.idx == null ? 0 : state.idx;
    if (e.key === 'ArrowLeft') i = Math.max(0, i - step);
    else if (e.key === 'ArrowRight') i = Math.min(n - 1, i + step);
    else if (e.key === 'Home') i = 0;
    else if (e.key === 'End') i = n - 1;
    else return;
    e.preventDefault();
    setScrub(i, true);
  });

  /* ---------- formula strip (every derived figure shows its law) ---------- */
  function setFormula(el) { formulaEl.textContent = el.getAttribute('data-formula'); }
  function clearFormula() { formulaEl.textContent = FORMULA_DEFAULT; }
  function bindFormulas() {
    var els = document.querySelectorAll('[data-f]');
    for (var i = 0; i < els.length; i++) {
      (function (el) {
        var f = el.getAttribute('data-f');
        if (RC.FORMULAS[f]) el.setAttribute('data-formula', RC.FORMULAS[f]);
        el.addEventListener('pointerenter', function () { setFormula(el); });
        el.addEventListener('pointerleave', clearFormula);
        el.addEventListener('focus', function () { setFormula(el); });
        el.addEventListener('blur', clearFormula);
      })(els[i]);
    }
  }

  /* ---------- wiring ---------- */
  $('b-sample').addEventListener('click', function () {
    ta.value = RC.SAMPLE_CSV;
    runParse();                                            // quiet: the reveal is earned by scrubbing
  });
  $('b-parse').addEventListener('click', runParse);
  $('b-clear').addEventListener('click', function () {
    ta.value = '';
    state.rows = null; state.summary = null; state.idx = null; state.reveal = false;
    showError(''); renderSummary(); updateReadout(); draw();
  });
  circEl.addEventListener('change', recirc);
  circEl.addEventListener('input', recirc);
  window.addEventListener('resize', draw);

  bindFormulas();
  formulaEl.textContent = FORMULA_DEFAULT;
  renderSummary(); updateReadout(); draw();
})();
