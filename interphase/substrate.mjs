import {glyph as G,history as H} from '../lib/interphase.mjs';
import {esc} from '../lib/dom.js';
import {substrateModel,semanticPoint,OP_MARK,REL_MARK,DEFAULT_KERNEL} from './substrate-kernel.mjs';

const body=document.querySelector('#surfaceBody'),modes=document.querySelector('.modes');
if(body&&modes){
  let modeButton=modes.querySelector('[data-mode="SUBSTRATE"]');
  if(!modeButton){
    modeButton=document.createElement('button');modeButton.type='button';modeButton.className='mode';modeButton.dataset.mode='SUBSTRATE';modeButton.textContent='GLYPHFIELD';
    const research=modes.querySelector('[data-mode="RESEARCH"]');research?research.insertAdjacentElement('beforebegin',modeButton):modes.append(modeButton);
  }
  let manifest=null,loading=null,hops=Math.max(1,Math.min(3,Number(localStorage.getItem('interphase.substrate.hops'))||2));
  let selectedKey=null;const memberAt=new Map();let wheelDelta=0;
  const load=()=>manifest?Promise.resolve(manifest):(loading||=fetch('/showcase-manifest.json').then(r=>{if(!r.ok)throw Error('FIELD_MANIFEST_UNAVAILABLE');return r.json()}).then(x=>manifest=x));
  const currentId=()=>document.querySelector('#railId')?.textContent?.trim()||'';
  const routeId=r=>{try{return H.objectFromRoute(r).id}catch{return 'route:'+String(r?.href||'')}};
  const currentRoute=routes=>routes.find(r=>routeId(r)===currentId())||null;
  const relationMarks=items=>[...new Set(items.map(x=>REL_MARK[x.relation]||'?'))].join('');
  const hrefFor=r=>`/interphase/?route=${encodeURIComponent(r.href)}#substrate`;
  const glyphFor=(item,distance)=>G.svg({
    id:routeId(item.record),label:item.record.title||item.href,kind:item.record.kind||'route',address:item.href,
    channels:['identity','address',...(distance?['depth']:[])],authority:'VIEW',operations:[]
  },{size:96,projection:'SUBSTRATE'});
  const pointPct=p=>`left:${(p.x*100).toFixed(3)}%;top:${(p.y*100).toFixed(3)}%`;

  function selectedMember(model){
    if(!selectedKey)return null;const g=model.groups.find(x=>x.key===selectedKey);if(!g)return null;
    const i=Math.max(0,Math.min(g.items.length-1,memberAt.get(g.key)||0));return {group:g,item:g.items[i],index:i};
  }
  function guide(model){
    const rings=Array.from({length:model.maxHops},(_,i)=>{const p=semanticPoint(model.kernel[0],i+1,{kernel:model.kernel,maxHops:model.maxHops});return p?`<circle cx="50" cy="50" r="${(p.radius*100).toFixed(3)}"/><text x="50" y="${(50-p.radius*100+2).toFixed(3)}">${i+1}</text>`:''}).join('');
    const sectors=model.kernel.map(op=>{const p=semanticPoint(op,1,{kernel:model.kernel,maxHops:1});if(!p)return'';const x=(50+Math.cos(p.angle)*48).toFixed(3),y=(50+Math.sin(p.angle)*48).toFixed(3),x2=(50+Math.cos(p.angle)*45).toFixed(3),y2=(50+Math.sin(p.angle)*45).toFixed(3);return `<line x1="50" y1="50" x2="${x2}" y2="${y2}"/><text class="sector" x="${x}" y="${y}">${esc(OP_MARK[op]||'·')} ${esc(op)}</text>`}).join('');
    const edges=model.edges.map(e=>`<g class="declared-edge"><line x1="${(e.a.x*100).toFixed(3)}" y1="${(e.a.y*100).toFixed(3)}" x2="${(e.b.x*100).toFixed(3)}" y2="${(e.b.y*100).toFixed(3)}"/>${e.count>1?`<text x="${(((e.a.x+e.b.x)/2)*100).toFixed(3)}" y="${(((e.a.y+e.b.y)/2)*100).toFixed(3)}">×${e.count}</text>`:''}</g>`).join('');
    return `<svg class="substrate-guide" viewBox="0 0 100 100" aria-hidden="true"><g class="distance-rings">${rings}</g><g class="operation-sectors">${sectors}</g><g class="declared-edges">${edges}</g></svg>`;
  }
  function renderModel(model,record){
    const focus={record,href:record.href,relation:'FOCUS'};
    const nodes=model.groups.map(g=>{
      const i=Math.max(0,Math.min(g.items.length-1,memberAt.get(g.key)||0)),item=g.items[i],sel=g.key===selectedKey;
      const size=Math.max(48,76-(g.distance-1)*10),relations=relationMarks(g.items);
      return `<button type="button" class="substrate-node ${sel?'selected':''}" data-substrate-group="${esc(g.key)}" data-distance="${g.distance}" style="${pointPct(g.point)};--node-size:${size}px" aria-label="${esc(`${item.record.title||item.href}; ${g.operation}; ${g.distance} parent-edge hops; ${g.items.length} object${g.items.length===1?'':'s'} at this semantic coordinate`)}"><span class="substrate-glyph">${glyphFor(item,g.distance)}</span><span class="substrate-node-mark">${esc(OP_MARK[g.operation]||'·')}${esc(relations)}</span>${g.items.length>1?`<span class="substrate-count">${i+1}/${g.items.length}</span>`:''}</button>`;
    }).join('');
    const chosen=selectedMember(model);
    const readout=chosen?`<span><b>${esc(chosen.item.record.title||chosen.item.href)}</b><small>${esc(chosen.item.href)} · ${esc(chosen.group.operation)} · ${chosen.group.distance} hop${chosen.group.distance===1?'':'s'} · ${esc(chosen.item.relation)}</small></span><a class="btn hot" href="${hrefFor(chosen.item.record)}">HOLD / RECENTER</a>`:`<span><b>SEMANTIC CURSOR</b><small>tap a glyph · repeated tap cycles objects that share the exact same coordinate</small></span>`;
    const unplaced=model.unplaced.length?`<div class="substrate-residue" title="No position is invented when a route lacks a declared kernel operation.">RESIDUE · ${model.unplaced.length} unplaced · missing declared operation</div>`:'';
    body.innerHTML=`<section class="substrate-shell" data-hops="${model.maxHops}"><div class="substrate-law"><span>ANGLE = declared operation</span><span>RADIUS = parent-edge hops</span><span>LINE = declared parent edge</span><button type="button" id="substrateDepth">DEPTH ${model.maxHops} / 3</button></div><div class="substrate-stage" tabindex="0" aria-label="Semantic substrate. Angle encodes declared operation. Radius encodes exact parent-edge hops from the held route. Parent lines only appear when declared in the manifest.">${guide(model)}<div class="substrate-focus" style="left:50%;top:50%;--node-size:88px"><span class="substrate-glyph">${glyphFor(focus,0)}</span><span class="substrate-node-mark">⊙</span></div>${nodes}</div><div class="substrate-readout" aria-live="polite">${readout}</div>${unplaced}<div class="instrument-caption">GLYPHFIELD · coordinates are a reversible reading of manifest attributes, never inferred similarity · collisions aggregate in place rather than jittering into fake meaning</div></section>`;
    body.querySelectorAll('[data-substrate-group]').forEach(b=>b.onclick=()=>{
      const key=b.dataset.substrateGroup,g=model.groups.find(x=>x.key===key);if(!g)return;
      if(selectedKey===key&&g.items.length>1)memberAt.set(key,((memberAt.get(key)||0)+1)%g.items.length);selectedKey=key;renderModel(model,record);
    });
    body.querySelector('#substrateDepth').onclick=()=>setHops(hops===3?1:hops+1);
    const stage=body.querySelector('.substrate-stage');stage.addEventListener('wheel',e=>{if(e.ctrlKey)return;e.preventDefault();wheelDelta+=e.deltaY;if(Math.abs(wheelDelta)>34){setHops(hops+(wheelDelta>0?1:-1));wheelDelta=0}},{passive:false});
    stage.addEventListener('keydown',e=>{if(e.key==='+'||e.key==='='){e.preventDefault();setHops(hops+1)}else if(e.key==='-'){e.preventDefault();setHops(hops-1)}else if(e.key==='Escape'){selectedKey=null;renderModel(model,record)}});
  }
  async function render(){
    if(document.body.dataset.interphaseMode!=='SUBSTRATE')return;
    document.querySelector('#surfaceName').textContent='GLYPHFIELD';document.querySelector('#surfaceDesc').textContent='semantic substrate · no force layout';
    body.innerHTML='<div class="empty">Resolving declared FIELD relations…</div>';
    try{
      const m=await load();if(document.body.dataset.interphaseMode!=='SUBSTRATE')return;
      const routes=Array.isArray(m.routes)?m.routes:[],record=currentRoute(routes);
      if(!record){body.innerHTML='<div class="empty">This source has no manifest route. GLYPHFIELD refuses to invent coordinates. Use SOURCE / HISTORY or open its native owner.</div>';return}
      const model=substrateModel(routes,record.href,{kernel:Array.isArray(m.kernel)?m.kernel:DEFAULT_KERNEL,maxHops:hops});
      if(model.status!=='OK'){body.innerHTML='<div class="empty">Manifest focus unresolved. No geometry generated.</div>';return}
      renderModel(model,record);
    }catch(e){body.innerHTML=`<div class="empty">GLYPHFIELD HELD · ${esc(e.message)}</div>`}
  }
  function setHops(next){hops=Math.max(1,Math.min(3,Number(next)||1));localStorage.setItem('interphase.substrate.hops',String(hops));selectedKey=null;render()}
  new MutationObserver(()=>render()).observe(document.body,{attributes:true,attributeFilter:['data-interphase-mode']});
  const rail=document.querySelector('#railId');if(rail)new MutationObserver(()=>{if(document.body.dataset.interphaseMode==='SUBSTRATE')render()}).observe(rail,{childList:true,characterData:true,subtree:true});
  if(location.hash==='#substrate'){
    let attempts=0;const enter=()=>{attempts++;if(currentId()&&currentId()!=='loading source'){modeButton.click();return}if(attempts<12)setTimeout(enter,50)};setTimeout(enter,0);
  }
}
