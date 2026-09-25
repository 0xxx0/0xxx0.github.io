import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeStateBits,formatState,stateDescriptor,movingLines,stateChange,applyMovingLines} from '../../state-language.js';
import {
  circularDistance,relationVerb,relationName,lineBitForVerb,lineMark,trigramForBits,hexPair,hexOutcome,hexChangeOutcome,
  runOutcome,puzzleStars,puzzleOutcome,duetOutcome,gardenGoalMet,gardenSummary,gardenProgress,gardenOutcome
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
test('shared state language round-trips six-line change tokens',()=>{
  assert.deepEqual(normalizeStateBits('010|100'),[0,1,0,1,0,0]);
  assert.equal(formatState([0,1,0,1,0,0]),'010|100');
  const before=stateDescriptor('010|100'),after=stateDescriptor('011|110');
  assert.equal(before.lower.key,'KAN');assert.equal(before.upper.key,'ZHEN');
  assert.equal(after.lower.key,'XUN');assert.equal(after.upper.key,'DUI');
  assert.deepEqual(movingLines(before.bits,after.bits),[3,5]);
  assert.equal(stateChange(before.bits,after.bits).token,'H[010|100] Δ{3,5} → H[011|110]');
  assert.deepEqual(applyMovingLines(before.bits,[3,5]),after.bits);
});

test('hex puzzle grammar maps topology into six-line form',()=>{
  assert.equal(lineBitForVerb('BLOOM'),1);
  assert.equal(lineBitForVerb('FOLD'),1);
  assert.equal(lineBitForVerb('SPLIT'),0);
  assert.equal(lineBitForVerb('RETURN'),0);
  assert.equal(lineMark(1),'━━━');
  assert.equal(lineMark(0),'━ ━');
  assert.deepEqual(trigramForBits([1,1,1]),{key:'QIAN',glyph:'☰',han:'乾',image:'HEAVEN'});
  assert.deepEqual(trigramForBits([0,1,0]),{key:'KAN',glyph:'☵',han:'坎',image:'WATER'});
  const pair=hexPair([0,1,0,1,0,0]);
  assert.equal(pair.complete,true);
  assert.equal(pair.lower.key,'KAN');
  assert.equal(pair.upper.key,'ZHEN');
  assert.deepEqual(hexOutcome([0,1,0,1,0,0],[0,1,0,1,0,0]),{complete:true,clear:true,matches:6,label:'HEXAGRAM LOCKED'});
  assert.equal(hexOutcome([0,1,0,1,0,0],[0,1,0,1,1,0]).matches,5);
});

test('HEX change phase clears on two final changed lines and can revert',()=>{
  const a=[0,1,0,1,0,0];
  assert.deepEqual(hexChangeOutcome(a,[0,1,1,1,1,0],2),{complete:true,clear:true,changed:[3,5],label:'STATE CHANGED'});
  assert.equal(hexChangeOutcome(a,[0,1,1,1,0,0],3).clear,false);
  assert.equal(hexChangeOutcome(a,a,4).complete,true);
  assert.deepEqual(hexChangeOutcome(a,a,4).changed,[]);
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
