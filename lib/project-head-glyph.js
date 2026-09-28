(function(root,factory){
  'use strict';
  const G=(typeof module==='object'&&module.exports)?require('./interphase-glyph.js'):root?.InterphaseGlyph;
  const api=factory(G);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ProjectHeadGlyph=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(G){
  'use strict';
  if(!G)throw new Error('INTERPHASE_GLYPH_REQUIRED');

  const VERSION='project-head-glyph/v0.1';
  const PASSIVE_EXIT=new Set(['AVAILABLE','DONOR','CANDIDATE','REFERENCE','DEFERRED','PARKED']);

  const arr=x=>Array.isArray(x)?x:[];
  const text=x=>String(x??'').trim();
  const uniq=xs=>[...new Set(xs.filter(Boolean))];

  function unresolvedExits(route={}){
    return arr(route?.field?.exit_paths).filter(x=>!PASSIVE_EXIT.has(text(x?.status).toUpperCase()));
  }

  function nativeRepresentation(route={},opt={}){
    if(opt.representation?.recipe&&opt.representation?.svg)return opt.representation;
    return null;
  }

  function descriptor(head={},route={},opt={}){
    if(!head||!route||!text(route.href))throw new Error('PROJECT_HEAD_ROUTE_REQUIRED');
    if(head.route&&head.route!==route.href)throw new Error('PROJECT_HEAD_ROUTE_MISMATCH');

    const children=arr(opt.children).map(x=>typeof x==='string'?x:x?.href).filter(Boolean);
    const evidence=arr(head.evidence);
    const exits=unresolvedExits(route);
    const next=head.next_executable||null;
    const operations=[
      {id:'OPEN_NATIVE',authority:'VIEW'},
      ...(children.length?[{id:'APERTURES',authority:'VIEW'}]:[]),
      ...((head.latest_return||evidence.length)?[{id:'RETURN_EVIDENCE',authority:'VIEW'}]:[])
    ].slice(0,3);
    const residue=[
      ...exits.map(x=>({channel:'evidence',kind:'EXIT',class:x.class||null,status:x.status||null,via:x.via||null})),
      ...(next?[{channel:'evidence',kind:'NEXT_EXECUTABLE',id:next.id||null,state:next.state||null}]:[]),
      ...(!head.latest_return?[{channel:'evidence',kind:'NO_LATEST_RETURN'}]:[])
    ];

    const d={
      id:'head:'+text(head.lineage||route.href),
      kind:'project-head',
      label:text(route.title||head.lineage||route.href),
      address:{route:route.href,lineage:text(head.lineage||''),version:text(head.version||route.version||'')||null},
      channels:uniq(['identity','address','depth','authority',evidence.length||head.latest_return?'evidence':null]),
      operations,
      authority:'VIEW',
      value:{
        state:text(head.state||route.state||''),
        latestReturn:head.latest_return||null,
        evidenceCount:evidence.length,
        unresolvedExitCount:exits.length,
        nextExecutable:next?{id:next.id||null,state:next.state||null}:null
      },
      ...(children.length?{children}:{}),
      ...(nativeRepresentation(route,opt)?{glyph:nativeRepresentation(route,opt)}:{})
    };
    const model=G.model(d,{projection:'GLYPH',residue});
    return Object.freeze({descriptor:d,model,residue});
  }

  function summary(head={},route={},opt={}){
    const built=descriptor(head,route,opt),v=built.descriptor.value;
    return Object.freeze({
      id:built.model.id,
      route:route.href,
      lineage:head.lineage||null,
      label:built.model.label,
      state:v.state,
      childCount:arr(opt.children).length,
      operations:built.model.operations.map(x=>x.id),
      evidenceCount:v.evidenceCount,
      unresolvedExitCount:v.unresolvedExitCount,
      nextExecutable:v.nextExecutable,
      latestReturn:v.latestReturn,
      residueCount:built.model.residue.length,
      authority:built.model.authority
    });
  }

  function svg(head={},route={},opt={}){
    const built=descriptor(head,route,opt);
    return G.svg(built.model,{size:opt.size||180});
  }

  return Object.freeze({VERSION,descriptor,summary,svg,unresolvedExits});
});
