export const COMMS_SPINE_SCHEMA='comms-spine/v0.1';
export const RETURN_SCHEMA='comms-spine-return/v0.1';
export const SIGNAL_KINDS=Object.freeze(['ASK','PROMISE','DECISION','WAITING','CONSTRAINT','NOTE']);
export const SIGNAL_STATES=Object.freeze(['OPEN','COVERED','DEFERRED','DROPPED']);

const clean=s=>String(s??'').replace(/\r\n?/g,'\n');
const clip=(s,n=180)=>String(s??'').replace(/\s+/g,' ').trim().slice(0,n);
const speakerOf=s=>{
  const x=String(s||'').trim();
  if(/^(user|human|me|you)$/i.test(x))return 'USER';
  if(/^(assistant|chatgpt|ai|bot|hermes|codex)$/i.test(x))return 'ASSISTANT';
  return x?x.toUpperCase():'UNKNOWN';
};
function pushMessage(out,source,speaker,start,end){
  if(end<=start)return;
  let a=start,b=end;
  while(a<b&&/[\s\n]/.test(source[a]))a++;
  while(b>a&&/[\s\n]/.test(source[b-1]))b--;
  if(b<=a)return;
  out.push({id:'m'+String(out.length+1).padStart(2,'0'),speaker:speakerOf(speaker),start:a,end:b,text:source.slice(a,b)});
}
export function parseConversation(input){
  const source=clean(input),lines=source.split('\n'),messages=[];
  let offset=0,current=null;
  const marker=/^(?:\s*\[[^\]]{1,40}\]\s*)?(User|Human|Assistant|ChatGPT|AI|Hermes|Codex|Me|You|[A-Za-z][A-Za-z0-9 _-]{0,28})\s*:\s*(.*)$/i;
  for(const line of lines){
    const m=line.match(marker),lineStart=offset,lineEnd=offset+line.length;
    if(m){
      if(current)pushMessage(messages,source,current.speaker,current.start,lineStart);
      const prefixLen=line.indexOf(m[2]);
      current={speaker:m[1],start:lineStart+Math.max(0,prefixLen)};
    }else if(!current&&line.trim()){
      current={speaker:'UNKNOWN',start:lineStart};
    }
    offset=lineEnd+1;
  }
  if(current)pushMessage(messages,source,current.speaker,current.start,source.length);
  if(!messages.length&&source.trim())pushMessage(messages,source,'UNKNOWN',0,source.length);
  return {
    schema:COMMS_SPINE_SCHEMA,
    source,
    messages:messages.map((m,i)=>({...m,index:i,clauses:segmentClauses(m)}))
  };
}
export function segmentClauses(message){
  const text=String(message?.text||''),base=Number(message?.start)||0,out=[];
  let start=0;
  const boundary=(i)=>{
    const ch=text[i],next=text[i+1]||'';
    if(ch==='\n'&&next==='\n')return 2;
    if(ch==='\n')return 1;
    if(/[.!?;]/.test(ch)&&(/\s|$/.test(next)))return 1;
    return 0;
  };
  for(let i=0;i<text.length;i++){
    const take=boundary(i);if(!take)continue;
    const end=i+take;appendClause(out,text,base,start,end);start=end;i+=take-1;
  }
  appendClause(out,text,base,start,text.length);
  return out.map((c,i)=>({...c,id:message.id+'.c'+String(i+1).padStart(2,'0'),messageId:message.id,index:i}));
}
function appendClause(out,text,base,start,end){
  let a=start,b=end;
  while(a<b&&/\s/.test(text[a]))a++;
  while(b>a&&/\s/.test(text[b-1]))b--;
  if(b<=a)return;
  out.push({start:base+a,end:base+b,text:text.slice(a,b)});
}
const pats={
  ASK:[
    /\?\s*$/i,
    /\b(can|could|would|will)\s+(you|we)\b/i,
    /\bplease\b/i,
    /\b(let me know|tell me|help me|need you to|want you to|remember to)\b/i
  ],
  PROMISE:[
    /\b(i|we)\s*(?:'ll|will|can)\s+(?:do|make|send|check|fix|build|write|update|return|follow|look|handle|ship|review|keep|preserve|implement|add|remove|test|verify|merge)\b/i,
    /\b(i promise|we promise|i'll get|we'll get)\b/i
  ],
  DECISION:[
    /\b(decided|decision|go with|going with|let'?s\s+(?:use|do|keep|make|ship)|we\s+will\s+use|keep this|drop this|do not|don'?t)\b/i
  ],
  WAITING:[
    /\b(waiting|pending|blocked|after that|later|tomorrow|next turn|next time|once\b|when\b|depends? on|hold(?:ing)? for)\b/i
  ],
  CONSTRAINT:[
    /\b(must|mustn'?t|cannot|can'?t|only|avoid|without|never|do not|don'?t|no\s+(?:new|more|need|cloud|upload|send))\b/i
  ]
};
export function deriveSignals(doc){
  const out=[];
  for(const message of doc?.messages||[]){
    for(const clause of message.clauses||[]){
      const hits=[];
      for(const kind of ['ASK','PROMISE','DECISION','WAITING','CONSTRAINT']){
        const score=(pats[kind]||[]).reduce((n,re)=>n+(re.test(clause.text)?1:0),0);
        if(score)hits.push({kind,score});
      }
      hits.sort((a,b)=>b.score-a.score||a.kind.localeCompare(b.kind));
      if(!hits.length)continue;
      for(const hit of hits){
        out.push({
          id:'d:'+clause.id+':'+hit.kind.toLowerCase(),
          kind:hit.kind,
          state:'OPEN',
          origin:'DERIVED',
          confidence:Math.min(.92,.48+hit.score*.16),
          messageId:message.id,
          clauseId:clause.id,
          speaker:message.speaker,
          start:clause.start,
          end:clause.end,
          text:clause.text
        });
      }
    }
  }
  return out;
}
export function createHumanMark({kind='NOTE',messageId,clauseId,speaker='UNKNOWN',start,end,text,label=''}={}){
  const k=SIGNAL_KINDS.includes(kind)?kind:'NOTE';
  if(!Number.isFinite(Number(start))||!Number.isFinite(Number(end))||Number(end)<=Number(start))throw new TypeError('valid source range required');
  return {
    id:'h:'+String(messageId||'m')+':'+Number(start)+'-'+Number(end)+':'+k.toLowerCase(),
    kind:k,state:'OPEN',origin:'HUMAN',confidence:1,
    messageId:String(messageId||''),clauseId:String(clauseId||''),speaker:String(speaker||'UNKNOWN'),
    start:Number(start),end:Number(end),text:String(text||''),label:String(label||'')
  };
}
export function mergeSignals(derived=[],human=[]){
  const map=new Map();
  for(const x of derived||[])map.set(x.id,{...x});
  for(const x of human||[])map.set(x.id,{...x});
  return [...map.values()].sort((a,b)=>a.start-b.start||a.end-b.end||String(a.id).localeCompare(String(b.id)));
}
export function setSignalState(signals,id,state){
  const s=SIGNAL_STATES.includes(state)?state:'OPEN';
  return (signals||[]).map(x=>x.id===id?{...x,state:s}:x);
}
export function sourceSlice(source,signal){
  return String(source||'').slice(Number(signal?.start)||0,Number(signal?.end)||0);
}
export function coverageSummary(signals=[]){
  const counts={OPEN:0,COVERED:0,DEFERRED:0,DROPPED:0,total:0};
  for(const s of signals){counts.total++;counts[s.state]=(counts[s.state]||0)+1}
  return counts;
}
export function buildAgentPacket({doc,signals=[],draft='',title='COMMS SPINE'}={}){
  const open=signals.filter(s=>s.state==='OPEN'),deferred=signals.filter(s=>s.state==='DEFERRED'),covered=signals.filter(s=>s.state==='COVERED');
  const line=s=>({id:s.id,kind:s.kind,address:[s.start,s.end],messageId:s.messageId,speaker:s.speaker,text:s.text,origin:s.origin});
  return {
    schema:'comms-spine-agent-packet/v0.1',
    title,
    source:{length:doc?.source?.length||0,messageCount:doc?.messages?.length||0},
    requested_outcomes:open.filter(s=>s.kind==='ASK').map(line),
    promises:open.filter(s=>s.kind==='PROMISE').map(line),
    decisions:signals.filter(s=>s.kind==='DECISION'&&s.state!=='DROPPED').map(line),
    constraints:signals.filter(s=>s.kind==='CONSTRAINT'&&s.state!=='DROPPED').map(line),
    waiting:open.filter(s=>s.kind==='WAITING').map(line),
    deferred:deferred.map(line),
    covered:covered.map(line),
    draft:String(draft||''),
    law:'Every transformed item retains an exact source address. Derived labels are advisory; HUMAN marks are authored.'
  };
}
export function makeReturn({doc,sourceId,signals=[],draft='',coverageLinks=[],title='COMMS SPINE',includeSource=true}={}){
  const summary=coverageSummary(signals);
  return {
    schema:RETURN_SCHEMA,
    createdAt:new Date().toISOString(),
    source:{
      id:String(sourceId||''),
      title:String(title||'COMMS SPINE'),
      messageCount:doc?.messages?.length||0,
      charCount:doc?.source?.length||0,
      text:includeSource?String(doc?.source||''):null
    },
    signals:signals.map(s=>({
      id:s.id,kind:s.kind,state:s.state,origin:s.origin,confidence:s.confidence,
      messageId:s.messageId,clauseId:s.clauseId,speaker:s.speaker,start:s.start,end:s.end,text:s.text,label:s.label||''
    })),
    response:{text:String(draft||''),covers:[...new Set((coverageLinks||[]).map(String))]},
    summary,
    laws:[
      'SOURCE ADDRESS SURVIVES TRANSFORMATION',
      'DERIVED != HUMAN AUTHORED',
      'SUMMARY/TASK/RESPONSE != SOURCE',
      'COVERED != DELETED',
      'RETURN PRESERVES RESIDUE'
    ]
  };
}
export function validateReturn(value){
  if(!value||value.schema!==RETURN_SCHEMA)throw new TypeError('invalid comms spine return');
  if(!value.source||typeof value.source.id!=='string')throw new TypeError('source required');
  if(!Array.isArray(value.signals))throw new TypeError('signals required');
  for(const s of value.signals){
    if(!SIGNAL_KINDS.includes(s.kind))throw new TypeError('invalid signal kind');
    if(!SIGNAL_STATES.includes(s.state))throw new TypeError('invalid signal state');
    if(!Number.isFinite(Number(s.start))||!Number.isFinite(Number(s.end))||Number(s.end)<=Number(s.start))throw new TypeError('invalid signal address');
  }
  return value;
}
export function demoConversation(){
  return `User: Can you check the local-source Journey branch and make sure we don't duplicate it? I want a real comms-spine demo we can actually use. Please keep source addresses intact and don't turn it into chapter scrolling.

Assistant: I'll keep Journey isolated and build COMMS-SPINE inside HUMAN PORT. I'll preserve exact source spans and make derived labels visibly weaker than human marks.

User: Great. Also remember the bot handoff needs to show open asks and promises. We can explore poem/TTS later, but don't let that distract this build.

Assistant: Decision: first ship the local paste/import demo with ASK / PROMISE / DECISION / WAITING / CONSTRAINT marks, response coverage, agent packet, and RETURN. Poetry stays parked until this survives real use.`;
}
