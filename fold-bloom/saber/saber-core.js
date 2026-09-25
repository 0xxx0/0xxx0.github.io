export const SABER_COURSE_SCHEMA='fold-bloom-saber-course/v0.1';
export const SABER_RETURN_SCHEMA='fold-bloom-saber-return/v0.1';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const n=v=>Number.isFinite(Number(v))?Number(v):0;

export function courseFromEventTape(tape,{maxNotes=360}={}){
  if(!tape||!Array.isArray(tape.events))throw new Error('EVENT_TAPE_REQUIRED');
  const source=String(tape.sourceId||'UNBOUND');
  const dirs=['UP','RIGHT','DOWN','LEFT'];
  const ops={FOLD:'LEFT',BLOOM:'RIGHT',SPLIT:'UP',RETURN:'DOWN'};
  let i=0;
  const notes=[];
  for(const e of tape.events){
    if(e.kind!=='BEAT'&&e.kind!=='OPERATION')continue;
    if(notes.length>=Math.max(1,Number(maxNotes)||360))break;
    const hand=e.kind==='OPERATION'
      ? ({FOLD:'LEFT',BLOOM:'RIGHT'}[String(e.op||'').toUpperCase()]||(i%2?'RIGHT':'LEFT'))
      : (i%2?'RIGHT':'LEFT');
    const direction=e.kind==='OPERATION'?(ops[String(e.op||'').toUpperCase()]||dirs[i%dirs.length]):dirs[(i+Math.floor(i/4))%dirs.length];
    notes.push({
      id:String(e.id||('note:'+i)),
      sourceEventId:String(e.id||('event:'+i)),
      t:+n(e.t).toFixed(6),
      hand,
      direction,
      lane:i%4,
      kind:e.kind,
      op:e.kind==='OPERATION'?String(e.op||'MARK').toUpperCase():null,
      energy:+clamp(n(e.energy??e.strength??.5),0,1).toFixed(4)
    });
    i++;
  }
  return {
    schema:SABER_COURSE_SCHEMA,
    sourceId:source,
    eventTapeSchema:String(tape.schema||'UNKNOWN'),
    duration:+n(tape.duration).toFixed(6),
    bpm:n(tape.bpm)||null,
    noteCount:notes.length,
    notes
  };
}

export function swingWitness(sample={}){
  const rr=sample.rotationRate||{},acc=sample.acceleration||{};
  const a=n(rr.alpha),b=n(rr.beta),g=n(rr.gamma),ax=n(acc.x),ay=n(acc.y),az=n(acc.z);
  const rot=Math.hypot(a,b,g),lin=Math.hypot(ax,ay,az),intensity=rot+lin*11;
  const direction=Math.abs(g)>Math.abs(b)?(g>=0?'RIGHT':'LEFT'):(b>=0?'DOWN':'UP');
  return {
    hand:String(sample.hand||'').toUpperCase()==='RIGHT'?'RIGHT':'LEFT',
    seq:Math.max(0,Math.trunc(n(sample.seq))),
    clientTime:n(sample.clientTime),
    direction,
    intensity:+intensity.toFixed(3)
  };
}

export function classifySwing(course,resolvedIds,sample,trackTime,{hitWindow=.18,grazeWindow=.36,minIntensity=82}={}){
  if(!course||course.schema!==SABER_COURSE_SCHEMA)return null;
  const w=swingWitness(sample);
  if(w.intensity<minIntensity)return null;
  const resolved=resolvedIds instanceof Set?resolvedIds:new Set(resolvedIds||[]);
  let best=null;
  for(const note of course.notes){
    if(resolved.has(note.id)||note.hand!==w.hand)continue;
    const dt=n(trackTime)-n(note.t),ad=Math.abs(dt);
    if(ad>grazeWindow)continue;
    if(!best||ad<best.ad)best={note,dt,ad};
  }
  if(!best)return null;
  const directional=best.note.direction===w.direction;
  const outcome=best.ad<=hitWindow&&directional?'HIT':'GRAZE';
  return {
    noteId:best.note.id,
    sourceEventId:best.note.sourceEventId,
    sourceTime:+n(best.note.t).toFixed(4),
    observedTime:+n(trackTime).toFixed(4),
    hand:w.hand,
    expectedDirection:best.note.direction,
    observedDirection:w.direction,
    intensity:w.intensity,
    dt:+best.dt.toFixed(4),
    outcome
  };
}

