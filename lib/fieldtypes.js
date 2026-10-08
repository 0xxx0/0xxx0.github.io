// lib/fieldtypes.js — the microlib's runtime contract + property-law module.
//
// WHY THIS FILE EXISTS
//
// TypeScript answers "does this value fit this shape?" at COMPILE time. This
// repo has no build step (lib/README.md law) and its contracts are plain JSON
// that only exists at RUNTIME — showcase-manifest.json's routes, capability
// contracts, policy traces. So the question has to be answerable in the page,
// from a classic <script>, with zero dependencies: types as RUNTIME law.
//
// TWO HALVES, ONE FILE:
//   CONTRACT — combinators build frozen schema objects; `check(value, schema)`
//              returns {ok, errors:[{path, message}]} carrying every
//              violation, paths like `$.routes[3].href`. `assert` throws,
//              `parse` additionally substitutes declared defaults.
//   LAWS     — `invariant(name, fn)` / `property(name, gen, fn)` run claims
//              over a seeded PRNG (prng / genInt / genPick / genArray), so any
//              failure reproduces exactly from its seed. 10-20 quick property
//              tests, no framework, no npm.
//
// THE IDIOM IS NOT INVENTED — it is copied from lib/micro.js:41,197-209:
//
//     (function(root){ ... root.X = api; if(module.exports) module.exports = api })(globalThis)
//
// classic <script> global (`FieldTypes`), CommonJS for node, and an ESM page
// loads it by side-effect import (`import '/lib/fieldtypes.js'`) then reads
// the global — one file, no build step, no bundler, no npm. lib/dom.js shows
// the alternative for pages that want named ESM imports: a projection face.
//
// SCOPE — what this must NOT become (binding here):
//   - not JSON Schema: no $ref / $schema / formats / drafts / annotations
//   - not a compiler: no codegen, no TypeScript, no build step, ever
//   - not a test framework: no reporter, no watch, no file discovery —
//     lib/fieldtypes.selftest.mjs IS the harness
//   - not a codec: check() never rewrites the value; parse() only substitutes
//     declared defaults and never mutates its input
//   - not a registry, not a plugin system, not a schema migrator
//   - no global state beyond this one namespace object
//
// NAMESPACE. Exactly one global: `FieldTypes`. Pages use `FieldTypes.check(v, s)`.
// Add a combinator only when a second caller already needs it.

