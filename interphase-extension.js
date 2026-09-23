(()=>{'use strict';
if(!globalThis.Interphase||!globalThis.InterphaseDOM||globalThis.__INTERPHASE_EXTENSION__)return;
globalThis.__INTERPHASE_EXTENSION__=true;
const I=globalThis.Interphase,DOM=globalThis.InterphaseDOM;
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
#panel.on{display:block}.head,.bar,.foot{display:flex;gap:5px;align-items:center;padding:6px;border-bottom:1px solid #263137}.head b{letter-spacing:.15em;color:#d7ae67}.head span{margin-left:auto;color:#7f8b90}.bar{flex-wrap:wrap}.bar button,.foot button{background:#0d1215;color:#91a0a6;border:1px solid #2d3a40;padding:4px 6px;cursor:pointer}.bar button.on{color:#d7ae67;border-color:#d7ae67}.bar button:hover,.foot button:hover{color:#fff}.body{padding:7px}.focus{border:1px solid #253138;padding:6px;margin-bottom:6px}.focus b{color:#73bce8}.focus small{display:block;color:#7f8b90;margin-top:3px;word-break:break-all}.stage{position:relative;min-height:110px;border:1px solid #202a2f;background:#07090a;overflow:hidden}.cards{display:flex;gap:5px;overflow:auto;padding:6px}.card{min-width:110px;max-width:170px;border:1px solid #2c383e;padding:5px;background:#0b0f11}.card b{display:block;color:#edf1ef;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.card i{font-style:normal;color:#708087;font-size:8px}.ring{position:relative;height:240px}.ring .card{position:absolute;width:100px;min-width:0;transform:translate(-50%,-50%)}.six{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;padding:6px}.glyphs{display:flex;flex-wrap:wrap;gap:8px;padding:10px}.glyph{width:58px;text-align:center;color:#819096}.glyph svg{display:block;margin:auto}.res{margin-top:6px;color:#ed7245;font-size:8px}.edit{border-top:1px solid #202a2f;padding-top:6px;margin-top:6px}.edit textarea,.edit input{width:100%;background:#0b1012;color:#edf1ef;border:1px solid #2d3a40;padding:5px;margin-top:4px}.edit button{margin-top:4px;background:#10171a;color:#d7ae67;border:1px solid #4d4530;padding:4px 7px;cursor:pointer}.hover{position:fixed;pointer-events:none;max-width:280px;background:#080b0dee;color:#e9eeec;border:1px solid #73bce8;padding:5px 7px;font:9px/1.3 ui-monospace,monospace;display:none}.hover.on{display:block}.hint{color:#69777d;padding:5px 7px;border-top:1px solid #202a2f}.foot{border-top:1px solid #263137;border-bottom:0}.sp{flex:1}
</style>
<button id="toggle" title="INTERPHASE · click, or Alt+Shift+I">◎</button>
<div id="panel"><div class="head"><b>INTERPHASE / DOM</b><span id="stat">0 SELECTED</span></div><div class="bar" id="modes"></div><div class="body"><div class="focus" id="focus">Activate, then click page objects. Shift-click keeps several.</div><div class="stage" id="stage"></div><div class="res" id="res"></div><div id="edit"></div></div><div class="hint">CLICK = focus/select · SHIFT+CLICK = multifocus · ESC = release · generic DOM effects stay disabled</div><div class="foot"><button id="mark">MARK RETURN</button><button id="ret">RETURN</button><span class="sp"></span><button id="clear">CLEAR</button></div></div><div class="hover" id="hover"></div>`;
const $=id=>shadow.getElementById(id),modes=['PAGE','FOVEA','LINE','RING','SIX','GLYPH'];
$('modes').innerHTML=modes.map(x=>`<button data-mode="${x}">${x}</button>`).join('');

function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function fnv(s){let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0}return h>>>0}
function poly(id){const h=fnv(id),n=3+h%6,r=19,c=22,rot=((h>>>5)%360)*Math.PI/180,pts=[];for(let i=0;i<n;i++){const a=rot-Math.PI/2+i*Math.PI*2/n;pts.push((c+Math.cos(a)*r).toFixed(1)+','+(c+Math.sin(a)*r).toFixed(1))}return `<svg viewBox="0 0 44 44" width="44" height="44"><polygon points="${pts.join(' ')}" fill="none" stroke="#d7ae67"/><circle cx="22" cy="22" r="2" fill="#73bce8"/></svg>`}
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
  if(host.state.projection==='SIX')$('stage').innerHTML='<div class="six">'+nodes.slice(0,6).map(card).join('')+'</div>';
  if(host.state.projection==='GLYPH')$('stage').innerHTML='<div class="glyphs">'+nodes.map(n=>`<div class="glyph">${poly(n.id)}<span>${esc((n.label||n.kind||'').slice(0,12))}</span></div>`).join('')+'</div>';
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
function onMove(e){if(!active)return;hover=targetAt(e);if(!hover){$('hover').classList.remove('on');return}let d;try{d=adapter.describe(hover)}catch(_){return}$('hover').innerHTML=`<b>${esc(d.label||d.kind)}</b><br>${esc(d.kind)} · ${esc(d.authority)}`;$('hover').style.left=Math.min(innerWidth-295,e.clientX+14)+'px';$('hover').style.top=Math.min(innerHeight-70,e.clientY+14)+'px';$('hover').classList.add('on')}
function onClick(e){if(!active)return;const el=targetAt(e);if(!el)return;e.preventDefault();e.stopImmediatePropagation();host.select(el,{add:e.shiftKey,toggle:e.shiftKey});if(e.shiftKey)host.focus(el,{add:true,aperture:'DETAIL'});else host.focus(el,{aperture:'DETAIL'});render()}
function onKey(e){if(e.altKey&&e.shiftKey&&e.key.toLowerCase()==='i'){e.preventDefault();activate()}else if(active&&e.key==='Escape'){e.preventDefault();activate(false)}}
$('toggle').onclick=()=>activate();$('clear').onclick=()=>{host.clearSelection();host.clearFocus();render()};$('mark').onclick=()=>host.captureReturn('manual');$('ret').onclick=()=>{host.return();render()};
shadow.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{host.project(b.dataset.mode);render()});
window.addEventListener('mousemove',onMove,{capture:true,passive:true});window.addEventListener('click',onClick,true);window.addEventListener('keydown',onKey,true);
host.project('PAGE');globalThis.InterphaseExtension=Object.freeze({host,adapter,activate,render});
})();