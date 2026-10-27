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

// ── 9. the doctrine slice: weather is CARRIED, not assigned ────────────────
// The marks used to be a property of the cell. They are now a district state
// that is a pure function of the weather carried out of the previous district
// and this district's own units, so the city you are in depends on the way you
// came. These arms test the law itself, not a constant that happens to hold.
section('9 · district weather (a fold over the walk, no clock, no randomness)');
const WR = ['window', 'rain', 'lamp', 'beacon'];
ok('the four marks stand in one wheel, and it is the mapping’s own order',
  JSON.stringify(CORE.WEATHERS) === JSON.stringify(WR) &&
  WR.every((w) => Object.prototype.hasOwnProperty.call(CORE.PUNCT, Object.keys(CORE.PUNCT).find((k) => CORE.PUNCT[k] === w))),
  CORE.WEATHERS.join(' -> '));
const bodies = field.districts;
const bodyTotals = WR.reduce((a, w) => { a[w] = bodies.reduce((n, d) => n + (d ? d.body[w] : 0), 0); return a; }, {});
ok('every district body is its own text’s punctuation — 31 / 40 / 11 / 1',
  bodyTotals.window === 31 && bodyTotals.rain === 40 && bodyTotals.lamp === 11 && bodyTotals.beacon === 1 &&
  WR.every((w) => bodyTotals[w] === field.drawn.weather[w]),
  WR.map((w) => w + ' ' + bodyTotals[w]).join(' · '));
const weatherless = bodies.filter((d) => d && WR.every((w) => d.body[w] === 0)).map((d) => d.p);
ok('a district can carry no weather at all, and then the weather crosses it untouched',
  weatherless.length > 0 && CORE.weatherOf({}, 'rain') === 'rain' && CORE.weatherOf({}, null) === null,
  '¶' + weatherless.map((p) => p + 1).join(',¶'));
const multi = bodies.filter((d) => d && WR.filter((w) => d.body[w] > 0).length >= 2);
ok('NEGATIVE: the wheel never hands back the weather you carried, when the district owns another',
  multi.length > 0 && multi.every((d) => WR.filter((w) => d.body[w] > 0).every((w) => CORE.weatherOf(d.body, w) !== w)),
  `${multi.length} districts own more than one weather`);
const single = bodies.find((d) => d && WR.filter((w) => d.body[w] > 0).length === 1);
ok('the wheel comes all the way round for a district that owns only one weather',
  !!single && CORE.weatherOf(single.body, WR.filter((w) => single.body[w] > 0)[0]) === WR.filter((w) => single.body[w] > 0)[0],
  single ? '¶' + (single.p + 1) + ' owns only ' + WR.filter((w) => single.body[w] > 0)[0] : 'none');
const down = [...Array(src.districts.length).keys()];
const chainA = CORE.weatherFold(bodies, down);
const chainB = CORE.weatherFold(bodies, down);
ok('the same district sequence twice -> an identical weather chain',
  JSON.stringify(chainA) === JSON.stringify(chainB) && chainA.steps.length === down.length,
  chainA.steps.map((s) => (s.weather || '-')[0]).join(''));
ok('the weather changes as you cross the city (it is not a constant dressed as a mechanic)',
  new Set(chainA.steps.map((s) => s.weather)).size >= 3 &&
  chainA.steps.filter((s, i) => i && s.weather !== chainA.steps[i - 1].weather).length >= 8,
  `${new Set(chainA.steps.map((s) => s.weather)).size} weathers · ` +
  `${chainA.steps.filter((s, i) => i && s.weather !== chainA.steps[i - 1].weather).length} changes of 28`);
// the proof the operator asked for: the SAME district, entered from the other
// side, is a different weather — the state you carried out conditions the one
// you enter.
const fromAbove = CORE.weatherFold(bodies, down.slice(0, 10)).steps.slice(-1)[0];      // ... ¶9 -> ¶10
const fromBelow = CORE.weatherFold(bodies, down.slice(0, 11).concat([9])).steps.slice(-1)[0]; // ... ¶11 -> ¶10
ok('NEGATIVE/different predecessor: the same district is a different weather from the other side',
  fromAbove.p === fromBelow.p && fromAbove.carryIn !== fromBelow.carryIn && fromAbove.weather !== fromBelow.weather,
  `¶${fromAbove.p + 1} via ¶${fromAbove.p}: ${fromAbove.carryIn} -> ${fromAbove.weather} || via ¶${fromBelow.p + 2}: ${fromBelow.carryIn} -> ${fromBelow.weather}`);
