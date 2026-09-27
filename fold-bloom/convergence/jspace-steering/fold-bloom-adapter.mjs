import {readCell} from './kernel.mjs';
import {steeringSupportCalculation} from './steering-calculus.mjs';

export const FOLD_BLOOM_CONTROL_VOCABULARY = Object.freeze({
  BLOOM:'BLOOM', FOLD:'FOLD', SPLIT:'SPLIT', RETURN:'RETURN'
});

const clone=x=>globalThis.structuredClone?structuredClone(x):JSON.parse(JSON.stringify(x));
const stable=x=>JSON.stringify(x);

export function previewFoldBloomDrive(hostSnapshot,nativeForecasts,trace,target,opt={}){
  const before=clone(hostSnapshot);
  const cell=readCell(trace,target);
  if(!cell) return {ok:false,reason:'JLENS_CELL_UNRESOLVED'};
  const map={...FOLD_BLOOM_CONTROL_VOCABULARY,...(opt.vocabulary||{})};
  const token=String(cell.top[0]?.token||'').trim().toUpperCase();
  const verb=map[token]||null;
  if(!verb) return {ok:false,reason:'TOKEN_OUTSIDE_CONTROL_VOCABULARY',token,authority:'PREVIEW'};
  const allForecasts=Array.isArray(nativeForecasts)?nativeForecasts:[];
  const forecasts=allForecasts.filter(x=>x?.verb===verb);
  const calculation=steeringSupportCalculation(trace,target,allForecasts,map);
  const after=clone(hostSnapshot);
  if(stable(before)!==stable(after)) throw new Error('FOLD_BLOOM_PREVIEW_MUTATED_HOST');
  return {
    ok:true,
    schema:'fold-bloom-steering-preview/v0.1',
    authority:'PREVIEW',
    host_ref:opt.host_ref||'fold-bloom://live',
    model_cell_ref:cell.ref,
    observed_token:cell.top[0],
    mapped_verb:verb,
    candidates:forecasts.map(x=>({slot:x.slot,verb:x.verb,chain:x.chain,power:x.power,cadence:x.cadence||null})),
    calculation,
    commit_operation:null,
    law:'model-derived signal may select among already-lawful native forecasts; it cannot execute RELEASE or alter LIVE authority'
  };
}
