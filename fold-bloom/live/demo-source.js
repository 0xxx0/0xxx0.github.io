export const FIELD_DEMO_SCHEMA='fold-bloom-field-audio-demo/v0.1';
export const FIELD_DEMO_DURATION=16;
export const FIELD_DEMO_SAMPLE_RATE=22050;

const TAU=Math.PI*2;
const clamp=v=>Math.max(-1,Math.min(1,v));
const frac=v=>v-Math.floor(v);
const noise=i=>frac(Math.sin(i*12.9898+78.233)*43758.5453123)*2-1;
const env=(t,rate)=>Math.exp(-Math.max(0,t)*rate);

export function renderFieldDemoPcm({duration=FIELD_DEMO_DURATION,sampleRate=FIELD_DEMO_SAMPLE_RATE}={}){
  const sr=Math.max(8000,Math.trunc(sampleRate)),dur=Math.max(8,Number(duration)||FIELD_DEMO_DURATION),n=Math.round(sr*dur),pcm=new Float32Array(n);
  const beatSec=.5,eighth=.25,bassMidi=[36,36,43,34,36,39,43,41],leadMidi=[60,63,67,70,67,63,65,58];
  const hz=m=>440*Math.pow(2,(m-69)/12);
  for(let i=0;i<n;i++){
    const t=i/sr,section=Math.min(3,Math.floor(t/4)),beat=Math.floor(t/beatSec),bar=Math.floor(beat/4);
    const beatPhase=t-beat*beatSec,eighthIndex=Math.floor(t/eighth),eighthPhase=t-eighthIndex*eighth;
    const sectionPhase=(t-section*4)/4,sectionGain=[.64,.82,.72,1][section];
    const kickEnv=env(beatPhase,18),kickHz=46+86*env(beatPhase,28),kick=Math.sin(TAU*kickHz*t)*kickEnv*(beat%4===0?1:.72);
    const bassHz=hz(bassMidi[bar%bassMidi.length]),bassGate=.55+.45*env(beatPhase,5.2);
    const bass=(Math.sin(TAU*bassHz*t)+.27*Math.sin(TAU*bassHz*2*t+.3))*bassGate;
    const hatGate=env(eighthPhase,52),hat=(noise(i)*.64+Math.sin(TAU*6900*t)*.36)*hatGate*(eighthIndex%2?.62:.34);
    const padRoot=section===0?55:section===1?58:section===2?53:60;
    const pad=(Math.sin(TAU*hz(padRoot)*t)+.56*Math.sin(TAU*hz(padRoot+7)*t+.4)+.34*Math.sin(TAU*hz(padRoot+12)*t+.9))*.22;
    const leadNote=leadMidi[(beat>>1)%leadMidi.length],leadGate=Math.pow(Math.sin(Math.PI*Math.min(1,beatPhase/beatSec)),2);
    const lead=(section===0?0:.13)*Math.sin(TAU*hz(leadNote)*t+.22*Math.sin(TAU*.25*t))*leadGate;
    const buildup=section===2?(0.58+sectionPhase*.52):1;
    const dropOpen=section===3?(1+.15*Math.sin(TAU*.5*t)):1;
    const transient=(beat%8===0?Math.sin(TAU*180*t)*env(beatPhase,9)*.12:0);
    pcm[i]=clamp((kick*.31+bass*.24+hat*.105+pad+lead+transient)*sectionGain*buildup*dropOpen);
  }
  // Gentle deterministic fade prevents endpoint clicks.
  const fade=Math.min(n>>1,Math.round(sr*.025));
  for(let i=0;i<fade;i++){const q=i/Math.max(1,fade);pcm[i]*=q;pcm[n-1-i]*=q}
  return pcm;
}

export function encodeMonoWav(pcm,{sampleRate=FIELD_DEMO_SAMPLE_RATE}={}){
  const sr=Math.max(8000,Math.trunc(sampleRate)),samples=pcm instanceof Float32Array?pcm:Float32Array.from(pcm||[]),bytes=new Uint8Array(44+samples.length*2),view=new DataView(bytes.buffer);
  const str=(o,s)=>{for(let i=0;i<s.length;i++)bytes[o+i]=s.charCodeAt(i)};
  str(0,'RIFF');view.setUint32(4,36+samples.length*2,true);str(8,'WAVE');str(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,sr,true);view.setUint32(28,sr*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);str(36,'data');view.setUint32(40,samples.length*2,true);
  for(let i=0;i<samples.length;i++)view.setInt16(44+i*2,Math.round(clamp(samples[i])*32767),true);
  return bytes;
}

export function fieldDemoDescriptor(opts={}){
  const sampleRate=Math.max(8000,Math.trunc(opts.sampleRate||FIELD_DEMO_SAMPLE_RATE)),duration=Math.max(8,Number(opts.duration)||FIELD_DEMO_DURATION),pcm=renderFieldDemoPcm({duration,sampleRate});
  return {schema:FIELD_DEMO_SCHEMA,name:'FOLD BLOOM FIELD AUDIO DEMO.wav',type:'audio/wav',duration,sampleRate,pcm,bytes:encodeMonoWav(pcm,{sampleRate})};
}

export function generateFieldDemoFile(opts={}){
  const d=fieldDemoDescriptor(opts);
  if(typeof File!=='function')throw Error('File API unavailable');
  return new File([d.bytes],d.name,{type:d.type,lastModified:0});
}
