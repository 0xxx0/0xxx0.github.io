(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ShoppingLooter=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const PACKET_SCHEMA='shopping-looter-packet/v0.1';
  const RETURN_SCHEMA='shopping-looter-return/v0.1';
  const AUTHORITY='RESEARCH_ONLY / NO_EFFECT';
  const PRE=new Set(['NEED','QUERY','FOUND','VERIFY','WATCH','DECIDE','HOLD']);
  const clone=x=>x==null?x:JSON.parse(JSON.stringify(x));
  const arr=x=>Array.isArray(x)?x:[];
  const text=x=>x==null?'':String(x);
  const num=x=>{const n=Number(x);return Number.isFinite(n)?n:null};
  const money=x=>{const n=num(x);return n==null?null:Math.round(n*100)/100};
  const isoMs=x=>{const n=Date.parse(x||0);return Number.isFinite(n)?n:null};
  function watchConfig(item={}){
    const w=item.watch||{},cad=Math.max(1,Math.min(720,Number(w.cadence_hours)||24));
    return{enabled:w.enabled===true,cadence_hours:cad,query:text(w.query),pickup_hint:text(w.pickup_hint),last_checked_at:text(w.last_checked_at),next_due_at:text(w.next_due_at)};
  }
  function due(item={},now=new Date().toISOString()){
    const w=watchConfig(item),state=text(item.state).toUpperCase();
    if(!w.enabled||!PRE.has(state))return false;
    const nowMs=isoMs(now);if(nowMs==null)return false;
    const explicit=isoMs(w.next_due_at);if(explicit!=null)return nowMs>=explicit;
    const last=isoMs(w.last_checked_at||item.observed_at);if(last==null)return true;
    return nowMs-last>=w.cadence_hours*3600000;
  }
  function identity(item={}){
    return{text:item.id,source_url:text(item.source_url),exact_sku:text(item.exact_sku),seller_channel:text(item.seller_channel),state:text(item.state)};
  }
  function makePacket(items=[],now=new Date().toISOString()){
    const jobs=arr(items).filter(x=>due(x,now)).map(item=>{
      const w=watchConfig(item),o=item.offer||{};
      return{
        item_id:text(item.id),label:text(item.label),source_state:text(item.state),
        source_url:text(item.source_url)||null,exact_sku:text(item.exact_sku)||null,seller_channel:text(item.seller_channel)||null,
        query:w.query||text(item.label),pickup_hint:w.pickup_hint||null,cadence_hours:w.cadence_hours,
        target_landed_sgd:num(o.target_landed_sgd),last_checked_at:w.last_checked_at||item.observed_at||null,
        requirements:['checked_at','availability','exact listing/variant identity','landed SGD when available','seller/channel','return/warranty when material','thumbnail_url when a trustworthy product/listing image exists']
      };
    });
    return{
      schema:PACKET_SCHEMA,id:'loot-'+Date.parse(now),created_at:now,authority:AUTHORITY,
      instruction:'Refresh only the listed exact Shopping objects. Do not purchase, message sellers, log in, alter accounts, or change lifecycle. Preserve UNKNOWN when evidence is missing. Return '+RETURN_SCHEMA+'.',
      jobs
    };
  }
  function validateReturn(bundle={},items=[]){
    const errors=[];if(bundle.schema!==RETURN_SCHEMA)errors.push('schema');
    if(bundle.authority!==AUTHORITY)errors.push('authority');
    const byId=new Map(arr(items).map(x=>[text(x.id),x]));
    for(const [i,r] of arr(bundle.results).entries()){
      const it=byId.get(text(r?.item_id));if(!it){errors.push('result '+i+' unknown item');continue}
      if(text(r.source_state)!==text(it.state))errors.push('result '+i+' source state changed');
      if(r.source_url&&it.source_url&&text(r.source_url)!==text(it.source_url))errors.push('result '+i+' source url changed');
      if(!isoMs(r.checked_at))errors.push('result '+i+' checked_at');
    }
    return{ok:errors.length===0,errors};
  }
  function snapshotFrom(item={},r={}){
    return{
      schema:'shopping-market-snapshot/v0.1',
      checked_at:text(r.checked_at),
      landed_sgd:money(r.landed_sgd),
      availability:text(r.availability||'UNKNOWN').toUpperCase(),
      variant:text(r.variant)||null,
      exact_sku:text(r.exact_sku||item.exact_sku)||null,
      seller_channel:text(r.seller_channel||item.seller_channel)||null,
      source_url:text(r.source_url||item.source_url)||null,
      return_policy:text(r.return_policy)||null,
      warranty:text(r.warranty)||null
    };
  }
  function applyReturn(items=[],bundle={}){
    const check=validateReturn(bundle,items);if(!check.ok)return{ok:false,errors:check.errors,items:clone(items),accepted:[],rejected:[]};
    const out=clone(items),byId=new Map(out.map((x,i)=>[text(x.id),i])),accepted=[],rejected=[];
    for(const r of arr(bundle.results)){
      const idx=byId.get(text(r.item_id));if(idx==null){rejected.push({item_id:r.item_id,reason:'missing'});continue}
      const it=out[idx],before=text(it.state),snap=snapshotFrom(it,r);
      it.offer_history=arr(it.offer_history).filter(Boolean).concat(snap).slice(-12);
      it.observed_at=snap.checked_at;
      it.offer={...(it.offer||{}),availability:snap.availability,variant:snap.variant||'',return_policy:snap.return_policy||'',warranty:snap.warranty||''};
      if(num(r.item_sgd)!=null){it.cost=it.cost||{};it.cost.item=money(r.item_sgd)}
      if(num(r.local_freight_sgd)!=null){it.cost=it.cost||{};it.cost.local_freight=money(r.local_freight_sgd)}
      if(num(r.gst_sgd)!=null){it.cost=it.cost||{};it.cost.gst=money(r.gst_sgd)}
      if(r.exact_sku&&!it.exact_sku)it.exact_sku=text(r.exact_sku);
      if(r.seller_channel&&!it.seller_channel)it.seller_channel=text(r.seller_channel);
      const w=watchConfig(it),checked=isoMs(r.checked_at),next=new Date(checked+w.cadence_hours*3600000).toISOString();
      it.watch={...(it.watch||{}),enabled:true,cadence_hours:w.cadence_hours,last_checked_at:snap.checked_at,next_due_at:next};
      if(r.thumbnail_url){
        it.media=it.media||{};
        if(!it.media.thumbnail?.src)it.media.thumbnail={kind:'remote',src:text(r.thumbnail_url),source_url:snap.source_url,observed_at:snap.checked_at,provenance:'SHOP LOOTER return'};
      }
      if(text(it.state)!==before)throw Error('SHOP LOOTER mutated lifecycle');
      accepted.push(text(it.id));
    }
    return{ok:true,errors:[],items:out,accepted,rejected};
  }
  return Object.freeze({PACKET_SCHEMA,RETURN_SCHEMA,AUTHORITY,watchConfig,due,makePacket,validateReturn,applyReturn,snapshotFrom});
});