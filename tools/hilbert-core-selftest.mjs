// selftest.mjs — house-style executable spec for hilbert-core.mjs. Run: node selftest.mjs
// PASS/FAIL lines; exits non-zero (assertion throw) if any law is violated.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_N,
  MAX_ORDER,
  append,
  hilbertD,
  hilbertXY,
  layout,
  layoutSignature,
  tombstone,
  verifyLayout,
} from '../lib/hilbert-core.mjs';

// ---------------------------------------------------------------- 1. curve ----
// Standard iterative xy2d/d2xy: exhaustive round-trip, bijection and unit-step continuity.
for (let n = 0; n <= 5; n += 1) {
  const capacity = 4 ** n;
  const seen = new Set();
  let prev = null;
  for (let d = 0; d < capacity; d += 1) {
    const [x, y] = hilbertXY(n, d);
    seen.add(`${x},${y}`);
    assert.equal(hilbertD(n, x, y), d, `xy2d∘d2xy round-trip, order ${n}, d=${d}`);
    assert.deepEqual(hilbertXY(n, hilbertD(n, x, y)), [x, y], `d2xy∘xy2d round-trip, order ${n}`);
    if (prev !== null && n >= 1) {
      assert.equal(Math.abs(x - prev[0]) + Math.abs(y - prev[1]), 1, `curve continuous at d=${d} of order ${n}`);
    }
    prev = [x, y];
  }
  assert.equal(seen.size, capacity, `curve is bijective over the whole grid, order ${n}`);
}
// Orientation pins (the standard curve, verbatim).
assert.deepEqual([[0, 0], [0, 1], [1, 1], [1, 0]], Array.from({ length: 4 }, (_, d) => hilbertXY(1, d)));
assert.deepEqual(
  [[0,0],[1,0],[1,1],[0,1],[0,2],[0,3],[1,3],[1,2],[2,2],[2,3],[3,3],[3,2],[3,1],[2,1],[2,0],[3,0]],
  Array.from({ length: 16 }, (_, d) => hilbertXY(2, d)),
);
assert.deepEqual(hilbertXY(2, 3), hilbertXY(2, 3), 'curve deterministic within a process');
assert.throws(() => hilbertXY(2, 16), /outside/);
assert.throws(() => hilbertXY(-1, 0), /grid order/);
assert.throws(() => hilbertXY(MAX_ORDER + 1, 0), /grid order/);
assert.throws(() => hilbertD(2, 4, 0), /outside/);
console.log('PASS: curve — xy2d/d2xy round-trip + bijection + continuity on every cell of orders 0..5; orientation pinned');

