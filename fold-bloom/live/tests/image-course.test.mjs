import test from 'node:test';
import assert from 'node:assert/strict';
import {
  IMAGE_GRAINS,IMAGE_SET_STORAGE,IMAGE_DWELL_SECONDS,IMAGE_SET_LIMIT,
  isImageRecord,normalizeImageEntries,imageSetKey,makeImageCourse,imageCourseAddressAt,
  stepImageCourse,createImageClock,imageSetProgress,makeImageSetManifest,
  normalizeImageSetManifest,normalizeImageSetRegistry,imageCourseSummary
} from '../image-course.js';

const records=n=>Array.from({length:n},(_,i)=>({sourceId:`sha256:${String(i).padStart(64,'a').slice(-64)}`,name:`frame-${i}.png`,type:'image/png',size:100+i,order:i}));

test('the vault test separates images from audio without a schema change',()=>{
  assert.equal(isImageRecord({type:'image/png'}),true);
  assert.equal(isImageRecord({type:'image/jpeg'}),true);
  assert.equal(isImageRecord({type:'audio/mpeg'}),false);
  assert.equal(isImageRecord({type:''}),false);
  assert.equal(isImageRecord(null),false);
});

test('a declared set builds the SAME course shape the audio and read sources build',()=>{
  const course=makeImageCourse(records(8));
  assert.equal(course.schema,'fold-bloom-image-course/v0.1');
  assert.equal(course.kind,'IMAGE_SET');
  assert.equal(course.grain,'FRAME');
  assert.equal(course.count,8);
  assert.equal(course.points.length,8);
  assert.equal(course.duration,8*IMAGE_DWELL_SECONDS);
  assert.equal(course.points[0].p,0);
  // the addressing function is course-nav.js, unchanged
  assert.equal(imageCourseAddressAt(course,0).address,'course://image_set/frame/0@0.0000');
  assert.equal(imageCourseAddressAt(course,0.5).address,'course://image_set/frame/4@0.5000');
});

test('THE FIX: the addressed position advances on the clock with no interaction at all',()=>{
  const course=makeImageCourse(records(8),{dwell:2});
  let wall=0;
  const clock=createImageClock({now:()=>wall});
  assert.equal(clock.paused,false,'a declared set is moving, not waiting for a tap');
  const seen=[];
  for(let i=0;i<6;i++){
    seen.push(imageCourseAddressAt(course,imageSetProgress(course,clock)).address);
    wall+=2000; // two seconds of set time per sample, zero clicks
  }
  assert.deepEqual(seen,[
    'course://image_set/frame/0@0.0000',
    'course://image_set/frame/1@0.1250',
    'course://image_set/frame/2@0.2500',
    'course://image_set/frame/3@0.3750',
    'course://image_set/frame/4@0.5000',
    'course://image_set/frame/5@0.6250'
  ]);
  assert.equal(new Set(seen).size,6,'every sample landed on a new address');
});

test('the set cycles instead of stalling at the seam, so it never needs a rescue click',()=>{
  const course=makeImageCourse(records(4),{dwell:1});
  let wall=0;const clock=createImageClock({now:()=>wall});
  const at=t=>{wall=t;return imageCourseAddressAt(course,imageSetProgress(course,clock)).address};
  assert.equal(at(0),'course://image_set/frame/0@0.0000');
  assert.equal(at(3900),'course://image_set/frame/3@0.7500');
  assert.equal(at(4100),'course://image_set/frame/0@0.0000','wraps to the first frame');
  assert.equal(at(8100),'course://image_set/frame/0@0.0000','still moving after a full cycle');
});

