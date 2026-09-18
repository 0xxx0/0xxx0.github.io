'use strict';
(()=> {
  const $=s=>document.querySelector(s), api=window.ScaleLensSpatialAPI;
  const toggle=$('#spatialToggle'), reset=$('#spatialReset'), viewport=$('#spatialViewport'), stage=$('#spatialStage'), meta=$('#spatialMeta');
  if(!api||!toggle||!reset||!viewport||!stage||!meta)return;

  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)), rad=d=>d*Math.PI/180;
  const M={
    id:()=>[1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1],
    mul:(a,b)=>{const o=Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o},
    t:(x=0,y=0,z=0)=>[1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1],
    rx:a=>{const c=Math.cos(a),s=Math.sin(a);return[1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]},
    ry:a=>{const c=Math.cos(a),s=Math.sin(a);return[c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]},
    sc:(x=1,y=x,z=x)=>[x,0,0,0, 0,y,0,0, 0,0,z,0, 0,0,0,1],
    css:m=>'matrix3d('+m.map(n=>Math.abs(n)<1e-10?0:+n.toFixed(6)).join(',')+')'
  };

  let active=false,yaw=-27,pitch=17,depth=-115,drag=null,suppressClick=false,last=null;

  function viewMatrix(){
    return M.mul(M.t(0,0,depth),M.mul(M.rx(rad(pitch)),M.ry(rad(yaw))));
  }
  function slabMatrix(i,n,count){
    const center=(count-1)/2,x=(i-center)*118,y=((n.hash>>>0)%37)-18,z=(i-count+1)*58,twist=(((n.hash>>>0)%11)-5)*1.1;
    return M.mul(M.t(x,y,z),M.mul(M.ry(rad(twist)),M.sc(n.id===last?.selectedId?1.05:1)));
  }
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
  viewport.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>4)drag.moved=true;yaw=drag.yaw+dx*.32;pitch=clamp(drag.pitch-dy*.28,-70,70);applyView()});
  viewport.addEventListener('pointerup',e=>{if(!drag)return;suppressClick=drag.moved;drag=null;viewport.releasePointerCapture?.(e.pointerId);setTimeout(()=>suppressClick=false,0)});
  viewport.addEventListener('pointercancel',()=>{drag=null});
  viewport.addEventListener('wheel',e=>{if(!active)return;e.preventDefault();depth=clamp(depth-Math.sign(e.deltaY)*28,-520,150);applyView()},{passive:false});
  viewport.addEventListener('dblclick',resetView);
  window.addEventListener('scale-lens:state',e=>render(e.detail));
  window.addEventListener('keydown',e=>{const tag=e.target?.tagName;if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||e.metaKey||e.ctrlKey||e.altKey)return;if(e.key.toLowerCase()==='v')setView(!active);else if(active&&e.key.toLowerCase()==='r')resetView()});

  render();
})();
