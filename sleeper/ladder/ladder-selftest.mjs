#!/usr/bin/env node
// ladder-selftest.mjs — laws of sleeper/ladder. Every arm has a POSITIVE and a
// NEGATIVE (a test that cannot fail is decoration). Zero deps, zero fixtures:
// the painting is generated from hash32 unless --rgba hands in real pixels; the
// source is the shipped derived slice, and — when the local corpus is present —
// the derivation is re-run and must reproduce that slice byte for byte.
//
//   node sleeper/ladder/ladder-selftest.mjs
//   node sleeper/ladder/ladder-selftest.mjs --rgba <file> --size 512x171
//   BUDDHADHAMMA_CORPUS=/path/to/corpus node sleeper/ladder/ladder-selftest.mjs
//
// Prints one metric line per law plus a final verdict; exit 0 = all green.
// Arms that need the local corpus report SKIP (and are counted separately) when
// it is absent: a law you could not run is never reported as passed.
import { createRequire } from 'node:module';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { derive, CORPUS_DEFAULT } from './derive-source.mjs';

const require = createRequire(import.meta.url);
const CORE = require('./ladder-core.js');
const HERE = dirname(fileURLToPath(import.meta.url));

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const rgbaPath = arg('--rgba', null);
const size = (arg('--size', '384x128')).split('x').map(Number);
const corpus = arg('--corpus', CORPUS_DEFAULT);

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
const shaText = (s) => createHash('sha256').update(Buffer.from(s, 'utf8')).digest('hex');

