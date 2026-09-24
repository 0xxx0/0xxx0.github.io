export const COURSE_SCHEMA='fold-bloom-lab-course/v0.1';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function words(raw,locale){
  const out=[];
  if(typeof Intl.Segmenter==='function'){
    for(const x of new Intl.Segmenter(locale||undefined,{granularity:'word'}).segment(raw)){
      if(x.isWordLike)out.push({text:x.segment,start:x.index,end:x.index+x.segment.length});
    }
    return out;
  }
  for(const m of raw.matchAll(/[\p{L}\p{N}]+/gu))out.push({text:m[0],start:m.index||0,end:(m.index||0)+m[0].length});
  return out;
}
function sentences(raw,locale){
  const out=[];
  if(typeof Intl.Segmenter==='function'){
    for(const x of new Intl.Segmenter(locale||undefined,{granularity:'sentence'}).segment(raw)){
      const lead=x.segment.search(/\S/),text=x.segment.trim();if(!text)continue;
      const start=x.index+Math.max(0,lead);out.push({text,start,end:start+text.length});
    }
  }
  return out;
}
function paragraphs(raw){
  const out=[],re=/\S[\s\S]*?(?=\n[ \t]*\n+|$)/g;let m;
  while((m=re.exec(raw))){const lead=m[0].search(/\S/),text=m[0].trim();if(!text)continue;const start=m.index+Math.max(0,lead);out.push({text,start,end:start+text.length})}
  return out;
}
function partitionUnits(units,maxLoci,raw){
  const groups=[],size=Math.ceil(units.length/maxLoci);
  for(let i=0;i<units.length;i+=size){
    const xs=units.slice(i,i+size),start=xs[0].start,end=xs.at(-1).end;
    groups.push({text:raw.slice(start,end),start,end,unitCount:xs.length});
  }
  return groups;
}
function label(raw,start,end){
  const s=raw.slice(start,end).replace(/\s+/g,' ').trim();
  return s.length>34?s.slice(0,33)+'…':s;
}
export function buildTextCourse(source,opt={}){
  const raw=String(source??''),locale=opt.locale||'en',maxLoci=clamp(Math.trunc(Number(opt.maxLoci)||16),4,32);
  const ws=words(raw,locale),ps=paragraphs(raw),ss=sentences(raw,locale);
  let strategy='WORDS',base=ws;
  if(ws.length>maxLoci){
    if(ps.length>=2&&ps.length<=maxLoci){strategy='PARAGRAPHS';base=ps.map(x=>({...x,unitCount:words(x.text,locale).length}))}
    else if(ss.length>=2&&ss.length<=maxLoci){strategy='SENTENCES';base=ss.map(x=>({...x,unitCount:words(x.text,locale).length}))}
    else{strategy='GROUPED_WORDS';base=partitionUnits(ws,maxLoci,raw)}
  }
  const nodes=base.map((x,i)=>({
    id:'locus:'+i,address:`text://${x.start}:${x.end}`,label:label(raw,x.start,x.end),
    start:x.start,end:x.end,unitCount:Number(x.unitCount)||1,derived:true
  }));
  const coveredWords=nodes.reduce((n,x)=>n+x.unitCount,0);
  return {
    schema:COURSE_SCHEMA,kind:'TEXT',strategy,chars:raw.length,wordCount:ws.length,coveredWords,
    nodes,route:nodes.map(x=>x.id),coverage:nodes.length?{start:nodes[0].start,end:nodes.at(-1).end}:null,
    source:raw
  };
}
export function nodeForProgress(course,progress){
  const nodes=course?.nodes||[];if(!nodes.length)return null;
  const at=clamp(Number(progress)||0,0,1)*Math.max(0,(course.chars||1)-1);
  return nodes.reduce((best,n)=>{
    const d=at<n.start?n.start-at:at>n.end?at-n.end:0;
    return !best||d<best.d?{node:n,d}:best;
  },null)?.node||null;
}
export function courseReturn(course,training={}){
  if(!course||course.schema!==COURSE_SCHEMA)throw new Error('TEXT_COURSE_REQUIRED');
  return {
    kind:'FOLD_BLOOM_LOCI_RETURN',schema:COURSE_SCHEMA,created:new Date().toISOString(),
    source:{kind:'TEXT',chars:course.chars,text:course.source},
    strategy:course.strategy,nodes:course.nodes,route:course.route,
    evidence:{wordCount:course.wordCount,coveredWords:course.coveredWords,coverage:course.coverage},
    training:{step:Number(training.step)||0,hits:Number(training.hits)||0,hidden:!!training.hidden}
  };
}
