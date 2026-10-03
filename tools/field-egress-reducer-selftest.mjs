import assert from 'node:assert/strict';
import {reducePacket,classifyFailureReturn,EGRESS_CLASSES,EGRESS_PRECEDENCE,FAILURE_RETURN_CLASSES} from '../lib/field-egress-reducer.mjs';

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
  ['S generic WAITING text is unresolved residue',
    {packet_id:'internal-wait',WAITING:'source ambiguity remains',NEXT:'continue'},
    {},'RESIDUE'],
  ['T external WAITING array still gates',
    {packet_id:'external-array',WAITING:[{exists:true,external:true,dependency_kind:'REAL_DEVICE'}],NEXT:'continue'},
    {},'GATE'],
  ['U generic WAITING array remains residue',
    {packet_id:'internal-array',WAITING:['source ambiguity remains',{exists:true,external:false,summary:'parser uncertainty'}],NEXT:'continue'},
    {},'RESIDUE'],
  ['V named internal waiting_on remains residue',
    {packet_id:'named-internal',waiting_on:'schema reconciliation',NEXT:'continue'},
    {},'RESIDUE'],
  ['W named external blocked_by gates',
    {packet_id:'named-external',blocked_by:'human action required',NEXT:'continue'},
    {},'GATE'],
  ['X nested false metadata cannot mint external GATE',
    {packet_id:'nested-false',WAITING:{exists:true,dependency:{human:false,world:false}},NEXT:'continue'},
    {},'RESIDUE'],
  ['Y nested explicit external value gates',
    {packet_id:'nested-external',WAITING:{exists:true,dependency:{kind:'real device'}},NEXT:'continue'},
    {},'GATE'],
  ['Z inert RETURN prose is not NEXT',
    {packet_id:'return-only',DELTA:{material:true},EVIDENCE:{sufficient:true},NEXT:'RETURN to CURRENT and replan. Do not auto-continue.'},
    {},'DELTA'],
  ['AA empty packet archives',
    {packet_id:'empty'},
    {},'ARCHIVE'],
  ['AB empty evidence refs do not witness a delta',
    {packet_id:'empty-evidence-refs',DELTA:{material:true},EVIDENCE:{refs:[]}},
    {},'RESIDUE'],
  ['AC empty evidence object does not witness a delta',
    {packet_id:'empty-evidence-object',DELTA:{material:true},EVIDENCE:{}},
    {},'RESIDUE'],
  ['AD populated evidence refs still witness a delta',
    {packet_id:'populated-evidence-refs',DELTA:{material:true},EVIDENCE:{refs:['proof://exact-head']}},
    {},'DELTA'],
  ['AE failed attempt with new evidence returns RESIDUE',
    {packet_id:'fail-evidence',failure_return:'NEW_EVIDENCE',NEXT:{exists:true,executable:true,action:'retry differently'}},
    {},'RESIDUE'],
  ['AF failed attempt with changed assumption returns RESIDUE',
    {packet_id:'fail-assumption',FAILURE_RETURN:{class:'changed assumption',summary:'host contract was narrower than expected'}},
    {},'RESIDUE'],
  ['AG failed attempt with narrowed unknown returns RESIDUE',
    {packet_id:'fail-unknown',failure_return:{narrowed_unknown:true,note:'only physical IMU fidelity remains'}},
    {},'RESIDUE'],
  ['AH duplicate failure cannot manufacture NEXT',
    {packet_id:'fail-duplicate',failure_return:'DUPLICATE_NO_NEW_INFO',NEXT:{exists:true,executable:true,action:'retry same thing'}},
    {},'ARCHIVE'],
  ['AI duplicate declaration plus independent residue is preserved for review',
    {packet_id:'fail-conflict',failure_return:'duplicate',RESIDUE:{exists:true,summary:'new contradiction actually exists'},NEXT:'retry'},
    {},'RESIDUE'],
  ['AJ failure-return field does not self-authorize NOW',
    {packet_id:'fail-now',failure_return:'new evidence',egress:'NOW'},
    {},'RESIDUE']
];

assert.deepEqual(EGRESS_CLASSES,['NOW','DELTA','RESIDUE','GATE','NEXT','ARCHIVE']);
assert.deepEqual(EGRESS_PRECEDENCE,['GATE','NOW','RESIDUE','NEXT','DELTA','ARCHIVE']);
assert.deepEqual(FAILURE_RETURN_CLASSES,['NEW_EVIDENCE','CHANGED_ASSUMPTION','NARROWED_UNKNOWN','DUPLICATE_NO_NEW_INFO']);
for(const [name,packet,ctx,want] of cases){
  const got=reducePacket(packet,ctx);
  assert.equal(got.class,want,name+' -> '+JSON.stringify(got));
}

assert.equal(classifyFailureReturn({failure_return:'learned'}).class,'NEW_EVIDENCE');
assert.equal(classifyFailureReturn({failure_return:{duplicate:true}}).class,'DUPLICATE_NO_NEW_INFO');
assert.equal(classifyFailureReturn({failure_return:'not-a-class'}),null);
assert.equal(reducePacket({packet_id:'fail-evidence',failure_return:'NEW_EVIDENCE'}).failure_return,'NEW_EVIDENCE');
assert.equal(reducePacket({packet_id:'fail-duplicate',failure_return:'DUPLICATE_NO_NEW_INFO',NEXT:'retry'}).reason,'failure_return_duplicate_no_new_info');
assert.equal(reducePacket({packet_id:'fail-conflict',failure_return:'DUPLICATE_NO_NEW_INFO',RESIDUE:'contradiction'}).reason,'failure_return_duplicate_conflicts_with_material_change');

const precedence=reducePacket({
  packet_id:'all-signals',
  WAITING:{exists:true,external:true,condition:'world'},
  RESIDUE:{exists:true},
  NEXT:{exists:true,executable:true},
  DELTA:{material:true},
  EVIDENCE:{sufficient:true},
  failure_return:'NEW_EVIDENCE'
},{now:true});
assert.equal(precedence.class,'GATE','GATE must dominate NOW/RESIDUE/NEXT/DELTA/failure-return');

console.log('FIELD packet egress reducer PASS · A-AJ · explicit Hades-style failure-return + value/shape-invariant GATE/RESIDUE + aliases + authority/evidence hardening');
