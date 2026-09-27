const assert=require('node:assert/strict');
const T=require('../lib/read-trail.js');
class Mem{constructor(){this.m=new Map()}getItem(k){return this.m.has(k)?this.m.get(k):null}setItem(k,v){this.m.set(k,String(v))}removeItem(k){this.m.delete(k)}}
const s=new Mem(),digest='sha256:'+'a'.repeat(64),key=T.sourceKey({hash:digest});
assert.equal(key,digest);assert.equal(T.sourceKey({address:'/docs/source.md'}),'address:/docs/source.md');
assert.equal(T.sourceKey({id:'fnv1a32:deadbeef'}),'');assert.equal(T.sourceKey({id:'weak-id'}),'');
let x=T.record(key,{address:'phrase://1',progress:.2,focus:'beta',charIndex:6,scale:'PHRASE'},s);
assert.equal(x.storageState,'READY');assert.equal(x.furthest,.2);assert.equal(x.last.charIndex,6);
x=T.record(key,{address:'read://demo/paragraph/2',progress:.55,focus:'gamma',charIndex:11,scale:'PARAGRAPH',via:'LIVE_READ_RIDE'},s);
assert.equal(x.furthest,.55);assert.equal(x.last.via,'LIVE_READ_RIDE');
x=T.record(key,{address:'phrase://0',progress:.1,focus:'alpha'},s);assert.equal(x.furthest,.55);
x=T.addMark(key,{id:'phrase://1|6|PHRASE',address:'phrase://1',progress:.2,label:'old bookmark',charIndex:6,scale:'PHRASE'},s);
x=T.addMark(key,{address:'read://demo/paragraph/2',progress:.55,label:'live bookmark',charIndex:11,scale:'PARAGRAPH',via:'LIVE_READ_RIDE'},s);
x=T.addMark(key,{address:'read://same/other',progress:.21,label:'same passage',charIndex:6,scale:'PARAGRAPH',via:'LIVE_READ_RIDE'},s);
assert.equal(x.marks.length,2);assert.equal(T.nextMark(x,.2,1).charIndex,11);
x=T.setMarks(key,[...x.marks,{id:'m3',address:'sentence://3',progress:.8,char_index:15,scale:'SENTENCE'}],s);
assert.equal(x.marks.length,3);assert.equal(x.marks.at(-1).charIndex,15);
assert.equal(Object.prototype.hasOwnProperty.call(x,'source'),false);assert.match(x.law,/never means read/i);

const corruptKey='sha256:'+'b'.repeat(64),slot=T.storageKey(corruptKey);s.setItem(slot,'{bad json');
const before=s.getItem(slot),bad=T.read(corruptKey,s);assert.equal(bad.storageState,'CORRUPT');
const after=T.addMark(corruptKey,{address:'x',progress:.4,charIndex:4},s);
assert.equal(after.storageState,'CORRUPT');assert.equal(s.getItem(slot),before,'corrupt evidence must not be overwritten');
const unavailable=T.read('sha256:'+'c'.repeat(64),null);assert.equal(unavailable.storageState,'UNAVAILABLE');
console.log('READ TRAIL SELFTEST PASS · exact identity · '+x.marks.length+' marks · '+x.visits.length+' visits · corrupt fail-closed');
