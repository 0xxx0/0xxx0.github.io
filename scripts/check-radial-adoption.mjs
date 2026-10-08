#!/usr/bin/env node
/**
 * check-radial-adoption.mjs — radial instruments share the lib's polar math: a GATE, not a claim.
 *
 * WHY THIS EXISTS
 *   Operator ask 2026-10-06 (DM 369517): "i want our tools to work for us so yall should be
 *   able to use the same microlib same tools ie in terms of math or whatever but yall can
 *   have different representations". Wave-2 move 1 (AXIS/work/microlib/BRIEF-2026-10-06.md):
 *   radial dial math converges on lib/ — instruments stop carrying private copies of the
 *   primitives the lib already owns.
 *
 * WHAT IT ASSERTS
 *   R1  lib/interphase-ring.js still owns and exports the shared ground (TAU/clamp/wrap/
 *       circularDelta/polar) and those primitives BEHAVE (runtime values, not a text claim).
 *   R2  TWO DIAL: /lib/interphase-ring.js loads BEFORE core1.js; core1.js binds
 *       TAU/wrap/clamp from the loaded namespace (CYCLIC) and carries no private copies.
 *   R3  ATLAS DAYLINE: /lib/interphase-ring.js loads BEFORE app.js; app.js binds
 *       TAU/clamp/point(polar) from the loaded namespace; its service worker precaches
 *       the shared module.
 *   R4  FOLD//BLOOM LISTEN: pointAngle01 comes from lib/polar-control.js and the vendored
 *       byte-identical copy is gone.
 *   R5  zero vendored copies remain: exactly ONE polar-control.js exists in the tree.
 *
 * THE FLOOR — SCOPE, NOT FAILURE
 *   This gate asserts the CONVERGED set (wave 2). Many single-copy polar primitives remain
 *   elsewhere (fovea-lens.js, sleeper/*, fold-bloom/{live,listen} renderers, spikes/*…).
 *   "One copy is a fact; two is a pattern; three is a library function" — convergence
 *   targets are decided per wave, not by grep. The scan below REPORTS the remaining
 *   private TAU declarations as scope and never fails on them.
 *
 * CONTROLS (run 2026-10-06)
 *   red:   node scripts/check-radial-adoption.mjs --root <pre-fix worktree>  → FAIL (R2/R3/R4/R5)
 *   green: node scripts/check-radial-adoption.mjs                           → PASS
 *
 * Usage: node scripts/check-radial-adoption.mjs [--root DIR] [--json]
 * Exit:  0 ok · 1 violation · 3 missing inputs
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { createRequire } from 'node:module';

const argv = process.argv.slice(2);
const asJson = argv.includes('--json');
const ri = argv.indexOf('--root');
const ROOT = resolve(ri >= 0 ? argv[ri + 1] : process.cwd());
const require_ = createRequire(import.meta.url);

const violations = [];
const info = [];
const bad = (rule, path, why) => violations.push({ rule, path, why });

/* ---------- inputs ---------- */
const F = {
  ring: 'lib/interphase-ring.js',
  twoDialHtml: 'fold-bloom/two-dial/index.html',
  twoDialCore: 'fold-bloom/two-dial/core1.js',
  atlasHtml: 'atlas-dayline/index.html',
  atlasApp: 'atlas-dayline/app.js',
  atlasSw: 'atlas-dayline/sw.js',
  listenApp: 'fold-bloom/listen/app.js',
  listenCopy: 'fold-bloom/listen/polar-control.js',
};
const missing = [];
const src = {};
for (const [k, rel] of Object.entries(F)) {
  if (k === 'listenCopy') continue; // asserted ABSENT below
  const p = join(ROOT, rel);
  if (!existsSync(p)) { missing.push(rel); continue; }
  src[k] = readFileSync(p, 'utf8');
}
if (missing.length) {
  console.error('radial-adoption gate: missing inputs:\n  ' + missing.join('\n  '));
  process.exit(3);
}

