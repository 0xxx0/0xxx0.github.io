#!/usr/bin/env node
// check-release-versions.mjs — FIELD INDEX version-coherence gate.
//
// WHY THIS EXISTS
//   House law: "One fact, one authoritative home." The version of a route lives in
//   that route's own release receipt (`<route>/release.json`, `<stem>.release.json`,
//   or the receipt the manifest already declares). showcase-manifest.json is a
//   PROJECTION of public surfaces; when it restates a version BY HAND the two
//   diverge silently and the FIELD INDEX reports a version no release ever made.
//
//   Measured 2026-10-02: 4 registered routes carried a release receipt that declared
//   a version the manifest simply omitted (/contact/next/ 0.1-live-preview,
//   /forward-field-proof/ 1.0, /foundry/ 0.3, /foundry/convergence/identity-lab.html
//   CAP-IR 0.1). Seven more carried a manifest version that DISAGREED with the
//   receipt (/house/, /laconic/, /sleeper/, /sleeper/one-return/,
//   /recovery/sleeper/one-return-recon-0.2/, /fold-bloom/live/, /foundry/aperture/).
//   "No version" also meant two different things — "not tracked" and "nothing to
//   track" — so the genuinely versionless routes now say so with `versionless: true`.
//
// WHAT IT CHECKS (independent of whoever wrote the manifest — it re-derives from
// the release receipt on disk, never trusting the manifest's own claim)
//   * every manifest route declares a non-null `state`                    [BLOCKING]
//   * a route whose release receipt declares a `version` MUST carry that
//     exact version in the manifest (omission = the projection is missing) [BLOCKING]
//   * a route whose manifest version DISAGREES with its receipt FAILS
//     unless the exact (route, manifest_version, release_version) triple is
//     named in scripts/release-version-allow.json WITH a reason          [BLOCKING]
//   * an allow entry that matches no live pair is REPORTED (rot is visible,
//     but resolving a known drift never turns the gate red)               [REPORT]
//
// The allowlist is the integrity-audit rule-7 pattern: known disagreements are
// accepted BY NAME while anything new fails. It is not a mute button — an entry
// only suppresses the exact triple it records; change any side and the gate is red.
//
// Note: this is a pure re-derivation, not a generated-surface diff. There is no
// committed artefact and therefore no embedded timestamp to make `--check` drift
// (the rnd-graph.py `_stable()` trap does not apply here by construction).
//
// USAGE
//   node scripts/check-release-versions.mjs            # human report; exit 1 on BLOCKING
//   node scripts/check-release-versions.mjs --json      # machine report
//
// Deps: node >= 18, no packages, no build step (house law).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = path.join(ROOT, 'showcase-manifest.json');
const ALLOWLIST = path.join(ROOT, 'scripts', 'release-version-allow.json');
const JSON_OUT = process.argv.includes('--json');

function readJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

// Resolve the route's release receipt. The manifest already declares its own
// structure, so trust a declared receipt pointer FIRST; fall back to the two
// conventional locations only when nothing is declared.
function releaseFileFor(route) {
  for (const k of ['receipt', 'contract', 'machine_state']) {
    const v = route[k];
    if (typeof v === 'string' && /(^|\/)(release\.json|[^/]+\.release\.json)$/.test(v)) {
      const rel = v.replace(/^\//, '');
      if (fs.existsSync(path.join(ROOT, rel))) return rel;
    }
  }
  const href = String(route.href || '');
  const d = href.replace(/^\//, '').replace(/\/$/, '');
  if (!d) return null;
  const cands = [];
  if (d.endsWith('.html')) cands.push(d.slice(0, -5) + '.release.json');
  cands.push(d + '/release.json');
  for (const c of cands) if (fs.existsSync(path.join(ROOT, c))) return c;
  return null;
}

const manifest = readJSON(MANIFEST);
if (!manifest) {
  console.error('release-version gate: showcase-manifest.json is unreadable — refusing.');
  process.exit(2);
}
const allow = readJSON(ALLOWLIST) || { entries: [] };
const allowKeys = new Set();
for (const e of allow.entries || []) {
  if (e && e.route && e.manifest_version !== undefined && e.release_version !== undefined) {
    allowKeys.add(`${e.route}|${e.manifest_version}|${e.release_version}`);
  }
}

const blocking = [];   // exit 1
const known = [];      // accepted by name
const report = [];     // visible, never blocks
const matchedAllow = new Set();

for (const r of manifest.routes || []) {
  const href = r.href || '(no href)';

  if (r.state === undefined || r.state === null || String(r.state).trim() === '') {
    blocking.push(`missing state: ${href}`);
  }

  const relFile = releaseFileFor(r);
  let relVer = null;
  if (relFile) {
    const rel = readJSON(path.join(ROOT, relFile));
    if (rel && typeof rel.version === 'string' && rel.version.trim() !== '') relVer = rel.version.trim();
  }
  if (relVer === null) continue; // no receipt version → nothing to track

  const raw = r.version;
  const mVer = (raw === undefined || raw === null || String(raw).trim() === '') ? null : String(raw).trim();

  if (mVer === null) {
    blocking.push(`version omitted — ${relFile} declares "${relVer}": ${href}`);
    continue;
  }
  if (mVer !== relVer) {
    const key = `${href}|${mVer}|${relVer}`;
    if (allowKeys.has(key)) {
      matchedAllow.add(key);
      known.push(`accepted by name — manifest "${mVer}" vs ${relFile} "${relVer}": ${href}`);
    } else {
      blocking.push(`version disagrees with receipt — manifest "${mVer}" vs ${relFile} "${relVer}": ${href}`);
    }
  }
}

for (const e of allow.entries || []) {
  const key = `${e.route}|${e.manifest_version}|${e.release_version}`;
  if (!matchedAllow.has(key)) {
    report.push(`allow entry matches no live pair (remove it or reconcile): ${e.route} ` +
                `[${e.manifest_version} vs ${e.release_version}]`);
  }
}

const out = {
  schema: '0xxx0/release-version-check/v0.1',
  routeCount: (manifest.routes || []).length,
  blockingCount: blocking.length,
  knownCount: known.length,
  reportCount: report.length,
  blocking, known, report,
};

if (JSON_OUT) {
  console.log(JSON.stringify(out, null, 2));
} else {
  console.log('release-version gate — showcase-manifest ↔ release receipts');
  for (const m of blocking) console.log('  !! BLOCKING ' + m);
  for (const m of known) console.log('  ·  known    ' + m);
  for (const m of report) console.log('  !  report   ' + m);
  console.log(`  ${out.routeCount} routes · ${blocking.length} BLOCKING · ` +
              `${known.length} known · ${report.length} report`);
  console.log(blocking.length
    ? 'RELEASE-VERSION GATE: FAIL — the manifest restates a version its release receipt does not.'
    : 'RELEASE-VERSION GATE: PASS');
}
process.exit(blocking.length ? 1 : 0);
