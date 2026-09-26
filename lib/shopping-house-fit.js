(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.ShoppingHouseFit=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const RETURN_SCHEMA='house-shopping-fit-return/v0.1';
 const EFFECT='EVIDENCE_ONLY';
 const STATUSES=Object.freeze(['PASS_ENVELOPE','FAIL_ENVELOPE','MEASURE_REQUIRED','UNKNOWN_CANDIDATE']);
 const clone=x=>x==null?x:JSON.parse(JSON.stringify(x));
 const dims=x=>({w:Number(x?.w)||0,d:Number(x?.d)||0,h:Number(x?.h)||0});
 function makeOffer({handoff,area,projection,candidate,available,rotated90=false,status,createdAt}={}){
  if(!handoff||handoff.schema!=='house-shopping-fit/v0.1')throw Error('invalid HOUSE fit handoff');
  const st=String(status||'');if(!STATUSES.includes(st))throw Error('invalid fit status');
  const at=createdAt||new Date().toISOString(),source=clone(handoff.source||{});
  return{
   schema:RETURN_SCHEMA,id:'house-fit-'+Date.parse(at)+'-'+String(source.object_id||'item'),
   created_at:at,authority:'OFFER_ONLY',native_effect:EFFECT,
   source,house:{route:'/house/',address:String(area||''),projection:String(projection||'PLAN')},
   fit:{status:st,candidate_mm:dims(candidate),available_mm:dims(available),rotated_90:!!rotated90,screen_only:true,
    law:'Dimensional envelope screen only; not ownership, installation, utility, access-path, ventilation, load, pet-clearance or adoption proof.'},
   return_to:String(handoff.return_to||'/shopping/')
  };
 }
 function validateOffer(offer,item,nowMs=Date.now()){
  if(!offer||offer.schema!==RETURN_SCHEMA)return{ok:false,reason:'INVALID HOUSE FIT RETURN SCHEMA'};
  const age=Number(nowMs)-Date.parse(offer.created_at||0);
  if(!Number.isFinite(age)||age<0||age>43200000)return{ok:false,reason:'HOUSE FIT RETURN EXPIRED'};
  const s=offer.source||{};
  if(s.route!=='/shopping/'||s.object_id!==item?.id||String(s.address||'')!==String(item?.id||''))return{ok:false,reason:'RETURN ADDRESSES ANOTHER SHOPPING ITEM'};
  if(String(s.state||'')!==String(item?.state||''))return{ok:false,reason:'SOURCE STATE CHANGED WHILE AWAY · '+String(s.state||'—')+' → '+String(item?.state||'—')};
  if(offer.authority!=='OFFER_ONLY'||offer.native_effect!==EFFECT)return{ok:false,reason:'HOUSE FIT RETURN IS NOT EVIDENCE_ONLY'};
  if(!STATUSES.includes(String(offer.fit?.status||'')))return{ok:false,reason:'UNKNOWN HOUSE FIT STATUS'};
  return{ok:true,reason:''};
 }
 function receiptFrom(offer,item,acceptedAt){
  const v=validateOffer(offer,item,Date.parse(acceptedAt||new Date().toISOString()));
  if(!v.ok)throw Error(v.reason);
  return{
   schema:'shopping-house-fit-receipt/v0.1',accepted_at:acceptedAt||new Date().toISOString(),
   offer_id:offer.id||null,house_address:offer.house?.address||null,house_projection:offer.house?.projection||null,
   fit_status:offer.fit?.status||null,candidate_mm:clone(offer.fit?.candidate_mm||null),available_mm:clone(offer.fit?.available_mm||null),
   rotated_90:!!offer.fit?.rotated_90,screen_only:true,shopping_state:item.state,effect:EFFECT,
   source_evidence_signal:offer.source?.evidence_signal||null,source_proof_boundary:offer.source?.proof_boundary||null
  };
 }
 return Object.freeze({RETURN_SCHEMA,EFFECT,STATUSES,makeOffer,validateOffer,receiptFrom});
});
