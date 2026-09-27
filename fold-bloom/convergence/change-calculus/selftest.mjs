import assert from 'node:assert/strict';
import {TRACE_SCHEMA} from '../jspace-steering/kernel.mjs';
import {
  lineTransitionValue,transparentStateCalculation,steppedStatePath,exactFormCalculation,
  steppedFormPath,appliedResearchFrame
} from './kernel.mjs';
import {conditionalTopKWeights,steeringSupportCalculation} from '../jspace-steering/steering-calculus.mjs';

assert.equal(lineTransitionValue(0,0),8);
assert.equal(lineTransitionValue(1,1),7);
assert.equal(lineTransitionValue(0,1),6);
assert.equal(lineTransitionValue(1,0),9);

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
const stateStepReverse=steppedStatePath('010|100','011|110',[5,3]);
assert.equal(stateStepReverse.ok,true);
assert.equal(stateStepReverse.steps[0].after_token,'H[010|110]');
assert.notEqual(stateStep.steps[0].after_token,stateStepReverse.steps[0].after_token);
assert.equal(steppedStatePath('010|100','011|110',[3,3]).ok,false);

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
assert.deepEqual(frame.alignment,{from_matches:true,to_matches:true,law:frame.alignment.law});
assert.equal(frame.steering.top.status,'MULTIPLE_NATIVE_CANDIDATES');
assert.ok(frame.residue.some(x=>x.includes('moving-line set loses step ordering')));

console.log(JSON.stringify({
  status:'PASS',
  state:{moving:state.moving,orders:state.metrics.one_line_step_orders,lineValues:state.iching_projection.line_values,stepPaths:[stateStep.steps.map(x=>x.after_token),stateStepReverse.steps.map(x=>x.after_token)]},
  quotient:{exactStates:4096,hexStates:64,fiber:64,invisibleExact:exact.metrics.quotient_invisible_exact_changes},
  exactStepOrders:stepped.possible_one_edit_orders,
  steering:{basis:steering.weight_basis,top:steering.top,hostSupportedWeight:steering.host_supported_weight},
  authority:frame.authority
},null,2));
