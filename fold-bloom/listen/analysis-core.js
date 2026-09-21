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
export function analyzePCM(pcm,sr,duration=pcm.length/sr,progress=()=>{}){
  const N=2048,H=1024,bins=N>>1,frameCount=Math.max(1,Math.floor((pcm.length-N)/H)+1);
  const re=new Float32Array(N),im=new Float32Array(N),prev=new Float32Array(bins);
  const win=new Float32Array(N);for(let i=0;i<N;i++)win[i]=.5-.5*Math.cos(TAU*i/(N-1));
  const energy=new Float32Array(frameCount),centroid=new Float32Array(frameCount),flux=new Float32Array(frameCount),low=new Float32Array(frameCount),mid=new Float32Array(frameCount),high=new Float32Array(frameCount);
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
  progress(1);
  return {version:'fold-bloom-audio-map/v0.1',duration,sampleRate:sr,hop:H,window:N,bpm:+bpm.toFixed(2),tempoConfidence:+confidence.toFixed(3),frames,beats,sections};
}
