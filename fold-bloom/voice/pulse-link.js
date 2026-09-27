// Voice ↔ Field Pulse link-state seam. Pure derivation, no DOM or transport I/O:
// FREE when the voice trainer does not take the shared clock, WAITING when it
// wants the clock but none is live, LINKED with the source name + BPM when the
// clock is live. "LIVE" here is the caller's livePulse() view, which already
// applies Field Pulse staleness rules.
export const VOICE_PULSE_LINK_SCHEMA='fold-bloom/voice-pulse-link/v0.1';

export function voiceLinkState({linked=false,live=null}={}){
  if(!linked)return {state:'FREE',display:'FREE',label:null,clock:null,bpm:null,beatIndex:null};
  const bpm=Number(live?.bpm);
  if(!live||!(bpm>0))return {state:'WAITING',display:'WAITING FOR PULSE',label:null,clock:null,bpm:null,beatIndex:null};
  const label=String(live.label||'FIELD PULSE');
  return {
    state:'LINKED',
    display:'LINKED · '+label+' · '+Math.round(bpm)+' BPM',
    label,clock:live.clock?String(live.clock):null,bpm:Math.round(bpm),
    beatIndex:Number.isFinite(Number(live.beatIndex))?Number(live.beatIndex):null
  };
}