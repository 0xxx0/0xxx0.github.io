export const TEXT_MARK_SCHEMA='fold-bloom-text-mark/v0.1';
export const VERSE_HANDOFF_SCHEMA='field-verse-handoff/v0.1';
export const REPLAY_HANDOFF_SCHEMA='fold-bloom-replay-handoff/v0.2';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));

export function textSourceKey(source=''){
  const text=String(source??'');
  let h=0x811c9dc5;
  for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,0x01000193)}
  return `text-local:${text.length}:${(h>>>0).toString(16).padStart(8,'0')}`;
}

export function lineSpans(source=''){
  const text=String(source??''),out=[];
  let start=0,line=0;
  for(let i=0;i<=text.length;i++){
    if(i===text.length||text[i]==='\n'){
      const end=i,raw=text.slice(start,end);
      out.push({
        id:`line:${line}`,line,start,end,text:raw,
        address:`text://${start}:${end}`,
        p:text.length?clamp(start/text.length,0,1):0
      });
      line++;start=i+1;
    }
  }
  return out.length?out:[{id:'line:0',line:0,start:0,end:0,text:'',address:'text://0:0',p:0}];
}

export function makeTextMark({source='',sourceKey=null,start=0,end=null,kind='BOOKMARK',label='',note='',projection='VERSE',createdAt=null,id=null}={}){
  const text=String(source??''),key=String(sourceKey||textSourceKey(text)),a=clamp(Math.trunc(start),0,text.length);
  const k=['BOOKMARK','FLAG','ARC'].includes(String(kind||'').toUpperCase())?String(kind).toUpperCase():'BOOKMARK';
  const rawEnd=end===null||end===undefined?a:Math.trunc(Number(end)||0);
  const b=clamp(Math.max(a,rawEnd),0,text.length);
  const spanEnd=k==='ARC'?b:a;
  const created=createdAt||new Date().toISOString();
  return {
    schema:TEXT_MARK_SCHEMA,
    id:id||`${key}:${a}:${spanEnd}:${k}:${created}`,
    sourceKey:key,kind:k,unit:'char',
    start:a,end:spanEnd,address:`text://${a}:${spanEnd}`,
    p:text.length?+(a/text.length).toFixed(6):0,
    endP:text.length?+(spanEnd/text.length).toFixed(6):0,
    label:String(label||'').slice(0,120),
    note:String(note||'').slice(0,1000),
    projection:String(projection||'VERSE').slice(0,32),
    createdAt:created
  };
}

export function normalizeTextMarks(marks=[],source='',sourceKey=null){
  const text=String(source??''),key=String(sourceKey||textSourceKey(text));
  return (Array.isArray(marks)?marks:[])
    .filter(x=>x&&(!x.sourceKey||x.sourceKey===key))
    .map(x=>makeTextMark({...x,source:text,sourceKey:key,id:x.id,createdAt:x.createdAt}))
    .sort((a,b)=>a.start-b.start||a.end-b.end||a.createdAt.localeCompare(b.createdAt));
}

export function marksForRange(marks=[],start=0,end=start){
  const a=Math.max(0,Number(start)||0),b=Math.max(a,Number(end)||a);
  return (Array.isArray(marks)?marks:[]).filter(m=>{
    const x=Number(m.start)||0,y=Number(m.end)||x;
    return x<=b&&y>=a;
  });
}

export function verseHandoff({source='',focus=null,marks=[],from='/fold-bloom/lab/'}={}){
  const text=String(source??''),key=textSourceKey(text),lines=lineSpans(text);
  const f=focus&&Number.isFinite(Number(focus.start))?focus:lines[0];
  return {
    schema:VERSE_HANDOFF_SCHEMA,
    created:new Date().toISOString(),
    source:text,sourceKey:key,
    focus:{line:Number(f.line)||0,start:Number(f.start)||0,end:Number(f.end)||Number(f.start)||0,address:f.address||`text://${Number(f.start)||0}:${Number(f.end)||Number(f.start)||0}`},
    marks:normalizeTextMarks(marks,text,key),
    from:String(from||'/fold-bloom/lab/')
  };
}

export function replayHandoff({source='',focus=null,marks=[],returnAddress='/fold-bloom/lab/?mode=VERSE'}={}){
  const text=String(source??''),lines=lineSpans(text),key=textSourceKey(text),f=focus&&Number.isFinite(Number(focus.start))?focus:lines.find(x=>x.text.trim())||lines[0];
  const cleanMarks=normalizeTextMarks(marks,text,key);
  const duration=Math.max(8000,Math.min(20000,Math.max(1,lines.length)*2600));
  const p=text.length?clamp((Number(f.start)||0)/text.length,0,1):0;
  return {
    schema:REPLAY_HANDOFF_SCHEMA,
    created:Date.now(),expires:Date.now()+30*60*1000,
    source:{id:key,key,profile_key:key,name:'VERSE / FIELD LAB',kind:'TEXT',duration_ms:duration,address:f.address||''},
    interval_ms:[0,duration],position_ms:Math.round(p*duration),scope:'TEXT',
    suggestedMessage:String(f.text||'').trim().slice(0,180)||'MEET ME HERE',
    context:{title:'VERSE MARK',body:`Line ${Number(f.line)+1} · exact text address preserved; REPLAY timing is presentation only.`},
    evidence:{
      stage:'TEXT',
      marks:cleanMarks.slice(0,12).map(m=>({id:m.id,kind:m.kind,p:m.p,label:m.label||String(f.text||'').trim().slice(0,80),note:m.note,address:m.address,endAddress:m.end>m.start?`text://${m.end}:${m.end}`:''}))
    },
    returnAddress
  };
}
