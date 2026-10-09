const assert=require('node:assert/strict');
const {project}=require('../fovea-context.js');
const routes=[{href:'/',parent:null},{href:'/a/',parent:'/'},{href:'/a/b/',parent:'/a/'},{href:'/a/b/c/',parent:'/a/b/'},{href:'/peer/',parent:'/'}];
const bytes=JSON.stringify(routes),p=project(routes,'/a/b/');
assert.equal(p.focus,'/a/b/');assert.equal(p.authority,'NONE');
assert.deepEqual(p.bands.map(x=>x.band),['PARA','PARA','FOVEA','PARA','PERIPHERY']);
assert.equal(p.total,routes.length);assert.equal(JSON.stringify(routes),bytes);
assert.ok(project(routes,'missing').bands.every(x=>x.band==='PLAIN'));
assert.equal(project([{href:'/a/',parent:'/b/'},{href:'/b/',parent:'/a/'}],'/a/').counts.PARA,1);
// Every source stays addressed; projection cannot delete a route or move focus.
for(const r of routes){const q=project(routes,r.href);assert.equal(q.counts.FOVEA,1);assert.deepEqual(q.bands.map(x=>x.href),routes.map(x=>x.href));}
console.log('FOVEA CONTEXT PASS: exact identity, declared ancestry, cyclic/missing parents, recoverable periphery, no source mutation');
