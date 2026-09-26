#!/usr/bin/env node
/**
 * STRESS — spikes/007-hard-evolution-proofs
 * Deterministic invariant sweep over wrap-core.js (no network, no writes).
 * Exits non-zero on any failed assertion. stdout = JSON report.
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { performance } from 'node:perf_hooks';

const here = dirname(fileURLToPath(import.meta.url));
const W = createRequire(import.meta.url)(join(here, 'wrap-core.js'));

const NXS = [6, 12, 24, 48, 96, 192];
const NYS = [6, 36];
const KS = [1, 2, 3, 4, 5, 6, 8, 12];
const EPS_TUBE = 1e-6;
const EPS_SEAM = 1e-9;
const TOL_LAW = 1e-6;

const dist3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const J = x => JSON.stringify(x);
const assertions = [];
const observe = (name, pass, detail) => assertions.push({ name, pass: !!pass, detail: detail || {} });

// ---- pure measurement sweep (run twice; must be identical) ----
function sweep() {
  const tube = [], donut = [];
  for (const nx of NXS) for (const ny of NYS) {
    const s = W.sheet(nx, ny);
    const t = W.metricStats(s, { embed: W.EMBEDS.TUBE });
    tube.push({ nx, ny, max_abs: t.maxAbs, mean: t.mean, edges: t.n,
                gap_x: W.closureDistance(s, { embed: W.EMBEDS.TUBE }) });
    for (const k of KS) {
      const d = W.metricStats(s, { embed: W.EMBEDS.DONUT, ringFactor: k });
      donut.push({
        nx, ny, k,
        max_abs: d.maxAbs, min: d.min, max: d.max, analytic: d.analytic,
        max_at_dir: d.maxAt ? d.maxAt.dir : null,
        gap_x: W.closureDistance(s, { embed: W.EMBEDS.DONUT, ringFactor: k }),
        gap_y: dist3(W.point(s, 0, 0, { embed: W.EMBEDS.DONUT, ringFactor: k, t: 1 }),
                     W.point(s, 0, ny, { embed: W.EMBEDS.DONUT, ringFactor: k, t: 1 })),
        y_closed: (ny % (nx * k)) === 0
      });
    }
  }
  return { tube, donut };
}

const s1 = sweep();
const s2 = sweep();

// ---- assertions ----------------------------------------------------------
const tubeWorst = s1.tube.reduce((m, r) => Math.max(m, r.max_abs), -Infinity);
observe('TUBE developable: max|strain| < 1e-6 across grid', tubeWorst < EPS_TUBE, { tube_worst: tubeWorst });

let lawDev = 0, lawWorst = null;
for (const r of s1.donut) {
  const dev = Math.abs(r.max_abs - r.analytic);
  if (dev > lawDev) { lawDev = dev; lawWorst = r; }
}
observe('DONUT max|strain| = 1/k (tol 1e-6)', lawDev < TOL_LAW,
  { worst_dev: lawDev, at: lawWorst && { nx: lawWorst.nx, ny: lawWorst.ny, k: lawWorst.k } });

observe('DONUT max strain is v-direction', s1.donut.every(r => r.max_at_dir === 'v'), {});

let symWorst = 0;
for (const r of s1.donut) symWorst = Math.max(symWorst, Math.abs(r.min + r.max));
observe('DONUT strain symmetric: min = -max', symWorst < TOL_LAW, { worst: symWorst });

let monoOK = true, monoBad = null;
for (const nx of NXS) for (const ny of NYS) {
  const rows = KS.map(k => s1.donut.find(r => r.nx === nx && r.ny === ny && r.k === k));
  for (let i = 1; i < rows.length; i++) {
    if (!(rows[i].max_abs < rows[i - 1].max_abs)) { monoOK = false; monoBad = { nx, ny, k: rows[i].k }; }
  }
}
observe('DONUT strain strictly decreasing in k', monoOK, { first_fail: monoBad });

const xGapWorst = Math.max(...s1.tube.map(r => r.gap_x), ...s1.donut.map(r => r.gap_x));
observe('X-seam closes for TUBE & DONUT (gap < 1e-9)', xGapWorst < EPS_SEAM, { worst: xGapWorst });

let seamClosedWorst = 0, seamOpenMin = Infinity;
for (const r of s1.donut) {
  if (r.y_closed) seamClosedWorst = Math.max(seamClosedWorst, r.gap_y);
  else seamOpenMin = Math.min(seamOpenMin, r.gap_y);
}
observe('Y-seam closes iff ny = m*nx*k (m in N)',
  seamClosedWorst < EPS_SEAM && seamOpenMin > 1e-3,
  { closed_worst: seamClosedWorst, open_min: seamOpenMin });

// adjacency / op semantics on the default sheet (12 x 36, k=3 -> torus)
const sa = W.sheet(12, 36);
const snapBefore = J(sa);
const idX = W.identify(sa, 'X');
const idY = W.identify(sa, 'Y');
observe('IDENTIFY wraps adjacency (X)',
  W.neighbors(sa, 0, 0).left === null && W.neighbors(idX.obj, 0, 0).left === 11 && W.neighbors(idX.obj, 11, 0).right === 0,
  {});
observe('IDENTIFY wraps adjacency (Y)',
  W.neighbors(sa, 0, 0).down === null && W.neighbors(idY.obj, 0, 0).down === 35,
  {});
const idem = W.identify(idX.obj, 'X');
observe('IDENTIFY idempotence-guard', idem.ok === false && idem.reason === 'ALREADY_IDENTIFIED_X', { reason: idem.reason });
const badAxis = W.identify(sa, 'Z');
observe('IDENTIFY rejects bad axis', badAxis.ok === false && badAxis.reason === 'AXIS_MUST_BE_X_OR_Y', { reason: badAxis.reason });

const metricsOf = s => J({
  flat: W.metricStats(s, { embed: W.EMBEDS.FLAT }),
  tube: W.metricStats(s, { embed: W.EMBEDS.TUBE }),
  donut: W.metricStats(s, { embed: W.EMBEDS.DONUT, ringFactor: 3 })
});
const mBefore = metricsOf(sa);
const bothId = W.identify(idX.obj, 'Y').obj;
observe('IDENTIFY is metric-neutral', metricsOf(bothId) === mBefore, {});

const nb0 = J(W.neighbors(sa, 3, 3));
const emb = W.setEmbed(sa, 'DONUT', 3).obj;
observe('EMBED leaves adjacency unchanged', J(W.neighbors(emb, 3, 3)) === nb0, {});
const badEmbed = W.setEmbed(sa, 'SPHERE');
observe('EMBED rejects unknown mode', badEmbed.ok === false && badEmbed.reason === 'UNKNOWN_EMBED', { reason: badEmbed.reason });
const noK = W.setEmbed(sa, 'TUBE');
observe('EMBED without ringFactor keeps current ringFactor (TDZ-fix coverage)',
  noK.ok === true && noK.obj.embed === 'TUBE' && noK.obj.ringFactor === sa.ringFactor,
  { kept: noK.obj && noK.obj.ringFactor });
W.identify(sa, 'X'); W.setEmbed(sa, 'TUBE');
observe('inputs immutable under ops', J(sa) === snapBefore, {});

const tiny = W.sheet(1, 1);
observe('sheet() falls back to defaults for out-of-domain size', tiny.nx === 12 && tiny.ny === 36, { nx: tiny.nx, ny: tiny.ny });
const round = W.sheet(11.6, 4.4);
observe('sheet() rounds sizes', round.nx === 12 && round.ny === 4, { nx: round.nx, ny: round.ny });

const rec = W.receipt(W.setEmbed(W.identify(sa, 'X').obj, 'TUBE').obj, [{ note: 'stress' }]);
observe('receipt carries ops/state/evidence/residue',
  rec.schema === '0xxx0/wrap-proof-return/v0.1' && rec.residue.length >= 5 && ['FLAT', 'TUBE', 'DONUT'].every(k => k in rec.evidence),
  { residue: rec.residue.length });

observe('sweep deterministic (double-run JSON equal)', J(s1) === J(s2), {});

// ---- observations (informational; declared as residue) --------------------
const pD = W.point(sa, 0, 0, { embed: 'DONUT', ringFactor: 3, t: 1 });
const pS = W.point(sa, 0, 0, { embed: 'SPHERE', ringFactor: 3, t: 1 });
const pZ = W.point(sa, 0, 0, { embed: 'DONUT', ringFactor: 0, t: 1 });
const pN = W.point(sa, 0, 0, { embed: 'DONUT', ringFactor: -2, t: 1 });
const observations = [
  { note: 'internal point() does not validate embed; unknown strings take the DONUT branch (public setEmbed() guards)',
    evidence: { sphere_equals_donut_coords: dist3(pD, pS) < 1e-12 } },
  { note: 'internal point() does not validate ringFactor: 0 falls back through the || chain to the object default; negative values are accepted unvalidated (inverted but finite)',
    evidence: { zero_falls_back_finite: Number.isFinite(pZ.x) && Number.isFinite(pZ.z), negative_finite: Number.isFinite(pN.x) && Number.isFinite(pN.z) } }
];

// ---- perf ----------------------------------------------------------------
const big = W.sheet(192, 36);
const tP0 = performance.now();
const statsBig = W.metricStats(big, { embed: W.EMBEDS.DONUT, ringFactor: 12 });
const tP1 = performance.now();
observe('largest case computes under 1000 ms', (tP1 - tP0) < 1000, { ms: +(tP1 - tP0).toFixed(1), edges: statsBig.n });

// ---- report --------------------------------------------------------------
const failed = assertions.filter(a => !a.pass);
const report = {
  schema: '0xxx0/wrap-proof-stress/v0.1',
  target: 'spikes/007-hard-evolution-proofs/wrap-core.js',
  grid: { nx: NXS, ny: NYS, k: KS, donut_cases: s1.donut.length },
  findings: {
    tube_worst_max_abs: tubeWorst,
    donut_law_worst_dev: lawDev,
    x_seam_worst_gap: xGapWorst,
    y_seam: { law: 'Y-seam closes iff ny = m*nx*k, m in N', closed_worst: seamClosedWorst, open_min: seamOpenMin },
    observations
  },
  assertions,
  summary: { pass: assertions.length - failed.length, total: assertions.length, ok: failed.length === 0 }
};
console.log(JSON.stringify(report));
console.error(`STRESS ${report.summary.ok ? 'PASS' : 'FAIL'} ${report.summary.pass}/${report.summary.total}` +
  ` | tube<${EPS_TUBE}: ${tubeWorst.toExponential(2)} | law dev: ${lawDev.toExponential(2)}` +
  ` | x-seam worst: ${xGapWorst.toExponential(2)} | y-closed worst: ${seamClosedWorst.toExponential(2)} | y-open min: ${seamOpenMin.toFixed(3)}`);
process.exit(failed.length ? 1 : 0);