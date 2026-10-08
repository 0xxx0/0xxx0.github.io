// lib/fieldtypes.selftest.mjs — does lib/fieldtypes.js hold its CONTRACT and
// its LAWS, and does it load every way the repo loads a microlib file?
//
// Mirrors lib/micro.selftest.mjs: one file, no framework, node lib/fieldtypes.selftest.mjs.
//
// Claims checked:
//   A. CLASSIC-SCRIPT LOAD — the same bare-vm proof micro uses: no import/export
//      syntax, executes with no `module`/`exports` present, defines exactly one
//      global `FieldTypes`, frozen, leaks nothing — plus a verdict parity spot
//      check against the CJS copy (two realms, one behaviour).
//   B. COMBINATORS — every one of str/num/bool/enum/arrayOf/objectOf/record/
//      oneOf/optional/withDefault/refine accepts its own kind and rejects the
//      other kinds with a {path, message} at the right path.
//   C. ERROR PATHS — multi-error collection, nested paths ($.routes[3].href),
//      missing required, exact-mode extras, oneOf zero- and over-match,
//      refine ordering, circular values stop (shared references do not), and a
//      malformed SCHEMA throws (developer bug) while a malformed value never does.
//   D. VALUE CHANNEL — parse() substitutes withDefault, keeps optional
//      undefined, never mutates the input, and reports byte-identical errors
//      to check().
//   E. LAWS — seeded PRNG determinism, the three generators' ranges, the
//      invariant runner (pass / false / throw / check-verdict), a suite of
//      quick property tests, and the NEGATIVE CONTROLS: two planted bugs the
//      property runner MUST find (and its fixed twins it must NOT flag).
//   F. REPO ROUND-TRIP — a slice of the real showcase-manifest.json (route
//      shape: href/title/kind/parent/state/operation/role/index) validates
//      every route, survives JSON serialization, and fails at the exact paths
//      when a clone is mutated.
//   G. LOAD MODES — CJS require, dynamic ESM `import()` default (identity with
//      the CJS exports), and the source parsed as a real ES module (the
//      side-effect-import path a browser module page uses).
//
// Usage: node lib/fieldtypes.selftest.mjs

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createContext, runInContext } from 'node:vm';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

// Portable: resolves beside this file, so any clone or a human with a terminal
// can run `node lib/fieldtypes.selftest.mjs` unchanged. No absolute paths.
const LIB = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(LIB, 'fieldtypes.js'), 'utf8');
const require = createRequire(import.meta.url);

let pass = 0, fail = 0;
const failures = [];
function check(name, cond, detail) {
  if (cond) { pass++; }
  else { fail++; failures.push(`${name}${detail ? ' — ' + detail : ''}`); }
}
/** Run fn, return the caught error (cross-realm safe: assert on name/message). */
function boom(fn) { try { fn(); return null; } catch (e) { return e; } }

// ── A. classic-script load ───────────────────────────────────────────────────
check('A1 no import/export syntax', !/^\s*(import|export)\s/m.test(src));
const sandbox = {};                       // no module, no exports, no require
sandbox.globalThis = sandbox;
const ctx = createContext(sandbox);
let classicErr = null;
try { runInContext(src, ctx, { filename: 'fieldtypes.js' }); } catch (e) { classicErr = e; }
check('A2 executes in a bare classic context', !classicErr, classicErr && classicErr.message);
const M = sandbox.FieldTypes;
check('A3 defines exactly one global `FieldTypes`', !!M);
const extraGlobals = Object.keys(sandbox).filter(k => k !== 'FieldTypes' && k !== 'globalThis');
check('A4 leaks no other globals', extraGlobals.length === 0, 'leaked: ' + extraGlobals.join(','));
check('A5 namespace is frozen', M && Object.isFrozen(M));
check('A6 version is 0.1', M && M.version === '0.1', M && M.version);

const EXPECTED = ['version', 'str', 'num', 'bool', 'enum', 'arrayOf', 'objectOf', 'record',
  'oneOf', 'optional', 'withDefault', 'refine', 'check', 'parse', 'assert',
  'prng', 'genInt', 'genPick', 'genArray', 'invariant', 'property'].sort();
const FT = require(join(LIB, 'fieldtypes.js'));          // host-realm copy: everything below runs against this
check('A7 CJS surface is exactly the documented set',
  JSON.stringify(Object.keys(FT).sort()) === JSON.stringify(EXPECTED),
  'missing: ' + EXPECTED.filter(k => !(k in FT)).join(',') +
  ' | extra: ' + Object.keys(FT).filter(k => !EXPECTED.includes(k)).join(','));
