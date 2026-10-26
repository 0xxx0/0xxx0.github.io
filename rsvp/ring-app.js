// THE RING — the game layer over READFIELD's FieldAperture.
//
// FieldAperture owns segmentation, cursor, ORP, playback and the clock; FieldSourceTrail
// owns position. This file owns the run, the gates and the ledger. There is no second
// reader clock: playback is paused/resumed through ap.stop()/ap.toggleRSVP() and the pace
// is set through ap.setWpm().
//
// The source-loading and handoff logic is preserved verbatim from reader.js v0.10.0:
// the 2 MB ceiling, the same-origin path rule, the hash identity check (and its
// "identity mismatch" message), the rsvp.handoff.v1 / readfield.handoff.v1 keys and the
// persist() trail behaviour are unchanged. The four transport controls and every ID the
// reading-continuity gate asserts are kept; no visible control is added.
(()=>{'use strict';
const el=id=>document.getElementById(id),ap=el('wristAperture'),C=333.009,TAU=Math.PI*2,SVGNS='http://www.w3.org/2000/svg';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));

/* ═════════════════════════════════════════════════════════════════════════════
   0 · DETERMINISTIC CORE — fallback only.

   The canonical RingCore lives in ring-core.js (sibling lane) and is used whenever it
   is present; the page loads it before this file. This block exists so the shell is
   self-proving on its own (no build step, no missing-file throw) and is skipped the
   moment a real RingCore is defined. Contracts followed exactly: words/hash32/plan/
   newRun/openGate/answer/score/SPEED/PALETTE/decode. No Math.random, no Date.
   ═════════════════════════════════════════════════════════════════════════════ */
// The canonical engine. No fallback copy: a second implementation of the same law drifts
// (the shell's own copy had already diverged from RingCore.PALETTE on three hexes).
// Missing engine is a loud failure, not a silent alternative.
const Core=window.RingCore;
if(!Core||typeof Core.plan!=='function')throw Error('THE RING: ring-core.js did not load');
const SPEED=Core.SPEED;
const PALETTE=Core.PALETTE;
const HEX=new Map(PALETTE.map(p=>[p.key,p.hex]));
// P14: a hue with no palette entry is a lie about its field. Fail loudly rather than
// silently substituting bone — a silent substitution is exactly how the shell's duplicate
// table drifted from the engine's on three colours without anyone noticing.
const hue=key=>{const h=HEX.get(key);if(!h)throw Error('THE RING: hue not declared in PALETTE: '+key);drawn.add(key);return h;};

/* The declared palette is the only source of colour: re-point the CSS custom
   properties at it so no stylesheet value can drift from the table. */
(()=>{const set=(name,key)=>{const v=HEX.get(key);if(v)document.documentElement.style.setProperty(name,v)};
 set('--pad','ground');set('--line','structure');set('--bone','word');set('--accent','ask');
 set('--paid','paid');set('--read','read');set('--gate','gate');})();

/* ═════════════════════════════════════════════════════════════════════════════
   1 · READER STATE (reader.js v0.10.0, unchanged)
   ═════════════════════════════════════════════════════════════════════════════ */
let raw='',label='',sourceAddress='',sourceHash='',returnAddress='',nodes=[],epoch=0,trailKey='',lastPersist=0,loading=false;
let wpm=260;try{wpm=Number(localStorage.getItem('pin.wpm'))||260}catch(_){}
const safe=value=>{if(!value)return'';try{const u=new URL(value,location.href);return u.origin===location.origin?u.pathname+u.search+u.hash:''}catch(_){return''}};
const snap=()=>ap.snapshot();
function persist(s=raw&&snap()){
 if(!s||!trailKey||loading)return;
 const now=Date.now();if(s.playing&&now-lastPersist<1100)return;lastPersist=now;
 FieldSourceTrail.record(trailKey,{address:s.address,progress:s.source_progress,focus:s.focus,charIndex:s.char_index,scale:s.scale,via:'READFIELD_WRIST'});
}

/* ═════════════════════════════════════════════════════════════════════════════
   2 · RUN STATE + LEDGER
   ═════════════════════════════════════════════════════════════════════════════ */
