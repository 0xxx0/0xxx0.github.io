const assert=require('node:assert/strict');
const C=require('../recovery/env0/homebase-core.js');

const base=C.derive({room:'room:test',task:'service fixture',required:['tool:a','ppe:b'],nearby:['tool:a'],carried:['ppe:b']});
assert.equal(base.schema,'env0-homebase/v0.1');
assert.equal(base.authority,'LOCAL_OPERATOR_PROJECTION_ONLY');
assert.equal(base.readiness,'READY');
assert.deepEqual(base.missing,[]);
assert.deepEqual(base.relation,[{ref:'tool:a',relation:'NEARBY'},{ref:'ppe:b',relation:'CARRIED'}]);

const miss=C.derive({room:'room:test',task:'service fixture',required:'tool:a, ppe:b',nearby:'tool:a'});
assert.equal(miss.readiness,'MISSING');
assert.deepEqual(miss.missing,['ppe:b']);

const unknown=C.derive({room:'room:test',task:'inspect only'});
assert.equal(unknown.readiness,'UNKNOWN');
assert.deepEqual(unknown.missing,[]);

const noTask=C.derive({room:'room:test',required:['tool:a'],nearby:['tool:a']});
assert.equal(noTask.readiness,'NO_TASK');

let s=C.normalize({room:'room:test',task:'service fixture',required:['tool:a'],nearby:['tool:a']});
s=C.transition(s,'PREP');assert.equal(s.phase,'PREP');
s=C.transition(s,'SET_OUT');assert.equal(s.phase,'SET_OUT');
s=C.transition(s,'RETURN');assert.equal(s.phase,'RETURN');
s=C.transition({...s,carried:['tool:a']},'STOW');assert.equal(s.phase,'SERVICE');assert.deepEqual(s.carried,[]);

const receipt=C.makeReturn({room:'room:test',task:'service fixture',required:['tool:a'],nearby:['tool:a'],phase:'RETURN',service_note:'clean and stow'});
assert.equal(receipt.schema,'env0-homebase-return/v0.1');
assert.equal(receipt.readiness,'READY');
assert.match(receipt.authority,/NO HOUSEBUS ACTUATION/);
assert.equal(receipt.return_to,'/house/');
assert.ok(receipt.claims.some(x=>/not a canonical item database/i.test(x)));

const dedupe=C.refs('tool:a, tool:a\nppe:b');
assert.deepEqual(dedupe,['tool:a','ppe:b']);

console.log('ENV-0 HOMEBASE PASS · relational kit + derived readiness + session-only authority + RETURN');
