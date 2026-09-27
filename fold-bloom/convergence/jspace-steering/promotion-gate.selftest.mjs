import assert from 'node:assert/strict';
import {evaluateSteeringPromotion,CURRENT_EVIDENCE_2026_09_27} from './promotion-gate.mjs';

const current=evaluateSteeringPromotion(CURRENT_EVIDENCE_2026_09_27);
assert.equal(current.eligible,false);
assert.equal(current.status,'BLOCKED');
assert.ok(current.reasons.includes('MODEL_EVIDENCE_NOT_SEMANTIC'));
assert.ok(current.reasons.includes('MODEL_INTERVENTION_NOT_EXECUTED'));
assert.equal(current.commit_operation,null);

const unsafeHex=evaluateSteeringPromotion({
  host:{path:'HEX_MACROSTATE',control_sufficient:false},
  model:{real_fit_apply:true,evidence_class:'SEMANTIC_MODEL_EVIDENCE'},
  intervention:{
    executed:true,zero_control:true,opposite_or_unrelated_control:true,
    repeated_prompts:true,receipt_ref:'run://controlled/1'
  }
});
assert.equal(unsafeHex.eligible,false);
assert.ok(unsafeHex.reasons.includes('HOST_MACROSTATE_NOT_CONTROL_SUFFICIENT'));

const eligible=evaluateSteeringPromotion({
  host:{path:'NATIVE_FORECASTS',native_forecasts_witnessed:true},
  model:{real_fit_apply:true,evidence_class:'SEMANTIC_MODEL_EVIDENCE'},
  intervention:{
    executed:true,zero_control:true,opposite_or_unrelated_control:true,
    repeated_prompts:true,receipt_ref:'run://controlled/1'
  }
});
assert.equal(eligible.eligible,true);
assert.equal(eligible.status,'ELIGIBLE_FOR_BOUNDED_PREVIEW');
assert.equal(eligible.commit_operation,null);

console.log(JSON.stringify({status:'PASS',current,unsafeHex,eligible},null,2));
