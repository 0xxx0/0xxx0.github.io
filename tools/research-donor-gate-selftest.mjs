import assert from 'node:assert/strict';
import {assessDonor} from './research-donor-gate.mjs';

const jiang=assessDonor({
  SOURCE_ID:'MLST 2026-09-26 / Zhengyao Jiang', ROLE:'MECHANISM', CLAIM_KIND:'OPTIMIZATION',
  CLAIM:'harness adaptation improves a fixed base model', DISPOSITION:'TRANSFER',
  BASELINE:'current research-design-loop 0.1', FALSIFIER:'held-out gain disappears',
  FIXED:'base model + tools', MUTATED:'harness', DEV_METRIC:'development fixtures',
  HELD_OUT:'unseen fixtures', REWARD_HACK_CHECK:'independent acceptance'
});
assert.equal(jiang.allowed,false);
assert.equal(jiang.max_disposition,'PARK');
assert.ok(jiang.blockers.includes('PRIMARY_REF'));
assert.ok(jiang.blockers.includes('REPLICA_PASS'));
assert.ok(jiang.blockers.includes('INDEPENDENT_HELD_OUT_ACCEPTANCE'));

const deepseek=assessDonor({
  SOURCE_ID:'AI Search / DeepSeek V4.1 Flash video', ROLE:'SCOUT',
  CLAIM:'cache/attention compression may reduce local context cost', DISPOSITION:'TRANSFER',
  FALSIFIER:'no equal-quality latency or memory gain'
});
assert.equal(deepseek.allowed,false);
assert.equal(deepseek.max_disposition,'PARK');
assert.ok(deepseek.blockers.includes('PRIMARY_REF'));

const openclaw=assessDonor({
  SOURCE_ID:'Lex Fridman #491 / Peter Steinberger', ROLE:'SYNTHESIS',
  CLAIM:'harness self-inspection reduces diagnosis ambiguity', DISPOSITION:'TRANSFER',
  PRIMARY_REF:'canonical episode/video', BASELINE:'opaque executor',
  FALSIFIER:'no reduction in diagnosis ambiguity'
});
assert.equal(openclaw.allowed,false);
assert.equal(openclaw.max_disposition,'PARK');
assert.ok(openclaw.blockers.includes('REPLICA_PASS'));

const mechanism=assessDonor({
  SOURCE_ID:'paper:123', ROLE:'MECHANISM', CLAIM:'bounded operator preserves invariant', DISPOSITION:'TRANSFER',
  PRIMARY_REF:'doi:123', BASELINE:'existing operator', FALSIFIER:'held-out invariant fails',
  REPLICA:{status:'PASS',observable:'same output on fixture'},
  TRANSFER_TEST:{status:'PASS',host:'/example/',result:'acceptance preserved'},
  EVIDENCE:{refs:['fixture:a','test:b']}
});
assert.equal(mechanism.allowed,true);
assert.equal(mechanism.max_disposition,'TRANSFER');
assert.match(mechanism.authority,/NO HOST EFFECT AUTHORITY/);

const selfScored=assessDonor({
  SOURCE_ID:'talk:harness', ROLE:'MECHANISM', CLAIM_KIND:'OPTIMIZATION', CLAIM:'critic loop improves harness', DISPOSITION:'TRANSFER',
  PRIMARY_REF:'paper:harness', BASELINE:'h0', FALSIFIER:'held-out does not improve', FIXED:'model+tools', MUTATED:'prompt',
  DEV_METRIC:'critic score', HELD_OUT:'fixtures H1-H4', REWARD_HACK_CHECK:'compare external acceptance',
  REPLICA:{status:'PASS'}, TRANSFER_TEST:{status:'PASS',independent:false}, EVIDENCE:{refs:['dev:1']}
});
assert.equal(selfScored.allowed,false);
assert.ok(selfScored.blockers.includes('INDEPENDENT_HELD_OUT_ACCEPTANCE'));

const heldOut=assessDonor({
  SOURCE_ID:'talk:harness', ROLE:'MECHANISM', CLAIM_KIND:'OPTIMIZATION', CLAIM:'critic loop improves harness', DISPOSITION:'TRANSFER',
  PRIMARY_REF:'paper:harness', BASELINE:'h0', FALSIFIER:'held-out does not improve', FIXED:'model+tools', MUTATED:'prompt',
  DEV_METRIC:'critic score', HELD_OUT:'fixtures H1-H4', REWARD_HACK_CHECK:'compare external acceptance',
  REPLICA:{status:'PASS'}, TRANSFER_TEST:{status:'PASS',independent:true}, EVIDENCE:{refs:['heldout:pass']}
});
assert.equal(heldOut.allowed,true);

const representationPacket={
  SOURCE_ID:'paper:latent', ROLE:'MECHANISM', CLAIM_KIND:'REPRESENTATION', CLAIM:'latent projection preserves control relation', DISPOSITION:'PROMOTE',
  PRIMARY_REF:'paper:latent', BASELINE:'raw carrier', FALSIFIER:'paired states collapse different next apertures',
  REPLICA:{status:'PASS'}, TRANSFER_TEST:{status:'PASS'}, EVIDENCE:{refs:['pair:1']},
  EXACT_SOURCE_IDENTITY:'outside projection', EXACT_ADDRESS_IDENTITY:'outside projection', LOSS_DECLARATION:'token detail', RAW_BASELINE:'raw carrier',
  HOST_RELATION_TEST:{status:'FAIL'}
};
const lossy=assessDonor(representationPacket);
assert.equal(lossy.allowed,false);
assert.ok(lossy.blockers.includes('HOST_RELATION_TEST_PASS'));
assert.equal(assessDonor({...representationPacket, HOST_RELATION_TEST:{status:'PASS'}}).allowed,true);

const park=assessDonor({SOURCE_ID:'episode:map',ROLE:'SYNTHESIS',CLAIM:'interesting heuristic',DISPOSITION:'PARK'});
assert.equal(park.allowed,true);
assert.equal(park.max_disposition,'PARK');

console.log('research donor gate PASS · real seed donors PARK without replica/held-out evidence; eligible transfer never grants host authority');
