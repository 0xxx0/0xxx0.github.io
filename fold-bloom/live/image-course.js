// fold-bloom/live/image-course.js
//
// THE THIRD ADDRESSED SOURCE.
//
//   audio  → AUDIO_MAP       (../course-nav.js  mapCourse)        grains BEAT / PHRASE / SECTION
//   text   → READFIELD_TEXT  (../read-course.js makeReadCourse)   grains SENTENCE / PARAGRAPH / SECTION
//   images → IMAGE_SET       (this file)                          grains FRAME / STRIP / SET
//
// WHY THIS EXISTS. The course-mode law in live/app.js is:
//
//   FLOW: "SOURCE CLOCK advances address continuously."
//   STEP: "moves exactly one <grain> address."
//
// With no source loaded there is no clock, so the ONLY way the address can move is a
// tap. That is the clicking. The fix is NOT to change STEP — it is to give FLOW a
// clock that does not need audio. A declared image set supplies one: its own dwell
// time. Nothing here bypasses FLOW/STEP; FLOW gets something to drive, and STEP keeps
// meaning exactly one address.
//
// WHAT THIS MODULE IS NOT. It never touches image bytes, never hashes, never stores,
// never draws. It is pure functions over metadata records ({sourceId, name, ...}).
// The BYTES live only in the browser vault (../local-media-store.js, IndexedDB keyed
// by the sha256 source id). There is no network path in or out. Privacy is the point
// of the vault route, so the course builder is deliberately byte-blind.
//
// REUSE, NOT A PARALLEL CONCEPT. The course object is the SAME shape course-nav.js
// produces for audio, addressed by the SAME courseAddressAt/stepCourse functions, and
// reported through the SAME #courseAddress / #courseWitness / #courseLaw surface.
// Nothing downstream of liveCourse()/liveCourseProgress() needs to learn about images.

import {courseAddressAt,stepCourse} from '../course-nav.js';

export const IMAGE_COURSE_SCHEMA='fold-bloom-image-course/v0.1';
export const IMAGE_SET_STORAGE='fold-bloom.image-set.v01';
export const IMAGE_GRAINS=Object.freeze(['FRAME','STRIP','SET']);
export const IMAGE_DWELL_SECONDS=3;
export const IMAGE_STRIP_SIZE=6;
export const IMAGE_SET_LIMIT=12;

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number(v)||0));

function fnv1a32(input=''){
  let h=2166136261>>>0;
  for(const ch of String(input)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0}
  return (h>>>0).toString(16).padStart(8,'0');
}

/** The vault-facing test: is this a local-media record whose bytes are an image? */
export function isImageRecord(record){
  return /^image\//i.test(String(record?.type||''));
}

/** Order-preserving normalization of picked files or remembered entries. */
export function normalizeImageEntries(records=[]){
  return (Array.isArray(records)?records:[])
    .map((x,i)=>({
      sourceId:String(x?.sourceId||'').trim(),
      name:String(x?.name||x?.sourceId||'').slice(0,160),
      type:String(x?.type||''),
      size:Number.isFinite(Number(x?.size))?Number(x.size):0,
      order:Number.isFinite(Number(x?.order))?Number(x.order):i
    }))
    .filter(x=>x.sourceId)
    .sort((a,b)=>a.order-b.order);
}

/** Stable key for "this exact ordered set of bytes". Order is part of the identity. */
export function imageSetKey(entries){
  return 'img:'+fnv1a32(normalizeImageEntries(entries).map(x=>x.sourceId).join('\n'));
}

function grainOf(grain){
  const g=String(grain||'FRAME').toUpperCase();
  return IMAGE_GRAINS.includes(g)?g:'FRAME';
}

/**
 * Build an addressed course over a declared image set.
 *
 * The clock is source time in seconds; `duration` is what the whole set costs at the
 * atomic grain. Addresses are uniform because a declared set has no measured internal
 * structure to lie about — a folder would give one, a multi-select does not. So:
 *   FRAME — one image per address
 *   STRIP — a run of stripSize images per address (the contact-sheet unit)
 *   SET   — the whole declaration as the single top address
 */
export function makeImageCourse(records,{grain='FRAME',dwell=IMAGE_DWELL_SECONDS,stripSize=IMAGE_STRIP_SIZE,setKey=null,label='',loop=true}={}){
  const entries=normalizeImageEntries(records);
  if(!entries.length)throw new Error('IMAGE_SET_EMPTY');
  const g=grainOf(grain),n=entries.length;
  const size=g==='FRAME'?1:g==='STRIP'?Math.max(1,Math.min(n,Math.round(Number(stripSize)||IMAGE_STRIP_SIZE))):n;
  const groups=Math.max(1,Math.ceil(n/size));
  const points=[];
  for(let i=0;i<groups;i++){
    const first=i*size,span=entries.slice(first,Math.min(n,first+size));
    points.push({
      p:+(groups===1?0:i/groups).toFixed(6),
      kind:g,
      index:i,
      sourceId:span[0].sourceId,
      name:span[0].name,
      count:span.length,
      span:span.map(x=>x.sourceId),
      label:span.length>1?`${span[0].name} +${span.length-1}`:span[0].name
    });
  }
  const d=Number(dwell)>0?Number(dwell):IMAGE_DWELL_SECONDS;
  return {
    schema:IMAGE_COURSE_SCHEMA,
    kind:'IMAGE_SET',
    grain:g,
    setKey:String(setKey||imageSetKey(entries)),
    label:String(label||'IMAGE SET').slice(0,160),
    count:n,
    groups,
    dwell:d,
    size,
    loop:loop!==false,
    duration:n*d,
    points,
    entries
  };
}

