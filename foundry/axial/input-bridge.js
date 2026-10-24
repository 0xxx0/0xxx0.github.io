/* AXIAL / bound relative control. Native ring indices, support, history and RETURN stay in index.html. */
(()=>{'use strict';
const core=window.AxialFocusAPI?.input,host=window.AxialFocusAPI;
if(!core||!host)return;
const style=document.createElement('style');style.textContent=`
.axInput{display:flex;flex-wrap:wrap;gap:7px;align-items:center;border:1px solid #38474d;background:#0b1114;padding:8px 10px;margin:8px 0 10px}
.axInput label{display:grid;gap:4px;font:8px ui-monospace,monospace;letter-spacing:.1em;color:#97a7ae;min-width:136px}
.axInput select{min-height:43px;padding:8px;background:#080b0d;border:1px solid #46545a;color:#f0f2ee;border-radius:0;font:700 11px ui-monospace,monospace;max-width:180px}
.axDrive{display:flex;gap:5px;align-items:center}.axDrive button{width:44px;height:49px;font-size:21px;color:#f0f2ee;background:#0b1114;border:1px solid #46565d}
.axDrive #axKnob{width:70px;height:70px;position:relative;display:grid;place-items:center;border:2px solid #69b7e6;border-radius:50%;background:radial-gradient(circle,#182934,#080b0d);font:800 10px ui-monospace,monospace;touch-action:none;user-select:none;cursor:grab}
.axDrive #axKnob:before{content:"";position:absolute;top:5px;left:calc(50% - 1.5px);width:3px;height:13px;background:#ef7043;transform-origin:1.5px 29px;transform:rotate(var(--ax-angle,0deg))}
.axRead{flex:1;min-width:160px;display:grid;gap:3px}.axRead strong{font-size:13px;overflow-wrap:anywhere}.axRead small{font-size:9px;color:#818d92}.axRead[data-dead="true"] strong{color:#ef7043}
#axRecall{min-height:43px;border:1px solid #786647;background:#0b1114;color:#d9b36c;white-space:nowrap}
.axInput :focus-visible{outline:2px solid #69b7e6;outline-offset:3px}.axInput :disabled{opacity:.4}
@media(max-width:650px){.axInput label{flex:1;min-width:115px}.axInput select{max-width:100%}.axDrive #axKnob{width:62px;height:62px}.axRead{order:3;flex-basis:100%}#axRecall{order:2;margin-left:auto}}
`;document.head.append(style);
const dock=document.createElement('section');dock.className='axInput';dock.setAttribute('aria-label','Bound relative AXIAL control');
dock.innerHTML='<label for="axBind">BIND / AXIS<select id="axBind" aria-label="Select parameter controlled by dial"></select></label><div class="axDrive"><button id="axMinus" type="button" aria-label="Previous position">−</button><button id="axKnob" type="button" role="slider" tabindex="0" aria-label="Turn bound axis" aria-valuemin="0" aria-valuemax="0" aria-valuenow="0">TURN</button><button id="axPlus" type="button" aria-label="Next position">+</button></div><div class="axRead" id="axRead" role="status" aria-live="polite"><strong>LOADING</strong></div><button id="axRecall" type="button" aria-label="Recall most recent native AXIAL return">↶ RECALL</button>';
document.querySelector('.grid').before(dock);
const $=id=>dock.querySelector('#'+id);
function redraw(){
 const st=core.state(),bind=$('axBind'),keys=st.rings.map(r=>r.key).join('|');
 if(bind.dataset.keys!==keys){bind.replaceChildren();for(const r of st.rings){const o=document.createElement('option');o.value=r.key;o.textContent=r.label;bind.append(o)}bind.dataset.keys=keys}
 const r=st.rings.find(r=>r.key===st.bound_ring);
 bind.disabled=!st.loaded;bind.value=st.loaded?st.bound_ring:'';
 for(const id of ['axMinus','axKnob','axPlus'])$(id).disabled=!st.loaded;
 $('axRecall').disabled=!host.returns().length;
 const read=$('axRead');read.replaceChildren();
 if(!st.loaded||!r){read.textContent='LOADING SOURCE';return}
 const a=document.createElement('strong');a.textContent=r.value;
 const b=document.createElement('small');b.textContent=r.label+' · '+(r.index+1)+'/'+r.count+' · '+r.support+' supported'+(r.support?'':' / DEAD');
 read.append(a,b);read.dataset.dead=String(!r.support);
 const k=$('axKnob');k.style.setProperty('--ax-angle',360*r.index/Math.max(1,r.count)+'deg');
 k.setAttribute('aria-label',r.label+' '+r.value+' position '+(r.index+1)+' of '+r.count+'. Drag or arrow keys to adjust.');
 k.setAttribute('aria-valuemax',r.count-1);k.setAttribute('aria-valuenow',r.index);k.setAttribute('aria-valuetext',r.value)
}
$('axBind').onchange=e=>core.bind(e.target.value);
$('axMinus').onclick=()=>core.turn(-1);$('axPlus').onclick=()=>core.turn(1);
$('axRecall').onclick=()=>{const r=host.returns()[0];if(r)host.restoreReturn(r)};
const k=$('axKnob');let drag=null;
k.addEventListener('pointerdown',e=>{if(!core.state().loaded||e.button!==0)return;const x=k.getBoundingClientRect(),cx=x.left+x.width/2,cy=x.top+x.height/2;drag={cx,cy,last:Math.atan2(e.clientY-cy,e.clientX-cx),residue:0};k.setPointerCapture(e.pointerId)});
k.addEventListener('pointermove',e=>{if(!drag)return;const a=Math.atan2(e.clientY-drag.cy,e.clientX-drag.cx),d=Math.atan2(Math.sin(a-drag.last),Math.cos(a-drag.last));drag.last=a;drag.residue+=d;let count=0;while(Math.abs(drag.residue)>=.38&&count++<8){const sign=Math.sign(drag.residue);core.turn(sign);drag.residue-=sign*.38}});
for(const ev of ['pointerup','pointercancel','lostpointercapture'])k.addEventListener(ev,()=>drag=null);
k.addEventListener('wheel',e=>{if(!core.state().loaded)return;e.preventDefault();if(e.deltaY)core.turn(e.deltaY>0?1:-1)},{passive:false});
k.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){e.stopPropagation();e.preventDefault();core.turn(['ArrowDown','ArrowLeft'].includes(e.key)?-1:1)}});
window.addEventListener('axial:render',redraw);redraw();
async function proof(){
 const was=host.snapshot(),historyDepth=was.rings.length;const results=[];const check=(name,pass)=>{if(!pass)throw Error(name);results.push(name)};
 try{
  let st=core.state();check('native FIELD/HOUSE source',st.loaded&&st.rings.length>=4);
  const ring=st.rings[1],start=ring.index;
  check('explicit binding',core.bind(ring.key)&&core.state().bound_ring===ring.key);
  check('relative + notch',core.turn(1)&&core.state().rings[1].index===(start+1)%ring.count);
  check('relative - notch',core.turn(-1)&&core.state().rings[1].index===start);
  const after=host.snapshot();document.querySelector('#viewStrip').click();check('strip preserves binding',host.snapshot().bound_ring===ring.key&&core.state().rings[1].index===start);
  document.querySelector('#viewRing').click();check('ring preserves binding',host.snapshot().bound_ring===ring.key&&core.state().rings[1].index===start);
  const packet={source:after.source,projection:'STRIP',rings:after.rings,focus:after.focus,search:after.search,bound_ring:after.bound_ring};
  core.bind(st.rings[0].key);core.turn(1);await host.restore(packet);
  check('re-entry restores bound axis and value',host.snapshot().bound_ring===ring.key&&core.state().rings[1].index===start);
  check('source identity unchanged',host.snapshot().source===was.source);
  check('no phantom hardware value',!('dial_value' in host.snapshot()));
  return{pass:true,checks:results}
 }finally{await host.restore(was)}
}
if(new URLSearchParams(location.search).get('inputtest')==='1'){
 const p=document.createElement('pre');p.id='axialInputProof';p.style.cssText='white-space:pre-wrap;padding:9px;border:1px solid #38474d;color:#9bd78c';dock.after(p);
 const run=()=>core.state().loaded?proof().then(r=>p.textContent='PASS · '+JSON.stringify(r)).catch(e=>p.textContent='FAIL · '+e.message):null;
 if(!run()){let count=0;const listener=()=>{if(core.state().loaded){window.removeEventListener('axial:render',listener);run()}else if(++count>30)window.removeEventListener('axial:render',listener)};window.addEventListener('axial:render',listener)}
}
})();
