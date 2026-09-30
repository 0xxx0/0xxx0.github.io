#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');

const core1=fs.readFileSync('fold-bloom/two-dial/core1.js','utf8');
const core2=fs.readFileSync('fold-bloom/two-dial/core2.js','utf8');
const sw=fs.readFileSync('fold-bloom/two-dial/sw.js','utf8');
const release=JSON.parse(fs.readFileSync('fold-bloom/two-dial/release.json','utf8'));
const audit=JSON.parse(fs.readFileSync('control/FIELD_COAXIALITY_AUDIT.json','utf8'));
const manifest=JSON.parse(fs.readFileSync('showcase-manifest.json','utf8'));

assert.match(core1,/0\.10\.7-reversible-commit/);
assert.match(sw,/const CACHE='fb-two-dial-v0107'/);
assert.match(sw,/startsWith\('fb-two-dial-'\)/);
assert.match(core2,/function pointerSideClaimed\(side\)/);
assert.match(core2,/if \(pointerSideClaimed\(side\)\) return;/);
assert.match(core2,/function pointerGestureStart\(side, raw\)/);
for(const field of ['startIndex','startRaw','startScars']) assert.match(core2,new RegExp('\\b'+field+'\\b'));

const cancelStart=core2.indexOf('function cancelPointerGesture');
const cancelEnd=core2.indexOf('cv.onpointerdown',cancelStart);
assert.ok(cancelStart>=0&&cancelEnd>cancelStart,'cancelPointerGesture boundary missing');
const cancel=core2.slice(cancelStart,cancelEnd);
assert.match(cancel,/L = p\.startIndex/);
assert.match(cancel,/R = p\.startIndex/);
assert.match(cancel,/rawL = p\.startRaw/);
assert.match(cancel,/rawR = p\.startRaw/);
assert.match(cancel,/scarsL = p\.startScars\.slice\(\)/);
assert.match(cancel,/scarsR = p\.startScars\.slice\(\)/);
assert.match(cancel,/dialTouched\[p\.side\] = false/);
assert.doesNotMatch(cancel,/\bcommit\s*\(/,'pointer cancel must not commit');

assert.match(core2,/Release is the single semantic commit boundary/);
assert.match(core2,/cv\.onpointercancel = cancelPointerGesture/);

assert.equal(release.version,'0.10.7');
const mechanism=audit.mechanisms.find(m=>m.id==='fold-bloom-two-dial-relation');
assert.ok(mechanism,'Two Dial audit mechanism missing');
assert.equal(mechanism.tests.C_GESTURE.verdict,'PASS');
assert.equal(mechanism.tests.E_REVERSAL.verdict,'PASS');
assert.equal(mechanism.tests.H_COMPRESSION.verdict,'INDETERMINATE');
assert.equal(mechanism.decision,'PROVE_OR_DECOAXIALIZE');

const route=manifest.routes.find(r=>r.href==='/fold-bloom/two-dial/');
assert.equal(route.version,'0.10.7');
assert.match(route.contract.transforms.reversibility,/one-level local committed-gesture reversal/i);
assert.match(route.contract.transforms.reversibility,/deep-cloned pre-gesture state/i);
assert.match(route.contract.transforms.reversibility,/H_COMPRESSION remains ordinary-use gated/i);

console.log('TWO DIAL GESTURE BOUNDARY PASS · one pointer → one dial · cancel restores preview · release commits');
