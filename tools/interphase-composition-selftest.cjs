const C=require('../lib/interphase-composition.js');
const L=require('../lib/interphase-lenses.js');
const assert=(x,m)=>{if(!x)throw new Error(m)};
const same=(a,b)=>C.stable(a)===C.stable(b);

const src=L.createGenesisObject({title:'INTERPHASE',thesis:'One object, many lawful readings.',state:'SOURCE',residue:{keep:'yes'}});
const R=C.ref(src,src.kind);
assert(R.id===src.id&&R.kind===src.kind,'stable ref');

const c0=L.COMPACT.get(src);
const c1=C.lensChange(L.COMPACT,src,{...c0,title:'INTERPHASE / CHANGE',line:'Change is first-class.',state:'HOLD'},
  {id:'chg:compact',ref:R,provenance:{wasAttributedTo:'selftest'}});
assert(c1.schema===C.CHANGE_SCHEMA&&!c1.no_op,'change schema');
assert(c1.touches.length===1&&C.sameRef(c1.touches[0],R),'change touches stable ref');
const s1=C.applyChange(src,c1);
assert(s1.title==='INTERPHASE / CHANGE'&&s1.thesis==='Change is first-class.'&&s1.state==='HOLD','apply lens change');
assert(s1.id===src.id&&same(s1.provenance,src.provenance)&&s1.residue.keep==='yes','change preserves lens protections');

const inv=C.invertChange(c1,{id:'chg:compact:undo'});
assert(same(C.applyChange(s1,inv),src),'inverse law');
let mismatch=false;try{C.applyChange({...src,title:'wrong base'},c1)}catch(e){mismatch=/BASE_MISMATCH/.test(e.message)}
assert(mismatch,'strict apply must fail closed');

const f0=L.FIELD.get(s1);
const c2=C.lensChange(L.FIELD,s1,{...f0,title:'INTERPHASE / COMPOSED',state:'RETURN'},
  {id:'chg:field',ref:R});
const chain=C.composeChanges(c1,c2);
assert(same(C.applyChange(src,chain),c2.after),'composition law');
assert(chain.touches.length===1&&C.sameRef(chain.touches[0],R),'composition touch union');
let gap=false;try{C.composeChanges(c2,c1)}catch(e){gap=/COMPOSE_GAP/.test(e.message)}
assert(gap,'composition gap must fail closed');

const view=C.projection({
  id:'lens:COMPACT',sourceRef:R,sourceRevision:2,authority:'DERIVED',updatePolicy:'LENS',
  losses:['provenance detail','view-local geometry'],value:L.COMPACT.project(c2.after),
  provenance:{wasGeneratedBy:'COMPACT'}
});
assert(view.authority==='DERIVED'&&view.updatePolicy==='LENS'&&C.canWriteProjection(view),'lawful editable derived projection');
const readonly=C.projection({id:'glyph:witness',sourceRef:R,sourceRevision:2,authority:'DERIVED',updatePolicy:'NONE',losses:['content'],value:{id:R.id}});
assert(!C.canWriteProjection(readonly),'read-only projection authority');
let denied=false;try{C.assertProjectionWrite(readonly)}catch(e){denied=/WRITE_DENIED/.test(e.message)}
assert(denied,'derived projection cannot silently become authority');

const cache=C.createDerivedCache();let computes=0;
const deps=[{ref:R,revision:2}];
const a=cache.read('compact',deps,()=>{computes++;return L.COMPACT.project(c2.after)});
const b=cache.read('compact',deps,()=>{computes++;return {bad:true}});
assert(computes===1&&same(a,b)&&cache.stats().hits===1,'derived cache reuses unchanged dependencies');
assert(cache.invalidate(R)===1,'touch invalidates dependent projection');
cache.read('compact',deps,()=>{computes++;return L.COMPACT.project(c2.after)});
assert(computes===2&&cache.stats().invalidations===1,'invalidated projection recomputes');

const anchor=C.createAnchor({ref:R,projection:'COMPACT',focus:{field:'title'},revision:2,at:'2026-10-06T00:00:00.000Z'});
const world=[{id:'other',kind:'X'},c2.after,{id:'tail',kind:'X'}];
world.reverse();
const reentry=C.reenter(anchor,r=>world.find(x=>x.id===r.id),obj=>L.COMPACT.project(obj));
assert(reentry.ref.id===R.id&&reentry.value.id===R.id&&reentry.anchor.focus.field==='title','semantic RETURN survives reorder');

const why=C.whyAll(C.whySource(R,{kind:'source'}),C.whyAny(C.whySource({id:'receipt:1',kind:'RECEIPT'}),C.whySource({id:'receipt:2',kind:'RECEIPT'})));
const sources=C.whySources(why).map(x=>x.id).sort();
assert(sources.join('|')==='obj:genesis#0|receipt:1|receipt:2','provenance WHY tree');

const t=C.temporal({state:'HOLD'},{validFrom:'2026-10-01T00:00:00Z',validTo:'2026-10-03T00:00:00Z',observedAt:'2026-10-02T00:00:00Z'});
assert(C.validAt(t,'2026-10-02T12:00:00Z')&&!C.validAt(t,'2026-10-03T00:00:00Z'),'temporal valid-time boundary');

console.log('INTERPHASE COMPOSITION SELFTEST PASS',C.VERSION,JSON.stringify({change:true,inverse:true,compose:true,authority:true,derived:true,anchor:true,why:true,temporal:true}));
