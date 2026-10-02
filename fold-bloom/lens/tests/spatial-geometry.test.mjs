import test from 'node:test';
import assert from 'node:assert/strict';
import {M,lensViewMatrix,lineageSlabMatrix,clampLensPitch,clampLensDepth} from '../spatial-geometry.js';

test('Scale Lens view geometry clamps presentation without owning lens state',()=>{
  assert.equal(clampLensPitch(120),70);
  assert.equal(clampLensPitch(-120),-70);
  assert.equal(clampLensDepth(999),150);
  assert.equal(clampLensDepth(-999),-520);
  const m=lensViewMatrix({yaw:-27,pitch:17,depth:-115});
  assert.equal(m.length,16);
  assert.match(M.css(m),/^matrix3d\(/);
});

test('lineage slab geometry remains deterministic and selection only changes scale',()=>{
  const n={id:'node:a',hash:12345};
  const a=lineageSlabMatrix(1,n,4,{selectedId:null});
  const b=lineageSlabMatrix(1,n,4,{selectedId:null});
  const selected=lineageSlabMatrix(1,n,4,{selectedId:'node:a'});
  assert.deepEqual(a,b);
  assert.notDeepEqual(a,selected);
  assert.equal(a.length,16);
});
