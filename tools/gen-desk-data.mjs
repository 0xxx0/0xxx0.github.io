#!/usr/bin/env node
// gen-desk-data — build desk/data.json for the FIELD DESK public surface.
//
// The desk is a real field route at /desk/. It shows what is genuinely PUBLIC
// in this repo: return receipts (returns/*.json), addressed routes (the
// manifest), and live open PRs (fetched client-side from the GitHub API).
// Local-only material (trophies, research, kanban) deliberately stays local.
//
// This writes desk/data.json. Run it whenever returns/ changes. Honest gap:
// it is not yet wired to run on push — see the desk receipt. That is the one
// remaining "designed but not running" line on this surface.
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const returnsDir = join(root, 'returns');

function newestNonMachineCommitFor(file) {
  return null; // filled by fi-mutation-contract / git; desk only needs the receipt date
}

const files = readdirSync(returnsDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => {
    const p = join(returnsDir, f);
    let d = {};
    try { d = JSON.parse(readFileSync(p, 'utf8')); } catch { d = {}; }
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