// --------------------------------------------------------- 2. layout modes ----
// Simple mode: weight 1 -> exactly one cell per object, w=h=1, exact cell position.
const simple = layout(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((key) => ({ key })));
simple.forEach((item, i) => {
  assert.equal(item.d, i, 'fresh layout allocates back-to-back from cell 0');
  assert.equal(item.cells, 1);
  assert.deepEqual([item.x, item.y], hilbertXY(DEFAULT_N, item.d), 'x,y are the curve cell');
  assert.equal(item.w, 1);
  assert.equal(item.h, 1);
  assert.equal(item.dead, false);
});
assert.equal(verifyLayout(simple), true);
// Weighted mode: each key owns a contiguous run; total cell area equals sum of whole-cell weights.
const weighted = layout([
  { key: 'alpha', weight: 1 },
  { key: 'beta', weight: 2 },
  { key: 'gamma', weight: 1 },
  { key: 'delta', weight: 4 },
]);
const weightedAssignments = [
  { key: 'alpha', weight: 1 },
  { key: 'beta', weight: 2 },
  { key: 'gamma', weight: 1 },
  { key: 'delta', weight: 4 },
];
assert.deepEqual(weighted.map((i) => [i.key, i.d, i.x, i.y, i.w, i.h, i.cells]), [
  ['alpha', 0, 0, 0, 1, 1, 1],
  ['beta', 1, 1, 0, 1, 2, 2],
  ['gamma', 3, 0, 1, 1, 1, 1],
  ['delta', 4, 0, 2, 2, 2, 4],
], 'weighted geometry pinned');
let cursor = 0;
let totalCells = 0;
for (const item of weighted) {
  assert.equal(item.d, cursor, `run of '${item.key}' is contiguous with the previous run`); // no gaps on a fresh grid
  for (let c = item.d; c < item.d + item.cells; c += 1) {
    const [cx, cy] = hilbertXY(DEFAULT_N, c);
    assert.ok(cx >= item.x && cx < item.x + item.w && cy >= item.y && cy < item.y + item.h, `bbox of '${item.key}' contains every cell of its run`);
  }
  cursor = item.d + item.cells;
  totalCells += item.cells;
}
assert.equal(totalCells, 1 + 2 + 1 + 4, 'weighted mode preserves total area in cell units');
assert.equal(layout([{ key: 'half', weight: 0.5 }])[0].cells, 1, 'weights round up to whole cells, minimum 1');
assert.equal(layout([{ key: 'twohalf', weight: 2.5 }])[0].cells, 3, 'weights round half-up to whole cells');
assert.throws(() => layout([{ key: 'z', weight: 0 }]), /weight must be a finite number/);
assert.throws(() => layout([{ key: 'z', weight: Number.NaN }]), /weight must be a finite number/);
assert.throws(() => layout([{ key: 'z', weight: '2' }]), /weight must be a finite number/);
assert.throws(() => layout([{ key: 'dup' }, { key: 'dup' }]), /duplicate key/);
console.log('PASS: layout — simple mode exact single cells; weighted runs contiguous, total cell area preserved, refusals fire');

// ------------------------------------------------------------- 3. signature ----
// Regression pins: any change to geometry, tombstone state or format must break these.
assert.equal(layoutSignature(weighted), 'fnv1a:933c130b', 'PINFN — re-pin deliberately after an intentional format change');
assert.equal(layoutSignature(weighted.map((it) => (it.key === 'beta' ? { ...it, dead: true } : it))), 'fnv1a:8f25e364', 'tombstone changes the signature');
assert.equal(layoutSignature(weighted.slice().reverse()), 'fnv1a:933c130b', 'signature is canonical — item order in the stream cannot change it');
assert.notEqual(layoutSignature(weighted), layoutSignature(simple));
console.log('PASS: signature — pinned fnv1a:933c130b live / fnv1a:8f25e364 tombstoned; canonical and order-independent');

// ------------------------------------------------- 4. THE CENTRAL PROPERTY ----
// 1000 objects, one-by-one, asserting after EVERY append: every prior position IDENTICAL
// (zero reflows), every cell distinct, every mark in bounds. Keys come from a seeded LCG
// living ONLY in this test file — the shipped core contains no randomness at all.
const makeLcg = (seed) => {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0; // test-only LCG
    return state / 2 ** 32;
  };
};
const makeKeys = (count, seed) => {
  const next = makeLcg(seed);
  return Array.from({ length: count }, (_, i) => `k${i}-${Math.floor(next() * 0x1000000).toString(16)}`);
};
const TOTAL = 1000;
const keysA = makeKeys(TOTAL, 20261020);
assert.deepEqual(makeKeys(TOTAL, 20261020), keysA, 'LCG key generation is deterministic');

