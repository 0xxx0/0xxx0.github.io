import test from 'node:test';
import assert from 'node:assert/strict';
import {courseStrip,mapCourse,normalizeCoursePoints,replayCourse,stepCourse} from '../course-nav.js';

test('audio map course steps by requested structural grain',()=>{
  const map={duration:12,beats:[0,1,2,3,4,5],phrases:[{t:0},{t:4},{t:8},{t:12}],sections:[{t:0},{t:6},{t:12}]};
  const phrase=mapCourse(map,{grain:'PHRASE'});
  assert.deepEqual(phrase.points.map(x=>x.p),[0,1/3,2/3,1]);
  assert.equal(stepCourse(phrase,.34,1).p,2/3);
  assert.equal(stepCourse(phrase,.66,-1).p,1/3);
});

test('replay course converges words operations and marks into one cue path',()=>{
  const score={source:{duration_ms:10000},wordCues:[{at:.2},{at:.5}],operations:[{type:'BLOOM',at:.5},{type:'RETURN',at:.9}],evidence:{marks:[{p:.72,label:'turn'}]}};
  const course=replayCourse(score);
  assert.deepEqual(course.points.map(x=>x.p),[0,.2,.5,.72,.9,1]);
  const hit=stepCourse(course,.51,1);
  assert.equal(hit.p,.72);assert.match(hit.address,/course:\/\/replay_score\/mark/);
});

test('strip is bounded and preserves structural landmarks',()=>{
  const map={duration:10,beats:Array.from({length:101},(_,i)=>i/10),phrases:[{t:0},{t:5},{t:10}],sections:[{t:0},{t:10}]};
  const strip=courseStrip(map,2.5,{maxBeats:12});
  assert.equal(strip.progress,.25);
  assert.ok(strip.beats.length<=12);
  assert.deepEqual(strip.phrases,[0,.5,1]);
});

test('course points dedupe and keep bounds',()=>{
  assert.deepEqual(normalizeCoursePoints([.5,.5,.2]).map(x=>x.p),[0,.2,.5,1]);
});
