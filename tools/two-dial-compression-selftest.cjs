#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');

const core1=fs.readFileSync('fold-bloom/two-dial/core1.js','utf8');
const runtime=fs.readFileSync('fold-bloom/two-dial/app-runtime.js','utf8');
const html=fs.readFileSync('fold-bloom/two-dial/index.html','utf8');
const auditJs=fs.readFileSync('fold-bloom/two-dial/compression-audit.js','utf8');
const sw=fs.readFileSync('fold-bloom/two-dial/sw.js','utf8');
const audit=JSON.parse(fs.readFileSync('control/FIELD_COAXIALITY_AUDIT.json','utf8'));
const release=JSON.parse(fs.readFileSync('fold-bloom/two-dial/release.json','utf8'));
const manifest=JSON.parse(fs.readFileSync('showcase-manifest.json','utf8'));

new Function(auditJs);
assert.match(core1,/0\.10\.8-compression-ablation/);
assert.match(html,/compression-audit\.js/);
assert.match(sw,/fb-two-dial-v0108/);
assert.match(sw,/compression-audit\.js/);
assert.match(runtime,/compression=\(\?:TWO\|PLAIN\)/);
assert.match(auditJs,/PLAIN_PAIR_6X6/);
assert.match(auditJs,/relationFromPair\(l,r\)/);
assert.match(auditJs,/commit\(\)/);
assert.match(auditJs,/fold-bloom-compression-return\/v0\.1/);
assert.match(auditJs,/EVIDENCE_ONLY \/ NO AUTO_PROMOTION/);
assert.match(auditJs,/USER_OBSERVATION_NOT_CORRECTNESS_PROOF/);
assert.match(auditJs,/subscribeEvents/);
assert.doesNotMatch(auditJs,/localStorage\.setItem/);

const mech=audit.mechanisms.find(m=>m.id==='fold-bloom-two-dial-relation');
assert.ok(mech,'Two Dial audit mechanism missing');
assert.equal(mech.tests.H_COMPRESSION.verdict,'INDETERMINATE');
assert.equal(mech.compression_gate?.baseline,'PLAIN_PAIR_6X6');
assert.equal(mech.compression_gate?.status,'RUNNABLE_ORDINARY_USE_REQUIRED');
assert.equal(mech.decision,'PROVE_OR_DECOAXIALIZE');

assert.equal(release.version,'0.10.8');
const route=manifest.routes.find(r=>r.href==='/fold-bloom/two-dial/');
assert.equal(route.version,'0.10.8');
assert.ok((route.contract?.evidence?.checks||[]).some(x=>/H_COMPRESSION/i.test(x)));

console.log('TWO DIAL H COMPRESSION HARNESS PASS · same 36 states + same commit path · evidence only · H remains ordinary-use gated');
