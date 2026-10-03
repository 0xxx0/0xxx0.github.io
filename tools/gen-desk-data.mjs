#!/usr/bin/env node
// gen-desk-data — build desk/data.json for the FIELD DESK public surface.
//
// The desk is a real field route at /desk/. It shows what is genuinely PUBLIC
// in this repo: return receipts (returns/*.json), addressed routes (the
// manifest), and live GitHub state (all PRs + commits fetched client-side, which
// the desk uses to reconcile receipt snapshot states against reality).
// Local-only material (trophies, research, kanban) deliberately stays local.
//
// Each return also carries `refs` — the PR numbers and commit shas its text
// references — extracted here so the desk can cross-check them without
// re-reading every receipt in the browser. Refs the live window cannot resolve
// are left as-is by the desk (badge: snapshot); nothing is inferred.
//
// This writes desk/data.json. `.github/workflows/field-desk-refresh.yml` owns
// automatic regeneration when returns, the manifest, this generator, or the
// refresh workflow itself changes. The generated file does not retrigger that
// workflow, so the projection converges without a commit loop.
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const returnsDir = join(root, 'returns');

// PR / commit references found in a receipt's text. Same grammar the desk uses
// (mirrored in desk/index.html) so extraction and matching cannot drift.
const REF_PR = /#(\d{2,4})\b|\bpull\/(\d{2,4})\b|\bPR[ #]+(\d{2,4})\b/gi;
const REF_SHA = /\b[0-9a-f]{7,40}\b/g;
function extractRefs(text) {
  const prs = new Set(), commits = new Set();
  for (const m of String(text).matchAll(REF_PR)) prs.add(Number(m[1] || m[2] || m[3]));
  for (const m of String(text).matchAll(REF_SHA)) {
    const h = m[0];
    if (h.length >= 7 && /[a-f]/.test(h)) commits.add(h);
  }
  return { prs: [...prs].sort((a, b) => a - b), commits: [...commits] };
}

const files = readdirSync(returnsDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => {
    const p = join(returnsDir, f);
    let d = {}, text = '';
    try { text = readFileSync(p, 'utf8'); d = JSON.parse(text); } catch { d = {}; }
    return {
      file: f,
      id: d.id || basename(f, '.json'),
      date: d.date || '',
      object: String(d.object || '').slice(0, 160),
      state: d.state || '',
      next: String(d.next || '').slice(0, 200),
      measured: String((d.verification && d.verification.measured) || '').slice(0, 220),
      checks: d.verification && d.verification.checks
        ? Object.fromEntries(Object.entries(d.verification.checks).map(
            ([k, v]) => [k, (v && typeof v === 'object' ? v.conclusion : v) || '']))
        : {},
      laws: Array.isArray(d.laws) ? d.laws.slice(0, 4) : [],
      refs: extractRefs(text),
      mtime: statSync(p).mtime.toISOString(),
    };
  })
  .sort((a, b) => (a.date < b.date ? 1 : -1));

// Manifest routes: the addressed field the desk reads alongside returns.
let routes = [];
try {
  const m = JSON.parse(readFileSync(join(root, 'showcase-manifest.json'), 'utf8'));
  routes = (m.routes || []).map((r) => ({
    href: r.href,
    title: r.title || r.href,
    kind: r.kind || '',
    operation: r.operation || '',
    state: r.state || '',
    updated_at: (r.index && r.index.updated_at) || '',
  }));
} catch {}

const counts = {
  returns: files.length,
  routes: routes.length,
  states: files.reduce((a, r) => { const s = (r.state || 'UNKNOWN').toUpperCase(); a[s] = (a[s] || 0) + 1; return a; }, {}),
};

const out = {
  schema: 'field-desk/v1',
  generated: new Date().toISOString(),
  counts,
  returns: files.slice(0, 400),
  routes,
};

writeFileSync(join(root, 'desk', 'data.json'), JSON.stringify(out, null, 1));
console.log(`desk/data.json: ${files.length} returns, ${routes.length} routes, generated ${out.generated}`);