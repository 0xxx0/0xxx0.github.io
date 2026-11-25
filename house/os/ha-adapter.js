(function(root,factory){
  const api=factory(root&&root.HouseOSCore,root);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.HouseHAAdapter=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(globalCore,root){
'use strict';

const clean=v=>String(v==null?'':v).trim();
const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));

function create(options={}){
  const Core=options.core||globalCore||(typeof require==='function'?require('./core.js'):null);
  if(!Core)throw new Error('HOUSE_OS_CORE_REQUIRED');
  const transport=options.transport||{};
  const clock=options.clock||(()=>new Date().toISOString());
  let mode=clean(options.mode||'shadow').toLowerCase();
  if(!['read','shadow','act'].includes(mode))throw new Error('MODE_INVALID');
  let connection='DISCONNECTED';
  let bindings=[];
  let records=[];
  let errors=[];
  let lastConnectedAt=null,lastEventAt=null,lastSyncAt=null;
  let observationReceived=0,observationRejected=0,commandsSent=0,commandsConfirmed=0,commandsFailed=0;

  function now(){return clock()}
  function key(houseId,capability){return clean(houseId)+'#'+clean(capability)}
  function bindingByKey(houseId,capability){return bindings.find(x=>key(x.house_id,x.capability)===key(houseId,capability))||null}
  function bindingsByEntity(entityId){return bindings.filter(x=>clean(x.entity_id)===clean(entityId)&&x.mapping_state==='BOUND')}
  function error(cls,binding){errors.push({class:cls,house_id:binding&&binding.house_id||'',capability:binding&&binding.capability||''});errors=errors.slice(-50)}
  function emit(record){records.push(clone(record));if(typeof options.onRecord==='function')options.onRecord(clone(record));return record}

  function setBindings(rows=[]){
    bindings=rows.map(row=>Object.assign({},row,Core.bindIdentity(row)));
    const seen=new Set();
    bindings.forEach(b=>{const k=key(b.house_id,b.capability);if(seen.has(k)){b.mapping_state='AMBIGUOUS';error('MAPPING_AMBIGUOUS',b)}seen.add(k)});
    return clone(bindings);
  }

  function ingestState(state={}){
    lastEventAt=now();
    const entity=clean(state.entity_id);
    const matches=bindingsByEntity(entity);
    if(!matches.length){observationRejected++;return []}
    const out=[];
    matches.forEach(binding=>{
      const raw=clean(state.state).toLowerCase();
      if(raw==='unavailable'){
        out.push(emit(Core.makeAvailability({object:binding.house_id,state:'UNAVAILABLE',observed_at:state.last_updated||state.last_changed||now(),source:{adapter:'home-assistant'}})));
        return;
      }
      if(raw==='unknown'||raw===''){
        out.push(emit(Core.makeAvailability({object:binding.house_id,state:'UNKNOWN',observed_at:state.last_updated||state.last_changed||now(),source:{adapter:'home-assistant'}})));
        return;
      }
      out.push(emit(Core.makeAvailability({object:binding.house_id,state:'AVAILABLE',observed_at:state.last_updated||state.last_changed||now(),source:{adapter:'home-assistant'}})));
      try{
        const value=typeof binding.decode==='function'?binding.decode(state):state.state;
        out.push(emit(Core.makeObservation({object:binding.house_id,capability:binding.capability,value,observed_at:state.last_updated||state.last_changed||now(),received_at:now(),source:{adapter:'home-assistant',class:'runtime'},quality:'OBSERVED'})));
        observationReceived++;
      }catch(_){observationRejected++;error('INVALID_VALUE',binding)}
    });
    return out;
  }

  async function connect(){
    connection=Core.transitionConnection(connection,'RETRY');
    try{
      if(typeof transport.connect==='function')await transport.connect();
      connection=Core.transitionConnection(connection,'CONNECTED');
      lastConnectedAt=now();
      await sync();
      return connection;
    }catch(err){
      connection=Core.transitionConnection(connection,err&&err.code==='AUTH_REQUIRED'?'AUTH_REQUIRED':'FAIL');
      error(err&&err.code==='AUTH_REQUIRED'?'AUTH_REQUIRED':'CONNECTION_FAILED');
      throw err;
    }
  }

  async function disconnect(){
    if(typeof transport.disconnect==='function')await transport.disconnect();
    connection='DISCONNECTED';
    return connection;
  }

  async function sync(){
    connection='RESYNCING';
    const states=typeof transport.listStates==='function'?await transport.listStates():[];
    const byEntity=new Map((Array.isArray(states)?states:[]).map(s=>[clean(s.entity_id),s]));
    bindings.forEach(binding=>{
      if(binding.mapping_state!=='BOUND')return;
      const state=byEntity.get(clean(binding.entity_id));
      if(state)ingestState(state);
      else{binding.mapping_state='MISSING';error('ENTITY_MISSING',binding)}
    });
    lastSyncAt=now();
    connection=Core.transitionConnection('RESYNCING','SYNC_OK');
    return snapshot();
  }

  function resolve(houseId,capability){return clone(bindingByKey(houseId,capability))}

  function read(houseId,capability){
    const state=Core.reduce(records);
    const obj=state.objects[clean(houseId)]||null;
    return obj&&obj.capabilities?clone(obj.capabilities[clean(capability)]||null):null;
  }

  function compile(intent,binding){
    if(typeof binding.command==='function')return binding.command(clone(intent));
    if(binding.command&&typeof binding.command==='object')return Object.assign({},clone(binding.command),{value:clone(intent.value)});
    return {entity_id:binding.entity_id,capability:binding.capability,operation:intent.operation,value:clone(intent.value)};
  }

  async function execute(rawIntent={}){
    const intent=rawIntent.type==='INTENT'?clone(rawIntent):Core.makeIntent(rawIntent);
    const binding=bindingByKey(intent.object,intent.capability);
    const base={receipt_id:'rcpt-'+clean(intent.intent_id),intent_id:intent.intent_id,object:intent.object,capability:intent.capability,requested:clone(intent.value),adapter:'home-assistant'};
    if(!binding||binding.mapping_state!=='BOUND'){
      error('ENTITY_MISSING',binding||{house_id:intent.object,capability:intent.capability});
      return emit(Core.makeReceipt(Object.assign(base,{status:'REJECTED',error:'ENTITY_MISSING'})));
    }
    if(mode==='read')return emit(Core.makeReceipt(Object.assign(base,{status:'REJECTED',error:'READ_ONLY'})));
    const command=compile(intent,binding);
    if(mode==='shadow')return emit(Core.makeReceipt(Object.assign(base,{status:'WOULD_SEND',evidence:{kind:'shadow-command',command}})));
    try{
      if(typeof transport.call!=='function')throw new Error('TRANSPORT_CALL_REQUIRED');
      commandsSent++;
      const response=await transport.call(clone(command));
      return emit(Core.makeReceipt(Object.assign(base,{status:'SENT',command_at:now(),evidence:{kind:'runtime-ack',response:clone(response||null)}})));
    }catch(err){
      commandsFailed++;error('COMMAND_FAILED',binding);
      return emit(Core.makeReceipt(Object.assign(base,{status:'FAILED',command_at:now(),error:clean(err&&err.message||'COMMAND_FAILED')})));
    }
  }

  function confirm(receiptId,evidence){
    const prior=[...records].reverse().find(x=>x.type==='RECEIPT'&&x.receipt_id===receiptId);
    if(!prior)throw new Error('RECEIPT_NOT_FOUND');
    commandsConfirmed++;
    return emit(Core.makeReceipt(Object.assign({},prior,{status:'CONFIRMED',confirmed_at:now(),evidence:clone(evidence||{kind:'runtime-observation'})})));
  }

  function unbind(houseId,capability,reason='runtime_missing'){
    const i=bindings.findIndex(x=>key(x.house_id,x.capability)===key(houseId,capability));
    if(i<0)return null;
    bindings[i]=Core.removeBinding(bindings[i],reason,now());
    emit(Object.assign({type:'BINDING'},clone(bindings[i])));
    return clone(bindings[i]);
  }

  function diagnostics(){return Core.diagnostics({adapter:'home-assistant',connection,last_connected_at:lastConnectedAt,last_event_at:lastEventAt,last_successful_sync:lastSyncAt,bindings,observations_received:observationReceived,observations_rejected:observationRejected,commands_sent:commandsSent,commands_confirmed:commandsConfirmed,commands_failed:commandsFailed,errors})}
  function replay(fixture){return Core.replay(fixture)}
  function snapshot(){return{mode,connection,bindings:clone(bindings),records:clone(records),diagnostics:diagnostics()}}
  function setMode(next){next=clean(next).toLowerCase();if(!['read','shadow','act'].includes(next))throw new Error('MODE_INVALID');mode=next;return mode}

  setBindings(options.bindings||[]);
  return Object.freeze({connect,disconnect,sync,resolve,ingestState,read,execute,confirm,diagnostics,replay,unbind,snapshot,setMode,setBindings});
}

return Object.freeze({create});
});
