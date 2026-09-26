(()=>{'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const HANDOFF='field.awake.handoff.v01',DAYLINE='atlas.dayline.handoff.v01',SEEN='awake.visor.seen.v01';
const STAGES=[
 {wake:'WAKE',office:'SOURCE',prompt:'Receive the object before explaining it.'},
 {wake:'CUT',office:'FRAME',prompt:'Distinguish source, context, authority and boundary.'},
 {wake:'HOLD',office:'FOCUS',prompt:'Keep one exact thing in view.'},
 {wake:'TURN',office:'OPERATE',prompt:'Change projection only when it changes an available move.'},
 {wake:'TRACE',office:'WITNESS',prompt:'Record the observed delta, not the desired story.'},
 {wake:'AGAIN',office:'RETURN',prompt:'Release the frame; carry the trace back to its source.'}
];
const params=new URLSearchParams(location.search);
let manifest=null,routes=[],route='/',routeMeta=null,returnTo='/',host=null,adapter=null,capture=false,stage=0,lastWitness=null,marked=null,projectionIndex=0;
const projections=['PAGE','FOVEA','LINE','RING'];
function safeRoute(x){const s=String(x||'');return s.startsWith('/')&&!s.startsWith('//')&&!s.startsWith('/awake/')?s:'/'}
function readHandoff(){try{const h=JSON.parse(sessionStorage.getItem(HANDOFF)||'null');if(h?.schema==='field-awake-handoff/v0.1')return h}catch(_){}return null}
function titleFor(r){return r?.title||r?.head||r?.href||route}
function setStage(n){stage=Math.max(0,Math.min(5,Number(n)||0));$$('#cadence button').forEach((b,i)=>b.classList.toggle('on',i===stage));$('#office').textContent=STAGES[stage].wake+' / '+STAGES[stage].office;$('#officePrompt').textContent=STAGES[stage].prompt;if(stage===2)beginCapture();if(stage===3)turnProjection();if(stage===4)trace();if(stage===5)returnField()}
function clearMark(){if(marked?.isConnected){marked.style.outline=marked.dataset.awakeOutline||'';delete marked.dataset.awakeOutline}marked=null}
function describeFocus(){
 const f=host?.state?.focus?.at(-1);if(!f){$('#focusCard').hidden=true;return}
 let d=null;try{d=host.describe(f.id)}catch(_){}
 if(!d){$('#focusCard').hidden=true;return}
 $('#focusCard').hidden=false;$('#focusTitle').textContent=d.label||d.kind||'HELD OBJECT';$('#focusAddress').textContent=(d.kind||'object')+' · '+d.id;setStageVisual(2)
}
function setStageVisual(n){stage=n;$$('#cadence button').forEach((b,i)=>b.classList.toggle('on',i===stage));$('#office').textContent=STAGES[stage].wake+' / '+STAGES[stage].office;$('#officePrompt').textContent=STAGES[stage].prompt}
function beginCapture(){if(!host){return}capture=!capture;document.documentElement.dataset.capture=capture?'on':'off';$('#captureHint').hidden=!capture;$('#focusBtn').textContent=capture?'CANCEL FOCUS':'HOLD / FOCUS';if(capture)setStageVisual(2)}
function onFrameClick(e){
 if(!capture||!adapter||!host)return;
 const el=e.target?.nodeType===1?e.target:null;if(!el)return;
 e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();
 clearMark();marked=el;marked.dataset.awakeOutline=marked.style.outline||'';marked.style.outline='2px solid #c8a770';marked.style.outlineOffset='2px';
 host.select(el);host.focus(el,{aperture:'DETAIL'});capture=false;document.documentElement.dataset.capture='off';$('#captureHint').hidden=true;$('#focusBtn').textContent='HOLD / FOCUS';describeFocus();renderMeta()
}
function turnProjection(){
 if(!host)return;
 projectionIndex=(projectionIndex+1)%projections.length;const p=projections[projectionIndex];try{host.project(p)}catch(_){host.project('PAGE');projectionIndex=0}
 setStageVisual(3);renderMeta()
}
function trace(){
 if(!host)return;
 lastWitness=host.captureReturn('AWAKE TRACE');setStageVisual(4);renderMeta()
}
function interphasePacket(){
 if(!host)return null;const pr=host.projectionResult();return{schema:'interphase/v0.2/handoff',host:pr.host||host.id,projection:pr.projection||host.state.projection,object_id:route,selection:[...(pr.selection||[])],focus:(pr.focus||[]).map(x=>({id:x.id,aperture:x.aperture||'DETAIL'})),residue:(pr.residue||[]).map(x=>({id:x.id,channel:x.channel,projection:x.projection})),return_depth:host.returns?.length||0}
}
function daylinePacket(){
 const ip=interphasePacket(),f=host?.state?.focus?.at(-1);let desc=null;if(f){try{desc=host.describe(f.id)}catch(_){}}
 return{schema:'atlas-dayline-handoff/v0.1',id:'awake-'+Date.now(),created_at:new Date().toISOString(),kind:'TASK',source:{route,object_id:'route:'+route,label:titleFor(routeMeta),owner:routeMeta?.family||routeMeta?.operation||'FIELD ROUTE',address:desc?{interphase_id:desc.id,kind:desc.kind}:null},payload:{task:{title:'AWAKE · '+titleFor(routeMeta),contexts:['phone','computer'],duration:25,value:4,provenance:'AWAKE / INTERPHASE explicit handoff · '+route,sourceRef:route,notes:['AWAKE HELD ROUTE '+route,'INTERPHASE '+(ip?.projection||'PAGE'),desc?('FOCUS '+desc.id):'FOCUS route only',lastWitness?('WITNESS '+lastWitness.label):'WITNESS none','RETURN '+returnTo].join('\n')}},return_to:returnTo,interphase:ip}
}
function sendDayline(){try{sessionStorage.setItem(DAYLINE,JSON.stringify(daylinePacket()));location.assign('/dayline/?handoff=awake&interphase=FOVEA')}catch(_){$('#witness').textContent='HANDOFF FAILED'}}
function returnField(){location.assign(returnTo||('/?focus='+encodeURIComponent(route)))}
function renderMeta(){
 $('#routeTitle').textContent=titleFor(routeMeta);$('#owner').textContent=(routeMeta?.family||routeMeta?.operation||'FIELD').toUpperCase();$('#projection').textContent=host?.state?.projection||'PAGE';$('#witness').textContent=lastWitness?'TRACE HELD':'NO TRACE';$('#sourceLine').textContent=route+' · authority remains in native host'
}
function bootHost(){
 const frame=$('#hostFrame');clearMark();host=null;adapter=null;
 try{
  const doc=frame.contentDocument;if(!doc||!globalThis.Interphase||!globalThis.InterphaseDOM)throw Error('INTERPHASE_UNAVAILABLE');
  adapter=globalThis.InterphaseDOM.create(doc,{origin:location.origin});
  host=globalThis.Interphase.createHost(adapter,{id:'AWAKE:'+route,projection:'PAGE'});
  host.captureReturn('AWAKE ENTRY');doc.addEventListener('click',onFrameClick,true);
  projectionIndex=0;renderMeta();document.documentElement.dataset.awake='ready';
  if(params.get('smoke')==='1'){setTimeout(()=>{try{const target=doc.querySelector('main')||doc.body;host.select(target);host.focus(target,{aperture:'DETAIL'});describeFocus();const p=daylinePacket(),overflow=Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-document.documentElement.clientWidth,ok=route==='/docs/'&&host.state.focus.length===1&&p?.interphase?.schema==='interphase/v0.2/handoff'&&p?.source?.route==='/docs/'&&overflow<=1;document.documentElement.dataset.awakeOverflow=String(overflow);document.documentElement.dataset.awakeSmoke=ok?'pass':'fail'}catch(_){document.documentElement.dataset.awakeSmoke='fail'}},80)}
 }catch(e){document.documentElement.dataset.awake='degraded';$('#witness').textContent='HOST DEGRADED';console.error(e)}
}
function loadRoute(next,{push=true}={}){
 route=safeRoute(next);routeMeta=routes.find(r=>r.href===route)||{href:route,title:route==='/'?'FIELD INDEX':route,family:'FIELD'};
 if(push){const u=new URL(location.href);u.searchParams.set('focus',route);u.searchParams.delete('smoke');history.replaceState(null,'',u)}
 setStageVisual(0);lastWitness=null;$('#focusCard').hidden=true;$('#hostFrame').src=route;renderMeta();$('#routeDialog').open&&$('#routeDialog').close()
}
function renderRoutes(q=''){
 const needle=String(q).trim().toLowerCase(),xs=routes.filter(r=>r.href!=='/awake/'&&(!needle||[r.title,r.href,r.family,r.operation,r.role].join(' ').toLowerCase().includes(needle))).slice(0,120);
 $('#routeList').innerHTML=xs.map(r=>'<button type="button" class="routeItem" data-route="'+esc(r.href)+'"><b>'+esc(r.title||r.href)+'</b><span>'+esc(r.href)+' · '+esc(r.operation||r.kind||'VIEW')+'</span></button>').join('');
 $$('#routeList [data-route]').forEach(b=>b.onclick=()=>loadRoute(b.dataset.route))
}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function onboarding(){
 if(params.get('smoke')==='1')return;let seen=false;try{seen=localStorage.getItem(SEEN)==='1'}catch(_){}
 if(!seen)$('#onboard').hidden=false
}
async function start(){
 const h=readHandoff();if(h){route=safeRoute(h.source?.route||h.route);returnTo=String(h.return_to||('/?focus='+encodeURIComponent(route)));try{sessionStorage.removeItem(HANDOFF)}catch(_){}}else{route=safeRoute(params.get('focus')||'/');returnTo='/?focus='+encodeURIComponent(route)}
 try{manifest=await fetch('/showcase-manifest.json',{cache:'no-store'}).then(r=>r.json());routes=[{href:'/',title:'FIELD INDEX',family:'FIELD',operation:'OPERATE'},...(manifest.routes||[])];}catch(_){routes=[{href:'/',title:'FIELD INDEX',family:'FIELD',operation:'OPERATE'}]}
 renderRoutes();loadRoute(route,{push:false});onboarding()
}
$('#hostFrame').addEventListener('load',bootHost);$('#routeBtn').onclick=()=>{$('#routeDialog').showModal();$('#routeSearch').focus()};$('#routeSearch').oninput=e=>renderRoutes(e.target.value);$('#nativeBtn').onclick=()=>location.assign(route);$('#fieldBtn').onclick=returnField;$('#focusBtn').onclick=beginCapture;$('#daylineBtn').onclick=sendDayline;$('#returnBtn').onclick=returnField;
$$('#cadence button').forEach(b=>b.onclick=()=>setStage(+b.dataset.stage));
$('#enterBtn').onclick=()=>{try{localStorage.setItem(SEEN,'1')}catch(_){}$('#onboard').hidden=true};
globalThis.AwakeVisor=Object.freeze({state:()=>({route,stage,projection:host?.state?.projection||null,focus:[...(host?.state?.focus||[])],witness:lastWitness?structuredClone(lastWitness):null}),interphase:()=>interphasePacket(),daylinePacket:()=>daylinePacket(),focusSelector:s=>{const el=$('#hostFrame').contentDocument?.querySelector(s);if(!el||!host)return false;host.select(el);host.focus(el,{aperture:'DETAIL'});describeFocus();renderMeta();return true},loadRoute});
start();
})();