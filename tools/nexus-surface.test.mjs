#!/usr/bin/env node
'use strict';
/* NEXUS head test — the /nexus/ surface (index.html, board.html, map.html)
   had no runnable check of any kind. These are hand-authored snapshot pages,
   so what is real and falsifiable here is: (a) every local link resolves to a
   real repo path (incl. src/return query targets), (b) the pages carry their
   contract structure (titles, cross-links, provenance statements), and
   (c) each page's internal claims are self-consistent (the "N/N bots live"
   claim equals the bot cards actually present; blocker lists match their
   counts; pipeline rows and map nodes are complete). Node stdlib only.
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

const checks = [];
const check = (name, fn) => {
  try { fn(); checks.push([name, null]); }
  catch (e) { checks.push([name, e]); }
};

check('pages: all three load as substantial HTML with their expected titles', () => {
  for (const p of PAGES) assert.ok(TXT[p].length > 3000, `${p} too small`);
  assert.ok(INDEX.includes('<title>NEXUS // convergence</title>'), 'index title');
  assert.ok(BOARD.includes('<title>OPS // multi-agent board</title>'), 'board title');
  assert.ok(MAP.includes('<title>FIELD // SYSTEM MAP</title>'), 'map title');
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
      const resolved = path.resolve(ROOT, path.dirname(page), rel);
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
  assert.ok(checked >= 20, `link extraction found only ${checked} local targets — extractor broken?`);
  assert.deepEqual(missing, [], 'dead local links');
});

check('index: topnav cross-links the three views and FIELD INDEX', () => {
  for (const href of ['href="./index.html"', 'href="./map.html"', 'href="./board.html"', 'href="../"'])
    assert.ok(INDEX.includes(href), `index topnav missing ${href}`);
});

check('index: cards carry label + stat; blocker lists match their own counts', () => {
  const cards = INDEX.split('<a class="card"').slice(1);
  assert.ok(cards.length >= 6, `only ${cards.length} cards`);
  const byLabel = new Map();
  for (const block of cards) {
    const label = (block.match(/class="label">([^<]*)</) || [])[1];
    const stat = (block.match(/class="stat[^"]*"[^>]*>([^<]*)</) || [])[1];
    assert.ok(label && label.trim(), 'card without label');
    assert.ok(stat && stat.trim(), `card "${label}" without stat`);
    byLabel.set(label, {
      n: parseInt(stat.replace(/,/g, ''), 10),
      desc: (block.match(/<div style="font-size:8px;color:var\(--mut\)">([^<]*)</) || [])[1] || '',
    });
  }
  const lifted = byLabel.get('Blockers lifted');
  const blocked = byLabel.get('Still blocked');
  assert.ok(lifted, 'no Blockers lifted card');
  assert.ok(blocked, 'no Still blocked card');
  assert.equal(lifted.desc.split(' · ').length, lifted.n, 'blockers-lifted list vs count');
  assert.equal(blocked.desc.split(' · ').length, blocked.n, 'still-blocked list vs count');
});

check('index: recovery pipeline rows complete, statuses from the known set', () => {
  const rows = INDEX.match(/<tr class="rowlink"[^>]*>[\s\S]*?<\/tr>/g) || [];
  assert.ok(rows.length >= 5, `only ${rows.length} pipeline rows`);
  for (const row of rows) {
    assert.equal((row.match(/<td/g) || []).length, 4, 'pipeline row must have 4 cells');
    assert.ok(row.includes('status-dot'), 'pipeline row missing status dot');
    assert.ok(/(RECOVERED|IN REPO|PARTIAL|FROZEN|BLOCKED)</.test(row), 'pipeline row status unknown');
  }
});

check('index: timeline entries carry tag + strong + link', () => {
  const items = INDEX.match(/<a class="timeline-item"[\s\S]*?<\/a>/g) || [];
  assert.ok(items.length >= 5, `only ${items.length} timeline items`);
  for (const it of items) {
    assert.ok(/class="tag [a-z]+"/.test(it), 'timeline item missing tag');
    assert.ok(it.includes('<strong>'), 'timeline item missing strong');
  }
});

check('index: footer states the self-verifying convergence provenance', () => {
  assert.ok(INDEX.includes('Self-verifying convergence state'), 'provenance line');
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

check('map: every node complete (label/name/desc), classes from the four states', () => {
  const nodes = MAP.split('<div class="node ').slice(1);
  assert.ok(nodes.length >= 8, `only ${nodes.length} map nodes`);
  const classes = new Set(['primary', 'secondary', 'frozen', 'emerge']);
  for (const block of nodes) {
    const cls = block.slice(0, block.indexOf('"'));
    assert.ok(classes.has(cls), `map node class "${cls}" outside the four states`);
    for (const field of ['label', 'name', 'desc'])
      assert.ok((block.match(new RegExp(`class="${field}">([^<]*)<`)) || [])[1]?.trim(),
        `map node ${cls} has empty ${field}`);
  }
});

check('map: legend names the four states', () => {
  for (const state of ['● ACTIVE', '● EMERGING', '● NEW DOMAIN', '● FROZEN'])
    assert.ok(MAP.includes(state), `legend missing ${state}`);
});

check('map: the two flow verb chains are exactly the house law', () => {
  assert.ok(MAP.includes('ENTER → ADDRESS → STATE → TRANSFORM → PROJECT → ACT → MEASURE → RETURN'),
    'ENTER…RETURN chain');
  assert.ok(MAP.includes('RECOVER → CORRECT → CONVERGE → VALIDATE → SEAL'),
    'RECOVER…SEAL chain');
});

const fails = checks.filter(([, e]) => e);
for (const [name, e] of checks)
  if (e) console.error('  FAIL', name, '—', String(e.message).split('\n')[0]);
console.log((fails.length ? 'NEXUS SURFACE TEST FAIL' : 'NEXUS SURFACE TEST PASS')
  + ` · ${checks.length - fails.length}/${checks.length} checks`
  + ' · /nexus/ link integrity + snapshot self-consistency'
  + (fails.length ? ` · ${fails.length} failed` : ''));
process.exitCode = fails.length ? 1 : 0;