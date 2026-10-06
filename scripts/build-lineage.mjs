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
<html lang="en" class="dark doc doc-lineage">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>THE LINEAGE — thirteen generations</title>
<link rel="stylesheet" href="/tools/house-patterns.css">
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