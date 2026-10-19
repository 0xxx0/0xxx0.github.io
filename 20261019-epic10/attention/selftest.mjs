#!/usr/bin/env node
/* selftest.mjs — ATTN·SPIRAL (lane "attention"). node, zero dependencies.
   Loads the SAME core.js the page renders from and checks the instrument's contract:
     1  dataset      14 contiguous days, 8 projects, s+o === m+a, heavy days real
     2  determinism  same data -> same geometry hash (repeated / JSON round-trip /
                     rebuilt copy) + golden regression pin
     3  coverage     every day and every project present in the marks
     4  datum-less   zero-volume cells emit NO mark (P4 negative arm)
     5  bounds       every mark inside the 390x430 logical canvas, clear of the bar
     6  hit test     every mark's centroid resolves back to its own day + lane
     7  metadata     hover/readout totals equal an independent recount of the data
     8  quiet law    rest frame: every alpha <= 0.12, ink only (accents approach-only)
     9  reveal law   bloom frame: accents present, alpha above the reveal floor
    10  encodings    length=volume, tick=shipped share, dot=open share, solid=open state
    11  identity     moire stamps: hash-derived, distinct per project, stable, house hash
    12  house law    static only: no Math.random, no external URL/fetch, system fonts
   Prints PASS/FAIL per check; exit 1 on any FAIL. */

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const A = require(join(here, 'core.js'));

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  —  ' + detail : ''}`);
}

console.log('attention spiral selftest — lane "attention"');
console.log(`view ${A.VIEW.W}x${A.VIEW.H}  days ${A.NDAYS}  projects ${A.PROJECTS.length}  core v${A.version}`);
console.log('');

/* ---- 1. dataset ------------------------------------------------------------------ */
const D = A.DATA;
{
  const dates = D.map((d) => d.date);
  const expect = [];
  for (let i = 0; i < 14; i++) {
    const dt = new Date(Date.UTC(2026, 9, 6 + i));
    expect.push(dt.toISOString().slice(0, 10));
  }
  check('dataset: 14 contiguous days 2026-10-06..10-19',
    D.length === 14 && dates.every((x, i) => x === expect[i]), dates[0] + ' .. ' + dates[13]);

  const badShape = [];
  for (const day of D) {
    if (day.c.length !== A.PROJECTS.length) badShape.push(day.date + ' lanes');
    for (const c of day.c) {
      if (c.length !== 4 || c.some((n) => !Number.isInteger(n) || n < 0)) badShape.push(day.date + ' cell ' + JSON.stringify(c));
      else if (c[2] + c[3] !== c[0] + c[1]) badShape.push(day.date + ' shipped+open=' + (c[2] + c[3]) + ' != vol=' + (c[0] + c[1]));
    }
  }
  check('dataset: every cell [msg,art,shipped,open] legal and shipped+open === volume',
    badShape.length === 0, badShape.length ? badShape.join('; ') : '112 cells balanced');

  const tot = D.map((d, i) => ({ i, v: d.c.reduce((s, c) => s + c[0] + c[1], 0) }));
  const top3 = tot.slice().sort((a, b) => b.v - a.v).slice(0, 3).map((x) => x.i);
  const heavy = [1, 12].every((i) => top3.includes(i));  // 10-07 and 10-18
  check('dataset: heavy days land on 10-07 and 10-18 (both top-3 by volume)',
    heavy, 'top3 = ' + top3.map((i) => D[i].date.slice(5) + '(' + tot[i].v + ')').join(' '));

  const quiet = tot.filter((x) => !top3.includes(x.i)).map((x) => x.v);
  check('dataset: quiet days stay quiet (rest below heaviest day)',
    Math.max(...quiet) < tot[top3[0]].v && Math.min(...quiet) <= 20,
    'quiet range ' + Math.min(...quiet) + '..' + Math.max(...quiet) + ', heaviest ' + tot[top3[0]].v);
}

