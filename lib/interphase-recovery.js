(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.InterphaseRecovery=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='interphase-recovery/v0.1';
  const clone=x=>x==null?x:JSON.parse(JSON.stringify(x));
  const arr=x=>Array.isArray(x)?x:[];
  function create(packet){
    if(!packet||packet.schema!=='0xxx0/interphase-recovery-packet/v0.1')throw new Error('RECOVERY_PACKET_SCHEMA_REQUIRED');
    const refs=new Map();
    const root={id:'recovery:'+packet.packet_id,kind:'recovery-packet',label:packet.subject};
    refs.set(root.id,root);
    for(const a of arr(packet.artifacts))refs.set(a.artifact_id,{...clone(a),id:a.artifact_id,kind:a.kind||'artifact',label:a.names?.[0]||a.artifact_id,_class:'artifact'});
    for(const c of arr(packet.claims))refs.set(c.claim_id,{...clone(c),id:c.claim_id,kind:'claim',label:c.field+': '+String(c.value).slice(0,80),_class:'claim'});
    arr(packet.conflicts).forEach((x,i)=>refs.set('conflict:'+i,{...clone(x),id:'conflict:'+i,kind:'conflict',label:x.label||'CONFLICT '+(i+1),_class:'conflict'}));
    arr(packet.unknowns).forEach((x,i)=>refs.set('unknown:'+i,{...clone(x),id:'unknown:'+i,kind:'unknown',label:x.label||x.field||'UNKNOWN '+(i+1),_class:'unknown'}));
    arr(packet.anti_merge_holds).forEach((x,i)=>refs.set('hold:'+i,{...clone(x),id:'hold:'+i,kind:'anti-merge-hold',label:x.label||'ANTI-MERGE '+(i+1),_class:'hold'}));

    function resolve(ref){const id=typeof ref==='string'?ref:ref?.id;if(!refs.has(id))throw new Error('RECOVERY_REF_UNRESOLVED:'+id);return refs.get(id)}
    function idOf(ref){return typeof ref==='string'?ref:ref?.id}
    function describe(ref){
      const x=resolve(ref);
      if(x.id===root.id)return{id:x.id,kind:x.kind,label:x.label,address:{packet:packet.packet_id},channels:['identity','address','content','depth','evidence'],capabilities:['read'],operations:[],authority:'VIEW',parent:null,children:[...refs.keys()].filter(k=>k!==root.id),value:{scope:packet.scope,as_of:packet.as_of,anchors:packet.anchors||[],return_paths:packet.return_paths||[]}};
      if(x._class==='artifact')return{id:x.id,kind:x.kind,label:x.label,address:{source_refs:x.source_refs||[],addresses:x.addresses||[]},channels:x.channels||['identity','address','content','evidence'],capabilities:['read'],operations:x.operations||[],authority:x.authority||'VIEW',parent:x.parent||root.id,children:[],value:x};
      if(x._class==='claim')return{id:x.id,kind:'claim',label:x.label,address:{subject_ref:x.subject_ref,source_ref:x.source_ref},channels:['identity','address','content','evidence','time'],capabilities:['read'],operations:[],authority:'VIEW',parent:x.subject_ref||root.id,children:[],value:x};
      return{id:x.id,kind:x.kind,label:x.label,address:{packet:packet.packet_id},channels:['identity','address','content','evidence'],capabilities:['read'],operations:[],authority:'VIEW',parent:root.id,children:[],value:x};
    }
    return Object.freeze({id:'recovery-packet',packet:clone(packet),idOf,resolve,describe,read:r=>describe(r).value,root:()=>root.id,refs:()=>[...refs.keys()]});
  }
  return Object.freeze({VERSION,create});
});