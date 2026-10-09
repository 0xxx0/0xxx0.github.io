import assert from 'node:assert/strict';
import {ROOT,VIEWS,RETURN,routeMatches,radialSlots,drumSlots,pointIndex,stepIndex,stageItems,pathLabel} from '../interphase/compositor-kernel.mjs';

assert.deepEqual(ROOT.map(x=>x.id),['VIEW','FIND','RETURN']);
assert.equal(VIEWS.length,8);
assert.deepEqual(RETURN.map(x=>x.id),['HISTORY','LAST']);
assert.equal(stageItems('VIEW'),VIEWS);
assert.equal(stageItems('RETURN'),RETURN);
assert.equal(stageItems('ROOT'),ROOT);

const routes=Array.from({length:14},(_,i)=>({title:`Alpha ${i}`,href:`/alpha/${i}/`}));
const match=routeMatches(routes,'alpha',{limit:8});
assert.equal(match.total,14);
assert.equal(match.items.length,8);
assert.equal(match.overflow,6);
assert.equal(routeMatches(routes,'missing').total,0);

const slots=radialSlots(VIEWS);
assert.equal(slots.length,VIEWS.length);
assert.deepEqual(slots.map(x=>x.item.id),VIEWS.map(x=>x.id));
for(const s of slots){
  assert.ok(Number.isFinite(s.x)&&Number.isFinite(s.y));
  assert.ok(s.x>=0&&s.x<=1&&s.y>=0&&s.y<=1);
}
const one=radialSlots([{id:'ONLY'}]);
assert.equal(one.length,1);assert.equal(one[0].item.id,'ONLY');
assert.equal(pointIndex(50,0,50,50,4),0);
assert.equal(pointIndex(100,50,50,50,4),1);
assert.equal(stepIndex(0,-1,4),3);
assert.equal(stepIndex(3,1,4),0);
assert.match(pathLabel({stage:'VIEW',mode:'FAN'}),/VIEW/);
assert.match(pathLabel({stage:'FIND',query:'alpha',total:14}),/14/);
assert.match(pathLabel({stage:'RETURN'}),/PREVIEW/);

// Bounded display preserves the full sequence under arbitrary wraps.
for(const n of [0,1,2,3,8,193]){
 const items=Array.from({length:n},(_,id)=>({id}));
 for(let a=0;a<Math.max(1,n);a++){
  const ds=drumSlots(items,a);assert.equal(ds.length,n);
  assert.ok(ds.filter(x=>x.visible).length<=3);
  if(n){assert.equal(ds.find(x=>x.delta===0).item.id,a);assert.equal(ds.filter(x=>x.delta===0).length,1);}
  assert.deepEqual(ds.map(x=>x.item.id),items.map(x=>x.id));
 }
}
console.log('INTERPHASE COMPOSITOR PASS: 3-root aperture, staged views/return, full ordinal drum at 0–193 entries, ≤3 visible, preserved ring donor, wrap navigation');
