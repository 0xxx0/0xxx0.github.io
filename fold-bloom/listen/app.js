import {ListenRenderer} from './render.js';
import {SCOPES,frameAt,beatIndexAt,sectionIndexAt} from './audio-map.js';
import {pointAngle01} from './polar-control.js';
import {parseSunoId,classifySourceAddress,resolveSourceAddress,fetchRemoteAudio} from './source-adapters.js';

const $=s=>document.querySelector(s);
const gl=$('#field'),overlay=$('#overlay'),renderer=new ListenRenderer(gl,overlay),audio=$('#audio');
const worker=new Worker('./analysis-worker.js',{type:'module'});
let map=null,fileMeta=null,scopeIndex=1,objectURL=null,drag=false,raf=0;

function scope(){return SCOPES[scopeIndex]}
function setScope(i,announce=true){
  scopeIndex=(i+SCOPES.length)%SCOPES.length;
  $('#scope').textContent=scope();
  document.querySelectorAll('[data-scope]').forEach((el,j)=>el.classList.toggle('on',j===scopeIndex));
  if(announce)toast(scope());
}
function toast(t){const e=$('#toast');e.textContent=t;e.classList.remove('on');void e.offsetWidth;e.classList.add('on')}
function fmt(t){if(!Number.isFinite(t))return'0:00';const m=Math.floor(t/60),s=Math.floor(t%60);return `${m}:${String(s).padStart(2,'0')}`}
async function hashBuffer(buf){const h=await crypto.subtle.digest('SHA-256',buf);return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function mixdown(buffer,targetRate=22050){
  const ratio=buffer.sampleRate/Math.min(buffer.sampleRate,targetRate),len=Math.max(1,Math.floor(buffer.length/ratio)),out=new Float32Array(len);
  const channels=Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i));
  for(let i=0;i<len;i++){
    const pos=i*ratio,j=Math.floor(pos),a=pos-j;let v=0;
    for(const c of channels){const x=c[j]||0,y=c[Math.min(c.length-1,j+1)]||x;v+=x+(y-x)*a}
    out[i]=v/channels.length;
  }
  return {pcm:out,sampleRate:buffer.sampleRate/ratio};
}
function sourceLabel(meta){
  if(meta.sourceKind==='SUNO')return meta.resolution==='PUBLIC_CLIP_METADATA'?'SUNO / METADATA':'SUNO / UUID';
  if(meta.sourceKind==='REMOTE_AUDIO')return'REMOTE AUDIO';
  return'LOCAL ONLY';
}
async function analyzeBytes(bytes,playbackBlob,meta){
  $('#status').textContent='DECODING';$('#drop').classList.add('busy');
  const hashP=hashBuffer(bytes.slice(0)),ctx=new (window.AudioContext||window.webkitAudioContext)();
  const decoded=await ctx.decodeAudioData(bytes.slice(0));
  const hash=await hashP,{pcm,sampleRate}=mixdown(decoded);await ctx.close().catch(()=>{});
  if(objectURL)URL.revokeObjectURL(objectURL);
  objectURL=URL.createObjectURL(playbackBlob);audio.src=objectURL;
  fileMeta={
    ...meta,
    name:meta.name||'AUDIO SOURCE',
    size:meta.size??playbackBlob.size,
    type:meta.type||playbackBlob.type||'audio',
    hash,
    duration:decoded.duration,
    sourceSampleRate:decoded.sampleRate
  };
  $('#track').textContent=fileMeta.name;
  const lyricNote=fileMeta.lyrics?' · LYRICS FOUND / UNALIGNED':'';
  const tagNote=fileMeta.tags?` · ${String(fileMeta.tags).slice(0,42)}`:'';
  $('#meta').textContent=`${fmt(decoded.duration)} · ${(fileMeta.size/1048576).toFixed(1)} MB · ${sourceLabel(fileMeta)}${lyricNote}${tagNote}`;
  $('#status').textContent='ANALYZING';
  worker.postMessage({type:'analyze',pcm:pcm.buffer,sampleRate,duration:decoded.duration},[pcm.buffer]);
}
async function loadFile(file){
  const bytes=await file.arrayBuffer();
  return analyzeBytes(bytes,file,{name:file.name,size:file.size,type:file.type||'audio',sourceKind:'LOCAL_FILE',sourceAddress:null});
}
async function loadAddress(input){
  $('#status').textContent='RESOLVING';$('#drop').classList.add('busy');
  try{
    const source=await resolveSourceAddress(input);
    $('#track').textContent=source.title||'REMOTE SOURCE';
    $('#meta').textContent=source.kind==='SUNO'
      ?`${source.resolution.replaceAll('_',' ')} · FETCHING AUDIO`
      :'DIRECT ADDRESS · FETCHING AUDIO';
    const remote=await fetchRemoteAudio(source);
    const blob=new Blob([remote.bytes],{type:remote.type||'audio/mpeg'});
    await analyzeBytes(remote.bytes,blob,{
      name:source.title||source.audioUrl.split('/').pop()||'REMOTE AUDIO',
      size:remote.size,
      type:remote.type,
      sourceKind:source.kind,
      sourceAddress:source.address,
      sourceId:source.sunoId||null,
      metadataAddress:source.metadataUrl||null,
      resolution:source.resolution,
      artist:source.artist||'',
      tags:source.tags||'',
      lyrics:source.lyrics||'',
      metadataError:source.metadataError||null
    });
  }catch(err){
    $('#drop').classList.remove('busy');
    $('#status').textContent='REMOTE BLOCKED · LOAD FILE';
    $('#meta').textContent='ADDRESS KEPT · NETWORK/CORS RESOLUTION FAILED · LOCAL FILE STILL WORKS';
    toast('REMOTE BLOCKED · USE LOCAL FILE');
    console.warn(err);
  }
}
worker.onmessage=e=>{
  if(e.data.type==='progress'){$('#status').textContent=`ANALYZING ${Math.round(e.data.progress*100)}%`;return}
  if(e.data.type==='error'){$('#status').textContent='ANALYSIS ERROR';$('#drop').classList.remove('busy');toast('ANALYSIS ERROR');return}
  if(e.data.type==='result'){
    map=e.data.map;map.source=fileMeta;$('#status').textContent='READY';$('#drop').classList.remove('busy');
    drop.classList.add('loaded');$('#bpm').textContent=`${map.bpm.toFixed(1)} BPM`;$('#confidence').textContent=`${Math.round(map.tempoConfidence*100)}% TEMPO CONF`;$('#beats').textContent=`${map.beats.length} BEATS`;$('#sections').textContent=`${Math.max(0,map.sections.length-1)} SECTIONS`;
    $('#transport').disabled=false;$('#export').disabled=false;toast('MAP READY');
  }
};

