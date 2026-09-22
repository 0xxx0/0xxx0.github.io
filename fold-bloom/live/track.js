import {buildPreviewMap} from '../listen/preview-map.js';
import {frameAt,beatIndexAt,phraseIndexAt,sectionIndexAt} from '../listen/audio-map.js';
import {buildTrackfield} from './trackfield.js';
import {parseLocalAudioMeta,localDisplayName} from '../listen/media-meta.js';
import {groupLocalInputs,parseTextSidecar} from '../listen/sidecar-text.js';
import {cueTimeAtPlayback,normalizeTextAlignment} from '../../lib/text-alignment.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const TRACKFIELD_MODEL_INTERVAL=.028;
async function hashBuffer(buf){const h=await crypto.subtle.digest('SHA-256',buf);return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('')}

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


export function textWitnessAt(evidence,time=0,duration=0){
  if(!evidence?.text)return null;
  const cues=Array.isArray(evidence.cues)?evidence.cues:[];
  if(cues.length){
    let lo=0,hi=cues.length-1,ix=-1;
    while(lo<=hi){const mid=(lo+hi)>>1;if((Number(cues[mid]?.start)||0)<=time){ix=mid;lo=mid+1}else hi=mid-1}
    if(ix>=0){
      const hit=cues[ix];
      return {kind:evidence.kind||'TEXT',mode:'TIMED',alignment:evidence.alignment||'TIMED',text:String(hit.text||'').trim(),start:Number(hit.start)||0,end:hit.end==null?null:Number(hit.end),approx:false};
    }
  }
  const lines=String(evidence.text||'').split(/\r?\n+/).map(x=>x.trim()).filter(Boolean);
  if(!lines.length)return null;
  const p=duration>0?clamp((Number(time)||0)/duration,0,1):0,index=Math.min(lines.length-1,Math.floor(p*lines.length));
  return {kind:evidence.kind||'TEXT',mode:'FLOAT',alignment:evidence.alignment||'UNALIGNED',text:lines[index],start:null,end:null,approx:true,index,count:lines.length};
}

export function transportFromMap(map,time=0,playing=false){
  if(!map)return null;
  time=clamp(Number(time)||0,0,map.duration||0);
  const f=frameAt(map,time)||{e:.18,c:.4,f:.05},beatIndex=beatIndexAt(map,time),beats=map.beats||[],beatPeriod=60/(map.bpm||90);
  const beatTime=beatIndex>=0?Number(beats[beatIndex]||0):0;
  const nextBeat=beatIndex>=0?Number(beats[beatIndex+1]??(beatTime+beatPeriod)):(time+beatPeriod);
  const beatSpan=Math.max(.001,nextBeat-beatTime),beatPhase=clamp((time-beatTime)/beatSpan,0,1);
  const beatDistance=Math.max(0,Math.min(Math.abs(time-beatTime),Math.abs(nextBeat-time)));
  const phraseIndex=phraseIndexAt(map,time),phrases=map.phrases||[],phraseCount=Math.max(0,phrases.length-1),phraseStart=phraseIndex>=0?Number(phrases[phraseIndex]?.t||0):null;
  const phraseEnd=phraseIndex>=0?Number(phrases[phraseIndex+1]?.t??map.duration):null;
  const phraseProgress=phraseStart!==null&&phraseEnd>phraseStart?clamp((time-phraseStart)/(phraseEnd-phraseStart),0,1):null;
  const sectionIndex=sectionIndexAt(map,time),sections=map.sections||[],sectionCount=Math.max(1,sections.length-1),sectionStart=sectionIndex>=0?Number(sections[sectionIndex]?.t||0):0;
  const sectionEnd=sectionIndex>=0?Number(sections[sectionIndex+1]?.t??map.duration):map.duration;
  const sectionProgress=sectionEnd>sectionStart?clamp((time-sectionStart)/(sectionEnd-sectionStart),0,1):0;
  return {
    playing:!!playing,time,duration:map.duration||0,bpm:map.bpm||0,tempoConfidence:map.tempoConfidence||0,
    beatIndex,beatTime,beatPhase,beatDistance,phraseIndex,phraseCount,phraseStart,phraseEnd,phraseProgress,sectionIndex,sectionCount,sectionStart,sectionEnd,sectionProgress,scope:'TRACK',scopeStart:0,scopeEnd:map.duration||0,
    energy:+(f.e||0).toFixed(4),flux:+(f.f||0).toFixed(4),brightness:+(f.c||0).toFixed(4),
    stage:map.stage||'UNKNOWN',sourceHash:map.source?.hash||null,sourceKind:'LOCAL_FILE',sourceAddress:null
  };
}

