export const VOICE_TRACE_SCHEMA='fold-bloom-voice-training-trace/v0.1';

const finite=v=>Number.isFinite(Number(v))?Number(v):null;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export function logFrequencyY(hz,{minHz=70,maxHz=6000,height=100}={}){
  const h=Math.max(1,Number(height)||100),lo=Math.max(1,Number(minHz)||70),hi=Math.max(lo+1,Number(maxHz)||6000),f=finite(hz);
  if(!(f>0))return null;
  const q=clamp(Math.log(clamp(f,lo,hi)/lo)/Math.log(hi/lo),0,1);
  return +(h*(1-q)).toFixed(3);
}

export function signedBeatOffsetMs(beatPhase,bpm){
  const phase=finite(beatPhase),tempo=finite(bpm);
  if(phase===null||!(tempo>0))return null;
  const p=((phase%1)+1)%1,signed=p>.5?p-1:p;
  return +(signed*(60000/tempo)).toFixed(2);
}

export function centsError(heardHz,targetHz){
  const h=finite(heardHz),t=finite(targetHz);
  if(!(h>0)||!(t>0))return null;
  return +(1200*Math.log2(h/t)).toFixed(2);
}

export function appendVoiceTrace(trace,entry,max=240){
  const list=Array.isArray(trace)?trace.slice():[],heardHz=finite(entry?.heardHz),targetHz=finite(entry?.targetHz);
  const next={
    atMs:Math.max(0,Math.round(finite(entry?.atMs)||0)),
    heardHz:heardHz&&heardHz>0?+heardHz.toFixed(2):null,
    targetHz:targetHz&&targetHz>0?+targetHz.toFixed(2):null,
    clarity:finite(entry?.clarity)===null?null:+clamp(Number(entry.clarity),0,1).toFixed(3),
    centroidHz:finite(entry?.centroidHz)===null?null:+Math.max(0,Number(entry.centroidHz)).toFixed(1),
    beatIndex:finite(entry?.beatIndex)===null?null:Math.trunc(Number(entry.beatIndex)),
    beatPhase:finite(entry?.beatPhase)===null?null:+((((Number(entry.beatPhase)%1)+1)%1)).toFixed(4),
    bpm:finite(entry?.bpm)===null?null:+Math.max(0,Number(entry.bpm)).toFixed(2),
    onset:!!entry?.onset
  };
  next.cents=centsError(next.heardHz,next.targetHz);
  next.centered=next.cents!==null&&Math.abs(next.cents)<=15;
  next.onsetOffsetMs=next.onset?signedBeatOffsetMs(next.beatPhase,next.bpm):null;
  list.push(next);
  const limit=clamp(Math.trunc(Number(max)||240),1,240);
  return list.slice(-limit);
}

export function summarizeVoiceTrace(trace){
  const list=Array.isArray(trace)?trace:[];let voiced=0,centered=0,run=0,longest=0,onsets=0,onsetAbs=0,onsetSigned=0;
  for(const x of list){
    if(x?.heardHz>0)voiced++;
    if(x?.centered){centered++;run++;longest=Math.max(longest,run)}else run=0;
    if(x?.onset&&Number.isFinite(Number(x.onsetOffsetMs))){onsets++;onsetAbs+=Math.abs(Number(x.onsetOffsetMs));onsetSigned+=Number(x.onsetOffsetMs)}
  }
  return {
    schema:VOICE_TRACE_SCHEMA,
    frames:list.length,
    voicedFrames:voiced,
    centeredFrames:centered,
    centeredRatio:voiced?+(centered/voiced).toFixed(3):null,
    longestCenteredFrames:longest,
    onsetCount:onsets,
    meanAbsOnsetMs:onsets?+(onsetAbs/onsets).toFixed(1):null,
    onsetBiasMs:onsets?+(onsetSigned/onsets).toFixed(1):null
  };
}
