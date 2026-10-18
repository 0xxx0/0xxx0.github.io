// moire-ambient.js — LAYERED SEMANTIC MOIRÉ, quiet by default, depth behind explicit reveal.
// Zero dependencies, no build. Dual-load: browser global `MoireAmbient` + CJS require.
//
// The craft (why it feels alive but quiet — see LANDING.md for sources):
//   * Two fine gratings beat at period p²/δ — a TINY difference between layers
//     becomes a HUGE, slow, breathing band. Small semantic deltas therefore read
//     as big visible structure only when you look for them.
//   * Softness comes from many faint layers stacked (Hobbs), never from blur:
//     every layer stays <= 0.12 alpha at rest, so the ensemble is barely-there
//     texture; nothing is a hard edge.
//   * One layer per semantic channel, and each layer NAMED. A layer that does
//     not carry a datum is deleted — interference is a reading, not decoration.
//
// Encoding law (one way, stated once):
//   channel identity -> base ANGLE (near-parallel cluster 0..11deg: strong beats)
//   count            -> PITCH  (more things, finer pitch, shorter beat period)
//   signed delta     -> TILT   (sign = lean direction, magnitude = band density)
//   ask-class        -> fixed angle slot per class
//   weight           -> ALPHA  (quiet <= .12, reveal .3..8)
//   cross-beat between two count layers encodes their DIFFERENCE — the
//   relationship between channels is emergent, not drawn.
//
// Reveal is explicit: mount() wires pointerenter/leave, focus/blur and tap-toggle;
// `prefers-reduced-motion` gets the same depth with zero motion.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MoireAmbient = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const QUIET_CAP = 0.12;      // law: nothing above this at rest
  const REVEAL_FLOOR = 0.30;   // law: reveal is unmistakable
  const BASE_PITCH = 7;        // px — fine enough to beat, coarse enough to raster

  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const r2 = (n) => Math.round(n * 100) / 100;

  // fixed angle slot per ask-class: distinct, but all near-parallel so any two
  // layers still beat. Unknown class -> deterministic hash slot (never random).
  const CLASS_SLOT = Object.freeze({
    ASK: 1.2, GIVE: 3.4, HOLD: 5.6, DECIDE: 7.8, PROVE: 10.0, CAPTURE: 2.3,
    PLAN: 4.5, OPEN: 6.7, RECOVERED: 8.9, VERIFY: 11.1,
  });
  function classSlot(name) {
    const k = String(name || 'ASK').toUpperCase();
    if (CLASS_SLOT[k] != null) return CLASS_SLOT[k];
    let h = 0; for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) >>> 0;
    return r2(1 + (h % 1000) / 1000 * 10); // 1..11, stable
  }

  // fromState — the semantic derivation. channels: {threads, parked, delta, askClass, ...}
  // Each SUPPLIED channel becomes exactly one layer; unsupplied channels simply
  // do not exist (a layer with no datum is unlawful).
  function fromState(state) {
    const s = state || {};
    const out = [];
    const push = (o) => { if (o) out.push(Object.freeze(o)); };
    const base = { pitch: BASE_PITCH, tilt: 0 };

    if (s.threads != null) {
      const n = clamp(Math.round(+s.threads || 0), 0, 12);
      push({ key: 'threads', label: 'threads', value: n, angle: 0,
             pitch: r2(BASE_PITCH * (1 - 0.02 * n)), weight: 0.10 });
    }
    if (s.parked != null) {
      const n = clamp(Math.round(+s.parked || 0), 0, 12);
      push({ key: 'parked', label: 'parked', value: n, angle: 4.5,
             pitch: r2(BASE_PITCH * (1 - 0.02 * n)), weight: 0.08 });
    }
    if (s.delta != null) {
      const d = clamp(+s.delta || 0, -4, 4);
      push({ key: 'delta', label: 'delta ' + (d >= 0 ? '+' : '') + r2(d), value: r2(d),
             angle: r2(2.5 + d * 1.5), pitch: BASE_PITCH, weight: 0.11 });
    }
    if (s.askClass != null) {
      const c = String(s.askClass).toUpperCase();
      push({ key: 'ask', label: 'ask ' + c, value: c, angle: classSlot(c),
             pitch: BASE_PITCH, weight: 0.07 });
    }
    if (s.custom) for (const L of s.custom) {
      if (L && L.angle != null && L.pitch > 0) push(L); // caller-attested layer
    }
    // alpha law: quiet = min(weight, cap); reveal = max(floor, weight * 4) capped .8
    return Object.freeze(out.map((L) => Object.freeze({
      ...L, angle: r2(L.angle), pitch: r2(L.pitch),
      quiet: r2(Math.min(L.weight, QUIET_CAP)),
      reveal: r2(clamp(Math.max(REVEAL_FLOOR, L.weight * 4), 0, 0.8)),
    })));
  }

  // legend — the receipt behind the reveal: what each band means, by name.
  function legend(layers) {
    return layers.map((L) => L.label + ' \u00b7 ' + L.pitch + 'px \u00b7 ' + L.angle + '\u00b0');
  }

  // css — pure-CSS delivery: stacked repeating-linear-gradients beat on raster.
  // No JS needed at rest; reveal rides a data attribute + :hover/:focus-visible.
  // The alpha lives INSIDE each gradient's line stop (a bare color is not a lawful
  // background-image layer — measured: the whole declaration is discarded).
  function css(layers, opts) {
    const o = opts || {}, sel = o.sel || '.moire-ambient';
    const ink = o.ink || 'var(--fg,#e9e6dd)';
    const base = o.basePitch || BASE_PITCH;
    // CSS gradient angle = direction of the gradient VECTOR (lines run perpendicular
    // to it); canvas angle = the line angle directly. +90 aligns the two substrates.
    const grat = (angle, pitch, a) =>
      `repeating-linear-gradient(${r2(90 + angle)}deg,transparent 0 ${r2(pitch - 1)}px,color-mix(in srgb,${ink} ${r2(a * 100)}%,transparent) ${r2(pitch - 1)}px ${pitch}px)`;
    const sheet = (pick) => [grat(0, base, pick(null, 0.05, 0.22))]
      .concat(layers.map((L) => grat(L.angle, L.pitch, pick(L, L.quiet, L.reveal)))).join(',');
    const pickQ = (L, q) => q, pickR = (L, q, r) => r;
    return `${sel}{position:relative;isolation:isolate}
${sel}::before{content:"";position:absolute;inset:0;z-index:0;pointer-events:none;
 background-image:${sheet(pickQ)};transition:opacity .25s ease}
${sel}:hover::before,${sel}:focus-visible::before,${sel}[data-moire-reveal="1"]::before{background-image:${sheet(pickR)}}
${sel}>*{position:relative;z-index:1}
@media (prefers-reduced-motion:reduce){${sel}::before{transition:none}}`;
  }

  // paint — canvas delivery. t = phase (px), reveal 0..1 crossfades quiet->full.
  function paint(ctx, layers, opts) {
    const o = opts || {}, w = o.w || ctx.canvas.width, h = o.h || ctx.canvas.height;
    const rev = clamp(o.reveal || 0, 0, 1), t = o.t || 0, ink = o.ink || '#e9e6dd';
    const base = o.basePitch || BASE_PITCH;
    const draw = (angle, pitch, a) => {
      const rad = angle * Math.PI / 180, diag = Math.hypot(w, h);
      ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(rad);
      ctx.strokeStyle = ink; ctx.globalAlpha = a; ctx.lineWidth = 1;
      const step = pitch, off = (t % step) - diag / 2;
      ctx.beginPath();
      for (let x = off; x < diag / 2; x += step) { ctx.moveTo(x, -diag / 2); ctx.lineTo(x, diag / 2); }
      ctx.stroke(); ctx.restore();
    };
    ctx.clearRect(0, 0, w, h);
    draw(0, base, 0.05 + 0.20 * rev);
    for (const L of layers) draw(L.angle, L.pitch, L.quiet + (L.reveal - L.quiet) * rev);
    return layers.length + 1;
  }

  // mount — attach to a real element. Quiet at rest; explicit reveal raises it;
  // a hidden legend node (the receipt) shows on reveal. Returns a small handle.
  function mount(el, layers, opts) {
    if (!el) throw new Error('moire-ambient: mount needs an element');
    const o = opts || {}, ls0 = layers || [];
    let ls = ls0; // update() REPLACES the layer set — must be rebindable
    el.classList.add(o.cls || 'moire-ambient');
    let raf = 0, t0 = 0, revealed = false, disposed = false;
    const reduced = typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches;

    let cv = el.querySelector('canvas.moire-canvas');
    if (!cv && typeof document !== 'undefined') {
      cv = document.createElement('canvas');
      cv.className = 'moire-canvas';
      cv.setAttribute('aria-hidden', 'true');
      cv.style.cssText = 'position:absolute;inset:0;z-index:0;pointer-events:none;width:100%;height:100%';
      el.insertBefore(cv, el.firstChild);
    }
    const ctx = cv && cv.getContext ? cv.getContext('2d') : null;

    let lg = el.querySelector('.moire-legend');
    if (!lg && typeof document !== 'undefined') {
      lg = document.createElement('div');
      lg.className = 'moire-legend';
      lg.hidden = true;
      lg.style.cssText = 'position:absolute;left:8px;bottom:38px;z-index:2;font:9px/1.5 ui-monospace,monospace;opacity:.75;pointer-events:none;text-shadow:0 1px 6px var(--bg,#0b0d10)';
      lg.textContent = legend(ls).join('  \u2502  ');
      el.appendChild(lg);
    }

    let LW = 0, LH = 0; // logical size — paint runs under the DPR transform
    function size() {
      if (!ctx) return;
      const dpr = Math.min((typeof devicePixelRatio === 'number' ? devicePixelRatio : 1), 2);
      const r = el.getBoundingClientRect();
      LW = Math.max(1, r.width); LH = Math.max(1, r.height);
      cv.width = Math.round(LW * dpr);
      cv.height = Math.round(LH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function frame(ts) {
      if (disposed) return;
      if (!t0) t0 = ts;
      paint(ctx, ls, { w: LW, h: LH, reveal: 1, t: (ts - t0) / 90 });
      raf = requestAnimationFrame(frame);
    }
    function set(rev) {
      revealed = !!rev;
      el.dataset.moireReveal = revealed ? '1' : '0';
      if (lg) lg.hidden = !revealed;
      if (raf) { cancelAnimationFrame(raf); raf = 0; t0 = 0; }
      if (!ctx) return;
      size();
      if (revealed && !reduced) raf = requestAnimationFrame(frame);
      else paint(ctx, ls, { w: LW, h: LH, reveal: revealed ? 1 : 0, t: 0 });
    }
    const onEnter = () => set(true), onLeave = () => set(false);
    const onTap = (e) => { if (e.pointerType === 'touch') set(!revealed); };
    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointerleave', onLeave);
    el.addEventListener('focus', onEnter, true);
    el.addEventListener('blur', onLeave, true);
    el.addEventListener('pointerdown', onTap);
    set(false);
    return Object.freeze({
      update(next) { ls = next || []; if (lg) lg.textContent = legend(ls).join('  \u2502  '); set(revealed); },
      reveal() { set(true); }, release() { set(false); },
      destroy() {
        disposed = true; if (raf) cancelAnimationFrame(raf);
        el.removeEventListener('pointerenter', onEnter);
        el.removeEventListener('pointerleave', onLeave);
        el.removeEventListener('focus', onEnter, true);
        el.removeEventListener('blur', onLeave, true);
        el.removeEventListener('pointerdown', onTap);
        if (cv && cv.parentNode) cv.parentNode.removeChild(cv);
        if (lg && lg.parentNode) lg.parentNode.removeChild(lg);
        delete el.dataset.moireReveal;
        el.classList.remove(o.cls || 'moire-ambient');
      },
    });
  }

  return Object.freeze({ version: '0.1', fromState, css, paint, mount, legend, classSlot, QUIET_CAP, REVEAL_FLOOR, BASE_PITCH });
});
