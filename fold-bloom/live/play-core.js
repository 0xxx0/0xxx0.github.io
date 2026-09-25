export const PLAY_CORE_VERSION = 'FOLD_BLOOM_PLAY_CORE_0.2';
export const RUN_LENGTH = 8;
export const RUN_WIN_HITS = 6;
export const PUZZLE_ROUNDS = 5;
export const PUZZLE_WIN_STARS = 10;
export const DUET_ROUNDS = 6;
export const DUET_WIN_HITS = 5;
export const GARDEN_GENERATIONS = 3;
export const GARDEN_MOVES = 4;
export const GARDEN_SURVIVAL_TARGET = 2;
export const HEX_LINES = 6;

export const TRIGRAMS = Object.freeze({
  '111':Object.freeze({key:'QIAN',glyph:'☰',han:'乾',image:'HEAVEN'}),
  '110':Object.freeze({key:'DUI',glyph:'☱',han:'兌',image:'LAKE'}),
  '101':Object.freeze({key:'LI',glyph:'☲',han:'離',image:'FIRE'}),
  '100':Object.freeze({key:'ZHEN',glyph:'☳',han:'震',image:'THUNDER'}),
  '011':Object.freeze({key:'XUN',glyph:'☴',han:'巽',image:'WIND'}),
  '010':Object.freeze({key:'KAN',glyph:'☵',han:'坎',image:'WATER'}),
  '001':Object.freeze({key:'GEN',glyph:'☶',han:'艮',image:'MOUNTAIN'}),
  '000':Object.freeze({key:'KUN',glyph:'☷',han:'坤',image:'EARTH'}),
});

export const RELATION_LEGEND = Object.freeze([
  ['SAME','BLOOM'],
  ['NEAR','FOLD'],
  ['FAR','RETURN'],
  ['OPPOSITE','SPLIT'],
]);

export const GARDEN_TRAITS = Object.freeze({
  BODY: Object.freeze({label:'BODY', short:'make one chain ×2+', detail:'One release must chain through at least two cells.'}),
  PATH: Object.freeze({label:'PATH', short:'write two structural ops', detail:'Make any two FOLD / SPLIT / RETURN releases.'}),
  VOICE: Object.freeze({label:'VOICE', short:'hit three of four calls', detail:'Match the CALL on at least three releases.'}),
});

export function wrap(value,n=6){
  const x=Number(value)||0;
  return ((x%n)+n)%n;
}
export function circularDistance(a,b,n=6){
  const d=Math.abs(wrap(a,n)-wrap(b,n));
  return Math.min(d,n-d);
}
export function relationVerb(a,b,n=6){
  const d=circularDistance(a,b,n);
  if(d===0)return 'BLOOM';
  if(d===1)return 'FOLD';
  if(d===2)return 'RETURN';
  return 'SPLIT';
}
export function relationName(a,b,n=6){
  const d=circularDistance(a,b,n);
  if(d===0)return 'SAME';
  if(d===1)return 'NEAR';
  if(d===2)return 'FAR';
  return 'OPPOSITE';
}
export function lineBitForVerb(verb){
  const v=String(verb||'').toUpperCase();
  if(v==='BLOOM'||v==='FOLD')return 1;
  if(v==='SPLIT'||v==='RETURN')return 0;
  return null;
}
export function lineMark(bit){return Number(bit)===1?'━━━':'━ ━'}
export function trigramForBits(bits=[]){
  if(!Array.isArray(bits)||bits.length<3)return null;
  const key=bits.slice(0,3).map(x=>Number(x)===1?'1':'0').join('');
  return TRIGRAMS[key]||null;
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

export function runOutcome(hits,releases=RUN_LENGTH){
  const complete=Number(releases)>=RUN_LENGTH;
  const clear=complete&&Number(hits)>=RUN_WIN_HITS;
  return {complete,clear,label:clear?(Number(hits)>=RUN_LENGTH?'PERFECT ROAD':'ROAD HELD'):'ROAD DRIFTED'};
}
export function puzzleStars(callMet,turns,par){
  if(!callMet)return 0;
  const used=Math.max(0,Number(turns)||0);
  const target=Math.max(0,Number(par)||0);
  if(used<=target)return 3;
  if(used<=target+1)return 2;
  return 1;
}
export function puzzleOutcome(stars){
  const clear=Number(stars)>=PUZZLE_WIN_STARS;
  return {clear,label:clear?'PUZZLE SOLVED':'PUZZLE OPEN'};
}
export function duetOutcome(hits,releases=DUET_ROUNDS){
  const complete=Number(releases)>=DUET_ROUNDS;
  const clear=complete&&Number(hits)>=DUET_WIN_HITS;
  return {complete,clear,label:clear?'DUET LOCKED':'DUET OPEN'};
}
export function gardenGoalMet(trait,events=[]){
  const xs=Array.isArray(events)?events:[];
  if(trait==='BODY')return xs.some(e=>(Number(e?.chain)||0)>=2);
  if(trait==='PATH')return xs.filter(e=>['FOLD','SPLIT','RETURN'].includes(String(e?.verb||''))).length>=2;
  if(trait==='VOICE')return xs.filter(e=>!!e?.callMet).length>=3;
  return false;
}
export function gardenSummary(events=[]){
  const xs=Array.isArray(events)?events:[];
  return {
    hits:xs.filter(e=>!!e?.callMet).length,
    best:xs.reduce((m,e)=>Math.max(m,Number(e?.chain)||1),1),
    structural:xs.filter(e=>['FOLD','SPLIT','RETURN'].includes(String(e?.verb||''))).length,
    verbs:xs.map(e=>String(e?.verb||'')).filter(Boolean),
  };
}
export function gardenProgress(trait,events=[]){
  const s=gardenSummary(events);
  if(trait==='BODY')return {value:Math.min(s.best,2),target:2,label:'CHAIN '+s.best+'× / 2×',complete:s.best>=2};
  if(trait==='PATH')return {value:Math.min(s.structural,2),target:2,label:'STRUCTURE '+s.structural+' / 2',complete:s.structural>=2};
  if(trait==='VOICE')return {value:Math.min(s.hits,3),target:3,label:'CALLS '+s.hits+' / 3',complete:s.hits>=3};
  return {value:0,target:0,label:'OBSERVE',complete:false};
}
export function gardenOutcome(survived,target=GARDEN_SURVIVAL_TARGET){
  const clear=Number(survived)>=Number(target);
  return {clear,label:clear?'LINEAGE STABLE':'LINEAGE OPEN'};
}
