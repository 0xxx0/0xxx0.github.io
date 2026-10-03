/* HOUSE / HOMEBASE — projection-only return/prep instrument.
 * Reads existing HOUSE + BODY/FIT browser-local state and projects one selected
 * HOUSE locus through PREP → SET OUT → RETURN → SERVICE without creating a
 * second inventory store or acquiring HOUSEBUS/BODY/DAYLINE authority.
 *
 * v0.2 adds a fixed-locus camera-tableau: source-owned kit/service/fixture state
 * becomes spatially memorable stations while direct native-owner shortcuts remain.
 */
const FIT_KEY='0xxx0.body.fit.v01';
const HOUSE_LOCAL_KEY='houseSpatialLocalV02';
const HOUSE_BODY_KEY='0xxx0.house.body.context.v01';
const DAYLINE_KEY='atlas.dayline.handoff.v01';

const safeJson=(key,storage=localStorage)=>{try{return JSON.parse(storage.getItem(key)||'null')}catch(_){return null}};
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let model=null,runtimeWitness=window.HOUSE_RUNTIME_WITNESS||null,ctx=window.HOUSE_CONTEXT||null;

function installStyle(){
 if(document.getElementById('homebaseStyle'))return;
 const s=document.createElement('style');s.id='homebaseStyle';s.textContent=`
 .homebase{border:1px solid var(--line);background:linear-gradient(120deg,#0a0f12,#10171b 62%,#0b1013);margin:10px 0 0;display:grid;grid-template-columns:minmax(280px,1.28fr) minmax(340px,1.18fr) minmax(220px,.82fr);gap:1px;position:relative;overflow:hidden}
 .homebase:after{content:"";position:absolute;right:-70px;top:-100px;width:220px;height:220px;border:1px solid #26333a;transform:rotate(28deg);pointer-events:none}
 .hbCell{padding:11px 12px;min-width:0;border-right:1px solid var(--line);position:relative;z-index:1}.hbCell:last-child{border-right:0}
 .hbEy{font-size:7px;letter-spacing:.18em;color:var(--hot)}.hbTitle{font:850 clamp(20px,3.4vw,34px)/.92 system-ui,sans-serif;letter-spacing:-.045em;margin-top:4px}.hbSub{color:var(--mut);font-size:8px;margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 .hbTableau{margin-top:9px;border:1px solid #29363c;background:#070b0d;min-height:132px;position:relative;overflow:hidden;isolation:isolate}.hbTableau:before{content:"";position:absolute;left:7%;right:7%;top:13%;height:54%;border:1px solid #263239;background:linear-gradient(180deg,#0d1519,#0b1013);transform:perspective(330px) rotateX(-4deg);transform-origin:50% 0;z-index:-2}.hbTableau:after{content:"";position:absolute;left:-12%;right:-12%;bottom:-47%;height:80%;background:repeating-linear-gradient(90deg,transparent 0 12%,rgba(119,198,233,.08) 12.2% 12.5%),repeating-linear-gradient(0deg,transparent 0 19%,rgba(119,198,233,.06) 19.2% 19.6%);transform:perspective(240px) rotateX(63deg);transform-origin:50% 0;z-index:-1}.hbSceneHead{display:flex;justify-content:space-between;gap:7px;padding:7px 8px 0;font-size:6px;letter-spacing:.13em;color:#60727a}.hbSceneHead b{color:#9eb3bc}.hbStations{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;padding:18px 8px 9px;align-items:end}.hbStation{appearance:none;min-height:62px;padding:6px;border:1px solid #34454d;background:rgba(8,13,16,.88);display:grid;align-content:end;justify-items:start;text-align:left;gap:2px;cursor:pointer}.hbStation:hover,.hbStation:focus{border-color:var(--cool);outline:none}.hbStation b{font-size:7px;letter-spacing:.11em;color:#dbe9ee}.hbStation small{font:8px/1.25 system-ui,sans-serif;color:#8c9aa0;max-width:100%;overflow:hidden;text-overflow:ellipsis}.hbStation[data-state=hot]{border-color:#77563d}.hbStation[data-state=hot] b{color:var(--warn)}.hbStation[data-state=ready]{border-color:#405f67}.hbStation[data-state=ready] b{color:#bde7f5}.hbTableauLaw{padding:0 8px 7px;font-size:6px;color:#58686f;letter-spacing:.08em}
 .hbLoop{display:grid;grid-template-columns:repeat(6,1fr);gap:1px;background:var(--line);border:1px solid var(--line)}.hbPhase{background:#0a0f12;padding:7px 4px;text-align:center;font-size:7px;letter-spacing:.08em;color:#6f7d83}.hbPhase.on{color:#dff6ff;background:#10202a;box-shadow:inset 0 -2px 0 var(--cool)}
 .hbStats{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}.hbStat{border:1px solid #29363c;padding:3px 6px;color:var(--mut);font-size:7px}.hbStat b{color:var(--ink);font-weight:700}
 .hbKitRack{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px}.hbKit{border:1px solid #29363c;background:#0a0f12;padding:5px 6px;min-width:0;max-width:180px}.hbKit b{display:block;font-size:7px;color:#cfdee3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hbKit small{display:block;color:#66767d;font:7px/1.25 system-ui,sans-serif;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hbKit.active{border-color:var(--cool)}
 .hbActions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;margin-top:8px}.hbActions button,.hbActions a{min-height:36px;display:flex;align-items:center;justify-content:center;border:1px solid var(--line);background:#0b0f12;padding:7px 8px;color:var(--ink);font:inherit;font-size:7px;letter-spacing:.08em;text-decoration:none;cursor:pointer;text-align:center}.hbActions .primary{border-color:#507b8d;color:#dff6ff;background:#0c171d}.hbActions button:disabled{opacity:.42;cursor:default}
 .hbResidue{font:9px/1.45 system-ui,sans-serif;color:#a8b1b5;margin-top:8px}.hbLaw{font-size:7px;color:#65757c;margin-top:6px}.hbPorts{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px}.hbPorts a,.hbPorts button{border:0;border-bottom:1px solid #33444b;background:none;color:var(--cool);padding:3px 0;min-height:0;font-size:7px;letter-spacing:.08em;cursor:pointer}
 @media(max-width:1000px){.homebase{grid-template-columns:1fr 1fr}.hbCell:first-child{grid-column:1/-1;border-right:0;border-bottom:1px solid var(--line)}.hbCell:nth-child(2){border-right:1px solid var(--line)}}
 @media(max-width:700px){.homebase{grid-template-columns:1fr}.hbCell,.hbCell:first-child,.hbCell:nth-child(2){grid-column:auto;border-right:0;border-bottom:1px solid var(--line)}.hbCell:last-child{border-bottom:0}.hbLoop{grid-template-columns:repeat(6,minmax(52px,1fr));overflow-x:auto}.hbActions{grid-template-columns:1fr 1fr 1fr}}
 @media(max-width:520px){.homebase{margin-top:7px}.hbCell{padding:9px}.hbActions{grid-template-columns:1fr}.hbTitle{font-size:24px}.hbSub{white-space:normal}.hbPhase{padding:7px 2px;font-size:6px}.hbStations{grid-template-columns:repeat(2,1fr);padding-top:14px}.hbStation{min-height:54px}.hbTableau{min-height:174px}}
 `;document.head.appendChild(s);
}

