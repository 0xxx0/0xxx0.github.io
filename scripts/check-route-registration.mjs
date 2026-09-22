#!/usr/bin/env node
/**
 * check-route-registration.mjs — REGISTRATION GATE
 *
 * A page that exists but is not in showcase-manifest.json is invisible:
 * the FIELD INDEX feed renders the manifest, so an unregistered route never
 * appears in LATEST / REPO TOUCHES no matter how new it is.
 *
 * Two classes, deliberately treated differently:
 *
 *   LIVE orphans    — servable surfaces outside the frozen archive.
 *                     These are a FAILURE. A live page the index cannot see
 *                     is exactly the drift this gate exists to stop.
 *
 *   ARCHIVE orphans — pages under /recovery/. That directory is a frozen
 *                     donor vault: hashed, exact, and intentionally not
 *                     indexed as live routes. Reported for transparency,
 *                     never failed. Registering them would be noise.
 *
 * GHOSTS — a registered href with no file on disk (any extension) — fail.
 *
 * Exit 0 = no live orphans and no ghosts.
 * Exit 1 = drift found.
 *
 * Usage:  node scripts/check-route-registration.mjs [--json] [--all]
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', '.vscode']);
const ARCHIVE_PREFIX = '/recovery/';

const manifest = JSON.parse(readFileSync(join(ROOT, 'showcase-manifest.json'), 'utf8'));
const registered = new Set(
  manifest.routes.map((r) => (r.href === '/' ? '/' : r.href.replace(/\/$/, '')))
);

// every .html on disk
const pages = new Set();
function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) { walk(p); continue; }
    if (!name.endsWith('.html')) continue;
    const rel = '/' + relative(ROOT, p).split('\\').join('/');
    const route = name === 'index.html'
      ? (rel.replace(/index\.html$/, '').replace(/\/$/, '') || '/')
      : rel;
    pages.add(route);
  }
}
walk(ROOT);

const allOrphans = [...pages].filter((r) => !registered.has(r)).sort();
const liveOrphans = allOrphans.filter((r) => !r.startsWith(ARCHIVE_PREFIX));
const archiveOrphans = allOrphans.filter((r) => r.startsWith(ARCHIVE_PREFIX));

// ghosts: registered href resolves to nothing at all (any file type)
const isAsset = (h) => /\.(svg|png|jpe?g|webp|gif|json|md|txt|css|js|mjs|xml|pdf|ico)$/i.test(h);
const ghosts = [];
for (const href of registered) {
  if (href === '/') continue;
  const bare = href.replace(/^\//, '');
  const candidates = [bare, bare + '.html', join(bare, 'index.html')];
  if (isAsset(href)) candidates.length = 0, candidates.push(bare);
  if (!candidates.some((c) => existsSync(join(ROOT, c)))) ghosts.push(href);
}
ghosts.sort();

const payload = {
  pages: pages.size,
  registered: registered.size,
  live_orphans: liveOrphans,
  archive_orphans: archiveOrphans,
  ghosts,
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(liveOrphans.length || ghosts.length ? 1 : 0);
}

console.log('route registration check');
console.log('  servable pages on disk :', pages.size);
console.log('  registered in manifest :', registered.size);

if (process.argv.includes('--all') && archiveOrphans.length) {
  console.log(`\nARCHIVE pages not indexed (${archiveOrphans.length}) — expected, /recovery/ is a frozen vault:`);
  for (const a of archiveOrphans) console.log('  ·', a);
}

if (!liveOrphans.length && !ghosts.length) {
  console.log('\nOK — every live surface is registered, and every registered route resolves.');
  process.exit(0);
}

if (liveOrphans.length) {
  console.log(`\nFAIL — ${liveOrphans.length} live page(s) the index cannot see:`);
  for (const o of liveOrphans) console.log('  -', o);
  console.log('\n  A page outside /recovery/ must be registered or it is invisible.');
  console.log('  Add to showcase-manifest.json: href, title, kind, parent (required);');
  console.log('  operation, state, family, role, index.updated_at, index.work_modes, evidence.');
}

if (ghosts.length) {
  console.log(`\nFAIL — ${ghosts.length} registered route(s) with no file on disk:`);
  for (const g of ghosts) console.log('  -', g);
}

process.exit(1);