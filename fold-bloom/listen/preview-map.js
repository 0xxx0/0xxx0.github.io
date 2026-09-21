const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function percentile(a,p){
  if(!a.length)return 1;
  const b=Array.from(a).sort((x,y)=>x-y),i=Math.max(0,Math.min(b.length-1,Math.floor((b.length-1)*p)));
  return b[i]||1;
}
export function buildPreviewMap(pcm,sr,duration=pcm.length/sr,maxFrames=720){
  const frameCount=Math.max(16,Math.min(maxFrames,Math.ceil(Math.max(1,duration)*3)));
  const block=Math.max(1,Math.floor(pcm.length/frameCount));
  const rawE=new Float32Array(frameCount),rawF=new Float32Array(frameCount),rawC=new Float32Array(frameCount);
  let prevE=0,prevD=0;
  for(let f=0;f<frameCount;f++){
    const start=Math.min(pcm.length-1,f*block),end=f===frameCount-1?pcm.length:Math.min(pcm.length,(f+1)*block);
    const stride=Math.max(1,Math.floor(Math.max(1,end-start)/256));
    let ss=0,diff=0,cross=0,n=0,prev=pcm[start]||0;
    for(let i=start;i<end;i+=stride){
      const x=pcm[i]||0;ss+=x*x;diff+=Math.abs(x-prev);if((x>=0)!==(prev>=0))cross++;prev=x;n++;
    }
    const e=Math.sqrt(ss/Math.max(1,n)),d=diff/Math.max(1,n),c=clamp(cross/Math.max(1,n)*8+d*1.8,0,1.2);
    rawE[f]=e;rawF[f]=Math.abs(e-prevE)+Math.abs(d-prevD)*.45;rawC[f]=c;prevE=e;prevD=d;
  }
  const e95=percentile(rawE,.95),f95=percentile(rawF,.95),c95=percentile(rawC,.95),frameRate=frameCount/Math.max(.001,duration);
  const frames=[];
  for(let i=0;i<frameCount;i++){
    const e=clamp(rawE[i]/e95,0,1.25),f=clamp(rawF[i]/f95,0,1.5),c=clamp(rawC[i]/c95,0,1.2);
    const h=clamp(c*.7+f*.12,0,1),l=clamp(1-c*.62,0,1),m=clamp(1-Math.abs(c-.5)*1.25,0,1);
    frames.push({t:i/frameRate,e,c,f,l,m,h});
  }
  return {
    version:'fold-bloom-audio-preview/v0.1',stage:'PREVIEW',preview:true,duration,
    sampleRate:frameRate,hop:1,frameRate,bpm:0,tempoConfidence:0,frames,beats:[],
    sections:[{t:0,score:0},{t:duration,score:0}]
  };
}
