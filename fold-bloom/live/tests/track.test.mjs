import test from 'node:test';
import assert from 'node:assert/strict';
import {transportFromMap} from '../track.js';

const map={
  duration:8,bpm:120,tempoConfidence:.8,stage:'DEEP',
  frameRate:2,sampleRate:2,hop:1,
  frames:Array.from({length:16},(_,i)=>({t:i*.5,e:i/16,c:.4,f:.2})),
  beats:[0,0.5,1,1.5,2,2.5,3,3.5,4,4.5,5,5.5,6,6.5,7,7.5],
  sections:[{t:0},{t:4},{t:8}]
};

test('transport exposes beat phase/distance and section progress',()=>{
  const p=transportFromMap(map,1.125,true);
  assert.equal(p.beatIndex,2);
  assert.equal(p.sectionIndex,0);
  assert.equal(p.sectionCount,2);
  assert.equal(p.sectionStart,0);
  assert.equal(p.sectionEnd,4);
  assert.ok(Math.abs(p.beatPhase-.25)<1e-9);
  assert.ok(Math.abs(p.beatDistance-.125)<1e-9);
  assert.ok(Math.abs(p.sectionProgress-.28125)<1e-9);
  assert.equal(p.sourceKind,'LOCAL_FILE');
  assert.equal(p.playing,true);
});

test('transport remains bounded at track end',()=>{
  const p=transportFromMap(map,99,false);
  assert.equal(p.time,8);
  assert.equal(p.sectionIndex,1);
  assert.equal(p.playing,false);
});
