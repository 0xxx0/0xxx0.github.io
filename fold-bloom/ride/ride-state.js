import {journeyAddress,journeyEntryStart,seamBehavior} from '../journey/journey-core.js';
import {createRideState as createLiveRideState,cloneRideState} from '../live/ride.js';

export const UNIFIED_RIDE_SCHEMA='fold-bloom-unified-ride/v0.1';
export const RIDE_SCOPE_VALUES=Object.freeze(['BEAT','PHRASE','SECTION','TRACK']);
const EPS=1e-6;

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const clone=x=>JSON.parse(JSON.stringify(x));
const clean=x=>String(x??'').trim();

function requirePlan(plan){
  if(!plan||!Array.isArray(plan.entries)||!plan.entries.length)throw new TypeError('non-empty journey plan required');
  return plan;
}
function totalDuration(plan){return journeyEntryStart(requirePlan(plan),plan.entries.length)}
function starts(plan){return plan.entries.map((_,i)=>journeyEntryStart(plan,i))}
function ends(plan,ss=starts(plan)){return plan.entries.map((e,i)=>ss[i]+Math.max(0,Number(e.duration)||0))}

export function singleSourcePlan({sourceId,duration,label=null}={}){
  const id=clean(sourceId);
  if(!id)throw new TypeError('sourceId required');
  const d=Math.max(0,Number(duration)||0);
  return {
    schema:'fold-bloom-journey-plan/v0.1',
    runtimeOnly:true,
    setId:'source:'+id,
    title:clean(label)||id,
    entries:[{
      index:0,
      entryId:'entry:'+id,
      sourceId:id,
      weight:1,
      law:'RETURN',
      seam:seamBehavior('RETURN'),
      duration:d,
      label:clean(label)||id,
      available:true
    }],
    missing:[],
    ready:true
  };
}

function layer(plan,index,t,start,end){
  const entry=plan.entries[index],sourceTime=clamp(t-start,0,Math.max(0,end-start));
  return {
    role:'PRIMARY',
    entryIndex:index,
    entryId:entry.entryId,
    sourceId:entry.sourceId,
    sourceTime:+sourceTime.toFixed(6),
    gain:1
  };
}

function seamRecord({law='CUT',phase='SOURCE',fromIndex=null,toIndex=null,progress=0,behavior=null}={}){
  const b=behavior||seamBehavior(law);
  return {
    law,
    phase,
    fromIndex,
    toIndex,
    progress:+clamp(Number(progress)||0,0,1).toFixed(6),
    overlapSeconds:Number(b.overlapSeconds)||0,
    gapSeconds:Number(b.gapSeconds)||0,
    carry:!!b.carry,
    reset:!!b.reset
  };
}

