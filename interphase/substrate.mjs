import {glyph as G,history as H} from '../lib/interphase.mjs?v=0.5.0';
import {esc} from '../lib/dom.js';
import {substrateModel,semanticPoint,OP_MARK,REL_MARK,ACTION_KERNEL} from './substrate-kernel.mjs';

const body=document.querySelector('#surfaceBody'),modes=document.querySelector('.modes');
if(body&&modes){
  let modeButton=modes.querySelector('[data-mode="SUBSTRATE"]');
  if(!modeButton){
    modeButton=document.createElement('button');modeButton.type='button';modeButton.className='mode';modeButton.dataset.mode='SUBSTRATE';modeButton.textContent='GLYPHFIELD';
    const research=modes.querySelector('[data-mode="RESEARCH"]');research?research.insertAdjacentElement('beforebegin',modeButton):modes.append(modeButton);
  }
  let source=null,loading=null,hops=Math.max(1,Math.min(3,Number(localStorage.getItem('interphase.substrate.hops'))||2));
  let selectedKey=null;const memberAt=new Map();let wheelDelta=0;
  const json=async(url,label)=>{const r=await fetch(url);if(!r.ok)throw Error(label);return r.json()};
  const load=()=>source?Promise.resolve(source):(loading||=Promise.all([
    json('/showcase-manifest.json','FIELD_MANIFEST_UNAVAILABLE'),
    json('/returns/FIELD_FOLD_MAP.json','FIELD_OPERATION_FOLD_UNAVAILABLE')
  ]).then(([manifest,fold])=>source={manifest,fold}));
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

  function exactFold(fold,routes){
    const rt=fold?.routes,map=rt?.operation_class_map;
    if(fold?.schema!=='field-fold/v2'||!rt||rt.routes_total!==routes.length||!map||typeof map!=='object')return null;
    const raw=[...new Set(routes.map(r=>String(r?.operation??'').trim()).filter(Boolean))];
    if(raw.some(op=>!Object.prototype.hasOwnProperty.call(map,op)||!([...ACTION_KERNEL,'OTHER'].includes(String(map[op]||'').trim()))))return null;
    return map;
  }
  function selectedMember(model){
    if(!selectedKey)return null;const g=model.groups.find(x=>x.key===selectedKey);if(!g)return null;
    const i=Math.max(0,Math.min(g.items.length-1,memberAt.get(g.key)||0));return {group:g,item:g.items[i],index:i};
  }
  function guide(model){
    const rings=Array.from({length:model.maxHops},(_,i)=>{const p=semanticPoint(model.kernel[0],i+1,{kernel:model.kernel,maxHops:model.maxHops});return p?`<circle cx="50" cy="50" r="${(p.radius*100).toFixed(3)}"/><text x="50" y="${(50-p.radius*100+2).toFixed(3)}">${i+1}</text>`:''}).join('');
    const sectors=model.kernel.map(op=>{const p=semanticPoint(op,1,{kernel:model.kernel,maxHops:1});if(!p)return'';const c=Math.cos(p.angle),s=Math.sin(p.angle),x=(50+c*42-s*8).toFixed(3),y=(50+s*42+c*8).toFixed(3),x2=(50+c*45).toFixed(3),y2=(50+s*45).toFixed(3);return `<line x1="50" y1="50" x2="${x2}" y2="${y2}"/><text class="sector" x="${x}" y="${y}">${esc(OP_MARK[op]||'·')} ${esc(op)}</text>`}).join('');
    const edges=model.edges.map(e=>`<g class="declared-edge"><line x1="${(e.a.x*100).toFixed(3)}" y1="${(e.a.y*100).toFixed(3)}" x2="${(e.b.x*100).toFixed(3)}" y2="${(e.b.y*100).toFixed(3)}"/>${e.count>1?`<text x="${(((e.a.x+e.b.x)/2)*100).toFixed(3)}" y="${(((e.a.y+e.b.y)/2)*100).toFixed(3)}">×${e.count}</text>`:''}</g>`).join('');
    return `<svg class="substrate-guide" viewBox="0 0 100 100" aria-hidden="true"><g class="distance-rings">${rings}</g><g class="operation-sectors">${sectors}</g><g class="declared-edges">${edges}</g></svg>`;
  }
  // Re-enter the source only when the existing continuum holds a local
  // addressed continuation. The source owner verifies bytes on resume.
  function returnableSource(){
    try{
      const p=JSON.parse(sessionStorage.getItem('interphase.continuum.v1')||'null');
      return p?.source?.address==='/showcase-manifest.json'&&
        typeof p.source.hash==='string'&&!!p.source.hash&&
        typeof p.source.raw==='string'&&p.source.raw.length>0&&
        Number.isInteger(p.attention?.char)&&p.attention.char>=0;
    }catch{return false}
  }
  function renderModel(model,record,fold){
    const focus={record,href:record.href,relation:'FOCUS'};
    const nodes=model.groups.map(g=>{
      const i=Math.max(0,Math.min(g.items.length-1,memberAt.get(g.key)||0)),item=g.items[i],sel=g.key===selectedKey;
      const size=Math.max(48,76-(g.distance-1)*10),relations=relationMarks(g.items);
      return `<button type="button" class="substrate-node ${sel?'selected':''}" data-substrate-group="${esc(g.key)}" data-distance="${g.distance}" style="${pointPct(g.point)};--node-size:${size}px" aria-label="${esc(`${item.record.title||item.href}; raw ${item.rawOperation}; class ${g.operation}; ${g.distance} parent-edge hops; ${g.items.length} object${g.items.length===1?'':'s'} at this semantic coordinate`)}"><span class="substrate-glyph">${glyphFor(item,g.distance)}</span><span class="substrate-node-mark">${esc(OP_MARK[g.operation]||'·')}${esc(relations)}</span>${g.items.length>1?`<span class="substrate-count">${i+1}/${g.items.length}</span>`:''}</button>`;
    }).join('');
    const chosen=selectedMember(model);
    const readout=chosen?`<span><b>${esc(chosen.item.record.title||chosen.item.href)}</b><small>${esc(chosen.item.href)} · ${esc(chosen.item.rawOperation)} → ${esc(chosen.group.operation)} · ${chosen.group.distance} hop${chosen.group.distance===1?'':'s'} · ${esc(chosen.item.relation)}</small></span><a class="btn hot" href="${hrefFor(chosen.item.record)}">HOLD / RECENTER</a>`:`<span><b>SEMANTIC CURSOR</b><small>tap a glyph · repeated tap cycles exact-coordinate collisions · ${model.placedCount}/${model.visibleCount} placed</small></span>`;
    const unplaced=model.unplaced.length?`<div class="substrate-residue" title="No position is invented when the explicit operation fold lacks a class.">RESIDUE · ${model.unplaced.length} unplaced · operation fold has no lawful class</div>`:'';
    const generated=String(fold?.generated||'').replace('T',' ').replace(/\.\d+Z$/,'Z');
    body.innerHTML=`<section class="substrate-shell" data-hops="${model.maxHops}" data-mapping="${esc(model.mapping)}"><div class="substrate-law"><span>ANGLE = FIELD FOLD action class</span><span>RADIUS = parent-edge hops</span><span>LINE = declared parent edge</span><button type="button" id="substrateDepth">DEPTH ${model.maxHops} / 3</button>${returnableSource()?'<a class="btn" data-substrate-return href="/interphase/" title="Return to the held source and character" aria-label="Return to held source and character">↶</a>':''}</div><div class="substrate-stage" tabindex="0" aria-label="Semantic substrate. Angle uses the explicit FIELD FOLD action class. Radius encodes exact parent-edge hops from the held route. Parent lines only appear when declared in the manifest. Sector adjacency is mnemonic, not similarity.">${guide(model)}<div class="substrate-focus" style="left:50%;top:50%;--node-size:88px"><span class="substrate-glyph">${glyphFor(focus,0)}</span><span class="substrate-node-mark">⊙</span></div>${nodes}</div><div class="substrate-readout" aria-live="polite">${readout}</div>${unplaced}<div class="instrument-caption">GLYPHFIELD · ${Object.keys(fold?.routes?.operation_class_map||{}).length} raw operation verbs → six warranted classes + explicit OTHER residue · sector order is mnemonic, never similarity · collisions aggregate · fold ${esc(generated)}</div></section>`;
    body.querySelectorAll('[data-substrate-group]').forEach(b=>b.onclick=()=>{
      const key=b.dataset.substrateGroup,g=model.groups.find(x=>x.key===key);if(!g)return;
      if(selectedKey===key&&g.items.length>1)memberAt.set(key,((memberAt.get(key)||0)+1)%g.items.length);selectedKey=key;renderModel(model,record,fold);
    });
    body.querySelector('#substrateDepth').onclick=()=>setHops(hops===3?1:hops+1);
    const stage=body.querySelector('.substrate-stage');stage.addEventListener('wheel',e=>{if(e.ctrlKey)return;e.preventDefault();wheelDelta+=e.deltaY;if(Math.abs(wheelDelta)>34){setHops(hops+(wheelDelta>0?1:-1));wheelDelta=0}},{passive:false});
    stage.addEventListener('keydown',e=>{if(e.key==='+'||e.key==='='){e.preventDefault();setHops(hops+1)}else if(e.key==='-'){e.preventDefault();setHops(hops-1)}else if(e.key==='Escape'){selectedKey=null;renderModel(model,record,fold)}});
  }
  async function render(){
    if(document.body.dataset.interphaseMode!=='SUBSTRATE')return;
    document.querySelector('#surfaceName').textContent='GLYPHFIELD';document.querySelector('#surfaceDesc').textContent='semantic substrate · warranted coordinates only';
    body.innerHTML='<div class="empty">Resolving declared FIELD relations + action fold…</div>';
    try{
      const {manifest,fold}=await load();if(document.body.dataset.interphaseMode!=='SUBSTRATE')return;
      const routes=Array.isArray(manifest.routes)?manifest.routes:[],record=currentRoute(routes),operationClassMap=exactFold(fold,routes);
      if(!record){body.innerHTML='<div class="empty">This source has no manifest route. GLYPHFIELD refuses to invent coordinates. Use SOURCE / HISTORY or open its native owner.</div>';return}
      if(!operationClassMap){body.innerHTML='<div class="empty">FIELD operation fold is stale or incomplete for this manifest. GLYPHFIELD refuses geometry until the explicit mapping is regenerated.</div>';return}
      const model=substrateModel(routes,record.href,{kernel:ACTION_KERNEL,maxHops:hops,operationClassMap});
      if(model.status!=='OK'){body.innerHTML='<div class="empty">Manifest focus unresolved. No geometry generated.</div>';return}
      renderModel(model,record,fold);
    }catch(e){body.innerHTML=`<div class="empty">GLYPHFIELD HELD · ${esc(e.message)}</div>`}
  }
  function setHops(next){hops=Math.max(1,Math.min(3,Number(next)||1));localStorage.setItem('interphase.substrate.hops',String(hops));selectedKey=null;render()}
  new MutationObserver(()=>render()).observe(document.body,{attributes:true,attributeFilter:['data-interphase-mode']});
  const rail=document.querySelector('#railId');if(rail)new MutationObserver(()=>{if(document.body.dataset.interphaseMode==='SUBSTRATE')render()}).observe(rail,{childList:true,characterData:true,subtree:true});
  if(location.hash==='#substrate'){
    // The host installs controls asynchronously. A fixed retry window can miss
    // the exact-route handoff on a slow device; use the real host readiness edge.
    const enter=()=>{
      if(!window.InterphaseWorkbench?.setMode)return;
      document.removeEventListener('interphase:ready',enter);
      window.InterphaseWorkbench.setMode('SUBSTRATE');
    };
    document.addEventListener('interphase:ready',enter);
    enter();
  }
}
