import test from 'node:test';
import assert from 'node:assert/strict';
import {
  circularDistance,relationVerb,relationName,runOutcome,puzzleStars,puzzleOutcome,
  duetOutcome,gardenGoalMet,gardenSummary,gardenProgress,gardenOutcome
} from '../play-core.js';

test('Two Dial relation law is symmetric over six positions',()=>{
  assert.equal(relationVerb(0,0),'BLOOM');
  assert.equal(relationVerb(0,1),'FOLD');
  assert.equal(relationVerb(0,2),'RETURN');
  assert.equal(relationVerb(0,3),'SPLIT');
  assert.equal(relationVerb(0,4),'RETURN');
  assert.equal(relationVerb(0,5),'FOLD');
  assert.equal(relationName(5,0),'NEAR');
  assert.equal(circularDistance(5,1),2);
});
test('RUN clears at six of eight',()=>{
  assert.equal(runOutcome(5,8).clear,false);
  assert.equal(runOutcome(6,8).clear,true);
  assert.equal(runOutcome(8,8).label,'PERFECT ROAD');
});
test('PUZZLE rewards shortest-turn solutions',()=>{
  assert.equal(puzzleStars(true,2,2),3);
  assert.equal(puzzleStars(true,3,2),2);
  assert.equal(puzzleStars(true,5,2),1);
  assert.equal(puzzleStars(false,0,0),0);
  assert.equal(puzzleOutcome(10).clear,true);
});
test('DUET clears at five synchronized calls of six',()=>{
  assert.equal(duetOutcome(4,6).clear,false);
  assert.equal(duetOutcome(5,6).clear,true);
});
test('GARDEN pressures are legible and bounded',()=>{
  const events=[
    {verb:'BLOOM',chain:1,callMet:true},
    {verb:'FOLD',chain:2,callMet:true},
    {verb:'RETURN',chain:1,callMet:true},
    {verb:'BLOOM',chain:1,callMet:false},
  ];
  assert.equal(gardenGoalMet('BODY',events),true);
  assert.equal(gardenGoalMet('PATH',events),true);
  assert.equal(gardenGoalMet('VOICE',events),true);
  assert.deepEqual(gardenSummary(events),{hits:3,best:2,structural:2,verbs:['BLOOM','FOLD','RETURN','BLOOM']});
  assert.deepEqual(gardenProgress('BODY',events),{value:2,target:2,label:'CHAIN 2× / 2×',complete:true});
  assert.deepEqual(gardenProgress('PATH',events),{value:2,target:2,label:'STRUCTURE 2 / 2',complete:true});
  assert.deepEqual(gardenProgress('VOICE',events),{value:3,target:3,label:'CALLS 3 / 3',complete:true});
  assert.equal(gardenOutcome(2).clear,true);
});
