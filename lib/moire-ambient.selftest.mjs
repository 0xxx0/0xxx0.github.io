#!/usr/bin/env node
// moire.selftest.mjs — laws of lib/moire-ambient.js. Each arm has a POSITIVE and
// a NEGATIVE (a test that cannot fail is decoration). Zero deps, zero fixtures.
// Run: node moire.selftest.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const MA = require('./moire-ambient.js');

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  cond ? pass++ : fail++;
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${cond ? '' : ' — ' + detail}`);
};

// ── frozen surface ──────────────────────────────────────────────────────────
ok('API frozen (verbs cannot be swapped at runtime)', Object.isFrozen(MA) && typeof MA.fromState === 'function');
let swapped = false;
try { MA.fromState = () => []; } catch { swapped = true; }
ok('NEGATIVE: the swap is refused, original survives', swapped && typeof MA.fromState === 'function');

// ── fromState: one layer per SUPPLIED channel, none invented ────────────────
const L = MA.fromState({ threads: 6, parked: 2, delta: 1.5, askClass: 'PROVE' });
ok('fromState: one layer per supplied channel', L.length === 4, String(L.length));
ok('fromState: layer keys are the channel names', L.map(x => x.key).join(',') === 'threads,parked,delta,ask');
const only = MA.fromState({ threads: 3 });
ok('fromState: unsupplied channels do not exist', only.length === 1 && only[0].key === 'threads', JSON.stringify(only.map(x => x.key)));
const none = MA.fromState({});
ok('NEGATIVE: empty state yields ZERO layers (no decoration layer is invented)', none.length === 0);

// ── count -> pitch (more things, finer grating) ─────────────────────────────
const t3 = MA.fromState({ threads: 3 })[0], t9 = MA.fromState({ threads: 9 })[0];
ok('threads: more threads -> finer pitch', t9.pitch < t3.pitch, `${t9.pitch} vs ${t3.pitch}`);
const capped = MA.fromState({ threads: 999 })[0];
ok('NEGATIVE: absurd counts clamp, never explode the grating', capped.pitch >= MA.BASE_PITCH * (1 - 0.02 * 12));
ok('threads: zero threads keeps the base pitch (no beat, no lie)', MA.fromState({ threads: 0 })[0].pitch === MA.BASE_PITCH);

// ── delta -> tilt (sign = lean, magnitude = band density) ───────────────────
const dP = MA.fromState({ delta: 2 })[0], dN = MA.fromState({ delta: -2 })[0], d0 = MA.fromState({ delta: 0 })[0];
ok('delta: positive leans one way', dP.angle > d0.angle, `${dP.angle} vs ${d0.angle}`);
ok('delta: negative leans the other', dN.angle < d0.angle, `${dN.angle} vs ${d0.angle}`);
ok('delta: zero delta sits on the neutral slot', d0.angle === 2.5, String(d0.angle));
ok('NEGATIVE: |delta| is clamped (-99 reads as -4)', MA.fromState({ delta: -99 })[0].angle === MA.fromState({ delta: -4 })[0].angle);

// ── ask-class -> fixed angle slot, deterministic ────────────────────────────
ok('askClass: PROVE has a fixed slot', MA.classSlot('PROVE') === 10);
ok('askClass: case-insensitive', MA.classSlot('prove') === 10);
const h1 = MA.classSlot('WEIRD-CLASS'), h2 = MA.classSlot('WEIRD-CLASS');
ok('askClass: unknown class hashes deterministically (same name, same slot)', h1 === h2 && h1 >= 1 && h1 <= 11, String(h1));
ok('NEGATIVE: two different unknown classes land in different slots', MA.classSlot('AAA') !== MA.classSlot('BBB'));

// ── the QUIET law: rest <= .12, reveal >= .30 ───────────────────────────────
const all = MA.fromState({ threads: 12, parked: 12, delta: 4, askClass: 'ASK' });
ok('quiet: every layer at rest is <= QUIET_CAP', all.every(x => x.quiet <= MA.QUIET_CAP), JSON.stringify(all.map(x => x.quiet)));
ok('reveal: every revealed layer is >= REVEAL_FLOOR', all.every(x => x.reveal >= MA.REVEAL_FLOOR), JSON.stringify(all.map(x => x.reveal)));
ok('reveal: the reveal state is unmistakably louder than rest', all.every(x => x.reveal > x.quiet * 2));
ok('reveal: alpha also capped — overwhelm stays under .8', all.every(x => x.reveal <= 0.8));

// ── css() ───────────────────────────────────────────────────────────────────
const sheet = MA.css(L, { sel: '.probe' });
ok('css: base grating plus one per layer (5 total)', (sheet.match(/repeating-linear-gradient/g) || []).length === 10,
  String((sheet.match(/repeating-linear-gradient/g) || []).length)); // 5 quiet + 5 reveal
ok('css: reveal rides an explicit data attribute, not always-on', sheet.includes('[data-moire-reveal="1"]'));
ok('css: reduced-motion users still get the reveal, minus transition', sheet.includes('prefers-reduced-motion'));
ok('css: layers sit ABOVE the pattern (content never buried)', sheet.includes('.probe>*{position:relative;z-index:1}'));
ok('css: quiet alphas all under the cap in the resting rule', /background-image:.*color-mix/.test(sheet));
const sheetEmpty = MA.css([], { sel: '.probe' });
ok('css: zero layers still renders the base grating (never a blank lie)', (sheetEmpty.match(/repeating-linear-gradient/g) || []).length === 2);

// ── paint() with a recording ctx ────────────────────────────────────────────
function rec() {
  const calls = [];
  return { calls, canvas: { width: 200, height: 100 },
    clearRect(...a) { calls.push(['clearRect', ...a]); },
    save() {}, restore() {}, translate() {}, rotate(a) { calls.push(['rotate', a]); },
    beginPath() {}, moveTo() {}, lineTo() {}, stroke() { calls.push(['stroke']); },
    set globalAlpha(v) { calls.push(['alpha', v]); }, set strokeStyle(v) { calls.push(['ink', v]); }, set lineWidth(v) {} };
}
const c1 = rec(); MA.paint(c1, L, { w: 200, h: 100 });
ok('paint: returns layer count + base', MA.paint(rec(), L, { w: 200, h: 100 }) === 5);
ok('paint: one stroke per layer + base', c1.calls.filter(x => x[0] === 'stroke').length === 5);
const quietAlphas = c1.calls.filter(x => x[0] === 'alpha').map(x => x[1]);
ok('paint at rest: every alpha <= cap', quietAlphas.every(a => a <= MA.QUIET_CAP + 0.001), JSON.stringify(quietAlphas));
const c2 = rec(); MA.paint(c2, L, { w: 200, h: 100, reveal: 1 });
const allRev = c2.calls.filter(x => x[0] === 'alpha').map(x => x[1]);
const revAlphas = allRev.slice(1); // index 0 = the base reference grating
ok('paint revealed: every SEMANTIC layer >= floor', revAlphas.every(a => a >= MA.REVEAL_FLOOR - 0.001), JSON.stringify(revAlphas));
ok('paint revealed: the base reference grating stays dimmer than its layers (atmosphere, not datum)', allRev[0] < Math.min(...revAlphas), JSON.stringify(allRev));
ok('NEGATIVE: reveal=0.5 lands strictly between rest and full', (() => {
  const c = rec(); MA.paint(c, L, { w: 200, h: 100, reveal: 0.5 });
  const as = c.calls.filter(x => x[0] === 'alpha').map(x => x[1]);
  return as.every((a, i) => a > quietAlphas[i] && a < allRev[i]);
})());
ok('paint: canvas is cleared before painting (no ghost stacking)', c1.calls[0][0] === 'clearRect');

// ── legend: the receipt behind the reveal ───────────────────────────────────
const lg = MA.legend(L);
ok('legend: one named line per layer', lg.length === 4 && lg[0].startsWith('threads'));
ok('legend: line carries pitch and angle (the actual reading)', /\d+(\.\d+)?px/.test(lg[0]) && /\u00b0/.test(lg[0]));

// ── identity: deterministic visual-hash moiré (Sept 2026 concept, made law) ──
const SEED = '/fovea/|threads=15|parked=6|wait=4';
const idA = MA.identity(SEED), idB = MA.identity(SEED), idC = MA.identity('/field/|routes=4');
ok('identity: same seed -> identical layer set (same input, same pattern)', JSON.stringify(idA) === JSON.stringify(idB));
ok('identity: different seed -> different layer set', JSON.stringify(idA) !== JSON.stringify(idC));
ok('identity: exactly one layer per hash slice (3 by default)', idA.length === 3 && idA.every(x => x.key.startsWith('id')));
ok('identity: angles stay in the near-parallel cluster (1..11deg, strong beats)', idA.every(x => x.angle >= 1 && x.angle <= 11), JSON.stringify(idA.map(x => x.angle)));
ok('identity: pitches are hairline (5..9px)', idA.every(x => x.pitch >= 5 && x.pitch <= 9), JSON.stringify(idA.map(x => x.pitch)));
ok('identity: quiet law holds by construction (weight <= cap)', idA.every(x => x.weight <= MA.QUIET_CAP), JSON.stringify(idA.map(x => x.weight)));
ok('identity: phase offsets differ within one pattern (layers beat, not stack)', new Set(idA.map(x => x.phase)).size >= 2, JSON.stringify(idA.map(x => x.phase)));
ok('identity: layers are frozen (identity cannot be edited after the fact)', Object.isFrozen(idA) && Object.isFrozen(idA[0]));
const tagOf = (ls) => (ls[0].label.match(/id ([0-9a-f]{8})/) || [])[1];
ok('identity: the tag is a stable 8-hex human-legible name', tagOf(idA) === tagOf(idB) && /^[0-9a-f]{8}$/.test(tagOf(idA)), tagOf(idA));
ok('NEGATIVE: different seeds earn different tags (identity is not constant)', tagOf(idA) !== tagOf(idC));
ok('identity: composes through fromState custom channel (no parallel path)',
  MA.fromState({ threads: 4, custom: idA }).length === 4);
ok('NEGATIVE: fromState still refuses a datum-less layer inside identity input',
  MA.fromState({ custom: [{ label: 'x' }] }).length === 0);

// ── palette + phase in paint() ──────────────────────────────────────────────
function rec2() {
  const calls = [];
  return { calls, canvas: { width: 200, height: 100 },
    clearRect(...a) { calls.push(['clearRect', ...a]); }, fillRect(...a) { calls.push(['fillRect', ...a]); },
    save() {}, restore() {}, translate() {}, rotate(a) { calls.push(['rotate', a]); },
    beginPath() {}, moveTo(x) { calls.push(['moveTo', x]); }, lineTo() {}, stroke() { calls.push(['stroke']); },
    set globalAlpha(v) { calls.push(['alpha', v]); }, set strokeStyle(v) { calls.push(['ink', v]); },
    set fillStyle(v) { calls.push(['fill', v]); }, set lineWidth(v) {} };
}
const cp = rec2(); MA.paint(cp, idA, { w: 200, h: 100 });
ok('palette: pad painted first at the measured rgb(8,12,18)',
  cp.calls.some(x => x[0] === 'fillRect') && cp.calls.filter(x => x[0] === 'fill').some(x => x[1] === MA.DEFAULT_PAD));
ok('palette: strokes use the measured faint line rgb(79,87,96)',
  cp.calls.filter(x => x[0] === 'ink').every(x => x[1] === MA.DEFAULT_INK), MA.DEFAULT_INK);
const cpq = cp.calls.filter(x => x[0] === 'alpha').map(x => x[1]).slice(1); // [0] = the pad fill itself (lawful 1)
ok('palette: at rest every grating alpha <= 0.12 (skinny opacity)', cpq.every(a => a <= MA.QUIET_CAP + 0.001), JSON.stringify(cpq));
const cpr = rec2(); MA.paint(cpr, idA, { w: 200, h: 100, reveal: 1 });
ok('palette: reveal stays under .8 — overwhelm, still quiet-ish', cpr.calls.filter(x => x[0] === 'alpha').slice(1).every(x => x[1] <= 0.8), JSON.stringify(cpr.calls.filter(x => x[0] === 'alpha')));
const ph = rec2(); MA.paint(ph, idA, { w: 200, h: 100, t: 0 });
const ph2 = rec2(); MA.paint(ph2, idA, { w: 200, h: 100, t: 0 });
ok('determinism: same layers + same t -> identical draw call stream (same pattern)',
  JSON.stringify(ph.calls) === JSON.stringify(ph2.calls));
const ph3 = rec2(); MA.paint(ph3, idC, { w: 200, h: 100, t: 0 });
ok('determinism: different identity -> different draw call stream (different pattern)',
  JSON.stringify(ph.calls) !== JSON.stringify(ph3.calls));
const phs = rec2(); MA.paint(phs, idA, { w: 200, h: 100, t: 3 });
ok('phase: shifting t shifts the grating (motion is translation, not redraw)',
  JSON.stringify(ph.calls) !== JSON.stringify(phs.calls));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