function installShell(){
 if(document.getElementById('homebaseRail'))return document.getElementById('homebaseRail');
 const truth=document.querySelector('.truth'),layout=document.querySelector('.layout');if(!truth||!layout)return null;
 const el=document.createElement('section');el.id='homebaseRail';el.className='homebase';el.setAttribute('aria-live','polite');
 el.innerHTML=`<div class="hbCell"><div class="hbEy">HOUSE / HOMEBASE · CURRENT LOCUS</div><div class="hbTitle" id="hbTitle">HOME</div><div class="hbSub" id="hbAddress">waiting for HOUSE address</div><div class="hbTableau" id="hbTableau"><div class="hbSceneHead"><span>FIXED-LOCUS TABLEAU</span><b>PROJECTION · NOT MEASURED</b></div><div class="hbStations"><button class="hbStation" data-hb-station="rack"><b>READY RACK</b><small>BODY/FIT loadouts</small></button><button class="hbStation" data-hb-station="bench"><b>BENCH</b><small>service / return</small></button><button class="hbStation" data-hb-station="fixture"><b>FIXTURES</b><small>HOUSE anchors</small></button><button class="hbStation" data-hb-station="port"><b>PORT</b><small>set out / Dayline</small></button></div><div class="hbTableauLaw">DIEGETIC LOCATION FOR COMPREHENSION · DIRECT ROUTE FOR SPEED</div></div><div class="hbStats" id="hbStats"></div></div><div class="hbCell"><div class="hbEy">RETURN LOOP · NOT A QUEST LOG</div><div class="hbLoop" id="hbLoop"></div><div class="hbKitRack" id="hbKitRack"></div><div class="hbResidue" id="hbResidue">Source-owned state only. UNKNOWN stays unknown.</div><div class="hbLaw">CATALOG ≠ INVENTORY ≠ LOADOUT ≠ LOCATION · LOADOUT = PATCH, NOT REPLACEMENT · SET OUT ≠ COMPLETION</div></div><div class="hbCell"><div class="hbEy">NEAREST LAWFUL MOVES</div><div class="hbActions"><button class="primary" id="hbPrep">PREP LOADOUT →</button><button id="hbRun">SET OUT →</button><button id="hbService">SERVICE HERE</button></div><div class="hbPorts"><a href="/recovery/env0/">ENV-0 / HARNESS ↗</a><a href="/body/fit/">BODY / FIT ↗</a><button id="hbFixtures">FIXTURES / FIELD</button><a href="/house/expert.html">EXPERT ↗</a></div></div>`;
 layout.parentNode.insertBefore(el,layout);
 return el;
}