export function collectMisses(course,resolvedIds,trackTime,{missAfter=.4}={}){
  if(!course||course.schema!==SABER_COURSE_SCHEMA)return [];
  const resolved=resolvedIds instanceof Set?resolvedIds:new Set(resolvedIds||[]);
  const out=[];
  for(const note of course.notes){
    if(resolved.has(note.id))continue;
    if(n(trackTime)>n(note.t)+missAfter){
      out.push({
        noteId:note.id,
        sourceEventId:note.sourceEventId,
        sourceTime:+n(note.t).toFixed(4),
        observedTime:+n(trackTime).toFixed(4),
        hand:note.hand,
        expectedDirection:note.direction,
        observedDirection:null,
        intensity:0,
        dt:+(n(trackTime)-n(note.t)).toFixed(4),
        outcome:'MISS'
      });
    }
  }
  return out;
}

export function updateClockEstimate(prev,{hostSent,hostRecv,clientNow}={}){
  const sent=n(hostSent),recv=n(hostRecv),client=n(clientNow);
  const rtt=Math.max(0,recv-sent),estimate=((sent+recv)/2)-client;
  const old=prev&&Number.isFinite(prev.offsetMs)?prev:{offsetMs:estimate,rttMs:rtt,samples:0};
  const alpha=old.samples?0.2:1;
  return {
    offsetMs:+(old.offsetMs+(estimate-old.offsetMs)*alpha).toFixed(3),
    rttMs:+(old.rttMs+(rtt-old.rttMs)*alpha).toFixed(3),
    samples:(old.samples||0)+1
  };
}

export function trackTimeForHostPerf({audioTime=0,hostNow=0,sampleHostPerf=0,playing=false}={}){
  const dt=(n(sampleHostPerf)-n(hostNow))/1000;
  return Math.max(0,n(audioTime)+(playing?dt:0));
}

export function boundedHitTrace(trace=[],entry,{max=512}={}){
  const clean={
    noteId:String(entry?.noteId||''),
    sourceEventId:String(entry?.sourceEventId||''),
    sourceTime:+n(entry?.sourceTime).toFixed(4),
    observedTime:+n(entry?.observedTime).toFixed(4),
    hand:String(entry?.hand||''),
    expectedDirection:entry?.expectedDirection?String(entry.expectedDirection):null,
    observedDirection:entry?.observedDirection?String(entry.observedDirection):null,
    intensity:+Math.max(0,n(entry?.intensity)).toFixed(3),
    dt:+n(entry?.dt).toFixed(4),
    outcome:['HIT','GRAZE','MISS'].includes(entry?.outcome)?entry.outcome:'MISS'
  };
  return [...(Array.isArray(trace)?trace:[]),clean].slice(-Math.max(1,Number(max)||512));
}

export function buildReturn({course,trace=[],roles={},createdAt=null}={}){
  if(!course||course.schema!==SABER_COURSE_SCHEMA)throw new Error('SABER_COURSE_REQUIRED');
  const xs=Array.isArray(trace)?trace:[];
  const counts={HIT:0,GRAZE:0,MISS:0};
  for(const x of xs)if(counts[x.outcome]!==undefined)counts[x.outcome]++;
  return {
    schema:SABER_RETURN_SCHEMA,
    createdAt:createdAt||new Date().toISOString(),
    sourceId:course.sourceId,
    eventTapeSchema:course.eventTapeSchema,
    courseSchema:course.schema,
    noteCount:course.noteCount,
    roles:{local:roles.local||null,remote:roles.remote||null},
    counts,
    hitTrace:xs.slice(-512),
    rawMotionRetained:false
  };
}
