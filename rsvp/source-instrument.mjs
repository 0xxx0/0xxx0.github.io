// The same READFIELD source, in two lawful dimensions:
// a real text passage (exact bytes and UTF-16 character address), and
// the existing WRIST ring (source progress / ring-run questions).
// A paired LISTEN descriptor adds an actual measured audio energy contour
// and the original LISTEN glyph. It never invents audio for plain text.
import {audioGlyphRepresentation} from '../fold-bloom/listen/audio-glyph.js';
import {proposedDaylineHandoff} from './dayline-handoff.mjs';

const $=id=>document.getElementById(id),ap=$('wristAperture');
const FULL_LIMIT=180000,WINDOW_RADIUS=16000,SAMPLES=72,NS='http://www.w3.org/2000/svg';
let raw='',hash='',textNode=null,start=0,end=0,region='',lastFollow=0,userScrollUntil=0,sourceMode='TEXT STRUCTURE';
let scaleDrawKey='',scaleCaption='TEXT · STRUCTURE',scaleIndex=-1;
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
  scaleCaption='LISTEN · ENERGY'+(paired.stage?' · '+paired.stage:'');tag.textContent=scaleCaption;
  tag.title='Measured frame energy from LISTEN, not a PCM waveform; audio remains LISTEN-owned';
 }else{
  sourceMode='TEXT STRUCTURE';drawContour(textContour(raw),false);
  glyph.replaceChildren();glyph.hidden=true;
  scaleCaption='TEXT · STRUCTURE';tag.textContent=scaleCaption;
  tag.title='Punctuation / paragraph structure from source characters. No audio evidence is available.';
 }
 document.documentElement.dataset.rsvpSignal=paired?'listen-energy':'text-structure';
}
// AXIAL / Scale Lens contract: angle = exact source character; radius =
// native FieldAperture scale. No new cursor, tokenizer or vocabulary.
function nativeScales(){return ap.A?.scales||[]}
function paintScale(){
 const levels=nativeScales(),snapshot=window.RSVPReader?.snapshot?.();
 const host=$('apertureTicks');if(!host||!levels.length||!snapshot)return;
 const key=levels.map(x=>x.id).join('|');
 if(key!==scaleDrawKey){
  scaleDrawKey=key;host.replaceChildren();
  const circle=document.createElementNS(NS,'circle');
  for(const [k,v] of Object.entries({cx:60,cy:60,r:24.5,class:'scope-track'}))circle.setAttribute(k,String(v));
  host.append(circle);
  for(let i=0;i<levels.length;i++){
   const angle=-Math.PI/2+2*Math.PI*(i+.5)/levels.length;
   const x=r=>(60+Math.cos(angle)*r).toFixed(3),y=r=>(60+Math.sin(angle)*r).toFixed(3);
   const line=document.createElementNS(NS,'line');
   for(const [k,v] of Object.entries({x1:x(19),y1:y(19),x2:x(29),y2:y(29),
    class:'scope-tick','data-scope-index':i}))line.setAttribute(k,String(v));
   const label=document.createElementNS(NS,'title');label.textContent=levels[i].label||levels[i].id;line.append(label);
   host.append(line);
  }
 }
 const selected=levels.findIndex(x=>x.id===snapshot.scale);
 if(scaleIndex!==selected){
  scaleIndex=selected;
  for(const line of host.querySelectorAll('.scope-tick'))line.classList.toggle('active',Number(line.dataset.scopeIndex)===selected);
 }
 $('signalLabel').textContent=scaleCaption+' · '+(snapshot.scale_label||snapshot.scale||'WORD').toUpperCase();
 $('signalLabel').title='INNER RING / APERTURE: scale. OUTER RING: source position. TAP or DRAG. [ ] changes scale.';
 $('stage').setAttribute('aria-label','Center: read or pause. Outer ring: seek source address. Inner ring: change native aperture scale. During a recall gate choose a word.');
}
function pickScale(e){
 if(!raw||innerWidth<=240)return false;
 const svg=document.querySelector('.orbit'),rect=svg?.getBoundingClientRect();
 if(!rect?.width||!rect.height)return false;
 const x=(e.clientX-rect.left)/rect.width*120,y=(e.clientY-rect.top)/rect.height*120;
 const levels=nativeScales(),slot=window.RingView?.sectorAt?.(x,y,60,60,18,28,levels.length);
 if(!Number.isInteger(slot)||slot<0)return false;
 return window.RSVPReader?.setScale?.(slot)===true;
}
function turnScale(delta){
 const levels=nativeScales();if(!levels.length)return false;
 const current=levels.findIndex(x=>x.id===window.RSVPReader?.snapshot?.()?.scale);
 const next=Math.max(0,Math.min(levels.length-1,current+delta));
 return window.RSVPReader?.setScale?.(next)===true;
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
 if(raw&&boundMarks.length)paintInlineHighlights();
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
 paintVisited();
}