const LEDGER_KEY='ring.ledger.v1';
let plan=null,run=null,gate=null,liveProgress=0,note='',painting=false,lastMarksKey=null,lastGateKey=null,lastTicksKey=null;
const blank=l=>({best:Number(l&&l.best)||0,bestWpm:Number(l&&l.bestWpm)||0,runs:Number(l&&l.runs)||0,streak:Number(l&&l.streak)||0,day:String(l&&l.day||''),last:(l&&l.last)||null});
function readLedger(){try{return blank(JSON.parse(localStorage.getItem(LEDGER_KEY)||'null'))}catch(_){return blank(null)}}
let ledger=readLedger();
function writeLedger(){try{localStorage.setItem(LEDGER_KEY,JSON.stringify(ledger))}catch(_){}}
const dayKey=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
function dayBefore(key){const p=String(key).split('-').map(Number);if(p.length!==3||p.some(n=>!Number.isFinite(n)))return'';const d=new Date(p[0],p[1]-1,p[2]);d.setDate(d.getDate()-1);return dayKey(d)}
function renderLedger(){
 const n=el('ledger');if(!n)return;
 n.textContent=ledger.runs
  ?('BEST '+ledger.best+' · '+ledger.bestWpm+' WPM · '+ledger.runs+(ledger.runs===1?' RUN':' RUNS')+' · '+ledger.streak+(ledger.streak===1?' DAY':' DAYS'))
  :'NO RUNS YET';
}
function record(sc){
 const s=sc||{score:0,wpm:0};
 ledger.runs+=1;
 ledger.best=Math.max(ledger.best,s.score|0);
 ledger.bestWpm=Math.max(ledger.bestWpm,s.wpm|0);
 const today=dayKey(new Date());
 if(ledger.day!==today){ledger.streak=(ledger.day&&ledger.day===dayBefore(today))?ledger.streak+1:1;ledger.day=today}
 ledger.last={score:s.score|0,wpm:s.wpm|0,accuracy:Number(s.accuracy)||0,at:today};
 writeLedger();renderLedger();
}

/* ═════════════════════════════════════════════════════════════════════════════
   3 · GEOMETRY — RingView owns every path and hit test.

   No second copy. The shell originally carried its own arcPath/sectorPath/sectorAt as a
   fallback, which is the same duplicate-law defect the engine had: two implementations of
   one geometry drift silently and only a pixel proves which one is drawing. Angles are
   radians, 0 = top, clockwise; viewBox 120×120, centre 60,60.
   ═════════════════════════════════════════════════════════════════════════════ */
const View=window.RingView;
if(!View||typeof View.arcPath!=='function'||typeof View.sectorPath!=='function'||typeof View.sectorAt!=='function')
 throw Error('THE RING: ring-view.js did not load');
const geo={arc:View.arcPath,sector:View.sectorPath,hit:View.sectorAt};
// Polar → Cartesian for placing a mark's ENDPOINTS (a tick from r0 to r1 at an angle).
// This is not a second path-building law: RingView owns every path string and every hit
// test; the app only needs the two points a tick spans.
const pt=(cx,cy,r,a)=>[cx+r*Math.sin(a),cy-r*Math.cos(a)];
const R0=35.5,R1=53;

/* ═════════════════════════════════════════════════════════════════════════════
   4 · RENDER — one frame, from state. Colour is carried by geometry too:
       read = arc length + dot, ask = three sectors, gate = long tick,
       paid = short thick notch. palette() reports only keys actually drawn.
   ═════════════════════════════════════════════════════════════════════════════ */
