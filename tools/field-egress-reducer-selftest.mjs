import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  reducePacket,EGRESS_CLASSES,EGRESS_PRECEDENCE,CANONICAL_PACKET_SCHEMA,validateCanonicalPacket
} from '../lib/field-egress-reducer.mjs';

assert.deepEqual(EGRESS_CLASSES,['NOW','DELTA','RESIDUE','GATE','NEXT','ARCHIVE']);
assert.deepEqual(EGRESS_PRECEDENCE,['GATE','NOW','RESIDUE','NEXT','DELTA','ARCHIVE']);

const cases=[
  ['historical cannot self-promote',
    {packet_id:'old',status:'SUPERSEDED',egress:'NOW'}, {}, 'ARCHIVE'],
  ['conditional STOP is GATE',
    {packet_id:'gate',STOP:'Wait until real-device evidence exists.',NEXT:'continue',DELTA:'prepared',EVIDENCE:['r']}, {}, 'GATE'],
  ['packet-local ACTIVE_NOW cannot grant NOW',
    {packet_id:'self-now',state:'ACTIVE_NOW'}, {}, 'ARCHIVE'],
  ['caller CURRENT context grants NOW',
    {packet_id:'front',state:'ACTIVE_NOW',RESIDUE:'open',NEXT:'later',DELTA:'changed',EVIDENCE:['r']}, {now:true}, 'NOW'],
  ['authority can veto caller NOW',
    {packet_id:'veto',authority:{can_select_now:false}}, {selected:true}, 'RESIDUE'],
  ['unresolved fact outranks NEXT and DELTA',
    {packet_id:'residue',unknowns:[{id:'u1'}],NEXT:'inspect',DELTA:'candidate change',EVIDENCE:['r']}, {}, 'RESIDUE'],
  ['NEXT outranks witnessed DELTA',
    {packet_id:'next',NEXT:'run exact check',DELTA:'prepared change',EVIDENCE:['r']}, {}, 'NEXT'],
  ['unwitnessed material DELTA is residue',
    {packet_id:'delta-unproved',DELTA:{material:true,summary:'changed'}}, {}, 'RESIDUE'],
  ['witnessed DELTA survives',
    {packet_id:'delta',DELTA:{material:true,summary:'changed'},EVIDENCE:{sufficient:true,refs:['commit:a']}}, {}, 'DELTA'],
  ['material:false is inert',
    {packet_id:'false-delta',DELTA:{material:false,summary:'candidate'},EVIDENCE:['r']}, {}, 'ARCHIVE'],
  ['WAITING exists:false is inert',
    {packet_id:'false-wait',waiting:{exists:false,external:true}}, {}, 'ARCHIVE'],
  ['terminal STOP archives',
    {packet_id:'terminal',STOP:'No sequel; archive this packet.'}, {}, 'ARCHIVE'],
  ['terminal STOP preserves residue',
    {packet_id:'terminal-residue',STOP:'No sequel; archive this packet.',RESIDUE:'unresolved'}, {}, 'RESIDUE'],
  ['inert RETURN prose is not NEXT',
    {packet_id:'return-only',DELTA:'done',EVIDENCE:['r'],NEXT:'RETURN to CURRENT and replan. Do not auto-continue.'}, {}, 'DELTA'],
  ['egress label is hint only',
    {packet_id:'hint',egress:'NEXT'}, {}, 'ARCHIVE']
];
for(const [name,packet,ctx,want] of cases){
  const got=reducePacket(packet,ctx);
  assert.equal(got.class,want,name+' -> '+JSON.stringify(got));
}
assert.equal(reducePacket({packet_id:'hint',egress:'NEXT'}).input_egress_hint,'NEXT');

