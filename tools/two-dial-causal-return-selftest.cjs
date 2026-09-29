#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');

const core1=fs.readFileSync('fold-bloom/two-dial/core1.js','utf8');
const core2=fs.readFileSync('fold-bloom/two-dial/core2.js','utf8');
const runtime=fs.readFileSync('fold-bloom/two-dial/app-runtime.js','utf8');
const release=JSON.parse(fs.readFileSync('fold-bloom/two-dial/release.json','utf8'));
const audit=JSON.parse(fs.readFileSync('control/FIELD_COAXIALITY_AUDIT.json','utf8'));

const appVersion=(core1.match(/APP_VERSION = '([^']+)'/)||[])[1]||'';
const appSemver=appVersion.match(/^(\d+)\.(\d+)\.(\d+)/);
assert.ok(appSemver,'Two Dial APP_VERSION semver missing');
assert.ok(Number(appSemver[1])===0 && Number(appSemver[2])===10 && Number(appSemver[3])>=5,'causal RETURN requires Two Dial >=0.10.5');
assert.match(core1,/function causalDriver\(\)/);
assert.match(core1,/compositionAuthority:\s*'TWO_DIAL_RELATION'/);
assert.match(core1,/borrowedClockAuthorship:\s*false/);
assert.match(core1,/function causalFrame\(\)/);
assert.match(core1,/function causalReceipt\(before, after, operation/);
assert.match(core1,/schema:\s*'fold-bloom-phrase-return\/v0\.2'/);
for(const field of ['before','operation','actor','driver','delta','after','provenance']){
  assert.match(core1,new RegExp('\\b'+field+'\\b'), 'phrase RETURN missing '+field);
}
assert.match(core2,/const before = causalFrame\(\), driver = causalDriver\(\)/);
assert.match(core2,/const after = causalFrame\(\)/);
assert.match(core2,/causal:\s*causalReceipt\(composeBefore, composeAfter/);
assert.match(core2,/currentPhraseMoves\.push\([\s\S]*?causal,/);
assert.match(core2,/emit\('commit',[\s\S]*?causal,/);
assert.match(runtime,/causal_return:\s*phraseHistory\.length/);

const releaseSemver=String(release.version||'').match(/^(\d+)\.(\d+)\.(\d+)/);
assert.ok(releaseSemver,'Two Dial release semver missing');
assert.ok(Number(releaseSemver[1])===0 && Number(releaseSemver[2])===10 && Number(releaseSemver[3])>=5,'causal RETURN release requires >=0.10.5');
const mechanism=audit.mechanisms.find(m=>m.id==='fold-bloom-two-dial-relation');
assert.ok(mechanism,'Two Dial audit mechanism missing');
assert.equal(mechanism.tests.F_LIVE.verdict,'PASS');
assert.equal(mechanism.tests.G_RETURN.verdict,'PASS');
assert.equal(mechanism.decision,'PROVE_OR_DECOAXIALIZE');

console.log('TWO DIAL CAUSAL RETURN PASS · relation commit/compose → causal receipt → phrase RETURN → export');