check('A8 classic and CJS agree on a real verdict (two realms, one behaviour)',
  JSON.stringify(M.check({}, M.objectOf({ a: M.str() }))) ===
  JSON.stringify(FT.check({}, FT.objectOf({ a: FT.str() }))));

// ── B. combinators: accept their own kind, reject the others ────────────────
const { str, num, bool, arrayOf, objectOf, record, oneOf, optional, withDefault, refine,
        check: ck, parse, assert, prng, genInt, genPick, genArray, invariant, property } = FT;
const enumOf = FT.enum;                                  // `enum` is a reserved word as a binding

// str / num / bool
check('B1 str accepts strings', ck('x', str()).ok && ck('', str()).ok);
check('B2 str rejects numbers with path + message',
  JSON.stringify(ck(1, str()).errors[0]) === JSON.stringify({ path: '$', message: 'expected a string, got number' }),
  JSON.stringify(ck(1, str()).errors[0]));
check('B3 str rejects null / boolean distinctly',
  ck(null, str()).errors[0].message === 'expected a string, got null' &&
  ck(true, str()).errors[0].message === 'expected a string, got boolean');
check('B4 num accepts finite numbers', ck(0, num()).ok && ck(-1.5, num()).ok);
check('B5 num rejects NaN / Infinity / numeric strings',
  ck(NaN, num()).errors[0].message === 'expected a finite number, got NaN' &&
  ck(Infinity, num()).errors[0].message === 'expected a finite number, got Infinity' &&
  ck('1', num()).errors[0].message === 'expected a finite number, got string');
check('B6 bool accepts true/false, rejects 0 and "false"',
  ck(true, bool()).ok && ck(false, bool()).ok &&
  !ck(0, bool()).ok && !ck('false', bool()).ok);
check('B7 bool message names the intruder',
  ck(0, bool()).errors[0].message === 'expected a boolean, got number');

// enum
const state = enumOf('ACTIVE', 'DONOR');
check('B8 enum accepts members', ck('ACTIVE', state).ok && ck('DONOR', state).ok);
check('B9 enum rejects non-members with the member list',
  ck('PARKED', state).errors[0].message === 'expected one of ["ACTIVE", "DONOR"], got "PARKED"',
  JSON.stringify(ck('PARKED', state).errors[0]));
check('B10 enum doubles as a literal (one value = const)', ck(null, enumOf(null)).ok && !ck(undefined, enumOf(null)).ok);
check('B11 enum() with no values throws', (() => { const e = boom(() => enumOf()); return e && e.name === 'TypeError'; })());

// arrayOf
check('B12 arrayOf accepts arrays of items', ck(['a', 'b'], arrayOf(str())).ok && ck([], arrayOf(str())).ok);
check('B13 arrayOf rejects a non-array', ck('nope', arrayOf(str())).errors[0].message === 'expected an array, got string');
check('B14 arrayOf points at the failing element', (() => {
  const r = ck([1, 'x'], arrayOf(num()));
  return r.errors.length === 1 && r.errors[0].path === '$[1]';
})(), JSON.stringify(ck([1, 'x'], arrayOf(num())).errors));
check('B15 arrayOf nests paths', (() => {
  const r = ck([['x']], arrayOf(arrayOf(num())));
  return r.errors[0].path === '$[0][0]';
})());

// objectOf
const shape = objectOf({ a: num(), b: str(), opt: optional(str()) });
check('B16 objectOf accepts its shape', ck({ a: 1, b: 'x' }, shape).ok);
check('B17 objectOf reports the missing key at ITS path', (() => {
  const r = ck({ b: 'x' }, objectOf({ a: num(), b: str() }));
  return r.errors.length === 1 && r.errors[0].path === '$.a' && r.errors[0].message === 'missing required property';
})(), JSON.stringify(ck({ b: 'x' }, objectOf({ a: num(), b: str() })).errors));
check('B18 objectOf type failure sits on the property', ck({ a: 'no' }, objectOf({ a: num() })).errors[0].path === '$.a');
check('B19 optional property may be absent, is checked when present',
  ck({ a: 1, b: 'x' }, shape).ok && !ck({ a: 1, b: 'x', opt: 5 }, shape).ok && ck({ a: 1, b: 'x', opt: 'y' }, shape).ok);
