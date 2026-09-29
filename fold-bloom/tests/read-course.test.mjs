import assert from 'node:assert/strict';
import {
  READ_RIDE_SCHEMA,makeReadRidePacket,normalizeReadRidePacket,makeReadCourse,
  readCourseAddressAt,stepReadCourse,readCourseWitness,validateReadCourse,makeReadReturnWitness,initialReadProgress
} from '../read-course.js';

const source=`# Gate One

The room opens. The field answers.

A second paragraph carries a distinct thought.

## Gate Two

Another section starts here. It has two sentences. Return remains possible.`;
const packet=makeReadRidePacket({
  source,label:'TEST BOOK',
  sourceIdentity:{hash:'sha256:test-book',kind:'LOCAL_DOCUMENT',authority:'READFIELD'},
  focus:{char_index:source.indexOf('second paragraph')},
  returnAddress:'/docs/?local=1',
  from:'/docs/',
  echo:{
    index:'/prison-age/echo-index.json',
    source_id:'open-air',
    source_path:'/prison-age/stories/03-open-air.md',
    source_fingerprint:{algo:'fnv1a32-unicode',value:'deadbeef',length:123}
  }
});
assert.equal(packet.schema,READ_RIDE_SCHEMA);
assert.equal(normalizeReadRidePacket(packet).sourceIdentity.id,'sha256:test-book');
assert.equal(packet.echo.index,'/prison-age/echo-index.json');
assert.equal(packet.echo.source_id,'open-air');
assert.equal(packet.echo.authority,'EVIDENCE_ONLY');
assert.deepEqual(normalizeReadRidePacket(packet).echo,packet.echo);
const start=initialReadProgress(packet);
assert.ok(start>0&&start<1);

const para=makeReadCourse(packet,{grain:'PARAGRAPH'});
assert.equal(para.kind,'READFIELD_TEXT');
assert.equal(para.grain,'PARAGRAPH');
assert.ok(para.points.length>=5);
const at=readCourseAddressAt(para,start);
assert.ok(at.address.startsWith('read://sha256%3Atest-book/paragraph/'));
const wit=readCourseWitness(para,start);
assert.equal(wit.sourceId,'sha256:test-book');
assert.equal(wit.authority,'READFIELD');
assert.match(wit.text,/second paragraph/i);

const next=stepReadCourse(para,start,1);
assert.ok(next.p>start);
assert.notEqual(next.address,at.address);
const back=stepReadCourse(para,next.p,-1);
assert.ok(back.p<=next.p);

const returnWitness=makeReadReturnWitness(para,{
  origin:{start:at.point.start,end:at.point.end,grain:'PARAGRAPH',address:at.address},
  visited:[
    {start:at.point.start,end:at.point.end,grain:'PARAGRAPH',address:at.address},
    {start:next.point.start,end:next.point.end,grain:'PARAGRAPH',address:next.address}
  ],
  current:next.p,returnAddress:'/docs/?local=1'
});
assert.equal(returnWitness.schema,'readfield-course-witness/v0.1');
assert.equal(returnWitness.authority,'EVIDENCE_ONLY');
assert.equal(returnWitness.final.start,next.point.start);
assert.equal(returnWitness.visited.length,2);

const malformed=structuredClone(para);
malformed.points[1].start=malformed.points[0].start;
assert.throws(()=>validateReadCourse(malformed),/READ_GRAIN_OVERLAP|READ_GRAIN_BOUNDS/);

const sentence=makeReadCourse(packet,{grain:'SENTENCE'});
assert.equal(sentence.grain,'SENTENCE');
assert.ok(sentence.points.filter(x=>x.kind==='SENTENCE').length>=5);
const section=makeReadCourse(packet,{grain:'SECTION'});
assert.equal(section.grain,'SECTION');
assert.equal(section.points.filter(x=>x.kind==='SECTION').length,2);
assert.match(readCourseWitness(section,.9).text,/Gate Two/i);

const fallback=makeReadRidePacket({source:'alpha\n\nbeta',label:'NO HASH'});
assert.match(fallback.sourceIdentity.id,/^fnv1a32:[0-9a-f]{8}$/);

console.log(JSON.stringify({
  ok:true,
  schema:packet.schema,
  paragraphPoints:para.points.length,
  sentencePoints:sentence.points.length,
  sectionPoints:section.points.length,
  focusAddress:at.address,
  nextAddress:next.address
},null,2));
