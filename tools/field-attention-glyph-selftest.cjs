const assert=require('node:assert/strict');
const fs=require('node:fs');
global.window=global;
global.InterphaseGlyph=require('../lib/interphase-glyph.js');
require('../field-glyph.js');
const P=require('../lib/project-head-glyph.js');

const manifest=JSON.parse(fs.readFileSync('showcase-manifest.json','utf8'));
const current=JSON.parse(fs.readFileSync('control/CURRENT.json','utf8'));
const routeMap=new Map(manifest.routes.map(r=>[r.href,r]));
const head=current.current_heads.find(h=>routeMap.has(h.route));
assert.ok(head,'need one exact CURRENT head fixture');
const route=routeMap.get(head.route);
const children=manifest.routes.filter(x=>x.parent===route.href);

const rep=global.FieldGlyph.representation(route,{head:true});
assert.equal(rep.recipe.kind,'VIEW_LENS');
assert.equal(rep.recipe.authority,'PREVIEW');
assert.deepEqual(rep.recipe.preserves,['identity','address']);
assert.match(rep.svg,/class="fieldGlyph"/);

const genericRoute=manifest.routes.find(r=>r.href!=='/'&&!current.current_heads.some(h=>h.route===r.href))||route;
const lineage=[];let cur=genericRoute,guard=0;
while(cur&&guard++<10){lineage.unshift({id:cur.href,label:cur.title||cur.href});cur=cur.parent?routeMap.get(cur.parent):null}
const genericChildren=manifest.routes.filter(x=>x.parent===genericRoute.href);
const generic=global.FieldGlyph.instrument(genericRoute,{children:genericChildren,chain:lineage,size:68});
assert.equal(generic.model.id,genericRoute.href);
assert.equal(generic.model.authority,'VIEW');
assert.ok(generic.model.operations.length>=1&&generic.model.operations.length<=3);
assert.ok(generic.model.operations.every(x=>x.authority==='VIEW'));
assert.ok(generic.residue.every(x=>x.id===genericRoute.href));
assert.match(generic.svg,/data-interphase-glyph="interphase-glyph\/v0\.1"/);
assert.match(generic.svg,/<image /,'compact FIELD mark must survive as identity core');
assert.match(generic.svg,/class="residue"/,'hidden detail must remain named visually');

const headOpt={children,representation:rep,size:68};
const a=P.descriptor(head,route,headOpt),b=P.descriptor(head,route,headOpt);
assert.deepEqual(a,b,'CURRENT head derivation must be deterministic');
assert.equal(a.descriptor.address.route,route.href);
assert.equal(a.model.authority,'VIEW');
assert.ok(a.model.operations.length>=1&&a.model.operations.length<=3);
assert.ok(a.model.operations.every(x=>x.authority==='VIEW'),'glyph cannot mint effect authority');
assert.ok(!JSON.stringify(a).includes(String(head.retained_function||'')),'long CURRENT prose must not leak into glyph');
const hs=P.summary(head,route,headOpt);
assert.equal(hs.route,route.href);
assert.equal(hs.authority,'VIEW');
assert.equal(typeof hs.residueCount,'number');
const headSvg=P.svg(head,route,headOpt);
assert.match(headSvg,/data-interphase-glyph="interphase-glyph\/v0\.1"/);
assert.match(headSvg,/<image /,'CURRENT head must retain FIELD identity core');
assert.throws(()=>P.descriptor({...head,route:'/definitely-wrong/'},route,headOpt),/MISMATCH/);

const html=fs.readFileSync('index.html','utf8');
const ring=html.indexOf('./lib/interphase-ring.js');
const glyph=html.indexOf('./lib/interphase-glyph.js');
const field=html.indexOf('./field-glyph.js');
const project=html.indexOf('./lib/project-head-glyph.js');
assert.ok(ring>=0&&glyph>ring&&field>glyph&&project>field,'glyph donors must load before held-object compositor');
assert.match(html,/function heldGlyph\(r\)/);
assert.match(html,/exactHeadFor\(r\)/);
assert.match(html,/FieldGlyph\?\.instrument\?\.\(r/);
assert.doesNotMatch(html,/id="scaleRail"/,'attention scaling must not regress to explicit scale controls');

console.log('FIELD ATTENTION GLYPH PASS · peripheral mark → held witness → native object · authority VIEW');
