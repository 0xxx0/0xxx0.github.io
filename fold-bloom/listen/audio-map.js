export const SCOPES=['BEAT','PHRASE','SECTION','TRACK'];
export function frameIndexAt(map,time){
  if(!map?.frames?.length)return 0;
  const fps=map.frameRate||(map.sampleRate/map.hop);
  return Math.max(0,Math.min(map.frames.length-1,Math.round(time*fps)));
}
export function frameAt(map,time){return map?.frames?.[frameIndexAt(map,time)]||null}
export function beatIndexAt(map,time){
  const b=map?.beats||[];if(!b.length)return -1;
  let lo=0,hi=b.length-1;while(lo<hi){const m=Math.ceil((lo+hi)/2);if(b[m]<=time)lo=m;else hi=m-1}return lo;
}
export function sectionIndexAt(map,time){
  const s=map?.sections||[];if(!s.length)return -1;
  let i=0;while(i+1<s.length&&s[i+1].t<=time)i++;return Math.min(i,s.length-2);
}
export function scopeWindow(map,time,scope){
  if(!map)return [0,1];
  if(scope==='TRACK')return [0,map.duration];
  if(scope==='SECTION'){
    const i=sectionIndexAt(map,time),s=map.sections;
    return i>=0?[s[i].t,s[i+1]?.t??map.duration]:[0,map.duration];
  }
  const bi=beatIndexAt(map,time),beats=map.beats||[],beatDur=60/(map.bpm||90);
  if(scope==='PHRASE'){
    const start=Math.max(0,(bi<0?time:beats[Math.max(0,Math.floor(bi/8)*8)]||time)-beatDur*.5);
    return [start,Math.min(map.duration,start+beatDur*8)];
  }
  const b=bi>=0?beats[bi]:time;return [Math.max(0,b-beatDur*.5),Math.min(map.duration,b+beatDur*.5)];
}

export function scrubTime(range,fraction){
  const lo=Number.isFinite(Number(range?.[0]))?Number(range[0]):0,rawHi=Number.isFinite(Number(range?.[1]))?Number(range[1]):lo,hi=Math.max(lo,rawHi),p=Math.max(0,Math.min(1,Number(fraction)||0));
  return hi<=lo?lo:lo+p*(hi-lo);
}
