(function(root,factory){
'use strict';
const api=factory();
if(typeof module==='object'&&module.exports)module.exports=api;
if(root)root.SleeperSourceAperture=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const KEY='sleeper:source-aperture/v1';
const BACK='sleeper:source-aperture/back/v1';
const SCHEMA='sleeper.source-aperture/v1';
const AUTHORITY='SOURCE_SELECTION_ONLY / EVIDENCE_NOT_GATE_PROOF';
const normalize=s=>String(s||'').trim().replace(/\s+/g,' ');
function hash(s){let h=2166136261;for(const c of s){h^=c.codePointAt(0);h=Math.imul(h,16777619)}return(h>>>0).toString(16).padStart(8,'0')}
function validURL(x){try{const u=new URL(x);return /^(http:|https:)$/.test(u.protocol)?u.href:''}catch{return''}}
function capture(model,witness){
  if(!model||typeof model.source!=='string'||!/^[a-f\d]{64}$/.test(model.sha256||''))throw Error('APERTURE_REQUIRES_SEALED_SOURCE');
  if(!witness||!Number.isInteger(witness.start)||!Number.isInteger(witness.end)||witness.start<0||witness.end>model.source.length||witness.end<=witness.start)throw Error('APERTURE_INVALID_SOURCE_OFFSETS');
  const node=model.nodes?.find(n=>n.id===witness.node);
  if(!node||witness.start<node.start||witness.end>node.end)throw Error('APERTURE_NODE_NOT_SOURCE_BOUND');
  const excerpt=model.source.slice(witness.start,witness.end);
  if(hash(excerpt)!==witness.quoteHash)throw Error('APERTURE_SOURCE_WITNESS_CHANGED');
  const compiled=normalize(excerpt);
  if(compiled.length<5||compiled.length>120)throw Error('APERTURE_SELECT_5_TO_120_CHAR_WITNESS');
  return Object.freeze({schema:SCHEMA,authority:AUTHORITY,document:{sha256:model.sha256,hash:model.hash,title:String(model.meta?.title||'').slice(0,200),url:validURL(model.meta?.url)},span:{start:witness.start,end:witness.end,node:witness.node,quoteHash:witness.quoteHash},excerpt,compiled});
}
function inspect(raw){
  const p=raw;
  if(!p||p.schema!==SCHEMA||p.authority!==AUTHORITY||typeof p.excerpt!=='string'||typeof p.compiled!=='string'||p.excerpt.length<5||p.excerpt.length>120||normalize(p.excerpt)!==p.compiled||p.compiled.length<5||p.compiled.length>120)throw Error('APERTURE_PACKET_INVALID');
  if(!p.document||!/^[a-f\d]{64}$/.test(p.document.sha256)||!/^[a-f\d]{8}$/.test(p.document.hash)||typeof p.document.title!=='string'||p.document.title.length>200||typeof p.document.url!=='string'||p.document.url!==validURL(p.document.url))throw Error('APERTURE_DOCUMENT_INVALID');
  const s=p.span;
  if(!s||!Number.isInteger(s.start)||!Number.isInteger(s.end)||s.start<0||s.end-s.start!==p.excerpt.length||typeof s.node!=='string'||s.node.length>100||s.quoteHash!==hash(p.excerpt))throw Error('APERTURE_SPAN_INVALID');
  return Object.freeze({schema:SCHEMA,authority:AUTHORITY,document:{sha256:p.document.sha256,hash:p.document.hash,title:p.document.title,url:p.document.url},span:{start:s.start,end:s.end,node:s.node,quoteHash:s.quoteHash},excerpt:p.excerpt,compiled:p.compiled});
}
function bind(raw,source,worldKey){
  const p=inspect(raw);
  if(normalize(source)!==p.compiled)throw Error('APERTURE_SOURCE_CHANGED');
  if(!/^[0-9A-Z]{7,}$/.test(String(worldKey||'')))throw Error('APERTURE_WORLD_KEY_INVALID');
  return Object.freeze({schema:SCHEMA,authority:AUTHORITY,document:p.document,span:p.span,worldKey,canonicalSource:p.compiled,verification:'Selected exact source offsets were checked on the AXIS side; document truth, semantic inference and native Gate proofs are NOT verified here.'});
}
return Object.freeze({KEY,BACK,SCHEMA,AUTHORITY,normalize,hash,capture,inspect,bind});
});
