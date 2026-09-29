import assert from 'node:assert/strict';
import {deriveSourceWitnesses,sourceWitness} from '../lib/field-source-witness.mjs';

const current={
 updated:'2026-09-29T12:00:00+08:00',
 active_fronts:[{id:'conversion',state:'ACTIVE_NOW'}],
 current_heads:[{lineage:'phone',route:'/phone/',next_executable:{id:'phone-gate',state:'WAITING_REAL_DEVICE'}}]
};
const waiting={updated:'2026-09-28',items:[
 {id:'phone-gate',surface_state:'ACTIVE',state:'WAITING_REAL_DEVICE'},
 {id:'orphan',surface_state:'ACTIVE',state:'WAITING_REAL_DEVICE'}
]};
const queue={updated:'2026-09-25',live:[{id:'conversion'}],held:[]};
const atlas={generated:'2026-09-24',provinces:[]};
const repoTouches=[{sha:'abc1234567890',subject:'field: semantic cut',date:'2026-09-29T13:00:00+08:00'}];
const xs=deriveSourceWitnesses({current,waiting,queue,atlas,repoTouches,derivedAt:'2026-09-29T14:00:00+08:00'});
const by=Object.fromEntries(xs.map(x=>[x.source,x]));
assert.equal(by.CURRENT.status,'VALID');
assert.equal(by.WAITING.status,'CONFLICT');
assert.equal(by.QUEUE.status,'STALE');
assert.equal(by.ATLAS.status,'STALE');
assert.equal(by.GIT.status,'VALID');
assert.equal(by.GIT.head,'GIT@abc123456789');
assert.ok(by.CURRENT.source_age_ms>0);

const qConflict=sourceWitness('QUEUE',{updated:'2026-09-29T13:00:00+08:00',live:[{id:'other'}]},
 {current,repoTouches,derivedAt:'2026-09-29T14:00:00+08:00'});
assert.equal(qConflict.status,'CONFLICT');

const cached=sourceWitness('GIT',null,{current,repoTouches:[{sha:'cachedsha1234',date:'2026-09-29T13:00:00+08:00',cached:true}],derivedAt:'2026-09-29T14:00:00+08:00'});
assert.equal(cached.status,'STALE');

console.log('FIELD SOURCE WITNESS SELFTEST PASS');
