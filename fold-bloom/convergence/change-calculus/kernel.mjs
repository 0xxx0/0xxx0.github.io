import {stateChange,formatState} from '../../state-language.js';
import {
  EXACT_FORM_STATES,HEXAGRAM_STATES,EXACT_FORMS_PER_HEXAGRAM,
  hexProjection,hexChangeProjection
} from '../../live/hex-projection.js';
import {steeringSupportCalculation} from '../jspace-steering/steering-calculus.mjs';
import {evaluateSteeringPromotion,CURRENT_EVIDENCE_2026_09_27} from '../jspace-steering/promotion-gate.mjs';

export const CHANGE_CALCULUS_SCHEMA='fold-bloom-change-calculus/v0.1';
export const CONTROL_VERBS=Object.freeze(['BLOOM','FOLD','SPLIT','RETURN']);

const round=(x,n=6)=>Number(Number(x).toFixed(n));
const factorial=n=>{let x=1;for(let i=2;i<=Math.max(0,Math.trunc(Number(n)||0));i++)x*=i;return x};
const addressedLines=lines=>{
  const xs=Array.isArray(lines)?lines.map(Number):[];
  return xs.every(x=>Number.isInteger(x)&&x>=1&&x<=6)&&new Set(xs).size===xs.length?xs:null;
};

export function stepOrderAt(lines,index=0){
  const canonical=addressedLines(lines);
  if(!canonical)return {ok:false,schema:CHANGE_CALCULUS_SCHEMA+'/step-order',reason:'UNIQUE_ADDRESSED_LINES_REQUIRED'};
  const count=factorial(canonical.length),raw=Math.trunc(Number(index)||0),selected=((raw%count)+count)%count;
  let residue=selected;
  const pool=[...canonical],order=[];
  while(pool.length){
    const block=factorial(pool.length-1),digit=Math.floor(residue/block);
    residue%=block;
    order.push(pool.splice(digit,1)[0]);
  }
  return {
    ok:true,
    schema:CHANGE_CALCULUS_SCHEMA+'/step-order',
    authority:'CALCULATION_ONLY',
    canonical:[...canonical],
    index:selected,
    count,
    order,
    address:'order://'+selected+'-of-'+count,
    law:'factoradic indexing gives every permutation one stable integer address without materializing the full path set'
  };
}

export function stepOrderRank(lines,order){
  const canonical=addressedLines(lines),requested=addressedLines(order);
  if(!canonical||!requested||requested.length!==canonical.length||requested.some(x=>!canonical.includes(x))){
    return {ok:false,schema:CHANGE_CALCULUS_SCHEMA+'/step-order',reason:'ORDER_MUST_PERMUTE_ADDRESSED_LINES'};
  }
  const pool=[...canonical];
  let index=0;
  for(const line of requested){
    const digit=pool.indexOf(line);
    if(digit<0)return {ok:false,schema:CHANGE_CALCULUS_SCHEMA+'/step-order',reason:'ORDER_MUST_PERMUTE_ADDRESSED_LINES'};
    index+=digit*factorial(pool.length-1);
    pool.splice(digit,1);
  }
  return {
    ok:true,
    schema:CHANGE_CALCULUS_SCHEMA+'/step-order',
    authority:'CALCULATION_ONLY',
    canonical:[...canonical],
    index,
    count:factorial(canonical.length),
    order:[...requested],
    address:'order://'+index+'-of-'+factorial(canonical.length),
    law:'Lehmer rank is the inverse of factoradic step-order indexing for the declared canonical line order'
  };
}
const bitString=bits=>Array.isArray(bits)?bits.join(''):null;
const formOk=form=>Array.isArray(form)&&form.length===6&&form.every(x=>CONTROL_VERBS.includes(String(x||'').toUpperCase()));
const upperForm=form=>form.map(x=>String(x).toUpperCase());

export function lineTransitionValue(fromBit,toBit){
  const a=Number(fromBit),b=Number(toBit);
  if((a!==0&&a!==1)||(b!==0&&b!==1))return null;
  if(a===0&&b===0)return 8; // young yin: stable
  if(a===1&&b===1)return 7; // young yang: stable
  if(a===0&&b===1)return 6; // old yin: changes to yang
  return 9;                 // old yang: changes to yin
}

