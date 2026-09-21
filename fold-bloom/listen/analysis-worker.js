import {analyzePCM} from './analysis-core.js';
self.onmessage=e=>{
  if(e.data?.type!=='analyze')return;
  try{
    const pcm=new Float32Array(e.data.pcm);
    const map=analyzePCM(pcm,e.data.sampleRate,e.data.duration,p=>postMessage({type:'progress',progress:p}));
    postMessage({type:'result',map});
  }catch(error){postMessage({type:'error',error:String(error?.stack||error)})}
};
