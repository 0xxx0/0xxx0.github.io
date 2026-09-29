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
 * LAW — IT NEVER INTERFERES. When off, nothing in this file calls
 * preventDefault. When on, the lens is DISPLAY ONLY: it sweeps and reads the
 * route under the pointer; it never consumes clicks, wheel, touch or scroll.
 * Read/open actions live in the RADIAL, not in a click trap. The figure is
 * drawn OFF the pointer (above it, flipping below near the top edge) with a
 * leader line back to the point it reads — the cursor keeps its own pixels.
 *
 * THE SUMMON GESTURE — radial menu, same shape on both devices:
 *   touch/pen  long-press ~400ms stationary → RADIAL opens there; drag
 *              toward a slot; release selects; release elsewhere dismisses.
 *   keyboard   hold `f` ~400ms → RADIAL at the pointer; move to a slot;
 *              release `f` selects; Esc cancels.
 *   tap `f`, the foot ◎ FOVEA button and the semantic-scale ◎ FOVEA button
 *   still toggle the lens (tap `f` now toggles on key release).
 *   Esc closes the GLYPH figure, else the RADIAL, else turns the lens off.
 *   Selecting FOVEA activates the lens AT the gesture point (pin + read).
 *   Selecting GLYPH composes the held route's glyph, full size, at the point.
 *
 * SLOT EXTENSION (unified interphase hook): slots are DATA — see SLOTS and
 * FoveaLens.radial.register({id,label,angle,run}). GLYPH is the first built-in
 * interphase glyph operation: it composes the held route's glyph from the same
 * public surfaces heldGlyph() reads, full size, into a transient #foveaGlyphFig
 * div near the gesture point — display only, pointer-events none, z-index below
 * the lens. Esc closes it first; the next GLYPH use replaces it.
 *
 * OFF BY DEFAULT. Foot button, ◎ FOVEA, `f`, or the gesture.
 * Deletable: this file, the #foveaLens/#foveaRadial CSS, the toggles, and the
 * runtime-added #foveaGlyphFig div. Nothing else.
 */
