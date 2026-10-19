#!/usr/bin/env node
/* selftest.mjs — RIDE LOG instrument. node >= 18, zero deps, no DOM.
   Loads the SAME ride-core.js the page loads (createRequire), and proves:
     1. house law  — static only: no CDN/fetch, no randomness, system fonts
     2. determinism— same CSV -> same summary hash (and format-noise-invariant)
     3. formulas   — 3 known rows vs hand-computed constants + independent recompute
     4. honesty    — malformed CSV reports an error, never NaN
   One PASS/FAIL line per group; exit 1 on any FAIL. */

import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const RC = createRequire(import.meta.url)(join(here, 'ride-core.js'));

let pass = 0, fail = 0;
const line = (label, okFlag, detail = '') => {
  if (okFlag) { pass++; console.log(`PASS  ${label}${detail ? '   ' + detail : ''}`); }
  else { fail++; console.log(`FAIL  ${label}${detail ? '   ' + detail : ''}`); }
};
// every sub-condition must hold; failure names the first broken one
const group = (label, checks, detail = '') => {
  const bad = checks.filter((c) => !c[0]);
  line(label, bad.length === 0, bad.length ? '-> ' + bad.map((c) => c[1]).join('; ') : detail);
};
const close = (got, want, tol = 1e-9) =>
  [typeof got === 'number' && Number.isFinite(got) && Math.abs(got - want) <= tol,
   `got ${got} want ${want}`];

console.log(`RIDE LOG selftest — node ${process.version}, zero deps`);

/* ---- 1. files + house law ---- */
const SHIPPED = ['index.html', 'style.css', 'app.js', 'ride-core.js'];
group('files: index.html style.css app.js ride-core.js selftest.mjs present',
  SHIPPED.map((f) => [existsSync(join(here, f)), 'missing ' + f])
    .concat([[existsSync(join(here, 'selftest.mjs')), 'missing selftest.mjs']]));
