/* selftest.mjs — node, zero dependencies.
   Verifies the memory graph's contract:
     1. layout is deterministic (same ids ⇒ same position hash/signature)
     2. every edge references an existing node (and legal label, no self-loops)
     3. tap-neighbourhood returns the correct connected set for 3 known nodes
     4. degrees match edge counts (hand-checked totals)
   Plus: positions stay inside the logical canvas, and shipped source
   contains no Math.random. Prints PASS/FAIL per check; exit 1 on any FAIL. */

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const DATA = require('./data.js');
const CORE = require('./core.js');

const { NODES, EDGES, LABELS } = DATA;
const results = [];

function check(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

function shuffle(arr, seed) {
  /* deterministic shuffle (no Math.random anywhere, incl. the test) */
  const a = arr.slice();
  let s = seed >>> 0;
  for (let i = a.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function posHashOf(nodes) {
  /* per-run position hash: id -> x:y, the thing that must not move */
  const pos = CORE.layout(nodes);
  return Object.keys(pos).sort().map(id => `${id}=${pos[id].x},${pos[id].y}`).join('|');
}

console.log('memory graph selftest — lane "memory"');
console.log(`nodes=${NODES.length} edges=${EDGES.length} types=${NODES.map(n => n.type).filter((t, i, s) => s.indexOf(t) === i).length}`);
console.log('');

/* ---- 1. layout determinism ------------------------------------------- */
{
  const runs = [
    CORE.layout(NODES),
    CORE.layout(NODES),
    CORE.layout(shuffle(NODES, 0xC0FFEE)),
    CORE.layout(shuffle(NODES, 0x5EED)),
    CORE.layout([...NODES].reverse())
  ];
  const ref = JSON.stringify(runs[0]);
  const allSame = runs.every(r => JSON.stringify(r) === ref);
  check('layout deterministic: repeated + shuffled/reversed input give identical positions',
    allSame, allSame ? `signature ${CORE.layoutSignature(NODES)}` : 'run diverged');

  const sigs = [CORE.layoutSignature(NODES), CORE.layoutSignature(shuffle(NODES, 7))];
  check('layout signature stable for same ids (position hash)',
    sigs[0] === sigs[1], `${sigs[0]} vs ${sigs[1]}`);

  /* golden regression: if these move, the layout algorithm changed on purpose */
  const GOLDEN_SIG = 'e1eaa1a2';
  const GOLDEN = { dad: '579d3063', 'fovea-lens': '61d2eddb', 'void-deck': 'c38c852d' };
  const sigOk = CORE.layoutSignature(NODES) === GOLDEN_SIG;
  const hashOk = Object.entries(GOLDEN)
    .every(([id, h]) => CORE.nodeHash(id).toString(16).padStart(8, '0') === h);
  check('golden position hash unchanged (id-hash regression)',
    sigOk && hashOk, sigOk && hashOk ? `sig ${GOLDEN_SIG}, nodeHash dad=${GOLDEN.dad}` : `sig ${CORE.layoutSignature(NODES)}`);

  /* distinct ids must not collide onto one spot */
  const pos = runs[0];
  const keys = Object.keys(pos);
  let minGap = Infinity;
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const a = pos[keys[i]], b = pos[keys[j]];
      if (a.lane !== b.lane) continue;
      minGap = Math.min(minGap, Math.hypot(a.x - b.x, a.y - b.y));
    }
  }
  check('same-lane nodes keep readable separation (no overlap)',
    minGap >= CORE.MIN_GAP - 0.01, `min gap ${minGap.toFixed(2)}px >= ${CORE.MIN_GAP}px`);
}

/* ---- 2. edge integrity ------------------------------------------------ */
{
  const ids = new Set(NODES.map(n => n.id));
  const bad = EDGES.filter(e => !ids.has(e.src) || !ids.has(e.dst));
  check('every edge references existing nodes',
    bad.length === 0, bad.length ? JSON.stringify(bad) : `${EDGES.length}/${EDGES.length} edges valid`);

  const badLabel = EDGES.filter(e => !LABELS.includes(e.label));
  check('every edge uses a legal relation label',
    badLabel.length === 0, badLabel.length ? JSON.stringify(badLabel) : LABELS.join(','));

  const selfLoops = EDGES.filter(e => e.src === e.dst);
  const dupIds = EDGES.map(e => e.id).filter((id, i, a) => a.indexOf(id) !== i);
  check('no self-loops, edge ids unique',
    selfLoops.length === 0 && dupIds.length === 0,
    `selfloops=${selfLoops.length} dups=${dupIds.length}`);

  const orphan = NODES.filter(n => !EDGES.some(e => e.src === n.id || e.dst === n.id));
  check('no isolated nodes (every node reachable)',
    orphan.length === 0, orphan.length ? JSON.stringify(orphan.map(n => n.id)) : 'all connected');
}

/* ---- 3. tap-neighbourhood: 3 known nodes, expected sets hand-written --- */
{
  const cases = [
    {
      id: 'dad',
      nodes: ['dad', 'nuh', 'mum', 'yu', 'sunday-call', 'quiet-by-default'],
      edges: ['e01', 'e05', 'e06', 'e08', 'e12'],
      neigh: ['nuh', 'mum', 'yu', 'sunday-call', 'quiet-by-default'],
      deg: 5
    },
    {
      id: 'fovea-lens',
      nodes: ['fovea-lens', 'measure-first', 'never-fabricate'],
      edges: ['e19', 'e20'],
      neigh: ['measure-first', 'never-fabricate'],
      deg: 2
    },
    {
      id: 'void-deck',
      nodes: ['void-deck', 'sg'],
      edges: ['e28'],
      neigh: ['sg'],
      deg: 1
    }
  ];
  for (const c of cases) {
    const got = CORE.neighbourhood(EDGES, c.id);
    const eq = (a, b) => a.length === b.length && [...a].sort().every((v, i) => v === [...b].sort()[i]);
    const ok = eq(got.nodes, c.nodes) && eq(got.edges, c.edges) && eq(got.neighbours, c.neigh) && got.deg === c.deg;
    check(`tap-neighbourhood("${c.id}") → {${c.neigh.join(', ')}} / ${c.edges.join(',')}`,
      ok, ok ? `deg ${got.deg}` : `got ${JSON.stringify(got)}`);
  }
}

/* ---- 4. degrees match edge counts ------------------------------------- */
{
  /* independent count, built here rather than trusting core.js */
  const hand = {};
  NODES.forEach(n => { hand[n.id] = 0; });
  EDGES.forEach(e => { hand[e.src]++; hand[e.dst]++; });
  const core = CORE.degrees(EDGES, NODES.map(n => n.id));
  const mismatch = Object.keys(hand).filter(id => hand[id] !== core[id]);
  check('degrees match independently counted edge incidences',
    mismatch.length === 0, mismatch.length ? mismatch.join(',') : `${Object.keys(hand).length} nodes agree`);

  const sum = Object.values(core).reduce((a, b) => a + b, 0);
  check(`degree sum = 2 × edges (${sum} = 2 × ${EDGES.length})`,
    sum === 2 * EDGES.length, `${sum}`);

  const spot = { dad: 5, sg: 5, 'corpus-v3': 4, 'void-deck': 1, 'provenance-or-silence': 1 };
  const spotOk = Object.entries(spot).every(([id, d]) => core[id] === d);
  check('spot-checked degrees (dad 5, sg 5, corpus-v3 4, void-deck 1, provenance-or-silence 1)',
    spotOk, Object.entries(spot).map(([id, d]) => `${id}:${core[id]}`).join(' '));
}

/* ---- 5. invariants of the shipped page -------------------------------- */
{
  const pos = CORE.layout(NODES);
  const inBounds = Object.values(pos).every(q =>
    q.x >= CORE.PAD && q.x <= CORE.LOGICAL_W - CORE.PAD &&
    q.y >= CORE.TOP - CORE.LANE_H / 2 && q.y <= CORE.TOP + 6 * CORE.LANE_H + 8);
  check('all positions inside logical canvas 390×602',
    inBounds, inBounds ? 'in bounds' : 'out of bounds');

  const fs = require('fs');
  const files = ['app.js', 'core.js', 'data.js'];
  /* strip comments first: the sources *document* the no-random rule */
  const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const rnd = files.filter(f =>
    strip(fs.readFileSync(new URL(f, import.meta.url), 'utf8')).includes('Math.random'));
  check('shipped source contains no Math.random',
    rnd.length === 0, rnd.length ? rnd.join(',') : 'none in ' + files.join('/'));
}

/* ---- summary ---------------------------------------------------------- */
const pass = results.filter(r => r.ok).length;
const fail = results.length - pass;
console.log('');
console.log(`${fail === 0 ? 'PASS' : 'FAIL'}  RESULT ${pass}/${results.length} checks`);
if (fail) {
  results.filter(r => !r.ok).forEach(r => console.log(`  ✗ ${r.name}`));
}
process.exit(fail === 0 ? 0 : 1);
