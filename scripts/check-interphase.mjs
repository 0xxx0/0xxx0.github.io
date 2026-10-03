#!/usr/bin/env node
/**
 * check-interphase.mjs — turn the INTERPHASE registry's own laws into a gate.
 *
 * The registry (control/INTERPHASE_CORRESPONDENCE_REGISTRY.json) is a hand-maintained
 * JSON file whose laws are asserted in prose. A file that is only asserted rots —
 * the FIELD INDEX contract already knows this, which is why check-route-registration.mjs
 * exists. This is the same idea for the correspondence layer.
 *
 * What it enforces (all sourced from the registry's own `law` and each host's fields):
 *   R1  exactly one registry object, parseable, with a schema and an `updated`
 *   R2  every host_id unique
 *   R3  every host declares the six canonical facets (SOURCE FRAME FOCUS OPERATE WITNESS RETURN)
 *   R4  every host declares a non-empty `residue`  (residue IS the design; a host without
 *       residue is either trivial or lying about what crosses)
 *   R5  every evidence[] path that looks like a repo path resolves on disk
 *   R6  a status claiming IMPLEMENTED_* must have at least one evidence file that exists
 *   R7  every evidence[] entry that is a route href (/foo/) must be registered in
 *       showcase-manifest.json routes[]
 *   R8  every host declares a legal `merge` algebra (one of five enumerated values)
 *   R9  a non-empty `commutes_claimed` must point at a `commutes_tested` file that resolves
 *   R10 every host declares a non-empty `owner` and `canonical_copy`
 *
 * Exit: 0 clean · 1 violations · 2 usage · 3 INDETERMINATE (registry/manifest unreadable)
 *
 * Usage:  node check-interphase.mjs [--root /Users/mcvoid/void-anchor] [--json]
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const argv = process.argv.slice(2);
const asJson = argv.includes('--json');
const rootArg = argv.indexOf('--root');
const ROOT = resolve(rootArg >= 0 ? argv[rootArg + 1] : process.cwd());

// Evidence paths in the registry are PUBLISHED-SURFACE paths (e.g. /lib/shopping-interphase.js).
// The artifacts they name live in the published repo; this working tree only mirrors some of it.
// Resolving against ROOT alone produced false R5 violations for every host whose adapter ships
// only in 0xxx0 — measured 2026-10-03: 4 false violations across SHOPPING and INTERPHASE_CARRIER,
// which would have trained everyone to ignore a red gate. Resolve ROOT first, then the surface.
const PUBLISHED = resolve(process.env.HOME || '/Users/mcvoid', 'Projects/0xxx0.github.io');

const REGISTRY = join(ROOT, 'control/INTERPHASE_CORRESPONDENCE_REGISTRY.json');
const MANIFEST = join(ROOT, 'showcase-manifest.json');

const FACETS = ['SOURCE', 'FRAME', 'FOCUS', 'OPERATE', 'WITNESS', 'RETURN'];
// CONTRACT LAW 11: "Six offices are one reusable mapping preset, not a required ontology."
// So the six are NOT a conformance rule. A host may declare other facets; that is reported
// as INFO, never failed. The first version of this gate enforced the six as law — which is
// the exact category error the contract forbids, and the same class as the SET defect.
// Runtime truth: lib/interphase-core.js declares 8 CHANNELS
// (identity, address, content, depth, time, authority, raster, evidence) and derives each
// projection's residue by set difference. The six offices are a preset over those channels.
const CHANNELS = ['identity', 'address', 'content', 'depth', 'time', 'authority', 'raster', 'evidence'];

function die(code, msg) {
  if (asJson) console.log(JSON.stringify({ status: 'INDETERMINATE', error: msg }, null, 1));
  else console.error(`INDETERMINATE — ${msg}`);
  process.exit(code);
}

if (!existsSync(REGISTRY)) die(3, `registry not found at ${REGISTRY}`);
if (!existsSync(MANIFEST)) die(3, `manifest not found at ${MANIFEST}`);

let reg, man;
try {
  reg = JSON.parse(readFileSync(REGISTRY, 'utf8'));
} catch (e) {
  die(3, `registry unparseable: ${e.message}`);
}
try {
  man = JSON.parse(readFileSync(MANIFEST, 'utf8'));
} catch (e) {
  die(3, `manifest unparseable: ${e.message}`);
}

const v = [];
const info = [];
const vpush = (rule, host, detail) => v.push({ rule, host, detail });
const ipush = (rule, host, detail) => info.push({ rule, host, detail });

// R1
if (!reg.schema) vpush('R1', '-', 'registry has no `schema` field');
if (!reg.updated) vpush('R1', '-', 'registry has no `updated` field');
if (!Array.isArray(reg.mappings)) die(3, 'registry has no `mappings` array');

const routes = new Set((man.routes || []).map((r) => r.href));
// A trailing slash means a ROUTE href (any depth: /, /docs/, /fold-bloom/lens/).
// Anything else is a FILE path. Getting this wrong made R5 false-positive on every
// multi-segment route — caught by control-test-interphase.py, not by reading it.
const hrefLike = (p) => p.endsWith('/');

// R2
const seen = new Set();
for (const m of reg.mappings) {
  const id = m.host_id || '(missing host_id)';
  if (seen.has(id)) vpush('R2', id, 'duplicate host_id');
  seen.add(id);
}

for (const m of reg.mappings) {
  const id = m.host_id || '(missing host_id)';
  const facets = m.facets || {};

  // R3 — facets must exist and be non-empty. The six offices are a PRESET, not a rule
  // (contract law 11), so anything outside them is INFO, not a violation.
  const facetKeys = Object.keys(facets);
  if (facetKeys.length === 0) vpush('R3', id, 'no facets declared at all');
  const outsidePreset = facetKeys.filter((f) => !FACETS.includes(f));
  if (outsidePreset.length) {
    ipush('I1', id, `facet(s) outside the six-office preset: ${outsidePreset.join(', ')} `
      + `— lawful (law 11); confirm each maps to a channel in ${CHANNELS.length}: ${CHANNELS.join('/')}`);
  }
  const missingPreset = FACETS.filter((f) => !(f in facets));
  if (missingPreset.length && facetKeys.length) {
    ipush('I2', id, `omits preset office(s): ${missingPreset.join(', ')} — lawful if declared as residue`);
  }

  // R4
  const residue = m.residue;
  if (!Array.isArray(residue) || residue.length === 0) {
    vpush('R4', id, 'no residue declared — residue is what does NOT cross; empty means trivial or dishonest');
  }

  const evidence = Array.isArray(m.evidence) ? m.evidence : [];
  let anyExists = false;

  for (const e of evidence) {
    if (typeof e !== 'string') continue;

    // R7 — route hrefs must be registered
    if (hrefLike(e)) {
      if (!routes.has(e)) vpush('R7', id, `route ${e} is not registered in showcase-manifest.json`);
      else anyExists = true;
      continue;
    }
    // R5 — repo paths must resolve, here or on the published surface
    if (e.startsWith('/')) {
      if (existsSync(join(ROOT, e)) || existsSync(join(PUBLISHED, e))) anyExists = true;
      else vpush('R5', id, `evidence path does not exist: ${e}`);
    }
  }

  // R6
  if (String(m.status || '').startsWith('IMPLEMENTED') && !anyExists) {
    vpush('R6', id, `status ${m.status} but no evidence entry resolves on disk`);
  }

  // R8 — the declared merge algebra must be one of the enumerated values. The registry is
  // where an algebra is ASSERTED; an unenumerated string is prose again, and prose rots.
  // Values are the five the correspondence research settled on (CORRESPONDENCE-ALGEBRA-2026-10-02).
  const MERGE = ['union', 'lww-with-single-writer', 'serialize-then-regenerate',
    'none-requires-coordination', 'append-only-gset'];
  if (!MERGE.includes(String(m.merge || ''))) {
    vpush('R8', id, `merge ${JSON.stringify(m.merge ?? null)} is not a declared algebra — one of: ${MERGE.join(' | ')}`);
  }

  // R9 — a commuting claim must point at a test that resolves. Measured 2026-10-03: 5 hosts
  // claim commutes and 5 carry a real test path. The rule exists so the NEXT claim cannot be
  // free — a control with no recorded failing case is a claim, not a control.
  const claimed = Array.isArray(m.commutes_claimed) ? m.commutes_claimed : [];
  if (claimed.length) {
    const t = typeof m.commutes_tested === 'string' ? m.commutes_tested : '';
    if (!t || !(existsSync(t) || existsSync(join(ROOT, t)) || existsSync(join(PUBLISHED, t)))) {
      vpush('R9', id, `claims ${claimed.length} commuting operation(s) but commutes_tested does not resolve: ${JSON.stringify(m.commutes_tested ?? null)}`);
    }
  }

  // R10 — every host names an owner and a canonical copy. An owned state space with no named
  // writer is exactly the drift this registry exists to prevent (measured 2026-10-03: the
  // registry itself was present in two checkouts and had diverged).
  if (!String(m.owner || '').trim()) vpush('R10', id, 'no owner declared');
  if (!String(m.canonical_copy || '').trim()) vpush('R10', id, 'no canonical_copy declared');
}

const report = {
  status: v.length ? 'VIOLATIONS' : 'CLEAN',
  registry: reg.schema,
  registry_updated: reg.updated,
  hosts: reg.mappings.length,
  rules: ['R1 registry shape', 'R2 unique host_id', 'R3 facets non-empty',
    'R4 non-empty residue', 'R5 evidence resolves', 'R6 IMPLEMENTED implies evidence',
    'R7 route evidence is registered',
    'R8 merge algebra is one of five enumerated values',
    'R9 commuting claim points at an existing test',
    'R10 owner and canonical_copy declared'],
  notes: ['I1 facets outside the six-office preset (lawful — law 11)', 'I2 preset offices omitted'],
  violations: v,
  info,
};

if (asJson) {
  console.log(JSON.stringify(report, null, 1));
} else {
  console.log(`registry ${reg.schema} · updated ${reg.updated} · hosts ${reg.mappings.length}`);
  console.log('');
  if (!v.length) {
    console.log('OK — every host declares facets and a residue, and every evidence path resolves.');
  } else {
    for (const x of v) console.log(`  ${x.rule}  ${x.host.padEnd(26)} ${x.detail}`);
    console.log('');
    console.log(`${v.length} violation(s).`);
  }
  if (info.length) {
    console.log('');
    for (const x of info) console.log(`  ${x.rule} (info)  ${x.host.padEnd(22)} ${x.detail}`);
  }
}
process.exit(v.length ? 1 : 0);