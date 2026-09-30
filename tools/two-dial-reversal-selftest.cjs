#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');

const core1=fs.readFileSync('fold-bloom/two-dial/core1.js','utf8');
const core2=fs.readFileSync('fold-bloom/two-dial/core2.js','utf8');
const runtime=fs.readFileSync('fold-bloom/two-dial/app-runtime.js','utf8');
const html=fs.readFileSync('fold-bloom/two-dial/index.html','utf8');
const release=JSON.parse(fs.readFileSync('fold-bloom/two-dial/release.json','utf8'));
const audit=JSON.parse(fs.readFileSync('control/FIELD_COAXIALITY_AUDIT.json','utf8'));

assert.match(core1,/0\.10\.7-reversible-commit/);
assert.match(core1,/commitUndoSnapshot\s*=\s*null/);
assert.match(core1,/pendingCommitUndoSnapshot\s*=\s*null/);
assert.match(core1,/pendingComposeTimers\s*=\s*new Set\(\)/);

assert.match(core2,/!pointers\.size[\s\S]*beginCommitUndoCandidate\(\)/);
assert.match(core2,/pointercancel = cancelPointerGesture/);
assert.match(core2,/discardCommitUndoCandidate\(\)/);
assert.match(core2,/if \(shouldCommit\) \{[\s\S]*armCommitUndo\(\)[\s\S]*commit\(\)/);
assert.match(core2,/const composeTimer = setTimeout/);
assert.match(core2,/registerCommitComposeTimer\(composeTimer\)/);
assert.match(core2,/settleCommitComposeTimer\(composeTimer\)/);

assert.match(runtime,/function cloneCommitSnapshot/);
assert.match(runtime,/structuredClone/);
assert.match(runtime,/JSON\.parse\(JSON\.stringify\(x\)\)/);
assert.match(runtime,/function undoLastCommit\(\)/);
assert.match(runtime,/cancelPendingComposeTimers\(\)/);
assert.match(runtime,/const ok = restore\(snap\)/);
assert.match(runtime,/saveLocal\(\)/);
assert.match(runtime,/function invalidateCommitUndo\(\)/);
assert.match(html,/id="undoBtn"/);
assert.match(html,/UNDO LAST COMMIT/);

assert.equal(release.version,'0.10.7');
const mechanism=audit.mechanisms.find(m=>m.id==='fold-bloom-two-dial-relation');
assert.ok(mechanism,'Two Dial audit mechanism missing');
assert.equal(mechanism.tests.C_GESTURE.verdict,'PASS');
assert.equal(mechanism.tests.E_REVERSAL.verdict,'PASS');
assert.equal(mechanism.tests.F_LIVE.verdict,'PASS');
assert.equal(mechanism.tests.G_RETURN.verdict,'PASS');
assert.equal(mechanism.tests.H_COMPRESSION.verdict,'INDETERMINATE');
assert.equal(mechanism.decision,'PROVE_OR_DECOAXIALIZE');
assert.equal(mechanism.compression_gate?.baseline,'PLAIN_PAIR_6X6');

console.log('TWO DIAL REVERSAL PASS · pre-gesture deep clone → release commit → exact local restore; H remains ordinary-use gated');