(function (root) {
  'use strict';

  // ── value description + path algebra ──────────────────────────────────────

  /** Type name for messages: null / array / NaN / Infinity distinguished. */
  function typeOf(v) {
    if (v === null) return 'null';
    if (Array.isArray(v)) return 'array';
    if (typeof v === 'number' && !Number.isFinite(v)) return String(v);
    return typeof v;
  }

  /** Short value for messages: JSON where it exists, truncated at 60 chars. */
  function repr(v) {
    if (typeof v === 'string') return v.length > 40 ? JSON.stringify(v.slice(0, 37) + '...') : JSON.stringify(v);
    if (v === undefined) return 'undefined';
    try {
      const s = JSON.stringify(v);
      if (s !== undefined) return s.length > 60 ? s.slice(0, 57) + '...' : s;
    } catch (_) {}
    return String(v);
  }

  /** Child path — `$.a.b`, `$.a[3]`, `$["odd key"]`. The root path is `$`. */
  function child(path, key) {
    if (typeof key === 'number') return path + '[' + key + ']';
    return /^[A-Za-z_$][\w$]*$/.test(key) ? path + '.' + key : path + '[' + JSON.stringify(key) + ']';
  }

  function errText(e) { return e && e.message ? e.message : String(e); }

  /** First failure of a check()-shaped verdict, formatted. */
  function verdict(r) {
    const e = r.errors && r.errors[0];
    return e ? e.path + ': ' + e.message : 'returned ok:false';
  }

  // ── combinators (schemas are frozen plain objects) ────────────────────────

  const KNOWN = new Set(['str', 'num', 'bool', 'enum', 'arrayOf', 'objectOf',
    'record', 'oneOf', 'optional', 'withDefault', 'refine']);

  /** Duck-typed schema guard for the COMBINATORS (bad schema = developer bug). */
  function want(s, where) {
    if (!s || typeof s !== 'object' || typeof s.k !== 'string' || !KNOWN.has(s.k))
      throw new TypeError('fieldtypes: ' + where + ' needs a schema built by a combinator, got ' + repr(s));
    return s;
  }

  /** string — bare on purpose: length/pattern laws belong to `refine`. */
  function str() { return Object.freeze({ k: 'str' }); }

  /** finite number — NaN and Infinity are not numbers in a contract. */
  function num() { return Object.freeze({ k: 'num' }); }

  /** boolean — `true`/`false` only; 0 and 'false' are not bools. */
  function bool() { return Object.freeze({ k: 'bool' }); }

  /** enum(...values) — same-value-zero membership; one value = a literal. */
  function enumOf(...values) {
    if (!values.length) throw new TypeError('fieldtypes: enum() needs at least one value');
    return Object.freeze({ k: 'enum', values: Object.freeze(values) });
  }

  /** arrayOf(item) — an array whose every element satisfies `item`. */
  function arrayOf(item) {
    return Object.freeze({ k: 'arrayOf', item: want(item, 'arrayOf()') });
  }

  /** objectOf(shape, {exact}) — a fixed shape. Keys absent from `shape` are
   *  passed through untouched unless `exact` rejects them; an optional or
   *  withDefault property may be missing, any other one may not (refine() in
   *  between is unwrapped when deciding that). */
  function objectOf(shape, opts) {
    if (!shape || typeof shape !== 'object') throw new TypeError('fieldtypes: objectOf() needs a shape object');
    for (const key of Object.keys(shape)) want(shape[key], 'objectOf() property "' + key + '"');
    return Object.freeze({ k: 'objectOf', shape: Object.freeze(Object.assign({}, shape)), exact: !!(opts && opts.exact) });
  }

  /** record(value) — an object of dynamic keys; every value satisfies `value`
   *  (keys are strings by construction; there is no key schema). */
  function record(value) {
    return Object.freeze({ k: 'record', value: want(value, 'record()') });
  }

  /** oneOf(...branches) — EXACTLY one branch must match (JSON Schema law),
   *  so branches must be mutually exclusive; zero or two matches both fail. */
  function oneOf(...branches) {
    if (!branches.length) throw new TypeError('fieldtypes: oneOf() needs at least one branch');
    return Object.freeze({ k: 'oneOf', branches: Object.freeze(branches.map((b, i) => want(b, 'oneOf() branch ' + i))) });
  }

  /** optional(schema) — `undefined` passes; anything else must satisfy schema.
   *  Must be the OUTERMOST wrapper on an optional object property. */
  function optional(schema) { return Object.freeze({ k: 'optional', inner: want(schema, 'optional()') }); }

  /** withDefault(schema, dflt) — like optional, but parse() substitutes `dflt`
   *  when the value is absent. The default is returned BY REFERENCE: treat it
   *  as immutable. */
  function withDefault(schema, dflt) {
    return Object.freeze({ k: 'withDefault', inner: want(schema, 'withDefault()'), default: dflt });
  }

  /** refine(schema, pred, message) — an extra law over a schema that already
   *  passed. pred runs only when the inner schema passed, and its return is
   *  coerced truthy. */
  function refine(schema, pred, message) {
    if (typeof pred !== 'function') throw new TypeError('fieldtypes: refine() needs a predicate function');
    return Object.freeze({ k: 'refine', inner: want(schema, 'refine()'), pred, message: message || 'refinement failed' });
  }

  /** Peel refine() wrappers to see the shape-bearing schema underneath. */
  function unwrap(s) { while (s && s.k === 'refine') s = s.inner; return s; }

  // ── the one engine: walk() validates AND (for parse) substitutes ──────────
  // Containers register themselves in `seen` (ancestor set), so a circular
  // VALUE stops at 'circular reference' instead of recursing forever, while a
  // merely shared (non-circular) reference passes.

  function walk(value, schema, path, errors, seen) {
    if (!schema || typeof schema !== 'object' || typeof schema.k !== 'string' || !KNOWN.has(schema.k))
      throw new TypeError('fieldtypes: not a schema at ' + path + ' — ' + repr(schema));
    switch (schema.k) {
      case 'str':
        if (typeof value !== 'string') errors.push({ path, message: 'expected a string, got ' + typeOf(value) });
        return value;
      case 'num':
        if (typeof value !== 'number' || !Number.isFinite(value))
          errors.push({ path, message: 'expected a finite number, got ' + typeOf(value) });
        return value;
      case 'bool':
        if (typeof value !== 'boolean') errors.push({ path, message: 'expected a boolean, got ' + typeOf(value) });
        return value;
      case 'enum':
        if (!schema.values.includes(value))
          errors.push({ path, message: 'expected one of [' + schema.values.map(repr).join(', ') + '], got ' + repr(value) });
        return value;
      case 'optional':
        return value === undefined ? undefined : walk(value, schema.inner, path, errors, seen);
      case 'withDefault':
        return value === undefined ? schema.default : walk(value, schema.inner, path, errors, seen);
      case 'refine': {
        const local = [];
        const out = walk(value, schema.inner, path, local, seen);
        if (local.length) { for (const e of local) errors.push(e); return out; }
        let ok;
        try { ok = !!schema.pred(out); }
        catch (e) { errors.push({ path, message: 'refinement threw: ' + errText(e) }); return out; }
        if (!ok) errors.push({ path, message: schema.message });
        return out;
      }
      case 'arrayOf': {
        if (!Array.isArray(value)) { errors.push({ path, message: 'expected an array, got ' + typeOf(value) }); return value; }
        if (seen.has(value)) { errors.push({ path, message: 'circular reference' }); return value; }
        seen.add(value);
        try {
          const out = new Array(value.length);
          for (let i = 0; i < value.length; i++) out[i] = walk(value[i], schema.item, child(path, i), errors, seen);
          return out;
        } finally { seen.delete(value); }
      }
      case 'objectOf': {
        if (value === null || typeof value !== 'object' || Array.isArray(value)) {
          errors.push({ path, message: 'expected an object, got ' + typeOf(value) });
          return value;
        }
        if (seen.has(value)) { errors.push({ path, message: 'circular reference' }); return value; }
        seen.add(value);
        try {
          const out = {}, shape = schema.shape;
          for (const key of Object.keys(shape)) {
            if (!Object.prototype.hasOwnProperty.call(value, key)) {
              const bare = unwrap(shape[key]);
              if (bare.k === 'optional') continue;
              if (bare.k === 'withDefault') { out[key] = bare.default; continue; }
              errors.push({ path: child(path, key), message: 'missing required property' });
              continue;
            }
            out[key] = walk(value[key], shape[key], child(path, key), errors, seen);
          }
          for (const key of Object.keys(value)) {
            if (Object.prototype.hasOwnProperty.call(shape, key)) continue;
            if (schema.exact) errors.push({ path: child(path, key), message: 'unexpected property' });
            out[key] = value[key];               // pass-through: parse keeps what it was not asked about
          }
          return out;
        } finally { seen.delete(value); }
      }
      case 'record': {
        if (value === null || typeof value !== 'object' || Array.isArray(value)) {
          errors.push({ path, message: 'expected an object, got ' + typeOf(value) });
          return value;
        }
        if (seen.has(value)) { errors.push({ path, message: 'circular reference' }); return value; }
        seen.add(value);
        try {
          const out = {};
          for (const key of Object.keys(value)) out[key] = walk(value[key], schema.value, child(path, key), errors, seen);
          return out;
        } finally { seen.delete(value); }
      }
      case 'oneOf': {
        const n = schema.branches.length, misses = [];
        let matched = 0, winner, hasWinner = false;
        schema.branches.forEach((b, i) => {
          const local = [];
          const v = walk(value, b, path, local, seen);
          if (local.length) { misses.push('[' + i + '] ' + local[0].message); return; }
          matched++;
          if (!hasWinner) { winner = v; hasWinner = true; }
        });
        if (matched === 0) errors.push({ path, message: 'none of ' + n + ' branches matched: ' + misses.join('; ') });
        else if (matched > 1)
          errors.push({ path, message: matched + ' of ' + n + ' branches matched — oneOf needs exactly one; make the branches exclusive' });
        return hasWinner ? winner : value;
      }
    }
    throw new TypeError('fieldtypes: unhandled schema kind ' + schema.k);   // unreachable
  }

  // ── contract surface ──────────────────────────────────────────────────────

  /** Validate `value` against `schema`. Collects EVERY violation; never
   *  mutates the value; a malformed schema throws (developer bug), a malformed
   *  value never does. */
  function check(value, schema) {
    const errors = [];
    walk(value, schema, '$', errors, new Set());
    return { ok: errors.length === 0, errors };
  }

  /** check() plus the value with withDefault substitutions applied — fresh
   *  containers, input untouched; `value` is best-effort when ok is false. */
  function parse(value, schema) {
    const errors = [];
    const out = walk(value, schema, '$', errors, new Set());
    return { ok: errors.length === 0, value: out, errors };
  }

  /** Throw unless `value` satisfies `schema`; returns the value, so contracts
   *  read inline: `const m = assert(json, ManifestSchema, 'showcase-manifest')`. */
  function assert(value, schema, label) {
    const r = check(value, schema);
    if (r.ok) return value;
    throw new Error((label ? label + ': ' : '') + r.errors.length + ' contract violation(s):\n  ' +
      r.errors.map(e => e.path + ': ' + e.message).join('\n  '));
  }

  // ── laws: seeded PRNG, generators, runners ────────────────────────────────

  /** Deterministic PRNG (mulberry32): the same seed yields the same stream,
   *  forever, in every engine — a failure is reproducible from its seed. */
  function prng(seed) {
    let a = (seed === undefined ? 1 : seed) | 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;      // [0, 1)
    };
  }

  /** genInt(min, max) — integer in [min, max], both ends included. */
  function genInt(min, max) {
    if (!Number.isInteger(min) || !Number.isInteger(max)) throw new TypeError('fieldtypes: genInt bounds must be integers');
    if (max < min) throw new RangeError('fieldtypes: genInt max < min');
    const span = max - min + 1;
    return rnd => min + Math.floor(rnd() * span);
  }

  /** genPick(items) — a uniformly picked element of `items`. */
  function genPick(items) {
    if (!items || !items.length) throw new TypeError('fieldtypes: genPick needs a non-empty array');
    return rnd => items[Math.floor(rnd() * items.length)];
  }

  /** genArray(gen, min = 0, max = 6) — an array whose length is in [min, max]
   *  and whose elements come from `gen`. */
  function genArray(gen, min, max) {
    if (typeof gen !== 'function') throw new TypeError('fieldtypes: genArray needs a generator function');
    const len = genInt(min === undefined ? 0 : min, max === undefined ? 6 : max);
    return rnd => {
      const n = len(rnd), out = new Array(n);
      for (let i = 0; i < n; i++) out[i] = gen(rnd);
      return out;
    };
  }

  /** invariant(name, fn) — one claim about the world. fn PASSES when it
   *  throws nothing and returns anything but false / {ok:false} — so a plain
   *  assert-style body works, and a check() verdict can be returned directly. */
  function invariant(name, fn) {
    const failures = [];
    try {
      const r = fn();
      if (r === false) failures.push({ run: 0, sample: '', message: 'returned false' });
      else if (r && typeof r === 'object' && r.ok === false) failures.push({ run: 0, sample: '', message: verdict(r) });
    } catch (e) { failures.push({ run: 0, sample: '', message: 'threw: ' + errText(e) }); }
    return { name, kind: 'invariant', ok: failures.length === 0, runs: 1, failures };
  }

  /** property(name, gen, fn, opts) — run fn over `gen(rnd)` samples from a
   *  seeded PRNG (opts: seed default 1, runs default 100, maxFailures default
   *  5 — the run stops early once that many fail). fn must return truthy or
   *  {ok:true}; false, undefined and a throw all count as failure, so a
   *  forgotten `return` can never go green. Returns
   *  {name, kind:'property', ok, runs, failures:[{run, sample, message}]}. */
  function property(name, gen, fn, opts) {
    opts = opts || {};
    if (typeof gen !== 'function' || typeof fn !== 'function')
      throw new TypeError('fieldtypes: property(name, gen, fn) needs two functions');
    const planned = opts.runs === undefined ? 100 : opts.runs;
    const maxFailures = opts.maxFailures === undefined ? 5 : opts.maxFailures;
    const rnd = prng(opts.seed === undefined ? 1 : opts.seed);
    const failures = [];
    let runs = 0;
    while (runs < planned) {
      let sample, ok = false, message = '';
      try {
        sample = gen(rnd);
        const r = fn(sample);
        if (r && typeof r === 'object' && typeof r.ok === 'boolean') { ok = r.ok; if (!ok) message = verdict(r); }
        else if (r === undefined || r === null) message = 'returned nothing (expected truthy or {ok:true})';
        else if (r === false) message = 'returned false';
        else ok = true;                                  // any other truthy value passes
      } catch (e) { message = 'threw: ' + errText(e); }
      runs++;
      if (!ok) {
        failures.push({ run: runs - 1, sample: repr(sample), message: message || 'failed' });
        if (failures.length >= maxFailures) break;
      }
    }
    return { name, kind: 'property', ok: failures.length === 0, runs, failures };
  }

  // ── namespace ─────────────────────────────────────────────────────────────

  const api = Object.freeze({
    version: '0.1',
    // contract
    str, num, bool, enum: enumOf, arrayOf, objectOf, record, oneOf, optional, withDefault, refine,
    check, parse, assert,
    // laws
    prng, genInt, genPick, genArray, invariant, property,
  });

  root.FieldTypes = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
