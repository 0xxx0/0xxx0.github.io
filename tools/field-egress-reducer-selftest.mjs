import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reducePacket,EGRESS_CLASSES,EGRESS_PRECEDENCE} from '../lib/field-egress-reducer.mjs';

const cases=[
  ['A historical cannot self-promote',
    {packet_id:'old',disposition:'HISTORICAL_PACKET_NOT_RUNNABLE_BY_PRESENCE',one_next:'do it',egress:'NOW'},
    {},'ARCHIVE'],
  ['B gate outranks next',
    {packet_id:'gate',state:'WAITING_REAL_DEVICE',one_next:'continue'},
    {},'GATE'],
  ['C current authority becomes NOW',
    {packet_id:'front',state:'ACTIVE_NOW'},
    {now:true},'NOW'],
  ['D packet fields cannot self-authorize NOW',
    {packet_id:'claim',state:'ACTIVE_NOW',current:true,egress:'NOW'},
    {},'ARCHIVE'],
  ['E residue outranks witnessed delta',
    {packet_id:'residue-delta',delta:{material:true,summary:'changed'},evidence:{sufficient:true,refs:['proof']},residue:{exists:true,summary:'edge remains'}},
    {},'RESIDUE'],
  ['F next outranks witnessed delta',
    {packet_id:'next-delta',delta:{material:true},evidence:{sufficient:true},next:{exists:true,executable:true,action:'continue'}},
    {},'NEXT'],
  ['G witnessed bounded change becomes DELTA',
    {packet_id:'delta',delta:{material:true,summary:'changed runtime'},evidence:{sufficient:true,refs:['test:ok']}},
    {},'DELTA'],
  ['H unverified delta becomes RESIDUE',
    {packet_id:'unverified',delta:{material:true,summary:'claimed change'},evidence:{sufficient:false,refs:[]}},
    {},'RESIDUE'],
  ['I explicit STOP blocks NEXT',
    {packet_id:'stop',next:{exists:true,executable:true,action:'continue'},stop:{explicit:true,reason:'closed'}},
    {},'ARCHIVE'],
  ['J STOP-until condition is GATE',
    {packet_id:'stop-until',stop:{explicit:true,until:'real device reading'}},
    {},'GATE'],
  ['K reactivation alone is not NOW',
    {packet_id:'reactivate',disposition:'SUPERSEDED',egress:'NOW'},
    {reactivated:true},'ARCHIVE'],
  ['L reactivated + selected may become NOW',
    {packet_id:'reactivate-selected',disposition:'SUPERSEDED',egress:'ARCHIVE'},
    {reactivated:true,selected:true},'NOW'],
  ['M exists:false does not manufacture attention',
    {packet_id:'false-flags',waiting:{exists:false,external:true},residue:{exists:false},next:{exists:false,executable:true},delta:{material:false}},
    {},'ARCHIVE'],
  ['N legacy STOP prose blocks NEXT',
    {packet_id:'legacy-stop',one_next:'continue',stop:'closed by RETURN'},
    {},'ARCHIVE'],
  ['O explicit authority denial prevents selected NOW',
    {packet_id:'denied',authority:{can_select_now:false}},
    {selected:true},'RESIDUE'],
  ['P packet egress label cannot manufacture NEXT',
    {packet_id:'claimed-next',egress:'NEXT'},
    {},'ARCHIVE'],
  ['Q empty packet archives',
    {packet_id:'empty'},
    {},'ARCHIVE'],
  ['R canonical WAITING outranks NEXT',
    {OBJECT:{id:'canon-gate'},WAITING:'real device',NEXT:'continue'},
    {},'GATE'],
  ['S canonical witnessed DELTA survives',
    {OBJECT:{id:'canon-delta'},DELTA:{material:true,summary:'changed'},EVIDENCE:{sufficient:true,refs:['proof']}},
    {},'DELTA'],
  ['T canonical RESIDUE outranks witnessed DELTA',
    {OBJECT:{id:'canon-residue'},RESIDUE:'one unresolved seam',DELTA:{material:true},EVIDENCE:{sufficient:true}},
    {},'RESIDUE'],
  ['U RETURN/replan-only canonical NEXT is terminal re-entry, not continuation',
    {OBJECT:{id:'canon-return'},NEXT:'RETURN to CURRENT and replan. Do not auto-continue.',DELTA:{material:true},EVIDENCE:{sufficient:true}},
    {},'DELTA'],
  ['V canonical STOP blocks NEXT',
    {OBJECT:{id:'canon-stop'},STOP:'closed by RETURN',NEXT:'continue'},
    {},'ARCHIVE'],
  ['W canonical conditional STOP is GATE',
    {OBJECT:{id:'canon-stop-until'},STOP:{explicit:true,until:'real device evidence'},NEXT:'continue'},
    {},'GATE']
];

assert.deepEqual(EGRESS_CLASSES,['NOW','DELTA','RESIDUE','GATE','NEXT','ARCHIVE']);
assert.deepEqual(EGRESS_PRECEDENCE,['GATE','NOW','RESIDUE','NEXT','DELTA','ARCHIVE']);

for(const [name,packet,ctx,want] of cases){
  const got=reducePacket(packet,ctx);
  assert.equal(got.class,want,name+' -> '+JSON.stringify(got));
}

const precedence=reducePacket({
  packet_id:'all-signals',
  waiting:{exists:true,external:true,condition:'world'},
  residue:{exists:true},
  next:{exists:true,executable:true},
  delta:{material:true},
  evidence:{sufficient:true}
},{now:true});
assert.equal(precedence.class,'GATE','GATE must dominate NOW/RESIDUE/NEXT/DELTA');

const root=readFileSync('index.html','utf8');
assert.match(root,/gap=catchGap\(r\)/,'FIELD route adapter must classify the same MORE HERE gap as RESIDUE');
assert.match(root,/delta:\{material:true,updated_at:r\.index\?\.updated_at\|\|null/,'changed route must declare material DELTA');
assert.match(root,/evidence:\{sufficient:true,refs:\['\/showcase-manifest\.json',r\.href\]\}/,'changed route DELTA must carry manifest evidence');
assert.doesNotMatch(root,/data-mode="PULSE"/,'redundant MAP/PULSE control must stay retired');
assert.doesNotMatch(root,/mapMode==='PULSE'/,'redundant PULSE renderer must stay retired');
console.log('FIELD packet egress reducer PASS · A-W · authority + witnessed DELTA + canonical aliases + terminal RETURN + PULSE subtraction');
