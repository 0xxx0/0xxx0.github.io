import {analyzePCM} from './analysis-core.js';
const sr=22050,dur=16,n=Math.floor(sr*dur),pcm=new Float32Array(n),bpm=120,beat=60/bpm;
for(let i=0;i<n;i++)pcm[i]=Math.sin(2*Math.PI*110*i/sr)*.035;
for(let t=0;t<dur;t+=beat){
  const start=Math.floor(t*sr);
  for(let j=0;j<Math.min(900,n-start);j++){
    const env=Math.exp(-j/125);
    pcm[start+j]+=Math.sin(2*Math.PI*(70-35*j/900)*j/sr)*.9*env;
    if(j<80)pcm[start+j]+=(j%2?1:-1)*.22*(1-j/80);
  }
}
const map=analyzePCM(pcm,sr,dur);
const ok=map.bpm>108&&map.bpm<132&&map.beats.length>=20&&map.frames.length>100&&map.sections.length>=2;
console.log(JSON.stringify({ok,bpm:map.bpm,confidence:map.tempoConfidence,beats:map.beats.length,frames:map.frames.length,sections:map.sections.length}));
if(!ok)process.exit(1);
