/* fovea-lens.js — THE FOVEA
 *
 * A cursor-following lens. Human vision is not uniform: a small sharp centre
 * (the fovea) resolves detail, resolution falls with eccentricity. This
 * instrument borrows that shape.
 *
 * THE SIGNAL IS MEASURED, NOT SEEDED.
 * fold-bloom/listen/audio-glyph.js builds its ring from 24 sampled FRAMES of
 * real audio — radius from energy/flux/brightness, 12 chroma spokes from real
 * bands, ticks from real section count, inner radius from real bpm. Only the
 * ROTATION is seeded from the source hash. This file keeps that discipline:
 * a hash may ORIENT a figure, never INVENT one.
 *
 * The analogous signal for the FIELD is the route set itself. 24 samples of
 * the current support set give 24 radii — recency, liveness, version count,
 * child count and evidence, weighted. 12 chroma buckets count the states
 * present. Ticks are the focus's real child count. The inner radius is the
 * real live/total ratio. Nothing here is invented.
 *
 * WHAT THIS IS NOT: the parked `field-foveate` lens in field-lens.js, whose
 * park basis is itself unsourced — see control/FOVEATE_PARK_CORRECTION_2026-09-23.json.
 * That was bands dimming a static map; this follows the pointer and carries
 * the support set's own shape. Bands FOVEA/PARA/PERIPHERY stay single-sourced.
 *
 * OFF BY DEFAULT. Foot button or the `f` key.
 * Deletable: this file, #foveaLens CSS, the toggle. Nothing else.
 */
(()=>{'use strict';
const H=()=>window.FieldLensHost;
const MAP=()=>window.__fieldRouteMap;
const N=24;                 // 24 sensors, exactly as audio-glyph.js samples
const TAU=Math.PI*2;
const R=54;

let on=false, el=null, ring=null, x=0, y=0, raf=0, target=null;

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function polar(cx,cy,r,a){return[cx+r*Math.cos(a),cy+r*Math.sin(a)]}
function hexSeed(s){let h=2166136261>>>0;const t=String(s||'');for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619)>>>0}return h>>>0}

/* ---- REAL SIGNAL: the weight of a route, from fields it actually carries ----
 * recency    newer index.updated_at weighs more (30-day window)
 * live       ACTIVE / STABLE / PROOF_REQUIRED / CANDIDATE
 * versioned  has a versions[] history
 * children   how many routes name it as parent
 * evidence   has evidence refs attached
 */
function weightOf(r,newest,all){
  if(!r)return 0.18;
  const t=Date.parse(r.index?.updated_at||'')||0;
  const recency=(t&&newest)?clamp(1-(newest-t)/(1000*60*60*24*30),0,1):0;
  const live=['ACTIVE','STABLE','PROOF_REQUIRED','CANDIDATE'].includes(r.state)?1:0;
  const versioned=r.versions?.length?clamp(Math.log2(1+r.versions.length)/3,0,1):0;
  const kids=all?clamp(Math.log2(1+all.filter(x=>x.parent===r.href).length)/4,0,1):0;
  const ev=r.evidence?.length?clamp(Math.log2(1+r.evidence.length)/3,0,1):0;
  return clamp(.18 + recency*.30 + live*.20 + versioned*.14 + kids*.10 + ev*.06, .14, .96);
}
/* ---- sample N routes evenly across the support set (as sampleFrames does) ---- */
function sampleFrames(xs,n){
  if(!xs||!xs.length)return Array.from({length:n},()=>null);
  return Array.from({length:n},(_,i)=>xs[Math.min(xs.length-1,Math.round(i*(xs.length-1)/(n-1)))]||null);
}

const STATES=['ACTIVE','STABLE','CANDIDATE','PROOF_REQUIRED','PARKED','DONOR',
  'FROZEN_DONOR','RECOVER','UTILITY','REFERENCE','CORE','UNKNOWN'];

