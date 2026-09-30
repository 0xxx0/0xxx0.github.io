import {readCell} from './kernel.mjs';

export const STEERING_CALC_SCHEMA='fold-bloom-steering-calculation/v0.1';
export const DEFAULT_CONTROL_VOCABULARY=Object.freeze({
  BLOOM:'BLOOM',FOLD:'FOLD',SPLIT:'SPLIT',RETURN:'RETURN'
});

const finite=x=>Number.isFinite(Number(x));
const upper=x=>String(x??'').trim().toUpperCase();
const round=(x,n=6)=>Number(Number(x).toFixed(n));

export function conditionalTopKWeights(top=[]){
  const xs=Array.isArray(top)?top:[];
  const hasLogits=xs.length>0&&xs.every(x=>finite(x?.logit));
  if(!hasLogits)return xs.map(x=>({...x,conditional_weight:null}));
  const max=Math.max(...xs.map(x=>Number(x.logit)));
  const raw=xs.map(x=>Math.exp(Number(x.logit)-max));
  const z=raw.reduce((a,b)=>a+b,0)||1;
  return xs.map((x,i)=>({...x,conditional_weight:round(raw[i]/z)}));
}

export function directionSupportCalculation(direction,nativeForecasts=[],vocabulary=DEFAULT_CONTROL_VOCABULARY){
  const directionLabel=upper(direction),forecasts=Array.isArray(nativeForecasts)?nativeForecasts:[];
  if(!directionLabel)return {ok:false,schema:STEERING_CALC_SCHEMA+'/direction-support',authority:'CALCULATION_ONLY',reason:'DIRECTION_REQUIRED'};
  const mappedVerb=vocabulary[directionLabel]||null;
  const candidates=mappedVerb?forecasts.filter(x=>upper(x?.verb)===mappedVerb):[];
  const count=candidates.length;
  return {
    ok:true,
    schema:STEERING_CALC_SCHEMA+'/direction-support',
    authority:'CALCULATION_ONLY',
    direction_label:directionLabel,
    mapped_verb:mappedVerb,
    native_candidate_count:count,
    candidate_ambiguity_bits:count>0?round(Math.log2(count)):null,
    candidate_slots:candidates.map(x=>Number(x?.slot)).filter(Number.isFinite),
    candidates:candidates.map(x=>({
      slot:Number.isFinite(Number(x?.slot))?Number(x.slot):null,
      verb:upper(x?.verb),
      chain:Number(x?.chain)||1,
      cadence:x?.cadence?upper(x.cadence):null,
      power:finite(x?.power)?Number(x.power):null,
      path:Array.isArray(x?.path)?x.path.map(Number):[]
    })),
    status:!mappedVerb?'OUTSIDE_CONTROL_VOCABULARY':count===0?'NO_NATIVE_CANDIDATE':count===1?'UNIQUE_NATIVE_CANDIDATE':'MULTIPLE_NATIVE_CANDIDATES',
    formulas:{
      host_support:'C(direction,s) = {f in nativeForecasts(s) | verb(f) = vocabulary(direction)}',
      candidate_ambiguity:'a = log2(|C|) when |C| > 0',
      decision:'C narrows the current lawful host aperture; it never commits an operation'
    },
    law:'direction support is a calculation over an already-lawful native forecast aperture; model/readout authority never becomes host effect authority'
  };
}

export function steeringSupportCalculation(trace,target,nativeForecasts=[],vocabulary=DEFAULT_CONTROL_VOCABULARY){
  const cell=readCell(trace,target);
  if(!cell)return {ok:false,reason:'JLENS_CELL_UNRESOLVED'};
  const forecasts=Array.isArray(nativeForecasts)?nativeForecasts:[];
  const weighted=conditionalTopKWeights(cell.top);
  const rows=weighted.map((token,i)=>{
    const normalized=upper(token.token),verb=vocabulary[normalized]||null;
    const candidates=verb?forecasts.filter(x=>String(x?.verb||'').toUpperCase()===verb):[];
    return {
      rank:Number.isInteger(token.rank)?token.rank:i+1,
      token_id:token.token_id,
      token:token.token,
      logit:finite(token.logit)?Number(token.logit):null,
      conditional_weight:token.conditional_weight,
      mapped_verb:verb,
      native_candidate_count:candidates.length,
      support:!verb?'OUTSIDE_CONTROL_VOCABULARY':candidates.length?'NATIVE_SUPPORT':'NO_NATIVE_CANDIDATE',
      candidate_slots:candidates.map(x=>x.slot).filter(Number.isFinite)
    };
  });
  const weightBasis=rows.every(x=>x.conditional_weight!==null)?'TOP_K_CONDITIONAL':'RANK_ONLY';
  const sumWeight=pred=>weightBasis==='TOP_K_CONDITIONAL'
    ?round(rows.filter(pred).reduce((s,x)=>s+Number(x.conditional_weight||0),0))
    :null;
  const top=rows[0]||null;
  return {
    ok:true,
    schema:STEERING_CALC_SCHEMA,
    authority:'CALCULATION_ONLY',
    cell_ref:cell.ref,
    weight_basis:weightBasis,
    formulas:{
      conditional_weight:'w_i = exp(logit_i - max(logit_topk)) / Σ_topk exp(logit_j - max(logit_topk))',
      warning:'TOP_K_CONDITIONAL renormalizes only exported top-k tokens; it is not full-vocabulary model probability',
      host_support:'host support = mapped control verb AND at least one already-lawful native forecast',
      decision:'support narrows candidates; it never commits a native operation',
      candidate_ambiguity:'a = log2(|C|) for the top mapped verb when |C| > 0'
    },
    rows,
    mapped_weight:sumWeight(x=>!!x.mapped_verb),
    host_supported_weight:sumWeight(x=>x.native_candidate_count>0),
    top:{
      token:top?.token??null,
      mapped_verb:top?.mapped_verb??null,
      native_candidate_count:top?.native_candidate_count??0,
      candidate_ambiguity_bits:(top?.native_candidate_count??0)>0?round(Math.log2(top.native_candidate_count)):null,
      status:!top?'EMPTY':!top.mapped_verb?'UNMAPPED':top.native_candidate_count===0?'UNSUPPORTED':top.native_candidate_count===1?'UNIQUE_NATIVE_CANDIDATE':'MULTIPLE_NATIVE_CANDIDATES'
    },
    residue:{
      outside_vocabulary:rows.filter(x=>!x.mapped_verb).map(x=>({rank:x.rank,token:x.token})),
      mapped_without_native_support:rows.filter(x=>x.mapped_verb&&x.native_candidate_count===0).map(x=>({rank:x.rank,token:x.token,verb:x.mapped_verb}))
    }
  };
}