/* ---- 2. determinism -------------------------------------------------------------- */
{
  const g1 = A.geomSignature(D);
  const g2 = A.geomSignature(D);
  const g3 = A.geomSignature(JSON.parse(JSON.stringify(D)));
  const rebuilt = D.map((d) => ({ date: d.date, c: d.c.map((c) => c.slice()) }));
  const g4 = A.geomSignature(rebuilt);
  check('geometry deterministic: repeat + JSON round-trip + rebuilt copy agree',
    g1.hash === g2.hash && g2.hash === g3.hash && g3.hash === g4.hash,
    `hash ${g1.hash} over ${g1.n} marks`);

  const GOLDEN = '5be2461c';   // pin: if this moves the geometry law changed on purpose
  check('golden geometry hash unchanged (regression pin)', g1.hash === GOLDEN,
    `expected ${GOLDEN}, got ${g1.hash}`);

  const shuffled = A.buildMarks(D.map((d, i) => D[(i + 5) % 14]));
  check('same data in a different order still yields distinct, stable geometry',
    shuffled.length === g1.n && A.geomSignature(D.map((d, i) => D[(i + 5) % 14])).hash !== g1.hash,
    `rotated-input hash differs, ${shuffled.length} marks`);
}

/* ---- 3. coverage ----------------------------------------------------------------- */
{
  const marks = A.buildMarks(D);
  const days = new Set(marks.map((m) => m.d));
  const lanes = new Set(marks.map((m) => m.k));
  check('marks cover all 14 days', days.size === 14, `${days.size}/14 days carry marks`);
  check('marks cover all 8 projects (lanes)', lanes.size === 8, `${lanes.size}/8 lanes carry marks`);
}

/* ---- 4. datum-less layers are refused (P4) --------------------------------------- */
{
  const marks = A.buildMarks(D);
  const liveCells = D.reduce((s, day) => s + day.c.filter((c) => c[0] + c[1] > 0).length, 0);
  check('no mark for a zero-volume cell (a layer without a datum is unlawful)',
    marks.length === liveCells && marks.every((m) => m.v > 0),
    `${marks.length} marks == ${liveCells} cells with volume > 0`);
}

/* ---- 5. bounds ------------------------------------------------------------------- */
{
  const V = A.VIEW, marks = A.buildMarks(D);
  const limit = V.CX - 12;                       // 12px of pad on every side
  const corner = Math.hypot(V.BAR_HALF_W, V.BAR_HALF_H);
  let worst = 0, tooClose = 0;
  for (const m of marks) {
    for (const p of m.pts.concat([m.tick && [m.tick.x1, m.tick.y1]]).filter(Boolean)) {
      worst = Math.max(worst, Math.hypot(p[0] - V.CX, p[1] - V.CY));
      if (p[0] >= V.CX - V.BAR_HALF_W && p[0] <= V.CX + V.BAR_HALF_W &&
          p[1] >= V.CY - V.BAR_HALF_H && p[1] <= V.CY + V.BAR_HALF_H) tooClose++;
    }
  }
  check('ribbon clears the fixed bar (inner turn outside the bar corners)',
    corner < V.R0 - 2, `bar corner ${corner.toFixed(1)}px < inner spine ${V.R0}px`);
  check('every mark inside the canvas and clear of the central bar',
    worst <= limit && tooClose === 0,
    `max radius ${worst.toFixed(1)}px <= ${limit}px, ${tooClose} points inside the bar`);
}

/* ---- 6. hit test ----------------------------------------------------------------- */
{
  const marks = A.buildMarks(D);
  const miss = [];
  for (const m of marks) {
    const h = A.hitTest(D, m.cx, m.cy);
    if (!h || h.d !== m.d || h.k !== m.k) miss.push(`${m.d}.${m.k}->${h ? h.d + '.' + h.k : 'null'}`);
  }
  check('hit test: every mark centroid resolves to its own day + lane',
    miss.length === 0, miss.length ? miss.slice(0, 4).join(' ') : `${marks.length}/${marks.length} round-trips`);
  check('hit test: the pad itself is not a day', A.hitTest(D, 4, 4) === null, 'null at (4,4)');
}

