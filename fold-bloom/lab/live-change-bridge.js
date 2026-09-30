import {hexProjection} from '../live/hex-projection.js';
import {exactFormCalculation} from '../convergence/change-calculus/kernel.mjs';
import {steeringDescriptor} from '../../lib/field-pulse.js';
import {directionSupportCalculation} from '../convergence/jspace-steering/steering-calculus.mjs';

export const LIVE_CHANGE_BRIDGE_SCHEMA='fold-bloom-lab-live-change-bridge/v0.1';
export const LIVE_CHANGE_WINDOW=6;
export const LIVE_SOURCE='FOLD_BLOOM_LIVE';
export const CONTROL_VERBS=Object.freeze(['BLOOM','FOLD','SPLIT','RETURN']);

const clone=x=>globalThis.structuredClone?structuredClone(x):JSON.parse(JSON.stringify(x));
const isVerb=x=>CONTROL_VERBS.includes(String(x||'').toUpperCase());
const sameBits=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((x,i)=>Number(x)===Number(b[i]));
const nativeForecastWitness=input=>{
  if(input?.schema!=='FOLD_BLOOM_FORECAST_CONTEXT_0.1'||input?.authority!=='NATIVE_EVIDENCE')return null;
  const forecasts=(Array.isArray(input.forecasts)?input.forecasts:[]).filter(x=>isVerb(x?.verb)).map(x=>({
    slot:Number(x.slot),
    type:Number.isFinite(Number(x.type))?Number(x.type):null,
    type_name:x.typeName?String(x.typeName):null,
    verb:String(x.verb).toUpperCase(),
    chain:Number(x.chain)||1,
    cadence:x.cadence?String(x.cadence):null,
    path:Array.isArray(x.path)?x.path.map(Number):[],
    edge_added:Array.isArray(x.edgeAdded)?x.edgeAdded.map(Number):null,
    span:Number(x.span)||0,
    power:Number(x.power)||0
  })).sort((a,b)=>a.slot-b.slot||a.verb.localeCompare(b.verb));
  return {
    schema:input.schema,
    authority:'NATIVE_EVIDENCE',
    seq:Math.max(0,Math.trunc(Number(input.seq)||0)),
    gate:Number.isFinite(Number(input.gate))?Number(input.gate):null,
    target_type:Number.isFinite(Number(input.targetType))?Number(input.targetType):null,
    charge:Number(input.charge)||0,
    call:input.call?{verb:String(input.call.verb||''),chain:Number(input.call.chain)||1,candidates:Number(input.call.candidates)||0}:null,
    candidate_count:forecasts.length,
    forecasts
  };
};
const nativeSignature=x=>x?JSON.stringify({target_type:x.target_type,call:x.call,forecasts:x.forecasts}):null;

export function createLiveChangeBridgeState(){
  return {
    schema:LIVE_CHANGE_BRIDGE_SCHEMA,
    authority:'WITNESS_ONLY',
    live_instance:null,
    operations:[],
    window:null,
    native_latest:null,
    steering:null,
    last_message:null
  };
}

function operationEntry(message){
  if(message?.source!==LIVE_SOURCE||message?.kind!=='operation')return null;
  const verb=String(message?.data?.operation||'').toUpperCase();
  const instance=String(message?.instance||'').trim();
  if(!isVerb(verb)||!instance)return null;
  return {
    verb,
    instance,
    seq:Math.max(0,Math.trunc(Number(message.seq)||0)),
    wall:Math.max(0,Math.trunc(Number(message.wall)||0)),
    slot:Number.isFinite(Number(message?.data?.slot))?Number(message.data.slot):null,
    chain:Number.isFinite(Number(message?.data?.chain))?Number(message.data.chain):null,
    charge:Number.isFinite(Number(message?.data?.charge))?Number(message.data.charge):null,
    track_time:Number.isFinite(Number(message?.data?.trackTime))?Number(message.data.trackTime):null,
    native_after:nativeForecastWitness(message?.data?.nativeForecast),
    source:LIVE_SOURCE
  };
}

function compileWindow(operations){
  const xs=(operations||[]).slice(-LIVE_CHANGE_WINDOW);
  if(xs.length<LIVE_CHANGE_WINDOW){
    return {
      ready:false,
      count:xs.length,
      needed:LIVE_CHANGE_WINDOW-xs.length,
      exact_form:null,
      hex_token:null,
      bits:null,
      live_instance:xs[0]?.instance??null,
      first_seq:xs[0]?.seq??null,
      last_seq:xs.at(-1)?.seq??null
    };
  }
  const exactForm=xs.map(x=>x.verb),projection=hexProjection(exactForm);
  return {
    ready:true,
    count:xs.length,
    needed:0,
    exact_form:exactForm,
    hex_token:projection.token,
    bits:[...(projection.bits||[])],
    live_instance:xs[0]?.instance??null,
    lower:projection.lower?{...projection.lower}:null,
    upper:projection.upper?{...projection.upper}:null,
    first_seq:xs[0]?.seq??null,
    last_seq:xs.at(-1)?.seq??null,
    native_after:xs.at(-1)?.native_after?clone(xs.at(-1).native_after):null,
    event_refs:xs.map(x=>({instance:x.instance,seq:x.seq,wall:x.wall,verb:x.verb,slot:x.slot,chain:x.chain,track_time:x.track_time,native_after:x.native_after?clone(x.native_after):null}))
  };
}

