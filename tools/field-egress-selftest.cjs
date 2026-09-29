'use strict';
const assert=require('assert');
const E=require('../lib/field-egress.js');
assert.deepStrictEqual(E.ORDER,['NOW','GATE','DELTA','NEXT','RESIDUE','ARCHIVE']);
const cases=[
  [{now:true,gate:true,delta:true,next:true,residue:true},'NOW'],
  [{gate:true,delta:true,next:true,residue:true},'GATE'],
  [{delta:true,next:true,residue:true},'DELTA'],
  [{next:true,residue:true},'NEXT'],
  [{residue:true},'RESIDUE'],
  [{},'ARCHIVE']
];
for(const [input,want] of cases){
  assert.strictEqual(E.classify(input),want,JSON.stringify(input));
  const r=E.reduce(input);
  assert.strictEqual(r.bucket,want);
  assert.strictEqual(r.authority,'PROJECTION_ONLY');
}
console.log('field-egress-selftest: PASS',cases.length);
