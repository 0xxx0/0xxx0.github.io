import {ListenRenderer} from './render.js';
import {SCOPES,frameAt,beatIndexAt,phraseIndexAt,sectionIndexAt,scopeWindow,scrubTime} from './audio-map.js';
import {pointAngle01} from './polar-control.js';
import {parseSunoId,parseSunoPlaylistId,classifySourceAddress,resolveSourceAddress,fetchRemoteAudio} from './source-adapters.js';
import {buildPreviewMap} from './preview-map.js';
import {createFieldPulse} from '../../lib/field-pulse.js';
import {STREAM_LENS_SCHEMA,scrubByDelta,stepAddress,makeStreamPin,normalizePins} from './stream-lens.js';
import {audioGlyphDescriptor,audioGlyphSvg} from './audio-glyph.js';
import {parseLocalAudioMeta,localDisplayName} from './media-meta.js';
import {groupLocalInputs,parseTextSidecar,parsePlaylistText} from './sidecar-text.js';
import {sourceBundleFromMeta} from './source-bundle.js';
import {normalizeRideProfile,profileKey} from '../live/visual-worlds.js';
import {compileEventTape,toBeatSaberV4Draft} from '../beat/event-tape.js';
import {buildBeatSaberPack} from '../beat/beatsaber-pack.js';

const $=s=>document.querySelector(s);
const gl=$('#field'),overlay=$('#overlay'),audio=$('#audio'),drop=$('#drop');
let renderer=null,worker=null,map=null,fileMeta=null,sourceBlob=null,scopeIndex=1,objectURL=null,drag=false,dragRange=null,pointerGesture=null,lastGesture='NONE',raf=0,previewBuilds=0,deepBuilds=0,renderedMapFrames=0,lastPulseAt=0,lastRemoteFailure=null,pendingSource=null,pins=[],editingPinId=null,glyphDesc=null,rideProfile=normalizeRideProfile(),idle={on:false,startScope:1,lastBeat:-1,lastPhrase:-1,lastSection:-1};
const fieldPulse=createFieldPulse('FOLD_BLOOM_LISTEN');

function toast(t){const e=$('#toast');if(!e)return;e.textContent=t;e.classList.remove('on');void e.offsetWidth;e.classList.add('on')}
function status(t){const e=$('#status');if(e)e.textContent=t}
function fmt(t){if(!Number.isFinite(t))return'0:00';const m=Math.floor(t/60),s=Math.floor(t%60);return `${m}:${String(s).padStart(2,'0')}`}
function scope(){return SCOPES[scopeIndex]}
function refreshGlyph(){
  const btn=$('#glyphBtn'),mark=$('#glyphMark');
  if(!btn||!mark||!map||!fileMeta){glyphDesc=null;if(btn)btn.disabled=true;return}
  glyphDesc=audioGlyphDescriptor(map,fileMeta);
  try{
    const raw=String(glyphDesc?.sourceHash||fileMeta?.hash||'').toLowerCase(),id=/^[0-9a-f]{64}$/.test(raw)?'sha256:'+raw:raw;
    if(id)sessionStorage.setItem('fold-bloom.source-glyph.v01:'+id,JSON.stringify({schema:'fold-bloom.source-glyph-cache/v0.1',sourceId:id,stage:map?.stage||null,glyph:glyphDesc,at:new Date().toISOString()}));
  }catch(_){}
  mark.innerHTML=audioGlyphSvg(glyphDesc,{size:48,padding:4});
  btn.disabled=false;btn.title=`SOURCE GLYPH · ${glyphDesc.key||'NO KEY'} · ${glyphDesc.bpm?glyphDesc.bpm+' BPM':'NO BPM'}`;
}
function downloadGlyph(){
  if(!glyphDesc)return;
  const svg=audioGlyphSvg(glyphDesc,{size:256,padding:16}),blob=new Blob([svg],{type:'image/svg+xml'}),a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  const base=String(fileMeta?.name||'audio').replace(/\.[^.]+$/,'').replace(/[^a-z0-9_-]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,48)||'audio';
  a.download=`${base}.field-glyph.svg`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('GLYPH EXPORTED');
}
function sourcePinKey(){
  return fileMeta?.hash||fileMeta?.sourceId||fileMeta?.sourceAddress||(fileMeta?.name?`${fileMeta.name}:${fileMeta.size||0}`:null);
}
function pinStoreKey(){const k=sourcePinKey();return k?`fold-bloom.listen.pins.v01:${k}`:null}

