// selftest.mjs — LYRIC LATTICE deterministic analysis tests (node, no deps).
// Extracts the instrument's real analysis code and sample from index.html,
// so the tested logic IS the shipped logic.
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');

function block(name){
  const open = `/*${name}-START*/`;
  const close = `/*${name}-END*/`;
  const i = html.indexOf(open);
  const j = html.indexOf(close);
  if (i === -1 || j === -1) throw new Error(`marker ${name} not found in index.html`);
  return html.slice(i + open.length, j);
}

const analysisSrc = block('ANALYSIS');
const sampleSrc = block('SAMPLE');
const { analyze, wordSyllables } = new Function(
  analysisSrc + '\nreturn { analyze, wordSyllables };'
)();
const SAMPLE = new Function(sampleSrc + '\nreturn SAMPLE;')();

let failures = 0;
function test(name, ok, detail){
  if (ok) console.log(`PASS  ${name}`);
  else { failures += 1; console.log(`FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
}

// T1 — syllable counter: verified known words
const known = [['water', 2], ['strength', 1], ['beautiful', 3], ['machine', 2], ['table', 2], ['whole', 1]];
for (const [w, want] of known){
  const got = wordSyllables(w);
  test(`syllables ${w} -> ${want}`, got === want, `got ${got}`);
}

// T2 — rhyme detection vs hand-labelled endings on the sample
// line endings (hand): hall all name same | light night requires pyres |
// hum drum take make | wire fire dark spark | night bright requires pyres |
// stand land rest best  =>  A A B B C C D D E E F F G G H H C C D D I I J J
const HAND_LABELLED_SCHEME = 'AABBCCDDEEFFGGHHCCDDIIJJ';
const a1 = analyze(SAMPLE);
test('rhyme scheme matches hand labels', a1.summary.scheme === HAND_LABELLED_SCHEME,
  `got ${a1.summary.scheme}, want ${HAND_LABELLED_SCHEME}`);

// T3 — determinism: same input twice -> identical output string
const out1 = JSON.stringify(analyze(SAMPLE));
const out2 = JSON.stringify(analyze(SAMPLE));
test('same input twice yields identical output string', out1 === out2);

// T4 — structure: 24 lines, 6 labelled sections
test('sample has 24 lyric lines', a1.lines.length === 24, `got ${a1.lines.length}`);
const sectNames = a1.sections.filter(s => s.lines.length).map(s => s.name + (s.idx > 1 ? s.idx : '')).join(',');
test('sections = VERSE,CHORUS,VERSE,BRIDGE,CHORUS,OUTRO',
  sectNames === 'VERSE,CHORUS,VERSE2,BRIDGE,CHORUS2,OUTRO', `got ${sectNames}`);

// T5 — spot-check hand-counted syllables (lines 1, 5, 21 -> 7 each)
for (const [idx, want] of [[0, 7], [4, 7], [20, 7]]){
  const got = a1.lines[idx].syl;
  test(`line ${idx + 1} syllables = ${want}`, got === want, `got ${got}`);
}

// T6 — house law static checks on the shipped html
test('no Math.random', !html.includes('Math.random'));
test('no fetch/XHR/import of external resources',
  !/fetch\s*\(|XMLHttpRequest|importScripts|<script[^>]+src=/.test(html));
test('no external http(s) URLs in src/href', !/(src|href)\s*=\s*["']https?:/.test(html));

console.log('');
console.log(failures === 0 ? 'RESULT: PASS' : `RESULT: FAIL (${failures} failing)`);
process.exit(failures === 0 ? 0 : 1);
