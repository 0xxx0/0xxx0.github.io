import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RUN_LENGTH,RUN_WIN_HITS,PUZZLE_ROUNDS,PUZZLE_WIN_STARS,DUET_ROUNDS,DUET_WIN_HITS,
  GARDEN_GENERATIONS,GARDEN_MOVES,GARDEN_SURVIVAL_TARGET,HEX_CHANGE_LIMIT,
  runOutcome,duetOutcome,puzzleOutcome,gardenOutcome,hexChangeOutcome
} from '../play-core.js';
import {loopWitness} from '../play-loop.js';
import {
  SESSION_SCALE_VERSION,SESSION_SCALE_DEFAULT,SESSION_SCALES,
  normalizeSessionScale,sessionScaleOpen,goalCounts,policyRecord
} from '../session-scale.js';

const COUNTS=Object.freeze({
  PLAY:['length','win'],
  PUZZLE:['changeLimit'],
  PATH:['rounds','winStars'],
  DUET:['rounds','win'],
  GARDEN:['generations','moves','survival'],
});

test('QUICK policy is literally the current play-core constants (no drift with live default)',()=>{
  const q=goalCounts('PLAY','QUICK');
  assert.deepEqual(q,{length:RUN_LENGTH,win:RUN_WIN_HITS});
  assert.deepEqual(goalCounts('PUZZLE','QUICK'),{changeLimit:HEX_CHANGE_LIMIT});
  assert.deepEqual(goalCounts('PATH','QUICK'),{rounds:PUZZLE_ROUNDS,winStars:PUZZLE_WIN_STARS});
  assert.deepEqual(goalCounts('DUET','QUICK'),{rounds:DUET_ROUNDS,win:DUET_WIN_HITS});
  assert.deepEqual(goalCounts('GARDEN','QUICK'),{generations:GARDEN_GENERATIONS,moves:GARDEN_MOVES,survival:GARDEN_SURVIVAL_TARGET});
});

test('unknown scale and missing scale normalize to the QUICK default',()=>{
  assert.equal(SESSION_SCALE_DEFAULT,'QUICK');
  assert.equal(normalizeSessionScale(undefined),'QUICK');
  assert.equal(normalizeSessionScale('nonsense'),'QUICK');
  assert.equal(normalizeSessionScale('session'),'SESSION');
  assert.equal(normalizeSessionScale('open'),'OPEN');
  assert.deepEqual(SESSION_SCALES,['QUICK','SESSION','OPEN']);
  assert.equal(sessionScaleOpen('OPEN'),true);
  assert.equal(sessionScaleOpen('QUICK'),false);
});

test('SESSION is strictly longer than QUICK for every bounded count',()=>{
  for(const mode of Object.keys(COUNTS)){
    const q=goalCounts(mode,'QUICK'),s=goalCounts(mode,'SESSION');
    for(const key of COUNTS[mode]){
      assert.ok(Number(s[key])>Number(q[key]),mode+' '+key+' SESSION('+s[key]+') must exceed QUICK('+q[key]+')');
    }
  }
});

test('OPEN returns the same count shapes with null thresholds for every bounded mode',()=>{
  for(const mode of Object.keys(COUNTS)){
    const o=goalCounts(mode,'OPEN');
    assert.deepEqual(Object.keys(o).sort(),[...COUNTS[mode]].sort(),mode+' OPEN shape');
    for(const key of COUNTS[mode])assert.equal(o[key],null,mode+' '+key);
  }
});

