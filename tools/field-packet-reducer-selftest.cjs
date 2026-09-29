const assert=require('node:assert/strict');
const fs=require('node:fs');
const R=require('../lib/field-packet-reducer.js');

assert.equal(R.VERSION,'field-packet-reducer/v0.1');
assert.deepEqual(R.BUCKETS,['NOW','DELTA','RESIDUE','GATE','NEXT','ARCHIVE']);

const base={object:{id:'/x/'},authority:{source:'TEST'}};
assert.equal(R.reduce({...base,authority:{source:'CURRENT',current:true}}).bucket,'NOW');
assert.equal(R.reduce({...base,delta:{material:true,summary:'changed'},evidence:['commit:abc']}).bucket,'DELTA');
assert.equal(R.reduce({...base,residue:{kind:'DEFECT'}}).bucket,'RESIDUE');
assert.equal(R.reduce({...base,waiting:{kind:'REAL_DEVICE'}}).bucket,'GATE');
assert.equal(R.reduce({...base,next:[{id:'A'},{id:'B'},{id:'C'}]}).bucket,'NEXT');
assert.equal(R.reduce({...base,return:{disposition:'CLOSE'}}).bucket,'ARCHIVE');

assert.equal(R.reduce({...base,delta:{material:true}}).bucket,'RESIDUE');
assert.equal(R.reduce({...base,next:[1,2,3,4]}).bucket,'ARCHIVE');
assert.equal(R.reduce({...base,return:{disposition:'CONTRADICTION'}}).bucket,'RESIDUE');
assert.equal(R.reduce({...base,return:{disposition:'WAITING'}}).bucket,'GATE');
assert.equal(R.reduce({...base,return:{disposition:'TRIGGER'},next:[{id:'A'}]}).bucket,'NEXT');
assert.equal(R.reduce({authority:{current:true}}).bucket,'ARCHIVE');
assert.equal(R.reduce({object:{id:'/x/'}}).bucket,'ARCHIVE');

const p=R.project([
  {...base,authority:{current:true}},
  {...base,delta:{material:true},evidence:['r']},
  {...base,residue:'x'},
  {...base,waiting:'world'},
  {...base,next:[1]},
  {...base,return:{disposition:'CLOSE'}}
]);
assert.deepEqual(p.counts,{NOW:1,DELTA:1,RESIDUE:1,GATE:1,NEXT:1,ARCHIVE:1});
assert.equal(p.attention.length,5);

const spec=JSON.parse(fs.readFileSync('control/FIELD_PACKET_REDUCER.json','utf8'));
const audit=JSON.parse(fs.readFileSync('control/FIELD_COAXIALITY_AUDIT.json','utf8'));
assert.equal(spec.implementation.library,'/lib/field-packet-reducer.js');
assert.deepEqual(audit.tests.map(x=>x.id),['A_STATE','B_RELATION','C_GESTURE','D_IDENTITY','E_REVERSAL','F_LIVE','G_RETURN','H_COMPRESSION']);
assert.ok(audit.mechanisms.length>0,'COAXIALITY audit must remain executable rather than a paper rubric');

const html=fs.readFileSync('index.html','utf8');
assert.match(html,/lib\/field-packet-reducer\.js/);
assert.match(html,/id="packetReduce"/);
assert.match(html,/function fieldCatchPackets\(/);
assert.match(html,/FieldPacketReducer\.project/);

console.log('FIELD PACKET REDUCER SELFTEST PASS · NOW / DELTA / RESIDUE / GATE / NEXT / ARCHIVE');