export function reduceLiveChangeBridge(state,message,{now=Date.now(),steeringMaxAgeMs=15000}={}){
  const current=state?.schema===LIVE_CHANGE_BRIDGE_SCHEMA?state:createLiveChangeBridgeState();
  const op=operationEntry(message);
  const steering=steeringDescriptor(message,now,steeringMaxAgeMs);
  if(!op&&!steering)return current;
  const instanceChanged=!!(op&&current.live_instance&&op.instance!==current.live_instance);
  const operations=op?(instanceChanged?[op]:[...(current.operations||[]),op].slice(-LIVE_CHANGE_WINDOW)):[...(current.operations||[])];
  const nativeLatest=op
    ?(op.native_after?clone(op.native_after):(instanceChanged?null:(current.native_latest?clone(current.native_latest):null)))
    :(current.native_latest?clone(current.native_latest):null);
  return {
    schema:LIVE_CHANGE_BRIDGE_SCHEMA,
    authority:'WITNESS_ONLY',
    live_instance:op?op.instance:(current.live_instance||null),
    operations,
    window:compileWindow(operations),
    native_latest:nativeLatest,
    steering:steering?{
      source:steering.source,
      seq:steering.seq,
      wall:steering.wall,
      direction_label:steering.directionLabel,
      direction_ref:steering.directionRef||null,
      request_id:steering.requestId||null,
      strength:steering.strength,
      authority:'NONE',
      return_ref:steering.returnRef||null
    }:(current.steering?{...current.steering}:null),
    last_message:{source:String(message?.source||''),kind:String(message?.kind||''),seq:Number(message?.seq)||0,wall:Number(message?.wall)||0}
  };
}

export function captureLiveChangeWindow(state,role='CAPTURE'){
  const window=state?.window;
  if(!window?.ready)return {ok:false,schema:LIVE_CHANGE_BRIDGE_SCHEMA+'/capture',reason:'SIX_LIVE_OPERATIONS_REQUIRED',count:window?.count||0};
  return {
    ok:true,
    schema:LIVE_CHANGE_BRIDGE_SCHEMA+'/capture',
    authority:'WITNESS_ONLY',
    role:String(role||'CAPTURE').toUpperCase(),
    live_instance:window.live_instance||state?.live_instance||null,
    exact_form:[...window.exact_form],
    hex_token:window.hex_token,
    bits:[...window.bits],
    lower:window.lower?{...window.lower}:null,
    upper:window.upper?{...window.upper}:null,
    first_seq:window.first_seq,
    last_seq:window.last_seq,
    event_refs:clone(window.event_refs||[]),
    native_after:window.native_after?clone(window.native_after):null,
    steering:state?.steering?clone(state.steering):null,
    law:'capture freezes one LIVE-instance six-release window and its lossy hex projection; it does not acquire LIVE execution authority'
  };
}

