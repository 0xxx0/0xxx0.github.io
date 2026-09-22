import test from 'node:test';
import assert from 'node:assert/strict';
import {appendReleaseDeformations,applyDeformations,deformationAtTime,pruneDeformationTape} from '../track-deform.js';

const world={schema:'fold-bloom-trackfield/v0.1',time:10,duration:30,points:Array.from({length:17},(_,i)=>({t:10+i*.5,u:i/16,width:1,rise:0,bend:0,impact:.4}))};
const transport={time:10};
const event=(verb,extra={})=>({id:1,verb,operations:[verb],power:2,chain:2,span:3,slot:3,type:1,...extra});

test('BLOOM widens future terrain rather than changing source time',()=>{
  const tape=appendReleaseDeformations([],event('BLOOM'),transport);
  const out=applyDeformations(world,tape);
  assert.equal(out.points[0].t,10);
  assert.ok(out.points.some(p=>p.deformWidth>1.2));
  assert.ok(out.points.some(p=>p.deformBloom>.2));
});

test('FOLD creates a directional kink and compression',()=>{
  const tape=appendReleaseDeformations([],event('FOLD'),transport);
  const out=applyDeformations(world,tape);
  const hot=out.points.find(p=>Math.abs(p.deformLateral)>.2);
  assert.ok(hot);
  assert.ok(hot.deformWidth<1);
  assert.ok(hot.deformFold>.2);
});

test('SPLIT forks the road and RETURN can collapse the fork',()=>{
  let tape=appendReleaseDeformations([],event('SPLIT',{id:2}),transport);
  let split=deformationAtTime(tape,13.5);
  assert.ok(split.split>.2);
  tape=appendReleaseDeformations(tape,event('RETURN',{id:3,operations:['RETURN'],power:3}),{time:12.8});
  const folded=deformationAtTime(tape,14.5);
  assert.ok(folded.return>.2);
  assert.ok(folded.split<deformationAtTime([tape[0]],14.5).split);
});

test('charged cadence writes both topology verb and RETURN onto one tape',()=>{
  const tape=appendReleaseDeformations([],event('FOLD',{id:4,operations:['FOLD','RETURN']}),transport);
  assert.deepEqual(tape.map(x=>x.verb),['FOLD','RETURN']);
  assert.ok(tape[1].start>tape[0].start);
});

test('expired deformation entries prune deterministically',()=>{
  const tape=appendReleaseDeformations([],event('BLOOM'),transport);
  assert.equal(pruneDeformationTape(tape,10).length,1);
  assert.equal(pruneDeformationTape(tape,99).length,0);
});
