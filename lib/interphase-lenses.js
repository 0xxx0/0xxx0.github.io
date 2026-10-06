(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.InterphaseLenses=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const VERSION='interphase-lenses/v0.1';
  const GENESIS_ID='obj:genesis#0';
  const SEMANTIC_FIELDS=Object.freeze(['title','thesis','state']);
  const PROTECTED_FIELDS=Object.freeze(['id','kind','schema','provenance']);
  const STATES=Object.freeze({
    SOURCE:Object.freeze({name:'SOURCE',mark:'⚊',zh:'天',projection:'solid · rising',glyph:'路'}),
    HOLD:Object.freeze({name:'HOLD',mark:'𝌀',zh:'人',projection:'mixed · held',glyph:'◈'}),
    RETURN:Object.freeze({name:'RETURN',mark:'⚋',zh:'地',projection:'broken · falling',glyph:'↺'})
  });

  const clone=x=>x==null?x:JSON.parse(JSON.stringify(x));
  const canonical=x=>Array.isArray(x)?x.map(canonical):(x&&typeof x==='object'?Object.keys(x).sort().reduce((o,k)=>(o[k]=canonical(x[k]),o),{}):x);
  const stable=x=>JSON.stringify(canonical(x));
  const same=(a,b)=>stable(a)===stable(b);
  const validState=x=>Object.prototype.hasOwnProperty.call(STATES,String(x||'').toUpperCase());
  const stateName=x=>validState(x)?String(x).toUpperCase():'SOURCE';
  const stateSpec=x=>STATES[stateName(x)];

  function createGenesisObject(overrides={}){
    const base={
      schema:'interphase.object/v0.1',
      id:GENESIS_ID,
      kind:'INTERPHASE_GENESIS',
      title:'INTERPHASE',
      thesis:'One object, preserved across every projection and every state. Representation is never the object.',
      state:'SOURCE',
      provenance:{
        origin:'/interphase-genesis/',
        recovered:'2026-10-03',
        lineage:'INTERPHASE-PROTO-1'
      }
    };
    const out={...base,...clone(overrides)};
    out.schema=base.schema;
    out.id=base.id;
    out.kind=base.kind;
    out.provenance=clone(base.provenance);
    out.state=stateName(out.state);
    return out;
  }

  function semantic(source){
    return {
      title:String(source?.title??''),
      thesis:String(source?.thesis??''),
      state:stateName(source?.state)
    };
  }

  function applySemantic(source,patch={}){
    const out=clone(source||{});
    if(Object.prototype.hasOwnProperty.call(patch,'title'))out.title=String(patch.title??'');
    if(Object.prototype.hasOwnProperty.call(patch,'thesis'))out.thesis=String(patch.thesis??'');
    if(Object.prototype.hasOwnProperty.call(patch,'state'))out.state=stateName(patch.state);
    return out;
  }

  function compactProject(source){
    const s=stateSpec(source?.state);
    return {
      id:String(source?.id??''),
      title:String(source?.title??''),
      line:String(source?.thesis??''),
      state:s.name,
      mark:s.mark,
      glyph:s.glyph
    };
  }
  function compactNormalize(view,source){
    const state=stateName(view?.state??source?.state);
    const s=stateSpec(state);
    return {
      id:String(source?.id??''),
      title:String(view?.title??source?.title??''),
      line:String(view?.line??source?.thesis??''),
      state,
      mark:s.mark,
      glyph:s.glyph
    };
  }
  function compactPut(source,view){
    const v=compactNormalize(view,source);
    return applySemantic(source,{title:v.title,thesis:v.line,state:v.state});
  }

  function defaultFieldView(source){
    return {focus:String(source?.id??GENESIS_ID),camera:{x:0,y:0,z:0,rx:-10,ry:24,rz:0},aperture:'DETAIL'};
  }
  function normalizeCamera(c={}){
    const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
    return {x:n(c.x),y:n(c.y),z:n(c.z),rx:n(c.rx,-10),ry:n(c.ry,24),rz:n(c.rz)};
  }
  function fieldGet(source){
    const s=stateSpec(source?.state);
    return {
      id:String(source?.id??''),
      title:String(source?.title??''),
      thesis:String(source?.thesis??''),
      state:s.name,
      representation:{mark:s.mark,glyph:s.glyph,zh:s.zh,projection:s.projection}
    };
  }
  function fieldProject(source,viewState={}){
    const semanticView=fieldGet(source),d=defaultFieldView(source),vs=viewState&&typeof viewState==='object'?viewState:{};
    return {...semanticView,$view:{
      focus:String(vs.focus??d.focus),
      camera:normalizeCamera(vs.camera||d.camera),
      aperture:String(vs.aperture??d.aperture)
    }};
  }
  function fieldNormalize(view,source){
    const state=stateName(view?.state??source?.state),s=stateSpec(state);
    return {
      id:String(source?.id??''),
      title:String(view?.title??source?.title??''),
      thesis:String(view?.thesis??source?.thesis??''),
      state,
      representation:{mark:s.mark,glyph:s.glyph,zh:s.zh,projection:s.projection}
    };
  }
  function fieldPut(source,view){
    const v=fieldNormalize(view,source);
    return applySemantic(source,{title:v.title,thesis:v.thesis,state:v.state});
  }

  const COMPACT=Object.freeze({
    id:'COMPACT',
    description:'Readable minimum. Semantic edits round-trip; derived mark/glyph and identity do not become authority.',
    project:compactProject,
    get:compactProject,
    normalize:compactNormalize,
    put:compactPut,
    editable:Object.freeze(['title','line','state']),
    local:Object.freeze([])
  });
  const FIELD=Object.freeze({
    id:'FIELD',
    description:'Spatial/contextual projection. Camera, focus and aperture are view-local and cannot mutate source.',
    project:fieldProject,
    get:fieldGet,
    normalize:fieldNormalize,
    put:fieldPut,
    editable:Object.freeze(['title','thesis','state']),
    local:Object.freeze(['$view.focus','$view.camera','$view.aperture'])
  });
  const LENSES=Object.freeze({COMPACT,FIELD});

  function lens(id){
    const key=String(id||'').toUpperCase();
    if(!LENSES[key])throw new Error('INTERPHASE_UNKNOWN_LENS:'+id);
    return LENSES[key];
  }

  function checkLens(lensLike,source,candidate){
    const L=typeof lensLike==='string'?lens(lensLike):lensLike;
    const base=clone(source),view=L.get(base),getPut=L.put(base,clone(view));
    const edited=candidate==null?clone(view):clone(candidate);
    const putSource=L.put(base,edited),putGet=L.get(putSource);
    const normalized=L.normalize?L.normalize(edited,base):edited;
    return {
      lens:L.id,
      get_put:same(getPut,base),
      put_get:same(putGet,normalized),
      identity_preserved:String(putSource?.id??'')===String(base?.id??''),
      provenance_preserved:same(putSource?.provenance,base?.provenance),
      source:base,
      view,
      edited_view:edited,
      normalized_view:normalized,
      put_source:putSource
    };
  }

  function checkFieldLocality(source,fieldView){
    const before=clone(source),view=fieldView?clone(fieldView):FIELD.project(before);
    view.$view=view.$view||{};
    view.$view.camera={x:91,y:-17,z:42,rx:13,ry:271,rz:4};
    view.$view.focus='view:elsewhere';
    view.$view.aperture='OVERVIEW';
    const after=FIELD.put(before,view);
    return {pass:same(before,after),before,after,view};
  }

  function semanticDiff(a,b){
    const before=semantic(a),after=semantic(b),out={};
    for(const k of SEMANTIC_FIELDS)if(!same(before[k],after[k]))out[k]={before:before[k],after:after[k]};
    return out;
  }

  function createTraceStore(initial=createGenesisObject()){
    let source=clone(initial),revision=0,sequence=0;
    const history=[];
    const snapshot=()=>({source:clone(source),revision,history:clone(history)});
    function record(op,lensId,before,after,meta={}){
      const delta=semanticDiff(before,after);
      if(!Object.keys(delta).length)return{ok:true,no_op:true,source:clone(source),revision};
      revision++;
      const receipt={
        id:'op:'+(++sequence),
        op,
        lens:lensId||'PLAIN',
        before:clone(before),
        after:clone(after),
        delta,
        revision,
        cause:meta.cause||null
      };
      history.push(receipt);source=clone(after);
      return{ok:true,no_op:false,receipt:clone(receipt),source:clone(source),revision};
    }
    function edit(lensId,view,meta={}){
      const L=lens(lensId),before=clone(source),after=L.put(before,clone(view));
      return record('EDIT',L.id,before,after,meta);
    }
    function editPlain(patch,meta={}){
      const before=clone(source),after=applySemantic(before,patch||{});
      return record('EDIT','PLAIN',before,after,meta);
    }
    function returnLast(meta={}){
      const target=[...history].reverse().find(x=>x.op==='EDIT'||x.op==='RETURN');
      if(!target)return{ok:false,reason:'NO_SEMANTIC_HISTORY'};
      const before=clone(source);
      const restored=applySemantic(before,semantic(target.before));
      return record('RETURN','PLAIN',before,restored,{cause:meta.cause||target.id});
    }
    return Object.freeze({
      snapshot,
      source:()=>clone(source),
      project:(lensId,viewState)=>lens(lensId).project(clone(source),clone(viewState)),
      edit,
      editPlain,
      returnLast
    });
  }

  return Object.freeze({
    VERSION,GENESIS_ID,STATES,SEMANTIC_FIELDS,PROTECTED_FIELDS,
    createGenesisObject,semantic,applySemantic,COMPACT,FIELD,LENSES,lens,
    checkLens,checkFieldLocality,semanticDiff,createTraceStore,stable
  });
});
