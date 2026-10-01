#!/usr/bin/env node
/**
 * check-stale-date.mjs — the stale-date flag on FIELD INDEX must be (a) one rule,
 * (b) applied to every projection that prints a date, (c) actually reaching the HTML.
 *
 * Why this exists: the CURRENT stamp was fixed to admit its own age, but the per-route
 * index stamp rendered the same date format with no age signal at all — a route could read
 * "09-30 18:50" while being days old, and nothing said so. A projection that prints a
 * timestamp without its age is a state line that reads as "now" while being history.
 *
 * Run: node scripts/check-stale-date.mjs        (exit 0 = holds, 1 = broken)
 */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HTML = join(ROOT, 'index.html');
const html = readFileSync(HTML, 'utf8');
const STALE_H = 36;        // CURRENT clock: 2× the daily refresh cadence
const STALE_ROUTE_H = 168; // ROUTE clock: the shipped shopping ladder (stale >7d)

let pass = 0, fail = 0;
const ok = (c, m) => { c ? (pass++, console.log('  ok   ' + m)) : (fail++, console.log('  FAIL ' + m)); };
const iso = (h) => new Date(Date.now() - h * 3600e3).toISOString();

// ---- 1. syntax: every inline script still parses
const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
ok(scripts.length > 0, `${scripts.length} inline script block(s) found`);
const dir = mkdtempSync(join(tmpdir(), 'stale-date-'));
let syntaxOk = true;
scripts.forEach((s, i) => {
  const f = join(dir, `s${i}.js`);
  writeFileSync(f, s);
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); }
  catch (e) { syntaxOk = false; console.log('  FAIL syntax in block ' + i + ': ' + String(e.stderr).slice(0, 300)); }
});
ok(syntaxOk, 'all inline script blocks parse under node --check');

// ---- 2. one rule: no inline duplicate of the threshold comparison
ok(!/ageH\s*>\s*36/.test(html), 'no inline "ageH > 36" comparison left behind (single source of truth)');
ok(new RegExp(`STALE_H\\s*=\\s*${STALE_H}`).test(html), `threshold defined once as STALE_H = ${STALE_H}`);
ok(/\.staleDate\{color:var\(--hot\)/.test(html), '.staleDate maps to the host attention colour (--hot); no new palette');

// ---- 3. every date projection carries the flag
ok(/class="sub'\+\(isRouteStale\(r\?\.index\?\.updated_at\)/.test(html),
  'per-route index stamp carries the flag (the projection that previously had none)');
ok(new RegExp(`STALE_ROUTE_H\\s*=\\s*${STALE_ROUTE_H}`).test(html),
  `route clock declared once as STALE_ROUTE_H = ${STALE_ROUTE_H} (the shipped ladder, not a new threshold)`);
const flagSites = [...html.matchAll(/isRouteStale\(|isStale\(/g)].length;
ok(flagSites >= 5, `staleness checked at ${flagSites} sites (2 definitions + 3 projections)`);
// The 36h CURRENT rule must NOT be applied to route stamps: measured 2026-10-01, that flags
// 149/159 routes (94%) and the flag stops meaning anything.
ok(!/isStale\(r\?\.index\?\.updated_at\)/.test(html), 'route stamp does not use the 36h CURRENT clock');

// ---- 4. behaviour through the REAL render path (file's own source, stubbed deps)
const grabFn = (name) => {
  const start = html.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('missing ' + name);
  let depth = 0;
  for (let j = html.indexOf('{', start); j < html.length; j++) {
    if (html[j] === '{') depth++;
    else if (html[j] === '}' && --depth === 0) return html.slice(start, j + 1);
  }
  throw new Error('unbalanced ' + name);
};
const src = [grabFn('tsMs'), grabFn('ageHours'), grabFn('isStale'), grabFn('isRouteStale'), grabFn('shortTs'), grabFn('tokenHTML')].join('\n');
const renderRoute = (updatedAt) => {
  const deps = {
    esc: (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'),
    routeMap: () => new Map([['/shopping/', { href: '/shopping/', title: 'SHOPPING FIELD', index: { updated_at: updatedAt } }]]),
    routeGlyph: () => '<svg/>', supportFor: () => 1, selectedValue: () => '/shopping/', STALE_H, STALE_ROUTE_H,
  };
  const names = Object.keys(deps);
  return new Function(...names, src + '\nreturn tokenHTML;')(...names.map((n) => deps[n]))({ key: 'route' }, '/shopping/', 1);
};
ok(renderRoute(iso(8 * 24)).includes('class="sub staleDate"'), 'stale route stamp (8d) renders flagged');
ok(!renderRoute(iso(0.4)).includes('staleDate'), 'fresh route stamp (0.4h) renders unflagged');
ok(/class="sub">/.test(renderRoute(iso(0.4))), 'fresh route stamp keeps its original class exactly (no drift)');
ok(!renderRoute(iso(6 * 24)).includes('staleDate'), 'route boundary below 7d -> unflagged (6d)');
ok(renderRoute(iso(8 * 24)).includes('staleDate'), 'route boundary above 7d -> flagged (8d)');
// the 36h CURRENT clock is separate and unchanged
const isStaleFn = new Function('tsMs', 'ageHours', 'STALE_H', grabFn('tsMs') + '\n' + grabFn('ageHours') + '\n' + grabFn('isStale') + '\nreturn isStale;')((t) => { const n = Date.parse(t); return Number.isFinite(n) ? n : 0; }, (t) => { const a = Date.parse(t); return a > 0 ? (Date.now() - a) / 36e5 : null; }, STALE_H);
ok(!isStaleFn(iso(35)), 'CURRENT boundary below 36h -> unflagged');
ok(isStaleFn(iso(37)), 'CURRENT boundary above 36h -> flagged');
ok(isStaleFn(iso(100)) && !renderRoute(iso(100)).includes('staleDate'), '4d old: CURRENT clock says stale, route clock does not (two clocks, on purpose)');

console.log(`\n${pass} ok, ${fail} fail`);
process.exit(fail ? 1 : 0);