const fs=require('fs');
const path=require('path');
const L=require('../lib/interphase-lenses.js');
const assert=(x,m)=>{if(!x)throw new Error(m)};

const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'..','showcase-manifest.json'),'utf8'));
const route=manifest.routes.find(r=>r.href==='/interphase/');
assert(route,'/interphase/ route registration');
assert(route.family==='INTERPHASE','/interphase/ family');
assert(route.operation==='OPERATE','/interphase/ operation');
assert(route.state==='ACTIVE','/interphase/ state');
assert(Array.isArray(route.evidence)&&route.evidence.includes('/lib/interphase-lenses.js'),'/interphase/ lens evidence');

const src=L.createGenesisObject({
  title:'INTERPHASE',
  thesis:'One object, many lawful readings.',
  state:'SOURCE',
  residue:{keep:'this survives every lens'}
});

const compact=L.COMPACT.get(src);
const compactLaw=L.checkLens('COMPACT',src,{...compact,id:'obj:attack#9',title:'INTERPHASE / EDIT',line:'Compact edit returns to source.',state:'HOLD',mark:'FAKE',glyph:'FAKE'});
assert(compactLaw.get_put,'COMPACT GetPut');
assert(compactLaw.put_get,'COMPACT PutGet(normalized)');
assert(compactLaw.identity_preserved,'COMPACT identity');
assert(compactLaw.provenance_preserved,'COMPACT provenance');
assert(compactLaw.put_source.residue.keep==='this survives every lens','COMPACT unrelated source fields');
assert(compactLaw.put_source.id===L.GENESIS_ID,'COMPACT identity smuggling');
assert(compactLaw.put_source.title==='INTERPHASE / EDIT','COMPACT title writeback');
assert(compactLaw.put_source.thesis==='Compact edit returns to source.','COMPACT line writeback');
assert(compactLaw.put_source.state==='HOLD','COMPACT state writeback');

const field=L.FIELD.project(src,{camera:{rx:2,ry:3}});
const fieldCandidate={...field,id:'obj:attack#10',title:'INTERPHASE / FIELD',thesis:'FIELD edits semantics; motion stays local.',state:'RETURN',$view:{...field.$view,focus:'view:other',camera:{x:5,y:6,z:7,rx:8,ry:9,rz:10},aperture:'OVERVIEW'}};
const fieldLaw=L.checkLens('FIELD',src,fieldCandidate);
assert(fieldLaw.get_put,'FIELD GetPut');
assert(fieldLaw.put_get,'FIELD PutGet(normalized)');
assert(fieldLaw.identity_preserved,'FIELD identity');
assert(fieldLaw.provenance_preserved,'FIELD provenance');
assert(fieldLaw.put_source.residue.keep==='this survives every lens','FIELD unrelated source fields');
assert(fieldLaw.put_source.id===L.GENESIS_ID,'FIELD identity smuggling');
assert(fieldLaw.put_source.title==='INTERPHASE / FIELD','FIELD title writeback');
assert(fieldLaw.put_source.thesis==='FIELD edits semantics; motion stays local.','FIELD thesis writeback');
assert(fieldLaw.put_source.state==='RETURN','FIELD state writeback');

const locality=L.checkFieldLocality(src,field);
assert(locality.pass,'FIELD camera/focus/aperture mutated source');

const store=L.createTraceStore(src);
const c=store.project('COMPACT');
const e=store.edit('COMPACT',{...c,line:'Trace me.',state:'HOLD'});
assert(e.ok&&!e.no_op&&e.revision===1,'trace edit');
assert(store.source().thesis==='Trace me.'&&store.source().state==='HOLD','trace source');
const r=store.returnLast();
assert(r.ok&&!r.no_op&&r.receipt.op==='RETURN'&&r.revision===2,'RETURN is compensating edit');
assert(store.source().thesis===src.thesis&&store.source().state===src.state,'RETURN restores semantic state');
assert(store.snapshot().history.length===2,'RETURN must preserve history');
assert(store.snapshot().history[0].id!==store.snapshot().history[1].id,'RETURN must append, not erase');

console.log('INTERPHASE LENSES SELFTEST PASS',L.VERSION,JSON.stringify({route:true,compact:compactLaw.get_put&&compactLaw.put_get,field:fieldLaw.get_put&&fieldLaw.put_get,fieldLocality:locality.pass,returnRevision:r.revision}));