check('B20 withDefault property may be absent too',
  ck({ a: 1 }, objectOf({ a: num(), d: withDefault(str(), 'x') })).ok);
check('B21 objectOf ignores keys it does not name (contracts check what they name)',
  ck({ a: 1, zzz: 9 }, objectOf({ a: num() })).ok);
check('B22 objectOf({exact:true}) rejects them', (() => {
  const r = ck({ a: 1, zzz: 9 }, objectOf({ a: num() }, { exact: true }));
  return r.errors.length === 1 && r.errors[0].path === '$.zzz' && r.errors[0].message === 'unexpected property';
})());
check('B23 objectOf rejects null and arrays as containers',
  ck(null, objectOf({})).errors[0].message === 'expected an object, got null' &&
  ck([1], objectOf({})).errors[0].message === 'expected an object, got array');
check('B24 refine wraps optional for presence (peeled when deciding absence)',
  ck({}, objectOf({ r: refine(optional(str()), v => true) })).ok);

// record
check('B25 record accepts an object of values', ck({ a: 1, b: 2 }, record(num())).ok);
check('B26 record checks every value at its key path', (() => {
  const r = ck({ a: 1, b: 'x' }, record(num()));
  return r.errors.length === 1 && r.errors[0].path === '$.b';
})());
check('B27 record quotes keys that need it', ck({ 'a b': 1 }, record(str())).errors[0].path === '$["a b"]');
check('B28 record rejects arrays/primitives as containers',
  ck([1], record(num())).errors[0].message === 'expected an object, got array' &&
  ck('x', record(num())).errors[0].message === 'expected an object, got string');

// oneOf
const numOrStr = oneOf(num(), str());
check('B29 oneOf accepts either branch', ck(3, numOrStr).ok && ck('x', numOrStr).ok);
check('B30 oneOf with zero matches lists the branches', (() => {
  const r = ck(true, oneOf(num(), str()));
  return r.errors.length === 1 && r.errors[0].path === '$' &&
    r.errors[0].message === 'none of 2 branches matched: [0] expected a finite number, got boolean; [1] expected a string, got boolean';
})(), JSON.stringify(ck(true, numOrStr).errors));
check('B31 oneOf demands EXACTLY one match (over-match fails)', (() => {
  const r = ck('x', oneOf(enumOf('x'), str()));
  return r.errors.length === 1 && /2 of 2 branches matched/.test(r.errors[0].message);
})(), JSON.stringify(ck('x', oneOf(enumOf('x'), str())).errors));

// optional / withDefault / refine at the value level
check('B32 optional passes only undefined through unchecked',
  ck(undefined, optional(str())).ok && ck('x', optional(str())).ok && !ck(7, optional(str())).ok);
check('B33 withDefault validates what is present', ck(5, withDefault(str(), 'd')).ok === false && ck('d', withDefault(str(), 'd')).ok);
check('B34 refine passes / fails with ITS message', (() => {
  const over5 = refine(num(), v => v > 5, 'must exceed 5');
  return ck(9, over5).ok && ck(3, over5).errors[0].message === 'must exceed 5';
})());
check('B35 refine runs only after the inner schema passed (inner error wins)',
  ck('x', refine(num(), () => { throw new Error('never reached'); })).errors[0].message === 'expected a finite number, got string');
check('B36 refine surfaces a throwing predicate', (() => {
  const r = ck(1, refine(num(), () => { throw new Error('boom'); }));
  return r.errors[0].message === 'refinement threw: boom';
})());