export function compareLiveChangeCaptures(fromCapture,toCapture){
  if(!fromCapture?.ok||!toCapture?.ok){
    return {ok:false,schema:LIVE_CHANGE_BRIDGE_SCHEMA+'/comparison',reason:'FROM_AND_TO_CAPTURES_REQUIRED'};
  }
  const fromInstance=String(fromCapture.live_instance||''),toInstance=String(toCapture.live_instance||'');
  if(!fromInstance||!toInstance){
    return {ok:false,schema:LIVE_CHANGE_BRIDGE_SCHEMA+'/comparison',reason:'LIVE_INSTANCE_REQUIRED',from_instance:fromInstance||null,to_instance:toInstance||null};
  }
  if(fromInstance!==toInstance){
    return {ok:false,schema:LIVE_CHANGE_BRIDGE_SCHEMA+'/comparison',reason:'LIVE_INSTANCE_MISMATCH',from_instance:fromInstance,to_instance:toInstance};
  }
  const exact=exactFormCalculation(fromCapture.exact_form,toCapture.exact_form);
  if(!exact.ok)return {ok:false,schema:LIVE_CHANGE_BRIDGE_SCHEMA+'/comparison',reason:exact.reason};
  const invisible=exact.lines.filter(x=>x.invisible_exact_change);
  const visible=exact.lines.filter(x=>x.quotient_changed);
  const fromNative=fromCapture.native_after||null,toNative=toCapture.native_after||null;
  const fromNativeSignature=nativeSignature(fromNative),toNativeSignature=nativeSignature(toNative);
  const nativeEqual=fromNativeSignature&&toNativeSignature?fromNativeSignature===toNativeSignature:null;
  const sameHex=sameBits(fromCapture.bits,toCapture.bits);
  return {
    ok:true,
    schema:LIVE_CHANGE_BRIDGE_SCHEMA+'/comparison',
    authority:'RESEARCH_WITNESS_ONLY',
    from:{live_instance:fromInstance,hex_token:fromCapture.hex_token,bits:[...fromCapture.bits],exact_form:[...fromCapture.exact_form],first_seq:fromCapture.first_seq,last_seq:fromCapture.last_seq},
    to:{live_instance:toInstance,hex_token:toCapture.hex_token,bits:[...toCapture.bits],exact_form:[...toCapture.exact_form],first_seq:toCapture.first_seq,last_seq:toCapture.last_seq},
    exact_changed_lines:exact.metrics.exact_changed_lines,
    quotient_changed_lines:exact.metrics.quotient_changed_lines,
    quotient_invisible_exact_changes:exact.metrics.quotient_invisible_exact_changes,
    exact_forms_per_hexagram:exact.metrics.exact_forms_per_hexagram,
    visible_lines:visible.map(x=>({line:x.line,from_verb:x.from_verb,to_verb:x.to_verb,from_bit:x.from_bit,to_bit:x.to_bit})),
    invisible_lines:invisible.map(x=>({line:x.line,from_verb:x.from_verb,to_verb:x.to_verb,bit:x.from_bit})),
    same_hex_endpoints:sameHex,
    native_next:{
      available:!!(fromNative&&toNative),
      equal:nativeEqual,
      from:fromNative?clone(fromNative):null,
      to:toNative?clone(toNative):null,
      same_hex_unequal_native:sameHex&&nativeEqual===false
    },
    formulas:{
      quotient:'q(BLOOM)=q(FOLD)=1; q(SPLIT)=q(RETURN)=0',
      fiber:'4^6 / 2^6 = 64 exact forms per hex state',
      residue:'exact edits with unchanged q-value remain invisible to the hex quotient',
      native:'post-commit native forecast apertures are compared as evidence; recent exact history and hex state never substitute for current LIVE support'
    },
    law:'the comparison keeps exact release identity, the binary quotient and any observed post-commit native forecast aperture unequal, so compression loss stays visible instead of becoming control authority'
  };
}

export function liveSteeringSupport(state){
  const steering=state?.steering||null,native=state?.native_latest||state?.window?.native_after||null;
  if(!steering)return {ok:false,schema:LIVE_CHANGE_BRIDGE_SCHEMA+'/steering-support',authority:'CALCULATION_ONLY',reason:'STEERING_WITNESS_REQUIRED'};
  if(!native)return {
    ok:false,
    schema:LIVE_CHANGE_BRIDGE_SCHEMA+'/steering-support',
    authority:'CALCULATION_ONLY',
    reason:'NATIVE_FORECAST_WITNESS_REQUIRED',
    steering:clone(steering)
  };
  const support=directionSupportCalculation(steering.direction_label,native.forecasts||[]);
  return {
    ...support,
    schema:LIVE_CHANGE_BRIDGE_SCHEMA+'/steering-support',
    steering:clone(steering),
    native:{
      seq:native.seq,
      target_type:native.target_type,
      call:native.call?clone(native.call):null,
      candidate_count:native.candidate_count
    },
    support_source:'LATEST_NATIVE_APERTURE',
    law:'the last accepted authority-NONE steering direction is compared with the latest witnessed native forecast aperture only; support is descriptive preview evidence and never a commit instruction'
  };
}

export function liveChangeBridgeReturn(state,{fromCapture=null,toCapture=null}={}){
  const comparison=compareLiveChangeCaptures(fromCapture,toCapture);
  return {
    schema:LIVE_CHANGE_BRIDGE_SCHEMA+'/return',
    authority:'WITNESS_ONLY',
    live_window:state?.window?.ready?clone(state.window):null,
    native_latest:state?.native_latest?clone(state.native_latest):null,
    steering:state?.steering?clone(state.steering):null,
    steering_support:liveSteeringSupport(state),
    from_capture:fromCapture?.ok?clone(fromCapture):null,
    to_capture:toCapture?.ok?clone(toCapture):null,
    comparison:comparison.ok?comparison:null,
    law:'RETURN preserves one-instance LIVE release provenance, the independently current native aperture, quotient residue, bounded native-next evidence and any contemporaneous authority-NONE steering witness without converting any of them into control state'
  };
}
