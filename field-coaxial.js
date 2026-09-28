(()=>{'use strict';
const GATE=-Math.PI/2, TAU=Math.PI*2;
const R=()=>window.InterphaseRing;
const H=()=>window.FieldLensHost;
const A=()=>window.__fieldAct;
const M=()=>window.__fieldRouteMap;
let root=null,state=null,drag=null,focusRef=null;

function labelOf(x,fallback='—'){return String(x==null?fallback:x).replace(/\s+/g,' ').trim()||fallback}
function item(id,label,meta=''){return Object.freeze({id:String(id),label:labelOf(label),meta:labelOf(meta,'')})}

function gather(){
  const ring=R(),host=H(),act=A(),map=M(),focus=host?.focus?.();
  if(!ring?.coaxialModel||!focus)return null;
  focusRef=focus;

  let hrefs=act?.siblings?.()||[];
  if(!hrefs.includes(focus.href))hrefs=[focus.href,...hrefs];
  if(!hrefs.length)hrefs=[focus.href];
  const peers=hrefs.map(h=>map?.get?.(h)||{href:h,title:h});
  const peerIndex=Math.max(0,peers.findIndex(x=>x.href===focus.href));
  const depthItems=peers.map(x=>item('route:'+x.href,x.title||x.href,x.href));

  let moveItems=[...document.querySelectorAll('#capMoves .capMove')].map((el,i)=>item('move:'+i,el.textContent||('MOVE '+(i+1))));
  if(!moveItems.length)moveItems=[item('move:open','OPEN')];

  const witness=labelOf(document.getElementById('capWitness')?.textContent,'WITNESS');
  const ret=labelOf(document.getElementById('capReturn')?.textContent,'RETURN → FIELD');
  const witnessItems=[item('witness:0',witness),item('return:0',ret)];

  return ring.coaxialModel({
    active:'MOVE',
    coupled:false,
    layers:[
      {id:'DEPTH',label:'ROUTE / DEPTH',items:depthItems,index:peerIndex,radius:54},
      {id:'MOVE',label:'NEXT / MOVE',items:moveItems,index:0,radius:82},
      {id:'WITNESS',label:'WITNESS / RETURN',items:witnessItems,index:0,radius:110}
    ]
  });
}

function ensure(){
  if(root)return root;
  root=document.createElement('div');
  root.id='fieldCoaxial';
  root.innerHTML=
    '<style>'+
    '#fieldCoaxial{position:fixed;inset:0;z-index:2147483000;pointer-events:none;display:none;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#e9efef}'+
    '#fieldCoaxial.on{display:block}#fieldCoaxial *{box-sizing:border-box}'+
    '#fieldCoaxial .fcPanel{pointer-events:auto;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(390px,calc(100vw - 18px));background:#070a0c;border:1px solid #354249;box-shadow:0 20px 70px #000c}'+
    '#fieldCoaxial .fcHead{display:flex;align-items:center;gap:8px;padding:7px 8px;border-bottom:1px solid #273238;font-size:7px;letter-spacing:.12em}'+
    '#fieldCoaxial .fcHead b{color:#d5ad68}#fieldCoaxial .fcHead span{color:#718087;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}'+
    '#fieldCoaxial button{border-radius:0;border:1px solid #354249;background:#0b1012;color:#c9d2d5;padding:5px 7px;font:700 7px/1 ui-monospace,monospace;letter-spacing:.07em}'+
    '#fieldCoaxial .fcStage{position:relative;width:300px;height:300px;margin:3px auto}#fieldCoaxial svg{display:block;width:300px;height:300px;touch-action:none}'+
    '#fieldCoaxial .fcLink{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:58px;height:58px;border-radius:50%;padding:0;border-color:#49565c;background:#090d0f}'+
    '#fieldCoaxial .fcLink.on{color:#d5ad68;border-color:#d5ad68}'+
    '#fieldCoaxial .fcRead{border-top:1px solid #273238;padding:6px 8px}#fieldCoaxial .fcRow{display:grid;grid-template-columns:96px minmax(0,1fr);gap:8px;padding:3px 0;border-bottom:1px dotted #1d262a}'+
    '#fieldCoaxial .fcRow:last-child{border-bottom:0}#fieldCoaxial .fcK{color:#718087;font-size:6px;letter-spacing:.1em}#fieldCoaxial .fcV{font-size:7px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'+
    '#fieldCoaxial .fcFoot{display:flex;justify-content:space-between;gap:8px;padding:6px 8px;border-top:1px solid #273238;color:#66747a;font-size:6px;line-height:1.35}'+
    '@media(max-width:520px){#fieldCoaxial .fcPanel{top:48%}#fieldCoaxial .fcV{font-size:9px}#fieldCoaxial .fcK{font-size:8px}#fieldCoaxial button{min-height:38px;font-size:9px}}'+
    '</style>'+
    '<div class="fcPanel" role="dialog" aria-label="Held glyph coaxial projection">'+
      '<div class="fcHead"><b>HELD GLYPH</b><span id="fcFocus">—</span><button id="fcReturn">RETURN ×</button></div>'+
      '<div class="fcStage"><svg id="fcSvg" viewBox="0 0 300 300" aria-label="Coaxial held-object projection"></svg><button class="fcLink" id="fcLink">FREE</button></div>'+
      '<div class="fcRead"><div class="fcRow"><span class="fcK">ROUTE / DEPTH</span><span class="fcV" id="fcDepth">—</span></div><div class="fcRow"><span class="fcK">NEXT / MOVE</span><span class="fcV" id="fcMove">—</span></div><div class="fcRow"><span class="fcK">WITNESS / RETURN</span><span class="fcV" id="fcWitness">—</span></div></div>'+
      '<div class="fcFoot"><span>drag a ring · tap centre = couple/free · arrows step active ring</span><span>projection only · no authority</span></div>'+
    '</div>';
  document.body.appendChild(root);
  root.querySelector('#fcReturn').onclick=close;
  root.querySelector('#fcLink').onclick=toggleCouple;
  const svg=root.querySelector('#fcSvg');
  svg.addEventListener('pointerdown',pointerDown);
  svg.addEventListener('pointermove',pointerMove);
  svg.addEventListener('pointerup',pointerUp);
  svg.addEventListener('pointercancel',pointerCancel);
  window.addEventListener('keydown',onKey,true);
  return root;
}

function polar(r,a){return[150+Math.cos(a)*r,150+Math.sin(a)*r]}
function angleFor(layer,index){
  if(layer.count<=1)return GATE+Number(layer.rotation||0);
  return R().slotAngle(index,layer.count,{rotation:Number(layer.rotation)||0});
}
function draw(){
  if(!state||!root)return;
  let out='<circle cx="150" cy="150" r="25" fill="#090d0f" stroke="#49565c" stroke-width="1"/>'+
          '<path d="M150 18 L150 132" stroke="#ed7447" stroke-width="1.6"/>';
  for(const layer of state.layers){
    const active=layer.id===state.active, sel=state.selection[layer.id]?.index??0, rad=Number(layer.radius)||60;
    out+='<circle cx="150" cy="150" r="'+rad+'" fill="none" stroke="'+(active?'#d5ad68':'#354249')+'" stroke-width="'+(active?'1.8':'1')+'"/>';
    for(let i=0;i<layer.count;i++){
      const a=angleFor(layer,i),p1=polar(rad-7,a),p2=polar(rad+5,a),hot=i===sel;
      out+='<path d="M'+p1[0].toFixed(2)+' '+p1[1].toFixed(2)+' L'+p2[0].toFixed(2)+' '+p2[1].toFixed(2)+'" stroke="'+(hot?'#72bce7':'#657278')+'" stroke-width="'+(hot?'2.4':'1')+'"/>';
    }
  }
  if(state.coupled)out+='<path d="M150 40 L150 125" stroke="#d5ad68" stroke-width="4" stroke-opacity=".24"/>';
  root.querySelector('#fcSvg').innerHTML=out;
  root.querySelector('#fcFocus').textContent=labelOf(focusRef?.title||focusRef?.href);
  const read=(id,el)=>{
    const s=state.selection[id],v=s?.item;
    root.querySelector(el).textContent=v?labelOf(v.label||v.id):'—';
  };
  read('DEPTH','#fcDepth');read('MOVE','#fcMove');read('WITNESS','#fcWitness');
  const link=root.querySelector('#fcLink');link.textContent=state.coupled?'LINKED':'FREE';link.classList.toggle('on',state.coupled);
}

function localPoint(e){
  const b=root.querySelector('#fcSvg').getBoundingClientRect();
  return{x:(e.clientX-b.left)*300/b.width,y:(e.clientY-b.top)*300/b.height};
}
function pickLayer(pt){
  const d=Math.hypot(pt.x-150,pt.y-150);
  let best=null,dist=Infinity;
  for(const layer of state?.layers||[]){
    const x=Math.abs(d-(Number(layer.radius)||0));
    if(x<dist){dist=x;best=layer}
  }
  return dist<=18?best:null;
}
function activate(id){
  if(!state)return;
  state=R().coaxialModel({layers:state.layers,gateAngle:state.gateAngle,coupled:state.coupled,active:id});
  draw();
}
function pointerDown(e){
  if(!state)return;
  const pt=localPoint(e),layer=pickLayer(pt);if(!layer)return;
  e.preventDefault();activate(layer.id);
  drag={id:layer.id,pointerId:e.pointerId,last:Math.atan2(pt.y-150,pt.x-150)};
  e.currentTarget.setPointerCapture?.(e.pointerId);
}
function pointerMove(e){
  if(!drag||e.pointerId!==drag.pointerId||!state)return;
  const pt=localPoint(e),a=Math.atan2(pt.y-150,pt.x-150);
  const delta=Math.atan2(Math.sin(a-drag.last),Math.cos(a-drag.last));drag.last=a;
  state=R().coaxialRotate(state,drag.id,delta,{coupled:state.coupled});draw();
}
function finishDrag(){
  if(!drag||!state)return;
  state=R().coaxialSettle(state,drag.id,{coupled:state.coupled});
  const id=drag.id;drag=null;draw();emit('settle',id);
}
function pointerUp(e){if(drag&&e.pointerId===drag.pointerId){e.preventDefault();finishDrag()}}
function pointerCancel(e){if(drag&&e.pointerId===drag.pointerId){drag=null;draw()}}

function toggleCouple(){
  if(!state)return;
  state=R().coaxialModel({layers:state.layers,gateAngle:state.gateAngle,coupled:!state.coupled,active:state.active});
  draw();emit('couple',state.active);
}
function onKey(e){
  if(!root?.classList.contains('on')||!state)return;
  if(e.key==='Escape'){e.preventDefault();close();return}
  if(e.key==='ArrowUp'||e.key==='ArrowDown'){
    e.preventDefault();const ids=state.layers.map(x=>x.id),i=Math.max(0,ids.indexOf(state.active)),n=(i+(e.key==='ArrowDown'?1:-1)+ids.length)%ids.length;activate(ids[n]);return;
  }
  if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
    e.preventDefault();const layer=state.layers.find(x=>x.id===state.active);if(!layer||layer.count<=1)return;
    const delta=(e.key==='ArrowRight'?1:-1)*TAU/layer.count;
    state=R().coaxialRotate(state,layer.id,delta,{coupled:state.coupled});
    state=R().coaxialSettle(state,layer.id,{coupled:state.coupled});draw();emit('step',layer.id);
  }
}
function publicSelection(){
  const out={};
  for(const [id,s] of Object.entries(state?.selection||{}))out[id]={index:s.index,id:s.item?.id||null,label:s.item?.label||null};
  return out;
}
function emit(kind,layer=null){
  window.dispatchEvent(new CustomEvent('field-coaxial',{detail:{kind,layer,coupled:!!state?.coupled,focus:focusRef?.href||null,selection:publicSelection()}}));
}
function openAt(){
  state=gather();if(!state)return false;ensure();root.classList.add('on');draw();emit('open');return true;
}
function close(){
  if(!root)return;emit('close');root.classList.remove('on');state=null;drag=null;focusRef=null;
}
function claim(){
  const radial=window.FoveaLens?.radial;
  if(!radial?.claim)return false;
  return radial.claim('GLYPH',{label:'GLYPH',note:'held object · coaxial projection · no authority',run:()=>openAt()});
}
function boot(){
  let tries=0;
  const attempt=()=>{if(claim())return;if(++tries<30)setTimeout(attempt,60)};
  attempt();
}
window.FieldCoaxial=Object.freeze({open:openAt,close,state:()=>state,selection:()=>publicSelection()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