// One source-owned trail; the same NOTE/QUESTION/APPLIED records are the
// existing READFIELD review schema. No RSVP mark database or second position.
const bookmarkNote='BOOKMARK',svgNS='http://www.w3.org/2000/svg';
let boundMarks=[],allMarks=[],trailState='EMPTY',furthest=0,selectedRange=null,
    editing=null,shelfOpen=false,trailChecked=-Infinity,lastMarkPick=null;
const validHash=h=>/^sha256:[a-f0-9]{64}$/.test(String(h||''));
const sourceKey=()=>window.RSVPReader?.key?.()||'';
function noteBound(m){
 return !!raw&&validHash(hash)&&!!globalThis.ReadfieldReviewModel?.bound?.(m,{raw,revision:hash});
}
function currentRange(){
 const s=window.RSVPReader?.snapshot?.();
 if(!s||!raw)return null;
 let start=clamp(Number(s.span?.start??s.char_index)||0,0,raw.length-1);
 let end=clamp(Number(s.span?.end??(start+1))||start+1,start+1,raw.length);
 if(end-start>12000)end=Math.min(start+1,raw.length);
 return{start,end,quote:raw.slice(start,end),hash};
}
function selectedOrCurrent(){
 if(selectedRange?.hash===hash&&selectedRange.start>=0&&
   selectedRange.end<=raw.length&&selectedRange.end>selectedRange.start&&
   raw.slice(selectedRange.start,selectedRange.end)===selectedRange.quote)return selectedRange;
 return currentRange();
}
function captureSelected(){
 if(!raw||!textNode)return;
 const sel=window.getSelection();
 if(!sel||sel.isCollapsed||sel.rangeCount<1)return;
 const range=sel.getRangeAt(0);
 if(range.startContainer!==textNode||range.endContainer!==textNode)return;
 const from=start+range.startOffset,to=start+range.endOffset;
 if(from>=0&&to>from&&to-from<=12000&&raw.slice(from,to)===sel.toString()){
  selectedRange={start:from,end:to,quote:raw.slice(from,to),hash};
 }
}
function showStatus(message){
 const out=$('editStatus');
 if(out)out.textContent=String(message||'');
}
function markProgress(m){return clamp(Number(m.charIndex)/Math.max(1,raw.length),0,1)}
function point(p,r){
 const a=-Math.PI/2+clamp(p,0,1)*2*Math.PI;
 return{x:60+Math.cos(a)*r,y:60+Math.sin(a)*r};
}
function elementSvg(kind,attrs){
 const n=document.createElementNS(svgNS,kind);
 Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,String(v)));
 return n;
}
function drawRingWitnesses(){
 const host=$('sourcePins');if(!host)return;
 host.replaceChildren();host.setAttribute('data-bound-count',String(boundMarks.length));
 if(!raw)return;
 const whole=2*Math.PI*31,p=clamp(furthest,0,.999999);
 host.append(elementSvg('circle',{class:'visited',cx:60,cy:60,r:31,
  'stroke-dasharray':whole.toFixed(4),
  'stroke-dashoffset':(whole*(1-p)).toFixed(4),
  transform:'rotate(-90 60 60)'}));
 for(const m of boundMarks){
  const p=point(markProgress(m),34),kind=m.kind;
  let n;
  if(kind==='QUESTION')n=elementSvg('circle',{
   class:'question',cx:p.x.toFixed(3),cy:p.y.toFixed(3),r:2.6});
  else if(kind==='APPLIED')n=elementSvg('rect',{
   class:'applied',x:(p.x-2.1).toFixed(3),y:(p.y-2.1).toFixed(3),width:4.2,height:4.2});
  else{
   const a=point(markProgress(m),31),b=point(markProgress(m),38);
   n=elementSvg('path',{class:'note',d:'M'+a.x+' '+a.y+' L'+b.x+' '+b.y});
  }
  host.append(n);
 }
}
function paintInlineHighlights(){
 if(!raw||!textNode||!globalThis.CSS?.highlights||!globalThis.Highlight)return;
 const kinds={NOTE:[],QUESTION:[],APPLIED:[]};
 for(const m of boundMarks){
  const a=Math.max(start,m.charIndex),b=Math.min(end,m.endIndex);
  if(b<=a)continue;
  const r=document.createRange();
  r.setStart(textNode,a-start);r.setEnd(textNode,b-start);
  kinds[m.kind]?.push(r);
 }
 for(const [kind,id] of Object.entries({NOTE:'rsvp-saved-notes',QUESTION:'rsvp-open-questions',APPLIED:'rsvp-applied'}))
  CSS.highlights.set(id,new Highlight(...kinds[kind]));
}
function paintRail(){
 const host=$('markRail');host.replaceChildren();
 $('markCount').textContent=String(boundMarks.length);
 $('visitFill').style.width=(100*clamp(furthest,0,1)).toFixed(3)+'%';
 for(const m of boundMarks){
  const button=document.createElement('button');button.type='button';
  button.style.left=(markProgress(m)*100).toFixed(4)+'%';
  button.dataset.kind=m.kind;
  button.title=m.kind+' · '+m.charIndex+' · '+m.note.slice(0,90);
  button.setAttribute('aria-label','Go to '+m.kind.toLowerCase()+' at character '+m.charIndex);
  button.onclick=e=>{e.stopPropagation();jumpMark(m.id,true)};
  host.append(button);
 }
 drawRingWitnesses();
 paintInlineHighlights();
}
function refreshMarks(){
 const key=sourceKey();
 const x=key?FieldSourceTrail.read(key):null;
 trailState=x?.storageState||'NO_IDENTITY';
 allMarks=Array.isArray(x?.marks)?x.marks:[];
 boundMarks=allMarks.filter(noteBound).sort((a,b)=>a.charIndex-b.charIndex||a.id.localeCompare(b.id));
 furthest=x?.furthestRevision===hash?Number(x?.furthest)||0:0;
 paintRail();renderShelf();
 $('readingField').dataset.trailState=trailState;
}
function paintVisited(){
 if(!raw||!sourceKey())return;
 const now=performance.now();
 if(now-trailChecked<1600)return;trailChecked=now;
 const x=FieldSourceTrail.read(sourceKey());
 if(x.storageState!=='READY'&&x.storageState!=='EMPTY')return;
 const revisionBound=x.furthestRevision===hash?x.furthest:0;
 if(Math.abs(furthest-revisionBound)>.001){
  furthest=revisionBound;
  $('visitFill').style.width=(100*clamp(furthest,0,1)).toFixed(3)+'%';
  drawRingWitnesses();
 }
}
function saveMarks(marks){
 const key=sourceKey();
 if(!key)return showStatus('This source has no persistent identity.'),false;
 const prior=FieldSourceTrail.read(key);
 if(!['EMPTY','READY'].includes(prior.storageState))
  return showStatus('Cannot save: '+prior.storageState+'. Your draft stays visible.'),false;
 if(marks.length>64)return showStatus('64-mark limit. Export or remove an older mark in READFIELD.'),false;
 const x=FieldSourceTrail.setMarks(key,marks);
 if(x.storageState!=='READY')
  return showStatus('Unable to write local source trail. Draft retained.'),false;
 refreshMarks();return true;
}
function markAt(range,{note=bookmarkNote,kind='NOTE',id=null,resolved=false}={}){
 if(!range||range.hash!==hash||raw.slice(range.start,range.end)!==range.quote)return null;
 const snap=window.RSVPReader?.snapshot()||{};
 return{id:id||'review:'+hash+':'+range.start+':'+range.end,
  charIndex:range.start,endIndex:range.end,quote:range.quote,revision:hash,
  progress:range.start/Math.max(1,raw.length),address:snap.address||'',
  scale:snap.scale||'WORD',index:Number.isInteger(snap.index)?snap.index:null,
  wpm:snap.wpm,kind,note,resolved,label:range.quote.slice(0,180),
  at:new Date().toISOString(),via:'READFIELD_WRIST'};
}
function pinHere(){
 if(!raw)return;
 captureSelected();
 const range=selectedOrCurrent();if(!range)return;
 const id='pin:'+hash+':'+range.start+':'+range.end;
 const previous=allMarks.find(m=>m.id===id&&noteBound(m));
 const marks=allMarks.filter(m=>m.id!==id);
 if(!previous)marks.push(markAt(range,{id}));
 if(saveMarks(marks)){
  selectedRange=null;
  $('pinHere').title=previous?'Bookmark removed':'Source position bookmarked';
 }
}
function makeEditor(mark=null){
 if(!raw)return;
 ap.stop?.();
 if(!mark)captureSelected();
 const range=mark?{start:mark.charIndex,end:mark.endIndex,quote:mark.quote,hash}:selectedOrCurrent();
 if(!range||range.hash!==hash||raw.slice(range.start,range.end)!==range.quote)
  return showStatus('Selection belongs to a different revision.');
 const draft=mark?{...mark}:markAt(range,{note:''});
 editing=draft;$('readingEdit').hidden=false;
 $('editQuote').textContent=(mark?'EDIT ':'SOURCE ')+range.start+':'+range.end+' · '+range.quote.slice(0,125);
 $('editText').value=draft.note===bookmarkNote?'':draft.note;
 $('editKind').value=draft.kind;$('editResolved').checked=!!draft.resolved;
 $('editResolved').closest('label').hidden=draft.kind!=='QUESTION';
 $('editRemove').hidden=!mark;
 showStatus('Exact SHA-bound passage; original source is not edited.');
 $('editText').focus({preventScroll:true});
}
function closeEditor(){
 editing=null;$('readingEdit').hidden=true;showStatus('');
}
function saveEditor(){
 if(!editing)return;
 const note=$('editText').value.trim();
 if(!note)return showStatus('Write a note, question or application to save.');
 if(note.length>500)return showStatus('500 character limit.');
 const kind=$('editKind').value;
 if(!['NOTE','QUESTION','APPLIED'].includes(kind))return;
 const m={...editing,note,kind,resolved:kind==='QUESTION'&&$('editResolved').checked};
 if(!noteBound(m))return showStatus('Source changed: do not attach this note to other bytes.');
 const marks=allMarks.filter(x=>x.id!==m.id);
 marks.push(m);
 if(saveMarks(marks)){
  selectedRange=null;closeEditor();if(shelfOpen)renderShelf();
 }
}
function removeEditor(){
 if(!editing)return;
 const id=editing.id;
 if(saveMarks(allMarks.filter(m=>m.id!==id)))closeEditor();
}
function copyRef(){
 if(!editing||!noteBound(editing))return showStatus('Current quote is not source-bound.');
 const m=editing,s=window.RSVPReader?.source();
 const path=s?.sourceAddress||'',identity=hash+' · char '+m.charIndex+':'+m.endIndex;
 let href='';
 if(path&&path.startsWith('/')){
  const u=new URL('/docs/',location.origin);
  u.searchParams.set('src',path);u.searchParams.set('ap_char',String(m.charIndex));
  u.searchParams.set('ap_scale','SENT');href=u.href;
 }
 const ref=(href?'['+(s.label||'Source')+' · '+m.charIndex+']('+href+')':'Source: '+(s.label||'local / unshared'))+
  '\nRevision: '+identity+'\n> '+m.quote.replace(/\n/g,'\n> ');
 if(!navigator.clipboard?.writeText)return showStatus('Clipboard unavailable; use READFIELD export.');
 navigator.clipboard.writeText(ref).then(()=>showStatus('Exact source reference copied.'),()=>showStatus('Clipboard blocked; use READFIELD export.'));
}
function jumpMark(id,edit=false){
 const m=boundMarks.find(x=>x.id===id);
 if(!m||!noteBound(m))return false;
 ap.stop?.();window.RSVPReader?.seekChar(m.charIndex);
 $('marksShelf').hidden=true;$('fullSource').hidden=false;shelfOpen=false;
 $('showMarks').setAttribute('aria-pressed','false');
 if(edit)makeEditor(m);return true;
}
function renderShelf(){
 const list=$('marksList');list.replaceChildren();
 $('marksStatus').textContent=boundMarks.length+' source-bound marks · '+
   (allMarks.length-boundMarks.length)+' retained but unbound · '+trailState+
   ' · FURTHEST VISITED '+Math.round(furthest*100)+'% (not completion)';
 for(const m of allMarks.slice().sort((a,b)=>(a.charIndex??0)-(b.charIndex??0))){
  const valid=noteBound(m);
  const li=document.createElement('li');if(!valid)li.className='parked';
  const jump=document.createElement('button');jump.type='button';
  jump.textContent=(valid?m.kind:'UNBOUND')+' · '+(m.charIndex??'?')+' · '+String(m.quote||m.label||'').slice(0,110);
  jump.disabled=!valid;jump.title=valid?'Go to exact passage':'Source quote or revision differs; parked, not silently moved';
  jump.onclick=()=>jumpMark(m.id);
  const edit=document.createElement('button');edit.type='button';
  edit.textContent=valid?'EDIT':'PARKED';edit.disabled=!valid;
  edit.onclick=()=>{if(jumpMark(m.id))makeEditor(m)};
  li.append(jump,edit);list.append(li);
 }
}
function showShelf(){
 if(!raw)return;
 shelfOpen=!shelfOpen;
 if(shelfOpen){ap.stop?.();closeEditor();refreshMarks();}
 $('marksShelf').hidden=!shelfOpen;$('fullSource').hidden=shelfOpen;
 $('showMarks').setAttribute('aria-pressed',String(shelfOpen));
 if(!shelfOpen)paintFocus();
}
function pickRing(e){
 if(!raw||!boundMarks.length)return false;
 const rect=document.querySelector('.orbit')?.getBoundingClientRect();if(!rect?.width)return false;
 const x=(e.clientX-rect.left-rect.width/2)/(rect.width/2),
  y=(e.clientY-rect.top-rect.height/2)/(rect.height/2),r=Math.hypot(x,y);
 // Authored objects are in the INNER band. The outer band remains
 // native positional scrubbing; center remains playback and recall gates.
 if(r<.48||r>.70)return false;
 const p=(Math.atan2(y,x)+Math.PI/2+Math.PI*2)%(Math.PI*2)/(Math.PI*2);
 const candidates=boundMarks.map(m=>({m,d:Math.min(Math.abs(markProgress(m)-p),
  1-Math.abs(markProgress(m)-p))})).filter(x=>x.d<=.033)
  .sort((a,b)=>a.d-b.d||a.m.charIndex-b.m.charIndex);
 if(!candidates.length)return false;
 const now=performance.now(),prior=lastMarkPick&&now-lastMarkPick.at<1200?
  candidates.findIndex(x=>x.m.id===lastMarkPick.id):-1;
 const selected=candidates[(prior+1)%candidates.length].m;
 lastMarkPick={id:selected.id,at:now};return jumpMark(selected.id,true);
}

