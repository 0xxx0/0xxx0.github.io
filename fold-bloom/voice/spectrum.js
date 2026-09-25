export const VOICE_SPECTRUM_SCHEMA='fold-bloom-voice-spectrum/v0.1';

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number(v)||0));
const finiteDb=v=>Number.isFinite(Number(v))?Number(v):-120;

export function logSpectrumBands(dbBins,sampleRate,fftSize,{bands=48,minHz=80,maxHz=6000,floorDb=-100,ceilDb=-24}={}){
  const src=dbBins||[],n=Math.max(4,Math.trunc(Number(bands)||48)),nyquist=Math.max(1,Number(sampleRate)||48000)/2;
  const hi=Math.min(Math.max(minHz+1,Number(maxHz)||6000),nyquist),lo=Math.max(20,Math.min(Number(minHz)||80,hi-1));
  const out=new Float32Array(n);
  for(let b=0;b<n;b++){
    const f0=lo*Math.pow(hi/lo,b/n),f1=lo*Math.pow(hi/lo,(b+1)/n);
    const i0=Math.max(0,Math.floor(f0*fftSize/sampleRate)),i1=Math.min(src.length-1,Math.max(i0,Math.ceil(f1*fftSize/sampleRate)));
    let peak=-120;
    for(let i=i0;i<=i1;i++)peak=Math.max(peak,finiteDb(src[i]));
    out[b]=clamp((peak-floorDb)/Math.max(1,ceilDb-floorDb));
  }
  return out;
}

export function spectrumFeatures(dbBins,sampleRate,fftSize,opt={}){
  const src=dbBins||[],minHz=Math.max(20,Number(opt.minHz)||80),maxHz=Math.min((Number(sampleRate)||48000)/2,Number(opt.maxHz)||6000);
  let power=0,weighted=0,high=0,peakPower=0,peakHz=0;
  const rows=[];
  for(let i=1;i<src.length;i++){
    const hz=i*sampleRate/fftSize;if(hz<minHz||hz>maxHz)continue;
    const db=finiteDb(src[i]),p=Math.pow(10,db/10);
    power+=p;weighted+=p*hz;if(hz>=1500)high+=p;rows.push([hz,p]);
    if(p>peakPower){peakPower=p;peakHz=hz}
  }
  const centroidHz=power>0?weighted/power:0,brightness=power>0?high/power:0;
  let rolloffHz=0;
  if(power>0){
    const target=power*.85;let acc=0;
    for(const [hz,p] of rows){acc+=p;if(acc>=target){rolloffHz=hz;break}}
  }
  return {
    schema:VOICE_SPECTRUM_SCHEMA,
    centroidHz:+centroidHz.toFixed(2),
    peakHz:+peakHz.toFixed(2),
    rolloffHz:+rolloffHz.toFixed(2),
    brightness:+brightness.toFixed(4),
    bands:logSpectrumBands(src,sampleRate,fftSize,opt)
  };
}
