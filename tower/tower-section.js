/* tower-section.js — the FIELD INDEX landing tower.
 *
 * A drop-in section: mount(el) wraps the host's own strips (FieldAxes) into rings and
 * stacks them as a tower at one axial aperture. One ring per strip — ROUTE at the
 * bottom, WORK MODE at the top. The gate of each ring is that strip's selected value;
 * the tuple of gates composes into one deterministic tag, and the moiré at the aperture
 * IS that tuple's identity (gratings only, transparent — never a plate).
 *
 * Recovered law (2026-10-21): a ring IS a strip wrapped — unwrap returns the same
 * items in the same order (bijection at every morph frame). Turning is detent-stepped.
 *
 * HOUSE LAW: quiet by default, depth behind explicit reveal — at rest every overlay
 * layer alpha <= 0.12 (TowerCore.QUIET_CAP), one hairline ring set + one axis, no blur,
 * no gradients as decoration, no high-contrast blocks. Colour only on approach. Pad
 * rgb(8,12,18) · lines rgb(79,87,96) · bone #eff2ef · accent #fd956e.
 *
 * CONTAINMENT: this module touches nothing outside `el` — no <head> style injection
 * (the moiré is inline gradients on its own nodes), no global listeners, no host
 * function calls. It reads window.FieldAxes() if present and fetches the same-origin
 * /showcase-manifest.json only when it is not. Turning emits a bubbling
 * `landing-tower:turn` CustomEvent on `el`; wiring it to the host is the host's call.
 *
 * Depends on: tower-core.js (window.TowerCore). No build step, no frameworks.
 */
