(function(root){
'use strict';

const Core={
 layerById(model,id){return(model?.layers||[]).find(x=>x.id===id)||(model?.transverse||[]).find(x=>x.id===id)||null},
 routeLimit(layer,n=3){return(layer?.routes||[]).slice(0,n)},
 donorList(model,layer,n=3){return(layer?.donors||[]).map(id=>model?.donors?.[id]).filter(Boolean).slice(0,n)}
};
root.HouseRealityHarnessCore=Core;
if(typeof module!=='undefined'&&module.exports)module.exports=Core;
if(typeof document==='undefined'||typeof window==='undefined')return;

const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let model=null,overlay=null,toggle=null,detail=null,active='ROOM';
let context=root.HOUSE_CONTEXT||{address:'',label:'',projection:'PLAN'};
let designState=null,runtimeWitness=null,crewFrame=null,crewOffer=null,crewResponse=null;

function style(){
 if(document.getElementById('houseRealityHarnessStyle'))return;
 const s=document.createElement('style');s.id='houseRealityHarnessStyle';
 s.textContent=`
 :root{--vio:#b392d6}
 .rhToggle{margin-left:auto;border-color:#4d5960;background:#0b0f12;color:#b9c3c7;font-size:8px;letter-spacing:.11em}.rhToggle.on{color:#eadfff;border-color:var(--vio);box-shadow:inset 0 -2px 0 rgba(179,146,214,.45)}
 .realityHarness{position:absolute;z-index:20;inset:42px 0 0;background:rgba(5,9,11,.975);backdrop-filter:blur(6px);overflow:auto;padding:10px}.realityHarness[hidden]{display:none}
 .rhGrid{min-height:100%;display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:10px}.rhField,.rhDetail{border:1px solid var(--line);background:#081014}.rhField{position:relative;min-height:500px;overflow:hidden}.rhField:before{content:"";position:absolute;inset:0;opacity:.16;pointer-events:none;background:repeating-radial-gradient(circle at 44% 50%,transparent 0 21px,#708087 22px 23px,transparent 24px 44px)}
 .rhField svg{position:relative;width:100%;height:100%;min-height:500px;display:block}.rhAxis{stroke:#526067;stroke-width:1;stroke-dasharray:4 7}.rhAxisLabel{fill:#839097;font:8px ui-monospace,monospace;letter-spacing:.12em}.rhRing{fill:none;stroke-width:11;opacity:.55;cursor:pointer;transition:.16s}.rhRing:hover,.rhRing.active{opacity:1;stroke-width:15}.rhRing.matter{stroke:#d57953}.rhRing.information{stroke:#6eb9df;stroke-dasharray:6 5}.rhRing.coupling{stroke:var(--vio);stroke-dasharray:2 4}.rhRingLabel{fill:#e8eeee;font:700 8px ui-monospace,monospace;letter-spacing:.1em;pointer-events:none}
 .rhCenter{fill:#0a1115;stroke:#dfe7e9;stroke-width:1.2}.rhCenterText{fill:#fff;font:800 12px system-ui,sans-serif}.rhCenterMeta{fill:#86949a;font:8px ui-monospace,monospace}.rhNode{cursor:pointer}.rhNode rect{fill:#0b1216;stroke:#526067}.rhNode:hover rect,.rhNode.active rect{stroke:var(--vio);stroke-width:2}.rhNode text{fill:#dce4e6;font:700 8px ui-monospace,monospace;letter-spacing:.08em;pointer-events:none}
 .rhDetail{padding:12px;display:grid;align-content:start;gap:10px}.rhDetail .rhEy{font-size:8px;letter-spacing:.16em;color:var(--vio)}.rhDetail h2{font:800 24px/1 system-ui,sans-serif;letter-spacing:-.045em;margin:0}.rhQuestion{font:12px/1.45 system-ui,sans-serif;color:#d9dede}.rhAuthority{border-left:2px solid var(--vio);padding-left:8px;color:#9da9ae;font-size:9px;line-height:1.45}.rhRoutes{display:grid;gap:5px}.rhRoutes a{display:grid;grid-template-columns:90px 1fr;gap:7px;border:1px solid var(--line);padding:7px;background:#0a0f12;color:var(--ink)}.rhRoutes a b{font-size:8px;letter-spacing:.08em}.rhRoutes a span{color:#879399;font:9px/1.35 system-ui,sans-serif}.rhDonors{display:flex;gap:5px;flex-wrap:wrap}.rhDonors a{border:1px solid #3e4850;padding:4px 6px;color:#9ecfea;font-size:8px}.rhPair{display:grid;gap:4px;border-top:1px solid var(--line);padding-top:8px}.rhPair div{font-size:8px;color:#9ba7ac}.rhPair b{color:#eee}.rhSignal{border:1px solid var(--line);padding:6px;font-size:8px;color:#aab4b8}.rhSignal strong{color:#fff}.rhFoot{position:absolute;left:10px;bottom:8px;color:#77858b;font:7px ui-monospace,monospace;letter-spacing:.08em}
 .crewFrame{display:grid;gap:7px;border:1px solid #4a4057;background:#0c0d12;padding:8px}.crewGate{display:grid;grid-template-columns:auto 1fr;gap:8px;align-items:center}.crewGate b{border:1px solid #69577b;padding:4px 6px;font-size:8px;color:#eadfff}.crewGate span{font:9px/1.35 system-ui,sans-serif;color:#adb6ba}.crewIntent{font:10px/1.4 system-ui,sans-serif}.crewIntent em{font-style:normal;color:#737f84}.crewNext{display:grid;gap:3px}.crewMove{display:grid;grid-template-columns:56px 1fr;gap:6px;border-top:1px solid #262a30;padding-top:4px}.crewMove b{font-size:7px;color:#a997be}.crewMove span{font:9px/1.35 system-ui,sans-serif}.crewDelta{font-size:7px;color:#7f8b91;letter-spacing:.07em}.crewOffer{border-left:2px solid #77c6e9;padding-left:7px;display:grid;gap:5px}.crewOffer strong{font-size:9px}.crewOffer ul{margin:0;padding-left:16px;color:#b7c1c5;font:9px/1.45 system-ui,sans-serif}.crewActions{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}.crewActions button{font-size:7px;min-height:29px;padding:5px 3px}.crewResponse{font-size:8px;color:#9dd29e}
 @media(max-width:850px){.realityHarness{inset:42px 0 0;padding:6px}.rhGrid{grid-template-columns:1fr}.rhField{min-height:390px}.rhField svg{min-height:390px}.rhDetail{min-height:230px}.rhRoutes a{grid-template-columns:80px 1fr}.rhFoot{display:none}}
 `;document.head.appendChild(s);
}

function ringMarkup(layer,cx,cy){const r=layer.radius||100,cls=layer.channel||'matter';return'<g data-rh-layer="'+esc(layer.id)+'"><circle class="rhRing '+esc(cls)+(active===layer.id?' active':'')+'" cx="'+cx+'" cy="'+cy+'" r="'+r+'"></circle><text class="rhRingLabel" x="'+cx+'" y="'+(cy-r+4)+'" text-anchor="middle">'+esc(layer.label)+'</text></g>'}
function nodeMarkup(x,y,w,label,id){return'<g class="rhNode '+(active===id?'active':'')+'" data-rh-layer="'+esc(id)+'"><rect x="'+x+'" y="'+y+'" width="'+w+'" height="34" rx="17"></rect><text x="'+(x+w/2)+'" y="'+(y+21)+'" text-anchor="middle">'+esc(label)+'</text></g>'}
function fieldMarkup(){
 const cx=300,cy=280,rings=(model.layers||[]).map(l=>ringMarkup(l,cx,cy)).join(''),trans=model.transverse||[],by=id=>trans.find(x=>x.id===id)||{id,label:id};
 return'<svg viewBox="0 0 720 560" role="img" aria-label="Reality stack around selected HOUSE address">'+
 '<line class="rhAxis" x1="'+cx+'" y1="16" x2="'+cx+'" y2="544"></line><line class="rhAxis" x1="16" y1="'+cy+'" x2="704" y2="'+cy+'"></line>'+
 '<text class="rhAxisLabel" x="'+(cx+8)+'" y="28">BEFORE ↑</text><text class="rhAxisLabel" x="'+(cx+8)+'" y="540">AFTER ↓ · TIME</text><text class="rhAxisLabel" x="20" y="'+(cy-8)+'">SOURCE / OBSERVE</text><text class="rhAxisLabel" x="596" y="'+(cy-8)+'">WITNESS / RETURN</text>'+rings+
 '<circle class="rhCenter" cx="'+cx+'" cy="'+cy+'" r="38"></circle><text class="rhCenterText" x="'+cx+'" y="'+(cy-4)+'" text-anchor="middle">'+esc(context.label||'SELECT LOCUS')+'</text><text class="rhCenterMeta" x="'+cx+'" y="'+(cy+13)+'" text-anchor="middle">'+esc(context.address||'—')+'</text>'+
 nodeMarkup(570,72,124,'CREW / AGENT','AGENT')+nodeMarkup(570,120,124,by('PEOPLE').label,'PEOPLE')+nodeMarkup(570,388,124,by('TIME').label,'TIME')+nodeMarkup(570,436,124,by('RETURN').label,'RETURN')+
 '<line class="rhAxis" x1="438" y1="160" x2="570" y2="89"></line><line class="rhAxis" x1="468" y1="220" x2="570" y2="137"></line><line class="rhAxis" x1="468" y1="340" x2="570" y2="405"></line><line class="rhAxis" x1="438" y1="400" x2="570" y2="453"></line></svg><div class="rhFoot">CONTAINMENT = RINGS · TIME = VERTICAL · EVIDENCE = HORIZONTAL · crew/people cross the spatial stack without becoming containment layers</div>'
}

function crewMarkup(){
 if(!crewFrame)return'<div class="crewFrame"><div class="rhEy">CREW SEAM</div><div class="note">Coordination frame loading. Native HOUSE authority remains unchanged.</div></div>';
 const g=crewFrame.human_gate||{},intent=crewFrame.intent?.text||'',moves=(crewFrame.next||[]).map(x=>'<div class="crewMove"><b>'+esc(x.owner||'CREW')+'</b><span>'+esc(x.label)+'</span></div>').join('');
 const delta=(crewFrame.changed||[]).join(' · ')||'NONE';
 let off='';
 if(crewOffer){off='<div class="crewOffer"><strong>OFFER · '+esc(crewOffer.from?.label||crewOffer.from?.id||'CREW')+'</strong><div class="note">'+esc(crewOffer.summary||'External bounded proposal')+'</div><ul>'+(crewOffer.proposals||[]).map(x=>'<li><b>'+esc(x.kind)+'</b> · '+esc(x.label)+(x.note?' — '+esc(x.note):'')+'</li>').join('')+'</ul><div class="crewActions"><button data-crew-response="KEEP">KEEP</button><button data-crew-response="PARK">PARK</button><button data-crew-response="WRONG_FRAME">WRONG FRAME</button></div></div>'}
 const resp=crewResponse?'<div class="crewResponse">LAST SIGNAL · '+esc(crewResponse.action)+' · coordination only</div>':'';
 return'<div class="crewFrame"><div class="rhEy">CREW SEAM · SHARED MINIMUM</div><div class="crewGate"><b>HUMAN '+esc(g.class||'NONE')+'</b><span>'+esc(g.reason||'')+'</span></div><div class="crewIntent">INTENT · '+(intent?esc(intent):'<em>not yet chosen</em>')+'</div><div class="crewNext">'+moves+'</div><div class="crewDelta">DELTA · '+esc(delta)+'</div>'+off+resp+'<div class="note">External workers may inspect / propose / check / draft / navigate. Offers never execute HOUSE, HA/HOUSEBUS, physical, purchase or communication effects.</div></div>'
}

function bindCrew(){
 detail.querySelectorAll('[data-crew-response]').forEach(b=>b.onclick=()=>{const x=root.HouseCrewSeam?.respond(b.dataset.crewResponse);if(x){crewResponse=x;if(b.dataset.crewResponse==='WRONG_FRAME')crewOffer=null;renderDetail()}})
}
function renderDetail(){
 if(!model||!detail)return;
 const layer=Core.layerById(model,active)||Core.layerById(model,'ROOM'),routes=Core.routeLimit(layer,3).map(r=>'<a href="'+esc(r.href)+'"><b>'+esc(r.label)+'</b><span>'+esc(r.role||'')+'</span></a>').join(''),donors=Core.donorList(model,layer,3).map(d=>'<a href="'+esc(d.url)+'" target="_blank" rel="noreferrer">'+esc(d.name)+'</a>').join(''),hc=model.harness_correspondence||{};
 let signal='';if(active==='ROOM'&&designState)signal='<div class="rhSignal">DESIGN · <strong>'+esc(designState.state||'—')+'</strong> · '+esc((designState.missing||[]).length?('missing '+designState.missing.join(' / ')):'RETURN READY')+'</div>';if((active==='HOUSE'||active==='NETWORK')&&runtimeWitness)signal='<div class="rhSignal">RUNTIME WITNESS · <strong>'+esc(runtimeWitness.freshness||'UNKNOWN')+'</strong> · '+esc(runtimeWitness.age_label||'—')+' old</div>';
 let pair='';if(active==='HARNESS')pair='<div class="rhPair"><div><b>HUMAN</b> · '+esc((hc.human||[]).join(' → '))+'</div><div><b>AGENT</b> · '+esc((hc.agent||[]).join(' → '))+'</div><div>'+esc(hc.status||'')+' · '+esc(hc.shared||'')+'</div></div>';
 const crew=active==='AGENT'?crewMarkup():'';
 detail.innerHTML='<div class="rhEy">REALITY LAYER · '+esc(active==='AGENT'?'CREW / AGENT':layer.id)+'</div><h2>'+esc(active==='AGENT'?'CREW / AGENT':layer.label)+'</h2><div class="rhQuestion">'+esc(active==='AGENT'?'Preserve a shared operational picture while asking the human only for irreducible choice or world evidence.':layer.question||'')+'</div>'+signal+'<div class="rhAuthority">'+esc(active==='AGENT'?'Coordination only. Agents may propose and carry context; native hosts and humans retain effects and decisions.':layer.authority||model.law||'')+'</div>'+crew+'<div class="rhRoutes">'+routes+'</div>'+(donors?'<div><div class="k">EXTANT DONORS / QUARRY</div><div class="rhDonors">'+donors+'</div></div>':'')+pair+'<div class="note">CENTER · '+esc(context.label||context.address||'no address selected')+' · '+esc(context.projection||'PLAN')+'</div>';
 bindCrew();
}
function bindLayerClicks(){overlay.querySelectorAll('[data-rh-layer]').forEach(n=>n.addEventListener('click',()=>{active=n.dataset.rhLayer;window.dispatchEvent(new CustomEvent('house:reality-layer',{detail:{layer:active,address:context.address}}));render()}))}
function render(){if(!overlay||!model)return;overlay.querySelector('.rhField').innerHTML=fieldMarkup();renderDetail();bindLayerClicks()}
function open(){overlay.hidden=false;toggle.classList.add('on');toggle.setAttribute('aria-expanded','true');render()}
function close(){overlay.hidden=true;toggle.classList.remove('on');toggle.setAttribute('aria-expanded','false')}
function loadScript(src){return new Promise((resolve,reject)=>{if([...document.scripts].some(s=>s.src&&s.src.endsWith(src.replace(/^\.\//,''))))return resolve();const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.head.appendChild(s)})}
function boot(){
 const stage=document.querySelector('.stage'),head=document.querySelector('.stageHead');if(!stage||!head)return;style();toggle=document.createElement('button');toggle.className='rhToggle';toggle.textContent='REALITY ◎';toggle.setAttribute('aria-expanded','false');head.appendChild(toggle);overlay=document.createElement('div');overlay.className='realityHarness';overlay.hidden=true;overlay.innerHTML='<div class="rhGrid"><div class="rhField"></div><div class="rhDetail"></div></div>';stage.appendChild(overlay);detail=overlay.querySelector('.rhDetail');toggle.onclick=()=>overlay.hidden?open():close();document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!overlay.hidden)close()});
 window.addEventListener('house:selection',e=>{context=Object.assign({},context,e.detail||{});if(!overlay.hidden)render()});window.addEventListener('house:design-state',e=>{designState=e.detail||null;if(!overlay.hidden&&(active==='ROOM'||active==='RETURN'||active==='AGENT'))renderDetail()});window.addEventListener('house:runtime-witness',e=>{runtimeWitness=e.detail||null;if(!overlay.hidden&&(active==='HOUSE'||active==='NETWORK'||active==='AGENT'))renderDetail()});window.addEventListener('house:crew-frame',e=>{crewFrame=e.detail||null;if(!overlay.hidden&&active==='AGENT')renderDetail()});window.addEventListener('house:crew-offer-accepted',e=>{crewOffer=e.detail||null;if(!overlay.hidden&&active==='AGENT')renderDetail()});window.addEventListener('house:crew-response',e=>{crewResponse=e.detail||null;if(!overlay.hidden&&active==='AGENT')renderDetail()});
 fetch('./reality-stack.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error(r.status);return r.json()}).then(d=>{model=d;root.HOUSE_REALITY_STACK=d;if(!overlay.hidden)render()}).catch(err=>{detail.innerHTML='<div class="warn">REALITY STACK UNAVAILABLE · '+esc(err.message)+'</div>'});
 loadScript('/lib/interphase-carrier.js').catch(()=>null).then(()=>loadScript('./crew-seam.js')).catch(()=>null);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(typeof globalThis!=='undefined'?globalThis:this);
