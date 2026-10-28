/* Native Threadwalk work, revision-bound. Stores no source bytes and awards no RETURN. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory;
 else root.ThreadwalkWork=factory(root.Threadwalk);
})(typeof globalThis!=='undefined'?globalThis:this,function(T){
 'use strict';
 const PREFIX='sleeper.threadwalk-work/v1:';
 function key(m){if(!/^[a-f0-9]{64}$/.test(m?.sha256||''))throw Error('WORK_SOURCE_UNSEALED');return PREFIX+m.sha256}
 function validate(m,cp){
  const session=T.resumeDraft(m,cp?.draft),ids=new Set(m.nodes.map(n=>n.id));
  if(!ids.has(cp.inspected))throw Error('WORK_INSPECTION_INVALID');
  const reading=cp.reading||{composers:[]},items=reading.composers;
  if(!Array.isArray(items)||items.length>64)throw Error('WORK_COMPOSERS_INVALID');
  const seen=new Set(),composers=items.map(c=>{
   if(!c||!ids.has(c.from)||!ids.has(c.to)||c.from===c.to||typeof c.reason!=='string'||c.reason.length>400||!['supports','contrasts','questions'].includes(c.relation))throw Error('WORK_COMPOSER_INVALID');
   const id=c.from+'|'+c.to;if(seen.has(id))throw Error('WORK_COMPOSER_DUPLICATE');seen.add(id);
   return{from:c.from,to:c.to,relation:c.relation,reason:c.reason};
  });
  const savedAt=cp.savedAt??0;if(!Number.isSafeInteger(savedAt)||savedAt<0)throw Error('WORK_REVISION_INVALID');
  if(cp.conflict!==undefined&&typeof cp.conflict!=='boolean')throw Error('WORK_CONFLICT_INVALID');
  return{draft:T.draft(m,session),inspected:cp.inspected,reading:{composers},savedAt,conflict:cp.conflict===true};
 }
 function read(m,storage){
  try{const raw=storage.getItem(key(m));if(!raw)return{state:'EMPTY',checkpoint:null};
   try{return{state:'READY',checkpoint:validate(m,JSON.parse(raw))}}catch(e){return{state:'CORRUPT',checkpoint:null,error:e.message}}
  }catch(e){return{state:'BLOCKED',checkpoint:null,error:e.message}}
 }
 function write(m,checkpoint,storage,expectedSavedAt=null){
  const cp=validate(m,checkpoint),before=read(m,storage);
  if(cp.conflict)return{state:'CONFLICT',checkpoint:null,error:'Export this local branch before explicitly replacing saved work.'};
  if(before.state==='CORRUPT'||before.state==='BLOCKED')return before;
  if(expectedSavedAt!==null&&(before.checkpoint?.savedAt??0)!==expectedSavedAt)return{state:'CONFLICT',checkpoint:null,error:'Work changed in another tab; current work remains exportable.'};
  try{storage.setItem(key(m),JSON.stringify(cp));return{state:'READY',checkpoint:cp}}
  catch(e){return{state:'BLOCKED',checkpoint:null,error:e.message}}
 }
 return Object.freeze({PREFIX,key,validate,read,write});
});