// ── C. error paths ───────────────────────────────────────────────────────────
check('C1 collects every error, in shape order', (() => {
  const r = ck({ a: 'x', b: 2 }, objectOf({ a: num(), b: str() }));
  return r.errors.length === 2 && r.errors.map(e => e.path).join(',') === '$.a,$.b';
})(), JSON.stringify(ck({ a: 'x', b: 2 }, objectOf({ a: num(), b: str() })).errors));
check('C2 nested paths read like addresses', (() => {
  const r = ck({ routes: [{}, { href: 5 }] }, objectOf({ routes: arrayOf(objectOf({ href: str() })) }));
  return r.errors.length === 2 &&
    r.errors[0].path === '$.routes[0].href' && r.errors[1].path === '$.routes[1].href';
})(), JSON.stringify(ck({ routes: [{}, { href: 5 }] }, objectOf({ routes: arrayOf(objectOf({ href: str() })) })).errors));
check('C3 root failures path as $', ck(7, str()).errors[0].path === '$');
{
  const cyc = { self: null }; cyc.self = cyc;
  const r = ck(cyc, record(record(str())));
  check('C4 circular values stop at "circular reference" instead of recursing',
    r.ok === false && r.errors.length === 1 && r.errors[0].path === '$.self' &&
    r.errors[0].message === 'circular reference', JSON.stringify(r.errors));
}
{
  const shared = { a: 1 };                       // shared is NOT circular — must pass
  check('C5 shared (non-circular) references are not misflagged',
    ck({ x: shared, y: shared }, objectOf({ x: record(num()), y: record(num()) })).ok);
}
check('C6 a malformed SCHEMA throws (developer bug), a malformed VALUE never does',
  (() => { const e = boom(() => ck(1, 'str')); return e && e.name === 'TypeError' && /not a schema at \$/.test(e.message); })() &&
  (() => { const e = boom(() => ck(1, { k: 'nope' })); return !!e; })() &&
  JSON.stringify(ck(undefined, str())) === JSON.stringify({ ok: false, errors: [{ path: '$', message: 'expected a string, got undefined' }] }));
check('C7 combinators reject schemas that are not schemas',
  [() => arrayOf('s'), () => oneOf(), () => enumOf(), () => refine('s', 1),
   () => objectOf('shape'), () => record(7), () => optional('s'), () => withDefault('s', 1)]
    .every(fn => { const e = boom(fn); return e && e.name === 'TypeError' && /fieldtypes:/.test(e.message); }));
check('C8 assert returns the value when it passes',
  assert({ a: 1 }, objectOf({ a: num() }), 'fixture') !== undefined);
check('C9 assert throws with the label and every path', (() => {
  const e = boom(() => assert({ a: 1 }, objectOf({ a: str(), b: num() }), 'fixture'));
  return e && /fixture: 2 contract violation\(s\)/.test(e.message) &&
    /\$\.a: expected a string, got number/.test(e.message) &&
    /\$\.b: missing required property/.test(e.message);
})());

// ── D. value channel: parse() ────────────────────────────────────────────────
check('D1 parse applies withDefault on absence',
  (() => { const r = parse(undefined, withDefault(num(), 7)); return r.ok && r.value === 7 && r.errors.length === 0; })());
check('D2 parse leaves optional absence as undefined',
  (() => { const r = parse(undefined, optional(str())); return r.ok && r.value === undefined; })());
check('D3 parse does not substitute a present-but-invalid value (it fails)',
  (() => { const r = parse(5, withDefault(str(), 'd')); return !r.ok && r.value === 5; })());
{
  const input = { b: 'x' };
  const r = parse(input, objectOf({ a: withDefault(num(), 1), b: str() }));
  check('D4 parse substitutes deep and NEVER mutates the input',
    r.ok && r.value.a === 1 && JSON.stringify(input) === JSON.stringify({ b: 'x' }),
    JSON.stringify(r));
}
{
  const dflt = { n: 1 };
  check('D5 withDefault default comes back BY REFERENCE (treat as immutable)',
    parse(undefined, withDefault(objectOf({ n: num() }), dflt)).value === dflt);
}
{
  const cases = [
    [{ a: 1 }, objectOf({ a: num(), b: str() })],
    ['x', num()],
    [true, oneOf(num(), str())],
    [[1, 'x'], arrayOf(num())],
    [{ a: 'x' }, record(num())],
    [3, refine(num(), v => v > 5, 'must exceed 5')],
    [undefined, withDefault(str(), 'd')],
  ];
  const parity = cases.every(([v, s]) =>
    JSON.stringify(ck(v, s).errors) === JSON.stringify(parse(v, s).errors));
  check('D6 check() and parse() report byte-identical errors', parity);
}
check('D7 parse passes keys it was not asked about', (() => {
  const r = parse({ a: 1, extra: [1, 2] }, objectOf({ a: num() }));
  return r.ok && JSON.stringify(r.value.extra) === '[1,2]';
})());