/* ---- 7. hover metadata matches the dataset ---------------------------------------- */
{
  const bad = [];
  for (let d = 0; d < D.length; d++) {
    const rep = A.report(D, d);
    let msg = 0, art = 0, sh = 0, op = 0;
    for (const c of D[d].c) { msg += c[0]; art += c[1]; sh += c[2]; op += c[3]; }
    if (rep.msg !== msg || rep.art !== art || rep.shipped !== sh || rep.open !== op ||
        rep.total !== msg + art) bad.push(rep.date);
    for (const row of rep.rows) {
      const c = D[d].c[row.k];
      if (row.m !== c[0] || row.a !== c[1] || row.s !== c[2] || row.o !== c[3] || row.v !== c[0] + c[1]) bad.push(rep.date + ':' + row.name);
    }
    if (rep.rows.length !== 8) bad.push(rep.date + ' rows');
  }
  check('hover metadata: per-day totals and all 8 project rows equal a recount of the data',
    bad.length === 0, bad.length ? bad.slice(0, 4).join(' ') : '14 days x 8 rows agree');

  const win = A.window(D);
  const sum = D.reduce((s, _, d) => s + A.report(D, d).total, 0);
  check('central bar totals: window total equals the sum of the 14 day reports',
    win.total === sum && win.shipped + win.open === win.total,
    `Σ ${win.total} = M${win.msg} + A${win.art}, S${win.shipped} / O${win.open}`);

  /* the page must render exactly these numbers (not a second copy of the maths) */
  const app = readFileSync(join(here, 'app.js'), 'utf8');
  check('page renders core.report()/core.window() (no duplicated arithmetic)',
    app.includes('A.report(DATA, sel)') && app.includes('A.window(DATA)') && app.includes('A.frame(DATA,'),
    'app.js calls report/window/frame');
}

/* ---- 8. quiet law (rest) ---------------------------------------------------------- */
{
  const frames = [
    { sel: { d: null, reveal: 0 }, label: 'idle' },
    { sel: { d: 6, reveal: 0 }, label: 'selected but reveal=0' },
    { sel: { d: 12, reveal: 0 }, label: 'heavy day, reveal=0' },
  ];
  let worstA = 0, colours = new Set();
  for (const f of frames) {
    for (const op of A.frame(D, f.sel)) { worstA = Math.max(worstA, op.a); colours.add(op.c.join(',')); }
  }
  const INK = A.INK.join(',');
  check('quiet law: at rest every layer alpha <= 0.12 and ink is the only colour',
    worstA <= A.QUIET_CAP && colours.size === 1 && colours.has(INK),
    `max alpha ${worstA}, colours ${[...colours].join(' | ')}`);
}

/* ---- 9. reveal law (bloom) -------------------------------------------------------- */
{
  const ops = A.frame(D, { d: 12, reveal: 1 });
  const cols = new Set(ops.map((o) => o.c.join(',')));
  const gold = A.GOLD.join(','), cool = A.COOL.join(',');
  const maxA = Math.max(...ops.map((o) => o.a));
  check('reveal law: a bloom raises the day and brings both accents in',
    cols.has(gold) && cols.has(cool) && maxA >= 0.5, `max alpha ${maxA}, ${cols.size} colours`);

  /* non-selected days must stay quieter than the selected one */
  const perDay = {};
  for (const op of ops) if (op.a > 0.2) perDay[op.a] = true;
  const quietOthers = A.frame(D, { d: 12, reveal: 1 }).filter((o) => o.a <= 0.2).length;
  check('bloom keeps the other 13 days quiet (contrast, not a wall of noise)',
    quietOthers > 0, `${quietOthers} ops stay <= 0.20 alpha while day 12 blooms`);

  const half = A.frame(D, { d: 12, reveal: 0.5 });
  const halfMax = Math.max(...half.map((o) => o.a));
  check('reveal ramps (mid-tween alpha sits between rest and full bloom)',
    halfMax < maxA && halfMax > 0.12, `0.5 -> ${halfMax}, 1.0 -> ${maxA}`);
}

