const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function percentile(a,p){
  if(!a.length)return 1;
  const b=Array.from(a).sort((x,y)=>x-y),i=Math.max(0,Math.min(b.length-1,Math.floor((b.length-1)*p)));
  return b[i]||1;
}
function fft(re,im){
  const n=re.length;
  for(let i=1,j=0;i<n;i++){
    let bit=n>>1;
    for(;j&bit;bit>>=1)j^=bit;
    j^=bit;
    if(i<j){const tr=re[i];re[i]=re[j];re[j]=tr;const ti=im[i];im[i]=im[j];im[j]=ti}
  }
  for(let len=2;len<=n;len<<=1){
    const ang=-TAU/len,wr0=Math.cos(ang),wi0=Math.sin(ang);
    for(let i=0;i<n;i+=len){
      let wr=1,wi=0;
      for(let j=0;j<len/2;j++){
        const ar=re[i+j+len/2],ai=im[i+j+len/2],vR=ar*wr-ai*wi,vI=ar*wi+ai*wr,uR=re[i+j],uI=im[i+j];
        re[i+j]=uR+vR;im[i+j]=uI+vI;re[i+j+len/2]=uR-vR;im[i+j+len/2]=uI-vI;
        const nwr=wr*wr0-wi*wi0;wi=wr*wi0+wi*wr0;wr=nwr;
      }
    }
  }
}
function mean(a,start=0,end=a.length){
  let s=0,n=0;for(let i=start;i<end;i++){s+=a[i];n++}return n?s/n:0;
}
const PITCH_NAMES=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
const MAJOR_PROFILE=[6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88];
const MINOR_PROFILE=[6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17];
function cosine(a,b){
  let dot=0,aa=0,bb=0;
  for(let i=0;i<a.length;i++){dot+=a[i]*b[i];aa+=a[i]*a[i];bb+=b[i]*b[i]}
  return aa&&bb?dot/Math.sqrt(aa*bb):0;
}
export function estimateKeyFromChroma(input){
  const chroma=Array.from({length:12},(_,i)=>Math.max(0,Number(input?.[i])||0));
  const total=chroma.reduce((a,b)=>a+b,0);
  if(total<=1e-9)return {tonic:null,mode:null,label:'—',confidence:0,chroma:chroma.map(()=>0)};
  const norm=chroma.map(x=>x/total),candidates=[];
  for(let tonic=0;tonic<12;tonic++){
    const rotated=Array.from({length:12},(_,i)=>norm[(tonic+i)%12]);
    candidates.push({tonic,mode:'major',score:cosine(rotated,MAJOR_PROFILE)});
    candidates.push({tonic,mode:'minor',score:cosine(rotated,MINOR_PROFILE)});
  }
  candidates.sort((a,b)=>b.score-a.score);
  const best=candidates[0],second=candidates[1]||{score:0},gap=Math.max(0,best.score-second.score);
  return {
    tonic:PITCH_NAMES[best.tonic],
    tonicIndex:best.tonic,
    mode:best.mode,
    label:`${PITCH_NAMES[best.tonic]} ${best.mode}`,
    confidence:+clamp(gap*8,0,1).toFixed(3),
    score:+best.score.toFixed(4),
    chroma:norm.map(x=>+x.toFixed(5))
  };
}
export function analyzePCM(pcm,sr,duration=pcm.length/sr,progress=()=>{}){
  const N=1024,H=2048,bins=N>>1,frameCount=Math.max(1,Math.floor((pcm.length-N)/H)+1);
  const re=new Float32Array(N),im=new Float32Array(N),prev=new Float32Array(bins);
  const win=new Float32Array(N);for(let i=0;i<N;i++)win[i]=.5-.5*Math.cos(TAU*i/(N-1));
  const energy=new Float32Array(frameCount),centroid=new Float32Array(frameCount),flux=new Float32Array(frameCount),low=new Float32Array(frameCount),mid=new Float32Array(frameCount),high=new Float32Array(frameCount),chroma=new Float64Array(12);
  const binHz=sr/N;
  for(let f=0;f<frameCount;f++){
    const off=f*H;let ss=0;
    for(let i=0;i<N;i++){const x=pcm[off+i]||0;ss+=x*x;re[i]=x*win[i];im[i]=0}
    fft(re,im);
    let sum=0,weighted=0,lo=0,mi=0,hi=0,fl=0;
    for(let k=1;k<bins;k++){
      const m=Math.hypot(re[k],im[k]);sum+=m;weighted+=m*k*binHz;
      const hz=k*binHz,p=m*m;
      if(hz<180)lo+=p;else if(hz<2000)mi+=p;else hi+=p;
      if(hz>=55&&hz<=5000&&m>1e-9){
        const midi=69+12*Math.log2(hz/440),base=Math.floor(midi),frac=midi-base,weight=Math.pow(m,1.22)/(1+hz/7000);
        const pc0=((base%12)+12)%12,pc1=(pc0+1)%12;
        chroma[pc0]+=weight*(1-frac);chroma[pc1]+=weight*frac;
      }
      const d=m-prev[k];if(d>0)fl+=d;prev[k]=m;
    }
    energy[f]=Math.sqrt(ss/N);centroid[f]=sum?weighted/sum:0;flux[f]=fl/bins;
    const tot=lo+mi+hi||1;low[f]=lo/tot;mid[f]=mi/tot;high[f]=hi/tot;
    if((f&63)===0)progress(f/frameCount);
  }
  const e95=percentile(energy,.95),c95=percentile(centroid,.95),f95=percentile(flux,.95);
  const frames=[];
  for(let i=0;i<frameCount;i++)frames.push({
    t:i*H/sr,e:clamp(energy[i]/e95,0,1.25),c:clamp(centroid[i]/c95,0,1.2),f:clamp(flux[i]/f95,0,1.5),
    l:low[i],m:mid[i],h:high[i]
  });
  const fps=sr/H,minLag=Math.max(2,Math.floor(fps*60/190)),maxLag=Math.max(minLag+1,Math.ceil(fps*60/55));
  const fluxMean=mean(flux),env=Array.from(flux,x=>Math.max(0,x-fluxMean));
  let bestLag=minLag,best=-1,second=-1;
  for(let lag=minLag;lag<=maxLag;lag++){
    let s=0;for(let i=lag;i<env.length;i++)s+=env[i]*env[i-lag];
    if(s>best){second=best;best=s;bestLag=lag}else if(s>second)second=s;
  }
  let bpm=60*fps/bestLag;
  while(bpm<70)bpm*=2;while(bpm>180)bpm/=2;
  const confidence=best>0?clamp((best-second)/(best+1e-9)*4,0,1):0;
  const beatFrames=Math.max(1,Math.round(fps*60/bpm));
  let phase=0,phaseScore=-1;
  for(let p=0;p<beatFrames;p++){let s=0;for(let i=p;i<env.length;i+=beatFrames)s+=env[i];if(s>phaseScore){phaseScore=s;phase=p}}
  const beats=[];
  for(let i=phase;i<frameCount;i+=beatFrames){
    let bi=i,bv=-1;for(let j=Math.max(0,i-2);j<=Math.min(frameCount-1,i+2);j++){if(env[j]>bv){bv=env[j];bi=j}}
    const t=bi*H/sr;if(!beats.length||t-beats[beats.length-1]>.22)beats.push(t);
  }
  const sectionStep=Math.max(4,Math.round((beats.length?beatFrames*8:fps*8)));
  const sections=[{t:0,score:0}];
  let lastVec=null;
  for(let i=0;i<frameCount;i+=sectionStep){
    const end=Math.min(frameCount,i+sectionStep);
    const v=[mean(energy,i,end)/(e95||1),mean(centroid,i,end)/(c95||1),mean(flux,i,end)/(f95||1),mean(low,i,end),mean(high,i,end)];
    if(lastVec){
      const d=Math.sqrt(v.reduce((s,x,k)=>s+(x-lastVec[k])**2,0));
      if(d>.42 && i*H/sr-sections[sections.length-1].t>5)sections.push({t:i*H/sr,score:+d.toFixed(3)});
    }
    lastVec=v;
  }
  sections.push({t:duration,score:0});
  const key=estimateKeyFromChroma(chroma);
  progress(1);
  return {version:'fold-bloom-audio-map/v0.3',stage:'DEEP',preview:false,analysisProfile:'song-fast+harmonic-id',duration,sampleRate:sr,hop:H,window:N,bpm:+bpm.toFixed(2),tempoConfidence:+confidence.toFixed(3),key,frames,beats,sections};
}
