const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const TAU=Math.PI*2;

function hexSeed(input=''){
  const s=String(input||'');
  let h=2166136261>>>0;
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0}
  return h>>>0;
}
function avg(xs,key){if(!xs?.length)return 0;let s=0;for(const x of xs)s+=Number(x?.[key])||0;return s/xs.length}
function sampleFrames(frames=[],n=24){
  if(!frames.length)return Array.from({length:n},()=>({e:.2,c:.4,f:.05,l:.3,m:.4,h:.3}));
  return Array.from({length:n},(_,i)=>frames[Math.min(frames.length-1,Math.round(i*(frames.length-1)/(n-1)))]||{});
}
export function audioGlyphDescriptor(map={},source={}){
  const frames=sampleFrames(map.frames,24),hash=String(source.hash||map.source?.hash||source.sourceId||map.source?.sourceId||'UNHASHED');
  const seed=hexSeed(hash),rotation=((seed%360)/360)*TAU;
  const radial=frames.map(f=>clamp(.38+(Number(f.e)||0)*.19+(Number(f.f)||0)*.11+(Number(f.c)||0)*.07,.28,.86));
  const chroma=Array.isArray(map.key?.chroma)&&map.key.chroma.length===12?map.key.chroma.map(x=>clamp(Number(x)||0,0,1)):Array.from({length:12},(_,i)=>{
    const f=frames[Math.floor(i*frames.length/12)]||{};
    return clamp(((Number(f.l)||0)*(11-i)+(Number(f.m)||0)*6+(Number(f.h)||0)*(i+1))/18,0,1);
  });
  const maxC=Math.max(.0001,...chroma),normChroma=chroma.map(x=>x/maxC);
  return {
    schema:'fold-bloom-audio-glyph/v0.1',
    sourceHash:hash,
    seed,
    rotation:+rotation.toFixed(6),
    bpm:+(Number(map.bpm)||0).toFixed(2),
    key:map.key?.label||source.providerKey||map.source?.providerKey||null,
    sectionCount:Math.max(1,(map.sections?.length||1)-1),
    means:{energy:+avg(frames,'e').toFixed(4),flux:+avg(frames,'f').toFixed(4),brightness:+avg(frames,'c').toFixed(4)},
    radial:radial.map(x=>+x.toFixed(4)),
    chroma:normChroma.map(x=>+x.toFixed(4))
  };
}
function polar(cx,cy,r,a){return [cx+Math.cos(a)*r,cy+Math.sin(a)*r]}
export function audioGlyphSvg(input,{size=128,padding=10}={}){
  const d=input?.schema?input:audioGlyphDescriptor(input?.map||input||{},input?.source||{});
  const S=Math.max(64,Number(size)||128),c=S/2,R=(S/2)-Math.max(4,Number(padding)||10),rot=Number(d.rotation)||0;
  const pts=d.radial.map((v,i)=>polar(c,c,R*v,rot-TAU/4+TAU*i/d.radial.length));
  const path=pts.map((p,i)=>(i?'L':'M')+p.map(x=>x.toFixed(2)).join(' ')).join(' ')+' Z';
  const spokes=d.chroma.map((v,i)=>{
    const a=rot-TAU/4+TAU*i/12,[x1,y1]=polar(c,c,R*.18,a),[x2,y2]=polar(c,c,R*(.30+.55*v),a);
    return `<path d="M${x1.toFixed(2)} ${y1.toFixed(2)} L${x2.toFixed(2)} ${y2.toFixed(2)}" opacity="${(.16+.58*v).toFixed(3)}"/>`;
  }).join('');
  const sections=Math.min(16,Math.max(1,Number(d.sectionCount)||1)),arcs=Array.from({length:sections},(_,i)=>{
    const a=rot+TAU*i/sections,[x,y]=polar(c,c,R*.94,a),[x2,y2]=polar(c,c,R,a);
    return `<path d="M${x.toFixed(2)} ${y.toFixed(2)} L${x2.toFixed(2)} ${y2.toFixed(2)}" opacity=".66"/>`;
  }).join('');
  const tempo=clamp((Number(d.bpm)||90)/200,.2,1),inner=R*(.12+.11*tempo);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" role="img" aria-label="audio fingerprint glyph"><rect width="${S}" height="${S}" fill="#05070b"/><g fill="none" stroke="#eef5f8" stroke-linecap="square"><circle cx="${c}" cy="${c}" r="${(R*.94).toFixed(2)}" opacity=".14"/>${arcs}<path d="${path}" stroke-width="1.35" opacity=".78"/><g stroke-width="1">${spokes}</g><circle cx="${c}" cy="${c}" r="${inner.toFixed(2)}" stroke="#ffb347" stroke-width="1.6" opacity=".9"/></g></svg>`;
}
export function audioGlyphDataUri(desc,opts){
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(audioGlyphSvg(desc,opts));
}
