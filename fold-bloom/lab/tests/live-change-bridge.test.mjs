import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LIVE_CHANGE_BRIDGE_SCHEMA,createLiveChangeBridgeState,reduceLiveChangeBridge,
  captureLiveChangeWindow,compareLiveChangeCaptures,liveSteeringSupport,liveChangeBridgeReturn
} from '../live-change-bridge.js';

const op=(seq,verb,extra={})=>({
  schema:'field-pulse/v0.1',
  source:'FOLD_BLOOM_LIVE',
  instance:'live-a',
  kind:'operation',
  seq,
  wall:1000+seq,
  data:{operation:verb,slot:seq%12,chain:1,charge:.2,trackTime:seq*.5,...extra}
});

const native=(seq,targetType,call,forecasts)=>({
  schema:'FOLD_BLOOM_FORECAST_CONTEXT_0.1',
  authority:'NATIVE_EVIDENCE',
  seq,
  rotation:0,
  gate:0,
  targetType,
  anchors:[null,null,null],
  creases:[],
  charge:.2,
  call,
  mode:'RATCHET',
  forecasts
});

test('only lawful LIVE operation pulses enter the six-release witness window',()=>{
  let s=createLiveChangeBridgeState();
  const same=reduceLiveChangeBridge(s,{source:'OTHER',kind:'operation',seq:1,wall:1,data:{operation:'FOLD'}});
  assert.equal(same,s);
  s=reduceLiveChangeBridge(s,op(1,'MARK'));
  assert.equal(s.operations.length,0);
  for(const [i,verb] of ['BLOOM','FOLD','SPLIT','RETURN','BLOOM','FOLD'].entries())s=reduceLiveChangeBridge(s,op(i+1,verb));
  assert.equal(s.schema,LIVE_CHANGE_BRIDGE_SCHEMA);
  assert.equal(s.window.ready,true);
  assert.deepEqual(s.window.exact_form,['BLOOM','FOLD','SPLIT','RETURN','BLOOM','FOLD']);
  assert.equal(s.window.hex_token,'H[110|011]');
  assert.deepEqual(s.window.bits,[1,1,0,0,1,1]);
  s=reduceLiveChangeBridge(s,op(7,'RETURN'));
  assert.deepEqual(s.window.exact_form,['FOLD','SPLIT','RETURN','BLOOM','FOLD','RETURN']);
  assert.equal(s.window.first_seq,2);
  assert.equal(s.window.last_seq,7);
});

test('capture freezes exact LIVE provenance beside the lossy hex projection',()=>{
  let s=createLiveChangeBridgeState();
  for(const [i,verb] of ['BLOOM','FOLD','SPLIT','RETURN','BLOOM','FOLD'].entries())s=reduceLiveChangeBridge(s,op(i+1,verb));
  const c=captureLiveChangeWindow(s,'FROM');
  assert.equal(c.ok,true);
  assert.equal(c.role,'FROM');
  assert.equal(c.event_refs.length,6);
  assert.equal(c.event_refs[0].seq,1);
  assert.equal(c.hex_token,'H[110|011]');
  assert.deepEqual(c.exact_form,['BLOOM','FOLD','SPLIT','RETURN','BLOOM','FOLD']);
});

test('comparison keeps same-polarity exact edits as quotient residue',()=>{
  const from={ok:true,exact_form:['BLOOM','FOLD','SPLIT','RETURN','BLOOM','FOLD'],hex_token:'H[110|011]',bits:[1,1,0,0,1,1],first_seq:1,last_seq:6};
  const to={ok:true,exact_form:['FOLD','BLOOM','RETURN','SPLIT','FOLD','BLOOM'],hex_token:'H[110|011]',bits:[1,1,0,0,1,1],first_seq:7,last_seq:12};
  const c=compareLiveChangeCaptures(from,to);
  assert.equal(c.ok,true);
  assert.equal(c.same_hex_endpoints,true);
  assert.equal(c.exact_changed_lines,6);
  assert.equal(c.quotient_changed_lines,0);
  assert.equal(c.quotient_invisible_exact_changes,6);
  assert.equal(c.invisible_lines.length,6);
  assert.equal(c.exact_forms_per_hexagram,64);
});

test('same hex windows can retain unequal post-release native NEXT apertures',()=>{
  const a=native(6,0,{verb:'FOLD',chain:2,candidates:1},[
    {slot:2,verb:'FOLD',chain:2,cadence:null,span:2,power:1.3},
    {slot:5,verb:'RETURN',chain:1,cadence:null,span:0,power:.9}
  ]);
  const b=native(12,1,{verb:'RETURN',chain:1,candidates:1},[
    {slot:3,verb:'BLOOM',chain:1,cadence:null,span:0,power:1.0}
  ]);
  let s=createLiveChangeBridgeState();
  for(const [i,verb] of ['BLOOM','FOLD','SPLIT','RETURN','BLOOM','FOLD'].entries()){
    s=reduceLiveChangeBridge(s,op(i+1,verb,i===5?{nativeForecast:a}:{}));
  }
  const from=captureLiveChangeWindow(s,'FROM');
  assert.equal(from.native_after.authority,'NATIVE_EVIDENCE');
  assert.equal(from.native_after.candidate_count,2);
  for(const [i,verb] of ['FOLD','BLOOM','RETURN','SPLIT','FOLD','BLOOM'].entries()){
    s=reduceLiveChangeBridge(s,op(i+7,verb,i===5?{nativeForecast:b}:{}));
  }
  const to=captureLiveChangeWindow(s,'TO');
  const cmp=compareLiveChangeCaptures(from,to);
  assert.equal(cmp.same_hex_endpoints,true);
  assert.equal(cmp.native_next.available,true);
  assert.equal(cmp.native_next.equal,false);
  assert.equal(cmp.native_next.same_hex_unequal_native,true);
  assert.equal(cmp.native_next.from.candidate_count,2);
  assert.equal(cmp.native_next.to.candidate_count,1);
  assert.equal(cmp.native_next.from.target_type,0);
  assert.equal(cmp.native_next.to.target_type,1);
  assert.equal(from.event_refs.at(-1).native_after.candidate_count,2);
});

