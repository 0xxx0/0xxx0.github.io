import fs from 'node:fs';

const rate = rows => rows.length ? rows.filter(x=>x.pass === true).length / rows.length : 0;
const mean = xs => xs.length ? xs.reduce((a,b)=>a+b,0)/xs.length : Infinity;
const latency = rows => mean(rows.map(x=>Number(x.latency_ms ?? 0)));

function normalizeCase(input={}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('HARNESS_CASE_OBJECT_REQUIRED');
  const arms = Array.isArray(input.arms) ? input.arms : [];
  if (arms.length < 2) throw new Error('HARNESS_CASE_NEEDS_BASELINE_AND_CANDIDATE');
  const baselineId = input.baseline_id;
  if (!baselineId || !arms.some(a=>a.id===baselineId)) throw new Error('HARNESS_BASELINE_REQUIRED');

  const devIds = new Set();
  const heldIds = new Set();
  for (const arm of arms) {
    if (!arm.id) throw new Error('HARNESS_ARM_ID_REQUIRED');
    if (!Array.isArray(arm.dev) || !Array.isArray(arm.heldout)) throw new Error('HARNESS_SPLIT_REQUIRED');
    for (const r of arm.dev) {
      if (!r.id) throw new Error('HARNESS_DEV_ID_REQUIRED');
      devIds.add(r.id);
    }
    for (const r of arm.heldout) {
      if (!r.id) throw new Error('HARNESS_HELDOUT_ID_REQUIRED');
      heldIds.add(r.id);
    }
  }

  for (const id of devIds) if (heldIds.has(id)) throw new Error('HARNESS_DEV_HELDOUT_LEAKAGE');

  const devCount = arms[0].dev.length;
  const heldCount = arms[0].heldout.length;
  for (const arm of arms) {
    if (arm.dev.length !== devCount || arm.heldout.length !== heldCount) {
      throw new Error('HARNESS_BUDGET_MISMATCH');
    }
  }

  return {
    ...input,
    arms,
    baseline_id:baselineId,
    acceptance:{
      min_heldout_pass_rate:1,
      max_pass_rate_regression_vs_baseline:0,
      ...(input.acceptance || {})
    }
  };
}

function scoreDev(arm) {
  return {
    pass_rate:rate(arm.dev),
    mean_latency_ms:latency(arm.dev)
  };
}

function scoreHeldout(arm) {
  return {
    pass_rate:rate(arm.heldout),
    mean_latency_ms:latency(arm.heldout)
  };
}

export function evaluateHarnessCase(raw={}) {
  const input=normalizeCase(raw);
  const baseline=input.arms.find(a=>a.id===input.baseline_id);

  const ranked=[...input.arms].sort((a,b)=>{
    const A=scoreDev(a), B=scoreDev(b);
    if (B.pass_rate !== A.pass_rate) return B.pass_rate - A.pass_rate;
    if (A.mean_latency_ms !== B.mean_latency_ms) return A.mean_latency_ms - B.mean_latency_ms;
    return String(a.id).localeCompare(String(b.id));
  });

  const selected=ranked[0];
  const selectedDev=scoreDev(selected);
  const selectedHeld=scoreHeldout(selected);
  const baselineDev=scoreDev(baseline);
  const baselineHeld=scoreHeldout(baseline);

  const threshold=input.acceptance.min_heldout_pass_rate;
  const regression=input.acceptance.max_pass_rate_regression_vs_baseline;
  const heldoutPass =
    selectedHeld.pass_rate >= threshold &&
    selectedHeld.pass_rate >= baselineHeld.pass_rate - regression;

  const rewardHackDetected =
    selected.id !== baseline.id &&
    selectedDev.pass_rate > baselineDev.pass_rate &&
    selectedHeld.pass_rate < baselineHeld.pass_rate;

  return {
    schema:'field/harness-heldout-replica/v0.1',
    case_id:input.case_id || null,
    fixed_substrate:input.fixed_substrate || null,
    budget:{
      arms:input.arms.length,
      dev_tasks_per_arm:input.arms[0].dev.length,
      heldout_tasks_per_arm:input.arms[0].heldout.length
    },
    selection_policy:'DEV_ONLY / pass_rate desc → latency asc → id',
    acceptance_policy:'INDEPENDENT_HELDOUT / threshold + baseline non-regression',
    baseline:{
      id:baseline.id,
      dev:baselineDev,
      heldout:baselineHeld
    },
    selected:{
      id:selected.id,
      dev:selectedDev,
      heldout:selectedHeld
    },
    heldout_accepted:heldoutPass,
    reward_hack_detected:rewardHackDetected,
    disposition:heldoutPass ? 'ACCEPT' : 'REJECT',
    authority:'EVIDENCE_ONLY / NO HOST EFFECT AUTHORITY'
  };
}

export function evaluateHarnessFixture(doc={}) {
  const cases=Array.isArray(doc) ? doc : doc.cases;
  if (!Array.isArray(cases)) throw new Error('HARNESS_FIXTURE_CASES_REQUIRED');
  return cases.map(evaluateHarnessCase);
}

if (process.argv[1] && process.argv[1].endsWith('harness-heldout-replica.mjs')) {
  const path=process.argv[2];
  if (!path) {
    console.error('usage: node tools/harness-heldout-replica.mjs <fixture.json>');
    process.exit(64);
  }
  const doc=JSON.parse(fs.readFileSync(path,'utf8'));
  process.stdout.write(JSON.stringify(evaluateHarnessFixture(doc),null,2)+'\n');
}
