import {buildPreviewMap} from '../listen/preview-map.js';
import {decodePcmWavPreview} from '../listen/pcm-wav-preview.js';
import {frameAt,beatIndexAt,phraseIndexAt,sectionIndexAt} from '../listen/audio-map.js';
import {buildTrackfield} from './trackfield.js';
import {parseLocalAudioMeta,localDisplayName} from '../listen/media-meta.js';
import {groupLocalInputs,parseTextSidecar} from '../listen/sidecar-text.js';
import {hashHex} from '../../lib/id.js';
import {clamp} from '../../lib/polar-control.js';

export const TRACKFIELD_MODEL_INTERVAL=.028;

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
    this.audio=audio;this.onState=onState;this.onMap=onMap;this.map=null;this.file=null;this.url=null;this.streamUrl=null;this.worker=null;this.loading=false;this.worldCache=null;this.worldTime=-1;this.meta=null;this.textEvidence=null;this.loadToken=0;
    audio.addEventListener('play',()=>this.onState(this.stateLabel()));
    audio.addEventListener('pause',()=>this.onState(this.stateLabel()));
    audio.addEventListener('ended',()=>this.onState(this.stateLabel()));
  }
  stateLabel(){
    if(this.loading)return 'ANALYZING';
    if(!this.audio.src)return 'NONE';
    if(!this.map)return (this.audio.paused?'READY':'PLAYING')+' · SOURCE';
    const stage=this.map?.stage||'AUDIO';
    return (this.audio.paused?'READY':'PLAYING')+' · '+stage+(this.map?.bpm?' · '+this.map.bpm.toFixed(1)+' BPM':'');
  }
  active(){return !!(this.audio.src&&this.map)}
  sourceActive(){return !!this.audio.src}
  mapped(){return !!this.map}
  textWitness(time=this.audio.currentTime,offset=0){return textWitnessAt(this.textEvidence,(Number(time)||0)+(Number(offset)||0),Number(this.map?.duration)||0)}
  metadata(){return this.meta?{...this.meta}:null}
  async loadFiles(files){
    const grouped=groupLocalInputs(files),g=grouped.groups[0];
    if(!g?.audio)throw Error('No audio file in source bundle');
    return this.load(g.audio,{sidecars:g.sidecars});
  }
  loadStream({url,name='REMOTE SOURCE',sourceAddress=null,sourceKind='REMOTE_AUDIO',artist='',title='',provider=null}={}){
    if(!url)throw Error('Remote source URL required');
    this.worker?.terminate?.();this.worker=null;
    if(this.url)URL.revokeObjectURL(this.url);
    this.url=null;this.file=null;this.map=null;this.worldCache=null;this.worldTime=-1;this.textEvidence=null;
    this.streamUrl=String(url);
    this.meta={name:String(name||title||'REMOTE SOURCE'),title:String(title||name||''),artist:String(artist||''),sourceAddress:sourceAddress||String(url),sourceKind,provider:provider||null,remote:true};
    this.audio.src=this.streamUrl;
    this.audio.load?.();
    this.onMap(null);this.onState(this.stateLabel());
    return this.metadata();
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
    const token=++this.loadToken;
    this.worker?.terminate?.();this.worker=null;
    this.loading=true;this.file=file;this.streamUrl=null;this.onState('DECODING');
    const bytes=await file.arrayBuffer(),hashP=hashHex(bytes.slice(0)),
      meta=parseLocalAudioMeta(bytes,file.name),wav=decodePcmWavPreview(bytes);
    let textEvidence=null;
    for(const sf of sidecars){try{const t=parseTextSidecar(await sf.text(),sf.name);if(t?.text){textEvidence=t;break}}catch(_){}}
    if(!textEvidence&&meta.lyrics)textEvidence={name:file.name,kind:'LYRICS',
      alignment:meta.lyricsAlignment||'UNALIGNED_EMBEDDED',text:meta.lyrics,cues:[],
      cueCount:0,chars:String(meta.lyrics).length};
    this.meta={...meta,name:localDisplayName(meta,file.name)};this.textEvidence=textEvidence;
    let ctx=null;
    try{
      let output=wav;
      if(!output){
        const AC=globalThis.AudioContext||globalThis.webkitAudioContext;
        if(!AC)throw Error('WEB_AUDIO_UNAVAILABLE');
        ctx=new AC();
        const decoded=await Promise.race([
          ctx.decodeAudioData(bytes.slice(0)),
          new Promise((_,reject)=>setTimeout(()=>reject(Error('WEB_AUDIO_DECODE_TIMEOUT')),5000))
        ]);
        output={...mixdown(decoded),duration:decoded.duration};
      }
      const hash=await hashP;
      if(token!==this.loadToken)return null;
      this.meta={...this.meta,hash,sourceKind:'LOCAL_FILE',size:file.size,
        type:file.type||'audio',duration:output.duration};
      this.map=buildPreviewMap(output.pcm,output.sampleRate,output.duration);
      const mapSource={name:localDisplayName(meta,file.name),fileName:file.name,
        title:meta.title||'',artist:meta.artist||'',album:meta.album||'',
        lyricsAlignment:textEvidence?.alignment||meta.lyricsAlignment||null,
        metadataSource:meta.metadataSource||null,size:file.size,type:file.type||'audio',
        sourceKind:'LOCAL_FILE',hash};
      this.map.source=mapSource;this.worldCache=null;this.worldTime=-1;
      if(this.url)URL.revokeObjectURL(this.url);
      this.url=URL.createObjectURL(file);this.audio.src=this.url;
      this.loading=false;this.onMap(this.map);this.onState(this.stateLabel());
      if(output.duration<=1200){
        this.worker=new Worker(new URL('../listen/analysis-worker.js',import.meta.url),{type:'module'});
        this.worker.onmessage=e=>{
          if(token!==this.loadToken||this.meta?.hash!==hash)return;
          if(e.data?.type==='result'){
            this.map=e.data.map;this.map.source=mapSource;
            this.worldCache=null;this.worldTime=-1;
            this.onMap(this.map);this.onState(this.stateLabel());
          }else if(e.data?.type==='error')this.onState('PREVIEW · ANALYZER ERROR');
        };
        this.worker.onerror=()=>{if(token===this.loadToken)this.onState('PREVIEW · ANALYZER ERROR')};
        this.worker.postMessage({type:'analyze',requestId:token,
          pcm:output.pcm.buffer,sampleRate:output.sampleRate,duration:output.duration},
          [output.pcm.buffer]);
      }
      // Playback is a separate gesture boundary; never stall local source binding on play().
      void this.audio.play().catch(()=>{});
      return this.map;
    }catch(error){
      if(token!==this.loadToken)return null;
      const hash=await hashP;
      this.meta={...this.meta,hash,sourceKind:'LOCAL_FILE',size:file.size,
        type:file.type||'audio',duration:0,analysisError:String(error?.message||error)};
      this.map=null;this.worldCache=null;this.worldTime=-1;
      if(this.url)URL.revokeObjectURL(this.url);
      this.url=URL.createObjectURL(file);this.audio.src=this.url;
      this.onMap(null);this.onState('READY · AUDIO ONLY · ANALYSIS UNAVAILABLE');
      // No invented terrain, BPM, beat positions or pitch evidence.
      return null;
    }finally{
      if(token===this.loadToken)this.loading=false;
      if(ctx)await ctx.close().catch(()=>{});
    }
  }
  async toggle(){if(!this.audio.src)return false;if(this.audio.paused){await this.audio.play();return true}this.audio.pause();return false}
  clearSource(){
    this.loadToken++;
    this.worker?.terminate?.();this.worker=null;
    if(this.url)URL.revokeObjectURL(this.url);
    this.url=null;this.file=null;this.streamUrl=null;this.map=null;this.worldCache=null;this.worldTime=-1;this.meta=null;this.textEvidence=null;this.loading=false;
    try{this.audio.pause?.();this.audio.removeAttribute?.('src');this.audio.load?.()}catch(_){}
    this.onMap(null);this.onState('NONE');return true;
  }
  setVolume(v){this.audio.volume=clamp(Number(v)||0,0,1)}
}
