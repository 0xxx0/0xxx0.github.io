// prove-micro.mjs — does lib/micro.js satisfy both load modes, and does every
// function match the module it was sourced from?
//
// Three independent claims are checked:
//   A. CLASSIC-SCRIPT LOAD — reaches a fresh global with no `module`/`exports`
//      present. This is the whole point: 57 pages load <script src> and cannot
//      `import`. Verified in a bare vm context, not in node's CJS wrapper.
//   B. PARITY — every function returns identical values to the module it was
//      copied from, across a spread of inputs including the edges.
//   C. NAMESPACE — one global, frozen, no accidental extra surface.
//
// Usage: node prove-micro.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createContext, runInContext } from 'node:vm';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
// Portable: resolves beside this file, so any clone or a human with a terminal
// can run `node lib/micro.selftest.mjs` unchanged. No absolute paths.
const LIB = dirname(fileURLToPath(import.meta.url));
let pass = 0, fail = 0;
const failures = [];
function check(name, cond, detail) {
  if (cond) { pass++; }
  else { fail++; failures.push(`${name}${detail ? ' — ' + detail : ''}`); }
}

// ── A. classic-script load ───────────────────────────────────────────────────
const src = readFileSync(join(LIB, 'micro.js'), 'utf8');
check('A1 no import/export syntax', !/^\s*(import|export)\s/m.test(src));

const sandbox = {};                       // no module, no exports, no require
sandbox.globalThis = sandbox;
const ctx = createContext(sandbox);
let classicErr = null;
try { runInContext(src, ctx, { filename: 'micro.js' }); } catch (e) { classicErr = e; }
check('A2 executes in a bare classic context', !classicErr, classicErr && classicErr.message);
const M = sandbox.Micro;
check('A3 defines exactly one global `Micro`', !!M);
const extraGlobals = Object.keys(sandbox).filter(k => k !== 'Micro' && k !== 'globalThis');
check('A4 leaks no other globals', extraGlobals.length === 0, 'leaked: ' + extraGlobals.join(','));
check('A5 namespace is frozen', M && Object.isFrozen(M));

// ── B. parity against the source modules ─────────────────────────────────────
// The originals are ESM; copy to .mjs so node can import them verbatim.
const scratch = process.env.SCRATCH || '/tmp';
for (const f of ['dom', 'store', 'polar-control']) {
  writeFileSync(join(scratch, `_src-${f}.mjs`), readFileSync(join(LIB, `${f}.js`)));
}
const D = await import(join(scratch, '_src-dom.mjs'));
const S = await import(join(scratch, '_src-store.mjs'));
const P = await import(join(scratch, '_src-polar-control.mjs'));

// micro.js must ALSO be loaded in THIS context for the storage tests. The vm-loaded
// `M` above deliberately closes over the sandbox's own global (correct for a classic
// script — a page's Micro must use the page's global), so it would compare against a
// global the harness never sets. Load it through CJS to get a node-context twin.
const require = createRequire(import.meta.url);
const Mn = require(join(LIB, 'micro.js'));
check('B0 CJS require yields the same surface as the classic global',
  JSON.stringify(Object.keys(Mn).sort()) === JSON.stringify(Object.keys(M).sort()));
check('B0b CJS and classic agree on esc', Mn.esc('<a&b>') === M.esc('<a&b>'));

// esc — the heaviest-used function; include the quote typo case it was corrected for
const ESC_IN = ['', null, undefined, 0, false, 'plain', 'a&b', '<script>', 'x">y', "it's",
  '&<>\'"', 'already &amp;', 'ünïcøde ✓', '<img src=x onerror=alert(1)>', 'a'.repeat(500)];
check('B1 esc parity', JSON.stringify(ESC_IN.map(M.esc)) === JSON.stringify(ESC_IN.map(D.esc)));
check('B1b esc escapes the quote as &quot; with semicolon',
  M.esc('"') === '&quot;' && D.esc('"') === '&quot;');

// fmtClock / fmtMark — including non-finite and negative edges
const T_IN = [0, 1, 59.9, 60, 83.4, 83.42, 599.94, 3600, -1, -83.4, NaN, Infinity, -Infinity, undefined];
check('B2 fmtClock parity', JSON.stringify(T_IN.map(M.fmtClock)) === JSON.stringify(T_IN.map(D.fmtClock)));
check('B3 fmtMark parity', JSON.stringify(T_IN.map(M.fmtMark)) === JSON.stringify(T_IN.map(D.fmtMark)));

// polar-control numeric core
const N = [-7, -1.5, -0.0001, 0, 0.0001, 0.25, 1.5, 7, 12, 1e9];
let clampOK = true, wrapOK = true;
for (const v of N) for (const a of [-5, 0, 2]) for (const b of [a, a + 3, 9])
  if (M.clamp(v, a, b) !== P.clamp(v, a, b)) clampOK = false;
