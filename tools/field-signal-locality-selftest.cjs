const assert=require('node:assert/strict');
const fs=require('node:fs');
const Signal=require('../lib/field-signal.js');
const html=fs.readFileSync('index.html','utf8');

assert.equal(Signal.combine({changed:false,reality:false,external:false}),'CLEAR');
assert.equal(Signal.combine({changed:true,reality:false,external:false}),'CHANGED');
assert.equal(Signal.combine({changed:false,reality:true,external:false}),'REALITY');
assert.equal(Signal.combine({changed:true,reality:true,external:false}),'MIXED');

assert.match(html,/function routeSignal\(r\)/,'route-local signal derivation missing');
assert.match(html,/currentHumanGates\(\)\.some\(g=>g\.route===r\.href\)/,'reality signal must bind exact addressed route');
assert.match(html,/\(issues\|\|\[\]\)\.some\(x=>x\.route===r\.href\)/,'external signal must require explicit route address');
assert.match(html,/class="feedChip fieldSignalBar /,'compact field marks do not carry semantic signal');
assert.match(html,/data-field-signal="'\+esc\(signal\)/,'feed signal token missing');
assert.match(html,/function applyFocusSignal\(\)/,'held-focus signal projection missing');
assert.match(html,/FieldSignal\?\.apply\(bar,token\)/,'held-focus signal not applied from route-local token');
assert.doesNotMatch(html,/FieldSignal\?\.apply\(\$\('focusHead'\),signal\)/,'global CATCH signal still leaks into held object');
assert.match(html,/route:p\.route\|\|null/,'live GitHub issue refresh must preserve explicit snapshot route when present');

console.log('FIELD SIGNAL LOCALITY PASS · global summary remains global; addressed glyphs receive only owned signal');
