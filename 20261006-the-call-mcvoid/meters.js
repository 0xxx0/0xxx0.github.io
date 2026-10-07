/* meters.js — THE CALL (mother page) · the Reigns-form drift body (2026-10-07)
 * ================================================================
 * Donor: Reigns (Nerial, 2016) — four kingdom meters that carry the run.
 * Rehomed per ENSOUL-SPEC §2-3 (INDIE-SWEEP synthesis #1 · INDIE-DONORS H1 ·
 * INDIE-GAMES-MAP entry 1, donor ladder #1). The ethics swap is the art:
 * steal the body, never the death. No meter ends a run. No meter grades a person.
 *
 * Ported from the meter-build reference (20261007-the-call) onto the REAL
 * mother page 20261006-the-call-mcvoid: 72 cards / 216 calls across the inline
 * FLOOR deck plus deck-crew / deck-euphemism / deck-onboarding / deck-apac.
 * SPEC is identical to the reference build — same four meters, same bounds.
 *
 * THE FOUR METERS (start 50 each, bounds 0-100, clamp at both ends)
 *   exposure     50 · 0-100   cover held — how much of the week is on record
 *   relationship 50 · 0-100   trust in the room
 *   budget       50 · 0-100   money and hours left
 *   momentum     50 · 0-100   pace — whether things are moving
 *
 * LAWS
 *   1. MERCY (non-negotiable): a meter at either end is where the run spent,
 *      not a verdict on the person. Values clamp; nothing dies; nothing is
 *      called wrong here. Cost is shown, shame is not.
 *   2. TRANSPARENCY (the swap): meters move only at each reveal, as one signed
 *      line — the price tag, never the score. No bars, no gauges, no live
 *      scoreboard during play (ENSOUL §6 non-goals). The ending reads the body
 *      as a second axis beside the failure mode.
 *   3. TRANSCRIPTION: each call carries its own m:{...} delta transcribed from
 *      its own Costs/Buys verdict prose (FLOOR inline in index.html +
 *      deck-crew.js, deck-euphemism.js, deck-onboarding.js, deck-apac.js).
 *      Per-call |delta| <= 15.
 *
 * Load modes (house law: one implementation, two loads — lib/micro.js pattern):
 *   classic page  : <script src="meters.js"></script>  → window.CALL_METERS
 *   node selftest : require/import this file directly
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CALL_METERS = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SPEC = {
    keys: ['exposure', 'relationship', 'budget', 'momentum'],
    start: 50,
    min: 0,
    max: 100,
    stepCap: 15,
    label: { exposure: 'EXPOSURE', relationship: 'RELATIONSHIP', budget: 'BUDGET', momentum: 'MOMENTUM' }
  };
  var SEP = ' \u00b7 ';   /* ' · ' — the page's own separator */
  var MINUS = '\u2212';   /* true minus, not a hyphen */

  function init() {
    var s = {};
    SPEC.keys.forEach(function (k) { s[k] = SPEC.start; });
    return s;
  }

  function clamp(v) { return Math.max(SPEC.min, Math.min(SPEC.max, v)); }

  /* one call's step: declared delta -> applied delta -> clamped next state.
   * Returns {state, applied, clipped}. `applied` is what the strip shows — the
   * truth of what moved, not what was asked for. A clipped call is not a
   * failure; the meter simply had less room than the call had to spend. */
  function step(state, delta) {
    var next = {}, applied = {}, clipped = {};
    SPEC.keys.forEach(function (k) {
      var d = (delta && typeof delta[k] === 'number' && isFinite(delta[k])) ? Math.trunc(delta[k]) : 0;
      if (d > SPEC.stepCap) d = SPEC.stepCap;
      if (d < -SPEC.stepCap) d = -SPEC.stepCap;
      var before = (state && typeof state[k] === 'number' && isFinite(state[k])) ? state[k] : SPEC.start;
      var raw = before + d;
      var after = clamp(raw);
      next[k] = after;
      applied[k] = after - before;
      clipped[k] = (raw !== after);
    });
    return { state: next, applied: applied, clipped: clipped };
  }

  /* accumulate a whole run: list of deltas -> final state (order preserved) */
  function run(deltas) {
    var s = init(), trace = [];
    (deltas || []).forEach(function (d) {
      var r = step(s, d);
      trace.push(r.applied);
      s = r.state;
    });
    return { state: s, trace: trace };
  }

  function fmtSigned(n) {
    return (n > 0 ? '+' : n < 0 ? MINUS : '') + Math.abs(n);
  }

  /* the price tag: only meters that moved, signed, one line. '' when nothing
   * moved — a call that moves nothing says nothing. */
  function stripLine(applied) {
    var parts = [];
    SPEC.keys.forEach(function (k) {
      if (applied && applied[k]) parts.push(SPEC.label[k] + ' ' + fmtSigned(applied[k]));
    });
    return parts.join(SEP);
  }

  /* the body axis at the ending: where the run spent. Blame-free by law —
   * a low meter names a ledger, never a person. */
  function readoutLine(state) {
    var vals = SPEC.keys.map(function (k) {
      return SPEC.label[k].toLowerCase() + ' ' + state[k];
    }).join(SEP);
    var atStart = SPEC.keys.every(function (k) { return state[k] === SPEC.start; });
    if (atStart) return vals + '. Every meter sits where the week began \u2014 the run left no drift.';
    var min = Math.min.apply(null, SPEC.keys.map(function (k) { return state[k]; }));
    var low = SPEC.keys.filter(function (k) { return state[k] === min; })
      .map(function (k) { return SPEC.label[k].toLowerCase(); });
    return vals + '. The run leaked through ' + low.join(' and ') + '.';
  }

  /* deck linter (ENSOUL §4.2): every call carries deltas, keys exact, values
   * finite integers inside the per-call cap. Returns {ok, errors}. */
  function lintDeck(cards) {
    var errors = [];
    (cards || []).forEach(function (card, ci) {
      var cid = (card && (card.id || card.who)) || ('card#' + ci);
      var calls = (card && card.calls) || [];
      if (!calls.length) { errors.push(cid + ': no calls'); return; }
      calls.forEach(function (call, ki) {
        var tag = cid + '[' + (call.k || ki) + ']';
        var m = call.m;
        if (!m || typeof m !== 'object') { errors.push(tag + ': missing m:{...}'); return; }
        var got = Object.keys(m);
        var missing = SPEC.keys.filter(function (k) { return got.indexOf(k) < 0; });
        var extra = got.filter(function (k) { return SPEC.keys.indexOf(k) < 0; });
        if (missing.length) errors.push(tag + ': missing keys ' + missing.join(','));
        if (extra.length) errors.push(tag + ': unknown keys ' + extra.join(','));
        var moved = false;
        SPEC.keys.forEach(function (k) {
          var v = m[k];
          if (typeof v !== 'number' || !isFinite(v) || Math.trunc(v) !== v) {
            errors.push(tag + '.' + k + ': not a finite integer (' + v + ')');
          } else if (Math.abs(v) > SPEC.stepCap) {
            errors.push(tag + '.' + k + ': |' + v + '| over stepCap ' + SPEC.stepCap);
          } else if (v !== 0) moved = true;
        });
        if (!moved) errors.push(tag + ': all-zero delta (a call that moves nothing costs nothing)');
      });
    });
    return { ok: errors.length === 0, errors: errors };
  }

  return {
    SPEC: SPEC,
    init: init,
    clamp: clamp,
    step: step,
    run: run,
    fmtSigned: fmtSigned,
    stripLine: stripLine,
    readoutLine: readoutLine,
    lintDeck: lintDeck
  };
}));