/* ---------- R1: the shared ground exists and behaves ---------- */
if (!/VERSION\s*,\s*TAU\s*,\s*clamp\s*,\s*wrap\s*,\s*circularDelta/.test(src.ring)) {
  bad('R1', F.ring, 'no longer exports TAU/clamp/wrap/circularDelta — the shared ground is gone');
} else {
  let R = null;
  try { R = require_(join(ROOT, F.ring)); } catch (e) {
    bad('R1', F.ring, 'does not load under node: ' + String(e && e.message));
  }
  if (R) {
    const behaved = [];
    const eq = (name, got, want) => {
      if (!Object.is(got, want)) bad('R1', F.ring, `${name} → ${String(got)}, expected ${String(want)}`);
      else behaved.push(name);
    };
    const near = (name, got, want, eps) => {
      if (typeof got !== 'number' || Math.abs(got - want) > eps) bad('R1', F.ring, `${name} → ${String(got)}, expected ≈${String(want)}`);
      else behaved.push(name);
    };
    eq('TAU', R.TAU, Math.PI * 2);
    eq('clamp', R.clamp(5, 0, 1), 1);
    eq('wrap', R.wrap(-0.25, 1), 0.75);
    near('circularDelta', R.circularDelta(0.1, 0.9, 1), 0.2, 1e-9);
    eq('polar', JSON.stringify(R.polar(0, 0, 1, 0)), JSON.stringify([1, 0]));
    if (behaved.length === 5) info.push({ key: 'ring_runtime', value: behaved.join(',') });
  }
}

