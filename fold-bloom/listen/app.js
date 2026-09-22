import {ListenRenderer} from './render.js';
import {SCOPES,frameAt,beatIndexAt,sectionIndexAt,scopeWindow,scrubTime} from './audio-map.js';
import {pointAngle01} from './polar-control.js';
import {parseSunoId,classifySourceAddress,resolveSourceAddress,fetchRemoteAudio} from './source-adapters.js';
import {buildPreviewMap} from './preview-map.js';
import {createFieldPulse} from '../../lib/field-pulse.js';
import {STREAM_LENS_SCHEMA,scrubByDelta,stepAddress,makeStreamPin,normalizePins} from './stream-lens.js';

const $=s=>document.querySelector(s);
const gl=$('#field'),overlay=$('#overlay'),audio=$('#audio'),drop=$('#drop');
let renderer=null,worker=null,map=null,fileMeta=null,scopeIndex=1,objectURL=null,drag=false,dragRange=null,raf=0,previewBuilds=0,deepBuilds=0,renderedMapFrames=0,lastPulseAt=0,lastRemoteFailure=null,pins=[],editingPinId=null;
const fieldPulse=createFieldPulse('FOLD_BLOOM_LISTEN');

function toast(t){const e=$('#toast');if(!e)return;e.textContent=t;e.classList.remove('on');void e.offsetWidth;e.classList.add('on')}
function status(t){const e=$('#status');if(e)e.textContent=t}
function fmt(t){if(!Number.isFinite(t))return'0:00';const m=Math.floor(t/60),s=Math.floor(t%60);return `${m}:${String(s).padStart(2,'0')}`}
function scope(){return SCOPES[scopeIndex]}
function sourcePinKey(){
  return fileMeta?.hash||fileMeta?.sourceId||fileMeta?.sourceAddress||(fileMeta?.name?`${fileMeta.name}:${fileMeta.size||0}`:null);
}
function pinStoreKey(){const k=sourcePinKey();return k?`fold-bloom.listen.pins.v01:${k}`:null}
function loadPins(){
  const k=pinStoreKey();pins=[];
  if(k){try{pins=normalizePins(JSON.parse(localStorage.getItem(k)||'[]'),sourcePinKey())}catch(_){}}
  syncPins();
}
function savePins(){
  const k=pinStoreKey();if(!k)return;
  try{localStorage.setItem(k,JSON.stringify(normalizePins(pins,sourcePinKey())))}catch(_){}
  syncPins();
}
function currentFeatures(){
  const t=audio.currentTime||0,f=frameAt(map,t)||{};
  return {energy:+(Number(f.e)||0).toFixed(4),flux:+(Number(f.f)||0).toFixed(4),brightness:+(Number(f.c)||0).toFixed(4),beatIndex:beatIndexAt(map,t),sectionIndex:sectionIndexAt(map,t)};
}
function renderPinList(){
  const list=$('#pinList');if(!list)return;
  const xs=normalizePins(pins,sourcePinKey());
  list.innerHTML=xs.length?xs.map(p=>`<button class="pinRow${editingPinId===p.id?' on':''}" data-pin-id="${String(p.id).replaceAll('"','&quot;')}"><b>${fmt(p.address)} · ${String(p.label||'PIN').replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]))}</b><span>${String(p.note||p.scope||'').replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m])).slice(0,120)}</span></button>`).join(''):'<div class="pinEmpty">NO PINS · P marks the current address</div>';
  list.querySelectorAll('[data-pin-id]').forEach(b=>b.onclick=()=>{
    const p=pins.find(x=>x.id===b.dataset.pinId);if(!p)return;
    audio.currentTime=Math.max(0,Math.min(map?.duration||p.address,p.address));publishTransport(true);openPinSheet(p);
  });
}
function syncPins(){
  ensureRenderer().setPins?.(pins);
  const can=!!map;const pin=$('#pinBtn'),pinsBtn=$('#pinsBtn');
  if(pin)pin.disabled=!can;if(pinsBtn){pinsBtn.disabled=!can;pinsBtn.textContent=pins.length?`PINS ${pins.length}`:'PINS'}
  document.documentElement.dataset.listenPins=String(pins.length);
  renderPinList();
}
function openPinSheet(pin=null,address=null){
  if(!map)return;
  toggleUse(false);editingPinId=pin?.id||null;
  const t=pin?.address??Math.max(0,Math.min(map.duration||0,Number(address??audio.currentTime)||0));
  $('#pinAddress').textContent=`${fmt(t)} · ${scope()} · ${sourcePinKey()?.slice(0,12)||'SOURCE'}`;
  $('#pinLabel').value=pin?.label||'';
  $('#pinNote').value=pin?.note||'';
  $('#pinSave').dataset.address=String(t);
  $('#pinDelete').hidden=!pin;
  const sh=$('#pinSheet');sh.classList.add('on');sh.setAttribute('aria-hidden','false');renderPinList();
  setTimeout(()=>$('#pinLabel')?.focus(),0);
}
function closePinSheet(){const sh=$('#pinSheet');if(sh){sh.classList.remove('on');sh.setAttribute('aria-hidden','true')}editingPinId=null;renderPinList()}
function commitPin(){
  if(!map||!sourcePinKey())return;
  const old=pins.find(x=>x.id===editingPinId),address=Number($('#pinSave').dataset.address)||audio.currentTime||0;
  const p=makeStreamPin({
    sourceKey:sourcePinKey(),address,label:$('#pinLabel').value.trim(),note:$('#pinNote').value.trim(),scope:scope(),features:currentFeatures(),
    id:old?.id||null,createdAt:old?.createdAt||null
  });
  pins=normalizePins([...pins.filter(x=>x.id!==old?.id),p],sourcePinKey());editingPinId=p.id;savePins();toast('PIN SAVED');openPinSheet(p);
}
function deletePin(){
  if(!editingPinId)return;pins=pins.filter(x=>x.id!==editingPinId);editingPinId=null;savePins();toast('PIN REMOVED');closePinSheet();
}
function setScope(i,announce=true){
  scopeIndex=(i+SCOPES.length)%SCOPES.length;
  $('#scope').textContent=scope();
  document.querySelectorAll('[data-scope]').forEach((el,j)=>el.classList.toggle('on',j===scopeIndex));
  if(drag){drag=false;dragRange=null}
  if(announce)toast(scope());
  if(map)publishTransport(true);
}
function fallbackRenderer(){
  const ctx=overlay?.getContext?.('2d');
  return {
    fallback:true,
    markBeat(){},
    setPins(){},
    draw(){
      if(!ctx||!overlay)return;
      const d=Math.min(2,devicePixelRatio||1),w=innerWidth,h=innerHeight;
      if(overlay.width!==Math.floor(w*d)||overlay.height!==Math.floor(h*d)){
        overlay.width=Math.floor(w*d);overlay.height=Math.floor(h*d);overlay.style.width=w+'px';overlay.style.height=h+'px';ctx.setTransform(d,0,0,d,0,0);
      }
      ctx.clearRect(0,0,w,h);ctx.strokeStyle='rgba(255,255,255,.16)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(w*.5,h*.53,Math.min(w,h)*.34,0,Math.PI*2);ctx.stroke();
    }
  };
}
function ensureRenderer(){
  if(renderer)return renderer;
  try{renderer=new ListenRenderer(gl,overlay)}
  catch(error){console.warn('LISTEN renderer fallback',error);renderer=fallbackRenderer();document.documentElement.dataset.listenRenderer='fallback'}
  return renderer;
}
function onWorkerMessage(e){
  if(e.data.type==='progress'){status(`REFINING ${Math.round(e.data.progress*100)}%`);return}
  if(e.data.type==='error'){status(map?.stage==='PREVIEW'?'PREVIEW READY · ANALYZER ERROR':'ANALYSIS ERROR');drop.classList.remove('busy');toast(map?'PREVIEW KEPT':'ANALYSIS ERROR');return}
  if(e.data.type==='result'){
    map=e.data.map;map.source=fileMeta;map.stage='DEEP';deepBuilds++;status('READY · DEEP MAP');drop.classList.remove('busy');drop.classList.add('loaded');
    $('#bpm').textContent=`${map.bpm.toFixed(1)} BPM`;$('#confidence').textContent=`${Math.round(map.tempoConfidence*100)}% TEMPO CONF`;
    $('#key').textContent=map.key?.label&&map.key.label!=='—'?`${map.key.label.toUpperCase()} · ${Math.round((map.key.confidence||0)*100)}%`:(fileMeta?.providerKey?`${fileMeta.providerKey} · PROVIDER`:'— KEY');
    $('#beats').textContent=`${map.beats.length} BEATS`;$('#sections').textContent=`${Math.max(0,map.sections.length-1)} SECTIONS`;
    $('#transport').disabled=false;$('#export').disabled=false;toast('MAP READY');updateWorkflow();publishTransport(true);
  }
}
function ensureWorker(){
  if(worker)return worker;
  try{
    worker=new Worker('./analysis-worker.js',{type:'module'});
    worker.onmessage=onWorkerMessage;
    worker.onerror=error=>{console.warn('LISTEN worker error',error);status(map?.stage==='PREVIEW'?'PREVIEW READY · ANALYZER ERROR':'ANALYZER ERROR · RELOAD OR TRY ANOTHER FILE');drop.classList.remove('busy')};
    return worker;
  }catch(error){
    console.warn('LISTEN worker boot failed',error);status('ANALYZER UNAVAILABLE · FILE PICKER STILL WORKS');drop.classList.remove('busy');throw error;
  }
}
async function hashBuffer(buf){const h=await crypto.subtle.digest('SHA-256',buf);return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function mixdown(buffer,targetRate=12000){
  const ratio=buffer.sampleRate/Math.min(buffer.sampleRate,targetRate),len=Math.max(1,Math.floor(buffer.length/ratio)),out=new Float32Array(len);
  const channels=Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i));
  for(let i=0;i<len;i++){const pos=i*ratio,j=Math.floor(pos),a=pos-j;let v=0;for(const c of channels){const x=c[j]||0,y=c[Math.min(c.length-1,j+1)]||x;v+=x+(y-x)*a}out[i]=v/channels.length}
  return {pcm:out,sampleRate:buffer.sampleRate/ratio};
}
function sourceLabel(meta){
  if(meta.sourceKind==='SUNO')return meta.resolution==='PUBLIC_CLIP_METADATA'?'SUNO / METADATA':'SUNO / UUID';
  if(meta.sourceKind==='REMOTE_AUDIO')return'REMOTE AUDIO';return'LOCAL ONLY';
}
async function analyzeBytes(bytes,playbackBlob,meta){
  status('DECODING');drop.classList.add('busy');
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw Error('Web Audio unavailable');
  const hashP=hashBuffer(bytes.slice(0)),ctx=new AC();
  try{
    const decoded=await ctx.decodeAudioData(bytes.slice(0)),hash=await hashP,{pcm,sampleRate}=mixdown(decoded);
    if(objectURL)URL.revokeObjectURL(objectURL);objectURL=URL.createObjectURL(playbackBlob);audio.src=objectURL;
    fileMeta={...meta,name:meta.name||'AUDIO SOURCE',size:meta.size??playbackBlob.size,type:meta.type||playbackBlob.type||'audio',hash,duration:decoded.duration,sourceSampleRate:decoded.sampleRate};
    loadPins();
    $('#track').textContent=fileMeta.name;
    const lyricNote=fileMeta.lyrics?' · LYRICS FOUND / UNALIGNED':'',tagNote=fileMeta.tags?` · ${String(fileMeta.tags).slice(0,42)}`:'';
    $('#meta').textContent=`${fmt(decoded.duration)} · ${(fileMeta.size/1048576).toFixed(1)} MB · ${sourceLabel(fileMeta)}${lyricNote}${tagNote}`;

    map=buildPreviewMap(pcm,sampleRate,decoded.duration);map.source=fileMeta;previewBuilds++;
    drop.classList.remove('busy');drop.classList.add('loaded');
    $('#bpm').textContent=fileMeta.providerBpm?`${Number(fileMeta.providerBpm).toFixed(1)} BPM · PROVIDER`:'… BPM';$('#confidence').textContent='PREVIEW';
    $('#key').textContent=fileMeta.providerKey?`${fileMeta.providerKey} · PROVIDER`:'… KEY';
    $('#beats').textContent='… BEATS';$('#sections').textContent='1 SPAN';
    $('#transport').disabled=false;$('#export').disabled=false;updateWorkflow();
    status(decoded.duration>1200?'LONGFORM PREVIEW · DEEP MAP DEFERRED':'PREVIEW READY · REFINING');
    toast('PREVIEW READY');publishTransport(true);

    if(decoded.duration>1200)return;
    ensureWorker().postMessage({type:'analyze',pcm:pcm.buffer,sampleRate,duration:decoded.duration},[pcm.buffer]);
  }finally{await ctx.close().catch(()=>{})}
}
async function loadFile(file){
  if(!file)return;
  try{const bytes=await file.arrayBuffer();await analyzeBytes(bytes,file,{name:file.name,size:file.size,type:file.type||'audio',sourceKind:'LOCAL_FILE',sourceAddress:null})}
  catch(error){console.warn(error);drop.classList.remove('busy');status('DECODE ERROR · CHOOSE ANOTHER FILE');toast('DECODE ERROR')}
}
async function loadAddress(input){
  status('RESOLVING');drop.classList.add('busy');lastRemoteFailure=null;
  try{
    const source=await resolveSourceAddress(input);$('#track').textContent=source.title||'REMOTE SOURCE';
    $('#meta').textContent=source.kind==='SUNO'?`${source.resolution.replaceAll('_',' ')} · FETCHING AUDIO`:'DIRECT ADDRESS · FETCHING AUDIO';
    const remote=await fetchRemoteAudio(source),blob=new Blob([remote.bytes],{type:remote.type||'audio/mpeg'});
    await analyzeBytes(remote.bytes,blob,{name:source.title||source.audioUrl.split('/').pop()||'REMOTE AUDIO',size:remote.size,type:remote.type,sourceKind:source.kind,sourceAddress:source.address,sourceId:source.sunoId||null,metadataAddress:source.metadataUrl||null,resolution:source.resolution,artist:source.artist||'',tags:source.tags||'',lyrics:source.lyrics||'',providerBpm:source.providerBpm||null,providerKey:source.providerKey||null,providerTimeSignature:source.providerTimeSignature||null,metadataError:source.metadataError||null});
  }catch(error){
    const kind=parseSunoId(input)?'SUNO':'REMOTE_AUDIO';
    lastRemoteFailure={kind,address:String(input||''),error:String(error?.message||error),at:new Date().toISOString()};
    drop.classList.remove('busy');
    status(kind==='SUNO'?'SUNO BLOCKED HERE · USE MP3':'REMOTE BLOCKED · LOAD FILE');
    $('#meta').textContent=kind==='SUNO'?'BROWSER/CORS PATH BLOCKED · PROVEN PATH: EXPORT/DOWNLOAD MP3 → CHOOSE AUDIO':'ADDRESS KEPT · NETWORK/CORS RESOLUTION FAILED · LOCAL FILE STILL WORKS';
    toast(kind==='SUNO'?'SUNO BLOCKED · USE MP3':'REMOTE BLOCKED · USE LOCAL FILE');console.warn(error)
  }
}


