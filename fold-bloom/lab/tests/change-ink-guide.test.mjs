import test from 'node:test';
import assert from 'node:assert/strict';
import {steppedStatePath} from '../../convergence/change-calculus/kernel.mjs';
import {stateMatrixPoint,changePathInkGuide,CHANGE_INK_GUIDE_SCHEMA} from '../change-ink-guide.js';

test('six-bit states project transparently into the 8×8 trigram matrix',()=>{
  const p=stateMatrixPoint('010|100');
  assert.equal(p.lower,2);
  assert.equal(p.upper,4);
  assert.equal(p.x,0.285714);
  assert.equal(p.y,0.428571);
  assert.equal(p.token,'H[010|100]');
});

test('an addressed STEP chain becomes a projection-only INK guide without losing order',()=>{
  const path=steppedStatePath('010|100','011|110',[3,5]);
  const g=changePathInkGuide(path);
  assert.equal(g.ok,true);
  assert.equal(g.schema,CHANGE_INK_GUIDE_SCHEMA);
  assert.equal(g.authority,'PROJECTION_ONLY');
  assert.equal(g.address,path.path_address);
  assert.deepEqual(g.order,[3,5]);
  assert.equal(g.points.length,3);
  assert.deepEqual(g.points.map(x=>[x.lower,x.upper]),[[2,4],[3,4],[3,6]]);
  assert.equal(g.points.at(-1).token,'H[011|110]');
  assert.match(g.law,/geometry and address only/);
});

test('INK guide fails closed without a lawful addressed path',()=>{
  assert.deepEqual(changePathInkGuide(null),{ok:false,schema:CHANGE_INK_GUIDE_SCHEMA,reason:'ADDRESSED_STEP_PATH_REQUIRED'});
});
