import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LIVE_CHANGE_BRIDGE_SCHEMA,createLiveChangeBridgeState,reduceLiveChangeBridge,
  captureLiveChangeWindow,compareLiveChangeCaptures,liveChangeBridgeReturn
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
