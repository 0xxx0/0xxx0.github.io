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
const choose=(n,r)=>{
  n=Math.max(0,Math.trunc(Number(n)||0));r=Math.max(0,Math.trunc(Number(r)||0));
  if(r>n)return 0;r=Math.min(r,n-r);let x=1;
  for(let i=1;i<=r;i++)x=x*(n-r+i)/i;
  return Math.round(x);
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

export function steerStepOrder(lines,order,cursor,nextLine){
  const canonical=addressedLines(lines),requested=addressedLines(order);
  if(!canonical||!requested||requested.length!==canonical.length||requested.some(x=>!canonical.includes(x))){
    return {ok:false,schema:CHANGE_CALCULUS_SCHEMA+'/step-steer',reason:'ORDER_MUST_PERMUTE_ADDRESSED_LINES'};
  }
  const depth=Math.max(0,Math.min(requested.length,Math.trunc(Number(cursor)||0)));
  const prefix=requested.slice(0,depth),remaining=requested.slice(depth),line=Number(nextLine);
  if(!remaining.includes(line))return {ok:false,schema:CHANGE_CALCULUS_SCHEMA+'/step-steer',reason:'NEXT_LINE_MUST_BE_UNMOVED',prefix,remaining};
  const next=[...prefix,line,...remaining.filter(x=>x!==line)],ranked=stepOrderRank(canonical,next);
  return {
    ok:true,
    schema:CHANGE_CALCULUS_SCHEMA+'/step-steer',
    authority:'CALCULATION_ONLY',
    cursor:depth,
    prefix,
    chosen_line:line,
    order:next,
    index:ranked.index,
    count:ranked.count,
    address:ranked.address,
    law:'local steering fixes the witnessed prefix, chooses one remaining line next, and preserves the relative order of all other future lines'
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

export function statePathLattice(from,to,order=null,cursor=0){
  const calc=transparentStateCalculation(from,to);
  if(!calc.ok)return {ok:false,schema:CHANGE_CALCULUS_SCHEMA+'/state-lattice',reason:calc.reason};
  const path=steppedStatePath(from,to,order);
  if(!path.ok)return {ok:false,schema:CHANGE_CALCULUS_SCHEMA+'/state-lattice',reason:path.reason};
  const k=calc.moving.length,depth=Math.max(0,Math.min(k,Math.trunc(Number(cursor)||0)));
  const prefix=path.selected_order.slice(0,depth),remaining=path.selected_order.slice(depth);
  const current=[...calc.from.bits];
  for(const line of prefix)current[line-1]=calc.to.bits[line-1];
  const currentToken='H['+formatState(current)+']',fromBinary=calc.from.binary,toBinary=calc.to.binary;
  const vertexAddress='change://state/'+fromBinary+'→'+toBinary+'/vertex/'+(prefix.length?[...prefix].sort((a,b)=>a-b).join(','):'origin');
  const nextCandidates=remaining.map(line=>{
    const after=[...current];after[line-1]=calc.to.bits[line-1];
    const steered=steerStepOrder(calc.moving,path.selected_order,depth,line);
    const left=Math.max(0,remaining.length-1),continuations=factorial(left);
    return {
      line,
      transition:String(current[line-1])+'→'+String(calc.to.bits[line-1]),
      iching_line_value:lineTransitionValue(current[line-1],calc.to.bits[line-1]),
      after_binary:bitString(after),
      after_token:'H['+formatState(after)+']',
      continuation_chains:continuations,
      continuation_bits:round(Math.log2(continuations)),
      steered_order_index:steered.ok?steered.index:null,
      steered_order:steered.ok?[...steered.order]:null
    };
  });
  const collapsed=factorial(depth),future=factorial(k-depth);
  return {
    ok:true,
    schema:CHANGE_CALCULUS_SCHEMA+'/state-lattice',
    authority:'CALCULATION_ONLY',
    dimension:k,
    vertex_count:2**k,
    edge_count:k===0?0:k*(2**(k-1)),
    maximal_chains:factorial(k),
    layers:Array.from({length:k+1},(_,d)=>({depth:d,vertices:choose(k,d)})),
    selected_order:[...path.selected_order],
    selected_order_index:path.selected_order_index,
    path_address:path.path_address,
    cursor:depth,
    current:{
      token:currentToken,
      binary:bitString(current),
      bits:current,
      vertex_address:vertexAddress,
      prefix:[...prefix]
    },
    remaining_lines:[...remaining],
    next_candidates:nextCandidates,
    future_chains:future,
    future_ambiguity_bits:round(Math.log2(future)),
    collapsed_prefix_orderings:collapsed,
    collapsed_prefix_order_bits:round(Math.log2(collapsed)),
    current_layer_width:choose(k,depth),
    laws:[
      'the endpoint interval is a k-dimensional Boolean subcube over exactly the moving lines',
      'one-line STEP paths are maximal chains through that subcube, so there are k! paths but only 2^k unique vertices',
      'the current binary vertex records which lines have moved, not the order in which the witnessed prefix moved them',
      'choosing a next line steers only the preview path; it does not authorize or execute a host operation'
    ]
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

export function appliedResearchFrame(spec={}){
  const state=transparentStateCalculation(spec.fromState,spec.toState);
  const stateStep=state?.ok?steppedStatePath(spec.fromState,spec.toState,spec.stateStepOrder):null;
  const stateLattice=state?.ok?statePathLattice(spec.fromState,spec.toState,spec.stateStepOrder,spec.stateStepCursor||0):null;
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
  return {
    schema:CHANGE_CALCULUS_SCHEMA+'/frame',
    authority:'RESEARCH_WITNESS_ONLY',
    state,
    state_step:stateStep,
    state_lattice:stateLattice,
    exact,
    step,
    steering,
    promotion,
    promotion_evidence_source:spec.promotionEvidence?'SUPPLIED':'CURRENT_EVIDENCE_2026_09_27',
    alignment,
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
