function drawToolglassOverlay(){if(!toolglassActive)return; const tp=previewTopology(), type=seed?.type??futureQueue[0]??0, p=bestPotential(type,tp), path=predictedChain(p.slot,type,tp); g.save(); g.translate(CX,CY); g.fillStyle='rgba(10,14,22,.33)'; g.beginPath(); g.arc(0,0,R*1.48,0,TAU); g.fill(); g.strokeStyle='rgba(255,255,255,.18)'; g.lineWidth=2; g.beginPath(); g.arc(0,0,R*1.48,0,TAU); g.stroke(); ['BASE','LOCAL','SKIP','TRIAD','MIRROR'].forEach((name,i)=>{const a=-Math.PI/2+i*TAU/5,x=Math.cos(a)*R*1.66,y=Math.sin(a)*R*1.66; g.fillStyle=(i===toolglassIndex)?'rgba(255,255,255,.95)':'rgba(255,255,255,.36)'; g.font='10px ui-monospace'; g.textAlign='center'; g.fillText(name,x,y)}); g.strokeStyle=`hsla(${baseHue[type]},95%,82%,.75)`; g.lineWidth=2.2; for(let k=0;k<path.length-1;k++){const a=slotAngle(path[k]),b=slotAngle(path[k+1]),x1=Math.cos(a)*R,y1=Math.sin(a)*R,x2=Math.cos(b)*R,y2=Math.sin(b)*R; g.beginPath(); g.moveTo(x1,y1); g.quadraticCurveTo(0,0,x2,y2); g.stroke()} const rows=pressureSnapshot(tp); rows.forEach((r,i)=>{const yy=-R*.82+i*26; g.fillStyle='rgba(255,255,255,.07)'; g.fillRect(-26,yy-8,52,16); const w=Math.min(24,Math.abs(r.imbalance)*4.8); g.fillStyle=`hsla(${baseHue[r.type]},85%,70%,.8)`; g.fillRect(r.imbalance>=0?-w:0,yy-7,w,14); g.fillStyle='#fff'; g.font='9px ui-monospace'; g.fillText(glyphs[r.type],0,yy+4)}); g.fillStyle='rgba(255,255,255,.92)'; g.font='12px ui-monospace'; g.fillText(`${tp} · ${glyphs[type]} BEST ${p.chain}×`,0,6); const arr=scopeDomainList(lensDomain); arr.forEach((lab,i)=>{const yy=(i-4)*18; g.fillStyle=i===scopeIndex()?'rgba(255,255,255,.94)':'rgba(255,255,255,.3)'; g.font='9px ui-monospace'; g.textAlign='left'; g.fillText(lab,R*1.08,yy)}); g.textAlign='center'; g.fillStyle='rgba(255,255,255,.6)'; g.fillText(lensDomain,-R*1.26,-R*1.04); g.restore()}
function updateMotion(dt){if(snapping){const d=snapTarget-rotation; if(Math.abs(d)<.002){rotation=snapTarget; snapping=false; rotVel=0}else rotation+=d*Math.min(1,dt*18)} else {rotation+=rotVel*dt; rotVel*=Math.pow(.04,dt)}}
function autoPilot(dt){if(!garden||paused||drag||!seed)return; let best=null; for(let i=0;i<N;i++){if(cells[i].type!==seed.type)continue; const ch=predictedChain(i,seed.type).length,target=nearestRotation(i),travel=Math.abs(target-rotation),v=ch*10+cells[i].tier*1.2-travel; if(!best||v>best.v)best={target,v}} if(best){snapTarget=best.target; snapping=true; if(seed.p>.82&&!aligned())rotation+=clamp(best.target-rotation,-dt*6,dt*6)}}
function nearestRotation(i){let target=gateAngle()+Math.PI/2-i*TAU/N; while(target-rotation>Math.PI)target-=TAU; while(target-rotation<-Math.PI)target+=TAU; return target}
function loop(now){if(!running||paused)return; const dt=Math.min(.04,(now-last)/1000); last=now; fieldTime+=dt*pace; fieldImpulse*=Math.exp(-dt*2.4); breath=Math.max(0,breath-dt); autoPilot(dt); updateMotion(dt); drawField(fieldTime); drawRing(fieldTime); drawCausal(fieldTime); drawScoreHalo(fieldTime); drawPressureBook(); drawToolglassOverlay(); drawSeed(fieldTime,dt); requestAnimationFrame(loop)}
async function ensureAudio(){if(!soundOn)return false; try{const AC=window.AudioContext||window.webkitAudioContext; if(!AC)return false; if(!audio){audio=new AC(); master=audio.createGain(); master.gain.value=volume*.36; master.connect(audio.destination)} if(audio.state==='suspended')await audio.resume(); startMusic(); return audio.state==='running'}catch(_){return false}}
function osc(freq,t,d=.16,v=.03,type='sine',pan=0){if(!audio||!soundOn)return; const o=audio.createOscillator(),a=audio.createGain(); o.type=type; o.frequency.value=freq; a.gain.setValueAtTime(.0001,t); a.gain.exponentialRampToValueAtTime(Math.max(.0002,v),t+.01); a.gain.exponentialRampToValueAtTime(.0001,t+d); o.connect(a); if(audio.createStereoPanner){const p=audio.createStereoPanner(); p.pan.value=clamp(pan,-1,1); a.connect(p); p.connect(master)} else a.connect(master); o.start(t); o.stop(t+d+.02)}
function scale(){return [[0,2,5,7,9],[0,3,5,7,10],[0,2,4,7,9]][gene.scale%3]} function lawWave(){return gene.law==='BYTE'?'square':gene.voice==='WOOD'?'triangle':gene.voice==='WIRE'?'sawtooth':'sine'}
function intervalFor(step){if(gene.law==='FOLD')return [0,2,4,2][step%4]; if(gene.law==='BYTE')return ((gene.seed>>>(step%16))&1)?3:1; if(gene.law==='ATTRACTOR'){const e=eventTape.slice(-1)[0]; return 1+(((e?.slot||0)+(e?.chain||1)+step)%4)} return gene.topology==='SKIP'?2:gene.topology==='TRIAD'?3:1}
function playBloom(type,tier,angle,chain){if(!audio)return; const t=audio.currentTime+.01,root=[196,246.94,293.66][type],sc=scale(),pan=Math.cos(angle)*.65,voices=Math.min(3,1+Math.floor((chain-1)/2)); for(let j=0;j<voices;j++){const d=sc[(tier+j*intervalFor(j))%sc.length]+(tier>=4?12:0); osc(root*Math.pow(2,d/12),t+j*.028,.16+.03*tier,.038/(1+j*.3),j?lawWave():'triangle',pan*(1-j*.2))}}
function playChain(type,tier,step,angle){if(!audio)return; const sc=scale(),root=[196,246.94,293.66][type],d=sc[Math.abs(step*intervalFor(step)+tier)%sc.length]+(tier>=4?12:0); osc(root*Math.pow(2,d/12),audio.currentTime+.02,.16,.028,lawWave(),Math.cos(angle)*.7)}
function playMiss(){if(audio)osc(92,audio.currentTime,.12,.028,'triangle',0)} function playChapter(){if(!audio)return; const t=audio.currentTime+.02; [0,4,7,12].forEach((d,i)=>osc(220*Math.pow(2,d/12),t+i*.055,.28,.025,'sine',(i-1.5)*.16))}
function startMusic(){clearInterval(musicTimer); clearInterval(droneTimer); if(!audio||!soundOn)return; const sc=scale(); droneTimer=setInterval(()=>{if(paused||!running)return; const root=55*Math.pow(2,((gene.scale%3)*2)/12); osc(root,audio.currentTime+.01,.95,.005,gene.voice==='WOOD'?'triangle':'sine',-.12); osc(root*Math.pow(2,7/12),audio.currentTime+.05,.85,.004,gene.voice==='WIRE'?'sawtooth':'sine',.12)}, 1300); musicTimer=setInterval(()=>{if(paused||!running)return; const e=eventTape[(eventTape.length-1-(Math.floor(performance.now()/320)%Math.max(1,Math.min(8,eventTape.length))))]; const sc=scale(),root=110,idx=e?((e.type+(e.chain||1)+Math.floor(performance.now()/500))%sc.length):(Math.floor(performance.now()/500)%sc.length),amp=breath>0?.006:.011; osc(root*Math.pow(2,(sc[idx]+((combo%4===0)?12:0))/12),audio.currentTime+.02,.42,amp,lawWave(),e?Math.sin((e.slot||0)/N*TAU)*.35:0); if(gene.rhythm==='STEP')osc(root*Math.pow(2,sc[(idx+2)%sc.length]/12),audio.currentTime+.14,.18,amp*.6,'square',0);}, Math.max(150,600/(gene.tempo/60)))}
function haptic(ms){try{navigator.vibrate?.(ms)}catch(_){}}

