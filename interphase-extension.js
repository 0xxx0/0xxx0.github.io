(()=>{'use strict';
if(!globalThis.Interphase||!globalThis.InterphaseDOM||!globalThis.InterphaseGlyph||globalThis.__INTERPHASE_EXTENSION__)return;
globalThis.__INTERPHASE_EXTENSION__=true;
const I=globalThis.Interphase,DOM=globalThis.InterphaseDOM,G=globalThis.InterphaseGlyph;
const adapter=DOM.create(document),host=I.createHost(adapter,{id:'browser-dom'});
let active=false,hover=null;
const marked=new Set();

const shell=document.createElement('div');shell.id='interphase-extension-root';
shell.style.cssText='all:initial;position:fixed;inset:0;pointer-events:none;z-index:2147483647';
const shadow=shell.attachShadow({mode:'open'});document.documentElement.appendChild(shell);
shadow.innerHTML=`<style>
:host,*{box-sizing:border-box}button,input,textarea{font:inherit;border-radius:0}
#toggle{pointer-events:auto;position:fixed;right:10px;bottom:10px;width:34px;height:34px;background:#090c0e;color:#d7ae67;border:1px solid #3a454a;font:700 15px ui-monospace,monospace;cursor:pointer}
#panel{display:none;pointer-events:auto;position:fixed;right:10px;bottom:52px;width:min(420px,calc(100vw - 20px));max-height:min(72vh,640px);overflow:auto;background:#080b0d;color:#edf1ef;border:1px solid #334047;box-shadow:0 8px 40px #000b;font:10px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace}
#panel.on{display:block}.head,.bar,.foot{display:flex;gap:5px;align-items:center;padding:6px;border-bottom:1px solid #263137}.head b{letter-spacing:.15em;color:#d7ae67}.head span{margin-left:auto;color:#7f8b90}.bar{flex-wrap:wrap}.bar button,.foot button{background:#0d1215;color:#91a0a6;border:1px solid #2d3a40;padding:4px 6px;cursor:pointer}.bar button.on{color:#d7ae67;border-color:#d7ae67}.bar button:hover,.foot button:hover{color:#fff}.body{padding:7px}.focus{border:1px solid #253138;padding:6px;margin-bottom:6px}.focus b{color:#73bce8}.focus small{display:block;color:#7f8b90;margin-top:3px;word-break:break-all}.stage{position:relative;min-height:110px;border:1px solid #202a2f;background:#07090a;overflow:hidden}.cards{display:flex;gap:5px;overflow:auto;padding:6px}.card{min-width:110px;max-width:170px;border:1px solid #2c383e;padding:5px;background:#0b0f11}.card b{display:block;color:#edf1ef;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.card i{font-style:normal;color:#708087;font-size:8px}.ring{position:relative;height:240px}.ring .card{position:absolute;width:100px;min-width:0;transform:translate(-50%,-50%)}.sixCarrier{position:relative;height:270px;perspective:800px;transform-style:preserve-3d;transition:transform .35s ease}.sixCarrier .office{position:absolute;width:112px;min-width:0;min-height:60px;transition:transform .35s ease,left .35s ease,right .35s ease,top .35s ease,bottom .35s ease}.sixCarrier[data-mode="flower"] .office[data-office="FOCUS"]{left:50%;top:50%;transform:translate(-50%,-50%)}.sixCarrier[data-mode="flower"] .office[data-office="SOURCE"]{left:50%;top:7%;transform:translateX(-50%)}.sixCarrier[data-mode="flower"] .office[data-office="FRAME"]{left:3%;top:39%}.sixCarrier[data-mode="flower"] .office[data-office="OPERATE"]{right:3%;top:39%}.sixCarrier[data-mode="flower"] .office[data-office="WITNESS"]{left:16%;bottom:5%}.sixCarrier[data-mode="flower"] .office[data-office="RETURN"]{right:16%;bottom:5%}.sixCarrier[data-mode="room"]{width:140px;height:140px;margin:64px auto 56px;transform:rotateX(-12deg) rotateY(25deg)}.sixCarrier[data-mode="room"] .office{width:140px;height:140px;min-height:0;overflow:hidden;background:#0b0f11ee}.sixCarrier[data-mode="room"] .office[data-office="FOCUS"]{transform:translateZ(70px)}.sixCarrier[data-mode="room"] .office[data-office="RETURN"]{transform:rotateY(180deg) translateZ(70px)}.sixCarrier[data-mode="room"] .office[data-office="FRAME"]{transform:rotateY(-90deg) translateZ(70px)}.sixCarrier[data-mode="room"] .office[data-office="OPERATE"]{transform:rotateY(90deg) translateZ(70px)}.sixCarrier[data-mode="room"] .office[data-office="SOURCE"]{transform:rotateX(90deg) translateZ(70px)}.sixCarrier[data-mode="room"] .office[data-office="WITNESS"]{transform:rotateX(-90deg) translateZ(70px)}.glyphs{display:flex;flex-wrap:wrap;gap:8px;padding:10px}.glyph{width:82px;text-align:center;color:#819096}.glyph svg{display:block;margin:auto;width:72px;height:72px}.res{margin-top:6px;color:#ed7245;font-size:8px}.edit{border-top:1px solid #202a2f;padding-top:6px;margin-top:6px}.edit textarea,.edit input{width:100%;background:#0b1012;color:#edf1ef;border:1px solid #2d3a40;padding:5px;margin-top:4px}.edit button{margin-top:4px;background:#10171a;color:#d7ae67;border:1px solid #4d4530;padding:4px 7px;cursor:pointer}.hover{position:fixed;pointer-events:none;max-width:280px;background:#080b0dee;color:#e9eeec;border:1px solid #73bce8;padding:5px 7px;font:9px/1.3 ui-monospace,monospace;display:none}.hover.on{display:block}.hint{color:#69777d;padding:5px 7px;border-top:1px solid #202a2f}.foot{border-top:1px solid #263137;border-bottom:0}.sp{flex:1}
</style>
<button id="toggle" title="INTERPHASE · click, or Alt+Shift+I">◎</button>
<div id="panel"><div class="head"><b>INTERPHASE / DOM</b><span id="stat">0 SELECTED</span></div><div class="bar" id="modes"></div><div class="body"><div class="focus" id="focus">Activate, then click page objects. Shift-click keeps several.</div><div class="stage" id="stage"></div><div class="res" id="res"></div><div id="edit"></div></div><div class="hint">CLICK = focus/select · SHIFT+CLICK = multifocus · ESC = release · generic DOM effects stay disabled</div><div class="foot"><button id="mark">MARK RETURN</button><button id="ret">RETURN</button><span class="sp"></span><button id="clear">CLEAR</button></div></div><div class="hover" id="hover"></div>`;
const $=id=>shadow.getElementById(id),modes=['PAGE','FOVEA','LINE','RING','FLOWER_KEY','ROOM','GLYPH'];
$('modes').innerHTML=modes.map(x=>`<button data-mode="${x}">${x==='FLOWER_KEY'?'FLOWER':x}</button>`).join('');
const sixCarrier=document.createElement('div');sixCarrier.className='sixCarrier';sixCarrier.dataset.mode='flower';
const sixPanels={};
for(const office of I.OFFICES||[]){
  const el=document.createElement('div');el.className='card office';el.dataset.office=office.id;
  el.innerHTML=`<b>${office.label}</b><i>${office.prompt}</i>`;sixCarrier.appendChild(el);sixPanels[office.id]=el;
}
const sixPanelIdentity=Object.fromEntries(Object.entries(sixPanels).map(([k,v])=>[k,v]));
function renderSix(nodes,mode){
  sixCarrier.dataset.mode=mode;
  const offices=I.OFFICES||[];
  offices.forEach((office,i)=>{
    const n=nodes[i]||null,p=sixPanels[office.id];if(!p)return;
    p.innerHTML=n?`<b>${esc(office.label)} · ${esc(n.label||n.kind||n.id)}</b><i>${esc(n.kind)} · ${esc(n.authority||'VIEW')}</i>`:`<b>${esc(office.label)}</b><i>${esc(office.prompt)}</i>`;
  });
  return sixCarrier;
}

function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function cleanWitness(){for(const el of marked){el.classList.remove('interphase-page-outline','interphase-page-focus')}marked.clear()}
function markWitness(){
  cleanWitness();for(const id of host.state.selection){try{const el=adapter.resolve(id);el.classList.add('interphase-page-outline');marked.add(el)}catch(_){}}
  for(const f of host.state.focus){try{const el=adapter.resolve(f.id);el.classList.add('interphase-page-focus');marked.add(el)}catch(_){}}
}
function card(n){return `<div class="card" title="${esc(n.id)}"><b>${esc(n.label||n.kind||n.id)}</b><i>${esc(n.kind)} · ${esc((n.authority||'VIEW'))}</i></div>`}
function render(){
  $('stat').textContent=host.state.selection.length+' SELECTED · '+host.state.focus.length+' FOCUS';
  shadow.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('on',b.dataset.mode===host.state.projection));
  const pr=host.projectionResult(),nodes=pr.nodes;$('stage').innerHTML='';
  if(host.state.projection==='PAGE')$('stage').innerHTML='<div class="cards">'+nodes.map(card).join('')+'</div>';
  if(host.state.projection==='FOVEA')$('stage').innerHTML='<div class="cards">'+nodes.filter(n=>host.state.focus.some(f=>f.id===n.id)).map(card).join('')+'</div>';
  if(host.state.projection==='LINE')$('stage').innerHTML='<div class="cards">'+nodes.map(card).join('')+'</div>';
  if(host.state.projection==='FLOWER_KEY'||host.state.projection==='ROOM')$('stage').appendChild(renderSix(nodes,host.state.projection==='ROOM'?'room':'flower'));
  if(host.state.projection==='GLYPH')$('stage').innerHTML='<div class="glyphs">'+nodes.map(n=>`<div class="glyph">${G.svg(n,{size:128,projection:'GLYPH',residue:pr.residue.filter(x=>x.id===n.id)})}<span>${esc((n.label||n.kind||'').slice(0,12))}</span></div>`).join('')+'</div>';
  if(host.state.projection==='RING'){
    const box=document.createElement('div');box.className='ring';$('stage').appendChild(box);const N=Math.max(1,nodes.length),cx=205,cy=118,R=Math.min(88,52+N*3);
    nodes.forEach((n,i)=>{const a=-Math.PI/2+i*Math.PI*2/N,x=cx+Math.cos(a)*R,y=cy+Math.sin(a)*R,d=document.createElement('div');d.innerHTML=card(n);const c=d.firstElementChild;c.style.left=x+'px';c.style.top=y+'px';box.appendChild(c)});
  }
  $('res').textContent=pr.residue.length?'RESIDUE · '+pr.residue.map(x=>x.id.split('::').at(-1)+' / '+x.channel).join(' · '):'RESIDUE · none declared for this selection/view';
  const f=host.state.focus.at(-1);let desc=null;if(f){try{desc=host.describe(f.id)}catch(_){}}
  $('focus').innerHTML=desc?`<b>${esc(desc.label||desc.kind)}</b><small>${esc(desc.id)}</small><small>${esc(desc.channels.join(' · '))}</small>`:'Focus one or several page objects.';
  renderEdit(desc);markWitness();
}
function renderEdit(desc){
  const e=$('edit');e.innerHTML='';if(!desc||!(desc.capabilities||[]).includes('edit'))return;
  const el=adapter.resolve(desc.id),r=adapter.read(el),box=document.createElement('div');box.className='edit';
  const isCheck=('checked'in r)&&el.tagName==='INPUT'&&['checkbox','radio'].includes(String(el.type).toLowerCase());
  box.innerHTML=isCheck?`<label><input id="ipCheck" type="checkbox" ${r.checked?'checked':''}> CHECKED</label><br><button>APPLY EDIT</button>`:`<textarea rows="3">${esc(r.value??r.text??'')}</textarea><button>APPLY EDIT</button>`;
  box.querySelector('button').onclick=()=>{const patch=isCheck?{checked:box.querySelector('input').checked}:{value:box.querySelector('textarea').value,text:box.querySelector('textarea').value};host.write(desc.id,patch,{commit:true});render()};e.appendChild(box);
}
function activate(v=!active){active=!!v;$('panel').classList.toggle('on',active);if(active&&host.returns.length===0)host.captureReturn('extension-entry');if(!active){hover=null;$('hover').classList.remove('on');cleanWitness()}else render()}
function targetAt(e){return adapter.atPoint(e.clientX,e.clientY,el=>shell.contains(el)||el===shell)}
function onMove(e){if(!active)return;if(e.composedPath?.().includes(shell)){$('hover').classList.remove('on');return}hover=targetAt(e);if(!hover){$('hover').classList.remove('on');return}let d;try{d=adapter.describe(hover)}catch(_){return}$('hover').innerHTML=`<b>${esc(d.label||d.kind)}</b><br>${esc(d.kind)} · ${esc(d.authority)}`;$('hover').style.left=Math.min(innerWidth-295,e.clientX+14)+'px';$('hover').style.top=Math.min(innerHeight-70,e.clientY+14)+'px';$('hover').classList.add('on')}
function onClick(e){if(!active)return;if(e.composedPath?.().includes(shell))return;const el=targetAt(e);if(!el)return;e.preventDefault();e.stopImmediatePropagation();host.select(el,{add:e.shiftKey});if(e.shiftKey)host.focus(el,{add:true,aperture:'DETAIL'});else host.focus(el,{aperture:'DETAIL'});render()}
function onKey(e){if(e.altKey&&e.shiftKey&&e.key.toLowerCase()==='i'){e.preventDefault();activate()}else if(active&&e.key==='Escape'){e.preventDefault();activate(false)}}
$('toggle').onclick=()=>activate();$('clear').onclick=()=>{host.clearSelection();host.clearFocus();render()};$('mark').onclick=()=>host.captureReturn('manual');$('ret').onclick=()=>{host.return();render()};
shadow.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{host.project(b.dataset.mode);render()});
window.addEventListener('mousemove',onMove,{capture:true,passive:true});window.addEventListener('click',onClick,true);window.addEventListener('keydown',onKey,true);
host.project('PAGE');globalThis.InterphaseExtension=Object.freeze({host,adapter,activate,render,sixPanels:()=>({...sixPanels}),sixPanelIdentity:()=>Object.keys(sixPanels).every(k=>sixPanels[k]===sixPanelIdentity[k])});
})();