import assert from 'node:assert/strict';
import {reducePacket,EGRESS_CLASSES,REDUCTION_PRECEDENCE} from '../lib/field-egress-reducer.mjs';

assert.deepEqual(EGRESS_CLASSES,['NOW','DELTA','RESIDUE','GATE','NEXT','ARCHIVE']);
assert.deepEqual(REDUCTION_PRECEDENCE,['ARCHIVE:HISTORY','GATE','NOW:AUTHORITY','RESIDUE','NEXT','DELTA:EVIDENCED','ARCHIVE:DEFAULT']);

const cases=[
  ['A history cannot self-promote',
    {packet_id:'old',disposition:'HISTORICAL_PACKET_NOT_RUNNABLE_BY_PRESENCE',one_next:'do it'},
    {},'ARCHIVE'],
  ['B explicit NEXT cannot bypass GATE',
    {packet_id:'gate-next',egress:'NEXT',waiting_on:'real phone',one_next:'continue'},
    {},'GATE'],
  ['C current authority becomes NOW',
    {packet_id:'front',state:'ACTIVE_NOW'},
    {},'NOW'],
  ['D explicit NOW without authority becomes RESIDUE',
    {packet_id:'self-now',egress:'NOW'},
    {},'RESIDUE'],
  ['E residue outranks proved delta and next',
    {packet_id:'residue',delta:'changed runtime',evidence:['test PASS'],residue:['one unresolved seam'],next:'continue'},
    {},'RESIDUE'],
  ['F unproved delta becomes RESIDUE',
    {packet_id:'claim',host_delta:'claimed runtime change'},
    {},'RESIDUE'],
  ['G candidate next outranks already-proved delta',
    {packet_id:'next',delta:'changed runtime',verification:{test:'PASS'},one_next:'run exact check'},
    {},'NEXT'],
  ['H proved delta becomes DELTA',
    {packet_id:'delta',DELTA:['changed runtime'],EVIDENCE:{test:'PASS'}},
    {},'DELTA'],
  ['I replan-only NEXT does not manufacture continuation',
    {packet_id:'done',delta:'changed runtime',verification:{test:'PASS'},next:'RETURN to CURRENT and replan. Do not auto-continue.'},
    {},'DELTA'],
  ['J empty packet archives',
    {packet_id:'empty'},
    {},'ARCHIVE'],
  ['K explicit ARCHIVE stays quiet even with stale next prose',
    {packet_id:'quiet',egress:'ARCHIVE',one_next:'old instruction'},
    {},'ARCHIVE'],
  ['L history reactivation still needs NOW authority',
    {packet_id:'reactivate',status:'SUPERSEDED',egress:'NOW'},
    {reactivated:true},'RESIDUE'],
  ['M history reactivation + explicit selection may become NOW',
    {packet_id:'reactivate-selected',status:'SUPERSEDED',egress:'NOW'},
    {reactivated:true,selected:true},'NOW']
];

for(const [name,packet,ctx,want] of cases){
  const got=reducePacket(packet,ctx);
  assert.equal(got.class,want,name+' -> '+JSON.stringify(got));
}
console.log('FIELD packet egress reducer PASS · precedence / authority / evidence');
