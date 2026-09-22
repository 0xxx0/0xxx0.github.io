import test from 'node:test';
import assert from 'node:assert/strict';
import {createRideState,splitOpportunity,chooseRideBranch,advanceRide,rideView} from '../ride.js';

const splitPoint=(ahead,strength=.7,id='split:1')=>({
  t:10+ahead,ahead,deformSplit:strength,deformReturn:0,
  deformActive:[{id,verb:'SPLIT',strength}]
});
const world=(points)=>({time:10,points});

test('split opportunity is bounded to the near future',()=>{
  assert.equal(splitOpportunity(world([splitPoint(5)])),null);
  const o=splitOpportunity(world([splitPoint(2.4),splitPoint(.9)]));
  assert.equal(o.ahead,.9);
});

test('ring turn may choose a branch only when a split is approaching',()=>{
  let s=createRideState();
  let out=chooseRideBranch(s,-1,world([{t:10,ahead:0,deformSplit:0,deformActive:[]}]),10);
  assert.equal(out.event,null);
  out=chooseRideBranch(s,-1,world([splitPoint(1.2)]),10);
  assert.equal(out.event.kind,'BRANCH_CHOICE');
  assert.equal(out.state.choice,-1);
  assert.equal(out.event.label,'LEFT');
  assert.equal(out.state.branchChoices,1);
});

test('repeated steering in same direction does not spam branch trace',()=>{
  let out=chooseRideBranch(createRideState(),1,world([splitPoint(.7)]),10);
  const again=chooseRideBranch(out.state,1,world([splitPoint(.4)]),10.3);
  assert.equal(again.event,null);
  assert.equal(again.state.trace.length,1);
});

test('ride lateral motion eases toward branch and recenters after split passes',()=>{
  let s=chooseRideBranch(createRideState(),1,world([splitPoint(.2)]),10).state;
  for(let i=0;i<20;i++)s=advanceRide(s,world([splitPoint(0,.7,'split:1')]),.016,10+i*.016);
  assert.ok(s.lateral>.7);
  for(let i=0;i<30;i++)s=advanceRide(s,world([{t:11,ahead:0,deformSplit:0,deformReturn:0,deformActive:[]}]),.016,11+i*.016);
  assert.equal(s.choice,0);
  assert.ok(Math.abs(s.lateral)<.08);
});

test('RETURN recenters an active split ride without deleting its trace',()=>{
  let s=chooseRideBranch(createRideState(),-1,world([splitPoint(.1)]),10).state;
  const returning=world([{...splitPoint(0),deformReturn:.8}]);
  s=advanceRide(s,returning,.05,10.2);
  assert.equal(s.choice,0);
  assert.equal(s.splitId,null);
  assert.equal(s.trace.length,1);
  assert.equal(rideView(s,returning).label,'CHOOSE');
});
