import test from 'node:test';
import assert from 'node:assert/strict';
import {hasPendingCIClaim,pendingCIClaims} from './return-receipt-contract.mjs';

test('PASS receipt with verification text that still says CI pending is rejected',()=>{
  const receipt={status:'MERGED_VERIFIED',verification:['PR #416 CI pending'],proof:{status:'PASS'}};
  assert.equal(hasPendingCIClaim(receipt),true);
  assert.deepEqual(pendingCIClaims(receipt).map(x=>x.path),['$.verification[0]']);
});

test('pending state and proof claims are rejected regardless of field shape',()=>{
  assert.equal(hasPendingCIClaim({state:'PENDING_PR_CI'}),true);
  assert.equal(hasPendingCIClaim({proof:{note:'pending CI'}}),true);
});

test('nested and array verification claims are scanned without field allowlists',()=>{
  const receipt={verification:{checks:[{note:'route pass'},{note:'CI is pending'}]}};
  const hits=pendingCIClaims(receipt);
  assert.equal(hits.length,1);
  assert.equal(hits[0].path,'$.verification.checks[1].note');
});

test('completed verification is allowed',()=>{
  assert.equal(hasPendingCIClaim({status:'PASS',verification:['CI PASS'],proof:{run:123,result:'PASS'}}),false);
});
