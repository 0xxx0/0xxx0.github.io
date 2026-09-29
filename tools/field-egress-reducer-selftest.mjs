import assert from 'node:assert/strict';
import {reducePacket,EGRESS_CLASSES,EGRESS_PRECEDENCE} from '../lib/field-egress-reducer.mjs';

const cases=[
  ['A historical cannot self-promote',
    {packet_id:'old',disposition:'HISTORICAL_PACKET_NOT_RUNNABLE_BY_PRESENCE',one_next:'do it',egress:'NOW'},
    {},'ARCHIVE'],
  ['B conditional STOP is GATE',
    {packet_id:'gate',STOP:'Wait until real-device evidence exists.',NEXT:'continue',DELTA:'prepared'},
    {},'GATE'],
  ['C current authority becomes NOW',
    {packet_id:'front',state:'ACTIVE_NOW'},
    {now:true},'NOW'],
  ['D packet fields cannot self-authorize NOW',
    {packet_id:'claim',state:'ACTIVE_NOW',current:true,egress:'NOW'},
    {},'ARCHIVE'],
  ['E residue outranks witnessed delta',
    {packet_id:'residue-delta',DELTA:{material:true},EVIDENCE:{sufficient:true,refs:['proof']},RESIDUE:{exists:true}},
    {},'RESIDUE'],
  ['F next outranks witnessed delta',
    {packet_id:'next-delta',DELTA:{material:true},EVIDENCE:{sufficient:true},NEXT:{exists:true,executable:true,action:'continue'}},
    {},'NEXT'],
  ['G witnessed bounded change becomes DELTA',
    {packet_id:'delta',DELTA:{material:true,summary:'changed runtime'},EVIDENCE:{sufficient:true,refs:['test:ok']}},
    {},'DELTA'],
  ['H unverified delta becomes RESIDUE',
    {packet_id:'unverified',DELTA:{material:true},EVIDENCE:{sufficient:false,refs:[]}},
    {},'RESIDUE'],
  ['I explicit STOP blocks NEXT',
    {packet_id:'stop',NEXT:{exists:true,executable:true,action:'continue'},STOP:{explicit:true,reason:'closed'}},
    {},'ARCHIVE'],
  ['J STOP-until condition is GATE',
    {packet_id:'stop-until',STOP:{explicit:true,until:'real device reading'}},
    {},'GATE'],
  ['K reactivation alone is not NOW',
    {packet_id:'reactivate',disposition:'SUPERSEDED',egress:'NOW'},
    {reactivated:true},'ARCHIVE'],
  ['L reactivated + selected may become NOW',
    {packet_id:'reactivate-selected',disposition:'SUPERSEDED',egress:'ARCHIVE'},
    {reactivated:true,selected:true},'NOW'],
  ['M exists:false does not manufacture attention',
    {packet_id:'false-flags',WAITING:{exists:false,external:true},RESIDUE:{exists:false},NEXT:{exists:false,executable:true},DELTA:{material:false}},
    {},'ARCHIVE'],
  ['N legacy STOP prose blocks NEXT',
    {packet_id:'legacy-stop',one_next:'continue',stop:'closed by RETURN'},
    {},'ARCHIVE'],
  ['O explicit authority denial prevents selected NOW',
    {packet_id:'denied',AUTHORITY:{can_select_now:false}},
    {selected:true},'RESIDUE'],
  ['P packet egress label cannot manufacture NEXT',
    {packet_id:'claimed-next',egress:'NEXT'},
    {},'ARCHIVE'],
  ['Q canonical uppercase RESIDUE alias survives',
    {packet_id:'canonical-residue',DELTA:{material:true},EVIDENCE:{sufficient:true},RESIDUE:'still unresolved'},
    {},'RESIDUE'],
  ['R canonical uppercase external WAITING alias gates',
    {packet_id:'canonical-gate',WAITING:'real device',NEXT:'continue'},
    {},'GATE'],
  ['S generic WAITING is unresolved residue, not a world gate',
    {packet_id:'internal-wait',WAITING:'source ambiguity remains',NEXT:'continue'},
    {},'RESIDUE'],
  ['T inert RETURN prose is not NEXT',
    {packet_id:'return-only',DELTA:{material:true},EVIDENCE:{sufficient:true},NEXT:'RETURN to CURRENT and replan. Do not auto-continue.'},
    {},'DELTA'],
  ['U empty packet archives',
    {packet_id:'empty'},
    {},'ARCHIVE']
];

assert.deepEqual(EGRESS_CLASSES,['NOW','DELTA','RESIDUE','GATE','NEXT','ARCHIVE']);
assert.deepEqual(EGRESS_PRECEDENCE,['GATE','NOW','RESIDUE','NEXT','DELTA','ARCHIVE']);
for(const [name,packet,ctx,want] of cases){
  const got=reducePacket(packet,ctx);
  assert.equal(got.class,want,name+' -> '+JSON.stringify(got));
}

const precedence=reducePacket({
  packet_id:'all-signals',
  WAITING:{exists:true,external:true,condition:'world'},
  RESIDUE:{exists:true},
  NEXT:{exists:true,executable:true},
  DELTA:{material:true},
  EVIDENCE:{sufficient:true}
},{now:true});
assert.equal(precedence.class,'GATE','GATE must dominate NOW/RESIDUE/NEXT/DELTA');

console.log('FIELD packet egress reducer PASS · A-U · aliases + gate/residue boundary + inert RETURN + authority/evidence hardening');
