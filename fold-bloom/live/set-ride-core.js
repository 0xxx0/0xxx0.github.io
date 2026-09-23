import {buildJourneyPlan,journeyEntryStart} from '../journey/journey-core.js';
import {
  createUnifiedRideState,withSourceTime,withJourneyTime,requestRideReturn
} from '../ride/ride-state.js';

export const LIVE_SET_RIDE_VERSION='0.1.0';
export const LIVE_SET_RIDE_SCHEMA='fold-bloom-live-set-ride/v0.1';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));

export function createLiveSetRide(set,bindings=[],{live=null,returnFrame=null}={}){
  const plan=buildJourneyPlan(set,bindings),ready=!!plan.ready;
  return {
    schema:LIVE_SET_RIDE_SCHEMA,
    version:LIVE_SET_RIDE_VERSION,
    ready,
    status:ready?'READY':'MISSING_SOURCE',
    index:0,
    plan,
    ride:ready?createUnifiedRideState({
      plan,
      object:{kind:'SET',id:plan.setId,title:plan.title},
      live,
      returnFrame
    }):null,
    events:[]
  };
}

export function currentSetRideEntry(session){
  return session?.plan?.entries?.[Math.max(0,Math.trunc(Number(session?.index)||0))]||null;
}

export function syncLiveSetRide(session,{entryIndex=session?.index||0,sourceTime=0,journeyTime=null}={}){
  if(!session?.ready||!session.ride)throw new TypeError('ready live set ride required');
  const next={...session,events:[...(session.events||[])]};
  next.ride=finite(journeyTime)
    ?withJourneyTime(session.ride,session.plan,Number(journeyTime))
    :withSourceTime(session.ride,session.plan,entryIndex,sourceTime);
  next.index=next.ride.address.entryIndex;
  return next;
}

export function setRideSeamAction(session,{sourceTime=null,ended=false,transitioning=false}={}){
  const entry=currentSetRideEntry(session),plan=session?.plan;
  if(!entry||!plan)return {type:'NONE'};
  const nextIndex=entry.index+1<plan.entries.length?entry.index+1:null;
  const t=finite(sourceTime)?clamp(Number(sourceTime),0,Math.max(0,Number(entry.duration)||0)):Number(session?.ride?.address?.sourceTime)||0;
  const remaining=Math.max(0,(Number(entry.duration)||0)-t),law=entry.law||'CUT',seam=entry.seam||{};

  if(nextIndex===null){
    return ended?{type:'RETURN',law:'RETURN',entryIndex:entry.index,sourceId:entry.sourceId}:{type:'NONE',law,remaining};
  }
  if(law==='DISSOLVE'&&!transitioning&&!ended&&remaining<=Math.max(.01,Number(seam.overlapSeconds)||0)+.03){
    return {
      type:'START_DISSOLVE',law,nextIndex,
      durationSeconds:Math.max(0,Number(seam.overlapSeconds)||0),
      journeyTime:journeyEntryStart(plan,nextIndex)
    };
  }
  if(!ended)return {type:'NONE',law,remaining};
  if(law==='RESET'){
    return {
      type:'RESET_NEXT',law,nextIndex,
      gapSeconds:Math.max(0,Number(seam.gapSeconds)||0),
      resetLive:true,carry:false
    };
  }
  return {
    type:'LOAD_NEXT',law,nextIndex,
    gapSeconds:0,resetLive:false,carry:law==='CARRY'
  };
}

export function dissolveJourneyTime(session,nextIndex,elapsedSeconds=0){
  if(!session?.plan?.entries?.[nextIndex])throw new RangeError('valid nextIndex required');
  const overlap=Math.max(0,Number(session.plan.entries[nextIndex-1]?.seam?.overlapSeconds)||0);
  return +(journeyEntryStart(session.plan,nextIndex)+clamp(Number(elapsedSeconds)||0,0,overlap)).toFixed(6);
}

export function markLiveSetRideEvent(session,type,data={}){
  const next={...session,events:[...(session?.events||[])]};
  next.events.push({
    type:String(type||'EVENT'),
    at:new Date().toISOString(),
    entryIndex:next.index,
    sourceId:next.ride?.address?.sourceId||null,
    sourceTime:Number(next.ride?.address?.sourceTime)||0,
    journeyTime:Number(next.ride?.address?.journeyTime)||0,
    ...data
  });
  next.events=next.events.slice(-96);
  return next;
}

export function completeLiveSetRide(session,reason='terminal seam'){
  if(!session?.ready||!session.ride)return session;
  let next=markLiveSetRideEvent(session,'RETURN',{reason});
  next={...next,status:'RETURNED',ride:requestRideReturn(next.ride,reason)};
  return next;
}

export function liveSetRideReturn(session){
  return {
    schema:'fold-bloom-live-set-return/v0.1',
    version:LIVE_SET_RIDE_VERSION,
    createdAt:new Date().toISOString(),
    setId:session?.plan?.setId||null,
    title:session?.plan?.title||null,
    status:session?.status||'UNKNOWN',
    address:session?.ride?.address||null,
    focus:session?.ride?.focus||null,
    projection:session?.ride?.projection||null,
    events:[...(session?.events||[])],
    sourceBytesIncluded:false
  };
}
