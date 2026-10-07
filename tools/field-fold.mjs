#!/usr/bin/env node
// tools/field-fold.mjs — the FIELD FOLD: collapse the fraying free-text return states
// onto the canonical ternary enum (太玄經: ⚊ SOURCE / 𝌀 HOLD / ⚋ RETURN) + a verified flag.
//
// Why: 285 returns carried 50+ distinct `state` values — compound mush (MERGED_ACTIVE_CANDIDATE),
// separators (CANDIDATE / CI_REQUIRED), 49 with no state, one literal sentence. That is the
// "fraying blooming exploding" the operator named. Two real axes were mashed together:
//   (1) did it land on master?   (2) is it verified?
// The fold recovers those two axes into a controlled vocabulary so every surface can project
// one state without hand-reading a sentence. Representation as mechanism, not decoration.
//
// 2026-10-07 SEMANTIC REVISION (receipt: returns/RETURN_FIELD_FOLD_SEMANTICS_2026-10-07.json).
// The first fold made three claims its input does not support; the fold no longer makes them:
//   1. UNRECORDED ≠ SOURCE. An empty `state` field asserts nothing; folding it to ⚊ SOURCE
//      with "no state recorded" claimed not-landed from silence. Empty now folds to ⧗ RESIDUE
//      kind `unrecorded` — phase UNDETERMINED, listed for human disposition, counted in
//      `unrecorded_count`. Absence is not evidence of not-landed.
//   2. ACTIVE is not verification evidence. The verified-marker regex no longer matches
//      ACTIVE (a liveness marker). Only actual check evidence — CI_GREEN / MACHINE_GREEN /
//      BROWSER_PROV / VERIFIED / PASS / SELF_VERIFY / GREEN — sets the flag.
//   3. The fold's own receipts are not independent evidence of the fold. Rows whose receipt
//      declares `object_ref: tools/field-fold.mjs` are marked `self_reference: true` and
//      excluded from `verified_flagged_independent`.
// And the staleness class is mechanized (RECEIPT SYNC below): fold receipts restate counts
// that this map regenerates on every returns push (workflow field-desk-refresh), so every
// hand-typed count beside it is stale by construction. Each run now compares every fold
// receipt's restated counts against the live map and records the verdict IN the map;
// a receipt that restates counts must declare `counts_as_of`, and `--check-receipts`
// exits non-zero when one does not — the drift is flagged by the mechanism, not by hand.
//
// Verdict line + exit code = the verdict. Residue (states that don't fold) is flagged for human
// disposition, never silently coerced. House rule: a law designed but not enforced costs twice —
// this gate makes the fold executable.
//
// Usage: node tools/field-fold.mjs [--json] [--write] [--check-receipts]

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RETURNS = join(ROOT, 'returns');
const OUT = join(ROOT, 'returns', 'FIELD_FOLD_MAP.json');
const MANIFEST = join(ROOT, 'showcase-manifest.json');
const SELF = 'tools/field-fold.mjs';

// Canonical enum — the ternary phase + verified flag.
// phase: SOURCE (⚊ not landed) | HOLD (𝌀 candidate, in flight) | RETURN (⚋ landed) | RESIDUE (⧗ unclassified)
const PHASE_GLYPH = { SOURCE: '⚊', HOLD: '𝌀', RETURN: '⚋', RESIDUE: '⧗' };

// Verified markers — confidence that a landed/candidate object actually checks out.
// ACTIVE was removed here on 2026-10-07: "active" is a liveness marker, not a check result,
// and it flagged 26 ACTIVE-marked rows verified on nothing. Machine/check evidence only.
const VERIFIED = /(CI_GREEN|MACHINE_GREEN|BROWSER[_ ]?PROV|VERIFIED|\bPASS\b|SELF_VERIFY|GREEN)/;

