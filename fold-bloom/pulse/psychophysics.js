export const PULSE_PSYCHOPHYSICS_VERSION='FOLD_BLOOM_PULSE_PSYCHOPHYSICS_0.1';

export const TRAIN_PHASES=Object.freeze({
  LOCK:Object.freeze({label:'LOCK',taps:4,law:'stabilize the quarter-note meter before adding competing periodicities'}),
  CROSS:Object.freeze({label:'CROSS',taps:8,law:'alternate attention between the two polyrhythmic pulse streams'}),
  RETURN:Object.freeze({label:'RETURN',taps:4,law:'re-enter the quarter-note meter after rhythmic competition'})
});

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=v=>Number.isFinite(Number(v))?Number(v):0;

export function pulseIntervals({bpm=96,ratio=[3,2]}={}){
  const tempo=clamp(finite(bpm)||96,24,320),beat=60/tempo,bar=beat*4;
  const a=Math.max(1,Math.trunc(finite(ratio?.[0])||3)),b=Math.max(1,Math.trunc(finite(ratio?.[1])||2));
  return {bpm:tempo,beat,bar,a:bar/a,b:bar/b,ratio:[a,b]};
}

// Ring count is a property of the lane set, never of the ratio. The trainer
// targets, scheduler, event tape, and on-screen rings all share these three
// lanes; RATIO only resubdivides the A/B tick counts inside one four-beat bar.
export const PULSE_LANES=Object.freeze(['M','A','B']);
export const PULSE_RING_COUNT=PULSE_LANES.length;

export function pulseRings({ratio=[3,2]}={}){
  const a=Math.max(1,Math.trunc(finite(ratio?.[0])||3)),b=Math.max(1,Math.trunc(finite(ratio?.[1])||2));
  return {rings:PULSE_RING_COUNT,lanes:[...PULSE_LANES],ticks:Object.freeze({M:4,A:a,B:b}),ratio:[a,b]};
}

export function nearestGridEvent(time,start,interval){
  const t=finite(time),s=finite(start),iv=Math.max(.001,finite(interval));
  const index=Math.round((t-s)/iv),target=s+index*iv,error=t-target;
  return {index,target,error,absError:Math.abs(error),phaseError:error/iv};
}

export function phaseAt(time,start,interval){
  const iv=Math.max(.001,finite(interval)),x=(finite(time)-finite(start))/iv;
  return ((x%1)+1)%1;
}

export function makeTrainerState(){
  return {phase:'LOCK',phaseTap:0,cycle:1,totalTaps:0,completedCycles:0};
}

export function trainerTarget(state={}){
  const phase=TRAIN_PHASES[state.phase]?state.phase:'LOCK',i=Math.max(0,Math.trunc(finite(state.phaseTap)));
  if(phase==='LOCK'||phase==='RETURN')return 'M';
  return i%2===0?'A':'B';
}

export function trainerProgress(state={}){
  const phase=TRAIN_PHASES[state.phase]?state.phase:'LOCK',spec=TRAIN_PHASES[phase],i=Math.max(0,Math.trunc(finite(state.phaseTap)));
  return {phase,target:trainerTarget(state),value:Math.min(i,spec.taps),targetTaps:spec.taps,cycle:Math.max(1,Math.trunc(finite(state.cycle))||1)};
}

export function advanceTrainer(state={}){
  const next={...makeTrainerState(),...state};
  const phase=TRAIN_PHASES[next.phase]?next.phase:'LOCK',limit=TRAIN_PHASES[phase].taps;
  next.totalTaps=Math.max(0,Math.trunc(finite(next.totalTaps)))+1;
  next.phaseTap=Math.max(0,Math.trunc(finite(next.phaseTap)))+1;
  let transition=null,cycleComplete=false;
  if(next.phaseTap>=limit){
    next.phaseTap=0;
    if(phase==='LOCK'){next.phase='CROSS';transition='LOCK→CROSS'}
    else if(phase==='CROSS'){next.phase='RETURN';transition='CROSS→RETURN'}
    else{
      next.phase='LOCK';next.completedCycles=Math.max(0,Math.trunc(finite(next.completedCycles)))+1;
      next.cycle=Math.max(1,Math.trunc(finite(next.cycle))||1)+1;transition='RETURN→LOCK';cycleComplete=true;
    }
  }
  return {state:next,transition,cycleComplete};
}

