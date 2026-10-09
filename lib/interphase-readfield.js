(()=>{'use strict';
if(!globalThis.Interphase)return;
const ap=document.getElementById('docAperture');if(!ap)return;
const I=globalThis.Interphase;
const refOf=s=>s?.address||('readfield://'+encodeURIComponent(s?.label||'source')+'/'+(s?.scale||'WHOLE')+'/'+(s?.index??0));
const adapter={
  id:'readfield',
  idOf:r=>typeof r==='string'?r:refOf(ap.snapshot?.()),
  resolve:r=>({ref:typeof r==='string'?r:refOf(ap.snapshot?.())}),
  describe:()=>{const s=ap.snapshot?.()||{};return{
    id:refOf(s),kind:'readfield-focus',label:s.focus||s.label||'READFIELD',
    address:{source:s.label||null,address:s.address||null,scale:s.scale,index:s.index,char_index:s.char_index},
    channels:['identity','address','content','depth','time'],capabilities:['read'],operations:[{id:'SEEK',authority:'VIEW',reversible:true},{id:'SCALE',authority:'VIEW',reversible:true}],authority:'VIEW',
    clock:{type:s.speaking?'VOICE':s.playing?'RSVP':'ADDRESS',wpm:s.wpm||null,playing:!!(s.playing||s.speaking)},
    value:s
  }},
  read:()=>ap.snapshot?.()||{},
  capture:()=>ap.snapshot?.()||null,
  restore:s=>ap.restore?.(s),
  invoke:(_r,op,args)=>{
    if(op==='SEEK'){if(args.address){const hit=ap.locate?.(args.address);if(hit){ap.scale=hit.scale;ap.setPos?.(hit.index);return{ok:true,evidence:{address:args.address}}}}if(Number.isFinite(Number(args.fraction))){ap.seekFraction?.(Number(args.fraction));return{ok:true,evidence:{fraction:Number(args.fraction)}}}return{ok:false,reason:'SEEK_TARGET_REQUIRED'}}
    if(op==='SCALE'){ap.setScale?.(ap.scaleIndex?.(args.scale));return{ok:true,evidence:{scale:args.scale}}}
    return{ok:false,reason:'SUPPORT=0:'+op};
  }
};
const host=I.createHost(adapter,{id:'READFIELD',projection:'PAGE'});
let rideDoorButton=null;
function rideReady(){const s=ap.snapshot?.()||{},native=document.getElementById('rideLive');return !!native&&!native.disabled&&!!(s.label||s.address||s.focus)}
function triggerRide(){const native=document.getElementById('rideLive');if(native&&!native.disabled&&rideReady())native.click()}
function installRideDoorway(){
  const now=document.querySelector('.workNow'),native=document.getElementById('rideLive');
  if(now&&native&&!now.querySelector('[data-reader-handoff="ride"]')){
    const b=document.createElement('button');b.type='button';b.dataset.readerHandoff='ride';b.textContent='RIDE ↗';b.title='Carry this exact source + cursor into FOLD//BLOOM LIVE, then return to the revalidated address.';b.setAttribute('aria-label','Ride current READFIELD focus in FOLD BLOOM LIVE');b.addEventListener('click',triggerRide);b.style.flex='0 0 auto';b.style.padding='5px 8px';now.appendChild(b);rideDoorButton=b;
  }else rideDoorButton=now?.querySelector('[data-reader-handoff="ride"]')||rideDoorButton;
  const uses=document.querySelector('.useCases');
  if(uses&&!uses.querySelector('[data-reader-use="ride"]')){
    const card=document.createElement('div');card.className='useCase';card.dataset.readerUse='ride';card.innerHTML='<b>RIDE / MATERIAL</b><span>Turn the current sentence, paragraph or section into addressed terrain. LIVE owns traversal only; RETURN revalidates the exact source hash and native span before READFIELD moves the cursor.</span><button type="button" data-reader-handoff-card="ride">CARRY → RIDE</button>';card.querySelector('button')?.addEventListener('click',triggerRide);
    const reviewCard=uses.querySelector('button[data-reader-action="review"]')?.closest('.useCase');reviewCard?.after(card)||uses.appendChild(card);
  }
  const chains=document.querySelector('.workflowChains');
  if(chains&&!chains.querySelector('[data-reader-chain="ride"]')){
    const chain=document.createElement('div');chain.className='workflowChain';chain.dataset.readerChain='ride';chain.innerHTML='<b>FAST → REVIEW → RIDE → RETURN</b><span>Skim until something catches, stop on the hard sentence, traverse that exact addressed material in LIVE, then return only if the source identity and native span still validate.</span>';chains.appendChild(chain);
  }
  if(rideDoorButton)rideDoorButton.disabled=!rideReady();
  document.documentElement.dataset.readfieldRideDoor=rideDoorButton?'ready':'unavailable';
}

function trackPacket(){
  try{return JSON.parse(sessionStorage.getItem('readfield.track.handoff.v01')||'null')}catch(_){return null}
}
function installTrackStyle(){
  if(document.getElementById('readfieldTrackStyle'))return;
  const style=document.createElement('style');style.id='readfieldTrackStyle';style.textContent=`
  [data-reader-track]{border-color:rgba(109,189,255,.55)!important}[data-reader-track].modeOn{background:#eef5f8!important;color:#061018!important}.readfieldTrackState{display:inline-flex;align-items:center;min-height:26px;padding:4px 7px;border:1px solid rgba(255,255,255,.14);color:#7f909d;font:700 7px/1.25 ui-monospace,monospace;letter-spacing:.07em;white-space:nowrap}.readfieldTrackState.on{border-color:rgba(109,189,255,.55);color:#dcebf5}.readfieldTrackState.bad{border-color:rgba(255,152,82,.55);color:#ffb27d}
  `;document.head.appendChild(style);
}
async function installTrackSync(){
  const packet=trackPacket();if(!packet?.timedText?.cues?.length){document.documentElement.dataset.readfieldTrack='none';return}
  installTrackStyle();
  const [{createFieldPulse,transportDescriptor},{trackTarget}]=await Promise.all([import('/lib/field-pulse.js'),import('/lib/readfield-track-sync.js')]);
  const rail=document.querySelector('#workRail'),now=document.querySelector('.workNow'),uses=document.querySelector('.useCases'),chains=document.querySelector('.workflowChains');
  let button=rail?.querySelector('[data-reader-track]'),state=now?.querySelector('.readfieldTrackState'),active=new URLSearchParams(location.search).get('track')==='1',lastClock=null,lastCue=-1;
  if(rail&&!button){button=document.createElement('button');button.type='button';button.dataset.readerTrack='1';button.textContent='TRACK';rail.appendChild(button)}
  if(now&&!state){state=document.createElement('span');state.className='readfieldTrackState';state.textContent='TRACK · WAIT';now.appendChild(state)}
  if(uses&&!uses.querySelector('[data-reader-use="track"]')){
    const card=document.createElement('div');card.className='useCase';card.dataset.readerUse='track';card.innerHTML='<b>TRACK / TIMED TEXT</b><span>When LISTEN has real LRC/VTT/SRT timing, the playing audio advances this exact text cue-by-cue over FIELD PULSE. Tap FAST / REVIEW / VOICE / LOCI to leave sync without losing the source.</span><button type="button" data-reader-track-card>FOLLOW TRACK</button>';uses.prepend(card);card.querySelector('button')?.addEventListener('click',()=>setActive(true));
  }
  if(chains&&!chains.querySelector('[data-reader-chain="track"]')){
    const chain=document.createElement('div');chain.className='workflowChain';chain.dataset.readerChain='track';chain.innerHTML='<b>LISTEN → TRACK → REVIEW</b><span>Follow timed lyrics/transcript while audio plays; the instant a line matters, switch to REVIEW and the addressed cursor stays on that source instead of chasing the clock.</span>';chains.prepend(chain);
  }
  const pulse=createFieldPulse('READFIELD_TRACK');
  function paint(target=null,reason=''){
    if(button){button.classList.toggle('modeOn',active);button.textContent=active?(target?`TRACK ${target.cueIndex+1}/${target.cueCount}`:'TRACK · WAIT'):'TRACK'}
    if(state){state.classList.toggle('on',active&&!reason);state.classList.toggle('bad',!!reason);state.textContent=reason?`TRACK · ${reason}`:active?(target?`${target.playing?'LIVE':'PAUSED'} · ${target.cueIndex+1}/${target.cueCount}`:'TRACK · WAIT FOR LISTEN'):'TRACK · OFF'}
    document.documentElement.dataset.readfieldTrack=reason?'blocked':active?'on':'off';
  }
  function apply(clock){
    if(!active||!clock||clock.source!=='FOLD_BLOOM_LISTEN')return;
    const target=trackTarget(packet,clock);if(!target){paint(null,'SOURCE MISMATCH');return}
    paint(target,'');
    if(target.cueIndex===lastCue)return;lastCue=target.cueIndex;
    const snap=ap.snapshot?.()||{};ap.stop?.();ap.restore?.({scale:'PHRASE',char_index:target.charIndex,wpm:snap.wpm||300});
  }
  function setActive(next){
    active=!!next;lastCue=-1;
    if(active){ap.stop?.();if(lastClock)apply(lastClock)}
    paint();
  }
  button?.addEventListener('click',()=>setActive(!active));
  document.querySelectorAll('[data-reader-action]').forEach(b=>b.addEventListener('click',()=>{if(active)setActive(false)}));
  const accept=msg=>{const clock=transportDescriptor(msg);if(!clock||clock.source!=='FOLD_BLOOM_LISTEN')return;lastClock=clock;if(active)apply(clock)};
  accept(pulse.last());pulse.subscribe(accept);paint();if(active&&lastClock)apply(lastClock);
  globalThis.ReadfieldTrackSync={packet:()=>packet,active:()=>active,setActive};
}

function installControlPlane(){
  if(document.querySelector('[data-readfield-controls],script[data-readfield-controls-loader]'))return;
  const s=document.createElement('script');s.src='/lib/readfield-controls.js';s.defer=true;s.dataset.readfieldControlsLoader='1';document.head.appendChild(s);
}
function sync(s){const ref=refOf(s);host.select(ref);host.focus(ref,{aperture:s.scale||'DETAIL'});const view=(new URLSearchParams(location.search).get('read_view')||'PAGE').toUpperCase();host.project(host.projections[view]?view:'PAGE',{readfieldView:view});if(rideDoorButton)rideDoorButton.disabled=!rideReady();}
ap.addEventListener('aperture-focus',e=>sync(e.detail||ap.snapshot?.()||{}));
queueMicrotask(()=>{installRideDoorway();installControlPlane();void installTrackSync();const s=ap.snapshot?.();if(s?.label)sync(s)});
globalThis.ReadfieldInterphase=host;
})();