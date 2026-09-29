const assert=require('node:assert/strict');
const R=require('../lib/field-egress-reducer.js');

assert.equal(R.VERSION,'field-egress-reducer/v0.1');
assert.deepEqual(R.EGRESS_FIELDS,['OBJECT','AUTHORITY','STATE_IN','DELTA','EVIDENCE','STATE_OUT','RESIDUE','WAITING','NEXT','STOP']);
assert.deepEqual(R.RETURN_CLASSES,['CLOSE','RESIDUE','WAITING','CONTRADICTION']);
assert.deepEqual(R.FIELD_BUCKETS,['NOW','DELTA','RESIDUE','GATE','NEXT','ARCHIVE']);

// Packet recency/state text never manufactures NOW. CURRENT context alone may do so.
let x=R.reducePacket({OBJECT:'a',STATE_OUT:'ACTIVE',NEXT:['one','two','three','four']});
assert.equal(x.buckets.NOW,false);
assert.deepEqual(x.buckets.NEXT,['one','two','three']);
assert.equal(x.primary,'NEXT');
x=R.reducePacket({OBJECT:'a',DELTA:'changed'}, {current:true});
assert.equal(x.buckets.NOW,true);
assert.equal(x.buckets.DELTA,true);
assert.equal(x.primary,'NOW');

// RETURN classes are evidence-preserving and intentionally small.
assert.equal(R.returnClass({STOP:'done'}),'CLOSE');
assert.equal(R.returnClass({RESIDUE:'untransferred detail'}),'RESIDUE');
assert.equal(R.returnClass({WAITING:'device'}),'WAITING');
assert.equal(R.returnClass({EVIDENCE:{conflict:true}}),'CONTRADICTION');
assert.equal(R.reducePacket({EVIDENCE:{conflict:true}}).primary,'GATE');

// Closed packets with no live facet contract into ARCHIVE.
x=R.reducePacket({OBJECT:'old',STOP:'SUPERSEDED'});
assert.equal(x.buckets.ARCHIVE,true);
assert.equal(x.primary,'ARCHIVE');

// FIELD aggregate: CURRENT owns NOW/NEXT; machine refreshes are not DELTA;
// PARKED/HELD are residue; REMOVED is history; unbacked ACTIVE WAITING is a conflict gate.
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
const atlas={generated:'2026-09-24',provinces:[{province:'x',items:[{id:'later',title:'Later thing',horizon:'later'},{id:'nowish',title:'Nowish',horizon:'now'}]}]};
const repoTouches=[
  {sha:'m1',subject:'comms: refresh machine-room page (x)',date:'2026-09-29T13:00:00+08:00'},
  {sha:'s1',subject:'field: semantic cut',date:'2026-09-29T13:01:00+08:00'},
  {sha:'s0',subject:'field: old cut',date:'2026-09-29T11:00:00+08:00'}
];
const cut=R.reduceField({current,waiting,queue,atlas,repoTouches});
assert.deepEqual(cut.NOW.map(v=>v.id),['conversion']);
assert.deepEqual(cut.DELTA.map(v=>v.id),['s1']);
assert.ok(cut.RESIDUE.some(v=>v.id==='held'));
assert.ok(cut.RESIDUE.some(v=>v.id==='park'));
assert.ok(cut.RESIDUE.some(v=>v.id==='later'));
assert.ok(cut.GATE.some(v=>v.id==='phone-gate'));
assert.ok(cut.GATE.some(v=>v.id==='orphan'&&v.authority==='WAITING_UNBACKED'));
assert.deepEqual(cut.NEXT.map(v=>v.id),['go','selftest']);
assert.deepEqual(cut.ARCHIVE.map(v=>v.id),['old']);

// Source witnesses separate freshness from authority and expose divergence.
const ws=R.sourceWitnesses({current,waiting,queue,atlas,derivedAt:'2026-09-29T14:00:00+08:00'});
const by=Object.fromEntries(ws.map(v=>[v.source,v]));
assert.equal(by.CURRENT.status,'VALID');
assert.equal(by.WAITING.status,'CONFLICT'); // orphan ACTIVE item is not a CURRENT gate
assert.equal(by.QUEUE.status,'STALE');
assert.equal(by.ATLAS.status,'STALE');

const qConflict=R.sourceWitness('QUEUE',{updated:'2026-09-29T13:00:00+08:00',live:[{id:'other'}]},{current,derivedAt:'2026-09-29T14:00:00+08:00'});
assert.equal(qConflict.status,'CONFLICT');

console.log('FIELD EGRESS REDUCER SELFTEST PASS');
