(()=>{'use strict';
const NS='http://www.w3.org/2000/svg',enc=new TextEncoder();
const MIN_WPM=60,MAX_WPM=6000,MIN_DWELL_MS=10,MAX_STRUCTURE_MARKERS=72;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),mod=(n,m)=>((n%m)+m)%m;
function sampleEven(xs=[],max=MAX_STRUCTURE_MARKERS){if(xs.length<=max)return xs;const out=[];for(let i=0;i<max;i++)out.push(xs[Math.round(i*(xs.length-1)/(max-1))]);return out;}
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function segmentedUnits(text,locale='en',mode='word'){
 const raw=String(text),out=[];
 if(typeof Intl.Segmenter==='function'){
  const granularity=['word','sentence','grapheme'].includes(mode)?mode:'word';
  for(const p of new Intl.Segmenter(locale,{granularity}).segment(raw)){
   if(!p.segment.trim())continue;
   if(mode==='word'&&!p.isWordLike&&out.length){const a=out.at(-1);a.text+=p.segment;a.end=p.index+p.segment.length}
   else out.push({text:p.segment.trim(),start:p.index,end:p.index+p.segment.length})
  }
  return out
 }
 if(mode==='sentence'){
  const re=/[^.!?\n]+[.!?]+|[^.!?\n]+$/g;let m;
  while((m=re.exec(raw))){const text=m[0].trim();if(text)out.push({text,start:m.index,end:m.index+m[0].length})}
  return out
 }
 if(mode==='grapheme'){let at=0;for(const ch of Array.from(raw)){const start=at;at+=ch.length;if(ch.trim())out.push({text:ch,start,end:at})}return out}
 for(const m of raw.matchAll(/\S+/g))out.push({text:m[0],start:m.index||0,end:(m.index||0)+m[0].length});return out
}
function paragraphUnits(raw,format='AUTO'){
 const parsed=globalThis.FieldDocumentStructure?.parseDocumentStructure?.(raw,{format});
 if(parsed)return parsed.paragraphs.map(x=>({text:raw.slice(x.start,x.end),start:x.start,end:x.end,address:x.address,section:x.section}));
 const out=[];const re=/\S[\s\S]*?(?=\n[ \t]*\n+|$)/g;let m;
 while((m=re.exec(raw))){const whole=m[0],lead=whole.search(/\S/),text=whole.trimEnd(),start=m.index+Math.max(0,lead);if(text.trim())out.push({text:text.trimStart(),start,end:m.index+text.length})}
 return out
}
function phraseUnits(raw,locale='en'){
 const out=[];for(const s of segmentedUnits(raw,locale,'sentence')){
  const src=raw.slice(s.start,s.end),re=/[^,;:—–]+(?:[,;:—–]+|$)/g;let m;
  while((m=re.exec(src))){const lead=m[0].search(/\S/),text=m[0].trim();if(!text)continue;const start=s.start+m.index+Math.max(0,lead);out.push({text,start,end:start+text.length})}
 }
 return out
}
function sectionUnits(raw,paras=[],format='AUTO'){
 const parsed=globalThis.FieldDocumentStructure?.parseDocumentStructure?.(raw,{format});
 if(parsed)return parsed.sections.map(x=>({text:raw.slice(x.start,x.end),start:x.start,end:x.end,key:x.label,depth:x.depth,address:x.address,parent:x.parent,contentStart:x.contentStart}));
 const hs=[];for(const m of raw.matchAll(/^(#{1,6})[ \t]+(.+?)\s*$/gm))hs.push({start:m.index,label:m[2].trim(),depth:m[1].length});
 if(hs.length){
  return hs.map((h,i)=>{const end=hs[i+1]?.start??raw.length,text=raw.slice(h.start,end).trimEnd();return{text,start:h.start,end,key:h.label,depth:h.depth}})
 }
 if(paras.length>=4){
  const size=4,out=[];for(let i=0;i<paras.length;i+=size){const xs=paras.slice(i,i+size),start=xs[0].start,end=xs.at(-1).end;out.push({text:raw.slice(start,end),start,end,key:'§ '+(out.length+1),depth:1})}return out
 }
 return raw.trim()? [{text:raw,start:0,end:raw.length,key:'DOCUMENT',depth:0}]:[]
}
function preview(v,n=86){let s=typeof v==='string'?v:JSON.stringify(v);return s.length>n?s.slice(0,n-1)+'…':s}
function wordCount(text,locale='en'){return Math.max(1,segmentedUnits(String(text||''),locale,'word').filter(x=>/[\p{L}\p{N}]/u.test(x.text)).length)}
function orpParts(text){
 const raw=String(text??'').replace(/\s+/g,' ').trim();if(!raw)return{before:'',mark:'·',after:'',word:'·',index:0};
 const words=[...raw.matchAll(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu)];
 if(!words.length){const i=Math.min(raw.length-1,Math.floor(raw.length*.38));return{before:raw.slice(Math.max(0,i-58),i),mark:raw[i]||'·',after:raw.slice(i+1,i+59),word:raw,index:i}}
 const wi=Math.floor((words.length-1)*.38),m=words[wi],w=m[0],L=[...w].length;
 const oi=L<=1?0:L<=5?1:L<=9?2:L<=13?3:4;
 const prefix=[...w].slice(0,oi).join(''),mark=[...w][oi]||[...w][0],local=m.index+prefix.length;
 return{before:raw.slice(Math.max(0,local-58),local),mark,after:raw.slice(local+mark.length,local+mark.length+58),word:w,index:local}
}
function extractXrefs(text){
 const raw=String(text??''),out=[],seen=new Set(),push=(href,label,kind)=>{href=String(href||'').trim();if(!href||seen.has(href))return;seen.add(href);out.push({href,label:String(label||href).trim().slice(0,90),kind})};
 for(const m of raw.matchAll(/!\[([^\]]{0,120})\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g))push(m[2],m[1]||m[2],'MEDIA');
 for(const m of raw.matchAll(/\[([^\]]{1,120})\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g))push(m[2],m[1],'MARKDOWN');
 for(const m of raw.matchAll(/^\s*\[[^\]]+\]:\s*(\S+)/gm))push(m[1],m[1],'CITATION');
 for(const m of raw.matchAll(/\bhttps?:\/\/[^\s<>"')\]]+/g))push(m[0],m[0],'URL');
 for(const m of raw.matchAll(/(?:^|[\s"'(])((?:\.{0,2}\/|\/)[A-Za-z0-9_./-]+\.(?:md|json|txt|csv|ya?ml|html|png|jpe?g|gif|webp|svg|mp3|wav|m4a|mp4|webm|pdf)(?:#[A-Za-z0-9_.:-]+)?)/g))push(m[1],m[1],/\.(?:png|jpe?g|gif|webp|svg|mp3|wav|m4a|mp4|webm|pdf)(?:#|$)/i.test(m[1])?'MEDIA':'REPO');
 return out.slice(0,12)
}
function jsonNodes(root){
 const out=[];const seen=new WeakSet();
 function walk(v,path='$',depth=0,key='$'){
   const type=Array.isArray(v)?'array':v===null?'null':typeof v;
   const node={path,depth,key,type,value:v,leaf:v===null||typeof v!=='object',order:out.length};
   out.push(node);
   if(v&&typeof v==='object'){
     if(seen.has(v))return;seen.add(v);
     if(Array.isArray(v))v.forEach((x,i)=>walk(x,path+'['+i+']',depth+1,String(i)));
     else Object.entries(v).forEach(([k,x])=>walk(x,path+'.'+k,depth+1,k));
   }
 }
 walk(root);return out;
}
function analyze(source,label='Untitled',locale='en',format='AUTO'){
 let data=source,raw='',kind='TEXT';
 if(typeof source!=='string'){kind='JSON';data=source;raw=JSON.stringify(source,null,2)}
 else{raw=source;try{data=JSON.parse(source);kind='JSON'}catch(_){}}
 const bytes=enc.encode(raw).length,chars=raw.length;
 if(kind==='JSON'){
   const nodes=jsonNodes(data),maxDepth=Math.max(0,...nodes.map(n=>n.depth)),leaves=nodes.filter(n=>n.leaf);
   const scales=[{id:'ROOT',label:'ROOT',units:[nodes[0]]}];
   for(let d=1;d<=maxDepth;d++){const units=nodes.filter(n=>n.depth===d);if(units.length)scales.push({id:'L'+d,label:'LEVEL '+d,units})}
   if(leaves.length>1)scales.push({id:'LEAF',label:'LEAVES',units:leaves});
   return{kind,label,raw,data,bytes,chars,nodes,leaves:leaves.length,maxDepth,scales,xrefs:extractXrefs(raw)};
 }
 const words=segmentedUnits(raw,locale,'word'),sentences=segmentedUnits(raw,locale,'sentence'),graphemes=segmentedUnits(raw,locale,'grapheme'),paras=paragraphUnits(raw,format),phrases=phraseUnits(raw,locale),sections=sectionUnits(raw,paras,format);
 const unit=(x,i,type,key=null)=>({path:type.toLowerCase()+'://'+i,key:key??String(i+1),type,value:x.text??x,text:x.text??x,leaf:true,start:x.start??0,end:x.end??raw.length});
 const scales=[
  {id:'DOC',label:'DOCUMENT',units:[unit({text:raw,start:0,end:raw.length},0,'DOC',label)]},
  sections.length>1?{id:'SECTION',label:'SECTION',units:sections.map((x,i)=>unit(x,i,'SECTION',x.key))}:null,
  {id:'PARA',label:'PARAGRAPH',units:paras.map((x,i)=>unit(x,i,'PARA'))},
  {id:'SENT',label:'SENTENCE',units:sentences.map((x,i)=>unit(x,i,'SENT'))},
  {id:'PHRASE',label:'PHRASE',units:phrases.map((x,i)=>unit(x,i,'PHRASE'))},
  {id:'WORD',label:'WORD',units:words.map((x,i)=>unit(x,i,'WORD'))},
  {id:'GRAPHEME',label:'GRAPHEME',units:graphemes.map((x,i)=>unit(x,i,'GRAPHEME'))}
 ].filter(x=>x&&x.units.length);
 return{kind,label,locale,raw,data:raw,bytes,chars,words:words.length,sentences:sentences.length,phrases:phrases.length,graphemes:graphemes.length,paragraphs:paras.length,sections,scales,xrefs:extractXrefs(raw)};
}
class FieldAperture extends HTMLElement{
 constructor(){super();this.attachShadow({mode:'open'});this.A=null;this.scale=0;this.pos=0;this.anchor=0;this.jsonPath=null;this.voiceCursor=null;this.timer=null;this.rsvp=false;this.wpm=300;this.speaking=false;this.voiceToken=0;this.structureDomKey='';this.glyphDomKey='';this.externalPulse=null;this.glyphWitness=null;this.bound=this.onPointer.bind(this);this.boundKey=this.onKey.bind(this);this.ratePresets=[120,200,300,450,650,900,1200,1600,2200,3000,4000,5000,6000]}
 connectedCallback(){this.renderShell();this.tabIndex=this.tabIndex<0?0:this.tabIndex;this.addEventListener('keydown',this.boundKey);if(this.hasAttribute('source'))this.load(this.getAttribute('source'),{label:this.getAttribute('label')||'Source'})}
 disconnectedCallback(){this.stop();this.removeEventListener('keydown',this.boundKey)}
 scaleIndex(value){
  if(!this.A)return 0;if(value==null||value==='')return 0;
  const n=Number(value);if(Number.isInteger(n)&&String(value).trim()!=='')return clamp(n,0,this.A.scales.length-1);
  const want=String(value).toUpperCase(),i=this.A.scales.findIndex(x=>String(x.id).toUpperCase()===want||String(x.label).toUpperCase()===want);return i>=0?i:0
 }
 locate(address,preferred=this.scale){
  if(!this.A||!address)return null;const order=[preferred,...this.A.scales.map((_,i)=>i).filter(i=>i!==preferred)];
  for(const si of order){const units=this.A.scales[si]?.units||[],pi=units.findIndex(x=>x.path===address);if(pi>=0)return{scale:si,index:pi}}return null
 }
 load(source,opt={}){
  this.stop();this.locale=String(opt.locale||this.getAttribute('lang')||document.documentElement.lang||navigator.language||'en');this.A=analyze(source,opt.label||'Untitled',this.locale,opt.format||'AUTO');this.scale=this.scaleIndex(opt.scale);this.pos=0;this.anchor=0;this.jsonPath=null;this.voiceCursor=null;this.structureDomKey='';
  const hit=this.locate(opt.address,this.scale);
  if(hit){this.scale=hit.scale;this.pos=hit.index}
  else if(this.A.kind==='TEXT'&&Number.isFinite(Number(opt.charIndex))){this.anchor=clamp(Math.round(Number(opt.charIndex)),0,Math.max(0,this.A.raw.length-1));this.pos=this.indexForAnchor(this.scale)}
  else{const i=Number(opt.index);if(Number.isFinite(i))this.pos=clamp(Math.round(i),0,Math.max(0,this.currentScale().units.length-1))}
  this.captureAnchor();
  const w=Number(opt.wpm);if(Number.isFinite(w))this.wpm=clamp(Math.round(w),MIN_WPM,MAX_WPM);this.render();this.emit();return this.snapshot()
 }
 restore(snap={}){
  if(!this.A)return null;this.stop();this.scale=this.scaleIndex(snap.scale);this.voiceCursor=null;
  const hit=this.locate(snap.address,this.scale);
  if(hit){this.scale=hit.scale;this.pos=hit.index}
  else if(this.A.kind==='TEXT'&&Number.isFinite(Number(snap.char_index))){this.anchor=clamp(Math.round(Number(snap.char_index)),0,Math.max(0,this.A.raw.length-1));this.pos=this.indexForAnchor(this.scale)}
  else{const i=Number(snap.index);this.pos=Number.isFinite(i)?clamp(Math.round(i),0,Math.max(0,this.currentScale().units.length-1)):0}
  this.captureAnchor();
  const w=Number(snap.wpm);if(Number.isFinite(w))this.wpm=clamp(Math.round(w),MIN_WPM,MAX_WPM);this.render();this.emit();return this.snapshot()
 }
 currentScale(){return this.A?.scales[this.scale]}
 current(){const s=this.currentScale();return s?.units[clamp(this.pos,0,Math.max(0,s.units.length-1))]||null}
 captureAnchor(){
  const u=this.current();if(!u||!this.A)return;
  if(this.A.kind==='TEXT'){const a=Number(u.start),b=Number(u.end);if(Number.isFinite(a)&&Number.isFinite(b))this.anchor=clamp(Math.floor((a+b)/2),0,Math.max(0,this.A.raw.length-1))}
  else this.jsonPath=u.path||this.jsonPath;
 }
 sourceFraction(){
  if(!this.A)return 0;
  if(this.A.kind==='TEXT')return this.A.raw.length<=1?0:clamp(this.anchor/Math.max(1,this.A.raw.length-1),0,1);
  const p=this.jsonPath||this.current()?.path,ns=this.A.nodes||[];let i=ns.findIndex(x=>x.path===p);
  if(i<0&&p)i=ns.findIndex(x=>p.startsWith(x.path+'.')||p.startsWith(x.path+'['));
  return ns.length<=1?0:clamp(Math.max(0,i)/(ns.length-1),0,1)
 }
 indexForAnchor(si=this.scale){
  const units=this.A?.scales?.[si]?.units||[];if(!units.length)return 0;
  if(this.A.kind==='TEXT'){
    const at=clamp(this.anchor,0,Math.max(0,this.A.raw.length-1));
    let i=units.findIndex(u=>Number.isFinite(u.start)&&Number.isFinite(u.end)&&u.start<=at&&at<Math.max(u.start+1,u.end));
    if(i<0){let d=Infinity;units.forEach((u,k)=>{const mid=((Number(u.start)||0)+(Number(u.end)||0))/2,q=Math.abs(mid-at);if(q<d){d=q;i=k}})}return Math.max(0,i)
  }
  const p=this.jsonPath||this.current()?.path||'$',common=(a,b)=>{let i=0,n=Math.min(a.length,b.length);while(i<n&&a[i]===b[i])i++;return i};
  let best=0,score=-Infinity;units.forEach((u,i)=>{const q=String(u.path||'');let s=common(p,q);if(q===p)s+=100000;else if(p.startsWith(q+'.')||p.startsWith(q+'['))s+=50000+q.length;else if(q.startsWith(p+'.')||q.startsWith(p+'['))s+=40000+p.length;if(s>score){score=s;best=i}});return best
 }
 seekFraction(frac){
  if(!this.A)return;frac=clamp(Number(frac)||0,0,1);this.voiceCursor=null;
  if(this.A.kind==='TEXT'){this.anchor=Math.round(frac*Math.max(0,this.A.raw.length-1));this.pos=this.indexForAnchor(this.scale)}
  else{const ns=this.A.nodes||[],n=ns[clamp(Math.round(frac*Math.max(0,ns.length-1)),0,Math.max(0,ns.length-1))];this.jsonPath=n?.path||this.jsonPath;this.pos=this.indexForAnchor(this.scale)}
  this.render();this.emit()
 }
 selectChar(at,cursor=null){
  if(!this.A||this.A.kind!=='TEXT')return;this.anchor=clamp(Math.round(Number(at)||0),0,Math.max(0,this.A.raw.length-1));this.pos=this.indexForAnchor(this.scale);this.voiceCursor=cursor;this.render();this.emit()
 }
 setScale(i){if(!this.A)return;this.scale=mod(i,this.A.scales.length);this.pos=this.indexForAnchor(this.scale);this.render();this.emit()}
 setPos(i){const s=this.currentScale();if(!s)return;this.pos=mod(i,s.units.length);this.voiceCursor=null;this.captureAnchor();this.render();this.emit()}
 step(n=1){this.setPos(this.pos+n)}
 setWpm(n){const was=!!this.timer,voice=this.speaking;this.wpm=clamp(Math.round(Number(n)||300),MIN_WPM,MAX_WPM);if(was){clearTimeout(this.timer);this.timer=null;this.scheduleRSVP()}this.render();this.emit();if(voice)queueMicrotask(()=>this.speak())}
 nudgeWpm(dir){const ps=this.ratePresets,i=ps.findIndex(x=>x>=this.wpm),base=i<0?ps.length-1:i,next=clamp(base+(dir>0?(ps[base]===this.wpm?1:0):-1),0,ps.length-1);this.setWpm(ps[next])}
 cycleWpm(){const ps=this.ratePresets,i=ps.findIndex(x=>x>this.wpm);this.setWpm(ps[i<0?0:i])}
 onKey(e){if(e.target&&/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(e.key===' '){e.preventDefault();this.toggleRSVP()}else if(e.key==='ArrowUp'){e.preventDefault();this.nudgeWpm(1)}else if(e.key==='ArrowDown'){e.preventDefault();this.nudgeWpm(-1)}else if(e.key==='ArrowRight'){e.preventDefault();this.step(1)}else if(e.key==='ArrowLeft'){e.preventDefault();this.step(-1)}}
 structure(){
  if(!this.A)return{progress:0,current:null,markers:[]};
  const progress=this.sourceFraction();
  if(this.A.kind==='TEXT'){
    const parts=(this.A.sections?.length>1?this.A.sections:null)||(this.A.scales.find(x=>x.id==='PARA')?.units||[]);
    const sampled=sampleEven(parts||[]),markers=sampled.map((u,i)=>({at:this.A.raw.length<=1?0:clamp((u.start||0)/Math.max(1,this.A.raw.length-1),0,1),label:u.key||u.text?.split('\n')[0]?.replace(/^#+\s*/,'').slice(0,60)||'§ '+(i+1),path:u.path||'section://'+((parts||[]).indexOf(u)>=0?(parts||[]).indexOf(u):i)}));
    const current=(parts||[]).find(u=>(u.start??0)<=this.anchor&&this.anchor<Math.max((u.start??0)+1,u.end??0))||null;
    return{progress,current:current?{label:current.key||current.text?.split('\n')[0]?.replace(/^#+\s*/,'').slice(0,90)||'SECTION',start:current.start,end:current.end,path:current.path||null}:null,markers}
  }
  const ns=this.A.nodes||[],tops=ns.filter(x=>x.depth===1),p=this.jsonPath||this.current()?.path||'$';
  const current=tops.find(x=>p===x.path||p.startsWith(x.path+'.')||p.startsWith(x.path+'['))||null;
  const markers=sampleEven(tops).map(x=>({at:ns.length<=1?0:clamp((x.order||0)/(ns.length-1),0,1),label:String(x.key||x.path).slice(0,70),path:x.path}));
  return{progress,current:current?{label:String(current.key||current.path),path:current.path}:null,markers}
 }
 focusSpan(){
  if(!this.A)return null;
  if(this.A.kind==='TEXT'){
    if(this.voiceCursor&&Number.isFinite(this.voiceCursor.start))return{start:this.voiceCursor.start,end:this.voiceCursor.end??this.voiceCursor.start+1,kind:'CURSOR'};
    const u=this.current();if(Number.isFinite(u?.start)&&Number.isFinite(u?.end))return{start:u.start,end:u.end,kind:this.currentScale()?.id||'UNIT'}
  }
  return null
 }
 focusText(){
  if(!this.A)return'';
  if(this.A.kind==='TEXT'&&this.voiceCursor?.text)return this.voiceCursor.text;
  const c=this.current();return typeof c?.value==='string'?c.value:preview(c?.value,320)
 }
 localXrefs(){
  if(!this.A)return[];
  let src='';
  if(this.A.kind==='TEXT'){
    const st=this.structure().current;if(st&&Number.isFinite(st.start)&&Number.isFinite(st.end))src=this.A.raw.slice(st.start,st.end);else src=this.focusText()
  }else{
    const c=this.current();try{src=JSON.stringify(c?.value??c?.key??'',null,2)}catch(_){src=String(c?.value??'')}
  }
  const xs=extractXrefs(src);return xs.length?xs:(this.A.xrefs||[]).slice(0,8)
 }
 setExternalPulse(data=null){
  this.externalPulse=data&&typeof data==='object'?{
    sourceProgress:clamp(Number(data.sourceProgress)||0,0,1),
    beatPhase:clamp(Number(data.beatPhase)||0,0,1),
    sectionProgress:clamp(Number(data.sectionProgress)||0,0,1),
    energy:clamp(Number(data.energy)||0,0,1.5),
    bpm:Math.max(0,Number(data.bpm)||0),
    sourceHash:data.sourceHash||null,
    playing:!!data.playing
  }:null;
  if(this.A)this.render();return this.externalPulse
 }
 setGlyphWitness(glyph=null){
  this.glyphWitness=glyph&&typeof glyph==='object'?{
    sourceHash:String(glyph.sourceHash||''),
    rotation:Number(glyph.rotation)||0,
    radial:Array.from(glyph.radial||[]).slice(0,24).map(v=>clamp(Number(v)||0,0,1))
  }:null;
  this.glyphDomKey='';if(this.A)this.render();return this.glyphWitness
 }
 material(){const s=this.currentScale(),progress=this.sourceFraction(),scaleFrac=this.A?.scales?.length>1?this.scale/(this.A.scales.length-1):0,mag=this.magnitude(),depth=this.A?.kind==='JSON'&&s?.id?.startsWith('L')?Number(s.id.slice(1))||0:this.scale;return{progress,scale:scaleFrac,magnitude:clamp(mag.decades/12,0,1),depth,kind:this.A?.kind||'NONE',x:(12+progress*76).toFixed(2)+'%',y:(18+scaleFrac*64).toFixed(2)+'%',angle:(20+progress*140).toFixed(1)+'deg',spacing:(18+mag.decades*3).toFixed(1)+'px',strength:(.035+.075*(.35+scaleFrac*.65)).toFixed(3)}}
 applyMaterial(){const m=this.material(),apply=t=>{if(!t)return;t.style.setProperty('--ap-progress',m.progress);t.style.setProperty('--ap-scale',m.scale);t.style.setProperty('--ap-magnitude',m.magnitude);t.style.setProperty('--ap-x',m.x);t.style.setProperty('--ap-y',m.y);t.style.setProperty('--ap-angle',m.angle);t.style.setProperty('--ap-spacing',m.spacing);t.style.setProperty('--ap-strength',m.strength);t.dataset.apertureKind=m.kind;t.dataset.apertureScale=this.currentScale()?.id||'NONE'};apply(this);const sel=this.getAttribute('material-target');if(sel){try{apply(document.querySelector(sel))}catch(_){}}return m}
 emit(){const snap=this.snapshot();this.dispatchEvent(new CustomEvent('aperture-focus',{detail:snap,bubbles:true}));this.dispatchEvent(new CustomEvent('aperture-material',{detail:snap.material,bubbles:true}))}
 snapshot(){const c=this.current(),s=this.currentScale(),st=this.structure(),span=this.focusSpan();return{schema:'field-aperture-focus/v0.2',kind:this.A?.kind,label:this.A?.label,locale:this.A?.locale||this.locale||null,bytes:this.A?.bytes,scale:s?.id,scale_label:s?.label,index:this.pos,count:s?.units.length,address:c?.path||null,focus:this.focusText(),char_index:this.A?.kind==='TEXT'?this.anchor:null,span,source_progress:st.progress,section:st.current,structure:st.markers,xrefs:this.localXrefs(),cursor:this.voiceCursor,wpm:this.wpm,wpm_max:MAX_WPM,playing:this.rsvp,speaking:this.speaking,loop:this.hasAttribute('loop'),material:this.material()}}
 magnitude(){
   const b=Math.max(1,this.A?.bytes||1),log=Math.log10(b),decades=clamp(log,0,12),gap=7+(decades/12)*26;
   const exp=Math.floor(log),mant=b/Math.pow(10,exp);
   const human=b<1024?b+' B':b<1048576?(b/1024).toFixed(1)+' KB':b<1073741824?(b/1048576).toFixed(1)+' MB':b<1099511627776?(b/1073741824).toFixed(1)+' GB':(b/1099511627776).toFixed(1)+' TB';
   return{gap,log,decades,band:'10^'+exp+' B',human,mant}
 }
 renderShell(){
 this.shadowRoot.innerHTML=`<style>
 :host{--fa-bg:#080b0d;--fa-ink:#edf1ef;--fa-mut:#77858b;--fa-line:#2a3439;--fa-hot:#ed7447;--fa-cool:#72bce7;display:block;color:var(--fa-ink);font:10px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace}
 *{box-sizing:border-box}button{font:inherit;border-radius:0}.ap{display:grid;grid-template-columns:auto minmax(0,1fr);gap:9px;border:1px solid var(--fa-line);background:var(--fa-bg);padding:7px;min-height:142px}
 .dial{width:112px;height:112px;touch-action:none;user-select:none}.dial svg{width:100%;height:100%;display:block}.ring{fill:none;stroke:#46545a}.outer{stroke-width:2}.inner{stroke-width:2}.mag{stroke:#20292d;fill:none}.pulseRing{fill:none;stroke:var(--fa-cool);stroke-width:1.8;opacity:0;transform:rotate(-90deg);transform-origin:60px 60px}.pulseDot{fill:var(--fa-cool);opacity:0}.triFrame{fill:none;stroke:#5a666b;stroke-width:1;opacity:.55}.glyphSpoke{stroke:#a8b5ba;stroke-width:.85;opacity:.36}.tick{stroke:var(--fa-hot);stroke-width:3;stroke-linecap:square}.scaleTick{stroke:var(--fa-cool);stroke-width:3}.structureTick{stroke:#7e8b91;stroke-width:1;opacity:.7}.gate{stroke:#fff;stroke-width:1.3;opacity:.8}.center{fill:#0d1316;stroke:#334047}.word{fill:var(--fa-ink);font:800 10px system-ui,sans-serif;text-anchor:middle}.tiny{fill:var(--fa-mut);font-size:5.5px;text-anchor:middle}
 .body{min-width:0;display:flex;flex-direction:column}.top{display:flex;justify-content:space-between;gap:8px}.ey{font-size:6.5px;letter-spacing:.12em;color:var(--fa-hot)}.size{font-size:6.5px;color:var(--fa-mut)}
 .focus{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:baseline;min-width:0;margin:7px 0 2px;font:800 18px/1.12 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:-.035em;white-space:pre;overflow:hidden}.focus .before{text-align:right;overflow:hidden}.focus .after{text-align:left;overflow:hidden}.focus .orp{color:var(--fa-hot);font-size:1.08em;padding:0 .02em}.addr{color:var(--fa-cool);font-size:6.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 .map{position:relative;height:12px;margin:6px 0 1px;border-top:1px solid #243036}.mapMark{position:absolute;top:-2px;width:1px;height:6px;background:#66757c}.mapDot{position:absolute;top:-4px;width:5px;height:5px;background:var(--fa-hot);transform:translateX(-50%)}.mapMeta{display:flex;justify-content:space-between;gap:6px;color:var(--fa-mut);font-size:6px;white-space:nowrap;overflow:hidden}.mapMeta span{overflow:hidden;text-overflow:ellipsis}.meter{height:2px;background:#1c2529;margin:5px 0;position:relative}.meter i{display:block;height:100%;background:var(--fa-hot);width:0}
 .controls{display:flex;gap:3px;flex-wrap:wrap;margin-top:auto;align-items:center}.controls button{border:1px solid var(--fa-line);background:#090d0f;color:var(--fa-ink);padding:5px 6px;font-size:6.5px}.controls button:hover{border-color:#69777d}.controls .hot{border-color:var(--fa-hot);color:#ffd0bd}.rate{color:var(--fa-cool)!important;min-width:55px}.speed{color:var(--fa-mut)!important;padding-inline:7px!important}.speedRail{display:none;min-width:120px;flex:1 1 180px;height:18px;background:transparent}
 :host([reader]) .ap{grid-template-columns:minmax(0,1fr);padding:9px 10px;min-height:126px}.dial{width:112px;height:112px;touch-action:none;user-select:none}:host([reader]) .dial{display:none}:host([reader][focusfield]) .ap{grid-template-columns:154px minmax(0,1fr);align-items:center;border-color:#53636a}:host([reader][focusfield]) .dial{display:block;width:148px;height:148px}:host([reader]) .speedRail{display:block}:host([reader]) .speed{display:none}:host([reader]) .focus{font-size:clamp(20px,4vw,34px);margin:10px 0 7px}:host([reader]) .map{height:16px;margin-top:9px}:host([reader]) .mapDot{width:7px;height:7px;top:-5px}:host([reader][minimal]) .ap{grid-template-columns:112px minmax(0,1fr);padding:5px;min-height:112px}:host([reader][minimal]) .dial{display:block;width:112px;height:112px}:host([reader][minimal]) .top,:host([reader][minimal]) .addr,:host([reader][minimal]) .map,:host([reader][minimal]) .mapMeta,:host([reader][minimal]) .meter,:host([reader][minimal]) #scaleDown,:host([reader][minimal]) #scaleUp,:host([reader][minimal]) #prev,:host([reader][minimal]) #next,:host([reader][minimal]) #speak,:host([reader][minimal]) #stop,:host([reader][minimal]) .speed{display:none!important}:host([reader][minimal]) .focus{font-size:clamp(23px,5vw,42px);margin:5px 0}:host([reader][minimal]) .controls{margin-top:5px}
 @media(max-width:520px){.ap{grid-template-columns:82px minmax(0,1fr);padding:5px;gap:6px;min-height:108px}.dial{width:82px;height:82px}.focus{font-size:13px;margin-top:4px}.controls button{padding:4px 5px}.controls .secondary{display:none}:host([reader]) .ap{grid-template-columns:1fr;padding:8px}:host([reader]) .focus{font-size:20px}:host([reader]) .secondary{display:inline-block}:host([reader][focusfield]) .ap,:host([reader][minimal]) .ap{grid-template-columns:108px minmax(0,1fr);padding:5px}:host([reader][focusfield]) .dial{display:block;width:108px;height:108px}:host([reader][minimal]) .dial{display:block;width:92px;height:92px}:host([reader][minimal]) .focus{font-size:22px}}
 </style><div class="ap"><div class="dial"><svg viewBox="0 0 120 120" aria-label="Address, aperture, source glyph and LISTEN pulse focus lens"><circle class="pulseRing" id="pulseRing" cx="60" cy="60" r="55"/><circle class="pulseDot" id="pulseDot" cx="60" cy="5" r="2.2"/><circle class="mag" cx="60" cy="60" r="51"/><circle class="ring outer" cx="60" cy="60" r="50"/><g id="structureTicks"></g><circle class="ring inner" id="inner" cx="60" cy="60" r="37"/><polygon class="triFrame" points="60,35 38,76 82,76"/><g id="glyphSpokes"></g><line class="gate" x1="60" y1="2" x2="60" y2="17"/><line class="tick" id="posTick" x1="60" y1="8" x2="60" y2="17"/><line class="scaleTick" id="scaleTick" x1="60" y1="25" x2="60" y2="34"/><circle class="center" cx="60" cy="60" r="22"/><text class="word" id="centerWord" x="60" y="59">—</text><text class="tiny" id="centerMeta" x="60" y="69">—</text></svg></div><div class="body"><div class="top"><div class="ey" id="ey">APERTURE</div><div class="size" id="size">—</div></div><div class="focus" id="focus"><span class="before" id="focusBefore"></span><span class="orp" id="focusOrp">·</span><span class="after" id="focusAfter"></span></div><div class="addr" id="addr">—</div><div class="map"><div id="mapMarks"></div><i class="mapDot" id="mapDot"></i></div><div class="mapMeta"><span id="sectionMeta">WHOLE SOURCE</span><span id="progressMeta">0%</span></div><div class="meter"><i id="meter"></i></div><div class="controls"><button id="scaleDown">− SCALE</button><button id="prev">←</button><button class="hot" id="rsvp">▶ RSVP</button><button id="next">→</button><button id="scaleUp">SCALE +</button><button class="speed" id="slower" title="slower · ↓">− WPM</button><button class="rate" id="rate" title="cycle speed presets">300</button><button class="speed" id="faster" title="faster · ↑">WPM +</button><input class="speedRail" id="speedRail" type="range" min="60" max="6000" step="10" value="300" aria-label="Reading speed"><button class="secondary" id="speak">VOICE</button><button class="secondary" id="stop">STOP</button></div></div></div>`;
 const q=id=>this.shadowRoot.getElementById(id);
 q('scaleDown').onclick=()=>this.setScale(this.scale-1);q('scaleUp').onclick=()=>this.setScale(this.scale+1);q('prev').onclick=()=>this.step(-1);q('next').onclick=()=>this.step(1);q('rsvp').onclick=()=>this.toggleRSVP();q('slower').onclick=()=>this.nudgeWpm(-1);q('faster').onclick=()=>this.nudgeWpm(1);q('rate').onclick=()=>this.cycleWpm();q('speedRail').oninput=e=>this.setWpm(e.target.value);q('speak').onclick=()=>this.speak();q('stop').onclick=()=>this.stop();this.shadowRoot.querySelector('svg').addEventListener('pointerdown',this.bound);
 }
 anglePoint(cx,cy,r,a){return{x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r}}
 setLine(el,r,a,len=9){const p1=this.anglePoint(60,60,r-len/2,a),p2=this.anglePoint(60,60,r+len/2,a);el.setAttribute('x1',p1.x);el.setAttribute('y1',p1.y);el.setAttribute('x2',p2.x);el.setAttribute('y2',p2.y)}
 onPointer(e){
  if(!this.A)return;const svg=e.currentTarget,box=svg.getBoundingClientRect(),x=(e.clientX-box.left)/box.width*120-60,y=(e.clientY-box.top)/box.height*120-60,r=Math.hypot(x,y),a=Math.atan2(y,x)+Math.PI/2;if(a<0)a+=Math.PI*2;
  const mag=this.magnitude(),innerR=50-mag.gap,frac=clamp(a/(Math.PI*2),0,1);
  if(Math.abs(r-50)<Math.abs(r-innerR))this.seekFraction(frac);else this.setScale(Math.round(frac*Math.max(0,this.A.scales.length-1)));
 }
 render(){
  if(!this.A)return;const q=id=>this.shadowRoot.getElementById(id),s=this.currentScale(),c=this.current(),mag=this.magnitude(),n=s.units.length,frac=this.sourceFraction(),a=-Math.PI/2+frac*Math.PI*2,sa=-Math.PI/2+(this.A.scales.length<=1?0:this.scale/(this.A.scales.length-1))*Math.PI*2,innerR=50-mag.gap,st=this.structure(),parts=orpParts(this.focusText());
  q('inner').setAttribute('r',innerR);this.setLine(q('posTick'),50,a,10);this.setLine(q('scaleTick'),innerR,sa,9);
  const markerKey=(this.A.kind||'')+'|'+st.markers.map(m=>Math.round(clamp(m.at,0,1)*10000)+':'+(m.path||m.label||'')).join('|');
  if(markerKey!==this.structureDomKey){const ticks=q('structureTicks'),marks=q('mapMarks');ticks.replaceChildren();marks.replaceChildren();for(const m of st.markers){const line=document.createElementNS(NS,'line'),ma=-Math.PI/2+clamp(m.at,0,1)*Math.PI*2;line.setAttribute('class','structureTick');this.setLine(line,46,ma,5);ticks.appendChild(line);const x=document.createElement('i');x.className='mapMark';x.style.left=(clamp(m.at,0,1)*100)+'%';x.title=m.label||m.path||'';marks.appendChild(x)}this.structureDomKey=markerKey}
  const pulse=this.externalPulse,pulseRing=q('pulseRing'),pulseDot=q('pulseDot'),C=2*Math.PI*55;
  if(pulse){
    const pp=clamp(Number(pulse.sourceProgress)||0,0,1),bp=clamp(Number(pulse.beatPhase)||0,0,1),pa=-Math.PI/2+bp*Math.PI*2,pd=this.anglePoint(60,60,55,pa);
    pulseRing.style.strokeDasharray=String(C);pulseRing.style.strokeDashoffset=String(C*(1-pp));pulseRing.style.opacity=String(.28+clamp(Number(pulse.energy)||0,0,1)*.52);
    pulseDot.setAttribute('cx',pd.x);pulseDot.setAttribute('cy',pd.y);pulseDot.style.opacity=pulse.playing?'.95':'.35';
  }else{pulseRing.style.opacity='0';pulseDot.style.opacity='0'}
  const gd=this.glyphWitness,glyphKey=gd?gd.sourceHash+'|'+gd.rotation+'|'+gd.radial.join(','):'';
  if(glyphKey!==this.glyphDomKey){
    const g=q('glyphSpokes');g.replaceChildren();
    if(gd?.radial?.length){gd.radial.forEach((v,i)=>{const a=(Number(gd.rotation)||0)-Math.PI/2+Math.PI*2*i/gd.radial.length,p1=this.anglePoint(60,60,24,a),p2=this.anglePoint(60,60,25+clamp(v,0,1)*10,a),line=document.createElementNS(NS,'line');line.setAttribute('class','glyphSpoke');line.setAttribute('x1',p1.x);line.setAttribute('y1',p1.y);line.setAttribute('x2',p2.x);line.setAttribute('y2',p2.y);g.appendChild(line)})}
    this.glyphDomKey=glyphKey;
  }
  q('centerWord').textContent=parts.word.length>13?parts.word.slice(0,12)+'…':parts.word||'—';q('centerMeta').textContent=s.label+' · '+(this.pos+1)+'/'+n;
  q('ey').textContent=this.A.kind+' · '+s.label;q('size').textContent=mag.human+' · '+mag.band;
  q('focusBefore').textContent=parts.before;q('focusOrp').textContent=parts.mark;q('focusAfter').textContent=parts.after;
  q('addr').textContent=c?.path||s.id+'://'+this.pos;q('meter').style.width=(frac*100)+'%';q('rate').textContent=this.wpm+' WPM';q('speedRail').value=String(this.wpm);q('rsvp').textContent=this.rsvp?'Ⅱ RSVP':'▶ RSVP';q('speak').textContent=this.speaking?'Ⅱ VOICE':'VOICE';
  q('mapDot').style.left=(frac*100)+'%';q('sectionMeta').textContent=st.current?.label||'WHOLE SOURCE';q('progressMeta').textContent=Math.round(frac*100)+'%'+(this.A.kind==='TEXT'?' · '+this.anchor+'/'+Math.max(0,this.A.raw.length-1):'');
  this.applyMaterial();
 }
 dwell(){
  const c=this.current(),txt=typeof c?.value==='string'?c.value:String(c?.key||''),base=60000/this.wpm,w=this.A?.kind==='TEXT'?wordCount(txt,this.locale):Math.max(1,wordCount(txt,'en'));let f=w;
  if(/[.!?][”"'’)]*$/.test(txt))f*=1.18;else if(/[,;:][”"'’)]*$/.test(txt))f*=1.08;
  return Math.max(MIN_DWELL_MS,base*f)
 }
 scheduleRSVP(){if(!this.A||!this.rsvp)return;this.timer=setTimeout(()=>{this.timer=null;const s=this.currentScale();if(!s){this.rsvp=false;return}if(!this.hasAttribute('loop')&&this.pos>=s.units.length-1){this.rsvp=false;this.render();this.emit();return}this.step(1);if(this.A&&this.rsvp)this.scheduleRSVP()},this.dwell());this.render()}
 toggleRSVP(){
  if(this.rsvp){this.rsvp=false;if(this.timer){clearTimeout(this.timer);this.timer=null}this.render();this.emit();return}
  if(this.speaking){this.voiceToken++;if('speechSynthesis'in window)window.speechSynthesis.cancel();this.speaking=false}
  let s=this.currentScale();if(!s)return;
  if(s.units.length<2){
    let preferred=-1;
    if(this.A.kind==='TEXT'){for(const id of ['PHRASE','SENT','WORD','GRAPHEME']){preferred=this.A.scales.findIndex(x=>x.id===id&&x.units.length>1);if(preferred>=0)break}}
    else preferred=this.A.scales.findIndex(x=>x.units.length>1);
    if(preferred>=0){this.captureAnchor();this.scale=preferred;this.pos=this.indexForAnchor(preferred);s=this.currentScale()}
  }
  if(!s||s.units.length<2)return;if(!this.hasAttribute('loop')&&this.pos>=s.units.length-1)this.setPos(0);
  this.rsvp=true;this.render();this.emit();this.scheduleRSVP()
 }
 stop(){const changed=this.rsvp||!!this.timer||this.speaking;this.rsvp=false;this.voiceToken++;if(this.timer){clearTimeout(this.timer);this.timer=null}if('speechSynthesis'in window)window.speechSynthesis.cancel();this.speaking=false;this.render();if(changed&&this.A)this.emit()}
 speak(){
   if(!this.A||!('speechSynthesis'in window)||!('SpeechSynthesisUtterance'in window))return;
   if(this.timer){clearTimeout(this.timer);this.timer=null}this.rsvp=false;
   const run=++this.voiceToken;window.speechSynthesis.cancel();
   if(this.A.kind==='TEXT'){
     const cur=this.current(),startAt=clamp(Number.isFinite(cur?.start)?cur.start:this.anchor,0,Math.max(0,this.A.raw.length-1)),spoken=this.A.raw.slice(startAt);if(!spoken.trim())return;
     const u=new SpeechSynthesisUtterance(spoken);u.lang=this.locale||'';u.rate=clamp(this.wpm/220,.5,4);
     const words=this.A.scales.find(x=>x.id==='WORD')?.units||[];
     u.onboundary=e=>{if(run!==this.voiceToken)return;if(e.name&&e.name!=='word')return;const at=startAt+Math.max(0,Number(e.charIndex)||0),wu=words.find(x=>x.start<=at&&at<Math.max(x.start+1,x.end));const cursor=wu?{start:wu.start,end:wu.end,text:wu.value,address:wu.path}:{start:at,end:at+Math.max(1,Number(e.charLength)||1),text:this.A.raw.slice(at,at+Math.max(1,Number(e.charLength)||1))};this.selectChar(at,cursor)};
     u.onend=()=>{if(run!==this.voiceToken)return;this.speaking=false;this.render();this.emit()};
     u.onerror=()=>{if(run!==this.voiceToken)return;this.speaking=false;this.render();this.emit()};
     this.speaking=true;window.speechSynthesis.speak(u);this.render();this.emit();return;
   }
   const cur=this.current(),txt=(cur?.key?cur.key+' ':'')+(typeof cur?.value==='string'?cur.value:preview(cur?.value,600)),u=new SpeechSynthesisUtterance(txt);u.rate=clamp(this.wpm/220,.5,4);
   u.onend=()=>{if(run!==this.voiceToken)return;this.speaking=false;this.render();this.emit()};u.onerror=u.onend;this.speaking=true;window.speechSynthesis.speak(u);this.render();this.emit();
 }

}
customElements.define('field-aperture',FieldAperture);
function ensureDock(){
 let wrap=document.querySelector('[data-field-aperture-dock]');
 if(wrap)return wrap;
 wrap=document.createElement('aside');wrap.dataset.fieldApertureDock='1';
 Object.assign(wrap.style,{position:'fixed',right:'8px',bottom:'8px',zIndex:'2147482000',width:'min(420px,calc(100vw - 16px))',background:'#07090a',boxShadow:'0 12px 40px rgba(0,0,0,.45)'});
 const bar=document.createElement('div');Object.assign(bar.style,{display:'flex',justifyContent:'space-between',alignItems:'center',border:'1px solid #2a3439',borderBottom:'0',background:'#090d0f',padding:'4px 5px',font:'7px ui-monospace,monospace',color:'#7d898f'});
 bar.innerHTML='<span>APERTURE / DOCK</span><span><button data-collapse style="font:inherit;color:#edf0ed;background:#090d0f;border:1px solid #2a3439;padding:2px 5px">−</button> <button data-close style="font:inherit;color:#edf0ed;background:#090d0f;border:1px solid #2a3439;padding:2px 5px">×</button></span>';
 const el=document.createElement('field-aperture');el.dataset.fieldDock='1';wrap.append(bar,el);document.body.appendChild(wrap);
 bar.querySelector('[data-close]').onclick=()=>wrap.remove();
 bar.querySelector('[data-collapse]').onclick=e=>{const hidden=el.hidden=!el.hidden;e.currentTarget.textContent=hidden?'+':'−'};
 return wrap;
}
window.FieldAperture={
 analyze,
 mount(target,source,opt={}){const el=document.createElement('field-aperture');if(opt.materialTarget)el.setAttribute('material-target',opt.materialTarget);target.appendChild(el);el.load(source,opt);return el},
 inspect(source,opt={}){let el=document.querySelector('field-aperture[data-field-global]');if(!el){el=document.createElement('field-aperture');el.dataset.fieldGlobal='1';document.body.appendChild(el)}if(opt.materialTarget)el.setAttribute('material-target',opt.materialTarget);el.load(source,opt);return el},
 dock(source,opt={}){const wrap=ensureDock(),el=wrap.querySelector('field-aperture');el.hidden=false;wrap.querySelector('[data-collapse]').textContent='−';if(opt.materialTarget)el.setAttribute('material-target',opt.materialTarget);el.load(source,opt);return el},
 closeDock(){document.querySelector('[data-field-aperture-dock]')?.remove()},
 handoff(source,opt={}){
  try{
    const raw=opt.focus&&typeof opt.focus==='object'?opt.focus:null;
    const focus=raw?{
      scale:raw.scale||null,
      index:Number.isFinite(Number(raw.index))?Number(raw.index):null,
      address:raw.address||null,
      char_index:Number.isFinite(Number(raw.char_index))?Number(raw.char_index):null,
      source_progress:Number.isFinite(Number(raw.source_progress))?clamp(Number(raw.source_progress),0,1):null,
      wpm:Number.isFinite(Number(raw.wpm))?clamp(Math.round(Number(raw.wpm)),MIN_WPM,MAX_WPM):null
    }:null;
    sessionStorage.setItem('field.aperture.handoff.v01',JSON.stringify({source,label:opt.label||'Handoff',created_at:new Date().toISOString(),from:opt.from||location.pathname,focus}));
  }catch(_){}
 }
};
})();