#!/usr/bin/env node
/* selftest.mjs — POV MOD · node, zero dependencies.
 *
 *   node selftest.mjs        -> prints PASS/FAIL per check, exits 0 only on all green
 *
 * Loads ../cube-composer/core.js then ./core.js through vm with an injected
 * `module.exports` so the checks run exactly the page's own modules (P6 absorb
 * law: the algebra is read from its one home, never a copy).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const read = (f) => readFileSync(join(here, f), 'utf8');
const readUp = (f) => readFileSync(join(here, '..', f), 'utf8');

const html = read('index.html');
const povCoreSrc = read('core.js');
const ccSrc = readUp('core.js');

function load(src, filename) {
  const sandbox = { module: { exports: {} }, exports: {}, TextEncoder, console };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename });
  return { api: sandbox.module.exports, sandbox };
}

let pass = 0, total = 0;
const rows = [];
function ck(name, cond) {
  total++;
  if (cond) pass++;
  rows.push((cond ? 'PASS' : 'FAIL') + ' · ' + name);
}

/* --- load the page's own modules ------------------------------------- */
const { sandbox } = load(ccSrc, 'core.js');
const CC = sandbox.module.exports;
const POV = (function () {
  const s2 = { module: { exports: {} }, exports: {}, console, CubeComposerCore: CC };
  s2.globalThis = s2;
  vm.createContext(s2);
  vm.runInContext(povCoreSrc, s2, { filename: 'pov/core.js' });
  return s2.module.exports;
})();

/* --- the algebra is absorbed, not duplicated (P6) --------------------- */
ck('pov/core.js never re-implements the algebra', !/function mapC|function reject\(/.test(povCoreSrc));
ck('pov/core.js consumes CubeComposerCore', /CubeComposerCore/.test(povCoreSrc));
ck('index.html loads the one algebra home', html.includes('src="../core.js"'));

/* --- every level solves with its own documented solution -------------- */
for (const lv of CC.LEVELS) {
  ck(`level ${lv.id} solved by [${lv.solution.join(' >>> ')}]`, POV.solveCheck(lv, lv.solution));
}
ck('no solution overruns its slot budget', CC.LEVELS.every((lv) => lv.solution.length <= lv.slots));

/* --- composition semantics (order matters — the lesson of L3) --------- */
const L3 = CC.level('L3');
ck('L3 wrong order does NOT solve', !POV.solveCheck(L3, ['map:R:B', 'map:Y:R']));
ck('L3 right order solves', POV.solveCheck(L3, L3.solution));
ck('unknown fn is refused', (() => {
  try { CC.run(L3.start, ['nope']); return false; } catch (e) { return /UNKNOWN_FN/.test(e.message); }
})());

/* --- the delta (colour is the change) -------------------------------- */
const L5 = CC.level('L5');
{
  const end = CC.run(L5.start, L5.solution);
  const d = POV.wallDiff(L5.start, end);
  ck('delta reports changed tiles', d.changed.length > 0);
  ck('delta reports REJECT ghosts (L5 rejects Y)', d.ghosts.length > 0);
  ck('clean delta is empty', (() => {
    const z = POV.wallDiff(L5.start, CC.clone(L5.start));
    return z.changed.length === 0 && z.ghosts.length === 0;
  })());
}

/* --- the net (the map you hold) -------------------------------------- */
ck('five rooms on the net', POV.ROOMS.length === 5 && POV.NET.length === 5);
ck('net cells unique', new Set(POV.ROOMS.map((r) => r.cell.join(','))).size === 5);
ck('centre room is the start room', POV.roomAt(0, 0).index === 0);

/* --- deterministic identity (P2) ------------------------------------- */
ck('level tags deterministic', CC.LEVELS.every((lv) => CC.levelTag(lv) === CC.levelTag(lv)));
ck('chain tags deterministic', JSON.stringify(POV.chainTags(L5, L5.solution)) === JSON.stringify(POV.chainTags(L5, L5.solution)));
ck('decode names every shelf fn', CC.LEVELS.every((lv) => lv.shelf.every((id) => POV.decodeFn(id).known && POV.decodeFn(id).what !== 'unknown function')));

/* --- house static law (no randomness, no external fetches) ------------ */
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
ck('no Math.random anywhere', !/Math\.random/.test(stripComments(html) + stripComments(povCoreSrc)));
ck('no external resource loads', !/<script[^>]+src="https?:|<link[^>]+href="https?:|<img[^>]+src="https?:/.test(html));
ck('phone-first viewport', /name="viewport"/.test(html));
ck('prefers-reduced-motion honoured', /prefers-reduced-motion/.test(html));
ck('P1 palette numbers present', html.includes('rgb(8,12,18)') && html.includes('rgb(79,87,96)'));
ck('in-page verdict hook present', html.includes('id="selftest"'));
ck('decode overlay present (P11d)', html.includes('id="decode"'));
ck('six faces drawn', (html.match(/class="face /g) || []).length === 6);

/* --- the stroke instrument (PovBrush: pure mapping, deterministic) ------ */
const PB = (function () {
  const s3 = { module: { exports: {} }, exports: {}, console };
  s3.globalThis = s3;
  vm.createContext(s3);
  vm.runInContext(read('brush.js'), s3, { filename: 'pov/brush.js' });
  return s3.module.exports;
})();
ck('brush.js names its donor', read('brush.js').includes('f9033a8b') && read('brush.js').includes('Sonification Handbook'));
ck('brush mapping deterministic (same input, same width)', JSON.stringify(PB.brushWidth(10, 10, { x: 0, y: 0 }, 16)) === JSON.stringify(PB.brushWidth(10, 10, { x: 0, y: 0 }, 16)));
ck('tone mapping deterministic + bounded', (() => {
  const t = PB.tone(360, 220, 12, 3, { w: 720, h: 440 });
  return t.freq > 180 && t.freq <= 1400 && t.pan >= -0.8 && t.pan <= 0.8 && t.amp > 0 && t.amp <= 0.5 &&
    JSON.stringify(t) === JSON.stringify(PB.tone(360, 220, 12, 3, { w: 720, h: 440 }));
})());
ck('fast stroke is thinner than slow (velocity -> width)', PB.brushWidth(40, 0, { x: 0, y: 0 }, 8).w < PB.brushWidth(10, 0, { x: 0, y: 0 }, 8).w);
ck('gesture record names its field', PB.record([{ x: 1, y: 2, t: 100, v: 0.5 }]).field === 'gesture.trace');
ck('no Math.random in brush.js', !/Math\.random/.test(stripComments(read('brush.js'))));
ck('page wires the floor instrument', html.includes('brush.js') && html.includes('floorInk') && html.includes('gesture.trace'));

console.log(rows.join('\n'));
console.log(`${pass === total ? 'PASS' : 'FAIL'} ${pass}/${total}`);
process.exit(pass === total ? 0 : 1);