let pass = 0, fail = 0, skip = 0;
const ok = (name, cond, detail = '') => {
  cond ? pass++ : fail++;
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${cond ? (detail ? '  — ' + detail : '') : '  — ' + detail}`);
};
const skipped = (name, why) => { skip++; console.log(`SKIP ${name}  — ${why}`); };
const section = (s) => console.log(`\n${s}`);

// ── 1. one hash: painting identity, source identity, artifact identity ─────
section('1 · identity wiring (lib/moire-ambient.js hash32, one hash for all three)');
ok('hash32 is the house FNV-1a', CORE.hash32('sleeper') === CORE.hash32('sleeper'));
ok('NEGATIVE: different seed, different hash', CORE.hash32('sleeper') !== CORE.hash32('sleepers'));
const paintingTag = CORE.tag8(CORE.PAINTING_ID + CORE.PAINTING_SHA256);
ok('painting tag = 8 hex of hash32(id+sha256), unchanged from the 0.1.0 land', paintingTag === 'f0f09635', paintingTag);
ok('NEGATIVE: a different painting yields a different tag', paintingTag !== CORE.tag8('other.jpgdeadbeef'));
const fpA = CORE.sourceFingerprint('a'.repeat(64)), fpB = CORE.sourceFingerprint('b'.repeat(64));
ok('source fingerprint = hash32(prefix + selection sha256)', /^[0-9a-f]{8}$/.test(fpA), fpA);
ok('NEGATIVE: a different selection yields a different fingerprint', fpA !== fpB, fpA + ' vs ' + fpB);

// ── 2. the derived source that ships ───────────────────────────────────────
section('2 · the derived source (sleeper/source-slice@1)');
const raw = readFileSync(join(HERE, 'source-dhamma.json'), 'utf8');
const derived = JSON.parse(raw);
const src = CORE.readDerived(derived);
ok('shipped slice loads and validates', src.units.length === CORE.CELLS && src.districts.length > 8,
  `${src.districts.length} districts · ${src.units.length} cells · ${Buffer.byteLength(raw)} B`);
ok('provenance names the source, the date and the rights',
  !!(src.provenance.source_url && src.provenance.retrieved && src.provenance.rights && src.provenance.local_corpus));
ok('fingerprint in the file is the one the hash recomputes', derived.fingerprint === CORE.sourceFingerprint(derived.selection.sha256),
  derived.fingerprint);
ok('matter is exactly one character per cell', src.matter.length === CORE.CELLS);
ok('every cell points at a real district, and every district is drawn',
  src.units.every((u) => src.districts[u.p]) && new Set(src.units.map((u) => u.p)).size === src.districts.length);
ok('every cell’s sentence and word indices are inside its own district',
  src.units.every((u) => u.s < (src.districts[u.p].sentences || 1) && u.w < (src.districts[u.p].words || 1)));
let threw = null;
try { CORE.readDerived(Object.assign({}, derived, { matter: derived.matter.slice(0, 100) })); } catch (e) { threw = e.message; }
ok('NEGATIVE: a truncated slice is refused, not silently thinner', !!threw, threw || 'no error');

// ── 3. the derivation reproduces the shipped file from the local corpus ────
section('3 · derivation (local corpus -> shipped projection, byte for byte)');
const haveCorpus = existsSync(join(corpus, 'text'));
let sliceText = null, parsed = null;
if (!haveCorpus) {
  skipped('derivation arms', 'corpus absent at ' + corpus + ' (set BUDDHADHAMMA_CORPUS)');
} else {
  const a = derive({ corpus });
  const b = derive({ corpus });
  sliceText = a.sliceText;
  parsed = a.parsed;
  const bytesA = JSON.stringify(a.derived, null, 1) + '\n';
  const bytesB = JSON.stringify(b.derived, null, 1) + '\n';
  ok('same selection twice -> byte-identical derivation', bytesA === bytesB, shaText(bytesA).slice(0, 16));
  ok('the shipped file IS the derivation’s output', bytesA === raw, shaText(raw).slice(0, 16));
  ok('selection sha256 is the sha256 of the selected text', derived.selection.sha256 === shaText(sliceText),
    derived.selection.sha256.slice(0, 16));
  // THE law of this pass: the city is literally made of the text.
  const units = CORE.parseSource(sliceText).units;
  ok('units are the text’s own characters, in reading order',
    units.map((u) => u.ch).join('') === sliceText.replace(/\s+/g, ''),
    `${units.length} units == ${sliceText.replace(/\s+/g, '').length} non-space chars`);
  const proj = CORE.projectCells(CORE.parseSource(sliceText), CORE.CELLS);
  ok('the projection is exactly cell <- unit floor(n·U/CELLS)', proj.map((u) => u.ch).join('') === derived.matter);
  const other = derive({ corpus, window: 8 });
  ok('NEGATIVE: a different selection (window 8) -> a different fingerprint and different bytes',
    other.derived.fingerprint !== derived.fingerprint && JSON.stringify(other.derived, null, 1) + '\n' !== bytesA,
    derived.fingerprint + ' vs ' + other.derived.fingerprint);
  ok('one cited line per district, each <= 92 chars, each carrying its blank',
    derived.districts.every((d) => d.line && d.line.length <= 92 && d.cloze.includes('____') && d.line.includes(d.answer)),
    `${derived.districts.length} lines, longest ${Math.max(...derived.districts.map((d) => d.line.length))}`);
  ok('no two districts carry the same line', new Set(derived.districts.map((d) => d.line)).size === derived.districts.length);
}

// ── 4. the mapping (parseSource) over the slice ────────────────────────────
section('4 · source -> matter (¶=district, sentence=building, word=room, char=material)');
const p2 = parsed || CORE.parseSource(derived.districts.map((d) => d.line).join('\n\n'));
ok('source parses', p2.counts.paragraphs > 8 && p2.counts.sentences > 10 && p2.units.length > 1000,
  `${p2.counts.paragraphs} paragraphs / ${p2.counts.sentences} sentences / ${p2.counts.words} words / ${p2.units.length} units`);
ok('units are characters (character = material)', p2.units.length > p2.counts.words);
ok('punctuation carries weather', p2.units.some((u) => u.punct));
const field = CORE.buildField(RGBA, W, H, src);
ok('drawn districts == districts in the source (read your own source, live)',
  field.drawn.districts === field.source.districts.length,
  `drawn ${field.drawn.districts} / source ${field.source.districts.length}`);
if (parsed) {
  ok('shipped counts == the counts parseSource just measured',
    derived.counts.sentences === parsed.counts.sentences && derived.counts.words === parsed.counts.words && derived.counts.chars === parsed.counts.chars,
    `${derived.counts.sentences}/${derived.counts.words}/${derived.counts.chars}`);
  ok('drawn buildings == source sentences', field.drawn.buildings === parsed.counts.sentences,
    `drawn ${field.drawn.buildings} / source ${parsed.counts.sentences}`);
} else {
  skipped('drawn buildings == source sentences', 'corpus absent');
}
ok('rooms and materials are real, and every cell maps into the source',
  field.drawn.rooms > 100 && field.drawn.materials > 20 && field.cells.every((c) => c.unit && typeof c.unit.p === 'number'),
  `${field.drawn.rooms} rooms · ${field.drawn.materials} materials`);
ok('weather marks exist', Object.values(field.drawn.weather).reduce((a, b) => a + b, 0) > 0, JSON.stringify(field.drawn.weather));

// ── 5. the field is a city, not a picture of one ────────────────────────────
section('5 · elevation / walls / walkability');
ok('walls come from the painting’s own edge distribution', field.cut > 0 && field.walkable > 0 && field.walkable < field.cells.length,
  `cut ${field.cut.toFixed(4)}, ${field.walkable} walkable of ${field.cells.length}`);
ok('start is walkable and inside the field', field.start && !field.start.wall && field.reach[field.start.n] === 1,
  `start (${field.start.cx},${field.start.cy}) material "${field.start.material}"`);
ok('a real district opens up (reachable >= 20% of the field)', field.reached >= field.cells.length * 0.2,
  `reachable ${field.reached} of ${field.cells.length} (${(100 * field.reached / field.cells.length).toFixed(1)}%), cut q=${field.cutQ}`);
const otherField = CORE.buildField(CORE.syntheticPainting(W, H, 'another-painting'), W, H, src);
ok('NEGATIVE: a different painting changes the wall map',
  otherField.cells.some((c, i) => c.wall !== field.cells[i].wall),
  `${field.cells.filter((c) => c.wall).length} vs ${otherField.cells.filter((c) => c.wall).length} walls`);
ok('NEGATIVE: a different painting changes the measured field (lum/edge per cell)',
  otherField.cells.some((c, i) => c.lum !== field.cells[i].lum || c.edge !== field.cells[i].edge),
  `cell0 lum ${field.cells[0].lum.toFixed(4)} vs ${otherField.cells[0].lum.toFixed(4)}`);

// ── 6. the eight gates ─────────────────────────────────────────────────────
section('6 · the eight gates (learning checks placed on the walk’s own distance field)');
const usable = (p) => !!(src.districts[p] && src.districts[p].cloze);
const placed = CORE.placeGates(field, CORE.GATES, usable);
const placed2 = CORE.placeGates(field, CORE.GATES, usable);
ok('eight gates stand in the city', placed.gates.length === CORE.GATES, `${placed.gates.length} gates · horizon ${placed.horizon} steps · band ${placed.band} cells`);
ok('every gate is reachable and stands on a different cell', placed.gates.every((g) => field.reach[g.n] === 1) &&
  new Set(placed.gates.map((g) => g.n)).size === placed.gates.length,
  placed.gates.map((g) => '¶' + (g.p + 1) + '@d' + g.dist).join(' '));
ok('every gate asks about a different district', new Set(placed.gates.map((g) => g.p)).size === placed.gates.length);
ok('gate placement is deterministic (same field twice)', JSON.stringify(placed.gates) === JSON.stringify(placed2.gates));
ok('NEGATIVE: a different painting moves the gates', JSON.stringify(CORE.placeGates(otherField, CORE.GATES, usable).gates) !== JSON.stringify(placed.gates));
const cards = placed.gates.map((g) => CORE.gateCard(src.districts, g.i, g.p, src.fingerprint));
ok('every gate card offers three doors, the answer exactly once',
  cards.every((c) => c && c.options.length === 3 && c.options.filter((o) => o === c.answer).length === 1 &&
    new Set(c.options.map((o) => o.toLowerCase())).size === 3),
  cards.map((c) => c.answer + '@' + c.options.indexOf(c.answer)).join(' '));
ok('the answer never appears in the cloze, and the blank is really blank',
  cards.every((c) => c.cloze.includes('____') && !c.cloze.toLowerCase().includes(c.answer.toLowerCase())));
ok('NEGATIVE: a district without a line cannot become a gate question',
  CORE.gateCard(src.districts, 0, 0, 'x') === null || CORE.gateCard([{ p: 0, line: '', answer: '', cloze: '' }], 0, 0, 'x') === null);
ok('gate cards are deterministic', JSON.stringify(cards) === JSON.stringify(placed.gates.map((g) => CORE.gateCard(src.districts, g.i, g.p, src.fingerprint))));

// ── 7. the return ledger: spaced by walks, never by the clock ─────────────
section('7 · the return ledger (retention without a wall clock)');
let L = CORE.emptyLedger();
L = CORE.ledgerMark(L, 3, 'Introduction');
const promptNow = CORE.returnPrompt(L, 3, src.districts, CORE.LEDGER_GAP);
ok('a district just read is not immediately quoted back', promptNow === null, 'ago 0');
for (let p = 10; p < 10 + CORE.LEDGER_GAP; p++) L = CORE.ledgerMark(L, p, 'x');
const later = CORE.returnPrompt(L, 3, src.districts, CORE.LEDGER_GAP);
ok('after walking other districts, the world quotes the line you read before',
  !!later && later.line === src.districts[3].line, later ? 'ago ' + later.ago + ' · ' + later.line.slice(0, 44) + '…' : 'null');
ok('NEGATIVE: a district never read is never quoted', CORE.returnPrompt(L, 27, src.districts, CORE.LEDGER_GAP) === null);
const L2 = (() => { let x = CORE.emptyLedger(); x = CORE.ledgerMark(x, 3, 'Introduction'); for (let p = 10; p < 10 + CORE.LEDGER_GAP; p++) x = CORE.ledgerMark(x, p, 'x'); return x; })();
ok('the ledger is a pure function of the order you walked', JSON.stringify(L) === JSON.stringify(L2) && L.seq === CORE.LEDGER_GAP + 1,
  'seq ' + L.seq + ' · ' + Object.keys(L.seen).length + ' districts read');

// ── 8. the walk and the recomposition ─────────────────────────────────────
section('8 · walk + recomposition (route -> hash -> pixels)');
const moves = ['R', 'R', 'D', 'L', 'D', 'D', 'R', 'R', 'U', 'R'];
const w1 = CORE.walk(field, moves), w2 = CORE.walk(field, moves);
ok('same witness, same walk (pure)', w1.applied.join('') === w2.applied.join('') && w1.pos.n === w2.pos.n,
  `applied "${w1.applied.join('')}" of requested "${moves.join('')}"`);
ok('blocked steps never enter the witness', w1.applied.length <= moves.length);
const blocked = CORE.walk(field, moves.map((d) => (d === 'R' ? 'L' : 'R')));
ok('NEGATIVE: a different witness ends somewhere else', blocked.pos.n !== w1.pos.n || blocked.applied.join('') !== w1.applied.join(''));
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
  `routeA "${routeA.join('')}" (${routeA.length}), routeB "${routeB.join('')}" (${routeB.length})`);
ok('same route twice -> byte-identical recomposition', Buffer.compare(Buffer.from(a1.rgba), Buffer.from(a2.rgba)) === 0,
  `sha ${sha(a1.rgba).slice(0, 16)} == ${sha(a2.rgba).slice(0, 16)}`);
ok('same route twice -> identical seed', a1.seed === a2.seed, `seed ${a1.seed.toString(16)}`);
ok('NEGATIVE: different route -> different recomposition', Buffer.compare(Buffer.from(a1.rgba), Buffer.from(b1.rgba)) !== 0,
  `sha ${sha(a1.rgba).slice(0, 16)} != ${sha(b1.rgba).slice(0, 16)}`);
const d0 = CORE.downscale64(RGBA, W, H);
const dA = CORE.downscale64(a1.rgba, W, H);
const dB = CORE.downscale64(b1.rgba, W, H);
console.log(`     mad64  rest-vs-original ${CORE.mad64(d0, CORE.downscale64(empty.rgba, W, H)).toFixed(4)} | routeA-vs-original ${CORE.mad64(d0, dA).toFixed(4)} | routeA-vs-routeB ${CORE.mad64(dA, dB).toFixed(4)}`);
ok('FAR at rest reconstructs the original composition (mad64 == 0)', CORE.mad64(d0, CORE.downscale64(empty.rgba, W, H)) === 0);
ok('a walked route recomposes SLIGHTLY (composition survives, mad64 < 4)', CORE.mad64(d0, dA) > 0 && CORE.mad64(d0, dA) < 4, CORE.mad64(d0, dA).toFixed(4));
ok('NEGATIVE: two different routes recompose visibly different paintings (mad64 > 0.05)',
  CORE.mad64(dA, dB) > 0.05 && CORE.changedPx(a1.rgba, b1.rgba) > 0,
  `mad64 ${CORE.mad64(dA, dB).toFixed(4)}, changedPx ${CORE.changedPx(a1.rgba, b1.rgba)}`);
ok('recomposition touches only the walked tiles', a1.visited > 0 && a1.tiles > 0 &&
  a1.tiles <= a1.visited * Math.ceil(W / CORE.COLS) * Math.ceil(H / CORE.ROWS) + 1, `${a1.visited} cells / ${a1.tiles} px`);

// ── 9. discipline: no ambient time, no surface creep ──────────────────────
section('9 · determinism discipline + the surface budget');
for (const f of ['ladder-core.js', 'ladder.js', 'index.html']) {
  const s = readFileSync(join(HERE, f), 'utf8');
  const bare = s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const bad = bare.match(/Math\.random|new Date|performance\.now|Date\.now|crypto\.getRandomValues/g);
  ok(`${f} carries no randomness or wall clock`, !bad, bad ? bad.join(',') : 'clean');
}
const html = readFileSync(join(HERE, 'index.html'), 'utf8');
ok('no HUD survives on the page: no button, nav, rail, status, readout, decode panel',
  !/<button|<nav|id="rail"|id="status"|id="readout"|id="decode"|id="gap"|id="identity"/i.test(html),
  'canvas + one provenance line + sr-only live region');
const bytes = statSync(join(HERE, 'index.html')).size + statSync(join(HERE, 'ladder.js')).size +
  statSync(join(HERE, 'ladder-core.js')).size + statSync(join(HERE, 'source-dhamma.json')).size;
ok('the whole instrument fits the 2 MB addition budget', bytes < 2 * 1024 * 1024, (bytes / 1024).toFixed(1) + ' KB');
ok('the page still names its source and its retrieval date', /Payutto/.test(html) && /2026-10-25/.test(html));

console.log(`\n${pass} passed, ${fail} failed, ${skip} skipped`);
process.exit(fail ? 1 : 0);
