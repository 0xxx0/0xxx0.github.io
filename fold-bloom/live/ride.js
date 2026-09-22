const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export const RIDE_SCHEMA='fold-bloom-ride/v0.1';

function splitWitness(point){
  if(!point||!(Number(point.deformSplit)>.08))return null;
  const op=(point.deformActive||[]).find(x=>x?.verb==='SPLIT');
  return {
    id:op?.id||`split@${Number(point.t||0).toFixed(3)}`,
    ahead:Math.max(0,Number(point.ahead)||0),
    strength:clamp(Number(point.deformSplit)||0,0,1),
    t:Number(point.t)||0
  };
}

export function splitOpportunity(world,{maxAhead=3.4}={}){
  if(!world?.points?.length)return null;
  let best=null;
  for(const p of world.points){
    const w=splitWitness(p);
    if(!w||w.ahead>maxAhead)continue;
    if(!best||w.ahead<best.ahead)best=w;
  }
  return best;
}

export function createRideState(){
  return {
    schema:RIDE_SCHEMA,
    choice:0,
    target:0,
    lateral:0,
    splitId:null,
    branchChoices:0,
    lastChoiceAt:null,
    lastChoiceAhead:null,
    trace:[]
  };
}

export function cloneRideState(s){
  return {...createRideState(),...(s||{}),trace:Array.isArray(s?.trace)?s.trace.map(x=>({...x})):[]};
}

export function chooseRideBranch(state,dir,world,time=0){
  const n=cloneRideState(state);
  const d=Math.sign(Number(dir)||0);
  if(!d)return {state:n,event:null};
  const opp=splitOpportunity(world);
  if(!opp)return {state:n,event:null};
  if(n.splitId===opp.id&&n.choice===d)return {state:n,event:null};
  n.choice=d;
  n.target=d;
  n.splitId=opp.id;
  n.branchChoices++;
  n.lastChoiceAt=Number(time)||0;
  n.lastChoiceAhead=opp.ahead;
  const event={
    kind:'BRANCH_CHOICE',
    splitId:opp.id,
    direction:d,
    label:d<0?'LEFT':'RIGHT',
    at:+(Number(time)||0).toFixed(4),
    ahead:+opp.ahead.toFixed(3),
    strength:+opp.strength.toFixed(3)
  };
  n.trace.push(event);
  n.trace=n.trace.slice(-24);
  return {state:n,event};
}

function splitStillPresent(world,splitId){
  if(!world?.points?.length||!splitId)return false;
  return world.points.some(p=>(p.deformActive||[]).some(x=>x?.verb==='SPLIT'&&x?.id===splitId&&Number(x.strength)>.03));
}

export function advanceRide(state,world,dt=.016,time=0){
  const n=cloneRideState(state);
  const delta=clamp(Number(dt)||0,0,.12);
  const returnNow=Number(world?.points?.[0]?.deformReturn)||0;
  const still=splitStillPresent(world,n.splitId);
  if(n.splitId&&(!still||returnNow>.28)){
    n.choice=0;
    n.target=0;
    n.splitId=null;
  }
  const k=1-Math.exp(-delta*7.5);
  n.lateral+=((Number(n.target)||0)-n.lateral)*k;
  if(Math.abs(n.lateral)<.001&&n.target===0)n.lateral=0;
  n.lateral=clamp(n.lateral,-1,1);
  return n;
}

export function rideView(state,world){
  const n=cloneRideState(state);
  const opp=splitOpportunity(world);
  return {
    choice:n.choice,
    lateral:+n.lateral.toFixed(4),
    splitId:n.splitId,
    branchChoices:n.branchChoices,
    opportunity:opp,
    label:n.choice<0?'LEFT':n.choice>0?'RIGHT':opp?'CHOOSE':'OPEN'
  };
}
