/* fovea-lens.js — THE FOVEA
 *
 * A cursor-following lens. Human vision is not uniform: a small sharp centre
 * (the fovea) resolves detail, and resolution falls with eccentricity. This
 * instrument borrows that shape.
 *
 * WHAT THIS IS NOT: it is not the parked `field-foveate` lens
 * (field-lens.js, status PARKED_NO_CLEAR_GAIN), which dimmed peripheral nodes
 * on the static map and produced no task advantage. That trial was bands on a
 * canvas. This one follows the pointer, carries the radial fingerprint of
 * whatever is beneath it, and pays out lens operations at the point of
 * attention.
 *
 * Bands are the same three the parked lens named — FOVEA / PARA / PERIPHERY —
 * so the vocabulary stays single-sourced.
 *
 * OFF BY DEFAULT. Toggle with the foot button or the `f` key.
 * Deletable: this file plus #foveaLens CSS plus the toggle. Nothing else.
 */
(()=>{'use strict';
const H=()=>window.FieldLensHost;
const N=24;               // ring samples, as in fold-bloom/listen/audio-glyph.js
const R=54;               // lens radius px
let on=false, el=null, ring=null, x=0, y=0, raf=0, target=null, seeders=new Map();

/* ---- a tiny deterministic hash: same target -> same ring, forever ---- */
function hash(s){
  let h=2166136261;
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}
  return h>>>0;
}
/* ---- polar placement, same geometry as the LISTEN ring ---- */
function polar(cx,cy,r,a){return[cx+r*Math.cos(a), cy+r*Math.sin(a)]}

/* ---- the fingerprint: 24 radii from the target's own identity ---- */
function fingerprint(key){
  if(seeders.has(key))return seeders.get(key);
  const h=hash(key), out=[];
  for(let i=0;i<N;i++){
    const s=hash(key+':'+i);
    // deterministic, but shaped so the ring reads as a form and not noise
    out.push(0.30+0.70*(((s>>>7)%997)/997));
  }
  seeders.set(key,out);return out;
}

function stateColor(st){
  return ({ACTIVE:'#98d49b',STABLE:'#98d49b',CANDIDATE:'#d5ad68',PARKED:'#d5ad68',
    PROOF_REQUIRED:'#ed7447',DONOR:'#72bce7',FROZEN_DONOR:'#72bce7',
    RECOVER:'#ed7447',UTILITY:'#68757b',REFERENCE:'#87949a'})[st]||'#87949a';
}

/* ---- what is under the lens right now ---- */
function probe(cx,cy){
  const n=document.elementFromPoint(cx,cy);
  if(!n)return null;
  const chip=n.closest?.('.feedChip, .mapNode, .axisToken, [data-href]');
  if(!chip)return null;
  const href=chip.dataset?.href||chip.getAttribute?.('data-value')||'';
  const r=href&&window.__fieldRouteMap?.get?.(href);
  return {href:href||chip.textContent.slice(0,24), state:r?.state||'', title:r?.title||chip.title||''};
}

function draw(){
  if(!ring)return;
  const key=target?target.href:'field';
  const rad=fingerprint(key);
  const col=target&&target.state?stateColor(target.state):'#72bce7';
  const parts=[];
  // periphery is drawn, not hidden — it fades, exactly as vision does
  for(let i=0;i<N;i++){
    const a=-Math.PI/2 + (i/N)*Math.PI*2;
    const rr=10+rad[i]*(R-10);
    const [px,py]=polar(60,60,rr,a);
    const [qx,qy]=polar(60,60,10,a);
    parts.push('<line x1="'+qx.toFixed(1)+'" y1="'+qy.toFixed(1)+'" x2="'+px.toFixed(1)+'" y2="'+py.toFixed(1)+
      '" stroke="'+col+'" stroke-width="1.1" opacity="'+(0.22+0.68*rad[i]).toFixed(2)+'"/>');
  }
  // the foveal centre
  parts.push('<circle cx="60" cy="60" r="9" fill="none" stroke="'+col+'" stroke-width="1.2" opacity=".85"/>');
  parts.push('<circle cx="60" cy="60" r="2" fill="'+col+'" opacity=".9"/>');
  ring.innerHTML=parts.join('');
  el.dataset.band=target?'FOVEA':'PERIPHERY';
}

function place(){
  if(!el)return;
  el.style.transform='translate3d('+(x-R-6)+'px,'+(y-R-6)+'px,0)';
  const t=probe(x,y);
  const key=(t?.href||'')+'|'+el.dataset.band;
  const changed=key!==(el.dataset.key||'');
  el.dataset.key=key;
  if(changed){target=t;draw()}
  if(t&&el.dataset.href!==t.href){
    el.dataset.href=t.href;
    el.title=t.title||t.href;
  }
}
function loop(){ if(!on)return; place(); raf=requestAnimationFrame(loop); }

/* Movement is applied on the event itself, not deferred to a frame.
 * A backgrounded or throttled tab never fires requestAnimationFrame, and a
 * lens that freezes when the tab is not painting is a lens that is not a
 * lens. rAF is kept only to keep the glow alive once the pointer rests. */

function ensure(){
  if(el)return el;
  el=document.createElement('div');
  el.id='foveaLens';
  el.setAttribute('aria-hidden','true');
  el.innerHTML='<svg viewBox="0 0 120 120" width="120" height="120"><g id="foveaRing"></g></svg>';
  document.body.appendChild(el);
  ring=el.querySelector('#foveaRing');
  return el;
}

const MOVE={passive:true};
function onMove(e){x=e.clientX;y=e.clientY;if(el)el.style.opacity='1';place()}
function onLeave(){if(el)el.style.opacity='0'}
function onEnter(){if(el&&on)el.style.opacity='1'}
function onKey(e){
  if(e.key!=='f'||e.metaKey||e.ctrlKey||e.altKey)return;
  const t=e.target;
  if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable))return;
  toggle(!on);
}

function toggle(next){
  on=next===undefined?!on:!!next;
  const b=document.getElementById('foveaToggle');
  if(b)b.classList.toggle('on',on);
  if(on){
    ensure();el.style.opacity='0';
    window.addEventListener('mousemove',onMove,MOVE);
    window.addEventListener('mouseleave',onLeave);
    window.addEventListener('mouseenter',onEnter);
    loop();
  }else{
    window.removeEventListener('mousemove',onMove,MOVE);
    window.removeEventListener('mouseleave',onLeave);
    window.removeEventListener('mouseenter',onEnter);
    cancelAnimationFrame(raf);
    if(el)el.style.opacity='0';
  }
  return on;
}

function boot(){
  const b=document.getElementById('foveaToggle');
  if(b){b.classList.add('ready');b.onclick=()=>toggle();}
  window.addEventListener('keydown',onKey);
  window.FoveaLens=Object.freeze({toggle,on:()=>on,band:()=>el?.dataset.band||'OFF',
    target:()=>target,bands:['FOVEA','PARA','PERIPHERY']});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
