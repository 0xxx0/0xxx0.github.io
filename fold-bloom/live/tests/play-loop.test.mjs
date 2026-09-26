import test from 'node:test';
import assert from 'node:assert/strict';
import {loopContract,loopContracts,loopWitness,partitionTurnDelta,PLAY_LOOP_CONTRACT_VERSION} from '../play-loop.js';

test('loop contracts expose six distinct reusable loop archetypes',()=>{
  const cs=loopContracts();
  assert.equal(PLAY_LOOP_CONTRACT_VERSION,'FOLD_BLOOM_PLAY_LOOP_0.1');
  assert.deepEqual(Object.keys(cs),['PLAY','PUZZLE','PATH','DUET','GARDEN','ZEN']);
  assert.equal(loopContract('PLAY').archetype,'REPEAT');
  assert.equal(loopContract('PUZZLE').archetype,'FORM_CHANGE');
  assert.equal(loopContract('PATH').archetype,'OPTIMIZE');
  assert.equal(loopContract('DUET').archetype,'COORDINATE');
  assert.equal(loopContract('GARDEN').archetype,'SELECT_INHERIT');
  assert.equal(loopContract('ZEN').archetype,'OPEN_PRACTICE');
});

test('generic witness normalizes progress without taking source authority',()=>{
  const run=loopWitness('PLAY',{active:true,releases:3,hits:2,win:{run:{clear:false}}});
  assert.equal(run.authority,'DERIVED_WITNESS_ONLY');
  assert.equal(run.phase,'RUN');
  assert.deepEqual(run.progress,{value:3,target:8});
  assert.deepEqual(run.success,{value:2,target:6});

  const hex=loopWitness('PUZZLE',{active:true,hex:{phase:'CHANGE',moves:2,change:{changed:[2,5],clear:true},delta:{moving:[2,5]}}});
  assert.equal(hex.phase,'CHANGE');
  assert.deepEqual(hex.progress,{value:2,target:4});
  assert.deepEqual(hex.success,{value:2,target:2});

  const choice=loopWitness('GARDEN',{active:false,ended:false,garden:{generation:2,trait:'PATH',survived:1}});
  assert.equal(choice.phase,'CHOOSE');
  assert.equal(choice.status,'CHOICE');
});

test('turn partition preserves motion before and after a sampled release',()=>{
  assert.deepEqual(partitionTurnDelta(10,16,14),{before:3,after:2,total:5});
  assert.deepEqual(partitionTurnDelta(10,13,null),{before:3,after:0,total:3});
  assert.deepEqual(partitionTurnDelta(10,10,11),{before:0,after:0,total:0});
});