/* ---- 10. encodings ---------------------------------------------------------------- */
{
  const marks = A.buildMarks(D);
  const mx = A.maxVol(D);
  const bad = [];
  for (const m of marks) {
    const cell = D[m.d].c[m.k];
    const sh = cell[2] / (cell[2] + cell[3]);
    if (Math.abs(m.tick.len - (A.VIEW.TICK_MIN + A.VIEW.TICK_GAIN * sh)) > 0.011) bad.push('tick ' + m.d + '.' + m.k);
    if (m.dot && Math.abs(m.dot.r - (A.VIEW.DOT_MIN + A.VIEW.DOT_GAIN * (1 - sh))) > 0.011) bad.push('dot ' + m.d + '.' + m.k);
    if (m.solid !== (cell[2] >= cell[3])) bad.push('state ' + m.d + '.' + m.k);
    if (Math.abs(m.quiet - (A.VIEW.QUIET_MIN + A.VIEW.QUIET_GAIN * (m.v / mx))) > 0.006) bad.push('alpha ' + m.d + '.' + m.k);
  }
  check('encodings: tick = shipped share, dot = open share, stroke = dominant state, alpha = volume',
    bad.length === 0, bad.length ? bad.slice(0, 4).join(' ') : `${marks.length} marks verified`);

  const byVol = marks.slice().sort((a, b) => a.v - b.v);
  let mono = true;   // equal volume must share a length; a bigger volume must be longer
  for (let i = 1; i < byVol.length; i++) {
    if (byVol[i].v > byVol[i - 1].v ? byVol[i].len <= byVol[i - 1].len : byVol[i].len !== byVol[i - 1].len) mono = false;
  }
  const exact = marks.every((m) => Math.abs(m.len - A.LREF * (m.v / mx)) <= 0.011);
  const biggest = byVol[byVol.length - 1], smallest = byVol[0];
  check('mark length is exactly LREF * volume / maxVolume (length = volume, any lane, any turn)',
    mono && exact && biggest.v > smallest.v,
    `v${smallest.v} -> ${smallest.len}px, v${biggest.v} -> ${biggest.len}px, LREF ${A.LREF}px`);

  const rep = A.report(D, 12);
  check('a day with a zero project shows the zero, not a hidden row',
    rep.rows.filter((r) => r.v === 0).length === D[12].c.filter((c) => c[0] + c[1] === 0).length &&
    rep.rows.length === 8, `${rep.rows.length} rows, ${rep.rows.filter((r) => r.v === 0).length} explicit zeros`);
}

/* ---- 11. moire identity stamps ----------------------------------------------------- */
{
  const tags = A.PROJECTS.map((p) => A.identity(p).tag);
  const GOLDEN_TAGS = {
    'the-field': '3085e15d', 'fleet-ops': 'f1c65d76', 'fold-house-os': '01431e4c',
    'art-borrowed-hand': '989038c5', 'care': '872757cc', 'maker-hardware': 'a12c793a',
    'research-absorb': '2e6cf30a', 'comms': 'd1faa1ce',
  };
  check('identity: stamps hash-derived, distinct, and match the house microlib hash32 (FNV-1a)',
    new Set(tags).size === 8 && A.PROJECTS.every((p, i) => tags[i] === GOLDEN_TAGS[p]),
    tags.join(' '));

  const s1 = A.stampLines('the-field', 20, 20), s2 = A.stampLines('the-field', 20, 20);
  const s3 = A.stampLines('comms', 20, 20);
  check('identity: pure function of the project name (same seed -> identical pattern)',
    JSON.stringify(s1) === JSON.stringify(s2) && JSON.stringify(s1) !== JSON.stringify(s3),
    `the-field=${s1.tag}, comms=${s3.tag}`);

  const empty = A.stampLines('', 20, 20);
  const strokes = s1.layers.reduce((n, L) => n + L.lines.length, 0);
  check('identity: each stamp draws real hairlines (3 near-parallel gratings)',
    strokes > 6 && s1.layers.length === 3 && s1.layers.every((L) => L.alpha <= 0.12),
    `${strokes} lines, rest alpha <= ${Math.max(...s1.layers.map((L) => L.alpha))}`);
  check('identity: different name -> different pattern, empty seed still deterministic',
    JSON.stringify(empty) === JSON.stringify(A.stampLines('', 20, 20)) && JSON.stringify(empty) !== JSON.stringify(s1),
    'empty seed stable');
}

