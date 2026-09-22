import {analyzePCM,estimateKeyFromChroma} from './analysis-core.js';
import {buildPreviewMap} from './preview-map.js';
import {scopeWindow,scrubTime} from './audio-map.js';
import {normalizePulse,FIELD_PULSE_SCHEMA} from '../../lib/field-pulse.js';
import {scrubByDelta,stepAddress,makeStreamPin,pinsInDomain,STREAM_LENS_SCHEMA} from './stream-lens.js';
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
const preview=buildPreviewMap(pcm,sr,dur);
const map=analyzePCM(pcm,sr,dur);
const beatWindow=scopeWindow(map,8,'BEAT'),phraseWindow=scopeWindow(map,8,'PHRASE'),trackWindow=scopeWindow(map,8,'TRACK');
const pulse=normalizePulse({source:'TEST',kind:'transport',seq:2,data:{bpm:map.bpm}});
const frozen=scopeWindow(map,8,'PHRASE'),scrubA=scrubTime(frozen,.1),scrubB=scrubTime(frozen,.9),degenerateOk=scrubTime([4,4],.8)===4,gestureOk=degenerateOk&&Math.abs(scrubTime(frozen,0)-frozen[0])<1e-9&&Math.abs(scrubTime(frozen,1)-frozen[1])<1e-9&&scrubA>frozen[0]&&scrubB<frozen[1]&&scrubB>scrubA;
const scopeOk=(beatWindow[1]-beatWindow[0])<(phraseWindow[1]-phraseWindow[0])&&(phraseWindow[1]-phraseWindow[0])<(trackWindow[1]-trackWindow[0]);
const pulseOk=pulse.schema===FIELD_PULSE_SCHEMA&&pulse.source==='TEST'&&pulse.kind==='transport'&&pulse.seq===2;
const knownKey=estimateKeyFromChroma([6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88]);
const horizontalOk=scrubByDelta(frozen,8,120)>8&&stepAddress(frozen,8,-1)<8;
const pin=makeStreamPin({sourceKey:'test',address:8.25,label:'MARK',note:'fixture',scope:'PHRASE'}),pinOk=pin.schema===STREAM_LENS_SCHEMA&&pinsInDomain([pin],[8,9]).length===1;
const keyOk=knownKey.label==='C major'&&typeof map.key?.label==='string'&&Array.isArray(map.key?.chroma)&&map.key.chroma.length===12;
const ok=preview.stage==='PREVIEW'&&preview.frames.length>=24&&preview.duration===dur&&map.bpm>108&&map.bpm<132&&map.beats.length>=20&&map.frames.length>40&&map.sections.length>=2&&scopeOk&&pulseOk&&gestureOk&&horizontalOk&&pinOk&&keyOk;
console.log(JSON.stringify({ok,previewFrames:preview.frames.length,bpm:map.bpm,confidence:map.tempoConfidence,key:map.key,knownKey,horizontalOk,pinOk,beats:map.beats.length,frames:map.frames.length,sections:map.sections.length,scopeOk,pulseOk,gestureOk,degenerateOk,beatWindow,phraseWindow,frozen,scrubA,scrubB}));
if(!ok)process.exit(1);
