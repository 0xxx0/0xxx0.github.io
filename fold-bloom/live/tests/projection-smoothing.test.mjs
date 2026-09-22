import test from 'node:test';
import assert from 'node:assert/strict';
import {stabilizeProjection} from '../projection-smoothing.js';

test('projection smoothing damps geometry but preserves new semantic witnesses',()=>{
  const a={currentSpeed:1,slices:[{centerX:0,baseY:100,half:50,branchGap:0,branchHalf:50,z:0,sectionEdge:false}]};
  const b={currentSpeed:2,slices:[{centerX:40,baseY:60,half:30,branchGap:10,branchHalf:20,z:.1,sectionEdge:true}]};
  const x=stabilizeProjection(a,b,1/60,12);
  assert.ok(x.slices[0].centerX>0&&x.slices[0].centerX<40);
  assert.ok(x.currentSpeed>1&&x.currentSpeed<2);
  assert.equal(x.slices[0].sectionEdge,true);
});

test('first projection is cloned without altering source object',()=>{
  const b={slices:[{centerX:1,baseY:2,half:3,branchGap:0,branchHalf:3,z:0}]};
  const x=stabilizeProjection(null,b);
  assert.notEqual(x.slices,b.slices);assert.deepEqual(x,b);
});