check('B4 clamp parity', clampOK);
for (const v of N) for (const n of [1, 12, 64]) if (M.wrap(v, n) !== P.wrap(v, n)) wrapOK = false;
check('B5 wrap parity', wrapOK);
let cdOK = true;
for (const a of N) for (const b of N) for (const n of [1, 12])
  if (M.circularDelta(a, b, n) !== P.circularDelta(a, b, n)) cdOK = false;
check('B6 circularDelta parity', cdOK);
let paOK = true;
for (const [x, y] of [[0, 0], [1, 0], [0, 1], [-1, 0], [3, 4], [-3, -4]])
  if (M.pointAngle01(x, y, 0, 0) !== P.pointAngle01(x, y, 0, 0)) paOK = false;
check('B7 pointAngle01 parity', paOK);
let psOK = true;
for (const count of [1, 8, 12, 64]) for (const [x, y] of [[1, 0], [0, 1], [-1, 0]])
  if (JSON.stringify(M.pointSlot(x, y, 0, 0, count)) !== JSON.stringify(P.pointSlot(x, y, 0, 0, count)))
    psOK = false;
check('B8 pointSlot parity', psOK);

// PolarDetent — a class with state; drive both through the same script
function drive(C) {
  const d = new C({ count: 12, snap: 16, drag: 0.045 });
  const out = [d.value, d.index()];
  d.impulse(0.3, 0.016); out.push(d.value, d.velocity);
  for (let i = 0; i < 12; i++) out.push(d.update(0.016));
  out.push(d.detent(1), d.index());
  for (let i = 0; i < 40; i++) out.push(d.update(0.016));
  out.push(d.goto(7), d.index());
  for (let i = 0; i < 40; i++) out.push(d.update(0.016));
  out.push(d.set(0.5), d.snap(), d.index());
  for (let i = 0; i < 40; i++) out.push(d.update(0.016));
  return JSON.stringify(out);
}
check('B9 PolarDetent parity (full state trajectory)', drive(M.PolarDetent) === drive(P.PolarDetent));

// store — parity against the real module, with a stub storage
function fakeStorage(seed = {}) {
  const m = new Map(Object.entries(seed));
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v),
           removeItem: k => m.delete(k), _m: m };
}
function driveStore(kvFn, storage) {
  globalThis.localStorage = storage;
  const out = [];
  const s = kvFn('k', 'FB');
  out.push(JSON.stringify(s.get())); s.set({ a: 1 }); out.push(JSON.stringify(s.get()));
  out.push(JSON.stringify(s.set('str'))); out.push(JSON.stringify(s.get()));
  s.del(); out.push(JSON.stringify(s.get()));
  return out.join('|');
}
const cases = [{}, { k: 'null' }, { k: 'not json' }, { k: '{"z":9}' }, { k: '0' }, { k: 'false' }];
let storeOK = true, storeDetail = '';
for (const seed of cases) {
  const a = driveStore(Mn.kv, fakeStorage(seed));
  const b = driveStore(S.kv, fakeStorage(seed));
  if (a !== b) { storeOK = false; storeDetail = JSON.stringify(seed) + ': ' + a + ' vs ' + b; }
}
check('B10 kv parity across missing/corrupt/null/number seeds', storeOK, storeDetail);
const noStorage = undefined;
globalThis.localStorage = noStorage;
check('B11 kv tolerates absent storage',
  JSON.stringify(Mn.kv('k', 'FB').get()) === JSON.stringify(S.kv('k', 'FB').get()));

// ── C. namespace surface ─────────────────────────────────────────────────────
const EXPECTED = ['version', 'esc', 'toast', '$', '$$', 'fmtClock', 'fmtMark', 'download',
  'kv', 'skv', 'TAU', 'clamp', 'wrap', 'circularDelta', 'pointAngle01', 'pointSlot', 'PolarDetent'];
const got = Object.keys(M).sort();
check('C1 surface is exactly the documented set',
  JSON.stringify(got) === JSON.stringify([...EXPECTED].sort()),
  'missing: ' + EXPECTED.filter(k => !got.includes(k)).join(',') +
  ' | extra: ' + got.filter(k => !EXPECTED.includes(k)).join(','));

// ── report ───────────────────────────────────────────────────────────────────
console.log(`\n  lib/micro.js — dual-mode proof`);
console.log(`  ${pass} passed, ${fail} failed\n`);
if (fail) { failures.forEach(f => console.log('   FAIL ' + f)); console.log(''); }
console.log(`  source: ${LIB}/micro.js (${src.length} bytes)`);
process.exit(fail ? 1 : 0);
