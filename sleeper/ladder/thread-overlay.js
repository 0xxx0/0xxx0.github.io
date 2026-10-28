/* LADDER → THREADWALK. A reading aperture, not a ninth Gate.
   The canvas stays mounted; neither opening nor closing changes the walk. */
(function(){
'use strict';
const L=window.SleeperLadder,button=document.getElementById('ladderRead');
const overlay=document.getElementById('ladderOverlay'),frame=document.getElementById('ladderFrame'),close=document.getElementById('ladderClose');
if(!L||!button||!overlay||!frame||!close)return;
let active=null,opening=false;
function nextFactor(){
 const state=L.state();
 if(!state?.ready||!state.gates?.length)return null;
 const adjacent=state.distance==='ENTERED'?L.adjacentSight():null;
 if(adjacent&&Number.isInteger(adjacent.i)&&adjacent.i>=0&&adjacent.i<8)return adjacent.i;
 const pending=state.gates.find(g=>!g.lit);
 return pending?pending.i:0;
}
function refresh(){
 if(opening||!overlay.hidden)return;
 const n=nextFactor();
 button.disabled=n===null;
 button.textContent=n===null?'READ ↗':'READ '+(n+1)+'/8 ↗';
 if(n!==null){const f=L.factor(n);button.title='Read '+(f?.en||'source')+' · '+(f?.locator||'')+' in Threadwalk';}
}
function dismiss(){
 if(overlay.hidden)return false;
 overlay.hidden=true;frame.removeAttribute('src');opening=false;active=null;
 button.focus();
 refresh();
 return true;
}
function open(){
 const n=nextFactor();if(n===null)return;
 active={factor:n, state:L.state()};
 opening=true;
 frame.src='../axis-score.html?read=1&ladderFactor='+n;
 overlay.hidden=false;
 close.focus();
 opening=false;
}
button.addEventListener('click',open);
close.addEventListener('click',dismiss);
window.addEventListener('message',e=>{
 if(e.origin!==location.origin||e.source!==frame.contentWindow)return;
 if(e.data?.schema==='sleeper.ladder-reader-close/v1')dismiss();
});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!overlay.hidden){e.preventDefault();dismiss()}});
L.ready.then(s=>{if(s?.error){button.disabled=true;button.textContent='SOURCE GAP';return}refresh()}).catch(()=>{button.disabled=true;button.textContent='SOURCE GAP'});
// The gate selection changes while walking; refresh only when the foot is
// deliberately activated, to avoid another animation loop or state owner.
button.addEventListener('pointerenter',refresh);
button.addEventListener('focus',refresh);
window.SleeperLadderRead=Object.freeze({
 current:()=>nextFactor(),
 isOpen:()=>!overlay.hidden,
 close:dismiss,
 // Observational record. This bridge grants no proof and persists no route.
 before:()=>active?.state||null
});
})();