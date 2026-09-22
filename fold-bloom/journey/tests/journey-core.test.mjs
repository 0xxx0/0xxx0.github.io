import test from 'node:test';
import assert from 'node:assert/strict';
import {buildJourneyPlan,journeyEntryStart,journeyAddress,seamBehavior,nextJourneyIndex,makeJourneyReturn} from '../journey-core.js';

const set={schema:'fold-bloom-experience-set/v0.1',id:'set:test',title:'GHOST → FORGE → WILL',createdAt:'2026-09-22T00:00:00Z',updatedAt:'2026-09-22T00:00:00Z',entries:[
  {id:'a',sourceId:'sha256:a',weight:.85,transitionOut:'CARRY',landmarkIds:[]},
  {id:'b',sourceId:'sha256:b',weight:1.2,transitionIn:'CARRY',transitionOut:'DISSOLVE',landmarkIds:[]},
  {id:'c',sourceId:'sha256:c',weight:1,transitionIn:'DISSOLVE',transitionOut:'RETURN',landmarkIds:[]}
]};
const bindings=[{sourceId:'sha256:a',duration:10,label:'A'},{sourceId:'sha256:b',duration:20,label:'B'},{sourceId:'sha256:c',duration:30,label:'C'}];

test('plan preserves exact set order, source identity and seam laws',()=>{
  const plan=buildJourneyPlan(set,bindings);
  assert.equal(plan.ready,true);
  assert.deepEqual(plan.entries.map(x=>x.sourceId),set.entries.map(x=>x.sourceId));
  assert.deepEqual(plan.entries.map(x=>x.law),['CARRY','DISSOLVE','RETURN']);
  assert.equal(plan.entries[1].duration,20);
});

test('missing local bytes block readiness without mutating set identity',()=>{
  const plan=buildJourneyPlan(set,bindings.slice(0,2));
  assert.equal(plan.ready,false);
  assert.deepEqual(plan.missing,['sha256:c']);
  assert.equal(plan.setId,'set:test');
});

test('journey address preserves source time while accounting for seam projection',()=>{
  const plan=buildJourneyPlan(set,bindings);
  assert.equal(journeyEntryStart(plan,1),10);
  assert.equal(journeyEntryStart(plan,2),27.6);
  const address=journeyAddress(plan,2,5);
  assert.equal(address.sourceTime,5);
  assert.equal(address.journeyTime,32.6);
  assert.equal(address.sourceId,'sha256:c');
});

test('seam behavior is bounded and next index closes cleanly',()=>{
  assert.equal(seamBehavior('DISSOLVE').overlapSeconds,2.4);
  assert.equal(seamBehavior('RESET').gapSeconds,.65);
  const plan=buildJourneyPlan(set,bindings);
  assert.equal(nextJourneyIndex(plan,1),2);
  assert.equal(nextJourneyIndex(plan,2),null);
});

test('return receipt excludes bytes and records canonical source/journey addresses',()=>{
  const plan=buildJourneyPlan(set,bindings);
  const ret=makeJourneyReturn({plan,startedAt:'2026-09-22T01:00:00Z',completedAt:'2026-09-22T01:01:00Z',events:[{type:'SEAM',entryIndex:1,sourceId:'sha256:b',sourceTime:20,journeyTime:30,law:'DISSOLVE',at:'2026-09-22T01:00:30Z'}]});
  assert.equal(ret.status,'RETURNED');
  assert.equal(ret.sourceBytesIncluded,false);
  assert.equal(ret.events[0].law,'DISSOLVE');
  assert.equal(JSON.stringify(ret).includes('blob:'),false);
});
