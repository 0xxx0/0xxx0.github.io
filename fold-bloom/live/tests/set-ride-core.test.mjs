import test from 'node:test';
import assert from 'node:assert/strict';
import {createExperienceSet,appendSource,setSeamLaw,prepareSet} from '../../set/set-core.js';
import {
  LIVE_SET_RIDE_SCHEMA,createLiveSetRide,currentSetRideEntry,syncLiveSetRide,
  setRideSeamAction,dissolveJourneyTime,completeLiveSetRide,liveSetRideReturn
} from '../set-ride-core.js';

function fixture(law='CUT'){
  let set=createExperienceSet('LIVE SET TEST');
  set=appendSource(set,'sha256:A');
  set=appendSource(set,'sha256:B');
  set=setSeamLaw(set,0,law);
  set=prepareSet(set);
  const bindings=[
    {sourceId:'sha256:A',duration:10,label:'A',available:true},
    {sourceId:'sha256:B',duration:20,label:'B',available:true}
  ];
  return createLiveSetRide(set,bindings);
}

test('SET ride preserves one unified set identity and dual clock',()=>{
  let session=fixture('CUT');
  assert.equal(session.schema,LIVE_SET_RIDE_SCHEMA);
  assert.equal(session.ready,true);
  assert.equal(session.ride.object.kind,'SET');
  assert.equal(session.ride.object.id,session.plan.setId);
  session=syncLiveSetRide(session,{entryIndex:1,sourceTime:3.5});
  assert.equal(session.index,1);
  assert.equal(session.ride.address.sourceId,'sha256:B');
  assert.equal(session.ride.address.sourceTime,3.5);
  assert.equal(session.ride.address.journeyTime,13.5);
});

test('CUT and CARRY load the next exact source without inventing a gap',()=>{
  const cut=fixture('CUT'),carry=fixture('CARRY');
  assert.deepEqual(setRideSeamAction(cut,{sourceTime:10,ended:true}),{
    type:'LOAD_NEXT',law:'CUT',nextIndex:1,gapSeconds:0,resetLive:false,carry:false
  });
  assert.deepEqual(setRideSeamAction(carry,{sourceTime:10,ended:true}),{
    type:'LOAD_NEXT',law:'CARRY',nextIndex:1,gapSeconds:0,resetLive:false,carry:true
  });
});

test('RESET carries an explicit silent gap and live reset intent',()=>{
  const session=fixture('RESET'),action=setRideSeamAction(session,{sourceTime:10,ended:true});
  assert.equal(action.type,'RESET_NEXT');
  assert.equal(action.nextIndex,1);
  assert.equal(action.gapSeconds,.65);
  assert.equal(action.resetLive,true);
});

test('DISSOLVE opens before source end and maps overlap onto canonical journey time',()=>{
  let session=fixture('DISSOLVE');
  const action=setRideSeamAction(session,{sourceTime:7.61,ended:false});
  assert.equal(action.type,'START_DISSOLVE');
  assert.equal(action.nextIndex,1);
  assert.equal(action.durationSeconds,2.4);
  assert.equal(action.journeyTime,7.6);
  const jt=dissolveJourneyTime(session,1,1.2);
  assert.equal(jt,8.8);
  session=syncLiveSetRide(session,{journeyTime:jt});
  assert.equal(session.ride.address.seam.phase,'OVERLAP');
  assert.equal(session.ride.address.layers.length,2);
});

test('terminal source becomes a bounded RETURN with no source bytes',()=>{
  let session=fixture('CUT');
  session=syncLiveSetRide(session,{entryIndex:1,sourceTime:20});
  assert.equal(currentSetRideEntry(session).sourceId,'sha256:B');
  assert.equal(setRideSeamAction(session,{sourceTime:20,ended:true}).type,'RETURN');
  session=completeLiveSetRide(session);
  assert.equal(session.status,'RETURNED');
  assert.equal(session.ride.return.status,'REQUESTED');
  const receipt=liveSetRideReturn(session);
  assert.equal(receipt.setId,session.plan.setId);
  assert.equal(receipt.sourceBytesIncluded,false);
});