/* ---- the descriptor — the same audit surface audioGlyphDescriptor exposes ---- */
function descriptor(){
  const all=MAP()?.all?[...MAP().all().values()]:[];
  const h=H();
  let set=null;
  try{set=h?.visualKids?.();}catch(_){}
  if(!set||!set.length)set=all;
  const newest=all.reduce((m,r)=>Math.max(m,Date.parse(r.index?.updated_at||'')||0),0);
  const radial=sampleFrames(set,N).map(r=>weightOf(r,newest,all));
  const counts=STATES.map(s=>all.filter(r=>r.state===s).length);
  const maxC=Math.max(1,...counts);
  const chroma=counts.map(c=>c/maxC);
  const focus=h?.focus?.()||null;
  const kidN=focus?all.filter(r=>r.parent===focus.href).length:0;
  const liveN=all.filter(r=>['ACTIVE','STABLE','PROOF_REQUIRED','CANDIDATE'].includes(r.state)).length;
  return{
    radial,chroma,
    rotation:((hexSeed(focus?.href||'field')%360)/360)*TAU,   // ORIENTATION ONLY
    sectionCount:focus?Math.max(1,kidN):1,
    inner:all.length?clamp(liveN/all.length,.12,1):.12,
    setSize:set.length,total:all.length,liveN,
    means:{weight:+(radial.reduce((a,b)=>a+b,0)/radial.length).toFixed(4)}
  };
}

function stateColor(st){
  return ({ACTIVE:'#98d49b',STABLE:'#98d49b',CANDIDATE:'#d5ad68',PARKED:'#d5ad68',
    PROOF_REQUIRED:'#ed7447',DONOR:'#72bce7',FROZEN_DONOR:'#72bce7',
    RECOVER:'#ed7447',UTILITY:'#68757b',REFERENCE:'#87949a',CORE:'#87949a'})[st]||'#87949a';
}

function probe(cx,cy){
  const n=document.elementFromPoint(cx,cy);
  if(!n)return null;
  const chip=n.closest?.('.feedChip, .mapNode, .axisToken, [data-href]');
  if(!chip)return null;
  const href=chip.dataset?.href||'';
  const r=href?MAP()?.get?.(href):null;
  if(!href&&!r)return null;
  return{href,state:r?.state||'',title:r?.title||chip.getAttribute?.('title')||''};
}

/* ---- draw: a closed polygon from measured radii, as audioGlyphSvg does ---- */
function draw(){
  if(!ring)return;
  const d=descriptor();
  const col=target&&target.state?stateColor(target.state):'#72bce7';
  const c=60,rot=d.rotation-TAU/4;
  const pts=d.radial.map((v,i)=>polar(c,c,R*v,rot+TAU*i/d.radial.length));
  const poly=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(2)+' '+p[1].toFixed(2)).join(' ')+' Z';
  const out=[];
  out.push('<path d="'+poly+'" fill="'+col+'" fill-opacity=".10" stroke="'+col+'" stroke-width="1.1" stroke-opacity=".85"/>');
  d.chroma.forEach((v,i)=>{                       // 12 real state-count buckets
    const a=rot+TAU*i/12,[x1,y1]=polar(c,c,R*.18,a),[x2,y2]=polar(c,c,R*(.30+.55*(1-v)),a);
    out.push('<path d="M'+x1.toFixed(2)+' '+y1.toFixed(2)+' L'+x2.toFixed(2)+' '+y2.toFixed(2)+'" stroke="'+col+'" stroke-width=".8" stroke-opacity="'+(.14+.5*(1-v)).toFixed(2)+'"/>');
  });
  const sec=Math.min(16,d.sectionCount);          // real child count of the focus
  for(let i=0;i<sec;i++){
    const a=rot+TAU*i/sec,[x1,y1]=polar(c,c,R*.92,a),[x2,y2]=polar(c,c,R,a);
    out.push('<path d="M'+x1.toFixed(2)+' '+y1.toFixed(2)+' L'+x2.toFixed(2)+' '+y2.toFixed(2)+'" stroke="'+col+'" stroke-width=".7" stroke-opacity=".45"/>');
  }
  out.push('<circle cx="'+c+'" cy="'+c+'" r="'+(R*.12+.11*R*d.inner).toFixed(2)+'" fill="none" stroke="'+col+'" stroke-width="1.1" stroke-opacity=".9"/>');
  out.push('<circle cx="'+c+'" cy="'+c+'" r="2" fill="'+col+'" fill-opacity=".9"/>');
  ring.innerHTML=out.join('');
  el.dataset.band=target?'FOVEA':'PERIPHERY';
  el.dataset.set=d.setSize+'/'+d.total;
  el.dataset.mean=String(d.means.weight);
}

