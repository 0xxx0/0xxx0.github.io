import assert from 'node:assert/strict';
import {assessOneAxisProof} from './one-axis-physical-proof-gate.mjs';

const run=(commanded,actual,zero_error,thermal_observation='warm / stable')=>({
  commanded,actual,zero_error,thermal_observation
});
const runs=Array.from({length:10},(_,i)=>run(100,100+(i%3-1)*0.2,(i%2?0.1:-0.1)));

const unidentified=assessOneAxisProof({requested_state:'SPECIFIED'});
assert.equal(unidentified.allowed,false);
assert.ok(unidentified.blockers.includes('OBJECT_ID'));
assert.ok(unidentified.blockers.includes('SPEC_REF'));

const specified=assessOneAxisProof({
  object_id:'one-axis:v0.1',
  spec_ref:'Convergence Foundry / ONE_AXIS_PROOF_v0.1'
});
assert.equal(specified.max_state,'SPECIFIED');
assert.equal(specified.allowed,false);
assert.ok(specified.blockers.includes('BUILD_EVIDENCE'));

const built=assessOneAxisProof({
  object_id:'one-axis:v0.1',
  spec_ref:'Convergence Foundry / ONE_AXIS_PROOF_v0.1',
  safety_boundary:{status:'PASS'},
  build_evidence:['photo:assembly-01'],
  observed_at:'2026-09-30T14:00:00+08:00',
  requested_state:'TESTED'
});
assert.equal(built.max_state,'BUILT');
assert.equal(built.allowed,false);
assert.ok(built.blockers.includes('UNLOADED_RUNS_10'));

const testedPacket={
  object_id:'one-axis:v0.1',
  spec_ref:'Convergence Foundry / ONE_AXIS_PROOF_v0.1',
  safety_boundary:{status:'PASS'},
  build_evidence:['photo:assembly-01','clip:motion-01'],
  observed_at:'2026-09-30T14:00:00+08:00',
  unloaded_runs:runs,
  loaded_runs:runs.map(r=>({...r,actual:r.actual+0.15})),
  interruption_recovery:{status:'PASS',evidence_ref:'clip:recovery-01'},
  return_to_zero:{status:'PASS',evidence_ref:'measurement:zero-01'},
  payload_adapter_swap:{status:'PASS',evidence_ref:'clip:swap-01'},
  anomalies:[],
  evidence_refs:['photo:assembly-01','clip:motion-01','clip:recovery-01','measurement:zero-01'],
  requested_state:'TESTED'
};
const tested=assessOneAxisProof(testedPacket);
assert.equal(tested.max_state,'TESTED');
assert.equal(tested.allowed,true);
assert.equal(tested.summary.unloaded_runs,10);
assert.equal(tested.summary.loaded_runs,10);
assert.ok(Math.abs(tested.summary.unloaded_max_abs_error-0.2) < 1e-9);
assert.match(tested.authority,/PHYSICAL TRUTH REMAINS/);
assert.match(tested.performance,/numeric tolerances remain owned/);

const adopted=assessOneAxisProof({...testedPacket,requested_state:'ADOPTED'});
assert.equal(adopted.allowed,false);
assert.equal(adopted.max_state,'TESTED');
assert.match(adopted.adoption,/NOT ASSESSED/);

const badFields=assessOneAxisProof({...testedPacket,unloaded_runs:[...runs.slice(0,9),{commanded:100,actual:100,zero_error:0}]});
assert.equal(badFields.allowed,false);
assert.ok(badFields.blockers.includes('UNLOADED_RUN_FIELDS'));

console.log('one-axis physical proof gate PASS · SPECIFIED/BUILT/TESTED remain distinct; ADOPTED is never inferred');
