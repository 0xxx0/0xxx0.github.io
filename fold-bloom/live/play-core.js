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
export function gardenOutcome(survived,target=GARDEN_SURVIVAL_TARGET){
  const clear=Number(survived)>=Number(target);
  return {clear,label:clear?'LINEAGE STABLE':'LINEAGE OPEN'};
}
