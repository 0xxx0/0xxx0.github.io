export const STATE_LANGUAGE_VERSION='FOLD_BLOOM_STATE_0.1';
export const HEX_LINES=6;

export const TRIGRAMS=Object.freeze({
  '111':Object.freeze({key:'QIAN',glyph:'☰',han:'乾',image:'HEAVEN'}),
  '110':Object.freeze({key:'DUI',glyph:'☱',han:'兌',image:'LAKE'}),
  '101':Object.freeze({key:'LI',glyph:'☲',han:'離',image:'FIRE'}),
  '100':Object.freeze({key:'ZHEN',glyph:'☳',han:'震',image:'THUNDER'}),
  '011':Object.freeze({key:'XUN',glyph:'☴',han:'巽',image:'WIND'}),
  '010':Object.freeze({key:'KAN',glyph:'☵',han:'坎',image:'WATER'}),
  '001':Object.freeze({key:'GEN',glyph:'☶',han:'艮',image:'MOUNTAIN'}),
  '000':Object.freeze({key:'KUN',glyph:'☷',han:'坤',image:'EARTH'}),
});

export function normalizeStateBits(value){
  if(Array.isArray(value)){
    const bits=value.map(Number).filter(x=>x===0||x===1).slice(0,HEX_LINES);
    return bits.length===HEX_LINES?bits:null;
  }
  const raw=String(value??'').replace(/[^01]/g,'');
  if(raw.length!==HEX_LINES)return null;
  return [...raw].map(Number);
}
export function formatState(bits){
  const xs=normalizeStateBits(bits);if(!xs)return '---|---';
  return xs.slice(0,3).join('')+'|'+xs.slice(3,6).join('');
}
export function lineMark(bit){return Number(bit)===1?'━━━':'━ ━'}
export function trigramForBits(bits=[]){
  const xs=Array.isArray(bits)?bits.map(Number):[];
  if(xs.length<3||xs.slice(0,3).some(x=>x!==0&&x!==1))return null;
  return TRIGRAMS[xs.slice(0,3).join('')]||null;
}
export function stateDescriptor(bits){
  const xs=normalizeStateBits(bits);if(!xs)return {valid:false,bits:null,token:'H[---|---]',lower:null,upper:null};
  return {valid:true,bits:xs,token:'H['+formatState(xs)+']',lower:trigramForBits(xs.slice(0,3)),upper:trigramForBits(xs.slice(3,6))};
}
export function movingLines(from,to){
  const a=normalizeStateBits(from),b=normalizeStateBits(to);if(!a||!b)return [];
  return a.map((x,i)=>x===b[i]?null:i+1).filter(Boolean);
}
export function changeMask(from,to){
  const moving=movingLines(from,to);
  return 'Δ{'+moving.join(',')+'}';
}
export function stateChange(from,to){
  const a=stateDescriptor(from),b=stateDescriptor(to),moving=a.valid&&b.valid?movingLines(a.bits,b.bits):[];
  return {
    valid:a.valid&&b.valid,
    from:a,
    to:b,
    moving,
    mask:'Δ{'+moving.join(',')+'}',
    token:(a.valid?a.token:'H[---|---]')+' '+('Δ{'+moving.join(',')+'}')+' → '+(b.valid?b.token:'H[---|---]')
  };
}
export function applyMovingLines(from,lines=[]){
  const xs=normalizeStateBits(from);if(!xs)return null;
  const out=[...xs];
  for(const n of lines){const i=Math.trunc(Number(n))-1;if(i>=0&&i<HEX_LINES)out[i]=out[i]?0:1}
  return out;
}
export function hexPair(lines=[]){
  const xs=Array.isArray(lines)?lines.slice(0,HEX_LINES):[];
  return {complete:xs.length===HEX_LINES,lines:xs,lower:trigramForBits(xs.slice(0,3)),upper:trigramForBits(xs.slice(3,6))};
}
export function hexOutcome(target=[],actual=[]){
  const t=Array.isArray(target)?target.slice(0,HEX_LINES):[],a=Array.isArray(actual)?actual.slice(0,HEX_LINES):[];
  const complete=a.length===HEX_LINES&&t.length===HEX_LINES;
  const matches=a.reduce((n,x,i)=>n+(i<t.length&&Number(x)===Number(t[i])?1:0),0);
  const clear=complete&&matches===HEX_LINES;
  return {complete,clear,matches,label:clear?'HEXAGRAM LOCKED':matches+' / '+HEX_LINES+' LINES'};
}
