import test from 'node:test';
import assert from 'node:assert/strict';
import {courseFromEventTape,swingWitness,classifySwing,collectMisses,updateClockEstimate,trackTimeForHostPerf,boundedHitTrace,buildReturn,SABER_COURSE_SCHEMA} from '../saber-core.js';

const tape={schema:'fold-bloom-event-tape/v0.1',sourceId:'sha256:test',duration:20,bpm:120,events:Array.from({length:40},(_,i)=>({id:'beat:'+i,kind:'BEAT',t:i*.5,energy:.5}))};

test('course deterministically compiles existing event tape into alternating addressed saber notes',()=>{
  const a=courseFromEventTape(tape),b=courseFromEventTape(tape);
  assert.equal(a.schema,SABER_COURSE_SCHEMA);
  assert.equal(a.noteCount,40);
  assert.deepEqual(a,b);
  assert.equal(a.notes[0].hand,'LEFT');
  assert.equal(a.notes[1].hand,'RIGHT');
  assert.equal(a.sourceId,'sha256:test');
});

test('swing classification keeps hand/time/direction causal and bounded',()=>{
  const course=courseFromEventTape(tape);
  const note=course.notes[0];
  const sample={hand:'LEFT',seq:1,clientTime:100,rotationRate:{beta:-120,gamma:0},acceleration:{x:0,y:1,z:0}};
  const w=swingWitness(sample);
  assert.equal(w.direction,'UP');
  const hit=classifySwing(course,new Set(),sample,note.t+.05);
  assert.equal(hit.outcome,'HIT');
  assert.equal(hit.noteId,note.id);
  const graze=classifySwing(course,new Set(),{...sample,rotationRate:{beta:0,gamma:120}},note.t+.28);
  assert.equal(graze.outcome,'GRAZE');
});

test('misses emerge from source time without consuming raw motion',()=>{
  const course=courseFromEventTape(tape);
  const misses=collectMisses(course,new Set(),1.2);
  assert.ok(misses.length>=2);
  assert.ok(misses.every(x=>x.outcome==='MISS'));
});

test('clock estimate maps controller monotonic time into host transport time',()=>{
  const clock=updateClockEstimate(null,{hostSent:1000,hostRecv:1040,clientNow:520});
  assert.equal(clock.offsetMs,500);
  assert.equal(clock.rttMs,40);
  const t=trackTimeForHostPerf({audioTime:10,hostNow:2000,sampleHostPerf:1900,playing:true});
  assert.ok(Math.abs(t-9.9)<1e-9);
});

test('RETURN retains bounded hit evidence but no continuous sensor stream',()=>{
  const course=courseFromEventTape(tape);
  let trace=[];
  trace=boundedHitTrace(trace,{noteId:'beat:0',sourceEventId:'beat:0',sourceTime:0,observedTime:.03,hand:'LEFT',expectedDirection:'UP',observedDirection:'UP',intensity:120,dt:.03,outcome:'HIT'});
  const ret=buildReturn({course,trace,roles:{local:'LEFT',remote:'RIGHT'},createdAt:'2026-09-25T00:00:00Z'});
  assert.equal(ret.rawMotionRetained,false);
  assert.equal(ret.counts.HIT,1);
  assert.equal(ret.hitTrace.length,1);
  assert.equal(ret.roles.remote,'RIGHT');
});