const drop=$('#drop');
$('#file').onchange=e=>e.target.files?.[0]&&loadFile(e.target.files[0]).catch(err=>{$('#drop').classList.remove('busy');$('#status').textContent='DECODE ERROR';console.warn(err)});
$('#chooseBtn').onclick=e=>{e.stopPropagation();$('#file').click()};
$('#urlBtn').onclick=e=>{e.stopPropagation();const v=$('#urlInput').value.trim();if(v)loadAddress(v)};
$('#urlInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('#urlBtn').click()}});
['dragenter','dragover'].forEach(k=>drop.addEventListener(k,e=>{e.preventDefault();drop.classList.add('over')}));
['dragleave','drop'].forEach(k=>drop.addEventListener(k,e=>{e.preventDefault();drop.classList.remove('over')}));
drop.addEventListener('drop',e=>{const f=e.dataTransfer.files?.[0];if(f)loadFile(f).catch(console.warn)});
$('#loadBtn').onclick=()=>{drop.classList.remove('loaded');$('#urlInput').focus()};
$('#transport').onclick=async()=>{if(!audio.src)return;if(audio.paused){await audio.play()}else audio.pause()};
audio.onplay=()=>{$('#transport').textContent='PAUSE'};audio.onpause=()=>{$('#transport').textContent='PLAY'};
$('#export').onclick=()=>{
  if(!map)return;const packet={kind:'FOLD_BLOOM_AUDIO_MAP',created:new Date().toISOString(),map};
  const b=new Blob([JSON.stringify(packet,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`fold-bloom-audio-map-${Date.now()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)
};
document.querySelectorAll('[data-scope]').forEach((b,i)=>b.onclick=()=>setScope(i));
addEventListener('wheel',e=>{if(Math.abs(e.deltaY)<2)return;e.preventDefault();setScope(scopeIndex+(e.deltaY>0?1:-1))},{passive:false});
function scrub(e){
  if(!map)return;const r=overlay.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height*.53,p=pointAngle01(e.clientX,e.clientY,cx,cy);audio.currentTime=p*map.duration;
}
overlay.onpointerdown=e=>{if(!map)return;drag=true;overlay.setPointerCapture?.(e.pointerId);scrub(e)};
overlay.onpointermove=e=>{if(drag){e.preventDefault();scrub(e)}};overlay.onpointerup=()=>drag=false;overlay.onpointercancel=()=>drag=false;
addEventListener('keydown',e=>{
  if(e.code==='Space'&&audio.src){e.preventDefault();$('#transport').click()}
  else if(e.key==='ArrowUp'){e.preventDefault();setScope(scopeIndex-1)}
  else if(e.key==='ArrowDown'){e.preventDefault();setScope(scopeIndex+1)}
  else if(e.key==='ArrowLeft'&&map){audio.currentTime=Math.max(0,audio.currentTime-(60/(map.bpm||90)))}
  else if(e.key==='ArrowRight'&&map){audio.currentTime=Math.min(map.duration,audio.currentTime+(60/(map.bpm||90)))}
});
function loop(){
  const time=audio.currentTime||0,f=frameAt(map,time)||{e:.18,c:.4,f:.05,l:.3,m:.4,h:.3},bi=beatIndexAt(map,time),si=sectionIndexAt(map,time);
  if(map&&bi>=0)renderer.markBeat(bi);
  renderer.draw(map,f,time,scopeIndex,!audio.paused);
  $('#time').textContent=`${fmt(time)} / ${fmt(map?.duration||0)}`;$('#energy').textContent=`E ${Math.round((f.e||0)*100)}`;$('#flux').textContent=`Δ ${Math.round((f.f||0)*100)}`;$('#bright').textContent=`C ${Math.round((f.c||0)*100)}`;$('#where').textContent=map?`BEAT ${Math.max(0,bi)+1} · SECTION ${Math.max(0,si)+1}`:'DROP A TRACK';
  raf=requestAnimationFrame(loop)
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelAnimationFrame(raf);else{cancelAnimationFrame(raf);loop()}});
setScope(1,false);loop();
window.FoldBloomListen={
  state:()=>({scope:scope(),time:audio.currentTime,map,fileMeta}),
  parseSunoId,classifySourceAddress,resolveSourceAddress
};
