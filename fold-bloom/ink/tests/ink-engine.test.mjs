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


test('strokeSegment interpolates a continuous directional brush path',()=>{
  const f=new InkField({width:96,height:64,seed:14});
  f.strokeSegment(.18,.5,.82,.5,{mode:'SUMI',water:.6,load:.75,size:.075,pressure:.7,speed:5,strokeSeed:3});
  const y=Math.floor(f.height*.5),x0=Math.floor(f.width*.22),x1=Math.floor(f.width*.78);
  let run=0,maxGap=0,center=0,off=0;
  for(let x=x0;x<=x1;x++){
    const p=f.pigment[x+y*f.width];center+=p;
    if(p<.02){run++;maxGap=Math.max(maxGap,run)}else run=0;
    off+=f.pigment[x+Math.max(0,y-14)*f.width];
  }
  assert.ok(center>2);
  assert.ok(maxGap<=2,'centerline gap '+maxGap);
  assert.ok(center>off*2.2);
});

test('dry stroke keeps coherent bristle gaps without becoming sparse spray',()=>{
  const f=new InkField({width:96,height:64,seed:4});
  f.strokeSegment(.2,.35,.8,.68,{mode:'DRY',water:.7,load:.85,size:.085,pressure:.55,speed:8,strokeSeed:11});
  let active=0;
  for(const p of f.pigment)if(p>.025)active++;
  assert.ok(active>90);
  assert.ok(active<1600);
  assert.ok(f.metrics().water>0);
});


test('swept contact is approximately invariant to pointer event density',()=>{
  const opts={mode:'SUMI',water:.62,load:.76,size:.08,pressure:.68,speed:5,strokeSeed:17};
  const coarse=new InkField({width:120,height:72,seed:12});
  const dense=new InkField({width:120,height:72,seed:12});
  coarse.deposit(.14,.5,{...opts,flow:.5});
  dense.deposit(.14,.5,{...opts,flow:.5});
  coarse.strokeSegment(.14,.5,.86,.5,opts);
  const parts=12;
  for(let i=0;i<parts;i++)dense.strokeSegment(.14+.72*i/parts,.5,.14+.72*(i+1)/parts,.5,opts);
  const a=coarse.metrics().pigment,b=dense.metrics().pigment,ratio=b/Math.max(.001,a);
  assert.ok(ratio>.82&&ratio<1.18,'pointer-density pigment ratio '+ratio);
});

test('wet swept contact reads as a ribbon rather than isolated spray dabs',()=>{
  const f=new InkField({width:120,height:72,seed:8});
  f.deposit(.12,.46,{mode:'SUMI',water:.7,load:.8,size:.085,pressure:.72,strokeSeed:5,flow:.5});
  f.strokeSegment(.12,.46,.88,.54,{mode:'SUMI',water:.7,load:.8,size:.085,pressure:.72,speed:6,strokeSeed:5});
  let active=0,gaps=0,maxGap=0,run=0;
  for(let i=16;i<104;i++){
    const t=(i-14)/(108-14),y=Math.round((.46+(.54-.46)*t)*f.height);
    const p=f.pigment[i+Math.max(0,Math.min(f.height-1,y))*f.width];
    if(p>.025){active++;run=0}else{gaps++;run++;maxGap=Math.max(maxGap,run)}
  }
  assert.ok(active>72,'active center samples '+active);
  assert.ok(maxGap<=3,'maximum center gap '+maxGap);
  assert.ok(gaps<16,'center gaps '+gaps);
});
