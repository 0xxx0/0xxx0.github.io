import {CONTROL_VERBS,exactFormCalculation} from '../convergence/change-calculus/kernel.mjs';

export const LIVE_CALCULUS_SCHEMA='fold-bloom-live-calculus/v0.1';

const round=(x,n=6)=>Number(Number(x).toFixed(n));
const log2=n=>n>0?round(Math.log2(n)):0;
const cleanVerb=x=>{
  const v=String(x||'').toUpperCase();
  return CONTROL_VERBS.includes(v)?v:null;
};

export function recentExactForm(history=[],slots=6){
  const verbs=(Array.isArray(history)?history:[])
    .filter(x=>x?.kind==='RELEASE')
    .map(x=>cleanVerb(x?.verb))
    .filter(Boolean)
    .slice(-Math.max(1,Math.trunc(Number(slots)||6)));
  const complete=verbs.length===slots;
  const calc=complete?exactFormCalculation(verbs,verbs):null;
  return {
    authority:'HISTORY_ONLY',
    slots,
    count:verbs.length,
    complete,
    verbs,
    exact_token:complete?'F['+verbs.join('|')+']':null,
    hex:calc?.ok?{
      token:calc.from.token,
      bits:[...(calc.from.bits||[])],
      lower:calc.from.lower||null,
      upper:calc.from.upper||null,
      exact_forms_per_hexagram:calc.metrics.exact_forms_per_hexagram,
      exact_space:calc.metrics.exact_state_count,
      quotient_space:calc.metrics.quotient_state_count,
      information_loss_bits:calc.metrics.quotient_information_loss_bits,
      control_sufficient:false,
      law:'recent six-release HEX is a descriptive history quotient; prior native sufficiency tests falsified it as a replacement for LIVE control state'
    }:null
  };
}

export function buildLiveCalculation({
  nativeContext=null,
  currentForecast=null,
  history=[],
  steering=null,
  traversal=null
}={}){
  const forecasts=Array.isArray(nativeContext?.forecasts)?nativeContext.forecasts:[];
  const byVerb=Object.fromEntries(CONTROL_VERBS.map(v=>[v,forecasts.filter(x=>x?.verb===v).length]));
  const recent=recentExactForm(history,6);
  const activeSteering=steering?.ok?steering:null;
  const candidateCount=Math.max(0,Number(activeSteering?.candidate_count)||0);
  const total=forecasts.length;
  const native={
    authority:nativeContext?.authority||'NATIVE_EVIDENCE',
    seq:Number(nativeContext?.seq)||0,
    gate:Number.isInteger(Number(nativeContext?.gate))?Number(nativeContext.gate):null,
    rotation:Number(nativeContext?.rotation)||0,
    target_type:Number.isInteger(Number(nativeContext?.targetType))?Number(nativeContext.targetType):null,
    charge:round(Number(nativeContext?.charge)||0,3),
    call:nativeContext?.call?{...nativeContext.call}:null,
    candidate_count:total,
    candidate_ambiguity_bits:log2(total),
    candidates_by_verb:byVerb,
    selected:currentForecast?{
      slot:Number(currentForecast.slot),
      verb:String(currentForecast.verb||''),
      chain:Number(currentForecast.chain)||1,
      cadence:currentForecast.cadence||null,
      power:Number(currentForecast.power)||0,
      path:[...(currentForecast.path||[])]
    }:null,
    law:'forecastContext is the native control aperture; history, HEX and model readouts may annotate it but never replace it'
  };
  const nearest=activeSteering?.candidates?.find?.(x=>Number(x.turn_steps)===Number(activeSteering.nearest_turn_steps))||null;
  const steeringWitness=activeSteering?{
    authority:'PREVIEW_ONLY',
    source:activeSteering.source||null,
    direction_ref:activeSteering.direction_ref||null,
    verb:activeSteering.verb||null,
    strength:Number(activeSteering.strength)||0,
    native_candidate_count:candidateCount,
    native_candidate_fraction:total?round(candidateCount/total):0,
    candidate_ambiguity_bits:activeSteering.candidate_ambiguity_bits??(candidateCount?log2(candidateCount):null),
    nearest_turn_steps:activeSteering.nearest_turn_steps??null,
    nearest_turn_delta:nearest?.turn_delta??null,
    nearest_turn_direction:nearest?.turn_direction??null,
    nearest_slots:[...(activeSteering.nearest_slots||[])],
    commit_operation:null,
    law:'steering support means overlap with already-lawful native forecasts; ghost turn paths show authored steps to support but never rotate or commit RELEASE'
  }:null;
  const t=traversal?{
    authority:'NAVIGATION_POLICY',
    mode:String(traversal.mode||'FLOW'),
    grain:String(traversal.grain||''),
    address:traversal.address||null,
    index:Number.isInteger(Number(traversal.index))?Number(traversal.index):null,
    count:Number.isInteger(Number(traversal.count))?Number(traversal.count):null,
    next_address:traversal.next_address||null,
    policy:traversal.policy||null,
    law:traversal.law||null
  }:null;
  return {
    schema:LIVE_CALCULUS_SCHEMA,
    authority:'WITNESS_ONLY',
    native,
    recent,
    steering:steeringWitness,
    traversal:t,
    formulas:{
      native_ambiguity:'log2(number of currently lawful native forecast candidates)',
      hex_compression:'4^6 exact six-verb histories → 2^6 HEX quotient; 64 exact forms per HEX; 6 uniform bits dropped',
      steering_support:'|native forecasts matching steering direction| / |all native forecasts|',
      release_step:'commit native LIVE operation first; if policy = RELEASE_THEN_ONE_ADDRESS, advance exactly one addressed grain afterward'
    },
    law:'one inspectable witness joins control, history quotient, model support and source traversal without moving authority between them'
  };
}

export function liveCalculationSummary(w){
  if(!w||w.schema!==LIVE_CALCULUS_SCHEMA)return 'CALC · UNAVAILABLE';
  const f=w.native?.selected;
  const native=f?('HERE '+f.verb+(f.chain>1?'×'+f.chain:'')):('SEEK · '+(w.native?.candidate_count||0)+' LAWFUL');
  const hex=w.recent?.hex?(' · '+w.recent.hex.token):(' · FORM '+(w.recent?.count||0)+'/6');
  const steer=w.steering?(' · LENS '+w.steering.verb+' '+w.steering.native_candidate_count+'/'+(w.native?.candidate_count||0)+(w.steering.nearest_turn_steps!=null?' '+(w.steering.nearest_turn_direction||'HERE')+'×'+w.steering.nearest_turn_steps:'')):'';
  const t=w.traversal;
  const step=t?(' · '+(t.mode==='RELEASE_STEP'?'RELEASE→STEP':t.mode)+' '+t.grain+(t.index!=null&&t.count?(' '+(t.index+1)+'/'+t.count):'')):'';
  return 'CALC · '+native+hex+steer+step;
}
