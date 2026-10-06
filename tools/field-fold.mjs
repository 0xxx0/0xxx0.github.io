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

const report = run();
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
  if (report.residue_count) {
    console.log(`  RESIDUE (needs human disposition, not coerced):`);
    for (const r of report.residue_files.slice(0, 8)) console.log(`    ${r.file}  ←  ${JSON.stringify(r.raw).slice(0, 60)}`);
  }
}

// Gate: converged = every state folds except a bounded residue we explicitly own.
// Exit code IS the verdict. Threshold: residue must stay ≤ 3% of returns.
const threshold = Math.max(2, Math.ceil(report.returns_total * 0.03));
const converged = report.residue_count <= threshold;
if (!wantJson) {
  console.log(converged
    ? `FIELD FOLD PASS · residue ${report.residue_count} ≤ ${threshold} · vocabulary converged`
    : `FIELD FOLD FAIL · residue ${report.residue_count} > ${threshold} · vocabulary still fraying`);
}
process.exit(converged ? 0 : 1);
