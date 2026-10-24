// Projection-only experiment. Never writes FIELD identity or generated recipes.
import {RECIPES,normalizeRecipe,generateGlyph,signature} from './core.mjs';
export const GLYPHS=Object.keys(RECIPES);
export const PARAMS=Object.freeze({density:.65,bendCost:1.2,amplitude:1});
export function trial(seed=1){
  let state=Number(seed)>>>0;
  const items=GLYPHS.flatMap(glyph=>[
    {glyph,profile:'source',seed:0,strokes:normalizeRecipe(RECIPES[glyph])},
    ...[1,2].map(seed=>({glyph,profile:'variant',seed,strokes:generateGlyph(glyph,{...PARAMS,seed}).strokes}))
  ]).map(x=>({...x,pixels:32,signature:signature(x.strokes)}));
  for(let i=items.length-1;i>0;i--){state=(Math.imul(state,1664525)+1013904223)>>>0;const j=state%(i+1);[items[i],items[j]]=[items[j],items[i]]}
  return items;
}
export function score(items,answers){
  if(items.length!==36||answers.length!==items.length)throw Error('Complete all 36 trials before scoring');
  const confusion={},counts={source:0,variant:0};
  for(let i=0;i<items.length;i++){
    if(!GLYPHS.includes(answers[i]?.response)&&answers[i]?.response!=='?')throw Error('Invalid response');
    if(!Number.isFinite(answers[i].ms)||answers[i].ms<0)throw Error('Invalid response time');
    const x=items[i],a=answers[i].response;
    if(a===x.glyph)counts[x.profile]++;else if(x.profile==='variant'){const key=x.glyph+'→'+a;confusion[key]=(confusion[key]||0)+1}
  }
  const repeated=Object.entries(confusion).filter(([,n])=>n>1).map(([pair])=>pair);
  return {sourceCorrect:counts.source,sourceTotal:12,variantCorrect:counts.variant,variantTotal:24,confusion,repeated,
    decision:counts.source===12&&counts.variant>=23&&!repeated.length?'CANDIDATE_FOR_OUTLINES':'STOP_OR_REDUCE',
    scope:'One reader, one device, 32 CSS pixels, fixed parameters; not population legibility or font proof'};
}
