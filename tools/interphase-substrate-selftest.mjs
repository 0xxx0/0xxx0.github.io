import assert from 'node:assert/strict';
import {DEFAULT_KERNEL,graphIndex,isAncestor,neighborhood,semanticPoint,substrateModel} from '../interphase/substrate-kernel.mjs';

const routes=[
  {href:'/',title:'FIELD',parent:null,operation:'OBJECT'},
  {href:'/a/',title:'A',parent:'/',operation:'ADDRESS'},
  {href:'/b/',title:'B',parent:'/',operation:'ADDRESS'},
  {href:'/a/edit/',title:'Edit A',parent:'/a/',operation:'OPERATE'},
  {href:'/a/view/',title:'View A',parent:'/a/',operation:'PROJECT'},
  {href:'/a/view/deep/',title:'Deep A',parent:'/a/view/',operation:'PROJECT'},
  {href:'/b/return/',title:'Return B',parent:'/b/',operation:'RETURN'},
  {href:'/mystery/',title:'Mystery',parent:'/',operation:'INVENTED'}
];

const {by}=graphIndex(routes);
assert.equal(isAncestor(by,'/','/a/view/deep/'),true);
assert.equal(isAncestor(by,'/a/','/b/'),false);
const hood=neighborhood(routes,'/a/',{maxHops:3});
assert.equal(hood.status,'OK');
assert.equal(hood.items.find(x=>x.href==='/').relation,'UP');
assert.equal(hood.items.find(x=>x.href==='/a/edit/').relation,'DOWN');
assert.equal(hood.items.find(x=>x.href==='/b/').relation,'ACROSS');
assert.equal(hood.items.find(x=>x.href==='/a/view/deep/').distance,2);

const address1=semanticPoint('ADDRESS',1,{kernel:DEFAULT_KERNEL,maxHops:3});
const address2=semanticPoint('ADDRESS',2,{kernel:DEFAULT_KERNEL,maxHops:3});
const operate1=semanticPoint('OPERATE',1,{kernel:DEFAULT_KERNEL,maxHops:3});
assert.equal(address1.angle,address2.angle,'same declared operation must keep the same angle');
assert.ok(address2.radius>address1.radius,'greater parent-edge distance must move outward');
assert.equal(address1.radius,operate1.radius,'equal hop count must keep equal radius');
assert.notEqual(address1.angle,operate1.angle,'different declared operations occupy different sectors');
assert.equal(semanticPoint('INVENTED',1,{kernel:DEFAULT_KERNEL,maxHops:3}),null,'unknown operation must not receive invented coordinates');

const model=substrateModel(routes,'/a/',{kernel:DEFAULT_KERNEL,maxHops:3});
assert.equal(model.status,'OK');
assert.equal(model.focus,'/a/');
assert.ok(model.groups.length>0);
assert.ok(model.unplaced.some(x=>x.href==='/mystery/'),'missing/unknown semantics remain explicit residue');

// / and /b/ are both two different semantic relations from focus but share
// ADDRESS only where warranted; identical cells aggregate rather than jitter.
for(const g of model.groups){
  for(const item of g.items){
    assert.equal(item.distance,g.distance);
    assert.equal(item.record.operation,g.operation);
  }
  const again=semanticPoint(g.operation,g.distance,{kernel:model.kernel,maxHops:model.maxHops});
  assert.equal(g.point.x,again.x);assert.equal(g.point.y,again.y);
}

// Every rendered edge is backed by one or more actual declared parent edges.
for(const e of model.edges)assert.ok(e.count>=1&&e.a&&e.b);

// Route input order cannot move a semantic coordinate.
const reversed=substrateModel([...routes].reverse(),'/a/',{kernel:DEFAULT_KERNEL,maxHops:3});
const coords=m=>new Map(m.groups.map(g=>[g.key,[g.point.x,g.point.y,g.items.map(x=>x.href)]]));
assert.deepEqual(coords(reversed),coords(model));

console.log('INTERPHASE SUBSTRATE PASS: angle=declared operation, radius=exact parent-edge hops, declared edges only, collisions aggregate, unknown semantics refuse placement, permutation invariant');
