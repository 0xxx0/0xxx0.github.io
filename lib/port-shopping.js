(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.PortShopping=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const SCHEMA='human-port-to-shopping/v0.1',EFFECT='CANDIDATE_ONLY';
 const firstUrl=text=>{const m=String(text||'').match(/https?:\/\/[^\s<>"')\]]+/i);return m?m[0]:null};
 function makeOffer({object,summary='',scope='whole',focus=null,createdAt}={}){
  if(!object?.object_id)throw Error('Port object id required');
  const at=createdAt||new Date().toISOString();
  return{
   schema:SCHEMA,created_at:at,authority:'OFFER_ONLY',native_effect:EFFECT,
   source:{
    route:'/port/',object_id:object.object_id,label:String(object.label||'Shopping candidate'),
    media_class:String(object.media_class||'FILE'),mime:object.mime||null,sha256:object.sha256||null,
    retention:object.retention||null,scope,focus:scope==='focus'?focus:null
   },
   candidate:{
    label:String(object.label||'Shopping candidate').slice(0,160),
    proposed_state:'VERIFY',source_kind:'other',source_url:firstUrl(summary),
    exact_sku:null,seller_channel:null,excerpt:String(summary||'').slice(0,1800)
   },
   law:'Candidate only. Port source identity/projection may seed Shopping evidence; Shopping alone owns lifecycle, purchase state, seller/payment action and adoption.'
  };
 }
 function validateOffer(o,nowMs=Date.now()){
  if(!o||o.schema!==SCHEMA)return{ok:false,reason:'INVALID PORT SHOPPING OFFER'};
  const age=Number(nowMs)-Date.parse(o.created_at||0);
  if(!Number.isFinite(age)||age<0||age>43200000)return{ok:false,reason:'PORT SHOPPING OFFER EXPIRED'};
  if(o.authority!=='OFFER_ONLY'||o.native_effect!==EFFECT)return{ok:false,reason:'PORT OFFER IS NOT CANDIDATE_ONLY'};
  if(!o.source?.object_id)return{ok:false,reason:'PORT OBJECT ID MISSING'};
  return{ok:true,reason:''};
 }
 function itemFromOffer(o,{id,acceptedAt,lane='CAPABILITY'}={}){
  const at=acceptedAt||new Date().toISOString(),v=validateOffer(o,Date.parse(at));if(!v.ok)throw Error(v.reason);
  return{
   id:id||('shop-'+Date.parse(at)),label:o.candidate?.label||o.source?.label||'Shopping candidate',
   need:'',category:'UNSORTED',lane,state:'VERIFY',source_kind:'other',observed_at:o.created_at,
   source_url:o.candidate?.source_url||'',exact_sku:'',seller_channel:'',
   priority:3,projects:[],interfaces:[],storage_home:null,adoption_criterion:'',next_action:'Verify exact item / SKU / seller / landed cost before decision.',gate:{},
   notes:[
    'PORT CANDIDATE · explicit ADD AS VERIFY',
    'PORT OBJECT '+o.source.object_id,
    o.source.sha256?'SHA256 '+o.source.sha256:'',
    o.source.scope==='focus'&&o.source.focus?.address?'FOCUS '+o.source.focus.address:'',
    o.candidate?.excerpt?'SOURCE EXCERPT '+o.candidate.excerpt:''
   ].filter(Boolean).join('\n'),
   cost:{quantity:1},
   source_ref:{schema:SCHEMA,port_object_id:o.source.object_id,sha256:o.source.sha256||null,scope:o.source.scope||'whole',focus:o.source.focus||null},
   imported_at:at
  };
 }
 return Object.freeze({SCHEMA,EFFECT,firstUrl,makeOffer,validateOffer,itemFromOffer});
});
