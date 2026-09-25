(()=>{'use strict';
const q=new URLSearchParams(location.search),live=['1','true','field'].includes((q.get('live')||'').toLowerCase()),btn=document.getElementById('liveModeBtn');
if(btn){btn.onclick=()=>{const n=new URLSearchParams(location.search);if(live)n.delete('live');else n.set('live','1');location.search=n.toString()};if(live){btn.classList.add('on');btn.textContent='LIVE · FIELD'}}
if(!live)return;
const style=document.createElement('style');style.textContent=`
#fieldLiveBridge{margin:0 auto 10px;max-width:1180px;border:1px solid #191915;background:#f4efe4;color:#191915;font:10px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace}
#fieldLiveBridge *{box-sizing:border-box}#fieldLiveBridge .fl-head{display:flex;justify-content:space-between;gap:8px;align-items:center;padding:7px 9px;border-bottom:1px solid #191915}
#fieldLiveBridge .fl-head b{letter-spacing:.13em}.fl-meta{color:#817c72;font-size:9px}.fl-actions{display:flex;gap:5px;flex-wrap:wrap}
#fieldLiveBridge button,#fieldLiveBridge input,#fieldLiveBridge a{font:inherit;border:1px solid #817c72;background:transparent;color:inherit;min-height:34px;padding:6px 8px;text-decoration:none;border-radius:0}
#fieldLiveBridge button{cursor:pointer}#fieldLiveBridge button:hover,#fieldLiveBridge a:hover{border-color:#191915}.fl-capture{display:grid;grid-template-columns:minmax(0,1fr) auto;padding:7px 9px;border-bottom:1px solid #cec7ba;gap:5px}
.fl-grid{display:grid;grid-template-columns:1fr 1fr}.fl-col{min-width:0}.fl-col+.fl-col{border-left:1px solid #cec7ba}.fl-label{padding:5px 9px;color:#817c72;border-bottom:1px solid #cec7ba;font-size:8px;letter-spacing:.12em}
.fl-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px;padding:7px 9px;border-bottom:1px solid #ded8ce}.fl-row:last-child{border-bottom:0}.fl-row strong{display:block;font-size:9px}.fl-row p{margin:3px 0 0;color:#4b4942;font-size:8px}.fl-row .src{display:block;margin-top:3px;color:#817c72;font-size:7px;overflow-wrap:anywhere}
.fl-gate{background:#eee7d9}.fl-handoff{border-bottom:1px solid #191915;background:#f0eadf}.fl-portbar{display:flex;gap:5px;flex-wrap:wrap;padding:7px 9px}.fl-portbar a{font-size:8px}.fl-detail{display:block}.fl-compact .fl-detail{display:none}.fl-foot{display:flex;justify-content:space-between;gap:8px;align-items:center;padding:6px 9px;border-top:1px solid #191915}.fl-error{padding:8px 9px;color:#a8422d}
@media(max-width:760px){#fieldLiveBridge{margin:0 6px 8px}.fl-grid{grid-template-columns:1fr}.fl-col+.fl-col{border-left:0;border-top:1px solid #191915}.fl-head,.fl-foot{align-items:flex-start;flex-direction:column}.fl-capture{grid-template-columns:1fr auto}}
`;document.head.appendChild(style);
const panel=document.createElement('section');panel.id='fieldLiveBridge';panel.innerHTML=`
<div class="fl-head"><div><b>FIELD → DAYLINE / LIVE 0.2.1</b><div class="fl-meta" id="flMeta">loading live FIELD state…</div></div><div class="fl-actions"><button id="flSync">SYNC</button><button id="flFeedback">COPY HANDOFF</button><button id="flToggle">FIELD</button><a href="/control/confluence/ATLAS_DAYLINE_LIVE_CONVERGENCE_2026-09-25.md" target="_blank" rel="noopener">PACKET ↗</a></div></div>
<form class="fl-capture" id="flCapture"><input id="flCaptureText" autocomplete="off" placeholder="what just became true / what needs doing…"><button>CAPTURE</button></form>
<div class="fl-label">REALITY PORT / EXPLICIT EPHEMERAL HANDOFF</div><div id="flHandoff" class="fl-handoff"></div>
<div class="fl-detail"><div class="fl-grid"><div class="fl-col"><div class="fl-label">NOW / ACTIVE FRONTS · EXPLICIT ADD</div><div id="flFronts"></div></div><div class="fl-col"><div class="fl-label">HUMAN GATES · VISIBLE, NEVER AUTO-PROMOTED</div><div id="flGates"></div></div></div>
<div class="fl-foot"><span class="fl-meta">FIELD is read-only here. Source handoffs remain explicit. COPY HANDOFF emits authority-NONE Dayline evidence for a worker.</span><a href="/control/CURRENT.json" target="_blank" rel="noopener">SOURCE ↗</a></div></div>`;
document.getElementById('utilityBar').insertAdjacentElement('afterend',panel);
const phone=window.matchMedia('(max-width:760px)').matches;if(phone)panel.classList.add('fl-compact');
const toggle=document.getElementById('flToggle');const syncToggle=()=>{if(toggle)toggle.textContent=panel.classList.contains('fl-compact')?'FIELD':'HIDE'};syncToggle();if(toggle)toggle.onclick=()=>{panel.classList.toggle('fl-compact');syncToggle()};
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let current=null;const HANDOFF='atlas.dayline.handoff.v01';
function api(){if(!window.AtlasDayline)throw Error('Dayline bridge API unavailable');return window.AtlasDayline}
function addButton(c,label='ADD'){const b=document.createElement('button');b.textContent=label;b.onclick=()=>{api().addFieldTask(c);b.textContent='ADDED';b.disabled=true};return b}
function row(c,gate=false){const d=document.createElement('div');d.className='fl-row'+(gate?' fl-gate':'');d.innerHTML='<div><strong>'+esc(c.title)+'</strong><p>'+esc(c.body)+'</p><span class="src">'+esc(c.sourceRef)+'</span></div>';const a=document.createElement('div');if(gate&&c.route){const l=document.createElement('a');l.href=c.route;l.textContent='OPEN';a.appendChild(l)}else a.appendChild(addButton(c));d.appendChild(a);return d}
function readHandoff(){try{const x=JSON.parse(sessionStorage.getItem(HANDOFF)||'null');if(!x||x.schema!=='atlas-dayline-handoff/v0.1')return null;const age=Date.now()-Date.parse(x.created_at||0);if(!Number.isFinite(age)||age<0||age>43200000){sessionStorage.removeItem(HANDOFF);return null}return x}catch(_){return null}}
function clearHandoff(){sessionStorage.removeItem(HANDOFF);renderHandoff()}
function renderHandoff(){
 const host=document.getElementById('flHandoff'),h=readHandoff();host.textContent='';
 if(!h){host.innerHTML='<div class="fl-portbar"><span class="fl-meta">No pending handoff.</span><a href="/house/spatial/">HOUSE / SPACE ↗</a><a href="/shopping/">SHOPPING ↗</a><a href="/port/comms/">COMMS ↗</a></div>';return}
 const d=document.createElement('div');d.className='fl-row';const src=h.source||{},payload=h.payload||{},kind=String(h.kind||'').toUpperCase();
 const body=kind==='CONTEXT'?'Apply planning context: '+(payload.contexts||[]).join(' · '):(payload.task?.title||'Imported task');
 d.innerHTML='<div><strong>'+esc(kind+' / '+(src.label||src.object_id||src.route||'SOURCE'))+'</strong><p>'+esc(body)+'</p><span class="src">'+esc(src.route||'')+(src.address?' · '+esc(typeof src.address==='string'?src.address:JSON.stringify(src.address)):'')+'</span></div>';
 const a=document.createElement('div');
 const take=document.createElement('button');take.textContent=kind==='CONTEXT'?'APPLY CONTEXT':'ADD TO DAY';take.onclick=()=>{try{if(kind==='CONTEXT')api().applyContexts({contexts:payload.contexts||[],sourceRef:payload.sourceRef||src.route||'',replacePrefix:payload.replacePrefix||''});else if(kind==='TASK')api().addFieldTask(payload.task||{});else throw Error('unsupported handoff kind');sessionStorage.removeItem(HANDOFF);renderHandoff();take.textContent='APPLIED'}catch(e){take.textContent='FAILED'}};
 a.appendChild(take);if(h.return_to){const back=document.createElement('a');back.href=h.return_to;back.textContent='BACK';a.appendChild(back)}const drop=document.createElement('button');drop.textContent='CLEAR';drop.onclick=clearHandoff;a.appendChild(drop);d.appendChild(a);host.appendChild(d)
}
function render(){
 const f=document.getElementById('flFronts'),g=document.getElementById('flGates');f.textContent='';g.textContent='';
 const fronts=(current?.active_fronts||[]).filter(x=>String(x.state||'').includes('ACTIVE')).slice(0,3);
 for(const x of fronts)f.appendChild(row({title:'FIELD / '+String(x.id||'front').toUpperCase(),body:x.objective||x.center||'',sourceRef:'/control/CURRENT.json#active_fronts/'+x.id,sourceUpdated:current.updated,provenance:'FIELD CURRENT '+current.updated+' / '+x.id,notes:[x.center,x.objective,'Evidence: '+(x.evidence||[]).join(', ')].filter(Boolean).join('\n'),contexts:['computer'],duration:25,value:5}));
 if(!fronts.length)f.innerHTML='<div class="fl-row"><div><strong>NO ACTIVE FRONT</strong><p>Nothing is promoted into the day.</p></div></div>';
 const gates=(current?.current_heads||[]).filter(h=>h.next_executable).slice(0,8);
 for(const h of gates){const n=h.next_executable||{};g.appendChild(row({title:(h.lineage||'head')+' / '+(n.id||'gate'),body:n.objective||n.state||'',sourceRef:'/control/CURRENT.json#current_heads/'+(h.lineage||''),route:h.route||'/'},true))}
 if(!gates.length)g.innerHTML='<div class="fl-row"><div><strong>NO HUMAN GATE</strong><p>Nothing requires direct lived proof right now.</p></div></div>';
 document.getElementById('flMeta').textContent='CURRENT '+(current?.updated||'—')+' · '+fronts.length+' active front'+(fronts.length===1?'':'s')+' · '+gates.length+' human gate'+(gates.length===1?'':'s');
}
async function sync(){const m=document.getElementById('flMeta');m.textContent='syncing…';try{const r=await fetch('/control/CURRENT.json',{cache:'no-store'});if(!r.ok)throw Error('CURRENT '+r.status);current=await r.json();render()}catch(e){m.textContent='FIELD unavailable';document.getElementById('flFronts').innerHTML='<div class="fl-error">'+esc(e.message)+'</div>'}}
document.getElementById('flSync').onclick=sync;
document.getElementById('flCapture').onsubmit=e=>{e.preventDefault();const i=document.getElementById('flCaptureText'),title=i.value.trim();if(!title)return;const snap=api().snapshot(),contexts=Array.isArray(snap?.state?.contexts)?snap.state.contexts.filter(Boolean).slice(0,4):[];api().capture({title,contexts:contexts.length?contexts:(phone?['phone']:['computer']),duration:25,provenance:'atlas-dayline LIVE reality capture'});i.value=''};
document.getElementById('flFeedback').onclick=async()=>{const b=document.getElementById('flFeedback'),packet=api().feedback(),txt=JSON.stringify(packet,null,2);try{await navigator.clipboard.writeText(txt);b.textContent='COPIED';setTimeout(()=>b.textContent='COPY HANDOFF',1200)}catch{const blob=new Blob([txt],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='atlas-dayline-feedback.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}};
renderHandoff();sync();
})();