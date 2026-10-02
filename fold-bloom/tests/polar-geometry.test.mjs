import test from 'node:test';
import assert from 'node:assert/strict';
import {TAU,pointAngle01,pointSlot,polarPoint,polarSlots,polarBandPoint,polarCssPosition,annulusContains} from '../../lib/polar-control.js';

test('shared polar slots preserve top-origin clockwise address geometry',()=>{
  const pts=polarSlots(4,{cx:0,cy:0,radius:10});
  assert.equal(pts.length,4);
  assert.ok(Math.abs(pts[0].x)<1e-9&&Math.abs(pts[0].y+10)<1e-9);
  assert.ok(Math.abs(pts[1].x-10)<1e-9&&Math.abs(pts[1].y)<1e-9);
  assert.equal(pointSlot(0,-10,0,0,4).slot,0);
  assert.equal(pointSlot(10,0,0,0,4).slot,1);
  assert.ok(pointAngle01(0,-10,0,0)<1e-9);
});

test('polar helpers separate geometry from domain semantics',()=>{
  const p=polarPoint(3,8,{cx:50,cy:50,radius:40});
  const q=polarBandPoint(3,8,{cx:50,cy:50,inner:20,outer:60,t:.5});
  assert.equal(+p.radius.toFixed(5),40);
  assert.equal(+q.radius.toFixed(5),40);
  assert.ok(annulusContains(p.x,p.y,{cx:50,cy:50,inner:39,outer:41}));
  assert.ok(!annulusContains(50,50,{cx:50,cy:50,inner:10,outer:50}));
  const css=polarCssPosition(0,8,{radiusPct:45});
  assert.equal(css.left,'50%');
  assert.equal(css.top,'5%');
  assert.ok(Number.isFinite(css.angle)&&Math.abs(css.angle+TAU/4)<1e-9);
});