export function transparentStateCalculation(from,to){
  const change=stateChange(from,to);
  if(!change.valid)return {ok:false,schema:CHANGE_CALCULUS_SCHEMA,reason:'SIX_BIT_STATES_REQUIRED'};
  const moving=new Set(change.moving);
  const lines=change.from.bits.map((bit,i)=>{
    const toBit=change.to.bits[i],changed=moving.has(i+1);
    return {
      line:i+1,
      from_bit:bit,
      to_bit:toBit,
      changed,
      transition:String(bit)+'→'+String(toBit),
      iching_line_value:lineTransitionValue(bit,toBit),
      trigram:i<3?'LOWER':'UPPER'
    };
  });
  const k=change.moving.length,orders=factorial(k);
  return {
    ok:true,
    schema:CHANGE_CALCULUS_SCHEMA,
    authority:'CALCULATION_ONLY',
    from:{token:change.from.token,bits:[...change.from.bits],binary:bitString(change.from.bits),lower:change.from.lower,upper:change.from.upper},
    to:{token:change.to.token,bits:[...change.to.bits],binary:bitString(change.to.bits),lower:change.to.lower,upper:change.to.upper},
    moving:[...change.moving],
    mask:change.mask,
    lines,
    metrics:{
      hamming_distance:k,
      normalized_hamming:round(k/6),
      stable_lines:6-k,
      lower_moving:change.moving.filter(x=>x<=3).length,
      upper_moving:change.moving.filter(x=>x>=4).length,
      one_line_step_orders:orders,
      step_order_ambiguity_bits:orders>0?round(Math.log2(orders)):0
    },
    iching_projection:{
      kind:'STATE_TRANSITION_PROJECTION_NOT_CAST',
      line_values:lines.map(x=>x.iching_line_value),
      law:'6/9 encode changing yin/yang and 7/8 stable yang/yin; these values are derived from supplied endpoints, not randomly cast'
    },
    formulas:{
      distance:'d_H = Σ_i [from_i ≠ to_i]',
      normalized_distance:'d_H / 6',
      one_line_step_orders:'k! where k = d_H; endpoints + moving-set do not determine an order',
      line_value:'0→0:8, 1→1:7, 0→1:6, 1→0:9'
    }
  };
}

export function steppedStatePath(from,to,order=null){
  const calc=transparentStateCalculation(from,to);
  if(!calc.ok)return {ok:false,schema:CHANGE_CALCULUS_SCHEMA,reason:calc.reason};
  const changed=[...calc.moving];
  const requested=Array.isArray(order)?order.map(Number):changed;
  if(requested.length!==changed.length||new Set(requested).size!==changed.length||requested.some(x=>!changed.includes(x))){
    return {ok:false,schema:CHANGE_CALCULUS_SCHEMA,reason:'STEP_ORDER_MUST_PERMUTE_MOVING_LINES',changed};
  }
  const ranked=stepOrderRank(changed,requested);
  const orders=factorial(changed.length);
  const pathAddress='change://state/'+calc.from.binary+'→'+calc.to.binary+'/order/'+ranked.index+'-of-'+orders;
  let current=[...calc.from.bits];
  const steps=requested.map((line,step)=>{
    const i=line-1,before=[...current],fromBit=before[i],toBit=calc.to.bits[i];
    current[i]=toBit;
    const after=[...current],transition=stateChange(before,after);
    return {
      step:step+1,
      address:pathAddress+'/step/'+(step+1),
      line,
      from_bit:fromBit,
      to_bit:toBit,
      iching_line_value:lineTransitionValue(fromBit,toBit),
      before_token:transition.from.token,
      after_token:transition.to.token,
      before_binary:bitString(before),
      after_binary:bitString(after),
      lower_after:transition.to.lower,
      upper_after:transition.to.upper
    };
  });
  return {
    ok:true,
    schema:CHANGE_CALCULUS_SCHEMA+'/state-step',
    authority:'CALCULATION_ONLY',
    from_token:calc.from.token,
    to_token:calc.to.token,
    changed_lines:changed,
    selected_order:requested,
    selected_order_index:ranked.index,
    selected_order_address:ranked.address,
    path_address:pathAddress,
    possible_one_line_orders:orders,
    order_ambiguity_bits:orders>0?round(Math.log2(orders)):0,
    steps,
    final_bits:[...current],
    final_token:'H['+formatState(current)+']',
    final_matches_target:current.every((x,i)=>x===calc.to.bits[i]),
    law:'STEP orders one addressed moving line at a time; identical endpoints do not imply identical intermediate states or consequences'
  };
}

