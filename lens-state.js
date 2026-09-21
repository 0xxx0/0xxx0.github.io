(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.LensState=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const SCHEMA='0xxx0/lens-state/v0.2';
  const DESCRIPTOR_SCHEMA='0xxx0/lens-descriptor/v0.2';
  const HANDOFF_SCHEMA='scale-lens.handoff/v2';
  const HANDOFF_KEY='lens:handoff:v2';
  const VIEW='VIEW_LENS', ACTION='ACTION_TOOLGLASS';
  const OPERATORS=new Set(['SELECT','ALIGN','COMPOSE','PROPAGATE','COMMIT','RETURN']);
  const AUTHORITIES=new Set(['PREVIEW','COMMIT']);

  const isObj=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
  const text=(x,fallback='')=>x==null?fallback:String(x);
  const arr=x=>Array.isArray(x)?x.map(v=>text(v)).filter(Boolean):[];
  const clone=x=>x==null?x:JSON.parse(JSON.stringify(x));
  const plain=x=>isObj(x)?clone(x):{};

  function stable(value){
    if(Array.isArray(value))return value.map(stable);
    if(!isObj(value))return value;
    const out={};
    Object.keys(value).sort().forEach(k=>{if(value[k]!==undefined)out[k]=stable(value[k])});
    return out;
  }

  function normalizeDescriptor(input={}){
    const kind=input.kind===ACTION?ACTION:VIEW;
    const authority=AUTHORITIES.has(input.authority)?input.authority:'PREVIEW';
    return {
      schema:DESCRIPTOR_SCHEMA,
      lensId:text(input.lensId||input.lens_id||input.id),
      lensVersion:text(input.lensVersion||input.lens_version||input.version,'0'),
      kind,
      params:plain(input.params),
      inputContract:text(input.inputContract||input.input_contract,'*'),
      outputContract:text(input.outputContract||input.output_contract,'*'),
      preserves:arr(input.preserves),
      hides:arr(input.hides),
      derives:arr(input.derives),
      authority
    };
  }

  function validateDescriptor(input){
    const d=normalizeDescriptor(input),errors=[];
    if(!d.lensId)errors.push('descriptor.lensId required');
    if(d.kind===VIEW&&d.authority!=='PREVIEW')errors.push('VIEW_LENS authority must be PREVIEW');
    if(!AUTHORITIES.has(d.authority))errors.push('descriptor.authority invalid');
    return {ok:errors.length===0,errors,descriptor:d};
  }

  function normalize(input={}){
    const aperture=isObj(input.aperture)?input.aperture:{};
    const addressObj=isObj(input.address)?input.address:null;
    const address=text(addressObj?.canonical||input.canonical||input.address);
    const objectId=text(input.objectId||input.object_id||input.identity||input.canonicalOwnerId||input.focusId||input.selectedId||address);
    const focusId=text(input.focusId||input.focus_id||input.selectedId||input.identity||objectId);
    const projection=text(input.projection||input.domain||'SOURCE','SOURCE');
    const operator=OPERATORS.has(input.operator)?input.operator:'SELECT';
    const lensStack=(input.lensStack||input.lens_stack||input.stack||[]).map(normalizeDescriptor);
    return {
      schema:SCHEMA,
      objectId,
      address,
      focusId,
      aperture:{
        level:aperture.level??input.scopeName??input.scope??null,
        range:text(aperture.range||addressObj?.range||input.range),
        shape:text(aperture.shape||'surface')
      },
      projection,
      lensStack,
      operator,
      returnAddress:text(input.returnAddress||input.return_address||addressObj?.returnAddress),
      sourceRefs:arr(input.sourceRefs||input.source_refs||input.refs),
      provenance:plain(input.provenance),
      meta:plain(input.meta)
    };
  }

  function globMatch(pattern,value){
    pattern=text(pattern,'*');value=text(value,'');
    if(pattern==='*')return true;
    const parts=pattern.split('*');
    if(parts.length===1)return pattern===value;
    let pos=0;
    if(parts[0]&&!value.startsWith(parts[0]))return false;
    pos=parts[0].length;
    for(let i=1;i<parts.length-1;i++){
      if(!parts[i])continue;
      const n=value.indexOf(parts[i],pos);
      if(n<0)return false;
      pos=n+parts[i].length;
    }
    const last=parts[parts.length-1];
    return !last||value.slice(pos).endsWith(last);
  }

  function currentContract(input){
    const state=normalize(input);
    let contract=text(state.meta?.contract,'*');
    for(const d of state.lensStack){
      const out=text(d.outputContract,'*');
      if(out!=='*')contract=out;
    }
    return contract;
  }

  function supportDescriptor(input,descriptor){
    const state=normalize(input),v=validateDescriptor(descriptor),reasons=[];
    const current=currentContract(state);
    if(!v.ok)return {supported:false,support:0,reasons:v.errors.slice(),descriptor:v.descriptor,currentContract:current,nextContract:current};
    const d=v.descriptor,required=text(d.inputContract,'*');
    if(required!=='*'&&current==='*')reasons.push('current contract is unknown; cannot prove '+required);
    else if(required!=='*'&&!globMatch(required,current))reasons.push('requires '+required+' but current contract is '+current);
    const next=d.outputContract==='*'?current:d.outputContract;
    return {supported:reasons.length===0,support:reasons.length?0:1,reasons,descriptor:d,currentContract:current,nextContract:next};
  }

  function supportCatalog(input,catalog=[]){
    return (Array.isArray(catalog)?catalog:[]).map(d=>supportDescriptor(input,d));
  }

  function validate(input){
    const state=normalize(input),errors=[];
    if(!state.objectId)errors.push('objectId required');
    if(!state.focusId)errors.push('focusId required');
    if(!state.projection)errors.push('projection required');

    const chain=normalize({...state,lensStack:[]});
    state.lensStack.forEach((d,i)=>{
      const v=validateDescriptor(d);
      v.errors.forEach(e=>errors.push('lensStack['+i+'].'+e));
      if(v.ok){
        const s=supportDescriptor(chain,v.descriptor);
        if(!s.supported)s.reasons.forEach(e=>errors.push('lensStack['+i+'].'+e));
        else chain.lensStack.push(v.descriptor);
      }
    });

    if(state.operator==='COMMIT'){
      const hasCommit=state.lensStack.some(d=>d.kind===ACTION&&d.authority==='COMMIT');
      if(!hasCommit)errors.push('COMMIT requires an ACTION_TOOLGLASS with COMMIT authority');
    }
    return {ok:errors.length===0,errors,state};
  }

  function serialize(input,space=0){
    const v=validate(input);
    if(!v.ok)throw new Error(v.errors.join('; '));
    return JSON.stringify(stable(v.state),null,space);
  }

  function deserialize(payload){
    const raw=typeof payload==='string'?JSON.parse(payload):payload;
    const v=validate(raw);
    if(!v.ok)throw new Error(v.errors.join('; '));
    return v.state;
  }

  function equivalent(a,b){
    try{return serialize(a)===serialize(b)}catch(_){return false}
  }

  function compose(input,descriptor){
    const state=normalize(input),s=supportDescriptor(state,descriptor);
    if(!s.supported)throw new Error('unsupported lens '+(s.descriptor?.lensId||'')+': '+s.reasons.join('; '));
    state.lensStack=[...state.lensStack,s.descriptor];
    state.operator='COMPOSE';
    const v=validate(state);
    if(!v.ok)throw new Error(v.errors.join('; '));
    return v.state;
  }

  function uncompose(input,indexOrId){
    const state=normalize(input);
    const idx=typeof indexOrId==='number'?indexOrId:state.lensStack.findIndex(d=>d.lensId===indexOrId);
    if(idx<0||idx>=state.lensStack.length)return state;
    state.lensStack=state.lensStack.filter((_,i)=>i!==idx);
    state.operator='COMPOSE';
    const v=validate(state);
    if(!v.ok)throw new Error('uncompose breaks typed stack: '+v.errors.join('; '));
    return v.state;
  }

  function withFocus(input,focusId,address){
    const state=normalize(input);
    state.focusId=text(focusId,state.focusId);
    if(address!=null)state.address=text(address);
    state.operator='SELECT';
    return state;
  }

  function withAperture(input,patch={}){
    const state=normalize(input);
    state.aperture={...state.aperture,...plain(patch)};
    state.operator='PROPAGATE';
    return state;
  }

  function withProjection(input,projection){
    const state=normalize(input);
    state.projection=text(projection,state.projection);
    state.operator='ALIGN';
    return state;
  }

  function fromFieldRoute(route={},options={}){
    const href=text(route.href||route.address||'/');
    return normalize({
      objectId:text(route.id||href),
      address:href,
      focusId:text(route.id||href),
      aperture:{level:route.kind||'route',range:route.parent||'/',shape:'field-route'},
      projection:options.projection||'STRUCTURE',
      operator:'SELECT',
      returnAddress:options.returnAddress||href,
      sourceRefs:[href],
      provenance:{source:'field-index',index:route.index||null},
      meta:{
        contract:'field-route/v0.1',
        title:route.title||href,
        state:route.state||null,
        operation:route.operation||null,
        family:route.family||null,
        role:route.role||null
      }
    });
  }

  function fromScaleSnapshot(snapshot={},options={}){
    const address=isObj(snapshot.address)?snapshot.address:{};
    return normalize({
      objectId:snapshot.identity||snapshot.selectedId||address.canonical,
      address:address.canonical||snapshot.canonical,
      focusId:snapshot.selectedId||snapshot.identity,
      aperture:{level:snapshot.scopeName??snapshot.scope??null,range:address.range||'',shape:'scale-studio'},
      projection:snapshot.domain||snapshot.projection||'SOURCE',
      operator:options.operator||'SELECT',
      returnAddress:address.returnAddress||options.returnAddress||'',
      sourceRefs:[snapshot.source?.id,snapshot.source?.name,snapshot.source?.originUrl].filter(Boolean),
      provenance:{source:snapshot.source||null,chain:snapshot.chain||[]},
      meta:{contract:'scale-snapshot/v0.1',scope:snapshot.scope??null,scopeName:snapshot.scopeName??null}
    });
  }

  function fromLegacyHandoff(payload={}){
    if(payload?.schema===HANDOFF_SCHEMA&&payload.state)return deserialize(payload.state);
    if(payload?.schema==='scale-lens.handoff/v1'){
      return normalize({
        objectId:payload.sourceUrl||payload.returnAddress||payload.title,
        address:payload.sourceUrl||payload.returnAddress||'',
        focusId:payload.sourceUrl||payload.returnAddress||payload.title,
        aperture:{level:'surface',range:'document',shape:'page'},
        projection:'SOURCE',
        returnAddress:payload.returnAddress||'',
        sourceRefs:[payload.sourceUrl].filter(Boolean),
        provenance:{source:'showcase-route-adapter'},
        meta:{contract:'page/v0.1',title:payload.title||'',at:payload.at||null}
      });
    }
    if(payload?.source==='field-index-map'&&payload?.text){
      try{
        const route=JSON.parse(payload.text);
        if(route?.schema==='field-route/v0.1')return fromFieldRoute(route,{returnAddress:route.href||'/'});
      }catch(_){}
    }
    if(payload?.source==='field-index-axial-latest'&&payload?.text){
      try{
        const route=JSON.parse(payload.text);
        if(route?.schema==='field-route/v0.1')return fromFieldRoute(route,{returnAddress:route.href||'/'});
      }catch(_){}
    }
    if(payload?.schema==='field-route/v0.1')return fromFieldRoute(payload,{returnAddress:payload.href||'/'});
    return normalize(payload);
  }

  function makeHandoff(input,extra={}){
    const state=deserialize(serialize(input));
    return {
      schema:HANDOFF_SCHEMA,
      at:extra.at||new Date().toISOString(),
      state,
      title:text(extra.title||state.meta.title||state.objectId),
      sourceUrl:text(extra.sourceUrl||state.sourceRefs[0]||''),
      text:text(extra.text||''),
      returnAddress:state.returnAddress
    };
  }

  function storeHandoff(input,extra={},storage){
    const packet=makeHandoff(input,extra);
    const target=storage||(typeof sessionStorage!=='undefined'?sessionStorage:null);
    if(!target)throw new Error('session storage unavailable');
    target.setItem(HANDOFF_KEY,JSON.stringify(packet));
    return packet;
  }

  function readHandoff(storage){
    const target=storage||(typeof sessionStorage!=='undefined'?sessionStorage:null);
    if(!target)return null;
    const raw=target.getItem(HANDOFF_KEY);
    if(!raw)return null;
    const packet=JSON.parse(raw);
    if(packet?.schema!==HANDOFF_SCHEMA)return null;
    return {...packet,state:deserialize(packet.state)};
  }

  return Object.freeze({
    SCHEMA,DESCRIPTOR_SCHEMA,HANDOFF_SCHEMA,HANDOFF_KEY,VIEW,ACTION,
    normalize,validate,normalizeDescriptor,validateDescriptor,serialize,deserialize,equivalent,
    globMatch,currentContract,supportDescriptor,supportCatalog,compose,uncompose,
    withFocus,withAperture,withProjection,
    fromFieldRoute,fromScaleSnapshot,fromLegacyHandoff,makeHandoff,storeHandoff,readHandoff
  });
});
