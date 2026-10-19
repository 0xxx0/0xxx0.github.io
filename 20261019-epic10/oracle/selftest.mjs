#!/usr/bin/env node
/* L1 ORACLE selftest — node, zero deps.
   Reads the shipped instrument (index.html), extracts the pure core, asserts:
   determinism, distinctness, changing-line stability, sample validity, table
   integrity, and (when present) cross-checks flip targets against
   ../../iching/hexagrams.json. Prints PASS/FAIL lines; exit 1 on any FAIL. */
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(dir, 'index.html');
let pass = 0, fail = 0;
const ok = (cond, name, extra = '') => {
  if (cond) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name + (extra ? ' — ' + extra : '')); }
};

/* ---------- 0. shipped artifact + house law ---------- */
const html = readFileSync(htmlPath, 'utf8');
const m = html.match(/<script id="core">([\s\S]*?)<\/script>/);
ok(!!m, 'artifact: core script present in index.html');

const mrand = /Math\.random\s*\(/.test(html);
ok(!mrand, 'house law: no Math.random( in source');
ok(!/\bfetch\s*\(|XMLHttpRequest|new\s+Date\s*\(|Date\.now\s*\(/.test(html), 'house law: no fetch/xhr/date-time in source');
ok(!/https?:\/\//.test(html), 'house law: no URLs / external fetches');
ok(!/<script[^>]+\bsrc\s*=|<link[^>]+\bhref\s*=/.test(html), 'house law: all assets inline, system fonts only');
ok(html.includes('--pad:rgb(8,12,18)') && html.includes('--ink:rgb(79,87,96)'), 'design law: rest pad + ink colors present');
ok(html.includes('--d:.12'), 'design law: reading panel rest alpha = 0.12 (<=0.12)');
ok(/\.ptext\{[^}]*-webkit-line-clamp:1/.test(html) && /\.reveal\.bloom \.ptext\{[^}]*-webkit-line-clamp:8/.test(html),
  'design law: compact CSS layer wired (1-line clamp at rest, unfolds on bloom)');
ok(html.includes('prefers-reduced-motion'), 'design law: prefers-reduced-motion -> depth without motion');

/* ---------- 1. extract core ---------- */
const sandbox = { module: { exports: {} }, console };
vm.createContext(sandbox);
try { vm.runInContext(m[1], sandbox, { filename: 'oracle-core.js' }); } catch (e) { ok(false, 'core executes', String(e)); }
const core = sandbox.module.exports;
ok(core && typeof core.encode === 'function' && Array.isArray(core.GUA), 'core exports encode() + GUA table');

/* ---------- 2. FNV-1a canonical vectors ---------- */
ok(core.hash32('') === 0x811c9dc5, "fnv1a('') = 0x811c9dc5", core.hash32('').toString(16));
ok(core.hash32('a') === 0xe40c292c, "fnv1a('a') = 0xe40c292c", core.hash32('a').toString(16));
ok(core.hash32('foobar') === 0xbf9cf968, "fnv1a('foobar') = 0xbf9cf968", core.hash32('foobar').toString(16));

/* ---------- 3. same input -> same hexagram ---------- */
const sameInputs = ['', 'a', 'the letter I never sent', '十月的雨', 'still water under the winter gate',
  'x'.repeat(5000), '🙂 mixed 中文 bytes'];
let sameBad = sameInputs.filter(t => {
  const a = core.encode(t), b = core.encode(t);
  return a.id !== b.id || a.pattern !== b.pattern || a.h1 !== b.h1 ||
    JSON.stringify(a.changing) !== JSON.stringify(b.changing);
});
ok(sameBad.length === 0, `determinism: same input -> same hexagram (${sameInputs.length} inputs)`, sameBad[0]);

/* ---------- 3b. cross-run pins: exact gua + changing lines per fixed input ---------- */
const PINS = {
  'still water under the winter gate': [42, [3]],
  'the letter I never sent': [44, [2]],
  'first draft, no revisions': [17, [1]],
  '十月的雨': [41, []],
  'salt, bread, and a closed door': [23, []],
  'the thing you keep re-reading': [54, [1]],
  'another different object entirely': [6, [3, 4]],
  'hello': [60, [4, 6]],
  'x': [1, [1, 6]],
  '世界': [8, [1, 2, 5]],
  '': [23, [4, 5]]
};
let pinBad = [];
for (const [t, [id, chg]] of Object.entries(PINS)) {
  const r = core.encode(t);
  if (r.id !== id || JSON.stringify(r.changing) !== JSON.stringify(chg)) {
    pinBad.push(`${JSON.stringify(t)} -> id ${r.id} chg [${r.changing}] expected id ${id} chg [${chg}]`);
  }
}
ok(pinBad.length === 0, `determinism: pinned gua + changing lines for ${Object.keys(PINS).length} fixed inputs`, pinBad[0]);

/* ---------- 4. different input -> different hexagram ---------- */
const d1 = core.encode('the letter I never sent'), d2 = core.encode('still water under the winter gate');
ok(d1.id !== d2.id, `different input -> different hexagram (${d1.id} vs ${d2.id})`);
const corpus = [];
for (let i = 0; i < 500; i++) corpus.push(`row-${i} · ${i * i} seed`);
const spread = new Set(corpus.map(t => core.encode(t).id));
ok(spread.size >= 56, `different input -> spread over table (${spread.size}/64 distinct gua over 500 inputs)`);

/* ---------- 5. changing-line positions deterministic + valid ---------- */
let chgBad = [];
for (let i = 0; i < 200; i++) {
  const t = `chg probe ${i}:${'abcdefgh'[i % 8]}`;
  const a = core.encode(t), b = core.encode(t);
  if (JSON.stringify(a.changing) !== JSON.stringify(b.changing)) chgBad.push(`unstable ${t}`);
  const pos = a.changing;
  const inRange = Array.isArray(pos) && pos.every(p => Number.isInteger(p) && p >= 1 && p <= 6);
  const sortedUnique = JSON.stringify(pos) === JSON.stringify([...new Set(pos)].sort((x, y) => x - y));
  if (!inRange || !sortedUnique) chgBad.push(`bad positions ${t}: ${JSON.stringify(pos)}`);
  if (a.target && a.target[0] !== core.encode(t).target[0]) chgBad.push(`bad target ${t}`);
}
ok(chgBad.length === 0, 'changing lines: positions deterministic, unique, within 1..6 (200 probes)', chgBad[0]);
/* changing marks derive from rehash, gua from digest: mark/gua stay consistent */
const markCheck = core.encode('the letter I never sent');
ok(markCheck.lines.filter(l => l.changing).map(l => l.n).join() === markCheck.changing.join(),
  'changing lines: line marks agree with changing[] positions');

/* ---------- 6. sample objects -> valid gua indices ---------- */
const S = core.SAMPLES;
ok(S.length === 6, `samples: row has ${S.length} sample objects`);
let sBad = [];
for (const s of S) {
  const r = core.encode(s.t);
  if (!Number.isInteger(r.id) || r.id < 1 || r.id > 64) sBad.push(`${s.l}: id ${r.id}`);
  if (!r.gua || r.gua[1] !== r.pattern) sBad.push(`${s.l}: record/pattern mismatch`);
  if (!r.gua[2] || !r.gua[3] || !r.gua[4] || !r.gua[6] || !r.gua[7]) sBad.push(`${s.l}: missing glyph/zh/pinyin/judgment/use`);
  if (!/^[01]{6}$/.test(r.pattern)) sBad.push(`${s.l}: pattern ${r.pattern}`);
}
ok(sBad.length === 0, 'samples: all produce valid gua indices 1..64 with full records', sBad[0]);
const sIds = S.map(s => core.encode(s.t).id);
ok(new Set(sIds).size === 6, `samples: pairwise distinct gua [${sIds.join(', ')}]`);

/* ---------- 7. table integrity ---------- */
const G = core.GUA;
ok(G.length === 64, `table: 64 rows (got ${G.length})`);
ok(new Set(G.map(r => r[1])).size === 64, 'table: 64 unique 6-bit binaries');
ok(new Set(G.map(r => r[0])).size === 64 && G.every(r => r[0] >= 1 && r[0] <= 64), 'table: ids are 1..64 bijection');
ok(G.every(r => r[7] && r[7].length > 10), 'table: every gua has an ability-to-use line');

/* ---------- 8. optional cross-check vs source-of-truth JSON (read-only) ---------- */
const srcJson = path.resolve(dir, '../../iching/hexagrams.json');
if (existsSync(srcJson)) {
  const ref = JSON.parse(readFileSync(srcJson, 'utf8')).hexagrams;
  const idByPat = new Map(G.map(r => [r[1], r[0]]));
  const refById = new Map(ref.map(h => [h.id, h]));
  let flipBad = 0, checked = 0;
  for (const row of G) {
    const h = refById.get(row[0]);
    if (!h || h.binary !== row[1]) { flipBad++; continue; }
    for (let ln = 1; ln <= 6; ln++) {
      const b = row[1].split('');
      b[ln - 1] = b[ln - 1] === '1' ? '0' : '1';
      const flipId = idByPat.get(b.join(''));
      checked++;
      if (flipId !== h.lines[ln - 1].changing_to) flipBad++;
    }
  }
  ok(flipBad === 0 && checked === 384, `cross-check: all ${checked} flip targets match iching/hexagrams.json changing_to`, `${flipBad} mismatches`);
} else {
  console.log('SKIP cross-check: ' + srcJson + ' not found');
}

console.log('RESULT: ' + pass + ' PASS / ' + fail + ' FAIL');
process.exitCode = fail === 0 ? 0 : 1;