const runChain = (keys) => {
  const capacity = 4 ** DEFAULT_N;
  const occupancy = new Uint8Array(capacity); // distinctness oracle: every reserved cell marked once
  const baseline = new Map(); // value snapshot taken at placement time
  let items = [];
  let frontier = 0;
  let reflows = 0;
  let collisions = 0;
  let outOfBounds = 0;
  for (const key of keys) {
    items = append(items, [key]);
    const item = items[items.length - 1];
    // zero reflows: every PRIOR item keeps the exact {x,y,w,h} it had when placed
    for (const prior of items.slice(0, -1)) {
      if (`${prior.x},${prior.y},${prior.w},${prior.h}` !== baseline.get(prior.key)) reflows += 1;
    }
    // new mark: tail of the curve, free cells only, exact cell geometry, in bounds
    assert.equal(item.d, frontier, 'new objects take the NEXT free cell — allocation is tail-monotone');
    for (let c = item.d; c < item.d + item.cells; c += 1) {
      if (occupancy[c] !== 0) collisions += 1;
      occupancy[c] = 1;
    }
    if (item.x < 0 || item.y < 0 || item.x >= 1 << DEFAULT_N || item.y >= 1 << DEFAULT_N) outOfBounds += 1;
    assert.deepEqual([item.x, item.y], hilbertXY(DEFAULT_N, item.d), 'placed x,y come from the curve');
    assert.equal(item.w, 1);
    assert.equal(item.h, 1);
    frontier = item.d + item.cells;
    baseline.set(item.key, `${item.x},${item.y},${item.w},${item.h}`);
    assert.equal(verifyLayout(items), true, 'the core re-verifies its own invariant on every write');
  }
  return { items, reflows, collisions, outOfBounds, used: occupancy.reduce((a, b) => a + b, 0), signature: layoutSignature(items) };
};
const run1 = runChain(keysA);
assert.equal(run1.reflows, 0, 'ZERO reflows across 1000 one-by-one appends');
assert.equal(run1.collisions, 0, 'ZERO cell collisions');
assert.equal(run1.outOfBounds, 0, 'ZERO out-of-bounds marks');
assert.equal(run1.items.length, TOTAL);
assert.equal(run1.used, TOTAL, 'occupancy oracle: exactly 1000 distinct reserved cells');
console.log(`PASS: central property test — 1000 objects appended one-by-one: 0 reflows, 0 collisions, 0 out-of-bounds, 1000 distinct cells`);

// ----------------------------------------------------------- 5. tombstone ----
// Deletion never renumbers: dead-but-kept items hold their exact position and stay reserved.
const room = layout(Array.from({ length: 12 }, (_, i) => ({ key: `m${i}` })), { n: 3 });
const liveSig = layoutSignature(room);
const dead = tombstone(room, 'm5');
assert.equal(dead[5].dead, true, 'tombstone marks the key dead');
assert.deepEqual(
  ['d', 'x', 'y', 'w', 'h', 'cells', 'n'].map((f) => dead[5][f]),
  ['d', 'x', 'y', 'w', 'h', 'cells', 'n'].map((f) => room[5][f]),
  'the tombstoned mark keeps its exact position and reservation',
);
for (let i = 0; i < room.length; i += 1) {
  if (i !== 5) assert.equal(dead[i], room[i], 'every other item is untouched — same object, same position');
}
assert.equal(verifyLayout(dead), true);
assert.notEqual(layoutSignature(dead), liveSig, 'gap state is visible in the geometry hash');
const grown = append(dead, ['m12']);
assert.equal(grown[12].d, 12, 'append never reuses the tombstoned cell — the gap stays a gap');
assert.notEqual(grown[12].d, room[5].d);
assert.equal(grown[5].dead, true);
assert.deepEqual(['x', 'y', 'w', 'h'].map((f) => grown[5][f]), ['x', 'y', 'w', 'h'].map((f) => room[5][f]));
for (let i = 0; i < grown.length - 1; i += 1) {
  assert.deepEqual(['x', 'y', 'w', 'h'].map((f) => grown[i][f]), ['x', 'y', 'w', 'h'].map((f) => room[i][f]), 'deletion + append renumber nothing');
}
const curried = tombstone('m7')(room); // single-argument form from the contract
assert.equal(curried[7].dead, true);
const twice = tombstone(dead, 'm5'); // idempotent
assert.equal(twice[5].dead, true);
assert.equal(twice[5], dead[5]);
assert.throws(() => tombstone(room, 'not-placed'), /not placed/);
assert.throws(() => tombstone(''), /non-empty string/);
console.log('PASS: tombstone — dead-but-kept: exact position preserved, cell never reused, nothing renumbered, idempotent, curried form');