function rideStoreKey(){const k=sourcePinKey();return k?profileKey(k):null}
function syncRideProfile(){
  const k=rideStoreKey();rideProfile=normalizeRideProfile();
  if(k){try{rideProfile=normalizeRideProfile(JSON.parse(localStorage.getItem(k)||'{}'))}catch(_){} }
  const set=(id,v)=>{const e=$(id);if(e)e.value=String(v)};
  set('#rideSolid',Math.round(rideProfile.solidity*100));set('#rideImmersion',Math.round(rideProfile.immersion*100));set('#rideDrop',Math.round(rideProfile.dropGain*100));set('#rideText',Math.round(rideProfile.textOffset*100));
  if($('#rideSolidVal'))$('#rideSolidVal').textContent=Math.round(rideProfile.solidity*100)+'%';
  if($('#rideImmersionVal'))$('#rideImmersionVal').textContent=rideProfile.immersion.toFixed(2)+'×';
  if($('#rideDropVal'))$('#rideDropVal').textContent=rideProfile.dropGain.toFixed(2)+'×';
  if($('#rideTextVal'))$('#rideTextVal').textContent=(rideProfile.textOffset>=0?'+':'')+rideProfile.textOffset.toFixed(2)+'s';
  document.documentElement.dataset.listenRideProfile=`${rideProfile.solidity.toFixed(2)}:${rideProfile.immersion.toFixed(2)}:${rideProfile.dropGain.toFixed(2)}:${rideProfile.textOffset.toFixed(2)}`;
  return rideProfile;
}
function saveRideProfile(announce=false){const k=rideStoreKey();rideProfile=normalizeRideProfile(rideProfile);if(k){try{localStorage.setItem(k,JSON.stringify(rideProfile))}catch(_){}}syncRideProfile();if(announce)toast('RIDE PROFILE SAVED')}