// ── E. laws: PRNG, generators, runners ───────────────────────────────────────
{
  const a = prng(42), b = prng(42), c = prng(7);
  const draw = r => [0, 1, 2, 3, 4].map(() => r());
  const s1 = JSON.stringify(draw(a)), s2 = JSON.stringify(draw(b)), s3 = JSON.stringify(draw(c));
  check('E1 same seed -> same stream, different seed -> different stream', s1 === s2 && s1 !== s3, s1 + ' vs ' + s3);
}
{
  const r = prng(7); let ok = true;
  for (let i = 0; i < 1000; i++) { const v = r(); if (!(v >= 0 && v < 1)) ok = false; }
  check('E2 PRNG draws stay in [0, 1)', ok);
}
{
  const g = genInt(0, 3), r = prng(1); const seen = new Set();
  for (let i = 0; i < 2000; i++) seen.add(g(r));
  check('E3 genInt covers its whole inclusive range', seen.size === 4 && [...seen].every(v => v >= 0 && v <= 3),
    [...seen].join(','));
}
check('E4 genInt refuses impossible ranges', (() => {
  const a = boom(() => genInt(5, 1)), b = boom(() => genInt(1.5, 2));
  return a && a.name === 'RangeError' && b && b.name === 'TypeError';
})());
{
  const g = genPick(['a', 'b', 'c']), r = prng(1); const seen = new Set();
  for (let i = 0; i < 500; i++) seen.add(g(r));
  check('E5 genPick hits every item and never leaves it',
    seen.size === 3 && boom(() => genPick([])) !== null, [...seen].join(','));
}
{
  const g = genArray(genInt(0, 9), 1, 4), r = prng(3); let lo = 99, hi = -1, inRange = true;
  for (let i = 0; i < 300; i++) { const arr = g(r); lo = Math.min(lo, arr.length); hi = Math.max(hi, arr.length); if (arr.some(v => v < 0 || v > 9)) inRange = false; }
  check('E6 genArray honours its length bounds and its element generator',
    lo === 1 && hi === 4 && inRange, `len ${lo}..${hi}`);
}
check('E7 invariant passes a true claim', invariant('schemas are frozen', () => Object.isFrozen(str())).ok === true);
check('E8 invariant fails a false claim', (() => {
  const r = invariant('never', () => false);
  return r.ok === false && r.failures[0].message === 'returned false' && r.runs === 1;
})());
check('E9 invariant fails a throwing claim', (() => {
  const r = invariant('throws', () => { throw new Error('kaboom'); });
  return r.ok === false && r.failures[0].message === 'threw: kaboom';
})());
check('E10 invariant takes a check() verdict directly (contract/law bridge)', (() => {
  const r = invariant('required key present', () => ck({}, objectOf({ a: str() })));
  return r.ok === false && r.failures[0].message === '$.a: missing required property';
})(), JSON.stringify(invariant('v', () => ck({}, objectOf({ a: str() })))));

// The quick property suite — one table, one loop, no framework.
const LAWS = [
  ['genInt(-5,5) stays in range', genInt(-5, 5), v => v >= -5 && v <= 5],
  ['genInt(0,0) is always 0', genInt(0, 0), v => v === 0],
  ['genPick members stay members', genPick(['a', 'b', 'c']), v => ['a', 'b', 'c'].includes(v)],
  ['genArray lengths stay in [1,4]', genArray(genInt(0, 9), 1, 4), v => v.length >= 1 && v.length <= 4],
  ['generated arrays pass arrayOf(num())', genArray(genInt(-20, 20), 0, 5), v => ck(v, arrayOf(num())).ok],
  ['generated strings pass str()', genPick(['x', '', 'ünï ✓', '<b>']), v => ck(v, str()).ok],
  ['generated states pass the enum', genPick(['ACTIVE', 'DONOR']), v => ck(v, enumOf('ACTIVE', 'DONOR')).ok],
  ['JSON round-trip is identity for JSON-safe values', genArray(genPick(['a', 'b']), 0, 4),
    v => JSON.stringify(JSON.parse(JSON.stringify(v))) === JSON.stringify(v)],
  ['parse returns the number it was given', genInt(-999, 999), v => parse(v, num()).value === v],
  ['check and parse disagree with nothing', genPick([1, 'x', null, undefined, { a: 1 }]),
    v => JSON.stringify(ck(v, str()).errors) === JSON.stringify(parse(v, str()).errors)],
  ['generated route fragments satisfy their contract',
    rnd => { const r = { href: genPick(['/desk/', '/body/'])(rnd), title: genPick(['A', 'B'])(rnd) }; if (rnd() < 0.5) r.state = 'ACTIVE'; return r; },
    v => ck(v, objectOf({ href: str(), title: str(), state: optional(str()) })).ok],
  ['refine holds on generated positives', genInt(1, 50), v => ck(v, refine(num(), v2 => v2 > 0, 'positive')).ok],
  ['objectOf never rewrites its input', genInt(0, 9), v => { const o = { a: v }; const r = parse(o, objectOf({ a: num() })); return r.value.a === v && o.a === v; }],
  ['oneOf routes a string to the string branch', genPick(['x', 'y']), v => ck(v, oneOf(num(), str())).ok],
];
check('E11 the suite carries 10-20 quick property tests', LAWS.length >= 10 && LAWS.length <= 20, 'n=' + LAWS.length);
for (const [name, gen, fn] of LAWS) {
  const r = property(name, gen, fn);
  check('E12 law holds: ' + name, r.ok && r.runs === 100,
    r.failures.length ? JSON.stringify(r.failures[0]) : 'runs=' + r.runs);
}
check('E13 property fails when the claim returns nothing (no silent greens)', (() => {
  const r = property('forgot the return', genInt(0, 9), () => {});
  return r.ok === false && /returned nothing/.test(r.failures[0].message);
})());
check('E14 property catches a throwing claim', (() => {
  const r = property('throws', genInt(0, 9), () => { throw new Error('kaboom'); });
  return r.ok === false && r.failures[0].message === 'threw: kaboom';
})());

