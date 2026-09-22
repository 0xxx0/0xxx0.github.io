import { createFieldPulse } from '../../lib/field-pulse.js';

const api=window.FoldBloom;
const $=s=>document.querySelector(s);
if(!api) throw new Error('FOLD//BLOOM Two Dial API unavailable');

const pulse=createFieldPulse('FOLD_BLOOM_TWO_DIAL');
const btn=$('#pulseLinkBtn'),status=$('#pulseLinkStatus'),openBtn=$('#pulseListenBtn');
let lastListen=null;
const pulseRequest=new URLSearchParams(location.search).get('pulse')==='1';
const lastPulse=pulse.last();
if(lastPulse?.source==='FOLD_BLOOM_LISTEN'&&lastPulse.kind==='transport'){
  lastListen=lastPulse;api.updatePulseContext?.(lastPulse.data,lastPulse.wall);
}
if(pulseRequest){
  const state=api.state?.()||{};
  if(!state.prefs?.pulseLink)api.setPulseLink?.(true);
}

function render(){
  const state=api.state?.()||{},linked=!!state.prefs?.pulseLink,p=api.pulseState?.()||{};
  if(btn){
    btn.textContent=linked?'PULSE LINK ON':'PULSE LINK OFF';
    btn.classList.toggle('active',linked);
    btn.setAttribute('aria-pressed',String(linked));
  }
  if(status){
    if(!linked) status.textContent='OFF · Two Dial keeps its own clock.';
    else if(p.active) status.textContent=`LIVE · ${Math.round(p.tempo||p.bpm||0)} BPM · E${Math.round((p.energy||0)*100)} · SECTION ${Math.max(0,p.sectionIndex)+1}`;
    else if(p.connected) status.textContent=`WAITING · LISTEN ${p.playing?'clock stale':'paused'} · internal clock retained`;
    else status.textContent='WAITING · open LISTEN in another same-origin tab and play a track';
  }
}

btn?.addEventListener('click',()=>{
  const state=api.state?.()||{};
  api.setPulseLink?.(!state.prefs?.pulseLink);
  render();
});
openBtn?.addEventListener('click',()=>window.open('../listen/','_blank','noopener'));

pulse.subscribe(msg=>{
  if(msg.source!=='FOLD_BLOOM_LISTEN'||msg.kind!=='transport')return;
  lastListen=msg;
  api.updatePulseContext?.(msg.data,msg.wall);
  render();
});

api.subscribeEvents?.(event=>{
  if(!event||!['commit','compose'].includes(event.type))return;
  const p=api.pulseState?.()||{};
  pulse.publish('operation',{
    operation:event.v||null,
    operations:event.ops||null,
    power:event.power??null,
    matched:event.matched??null,
    mode:event.mode||api.state?.().prefs?.mode||null,
    form:event.form||api.state?.().form?.state||null,
    world:event.world||api.state?.().prefs?.world||null,
    voice:event.voice||api.state?.().prefs?.voice||null,
    groove:event.groove||api.state?.().prefs?.groove||null,
    scope:event.scope||api.state?.().prefs?.scope||null,
    trackTime:p.time??null,
    trackBeat:p.beatIndex??null,
    trackSection:p.sectionIndex??null,
    pulseLinked:!!api.state?.().prefs?.pulseLink
  });
});

setInterval(render,600);
render();
document.documentElement.dataset.foldBloomPulse='ready';
window.FoldBloomPulseLink={state:()=>({listen:lastListen,local:api.pulseState?.()||{},enabled:!!api.state?.().prefs?.pulseLink})};
