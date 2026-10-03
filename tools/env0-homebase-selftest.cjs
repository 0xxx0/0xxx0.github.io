const assert=require('node:assert/strict');
const C=require('../recovery/env0/homebase-core.js');

const fit={
 schema:'0xxx0/body-fit-state/v0.1',
 fittings:[
  {id:'old-power',label:'Old battery',lifecycle:'RETIRED',superseded_by:'power'},
  {id:'power',label:'Battery pack',lifecycle:'ACTIVE'},
  {id:'boots',label:'Trail shoes',lifecycle:'FITTED'},
  {id:'paused',label:'Rain shell',lifecycle:'PAUSED'}
 ],
 kits:[
  {id:'kit-ready',name:'Field kit',purpose:'outside repair',fitting_ids:['old-power','boots']},
  {id:'kit-attn',name:'Wet kit',fitting_ids:['paused']}
 ]
};
const frozen=JSON.stringify(fit);
const snap=C.kitSnapshot(fit,'kit-ready');
assert.equal(snap.found,true);
assert.equal(snap.attention,0);
assert.equal(snap.modules[0].source_id,'old-power');
assert.equal(snap.modules[0].resolved_id,'power');
assert.equal(snap.modules[0].ready,true);

let d=C.derive({room:'room:test',task:'repair',kit_id:'kit-ready'},fit,[]);
assert.equal(d.readiness,'DECLARED_READY');
d=C.derive({room:'room:test',task:'repair',kit_id:'kit-ready'},fit,[{id:'WEATHER',state:'UNANSWERED',matches:[]}]);
assert.equal(d.readiness,'FRICTION_OPEN');
assert.deepEqual(d.friction.unanswered,['WEATHER']);
d=C.derive({room:'room:test',task:'repair',kit_id:'kit-attn'},fit,[]);
assert.equal(d.readiness,'KIT_ATTENTION');
d=C.derive({room:'room:test',task:'repair'},fit,[]);
assert.equal(d.readiness,'NO_KIT');
d=C.derive({room:'room:test',kit_id:'kit-ready'},fit,[]);
assert.equal(d.readiness,'NO_TASK');

let s=C.normalize({room:'room:test',task:'repair',kit_id:'kit-ready'});
s=C.transition(s,'PREP');assert.equal(s.phase,'PREP');
s=C.transition(s,'SET_OUT');assert.equal(s.phase,'SET_OUT');
s=C.transition(s,'RETURN');assert.equal(s.phase,'RETURN');
s=C.transition(s,'SERVICE');assert.equal(s.phase,'SERVICE');

const rows=[{id:'POWER',label:'power / charge',state:'DECLARED_MATCH',matches:[{id:'power',label:'Battery pack'}]}];
const receipt=C.makeReturn({...s,service_note:'recharge'},fit,rows);
assert.equal(receipt.schema,'env0-homebase-return/v0.1');
assert.equal(receipt.body_fit_kit.id,'kit-ready');
assert.equal(receipt.body_fit_kit.module_refs[0].resolved_id,'power');
assert.equal(receipt.readiness,'DECLARED_READY');
assert.match(receipt.authority,/BODY_FIT REMAINS LOADOUT AUTHORITY/);
assert.equal(receipt.return_to,'/house/');
assert.equal(JSON.stringify(fit),frozen,'ENV-0 must not mutate BODY/FIT state');

console.log('ENV-0 HOMEBASE PASS · HOUSE place + BODY/FIT kit refs + declared readiness + evidence-only RETURN');
