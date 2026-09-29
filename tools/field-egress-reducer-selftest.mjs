import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reducePacket,EGRESS_CLASSES,EGRESS_PRECEDENCE} from '../lib/field-egress-reducer.mjs';

const cases=[
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
for(const [name,packet,ctx,want] of cases){
  const got=reducePacket(packet,ctx);
  assert.equal(got.class,want,name+' -> '+JSON.stringify(got));
}
assert.equal(reducePacket({packet_id:'stale',status:'SUPERSEDED',egress:'NOW'}).class,'ARCHIVE');
assert.equal(reducePacket({packet_id:'claimed-now',egress:'NOW'}).class,'ARCHIVE');
assert.equal(reducePacket({packet_id:'terminal',stop:'No sequel; archive this packet.'}).class,'ARCHIVE');
assert.equal(reducePacket({packet_id:'canonical-residue',DELTA:'changed',RESIDUE:'still unresolved'}).class,'RESIDUE');
assert.equal(reducePacket({packet_id:'explicit-residue',egress:'RESIDUE',delta:'candidate'}).class,'RESIDUE');
assert.equal(reducePacket({packet_id:'explicit-next',egress:'NEXT',delta:'prepared'}).class,'NEXT');
assert.equal(reducePacket({packet_id:'return-only',DELTA:'done',NEXT:'RETURN to CURRENT and replan. Do not auto-continue.'}).class,'DELTA');
assert.equal(reducePacket({packet_id:'canonical-gate',WAITING:'real device',NEXT:'continue'}).class,'GATE');
const root=readFileSync('index.html','utf8');
assert.match(root,/import\('\.\/lib\/field-egress-reducer\.mjs'\)/,'FIELD root must consume canonical reducer');
assert.match(root,/function fieldEgressForRoute\(/,'FIELD root must expose one route-local adapter');
assert.match(root,/evidence=\[h\?\.latest_return,r\.latest_return,r\.receipt,r\.convergence_return\]/,'receipts must stay evidence/provenance');
assert.match(root,/gap\?\{residue:\[gap\]\}/,'only an actual unresolved catch gap may feed route residue');
assert.doesNotMatch(root,/id="catchReducer"/,'do not add a six-bin packet dashboard');
assert.doesNotMatch(root,/data-mode="PULSE"/,'redundant PULSE control must stay deleted');
assert.doesNotMatch(root,/mapMode==='PULSE'/,'PULSE renderer must stay deleted');
console.log('FIELD packet egress reducer PASS · precedence + aliases + inert RETURN + compact root projection + PULSE subtraction');
