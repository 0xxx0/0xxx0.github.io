export const OBJECT_KINDS=Object.freeze(['EMPTY','AUDIO','TEXT','SET']);
export const OPERATIONS=Object.freeze(['FOCUS','FOLD','BLOOM','RETURN']);
export const DOMAIN_PROJECTIONS=Object.freeze(['GLYPH','MAP','RIDE','READ']);

const SUPPORT=Object.freeze({
  EMPTY:Object.freeze({operations:['FOCUS'],projections:['GLYPH']}),
  AUDIO:Object.freeze({operations:['FOCUS','FOLD','BLOOM','RETURN'],projections:['GLYPH','MAP','RIDE']}),
  TEXT:Object.freeze({operations:['FOCUS','BLOOM','RETURN'],projections:['GLYPH','READ']}),
  SET:Object.freeze({operations:['FOCUS','FOLD','BLOOM','RETURN'],projections:['GLYPH','RIDE']})
});
const clean=x=>String(x??'').trim();

export function normalizeActive(value={}){
  const kind=OBJECT_KINDS.includes(value?.kind)?value.kind:'EMPTY';
  if(kind==='EMPTY')return{kind:'EMPTY',id:null,label:'NO SOURCE',meta:{}};
  const id=clean(value?.id);
  if(!id)return{kind:'EMPTY',id:null,label:'NO SOURCE',meta:{}};
  return{kind,id,label:clean(value?.label)||id,meta:value?.meta&&typeof value.meta==='object'?JSON.parse(JSON.stringify(value.meta)):{}};
}
export function supportFor(active){return JSON.parse(JSON.stringify(SUPPORT[normalizeActive(active).kind]||SUPPORT.EMPTY))}
export function defaultBloomProjection(active){
  const k=normalizeActive(active).kind;
  if(k==='AUDIO'||k==='SET')return'RIDE';
  if(k==='TEXT')return'READ';
  return'GLYPH';
}
export function routeFor(active,projection,{returnAddress='/fold-bloom/'}={}){
  const a=normalizeActive(active),ret=clean(returnAddress)||'/fold-bloom/';
  if(!supportFor(a).projections.includes(projection))throw new Error(projection+' unsupported for '+a.kind);
  if(projection==='GLYPH')return null;
  if(a.kind==='AUDIO'&&projection==='MAP'){
    const q=new URLSearchParams({source:a.id,return:ret});return'/fold-bloom/listen/?'+q.toString();
  }
  if(a.kind==='AUDIO'&&projection==='RIDE'){
    const q=new URLSearchParams({source:a.id,return:ret});return'/fold-bloom/live/?'+q.toString();
  }
  if(a.kind==='TEXT'&&projection==='READ'){
    const q=new URLSearchParams({handoff:'1',return:ret});return'/docs/?'+q.toString();
  }
  if(a.kind==='SET'&&projection==='RIDE'){
    const q=new URLSearchParams({set:a.id,return:ret});return'/fold-bloom/set/journey.html?'+q.toString();
  }
  throw new Error('no adapter for '+a.kind+' → '+projection);
}
export function foldRoute(active,{returnAddress='/fold-bloom/'}={}){
  const a=normalizeActive(active);
  if(!supportFor(a).operations.includes('FOLD'))throw new Error('FOLD unsupported for '+a.kind);
  if(!['AUDIO','SET'].includes(a.kind))throw new Error('no FOLD adapter for '+a.kind);
  const q=new URLSearchParams({return:clean(returnAddress)||'/fold-bloom/'});
  if(a.kind==='AUDIO')q.set('source',a.id);
  return'/fold-bloom/set/?'+q.toString();
}
export function projectionSpec(){
  return {
    MAP:{label:'MAP',channels:['identity','address','content','time','authority','evidence'],description:'source cartography'},
    RIDE:{label:'RIDE',channels:['identity','address','content','time','authority','evidence'],description:'embodied traversal'},
    READ:{label:'READ',channels:['identity','address','content','depth','time','authority'],description:'reading projection'}
  };
}
export function identityDescriptor(id){
  const text=clean(id)||'EMPTY';let h=2166136261>>>0;
  for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)>>>0}
  return{seed:h>>>0,sides:3+(h%6),rotation:(h>>>5)%360,inner:.28+(((h>>>11)%44)/100)};
}
