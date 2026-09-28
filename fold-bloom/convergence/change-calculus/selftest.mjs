import assert from 'node:assert/strict';
import {TRACE_SCHEMA} from '../jspace-steering/kernel.mjs';
import {
  lineTransitionValue,transparentStateCalculation,stepOrderAt,stepOrderRank,steerStepOrder,steppedStatePath,changeLatticeCalculation,exactFormCalculation,
  steppedFormPath,residueLadder,appliedResearchFrame
} from './kernel.mjs';
import {conditionalTopKWeights,steeringSupportCalculation} from '../jspace-steering/steering-calculus.mjs';

assert.equal(lineTransitionValue(0,0),8);
assert.equal(lineTransitionValue(1,1),7);
assert.equal(lineTransitionValue(0,1),6);
assert.equal(lineTransitionValue(1,0),9);

const order0=stepOrderAt([1,2,3,4,5,6],0);
const order719=stepOrderAt([1,2,3,4,5,6],719);
assert.equal(order0.ok,true);
assert.deepEqual(order0.order,[1,2,3,4,5,6]);
assert.equal(order0.count,720);
assert.equal(order719.index,719);
assert.deepEqual(order719.order,[6,5,4,3,2,1]);
assert.equal(stepOrderAt([1,2,3],6).index,0);
for(const i of [0,1,5,17,119,719]){
  const indexed=stepOrderAt([1,2,3,4,5,6],i);
  const ranked=stepOrderRank([1,2,3,4,5,6],indexed.order);
  assert.equal(ranked.ok,true);
  assert.equal(ranked.index,i);
}
assert.equal(stepOrderRank([1,2,3],[1,1,2]).ok,false);

const steer0=steerStepOrder([1,3,5],[1,3,5],0,5);
assert.equal(steer0.ok,true);
assert.deepEqual(steer0.prefix,[]);
assert.deepEqual(steer0.order,[5,1,3]);
assert.equal(steer0.index,4);
const steer1=steerStepOrder([1,3,5],steer0.order,1,3);
assert.equal(steer1.ok,true);
assert.deepEqual(steer1.prefix,[5]);
assert.deepEqual(steer1.order,[5,3,1]);
assert.deepEqual(steerStepOrder([1,3,5],steer1.order,1,5),{
  ok:false,
  schema:'fold-bloom-change-calculus/v0.1/step-steer',
  reason:'NEXT_LINE_MUST_BE_UNMOVED',
  cursor:1,
  prefix:[5],
  remaining:[3,1]
});

const state=transparentStateCalculation('010|100','011|110');
assert.equal(state.ok,true);
assert.deepEqual(state.moving,[3,5]);
assert.equal(state.metrics.hamming_distance,2);
assert.equal(state.metrics.normalized_hamming,0.333333);
assert.equal(state.metrics.one_line_step_orders,2);
assert.deepEqual(state.iching_projection.line_values,[8,7,6,7,6,8]);

const stateStep=steppedStatePath('010|100','011|110');
assert.equal(stateStep.ok,true);
assert.deepEqual(stateStep.changed_lines,[3,5]);
assert.deepEqual(stateStep.selected_order,[3,5]);
assert.equal(stateStep.possible_one_line_orders,2);
assert.equal(stateStep.order_ambiguity_bits,1);
assert.equal(stateStep.steps[0].before_token,'H[010|100]');
assert.equal(stateStep.steps[0].after_token,'H[011|100]');
assert.equal(stateStep.steps[0].iching_line_value,6);
assert.equal(stateStep.steps[1].after_token,'H[011|110]');
assert.equal(stateStep.final_matches_target,true);
assert.equal(stateStep.selected_order_index,0);
assert.equal(stateStep.selected_order_address,'order://0-of-2');
assert.equal(stateStep.path_address,'change://state/010100→011110/order/0-of-2');
assert.equal(stateStep.steps[0].address,stateStep.path_address+'/step/1');
const stateStepReverse=steppedStatePath('010|100','011|110',[5,3]);
assert.equal(stateStepReverse.ok,true);
assert.equal(stateStepReverse.selected_order_index,1);
assert.equal(stateStepReverse.selected_order_address,'order://1-of-2');
assert.equal(stateStepReverse.steps[0].after_token,'H[010|110]');
assert.notEqual(stateStep.steps[0].after_token,stateStepReverse.steps[0].after_token);
assert.equal(steppedStatePath('010|100','011|110',[3,3]).ok,false);

