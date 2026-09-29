import assert from 'node:assert/strict';
import {
  reducePacket,EGRESS_CLASSES,EGRESS_PRECEDENCE,EGRESS_FIELDS,RETURN_CLASSES,FIELD_BUCKETS,
  returnClass,reduceField,sourceWitness,sourceWitnesses
} from '../lib/field-egress-reducer.mjs';

assert.deepEqual(EGRESS_CLASSES,['NOW','DELTA','RESIDUE','GATE','NEXT','ARCHIVE']);
assert.deepEqual(EGRESS_PRECEDENCE,['GATE','NOW','RESIDUE','NEXT','DELTA','ARCHIVE']);
assert.deepEqual(EGRESS_FIELDS,['OBJECT','AUTHORITY','STATE_IN','DELTA','EVIDENCE','STATE_OUT','RESIDUE','WAITING','NEXT','STOP']);
assert.deepEqual(RETURN_CLASSES,['CLOSE','RESIDUE','WAITING','CONTRADICTION']);
assert.deepEqual(FIELD_BUCKETS,['NOW','DELTA','RESIDUE','GATE','NEXT','ARCHIVE']);

// A–H reducer acceptance: exact recovered precedence and non-promotion.
const cases=[
  ['A historical cannot self-promote',
    {packet_id:'old',disposition:'HISTORICAL_PACKET_NOT_RUNNABLE_BY_PRESENCE',one_next:'do it'},
    {},'ARCHIVE'],
  ['B conditional STOP is GATE and blocks NEXT/DELTA',
    {packet_id:'gate',stop:'Wait until real-device evidence exists.',next:'continue',delta:'prepared'},
    {},'GATE'],
  ['C external CURRENT/selection alone may create NOW',
    {packet_id:'front',state:'ACTIVE_NOW',residue:['still open'],next:'later',delta:'changed'},
    {now:true},'NOW'],
  ['D unresolved fact outranks NEXT and DELTA',
    {packet_id:'residue',unknowns:[{id:'u1'}],one_next:'inspect',delta:'candidate change'},
    {},'RESIDUE'],
  ['E NEXT outranks DELTA',
    {packet_id:'next',one_next:'run exact check',delta:'prepared change'},
    {},'NEXT'],
  ['F DELTA survives when no higher egress exists',
    {packet_id:'delta',delta:'changed runtime'},
    {},'DELTA'],
  ['G completed STOP closes to ARCHIVE and never NEXT',
    {packet_id:'closed',stop:'Completed; no sequel.',next:'should not run',delta:'historic change'},
    {},'ARCHIVE'],
  ['H reactivation removes history block but selected context still grants NOW',
    {packet_id:'reactivate',disposition:'SUPERSEDED',egress:'NOW'},
    {reactivated:true,selected:true},'NOW']
];
for(const [name,packet,ctx,want] of cases){
  const got=reducePacket(packet,ctx);
  assert.equal(got.class,want,name+' -> '+JSON.stringify(got));
}

// Packet-owned labels/state/current flags may never mint NOW or GATE.
for(const packet of [
  {packet_id:'claim-egress',egress:'NOW'},
  {packet_id:'claim-state',state:'ACTIVE_NOW'},
  {packet_id:'claim-current',current:true},
  {packet_id:'claim-status',status:'NOW'}
]) assert.notEqual(reducePacket(packet).class,'NOW',JSON.stringify(packet)+' self-promoted to NOW');
assert.notEqual(reducePacket({packet_id:'claim-gate',egress:'GATE'}).class,'GATE','egress label self-promoted to GATE');

// STOP+unresolved fact → RESIDUE; STOP+completed/no residue → ARCHIVE.
assert.equal(reducePacket({packet_id:'stop-residue',stop:'Stop: unresolved source identity.',next:'guess'}).class,'RESIDUE');
assert.equal(reducePacket({packet_id:'stop-done',stop:'Done.',next:'autoplay'}).class,'ARCHIVE');

