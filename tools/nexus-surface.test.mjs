#!/usr/bin/env node
'use strict';
/* NEXUS compatibility test — /nexus/ is an alias into the canonical FIELD
   convergence read. board.html + map.html remain direct utility projections.
   The test therefore proves: alias target/re-entry behavior, local link integrity,
   board snapshot coherence, and map structural completeness. Node stdlib only.
   Run: node tools/nexus-surface.test.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const PAGES = ['nexus/index.html', 'nexus/board.html', 'nexus/map.html'];
const TXT = Object.fromEntries(PAGES.map(p => [p, read(p)]));
const [INDEX, BOARD, MAP] = PAGES.map(p => TXT[p]);
const FIELD = read('index.html');

const checks = [];
const check = (name, fn) => {
  try { fn(); checks.push([name, null]); }
  catch (e) { checks.push([name, e]); }
};

check('pages: alias + utility pages load with expected titles', () => {
  assert.ok(INDEX.length > 700, 'nexus alias too small');
  assert.ok(BOARD.length > 3000, 'board too small');
  assert.ok(MAP.length > 3000, 'map too small');
  assert.ok(INDEX.includes('<title>NEXUS // FIELD alias</title>'), 'alias title');
  assert.ok(BOARD.includes('<title>OPS // multi-agent board</title>'), 'board title');
  assert.ok(MAP.includes('<title>FIELD // ARCHITECTURE MAP</title>'), 'map title');
});

check('links: every local link resolves to a real repo path (incl. src/return targets)', () => {
  const missing = [];
  let checked = 0;
  for (const page of PAGES) {
    const txt = TXT[page];
    const targets = new Set([
      ...[...txt.matchAll(/href="([^"]+)"/g)].map(m => m[1]),
      ...[...txt.matchAll(/location\.href='([^']+)'/g)].map(m => m[1]),
    ]);
    for (const target of targets) {
      if (/^(https?:|mailto:|#)/.test(target)) continue;
      checked++;
      const rel = target.split('?')[0].split('#')[0];
      const resolved = rel.startsWith('/')
        ? path.resolve(ROOT, rel.slice(1))
        : path.resolve(ROOT, path.dirname(page), rel);
      if (!resolved.startsWith(ROOT) || !fs.existsSync(resolved)) missing.push(`${page} → ${target}`);
      const query = target.includes('?') ? target.slice(target.indexOf('?') + 1) : '';
      for (const qp of query.matchAll(/(?:^|&)(?:src|return)=([^&]*)/g)) {
        if (!qp[1].startsWith('/')) continue;
        checked++;
        const qResolved = path.resolve(ROOT, qp[1].slice(1));
        if (!fs.existsSync(qResolved)) missing.push(`${page} → query ${qp[1]}`);
      }
    }
  }
  assert.ok(checked >= 4, `link extraction found only ${checked} local targets — alias surface must retain FIELD + board + map + root reachability`);
  assert.deepEqual(missing, [], 'dead local links');
});

check('index: compatibility alias returns to canonical FIELD convergence', () => {
  assert.ok(INDEX.includes('http-equiv="refresh" content="0;url=../#convRead"'), 'meta redirect target');
  assert.ok(INDEX.includes("location.replace('../#convRead')"), 'script redirect target');
  assert.ok(INDEX.includes('CURRENT owns attention'), 'authority boundary');
  assert.ok(INDEX.includes('RETURN owns durable evidence'), 'return boundary');
  assert.ok(INDEX.includes('href="./board.html"'), 'board utility link');
  assert.ok(INDEX.includes('href="./map.html"'), 'map utility link');
});

check('FIELD: convergence hash opens the embedded read instead of a second dashboard', () => {
  assert.ok(FIELD.includes('id="reentryFold"'), 're-entry fold id');
  assert.ok(FIELD.includes('id="convRead"'), 'embedded convergence read');
  assert.ok(FIELD.includes("location.hash!=='#convRead'"), 'hash reveal guard');
  assert.ok(FIELD.includes("fold.open=true"), 'hash opens root re-entry fold');
  assert.ok(FIELD.includes('<b>CONVERGE / READ</b>'), 'root convergence destination');
  assert.ok(!FIELD.includes('<b>CONVERGE / NEXUS</b>'), 'stale NEXUS authority still exposed');
});

check('board: "N/N bots live" claims equal the bot cards present, header == footer', () => {
  const claims = BOARD.match(/\d+\/\d+ bots live/g) || [];
  assert.equal(claims.length, 2, 'expected a header and a footer bots-live claim');
  const handles = new Set(BOARD.match(/@[A-Za-z0-9_]+bot/g) || []);
  assert.ok(handles.size >= 3, `only ${handles.size} bot handles found`);
  for (const claim of claims) {
    const m = claim.match(/(\d+)\/(\d+)/);
    assert.ok(m, `claim "${claim}" unparsable`);
    const [num, den] = [Number(m[1]), Number(m[2])];
    assert.equal(num, den, `claim "${claim}" numerator ≠ denominator`);
    assert.equal(den, handles.size, `claim "${claim}" ≠ ${handles.size} bot cards`);
  }
  assert.equal(claims[0], claims[1], 'header and footer bots-live claims disagree');
});

check('board: every card carries title + name; footer names its source', () => {
  const cards = BOARD.split('<div class="card">').slice(1);
  assert.ok(cards.length >= 5, `only ${cards.length} board cards`);
  for (const block of cards) {
    assert.ok(/class="t">[^<]+/.test(block), 'board card without title');
    assert.ok(/class="n"[^>]*>[^<]+/.test(block), 'board card without name');
  }
  assert.ok(BOARD.includes('source: void-anchor/ops-hub'), 'board source provenance');
  assert.ok(BOARD.includes('regenerated from state'), 'board regeneration note');
});

check('board: branch table rows complete (4 cells, non-empty cells)', () => {
    const rows = (BOARD.match(/<tr>[\s\S]*?<\/tr>/g) || []).filter(r => r.includes('<td'));
    assert.ok(rows.length >= 3, `only ${rows.length} branch rows`);
    // HISTORY, because this check has now been wrong twice in different ways:
    //   v1 asserted the LAST cell matched /live|active/. That passed only while the state
    //      happened to be the final column; when the board became a kanban face (5528c648)
    //      the last column became the task title, and this check went red in CI.
    //   v2 asserted cell 2 was a recognised state. Also wrong: the table is HETEROGENEOUS --
    //      measured 2026-09-27, of 28 four-cell rows, 10 carry a state in cell 2 and 18 carry
    //      an assignee there.
    // So assert what is actually invariant: the row structure. Do NOT re-narrow this to a
    // column position or a specific vocabulary -- the board's columns are not stable under
    // its own writers, and a snapshot assertion here just breaks CI again on the next change.
    for (const row of rows) {
      const cells = row.match(/<td[^>]*>[\s\S]*?<\/td>/g) || [];
      assert.equal(cells.length, 4, 'branch row must have 4 cells');
      const last = cells[cells.length - 1].replace(/<[^>]+>/g, '').trim();
      assert.ok(last.length > 0, 'branch row must not end in an empty cell');
    }
  });

check('map: every architecture node carries role / name / description and a lawful class', () => {
  const nodes = [...MAP.matchAll(/<a class="node ([^"]+)"[^>]*>[\\s\\S]*?<\\/a>/g)];
  assert.ok(nodes.length >= 8, `only ${nodes.length} map nodes`);
  const classes = new Set(['root', 'exec', 'test', 'repr', 'bound', 'return']);
  for (const match of nodes) {
    const cls = match[1].trim();
    assert.ok(classes.has(cls), `map node class "${cls}" outside current architecture classes`);
    const block = match[0];
    for (const field of ['k', 'n', 'd'])
      assert.ok((block.match(new RegExp(`class="${field}">([^<]*)<`)) || [])[1]?.trim(),
        `map node ${cls} has empty ${field}`);
  }
});

check('map: legend names the current flow classes', () => {
  for (const label of ['CAPTURE', 'EXECUTE', 'TEST / REPRESENT', 'RETURN', 'CONTEXT / SUPPORT'])
    assert.ok(MAP.includes(label), `legend missing ${label}`);
});

check('map: capture / authority / return laws remain explicit', () => {
  assert.ok(MAP.includes('HUMAN PORT</a> → <a href="/router-bench/">ROUTER</a> → <a href="/person-resource-policy.schema.json">POLICY</a>'),
    'capture boundary chain');
  assert.ok(MAP.includes('CURRENT → NOW'), 'CURRENT authority');
  assert.ok(MAP.includes('NATIVE HOST → COMMIT / EFFECT'), 'native effect authority');
  assert.ok(MAP.includes('RETURN → DURABLE EVIDENCE'), 'return authority');
  assert.ok(MAP.includes('SOURCE → HOLD → TURN → TRACE → RETURN'), 'map projection chain');
  assert.ok(MAP.includes('no authority or state lives here'), 'projection-only boundary');
});

const fails = checks.filter(([, e]) => e);
for (const [name, e] of checks)
  if (e) console.error('  FAIL', name, '—', String(e.message).split('\n')[0]);
console.log((fails.length ? 'NEXUS SURFACE TEST FAIL' : 'NEXUS SURFACE TEST PASS')
  + ` · ${checks.length - fails.length}/${checks.length} checks`
  + ' · /nexus/ alias + board/map utility integrity'
  + (fails.length ? ` · ${fails.length} failed` : ''));
process.exitCode = fails.length ? 1 : 0;