import test from 'node:test';
import assert from 'node:assert/strict';
import {InkField,INK_SCHEMA} from '../ink-engine.js';

test('deposit is deterministic and creates pigment + water',()=>{
  const a=new InkField({width:64,height:48,seed:9});
  const b=new InkField({width:64,height:48,seed:9});
  const args={speed:3,pressure:.7,tiltX:22,tiltY:-9,size:.12,water:.7,load:.8,mode:'SUMI'};
  a.deposit(.5,.5,args);b.deposit(.5,.5,args);
  assert.deepEqual([...a.pigment],[...b.pigment]);
  assert.ok(a.metrics().pigment>0);
  assert.ok(a.metrics().water>0);
});

test('water spreads/evaporates while pigment leaves stain',()=>{
  const f=new InkField({width:64,height:48});
  f.deposit(.5,.5,{mode:'WASH',water:1,load:.7,size:.1});
  const before=f.metrics();
  for(let i=0;i<160;i++)f.step({bleed:1.2,absorb:.8,evaporation:.009});
  const after=f.metrics();
  assert.equal(after.schema,INK_SCHEMA);
  assert.ok(after.water<before.water);
  assert.ok(after.stain>0);
});

test('dry brush has less water than wash at equal gesture',()=>{
  const dry=new InkField({width:64,height:48}),wash=new InkField({width:64,height:48});
  dry.deposit(.5,.5,{mode:'DRY',water:.8,load:.8,size:.1});
  wash.deposit(.5,.5,{mode:'WASH',water:.8,load:.8,size:.1});
  assert.ok(dry.metrics().water<wash.metrics().water);
});

test('rgba is stable sized opaque output',()=>{
  const f=new InkField({width:32,height:24});f.deposit(.4,.5,{});
  const rgba=f.rgba();assert.equal(rgba.length,32*24*4);
  for(let i=3;i<rgba.length;i+=4)assert.equal(rgba[i],255);
});
