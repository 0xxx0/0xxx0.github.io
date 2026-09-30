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
 *   git                       (exact chronology + material convergence activity)
 *
 * Writes:
 *   control/convergence-strip.json   (data)
 *
 * Usage:
 *   node scripts/generate-convergence-strip.mjs
 *   node scripts/generate-convergence-strip.mjs --selftest
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const TELEMETRY_SUBJECT_PATTERNS=Object.freeze([
  /^comms: refresh machine-room page\b/i,
  /^nexus: board refresh\b/i
]);

export const isGeneratedTelemetrySubject=(subject)=>
  TELEMETRY_SUBJECT_PATTERNS.some((re)=>re.test(String(subject??'').trim()));

if(process.argv.includes('--selftest')){
  const cases=[
    ['comms heartbeat','comms: refresh machine-room page (2026-09-30T01:35Z)',true],
    ['nexus heartbeat','nexus: board refresh (2026-09-30T01:35Z)',true],
    ['real comms change','comms: enforce provenance classes',false],
    ['real nexus change','nexus: contract convergence alias',false],
    ['merge','Merge pull request #603 from 0xxx0/fix/readfield-loci-smoke-race-20260929',false],
    ['field delta','FIELD: restore packet aliases and inert RETURN on current master',false]
  ];
  for(const [name,subject,want] of cases){
    const got=isGeneratedTelemetrySubject(subject);
    if(got!==want)throw new Error(`CONVERGENCE_HISTORY_SELFTEST ${name}: got ${got}, want ${want}`);
  }
  console.log('CONVERGENCE material-history filter PASS · telemetry excluded, semantic commits retained');
  process.exit(0);
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const git = (cmd, d = '') => { try { return execSync(cmd, { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { return d; } };

const current = existsSync(join(ROOT, 'control/CURRENT.json')) ? read('control/CURRENT.json') : {};
const queue = existsSync(join(ROOT, 'control/QUEUE.json')) ? read('control/QUEUE.json') : {};
const boot = existsSync(join(ROOT, 'control/WORKER_BOOT.json')) ? read('control/WORKER_BOOT.json') : {};

const today = new Date().toISOString().slice(0, 10);
// WINDOW MUST BE NAMED. A bare "commits today" goes stale at midnight and
// silently becomes 0 while the page still says "today". Store the window
// it was measured over, and let the page print that window.
const commitWindow = today;

const subjectsInWindow=git(`git log --since="${commitWindow}T00:00:00" --format=%s`, '')
  .split('\n').map((s)=>s.trim()).filter(Boolean);
const gitCommitsInWindow=subjectsInWindow.length;
const telemetryCommitsInWindow=subjectsInWindow.filter(isGeneratedTelemetrySubject).length;
const materialSubjectsInWindow=subjectsInWindow.filter((s)=>!isGeneratedTelemetrySubject(s));
const commitsInWindow=materialSubjectsInWindow.length;

const commitsTotal = git('git rev-list --count HEAD', '0').trim();
const branchCount = git('git branch -r | grep -v HEAD | wc -l', '0').trim();
const recent = git('git log -50 --format=%s', '')
  .split('\n').map((s)=>s.trim()).filter(Boolean)
  .filter((s)=>!isGeneratedTelemetrySubject(s))
  .slice(0,3)
  .map((s)=>s.slice(0,78));

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
  activity_semantics: 'material_excluding_generated_telemetry',
  commits_window: commitWindow,
  // Compatibility field now means material convergence activity, not raw Git churn.
  commits_in_window: commitsInWindow,
  git_commits_in_window: gitCommitsInWindow,
  telemetry_commits_in_window: telemetryCommitsInWindow,
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
  `The field has **${data.commits_in_window} material commits on ${data.commits_window}** across **${data.branch_count} branches** (${data.git_commits_in_window} exact Git commits in the window; ${data.telemetry_commits_in_window} generated telemetry; ${data.commits_total} on master all-time).`,
  `**${data.live_fronts}** fronts are live, against **${data.current_heads}** current heads.`,
  `There are **${gaps.length}** open gaps.`,
  ``,
  `## Active fronts`,
  ``,
  ...fronts.map((f) => `- **${f.id}** (${f.state}) — ${f.center}`),
  ``,
  `## Last material commits`,
  ``,
  ...recent.map((s) => `- ${s}`),
  ``,
  `## Open gaps`,
  ``,
  ...gaps.map((g) => `- ${g.id} — ${g.status}`),
  ``,
  `## Law`,
  ``,
  `ATTENTION ≠ RECENCY. TELEMETRY ≠ MATERIAL MUTATION.`,
  `RECOVER BEFORE INVENTING.`,
  ``,
  `Transfer of power: /control/confluence/TRANSFER_OF_POWER_2026-09-22.md`,
  ``
].join('\n');
writeFileSync(join(ROOT, 'control/convergence-plain.md'), plainMd);
console.log('wrote control/convergence-plain.md');

console.log('root convergence injection retired; FIELD INDEX hydrates CURRENT + exact master chronology at runtime.');
