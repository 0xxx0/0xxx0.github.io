import assert from 'node:assert/strict';
import {
  createState,rotateSteps,release,availableForecasts,forecastMatchesCall,N,wrap
} from '../../live/engine.js';
import {formToken} from '../../live/form-puzzle.js';
import {hexProjection} from '../../live/hex-projection.js';

export const LIVE_SUFFICIENCY_SCHEMA='fold-bloom-live-macrostate-sufficiency/v0.1';

function recentForm(state){
  const xs=(state?.history||[]).slice(-6).map(e=>String(e?.verb||'').toUpperCase());
  return xs.length===6?xs:null;
}
function forecastSignature(state){
  const options=availableForecasts(state).map(o=>({
    slot:o.slot,verb:o.verb,chain:o.chain,cadence:o.cadence||null,
    span:o.span,power:o.power
  })).sort((a,b)=>a.slot-b.slot||a.verb.localeCompare(b.verb));
  return JSON.stringify({
    targetType:state.targetType,
    call:state.call?{verb:state.call.verb,chain:state.call.chain,candidates:state.call.candidates}:null,
    options
  });
}
function behaviorSummary(state){
  const options=availableForecasts(state);
  const counts={};
  for(const o of options)counts[o.verb]=(counts[o.verb]||0)+1;
  return {
    targetType:state.targetType,
    call:state.call?{verb:state.call.verb,chain:state.call.chain,candidates:state.call.candidates}:null,
    optionCount:options.length,
    verbs:Object.fromEntries(Object.entries(counts).sort()),
    maxChain:options.reduce((m,o)=>Math.max(m,o.chain||1),0),
    slots:options.map(o=>o.slot)
  };
}
function moveToSlot(state,slot){
  const desired=wrap(-slot,N);
  let delta=desired-state.rotation;
  if(delta>N/2)delta-=N;
  if(delta<-N/2)delta+=N;
  return rotateSteps(state,delta);
}
function chooseForecast(state,round){
  const options=availableForecasts(state);
  if(!options.length)return null;
  const callHit=options.filter(o=>forecastMatchesCall(state.call,o));
  const pool=callHit.length?callHit:options;
  return pool[round%pool.length];
}
function step(state,round){
  const choice=chooseForecast(state,round);
  if(!choice)return state;
  const aligned=moveToSlot(state,choice.slot);
  const out=release(aligned,{timing:'FREE',timingMultiplier:1});
  return out.event?out.state:aligned;
}

export function runLiveMacrostateSufficiency({
  seeds=96,rounds=24,stopAtFirst=false
}={}){
  const byHex=new Map(),byExact=new Map();
  let samples=0,hexCounterexample=null,exactCounterexample=null;
  for(let seed=1;seed<=seeds;seed++){
    let state=createState(seed);
    for(let round=0;round<rounds;round++){
      state=step(state,round);
      const form=recentForm(state);
      if(!form)continue;
      samples++;
      const exact=formToken(form),hex=hexProjection(form).token,signature=forecastSignature(state);
      const record={seed,round:round+1,seq:state.seq,exact,hex,form:[...form],signature,behavior:behaviorSummary(state)};
      const prevHex=byHex.get(hex);
      if(!hexCounterexample&&prevHex&&prevHex.signature!==signature){
        hexCounterexample={macrostate:hex,a:prevHex,b:record};
        if(stopAtFirst)break;
      }else if(!prevHex)byHex.set(hex,record);
      const prevExact=byExact.get(exact);
      if(!exactCounterexample&&prevExact&&prevExact.signature!==signature){
        exactCounterexample={macrostate:exact,a:prevExact,b:record};
      }else if(!prevExact)byExact.set(exact,record);
    }
    if(stopAtFirst&&hexCounterexample)break;
  }
  return {
    schema:LIVE_SUFFICIENCY_SCHEMA,
    authority:'EVIDENCE_ONLY',
    samples,
    uniqueHex:byHex.size,
    uniqueExact:byExact.size,
    property:'NEXT_LAWFUL_FORECAST_SET + CALL + TARGET_TYPE',
    hexControlSufficient:!hexCounterexample,
    exactRecentFormControlSufficient:!exactCounterexample,
    hexCounterexample,
    exactCounterexample,
    law:'a macrostate fails this named sufficiency test if two lawful LIVE snapshots with the same macro label expose different next lawful forecast signatures'
  };
}

if(import.meta.url===new URL(process.argv[1], 'file://').href){
  const out=runLiveMacrostateSufficiency();
  assert.ok(out.samples>100,'expected substantial native LIVE sample set');
  assert.ok(out.hexCounterexample,'expected same hex quotient with unequal native futures');
  assert.equal(out.hexControlSufficient,false);
  console.log(JSON.stringify(out,null,2));
}
