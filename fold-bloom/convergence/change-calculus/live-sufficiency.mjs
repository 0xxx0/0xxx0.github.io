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
      const record={
        seed,round:round+1,seq:state.seq,exact,hex,form:[...form],signature,
        behavior:behaviorSummary(state),
        forecast_factor:liveForecastFactor(state,{includeCharge:true}),
        native_forecasts:availableForecasts(state).map(cleanFullForecast).sort((a,b)=>a.slot-b.slot||a.verb.localeCompare(b.verb))
      };
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

const equalJson=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const factorFields=Object.freeze(['cell_types','target_type','anchors','creases','charge']);

export function explainControlLossCounterexample(counterexample){
  const a=counterexample?.a,b=counterexample?.b,macrostate=String(counterexample?.macrostate||'');
  if(!a||!b||!macrostate)return {ok:false,schema:LIVE_SUFFICIENCY_SCHEMA+'/control-loss-witness',reason:'COUNTEREXAMPLE_REQUIRED'};
  if(a.hex!==macrostate||b.hex!==macrostate)return {ok:false,schema:LIVE_SUFFICIENCY_SCHEMA+'/control-loss-witness',reason:'SAME_PROJECTION_REQUIRED'};
  const fa=a.forecast_factor,fb=b.forecast_factor;
  if(!fa||!fb)return {ok:false,schema:LIVE_SUFFICIENCY_SCHEMA+'/control-loss-witness',reason:'FORECAST_FACTOR_REQUIRED'};
  const factorDelta=factorFields.filter(field=>!equalJson(fa[field],fb[field])).map(field=>({
    field,a:fa[field]??null,b:fb[field]??null
  }));
  const aForecasts=Array.isArray(a.native_forecasts)?a.native_forecasts:[],bForecasts=Array.isArray(b.native_forecasts)?b.native_forecasts:[];
  const byA=new Map(aForecasts.map(x=>[Number(x.slot),x])),byB=new Map(bForecasts.map(x=>[Number(x.slot),x]));
  const slots=[...new Set([...byA.keys(),...byB.keys()])].sort((x,y)=>x-y);
  const onlyA=slots.filter(slot=>byA.has(slot)&&!byB.has(slot));
  const onlyB=slots.filter(slot=>byB.has(slot)&&!byA.has(slot));
  const sharedChanged=slots.filter(slot=>byA.has(slot)&&byB.has(slot)&&!equalJson(byA.get(slot),byB.get(slot)));
  return {
    ok:true,
    schema:LIVE_SUFFICIENCY_SCHEMA+'/control-loss-witness',
    authority:'EVIDENCE_ONLY',
    projection:{kind:'HEX_HISTORY_QUOTIENT',token:macrostate,same:true},
    property:'NEXT_LAWFUL_FORECAST_SET + CALL + TARGET_TYPE',
    a:{
      seed:a.seed,round:a.round,seq:a.seq,exact:a.exact,form:[...(a.form||[])],
      behavior:a.behavior,forecast_factor:fa,native_forecasts:aForecasts
    },
    b:{
      seed:b.seed,round:b.round,seq:b.seq,exact:b.exact,form:[...(b.form||[])],
      behavior:b.behavior,forecast_factor:fb,native_forecasts:bForecasts
    },
    native_equal:a.signature===b.signature,
    factor_delta:factorDelta,
    aperture_delta:{
      a_candidate_count:aForecasts.length,
      b_candidate_count:bForecasts.length,
      only_a_slots:onlyA,
      only_b_slots:onlyB,
      shared_changed_slots:sharedChanged
    },
    residue:{
      keeps:'same six-bit HEX history projection '+macrostate,
      drops:'exact recent verb identity and native forecast-factor detail needed to distinguish these lawful NEXT apertures'
    },
    law:'same projected history plus unequal lawful native NEXT proves projection loss for this named control property; the witness explains the dropped native factor without promoting the projection to effect authority'
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

const isCli=typeof process!=='undefined'&&process?.argv?.[1]&&import.meta.url===new URL(process.argv[1], 'file://').href;
if(isCli){
  const out=runLiveMacrostateSufficiency();
  const factor=runLiveForecastFactorization();
  if(!(out.samples>100))throw new Error('expected substantial native LIVE sample set');
  if(!out.hexCounterexample)throw new Error('expected same hex quotient with unequal native futures');
  if(out.hexControlSufficient!==false)throw new Error('expected HEX control sufficiency falsification');
  if(!(factor.samples>100))throw new Error('expected substantial forecast factorization sample set');
  if(!factor.topology_factor.reproduces_structural_forecasts)throw new Error('topology factor failed structural forecast reconstruction');
  if(!factor.full_factor.reproduces_full_forecasts)throw new Error('full factor failed full forecast reconstruction');
  if(!factor.charge_residue.affects_full_forecast)throw new Error('expected charge residue witness');
  const controlLoss=explainControlLossCounterexample(out.hexCounterexample);
  if(!controlLoss.ok)throw new Error('expected explainable HEX control-loss counterexample');
  if(controlLoss.projection.same!==true||controlLoss.native_equal!==false)throw new Error('expected same projection with unequal native aperture');
  if(!controlLoss.factor_delta.length)throw new Error('expected at least one differing native factor field');
  console.log(JSON.stringify({macrostate:out,factorization:factor,controlLoss},null,2));
}
