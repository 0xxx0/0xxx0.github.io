import {audioGlyphDescriptor,audioGlyphSvg} from '../listen/audio-glyph.js';
import {buildPreviewMap} from '../listen/preview-map.js';
import {parseLocalAudioMeta,localDisplayName} from '../listen/media-meta.js';
import {groupLocalInputs,parseTextSidecar,parsePlaylistText} from '../listen/sidecar-text.js';
import {ATLAS_SCHEMA,MAX_ATLAS_ENTRIES,atlasPacket,appendPath,encodeAtlas,decodeAtlas,syntheticAtlas} from './atlas-core.js';
import {isDocumentFile,adaptDocumentFile,storeDocumentRuntime,loadDocumentRuntime,clearDocumentRuntime,makeReadfieldHandoff} from './document-source.js';

const $=s=>document.querySelector(s),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const STORE='fold-bloom.glyph-atlas.v01';
let packet=loadInitial(),focusId=packet.entries[0]?.id||null,realMode=packet.entries.some(x=>x.sourceKind!=='SYNTHETIC_DEMO');
let idle={on:false,timer:0,i:0},worker=null,deepQueue=[],deepBusy=false;

function loadInitial(){
  if(location.hash.startsWith('#a=')){
    try{return decodeAtlas(location.hash.slice(3))}catch(error){console.warn('atlas hash',error)}
  }
  try{
    const h=JSON.parse(sessionStorage.getItem('fold-bloom.atlas.handoff.v1')||'null');
    if(h?.entry){sessionStorage.removeItem('fold-bloom.atlas.handoff.v1');return atlasPacket({title:'SOURCE HANDOFF',entries:[h.entry],path:[]})}
  }catch(_){}
  try{
    const saved=JSON.parse(localStorage.getItem(STORE)||'null');
    if(saved?.schema===ATLAS_SCHEMA&&saved.entries?.length)return atlasPacket(saved);
  }catch(_){}
  return syntheticAtlas();
}
function persist(){
  if(!realMode)return;
  try{localStorage.setItem(STORE,JSON.stringify(currentPacket()))}catch(_){}
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
  const x=entryBy(focusId),glyph=$('#focusGlyph'),pathBtn=$('#pathBtn'),readBtn=$('#readBtn'),rebindBtn=$('#rebindBtn'),listenBtn=$('#listenBtn'),liveBtn=$('#liveBtn');
  if(!x){
    glyph.innerHTML='';$('#focusName').textContent='NO SOURCE';$('#focusMeta').textContent='—';$('#focusHash').textContent='—';$('#inside').innerHTML='<div class="insideEmpty">FOCUS A CELL TO SEE INSIDE</div>';
    pathBtn.disabled=true;readBtn.hidden=true;readBtn.disabled=true;rebindBtn.hidden=true;rebindBtn.disabled=true;listenBtn.hidden=false;liveBtn.hidden=false;listenBtn.disabled=true;liveBtn.disabled=true;$('#originBtn').disabled=true;$('#removeBtn').disabled=true;return
  }
  const isDoc=x.sourceKind==='LOCAL_DOCUMENT',runtime=isDoc?loadDocumentRuntime(x.sourceHash):null,doc=x.document||{};
  glyph.innerHTML=audioGlyphSvg(x.glyph,{size:280,padding:15});
  $('#focusKind').textContent=x.sourceKind==='SYNTHETIC_DEMO'?'SYNTHETIC DEMO':(isDoc?'DOCUMENT CELL':'SOURCE CELL');
  $('#focusName').textContent=x.name;
  $('#focusMeta').textContent=metaLine(x)+(x.artist?' · '+x.artist:'');
  $('#focusHash').textContent=x.sourceHash||'NO SOURCE HASH';
  const hash=(x.sourceHash||'').slice(0,16),text=x.textWitness,origin=x.origin,collection=x.collection,means=x.glyph?.means||{};
  const inside=isDoc?[
    ['IDENTITY',[x.sourceKind,x.format||null,hash?hash+'…':null].filter(Boolean).join(' · ')],
    ['STRUCTURE',[(doc.sections||0)+' SECTIONS',(doc.paragraphs||0)+' PARAGRAPHS',(doc.words||0)+' WORDS',doc.headingDepth?('H'+doc.headingDepth+' MAX'):null].filter(Boolean).join(' · ')],
    ['TEXT',text?(text.kind+' · '+text.alignment+' · '+text.chars+' CHARS'):'DOCUMENT'],
    ['SOURCE',runtime!=null?'BOUND THIS SESSION':'REBIND REQUIRED']
  ]:[
    ['IDENTITY',[x.sourceKind,x.format||null,hash?hash+'…':null].filter(Boolean).join(' · ')||'SYNTHETIC'],
    ['STRUCTURE',[x.duration?fmtDuration(x.duration):null,x.glyph?.bpm?Math.round(x.glyph.bpm)+' BPM':null,x.glyph?.key||null,(x.glyph?.sectionCount||1)+' SECTIONS'].filter(Boolean).join(' · ')],
    ['SIGNATURE','E '+Math.round((means.energy||0)*100)+' · Δ '+Math.round((means.flux||0)*100)+' · C '+Math.round((means.brightness||0)*100)],
    ['TEXT',text?(text.kind+' · '+text.alignment+' · '+text.chars+' CHARS'+(text.cues?' · '+text.cues+' CUES':'')):'NONE'],
    ['ORIGIN',origin?(origin.kind+' · '+(origin.id||shortAddress(origin.address)||'LINK')):'LOCAL / UNBOUND'],
    ['COLLECTION',collection?(collection.name+(collection.count!=null?' · '+collection.count+' ITEMS':'')):'NONE']
  ];
  $('#inside').innerHTML=inside.map(([k,v])=>'<div class="insideFacet"><b>'+esc(k)+'</b><span>'+esc(v||'—')+'</span></div>').join('');
  const i=packet.path.indexOf(x.id);pathBtn.disabled=false;pathBtn.textContent=i>=0?`REMOVE FROM PATH · ${i+1}`:'ADD TO PATH';
  readBtn.hidden=!isDoc;readBtn.disabled=!isDoc||runtime==null;rebindBtn.hidden=!isDoc;rebindBtn.disabled=!isDoc;
  listenBtn.hidden=isDoc;liveBtn.hidden=isDoc;listenBtn.disabled=isDoc;liveBtn.disabled=isDoc;
  $('#originBtn').disabled=!origin?.address;$('#removeBtn').disabled=x.sourceKind==='SYNTHETIC_DEMO';
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
  document.documentElement.dataset.glyphAtlas='ready';if(!document.documentElement.dataset.atlasIdle)document.documentElement.dataset.atlasIdle='off';
  document.documentElement.dataset.atlasSchema=ATLAS_SCHEMA;
}
function metaLine(x){
  if(x?.sourceKind==='LOCAL_DOCUMENT'){const d=x.document||{};return [(d.sections||0)+' SECT',(d.paragraphs||0)+' PARA',(d.words||0)+' WORDS'].join(' · ')}
  const bits=[];if(x.glyph?.bpm)bits.push(Math.round(x.glyph.bpm)+' BPM');if(x.glyph?.key)bits.push(x.glyph.key);bits.push((x.glyph?.sectionCount||1)+' SECT');if(x.collection?.name)bits.push('↗ '+x.collection.name);return bits.join(' · ');
}
function fmtDuration(t){t=Math.max(0,Number(t)||0);const h=Math.floor(t/3600),m=Math.floor((t%3600)/60),sec=Math.floor(t%60);return h?(h+':'+String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0')):(m+':'+String(sec).padStart(2,'0'))}
function shortAddress(v=''){try{const u=new URL(v);return u.hostname+u.pathname.slice(0,28)}catch(_){return String(v).slice(0,42)}}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function togglePath(){
  const x=entryBy(focusId);if(!x)return;
  stopIdle(false);packet.path=appendPath(packet.path,x.id,packet.entries);persist();render();
}
function clearPath(){stopIdle(false);packet.path=[];persist();render();$('#status').textContent='PATH CLEARED · SOURCES PRESERVED'}
function startIdle(){
  if(!packet.entries.length)return;if(idle.on){stopIdle(true);return}
  idle.on=true;idle.i=Math.max(0,packet.entries.findIndex(x=>x.id===focusId));document.body.classList.add('idle');document.documentElement.dataset.atlasIdle='on';$('#idleBtn').textContent='TAKE OVER';
  $('#status').textContent='IDLE · WITNESS ONLY · PATH UNCHANGED';
  const tick=()=>{if(!idle.on)return;idle.i=(idle.i+1)%packet.entries.length;focusEntry(packet.entries[idle.i].id,{fromIdle:true});idle.timer=setTimeout(tick,2800)};
  idle.timer=setTimeout(tick,1600);
}
function stopIdle(takeover=false){
  if(!idle.on)return;idle.on=false;clearTimeout(idle.timer);idle.timer=0;document.body.classList.remove('idle');document.documentElement.dataset.atlasIdle='off';$('#idleBtn').textContent='IDLE';
  if(takeover)$('#status').textContent='AWAKE · '+(entryBy(focusId)?.name||'SOURCE')+' · PATH '+packet.path.length;
}
function ensureWorker(){
  if(worker)return worker;
  worker=new Worker('../listen/analysis-worker.js',{type:'module'});
  worker.onmessage=e=>{
    if(e.data?.type==='result'){
      const job=deepQueue.shift(),x=job&&entryBy(job.id);
      if(x){const map=e.data.map;map.source=job.source;x.glyph=audioGlyphDescriptor(map,job.source);x.duration=map.duration||x.duration;x.deep=true;persist();render()}
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
async function textEvidence(files=[]){
  const out=[];
  for(const f of files){try{out.push(parseTextSidecar(await f.text(),f.name))}catch(error){console.warn('atlas sidecar',f.name,error)}}
  return out.filter(x=>x.text);
}
async function playlistEvidence(files=[]){
  const out=[];
  for(const f of files){try{out.push(parsePlaylistText(await f.text(),f.name))}catch(error){console.warn('atlas playlist',f.name,error)}}
  return out.filter(x=>x.entries?.length);
}
async function decodeFile(file,{sidecars=[],collection=null}={}){
  const bytes=await file.arrayBuffer(),hashP=hashBuffer(bytes.slice(0)),meta=parseLocalAudioMeta(bytes,file.name),texts=await textEvidence(sidecars),AC=globalThis.AudioContext||globalThis.webkitAudioContext;
  if(!AC)throw Error('Web Audio unavailable');
  const ctx=new AC();
  try{
    const decoded=await ctx.decodeAudioData(bytes.slice(0)),hash=await hashP,{pcm,sampleRate}=mixdown(decoded),text=texts[0]||null;
    const source={hash,name:localDisplayName(meta,file.name),sourceFileName:file.name,artist:meta.artist||'',title:meta.title||'',album:meta.album||'',lyrics:text?.text||meta.lyrics||'',lyricsAlignment:text?.alignment||meta.lyricsAlignment||null,sourceKind:'LOCAL_FILE',size:file.size,type:file.type||'audio',metadataSource:[meta.metadataSource,text?'SIDECAR_TEXT':null].filter(Boolean).join('+')||null};
    const map=buildPreviewMap(pcm,sampleRate,decoded.duration);map.source=source;
    const x={id:hash,name:source.name,artist:source.artist,album:source.album,format:file.type||file.name.split('.').pop()?.toUpperCase()||'',duration:decoded.duration,sourceHash:hash,sourceKind:'LOCAL_FILE',collection:collection?{kind:collection.kind||'PLAYLIST',name:collection.name||'PLAYLIST',address:collection.address||null,id:collection.id||null,count:collection.entries?.length||null}:null,textWitness:(text||source.lyrics)?{kind:text?.kind||(source.lyrics?'LYRICS':null),alignment:text?.alignment||source.lyricsAlignment||null,chars:String(source.lyrics||'').length,cues:text?.cueCount||0}:null,glyph:audioGlyphDescriptor(map,source),deep:false};
    queueDeep(hash,pcm,sampleRate,decoded.duration,source);
    return x;
  }finally{await ctx.close().catch(()=>{})}
}
async function loadFiles(files){
  const all=[...files],grouped=groupLocalInputs(all),playlist=(await playlistEvidence(grouped.playlists))[0]||null,xs=grouped.groups.slice(0,MAX_ATLAS_ENTRIES);
  const claimed=new Set(grouped.groups.flatMap(g=>g.sidecars||[])),standaloneDocs=all.filter(isDocumentFile).filter(f=>!claimed.has(f));
  if(!xs.length&&!standaloneDocs.length){$('#status').textContent=playlist?'PLAYLIST READ · ADD AUDIO OR DOCUMENTS TO MATERIALIZE CELLS':'NO DECODABLE SOURCE CELLS';return}
  stopIdle(false);$('#status').textContent='DECODING SOURCES';
  if(!realMode){packet=atlasPacket({title:playlist?.name||'MY GLYPH ATLAS',entries:[],path:[],note:''});realMode=true;focusId=null}
  let done=0,total=Math.min(xs.length+standaloneDocs.length,MAX_ATLAS_ENTRIES);
  for(const g of xs){
    if(packet.entries.length>=MAX_ATLAS_ENTRIES)break;
    try{
      const x=await decodeFile(g.audio,{sidecars:g.sidecars,collection:playlist});
      if(!packet.entries.some(e=>e.sourceHash===x.sourceHash)){packet.entries.push(x);focusId=x.id;persist()}
    }catch(error){console.warn(g.audio.name,error)}
    done++;$('#status').textContent=`DECODING · ${done}/${total}`;render();
  }
  for(const file of standaloneDocs){
    if(packet.entries.length>=MAX_ATLAS_ENTRIES)break;
    try{
      const adapted=await adaptDocumentFile(file);
      if(adapted?.materializable&&adapted.entry){
        storeDocumentRuntime(adapted.entry.sourceHash,adapted.runtime.text);
        if(!packet.entries.some(e=>e.sourceHash===adapted.entry.sourceHash))packet.entries.push(adapted.entry);
        focusId=adapted.entry.id;persist();
      }
    }catch(error){console.warn(file.name,error)}
    done++;$('#status').textContent=`DECODING · ${done}/${total}`;render();
  }
  $('#status').textContent=`ATLAS READY · ${packet.entries.length} SOURCE CELL${packet.entries.length===1?'':'S'} · CLICK A GLYPH TO SEE INSIDE`;
}
function currentPacket(){
  return atlasPacket({entries:packet.entries,path:packet.path,title:packet.title,note:$('#message').value.trim()});
}
async function share(){
  packet=currentPacket();persist();const code=encodeAtlas(packet),u=new URL(location.href);u.hash='a='+code;history.replaceState(null,'',u);
  try{
    if(navigator.share){await navigator.share({title:'FOLD//BLOOM · GLYPH ATLAS',text:'A source constellation / authored path. Source bytes are not included.',url:u.toString()});$('#status').textContent='SHARED · GLYPH PACKET ONLY';return}
  }catch(e){if(e.name==='AbortError')return}
  try{await navigator.clipboard.writeText(u.toString());$('#status').textContent='SHARE LINK COPIED · SOURCE BYTES NOT INCLUDED'}catch(_){$('#status').textContent='SHARE LINK READY IN ADDRESS BAR'}
}
function exportReturn(){
  packet=currentPacket();persist();const out={kind:'FOLD_BLOOM_GLYPH_ATLAS_RETURN',created:new Date().toISOString(),packet,law:{cell:'exact source hash',path:'human-authored order',view:'deterministic source glyph',return:'this packet',warning:'similar glyphs do not imply lineage'}};
  const blob=new Blob([JSON.stringify(out,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='fold-bloom-glyph-atlas-'+Date.now()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);$('#status').textContent='RETURN EXPORTED';
}
function removeFocus(){
  const x=entryBy(focusId);if(!x||x.sourceKind==='SYNTHETIC_DEMO')return;
  stopIdle(false);if(x.sourceKind==='LOCAL_DOCUMENT')clearDocumentRuntime(x.sourceHash);
  packet.entries=packet.entries.filter(e=>e.id!==x.id);packet.path=packet.path.filter(id=>id!==x.id);focusId=packet.entries[0]?.id||null;persist();render();$('#status').textContent='CELL REMOVED · SOURCE FILE WAS NEVER STORED';
}
function openSibling(route){
  const x=entryBy(focusId);if(!x||x.sourceKind==='LOCAL_DOCUMENT')return;
  try{sessionStorage.setItem('fold-bloom.source-witness.v1',JSON.stringify({sourceHash:x.sourceHash,name:x.name,glyph:x.glyph,format:x.format,origin:x.origin,collection:x.collection,textWitness:x.textWitness,from:'/fold-bloom/atlas/'}))}catch(_){}
  window.open(route,'_blank');
}
function readDocument(){
  const x=entryBy(focusId);if(!x||x.sourceKind!=='LOCAL_DOCUMENT')return;
  const text=loadDocumentRuntime(x.sourceHash);if(text==null){$('#status').textContent='SOURCE NOT BOUND · REBIND DOCUMENT';renderFocus();return}
  const handoff=makeReadfieldHandoff(x,text);
  try{sessionStorage.setItem('readfield.handoff.v1',JSON.stringify(handoff))}catch(_){$('#status').textContent='READ HANDOFF FAILED · REBIND / RETRY';return}
  const q=new URLSearchParams({handoff:'1',ap_scale:'SECTION',ap_addr:handoff.address||'section://0',return:'/fold-bloom/atlas/'});
  window.open('/docs/?'+q.toString(),'_blank');
}
async function rebindDocument(file){
  const x=entryBy(focusId);if(!x||x.sourceKind!=='LOCAL_DOCUMENT'||!file)return;
  try{
    const adapted=await adaptDocumentFile(file);
    if(!adapted?.materializable||!adapted.entry){$('#status').textContent='EMPTY DOCUMENT · SOURCE NOT REBOUND';return}
    if(adapted.entry.sourceHash!==x.sourceHash){$('#status').textContent='HASH MISMATCH · SOURCE NOT REBOUND';return}
    storeDocumentRuntime(x.sourceHash,adapted.runtime.text);renderFocus();$('#status').textContent='BOUND · READ AVAILABLE';
  }catch(error){console.warn('document rebind',error);$('#status').textContent='REBIND FAILED · SOURCE UNCHANGED'}
}
$('#loadBtn').onclick=()=>$('#files').click();$('#files').onchange=e=>loadFiles(e.target.files);
$('#pathBtn').onclick=togglePath;$('#clearPath').onclick=clearPath;$('#removeBtn').onclick=removeFocus;$('#idleBtn').onclick=startIdle;$('#shareBtn').onclick=share;$('#exportBtn').onclick=exportReturn;
$('#message').oninput=()=>{packet.note=$('#message').value;persist()};
$('#readBtn').onclick=readDocument;$('#rebindBtn').onclick=()=>$('#rebindFile').click();$('#rebindFile').onchange=async e=>{const f=e.target.files?.[0];e.target.value='';if(f)await rebindDocument(f)};
$('#listenBtn').onclick=()=>openSibling('../listen/');$('#liveBtn').onclick=()=>openSibling('../live/');$('#originBtn').onclick=()=>{const x=entryBy(focusId);if(x?.origin?.address)window.open(x.origin.address,'_blank','noopener')};
document.addEventListener('pointerdown',e=>{if(idle.on&&!e.target.closest('#idleBtn'))stopIdle(true)},{capture:true});
document.addEventListener('keydown',e=>{if(idle.on&&e.key!=='Tab')stopIdle(true)});
render();
setTimeout(()=>{if(!realMode&&!idle.on)startIdle()},1100);
window.FoldBloomAtlas={state:()=>({packet:currentPacket(),focusId,idle:idle.on,deepQueue:deepQueue.length}),loadFiles,readDocument,rebindDocument,startIdle,stopIdle};