const lattice=changeLatticeCalculation('010|100','011|110');
assert.equal(lattice.ok,true);
assert.equal(lattice.dimensions,2);
assert.equal(lattice.vertices,4);
assert.equal(lattice.edges,4);
assert.equal(lattice.maximal_one_line_paths,2);
assert.equal(lattice.widest_rank,2);
assert.deepEqual(lattice.ranks.map(x=>x.vertices),[1,2,1]);
assert.ok(lattice.ranks.every(x=>x.total_chain_incidence===2));
assert.deepEqual(lattice.vertex_set.map(x=>x.token).sort(),['H[010|100]','H[010|110]','H[011|100]','H[011|110]'].sort());
assert.deepEqual(lattice.edge_set.map(x=>x.line).sort(),[3,3,5,5]);
assert.equal(changeLatticeCalculation('000|000','111|111').vertices,64);
assert.equal(changeLatticeCalculation('000|000','111|111').edges,192);
assert.equal(changeLatticeCalculation('000|000','111|111').maximal_one_line_paths,720);

const fromForm=['RETURN','FOLD','SPLIT','BLOOM','RETURN','SPLIT'];
const toForm=['SPLIT','BLOOM','FOLD','FOLD','BLOOM','RETURN'];
const exact=exactFormCalculation(fromForm,toForm);
assert.equal(exact.ok,true);
assert.equal(exact.from.token,'H[010|100]');
assert.equal(exact.to.token,'H[011|110]');
assert.equal(exact.metrics.exact_state_count,4096);
assert.equal(exact.metrics.quotient_state_count,64);
assert.equal(exact.metrics.exact_forms_per_hexagram,64);
assert.equal(exact.metrics.exact_uniform_information_bits,12);
assert.equal(exact.metrics.quotient_uniform_information_bits,6);
assert.equal(exact.metrics.quotient_information_loss_bits,6);
assert.equal(exact.metrics.exact_changed_lines,6);
assert.equal(exact.metrics.quotient_changed_lines,2);
assert.equal(exact.metrics.quotient_invisible_exact_changes,4);

const stepped=steppedFormPath(fromForm,toForm);
assert.equal(stepped.ok,true);
assert.equal(stepped.steps.length,6);
assert.equal(stepped.possible_one_edit_orders,720);
assert.equal(stepped.final_matches_target,true);
assert.equal(stepped.selected_order_index,0);
assert.equal(stepped.selected_order_address,'order://0-of-720');
assert.ok(stepped.path_address.includes('/order/0-of-720'));
assert.equal(stepped.steps.filter(x=>x.quotient_changed).length,2);
assert.equal(steppedFormPath(fromForm,toForm,[3,5]).ok,false);

const weights=conditionalTopKWeights([
  {token_id:1,token:'FOLD',logit:4,rank:1},
  {token_id:2,token:'RETURN',logit:3,rank:2},
  {token_id:3,token:' weather',logit:2,rank:3}
]);
assert.ok(Math.abs(weights.reduce((s,x)=>s+x.conditional_weight,0)-1)<1e-5);

const trace={
  schema:TRACE_SCHEMA,
  trace_id:'calc-fixture',
  model:{id:'Qwen/Qwen2.5-1.5B',revision:'fixture',n_layers:28},
  lens:{id:'local/jlens-demo',revision:'fixture',n_prompts:100,d_model:1536},
  source:{prompt:'choose one relation',token_count:4,token_ids:[1,2,3,4]},
  cells:[{layer:12,position:3,top:[
    {token_id:1,token:'FOLD',logit:4,rank:1},
    {token_id:2,token:'RETURN',logit:3,rank:2},
    {token_id:3,token:' weather',logit:2,rank:3}
  ]}]
};
const forecasts=[
  {slot:2,verb:'FOLD',chain:2,power:1.3},
  {slot:8,verb:'FOLD',chain:1,power:1.0},
  {slot:5,verb:'RETURN',chain:1,power:.9}
];
const steering=steeringSupportCalculation(trace,{layer:12,position:3},forecasts);
assert.equal(steering.ok,true);
assert.equal(steering.weight_basis,'TOP_K_CONDITIONAL');
assert.equal(steering.top.mapped_verb,'FOLD');
assert.equal(steering.top.native_candidate_count,2);
assert.equal(steering.top.candidate_ambiguity_bits,1);
assert.equal(steering.top.status,'MULTIPLE_NATIVE_CANDIDATES');
assert.equal(steering.residue.outside_vocabulary.length,1);
assert.ok(steering.host_supported_weight<1);
assert.ok(steering.host_supported_weight>0);

