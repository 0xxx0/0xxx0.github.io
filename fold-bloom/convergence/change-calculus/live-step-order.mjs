import {
  createState,rotateSteps,release,availableForecasts,forecastAtSlot,
  snapshot,restore,N,wrap
} from '../../live/engine.js';

export const LIVE_STEP_ORDER_SCHEMA='fold-bloom-live-step-order/v0.1';
export const VERB_RESOLVER='LOWEST_SLOT';

const round=(x,n=6)=>Number(Number(x).toFixed(n));
const upper=x=>String(x??'').trim().toUpperCase();

function cloneNative(state){
  return restore(snapshot(state));
}

function moveToSlot(state,slot){
  const desired=wrap(-Number(slot),N);
  let delta=desired-state.rotation;
  if(delta>N/2)delta-=N;
  if(delta<-N/2)delta+=N;
  return rotateSteps(state,delta);
}

function cleanForecast(f){
  return {
    slot:f.slot,
    verb:f.verb,
    chain:f.chain,
    cadence:f.cadence||null,
    span:f.span,
    power:f.power
  };
}

export function nativeForecastAperture(state){
  const forecasts=availableForecasts(state).map(cleanForecast).sort((a,b)=>a.slot-b.slot||a.verb.localeCompare(b.verb));
  return {
    target_type:state.targetType,
    anchors:[...(state.anchors||[])],
    creases:(state.creases||[]).map(e=>[...e]),
    charge:round(state.charge||0,3),
    call:state.call?{verb:state.call.verb,chain:state.call.chain,candidates:state.call.candidates}:null,
    forecasts
  };
}

export function nativeForecastSignature(state){
  return JSON.stringify(nativeForecastAperture(state));
}

function commitForecast(state,forecast){
  if(!forecast)return {state:cloneNative(state),event:null};
  const aligned=moveToSlot(state,forecast.slot);
  return release(aligned,{timing:'FREE',timingMultiplier:1});
}

export function candidateEpochWitness(start=createState(1)){
  const state=cloneNative(start);
  const options=availableForecasts(state).sort((a,b)=>a.slot-b.slot);
  if(options.length<2)return {
    schema:LIVE_STEP_ORDER_SCHEMA,
    authority:'EVIDENCE_ONLY',
    ok:false,
    reason:'NEED_TWO_NATIVE_FORECASTS'
  };
  const chosen=options[0],sibling=options[1],out=commitForecast(state,chosen);
  if(!out.event)return {
    schema:LIVE_STEP_ORDER_SCHEMA,
    authority:'EVIDENCE_ONLY',
    ok:false,
    reason:'FIRST_FORECAST_DID_NOT_RELEASE'
  };
  const stale=forecastAtSlot(out.state,sibling.slot);
  return {
    schema:LIVE_STEP_ORDER_SCHEMA,
    authority:'EVIDENCE_ONLY',
    ok:true,
    old_target_type:state.targetType,
    new_target_type:out.state.targetType,
    committed:{slot:chosen.slot,verb:chosen.verb,chain:chosen.chain},
    sibling_before:{slot:sibling.slot,verb:sibling.verb,chain:sibling.chain},
    sibling_after:stale?cleanForecast(stale):null,
    sibling_remains_supported:!!stale,
    aperture_invalidated:state.targetType!==out.state.targetType&&!stale,
    law:'availableForecasts() is a one-commit decision aperture: release() selects a new target family, so sibling forecasts from the old aperture are alternatives, not a sequential queue'
  };
}

export function resolveVerbIntent(state,verb){
  const wanted=upper(verb);
  const candidates=availableForecasts(state)
    .filter(x=>upper(x.verb)===wanted)
    .sort((a,b)=>a.slot-b.slot);
  const chosen=candidates[0]||null;
  return {
    verb:wanted,
    resolver:VERB_RESOLVER,
    candidate_count:candidates.length,
    ambiguity_bits:candidates.length>0?round(Math.log2(candidates.length)):null,
    chosen:chosen?cleanForecast(chosen):null
  };
}

export function executeVerbIntents(start,verbs=[]){
  let state=cloneNative(start);
  if(!state)return {ok:false,status:'INVALID_START',reason:'NATIVE_STATE_REQUIRED',steps:[]};
  const steps=[];
  for(const raw of verbs){
    const resolution=resolveVerbIntent(state,raw);
    if(!resolution.chosen){
      return {
        ok:true,
        status:'BLOCKED',
        reason:'VERB_UNSUPPORTED_AFTER_PREFIX',
        blocked_verb:resolution.verb,
        steps,
        final_aperture:nativeForecastAperture(state),
        final_signature:nativeForecastSignature(state)
      };
    }
    const before=nativeForecastAperture(state);
    const out=commitForecast(state,resolution.chosen);
    if(!out.event){
      return {
        ok:true,
        status:'BLOCKED',
        reason:'NATIVE_RELEASE_FAILED',
        blocked_verb:resolution.verb,
        steps,
        final_aperture:before,
        final_signature:JSON.stringify(before)
      };
    }
    state=out.state;
    steps.push({
      requested_verb:resolution.verb,
      resolver:resolution.resolver,
      candidate_count:resolution.candidate_count,
      ambiguity_bits:resolution.ambiguity_bits,
      chosen_slot:resolution.chosen.slot,
      observed_event:{
        verb:out.event.verb,
        cadence:out.event.cadence||null,
        chain:out.event.chain,
        slot:out.event.slot,
        power:out.event.power
      },
      target_after:state.targetType
    });
  }
  return {
    ok:true,
    status:'COMPLETE',
    reason:null,
    steps,
    final_aperture:nativeForecastAperture(state),
    final_signature:nativeForecastSignature(state)
  };
}