let drawn=new Set();
function renderSVG(p){
 p=clamp(p,0,1);
 const ring=el('ring'),sweep=el('sweep');
 // The position arc stays while a gate is open: hiding it erased the coordinate at the exact
// moment the player needs to know where they are. Sectors paint under it (index.html order).
 const live=!!run,showRing=live;
 // One source of truth: hue() registers every colour it returns, so the set cannot drift
 // from what is on screen. The only seed is the page's own ground, which CSS paints.
 drawn=new Set(['ground']);

 ring.style.display=showRing?'':'none';
 sweep.style.display=showRing?'':'none';
 if(showRing){
  const a=p*TAU;
  ring.setAttribute('stroke',hue('read'));
  ring.setAttribute('stroke-dashoffset',String(C*(1-p)));
  sweep.setAttribute('cx',(60+R1*Math.sin(a)).toFixed(3));
  sweep.setAttribute('cy',(60-R1*Math.cos(a)).toFixed(3));
  sweep.setAttribute('fill',hue('read'));
 }
 const base=document.querySelector('.orbit .base');
 if(base)base.setAttribute('stroke',hue('structure'));
 renderMarks();renderTicks();renderGates();
 el('fill').style.width=(p*100).toFixed(2)+'%';
}
function renderMarks(){
 const host=el('marks'),list=(run&&run.marks)||[];
 for(const m of list)drawn.add(m.ok?'read':'paid');
 const key=list.map(m=>Math.round(m.at*1e5)+(m.ok?'+':'-')).join(',');
 if(key===lastMarksKey)return;
 lastMarksKey=key;host.textContent='';
 for(const m of list){
  const a=clamp(m.at,0,1)*TAU,r0=m.ok?49:51.5,r1=m.ok?57:56;
  const A=pt(60,60,r0,a),B=pt(60,60,r1,a),l=document.createElementNS(SVGNS,'path');
  l.setAttribute('d','M'+A[0].toFixed(2)+' '+A[1].toFixed(2)+'L'+B[0].toFixed(2)+' '+B[1].toFixed(2));
  l.setAttribute('stroke',hue(m.ok?'read':'paid'));
  l.setAttribute('stroke-width',m.ok?'1.3':'2.6');
  host.appendChild(l);
 }
}
function renderTicks(){
 const host=el('ticks');if(!host)return;
 // The gates still ahead, drawn as long thin ticks in the 'gate' hue — the palette's own
 // definition ("where the text will ask, before it asks"). Without these the ring gave no
 // warning of what was coming, which is what made a gate feel like an ambush rather than a
 // promise. Answered gates leave the set and reappear as a mark.
 const gates=(plan&&plan.gates)||[];
 const answered=new Set(((run&&run.marks)||[]).map(m=>Math.round(m.at*1e5)));
 const list=(run&&!run.over)?gates.filter(g=>!answered.has(Math.round(g.at*1e5))):[];
 if(list.length)drawn.add('gate');
 const key=list.map(g=>g.at.toFixed(4)).join(',');
 if(key===lastTicksKey)return;
 lastTicksKey=key;host.textContent='';
 for(const g of list){
  const at=clamp(g.at,0,1)*TAU,A=pt(60,60,51.5,at),B=pt(60,60,57,at),l=document.createElementNS(SVGNS,'path');
  l.setAttribute('d','M'+A[0].toFixed(2)+' '+A[1].toFixed(2)+'L'+B[0].toFixed(2)+' '+B[1].toFixed(2));
  l.setAttribute('stroke',hue('gate'));l.setAttribute('stroke-width','1.1');
  host.appendChild(l);
 }
}
function renderGates(){
 const host=el('gates'),key=gate?String(gate.at):'';
 if(gate){drawn.add('ask');drawn.add('word')}
 // `hidden` is an HTMLElement property; on an SVG <g> only the attribute works.
 if(gate)host.removeAttribute('hidden');else host.setAttribute('hidden','');
 if(key===lastGateKey)return;
 lastGateKey=key;host.textContent='';
 if(!gate)return;
 const rot=gateRot();
 for(let k=0;k<3;k++){
  const a0=k*TAU/3,a1=(k+1)*TAU/3,slot=((k-rot)%3+3)%3,p=document.createElementNS(SVGNS,'path');
  p.setAttribute('d',geo.sector(60,60,R0,R1,a0,a1));
  p.setAttribute('fill',hue('ask'));
  p.setAttribute('fill-opacity','0.1');
  p.setAttribute('stroke','none');
  p.setAttribute('data-sector',String(k));
  const cap=document.createElementNS(SVGNS,'title');
  cap.textContent=String((gate.candidates&&gate.candidates[slot])||'')+' · press '+String(slot+1);
  p.appendChild(cap);
  host.appendChild(p);
 }
 for(let k=0;k<3;k++){                       // hairline boundaries, not card edges
  const a=k*TAU/3,A=pt(60,60,R0,a),B=pt(60,60,R1,a),l=document.createElementNS(SVGNS,'line');
  l.setAttribute('x1',A[0].toFixed(2));l.setAttribute('y1',A[1].toFixed(2));
  l.setAttribute('x2',B[0].toFixed(2));l.setAttribute('y2',B[1].toFixed(2));
  l.setAttribute('stroke',hue('structure'));l.setAttribute('stroke-width','0.8');
  host.appendChild(l);
 }
 const rm=(R0+R1)/2;
 for(let k=0;k<3;k++){
  const slot=((k-rot)%3+3)%3;
  const word=String((gate.candidates&&gate.candidates[slot])||''),mid=(k*TAU/3+(k+1)*TAU/3)/2;
  const t=document.createElementNS(SVGNS,'text');
  t.setAttribute('x','60');t.setAttribute('y',(60-rm).toFixed(2));
  t.setAttribute('text-anchor','middle');t.setAttribute('dominant-baseline','middle');
  t.setAttribute('fill',hue('word'));
  // keep the label readable in pixels, not only in user units: the wrist renders
  // the same 120-unit viewBox at ~104 px, the phone at 340 px.
  const svgEl=document.querySelector('.orbit');
  const px=(svgEl&&svgEl.getBoundingClientRect?svgEl.getBoundingClientRect().width:0)||340;
  const grow=Math.pow(Math.max(1,340/Math.max(80,px)),0.55);
  t.setAttribute('font-size',Math.max(3.2,Math.min(9.6,6.4*grow-Math.max(0,word.length-7)*(0.42*grow))).toFixed(2));
  t.textContent=word;
  const deg=mid*180/Math.PI;
  t.setAttribute('transform',(deg>90&&deg<270)
   ?'rotate('+deg.toFixed(2)+' 60 60) rotate(180 60 '+(60-rm).toFixed(2)+')'
   :'rotate('+deg.toFixed(2)+' 60 60)');
  host.appendChild(t);
 }
}
function paintStrip(s){
 const strip=document.querySelector('.word'),before=el('before'),mark=el('mark'),after=el('after');
 if(!strip)return;
 if(gate&&raw){
  strip.classList.add('gate');
  const line=gate.line||{s:gate.gap.s,e:gate.gap.e};
  // The gate line is 60-220 characters: drawing it whole overflowed the strip and clipped
  // mid-word at the ring's edge. A window either side of the gap keeps the clause readable
  // and the blank unambiguous; the ellipsis states that text continues, so the window is
  // never mistaken for the whole sentence.
  const WIDE=16;   // each side must fit its own half of a 1fr|auto|1fr strip at 14px mono
  const from=Math.max(line.s,gate.gap.s-WIDE),to=Math.min(line.e,gate.gap.e+WIDE);
  before.textContent=(from>line.s?'\u2026 ':'')+raw.slice(from,gate.gap.s);
  after.textContent=raw.slice(gate.gap.e,to)+(to<line.e?' \u2026':'');
  mark.textContent='';
  mark.style.width=Math.max(2,Math.min(8,(gate.answer||'').length))+'ch';
  return;
 }
 strip.classList.remove('gate');mark.style.width='';
 const parts=FieldAperture.orpParts((s&&s.focus)||'φ');
 before.textContent=parts.before;mark.textContent=parts.mark;after.textContent=parts.after;
}
function paintContext(s){
 const ctx=el('context');if(!ctx)return;
 ctx.classList.toggle('ask',!!gate);
 if(gate){ctx.textContent='Tap the missing word';return}
 if(note){ctx.textContent=note;return}
 if(!raw||!s){ctx.textContent='Tap SOURCE to read text or JSON';return}
 if(s.playing){ctx.textContent='';return}
 const span=s.span||{start:0,end:0};
 ctx.textContent=raw.slice(Math.max(0,span.start-55),Math.min(raw.length,span.end+65));
}
function paintStatus(s){
 const pos=el('position'),st=el('state');
 if(!raw||!s){pos.textContent='NO SOURCE';st.textContent='READY';return}
 if(!run){pos.textContent=(s.index+1)+' / '+s.count+' · '+(nodes.length?'JSON':'TEXT');st.textContent=s.playing?'PLAY':'PAUSED';return}
 const total=(plan&&plan.gates)?plan.gates.length:0;
 if(gate){
  const gi=gateIndex(gate);
  pos.textContent='GATE '+(gi<0?1:gi+1)+' / '+total;st.textContent='ASK';return;
 }
 if(run.over){pos.textContent='BEST '+ledger.best;st.textContent='OVER';return}
 pos.textContent=Math.round(liveProgress*100)+'%';
 st.textContent=s.playing?'RUN':'HOLD';
}
function paintControls(s){
 if(s&&Number.isFinite(s.wpm))wpm=s.wpm;
 el('speed').textContent=wpm+' WPM';
 el('value').textContent=wpm+' WPM';
 el('rate').value=wpm;
 el('rate').disabled=!!(run&&!run.over);
 el('play').disabled=!!gate;
 el('play').textContent=(s&&s.playing)?'Ⅱ PAUSE':'▶ READ';
 el('play').setAttribute('aria-label',gate?'Answer the ring first':'Play or pause the reader');
}
function frame(s){
 paintStrip(s);paintContext(s);paintStatus(s);paintControls(s);renderSVG(liveProgress);
}

