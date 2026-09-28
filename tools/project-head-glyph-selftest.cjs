const assert=require('node:assert/strict');
const fs=require('node:fs');
const P=require('../lib/project-head-glyph.js');

const current=JSON.parse(fs.readFileSync('control/CURRENT.json','utf8'));
const manifest=JSON.parse(fs.readFileSync('showcase-manifest.json','utf8'));

function fixture(lineage){
  const head=current.current_heads.find(x=>x.lineage===lineage);
  assert.ok(head,'missing CURRENT head '+lineage);
  const route=manifest.routes.find(x=>x.href===head.route);
  assert.ok(route,'missing manifest route '+head.route);
  const children=manifest.routes.filter(x=>x.parent===route.href);
  return {head,route,children};
}

const fold=fixture('fold-bloom'),sleeper=fixture('sleeper-one-return');
for(const f of [fold,sleeper]){
  const a=P.descriptor(f.head,f.route,{children:f.children});
  const b=P.descriptor(f.head,f.route,{children:f.children});
  assert.deepEqual(a,b,'project glyph derivation must be deterministic');
  assert.equal(a.model.schema,'interphase-glyph/v0.1');
  assert.equal(a.model.authority,'VIEW');
  assert.equal(a.descriptor.address.route,f.route.href);
  assert.equal(a.descriptor.address.lineage,f.head.lineage);
  assert.ok(a.descriptor.channels.includes('identity'));
  assert.ok(a.descriptor.channels.includes('address'));
  assert.ok(a.descriptor.channels.includes('authority'));
  assert.ok(a.model.operations.length>=1&&a.model.operations.length<=3);
  assert.ok(a.model.operations.every(x=>x.authority==='VIEW'),'project glyph cannot mint edit/effect authority');
  assert.ok(!JSON.stringify(a).includes(String(f.head.retained_function||'')),'long retained prose must not leak into glyph');
  const s=P.summary(f.head,f.route,{children:f.children});
  assert.equal(s.route,f.route.href);
  assert.equal(s.childCount,f.children.length);
  assert.equal(s.authority,'VIEW');
  assert.equal(typeof s.residueCount,'number');
  const svg=P.svg(f.head,f.route,{children:f.children,size:180});
  assert.ok(svg.includes('data-interphase-glyph="interphase-glyph/v0.1"'));
}
assert.ok(fold.children.length>sleeper.children.length,'fixtures should remain deliberately unequal');
assert.notEqual(P.summary(fold.head,fold.route,{children:fold.children}).id,P.summary(sleeper.head,sleeper.route,{children:sleeper.children}).id);
assert.throws(()=>P.descriptor({...fold.head,route:'/wrong/'},fold.route,{children:fold.children}),/MISMATCH/);

const rep={
  recipe:{lensId:'field-glyph',lensVersion:'1',kind:'VIEW_LENS',authority:'PREVIEW',inputContract:'field-route/v0.1',outputContract:'projection/glyph',preserves:['identity','address'],hides:['content'],derives:['kind','operation','state']},
  descriptor:{kind:'hub',state:'ACTIVE'},
  svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M1 1h22v22H1z"/></svg>'
};
const nested=P.descriptor(sleeper.head,sleeper.route,{children:sleeper.children,representation:rep});
assert.equal(nested.model.representation.svg,rep.svg,'existing FIELD glyph must survive as inner representation');
assert.ok(P.svg(sleeper.head,sleeper.route,{children:sleeper.children,representation:rep}).includes('<image '),'project glyph must compose native glyph instead of replacing it');

console.log('PROJECT HEAD GLYPH SELFTEST PASS · FOLD',fold.children.length,'children · SLEEPER',sleeper.children.length,'children');
