(()=>{'use strict';
const ap=document.getElementById('docAperture');if(!ap||document.querySelector('[data-readfield-controls]'))return;

const VERSION='readfield-controls/v0.9.3';
const STORE='readfield.controls.v09';
const MODES=['READ','SPEED','LISTEN','MARK'];
const SCRIPT_SRC=document.currentScript?.src||'';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let state={mode:'READ',more:false,uses:false,snap:null,error:'',notice:''};
try{const x=JSON.parse(localStorage.getItem(STORE)||'null');if(x&&MODES.includes(x.mode))state.mode=x.mode}catch(_){}

function ensureStyle(){
  if(document.querySelector('link[data-readfield-controls-style]'))return;
  const link=document.createElement('link');link.rel='stylesheet';link.dataset.readfieldControlsStyle=VERSION;
  try{link.href=SCRIPT_SRC?new URL('readfield-controls.css',SCRIPT_SRC).href:'/lib/readfield-controls.css'}catch(_){link.href='/lib/readfield-controls.css'}
  document.head.appendChild(link);
}
ensureStyle();

function save(){try{localStorage.setItem(STORE,JSON.stringify({mode:state.mode}))}catch(_){} }
function snap(){return ap.snapshot?.()||state.snap||{}}
function scaleIndex(id){const i=ap.scaleIndex?.(id);return Number.isFinite(i)?i:null}
function setScale(id){const i=scaleIndex(id);if(i!=null)ap.setScale?.(i)}
function stop(){ap.stop?.()}
function speedStep(dir){const w=Number(snap().wpm)||300,step=w<300?20:w<900?50:w<2000?100:w<4000?250:500;ap.setWpm?.(clamp(Math.round((w+dir*step)/10)*10,60,6000))}
function markCount(){const t=String(document.getElementById('markHere')?.textContent||'');const m=t.match(/(\d+)\s*$/);return m?Number(m[1]):0}
function pulseWitness(){
  const text=String(document.getElementById('pulseState')?.textContent||'').trim();
  const button=document.getElementById('pulseSync');
  const on=!!button?.classList?.contains('pulseOn')&&!/^PULSE\s+OFF$/i.test(String(button?.textContent||''));
  const live=on&&!/NO FIELD PULSE|NO .*CLOCK|OFF|NONE/i.test(text);
  return {text:text||'NO FIELD PULSE CLOCK',on,live};
}
function announce(text,ms=2200){state.notice=String(text||'');render();if(!state.notice)return;const token=state.notice;setTimeout(()=>{if(state.notice===token){state.notice='';render()}},ms)}
function setMode(mode,{preserveScale=false}={}){
  if(!MODES.includes(mode))return;state.mode=mode;state.more=false;save();
  if(mode==='READ'){stop();ap.removeAttribute('focusfield');ap.removeAttribute('minimal');if(!preserveScale)setScale('SENT')}
  if(mode==='SPEED'){if(snap().speaking)stop();ap.setAttribute('focusfield','');ap.removeAttribute('minimal');if(!preserveScale)setScale('WORD')}
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
function pulse(){
  const button=document.getElementById('pulseSync');
  if(!button){announce('TEMPO UNAVAILABLE');return}
  button.click();
  setTimeout(()=>{const p=pulseWitness();announce(p.live?`TEMPO LIVE · ${p.text}`:`TEMPO WAIT · START LISTEN / LAB · ${p.text}`,3000)},0)
}
function source(){const el=document.querySelector('.sourcebar');el?.scrollIntoView?.({behavior:'smooth',block:'center'});document.getElementById('sourcePath')?.focus()}
function ride(){document.getElementById('rideLive')?.click()}
function uses(){
  state.uses=!state.uses;document.body.classList.toggle('rf-uses',state.uses);
  const el=document.getElementById('readerUses');if(el){el.open=state.uses;if(state.uses)setTimeout(()=>el.scrollIntoView?.({behavior:'smooth',block:'start'}),0)}
  render()
}
function existingReaderAction(name){document.querySelector(`[data-reader-action="${name}"]`)?.click()}
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
    else if(name==='loci')existingReaderAction('loci');
    else if(name==='repo')existingReaderAction('current');
    else if(name==='uses')uses();
    else if(name==='return')click('returnLink');
    else if(name==='echo')click('echoBackLink');
    else if(name==='more')state.more=!state.more;
  }catch(e){state.error=String(e?.message||e)}
  render()
}
function modeLabel(m=state.mode){return m==='LISTEN'?'VOICE':m}
function transportLabel(s){if(s.speaking)return'Ⅱ VOICE';if(s.playing)return'Ⅱ SPEED';if(state.mode==='LISTEN')return'▶ VOICE';if(state.mode==='MARK')return'● MARK';return'▶ SPEED'}
function status(s){
  if(state.error)return'ERROR · '+state.error;
  if(state.notice)return state.notice;
  if(!s?.label)return'OPEN A SOURCE';
  const p=Math.round((Number(s.source_progress)||0)*100),motion=s.speaking?'VOICE':s.playing?'SPEED':'READY',marks=markCount(),tempo=pulseWitness();
  const out=[motion,s.scale_label||s.scale||'—',`${p}%`,`${Math.round(Number(s.wpm)||300)} WPM`];
  if(marks)out.push(`${marks} MARK${marks===1?'':'S'}`);
  if(tempo.live)out.push('TEMPO LIVE');
  return out.join(' · ')
}
function scales(s){return (ap.A?.scales||[]).map(x=>`<option value="${esc(x.id)}"${String(x.id)===String(s.scale)?' selected':''}>${esc(x.label||x.id)}</option>`).join('')}
function modeButton(m,label=modeLabel(m)){
  const s=snap(),marks=markCount();let text=label;
  if(m==='SPEED'&&s.playing)text='Ⅱ SPEED';
  if(m==='LISTEN'&&s.speaking)text='Ⅱ VOICE';
  if(m==='MARK'&&marks)text=`MARK · ${marks}`;
  return `<button type="button" class="rf-mode${state.mode===m?' on':''}" data-mode="${m}" aria-pressed="${state.mode===m?'true':'false'}">${esc(text)}</button>`
}
function tempoButton(){const p=pulseWitness();return p.live?'TEMPO · LIVE':p.on?'TEMPO · WAIT':'TEMPO'}

const plane=document.createElement('section');plane.className='rf-plane';plane.dataset.readfieldControls=VERSION;plane.setAttribute('aria-label','READFIELD controls');document.body.appendChild(plane);

let reserveFrame=0;
function syncLayout(){
  cancelAnimationFrame(reserveFrame);
  reserveFrame=requestAnimationFrame(()=>{
    const box=plane.getBoundingClientRect(),density=box.width<=560?'compact':'regular';
    const changed=plane.dataset.density!==density;
    const reserve=Math.max(0,Math.ceil(box.height+(innerHeight-box.bottom)+8));
    document.documentElement.style.setProperty('--rf-reserve',reserve+'px');
    document.documentElement.dataset.readfieldDensity=density;
    plane.dataset.density=density;
    if(changed)publish(snap());
  });
}
const reserveObserver='ResizeObserver'in window?new ResizeObserver(syncLayout):null;
if(reserveObserver)reserveObserver.observe(plane);else window.addEventListener('resize',syncLayout,{passive:true});

function bind(){
  plane.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
  plane.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>action(b.dataset.action));
  const progress=plane.querySelector('[data-progress]');if(progress)progress.oninput=e=>seek(e.target.value);
  const scale=plane.querySelector('[data-scale]');if(scale)scale.onchange=e=>{stop();setScale(e.target.value)};
}
function publish(s){
  const tempo=pulseWitness(),marks=markCount(),job=modeLabel(),density=plane.dataset.density||'regular';
  document.documentElement.dataset.readfieldMode=state.mode.toLowerCase();
  document.documentElement.dataset.readfieldJob=job.toLowerCase();
  document.documentElement.dataset.readfieldMotion=s.speaking?'voice':s.playing?'speed':'ready';
  document.documentElement.dataset.readfieldControlsOpen=state.more?'1':'0';
  document.documentElement.dataset.readfieldTempo=tempo.live?'live':tempo.on?'wait':'off';
  document.documentElement.dataset.readfieldMarks=String(marks);
  const detail={schema:VERSION,mode:state.mode,job,drawer:state.more,density,source:s.label||null,address:s.address||null,scale:s.scale||null,index:Number.isFinite(Number(s.index))?Number(s.index):null,char_index:Number.isFinite(Number(s.char_index))?Number(s.char_index):null,progress:Number(s.source_progress)||0,wpm:Number(s.wpm)||300,playing:!!s.playing,speaking:!!s.speaking,marks,tempo:{state:tempo.live?'LIVE':tempo.on?'WAIT':'OFF',witness:tempo.text}};
  window.dispatchEvent(new CustomEvent('readfield-control-state',{detail}));
}
function render(){
  const s=snap();
  plane.classList.toggle('open',state.more);
  document.body.classList.toggle('rf-uses',state.uses);
  plane.innerHTML=`<div class="rf-row" role="toolbar" aria-label="Reading mode">${modeButton('READ')}${modeButton('SPEED')}${modeButton('LISTEN')}${modeButton('MARK')}</div>
  <div class="rf-row rf-command"><div class="rf-transport"><button data-action="prev" aria-label="Previous unit">←</button><button class="rf-play" data-action="play">${esc(transportLabel(s))}</button><button data-action="next" aria-label="Next unit">→</button></div><div class="rf-tune"><div class="rf-speed"><button data-action="slower" aria-label="Slower">−</button><output aria-label="Words per minute">${Math.round(Number(s.wpm)||300)}</output><button data-action="faster" aria-label="Faster">+</button></div><select class="rf-scale" data-scale aria-label="Reading scale">${scales(s)}</select></div><button class="rf-more" data-action="more" aria-label="More reading actions" aria-expanded="${state.more}">•••</button></div>
  <div class="rf-row"><input class="rf-progress" data-progress type="range" min="0" max="1" step="0.001" value="${clamp(Number(s.source_progress)||0,0,1)}" aria-label="Source position"><span class="rf-status" aria-live="polite">${esc(status(s))}</span></div>
  <div class="rf-drawer"><button data-action="uses">${state.uses?'HIDE USES':'USES'}</button><button data-action="source">SOURCE</button><button data-action="voice">VOICE</button><button data-action="mark">MARK</button><button data-action="next-mark">NEXT MARK</button><button data-action="pulse">${esc(tempoButton())}</button><button data-action="loci">LOCI ↗</button><button data-action="repo">REPO ↗</button><button data-action="copy">COPY</button><button data-action="ride">RIDE ↗</button>${document.getElementById('returnLink')?.hidden?'':'<button data-action="return">↩ RETURN</button>'}${document.getElementById('echoBackLink')?.hidden?'':'<button data-action="echo">↩ ECHO</button>'}<div class="rf-help"><b>READ</b> close / regress · <b>SPEED</b> RSVP throughput · <b>VOICE</b> speech on the same cursor · <b>MARK</b> addressed residue. Friction in SPEED should collapse into READ, then resume without losing position. TEMPO borrows a clock only.</div></div>`;
  bind();syncLayout();publish(s);
}