export function rideAddressAtJourneyTime(plan,journeyTime=0){
  requirePlan(plan);
  const ss=starts(plan),ee=ends(plan,ss),total=totalDuration(plan),t=clamp(Number(journeyTime)||0,0,total);
  const active=[];
  for(let i=0;i<plan.entries.length;i++){
    const last=i===plan.entries.length-1;
    if(t+EPS>=ss[i]&&(last?t<=ee[i]+EPS:t<ee[i]-EPS))active.push(i);
  }

  // RESET creates a real no-source gap.
  if(!active.length){
    for(let i=0;i<plan.entries.length-1;i++){
      if(t+EPS>=ee[i]&&t<ss[i+1]-EPS){
        const entry=plan.entries[i],gap=Math.max(EPS,ss[i+1]-ee[i]),p=(t-ee[i])/gap;
        return {
          setId:plan.setId,
          entryIndex:i,
          entryId:entry.entryId,
          sourceId:entry.sourceId,
          sourceTime:+Math.max(0,Number(entry.duration)||0).toFixed(6),
          journeyTime:+t.toFixed(6),
          journeyDuration:+total.toFixed(6),
          sourceProgress:1,
          journeyProgress:total?+clamp(t/total,0,1).toFixed(6):0,
          sourceActive:false,
          layers:[],
          seam:seamRecord({law:entry.law,phase:'GAP',fromIndex:i,toIndex:i+1,progress:p,behavior:entry.seam}),
          incomingLaw:entry.law
        };
      }
    }
  }

  const primaryIndex=active.length?active[active.length-1]:plan.entries.length-1;
  const primaryEntry=plan.entries[primaryIndex];
  const primary=layer(plan,primaryIndex,t,ss[primaryIndex],ee[primaryIndex]);
  let layers=active.map(i=>layer(plan,i,t,ss[i],ee[i]));
  let seam;

  if(active.length>=2){
    const fromIndex=active[active.length-2],toIndex=primaryIndex,from=plan.entries[fromIndex],overlap=Math.max(EPS,Number(from.seam?.overlapSeconds)||0);
    const p=clamp((t-ss[toIndex])/overlap,0,1);
    layers=layers.map(x=>x.entryIndex===fromIndex?{...x,role:'OUTGOING',gain:+(1-p).toFixed(6)}:
      x.entryIndex===toIndex?{...x,role:'INCOMING',gain:+p.toFixed(6)}:x);
    seam=seamRecord({law:from.law,phase:'OVERLAP',fromIndex,toIndex,progress:p,behavior:from.seam});
  }else if(primaryIndex>0&&Math.abs(t-ss[primaryIndex])<=EPS){
    const prev=plan.entries[primaryIndex-1];
    seam=seamRecord({law:prev.law,phase:'ENTER',fromIndex:primaryIndex-1,toIndex:primaryIndex,progress:1,behavior:prev.seam});
  }else if(primaryIndex===plan.entries.length-1&&Math.abs(t-total)<=EPS){
    seam=seamRecord({law:primaryEntry.law||'RETURN',phase:'RETURN',fromIndex:primaryIndex,toIndex:null,progress:1,behavior:primaryEntry.seam});
  }else{
    seam=seamRecord({law:primaryEntry.law,phase:'SOURCE',fromIndex:primaryIndex,toIndex:primaryIndex+1<plan.entries.length?primaryIndex+1:null,progress:0,behavior:primaryEntry.seam});
  }

  const addr=journeyAddress(plan,primaryIndex,primary.sourceTime);
  return {
    ...addr,
    journeyTime:+t.toFixed(6),
    journeyDuration:+total.toFixed(6),
    journeyProgress:total?+clamp(t/total,0,1).toFixed(6):0,
    sourceActive:true,
    layers,
    seam,
    incomingLaw:primaryIndex>0?plan.entries[primaryIndex-1].law:null
  };
}

export function seamDisposition(address){
  const s=address?.seam||seamRecord();
  if(s.phase==='RETURN'||s.law==='RETURN')return {
    projection:'KEEP',
    focus:'KEEP',
    live:'KEEP',
    audio:'RETURN',
    returnRequested:true
  };
  if(s.reset)return {
    projection:'KEEP',
    focus:'RESET_WHOLE',
    live:'RESET',
    audio:s.phase==='GAP'?'SILENT_GAP':'ENTER',
    returnRequested:false
  };
  if(s.carry)return {
    projection:'KEEP',
    focus:'CARRY_APERTURE',
    live:'CARRY',
    audio:'CUT',
    returnRequested:false
  };
  if(s.phase==='OVERLAP')return {
    projection:'KEEP',
    focus:'FOLLOW_INCOMING',
    live:'DOMAIN',
    audio:'CROSSFADE',
    returnRequested:false
  };
  return {
    projection:'KEEP',
    focus:'FOLLOW_INCOMING',
    live:'DOMAIN',
    audio:'CUT',
    returnRequested:false
  };
}

