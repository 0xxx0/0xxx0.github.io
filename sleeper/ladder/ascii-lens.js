/* LADDER / ASCII: a second projection of the SAME native field and source.
   It never invents gates, spends breath, changes source text, or persists an interpretation.
   Body: native L.step; address: C.readDerived; reader: source excerpt + Threadwalk.
   A playground for the user's prefered text-first view, not a second maze. */
(function () {
  'use strict';
  const L=window.SleeperLadder, C=window.SleeperLadderCore;
  if(!L||!C) return;
  let src=null, open=false, scale=2, wordIndex=0, words=[], timer=0, wpm=260, error='';
  const labels=['GLYPH','WORD','PASSAGE','FIELD'];
  const originalFocus=document.activeElement;
  const css=document.createElement('style');
  css.textContent=[
    '#asciiLaunch{position:fixed;top:max(9px,env(safe-area-inset-top));right:9px;z-index:35;font:11px/1.2 ui-monospace,monospace;padding:10px 12px;border:1px solid #87989b;background:#09121a;color:#e5e4cf;cursor:pointer}',
    '#asciiLaunch:focus-visible,#asciiLens button:focus-visible,#asciiLens input:focus-visible,#asciiLens a:focus-visible{outline:2px solid #e2ce8a;outline-offset:2px}',
    '#asciiLens{position:fixed;inset:0;z-index:3000;overflow-y:auto;overscroll-behavior:contain;background:#080c12;color:#dfdfd3;font:13px/1.42 ui-monospace,SFMono-Regular,Consolas,monospace;padding:12px max(12px,env(safe-area-inset-left)) calc(18px + env(safe-area-inset-bottom))}',
    '#asciiLens[hidden]{display:none!important}',
    '#asciiLens *{box-sizing:border-box}',
    '#asciiLens button{border:1px solid #54636b;background:#101e28;color:#e9eadb;min-height:42px;padding:7px 10px;font:inherit;cursor:pointer;border-radius:2px}',
    '#asciiLens button[disabled]{opacity:.45}',
    '#asciiLens header{display:flex;justify-content:space-between;align-items:center;gap:8px;max-width:760px;margin:0 auto 10px}',
    '#asciiLens .aside{color:#aebbc1;font-size:11px;letter-spacing:.04em}',
    '#asciiLens .body{max-width:760px;margin:0 auto;display:grid;grid-template-columns:minmax(0,1fr);gap:9px}',
    '#asciiLens .cell{border:1px solid #30404b;padding:10px 12px;min-width:0}',
    '#asciiLens .kicker{color:#c1c9c5;font-size:11px;letter-spacing:.06em}',
    '#asciiLens .map{margin:12px auto 4px;width:max-content;max-width:100%;overflow:auto;font:clamp(12px,3.15vw,17px)/1.19 ui-monospace,monospace;white-space:pre;letter-spacing:.15em;color:#c6d0cb}',
    '#asciiLens .legend{font-size:11px;color:#a5b4b6}',
    '#asciiLens .compass{display:grid;grid-template-columns:repeat(3,1fr);width:min(100%,280px);gap:5px;margin:8px auto}',
    '#asciiLens .compass button{min-height:42px}',
    '#asciiLens .focus{font-size:clamp(23px,5vw,34px);min-height:52px;line-height:1.3;word-break:break-word;color:#f2e6bf;margin:14px 0}',
    '#asciiLens .passage{font:17px/1.55 Georgia,serif;color:#e4e7dc;white-space:pre-wrap;overflow-wrap:anywhere;margin:12px 0}',
    '#asciiLens .controls{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:8px 0}',
    '#asciiLens .controls input{flex:1;min-width:65px;accent-color:#e4c785;min-height:34px}',
    '#asciiLens .ring{display:inline-grid;place-items:center;border:1px solid #8a9b9e;border-radius:50%;height:34px;width:34px;font-size:11px}',
    '#asciiLens .address{overflow-wrap:anywhere;color:#a9b9bd;font-size:11px}',
    '#asciiLens .sourceLink{color:#e4d6af;text-decoration:underline;text-underline-offset:3px}',
    '#asciiLens .revisit{border-left:2px solid #d5bd81;padding-left:10px;font:15px/1.4 Georgia,serif}',
    '@media(min-width:720px){#asciiLens .body{grid-template-columns:minmax(290px,1fr) minmax(300px,1fr)}#asciiLens .map{font-size:16px}}',
    '@media(prefers-reduced-motion:reduce){#asciiLens *{scroll-behavior:auto!important}}'
  ].join('');
  document.head.append(css);
  const launch=document.createElement('button');
  launch.id='asciiLaunch';launch.type='button';launch.textContent='ASCII / WALK';
  launch.hidden=true;
  launch.setAttribute('aria-label','Open the readable ASCII labyrinth, using the same LADDER city');
  document.body.append(launch);
  const root=document.createElement('section');
  root.id='asciiLens';root.hidden=true;root.setAttribute('aria-label','LADDER ASCII labyrinth');
  root.innerHTML=[
    '<header><div><b>LADDER / ASCII</b><div class="aside">ONE CITY · TWO WAYS OF SEEING</div></div><button id="laClose" type="button">PAINTING ↗</button></header>',
    '<div class="body">',
    '<section class="cell"><div class="kicker" id="laStatus">LOADING SOURCE…</div><pre class="map" id="laMap" aria-label="Local walkable field"></pre>',
    '<div class="legend">@ YOU · # WALL · 1–8 PATH GATES · : YOUR ROUTE · other characters = source material</div>',
    '<div class="compass"><span></span><button data-dir="U" aria-label="Walk north">↑</button><span></span>',
    '<button data-dir="L" aria-label="Walk west">←</button><button data-dir="D" aria-label="Walk south">↓</button><button data-dir="R" aria-label="Walk east">→</button></div>',
    '<div class="aside" id="laNotice">Walk with arrows or swipe. Walls are painting edges; a step spends native breath.</div>',
    '<div class="aside" id="laGate"></div></section>',
    '<section class="cell"><div class="kicker" id="laLocator">SOURCE / LOCATION</div><div class="controls">',
    '<button id="laOut" type="button" aria-label="Widen aperture">−</button><strong id="laScale">PASSAGE</strong>',
    '<button id="laIn" type="button" aria-label="Narrow aperture">+</button><span class="aside">AXIS / SCALE</span></div>',
    '<div class="focus" id="laFocus" aria-live="off"></div><div class="passage" id="laPassage"></div>',
    '<div class="controls"><span class="ring" id="laRing" aria-label="Word position">0</span>',
    '<button id="laPlay" type="button">▶ RSVP</button><button id="laSpeed" type="button">260 WPM</button></div>',
    '<div class="controls"><input id="laScrub" type="range" min="0" max="0" value="0" aria-label="Scrub word position in source excerpt"></div>',
    '<div class="address" id="laAddress"></div><div class="controls"><button id="laThread" type="button">READ THIS CELL / THREADWALK ↗</button>',
    '<a id="laSource" class="sourceLink" target="_blank" rel="noopener noreferrer">SOURCE ↗</a></div>',
    '<div class="revisit" id="laRevisit" hidden>Returned to a district. What changed: the words, or what you noticed?</div>',
    '<p class="aside">Excerpts are the published, abridged LADDER selection—not complete Buddhadhamma. Your position and breath belong to the existing city. Reading is not a Gate proof.</p>',
    '</section></div>'
  ].join('');
  document.body.append(root);
  const $=id=>root.querySelector('#'+id);
  function stop(){if(timer){clearInterval(timer);timer=0;} $('laPlay').textContent='▶ RSVP';}
  function wordSplit(s) {
    if(typeof Intl!=='undefined'&&Intl.Segmenter){
      return [...new Intl.Segmenter(undefined,{granularity:'word'}).segment(s)].filter(x=>x.isWordLike).map(x=>x.segment);
    }
    return String(s).match(/[\p{L}\p{N}][\p{L}\p{M}\p{N}\-’]*/gu)||[];
  }
  function sourcePage(d){
    if(!src||!d)return null;
    const page=(src.provenance.pages||[]).find(x=>d.slug&&x.includes('/'+d.slug+'.html'));
    return page||src.provenance.source_url||null;
  }
  function visits(st) {
    const out=new Map();
    if(!st.walker) return out;
    let x=st.walker.x,y=st.walker.y;
    out.set(y*96+x,1);
    const delta={U:[0,1],D:[0,-1],L:[1,0],R:[-1,0]};
    for(let i=st.moves.length-1;i>=0;i--){
      const p=delta[st.moves[i]];
      if(!p)continue;
      x+=p[0];y+=p[1];const n=y*96+x;
      out.set(n,(out.get(n)||0)+1);
    }
    return out;
  }
  function textAt(st){
    if(!src||!st.walker)return null;
    const n=st.walker.y*96+st.walker.x;
    const u=src.units[n],d=src.districts[u.p];
    return {n,u,d};
  }
  function drawMap(st){
    const x=st.walker.x,y=st.walker.y,gates=new Map(st.gates.map(g=>[g.y*96+g.x,g]));
    const seen=visits(st),w=21,h=11,ox=Math.max(0,Math.min(96-w,x-Math.floor(w/2))),oy=Math.max(0,Math.min(32-h,y-Math.floor(h/2)));
    const rows=[];
    for(let j=0;j<h;j++){
      let row='';
      for(let i=0;i<w;i++){
        const nx=ox+i,ny=oy+j,n=ny*96+nx,gate=gates.get(n);
        const unit=src.units[n];
        // LADDER is authoritative for painted walls; material is the exact
        // shipped text projection at the same cell index.
        let ch=L.walls(n)?'#':(unit.ch===' '?'·':unit.ch);
        if(seen.has(n)&&!L.walls(n))ch=':';
        if(gate)ch=gate.lit?'o':String(gate.i+1);
        if(nx===x&&ny===y)ch='@';
        // One character per cell; do not inject unverified script glyphs.
        row+=Array.from(ch)[0]||'·';
      }
      rows.push(row);
    }
    $('laMap').textContent=rows.join('\n');
    $('laStatus').textContent='WALK '+st.moves.length+' STEPS · BREATH '+st.breath+'/'+st.breathMax+' · '+st.lit+'/8 PATH GATES';
  }
  function passageLine(){
    const st=L.state(),t=textAt(st);
    return t&&t.d&&t.d.line||'';
  }
  function position(i){
    wordIndex=Math.max(0,Math.min(words.length-1,Number(i)||0));
    $('laScrub').value=wordIndex;
    $('laRing').textContent=words.length?Math.round((wordIndex+1)/words.length*100)+'%':'0%';
    $('laRing').style.borderColor=words.length?'#d9be83':'#8a9b9e';
    // The focus remains addressable regardless of autoplay.
    $('laFocus').textContent=words[wordIndex]||'—';
    $('laScrub').setAttribute('aria-valuetext',(wordIndex+1)+' of '+words.length+' words: '+(words[wordIndex]||''));
  }
  function tick(){if(wordIndex+1>=words.length){stop();return;}position(wordIndex+1);}
  function play(){
    if(timer){stop();return;}
    if(!words.length)return;
    $('laPlay').textContent='❚❚ PAUSE';
    timer=setInterval(tick,Math.round(60000/wpm));
  }
  let lastDistrict=-1,lastLine='';
  function render(){
    if(!open)return;
    const st=L.state();
    if(!src||!st.ready||!st.walker){$('laNotice').textContent=error||'Original source or painting unavailable; no substitute city.';return;}
    drawMap(st);
    const t=textAt(st);if(!t)return;
    const {u,d,n}=t;
    const line=d.line||'';
    const changed=lastDistrict!==u.p||lastLine!==line;
    if(changed){stop();words=wordSplit(line);wordIndex=0;lastDistrict=u.p;lastLine=line;$('laScrub').max=Math.max(0,words.length-1);$('laScrub').value=0;}
    const same=Array.from(src.units).filter(v=>v.p===u.p&&v.s===u.s&&v.w===u.w).map(v=>v.ch).join('');
    $('laScale').textContent=labels[scale];
    $('laLocator').textContent=(d.heading||'DISTRICT')+' · '+(d.locator||'');
    $('laPassage').textContent=line;
    $('laAddress').textContent='SOURCE sha256:'+(st.source&&st.source.sha256||'?').slice(0,16)+'… · paragraph '+u.p+' · sentence '+u.s+' · word '+u.w+' · cell '+n+' · '+Math.round((L.head()?.t||0)*100)+'% of this district';
    const page=sourcePage(d);
    if(page){$('laSource').href=page;$('laSource').hidden=false;}else $('laSource').hidden=true;
    const g=st.gates.find(v=>v.x===st.walker.x&&v.y===st.walker.y);
    const fl=g&&L.factor(g.i);
    const inDistrict=st.gates.find(v=>v.p===u.p);
    const factor=inDistrict&&L.factor(inDistrict.i);
    $('laGate').textContent=fl?(fl.en+' / '+fl.pali+' · '+(g.lit?'completed':'native Gate, not a reading score')):(factor?'District contains '+factor.en+' / '+factor.pali:'No Gate at this cell');
    const visitsNow=visits(st);
    const count=Array.from(visitsNow.entries()).filter(([cell])=>src.units[cell]&&src.units[cell].p===u.p).reduce((sum,[,v])=>sum+v,0);
    $('laRevisit').hidden=count<3;
    if(scale===0)$('laFocus').textContent=u.ch||'·';
    else if(scale===1)$('laFocus').textContent=same||u.ch||'·';
    else if(scale===2)position(wordIndex);
    else $('laFocus').textContent=d.heading||d.locator||'FIELD';
    $('laNotice').textContent=st.ended?'Native breath ended. PAINTING returns to the unchanged host; no extra life invented.':'Move through the source. Tap RSVP to read the excerpt. −/+ changes attention scale, not your address.';
  }
  async function activate(){
    if(open)return;
    open=true;root.hidden=false;launch.hidden=true;
    try{
      await L.ready;
      const resp=await fetch(C.SOURCE_PATH,{cache:'no-cache'});
      if(!resp.ok)throw new Error('HTTP '+resp.status);
      src=C.readDerived(await resp.json());
      if(L.state().source?.sha256!==src.sha256)throw new Error('source revision mismatch; refusing the projection');
      if(L.state().distance==='FAR')L.setDistance('NEAR');
      if(L.state().distance==='NEAR')L.setDistance('ENTERED');
      lastDistrict=-1;render();$('laClose').focus();
    }catch(e){error='SOURCE GAP: '+e.message;$('laNotice').textContent=error;}
  }
  function deactivate(){
    stop();open=false;root.hidden=true;launch.hidden=true;
  }
  function move(dir){
    stop();if(!open||!src)return;
    L.step(dir);render();
  }
  launch.addEventListener('click',activate);
  $('laClose').addEventListener('click',deactivate);
  root.querySelectorAll('[data-dir]').forEach(btn=>btn.addEventListener('click',()=>move(btn.dataset.dir)));
  $('laOut').addEventListener('click',()=>{scale=Math.min(labels.length-1,scale+1);render();});
  $('laIn').addEventListener('click',()=>{scale=Math.max(0,scale-1);render();});
  $('laPlay').addEventListener('click',play);
  $('laSpeed').addEventListener('click',()=>{wpm=wpm===260?320:wpm===320?180:260;$('laSpeed').textContent=wpm+' WPM';if(timer){stop();play();}});
  $('laScrub').addEventListener('input',e=>{stop();position(e.target.value);});
  $('laThread').addEventListener('click',()=>{
    const st=L.state(),at=textAt(st);
    if(!src||!at||st.source?.sha256!==src.sha256){
      $('laNotice').textContent='SOURCE ADDRESS UNAVAILABLE · the current cell is not sealed';return;
    }
    // Only an exact address in the published slice; never a full-book quote.
    const address={cell:at.n,paragraph:at.u.p,sentence:at.u.s,word:at.u.w,sourceSha256:src.sha256};
    const opened=window.SleeperLadderRead?.openAtAddress?.(address);
    if(opened)deactivate();
    else $('laNotice').textContent='READING APERTURE UNAVAILABLE · no other passage substituted';
  });
  window.addEventListener('keydown',e=>{
    if(!open)return;
    if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();deactivate();return;}
    const dir={ArrowUp:'U',ArrowDown:'D',ArrowLeft:'L',ArrowRight:'R',w:'U',a:'L',s:'D',d:'R'}[e.key];
    if(dir){e.preventDefault();e.stopImmediatePropagation();move(dir);}
    else if(e.key===' '&&document.activeElement?.tagName!=='BUTTON'){e.preventDefault();e.stopImmediatePropagation();play();}
  },true);
  let touch=null;
  $('laMap').addEventListener('touchstart',e=>{if(e.touches.length===1)touch={x:e.touches[0].clientX,y:e.touches[0].clientY};},{passive:true});
  $('laMap').addEventListener('touchend',e=>{
    if(!touch||!e.changedTouches.length)return;
    const dx=e.changedTouches[0].clientX-touch.x,dy=e.changedTouches[0].clientY-touch.y;touch=null;
    if(Math.max(Math.abs(dx),Math.abs(dy))<24)return;
    move(Math.abs(dx)>Math.abs(dy)?(dx>0?'R':'L'):(dy>0?'D':'U'));
  },{passive:true});
  window.LadderAsciiLens=Object.freeze({
    open:activate,close:deactivate,
    state:()=>({open,scale:labels[scale],wordIndex,wpm,source:src?.sha256||null,native:L.state()})
  });
  if(new URLSearchParams(location.search).get('labyrinth')==='1')activate();
})();