/** Address lookup: identical contract to the audio/read courses. */
export function imageCourseAddressAt(course,current=0){
  return courseAddressAt(course,current);
}

/**
 * STEP semantics for a set: one address per call, wrapping at the ends. Wrapping is
 * the honest behaviour for a set because FLOW cycles too — if the clock loops, a tap
 * at the seam must not dead-end. Non-looping courses delegate unchanged.
 */
export function stepImageCourse(course,current=0,delta=1,{loop=true}={}){
  const points=Array.isArray(course?.points)?course.points:[];
  if(!points.length)return stepCourse(course,current,delta);
  const p=clamp(current),dir=Number(delta)<0?-1:1,hit=stepCourse(course,p,dir);
  if(loop===false)return hit;
  const seamForward=dir>0&&hit.index>=points.length-1&&p>=points.at(-1).p-1e-5;
  const seamBackward=dir<0&&hit.index<=0&&p<=points[0].p+1e-5;
  if(!seamForward&&!seamBackward)return hit;
  const index=dir>0?0:points.length-1;
  return courseAddressAt(course,points[index].p);
}

/**
 * The self-driving clock.
 *
 * This is the whole fix: a source clock that exists when no audio source does. It is
 * derived from the page's own monotonic timestamp (performance.now) rather than from
 * an <audio> element, so it runs with no audio loaded, no Web Audio context and no
 * gesture. It still honours FLOW/STEP exactly: running is FLOW, `hold()` is STEP —
 * the same words the existing course law already uses ("holds the source address").
 */
export function createImageClock({now=null,rate=1}={}){
  const tick=typeof now==='function'?now:()=>globalThis.performance?.now?.()??Date.now();
  const r=Number(rate)>0?Number(rate):1;
  let anchorWall=Number(tick())||0,anchorSource=0,paused=false;
  const elapsed=()=>paused?anchorSource:anchorSource+Math.max(0,Number(tick())-anchorWall)/1000*r;
  return {
    get paused(){return paused},
    elapsedSeconds:elapsed,
    /** FLOW: the set advances on its own. */
    start(){if(paused){anchorWall=Number(tick())||0;paused=false}return elapsed()},
    /** STEP: the set holds its address until addressed again. */
    hold(){if(!paused){anchorSource=elapsed();anchorWall=Number(tick())||0;paused=true}return anchorSource},
    seekSeconds(seconds){anchorSource=Math.max(0,Number(seconds)||0);anchorWall=Number(tick())||0;return anchorSource},
    reset(){anchorSource=0;anchorWall=Number(tick())||0;paused=false}
  };
}

/** Source progress across the set. A set cycles; it does not stall at the seam. */
export function imageSetProgress(course,clock){
  const duration=Math.max(1e-6,Number(course?.duration)||0);
  const elapsed=Math.max(0,typeof clock?.elapsedSeconds==='function'?clock.elapsedSeconds():Number(clock)||0);
  if(course?.loop===false)return clamp(elapsed/duration);
  return (elapsed%duration)/duration;
}

export function imageSetSeconds(course,clock){
  const elapsed=Math.max(0,typeof clock?.elapsedSeconds==='function'?clock.elapsedSeconds():Number(clock)||0);
  const duration=Math.max(1e-6,Number(course?.duration)||0);
  return course?.loop===false?Math.min(elapsed,duration):elapsed%duration;
}

/** The remembered declaration. This is what makes the SECOND open need no picker. */
export function makeImageSetManifest(course,{created=new Date().toISOString()}={}){
  return {
    schema:IMAGE_SET_STORAGE,
    setKey:course.setKey,
    label:course.label,
    created,
    dwell:course.dwell,
    grain:course.grain,
    count:course.count,
    entries:course.entries.map(e=>({sourceId:e.sourceId,name:e.name,type:e.type,size:e.size,order:e.order}))
  };
}

export function normalizeImageSetManifest(raw){
  const m=typeof raw==='string'?JSON.parse(raw):raw;
  if(!m||m.schema!==IMAGE_SET_STORAGE)throw new Error('IMAGE_SET_SCHEMA');
  const entries=normalizeImageEntries(m.entries);
  if(!entries.length)throw new Error('IMAGE_SET_EMPTY');
  return {
    ...m,
    entries,
    setKey:String(m.setKey||imageSetKey(entries)),
    label:String(m.label||'IMAGE SET').slice(0,160),
    count:entries.length,
    dwell:Number(m.dwell)>0?Number(m.dwell):IMAGE_DWELL_SECONDS,
    grain:grainOf(m.grain)
  };
}

export function normalizeImageSetRegistry(raw){
  const list=Array.isArray(raw)?raw:(typeof raw==='string'?JSON.parse(raw||'[]'):[]);
  const out=[];
  for(const item of Array.isArray(list)?list:[]){
    try{out.push(normalizeImageSetManifest(item))}catch(_){}
  }
  return out.slice(0,IMAGE_SET_LIMIT);
}

/** One line the operator can read: what this set IS and how fast it moves. */
export function imageCourseSummary(course){
  if(!course)return 'NO SET';
  const cycle=Number(course.duration)||0;
  const m=Math.floor(cycle/60),s=Math.round(cycle-m*60);
  return `${course.count} IMAGES · ${course.grain} · ${cycle<60?`${Math.round(cycle)}s`:`${m}m${String(s).padStart(2,'0')}s`} CYCLE`;
}