export const FORM_PUZZLE_VERSION='FOLD_BLOOM_FORM_0.1';
export const FORM_SLOTS=6;
export const FORM_CHANGE_TARGET=2;
export const FORM_CHANGE_LIMIT=4;
export const FORM_VERBS=Object.freeze(['BLOOM','FOLD','SPLIT','RETURN']);
export const FORM_GLYPHS=Object.freeze({BLOOM:'B',FOLD:'F',SPLIT:'S',RETURN:'R'});

const wrap=(n,m=FORM_SLOTS)=>((Math.trunc(Number(n)||0)%m)+m)%m;
export function normalizeFormVerb(value){
  const v=String(value||'').toUpperCase();
  return FORM_VERBS.includes(v)?v:null;
}
export function formAddress(rotation){return wrap(rotation,FORM_SLOTS)}
export function appendFormVerb(form=[],verb){
  const v=normalizeFormVerb(verb),xs=Array.isArray(form)?form.slice(0,FORM_SLOTS).map(normalizeFormVerb):[];
  if(!v||xs.length>=FORM_SLOTS)return xs;
  xs.push(v);return xs;
}
export function writeFormVerb(form=[],address,verb){
  const v=normalizeFormVerb(verb),xs=Array.from({length:FORM_SLOTS},(_,i)=>normalizeFormVerb(form?.[i]));
  if(!v)return xs;
  xs[wrap(address)]=v;return xs;
}
export function changedFormSlots(from=[],to=[]){
  const a=Array.from({length:FORM_SLOTS},(_,i)=>normalizeFormVerb(from?.[i]));
  const b=Array.from({length:FORM_SLOTS},(_,i)=>normalizeFormVerb(to?.[i]));
  return a.map((v,i)=>v!==b[i]?i+1:null).filter(Boolean);
}
export function formComplete(form=[]){
  return Array.isArray(form)&&form.length===FORM_SLOTS&&form.every(x=>!!normalizeFormVerb(x));
}
export function formToken(form=[]){
  const xs=Array.from({length:FORM_SLOTS},(_,i)=>FORM_GLYPHS[normalizeFormVerb(form?.[i])]||'·');
  return 'F['+xs.join(' ')+']';
}
export function formDelta(from=[],to=[]){
  const moving=changedFormSlots(from,to);
  return {from:[...from],to:[...to],moving,mask:'Δ{'+moving.join(',')+'}',token:formToken(from)+' Δ{'+moving.join(',')+'} → '+formToken(to)};
}
export function formChangeOutcome(from=[],to=[],moves=0,target=FORM_CHANGE_TARGET,limit=FORM_CHANGE_LIMIT){
  const changed=changedFormSlots(from,to),clear=changed.length>=Number(target),complete=clear||Number(moves)>=Number(limit);
  return {complete,clear,changed,label:clear?'FORM MORPHED':complete?'MORPH OPEN':'MORPH LIVE'};
}
export function formDiversity(form=[]){
  return new Set((Array.isArray(form)?form:[]).map(normalizeFormVerb).filter(Boolean)).size;
}