/* ═════════════════════════════════════════════════════════════════════════════
   5 · THE LOOP — one evaluation path for the clock and for forceProgress()
   ═════════════════════════════════════════════════════════════════════════════ */
function announce(msg){const n=el('runLive');if(n)n.textContent=String(msg||'')}
function gateIndex(g){
 if(!g||!plan||!Array.isArray(plan.gates))return -1;
 return plan.gates.findIndex(x=>x.at===g.at);
}
function gateRot(){const i=gateIndex(gate);return i<0?0:i%3}
/* One candidate order per plan, one deal per gate.
   The plan's answer slot is fixed (seed % 3) so the index a caller sees never
   moves between gates; the sectors are dealt in gate order, so the screen
   position of the right word changes every time and carries no information. */
function normalizeGate(g){
 const list=g&&g.candidates;
 if(!Array.isArray(list)||list.length!==3||g.answer==null)return g;
 const slot=(Number(plan&&plan.seed)||0)%3,at=list.indexOf(g.answer);
 if(at<0||at===slot)return g;
 const rest=list.filter((_,i)=>i!==at);
 rest.splice(slot,0,g.answer);
 g.candidates=rest;
 return g;
}
function openIfDue(){
 if(!run||run.over||gate)return false;
 if(el('drawer')&&!el('drawer').hidden)return false;
 let g=null;try{g=Core.openGate(run,liveProgress)}catch(_){g=null}
 if(!g)return false;
 normalizeGate(g);
 gate=g;run.opened=g;note='';
 ap.stop();
 announce('Gate '+(gateIndex(g)+1)+' of '+(plan.gates.length)+'. Which word was here: '+g.candidates.join(', ')+'. Press one, two or three.');
 return true;
}
function resetRun(){
 run=null;gate=null;plan=null;liveProgress=0;note='';
 lastMarksKey=null;lastGateKey=null;lastTicksKey=null;
 const g=el('gates');if(g){g.textContent='';g.setAttribute('hidden','')}
 const m=el('marks');if(m)m.textContent='';
}
function startRun(){
 if(!raw||!ap.A)return state();
 if(run&&!run.over)return state();
 try{plan=Core.plan(raw,sourceHash,{gates:6,minWords:240,seed:0})}catch(_){plan={words:0,length:0,seed:0,gates:[]}}
 if(!plan||!Array.isArray(plan.gates))plan={words:0,length:0,seed:0,gates:[]};
 run=Core.newRun(plan)||{plan,wpm:SPEED.start,startWpm:SPEED.start,correct:0,wrong:0,over:false,marks:[],wordsRead:0};
 run.plan=plan;
 gate=null;note='';liveProgress=0;lastMarksKey=null;lastGateKey=null;lastTicksKey=null;
 ap.setWpm(run.wpm);
 const s=snap();
 if(s&&!s.playing)ap.toggleRSVP();
 frame(snap());
 announce('Run started. '+plan.gates.length+' gates on this source.');
 return state();
}
function resume(){
 const s=snap();
 if(!run||run.over||!s)return;
 if(s.index>=s.count-1){endRun('complete');return}
 if(!s.playing)ap.toggleRSVP();
}
function endRun(reason){
 if(gate){gate=null;if(run)run.opened=null}
 ap.stop();
 if(!run){frame(snap());return state()}
 run.over=true;run.ended=reason||'stopped';
 if(plan)run.wordsRead=reason==='complete'?plan.words:Math.min(plan.words,run.wordsRead|0);
 let sc=null;try{sc=Core.score(run)}catch(_){sc=null}
 if(!run.recorded){run.recorded=true;record(sc)}
 const total=sc?sc.score:0;
 note=reason==='lost'?('Three wrong · run over · '+total):reason==='complete'?('Run complete · '+total):('Run ended · '+total);
 frame(snap());
 lastGateKey=null;
 announce(note+'. Best '+ledger.best+'.');
 return state();
}
function answer(i){
 if(!run||run.over||!gate)return state();
 const g=gate,idx=Math.max(0,Math.min(2,Math.round(Number(i))||0));
 // The engine addresses gates by ORDINAL (`gates[run.opened]`), not by object. Handing it the
 // object made `gates[object]` undefined, so every tap returned {ok:false} and the run closed
 // the gate without charging anything — a game that could not be lost or won. Integration
 // defect between the two lanes; caught only by playing it.
 const gateList=(run.plan&&run.plan.gates)||plan.gates;
 const ordinal=gateList.indexOf(g);
 if(ordinal<0)return state();
 run.opened=ordinal;
 let res=null;try{res=Core.answer(run,idx)}catch(_){res=null}
 if(res&&res.run)run=res.run;
 run.plan=run.plan||plan;
 const ok=!!(res&&res.ok);
 gate=null;run.opened=null;
 note=(ok?'+'+SPEED.stepUp:'−'+SPEED.stepDown)+' WPM · '+(g.answer||g.candidates[idx]);
 ap.setWpm(run.wpm);
 if(run.over){endRun('lost');return state()}
 resume();
 frame(snap());
 announce((ok?'Correct. ':'Wrong. The word was '+(g.answer||'')+'. ')+run.wpm+' words per minute.');
 return state();
}
function forceProgress(p){
 if(!raw||!run||run.over)return state();
 liveProgress=clamp(p,0,1);
 // The test path must MOVE THE SAME CLOCK the player's does. Without this the aperture stayed
 // at word 0, the next paint pulled liveProgress back from s.source_progress, and every run
 // scored 0 words — the ledger recorded runs it could never credit. A test hook that does not
 // drive the real clock is a second implementation wearing a debug name.
 try{if(typeof ap.seekFraction==='function')ap.seekFraction(liveProgress)}catch(_){}
 const after=snap();
 if(after&&Number.isFinite(after.source_progress))liveProgress=clamp(after.source_progress,0,1);
 if(plan)run.wordsRead=Math.min(plan.words,Math.round(liveProgress*plan.words));
 openIfDue();
 frame(snap());
 return state();
}
function state(){
 const s=raw?snap():null;
 return{
  running:!!(run&&!run.over),
  wpm:run?run.wpm:(s&&Number.isFinite(s.wpm)?s.wpm:wpm),
  correct:run?run.correct|0:0,
  wrong:run?run.wrong|0:0,
  over:!!(run&&run.over),
  progress:liveProgress,
  gate:gate?{at:gate.at,gap:{s:gate.gap.s,e:gate.gap.e},candidates:gate.candidates.slice(0,3)}:null,
  marks:run?(run.marks||[]).map(m=>({at:m.at,ok:!!m.ok})):[],
  ledger:{best:ledger.best,bestWpm:ledger.bestWpm,runs:ledger.runs,streak:ledger.streak},
  source:raw
 };
}
const palette=()=>[...drawn];

