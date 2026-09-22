#!/usr/bin/env node
/**
 * build-lineage.mjs — THE LINEAGE
 *
 * Every predecessor generation of this work, 2018 → 2026.
 * "No predecessor is deleted. Every one is evidence of a decision someone made."
 *
 * Source: control/confluence/TRANSFER_OF_POWER_2026-09-22.md § II
 * Output: lineage/index.html
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';

// era, name, tried, survived, route  — transcribed from the transfer-of-power table
const P = [
  ['2018', 'KALA', 'desktop character', 'A visible character in a room', 'ASCII character + CSS3D room transform', '/recovery/kala/'],
  ['2019', 'KRAKEN / POLY', 'capability exposure', 'Capability exposure, lenses, transducers, combinators', 'The reducer/transducer protocol', '/recovery/poly-furnisher/'],
  ['2019', 'DataDisc', 'radial projection', '150-item compound-glyph spiral projection', 'Radial multichannel projection', '/recovery/media/datadisc/datadisc.html'],
  ['2020', 'proto-kernel / INTERPHASE', 'integrated kernel', 'Integrated kernel before formal cleanup', 'Reducer / matrix / lens / scheduling', '/recovery/poly-furnisher/proto-kernel-2020/'],
  ['2021+', 'Grid Path Compiler V4', 'path machinery', 'LATIN CONTROL, MEANTOME, Nine-Gate adapters', 'Path / address / RSVP machinery', '/recovery/path-grid/'],
  ['2024-12', 'Sleeper / Hostage', 'generative grammar', '"The Sleeper takes itself hostage. What\'s the ransom?"', 'A generative grammar', 'live City Engine'],
  ['2025', 'Laconic / Iconic', 'phrase machinery', 'Compact reusable phrase machinery', '255 recovered items', '/laconic/'],
  ['2026-08', 'voic-anchor / sovereign node', 'clean agent base', 'A clean personal-agent base', 'Nix / Hermes / Ollama awareness, ICM method', 'Downloads/31aug/'],
  ['2026', 'phantom-grid', 'single-file stack', 'Single-file sovereign AI stack', 'The generator lineage', 'phantom-grid-v31'],
  ['2026', 'Project Federation', 'index without erasure', '117 indexed projects without erasure', 'Stable IDs, missingness, next action', 'PROJECT-FEDERATION'],
  ['2026-08', 'training field', 'skill acquisition', 'Rapid skill acquisition, safe calibration', 'predict→attempt→observe→classify→change→retest→promote', 'TRAINING_FIELD_MANUAL'],
  ['2026-09', 'fold/bloom', 'audio as terrain', 'Audio as addressed terrain', 'LISTEN, TWO DIAL, ECOLOGY, LIVE, RIDE', '/fold-bloom/'],
  ['2026 —', 'FIELD INDEX', 'one field', 'One field for apps, adapters, physical assets', 'INPUT→PORT→ADDRESS→STATE→TRANSFORM→OUTPUT→EVIDENCE→RETURN', '/'],
];

const esc = (s) => String(s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
const last = P[P.length - 1];

const rows = P.map(([era, name, tag, tried, survived, route], i) => {
  const isCurrent = name === 'FIELD INDEX';
  const link = route.startsWith('/') ? `<a href="..${route}">${esc(route)}</a>` : `<span>${esc(route)}</span>`;
  return `<article class="gen${isCurrent ? ' now' : ''}">
  <div class="era">${esc(era)}</div>
  <div class="body">
    <div class="name">${esc(name)}${isCurrent ? ' <em>← here</em>' : ''}</div>
    <div class="tag">${esc(tag)}</div>
    <div class="pair">
      <div class="cell"><div class="k">tried</div><div class="v">${esc(tried)}</div></div>
      <div class="cell"><div class="k">survived</div><div class="v">${esc(survived)}</div></div>
    </div>
    <div class="live">${link}</div>
  </div>
</article>`;
}).join('\n');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>THE LINEAGE — thirteen generations</title>
<style>
  :root{--bg:#05070a;--ink:#e8ece9;--mut:#6b7780;--hot:#ed7447;--cool:#72bce7;--gold:#d5ad68;--green:#98d49b;--line:#1d262c}
  *{box-sizing:border-box}
  html,body{margin:0;background:var(--bg);color:var(--ink);font:12px/1.65 ui-monospace,SFMono-Regular,Menlo,monospace}
  .wrap{max-width:1000px;margin:0 auto;padding:30px 20px 80px}
  header{border-bottom:1px solid var(--line);padding-bottom:16px;margin-bottom:30px}
  h1{margin:0 0 8px;font-size:15px;font-weight:500;letter-spacing:.24em;color:var(--gold)}
  .sub{color:var(--mut);letter-spacing:.05em}.sub b{color:var(--ink);font-weight:500}
  .oath{border:1px solid var(--gold);background:#0b0e11;padding:18px 20px;margin-bottom:26px;color:var(--ink);font-size:13px;line-height:1.7}
  .oath em{color:var(--gold);font-style:normal}
  .gen{display:grid;grid-template-columns:78px 1fr;gap:0;border:1px solid var(--line);border-bottom:0;background:#000}
  .gen:last-of-type{border-bottom:1px solid var(--line)}
  .gen.now{border-color:var(--gold);background:linear-gradient(90deg,#0d0b07,#000)}
  .era{padding:14px 12px;border-right:1px solid var(--line);color:var(--mut);font-size:11px;letter-spacing:.1em;background:#080b0e}
  .gen.now .era{color:var(--gold)}
  .body{padding:14px 16px}
  .name{font-size:14px;letter-spacing:.06em;color:var(--ink)}
  .gen.now .name{color:var(--gold)}
  .name em{color:var(--gold);font-style:normal;font-size:10px;letter-spacing:.16em;margin-left:6px}
  .tag{color:var(--mut);font-size:9px;letter-spacing:.16em;text-transform:uppercase;margin-top:3px}
  .pair{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:11px}
  .cell .k{font-size:8px;letter-spacing:.2em;text-transform:uppercase;color:var(--mut)}
  .cell .v{font-size:11px;color:var(--ink);margin-top:3px;line-height:1.55}
  .pair .cell:first-child .k{color:#5e2f1f}
  .pair .cell:last-child .k{color:#1f4a5e}
  .live{margin-top:10px;font-size:9px;letter-spacing:.08em}
  .live a{color:var(--green);text-decoration:none}
  .live a:hover{text-decoration:underline}
  .live span{color:var(--mut)}
  .tail{border:1px solid var(--line);background:#080b0e;padding:16px 18px;margin-top:22px;color:var(--mut);font-size:11px;line-height:1.7}
  .tail b{color:var(--ink)}
  footer{margin-top:34px;padding-top:16px;border-top:1px solid var(--line);color:var(--mut);font-size:9px;letter-spacing:.08em}
  footer a{color:var(--cool);text-decoration:none}
  @media(max-width:640px){.gen{grid-template-columns:56px 1fr}.pair{grid-template-columns:1fr;gap:10px}}
</style>
</head>
<body>
<div class="wrap">
<header>
  <h1>THE LINEAGE</h1>
  <div class="sub"><b>${P.length} generations</b> &nbsp;·&nbsp; 2018 → 2026 &nbsp;·&nbsp;
  none deleted &nbsp;·&nbsp; every one a donor</div>
</header>

<div class="oath">
  &ldquo;No predecessor is deleted. Every one is evidence of a decision someone made.&rdquo;
</div>

${rows}

<div class="tail">
  <b>How to read this.</b> The left column is when. The middle is what it tried and what
  survived it. The green line is where that generation still lives — frozen, exact, retrievable.<br><br>
  A generation is not superseded because it stopped. It is <em>retired to donor</em>. Mechanism
  transfers forward only when a current head names a missing function.
</div>

<footer>
  THE LINEAGE · carried from TRANSFER_OF_POWER § II ·
  <a href="../twins/">the twins</a> · <a href="../sky/">the sky</a> ·
  <a href="../control/confluence/TRANSFER_OF_POWER_2026-09-22.md">the full transfer</a> ·
  <a href="../">field index</a>
</footer>
</div>
</body>
</html>`;

mkdirSync('lineage', { recursive: true });
writeFileSync('lineage/index.html', html);
console.log('wrote lineage/index.html (' + (html.length / 1024).toFixed(1) + ' KB), ' + P.length + ' generations');