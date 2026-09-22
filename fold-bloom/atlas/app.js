import {audioGlyphDescriptor,audioGlyphSvg} from '../listen/audio-glyph.js';
import {buildPreviewMap} from '../listen/preview-map.js';
import {parseId3,id3DisplayName} from '../listen/id3.js';
import {ATLAS_SCHEMA,MAX_ATLAS_ENTRIES,atlasPacket,appendPath,encodeAtlas,decodeAtlas,syntheticAtlas} from './atlas-core.js';

const $=s=>document.querySelector(s),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let packet=loadInitial(),focusId=packet.entries[0]?.id||null,realMode=packet.entries.some(x=>x.sourceKind!=='SYNTHETIC_DEMO');
let idle={on:false,timer:0,i:0},worker=null,deepQueue=[],deepBusy=false;

function loadInitial(){
  if(location.hash.startsWith('#a=')){
    try{return decodeAtlas(location.hash.slice(3))}catch(error){console.warn('atlas hash',error)}
  }
  return syntheticAtlas();
}
function hashBuffer(buf){return crypto.subtle.digest('SHA-256',buf).then(h=>[...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join(''))}
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
function entryBy(id){return packet.entries.find(x=>x.id===id)||null}
function focusEntry(id,{fromIdle=false}={}){
  if(!entryBy(id))return;
  focusId=id;renderFocus();renderWall();
  if(fromIdle)$('#status').textContent='IDLE · WITNESS ONLY · '+(entryBy(id)?.name||'SOURCE');
}
function renderWall(){
  const wall=$('#wall');
  wall.innerHTML=packet.entries.map(x=>{
    const p=packet.path.indexOf(x.id),on=x.id===focusId?' on':'',inPath=p>=0?' path':'';
    return `<button class="glyphCard${on}${inPath}" data-id="${esc(x.id)}">${p>=0?`<span class="pathNo">${p+1}</span>`:''}<span class="mark">${audioGlyphSvg(x.glyph,{size:128,padding:9})}</span><b>${esc(x.name)}</b><small>${esc(metaLine(x))}</small></button>`;
  }).join('');
  wall.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>focusEntry(b.dataset.id));
}
function renderFocus(){
  const x=entryBy(focusId),glyph=$('#focusGlyph'),pathBtn=$('#pathBtn');
  if(!x){glyph.innerHTML='';$('#focusName').textContent='NO SOURCE';$('#focusMeta').textContent='—';$('#focusHash').textContent='—';pathBtn.disabled=true;return}
  glyph.innerHTML=audioGlyphSvg(x.glyph,{size:280,padding:15});
  $('#focusKind').textContent=x.sourceKind==='SYNTHETIC_DEMO'?'SYNTHETIC DEMO':'SOURCE CELL';
  $('#focusName').textContent=x.name;
  $('#focusMeta').textContent=metaLine(x)+(x.artist?' · '+x.artist:'');
  $('#focusHash').textContent=x.sourceHash||'NO SOURCE HASH';
  const i=packet.path.indexOf(x.id);pathBtn.disabled=false;pathBtn.textContent=i>=0?`REMOVE FROM PATH · ${i+1}`:'ADD TO PATH';
  $('#listenBtn').disabled=false;$('#liveBtn').disabled=false;
}
function renderPath(){
  $('#pathCount').textContent=`${packet.path.length} CELL${packet.path.length===1?'':'S'}`;
  const rail=$('#pathRail');
  if(!packet.path.length){rail.innerHTML='<span class="empty">SELECT GLYPH · ADD TO PATH</span>';return}
  rail.innerHTML=packet.path.map((id,i)=>{
    const x=entryBy(id);if(!x)return'';
    return `${i?'<span class="pathArrow">→</span>':''}<button class="pathCell" data-path-id="${esc(id)}" title="${esc(x.name)}"><i>${i+1}</i>${audioGlyphSvg(x.glyph,{size:50,padding:4})}</button>`;
  }).join('');
  rail.querySelectorAll('[data-path-id]').forEach(b=>b.onclick=()=>focusEntry(b.dataset.pathId));
}
function render(){
  document.body.classList.toggle('idle',idle.on);renderWall();renderFocus();renderPath();
  $('#message').value=packet.note||'';
  $('#idleBtn').textContent=idle.on?'TAKE OVER':'IDLE';
  document.documentElement.dataset.glyphAtlas='ready';
  document.documentElement.dataset.atlasSchema=ATLAS_SCHEMA;
}
function metaLine(x){
  const bits=[];if(x.glyph?.bpm)bits.push(Math.round(x.glyph.bpm)+' BPM');if(x.glyph?.key)bits.push(x.glyph.key);bits.push((x.glyph?.sectionCount||1)+' SECT');return bits.join(' · ');
}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function togglePath(){
  const x=entryBy(focusId);if(!x)return;
  stopIdle(false);packet.path=appendPath(packet.path,x.id,packet.entries);render();
}
function clearPath(){stopIdle(false);packet.path=[];render();$('#status').textContent='PATH CLEARED · SOURCES PRESERVED'}
function startIdle(){
  if(!packet.entries.length)return;if(idle.on){stopIdle(true);return}
  idle.on=true;idle.i=Math.max(0,packet.entries.findIndex(x=>x.id===focusId));document.body.classList.add('idle');$('#idleBtn').textContent='TAKE OVER';
  $('#status').textContent='IDLE · WITNESS ONLY · PATH UNCHANGED';
  const tick=()=>{if(!idle.on)return;idle.i=(idle.i+1)%packet.entries.length;focusEntry(packet.entries[idle.i].id,{fromIdle:true});idle.timer=setTimeout(tick,2800)};
  idle.timer=setTimeout(tick,1600);
}
function stopIdle(takeover=false){
  if(!idle.on)return;idle.on=false;clearTimeout(idle.timer);idle.timer=0;document.body.classList.remove('idle');$('#idleBtn').textContent='IDLE';
  if(takeover)$('#status').textContent='AWAKE · '+(entryBy(focusId)?.name||'SOURCE')+' · PATH '+packet.path.length;
}
function ensureWorker(){
  if(worker)return worker;
  worker=new Worker('../listen/analysis-worker.js',{type:'module'});
  worker.onmessage=e=>{
    if(e.data?.type==='result'){
      const job=deepQueue.shift(),x=job&&entryBy(job.id);
      if(x){const map=e.data.map;map.source=job.source;x.glyph=audioGlyphDescriptor(map,job.source);x.duration=map.duration||x.duration;x.deep=true;render()}
      deepBusy=false;runDeep();
    }else if(e.data?.type==='error'){console.warn('atlas deep',e.data.error);deepQueue.shift();deepBusy=false;runDeep()}
  };
  worker.onerror=e=>{console.warn('atlas worker',e);deepQueue.shift();deepBusy=false;runDeep()};
  return worker;
}
function queueDeep(id,pcm,sampleRate,duration,source){
  deepQueue.push({id,pcm:pcm.buffer,sampleRate,duration,source});runDeep();
}
function runDeep(){
  if(deepBusy||!deepQueue.length)return;
  deepBusy=true;const j=deepQueue[0];ensureWorker().postMessage({type:'analyze',pcm:j.pcm,sampleRate:j.sampleRate,duration:j.duration},[j.pcm]);
}
async function decodeFile(file){
  const bytes=await file.arrayBuffer(),hashP=hashBuffer(bytes.slice(0)),id3=parseId3(bytes),AC=globalThis.AudioContext||globalThis.webkitAudioContext;
  if(!AC)throw Error('Web Audio unavailable');
  const ctx=new AC();
  try{
    const decoded=await ctx.decodeAudioData(bytes.slice(0)),hash=await hashP,{pcm,sampleRate}=mixdown(decoded);
    const source={hash,name:id3DisplayName(id3,file.name),sourceFileName:file.name,artist:id3.artist||'',title:id3.title||'',album:id3.album||'',lyrics:id3.lyrics||'',sourceKind:'LOCAL_FILE',size:file.size,type:file.type||'audio'};
    const map=buildPreviewMap(pcm,sampleRate,decoded.duration);map.source=source;
    const x={id:hash,name:source.name,artist:source.artist,duration:decoded.duration,sourceHash:hash,sourceKind:'LOCAL_FILE',glyph:audioGlyphDescriptor(map,source),deep:false};
    queueDeep(hash,pcm,sampleRate,decoded.duration,source);
    return x;
  }finally{await ctx.close().catch(()=>{})}
}
async function loadFiles(files){
  const xs=[...files].slice(0,MAX_ATLAS_ENTRIES);
  if(!xs.length)return;
  stopIdle(false);$('#status').textContent='DECODING · 0/'+xs.length;
  if(!realMode){packet=atlasPacket({title:'MY GLYPH ATLAS',entries:[],path:[],note:''});realMode=true;focusId=null}
  let done=0;
  for(const file of xs){
    if(packet.entries.length>=MAX_ATLAS_ENTRIES)break;
    try{
      const x=await decodeFile(file);
      if(!packet.entries.some(e=>e.sourceHash===x.sourceHash)){packet.entries.push(x);focusId=x.id}
    }catch(error){console.warn(file.name,error)}
    done++;$('#status').textContent=`DECODING · ${done}/${xs.length}`;render();
  }
  $('#status').textContent=`ATLAS READY · ${packet.entries.length} SOURCE CELL${packet.entries.length===1?'':'S'} · DEEP MAPS REFINE IN PLACE`;
}
function currentPacket(){
  return atlasPacket({entries:packet.entries,path:packet.path,title:packet.title,note:$('#message').value.trim()});
}
async function share(){
  packet=currentPacket();const code=encodeAtlas(packet),u=new URL(location.href);u.hash='a='+code;history.replaceState(null,'',u);
  try{
    if(navigator.share){await navigator.share({title:'FOLD//BLOOM · GLYPH ATLAS',text:'A source constellation / authored path. Audio bytes are not included.',url:u.toString()});$('#status').textContent='SHARED · GLYPH PACKET ONLY';return}
  }catch(e){if(e.name==='AbortError')return}
  try{await navigator.clipboard.writeText(u.toString());$('#status').textContent='SHARE LINK COPIED · AUDIO NOT INCLUDED'}catch(_){$('#status').textContent='SHARE LINK READY IN ADDRESS BAR'}
}
function exportReturn(){
  packet=currentPacket();const out={kind:'FOLD_BLOOM_GLYPH_ATLAS_RETURN',created:new Date().toISOString(),packet,law:{cell:'exact source hash',path:'human-authored order',view:'deterministic audio glyph',return:'this packet',warning:'similar glyphs do not imply lineage'}};
  const blob=new Blob([JSON.stringify(out,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='fold-bloom-glyph-atlas-'+Date.now()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);$('#status').textContent='RETURN EXPORTED';
}
function openSibling(route){
  const x=entryBy(focusId);if(x)try{sessionStorage.setItem('fold-bloom.source-witness.v1',JSON.stringify({sourceHash:x.sourceHash,name:x.name,glyph:x.glyph,from:'/fold-bloom/atlas/'}))}catch(_){}
  window.open(route,'_blank');
}

$('#loadBtn').onclick=()=>$('#files').click();$('#files').onchange=e=>loadFiles(e.target.files);
$('#pathBtn').onclick=togglePath;$('#clearPath').onclick=clearPath;$('#idleBtn').onclick=startIdle;$('#shareBtn').onclick=share;$('#exportBtn').onclick=exportReturn;
$('#message').oninput=()=>{packet.note=$('#message').value};
$('#listenBtn').onclick=()=>openSibling('../listen/');$('#liveBtn').onclick=()=>openSibling('../live/');
document.addEventListener('pointerdown',e=>{if(idle.on&&!e.target.closest('#idleBtn'))stopIdle(true)},{capture:true});
document.addEventListener('keydown',e=>{if(idle.on&&e.key!=='Tab')stopIdle(true)});
render();
setTimeout(()=>{if(!realMode&&!idle.on)startIdle()},1100);
window.FoldBloomAtlas={state:()=>({packet:currentPacket(),focusId,idle:idle.on,deepQueue:deepQueue.length}),loadFiles,startIdle,stopIdle};
