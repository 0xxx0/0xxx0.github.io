'use strict';
(()=>{
  const portrait=()=>innerHeight>innerWidth*1.12 && innerWidth<900;
  const link=document.createElement('link');
  link.rel='stylesheet'; link.href='portrait.css?v=rc11.3'; document.head.appendChild(link);

  function axisStep(delta,unit){
    const dead=unit*.42;
    if(Math.abs(delta)<dead)return 0;
    return Math.sign(delta)*(1+Math.floor((Math.abs(delta)-dead)/unit));
  }
  function fitField(){
    if(!portrait())return;
    try{
      CX=innerWidth/2;
      CY=innerHeight*.445;
      R=Math.min(innerWidth*.355, innerHeight*.178);
    }catch(_){ }
  }
  addEventListener('resize',()=>requestAnimationFrame(fitField));
  visualViewport?.addEventListener?.('resize',()=>requestAnimationFrame(fitField));

  function waitRuntime(){
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      if(document.documentElement.dataset.fbRuntime==='ready' && typeof window.updateHUD==='function'){
        clearInterval(timer); patchRuntime();
      }else if(tries>120){ clearInterval(timer); }
    },50);
  }

  function patchRuntime(){
    fitField();
    const sub=document.querySelector('.sub');
    if(sub)sub.textContent='RC11.3 / PORTRAIT FIELD';

    window.neighborSet=function(i,topology=gene.topology){
      let out=topology==='SKIP'?[(i-2+N)%N,(i+2)%N]
        :topology==='TRIAD'?[(i-1+N)%N,(i+1)%N,(i+N/3)%N]
        :topology==='MIRROR'?[(i-1+N)%N,(i+1)%N,(i+N/2)%N]
        :[(i-1+N)%N,(i+1)%N];
      if(gene.law==='FOLD'&&topology!=='MIRROR')out.push((i+N/2)%N);
      if(gene.law==='BYTE'){const st=1+((gene.seed>>>(i%16))&1);out.push((i-st+N)%N,(i+st)%N)}
      if(gene.law==='ATTRACTOR')eventTape.slice(-3).filter(e=>e.kind==='BLOOM').forEach(e=>out.push(e.slot%N));
      return [...new Set(out.map(x=>(x+N)%N))].filter(x=>x!==i)
    };

    const basePressure=window.drawPressureBook;
    window.drawPressureBook=function(){
      if(!portrait())return basePressure();
      const rows=pressureSnapshot(),x=W-18,y=CY-R*.58;
      g.save();g.font='8px ui-monospace';g.textAlign='right';
      rows.forEach((r,i)=>{
        const yy=y+i*25,w=Math.min(24,Math.abs(r.imbalance)*3.2);
        g.fillStyle='rgba(255,255,255,.07)';g.fillRect(x-29,yy-7,29,14);
        g.fillStyle=`hsla(${baseHue[r.type]},85%,70%,.72)`;
        g.fillRect(x-w,yy-6,w,12);
        g.fillStyle='rgba(255,255,255,.86)';g.fillText(glyphs[r.type],x-31,yy+3);
      });
      g.restore();
    };

    const baseToolglass=window.drawToolglassOverlay;
    window.drawToolglassOverlay=function(){
      if(!portrait())return baseToolglass();
      if(!toolglassActive)return;
      const tp=previewTopology(),type=seed?.type??futureQueue[0]??0,p=bestPotential(type,tp),path=predictedChain(p.slot,type,tp),idx=scopeIndex(),arr=scopeDomainList(lensDomain);
      g.save();g.translate(CX,CY);
      g.fillStyle='rgba(5,8,13,.42)';g.beginPath();g.arc(0,0,R*1.24,0,TAU);g.fill();
      g.strokeStyle='rgba(255,255,255,.24)';g.lineWidth=1.5;g.beginPath();g.arc(0,0,R*1.24,0,TAU);g.stroke();
      g.strokeStyle=`hsla(${baseHue[type]},95%,82%,.78)`;g.lineWidth=2.2;
      for(let k=0;k<path.length-1;k++){
        const a=slotAngle(path[k]),b=slotAngle(path[k+1]);
        g.beginPath();g.moveTo(Math.cos(a)*R,Math.sin(a)*R);g.quadraticCurveTo(0,0,Math.cos(b)*R,Math.sin(b)*R);g.stroke();
      }
      g.textAlign='center';g.font='700 11px ui-monospace';g.fillStyle='rgba(255,255,255,.96)';
      g.fillText(`PATH · ${tp}`,0,-R*1.02);
      g.font='9px ui-monospace';g.fillStyle='rgba(255,255,255,.58)';
      g.fillText(`← / →  topology`,0,-R*.84);
      g.fillStyle='rgba(255,255,255,.92)';g.fillText(`${glyphs[type]} BEST ${p.chain}×`,0,4);
      const micro=arr[Math.max(0,idx-1)],cur=arr[idx],macro=arr[Math.min(arr.length-1,idx+1)];
      g.textAlign='left';g.font='8px ui-monospace';g.fillStyle='rgba(255,255,255,.42)';g.fillText(`↑ ${macro}`, -R*1.05, R*.58);
      g.font='700 10px ui-monospace';g.fillStyle='rgba(255,255,255,.95)';g.fillText(`• ${cur}`, -R*1.05, R*.75);
      g.font='8px ui-monospace';g.fillStyle='rgba(255,255,255,.42)';g.fillText(`↓ ${micro}`, -R*1.05, R*.92);
      const rows=pressureSnapshot(tp);g.textAlign='right';
      rows.forEach((r,i)=>{const yy=R*.55+i*18,w=Math.min(26,Math.abs(r.imbalance)*3.2);g.fillStyle='rgba(255,255,255,.08)';g.fillRect(R*.73-w,yy-6,w,12);g.fillStyle=`hsla(${baseHue[r.type]},85%,72%,.82)`;g.fillRect(R*.73-w,yy-5,w,10);g.fillStyle='rgba(255,255,255,.75)';g.fillText(glyphs[r.type],R*.92,yy+3)});
      g.restore();
    };

    const btn=document.querySelector('#glassBtn'),hint=document.querySelector('#glassHint');
    if(btn){
      let startIndex=0,startScope=0,lastI=-1,lastS=-1;
      window.setToolglassFromX=function(x){
        const dx=x-toolglassStartX,ni=clamp(startIndex+axisStep(dx,58),0,lensNames.length-1);
        if(ni!==toolglassIndex){toolglassIndex=ni;if(ni!==lastI){haptic(3);lastI=ni}}
        updateHUD(); if(hint)hint.textContent=`${lensNames[toolglassIndex]} · ${scopeDomainList(lensDomain)[toolglassScope]}`;
      };
      window.setToolglassFromY=function(y){
        const dy=toolglassStartY-y,ns=clamp(startScope+axisStep(dy,48),0,8);
        if(ns!==toolglassScope){toolglassScope=ns;if(ns!==lastS){haptic(3);lastS=ns}}
        updateHUD(); if(hint)hint.textContent=`${lensNames[toolglassIndex]} · ${scopeDomainList(lensDomain)[toolglassScope]}`;
      };
      btn.addEventListener('pointerdown',()=>{
        startIndex=Math.max(0,lensNames.indexOf(lensTopology));startScope=lensScope;lastI=startIndex;lastS=startScope;
        if(hint)hint.textContent=`${lensNames[startIndex]} · ${scopeDomainList(lensDomain)[startScope]}`;
      },true);
      const reset=()=>setTimeout(()=>{if(hint)hint.textContent='drag x = path · y = scale'},0);
      btn.addEventListener('pointerup',reset);btn.addEventListener('pointercancel',reset);
    }

    const oldPaused=window.setPaused;
    if(typeof oldPaused==='function')window.setPaused=function(on){oldPaused(on);document.body.classList.toggle('sheetOpen',!!on)};
    updateHUD();
  }

  waitRuntime();
})();