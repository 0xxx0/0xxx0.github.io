#!/usr/bin/env node
/**
 * build-git-history.mjs — THE RECORD OF TOUCHES
 *
 * The registry (showcase-manifest.json) knows what is REGISTERED. It has no
 * past: index.updated_at is a hand-set field covering four days. Git knows
 * what actually HAPPENED — every commit since 2019.
 *
 * This emits that history as data the page can read.
 *
 * Output: control/git-history.json
 */
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const sh = (c) => { try { return execSync(c, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 }).trim(); } catch { return ''; } };

// hour must be LOCAL (+08 for this human) so the rhythm is theirs, not UTC's
const TZ = 8;
const raw = sh('git log --format=%h%x1f%at%x1f%an%x1f%s%x1e');
const commits = raw.split('\x1e').filter(Boolean).map((rec) => {
  const [hash, at, an, subject] = rec.replace(/^\n/, '').split('\x1f');
  const t = Number(at) * 1000 + TZ * 3600 * 1000;
  const d = new Date(t);
  return {
    h: hash.slice(0, 7),
    d: d.toISOString().slice(0, 10),
    hr: d.getUTCHours(),
    mi: d.getUTCMinutes(),
    a: an || '',
    s: (subject || '').slice(0, 92),
  };
});

const byDay = new Map();
for (const c of commits) {
  if (!byDay.has(c.d)) byDay.set(c.d, []);
  byDay.get(c.d).push(c);
}
const days = [...byDay.entries()]
  .map(([d, cs]) => {
    cs.sort((a, b) => a.hr * 60 + a.mi - (b.hr * 60 + b.mi));
    const au = [...new Set(cs.map((c) => c.a))];
    return { d, n: cs.length, au, c: cs.map((c) => [c.h, c.hr, c.mi, c.s]) };
  })
  .sort((a, b) => a.d.localeCompare(b.d));

const out = {
  schema: 'field-git-history/v0.1',
  generated: new Date().toISOString(),
  generator: 'scripts/build-git-history.mjs',
  total: commits.length,
  days_active: days.length,
  span: [days[0].d, days[days.length - 1].d],
  authors: [...new Set(commits.map((c) => c.a))],
  days,
};
writeFileSync(join(ROOT, 'control/git-history.json'), JSON.stringify(out));
const kb = (JSON.stringify(out).length / 1024).toFixed(0);
console.log(`wrote control/git-history.json (${kb} KB)`);
console.log(`  ${out.total} commits · ${out.days_active} active days · ${out.span[0]} -> ${out.span[1]}`);
console.log(`  authors: ${out.authors.join(', ')}`);
for (const d of out.days) console.log(`    ${d.d}  ${String(d.n).padStart(4)}  [${d.au.join(',')}]`);