/* gap-card-selftest.mjs — THE CALL: the CREW gap card plays exactly once, last.
 * Regression for the duplication found 2026-10-07 (task t_860db858):
 * buildDeck('crew') once did crew.concat(gapcard) and then the common return appended
 * gapcard again — 15 cards, the SELF-AUDIT-2026-10-05.md #1 card double-weighted at the
 * tail. Contract under test (SELF-AUDIT-2026-10-05.md #1 card, cited in deck-crew.js):
 *   1. buildDeck('crew') is exactly 14 cards (CREW_DECK's own scope).
 *   2. the gap card appears exactly once in the assembled run (uniqueness).
 *   3. the gap card is the final card (position 13, 0-based).
 *   4. the first eight CREW cards are unchanged and in CREW_DECK order.
 * Relocated to tools/ 2026-10-07 (kage reapply): root resolves ../20261006-the-call-mcvoid.
 * Run: node tools/gap-card-selftest.mjs  (from repo root; exits non-zero on the first failed assertion)
 */
import {existsSync, readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

/* REPAIR 2026-10-07: retired set — resolve live -> archived (f16417cf moved it). */
const root=['20261006-the-call-mcvoid','archive/temp/2026-11-05/20261006-the-call-mcvoid']
  .map(p=>join(dirname(fileURLToPath(import.meta.url)),'..',p)).find(existsSync);
const assert=(x,m)=>{if(!x){console.error('gap-card-selftest: FAIL — '+m);process.exit(1)}};

/* Load the real deck files into a window shim, then run the real inline deck-assembly
 * code (FLOOR + buildDeck) sliced out of index.html — the test exercises the shipped
 * source, not a re-implementation. */
const ctx=vm.createContext({window:{}});
for(const f of ['deck-crew.js','deck-euphemism.js','deck-onboarding.js','deck-apac.js']){
  vm.runInContext(readFileSync(join(root,f),'utf8'),ctx,{filename:f});
}
const html=readFileSync(['index.html','index.html.frozen'].map(f=>join(root,f)).find(existsSync),'utf8');
const fStart=html.indexOf('const FLOOR=[');
const bdStart=html.indexOf('function buildDeck(');
assert(fStart>=0&&bdStart>fStart,'index.html no longer contains FLOOR + buildDeck where expected');
const bdEnd=html.indexOf('\n}',bdStart)+2;
vm.runInContext(html.slice(fStart,bdEnd)+'\nglobalThis.__buildDeck=buildDeck;',ctx,{filename:'index.html#deck-assembly'});
const buildDeck=ctx.__buildDeck;

const CREW=ctx.window.CREW_DECK;
const isGap=c=>/SELF-AUDIT-2026-10-05\.md #1/i.test(c.source||'');

assert(Array.isArray(CREW)&&CREW.length===14,'CREW_DECK must be 14 cards (deck scope)');

const deck=buildDeck('crew');
assert(deck.length===14,'buildDeck(\'crew\') must be 14 cards, got '+deck.length);

const gaps=deck.filter(isGap);
assert(gaps.length===1,'gap card must appear exactly once, got '+gaps.length);
assert(isGap(deck[deck.length-1]),'gap card must be the final card');

const keys=deck.map(c=>String(c.who)+'\u0000'+String(c.source));
assert(new Set(keys).size===deck.length,'no card may appear twice in the assembled run');

for(let i=0;i<8;i++){
  assert(JSON.stringify(deck[i])===JSON.stringify(CREW[i]),
    'first-eight CREW card '+i+' changed or out of order');
}

console.log('gap-card-selftest: PASS — 14 cards, gap card once, last, first eight in order');
