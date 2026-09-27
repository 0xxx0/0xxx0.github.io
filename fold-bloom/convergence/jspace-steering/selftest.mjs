import assert from 'node:assert/strict';
import {normalizeTrace,readCell,buildSteeringRequest,witnessSteering,steeringPulse,TRACE_SCHEMA} from './kernel.mjs';
import {previewFoldBloomDrive} from './fold-bloom-adapter.mjs';
import {previewInterphaseDrive} from './interphase-adapter.mjs';

function fixture(trace_id='trace-before',token='FOLD'){
  return {
    schema:TRACE_SCHEMA,
    trace_id,
    model:{id:'Qwen/Qwen2.5-1.5B',revision:'fixture',n_layers:28},
    lens:{id:'local/jlens-demo',revision:'fixture',n_prompts:100,d_model:1536},
    source:{prompt:'Choose one control verb.',token_count:5,token_ids:[11,12,13,14,15]},
    cells:[
      {layer:12,position:4,top:[{token_id:token==='RETURN'?102:100,token,logit:4.2,rank:1},{token_id:101,token:'BLOOM',logit:3.8,rank:2}]},
      {layer:27,position:4,kind:'MODEL_OUTPUT',top:[{token_id:102,token:'RETURN',logit:5.1,rank:1}]}
    ]
  };
}

const trace=normalizeTrace(fixture());
assert.equal(trace.cells.length,2);
assert.deepEqual(trace.source.token_ids,[11,12,13,14,15]);
assert.equal(readCell(trace,{layer:12,position:4}).top[0].token,'FOLD');
assert.throws(()=>buildSteeringRequest(trace,{target:{layer:12,position:4},direction:{label:'upbeat'}}),/STEERING_DIRECTION_REF_REQUIRED/);

const req=buildSteeringRequest(trace,{
  target:{layer:12,position:4},
  direction:{ref:'direction://demo/fold-to-return',label:'FOLD→RETURN',space:'RESIDUAL_STREAM'},
  strength:0.75
});
assert.equal(req.commit_required,true);
assert.equal(req.return_required,true);

const after=fixture('trace-after','RETURN');
const observationOnly=witnessSteering(trace,after,req,{});
assert.equal(observationOnly.observed.top_changed,true);
assert.match(observationOnly.causal_claim,/OBSERVATIONAL/);
const witnessed=witnessSteering(trace,after,req,{committed:true,receipt_ref:'run://demo/001',executor:'model-side-driver'});
assert.match(witnessed.causal_claim,/INTERVENTION_EXECUTED/);
const wrongRevision=fixture('trace-wrong-revision','RETURN');
wrongRevision.model.revision='other-revision';
assert.throws(()=>witnessSteering(trace,wrongRevision,req,{committed:true,receipt_ref:'run://demo/002'}),/STEERING_INSTRUMENT_MISMATCH/);

const pulse=steeringPulse(req,witnessed,{wall:1,at:2});
assert.equal(pulse.kind,'steering');
assert.equal(pulse.data.authority,'NONE');
assert.equal(pulse.data.model_authority,'MODEL_INTERVENTION');

const hostDescription={id:'READFIELD',operations:[{id:'SEEK',authority:'VIEW',reversible:true},{id:'SCALE',authority:'VIEW',reversible:true}]};
const hostBefore=structuredClone(hostDescription);
const hostPreview=previewInterphaseDrive(hostDescription,pulse,{
  'direction://demo/fold-to-return':{operation:'SEEK',args:{fraction:.5}}
});
assert.equal(hostPreview.ok,true);
assert.equal(hostPreview.authority,'PREVIEW');
assert.equal(hostPreview.candidate.operation,'SEEK');
assert.equal(hostPreview.candidate.native_authority,'VIEW');
assert.equal(hostPreview.commit_operation,null);
assert.deepEqual(hostDescription,hostBefore);
assert.equal(previewInterphaseDrive(hostDescription,pulse,{}).reason,'SUPPORT=0:STEERING_MAPPING');

const state={schema:'FOLD_BLOOM_LIVE_0.13',seq:7,rotation:2,targetType:1,cells:[{id:0,type:1}],history:[]};
const beforeState=structuredClone(state);
const chosen='FOLD';
const forecasts=[{slot:2,verb:'FOLD',chain:2,power:1.4,cadence:null},{slot:5,verb:'RETURN',chain:1,power:1.1,cadence:null}];
const drive=previewFoldBloomDrive(state,forecasts,fixture('fold-bloom-drive',chosen),{layer:12,position:4});
assert.equal(drive.ok,true);
assert.equal(drive.authority,'PREVIEW');
assert.equal(drive.mapped_verb,chosen);
assert.ok(drive.candidates.length>=1);
assert.deepEqual(state,beforeState);
assert.equal(drive.commit_operation,null);

const outside=previewFoldBloomDrive(state,forecasts,fixture('outside','RUGBY'),{layer:12,position:4});
assert.equal(outside.ok,false);
assert.equal(outside.reason,'TOKEN_OUTSIDE_CONTROL_VOCABULARY');
assert.deepEqual(state,beforeState);

console.log(JSON.stringify({
  status:'PASS',
  checks:[
    'trace schema + cell address',
    'token observation cannot substitute for causal direction ref',
    'steering request requires commit + return',
    'before/after witness distinguishes observation from executed intervention',
    'field-pulse envelope carries authority NONE',
    'generic INTERPHASE steering preview requires explicit host mapping and preserves host authority',
    'Fold/Bloom preview maps only explicit control vocabulary to native lawful forecasts',
    'Fold/Bloom canonical LIVE state remains byte-equivalent under preview'
  ],
  chosenVerb:chosen,
  candidateCount:drive.candidates.length
},null,2));
