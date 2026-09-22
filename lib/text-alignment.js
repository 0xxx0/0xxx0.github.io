const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export const TEXT_ALIGNMENT_SCHEMA='field-text-alignment/v0.1';

export function normalizeTextAlignment(x={}){
  const anchors=(Array.isArray(x?.anchors)?x.anchors:[])
    .map((a,i)=>({
      id:String(a.id||('A'+(i+1))),
      playTime:Math.max(0,Number(a.playTime)||0),
      cueTime:Math.max(0,Number(a.cueTime)||0),
      label:String(a.label||'').slice(0,160),
      kind:String(a.kind||'CUE').slice(0,40),
      createdAt:a.createdAt||null
    }))
    .sort((a,b)=>a.playTime-b.playTime||a.cueTime-b.cueTime);
  return {schema:TEXT_ALIGNMENT_SCHEMA,baseOffset:clamp(Number(x?.baseOffset)||0,-120,120),anchors,updatedAt:x?.updatedAt||null};
}

function segmentSlope(a,b){
  const dp=b.playTime-a.playTime,dc=b.cueTime-a.cueTime;
  if(Math.abs(dp)<.05)return 1;
  return clamp(dc/dp,.35,2.8);
}

export function cueTimeAtPlayback(playTime,model={}){
  const m=normalizeTextAlignment(model),t=Math.max(0,Number(playTime)||0),xs=m.anchors;
  if(!xs.length)return Math.max(0,t+m.baseOffset);
  if(xs.length===1)return Math.max(0,t+(xs[0].cueTime-xs[0].playTime));
  if(t<=xs[0].playTime){
    const s=segmentSlope(xs[0],xs[1]);
    return Math.max(0,xs[0].cueTime+(t-xs[0].playTime)*s);
  }
  for(let i=0;i<xs.length-1;i++){
    const a=xs[i],b=xs[i+1];
    if(t<=b.playTime){
      const q=clamp((t-a.playTime)/Math.max(.001,b.playTime-a.playTime),0,1);
      return Math.max(0,a.cueTime+(b.cueTime-a.cueTime)*q);
    }
  }
  const a=xs.at(-2),b=xs.at(-1),s=segmentSlope(a,b);
  return Math.max(0,b.cueTime+(t-b.playTime)*s);
}

export function playbackTimeAtCue(cueTime,model={}){
  const m=normalizeTextAlignment(model),t=Math.max(0,Number(cueTime)||0),xs=[...m.anchors].sort((a,b)=>a.cueTime-b.cueTime||a.playTime-b.playTime);
  if(!xs.length)return Math.max(0,t-m.baseOffset);
  if(xs.length===1)return Math.max(0,t-(xs[0].cueTime-xs[0].playTime));
  const inv=(a,b,v)=>{
    const dc=b.cueTime-a.cueTime;
    if(Math.abs(dc)<.05)return a.playTime+(v-a.cueTime);
    const q=(v-a.cueTime)/dc;
    return a.playTime+(b.playTime-a.playTime)*q;
  };
  if(t<=xs[0].cueTime)return Math.max(0,inv(xs[0],xs[1],t));
  for(let i=0;i<xs.length-1;i++)if(t<=xs[i+1].cueTime)return Math.max(0,inv(xs[i],xs[i+1],t));
  return Math.max(0,inv(xs.at(-2),xs.at(-1),t));
}

export function addTextAlignmentAnchor(model,anchor={}){
  const m=normalizeTextAlignment(model),a={
    id:String(anchor.id||('A'+Date.now().toString(36))),
    playTime:Math.max(0,Number(anchor.playTime)||0),
    cueTime:Math.max(0,Number(anchor.cueTime)||0),
    label:String(anchor.label||'').slice(0,160),
    kind:String(anchor.kind||'CUE').slice(0,40),
    createdAt:anchor.createdAt||new Date().toISOString()
  };
  const kept=m.anchors.filter(x=>Math.abs(x.playTime-a.playTime)>.30&&Math.abs(x.cueTime-a.cueTime)>.30);
  return normalizeTextAlignment({...m,anchors:[...kept,a],updatedAt:new Date().toISOString()});
}

export function shiftTextAlignment(model,delta=0){
  const m=normalizeTextAlignment(model),d=clamp(Number(delta)||0,-30,30);
  if(m.anchors.length)return normalizeTextAlignment({...m,anchors:m.anchors.map(a=>({...a,cueTime:Math.max(0,a.cueTime+d)})),updatedAt:new Date().toISOString()});
  return normalizeTextAlignment({...m,baseOffset:clamp(m.baseOffset+d,-120,120),updatedAt:new Date().toISOString()});
}

export function removeTextAlignmentAnchor(model,id){
  const m=normalizeTextAlignment(model);
  return normalizeTextAlignment({...m,anchors:m.anchors.filter(x=>x.id!==id),updatedAt:new Date().toISOString()});
}

export function buildTextTimeline({text='',cues=[],duration=0}={}){
  const raw=String(text||''),out=[];
  if(Array.isArray(cues)&&cues.length){
    let cursor=0;
    for(const [i,c] of cues.entries()){
      const label=String(c?.text||'').trim();if(!label)continue;
      let at=raw.indexOf(label,cursor);if(at<0)at=raw.indexOf(label);if(at<0)at=cursor;
      const start=clamp(at,0,raw.length),end=clamp(start+label.length,start,raw.length);cursor=Math.max(cursor,end);
      out.push({id:'C'+(i+1),cueTime:Math.max(0,Number(c.start)||0),endTime:c.end==null?null:Math.max(0,Number(c.end)||0),text:label,startChar:start,endChar:end,estimated:false,kind:'TIMED_CUE'});
    }
    return out;
  }
  const lines=raw.split(/\r?\n+/).map(x=>x.trim()).filter(Boolean);
  let cursor=0;
  for(const [i,label] of lines.entries()){
    let at=raw.indexOf(label,cursor);if(at<0)at=cursor;
    const start=clamp(at,0,raw.length),end=clamp(start+label.length,start,raw.length);cursor=Math.max(cursor,end);
    const p=lines.length<=1?0:i/(lines.length-1);
    out.push({id:'L'+(i+1),cueTime:Math.max(0,Number(duration)||0)*p,endTime:null,text:label,startChar:start,endChar:end,estimated:true,kind:'ESTIMATED_LINE'});
  }
  return out;
}

export function unitAtPlayback(timeline=[],playTime=0,model={}){
  if(!timeline.length)return null;
  const cueT=cueTimeAtPlayback(playTime,model);
  let hit=timeline[0];
  for(const u of timeline){if(u.cueTime<=cueT)hit=u;else break}
  return {...hit,mappedCueTime:cueT};
}

export function charIndexAtPlayback(timeline=[],playTime=0,model={}){
  return unitAtPlayback(timeline,playTime,model)?.startChar??0;
}

export function alignmentSummary(model={}){
  const m=normalizeTextAlignment(model);
  if(!m.anchors.length)return m.baseOffset?('OFFSET '+(m.baseOffset>=0?'+':'')+m.baseOffset.toFixed(2)+'s'):'RAW / NO ANCHORS';
  if(m.anchors.length===1){
    const d=m.anchors[0].cueTime-m.anchors[0].playTime;
    return '1 ANCHOR · '+(d>=0?'+':'')+d.toFixed(2)+'s';
  }
  const a=m.anchors[0],b=m.anchors.at(-1),s=segmentSlope(a,b);
  return m.anchors.length+' ANCHORS · DRIFT ×'+s.toFixed(3);
}