// NEGATIVE CONTROLS — the runner must be able to FAIL, or it proves nothing.
const clampBuggy = (v, lo, hi) => Math.min(hi + 1, Math.max(lo, v));   // PLANTED: high edge off by one
const clampFixed = (v, lo, hi) => Math.min(hi, Math.max(lo, v));        // the same law, correct
const bounds = genInt(-50, 150);
{
  const planted = property('clamp result stays in [0,100] (PLANTED BUG)', bounds,
    n => clampBuggy(n, 0, 100) >= 0 && clampBuggy(n, 0, 100) <= 100);
  check('E15 NEGATIVE CONTROL: the runner FINDS the planted bug', planted.ok === false && planted.failures.length > 0,
    JSON.stringify(planted).slice(0, 200));
  const f = planted.failures[0];
  check('E16 the failure is actionable (run index, sample, message)',
    typeof f.run === 'number' && typeof f.sample === 'string' && f.sample.length > 0 &&
    typeof f.message === 'string' && f.message.length > 0 && planted.runs <= 100,
    JSON.stringify(f));
  const fixed = property('clamp result stays in [0,100] (fixed twin)', bounds,
    n => clampFixed(n, 0, 100) >= 0 && clampFixed(n, 0, 100) <= 100);
  check('E17 paired control: the fixed twin passes all 100 runs', fixed.ok === true && fixed.runs === 100,
    JSON.stringify(fixed.failures[0]));
}
{
  // Planted bug #2, through the CONTRACT half: a generator that emits a bad href.
  const gen = rnd => ({ href: genPick(['/ok/', 'bad'])(rnd) });
  const hrefSchema = objectOf({ href: refine(str(), v => v.startsWith('/'), 'href must be root-relative') });
  const r = property('generated hrefs are root-relative (PLANTED BUG)', gen, v => ck(v, hrefSchema));
  check('E18 planted validator bug surfaces the contract path + message',
    r.ok === false && /\$\.href: href must be root-relative/.test(r.failures[0].message),
    JSON.stringify(r.failures[0]));
}
{
  const mk = seed => property('reproducible', genInt(-50, 150), n => n <= 100, { seed, runs: 30, maxFailures: 3 });
  const one = mk(1), two = mk(1), three = mk(2);
  check('E19 same seed reproduces the identical run byte for byte',
    one.ok === false && JSON.stringify(one) === JSON.stringify(two), JSON.stringify(one));
  check('E19b a different seed fails with different samples',
    JSON.stringify(one) !== JSON.stringify(three), JSON.stringify(three));
}

