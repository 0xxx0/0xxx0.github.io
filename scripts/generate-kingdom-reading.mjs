#!/usr/bin/env node
/**
 * generate-kingdom-reading.mjs
 *
 * Produces ONE addressable document — control/KINGDOM_READING.md — that lets a
 * fresh operator recover the true state of the kingdom in ~10 minutes.
 *
 * This is the "return latency" artifact: read it, know where everything is,
 * know what is true, know what is next. It is GENERATED — do not hand-edit.
 *
 * Readable through our own reader:
 *   /docs/?src=/control/KINGDOM_READING.md&return=/
 *
 * Usage: node scripts/generate-kingdom-reading.mjs
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const J = (p, d = {}) => (existsSync(join(ROOT, p)) ? read(p) : d);
const git = (c, d = '') => { try { return execSync(c, { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { return d; } };
const list = (dir) => (existsSync(join(ROOT, dir)) ? readdirSync(join(ROOT, dir)).sort() : []);

const current = J('control/CURRENT.json');
const queue = J('control/QUEUE.json');
const boot = J('control/WORKER_BOOT.json');
const migration = J('control/MIGRATION.json');

const heads = current.current_heads || [];
const fronts = current.active_fronts || [];
const gaps = boot.open_gaps || [];
const laws = (current.laws || []).slice(0, 9);

const confluence = list('control/confluence').filter((f) => f.endsWith('.md'));
const returns = list('returns').filter((f) => f.endsWith('.json')).slice(-24).reverse();
const donors = (migration.artifacts || []).filter((a) => /FROZEN|DONOR|RECOVER|LIVE_DONOR/.test(a.status || ''));

const commitsToday = git(`git log --since="${new Date().toISOString().slice(0, 10)}T00:00:00" --oneline | wc -l`, '0').trim();
const branches = git('git branch -r | grep -v HEAD | wc -l', '0').trim();
const recent = git('git log -12 --format="%h %s"', '').split('\n').filter(Boolean);

const line = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

const md = [];
md.push(`# THE KINGDOM — READING`);
md.push('');
md.push(`_Generated ${new Date().toISOString()} · ${commitsToday} commits today · ${branches} branches_`);
md.push('_Regenerate: node scripts/generate-kingdom-reading.mjs · Read: /docs/?src=/control/KINGDOM_READING.md_');
md.push('');
md.push('> **RETURN LATENCY** — can a fresh operator recover what is true, uncertain, promised,');
md.push('> currently material, and next-testable within ten minutes? This document answers that.');
md.push('');
md.push('---');
md.push('');
md.push('## 0. THE LAW');
md.push('');
md.push('**RECOVER BEFORE INVENTING.**');
md.push('');
md.push('`SOURCE → ADDRESS → STATE → TRANSFORM → PROVE → RETURN`');
md.push('');
md.push('Then: `DISTINGUISH → COORDINATE → ENACT → MEASURE → PRESERVE → RETURN`');
md.push('');
laws.forEach((l) => md.push(`- ${line(l)}`));
md.push('');
md.push('---');
md.push('');
md.push('## 1. WHAT IS TRUE NOW');
md.push('');
md.push(`**Updated:** ${current.updated || '?'} · **Mode:** ${current.mode || '?'}`);
md.push('');
md.push(`**Live fronts:** ${(queue.live || []).length}/${queue.max_live || 3}`);
md.push('');
fronts.forEach((f) => {
  md.push(`- **${f.id}** — *${f.state}*`);
  md.push(`  ${line(f.center)}`);
  if (f.objective) md.push(`  ${line(f.objective)}`);
});
md.push('');
md.push('**Current heads (coordinates, not invitations):**');
md.push('');
heads.forEach((h) => md.push(`- **${h.head}** (${h.lineage}) — *${h.state}* · \`${h.route}\``));
md.push('');
md.push('**Open gaps:**');
md.push('');
gaps.forEach((g) => md.push(`- \`${g.id}\` — ${g.status}${g.note ? ' — ' + line(g.note) : ''}`));
md.push('');
md.push(`**Next single action:** \`${(current.next_single_action || {}).id || '?'}\``);
md.push(`  ${line((current.next_single_action || {}).instruction || '')}`);
md.push('');
md.push('---');
md.push('');
md.push('## 2. HOW TO READ THE KINGDOM (boot sequence)');
md.push('');
md.push('1. `AGENTS.md` — the house constitution');
md.push('2. `control/CURRENT.json` — what matters now');
md.push('3. `control/WORKER_BOOT.json` — the generated cold-start capsule');
md.push('4. `showcase-manifest.json` — FIELD INDEX identity/address');
md.push('5. `control/POLICY_INDEX.json` — the smallest applicable laws');
md.push('6. `control/SUBMISSION_CONTRACT.json` — the typed envelope');
md.push('7. this document — the wide reading');
md.push('');
md.push('**Live surfaces:** `/` (FIELD INDEX) · `/nexus/` (convergence) · `/nexus/map.html`');
md.push('(system map) · `/nexus/board.html` (agent board) · `/docs/` (READFIELD reader)');
md.push('');
md.push('---');
md.push('');
md.push('## 3. THE DURABLE DOCUMENTS');
md.push('');
md.push(`_${confluence.length} documents in /control/confluence/ — each one is a live claim._`);
md.push('');
confluence.forEach((f) => {
  const slug = f.replace('.md', '').replace(/_/g, ' ').toLowerCase();
  md.push(`- **${slug}** — \`/control/confluence/${f}\``);
});
md.push('');
md.push('---');
md.push('');
md.push('## 4. THE RECOVERY VAULT');
md.push('');
md.push(`_${donors.length} donor families and recovered artifacts — frozen, hashed, retrievable._`);
md.push('');
donors.forEach((a) => {
  md.push(`- **${line(a.name)}** — *${a.status}*${a.route ? ' · `' + a.route + '`' : ''}`);
  if (a.unique) md.push(`  ${line(a.unique).slice(0, 200)}`);
});
md.push('');
md.push('---');
md.push('');
md.push('## 5. THE RECENT RETURNS (evidence of what happened)');
md.push('');
md.push(`_Last ${returns.length} receipts in /returns/._`);
md.push('');
returns.forEach((f) => md.push(`- \`/returns/${f}\``));
md.push('');
md.push('---');
md.push('');
md.push('## 6. RECENT COMMITS');
md.push('');
recent.forEach((c) => md.push(`- \`${c}\``));
md.push('');
md.push('---');
md.push('');
md.push('## 7. THE SUCCESSION');
md.push('');
md.push('The transfer of power — 12 predecessors, the lessons, the path forward:');
md.push('');
md.push('- `/control/confluence/TRANSFER_OF_POWER_2026-09-22.md`');
md.push('- `/control/confluence/CONVERGENCE_STRATEGY.md`');
md.push('- `/control/confluence/sovereign-node/` (SOVEREIGN-NODE-FOUNDATION, PORTABLE_AI_CONVERGENCE, TRAINING_FIELD_MANUAL, PROJECT-FEDERATION)');
md.push('');
md.push('---');
md.push('');
md.push('_This document is generated. If it is stale, regenerate it — do not hand-edit._');
md.push('_Read it in the reader: `/docs/?src=/control/KINGDOM_READING.md&return=/`_');
md.push('');

const out = md.join('\n');
writeFileSync(join(ROOT, 'control/KINGDOM_READING.md'), out);
const words = out.split(/\s+/).length;
console.log(`wrote control/KINGDOM_READING.md (${words} words, ${confluence.length} docs, ${donors.length} donors)`);