test('STEP still means exactly one address, and holds the clock',()=>{
  const course=makeImageCourse(records(4),{dwell:1});
  let wall=0;const clock=createImageClock({now:()=>wall});
  clock.hold();
  assert.equal(clock.paused,true);
  const p0=imageSetProgress(course,clock);
  const first=stepImageCourse(course,p0,1);
  const second=stepImageCourse(course,first.p,1);
  assert.equal(first.index,1);
  assert.equal(second.index,2);
  assert.equal(second.index-first.index,1,'exactly one address per tap');
  wall+=60000;
  assert.equal(imageSetProgress(course,clock),p0,'a held set does not drift while held');
  assert.equal(stepImageCourse(course,1,1).index,0,'forward at the seam wraps to frame 0');
  assert.equal(stepImageCourse(course,0,-1).index,3,'backward at frame 0 wraps to the last frame');
});

test('the clock resumes from where it was held rather than jumping',()=>{
  let wall=0;const clock=createImageClock({now:()=>wall});
  wall=3000;assert.equal(clock.elapsedSeconds(),3);
  clock.hold();assert.equal(clock.elapsedSeconds(),3);
  wall=90000;assert.equal(clock.elapsedSeconds(),3,'held time is not counted as set time');
  clock.start();assert.equal(clock.elapsedSeconds(),3);
  wall=91000;assert.equal(clock.elapsedSeconds(),4);
});

test('grains group the same set without becoming a parallel concept',()=>{
  const n=12,frame=makeImageCourse(records(n),{grain:'FRAME',dwell:1});
  const strip=makeImageCourse(records(n),{grain:'STRIP',stripSize:6,dwell:1});
  const whole=makeImageCourse(records(n),{grain:'SET',dwell:1});
  assert.equal(frame.points.length,12);
  assert.equal(strip.points.length,2);
  assert.equal(strip.points[0].span.length,6);
  assert.equal(whole.points.length,1);
  for(const c of [frame,strip,whole])assert.equal(c.duration,n,'the set costs the same set-time at every grain');
  assert.equal(imageCourseAddressAt(strip,0.5).address,'course://image_set/strip/1@0.5000');
});

test('the remembered declaration round-trips, and identity is order-sensitive',()=>{
  const course=makeImageCourse(records(5),{label:'TEST SET'});
  const manifest=makeImageSetManifest(course);
  assert.equal(manifest.schema,IMAGE_SET_STORAGE);
  const back=normalizeImageSetManifest(JSON.stringify(manifest));
  assert.equal(back.setKey,course.setKey);
  assert.deepEqual(back.entries.map(x=>x.sourceId),course.entries.map(x=>x.sourceId));
  assert.equal(normalizeImageSetRegistry([manifest,{schema:'nope'}]).length,1);
  assert.equal(normalizeImageSetRegistry(Array.from({length:40},()=>manifest)).length,IMAGE_SET_LIMIT);
  // array position is not the order; the declared `order` field is, so a shuffled array
  // of the same declaration is the SAME set...
  assert.equal(imageSetKey([...records(5)].reverse()),course.setKey);
  // ...while a genuinely re-ordered declaration is a DIFFERENT set.
  const reordered=normalizeImageEntries([...records(5)].reverse().map((x,i)=>({...x,order:i})));
  assert.notEqual(imageSetKey(reordered),course.setKey,'a reordered set is a different set');
});

test('empty and malformed sets refuse rather than render an empty stage',()=>{
  assert.throws(()=>makeImageCourse([]),/IMAGE_SET_EMPTY/);
  assert.throws(()=>makeImageCourse([{name:'no id'},{}]),/IMAGE_SET_EMPTY/);
  assert.throws(()=>normalizeImageSetManifest({schema:'other'}),/IMAGE_SET_SCHEMA/);
  assert.match(imageCourseSummary(makeImageCourse(records(8),{dwell:3})),/^8 IMAGES · FRAME · 24s CYCLE$/);
  assert.match(imageCourseSummary(makeImageCourse(records(120),{dwell:3})),/6m00s CYCLE$/);
  assert.equal(imageCourseSummary(null),'NO SET');
  assert.deepEqual([...IMAGE_GRAINS],['FRAME','STRIP','SET']);
});