function updateWorkflow(){
  const use=$('#useBtn'),read=$('#useRead'),law=$('#useLaw');
  if(use)use.disabled=!map;
  if(read){
    const b=read.querySelector('b'),sp=read.querySelector('span'),hasLyrics=!!String(fileMeta?.lyrics||'').trim();
    if(b)b.textContent=hasLyrics?'READ LYRICS · RSVP':'READ · RSVP';
    if(sp)sp.textContent=hasLyrics?'Send recovered source lyrics session-locally; borrow tempo as ×2 / ×4 / ×8 WPM. Lyrics remain unaligned source evidence.':'Open READFIELD beside this track; borrow tempo as ×2 / ×4 / ×8 WPM for any repo document or pasted text.';
  }
  if(law&&map){
    const bpm=Number(map.bpm)||0;
    law.textContent=(bpm?Math.round(bpm)+' BPM · ':'')+'FIELD PULSE carries clock/features only. Borrowed clock ≠ borrowed authorship. AUDIO MAP + RETURN remain durable evidence.';
  }
}
function toggleUse(force){
  const sh=$('#useSheet');if(!sh)return;
  const open=typeof force==='boolean'?force:!sh.classList.contains('on');
  sh.classList.toggle('on',open);sh.setAttribute('aria-hidden',String(!open));$('#useBtn')?.classList.toggle('on',open);
}
function openSurface(href){
  publishTransport(true);toggleUse(false);
  const w=window.open(href,'_blank');
  if(!w)location.assign(href);
}
function openReadfield(){
  if(!map)return;
  publishTransport(true);toggleUse(false);
  const ret=location.pathname+location.search, q=new URLSearchParams({pulse:'4',return:ret});
  const lyrics=String(fileMeta?.lyrics||'').trim();
  if(lyrics){
    try{sessionStorage.setItem('readfield.handoff.v1',JSON.stringify({source:lyrics,label:`LYRICS · ${fileMeta?.name||'TRACK'}`,returnAddress:ret,sourceKind:fileMeta?.sourceKind||null,sourceHash:fileMeta?.hash||null}))}catch(_){}
    q.set('handoff','1');
  }
  const href='/docs/?'+q.toString(),w=window.open(href,'_blank');
  if(!w)location.assign(href);
}

