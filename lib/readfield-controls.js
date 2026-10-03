(()=>{'use strict';
const ap=document.getElementById('docAperture');if(!ap||document.querySelector('[data-readfield-controls]'))return;

const VERSION='readfield-controls/v0.9.1';
const STORE='readfield.controls.v09';
const MODES=['READ','SPEED','LISTEN','MARK'];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let state={mode:'READ',more:false,snap:null,error:''};
try{const x=JSON.parse(localStorage.getItem(STORE)||'null');if(x&&MODES.includes(x.mode))state.mode=x.mode}catch(_){}

function save(){try{localStorage.setItem(STORE,JSON.stringify({mode:state.mode}))}catch(_){}}
function snap(){return ap.snapshot?.()||state.snap||{}}
function scaleIndex(id){const i=ap.scaleIndex?.(id);return Number.isFinite(i)?i:null}
function setScale(id){const i=scaleIndex(id);if(i!=null)ap.setScale?.(i)}
function stop(){ap.stop?.()}
function speedStep(dir){const w=Number(snap().wpm)||300,step=w<300?20:w<900?50:w<2000?100:w<4000?250:500;ap.setWpm?.(clamp(Math.round((w+dir*step)/10)*10,60,6000))}
function setMode(mode){
  if(!MODES.includes(mode))return;state.mode=mode;state.more=false;save();
  if(mode==='READ'){stop();ap.removeAttribute('focusfield');ap.removeAttribute('minimal');setScale('SENT')}
  if(mode==='SPEED'){if(snap().speaking)stop();ap.setAttribute('focusfield','');ap.removeAttribute('minimal');setScale('WORD')}
  if(mode==='LISTEN'){if(snap().playing)stop();ap.setAttribute('focusfield','');ap.removeAttribute('minimal')}
  if(mode==='MARK'){stop();ap.setAttribute('focusfield','');ap.removeAttribute('minimal')}
  render()
}
function transport(){
  const s=snap();
  if(s.speaking||s.playing){stop();return}
  if(state.mode==='LISTEN'){ap.speak?.();return}
  if(state.mode==='MARK'){document.getElementById('markHere')?.click();return}
  if(state.mode==='READ'){state.mode='SPEED';save();ap.setAttribute('focusfield','');setScale('WORD')}
  ap.toggleRSVP?.()
}
function seek(frac){stop();ap.seekFraction?.(clamp(Number(frac)||0,0,1))}
function step(delta){stop();ap.step?.(delta)}
function click(id){document.getElementById(id)?.click()}
function pulse(){document.getElementById('pulseSync')?.click()}
function source(){const el=document.querySelector('.sourcebar');el?.scrollIntoView?.({behavior:'smooth',block:'center'});document.getElementById('sourcePath')?.focus()}
function ride(){document.getElementById('rideLive')?.click()}
function action(name){
  try{
    if(name==='play')transport();
    else if(name==='stop')stop();
    else if(name==='prev')step(-1);
    else if(name==='next')step(1);
    else if(name==='slower')speedStep(-1);
    else if(name==='faster')speedStep(1);
    else if(name==='voice'){state.mode='LISTEN';save();if(snap().speaking)stop();else{if(snap().playing)stop();ap.speak?.()}}
    else if(name==='mark')click('markHere');
    else if(name==='next-mark')click('nextMark');
    else if(name==='copy')click('copyView');
    else if(name==='source')source();
    else if(name==='ride')ride();
    else if(name==='pulse')pulse();
    else if(name==='return')click('returnLink');
    else if(name==='echo')click('echoBackLink');
    else if(name==='more')state.more=!state.more;
  }catch(e){state.error=String(e?.message||e)}
  render()
}
function transportLabel(s){if(s.speaking)return'Ⅱ LISTEN';if(s.playing)return'Ⅱ SPEED';if(state.mode==='LISTEN')return'▶ LISTEN';if(state.mode==='MARK')return'● MARK';return'▶ SPEED'}
function status(s){if(state.error)return'ERROR · '+state.error;if(!s?.label)return'OPEN A SOURCE';const p=Math.round((Number(s.source_progress)||0)*100),motion=s.speaking?'LISTEN':s.playing?'SPEED':'READY';return `${motion} · ${s.scale_label||s.scale||'—'} · ${p}% · ${Math.round(Number(s.wpm)||300)} WPM`}
function scales(s){return (ap.A?.scales||[]).map(x=>`<option value="${esc(x.id)}"${String(x.id)===String(s.scale)?' selected':''}>${esc(x.label||x.id)}</option>`).join('')}
function modeButton(m,label=m){return `<button type="button" class="rf-mode${state.mode===m?' on':''}" data-mode="${m}" aria-pressed="${state.mode===m?'true':'false'}">${esc(label)}</button>`}

const style=document.createElement('style');style.textContent=`
.workDeck,#focusView,#pulseSync,#pulseState{display:none!important}
.viewerHead #copyView,.viewerHead #markHere,.viewerHead #nextMark,.viewerHead #rideLive{display:none!important}
body{padding-bottom:182px}.rf-plane{position:fixed;z-index:2147481000;left:50%;bottom:max(8px,env(safe-area-inset-bottom));transform:translateX(-50%);width:min(780px,calc(100vw - 16px));background:#070a0cee;border:1px solid #344047;box-shadow:0 14px 42px #000b;backdrop-filter:blur(14px);color:#edf0ed;font:10px/1.25 ui-monospace,SFMono-Regular,Menlo,monospace}.rf-plane *{box-sizing:border-box}.rf-row{display:flex;align-items:center;gap:4px;padding:5px}.rf-row+.rf-row{border-top:1px solid #273136}.rf-plane button,.rf-plane select{min-height:40px;min-width:40px;border:1px solid #354046;background:#0a0e10;color:#e3e8e6;padding:7px 9px;font:inherit}.rf-plane button:focus-visible,.rf-plane select:focus-visible,.rf-plane input:focus-visible{outline:2px solid #8dd5ff;outline-offset:1px}.rf-plane button:active{transform:translateY(1px)}.rf-mode{flex:1;color:#849197!important}.rf-mode.on{background:#edf0ed!important;color:#090b0c!important;border-color:#edf0ed!important}.rf-status{min-width:0;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#89969b;padding:0 4px}.rf-transport{display:grid;grid-template-columns:44px minmax(100px,1fr) 44px;gap:4px;flex:1}.rf-play{border-color:#e87548!important;color:#ffd0bd!important;font-weight:800!important}.rf-speed{display:grid;grid-template-columns:42px 78px 42px;gap:4px}.rf-speed output{display:grid;place-items:center;border:1px solid #354046;color:#8dd5ff;min-height:40px}.rf-scale{min-width:122px;max-width:170px}.rf-progress{width:100%;height:30px;accent-color:#e87548}.rf-more{margin-left:auto}.rf-drawer{display:none;gap:4px;flex-wrap:wrap;padding:5px;border-top:1px solid #283136;max-height:42vh;overflow:auto}.rf-plane.open .rf-drawer{display:flex}.rf-drawer button{flex:1 1 90px}.rf-help{flex:1 1 100%;color:#718086;padding:4px 2px;line-height:1.45}.rf-kbd{color:#a8b6bb}
@media(max-width:760px){body{padding-bottom:224px}.readerUses{display:none!important}.viewer{overflow:visible;min-height:auto}.reading{max-height:none!important;overflow:visible!important;min-height:36vh;font-size:16px!important;line-height:1.72!important;padding:16px!important}.viewerHead{position:static}.sourceShelf{margin-bottom:5px}.apStage{padding:4px}.rf-plane{bottom:max(4px,env(safe-area-inset-bottom));width:calc(100vw - 8px)}.rf-row{padding:4px}.rf-plane button,.rf-plane select{min-height:44px}.rf-scale{min-width:104px;max-width:118px}.rf-status{font-size:8px}.rf-drawer button{min-height:44px}.rf-progress{height:34px}}
`;
document.head.appendChild(style);

const plane=document.createElement('section');plane.className='rf-plane';plane.dataset.readfieldControls=VERSION;plane.setAttribute('aria-label','READFIELD controls');document.body.appendChild(plane);

function bind(){
  plane.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
  plane.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>action(b.dataset.action));
  const progress=plane.querySelector('[data-progress]');if(progress)progress.oninput=e=>seek(e.target.value);
  const scale=plane.querySelector('[data-scale]');if(scale)scale.onchange=e=>{stop();setScale(e.target.value)};
}
function publish(s){
  document.documentElement.dataset.readfieldMode=state.mode.toLowerCase();
  document.documentElement.dataset.readfieldMotion=s.speaking?'listen':s.playing?'speed':'ready';
  document.documentElement.dataset.readfieldControlsOpen=state.more?'1':'0';
  const detail={schema:VERSION,mode:state.mode,drawer:state.more,source:s.label||null,address:s.address||null,scale:s.scale||null,index:Number.isFinite(Number(s.index))?Number(s.index):null,char_index:Number.isFinite(Number(s.char_index))?Number(s.char_index):null,progress:Number(s.source_progress)||0,wpm:Number(s.wpm)||300,playing:!!s.playing,speaking:!!s.speaking};
  window.dispatchEvent(new CustomEvent('readfield-control-state',{detail}));
}
function render(){
  const s=snap();
  plane.classList.toggle('open',state.more);
  plane.innerHTML=`<div class="rf-row" role="toolbar" aria-label="Reading mode">${modeButton('READ')}${modeButton('SPEED','SPEED')}${modeButton('LISTEN')}${modeButton('MARK')}</div>
  <div class="rf-row"><div class="rf-transport"><button data-action="prev" aria-label="Previous unit">←</button><button class="rf-play" data-action="play">${esc(transportLabel(s))}</button><button data-action="next" aria-label="Next unit">→</button></div><div class="rf-speed"><button data-action="slower" aria-label="Slower">−</button><output aria-label="Words per minute">${Math.round(Number(s.wpm)||300)}</output><button data-action="faster" aria-label="Faster">+</button></div><select class="rf-scale" data-scale aria-label="Reading scale">${scales(s)}</select><button class="rf-more" data-action="more" aria-label="More reading actions" aria-expanded="${state.more}">•••</button></div>
  <div class="rf-row"><input class="rf-progress" data-progress type="range" min="0" max="1" step="0.001" value="${clamp(Number(s.source_progress)||0,0,1)}" aria-label="Source position"><span class="rf-status" aria-live="polite">${esc(status(s))}</span></div>
  <div class="rf-drawer"><button data-action="source">SOURCE</button><button data-action="voice">VOICE</button><button data-action="mark">MARK</button><button data-action="next-mark">NEXT MARK</button><button data-action="pulse">TEMPO</button><button data-action="copy">COPY</button><button data-action="ride">RIDE ↗</button>${document.getElementById('returnLink')?.hidden?'':'<button data-action="return">↩ RETURN</button>'}${document.getElementById('echoBackLink')?.hidden?'':'<button data-action="echo">↩ ECHO</button>'}<div class="rf-help"><span class="rf-kbd">P</span> play/pause · <span class="rf-kbd">Shift+P</span> stop · <span class="rf-kbd">←/→</span> step · <span class="rf-kbd">,/.</span> speed · modes preserve one source + cursor.</div></div>`;
  bind();publish(s);
}

function suppressLegacy(){
  try{const controls=ap.shadowRoot?.querySelector('.controls');if(controls)controls.style.display='none'}catch(_){}
  document.documentElement.dataset.readfieldControls='v091';
}
function editableTarget(t){return !!t?.closest?.('input,textarea,select,[contenteditable="true"]')}
window.addEventListener('keydown',e=>{
  if(e.defaultPrevented||editableTarget(e.target)||e.altKey||e.metaKey||e.ctrlKey)return;
  if(e.key==='p'||e.key==='P'){e.preventDefault();if(e.shiftKey)action('stop');else action('play');return}
  if(e.key==='ArrowLeft'){e.preventDefault();action('prev');return}
  if(e.key==='ArrowRight'){e.preventDefault();action('next');return}
  if(e.key===','){e.preventDefault();action('slower');return}
  if(e.key==='.'){e.preventDefault();action('faster');return}
  if(e.key==='Escape'){action('stop');state.more=false;render()}
});
ap.addEventListener('aperture-focus',e=>{state.snap=e.detail||ap.snapshot?.()||null;render()});
new MutationObserver(()=>render()).observe(document.querySelector('.viewerHead')||document.body,{subtree:true,attributes:true,attributeFilter:['hidden']});

suppressLegacy();setMode(state.mode);state.snap=ap.snapshot?.()||null;render();
window.ReadfieldControls=Object.freeze({VERSION,getState:()=>({...state,snap:snap()}),setMode,action,render});
})();