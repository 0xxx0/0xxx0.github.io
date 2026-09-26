import test from 'node:test';
import assert from 'node:assert/strict';
import {
  pulseIntervals,nearestGridEvent,makeTrainerState,trainerTarget,advanceTrainer,evaluateTap,
  summarizeTapTrace,returnDelta,PULSE_PSYCHOPHYSICS_VERSION
} from '../psychophysics.js';

test('pulse intervals keep meter and ratio streams on one four-beat bar',()=>{
  const x=pulseIntervals({bpm:120,ratio:[3,2]});
  assert.equal(x.beat,.5);
  assert.equal(x.bar,2);
  assert.ok(Math.abs(x.a-2/3)<1e-9);
  assert.equal(x.b,1);
});

test('signed asynchrony preserves anticipation versus lag',()=>{
  const early=nearestGridEvent(.48,0,.5),late=nearestGridEvent(.53,0,.5);
  assert.ok(early.error<0);
  assert.ok(late.error>0);
  assert.equal(Math.round(early.error*1000),-20);
  assert.equal(Math.round(late.error*1000),30);
});

test('trainer cycles LOCK to CROSS to RETURN and back',()=>{
  let s=makeTrainerState();
  assert.equal(trainerTarget(s),'M');
  for(let i=0;i<4;i++)s=advanceTrainer(s).state;
  assert.equal(s.phase,'CROSS');assert.equal(trainerTarget(s),'A');
  s=advanceTrainer(s).state;assert.equal(trainerTarget(s),'B');
  for(let i=1;i<8;i++)s=advanceTrainer(s).state;
  assert.equal(s.phase,'RETURN');assert.equal(trainerTarget(s),'M');
  let out;for(let i=0;i<4;i++){out=advanceTrainer(s);s=out.state}
  assert.equal(out.cycleComplete,true);assert.equal(s.phase,'LOCK');assert.equal(s.cycle,2);
});

test('tap evaluation is tempo-relative and keeps signed error',()=>{
  const x=evaluateTap({time:.51,start:0,bpm:120,ratio:[3,2],lane:'M'});
  assert.equal(Math.round(x.errorMs),10);
  assert.ok(x.lock>90);
  const a=evaluateTap({time:2/3+.03,start:0,bpm:120,ratio:[3,2],lane:'A'});
  assert.equal(a.lane,'A');assert.equal(Math.round(a.errorMs),30);
});

test('trace summary exposes bias jitter correction proxy and bounded lock',()=>{
  const taps=[-.03,-.018,-.011,-.006,-.003,-.001].map(error=>({error,interval:.5}));
  const s=summarizeTapTrace(taps);
  assert.equal(s.count,6);
  assert.ok(s.biasMs<0);
  assert.ok(s.jitterMs>0);
  assert.ok(s.lock>=0&&s.lock<=100);
  assert.ok(s.phaseCorrection!==null);
  assert.equal(s.anticipation,'EARLY');
  assert.equal(PULSE_PSYCHOPHYSICS_VERSION,'FOLD_BLOOM_PULSE_PSYCHOPHYSICS_0.1');
});

test('return delta compares reacquisition against initial lock',()=>{
  const taps=[
    ...[-.02,.02,-.01,.01].map(error=>({error,interval:.5,trainPhase:'LOCK'})),
    ...[-.04,.03,-.02,.04].map(error=>({error,interval:.5,trainPhase:'RETURN'}))
  ];
  const d=returnDelta(taps);
  assert.equal(d.available,true);
  assert.ok(d.returnMaeMs>d.lockMaeMs);
});
