#!/usr/bin/env node
/**
 * generate-convergence-strip.mjs
 *
 * Regenerates two NON-AUTHORITATIVE convergence projections.
 * FIELD live convergence is composed on read from QUEUE + federation-atlas;
 * CURRENT separately owns NOW. This generator never edits index.html and its
 * outputs never own NOW, NEXT, or current truth.
 *
 * Reads:
 *   control/CURRENT.json      (captured active fronts, heads, updated)
 *   control/QUEUE.json        (captured live count, max_live)
 *   git                       (captured exact chronology + material activity)
 *
 * Deliberately does NOT read control/WORKER_BOOT.json: llms.txt marks it
 * superseded compatibility history and forbids using it for current gaps/gates.
 *
 * Writes:
 *   control/convergence-strip.json   (captured data projection; authority NONE)
 *   control/convergence-plain.md     (captured human reading; authority NONE)
 *
 * Live convergence authority:
 *   /#convRead  (QUEUE + federation-atlas, reading only)
 *
 * Usage:
 *   node scripts/generate-convergence-strip.mjs
 *   node scripts/generate-convergence-strip.mjs --selftest
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SNAPSHOT_ROLE = 'DERIVED_SNAPSHOT';
const SNAPSHOT_AUTHORITY = 'NONE';
const LIVE_FIELD_DERIVATION = '/#convRead';
const LIVE_FIELD_SOURCE = 'FIELD_INDEX_RUNTIME_QUEUE_PLUS_FEDERATION_ATLAS';

const TELEMETRY_SUBJECT_PATTERNS=Object.freeze([
  /^comms: refresh machine-room page\b/i,
  /^nexus: board refresh\b/i,
  /^convergence: strip refresh\b/i
]);

export const isGeneratedTelemetrySubject=(subject)=>
  TELEMETRY_SUBJECT_PATTERNS.some((re)=>re.test(String(subject??'').trim()));

if(process.argv.includes('--selftest')){
  const cases=[
    ['comms heartbeat','comms: refresh machine-room page (2026-09-30T01:35Z)',true],
    ['nexus heartbeat','nexus: board refresh (2026-09-30T01:35Z)',true],
    ['real comms change','comms: enforce provenance classes',false],
    ['real nexus change','nexus: contract convergence alias',false],
    ['strip refresh heartbeat','convergence: strip refresh (2026-10-01T08:36Z)',true],
    ['real convergence change','convergence: separate material activity from telemetry churn',false],
    ['merge','Merge pull request #603 from 0xxx0/fix/readfield-loci-smoke-race-20260929',false],
    ['field delta','FIELD: restore packet aliases and inert RETURN on current master',false]
  ];
  for(const [name,subject,want] of cases){
    const got=isGeneratedTelemetrySubject(subject);
    if(got!==want)throw new Error(`CONVERGENCE_HISTORY_SELFTEST ${name}: got ${got}, want ${want}`);
  }

  const grep = (()=>{
    try {
      return execSync(
        `git grep -n -E 'convergence-(strip\\.json|plain\\.md)' -- . ':!control/convergence-strip.json' ':!control/convergence-plain.md'`,
        {cwd:ROOT,encoding:'utf8',maxBuffer:1<<22}
      ).trim();
    } catch (e) {
      if(e?.status===1)return '';
      throw e;
    }
  })();
  const references=grep.split('\n').filter(Boolean);
  const paths=[...new Set(references.map((line)=>line.split(':',1)[0]))].sort();
  // Fail on machine-consumable config/code references. Generic HTML link indexes are
  // navigation-only and do not consume snapshot values, so their static href/string refs
  // are evidence of discoverability, not authority consumers.
  const executableOrConfig=(p)=>/\.(?:js|mjs|cjs|ts|tsx|jsx|json|ya?ml)$/i.test(p);
  const allowedOperational=new Set([
    'scripts/generate-convergence-strip.mjs',
    '.github/workflows/convergence-validate.yml',
    '.github/workflows/public-surface-check.yml'
  ]);
  const unauthorized=paths.filter((p)=>executableOrConfig(p)&&!allowedOperational.has(p));
  console.log('CONVERGENCE snapshot reference audit · '+(paths.length?paths.join(', '):'no external references'));
  if(unauthorized.length){
    throw new Error('CONVERGENCE_SNAPSHOT_AUTHORITY_CONSUMER '+unauthorized.join(', '));
  }

  const snapshotPath=join(ROOT,'control/convergence-strip.json');
  const plainPath=join(ROOT,'control/convergence-plain.md');
  if(!existsSync(snapshotPath)||!existsSync(plainPath))throw new Error('CONVERGENCE_SNAPSHOT_OUTPUT_MISSING');
  const snapshot=JSON.parse(readFileSync(snapshotPath,'utf8'));
  if(snapshot.role!==SNAPSHOT_ROLE||snapshot.authority!==SNAPSHOT_AUTHORITY||snapshot.live_derivation!==LIVE_FIELD_DERIVATION||snapshot.live_derivation_source!==LIVE_FIELD_SOURCE){
    throw new Error('CONVERGENCE_SNAPSHOT_AUTHORITY_CONTRACT');
  }
  if(Object.prototype.hasOwnProperty.call(snapshot,'open_gaps')){
    throw new Error('CONVERGENCE_SNAPSHOT_SUPERSEDED_BOOT_GAPS');
  }
  const plain=readFileSync(plainPath,'utf8');
  if(!plain.includes('AUTHORITY: NONE')||!plain.includes(LIVE_FIELD_DERIVATION)||!plain.includes('QUEUE + federation-atlas')||!plain.includes('At capture')){
    throw new Error('CONVERGENCE_PLAIN_AUTHORITY_CONTRACT');
  }
  console.log('CONVERGENCE snapshot authority PASS · authority NONE · live '+LIVE_FIELD_DERIVATION+' from QUEUE + federation-atlas');
  console.log('CONVERGENCE superseded WORKER_BOOT gap projection absent');
  console.log('CONVERGENCE material-history filter PASS · telemetry excluded, semantic commits retained');
  process.exit(0);
}

const read = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const git = (cmd, d = '') => { try { return execSync(cmd, { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { return d; } };

const current = existsSync(join(ROOT, 'control/CURRENT.json')) ? read('control/CURRENT.json') : {};
const queue = existsSync(join(ROOT, 'control/QUEUE.json')) ? read('control/QUEUE.json') : {};

const today = new Date().toISOString().slice(0, 10);
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

const data = {
  schema: '0xxx0/convergence-strip/v0.1',
  generated: new Date().toISOString(),
  generator: 'scripts/generate-convergence-strip.mjs',
  role: SNAPSHOT_ROLE,
  authority: SNAPSHOT_AUTHORITY,
  live_derivation: LIVE_FIELD_DERIVATION,
  live_derivation_source: LIVE_FIELD_SOURCE,
  authority_note: 'Captured projection only. Never grants NOW, NEXT, or current truth.',
  activity_semantics: 'material_excluding_generated_telemetry',
  commits_window: commitWindow,
  commits_in_window: commitsInWindow,
  git_commits_in_window: gitCommitsInWindow,
  telemetry_commits_in_window: telemetryCommitsInWindow,
  commits_total: Number(commitsTotal) || 0,
  branch_count: Number(branchCount) || 0,
  recent_commits: recent,
  active_fronts: fronts,
  live_fronts: `${liveCount}/${maxLive}`,
  current_heads: heads,
  current_updated: current.updated || '?'
};
writeFileSync(join(ROOT, 'control/convergence-strip.json'), JSON.stringify(data, null, 2) + '\n');
console.log('wrote control/convergence-strip.json · authority NONE · live '+LIVE_FIELD_DERIVATION);

const plainMd = [
  `# CONVERGENCE — derived snapshot`,
  ``,
  `> **AUTHORITY: NONE.** This is a captured projection, not current convergence.`,
  `> Current convergence: [FIELD live derivation](${LIVE_FIELD_DERIVATION}) = QUEUE + federation-atlas, composed on read. CURRENT separately owns NOW.`,
  `> Do not use this file to choose NOW/NEXT or to claim current truth.`,
  ``,
  `_Captured ${data.generated} by scripts/generate-convergence-strip.mjs_`,
  ``,
  `At capture, the field had **${data.commits_in_window} material commits on ${data.commits_window}** across **${data.branch_count} branches** (${data.git_commits_in_window} exact Git commits in the window; ${data.telemetry_commits_in_window} generated telemetry; ${data.commits_total} on master all-time).`,
  `At capture, **${data.live_fronts}** fronts were marked live, against **${data.current_heads}** captured current heads.`,
  ``,
  `## Captured active fronts`,
  ``,
  ...fronts.map((f) => `- **${f.id}** (${f.state}) — ${f.center}`),
  ``,
  `## Last material commits at capture`,
  ``,
  ...recent.map((s) => `- ${s}`),
  ``,
  `## Law`,
  ``,
  `SNAPSHOT AUTHORITY = NONE. LIVE CONVERGENCE = ${LIVE_FIELD_DERIVATION} = QUEUE + federation-atlas. CURRENT owns NOW.`,
  `WORKER_BOOT compatibility history is not a current gap/gate source.`,
  `ATTENTION ≠ RECENCY. TELEMETRY ≠ MATERIAL MUTATION.`,
  `RECOVER BEFORE INVENTING.`,
  ``,
  `Transfer of power: /control/confluence/TRANSFER_OF_POWER_2026-09-22.md`,
  ``
].join('\n');
writeFileSync(join(ROOT, 'control/convergence-plain.md'), plainMd);
console.log('wrote control/convergence-plain.md · derived snapshot · authority NONE');

console.log('FIELD INDEX owns the live reading at '+LIVE_FIELD_DERIVATION+' from QUEUE + federation-atlas; generated convergence snapshots are projection-only.');
