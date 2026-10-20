#!/usr/bin/env node
// ingest.mjs — JSONL inbox -> field-objects.jsonl, APPEND ONLY.
//
// Purpose: read captured lines (full records or bookmarklet payloads),
// validate + dedupe by id, append the new ones to the field store, and print
// the new marks that would appear on the plane.
// Deps: node stdlib + ./capture-core.mjs. No build, no third-party deps.
// Run:  node ingest.mjs [inbox.jsonl] [field-objects.jsonl]
//       (defaults: ./inbox.jsonl, ./field-objects.jsonl)
// Verify: node selftest.mjs
//
// Contract:
//   - a line with an "id" field is a minted record  -> validateRecord (id is
//     re-derived from sha256(url|ts); mismatch rejects with field=id);
//   - a line without "id" is a capture payload {url,title?,ts,quote?,html?,text?}
//     -> mint(input);
//   - a line that fails either path is REPORTED (REJECT line N field=...) and
//     left untouched in the inbox — never dropped silently;
//   - dedupe is by id, both against the store and within one batch;
//   - the store is only ever appended to: no rewrite, no truncate, no delete;
//     an unterminated final line gets exactly one '\n' appended before the
//     new records (existing bytes are never modified).
// Exit codes: 0 clean, 2 = some inbox lines rejected (reported), 1 = fatal.
// Stop conditions: never sort, merge, or rewrite field-objects.jsonl — the
// mark index is the line order and it is append-only.

import { existsSync, readFileSync, appendFileSync, realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { mint, validateRecord } from '../lib/capture-core.mjs';

function clip(s, n) {
  const t = String(s).split('\n').join(' ');
  return t.length > n ? t.slice(0, n - 1) + '\u2026' : t;
}

export function runIngest(inboxPath, storePath, log = console.log) {
  if (!existsSync(inboxPath)) throw new Error('inbox not found: ' + inboxPath);
  const res = { added: 0, dup: 0, rejected: [], storeTotal: 0, marks: [] };

  const storeText = existsSync(storePath) ? readFileSync(storePath, 'utf8') : '';
  const ids = new Set();
  let existingLines = 0;
  for (const raw of storeText.split('\n')) {
    const t = raw.trim();
    if (!t) continue;
    existingLines++;
    try {
      const o = JSON.parse(t);
      if (o && typeof o.id === 'string') ids.add(o.id);
    } catch { /* a malformed store line still occupies its line; do not crash */ }
  }
  const unterminated = storeText.length > 0 && !storeText.endsWith('\n');

  const inboxLines = readFileSync(inboxPath, 'utf8').split(/\r?\n/);
  const fresh = [];
  const seen = new Set();
  let lineNo = 0;
  for (const raw of inboxLines) {
    lineNo++;
    const t = raw.trim();
    if (!t) continue;
    let obj;
    try { obj = JSON.parse(t); }
    catch (e) {
      res.rejected.push({ line: lineNo, field: 'json', message: String(e.message || e).slice(0, 140) });
      continue;
    }
    let rec;
    try {
      rec = (obj && typeof obj === 'object' && typeof obj.id === 'string') ? validateRecord(obj) : mint(obj);
    } catch (e) {
      res.rejected.push({
        line: lineNo,
        field: (e && e.field) || 'input',
        message: String((e && e.message) || e).slice(0, 160)
      });
      continue;
    }
    if (ids.has(rec.id) || seen.has(rec.id)) { res.dup++; continue; }
    seen.add(rec.id);
    fresh.push(rec);
  }

  if (fresh.length) {
    let payload = fresh.map((r) => JSON.stringify(r)).join('\n') + '\n';
    if (unterminated) payload = '\n' + payload; // terminate the last line, touch no existing byte
    appendFileSync(storePath, payload);
  }

  res.added = fresh.length;
  res.storeTotal = existingLines + fresh.length;
  fresh.forEach((r, i) => res.marks.push({ n: existingLines + i + 1, record: r }));

  for (const m of res.marks) {
    const r = m.record;
    log('NEW mark #' + m.n + ' id=' + r.id + ' ts=' + r.ts + ' ' + r.url +
      ' title="' + clip(r.title, 60) + '"' +
      (r.quote ? ' quote="' + clip(r.quote.exact, 60) + '"' : '') +
      ' by=' + r.extractor + ' via=' + r.minted_by);
  }
  for (const rj of res.rejected) {
    log('REJECT line ' + rj.line + ' field=' + rj.field + ' ' + rj.message);
  }
  log('ingest: added=' + res.added + ' dup=' + res.dup + ' rejected=' + res.rejected.length +
    ' store=' + res.storeTotal + (res.added ? '' : ' (no new marks)'));
  return res;
}

const isMain = (() => {
  try { return import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href; } catch { return false; }
})();
if (isMain) {
  const inbox = resolve(process.argv[2] || 'inbox.jsonl');
  const store = resolve(process.argv[3] || 'field-objects.jsonl');
  try {
    const res = runIngest(inbox, store);
    process.exit(res.rejected.length ? 2 : 0);
  } catch (e) {
    console.error('ingest: ' + (e && e.message ? e.message : e));
    process.exit(1);
  }
}
