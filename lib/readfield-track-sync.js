export const READFIELD_TRACK_HANDOFF_SCHEMA='readfield-track-handoff/v0.1';

const finite=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const text=(v,f='')=>String(v??f);
const hashKey=v=>text(v).trim().toLowerCase().replace(/^sha256:/,'');

export function normalizeTimedCues(timedText={},source=''){
  const xs=Array.isArray(timedText?.cues)?timedText.cues:[];
  const body=text(source);
  let cursor=0;
  const out=[];
  for(const cue of xs){
    const cueText=text(cue?.text).trim();
    const start=Math.max(0,finite(cue?.start,NaN));
    if(!cueText||!Number.isFinite(start))continue;
    const rawEnd=Number(cue?.end),end=Number.isFinite(rawEnd)&&rawEnd>=start?rawEnd:null;
    let charIndex=body?body.indexOf(cueText,cursor):-1;
    if(charIndex<0&&body)charIndex=body.indexOf(cueText);
    if(charIndex<0)charIndex=Math.max(0,cursor);
    cursor=Math.max(cursor,charIndex+cueText.length+1);
    out.push({index:out.length,start,end,text:cueText,charIndex});
  }
  out.sort((a,b)=>a.start-b.start||a.index-b.index);
  return out.map((x,i)=>({...x,index:i}));
}

export function cueIndexAt(cues=[],time=0){
  if(!Array.isArray(cues)||!cues.length)return-1;
  const t=Math.max(0,finite(time,0));
  let lo=0,hi=cues.length-1,hit=0;
  while(lo<=hi){
    const mid=(lo+hi)>>1;
    if(finite(cues[mid]?.start,0)<=t){hit=mid;lo=mid+1}else hi=mid-1;
  }
  return hit;
}

export function buildTrackHandoff(input={}){
  const source=text(input.source).trim();
  const timedText=input.timedText&&typeof input.timedText==='object'?input.timedText:null;
  const cues=normalizeTimedCues(timedText||{},source);
  return {
    schema:READFIELD_TRACK_HANDOFF_SCHEMA,
    created:new Date().toISOString(),
    source,
    label:text(input.label,'TRACK / TIMED TEXT'),
    returnAddress:text(input.returnAddress),
    sourceKind:text(input.sourceKind),
    sourceHash:text(input.sourceHash),
    timedText:timedText?{
      name:text(timedText.name),kind:text(timedText.kind),alignment:text(timedText.alignment),
      cues:cues.map(({start,end,text,charIndex})=>({start,end,text,charIndex}))
    }:null,
    transport:{
      time:Math.max(0,finite(input.time,0)),bpm:Math.max(0,finite(input.bpm,0)),scope:text(input.scope),stage:text(input.stage)
    }
  };
}

export function trackTarget(packet={},transport={}){
  if(packet?.schema!==READFIELD_TRACK_HANDOFF_SCHEMA)return null;
  const source=text(packet.source),cues=normalizeTimedCues(packet.timedText||{},source);
  if(!cues.length)return null;
  const data=transport?.data&&typeof transport.data==='object'?transport.data:transport;
  const packetHash=hashKey(packet.sourceHash),pulseHash=hashKey(data?.sourceHash);
  if(packetHash&&pulseHash&&packetHash!==pulseHash)return null;
  const time=Math.max(0,finite(data?.time,packet?.transport?.time||0));
  const cueIndex=cueIndexAt(cues,time),cue=cues[cueIndex];
  if(!cue)return null;
  return {
    cueIndex,cueCount:cues.length,charIndex:cue.charIndex,start:cue.start,end:cue.end,text:cue.text,time,
    sourceHash:packetHash||pulseHash||'',playing:!!data?.playing,bpm:Math.max(0,finite(data?.bpm,packet?.transport?.bpm||0))
  };
}