function normalizeFocus(focus,address){
  const f=focus&&typeof focus==='object'?focus:{};
  return {
    id:clean(f.id)||address?.sourceId||null,
    aperture:clean(f.aperture)||'TRACK',
    followTransport:f.followTransport!==false,
    address:f.address&&typeof f.address==='object'?clone(f.address):{
      sourceId:address?.sourceId||null,
      sourceTime:Number(address?.sourceTime)||0,
      journeyTime:Number(address?.journeyTime)||0
    }
  };
}
function normalizeProjection(projection){
  if(typeof projection==='string')return{name:clean(projection)||'RIDE',params:{}};
  return {
    name:clean(projection?.name)||'RIDE',
    params:projection?.params&&typeof projection.params==='object'?clone(projection.params):{}
  };
}
function normalizeListen(listen={}){
  const scope=RIDE_SCOPE_VALUES.includes(clean(listen.scope).toUpperCase())?clean(listen.scope).toUpperCase():'TRACK';
  return {
    scope,
    pinId:listen.pinId==null?null:clean(listen.pinId),
    mapStage:listen.mapStage==null?null:clean(listen.mapStage),
    mapRef:listen.mapRef==null?null:clean(listen.mapRef)
  };
}

export function createUnifiedRideState({plan,object=null,journeyTime=0,focus=null,projection='RIDE',listen=null,live=null,returnFrame=null}={}){
  requirePlan(plan);
  const address=rideAddressAtJourneyTime(plan,journeyTime);
  const inferredKind=String(plan.setId||'').startsWith('source:')?'AUDIO':'SET';
  const obj={
    kind:clean(object?.kind)||inferredKind,
    id:clean(object?.id)||(inferredKind==='SET'?plan.setId:address.sourceId),
    planId:plan.setId,
    title:clean(object?.title)||clean(plan.title)||null
  };
  return {
    schema:UNIFIED_RIDE_SCHEMA,
    object:obj,
    address,
    focus:normalizeFocus(focus,address),
    projection:normalizeProjection(projection),
    listen:normalizeListen(listen||{}),
    live:cloneRideState(live||createLiveRideState()),
    return:{
      status:returnFrame?'CAPTURED':'EMPTY',
      frame:returnFrame?clone(returnFrame):null,
      origin:null,
      requestedAt:null,
      reason:null
    },
    events:[]
  };
}

export function withJourneyTime(state,plan,journeyTime){
  const next=clone(state),address=rideAddressAtJourneyTime(plan,journeyTime);
  next.address=address;
  if(next.focus?.followTransport){
    next.focus.id=address.sourceId;
    next.focus.address={sourceId:address.sourceId,sourceTime:address.sourceTime,journeyTime:address.journeyTime};
  }
  return next;
}

export function withSourceTime(state,plan,entryIndex,sourceTime){
  const addr=journeyAddress(plan,entryIndex,sourceTime);
  return withJourneyTime(state,plan,addr.journeyTime);
}

export function setRideFocus(state,focus){
  const next=clone(state);
  next.focus=normalizeFocus(focus,next.address);
  return next;
}

export function setRideProjection(state,projection){
  const next=clone(state);
  next.projection=normalizeProjection(projection);
  return next;
}

export function setRideListen(state,listen){
  const next=clone(state);
  next.listen=normalizeListen({...next.listen,...(listen||{})});
  return next;
}

function returnOrigin(state){
  return {
    object:clone(state.object),
    address:clone(state.address),
    focus:clone(state.focus),
    projection:clone(state.projection),
    listen:clone(state.listen),
    live:clone(state.live)
  };
}
export function captureRideReturn(state,frame){
  const next=clone(state);
  next.return={
    status:'CAPTURED',
    frame:frame?clone(frame):null,
    origin:returnOrigin(state),
    requestedAt:null,
    reason:null
  };
  next.events.push({type:'RETURN_CAPTURE',journeyTime:next.address.journeyTime,sourceId:next.address.sourceId});
  return next;
}

export function requestRideReturn(state,reason='RETURN'){
  const next=clone(state);
  next.return={...next.return,status:'REQUESTED',requestedAt:new Date().toISOString(),reason:clean(reason)||'RETURN'};
  next.events.push({type:'RETURN_REQUEST',reason:next.return.reason,journeyTime:next.address.journeyTime,sourceId:next.address.sourceId});
  return next;
}
