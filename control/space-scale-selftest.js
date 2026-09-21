const assert=require('assert');
const S=require('../foundry/room/space-core.js');

assert.strictEqual(S.SCHEMA,'0xxx0/space-scale/v0.2');
assert.strictEqual(S.semanticLevel(.2),'GLYPH');
assert.strictEqual(S.semanticLevel(.8),'BLOCK');
assert.strictEqual(S.semanticLevel(2),'ROOM');

let m=S.model({meta:{id:'test',title:'test'}});
m.nodes.push(
  S.primitive('a','A',0,0,[S.port('out','out','TEXT')],{kind:'SOURCE',value:'alpha beta gamma'}),
  S.primitive('b','B',200,0,[S.port('in','in','TEXT'),S.port('out','out','TOKENS')],{kind:'MAP',fn:'TOKENS'}),
  S.primitive('c','C',400,0,[S.port('in','in','TOKENS'),S.port('out','out','NUMBER')],{kind:'MAP',fn:'COUNT'}),
  S.primitive('bad','BAD',0,200,[S.port('in','in','NUMBER')],{kind:'SINK'})
);
let d=S.dock(m,{node:'a',port:'out'},{node:'b',port:'in'});
assert(d.ok);m=d.model;
d=S.dock(m,{node:'b',port:'out'},{node:'c',port:'in'});
assert(d.ok);m=d.model;

const bad=S.dock(m,{node:'a',port:'out'},{node:'bad',port:'in'});
assert.strictEqual(bad.ok,false);
assert.strictEqual(bad.reason,'TYPE_MISMATCH');

const folded=S.fold(m,['b','c'],{id:'room',label:'B+C'});
assert(folded.ok);m=folded.model;
const room=S.byId(m,'room');
assert(room&&room.kind==='composite');
assert.deepStrictEqual(S.childrenOf(m,'room').map(x=>x.id).sort(),['b','c']);
assert(room.ports.some(p=>p.dir==='in'&&p.type==='TEXT'),'composite must expose external/free input');
assert(room.ports.some(p=>p.dir==='out'&&p.type==='NUMBER'),'composite must expose free output');
const inProxy=room.ports.find(p=>p.dir==='in'&&p.type==='TEXT');
assert.deepStrictEqual(S.resolveEndpoint(m,{node:'room',port:inProxy.id}),{node:'b',port:'in'});

const toBad=S.dock(m,{node:'room',port:room.ports.find(p=>p.type==='NUMBER').id},{node:'bad',port:'in'});
assert(toBad.ok);m=toBad.model;

const run=S.run(m);
assert(run.ok);
assert.deepStrictEqual(run.values.b,['alpha','beta','gamma']);
assert.strictEqual(run.values.c,3);
assert.strictEqual(run.values.bad,3);

const fork=S.forkSubtree(m,'room',{suffix:'-v2'});
assert(fork.ok);m=fork.model;
assert(S.byId(m,'room-v2'));
assert(S.childrenOf(m,'room-v2').length===2);
assert(m.edges.length>=4,'fork should clone internal edge');

const expanded=S.setCollapsed(m,'room',false);
assert(expanded.ok&&S.byId(expanded.model,'room').collapsed===false);
const dissolved=S.dissolve(expanded.model,'room');
assert(dissolved.ok&&!S.byId(dissolved.model,'room'));
assert.strictEqual(S.parentOf,undefined,'parentOf intentionally private');

const recipe=S.materialize(m);
assert.strictEqual(recipe.schema,'0xxx0/materialization-recipe/v0.1');
assert(recipe.warning.includes('physical fit/load/safety not inferred'));

const receipt=S.receipt(m,[{kind:'test'}]);
assert.strictEqual(receipt.schema,'0xxx0/space-scale-return/v0.2');
assert(receipt.composites.some(x=>x.id==='room'));

const furnisher=S.seedFurnisher();
const comp=S.byId(furnisher,'compiler-room');
assert(comp&&comp.kind==='composite'&&comp.collapsed===true);
assert(S.childrenOf(furnisher,'compiler-room').length===3);
assert(comp.ports.some(p=>p.type==='CONSTRAINT'&&p.dir==='in'));
assert(comp.ports.some(p=>p.type==='EVIDENCE'&&p.dir==='out'));
const fr=S.run(furnisher);
assert(fr.ok,'FURNISHER seed graph should execute');
assert(fr.values.return?.status==='RETURNED');

console.log('SPACE SCALE SELFTEST PASS · typed dock + recursive fold + semantic zoom + fork + execute + RETURN');
