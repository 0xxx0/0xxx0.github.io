const assert=require('node:assert/strict');
const S=require('../foundry/room/space-core.js');
const R=require('../foundry/room/rail-core.js');

const m=S.seedFurnisher();
const root=R.rail(m,null);
assert.deepEqual(root.nodes.map(n=>n.id),['intent','bound','compiler-room','return']);
assert.equal(root.seams.length,3);
assert.equal(root.seams.every(s=>s.status==='FIT'),true);
assert.notEqual(R.typeKey('INTENT').bits,R.typeKey('EVIDENCE').bits);
assert.deepEqual(R.span(root.nodes.map(n=>n.id),'bound','return'),['bound','compiler-room','return']);

const inside=R.rail(m,'compiler-room');
assert.deepEqual(inside.nodes.map(n=>n.id),['search','compile','verify']);
assert.equal(inside.seams.every(s=>s.status==='FIT'),true);

const rec=R.recipe(m,null);
assert.equal(rec.schema,'0xxx0/material-rail-recipe/v0.3');
assert.equal(rec.slots[2].id,'compiler-room');
assert.equal(rec.slots[2].child_count,3);
assert.match(rec.warning,/physical dimensions/i);

const A=R.binding(100,103,5,true);
assert.equal(A.model_fit,true);assert.equal(A.contract_fit,true);
const B=R.binding(100,108,5,true);
assert.equal(B.model_fit,false);assert.equal(B.interpretation,'MODEL_RECALIBRATION_REQUIRED');
const C=R.binding(100,103,5,false);
assert.equal(C.model_fit,true);assert.equal(C.interpretation,'PHYSICAL_CONTRACT_FAILED');

const ret=R.receipt(m,null,'compiler-room',[{kind:'focus'}],A);
assert.equal(ret.schema,'0xxx0/material-rail-return/v0.3');
assert.equal(ret.focus,'compiler-room');
assert.equal(ret.recipe.slots.length,4);

console.log('ROOM MATERIAL RAIL SELFTEST PASS ·',root.nodes.length,'root slots ·',inside.nodes.length,'inside slots');