function fitState(){const d=safeJson(FIT_KEY);return d&&Array.isArray(d.kits)?d:{kits:[],returns:[],fittings:[],active_session:null}}
function houseLocal(){const d=safeJson(HOUSE_LOCAL_KEY);return d&&typeof d==='object'?d:{care:[]}}
function fixturesFor(address){return model?.anchors?.filter(a=>a.room===address)||[]}
function serviceFor(address){return (houseLocal().care||[]).filter(x=>x.address===address&&x.state!=='DONE'&&(x.kind==='MAINTENANCE'||x.kind==='SUPPLY'||x.kind==='CARE'))}
function returnsFor(address){return (fitState().returns||[]).filter(r=>r.house_ref?.area===address).sort((a,b)=>String(b.returned_at||'').localeCompare(String(a.returned_at||'')))}
function kitLabel(k){return k?.name||k?.label||k?.id||'KIT'}
function kitPurpose(k){return k?.purpose||k?.intent||k?.kind||'source-owned loadout'}
function fixtureLabel(a){return a?.label||a?.name||a?.id||'ANCHOR'}
function phase(){
 const f=fitState(),svc=ctx?serviceFor(ctx.address):[];
 if(svc.length)return'SERVICE';
 if(f.active_session)return'OUT';
 if((f.kits||[]).length)return'PREP';
 return'HOME';
}
function runtime(){return runtimeWitness||window.HOUSE_RUNTIME_WITNESS||{}}
function writeHouseContext(){
 if(!ctx)return null;const d=runtime();
 const packet={schema:'0xxx0/house-body-context/v0.1',generated_at:d.generated_at||null,source_age_class:d.source_age_class||d.source_age_at_generation||null,snapshot_freshness:d.freshness||null,runtime_health_class:d.runtime_health_class||d.runtime_health_at_generation||null,area:ctx.address,area_label:ctx.label,projection_schema:d.schema||null,classification:d.classification||null,source_route:'/house/',projection:'HOMEBASE',truth:'selected HOUSE address + timestamped public projection metadata; context only, not presence, inventory truth or causation'};
 localStorage.setItem(HOUSE_BODY_KEY,JSON.stringify(packet));return packet;
}
function goPrep(){writeHouseContext();location.assign('/body/fit/?from=house-homebase')}
function setOut(){
 const f=fitState(),s=f.active_session;if(!s){goPrep();return}
 writeHouseContext();const kit=s.kit_snapshot||{},packet={schema:'atlas-dayline-handoff/v0.1',id:'homebase-'+Date.now(),created_at:new Date().toISOString(),kind:'ACTION',source:{route:'/house/',object_id:ctx?.address||null,address:ctx?.address||null,label:ctx?.label||ctx?.address||'HOUSE',projection:'HOMEBASE',truth:'explicit SET OUT handoff over an existing BODY/FIT active session; not evidence of physical departure, task completion or effect'},payload:{contexts:['home',ctx?.address?'house:'+ctx.address:null,s.id?'loadout:'+s.id:null].filter(Boolean),replacePrefix:'house:',sourceRef:ctx?.address?'/house/#'+ctx.address:'/house/',provenance:'HOUSE HOMEBASE → existing BODY/FIT session → DAYLINE',notes:'SET OUT · '+(kit.name||'ACTIVE LOADOUT')+(kit.purpose?' · '+kit.purpose:'')},return_to:'/house/'};
 sessionStorage.setItem(DAYLINE_KEY,JSON.stringify(packet));location.assign('/dayline/?handoff=homebase')
}
function openService(){
 const b=document.querySelector('#views [data-view="CARE"]');if(b){b.click();setTimeout(()=>document.querySelector('.stage')?.scrollIntoView({block:'start',behavior:'smooth'}),40)}else location.hash='CARE';
}
function openFixtures(){const b=document.querySelector('#views [data-view="FIELD"]');if(b)b.click();else location.hash='FIELD'}
function wireStations(){
 const rack=document.querySelector('[data-hb-station="rack"]'),bench=document.querySelector('[data-hb-station="bench"]'),fixture=document.querySelector('[data-hb-station="fixture"]'),port=document.querySelector('[data-hb-station="port"]');
 if(rack)rack.onclick=goPrep;if(bench)bench.onclick=openService;if(fixture)fixture.onclick=openFixtures;if(port)port.onclick=setOut;
}
function renderTableau({f,fixtures,svc,active,latest}){
 const rack=document.querySelector('[data-hb-station="rack"]'),bench=document.querySelector('[data-hb-station="bench"]'),fixture=document.querySelector('[data-hb-station="fixture"]'),port=document.querySelector('[data-hb-station="port"]');
 const kits=f.kits||[],activeKit=active?.kit_snapshot||null;
 if(rack){rack.dataset.state=active?'ready':kits.length?'ready':'';rack.querySelector('small').textContent=active?'ACTIVE · '+kitLabel(activeKit):kits.length?kits.length+' kit'+(kits.length===1?'':'s')+' · '+kitLabel(kits[0]):'no loadout prepared'}
 if(bench){bench.dataset.state=svc.length?'hot':latest?'ready':'';bench.querySelector('small').textContent=svc.length?svc.length+' service delta'+(svc.length===1?'':'s'):latest?.next_change?'return · '+latest.next_change:'no returned residue asserted'}
 if(fixture){fixture.dataset.state=fixtures.length?'ready':'';fixture.querySelector('small').textContent=fixtures.length?fixtures.length+' anchors · '+fixtures.slice(0,2).map(fixtureLabel).join(' / '):'no anchors at locus'}
 if(port){port.dataset.state=active?'ready':'';port.querySelector('small').textContent=active?'Dayline ready · '+kitLabel(activeKit):'prep active loadout first'}
 wireStations();
}
function renderKitRack(f,active){
 const el=document.getElementById('hbKitRack');if(!el)return;const kits=f.kits||[];
 if(!kits.length){el.innerHTML='<span class="hbKit"><b>NO LOADOUT YET</b><small>PREP opens BODY/FIT; HOMEBASE stores nothing.</small></span>';return}
 el.innerHTML=kits.slice(0,4).map(k=>'<span class="hbKit '+(active&&(active.kit_id===k.id||active.kit_snapshot?.id===k.id)?'active':'')+'"><b>'+esc(kitLabel(k))+'</b><small>'+esc(kitPurpose(k))+'</small></span>').join('')+(kits.length>4?'<span class="hbKit"><b>+'+(kits.length-4)+' MORE</b><small>open BODY/FIT</small></span>':'');
}

