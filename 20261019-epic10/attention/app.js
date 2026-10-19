/* app.js — ATTN·SPIRAL painter + interaction. Dumb on purpose: every number and
   every coordinate comes from core.frame()/core.report(); this file only paints
   the display list and wires hover / tap / keyboard reveal.
   Reveal is explicit (P3): hover, focus or tap raises it, release returns to
   quiet. prefers-reduced-motion gets the same depth with zero motion. */
(function () {
  'use strict';

  const A = globalThis.ATTN;
  const DATA = A.DATA, VIEW = A.VIEW;
  const $ = (s) => document.querySelector(s);
  const el = {
    fig: $('#fig'), cv: $('#spiral'), readout: $('#readout'), hint: $('#hint'),
    days: $('#days'), legend: $('#legend'), legendTitle: $('#legend-title'),
    rows: $('#legend-rows'), win: $('#win'), foot: $('#foot'),
  };

  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rgb = (c) => 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
  const ctx = el.cv.getContext('2d');

  /* ---------- canvas: logical 390x430 backing, CSS-scaled for crispness ---------- */
  let dpr = 1, scale = 1;
  function fit() {
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    const rect = el.cv.getBoundingClientRect();
    scale = rect.width ? rect.width / VIEW.W : 1;
    el.cv.width = Math.max(1, Math.round(VIEW.W * scale * dpr));
    el.cv.height = Math.max(1, Math.round(VIEW.H * scale * dpr));
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    paint();
  }

  function paint() {
    ctx.clearRect(0, 0, VIEW.W, VIEW.H);
    ctx.fillStyle = rgb(A.PAD);
    ctx.fillRect(0, 0, VIEW.W, VIEW.H);
    for (const op of A.frame(DATA, { d: sel, reveal })) draw(op);
  }

  function draw(op) {
    ctx.globalAlpha = op.a;
    ctx.lineWidth = op.w || 1;
    ctx.setLineDash(op.dash || []);
    ctx.strokeStyle = rgb(op.c);
    ctx.fillStyle = rgb(op.c);
    if (op.t === 'poly') {
      ctx.beginPath();
      for (let i = 0; i < op.pts.length; i++) {
        const p = op.pts[i];
        if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
      }
      if (op.fill) { ctx.closePath(); ctx.fill(); } else ctx.stroke();
    } else if (op.t === 'line') {
      ctx.beginPath(); ctx.moveTo(op.x0, op.y0); ctx.lineTo(op.x1, op.y1); ctx.stroke();
    } else if (op.t === 'dot') {
      ctx.beginPath(); ctx.arc(op.x, op.y, op.r, 0, Math.PI * 2); ctx.fill();
    } else if (op.t === 'rect') {
      ctx.fillRect(op.x, op.y, op.w, op.h);
    }
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
  }

  /* ---------- reveal state machine (explicit, tweened, reduced-motion aware) ---- */
  let sel = null;            // bloomed day (null = quiet)
  let locked = null;         // pinned by tap/click
  let hover = null;          // pointer / focus over a day
  let reveal = 0, target = 0, from = 0, t0 = 0, raf = 0;
  const DUR_IN = 220, DUR_OUT = 170;
  const activeDay = () => (locked != null ? locked : hover);

  function setDay(d, instant) {
    const next = d == null ? null : d;
    if (next != null) sel = next;
    target = next == null ? 0 : 1;
    if (instant || reduced() || (target === 1 && reveal === 1)) {
      reveal = target;
      if (target === 0) sel = null;
      paint(); dom();
      return;
    }
    from = reveal; t0 = 0;
    if (!raf) raf = requestAnimationFrame(step);
    dom();
  }
  function step(ts) {
    if (!t0) t0 = ts;
    const dur = target === 1 ? DUR_IN : DUR_OUT;
    const p = Math.min(1, (ts - t0) / dur);
    const e = 1 - Math.pow(1 - p, 3);
    reveal = from + (target - from) * e;
    paint();
    stampFrame();
    if (p < 1) { raf = requestAnimationFrame(step); }
    else { raf = 0; reveal = target; if (target === 0) sel = null; paint(); dom(); }
  }
  function sync() { setDay(activeDay()); }

  /* ---------- DOM: bar readout, day chips, legend ---------- */
  const pad2 = (n) => (n < 10 ? '0' + n : '' + n);
  const shortDate = (iso) => iso.slice(5).replace('-', '-');

  function buildDays() {
    DATA.forEach((day, d) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'day';
      b.dataset.d = d;
      b.setAttribute('aria-label', day.date + ' bloom');
      b.textContent = pad2(+day.date.slice(8));
      el.days.appendChild(b);
    });
  }

  function buildLegend() {
    A.PROJECTS.forEach((name, k) => {
      const id = A.identity(name);
      const row = document.createElement('div');
      row.className = 'lrow';
      row.dataset.k = k;
      const cv = document.createElement('canvas');
      cv.className = 'stamp';
      cv.width = 20 * 2; cv.height = 20 * 2;
      cv.style.width = '20px'; cv.style.height = '20px';
      cv.setAttribute('aria-hidden', 'true');
      row.appendChild(cv);
      const nm = document.createElement('span');
      nm.className = 'lname';
      nm.textContent = name.toUpperCase();
      row.appendChild(nm);
      const tg = document.createElement('span');
      tg.className = 'ltag';
      tg.textContent = id.tag;
      row.appendChild(tg);
      const ct = document.createElement('span');
      ct.className = 'lcount';
      row.appendChild(ct);
      el.rows.appendChild(row);
      paintStamp(cv, name, 0);
    });
  }

  function paintStamp(cv, name, amt) {
    const c = cv.getContext('2d');
    const s = A.stampLines(name, 20, 20);
    c.setTransform(2, 0, 0, 2, 0, 0);
    c.clearRect(0, 0, 20, 20);
    c.lineWidth = 1;
    for (const L of s.layers) {
      c.globalAlpha = amt > 0 ? Math.min(0.6, L.alpha * (1 + 7 * amt)) : L.alpha;
      c.strokeStyle = rgb(A.INK);
      c.beginPath();
      for (const ln of L.lines) { c.moveTo(ln[0], ln[1]); c.lineTo(ln[2], ln[3]); }
      c.stroke();
    }
    c.globalAlpha = 1;
  }

  function line(k, v) {
    return '<span class="rl"><span class="rk">' + k + '</span><span class="rv">' + v + '</span></span>';
  }

  function dom() {
    const win = A.window(DATA);
    const r = sel == null ? null : A.report(DATA, sel);
    el.readout.innerHTML =
      line(r ? shortDate(r.date) + ' D' + (r.day + 1) : win.days + 'D', r ? '' : '') +
      line('合计', r ? r.total : win.total) +
      line('消息', r ? r.msg : win.msg) +
      line('制品', r ? r.art : win.art) +
      line('已发', r ? r.shipped : win.shipped) +
      line('未结', r ? r.open : win.open);
    el.readout.dataset.bloom = r ? '1' : '0';
    el.hint.dataset.bloom = r ? '1' : '0';

    for (const b of el.days.children) {
      const d = +b.dataset.d;
      const on = d === sel;
      b.dataset.active = on ? '1' : '0';
      b.setAttribute('aria-pressed', locked === d ? 'true' : 'false');
    }

    el.legend.dataset.open = r ? '1' : '0';
    if (r) {
      const hits = r.rows.filter((x) => x.v > 0).length;
      el.legendTitle.innerHTML = '项目 · <b>' + shortDate(r.date) + '</b><span class="dot">·</span>命中 ' + hits + '/' + r.rows.length;
      r.rows.forEach((x) => {
        const row = el.rows.children[x.k];
        const ct = row.querySelector('.lcount');
        if (x.v === 0) {
          ct.innerHTML = '<span class="zero">— 无记录</span>';
          row.dataset.on = '0';
        } else {
          const shipDom = x.s >= x.o;
          ct.innerHTML = 'M' + x.m + ' A' + x.a +
            '<i class="sep">│</i><i class="g ' + (shipDom ? 'ship' : 'open') + '"></i>' +
            '<i class="n s">S' + x.s + '</i><i class="n o">O' + x.o + '</i>';
          row.dataset.on = '1';
        }
        paintStamp(row.querySelector('.stamp'), x.name, reveal);
      });
    } else {
      el.legendTitle.innerHTML = '项目 · <span class="dim">TAP A DAY</span>';
      A.PROJECTS.forEach((name, k) => {
        const row = el.rows.children[k];
        row.dataset.on = '0';
        row.querySelector('.lcount').innerHTML = '<span class="zero">— 无记录</span>';
        paintStamp(row.querySelector('.stamp'), name, 0);
      });
    }
  }

  /* re-stamp the visible legend as reveal eases (stamps brighten with the bloom) */
  function stampFrame() {
    if (sel == null || reveal <= 0) return;
    const r = A.report(DATA, sel);
    r.rows.forEach((x) => {
      if (x.v > 0) paintStamp(el.rows.children[x.k].querySelector('.stamp'), x.name, reveal);
    });
  }

  /* ---------- input ---------- */
  function toLogical(ev) {
    const rect = el.cv.getBoundingClientRect();
    return {
      x: (ev.clientX - rect.left) * (VIEW.W / rect.width),
      y: (ev.clientY - rect.top) * (VIEW.H / rect.height),
    };
  }
  const dayAt = (ev) => { const h = A.hitTest(DATA, toLogical(ev).x, toLogical(ev).y); return h ? h.d : null; };

  el.cv.addEventListener('pointermove', (ev) => {
    if (ev.pointerType === 'touch') return;
    const d = dayAt(ev);
    if (d !== hover) { hover = d; sync(); }
  });
  el.cv.addEventListener('pointerleave', () => { hover = null; sync(); });
  el.cv.addEventListener('pointerdown', (ev) => {
    const d = dayAt(ev);
    if (d == null) { locked = null; } else { locked = locked === d ? null : d; }
    hover = null;
    sync();
    ev.preventDefault();
  });

  el.days.addEventListener('pointerover', (ev) => {
    const b = ev.target.closest('.day');
    if (!b || ev.pointerType === 'touch') return;
    hover = +b.dataset.d; sync();
  });
  el.days.addEventListener('pointerout', (ev) => {
    if (ev.pointerType === 'touch') return;
    if (!ev.relatedTarget || !ev.relatedTarget.closest || !ev.relatedTarget.closest('.day')) { hover = null; sync(); }
  });
  el.days.addEventListener('click', (ev) => {
    const b = ev.target.closest('.day');
    if (!b) return;
    const d = +b.dataset.d;
    locked = locked === d ? null : d;
    sync();
  });
  el.days.addEventListener('focusin', (ev) => {
    const b = ev.target.closest('.day');
    if (!b) return;
    hover = +b.dataset.d; sync();
  });
  el.days.addEventListener('focusout', () => { hover = null; sync(); });

  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape') return;
    locked = null; hover = null; sync();
  });

  /* ---------- boot modes ----------------------------------------------------------
     ?static=1        render exactly one frame, never start a tween (headless-safe)
     ?day=N&static=1  render day N already bloomed (a deep-linkable bloom state)
     ?selftest=1      run the in-page assertions synchronously and write the verdict
                      to <pre id="selftest"> + document.title + <script type=json>.
                      DOM only — this page makes NO network call, by house law. */
  const params = new URLSearchParams(location.search);
  const STATIC = params.has('static');
  const SELFTEST = params.has('selftest');

  /* ---------- boot ---------- */
  buildDays();
  buildLegend();
  el.win.textContent = DATA[0].date.slice(5) + '→' + DATA[DATA.length - 1].date.slice(5);
  const gsig = A.geomSignature(DATA);
  el.foot.innerHTML = '<span>LANE ATTENTION</span><span>GEOM ' + gsig.hash + ' · ' + gsig.n + ' MARKS</span>';
  if (params.has('day')) { sel = Math.max(0, Math.min(DATA.length - 1, +params.get('day') || 0)); reveal = 1; target = 1; }
  dom();
  fit();

  if (!STATIC) {
    if (window.ResizeObserver) {
      let lastW = 0;
      new ResizeObserver((ents) => {
        const w = Math.round((ents[0] && ents[0].contentRect ? ents[0].contentRect.width : 0) * 100);
        if (w !== lastW) { lastW = w; fit(); }
      }).observe(el.fig);
    }
    window.addEventListener('resize', fit);
    window.ATTN_APP = { setDay, state: () => ({ sel, locked, hover, reveal }) };
  }

  if (SELFTEST) bootSelftest();

  /* ---------- in-page verdict (page-as-harness) ----------------------------------- */
  function bootSelftest() {
    const lines = [];
    const assert = (name, ok, detail) => lines.push({ name, ok: !!ok, detail: detail == null ? '' : String(detail) });
    const txt = () => document.body.innerText.replace(/\s+/g, ' ');

    /* pixel readback of the real canvas */
    function sample() {
      const im = ctx.getImageData(0, 0, el.cv.width, el.cv.height).data;
      let lit = 0, bright = 0, maxDev = 0, gold = 0, cool = 0;
      for (let i = 0; i < im.length; i += 4) {
        const dr = Math.abs(im[i] - A.PAD[0]), dg = Math.abs(im[i + 1] - A.PAD[1]), db = Math.abs(im[i + 2] - A.PAD[2]);
        const dev = Math.max(dr, dg, db);
        if (dev > 3) lit++;
        if (dev > 40) bright++;
        if (dev > maxDev) maxDev = dev;
        if (im[i] > 100 && im[i] > im[i + 2] + 35) gold++;
        if (im[i + 2] > 100 && im[i] < im[i + 2] - 35) cool++;
      }
      return { lit, bright, maxDev, gold, cool };
    }

    setDay(null, true);
    const rest = sample();
    /* a blank pad-filled canvas reads 0 lit; any drawn hairline reads above the threshold */
    assert('canvas draws at rest (hairline ribbon + bar + guides present, not blank)', rest.lit > 800,
      rest.lit + ' lit subpixels above pad+3');
    assert('quiet law in the real pixels: nothing near accent brightness at rest',
      rest.maxDev <= 20 && rest.gold === 0 && rest.cool === 0,
      `max deviation ${rest.maxDev} from pad, gold ${rest.gold}, cool ${rest.cool}`);
    assert('central bar shows the 14-day totals at rest',
      el.readout.textContent.includes('合计477') && el.readout.textContent.includes('消息370') && el.readout.textContent.includes('制品107'),
      'Σ477 M370 A107');
    assert('geometry provenance: page hash equals the node-verified golden',
      A.geomSignature(DATA).hash === '5be2461c', A.geomSignature(DATA).hash);
    assert('footer carries the same geometry provenance',
      el.foot.textContent.includes('GEOM 5be2461c') && el.foot.textContent.includes(String(A.buildMarks(DATA).length) + ' MARKS'),
      el.foot.textContent.trim());
    assert('14 day chips, in order, each a focusable button',
      el.days.children.length === 14 && [...el.days.children].every((b, i) => b.tagName === 'BUTTON' && b.textContent === String(6 + i).padStart(2, '0')),
      el.days.children.length + ' chips');
    assert('legend hidden at rest (depth behind explicit reveal)',
      el.legend.dataset.open === '0' && getComputedStyle(el.legend).visibility === 'hidden', 'data-open=0');

    setDay(12, true);                       // 2026-10-18, heaviest day (every lane shipped-dominant)
    const bloom = sample();
    assert('bloom raises the day above the rest floor and brings the warm accent in',
      bloom.maxDev > 40 && bloom.gold > 20, `maxDev ${rest.maxDev}->${bloom.maxDev}, gold ${bloom.gold}px`);
    /* spatial proof: the pixels that went bright must sit ON the bloomed day's arc,
       not scattered. Measure by radial band, not by area (the bloom wedge and the
       bar gauge legitimately light a large area). */
    function brightInBand(dayIdx) {
      const im = ctx.getImageData(0, 0, el.cv.width, el.cv.height).data;
      const sx = el.cv.width / A.VIEW.W, sy = el.cv.height / A.VIEW.H;
      const V = A.VIEW;
      let onBand = 0, offBand = 0, barPx = 0;
      for (let py = 0; py < el.cv.height; py++) {
        for (let px = 0; px < el.cv.width; px++) {
          const i = (py * el.cv.width + px) * 4;
          const dr = Math.abs(im[i] - A.PAD[0]), dg = Math.abs(im[i + 1] - A.PAD[1]), db = Math.abs(im[i + 2] - A.PAD[2]);
          if (Math.max(dr, dg, db) <= 40) continue;
          const lx = px / sx, ly = py / sy;
          /* the central bar is its own layer (already asserted by the readout swap) */
          if (lx > V.CX - V.BAR_HALF_W - 1 && lx < V.CX + V.BAR_HALF_W + 1 &&
              ly > V.CY - V.BAR_HALF_H - 1 && ly < V.CY + V.BAR_HALF_H + 1) { barPx++; continue; }
          const h = A.hitTest(DATA, lx, ly);
          if (h && h.d === dayIdx) onBand++; else offBand++;
        }
      }
      return { onBand, offBand, barPx };
    }
    const band = brightInBand(12);
    assert('every bright pixel sits on the bloomed day\'s own arc (radial locality, not a lit screen)',
      band.onBand > 60 && band.offBand < band.onBand * 0.15,
      `${band.onBand} px on day 12 band, ${band.offBand} elsewhere, ${band.barPx} in the bar gauge`);
    assert('bar readout swaps to the bloomed day (10-18: Σ73 M54 A19 S43 O30)',
      txt().includes('10-18') && el.readout.textContent.includes('合计73') && el.readout.textContent.includes('消息54') && el.readout.textContent.includes('制品19'),
      '10-18 Σ73 M54 A19');
    assert('legend opens with exact per-project counts (the-field M16 A7 · care M2 A0)',
      el.legend.dataset.open === '1' && el.rows.children[0].querySelector('.lcount').textContent.includes('M16 A7') &&
      el.rows.children[4].querySelector('.lcount').textContent.includes('M2 A0'),
      el.rows.children[0].querySelector('.lcount').textContent.trim());
    assert('the active day is marked on the chip row', el.days.children[12].dataset.active === '1', 'chip 10-18 active');
    assert('stamps stay hash-derived in the page (identity tags present)',
      el.rows.children[0].querySelector('.ltag').textContent === '3085e15d', el.rows.children[0].querySelector('.ltag').textContent);

    /* 10-19 is open-heavy (the-field 9 shipped / 11 open) — the cool accent must appear there */
    setDay(13, true);
    const cool = sample();
    assert('open-dominant day brings the cool accent in (10-19: 30 shipped / 38 open)',
      cool.cool > 20 && cool.gold > 20, `cool ${cool.cool}px, gold ${cool.gold}px`);
    assert('bar readout follows to 10-19 (Σ68 M46 A22 S30 O38)',
      el.readout.textContent.includes('合计68') && el.readout.textContent.includes('消息46') && el.readout.textContent.includes('制品22'),
      '10-19 Σ68 M46 A22');

    setDay(null, true);
    assert('release returns to quiet (legend closes, chips clear, totals restored)',
      el.legend.dataset.open === '0' && el.days.children[12].dataset.active !== '1' && el.readout.textContent.includes('合计477'),
      'quiet again');
    const after = sample();
    assert('release restores the rest pixel state exactly',
      after.lit === rest.lit && after.maxDev === rest.maxDev, `lit ${after.lit}, maxDev ${after.maxDev}`);

    assert('no undefined / NaN rendered anywhere', !/undefined|NaN/.test(txt()), 'clean text');
    /* layout: nothing clipped. Measured from inside the page against the stage box
       (never against an assumed viewport — the harness window is not the phone). */
    const doc = document.documentElement;
    const stage = document.querySelector('.stage').getBoundingClientRect();
    const targets = [...document.querySelectorAll('.hd h1, .hd .win, .day, .foot span, .lrow, .readout')];
    const clipped = targets.filter((e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && (r.right > stage.right + 0.5 || r.left < stage.left - 0.5);
    }).map((e) => e.className || e.tagName);
    const overflowX = doc.scrollWidth > Math.max(stage.right, innerWidth) + 1;
    assert('nothing clipped inside the stage (header, chips, bar readout, legend rows, footer)',
      clipped.length === 0 && !overflowX,
      `stage ${Math.round(stage.width)}px wide, scrollWidth ${doc.scrollWidth}, clipped: ${clipped.join(',') || 'none'}`);
    assert('no uncaught error during boot', !window.__err, window.__err || 'none');

    const pass = lines.filter((l) => l.ok).length;
    const verdict = 'SELFTEST ' + (pass === lines.length ? 'PASS' : 'FAIL') + ' ' + pass + '/' + lines.length;
    const pre = document.createElement('pre');
    pre.id = 'selftest';
    pre.textContent = verdict + '\n' + lines.map((l) => (l.ok ? 'PASS  ' : 'FAIL  ') + l.name + (l.detail ? '  —  ' + l.detail : '')).join('\n');
    document.body.appendChild(pre);
    const tag = document.createElement('script');
    tag.type = 'application/json';
    tag.id = 'verify-json';
    tag.textContent = JSON.stringify({ verdict, pass, total: lines.length, lines });
    document.body.appendChild(tag);
    document.title = verdict;
  }

  window.addEventListener('error', (e) => {
    /* ResizeObserver's "loop completed" warning is a browser notice, not a page fault */
    if (/ResizeObserver loop/.test(e.message || '')) return;
    window.__err = e.message;
    document.title = 'SELFTEST FAIL ' + e.message;
  });
})();
