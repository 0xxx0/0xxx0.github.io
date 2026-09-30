#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');

const audit=JSON.parse(fs.readFileSync('control/FIELD_COAXIALITY_AUDIT.json','utf8'));
const core2=fs.readFileSync('fold-bloom/two-dial/core2.js','utf8');
const m=audit.mechanisms.find(x=>x.id==='fold-bloom-two-dial-relation');
assert.ok(m,'missing two-dial coaxiality mechanism');
assert.equal(m.tests.H_COMPRESSION.verdict,'INDETERMINATE','baseline correction must not manufacture H PASS');

const gate=m.compression_gate;
assert.equal(gate.status,'ORDINARY_USE_REQUIRED');
assert.equal(gate.baseline,'PLAIN_PAIR_6X6_RELEASE_COMMIT');
assert.equal(gate.baseline_contract.play_open_scale.commit,'EACH_CONTROL_RELEASE_OR_CHANGE');
assert.equal(gate.baseline_contract.duet.commit,'MATCH_EXISTING_DUET_COALESCING');
assert.equal(gate.baseline_contract.no_extra_commit_control,true);
assert.equal(gate.baseline_contract.intermediate_consequence,'PRESERVE');
assert.equal(gate.baseline_contract.undo_boundary,'ONE_LAST_SEMANTIC_COMMIT');
assert.ok(gate.controlled.includes('same semantic commit boundary and intermediate consequence trajectory'));
assert.ok(gate.varied.some(x=>x.includes('no separate COMMIT control')));

assert.match(core2,/cv\.onpointerup\s*=\s*e\s*=>[\s\S]*?const shouldCommit = prefs\.mode !== 'DUET' \|\| dialTouched\[0\] && dialTouched\[1\] \|\| !pointers\.size;[\s\S]*?if \(shouldCommit\) \{[\s\S]*?commit\(\);/,'current host release/commit boundary drifted');
assert.ok(!gate.varied.some(x=>/explicit COMMIT/i.test(x)),'baseline must not add a final-only COMMIT control');
assert.ok(m.tests.H_COMPRESSION.evidence.some(x=>x.includes('intermediate causal consequence')),'audit must explain why the old baseline was non-equivalent');

console.log('TWO DIAL COMPRESSION BASELINE PARITY PASS · H remains ordinary-use INDETERMINATE');
