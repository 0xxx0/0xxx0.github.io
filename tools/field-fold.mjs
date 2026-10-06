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
// Verdict line + exit code = the verdict. Residue (states that don't fold) is flagged for human
// disposition, never silently coerced. House rule: a law designed but not enforced costs twice —
// this gate makes the fold executable.
//
// Usage: node tools/field-fold.mjs [--json] [--write]

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RETURNS = join(ROOT, 'returns');
const OUT = join(ROOT, 'returns', 'FIELD_FOLD_MAP.json');
const MANIFEST = join(ROOT, 'showcase-manifest.json');

// Canonical enum — the ternary phase + verified flag.
// phase: SOURCE (⚊ not landed) | HOLD (𝌀 candidate, in flight) | RETURN (⚋ landed) | RESIDUE (⧗ unclassified)
const PHASE_GLYPH = { SOURCE: '⚊', HOLD: '𝌀', RETURN: '⚋', RESIDUE: '⧗' };

// verified markers — confidence that a landed/candidate object actually checks out.
const VERIFIED = /(CI_GREEN|MACHINE_GREEN|BROWSER[_ ]?PROV|VERIFIED|\bPASS\b|SELF_VERIFY|ACTIVE|GREEN)/;

function classify(raw) {
  const s = (raw ?? '').toString().trim();
  if (!s) return { phase: 'SOURCE', verified: false, raw: s, why: 'no state recorded' };

  const u = s.toUpperCase();

  // A free sentence is not a state — flag it as residue, never coerce.
  if (u.length > 48 && /\s/.test(u) && !/[_/]/.test(u)) {
    return { phase: 'RESIDUE', verified: false, raw: s, why: 'free-text sentence, not a state token' };
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
    return { phase: 'RETURN', verified, raw: s, why: 'active/verified/current-host' };
  }
  return { phase: 'RESIDUE', verified, raw: s, why: 'no fold rule matched — needs human disposition' };
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
    folded.push({ file: f, raw: rawState, phase: c.phase, verified: c.verified, why: c.why });
  }

  const total = files.length;
  const rawDistinct = raw.size;
  const residue = dist.RESIDUE;

  const report = {
    schema: 'field-fold/v1',
    generated: new Date().toISOString(),
    returns_total: total,
    raw_distinct_states: rawDistinct,
    folded_onto_enum: 4, // SOURCE · HOLD · RETURN · RESIDUE
    convergence_ratio: rawDistinct ? +(4 / rawDistinct).toFixed(3) : 0,
    phase_distribution: dist,
    residue_count: residue,
    residue_files: folded.filter((x) => x.phase === 'RESIDUE').map((x) => ({ file: x.file, raw: x.raw })),
    raw_state_histogram: [...raw.entries()].sort((a, b) => b[1] - a[1]).map(([state, count]) => ({ state, count })),
    folded,
  };

  return report;
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

const report = run();
report.routes = runRoutes();
const wantJson = process.argv.includes('--json');
const wantWrite = process.argv.includes('--write');

if (wantWrite) writeFileSync(OUT, JSON.stringify(report, null, 1) + '\n');

if (wantJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const d = report.phase_distribution;
  console.log(`FIELD FOLD · ${report.returns_total} returns · ${report.raw_distinct_states} raw states → ${report.folded_onto_enum}-value enum`);
  console.log(`  ⚊ SOURCE ${d.SOURCE}   ·  𝌀 HOLD ${d.HOLD}   ·  ⚋ RETURN ${d.RETURN}   ·  ⧗ RESIDUE ${d.RESIDUE}`);
  console.log(`  verified-flagged: ${report.folded.filter((x) => x.verified).length}`);
  const rt = report.routes ?? {};
  if (rt.routes_total) {
    const rd = rt.route_state_dist ?? {};
    console.log(`ROUTE FOLD · ${rt.routes_total} routes · route-state ${rt.route_state_raw_distinct} → ${rt.route_state_folded_onto}-value enum`);
    console.log(`  ⚊ SOURCE ${rd.SOURCE}   ·  𝌀 HOLD ${rd.HOLD}   ·  ⚋ RETURN ${rd.RETURN}   ·  ⧗ RESIDUE ${rd.RESIDUE}`);
    console.log(`  operation debt (measured, not force-folded): ${rt.operation_distinct} distinct · ${rt.operation_compound_count} compound`);
    const oc = rt.operation_class_dist ?? {};
    console.log(`  operation → proposed 6-class taxonomy: ${Object.entries(oc).map(([k, v]) => k + ' ' + v).join(' · ')}`);
  }
  if (report.residue_count) {
    console.log(`  RESIDUE (needs human disposition, not coerced):`);
    for (const r of report.residue_files.slice(0, 8)) console.log(`    ${r.file}  ←  ${JSON.stringify(r.raw).slice(0, 60)}`);
  }
}

// Gate: converged = every state folds except a bounded residue we explicitly own.
// Exit code IS the verdict. Threshold: residue must stay ≤ 3% of returns.
const threshold = Math.max(2, Math.ceil(report.returns_total * 0.03));
const routeResidue = report.routes?.route_state_residue?.length ?? 0;
const converged = report.residue_count <= threshold && routeResidue <= threshold;
if (!wantJson) {
  console.log(converged
    ? `FIELD FOLD PASS · returns residue ${report.residue_count} ≤ ${threshold} · route-state residue ${routeResidue} · vocabulary converged`
    : `FIELD FOLD FAIL · returns residue ${report.residue_count} / route-state residue ${routeResidue} · threshold ${threshold} · vocabulary still fraying`);
}
process.exit(converged ? 0 : 1);
