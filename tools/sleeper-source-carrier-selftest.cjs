'use strict';
/* node tools/sleeper-source-carrier-selftest.cjs — no browser or network needed. */
const assert=require('node:assert/strict');
const C=require('../sleeper/source-carrier.js');
let n=0;
function test(name,fn){fn();n++;console.log('PASS '+name)}
const source='  At 08:10 the gauge rose. A second witness disagreed.\n\n'
  +'The rule has an author; neither the rule nor the narrator is self-certifying. '+('water '.repeat(40));
const base={kind:'AXIS',source,title:'Source witness',sourceHash:'sha256:example',address:'local:axis-score',from:'/sleeper/axis-score.html',start:2,end:source.length};
test('exact excerpt and bound 120',()=>{const p=C.make(base);assert.equal(p.excerpt,source.slice(p.witness.start,p.witness.end));assert.ok(p.excerpt.length<=120);assert.equal(p.witness.truncated,true);assert.ok(C.valid(p))});
test('reproducible parcel',()=>assert.deepEqual(C.make(base),C.make(base)));
test('Prison Age address stays separate from native law',()=>{const p=C.make({...base,kind:'PRISON_AGE',from:'/prison-age/?passage=1&trail=3a.3b',address:'/prison-age/stories/03-open-air.md#17'});assert.equal(p.kind,'PRISON_AGE');assert.ok(C.valid(p));assert.equal(p.authority,'EVIDENCE_ONLY')});
test('last partial witness is not marked truncated',()=>{const p=C.make({...base,start:2,end:15});assert.equal(p.excerpt,source.slice(p.witness.start,p.witness.end));assert.equal(p.witness.truncated,false)});
test('Unicode preserves UTF16 source offsets',()=>{const p=C.make({...base,source:'甲🙂乙 丁',start:1,end:6});assert.equal(p.excerpt,'🙂乙 丁');assert.equal(p.witness.end-p.witness.start,p.excerpt.length)});
test('reject off-source or empty spans',()=>{assert.throws(()=>C.make({...base,start:-1}),/BOUNDS/);assert.throws(()=>C.make({...base,start:0,end:1}),/EMPTY/)});
test('reject extra-site returns and invented origins',()=>{assert.throws(()=>C.make({...base,from:'https://host.invalid/'}),/ADDRESS/);assert.throws(()=>C.make({...base,from:'//host.invalid/'}),/ADDRESS/)});
test('tampering invalidates address evidence',()=>{const p=JSON.parse(JSON.stringify(C.make(base)));p.excerpt='forged';assert.equal(C.valid(p),false);p.excerpt=C.make(base).excerpt;p.witness.end++;assert.equal(C.valid(p),false)});
test('consume once, reject malformed payloads',()=>{const map=new Map(),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};const p=C.make(base);C.store(storage,p);assert.deepEqual(C.consume(storage),p);assert.equal(C.consume(storage),null);storage.setItem(C.KEY,'{bad');assert.equal(C.consume(storage),null)});
test('rejoin requires complete native artifact and evidence trace',()=>{const p=C.make(base);const art={schema:'sleeper.one-return',version:2,proofs:Array.from({length:8},(_,i)=>({gate:i})),worldKey:'EXAMPLE'},trace={authority:'EVIDENCE_ONLY'};assert.equal(C.rejoin(p,art,trace).sourceCarrier,p);assert.throws(()=>C.rejoin(p,{...art,proofs:[]},trace),/UNPROVEN/);assert.throws(()=>C.rejoin(p,art,{authority:'CANON'}),/UNPROVEN/)});
console.log('SLEEPER / SOURCE CARRIER: '+n+' PASS');
