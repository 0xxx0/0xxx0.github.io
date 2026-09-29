import assert from 'node:assert/strict';
import {deriveFieldSourceCut,sourceWitness} from '../lib/field-source-cut.mjs';

const current={
  updated:'2026-09-29T12:00:00+08:00',
  active_fronts:[{id:'conversion',state:'ACTIVE_NOW',center:'world consequence'}],
  next_single_action:{id:'go',instruction:'Do one bounded move.'},
  current_heads:[
    {lineage:'live',route:'/live/',next_executable:{id:'selftest',state:'SELF_VERIFIED',objective:'Run exact proof.'}},
    {lineage:'phone',route:'/phone/',next_executable:{id:'phone-gate',state:'WAITING_REAL_DEVICE',objective:'Use on phone.'}}
  ]
};
const waiting={updated:'2026-09-28',items:[
  {id:'park',surface_state:'PARKED',why:'keep recoverable'},
  {id:'old',surface_state:'REMOVED',removed_reason:'superseded'},
  {id:'orphan',surface_state:'ACTIVE',state:'WAITING_REAL_DEVICE',why:'stale active claim'}
]};
const queue={updated:'2026-09-25',live:[{id:'conversion'}],held:[{id:'held',reason:'not now'}]};
const atlas={generated:'2026-09-24',provinces:[{province:'x',items:[
  {id:'later',title:'Later thing',horizon:'later'},
  {id:'nowish',title:'Nowish',horizon:'now'}
]}]};
const repoTouches=[
  {sha:'m1',subject:'comms: refresh machine-room page (x)',date:'2026-09-29T13:00:00+08:00'},
  {sha:'s1',subject:'field: semantic cut',date:'2026-09-29T13:01:00+08:00',url:'https://example.test/s1'},
  {sha:'s0',subject:'field: old cut',date:'2026-09-29T11:00:00+08:00'}
];
const cut=deriveFieldSourceCut({current,waiting,queue,atlas,repoTouches,derivedAt:'2026-09-29T14:00:00+08:00'});
assert.deepEqual(cut.buckets.NOW.map(x=>x.id),['conversion']);
assert.deepEqual(cut.buckets.DELTA.map(x=>x.id),['s1']);
assert.ok(cut.buckets.RESIDUE.some(x=>x.id==='held'));
assert.ok(cut.buckets.RESIDUE.some(x=>x.id==='park'));
assert.ok(cut.buckets.RESIDUE.some(x=>x.id==='later'));
assert.ok(cut.buckets.GATE.some(x=>x.id==='phone-gate'));
assert.ok(cut.buckets.GATE.some(x=>x.id==='orphan'&&x.authority==='WAITING_UNBACKED'));
assert.deepEqual(cut.buckets.NEXT.map(x=>x.id),['go','selftest']);
assert.deepEqual(cut.buckets.ARCHIVE.map(x=>x.id),['old']);
assert.equal(cut.witnesses.find(x=>x.source==='CURRENT').status,'VALID');
assert.equal(cut.witnesses.find(x=>x.source==='WAITING').status,'CONFLICT');
assert.equal(cut.witnesses.find(x=>x.source==='QUEUE').status,'STALE');
assert.equal(cut.witnesses.find(x=>x.source==='ATLAS').status,'STALE');
assert.equal(cut.witnesses.find(x=>x.source==='GIT').status,'VALID');

const queueConflict=sourceWitness('QUEUE',{updated:'2026-09-29T13:00:00+08:00',live:[{id:'other'}]},
  {current,repoTouches,derivedAt:'2026-09-29T14:00:00+08:00'});
assert.equal(queueConflict.status,'CONFLICT');

console.log('FIELD SOURCE CUT SELFTEST PASS');
