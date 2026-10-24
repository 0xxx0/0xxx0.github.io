#!/usr/bin/env node
// conformance.mjs — proves sleeper/CONTRACT.md against the ACTUAL sources.
// Node only (>=22 type stripping), zero deps, no browser: browser-only lineages
// are driven headless through a DOM shim that executes their OWN shipped code —
// nothing is copied into this file and no shipped page is modified.
//
//   node sleeper/conformance/conformance.mjs          # human report, exit 0 = all verdicts justified
//
// Verdict rule (from CONTRACT.md §5, applied mechanically, per lineage):
//   CONFORMS         a claimant of the recovered law (canonical source or a port
//                    of it) AND no FAIL on I1-I4.
//   NON-CONFORMING   any FAIL on I1-I4 — a value it implements contradicts the
//                    contract (the FAIL line carries the evidence).
//   PROJECTION       not a claimant, no FAIL: a lawful subset aspect with its own
//                    stable identity chain (deterministic input -> city/artifact).
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const CANON = join(REPO, 'recovery', 'sleeper', 'site-source-2026-09-18');
const CANON_URL = (p) => pathToFileURL(join(CANON, p)).href;
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const j = (x) => JSON.stringify(x);
const fnv1a = (s) => { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
function diffPaths(a, b, path = '', out = [], limit = 6) {
  if (out.length >= limit) return out;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    if (j(a) !== j(b)) out.push(path || '<root>');
    return out;
  }
  for (const k of new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})])) diffPaths(a?.[k], b?.[k], path ? `${path}.${k}` : k, out, limit);
  return out;
}

