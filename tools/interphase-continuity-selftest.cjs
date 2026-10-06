const fs=require('fs');
const path=require('path');
const I=require('../lib/interphase-lenses.js');
const D=require('../lib/interphase-change-dag.js');
const F=require('../lib/interphase-field-object.js');
const E=require('../lib/interphase-effect-machine.js');
const assert=(x,m)=>{if(!x)throw new Error(m)};

function memoryStorage(seed={}){
  const m=new Map(Object.entries(seed));
  return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(String(k),String(v)),removeItem:k=>m.delete(k),dump:()=>Object.fromEntries(m)};
}

const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'..','showcase-manifest.json'),'utf8'));
const route=F.selectManifestRoute(manifest,'/');
assert(route,'FIELD root route exists');
const source=F.fromManifestRoute(route);
assert(source.id==='/','real FIELD specimen keeps exact route identity');
assert(source.provenance.source==='showcase-manifest.json'&&source.provenance.href==='/','manifest provenance');
assert(source.residue.manifest_route.href==='/'&&source.residue.route_state===route.state,'FIELD residue survives adapter');
assert(source.state==='SOURCE','INTERPHASE state must not counterfeit FIELD route state');

const storageA=memoryStorage(),storageB=memoryStorage();
const a=D.createDagStore(I,source,{storage:storageA,actor:'test'});
const b=D.createDagStore(I,source,{storage:storageB,actor:'test'});
const ca=a.project('COMPACT'),cb=b.project('COMPACT');
const ea=a.edit('COMPACT',{...ca,line:ca.line+' [A]',state:'HOLD'},{cause:'determinism'});
const eb=b.edit('COMPACT',{...cb,line:cb.line+' [A]',state:'HOLD'},{cause:'determinism'});
assert(ea.receipt.id===eb.receipt.id,'same content + parent + actor must checksum-address identically');
assert(a.heads().length===1,'first edit creates one head');

const firstHead=a.selectedHead();
assert(a.checkout(null).ok,'checkout SOURCE');
const field=a.project('FIELD',{camera:{ry:17}});
const branch=a.edit('FIELD',{...field,title:field.title+' · branch',state:'RETURN'},{cause:'branch'});
assert(branch.ok&&!branch.no_op,'branch edit');
assert(a.heads().length===2,'editing from SOURCE after an existing head creates two live heads');
assert(a.heads().includes(firstHead)&&a.heads().includes(branch.receipt.id),'both branch tips retained');

const exported=a.exportState();
const restored=D.createDagStore(I,source,{storage:memoryStorage(),actor:'test'});
assert(restored.importState(exported).ok,'serialized DAG imports');
assert(restored.heads().length===2&&restored.selectedHead()===a.selectedHead(),'heads + selection survive serialization');
assert(restored.source().title===a.source().title,'selected source reconstructs');

assert(a.checkout(firstHead).ok,'checkout first branch');
const beforeReturnHeads=a.heads().slice();
const ret=a.returnLast({cause:'selftest-return'});
assert(ret.ok&&ret.receipt.op==='RETURN','RETURN appends a DAG node');
assert(a.snapshot().history.some(r=>r.id===firstHead),'RETURN never erases target history');
assert(a.heads().length===beforeReturnHeads.length,'RETURN replaces selected leaf but preserves sibling branch count');

const catchupBefore=JSON.stringify({'/other/':123});
const sharedStorage=memoryStorage({[E.CATCHUP_ITEM_KEY]:catchupBefore});
const effect=E.createFieldCatchupMachine({storage:sharedStorage,href:'/'});
const committed=effect.commit({stamp:456,cause:'selftest'});
assert(committed.ok&&effect.snapshot().state==='EFFECTED','effect commit state');
assert(JSON.parse(sharedStorage.getItem(E.CATCHUP_ITEM_KEY))['/']===456,'effect mutates real FIELD catch-up key shape');
const rawAfterEffect=sharedStorage.getItem(E.CATCHUP_ITEM_KEY);
const canonicalOnly=D.createDagStore(I,source,{storage:sharedStorage,actor:'boundary'});
const cc=canonicalOnly.project('COMPACT');
canonicalOnly.edit('COMPACT',{...cc,line:cc.line+' [canonical]'});
canonicalOnly.returnLast();
assert(sharedStorage.getItem(E.CATCHUP_ITEM_KEY)===rawAfterEffect,'canonical RETURN cannot touch browser FIELD effect key');
const compensated=effect.compensate({cause:'selftest'});
assert(compensated.ok&&effect.snapshot().state==='COMPENSATED','compensation state');
assert(sharedStorage.getItem(E.CATCHUP_ITEM_KEY)===catchupBefore,'COMPENSATE restores exact prior browser value');

const interphase=F.selectManifestRoute(manifest,'/interphase/');
assert(interphase&&interphase.family==='INTERPHASE','INTERPHASE route remains canonical manifest surface');
assert(fs.existsSync(path.join(__dirname,'..','lib','interphase-field-index.js')),'FIELD continuity projection exists');

console.log('INTERPHASE CONTINUITY SELFTEST PASS',JSON.stringify({object:source.id,deterministic:true,heads:a.heads().length,persisted:true,return_append_only:true,effect_key:E.CATCHUP_ITEM_KEY,compensated:true}));
