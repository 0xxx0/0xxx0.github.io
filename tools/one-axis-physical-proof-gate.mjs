import {fileURLToPath} from 'node:url';

const nonempty = v => {
  if (v == null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v).length > 0;
  return String(v).trim().length > 0;
};

const num = v => typeof v === 'number' && Number.isFinite(v);
const pass = v => v === true || (v && typeof v === 'object' && (v.pass === true || String(v.status || '').toUpperCase() === 'PASS'));

function validRun(run={}) {
  return run && typeof run === 'object'
    && num(run.commanded)
    && num(run.actual)
    && num(run.zero_error)
    && nonempty(run.thermal_observation);
}

function classify(packet, blockers) {
  const hasBuildEvidence = nonempty(packet.build_evidence) && nonempty(packet.observed_at);
  if (!hasBuildEvidence) return 'SPECIFIED';

  const testBlockers = blockers.filter(x => !['OBJECT_ID','SPEC_REF','SAFETY_BOUNDARY_PASS'].includes(x));
  if (blockers.includes('OBJECT_ID') || blockers.includes('SPEC_REF') || blockers.includes('SAFETY_BOUNDARY_PASS')) return 'SPECIFIED';
  if (testBlockers.length) return 'BUILT';
  return 'TESTED';
}

export function assessOneAxisProof(packet={}) {
  if (!packet || typeof packet !== 'object' || Array.isArray(packet)) throw new Error('ONE_AXIS_PACKET_OBJECT_REQUIRED');

  const blockers=[];
  if (!nonempty(packet.object_id)) blockers.push('OBJECT_ID');
  if (!nonempty(packet.spec_ref)) blockers.push('SPEC_REF');
  if (!pass(packet.safety_boundary)) blockers.push('SAFETY_BOUNDARY_PASS');
  if (!nonempty(packet.build_evidence)) blockers.push('BUILD_EVIDENCE');
  if (!nonempty(packet.observed_at)) blockers.push('OBSERVED_AT');

  const unloaded = Array.isArray(packet.unloaded_runs) ? packet.unloaded_runs : [];
  const loaded = Array.isArray(packet.loaded_runs) ? packet.loaded_runs : [];
  if (unloaded.length < 10) blockers.push('UNLOADED_RUNS_10');
  if (loaded.length < 10) blockers.push('LOADED_RUNS_10');
  if (unloaded.some(r => !validRun(r))) blockers.push('UNLOADED_RUN_FIELDS');
  if (loaded.some(r => !validRun(r))) blockers.push('LOADED_RUN_FIELDS');

  if (!pass(packet.interruption_recovery)) blockers.push('INTERRUPTION_RECOVERY_PASS');
  if (!pass(packet.return_to_zero)) blockers.push('RETURN_TO_ZERO_PASS');
  if (!pass(packet.payload_adapter_swap)) blockers.push('PAYLOAD_ADAPTER_SWAP_PASS');
  if (!Array.isArray(packet.anomalies)) blockers.push('ANOMALIES_EXPLICIT');
  if (!nonempty(packet.evidence_refs)) blockers.push('EVIDENCE_REFS');

  const unique=[...new Set(blockers)];
  const max_state=classify(packet, unique);
  const requested=String(packet.requested_state || 'TESTED').trim().toUpperCase();
  const rank={SPECIFIED:0,BUILT:1,TESTED:2,ADOPTED:3};
  const allowed = Object.hasOwn(rank,requested) && rank[requested] <= rank[max_state];

  return {
    schema:'field/one-axis-physical-proof-gate/v0.1',
    object_id:packet.object_id || null,
    requested_state:requested,
    allowed,
    max_state,
    blockers:unique,
    summary:{
      unloaded_runs:unloaded.length,
      loaded_runs:loaded.length,
      unloaded_max_abs_error:unloaded.length && unloaded.every(validRun)
        ? Math.max(...unloaded.map(r=>Math.abs(r.actual-r.commanded)))
        : null,
      loaded_max_abs_error:loaded.length && loaded.every(validRun)
        ? Math.max(...loaded.map(r=>Math.abs(r.actual-r.commanded)))
        : null,
      unloaded_max_abs_zero_error:unloaded.length && unloaded.every(validRun)
        ? Math.max(...unloaded.map(r=>Math.abs(r.zero_error)))
        : null,
      loaded_max_abs_zero_error:loaded.length && loaded.every(validRun)
        ? Math.max(...loaded.map(r=>Math.abs(r.zero_error)))
        : null
    },
    authority:'EVIDENCE-STRUCTURE GATE ONLY / PHYSICAL TRUTH REMAINS WITH OBSERVATION + EVIDENCE REFS',
    adoption:'NOT ASSESSED — TESTED does not imply ADOPTED',
    next:max_state === 'TESTED'
      ? 'Physical test packet is structurally eligible for human/repository review; preserve raw evidence refs.'
      : 'Collect only the missing physical observations; do not promote the state.'
  };
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const fs=await import('node:fs');
  const path=process.argv[2];
  if (!path) {
    console.error('usage: node tools/one-axis-physical-proof-gate.mjs <receipt.json>');
    process.exit(64);
  }
  const packet=JSON.parse(fs.readFileSync(path,'utf8'));
  const out=assessOneAxisProof(packet);
  process.stdout.write(JSON.stringify(out,null,2)+'\n');
  if (!out.allowed) process.exitCode=2;
}