$('#file').addEventListener('change',e=>loadFile(e.target.files?.[0]));
$('#chooseLabel').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('#file').click()}});
$('#urlBtn').addEventListener('click',()=>{const v=$('#urlInput').value.trim();if(v)loadAddress(v)});
$('#urlInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('#urlBtn').click()}});
['dragenter','dragover'].forEach(k=>drop.addEventListener(k,e=>{e.preventDefault();drop.classList.add('over')}));
['dragleave','drop'].forEach(k=>drop.addEventListener(k,e=>{e.preventDefault();drop.classList.remove('over')}));
drop.addEventListener('drop',e=>{const f=e.dataTransfer.files?.[0];if(f)loadFile(f)});
$('#loadBtn').onclick=()=>{drop.classList.remove('loaded');$('#urlInput').focus()};
$('#useBtn').onclick=()=>toggleUse();$('#closeUse').onclick=()=>toggleUse(false);
$('#pinBtn').onclick=()=>openPinSheet(null,audio.currentTime);$('#pinsBtn').onclick=()=>openPinSheet(pins[0]||null,audio.currentTime);
$('#pinSave').onclick=commitPin;$('#pinDelete').onclick=deletePin;$('#pinClose').onclick=closePinSheet;
$('#useRide').onclick=()=>openSurface('../live/');$('#useRead').onclick=openReadfield;$('#useCompose').onclick=()=>openSurface('../two-dial/?pulse=1');$('#useMap').onclick=()=>{toggleUse(false);$('#export').click()};
$('#transport').onclick=async()=>{if(!audio.src)return;if(audio.paused)await audio.play();else audio.pause()};
audio.onplay=()=>{$('#transport').textContent='PAUSE';publishTransport(true)};audio.onpause=()=>{$('#transport').textContent='PLAY';publishTransport(true)};audio.ontimeupdate=()=>publishTransport(false);
$('#export').onclick=()=>{if(!map)return;const packet={kind:'FOLD_BLOOM_AUDIO_MAP',created:new Date().toISOString(),map,annotations:{schema:STREAM_LENS_SCHEMA,pins:normalizePins(pins,sourcePinKey())}},b=new Blob([JSON.stringify(packet,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`fold-bloom-audio-map-${Date.now()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
document.querySelectorAll('[data-scope]').forEach((b,i)=>b.onclick=()=>setScope(i));
addEventListener('wheel',e=>{
  if(e.target?.closest?.('#pinSheet,#useSheet,#drop'))return;
  const ax=Math.abs(e.deltaX),ay=Math.abs(e.deltaY),horizontal=map&&(ax>Math.max(2,ay*.65)||e.shiftKey);
  if(horizontal){
    e.preventDefault();const d=ax>Math.max(2,ay*.65)?e.deltaX:e.deltaY,range=scopeWindow(map,audio.currentTime,scope());
    audio.currentTime=scrubByDelta(range,audio.currentTime,d);publishTransport(true);return;
  }
  if(ay<2)return;e.preventDefault();setScope(scopeIndex+(e.deltaY>0?1:-1));
},{passive:false});
function scrub(e){if(!map)return;const r=overlay.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height*.53,p=pointAngle01(e.clientX,e.clientY,cx,cy),range=dragRange||scopeWindow(map,audio.currentTime,scope());audio.currentTime=scrubTime(range,p);publishTransport(true)}
overlay.onpointerdown=e=>{if(!map)return;drag=true;dragRange=scopeWindow(map,audio.currentTime,scope());overlay.setPointerCapture?.(e.pointerId);scrub(e)};
overlay.onpointermove=e=>{if(drag){e.preventDefault();scrub(e)}};
function endScrub(){if(!drag&&dragRange===null)return;drag=false;dragRange=null;publishTransport(true)}
overlay.onpointerup=endScrub;overlay.onpointercancel=endScrub;
addEventListener('keydown',e=>{
  const editing=/^(INPUT|TEXTAREA)$/i.test(e.target?.tagName||'');
  if(e.key==='Escape'){if($('#pinSheet')?.classList.contains('on'))closePinSheet();else toggleUse(false);return}
  if(editing)return;
  if(e.code==='Space'&&audio.src){e.preventDefault();$('#transport').click()}
  else if(e.key==='ArrowUp'){e.preventDefault();setScope(scopeIndex-1)}
  else if(e.key==='ArrowDown'){e.preventDefault();setScope(scopeIndex+1)}
  else if((e.key==='ArrowLeft'||e.key==='ArrowRight')&&map){
    e.preventDefault();const d=e.key==='ArrowRight'?1:-1;
    if(e.shiftKey)audio.currentTime=Math.max(0,Math.min(map.duration,audio.currentTime+d*(60/(map.bpm||90))));
    else audio.currentTime=stepAddress(scopeWindow(map,audio.currentTime,scope()),audio.currentTime,d,{fraction:1/28});
    publishTransport(true);
  }
  else if(e.key.toLowerCase()==='p'&&map){e.preventDefault();openPinSheet(null,audio.currentTime)}
});
function transportPayload(){
  if(!map)return null;
  const time=audio.currentTime||0,f=frameAt(map,time)||{e:.18,c:.4,f:.05},range=scopeWindow(map,time,scope());
  const beatIndex=beatIndexAt(map,time),beats=map.beats||[],beatPeriod=60/(map.bpm||90);
  const beatTime=beatIndex>=0?Number(beats[beatIndex]||0):0;
  const nextBeat=beatIndex>=0?Number(beats[beatIndex+1]??(beatTime+beatPeriod)):(time+beatPeriod);
  const beatSpan=Math.max(.001,nextBeat-beatTime),beatPhase=Math.max(0,Math.min(1,(time-beatTime)/beatSpan));
  const beatDistance=Math.max(0,Math.min(Math.abs(time-beatTime),Math.abs(nextBeat-time)));
  const sectionIndex=sectionIndexAt(map,time),sections=map.sections||[],sectionCount=Math.max(1,sections.length-1),sectionStart=sectionIndex>=0?Number(sections[sectionIndex]?.t||0):0;
  const sectionEnd=sectionIndex>=0?Number(sections[sectionIndex+1]?.t??map.duration):map.duration;
  const sectionProgress=sectionEnd>sectionStart?Math.max(0,Math.min(1,(time-sectionStart)/(sectionEnd-sectionStart))):0;
  return {
    playing:!audio.paused,time,duration:map.duration||0,bpm:map.bpm||0,tempoConfidence:map.tempoConfidence||0,
    beatIndex,beatTime,beatPhase,beatDistance,sectionIndex,sectionCount,sectionStart,sectionEnd,sectionProgress,scope:scope(),scopeStart:range[0],scopeEnd:range[1],
    energy:+(f.e||0).toFixed(4),flux:+(f.f||0).toFixed(4),brightness:+(f.c||0).toFixed(4),
    stage:map.stage||'UNKNOWN',sourceHash:fileMeta?.hash||null,sourceKind:fileMeta?.sourceKind||null,sourceAddress:fileMeta?.sourceAddress||null
  };
}
function publishTransport(force=false){
  if(!map)return;
  const now=performance.now();if(!force&&now-lastPulseAt<120)return;lastPulseAt=now;
  fieldPulse.publish('transport',transportPayload());
}
function loop(){
  const time=audio.currentTime||0,f=frameAt(map,time)||{e:.18,c:.4,f:.05,l:.3,m:.4,h:.3},bi=beatIndexAt(map,time),si=sectionIndexAt(map,time),r=ensureRenderer(),range=dragRange||scopeWindow(map,time,scope());
  if(map&&bi>=0)r.markBeat(bi);r.setPins?.(pins);r.draw(map,f,time,scopeIndex,!audio.paused,range);if(map){renderedMapFrames++;publishTransport(false)}
  $('#time').textContent=`${fmt(time)} / ${fmt(map?.duration||0)}`;$('#energy').textContent=`E ${Math.round((f.e||0)*100)}`;$('#flux').textContent=`Δ ${Math.round((f.f||0)*100)}`;$('#bright').textContent=`C ${Math.round((f.c||0)*100)}`;
  $('#where').textContent=map?`${scope()} ${fmt(range[0])}–${fmt(range[1])}${dragRange?' · HOLD':''}${map.stage==='PREVIEW'?' · PREVIEW':` · B${Math.max(0,bi)+1} S${Math.max(0,si)+1}`}`:'DROP A TRACK';
  raf=requestAnimationFrame(loop);
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelAnimationFrame(raf);else{cancelAnimationFrame(raf);loop()}});
window.addEventListener('error',e=>{console.warn('LISTEN runtime error',e.error||e.message);if(!map)status('APP DEGRADED · FILE PICKER STILL AVAILABLE')});
setScope(1,false);updateWorkflow();
document.documentElement.dataset.listenBoot='ready';document.documentElement.dataset.listenLens=STREAM_LENS_SCHEMA;syncPins();
window.FoldBloomListen={boot:'ready',state:()=>({scope:scope(),time:audio.currentTime,map,fileMeta,stage:map?.stage||'EMPTY',gestureRange:dragRange?[...dragRange]:null,pins:normalizePins(pins,sourcePinKey()),sourcePinKey:sourcePinKey(),lensSchema:STREAM_LENS_SCHEMA,previewBuilds,deepBuilds,renderedMapFrames,renderer:renderer?.fallback?'fallback':'webgl',lastRemoteFailure}),parseSunoId,classifySourceAddress,resolveSourceAddress,openPin:()=>openPinSheet(null,audio.currentTime)};
requestAnimationFrame(loop);
