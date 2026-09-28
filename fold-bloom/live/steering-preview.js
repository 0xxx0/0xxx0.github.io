import {availableForecasts,forecastContext,gateCellIndex,N} from './engine.js?v=0.13.2';
import {steeringDescriptor} from '../../lib/field-pulse.js';

export const LIVE_STEERING_SCHEMA='fold-bloom-live-steering-preview/v0.1';
export const LIVE_STEERING_VERBS=Object.freeze(['BLOOM','FOLD','SPLIT','RETURN']);

const round=(x,n=6)=>Number(Number(x).toFixed(n));

export function steeringTurnDelta(state,slot){
  const gate=gateCellIndex(state),target=((Math.trunc(Number(slot))%N)+N)%N;
  const raw=((gate-target)%N+N)%N;
  return raw>N/2?raw-N:raw;
}
const turnDirection=delta=>delta>0?'RIGHT':delta<0?'LEFT':'HERE';


export function liveSteeringPreview(state,message,opt={}){
  const desc=steeringDescriptor(message,opt.now??Date.now(),opt.maxAgeMs??15000);
  if(!desc)return {ok:false,reason:'NO_FRESH_STEERING_PULSE',authority:'PREVIEW'};
  if(!LIVE_STEERING_VERBS.includes(desc.directionLabel)){
    return {ok:false,reason:'STEERING_LABEL_OUTSIDE_LIVE_VOCABULARY',label:desc.directionLabel,authority:'PREVIEW'};
  }
  const context=forecastContext(state),candidates=availableForecasts(state)
    .filter(x=>x.verb===desc.directionLabel)
    .map(x=>{
      const turn_delta=steeringTurnDelta(state,x.slot);
      return {slot:x.slot,verb:x.verb,chain:x.chain,power:x.power,cadence:x.cadence||null,path:[...(x.path||[])],turn_delta,turn_steps:Math.abs(turn_delta),turn_direction:turnDirection(turn_delta)};
    });
  const nearestTurnSteps=candidates.length?Math.min(...candidates.map(x=>x.turn_steps)):null;
  const nearestCandidates=nearestTurnSteps==null?[]:candidates.filter(x=>x.turn_steps===nearestTurnSteps);
  return {
    ok:true,
    schema:LIVE_STEERING_SCHEMA,
    authority:'PREVIEW',
    source:desc.source,
    request_id:desc.requestId||null,
    direction_ref:desc.directionRef||null,
    verb:desc.directionLabel,
    strength:desc.strength,
    candidate_count:candidates.length,
    candidate_ambiguity_bits:candidates.length?round(Math.log2(candidates.length)):null,
    nearest_turn_steps:nearestTurnSteps,
    nearest_slots:nearestCandidates.map(x=>x.slot),
    candidates,
    context,
    commit_operation:null,
    expires_at:desc.wall+(opt.maxAgeMs??15000),
    law:'J-space/steering may illuminate currently lawful native forecasts and the authored ring steps needed to reach them; it cannot rotate, RELEASE, alter call selection, or mutate LIVE state'
  };
}

export function manualSteeringPulse(verb,opt={}){
  return {
    schema:'field-pulse/v0.1',
    source:'FOLD_BLOOM_LIVE_MANUAL_PREVIEW',
    instance:String(opt.instance||'manual'),
    kind:'steering',
    seq:Number(opt.seq)||1,
    wall:Number(opt.wall)||Date.now(),
    at:0,
    data:{
      authority:'NONE',
      direction_label:String(verb||'').trim().toUpperCase(),
      direction_ref:'manual-preview://'+String(verb||'').trim().toLowerCase(),
      request_id:'manual-preview',
      strength:1
    }
  };
}