function place(){
  if(!el)return;
  el.style.transform='translate3d('+(x-R-6)+'px,'+(y-R-6)+'px,0)';
  const t=probe(x,y);
  const key=(t?.href||'')+'|'+(MAP()?.all?MAP().all().size:0);
  if(key!==(el.dataset.key||'')){el.dataset.key=key;target=t;draw()}
  if(t&&el.dataset.href!==t.href){el.dataset.href=t.href;el.title=t.title||t.href;readout(t)}
}

/* ---- THE READOUT: inspect without navigating. This is the utility. ----
 * The lens is big enough to read. You sweep the field and read each route in
 * place; you never click into anything you did not mean to open. */
function readout(t){
  const o=document.getElementById('foveaOut');
  if(!o)return;
  if(!t||!t.href){o.textContent='';o.dataset.kind='';return}
  const r=MAP()?.get?.(t.href)||{};
  const acts=(window.__fieldAct&&window.__fieldAct.siblings)?.()?.length||0;
  const st=String(r.state||'—'), kd=String(r.kind||'—');
  const meta=(st.toLowerCase()===kd.toLowerCase())?st:(st+' · '+kd);
  o.innerHTML='<b>'+esc(r.title||t.href)+'</b><i>'+esc(meta)+(acts?' · '+acts+' peers':'')+'</i>';
  o.dataset.kind=r.state||'';
}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}

/* ---- ACT at the point of attention ---- */
function onClick(e){
  if(!on)return;
  const t=target; if(!t||!t.href)return;
  if(e.shiftKey){window.__fieldAct?.open?.(t.href)}
  else{window.__fieldAct?.focus?.(t.href)}
  setTimeout(place,30);
}
function onWheel(e){
  if(!on)return;
  const d=e.deltaY>0?1:-1;
  window.__fieldAct?.peer?.(d);
  setTimeout(place,40);
}
function loop(){if(!on)return;place();raf=requestAnimationFrame(loop)}

/* Movement applies on the event, not on a frame: a backgrounded tab never
 * fires requestAnimationFrame, and a lens that freezes when the tab is not
 * painting is not a lens. rAF only keeps the figure alive at rest. */

function ensure(){
  if(el)return el;
  el=document.createElement('div');
  el.id='foveaLens';el.setAttribute('aria-hidden','true');
  el.innerHTML='<svg viewBox="0 0 120 120" width="120" height="120"><g id="foveaRing"></g></svg>'
    +'<div id="foveaOut" aria-live="polite"></div>';
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
    window.addEventListener('click',onClick,true);
    window.addEventListener('wheel',onWheel,{passive:true});
    loop();
  }else{
    window.removeEventListener('mousemove',onMove,MOVE);
    window.removeEventListener('mouseleave',onLeave);
    window.removeEventListener('mouseenter',onEnter);
    window.removeEventListener('click',onClick,true);
    window.removeEventListener('wheel',onWheel);
    cancelAnimationFrame(raf);
    if(el)el.style.opacity='0';
  }
  return on;
}

function boot(){
  const b=document.getElementById('foveaToggle');
  if(b){b.classList.add('ready');b.onclick=()=>toggle();
    b.title='READ WITHOUT CLICKING. Sweep the pointer over any glyph to read its title and state in place — click to select it, shift-click to open it, scroll to step through its peers. Nothing opens unless you mean it. Toggle: f key.';}
  window.addEventListener('keydown',onKey);
  window.FoveaLens=Object.freeze({
    toggle,on:()=>on,band:()=>el?.dataset.band||'OFF',
    target:()=>target,bands:['FOVEA','PARA','PERIPHERY'],
    descriptor,redraw:draw
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