function classify(raw) {
  const s = (raw ?? '').toString().trim();
  // No state recorded. Silence does not establish not-landed — it establishes nothing.
  // Fold to RESIDUE (unclassified) kind `unrecorded`, never to SOURCE.
  if (!s) return { phase: 'RESIDUE', verified: false, raw: s, residue_kind: 'unrecorded',
    why: 'no state recorded — UNDETERMINED (absence is not evidence of not-landed)' };

  const u = s.toUpperCase();

  // A free sentence is not a state — flag it as residue, never coerce.
  if (u.length > 48 && /\s/.test(u) && !/[_/]/.test(u)) {
    return { phase: 'RESIDUE', verified: false, raw: s, residue_kind: 'fraying', why: 'free-text sentence, not a state token' };
  }

  const verified = VERIFIED.test(u);

  // Precedence: landed-on-master is the load-bearing fact and dominates any trailing
  // _CANDIDATE noise. Then bare candidate (in flight). Then nothing.
  // Landed = reached a settled/complete/aligned end-state on master.
  if (/(MERGED|SHIPPED|RETURNED|LANDED|TERMINAL|CONVERGED|COMPLETE|DONE|ALIGNED|SOVEREIGN|IMMERSION|SOURCE_MAP|RECOVERED|CLOSED|SEAM|CHAIN|STANDALONE|TRACE_RUN|ARTIFACT|BOUNDED|RECONCILED|SAFE_DELTA|EXECUTABLE|CAPABILITY|INITIATED|PRESERVED|SHIPPABLE)/.test(u)) {
    return { phase: 'RETURN', verified, raw: s, why: 'landed (settled/complete/aligned end-state)' };
  }
  // In flight = candidate, pending, staged, or advancing toward a gate.
  if (/CANDIDATE|PENDING|DRAFT|READY|PR[_ ]?\d|IMPLEMENTED|STAGED|BRANCH|OPEN|REQUIRED|ADVANCED|EXPORT|GATE|PROGRESS|IN_FLIGHT|SOCIAL|ARCHITECTURAL|FROZEN|DONOR|PARKED/.test(u)) {
    return { phase: 'HOLD', verified, raw: s, why: 'candidate / in flight, not landed' };
  }
  if (/ACTIVE|VERIFIED|PROOF|GREEN|PASS|CURRENT_HOST/.test(u)) {
    return { phase: 'RETURN', verified, raw: s,
      why: 'active/proof/green/pass token — landed-and-live claim (a liveness marker alone is not verification evidence)' };
  }
  return { phase: 'RESIDUE', verified, raw: s, residue_kind: 'fraying', why: 'no fold rule matched — needs human disposition' };
}

function run() {
  const files = readdirSync(RETURNS).filter((f) => f.endsWith('.json') && f !== 'FIELD_FOLD_MAP.json');
  const folded = [];
  const dist = { SOURCE: 0, HOLD: 0, RETURN: 0, RESIDUE: 0 };
  const raw = new Map();

  for (const f of files) {
    let d;
    try { d = JSON.parse(readFileSync(join(RETURNS, f), 'utf8')); }
    catch { d = {}; }
    const rawState = d.state ?? d.status ?? '';
    const c = classify(rawState);
    dist[c.phase]++;
    const key = rawState === '' ? '(none)' : String(rawState);
    raw.set(key, (raw.get(key) || 0) + 1);
    const row = { file: f, raw: rawState, phase: c.phase, verified: c.verified, why: c.why };
    if (c.residue_kind) row.residue_kind = c.residue_kind;
    // A receipt that attests THIS TOOL's results cannot also be independent evidence of it.
    if (d && typeof d === 'object' && d.object_ref === SELF) row.self_reference = true;
    folded.push(row);
  }

  const total = files.length;
  const rawDistinct = raw.size;
  const residue = dist.RESIDUE;

  const report = {
    schema: 'field-fold/v2',
    generated: new Date().toISOString(),
    returns_total: total,
    raw_distinct_states: rawDistinct,
    folded_onto_enum: 4, // SOURCE · HOLD · RETURN · RESIDUE
    convergence_ratio: rawDistinct ? +(4 / rawDistinct).toFixed(3) : 0,
    phase_distribution: dist,
    residue_count: residue,
    // residue is split so the gate measures vocabulary fraying only: `unrecorded` rows are
    // missing data (owned, listed), not vocabulary that failed to fold.
    unrecorded_count: folded.filter((x) => x.residue_kind === 'unrecorded').length,
    fraying_count: folded.filter((x) => x.residue_kind === 'fraying').length,
    residue_files: folded.filter((x) => x.phase === 'RESIDUE').map((x) => ({ file: x.file, raw: x.raw, why: x.why, kind: x.residue_kind })),
    self_reference_files: folded.filter((x) => x.self_reference).map((x) => x.file),
    verified_flagged: folded.filter((x) => x.verified).length,
    verified_flagged_independent: folded.filter((x) => x.verified && !x.self_reference).length,
    raw_state_histogram: [...raw.entries()].sort((a, b) => b[1] - a[1]).map(([state, count]) => ({ state, count })),
    folded,
  };

  return { report, files };
}