const frame=appliedResearchFrame({
  fromState:'010|100',toState:'011|110',fromForm,toForm,
  trace,target:{layer:12,position:3},nativeForecasts:forecasts
});
assert.equal(frame.authority,'RESEARCH_WITNESS_ONLY');
assert.equal(frame.state_step.possible_one_line_orders,2);
assert.equal(frame.state_step.steps.length,2);
assert.equal(frame.change_lattice.vertices,4);
assert.equal(frame.change_lattice.maximal_one_line_paths,2);
assert.deepEqual(frame.alignment,{from_matches:true,to_matches:true,law:frame.alignment.law});
assert.equal(frame.steering.top.status,'MULTIPLE_NATIVE_CANDIDATES');
assert.equal(frame.promotion.status,'BLOCKED');
assert.equal(frame.promotion.summary.failed,6);
assert.equal(frame.promotion.summary.total,10);
assert.equal(frame.promotion_evidence_source,'CURRENT_EVIDENCE_2026_09_27');
assert.equal(frame.promotion.checks.find(x=>x.id==='REAL_MODEL_FIT_APPLY')?.pass,true);
assert.equal(frame.promotion.checks.find(x=>x.id==='MODEL_INTERVENTION_EXECUTED')?.pass,false);
assert.ok(frame.residue.some(x=>x.includes('moving-line set loses step ordering')));
assert.equal(frame.residue_ladder.authority,'RESEARCH_WITNESS_ONLY');
assert.equal(frame.residue_ladder.strongest_claim,'READ_SUPPORT_ONLY');
assert.deepEqual(frame.residue_ladder.levels.map(x=>x.id),[
  'EXACT_FORM','HEX_STATE','MOVING_SET','ORDER_SPACE','ORDERED_PATH','MODEL_READOUT','HOST_SUPPORT','CAUSAL_GATE'
]);
assert.equal(frame.residue_ladder.levels.find(x=>x.id==='HEX_STATE')?.compression_ratio,64);
assert.equal(frame.residue_ladder.levels.find(x=>x.id==='MOVING_SET')?.alternatives,2);
assert.equal(frame.residue_ladder.levels.find(x=>x.id==='MOVING_SET')?.ambiguity_bits,1);
assert.equal(frame.residue_ladder.levels.find(x=>x.id==='HOST_SUPPORT')?.native_candidate_count,3);
assert.equal(frame.residue_ladder.levels.find(x=>x.id==='CAUSAL_GATE')?.failed_obligations,6);

const stateOnlyResidue=residueLadder({state,stateStep,lattice});
assert.equal(stateOnlyResidue.strongest_claim,'ORDERED_PATH_WITNESS');
assert.deepEqual(stateOnlyResidue.levels.map(x=>x.id),['HEX_STATE','MOVING_SET','ORDER_SPACE','ORDERED_PATH']);
assert.equal(stateOnlyResidue.levels.find(x=>x.id==='ORDER_SPACE')?.dimensions,2);
assert.equal(stateOnlyResidue.levels.find(x=>x.id==='HEX_STATE')?.compression_ratio,null);

console.log(JSON.stringify({
  status:'PASS',
  state:{moving:state.moving,orders:state.metrics.one_line_step_orders,lineValues:state.iching_projection.line_values,stepPaths:[stateStep.steps.map(x=>x.after_token),stateStepReverse.steps.map(x=>x.after_token)]},
  lattice:{dimensions:lattice.dimensions,vertices:lattice.vertices,edges:lattice.edges,maximalChains:lattice.maximal_one_line_paths,ranks:lattice.ranks.map(x=>x.vertices)},
  quotient:{exactStates:4096,hexStates:64,fiber:64,invisibleExact:exact.metrics.quotient_invisible_exact_changes},
  exactStepOrders:stepped.possible_one_edit_orders,
  steering:{basis:steering.weight_basis,top:steering.top,hostSupportedWeight:steering.host_supported_weight},
  promotion:{status:frame.promotion.status,summary:frame.promotion.summary,reasons:frame.promotion.reasons},
  residueLadder:{strongest:frame.residue_ladder.strongest_claim,levels:frame.residue_ladder.levels.map(x=>x.id)},
  authority:frame.authority
},null,2));
