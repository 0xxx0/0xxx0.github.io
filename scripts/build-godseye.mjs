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
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>GOD'S EYE VIEW — every number names its source</title>
<style>
  :root{--bg:#05070a;--ink:#e8ece9;--mut:#6b7780;--hot:#ed7447;--cool:#72bce7;--gold:#d5ad68;--green:#98d49b;--line:#1d262c}
  *{box-sizing:border-box}
  html,body{margin:0;background:var(--bg);color:var(--ink);font:12px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace}
  .wrap{max-width:1280px;margin:0 auto;padding:30px 20px 90px}
  header{border-bottom:1px solid var(--line);padding-bottom:16px;margin-bottom:26px}
  h1{margin:0 0 8px;font-size:15px;font-weight:500;letter-spacing:.24em;color:var(--gold)}
  .sub{color:var(--mut);letter-spacing:.05em}.sub b{color:var(--ink);font-weight:500}
  h2{font-size:9px;letter-spacing:.26em;color:var(--mut);font-weight:500;margin:34px 0 12px;text-transform:uppercase}
  .rule{border:1px solid var(--gold);background:#0b0e11;padding:18px 20px;margin-bottom:24px}
  .rule .r{font-size:15px;color:var(--gold);letter-spacing:.03em;line-height:1.5}
  .rule .w{color:var(--mut);font-size:10px;margin-top:10px;letter-spacing:.05em}
  table{width:100%;border-collapse:collapse;border:1px solid var(--line);background:#000}
  th{text-align:left;font-size:8px;letter-spacing:.2em;text-transform:uppercase;color:var(--mut);
    padding:8px 12px;border-bottom:1px solid var(--line);background:#0a0e11;font-weight:500}
  td{padding:7px 12px;border-bottom:1px solid #111a1f;vertical-align:top;font-size:11px}
  tr:last-child td{border-bottom:0}
  td.v{color:var(--gold);white-space:nowrap;font-size:12px}
  td.l{color:var(--ink)}
  td.s{color:var(--mut);font-size:10px;word-break:break-word}
  tr:hover td{background:#080c0e}
  .disc td.i{color:var(--hot);font-size:11px}
  .disc td.l b{color:var(--hot);letter-spacing:.06em;text-transform:uppercase;font-size:10px}
  .disc td.l .d{color:var(--ink);margin-top:3px;font-size:11px}
  .disc td.s{color:var(--cool);font-size:10px}
  .qs{font-size:8px;letter-spacing:.16em;padding:2px 6px;border:1px solid var(--line);color:var(--mut)}
  .q{margin-bottom:1px;display:flex;gap:0;border:1px solid var(--line);background:#000;align-items:stretch}
  .q .qh{display:flex;flex-direction:column;gap:5px;padding:12px 14px;min-width:210px;
    border-right:1px solid var(--line);background:#080b0e}
  .q .qt{color:var(--ink);font-size:12px;letter-spacing:.05em}
  .q.ok .qs{color:var(--green);border-color:#315837}
  .q.mid .qs{color:var(--gold);border-color:#3a2c1e}
  .q.pin .qs{color:var(--cool);border-color:#1f4a5e}
  .q .qb{padding:12px 15px;color:var(--mut);font-size:11px;line-height:1.65}
  .unk{border:1px solid var(--line);background:#000}
  .unk .u{display:grid;grid-template-columns:250px 1fr;gap:0;border-bottom:1px solid #111a1f}
  .unk .u:last-child{border-bottom:0}
  .unk .k{padding:9px 12px;color:var(--hot);border-right:1px solid #111a1f;font-size:11px}
  .unk .w{padding:9px 12px;color:var(--mut);font-size:10px}
  footer{margin-top:40px;padding-top:16px;border-top:1px solid var(--line);color:var(--mut);font-size:9px;letter-spacing:.08em}
  footer a{color:var(--cool);text-decoration:none}
  @media(max-width:820px){td.s{display:none}th:nth-child(3){display:none}
    .unk .u{grid-template-columns:1fr}.q{flex-direction:column}.q .qh{min-width:0;border-right:0;border-bottom:1px solid var(--line)}}
</style>
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