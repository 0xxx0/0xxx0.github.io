/* LADDER ↔ THREADWALK: source aperture over the SAME live canvas.
   The page contains only its original four elements until a reader opens.
   Reading cannot claim or mutate native gate proofs. */
(function(){
'use strict';
const L=window.SleeperLadder,foot=document.getElementById('prov');
if(!L||!foot)return;
let overlay=null,frame=null,active=null,ready=false;
// Two source identities share the same viewport but never share evidence state.
// Retaining the iframes preserves actual text work, not a reconstruction from a save.
const frames={read:null};
let bellLoading=false;
// The loop door opens the POV world itself, mounted on demand in this document.
// It is not a page about the Bell; the same SleeperBell the Threadwalk host uses.
function openBell(){
 const launch=()=>{const b=document.getElementById('bellEntry');if(b){b.click();return true}return false};
 if(launch())return;
 if(bellLoading)return;
 bellLoading=true;
 if(!document.getElementById('enter')){const a=document.createElement('div');a.id='enter';a.hidden=true;document.body.append(a)}
 if(!document.getElementById('bellEntryHide')){const st=document.createElement('style');st.id='bellEntryHide';st.textContent='#bellEntry{display:none!important}';document.head.append(st)}
 const boot=()=>{try{if(window.SleeperBell)window.SleeperBell.mount()}catch(e){}bellLoading=false;launch()};
 if(window.SleeperBell){boot();return}
 const s=document.createElement('script');s.src='../bell-world.js?v=0.6.6';s.onload=boot;s.onerror=()=>{bellLoading=false};document.body.append(s);
}
const css=document.createElement('style');
css.textContent=[
 '#ladderOverlay{position:fixed;inset:0;z-index:4000;background:#07131c}',
 '#ladderOverlay[hidden],#ladderOverlay iframe[hidden]{display:none!important}',
 '#ladderFrame{width:100%;height:100%;border:0;display:block}',
 '#ladderClose{position:absolute;z-index:2;top:52px;right:8px;min-height:40px;padding:8px 12px;border:1px solid #697e88;background:#0a1c26;color:#f0d093;font:12px ui-monospace,monospace;cursor:pointer}',
 '#ladderClose:focus-visible{outline:2px solid #f0d093}'
].join('');document.head.append(css);
function nextFactor(){
 const st=L.state();if(!ready||!st.ready||!st.gates?.length)return null;
 const near=st.distance==='ENTERED'?L.adjacentSight():null;
 if(near&&Number.isInteger(near.i)&&near.i>=0&&near.i<8)return near.i;
 return st.gates.find(g=>!g.lit)?.i??0;
}
function label(){
 const n=nextFactor();
 if(n===null)return;
 const suffix=(L.loop&&L.loop())?' · THE LOOP ↗':' · READ '+(n+1)+'/8 ↗';
 if(!foot.textContent.includes(' · READ ')&&!foot.textContent.includes(' · THE LOOP '))foot.textContent+=suffix;
 else foot.textContent=foot.textContent.replace(/ · (READ [0-8]\/8|THE LOOP) ↗$/,'')+suffix;
 foot.title=(L.loop&&L.loop())?'The Bell — the loop that outran the line · return to the same walk':'READ '+L.factor(n).en+' ('+L.factor(n).locator+') · return to the same walk';
}
function close(){
 if(!overlay||overlay.hidden)return false;
 // The painting/Gate state is authoritative. Returning to it must not erase
 // reading progress, exact held sentences, authored links or in-flight drafts.
 overlay.hidden=true;overlay.setAttribute('aria-hidden','true');
 try{frame?.contentWindow?.postMessage({schema:'sleeper.ladder-reader-pause/v1'},location.origin)}catch(_){}
 foot.focus();label();
 return true;
}
function open(){
 const n=nextFactor();if(n===null||overlay&&!overlay.hidden)return;
 if(L.loop&&L.loop()){label();openBell();return}
 const key='read';
 if(!overlay){
  overlay=document.createElement('div');overlay.id='ladderOverlay';overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');
  const back=document.createElement('button');back.id='ladderClose';back.type='button';back.textContent='↩ LADDER';back.onclick=close;
  overlay.append(back);document.body.append(overlay);
 }
 let chosen=frames[key];
 if(!chosen){
  chosen=document.createElement('iframe');
  chosen.className='ladderSourceFrame';
  chosen.title='Threadwalk — the eight path factors';
  chosen.src='../axis-score.html?read=1&ladderFactor='+n;
  chosen.hidden=true;
  frames[key]=chosen;
  overlay.insertBefore(chosen,overlay.querySelector('#ladderClose'));
 }
 if(frame&&frame!==chosen){frame.hidden=true;frame.removeAttribute('id');}
 frame=chosen;frame.id='ladderFrame';frame.hidden=false;
 active={factor:n,before:L.state()};
 overlay.setAttribute('aria-label',chosen.title);
 overlay.hidden=false;overlay.removeAttribute('aria-hidden');
 overlay.querySelector('#ladderClose').focus();
}
foot.addEventListener('click',open);
foot.addEventListener('keydown',e=>{
 if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();open();}
});
window.addEventListener('message',e=>{
 if(e.origin!==location.origin||!frame||e.source!==frame.contentWindow)return;
 if(e.data?.schema==='sleeper.ladder-reader-close/v1')close();
});
window.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&overlay&&!overlay.hidden){e.preventDefault();close();}
});
L.ready.then(s=>{
 if(s?.error){foot.title='SOURCE GAP / READER UNAVAILABLE';return;}
 ready=true;label();
}).catch(()=>{foot.title='SOURCE GAP / READER UNAVAILABLE';});
foot.addEventListener('pointerenter',label);foot.addEventListener('focus',label);
window.SleeperLadderRead=Object.freeze({
 current:nextFactor,isOpen:()=>!!overlay&&!overlay.hidden,close,
 before:()=>active?.before||null,refresh:label
});
})();