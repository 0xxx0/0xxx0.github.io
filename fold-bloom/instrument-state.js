export const INSTRUMENT_SCHEMA='fold-bloom-instrument/v0.1';
export const STORE_KEY='fold-bloom.instrument.v01';

export const OBJECT_KINDS=Object.freeze(['EMPTY','AUDIO','TEXT','SET']);
export const OPERATIONS=Object.freeze(['FOCUS','FOLD','BLOOM','RETURN']);
export const PROJECTIONS=Object.freeze(['GLYPH','MAP','RIDE','READ']);

const SUPPORT=Object.freeze({
  EMPTY:{operations:['FOCUS'],projections:['GLYPH']},
  AUDIO:{operations:['FOCUS','FOLD','BLOOM','RETURN'],projections:['GLYPH','MAP','RIDE']},
  TEXT:{operations:['FOCUS','FOLD','BLOOM','RETURN'],projections:['GLYPH','READ']},
  SET:{operations:['FOCUS','FOLD','BLOOM','RETURN'],projections:['GLYPH','RIDE']}
});

const clone=x=>JSON.parse(JSON.stringify(x));
const clean=x=>String(x??'').trim();

export function emptyInstrumentState(){
  return {
    schema:INSTRUMENT_SCHEMA,
    revision:0,
    object:{kind:'EMPTY',id:null,label:'NO SOURCE',meta:{}},
    focus:{id:null,label:null,address:null},
    operation:'FOCUS',
    projection:'GLYPH',
    returnStack:[]
  };
}

export function normalizeInstrumentState(value={}){
  const base=emptyInstrumentState();
  if(!value||typeof value!=='object') return base;
  const kind=OBJECT_KINDS.includes(value.object?.kind)?value.object.kind:'EMPTY';
  const projection=PROJECTIONS.includes(value.projection)?value.projection:'GLYPH';
  const operation=OPERATIONS.includes(value.operation)?value.operation:'FOCUS';
  const out={
    schema:INSTRUMENT_SCHEMA,
    revision:Number.isFinite(Number(value.revision))?Math.max(0,Math.trunc(Number(value.revision))):0,
    object:{
      kind,
      id:value.object?.id==null?null:clean(value.object.id),
      label:clean(value.object?.label)||({EMPTY:'NO SOURCE',AUDIO:'AUDIO SOURCE',TEXT:'TEXT SOURCE',SET:'EXPERIENCE SET'}[kind]),
      meta:value.object?.meta&&typeof value.object.meta==='object'?clone(value.object.meta):{}
    },
    focus:{
      id:value.focus?.id==null?null:clean(value.focus.id),
      label:value.focus?.label==null?null:clean(value.focus.label),
      address:value.focus?.address==null?null:clean(value.focus.address)
    },
    operation,
    projection,
    returnStack:Array.isArray(value.returnStack)?value.returnStack.slice(-12).map(x=>clone(x)):[]
  };
  if(!supportFor(out).projections.includes(out.projection)) out.projection='GLYPH';
  return out;
}

export function supportFor(state){
  const s=normalizeShallow(state);
  return clone(SUPPORT[s.object.kind]||SUPPORT.EMPTY);
}

function normalizeShallow(state){
  const kind=OBJECT_KINDS.includes(state?.object?.kind)?state.object.kind:'EMPTY';
  return {object:{kind}};
}

function withRevision(state,patch){
  const s=normalizeInstrumentState(state);
  return normalizeInstrumentState({...s,...patch,revision:s.revision+1});
}

export function bindObject(state,{kind,id,label,meta={}}){
  if(!OBJECT_KINDS.includes(kind)||kind==='EMPTY') throw new Error('bindObject requires AUDIO, TEXT or SET');
  const key=clean(id);
  if(!key) throw new Error('object id required');
  const next=withRevision(state,{
    object:{kind,id:key,label:clean(label)||key,meta:clone(meta||{})},
    focus:{id:key,label:clean(label)||key,address:key},
    operation:'FOCUS',
    projection:'GLYPH'
  });
  return next;
}

export function clearObject(state){
  const s=normalizeInstrumentState(state);
  return {...emptyInstrumentState(),revision:s.revision+1,returnStack:s.returnStack};
}

