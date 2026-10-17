/* FIELD-local focus projection. Topology is declared parentage, not a guessed
   similarity or a cognitive-load score. Hidden detail stays in the source. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.FieldFoveaContext=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function project(routes,focusHref){
    const xs=Array.from(routes||[]),byHref=new Map(xs.map(r=>[r.href,r]));
    const focus=byHref.get(focusHref),context=new Set();
    if(focus){
      // Keep ancestor bearings and direct children. A sibling is not an edge
      // to the focus; do not invent semantic nearness from common parentage.
      let p=focus.parent,seen=new Set([focus.href]);
      while(p&&byHref.has(p)&&!seen.has(p)){seen.add(p);context.add(p);p=byHref.get(p).parent}
      for(const r of xs)if(r.parent===focus.href)context.add(r.href);
    }
    const bands=xs.map(r=>({href:r.href,band:!focus?'PLAIN':r.href===focus.href?'FOVEA':context.has(r.href)?'PARA':'PERIPHERY'}));
    const counts={FOVEA:0,PARA:0,PERIPHERY:0,PLAIN:0};for(const x of bands)counts[x.band]++;
    return {focus:focus?.href||null,bands,counts,total:xs.length,authority:'NONE'};
  }
  return Object.freeze({project});
});
