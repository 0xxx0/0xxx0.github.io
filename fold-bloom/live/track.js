import {buildPreviewMap} from '../listen/preview-map.js';
import {frameAt,beatIndexAt,sectionIndexAt} from '../listen/audio-map.js';
import {buildTrackfield} from './trackfield.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

function mixdown(buffer,targetRate=12000){
  const ratio=buffer.sampleRate/Math.min(buffer.sampleRate,targetRate),len=Math.max(1,Math.floor(buffer.length/ratio)),out=new Float32Array(len);
  const channels=Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i));
  for(let i=0;i<len;i++){
    const pos=i*ratio,j=Math.floor(pos),a=pos-j;let v=0;
    for(const c of channels){const x=c[j]||0,y=c[Math.min(c.length-1,j+1)]||x;v+=x+(y-x)*a}
    out[i]=v/channels.length;
  }
  return {pcm:out,sampleRate:buffer.sampleRate/ratio};
}

export function transportFromMap(map,time=0,playing=false){
  if(!map)return null;
  time=clamp(Number(time)||0,0,map.duration||0);
  const f=frameAt(map,time)||{e:.18,c:.4,f:.05},beatIndex=beatIndexAt(map,time),beats=map.beats||[],beatPeriod=60/(map.bpm||90);
  const beatTime=beatIndex>=0?Number(beats[beatIndex]||0):0;
  const nextBeat=beatIndex>=0?Number(beats[beatIndex+1]??(beatTime+beatPeriod)):(time+beatPeriod);
  const beatSpan=Math.max(.001,nextBeat-beatTime),beatPhase=clamp((time-beatTime)/beatSpan,0,1);
  const beatDistance=Math.max(0,Math.min(Math.abs(time-beatTime),Math.abs(nextBeat-time)));
  const sectionIndex=sectionIndexAt(map,time),sections=map.sections||[],sectionCount=Math.max(1,sections.length-1),sectionStart=sectionIndex>=0?Number(sections[sectionIndex]?.t||0):0;
  const sectionEnd=sectionIndex>=0?Number(sections[sectionIndex+1]?.t??map.duration):map.duration;
  const sectionProgress=sectionEnd>sectionStart?clamp((time-sectionStart)/(sectionEnd-sectionStart),0,1):0;
  return {
    playing:!!playing,time,duration:map.duration||0,bpm:map.bpm||0,tempoConfidence:map.tempoConfidence||0,
    beatIndex,beatTime,beatPhase,beatDistance,sectionIndex,sectionCount,sectionStart,sectionEnd,sectionProgress,scope:'TRACK',scopeStart:0,scopeEnd:map.duration||0,
    energy:+(f.e||0).toFixed(4),flux:+(f.f||0).toFixed(4),brightness:+(f.c||0).toFixed(4),
    stage:map.stage||'UNKNOWN',sourceKind:'LOCAL_FILE',sourceAddress:null
  };
}

export class LiveTrack {
  constructor(audio,{onState=()=>{},onMap=()=>{}}={}){
    this.audio=audio;this.onState=onState;this.onMap=onMap;this.map=null;this.file=null;this.url=null;this.worker=null;this.loading=false;this.worldCache=null;this.worldTime=-1;
    audio.addEventListener('play',()=>this.onState(this.stateLabel()));
    audio.addEventListener('pause',()=>this.onState(this.stateLabel()));
    audio.addEventListener('ended',()=>this.onState(this.stateLabel()));
  }
  stateLabel(){
    if(this.loading)return 'ANALYZING';
    if(!this.audio.src)return 'NONE';
    const stage=this.map?.stage||'AUDIO';
    return (this.audio.paused?'READY':'PLAYING')+' · '+stage+(this.map?.bpm?' · '+this.map.bpm.toFixed(1)+' BPM':'');
  }
  active(){return !!(this.audio.src&&this.map)}
  transport(){const p=transportFromMap(this.map,this.audio.currentTime,!this.audio.paused);return p?{...p,_receivedAt:performance.now()}:null}
  trackfield(horizon=12,count=44){
    if(!this.map)return null;
    const t=Number(this.audio.currentTime)||0;
    if(this.worldCache&&Math.abs(t-this.worldTime)<.012)return this.worldCache;
    this.worldTime=t;this.worldCache=buildTrackfield(this.map,t,{horizon,count});
    return this.worldCache;
  }
  async load(file){
    if(!file)return null;
    this.loading=true;this.file=file;this.onState('DECODING');
    const bytes=await file.arrayBuffer(),AC=globalThis.AudioContext||globalThis.webkitAudioContext;
    if(!AC)throw Error('Web Audio unavailable');
    const ctx=new AC();
    try{
      const decoded=await ctx.decodeAudioData(bytes.slice(0)),{pcm,sampleRate}=mixdown(decoded);
      this.map=buildPreviewMap(pcm,sampleRate,decoded.duration);this.map.source={name:file.name,size:file.size,type:file.type||'audio',sourceKind:'LOCAL_FILE'};this.worldCache=null;this.worldTime=-1;
      if(this.url)URL.revokeObjectURL(this.url);this.url=URL.createObjectURL(file);this.audio.src=this.url;
      this.loading=false;this.onMap(this.map);this.onState(this.stateLabel());
      if(decoded.duration<=1200){
        this.worker?.terminate?.();
        this.worker=new Worker(new URL('../listen/analysis-worker.js',import.meta.url),{type:'module'});
        this.worker.onmessage=e=>{
          if(e.data?.type==='result'){this.map=e.data.map;this.map.source={name:file.name,size:file.size,type:file.type||'audio',sourceKind:'LOCAL_FILE'};this.worldCache=null;this.worldTime=-1;this.onMap(this.map);this.onState(this.stateLabel())}
          else if(e.data?.type==='error'){this.onState('PREVIEW · ANALYZER ERROR')}
        };
        this.worker.onerror=()=>this.onState('PREVIEW · ANALYZER ERROR');
        this.worker.postMessage({type:'analyze',pcm:pcm.buffer,sampleRate,duration:decoded.duration},[pcm.buffer]);
      }
      await this.audio.play().catch(()=>{});
      this.onState(this.stateLabel());
      return this.map;
    }finally{this.loading=false;await ctx.close().catch(()=>{})}
  }
  async toggle(){if(!this.audio.src)return false;if(this.audio.paused){await this.audio.play();return true}this.audio.pause();return false}
  setVolume(v){this.audio.volume=clamp(Number(v)||0,0,1)}
}