// RETURN classes remain evidence-preserving and intentionally small.
assert.equal(returnClass({STOP:'done'}),'CLOSE');
assert.equal(returnClass({RESIDUE:'untransferred detail'}),'RESIDUE');
assert.equal(returnClass({WAITING:'device'}),'WAITING');
assert.equal(returnClass({EVIDENCE:{conflict:true}}),'CONTRADICTION');

// FIELD aggregate: CURRENT owns NOW/NEXT; generated machine refreshes are not
// semantic DELTA; PARKED/HELD are residue; REMOVED is history; unbacked ACTIVE
// WAITING is a visible conflict gate.
const current={
  updated:'2026-09-29T12:00:00+08:00',
  active_fronts:[{id:'conversion',state:'ACTIVE_NOW',center:'world consequence'}],
  next_single_action:{id:'go',instruction:'Do one bounded move.'},
  current_heads:[
    {lineage:'live',route:'/live/',next_executable:{id:'selftest',state:'SELF_VERIFIED',objective:'Run exact proof.'}},
    {lineage:'phone',route:'/phone/',next_executable:{id:'phone-gate',state:'WAITING_REAL_DEVICE',objective:'Use on phone.'}}
  ]
};
const waiting={updated:'2026-09-28T12:00:00+08:00',items:[
  {id:'park',surface_state:'PARKED',why:'keep recoverable'},
  {id:'old',surface_state:'REMOVED',removed_reason:'superseded'},
  {id:'orphan',surface_state:'ACTIVE',state:'WAITING_REAL_DEVICE',why:'stale active claim'}
]};
const queue={updated:'2026-09-25T12:00:00+08:00',live:[{id:'conversion'}],held:[{id:'held',reason:'not now'}]};
const atlas={generated:'2026-09-24T12:00:00+08:00',provinces:[{province:'x',items:[
  {id:'later',title:'Later thing',horizon:'later'},
  {id:'nowish',title:'Nowish',horizon:'now'}
]}]};
const repoTouches=[
  {sha:'m1',subject:'comms: refresh machine-room page (x)',date:'2026-09-29T13:00:00+08:00'},
  {sha:'m2',subject:'nexus: board refresh (x)',date:'2026-09-29T13:00:30+08:00'},
  {sha:'s1',subject:'field: semantic cut',date:'2026-09-29T13:01:00+08:00'},
  {sha:'s0',subject:'field: old cut',date:'2026-09-29T11:00:00+08:00'}
];
const cut=reduceField({current,waiting,queue,atlas,repoTouches});
assert.deepEqual(cut.NOW.map(v=>v.id),['conversion']);
assert.deepEqual(cut.DELTA.map(v=>v.id),['s1']);
assert.ok(cut.RESIDUE.some(v=>v.id==='held'));
assert.ok(cut.RESIDUE.some(v=>v.id==='park'));
assert.ok(cut.RESIDUE.some(v=>v.id==='later'));
assert.ok(cut.GATE.some(v=>v.id==='phone-gate'));
assert.ok(cut.GATE.some(v=>v.id==='orphan'&&v.authority==='WAITING_UNBACKED'));
assert.deepEqual(cut.NEXT.map(v=>v.id),['go','selftest']);
assert.deepEqual(cut.ARCHIVE.map(v=>v.id),['old']);

// Source freshness is visible but never changes source authority.
const ws=sourceWitnesses({current,waiting,queue,atlas,derivedAt:'2026-09-29T14:00:00+08:00'});
const by=Object.fromEntries(ws.map(v=>[v.source,v]));
assert.equal(by.CURRENT.status,'VALID');
assert.equal(by.WAITING.status,'CONFLICT');
assert.equal(by.QUEUE.status,'STALE');
assert.equal(by.ATLAS.status,'STALE');
const qConflict=sourceWitness('QUEUE',{updated:'2026-09-29T13:00:00+08:00',live:[{id:'other'}]},{current,derivedAt:'2026-09-29T14:00:00+08:00'});
assert.equal(qConflict.status,'CONFLICT');

console.log('FIELD packet egress reducer PASS · A-H · GATE→NOW→RESIDUE→NEXT→DELTA→ARCHIVE · CURRENT-only NOW');
