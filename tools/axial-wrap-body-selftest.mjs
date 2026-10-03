#!/usr/bin/env node
import fs from 'node:fs';

const path = new URL('../field/axial-probe/wrap-body-a4.svg', import.meta.url);
const s = fs.readFileSync(path, 'utf8');

function attr(id, name) {
  const m = s.match(new RegExp(`<[^>]+id="${id}"[^>]*\\b${name}="([^"]+)"`));
  if (!m) throw new Error(`missing ${id}.${name}`);
  return Number(m[1]);
}
function has(id) {
  if (!new RegExp(`id="${id}"`).test(s)) throw new Error(`missing id ${id}`);
}
function near(a,b,eps=1e-9){ return Math.abs(a-b) <= eps; }
function assert(ok,msg){ if(!ok) throw new Error(msg); }

assert(/width="297mm"/.test(s) && /height="210mm"/.test(s) && /viewBox="0 0 297 210"/.test(s), 'not exact A4 landscape');
assert(near(attr('core-body','width'),160), 'core working circumference != 160 mm');
assert(near(attr('core-body','height'),90), 'core height != 90 mm');
assert(near(attr('core-tab','width'),8), 'core seam tab != 8 mm');
assert(near(attr('ring-body','width'),160), 'ring working circumference != 160 mm');
assert(near(attr('ring-tab','width'),6), 'ring tab != 6 mm');
assert(near(attr('sleeve-body','width'),160), 'sleeve working circumference != 160 mm');
assert(near(attr('sleeve-tab','width'),6), 'sleeve tab != 6 mm');

const detents = Array.from({length:8},(_,i)=>attr(`ring-detent-${i}`,'x'));
for (let i=1;i<detents.length;i++) assert(near(detents[i]-detents[i-1],20), `ring detent spacing ${i} != 20 mm`);

const depths = [4,3,2,1,0].map(i=>attr(`depth-${i}`,'y1'));
for (let i=1;i<depths.length;i++) assert(near(depths[i]-depths[i-1],7), `depth spacing ${i} != 7 mm`);

const slitA = attr('axis-slit-a','x1');
const slitB = attr('axis-slit-b','x1');
assert(near(slitB-slitA,80), 'axis slots are not half a 160 mm circumference apart');

const axis = ['axis-mark-neg','axis-mark-zero','axis-mark-pos'].map(id=>attr(id,'x1'));
assert(near(axis[1]-axis[0],30) && near(axis[2]-axis[1],30), 'axis positions are not evenly spaced');

const cal = attr('calibration-100mm','x2') - attr('calibration-100mm','x1');
assert(near(cal,100), 'calibration line != 100 mm');
for (const id of ['ring-gate','sleeve-pointer','axis-slit-a','axis-slit-b','calibration-100mm']) has(id);

const nominalDiameter = 160 / Math.PI;
assert(nominalDiameter > 50.9 && nominalDiameter < 51.0, 'nominal diameter sanity failed');

console.log(JSON.stringify({
  test: 'AXIAL WRAP BODY 0.1',
  a4_mm: [297,210],
  core_circumference_mm: 160,
  nominal_diameter_mm: Number(nominalDiameter.toFixed(3)),
  ring_detents: 8,
  ring_spacing_mm: 20,
  depth_positions: 5,
  depth_spacing_mm: 7,
  axis_positions: 3,
  axis_spacing_mm: 30,
  axis_slot_separation_mm: 80,
  calibration_mm: 100,
  result: 'PASS'
}, null, 2));
