(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.InterphaseEffectMachine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='interphase-effect-machine/v0.1';
  const CATCHUP_ITEM_KEY='field.catchup.items.v02';
  const clone=x=>x==null?x:JSON.parse(JSON.stringify(x));

  function parseItems(raw){try{const x=raw?JSON.parse(raw):{};return x&&typeof x==='object'&&!Array.isArray(x)?x:{}}catch(_){return{}}}
  function inspectFieldCatchup(storage,href='/'){
    const raw=storage&&typeof storage.getItem==='function'?storage.getItem(CATCHUP_ITEM_KEY):null;
    const items=parseItems(raw),stamp=Math.max(0,Number(items[String(href)])||0);
    return {key:CATCHUP_ITEM_KEY,href:String(href),present:raw!==null,stamp,items:clone(items)};
  }

  function createFieldCatchupMachine(options={}){
    const storage=options.storage;
    if(!storage||typeof storage.getItem!=='function'||typeof storage.setItem!=='function')throw new Error('INTERPHASE_EFFECT_STORAGE_REQUIRED');
    const href=String(options.href||'/');
    let state='IDLE',beforeRaw=null,receipt=null,error=null;
    const snapshot=()=>({version:VERSION,state,href,key:CATCHUP_ITEM_KEY,receipt:clone(receipt),error,inspection:inspectFieldCatchup(storage,href)});
    function prepare(){beforeRaw=storage.getItem(CATCHUP_ITEM_KEY);receipt=null;error=null;state='READY';return snapshot()}
    function commit(meta={}){
      try{
        if(state==='IDLE'||state==='COMPENSATED'||state==='FAILED')prepare();
        if(state!=='READY')return{ok:false,reason:'EFFECT_NOT_READY',snapshot:snapshot()};
        const items=parseItems(beforeRaw),beforeStamp=Math.max(0,Number(items[href])||0),requested=Number(meta.stamp);
        const stamp=Number.isFinite(requested)&&requested>0?requested:Date.now();
        items[href]=stamp;
        const afterRaw=JSON.stringify(items);
        storage.setItem(CATCHUP_ITEM_KEY,afterRaw);
        receipt={kind:'BROWSER_EFFECT',effect:'FIELD_ROUTE_SEEN',href,key:CATCHUP_ITEM_KEY,before_raw:beforeRaw,after_raw:afterRaw,before_stamp:beforeStamp,after_stamp:stamp,cause:meta.cause||null};
        state='EFFECTED';return{ok:true,receipt:clone(receipt),snapshot:snapshot()};
      }catch(err){error=String(err&&err.message||err);state='FAILED';return{ok:false,reason:'EFFECT_FAILED',snapshot:snapshot()}}
    }
    function compensate(meta={}){
      try{
        if(state!=='EFFECTED'||!receipt)return{ok:false,reason:'NO_EFFECT_TO_COMPENSATE',snapshot:snapshot()};
        if(receipt.before_raw===null&&typeof storage.removeItem==='function')storage.removeItem(CATCHUP_ITEM_KEY);
        else storage.setItem(CATCHUP_ITEM_KEY,receipt.before_raw===null?'{}':receipt.before_raw);
        receipt={...receipt,compensated:true,compensated_cause:meta.cause||receipt.cause||null};
        state='COMPENSATED';return{ok:true,receipt:clone(receipt),snapshot:snapshot()};
      }catch(err){error=String(err&&err.message||err);state='FAILED';return{ok:false,reason:'COMPENSATION_FAILED',snapshot:snapshot()}}
    }
    function reset(){state='IDLE';beforeRaw=null;receipt=null;error=null;return snapshot()}
    return Object.freeze({snapshot,prepare,commit,compensate,reset});
  }

  return Object.freeze({VERSION,CATCHUP_ITEM_KEY,inspectFieldCatchup,createFieldCatchupMachine});
});