// ---- RECEIPT SYNC: mechanize the receipt-staleness class ----
// Fold receipts restate counts (phase_distribution, verified_flagged, fold_result lines)
// that FIELD_FOLD_MAP.json regenerates on every returns push. Hand-typed counts beside a
// regenerating source are stale by construction — the fix is not to re-type them each lap
// but to make the comparison generated: every run checks each fold receipt's claims against
// the live map and writes the verdict into the map itself. A receipt that restates counts
// must declare `counts_as_of` (an honest historical snapshot); one that does not is the
// misreading class — flagged here, and fatal under `--check-receipts`.
function receiptSync(report, files) {
  const receipts = [];
  for (const f of files) {
    if (!/^RETURN_FIELD_FOLD.*\.json$/.test(f)) continue;
    let d;
    try { d = JSON.parse(readFileSync(join(RETURNS, f), 'utf8')); } catch { continue; }
    if (!d || typeof d !== 'object' || d.object_ref !== SELF) continue;
    const ev = (d.evidence && typeof d.evidence === 'object') ? d.evidence : {};
    const claims = {};
    const mismatches = [];
    if (ev.phase_distribution && typeof ev.phase_distribution === 'object') {
      claims.phase_distribution = ev.phase_distribution;
      for (const k of new Set([...Object.keys(ev.phase_distribution), ...Object.keys(report.phase_distribution)])) {
        const a = ev.phase_distribution[k] ?? 0;
        const b = report.phase_distribution[k] ?? 0;
        if (a !== b) mismatches.push(`phase_distribution.${k}: receipt ${a} vs map ${b}`);
      }
    }
    if (typeof ev.verified_flagged === 'number') {
      claims.verified_flagged = ev.verified_flagged;
      if (ev.verified_flagged !== report.verified_flagged) {
        mismatches.push(`verified_flagged: receipt ${ev.verified_flagged} vs map ${report.verified_flagged}`);
      }
    }
    const restates = Object.keys(claims).length > 0 || /\d/.test(String(ev.fold_result ?? ''));
    const hasAsOf = typeof d.counts_as_of === 'string' || typeof ev.counts_as_of === 'string';
    let verdict;
    if (!restates) verdict = 'NO RESTATED COUNTS — counts cited by path, cannot go stale';
    else if (hasAsOf) verdict = 'AS-OF — historical snapshot by declaration (counts_as_of); live counts: this map';
    else verdict = 'STALE — restates counts with no counts_as_of declaration (the misreading class)';
    receipts.push({
      file: f,
      restates_counts: restates,
      counts_as_of_declared: hasAsOf,
      claims,
      mismatches,
      needs_counts_as_of: (!restates || hasAsOf) ? false : true,
      verdict,
    });
  }
  return {
    source: 'live counts: returns/FIELD_FOLD_MAP.json (this map, regenerated by tools/field-fold.mjs on every returns push via .github/workflows/field-desk-refresh)',
    receipts,
  };
}