/* ═════════════════════════════════════════════════════════════════════════════
   5b · DECODE — every hue on the ring states its field, in place (P14)

   The operator's ask: "should make the colored bits explainable". A legend page is not
   decoding — it drifts from the surface and it is not where the colour is. So the key is
   raised OVER the ring it explains: the field dims but stays drawn (quiet law), and each row
   names the hue, the field it carries, and when it appears. Rows are built from `drawn`, the
   set the renderer actually painted this frame, so the key cannot describe a colour that is
   not there, nor omit one that is.
   ═════════════════════════════════════════════════════════════════════════════ */
let decodeOpen=false,suppressClick=false,holdTimer=0;
function decodeRows(){return Core.decode([...drawn])}
function fillDecode(){
 const list=el('decodeList');if(!list)return [];
 const rows=decodeRows();list.textContent='';
 for(const row of rows){
  const line=document.createElement('span');line.className='row';
  const sw=document.createElement('i');sw.style.background=row.hex;
  const label=document.createElement('span');
  const name=document.createElement('em');name.textContent=row.field||row.key;
  const when=document.createElement('u');when.textContent=row.when?' · '+row.when:'';
  label.appendChild(name);label.appendChild(when);line.appendChild(sw);line.appendChild(label);
  list.appendChild(line);
 }
 return rows;
}
function showDecode(){
 if(decodeOpen)return;
 const rows=fillDecode();
 decodeOpen=true;el('decode').hidden=false;el('stage').classList.add('dim');
 announce('Colour key, '+rows.length+' hues. '+rows.map(r=>(r.field||r.key)+' '+r.hex).join('. ')+'.');
}
function hideDecode(){
 if(!decodeOpen)return;
 decodeOpen=false;el('decode').hidden=true;el('stage').classList.remove('dim');
}
const decodeState=()=>({open:decodeOpen,rows:decodeRows().map(r=>({key:r.key,hex:r.hex,field:r.field,when:r.when}))});

