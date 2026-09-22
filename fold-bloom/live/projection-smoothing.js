const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const KEYS=['centerX','baseY','half','branchGap','branchHalf','z'];
const ROOT_KEYS=['currentSpeed','currentGrade','currentBend'];

export const PROJECTION_SMOOTH_SCHEMA='fold-bloom-projection-smooth/v0.1';

export function stabilizeProjection(prev,next,dt=1/60,rate=15){
  if(!next?.slices?.length)return next||null;
  if(!prev?.slices||prev.slices.length!==next.slices.length){
    return {...next,slices:next.slices.map(x=>({...x}))};
  }
  const a=1-Math.exp(-clamp(Number(dt)||0,0,.12)*Math.max(.1,Number(rate)||15));
  const slices=next.slices.map((n,i)=>{
    const p=prev.slices[i]||n,out={...n};
    for(const k of KEYS){
      const nv=Number(n[k]),pv=Number(p[k]);
      if(Number.isFinite(nv)&&Number.isFinite(pv))out[k]=pv+(nv-pv)*a;
    }
    return out;
  });
  const out={...next,slices};
  for(const k of ROOT_KEYS){
    const nv=Number(next[k]),pv=Number(prev[k]);
    if(Number.isFinite(nv)&&Number.isFinite(pv))out[k]=pv+(nv-pv)*a;
  }
  return out;
}