test('invariant: scale length changes only the completion policy, never operation semantics',()=>{
  // Same observed events, same labels below threshold: a 6/8 run is "not yet
  // clear" under both scales; only the threshold at which it clears moves.
  const quick=runOutcome(6,8,goalCounts('PLAY','QUICK').length,goalCounts('PLAY','QUICK').win);
  const session=runOutcome(6,8,goalCounts('PLAY','SESSION').length,goalCounts('PLAY','SESSION').win);
  assert.equal(quick.clear,true);            // QUICK still clears 6 of 8
  assert.equal(session.clear,false);         // SESSION needs more road
  assert.equal(session.label,'ROAD DRIFTED');// same not-yet-clear label
  assert.equal(quick.complete,true);
  assert.equal(session.complete,false);
  const sessionDone=runOutcome(8,12,goalCounts('PLAY','SESSION').length,goalCounts('PLAY','SESSION').win);
  assert.equal(sessionDone.clear,true);      // same hit rate, longer road, same semantics

  // DUET: five synchronized calls of six still means the same thing; the
  // SESSION threshold only lengthens the road.
  assert.equal(duetOutcome(5,6,goalCounts('DUET','QUICK').rounds,goalCounts('DUET','QUICK').win).clear,true);
  assert.equal(duetOutcome(5,6,goalCounts('DUET','SESSION').rounds,goalCounts('DUET','SESSION').win).clear,false);
  assert.equal(duetOutcome(5,6,goalCounts('DUET','SESSION').rounds,goalCounts('DUET','SESSION').win).label,'DUET OPEN');

  // PUZZLE: the CLEAR target (two changed lines) is operation semantics and must
  // not move with the scale; only the CHANGE move limit is a completion count.
  const a=[0,1,0,1,0,0],b=[0,1,1,1,1,0];
  assert.equal(hexChangeOutcome(a,b,2,2,goalCounts('PUZZLE','QUICK').changeLimit).complete,true);
  assert.equal(hexChangeOutcome(a,b,2,2,goalCounts('PUZZLE','SESSION').changeLimit).complete,true);
  assert.equal(hexChangeOutcome(a,a,5,2,goalCounts('PUZZLE','QUICK').changeLimit).complete,true); // QUICK limit exhausted at 5 moves
  assert.equal(hexChangeOutcome(a,a,5,2,goalCounts('PUZZLE','SESSION').changeLimit).complete,false); // SESSION still working at 5 moves

  // PATH stars and GARDEN survival keep their semantics under both scales.
  assert.equal(puzzleOutcome(10,goalCounts('PATH','QUICK').winStars).clear,true);
  assert.equal(puzzleOutcome(10,goalCounts('PATH','SESSION').winStars).clear,false);
  assert.equal(gardenOutcome(2,goalCounts('GARDEN','QUICK').survival).clear,true);
  assert.equal(gardenOutcome(2,goalCounts('GARDEN','SESSION').survival).clear,false);
});

test('loop witness derives progress against the chosen policy and stays open for null counts',()=>{
  const counts=goalCounts('PLAY','SESSION');
  const witness=loopWitness('PLAY',{active:true,releases:3,hits:2,win:{run:{clear:false}}},{play:counts});
  assert.deepEqual(witness.progress,{value:3,target:12});
  assert.deepEqual(witness.success,{value:2,target:8});

  const open=loopWitness('PLAY',{active:true,releases:3,hits:2,win:{run:{clear:false}}},{play:goalCounts('PLAY','OPEN')});
  assert.equal(open.progress.target,null);
  assert.equal(open.success.target,null);

  const garden=loopWitness('GARDEN',{active:true,garden:{generation:2,trait:'PATH',survived:2,choice:false},win:{garden:{clear:false}}},{garden:goalCounts('GARDEN','SESSION')});
  assert.deepEqual(garden.progress,{value:2,target:5});
  assert.deepEqual(garden.success,{value:2,target:3});

  // Default call (no counts) keeps the shipped contract thresholds.
  assert.deepEqual(loopWitness('PLAY',{active:true,releases:3,hits:2,win:{run:{clear:false}}}).progress,{value:3,target:8});
});

test('ZEN ignores the policy and every mode records a receipt policy record',()=>{
  assert.deepEqual(goalCounts('ZEN','SESSION'),{});
  assert.deepEqual(goalCounts('ZEN','OPEN'),{});
  const rec=policyRecord('SESSION','PLAY');
  assert.equal(rec.schema,'0xxx0/fold-bloom-session-scale/v0.1');
  assert.equal(rec.version,SESSION_SCALE_VERSION);
  assert.equal(rec.name,'SESSION');
  assert.deepEqual(rec.counts,{length:12,win:8});
});