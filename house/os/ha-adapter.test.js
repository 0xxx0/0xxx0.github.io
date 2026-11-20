const assert=require('assert');
const Core=require('./core.js');
const HA=require('./ha-adapter.js');

let called=[];
const transport={
  async connect(){},
  async disconnect(){},
  async listStates(){
    return [{entity_id:'fan.study',state:'off',last_updated:'2026-10-04T00:00:00Z'}];
  },
  async call(command){
    called.push(command);
    return {ok:true};
  }
};

const adapter=HA.create({
  core:Core,
  transport,
  clock:()=> '2026-10-04T00:00:01Z',
  bindings:[{
    house_id:'house.study.fan',
    capability:'power',
    entity_id:'fan.study',
    decode:state=>state.state==='on',
    command:intent=>({domain:'fan',service:intent.value?'turn_on':'turn_off',entity_id:'fan.study'})
  }]
});

(async()=>{
  await adapter.connect();
  assert.equal(adapter.read('house.study.fan','power').value,false);

  const shadow=await adapter.execute({
    intent_id:'i1',
    object:'house.study.fan',
    capability:'power',
    value:true,
    authority:{actor:'human',permission:'act'}
  });
  assert.equal(shadow.status,'WOULD_SEND');
  assert.equal(called.length,0);

  adapter.setMode('act');
  const sent=await adapter.execute({
    intent_id:'i2',
    object:'house.study.fan',
    capability:'power',
    value:true,
    authority:{actor:'human',permission:'act'}
  });
  assert.equal(sent.status,'SENT');
  assert.equal(called.length,1);

  const confirmed=adapter.confirm('rcpt-i2',{kind:'runtime-observation'});
  assert.equal(confirmed.status,'CONFIRMED');

  adapter.ingestState({
    entity_id:'fan.study',
    state:'unavailable',
    last_updated:'2026-10-04T00:00:02Z'
  });
  assert.equal(adapter.snapshot().diagnostics.connection,'CONNECTED');

  console.log('HOUSE HA adapter tests: PASS');
})().catch(error=>{
  console.error(error);
  process.exit(1);
});