(()=>{'use strict';
const H=()=>window.FieldLensHost;
const MAP=()=>window.__fieldRouteMap;
const N=24;                 // 24 sensors, exactly as audio-glyph.js samples
const TAU=Math.PI*2;
const R=54;                 // ring radius
const LENS=120;             // element size
const OFF=70;               // lens centre sits this far off the pointer
let on=false, el=null, ring=null, x=0, y=0, raf=0, target=null;
/* KINETIC STATE — the lens has mass. It trails the pointer under springs,
   stretches when it moves fast (squash & stretch), and overshoots when it
   locks a new target. Source: kinetic interaction / Disney 12 / P5. */
let px=0,py=0,vx=0,vy=0,scale=1,targetScale=1,spin=0,targetSpin=0,lockAt=0,stagger=0,lastProbe=0;
/* ANCHOR — the drawn centre; never the pointer itself */
let ax=0, ay=0, side='up', lastX=0, lastY=0;

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

/* ---- the anchor: computed from the pointer, never equal to it ---- */
function anchor(){
  const W=innerWidth,Hh=innerHeight,half=LENS/2;
  ax=clamp(x,half+4,Math.max(half+4,W-half-4));
  side=(y-OFF-(R+8)<4)?'down':'up';
  ay=(side==='up')?y-OFF:Math.min(y+OFF,Hh-half-4);
  if(el)el.dataset.side=side;
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
  let dly=0; const nextD=()=>{dly+=22;return dly};
  out.push('<path class="fovIn" style="animation-delay:'+nextD()+'ms" d="'+poly+'" fill="'+col+'" fill-opacity=".10" stroke="'+col+'" stroke-width="1.1" stroke-opacity=".85"/>');
  d.chroma.forEach((v,i)=>{                       // 12 real state-count buckets
    const a=rot+TAU*i/12,[x1,y1]=polar(c,c,R*.18,a),[x2,y2]=polar(c,c,R*(.30+.55*(1-v)),a);
    out.push('<path class="fovIn" style="animation-delay:'+((i*18)+40)+'ms" d="M'+x1.toFixed(2)+' '+y1.toFixed(2)+' L'+x2.toFixed(2)+' '+y2.toFixed(2)+'" stroke="'+col+'" stroke-width=".8" stroke-opacity="'+(.14+.5*(1-v)).toFixed(2)+'"/>');
  });
  const sec=Math.min(16,d.sectionCount);          // real child count of the focus
  for(let i=0;i<sec;i++){
    const a=rot+TAU*i/sec,[x1,y1]=polar(c,c,R*.92,a),[x2,y2]=polar(c,c,R,a);
    out.push('<path class="fovIn" style="animation-delay:'+((i*14)+90)+'ms" d="M'+x1.toFixed(2)+' '+y1.toFixed(2)+' L'+x2.toFixed(2)+' '+y2.toFixed(2)+'" stroke="'+col+'" stroke-width=".7" stroke-opacity=".45"/>');
  }
  out.push('<circle cx="'+c+'" cy="'+c+'" r="'+(R*.12+.11*R*d.inner).toFixed(2)+'" fill="none" stroke="'+col+'" stroke-width="1.1" stroke-opacity=".9"/>');
  out.push('<circle cx="'+c+'" cy="'+c+'" r="2" fill="'+col+'" fill-opacity=".9"/>');
  /* LEADER — a hairline from the lens edge to the point it reads. The lens is
     displaced off the pointer, so the figure must say which point it is about. */
  const lx=c+(x-ax), y1=side==='up'?(c+R+5):(c-R-5), y2=c+(y-ay)+(side==='up'?-5:5);
  if(Math.abs(y2-y1)>3)out.push('<path d="M'+lx.toFixed(1)+' '+y1+' L'+lx.toFixed(1)+' '+y2.toFixed(1)+'" stroke="'+col+'" stroke-width=".7" stroke-opacity=".28"/>');
  ring.innerHTML=out.join('');
  el.dataset.band=target?'FOVEA':'PERIPHERY';
  el.dataset.set=d.setSize+'/'+d.total;
  el.dataset.mean=String(d.means.weight);
}

function place(){
  if(!el)return;
  anchor();
  el.style.transform='translate3d('+(ax-LENS/2)+'px,'+(ay-LENS/2)+'px,0)';
  const t=probe(x,y);
  const key=(t?.href||'')+'|'+(MAP()?.all?MAP().all().size:0);
  if(key!==(el.dataset.key||'')){
    el.dataset.key=key;target=t;draw();
    // ANTICIPATION: lock a new target with an overshoot and a small kick
    lockAt=performance.now();
    targetSpin=(hexSeed(t?.href||'field')%9)-4;      // deterministic ±4deg
    stagger=0;                                        // restart the staggered draw
  }
  if(t&&el.dataset.href!==t.href){el.dataset.href=t.href;el.title=t.title||t.href;readout(t)}
}

/* ---- THE READOUT: inspect without navigating. This is the utility. ----
 * The lens is big enough to read. Sweep the field and read each route in
 * place; nothing is clicked into that was not meant to open. */
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

/* ---- impact feedback: a burst, never a click trap ---- */
function burst(col){
  if(!el)return;
  const b=document.createElement('div');
  b.className='fovBurst';
  b.style.borderColor=col||'#72bce7';
  /* clean up on the animation's own end, not a timer: background tabs throttle
     setTimeout to >=1000ms, so a timer leaks stray bursts. Same trap as rAF. */
  b.addEventListener('animationend',()=>b.remove(),{once:true});
  /* belt and braces: if the tab is hidden the animation never advances, so
     animationend never fires. A fallback timer (throttled to ~1s, still fires)
     guarantees the element does not outlive its welcome. */
  setTimeout(()=>b.remove(),1500);
  el.appendChild(b);
}

/* ==================================================================
 * GLYPH — the held object's composed glyph, full size, at the gesture
 * point: the same figure the visor runs at 58px, composed here from the
 * surfaces the page already exposes (route map + CURRENT heads +
 * FieldInterphase representation), into a transient #foveaGlyphFig div.
 * Display only — pointer-events none, z-index below the lens; it never
 * acts and never traps a click. Esc dismisses it first, the next GLYPH
 * use replaces it. A missing global or route = silent no-op, no error.
 * ================================================================== */
let headsP=null,figSeq=0;
function headList(){                                  // CURRENT.json, fetched once
  if(!headsP)headsP=fetch('./control/CURRENT.json').then(r=>r.ok?r.json():null)
    .then(j=>Array.isArray(j&&j.current_heads)?j.current_heads:[]).catch(()=>[]);
  return headsP;
}
async function figFor(href){                          // size-300 figure for one route
  const M=MAP(),r=M?.get?.(href);
  if(!r||!window.InterphaseGlyph)return null;
  const h=(await headList()).find(x=>x.route===r.href);
  const children=M.all?[...M.all().values()].filter(x=>x.parent===r.href):[];
  let rep=null;try{rep=window.FieldInterphase?.glyph?.(href)?.representation||null}catch(_){}
  const opt={children,size:300,...(rep?{representation:rep}:{})};
  try{
    if(h&&window.ProjectHeadGlyph)return window.ProjectHeadGlyph.svg(h,r,opt);
    const d=window.FieldInterphase?.describe?.(href);
    if(!d)return null;
    try{return window.InterphaseGlyph.svg(d,{size:300})}
    catch(_){
      /* A childless route asks interphase-ring for a 1-node depth ring and the
         ring asserts count>=2 (pre-existing). Fold the degenerate depth away
         and draw the rest of the figure rather than lose the projection. */
      return window.InterphaseGlyph.svg({...d,parent:null,address:d.address?{...d.address,parent:null}:null,children:[]},{size:300});
    }
  }catch(_){return null}
}
function glyphClose(){
  figSeq++;
  const f=document.getElementById('foveaGlyphFig');
  if(f){f.remove();return true}
  return false;
}
function glyphZoom(pt){
  const e=document.elementFromPoint(pt.x,pt.y);
  const chip=e?.closest?.('.feedChip,.mapNode,.axisToken,[data-href]');
  const href=(chip?.dataset?.href)||H()?.focus?.()?.href||window.__fieldAct?.focusHref?.()||'';
  if(!href)return;
  const seq=++figSeq;
  figFor(href).then(svg=>{
    if(!svg||seq!==figSeq)return;
    let f=document.getElementById('foveaGlyphFig');
    if(!f){
      f=document.createElement('div');f.id='foveaGlyphFig';f.setAttribute('aria-hidden','true');
      f.style.cssText='position:fixed;pointer-events:none;z-index:9997;background:#05070b;border:1px solid #2a3439;box-shadow:0 8px 40px #000b';
      document.body.appendChild(f);
    }
    f.style.left=clamp(pt.x+14,8,Math.max(8,innerWidth-308))+'px';
    f.style.top=clamp(pt.y+14,8,Math.max(8,innerHeight-308))+'px';
    f.innerHTML=svg;
    const g=f.querySelector('svg');if(g){g.setAttribute('width','300');g.setAttribute('height','300');g.style.display='block'}
  }).catch(()=>{});
}

/* ==================================================================
 * THE RADIAL — the summon gesture's menu. Gesture in, choice out.
 * Slots are DATA. This array is the extension seam for the unified
 * interphase glyph operations (SLOTS / FoveaLens.radial.register).
 * ================================================================== */
const SLOT_R=76, DEAD=26, HOLD_MS=400;
const SLOTS=[
  {id:'FOVEA',label:'FOVEA',angle:-90,run:pt=>{
    toggle(true);x=pt.x;y=pt.y;px=x;py=y;vx=0;vy=0;if(el)el.style.opacity='1';place();
  }},
  {id:'HOLD',label:'HOLD',angle:150,run:pt=>{
    const t=probe(pt.x,pt.y);if(t?.href){window.__fieldAct?.focus?.(t.href);burst(t.state?stateColor(t.state):'#d5ad68')}
  }},
  {id:'OPEN',label:'OPEN',angle:30,run:pt=>{
    const t=probe(pt.x,pt.y);if(t?.href)window.__fieldAct?.open?.(t.href);else burst('#ed7447');
  }},
  /* GLYPH — the held route's glyph, full size, at the gesture point (figFor).
     Display only; Esc closes the figure first, the next GLYPH use replaces it. */
  {id:'GLYPH',label:'GLYPH',angle:90,note:'held glyph, full size — display only',run:pt=>glyphZoom(pt)}
];
let radialEl=null,radialOpen=false,radialMode=null,hotSlot=-1,rx=0,ry=0;
let armTimer=0,armX=0,armY=0,armId=null,keyTimer=0,keyDownAt=0,suppressClicks=0,suppressTimer=0;

function slotHTML(){
  return SLOTS.map((s,i)=>{const a=s.angle*Math.PI/180;
    return '<div class="fovSlot'+(s.reserved?' reserved':'')+'" data-slot="'+i+'" title="'+escAttr(s.note||s.label)+'" style="left:'+(Math.cos(a)*SLOT_R).toFixed(1)+'px;top:'+(Math.sin(a)*SLOT_R).toFixed(1)+'px">'+s.label+'</div>'
  }).join('');
}
function escAttr(s){return String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function radialSlots(){
  const box=radialEl&&radialEl.querySelector('#foveaRadialSlots');
  if(box)box.innerHTML=slotHTML();
}
function radialEnsure(){
  if(radialEl)return radialEl;
  radialEl=document.createElement('div');radialEl.id='foveaRadial';radialEl.setAttribute('aria-hidden','true');
  radialEl.innerHTML='<svg viewBox="-100 -100 200 200" width="200" height="200">'
    +'<circle r="'+SLOT_R+'" fill="none" stroke="#2a3439" stroke-width="1" stroke-dasharray="2 5"/>'
    +'<circle r="'+DEAD+'" fill="none" stroke="#2a3439" stroke-width=".6" stroke-dasharray="1 4"/>'
    +'<circle r="2.5" fill="#d7ae67" fill-opacity=".85"/></svg>'
    +'<span id="foveaRadialHint">RELEASE ON A SLOT · ELSEWHERE DISMISSES · ESC CANCELS</span>'
    +'<div id="foveaRadialSlots"></div>';
  document.body.appendChild(radialEl);
  radialSlots();
  return radialEl;
}
function radialHighlight(mx,my){
  let idx=-1;
  if(radialEl){
    const dx=mx-rx,dy=my-ry,d=Math.hypot(dx,dy);
    if(d>=DEAD){
      const a=Math.atan2(dy,dx)*180/Math.PI;let best=1e9;
      SLOTS.forEach((s,i)=>{const dd=Math.abs(((a-s.angle+540)%360)-180);if(dd<best){best=dd;idx=i}});
    }
  }
  if(idx!==hotSlot){hotSlot=idx;radialEl?.querySelectorAll('.fovSlot').forEach((s,i)=>s.classList.toggle('on',i===idx))}
}
function radialOpenAt(mx,my,mode){
  radialEnsure();
  rx=mx;ry=my;radialOpen=true;radialMode=mode;hotSlot=-1;
  radialEl.style.transform='translate3d('+mx.toFixed(1)+'px,'+my.toFixed(1)+'px,0)';
  radialEl.querySelectorAll('.fovSlot').forEach(s=>s.classList.remove('on'));
  radialHighlight(mx,my);
  radialEl.classList.add('on');
  window.addEventListener('touchmove',radialTouchMove,{passive:false});
  window.addEventListener('contextmenu',radialCtx,true);
}
function radialClose(){
  if(!radialOpen)return;
  radialOpen=false;radialMode=null;hotSlot=-1;
  radialEl?.classList.remove('on');
  window.removeEventListener('touchmove',radialTouchMove);
  window.removeEventListener('contextmenu',radialCtx,true);
}
function radialSelect(){
  const s=hotSlot>=0?SLOTS[hotSlot]:null,mode=radialMode,pt={x:rx,y:ry};
  radialClose();
  if(mode==='press')armClickSuppress();   // the release must not also click through
  if(!s||s.reserved){if(s?.reserved)burst('#59666c');return s?null:null}
  try{s.run(pt)}catch(_){}
  return s.id;
}
/* exactly ONE click is filtered, and only within 400ms of a press-radial
   closing; late fires disarm themselves so a deliberate next tap is never lost */
function armClickSuppress(){suppressClicks=1;clearTimeout(suppressTimer);suppressTimer=setTimeout(()=>{suppressClicks=0},400)}
function radialTouchMove(e){if(radialOpen)e.preventDefault()}
function radialCtx(e){if(radialOpen)e.preventDefault()}

/* ---- the summon gestures ---- */
function armDown(e){                                  // touch/pen long-press
  if(radialOpen||!e.isPrimary||e.pointerType==='mouse'||(e.button!==undefined&&e.button!==0))return;
  armId=e.pointerId;armX=e.clientX;armY=e.clientY;
  clearTimeout(armTimer);
  armTimer=setTimeout(()=>{if(!radialOpen)radialOpenAt(armX,armY,'press')},HOLD_MS);
}
function armMove(e){
  if(e.pointerId!==armId)return;
  const d=Math.hypot(e.clientX-armX,e.clientY-armY);
  if(!radialOpen){if(d>10){clearTimeout(armTimer);armId=null}}
  else if(radialMode==='press')radialHighlight(e.clientX,e.clientY);
}
function armUp(e){
  if(e.pointerId!==armId)return;
  clearTimeout(armTimer);armId=null;
  if(radialOpen&&radialMode==='press')radialSelect();
}
function keyHoldEnd(){
  clearTimeout(keyTimer);
  if(radialOpen&&radialMode==='key'){radialSelect();return}      // release = select / dismiss
  if(performance.now()-keyDownAt<HOLD_MS)toggle(!on);            // quick tap = the old toggle
}
function onKeyDown(e){
  if(e.key!=='f'||e.metaKey||e.ctrlKey||e.altKey)return;
  const t=e.target;
  if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable))return;
  if(e.repeat)return;
  if(radialOpen){if(radialMode==='key')radialClose();return}
  keyDownAt=performance.now();clearTimeout(keyTimer);
  keyTimer=setTimeout(()=>{
    if(radialOpen)return;
    radialOpenAt(lastX||innerWidth/2,lastY||innerHeight/2,'key');
  },HOLD_MS);
}
function onKeyUp(e){
  if(e.key!=='f'||e.metaKey||e.ctrlKey||e.altKey||e.repeat)return;
  keyHoldEnd();
}
function onEscape(){
  if(glyphClose())return true;                 // the GLYPH figure dismisses first
  if(radialOpen){radialClose();return true}
  if(on){toggle(false);return true}
  return false;
}

/* ---- THE SPRING: stiffness k, friction damp. Not position-lerp: real velocity,
 * so the figure carries momentum and releases it. ---- */
function physics(){
  const k=0.26, damp=0.74;
  vx=(vx+(x-px)*k)*damp; vy=(vy+(y-py)*k)*damp;
  px+=vx; py+=vy;
  const speed=Math.hypot(vx,vy);
  // squash & stretch: fast motion elongates the lens along its travel
  const stretch=Math.min(.30, speed*.016);
  const stretchTarget=1+stretch;
  scale+=(stretchTarget-scale)*.30;
  // overshoot & settle when the ring changed target (P5 slam-in)
  if(performance.now()-lockAt<260){ scale+= (1.16-scale)*.22; }
  spin+= (targetSpin-spin)*.12;
  anchor();
  /* the body springs toward the pointer; the drawn centre is the ANCHOR, so
     the figure trails and settles off the pointer, never on it */
  if(el)el.style.transform='translate3d('+(px-(x-ax)-LENS/2).toFixed(1)+'px,'+(py-(y-ay)-LENS/2).toFixed(1)+'px,0) scale('+scale.toFixed(3)+') rotate('+spin.toFixed(2)+'deg)';
}
function loop(){
  if(!on)return;
  physics();
  if(performance.now()-lastProbe>60){lastProbe=performance.now();place()}
  raf=requestAnimationFrame(loop);
}

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

/* All observation is passive: position tracking + gesture arming. Nothing
 * below calls preventDefault except the two deliberate cases (touchmove /
 * contextmenu while the RADIAL is open, and the 700ms click filter that
 * follows a press-radial release so the release does not also click through). */
const MOVE={passive:true};
function onMove(e){
  x=e.clientX;y=e.clientY;lastX=x;lastY=y;
  if(!px&&!py){px=x;py=y}
  if(radialOpen)radialHighlight(x,y);
  if(on&&el){el.style.opacity='1';place()}
}
function onPointerDown(e){
  if(radialOpen&&radialMode==='key'){radialClose()}      // a click means "not the radial"
  x=e.clientX;y=e.clientY;lastX=x;lastY=y;
  if(!px&&!py){px=x;py=y}
  if(on&&el)el.style.opacity='1';
  armDown(e);
}
function onPointerUp(e){armUp(e)}
function onPointerCancel(e){if(e.pointerId===armId){clearTimeout(armTimer);armId=null}if(radialOpen&&radialMode==='press')radialClose()}
function onLeave(e){if(el&&(!e||e.pointerType==='mouse'||!e.pointerType))el.style.opacity='0'}
function onEnter(){if(el&&on)el.style.opacity='1'}
function onKey(e){
  /* ONE press = ONE step. Escape used to fire onEscape twice (keydown AND
     keyup), so a single press dismissed two surfaces; with the figure in the
     staircase that would close it and toggle the lens in the same press. */
  if(e.key==='Escape'){if(e.type==='keydown'&&!e.repeat&&onEscape())e.preventDefault();return}
  if(e.key!=='f')return;
  if(e.type==='keydown')onKeyDown(e);else onKeyUp(e);
}
function onClickFilter(e){if(suppressClicks>0){suppressClicks=0;e.preventDefault();e.stopImmediatePropagation()}}

function toggle(next){
  on=next===undefined?!on:!!next;
  const b=document.getElementById('foveaToggle');
  if(b)b.classList.toggle('on',on);
  if(on){
    ensure();
    if(!x&&!y){x=innerWidth/2;y=innerHeight/2;px=x;py=y}
    el.style.opacity='1';px=x;py=y;vx=0;vy=0;scale=.7;lockAt=performance.now();
    place();loop();
  }else{
    cancelAnimationFrame(raf);
    if(el){el.style.opacity='0';el.querySelectorAll('.fovBurst').forEach(b=>b.remove())}
  }
  window.dispatchEvent(new CustomEvent('field-fovea',{detail:{on,semanticScale:window.FieldPresentation?.state?.()||null}}));
  return on;
}

function boot(){
  const b=document.getElementById('foveaToggle');
  if(b){b.classList.add('ready');b.onclick=()=>toggle();
    b.title='LOCAL DETAIL. Off by default; it never blocks clicks or scrolling. Summon: hold ~400ms (touch: anywhere; keyboard: `f`) → radial at that point; drag to a slot and release. Tap `f`, this button, or ◎ FOVEA to toggle. Esc dismisses.';}
  window.addEventListener('keydown',onKey,true);
  window.addEventListener('keyup',onKey,true);
  window.addEventListener('pointermove',onMove,MOVE);
  window.addEventListener('pointerdown',onPointerDown,MOVE);
  window.addEventListener('pointerup',onPointerUp,MOVE);
  window.addEventListener('pointercancel',onPointerCancel,MOVE);
  window.addEventListener('pointerleave',onLeave);
  window.addEventListener('pointerenter',onEnter);
  window.addEventListener('click',onClickFilter,true);
  window.FoveaLens=Object.freeze({
    toggle,on:()=>on,band:()=>el?.dataset.band||'OFF',
    target:()=>target,bands:['FOVEA','PARA','PERIPHERY'],
    descriptor,redraw:draw,side:()=>side,
    /* THE EXTENSION SEAM — the unified interphase registers glyph slots here. */
    radial:Object.freeze({
      open:(mx,my)=>radialOpenAt(mx??innerWidth/2,my??innerHeight/2,'api'),
      close:radialClose,
      ready:()=>radialOpen,
      slots:()=>SLOTS.map(s=>({id:s.id,label:s.label,angle:s.angle,reserved:!!s.reserved,note:s.note||''})),
      register:s=>{
        if(!s||!s.id||typeof s.run!=='function'||SLOTS.some(x=>x.id===s.id))return false;
        SLOTS.push({id:s.id,label:s.label||s.id,angle:Number(s.angle)||0,reserved:!!s.reserved,note:s.note||'',run:s.run});
        radialSlots();
        return true;
      }
    })
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();