#!/usr/bin/env node
/**
 * generate-convergence-strip.mjs
 *
 * Regenerates convergence data + the plain reading projection.
 * FIELD INDEX root state is hydrated at runtime from CURRENT + exact GitHub
 * master chronology; this generator never edits index.html.
 *
 * Reads:
 *   control/CURRENT.json      (active fronts, heads, updated)
 *   control/WORKER_BOOT.json  (gaps, execution)
 *   control/QUEUE.json        (live count, max_live)
 *   git                       (commits today, branch count, recent subjects)
 *
 * Writes:
 *   control/convergence-strip.json   (data)
 *
 * Usage: node scripts/generate-convergence-strip.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const raw = (p, d = '') => (existsSync(join(ROOT, p)) ? readFileSync(join(ROOT, p), 'utf8') : d);
const git = (cmd, d = '') => { try { return execSync(cmd, { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { return d; } };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const current = existsSync(join(ROOT, 'control/CURRENT.json')) ? read('control/CURRENT.json') : {};
const queue = existsSync(join(ROOT, 'control/QUEUE.json')) ? read('control/QUEUE.json') : {};
const boot = existsSync(join(ROOT, 'control/WORKER_BOOT.json')) ? read('control/WORKER_BOOT.json') : {};

const today = new Date().toISOString().slice(0, 10);
// WINDOW MUST BE NAMED. A bare "commits today" goes stale at midnight and
// silently becomes 0 while the page still says "today". Store the window
// it was measured over, and let the page print that window.
const commitWindow = today;
const commitsInWindow = git(`git log --since="${commitWindow}T00:00:00" --oneline | wc -l`, '0').trim();
const commitsTotal = git('git rev-list --count HEAD', '0').trim();
const branchCount = git('git branch -r | grep -v HEAD | wc -l', '0').trim();
const recent = git('git log --oneline -3 --format=%s', '')
  .split('\n').filter(Boolean).map((s) => s.slice(0, 78));

const fronts = (current.active_fronts || []).map((f) => ({
  id: f.id, state: f.state, center: f.center
}));
const heads = (current.current_heads || []).length;
const liveCount = (queue.live || []).length;
const maxLive = queue.max_live || 3;
const gaps = (boot.open_gaps || []).map((g) => ({ id: g.id, status: g.status }));

const data = {
  schema: '0xxx0/convergence-strip/v0.1',
  generated: new Date().toISOString(),
  generator: 'scripts/generate-convergence-strip.mjs',
  commits_window: commitWindow,
  commits_in_window: Number(commitsInWindow) || 0,
  commits_total: Number(commitsTotal) || 0,
  branch_count: Number(branchCount) || 0,
  recent_commits: recent,
  active_fronts: fronts,
  live_fronts: `${liveCount}/${maxLive}`,
  current_heads: heads,
  open_gaps: gaps,
  current_updated: current.updated || '?'
};
writeFileSync(join(ROOT, 'control/convergence-strip.json'), JSON.stringify(data, null, 2) + '\n');
console.log('wrote control/convergence-strip.json');

// ---- plain reading projection (READFIELD reads convergence data) ----
const plainMd = [
  `# CONVERGENCE — plain reading`,
  ``,
  `_Generated ${data.generated} by scripts/generate-convergence-strip.mjs_`,
  ``,
  `The field has **${data.commits_in_window} commits on ${data.commits_window}** across **${data.branch_count} branches** (${data.commits_total} on master all-time).`,
  `**${data.live_fronts}** fronts are live, against **${data.current_heads}** current heads.`,
  `There are **${gaps.length}** open gaps.`,
  ``,
  `## Active fronts`,
  ``,
  ...fronts.map((f) => `- **${f.id}** (${f.state}) — ${f.center}`),
  ``,
  `## Last commits`,
  ``,
  ...recent.map((s) => `- ${s}`),
  ``,
  `## Open gaps`,
  ``,
  ...gaps.map((g) => `- ${g.id} — ${g.status}`),
  ``,
  `## Law`,
  ``,
  `RECOVER BEFORE INVENTING.`,
  ``,
  `Transfer of power: /control/confluence/TRANSFER_OF_POWER_2026-09-22.md`,
  ``
].join('\n');
writeFileSync(join(ROOT, 'control/convergence-plain.md'), plainMd);
console.log('wrote control/convergence-plain.md');

console.log('root convergence injection retired; FIELD INDEX hydrates CURRENT + exact master chronology at runtime.');
