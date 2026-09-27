import {PULSE_SCHEMA} from './kernel.mjs';

const clone=x=>globalThis.structuredClone?structuredClone(x):JSON.parse(JSON.stringify(x));
const operationId=x=>typeof x==='string'?x:x?.id;
const operationAuthority=x=>typeof x==='string'?'VIEW':(x?.authority||'VIEW');

export function previewInterphaseDrive(hostDescription,pulse,mapping={}){
  if(pulse?.schema!==PULSE_SCHEMA||pulse?.kind!=='steering') return {ok:false,reason:'STEERING_PULSE_REQUIRED'};
  if(pulse?.data?.authority!=='NONE') return {ok:false,reason:'STEERING_PULSE_MUST_HAVE_AUTHORITY_NONE'};
  const directionRef=String(pulse?.data?.direction_ref||'');
  const directionLabel=String(pulse?.data?.direction_label||'');
  const rule=mapping[directionRef]??mapping[directionLabel]??null;
  if(!rule) return {ok:false,reason:'SUPPORT=0:STEERING_MAPPING',direction_ref:directionRef};
  const operation=typeof rule==='string'?rule:rule?.operation;
  if(!operation) return {ok:false,reason:'STEERING_MAPPING_OPERATION_REQUIRED'};
  const native=(hostDescription?.operations||[]).find(x=>operationId(x)===operation);
  if(!native) return {ok:false,reason:'SUPPORT=0:'+operation};
  return {
    ok:true,
    schema:'field-steering-host-preview/v0.1',
    authority:'PREVIEW',
    host_id:hostDescription?.id||null,
    steering:{
      request_id:pulse.data.request_id||null,
      direction_ref:directionRef,
      direction_label:directionLabel||null,
      strength:Number(pulse.data.strength)||0
    },
    candidate:{
      operation,
      native_authority:operationAuthority(native),
      reversible:typeof native==='string'?null:(native?.reversible??null),
      args:clone(typeof rule==='string'?{}:(rule?.args||{}))
    },
    commit_operation:null,
    law:'steering context may nominate one already-supported native operation; preview never invokes the host or inherits its authority'
  };
}
