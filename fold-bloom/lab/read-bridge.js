const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const READ_PULSE_MODES=Object.freeze(['WITNESS','PACE4','OFF']);

export function nextPulseMode(mode='WITNESS'){
  const i=READ_PULSE_MODES.indexOf(String(mode||'').toUpperCase());
  return READ_PULSE_MODES[(i<0?0:i+1)%READ_PULSE_MODES.length];
}

export function pulseModeLabel(mode='WITNESS'){
  if(mode==='PACE4')return 'PULSE · ×4 PACE';
  if(mode==='OFF')return 'PULSE · OFF';
  return 'PULSE · WITNESS';
}

export function paceWpmFromTransport(data={},multiplier=4,{min=60,max=6000}={}){
  const bpm=Number(data?.bpm),m=Number(multiplier);
  if(!Number.isFinite(bpm)||bpm<=0||!Number.isFinite(m)||m<=0)return null;
  return clamp(Math.round(bpm*m),min,max);
}

export function transportWitness(data={}){
  if(!data||typeof data!=='object')return null;
  const time=Number(data.time)||0,duration=Number(data.duration)||0;
  const progress=Number.isFinite(Number(data.sourceProgress))
    ? Number(data.sourceProgress)
    : duration>0?time/duration:0;
  return {
    sourceProgress:clamp(progress,0,1),
    beatPhase:clamp(Number(data.beatPhase)||0,0,1),
    sectionProgress:clamp(Number(data.sectionProgress)||0,0,1),
    energy:clamp(Number(data.energy)||0,0,1.5),
    bpm:Math.max(0,Number(data.bpm)||0),
    sourceHash:data.sourceHash||null,
    playing:!!data.playing
  };
}

export function boundedFocus(detail={}){
  if(!detail||typeof detail!=='object'||!detail.schema)return null;
  return {
    schema:'field-aperture-focus/v0.2',
    scale:String(detail.scale||''),
    address:detail.address??null,
    index:Number.isFinite(Number(detail.index))?Number(detail.index):0,
    count:Number.isFinite(Number(detail.count))?Number(detail.count):0,
    sourceProgress:clamp(Number(detail.source_progress)||0,0,1),
    wpm:clamp(Number(detail.wpm)||300,60,6000),
    playing:!!detail.playing,
    focus:String(detail.focus||'').slice(0,160)
  };
}