export class LiveTrack {
  constructor(audio,{onState=()=>{},onMap=()=>{}}={}){
    this.audio=audio;this.onState=onState;this.onMap=onMap;this.map=null;this.file=null;this.url=null;this.worker=null;this.loading=false;this.worldCache=null;this.worldTime=-1;this.meta=null;this.textEvidence=null;
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
  textWitness(time=this.audio.currentTime,alignmentOrOffset=0){const t=Number(time)||0,m=alignmentOrOffset&&typeof alignmentOrOffset==='object'?normalizeTextAlignment(alignmentOrOffset):null,at=m?cueTimeAtPlayback(t,m):t+(Number(alignmentOrOffset)||0);return textWitnessAt(this.textEvidence,at,Number(this.map?.duration)||0)}
  metadata(){return this.meta?{...this.meta}:null}
  async loadFiles(files){
    const grouped=groupLocalInputs(files),g=grouped.groups[0];
    if(!g?.audio)throw Error('No audio file in source bundle');
    return this.load(g.audio,{sidecars:g.sidecars});
  }
  transport(){const p=transportFromMap(this.map,this.audio.currentTime,!this.audio.paused);return p?{...p,_receivedAt:performance.now()}:null}
  trackfield(horizon=12,count=44){
    if(!this.map)return null;
    const t=Number(this.audio.currentTime)||0;
    if(this.worldCache&&Math.abs(t-this.worldTime)<TRACKFIELD_MODEL_INTERVAL)return this.worldCache;
    this.worldTime=t;this.worldCache=buildTrackfield(this.map,t,{horizon,count});
    return this.worldCache;
  }
  async load(file,{sidecars=[]}={}){
    if(!file)return null;
    this.loading=true;this.file=file;this.onState('DECODING');
    const bytes=await file.arrayBuffer(),hashP=hashBuffer(bytes.slice(0)),meta=parseLocalAudioMeta(bytes,file.name),AC=globalThis.AudioContext||globalThis.webkitAudioContext;
    let textEvidence=null;
    for(const sf of sidecars){try{const t=parseTextSidecar(await sf.text(),sf.name);if(t?.text){textEvidence=t;break}}catch(_){}}
    if(!textEvidence&&meta.lyrics)textEvidence={name:file.name,kind:'LYRICS',alignment:meta.lyricsAlignment||'UNALIGNED_EMBEDDED',text:meta.lyrics,cues:[],cueCount:0,chars:String(meta.lyrics).length};
    this.meta={...meta,name:localDisplayName(meta,file.name),fileName:file.name};this.textEvidence=textEvidence;
    if(!AC)throw Error('Web Audio unavailable');
    const ctx=new AC();
    try{
      const decoded=await ctx.decodeAudioData(bytes.slice(0)),hash=await hashP,{pcm,sampleRate}=mixdown(decoded);
      this.map=buildPreviewMap(pcm,sampleRate,decoded.duration);this.map.source={name:localDisplayName(meta,file.name),fileName:file.name,title:meta.title||'',artist:meta.artist||'',album:meta.album||'',lyricsAlignment:textEvidence?.alignment||meta.lyricsAlignment||null,metadataSource:meta.metadataSource||null,size:file.size,type:file.type||'audio',sourceKind:'LOCAL_FILE',hash};this.worldCache=null;this.worldTime=-1;
      if(this.url)URL.revokeObjectURL(this.url);this.url=URL.createObjectURL(file);this.audio.src=this.url;
      this.loading=false;this.onMap(this.map);this.onState(this.stateLabel());
      if(decoded.duration<=1200){
        this.worker?.terminate?.();
        this.worker=new Worker(new URL('../listen/analysis-worker.js',import.meta.url),{type:'module'});
        this.worker.onmessage=e=>{
          if(e.data?.type==='result'){this.map=e.data.map;this.map.source={name:localDisplayName(meta,file.name),fileName:file.name,title:meta.title||'',artist:meta.artist||'',album:meta.album||'',lyricsAlignment:textEvidence?.alignment||meta.lyricsAlignment||null,metadataSource:meta.metadataSource||null,size:file.size,type:file.type||'audio',sourceKind:'LOCAL_FILE',hash};this.worldCache=null;this.worldTime=-1;this.onMap(this.map);this.onState(this.stateLabel())}
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
