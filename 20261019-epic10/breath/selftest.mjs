#!/usr/bin/env node
// L6 BREATH selftest — node, no deps.
// Tests the SHIPPED source: extracts the pure phase core from index.html and exercises it.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const here = new URL('.', import.meta.url);
const html = readFileSync(new URL('index.html', here), 'utf8');

let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  [${detail}]` : ''}`);
  if (!ok) failures++;
}

// --- 1. pure phase core must live inside the shipped page ------------------
const m = html.match(/\/\* @pure-core:start \*\/([\s\S]*?)\/\* @pure-core:end \*\//);
check('pure phase core present in index.html', !!m);

const sandbox = {};
vm.createContext(sandbox);
if (m) vm.runInContext(m[1], sandbox, { filename: 'pure-core.js' });
const { phaseAt, phaseConfig, cycleSeconds } = sandbox;
check('phaseAt / phaseConfig / cycleSeconds callable',
  [phaseAt, phaseConfig, cycleSeconds].every((f) => typeof f === 'function'));

// --- 2. determinism: same t -> same radius --------------------------------
const res = phaseConfig('resonance', 5.5);
let det = true;
for (const t of [0, 0.001, 1, 3.636, 5.45, 7.272, 10.909, 10.9091, 100.25, 3600]) {
  const a = phaseAt(t, res), b = phaseAt(t, res);
  if (a.radius !== b.radius || a.phase !== b.phase || a.progress !== b.progress) det = false;
}
for (let i = 0; i <= 2000; i++) {
  const t = i * 0.017;
  if (phaseAt(t, res).radius !== phaseAt(t, res).radius) det = false;
}
check('deterministic: same t -> same radius (swept)', det);

// --- 3. 4s / 4s / 4s cycle sums to 12s ------------------------------------
const box = phaseConfig('box', 5.5);
check('box preset is exactly 4s in / 4s hold / 4s out',
  box.in === 4 && box.hold === 4 && box.out === 4);
check('4s + 4s + 4s cycle sums to 12s', cycleSeconds(box) === 12, `got ${cycleSeconds(box)}`);
check('cycle repeats: radius(0) === radius(12) and phase back to IN',
  phaseAt(0, box).radius === phaseAt(12, box).radius && phaseAt(12, box).phase === 'IN');
check('phase boundaries: t=4 HOLD, t=8 OUT',
  phaseAt(4, box).phase === 'HOLD' && phaseAt(8, box).phase === 'OUT');

// --- 4. presets + radius bounds -------------------------------------------
const p478 = phaseConfig('478', 5.5);
check('4-7-8 preset is 4s / 7s / 8s (19s cycle)',
  p478.in === 4 && p478.hold === 7 && p478.out === 8 && cycleSeconds(p478) === 19);
check('resonance default 5.5/min -> ~10.909s cycle',
  Math.abs(cycleSeconds(res) - 60 / 5.5) < 1e-9);
let bounds = true;
for (const p of ['resonance', 'box', '478']) {
  const c = phaseConfig(p, 5.5);
  for (let i = 0; i <= 1200; i++) {
    const r = phaseAt(i * 0.031, c).radius;
    if (!(r >= 0 && r <= 1)) bounds = false;
  }
}
check('radius stays within [0,1] for every preset', bounds);

// --- 5. reduced-motion code path exists -----------------------------------
check('prefers-reduced-motion honoured in source',
  html.includes('prefers-reduced-motion: reduce') && html.includes('reducedMotion'));
check('reduced-motion static-arc branch exists',
  /function drawStaticArc\(/.test(html) && /if \(reducedMotion\)/.test(html));

// --- 6. honest scope label -------------------------------------------------
check('honest scope label present verbatim',
  html.includes('SOFTWARE PACER — NO SENSOR. HRV READOUT NEEDS A REAL DEVICE'));
check('device gate names the property that cannot be simulated',
  /true inter-beat-interval fidelity/i.test(html));

// --- 7. house law ----------------------------------------------------------
check('no Math.random anywhere', !html.includes('Math.random'));
check('no external fetch / CDN / http(s)',
  !/https?:\/\//i.test(html) && !/<script[^>]+src=/i.test(html) && !/@import/.test(html));
check('driven by requestAnimationFrame + performance.now elapsed clock',
  html.includes('requestAnimationFrame') && html.includes('performance.now()'));
check('BEGIN control present', html.includes('BEGIN'));

console.log(failures === 0 ? '\nSELFTEST PASS' : `\nSELFTEST FAIL (${failures} failing)`);
process.exit(failures === 0 ? 0 : 1);
