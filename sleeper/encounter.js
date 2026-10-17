'use strict';
// Derived encounter/material readings. No player, grid, proof or artifact mutation.
// Host-local until three real consumers justify moving it into /lib/.
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SleeperEncounter=api})(globalThis,()=>{
  const PRIMARY={conch:'PROVENANCE',keris:'OPERATION',w8:'RETRIEVAL',spiral:'COMPRESSION'};
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  function aperture(g,now,hit=null){
    if(!g)return null;
    if(g.returnOpen)return{title:'回 RETURN TO THE FIRST MARK',line:'Eight proofs hold. Walk back to the coordinate where you began.',phase:'return',tool:null,progress:1};
    const near=g.gates.filter(x=>!x.collected).map(gate=>({gate,d:distance(g.player,gate)})).sort((a,b)=>a.d-b.d)[0];
    if(!near)return null;
    const {gate,d}=near;
    if(d>5){
      let line='CONCH reveals signals through walls. PLAN locates them in the same city.';
      if(g.pulseUntil>now){const a=Math.atan2(gate.y-g.player.y,gate.x-g.player.x)-g.player.direction;const bearing=Math.atan2(Math.sin(a),Math.cos(a));line=`${gate.glyph} ${gate.name} · ${Math.abs(bearing)<.22?'AHEAD':bearing<0?'TURN LEFT':'TURN RIGHT'} · ${d.toFixed(1)} units. Walls still block passage.`}
      return{title:'LISTEN · FIND A SIGNAL',line,phase:g.pulseUntil>now?'signal':'seek',tool:'conch',progress:0};
    }
    let line=gate.instruction,tool=null,phase='approach';
    if(gate.name==='TRUTH'){line=d>1.18?'Come closer, then release every control.':`Release every control. Hold still for ${(g.law.figure.truthHoldMs/1000).toFixed(1)} seconds.`;phase=d>1.18?'approach':'hold'}
    else if(gate.name==='MEASURE'){const f=g.law.figure;line=d<f.measureMin?'Too close. Step back into the distance band.':d>f.measureMax?'Too far. Step closer into the distance band.':`Stay here for ${(f.measureHoldMs/1000).toFixed(1)} seconds.`;line+=` ${d.toFixed(1)} / ${f.measureMin.toFixed(1)}–${f.measureMax.toFixed(1)} units.`;phase=d>=f.measureMin&&d<=f.measureMax?'hold':'approach'}
    else if(gate.name==='RETRIEVAL'){
      tool='w8';
      if(!g.anchor)line=d<=1.45?'W8: mark this coordinate. Walk at least 3.1 units away, then W8 again.':'Come within 1.45 units before marking with W8.';
      else if(!g.retrievalArmed)line='W8: recover and release your old mark. Then mark this Gate.';
      else if(!g.retrievalDeparted)line=`The mark holds. Walk away: ${distance(g.player,g.anchor).toFixed(1)} / 3.1 units.`;
      else line='W8: recover the marked coordinate. The anchor releases after retrieval.';
    }
    else if(gate.name==='RESILIENCE'){line=gate.relocated?`Find ${gate.token} again. Its coordinate changed; its identity did not.`:`Approach ${gate.token}. Watch what survives when the coordinate fails.`}
    else if(gate.name==='TRANSFER'){
      tool=g.law.transferTool;const proved=g.proofs.some(p=>p.gate===PRIMARY[tool]);
      line=proved?`Reuse ${tool.toUpperCase()} here. Same operator, second context.`:`First prove ${PRIMARY[tool]}. Then reuse ${tool.toUpperCase()} here.`;
      phase=proved?'ready':'blocked';
    }
    else{
      tool=gate.method;phase=d<=2.25?'ready':'approach';
      if(d>2.25)line='Come closer. The signal is not yet in tool range.';
      else if(tool==='keris')line=now<g.kerisReadyAt?'The edge is reforming.':hit?.cell>0&&hit.cell<9&&hit.distance<1.35?'KERIS: cut the wall you are facing.':'Face a nearby interior wall, then KERIS. Empty air makes no proof.';
    }
    return{title:`${gate.glyph} ${gate.name} / ${gate.token}`,line,tool,phase,progress:gate.progress||0,gate:gate.name,distance:d};
  }
  function wallSample(law,hit,v,phase=0){
    const seed=(law.seed^(hit.mapX*73856093)^(hit.mapY*19349663))>>>0;
    const warp=Math.floor(hit.texture*24),weft=Math.floor(v*24);
    const crossed=(warp+weft+(seed%7))%5===0;
    const glyph=law.wallAlphabet[(warp+weft*3+seed)%law.wallAlphabet.length]||'·';
    const wave=Math.sin(hit.texture*70+v*53+seed%31+phase);
    return{glyph:crossed?glyph:(wave>.25?'╱':'╲'),ink:crossed?'source':'weave',alpha:clamp(.25+wave*.17+(crossed?.35:0),.08,.9)};
  }
  function validGhost(x,key,size=27){
    return !!x && x.worldKey===key && x.schema==='sleeper.native-route-trace/v0.1' && x.authority==='EVIDENCE_ONLY' && Array.isArray(x.path) && x.path.length>0 && x.path.length<=100000 && x.path.every(p=>Array.isArray(p)&&p.length===2&&p.every(n=>Number.isFinite(n)&&n>=0&&n<size)) && Array.isArray(x.events) && x.events.length<=100000 && x.events.every(e=>e&&Number.isFinite(e.t)&&e.t>=0&&Number.isFinite(e.step)&&e.step>=0&&typeof e.type==='string') && x.measures && Number.isFinite(x.measures.elapsedMs) && x.measures.elapsedMs>=0;
  }
  const xml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  function wovenTraceSVG(g){
    const side=648,cell=side/g.size,left=36,top=126;
    const p=(x,y)=>`${(left+x*cell).toFixed(2)},${(top+y*cell).toFixed(2)}`;
    const marks=[];
    for(let y=0;y<g.size;y++)for(let x=0;x<g.size;x++)if(g.grid[y][x]>0){
      const v=g.grid[y][x],char=g.sourceChars[(x*13+y*7)%g.sourceChars.length]||'·';
      marks.push(`<text x="${left+(x+.5)*cell}" y="${top+(y+.64)*cell}" fill="${v===9?'#857967':'#534c40'}">${xml(char)}</text>`);
    }
    const route=g.path.map(q=>p(q.x,q.y)).join(' ');
    const gates=g.gates.map(q=>`<text x="${left+q.x*cell}" y="${top+q.y*cell}" fill="${q.collected?'#f4cb7e':q.color}">${xml(q.glyph)}</text>`).join('');
    const tokens=g.proofs.map(q=>xml(q.token)).join(' · ');
    return`<svg xmlns="http://www.w3.org/2000/svg" width="720" height="900" viewBox="0 0 720 900"><title>Sleeper woven route ${xml(g.law.key)}</title><desc>Derived drawing of the current city and observed route. Evidence only; not Gate proof.</desc><rect width="720" height="900" fill="#080b0d"/><g font-family="monospace" fill="#e8ddc4"><text x="36" y="42" font-size="14">SLEEPER // ${xml(g.law.key)} / ${g.gateCount} OF 8 PROOFS</text><foreignObject x="36" y="62" width="648" height="52"><div xmlns="http://www.w3.org/1999/xhtml" style="font:14px monospace;color:#e8ddc4;overflow-wrap:anywhere">${xml(g.law.source)}</div></foreignObject><g font-size="18" text-anchor="middle">${marks.join('')}<polyline points="${route}" fill="none" stroke="#d78556" stroke-width="2" stroke-linecap="square"/>${gates}<text x="${left+g.start.x*cell}" y="${top+g.start.y*cell}" fill="#7cb7bf">回</text></g><text x="36" y="820" font-size="12">${tokens}</text><text x="36" y="849" font-size="11" fill="#a29984">${g.steps} STEPS · ${g.proofs.length} ENACTED PROOFS · ROUTE / EVIDENCE ONLY</text><text x="36" y="873" font-size="10" fill="#7c7467">SAME GRID · SOURCE LETTERS · ACTUAL CUTS · ACTUAL PATH · /sleeper/</text></g></svg>`;
  }
  return Object.freeze({aperture,wallSample,wovenTraceSVG,validGhost});
});