/* ═════════════════════════════════════════════════════════════════════════════
   6 · READER ACTIONS (reader.js, unchanged where it matters)
   ═════════════════════════════════════════════════════════════════════════════ */
function paint(s=raw&&snap()){
 if(painting)return;
 painting=true;
 try{
  if(raw&&s){
   if(!gate&&!(run&&run.over))liveProgress=clamp(s.source_progress,0,1);
   if(run&&!run.over&&plan)run.wordsRead=Math.min(plan.words,Math.round(liveProgress*plan.words));
   if(openIfDue())s=snap()||s;
   if(!gate&&run&&!run.over&&s&&!s.playing&&s.index>=s.count-1&&liveProgress>0.5){endRun('complete');s=snap()||s}
  }
  const node=(raw&&s)?FieldAperture.jsonNodeAt(nodes,s.char_index):null;
  el('label').textContent=(node&&node.path)||label||'PIN / LOCAL';
  frame(s);
  if(raw&&s)persist(s);
 }finally{painting=false}
}
function pause(){ap.stop()}
function step(n){if(!raw)return;pause();const s=snap();ap.setPos(Math.max(0,Math.min(s.count-1,s.index+n)))}
function toggle(){
 if(!raw){el('drawer').hidden=false;return}
 if(gate)return;
 if(run&&!run.over){if(snap().playing)ap.stop();else resume();frame(snap());return}
 startRun();
}
function err(e){el('error').textContent=String((e&&e.message)||e);el('drawer').hidden=false}
function adjust(n){
 if(run&&!run.over)return;                       // a run owns the pace; the score is the run's
 wpm=Math.min(6000,Math.max(60,Math.round(n/10)*10));
 try{localStorage.setItem('pin.wpm',wpm)}catch(_){}
 ap.setWpm(wpm);paint();
}
async function load(text,name,options={},request=++epoch){
 const input=String(text);if(!input.trim())throw Error('Empty source');if(new TextEncoder().encode(input).length>2000000)throw Error('Source exceeds 2 MB');
 let map=[];try{map=FieldAperture.jsonSpans(input)}catch(e){if(/\.json$/i.test(name))throw Error('Invalid or unsupported JSON: '+e.message)}
 const {hashText}=await import('/lib/id.js'),hash=await hashText(input);if(request!==epoch)return;
 if(options.hash&&options.hash!==hash)throw Error('Source identity mismatch');
 pause();loading=true;
 raw=input;label=name||'PASTE';nodes=map;sourceHash=hash;sourceAddress=safe(options.sourceAddress||'');returnAddress=safe(options.returnAddress||'');
 trailKey=FieldSourceTrail.sourceKey({address:sourceAddress,id:hash});
 const last=FieldSourceTrail.read(trailKey).last,focus=options.focus||last;
 const char=focus?.char_index??focus?.charIndex??0;
 if(options.focus?.wpm!=null)wpm=options.focus.wpm;
 wpm=Math.min(6000,Math.max(60,Number(wpm)||260));
 resetRun();
 ap.load(raw,{label,format:'TXT',scale:'WORD',charIndex:char,wpm});loading=false;
 // Source bytes remain session-only. Explicit incoming focus is consumed once;
 // reload resumes the shared trail rather than replaying an old handoff cursor.
 try{sessionStorage.setItem('rsvp.handoff.v1',JSON.stringify({raw,label,hash:sourceHash,sourceAddress,returnAddress}));history.replaceState(null,'','?handoff=1')}catch(_){}
 el('drawer').hidden=true;el('error').textContent='';paint();
}
async function fetchPath(value){
 const u=new URL(value,location.href);if(u.origin!==location.origin||!/\.(json|txt|md|markdown|csv|log|ya?ml)$/i.test(u.pathname))throw Error('Use a same-origin text/JSON path');
 const request=++epoch,r=await fetch(u.pathname+u.search,{cache:'no-store'});if(request!==epoch)return;if(!r.ok)throw Error('HTTP '+r.status);
 const text=await r.text();if(request!==epoch)return;await load(text,u.pathname.split('/').pop(),{sourceAddress:u.pathname+u.search},request);el('path').value=u.pathname;
}