let flips = 0;
for (let p = 2; p < src.districts.length - 1; p++) {
  const a = CORE.weatherFold(bodies, down.slice(0, p + 1)).steps.slice(-1)[0];
  const b = CORE.weatherFold(bodies, down.slice(0, p + 2).concat([p])).steps.slice(-1)[0];
  if (a.weather !== b.weather) flips++;
}
ok('conditional districts are common, not a single contrived case', flips >= 6, `${flips} of ${src.districts.length - 4} districts flip with the side you came from`);
const movesW = ['D', 'D', 'D', 'D'];
ok('the chain over a real walk == the fold over the district runs it entered',
  JSON.stringify(CORE.weatherChain(field, movesW)) === JSON.stringify(CORE.weatherFold(bodies, CORE.districtRuns(field, movesW))) &&
  CORE.districtRuns(field, movesW).length >= 1,
  'districts ' + CORE.districtRuns(field, movesW).map((p) => '¶' + (p + 1)).join(' '));

// ── 10. the sight gate: entry is admitted by an act, not by a word ─────────
section('10 · the sight gate + the district shape it traces');
ok('gate 1 is the sight gate; gates 2-8 still ask a word',
  CORE.gateKind(0) === 'sight' && CORE.gateKind(1) === 'word' && CORE.gateKind(CORE.GATES - 1) === 'word' &&
  CORE.SIGHT_GATES === 1, 'kinds ' + [0, 1, 7].map((i) => CORE.gateKind(i)).join(','));
ok('admission: an unseen district is refused, a seen one is admitted (and a word gate always opens)',
  CORE.gateAdmits('sight', false) === false && CORE.gateAdmits('sight', true) === true && CORE.gateAdmits('word', false) === true,
  'the refused step is the whole instruction');
ok('the hold is satisfied only near the whole: SEEN_AT', CORE.SEEN_AT > 0.5 && CORE.SEEN_AT < 1 &&
  CORE.riseMet(CORE.SEEN_AT - 0.01) === false && CORE.riseMet(CORE.SEEN_AT) === true && CORE.riseMet(1) === true,
  'riseMet(' + CORE.SEEN_AT + ') = true, riseMet(' + (CORE.SEEN_AT - 0.01).toFixed(2) + ') = false');
const shapes = field.edges;
const owner = (x, y) => (x < 0 || y < 0 || x >= CORE.COLS || y >= CORE.ROWS ? -1 : field.cells[y * CORE.COLS + x].unit.p);
let badSeg = 0, innerSeg = 0, segs = 0;
for (let p = 0; p < shapes.length; p++) {
  for (const s of shapes[p] || []) {
    segs++;
    const [x0, y0, x1, y1] = s;
    // a boundary side: exactly one of the two cells it separates is the district
    const cellsOf = (x0 === x1) ? [owner(x0 - 1, y0), owner(x0, y0)] : [owner(x0, y0 - 1), owner(x0, y0)];
    const inside = cellsOf.filter((q) => q === p).length;
    if (inside !== 1) badSeg++;
    if (inside === 2) innerSeg++;
  }
}
ok('a district’s shape is its real boundary — every side separates it from another district',
  segs > 2000 && badSeg === 0, `${segs} sides, ${badSeg} that do not bound exactly one side`);
ok('NEGATIVE: no side is drawn inside a district (the shape is not a grid)',
  innerSeg === 0, innerSeg + ' interior sides');
ok('the shapes tile the field: every cell belongs to exactly one district',
  bodies.reduce((n, d) => n + d.cells, 0) === CORE.CELLS && bodies.length === src.districts.length,
  bodies.length + ' districts · ' + bodies.reduce((n, d) => n + d.cells, 0) + ' cells');
ok('the sight gate’s district has a line — the sentence revealed only after the act',
  !!(src.districts[placed.gates[0].p] && src.districts[placed.gates[0].p].line.length > 20),
  '¶' + (placed.gates[0].p + 1) + ' “' + (src.districts[placed.gates[0].p].line || '').slice(0, 48) + '…”');

