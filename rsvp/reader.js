// Compact projection of READFIELD. FieldAperture owns segmentation, cursor,
// ORP and playback; FieldSourceTrail owns position. No second reader clock.
(()=>{'use strict';
const el=id=>document.getElementById(id),ap=el('wristAperture'),C=333.009;
let raw='',label='',sourceAddress='',sourceHash='',returnAddress='',nodes=[],epoch=0,trailKey='',lastPersist=0,loading=false;
let wpm=260;try{wpm=Number(localStorage.getItem('pin.wpm'))||260}catch(_){}
const safe=value=>{if(!value)return'';try{const u=new URL(value,location.href);return u.origin===location.origin?u.pathname+u.search+u.hash:''}catch(_){return''}};
const snap=()=>ap.snapshot();
function persist(s=raw&&snap()){
 if(!s||!trailKey||loading)return;
 const now=Date.now();if(s.playing&&now-lastPersist<1100)return;lastPersist=now;
 FieldSourceTrail.record(trailKey,{address:s.address,progress:s.source_progress,focus:s.focus,charIndex:s.char_index,scale:s.scale,via:'READFIELD_WRIST'});
}
function paint(s=raw&&snap()){
 const parts=FieldAperture.orpParts(s?.focus||'φ');
 el('before').textContent=parts.before;el('mark').textContent=parts.mark;el('after').textContent=parts.after;
 const node=s?FieldAperture.jsonNodeAt(nodes,s.char_index):null;
 el('label').textContent=node?.path||label||'PIN / LOCAL';
 const p=s?.source_progress||0;el('ring').setAttribute('stroke-dashoffset',String(C*(1-p)));el('fill').style.width=(100*p)+'%';
 el('position').textContent=s?(s.index+1)+' / '+s.count+' · '+(nodes.length?'JSON':'TEXT'):'NO SOURCE';
 wpm=s?.wpm||wpm;el('speed').textContent=wpm+' WPM';el('value').textContent=wpm+' WPM';el('rate').value=wpm;
 el('play').textContent=s?.playing?'Ⅱ PAUSE':'▶ READ';el('state').textContent=s?.playing?'PLAY':'PAUSED';
 el('context').textContent=s?.playing?'':s?raw.slice(Math.max(0,s.span.start-55),Math.min(raw.length,s.span.end+65)):'Tap SOURCE to open text or JSON';
 persist(s);
}
function stop(){ap.stop()}
function step(n){if(!raw)return;stop();const s=snap();ap.setPos(Math.max(0,Math.min(s.count-1,s.index+n)))}
function toggle(){if(!raw){el('drawer').hidden=false;return}if(!snap().playing&&snap().index>=snap().count-1)ap.setPos(0);ap.toggleRSVP()}
function err(e){el('error').textContent=String(e?.message||e);el('drawer').hidden=false}
function adjust(n){wpm=Math.min(6000,Math.max(60,Math.round(n/10)*10));try{localStorage.setItem('pin.wpm',wpm)}catch(_){}ap.setWpm(wpm);paint()}
async function load(text,name,options={},request=++epoch){
 const input=String(text);if(!input.trim())throw Error('Empty source');if(new TextEncoder().encode(input).length>2000000)throw Error('Source exceeds 2 MB');
 let map=[];try{map=FieldAperture.jsonSpans(input)}catch(e){if(/\.json$/i.test(name))throw Error('Invalid or unsupported JSON: '+e.message)}
 const {hashText}=await import('/lib/id.js'),hash=await hashText(input);if(request!==epoch)return;
 if(options.hash&&options.hash!==hash)throw Error('Source identity mismatch');
 stop();loading=true;
 raw=input;label=name||'PASTE';nodes=map;sourceHash=hash;sourceAddress=safe(options.sourceAddress||'');returnAddress=safe(options.returnAddress||'');
 trailKey=FieldSourceTrail.sourceKey({address:sourceAddress,id:hash});
 const last=FieldSourceTrail.read(trailKey).last,focus=options.focus||last;
 const char=focus?.char_index??focus?.charIndex??0;
 if(options.focus?.wpm!=null)wpm=options.focus.wpm;
 wpm=Math.min(6000,Math.max(60,Number(wpm)||260));
 ap.load(raw,{label,format:'TXT',scale:'WORD',charIndex:char,wpm});loading=false;
 // Source bytes remain session-only. Explicit incoming focus is consumed once;
 // reload resumes the shared trail rather than replaying an old handoff cursor.
 try{sessionStorage.setItem('rsvp.handoff.v1',JSON.stringify({raw,label,hash:sourceHash,sourceAddress,returnAddress}));history.replaceState(null,'','?handoff=1')}catch(_){}
 el('drawer').hidden=true;el('error').textContent='';paint();
}
async function fetchPath(value){
 const u=new URL(value,location.href);if(u.origin!==location.origin||!/\.(json|txt|md|markdown|csv|log|ya?ml)$/i.test(u.pathname))throw Error('Use a same-origin text/JSON path');
 const request=++epoch,r=await fetch(u.pathname+u.search,{cache:'no-store'});if(request!==epoch)return;if(!r.ok)throw Error('HTTP '+r.status);
 const text=await r.text();if(request!==epoch)return;await load(text,u.pathname.split('/').pop(),{sourceAddress:u.pathname+u.search},request);el('path').value=u.pathname;
}
ap.addEventListener('aperture-focus',e=>paint(raw?e.detail:null));
el('stage').onclick=toggle;el('play').onclick=toggle;el('prev').onclick=()=>step(-1);el('next').onclick=()=>step(1);
el('show').onclick=()=>{stop();el('drawer').hidden=false};el('close').onclick=()=>el('drawer').hidden=true;
el('rate').oninput=e=>adjust(Number(e.target.value));
el('file').onchange=async e=>{const request=++epoch;try{const f=e.target.files?.[0];if(!f)return;if(f.size>2000000)throw Error('File exceeds 2 MB');await load(await f.text(),f.name,{},request)}catch(x){if(request===epoch)err(x)}};
el('read').onclick=()=>load(el('paste').value,'PASTE').catch(err);
el('sample').onclick=()=>load(JSON.stringify({reader:'PIN',purpose:'Read real JSON on a watch.',sequence:['pause','return','resume'],tempo:{wpm:260,source:'local'}},null,2),'demo.json').catch(err);
el('open').onclick=()=>fetchPath(el('path').value).catch(err);
el('meter').onclick=e=>{if(!raw)return;stop();const r=e.currentTarget.getBoundingClientRect();ap.seekFraction((e.clientX-r.left)/r.width)};
el('stage').addEventListener('wheel',e=>{e.preventDefault();if(snap()?.playing)adjust(wpm+(e.deltaY<0?20:-20));else step(e.deltaY>0?1:-1)},{passive:false});
el('readfield').onclick=e=>{
 if(!raw)return;e.preventDefault();stop();
 const parent=returnAddress?new URL(returnAddress,location.origin):null;
 const back=parent?.pathname==='/docs/'?safe(parent.searchParams.get('return')||'/'):returnAddress||'/';
 try{
  sessionStorage.setItem('readfield.handoff.v1',JSON.stringify({source:raw,label,focus:snap(),sourceIdentity:{id:sourceHash,hash:sourceHash,address:sourceAddress,format:'AUTO'},from:'/rsvp/',returnAddress:back}));
  location.href='/docs/?handoff=1';
 }catch(x){err(Error('READFIELD handoff unavailable: '+x.message))}
};
window.addEventListener('keydown',e=>{
 if(!el('drawer').hidden||e.target?.closest?.('input,textarea,select,a,button')||e.altKey||e.ctrlKey||e.metaKey)return;
 if(e.code==='Space'){e.preventDefault();toggle()}else if(e.code==='ArrowLeft'){e.preventDefault();step(-1)}else if(e.code==='ArrowRight'){e.preventDefault();step(1)}else if(e.code==='ArrowUp')adjust(wpm+20);else if(e.code==='ArrowDown')adjust(wpm-20);
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});window.addEventListener('pagehide',()=>persist());
paint();const q=new URLSearchParams(location.search);
if(q.has('src'))fetchPath(q.get('src')).catch(err);
else if(q.has('handoff')){try{const x=JSON.parse(sessionStorage.getItem('rsvp.handoff.v1')||'null');if(x&&typeof x.raw==='string')load(x.raw,x.label,x).catch(err);else el('drawer').hidden=false}catch(e){err(e)}}
else el('drawer').hidden=false;
})();
