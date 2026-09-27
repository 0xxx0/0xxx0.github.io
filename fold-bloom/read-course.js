export const READ_RIDE_SCHEMA='field-read-ride/v0.1';
export const READ_COURSE_SCHEMA='fold-bloom-read-course/v0.1';
export const READ_RIDE_STORAGE='fold-bloom.read-ride.handoff.v01';
export const READ_GRAINS=Object.freeze(['SENTENCE','PARAGRAPH','SECTION']);

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number(v)||0));
const clean=s=>String(s??'').replace(/\r\n?/g,'\n');
function fnv1a32(input=''){
  let h=2166136261>>>0;
  for(const ch of String(input)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0}
  return (h>>>0).toString(16).padStart(8,'0');
}
function identityId(identity={},source=''){
  const explicit=identity.hash||identity.address||identity.id;
  return explicit?String(explicit):'fnv1a32:'+fnv1a32(source);
}
function trimSpan(raw,start,end){
  let a=Math.max(0,start),b=Math.min(raw.length,end);
  while(a<b&&/\s/.test(raw[a]))a++;
  while(b>a&&/\s/.test(raw[b-1]))b--;
  return {start:a,end:b,text:raw.slice(a,b)};
}
function sentenceSpans(raw){
  const out=[];let start=0;
  const re=/[^.!?。！？\n]+(?:[.!?。！？]+|(?=\n|$))/gu;
  for(const m of raw.matchAll(re)){
    const s=trimSpan(raw,m.index,m.index+m[0].length);
    if(s.text)out.push(s);
    start=m.index+m[0].length;
  }
  if(!out.length&&raw.trim()){const s=trimSpan(raw,0,raw.length);if(s.text)out.push(s)}
  return out;
}
function paragraphSpans(raw){
  const out=[];const re=/[^\n](?:[\s\S]*?)(?=\n\s*\n|$)/g;
  for(const m of raw.matchAll(re)){
    const s=trimSpan(raw,m.index,m.index+m[0].length);
    if(s.text)out.push(s);
  }
  if(!out.length&&raw.trim()){const s=trimSpan(raw,0,raw.length);if(s.text)out.push(s)}
  return out;
}
function sectionSpans(raw){
  const headings=[...raw.matchAll(/^\s{0,3}#{1,6}\s+.+$/gm)];
  if(headings.length){
    const out=[];
    for(let i=0;i<headings.length;i++){
      const start=headings[i].index,end=i+1<headings.length?headings[i+1].index:raw.length;
      const s=trimSpan(raw,start,end);if(s.text)out.push({...s,label:headings[i][0].replace(/^\s*#+\s*/,'').trim()});
    }
    if(headings[0].index>0){const pre=trimSpan(raw,0,headings[0].index);if(pre.text)out.unshift({...pre,label:'PREFACE'})}
    return out;
  }
  const paras=paragraphSpans(raw);
  if(paras.length<=1)return paras.map((x,i)=>({...x,label:'SECTION '+(i+1)}));
  const group=Math.max(1,Math.ceil(paras.length/Math.min(12,Math.max(1,Math.ceil(paras.length/6)))));
  const out=[];
  for(let i=0;i<paras.length;i+=group){
    const chunk=paras.slice(i,i+group),s=trimSpan(raw,chunk[0].start,chunk.at(-1).end);
    if(s.text)out.push({...s,label:'SECTION '+(out.length+1)});
  }
  return out;
}
function spans(raw,grain){
  const g=String(grain||'PARAGRAPH').toUpperCase();
  return g==='SENTENCE'?sentenceSpans(raw):g==='SECTION'?sectionSpans(raw):paragraphSpans(raw);
}
function coursePoint(raw,span,index,grain,sourceId){
  const len=Math.max(1,raw.length),p=clamp(span.start/len);
  return {p:+p.toFixed(8),kind:grain,index,start:span.start,end:span.end,label:span.label||span.text.slice(0,96),address:`read://${encodeURIComponent(sourceId)}/${grain.toLowerCase()}/${index}@${span.start}-${span.end}`};
}
export function makeReadRidePacket({source,label='READ SOURCE',sourceIdentity={},focus=null,returnAddress='/docs/',from='/docs/',carrier=null,trailKey=null}={}){
  const text=clean(source);
  if(!text.trim())throw Error('READ_SOURCE_REQUIRED');
  const id=identityId(sourceIdentity,text);
  return {
    schema:READ_RIDE_SCHEMA,
    created:new Date().toISOString(),
    source:text,
    label:String(label||'READ SOURCE').slice(0,160),
    sourceIdentity:{...sourceIdentity,id,authority:String(sourceIdentity.authority||'READFIELD')},
    focus:focus&&typeof focus==='object'?JSON.parse(JSON.stringify(focus)):null,
    from:String(from||'/docs/'),
    returnAddress:String(returnAddress||from||'/docs/'),
    carrier:carrier&&typeof carrier==='object'?JSON.parse(JSON.stringify(carrier)):null,
    trailKey:trailKey?String(trailKey):null
  };
}
export function normalizeReadRidePacket(raw){
  const p=typeof raw==='string'?JSON.parse(raw):raw;
  if(!p||p.schema!==READ_RIDE_SCHEMA)throw Error('READ_RIDE_SCHEMA');
  const source=clean(p.source);if(!source.trim())throw Error('READ_SOURCE_REQUIRED');
  const id=identityId(p.sourceIdentity||{},source);
  return {...p,source,label:String(p.label||'READ SOURCE').slice(0,160),sourceIdentity:{...(p.sourceIdentity||{}),id,authority:String(p.sourceIdentity?.authority||'READFIELD')}};
}
export function makeReadCourse(packet,{grain='PARAGRAPH'}={}){
  const p=normalizeReadRidePacket(packet),g=READ_GRAINS.includes(String(grain).toUpperCase())?String(grain).toUpperCase():'PARAGRAPH';
  const units=spans(p.source,g),sourceId=p.sourceIdentity.id;
  const points=units.map((u,i)=>coursePoint(p.source,u,i,g,sourceId));
  return {schema:READ_COURSE_SCHEMA,kind:'READFIELD_TEXT',grain:g,sourceId,label:p.label,length:p.source.length,points,source:p.source,sourceIdentity:p.sourceIdentity,returnAddress:p.returnAddress,from:p.from};
}
function addressed(course,point,index){
  if(!point)return {p:0,index:-1,point:null,address:'read://empty'};
  return {p:point.p,index,point,address:point.address||`read://${encodeURIComponent(course?.sourceId||'source')}/${String(point.kind||course?.grain||'point').toLowerCase()}/${index}`};
}
export function readCourseAddressAt(course,current=0){
  const points=Array.isArray(course?.points)?course.points:[],p=clamp(current);
  if(!points.length)return addressed(course,null,-1);
  let index=0;for(let i=0;i<points.length;i++){if(points[i].p<=p+1e-8)index=i;else break}
  return addressed(course,points[index],index);
}
export function stepReadCourse(course,current=0,delta=1){
  const points=Array.isArray(course?.points)?course.points:[],p=clamp(current),dir=Number(delta)<0?-1:1,eps=1e-8;
  if(!points.length)return addressed(course,null,-1);
  let index;
  if(dir>0){index=points.findIndex(x=>x.p>p+eps);if(index<0)index=points.length-1}
  else{index=points.length-1;while(index>=0&&points[index].p>=p-eps)index--;if(index<0)index=0}
  return addressed(course,points[index],index);
}
export function readCourseWitness(course,current=0){
  const hit=readCourseAddressAt(course,current),p=hit.point;
  if(!p)return null;
  const raw=String(course?.source||''),start=Math.max(0,Number(p.start)||0),end=Math.max(start,Number(p.end)||start);
  return {
    schema:'fold-bloom-read-witness/v0.1',
    sourceId:course.sourceId,
    label:course.label,
    authority:course.sourceIdentity?.authority||'READFIELD',
    grain:course.grain,
    index:hit.index,
    count:Math.max(0,(course.points||[]).filter(x=>x.kind===course.grain).length),
    progress:+clamp(hit.p).toFixed(8),
    address:hit.address,
    start,end,
    text:raw.slice(start,end).trim(),
    returnAddress:course.returnAddress
  };
}
export function initialReadProgress(packet){
  const p=normalizeReadRidePacket(packet),n=Math.max(1,p.source.length);
  const f=p.focus||{};
  if(Number.isFinite(Number(f.char_index)))return clamp(Number(f.char_index)/n);
  if(Number.isFinite(Number(f.source_progress)))return clamp(Number(f.source_progress));
  const span=f.span;if(span&&Number.isFinite(Number(span.start)))return clamp(Number(span.start)/n);
  return 0;
}
export async function packetFromLocalFile(file,{returnAddress='/fold-bloom/live/',from='/fold-bloom/live/'}={}){
  if(!file)throw Error('FILE_REQUIRED');
  const source=await file.text();
  return makeReadRidePacket({
    source,
    label:file.name||'LOCAL FILE',
    sourceIdentity:{kind:'LOCAL_FILE',format:(String(file.name||'').split('.').pop()||'TXT').toUpperCase(),size:Number(file.size)||source.length,mediaType:String(file.type||''),authority:'LOCAL_FILE'},
    focus:{source_progress:0},
    returnAddress,from
  });
}
