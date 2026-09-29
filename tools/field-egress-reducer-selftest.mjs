import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  reducePacket,EGRESS_CLASSES,EGRESS_PRECEDENCE,CANONICAL_PACKET_SCHEMA,validateCanonicalPacket
} from '../lib/field-egress-reducer.mjs';

const legacyCases=[
  ['A historical cannot self-promote',
    {packet_id:'old',disposition:'HISTORICAL_PACKET_NOT_RUNNABLE_BY_PRESENCE',one_next:'do it'},
    {},'ARCHIVE'],
  ['B conditional STOP is GATE',
    {packet_id:'gate',stop:'Wait until real-device evidence exists.',next:'continue',delta:'prepared'},
    {},'GATE'],
  ['C current authority becomes NOW',
    {packet_id:'front',state:'ACTIVE_NOW',residue:['still open'],next:'later',delta:'changed'},
    {},'NOW'],
  ['D unresolved fact outranks NEXT and DELTA',
    {packet_id:'residue',unknowns:[{id:'u1'}],one_next:'inspect',delta:'candidate change'},
    {},'RESIDUE'],
  ['E NEXT outranks DELTA',
    {packet_id:'next',one_next:'run exact check',delta:'prepared change'},
    {},'NEXT'],
  ['F DELTA survives when no higher egress exists',
    {packet_id:'delta',delta:'changed runtime'},
    {},'DELTA'],
  ['G empty packet archives',
    {packet_id:'empty'},
    {},'ARCHIVE'],
  ['H explicit reactivation still needs current selection for NOW',
    {packet_id:'reactivate',disposition:'SUPERSEDED',egress:'NOW'},
    {reactivated:true,selected:true},'NOW']
];

assert.deepEqual(EGRESS_CLASSES,['NOW','DELTA','RESIDUE','GATE','NEXT','ARCHIVE']);
assert.deepEqual(EGRESS_PRECEDENCE,['GATE','NOW','RESIDUE','NEXT','DELTA','ARCHIVE']);
for(const [name,packet,ctx,want] of legacyCases){
  const got=reducePacket(packet,ctx);
  assert.equal(got.class,want,name+' -> '+JSON.stringify(got));
}
assert.equal(reducePacket({packet_id:'stale',status:'SUPERSEDED',egress:'NOW'}).class,'ARCHIVE');
assert.equal(reducePacket({packet_id:'claimed-now',egress:'NOW'}).class,'ARCHIVE');
assert.equal(reducePacket({packet_id:'terminal',stop:'No sequel; archive this packet.'}).class,'ARCHIVE');

// Canonical field-work-packet/v0.1 lane.
const contract=JSON.parse(fs.readFileSync('control/FIELD_PACKET_EGRESS.json','utf8'));
assert.equal(contract.canonical_packet_schema,CANONICAL_PACKET_SCHEMA);
assert.deepEqual(Object.keys(contract.canonical_fields),['OBJECT','AUTHORITY','STATE_IN','DELTA','EVIDENCE','STATE_OUT','RESIDUE','WAITING','NEXT','STOP']);

const C=(x={})=>({
  schema:CANONICAL_PACKET_SCHEMA,
  packet_id:'canonical',
  object:{id:'/x/'},
  authority:{source:'TEST'},
  ...x
});

assert.deepEqual(validateCanonicalPacket(C()),{ok:true,errors:[]});
assert.equal(validateCanonicalPacket({schema:CANONICAL_PACKET_SCHEMA,object:{id:'/x/'}}).ok,false);

let got=reducePacket({schema:CANONICAL_PACKET_SCHEMA,packet_id:'bad',object:{id:'/x/'}});
assert.equal(got.class,'ARCHIVE');
assert.equal(got.reason,'invalid_canonical_packet');
assert.deepEqual(got.validation_errors,['AUTHORITY_REQUIRED']);

got=reducePacket(C({egress:'NOW'}));
assert.equal(got.class,'ARCHIVE','packet label cannot manufacture canonical NOW');

got=reducePacket(C({stop:'Wait until phone proof exists.',next:[{id:'A'}]}));
assert.equal(got.class,'GATE','conditional STOP dominates continuation');

got=reducePacket(C({stop:'No sequel; close packet.'}));
assert.equal(got.class,'ARCHIVE','terminal completed STOP closes');

got=reducePacket(C({stop:'No sequel; close packet.',residue:{kind:'UNRESOLVED_FACT'}}));
assert.equal(got.class,'RESIDUE','terminal STOP with unresolved material returns residue');

got=reducePacket(C({waiting:{kind:'REAL_DEVICE'},next:[{id:'A'}],authority:{source:'CURRENT',current:true}}));
assert.equal(got.class,'GATE','GATE outranks NOW/NEXT');

got=reducePacket(C({authority:{source:'CURRENT',current:true},residue:{kind:'OPEN'},next:[{id:'A'}],delta:'x',evidence:['r']}));
assert.equal(got.class,'NOW','NOW outranks ordinary residue/next/delta');

got=reducePacket(C({return:{disposition:'CONTRADICTION'},next:[{id:'A'}],delta:'x',evidence:['r']}));
assert.equal(got.class,'RESIDUE');

got=reducePacket(C({return:{disposition:'CLOSE'},authority:{source:'CURRENT',current:true}}));
assert.equal(got.class,'ARCHIVE','RETURN CLOSE is terminal');

got=reducePacket(C({delta:'material'}));
assert.equal(got.class,'RESIDUE');
assert.equal(got.reason,'material_delta_without_evidence');

got=reducePacket(C({delta:'material',evidence:['commit:abc']}));
assert.equal(got.class,'DELTA');

got=reducePacket(C({next:[1,2,3,4]}));
assert.equal(got.class,'RESIDUE');
assert.equal(got.reason,'next_exceeds_3');
assert.equal(got.next_count,4);

got=reducePacket(C({next:[{id:'A'},{id:'B'},{id:'C'}]}));
assert.equal(got.class,'NEXT');
assert.equal(got.next_count,3);

got=reducePacket(C({return:{disposition:'TRIGGER'},next:[{id:'A'}]}));
assert.equal(got.class,'GATE','TRIGGER without execution authorization is a gate');

got=reducePacket(C({
  return:{disposition:'TRIGGER'},
  next:[{id:'A'}],
  authority:{source:'CURRENT',next:true}
}));
assert.equal(got.class,'NEXT');
assert.equal(got.reason,'authorized_return_trigger');

got=reducePacket(C({return:{disposition:'TRIGGER'},authority:{source:'CURRENT',next:true}}));
assert.equal(got.class,'GATE','TRIGGER without executable NEXT remains a gate');

console.log('FIELD packet egress reducer PASS · recovered precedence + strict canonical authority/evidence/RETURN/NEXT');
