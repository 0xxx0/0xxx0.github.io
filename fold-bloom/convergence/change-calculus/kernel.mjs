import {stateChange,stateDescriptor,formatState} from '../../state-language.js';
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
const binomial=(n,k)=>{
  n=Math.max(0,Math.trunc(Number(n)||0));k=Math.max(0,Math.trunc(Number(k)||0));
  if(k>n)return 0;k=Math.min(k,n-k);let x=1;
  for(let i=1;i<=k;i++)x=x*(n-k+i)/i;
  return Math.round(x);
};
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

export function steerStepOrder(lines,order,cursor,nextLine){
  const canonical=addressedLines(lines),requested=addressedLines(order);
  if(!canonical||!requested||requested.length!==canonical.length||requested.some(x=>!canonical.includes(x))){
    return {ok:false,schema:CHANGE_CALCULUS_SCHEMA+'/step-steer',reason:'ORDER_MUST_PERMUTE_ADDRESSED_LINES'};
  }
  const depth=Math.max(0,Math.min(requested.length,Math.trunc(Number(cursor)||0)));
  const prefix=requested.slice(0,depth),remaining=requested.slice(depth),line=Number(nextLine);
  if(!remaining.includes(line)){
    return {ok:false,schema:CHANGE_CALCULUS_SCHEMA+'/step-steer',reason:'NEXT_LINE_MUST_BE_UNMOVED',cursor:depth,prefix,remaining};
  }
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
    law:'local steering freezes the witnessed prefix, chooses one still-unmoved line next, and preserves the relative order of all other future lines'
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

export function changeLatticeCalculation(from,to){
  const calc=transparentStateCalculation(from,to);
  if(!calc.ok)return {ok:false,schema:CHANGE_CALCULUS_SCHEMA+'/change-lattice',reason:calc.reason};
  const moving=[...calc.moving],k=moving.length,vertexCount=2**k,edgeCount=k===0?0:k*(2**(k-1)),chainCount=factorial(k);
  const ranks=Array.from({length:k+1},(_,depth)=>{
    const vertices=binomial(k,depth),prefixOrders=factorial(depth),suffixOrders=factorial(k-depth);
    return {
      depth,
      vertices,
      prefix_orders_per_vertex:prefixOrders,
      suffix_orders_per_vertex:suffixOrders,
      maximal_chains_through_each_vertex:prefixOrders*suffixOrders,
      total_chain_incidence:vertices*prefixOrders*suffixOrders
    };
  });
  const vertices=Array.from({length:vertexCount},(_,mask)=>{
    const bits=[...calc.from.bits],selected=[];
    for(let j=0;j<k;j++){
      if(mask&(1<<j)){
        const line=moving[j];bits[line-1]=calc.to.bits[line-1];selected.push(line);
      }
    }
    const desc=stateDescriptor(bits);
    return {
      mask,
      depth:selected.length,
      selected_lines:selected,
      binary:bitString(bits),
      token:desc.token,
      lower:desc.lower,
      upper:desc.upper,
      address:'change://state/'+calc.from.binary+'→'+calc.to.binary+'/vertex/'+mask.toString(2).padStart(k,'0')
    };
  });
  const edges=[];
  for(let mask=0;mask<vertexCount;mask++){
    for(let j=0;j<k;j++){
      if(mask&(1<<j))continue;
      const toMask=mask|(1<<j);
      edges.push({
        from_mask:mask,
        to_mask:toMask,
        line:moving[j],
        address:'change://state/'+calc.from.binary+'→'+calc.to.binary+'/edge/'+mask+'-'+toMask
      });
    }
  }
  const widest=Math.max(...ranks.map(x=>x.vertices));
  return {
    ok:true,
    schema:CHANGE_CALCULUS_SCHEMA+'/change-lattice',
    authority:'CALCULATION_ONLY',
    from_token:calc.from.token,
    to_token:calc.to.token,
    moving_lines:moving,
    dimensions:k,
    vertices:vertexCount,
    edges:edgeCount,
    maximal_one_line_paths:chainCount,
    widest_rank:widest,
    ranks,
    vertex_set:vertices,
    edge_set:edges,
    metrics:{
      state_choice_bits:k,
      path_order_ambiguity_bits:chainCount>0?round(Math.log2(chainCount)):0,
      path_to_vertex_ratio:vertexCount?round(chainCount/vertexCount):0
    },
    formulas:{
      vertices:'2^k = '+vertexCount,
      directed_edges:'k·2^(k-1) = '+edgeCount,
      maximal_chains:'k! = '+chainCount,
      rank_width:'C(k,r); widest rank = '+widest,
      incidence:'C(k,r)·r!·(k-r)! = k! at every rank'
    },
    law:'the moving-line set defines a k-dimensional Boolean lattice; STEP order selects one maximal chain through shared intermediate states, so same endpoints can have many trajectories without inventing extra state authority'
  };
}


export function stateFrontierCalculation(from,to,order=null,cursor=0){
  const calc=transparentStateCalculation(from,to);
  if(!calc.ok)return {ok:false,schema:CHANGE_CALCULUS_SCHEMA+'/state-frontier',reason:calc.reason};
  const path=steppedStatePath(from,to,order);
  if(!path.ok)return {ok:false,schema:CHANGE_CALCULUS_SCHEMA+'/state-frontier',reason:path.reason};
  const depth=Math.max(0,Math.min(path.steps.length,Math.trunc(Number(cursor)||0)));
  const prefix=path.selected_order.slice(0,depth),prefixSet=new Set(prefix);
  const current=[...calc.from.bits];
  for(const line of prefix)current[line-1]=calc.to.bits[line-1];
  const currentDesc=stateDescriptor(current),remaining=calc.moving.filter(line=>!prefixSet.has(line));
  const movingIndex=new Map(calc.moving.map((line,i)=>[line,i]));
  let mask=0;
  for(const line of prefix){const bit=movingIndex.get(line);if(bit!==undefined)mask|=(1<<bit)}
  const currentAddress='change://state/'+calc.from.binary+'→'+calc.to.binary+'/vertex/'+mask.toString(2).padStart(calc.moving.length,'0');
  const candidates=remaining.map(line=>{
    const after=[...current],i=line-1,fromBit=current[i],toBit=calc.to.bits[i];
    after[i]=toBit;
    const nextDesc=stateDescriptor(after),steered=steerStepOrder(calc.moving,path.selected_order,depth,line);
    const nextDepth=depth+1,nextRemaining=Math.max(0,remaining.length-1);
    return {
      line,
      selected_by_current_order:path.selected_order[depth]===line,
      transition:String(fromBit)+'→'+String(toBit),
      iching_line_value:lineTransitionValue(fromBit,toBit),
      trigram:line<=3?'LOWER':'UPPER',
      before_token:currentDesc.token,
      after_token:nextDesc.token,
      after_binary:bitString(after),
      before_trigram:line<=3?currentDesc.lower:currentDesc.upper,
      after_trigram:line<=3?nextDesc.lower:nextDesc.upper,
      order_index_if_chosen:steered.ok?steered.index:null,
      order_address_if_chosen:steered.ok?steered.address:null,
      future_paths_after:factorial(nextRemaining),
      future_order_ambiguity_bits_after:nextRemaining>0?round(Math.log2(factorial(nextRemaining))):0,
      histories_collapsed_at_successor:factorial(nextDepth),
      history_ambiguity_bits_at_successor:nextDepth>0?round(Math.log2(factorial(nextDepth))):0
    };
  });
  return {
    ok:true,
    schema:CHANGE_CALCULUS_SCHEMA+'/state-frontier',
    authority:'CALCULATION_ONLY',
    from_token:calc.from.token,
    to_token:calc.to.token,
    cursor:depth,
    prefix,
    current:{bits:current,binary:bitString(current),token:currentDesc.token,lower:currentDesc.lower,upper:currentDesc.upper,address:currentAddress},
    remaining_lines:remaining,
    current_future_paths:factorial(remaining.length),
    current_future_order_ambiguity_bits:remaining.length>0?round(Math.log2(factorial(remaining.length))):0,
    current_histories_collapsed:factorial(depth),
    current_history_ambiguity_bits:depth>0?round(Math.log2(factorial(depth))):0,
    candidates,
    law:'the frontier enumerates every lawful one-line successor from the witnessed prefix; it exposes structural consequences and remaining path multiplicity without ranking, permission, or host effect authority'
  };
}

export function exactFormFrontierCalculation(fromForm,toForm,order=null,cursor=0,steering=null){
  if(!formOk(fromForm)||!formOk(toForm))return {ok:false,schema:CHANGE_CALCULUS_SCHEMA+'/exact-frontier',reason:'SIX_EXACT_CONTROL_VERBS_REQUIRED'};
  const a=upperForm(fromForm),target=upperForm(toForm),path=steppedFormPath(a,target,order);
  if(!path.ok)return {ok:false,schema:CHANGE_CALCULUS_SCHEMA+'/exact-frontier',reason:path.reason};
  const depth=Math.max(0,Math.min(path.steps.length,Math.trunc(Number(cursor)||0)));
  const prefix=path.selected_order.slice(0,depth),prefixSet=new Set(prefix),current=[...a];
  for(const line of prefix)current[line-1]=target[line-1];
  const remaining=path.changed_lines.filter(line=>!prefixSet.has(line));
  const currentProjection=hexProjection(current);
  const candidates=remaining.map(line=>{
    const i=line-1,after=[...current],targetVerb=target[i],fromVerb=current[i];
    after[i]=targetVerb;
    const afterProjection=hexProjection(after),steered=steerStepOrder(path.changed_lines,path.selected_order,depth,line);
    const supportRows=steering?.ok?steering.rows.filter(x=>x.mapped_verb===targetVerb):[];
    const modelWeight=steering?.ok&&steering.weight_basis==='TOP_K_CONDITIONAL'
      ?round(supportRows.reduce((sum,x)=>sum+Number(x.conditional_weight||0),0))
      :null;
    const nativeCandidateCount=supportRows.reduce((m,x)=>Math.max(m,Number(x.native_candidate_count)||0),0);
    const supportStatus=!steering?.ok
      ?'NO_MODEL_SUPPORT_WITNESS'
      :supportRows.length===0
        ?'TARGET_VERB_ABSENT_FROM_EXPORTED_TOP_K'
        :nativeCandidateCount>0
          ?'CURRENT_EPOCH_NATIVE_SUPPORT'
          :'MAPPED_WITHOUT_NATIVE_SUPPORT';
    return {
      line,
      selected_by_current_order:path.selected_order[depth]===line,
      from_verb:fromVerb,
      to_verb:targetVerb,
      before_token:currentProjection.token,
      after_token:afterProjection.token,
      quotient_changed:currentProjection.token!==afterProjection.token,
      order_index_if_chosen:steered.ok?steered.index:null,
      order_address_if_chosen:steered.ok?steered.address:null,
      future_paths_after:factorial(Math.max(0,remaining.length-1)),
      model_topk_conditional_weight:modelWeight,
      model_rows:supportRows.map(x=>({rank:x.rank,token:x.token,conditional_weight:x.conditional_weight,support:x.support})),
      native_candidate_count:nativeCandidateCount,
      support_status:supportStatus,
      support_scope:'CURRENT_NATIVE_APERTURE_ONLY'
    };
  });
  return {
    ok:true,
    schema:CHANGE_CALCULUS_SCHEMA+'/exact-frontier',
    authority:'RESEARCH_WITNESS_ONLY',
    cursor:depth,
    prefix,
    current_exact_form:current,
    current_hex_token:currentProjection.token,
    remaining_lines:remaining,
    current_future_paths:factorial(remaining.length),
    candidates,
    law:'model readout and current host support may annotate every exact-form NEXT candidate, but they do not rank it, grant permission, or survive a real commit without re-resolving the native aperture'
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


export function exactQuotientPathCalculation(fromForm,toForm,order=null){
  const exact=exactFormCalculation(fromForm,toForm);
  if(!exact.ok)return {ok:false,schema:CHANGE_CALCULUS_SCHEMA+'/exact-path-projection',reason:exact.reason};
  const path=steppedFormPath(fromForm,toForm,order);
  if(!path.ok)return {ok:false,schema:CHANGE_CALCULUS_SCHEMA+'/exact-path-projection',reason:path.reason};
  const visible=new Set(exact.lines.filter(x=>x.quotient_changed).map(x=>x.line));
  const invisible=exact.lines.filter(x=>x.invisible_exact_change).map(x=>({
    line:x.line,from_verb:x.from_verb,to_verb:x.to_verb,bit:x.from_bit
  }));
  const exactOrders=path.possible_one_edit_orders;
  const quotientOrders=factorial(visible.size);
  const pathFiber=quotientOrders>0?exactOrders/quotientOrders:exactOrders;
  const projectedOrder=path.selected_order.filter(line=>visible.has(line));
  return {
    ok:true,
    schema:CHANGE_CALCULUS_SCHEMA+'/exact-path-projection',
    authority:'CALCULATION_ONLY',
    from_token:exact.from.token,
    to_token:exact.to.token,
    exact_changed_lines:path.changed_lines.length,
    quotient_changed_lines:visible.size,
    quotient_invisible_exact_changes:invisible.length,
    exact_path_count:exactOrders,
    quotient_visible_path_count:quotientOrders,
    exact_paths_per_visible_path:pathFiber,
    path_information_loss_bits:pathFiber>0?round(Math.log2(pathFiber)):0,
    selected_exact_order:[...path.selected_order],
    projected_visible_order:projectedOrder,
    invisible_exact_lines:invisible,
    steps:path.steps.map(x=>({
      step:x.step,address:x.address,line:x.line,from_verb:x.from_verb,to_verb:x.to_verb,
      before_token:x.before_token,after_token:x.after_token,quotient_changed:x.quotient_changed
    })),
    law:'projecting exact one-edit paths through the binary quotient removes same-polarity edits and their interleavings; a visible hex STEP path may therefore stand for many exact operation trajectories'
  };
}

export function residueLadder({state=null,stateStep=null,lattice=null,exact=null,steering=null,promotion=null}={}){
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
  if(lattice?.ok){
    levels.push({
      id:'ORDER_SPACE',
      claim:'TRAJECTORY_SPACE_WITNESS',
      authority:'CALCULATION_ONLY',
      keeps:lattice.vertices+' reachable intermediate state(s), '+lattice.edges+' one-line edge(s), '+lattice.maximal_one_line_paths+' maximal chain(s)',
      drops:'native host timing, cost and consequence are not implied by abstract adjacency',
      dimensions:lattice.dimensions,
      widest_rank:lattice.widest_rank,
      path_order_ambiguity_bits:lattice.metrics.path_order_ambiguity_bits
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


export function calculationTape({
  state=null,
  stateStep=null,
  frontier=null,
  native=null,
  modelSupport=null,
  exactPath=null,
  returnAddress=null
}={}){
  const cursor=frontier?.ok
    ?Math.max(0,Math.trunc(Number(frontier.cursor)||0))
    :0;
  const pathReady=!!stateStep?.ok;
  const pathCount=pathReady?Math.max(1,Number(stateStep.possible_one_line_orders)||1):null;
  const pathIndex=pathReady?Math.max(0,Number(stateStep.selected_order_index)||0):null;
  const futurePaths=frontier?.ok?Math.max(1,Number(frontier.current_future_paths)||1):null;
  const nativeCount=native?Math.max(0,Number(native.candidate_count)||0):null;
  const supportOk=!!modelSupport?.ok;
  const supportCount=supportOk?Math.max(0,Number(modelSupport.native_candidate_count)||0):null;
  const ambiguity=supportOk&&Number.isFinite(Number(modelSupport.candidate_ambiguity_bits))
    ?round(Number(modelSupport.candidate_ambiguity_bits))
    :null;
  const exactPathOk=!!exactPath?.ok;
  const nativeRows=Array.isArray(native?.forecasts)
    ?native.forecasts.map(x=>x?.forecast||x).filter(x=>x&&CONTROL_VERBS.includes(String(x.verb||'').toUpperCase()))
    :[];
  const supportForVerb=verb=>{
    const target=String(verb||'').toUpperCase(),rows=nativeRows.filter(x=>String(x.verb||'').toUpperCase()===target);
    const aligned=supportOk&&String(modelSupport.mapped_verb||'').toUpperCase()===target;
    return {
      native_candidate_count:rows.length,
      native_candidate_slots:rows.map(x=>Number(x.slot)).filter(Number.isFinite),
      model_direction_aligned:aligned,
      model_supported_native_count:aligned?supportCount:0,
      model_support_status:aligned?(modelSupport.status||'RESOLVED'):'DIRECTION_NOT_ALIGNED'
    };
  };
  const exactByLine=new Map(exactPathOk?(exactPath.steps||[]).map(x=>[Number(x.line),x]):[]);
  const exactNext=frontier?.ok?(frontier.candidates||[]).map(x=>{
    const exact=exactByLine.get(Number(x.line))||null,targetVerb=exact?.to_verb||null;
    return {
      line:x.line,
      after_token:x.after_token,
      exact:exact?{from_verb:exact.from_verb,to_verb:exact.to_verb,quotient_changed:!!exact.quotient_changed}:null,
      support:targetVerb?supportForVerb(targetVerb):null
    };
  }):[];
  const exactResidue=exactPathOk?(exactPath.invisible_exact_lines||[]).map(x=>({...x,support:supportForVerb(x.to_verb)})):[];
  const stage=(id,ready,value,authority,extra={})=>({
    id,
    ready:!!ready,
    value:String(value??'OPEN'),
    authority,
    ...extra
  });
  const stages=[
    stage(
      'SOURCE',
      state?.ok,
      state?.ok?state.from.token+' → '+state.to.token:'UNRESOLVED',
      'INPUT_WITNESS',
      {keeps:'supplied endpoints',drops:'none inside the supplied endpoint pair'}
    ),
    stage(
      'QUOTIENT',
      state?.ok,
      state?.ok?'d_H '+state.metrics.hamming_distance+'/6 · '+state.mask:'UNRESOLVED',
      'CALCULATION_ONLY',
      {
        formula:'d_H = Σ_i [from_i ≠ to_i]',
        keeps:state?.ok?state.metrics.hamming_distance+' addressed moving line(s)':'none',
        drops:exactPathOk&&exactPath.quotient_invisible_exact_changes>0
          ?exactPath.quotient_invisible_exact_changes+' exact operation edit(s) are quotient-invisible; '+exactPath.exact_paths_per_visible_path+' exact path(s) collapse into each visible quotient path'
          :state?.ok&&state.metrics.one_line_step_orders>1
            ?state.metrics.one_line_step_orders+' temporal orders collapse into the unordered moving set'
            :'no temporal-order ambiguity at this endpoint pair',
        exact_residue_count:exactPathOk?exactPath.quotient_invisible_exact_changes:null
      }
    ),
    stage(
      'PATH',
      pathReady,
      pathReady?'ORDER '+(pathIndex+1)+'/'+pathCount+' · STEP '+cursor+'/'+stateStep.steps.length+(exactPathOk?' · FIBER '+exactPath.exact_paths_per_visible_path+'× / '+exactPath.path_information_loss_bits+'b':''):'UNRESOLVED',
      'CALCULATION_ONLY',
      {
        formula:exactPathOk?'factoradic quotient path; exact path fiber = e!/v!; residue bits = log2(e!/v!)':'factoradic rank ↔ one maximal one-line path',
        address:pathReady?stateStep.path_address:null,
        ambiguity_bits:pathReady?stateStep.order_ambiguity_bits:null,
        exact_path_count:exactPathOk?exactPath.exact_path_count:null,
        quotient_visible_path_count:exactPathOk?exactPath.quotient_visible_path_count:null,
        exact_paths_per_visible_path:exactPathOk?exactPath.exact_paths_per_visible_path:null,
        path_information_loss_bits:exactPathOk?exactPath.path_information_loss_bits:null
      }
    ),
    stage(
      'NEXT',
      frontier?.ok,
      frontier?.ok
        ?(frontier.candidates.length
          ?frontier.candidates.length+' EDGE'+(frontier.candidates.length===1?'':'S')+' · '+futurePaths+' FUTURE PATH'+(futurePaths===1?'':'S')+(exactResidue.length?' · EXACT RESIDUE '+exactResidue.length:'')
          :'QUOTIENT TARGET REACHED · '+frontier.current.token+(exactResidue.length?' · EXACT RESIDUE '+exactResidue.length:''))
        :'UNRESOLVED',
      'CALCULATION_ONLY',
      {
        formula:'remaining quotient successors; future paths = (remaining lines)!; exact residue stays visible even when quotient target is reached',
        address:frontier?.ok?frontier.current.address:null,
        future_paths:futurePaths,
        exact_candidates:exactNext,
        exact_residue:exactResidue
      }
    ),
    stage(
      'NATIVE',
      !!native,
      native
        ?nativeCount+' LAWFUL CANDIDATE'+(nativeCount===1?'':'S')+(native.seq!=null?' · SEQ '+native.seq:'')
        :'NO HOST WITNESS',
      native?.authority||'WITNESS_ONLY',
      {
        keeps:'current host-owned lawful aperture',
        drops:'support expires after host commit; this tape never executes it',
        live_instance:native?.live_instance||null
      }
    ),
    stage(
      'MODEL',
      supportOk,
      supportOk
        ?String(modelSupport.direction_label||modelSupport.direction||'DIRECTION')+' → '+String(modelSupport.mapped_verb||'∅')+' · C='+supportCount+' · a='+(ambiguity==null?'—':ambiguity+'b')
        :'NO CURRENT SUPPORT WITNESS',
      'CALCULATION_ONLY',
      {
        formula:'C(direction,s) = current lawful native candidates matching the mapped direction; a = log2(|C|)',
        candidate_count:supportCount,
        ambiguity_bits:ambiguity,
        status:modelSupport?.status||modelSupport?.reason||null
      }
    ),
    stage(
      'RETURN',
      !!returnAddress,
      returnAddress||frontier?.current?.address||stateStep?.path_address||'OPEN',
      'EVIDENCE_ONLY',
      {
        keeps:'address needed to re-enter the inspected calculation',
        drops:'RETURN preserves evidence; it grants no host/model authority'
      }
    )
  ];
  const firstOpen=stages.findIndex(x=>!x.ready);
  const active=firstOpen<0?'RETURN':stages[Math.max(0,firstOpen-1)].id;
  return {
    schema:CHANGE_CALCULUS_SCHEMA+'/calculation-tape',
    authority:'RESEARCH_WITNESS_ONLY',
    active_stage:active,
    stages,
    ambiguity:{
      endpoint_order_bits:state?.ok?state.metrics.step_order_ambiguity_bits:null,
      selected_path_bits:pathReady?stateStep.order_ambiguity_bits:null,
      remaining_path_bits:frontier?.ok?frontier.current_future_order_ambiguity_bits:null,
      exact_path_fiber_bits:exactPathOk?exactPath.path_information_loss_bits:null,
      model_candidate_bits:ambiguity
    },
    law:'SOURCE → QUOTIENT → PATH → NEXT → NATIVE → MODEL → RETURN is one inspectable evidence tape over existing witnesses; readiness at one stage never grants authority to the next'
  };
}

export function calculationFocusProjection(tape,requested='AUTO'){
  if(tape?.schema!==CHANGE_CALCULUS_SCHEMA+'/calculation-tape'||!Array.isArray(tape.stages)){
    return {ok:false,schema:CHANGE_CALCULUS_SCHEMA+'/calculation-focus',reason:'CALCULATION_TAPE_REQUIRED'};
  }
  const ids=new Set(tape.stages.map(x=>String(x?.id||'').toUpperCase()).filter(Boolean));
  const raw=String(requested||'AUTO').toUpperCase();
  const manual=raw!=='AUTO'&&ids.has(raw);
  const stageId=manual?raw:String(tape.active_stage||tape.stages.find(x=>x?.ready)?.id||'SOURCE').toUpperCase();
  const stage=tape.stages.find(x=>String(x?.id||'').toUpperCase()===stageId)||tape.stages[0];
  const focusedVisuals={
    SOURCE:{tree:false,state:true,lattice:false,native:false,control_loss:false,return_address:false},
    QUOTIENT:{tree:false,state:true,lattice:false,native:false,control_loss:true,return_address:false},
    PATH:{tree:false,state:true,lattice:true,native:false,control_loss:false,return_address:false},
    NEXT:{tree:false,state:true,lattice:true,native:false,control_loss:false,return_address:false},
    NATIVE:{tree:false,state:false,lattice:false,native:true,control_loss:false,return_address:false},
    MODEL:{tree:false,state:false,lattice:false,native:true,control_loss:false,return_address:false},
    RETURN:{tree:false,state:true,lattice:false,native:false,control_loss:false,return_address:true}
  };
  const visuals=manual
    ?{...(focusedVisuals[stageId]||focusedVisuals.SOURCE)}
    :{tree:true,state:true,lattice:true,native:true,control_loss:true,return_address:false};
  return {
    ok:true,
    schema:CHANGE_CALCULUS_SCHEMA+'/calculation-focus',
    authority:'VIEW_ONLY',
    requested:manual?stageId:'AUTO',
    follows_active:!manual,
    stage_id:stageId,
    ready:!!stage?.ready,
    value:String(stage?.value??'OPEN'),
    stage_authority:String(stage?.authority||'UNKNOWN'),
    address:stage?.address||null,
    formula:stage?.formula||null,
    keeps:stage?.keeps||null,
    drops:stage?.drops||null,
    visuals,
    law:'calculation focus changes only which existing witnesses are visible together; it never changes source state, native support, steering evidence or effect authority'
  };
}

export function appliedResearchFrame(spec={}){
  const state=transparentStateCalculation(spec.fromState,spec.toState);
  const stateStep=state?.ok?steppedStatePath(spec.fromState,spec.toState,spec.stateStepOrder):null;
  const lattice=state?.ok?changeLatticeCalculation(spec.fromState,spec.toState):null;
  const exact=spec.fromForm&&spec.toForm?exactFormCalculation(spec.fromForm,spec.toForm):null;
  const step=spec.fromForm&&spec.toForm?steppedFormPath(spec.fromForm,spec.toForm,spec.stepOrder):null;
  const steering=spec.trace&&spec.target
    ?steeringSupportCalculation(spec.trace,spec.target,spec.nativeForecasts||[],spec.vocabulary)
    :null;
  const state_frontier=state?.ok?stateFrontierCalculation(spec.fromState,spec.toState,spec.stateStepOrder,spec.stateCursor||0):null;
  const exact_frontier=exact?.ok?exactFormFrontierCalculation(spec.fromForm,spec.toForm,spec.stepOrder,spec.stepCursor||0,steering):null;
  const promotionEvidence=spec.promotionEvidence||CURRENT_EVIDENCE_2026_09_27;
  const promotion=evaluateSteeringPromotion(promotionEvidence);
  const alignment=state?.ok&&exact?.ok?{
    from_matches:state.from.binary===exact.from.bits?.join(''),
    to_matches:state.to.binary===exact.to.bits?.join(''),
    law:'exact operation form and six-bit state are unequal representations; equality here only checks this explicit quotient'
  }:null;
  const residue_ladder=residueLadder({state,stateStep,lattice,exact,steering,promotion});
  return {
    schema:CHANGE_CALCULUS_SCHEMA+'/frame',
    authority:'RESEARCH_WITNESS_ONLY',
    state,
    state_step:stateStep,
    state_frontier,
    change_lattice:lattice,
    exact,
    step,
    exact_frontier,
    steering,
    promotion,
    promotion_evidence_source:spec.promotionEvidence?'SUPPLIED':'CURRENT_EVIDENCE_2026_09_27',
    alignment,
    exact_path_projection:exact?.ok?exactQuotientPathCalculation(spec.fromForm,spec.toForm,spec.stepOrder):null,
    residue_ladder,
    residue:[
      'I Ching names/text are an optional lookup lens over the six-bit state; no divinatory authority is inferred by this calculation',
      'hexagram quotient loses exact BLOOM/FOLD and SPLIT/RETURN distinctions',
      'moving-line set loses step ordering; its k moving lines define a 2^k-state Boolean change lattice with k! maximal one-line paths',
      'a current frontier enumerates all lawful one-line successors; selecting one edge is not implied by endpoint state, model readout, or host support',
      'J-Lens top-k readout loses unexported vocabulary mass and does not provide a causal direction vector',
      'host forecast support is not permission to execute',
      'promotion from read/support hypothesis to bounded preview is a separate evidence gate with explicit proof obligations'
    ]
  };
}
