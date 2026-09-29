import {hexProjection} from '../live/hex-projection.js';
import {exactFormCalculation} from '../convergence/change-calculus/kernel.mjs';
import {steeringDescriptor} from '../../lib/field-pulse.js';

export const LIVE_CHANGE_BRIDGE_SCHEMA='fold-bloom-lab-live-change-bridge/v0.1';
export const LIVE_CHANGE_WINDOW=6;
export const LIVE_SOURCE='FOLD_BLOOM_LIVE';
export const CONTROL_VERBS=Object.freeze(['BLOOM','FOLD','SPLIT','RETURN']);

const clone=x=>globalThis.structuredClone?structuredClone(x):JSON.parse(JSON.stringify(x));
const isVerb=x=>CONTROL_VERBS.includes(String(x||'').toUpperCase());
const sameBits=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((x,i)=>Number(x)===Number(b[i]));

export function createLiveChangeBridgeState(){
  return {
    schema:LIVE_CHANGE_BRIDGE_SCHEMA,
    authority:'WITNESS_ONLY',
    operations:[],
    window:null,
    steering:null,
    last_message:null
  };
}

function operationEntry(message){
  if(message?.source!==LIVE_SOURCE||message?.kind!=='operation')return null;
  const verb=String(message?.data?.operation||'').toUpperCase();
  if(!isVerb(verb))return null;
  return {
    verb,
    seq:Math.max(0,Math.trunc(Number(message.seq)||0)),
    wall:Math.max(0,Math.trunc(Number(message.wall)||0)),
    slot:Number.isFinite(Number(message?.data?.slot))?Number(message.data.slot):null,
    chain:Number.isFinite(Number(message?.data?.chain))?Number(message.data.chain):null,
    charge:Number.isFinite(Number(message?.data?.charge))?Number(message.data.charge):null,
    track_time:Number.isFinite(Number(message?.data?.trackTime))?Number(message.data.trackTime):null,
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
    lower:projection.lower?{...projection.lower}:null,
    upper:projection.upper?{...projection.upper}:null,
    first_seq:xs[0]?.seq??null,
    last_seq:xs.at(-1)?.seq??null,
    event_refs:xs.map(x=>({seq:x.seq,wall:x.wall,verb:x.verb,slot:x.slot,chain:x.chain,track_time:x.track_time}))
  };
}

export function reduceLiveChangeBridge(state,message,{now=Date.now(),steeringMaxAgeMs=15000}={}){
  const current=state?.schema===LIVE_CHANGE_BRIDGE_SCHEMA?state:createLiveChangeBridgeState();
  const op=operationEntry(message);
  const steering=steeringDescriptor(message,now,steeringMaxAgeMs);
  if(!op&&!steering)return current;
  const operations=op?[...(current.operations||[]),op].slice(-LIVE_CHANGE_WINDOW):[...(current.operations||[])];
  return {
    schema:LIVE_CHANGE_BRIDGE_SCHEMA,
    authority:'WITNESS_ONLY',
    operations,
    window:compileWindow(operations),
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
    exact_form:[...window.exact_form],
    hex_token:window.hex_token,
    bits:[...window.bits],
    lower:window.lower?{...window.lower}:null,
    upper:window.upper?{...window.upper}:null,
    first_seq:window.first_seq,
    last_seq:window.last_seq,
    event_refs:clone(window.event_refs||[]),
    steering:state?.steering?clone(state.steering):null,
    law:'capture freezes an observed six-release LIVE window and its lossy hex projection; it does not acquire LIVE execution authority'
  };
}

export function compareLiveChangeCaptures(fromCapture,toCapture){
  if(!fromCapture?.ok||!toCapture?.ok){
    return {ok:false,schema:LIVE_CHANGE_BRIDGE_SCHEMA+'/comparison',reason:'FROM_AND_TO_CAPTURES_REQUIRED'};
  }
  const exact=exactFormCalculation(fromCapture.exact_form,toCapture.exact_form);
  if(!exact.ok)return {ok:false,schema:LIVE_CHANGE_BRIDGE_SCHEMA+'/comparison',reason:exact.reason};
  const invisible=exact.lines.filter(x=>x.invisible_exact_change);
  const visible=exact.lines.filter(x=>x.quotient_changed);
  return {
    ok:true,
    schema:LIVE_CHANGE_BRIDGE_SCHEMA+'/comparison',
    authority:'RESEARCH_WITNESS_ONLY',
    from:{hex_token:fromCapture.hex_token,bits:[...fromCapture.bits],exact_form:[...fromCapture.exact_form],first_seq:fromCapture.first_seq,last_seq:fromCapture.last_seq},
    to:{hex_token:toCapture.hex_token,bits:[...toCapture.bits],exact_form:[...toCapture.exact_form],first_seq:toCapture.first_seq,last_seq:toCapture.last_seq},
    exact_changed_lines:exact.metrics.exact_changed_lines,
    quotient_changed_lines:exact.metrics.quotient_changed_lines,
    quotient_invisible_exact_changes:exact.metrics.quotient_invisible_exact_changes,
    exact_forms_per_hexagram:exact.metrics.exact_forms_per_hexagram,
    visible_lines:visible.map(x=>({line:x.line,from_verb:x.from_verb,to_verb:x.to_verb,from_bit:x.from_bit,to_bit:x.to_bit})),
    invisible_lines:invisible.map(x=>({line:x.line,from_verb:x.from_verb,to_verb:x.to_verb,bit:x.from_bit})),
    same_hex_endpoints:sameBits(fromCapture.bits,toCapture.bits),
    formulas:{
      quotient:'q(BLOOM)=q(FOLD)=1; q(SPLIT)=q(RETURN)=0',
      fiber:'4^6 / 2^6 = 64 exact forms per hex state',
      residue:'exact edits with unchanged q-value remain invisible to the hex quotient'
    },
    law:'the comparison keeps exact release identity beside the binary quotient so same-polarity FOLD/BLOOM or SPLIT/RETURN edits remain named residue rather than disappearing'
  };
}

export function liveChangeBridgeReturn(state,{fromCapture=null,toCapture=null}={}){
  const comparison=compareLiveChangeCaptures(fromCapture,toCapture);
  return {
    schema:LIVE_CHANGE_BRIDGE_SCHEMA+'/return',
    authority:'WITNESS_ONLY',
    live_window:state?.window?.ready?clone(state.window):null,
    steering:state?.steering?clone(state.steering):null,
    from_capture:fromCapture?.ok?clone(fromCapture):null,
    to_capture:toCapture?.ok?clone(toCapture):null,
    comparison:comparison.ok?comparison:null,
    law:'RETURN preserves observed LIVE release provenance, quotient residue and any contemporaneous authority-NONE steering witness without converting any of them into control state'
  };
}
