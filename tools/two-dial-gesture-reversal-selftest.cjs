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

assert.match(core1,/0\.10\.6-gesture-undo/);

// C_GESTURE: pointer ownership is fixed at pointer-down; move mutates only that dial;
// release is the sole pointer path that commits the relation.
assert.match(core2,/pointers\.set\(e\.pointerId, \{ side, raw, t: performance\.now\(\) \}\)/);
assert.match(core2,/let p = pointers\.get\(e\.pointerId\);[\s\S]*?if \(p\.side === 0\) \{[\s\S]*?L = k;[\s\S]*?\} else \{[\s\S]*?R = k;/);
const moveBlock=core2.match(/cv\.onpointermove = e => \{[\s\S]*?\n\};/)?.[0]||'';
assert.ok(moveBlock,'pointermove block missing');
assert.doesNotMatch(moveBlock,/\bcommit\s*\(/,'pointermove must not commit');
const upBlock=core2.match(/cv\.onpointerup = e => \{[\s\S]*?\n\};/)?.[0]||'';
assert.match(upBlock,/!pointers\.size/,'commit must wait for all active pointers to release');
assert.match(upBlock,/prefs\.mode !== 'DUET' \|\| \(dialTouched\[0\] && dialTouched\[1\]\)/,'DUET must require both dials in the transaction');
assert.match(upBlock,/commit\(\)/,'pointerup must own relation commit');
assert.match(core2,/cv\.onpointercancel = e => \{[\s\S]*?dialTouched\[0\] = dialTouched\[1\] = false;/,'cancel must invalidate multi-pointer transaction');

// E_REVERSAL: each manual commit captures exact restorable state; bounded stack;
// undo cancels pending delayed compose, restores snapshot, and records an undo event.
assert.match(core1,/undoStack = \[\]/);
assert.match(core2,/const undoBefore = demo\?\.preview \? null : minimalSnapshot\(\)/);
assert.match(core2,/undoStack\.push\(undoBefore\)/);
assert.match(core2,/undoStack = undoStack\.slice\(-12\)/);
assert.match(runtime,/function undoLastCommit\(\)/);
assert.match(runtime,/clearTimeout\(pendingComposeTimer\)/);
assert.match(runtime,/const snap = undoStack\.pop\(\)/);
assert.match(runtime,/restore\(snap\)/);
assert.match(runtime,/schema: 'fold-bloom-undo\/v0\.1'/);
assert.match(runtime,/saveLocal\(\{ preserveUndo: true \}\)/);
assert.match(runtime,/function saveLocal\(\{ preserveUndo = false \} = \{\}\)/);
assert.match(runtime,/if \(!preserveUndo\) undoStack = \[\]/);
assert.match(html,/id="undoBtn" disabled>UNDO LAST</);

assert.equal(release.version,'0.10.6');
const mechanism=audit.mechanisms.find(m=>m.id==='fold-bloom-two-dial-relation');
assert.ok(mechanism,'Two Dial audit mechanism missing');
assert.equal(mechanism.tests.C_GESTURE.verdict,'PASS');
assert.equal(mechanism.tests.E_REVERSAL.verdict,'PASS');
assert.equal(mechanism.tests.H_COMPRESSION.verdict,'INDETERMINATE');
assert.equal(mechanism.decision,'PROVE_OR_DECOAXIALIZE');

console.log('TWO DIAL GESTURE + REVERSAL PASS · fixed pointer ownership → release commit · bounded exact UNDO; H remains evidence-gated');