// Canonical field-work-packet/v0.1 lane.
const contract=JSON.parse(fs.readFileSync('control/FIELD_PACKET_EGRESS.json','utf8'));
assert.equal(contract.canonical_packet_schema,CANONICAL_PACKET_SCHEMA);
assert.deepEqual(Object.keys(contract.canonical_fields),['OBJECT','AUTHORITY','STATE_IN','DELTA','EVIDENCE','STATE_OUT','RESIDUE','WAITING','NEXT','STOP']);
assert.deepEqual(contract.precedence,EGRESS_PRECEDENCE);
const rootHtml=fs.readFileSync('index.html','utf8');
assert.match(rootHtml,/delta:\{material:true,updated_at:/,'FIELD root changed-route DELTA must stay material');
assert.match(rootHtml,/evidence:\{sufficient:true,refs:\[r\.href\+'@'/,'FIELD root changed-route DELTA must carry addressed evidence');

const C=(x={})=>({
  schema:CANONICAL_PACKET_SCHEMA,
  packet_id:'canonical',
  OBJECT:{id:'/x/'},
  AUTHORITY:{source:'TEST'},
  ...x
});

assert.deepEqual(validateCanonicalPacket(C()),{ok:true,errors:[]});
assert.equal(validateCanonicalPacket({schema:CANONICAL_PACKET_SCHEMA,OBJECT:{id:'/x/'}}).ok,false);

let got=reducePacket({schema:CANONICAL_PACKET_SCHEMA,packet_id:'bad',OBJECT:{id:'/x/'}});
assert.equal(got.class,'ARCHIVE');
assert.equal(got.reason,'invalid_canonical_packet');
assert.deepEqual(got.validation_errors,['AUTHORITY_REQUIRED']);

got=reducePacket(C({egress:'NOW'}));
assert.equal(got.class,'ARCHIVE','canonical label cannot mint NOW');

got=reducePacket(C({WAITING:'real device',NEXT:[{id:'A'}]}),{now:true});
assert.equal(got.class,'GATE','GATE outranks NOW/NEXT');

got=reducePacket(C({RESIDUE:'open',NEXT:[{id:'A'}],DELTA:'x',EVIDENCE:['r']}),{now:true});
assert.equal(got.class,'NOW','NOW outranks ordinary residue/next/delta');

got=reducePacket(C({AUTHORITY:{source:'CURRENT',can_select_now:false}}),{selected:true});
assert.equal(got.class,'RESIDUE');
assert.equal(got.reason,'selected_without_now_authority');

got=reducePacket(C({STOP:'Wait until phone proof exists.',NEXT:[{id:'A'}]}));
assert.equal(got.class,'GATE');

got=reducePacket(C({STOP:'No sequel; close packet.'}));
assert.equal(got.class,'ARCHIVE');

got=reducePacket(C({STOP:'No sequel; close packet.',RESIDUE:'unresolved'}));
assert.equal(got.class,'RESIDUE');

got=reducePacket(C({return:{disposition:'CLOSE'}}),{now:true});
assert.equal(got.class,'ARCHIVE');

got=reducePacket(C({return:{disposition:'CONTRADICTION'},NEXT:[{id:'A'}]}));
assert.equal(got.class,'RESIDUE');

got=reducePacket(C({DELTA:{material:true}}));
assert.equal(got.class,'RESIDUE');
assert.equal(got.reason,'unverified_delta');

got=reducePacket(C({DELTA:{material:true},EVIDENCE:['commit:abc']}));
assert.equal(got.class,'DELTA');

got=reducePacket(C({NEXT:[1,2,3,4]}));
assert.equal(got.class,'RESIDUE');
assert.equal(got.reason,'next_exceeds_3');
assert.equal(got.next_count,4);

got=reducePacket(C({NEXT:[{id:'A'},{id:'B'},{id:'C'}]}));
assert.equal(got.class,'NEXT');
assert.equal(got.next_count,3);

got=reducePacket(C({return:{disposition:'TRIGGER'},NEXT:[{id:'A'}]}));
assert.equal(got.class,'GATE');
assert.equal(got.reason,'return_trigger_not_executable');

got=reducePacket(C({
  return:{disposition:'TRIGGER'},
  NEXT:[{id:'A'}],
  AUTHORITY:{source:'TEST',next:true}
}));
assert.equal(got.class,'NEXT');
assert.equal(got.reason,'authorized_return_trigger');

got=reducePacket(C({return:{disposition:'TRIGGER'},AUTHORITY:{source:'TEST',next:true}}));
assert.equal(got.class,'GATE');

console.log('FIELD packet egress reducer PASS · recovered precedence + authority/evidence + canonical OBJECT/AUTHORITY/RETURN/NEXT bounds');
