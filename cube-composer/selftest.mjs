#!/usr/bin/env node
// selftest.mjs — CUBE COMPOSER v0 · node-only, no deps.
// Proves: wall algebra, composition order, every level solvable by its own
// documented solution, target ≠ start, shelf covers solution, deterministic
// tags, and no randomness anywhere in the source.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const C = require(join(dirname(fileURLToPath(import.meta.url)), 'core.js'));

let n = 0, fail = 0;
function ck(name, ok) {
  n++;
  if (ok) { console.log('PASS ' + n + ' ' + name); }
  else { fail++; console.log('FAIL ' + n + ' ' + name); }
}

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// 1 · wall algebra
ck('map Y→R', eq(C.run([['Y', 'R'], ['B', 'Y']], ['map:Y:R']), [['R', 'R'], ['B', 'R']]));
ck('reverse per stack', eq(C.run([['Y', 'R', 'B']], ['reverse']), [['B', 'R', 'Y']]));
ck('reject R drops empty stacks', eq(C.run([['Y', 'R'], ['R'], ['B', 'B']], ['reject:R']), [['Y'], ['B', 'B']]));
ck('stack B on top', eq(C.run([['Y'], ['R', 'G']], ['stack:B']), [['Y', 'B'], ['R', 'G', 'B']]));
ck('flip wall order', eq(C.run([['Y'], ['B'], ['R']], ['flip']), [['R'], ['B'], ['Y']]));

// 2 · composition is ORDERED (f >>> g ≠ g >>> f where colors chain)
const w = [['Y', 'R'], ['R', 'Y']];
ck('order matters (map Y→R >>> map R→B ≠ map R→B >>> map Y→R)',
  !eq(C.run(w, ['map:Y:R', 'map:R:B']), C.run(w, ['map:R:B', 'map:Y:R'])));

// 3 · every level: its solution solves it, within its slot budget
for (const lv of C.LEVELS) {
  ck(lv.id + ' ' + lv.title + ': solution solves', eq(C.run(lv.start, lv.solution), lv.target));
  ck(lv.id + ' target ≠ start', !eq(lv.start, lv.target));
  ck(lv.id + ' solution fits slots', lv.solution.length <= lv.slots);
  ck(lv.id + ' shelf covers solution', lv.solution.every(id => lv.shelf.includes(id)));
  ck(lv.id + ' shelf ids are real fns', lv.shelf.every(id => C.hasFn(id)));
  ck(lv.id + ' tag deterministic', C.levelTag(lv) === C.levelTag(JSON.parse(JSON.stringify(lv))));
}

// 4 · purity + determinism law (P2): no randomness in any shipped source
const here = dirname(fileURLToPath(import.meta.url));
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
for (const f of ['core.js', 'index.html']) {
  const src = stripComments(readFileSync(join(here, f), 'utf8'));
  ck(f + ' has no Math.random call', !/Math\.random/.test(src));
  ck(f + ' has no Date.now clock identity', !/Date\.now\(/.test(src));
}

console.log(fail ? 'CUBE COMPOSER FAIL ' + (n - fail) + '/' + n : 'CUBE COMPOSER PASS ' + n + '/' + n);
process.exit(fail ? 1 : 0);
