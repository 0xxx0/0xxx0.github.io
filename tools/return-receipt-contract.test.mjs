import test from 'node:test';
import assert from 'node:assert/strict';
import { hasPendingCIClaim } from './return-receipt-contract.mjs';

test('PASS receipt with verification text that still says CI pending is rejected', () => {
  const receipt = {
    status: 'MERGED_VERIFIED',
    verification: ['PR #416 CI pending'],
    proof: { status: 'PASS' }
  };
  assert.equal(hasPendingCIClaim(receipt), true);
});

test('pending state and proof claims are rejected regardless of field shape', () => {
  assert.equal(hasPendingCIClaim({ state: 'PENDING_PR_CI' }), true);
  assert.equal(hasPendingCIClaim({ proof: { note: 'pending CI' } }), true);
});

test('completed verification is allowed', () => {
  assert.equal(hasPendingCIClaim({ status: 'PASS', verification: ['CI PASS'] }), false);
});
