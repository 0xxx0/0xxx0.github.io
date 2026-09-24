import test from 'node:test';
import assert from 'node:assert/strict';
import {estimatePitch,midiToHz,midiToName,centsBetween,patternTarget,stabilityCents} from '../pitch.js';

function sine(hz,{sr=48000,n=2048,amp=.18}={}){
  const a=new Float32Array(n);
  for(let i=0;i<n;i++)a[i]=amp*Math.sin(2*Math.PI*hz*i/sr);
  return{a,sr};
}

test('pitch estimator resolves common singing range tones',()=>{
  for(const hz of [110,220,261.626,440,659.255]){
    const {a,sr}=sine(hz),p=estimatePitch(a,sr);
    assert.ok(p.hz>0, String(hz));
    assert.ok(Math.abs(centsBetween(p.hz,hz))<4, JSON.stringify({hz,p}));
    assert.ok(p.clarity>.9);
  }
});

test('silence stays unvoiced',()=>{
  const p=estimatePitch(new Float32Array(2048),48000);
  assert.equal(p.hz,0);
  assert.equal(p.clarity,0);
});

test('note and pattern helpers stay deterministic',()=>{
  assert.equal(midiToName(60),'C4');
  assert.ok(Math.abs(midiToHz(69)-440)<1e-9);
  assert.equal(patternTarget(60,'CALL',0),60);
  assert.equal(patternTarget(60,'CALL',1),64);
  assert.equal(patternTarget(60,'CALL',2),67);
  assert.equal(patternTarget(60,'CALL',3),64);
  assert.equal(patternTarget(60,'HUM',0),null);
});

test('stability reports spread in cents-space samples',()=>{
  assert.equal(stabilityCents([0,0]),null);
  assert.ok(stabilityCents([0,2,-2,1,-1])<2);
  assert.ok(stabilityCents([0,20,-20,15,-15])>10);
});
