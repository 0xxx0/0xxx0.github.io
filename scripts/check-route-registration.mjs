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
 * Usage:  node scripts/check-route-registration.mjs [--json] [--all] [--ontology] [--ontology-all]
 *
 * --ontology is diagnostic only. It derives candidate host / family_id / verb_id
 * from the current manifest and reports ambiguity without mutating route identity
 * or changing the registration gate's exit status.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', '.vscode']);
const ARCHIVE_PREFIX = '/recovery/';

const manifest = JSON.parse(readFileSync(join(ROOT, 'showcase-manifest.json'), 'utf8'));
const routes = manifest.routes || [];
const normalizeHref = (href) => {
  const h = String(href || '').trim();
  if (!h) return null;
  if (h === '/') return '/';
  return h.replace(/\/+$/, '') || '/';
};
const normalizeId = (value) => {
  const s = String(value ?? '').trim().toLowerCase();
  if (!s) return null;
  return s.normalize('NFKD')
    .replace(/&/g, ' and ')
    .replace(/[/\\]+/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || null;
};
const splitOperation = (value) => String(value ?? '')
  .split(/\s*\/\s*/)
  .map((part) => part.trim())
  .filter(Boolean);

const registered = new Set(
  routes.map((r) => normalizeHref(r.href)).filter(Boolean)
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


function buildOntologyDiagnostics() {
  const routeByHref = new Map(
    routes.map((route) => [normalizeHref(route.href), route]).filter(([href]) => href)
  );

  const inferHost = (route) => {
    const href = normalizeHref(route.href);
    if (!href || href === '/') return { host: null, source: 'root' };

    if (route.parent != null && String(route.parent).trim() !== '') {
      return { host: normalizeHref(route.parent), source: 'explicit_parent' };
    }

    const candidates = [...routeByHref.keys()]
      .filter((candidate) => candidate && candidate !== '/' && candidate !== href && href.startsWith(candidate + '/'))
      .sort((a, b) => b.length - a.length);

    if (candidates.length) return { host: candidates[0], source: 'path_inferred' };
    return { host: '/', source: 'root_fallback' };
  };

  const familyLabelsById = new Map();
  const operationLabelsByVerb = new Map();

  const candidates = routes.map((route) => {
    const href = normalizeHref(route.href);
    const { host, source: host_source } = inferHost(route);
    const family_label = String(route.family ?? '').trim() || null;
    const family_id = normalizeId(family_label);
    const operation_label = String(route.operation ?? '').trim() || null;
    const verb_parts = splitOperation(operation_label).map(normalizeId).filter(Boolean);
    const verb_id = verb_parts[0] || normalizeId(operation_label);

    if (family_id) {
      if (!familyLabelsById.has(family_id)) familyLabelsById.set(family_id, new Set());
      familyLabelsById.get(family_id).add(family_label);
    }
    if (verb_id) {
      if (!operationLabelsByVerb.has(verb_id)) operationLabelsByVerb.set(verb_id, new Set());
      operationLabelsByVerb.get(verb_id).add(operation_label);
    }

    const flags = [];
    if (href !== '/' && !family_id) flags.push('FAMILYLESS');
    if (href !== '/' && !verb_id) flags.push('OPERATION_MISSING');
    if (verb_parts.length > 1) flags.push('COMPOSITE_OPERATION');
    if (href !== '/' && host === '/') flags.push('ROOT_PEER');
    if (host && !routeByHref.has(host)) flags.push('PARENT_MISSING');

    return {
      href,
      title: route.title || null,
      host,
      host_source,
      family_label,
      family_id,
      operation_label,
      verb_id,
      verb_parts,
      flags,
    };
  });

  const family_label_variants = [...familyLabelsById.entries()]
    .filter(([, labels]) => labels.size > 1)
    .map(([family_id, labels]) => ({ family_id, labels: [...labels].sort() }))
    .sort((a, b) => a.family_id.localeCompare(b.family_id));

  const verb_projection_groups = [...operationLabelsByVerb.entries()]
    .filter(([, labels]) => labels.size > 1)
    .map(([verb_id, labels]) => ({ verb_id, labels: [...labels].sort() }))
    .sort((a, b) => a.verb_id.localeCompare(b.verb_id));

  const count = (flag) => candidates.filter((row) => row.flags.includes(flag)).length;
  const flagged_routes = candidates.filter((row) => row.flags.length);

  return {
    schema: 'field-route-ontology-diagnostic/v0.1',
    authority: 'NONE',
    law: 'Derived lint only. Candidate IDs do not rewrite display language, establish sovereignty, create priority, or authorize route moves.',
    summary: {
      routes: candidates.length,
      root_peers: count('ROOT_PEER'),
      familyless: count('FAMILYLESS'),
      operation_missing: count('OPERATION_MISSING'),
      composite_operations: count('COMPOSITE_OPERATION'),
      parent_missing: count('PARENT_MISSING'),
      family_label_variant_groups: family_label_variants.length,
      verb_projection_groups: verb_projection_groups.length,
      flagged_routes: flagged_routes.length,
    },
    family_label_variants,
    verb_projection_groups,
    candidates,
  };
}

const payload = {
  pages: pages.size,
  registered: registered.size,
  live_orphans: liveOrphans,
  archive_orphans: archiveOrphans,
  ghosts,
};

if (process.argv.includes('--ontology')) payload.ontology = buildOntologyDiagnostics();

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(liveOrphans.length || ghosts.length ? 1 : 0);
}

console.log('route registration check');
console.log('  servable pages on disk :', pages.size);
console.log('  registered in manifest :', registered.size);

if (process.argv.includes('--ontology')) {
  const o = payload.ontology || buildOntologyDiagnostics();
  const q = o.summary;
  console.log('\nONTOLOGY DIAGNOSTIC — authority NONE; warnings do not fail CI');
  console.log('  routes                 :', q.routes);
  console.log('  root peers             :', q.root_peers);
  console.log('  familyless             :', q.familyless);
  console.log('  composite operations   :', q.composite_operations);
  console.log('  missing parents        :', q.parent_missing);
  console.log('  family label variants  :', q.family_label_variant_groups);
  console.log('  verb projection groups :', q.verb_projection_groups);
  if (o.family_label_variants.length) {
    console.log('\n  family label variants:');
    for (const g of o.family_label_variants) console.log('   ·', g.family_id, '←', g.labels.join(' | '));
  }
  if (process.argv.includes('--ontology-all')) {
    console.log('\n  flagged routes:');
    for (const row of o.candidates.filter((x) => x.flags.length)) {
      console.log('   ·', row.href, 'host=' + (row.host ?? '—'), 'family=' + (row.family_id ?? '—'), 'verb=' + (row.verb_id ?? '—'), '[' + row.flags.join(',') + ']');
    }
  } else {
    console.log('  use --ontology-all for flagged rows or --json --ontology for the full derived map.');
  }
}

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