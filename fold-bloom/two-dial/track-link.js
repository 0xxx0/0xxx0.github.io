import {LiveTrack} from '../live/track.js';

const api=window.FoldBloom;
const $=s=>document.querySelector(s);
if(!api)throw new Error('FOLD//BLOOM Two Dial API unavailable');

const audio=$('#trackAudio'),input=$('#trackFile'),loadBtn=$('#trackLoadBtn'),toggleBtn=$('#trackToggleBtn'),status=$('#trackLinkStatus');
let map=null,lastPush=0;

const track=new LiveTrack(audio,{
  onState:label=>{
    if(status)status.textContent=label==='NONE'?'NO LOCAL TRACK':'LOCAL · '+label;
    if(toggleBtn){toggleBtn.disabled=!track.active();toggleBtn.textContent=track.active()?(audio.paused?'PLAY TRACK':'PAUSE TRACK'):'PLAY TRACK'}
  },
  onMap:m=>{map=m;render()}
});
track.setVolume(.62);

function render(){
  const t=track.transport();
  if(status&&track.active()){
    const key=map?.key?.label?' · '+map.key.label.toUpperCase():'';
    const bpm=map?.bpm?map.bpm.toFixed(1)+' BPM':'';
    status.textContent='LOCAL · '+(audio.paused?'READY':'PLAYING')+' · '+(map?.stage||'AUDIO')+' · '+bpm+key;
  }
  if(toggleBtn){toggleBtn.disabled=!track.active();toggleBtn.textContent=track.active()?(audio.paused?'PLAY TRACK':'PAUSE TRACK'):'PLAY TRACK'}
  return t;
}
async function load(file){
  if(!file)return;
  try{
    api.setPulseLink?.(true);
    if(status)status.textContent='LOCAL · DECODING';
    await track.load(file);
    render();
  }catch(error){
    console.warn('Two Dial local track',error);
    if(status)status.textContent='LOCAL TRACK ERROR';
  }
}
loadBtn?.addEventListener('click',()=>{api.stopIdle?.(false);input?.click()});
input?.addEventListener('change',e=>load(e.target.files?.[0]));
toggleBtn?.addEventListener('click',()=>{api.stopIdle?.(true);track.toggle().then(render).catch(()=>{if(status)status.textContent='PLAY BLOCKED'})});

function loop(now){
  if(track.active()&&now-lastPush>100){
    lastPush=now;
    const t=render();
    if(t)api.updatePulseContext?.(t,Date.now());
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

window.FoldBloomTrackLink={
  active:()=>track.active(),
  state:()=>({map,transport:track.transport(),playing:track.active()&&!audio.paused}),
  play:async()=>{if(track.active()&&audio.paused)await audio.play();render();return track.active()&&!audio.paused},
  load
};
document.documentElement.dataset.foldBloomLocalTrack='ready';