/* ═════════════════════════════════════════════════════════════════════════════
   7 · WIRING
   ═════════════════════════════════════════════════════════════════════════════ */
function sectorFromEvent(e){
 const svg=document.querySelector('.orbit');
 if(!svg||!svg.getScreenCTM||!svg.createSVGPoint)return -1;
 const m=svg.getScreenCTM();if(!m)return -1;
 const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;
 const q=p.matrixTransform(m.inverse());
 const dx=q.x-60,dy=q.y-60,r=Math.hypot(dx,dy);
 if(r<R0-1.5||r>R1+1.5)return -1;
 const k=geo.hit(q.x,q.y,60,60,R0,R1,3);
 return Number.isInteger(k)?((k-gateRot())%3+3)%3:-1;
}
ap.addEventListener('aperture-focus',e=>paint(raw?e.detail:null));
el('stage').onclick=e=>{
 if(suppressClick){suppressClick=false;return}
 if(gate){const k=sectorFromEvent(e);if(k>=0)answer(k);return}
 toggle();
};
/* Hold to decode (P14): the key is the ring's own vocabulary, raised over the ring.
   The hold never reaches the tap path — a revealed key must not also toggle playback. */
el('stage').addEventListener('pointerdown',e=>{
 if(gate)return;
 clearTimeout(holdTimer);
 holdTimer=setTimeout(()=>{suppressClick=true;showDecode()},520);
});
const endHold=()=>{clearTimeout(holdTimer);if(decodeOpen)hideDecode()};
el('stage').addEventListener('pointerup',endHold);
el('stage').addEventListener('pointercancel',endHold);
el('stage').addEventListener('pointerleave',endHold);
el('play').onclick=toggle;
el('prev').onclick=()=>step(-1);
el('next').onclick=()=>step(1);
el('show').onclick=()=>{pause();renderLedger();el('drawer').hidden=false};
el('close').onclick=()=>{el('drawer').hidden=true;paint()};
el('rate').oninput=e=>adjust(Number(e.target.value));
el('file').onchange=async e=>{const request=++epoch;try{const f=e.target.files?.[0];if(!f)return;if(f.size>2000000)throw Error('File exceeds 2 MB');await load(await f.text(),f.name,{},request)}catch(x){if(request===epoch)err(x)}};
el('read').onclick=()=>load(el('paste').value,'PASTE').catch(err);
el('sample').onclick=()=>load(JSON.stringify({reader:'PIN',purpose:'Read real JSON on a watch.',sequence:['pause','return','resume'],tempo:{wpm:260,source:'local'}},null,2),'demo.json').catch(err);
el('open').onclick=()=>fetchPath(el('path').value).catch(err);
el('meter').onclick=e=>{if(!raw)return;pause();const r=e.currentTarget.getBoundingClientRect();ap.seekFraction((e.clientX-r.left)/r.width)};
el('stage').addEventListener('wheel',e=>{e.preventDefault();if(gate)return;if(snap()?.playing)adjust(wpm+(e.deltaY<0?20:-20));else step(e.deltaY>0?1:-1)},{passive:false});
el('readfield').onclick=e=>{
 if(!raw)return;e.preventDefault();pause();
 const parent=returnAddress?new URL(returnAddress,location.origin):null;
 const back=parent?.pathname==='/docs/'?safe(parent.searchParams.get('return')||'/'):returnAddress||'/';
 try{
  sessionStorage.setItem('readfield.handoff.v1',JSON.stringify({source:raw,label,focus:snap(),sourceIdentity:{id:sourceHash,hash:sourceHash,address:sourceAddress,format:'AUTO'},from:'/rsvp/',returnAddress:back}));
  location.href='/docs/?handoff=1';
 }catch(x){err(Error('READFIELD handoff unavailable: '+x.message))}
};
el('interphase').onclick=function toWalk(e){if(!raw)return;e.preventDefault();pause();try{sessionStorage.setItem('rsvp.handoff.v1',JSON.stringify({raw,label,hash:sourceHash,sourceAddress,returnAddress,focus:snap()}));location.href='/interphase/?handoff=1'}catch(x){err(Error('WALK handoff unavailable: '+x.message))}};
window.addEventListener('keydown',e=>{
 const t=e.target,typing=t?.closest?.('input,textarea,select,a,[contenteditable]');
 if(!el('drawer').hidden||typing||e.altKey||e.ctrlKey||e.metaKey)return;
 if(gate&&(e.key==='1'||e.key==='2'||e.key==='3')){e.preventDefault();answer(Number(e.key)-1);return}
 if(gate&&(e.code==='Space'||e.code==='ArrowLeft'||e.code==='ArrowRight'||e.code==='ArrowUp'||e.code==='ArrowDown')){e.preventDefault();return}
 if(e.key==='d'||e.key==='D'){e.preventDefault();decodeOpen?hideDecode():showDecode();return}
 if(e.key==='Escape'&&decodeOpen){e.preventDefault();hideDecode();return}
 if(t?.closest?.('button'))return;   // a focused button already handles Space/arrow activation
 if(e.code==='Space'){e.preventDefault();toggle()}
 else if(e.code==='ArrowLeft'){e.preventDefault();step(-1)}
 else if(e.code==='ArrowRight'){e.preventDefault();step(1)}
 else if(e.code==='ArrowUp')adjust(wpm+20);
 else if(e.code==='ArrowDown')adjust(wpm-20);
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});
window.addEventListener('pagehide',()=>persist());

/* ═════════════════════════════════════════════════════════════════════════════
   8 · TEST API — thin wrappers over the same state and the same evaluation
       function the clock calls. No second path, no hidden answer index.
   ═════════════════════════════════════════════════════════════════════════════ */
window.RingApp={
 state,
 start:startRun,
 stop:()=>endRun('stopped'),
 forceProgress,
 answer,
 palette,
 decode:decodeState,
 showDecode,
 hideDecode
};

renderLedger();
paint();
const q=new URLSearchParams(location.search);
if(q.has('src'))fetchPath(q.get('src')).catch(err);
else if(q.has('handoff')){try{const x=JSON.parse(sessionStorage.getItem('rsvp.handoff.v1')||'null');if(x&&typeof x.raw==='string')load(x.raw,x.label,x).catch(err);else el('drawer').hidden=false}catch(e){err(e)}}
else el('drawer').hidden=false;
})();
