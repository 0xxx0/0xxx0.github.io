const fs=require('fs');
const path=require('path');
const H=require('../lib/interphase-history.js');
const L=require('../lib/interphase-lenses.js');
const assert=(x,m)=>{if(!x)throw new Error(m)};

const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'..','showcase-manifest.json'),'utf8'));
const root=manifest.routes.find(r=>r.href==='/');
assert(root,'FIELD root route missing');

const obj=H.objectFromRoute(root);
assert(obj.id==='route:/','real FIELD identity');
assert(obj.kind==='FIELD_ROUTE','real FIELD kind');
assert(obj.title===root.title,'real FIELD title');
assert(obj.provenance.origin==='/showcase-manifest.json','manifest provenance');
assert(obj.provenance.href==='/','manifest href provenance');
assert(obj.payload.version===root.version,'manifest payload preserved');

const history=H.createHistory(obj,{anchor:{projection:'PLAIN',focus:obj.id,task:'ORIENT'}});
const base=history.head();
const baseSource=history.source();

const compact=L.COMPACT.get(baseSource);
const a=history.branch(base,{title:compact.title+' · HELD'},{
  lens:'COMPACT',
  anchor:{projection:'COMPACT',focus:obj.id,task:'HOLD',viewport:{scale:1}}
});
assert(a.ok&&!a.no_op,'COMPACT branch');
assert(a.source.id===obj.id,'COMPACT branch identity');
assert(a.source.payload.href==='/'&&a.source.provenance.href==='/','COMPACT branch origin preservation');

const field=L.FIELD.project(baseSource,{focus:obj.id,camera:{x:3,y:4,z:5,rx:0,ry:90,rz:0},aperture:'DETAIL'});
const b=history.branch(base,{thesis:field.thesis+' [FIELD witness]'},{
  lens:'FIELD',
  anchor:{projection:'FIELD',focus:obj.id,task:'PROVE',viewport:field.$view}
});
assert(b.ok&&!b.no_op,'FIELD branch');
assert(b.source.id===obj.id,'FIELD branch identity');

const merged=history.merge(a.id,b.id,{
  anchor:{projection:'FIELD',focus:obj.id,task:'COMPARE',viewport:field.$view}
});
assert(merged.ok,'disjoint semantic merge');
assert(merged.node.parents.length===2,'merge has two parents');
assert(merged.source.title.endsWith('· HELD'),'merged title');
assert(merged.source.thesis.endsWith('[FIELD witness]'),'merged thesis');
assert(merged.source.id===obj.id,'merge identity');
assert(merged.source.payload.href==='/'&&merged.source.payload.receipt===root.receipt,'merge preserves origin payload');

const c1=history.branch(base,{title:'LEFT TITLE'},{lens:'COMPACT'});
const c2=history.branch(base,{title:'RIGHT TITLE'},{lens:'FIELD'});
const conflict=history.merge(c1.id,c2.id);
assert(!conflict.ok&&conflict.reason==='SEMANTIC_CONFLICT'&&conflict.conflicts.title,'same-field conflict fails closed');

history.checkout(merged.id);
const token=history.makeReturnToken(merged.id,{
  projection:'FIELD',focus:obj.id,task:'COMPARE',viewport:{camera:{x:3,y:4,z:5},aperture:'DETAIL'}
});
assert(token.object_id===obj.id&&token.change===merged.id,'return token address');

const serialized=JSON.stringify(history.serialize());
const restored=H.restoreHistory(serialized);
assert(restored.object_id===obj.id,'restore object identity');
assert(restored.head()===merged.id,'restore history cursor');
assert(restored.source().title===merged.source.title,'restore semantic state');
const reentry=restored.resolveReturn(token);
assert(reentry.source.id===obj.id,'RETURN source identity');
assert(reentry.anchor.projection==='FIELD','RETURN projection');
assert(reentry.anchor.focus===obj.id,'RETURN focus');
assert(reentry.anchor.viewport.camera.x===3,'RETURN viewport');
assert(reentry.anchor.history_cursor===merged.id,'RETURN history cursor');

const beforeCount=restored.nodes().length;
const compensation=restored.returnTo(base,{anchor:{projection:'PLAIN',focus:obj.id,task:'RETURN'}});
assert(compensation.ok&&!compensation.no_op&&compensation.node.op==='RETURN','RETURN compensation appended');
assert(restored.nodes().length===beforeCount+1,'RETURN preserves history');
assert(restored.source().title===obj.title&&restored.source().thesis===obj.thesis&&restored.source().state===obj.state,'RETURN restores semantic source');
assert(restored.source().payload.href==='/'&&restored.source().provenance.fingerprint===obj.provenance.fingerprint,'RETURN preserves real origin');

const twin=H.createHistory(obj,{anchor:{projection:'PLAIN',focus:obj.id,task:'ORIENT'}});
const twinA=twin.branch(twin.head(),{title:compact.title+' · HELD'},{lens:'COMPACT',anchor:{projection:'COMPACT',focus:obj.id,task:'HOLD',viewport:{scale:1}}});
assert(twinA.id===a.id,'content addressing must be deterministic');

const tampered=JSON.parse(serialized);
tampered.nodes[0].snapshot.title='TAMPER';
let tamperRejected=false;
try{H.restoreHistory(tampered)}catch(_){tamperRejected=true}
assert(tamperRejected,'tampered history must fail closed');

// Recomputed checksums do not grant topology or object authority.
function rehash(n){const {id,...body}=n;return {...body,id:'chg:'+H.fingerprint(body)};}
function rejects(doc,label){let rejected=false;try{H.restoreHistory(doc)}catch(_){rejected=true}assert(rejected,label);}
const duplicate=JSON.parse(serialized);duplicate.nodes.push(duplicate.nodes[0]);rejects(duplicate,'duplicate node');
const extraRoot=JSON.parse(serialized),rootNode=extraRoot.nodes.find(n=>n.op==='IMPORT');
extraRoot.nodes.push(rehash({...rootNode,meta:{cause:'EXTRA_ROOT'}}));rejects(extraRoot,'second root');
const drift=JSON.parse(serialized),leaf=drift.nodes.find(n=>n.id===drift.head);
const altered=rehash({...leaf,snapshot:{...leaf.snapshot,id:'route:/other'}});
drift.nodes=drift.nodes.map(n=>n===leaf?altered:n);drift.head=altered.id;rejects(drift,'rehashed snapshot identity drift');

console.log('INTERPHASE HISTORY SELFTEST PASS',H.VERSION,JSON.stringify({object:obj.id,base,merged:merged.id,return_token:token.id,conflict:true,durable:true,return_append:true}));
