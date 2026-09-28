(function(root,factory){
  'use strict';
  const G=(typeof module==='object'&&module.exports)?require('./interphase-glyph.js'):root?.InterphaseGlyph;
  const api=factory(G);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ProjectHeadGlyph=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(G){
  'use strict';
  if(!G)throw new Error('INTERPHASE_GLYPH_REQUIRED');

  const VERSION='project-head-glyph/v0.2';
  const PASSIVE_EXIT=new Set(['AVAILABLE','DONOR','CANDIDATE','REFERENCE','DEFERRED','PARKED']);
  const arr=x=>Array.isArray(x)?x:[];
  const text=x=>String(x??'').trim();
  const uniq=xs=>[...new Set(xs.filter(Boolean))];

  function unresolvedExits(route={}){
    return arr(route?.field?.exit_paths).filter(x=>!PASSIVE_EXIT.has(text(x?.status).toUpperCase()));
  }
  function representation(opt={}){
    const r=opt.representation;
    return r?.recipe&&r?.svg?r:null;
  }
  function descriptor(head={},route={},opt={}){
    if(!head||!route||!text(route.href))throw new Error('PROJECT_HEAD_ROUTE_REQUIRED');
    if(head.route&&head.route!==route.href)throw new Error('PROJECT_HEAD_ROUTE_MISMATCH');

    const children=arr(opt.children).map(x=>typeof x==='string'?x:x?.href).filter(Boolean);
    const evidence=arr(head.evidence);
    const exits=unresolvedExits(route);
    const next=head.next_executable||null;
    const latestReturn=head.latest_return||head.last_return||null;
    const operations=[
      {id:'OPEN_NATIVE',authority:'VIEW'},
      ...(children.length?[{id:'APERTURES',authority:'VIEW'}]:[]),
      ...((latestReturn||evidence.length)?[{id:'RETURN_EVIDENCE',authority:'VIEW'}]:[])
    ].slice(0,3);
    const residue=[
      ...exits.map(x=>({id:route.href,channel:'evidence',projection:'GLYPH',kind:'EXIT',class:x.class||null,status:x.status||null,via:x.via||null})),
      ...(next?[{id:route.href,channel:'evidence',projection:'GLYPH',kind:'NEXT_EXECUTABLE',next_id:next.id||null,state:next.state||null}]:[]),
      ...(!latestReturn?[{id:route.href,channel:'evidence',projection:'GLYPH',kind:'NO_LATEST_RETURN'}]:[])
    ];
    const d={
      id:route.href,
      kind:'project-head',
      label:text(route.title||head.lineage||route.href),
      address:{route:route.href,lineage:text(head.lineage||''),version:text(head.version||route.version||'')||null},
      channels:uniq(['identity','address',children.length?'depth':null,'authority',evidence.length||latestReturn?'evidence':null]),
      operations,
      authority:'VIEW',
      value:{
        state:text(head.state||route.state||''),
        latestReturn,
        evidenceCount:evidence.length,
        unresolvedExitCount:exits.length,
        nextExecutable:next?{id:next.id||null,state:next.state||null}:null
      },
      ...(children.length?{children}:{}),
      ...(representation(opt)?{glyph:representation(opt)}:{})
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
      residueCount:built.residue.length,
      authority:built.model.authority
    });
  }
  function svg(head={},route={},opt={}){
    const built=descriptor(head,route,opt);
    return G.svg(built.model,{size:opt.size||72,projection:'GLYPH',residue:built.residue});
  }
  return Object.freeze({VERSION,descriptor,summary,svg,unresolvedExits});
});