export function exactFormCalculation(fromForm,toForm=fromForm){
  if(!formOk(fromForm)||!formOk(toForm))return {ok:false,schema:CHANGE_CALCULUS_SCHEMA,reason:'SIX_EXACT_CONTROL_VERBS_REQUIRED'};
  const a=upperForm(fromForm),b=upperForm(toForm),from=hexProjection(a),to=hexProjection(b),change=hexChangeProjection(a,b);
  const lines=a.map((verb,i)=>{
    const toVerb=b[i],fromLine=from.lines[i],toLine=to.lines[i];
    const exactChanged=verb!==toVerb,quotientChanged=fromLine.bit!==toLine.bit;
    return {
      line:i+1,
      from_verb:verb,
      to_verb:toVerb,
      from_bit:fromLine.bit,
      to_bit:toLine.bit,
      exact_changed:exactChanged,
      quotient_changed:quotientChanged,
      invisible_exact_change:exactChanged&&!quotientChanged
    };
  });
  const exactChanged=lines.filter(x=>x.exact_changed).length,quotientChanged=lines.filter(x=>x.quotient_changed).length,invisible=lines.filter(x=>x.invisible_exact_change).length;
  return {
    ok:true,
    schema:CHANGE_CALCULUS_SCHEMA,
    authority:'CALCULATION_ONLY',
    from,
    to,
    change,
    lines,
    metrics:{
      exact_changed_lines:exactChanged,
      quotient_changed_lines:quotientChanged,
      quotient_invisible_exact_changes:invisible,
      exact_state_count:EXACT_FORM_STATES,
      quotient_state_count:HEXAGRAM_STATES,
      exact_forms_per_hexagram:EXACT_FORMS_PER_HEXAGRAM,
      exact_uniform_information_bits:round(Math.log2(EXACT_FORM_STATES)),
      quotient_uniform_information_bits:round(Math.log2(HEXAGRAM_STATES)),
      quotient_information_loss_bits:round(Math.log2(EXACT_FORMS_PER_HEXAGRAM))
    },
    formulas:{
      exact_space:'4^6 = '+EXACT_FORM_STATES+' six-verb forms',
      quotient_space:'2^6 = '+HEXAGRAM_STATES+' binary states',
      fiber:'(4/2)^6 = '+EXACT_FORMS_PER_HEXAGRAM+' exact forms per hexagram under the relation-polarity quotient',
      warning:'the quotient is descriptive compression; it is not automatically sufficient for control'
    }
  };
}

