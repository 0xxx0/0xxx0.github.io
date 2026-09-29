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


function cleanStructuralForecast(o){
  return {
    slot:o.slot,type:o.type,verb:o.verb,chain:o.chain,
    path:[...(o.path||[])],
    edgeAdded:o.edgeAdded?[...o.edgeAdded]:null,
    span:o.span
  };
}
function cleanFullForecast(o){
  return {...cleanStructuralForecast(o),cadence:o.cadence||null,power:o.power};
}
function signature(xs,cleaner){
  return JSON.stringify((xs||[]).map(cleaner).sort((a,b)=>a.slot-b.slot||a.verb.localeCompare(b.verb)));
}

export function liveForecastFactor(state,{includeCharge=true}={}){
  return {
    schema:LIVE_SUFFICIENCY_SCHEMA+'/forecast-factor',
    authority:'NATIVE_DEPENDENCY_WITNESS',
    cell_types:(state?.cells||[]).map(c=>c.type),
    target_type:state?.targetType,
    anchors:[...(state?.anchors||[])],
    creases:(state?.creases||[]).map(e=>[...e]),
    ...(includeCharge?{charge:Number(state?.charge)||0}:{})
  };
}

function stateFromForecastFactor(factor,{charge=0}={}){
  return {
    cells:(factor?.cell_types||[]).map(type=>({type})),
    targetType:factor?.target_type,
    anchors:[...(factor?.anchors||[])],
    creases:(factor?.creases||[]).map(e=>[...e]),
    charge:Number(factor?.charge??charge)||0
  };
}

export function runLiveForecastFactorization({seeds=96,rounds=24}={}){
  let samples=0,topologyMismatch=null,fullMismatch=null,chargeResidueWitness=null;
  for(let seed=1;seed<=seeds;seed++){
    let state=createState(seed);
    for(let round=0;round<rounds;round++){
      state=step(state,round);
      const native=availableForecasts(state);
      const topologyFactor=liveForecastFactor(state,{includeCharge:false});
      const fullFactor=liveForecastFactor(state,{includeCharge:true});
      const topologyForecasts=availableForecasts(stateFromForecastFactor(topologyFactor,{charge:0}));
      const fullForecasts=availableForecasts(stateFromForecastFactor(fullFactor));
      samples++;
      const nativeStructural=signature(native,cleanStructuralForecast);
      const factorStructural=signature(topologyForecasts,cleanStructuralForecast);
      const nativeFull=signature(native,cleanFullForecast);
      const factorFull=signature(fullForecasts,cleanFullForecast);
      const chargeFreeFull=signature(topologyForecasts,cleanFullForecast);
      if(!topologyMismatch&&nativeStructural!==factorStructural){
        topologyMismatch={seed,round:round+1,factor:topologyFactor,native:nativeStructural,reconstructed:factorStructural};
      }
      if(!fullMismatch&&nativeFull!==factorFull){
        fullMismatch={seed,round:round+1,factor:fullFactor,native:nativeFull,reconstructed:factorFull};
      }
      if(!chargeResidueWitness&&nativeFull!==chargeFreeFull){
        chargeResidueWitness={seed,round:round+1,charge:Number(state.charge)||0,native:nativeFull,without_charge:chargeFreeFull};
      }
    }
  }
  return {
    schema:LIVE_SUFFICIENCY_SCHEMA+'/forecast-factorization',
    authority:'EVIDENCE_ONLY',
    samples,
    property:{
      structural:'availableForecasts(): slot + type + verb + chain + path + edgeAdded + span',
      full:'structural forecast + cadence + power'
    },
    topology_factor:{
      fields:['cell_types','target_type','anchors','creases'],
      reproduces_structural_forecasts:!topologyMismatch,
      first_mismatch:topologyMismatch
    },
    full_factor:{
      fields:['cell_types','target_type','anchors','creases','charge'],
      reproduces_full_forecasts:!fullMismatch,
      first_mismatch:fullMismatch
    },
    charge_residue:{
      affects_full_forecast:!!chargeResidueWitness,
      first_witness:chargeResidueWitness
    },
    excluded_from_claim:[
      'rotation / current gate alignment',
      'call selection and historical counters',
      'release mutation after commit',
      'audio / source timing / presentation',
      'minimality of the factor'
    ],
    law:'for the current LIVE engine, topology fields are sufficient to reconstruct the structural availableForecasts aperture and charge is additional residue for cadence/power; this is a bounded native dependency witness, not a claim that the factor is minimal or sufficient for all LIVE behavior'
  };
}

if(import.meta.url===new URL(process.argv[1], 'file://').href){
  const out=runLiveMacrostateSufficiency();
  const factor=runLiveForecastFactorization();
  assert.ok(out.samples>100,'expected substantial native LIVE sample set');
  assert.ok(out.hexCounterexample,'expected same hex quotient with unequal native futures');
  assert.equal(out.hexControlSufficient,false);
  assert.ok(factor.samples>100,'expected substantial forecast factorization sample set');
  assert.equal(factor.topology_factor.reproduces_structural_forecasts,true);
  assert.equal(factor.full_factor.reproduces_full_forecasts,true);
  assert.equal(factor.charge_residue.affects_full_forecast,true);
  console.log(JSON.stringify({macrostate:out,factorization:factor},null,2));
}