function loadPins(){
  const k=pinStoreKey();pins=[];
  if(k){try{pins=normalizePins(JSON.parse(localStorage.getItem(k)||'[]'),sourcePinKey())}catch(_){}}
  syncPins();syncRideProfile();
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
function stopIdle(takeover=false){
  if(!idle.on)return;
  idle.on=false;document.documentElement.dataset.listenIdle='off';
  const b=$('#idleBtn');if(b)b.textContent='IDLE';
  setScope(idle.startScope,false);
  if(takeover)toast('AWAKE · CURRENT ADDRESS');
}
async function startIdle(){
  if(!map)return;
  if(idle.on){stopIdle(true);return}
  const t=audio.currentTime||0;idle={on:true,startScope:scopeIndex,lastBeat:beatIndexAt(map,t),lastPhrase:phraseIndexAt(map,t),lastSection:sectionIndexAt(map,t)};
  document.documentElement.dataset.listenIdle='on';
  const b=$('#idleBtn');if(b)b.textContent='TAKE OVER';
  if(audio.src&&audio.paused)await audio.play().catch(()=>{});
  toast('IDLE · WITNESS ONLY');
}
function idleWitness(){
  if(!idle.on||!map)return;
  const t=audio.currentTime||0,bi=beatIndexAt(map,t),pi=phraseIndexAt(map,t),si=sectionIndexAt(map,t);
  if(si!==idle.lastSection&&si>=0){idle.lastSection=si;idle.lastPhrase=pi;idle.lastBeat=bi;setScope(2,false);return}
  if(pi!==idle.lastPhrase&&pi>=0){idle.lastPhrase=pi;idle.lastBeat=bi;setScope(1,false);return}
  if(bi!==idle.lastBeat&&bi>=0){idle.lastBeat=bi;if(bi%8===0)setScope(1,false);else if(bi%4===0)setScope(0,false)}
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
    $('#beats').textContent=`${map.beats.length} BEATS`;$('#phrases').textContent=`${Math.max(0,(map.phrases?.length||1)-1)} PHRASES`;$('#sections').textContent=`${Math.max(0,map.sections.length-1)} SECTIONS`;
    refreshGlyph();$('#transport').disabled=false;$('#export').disabled=false;toast('MAP READY');updateWorkflow();publishTransport(true);
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
    if(objectURL)URL.revokeObjectURL(objectURL);sourceBlob=playbackBlob;objectURL=URL.createObjectURL(playbackBlob);audio.src=objectURL;
    fileMeta={...meta,name:meta.name||'AUDIO SOURCE',size:meta.size??playbackBlob.size,type:meta.type||playbackBlob.type||'audio',hash,duration:decoded.duration,sourceSampleRate:decoded.sampleRate};
    fileMeta.bundle=sourceBundleFromMeta(fileMeta);
    loadPins();
    $('#track').textContent=fileMeta.name;
    const lyricNote=fileMeta.lyrics?' · LYRICS FOUND / UNALIGNED':'',tagNote=fileMeta.tags?` · ${String(fileMeta.tags).slice(0,42)}`:'';
    $('#meta').textContent=`${fmt(decoded.duration)} · ${(fileMeta.size/1048576).toFixed(1)} MB · ${sourceLabel(fileMeta)}${lyricNote}${tagNote}`;

    map=buildPreviewMap(pcm,sampleRate,decoded.duration);map.source=fileMeta;previewBuilds++;
    drop.classList.remove('busy');drop.classList.add('loaded');
    $('#bpm').textContent=fileMeta.providerBpm?`${Number(fileMeta.providerBpm).toFixed(1)} BPM · PROVIDER`:'… BPM';$('#confidence').textContent='PREVIEW';
    $('#key').textContent=fileMeta.providerKey?`${fileMeta.providerKey} · PROVIDER`:'… KEY';
    $('#beats').textContent='… BEATS';$('#phrases').textContent='… PHRASES';$('#sections').textContent='1 SPAN';
    refreshGlyph();$('#transport').disabled=false;$('#export').disabled=false;updateWorkflow();
    status(decoded.duration>1200?'LONGFORM PREVIEW · DEEP MAP DEFERRED':'PREVIEW READY · REFINING');
    toast('PREVIEW READY');publishTransport(true);

    if(decoded.duration>1200)return;
    ensureWorker().postMessage({type:'analyze',pcm:pcm.buffer,sampleRate,duration:decoded.duration},[pcm.buffer]);
  }finally{await ctx.close().catch(()=>{})}
}
async function readTextEvidence(sidecars=[]){
  const out=[];
  for(const f of sidecars){
    try{out.push(parseTextSidecar(await f.text(),f.name))}catch(error){console.warn('sidecar',f.name,error)}
  }
  return out.filter(x=>x.text);
}
async function readPlaylistEvidence(files=[]){
  const out=[];
  for(const f of files){
    try{out.push(parsePlaylistText(await f.text(),f.name))}catch(error){console.warn('playlist',f.name,error)}
  }
  return out.filter(x=>x.entries?.length);
}
async function loadFiles(files){
  const grouped=groupLocalInputs(files),playlistEvidence=await readPlaylistEvidence(grouped.playlists);
  if(!grouped.groups.length){
    if(playlistEvidence.length){
      pendingSource={kind:'LOCAL_PLAYLIST',title:playlistEvidence[0].name,collection:playlistEvidence[0],resolution:'LOCAL_PLAYLIST_FILE'};
      drop.classList.remove('busy');status('PLAYLIST CAPTURED · '+playlistEvidence[0].entries.length+' ADDRESSES · LOAD ONE AUDIO TO BIND');
      $('#meta').textContent='PLAYLIST IS CONTEXT / ORDER · AUDIO BYTES STILL REQUIRED FOR A MAP';toast('PLAYLIST CONTEXT READY');
    }
    return;
  }
  const g=grouped.groups[0];
  await loadFile(g.audio,{sidecars:g.sidecars,collection:playlistEvidence[0]||null});
}
async function loadFile(file,{sidecars=[],collection=null}={}){
  if(!file)return;
  stopIdle(false);
  try{
    const bytes=await file.arrayBuffer(),meta=parseLocalAudioMeta(bytes,file.name),textEvidence=await readTextEvidence(sidecars);
    const text=textEvidence[0]||null,origin=pendingSource&&pendingSource.kind!=='LOCAL_PLAYLIST'&&pendingSource.kind!=='SUNO_PLAYLIST'?pendingSource:null;
    const collectionEvidence=collection||(pendingSource?.kind==='LOCAL_PLAYLIST'?pendingSource.collection:null)||(pendingSource?.kind==='SUNO_PLAYLIST'?{kind:'SUNO_PLAYLIST',name:pendingSource.title||'SUNO PLAYLIST',address:pendingSource.address,id:pendingSource.playlistId,entries:[]}:null);
    const title=meta.title||origin?.title||'',artist=meta.artist||origin?.artist||'',album=meta.album||'',lyrics=text?.text||meta.lyrics||origin?.lyrics||'';
    const sourceMeta={
      name:title?(artist?artist+' — '+title:title):localDisplayName(meta,file.name),sourceFileName:file.name,size:file.size,type:file.type||'audio',sourceKind:'LOCAL_FILE',
      sourceAddress:origin?.address||null,sourceId:origin?.sunoId||null,metadataAddress:origin?.metadataUrl||null,resolution:origin?.resolution||null,
      title,artist,album,tags:meta.genre||origin?.tags||'',lyrics,
      lyricsLanguage:meta.lyricsLanguage||null,lyricsAlignment:text?.alignment||meta.lyricsAlignment||(origin?.lyrics?'UNALIGNED_PROVIDER_META':null),
      providerBpm:meta.bpm||origin?.providerBpm||null,providerKey:meta.key||origin?.providerKey||null,providerTimeSignature:origin?.providerTimeSignature||null,
      metadataSource:[meta.metadataSource,text?'SIDECAR_TEXT':null,origin?'SOURCE_ADDRESS':null].filter(Boolean).join('+')||null,
      origin:origin?{kind:origin.kind,address:origin.address,id:origin.sunoId||null,resolution:origin.resolution||null}:null,
      collection:collectionEvidence?{kind:collectionEvidence.kind||'PLAYLIST',name:collectionEvidence.name||'PLAYLIST',address:collectionEvidence.address||null,id:collectionEvidence.id||null,count:collectionEvidence.entries?.length||null}:null,
      textEvidence:textEvidence.map(x=>({name:x.name,kind:x.kind,alignment:x.alignment,chars:x.chars,cueCount:x.cueCount})),
      timedText:text?.cues?.length?{name:text.name,kind:text.kind,alignment:text.alignment,cues:text.cues.slice(0,1200)}:null
    };
    await analyzeBytes(bytes,file,sourceMeta);
    if(origin||collectionEvidence){toast(origin?'SOURCE LINK × LOCAL BYTES BOUND':'PLAYLIST CONTEXT × AUDIO BOUND');pendingSource=null}
  }
  catch(error){console.warn(error);drop.classList.remove('busy');status('DECODE ERROR · CHOOSE ANOTHER FILE');toast('DECODE ERROR')}
}
async function loadAddress(input){
  status('RESOLVING');drop.classList.add('busy');lastRemoteFailure=null;
  let source=null;
  try{
    source=await resolveSourceAddress(input);pendingSource=source;$('#track').textContent=source.title||'REMOTE SOURCE';
    if(source.kind==='SUNO_PLAYLIST'){
      drop.classList.remove('busy');status('SUNO PLAYLIST ADDRESS CAPTURED · LOAD AUDIO TO BIND');
      $('#meta').textContent='PLAYLIST LINK PRESERVED AS COLLECTION PROVENANCE · BROWSER DOES NOT REQUIRE PLAYLIST SCRAPING';
      toast('PLAYLIST ADDRESS READY');return;
    }
    $('#meta').textContent=source.kind==='SUNO'?(source.resolution.replaceAll('_',' ')+' · FETCHING AUDIO'):'DIRECT ADDRESS · FETCHING AUDIO';
    const remote=await fetchRemoteAudio(source),blob=new Blob([remote.bytes],{type:remote.type||'audio/mpeg'});
    await analyzeBytes(remote.bytes,blob,{name:source.title||source.audioUrl.split('/').pop()||'REMOTE AUDIO',size:remote.size,type:remote.type,sourceKind:source.kind,sourceAddress:source.address,sourceId:source.sunoId||null,metadataAddress:source.metadataUrl||null,resolution:source.resolution,artist:source.artist||'',tags:source.tags||'',lyrics:source.lyrics||'',lyricsAlignment:source.lyrics?'UNALIGNED_PROVIDER_META':null,providerBpm:source.providerBpm||null,providerKey:source.providerKey||null,providerTimeSignature:source.providerTimeSignature||null,metadataError:source.metadataError||null,origin:{kind:source.kind,address:source.address,id:source.sunoId||null,resolution:source.resolution||null}});
    pendingSource=null;
  }catch(error){
    const kind=parseSunoPlaylistId(input)?'SUNO_PLAYLIST':(parseSunoId(input)?'SUNO':'REMOTE_AUDIO');
    lastRemoteFailure={kind,address:String(input||''),error:String(error?.message||error),at:new Date().toISOString()};
    if(source)pendingSource=source;
    drop.classList.remove('busy');
    if(kind==='SUNO'){
      const hasMeta=!!(source&&(source.title||source.artist||source.lyrics||source.tags));
      status(hasMeta?'SUNO META READY · LOAD MP3/M4A TO BIND':'SUNO LINK READY · LOAD MP3/M4A TO BIND');
      $('#meta').textContent=hasMeta?'REMOTE AUDIO BLOCKED · TITLE / ARTIST / LYRICS / TAGS KEPT WHEN AVAILABLE · CHOOSE LOCAL AUDIO':'REMOTE AUDIO BLOCKED · SUNO LINK/UUID KEPT AS ORIGIN · CHOOSE LOCAL AUDIO';
      toast(hasMeta?'SUNO META KEPT · LOAD AUDIO':'SUNO LINK KEPT · LOAD AUDIO');
    }else if(kind==='SUNO_PLAYLIST'){
      status('SUNO PLAYLIST ADDRESS KEPT · LOAD LOCAL AUDIO TO BIND');
      $('#meta').textContent='COLLECTION PROVENANCE KEPT · TRACK ENUMERATION IS NOT REQUIRED';
      toast('PLAYLIST LINK KEPT');
    }else{
      status('REMOTE ADDRESS KEPT · LOAD LOCAL AUDIO TO BIND');
      $('#meta').textContent='NETWORK/CORS AUDIO FAILED · ADDRESS REMAINS PROVENANCE · LOCAL FILE CAN BIND TO IT';
      toast('ADDRESS KEPT · LOAD AUDIO');
    }
    console.warn(error)
  }
}