export function steppedFormPath(fromForm,toForm,order=null){
  if(!formOk(fromForm)||!formOk(toForm))return {ok:false,schema:CHANGE_CALCULUS_SCHEMA,reason:'SIX_EXACT_CONTROL_VERBS_REQUIRED'};
  const a=upperForm(fromForm),target=upperForm(toForm),changed=a.map((x,i)=>x===target[i]?null:i+1).filter(Boolean);
  const requested=Array.isArray(order)?order.map(Number):changed;
  if(requested.length!==changed.length||new Set(requested).size!==changed.length||requested.some(x=>!changed.includes(x))){
    return {ok:false,schema:CHANGE_CALCULUS_SCHEMA,reason:'STEP_ORDER_MUST_PERMUTE_CHANGED_LINES',changed};
  }
  const ranked=stepOrderRank(changed,requested);
  const orders=factorial(changed.length);
  const pathAddress='change://form/'+hexProjection(a).token+'→'+hexProjection(target).token+'/order/'+ranked.index+'-of-'+orders;
  let current=[...a];
  const steps=requested.map((line,step)=>{
    const i=line-1,before=[...current],beforeProjection=hexProjection(before);
    current[i]=target[i];
    const after=[...current],afterProjection=hexProjection(after);
    return {
      step:step+1,
      address:pathAddress+'/step/'+(step+1),
      line,
      from_verb:before[i],
      to_verb:after[i],
      before_token:beforeProjection.token,
      after_token:afterProjection.token,
      quotient_changed:beforeProjection.token!==afterProjection.token,
      exact_form:[...after]
    };
  });
  return {
    ok:true,
    schema:CHANGE_CALCULUS_SCHEMA,
    authority:'CALCULATION_ONLY',
    changed_lines:changed,
    selected_order:requested,
    selected_order_index:ranked.index,
    selected_order_address:ranked.address,
    path_address:pathAddress,
    possible_one_edit_orders:orders,
    order_ambiguity_bits:orders>0?round(Math.log2(orders)):0,
    steps,
    final_exact_form:[...current],
    final_matches_target:current.every((x,i)=>x===target[i]),
    law:'STEP makes one addressed exact edit at a time; endpoint equivalence does not make intermediate paths equivalent'
  };
}

export function residueLadder({state=null,stateStep=null,exact=null,steering=null,promotion=null}={}){
  const levels=[];
  if(exact?.ok){
    levels.push({
      id:'EXACT_FORM',
      claim:'EXACT_OPERATION_DESCRIPTION',
      authority:'CALCULATION_ONLY',
      keeps:'six addressed BLOOM/FOLD/SPLIT/RETURN operations',
      drops:'nothing inside the declared six-verb form',
      cardinality:exact.metrics.exact_state_count,
      information_bits:exact.metrics.exact_uniform_information_bits,
      residue_count:0
    });
  }
  if(state?.ok){
    levels.push({
      id:'HEX_STATE',
      claim:'DESCRIPTIVE_QUOTIENT',
      authority:'CALCULATION_ONLY',
      keeps:'six relation-polarity bits plus trigram/hex address',
      drops:exact?.ok
        ?exact.metrics.quotient_information_loss_bits+' uniform bits; '+exact.metrics.quotient_invisible_exact_changes+' exact changed line(s) are invisible in this endpoint pair'
        :'exact BLOOM/FOLD and SPLIT/RETURN identity lies outside the six-bit quotient',
      cardinality:HEXAGRAM_STATES,
      information_bits:6,
      compression_ratio:exact?.ok?exact.metrics.exact_forms_per_hexagram:null
    });
    levels.push({
      id:'MOVING_SET',
      claim:'ENDPOINT_CHANGE_MASK',
      authority:'CALCULATION_ONLY',
      keeps:state.metrics.hamming_distance+' addressed moving line(s)',
      drops:state.metrics.one_line_step_orders>1
        ?state.metrics.one_line_step_orders+' possible one-line orders collapse to one unordered set'
        :'no order ambiguity for this endpoint pair',
      alternatives:state.metrics.one_line_step_orders,
      ambiguity_bits:state.metrics.step_order_ambiguity_bits
    });
  }
  if(stateStep?.ok){
    levels.push({
      id:'ORDERED_PATH',
      claim:'SELECTED_PATH_WITNESS',
      authority:'CALCULATION_ONLY',
      keeps:'factoradic order '+(stateStep.selected_order_index+1)+'/'+stateStep.possible_one_line_orders+' and '+stateStep.steps.length+' addressed intermediate step(s)',
      drops:'native host consequences are not encoded by this abstract bit path',
      address:stateStep.path_address
    });
  }
  if(steering?.ok){
    const supported=steering.rows.filter(x=>x.native_candidate_count>0);
    levels.push({
      id:'MODEL_READOUT',
      claim:'READOUT_ONLY',
      authority:'CALCULATION_ONLY',
      keeps:steering.rows.length+' exported top-k token row(s)',
      drops:steering.weight_basis==='TOP_K_CONDITIONAL'
        ?'unexported vocabulary mass; conditional weights are normalized only inside exported top-k'
        :'unexported vocabulary mass and calibrated probability',
      mapped_weight:steering.mapped_weight,
      host_supported_weight:steering.host_supported_weight
    });
    levels.push({
      id:'HOST_SUPPORT',
      claim:'SUPPORT_NOT_PERMISSION',
      authority:'PREVIEW_ONLY',
      keeps:supported.length+' model row(s) with at least one already-lawful native candidate',
      drops:'candidate support expires with the native forecast aperture and grants no execution authority',
      native_candidate_count:supported.reduce((n,x)=>n+x.native_candidate_count,0),
      top_candidate_ambiguity_bits:steering.top.candidate_ambiguity_bits
    });
  }
  if(promotion){
    const passed=promotion.summary?.passed??0,total=promotion.summary?.total??0,failed=promotion.summary?.failed??Math.max(0,total-passed);
    levels.push({
      id:'CAUSAL_GATE',
      claim:promotion.status||'UNKNOWN',
      authority:'EVIDENCE_GATE',
      keeps:passed+'/'+total+' explicit promotion obligation(s) passed',
      drops:'no effect authority is granted here; even eligibility means bounded preview, not automatic commit',
      failed_obligations:failed
    });
  }
  const strongest_claim=promotion?.eligible
    ?'ELIGIBLE_FOR_BOUNDED_PREVIEW'
    :steering?.ok&&steering.rows.some(x=>x.native_candidate_count>0)
      ?'READ_SUPPORT_ONLY'
      :stateStep?.ok
        ?'ORDERED_PATH_WITNESS'
        :state?.ok
          ?'DESCRIPTIVE_CHANGE_ONLY'
          :'UNRESOLVED';
  return {
    schema:CHANGE_CALCULUS_SCHEMA+'/residue-ladder',
    authority:'RESEARCH_WITNESS_ONLY',
    strongest_claim,
    levels,
    law:'each projection may compress representation or narrow support; no layer inherits control or causal authority from the one before it'
  };
}

