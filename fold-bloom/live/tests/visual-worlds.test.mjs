import test from 'node:test';
import assert from 'node:assert/strict';
import {visualWorld,normalizeRideProfile,profileKey,mixHexOklab,mixVisualWorld} from '../visual-worlds.js';

test('scene worlds are materially distinct',()=>{
  const names=['DEEP','TRANCE','WOOD','VOID'];
  const worlds=names.map(n=>visualWorld(n,0,{energy:.5,brightness:.5}));
  assert.equal(new Set(worlds.map(x=>x.bg0)).size,4);
  assert.equal(new Set(worlds.map(x=>x.pattern)).size,4);
  assert.equal(new Set(worlds.map(x=>x.roadA)).size,4);
});

test('section parity swaps scene road emphasis without changing world identity',()=>{
  const a=visualWorld('WOOD',0),b=visualWorld('WOOD',1);
  assert.equal(a.name,'WOOD');assert.equal(b.name,'WOOD');
  assert.equal(a.roadA,b.roadB);assert.equal(a.roadB,b.roadA);
});

test('ride profile clamps unsafe transparency and sync extremes',()=>{
  const p=normalizeRideProfile({solidity:.1,immersion:9,dropGain:0,textOffset:99});
  assert.equal(p.solidity,.72);assert.equal(p.immersion,1.45);assert.equal(p.dropGain,.55);assert.equal(p.textOffset,8);
  assert.match(profileKey('abc'),/abc$/);
});


test('perceptual scene morph keeps endpoints exact and middle bounded',()=>{
  assert.equal(mixHexOklab('#000000','#ffffff',0),'#000000');
  assert.equal(mixHexOklab('#000000','#ffffff',1),'#ffffff');
  const a=visualWorld('DEEP',0,{energy:.2}),b=visualWorld('WOOD',0,{energy:.8}),m=mixVisualWorld(a,b,.5);
  assert.notEqual(m.bg0,a.bg0);assert.notEqual(m.bg0,b.bg0);assert.ok(m.horizonGain>=Math.min(a.horizonGain,b.horizonGain));
});

test('section phase creates bounded intra-scene variation without changing scene identity',()=>{
  const a=visualWorld('TRANCE',0,{energy:.5,brightness:.5}),b=visualWorld('TRANCE',3,{energy:.5,brightness:.5});
  assert.equal(a.name,'TRANCE');assert.equal(b.name,'TRANCE');assert.notEqual(a.sectionPhase,b.sectionPhase);assert.notEqual(a.bg0,b.bg0);
});
