(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.ShoppingMarketTape=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const AVAILABILITY=['UNKNOWN','IN_STOCK','LOW_STOCK','OUT_OF_STOCK','PREORDER','LOCAL_PICKUP_ONLY'];
  const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
  const money=v=>Math.round((Number(v)||0)*100)/100;
  function landed(item){
    const c=item?.cost||{};
    return money(Math.max(0,num(c.item)-num(c.discount))+num(c.cn_freight)+num(c.intl_freight)+num(c.local_freight)+num(c.gst)+num(c.fx_friction)+num(c.failure_cost));
  }
  function offer(item){
    const o=item?.offer||{},a=String(o.availability||'UNKNOWN').toUpperCase();
    const t=Number(o.target_landed_sgd);
    return{
      availability:AVAILABILITY.includes(a)?a:'UNKNOWN',
      variant:String(o.variant||''),
      target_landed_sgd:Number.isFinite(t)&&t>=0?money(t):null,
      return_policy:String(o.return_policy||''),
      warranty:String(o.warranty||'')
    };
  }
  function snapshot(item,checkedAt=new Date().toISOString()){
    const o=offer(item);
    return{
      schema:'shopping-market-snapshot/v0.1',
      checked_at:String(checkedAt),
      landed_sgd:landed(item),
      availability:o.availability,
      variant:o.variant||null,
      exact_sku:item?.exact_sku||null,
      seller_channel:item?.seller_channel||null,
      source_url:item?.source_url||null,
      return_policy:o.return_policy||null,
      warranty:o.warranty||null
    };
  }
  function appendHistory(item,checkedAt,max=12){
    const n=Math.max(1,Math.min(24,Number(max)||12));
    const xs=Array.isArray(item?.offer_history)?item.offer_history.filter(Boolean):[];
    return xs.concat(snapshot(item,checkedAt)).slice(-n);
  }
  function summary(item){
    const xs=(Array.isArray(item?.offer_history)?item.offer_history:[]).filter(x=>x&&x.schema==='shopping-market-snapshot/v0.1');
    const prices=xs.map(x=>Number(x.landed_sgd)).filter(Number.isFinite);
    const latest=xs.at(-1)||null,prev=xs.length>1?xs.at(-2):null,o=offer(item),cur=landed(item);
    return{
      count:xs.length,
      latest,
      min_landed_sgd:prices.length?money(Math.min(...prices)):null,
      max_landed_sgd:prices.length?money(Math.max(...prices)):null,
      current_landed_sgd:cur,
      previous_landed_sgd:prev&&Number.isFinite(Number(prev.landed_sgd))?money(Number(prev.landed_sgd)):null,
      delta_from_previous_sgd:prev&&Number.isFinite(Number(prev.landed_sgd))?money(cur-Number(prev.landed_sgd)):null,
      target_landed_sgd:o.target_landed_sgd,
      target_hit:o.target_landed_sgd!=null&&cur>0&&cur<=o.target_landed_sgd
    };
  }
  return{AVAILABILITY,landed,offer,snapshot,appendHistory,summary};
});
