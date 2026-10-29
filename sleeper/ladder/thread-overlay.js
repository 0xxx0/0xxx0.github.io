/* LADDER ↔ THREADWALK: source aperture over the SAME live canvas.
   The page contains only its original four elements until a reader opens.
   Reading cannot claim or mutate native gate proofs. */
(function(){
'use strict';
const L=window.SleeperLadder,foot=document.getElementById('prov');
if(!L||!foot)return;
let overlay=null,frame=null,active=null,ready=false,currentAddress=null;
// Two source identities share the same viewport but never share evidence state.
// Retaining the iframes preserves actual text work, not a reconstruction from a save.
const frames={read:null};
let bellLoading=false;
// The loop door opens the POV world itself, mounted on demand in this document.
// It is not a page about the Bell; the same SleeperBell the Threadwalk host uses.
// On the ladder it is skinned as the mansion: one quiet room of conditions.
function skinMansion(){
 const root=document.getElementById('bellExperience');if(!root)return;
 root.classList.add('mansion');
 if(!document.getElementById('mansionSkin')){
  const st=document.createElement('style');st.id='mansionSkin';
  st.textContent=[
   '#bellExperience.mansion{background:#080c12;color:#c7d0da;font:12px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace}',
   '#bellExperience.mansion header{background:#080c12;border-bottom:1px solid rgba(79,87,96,.22)}',
   '#bellExperience.mansion header b{color:#e6ebf0;font-weight:500;letter-spacing:.1em}',
   '#bellExperience.mansion button{border:1px solid rgba(79,87,96,.42);background:transparent;color:#dfe6ec;border-radius:0;font:11px ui-monospace,monospace;letter-spacing:.04em}',
   '#bellExperience.mansion button.gold{background:#dfe6ec;color:#080c12;border-color:#dfe6ec;font-weight:600}',
   '#bellExperience.mansion #bellCover{background:rgba(5,8,12,.88)}',
   '#bellExperience.mansion #bellCard{background:#0b1118;border-top:1px solid rgba(198,209,220,.38);box-shadow:none}',
   '#bellExperience.mansion #bellCard h1{font:400 clamp(30px,5.8vw,50px)/1 ui-monospace,monospace;letter-spacing:-.05em;color:#eef2f6}',
   '#bellExperience.mansion #bellCard > div{color:#8d99a6!important}',
   '#bellExperience.mansion #bellCard p{font:14px/1.7 system-ui,sans-serif;color:#c2ccd6}',
   '#bellExperience.mansion #bellCard small{color:#8d99a6}',
   '#bellExperience.mansion #bellNote{background:rgba(8,12,18,.86);border-left:1px solid rgba(198,209,220,.35);color:#aeb9c6}',
   '#bellExperience.mansion #bellPhase{color:#aeb9c6}',
   '#bellExperience.mansion #bellAction{background:rgba(8,12,18,.94);border:1px solid rgba(198,209,220,.3);box-shadow:none}',
   '#bellExperience.mansion #bellControls{background:linear-gradient(transparent,#080c12f2 18%)}',
   '#bellExperience.mansion #bellScene{filter:saturate(.18) contrast(.95) brightness(.9)}',
   '#bellExperience.mansion #bellRing{filter:saturate(.15)}',
   '#bellExperience.mansion #bellText{text-shadow:0 2px 14px #000}'
  ].join('');document.head.append(st);
 }
 const h=root.querySelector('header b');if(h)h.innerHTML='HERMES MANSION <span>/ A WORLD OF CONDITIONS</span>';
 const kick=root.querySelector('#bellCard > div');if(kick)kick.textContent='A ROOM IN THE MANSION / CONDITIONALITY / ORIGINAL ILLUSTRATION';
 const t=root.querySelector('#bellCardTitle');if(t)t.textContent='THE MANSION';
 const p=root.querySelector('#bellCardText');if(p)p.innerHTML='Somewhere in this mansion a bell sounds. Its sound is pleasant. You recognize it and want to hear it again.<br><br>Walk the rooms. At the crossroads your action changes what is reachable; the bell itself does not change.';
 const q=root.querySelector('#bellQuit');if(q)q.textContent='↩ LADDER';
}
function openBell(){
 const launch=()=>{const b=document.getElementById('bellEntry');if(b){b.click();skinMansion();return true}return false};
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
 const st=L.state();
 if(st.distance==='EXITED'){
  const clean=foot.textContent.replace(/ · (READ [0-8]\/8|THE LOOP|RETURN) [↗↓]$/,'');
  if(!clean.includes(' · RETURN ↓'))foot.textContent=clean+' · RETURN ↓';
  foot.title='download the ladder return artifact — source, painting and city are checked in the file';
  return;
 }
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
function open(address=null){
 const st=L.state();
 if(st.distance==='EXITED'){ label(); L.downloadReturn(); return true; }
 const n=nextFactor();if(n===null||overlay&&!overlay.hidden)return;
 if(!address&&L.loop&&L.loop()){label();openBell();return}
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
  chosen.addEventListener('load',sendAddress);
  frames[key]=chosen;
  overlay.insertBefore(chosen,overlay.querySelector('#ladderClose'));
 }
 if(frame&&frame!==chosen){frame.hidden=true;frame.removeAttribute('id');}
 frame=chosen;frame.id='ladderFrame';frame.hidden=false;
 currentAddress=address;
 active={factor:n,before:L.state(),sourceAddress:address};
 overlay.setAttribute('aria-label',chosen.title);
 overlay.hidden=false;overlay.removeAttribute('aria-hidden');
 overlay.querySelector('#ladderClose').focus();
 if(chosen.contentDocument?.readyState==='complete')sendAddress();
}
// A cell is an address in the vetted abridged LADDER slice, not an
// inferred Buddhist passage. The iframe resolves its own copy of the slice.
function sendAddress(){
 if(!frame?.contentWindow)return;
 try{frame.contentWindow.postMessage({schema:'sleeper.ladder-reader-address/v1',address:currentAddress},location.origin)}catch(_){ }
}
function openAtAddress(address){
 const st=L.state();
 if(!ready||!st.ready||!st.walker||!st.source||!address||
    !Number.isInteger(address.cell)||address.cell!==st.walker.y*96+st.walker.x||
    !Number.isInteger(address.paragraph)||address.paragraph!==st.walker.p||
    address.paragraph<0||address.paragraph>=st.source.districts||
    !Number.isInteger(address.sentence)||address.sentence<0||
    !Number.isInteger(address.word)||address.word<0||
    address.sourceSha256!==st.source.sha256)return false;
 open(Object.freeze({...address}));
 return !!overlay&&!overlay.hidden;
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
 current:nextFactor,isOpen:()=>!!overlay&&!overlay.hidden,close,openAtAddress,
 before:()=>active?.before||null,refresh:label
});
})();