import test from 'node:test';
import assert from 'node:assert/strict';
import {createExperienceSet,appendSource,setSeamLaw,prepareSet} from '../../set/set-core.js';
import {buildJourneyPlan,journeyEntryStart} from '../../journey/journey-core.js';
import {
  UNIFIED_RIDE_SCHEMA,singleSourcePlan,rideAddressAtJourneyTime,seamDisposition,
  createUnifiedRideState,withJourneyTime,withSourceTime,setRideProjection,
  captureRideReturn,requestRideReturn
} from '../ride-state.js';

function planWith(law){
  let set=createExperienceSet('TEST');
  set=appendSource(set,'sha256:A');
  set=appendSource(set,'sha256:B');
  set=setSeamLaw(set,0,law);
  set=prepareSet(set);
  return buildJourneyPlan(set,[
    {sourceId:'sha256:A',duration:10,label:'A',available:true},
    {sourceId:'sha256:B',duration:20,label:'B',available:true}
  ]);
}

test('single source uses the same RIDE address law without becoming a SET',()=>{
  const plan=singleSourcePlan({sourceId:'sha256:ONE',duration:30,label:'ONE'});
  const state=createUnifiedRideState({plan,journeyTime:12});
  assert.equal(state.schema,UNIFIED_RIDE_SCHEMA);
  assert.equal(state.object.kind,'AUDIO');
  assert.equal(state.object.id,'sha256:ONE');
  assert.equal(state.address.sourceTime,12);
  assert.equal(state.address.journeyTime,12);
  assert.equal(state.address.journeyDuration,30);
  assert.equal(state.address.seam.phase,'SOURCE');
});

test('CUT switches source at one exact journey address',()=>{
  const plan=planWith('CUT');
  assert.equal(journeyEntryStart(plan,1),10);
  const before=rideAddressAtJourneyTime(plan,9.999);
  const after=rideAddressAtJourneyTime(plan,10);
  assert.equal(before.sourceId,'sha256:A');
  assert.equal(after.sourceId,'sha256:B');
  assert.equal(after.sourceTime,0);
  assert.equal(after.journeyTime,10);
  assert.equal(after.seam.phase,'ENTER');
  assert.equal(after.seam.law,'CUT');
  assert.equal(seamDisposition(after).audio,'CUT');
});

test('DISSOLVE is one journey address with outgoing and incoming source clocks',()=>{
  const plan=planWith('DISSOLVE');
  assert.equal(journeyEntryStart(plan,1),7.6);
  const x=rideAddressAtJourneyTime(plan,8.8);
  assert.equal(x.sourceId,'sha256:B');
  assert.equal(x.sourceTime,1.2);
  assert.equal(x.journeyTime,8.8);
  assert.equal(x.seam.phase,'OVERLAP');
  assert.equal(x.seam.law,'DISSOLVE');
  assert.equal(x.layers.length,2);
  const out=x.layers.find(y=>y.role==='OUTGOING'),inc=x.layers.find(y=>y.role==='INCOMING');
  assert.equal(out.sourceId,'sha256:A');
  assert.equal(inc.sourceId,'sha256:B');
  assert.ok(Math.abs(out.gain-.5)<1e-6);
  assert.ok(Math.abs(inc.gain-.5)<1e-6);
  assert.equal(seamDisposition(x).audio,'CROSSFADE');
});

test('CARRY is explicit policy, not a second clock',()=>{
  const plan=planWith('CARRY');
  const x=rideAddressAtJourneyTime(plan,10);
  assert.equal(x.sourceId,'sha256:B');
  assert.equal(x.sourceTime,0);
  assert.equal(x.seam.phase,'ENTER');
  assert.equal(x.seam.carry,true);
  assert.equal(x.seam.reset,false);
  assert.deepEqual(seamDisposition(x),{
    projection:'KEEP',
    focus:'CARRY_APERTURE',
    live:'CARRY',
    audio:'CUT',
    returnRequested:false
  });
});

test('RESET produces a real silent gap and resets local embodied state intent',()=>{
  const plan=planWith('RESET');
  assert.equal(journeyEntryStart(plan,1),10.65);
  const gap=rideAddressAtJourneyTime(plan,10.3);
  assert.equal(gap.sourceActive,false);
  assert.equal(gap.layers.length,0);
  assert.equal(gap.seam.phase,'GAP');
  assert.equal(gap.seam.law,'RESET');
  assert.equal(gap.journeyTime,10.3);
  assert.equal(seamDisposition(gap).audio,'SILENT_GAP');
  assert.equal(seamDisposition(gap).live,'RESET');
  const enter=rideAddressAtJourneyTime(plan,10.65);
  assert.equal(enter.sourceId,'sha256:B');
  assert.equal(enter.seam.phase,'ENTER');
  assert.equal(enter.seam.reset,true);
});

test('RETURN is terminal policy at exact journey end',()=>{
  const plan=planWith('CUT');
  const total=journeyEntryStart(plan,plan.entries.length);
  const x=rideAddressAtJourneyTime(plan,total);
  assert.equal(x.sourceId,'sha256:B');
  assert.equal(x.sourceTime,20);
  assert.equal(x.seam.phase,'RETURN');
  assert.equal(x.seam.law,'RETURN');
  assert.equal(seamDisposition(x).returnRequested,true);
});

test('projection is independent of transport and focus follows transport by default',()=>{
  const plan=planWith('CUT');
  let state=createUnifiedRideState({plan,journeyTime:4,projection:{name:'MAP',params:{scope:'SECTION'}}});
  const beforeProjection=structuredClone(state.projection);
  state=withJourneyTime(state,plan,12);
  assert.deepEqual(state.projection,beforeProjection);
  assert.equal(state.address.sourceId,'sha256:B');
  assert.equal(state.focus.id,'sha256:B');
  assert.equal(state.focus.address.sourceTime,2);
  state=setRideProjection(state,{name:'RIDE',params:{world:'DEEP'}});
  assert.equal(state.projection.name,'RIDE');
  assert.equal(state.address.journeyTime,12);
});

test('sourceTime seek maps back into canonical journeyTime',()=>{
  const plan=planWith('DISSOLVE');
  let state=createUnifiedRideState({plan,journeyTime:0});
  state=withSourceTime(state,plan,1,3.5);
  assert.equal(state.address.sourceId,'sha256:B');
  assert.equal(state.address.sourceTime,3.5);
  assert.equal(state.address.journeyTime,11.1);
});

test('RETURN stores the external INTERPHASE frame and exact ride origin without executing it',()=>{
  const plan=planWith('CARRY');
  let state=createUnifiedRideState({plan,journeyTime:6,projection:'RIDE'});
  const frame={schema:'interphase/v0.2/return-frame',label:'before RIDE',host:'FOLD_BLOOM',state:{projection:'MAP'}};
  state=captureRideReturn(state,frame);
  assert.equal(state.return.status,'CAPTURED');
  assert.deepEqual(state.return.frame,frame);
  assert.equal(state.return.origin.address.journeyTime,6);
  assert.equal(state.events.at(-1).type,'RETURN_CAPTURE');
  state=requestRideReturn(state,'terminal seam');
  assert.equal(state.return.status,'REQUESTED');
  assert.equal(state.return.reason,'terminal seam');
  assert.equal(state.events.at(-1).type,'RETURN_REQUEST');
});
