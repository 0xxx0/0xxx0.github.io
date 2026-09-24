import test from 'node:test';
import assert from 'node:assert/strict';
import {nextPulseMode,pulseModeLabel,paceWpmFromTransport,transportWitness,boundedFocus} from '../read-bridge.js';

test('pulse mode cycles through witness, pace and off',()=>{
  assert.equal(nextPulseMode('WITNESS'),'PACE4');
  assert.equal(nextPulseMode('PACE4'),'OFF');
  assert.equal(nextPulseMode('OFF'),'WITNESS');
  assert.equal(pulseModeLabel('PACE4'),'PULSE · ×4 PACE');
});

test('tempo can lend pace without becoming reader authority',()=>{
  assert.equal(paceWpmFromTransport({bpm:96},4),384);
  assert.equal(paceWpmFromTransport({bpm:2000},4),6000);
  assert.equal(paceWpmFromTransport({bpm:0},4),null);
});

test('transport witness derives bounded source progress',()=>{
  const x=transportWitness({time:25,duration:100,beatPhase:1.4,sectionProgress:-1,energy:2,bpm:120,playing:true,sourceHash:'abc'});
  assert.equal(x.sourceProgress,.25);
  assert.equal(x.beatPhase,1);
  assert.equal(x.sectionProgress,0);
  assert.equal(x.energy,1.5);
  assert.equal(x.playing,true);
});

test('focus event is bounded and source-byte free',()=>{
  const x=boundedFocus({schema:'field-aperture-focus/v0.2',scale:'WORD',address:'word://7',index:7,count:20,source_progress:.4,wpm:420,playing:true,focus:'x'.repeat(300),raw:'secret'});
  assert.equal(x.focus.length,160);
  assert.equal(x.sourceProgress,.4);
  assert.equal('raw' in x,false);
});
