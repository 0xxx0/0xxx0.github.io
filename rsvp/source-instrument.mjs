// The same READFIELD source, in two lawful dimensions:
// a real text passage (exact bytes and UTF-16 character address), and
// the existing WRIST ring (source progress / ring-run questions).
// A paired LISTEN descriptor adds an actual measured audio energy contour
// and the original LISTEN glyph. It never invents audio for plain text.
import {audioGlyphRepresentation} from '../fold-bloom/listen/audio-glyph.js';

const $=id=>document.getElementById(id),ap=$('wristAperture');
const FULL_LIMIT=180000,WINDOW_RADIUS=16000,SAMPLES=72,NS='http://www.w3.org/2000/svg';
let raw='',hash='',textNode=null,start=0,end=0,region='',lastFollow=0,userScrollUntil=0,sourceMode='TEXT STRUCTURE';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
const nums=x=>Array.isArray(x)&&x.length>=24&&x.length<=256&&x.every(v=>Number.isFinite(v)&&v>=0&&v<=1);
function textContour(input){
 // Actual punctuation / paragraph density per exact source interval.
 // It is NOT audio or a simulated music waveform.
 const counts=Array.from({length:SAMPLES},()=>({marks:0,chars:0}));
 for(let i=0;i<input.length;i++){
  const cell=counts[Math.min(SAMPLES-1,Math.floor(i*SAMPLES/input.length))];
  cell.chars++;
  if(/[.!?;:,\n\r]/.test(input[i]))cell.marks+=input[i]==='\n'?3:1;
 }
 const peak=Math.max(1,...counts.map(c=>c.marks));
 return counts.map(c=>clamp(.12+.88*c.marks/peak,0,1));
}
function companion(sourceHash){
 let packet;
 try{packet=JSON.parse(sessionStorage.getItem('rsvp.listen.companion.v1')||'null')}catch{return null}
 if(!packet||packet.schema!=='rsvp.listen.source-contour/v1'||packet.textHash!==sourceHash||
   !/^[a-f0-9]{64}$/.test(String(packet.audioHash||''))||!nums(packet.energy))return null;
 const original=audioGlyphRepresentation(packet.glyph,packet.audioHash);
 return original?{...packet,original}:null;
}
function drawContour(samples,audio=false){
 const host=$('sourceContour');host.replaceChildren();host.dataset.kind=audio?'audio-energy':'text-structure';
 const v=Array.from({length:SAMPLES},(_,i)=>samples[Math.min(samples.length-1,Math.floor(i*samples.length/SAMPLES))]||0);
 for(let i=0;i<SAMPLES;i++){
  const angle=-Math.PI/2+Math.PI*2*i/SAMPLES,root=39.5,tip=root+4+clamp(v[i],0,1)*8;
  const x=r=>60+Math.cos(angle)*r,y=r=>60+Math.sin(angle)*r;
  const line=document.createElementNS(NS,'line');
  for(const [k,val] of Object.entries({x1:x(root),y1:y(root),x2:x(tip),y2:y(tip)}))line.setAttribute(k,val.toFixed(2));
  line.setAttribute('class',audio?'audio':'text');host.append(line);
 }
}
function renderIdentity(){
 const paired=companion(hash),tag=$('signalLabel'),glyph=$('listenGlyph');
 if(paired){
  sourceMode='LISTEN ENERGY';drawContour(paired.energy,true);
  glyph.innerHTML=paired.original.svg;glyph.hidden=false;
  glyph.title='Native LISTEN source glyph · '+String(paired.name||'audio').slice(0,80);
  tag.textContent='LISTEN · MEASURED ENERGY'+(paired.stage?' · '+paired.stage:'');
  tag.title='Measured frame energy from LISTEN, not a PCM waveform; audio remains LISTEN-owned';
 }else{
  sourceMode='TEXT STRUCTURE';drawContour(textContour(raw),false);
  glyph.replaceChildren();glyph.hidden=true;
  tag.textContent='TEXT · STRUCTURE';
  tag.title='Punctuation / paragraph structure from source characters. No audio evidence is available.';
 }
 document.documentElement.dataset.rsvpSignal=paired?'listen-energy':'text-structure';
}
function renderSource(force=false,position=0){
 if(!raw)return;
 const long=raw.length>FULL_LIMIT;
 const offset=long?clamp(position-WINDOW_RADIUS,0,Math.max(0,raw.length-WINDOW_RADIUS*2)):0;
 const finish=long?Math.min(raw.length,offset+WINDOW_RADIUS*2):raw.length;
 const key=offset+':'+finish+':'+hash;
 if(key===region&&!force)return;
 region=key;start=offset;end=finish;
 const host=$('fullSource');
 host.replaceChildren();
 textNode=document.createTextNode(raw.slice(start,end));
 host.append(textNode);
 $('sourceExtent').textContent=long?'EXACT WINDOW '+(start+1)+'–'+end+' / '+raw.length+' · FULL IN READFIELD':
  'FULL SOURCE · '+raw.length+' CHARS';
 document.documentElement.dataset.rsvpText=long?'window':'full';
}
function paintFocus(){
 const source=window.RSVPReader?.source(),snap=window.RSVPReader?.snapshot();
 if(!source?.raw||!snap||source.hash!==hash)return;
 const char=clamp(snap.char_index,0,raw.length-1);
 if(char<start||char>=end)renderSource(false,char);
 const span=snap.span||{start:char,end:char+1};
 const a=clamp(span.start-start,0,textNode.length),b=clamp(span.end-start,a+1,textNode.length);
 const r=document.createRange();r.setStart(textNode,a);r.setEnd(textNode,b);
 if(globalThis.CSS?.highlights&&globalThis.Highlight){
  CSS.highlights.set('rsvp-exact-focus',new Highlight(r));
 }
 // Only scroll to the word when it escapes the visible reading pane, and
 // yield to deliberate human scrolling. No jump every RSVP clock tick.
 const now=performance.now();
 if(now-userScrollUntil<0||now-lastFollow<250)return;
 lastFollow=now;
 const viewport=$('fullSource'),box=viewport.getBoundingClientRect(),focus=r.getBoundingClientRect();
 if(!focus.height||!box.height)return;
 if(focus.top<box.top+18||focus.bottom>box.bottom-18){
  viewport.scrollTop+=focus.top-box.top-box.height*.38;
 }
 $('readingField').setAttribute('data-playing',snap.playing?'1':'0');
}
function sync(){
 const s=window.RSVPReader?.source();
 if(!s?.raw)return;
 if(s.hash!==hash||s.raw!==raw){
  raw=s.raw;hash=s.hash;region='';
  renderSource(true,window.RSVPReader.snapshot()?.char_index||0);
  renderIdentity();
 }
 paintFocus();
}
function seekTextClick(e){
 if(!raw||!textNode||e.target.closest('a,button'))return;
 const doc=document,pos=doc.caretPositionFromPoint?.(e.clientX,e.clientY)||
  doc.caretRangeFromPoint?.(e.clientX,e.clientY);
 if(!pos)return;
 const node=pos.offsetNode||pos.startContainer,offset=pos.offset??pos.startOffset;
 if(node!==textNode)return;
 const reader=window.RSVPReader,absolute=clamp(start+offset,0,raw.length-1);
 reader?.seekChar?.(absolute);
}
$('fullSource').addEventListener('click',seekTextClick);
$('fullSource').addEventListener('wheel',()=>{userScrollUntil=performance.now()+3000},{passive:true});
$('fullSource').addEventListener('touchmove',()=>{userScrollUntil=performance.now()+3000},{passive:true});
$('wristAperture').addEventListener('aperture-focus',sync);
document.addEventListener('rsvp:source-loaded',sync);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});
sync();
globalThis.RSVPSourceInstrument=Object.freeze({sync,mode:()=>sourceMode,sourceLength:()=>raw.length,
 currentWindow:()=>({start,end}),paired:()=>sourceMode==='LISTEN ENERGY'});
