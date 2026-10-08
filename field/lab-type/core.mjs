export const W=11,H=15;
const P=(...pts)=>pts;
export const RECIPES={
  A:[P([2,14],[2,8],[5,1],[8,8],[8,14]),P([3,8],[7,8])],
  B:[P([2,1],[2,14]),P([2,1],[7,1],[8,3],[8,5],[7,7],[2,7]),P([2,7],[7,7],[8,9],[8,12],[7,14],[2,14])],
  C:[P([8,2],[6,1],[4,1],[2,3],[2,12],[4,14],[6,14],[8,13])],
  H:[P([2,1],[2,14]),P([8,1],[8,14]),P([2,8],[8,8])],
  I:[P([2,1],[8,1]),P([5,1],[5,14]),P([2,14],[8,14])],
  M:[P([2,14],[2,1],[5,7],[8,1],[8,14])],
  O:[P([4,1],[7,1],[8,3],[8,12],[7,14],[4,14],[2,12],[2,3],[4,1])],
  R:[P([2,14],[2,1]),P([2,1],[7,1],[8,3],[8,6],[7,8],[2,8]),P([5,8],[8,14])],
  S:[P([8,2],[6,1],[4,1],[2,3],[2,6],[4,8],[6,8],[8,10],[8,12],[6,14],[4,14],[2,13])],
  '0':[P([4,1],[7,1],[8,3],[8,12],[7,14],[4,14],[2,12],[2,3],[4,1]),P([3,12],[7,3])],
  '1':[P([3,4],[5,1],[5,14]),P([2,14],[8,14])],
  '8':[P([4,1],[7,1],[8,3],[8,6],[6,8],[4,8],[2,6],[2,3],[4,1]),P([4,8],[6,8],[8,10],[8,12],[6,14],[4,14],[2,12],[2,10],[4,8])]
};

function hash(seed){
  let x=(Number(seed)||0)>>>0;
  return ()=>{x+=0x6D2B79F5;let t=x;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296};
}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export function normalizeRecipe(recipe){
  // Convert any diagonal source segment into one deterministic orthogonal elbow.
  return recipe.map(stroke=>{
    const out=[stroke[0].slice()];
    for(let i=1;i<stroke.length;i++){
      const [x0,y0]=out[out.length-1], [x1,y1]=stroke[i];
      if(x0!==x1 && y0!==y1) out.push([x1,y0]);
      out.push([x1,y1]);
    }
    return dedupe(out);
  });
}
function dedupe(points){
  return points.filter((p,i)=>!i||(p[0]!==points[i-1][0]||p[1]!==points[i-1][1]));
}

export function routeVariant(recipe,{seed=1,density=.45,bendCost=2,amplitude=1}={}){
  const rnd=hash(seed);
  const base=normalizeRecipe(recipe);
  return base.map(stroke=>{
    const out=[stroke[0].slice()];
    for(let i=1;i<stroke.length;i++){
      const a=stroke[i-1], b=stroke[i];
      const dx=b[0]-a[0], dy=b[1]-a[1];
      const len=Math.abs(dx)+Math.abs(dy);
      const chance=clamp(density/(1+Math.max(0,bendCost)*.22),0,.9);
      const canJog=len>=3 && rnd()<chance;
      if(!canJog){ out.push(b.slice()); continue; }
      const amp=(rnd()<.5?-1:1)*Math.max(1,Math.min(2,Math.round(amplitude)));
      if(dx===0){
        const yA=Math.min(a[1],b[1]), yB=Math.max(a[1],b[1]);
        const m1=Math.floor(yA+(yB-yA)/3), m2=Math.ceil(yA+2*(yB-yA)/3);
        const x=clamp(a[0]+amp,0,W-1);
        if(x===a[0]) { out.push(b.slice()); continue; }
        const ya=dy>0?m1:m2, yb=dy>0?m2:m1;
        out.push([a[0],ya],[x,ya],[x,yb],[b[0],yb],b.slice());
      } else if(dy===0){
        const xA=Math.min(a[0],b[0]), xB=Math.max(a[0],b[0]);
        const m1=Math.floor(xA+(xB-xA)/3), m2=Math.ceil(xA+2*(xB-xA)/3);
        const y=clamp(a[1]+amp,0,H-1);
        if(y===a[1]) { out.push(b.slice()); continue; }
        const xa=dx>0?m1:m2, xb=dx>0?m2:m1;
        out.push([xa,a[1]],[xa,y],[xb,y],[xb,b[1]],b.slice());
      } else {
        throw new Error('normalizeRecipe failed');
      }
    }
    return dedupe(out);
  });
}

export function signature(strokes){
  return strokes.map(s=>s.map(p=>p.join(',')).join(';')).join('|');
}
export function pathData(strokes){
  return strokes.map(s=>s.map((p,i)=>(i?'L':'M')+p[0]+' '+p[1]).join(' '));
}
export function svg(strokes,{size=96,stroke=1.05,pad=.7}={}){
  const paths=pathData(strokes).map(d=>`<path d="${d}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${W-1+2*pad} ${H-1+2*pad}" width="${size}" height="${size}" role="img"><g fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="square" stroke-linejoin="miter">${paths}</g></svg>`;
}
export function validate(recipe,variant){
  const base=normalizeRecipe(recipe), errors=[];
  if(base.length!==variant.length)errors.push('stroke-count');
  variant.forEach((stroke,si)=>{
    if(!stroke.length)return errors.push(`empty:${si}`);
    const bs=base[si];
    if(!bs)return;
    const [sx,sy]=stroke[0], [bx,by]=bs[0];
    const [ex,ey]=stroke.at(-1), [bex,bey]=bs.at(-1);
    if(sx!==bx||sy!==by||ex!==bex||ey!==bey)errors.push(`endpoint:${si}`);
    stroke.forEach(([x,y],i)=>{
      if(x<0||x>=W||y<0||y>=H)errors.push(`bounds:${si}:${i}`);
      if(i){const [px,py]=stroke[i-1];if(px!==x&&py!==y)errors.push(`diagonal:${si}:${i}`);if(px===x&&py===y)errors.push(`zero:${si}:${i}`)}
    });
  });
  return {ok:errors.length===0,errors};
}
export function generateGlyph(glyph,opts={}){
  const recipe=RECIPES[glyph]; if(!recipe)throw new Error('unknown glyph '+glyph);
  const strokes=routeVariant(recipe,opts); const check=validate(recipe,strokes);
  return {glyph,strokes,signature:signature(strokes),check,svg:svg(strokes,opts)};
}
