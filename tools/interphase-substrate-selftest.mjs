import assert from 'node:assert/strict';
import {ACTION_KERNEL,graphIndex,isAncestor,neighborhood,semanticPoint,substrateModel} from '../interphase/substrate-kernel.mjs';

const routes=[
  {href:'/',title:'FIELD',parent:null,operation:'OBSERVE'},
  {href:'/a/',title:'A',parent:'/',operation:'READ'},
  {href:'/b/',title:'B',parent:'/',operation:'READ'},
  {href:'/a/edit/',title:'Edit A',parent:'/a/',operation:'OPERATE'},
  {href:'/a/view/',title:'View A',parent:'/a/',operation:'PROJECT'},
  {href:'/a/view/deep/',title:'Deep A',parent:'/a/view/',operation:'PROJECT'},
  {href:'/b/return/',title:'Return B',parent:'/b/',operation:'RETURN'},
  {href:'/mystery/',title:'Mystery',parent:'/',operation:'INVENTED'}
];
const fold=Object.freeze({OBSERVE:'SEE',READ:'SEE',OPERATE:'OPERATE',PROJECT:'MAKE',RETURN:'RECOVER'});

const {by}=graphIndex(routes);
assert.equal(isAncestor(by,'/','/a/view/deep/'),true);
assert.equal(isAncestor(by,'/a/','/b/'),false);
const hood=neighborhood(routes,'/a/',{maxHops:3});
assert.equal(hood.status,'OK');
assert.equal(hood.items.find(x=>x.href==='/').relation,'UP');
assert.equal(hood.items.find(x=>x.href==='/a/edit/').relation,'DOWN');
assert.equal(hood.items.find(x=>x.href==='/b/').relation,'ACROSS');
assert.equal(hood.items.find(x=>x.href==='/a/view/deep/').distance,2);

const see1=semanticPoint('SEE',1,{kernel:ACTION_KERNEL,maxHops:3});
const see2=semanticPoint('SEE',2,{kernel:ACTION_KERNEL,maxHops:3});
const operate1=semanticPoint('OPERATE',1,{kernel:ACTION_KERNEL,maxHops:3});
assert.equal(see1.angle,see2.angle,'same explicit action class must keep the same angle');
assert.ok(see2.radius>see1.radius,'greater parent-edge distance must move outward');
assert.equal(see1.radius,operate1.radius,'equal hop count must keep equal radius');
assert.notEqual(see1.angle,operate1.angle,'different action classes occupy different fixed sectors');
assert.equal(semanticPoint('INVENTED',1,{kernel:ACTION_KERNEL,maxHops:3}),null,'unknown class must not receive invented coordinates');

const model=substrateModel(routes,'/a/',{kernel:ACTION_KERNEL,maxHops:3,operationClassMap:fold});
assert.equal(model.status,'OK');
assert.equal(model.mapping,'FIELD_FOLD_MAP');
assert.equal(model.focus,'/a/');
assert.ok(model.groups.length>0);
assert.ok(model.unplaced.some(x=>x.href==='/mystery/'&&x.rawOperation==='INVENTED'),'missing fold entry remains explicit residue');
assert.ok(model.groups.some(g=>g.operation==='SEE'&&g.items.length>=2),'different raw verbs may lawfully aggregate only through explicit fold class');

for(const g of model.groups){
  for(const item of g.items){
    assert.equal(item.distance,g.distance);
    assert.equal(item.operationClass,g.operation);
    assert.equal(fold[item.rawOperation],g.operation);
  }
  const again=semanticPoint(g.operation,g.distance,{kernel:model.kernel,maxHops:model.maxHops});
  assert.equal(g.point.x,again.x);assert.equal(g.point.y,again.y);
}
for(const e of model.edges)assert.ok(e.count>=1&&e.a&&e.b,'every line must witness one or more declared parent edges');

const reversed=substrateModel([...routes].reverse(),'/a/',{kernel:ACTION_KERNEL,maxHops:3,operationClassMap:fold});
const coords=m=>new Map(m.groups.map(g=>[g.key,[g.point.x,g.point.y,g.items.map(x=>x.href)]]));
assert.deepEqual(coords(reversed),coords(model),'route input order cannot move a semantic coordinate');

const rawModel=substrateModel(routes,'/a/',{kernel:ACTION_KERNEL,maxHops:3});
assert.ok(rawModel.unplaced.length>model.unplaced.length,'absence of explicit fold cannot silently classify raw verbs');

console.log('INTERPHASE SUBSTRATE PASS: angle=explicit FIELD action class, radius=exact parent-edge hops, declared edges only, fold collisions aggregate, missing classes refuse placement, permutation invariant');