function suppressLegacy(){
  try{const controls=ap.shadowRoot?.querySelector('.controls');if(controls)controls.style.display='none'}catch(_){}
  document.documentElement.dataset.readfieldControls='v093';
}
function editableTarget(t){return !!t?.closest?.('input,textarea,select,[contenteditable="true"]')}
window.addEventListener('keydown',e=>{
  if(e.defaultPrevented||editableTarget(e.target)||e.altKey||e.metaKey||e.ctrlKey)return;
  if(e.key==='p'||e.key==='P'){e.preventDefault();if(e.shiftKey)action('stop');else action('play');return}
  if(e.key==='ArrowLeft'){e.preventDefault();action('prev');return}
  if(e.key==='ArrowRight'){e.preventDefault();action('next');return}
  if(e.key===','){e.preventDefault();action('slower');return}
  if(e.key==='.'){e.preventDefault();action('faster');return}
  if(e.key==='Escape'){action('stop');state.more=false;state.uses=false;render()}
});
ap.addEventListener('aperture-focus',e=>{state.snap=e.detail||ap.snapshot?.()||null;render()});
new MutationObserver(()=>render()).observe(document.querySelector('.viewerHead')||document.body,{subtree:true,attributes:true,attributeFilter:['hidden','class']});

suppressLegacy();setMode(state.mode,{preserveScale:true});state.snap=ap.snapshot?.()||null;render();
window.ReadfieldControls=Object.freeze({VERSION,getState:()=>({...state,snap:snap(),density:plane.dataset.density||'regular'}),setMode,action,render});
})();