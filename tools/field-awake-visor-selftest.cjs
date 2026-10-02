#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const visor=fs.readFileSync('field-awake-visor.js','utf8');
const presentation=fs.readFileSync('field-presentation.js','utf8');

assert.match(presentation,/import\('\.\/field-awake-visor\.js'\)/,'FIELD presentation must load AWAKE visor');
assert.match(visor,/FieldIndexCarrier\?\.current\?\.\(\)/,'visor must read the canonical FIELD INTERPHASE carrier');
assert.match(visor,/\/recovery\/semantic-painting-v0\.8\//,'exact painting-backed donor address missing');
for(const pair of ["['WAKE','SOURCE']","['CUT','FRAME']","['HOLD','FOCUS']","['TURN','OPERATE']","['TRACE','WITNESS']","['AGAIN','RETURN']"]){
  assert.ok(visor.includes(pair),'missing recovered AWAKE → INTERPHASE pair '+pair);
}
assert.match(visor,/Array\.isArray\(c\.next\)\?c\.next\.slice\(0,3\)/,'visor may expose more than three carrier moves');
assert.match(visor,/field-index:state/,'visor must follow FIELD focus changes');
assert.match(visor,/field\.interphase\.visor\.seen\.v02/,'bounded first-contact seen bit missing');
assert.match(visor,/QUERY\.get\('visor'\)==='1'/,'forceable proof/share mode missing');
assert.match(visor,/QUERY\.get\('visor'\)==='0'/,'explicit visor suppression missing');
assert.match(visor,/autoSuppressed/,'seen/suppressed sessions must not poll for carrier readiness');
assert.match(visor,/scrollIntoView/,'ENTER FIELD should return into the existing FIELD aperture');
assert.doesNotMatch(visor,/\bfetch\s*\(/,'visor must not fetch a second truth source');
assert.doesNotMatch(visor,/sessionStorage/,'visor must not create a cross-surface session bus');
assert.doesNotMatch(visor,/location\.(?:assign|replace)|window\.open/,'visor must not become a route/effect launcher');
assert.doesNotMatch(visor,/\/awake\//,'visor must not resurrect a separate AWAKE product route');
assert.doesNotMatch(visor,/data:image|base64,/i,'visor must not ship painting bytes or inline image payload');
assert.doesNotMatch(visor,/\.click\(\)/,'visor must not trigger native controls/effects');
console.log('FIELD AWAKE visor PASS · one app · live INTERPHASE carrier · ≤3 moves · presentation-only · no image payload');
