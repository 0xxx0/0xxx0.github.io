import {audioGlyphRepresentation} from '../listen/audio-glyph.js';
import {harmonicEvidence} from './harmonic-evidence.js';
import {ringPosition,ringMarker,boundedTime,sameSource} from './ring-address.js';

// Two native hosts, one view port. This owns *visibility only*, never sound, playback,
// source bytes, native releases, or analysis. Same-origin child APIs keep native authority.
export function mountMediaPortal({onStatus=()=>{},onTrace=()=>{}}={}){
  const style=document.createElement('style');style.id='fieldLabMediaPortalStyle';
  style.textContent=`
  .labMediaPortal[hidden],.labMediaViewport[hidden],.labMediaActions[hidden]{display:none!important}
  .labMediaPortal{position:fixed;inset:0;z-index:9000;background:#05070b;color:#e9f1f5;display:grid;grid-template-rows:auto minmax(0,1fr) auto;font:11px/1.4 ui-monospace,SFMono-Regular,monospace}
  .labMediaBar{min-height:48px;padding:calc(env(safe-area-inset-top) + 5px) 8px 5px;display:flex;align-items:center;gap:6px;border-bottom:1px solid #35444d;background:#070d12}
  .labMediaBar button,.labMediaBar a,.labMediaFooter button{min-height:37px;display:inline-flex;align-items:center;justify-content:center;gap:5px;border:1px solid #31404a;background:#0a1218;color:#dfebef;padding:7px 9px;text-decoration:none;font:800 10px ui-monospace,monospace;cursor:pointer}
  .labMediaBar button[aria-pressed="true"]{background:#e0eef2;color:#071018;border-color:#e0eef2}
  .labMediaBar .labMediaExit{border-color:#e2b777;color:#e2b777}
  .labMediaBar .labMediaOriginal{margin-left:auto;font-size:9px}
  .labMediaViewport{min-height:0;position:relative;background:#05070b}
  .labMediaViewport iframe{border:0;width:100%;height:100%;display:block;background:#05070b}
  .labMediaFooter{background:#081016;border-top:1px solid #35444d;padding:5px 7px calc(env(safe-area-inset-bottom) + 5px);min-height:59px;display:flex;gap:8px;align-items:center}
  .labMediaGlyph{width:52px;height:52px;flex:0 0 52px;padding:0;border:1px solid #41535d;background:#05070b;display:grid;place-items:center;cursor:pointer}
  .labMediaGlyph svg{width:100%;height:100%}
  .labMediaGlyph:disabled{opacity:.35;cursor:default}
  .labRingPanel[hidden]{display:none!important}
  .labRingPanel{position:absolute;inset:0;z-index:4;display:flex;align-items:center;justify-content:center;padding:12px;background:#05070bf5}
  .labRingCard{width:min(100%,340px);display:grid;gap:9px;border:1px solid #617b87;background:#09131b;padding:12px;box-shadow:0 16px 45px #0009}
  .labRingTop,.labRingTools{display:flex;justify-content:space-between;align-items:center;gap:6px}
  .labRingTop b{letter-spacing:.08em;font-size:12px}
  .labRingTop button,.labRingTools button{background:#0d1c25;color:#eef3ef;border:1px solid #405460;min-height:42px;padding:8px;cursor:pointer}
  .labRingFace{position:relative;width:min(100%,260px);aspect-ratio:1;justify-self:center;background:#05070b;border:1px solid #405460;padding:0;touch-action:none;cursor:crosshair}
  .labRingFace>svg,.labRingFace .labRingSvg,.labRingSvg svg{display:block;width:100%;height:100%}
  .labRingMarker{position:absolute;inset:0;pointer-events:none}
  .labRingMarker circle{fill:#e5bc78;stroke:#071018;stroke-width:1.2}
  .labRingAddress{font:800 13px ui-monospace,monospace;color:#f1d197;text-align:center}
  .labRingNote{font-size:10px;color:#92aab6;text-align:center}
  .labRingTools button{flex:1}
  .labRingTools [data-portal="ringRide"]{background:#e4bd82;color:#071018;border-color:#e4bd82}
  .labMediaDetail{flex:1;min-width:0;display:grid;gap:3px}
  .labMediaTitle{font-size:10px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .labMediaSub{font-size:9px;color:#92a7b3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .labMediaActions{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}
  .labMediaActions button{min-width:45px}
  .labMediaActions button:disabled{opacity:.35}
  .labMediaActions .labMediaPrimary{color:#061018;background:#e2bb7d;border-color:#e2bb7d}
  #labGlyphDoor{display:inline-flex;align-items:center;gap:6px;min-height:42px;text-align:left}
  #labGlyphDoor .labInlineGlyph{width:32px;height:32px;display:block}
  #labGlyphDoor svg{width:100%;height:100%}
  @media(max-width:660px){.labMediaBar{gap:4px}.labMediaBar button,.labMediaBar a{padding:5px;font-size:9px}.labMediaFooter{align-items:start}.labMediaDetail{padding-top:3px}.labMediaActions{gap:3px}.labMediaActions button{font-size:9px;padding:5px;min-height:38px}.labMediaGlyph{width:44px;height:44px;flex-basis:44px}}
  `;
  document.head.appendChild(style);
  const shell=document.createElement('section');
  shell.id='labMediaPortal';shell.className='labMediaPortal';shell.hidden=true;
  shell.setAttribute('aria-label','Native FIELD LAB media instrument');
  shell.innerHTML=`
    <header class="labMediaBar">
      <button class="labMediaExit" data-portal="close" type="button">↩ LAB</button>
      <button data-portal="ride" type="button" aria-pressed="false">RIDE</button>
      <button data-portal="listen" type="button" aria-pressed="false">LISTEN</button>
      <a class="labMediaOriginal" data-portal="original" href="../live/" target="_blank" rel="noopener">FULL ↗</a>
    </header>
    <div class="labMediaViewport" data-frame="ride" hidden></div>
    <div class="labMediaViewport" data-frame="listen" hidden></div>
    <footer class="labMediaFooter">
      <button class="labMediaGlyph" data-portal="glyph" type="button" aria-label="Open LISTEN source glyph" disabled>◇</button>
      <div class="labMediaDetail" aria-live="polite">
        <div class="labMediaTitle" data-portal="title">NATIVE SOURCE</div>
        <div class="labMediaSub" data-portal="detail">OPEN LISTEN TO BIND AUDIO</div>
      </div>
      <div class="labMediaActions" data-actions="listen" hidden>
        <button type="button" class="labMediaPrimary" data-portal="carry" disabled>RIDE THIS ↗</button>
      </div>
      <div class="labMediaActions" data-actions="ride" hidden>
        <button type="button" data-portal="left">←</button>
        <button type="button" data-portal="right">→</button>
        <button type="button" class="labMediaPrimary" data-portal="release">RELEASE</button>
        <button type="button" data-portal="returnSource">↩ SOURCE</button>
      </div>
    </footer>
    <div class="labRingPanel" data-portal="ringPanel" hidden role="dialog" aria-label="Addressed audio ring">
      <div class="labRingCard">
        <div class="labRingTop"><b>ONE SOURCE · 24 ADDRESSES</b><button type="button" data-portal="ringClose">CLOSE ×</button></div>
        <button type="button" class="labRingFace" data-portal="ringFace" aria-label="Turn the source ring to seek audio" disabled>
          <span class="labRingSvg" data-portal="ringSvg">◇</span>
          <svg class="labRingMarker" viewBox="0 0 100 100" aria-hidden="true"><circle data-portal="ringDot" cx="50" cy="5" r="2.3"/></svg>
        </button>
        <div class="labRingAddress" data-portal="ringAddress">NO SOURCE</div>
        <div class="labRingNote" data-portal="ringNote">Load audio in LISTEN to turn this into a temporal address</div>
        <div class="labRingTools"><button data-portal="ringPrev" type="button">← 1/24</button><button data-portal="ringNext" type="button">1/24 →</button><button data-portal="ringMark" type="button">MARK</button><button data-portal="ringRide" type="button">RIDE</button></div>
      </div>
    </div>`;
  document.body.appendChild(shell);
  const $=s=>shell.querySelector(s),inline=document.getElementById('labGlyphDoor');
  const ports={ride:null,listen:null};let active=null,ticker=0,sourceHash=null,lastGlyph='',notice=null,carryBusy=false;
  const api=type=>{try{return ports[type]?.contentWindow?.[type==='ride'?'FoldBloomLive':'FoldBloomListen']||null}catch(_){return null}};
  const pause=type=>{try{ports[type]?.contentDocument?.querySelector(type==='ride'?'#trackAudio':'#audio')?.pause()}catch(_){}};
  function create(type){
    if(ports[type])return ports[type];
    const f=document.createElement('iframe');
    f.title=type==='ride'?'Native Fold Bloom playable ride':'Native Fold Bloom Listen';
    f.allow='autoplay';f.loading='eager';
    f.src=type==='ride'?'../live/?demo=1':'../listen/';
    $('[data-frame="'+type+'"]').appendChild(f);ports[type]=f;
    f.addEventListener('load',()=>{if(active===type)refresh()});
    return f;
  }
  function announce(message){notice={text:String(message),until:performance.now()+3500};$('[data-portal="detail"]').textContent=message;onStatus(message)}
  function trace(kind){onTrace(kind)}
  function close(){
    if(!active)return;
    pause('ride');pause('listen');active=null;shell.hidden=true;closeRing();clearInterval(ticker);ticker=0;
    document.documentElement.dataset.fieldLabMedia='closed';trace('MEDIA_RETURN');
    onStatus('FIELD LAB · NATIVE HOSTS HELD · RETURN');
  }
  function open(type){
    if(type!=='ride'&&type!=='listen')return false;
    if(active&&active!==type)pause(active);
    closeRing();active=type;create(type);shell.hidden=false;
    document.documentElement.dataset.fieldLabMedia=type;
    for(const name of ['ride','listen']){
      $('[data-frame="'+name+'"]').hidden=name!==type;
      $('[data-actions="'+name+'"]').hidden=name!==type;
      $('[data-portal="'+name+'"]').setAttribute('aria-pressed',String(name===type));
    }
    $('[data-portal="original"]').href=type==='ride'?'../live/':'../listen/';
    clearInterval(ticker);ticker=setInterval(refresh,550);refresh();trace('MEDIA_'+type.toUpperCase());
    return true;
  }
  function setGlyph(glyph,hash){
    if(!glyph||!hash)return;
    const rep=audioGlyphRepresentation(glyph,hash);
    if(!rep)return;
    const key=String(hash)+'|'+glyph.rotation+'|'+glyph.radial.join(',');
    if(key===lastGlyph)return;
    lastGlyph=key;
    for(const target of [$('[data-portal="glyph"]'),inline?.querySelector('.labInlineGlyph'),$('[data-portal="ringSvg"]')]){
      if(target)target.innerHTML=rep.svg;
    }
    const glyphBtn=$('[data-portal="glyph"]');
    glyphBtn.disabled=false;$('[data-portal="ringFace"]').disabled=false;
    glyphBtn.title='TURN SOURCE RING · '+String(hash).slice(0,12);
    sourceHash=hash;
  }
  function closeRing(){
    $('[data-portal="ringPanel"]').hidden=true;
    return true;
  }
  function ringState(){
    const listen=api('listen'),s=listen?.state?.(),m=s?.fileMeta;
    if(s?.sourceLoading||!m?.hash||!sameSource(m.hash,sourceHash))return null;
    const duration=Number(s.map?.duration)||0;
    if(!(duration>0))return null;
    return {listen,state:s,hash:m.hash,duration,rotation:Number(s.glyph?.rotation)||0};
  }
  function syncRing(){
    const v=ringState(),address=$('[data-portal="ringAddress"]'),
      note=$('[data-portal="ringNote"]');
    for(const name of ['ringPrev','ringNext','ringMark','ringRide'])
      $('[data-portal="'+name+'"]').disabled=!v;
    if(!v){address.textContent='NO ADDRESSED SOURCE';note.textContent='Load audio in LISTEN';return}
    const time=boundedTime(v.state.time,v.duration)||0,p=ringMarker({
      time,duration:v.duration,rotation:v.rotation});
    if(p){$('[data-portal="ringDot"]').setAttribute('cx',p.x.toFixed(3));
      $('[data-portal="ringDot"]').setAttribute('cy',p.y.toFixed(3))}
    const fmt=t=>Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');
    address.textContent=fmt(time)+' / '+fmt(v.duration)+' · '+Math.floor(time/v.duration*24+1).toString().padStart(2,'0')+'/24';
    const ev=harmonicEvidence(v.state.map);
    note.textContent=(v.state.stage==='AUDIO_ONLY'?'SOURCE-ONLY · NO MEASURED WAVEFORM':
      v.state.stage==='PREVIEW'?'PREVIEW ENERGY · TONALITY UNMEASURED':ev.label)+
      ' · TURN/ARROWS SEEK · MARK AUTHOR';
  }
  function openRing(){
    if(active!=='listen')open('listen');
    $('[data-portal="ringPanel"]').hidden=false;
    syncRing();$('[data-portal="ringFace"]').focus();
    trace('MEDIA_GLYPH_APERTURE');
    return true;
  }
  function ringSeek(time){
    const v=ringState();if(!v)return {ok:false,reason:'SOURCE_UNAVAILABLE'};
    const target=boundedTime(time,v.duration);
    if(target===null)return {ok:false,reason:'TIME_UNAVAILABLE'};
    v.listen.seek(target);
    const now=Number(v.listen.state?.()?.time);
    const ok=Number.isFinite(now)&&Math.abs(now-target)<.12;
    syncRing();
    if(ok)trace('MEDIA_GLYPH_SEEK');
    else announce('SOURCE SEEK PENDING · MEDIA TIME UNCONFIRMED');
    return {ok,requested:target,actual:now};
  }
  function ringStep(sign){
    const v=ringState();if(!v)return;
    const step=v.duration/24;
    ringSeek((Number(v.state.time)||0)+sign*step);
  }
  function refresh(){
    const listen=api('listen'),native=api('ride'),ls=listen?.state?.();
    if(ls?.fileMeta?.hash&&ls.glyph)setGlyph(ls.glyph,ls.fileMeta.hash);
    if(active==='listen'){
      const m=ls?.fileMeta,ev=harmonicEvidence(ls?.map);
      $('[data-portal="title"]').textContent=m?m.name||'BOUND AUDIO':'LISTEN · LOAD A SOURCE';
      $('[data-portal="detail"]').textContent=m?
        (ls.stage+' · '+ev.label+' · '+String(m.hash||'').slice(0,12)):
        'TRY DEMO · LOCAL, OR OPEN AN AUDIO FILE';
      $('[data-portal="carry"]').disabled=carryBusy||!!ls?.sourceLoading||!m?.hash||typeof listen?.sourceFile!=='function';
    }else if(active==='ride'){
      const s=native?.state?.(),count=s?.history?.length||0,src=s?.sourceMeta;
      $('[data-portal="title"]').textContent=src?.name||'RIDE · NATIVE LIVE';
      $('[data-portal="detail"]').textContent=native?
        ((src?.hash?'SOURCE '+src.hash.slice(0,12)+' · ':'FIELD COURSE · ')+
        count+' RELEASE'+(count===1?'':'S')+' · '+(s?.autopilot?'AUTOPILOT':'HUMAN CONTROL')):
        'LOADING NATIVE LIVE';
      const enabled=!!native;
      for(const verb of ['left','right','release','returnSource'])$('[data-portal="'+verb+'"]').disabled=!enabled;
    }
    if(!$('[data-portal="ringPanel"]').hidden)syncRing();
    if(notice&&performance.now()<notice.until)$('[data-portal="detail"]').textContent=notice.text;
  }
  async function carry(){
    if(carryBusy)return false;
    const listen=api('listen'),s=listen?.state?.(),expected=s?.fileMeta?.hash;
    if(s?.sourceLoading){announce('SOURCE STILL LOADING · WAIT FOR EXACT HASH');return false}
    if(!expected||typeof listen?.sourceFile!=='function'){
      announce('BIND AUDIO IN LISTEN FIRST');return false
    }
    const file=listen.sourceFile();
    if(!file){announce('SOURCE BYTES UNAVAILABLE · NOTHING TRANSFERRED');return false}
    const fromTime=boundedTime(s.time,s.map?.duration);
    carryBusy=true;$('[data-portal="carry"]').disabled=true;
    announce('BINDING EXACT AUDIO TO LIVE');pause('listen');open('ride');
    try{
      const native=await new Promise((resolve,reject)=>{
        const start=Date.now(),check=()=>{
          const a=api('ride');if(a?.loadFiles){resolve(a);return}
          if(Date.now()-start>12000){reject(Error('LIVE_BOOT_TIMEOUT'));return}
          setTimeout(check,100);
        };check();
      });
      // Same source is already present: preserve native authored release history.
      if(!sameSource(native.state?.()?.sourceMeta?.hash,expected)){
        await Promise.race([
          native.loadFiles([file],{retain:true,label:'LAB SOURCE → LIVE'}),
          new Promise((_,reject)=>setTimeout(()=>reject(Error('LIVE_BIND_TIMEOUT')),12000))
        ]);
      }
      const actual=native.state?.()?.sourceMeta?.hash;
      if(actual!==expected)throw Error('SOURCE_HASH_MISMATCH');
      const focus=fromTime===null?{ok:false,reason:'NO_LISTEN_DURATION'}:
        native.seekSourceTime?.({sourceHash:expected,time:fromTime})||
          {ok:false,reason:'NO_NATIVE_FOCUS_API'};
      const mapped=!!native.state?.()?.sourceMeta?.hash&&
        native.state?.()?.trackfieldSource!=='SOURCE_ONLY';
      document.documentElement.dataset.fieldLabCarry='matched';
      document.documentElement.dataset.fieldLabFocus=focus.ok?'matched':'unverified';
      announce('EXACT SOURCE MATCHED · '+expected.slice(0,12)+
        (focus.ok?' · SAME TIME':(' · FOCUS '+String(focus.reason||'UNVERIFIED')))+
        (native.state?.()?.layerMode==='SOURCE'?' · SOURCE VIEW':''));
      trace('MEDIA_SOURCE_MATCHED');refresh();return true;
    }catch(error){
      document.documentElement.dataset.fieldLabCarry='unverified';
      document.documentElement.dataset.fieldLabFocus='unverified';
      announce('SOURCE NOT VERIFIED · '+String(error?.message||error).slice(0,66));
      trace('MEDIA_SOURCE_UNVERIFIED');return false;
    }finally{carryBusy=false;refresh()}
  }
  function returnToSource(){
    const native=api('ride'),listen=api('listen');
    const cursor=native?.sourceCursor?.(),source=listen?.state?.();
    pause('ride');open('listen');
    if(!sameSource(cursor?.hash,source?.fileMeta?.hash)){
      announce('RETURN · DIFFERENT OR UNBOUND SOURCE · FOCUS UNCHANGED');
      return {ok:false,reason:'SOURCE_MISMATCH'};
    }
    if(!cursor?.ok){
      announce('RETURN · SOURCE MATCHED · MEDIA CLOCK UNAVAILABLE');
      return {ok:false,reason:'TIME_UNVERIFIED'};
    }
    const out=listen.seek?.(cursor.time),now=Number(listen.state?.()?.time);
    const ok=!!out&&Number.isFinite(now)&&Math.abs(now-cursor.time)<.12;
    document.documentElement.dataset.fieldLabReturnFocus=ok?'matched':'unverified';
    announce(ok?'RETURN · EXACT SOURCE AND POSITION RESTORED':
      'RETURN · SOURCE MATCHED · POSITION NOT CONFIRMED');
    trace(ok?'MEDIA_TIME_RETURN':'MEDIA_TIME_UNVERIFIED');
    return {ok,sourceHash:cursor.hash,time:cursor.time,returnedTime:now};
  }
  async function command(name){
    const native=api('ride');if(!native){announce('NATIVE LIVE NOT READY');return false}
    native.autopilot?.stop?.();
    if(name==='left'||name==='right'){
      native.step(name==='left'?-1:1);
      const s=native.state?.();announce('NATIVE '+name.toUpperCase()+' · '+(s?.history?.length||0)+' RELEASES');
    }else if(name==='release'){
      const before=native.state?.()?.history?.length||0;
      await native.release?.();
      const after=native.state?.()?.history?.length||0;
      announce(after>before?'NATIVE RELEASE '+after+' · RECORDED':'HOLD / ROTATE · RELEASE NOT YET LAWFUL');
      if(after>before)trace('MEDIA_NATIVE_RELEASE');
    }
    refresh();return true;
  }
  $('[data-portal="close"]').onclick=close;
  $('[data-portal="ride"]').onclick=()=>open('ride');
  $('[data-portal="listen"]').onclick=()=>active==='ride'?returnToSource():open('listen');
  $('[data-portal="returnSource"]').onclick=returnToSource;
  $('[data-portal="glyph"]').onclick=openRing;
  $('[data-portal="ringClose"]').onclick=closeRing;
  $('[data-portal="ringPrev"]').onclick=()=>ringStep(-1);
  $('[data-portal="ringNext"]').onclick=()=>ringStep(1);
  $('[data-portal="ringMark"]').onclick=()=>{closeRing();api('listen')?.openPin?.()};
  $('[data-portal="ringRide"]').onclick=()=>{closeRing();void carry()};
  $('[data-portal="ringFace"]').addEventListener('click',e=>{
    const s=ringState();if(!s)return;
    const rect=e.currentTarget.getBoundingClientRect();
    const addr=ringPosition({x:e.clientX,y:e.clientY,left:rect.left,top:rect.top,
      width:rect.width,height:rect.height,rotation:s.rotation,duration:s.duration});
    if(addr)ringSeek(addr.time);
  });
  $('[data-portal="ringFace"]').addEventListener('keydown',e=>{
    if(e.key==='ArrowLeft'||e.key==='ArrowDown'){e.preventDefault();ringStep(-1)}
    else if(e.key==='ArrowRight'||e.key==='ArrowUp'){e.preventDefault();ringStep(1)}
    else if(e.key==='Home'){e.preventDefault();ringSeek(0)}
    else if(e.key==='End'){e.preventDefault();const s=ringState();if(s)ringSeek(s.duration)}
  });
  $('[data-portal="carry"]').onclick=()=>{void carry()};
  for(const n of ['left','right','release'])$('[data-portal="'+n+'"]').onclick=()=>{void command(n)};
  inline?.addEventListener('click',openRing);
  document.addEventListener('keydown',e=>{if(!active||e.key!=='Escape')return;e.preventDefault();if(!$('[data-portal="ringPanel"]').hidden)closeRing();else close()});
  window.addEventListener('pagehide',()=>{clearInterval(ticker);pause('listen');pause('ride')});
  return Object.freeze({
    open,close,carry,returnToSource,openRing,ringSeek,refresh,
    state:()=>({active,sourceHash,glyphReady:!!lastGlyph,listenReady:!!api('listen'),rideReady:!!api('ride'),carryState:document.documentElement.dataset.fieldLabCarry||'none',focusState:document.documentElement.dataset.fieldLabFocus||'unknown',returnFocus:document.documentElement.dataset.fieldLabReturnFocus||'unknown'}),
    native:type=>api(type)
  });
}