// ---- ROUTE FOLD: the field index's own vocabulary (showcase-manifest routes) ----
// Route `state` (10 semantic values) folds onto the SAME ternary. `operation` is each route's
// genuine function — measured as debt, NOT force-folded (folding it would destroy meaning + break
// the desk tooling). Reading the manifest only; never rewriting it (collision surface).
const ROUTE_STATE_PHASE = {
  ACTIVE: 'RETURN', STABLE: 'RETURN', UTILITY: 'RETURN', REFERENCE: 'RETURN', // ⚋ live & usable
  CANDIDATE: 'HOLD', PROOF_REQUIRED: 'HOLD', RECOVER: 'HOLD', // ⚆ in flight / being recovered
  DONOR: 'SOURCE', FROZEN_DONOR: 'SOURCE', PARKED: 'SOURCE', // ⚊ held as donor/source material
};
function runRoutes() {
  let manifest;
  try { manifest = JSON.parse(readFileSync(MANIFEST, 'utf8')); }
  catch { return { error: 'showcase-manifest.json unreadable' }; }
  const routes = manifest.routes ?? [];
  const dist = { SOURCE: 0, HOLD: 0, RETURN: 0, RESIDUE: 0 };
  const residue = [];
  const ops = new Map();
  for (const r of routes) {
    const st = (r.state ?? '').toString().trim();
    const phase = ROUTE_STATE_PHASE[st] ?? 'RESIDUE';
    dist[phase]++;
    if (phase === 'RESIDUE') residue.push({ route: r.route, state: st });
    const op = (r.operation ?? '').toString().trim();
    if (op) ops.set(op, (ops.get(op) ?? 0) + 1);
  }
  const compoundOps = [...ops.keys()].filter((o) => o.includes('/'));
  // Proposed operation taxonomy (unfolded from the real verbs) — a CONCRETE PROPOSAL for the
  // operator to ratify/adjust, applied here as a read-only lens (never rewrites the manifest).
  // Compounds collapse to their primary verb first ('REPLAY / MESSAGE / SHARE' → REPLAY).
  const OP_CLASS_RULES = [
    ['RECOVER', /ADDRESS|RECOVER|RETRIEV|ACQUIRE|PRESERV|SCAN|LOAD|FETCH|RESTORE|REIFY|RETURN/],
    ['WAYFIND', /ORIENT|ROUTE|ENTER|TRAVERS|REDIRECT|RIDE|PATH|NAVIGAT|FEDERATE/],
    ['MAKE', /PROJECT|COMPOS|SHAPE|RESHAPE|WEAV|DRAFT|DESIGN|BUILD|NAME|ENCOD|RENDER|CANONIC|REPRESENT|REMEMBER|PRINT|COMPILE|SOLVE|WORK|PLAN|TRANSFORM|DRAW/],
    ['PLAY', /PLAY|EXPERIMENT|TRAIN|BREED|MUTAT|MODULAT|REPLAY|EXPLORE|INHABIT/],
    ['OPERATE', /OPERATE|SERVE|TRANSACT|HOST|TRANSFER/],
    ['SEE', /OBSERV|VERIFY|PROVE|READ|INSPECT|COMPAR|INVESTIGAT|ALIGN|LISTEN|INTERPRET|WITNESS|CAPTURE/],
  ];
  function classifyOp(op) {
    const primary = (op ?? '').split('/')[0].trim().toUpperCase();
    for (const [cls, re] of OP_CLASS_RULES) if (re.test(primary)) return cls;
    return 'OTHER';
  }
  const opClass = {};
  const opToClass = {};
  for (const [op] of ops) {
    const c = classifyOp(op);
    opToClass[op] = c;
    opClass[c] = (opClass[c] ?? 0) + 1;
  }
  return {
    routes_total: routes.length,
    route_state_raw_distinct: new Set(routes.map((r) => r.state)).size,
    route_state_folded_onto: 3,
    route_state_dist: dist,
    route_state_residue: residue,
    operation_distinct: ops.size,
    operation_compound_count: compoundOps.length,
    operation_debt_sample: compoundOps.slice(0, 6),
    operation_class_proposed: 6,
    operation_class_dist: opClass,
    operation_class_map: opToClass,
  };
}

const { report, files } = run();
report.routes = runRoutes();
report.receipt_sync = receiptSync(report, files);
const wantJson = process.argv.includes('--json');
const wantWrite = process.argv.includes('--write');
const wantCheckReceipts = process.argv.includes('--check-receipts');

