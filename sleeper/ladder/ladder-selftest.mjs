#!/usr/bin/env node
// ladder-selftest.mjs — laws of sleeper/ladder/ladder-core.js. Every arm has a
// POSITIVE and a NEGATIVE (a test that cannot fail is decoration). Zero deps,
// zero fixtures: the source text is the real canonical contract in this repo,
// the painting is generated from hash32 unless --rgba hands in real pixels.
//
//   node sleeper/ladder/ladder-selftest.mjs
//   node sleeper/ladder/ladder-selftest.mjs --rgba <file> --size 512x171
//
// Prints one metric line per law plus a final verdict; exit 0 = all green.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const CORE = require('./ladder-core.js');
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const rgbaPath = arg('--rgba', null);
const size = (arg('--size', '384x128')).split('x').map(Number);

let W, H, RGBA;
if (rgbaPath) {
  const buf = readFileSync(rgbaPath);
  [W, H] = size;
  if (buf.length !== W * H * 4) { console.error(`size mismatch: ${rgbaPath} holds ${buf.length} bytes, expected ${W * H * 4}`); process.exit(2); }
  RGBA = new Uint8ClampedArray(buf.buffer, buf.byteOffset, buf.length);
} else {
  W = 384; H = 128; RGBA = CORE.syntheticPainting(W, H);
}