// ── report plumbing ────────────────────────────────────────────────────────
const LINEAGES = [];
let cur = null;
function lineage(id, name, path, claimant) {
  cur = { id, name, path, claimant, checks: [], verdict: null, why: '' };
  LINEAGES.push(cur);
  console.log(`\n── ${id} ${name}\n   ${path}`);
}
const CANONICAL_GATES = ['PROVENANCE','TRUTH','COMPRESSION','RETRIEVAL','OPERATION','MEASURE','TRANSFER','RESILIENCE'];
function check(inv, name, ok, evidence) {
  cur.checks.push({ inv, name, ok: !!ok, evidence: String(evidence) });
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} [${inv}] ${name}${evidence ? '  — ' + evidence : ''}`);
  return !!ok;
}
const na = (inv, name, why) => { cur.checks.push({ inv, name, ok: true, na: true, evidence: 'n/a: ' + why }); console.log(`   n/a [${inv}] ${name}  — ${why}`); };

// ── headless DOM shim (executes shipped code; never edits it) ──────────────
function ctx2d() {
  return new Proxy({}, {
    get: (_t, p) => p === 'measureText' ? (() => ({ width: 10 }))
      : p === 'getImageData' ? ((x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(4, w * h * 4)), width: w, height: h }))
      : () => undefined,
    set: () => true,
  });
}
function makeElement(tag = 'div') {
  const classes = new Set();
  const el = {
    tagName: String(tag).toUpperCase(), children: [], dataset: {}, attributes: {}, files: [],
    style: { setProperty() {}, removeProperty() {}, getPropertyValue() { return ''; } },
    value: '', textContent: '', innerHTML: '', outerHTML: '', placeholder: '', className: '',
    classList: {
      add: (...c) => c.forEach((x) => classes.add(x)),
      remove: (...c) => c.forEach((x) => classes.delete(x)),
      toggle: (c, f) => (f === undefined ? (classes.has(c) ? classes.delete(c) : classes.add(c)) : (f ? classes.add(c) : classes.delete(c))),
      contains: (c) => classes.has(c),
    },
    focus() {}, blur() {},
    click() { if (typeof el.onclick === 'function') el.onclick(); },
    appendChild(c) { el.children.push(c); return c; },
    insertAdjacentHTML() {}, remove() {}, closest() { return null; }, matches() { return false; },
    replaceChildren() {}, scrollIntoView() {}, getBoundingClientRect() { return { x: 0, y: 0, width: 390, height: 844, top: 0, left: 0, right: 390, bottom: 844 }; },
    setAttribute(k, v) { el.attributes[k] = v; }, getAttribute(k) { return el.attributes[k] ?? null; },
    addEventListener() {}, removeEventListener() {},
    getContext: () => ctx2d(),
    querySelector: () => makeElement(), querySelectorAll: () => [],
  };
  for (const k of ['onclick', 'onchange', 'oninput', 'onkeydown', 'onsubmit']) el[k] = null;
  return el;
}
const DONOR_MOVES = ['0,-1', '-1,0', '1,0', '0,1'];
function makeDom(values = {}) {
  const byId = new Map(), bySel = new Map(), blobs = [];
  const store = new Map();
  const doc = {
    getElementById(id) { if (!byId.has(id)) { const e = makeElement(); if (values[id] !== undefined) e.value = String(values[id]); byId.set(id, e); } return byId.get(id); },
    querySelector(sel) { if (!bySel.has(sel)) bySel.set(sel, makeElement()); return bySel.get(sel); },
    querySelectorAll(sel) {
      if (!bySel.has(sel)) {
        if (sel === '[data-move]') bySel.set(sel, DONOR_MOVES.map((m) => { const e = makeElement('button'); e.dataset.move = m; return e; }));
        else if (sel === '[data-view]') bySel.set(sel, ['city', 'disc', 'trace'].map((v) => { const e = makeElement('button'); e.dataset.view = v; return e; }));
        else bySel.set(sel, []);
      }
      return bySel.get(sel);
    },
    createElement(tag) { return makeElement(tag); },
    documentElement: makeElement('html'),
    body: makeElement('body'),
    activeElement: { tagName: 'BODY' },
    addEventListener() {}, removeEventListener() {},
  };
  const sandbox = {
    document: doc,
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    performance: { now: () => Date.now() },
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    requestAnimationFrame: () => 0, cancelAnimationFrame() {},
    innerWidth: 390, innerHeight: 844, devicePixelRatio: 2,
    navigator: { clipboard: { writeText: async () => {} } },
    prompt() {}, alert() {}, confirm() { return false; },
    location: { href: '', reload() {}, search: '' },
    URL: { createObjectURL: (b) => { blobs.push(b); return 'blob:conformance'; }, revokeObjectURL() {} },
    Blob: class Blob { constructor(parts, opts) { this.textValue = parts.join(''); this.type = opts?.type ?? ''; } },
    addEventListener() {}, removeEventListener() {},
    console,
    Math, JSON, Date, RegExp, Array, Object, String, Number, Boolean, Set, Map, Error, Promise, URLSearchParams,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  return { sandbox, byId, blobs, doc, $: (id) => doc.getElementById(id) };
}
function evalFile(code, file, sandbox) { vm.runInContext(code, sandbox, { filename: file, lineOffset: 0 }); }
const run = (sandbox, expr) => vm.runInContext(expr, sandbox);

// ── L1 · CANONICAL (exact recovered v2 source) ─────────────────────────────
const wl = await import(CANON_URL('app/one-return/world-law.ts'));
const cl = await import(CANON_URL('app/one-return/city-layout.ts'));
const seedlib = await import(CANON_URL('app/lib/seed.ts'));
const fc = await import(CANON_URL('app/field-catalog.ts'));

lineage('L1', 'CANONICAL — recovered ONE RETURN v2 City Engine', 'recovery/sleeper/site-source-2026-09-18/', true);
{
  const P = 'ASK BETTER';
  const law1 = wl.compileWorldLaw(P, 'doors', 'urchin');
  const law2 = wl.compileWorldLaw(P, 'doors', 'urchin');
  check('I1', 'same phrase+cell+figure = same world key (stable FNV-1a seed)',
    law1.key === law2.key && law1.seed === law2.seed, `key ${law1.key} seed ${law1.seed}`);
  check('I1', 'unicode/spacing normalise to one seed',
    seedlib.seedFromSource('  cafe\u0301   returns ') === seedlib.seedFromSource('café returns'), 'NFC + trim + collapse + UPPER');
  const city1 = j(cl.buildCityLayout(P, 'doors', 'urchin'));
  const city2 = j(cl.buildCityLayout(P, 'doors', 'urchin'));
  const cityOther = j(cl.buildCityLayout('ASK WORSE', 'doors', 'urchin'));
  check('I1', 'same phrase = byte-identical 27x27 city + gates', city1 === city2, `grid json ${city1.length}B, sha ${sha256(city1).slice(0, 12)}`);
  check('I1', 'changed phrase changes the city', city1 !== cityOther, `sha ${sha256(cityOther).slice(0, 12)}`);
  check('I1', 'changed cell/figure changes the world key',
    wl.compileWorldLaw(P, 'wind', 'kite').key !== law1.key, `wind/kite key ${wl.compileWorldLaw(P, 'wind', 'kite').key}`);

  check('I2', 'GATE_DEFINITIONS = the eight enacted gates, canonical order',
    wl.GATE_DEFINITIONS.length === 8 && j(wl.GATE_DEFINITIONS.map((g) => g.name)) === j(CANONICAL_GATES), wl.GATE_DEFINITIONS.map((g) => g.name).join(' '));
  check('I2', 'each gate carries an enacted method + instruction',
    wl.GATE_DEFINITIONS.every((g) => g.method && g.instruction), wl.GATE_DEFINITIONS.map((g) => `${g.name}:${g.method}`).join(' '));
  const v2doc = readFileSync(join(CANON, 'docs', 'ONE_RETURN_V2.md'), 'utf8');
  check('I2', 'ninth position is the origin return, not a ninth collectible',
    /ninth is not another collectible: it is retrieval of the starting coordinate/.test(v2doc), 'docs/ONE_RETURN_V2.md');
  check('I2', 'every verse cell reorders the same eight, never a different set',
    new Set(wl.VERSE_CELLS.map((c) => j([...c.gateOrder].sort()))).size === 1, `${wl.VERSE_CELLS.length} cells, one gate set`);

  const proofs = wl.GATE_DEFINITIONS.map((g, i) => ({ gate: g.name, token: law1.cellTokens[i], method: g.method, step: 12 + i, elapsedMs: 1000 * (i + 1), note: 'conformance run' }));
  const counts = { conch: 3, keris: 1, w8: 2, spiral: 1 };
  const art1 = wl.makeReturnArtifact(law1, proofs, counts, ['U', 'D', 'R', 'L'], 96, 51200);
  const art2 = wl.makeReturnArtifact(law1, proofs, counts, ['U', 'D', 'R', 'L'], 96, 51200);
  check('I3', 'return -> artifact v2 is deterministic (identical bytes)',
    j(art1) === j(art2), `schema ${art1.schema} v${art1.version} worldKey ${art1.worldKey} sha ${sha256(j(art1)).slice(0, 12)}`);
  check('I3', 'artifact round-trips its own world (world key verifies inputs)',
    wl.parseReturnArtifactWorld(j(art1)).ok === true, 'parseReturnArtifactWorld accepts');
  const forged = { ...art1, worldKey: 'ZZZZZZ9' };
  check('I3', 'forged world key is rejected', wl.parseReturnArtifactWorld(j(forged)).ok === false,
    wl.parseReturnArtifactWorld(j(forged)).error);
  const wrongSchema = { ...art1, schema: 'sleeper.one-return', version: 1 };
  check('I3', 'non-v2 witness is rejected', wl.parseReturnArtifactWorld(j(wrongSchema)).ok === false,
    wl.parseReturnArtifactWorld(j(wrongSchema)).error);
  const sharedV2 = require(join(REPO, 'lib', 'sleeper-return-v2.js'));
  check('I3', 'shared repo validator (lib/sleeper-return-v2.js) derives the same world key',
    sharedV2.compile(P, 'doors', 'urchin').worldKey === law1.key, `lib ${sharedV2.compile(P, 'doors', 'urchin').worldKey} == canonical ${law1.key}`);
  check('I3', 'shared repo validator accepts the canonical artifact', sharedV2.validate(art1).ok === true, 'validate() -> ok, no errors');
  const forgedCounts = { ...art1, operatorCounts: { ...counts, spiral: 99 } };
  const forgedRes = sharedV2.validate(forgedCounts);
  check('I3', 'shared repo validator rejects a forged artifact by name', forgedRes.ok === false, forgedRes.errors.slice(0, 2).join(' / '));
  check('I3', 'returned source is caused by operator + path, not free text',
    wl.makeReturnArtifact(law1, proofs, counts, ['L', 'R', 'D', 'U'], 96, 51200).returnedSource !== art1.returnedSource ||
    art1.returnedSource !== art1.source, `returned "${art1.returnedSource}"`);

  const fields = fc.FIELD_DEFINITIONS;
  check('I4', 'field-catalog defines the ten fields, 01 -> 10, stable ids+hrefs',
    fields.length === 10 && j(fields.map((f) => f.number)) === j(['01','02','03','04','05','06','07','08','09','10']) &&
    new Set(fields.map((f) => f.id)).size === 10 && new Set(fields.map((f) => f.href)).size === 10,
    fields.map((f) => `${f.number}:${f.id}@${f.href}`).join(' '));
  const catalogPath = join(REPO, 'sleeper', 'archive', 'catalog.json');
  if (existsSync(catalogPath)) {
    const cat = JSON.parse(readFileSync(catalogPath, 'utf8'));
    const batch = cat.batches?.fields;
    const names = (batch?.items ?? []).map((x) => x.file ?? '');
    const fieldItems = names.filter((f) => /^media\/fields\/\d{2}-/.test(f));
    check('I4', 'published archive spine carries the same ten fields in the same order',
      batch?.count === names.length && fieldItems.length === 10 && /TEN FIELDS/.test(batch?.title ?? '') &&
      fieldItems.every((f, i) => f.startsWith(`media/fields/${fields[i].number}-`) &&
        String((batch.items[i].source_path ?? '')).endsWith(`public${fields[i].image}`)),
      `${batch?.count} items (${fieldItems.length} fields + ${names.length - fieldItems.length} covers); order+image tie to field-catalog: ${fieldItems.slice(0, 3).join(', ')} …`);
  } else {
    check('I4', 'published archive spine present', false, 'sleeper/archive/catalog.json missing');
  }
  const canonRun = spawnSync(process.execPath, ['--test', 'tests/field-engines.test.mjs'], { cwd: CANON, encoding: 'utf8' });
  const canonM = /ℹ pass (\d+)[\s\S]*?ℹ fail (\d+)/.exec(canonRun.stdout);
  check('X', 'canonical recovery test suite still green headless', !!canonM && canonM[2] === '0',
    canonM ? `${canonM[1]} pass / ${canonM[2]} fail (node --test tests/field-engines.test.mjs)` : canonRun.stdout.slice(-200));
  cur.fingerprint = `canonical-city:${sha256(j(cl.buildCityLayout(P, 'doors', 'urchin').grid)).slice(0, 16)} (27x27 grid bytes)`;
}

// ── L2 · NATIVE PORT (the live /sleeper/ shelf runtime) ────────────────────
lineage('L2', 'NATIVE PORT — /sleeper/ static port (native-core.js + native-ui.js)', 'sleeper/native-core.js, sleeper/native-ui.js', true);
{
  const dom = makeDom({});
  for (const f of ['encounter.js', 'native-core.js', 'native-engine.js', 'native-views.js', 'native-ui.js', 'native-presence.js']) {
    evalFile(readFileSync(join(REPO, 'sleeper', f), 'utf8'), `sleeper/${f}`, dom.sandbox);
  }
  const P = 'ASK BETTER';
  const natKey = run(dom.sandbox, `compile(${j(P)}, 'doors', 'urchin').key`);
  const canKey = wl.compileWorldLaw(P, 'doors', 'urchin').key;
  check('I1', 'native world key === canonical world key (cross-lineage identity)', natKey === canKey, `native ${natKey} / canonical ${canKey}`);
  const natGrid = run(dom.sandbox, `JSON.stringify(buildCity(${j(P)}, 'doors', 'urchin').grid)`);
  const canGrid = j(cl.buildCityLayout(P, 'doors', 'urchin').grid);
  check('I1', 'native city grid === canonical city grid (same phrase, same bytes)', natGrid === canGrid, `sha ${sha256(natGrid).slice(0, 12)}`);
  const natGrid2 = run(dom.sandbox, `JSON.stringify(buildCity(${j(P)}, 'doors', 'urchin').grid)`);
  check('I1', 'recompile in the same process reproduces the city', natGrid === natGrid2, 'pure function of (source, cell, figure)');
  check('I2', 'native gate set === the eight enacted gates',
    j(run(dom.sandbox, 'CANON')) === j(CANONICAL_GATES), run(dom.sandbox, 'CANON.join(" ")'));
  // drive the shipped artifact derivation with a real run-shaped game object
  const law = wl.compileWorldLaw(P, 'doors', 'urchin');
  const proofs = wl.GATE_DEFINITIONS.map((g, i) => ({ gate: g.name, token: law.cellTokens[i], method: g.method, step: 10 + i, elapsedMs: 900 * (i + 1), note: 'conformance run', collected: true }));
  const counts = { conch: 2, keris: 2, w8: 2, spiral: 1 };
  const signature = ['U', 'D', 'R', 'L', 'U', 'U'];
  run(dom.sandbox, `game = {}; game.law = ${j(law)}; game.proofs = ${j(proofs.map(({ ...p }) => p))}; game.operatorCounts = ${j(counts)}; game.signature = ${j(signature)}; game.steps = 87; game.startedAt = performance.now() - 51200;`);
  const natArt = JSON.parse(run(dom.sandbox, 'JSON.stringify(makeArtifact())'));
  const canArt = wl.makeReturnArtifact(law, proofs, counts, signature, 87, 51200);
  const strip = (a) => { const c = JSON.parse(j(a)); c.measures.elapsedMs = 0; return j(c); };
  check('I3', 'native artifact === canonical artifact v2 (all fields but wall-clock ms)', strip(natArt) === strip(canArt),
    `schema ${natArt.schema} v${natArt.version} sha ${sha256(strip(natArt)).slice(0, 12)}`);
  check('I3', 'native artifact verifies as its own world', wl.parseReturnArtifactWorld(j(natArt)).ok === true, 'parseReturnArtifactWorld accepts');
  na('I4', 'field identity', 'the shelf runtime names no Field 0N identity; the ten fields live in field-catalog.ts + /sleeper/archive/');
  cur.fingerprint = `native-city:${sha256(natGrid).slice(0, 16)} (27x27 grid bytes; must equal L1)`
}

// ── L3 · PLAYABLE DONOR (/sleeper/one-return/) — full headless golden run ──
lineage('L3', 'PLAYABLE DONOR — /sleeper/one-return/ (nine-gate reconstruction)', 'sleeper/one-return/index.html', false);
{
  const html = readFileSync(join(REPO, 'sleeper', 'one-return', 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const inline = scripts.sort((a, b) => b.length - a.length)[0];
  const DEFAULT_SEED = /id="seed"[^>]*value="([^"]*)"/.exec(html)?.[1] ?? 'sleeper';
  const DEFAULT_CORPUS = /<textarea id="corpus">([\s\S]*?)<\/textarea>/.exec(html)?.[1] ?? '';
  const routeWitnessApi = require(join(REPO, 'lib', 'sleeper-route-witness.js'));
  const hash = (s) => { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const words = (s) => String(s).match(/[\p{L}\p{N}_'-]+/gu) || [];

  function boot(seed, corpus) {
    const dom = makeDom({ seed, corpus, adapter: 'mixed', rate: '420' });
    dom.sandbox.SleeperRouteWitness = routeWitnessApi;
    evalFile(inline, 'sleeper/one-return/index.html#inline', dom.sandbox);
    return dom;
  }
  const dom = boot(DEFAULT_SEED, DEFAULT_CORPUS);
  const api = () => run(dom.sandbox, 'window.OneReturnAPI');
  const snapshot = () => api().snapshot();
  const moveButtons = dom.doc.querySelectorAll('[data-move]');

  const w0 = snapshot();
  const cityFP = (w) => sha256(w.grid.map((r) => r.join('')).join('\n') + '|' + w.gates.map((g) => `${g.x},${g.y},${g.line}`).join(';') + `|${w.exit.x},${w.exit.y}`);
  check('I1', 'phrase+epoch deterministically compiles the 39x23 city (grid + 9 gate coordinates + exit)',
    w0.schema === 'one-return-nine-gate/reified-0.2' && w0.grid.length === 23 && w0.gates.length === 9 && w0.gates.every((g) => g.line && Number.isInteger(g.x)),
    `world ${w0.schema}; city sha ${cityFP(w0).slice(0, 12)}`);
  const domB = boot(DEFAULT_SEED, DEFAULT_CORPUS);
  check('I1', 'a second fresh context (same inputs) builds the same city', cityFP(run(domB.sandbox, 'window.OneReturnAPI.snapshot()')) === cityFP(w0), 'process-independent, no Math.random / clock in the seed');
  const other = boot('a different phrase entirely', DEFAULT_CORPUS);
  check('I1', 'a different seed builds a different city', cityFP(run(other.sandbox, 'window.OneReturnAPI.snapshot()')) !== cityFP(w0), 'seed is an input, not a constant');

  // golden run: solve all nine gates in order, then return through the exit
  const walkTo = (sx, sy, tx, ty, grid) => {
    const H = grid.length, W = grid[0].length;
    const open = (x, y) => x >= 0 && y >= 0 && x < W && y < H && (grid[y][x] === ' ' || grid[y][x] === 'E' || /^[1-9]$/.test(grid[y][x]));
    const prev = new Map([[`${sx},${sy}`, null]]), q = [[sx, sy]];
    while (q.length) {
      const [x, y] = q.shift();
      if (x === tx && y === ty) break;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
        if (open(nx, ny) && !prev.has(k)) { prev.set(k, [x, y]); q.push([nx, ny]); }
      }
    }
    if (!prev.has(`${tx},${ty}`)) return null;
    const path = []; let c = [tx, ty];
    while (c && !(c[0] === sx && c[1] === sy)) { path.unshift(c); c = prev.get(`${c[0]},${c[1]}`); }
    return path;
  };
  const drive = (tx, ty) => {
    let w = snapshot();
    for (let guard = 0; guard < 400; guard++) {
      const path = walkTo(w.x, w.y, tx, ty, w.grid);
      if (!path) return 'unreachable';
      if (!path.length) return 'arrived';
      const [nx, ny] = path[0];
      moveButtons.find((b) => b.dataset.move === `${nx - w.x},${ny - w.y}`).click();
      w = snapshot();
      if (w.x === nx && w.y === ny) {
        if (!answerIfChallenging()) return w.x === tx && w.y === ty ? 'arrived' : 'blocked';
      }
      if (w.x === tx && w.y === ty) return 'arrived';
    }
    return 'guard';
  };
  const answerIfChallenging = () => {
    const card = dom.$('challenge');
    // the donor raises its challenge overlay via classList 'on'; the answer
    // function itself no-ops without an active challenge, so probe by answering.
    const w = snapshot();
    const g = w.gates.find((q) => q.x === w.x && q.y === w.y && q.status !== 'done' && q.id === w.nextGate + 1); // only the CURRENT gate opens a challenge; out-of-order landings are a no-op
    if (!g) return true;
    const i = g.id - 1, type = w.adapter === 'recall' ? 'RECALL' : w.adapter === 'succession' ? 'SUCCESSION' : (i % 2 ? 'SUCCESSION' : 'RECALL');
    const line = w.source[i % w.source.length];
    let want;
    if (type === 'RECALL') { const ws = words(line); want = ws[hash(line + '|' + (w.worldEpoch ?? w.returns)) % Math.max(1, ws.length)] || line; }
    else { const idx = w.source.indexOf(line); const next = w.source[(idx + 1) % w.source.length]; want = words(next)[0] || next; }
    dom.$('answer').value = want;
    dom.$('answerBtn').click();
    return snapshot().gates[i].status === 'done';
  };
  const gateResults = [];
  for (const g of w0.gates) gateResults.push(drive(g.x, g.y));
  const wDone = snapshot();
  const solved = wDone.gates.filter((g) => g.status === 'done').length;
  const protocols = [...new Set(wDone.gates.map((_, i) => (wDone.adapter === 'recall' ? 'RECALL' : wDone.adapter === 'succession' ? 'SUCCESSION' : (i % 2 ? 'SUCCESSION' : 'RECALL'))))];
  check('I2', 'implements the eight enacted gates + a real origin return',
    wDone.gates.length === 8 && CANONICAL_GATES.every((n) => j(wDone.gates).includes(n)),
    `measured: N=${wDone.gates.length} collectible gates (${solved} solved headless, drive: ${gateResults.join(',')}), protocols ${protocols.join('|')}; canonical = ${CANONICAL_GATES.join('|')} + origin return`);
  const exit = snapshot().exit;
  const beforeReturn = snapshot();
  drive(exit.x, exit.y);
  const afterReturn = snapshot();
  check('I3', 'return recompiles the SAME city shape for the new epoch (deterministic, epoch-keyed)',
    afterReturn.returns === beforeReturn.returns + 1 && cityFP(afterReturn) !== cityFP(beforeReturn) && afterReturn.grid.length === 23,
    `returns ${beforeReturn.returns} -> ${afterReturn.returns}; epoch is a third input to the city key`);
  const witness = afterReturn.lastRouteWitness;
  check('I3', 'donor emits a route witness sidecar, evidence-only by its own law',
    witness?.schema === 'sleeper.route-witness/v0.1' && routeWitnessApi.validate(witness).ok === true,
    `${witness?.schema}; LAW: "${(witness?.authority?.law ?? routeWitnessApi.LAW ?? '').slice(0, 72)}…"`);
  dom.$('exportBtn').click();
  const packet1 = JSON.parse(dom.blobs.at(-1).textValue);
  const dom2 = boot(DEFAULT_SEED, DEFAULT_CORPUS);
  const mb2 = dom2.doc.querySelectorAll('[data-move]');
  // replay the identical run in a fresh context: same inputs, same moves
  const w2 = () => run(dom2.sandbox, 'window.OneReturnAPI.snapshot()');
  const answer2 = () => {
    const w = w2(); const g = w.gates.find((q) => q.x === w.x && q.y === w.y && q.status !== 'done' && q.id === w.nextGate + 1); if (!g) return true;
    const i = g.id - 1, type = w.adapter === 'recall' ? 'RECALL' : w.adapter === 'succession' ? 'SUCCESSION' : (i % 2 ? 'SUCCESSION' : 'RECALL');
    const line = w.source[i % w.source.length]; let want;
    if (type === 'RECALL') { const ws = words(line); want = ws[hash(line + '|' + (w.worldEpoch ?? w.returns)) % Math.max(1, ws.length)] || line; }
    else { const idx = w.source.indexOf(line); const next = w.source[(idx + 1) % w.source.length]; want = words(next)[0] || next; }
    dom2.$('answer').value = want; dom2.$('answerBtn').click(); return true;
  };
  const drive2 = (tx, ty) => { for (let guard = 0; guard < 400; guard++) { const w = w2(); if (w.x === tx && w.y === ty) return; const path = walkTo(w.x, w.y, tx, ty, w.grid); if (!path) return; const [nx, ny] = path[0]; mb2.find((b) => b.dataset.move === `${nx - w.x},${ny - w.y}`).click(); answer2(); } };
  for (const g of w2().gates) drive2(g.x, g.y);
  drive2(exit.x, exit.y);
  dom2.$('exportBtn').click();
  const packet2 = JSON.parse(dom2.blobs.at(-1).textValue);
  const scrub = (x) => JSON.parse(JSON.stringify(x, (k, v) => (['at', 'startedAt', 'endedAt'].includes(k) ? '<volatile>' : v)));
  check('I3', 'return artifact is the contract schema sleeper.one-return v2',
    packet1.schema === 'sleeper.one-return' && packet1.version === 2, `measured schema ${packet1.schema}, gateCount ${packet1.rules?.gateCount}`);
  check('I3', 'export is byte-deterministic for an identical headless run',
    j(packet1) === j(packet2), `differing paths: ${diffPaths(packet1, packet2).join(', ') || 'none'}`);
  check('I3', 'export is structurally deterministic apart from its own timestamps',
    j(scrub(packet1)) === j(scrub(packet2)), 'volatile fields scrubbed: at, startedAt, endedAt');
  const canonArt = wl.makeReturnArtifact(wl.compileWorldLaw(DEFAULT_CORPUS, 'doors', 'urchin'), [], { conch: 0, keris: 0, w8: 0, spiral: 0 }, ['U'], 1, 1);
  let rejected = null;
  try { run(dom.sandbox, `window.OneReturnAPI.importPacket(${j(canonArt)})`); } catch (e) { rejected = String(e.message || e); }
  check('I3', 'bidirectional v2 seam: imports a canonical sleeper.one-return v2 artifact',
    rejected === null, rejected ? `importPacket refuses a canonical v2 artifact: "${rejected}"` : 'accepted');
  na('I4', 'field identity', 'donor claims no Field 0N identity');
  cur.fingerprint = `donor-city:${cityFP(w0).slice(0, 16)}`;
}

// ── L4 · SUPERSEDED DERIVATIVE (/sleeper/ascii-pov-0.8/) ───────────────────
lineage('L4', 'SUPERSEDED DERIVATIVE — /sleeper/ascii-pov-0.8/', 'sleeper/ascii-pov-0.8/app.js', false);
{
  const code = readFileSync(join(REPO, 'sleeper', 'ascii-pov-0.8', 'app.js'), 'utf8');
  const boot = () => { const dom = makeDom({}); evalFile(code, 'sleeper/ascii-pov-0.8/app.js', dom.sandbox); return dom; };
  const dom = boot();
  const st = run(dom.sandbox, '__SLEEPER08__.selfTest()');
  const failing = st.tests.filter((t) => !t[1]).map((t) => t[0]);
  check('X', 'shipped selftest green on the shipped default corpus (clean-browser first visit)', st.ok === true,
    st.ok ? `${st.tests.length}/${st.tests.length}: ${st.tests.map((t) => t[0]).join(', ')}` : `FAILING ARM(S): ${failing.join(', ')} (${st.tests.length - failing.length}/${st.tests.length} pass)`);
  const s1 = run(dom.sandbox, 'JSON.stringify(__SLEEPER08__.state)');
  const dom2 = boot();
  const s2 = run(dom2.sandbox, 'JSON.stringify(__SLEEPER08__.state)');
  const pick = (s) => { const w = JSON.parse(s); return { sourceHash: w.sourceHash, gates: w.gates.map((g) => g.id), lawState: w.lawState }; };
  if (failing.includes('local law changes 0')) {
    // diagnosis, computed from the page's own law: district-0 walls are
    // (x+phase)%m===0 && iy%3!==1, phase = (nh(sourceHash)+B*3+floor(V*7)) % m.
    const nhv = fnv1a(pick(s1).sourceHash) >>> 0;      // the page's nh(): FNV-1a over the sourceHash string
    const pA = nhv % 6, pB = (nhv + 4) % 6;            // m = 6 on BOTH sides: a: V=0,L=0; b: V=0.65,L=1 -> 6+1-1
    check('X', 'failing arm diagnosed: selftest sampling parity, not the field law',
      pA !== pB && pA % 2 === 1 && pB % 2 === 1,
      `district-0 phases ${pA} vs ${pB} (mod 6); the arm samples x,y step 2 and (x+p)%6===0 with even x needs p even, so BOTH laws are vacuous on its grid — a FALSE NEGATIVE of the selftest (odd x still changes: phases differ)`);
  }
  check('I1', 'phrase deterministically compiles the 64x64 coupled field (stable FNV-1a source hash)',
    pick(s1).sourceHash === pick(s2).sourceHash && /^[0-9a-f]{8}$/.test(pick(s1).sourceHash),
    `sourceHash ${pick(s1).sourceHash}; field ${run(dom.sandbox, '__SLEEPER08__.fieldHash()')}`);
  check('I1', 'same phrase, same gates, same ids in a fresh context', j(pick(s1).gates) === j(pick(s2).gates), pick(s1).gates.join(' '));
  const kinds = JSON.parse(run(dom.sandbox, 'JSON.stringify(__SLEEPER08__.state.gates.map(g=>g.kind))'));
  check('I2', 'implements the eight enacted gates + a real origin return',
    kinds.length === 8 && CANONICAL_GATES.every((n) => j(kinds).includes(n)),
    `measured: ${kinds.length} fixed-coordinate contracts, protocols = ${[...new Set(kinds)].join('|')}; no canonical gate name present`);
  const wit1 = JSON.parse(run(dom.sandbox, 'JSON.stringify(__SLEEPER08__.witness())'));
  const wit2 = JSON.parse(run(dom.sandbox, 'JSON.stringify(__SLEEPER08__.witness())'));
  check('I3', 'return artifact is the contract schema sleeper.one-return v2',
    wit1.schema === 'sleeper.one-return' && wit1.version === 2,
    `measured schema ${wit1.schema}; fields ${Object.keys(wit1).length}, no worldKey/version=${wit1.version}`);
  const { generatedAt: _a, ...w1r } = wit1; const { generatedAt: _b, ...w2r } = wit2;
  check('I3', 'artifact is byte-deterministic for the same state', j(wit1) === j(wit2),
    `differing paths: ${diffPaths(wit1, wit2).join(', ') || 'none'}`);
  check('I3', 'artifact is structurally deterministic apart from its own timestamps',
    j(w1r) === j(w2r), `differing paths: ${diffPaths(w1r, w2r).join(', ') || 'none'} (projection timing is baked into the witness)`);
  const sealA = run(dom.sandbox, '__SLEEPER08__.sealToken()'), sealB = run(dom.sandbox, '__SLEEPER08__.sealToken()');
  check('X', 'the seal token alone is byte-stable (the only deterministic digest the derivative emits)',
    sealA === sealB && sealA === run(dom2.sandbox, '__SLEEPER08__.sealToken()'),
    `seal ${String(sealA).slice(0, 60)}…`);
  const readme = readFileSync(join(REPO, 'sleeper', 'ascii-pov-0.8', 'README.md'), 'utf8');
  check('X', 'shipped README declares it an experiment, not the v2 engine',
    /Public experiment/.test(readme) && !/sleeper\.one-return/.test(readme), 'README.md: "Public experiment"');
  na('I4', 'field identity', 'derivative predates the ten-field catalogue and claims none');
  cur.fingerprint = `pov-field:${pick(s1).sourceHash}`;
}

// ── L5 · EXIT/RECOMPOSE PROJECTION (/sleeper/borrowed-river/) ─────────────
lineage('L5', 'EXIT/RECOMPOSE PROJECTION — /sleeper/borrowed-river/', 'sleeper/borrowed-river/engine.mjs', false);
{
  const E = await import(pathToFileURL(join(REPO, 'sleeper', 'borrowed-river', 'engine.mjs')).href);
  // grid-search route finder, same shape as the shipped test.mjs: an INDEPENDENT
  // path, never a preapproved stroke.
  function route(a, b) {
    const start = E.port(a), goal = E.port(b), nodes = [start, goal];
    for (let x = 80; x <= 3200; x += 30) for (let y = 520; y <= 940; y += 30) if (!E.rockAt({ x, y })) nodes.push({ x, y });
    const cost = new Map([[0, 0]]), prev = new Map(), open = new Set([0]);
    while (open.size) {
      let best = null; for (const o of open) if (best === null || cost.get(o) < cost.get(best)) best = o;
      const i = best; open.delete(i); if (i === 1) break;
      for (let k = 0; k < nodes.length; k++) {
        const d = Math.hypot(nodes[i].x - nodes[k].x, nodes[i].y - nodes[k].y);
        if (d > 32 || !d) continue;
        let clear = true;
        for (let t = 0; t <= 1; t += 0.1) if (E.rockAt({ x: nodes[i].x + (nodes[k].x - nodes[i].x) * t, y: nodes[i].y + (nodes[k].y - nodes[i].y) * t })) clear = false;
        const n = cost.get(i) + d;
        if (clear && n < (cost.get(k) ?? Infinity)) { cost.set(k, n); prev.set(k, i); open.add(k); }
      }
    }
    if (!prev.has(1)) return null;
    const path = []; for (let i = 1; i !== undefined; i = prev.get(i)) path.unshift(nodes[i]);
    return path;
  }
  let s = E.fresh();
  const first = 'bell', second = 'rain'; // one of the four authored branch combinations
  const legs = [];
  for (const to of ['reed', first, 'moon', second, 'shrine']) {
    const p = route(s.at, to);
    const r = p && E.sail(s, p);
    if (!r?.ok) throw new Error(`conformance: borrowed-river leg ${s.at} -> ${to} failed: ${r?.why ?? 'no route'}`);
    legs.push(p); s = r.state;
  }
  const r1 = { ok: true, to: s.at, cost: s.legs.reduce((n, l) => n + l.cost, 0), state: s };
  check('I1', 'no phrase input exists: identity is the authored geography (ports + rocks), not a seed',
    !('source' in E.fresh()) && E.PORTS.length === 8 && E.ROCKS.length === 8 && !('gates' in E.fresh()),
    `fresh() = ${j(E.fresh()).slice(0, 96)}…; 8 ports / ${E.ROCKS.length} rocks`);
  const replay = legs.reduce((st, p) => { const r = E.sail(st, p); return r.ok ? r.state : null; }, E.fresh());
  check('I1', 'the same drawn voyage replays to the same state (deterministic geometry, no clock, no hash)',
    !!replay && j(replay) === j(s), `5 legs home -> ${r1.to} via ${[first, second].join('/')}; ink ${Math.round(r1.cost)}px`);
  na('I2', 'eight enacted gates', 'borrowed-river claims no gates: eight lanterns with words, not eight enacted protocols');
  const done = E.finish({ ...s, at: 'shrine', returning: true });
  const witness1 = E.witness(done), witness2 = E.witness(done);
  check('I3', 'return artifact is schema sleeper.borrowed-river.return v1 and byte-deterministic (no timestamps)',
    witness1.schema === 'sleeper.borrowed-river.return' && witness1.version === 1 && j(witness1) === j(witness2),
    `words ${j(witness1.words)}, ${witness1.crossings} crossings, ${witness1.distance}px, branch ${witness1.branch}`);
  check('I3', 'artifact restores through the same replay validator (derived fields recomputed, not trusted)',
    (() => { const back = E.validate(witness1); return back.at === 'home' && back.complete === true; })(), 'validate(witness) -> finished voyage');
  let forgedRejected = false, forgedWhy = '';
  try { E.validate({ ...witness1, voyage: { ...witness1.voyage, legs: [{ ...witness1.voyage.legs[0], to: 'moon' }] } }); } catch (e) { forgedRejected = true; forgedWhy = String(e.message); }
  check('I3', 'a forged destination is rejected by replay', forgedRejected, forgedWhy || 'forged legs accepted');
  const r = spawnSync(process.execPath, ['--test', 'test.mjs'], { cwd: join(REPO, 'sleeper', 'borrowed-river'), encoding: 'utf8' });
  const m = /ℹ pass (\d+)[\s\S]*?ℹ fail (\d+)/.exec(r.stdout);
  check('X', 'shipped engine test suite green headless', !!m && m[2] === '0', m ? `${m[1]} pass / ${m[2]} fail (node --test test.mjs)` : r.stdout.slice(-200));
  const painting = join(REPO, 'sleeper', 'borrowed-river', 'landscape.jpg');
  if (existsSync(painting)) {
    const ladderCore = require(join(REPO, 'sleeper', 'ladder', 'ladder-core.js'));
    check('I4', 'supplies the painting whose bytes carry the ladder identity',
      sha256(readFileSync(painting)) === ladderCore.PAINTING_SHA256, `sha256 ${sha256(readFileSync(painting)).slice(0, 16)}… = ladder PAINTING_SHA256`);
  }
  cur.fingerprint = `river-voyage:${sha256(j(witness1)).slice(0, 16)}`;
}

// ── L6 · RESOLUTION LADDER (/sleeper/ladder/) ──────────────────────────────
lineage('L6', 'RESOLUTION LADDER — /sleeper/ladder/', 'sleeper/ladder/ladder-core.js', false);
{
  const CORE = require(join(REPO, 'sleeper', 'ladder', 'ladder-core.js'));
  const tag = CORE.tag8(CORE.PAINTING_ID + CORE.PAINTING_SHA256);
  check('I1', 'one stable hash names painting = city = artifact (house hash32, absorbed from lib/moire-ambient.js)',
    tag === 'f0f09635' && CORE.hash32('sleeper') === CORE.hash32('sleeper') && CORE.hash32('sleeper') !== CORE.hash32('sleepers'),
    `paintingTag ${tag} for ${CORE.PAINTING_ID}`);
  const paintingBytes = readFileSync(join(REPO, 'sleeper', 'borrowed-river', 'landscape.jpg'));
  check('I1', 'identity is bound to the REAL painting bytes, not a constant copied blind',
    sha256(paintingBytes) === CORE.PAINTING_SHA256, `sha256 ${sha256(paintingBytes)}…`);
  check('I1', 'route seed = hash32(tag | witness): deterministic, and different witnesses differ',
    CORE.routeSeed(tag, 'UDLR') === CORE.routeSeed(tag, 'UDLR') && CORE.routeSeed(tag, 'UDLR') !== CORE.routeSeed(tag, 'DULR'),
    `UDLR ${CORE.routeSeed(tag, 'UDLR')} vs DULR ${CORE.routeSeed(tag, 'DULR')}`);
  const sourcePath = join(REPO, 'recovery', 'sleeper', 'site-source-2026-09-18', 'docs', 'ONE_RETURN_V2.md');
  check('I4', 'ENTERED matter is the canonical contract document itself (source fetched from the recovery shelf)',
    existsSync(sourcePath) && /ONE_RETURN_V2\.md/.test(readFileSync(join(REPO, 'sleeper', 'ladder', 'SPEC.md'), 'utf8')),
    'SPEC.md pipeline: ONE_RETURN_V2.md -> paragraph=district, sentence=building, word=room, char=material');
  na('I2', 'eight enacted gates', 'the ladder claims no gates: four distances + the return-to-origin move');
  check('X', 'ladder-core contains no canonical gate name (evidence for the n/a above)',
    !CANONICAL_GATES.some((n) => readFileSync(join(REPO, 'sleeper', 'ladder', 'ladder-core.js'), 'utf8').includes(`'${n}'`)),
    'FAR / NEAR / ENTERED / EXITED; origin return = the ninth-gate move');
  const r = spawnSync(process.execPath, ['sleeper/ladder/ladder-selftest.mjs'], { cwd: REPO, encoding: 'utf8' });
  const counts = /(\d+) passed, (\d+) failed/.exec(r.stdout);
  check('I3', 'shipped ladder selftest green headless (determinism laws included)',
    r.status === 0 && !!counts && counts[2] === '0', counts ? `${counts[1]} passed / ${counts[2]} failed (node sleeper/ladder/ladder-selftest.mjs)` : r.stdout.slice(-200));
  const mad = /rest-vs-original ([0-9.]+)/.exec(r.stdout)?.[1];
  check('I3', 'empty route restores the painting exactly (mad64 0.0000, changedPx 0)',
    mad === '0.0000' && /empty route recomposes to the ORIGINAL bytes/.test(r.stdout),
    `mad64 rest-vs-original ${mad}; law line: "${/mad64[^\n]*/i.exec(r.stdout)?.[0]?.trim() ?? ''}"`);
  cur.fingerprint = `ladder-tag:${tag}`;
}

// ── verdicts ───────────────────────────────────────────────────────────────
function verdictOf(l) {
  const real = (inv) => l.checks.filter((c) => c.inv === inv && !c.na);
  const anyFail = ['I1', 'I2', 'I3', 'I4'].some((inv) => real(inv).some((c) => !c.ok));
  if (anyFail) return { verdict: 'NON-CONFORMING', why: 'a value it implements contradicts the contract (FAIL lines carry the evidence)' };
  if (l.claimant) return { verdict: 'CONFORMS', why: 'claimant of the recovered law: every canonical value I1–I4 measured matching' };
  return { verdict: 'PROJECTION', why: 'not a claimant: lawful subset aspect, own stable identity chain, no canonical value contradicted' };
}
console.log('\n' + '═'.repeat(96));
console.log('SLEEPER CONFORMANCE — per-lineage verdicts (rule: sleeper/CONTRACT.md §5)');
console.log('═'.repeat(96));
console.log('lineage'.padEnd(6) + 'verdict'.padEnd(18) + 'I1 city'.padEnd(10) + 'I2 gates'.padEnd(10) + 'I3 artifact'.padEnd(13) + 'I4 fields');
let nonconforming = 0, projections = 0, conforms = 0;
for (const l of LINEAGES) {
  const cell = (inv) => { const cs = l.checks.filter((c) => c.inv === inv); if (!cs.length) return '—'; return cs.some((c) => !c.ok) ? 'FAIL' : 'ok'; };
  const v = verdictOf(l); l.verdict = v.verdict; l.why = v.why;
  if (v.verdict === 'CONFORMS') conforms++; else if (v.verdict === 'PROJECTION') projections++; else nonconforming++;
  console.log(l.id.padEnd(6) + v.verdict.padEnd(18) + cell('I1').padEnd(10) + cell('I2').padEnd(10) + cell('I3').padEnd(13) + cell('I4'));
}
console.log('─'.repeat(96));
for (const l of LINEAGES) console.log(`${l.id} ${l.verdict} — ${l.why}`);
console.log('─'.repeat(96));
for (const l of LINEAGES) if (l.fingerprint) console.log(`FINGERPRINT ${l.id} ${l.fingerprint}`);
console.log(`\nTOTALS  CONFORMS ${conforms} · PROJECTION ${projections} · NON-CONFORMING ${nonconforming}`);
const totalChecks = LINEAGES.reduce((n, l) => n + l.checks.filter((c) => !c.na).length, 0);
const failedChecks = LINEAGES.reduce((n, l) => n + l.checks.filter((c) => !c.na && !c.ok).length, 0);
const claimantFails = LINEAGES.filter((l) => l.claimant).reduce((n, l) => n + l.checks.filter((c) => !c.na && !c.ok).length, 0);
console.log(`CHECKS  ${totalChecks - failedChecks}/${totalChecks} pass; ${failedChecks} FAIL = discovered mismatches (all on non-claimant lineages unless stated)`);
const claimantsOk = claimantFails === 0 && LINEAGES.filter((l) => l.claimant).every((l) => l.verdict === 'CONFORMS');
console.log(claimantsOk
  ? 'OVERALL: canonical + native port CONFORM; every deviation classified with measured evidence. Exit 0.'
  : `OVERALL: ${claimantFails} check(s) failed on a claimant lineage — resolve before publishing. Exit 1.`);
process.exit(claimantsOk ? 0 : 1);
