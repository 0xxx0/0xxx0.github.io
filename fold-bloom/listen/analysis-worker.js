import {analyzePCM} from './analysis-core.js';
self.onmessage=e=>{
  if(e.data?.type!=='analyze')return;
  try{
    const requestId=e.data.requestId;
    const pcm=new Float32Array(e.data.pcm);
    const map=analyzePCM(pcm,e.data.sampleRate,e.data.duration,p=>postMessage({type:'progress',requestId,progress:p}));
    postMessage({type:'result',requestId,map});
  }catch(error){postMessage({type:'error',requestId:e.data.requestId,error:String(error?.stack||error)})}
};
