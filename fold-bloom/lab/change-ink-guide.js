import {normalizeStateBits,formatState} from '../state-language.js';

export const CHANGE_INK_GUIDE_SCHEMA='fold-bloom-change-ink-guide/v0.1';

const round=x=>Number(Number(x).toFixed(6));

export function stateMatrixPoint(value){
  const bits=normalizeStateBits(value);
  if(!bits)return null;
  const lower=parseInt(bits.slice(0,3).join(''),2);
  const upper=parseInt(bits.slice(3,6).join(''),2);
  return {
    bits:[...bits],
    binary:bits.join(''),
    token:'H['+formatState(bits)+']',
    lower,
    upper,
    x:round(lower/7),
    y:round(1-upper/7)
  };
}

export function changePathInkGuide(path,{cursor=0}={}){
  if(!path?.ok||!Array.isArray(path.steps)||!path.path_address){
    return {ok:false,schema:CHANGE_INK_GUIDE_SCHEMA,reason:'ADDRESSED_STEP_PATH_REQUIRED'};
  }
  const first=stateMatrixPoint(path.from_token);
  if(!first)return {ok:false,schema:CHANGE_INK_GUIDE_SCHEMA,reason:'VALID_START_STATE_REQUIRED'};
  const rawPoints=[{...first,step:0,address:path.path_address+'/step/0'}];
  for(const step of path.steps){
    const point=stateMatrixPoint(step.after_binary||step.after_token);
    if(!point)return {ok:false,schema:CHANGE_INK_GUIDE_SCHEMA,reason:'VALID_STEP_STATE_REQUIRED'};
    rawPoints.push({...point,step:Number(step.step)||rawPoints.length,line:Number(step.line)||null,address:step.address||null});
  }
  const focusIndex=Math.max(0,Math.min(rawPoints.length-1,Math.trunc(Number(cursor)||0)));
  const points=rawPoints.map((point,i)=>({...point,active:i===focusIndex,past:i<focusIndex,future:i>focusIndex}));
  const focus=points[focusIndex]||points[0];
  return {
    ok:true,
    schema:CHANGE_INK_GUIDE_SCHEMA,
    authority:'PROJECTION_ONLY',
    address:path.path_address,
    cursor:focusIndex,
    focus:{step:focus.step,address:focus.address,token:focus.token,binary:focus.binary,x:focus.x,y:focus.y},
    order:Array.isArray(path.selected_order)?[...path.selected_order]:[],
    axes:{x:'LOWER_TRIGRAM_BINARY',y:'UPPER_TRIGRAM_BINARY',domain:[0,7],display_y:'INVERTED_FOR_CANVAS'},
    points,
    law:'the selected ordered state path and current preview focus are projected onto the 8×8 lower-trigram × upper-trigram state matrix; the guide carries geometry and address only, never brush authorship or host effect authority'
  };
}
