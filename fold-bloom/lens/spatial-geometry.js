import {clamp} from '../../lib/polar-control.js';

export const rad=d=>Number(d||0)*Math.PI/180;
export const M=Object.freeze({
  id:()=>[1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1],
  mul:(a,b)=>{const o=Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o},
  t:(x=0,y=0,z=0)=>[1,0,0,0, 0,1,0,0, 0,0,1,0, Number(x)||0,Number(y)||0,Number(z)||0,1],
  rx:a=>{const c=Math.cos(a),s=Math.sin(a);return[1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]},
  ry:a=>{const c=Math.cos(a),s=Math.sin(a);return[c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]},
  sc:(x=1,y=x,z=x)=>[x,0,0,0, 0,y,0,0, 0,0,z,0, 0,0,0,1],
  css:m=>'matrix3d('+m.map(n=>Math.abs(n)<1e-10?0:+n.toFixed(6)).join(',')+')'
});

// Pure projection geometry. No Scale Lens object/address/RETURN authority lives here.
export function lensViewMatrix({yaw=-27,pitch=17,depth=-115}={}){
  return M.mul(M.t(0,0,Number(depth)||0),M.mul(M.rx(rad(clamp(Number(pitch)||0,-70,70))),M.ry(rad(Number(yaw)||0))));
}
export function lineageSlabMatrix(index,node,count,{selectedId=null,spacing=118,depthStep=58}={}){
  const i=Number(index)||0,n=Math.max(1,Number(count)||1),center=(n-1)/2,hash=Number(node?.hash)>>>0;
  const x=(i-center)*spacing,y=(hash%37)-18,z=(i-n+1)*depthStep,twist=((hash%11)-5)*1.1,scale=node?.id===selectedId?1.05:1;
  return M.mul(M.t(x,y,z),M.mul(M.ry(rad(twist)),M.sc(scale)));
}
export const clampLensPitch=v=>clamp(Number(v)||0,-70,70);
export const clampLensDepth=v=>clamp(Number(v)||0,-520,150);
