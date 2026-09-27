export const PROMOTION_GATE_SCHEMA='field-steering-promotion-gate/v0.1';

export function evaluateSteeringPromotion(evidence={}){
  const reasons=[];
  const host=evidence.host||{},model=evidence.model||{},intervention=evidence.intervention||{};

  if(host.path==='HEX_MACROSTATE'&&host.control_sufficient!==true){
    reasons.push('HOST_MACROSTATE_NOT_CONTROL_SUFFICIENT');
  }
  if(host.path!=='NATIVE_FORECASTS'&&host.path!=='HEX_MACROSTATE'){
    reasons.push('HOST_PATH_UNRESOLVED');
  }
  if(host.path==='NATIVE_FORECASTS'&&host.native_forecasts_witnessed!==true){
    reasons.push('NATIVE_FORECASTS_NOT_WITNESSED');
  }

  if(model.real_fit_apply!==true)reasons.push('REAL_MODEL_FIT_APPLY_REQUIRED');
  if(model.evidence_class!=='SEMANTIC_MODEL_EVIDENCE'){
    reasons.push('MODEL_EVIDENCE_NOT_SEMANTIC');
  }
  if(intervention.executed!==true)reasons.push('MODEL_INTERVENTION_NOT_EXECUTED');
  if(intervention.zero_control!==true)reasons.push('ZERO_CONTROL_REQUIRED');
  if(intervention.opposite_or_unrelated_control!==true)reasons.push('DIRECTION_CONTROL_REQUIRED');
  if(intervention.repeated_prompts!==true)reasons.push('REPEATED_PROMPTS_REQUIRED');
  if(typeof intervention.receipt_ref!=='string'||!intervention.receipt_ref.trim()){
    reasons.push('EXECUTION_RECEIPT_REQUIRED');
  }

  return {
    schema:PROMOTION_GATE_SCHEMA,
    authority:'EVIDENCE_ONLY',
    eligible:reasons.length===0,
    status:reasons.length?'BLOCKED':'ELIGIBLE_FOR_BOUNDED_PREVIEW',
    reasons,
    commit_operation:null,
    law:'real readout plumbing is necessary but not sufficient; causal steering promotion requires semantic model evidence, controlled intervention receipts, and a host path whose control semantics are independently witnessed'
  };
}

export const CURRENT_EVIDENCE_2026_09_27=Object.freeze({
  host:{
    path:'NATIVE_FORECASTS',
    native_forecasts_witnessed:true,
    hex_macrostate_control_sufficient:false
  },
  model:{
    real_fit_apply:true,
    evidence_class:'PLUMBING_ONLY',
    model_id:'sshleifer/tiny-gpt2',
    model_revision:'5f91d94bd9cd7190a9f3216ff93cd1dd95f2c7be',
    jlens_revision:'581d398613e5602a5af361e1c34d3a92ea82ba8e'
  },
  intervention:{
    executed:false,
    zero_control:false,
    opposite_or_unrelated_control:false,
    repeated_prompts:false,
    receipt_ref:null
  }
});
