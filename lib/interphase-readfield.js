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
    clock:{type:s.playing?'RSVP':'ADDRESS',wpm:s.wpm||null,playing:!!s.playing},
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
let rideRailButton=null;
function rideReady(){const s=ap.snapshot?.()||{},native=document.getElementById('rideLive');return !!native&&!native.disabled&&!!(s.label||s.address||s.focus)}
function triggerRide(){const native=document.getElementById('rideLive');if(native&&!native.disabled&&rideReady())native.click()}
function installRideDoorway(){
  const rail=document.getElementById('workRail'),native=document.getElementById('rideLive');
  if(rail&&native&&!rail.querySelector('[data-reader-handoff="ride"]')){
    const b=document.createElement('button');b.type='button';b.dataset.readerHandoff='ride';b.textContent='RIDE';b.title='Carry this exact source + cursor into FOLD//BLOOM LIVE, then return to the revalidated address.';b.setAttribute('aria-label','Ride current READFIELD focus in FOLD BLOOM LIVE');b.addEventListener('click',triggerRide);
    const review=rail.querySelector('[data-reader-action="review"]'),next=review?.nextElementSibling;next?rail.insertBefore(b,next):rail.appendChild(b);rideRailButton=b;rail.style.gridTemplateColumns='repeat(7,minmax(0,1fr))';
  }else rideRailButton=rail?.querySelector('[data-reader-handoff="ride"]')||rideRailButton;
  const uses=document.querySelector('.useCases');
  if(uses&&!uses.querySelector('[data-reader-use="ride"]')){
    const card=document.createElement('div');card.className='useCase';card.dataset.readerUse='ride';card.innerHTML='<b>RIDE / MATERIAL</b><span>Turn the current sentence, paragraph or section into addressed terrain. LIVE owns traversal only; RETURN revalidates the exact source hash and native span before READFIELD moves the cursor.</span><button type="button" data-reader-handoff-card="ride">CARRY → RIDE</button>';card.querySelector('button')?.addEventListener('click',triggerRide);
    const reviewCard=uses.querySelector('button[data-reader-action="review"]')?.closest('.useCase');reviewCard?.after(card)||uses.appendChild(card);
  }
  const chains=document.querySelector('.workflowChains');
  if(chains&&!chains.querySelector('[data-reader-chain="ride"]')){
    const chain=document.createElement('div');chain.className='workflowChain';chain.dataset.readerChain='ride';chain.innerHTML='<b>FAST → REVIEW → RIDE → RETURN</b><span>Skim until something catches, stop on the hard sentence, traverse that exact addressed material in LIVE, then return only if the source identity and native span still validate.</span>';chains.appendChild(chain);
  }
  if(rideRailButton)rideRailButton.disabled=!rideReady();
  document.documentElement.dataset.readfieldRideRail=rideRailButton?'ready':'unavailable';
}
function sync(s){const ref=refOf(s);host.select(ref);host.focus(ref,{aperture:s.scale||'DETAIL'});const view=(new URLSearchParams(location.search).get('read_view')||'PAGE').toUpperCase();host.project(host.projections[view]?view:'PAGE',{readfieldView:view});if(rideRailButton)rideRailButton.disabled=!rideReady();}
ap.addEventListener('aperture-focus',e=>sync(e.detail||ap.snapshot?.()||{}));
queueMicrotask(()=>{installRideDoorway();const s=ap.snapshot?.();if(s?.label)sync(s)});
globalThis.ReadfieldInterphase=host;
})();