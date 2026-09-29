/* FIELD EGRESS v0.1
   Deterministic projection only. It classifies already-owned state; it never creates
   priority, authority, schedule, mutation, or canonical lifecycle state. */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.FieldEgress=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const ORDER=Object.freeze(['NOW','GATE','DELTA','NEXT','RESIDUE','ARCHIVE']);
  function classify(x){
    x=x||{};
    if(x.now===true)return'NOW';
    if(x.gate===true)return'GATE';
    if(x.delta===true)return'DELTA';
    if(x.next===true)return'NEXT';
    if(x.residue===true)return'RESIDUE';
    return'ARCHIVE';
  }
  function reduce(x){
    const bucket=classify(x);
    return Object.freeze({
      schema:'field-egress/v0.1',
      bucket,
      basis:Object.freeze({
        now:x?.now===true,
        gate:x?.gate===true,
        delta:x?.delta===true,
        next:x?.next===true,
        residue:x?.residue===true
      }),
      authority:'PROJECTION_ONLY'
    });
  }
  return Object.freeze({schema:'field-egress/v0.1',ORDER,classify,reduce});
});
