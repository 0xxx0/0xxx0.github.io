(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.InterphaseChangeDag=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const VERSION='interphase-change-dag/v0.1';
  const SCHEMA='interphase.change-dag/v0.1';
  const STORAGE_PREFIX='interphase.dag.v01::';
  const clone=x=>x==null?x:JSON.parse(JSON.stringify(x));
  const canonical=x=>Array.isArray(x)?x.map(canonical):(x&&typeof x==='object'?Object.keys(x).sort().reduce((o,k)=>(o[k]=canonical(x[k]),o),{}):x);
  const stable=x=>JSON.stringify(canonical(x));

  // Deterministic 64-bit FNV-1a checksum. This is an address checksum, not a cryptographic claim.
  function checksum(value){
    const text=typeof value==='string'?value:stable(value);
    let h=0xcbf29ce484222325n;
    for(let i=0;i<text.length;i++){
      let c=text.charCodeAt(i);
      h^=BigInt(c&0xff); h=BigInt.asUintN(64,h*0x100000001b3n);
      if(c>0xff){h^=BigInt((c>>>8)&0xff); h=BigInt.asUintN(64,h*0x100000001b3n)}
    }
    return h.toString(16).padStart(16,'0');
  }
  const cid=value=>'chg:'+checksum(value);
  const baseFingerprint=source=>'base:'+checksum(source);
  const safeId=id=>encodeURIComponent(String(id||'object')).replace(/%/g,'_');
  const storageKeyFor=source=>STORAGE_PREFIX+safeId(source?.id)+'::'+baseFingerprint(source);
  const same=(a,b)=>stable(a)===stable(b);

  function semantic(api,source){
    if(api&&typeof api.semantic==='function')return api.semantic(source);
    return {title:String(source?.title??''),thesis:String(source?.thesis??''),state:String(source?.state??'SOURCE')};
  }
  function semanticDiff(api,a,b){
    if(api&&typeof api.semanticDiff==='function')return api.semanticDiff(a,b);
    const before=semantic(api,a),after=semantic(api,b),out={};
    for(const k of Object.keys(after))if(!same(before[k],after[k]))out[k]={before:before[k],after:after[k]};
    return out;
  }
  function applySemantic(api,source,patch){
    if(api&&typeof api.applySemantic==='function')return api.applySemantic(source,patch);
    return {...clone(source),...clone(patch)};
  }
  function fresh(initial){
    const source=clone(initial);
    return {schema:SCHEMA,version:VERSION,object_id:String(source?.id??''),base_fingerprint:baseFingerprint(source),genesis:source,changes:{},order:[],heads:[],selected_head:null};
  }
  function validateDocument(doc,initial){
    if(!doc||doc.schema!==SCHEMA||String(doc.object_id)!==String(initial?.id??''))return false;
    if(doc.base_fingerprint!==baseFingerprint(initial))return false;
    if(!doc.changes||!Array.isArray(doc.order)||!Array.isArray(doc.heads))return false;
    return doc.order.every(id=>doc.changes[id]&&doc.changes[id].id===id);
  }
  function parseStored(storage,key,initial){
    if(!storage||typeof storage.getItem!=='function')return null;
    try{const raw=storage.getItem(key);if(!raw)return null;const doc=JSON.parse(raw);return validateDocument(doc,initial)?doc:null}catch(_){return null}
  }
  function nodeSource(doc,head){return head&&doc.changes[head]?clone(doc.changes[head].after):clone(doc.genesis)}
  function ancestry(doc,head){
    const seen=new Set(),out=[];
    function walk(id){if(!id||seen.has(id)||!doc.changes[id])return;const n=doc.changes[id];(n.parents||[]).forEach(walk);seen.add(id);out.push(n)}
    walk(head);return out;
  }

  function createDagStore(api,initial,options={}){
    if(!api||typeof api.lens!=='function')throw new Error('INTERPHASE_DAG_REQUIRES_LENS_API');
    if(!initial||typeof initial!=='object'||!initial.id)throw new Error('INTERPHASE_DAG_REQUIRES_ADDRESSED_SOURCE');
    const storage=options.storage||null,key=options.storageKey||storageKeyFor(initial),actor=String(options.actor||'local');
    let doc=parseStored(storage,key,initial)||fresh(initial);
    let listeners=[];
    const persist=()=>{if(storage&&typeof storage.setItem==='function')storage.setItem(key,JSON.stringify(doc));return key};
    const emit=()=>listeners.slice().forEach(fn=>{try{fn(snapshot())}catch(_){}});
    const current=()=>nodeSource(doc,doc.selected_head);
    const revision=()=>doc.order.length;
    const receipt=n=>({id:n.id,op:n.op,lens:n.lens,delta:clone(n.delta),revision:n.seq,cause:n.cause||null,parents:clone(n.parents),head:n.id});
    function snapshot(){
      return {schema:doc.schema,version:doc.version,source:current(),revision:revision(),history:doc.order.map(id=>receipt(doc.changes[id])),heads:clone(doc.heads),selected_head:doc.selected_head,base_fingerprint:doc.base_fingerprint,storage_key:key,persisted:!!storage,changes:clone(doc.changes)};
    }
    function append(op,lensId,before,after,meta={}){
      const delta=semanticDiff(api,before,after);
      if(!Object.keys(delta).length)return{ok:true,no_op:true,source:current(),revision:revision(),heads:clone(doc.heads),selected_head:doc.selected_head};
      const parents=doc.selected_head?[doc.selected_head]:[];
      const material={schema:'interphase.change/v0.1',object_id:doc.object_id,parents,actor,op,lens:lensId||'PLAIN',delta,after:clone(after),cause:meta.cause||null};
      const id=cid(material);
      if(!doc.changes[id]){
        const node={...material,id,seq:doc.order.length+1,before:clone(before),at:meta.at||null};
        doc.changes[id]=node;doc.order.push(id);
      }
      for(const p of parents)doc.heads=doc.heads.filter(h=>h!==p);
      if(!doc.heads.includes(id))doc.heads.push(id);
      doc.selected_head=id;persist();emit();
      return{ok:true,no_op:false,receipt:receipt(doc.changes[id]),source:current(),revision:revision(),heads:clone(doc.heads),selected_head:id};
    }
    function edit(lensId,view,meta={}){const L=api.lens(lensId),before=current(),after=L.put(before,clone(view));return append('EDIT',L.id,before,after,meta)}
    function editPlain(patch,meta={}){const before=current(),after=applySemantic(api,before,patch||{});return append('EDIT','PLAIN',before,after,meta)}
    function returnLast(meta={}){
      if(!doc.selected_head||!doc.changes[doc.selected_head])return{ok:false,reason:'NO_SELECTED_CHANGE'};
      const target=doc.changes[doc.selected_head],before=current(),restored=applySemantic(api,before,semantic(api,target.before));
      return append('RETURN','PLAIN',before,restored,{...meta,cause:meta.cause||target.id});
    }
    function checkout(head){
      if(head!==null&&!doc.changes[head])return{ok:false,reason:'UNKNOWN_HEAD',head};
      doc.selected_head=head;persist();emit();return{ok:true,source:current(),selected_head:head,heads:clone(doc.heads)};
    }
    function project(lensId,viewState){return api.lens(lensId).project(current(),clone(viewState))}
    function exportState(){return clone(doc)}
    function importState(next){if(!validateDocument(next,initial))return{ok:false,reason:'INVALID_DOCUMENT_OR_BASE'};doc=clone(next);persist();emit();return{ok:true,snapshot:snapshot()}}
    function subscribe(fn){if(typeof fn!=='function')return()=>{};listeners.push(fn);return()=>{listeners=listeners.filter(x=>x!==fn)}}
    return Object.freeze({snapshot,source:current,project,edit,editPlain,returnLast,checkout,heads:()=>clone(doc.heads),selectedHead:()=>doc.selected_head,ancestry:()=>ancestry(doc,doc.selected_head).map(clone),persist,exportState,importState,subscribe,storageKey:()=>key,baseFingerprint:()=>doc.base_fingerprint});
  }

  return Object.freeze({VERSION,SCHEMA,STORAGE_PREFIX,stable,checksum,cid,baseFingerprint,storageKeyFor,validateDocument,createDagStore});
});
