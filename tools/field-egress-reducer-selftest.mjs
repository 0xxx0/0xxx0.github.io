import assert from 'node:assert/strict';
import {reducePacket,EGRESS_CLASSES} from '../lib/field-egress-reducer.mjs';

const cases=[
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
for(const [name,packet,ctx,want] of cases){
  const got=reducePacket(packet,ctx);
  assert.equal(got.class,want,name+' -> '+JSON.stringify(got));
}
const noPromotion=reducePacket({packet_id:'stale',status:'SUPERSEDED',egress:'NOW'});
assert.equal(noPromotion.class,'ARCHIVE');
console.log('FIELD packet egress reducer PASS · A-H');
