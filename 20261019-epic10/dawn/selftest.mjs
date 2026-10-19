#!/usr/bin/env node
/* DAWN CHORUS selftest — node >= 18, zero dependencies.  Run: node selftest.mjs
   Scores the wake-brief renderer against the brief's own laws:
     - every sample event lands in exactly one of the three buckets
     - spoken script is 100-150 words, plain speech
     - classification deterministic across runs (and input order)
     - house law: static files only, no randomness, no network
   Negative source scans cover index.html + dawn.core.js only — this file
   necessarily contains the forbidden tokens as literals. */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const files = {
  html: path.join(dir, 'index.html'),
  core: path.join(dir, 'dawn.core.js'),
  self: path.join(dir, 'selftest.mjs')
};

const results = [];
function check(name, fn) {
  try {
    const note = fn();
    results.push({ ok: true, name, note: note || '' });
  } catch (err) {
    results.push({ ok: false, name, note: String((err && err.message) || err) });
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const html = readFileSync(files.html, 'utf8');
const coreSrc = readFileSync(files.core, 'utf8');

/* ---- load modes: classic script (browser condition) + CommonJS branch ---- */
function loadClassic() {
  const sandbox = vm.createContext({});
  vm.runInContext(coreSrc, sandbox, { filename: 'dawn.core.js' });
  return sandbox;
}
function loadCommonJS() {
  const sandbox = vm.createContext({ module: { exports: {} } });
  sandbox.exports = sandbox.module.exports;
  vm.runInContext(coreSrc, sandbox, { filename: 'dawn.core.js' });
  return sandbox;
}

/* sample log: inline JSON array inside index.html */
const jsonMatch = /<script\b[^>]*id="sample-events"[^>]*>([\s\S]*?)<\/script>/.exec(html);
assert(jsonMatch, 'sample-events block missing from index.html');
const events = JSON.parse(jsonMatch[1].trim());

/* the documented rule, transcribed here independently of dawn.core.js */
const STALL_HOURS = 6;
function independentBucket(e) {
  if (e.needs_human === true) return 'needs';
  if (e.status === 'stalled') return 'stalled';
  if (Number(e.stalled_hours) >= STALL_HOURS) return 'stalled';
  if (e.status === 'failed') return 'needs';
  return 'changed';
}

check('files + syntax', () => {
  readFileSync(files.self, 'utf8');
  new vm.Script(coreSrc, { filename: 'dawn.core.js' });
  const inlineBlocks = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter((m) => !/\bsrc\s*=/.test(m[1]) && !/application\/json/.test(m[1]))
    .map((m) => m[2]);
  assert(inlineBlocks.length >= 1, 'no inline render script found');
  inlineBlocks.forEach((src, i) => new vm.Script(src, { filename: `inline#${i}` }));
  return `index.html + dawn.core.js + selftest.mjs; ${inlineBlocks.length} inline script(s) compile`;
});

check('sample log parsed', () => {
  assert(events.length >= 12 && events.length <= 20, `want ~15 events, got ${events.length}`);
  const ids = new Set(events.map((e) => e.id));
  assert(ids.size === events.length, 'event ids not unique');
  events.forEach((e) => {
    ['id', 'ts', 'lane', 'verb', 'object', 'status', 'extra', 'say'].forEach((k) => {
      assert(typeof e[k] === 'string' && e[k].length > 0, `${e.id || '?'} missing field ${k}`);
    });
    assert(typeof e.needs_human === 'boolean', `${e.id} needs_human not boolean`);
    assert(typeof e.stalled_hours === 'number', `${e.id} stalled_hours not number`);
    assert(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/.test(e.ts), `${e.id} bad ts`);
  });
  assert(events.some((e) => e.object.includes('.github.io/')), 'no shipped-surface URL');
  assert(events.some((e) => /^[0-9a-f]{8} /.test(e.object)), 'no sha+title commit');
  return `${events.length} events, ids unique, fields complete`;
});

check('load modes', () => {
  const classic = loadClassic();
  const classicKeys = Object.keys(classic);
  assert(classicKeys.length === 1 && classicKeys[0] === 'DawnCore',
    `classic script leaked globals: ${classicKeys.join(',')}`);
  const api = classic.DawnCore;
  assert(api && typeof api.buildBrief === 'function' && typeof api.bucketOf === 'function',
    'DawnCore API missing');
  assert(Object.isFrozen(api), 'DawnCore namespace not frozen');
  const cjs = loadCommonJS();
  assert(cjs.DawnCore === undefined, 'CommonJS branch also leaked a global');
  const cjsApi = cjs.module.exports;
  assert(cjsApi && typeof cjsApi.buildBrief === 'function', 'CommonJS exports missing');
  assert(JSON.stringify(cjsApi.buildBrief(events)) === JSON.stringify(api.buildBrief(events)),
    'classic and CommonJS loads disagree');
  return 'classic leaks exactly 1 global (DawnCore, frozen); CommonJS branch parity';
});

check('exactly one bucket per event', () => {
  const core = loadClassic().DawnCore;
  const brief = core.buildBrief(events);
  assert(brief.rows.length === events.length, 'row count mismatch');
  const seen = new Map();
  Object.keys(brief.buckets).forEach((b) => {
    brief.buckets[b].forEach((row) => {
      seen.set(row.id, (seen.get(row.id) || 0) + 1);
    });
  });
  events.forEach((e) => {
    assert(seen.get(e.id) === 1, `${e.id} appears ${seen.get(e.id) || 0} times in buckets`);
    assert(core.bucketOf(e) === independentBucket(e),
      `${e.id}: core=${core.bucketOf(e)} rule=${independentBucket(e)}`);
    assert(seen.get(e.id) !== undefined, `${e.id} not classified`);
  });
  const c = brief.counts;
  assert(c.changed + c.needs + c.stalled === c.total, 'bucket counts do not sum to total');
  assert(c.changed > 0 && c.needs > 0 && c.stalled > 0, 'a bucket is empty');
  assert(brief.delta === c.changed - c.stalled, 'delta != changed - stalled');
  return `${c.total} events → changed ${c.changed}, needs ${c.needs}, stalled ${c.stalled}; disjoint + complete`;
});

check('deterministic across runs', () => {
  const a = loadClassic().DawnCore.buildBrief(events);
  const b = loadClassic().DawnCore.buildBrief(events);
  assert(JSON.stringify(a) === JSON.stringify(b), 'two fresh builds differ');
  const core = loadClassic().DawnCore;
  const mapOf = (rows) => Object.fromEntries(rows.map((r) => [r.id, r.bucket]));
  const forward = mapOf(a.rows);
  const reversed = mapOf(core.buildBrief(events.slice().reverse()).rows);
  events.forEach((e) => {
    assert(forward[e.id] === reversed[e.id],
      `${e.id}: ${forward[e.id]} vs reordered ${reversed[e.id]}`);
  });
  assert(a.spoken === b.spoken, 'spoken script differs between runs');
  return 'two builds byte-identical; reversed input → same id→bucket map';
});

check('event line format', () => {
  const core = loadClassic().DawnCore;
  const rows = core.buildBrief(events).rows;
  rows.forEach((r) => {
    assert(/^\d{2}:\d{2} · \S+ · \S+ · \S/.test(r.line), `bad line: ${r.line}`);
    assert(r.stamp === r.ts || r.stamp === String(events[r.index].ts).slice(11, 16),
      `stamp not from ts: ${r.line}`);
  });
  return `${rows.length}/${rows.length} lines match 'timestamp · lane · verb · object'`;
});

check('spoken script 100-150 words', () => {
  const core = loadClassic().DawnCore;
  const brief = core.buildBrief(events);
  const spoken = brief.spoken.trim();
  const words = spoken.split(/\s+/).length;
  assert(words >= 100 && words <= 150, `word count ${words} outside 100-150`);
  assert(brief.words === words, `core.wordCount ${brief.words} != recount ${words}`);
  assert(spoken.endsWith('.'), 'spoken script does not end with a full stop');
  assert(spoken !== spoken.toUpperCase(), 'spoken script is shouted');
  const jargon = /\b(sha|commit|commits|cron|bucket|json|https?|api|repo|deploy|pipeline|pull request)\b/i;
  const hit = jargon.exec(spoken);
  assert(!hit, `jargon word in spoken script: ${hit && hit[0]}`);
  return `${words} words, no jargon tokens`;
});

check('house law (static files)', () => {
  const src = html + '\n' + coreSrc;
  const forbidden = {
    'Math.random': 'randomness',
    'fetch(': 'network fetch',
    'XMLHttpRequest': 'network fetch',
    '://': 'external URL',
    'node_modules': 'dependency'
  };
  Object.keys(forbidden).forEach((token) => {
    assert(!src.includes(token), `${forbidden[token]}: found "${token}"`);
  });
  ['width=device-width', 'rgb(8,12,18)', 'rgb(79,87,96)', 'prefers-reduced-motion', 'monospace']
    .forEach((token) => assert(html.includes(token), `index.html missing ${token}`));
  assert(!/\brequire\s*\(/.test(coreSrc), 'dawn.core.js requires something');
  assert(!/^\s*import\s/m.test(coreSrc), 'dawn.core.js uses ES imports');
  return 'no randomness, no fetch, no URLs, system fonts, pad/ink, reduced-motion block';
});

const passed = results.filter((r) => r.ok).length;
console.log('DAWN CHORUS selftest — wake-brief renderer');
console.log('lane: ' + dir);
results.forEach((r) => {
  console.log((r.ok ? 'PASS ' : 'FAIL ') + r.name + (r.note ? ' — ' + r.note : ''));
});
console.log('RESULT: ' + (passed === results.length ? 'PASS' : 'FAIL') + ' ' + passed + '/' + results.length);
process.exitCode = passed === results.length ? 0 : 1;
