/* ─────────────────────────────────────────────────────────────────────────
   pov/brush.js — the stroke instrument (the borrowed hand, in the room)

   DONOR (absorb, do not re-invent): /20261018-borrowed-hand/ — Google
   Magenta "Paint With Music" (Arts & Culture Lab × Magenta DDSP) mechanism,
   hand-rolled WebAudio, commit f9033a8b on art/borrowed-hand-20261018.
   The mapping is sourced from The Sonification Handbook, not invented:

     velocity → pitch & brightness   (fast = higher, brighter)
     width    → loudness             (the pressure axis of the brush)
     height   → tone                 (filter cutoff)
     position → place in space       (stereo pan)

   HOUSE LAWS: quiet by default (master gain 0 until the operator turns the
   sound on) · deterministic (no Math.random, no clocks in the mapping) ·
   measured, not seeded (the drawn marks ARE the gesture record replayed —
   record field `gesture.trace`).

   Two halves: PURE (mapping + record — runs in node, selftested) and AUDIO
   (WebAudio — browser only). The pure half never touches the DOM.
   ───────────────────────────────────────────────────────────────────────── */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.PovBrush = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /* ── PURE ───────────────────────────────────────────────────────────── */

  // velocity-driven brush: slow = wide & wet, fast = dry & thin (donor verbatim)
  function brushWidth(x, y, prev, dt) {
    if (!prev) return { w: 12, a: 0.72 };
    var d = Math.sqrt(Math.pow(x - prev.x, 2) + Math.pow(y - prev.y, 2));
    var v = dt > 0 ? d / dt : 0;
    return {
      w: Math.max(1.1, 15.5 - v * 3.4),
      a: Math.max(0.16, 0.80 - v * 0.10)
    };
  }

  // one measured sample -> its sound parameters (deterministic)
  function tone(x, y, w, v, dims) {
    var W = dims && dims.w ? dims.w : 1, H = dims && dims.h ? dims.h : 1;
    var nv = Math.min(1, v / 5);
    return {
      freq: 180 + Math.pow(nv, 0.7) * 1220,       // velocity -> pitch
      bright: nv > 0.55 ? 'triangle' : 'sine',     // velocity -> brightness
      amp: Math.min(0.5, 0.12 + w / 26),           // width -> loudness
      cutoff: 600 + (1 - y / H) * 2600,            // height -> tone
      pan: (x / W) * 1.6 - 0.8                     // position -> place
    };
  }

  // gesture record: every drawn mark on the floor is THIS replayed
  function record(points) {
    return {
      field: 'gesture.trace',
      n: points.length,
      span: points.length ? Math.round(points[points.length - 1].t - points[0].t) : 0,
      pts: points.map(function (p) {
        return [Math.round(p.x), Math.round(p.y), Math.round(p.t), Math.round(p.v * 100) / 100];
      })
    };
  }

  /* ── AUDIO (browser only; hand-rolled, no CDN) ──────────────────────── */

  function makeAudio() {
    return {
      ctx: null, master: null, panner: null, filter: null, on: false, last: 0,
      init: function () {
        if (this.ctx) return;
        var AC = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
        if (!AC) return;
        this.ctx = new AC();
        this.filter = this.ctx.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.value = 1200;
        this.filter.Q.value = 3;
        this.panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
        this.master = this.ctx.createGain();
        this.master.gain.value = 0;                       // quiet by default (P3)
        this.filter.connect(this.panner || this.master);
        if (this.panner) this.panner.connect(this.master);
        this.master.connect(this.ctx.destination);
      },
      toggle: async function () {
        this.init();
        if (!this.ctx) return false;
        // autoplay policy (donor lesson, f9033a8b): resume() is async and the
        // gain automation stays frozen at 0 unless we re-assert AFTER it
        // resolves. Synthetic input cannot unlock the context — a real
        // trusted click must drive this call.
        if (this.ctx.state !== 'running') {
          try { await this.ctx.resume(); } catch (e) {}
        }
        this.on = !this.on;
        var target = this.on ? 0.18 : 0;
        var t = this.ctx.currentTime;
        this.master.gain.cancelScheduledValues(t);
        this.master.gain.setValueAtTime(this.master.gain.value, t);
        this.master.gain.linearRampToValueAtTime(target, t + 0.06);
        return this.on;
      },
      pluck: function (x, y, w, v, dims) {
        if (!this.on || !this.ctx) return null;
        var t = this.ctx.currentTime;
        if (t - this.last < 0.020) return null;           // brush meeting paper
        this.last = t;
        var p = tone(x, y, w, v, dims);
        var osc = this.ctx.createOscillator();
        osc.type = p.bright;
        osc.frequency.value = p.freq;
        var g = this.ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(p.amp, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 0.22);
        this.filter.frequency.setTargetAtTime(p.cutoff, t, 0.04);
        if (this.panner) this.panner.pan.setTargetAtTime(p.pan, t, 0.03);
        osc.connect(g);
        g.connect(this.filter);
        osc.start(t);
        osc.stop(t + 0.26);
        return p;
      }
    };
  }

  return {
    brushWidth: brushWidth,
    tone: tone,
    record: record,
    makeAudio: makeAudio
  };
});
