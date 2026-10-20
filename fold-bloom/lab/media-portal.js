import {audioGlyphRepresentation} from '../listen/audio-glyph.js';
import {harmonicEvidence} from './harmonic-evidence.js';
import {holdSource,returnToSource} from './source-spine.js';

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
  .labMediaGlyph{width:56px;height:56px;flex:0 0 56px;padding:4px;border-radius:50%;border:1px solid #41535d;background:#05070b;display:grid;place-items:center;cursor:pointer}
  .labMediaGlyph svg{width:100%;height:100%;border-radius:50%}
  .labMediaTime{width:100%;max-width:260px;accent-color:#e2bb7d;height:16px;display:block;touch-action:pan-x}
  .labMediaSeek{display:flex;gap:5px;align-items:center;font-size:9px;color:#b8c8d2}
  .labMediaSeek[hidden],.labMediaReturn[hidden]{display:none!important}
  .labMediaSeek span{white-space:nowrap;font-variant-numeric:tabular-nums}
  .labMediaGlyph:disabled{opacity:.35;cursor:default}
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
      <button class="labMediaReturn" data-portal="sourceReturn" type="button" hidden>↩ SOURCE</button>
      <a class="labMediaOriginal" data-portal="original" href="../live/" target="_blank" rel="noopener">FULL ↗</a>
    </header>
    <div class="labMediaViewport" data-frame="ride" hidden></div>
    <div class="labMediaViewport" data-frame="listen" hidden></div>
    <footer class="labMediaFooter">
      <button class="labMediaGlyph" data-portal="glyph" type="button" aria-label="Open LISTEN source glyph" disabled>◇</button>
      <div class="labMediaDetail" aria-live="polite">
        <div class="labMediaTitle" data-portal="title">NATIVE SOURCE</div>
        <div class="labMediaSub" data-portal="detail">OPEN LISTEN TO BIND AUDIO</div>
        <label class="labMediaSeek" data-portal="seekWrap" hidden><span data-portal="time">0:00</span><input class="labMediaTime" data-portal="seek" type="range" min="0" max="1" step="0.1" value="0" aria-label="Source position"><span data-portal="duration">0:00</span></label>
      </div>
      <div class="labMediaActions" data-actions="listen" hidden>
        <button type="button" class="labMediaPrimary" data-portal="carry" disabled>RIDE THIS ↗</button>
      </div>
      <div class="labMediaActions" data-actions="ride" hidden>
        <button type="button" data-portal="left">←</button>
        <button type="button" data-portal="right">→</button>
        <button type="button" class="labMediaPrimary" data-portal="release">RELEASE</button>
      </div>
    </footer>`;
  document.body.appendChild(shell);
  const $=s=>shell.querySelector(s),inline=document.getElementById('labGlyphDoor');
  const ports={ride:null,listen:null};let active=null,ticker=0,sourceHash=null,lastGlyph='',held=null,lastReturn=null,carryBusy=false;
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
  function announce(message){$('[data-portal="detail"]').textContent=message;onStatus(message)}
  function trace(kind){onTrace(kind)}
  function close(){
    if(!active)return;
    pause('ride');pause('listen');active=null;shell.hidden=true;clearInterval(ticker);ticker=0;
    document.documentElement.dataset.fieldLabMedia='closed';trace('MEDIA_RETURN');
    onStatus('FIELD LAB · NATIVE HOSTS HELD · RETURN');
  }
  function open(type){
    if(type!=='ride'&&type!=='listen')return false;
    if(active&&active!==type)pause(active);
    active=type;create(type);shell.hidden=false;
    document.documentElement.dataset.fieldLabMedia=type;
    for(const name of ['ride','listen']){
      $('[data-frame="'+name+'"]').hidden=name!==type;
      $('[data-actions="'+name+'"]').hidden=name!==type;
      $('[data-portal="'+name+'"]').setAttribute('aria-pressed',String(name===type));
    }
    $('[data-portal="original"]').href=type==='ride'?'../live/':'../listen/';
    clearInterval(ticker);ticker=setInterval(refresh,300);refresh();trace('MEDIA_'+type.toUpperCase());
    return true;
  }
  function setGlyph(glyph,hash){
    if(!glyph||!hash)return;
    const rep=audioGlyphRepresentation(glyph,hash);
    if(!rep)return;
    const key=String(hash)+'|'+glyph.rotation+'|'+glyph.radial.join(',');
    if(key===lastGlyph)return;
    lastGlyph=key;
    for(const target of [$('[data-portal="glyph"]'),inline?.querySelector('.labInlineGlyph')]){
      if(target)target.innerHTML=rep.svg;
    }
    const glyphBtn=$('[data-portal="glyph"]');
    glyphBtn.disabled=false;glyphBtn.title='LISTEN glyph · source '+String(hash).slice(0,12);
    sourceHash=hash;
  }
  function refresh(){
    const listen=api('listen'),native=api('ride'),ls=listen?.state?.();
    $('[data-portal="sourceReturn"]').hidden=!held?.ok;
    if(ls?.fileMeta?.hash&&ls.glyph)setGlyph(ls.glyph,ls.fileMeta.hash);
    if(active==='listen'){
      const m=ls?.fileMeta,ev=harmonicEvidence(ls?.map);
      $('[data-portal="title"]').textContent=m?m.name||'BOUND AUDIO':'LISTEN · LOAD A SOURCE';
      $('[data-portal="detail"]').textContent=m?
        (ls.stage+' · '+ev.label+' · '+String(m.hash||'').slice(0,12)):
        'TRY DEMO · LOCAL, OR OPEN AN AUDIO FILE';
      $('[data-portal="carry"]').disabled=carryBusy||!!ls?.sourceLoading||!m?.hash||typeof listen?.sourceFile!=='function';
      const duration=Math.max(0,Number(ls?.map?.duration)||Number(m?.duration)||0),t=Math.min(duration,Math.max(0,Number(ls?.time)||0));
      $('[data-portal="seekWrap"]').hidden=!(duration>0&&m?.hash);
      const slider=$('[data-portal="seek"]');slider.max=String(duration);if(slider!==document.activeElement)slider.value=String(t);
      const fmt=x=>Math.floor(x/60)+':'+String(Math.floor(x%60)).padStart(2,'0');
      $('[data-portal="time"]').textContent=fmt(t);$('[data-portal="duration"]').textContent=fmt(duration);
      const ring=$('[data-portal="glyph"]');if(!ring.disabled)ring.style.background='conic-gradient(#e2bb7d '+((duration? t/duration:0)*360)+'deg, #182b35 0deg)';
      if(lastReturn?.ok&&lastReturn.sourceHash===m?.hash)$('[data-portal="detail"]').textContent='↩ EXACT '+fmt(lastReturn.time)+' · '+lastReturn.releases+' NATIVE RELEASES';
    }else if(active==='ride'){
      $('[data-portal="seekWrap"]').hidden=true;
      const s=native?.state?.(),count=s?.history?.length||0,src=s?.sourceMeta;
      $('[data-portal="title"]').textContent=src?.name||'RIDE · NATIVE LIVE';
      $('[data-portal="detail"]').textContent=native?
        ((src?.hash?'SOURCE '+src.hash.slice(0,12)+' · ':'FIELD COURSE · ')+
        count+' RELEASE'+(count===1?'':'S')+' · '+(s?.autopilot?'AUTOPILOT':'HUMAN CONTROL')):
        'LOADING NATIVE LIVE';
      const enabled=!!native;
      for(const verb of ['left','right','release'])$('[data-portal="'+verb+'"]').disabled=!enabled;
    }
  }
  async function carry(){
    if(carryBusy)return false;
    const listen=api('listen'),s=listen?.state?.(),expected=s?.fileMeta?.hash;
    if(s?.sourceLoading){announce('SOURCE STILL LOADING · CARRY NOT AUTHORIZED');return false}
    if(!expected||typeof listen?.sourceFile!=='function'){announce('BIND AUDIO IN LISTEN FIRST');return false}
    const file=listen.sourceFile();
    if(!file){announce('SOURCE BYTES UNAVAILABLE · NOTHING TRANSFERRED');return false}
    carryBusy=true;const b=$('[data-portal="carry"]');b.disabled=true;announce('BINDING EXACT AUDIO TO LIVE');
    const sourceHold=holdSource({hash:expected,time:s.time,duration:s.map?.duration||s.fileMeta?.duration,scope:s.scope,pins:s.pins});
    pause('listen');open('ride');
    try{
      const native=await new Promise((resolve,reject)=>{
        const start=Date.now(),check=()=>{
          const a=api('ride');if(a?.loadFiles){resolve(a);return}
          if(Date.now()-start>12000){reject(Error('LIVE_BOOT_TIMEOUT'));return}
          setTimeout(check,100);
        };check();
      });
      await Promise.race([
        native.loadFiles([file],{retain:false,label:'LAB SOURCE → LIVE'}),
        new Promise((_,reject)=>setTimeout(()=>reject(Error('LIVE_DECODE_TIMEOUT')),12000))
      ]);
      const actual=native.state?.()?.sourceMeta?.hash;
      if(actual!==expected)throw Error('SOURCE_HASH_MISMATCH');
      const position=native.source?.seek?.(sourceHold.sourceAddress,expected);
      if(!position||position.hash!==expected)throw Error('SOURCE_IDENTITY_UNVERIFIED');
      held={...sourceHold,releasesBefore:native.state?.()?.history?.length||0,nativeFocusConfirmed:position.ok===true};lastReturn=null;
      document.documentElement.dataset.fieldLabNativeFocus=position.ok?'confirmed':'unverified';
      announce('SOURCE MATCHED · RIDE NATIVE · '+expected.slice(0,12)+(position.ok?' · EXACT TIME':' · TIME UNVERIFIED'));
      document.documentElement.dataset.fieldLabCarry='matched';
      trace('MEDIA_SOURCE_MATCHED');refresh();return true;
    }catch(error){
      held=null;document.documentElement.dataset.fieldLabCarry='unverified';
      announce('SOURCE NOT VERIFIED · '+String(error?.message||error).slice(0,66));
      trace('MEDIA_SOURCE_UNVERIFIED');return false;
    }finally{carryBusy=false;refresh()}
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
  function sourceReturn(){
    if(!held?.ok){announce('NO HELD SOURCE');return null}
    const native=api('ride'),listen=api('listen'),ls=listen?.state?.(),snapshot=native?.state?.();
    const receipt=returnToSource(held,{rideHash:snapshot?.sourceMeta?.hash,
      releasesAfter:snapshot?.history?.length,currentSourceHash:ls?.fileMeta?.hash});
    pause('ride');open('listen');
    let verified=false,returnedTime=null;
    if(receipt.ok&&!ls?.sourceLoading){
      listen.seek?.(receipt.time);
      const now=Number(listen.state?.()?.time),media=ports.listen?.contentDocument?.getElementById('audio');
      returnedTime=Number.isFinite(now)?now:null;
      verified=held.nativeFocusConfirmed===true&&
        media?.readyState>=1&&Number.isFinite(now)&&Math.abs(now-receipt.time)<.12;
    }
    lastReturn={...receipt,sourceMatched:receipt.ok,ok:receipt.ok&&verified,
      returnedTime,reason:receipt.ok?(verified?'EXACT_SOURCE_TIME_RETURN':'TIME_NOT_CONFIRMED'):(receipt.reason||'SOURCE_MISMATCH')};
    document.documentElement.dataset.fieldLabSourceReturn=lastReturn.ok?'matched':receipt.ok?'time-unverified':'mismatch';
    if(lastReturn.ok){
      onStatus('SOURCE RETURN · EXACT '+receipt.time.toFixed(2)+'s · '+receipt.releases+' RELEASES');
      trace('SOURCE_EXACT_RETURN');
    }else{
      onStatus('SOURCE RETURN · '+(receipt.ok?'HASH MATCHED · TIME UNVERIFIED':lastReturn.reason));
      trace('SOURCE_RETURN_UNVERIFIED');
    }
    held=null;refresh();return lastReturn;
  }
  $('[data-portal="close"]').onclick=close;
  $('[data-portal="sourceReturn"]').onclick=sourceReturn;
  $('[data-portal="seek"]').addEventListener('input',e=>{const t=Number(e.target.value);api('listen')?.seek?.(t);refresh()});
  $('[data-portal="ride"]').onclick=()=>open('ride');
  $('[data-portal="listen"]').onclick=()=>open('listen');
  $('[data-portal="glyph"]').onclick=e=>{
    if(active!=='listen'){open('listen');return}
    const s=api('listen')?.state?.(),duration=Number(s?.map?.duration)||0;
    if(!(duration>0))return;
    const r=e.currentTarget.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);
    const theta=(Math.atan2(dy,dx)+Math.PI/2+Math.PI*2)%(Math.PI*2);
    api('listen')?.seek?.(duration*theta/(Math.PI*2));refresh();
  };
  $('[data-portal="carry"]').onclick=()=>{void carry()};
  for(const n of ['left','right','release'])$('[data-portal="'+n+'"]').onclick=()=>{void command(n)};
  inline?.addEventListener('click',()=>open('listen'));
  document.addEventListener('keydown',e=>{if(active&&e.key==='Escape'){e.preventDefault();close()}});
  window.addEventListener('pagehide',()=>{clearInterval(ticker);pause('listen');pause('ride')});
  return Object.freeze({
    open,close,carry,refresh,sourceReturn,returnReceipt:()=>lastReturn?{...lastReturn}:null,
    state:()=>({active,sourceHash,glyphReady:!!lastGlyph,listenReady:!!api('listen'),rideReady:!!api('ride'),carryState:document.documentElement.dataset.fieldLabCarry||'none',heldHash:held?.sourceHash||null,returnReceipt:lastReturn?{...lastReturn}:null}),
    native:type=>api(type)
  });
}
