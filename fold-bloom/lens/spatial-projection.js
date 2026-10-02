'use strict';
// Spatial projection is deliberately presentation-only. Object identity,
// aperture, projection and RETURN authority remain in ScaleLensSpatialAPI.
import { $ } from '/lib/dom.js';
import { M,lensViewMatrix,lineageSlabMatrix,clampLensPitch,clampLensDepth } from './spatial-geometry.js';
(()=> {
  const api=window.ScaleLensSpatialAPI;
  const toggle=$('#spatialToggle'), reset=$('#spatialReset'), viewport=$('#spatialViewport'), stage=$('#spatialStage'), meta=$('#spatialMeta');
  if(!api||!toggle||!reset||!viewport||!stage||!meta)return;

  let active=false,yaw=-27,pitch=17,depth=-115,drag=null,suppressClick=false,last=null;

  function viewMatrix(){return lensViewMatrix({yaw,pitch,depth})}
  function slabMatrix(i,n,count){return lineageSlabMatrix(i,n,count,{selectedId:last?.selectedId||null})}
  function face(name){const x=document.createElement('span');x.className='spatialFace '+name;return x}
  function slab(n,i,count){
    const b=document.createElement('button');b.type='button';b.className='spatialSlab'+(n.id===last.selectedId?' selected':'');b.dataset.id=n.id;
    b.style.setProperty('--slab-accent',`hsl(${(n.hash>>>0)%360} 70% 62%)`);
    b.style.transform=M.css(slabMatrix(i,n,count));b.title=`${n.kind} · ${n.label}\n${n.id}`;
    const f=face('front'),kind=document.createElement('span'),label=document.createElement('span'),id=document.createElement('span');
    kind.className='spatialKind';kind.textContent=n.kind;label.className='spatialLabel';label.textContent=n.label||n.kind;id.className='spatialId';id.textContent=n.id;
    f.append(kind,label,id);
    const back=face('back'),bk=document.createElement('span'),bi=document.createElement('span');bk.className='spatialKind';bk.textContent='DEPTH '+i;bi.className='spatialId';bi.textContent=n.canonicalOwnerId||last.identity||'local identity';back.append(bk,bi);
    b.append(f,back,face('right'),face('left'),face('top'),face('bottom'));
    b.addEventListener('click',()=>{if(!suppressClick)api.focus(n.id)});
    return b;
  }
  function render(detail=api.snapshot()){
    last=detail;
    if(!last){stage.replaceChildren();meta.textContent='NO GRAPH';return}
    stage.style.transform=M.css(viewMatrix());
    const chain=last.chain||[];
    stage.replaceChildren(...chain.map((n,i)=>slab(n,i,chain.length)));
    const ret=last.address?.returnAddress?' · RETURN READY':'';
    meta.textContent=`${last.domain}/${last.scopeName} · ${chain.length} lineage slabs · ID ${last.identity||last.selectedId}${ret}`;
  }
  function setView(next){
    active=next;viewport.hidden=!active;toggle.classList.toggle('on',active);toggle.setAttribute('aria-pressed',String(active));toggle.textContent=active?'◩ SPATIAL ON':'◫ SPATIAL';
    if(active)render();
  }
  function resetView(){yaw=-27;pitch=17;depth=-115;render()}
  function applyView(){stage.style.transform=M.css(viewMatrix())}

  toggle.addEventListener('click',()=>setView(!active));
  reset.addEventListener('click',resetView);
  viewport.addEventListener('pointerdown',e=>{if(!active)return;drag={x:e.clientX,y:e.clientY,yaw,pitch,moved:false};viewport.setPointerCapture?.(e.pointerId)});
  viewport.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>4)drag.moved=true;yaw=drag.yaw+dx*.32;pitch=clampLensPitch(drag.pitch-dy*.28);applyView()});
  viewport.addEventListener('pointerup',e=>{if(!drag)return;suppressClick=drag.moved;drag=null;viewport.releasePointerCapture?.(e.pointerId);setTimeout(()=>suppressClick=false,0)});
  viewport.addEventListener('pointercancel',()=>{drag=null});
  viewport.addEventListener('wheel',e=>{if(!active)return;e.preventDefault();depth=clampLensDepth(depth-Math.sign(e.deltaY)*28);applyView()},{passive:false});
  viewport.addEventListener('dblclick',resetView);
  window.addEventListener('scale-lens:state',e=>render(e.detail));
  window.addEventListener('keydown',e=>{const tag=e.target?.tagName;if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||e.metaKey||e.ctrlKey||e.altKey)return;if(e.key.toLowerCase()==='v')setView(!active);else if(active&&e.key.toLowerCase()==='r')resetView()});

  render();
})();
