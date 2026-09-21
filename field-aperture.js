(()=>{'use strict';
const NS='http://www.w3.org/2000/svg',enc=new TextEncoder();
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),mod=(n,m)=>((n%m)+m)%m;
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const splitParas=t=>String(t).split(/\n\s*\n+/).map(x=>x.trim()).filter(Boolean);
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
 if(mode==='sentence')return (raw.match(/[^.!?\n]+[.!?]+|[^.!?\n]+$/g)||[]).map(x=>{const text=x.trim(),start=raw.indexOf(x);return{text,start,end:start+x.length}}).filter(x=>x.text);
 if(mode==='grapheme'){let at=0;for(const ch of Array.from(raw)){const start=at;at+=ch.length;if(ch.trim())out.push({text:ch,start,end:at})}return out}
 for(const m of raw.matchAll(/\S+/g))out.push({text:m[0],start:m.index||0,end:(m.index||0)+m[0].length});return out
}
function preview(v,n=86){let s=typeof v==='string'?v:JSON.stringify(v);return s.length>n?s.slice(0,n-1)+'…':s}
function jsonNodes(root){
 const out=[];const seen=new WeakSet();
 function walk(v,path='$',depth=0,key='$'){
   const type=Array.isArray(v)?'array':v===null?'null':typeof v;
   const node={path,depth,key,type,value:v,leaf:v===null||typeof v!=='object'};
   out.push(node);
   if(v&&typeof v==='object'){
     if(seen.has(v))return;seen.add(v);
     if(Array.isArray(v))v.forEach((x,i)=>walk(x,path+'['+i+']',depth+1,String(i)));
     else Object.entries(v).forEach(([k,x])=>walk(x,path+'.'+k,depth+1,k));
   }
 }
 walk(root);return out;
}
function analyze(source,label='Untitled',locale='en'){
 let data=source,raw='',kind='TEXT';
 if(typeof source!=='string'){kind='JSON';data=source;raw=JSON.stringify(source,null,2)}
 else{raw=source;try{data=JSON.parse(source);kind='JSON'}catch(_){}}
 const bytes=enc.encode(raw).length,chars=raw.length;
 if(kind==='JSON'){
   const nodes=jsonNodes(data),maxDepth=Math.max(0,...nodes.map(n=>n.depth)),leaves=nodes.filter(n=>n.leaf);
   const scales=[{id:'ROOT',label:'ROOT',units:[nodes[0]]}];
   for(let d=1;d<=maxDepth;d++){const units=nodes.filter(n=>n.depth===d);if(units.length)scales.push({id:'L'+d,label:'LEVEL '+d,units})}
   if(leaves.length>1)scales.push({id:'LEAF',label:'LEAVES',units:leaves});
   return{kind,label,raw,data,bytes,chars,nodes,leaves:leaves.length,maxDepth,scales};
 }
 const words=segmentedUnits(raw,locale,'word'),sentences=segmentedUnits(raw,locale,'sentence'),graphemes=segmentedUnits(raw,locale,'grapheme'),paras=splitParas(raw);
 const unit=(text,i,type)=>({path:type.toLowerCase()+'://'+i,key:String(i+1),type,value:text,text,leaf:true});
 const scales=[
  {id:'DOC',label:'DOCUMENT',units:[unit(raw,0,'DOC')]},
  {id:'PARA',label:'PARAGRAPH',units:paras.map((x,i)=>unit(x,i,'PARA'))},
  {id:'SENT',label:'SENTENCE',units:sentences.map((x,i)=>({...unit(x.text,i,'SENT'),start:x.start,end:x.end}))},
  {id:'WORD',label:'WORD',units:words.map((x,i)=>({...unit(x.text,i,'WORD'),start:x.start,end:x.end}))},
  {id:'GRAPHEME',label:'GRAPHEME',units:graphemes.map((x,i)=>({...unit(x.text,i,'GRAPHEME'),start:x.start,end:x.end}))}
 ].filter(x=>x.units.length);
 return{kind,label,locale,raw,data:raw,bytes,chars,words:words.length,sentences:sentences.length,graphemes:graphemes.length,paragraphs:paras.length,scales};
}
class FieldAperture extends HTMLElement{
 constructor(){super();this.attachShadow({mode:'open'});this.A=null;this.scale=0;this.pos=0;this.timer=null;this.rsvp=false;this.wpm=300;this.speaking=false;this.bound=this.onPointer.bind(this);this.boundKey=this.onKey.bind(this);this.ratePresets=[120,200,300,450,650,900,1200,1600,2200,3000]}
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
  this.stop();this.locale=String(opt.locale||this.getAttribute('lang')||document.documentElement.lang||navigator.language||'en');this.A=analyze(source,opt.label||'Untitled',this.locale);this.scale=this.scaleIndex(opt.scale);this.pos=0;
  const hit=this.locate(opt.address,this.scale);if(hit){this.scale=hit.scale;this.pos=hit.index}else{const i=Number(opt.index);if(Number.isFinite(i))this.pos=clamp(Math.round(i),0,Math.max(0,this.currentScale().units.length-1))}
  const w=Number(opt.wpm);if(Number.isFinite(w))this.wpm=clamp(Math.round(w),60,3000);this.render();this.emit();return this.snapshot()
 }
 restore(snap={}){
  if(!this.A)return null;this.stop();this.scale=this.scaleIndex(snap.scale);const hit=this.locate(snap.address,this.scale);
  if(hit){this.scale=hit.scale;this.pos=hit.index}else{const i=Number(snap.index);this.pos=Number.isFinite(i)?clamp(Math.round(i),0,Math.max(0,this.currentScale().units.length-1)):0}
  const w=Number(snap.wpm);if(Number.isFinite(w))this.wpm=clamp(Math.round(w),60,3000);this.render();this.emit();return this.snapshot()
 }
 currentScale(){return this.A?.scales[this.scale]}
 current(){const s=this.currentScale();return s?.units[clamp(this.pos,0,Math.max(0,s.units.length-1))]||null}
 setScale(i){if(!this.A)return;this.scale=mod(i,this.A.scales.length);this.pos=clamp(this.pos,0,Math.max(0,this.currentScale().units.length-1));this.render();this.emit()}
 setPos(i){const s=this.currentScale();if(!s)return;this.pos=mod(i,s.units.length);this.render();this.emit()}
 step(n=1){this.setPos(this.pos+n)}
 setWpm(n){const was=!!this.timer;this.wpm=clamp(Math.round(Number(n)||300),60,3000);if(was){clearTimeout(this.timer);this.timer=null;this.scheduleRSVP()}this.render();this.emit()}
 nudgeWpm(dir){const ps=this.ratePresets,i=ps.findIndex(x=>x>=this.wpm),base=i<0?ps.length-1:i,next=clamp(base+(dir>0?(ps[base]===this.wpm?1:0):-1),0,ps.length-1);this.setWpm(ps[next])}
 cycleWpm(){const ps=this.ratePresets,i=ps.findIndex(x=>x>this.wpm);this.setWpm(ps[i<0?0:i])}
 onKey(e){if(e.target&&/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(e.key===' '){e.preventDefault();this.toggleRSVP()}else if(e.key==='ArrowUp'){e.preventDefault();this.nudgeWpm(1)}else if(e.key==='ArrowDown'){e.preventDefault();this.nudgeWpm(-1)}else if(e.key==='ArrowRight'){e.preventDefault();this.step(1)}else if(e.key==='ArrowLeft'){e.preventDefault();this.step(-1)}}
 material(){const s=this.currentScale(),n=Math.max(1,s?.units.length||1),progress=n<=1?0:this.pos/(n-1),scaleFrac=this.A?.scales?.length>1?this.scale/(this.A.scales.length-1):0,mag=this.magnitude(),depth=this.A?.kind==='JSON'&&s?.id?.startsWith('L')?Number(s.id.slice(1))||0:this.scale;return{progress,scale:scaleFrac,magnitude:clamp(mag.decades/12,0,1),depth,kind:this.A?.kind||'NONE',x:(12+progress*76).toFixed(2)+'%',y:(18+scaleFrac*64).toFixed(2)+'%',angle:(20+progress*140).toFixed(1)+'deg',spacing:(18+mag.decades*3).toFixed(1)+'px',strength:(.035+.075*(.35+scaleFrac*.65)).toFixed(3)}}
 applyMaterial(){const m=this.material(),apply=t=>{if(!t)return;t.style.setProperty('--ap-progress',m.progress);t.style.setProperty('--ap-scale',m.scale);t.style.setProperty('--ap-magnitude',m.magnitude);t.style.setProperty('--ap-x',m.x);t.style.setProperty('--ap-y',m.y);t.style.setProperty('--ap-angle',m.angle);t.style.setProperty('--ap-spacing',m.spacing);t.style.setProperty('--ap-strength',m.strength);t.dataset.apertureKind=m.kind;t.dataset.apertureScale=this.currentScale()?.id||'NONE'};apply(this);const sel=this.getAttribute('material-target');if(sel){try{apply(document.querySelector(sel))}catch(_){}}return m}
 emit(){const snap=this.snapshot();this.dispatchEvent(new CustomEvent('aperture-focus',{detail:snap,bubbles:true}));this.dispatchEvent(new CustomEvent('aperture-material',{detail:snap.material,bubbles:true}))}
 snapshot(){const c=this.current(),s=this.currentScale();return{schema:'field-aperture-focus/v0.2',kind:this.A?.kind,label:this.A?.label,locale:this.A?.locale||this.locale||null,bytes:this.A?.bytes,scale:s?.id,scale_label:s?.label,index:this.pos,count:s?.units.length,address:c?.path||null,focus:typeof c?.value==='string'?c.value:preview(c?.value,240),wpm:this.wpm,playing:this.rsvp,loop:this.hasAttribute('loop'),material:this.material()}}
 magnitude(){
   const b=Math.max(1,this.A?.bytes||1),log=Math.log10(b),decades=clamp(log,0,12),gap=7+(decades/12)*26;
   const exp=Math.floor(log),mant=b/Math.pow(10,exp);
   const human=b<1024?b+' B':b<1048576?(b/1024).toFixed(1)+' KB':b<1073741824?(b/1048576).toFixed(1)+' MB':b<1099511627776?(b/1073741824).toFixed(1)+' GB':(b/1099511627776).toFixed(1)+' TB';
   return{gap,log,decades,band:'10^'+exp+' B',human,mant}
 }
 renderShell(){
 this.shadowRoot.innerHTML=`<style>
 :host{--fa-bg:#080b0d;--fa-ink:#edf1ef;--fa-mut:#77858b;--fa-line:#2a3439;--fa-hot:#ed7447;--fa-cool:#72bce7;display:block;color:var(--fa-ink);font:10px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace}
 *{box-sizing:border-box}button{font:inherit;border-radius:0}.ap{display:grid;grid-template-columns:auto minmax(0,1fr);gap:9px;border:1px solid var(--fa-line);background:var(--fa-bg);padding:7px;min-height:126px}
 .dial{width:112px;height:112px;touch-action:none;user-select:none}.dial svg{width:100%;height:100%;display:block}.ring{fill:none;stroke:#46545a}.outer{stroke-width:2}.inner{stroke-width:2}.mag{stroke:#20292d;fill:none}.tick{stroke:var(--fa-hot);stroke-width:3;stroke-linecap:square}.scaleTick{stroke:var(--fa-cool);stroke-width:3}.gate{stroke:#fff;stroke-width:1.3;opacity:.8}.center{fill:#0d1316;stroke:#334047}.word{fill:var(--fa-ink);font:800 11px system-ui,sans-serif;text-anchor:middle}.tiny{fill:var(--fa-mut);font-size:5.5px;text-anchor:middle}
 .body{min-width:0;display:flex;flex-direction:column}.top{display:flex;justify-content:space-between;gap:8px}.ey{font-size:6.5px;letter-spacing:.12em;color:var(--fa-hot)}.size{font-size:6.5px;color:var(--fa-mut)}.focus{font:800 17px/1.05 system-ui,sans-serif;letter-spacing:-.03em;margin:8px 0 2px;word-break:break-word;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.addr{color:var(--fa-cool);font-size:6.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 .meter{height:2px;background:#1c2529;margin:7px 0;position:relative}.meter i{display:block;height:100%;background:var(--fa-hot);width:0}
 .controls{display:flex;gap:3px;flex-wrap:wrap;margin-top:auto}.controls button{border:1px solid var(--fa-line);background:#090d0f;color:var(--fa-ink);padding:5px 6px;font-size:6.5px}.controls button:hover{border-color:#69777d}.controls .hot{border-color:var(--fa-hot);color:#ffd0bd}.rate{color:var(--fa-cool)!important;min-width:55px}.speed{color:var(--fa-mut)!important;padding-inline:7px!important}
 @media(max-width:520px){.ap{grid-template-columns:82px minmax(0,1fr);padding:5px;gap:6px;min-height:94px}.dial{width:82px;height:82px}.focus{font-size:13px;margin-top:4px}.controls button{padding:4px 5px}.controls .secondary{display:none}}
 </style><div class="ap"><div class="dial"><svg viewBox="0 0 120 120" aria-label="Scale and focus dials"><circle class="mag" cx="60" cy="60" r="51"/><circle class="ring outer" cx="60" cy="60" r="50"/><circle class="ring inner" id="inner" cx="60" cy="60" r="37"/><line class="gate" x1="60" y1="2" x2="60" y2="17"/><line class="tick" id="posTick" x1="60" y1="8" x2="60" y2="17"/><line class="scaleTick" id="scaleTick" x1="60" y1="25" x2="60" y2="34"/><circle class="center" cx="60" cy="60" r="25"/><text class="word" id="centerWord" x="60" y="59">—</text><text class="tiny" id="centerMeta" x="60" y="69">—</text></svg></div><div class="body"><div class="top"><div class="ey" id="ey">APERTURE</div><div class="size" id="size">—</div></div><div class="focus" id="focus">Load a source</div><div class="addr" id="addr">—</div><div class="meter"><i id="meter"></i></div><div class="controls"><button id="scaleDown">− SCALE</button><button id="prev">←</button><button class="hot" id="rsvp">▶ RSVP</button><button id="next">→</button><button id="scaleUp">SCALE +</button><button class="speed" id="slower" title="slower · ↓">− WPM</button><button class="rate" id="rate" title="cycle speed presets">300</button><button class="speed" id="faster" title="faster · ↑">WPM +</button><button class="secondary" id="speak">SPEAK</button><button class="secondary" id="stop">STOP</button></div></div></div>`;
 const q=id=>this.shadowRoot.getElementById(id);
 q('scaleDown').onclick=()=>this.setScale(this.scale-1);q('scaleUp').onclick=()=>this.setScale(this.scale+1);q('prev').onclick=()=>this.step(-1);q('next').onclick=()=>this.step(1);q('rsvp').onclick=()=>this.toggleRSVP();q('slower').onclick=()=>this.nudgeWpm(-1);q('faster').onclick=()=>this.nudgeWpm(1);q('rate').onclick=()=>this.cycleWpm();q('speak').onclick=()=>this.speak();q('stop').onclick=()=>this.stop();this.shadowRoot.querySelector('svg').addEventListener('pointerdown',this.bound);
 }
 anglePoint(cx,cy,r,a){return{x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r}}
 setLine(el,r,a,len=9){const p1=this.anglePoint(60,60,r-len/2,a),p2=this.anglePoint(60,60,r+len/2,a);el.setAttribute('x1',p1.x);el.setAttribute('y1',p1.y);el.setAttribute('x2',p2.x);el.setAttribute('y2',p2.y)}
 onPointer(e){
  if(!this.A)return;const svg=e.currentTarget,box=svg.getBoundingClientRect(),x=(e.clientX-box.left)/box.width*120-60,y=(e.clientY-box.top)/box.height*120-60,r=Math.hypot(x,y),a=Math.atan2(y,x)+Math.PI/2;if(a<0)a+=Math.PI*2;
  const mag=this.magnitude(),innerR=50-mag.gap;
  if(Math.abs(r-50)<Math.abs(r-innerR)){const s=this.currentScale();this.setPos(Math.round(a/(Math.PI*2)*Math.max(1,s.units.length)))}else this.setScale(Math.round(a/(Math.PI*2)*Math.max(1,this.A.scales.length)));
 }
 render(){
  if(!this.A)return;const q=id=>this.shadowRoot.getElementById(id),s=this.currentScale(),c=this.current(),mag=this.magnitude(),n=s.units.length,frac=n<=1?0:this.pos/(n-1),a=-Math.PI/2+frac*Math.PI*2,sa=-Math.PI/2+(this.A.scales.length<=1?0:this.scale/(this.A.scales.length-1))*Math.PI*2,innerR=50-mag.gap;
  q('inner').setAttribute('r',innerR);this.setLine(q('posTick'),50,a,10);this.setLine(q('scaleTick'),innerR,sa,9);
  const val=c?.value,focus=typeof val==='string'?val:preview(val,160),center=(typeof val==='string'?val:(c?.key||c?.path||'—')).trim();
  q('centerWord').textContent=center.length>15?center.slice(0,14)+'…':center||'—';q('centerMeta').textContent=s.label+' · '+(this.pos+1)+'/'+n;
  q('ey').textContent=this.A.kind+' · '+s.label;q('size').textContent=mag.human+' · '+mag.band;q('focus').textContent=focus||'(empty)';q('addr').textContent=c?.path||s.id+'://'+this.pos;q('meter').style.width=(frac*100)+'%';q('rate').textContent=this.wpm;q('rsvp').textContent=this.rsvp?'Ⅱ RSVP':'▶ RSVP';this.applyMaterial();
 }
 dwell(){const c=this.current(),txt=typeof c?.value==='string'?c.value:String(c?.key||''),base=60000/this.wpm;let f=1;if(/[.!?][”"'’)]*$/.test(txt))f=1.8;else if(/[,;:][”"'’)]*$/.test(txt))f=1.35;if(txt.length>10)f*=Math.min(1.5,1+(txt.length-10)*.018);return Math.max(20,base*f)}
 scheduleRSVP(){if(!this.A||!this.rsvp)return;this.timer=setTimeout(()=>{this.timer=null;const s=this.currentScale();if(!s){this.rsvp=false;return}if(!this.hasAttribute('loop')&&this.pos>=s.units.length-1){this.rsvp=false;this.render();this.emit();return}this.step(1);if(this.A&&this.rsvp)this.scheduleRSVP()},this.dwell());this.render()}
 toggleRSVP(){if(this.rsvp){this.rsvp=false;if(this.timer){clearTimeout(this.timer);this.timer=null}this.render();this.emit();return}let s=this.currentScale();if(!s)return;if(s.units.length<2){let preferred=this.A.kind==='TEXT'?this.A.scales.findIndex(x=>x.id==='WORD'&&x.units.length>1):this.A.scales.findIndex(x=>x.units.length>1);if(preferred<0&&this.A.kind==='TEXT')preferred=this.A.scales.findIndex(x=>x.id==='GRAPHEME'&&x.units.length>1);if(preferred>=0){this.scale=preferred;this.pos=0;s=this.currentScale()}}if(!s||s.units.length<2)return;if(!this.hasAttribute('loop')&&this.pos>=s.units.length-1){this.pos=0;this.render();this.emit()}this.rsvp=true;this.render();this.emit();this.scheduleRSVP()}
 stop(){const changed=this.rsvp||!!this.timer||this.speaking;this.rsvp=false;if(this.timer){clearTimeout(this.timer);this.timer=null}if('speechSynthesis'in window)window.speechSynthesis.cancel();this.speaking=false;this.render();if(changed&&this.A)this.emit()}
 speak(){
   if(!this.A||!('speechSynthesis'in window)||!('SpeechSynthesisUtterance'in window))return;
   window.speechSynthesis.cancel();
   if(this.A.kind==='TEXT'){
     const wi=this.A.scales.findIndex(x=>x.id==='WORD');if(wi>=0){this.scale=wi;this.pos=0}
     const u=new SpeechSynthesisUtterance(this.A.raw);u.rate=1.7;u.onboundary=e=>{if(e.name&&e.name!=='word')return;const s=this.currentScale();if(s?.id!=='WORD')return;const i=s.units.findIndex(x=>x.start<=e.charIndex&&e.charIndex<x.end);if(i>=0){this.pos=i;this.render();this.emit()}};u.onend=()=>{this.speaking=false;this.render()};this.speaking=true;window.speechSynthesis.speak(u);this.render();return;
   }
   const c=this.current(),txt=(c?.key?c.key+' ':'')+(typeof c?.value==='string'?c.value:preview(c?.value,320));const u=new SpeechSynthesisUtterance(txt);u.rate=1.5;window.speechSynthesis.speak(u);
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
 handoff(source,opt={}){try{sessionStorage.setItem('field.aperture.handoff.v01',JSON.stringify({source,label:opt.label||'Handoff',created_at:new Date().toISOString(),from:opt.from||location.pathname}))}catch(_){}}
};
})();