const src = Object.fromEntries(SHIPPED.map((f) => [f, readFileSync(join(here, f), 'utf8')]));
const all = Object.values(src).join('\n');
group('house law: no CDN/external URL, no fetch/XHR/@import, no randomness',
  [[!/https?:\/\//i.test(all), 'http(s) URL found'],
   [!/fetch\s*\(|XMLHttpRequest|WebSocket|@import\s+url/i.test(all), 'network call found'],
   [!/Math\.random|crypto\.getRandomValues/.test(all), 'randomness found']]);
group('house law: system fonts only, phone-first viewport, CJK welcome',
  [[!/url\(|@font-face|font-family:\s*"/i.test(src['style.css']), 'web font / url() in CSS'],
   [/font:.*ui-monospace.*var\(--mono\)|--mono:.*ui-monospace/.test(src['style.css']), 'no ui-monospace stack'],
   [/name="viewport"[^>]*width=device-width/.test(src['index.html']), 'no viewport meta'],
   [/lang="zh"/.test(src['index.html']) && /輪電/.test(src['index.html']), 'CJK (輪, 電) missing']]);
group('house law: design law wired (pad/ink rgb, quiet cap, reduced motion)',
  [[/--pad:\s*rgb\(8,\s*12,\s*18\)/.test(src['style.css']), 'pad is not rgb(8,12,18)'],
   [/--ink:\s*rgb\(79,\s*87,\s*96\)/.test(src['style.css']), 'ink is not rgb(79,87,96)'],
   [Number((src['app.js'].match(/REST_A = ([0-9.]+)/) || [])[1]) <= 0.12, 'rest alpha above 0.12'],
   [/prefers-reduced-motion/.test(src['style.css']), 'no reduced-motion rule'],
   [!/requestAnimationFrame|setInterval|setTimeout\s*\(|getAnimations/.test(src['app.js']), 'ambient animation loop present']]);
const ids = [...new Set([...src['app.js'].matchAll(/\$\('([a-z0-9-]+)'\)/g)].map((m) => m[1]))];
group('wiring: every id app.js touches exists in index.html',
  [[ids.every((id) => new RegExp(`id="${id}"`).test(src['index.html'])),
    'missing: ' + ids.filter((id) => !new RegExp(`id="${id}"`).test(src['index.html'])).join(',')],
   [/<script src="ride-core\.js"><\/script>\s*<script src="app\.js"><\/script>/.test(src['index.html']),
    'classic script tags missing (file:// would break)']],
  `${ids.length} ids`);

/* ---- 2. sample integrity ---- */
const p0 = RC.parseCsv(RC.SAMPLE_CSV);
const rows = p0.rows || [];
const s0 = p0.ok ? RC.summarize(rows, { circ_m: 0.5 }) : { ok: false };
group('sample: parses, header mapped, exactly 200 rows',
  [[p0.ok === true, 'parse failed: ' + p0.error], [p0.header === true, 'header not detected'],
   [rows.length === 200, 'rows ' + rows.length]], `${rows.length} rows @ 500 ms = 99.5 s`);
const cur = rows.map((r) => r.current_a), tmp = rows.map((r) => r.temp_c), erp = rows.map((r) => r.erpm);
group('sample: is a ride — accel/cruise/hill spike/regen/heat',
  [[Math.max(...cur) >= 100, 'no hill current spike'],
   [cur.some((v) => v < 0) && s0.regen_s >= 20, 'no regen braking'],
   [Math.max(...tmp) - Math.min(...tmp) >= 15, 'no temperature rise'],
   [erp[0] === 0 && erp[erp.length - 1] === 0 && Math.max(...erp) > 900, 'does not start+stop at rest'],
   [rows.every((r) => r.duty >= -1 && r.duty <= 1), 'duty outside [-1,1]']],
  `peak I ${Math.max(...cur)} A, regen ${s0.regen_s} s, heat +${(Math.max(...tmp) - Math.min(...tmp)).toFixed(2)} degC`);

/* ---- 3. determinism ---- */
const h1 = RC.hashSummary(s0);
const h2 = RC.hashSummary(RC.summarize(RC.parseCsv(RC.SAMPLE_CSV).rows, { circ_m: 0.5 }));
const noisy = RC.parseCsv('\r\n# export\r\n' + RC.SAMPLE_CSV.replace(/\n/g, '\r\n') + '\r\n\r\n');
const hn = noisy.ok ? RC.hashSummary(RC.summarize(noisy.rows, { circ_m: 0.5 })) : 'parse-failed';
group('determinism: same CSV -> same summary hash, noise-invariant, carries C',
  [[h1 === h2, 'hash differs on reparse'], [noisy.ok && hn === h1, 'CRLF/comments changed the hash'],
   [RC.hashSummary(RC.summarize(rows, { circ_m: 0.56 })) !== h1, 'hash ignores wheel circumference']],
  `tag ${h1}`);

/* ---- 4. three known rows vs hand-computed constants ---- */
/* row 40 (cruise) 20000,1053,16.1,0.413,66.22,37.15 -> v=1053*0.5/60=8.775 m/s; P=66.22*16.1=1066.142 W
   segment to row 41: D=1051*0.5/60*0.5=4.3791666667 m; E=1092.3765*0.5/3600=0.1517189583 Wh, regen 0 s */
const A = rows[40], A2 = rows[41], sA = RC.summarize([A, A2], { circ_m: 0.5 });
group('row 40 (cruise): tokens + v = erpm*C/60 + P = V*I + segment D/E',
  [[A.raw.join(',') === '20000,1053,16.1,0.413,66.22,37.15', 'tokens changed'],
   ...[close(RC.speedFromErpm(A.erpm, 0.5), 8.775, 1e-12),
       close(RC.speedFromErpm(A.erpm, 0.5) * 3.6, 31.59, 1e-12),
       close(A.voltage_v * A.current_a, 1066.142),
       close(sA.distance_m, 4.379166666666667, 1e-12),
       close(sA.energy_wh, 0.1517189583333333, 1e-12)],
   [sA.regen_s === 0, `regen_s ${sA.regen_s}`]],
  'v 8.775 m/s = 31.59 km/h, P 1066.142 W, D 4.3791667 m, E 0.1517190 Wh');
/* row 110 (hill peak) 55000,700,118.0,0.800,61.77,45.00 -> v=700*0.5/60=5.8333.. m/s; P=61.77*118=7288.86 W
   segment to row 111: D=701*0.5/60*0.5=2.9208333333 m; E=7274.5925*0.5/3600=1.0103600694 Wh; peak I = 118 */
const B = rows[110], B2 = rows[111], sB = RC.summarize([B, B2], { circ_m: 0.5 });
group('row 110 (hill peak): tokens + v + P + segment + is the peak-current row',
  [[B.raw.join(',') === '55000,700,118.0,0.800,61.77,45.00', 'tokens changed'],
   ...[close(RC.speedFromErpm(B.erpm, 0.5) * 3.6, 21, 1e-12),
       close(B.voltage_v * B.current_a, 7288.86),
       close(sB.distance_m, 2.9208333333333334, 1e-12),
       close(sB.energy_wh, 1.0103600694444446, 1e-12)],
   [sB.peak_current_a === 118, `peak ${sB.peak_current_a}`]],
  'v 21.0 km/h, P 7288.86 W, D 2.9208333 m, E 1.0103601 Wh, peak I 118.0 A');
/* row 182 (regen) 91000,591,-27.1,-0.150,67.20,51.98 -> P=67.20*-27.1=-1821.12 W
   segment to row 183: E=-1743.84*0.5/3600=-0.2422 Wh exactly -> +0.2422 regen Wh, +0.5 s, D=2.3354167 m */
const C = rows[182], C2 = rows[183], sC = RC.summarize([C, C2], { circ_m: 0.5 });
group('row 182 (regen brake): tokens + negative P + regen Wh/s, nothing to consumed',
  [[C.raw.join(',') === '91000,591,-27.1,-0.150,67.20,51.98', 'tokens changed'],
   ...[close(C.voltage_v * C.current_a, -1821.12),
       close(sC.regen_wh, 0.2422, 1e-12),
       close(sC.distance_m, 2.3354166666666665, 1e-12)],
   [sC.regen_s === 0.5, `regen_s ${sC.regen_s}`], [sC.energy_wh === 0, `energy ${sC.energy_wh}`]],
  'P -1821.12 W, E- 0.2422 Wh, +0.5 s regen, consumed +0 Wh');

/* ---- 5. whole summary + independent recompute ---- */
group('summary (C = 0.5 m) matches hand-computed whole-file anchors',
  [close(s0.distance_m, 687.2875, 1e-4), close(s0.energy_wh, 46.83447, 1e-4),
   close(s0.regen_wh, 5.84943, 1e-4), close(s0.net_wh, 40.98504, 1e-4),
   close(s0.peak_current_a, 118, 1e-12), close(s0.peak_temp_c, 52.44, 1e-12),
   close(s0.regen_s, 23, 1e-12), close(s0.duration_s, 99.5, 1e-12),
   [s0.samples === 200, 'samples ' + s0.samples]],
  'D 687.2875 m, E+ 46.83447 Wh, E- 5.84943 Wh, net 40.98504 Wh, peak 118 A / 52.44 C, regen 23.0 s');
const ind = rows.reduce((a, r, i, arr) => {
  if (i === 0) return a;
  const p = arr[i - 1], dt = (r.t_ms - p.t_ms) / 1000;
  a.d += ((p.erpm + r.erpm) / 2) * 0.5 / 60 * dt;
  const e = ((p.voltage_v * p.current_a + r.voltage_v * r.current_a) / 2) * dt / 3600;
  if (e > 0) a.e += e; else a.re += -e;
  if (p.current_a < 0) a.rs += dt;
  return a;
}, { d: 0, e: 0, re: 0, rs: 0 });
group('independent recompute (separate code path) agrees with the parser summary',
  [close(ind.d, s0.distance_m), close(ind.e, s0.energy_wh),
   close(ind.re, s0.regen_wh), close(ind.rs, s0.regen_s)]);

/* ---- 6. malformed CSV: error, never NaN ---- */
const BAD = [
  ['empty input', ''], ['whitespace only', '   \n\n  \n'],
  ['header only', 't_ms,erpm,current_a,duty,voltage_v,temp_c\n'],
  ['one data row', 't_ms,erpm,current_a,duty,voltage_v,temp_c\n0,0,0,0,66.5,34\n'],
  ['header missing a column', 't_ms,erpm,current_a,duty\n0,0,0,0\n'],
  ['non-finite value', 't_ms,erpm,current_a,duty,voltage_v,temp_c\n0,5,abc,0.5,60,30\n'],
  ['overflow to Infinity', 't_ms,erpm,current_a,duty,voltage_v,temp_c\n0,1e999,5,0.5,60,30\n0,10,5,0.5,60,30\n'],
  ['blank token', 't_ms,erpm,current_a,duty,voltage_v,temp_c\n0,,5,0.5,60,30\n0,10,5,0.5,60,30\n'],
  ['t_ms goes backwards', 't_ms,erpm,current_a,duty,voltage_v,temp_c\n1000,5,5,0.5,60,30\n500,10,5,0.5,60,30\n'],
  ['duty logged in percent', 't_ms,erpm,current_a,duty,voltage_v,temp_c\n0,5,5,87.5,60,30\n500,10,5,62.0,60,30\n'],
  ['negative voltage', 't_ms,erpm,current_a,duty,voltage_v,temp_c\n0,5,5,0.5,-60,30\n500,10,5,0.5,60,30\n'],
  ['wrong field count', '0,5,5,0.5,60\n500,10,5,0.5,60,30\n']
];
const judged = BAD.map(([name, text]) => {
  const r = RC.parseCsv(text);
  const good = r.ok === false && typeof r.error === 'string' && r.error.length > 0 &&
    r.rows === null && !/NaN|Infinity/.test(JSON.stringify(r));
  return { name, good, error: r.error || '(no error!)' };
});
group('malformed CSV: 12/12 rejected with a named line+column, never NaN',
  judged.map((j) => [j.good, `${j.name}: ${j.error}`]),
  `e.g. "${judged[5].error}"`);
const badC = [RC.summarize(rows, { circ_m: NaN }), RC.summarize(rows, { circ_m: 0 })];
group('bad wheel circumference (NaN / 0): rejected with an error, never NaN',
  badC.map((r, i) => [r.ok === false && /positive number/.test(r.error) &&
    !/NaN/.test(JSON.stringify(r)), `${i === 0 ? 'NaN' : '0'}: ${r.error}`]),
  `"${badC[0].error}"`);

/* ---- verdict ---- */
console.log('---');
console.log(fail === 0 ? `ALL PASS (${pass}/${pass})` : `FAILURES ${fail} — PASS ${pass}, FAIL ${fail}`);
process.exit(fail === 0 ? 0 : 1);
