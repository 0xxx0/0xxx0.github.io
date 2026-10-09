// Trusted ESM example. No host/storage/DOM access needed by its operations.
import {define, protocol} from '../../lib/interphase-extensions.mjs';
const vector = x => Array.isArray(x) && x.every(v=>typeof v==='number' && Number.isFinite(v));
export const dot = (a,b) => {
  if (!vector(a) || !vector(b) || a.length!==b.length) throw new TypeError('equal finite vectors required');
  const result=a.reduce((n,v,i)=>n+v*b[i],0);
  if (!Number.isFinite(result)) throw new RangeError('dot product overflow');
  return result;
};
export default define({protocol,id:'vector',version:'1.0.0',types:{vector},laws:{
  dotSymmetry:x=>vector(x) && dot(x,x.map(v=>-v))===dot(x.map(v=>-v),x)
},operators:{dot:(a,{b})=>dot(a,b)}});
