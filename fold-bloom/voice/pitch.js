export const VOICE_TRAINER_SCHEMA='fold-bloom-voice-trainer/v0.1';

export const PATTERNS=Object.freeze({
  NOTE:Object.freeze([0]),
  CALL:Object.freeze([0,4,7,4]),
  SCALE:Object.freeze([0,2,4,5,7,5,4,2]),
  HUM:null
});

const NOTE_NAMES=['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export function midiToHz(midi){return 440*Math.pow(2,(Number(midi)-69)/12)}
export function hzToMidi(hz){return hz>0?69+12*Math.log2(Number(hz)/440):NaN}
export function midiToName(midi){
  const m=Math.round(Number(midi));
  if(!Number.isFinite(m))return'—';
  return NOTE_NAMES[((m%12)+12)%12]+(Math.floor(m/12)-1);
}
export function centsBetween(hz,targetHz){
  if(!(hz>0)||!(targetHz>0))return NaN;
  return 1200*Math.log2(hz/targetHz);
}
export function patternTarget(baseMidi,pattern='NOTE',step=0){
  const seq=Object.hasOwn(PATTERNS,pattern)?PATTERNS[pattern]:PATTERNS.NOTE;
  if(!seq)return null;
  return Number(baseMidi)+seq[((Math.trunc(step)%seq.length)+seq.length)%seq.length];
}

export function estimatePitch(samples,sampleRate,opt={}){
  if(!samples||samples.length<64||!(sampleRate>0))return{hz:0,clarity:0,rms:0};
  const minHz=Number(opt.minHz)||75,maxHz=Number(opt.maxHz)||900,rmsFloor=Number(opt.rmsFloor)||.012;
  const stride=samples.length>=1400?2:1,n=Math.min(samples.length,4096),len=Math.ceil(n/stride);
  const work=new Float32Array(len),workRate=sampleRate/stride;
  let mean=0,k=0;
  for(let i=0;i<n;i+=stride){const v=Number(samples[i])||0;work[k++]=v;mean+=v}
  mean/=Math.max(1,k);
  let ss=0;
  for(let i=0;i<k;i++){work[i]-=mean;ss+=work[i]*work[i]}
  const rms=Math.sqrt(ss/Math.max(1,k));
  if(rms<rmsFloor)return{hz:0,clarity:0,rms};

  const minLag=Math.max(2,Math.floor(workRate/maxHz));
  const maxLag=Math.min(Math.floor(k/2),Math.ceil(workRate/minHz));
  if(maxLag<=minLag)return{hz:0,clarity:0,rms};

  const corr=new Float32Array(maxLag+1);
  let best=-1,bestLag=minLag;
  for(let lag=minLag;lag<=maxLag;lag++){
    let num=0,a2=0,b2=0;
    const end=k-lag;
    for(let i=0;i<end;i++){
      const a=work[i],b=work[i+lag];
      num+=a*b;a2+=a*a;b2+=b*b;
    }
    const c=num/(Math.sqrt(a2*b2)+1e-12);
    corr[lag]=c;
    if(c>best){best=c;bestLag=lag}
  }

  const threshold=Math.max(.58,best*.9);
  let chosen=bestLag;
  for(let lag=minLag+1;lag<maxLag;lag++){
    if(corr[lag]>=threshold&&corr[lag]>=corr[lag-1]&&corr[lag]>=corr[lag+1]){chosen=lag;break}
  }
  const y1=corr[Math.max(minLag,chosen-1)],y2=corr[chosen],y3=corr[Math.min(maxLag,chosen+1)];
  const d=y1-2*y2+y3,frac=Math.abs(d)>1e-9?.5*(y1-y3)/d:0;
  const refined=chosen+clamp(frac,-.5,.5),hz=refined>0?workRate/refined:0;
  if(y2<.55||hz<minHz*.92||hz>maxHz*1.08)return{hz:0,clarity:clamp(y2,0,1),rms};
  return{hz,clarity:clamp(y2,0,1),rms};
}

export function stabilityCents(history=[]){
  const xs=history.filter(Number.isFinite).slice(-12);
  if(xs.length<3)return null;
  const mean=xs.reduce((a,b)=>a+b,0)/xs.length;
  const variance=xs.reduce((s,x)=>s+(x-mean)**2,0)/xs.length;
  return Math.sqrt(variance);
}
