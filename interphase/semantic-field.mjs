// Optional semantic reading of the existing INTERPHASE continuum.
// Same source, same native route authority; this module owns no canonical state.
import {substrateModel,semanticPoint,ACTION_KERNEL,OP_MARK} from './substrate-kernel.mjs';
import '../lib/interphase-ring.js';
import '../lib/interphase-glyph.js';
import '../lib/interphase-history.js';
const G=globalThis.InterphaseGlyph,H=globalThis.InterphaseHistory;
import {hashText} from '../lib/id.js';
import {esc} from '../lib/dom.js';

const dirs=['↑','↗','↘','↓','↙','↖'];
const coords=p=>'left:'+(p.x*100).toFixed(3)+'%;top:'+(p.y*100).toFixed(3)+'%';
const idFor=r=>H.objectFromRoute(r).id;
const glyph=r=>G.svg({id:idFor(r),label:r.title||r.href,kind:r.kind||'route',address:r.href,
  channels:['identity','address'],authority:'VIEW',operations:[]},{size:96,projection:'SUBSTRATE'});
const escapeText=s=>esc(String(s??''));

export function mountSemanticField(api,{start=false}={}){
 const root=api.root,nav=root.querySelector('.ip-views'),space=root.querySelector('.ip-space');
 if(!nav||!space)throw Error('INTERPHASE_SEMANTIC_HOST_MISSING');
 const btn=document.createElement('button');btn.type='button';btn.dataset.ipSemantic='';btn.setAttribute('role','tab');
 btn.setAttribute('aria-controls','ip-semantic-field');btn.setAttribute('aria-selected','false');btn.textContent='◉ FIELD';nav.append(btn);
 const panel=document.createElement('section');panel.id='ip-semantic-field';panel.className='ip-semantic-field';
 panel.setAttribute('role','tabpanel');panel.setAttribute('aria-label','Semantic FIELD reading');panel.hidden=true;
 space.before(panel);
 let active=false,seq=0,cache=null,selected=null,member=0,depth=2;
 const returns=[];
 const nativeTabs=[...nav.querySelectorAll('[data-ip^="view-"]')];
 const setTabs=()=>{
  btn.setAttribute('aria-selected',String(active));btn.tabIndex=active?0:-1;
  for(const t of nativeTabs)if(active)t.setAttribute('aria-selected','false');
 };
 const show=on=>{
  active=!!on;root.dataset.semanticField=active?'1':'0';panel.hidden=!active;setTabs();
  if(active){api.stop();render();panel.focus({preventScroll:true})}
  else{++seq;nativeTabs.find(t=>t.dataset.ip==='view-'+root.dataset.view)?.setAttribute('aria-selected','true');space.focus({preventScroll:true})}
 };
 btn.onclick=()=>show(true);
 btn.onkeydown=e=>{
  if(e.key==='ArrowLeft'){e.preventDefault();show(false);nativeTabs.at(-1)?.focus()}
  if(e.key==='ArrowRight'){e.preventDefault();show(false);nativeTabs[0]?.focus()}
 };
 for(const t of nativeTabs)t.addEventListener('click',()=>show(false));
 async function sources(){
  // Every geometry is an exact-source reading. Never match a stale fold to newer source bytes.
  const response=await fetch('/showcase-manifest.json',{cache:'no-store'});
  const foldResponse=await fetch('/returns/FIELD_FOLD_MAP.json',{cache:'no-store'});
  if(!response.ok||!foldResponse.ok)throw Error('FIELD source or operation fold unavailable');
  const raw=await response.text(),manifest=JSON.parse(raw),fold=await foldResponse.json();
  const routes=manifest.routes||[],map=fold.routes?.operation_class_map;
  if(fold.schema!=='field-fold/v2'||fold.routes?.routes_total!==routes.length||!map)
   throw Error('FIELD operation fold does not match current manifest');
  const verbs=[...new Set(routes.map(r=>String(r.operation||'').trim()).filter(Boolean))];
  // Explicit OTHER and missing raw operation are *residue*, never fabricated coordinates.
  // Only an absent fold entry or an unrecognised class schema invalidates the fold itself.
  if(verbs.some(v=>!Object.hasOwn(map,v)||(!ACTION_KERNEL.includes(map[v])&&map[v]!=='OTHER')))
   throw Error('FIELD operation mapping incomplete; no invented placement');
  return {routes,map,hash:await hashText(raw)};
 }
 function evidenceSvg(m){
  const rings=Array.from({length:m.maxHops},(_,i)=>{
   const p=semanticPoint('SEE',i+1,{kernel:ACTION_KERNEL,maxHops:m.maxHops});
   return '<circle cx="50" cy="50" r="'+(p.radius*100).toFixed(3)+'"/>';
  }).join('');
  const sectors=ACTION_KERNEL.map(op=>{
   const p=semanticPoint(op,1,{kernel:ACTION_KERNEL,maxHops:1});
   return '<line x1="50" y1="50" x2="'+(50+Math.cos(p.angle)*46).toFixed(3)+'" y2="'+(50+Math.sin(p.angle)*46).toFixed(3)+'"/>';
  }).join('');
  // Legal parent edges are selectively visible: no all-at-once relation hairball.
  const edges=selected===null?'':m.edges.filter(e=>e.from===selected||e.to===selected).map(e=>
   '<line class="ip-field-edge" x1="'+(e.a.x*100).toFixed(3)+'" y1="'+(e.a.y*100).toFixed(3)+
   '" x2="'+(e.b.x*100).toFixed(3)+'" y2="'+(e.b.y*100).toFixed(3)+'"/>').join('');
  return '<svg class="ip-field-guide" viewBox="0 0 100 100" aria-hidden="true"><g class="ip-field-rings">'+rings+
   '</g><g class="ip-field-rays">'+sectors+'</g><g class="ip-field-edges">'+edges+'</g></svg>';
 }
 const node=(g)=>{
  const i=selected===g.key?member:0;
  const r=g.items[Math.min(i,g.items.length-1)].record;
  return '<button class="ip-field-node'+(selected===g.key?' selected':'')+'" data-sem-cell="'+escapeText(g.key)+
   '" style="'+coords(g.point)+'" aria-label="'+escapeText((r.title||r.href)+
   ', '+g.operation+', '+g.distance+' source parent hops, '+g.items.length+' routes')+'">'+
   '<span class="ip-field-glyph">'+glyph(r)+'</span><span class="ip-field-marker">'+
   escapeText(OP_MARK[g.operation])+(g.items.length>1?' '+g.items.length:'')+'</span></button>';
 };
 const legend=()=>ACTION_KERNEL.map((op,i)=>'<span>'+dirs[i]+' '+escapeText(OP_MARK[op])+' '+op+'</span>').join('');
 const selectedGroup=m=>m.groups.find(g=>g.key===selected);
 const current=(m)=>{const g=selectedGroup(m);return g?g.items[Math.min(member,g.items.length-1)]:null};
 async function center(r){
  // Snapshot-based RETURN, not a synthetic history node or mutation of the FIELD manifest.
  const before=api.packet();await api.loadRoute(r.href);
  returns.push(before);if(returns.length>16)returns.shift();selected=null;member=0;
  cache=null;await render();
 }
 async function returnExact(){
  if(!returns.length)return;
  const previous=returns.pop();await api.importPacket(previous);
  selected=null;member=0;cache=null;await render();
 }
 function inspector(m){
  const g=selectedGroup(m),it=current(m);
  if(!g||!it)return '<span class="ip-field-explain">Select a glyph. A second tap advances within its exact coordinate.</span>';
  const r=it.record;
  return '<div class="ip-field-inspect"><b>'+escapeText(r.title||r.href)+'</b><small>'+
    escapeText(r.operation)+' → '+escapeText(g.operation)+' · '+g.distance+' declared hop'+(g.distance===1?'':'s')+
    ' · '+escapeText(it.relation)+' · '+(member+1)+'/'+g.items.length+'</small></div>'+
    (g.items.length>1?'<button data-sem-prev aria-label="Previous object">←</button><button data-sem-next aria-label="Next object">→</button>':'')+
    '<button data-sem-open>HOLD / READ</button>'+
    (g.items.length>7?'<input data-sem-find type="search" autocomplete="off" aria-label="Find an exact route in this semantic cell" placeholder="FIND AMONG '+g.items.length+' ROUTES">':'');
 }
 let lastModel=null;
 function draw(m,focus){
  lastModel=m;
  panel.innerHTML='<div class="ip-field-tools"><span>ANGLE · action class</span><span>RADIUS · declared hops</span>'+
   '<button data-sem-depth>DEPTH '+depth+'/3</button><button data-sem-return'+(!returns.length?' disabled':'')+'>↶ RETURN</button></div>'+
   '<div class="ip-field-stage" tabindex="0" aria-label="Semantic field. Angle is declared action class; radius is exact parent-edge hops. Selected relations only.">'+
   evidenceSvg(m)+'<div class="ip-field-center" title="'+escapeText(focus.title||focus.href)+'">'+glyph(focus)+
   '<span>⊙</span></div>'+m.groups.map(node).join('')+'</div>'+
   '<div class="ip-field-inspector" aria-live="polite">'+inspector(m)+'</div>'+
   '<div class="ip-field-legend" aria-label="Fixed operation directions">'+legend()+'</div>'+
   '<p class="ip-field-caption">'+m.placedCount+'/'+m.visibleCount+' placed · '+m.edges.length+
   ' declared group edges (selected only) · no inferred similarity · '+m.unplaced.length+' unplaced</p>';
  panel.querySelector('[data-sem-depth]').onclick=()=>{depth=depth===3?1:depth+1;selected=null;member=0;render()};
  panel.querySelector('[data-sem-return]').onclick=()=>returnExact().catch(e=>error(e));
  panel.querySelectorAll('[data-sem-cell]').forEach(b=>b.onclick=()=>{
   const key=b.dataset.semCell,g=m.groups.find(x=>x.key===key);
   if(selected===key&&g.items.length>1)member=(member+1)%g.items.length;
   else{selected=key;member=0}
   draw(m,focus);
  });
  const prev=panel.querySelector('[data-sem-prev]'),next=panel.querySelector('[data-sem-next]');
  const cycle=step=>{const g=selectedGroup(m);if(!g)return;member=(member+step+g.items.length)%g.items.length;draw(m,focus)};
  if(prev)prev.onclick=()=>cycle(-1);if(next)next.onclick=()=>cycle(1);
  const open=panel.querySelector('[data-sem-open]');
  if(open)open.onclick=()=>{const x=current(m);if(x)center(x.record).catch(e=>error(e))};
  const find=panel.querySelector('[data-sem-find]');
  if(find){
   const g=selectedGroup(m),label=panel.querySelector('.ip-field-inspect b'),details=panel.querySelector('.ip-field-inspect small');
   let matches=g.items.map((item,index)=>({item,index}));
   find.oninput=()=>{
    const q=find.value.trim().toLocaleLowerCase();
    matches=g.items.map((item,index)=>({item,index})).filter(x=>
     (String(x.item.record.title||'')+' '+String(x.item.href||'')).toLocaleLowerCase().includes(q));
    open.disabled=!matches.length;
    if(!matches.length){label.textContent='NO ROUTE MATCHES';details.textContent='This semantic cell remains unchanged';return}
    member=matches[0].index;const chosen=matches[0].item;
    label.textContent=chosen.record.title||chosen.href;
    details.textContent=String(chosen.record.operation||'')+' → '+g.operation+' · '+g.distance+
      ' declared hops · '+matches.length+' lexical matches · '+(member+1)+'/'+g.items.length;
    const mark=panel.querySelector('.ip-field-node.selected .ip-field-glyph');
    if(mark)mark.innerHTML=glyph(chosen.record);
   };
   find.onkeydown=e=>{
    if(e.key==='Enter'&&matches.length){e.preventDefault();e.stopPropagation();center(matches[0].item.record).catch(x=>error(x))}
   };
  }
  panel.querySelector('.ip-field-stage').onkeydown=e=>{
   if(['ArrowLeft','ArrowRight','Enter','Escape'].includes(e.key)){
    e.preventDefault();e.stopPropagation();
    if(e.key==='ArrowLeft')cycle(-1);
    if(e.key==='ArrowRight')cycle(1);
    if(e.key==='Enter'&&current(m))center(current(m).record).catch(x=>error(x));
    if(e.key==='Escape')show(false);
   }
  };
 }
 function error(e){
  panel.innerHTML='<p class="ip-field-held" role="status">FIELD HELD · '+escapeText(e.message||e)+'</p>';
 }
 async function render(){
  if(!active)return;
  const t=++seq,snapshot=api.snapshot();
  if(!snapshot){panel.textContent='Opening source…';return}
  const held=snapshot.nativeRoute;
  if(!held||snapshot.source?.address!=='/showcase-manifest.json'){
   panel.innerHTML='<p class="ip-field-held">This source has no declared FIELD route. READ/WALK/DIAL preserve its exact text; the semantic FIELD applies only where parent and operation attributes exist.</p>';return;
  }
  panel.textContent='Resolving exact source and operation fold…';
  try{
   const data=cache||await sources();if(t!==seq||!active)return;
   if(data.hash!==snapshot.source.hash){error(Error('Source revision differs from live manifest. Return to FIELD source before projecting.'));return}
   cache=data;
   const focus=data.routes.find(r=>r.href===held);if(!focus){error(Error('Held route no longer exists in source'));return}
   const m=substrateModel(data.routes,held,{kernel:ACTION_KERNEL,maxHops:depth,operationClassMap:data.map});
   if(m.status!=='OK'){error(Error(m.status));return}
   if(selected&&!m.groups.some(g=>g.key===selected)){selected=null;member=0}
   draw(m,focus);
  }catch(e){if(t===seq)error(e)}
 }
 const observer=new MutationObserver(()=>{if(active){setTabs();render()}});
 observer.observe(root,{attributes:true,attributeFilter:['data-anchor','data-source-hash']});
 panel.addEventListener('keydown',e=>e.stopPropagation());
 show(!!start);
 return {open:()=>show(true),close:()=>show(false),dispose:()=>{observer.disconnect();panel.remove();btn.remove();delete root.dataset.semanticField},snapshot:()=>({active,depth,selected,returnCount:returns.length})};
}