// ── F. repo round-trip: a slice of the real showcase-manifest ────────────────
const manifest = JSON.parse(readFileSync(join(LIB, '..', 'showcase-manifest.json'), 'utf8'));
const isoish = v => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v);
const routeSchema = objectOf({
  href: refine(str(), v => v.startsWith('/'), 'href must be root-relative (/...)'),
  title: refine(str(), v => v.length > 0, 'title must not be empty'),
  kind: str(),
  parent: oneOf(str(), enumOf(null)),        // the root route carries an explicit null parent
  state: str(),
  operation: optional(str()),               // one route omits it
  role: optional(str()),
  index: objectOf({
    updated_at: refine(str(), isoish, 'updated_at must be an ISO timestamp'),
    work_modes: arrayOf(refine(str(), v => v.length > 0, 'work mode must not be empty')),
  }),
});
const manifestSlice = objectOf({
  schema: refine(str(), v => v.startsWith('showcase-manifest/'), 'manifest schema string is the version contract'),
  routes: arrayOf(routeSchema),
});
{
  const rt = ck(manifest, manifestSlice);
  check('F1 every route in showcase-manifest.json validates (' + manifest.routes.length + ' routes)',
    rt.ok, JSON.stringify(rt.errors.slice(0, 3)));
  check('F2 JSON serialization round-trip validates identically',
    ck(JSON.parse(JSON.stringify(manifest)), manifestSlice).ok);
  check('F3 assert() passes on the live manifest and returns it',
    assert(manifest, manifestSlice, 'showcase-manifest') === manifest);
  const mut = structuredClone(manifest);
  delete mut.routes[0].title;
  mut.routes[1].href = 7;
  mut.routes[2].index.updated_at = 'yesterday';
  mut.routes[3].operation = 42;
  mut.routes[4].parent = false;
  const bad = ck(mut, manifestSlice);
  const got = bad.errors.map(e => e.path).sort();
  const wantPaths = ['$.routes[0].title', '$.routes[1].href', '$.routes[2].index.updated_at',
    '$.routes[3].operation', '$.routes[4].parent'].sort();
  check('F4 five mutations produce exactly five errors at the exact paths',
    bad.errors.length === 5 && JSON.stringify(got) === JSON.stringify(wantPaths),
    JSON.stringify(bad.errors));
  check('F5 the mutated manifest fails assert with the route in the label', (() => {
    const e = boom(() => assert(mut, manifestSlice, 'showcase-manifest'));
    return e && /showcase-manifest: 5 contract violation\(s\)/.test(e.message) &&
      /\$\.routes\[0\]\.title: missing required property/.test(e.message);
  })());
}

// ── G. load modes ────────────────────────────────────────────────────────────
check('G1 CJS require and the classic global expose the same surface',
  JSON.stringify(Object.keys(FT).sort()) === JSON.stringify(Object.keys(M).sort()));
check('G2 CJS and classic agree on a failing verdict (value parity)',
  JSON.stringify(FT.check(1, FT.str())) === JSON.stringify(M.check(1, M.str())));
const imported = await import(pathToFileURL(join(LIB, 'fieldtypes.js')).href);
check('G3 dynamic ESM import() yields the CJS exports as default (identity)',
  imported.default === FT && imported.default.version === '0.1',
  Object.keys(imported).join(','));
{
  // The browser module path: a page does `import '/lib/fieldtypes.js'` — the
  // file has no import/export statements, so it parses as a module and hands
  // the page its global. Force real ESM evaluation with a .mjs copy.
  const dir = join(process.env.SCRATCH || tmpdir(), 'fieldtypes-esm-proof');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'fieldtypes.mjs'), src);
  let ns = null, esmErr = null;
  try { ns = await import(pathToFileURL(join(dir, 'fieldtypes.mjs')).href); } catch (e) { esmErr = e; }
  check('G4 source is a valid ES module that publishes the global (side-effect import)',
    !esmErr && globalThis.FieldTypes && globalThis.FieldTypes.version === '0.1' &&
    JSON.stringify(Object.keys(globalThis.FieldTypes).sort()) === JSON.stringify(EXPECTED) &&
    !('default' in ns),
    esmErr ? esmErr.message : 'keys ' + Object.keys(ns).join(','));
}

// ── report ───────────────────────────────────────────────────────────────────
console.log(`\n  lib/fieldtypes.js — contract combinators + property laws proof`);
console.log(`  ${pass} passed, ${fail} failed\n`);
if (fail) { failures.forEach(f => console.log('   FAIL ' + f)); console.log(''); }
console.log(`  laws: ${LAWS.length} quick property tests + 2 planted-bug negative controls`);
console.log(`  round-trip: ${manifest.routes.length} showcase-manifest routes validated`);
console.log(`  source: ${LIB}/fieldtypes.js (${src.length} bytes)`);
process.exit(fail ? 1 : 0);