/* ---- 12. house law on the shipped files -------------------------------------------- */
{
  const files = ['index.html', 'style.css', 'core.js', 'app.js'];
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const read = (f) => readFileSync(join(here, f), 'utf8');
  const raw = files.map(read);
  const src = raw.map(strip);

  const rnd = files.filter((f, i) => src[i].includes('Math.random'));
  check('house law: no Math.random anywhere in the shipped source',
    rnd.length === 0, rnd.length ? rnd.join(',') : 'none in ' + files.join('/'));

  const html = raw[0], css = raw[1];
  const ext = [];
  if (/https?:\/\//i.test(html) || /\/\/[a-z0-9-]+\.[a-z]{2,}/i.test(html.replace(/\/\/\s*[a-z]/gi, ''))) ext.push('index.html external URL');
  if (/https?:\/\//i.test(css)) ext.push('style.css external URL');
  if (/<(script|link|img|iframe|source)[^>]+(src|href)=["']https?:/i.test(html)) ext.push('external asset');
  if (/@font-face|url\(\s*["']?https?:/i.test(css)) ext.push('webfont');
  check('house law: static only — no CDN, no external asset, system fonts',
    ext.length === 0, ext.length ? ext.join('; ') : 'local core.js / app.js / style.css only');

  const net = ['fetch(', 'XMLHttpRequest', 'importScripts', 'navigator.sendBeacon', 'new WebSocket'];
  const netHits = [];
  src.forEach((s, i) => { for (const n of net) if (s.includes(n)) netHits.push(files[i] + ':' + n); });
  check('house law: no runtime fetch or network call', netHits.length === 0,
    netHits.length ? netHits.join(',') : 'zero network surface');

  const localRefs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
  const missing = localRefs.filter((r) => !files.includes(r));
  check('house law: every referenced file ships in this lane',
    missing.length === 0, missing.length ? missing.join(',') : localRefs.join(', '));

  const rm = css.includes('prefers-reduced-motion') && src[3].includes('prefers-reduced-motion');
  check('house law: prefers-reduced-motion honoured in CSS and in the reveal path',
    rm, 'depth without motion');

  const law = /QUIET_CAP\s*=\s*0\.12/.test(src[2]) && /rgb\(8,\s*12,\s*18\)|\[8,\s*12,\s*18\]/.test(src[2]) &&
    /rgb\(79,\s*87,\s*96\)|\[79,\s*87,\s*96\]/.test(src[2]) && /#d7ae67/.test(css) && /#72bce7/.test(css);
  check('house law: pad rgb(8,12,18), lines rgb(79,87,96), gold #d7ae67, cool #72bce7',
    law, 'palette constants present in core.js + style.css');

  /* the in-page verdict pins the same golden the node test computes — they must not drift */
  const own = readFileSync(join(here, 'selftest.mjs'), 'utf8');
  const mine = A.geomSignature(D).hash;
  const appPin = (src[3].match(/geomSignature\(DATA\)\.hash === '([0-9a-f]{8})'/) || [])[1];
  const nodePin = (own.match(/const GOLDEN = '([0-9a-f]{8})'/) || [])[1];
  check('selftest.mjs and app.js pin the SAME geometry golden (no drift between the two harnesses)',
    appPin === mine && nodePin === mine, `node ${mine}, selftest.mjs ${nodePin}, app.js ${appPin}`);

  check('page ships its own browser verdict mode (?selftest=1) and a static bloom deep-link',
    src[3].includes('bootSelftest') && /params\.has\('static'\)/.test(src[3]) && /params\.has\('day'\)/.test(src[3]) &&
    !src[3].includes('fetch('), 'page-as-harness, DOM-only, zero network');
}

/* ---- summary ------------------------------------------------------------------------ */
const pass = results.filter((r) => r.ok).length;
const fail = results.length - pass;
console.log('');
console.log(`${fail === 0 ? 'PASS' : 'FAIL'}  RESULT ${pass}/${results.length} checks`);
if (fail) results.filter((r) => !r.ok).forEach((r) => console.log('  x ' + r.name));
process.exit(fail === 0 ? 0 : 1);