export function compareVerbIntentOrder(start,a,b){
  const A=upper(a),B=upper(b);
  const forward=executeVerbIntents(start,[A,B]);
  const reverse=executeVerbIntents(start,[B,A]);
  const bothDefined=forward.status==='COMPLETE'&&reverse.status==='COMPLETE';
  const sameFinal=bothDefined&&forward.final_signature===reverse.final_signature;
  const classification=!bothDefined
    ?'DOMAIN_DEPENDENT'
    :sameFinal
      ?'COMMUTES_ON_TESTED_APERTURE'
      :'NONCOMMUTING_ON_TESTED_APERTURE';
  return {
    schema:LIVE_STEP_ORDER_SCHEMA,
    authority:'EVIDENCE_ONLY',
    intents:[A,B],
    resolver:VERB_RESOLVER,
    classification,
    both_defined:bothDefined,
    same_final_aperture:sameFinal,
    forward,
    reverse,
    law:'verb intents are re-resolved against each new native forecast aperture; LOWEST_SLOT is an explicit research resolver, not a production policy'
  };
}

function advanceOne(state,round){
  const options=availableForecasts(state);
  if(!options.length)return state;
  const chosen=options[Math.abs(Number(round)||0)%options.length];
  const out=commitForecast(state,chosen);
  return out.event?out.state:state;
}

export function runLiveVerbCommutator({
  seeds=48,rounds=24,maxPairsPerState=6
}={}){
  let tested_pairs=0,both_defined_pairs=0,noncommuting_pairs=0,commuting_pairs=0,domain_dependent_pairs=0;
  let first_noncommuting=null,first_domain_dependent=null;
  for(let seed=1;seed<=seeds;seed++){
    let state=createState(seed);
    for(let round=0;round<rounds;round++){
      const verbs=[...new Set(availableForecasts(state).map(x=>x.verb))].sort();
      let pairBudget=maxPairsPerState;
      for(let i=0;i<verbs.length&&pairBudget>0;i++){
        for(let j=i+1;j<verbs.length&&pairBudget>0;j++){
          pairBudget--;tested_pairs++;
          const compared=compareVerbIntentOrder(state,verbs[i],verbs[j]);
          const record={
            seed,
            round,
            start_aperture:nativeForecastAperture(state),
            ...compared
          };
          if(compared.classification==='NONCOMMUTING_ON_TESTED_APERTURE'){
            both_defined_pairs++;noncommuting_pairs++;
            if(!first_noncommuting)first_noncommuting=record;
          }else if(compared.classification==='COMMUTES_ON_TESTED_APERTURE'){
            both_defined_pairs++;commuting_pairs++;
          }else{
            domain_dependent_pairs++;
            if(!first_domain_dependent)first_domain_dependent=record;
          }
        }
      }
      state=advanceOne(state,round);
    }
  }
  return {
    schema:LIVE_STEP_ORDER_SCHEMA+'/search',
    authority:'EVIDENCE_ONLY',
    resolver:VERB_RESOLVER,
    seeds,
    rounds,
    tested_pairs,
    both_defined_pairs,
    noncommuting_pairs,
    commuting_pairs,
    domain_dependent_pairs,
    first_noncommuting,
    first_domain_dependent,
    strongest_witness:first_noncommuting||first_domain_dependent,
    law:'order is tested only for re-resolved verb intents under the declared LOWEST_SLOT resolver; stale forecast siblings are not treated as sequential actions'
  };
}

const isCli=typeof process!=='undefined'&&process?.argv?.[1]&&import.meta.url===new URL(process.argv[1],'file://').href;
if(isCli){
  const epoch=candidateEpochWitness();
  const search=runLiveVerbCommutator();
  if(!epoch.ok||!epoch.aperture_invalidated)throw new Error('expected native forecast aperture to invalidate after one release');
  if(search.tested_pairs<1)throw new Error('expected at least one distinct-verb order test');
  if(!search.strongest_witness)throw new Error('expected an order/domain witness');
  console.log(JSON.stringify({status:'PASS',epoch,search},null,2));
}
