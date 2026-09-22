import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTrackfield,projectTrackfield,trackfieldPoint,sampleFrameInterpolated,detectMacroDrop} from '../trackfield.js';

const frames=[
  {t:0,e:.18,c:.25,f:.04,l:.76,m:.2,h:.04},
  {t:2,e:.22,c:.30,f:.06,l:.70,m:.22,h:.08},
  {t:4,e:.45,c:.48,f:.12,l:.42,m:.36,h:.22},
  {t:6,e:1.0,c:.82,f:1.12,l:.10,m:.24,h:.66},
  {t:8,e:.72,c:.68,f:.42,l:.18,m:.35,h:.47},
  {t:10,e:.26,c:.34,f:.08,l:.62,m:.28,h:.10},
  {t:12,e:.20,c:.28,f:.05,l:.70,m:.24,h:.06}
];
const map={version:'test-map',stage:'DEEP',duration:12,bpm:120,frameRate:.5,frames,beats:[0,1,2,3,4,5,6,7,8,9,10,11,12],sections:[{t:0},{t:5.5},{t:9.5},{t:12}]};

test('trackfield is a bounded future projection of the AUDIO MAP',()=>{
  const w=buildTrackfield(map,1,{horizon:9,count:36});
  assert.equal(w.schema,'fold-bloom-trackfield/v0.5');
  assert.equal(w.points.length,36);
  assert.equal(w.time,1);
  assert.ok(w.points[0].ahead===0);
  assert.ok(w.points.at(-1).t<=10.01);
  assert.ok(w.points.some(p=>p.beatEdge));
  assert.ok(w.points.some(p=>p.downbeatEdge));
  assert.ok(w.points.some(p=>p.phraseEdge));
  assert.ok(w.points.some(p=>p.sectionEdge));
});

test('energy/flux create a visible surge without inventing semantic labels',()=>{
  const w=buildTrackfield(map,0,{horizon:10,count:48});
  assert.ok(w.surge);
  assert.ok(w.surge.ahead>3&&w.surge.ahead<8);
  assert.ok(w.maxImpact>.9);
});

test('spectral balance bends the road and quiet/loud changes rise/width',()=>{
  const low=trackfieldPoint({e:.2,c:.2,f:.02,l:.82,h:.04},0);
  const high=trackfieldPoint({e:1,c:.9,f:.8,l:.08,h:.72},1);
  assert.ok(low.bend<0);
  assert.ok(high.bend>0);
  assert.ok(low.rise>high.rise);
  assert.ok(high.width>low.width);
  assert.ok(low.grade>0);
  assert.ok(high.grade<0);
  assert.ok(high.speed>low.speed);
});

test('frame interpolation removes nearest-frame stepping',()=>{
  const a=sampleFrameInterpolated(map,1);
  const b=sampleFrameInterpolated(map,1.1);
  const c=sampleFrameInterpolated(map,1.2);
  assert.ok(a.e<b.e&&b.e<c.e);
  assert.ok(Math.abs((b.e-a.e)-(c.e-b.e))<.02);
});

test('screen projection keeps foreground wide and horizon narrow',()=>{
  const w=buildTrackfield(map,0,{horizon:10,count:32});
  const p=projectTrackfield(w,430,900);
  assert.equal(p.slices.length,32);
  assert.ok(p.slices[0].half>p.slices.at(-1).half*5);
  assert.ok(p.slices[0].baseY>p.slices.at(-1).baseY);
  assert.ok(Number.isFinite(w.currentSpeed)&&Number.isFinite(w.currentGrade));
  assert.ok(w.points.some(x=>Math.abs(x.altitude)>.03));
});


test('quiet climb and intense descent separate visibly in screen space',()=>{
  const mk=(e,f,l,h)=>({
    version:'grade-test',stage:'DEEP',duration:10,bpm:100,frameRate:2,
    frames:Array.from({length:21},(_,i)=>({t:i*.5,e,c:.5,f,l,m:.3,h})),
    beats:[0,1,2,3,4,5,6,7,8,9,10],sections:[{t:0},{t:10}]
  });
  const climb=projectTrackfield(buildTrackfield(mk(.16,.03,.78,.06),0,{horizon:9,count:40}),430,900);
  const descent=projectTrackfield(buildTrackfield(mk(.92,.58,.12,.70),0,{horizon:9,count:40}),430,900);
  const i=30;
  assert.ok(climb.slices[i].baseY<descent.slices[i].baseY-70);
  assert.ok(descent.currentSpeed>climb.currentSpeed+.65);
});


test('chosen SPLIT branch shifts camera toward the selected traversal',()=>{
  const w=buildTrackfield(map,0,{horizon:8,count:32});
  const splitWorld={...w,points:w.points.map((p,i)=>({...p,deformSplit:i<20?.72:0,deformActive:i<20?[{id:'split:test',verb:'SPLIT',strength:.72}]:[]}))};
  const neutral=projectTrackfield(splitWorld,430,900,{rideLateral:0});
  const right=projectTrackfield(splitWorld,430,900,{rideLateral:1});
  assert.ok(right.cameraShift>20);
  assert.ok(right.slices[4].centerX<neutral.slices[4].centerX);
});


test('future energy trend anticipates a drop with steeper grade before impact',()=>{
  const flat=trackfieldPoint({e:.45,c:.5,f:.08,l:.4,h:.3},.5,{energyTrend:0});
  const rising=trackfieldPoint({e:.45,c:.5,f:.08,l:.4,h:.3},.5,{energyTrend:.5});
  const falling=trackfieldPoint({e:.45,c:.5,f:.08,l:.4,h:.3},.5,{energyTrend:-.5});
  assert.ok(rising.grade<flat.grade-.3);
  assert.ok(falling.grade>flat.grade+.3);
  assert.ok(rising.speed>flat.speed);
});


test('macro drop promotes buildup→impact into a larger-scale event',()=>{
  const w=buildTrackfield(map,0,{horizon:10,count:64});
  assert.ok(w.drop,'expected a macro drop in the synthetic buildup');
  assert.ok(w.drop.ahead>3&&w.drop.ahead<8);
  assert.ok(w.drop.strength>.25);
  const before=w.points.find(p=>p.ahead>w.drop.ahead-1.1&&p.ahead<w.drop.ahead-.35);
  const hit=w.points.find(p=>p.ahead>=w.drop.ahead&&p.ahead<w.drop.ahead+.35);
  assert.ok(before?.dropTunnel>0);
  assert.ok(hit?.dropOpen>0);
  assert.ok(hit.grade<before.grade);
  assert.ok(hit.speed>before.speed);
});

test('flat material does not invent a macro drop',()=>{
  const pts=Array.from({length:20},(_,i)=>({ahead:i*.4,t:i*.4,energy:.4,impact:.35,flux:.04,sectionEdge:false}));
  assert.equal(detectMacroDrop(pts),null);
});