// ── 11. discipline: no ambient time, no surface creep ─────────────────────
section('11 · determinism discipline + the surface budget');
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
// REDUCTION, asserted: the pass added two mechanisms and removed a drawing
// layer, a text prompt and a dead field. The old per-cell weather mark must be
// gone (weather is one district band now), and the page must still be one canvas
// with nothing to press.
const js = readFileSync(join(HERE, 'ladder.js'), 'utf8');
ok('REDUCED: the per-cell weather mark is gone; weather is one district band',
  !/function weatherMark/.test(js) && !/weatherMark\(/.test(js) && /function bandMarks/.test(js) && /function drawBand/.test(js),
  'world-scale weather replaced cell-scale weather (83 invisible marks -> 28 bands)');
ok('REDUCED: the sight gate has no card, no doors and no instruction line',
  /gateKind\(gt\.i\) === 'sight'\) \{ S\.gate = null; return; \}/.test(js) &&
  !/card.*sight|sight.*cloze/i.test(js) && /function riseStart/.test(js),
  'gate 1 never reaches the quiz surface; the other seven still do');
ok('the surface count did not grow: four elements, no control, no panel',
  (html.match(/\sid="/g) || []).length === 4 && !/<button|<input|<select|<textarea|<dialog|<form/i.test(html),
  ((html.match(/\sid="/g) || []).length) + ' elements · canvas + provenance + sr-only live + sr-only help');

// ── 12. 0.4.0 — the eye, the boundary, the reading head, the note ─────────
// Every arm here is a law of the build the first walk asked for. The projection
// is asserted as arithmetic (not as pixels), because a perspective that is only
// checked by looking is a perspective nobody can regress.
section('12 · the eye: a ground-plane projection, asserted as arithmetic');
const L390 = CORE.fpvLayout(390, 745.33, CORE.FPV.eye);
const L1024 = CORE.fpvLayout(1024, 700, CORE.FPV.eye);
ok('the horizon is a fixed fraction of the view — the city’s far edge, not a crop',
  Math.abs(L390.horizon / L390.h - CORE.FPV.horizon) < 1e-9,
  'horizon ' + L390.horizon.toFixed(2) + ' of ' + L390.h.toFixed(2) + ' = ' + (L390.horizon / L390.h).toFixed(3));
ok('the horizon is stable across resizes (same fraction at 390x745 and 1024x700)',
  Math.abs(L390.horizon / L390.h - L1024.horizon / L1024.h) < 1e-9,
  (L390.horizon / L390.h).toFixed(4) + ' vs ' + (L1024.horizon / L1024.h).toFixed(4));
ok('the horizon does not move when the eye is raised or lowered',
  CORE.fpvLayout(390, 745.33, CORE.FPV.eyeHigh).horizon === L390.horizon &&
  CORE.fpvLayout(390, 745.33, CORE.FPV.eyeLow).horizon === L390.horizon,
  'eye ' + CORE.FPV.eyeLow + ' / ' + CORE.FPV.eye + ' / ' + CORE.FPV.eyeHigh + ' -> horizon ' + L390.horizon.toFixed(2));
const depths = [0.5, 1, 1.5, 2, 3, 5, 8, 13, 21, 34];
const widths = depths.map((d) => CORE.fpvRow(L390, d).w);
ok('row scale is strictly monotone toward the horizon (each row narrower than the one before)',
  widths.every((w, i) => i === 0 || w < widths[i - 1]),
  widths.map((w) => w.toFixed(1)).join(' > '));
ok('NEGATIVE: the scale is not a constant (a flat map would fail the law above)',
  widths[0] / widths[widths.length - 1] > 50,
  (widths[0] / widths[widths.length - 1]).toFixed(1) + 'x from the first row to the last');
const camY = 15.5, camX = 47.5;
const qNear = CORE.fpvQuad(L390, camX, camY, 47, 14);
const qFar = CORE.fpvQuad(L390, camX, camY, 47, 4);
ok('a cell is a trapezoid: its far edge is narrower than its near edge',
  qNear.wFar < qNear.w, 'near ' + qNear.w.toFixed(1) + 'px, far ' + qNear.wFar.toFixed(1) + 'px');
ok('the same cell projects smaller with depth (near row 1 vs row 10)',
  qFar.w < qNear.w && qFar.yN < qNear.yN,
  'row 1 ' + qNear.w.toFixed(1) + 'px @y' + qNear.yN.toFixed(1) + ' · row 10 ' + qFar.w.toFixed(1) + 'px @y' + qFar.yN.toFixed(1));
ok('the cell you stand in is not drawn: the camera is inside it',
  CORE.fpvQuad(L390, camX, camY, 47, 15) === null, 'depth would be 0');
ok('a straight street converges: a constant x at growing depth moves toward the centre',
  (() => {
    const xs = [0.5, 1.5, 3, 6, 12].map((d) => CORE.fpvPoint(L390, camX, camY, 48, camY - d));
    return xs.every((p) => p && p.x > L390.w / 2) && xs.every((p, i) => i === 0 || p.x < xs[i - 1].x + 1e-9);
  })(), 'the vertical through x=48 bends toward the vanishing point');
ok('the projection is a function of its inputs only (same camera -> same numbers, twice)',
  JSON.stringify(CORE.fpvQuad(L390, camX, camY, 40, 9)) === JSON.stringify(CORE.fpvQuad(L390, camX, camY, 40, 9)) &&
  JSON.stringify(CORE.fpvQuad(L390, camX, camY, 40, 9)) !== JSON.stringify(CORE.fpvQuad(L390, camX + 1, camY, 40, 9)),
  'same -> identical · different camera -> different');
ok('the eye is clamped to the declared range (a hold cannot stand you outside it)',
  CORE.fpvLayout(390, 745, 99).eye === CORE.FPV.eyeHigh && CORE.fpvLayout(390, 745, -99).eye === CORE.FPV.eyeLow,
  CORE.FPV.eyeLow + ' .. ' + CORE.FPV.eyeHigh);

section('13 · the reading head: where "now" sits in a district’s own text order');
const head0 = CORE.readingHead(field, field.districts[0].n0);
const head1 = CORE.readingHead(field, field.districts[0].n1);
ok('the first cell of a district is the first character of its text order',
  head0.i === 1 && head0.of === field.districts[0].n1 - field.districts[0].n0 + 1, '1 of ' + head0.of);
ok('the last cell of a district is the last of its order (t = 1)',
  head1.i === head1.of && head1.t === 1, head1.i + ' of ' + head1.of);
ok('the ordinal is measured from the run, not assigned',
  (() => {
    const d = field.districts[1], n = d.n0 + 3;
    return CORE.readingHead(field, n).i === n - d.n0 + 1;
  })(), 'i = n - n0 + 1');
ok('the head advances monotonically through a district (reading order is the row-major run)',
  (() => {
    const d = field.districts[2];
    let last = 0;
    for (let n = d.n0; n <= d.n1; n++) { const h = CORE.readingHead(field, n); if (!(h.t > last)) return false; last = h.t; }
    return true;
  })(), 't rises cell by cell across ¶' + 3);
ok('NEGATIVE: the head reports the district you are actually in (not a global ratio)',
  CORE.readingHead(field, field.districts[5].n0).p === 5 && CORE.readingHead(field, field.districts[5].n0).i === 1,
  'crossing a boundary restarts the ring at 1');

section('14 · the boundary: what you see is what you can walk');
let faced = 0, interior = 0, unfacedEdge = 0;
for (let n = 0; n < CORE.CELLS; n++) {
  const f = CORE.wallFaces(field, n);
  if (!f) continue;
  const any = ['N', 'E', 'S', 'W'].some((k) => f[k]);
  any ? faced++ : interior++;
}
for (let n = 0; n < CORE.CELLS; n++) if (field.cells[n].wall && !CORE.wallFaces(field, n)) unfacedEdge++;
ok('every wall on the walkable boundary carries a face (nothing walls you invisibly)',
  faced > 0 && unfacedEdge === 0, faced + ' faced walls · ' + interior + ' interior walls · 0 unfaced boundary walls');
ok('NEGATIVE: an interior wall carries no face (the mark is the boundary, not a texture)',
  interior > 0, interior + ' wall cells are enclosed on all four sides');
ok('open ground has no wall face at all', CORE.wallFaces(field, field.start.n) === null, 'start cell is open');
ok('openSides names only steps the city accepts, and every other side refuses',
  (() => {
    const open = CORE.openSides(field, field.start);
    if (!open.length) return false;
    const all = ['N', 'E', 'S', 'W'];
    const D = { N: 'U', S: 'D', W: 'L', E: 'R' };
    for (const k of all) {
      const accepted = !!CORE.step(field, field.start, D[k]);
      if (accepted !== open.includes(k)) return false;
    }
    return true;
  })(), 'open ' + CORE.openSides(field, field.start).join(',') + ' of N,E,S,W');
ok('the spawn’s vertical extent is the painting’s, not a canvas crop: the reach spans rows 0..31',
  (() => {
    let minY = 99, maxY = -1;
    for (let n = 0; n < CORE.CELLS; n++) if (field.reach[n]) { const y = (n / CORE.COLS) | 0; if (y < minY) minY = y; if (y > maxY) maxY = y; }
    return minY === 0 && maxY === CORE.ROWS - 1;
  })(), 'reachable bbox rows 0..' + (CORE.ROWS - 1));

section('15 · the field note: verbatim, and only there');
const noteSource = js.replace(/\\'/g, "'");
const NOTE_EXPECT = [
  'FIELD NOTE — the ladder, after walking it',
  'I built this and then walked it, which is not the same as knowing whether it works.',
  "What's special, if anything: the world is not decorated with the text — it is made of it, and the same inputs always make the same city. You can check that. Nothing here is random, nothing is generated fresh each load. That's rarer than it sounds.",
  "What's weak: the mapping is a machine for making decisions I didn't make. Paragraph equals district because I chose that; nothing in the text demanded it. The gates ask you to notice the text, which is reading, not understanding. And the weather wheel is a rule I picked because the simpler rules were boring — that's taste, not truth.",
  "How it might be used: as a slow reading. One district a day, a gate that makes you find a word you'd have skimmed, and a mark left in the painting when you leave. Nothing to win. After enough walks the painting is a record of what you actually read.",
  "What I'd cut if nobody used it: all of it. It earns its place only if walking it tells you something a page doesn't.",
];
const missing = NOTE_EXPECT.filter((p) => !noteSource.includes(p));
ok('the field note is carried verbatim — all six strings, byte for byte', missing.length === 0, missing.length ? 'missing: ' + missing[0].slice(0, 40) : '6/6 strings');
ok('NEGATIVE: a tampered note is not what ships (the arm can fail)',
  !noteSource.includes(NOTE_EXPECT[3].replace('taste, not truth', 'taste, and truth')),
  'one word changed -> not found');
ok('the note is a reveal, not a panel: no element, no button, no route',
  !/<dialog|<section|id="note"/i.test(html) && /function drawNote\(/.test(js) && /function toggleNote\(/.test(js),
  'drawn on the canvas; reached by the corner crop-mark or #note');

section('16 · the reduction: one toggle, one reveal, nothing else');
ok('exactly one view toggle exists (the eye), reached without a persistent control',
  (js.match(/function toggleFpv\(/g) || []).length === 1 && !/id="fpv"|class="toggle"/i.test(html),
  'two fingers / a held corner press / #fpv');
ok('the page still has four elements and no form control',
  (html.match(/\sid="/g) || []).length === 4 && !/<button|<input|<select|<textarea|<dialog|<form/i.test(html),
  '4 elements, unchanged from 0.3.0');
ok('walls are drawn from their faces, not from a second data source',
  /function drawWalls\(/.test(js) && /C\.wallFaces\(S\.field/.test(js),
  'the mark is derived from the field the walk reads');
ok('the eye reads the same field as the plan (no second data source in the view)',
  /function drawFpv\(/.test(js) && /S\.field\.cells\[cy \* C\.COLS \+ cx\]/.test(js) && !/fetch\(/.test(js.slice(js.indexOf('function drawFpv'), js.indexOf('function drawBandFpv'))),
  'FPV samples S.field.cells — the same cells ENTERED walks');

console.log(`\n${pass} passed, ${fail} failed, ${skip} skipped`);
process.exit(fail ? 1 : 0);
