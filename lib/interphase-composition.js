(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.InterphaseComposition=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const VERSION='interphase-composition/v0.1';
  const CHANGE_SCHEMA='interphase-change/v0.1';
  const PROJECTION_SCHEMA='interphase-projection/v0.1';
  const ANCHOR_SCHEMA='interphase-anchor/v0.1';
  const REENTRY_SCHEMA='interphase-reentry/v0.1';
  const TEMPORAL_SCHEMA='interphase-temporal/v0.1';
  const AUTHORITY=Object.freeze(['CANONICAL','DERIVED','EXTERNAL_OBSERVATION','EPHEMERAL']);
  const UPDATE_POLICIES=Object.freeze(['NONE','LENS','CANONICAL']);

  const clone=x=>x==null?x:JSON.parse(JSON.stringify(x));
  const canonical=x=>Array.isArray(x)?x.map(canonical):(x&&typeof x==='object'?Object.keys(x).sort().reduce((o,k)=>(o[k]=canonical(x[k]),o),{}):x);
  const stable=x=>JSON.stringify(canonical(x));
  const same=(a,b)=>stable(a)===stable(b);
  const now=()=>new Date().toISOString();
  const deepFreeze=x=>{
    if(!x||typeof x!=='object'||Object.isFrozen(x))return x;
    Object.freeze(x);for(const v of Object.values(x))deepFreeze(v);return x;
  };
  const asList=x=>Array.isArray(x)?x:[x];

  function ref(value,kind='OBJECT'){
    if(value&&typeof value==='object'&&typeof value.id==='string'){
      return deepFreeze({id:value.id,kind:String(value.kind||kind)});
    }
    const id=String(value??'').trim();
    if(!id)throw new Error('INTERPHASE_REF_ID_REQUIRED');
    return deepFreeze({id,kind:String(kind||'OBJECT')});
  }
  const refKey=r=>{const x=ref(r);return x.kind+':'+x.id};
  const sameRef=(a,b)=>refKey(a)===refKey(b);
  const uniqRefs=xs=>{
    const m=new Map();for(const x of xs||[]){const r=ref(x);m.set(refKey(r),r)}return[...m.values()];
  };

  function provenance(input={}){
    const p=clone(input||{});
    const out={};
    if(p.wasGeneratedBy!=null)out.wasGeneratedBy=clone(p.wasGeneratedBy);
    if(p.wasDerivedFrom!=null)out.wasDerivedFrom=clone(p.wasDerivedFrom);
    if(p.wasAttributedTo!=null)out.wasAttributedTo=clone(p.wasAttributedTo);
    for(const [k,v] of Object.entries(p))if(!Object.prototype.hasOwnProperty.call(out,k))out[k]=clone(v);
    return deepFreeze(out);
  }

  function createChange(spec={}){
    if(!Object.prototype.hasOwnProperty.call(spec,'before')||!Object.prototype.hasOwnProperty.call(spec,'after'))throw new Error('INTERPHASE_CHANGE_BEFORE_AFTER_REQUIRED');
    const touches=uniqRefs(spec.touches||[]);
    const id=String(spec.id||('chg:'+stable({before:spec.before,after:spec.after,touches}).slice(0,48)));
    return deepFreeze({
      schema:CHANGE_SCHEMA,
      id,
      at:String(spec.at||now()),
      authority:String(spec.authority||'EDIT'),
      touches,
      before:clone(spec.before),
      after:clone(spec.after),
      no_op:same(spec.before,spec.after),
      provenance:provenance(spec.provenance||{})
    });
  }
  function assertChange(c){
    if(!c||c.schema!==CHANGE_SCHEMA)throw new Error('INTERPHASE_CHANGE_SCHEMA_REQUIRED');
    return c;
  }
  function applyChange(source,change,opt={}){
    const c=assertChange(change);
    if(opt.strict!==false&&!same(source,c.before))throw new Error('INTERPHASE_CHANGE_BASE_MISMATCH:'+c.id);
    return clone(c.after);
  }
  function invertChange(change,spec={}){
    const c=assertChange(change);
    return createChange({
      id:spec.id||c.id+':inverse',
      at:spec.at||now(),
      authority:spec.authority||c.authority,
      touches:c.touches,
      before:c.after,
      after:c.before,
      provenance:{...clone(c.provenance),wasDerivedFrom:uniqScalar([].concat(c.provenance?.wasDerivedFrom||[],[c.id]))}
    });
  }
  function composeChanges(...input){
    const xs=(input.length===1&&Array.isArray(input[0])?input[0]:input).filter(Boolean).map(assertChange);
    if(!xs.length)throw new Error('INTERPHASE_CHANGE_COMPOSE_EMPTY');
    for(let i=1;i<xs.length;i++)if(!same(xs[i-1].after,xs[i].before))throw new Error('INTERPHASE_CHANGE_COMPOSE_GAP:'+xs[i-1].id+'→'+xs[i].id);
    return createChange({
      id:'compose:'+xs.map(x=>x.id).join('+'),
      authority:xs.every(x=>x.authority===xs[0].authority)?xs[0].authority:'MIXED',
      touches:uniqRefs(xs.flatMap(x=>x.touches||[])),
      before:xs[0].before,
      after:xs.at(-1).after,
      provenance:{wasDerivedFrom:xs.map(x=>x.id)}
    });
  }
  function lensChange(lens,source,view,spec={}){
    if(!lens||typeof lens.put!=='function')throw new Error('INTERPHASE_LENS_PUT_REQUIRED');
    const target=spec.ref||source?.id;
    return createChange({
      id:spec.id,
      at:spec.at,
      authority:spec.authority||'EDIT',
      touches:spec.touches||[ref(target,source?.kind||'OBJECT')],
      before:source,
      after:lens.put(clone(source),clone(view)),
      provenance:{wasGeneratedBy:lens.id||'LENS',...(spec.provenance||{})}
    });
  }

  function projection(spec={}){
    const authority=String(spec.authority||'DERIVED');
    if(!AUTHORITY.includes(authority))throw new Error('INTERPHASE_PROJECTION_AUTHORITY:'+authority);
    const updatePolicy=String(spec.updatePolicy||'NONE');
    if(!UPDATE_POLICIES.includes(updatePolicy))throw new Error('INTERPHASE_PROJECTION_UPDATE_POLICY:'+updatePolicy);
    if(!spec.id)throw new Error('INTERPHASE_PROJECTION_ID_REQUIRED');
    if(!spec.sourceRef)throw new Error('INTERPHASE_PROJECTION_SOURCE_REF_REQUIRED');
    return deepFreeze({
      schema:PROJECTION_SCHEMA,
      id:String(spec.id),
      authority,
      updatePolicy,
      source:{ref:ref(spec.sourceRef),revision:spec.sourceRevision??null},
      losses:Object.freeze([...(spec.losses||[])].map(String)),
      value:clone(spec.value),
      provenance:provenance(spec.provenance||{})
    });
  }
  const canWriteProjection=p=>{
    if(!p||p.schema!==PROJECTION_SCHEMA)return false;
    return p.authority==='CANONICAL'||p.updatePolicy==='CANONICAL'||p.updatePolicy==='LENS';
  };
  function assertProjectionWrite(p){
    if(!canWriteProjection(p))throw new Error('INTERPHASE_PROJECTION_WRITE_DENIED:'+String(p?.id||'UNKNOWN'));
    return p;
  }

  function createAnchor(spec={}){
    if(!spec.ref)throw new Error('INTERPHASE_ANCHOR_REF_REQUIRED');
    return deepFreeze({
      schema:ANCHOR_SCHEMA,
      ref:ref(spec.ref),
      projection:String(spec.projection||'PLAIN'),
      focus:clone(spec.focus??null),
      revision:spec.revision??null,
      at:String(spec.at||now())
    });
  }
  function reenter(anchor,resolver,projector){
    if(!anchor||anchor.schema!==ANCHOR_SCHEMA)throw new Error('INTERPHASE_ANCHOR_SCHEMA_REQUIRED');
    if(typeof resolver!=='function')throw new Error('INTERPHASE_ANCHOR_RESOLVER_REQUIRED');
    const object=resolver(anchor.ref);
    if(object==null)throw new Error('INTERPHASE_ANCHOR_UNRESOLVED:'+anchor.ref.id);
    const value=typeof projector==='function'?projector(object,anchor):clone(object);
    return deepFreeze({schema:REENTRY_SCHEMA,anchor:clone(anchor),ref:ref(object,anchor.ref.kind),value:clone(value)});
  }

  const whySource=(source,evidence=null)=>deepFreeze({kind:'source',ref:ref(source),evidence:clone(evidence)});
  const whyAll=(...children)=>deepFreeze({kind:'all',children:flattenWhy(children)});
  const whyAny=(...children)=>deepFreeze({kind:'any',children:flattenWhy(children)});
  function flattenWhy(xs){return xs.flat(Infinity).filter(Boolean).map(x=>clone(x))}
  function whySources(tree){
    const out=[];
    (function walk(x){
      if(!x||typeof x!=='object')return;
      if(x.kind==='source'&&x.ref)out.push(ref(x.ref));
      for(const c of x.children||[])walk(c);
    })(tree);
    return uniqRefs(out);
  }

  function createDerivedCache(){
    const cache=new Map();let hits=0,misses=0,invalidations=0;
    const normDeps=deps=>(deps||[]).map(d=>({ref:ref(d?.ref||d),revision:d?.revision??null})).sort((a,b)=>refKey(a.ref).localeCompare(refKey(b.ref)));
    function read(key,deps,compute){
      if(typeof compute!=='function')throw new Error('INTERPHASE_DERIVED_COMPUTE_REQUIRED');
      const k=String(key),nd=normDeps(deps),signature=stable(nd),hit=cache.get(k);
      if(hit&&hit.signature===signature){hits++;return clone(hit.value)}
      misses++;const value=compute();cache.set(k,{signature,deps:nd,value:clone(value)});return clone(value);
    }
    function invalidate(touches){
      const keys=new Set(uniqRefs(asList(touches||[])).map(refKey));let n=0;
      for(const [k,v] of cache){if(v.deps.some(d=>keys.has(refKey(d.ref)))){cache.delete(k);n++}}
      invalidations+=n;return n;
    }
    function clear(){const n=cache.size;cache.clear();invalidations+=n;return n}
    const stats=()=>Object.freeze({entries:cache.size,hits,misses,invalidations});
    return Object.freeze({read,invalidate,clear,stats});
  }

  function temporal(value,spec={}){
    const validFrom=String(spec.validFrom||spec.observedAt||now());
    const validTo=spec.validTo==null?null:String(spec.validTo);
    const observedAt=String(spec.observedAt||now());
    assertInstant(validFrom,'validFrom');assertInstant(observedAt,'observedAt');if(validTo!=null)assertInstant(validTo,'validTo');
    if(validTo!=null&&Date.parse(validTo)<Date.parse(validFrom))throw new Error('INTERPHASE_TEMPORAL_INVALID_INTERVAL');
    return deepFreeze({schema:TEMPORAL_SCHEMA,value:clone(value),validFrom,validTo,observedAt});
  }
  function validAt(t,instant){
    if(!t||t.schema!==TEMPORAL_SCHEMA)throw new Error('INTERPHASE_TEMPORAL_SCHEMA_REQUIRED');
    const x=Date.parse(String(instant));if(!Number.isFinite(x))throw new Error('INTERPHASE_TEMPORAL_INSTANT_REQUIRED');
    const a=Date.parse(t.validFrom),b=t.validTo==null?Infinity:Date.parse(t.validTo);return x>=a&&x<b;
  }
  function assertInstant(x,label){if(!Number.isFinite(Date.parse(String(x))))throw new Error('INTERPHASE_TEMPORAL_'+String(label).toUpperCase()+'_INVALID')}
  function uniqScalar(xs){return[...new Set((xs||[]).filter(x=>x!=null).map(String))]}

  return Object.freeze({
    VERSION,CHANGE_SCHEMA,PROJECTION_SCHEMA,ANCHOR_SCHEMA,REENTRY_SCHEMA,TEMPORAL_SCHEMA,AUTHORITY,UPDATE_POLICIES,
    ref,sameRef,stable,provenance,
    createChange,applyChange,invertChange,composeChanges,lensChange,
    projection,canWriteProjection,assertProjectionWrite,
    createAnchor,reenter,
    whySource,whyAll,whyAny,whySources,
    createDerivedCache,
    temporal,validAt
  });
});
