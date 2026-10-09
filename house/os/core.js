(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.HouseOSCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';

const QUALITY=Object.freeze(['OBSERVED','INFERRED','STALE','UNAVAILABLE','UNKNOWN']);
const AVAILABILITY=Object.freeze(['AVAILABLE','UNAVAILABLE','UNKNOWN']);
const MAPPING=Object.freeze(['BOUND','UNBOUND','AMBIGUOUS','MISSING','REPLACED']);
const CONNECTION=Object.freeze(['CONNECTED','DISCONNECTED','RECONNECTING','RESYNCING','AUTH_REQUIRED','CONFIG_ERROR','INCOMPATIBLE']);
const RECEIPT=Object.freeze(['DRAFTED','WOULD_SEND','SENT','ACKNOWLEDGED','CONFIRMED','FAILED','TIMED_OUT','REJECTED']);
const FRESHNESS_KINDS=Object.freeze(['persistent-state','periodic-sensor','ephemeral-event']);

const clean=v=>String(v==null?'':v).trim();
const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
const iso=v=>new Date(v||Date.now()).toISOString();
const oneOf=(name,value,allowed)=>{if(!allowed.includes(value))throw new Error(name+'_INVALID');return value};
const need=(name,value)=>{if(!clean(value))throw new Error(name+'_REQUIRED');return clean(value)};

function bindIdentity(input={}){
  const state=oneOf('MAPPING_STATE',clean(input.mapping_state||'BOUND').toUpperCase(),MAPPING);
  return {
    type:'BINDING',
    house_id:need('HOUSE_ID',input.house_id),
    capability:need('CAPABILITY',input.capability),
    runtime:clean(input.runtime||'home-assistant'),
    entity_id:clean(input.entity_id),
    device_ref:clean(input.device_ref),
    integration:clean(input.integration),
    mapping_state:state,
    mapped_at:iso(input.mapped_at)
  };
}

function makeObservation(input={}){
  const quality=oneOf('QUALITY',clean(input.quality||'OBSERVED').toUpperCase(),QUALITY);
  return {
    type:'OBSERVATION',
    object:need('OBJECT',input.object),
    capability:need('CAPABILITY',input.capability),
    value:clone(input.value),
    observed_at:iso(input.observed_at),
    received_at:iso(input.received_at||input.observed_at),
    source:{
      adapter:clean(input.source&&input.source.adapter||input.adapter||'unknown'),
      class:clean(input.source&&input.source.class||'runtime')
    },
    quality
  };
}

function makeAvailability(input={}){
  return {
    type:'AVAILABILITY',
    object:need('OBJECT',input.object),
    state:oneOf('AVAILABILITY',clean(input.state||'UNKNOWN').toUpperCase(),AVAILABILITY),
    observed_at:iso(input.observed_at),
    source:{adapter:clean(input.source&&input.source.adapter||input.adapter||'unknown')}
  };
}

function freshness(input={}){
  const kind=oneOf('FRESHNESS_KIND',clean(input.kind||'persistent-state').toLowerCase(),FRESHNESS_KINDS);
  if(!input.observed_at)return 'UNKNOWN';
  if(kind==='persistent-state')return 'CURRENT';
  const limit=Number(input.stale_after_ms);
  if(!Number.isFinite(limit)||limit<0)return 'UNKNOWN';
  const age=new Date(input.now||Date.now()).getTime()-new Date(input.observed_at).getTime();
  if(!Number.isFinite(age))return 'UNKNOWN';
  return age>limit?'STALE':'CURRENT';
}

function makeIntent(input={}){
  return {
    type:'INTENT',
    intent_id:need('INTENT_ID',input.intent_id),
    object:need('OBJECT',input.object),
    capability:need('CAPABILITY',input.capability),
    operation:clean(input.operation||'SET').toUpperCase(),
    value:clone(input.value),
    issued_at:iso(input.issued_at),
    authority:{
      actor:clean(input.authority&&input.authority.actor||'unknown'),
      permission:clean(input.authority&&input.authority.permission||'draft')
    }
  };
}

function makeReceipt(input={}){
  return {
    type:'RECEIPT',
    receipt_id:need('RECEIPT_ID',input.receipt_id),
    intent_id:clean(input.intent_id),
    object:need('OBJECT',input.object),
    capability:need('CAPABILITY',input.capability),
    adapter:clean(input.adapter||'home-assistant'),
    status:oneOf('RECEIPT_STATUS',clean(input.status||'DRAFTED').toUpperCase(),RECEIPT),
    requested:clone(input.requested),
    command_at:input.command_at?iso(input.command_at):null,
    confirmed_at:input.confirmed_at?iso(input.confirmed_at):null,
    evidence:clone(input.evidence||null),
    error:clean(input.error)||null
  };
}

function transitionConnection(current,event){
  const s=oneOf('CONNECTION',clean(current||'DISCONNECTED').toUpperCase(),CONNECTION);
  const e=clean(event).toUpperCase();
  if(e==='AUTH_REQUIRED')return 'AUTH_REQUIRED';
  if(e==='CONFIG_ERROR')return 'CONFIG_ERROR';
  if(e==='INCOMPATIBLE')return 'INCOMPATIBLE';
  const table={
    CONNECTED:{FAIL:'DISCONNECTED',RESYNC:'RESYNCING'},
    DISCONNECTED:{RETRY:'RECONNECTING',CONNECTED:'RESYNCING'},
    RECONNECTING:{CONNECTED:'RESYNCING',FAIL:'DISCONNECTED'},
    RESYNCING:{SYNC_OK:'CONNECTED',FAIL:'DISCONNECTED'},
    AUTH_REQUIRED:{RETRY:'RECONNECTING'},
    CONFIG_ERROR:{RETRY:'RECONNECTING'},
    INCOMPATIBLE:{RETRY:'RECONNECTING'}
  };
  return table[s]&&table[s][e]||s;
}

function removeBinding(binding,reason='runtime_missing',at){
  const b=clone(binding||{});
  if(!b.house_id||!b.capability)throw new Error('BINDING_REQUIRED');
  const mode=clean(reason).toLowerCase();
  const state=mode==='replaced'?'REPLACED':mode==='retired'?'UNBOUND':'MISSING';
  b.mapping_state=state;
  b.removed_at=iso(at);
  b.removal_reason=mode;
  return b;
}

function reduce(records=[],initial={}){
  const out=clone(initial)||{};
  out.objects=out.objects||{};
  out.bindings=out.bindings||{};
  out.receipts=out.receipts||{};
  out.connection=out.connection||'DISCONNECTED';
  out.history=out.history||[];
  for(const raw of records){
    const x=clone(raw);
    if(!x||!x.type)continue;
    out.history.push(x);
    if(x.type==='BINDING'){
      out.bindings[x.house_id+'#'+x.capability]=x;
    }else if(x.type==='OBSERVATION'){
      const obj=out.objects[x.object]||(out.objects[x.object]={capabilities:{},availability:{state:'UNKNOWN'}});
      obj.capabilities[x.capability]={value:clone(x.value),observed_at:x.observed_at,received_at:x.received_at,quality:x.quality,source:clone(x.source)};
    }else if(x.type==='AVAILABILITY'){
      const obj=out.objects[x.object]||(out.objects[x.object]={capabilities:{},availability:{state:'UNKNOWN'}});
      obj.availability={state:x.state,observed_at:x.observed_at,source:clone(x.source)};
    }else if(x.type==='RECEIPT'){
      out.receipts[x.receipt_id]=x;
    }else if(x.type==='CONNECTION'){
      out.connection=x.state;
    }
  }
  return out;
}

function replay(fixture={}){
  return reduce(clone(fixture.events||[]),clone(fixture.initial||{}));
}

function diagnostics(input={}){
  const bindings=Array.isArray(input.bindings)?input.bindings:[];
  const counts={bound:0,missing:0,ambiguous:0,unbound:0,replaced:0};
  bindings.forEach(b=>{const k=clean(b.mapping_state).toLowerCase();if(Object.prototype.hasOwnProperty.call(counts,k))counts[k]++});
  return {
    adapter:clean(input.adapter||'home-assistant'),
    connection:oneOf('CONNECTION',clean(input.connection||'DISCONNECTED').toUpperCase(),CONNECTION),
    last_connected_at:input.last_connected_at?iso(input.last_connected_at):null,
    last_event_at:input.last_event_at?iso(input.last_event_at):null,
    last_successful_sync:input.last_successful_sync?iso(input.last_successful_sync):null,
    bindings:counts,
    observations:{received:Number(input.observations_received)||0,rejected:Number(input.observations_rejected)||0},
    commands:{sent:Number(input.commands_sent)||0,confirmed:Number(input.commands_confirmed)||0,failed:Number(input.commands_failed)||0},
    errors:(Array.isArray(input.errors)?input.errors:[]).slice(0,50).map(e=>({class:clean(e.class||'UNKNOWN'),house_id:clean(e.house_id),capability:clean(e.capability)}))
  };
}

return Object.freeze({
  QUALITY,AVAILABILITY,MAPPING,CONNECTION,RECEIPT,FRESHNESS_KINDS,
  bindIdentity,makeObservation,makeAvailability,freshness,makeIntent,makeReceipt,
  transitionConnection,removeBinding,reduce,replay,diagnostics
});
});