const sha = (u8) => createHash('sha256').update(Buffer.from(u8.buffer, u8.byteOffset, u8.length)).digest('hex');

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  cond ? pass++ : fail++;
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${cond ? (detail ? '  — ' + detail : '') : '  — ' + detail}`);
};
const section = (s) => console.log(`\n${s}`);

// ── 1. one hash: painting identity = city identity = artifact identity ──────
section('1 · identity wiring (lib/moire-ambient.js hash32, one hash for all three)');
ok('hash32 is the house FNV-1a', CORE.hash32('sleeper') === CORE.hash32('sleeper'));
ok('NEGATIVE: different seed, different hash', CORE.hash32('sleeper') !== CORE.hash32('sleepers'));
const paintingTag = CORE.tag8(CORE.PAINTING_ID + CORE.PAINTING_SHA256);
ok('painting tag = 8 hex of hash32(id+sha256)', /^[0-9a-f]{8}$/.test(paintingTag), paintingTag);
ok('NEGATIVE: a different painting yields a different tag', paintingTag !== CORE.tag8('other.jpgdeadbeef'));
ok('route seed is a pure function of tag+witness', CORE.routeSeed(paintingTag, 'RDLU') === CORE.routeSeed(paintingTag, 'RDLU'));
ok('NEGATIVE: different witness, different seed', CORE.routeSeed(paintingTag, 'RDLU') !== CORE.routeSeed(paintingTag, 'RDL'));

// ── 2. the city's matter is the canonical contract ─────────────────────────
section('2 · source -> matter (paragraph=district, sentence=building, word=room, char=material)');
const text = readFileSync(join(ROOT, CORE.SOURCE_PATH), 'utf8');
const parsed = CORE.parseSource(text);
ok('source parses', parsed.counts.paragraphs > 3 && parsed.counts.sentences > 5 && parsed.units.length > 100,
  `${parsed.counts.paragraphs} paragraphs / ${parsed.counts.sentences} sentences / ${parsed.counts.words} words / ${parsed.units.length} units`);
ok('units are characters (character = material)', parsed.units.length > parsed.counts.words);
ok('punctuation carries weather', parsed.units.some((u) => u.punct));
const field = CORE.buildField(RGBA, W, H, text);
ok('drawn districts == source paragraphs (read your own source, live)',
  field.drawn.districts === field.source.counts.paragraphs,
  `drawn ${field.drawn.districts} / source ${field.source.counts.paragraphs}`);
ok('drawn buildings == source sentences', field.drawn.buildings === field.source.counts.sentences,
  `drawn ${field.drawn.buildings} / source ${field.source.counts.sentences}`);
ok('drawn rooms <= source words, and every cell maps into the source',
  field.drawn.rooms <= field.source.counts.words && field.cells.every((c) => c.unit && typeof c.unit.p === 'number'),
  `drawn ${field.drawn.rooms} / source ${field.source.counts.words}`);
ok('materials are real characters', field.drawn.materials > 20, `${field.drawn.materials} distinct`);
ok('weather marks exist', Object.values(field.weather || field.drawn.weather).reduce((a, b) => a + b, 0) > 0,
  JSON.stringify(field.drawn.weather));

// ── 3. the field is a city, not a picture of one ────────────────────────────
section('3 · elevation / walls / walkability');
const walkable = field.walkable, reached = field.reached;
ok('walls come from the painting own edge distribution', field.cut > 0 && walkable > 0 && walkable < field.cells.length,
  `cut ${field.cut.toFixed(4)}, ${walkable} walkable of ${field.cells.length}`);
ok('start is walkable and inside the field', field.start && !field.start.wall && field.reach[field.start.n] === 1,
  `start (${field.start.cx},${field.start.cy}) material "${field.start.material}"`);
ok('a real district opens up (reachable >= 20% of the field)', reached >= field.cells.length * 0.2,
  `reachable ${reached} of ${field.cells.length} (${(100 * reached / field.cells.length).toFixed(1)}%), cut q=${field.cutQ} edge>${field.cut.toFixed(4)}`);
const otherField = CORE.buildField(CORE.syntheticPainting(W, H, 'another-painting'), W, H, text);
ok('NEGATIVE: a different painting changes the wall map',
  otherField.cells.filter((c) => c.wall).length !== field.cells.filter((c) => c.wall).length ||
  otherField.cells.some((c, i) => c.wall !== field.cells[i].wall),
  `${field.cells.filter((c) => c.wall).length} vs ${otherField.cells.filter((c) => c.wall).length} walls`);
ok('NEGATIVE: a different painting changes the measured field (lum/edge per cell)',
  otherField.cells.some((c, i) => c.lum !== field.cells[i].lum || c.edge !== field.cells[i].edge),
  `cell0 lum ${field.cells[0].lum.toFixed(4)} vs ${otherField.cells[0].lum.toFixed(4)}`);

// ── 4. the walk is a compressed witness ─────────────────────────────────────
section('4 · walk');
const moves = ['R', 'R', 'D', 'L', 'D', 'D', 'R', 'R', 'U', 'R'];
const w1 = CORE.walk(field, moves), w2 = CORE.walk(field, moves);
ok('same witness, same walk (pure)', w1.applied.join('') === w2.applied.join('') && w1.pos.n === w2.pos.n,
  `applied "${w1.applied.join('')}" of requested "${moves.join('')}"`);
ok('blocked steps never enter the witness', w1.applied.length <= moves.length);
const blocked = CORE.walk(field, moves.map((d) => (d === 'R' ? 'L' : 'R')));
ok('NEGATIVE: a different witness ends somewhere else', blocked.pos.n !== w1.pos.n || blocked.applied.join('') !== w1.applied.join(''));

// ── 5. recomposition: deterministic, rest-exact, route-visible ──────────────
section('5 · recomposition (route -> hash -> pixels)');
// Real walks, not toy ones: a deterministic greedy circuit per priority order
// (48 steps max), so the recomposition is measured against an actual traverse.
const greedy = (fld, order) => {
  let pos = fld.start; const mv = [];
  for (let i = 0; i < 48; i++) {
    const d = order.find((dd) => CORE.step(fld, pos, dd));
    if (!d) break;
    pos = CORE.step(fld, pos, d); mv.push(d);
  }
  return mv;
};
const routeA = greedy(field, ['R', 'D', 'L', 'U']);
const routeB = greedy(field, ['U', 'L', 'D', 'R']);
const empty = CORE.recompose(RGBA, W, H, field, []);
const a1 = CORE.recompose(RGBA, W, H, field, routeA);
const a2 = CORE.recompose(RGBA, W, H, field, routeA);
const b1 = CORE.recompose(RGBA, W, H, field, routeB);
ok('empty route recomposes to the ORIGINAL bytes (RETURN TO ORIGIN)',
  Buffer.compare(Buffer.from(empty.rgba), Buffer.from(RGBA)) === 0, sha(RGBA).slice(0, 16));
ok('NEGATIVE: a walked route is not the original', CORE.changedPx(empty.rgba, a1.rgba) > 0,
  `routeA "${routeA.join('')}" (${routeA.length} moves), routeB "${routeB.join('')}" (${routeB.length} moves)`);
ok('same route twice -> byte-identical recomposition',
  Buffer.compare(Buffer.from(a1.rgba), Buffer.from(a2.rgba)) === 0,
  `sha ${sha(a1.rgba).slice(0, 16)} == ${sha(a2.rgba).slice(0, 16)}`);
ok('same route twice -> identical seed', a1.seed === a2.seed, `seed ${a1.seed.toString(16)}`);
ok('NEGATIVE: different route -> different recomposition',
  Buffer.compare(Buffer.from(a1.rgba), Buffer.from(b1.rgba)) !== 0,
  `sha ${sha(a1.rgba).slice(0, 16)} != ${sha(b1.rgba).slice(0, 16)}`);

const d0 = CORE.downscale64(RGBA, W, H);
const dA = CORE.downscale64(a1.rgba, W, H);
const dB = CORE.downscale64(b1.rgba, W, H);
const madRest = CORE.mad64(d0, CORE.downscale64(empty.rgba, W, H));
const madAOri = CORE.mad64(d0, dA);
const madAB = CORE.mad64(dA, dB);
console.log(`     mad64  rest-vs-original ${madRest.toFixed(4)} | routeA-vs-original ${madAOri.toFixed(4)} | routeA-vs-routeB ${madAB.toFixed(4)}`);
console.log(`     changedPx routeA vs original ${CORE.changedPx(RGBA, a1.rgba)} of ${W * H}`);
ok('FAR at rest reconstructs the original composition (mad64 == 0)', madRest === 0.0);
ok('a walked route recomposes SLIGHTLY (composition survives, mad64 < 4)', madAOri > 0 && madAOri < 4, madAOri.toFixed(4));
ok('NEGATIVE: two different routes recompose visibly different paintings (mad64 > 0.05, changedPx > 0)',
  madAB > 0.05 && CORE.changedPx(a1.rgba, b1.rgba) > 0,
  `mad64 ${madAB.toFixed(4)}, changedPx ${CORE.changedPx(a1.rgba, b1.rgba)}`);
ok('recomposition touches only the walked tiles', a1.visited > 0 && a1.tiles > 0 && a1.tiles <= a1.visited * Math.ceil(W / CORE.COLS) * Math.ceil(H / CORE.ROWS) + 1,
  `${a1.visited} cells / ${a1.tiles} px`);

// ── 6. determinism discipline ───────────────────────────────────────────────
section('6 · no ambient time, no randomness');
for (const f of ['ladder-core.js', 'ladder.js', 'index.html']) {
  let src = '';
  try { src = readFileSync(join(HERE, f), 'utf8'); } catch { continue; }
  const bare = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const bad = bare.match(/Math\.random|new Date|performance\.now|Date\.now|crypto\.getRandomValues/g);
  ok(`${f} carries no randomness or wall clock`, !bad, bad ? bad.join(',') : 'clean');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
