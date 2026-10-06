#!/usr/bin/env node
/**
 * build-godseye.mjs — GOD'S EYE VIEW
 *
 * The whole system on one page, under one rule:
 *
 *   A NUMBER THAT CANNOT NAME ITS SOURCE FILE IS NOT ALLOWED ON A PAGE.
 *
 * Every figure is paired with the command or file it came from. Discrepancies
 * found while building the page are published rather than hidden. Known
 * unknowns are listed explicitly.
 *
 * Input:  control/witness/figures.json, control/witness/discrepancies.json
 * Output: godseye/index.html
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const J = (p, d = []) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : d);
const facts = J(join(ROOT, 'control/witness/figures.json'));
const discs = J(join(ROOT, 'control/witness/discrepancies.json'));

const esc = (s) => String(s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

const UNKNOWNS = [
  ['total bytes across all corpora', 'no single index exists; a du over ~/Documents is TCC-blocked to this shell'],
  ['how many conversations were ever deleted', 'an export can show presence, never absence'],
  ['whether the 13 group chats are complete', 'group_chats.json may itself be partial — it is one file, not a ledger'],
  ['the physical archive', 'boxes, drives, paper — never indexed; needs eyes and hands, not a script'],
  ['the two GrapheneOS Pixel 8 Pro phones', 'no device inventory exists yet'],
  ['which artifacts are load-bearing vs decorative', 'needs a human judgement pass, not a count'],
];

// threads the human raised, pinned so future-self does not have to re-derive them
const QUEUED = [
  ['patch theory', 'Darcs/Pijul: mathematically sound patch algebra. Relevant to "git hesitation" — the theory says merges can be lawful, not just hopeful.', 'RESEARCHED'],
  ['git history repair', 'the real question is not "can I undo" but "what is the smallest lawful move". Answer: never rewrite shared history; add a correcting commit.', 'ANSWERED'],
  ['micro-repo / zero-dep', 'tiny controllable core, no dependencies. The vulnerability argument is the strong one: a dep you do not have cannot be exploited.', 'PINNED'],
  ['sandbox / playpen', 'the house metaphor — outside shoes vs inside shoes. Separation of surfaces by trust level, not by feature.', 'PINNED'],
  ['OSINT / OPSEC platform', 'self-hosted recon. SpiderFoot / theHarvester / recon-ng are the 2026 baselines. Note: most leak your targets to third parties.', 'PINNED'],
  ['VCS for physical things', 'version control for artwork and rooms — hashes for objects, receipts for moves. The RETURN template is already the seed of this.', 'PINNED'],
  ['sensor fusion / biofeedback', 'heartbeat into houselights. Needs a sensor inventory before a plan.', 'PINNED'],
  ['exercise todo.txt', 'a plain-text body log. todo.txt format is 2006-era and still correct: no app required.', 'PINNED'],
  ['the two phones', 'GrapheneOS load-out. Needs: inventory, then a written install order, then a dry run.', 'PINNED'],
];

const rows = facts.map((f) => `<tr>
  <td class="v">${esc(f.v)}</td>
  <td class="l">${esc(f.label)}</td>
  <td class="s">${esc(f.src)}</td>
</tr>`).join('\n');

const discRows = discs.map((d, i) => `<tr>
  <td class="i">${String(i + 1).padStart(2, '0')}</td>
  <td class="l"><b>${esc(d[0])}</b><div class="d">${esc(d[1])}</div></td>
  <td class="s">${esc(d[2])}</td>
</tr>`).join('\n');

const qRows = QUEUED.map(([t, why, st]) => {
  const cls = st === 'ANSWERED' ? 'ok' : st === 'RESEARCHED' ? 'mid' : 'pin';
  return `<article class="q ${cls}">
  <div class="qh"><span class="qt">${esc(t)}</span><span class="qs">${esc(st)}</span></div>
  <div class="qb">${esc(why)}</div>
</article>`;
}).join('\n');

const html = `<!DOCTYPE html>
<html lang="en" class="dark doc doc-godseye">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>GOD'S EYE VIEW — every number names its source</title>
<link rel="stylesheet" href="/tools/house-patterns.css">
</head>
<body>
<div class="wrap">
<header>
  <h1>GOD'S EYE VIEW</h1>
  <div class="sub"><b>${facts.length} figures</b> · each one names its source ·
  <b>${discs.length} discrepancies</b> · <b>${UNKNOWNS.length} explicit unknowns</b></div>
</header>

<div class="rule">
  <div class="r">A number that cannot name its source file is not allowed on a page.</div>
  <div class="w">This page was built under that rule. Everything below is either traceable to a
  command or an explicit unknown. ${discs.length} places where our own figures disagreed
  with the files were found <em>while building this</em> — they are published, not corrected away.</div>
</div>

<h2>The figures</h2>
<table>
<thead><tr><th>value</th><th>what</th><th>source</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>

<h2>Discrepancies — found by sourcing every number</h2>
<table class="disc">
<thead><tr><th>#</th><th>what disagreed</th><th>why it matters</th></tr></thead>
<tbody>
${discRows}
</tbody>
</table>

<h2>Threads — raised, and where they stand</h2>
${qRows}

<h2>Known unknowns</h2>
<div class="unk">
${UNKNOWNS.map(([k, w]) => `  <div class="u"><div class="k">? ${esc(k)}</div><div class="w">${esc(w)}</div></div>`).join('\n')}
</div>

<footer>
  GOD'S EYE VIEW · the rule is the artifact ·
  <a href="../sky/">the sky</a> · <a href="../twins/">the twins</a> · <a href="../lineage/">the lineage</a> ·
  <a href="../nexus/">field nexus</a> · <a href="../">field index</a>
</footer>
</div>
</body>
</html>`;

mkdirSync('godseye', { recursive: true });
writeFileSync('godseye/index.html', html);
console.log('wrote godseye/index.html (' + (html.length / 1024).toFixed(1) + ' KB)');
console.log('facts=' + facts.length + ' discrepancies=' + discs.length + ' unknowns=' + UNKNOWNS.length + ' threads=' + QUEUED.length);