function render(){
 const root=installShell();if(!root)return;ctx=window.HOUSE_CONTEXT||ctx;const f=fitState(),address=ctx?.address||null,fixtures=address?fixturesFor(address):[],svc=address?serviceFor(address):[],returns=address?returnsFor(address):[],p=phase(),active=f.active_session,latest=returns[0];
 document.title='HOUSE / HOMEBASE · Spatial State';const ey=document.querySelector('.top .ey'),intro=document.querySelector('.top p');if(ey)ey.textContent='HOUSE / HOMEBASE · APP-041 · SPATIAL CURRENT HEAD';if(intro)intro.textContent='A place you return to: prepare, set out, come back with evidence, service what changed. HOUSE owns locus; BODY/FIT owns loadout; ENV-0 owns coupling; HOUSEBUS owns private runtime truth.';
 const title=document.getElementById('hbTitle'),addr=document.getElementById('hbAddress'),stats=document.getElementById('hbStats'),loop=document.getElementById('hbLoop'),res=document.getElementById('hbResidue'),prep=document.getElementById('hbPrep'),run=document.getElementById('hbRun'),service=document.getElementById('hbService');
 if(title)title.textContent=(ctx?.label||'HOME').toUpperCase();if(addr)addr.textContent=(address||'NO ADDRESS')+' · '+p;
 if(stats)stats.innerHTML=[['ANCHORS',fixtures.length+(model?.instance_status&&model.instance_status!=='VERIFIED'?' · DONOR':'')],['KITS',(f.kits||[]).length],['ACTIVE RUN',active?'YES':'NO'],['SERVICE',svc.length]].map(([k,v])=>'<span class="hbStat">'+esc(k)+' <b>'+esc(v)+'</b></span>').join('');
 const phases=['HOME','PREP','OUT','RETURN','SERVICE','READY?'];if(loop)loop.innerHTML=phases.map(x=>'<span class="hbPhase '+(x===p?'on':'')+'">'+(x==='OUT'?'SET OUT':x)+'</span>').join('');
 renderKitRack(f,active);renderTableau({f,fixtures,svc,active,latest});
 if(res){let bits=[];if(active)bits.push('ACTIVE · '+(active.kit_snapshot?.name||active.id));if(latest?.next_change)bits.push('RETURN RESIDUE · '+latest.next_change);if(svc.length)bits.push(svc.length+' local service/care episode'+(svc.length===1?'':'s'));if(!bits.length)bits.push('No returned residue is asserted here. Readiness is not inferred from silence.');res.textContent=bits.join(' · ')}
 if(prep)prep.onclick=goPrep;if(run){run.textContent=active?'SET OUT → DAYLINE':'SET OUT · PREP FIRST';run.disabled=false;run.onclick=setOut}if(service){service.textContent=svc.length?'SERVICE HERE · '+svc.length:'SERVICE / RETURN';service.onclick=openService}
 const fx=document.getElementById('hbFixtures');if(fx)fx.onclick=openFixtures;
 root.dataset.phase=p;
}

installStyle();installShell();
fetch('/house/spatial/model.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(x=>{model=x;render()}).catch(()=>render());
window.addEventListener('house:selection',e=>{ctx=e.detail||window.HOUSE_CONTEXT||ctx;render()});
window.addEventListener('house:runtime-witness',e=>{runtimeWitness=e.detail||runtimeWitness;render()});
window.addEventListener('storage',e=>{if([FIT_KEY,HOUSE_LOCAL_KEY].includes(e.key))render()});
setTimeout(render,0);
