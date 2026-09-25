import {transportFromMap} from '../live/track.js';

export const STEP_RIDE_SCHEMA='fold-bloom-step-ride/v0.1';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
const cleanOp=x=>['FOLD','BLOOM','SPLIT','RETURN','PASS'].includes(String(x||'').toUpperCase())?String(x).toUpperCase():null;

export function createStepRide(map,{steps=48,index=0,scope='TRACK',operations=[]}={}){
  const count=Math.max(8,Math.min(192,Math.trunc(Number(steps)||48)));
  return {
    schema:STEP_RIDE_SCHEMA,
    index:Math.max(0,Math.min(count-1,Math.trunc(Number(index)||0))),
    count,
    scope:String(scope).toUpperCase()==='SECTION'?'SECTION':'TRACK',
    operations:Array.isArray(operations)?operations.slice(-64):[]
  };
}

export function stepRideTime(map,state){
  const s=createStepRide(map,state),duration=Math.max(.001,Number(map?.duration)||1);
  return duration*(s.index/Math.max(1,s.count-1));
}

export function stepRideView(map,state){
  const s=createStepRide(map,state),time=stepRideTime(map,s),transport=transportFromMap(map,time,false);
  return {
    schema:STEP_RIDE_SCHEMA,
    index:s.index,count:s.count,turn:s.index+1,scope:s.scope,
    progress:s.index/Math.max(1,s.count-1),time,duration:Number(map?.duration)||0,
    transport,
    operations:s.operations.slice()
  };
}

export function setStepRideIndex(map,state,index,operation=null){
  const s=createStepRide(map,state),next=Math.max(0,Math.min(s.count-1,Math.trunc(Number(index)||0))),op=cleanOp(operation);
  s.index=next;
  if(op){
    const t=stepRideTime(map,s);
    s.operations=[...s.operations,{turn:next+1,index:next,time:+t.toFixed(4),operation:op}].slice(-64);
  }
  return s;
}

export function advanceStepRide(map,state,delta=1,operation=null){
  const s=createStepRide(map,state);
  return setStepRideIndex(map,s,s.index+(Number(delta)||0),operation);
}

export function setStepRideScope(map,state,scope='TRACK'){
  const s=createStepRide(map,state);s.scope=String(scope).toUpperCase()==='SECTION'?'SECTION':'TRACK';return s;
}

export function stepRideMinimap(map,state,{samples=64}={}){
  const view=stepRideView(map,state),duration=Math.max(.001,Number(map?.duration)||1),tr=view.transport||{};
  const section=state?.scope==='SECTION'&&Number.isFinite(Number(tr.sectionStart))&&Number(tr.sectionEnd)>Number(tr.sectionStart);
  const start=section?Number(tr.sectionStart):0,end=section?Number(tr.sectionEnd):duration,n=Math.max(16,Math.min(160,Math.trunc(Number(samples)||64)));
  const points=[];
  for(let i=0;i<n;i++){
    const p=i/Math.max(1,n-1),time=start+(end-start)*p,t=transportFromMap(map,time,false)||{};
    points.push({p:+p.toFixed(5),time:+time.toFixed(4),energy:+(Number(t.energy)||0).toFixed(4),flux:+(Number(t.flux)||0).toFixed(4),brightness:+(Number(t.brightness)||0).toFixed(4),sectionIndex:Number.isFinite(Number(t.sectionIndex))?Number(t.sectionIndex):-1});
  }
  const cursor=end>start?clamp((view.time-start)/(end-start),0,1):0;
  return {scope:section?'SECTION':'TRACK',start,end,cursor,points};
}