function updateWorkflow(){
  const use=$('#useBtn'),read=$('#useRead'),law=$('#useLaw'),beat=$('#beatSaberBtn');
  syncRideProfile();
  if(use)use.disabled=!map;if(beat)beat.disabled=!map;
  const idleBtn=$('#idleBtn');if(idleBtn)idleBtn.disabled=!map;
  if(read){
    const b=read.querySelector('b'),sp=read.querySelector('span'),hasLyrics=!!String(fileMeta?.lyrics||'').trim();
    if(b)b.textContent=hasLyrics?'READ LYRICS · RSVP':'READ · RSVP';
    if(sp)sp.textContent=hasLyrics?'Send recovered source lyrics session-locally; borrow tempo as ×2 / ×4 / ×8 WPM. Lyrics remain unaligned source evidence.':'Open READFIELD beside this track; borrow tempo as ×2 / ×4 / ×8 WPM for any repo document or pasted text.';
  }
  if(law&&map){
    const bpm=Number(map.bpm)||0;
    law.textContent=(bpm?Math.round(bpm)+' BPM · ':'')+'FIELD PULSE carries clock/features only. Borrowed clock ≠ borrowed authorship. RIDE PROFILE changes projection/timing only; AUDIO MAP + RETURN remain durable evidence.';
  }
}
async function exportBeatSaberPack(){
  if(!map)return false;
  if(!sourceBlob){toast('BEAT SABER PACK · SOURCE BYTES REQUIRED');return false}
  try{
    const sourceId=fileMeta?.hash?('sha256:'+fileMeta.hash):sourcePinKey();
    const eventTape=compileEventTape(map,{sourceId}),chart=toBeatSaberV4Draft(eventTape);
    chart._foldBloom={...(chart._foldBloom||{}),sourceId,eventCount:eventTape.eventCount,sourceName:fileMeta?.name||'SOURCE'};
    const sourceBytes=await sourceBlob.arrayBuffer();
    const pack=buildBeatSaberPack({chart,map,fileMeta:{...(fileMeta||{}),sourceId},sourceBytes,generatedAt:new Date().toISOString()});
    const blob=new Blob([pack.bytes],{type:'application/zip'}),link=document.createElement('a');
    link.href=URL.createObjectURL(blob);link.download=pack.filename;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);
    document.documentElement.dataset.listenBeatSaberPack=pack.status;
    toast(pack.playtestReady?'BEAT SABER PACK · AUDIO READY':'BEAT SABER PACK · CONVERT SOURCE TO OGG');
    return true;
  }catch(error){toast(error?.message||'BEAT SABER PACK FAILED');return false}
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
function addressedReturn(){
  const ps=normalizePins(pins,sourcePinKey());
  return {
    kind:'FOLD_BLOOM_ADDRESSED_MESSAGE',
    schema:'fold-bloom-addressed-message/v0.1',
    source:{key:sourcePinKey(),name:fileMeta?.name||'SOURCE',hash:fileMeta?.hash||null,kind:fileMeta?.sourceKind||null,bundle:fileMeta?.bundle||null,origin:fileMeta?.origin||null,collection:fileMeta?.collection||null,textEvidence:fileMeta?.textEvidence||[]},
    path:{order:'SOURCE_ADDRESS',humanAuthored:true,cells:ps.map((p,i)=>({n:i+1,id:p.id,address:p.address,scope:p.scope,label:p.label,note:p.note,features:p.features}))},
    warning:'Path meaning is authored by the human. Source order and analysis features do not infer semantics.'
  };
}
function openAtlas(){
  if(!map||!glyphDesc)return;
  toggleUse(false);
  const entry={id:fileMeta?.hash||glyphDesc.sourceHash,name:fileMeta?.name||'SOURCE',artist:fileMeta?.artist||'',album:fileMeta?.album||'',format:fileMeta?.type||'',duration:map.duration||0,sourceHash:fileMeta?.hash||glyphDesc.sourceHash,sourceKind:fileMeta?.sourceKind||'AUDIO_MAP',origin:fileMeta?.origin||null,collection:fileMeta?.collection||null,textWitness:(fileMeta?.textEvidence?.[0]||fileMeta?.lyrics)?{kind:fileMeta?.textEvidence?.[0]?.kind||(fileMeta?.lyrics?'LYRICS':null),alignment:fileMeta?.textEvidence?.[0]?.alignment||fileMeta?.lyricsAlignment||null,chars:String(fileMeta?.lyrics||'').length,cues:fileMeta?.textEvidence?.[0]?.cueCount||0}:null,glyph:glyphDesc,rideProfile:{...rideProfile}};
  try{sessionStorage.setItem('fold-bloom.atlas.handoff.v1',JSON.stringify({entry,from:location.pathname}))}catch(_){}
  const w=window.open('../atlas/','_blank');if(!w)location.assign('../atlas/');
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

$('#file').addEventListener('change',e=>loadFiles(e.target.files));
$('#chooseLabel').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('#file').click()}});
$('#urlBtn').addEventListener('click',()=>{const v=$('#urlInput').value.trim();if(v)loadAddress(v)});
$('#urlInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('#urlBtn').click()}});
['dragenter','dragover'].forEach(k=>drop.addEventListener(k,e=>{e.preventDefault();drop.classList.add('over')}));
['dragleave','drop'].forEach(k=>drop.addEventListener(k,e=>{e.preventDefault();drop.classList.remove('over')}));
drop.addEventListener('drop',e=>{const fs=e.dataTransfer.files;if(fs?.length)loadFiles(fs)});
$('#loadBtn').onclick=()=>{drop.classList.remove('loaded');$('#urlInput').focus()};
$('#useBtn').onclick=()=>toggleUse();$('#closeUse').onclick=()=>toggleUse(false);$('#beatSaberBtn').onclick=()=>{void exportBeatSaberPack()};
$('#pinBtn').onclick=()=>{stopIdle(true);openPinSheet(null,audio.currentTime)};$('#pinsBtn').onclick=()=>{stopIdle(true);openPinSheet(pins[0]||null,audio.currentTime)};$('#glyphBtn').onclick=downloadGlyph;$('#idleBtn').onclick=()=>startIdle();
$('#pinSave').onclick=commitPin;$('#pinDelete').onclick=deletePin;$('#pinClose').onclick=closePinSheet;
$('#useRide').onclick=()=>{
  const raw=String(fileMeta?.hash||'').toLowerCase(),source=/^[0-9a-f]{64}$/.test(raw)?'sha256:'+raw:null;
  if(!source){openSurface('../live/');return}
  const q=new URLSearchParams({source,return:location.pathname+location.search});
  openSurface('../live/?'+q.toString());
};$('#useRead').onclick=openReadfield;$('#useCompose').onclick=()=>openSurface('../two-dial/?pulse=1');
const rideTune=(id,key,scale=100)=>{const el=$(id);if(!el)return;el.oninput=e=>{rideProfile=normalizeRideProfile({...rideProfile,[key]:Number(e.target.value)/scale});saveRideProfile(false)};el.onchange=()=>saveRideProfile(true)};
rideTune('#rideSolid','solidity');rideTune('#rideImmersion','immersion');rideTune('#rideDrop','dropGain');rideTune('#rideText','textOffset');$('#useAtlas').onclick=openAtlas;$('#useMap').onclick=()=>{toggleUse(false);$('#export').click()};
$('#useBeat').onclick=()=>{void exportBeatSaberPack().then(ok=>{if(ok)toggleUse(false)})};
$('#transport').onclick=async()=>{stopIdle(true);if(!audio.src)return;if(audio.paused)await audio.play();else audio.pause()};
audio.onplay=()=>{$('#transport').textContent='PAUSE';publishTransport(true)};audio.onpause=()=>{$('#transport').textContent='PLAY';publishTransport(true)};audio.ontimeupdate=()=>publishTransport(false);
$('#export').onclick=()=>{if(!map)return;const packet={kind:'FOLD_BLOOM_AUDIO_MAP',created:new Date().toISOString(),sourceBundle:fileMeta?.bundle||null,timedText:fileMeta?.timedText||null,map,glyph:glyphDesc||audioGlyphDescriptor(map,fileMeta||{}),annotations:{schema:STREAM_LENS_SCHEMA,pins:normalizePins(pins,sourcePinKey())},addressedMessage:addressedReturn(),rideProfile:{...rideProfile}},b=new Blob([JSON.stringify(packet,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`fold-bloom-audio-map-${Date.now()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
document.querySelectorAll('[data-scope]').forEach((b,i)=>b.onclick=()=>setScope(i));
addEventListener('wheel',e=>{
  if(e.target?.closest?.('#pinSheet,#useSheet,#drop'))return;
  stopIdle(true);
  const ax=Math.abs(e.deltaX),ay=Math.abs(e.deltaY),horizontal=map&&(ax>Math.max(2,ay*.65)||e.shiftKey);
  if(horizontal){
    e.preventDefault();const d=ax>Math.max(2,ay*.65)?e.deltaX:e.deltaY,range=scopeWindow(map,audio.currentTime,scope());
    audio.currentTime=scrubByDelta(range,audio.currentTime,d);publishTransport(true);return;
  }
  if(ay<2)return;e.preventDefault();setScope(scopeIndex+(e.deltaY>0?1:-1));
},{passive:false});
function scrub(e){if(!map)return;const r=overlay.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height*.53,p=pointAngle01(e.clientX,e.clientY,cx,cy),range=dragRange||scopeWindow(map,audio.currentTime,scope());audio.currentTime=scrubTime(range,p);publishTransport(true)}
function setGestureWitness(mode){
  lastGesture=mode||'NONE';
  document.documentElement.dataset.listenGesture=lastGesture;
}
function beginPointerGesture(e){
  if(!map)return;
  stopIdle(true);
  const mouse=e.pointerType==='mouse';
  pointerGesture={id:e.pointerId,startX:e.clientX,startY:e.clientY,lastX:e.clientX,lastY:e.clientY,mode:mouse?'ADDRESS':null,scopeStart:scopeIndex,scopeStep:0,moved:false};
  drag=mouse;dragRange=scopeWindow(map,audio.currentTime,scope());
  try{overlay.setPointerCapture?.(e.pointerId)}catch(_){}
  if(mouse){setGestureWitness('ADDRESS');scrub(e)}
}
function movePointerGesture(e){
  const g=pointerGesture;if(!g||g.id!==e.pointerId||!map)return;
  const dx=e.clientX-g.startX,dy=e.clientY-g.startY,ax=Math.abs(dx),ay=Math.abs(dy),distance=Math.hypot(dx,dy);
  g.lastX=e.clientX;g.lastY=e.clientY;if(distance>3)g.moved=true;
  if(!g.mode&&distance>=10){
    g.mode=ay>ax*1.18?'APERTURE':'ADDRESS';
    setGestureWitness(g.mode);
    if(g.mode==='ADDRESS'){drag=true;dragRange=scopeWindow(map,audio.currentTime,scope())}
    else{drag=false;dragRange=null}
  }
  if(!g.mode)return;
  e.preventDefault();
  if(g.mode==='ADDRESS'){scrub(e);return}
  const step=Math.trunc(dy/52);
  if(step!==g.scopeStep){
    g.scopeStep=step;
    setScope(g.scopeStart+step,false);
    document.documentElement.dataset.listenApertureGesture=scope();
  }
}
function endPointerGesture(e){
  const g=pointerGesture;if(!g||g.id!==e.pointerId)return;
  if(!g.mode&&!g.moved){setGestureWitness('ADDRESS');drag=true;dragRange=scopeWindow(map,audio.currentTime,scope());scrub(e)}
  drag=false;dragRange=null;pointerGesture=null;publishTransport(true);
}
overlay.onpointerdown=beginPointerGesture;
overlay.onpointermove=movePointerGesture;
overlay.onpointerup=endPointerGesture;
overlay.onpointercancel=e=>{if(pointerGesture?.id===e.pointerId){drag=false;dragRange=null;pointerGesture=null;publishTransport(true)}};
addEventListener('keydown',e=>{
  const editing=/^(INPUT|TEXTAREA)$/i.test(e.target?.tagName||'');
  if(e.key==='Escape'){if($('#pinSheet')?.classList.contains('on'))closePinSheet();else toggleUse(false);return}
  if(editing)return;
  if(idle.on)stopIdle(true);
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
  const phraseIndex=phraseIndexAt(map,time),phrases=map.phrases||[],phraseCount=Math.max(0,phrases.length-1),phraseStart=phraseIndex>=0?Number(phrases[phraseIndex]?.t||0):null;
  const phraseEnd=phraseIndex>=0?Number(phrases[phraseIndex+1]?.t??map.duration):null;
  const phraseProgress=phraseStart!==null&&phraseEnd>phraseStart?Math.max(0,Math.min(1,(time-phraseStart)/(phraseEnd-phraseStart))):null;
  const sectionIndex=sectionIndexAt(map,time),sections=map.sections||[],sectionCount=Math.max(1,sections.length-1),sectionStart=sectionIndex>=0?Number(sections[sectionIndex]?.t||0):0;
  const sectionEnd=sectionIndex>=0?Number(sections[sectionIndex+1]?.t??map.duration):map.duration;
  const sectionProgress=sectionEnd>sectionStart?Math.max(0,Math.min(1,(time-sectionStart)/(sectionEnd-sectionStart))):0;
  return {
    playing:!audio.paused,time,duration:map.duration||0,bpm:map.bpm||0,tempoConfidence:map.tempoConfidence||0,
    beatIndex,beatTime,beatPhase,beatDistance,phraseIndex,phraseCount,phraseStart,phraseEnd,phraseProgress,sectionIndex,sectionCount,sectionStart,sectionEnd,sectionProgress,scope:scope(),scopeStart:range[0],scopeEnd:range[1],
    energy:+(f.e||0).toFixed(4),flux:+(f.f||0).toFixed(4),brightness:+(f.c||0).toFixed(4),
    stage:map.stage||'UNKNOWN',sourceHash:fileMeta?.hash||null,sourceKind:fileMeta?.sourceKind||null,sourceAddress:fileMeta?.sourceAddress||null
  };
}
function publishTransport(force=false){
  if(!map)return;
  const now=performance.now();if(!force&&now-lastPulseAt<120)return;lastPulseAt=now;
  const payload=transportPayload();fieldPulse.publish('transport',payload);window.dispatchEvent(new CustomEvent('fold-bloom-listen:state',{detail:payload}));
}
function loop(){
  idleWitness();
  const time=audio.currentTime||0,f=frameAt(map,time)||{e:.18,c:.4,f:.05,l:.3,m:.4,h:.3},bi=beatIndexAt(map,time),si=sectionIndexAt(map,time),r=ensureRenderer(),range=dragRange||scopeWindow(map,time,scope());
  if(map&&bi>=0)r.markBeat(bi);r.setPins?.(pins);r.draw(map,f,time,scopeIndex,!audio.paused,range);if(map){renderedMapFrames++;publishTransport(false)}
  $('#time').textContent=`${fmt(time)} / ${fmt(map?.duration||0)}`;$('#energy').textContent=`E ${Math.round((f.e||0)*100)}`;$('#flux').textContent=`Δ ${Math.round((f.f||0)*100)}`;$('#bright').textContent=`C ${Math.round((f.c||0)*100)}`;
  $('#where').textContent=map?`${scope()} ${fmt(range[0])}–${fmt(range[1])}${dragRange?' · HOLD':''}${map.stage==='PREVIEW'?' · PREVIEW':` · B${Math.max(0,bi)+1} S${Math.max(0,si)+1}`}`:'DROP A TRACK';
  raf=requestAnimationFrame(loop);
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelAnimationFrame(raf);else{cancelAnimationFrame(raf);loop()}});
window.addEventListener('error',e=>{console.warn('LISTEN runtime error',e.error||e.message);if(!map)status('APP DEGRADED · FILE PICKER STILL AVAILABLE')});
setScope(1,false);updateWorkflow();
document.documentElement.dataset.listenBoot='ready';document.documentElement.dataset.listenLens=STREAM_LENS_SCHEMA;document.documentElement.dataset.listenGesture='NONE';document.documentElement.dataset.listenApertureGesture=scope();syncPins();syncRideProfile();
addEventListener('storage',e=>{if(e.key&&e.key===rideStoreKey())syncRideProfile()});
window.FoldBloomListen={boot:'ready',state:()=>({scope:scope(),time:audio.currentTime,map,fileMeta,pendingSource,glyph:glyphDesc,idle:idle.on,addressedMessage:map?addressedReturn():null,stage:map?.stage||'EMPTY',gestureRange:dragRange?[...dragRange]:null,gesture:lastGesture,pins:normalizePins(pins,sourcePinKey()),rideProfile:{...rideProfile},sourcePinKey:sourcePinKey(),lensSchema:STREAM_LENS_SCHEMA,previewBuilds,deepBuilds,renderedMapFrames,renderer:renderer?.fallback?'fallback':'webgl',lastRemoteFailure}),seek:t=>{if(!map)return null;audio.currentTime=Math.max(0,Math.min(map.duration,Number(t)||0));publishTransport(true);return transportPayload()},aperture:v=>{const i=typeof v==='string'?SCOPES.indexOf(v):Number(v);if(Number.isFinite(i)&&i>=0)setScope(i,false);return transportPayload()},exportBeatSaber:exportBeatSaberPack,parseSunoId,parseSunoPlaylistId,classifySourceAddress,resolveSourceAddress,openPin:()=>openPinSheet(null,audio.currentTime),glyph:()=>glyphDesc};
requestAnimationFrame(loop);
