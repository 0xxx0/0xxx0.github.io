/* HOUSE / HOMEBASE — projection-only spatial dock.
 * The house is already the world. HOMEBASE binds one selected HOUSE locus to
 * source-owned BODY/FIT preparation, Dayline departure, RETURN residue and
 * local HOUSE service without creating another inventory/runtime authority.
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
 .homebase{border-bottom:1px solid var(--line);background:linear-gradient(110deg,#091014,#0e171c 58%,#0a1013);display:grid;grid-template-columns:minmax(220px,.95fr) minmax(360px,1.55fr);gap:1px;position:relative;overflow:hidden}
 .homebase:after{content:"";position:absolute;right:-72px;top:-126px;width:250px;height:250px;border:1px solid #26353c;transform:rotate(28deg);pointer-events:none;opacity:.7}
 .hbCell{padding:9px 10px;min-width:0;position:relative;z-index:1}.hbCell+.hbCell{border-left:1px solid var(--line)}
 .hbEy{font-size:7px;letter-spacing:.18em;color:var(--hot)}.hbTitle{font:850 clamp(19px,2.8vw,30px)/.94 system-ui,sans-serif;letter-spacing:-.045em;margin-top:3px}.hbSub{color:var(--mut);font-size:8px;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 .hbStations{display:flex;gap:4px;flex-wrap:wrap;margin-top:6px}.hbStation{border:1px solid #29363c;background:#0a0f12;padding:3px 6px;color:#b8c2c6;font-size:7px;max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hbStation.donor{border-style:dashed;color:#8d989d}
 .hbLoop{display:flex;gap:3px;align-items:center;flex-wrap:wrap}.hbPhase{padding:3px 5px;border-bottom:1px solid #26333a;font-size:6px;letter-spacing:.08em;color:#647278}.hbPhase.on{color:#dcf5ff;border-color:var(--cool);background:#0e1a20}.hbArrow{font-size:6px;color:#46545b}
 .hbState{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:start}.hbResidue{font:9px/1.4 system-ui,sans-serif;color:#abb5b9;margin-top:5px}.hbLaw{font-size:7px;color:#65757c;margin-top:4px}
 .hbActions{display:grid;grid-template-columns:repeat(3,minmax(92px,1fr));gap:4px}.hbActions button{min-height:34px;border:1px solid var(--line);background:#0b0f12;color:var(--ink);padding:6px 7px;font:inherit;font-size:7px;letter-spacing:.08em;cursor:pointer}.hbActions .primary{border-color:#507b8d;color:#dff6ff;background:#0c171d}.hbActions button:disabled{opacity:.42;cursor:default}
 .hbPorts{display:flex;gap:7px;flex-wrap:wrap;margin-top:6px}.hbPorts a,.hbPorts button{border:0;border-bottom:1px solid #33444b;background:none;color:var(--cool);padding:2px 0;min-height:0;font-size:7px;letter-spacing:.08em;cursor:pointer}
 @media(max-width:900px){.homebase{grid-template-columns:1fr}.hbCell+.hbCell{border-left:0;border-top:1px solid var(--line)}.hbState{grid-template-columns:1fr}.hbActions{grid-template-columns:repeat(3,1fr)}}
 @media(max-width:520px){.hbCell{padding:8px}.hbTitle{font-size:22px}.hbSub{white-space:normal}.hbActions{grid-template-columns:1fr 1fr 1fr}.hbActions button{min-width:0;padding:7px 3px}.hbPorts{gap:9px}.hbPhase{font-size:6px;padding:3px}}
 `;document.head.appendChild(s);
}

function installShell(){
 if(document.getElementById('homebaseRail'))return document.getElementById('homebaseRail');
 const stage=document.querySelector('.stage'),head=stage?.querySelector('.stageHead'),canvas=stage?.querySelector('.canvas');if(!stage||!head||!canvas)return null;
 const el=document.createElement('section');el.id='homebaseRail';el.className='homebase';el.setAttribute('aria-live','polite');
 el.innerHTML=`<div class="hbCell"><div class="hbEy">HOMEBASE · CURRENT LOCUS</div><div class="hbTitle" id="hbTitle">HOME</div><div class="hbSub" id="hbAddress">waiting for HOUSE address</div><div class="hbStations" id="hbStations"></div></div><div class="hbCell"><div class="hbState"><div><div class="hbEy">STASH → PREP → FIT → OUT → RETURN → SERVICE</div><div class="hbLoop" id="hbLoop"></div><div class="hbResidue" id="hbResidue">Source-owned state only. UNKNOWN stays unknown.</div><div class="hbLaw">HOUSE = place · BODY/FIT = loadout · ENV-0 = coupling · HOUSEBUS = private runtime</div></div><div class="hbActions"><button class="primary" id="hbPrep">PREP</button><button id="hbRun">SET OUT</button><button id="hbService">SERVICE</button></div></div><div class="hbPorts"><a href="/body/fit/">BODY / FIT ↗</a><a href="/recovery/env0/">ENV-0 / HARNESS ↗</a><button id="hbFixtures">ROOM / FIXTURES</button><a href="/house/expert.html">EXPERT ↗</a></div></div>`;
 head.insertAdjacentElement('afterend',el);return el;
}

function fitState(){const d=safeJson(FIT_KEY);return d&&Array.isArray(d.kits)?d:{kits:[],returns:[],fittings:[],active_session:null}}
function houseLocal(){const d=safeJson(HOUSE_LOCAL_KEY);return d&&typeof d==='object'?d:{care:[]}}
function fixturesFor(address){return model?.anchors?.filter(a=>a.room===address)||[]}
function serviceFor(address){return (houseLocal().care||[]).filter(x=>x.address===address&&x.state!=='DONE'&&(x.kind==='MAINTENANCE'||x.kind==='SUPPLY'||x.kind==='CARE'))}
function returnsFor(address){return (fitState().returns||[]).filter(r=>r.house_ref?.area===address).sort((a,b)=>String(b.returned_at||'').localeCompare(String(a.returned_at||'')))}
function phase(){
 const f=fitState(),svc=ctx?serviceFor(ctx.address):[];
 if(f.active_session)return'OUT';
 if(svc.length)return'SERVICE';
 if((f.kits||[]).length)return'PREP';
 return'HOME';
}
function runtime(){return runtimeWitness||window.HOUSE_RUNTIME_WITNESS||{}}
function stationLabel(a){return a?.label||a?.name||a?.id||'ANCHOR'}
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
function openService(){const b=document.querySelector('#views [data-view="CARE"]');if(b){b.click();setTimeout(()=>document.querySelector('.stage')?.scrollIntoView({block:'start',behavior:'smooth'}),40)}else location.hash='CARE'}
function openFixtures(){const b=document.querySelector('#views [data-view="FIELD"]');if(b)b.click();else location.hash='FIELD'}

function render(){
 const root=installShell();if(!root)return;ctx=window.HOUSE_CONTEXT||ctx;
 const f=fitState(),address=ctx?.address||null,fixtures=address?fixturesFor(address):[],svc=address?serviceFor(address):[],returns=address?returnsFor(address):[],p=phase(),active=f.active_session,latest=returns[0],donor=model?.instance_status&&model.instance_status!=='VERIFIED';
 document.title='HOUSE / HOMEBASE · Spatial State';const ey=document.querySelector('.top .ey'),intro=document.querySelector('.top p');if(ey)ey.textContent='HOUSE / HOMEBASE · APP-041 · SPATIAL CURRENT HEAD';if(intro)intro.textContent='One lived base over one addressed house: prepare at a locus, set out through BODY/FIT + Dayline, return with evidence, service what changed. HOUSEBUS stays private runtime truth.';
 const title=document.getElementById('hbTitle'),addr=document.getElementById('hbAddress'),stations=document.getElementById('hbStations'),loop=document.getElementById('hbLoop'),res=document.getElementById('hbResidue'),prep=document.getElementById('hbPrep'),run=document.getElementById('hbRun'),service=document.getElementById('hbService');
 if(title)title.textContent=(ctx?.label||'HOME').toUpperCase();
 if(addr){const kit=active?.kit_snapshot?.name||null;addr.textContent=(address||'NO ADDRESS')+' · '+p+(kit?' · LOADOUT '+kit:'')}
 if(stations){const shown=fixtures.slice(0,4);stations.innerHTML=shown.length?shown.map(a=>'<span class="hbStation '+(donor?'donor':'')+'">'+esc(stationLabel(a))+'</span>').join(''):'<span class="hbStation '+(donor?'donor':'')+'">NO ADDRESSED FIXTURE EVIDENCE</span>';if(fixtures.length>4)stations.innerHTML+='<span class="hbStation">+'+(fixtures.length-4)+' MORE</span>'}
 const phases=['HOME','PREP','OUT','RETURN','SERVICE'];if(loop)loop.innerHTML=phases.map((x,i)=>'<span class="hbPhase '+(x===p?'on':'')+'">'+(x==='OUT'?'SET OUT':x)+'</span>'+(i<phases.length-1?'<span class="hbArrow">→</span>':'')).join('');
 if(res){let bits=[];if(active)bits.push('ACTIVE LOADOUT · '+(active.kit_snapshot?.name||active.id));if(latest)bits.push('LAST RETURN'+(latest.next_change?' · '+latest.next_change:''));if(svc.length)bits.push(svc.length+' LOCAL SERVICE '+(svc.length===1?'ITEM':'ITEMS'));if(donor)bits.push('SPATIAL INSTANCE · RECOVERED DONOR / VERIFY');if(!bits.length)bits.push('No active run or returned residue asserted. READY is never inferred from silence.');res.textContent=bits.join(' · ')}
 if(prep)prep.onclick=goPrep;if(run){run.textContent=active?'SET OUT →':'PREP FIRST';run.onclick=setOut}if(service){service.textContent=svc.length?'SERVICE · '+svc.length:'SERVICE / RETURN';service.onclick=openService}
 const fx=document.getElementById('hbFixtures');if(fx)fx.onclick=openFixtures;root.dataset.phase=p;
}

installStyle();installShell();
fetch('/house/spatial/model.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(x=>{model=x;render()}).catch(()=>render());
window.addEventListener('house:selection',e=>{ctx=e.detail||window.HOUSE_CONTEXT||ctx;render()});
window.addEventListener('house:runtime-witness',e=>{runtimeWitness=e.detail||runtimeWitness;render()});
window.addEventListener('storage',e=>{if([FIT_KEY,HOUSE_LOCAL_KEY].includes(e.key))render()});
setTimeout(render,0);
