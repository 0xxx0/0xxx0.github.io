import test from 'node:test';
import assert from 'node:assert/strict';
import {createPracticeMap} from '../../live/practice-track.js';
import {advanceStepRide,createStepRide,setStepRideScope,stepRideMinimap,stepRideView} from '../step-core.js';

test('turn-step ride advances deterministically without wall clock',()=>{
  const map=createPracticeMap({duration:96,bpm:108}),a=createStepRide(map,{steps:49}),b=createStepRide(map,{steps:49});
  const a1=advanceStepRide(map,a,7,'FOLD'),b1=advanceStepRide(map,b,7,'FOLD');
  assert.deepEqual(a1,b1);
  const view=stepRideView(map,a1);
  assert.equal(view.turn,8);
  assert.equal(view.transport.playing,false);
  assert.ok(view.time>13&&view.time<15);
  assert.equal(view.operations.at(-1).operation,'FOLD');
});

test('track and section minimaps preserve same cursor address at different scope',()=>{
  const map=createPracticeMap({duration:96,bpm:108});
  let state=createStepRide(map,{steps:49,index:25,scope:'TRACK'});
  const track=stepRideMinimap(map,state,{samples:40}),view=stepRideView(map,state);
  state=setStepRideScope(map,state,'SECTION');
  const section=stepRideMinimap(map,state,{samples:40});
  assert.equal(track.scope,'TRACK');
  assert.equal(section.scope,'SECTION');
  assert.equal(track.points.length,40);
  assert.equal(section.points.length,40);
  assert.ok(section.start<=view.time&&section.end>=view.time);
  assert.ok(section.end-section.start<track.end-track.start);
  assert.ok(track.cursor>0&&track.cursor<1);
  assert.ok(section.cursor>=0&&section.cursor<=1);
});
