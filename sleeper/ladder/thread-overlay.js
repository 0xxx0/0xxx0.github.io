/* LADDER ↔ THREADWALK: source aperture over the SAME live canvas.
   The page contains only its original four elements until a reader opens.
   Reading cannot claim or mutate native gate proofs. */
(function(){
'use strict';
const L=window.SleeperLadder,foot=document.getElementById('prov');
if(!L||!foot)return;
let overlay=null,frame=null,active=null,ready=false;
const css=document.createElement('style');
css.textContent=[
 '#ladderOverlay{position:fixed;inset:0;z-index:4000;background:#07131c}',
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
 const suffix=' · READ '+(n+1)+'/8 ↗';
 if(!foot.textContent.includes(' · READ '))foot.textContent+=suffix;
 else foot.textContent=foot.textContent.replace(/ · READ [0-8]\/8 ↗$/,suffix);
 foot.title='READ '+L.factor(n).en+' ('+L.factor(n).locator+') · return to the same walk';
}
function close(){
 if(!overlay)return false;
 const node=overlay;overlay=null;frame=null;active=null;
 node.remove();
 foot.focus();label();
 return true;
}
function open(){
 const n=nextFactor();if(n===null||overlay)return;
 active={factor:n,before:L.state()};
 overlay=document.createElement('div');overlay.id='ladderOverlay';overlay.setAttribute('role','dialog');
 overlay.setAttribute('aria-label','Threadwalk source projection');overlay.setAttribute('aria-modal','true');
 const back=document.createElement('button');back.id='ladderClose';back.type='button';back.textContent='↩ LADDER';back.onclick=close;
 frame=document.createElement('iframe');frame.id='ladderFrame';frame.title='Threadwalk — the eight path factors';frame.src='../axis-score.html?read=1&ladderFactor='+n;
 overlay.append(frame,back);document.body.append(overlay);back.focus();
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
 if(e.key==='Escape'&&overlay){e.preventDefault();close();}
});
L.ready.then(s=>{
 if(s?.error){foot.title='SOURCE GAP / READER UNAVAILABLE';return;}
 ready=true;label();
}).catch(()=>{foot.title='SOURCE GAP / READER UNAVAILABLE';});
foot.addEventListener('pointerenter',label);foot.addEventListener('focus',label);
window.SleeperLadderRead=Object.freeze({
 current:nextFactor,isOpen:()=>!!overlay,close,
 before:()=>active?.before||null
});
})();