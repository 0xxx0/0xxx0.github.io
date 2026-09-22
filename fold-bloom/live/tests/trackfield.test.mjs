import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTrackfield,projectTrackfield,trackfieldPoint} from '../trackfield.js';

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
  assert.equal(w.schema,'fold-bloom-trackfield/v0.1');
  assert.equal(w.points.length,36);
  assert.equal(w.time,1);
  assert.ok(w.points[0].ahead===0);
  assert.ok(w.points.at(-1).t<=10.01);
  assert.ok(w.points.some(p=>p.beatEdge));
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
});

test('screen projection keeps foreground wide and horizon narrow',()=>{
  const w=buildTrackfield(map,0,{horizon:10,count:32});
  const p=projectTrackfield(w,430,900);
  assert.equal(p.slices.length,32);
  assert.ok(p.slices[0].half>p.slices.at(-1).half*5);
  assert.ok(p.slices[0].baseY>p.slices.at(-1).baseY);
});


test('chosen SPLIT branch shifts camera toward the selected traversal',()=>{
  const w=buildTrackfield(map,0,{horizon:8,count:32});
  const splitWorld={...w,points:w.points.map((p,i)=>({...p,deformSplit:i<20?.72:0,deformActive:i<20?[{id:'split:test',verb:'SPLIT',strength:.72}]:[]}))};
  const neutral=projectTrackfield(splitWorld,430,900,{rideLateral:0});
  const right=projectTrackfield(splitWorld,430,900,{rideLateral:1});
  assert.ok(right.cameraShift>20);
  assert.ok(right.slices[4].centerX<neutral.slices[4].centerX);
});
