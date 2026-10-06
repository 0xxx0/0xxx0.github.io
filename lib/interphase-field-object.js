(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.InterphaseFieldObject=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='interphase-field-object/v0.1';
  const clone=x=>x==null?x:JSON.parse(JSON.stringify(x));

  function selectManifestRoute(manifest,href='/'){
    const routes=Array.isArray(manifest?.routes)?manifest.routes:[];
    return routes.find(r=>String(r?.href||'')===String(href||'/'))||null;
  }

  function fromManifestRoute(route){
    if(!route||!route.href)throw new Error('INTERPHASE_FIELD_ROUTE_REQUIRED');
    const href=String(route.href),role=String(route.role||route.contract?.transforms?.verb||(Array.isArray(route.transfer)?route.transfer[0]:'')||'Addressed FIELD route.');
    return {
      schema:'interphase.field-object/v0.1',
      id:href,
      kind:'FIELD_ROUTE',
      title:String(route.title||href),
      thesis:role,
      state:'SOURCE',
      provenance:{
        source:'showcase-manifest.json',
        href,
        version:route.version==null?null:String(route.version),
        updated_at:route.index?.updated_at||null
      },
      residue:{
        route_state:route.state||null,
        operation:route.operation||null,
        family:route.family||null,
        manifest_route:clone(route)
      }
    };
  }

  function fromManifest(manifest,href='/'){
    const route=selectManifestRoute(manifest,href);
    if(!route)throw new Error('INTERPHASE_FIELD_ROUTE_NOT_FOUND:'+href);
    return fromManifestRoute(route);
  }

  return Object.freeze({VERSION,selectManifestRoute,fromManifestRoute,fromManifest});
});
