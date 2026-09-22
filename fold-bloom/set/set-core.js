import {EXPERIENCE_SET_SCHEMA,TRANSITION_LAWS,assertExperienceSet,cloneExperienceSet} from '../experience-set/experience-set.js';

export const SET_COMPOSITOR_VERSION='0.1.1';
export const SEAM_LAWS=Object.freeze(['CUT','DISSOLVE','CARRY','RESET']);

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const now=()=>new Date().toISOString();
const clean=s=>String(s??'').trim();

function fnv1a32(text){
  let h=0x811c9dc5;
  for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0}
  return h.toString(16).padStart(8,'0');
}

export function setFingerprintMaterial(set){
  return (set?.entries||[]).map((e,i)=>({
    n:i,
    sourceId:String(e.sourceId||''),
    transitionOut:String(e.transitionOut||((i===(set.entries.length-1))?'RETURN':'CUT'))
  }));
}

export function deriveSetId(set){
  return 'set:'+fnv1a32(JSON.stringify(setFingerprintMaterial(set)));
}

export function createExperienceSet(title='UNTITLED SET'){
  const t=now();
  const set={schema:EXPERIENCE_SET_SCHEMA,id:'set:empty',title:clean(title)||'UNTITLED SET',entries:[],createdAt:t,updatedAt:t};
  set.id=deriveSetId(set);
  return set;
}

export function seamLaws(set){
  const entries=Array.isArray(set?.entries)?set.entries:[];
  return entries.slice(0,-1).map((e,i)=>{
    const law=e.transitionOut||entries[i+1]?.transitionIn||'CUT';
    return SEAM_LAWS.includes(law)?law:'CUT';
  });
}

export function applySeams(set,laws=seamLaws(set)){
  const out=cloneExperienceSet(set);
  for(let i=0;i<out.entries.length;i++){
    delete out.entries[i].transitionIn;
    out.entries[i].transitionOut=i===out.entries.length-1?'RETURN':(SEAM_LAWS.includes(laws[i])?laws[i]:'CUT');
    if(i>0)out.entries[i].transitionIn=out.entries[i-1].transitionOut;
  }
  out.id=deriveSetId(out);
  out.updatedAt=now();
  return out;
}

function uniqueEntryId(entries,sourceId){
  const root='entry:'+fnv1a32(String(sourceId||'source'));
  let n=1,id=root;
  const used=new Set(entries.map(e=>e.id));
  while(used.has(id))id=root+':'+(++n);
  return id;
}

export function appendSource(set,sourceId,{weight=1,landmarkIds=[]}={}){
  const key=clean(sourceId);
  if(!key)throw new TypeError('sourceId required');
  const out=cloneExperienceSet(set);
  const oldLaws=seamLaws(out);
  if(out.entries.length)oldLaws.push('CUT');
  out.entries.push({
    id:uniqueEntryId(out.entries,key),
    sourceId:key,
    weight:clamp(Number(weight)||1,.1,10),
    transitionOut:'RETURN',
    landmarkIds:Array.isArray(landmarkIds)?landmarkIds.map(String):[]
  });
  return applySeams(out,oldLaws);
}

export function removeEntry(set,index){
  const out=cloneExperienceSet(set),i=Math.trunc(Number(index));
  if(i<0||i>=out.entries.length)return out;
  const laws=seamLaws(out);
  out.entries.splice(i,1);
  if(laws.length)laws.splice(Math.min(i,laws.length-1),1);
  return applySeams(out,laws);
}

export function reorderEntries(set,from,to){
  const out=cloneExperienceSet(set),n=out.entries.length;
  let a=Math.trunc(Number(from)),b=Math.trunc(Number(to));
  if(a<0||a>=n||b<0||b>=n||a===b)return out;
  const laws=seamLaws(out),[entry]=out.entries.splice(a,1);
  out.entries.splice(b,0,entry);
  return applySeams(out,laws);
}

export function setSeamLaw(set,index,law){
  if(!SEAM_LAWS.includes(law))throw new TypeError('seam law must be '+SEAM_LAWS.join(', '));
  const out=cloneExperienceSet(set),i=Math.trunc(Number(index));
  if(i<0||i>=Math.max(0,out.entries.length-1))return out;
  const laws=seamLaws(out);laws[i]=law;
  return applySeams(out,laws);
}

export function cycleSeamLaw(set,index,dir=1){
  const laws=seamLaws(set),current=laws[index]||'CUT',i=SEAM_LAWS.indexOf(current);
  return setSeamLaw(set,index,SEAM_LAWS[(i+(Number(dir)<0?-1:1)+SEAM_LAWS.length)%SEAM_LAWS.length]);
}

export function setEntryWeight(set,index,weight){
  const out=cloneExperienceSet(set),i=Math.trunc(Number(index));
  if(i<0||i>=out.entries.length)return out;
  out.entries[i].weight=+clamp(Number(weight)||1,.1,10).toFixed(2);
  out.id=deriveSetId(out);out.updatedAt=now();return out;
}

export function renameSet(set,title){
  const out=cloneExperienceSet(set);out.title=clean(title)||'UNTITLED SET';out.updatedAt=now();return out;
}

export function prepareSet(set){
  const out=applySeams(cloneExperienceSet(set));
  out.id=deriveSetId(out);
  assertExperienceSet(out);
  for(const entry of out.entries){
    if(!TRANSITION_LAWS.includes(entry.transitionOut))throw new TypeError('invalid transition');
  }
  return out;
}
