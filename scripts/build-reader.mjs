#!/usr/bin/env node
/**
 * build-reader.mjs — ARCHIVE READER / LOCAL SURFACE
 *
 * A PUBLIC projection of a PRIVATE, local-only service.
 *
 * The service (127.0.0.1:8777) owns no public route and serves no public
 * bytes. What this page publishes is the SHAPE of the thing and the state of
 * its verification — never its contents, never its device topology.
 *
 * It exists because the service cannot be a route in showcase-manifest.json:
 * every registered href must resolve to a real file under this repo, and a
 * localhost address is not one. So the service gets a projection instead.
 *
 * Input:  /tmp/reader-probe.json   (body-asserted probe result)
 * Output: reader/index.html
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const probe = existsSync('/tmp/reader-probe.json')
  ? JSON.parse(readFileSync('/tmp/reader-probe.json', 'utf8'))
  : { good: [], bad: [], passed: 0, total: 0 };

const esc = (s) => String(s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

const routeRows = probe.good.map(([r, c, t, , n]) =>
  `<tr><td class="ok">PASS</td><td class="p">${esc(r)}</td><td class="c">${esc(c)}</td><td class="t">${esc(t)}</td><td class="n">${n.toLocaleString()} B</td></tr>`
).concat(probe.bad.map(([r, c, t, e, n]) =>
  `<tr><td class="xx">FAIL</td><td class="p">${esc(r)}</td><td class="c">${esc(c)}</td><td class="t">${esc(t)}</td><td class="n">${n.toLocaleString()} B</td><td class="e">${esc(e[0] || 'error body')}</td></tr>`
)).join('\n');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ARCHIVE READER / LOCAL SURFACE</title>
<style>
  :root{--bg:#05070a;--ink:#e8ece9;--mut:#6b7780;--hot:#ed7447;--cool:#72bce7;--gold:#d5ad68;--green:#98d49b;--line:#1d262c}
  *{box-sizing:border-box}
  html,body{margin:0;background:var(--bg);color:var(--ink);font:12px/1.65 ui-monospace,SFMono-Regular,Menlo,monospace}
  .wrap{max-width:1100px;margin:0 auto;padding:30px 20px 80px}
  header{border-bottom:1px solid var(--line);padding-bottom:16px;margin-bottom:26px}
  h1{margin:0 0 8px;font-size:15px;font-weight:500;letter-spacing:.22em;color:var(--gold)}
  .sub{color:var(--mut);letter-spacing:.05em}.sub b{color:var(--ink);font-weight:500}
  h2{font-size:9px;letter-spacing:.26em;color:var(--mut);font-weight:500;margin:32px 0 12px;text-transform:uppercase}
  .local{border:1px solid var(--line);background:#000;padding:16px 18px;margin-bottom:22px}
  .local .u{color:var(--cool);font-size:15px;letter-spacing:.04em}
  .local .w{color:var(--mut);font-size:11px;margin-top:8px;line-height:1.7}
  .rule{border:1px solid var(--hot);background:#100708;padding:14px 16px;margin:22px 0}
  .rule .h{color:var(--hot);font-size:10px;letter-spacing:.18em;text-transform:uppercase;margin-bottom:7px}
  .rule .t{font-size:12px;line-height:1.7}
  .rule .t em{color:var(--gold);font-style:normal}
  table{width:100%;border-collapse:collapse;border:1px solid var(--line);background:#000}
  th{text-align:left;font-size:8px;letter-spacing:.2em;text-transform:uppercase;color:var(--mut);
    padding:8px 11px;border-bottom:1px solid var(--line);background:#0a0e11;font-weight:500}
  td{padding:6px 11px;border-bottom:1px solid #111a1f;font-size:11px}
  tr:last-child td{border-bottom:0}
  td.ok{color:var(--green)} td.xx{color:var(--hot)}
  td.p{color:var(--cool)} td.c{color:var(--mut)} td.t{color:var(--ink)} td.n{color:var(--mut);text-align:right}
  td.e{color:var(--hot);font-size:10px}
  .score{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:1px;background:var(--line);border:1px solid var(--line);margin-bottom:14px}
  .s{background:#000;padding:12px 14px}
  .s .k{color:var(--mut);font-size:8px;letter-spacing:.18em;text-transform:uppercase}
  .s .v{color:var(--ink);font-size:22px;margin-top:4px}
  .s .v.g{color:var(--green)} .s .v.h{color:var(--hot)}
  footer{margin-top:40px;padding-top:16px;border-top:1px solid var(--line);color:var(--mut);font-size:9px;letter-spacing:.08em}
  footer a{color:var(--cool);text-decoration:none}
  @media(max-width:700px){td.e{display:none}th:nth-child(6){display:none}}
</style>
</head>
<body>
<div class="wrap">
<header>
  <h1>ARCHIVE READER / LOCAL SURFACE</h1>
  <div class="sub">a public <b>projection</b> of a private service &nbsp;·&nbsp;
  <b>${probe.passed}/${probe.total}</b> routes body-asserted &nbsp;·&nbsp; nothing private is published here</div>
</header>

<div class="local">
  <div class="u">http://127.0.0.1:8777</div>
  <div class="w">
    A read-only corpus viewer that runs <em>on one machine only</em>. It owns no public route and
    serves no public bytes, so this page registers its <b>shape and verification state</b> —
    never its contents, never its device topology.<br><br>
    It deliberately holds <b>no Full Disk Access</b>: TCC-protected roots are browsed from a
    snapshot index built by an FDA-capable shell outside the service. Private bytes stay private.
  </div>
</div>

<div class="rule">
  <div class="h">why this page exists</div>
  <div class="t">
    A localhost address cannot be a route in this repo's registry — every registered href must
    resolve to a real file. So the service gets a <em>projection</em> instead of a route.<br><br>
    Previous version of this figure claimed merely <em>"200"</em> from a status code. That was a
    lie of the exact class this repo forbids: <em>a number that cannot name its source file is
    not allowed on a page.</em> Status codes lie here — three routes return
    <em>HTTP 200 with an error body</em>. The figure is now body-asserted.
  </div>
</div>

<h2>Probe — body-asserted, not status-only</h2>
<div class="score">
  <div class="s"><div class="k">passed</div><div class="v g">${probe.passed}</div></div>
  <div class="s"><div class="k">failed</div><div class="v h">${probe.bad.length}</div></div>
  <div class="s"><div class="k">probed</div><div class="v">${probe.total}</div></div>
</div>
<table>
<thead><tr><th>verdict</th><th>route</th><th>http</th><th>title</th><th>bytes</th><th>note</th></tr></thead>
<tbody>
${routeRows}
</tbody>
</table>

<h2>What "pass" means here</h2>
<div class="local">
  <div class="w">
    A route passes only if <b>all</b> hold: HTTP 200, the page title is not <code>404</code> or
    <code>err</code>, the body contains no <code>Errno</code>/<code>Operation not permitted</code>
    marker, and the body exceeds 500 bytes. A status code alone proves nothing.
  </div>
</div>

<footer>
  ARCHIVE READER / LOCAL SURFACE · projection only ·
  <a href="../witness/">the witness</a> · <a href="../godseye/">the account</a> ·
  <a href="../nexus/">field nexus</a> · <a href="../">field index</a>
</footer>
</div>
</body>
</html>`;

mkdirSync(join(ROOT, 'reader'), { recursive: true });
writeFileSync(join(ROOT, 'reader/index.html'), html);
console.log(`wrote reader/index.html (${(html.length / 1024).toFixed(1)} KB)`);
console.log(`probe: ${probe.passed}/${probe.total} passed, ${probe.bad.length} failed`);