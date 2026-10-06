#!/usr/bin/env node
/* THE CALL — selftest for the F-P1 (withheld copy) + F-P2 (option rotation) fixes.
   Run from the repo root:  node tools/the-call-copy-rotation-selftest.mjs
   Fails BEFORE the fixes, passes AFTER. Exit 1 on any failure.

   F-P2 is checked by executing the real page script (minimal DOM stubs) and calling
   the real buildDeck(). F-P1 is a static check of the withheld-ending literal. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const game = join(root, '20261006-the-call-mcvoid');
const html = readFileSync(join(game, 'index.html'), 'utf8');

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS' : 'FAIL') + ' — ' + msg); if (!cond) fails++; };

/* ---- F-P1: the withheld copy is face-aware and counted (static) ---- */
ok(!html.includes('These seven cards are about what was done with words to you'),
   'old withheld line ("These seven cards … words to you") is gone');
ok(html.includes("'These '+MATTERS.length+' cards are '"),
   'withheld line counts the actual run (MATTERS.length)');
ok(html.includes('ABOUT[window.GAME_FACE]'),
   'withheld line is face-aware (ABOUT[window.GAME_FACE])');

/* ---- F-P2: option rotation in buildDeck (runtime — runs the real page script) ---- */
const el = () => ({ textContent: '', innerHTML: '', disabled: false, style: {}, dataset: {},
  classList: { add() {}, remove() {}, contains() { return false; } },
  addEventListener() {}, appendChild() {}, querySelector() { return null; },
  querySelectorAll() { return []; }, scrollIntoView() {}, focus() {} });
global.window = global;
global.document = { getElementById: el, querySelector: () => el(), querySelectorAll: () => [],
  addEventListener() {}, body: {}, createElement: el };
global.location = { search: '', href: '', replace() {} };
try { Object.defineProperty(global, 'navigator', { value: { clipboard: { writeText: async () => {} } }, configurable: true }); } catch { /* node ships a getter-only navigator; the built-in is fine */ }

for (const f of ['deck-crew.js', 'deck-euphemism.js', 'deck-onboarding.js', 'deck-apac.js'])
  new Function(readFileSync(join(game, f), 'utf8')).call(global);
ok(!!global.APAC_DECK && !!global.CREW_DECK && !!global.EUPHEMISM_DECK && !!global.ONBOARDING_DECK,
   'deck files load (APAC/CREW/EUPHEMISM/ONBOARDING present)');

const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const script = blocks.sort((a, b) => b.length - a.length)[0];
const api = new Function(script + '\n;return {buildDeck};').call(global);

const ri = d => d.map(c => c.calls.findIndex(k => k.right === true));
for (const face of ['apac', 'first90', 'euphemism']) {
  const d = api.buildDeck(face);
  const r = ri(d);
  ok(d.length > 0 && r.every(x => x >= 0), face + ': every card has exactly one right call');
  const at0 = r.filter(x => x === 0).length;
  ok(at0 < r.length, face + ': right call is no longer always first (' + at0 + '/' + r.length + ' at index 0)');
  ok(new Set(r).size >= 2, face + ': right-call position varies across cards');
  const letters = d.every(c => c.calls.map(k => k.k).join('') === c.calls.map((_, j) => String.fromCharCode(65 + j)).join(''));
  ok(letters, face + ': option letters relabel by position (A,B,C)');
}
const apac8 = api.buildDeck('apac').slice(0, 8).map(c => c.who);
const want = ['country manager, Jakarta', 'security incident commander', 'trust & safety lead',
  'marketplace compliance PM', 'global platform ops director', 'regional privacy counsel',
  'Thai country counsel', 'procurement lead, Bangkok'];
ok(JSON.stringify(apac8) === JSON.stringify(want), 'first eight APAC cards unchanged and in order');

console.log(fails ? '\n' + fails + ' FAILURE(S)' : '\nall checks passed');
process.exit(fails ? 1 : 0);