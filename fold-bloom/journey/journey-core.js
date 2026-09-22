import {assertExperienceSet,cloneExperienceSet} from '../experience-set/experience-set.js';

export const JOURNEY_RIDE_VERSION='0.1';
export const SEAM_BEHAVIOR=Object.freeze({
  CUT:Object.freeze({law:'CUT',overlapSeconds:0,gapSeconds:0,carry:false,reset:false}),
  DISSOLVE:Object.freeze({law:'DISSOLVE',overlapSeconds:2.4,gapSeconds:0,carry:false,reset:false}),
  CARRY:Object.freeze({law:'CARRY',overlapSeconds:0,gapSeconds:0,carry:true,reset:false}),
  RESET:Object.freeze({law:'RESET',overlapSeconds:0,gapSeconds:.65,carry:false,reset:true}),
  RETURN:Object.freeze({law:'RETURN',overlapSeconds:0,gapSeconds:0,carry:false,reset:false})
});

const finite=v=>Number.isFinite(Number(v));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const clean=v=>String(v??'').trim();
const clone=v=>JSON.parse(JSON.stringify(v));

export function normalizeBinding(binding){
  if(!binding||!clean(binding.sourceId))throw new TypeError('binding.sourceId required');
  if(!finite(binding.duration)||Number(binding.duration)<0)throw new TypeError('binding.duration must be finite and non-negative');
  return {
    sourceId:clean(binding.sourceId),
    duration:Number(binding.duration),
    label:clean(binding.label)||clean(binding.sourceId),
    available:binding.available!==false
  };
}

export function seamBehavior(law){
  return clone(SEAM_BEHAVIOR[law]||SEAM_BEHAVIOR.CUT);
}

export function buildJourneyPlan(set,bindings=[]){
  assertExperienceSet(set);
  const sourceBindings=new Map(bindings.map(x=>{const b=normalizeBinding(x);return[b.sourceId,b]}));
  const safe=cloneExperienceSet(set);
  const entries=safe.entries.map((entry,index)=>{
    const binding=sourceBindings.get(entry.sourceId)||null;
    const law=entry.transitionOut||((index===safe.entries.length-1)?'RETURN':'CUT');
    return {
      index,
      entryId:entry.id,
      sourceId:entry.sourceId,
      weight:finite(entry.weight)?Number(entry.weight):1,
      law,
      seam:seamBehavior(law),
      duration:binding?.duration||0,
      label:binding?.label||entry.sourceId,
      available:!!binding?.available
    };
  });
  const missing=entries.filter(x=>!x.available).map(x=>x.sourceId);
  return {schema:'fold-bloom-journey-plan/v0.1',setId:safe.id,title:safe.title,entries,missing,ready:entries.length>0&&missing.length===0};
}

export function journeyEntryStart(plan,index){
  if(!plan||!Array.isArray(plan.entries))throw new TypeError('plan.entries required');
  const stop=clamp(Math.trunc(Number(index)||0),0,plan.entries.length);
  let time=0;
  for(let i=0;i<stop;i++){
    const entry=plan.entries[i];
    const next=plan.entries[i+1];
    time+=Math.max(0,Number(entry.duration)||0);
    if(next){time-=Math.min(time,Math.max(0,Number(entry.seam?.overlapSeconds)||0));time+=Math.max(0,Number(entry.seam?.gapSeconds)||0)}
  }
  return +time.toFixed(6);
}

export function journeyAddress(plan,index,sourceTime){
  if(!plan||!Array.isArray(plan.entries)||!plan.entries.length)throw new TypeError('non-empty journey plan required');
  const i=clamp(Math.trunc(Number(index)||0),0,plan.entries.length-1),entry=plan.entries[i];
  const local=clamp(finite(sourceTime)?Number(sourceTime):0,0,Math.max(0,Number(entry.duration)||0));
  const start=journeyEntryStart(plan,i),total=journeyEntryStart(plan,plan.entries.length);
  const journeyTime=start+local;
  return {
    setId:plan.setId,
    entryIndex:i,
    entryId:entry.entryId,
    sourceId:entry.sourceId,
    sourceTime:+local.toFixed(6),
    journeyTime:+journeyTime.toFixed(6),
    journeyDuration:+total.toFixed(6),
    sourceProgress:entry.duration?+(local/entry.duration).toFixed(6):0,
    journeyProgress:total?+clamp(journeyTime/total,0,1).toFixed(6):0,
    law:entry.law
  };
}

export function nextJourneyIndex(plan,index){
  if(!plan||!Array.isArray(plan.entries))return null;
  const i=Math.trunc(Number(index)||0);
  return i+1<plan.entries.length?i+1:null;
}

export function makeJourneyReturn({plan,startedAt,completedAt,events=[]}={}){
  if(!plan||!plan.setId)throw new TypeError('plan required');
  return {
    schema:'fold-bloom-journey-return/v0.1',
    setId:plan.setId,
    title:plan.title,
    startedAt:clean(startedAt)||null,
    completedAt:clean(completedAt)||null,
    status:clean(completedAt)?'RETURNED':'OPEN',
    entries:plan.entries.map(x=>({entryId:x.entryId,sourceId:x.sourceId,law:x.law,duration:x.duration})),
    events:events.map(x=>({type:clean(x.type),entryIndex:Number(x.entryIndex),sourceId:clean(x.sourceId),sourceTime:Number(x.sourceTime)||0,journeyTime:Number(x.journeyTime)||0,law:clean(x.law)||null,at:clean(x.at)||null})),
    sourceBytesIncluded:false
  };
}