(function () {
  'use strict';

  var T = typeof window !== 'undefined' ? window.TowerCore : null;
  if (!T) {
    if (typeof console !== 'undefined' && console.error) console.error('LandingTower: tower-core.js must load first (window.TowerCore missing)');
    return;
  }

  var NS = 'http://www.w3.org/2000/svg';
  var VERSION = '1.0.1';
  var VIEW_W = 300;
  var MOUNTED = new WeakMap();
  var current = null;
  var manifestPromise = null;

  var AXIS_LINE = 'Each ring is one strip of the field index — route, state, operation, work mode — wrapped until its ends meet at the aperture.';
  var FAMILY_LINE = 'Each ring is one family of the index — a strip of routes wrapped until its ends meet at the aperture.';
  var COMMON_LINE = 'The tower is the index held at one aperture: each lit tick is a value at the axis, and turning a ring changes what the tower composes.';
  var EMPTY_LINE = 'Each ring is one strip of the field index, wrapped until its ends meet at the aperture — no surface answered, so one empty ring stands in.';

  // ---------- small helpers -------------------------------------------------
  function isReduced() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
    catch (e) { return false; }
  }
  function nowMs() {
    return (window.performance && window.performance.now) ? window.performance.now() : Date.now();
  }
  function raf(fn) {
    if (window.requestAnimationFrame) return window.requestAnimationFrame(fn);
    return window.setTimeout(function () { fn(nowMs()); }, 16);
  }
  function mk(name, attrs, cls, text) {
    var e = document.createElementNS(NS, name);
    if (attrs) for (var k in attrs) { if (attrs[k] != null) e.setAttribute(k, attrs[k]); }
    if (cls) e.setAttribute('class', cls);
    if (text != null) e.textContent = text;
    return e;
  }
  function truncate(s, n) {
    s = String(s == null ? '' : s);
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function emit(inst, name, detail) {
    try {
      if (typeof window.CustomEvent !== 'function') return;
      inst.el.dispatchEvent(new window.CustomEvent(name, { detail: detail, bubbles: true }));
    } catch (e) { /* a CustomEvent may be forbidden by a strict CSP — never throw */ }
  }

  // ---------- data paths ----------------------------------------------------
  function fieldModel() {
    if (typeof window.FieldAxes !== 'function') return null;
    var raw;
    try { raw = window.FieldAxes(); } catch (e) { return null; }
    var m = T.normalizeAxes(raw, { source: 'field-axes' });
    return (m && m.families.length) ? m : null;
  }

  function manifestModel() {
    if (!manifestPromise) {
      manifestPromise = window.fetch('/showcase-manifest.json', { cache: 'no-store', credentials: 'same-origin' })
        .then(function (r) {
          if (!r || !r.ok) throw new Error('HTTP ' + (r ? r.status : '?'));
          return r.json();
        })
        .then(function (json) { return T.familiesFromManifest(json, { excludeRoot: true }); })
        .catch(function (err) { manifestPromise = null; throw err; });
    }
    return manifestPromise;
  }

  // ---------- scaffold (the fragment normally supplies this) ----------------
  function ensureScaffold(el) {
    var stage = el.querySelector('.tw-stage');
    var svg = el.querySelector('svg');
    var glyph = el.querySelector('.tw-glyph');
    var reading = el.querySelector('.tw-reading');

    if (!el.querySelector('h2')) {
      var h = document.createElement('h2');
      h.id = 'tower-title';
      h.textContent = 'FIELD INDEX / RING TOWER';
      el.appendChild(h);
    }
    if (!stage) {
      stage = document.createElement('div');
      stage.className = 'tw-stage';
      el.appendChild(stage);
    }
    if (!svg) {
      svg = mk('svg', { viewBox: '0 0 ' + VIEW_W + ' 340', role: 'img', tabindex: '0', 'aria-labelledby': 'tower-title' });
      stage.appendChild(svg);
    }
    if (!glyph) {
      glyph = document.createElement('div');
      glyph.className = 'tw-glyph';
      glyph.setAttribute('aria-hidden', 'true');
      stage.appendChild(glyph);
    }
    if (!reading) {
      reading = document.createElement('p');
      reading.className = 'tw-reading';
      [AXIS_LINE, COMMON_LINE].forEach(function (txt) {
        var s = document.createElement('span');
        s.textContent = txt;
        reading.appendChild(s);
      });
      el.appendChild(reading);
    }
    if (!svg.querySelector('.tw-layer')) {
      var layer = mk('g', { class: 'tw-layer' });
      svg.appendChild(layer);
    }
    return {
      stage: stage,
      svg: svg,
      glyph: glyph,
      reading: reading,
      layer: svg.querySelector('.tw-layer'),
      title: el.querySelector('h2') || el.querySelector('#tower-title'),
      spans: reading ? reading.querySelectorAll('span') : [],
    };
  }

  // ---------- instance ------------------------------------------------------
  function createInstance(el, options) {
    var dom = ensureScaffold(el);
    var inst = {
      el: el, opt: options || {}, dom: dom,
      stage: dom.stage, svg: dom.svg, glyph: dom.glyph, layer: dom.layer,
      model: T.emptyModel('loading'),
      tower: T.buildTower(T.emptyModel('loading'), { maxRings: 6 }),
      layout: null,
      rot: [], offset: [], offsetF: [], t: [],
      focus: 0, bloom: false, ready: false, degraded: false, note: '',
      comp: T.compose([]),
      ringNodes: [],
      glyphNodes: [],
      anim: null,
      height: 340, tagY: 300, totalY: 318,
      bubble: null,
    };
    inst.api = Object.freeze({
      mount: function (target, opts) { return mount(target || el, opts); },
      state: function () { return snapshot(inst); },
      sync: function () { return syncOn(inst); },
      turn: function (n, ring) { return turnOn(inst, n, ring); },
      unwrap: function (ring) { return unwrapOn(inst, ring); },
      selftest: function () { return selftestOn(inst); },
    });
    return inst;
  }

  function mount(target, options) {
    var el = target;
    if (typeof el === 'string') el = document.querySelector(el);
    if (!el || el.nodeType !== 1) throw new Error('LandingTower.mount: needs an element');
    if (MOUNTED.has(el)) return MOUNTED.get(el).api;
    var inst = createInstance(el, options);
    MOUNTED.set(el, inst);
    current = inst;
    wireOnce(inst);
    boot(inst);
    return inst.api;
  }

  function boot(inst) {
    inst.el.setAttribute('data-tower-ready', '0');
    inst.el.setAttribute('data-tower-source', 'loading');
    // A lawful figure is on screen from the first frame: axis + one ring, zero claims.
    applyModel(inst, T.normalizeAxes([{ key: 'pending', label: 'INDEX', values: [] }], { source: 'pending' }), { pending: true });

    var go = function () {
      var m = fieldModel();
      if (m) { applyModel(inst, m); return; }
      manifestModel()
        .then(function (mm) { applyModel(inst, mm, { note: 'FieldAxes() absent — manifest fallback' }); })
        .catch(function (err) {
          applyModel(inst, T.normalizeAxes([{ key: 'unresolved', label: 'UNRESOLVED', values: [] }], { source: 'degraded' }),
            { degraded: true, note: 'manifest unreachable: ' + (err && err.message ? err.message : 'fetch failed') });
        });
    };
    // Same-tick grace: a microtask, never a frame — a hidden/background tab still
    // binds its data (rAF is frozen there, which would strand the pending figure).
    if (typeof Promise === 'function') Promise.resolve().then(go);
    else window.setTimeout(go, 0);
  }

  function applyModel(inst, model, flags) {
    var f = flags || {};
    var tower = T.buildTower(model, { maxRings: 6 });
    inst.model = model;
    inst.tower = tower;
    inst.degraded = !!f.degraded;
    inst.note = f.note || model.note || '';
    inst.ready = !f.pending;

    inst.rot = tower.rings.map(function (r) { return r.selected === null ? null : T.gateIndex(r.selected || 0, Math.max(1, r.count)); });
    inst.offset = tower.rings.map(function (r, i) { return T.offsetFor(inst.rot[i], r.weights); });
    inst.offsetF = inst.offset.slice();
    inst.t = tower.rings.map(function () { return 1; });
    inst.focus = 0;

    inst.layout = T.towerLayout(tower.rings, { w: VIEW_W });
    inst.height = inst.layout.height;
    inst.tagY = inst.layout.bottom + inst.layout.ry + 30;
    inst.totalY = inst.tagY + 18;

    setReading(inst, model.source);
    buildNodes(inst);
    draw(inst);

    inst.el.setAttribute('data-tower-ready', f.pending ? '0' : '1');
    inst.el.setAttribute('data-tower-source', model.source);
    if (f.pending) return;
    emit(inst, 'landing-tower:ready', {
      source: model.source, rings: tower.rings.length, total: model.totalMembers,
      folded: tower.folded.count, degraded: inst.degraded, note: inst.note,
    });
  }

  function cancelAnimation(inst) {
    if (!inst.anim) return;
    inst.anim.cancelled = true;
    if (inst.anim.id && window.cancelAnimationFrame) window.cancelAnimationFrame(inst.anim.id);
    inst.anim = null;
  }

  function sameMembers(a, b) {
    return a.totalMembers === b.totalMembers && a.totalFamilies === b.totalFamilies && a.rings.length === b.rings.length && a.rings.every(function (r, i) {
      var s = b.rings[i];
      return r.key === s.key && r.label === s.label && r.count === s.count && r.members.every(function (m, j) {
        var n = s.members[j];
        return m.key === n.key && m.label === n.label && m.kind === n.kind && m.support === n.support && m.href === n.href;
      });
    });
  }

  function syncOn(inst) {
    var model = fieldModel();
    if (!model) return snapshot(inst);
    var next = T.buildTower(model, { maxRings: 6 });
    if (!sameMembers(inst.tower, next)) {
      var focusKey = inst.tower.rings[inst.focus] && inst.tower.rings[inst.focus].key;
      var unfolded = new Map(inst.tower.rings.map(function (r, i) { return [r.key, inst.t[i]]; }));
      cancelAnimation(inst);
      applyModel(inst, model);
      inst.focus = Math.max(0, next.rings.findIndex(function (r) { return r.key === focusKey; }));
      inst.t = next.rings.map(function (r) { return unfolded.has(r.key) ? unfolded.get(r.key) : 1; });
    } else {
      if (next.rings.every(function (r, i) { return r.selected === inst.rot[i]; })) return snapshot(inst);
      cancelAnimation(inst);
      inst.model = model;
      inst.tower = next;
      inst.rot = next.rings.map(function (r) { return r.selected; });
      inst.offset = next.rings.map(function (r, i) { return T.offsetFor(inst.rot[i] || 0, r.weights); });
      inst.offsetF = inst.offset.slice();
    }
    draw(inst);
    return snapshot(inst);
  }

  function gateMember(inst, ring, i) {
    return inst.rot[i] === null ? null : ring.members[T.gateIndex(inst.rot[i], Math.max(1, ring.count))];
  }

  function setReading(inst, source) {
    var spans = inst.dom.spans;
    if (!spans || spans.length < 2) return;
    spans[0].textContent = source === 'manifest' ? FAMILY_LINE : (source === 'degraded' ? EMPTY_LINE : AXIS_LINE);
    spans[1].textContent = COMMON_LINE;
  }

  // ---------- SVG node construction (once per data change) ------------------
  function buildNodes(inst) {
    var L = inst.layout, rings = inst.tower.rings;
    clear(inst.layer);
    inst.ringNodes = [];

    inst.axisNode = mk('line', { x1: L.cx, y1: L.axisTop, x2: L.cx, y2: inst.tagY - 10 }, 'tw-axis');
    inst.layer.appendChild(inst.axisNode);

    inst.tagNode = mk('text', { x: L.cx, y: inst.tagY, 'text-anchor': 'middle' }, 'tw-tag', '');
    inst.layer.appendChild(inst.tagNode);

    inst.totalNode = mk('text', { x: L.cx, y: inst.totalY, 'text-anchor': 'middle' }, 'tw-fold', '');
    inst.layer.appendChild(inst.totalNode);

    for (var i = rings.length - 1; i >= 0; i--) {
      var ring = rings[i], b = L.boxes[i];
      var g = mk('g', { class: 'tw-ringgrp', 'data-axis': ring.key });
      var ell = mk('ellipse', { cx: b.cx, cy: b.cy, rx: b.rx, ry: b.ry }, 'tw-ring');
      g.appendChild(ell);
      var notch = mk('line', { x1: b.cx - 4, y1: b.cy - b.ry, x2: b.cx + 4, y2: b.cy - b.ry }, 'tw-notch');
      g.appendChild(notch);

      var ticks = [];
      for (var j = 0; j < ring.count; j++) {
        var ln = mk('line', { x1: 0, y1: 0, x2: 0, y2: 0 }, 'tw-tick');
        ticks.push(ln);
        g.appendChild(ln);
      }
      var gate = mk('line', { x1: 0, y1: 0, x2: 0, y2: 0 }, 'tw-tick is-gate');
      g.appendChild(gate);

      var name = mk('text', { x: b.cx - b.rx, y: b.cy - b.ry - 6 }, 'tw-label',
        ring.label + (ring.count ? ' ' + ring.count : ''));
      g.appendChild(name);

      var gateLabel = mk('text', { x: b.cx + 7, y: b.cy - b.ry - 6 }, 'tw-gate', '');
      g.appendChild(gateLabel);

      inst.layer.appendChild(g);
      inst.ringNodes[i] = {
        g: g, ell: ell, notkh: notch, ticks: ticks, gate: gate,
        name: name, gateLabel: gateLabel, slant: slantFor(ring),
      };
    }
  }

  // Slant = kind, but ONLY where the ring's members carry more than one real kind.
  // Axis values are all one kind, so their ticks stay square — no decorative channel.
  function slantFor(ring) {
    var kinds = [];
    for (var i = 0; i < ring.members.length; i++) {
      var k = ring.members[i].kind == null ? '—' : String(ring.members[i].kind);
      if (kinds.indexOf(k) < 0) kinds.push(k);
    }
    if (kinds.length < 2) return function () { return 0; };
    kinds.sort();
    return function (k) {
      var i = kinds.indexOf(k == null ? '—' : String(k));
      if (i < 0) i = 0;
      return -20 + 40 * (i / Math.max(1, kinds.length - 1));
    };
  }

  // ---------- draw (attributes only; nodes are reused) ----------------------
  function draw(inst) {
    var L = inst.layout, rings = inst.tower.rings;
    inst.svg.setAttribute('viewBox', '0 0 ' + L.w + ' ' + inst.height);
    if (inst.axisNode) {
      var topBox = L.boxes.length ? L.boxes[L.boxes.length - 1] : null;
      // the spindle starts exactly at the top ring's apex and lands on the composition
      // line at the foot: bounded by what it holds, never a dangling stroke.
      var topY = topBox ? topBox.cy - topBox.ry : L.axisTop;
      inst.axisNode.setAttribute('y1', Math.max(8, topY).toFixed(2));
      inst.axisNode.setAttribute('y2', (inst.tagY - 18).toFixed(2));
      inst.totalNode.setAttribute('y', inst.totalY);
      inst.tagNode.setAttribute('y', inst.tagY);
    }

    for (var i = 0; i < rings.length; i++) renderRing(inst, i);

    // composition: the tuple of gate values, in the host's axis order
    var parts = rings.map(function (r, i) {
      var m = gateMember(inst, r, i);
      return m ? m.key : '∅';
    });
    inst.comp = T.compose(parts);
    if (inst.tagNode) {
      inst.tagNode.textContent = 'COMPOSITION · ' + inst.comp.tag;
      inst.tagNode.setAttribute('class', 'tw-tag' + (inst.bloom ? ' is-hot' : ''));
    }
    if (inst.totalNode) {
      var t = inst.tower;
      var line;
      if (inst.model.source === 'field-axes' || inst.model.source === 'pending') {
        line = t.rings.length + ' strips · ' + t.totalMembers + ' slots';
      } else if (inst.model.source === 'manifest') {
        line = t.totalFamilies + ' families · ' + t.totalMembers + ' routes';
      } else {
        line = '0 surfaces · ' + (inst.degraded ? 'manifest unreachable' : 'no data');
      }
      if (t.folded.count) line += ' · ' + t.folded.count + ' folded';
      inst.totalNode.textContent = line;
    }

    if (inst.paintedTag !== inst.comp.tag || inst.paintedBloom !== inst.bloom || inst.paintedInk !== inst.ink) paintGlyph(inst);
    inst.svg.setAttribute('aria-label', ariaLabel(inst));

    if (inst.stage) {
      var n = rings.length;
      var midY = n ? (L.boxes[0].cy + L.boxes[n - 1].cy) / 2 : inst.height / 2;
      inst.glyph.style.top = (midY / inst.height * 100).toFixed(2) + '%';
    }
  }

  function renderRing(inst, i) {
    var ring = inst.tower.rings[i], b = inst.layout.boxes[i], N = inst.ringNodes[i];
    if (!N) return;
    var n = ring.count, t = inst.t[i], off = inst.offsetF[i];
    var isHot = i === inst.focus && inst.bloom;
    var gateIdx = T.gateIndex(inst.rot[i], Math.max(1, n));
    N.gate.setAttribute('visibility', inst.rot[i] === null ? 'hidden' : 'visible');

    N.ell.setAttribute('ry', Math.max(0.01, b.ry * t));
    N.notkh.setAttribute('y1', b.cy - b.ry * t);
    N.notkh.setAttribute('y2', b.cy - b.ry * t);
    N.ell.setAttribute('class', 'tw-ring' + (i === inst.focus ? ' is-focus' : '') + (inst.bloom && i === inst.focus ? ' is-hot' : ''));
    N.gate.setAttribute('class', 'tw-tick is-gate' + (i === inst.focus ? ' is-focus' : '') + (isHot ? ' is-hot' : ''));

    for (var j = 0; j < n; j++) {
      var p = T.markPosWeighted(j, ring.weights, off, t, b);
      var a = N.slant(ring.members[j].kind) * Math.PI / 180;
      var len = n > 120 ? 4 : 6;
      var dx = Math.cos(a) * len / 2, dy = Math.sin(a) * len / 2;
      var ln = N.ticks[j];
      ln.setAttribute('x1', (p.x - dx).toFixed(2));
      ln.setAttribute('y1', (p.y - dy).toFixed(2));
      ln.setAttribute('x2', (p.x + dx).toFixed(2));
      ln.setAttribute('y2', (p.y + dy).toFixed(2));
    }
    // the gate mark: one overlay line, so no per-frame class churn on 200 ticks
    if (n > 0) {
      var gp = T.markPosWeighted(gateIdx, ring.weights, off, t, b);
      N.gate.setAttribute('x1', (gp.x).toFixed(2));
      N.gate.setAttribute('y1', (gp.y - 5).toFixed(2));
      N.gate.setAttribute('x2', (gp.x).toFixed(2));
      N.gate.setAttribute('y2', (gp.y + 5).toFixed(2));
      var m = gateMember(inst, ring, i);
      N.gateLabel.textContent = truncate(m ? (m.href || m.label || m.key) : 'NO HOLD', 22);
      N.gateLabel.setAttribute('x', (b.cx + 7).toFixed(2));
      N.gateLabel.setAttribute('y', (b.cy - b.ry * t - 6).toFixed(2));
      N.gateLabel.setAttribute('class', 'tw-gate' + (i === inst.focus && inst.bloom ? ' is-hot' : ''));
    } else {
      N.gate.setAttribute('x1', b.cx); N.gate.setAttribute('x2', b.cx);
      N.gate.setAttribute('y1', b.cy - 3); N.gate.setAttribute('y2', b.cy + 3);
      N.gateLabel.textContent = 'NO DATA';
      N.gateLabel.setAttribute('x', (b.cx + 7).toFixed(2));
      N.gateLabel.setAttribute('y', (b.cy - b.ry - 6).toFixed(2));
    }
    N.name.setAttribute('y', (b.cy - b.ry * t - 6).toFixed(2));
    N.name.setAttribute('x', (b.cx - b.rx).toFixed(2));
  }

  // ---------- the composition glyph: gratings only, inline, quiet -----------
  // The gratings carry the SAME ink as the strokes — read it off the axis, so a theme
  // flip (the host has two palettes) changes the moiré with it, never a second colour.
  function currentInk(inst) {
    try {
      var c = window.getComputedStyle(inst.axisNode || inst.svg).stroke;
      var m = /rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(c || '');
      if (m) return m[1] + ',' + m[2] + ',' + m[3];
    } catch (e) { /* computed style unavailable — fall back to the house ink */ }
    return '79,87,96';
  }

  function paintGlyph(inst) {
    var ink = currentInk(inst);
    var layers = T.glyph(inst.comp.seed, { ink: ink });
    if (inst.glyphNodes.length !== layers.length) {
      clear(inst.glyph);
      inst.glyphNodes = [];
      for (var i = 0; i < layers.length; i++) {
        var s = document.createElement('i');
        s.setAttribute('aria-hidden', 'true');
        inst.glyph.appendChild(s);
        inst.glyphNodes.push(s);
      }
    }
    for (var k = 0; k < layers.length; k++) {
      var L = layers[k];
      inst.glyphNodes[k].style.backgroundImage = inst.bloom ? L.at_reveal : L.at_rest;
      inst.glyphNodes[k].style.opacity = '1';
    }
    inst.paintedTag = inst.comp.tag;
    inst.paintedBloom = inst.bloom;
    inst.ink = ink;
    inst.quietAlpha = layers.reduce(function (m, L) { return Math.max(m, L.quiet); }, 0);
    inst.layers = layers;
  }

  function ariaLabel(inst) {
    var bits = inst.tower.rings.map(function (r) {
      var i = inst.tower.rings.indexOf(r);
      var m = gateMember(inst, r, i);
      return r.label + ' at ' + (m ? (m.label || m.key) : 'no held value');
    });
    return 'Ring tower of the field index: ' + (bits.length ? bits.join(', ') : 'no data') +
      '. Composition ' + inst.comp.tag + '. Arrow keys turn the focused ring, U unwraps it.';
  }

  // ---------- animation -----------------------------------------------------
  function animate(inst, dur, step, done) {
    if (inst.anim) {
      inst.anim.cancelled = true;
      if (inst.anim.id && window.cancelAnimationFrame) window.cancelAnimationFrame(inst.anim.id);
      inst.anim = null;
    }
    if (isReduced() || !(dur > 0)) { step(1); if (done) done(); return; }
    var token = { cancelled: false, id: 0 };
    inst.anim = token;
    var t0 = nowMs();
    var frame = function () {
      if (token.cancelled) return;
      var k = Math.min(1, (nowMs() - t0) / dur);
      step(k * (2 - k)); // ease-out
      if (k < 1) token.id = raf(frame);
      else { inst.anim = null; if (done) done(); }
    };
    token.id = raf(frame);
  }

  // ---------- interaction ---------------------------------------------------
  function turnOn(inst, n, ringIdx) {
    var i = ringIdx == null ? inst.focus : Math.round(Number(ringIdx));
    if (!(i >= 0 && i < inst.tower.rings.length)) i = 0;
    var ring = inst.tower.rings[i];
    if (!ring || !ring.count) return snapshot(inst);
    var steps = Math.round(Number(n));
    if (!Number.isFinite(steps) || steps === 0) steps = 1;

    var from = inst.rot[i] === null ? (steps > 0 ? -1 : 0) : inst.rot[i];
    var to = T.wrap(from + steps, ring.count);
    var startOff = inst.offsetF[i];
    var targetOff = T.offsetFor(to, ring.weights);
    var d = targetOff - startOff;
    // follow the step's direction (a detent turn is one arc, not the shortest chord)
    if (steps > 0) { while (d > 0) d -= T.TAU; while (d < -T.TAU) d += T.TAU; }
    else { while (d < 0) d += T.TAU; while (d > T.TAU) d -= T.TAU; }

    inst.rot[i] = to;
    inst.offset[i] = targetOff;
    inst.focus = i;
    draw(inst); // DOM reflects state() even if frames are throttled (hidden tab)

    var m = ring.members[to];
    emit(inst, 'landing-tower:turn', {
      axis: ring.key, value: m ? m.key : null, index: to, count: ring.count,
      focus: i, steps: steps,
    });

    // The native host may normalize or refuse a candidate. Its completion is
    // authoritative; an old animation must not repaint a different selection.
    if (inst.rot[i] !== to) return snapshot(inst);

    animate(inst, Math.min(240, 90 + Math.abs(steps) * 24), function (k) {
      inst.offsetF[i] = startOff + d * k;
      draw(inst);
    }, function () {
      inst.offsetF[i] = targetOff;
      draw(inst);
    });
    return snapshot(inst);
  }

  function unwrapOn(inst, ringIdx) {
    var i = ringIdx == null ? inst.focus : Math.round(Number(ringIdx));
    if (!(i >= 0 && i < inst.tower.rings.length)) i = 0;
    var from = inst.t[i], to = from > 0.5 ? 0 : 1;
    inst.focus = i;
    animate(inst, 320, function (k) {
      inst.t[i] = from + (to - from) * k;
      draw(inst);
    }, function () {
      inst.t[i] = to;
      draw(inst);
    });
    return snapshot(inst);
  }

  function setBloom(inst, on) {
    if (inst.bloom === !!on) return;
    inst.bloom = !!on;
    draw(inst);
  }

  function ringAtY(inst, clientY) {
    var rect = inst.svg.getBoundingClientRect();
    if (!rect.height) return 0;
    var y = (clientY - rect.top) / rect.height * inst.height;
    var best = 0, bd = Infinity;
    for (var i = 0; i < inst.layout.boxes.length; i++) {
      var b = inst.layout.boxes[i];
      var d = Math.abs(b.cy - y);
      if (d < bd) { bd = d; best = i; }
    }
    return { index: best, distance: bd, y: y };
  }

  function wire(inst) {
    var stage = inst.stage, svg = inst.svg, el = inst.el;

    var onMove = function (e) {
      var hit = ringAtY(inst, e.clientY);
      var b = inst.layout.boxes[hit.index];
      var near = b && Math.abs(hit.y - b.cy) <= b.ry * 3.2;
      var next = near ? hit.index : inst.focus;
      if (next !== inst.focus) { inst.focus = next; draw(inst); }
      if (near) setBloom(inst, true);
    };
    stage.addEventListener('pointermove', onMove, { passive: true });
    stage.addEventListener('pointerenter', function () { setBloom(inst, true); }, { passive: true });
    stage.addEventListener('pointerleave', function () { setBloom(inst, false); }, { passive: true });

    svg.addEventListener('click', function (e) {
      var hit = ringAtY(inst, e.clientY);
      var b = inst.layout.boxes[hit.index];
      if (!b) return;
      if (Math.abs(hit.y - b.cy) > b.ry * 3.4) return;
      inst.focus = hit.index;
      var rect = svg.getBoundingClientRect();
      var dx = e.clientX - (rect.left + rect.width * (inst.layout.cx / VIEW_W));
      turnOn(inst, dx < 0 ? -1 : 1, hit.index);
    });

    svg.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k === 'ArrowLeft') { turnOn(inst, -1); e.preventDefault(); }
      else if (k === 'ArrowRight') { turnOn(inst, 1); e.preventDefault(); }
      else if (k === 'PageUp') { turnOn(inst, 10); e.preventDefault(); }
      else if (k === 'PageDown') { turnOn(inst, -10); e.preventDefault(); }
      else if (k === 'ArrowUp' || k === 'ArrowDown') {
        var d = k === 'ArrowUp' ? 1 : -1;
        var n = inst.tower.rings.length;
        if (n) { inst.focus = T.wrap(inst.focus + d, n); draw(inst); }
        e.preventDefault();
      } else if (k === 'u' || k === 'U') { unwrapOn(inst); e.preventDefault(); }
      else if (k === 'Escape') { setBloom(inst, false); e.preventDefault(); }
    });
    svg.addEventListener('focus', function () { setBloom(inst, true); });
    svg.addEventListener('blur', function () { setBloom(inst, false); });
  }

  // ---------- public state --------------------------------------------------
  function snapshot(inst) {
    var rings = inst.tower.rings.map(function (r, i) {
      var m = gateMember(inst, r, i);
      var w = r.weights;
      var uniform = w.every(function (x) { return Math.abs(x - 1) < 1e-9; });
      return {
        key: r.key, label: r.label, count: r.count,
        rotation: inst.rot[i],
        gate: m ? m.key : null,
        gateLabel: m ? (m.label || m.key) : null,
        t: Number((inst.t[i] == null ? 1 : inst.t[i]).toFixed(3)),
        arcWeights: uniform ? 'uniform' : 'support',
      };
    });
    return {
      version: VERSION,
      mounted: true,
      ready: !!inst.ready,
      source: inst.model.source,
      degraded: !!inst.degraded,
      note: inst.note || '',
      ringsDrawn: inst.tower.rings.length,
      totalMembers: inst.tower.totalMembers,
      totalFamilies: inst.tower.totalFamilies,
      drawnMembers: inst.tower.drawnMembers,
      folded: { count: inst.tower.folded.count, families: inst.tower.folded.families },
      focus: inst.focus,
      focusKey: rings[inst.focus] ? rings[inst.focus].key : null,
      bloom: !!inst.bloom,
      reducedMotion: isReduced(),
      composition: { seed: inst.comp.seed, tag: inst.comp.tag, arity: inst.comp.arity, parts: inst.comp.parts },
      rings: rings,
      quietAlpha: inst.quietAlpha == null ? 0 : Number(inst.quietAlpha.toFixed(3)),
      glyphLayers: inst.layers ? inst.layers.length : 0,
    };
  }

  // ---------- in-page selftest ---------------------------------------------
  function selftestOn(inst) {
    var arms = [];
    var ok = function (name, cond, detail) {
      arms.push({ name: 'dom · ' + name, ok: !!cond, detail: detail == null ? '' : String(detail) });
    };
    var core = T.selftest(inst.model, { maxRings: 6 });
    core.arms.forEach(function (a) { arms.push({ name: 'core · ' + a.name, ok: a.ok, detail: a.detail }); });

    var svg = inst.svg, html = svg.outerHTML;
    var rings = inst.tower.rings;
    ok('svg mounted with a viewBox', !!svg.getAttribute('viewBox'), svg.getAttribute('viewBox'));
    ok('one axis line', svg.querySelectorAll('.tw-axis').length === 1);
    ok('one ellipse per ring', svg.querySelectorAll('.tw-ring').length === rings.length, String(rings.length));
    ok('one gate mark per ring', svg.querySelectorAll('.tw-tick.is-gate').length === rings.length);
    ok('ticks == every member drawn', svg.querySelectorAll('.tw-tick').length === inst.tower.drawnMembers + rings.length,
      svg.querySelectorAll('.tw-tick').length + ' vs ' + (inst.tower.drawnMembers + rings.length));
    ok('one label + one gate label per ring',
      svg.querySelectorAll('.tw-label').length === rings.length && svg.querySelectorAll('.tw-gate').length === rings.length);
    ok('glyph layers painted, none blank',
      inst.glyphNodes.length === 4 && inst.glyphNodes.every(function (n) { return /repeating-linear-gradient/.test(n.style.backgroundImage); }),
      String(inst.glyphNodes.length));
    ok('quiet alpha <= 0.12 at rest', (inst.quietAlpha || 0) <= T.QUIET_CAP + 1e-12, String(inst.quietAlpha));
    ok('glyph gradients carry no NaN', inst.glyphNodes.every(function (n) { return !/NaN|undefined/.test(n.style.backgroundImage); }));
    ok('no NaN / undefined in drawn attributes', !/NaN|undefined/.test(html));
    ok('aria-label names the gates', /Composition [0-9a-f]{8}/.test(svg.getAttribute('aria-label') || ''),
      svg.getAttribute('aria-label'));
    ok('composition tag is 8-hex', /^[0-9a-f]{8}$/.test(inst.comp.tag), inst.comp.tag);
    ok('state() is coherent', (function () {
      var s = snapshot(inst);
      return s.rings.length === rings.length && s.composition.tag === inst.comp.tag && s.ready === inst.ready;
    })());
    ok('mount(el) is idempotent', mount(inst.el) === inst.api);
    ok('no horizontal overflow of the section',
      inst.el.scrollWidth <= inst.el.clientWidth + 1,
      inst.el.scrollWidth + ' vs ' + inst.el.clientWidth);
    ok('reading carries two lines', inst.dom.spans.length >= 2 &&
      inst.dom.spans[0].textContent.length > 40 && inst.dom.spans[1].textContent.length > 40);

    var pass = arms.filter(function (a) { return a.ok; }).length;
    var fail = arms.length - pass;
    return { pass: pass, fail: fail, total: arms.length, arms: arms };
  }

  function wireOnce(inst) {
    if (inst.wired) return;
    inst.wired = true;
    wire(inst);
  }

  // ---------- exports -------------------------------------------------------
  window.LandingTower = Object.freeze({
    mount: function (el, opts) { return mount(el, opts); },
    state: function () { return current ? snapshot(current) : { mounted: false, version: VERSION }; },
    sync: function () { return current ? syncOn(current) : null; },
    turn: function (n, ring) { return current ? turnOn(current, n, ring) : null; },
    unwrap: function (ring) { return current ? unwrapOn(current, ring) : null; },
    selftest: function () {
      return current ? selftestOn(current) : { pass: 0, fail: 0, total: 0, arms: [], note: 'nothing mounted' };
    },
  });
})();
