const assert=require('node:assert/strict');
const T=require('../lib/read-trail.js');
class Mem{constructor(){this.m=new Map()}getItem(k){return this.m.has(k)?this.m.get(k):null}setItem(k,v){this.m.set(k,String(v))}removeItem(k){this.m.delete(k)}}
const s=new Mem(),key=T.sourceKey({source:'alpha beta gamma',label:'demo'});
assert.match(key,/^content:/);
let x=T.record(key,{address:'para://1',progress:.2,focus:'beta',charIndex:6},s);
assert.equal(x.furthest,.2);assert.equal(x.last.address,'para://1');
x=T.record(key,{address:'read://demo/paragraph/2',progress:.55,focus:'gamma',charIndex:11,via:'LIVE_READ_RIDE'},s);
assert.equal(x.furthest,.55);assert.equal(x.last.via,'LIVE_READ_RIDE');assert.equal(x.last.charIndex,11);
x=T.record(key,{address:'para://0',progress:.1,focus:'alpha'},s);
assert.equal(x.furthest,.55);
x=T.addMark(key,{address:'read://demo/paragraph/2',progress:.55,label:'bookmark'},s);
assert.equal(x.marks.length,1);
x=T.addMark(key,{address:'read://demo/paragraph/2',progress:.55,label:'duplicate'},s);
assert.equal(x.marks.length,1);
assert.equal(T.nextMark(x,.2,1).address,'read://demo/paragraph/2');
assert.equal(T.nextMark(x,.8,1).address,'read://demo/paragraph/2');
assert.match(x.law,/never means read/i);
console.log(JSON.stringify({ok:true,schema:x.schema,key,furthest:x.furthest,marks:x.marks.length,visits:x.visits.length},null,2));
