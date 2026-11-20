const assert=require('assert');
const H=require('./core.js');

const binding=H.bindIdentity({
  house_id:'house.study.fan',
  capability:'power',
  entity_id:'fan.study_room'
});
assert.equal(binding.house_id,'house.study.fan');

const replaced=H.removeBinding(binding,'replaced','2026-10-04T00:00:00Z');
assert.equal(replaced.house_id,binding.house_id);
assert.equal(replaced.mapping_state,'REPLACED');

const obs=H.makeObservation({
  object:'house.study.fan',
  capability:'power',
  value:true,
  observed_at:'2026-10-04T00:00:00Z',
  received_at:'2026-10-04T00:00:01Z',
  source:{adapter:'home-assistant'}
});
const av=H.makeAvailability({
  object:'house.study.fan',
  state:'UNAVAILABLE',
  observed_at:'2026-10-04T00:10:00Z'
});
const state=H.reduce([obs,av]);
assert.equal(state.objects['house.study.fan'].capabilities.power.value,true);
assert.equal(state.objects['house.study.fan'].availability.state,'UNAVAILABLE');

assert.equal(H.freshness({
  kind:'persistent-state',
  observed_at:'2026-10-01T00:00:00Z',
  stale_after_ms:1,
  now:'2026-10-04T00:00:00Z'
}),'CURRENT');
assert.equal(H.freshness({
  kind:'periodic-sensor',
  observed_at:'2026-10-04T00:00:00Z',
  stale_after_ms:60000,
  now:'2026-10-04T00:02:00Z'
}),'STALE');

let connection='CONNECTED';
connection=H.transitionConnection(connection,'FAIL');
assert.equal(connection,'DISCONNECTED');
connection=H.transitionConnection(connection,'RETRY');
assert.equal(connection,'RECONNECTING');
connection=H.transitionConnection(connection,'CONNECTED');
assert.equal(connection,'RESYNCING');
connection=H.transitionConnection(connection,'SYNC_OK');
assert.equal(connection,'CONNECTED');

const fixture={initial:{connection:'DISCONNECTED'},events:[obs,av]};
assert.deepStrictEqual(H.replay(fixture),H.replay(fixture));

const receipt=H.makeReceipt({
  receipt_id:'r1',
  intent_id:'i1',
  object:'house.study.fan',
  capability:'power',
  status:'WOULD_SEND',
  requested:true
});
assert.equal(receipt.status,'WOULD_SEND');

const diagnostic=H.diagnostics({
  connection:'CONNECTED',
  bindings:[binding,replaced],
  errors:[{class:'ENTITY_MISSING',house_id:'house.study.fan'}]
});
assert.equal(diagnostic.bindings.bound,1);
assert.equal(diagnostic.bindings.replaced,1);
assert.equal(diagnostic.errors[0].class,'ENTITY_MISSING');

console.log('HOUSE OS core tests: PASS');
