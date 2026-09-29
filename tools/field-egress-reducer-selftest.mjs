import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  reducePacket,EGRESS_CLASSES,CANONICAL_PACKET_SCHEMA,validateCanonicalPacket
} from '../lib/field-egress-reducer.mjs';

const legacyCases=[
  ['A historical cannot self-promote',
    {packet_id:'old',disposition:'HISTORICAL_PACKET_NOT_RUNNABLE_BY_PRESENCE',one_next:'do it'},
    {},'ARCHIVE'],
  ['B gate outranks next',
    {packet_id:'gate',state:'WAITING_REAL_DEVICE',one_next:'continue'},
    {},'GATE'],
  ['C current authority becomes NOW',
    {packet_id:'front',state:'ACTIVE_NOW'},
    {},'NOW'],
  ['D bounded change becomes DELTA',
    {packet_id:'delta',delta:'changed runtime',residue:['later']},
    {},'DELTA'],
  ['E explicit next becomes NEXT',
    {packet_id:'next',one_next:'run exact check'},
    {},'NEXT'],
  ['F unresolved material becomes RESIDUE',
    {packet_id:'residue',unknowns:[{id:'u1'}]},
    {},'RESIDUE'],
  ['G empty packet archives',
    {packet_id:'empty'},
    {},'ARCHIVE'],
  ['H reactivation is explicit',
    {packet_id:'reactivate',disposition:'SUPERSEDED',egress:'NOW'},
    {reactivated:true},'NOW']
];

assert.deepEqual(EGRESS_CLASSES,['NOW','DELTA','RESIDUE','GATE','NEXT','ARCHIVE']);
const contract=JSON.parse(fs.readFileSync('control/FIELD_PACKET_EGRESS.json','utf8'));
assert.equal(contract.canonical_packet_schema,CANONICAL_PACKET_SCHEMA);
assert.deepEqual(Object.keys(contract.canonical_fields),['OBJECT','AUTHORITY','STATE_IN','DELTA','EVIDENCE','STATE_OUT','RESIDUE','WAITING','NEXT','STOP']);
for(const [name,packet,ctx,want] of legacyCases){
  const got=reducePacket(packet,ctx);
  assert.equal(got.class,want,name+' -> '+JSON.stringify(got));
}
assert.equal(reducePacket({packet_id:'stale',status:'SUPERSEDED',egress:'NOW'}).class,'ARCHIVE');

// Canonical lane: strict authority + bounded continuation.
const C=(x={})=>({schema:CANONICAL_PACKET_SCHEMA,packet_id:'canonical',object:{id:'/x/'},authority:{source:'TEST'},...x});
assert.deepEqual(validateCanonicalPacket(C()),{ok:true,errors:[]});
assert.equal(validateCanonicalPacket({schema:CANONICAL_PACKET_SCHEMA,object:{id:'/x/'}}).ok,false);

let got=reducePacket({schema:CANONICAL_PACKET_SCHEMA,packet_id:'bad',object:{id:'/x/'}});
assert.equal(got.class,'ARCHIVE');
assert.equal(got.reason,'invalid_canonical_packet');
assert.deepEqual(got.validation_errors,['AUTHORITY_REQUIRED']);

got=reducePacket(C({egress:'NOW'}));
assert.equal(got.class,'ARCHIVE','explicit label cannot manufacture canonical NOW');

got=reducePacket(C({authority:{source:'CURRENT',current:true}}));
assert.equal(got.class,'NOW');

got=reducePacket(C({authority:{source:'CURRENT',current:true},stop:true,next:[{id:'A'}]}));
assert.equal(got.class,'ARCHIVE','STOP outranks current/next');

got=reducePacket(C({waiting:{kind:'REAL_DEVICE'},next:[{id:'A'}]}));
assert.equal(got.class,'GATE','WAITING outranks NEXT');

got=reducePacket(C({delta:{material:true},evidence:['commit:abc'],residue:{kind:'OPEN'}}));
assert.equal(got.class,'RESIDUE','returned residue outranks material delta');

got=reducePacket(C({delta:{material:true}}));
assert.equal(got.class,'RESIDUE');
assert.equal(got.reason,'material_delta_without_evidence');

got=reducePacket(C({delta:{material:true},evidence:['commit:abc']}));
assert.equal(got.class,'DELTA');

got=reducePacket(C({next:[1,2,3,4]}));
assert.equal(got.class,'RESIDUE');
assert.equal(got.reason,'next_exceeds_3');
assert.equal(got.next_count,4);

got=reducePacket(C({next:[{id:'A'},{id:'B'},{id:'C'}]}));
assert.equal(got.class,'NEXT');
assert.equal(got.next_count,3);

got=reducePacket(C({return:{disposition:'CONTRADICTION'},delta:'x',evidence:['x']}));
assert.equal(got.class,'RESIDUE');

got=reducePacket(C({return:{disposition:'CLOSE'},authority:{current:true}}));
assert.equal(got.class,'ARCHIVE');

got=reducePacket(C({return:{disposition:'TRIGGER'},next:[{id:'A'}]}));
assert.equal(got.class,'NEXT');
assert.equal(got.reason,'return_trigger');

got=reducePacket(C({return:{disposition:'TRIGGER'}}));
assert.equal(got.class,'ARCHIVE');
assert.equal(got.reason,'trigger_without_next');

console.log('FIELD packet egress reducer PASS · legacy A-H + canonical authority/RETURN/NEXT laws');