/* ---------- R2: TWO DIAL ---------- */
{
  const h = src.twoDialHtml, c = src.twoDialCore;
  const ringIdx = h.indexOf('/lib/interphase-ring.js');
  const coreIdx = h.indexOf('./core1.js');
  if (ringIdx < 0) bad('R2', F.twoDialHtml, 'does not load /lib/interphase-ring.js');
  else if (coreIdx < 0) bad('R2', F.twoDialHtml, 'does not load ./core1.js');
  else if (ringIdx > coreIdx) bad('R2', F.twoDialHtml, '/lib/interphase-ring.js must load BEFORE ./core1.js');
  for (const b of ['CYCLIC.TAU', 'CYCLIC.wrap', 'CYCLIC.clamp']) {
    if (!c.includes(b)) bad('R2', F.twoDialCore, `does not bind ${b}`);
  }
  if (/TAU\s*=\s*Math\.PI\s*\*\s*2/.test(c)) bad('R2', F.twoDialCore, 'still declares a private TAU = Math.PI * 2');
  if (/function\s+wrap\s*\(/.test(c)) bad('R2', F.twoDialCore, 'still defines a private wrap()');
  if (/function\s+clamp\s*\(/.test(c)) bad('R2', F.twoDialCore, 'still defines a private clamp()');
}

/* ---------- R3: ATLAS DAYLINE ---------- */
{
  const ringIdx = src.atlasHtml.indexOf('/lib/interphase-ring.js');
  const appIdx = src.atlasHtml.indexOf('./app.js');
  if (ringIdx < 0) bad('R3', F.atlasHtml, 'does not load /lib/interphase-ring.js');
  else if (appIdx < 0) bad('R3', F.atlasHtml, 'does not load ./app.js');
  else if (ringIdx > appIdx) bad('R3', F.atlasHtml, '/lib/interphase-ring.js must load BEFORE ./app.js');
  const a = src.atlasApp;
  if (!/globalThis\.InterphaseRing/.test(a)) bad('R3', F.atlasApp, 'does not resolve globalThis.InterphaseRing');
  if (!/RING\.TAU/.test(a)) bad('R3', F.atlasApp, 'does not bind TAU from the ring namespace');
  if (!/RING\.clamp/.test(a)) bad('R3', F.atlasApp, 'does not bind clamp from the ring namespace');
  if (!/RING\.polar\(/.test(a)) bad('R3', F.atlasApp, 'does not call RING.polar (point)');
  if (/Math\.PI\s*\*\s*2/.test(a)) bad('R3', F.atlasApp, 'still declares a private TAU = Math.PI*2');
  if (/Math\.max\(a,\s*Math\.min\(b/.test(a)) bad('R3', F.atlasApp, 'still carries a private clamp body');
  if (!/\/lib\/interphase-ring\.js/.test(src.atlasSw)) bad('R3', F.atlasSw, 'service worker does not precache /lib/interphase-ring.js');
}

/* ---------- R4: LISTEN's vendored copy ---------- */
{
  const imp = src.listenApp.match(/import\s*\{([^}]*)\}\s*from\s*['"]([^'"]*polar-control\.js)['"]/);
  if (!imp) bad('R4', F.listenApp, 'no longer imports polar-control at all');
  else {
    if (!/pointAngle01/.test(imp[1])) bad('R4', F.listenApp, 'does not import pointAngle01 from polar-control');
    if (!/lib\/polar-control\.js/.test(imp[2])) bad('R4', F.listenApp, `imports ${imp[2]} — expected the lib path`);
  }
  if (existsSync(join(ROOT, F.listenCopy))) {
    bad('R4', F.listenCopy, 'vendored byte-identical copy still exists — the lib path is one hop away');
  }
}

/* ---------- R5: zero vendored polar-control copies in the tree ---------- */
const SKIP = new Set(['.git', 'node_modules']);
const walk = (dir, fn) => {
  for (const e of readdirSync(dir)) {
    if (SKIP.has(e)) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, fn);
    else fn(p, e);
  }
};
const copies = [];
walk(ROOT, (p, e) => { if (e === 'polar-control.js') copies.push(relative(ROOT, p).replace(/\\/g, '/')); });
if (copies.length !== 1 || copies[0] !== 'lib/polar-control.js') {
  bad('R5', 'tree', `expected exactly lib/polar-control.js, found: ${copies.join(', ') || '(none)'}`);
}

/* ---------- scope report: private TAU declarations that are NOT this wave ---------- */
const privateTau = [];
walk(ROOT, (p, e) => {
  if (!e.endsWith('.js')) return;
  const rel = relative(ROOT, p).replace(/\\/g, '/');
  if (rel.startsWith('lib/') || rel.startsWith('recovery/')) return;
  let body = '';
  try { body = readFileSync(p, 'utf8'); } catch { return; }
  if (/TAU\s*=\s*Math\.PI\s*\*\s*2/.test(body)) privateTau.push(rel);
});

info.push({ key: 'converged', value: 'two-dial, atlas-dayline, listen' });
info.push({ key: 'private_tau_remaining', value: privateTau.length, detail: privateTau });

const status = violations.length === 0 ? 'PASS' : 'FAIL';

if (asJson) {
  console.log(JSON.stringify({
    status, root: ROOT,
    rule: 'MICROLIB wave 2 — radial dial math converges on lib/ (AXIS/work/microlib/BRIEF-2026-10-06.md)',
    violations, info,
  }, null, 1));
} else {
  console.log('');
  for (const v of violations) console.log(`  ✗ ${v.rule}  ${v.path}\n      ${v.why}`);
  console.log('');
  console.log(
    `RADIAL ADOPTION ${status} · converged: TWO DIAL + ATLAS DAYLINE + LISTEN · ` +
    `private TAU remaining (later waves, scope not verdict): ${privateTau.length} · ` +
    `${violations.length} violation(s)`
  );
  if (privateTau.length) {
    console.log(`  later waves: ${privateTau.slice(0, 12).join(', ')}${privateTau.length > 12 ? ' …' : ''}`);
  }
}
process.exit(status === 'PASS' ? 0 : 1);