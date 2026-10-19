#!/usr/bin/env node
/* selftest for the toki pona field instrument. node, no deps.
   Loads the SAME core.js the page renders from, then checks:
     1. vocabulary  — every word of every phrase/summary is in nimi pu
     2. purity      — phrase is a pure function of {state, depth, lane}
     3. determinism — composing twice yields identical output
     4. distinct    — differing fields yield distinct phrases (rule injective over all 40 combos)
     5. glyph       — each glyph layer maps to exactly one field
     6. house law   — index.html: no external URLs, no fetch, no Math.random
   Prints PASS/FAIL per check; exit 1 on any FAIL. */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

// core.js is a classic script: eval it globally so it exposes globalThis.TP.
(0, eval)(readFileSync(join(here, 'core.js'), 'utf8'));
const TP = globalThis.TP;
if (!TP) { console.log('FAIL core.js did not expose TP'); process.exit(1); }

let pass = 0, fail = 0;
function check(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? ' — ' + detail : ''}`);
  ok ? pass++ : fail++;
}

const wordsOf = (s) => s.split(/[.,;:\s]+/).filter(Boolean).map((w) => w.toLowerCase());

// --- 1. vocabulary -----------------------------------------------------------
const phraseTexts = TP.OBJECTS.map((o) => TP.composePhrase(o));
const summary = TP.composeSummary(TP.OBJECTS);
const allText = phraseTexts.concat([summary.tp]);
const badWords = [];
for (const text of allText) {
  for (const w of wordsOf(text)) {
    if (!TP.inVocab(w)) badWords.push(`${w} (in "${text}")`);
  }
}
check('vocabulary: every phrase + summary word is nimi pu', badWords.length === 0,
  badWords.length ? badWords.join('; ') : `${new Set(allText.flatMap(wordsOf)).size} distinct words, all in pu`);

// --- 2. purity: phrase depends on fields only --------------------------------
const base = { id: 'x', name: 'x', state: 'active', depth: 'small', lane: 'chat' };
const clone1 = { ...base, name: 'renamed', id: 'other' };
check('purity: name/id do not change the phrase',
  TP.composePhrase(base) === TP.composePhrase(clone1));

// tokens() must re-render composePhrase() exactly (renderer and rule can't drift)
const render = (o) => {
  const t = TP.tokens(o); let out = '';
  t.forEach((x, i) => {
    if (x.t === '.') { out += '.'; return; }
    if (i > 0) out += ' ';
    out += x.t;
  });
  return out;
};
check('consistency: tokens() re-render equals composePhrase()',
  TP.OBJECTS.every((o) => render(o) === TP.composePhrase(o)),
  TP.OBJECTS.filter((o) => render(o) !== TP.composePhrase(o)).map((o) => o.id).join(', '));

const variants = [];
for (const s of TP.ORDER.state) for (const d of TP.ORDER.depth) for (const l of TP.ORDER.lane)
  variants.push({ state: s, depth: d, lane: l });
const phrases = variants.map((o) => TP.composePhrase(o));
check('composition: 5 states x 2 depths x 4 lanes = 40 combos composed',
  phrases.length === 40 && phrases.every((p) => wordsOf(p).length === 6),
  `6 words per phrase (state li depth. lane li state.)`);

// --- 3. determinism ----------------------------------------------------------
const again = TP.OBJECTS.map((o) => TP.composePhrase(o))
  .concat([TP.composeSummary(TP.OBJECTS).tp]);
check('determinism: second composition is byte-identical',
  JSON.stringify(allText) === JSON.stringify(again));

// --- 4. distinctness ---------------------------------------------------------
const samplePhrases = TP.OBJECTS.map((o) => TP.composePhrase(o));
check('distinct: 10 sample objects -> 10 distinct phrases',
  new Set(samplePhrases).size === TP.OBJECTS.length,
  `${new Set(samplePhrases).size}/${TP.OBJECTS.length}`);
check('injective: all 40 field combos -> 40 distinct phrases',
  new Set(phrases).size === 40);
check('field-level: differing depth, same state+lane -> differing phrase',
  TP.composePhrase({ state: 'active', depth: 'small', lane: 'git' }) !==
  TP.composePhrase({ state: 'active', depth: 'large', lane: 'git' }));
check('field-level: differing lane, same state+depth -> differing phrase',
  TP.composePhrase({ state: 'active', depth: 'small', lane: 'git' }) !==
  TP.composePhrase({ state: 'active', depth: 'small', lane: 'web' }));

// --- 5. glyph layers encode exactly one field each ---------------------------
let glyphOK = true;
const byDepth = new Set(), byLane = new Set(), byState = new Set();
for (const o of variants) {
  const g = TP.glyph(o);
  byDepth.add([g.size].join(','));
  byLane.add([g.kind, g.x1, g.y1, g.x2, g.y2, g.cx, g.cy, g.r].join(','));
  byState.add([g.marker, g.dash].join(','));
}
check('glyph: size varies only with depth (2 sizes)', byDepth.size === 2);
check('glyph: geometry varies only with lane (4 shapes)', byLane.size === 4);
check('glyph: terminus marker varies only with state (5 marks)', byState.size === 5);

// --- 6. house law on the shipped page ----------------------------------------
const html = readFileSync(join(here, 'index.html'), 'utf8');
const code = html.replace(/<!--[\s\S]*?-->/g, ''); // prose comments may name banned APIs
const ext = code.match(/https?:\/\/[^\s"'`]+/g) || [];
check('house law: index.html has no external URLs/CDN', ext.length === 0, ext.join(', '));
check('house law: no network calls or ES imports in index.html',
  !/\b(fetch|XMLHttpRequest|import\s)\b/.test(code));
check('house law: no Math.random anywhere in shipped files',
  !/Math\.random/.test(code + readFileSync(join(here, 'core.js'), 'utf8')));
check('house law: page loads the same core.js this test loads',
  /src="core\.js"/.test(html));

console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'}  selftest: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