test('native forecast witness rejects the wrong schema or authority',()=>{
  const valid=native(1,0,{verb:'BLOOM',chain:1,candidates:1},[{slot:0,verb:'BLOOM',chain:1,span:0,power:1}]);
  let s=createLiveChangeBridgeState();
  s=reduceLiveChangeBridge(s,op(1,'BLOOM',{nativeForecast:{...valid,authority:'EFFECT'}}));
  assert.equal(s.operations[0].native_after,null);
  s=reduceLiveChangeBridge(s,op(2,'FOLD',{nativeForecast:{...valid,schema:'OTHER'}}));
  assert.equal(s.operations[1].native_after,null);
  s=reduceLiveChangeBridge(s,op(3,'FOLD',{nativeForecast:valid}));
  assert.equal(s.operations[2].native_after.authority,'NATIVE_EVIDENCE');
});

test('authority-NONE steering witness may travel beside LIVE evidence but does not become control',()=>{
  let s=createLiveChangeBridgeState();
  s=reduceLiveChangeBridge(s,{
    schema:'field-pulse/v0.1',source:'MODEL_RESEARCH',instance:'j',kind:'steering',seq:3,wall:5000,
    data:{authority:'NONE',direction_label:'FOLD',direction_ref:'dir://fold',request_id:'req-1',strength:.7}
  },{now:5100});
  assert.equal(s.steering.direction_label,'FOLD');
  assert.equal(s.steering.authority,'NONE');
  const stale=reduceLiveChangeBridge(s,{
    schema:'field-pulse/v0.1',source:'MODEL_RESEARCH',instance:'j',kind:'steering',seq:4,wall:1000,
    data:{authority:'NONE',direction_label:'RETURN'}
  },{now:20000,steeringMaxAgeMs:1000});
  assert.equal(stale,s);
});

test('direction support exposes native candidate ambiguity without acquiring effect authority',()=>{
  const aperture=native(6,0,{verb:'FOLD',chain:2,candidates:2},[
    {slot:2,verb:'FOLD',chain:2,cadence:null,span:2,power:1.3,path:[2,3]},
    {slot:5,verb:'FOLD',chain:1,cadence:'RETURN',span:1,power:1.1,path:[5]},
    {slot:8,verb:'RETURN',chain:1,cadence:null,span:0,power:.9,path:[8]}
  ]);
  let s=createLiveChangeBridgeState();
  for(const [i,verb] of ['BLOOM','FOLD','SPLIT','RETURN','BLOOM','FOLD'].entries()){
    s=reduceLiveChangeBridge(s,op(i+1,verb,i===5?{nativeForecast:aperture}:{}));
  }
  s=reduceLiveChangeBridge(s,{
    schema:'field-pulse/v0.1',source:'MODEL_RESEARCH',instance:'j',kind:'steering',seq:8,wall:5000,
    data:{authority:'NONE',direction_label:'FOLD',direction_ref:'dir://fold',request_id:'req-2',strength:.8}
  },{now:5100});
  const support=liveSteeringSupport(s);
  assert.equal(support.ok,true);
  assert.equal(support.authority,'CALCULATION_ONLY');
  assert.equal(support.status,'MULTIPLE_NATIVE_CANDIDATES');
  assert.equal(support.native_candidate_count,2);
  assert.equal(support.candidate_ambiguity_bits,1);
  assert.deepEqual(support.candidate_slots,[2,5]);
  assert.equal(support.steering.authority,'NONE');
  assert.equal(support.native.candidate_count,3);
  const returned=liveChangeBridgeReturn(s);
  assert.equal(returned.steering_support.status,'MULTIPLE_NATIVE_CANDIDATES');
  assert.equal(returned.authority,'WITNESS_ONLY');
});

test('RETURN keeps window, captures, comparison and steering as witness-only evidence',()=>{
  let s=createLiveChangeBridgeState();
  for(const [i,verb] of ['BLOOM','FOLD','SPLIT','RETURN','BLOOM','FOLD'].entries())s=reduceLiveChangeBridge(s,op(i+1,verb));
  const from=captureLiveChangeWindow(s,'FROM');
  for(const [i,verb] of ['RETURN','FOLD','SPLIT','RETURN','SPLIT','FOLD'].entries())s=reduceLiveChangeBridge(s,op(i+7,verb));
  const to=captureLiveChangeWindow(s,'TO');
  const r=liveChangeBridgeReturn(s,{fromCapture:from,toCapture:to});
  assert.equal(r.authority,'WITNESS_ONLY');
  assert.equal(r.live_window.ready,true);
  assert.equal(r.from_capture.role,'FROM');
  assert.equal(r.to_capture.role,'TO');
  assert.equal(r.comparison.ok,true);
  assert.ok(r.comparison.exact_changed_lines>=1);
});
