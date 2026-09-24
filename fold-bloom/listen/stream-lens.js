const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export const STREAM_LENS_SCHEMA='field-addressed-stream/v0.1';

export function normalizeDomain(range=[0,1]){
  const a=Number(range?.[0]),b=Number(range?.[1]);
  const lo=Number.isFinite(a)?a:0,hi=Number.isFinite(b)?Math.max(lo,b):lo;
  return [lo,hi];
}

export function addressFraction(range,address){
  const [lo,hi]=normalizeDomain(range),span=Math.max(1e-9,hi-lo);
  return clamp(((Number(address)||0)-lo)/span,0,1);
}

export function addressAtFraction(range,fraction){
  const [lo,hi]=normalizeDomain(range),p=clamp(Number(fraction)||0,0,1);
  return lo+(hi-lo)*p;
}

export function scrubByDelta(range,address,delta,{sensitivity=880}={}){
  const [lo,hi]=normalizeDomain(range),span=hi-lo;
  if(span<=0)return lo;
  const d=Number(delta)||0,s=Math.max(80,Number(sensitivity)||880);
  return clamp((Number(address)||lo)+(d/s)*span,lo,hi);
}

export function stepAddress(range,address,dir,{fraction=1/24}={}){
  const [lo,hi]=normalizeDomain(range),span=hi-lo,d=Math.sign(Number(dir)||0);
  if(!d||span<=0)return clamp(Number(address)||lo,lo,hi);
  return clamp((Number(address)||lo)+d*span*clamp(Number(fraction)||1/24,1/512,1),lo,hi);
}

export function makeStreamPin({sourceKey,address,endAddress=null,kind='BOOKMARK',unit='s',label='',note='',scope=null,features=null,createdAt=null,id=null}={}){
  const at=Math.max(0,Number(address)||0),key=String(sourceKey||'UNBOUND');
  const created=createdAt||new Date().toISOString();
  const k=['BOOKMARK','FLAG','ARC'].includes(String(kind||'').toUpperCase())?String(kind).toUpperCase():'BOOKMARK';
  const end=Number.isFinite(Number(endAddress))?Math.max(at,Number(endAddress)):null;
  return {
    schema:STREAM_LENS_SCHEMA,
    id:id||`${key.slice(0,18)}:${Math.round(at*1000)}:${created}`,
    sourceKey:key,
    address:+at.toFixed(4),
    endAddress:k==='ARC'&&end!==null&&end>at?+end.toFixed(4):null,
    kind:k,
    unit:String(unit||'s'),
    label:String(label||'').slice(0,96),
    note:String(note||'').slice(0,2000),
    scope:scope?String(scope):null,
    features:features&&typeof features==='object'?{...features}:null,
    createdAt:created
  };
}

export function normalizePins(pins=[],sourceKey=null){
  return (Array.isArray(pins)?pins:[])
    .filter(p=>p&&Number.isFinite(Number(p.address))&&(!sourceKey||p.sourceKey===sourceKey))
    .map(p=>makeStreamPin({...p,id:p.id,createdAt:p.createdAt}))
    .sort((a,b)=>a.address-b.address||String(a.createdAt).localeCompare(String(b.createdAt)));
}

export function pinsInDomain(pins=[],range=[0,1]){
  const [lo,hi]=normalizeDomain(range);
  return normalizePins(pins).filter(p=>{
    const end=Number.isFinite(Number(p.endAddress))?Number(p.endAddress):Number(p.address);
    return Number(p.address)<=hi&&end>=lo;
  });
}
