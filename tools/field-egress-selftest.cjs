'use strict';
const assert=require('node:assert/strict');
const E=require('../lib/field-egress.js');
const cases=[
  [{OBJECT:{id:'x'},STATE_OUT:{state:'ACTIVE'}},'NOW'],
  [{OBJECT:{id:'x'},NEXT:['OPEN','TRACE','RETURN','EXTRA']},'NEXT'],
  [{OBJECT:{id:'x'},DELTA:'changed',NEXT:['OPEN']},'DELTA'],
  [{OBJECT:{id:'x'},RESIDUE:['unresolved'],DELTA:'changed'},'RESIDUE'],
  [{OBJECT:{id:'x'},WAITING:{state:'WAITING_ON_HUMAN'},RESIDUE:['later']},'GATE'],
  [{OBJECT:{id:'x'},STOP:'CLOSE',NEXT:['SHOULD_NOT_WIN']},'ARCHIVE'],
  [{OBJECT:{id:'x'},STOP:'BLOCKED'},'GATE'],
  [{},'ARCHIVE']
];
for(const [packet,want] of cases){
  const before=JSON.stringify(packet),got=E.reduce(packet);
  assert.equal(got.bucket,want,JSON.stringify(packet));
  assert.equal(got.authority,'DERIVED_READ_ONLY');
  assert.equal(JSON.stringify(packet),before,'reducer must not mutate input');
}
assert.deepEqual(E.reduce({NEXT:['A','B','C','D']}).payload,['A','B','C'],'NEXT aperture is capped at three');
assert.deepEqual(E.reduce({OBJECT:{id:'o'},AUTHORITY:'HOST',EVIDENCE:['r1'],DELTA:'d'}).provenance,{object:{id:'o'},authority:'HOST',state_in:null,evidence:['r1']});
console.log('field-egress selftest PASS');