// Runtime continuation loader. The page historically loaded only app1–app4,
// while input handlers, labs, Toolglass and final initialization live in app5–app9.
// RC11.3 adds a portrait-first interaction patch after the full runtime.
(async()=>{
  const ids=['startFlow','startRatchet','startGarden'];
  const controls=ids.map(id=>document.getElementById(id)).filter(Boolean);
  controls.forEach(b=>{b.disabled=true;b.dataset.runtimeLabel=b.innerHTML});
  const sub=document.querySelector('.sub');
  if(sub)sub.textContent='RC11.3 / LOADING FIELD';
  try{
    for(const file of ['app5.js','app6.js','app7.js','app8.js','app9.js','portrait-ux.js']){
      await new Promise((resolve,reject)=>{
        const s=document.createElement('script');
        s.src=file+'?v=rc11.3';
        s.async=false;
        s.onload=resolve;
        s.onerror=()=>reject(new Error('Failed to load '+file));
        document.body.appendChild(s);
      });
    }
    controls.forEach(b=>{b.disabled=false;if(b.dataset.runtimeLabel)b.innerHTML=b.dataset.runtimeLabel});
    if(sub)sub.textContent='RC11.3 / PORTRAIT FIELD';
    document.documentElement.dataset.fbRuntime='ready';
  }catch(err){
    document.documentElement.dataset.fbRuntime='failed';
    document.documentElement.dataset.fbRuntimeError=String(err?.message||err);
    if(sub)sub.textContent='RUNTIME LOAD FAILED · RELOAD';
    const toast=document.getElementById('toast');
    if(toast){toast.textContent='RUNTIME LOAD FAILED · RELOAD';toast.classList.add('on')}
  }
})();