export function setFocus(state,{id,label=null,address=null}){
  const key=clean(id);
  if(!key) throw new Error('focus id required');
  return withRevision(state,{focus:{id:key,label:label==null?key:clean(label),address:address==null?key:clean(address)},operation:'FOCUS'});
}

export function setOperation(state,operation){
  if(!OPERATIONS.includes(operation)) throw new Error('unknown operation '+operation);
  const support=supportFor(state);
  if(!support.operations.includes(operation)) throw new Error(operation+' unsupported for '+normalizeShallow(state).object.kind);
  return withRevision(state,{operation});
}

export function setProjection(state,projection){
  if(!PROJECTIONS.includes(projection)) throw new Error('unknown projection '+projection);
  const support=supportFor(state);
  if(!support.projections.includes(projection)) throw new Error(projection+' unsupported for '+normalizeShallow(state).object.kind);
  return withRevision(state,{projection});
}

function snapshotWithoutStack(state){
  const s=normalizeInstrumentState(state);
  const x=clone(s);
  delete x.returnStack;
  return x;
}

export function checkpoint(state,label='RETURN'){
  const s=normalizeInstrumentState(state);
  const frame={label:clean(label)||'RETURN',state:snapshotWithoutStack(s)};
  return normalizeInstrumentState({...s,revision:s.revision+1,returnStack:[...s.returnStack,frame].slice(-12)});
}

export function doReturn(state){
  const s=normalizeInstrumentState(state);
  const stack=[...s.returnStack];
  const frame=stack.pop();
  if(!frame) return s;
  return normalizeInstrumentState({...frame.state,revision:s.revision+1,returnStack:stack});
}

export function projectionHref(state,projection,{returnAddress='/fold-bloom/'}={}){
  const s=setProjection(state,projection);
  const ret=clean(returnAddress)||'/fold-bloom/';
  const id=s.object.id;
  if(projection==='GLYPH') return null;
  if(s.object.kind==='AUDIO'&&projection==='MAP'){
    const q=new URLSearchParams({source:id,return:ret});
    return '/fold-bloom/listen/?'+q.toString();
  }
  if(s.object.kind==='AUDIO'&&projection==='RIDE'){
    const q=new URLSearchParams({source:id,return:ret});
    return '/fold-bloom/live/?'+q.toString();
  }
  if(s.object.kind==='TEXT'&&projection==='READ'){
    const q=new URLSearchParams({handoff:'1',return:ret});
    return '/docs/?'+q.toString();
  }
  if(s.object.kind==='SET'&&projection==='RIDE'){
    const q=new URLSearchParams({return:ret});
    return '/fold-bloom/set/journey.html?'+q.toString();
  }
  throw new Error('no route adapter for '+s.object.kind+' → '+projection);
}

export function foldHref(state,{returnAddress='/fold-bloom/'}={}){
  const s=setOperation(state,'FOLD');
  if(!['AUDIO','SET','TEXT'].includes(s.object.kind)) throw new Error('FOLD unsupported for '+s.object.kind);
  const q=new URLSearchParams({return:clean(returnAddress)||'/fold-bloom/'});
  if(s.object.kind==='AUDIO') q.set('source',s.object.id);
  return '/fold-bloom/set/?'+q.toString();
}

export function defaultBloomProjection(state){
  const kind=normalizeShallow(state).object.kind;
  if(kind==='AUDIO'||kind==='SET') return 'RIDE';
  if(kind==='TEXT') return 'READ';
  return 'GLYPH';
}

export function identityDescriptor(id){
  const text=clean(id)||'EMPTY';
  let h=2166136261>>>0;
  for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)>>>0}
  return {
    seed:h>>>0,
    sides:3+(h%6),
    rotation:(h>>>5)%360,
    inner:.28+(((h>>>11)%44)/100)
  };
}

export function persistInstrumentState(state,storage=globalThis.localStorage){
  const s=normalizeInstrumentState(state);
  storage?.setItem?.(STORE_KEY,JSON.stringify(s));
  return s;
}

export function loadInstrumentState(storage=globalThis.localStorage){
  try{return normalizeInstrumentState(JSON.parse(storage?.getItem?.(STORE_KEY)||'null'))}
  catch(_){return emptyInstrumentState()}
}
