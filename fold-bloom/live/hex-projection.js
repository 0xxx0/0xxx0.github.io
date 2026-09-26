import {stateDescriptor,stateChange,lineMark} from '../state-language.js';
import {lineBitForVerb} from './play-core.js';

export const HEX_PROJECTION_VERSION='FOLD_BLOOM_HEX_PROJECTION_0.1';
export const HEX_LINE_COUNT=6;
export const EXACT_VERB_CHOICES=4;
export const HEX_LINE_CHOICES=2;
export const EXACT_FORM_STATES=EXACT_VERB_CHOICES**HEX_LINE_COUNT;
export const HEXAGRAM_STATES=HEX_LINE_CHOICES**HEX_LINE_COUNT;
export const EXACT_FORMS_PER_HEXAGRAM=EXACT_FORM_STATES/HEXAGRAM_STATES;

export function relationPolarity(verb){
  const bit=lineBitForVerb(verb);
  if(bit===1)return {bit,line:lineMark(bit),polarity:'YANG',relationClass:'SAME/NEAR'};
  if(bit===0)return {bit,line:lineMark(bit),polarity:'YIN',relationClass:'FAR/OPPOSITE'};
  return null;
}

export function hexBitsFromForm(form=[]){
  const xs=Array.isArray(form)?form.slice(0,HEX_LINE_COUNT):[];
  if(xs.length!==HEX_LINE_COUNT)return null;
  const bits=xs.map(lineBitForVerb);
  return bits.every(x=>x===0||x===1)?bits:null;
}

export function partialHexLines(form=[]){
  return Array.from({length:HEX_LINE_COUNT},(_,i)=>{
    const verb=Array.isArray(form)?form[i]:null,p=relationPolarity(verb);
    return {index:i+1,verb:verb||null,bit:p?.bit??null,line:p?.line||'·',polarity:p?.polarity||null,relationClass:p?.relationClass||null};
  });
}

export function hexProjection(form=[]){
  const bits=hexBitsFromForm(form),descriptor=bits?stateDescriptor(bits):null;
  return {
    version:HEX_PROJECTION_VERSION,
    complete:!!bits,
    bits,
    lines:partialHexLines(form),
    token:descriptor?.token||'H[---|---]',
    lower:descriptor?.lower||null,
    upper:descriptor?.upper||null,
    exactFormsPerHexagram:EXACT_FORMS_PER_HEXAGRAM
  };
}

export function hexChangeProjection(from=[],to=[]){
  const a=hexBitsFromForm(from),b=hexBitsFromForm(to);
  if(!a||!b)return {valid:false,from:hexProjection(from),to:hexProjection(to),moving:[],mask:'Δ{}',token:'H[---|---] Δ{} → H[---|---]'};
  const change=stateChange(a,b);
  return {...change,version:HEX_PROJECTION_VERSION,projection:'RELATION_DISTANCE_BINARY_QUOTIENT',exactFormsPerHexagram:EXACT_FORMS_PER_HEXAGRAM};
}
