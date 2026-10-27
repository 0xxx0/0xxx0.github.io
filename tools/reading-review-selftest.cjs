const assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const R=require('../lib/readfield-review.js'),T=require('../lib/read-trail.js');
const raw='Meaning is made.\n\nA question remains. Meaning can be applied. 😀';
const revision='sha256:'+createHash('sha256').update(raw).digest('hex');
const m=(start,end,kind='NOTE')=>({id:kind+start,charIndex:start,endIndex:end,quote:raw.slice(start,end),revision,kind,note:'My interpretation',progress:start/raw.length});
const source={raw,revision,label:'fixture',address:'/fixture.md',trail:{marks:[m(0,15),m(5,20),m(18,35,'QUESTION')],review:{purpose:'What follows?',terms:'Meaning',conclusion:'Use it.'}}};
let state=R.interpret(source);assert.equal(state.covered,35,'overlapping annotated ranges counted once');assert.equal(state.open,1);assert.equal(state.applied,0);
assert.equal(R.interpret({...source,revision:'sha256:'+'f'.repeat(64)}).marks.length,0,'changed revision cannot inherit interpretation');
assert.equal(R.interpret({...source,raw:raw.replace('Meaning','Changed')}).unbound,2,'changed quotes reject even with a forged matching revision');
assert.equal(R.interpret({...source,trail:{marks:[{charIndex:0,label:'legacy'}]}}).coverage,0,'bookmarks are not interpretation');
const hits=R.find('a+b A+B İ ß 汉字 😀','a+b;汉字;😀');assert.deepEqual(hits.matches.map(x=>x.quote),['a+b','A+B','汉字','😀']);
for(const hit of hits.matches)assert.equal('a+b A+B İ ß 汉字 😀'.slice(hit.start,hit.end),hit.quote,'Unicode offsets address original source');
assert.equal(R.find('x'.repeat(1100),'x').truncated,true);assert.equal(R.find('x'.repeat(1000),'x').truncated,false);
const packet=R.packet(source);assert.equal(R.accept(packet,source).marks.length,3);assert.match(R.markdown(source),/What follows/);assert.match(R.markdown(source),/char 0:15/);
for(const change of [p=>p.source.revision='sha256:'+'e'.repeat(64),p=>p.marks[0].quote='forged',p=>p.marks[0].charIndex=-1,p=>p.marks[0].endIndex=1e9,p=>p.marks[0].kind='MASTERED',p=>p.marks[0].note='',p=>p.review.purpose=null]){const p=structuredClone(packet);change(p);assert.throws(()=>R.accept(p,source));}
class Mem{constructor(){this.m=new Map}getItem(k){return this.m.get(k)||null}setItem(k,v){this.m.set(k,v)}}
const mem=new Mem,key=T.sourceKey({address:'/fixture.md'});T.setMarks(key,source.trail.marks,mem);T.setReview(key,source.trail.review,mem);T.record(key,{charIndex:15,progress:.2},mem);
const persisted=T.read(key,mem);assert.equal(R.interpret({...source,trail:persisted}).covered,35);assert.deepEqual(persisted.review,source.trail.review);
assert.equal(persisted.marks[0].quote,raw.slice(0,15));assert.equal(persisted.marks[0].revision,revision);
const full=Array.from({length:64},(_,i)=>({...m(i%20,i%20+1),id:'saved:'+i}));T.setMarks(key,full,mem);const atLimit=T.addMark(key,{id:'extra',address:'new',charIndex:59},mem);assert.equal(atLimit.marks.length,64);assert.equal(atLimit.marks.some(m=>m.id==='saved:0'),true,'bookmark at capacity cannot evict an interpretation');
const slot=T.storageKey(key);mem.setItem(slot,'{broken');assert.equal(T.setReview(key,{purpose:'overwrite'},mem).storageState,'CORRUPT');assert.equal(mem.getItem(slot),'{broken');
console.log('READING REVIEW PASS · exact ranges/revision · overlap union · literal Unicode search · hostile import · native trail persistence/corruption');