export function appliedResearchFrame(spec={}){
  const state=transparentStateCalculation(spec.fromState,spec.toState);
  const stateStep=state?.ok?steppedStatePath(spec.fromState,spec.toState,spec.stateStepOrder):null;
  const exact=spec.fromForm&&spec.toForm?exactFormCalculation(spec.fromForm,spec.toForm):null;
  const step=spec.fromForm&&spec.toForm?steppedFormPath(spec.fromForm,spec.toForm,spec.stepOrder):null;
  const steering=spec.trace&&spec.target
    ?steeringSupportCalculation(spec.trace,spec.target,spec.nativeForecasts||[],spec.vocabulary)
    :null;
  const promotionEvidence=spec.promotionEvidence||CURRENT_EVIDENCE_2026_09_27;
  const promotion=evaluateSteeringPromotion(promotionEvidence);
  const alignment=state?.ok&&exact?.ok?{
    from_matches:state.from.binary===exact.from.bits?.join(''),
    to_matches:state.to.binary===exact.to.bits?.join(''),
    law:'exact operation form and six-bit state are unequal representations; equality here only checks this explicit quotient'
  }:null;
  const residue_ladder=residueLadder({state,stateStep,exact,steering,promotion});
  return {
    schema:CHANGE_CALCULUS_SCHEMA+'/frame',
    authority:'RESEARCH_WITNESS_ONLY',
    state,
    state_step:stateStep,
    exact,
    step,
    steering,
    promotion,
    promotion_evidence_source:spec.promotionEvidence?'SUPPLIED':'CURRENT_EVIDENCE_2026_09_27',
    alignment,
    residue_ladder,
    residue:[
      'I Ching names/text are an optional lookup lens over the six-bit state; no divinatory authority is inferred by this calculation',
      'hexagram quotient loses exact BLOOM/FOLD and SPLIT/RETURN distinctions',
      'moving-line set loses step ordering',
      'J-Lens top-k readout loses unexported vocabulary mass and does not provide a causal direction vector',
      'host forecast support is not permission to execute',
      'promotion from read/support hypothesis to bounded preview is a separate evidence gate with explicit proof obligations'
    ]
  };
}
