export const PROMOTION_GATE_SCHEMA='field-steering-promotion-gate/v0.1';

const bool=v=>v===true;
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;

export function steeringPromotionChecks(evidence={}){
  const host=evidence.host||{},model=evidence.model||{},intervention=evidence.intervention||{};
  const hostResolved=host.path==='NATIVE_FORECASTS'||host.path==='HEX_MACROSTATE';
  return [
    {
      id:'HOST_PATH_RESOLVED',
      pass:hostResolved,
      reason:'HOST_PATH_UNRESOLVED',
      observed:host.path||null,
      required:'NATIVE_FORECASTS | HEX_MACROSTATE'
    },
    {
      id:'HOST_MACROSTATE_CONTROL_SUFFICIENT',
      pass:host.path!=='HEX_MACROSTATE'||host.control_sufficient===true,
      reason:'HOST_MACROSTATE_NOT_CONTROL_SUFFICIENT',
      observed:host.path==='HEX_MACROSTATE'?bool(host.control_sufficient):'NOT_APPLICABLE',
      required:'true when host.path = HEX_MACROSTATE'
    },
    {
      id:'NATIVE_FORECASTS_WITNESSED',
      pass:host.path!=='NATIVE_FORECASTS'||host.native_forecasts_witnessed===true,
      reason:'NATIVE_FORECASTS_NOT_WITNESSED',
      observed:host.path==='NATIVE_FORECASTS'?bool(host.native_forecasts_witnessed):'NOT_APPLICABLE',
      required:'true when host.path = NATIVE_FORECASTS'
    },
    {
      id:'REAL_MODEL_FIT_APPLY',
      pass:model.real_fit_apply===true,
      reason:'REAL_MODEL_FIT_APPLY_REQUIRED',
      observed:bool(model.real_fit_apply),
      required:true
    },
    {
      id:'MODEL_EVIDENCE_SEMANTIC',
      pass:model.evidence_class==='SEMANTIC_MODEL_EVIDENCE',
      reason:'MODEL_EVIDENCE_NOT_SEMANTIC',
      observed:model.evidence_class||null,
      required:'SEMANTIC_MODEL_EVIDENCE'
    },
    {
      id:'MODEL_INTERVENTION_EXECUTED',
      pass:intervention.executed===true,
      reason:'MODEL_INTERVENTION_NOT_EXECUTED',
      observed:bool(intervention.executed),
      required:true
    },
    {
      id:'ZERO_CONTROL',
      pass:intervention.zero_control===true,
      reason:'ZERO_CONTROL_REQUIRED',
      observed:bool(intervention.zero_control),
      required:true
    },
    {
      id:'DIRECTION_CONTROL',
      pass:intervention.opposite_or_unrelated_control===true,
      reason:'DIRECTION_CONTROL_REQUIRED',
      observed:bool(intervention.opposite_or_unrelated_control),
      required:true
    },
    {
      id:'REPEATED_PROMPTS',
      pass:intervention.repeated_prompts===true,
      reason:'REPEATED_PROMPTS_REQUIRED',
      observed:bool(intervention.repeated_prompts),
      required:true
    },
    {
      id:'EXECUTION_RECEIPT',
      pass:!!text(intervention.receipt_ref),
      reason:'EXECUTION_RECEIPT_REQUIRED',
      observed:text(intervention.receipt_ref),
      required:'non-empty receipt_ref'
    }
  ];
}

export function evaluateSteeringPromotion(evidence={}){
  const checks=steeringPromotionChecks(evidence);
  const failed=checks.filter(x=>!x.pass);
  const reasons=failed.map(x=>x.reason);
  return {
    schema:PROMOTION_GATE_SCHEMA,
    authority:'EVIDENCE_ONLY',
    eligible:failed.length===0,
    status:failed.length?'BLOCKED':'ELIGIBLE_FOR_BOUNDED_PREVIEW',
    checks,
    summary:{
      passed:checks.length-failed.length,
      failed:failed.length,
      total:checks.length
    },
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