// ----------------------------------------------------- 6. refusals / teeth ----
// Every validator rule proven by a deliberately broken input.
const it4 = layout(['a', 'b'], { n: 4 });
assert.deepEqual(append(it4, ['c']).map((i) => [i.key, i.d, i.n]), [['a', 0, 4], ['b', 1, 4], ['c', 2, 4]], 'append infers the frozen n from the stream — two-argument contract');
assert.throws(() => append(it4, ['c'], { n: 3 }), /law #1/, 'wrong opts.n would move positions — refused');
assert.throws(() => append(it4, ['a']), /already placed/, 'append is append-only');
assert.throws(() => verifyLayout(simple.map((it, i) => (i === 1 ? { ...it, x: it.x + 1 } : it))), /does not match curve order/, 'tampered geometry refused');
assert.throws(() => verifyLayout([
  { key: 'a', d: 0, x: 0, y: 0, w: 2, h: 1, cells: 2, dead: false, n: 2 },
  { key: 'b', d: 1, x: 1, y: 0, w: 1, h: 1, cells: 1, dead: false, n: 2 },
]), /overlap/, 'overlapping reservations refused');
assert.throws(() => verifyLayout([{ key: 'a', d: 14, x: 0, y: 0, w: 1, h: 1, cells: 4, dead: false, n: 2 }]), /exceeds grid capacity/, 'out-of-grid block refused');
assert.throws(() => verifyLayout([
  { key: 'a', d: 0, x: 0, y: 0, w: 1, h: 1, cells: 1, dead: false, n: 2 },
  { key: 'b', d: 1, x: 1, y: 0, w: 1, h: 1, cells: 1, dead: false, n: 4 },
]), /mixed grid orders/, 'mixed grid orders refused');
const tiny = layout(Array.from({ length: 15 }, (_, i) => ({ key: `t${i}` })), { n: 2 });
assert.equal(append(tiny, ['last'])[15].d, 15, 'the final free cell is still allocatable');
assert.throws(() => append(tiny, ['last', 'over']), /grid full/, 'a full grid refuses instead of compacting');
assert.throws(() => layout(Array.from({ length: 17 }, (_, i) => ({ key: `u${i}` })), { n: 2 }), /grid full/);
assert.equal(append(append(layout(['r', 's']), ['t']), ['u'])[3].key, 'u', 'bare key strings are accepted everywhere');
console.log('PASS: refusals — frozen-n mismatch, tampered geometry, overlap, capacity, duplicates, grid-full all throw with named laws');

// -------------------------------------------------------- 7. determinism ----
// Same input -> same layout and same signature, across a full replay of the 1000-chain.
assert.deepEqual(layout(weightedAssignments), weighted, 'layout is a pure function of its assignments');
assert.deepEqual(layout(weightedAssignments), weighted.slice(), 'and stable across calls');
const run2 = runChain(makeKeys(TOTAL, 20261020));
assert.deepEqual(run2.items, run1.items, 'a full replay produces a byte-identical item stream');
assert.equal(run2.signature, run1.signature, 'and an identical geometry hash');
const source = readFileSync(fileURLToPath(new URL('../lib/hilbert-core.mjs', import.meta.url)), 'utf8');
assert.equal(source.includes('Math.random'), false, 'shipped core contains no source of randomness');
assert.equal(source.includes('import '), false, 'shipped core has zero dependencies');
assert.equal(/\b(document|window)\b/.test(source), false, 'shipped core has no DOM');
console.log('PASS: determinism — identical layouts and signatures across full replays; core has no randomness, no deps, no DOM');

console.log(`PASS: ALL — 7 sections; central property test ${TOTAL} objects, 0 reflows; SIG: ${run1.signature}`);
