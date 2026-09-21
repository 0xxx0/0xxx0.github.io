(()=>{'use strict';
const F=globalThis.TriangleFormCore;if(!F)throw new Error('TriangleFormCore missing');
const K='triangle-unified-v1';
const IDS=['A','B','C','AB','BC','CA','I','O'];
const TYPES={A:'VERTEX / ENTITY',B:'VERTEX / ENTITY',C:'VERTEX / ENTITY',AB:'EDGE / RELATION',BC:'EDGE / RELATION',CA:'EDGE / RELATION',I:'INTERIOR / COMPOSITION',O:'OUTSIDE / CONTEXT'};
const PRESETS={
  message:{A:['SIGNAL','what matters'],B:['BOUND','what must stay true'],C:['ASK','what you want back'],AB:['CONSTRAIN',''],BC:['RETURN',''],CA:['ORIENT',''],I:['MSG','→'],O:['LACONIC / ICONIC','']},
  return:{A:['BEFORE','state₀'],B:['ACT','Δ'],C:['AFTER','state₁'],AB:['INTERVENE',''],BC:['OBSERVE',''],CA:['COMPARE',''],I:['RETURN','Δ'],O:['EVIDENCE LOOP','']},
  field:{A:['OBJECT',''],B:['OPERATION',''],C:['CHANGED OBJECT',''],AB:['ADDRESS',''],BC:['RETURN',''],CA:['PROVE',''],I:['DELTA',''],O:['FIELD','']},
  blank:{A:['A',''],B:['B',''],C:['C',''],AB:['A↔B',''],BC:['B↔C',''],CA:['C↔A',''],I:['I',''],O:['CONTEXT','']}
};
const $=id=>document.getElementById(id);
const clone=x=>JSON.parse(JSON.stringify(x));
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const norm=a=>{const z=a.reduce((x,y)=>x+y,0)||1;return a.map(x=>x/z)};
function emptyGlyph(p){const g={};for(const id of IDS){const x=PRESETS[p][id];g[id]={label:x[0],value:x[1],indicated:false,unknown:false}}return g}
let S={version:'triangle-unified/v1',mode:'GLYPH',selected:'A',preset:'message',glyph:emptyGlyph('message'),forms:{},formSelected:{},formTrace:{},power:{A:'2',B:'3',C:'8',unknown:'C'},weights:[.33,.33,.34],returns:[]};
try{const old=JSON.parse(localStorage.getItem(K)||'null');if(old?.version===S.version)S={...S,...old}}catch(_){}
function save(){try{localStorage.setItem(K,JSON.stringify(S))}catch(_){}}
function payload(id){const x=S.glyph[id];return x.unknown?'?':(x.value||'∅')}
function compact(){const v=id=>{const x=S.glyph[id];return(x.indicated?'!':'')+(x.label||id)+':'+(x.unknown?'?':(x.value||'·'))};return '△{'+v('A')+' | '+v('B')+' | '+v('C')+'} ['+v('AB')+' / '+v('BC')+' / '+v('CA')+'] ⊙'+v('I')+' @'+v('O')}
function setPreset(p){S.preset=p;S.glyph=emptyGlyph(p);render()}
function rotateGlyph(){
  const g=S.glyph,[a,b,c,ab,bc,ca]=[g.A,g.B,g.C,g.AB,g.BC,g.CA];
  g.A=c;g.B=a;g.C=b;g.AB=ca;g.BC=ab;g.CA=bc;
  const m={A:'B',B:'C',C:'A',AB:'BC',BC:'CA',CA:'AB',I:'I',O:'O'};S.selected=m[S.selected]||S.selected;render()
}
function renderRelational(){
  for(const id of IDS){const n=document.querySelector('[data-id="'+id+'"]');if(!n)continue;const x=S.glyph[id];n.classList.toggle('sel',id===S.selected);n.classList.toggle('indicated',!!x.indicated);n.classList.toggle('unknown',!!x.unknown)}
  for(const id of ['A','B','C','I']){$(id+'L').textContent=S.glyph[id].label;$(id+'V').textContent=payload(id)}
  for(const id of ['AB','BC','CA'])$(id+'L').textContent=S.glyph[id].label;
  $('OL').textContent=S.glyph.O.label+(S.glyph.O.value?' · '+payload('O'):'');
}
function renderGlyphPanel(){
  const x=S.glyph[S.selected];$('editTitle').textContent=x.label||S.selected;$('locusType').textContent=S.selected+' · '+TYPES[S.selected];
  $('labelInput').value=x.label;$('valueInput').value=x.value;$('indicateBtn').textContent=x.indicated?'INDICATED':'INDICATE';$('unknownBtn').textContent=x.unknown?'UNKNOWN ACTIVE':'UNKNOWN ?';$('compact').textContent=compact();
  document.querySelectorAll('[data-preset]').forEach(b=>b.classList.toggle('on',b.dataset.preset===S.preset));
}
function formRoot(){if(!S.forms[S.selected])S.forms[S.selected]=[];if(!S.formTrace[S.selected])S.formTrace[S.selected]=[];return S.forms[S.selected]}
const pathKey=p=>p.join('.');
function getMark(root,path){let region=root,mark=null;for(const idx of path){mark=region[idx];if(!mark)return null;region=mark.children}return mark}
function regionAt(root,path){let region=root;for(const idx of path){const m=region[idx];if(!m)return null;region=m.children}return region}
function parentRegion(root,path){return path.length<=1?root:getMark(root,path.slice(0,-1)).children}
const serializeRegion=F.serialize;
function redexes(root=formRoot()){return F.redexes(root)}
function applyRedex(r,root=formRoot(),record=true){
  const x=F.apply(root,r);if(!x)return false;
  if(record)S.formTrace[S.selected].unshift(x);
  return true;
}
function normalizedCopy(){return F.normalize(formRoot()).root}
function formValue(){return F.normalize(formRoot()).value}
function renderFormMark(mark,path,calls,cross){
  const key=pathKey(path);let cls='formMark';if(S.formSelected[S.selected]===key)cls+=' selected';if(calls.has(key))cls+=' redexCall';if(cross.has(key))cls+=' redexCross';
  return '<div class="'+cls+'" data-formpath="'+key+'">'+(mark.children.length?'<div class="formRegion">'+mark.children.map((m,i)=>renderFormMark(m,path.concat(i),calls,cross)).join('')+'</div>':'<span class="formEmpty">MARK</span>')+'</div>';
}
function renderForm(){
  const root=formRoot(),rs=redexes(),calls=new Set(),cross=new Set();
  for(const r of rs){if(r.kind==='CALL'){calls.add(pathKey(r.path.concat(r.index)));calls.add(pathKey(r.path.concat(r.index+1)))}else cross.add(pathKey(r.path.concat(r.index)))}
  $('formRoot').innerHTML=root.length?root.map((m,i)=>renderFormMark(m,[i],calls,cross)).join(''):'<span class="formEmpty">UNMARKED SPACE · + INSIDE draws the first mark</span>';
  document.querySelectorAll('[data-formpath]').forEach(n=>n.onclick=e=>{e.stopPropagation();S.formSelected[S.selected]=n.dataset.formpath;renderForm()});
  $('formSerial').textContent=serializeRegion(root)||'[unmarked]';$('formLocus').textContent=S.selected+' · '+TYPES[S.selected]+' · '+formValue();
  const tr=S.formTrace[S.selected]||[];$('formTrace').innerHTML=tr.length?tr.slice(0,12).map(x=>'<div><b>'+esc(x.rule)+'</b> '+esc(x.before||'[blank]')+' → '+esc(x.after||'[blank]')+'</div>').join(''):'<div>No rewrites yet.</div>';
  $('stepForm').disabled=!rs.length;$('normalizeForm').disabled=!rs.length;
}
function addInside(){
  const root=formRoot(),key=S.formSelected[S.selected];
  if(!key){root.push({children:[]});S.formSelected[S.selected]=String(root.length-1)}
  else{const path=key.split('.').map(Number),m=getMark(root,path);if(m){m.children.push({children:[]});S.formSelected[S.selected]=pathKey(path.concat(m.children.length-1))}}
  render();
}
function addBeside(){
  const root=formRoot(),key=S.formSelected[S.selected];
  if(!key){root.push({children:[]});S.formSelected[S.selected]=String(root.length-1)}
  else{const path=key.split('.').map(Number),region=parentRegion(root,path),idx=path.at(-1);region.splice(idx+1,0,{children:[]});path[path.length-1]=idx+1;S.formSelected[S.selected]=pathKey(path)}
  render();
}
function deleteMark(){const key=S.formSelected[S.selected];if(!key)return;const root=formRoot(),path=key.split('.').map(Number),region=parentRegion(root,path);region.splice(path.at(-1),1);S.formSelected[S.selected]=null;render()}
function stepForm(){const r=redexes()[0];if(r)applyRedex(r);S.formSelected[S.selected]=null;render()}
function normalizeForm(){let guard=0;while(guard++<200){const r=redexes()[0];if(!r)break;applyRedex(r)}S.formSelected[S.selected]=null;render()}
const fmt=x=>Math.abs(x-Math.round(x))<1e-10?String(Math.round(x)):Number(x.toFixed(8)).toString();
function solvePower(){
  const p=S.power,u=p.unknown,A=parseFloat(p.A),B=parseFloat(p.B),C=parseFloat(p.C);
  let out={text:'—',note:'INSUFFICIENT / NON-REAL INPUT'};
  if(u==='C'&&Number.isFinite(A)&&Number.isFinite(B)){const v=Math.pow(A,B);out={text:A+' ^ '+B+' = '+fmt(v),note:'RESULT missing → EXPONENTIATION'}}
  if(u==='B'&&A>0&&A!==1&&C>0){const e=Math.log(C)/Math.log(A);out={text:'log_'+A+'('+C+') = '+fmt(e),note:'EXPONENT missing → LOGARITHM'}}
  if(u==='A'&&Number.isFinite(B)&&B!==0&&C>=0){const b=Math.pow(C,1/B);out={text:B+'√'+C+' = '+fmt(b),note:'BASE missing → ROOT'}}
  return out;
}
function renderPower(){
  const p=S.power;
  S.glyph.A={label:'BASE',value:p.A,unknown:p.unknown==='A',indicated:false};S.glyph.B={label:'EXP',value:p.B,unknown:p.unknown==='B',indicated:false};S.glyph.C={label:'RESULT',value:p.C,unknown:p.unknown==='C',indicated:false};
  S.glyph.AB={label:'ROOT',value:'',unknown:false,indicated:false};S.glyph.BC={label:'POWER',value:'',unknown:false,indicated:false};S.glyph.CA={label:'LOG',value:'',unknown:false,indicated:false};S.glyph.I={label:'RELATION',value:'=',unknown:false,indicated:false};S.glyph.O={label:'bᵉ = p',value:'',unknown:false,indicated:false};
  renderRelational();$('baseInput').value=p.A;$('expInput').value=p.B;$('resultInput').value=p.C;
  document.querySelectorAll('[data-unknown]').forEach(b=>b.classList.toggle('on',b.dataset.unknown===p.unknown));
  const s=solvePower();$('powerSolve').innerHTML=esc(s.text)+'<small>'+esc(s.note)+'</small>';
}
const VA={x:350,y:82},VB={x:92,y:520},VC={x:608,y:520};
const bary=w=>({x:w[0]*VA.x+w[1]*VB.x+w[2]*VC.x,y:w[0]*VA.y+w[1]*VB.y+w[2]*VC.y});
function weightsFromPoint(p){const d=(VB.y-VC.y)*(VA.x-VC.x)+(VC.x-VB.x)*(VA.y-VC.y),a=((VB.y-VC.y)*(p.x-VC.x)+(VC.x-VB.x)*(p.y-VC.y))/d,b=((VC.y-VA.y)*(p.x-VC.x)+(VA.x-VC.x)*(p.y-VC.y))/d,c=1-a-b;return norm([Math.max(0,a),Math.max(0,b),Math.max(0,c)])}
function drawGrid(){
  const g=$('gridLines');for(const t of [.2,.4,.6,.8]){for(const pair of [[[t,0,1-t],[t,1-t,0]],[[0,t,1-t],[1-t,t,0]],[[0,1-t,t],[1-t,0,t]]]){const a=bary(pair[0]),b=bary(pair[1]),l=document.createElementNS('http://www.w3.org/2000/svg','line');l.setAttribute('x1',a.x);l.setAttribute('y1',a.y);l.setAttribute('x2',b.x);l.setAttribute('y2',b.y);l.setAttribute('class','gridline');g.appendChild(l)}}
}
const benchCandidates=[{label:'SHIP / USE',profile:[1,.15,.4],note:'cash out something already understood'},{label:'RECOVER / EXPLORE',profile:[.25,1,.55],note:'surface missing structure or option value'},{label:'VERIFY / PROVE',profile:[.35,.35,1],note:'reduce uncertainty with evidence'}];
function renderBench(){
  const w=S.weights,p=bary(w),g=$('pointer'),ls=g.querySelectorAll('line'),c=g.querySelector('circle');
  c.setAttribute('cx',p.x);c.setAttribute('cy',p.y);ls[0].setAttribute('x1',p.x-10);ls[0].setAttribute('x2',p.x+10);ls[0].setAttribute('y1',p.y);ls[0].setAttribute('y2',p.y);ls[1].setAttribute('x1',p.x);ls[1].setAttribute('x2',p.x);ls[1].setAttribute('y1',p.y-10);ls[1].setAttribute('y2',p.y+10);$('weightLabel').setAttribute('x',p.x);$('weightLabel').setAttribute('y',p.y+28);$('weightLabel').textContent=w.map(x=>Math.round(x*100)).join(' / ');
  $('wA').textContent=Math.round(w[0]*100)+'%';$('wB').textContent=Math.round(w[1]*100)+'%';$('wC').textContent=Math.round(w[2]*100)+'%';
  const rows=benchCandidates.map(x=>({...x,score:x.profile.reduce((s,v,i)=>s+v*w[i],0)})).sort((a,b)=>b.score-a.score);
  $('candidates').innerHTML=rows.map((x,i)=>'<div class="candidate '+(i===0?'win':'')+'"><div><b>'+esc(x.label)+'</b><small>'+esc(x.note)+'</small></div><i>'+x.score.toFixed(3)+'</i></div>').join('');
}
function drawMode(){
  const bench=S.mode==='BENCH';$('relational').hidden=bench;$('simplex').hidden=!bench;$('rotate').disabled=S.mode==='FORM'||bench;
  $('glyphPanel').hidden=S.mode!=='GLYPH';$('formPanel').hidden=S.mode!=='FORM';$('powerPanel').hidden=S.mode!=='POWER';$('benchPanel').hidden=!bench;
  document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('on',b.dataset.mode===S.mode));
  const hints={GLYPH:'GLYPH · entities at vertices · relations on edges · composition inside · frame outside',FORM:'FORM · one mark lives at the selected locus · CALL / CROSS rewrite locally',POWER:'POWER · missing corner selects exponentiation / logarithm / root',BENCH:'BENCH · direct simplex over one 100% attention budget'};
  $('modeHint').textContent=hints[S.mode];$('status').textContent=S.mode==='FORM'?'FORM · '+formValue():S.mode==='POWER'?'POWER · '+S.power.unknown+' UNKNOWN':S.mode==='BENCH'?'SIMPLEX · 2 DOF':'8 LOCI · 3+3+1+1';
}
function render(){
  drawMode();
  if(S.mode==='BENCH')renderBench();else if(S.mode==='POWER')renderPower();else{renderRelational();if(S.mode==='GLYPH')renderGlyphPanel();if(S.mode==='FORM')renderForm()}
  $('resultBadge').innerHTML='<b>'+esc(S.selected)+'</b> · '+esc(S.mode==='FORM'?formValue():TYPES[S.selected]);renderReturns();save();
}
function renderReturns(){const xs=S.returns||[];$('returns').innerHTML=xs.length?xs.slice(0,10).map(r=>'<div><b>'+esc(r.mode)+'</b> · '+esc(r.at)+' · '+esc(r.address)+'</div>').join(''):'<div>No returns yet.</div>'}
function receipt(){
  let data;if(S.mode==='GLYPH')data={glyph:clone(S.glyph),compact:compact()};else if(S.mode==='FORM')data={locus:S.selected,expression:serializeRegion(formRoot()),value:formValue(),trace:clone(S.formTrace[S.selected]||[])};else if(S.mode==='POWER')data={power:clone(S.power),solution:solvePower()};else data={weights:S.weights.slice()};
  return{schema:'triangle-return/v1',at:new Date().toISOString(),mode:S.mode,address:'triangle://'+S.mode.toLowerCase()+'/'+(S.mode==='BENCH'?'simplex':S.selected),payload:data};
}
function copyText(){if(S.mode==='GLYPH')return compact();if(S.mode==='FORM')return'SFORM '+S.selected+' '+(serializeRegion(formRoot())||'[unmarked]')+' → '+formValue();if(S.mode==='POWER'){const s=solvePower();return'△ POWER · '+s.text+' · '+s.note}return'△ BENCH · '+S.weights.map(x=>Math.round(x*100)).join('/')+' · EXPLOIT/EXPLORE/PROVE'}
function stateLink(){const p={mode:S.mode,selected:S.selected,preset:S.preset,glyph:S.glyph,forms:S.forms,power:S.power,weights:S.weights};return location.origin+location.pathname+'#'+encodeURIComponent(JSON.stringify(p))}
function restoreHash(){if(!location.hash)return;try{const x=JSON.parse(decodeURIComponent(location.hash.slice(1)));if(x?.mode)for(const k of ['mode','selected','preset','glyph','forms','power','weights'])if(x[k]!==undefined)S[k]=x[k]}catch(_){}}
restoreHash();
document.querySelectorAll('.locusShape').forEach(n=>n.addEventListener('click',e=>{e.stopPropagation();S.selected=n.dataset.id;render()}));
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{S.mode=b.dataset.mode;window.FieldSignals?.choice('triangle-mode',S.mode,{source:'direct'});render()});
document.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>setPreset(b.dataset.preset));
$('labelInput').oninput=function(){S.glyph[S.selected].label=this.value;render()};$('valueInput').oninput=function(){const x=S.glyph[S.selected];x.value=this.value;x.unknown=false;render()};
$('indicateBtn').onclick=()=>{S.glyph[S.selected].indicated=!S.glyph[S.selected].indicated;render()};$('unknownBtn').onclick=()=>{S.glyph[S.selected].unknown=!S.glyph[S.selected].unknown;render()};$('blankBtn').onclick=()=>{S.glyph[S.selected].value='';S.glyph[S.selected].unknown=false;render()};
$('inside').onclick=addInside;$('beside').onclick=addBeside;$('deleteMark').onclick=deleteMark;$('stepForm').onclick=stepForm;$('normalizeForm').onclick=normalizeForm;$('clearForm').onclick=()=>{S.forms[S.selected]=[];S.formTrace[S.selected]=[];S.formSelected[S.selected]=null;render()};
[['A','baseInput'],['B','expInput'],['C','resultInput']].forEach(([id,el])=>$(el).oninput=function(){S.power[id]=this.value;render()});
document.querySelectorAll('[data-unknown]').forEach(b=>b.onclick=()=>{S.power.unknown=b.dataset.unknown;render()});
$('rotate').onclick=()=>{if(S.mode==='GLYPH'||S.mode==='POWER')rotateGlyph()};
$('copy').onclick=async function(){try{await navigator.clipboard.writeText(copyText());const b=this;b.textContent='COPIED';setTimeout(()=>b.textContent='COPY',900)}catch(_){}};
$('share').onclick=async function(){const u=stateLink();history.replaceState(null,'',u);try{await navigator.clipboard.writeText(u);const b=this;b.textContent='LINK COPIED';setTimeout(()=>b.textContent='COPY LINK',900)}catch(_){}};
$('returnBtn').onclick=()=>{const r=receipt();S.returns.unshift(r);if(S.returns.length>40)S.returns.length=40;window.FieldSignals?.emit('return',{instrument:'triangle',mode:S.mode,address:r.address});render()};
$('exportBtn').onclick=()=>{const out={schema:'triangle-export/v1',exported_at:new Date().toISOString(),state:clone(S),return:receipt()},blob=new Blob([JSON.stringify(out,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='triangle-'+S.mode.toLowerCase()+'-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
let drag=false;$('tri').addEventListener('pointerdown',e=>{if(S.mode!=='BENCH'||e.target.classList.contains('locusShape'))return;drag=true;$('tri').setPointerCapture(e.pointerId);moveBench(e)});$('tri').addEventListener('pointermove',e=>{if(drag)moveBench(e)});$('tri').addEventListener('pointerup',()=>drag=false);$('tri').addEventListener('pointercancel',()=>drag=false);
function moveBench(e){const r=$('tri').getBoundingClientRect(),p={x:(e.clientX-r.left)*700/r.width,y:(e.clientY-r.top)*610/r.height};S.weights=weightsFromPoint(p);render()}
drawGrid();render();
})();