function sync(){
 const s=window.RSVPReader?.source();
 if(!s?.raw)return;
 if(s.hash!==hash||s.raw!==raw){
  raw=s.raw;hash=s.hash;region='';
  renderSource(true,window.RSVPReader.snapshot()?.char_index||0);
  renderIdentity();selectedRange=null;closeEditor();shelfOpen=false;
  $('marksShelf').hidden=true;$('fullSource').hidden=false;refreshMarks();
 }
 paintFocus();paintScale();
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
$('fullSource').addEventListener('pointerup',captureSelected);
$('fullSource').addEventListener('keyup',captureSelected);
$('pinHere').onclick=pinHere;
$('noteHere').onclick=()=>makeEditor();
$('showMarks').onclick=showShelf;
$('editSave').onclick=saveEditor;
$('editRemove').onclick=removeEditor;
$('editCancel').onclick=closeEditor;
$('editReference').onclick=copyRef;
$('editKind').onchange=()=>{$('editResolved').closest('label').hidden=$('editKind').value!=='QUESTION'};
window.addEventListener('storage',e=>{
 if(e.key&&e.key===FieldSourceTrail.storageKey(sourceKey()))refreshMarks();
});

$('fullSource').addEventListener('wheel',()=>{userScrollUntil=performance.now()+3000},{passive:true});
$('fullSource').addEventListener('touchmove',()=>{userScrollUntil=performance.now()+3000},{passive:true});
$('wristAperture').addEventListener('aperture-focus',sync);
document.addEventListener('rsvp:source-loaded',sync);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});
sync();
globalThis.RSVPSourceInstrument=Object.freeze({sync,mode:()=>sourceMode,sourceLength:()=>raw.length,
 currentWindow:()=>({start,end}),paired:()=>sourceMode==='LISTEN ENERGY',
 pin:pinHere,annotate:makeEditor,marks:()=>({bound:boundMarks.length,all:allMarks.length,state:trailState,furthest}),
 jumpMark,pickRing,pickScale,turnScale});
