import test from 'node:test';
import assert from 'node:assert/strict';
import { hasPendingCIClaim } from './return-receipt-contract.mjs';

test('PASS receipt verification text that still says CI pending is rejected', () => {
  assert.equal(hasPendingCIClaim({
    status:'MERGED_VERIFIED',
    verification:['PR #416 CI pending'],
    proof:{status:'PASS'}
  }), true);
});

test('pending state and proof claims are rejected regardless of field shape', () => {
  assert.equal(hasPendingCIClaim({state:'PENDING_PR_CI'}), true);
  assert.equal(hasPendingCIClaim({proof:{note:'pending CI'}}), true);
  assert.equal(hasPendingCIClaim({verification:{note:'CI is pending'}}), true);
});

test('completed verification is allowed', () => {
  assert.equal(hasPendingCIClaim({
    status:'MERGED_CI_GREEN',
    verification:['Route Registration PASS','public-surface-check PASS'],
    proof:{status:'PASS'}
  }), false);
});
