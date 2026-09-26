export const COURSE_NAV_SCHEMA='fold-bloom-addressed-course/v0.1';

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number(v)||0));
const finite=v=>Number.isFinite(Number(v))?Number(v):null;

export function normalizeCoursePoints(points,{includeBounds=true,max=256}={}){
  let out=(Array.isArray(points)?points:[]).map(x=>typeof x==='number'?{p:x}:{...x,p:finite(x?.p)}).filter(x=>x.p!==null).map(x=>({...x,p:+clamp(x.p).toFixed(6)})).sort((a,b)=>a.p-b.p);
  out=out.filter((x,i)=>i===0||Math.abs(x.p-out[i-1].p)>1e-6);
  if(includeBounds){
    if(!out.length||out[0].p>1e-6)out.unshift({p:0,kind:'BOUND'});
    if(out.at(-1)?.p<1-1e-6)out.push({p:1,kind:'BOUND'});
  }
  if(out.length<=max)return out;
  const keep=[out[0]],slots=Math.max(1,max-2),step=(out.length-2)/slots;
  for(let i=0;i<slots;i++)keep.push(out[Math.min(out.length-2,1+Math.floor(i*step))]);
  keep.push(out.at(-1));return keep;
}

function tOf(x){return typeof x==='number'?x:Number(x?.t)}
function normTimed(xs,duration,kind,max){
  if(!(duration>0))return [];
  return normalizeCoursePoints((Array.isArray(xs)?xs:[]).map((x,i)=>({p:clamp(tOf(x)/duration),kind,index:i,t:tOf(x)})),{includeBounds:false,max});
}

export function mapCourse(map,{grain='PHRASE',max=256}={}){
  const duration=Math.max(0,Number(map?.duration)||0),g=String(grain||'PHRASE').toUpperCase();
  const source=g==='BEAT'?map?.beats:g==='SECTION'?map?.sections:map?.phrases;
  const kind=g==='BEAT'?'BEAT':g==='SECTION'?'SECTION':'PHRASE';
  return {
    schema:COURSE_NAV_SCHEMA,
    kind:'AUDIO_MAP',
    grain:kind,
    duration,
    points:normalizeCoursePoints(normTimed(source,duration,kind,max),{includeBounds:true,max})
  };
}

export function replayCourse(score,{max=256}={}){
  const points=[];
  for(const [i,x] of (score?.wordCues||[]).entries())points.push({p:x?.at,kind:'WORD',index:i});
  for(const [i,x] of (score?.operations||[]).entries())points.push({p:x?.at,kind:'OP',index:i,label:x?.type||''});
  for(const [i,x] of (score?.evidence?.marks||[]).entries())points.push({p:x?.p,kind:'MARK',index:i,label:x?.label||x?.kind||''});
  return {schema:COURSE_NAV_SCHEMA,kind:'REPLAY_SCORE',grain:'CUE',duration:Math.max(0,Number(score?.source?.duration_ms)||0)/1000,points:normalizeCoursePoints(points,{includeBounds:true,max})};
}

export function stepCourse(course,current=0,delta=1){
  const points=Array.isArray(course?.points)?course.points:normalizeCoursePoints(course||[]),p=clamp(current),dir=Number(delta)<0?-1:1,eps=1e-5;
  if(!points.length)return {p,index:-1,point:null,address:'course://empty'};
  let index;
  if(dir>0){index=points.findIndex(x=>x.p>p+eps);if(index<0)index=points.length-1}
  else {index=points.length-1;while(index>=0&&points[index].p>=p-eps)index--;if(index<0)index=0}
  const point=points[index],kind=String(point.kind||course?.grain||'POINT').toUpperCase();
  return {p:point.p,index,point,address:`course://${String(course?.kind||'FIELD').toLowerCase()}/${kind.toLowerCase()}/${index}@${point.p.toFixed(4)}`};
}

export function courseStrip(map,time=0,{maxBeats=48}={}){
  const duration=Math.max(.001,Number(map?.duration)||0),progress=clamp((Number(time)||0)/duration);
  const project=(xs,kind,max)=>normTimed(xs,duration,kind,max).map(x=>x.p);
  return {
    schema:COURSE_NAV_SCHEMA,
    duration,
    progress,
    beats:project(map?.beats,'BEAT',maxBeats),
    phrases:project(map?.phrases,'PHRASE',32),
    sections:project(map?.sections,'SECTION',16)
  };
}