if (wantWrite) writeFileSync(OUT, JSON.stringify(report, null, 1) + '\n');

if (wantJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const d = report.phase_distribution;
  console.log(`FIELD FOLD · ${report.returns_total} returns · ${report.raw_distinct_states} raw states → ${report.folded_onto_enum}-value enum`);
  console.log(`  ⚊ SOURCE ${d.SOURCE}   ·  𝌀 HOLD ${d.HOLD}   ·  ⚋ RETURN ${d.RETURN}   ·  ⧗ RESIDUE ${d.RESIDUE}`);
  console.log(`  verified-flagged: ${report.verified_flagged} (independent of the fold's own receipts: ${report.verified_flagged_independent})`);
  if (report.self_reference_files.length) {
    console.log(`  self-reference (the fold's own receipts — NOT independent evidence): ${report.self_reference_files.join(', ')}`);
  }
  if (report.unrecorded_count) {
    console.log(`  UNRECORDED ${report.unrecorded_count} returns carry no state at all — phase UNDETERMINED (absence is not evidence of not-landed), listed in map.residue_files`);
  }
  const rt = report.routes ?? {};
  if (rt.routes_total) {
    const rd = rt.route_state_dist ?? {};
    console.log(`ROUTE FOLD · ${rt.routes_total} routes · route-state ${rt.route_state_raw_distinct} → ${rt.route_state_folded_onto}-value enum`);
    console.log(`  ⚊ SOURCE ${rd.SOURCE}   ·  𝌀 HOLD ${rd.HOLD}   ·  ⚋ RETURN ${rd.RETURN}   ·  ⧗ RESIDUE ${rd.RESIDUE}`);
    console.log(`  operation debt (measured, not force-folded): ${rt.operation_distinct} distinct · ${rt.operation_compound_count} compound`);
    const oc = rt.operation_class_dist ?? {};
    console.log(`  operation → proposed 6-class taxonomy: ${Object.entries(oc).map(([k, v]) => k + ' ' + v).join(' · ')}`);
  }
  const frayingFiles = report.residue_files.filter((x) => x.kind === 'fraying');
  if (frayingFiles.length) {
    console.log(`  RESIDUE/fraying (needs human disposition, not coerced):`);
    for (const r of frayingFiles.slice(0, 8)) console.log(`    ${r.file}  ←  ${JSON.stringify(r.raw).slice(0, 60)}`);
  }
  for (const r of report.receipt_sync.receipts) {
    console.log(`  receipt sync · ${r.file}: ${r.verdict}${r.mismatches.length ? ' [' + r.mismatches.join('; ') + ']' : ''}`);
  }
}

// Gate: converged = every RECORDED state folds except a bounded fraying residue we explicitly
// own. Unrecorded rows are missing data — reported and owned, never counted as vocabulary
// fraying and never coerced into a phase. Exit code IS the verdict. Threshold: fraying
// residue must stay ≤ 3% of returns.
const threshold = Math.max(2, Math.ceil(report.returns_total * 0.03));
const routeResidue = report.routes?.route_state_residue?.length ?? 0;
const converged = report.fraying_count <= threshold && routeResidue <= threshold;
if (!wantJson) {
  console.log(converged
    ? `FIELD FOLD PASS · fraying residue ${report.fraying_count} ≤ ${threshold} · unrecorded ${report.unrecorded_count} (explicit, never coerced) · route-state residue ${routeResidue} · vocabulary converged`
    : `FIELD FOLD FAIL · fraying residue ${report.fraying_count} / route-state residue ${routeResidue} · threshold ${threshold} · vocabulary still fraying`);
}
const needsAsOf = report.receipt_sync.receipts.some((r) => r.needs_counts_as_of);
if (wantCheckReceipts && needsAsOf) {
  console.error('RECEIPT SYNC FAIL · a fold receipt restates counts without a counts_as_of declaration — the staleness class:');
  for (const r of report.receipt_sync.receipts.filter((x) => x.needs_counts_as_of)) console.error(`  ${r.file}: ${r.verdict}`);
  process.exit(1);
}
process.exit(converged ? 0 : 1);