import test from 'node:test';
import assert from 'node:assert/strict';
import {FoldBloomAudio} from '../audio.js';

test('FIELD MUSIC climate is bounded presentation state',()=>{
  const a=new FoldBloomAudio();
  const initial=a.climateSnapshot();
  assert.equal(initial.scene,'DEEP');
  const next=a.setClimate({energy:1,density:.9,tension:.8},.5);
  assert.ok(next.energy>initial.energy&&next.energy<=1);
  assert.ok(next.density>initial.density&&next.density<=.98);
  assert.ok(next.tension>initial.tension&&next.tension<=1);
  const bounded=a.setClimate({energy:9,density:-4,tension:3},1);
  assert.equal(bounded.energy,1);
  assert.equal(bounded.density,.08);
  assert.equal(bounded.tension,1);
  assert.equal(a.soundOn,false,'climate must not implicitly enable audio');
});

test('authored RELEASE remains causal over climate bias',()=>{
  const a=new FoldBloomAudio();
  a.setClimate({energy:.2,density:.2,tension:.1},1);
  const before=a.climateSnapshot();
  a.release({verb:'BLOOM',cadence:null,power:.8,chain:3,charge:.7,degree:2,type:1,slot:4});
  const after=a.climateSnapshot();
  assert.ok(after.energy>before.energy);
  assert.ok(after.density>before.density);
  assert.ok(after.tension>before.tension);
  assert.equal(a.soundOn,false,'release must not bypass explicit audio opt-in');
});