export function evaluateTap({time,start,bpm=96,ratio=[3,2],lane='M'}={}){
  const iv=pulseIntervals({bpm,ratio}),key=String(lane||'M').toUpperCase();
  const interval=key==='A'?iv.a:key==='B'?iv.b:iv.beat;
  const grid=nearestGridEvent(time,start,interval),norm=Math.abs(grid.phaseError);
  // Deliberately bounded/monotonic; a display score, not a neural or musical-quality claim.
  const lock=100*Math.exp(-0.5*(norm/.085)**2);
  return {
    lane:key==='A'||key==='B'?key:'M',
    target:grid.target,
    index:grid.index,
    interval,
    error:grid.error,
    errorMs:grid.error*1000,
    absError:grid.absError,
    phaseError:grid.phaseError,
    lock:Math.round(clamp(lock,0,100))
  };
}

const mean=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0;
const median=xs=>{
  if(!xs.length)return 0;
  const a=[...xs].sort((x,y)=>x-y),m=Math.floor(a.length/2);
  return a.length%2?a[m]:(a[m-1]+a[m])/2;
};
const sd=xs=>{
  if(xs.length<2)return 0;
  const m=mean(xs);return Math.sqrt(xs.reduce((s,x)=>s+(x-m)**2,0)/(xs.length-1));
};
function regressionSlope(xs,ys){
  const n=Math.min(xs.length,ys.length);if(n<3)return null;
  const ax=mean(xs.slice(0,n)),ay=mean(ys.slice(0,n));
  let num=0,den=0;
  for(let i=0;i<n;i++){const dx=xs[i]-ax;num+=dx*(ys[i]-ay);den+=dx*dx}
  return den>1e-12?num/den:null;
}

export function summarizeTapTrace(taps=[]){
  const xs=(Array.isArray(taps)?taps:[]).filter(x=>Number.isFinite(Number(x?.error))).slice(-32);
  if(!xs.length)return {count:0,biasMs:null,jitterMs:null,maeMs:null,medianAbsMs:null,phaseCorrection:null,driftMsPerTap:null,lock:null,anticipation:null};
  const errors=xs.map(x=>Number(x.error)),abs=errors.map(Math.abs),bias=mean(errors),jitter=sd(errors),mae=mean(abs),med=median(abs);
  const lagSlope=errors.length>=4?regressionSlope(errors.slice(0,-1),errors.slice(1)):null;
  // Research-inspired descriptive proxy: 1 - lag-1 error persistence. Not an experimental parameter estimate.
  const phaseCorrection=lagSlope==null?null:clamp(1-lagSlope,-.5,1.5);
  const idx=errors.map((_,i)=>i),drift=regressionSlope(idx,errors);
  const avgInterval=mean(xs.map(x=>Math.max(.001,finite(x.interval))))||.5;
  const normMae=mae/avgInterval,normJitter=jitter/avgInterval;
  const lock=Math.round(clamp(100*Math.exp(-0.5*(normMae/.09)**2)*Math.exp(-0.5*(normJitter/.11)**2),0,100));
  return {
    count:xs.length,
    biasMs:+(bias*1000).toFixed(1),
    jitterMs:+(jitter*1000).toFixed(1),
    maeMs:+(mae*1000).toFixed(1),
    medianAbsMs:+(med*1000).toFixed(1),
    phaseCorrection:phaseCorrection==null?null:+phaseCorrection.toFixed(3),
    driftMsPerTap:drift==null?null:+(drift*1000).toFixed(2),
    lock,
    anticipation:bias<-.006?'EARLY':bias>.006?'LATE':'CENTERED'
  };
}

export function phaseSummary(taps=[],phase){
  return summarizeTapTrace((Array.isArray(taps)?taps:[]).filter(x=>x?.trainPhase===phase));
}

export function returnDelta(taps=[]){
  const lock=phaseSummary(taps,'LOCK'),back=phaseSummary(taps,'RETURN');
  if(!lock.count||!back.count)return {available:false,lockMaeMs:lock.maeMs,returnMaeMs:back.maeMs,deltaMs:null};
  return {available:true,lockMaeMs:lock.maeMs,returnMaeMs:back.maeMs,deltaMs:+(back.maeMs-lock.maeMs).toFixed(1)};
}
