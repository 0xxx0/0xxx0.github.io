/* app.js — browser layer: deterministic canvas render, tap bloom, side panel.
   Every number comes from data.js (records) or core.js (hash/lane layout).
   No Math.random, no physics, no timers at rest: rendering runs only while
   a bloom transition is in flight or on resize. */

(function () {
  'use strict';

  var DATA = window.MG_DATA, CORE = window.MG_CORE;
  if (!DATA || !CORE) return;

  var NODES = DATA.NODES, EDGES = DATA.EDGES, TYPES = DATA.TYPES;
  var LW = CORE.LOGICAL_W;
  var LH = CORE.TOP + CORE.TYPE_ORDER.length * CORE.LANE_H + 16;
  var R = CORE.NODE_R;
  var TAU = Math.PI * 2;

  /* rest-state alpha budget — DESIGN LAW: every canvas layer <= 0.12 at rest */
  var A_GUIDE = 0.05, A_EDGE = 0.07, A_ARC = 0.09, A_FILL = 0.06, A_GLYPH = 0.12;
  /* bloom targets (behind explicit tap only) */
  var B_GLYPH_FOCUS = 0.98, B_GLYPH_NB = 0.78, B_GLYPH_OFF = 0.035;
  var B_EDGE_INC = 0.6, B_EDGE_OFF = 0.018;

  function ink(a) {
    a = Math.max(0, Math.min(1, a));
    return 'rgba(79,87,96,' + (Math.round(a * 1000) / 1000) + ')';
  }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* ---------- static derivations (pure, once) ------------------------- */
  var POS = CORE.layout(NODES);
  var DEG = CORE.degrees(EDGES, NODES.map(function (n) { return n.id; }));
  var MAX_DEG = 1;
  NODES.forEach(function (n) { if (DEG[n.id] > MAX_DEG) MAX_DEG = DEG[n.id]; });

  var NODE_BY_ID = {};
  NODES.forEach(function (n) { NODE_BY_ID[n.id] = n; });

  /* edge geometry: bow direction + strength from edge id hash (no randomness) */
  var GEOM = {};
  EDGES.forEach(function (e) {
    var a = POS[e.src], b = POS[e.dst];
    var dx = b.x - a.x, dy = b.y - a.y;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var h = CORE.hash32(e.id);
    var bow = ((h & 1) ? 1 : -1) * (7 + (h % 9));
    var cx = (a.x + b.x) / 2 + (-dy / len) * bow;
    var cy = (a.y + b.y) / 2 + (dx / len) * bow;
    GEOM[e.id] = {
      sx: a.x + dx / len * (R + 1.5), sy: a.y + dy / len * (R + 1.5),
      ex: b.x - dx / len * (R + 1.5), ey: b.y - dy / len * (R + 1.5),
      cx: cx, cy: cy,
      mx: 0.25 * a.x + 0.5 * cx + 0.25 * b.x,
      my: 0.25 * a.y + 0.5 * cy + 0.25 * b.y
    };
  });

  /* ---------- state ---------------------------------------------------- */
  var canvas = document.getElementById('g');
  var ctx = canvas.getContext('2d');
  var sel = null;            /* selected node id */
  var bloom = null;          /* {nodes:[],edges:[]} of the selection */
  var p = 0, from = 0, to = 0, t0 = 0, raf = 0, timer = 0;
  var DUR = 260;
  var reduced = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;

  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };

  /* ---------- glyphs (shape encodes type; colour is never the only key) */
  function glyphPath(c, type, r) {
    var i, a;
    c.beginPath();
    switch (type) {
      case 'person':                       /* circle + centre dot */
        c.arc(0, 0, r, 0, TAU);
        break;
      case 'decision':                     /* diamond */
        c.moveTo(0, -r); c.lineTo(r, 0); c.lineTo(0, r); c.lineTo(-r, 0); c.closePath();
        break;
      case 'artifact':                     /* hexagon */
        for (i = 0; i < 6; i++) {
          a = -Math.PI / 2 + i * TAU / 6;
          if (i === 0) c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        c.closePath();
        break;
      case 'project':                      /* square */
        c.rect(-r * 0.86, -r * 0.86, r * 1.72, r * 1.72);
        break;
      case 'place':                        /* triangle */
        c.moveTo(0, r); c.lineTo(r * 0.95, -r * 0.78); c.lineTo(-r * 0.95, -r * 0.78);
        c.closePath();
        break;
      default:                             /* lesson: plus */
        var w = r * 0.4, L = r * 1.05;
        c.moveTo(-w, -L); c.lineTo(w, -L); c.lineTo(w, -w); c.lineTo(L, -w);
        c.lineTo(L, w); c.lineTo(w, w); c.lineTo(w, L); c.lineTo(-w, L);
        c.lineTo(-w, w); c.lineTo(-L, w); c.lineTo(-L, -w); c.lineTo(-w, -w);
        c.closePath();
    }
  }

  /* ---------- canvas sizing ------------------------------------------- */
  var scale = 1;
  function resize() {
    var cssW = canvas.clientWidth || LW;
    scale = cssW / LW;
    var dpr = window.devicePixelRatio || 1;
    canvas.style.height = Math.round(LH * scale) + 'px';
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(LH * scale * dpr);
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    draw();
  }

  /* ---------- bloom animation ------------------------------------------
     Frames are driven by rAF AND a 16ms interval, both computing the same
     closed-form progress from (from,to,t0) — so the two are idempotent and
     the transition still lands where rAF is throttled or never fires
     (background tab, headless, kiosk). Reduced motion jumps straight to
     the end state: depth without motion. */
  function now() {
    return (window.performance && performance.now) ? performance.now() : Date.now();
  }
  function stop() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    if (timer) { clearInterval(timer); timer = 0; }
  }
  function advance() {
    var k = Math.min(1, (now() - t0) / DUR);
    p = from + (to - from) * easeOut(k);
    draw();
    if (k >= 1) { stop(); p = to; draw(); }
  }
  function ramp(to_) {
    if (to_ === to && (raf || timer)) return;   /* already flying that way */
    from = p; to = to_; t0 = now();
    if (reduced) { p = to; draw(); return; }
    stop();
    if (!raf) raf = requestAnimationFrame(function () { raf = 0; advance(); });
    if (!timer) timer = setInterval(advance, 16);
  }

  /* ---------- render ---------------------------------------------------- */
  function nodeState(id) {
    if (!sel) return { g: A_GLYPH, f: A_FILL, focus: false, nb: false };
    if (id === sel) return {
      g: lerp(A_GLYPH, B_GLYPH_FOCUS, p), f: lerp(A_FILL, 0.2, p), focus: true, nb: true
    };
    var nb = bloom.nodes.indexOf(id) >= 0;
    if (nb) return {
      g: lerp(A_GLYPH, B_GLYPH_NB, p), f: lerp(A_FILL, 0.12, p), focus: false, nb: true
    };
    return { g: lerp(A_GLYPH, B_GLYPH_OFF, p), f: lerp(A_FILL, 0.012, p), focus: false, nb: false };
  }

  function draw() {
    ctx.clearRect(0, 0, LW, LH);

    /* lane guides + journey-ordinal ticks (tick count = lane index + 1) */
    ctx.lineWidth = 1;
    for (var l = 0; l < CORE.TYPE_ORDER.length; l++) {
      var y = CORE.TOP + l * CORE.LANE_H;
      ctx.strokeStyle = ink(sel ? lerp(A_GUIDE, 0.02, p) : A_GUIDE);
      ctx.beginPath(); ctx.moveTo(4, y + 0.5); ctx.lineTo(LW - 4, y + 0.5); ctx.stroke();
      ctx.strokeStyle = ink(sel ? lerp(A_GUIDE, 0.03, p) : A_GUIDE);
      for (var k = 0; k <= l; k++) {
        var tx = 6 + k * 4;
        ctx.beginPath(); ctx.moveTo(tx + 0.5, y - 4); ctx.lineTo(tx + 0.5, y - 1); ctx.stroke();
      }
    }

    /* edges (hairlines) */
    for (var i = 0; i < EDGES.length; i++) {
      var e = EDGES[i], gm = GEOM[e.id];
      var inc = !!(sel && bloom.edges.indexOf(e.id) >= 0);
      var a = !sel ? A_EDGE : (inc ? lerp(A_EDGE, B_EDGE_INC, p) : lerp(A_EDGE, B_EDGE_OFF, p));
      if (a < 0.005) continue;
      ctx.strokeStyle = ink(a);
      ctx.beginPath();
      ctx.moveTo(gm.sx, gm.sy);
      ctx.quadraticCurveTo(gm.cx, gm.cy, gm.ex, gm.ey);
      ctx.stroke();
    }

    /* edge labels — bloom only, incident edges only */
    if (sel && p > 0.35) {
      var la = lerp(0, 0.92, (p - 0.35) / 0.65);
      ctx.font = '7px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (var j = 0; j < EDGES.length; j++) {
        var ee = EDGES[j];
        if (bloom.edges.indexOf(ee.id) < 0) continue;
        var g2 = GEOM[ee.id];
        var w = ctx.measureText(ee.label).width;
        ctx.fillStyle = 'rgba(8,12,18,0.92)';
        ctx.fillRect(g2.mx - w / 2 - 2.5, g2.my - 5.5, w + 5, 11);
        ctx.fillStyle = ink(la);
        ctx.fillText(ee.label, g2.mx, g2.my);
      }
    }

    /* nodes: glyph (shape = type), fill, degree arc (sweep = degree/max) */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (var m = 0; m < NODES.length; m++) {
      var n = NODES[m], q = POS[n.id], st = nodeState(n.id);
      var r = st.focus ? R * (1 + 0.45 * p) : R;

      ctx.save();
      ctx.translate(q.x, q.y);

      if (st.focus && p > 0.02) {                 /* selection halo = tapped datum */
        ctx.strokeStyle = ink(0.24 * p);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(0, 0, r + 6, 0, TAU); ctx.stroke();
      }

      glyphPath(ctx, n.type, r);
      ctx.fillStyle = ink(st.f);
      ctx.fill();
      ctx.lineWidth = 1.25;
      ctx.strokeStyle = ink(st.g);
      ctx.stroke();

      var sweep = TAU * (DEG[n.id] / MAX_DEG);
      ctx.beginPath();
      ctx.arc(0, 0, r + 3.5, -Math.PI / 2, -Math.PI / 2 + sweep);
      ctx.lineWidth = 1;
      ctx.strokeStyle = ink(st.g / A_GLYPH * A_ARC * (st.focus ? 1.4 : st.nb ? 1 : lerp(1, 0.3, p)));
      ctx.stroke();
      ctx.restore();

      /* node titles — bloom only */
      if (sel && p > 0.25 && (st.focus || st.nb)) {
        var la2 = 0.92 * (p - 0.25) / 0.75;
        ctx.font = (st.focus ? '8.5px ' : '8px ') +
          'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
        var txt = n.title, w2 = ctx.measureText(txt).width;
        var lx = Math.min(Math.max(q.x, 4 + w2 / 2), LW - 4 - w2 / 2);
        ctx.fillStyle = ink(la2);
        ctx.fillText(txt, lx, q.y + r + 6);
        if (st.focus && n.sub) {
          ctx.font = '7px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
          ctx.fillStyle = ink(la2 * 0.62);
          ctx.fillText(n.sub, lx, q.y + r + 17);
        }
      }
    }
  }

  /* ---------- selection / panel ---------------------------------------- */
  var panel = document.getElementById('panel');
  var panelBody = document.getElementById('panel-body');

  function esc(s) {
    return String(s).replace(/[&<>]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c];
    });
  }

  function renderPanel(id) {
    var n = NODE_BY_ID[id];
    var links = '';
    var inc = EDGES.filter(function (e) { return e.src === id || e.dst === id; });
    inc.sort(function (a, b) { return a.label < b.label ? -1 : a.label > b.label ? 1 : 0; });
    inc.forEach(function (e) {
      var out = e.src === id;
      var other = out ? e.dst : e.src;
      var arrow = out ? '→' : '←';
      links += '<div><span class="ar">' + arrow + '</span><span class="lb">' +
        esc(e.label) + '</span> <span class="nd">' + esc(other) + '</span></div>';
    });
    panelBody.innerHTML =
      '<div class="p-top"><span class="p-type">' + esc(n.type.toUpperCase()) + '</span>' +
      '<span class="p-id">id:' + esc(n.id) + '</span>' +
      '<button class="p-x" id="p-close" type="button" aria-label="close record">✕</button></div>' +
      '<h2 class="p-title">' + esc(n.title) +
      (n.sub ? '<span class="p-sub">' + esc(n.sub) + '</span>' : '') + '</h2>' +
      '<p class="p-rec">' + esc(n.record) + '</p>' +
      '<div class="p-prov">PROV ' + esc(n.prov) + '</div>' +
      '<div class="p-meta">DEG ' + DEG[n.id] + ' · TS ' + esc(n.ts || '—') +
      ' · LANE ' + esc(n.type) + ' · x' + POS[n.id].x + ' y' + POS[n.id].y + '</div>' +
      '<div class="p-links"><div class="hd">EDGES ' + inc.length + '</div>' +
      (links || '<div><span class="nd">isolated</span></div>') + '</div>';
    panel.classList.add('open');
    document.getElementById('p-close').addEventListener('click', clear);
  }

  /* keep the tapped node visible above the record sheet (phone-first:
     the sheet can cover the lower half of the graph) */
  function ensureVisible(id) {
    var q = POS[id];
    var rect = canvas.getBoundingClientRect();
    var vpY = rect.top + q.y * scale;          /* node in viewport coords */
    var panelTop = window.innerHeight - panel.offsetHeight;
    var lo = 64, hi = panelTop - 96;
    if (hi <= lo) return;                       /* tiny viewport: skip */
    var delta = null;
    if (vpY > hi) delta = vpY - hi;             /* hidden behind the sheet */
    else if (vpY < lo) delta = vpY - lo;        /* under the header */
    if (delta !== null) {
      window.scrollBy({ top: delta, behavior: reduced ? 'auto' : 'smooth' });
    }
  }

  function select(id) {
    sel = id;
    bloom = CORE.neighbourhood(EDGES, id);
    renderPanel(id);
    ensureVisible(id);
    ramp(1);
  }
  function clear() {
    if (!sel) return;
    sel = null; bloom = null;
    panel.classList.remove('open');
    ramp(0);
  }

  /* ---------- tap ------------------------------------------------------- */
  var downPt = null;
  canvas.addEventListener('pointerdown', function (ev) {
    downPt = { x: ev.clientX, y: ev.clientY };
  });
  canvas.addEventListener('pointercancel', function () { downPt = null; });
  canvas.addEventListener('pointerup', function (ev) {
    if (downPt) {
      var moved = Math.abs(ev.clientX - downPt.x) + Math.abs(ev.clientY - downPt.y);
      downPt = null;
      if (moved > 10) return;            /* that was a scroll, not a tap */
    }
    var rect = canvas.getBoundingClientRect();
    var lx = (ev.clientX - rect.left) * LW / rect.width;
    var ly = (ev.clientY - rect.top) * LW / rect.width;  /* uniform scale */
    var best = null, bestD = R + 11;
    for (var i = 0; i < NODES.length; i++) {
      var q = POS[NODES[i].id];
      var d = Math.sqrt((q.x - lx) * (q.x - lx) + (q.y - ly) * (q.y - ly));
      if (d < bestD) { bestD = d; best = NODES[i].id; }
    }
    if (best && best !== sel) select(best);
    else if (best && best === sel) clear();
    else clear();
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') clear();
  });

  /* ---------- chrome: sub line, legend, degrees ------------------------- */
  function buildChrome() {
    document.getElementById('sub').innerHTML =
      '緣 ' + TYPES.length + ' types · ' + NODES.length + ' nodes · ' +
      EDGES.length + ' edges · force-free · hash placement';

    var legend = document.getElementById('legend');
    TYPES.forEach(function (t) {
      var count = NODES.filter(function (n) { return n.type === t.id; }).length;
      var item = document.createElement('div');
      item.className = 'lg';
      var c = document.createElement('canvas');
      var dpr = window.devicePixelRatio || 1, px = 16;
      c.width = px * dpr; c.height = px * dpr;
      c.style.width = px + 'px'; c.style.height = px + 'px';
      var cc = c.getContext('2d');
      cc.setTransform(dpr, 0, 0, dpr, 0, 0);
      cc.translate(px / 2, px / 2);
      glyphPath(cc, t.id, 5.5);
      cc.fillStyle = ink(A_FILL);
      cc.fill();
      cc.lineWidth = 1.1;
      cc.strokeStyle = ink(0.5);           /* legend is chrome, not a graph layer */
      cc.stroke();
      var s = document.createElement('span');
      s.innerHTML = esc(t.label) + ' <span class="n">' + count + '</span>';
      item.appendChild(c);
      item.appendChild(s);
      legend.appendChild(item);
    });

    var order = NODES.slice().sort(function (a, b) {
      if (DEG[b.id] !== DEG[a.id]) return DEG[b.id] - DEG[a.id];
      return a.id < b.id ? -1 : 1;
    });
    var html = '<span class="k">DEGREES</span>';
    order.forEach(function (n, idx) {
      if (idx) html += '<span class="sep">·</span>';
      html += esc(n.id) + ' <b>' + DEG[n.id] + '</b>';
    });
    document.getElementById('degrees').innerHTML = html;
  }

  /* ---------- boot ------------------------------------------------------- */
  buildChrome();
  resize();
  if (window.ResizeObserver) {
    new ResizeObserver(function () { resize(); }).observe(canvas.parentNode);
  } else {
    window.addEventListener('resize', resize);
  }
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    var onMq = function () { reduced = mq.matches; };
    if (mq.addEventListener) mq.addEventListener('change', onMq);
    else if (mq.addListener) mq.addListener(onMq);
  }
})();
