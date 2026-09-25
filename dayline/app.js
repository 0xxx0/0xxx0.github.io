(()=>{'use strict';
const STORE='poly-atlas-dayline-branch-i-public-v1',RETURN_STORE='poly-atlas-dayline-branch-i-public-last-return',HANDOFF='atlas.dayline.handoff.v01',SOURCE_RETURN='atlas.dayline.source-return.v01';
const $=s=>document.querySelector(s),clone=x=>JSON.parse(JSON.stringify(x)),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
let current=null,manifest=null,day=null,handoff=null,sessionStart=null,sessionEventStart=0,lastMoves=[],frame=null;
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const hm=s=>{const a=String(s||'00:00').split(':').map(Number);return (Number.isFinite(a[0])?a[0]:0)*60+(Number.isFinite(a[1])?a[1]:0)};
const mh=m=>{m=Math.round(m);return String(Math.floor(m/60)%24).padStart(2,'0')+':'+String((m%60+60)%60).padStart(2,'0')};
const localDateKey=(d=new Date())=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
function toast(s){const t=$('#toast');t.textContent=s;t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('on'),1300)}
function emptyDay(){return{meta:{title:'ATLAS DAYLINE',subtitle:'REALITY FIRST · EMPTY UNTIL CAPTURED',dayStart:'11:00',dayEnd:'23:00'},state:{now:null,contexts:['home','computer','phone'],horizon:180,sort:'focus',ink:'structure',lens:'atlas',selected:null,route:[]},anchors:[],tasks:[],events:[],evidence:{orient:[],miss:[],noise:[],friction:[],return:[]},undo:[]}}
function deviceMinute(d=day){const n=new Date(),m=n.getHours()*60+n.getMinutes(),lo=hm(d.meta.dayStart),hi=hm(d.meta.dayEnd);return clamp(Math.round(m/5)*5,lo,hi)}
function normalize(x){x=x&&typeof x==='object'?x:emptyDay();x.meta=x.meta||emptyDay().meta;x.state=x.state||emptyDay().state;x.tasks=Array.isArray(x.tasks)?x.tasks:[];x.anchors=Array.isArray(x.anchors)?x.anchors:[];x.events=Array.isArray(x.events)?x.events:[];x.undo=Array.isArray(x.undo)?x.undo:[];const ev=x.evidence||{};x.evidence={orient:ev.orient||[],miss:ev.miss||[],noise:ev.noise||[],friction:ev.friction||[],return:ev.return||[]};x.state.contexts=Array.isArray(x.state.contexts)?x.state.contexts:[];x.state.route=Array.isArray(x.state.route)?x.state.route.slice(0,3):[];if(!x.state.now)x.state.now=mh(deviceMinute(x));return x}
function loadDay(){try{return normalize(JSON.parse(localStorage.getItem(STORE)||'null'))}catch(_){return normalize(null)}}
function saveDay(){localStorage.setItem(STORE,JSON.stringify(day))}
function event(type,subject='',detail=''){const e={id:'e:'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),at:new Date().toISOString(),type,subject,detail};day.events.push(e);if(day.events.length>160)day.events=day.events.slice(-160);return e}
function core(x=day){return clone({meta:x.meta,state:x.state,anchors:x.anchors,tasks:x.tasks,evidence:x.evidence})}
function checkpoint(label='CHANGE'){day.undo=Array.isArray(day.undo)?day.undo:[];day.undo.push({at:new Date().toISOString(),label,core:core()});if(day.undo.length>15)day.undo=day.undo.slice(-15)}
function hash(x){let h=2166136261,s=JSON.stringify({tasks:x.tasks,anchors:x.anchors,state:x.state,evidence:x.evidence});for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(16).padStart(8,'0')}
function taskById(id){return day.tasks.find(t=>t.id===id)}
function openTasks(){return day.tasks.filter(t=>t.status!=='done')}
const LEGACY_IDS=new Set(['t:backup-verify','t:bench-reset','t:ipcam','t:print-test','t:wall-measure','t:maker-cart','t:litterbox','t:pickup','t:support-call']);
function isLegacySeed(){return day.tasks.length===9&&day.tasks.every(t=>LEGACY_IDS.has(t.id)&&t.provenance==='direct-day-plan')}
function sourceRoute(raw){const s=String(raw||'');const m=s.match(/(\/[^#|\s]+)/);return m?m[1]:''}
function ownerFor(route,provenance=''){const s=(route+' '+provenance).toLowerCase();if(s.includes('/house'))return'HOUSE';if(s.includes('/shopping'))return'SHOPPING';if(s.includes('/port/comms')||s.includes('/contact'))return'COMMS';if(s.includes('/body'))return'BODY';if(s.includes('/care'))return'CARE';if(s.includes('/atlas-dayline')||s.includes('/dayline'))return'DAYLINE';return'FIELD'}
function safeHandoff(){try{const h=JSON.parse(sessionStorage.getItem(HANDOFF)||'null');if(!h||h.schema!=='atlas-dayline-handoff/v0.1')return null;const age=Date.now()-Date.parse(h.created_at||0);if(!Number.isFinite(age)||age<0||age>43200000){sessionStorage.removeItem(HANDOFF);return null}return h}catch(_){return null}}
function routeRecord(href){return(manifest?.routes||[]).find(r=>r.href===href)||null}
function headForRoute(href){return(current?.current_heads||[]).find(h=>h.route===href)||null}
function explicitFocus(){const p=new URLSearchParams(location.search),tid=p.get('task'),href=p.get('focus');if(tid&&taskById(tid))return{kind:'task',task:taskById(tid)};if(href){const r=routeRecord(href);if(r)return{kind:'route',route:r}}return null}
function chooseFrame(){
 if(handoff)return{kind:'handoff',handoff};
 const ex=explicitFocus();if(ex)return ex;
 if(isLegacySeed())return{kind:'legacy'};
 const selected=taskById(day.state.selected);if(selected&&selected.status!=='done')return{kind:'task',task:selected};
 const routed=(day.state.route||[]).map(taskById).find(t=>t&&t.status!=='done');if(routed)return{kind:'task',task:routed};
 const first=openTasks()[0];if(first)return{kind:'task',task:first};
 const front=(current?.active_fronts||[])[0];if(front)return{kind:'front',front};
 return{kind:'empty'};
}
function frameView(f){
 if(f.kind==='legacy')return{title:'Legacy sample state is still stored on this phone',owner:'DAYLINE / LOCAL MIGRATION',address:'poly-atlas-dayline-branch-i-public-v1 · old demo fixture',meta:'These nine backup / bench / camera / print / pickup / support records match the retired first-run sample. They are not treated as current obligations here. Reset is explicit and undoable.',route:'',task:null}
 if(f.kind==='handoff'){const h=f.handoff,src=h.source||{},p=h.payload||{},title=h.kind==='CONTEXT'?'Context · '+(src.label||src.object_id||'HOUSE'):(p.task?.title||src.label||'Incoming object');return{title,owner:ownerFor(src.route||'',p.task?.provenance||''),address:src.route||src.object_id||'session handoff',meta:(h.kind||'').toUpperCase()+' · explicit source-owned handoff\n'+(p.task?.notes||''),route:src.route||'',task:null}}
 if(f.kind==='task'){const t=f.task,link=t.sourceLink&&typeof t.sourceLink==='object'?t.sourceLink:null,route=String(link?.source?.route||sourceRoute(t.fieldRef||t.sourceRef||t.provenance)||''),addr=link?.source?.address,exact=addr&&typeof addr==='object'?[addr.message_id,Number.isFinite(addr.start)&&Number.isFinite(addr.end)?addr.start+'-'+addr.end:null].filter(Boolean).join(' · '):'';return{title:t.title,owner:ownerFor(route,t.provenance),address:(route||'DAYLINE local')+' · '+t.id+(exact?' · '+exact:''),meta:(day.state.route.includes(t.id)?'RUN':'OPEN')+' · '+(t.earliest||day.meta.dayStart)+'–'+(t.latest||day.meta.dayEnd)+' · '+(t.duration||15)+'m\n'+(t.notes||''),route,task:t}}
 if(f.kind==='route'){const r=f.route,h=headForRoute(r.href);return{title:r.title||r.href,owner:'FIELD / '+String(r.operation||r.kind||'ROUTE'),address:r.href,meta:(h?.state||r.state||'')+'\n'+(h?.retained_function||r.role||''),route:r.href,task:null}}
 if(f.kind==='front'){const x=f.front;return{title:String(x.center||x.id||'CURRENT').replace(/\s*→\s*/g,' → '),owner:'FIELD / CURRENT',address:'/control/CURRENT.json#active_fronts/'+x.id,meta:x.objective||'',route:'/',task:null}}
 return{title:'No object held',owner:'DAYLINE',address:'local DayState · empty',meta:'Capture one real move or enter from HOUSE / SHOPPING / COMMS. Nothing is manufactured to fill the surface.',route:'',task:null}
}
function slug(s){return String(s||'item').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,34)||'item'}
function addTask(input={}){checkpoint('CREATE');const title=String(input.title||'').trim();if(!title)throw Error('title required');const lo=hm(day.meta.dayStart),hi=hm(day.meta.dayEnd),now=clamp(hm(day.state.now),lo,Math.max(lo,hi-5));let id='t:work-'+slug(title),n=2;while(taskById(id))id='t:work-'+slug(title)+'-'+n++;
 const earliest=String(input.earliest||mh(now)),latest=String(input.latest||day.meta.dayEnd),t={id,title,contexts:Array.isArray(input.contexts)&&input.contexts.length?input.contexts:[...day.state.contexts],duration:clamp(Number(input.duration)||25,5,180),value:clamp(Number(input.value)||4,1,5),earliest,latest:hm(latest)>hm(earliest)?latest:day.meta.dayEnd,setup:clamp(Number(input.setup)||1,0,5),depends:Array.isArray(input.depends)?input.depends:[],status:'open',sourceClass:input.sourceClass||'USER',provenance:String(input.provenance||'dayline-confluence capture'),notes:String(input.notes||''),fieldRef:input.fieldRef||input.sourceRef||null,sourceLink:input.sourceLink&&typeof input.sourceLink==='object'?clone(input.sourceLink):null};
 day.tasks.push(t);day.state.selected=t.id;event('CREATE',t.id,t.fieldRef||t.provenance);saveDay();return t}
function applyHandoff(){if(!handoff)return;const h=handoff,p=h.payload||{};if(h.kind==='CONTEXT'){checkpoint('CONTEXT_HANDOFF');const xs=(p.contexts||[]).map(String).filter(Boolean),prefix=String(p.replacePrefix||''),base=day.state.contexts.filter(x=>!prefix||!String(x).startsWith(prefix));day.state.contexts=[...new Set([...base,...xs])];event('CONTEXT_HANDOFF',String(p.sourceRef||h.source?.route||''),xs.join(','));saveDay()}
 else if(h.kind==='TASK'){const t=p.task||{};addTask({...t,sourceClass:'IMPORTED',fieldRef:t.sourceRef||h.source?.route||null,provenance:t.provenance||('explicit handoff · '+(h.source?.route||'source')),sourceLink:{handoff_id:h.id||null,return_to:h.return_to||'',source:clone(h.source||{}),kind:h.kind||'TASK'}})}
 else throw Error('unsupported handoff');
 sessionStorage.removeItem(HANDOFF);handoff=null;render();toast('Handoff accepted')}
function clearHandoff(){sessionStorage.removeItem(HANDOFF);handoff=null;render();toast('Handoff cleared')}
function runTask(id){if(day.state.route.includes(id))return;if(day.state.route.length>=3){toast('RUN is full · 3/3');return}checkpoint('ACT');day.state.route.push(id);day.state.selected=id;event('ACT',id,'dayline-confluence');saveDay();render()}
function completeTask(id){const t=taskById(id);if(!t)return;checkpoint('DONE');t.status='done';day.state.route=day.state.route.filter(x=>x!==id);event('DONE',id);saveDay();render();toast('Marked done')}
function reopenTask(id){const t=taskById(id);if(!t)return;checkpoint('REOPEN');t.status='open';day.state.selected=id;event('REOPEN',id);saveDay();render()}
function resetLegacy(){if(!isLegacySeed())return;const old=core();day=normalize(null);day.undo=[{at:new Date().toISOString(),label:'LEGACY_SAMPLE_RESET',core:old}];event('RESET_LEGACY_SAMPLE','','retired direct-day-plan fixture');saveDay();sessionStart=core();sessionEventStart=day.events.length;render();toast('Legacy sample cleared · undo preserved')}
function adoptFrame(){if(frame.kind==='front'){const x=frame.front;addTask({title:x.objective||x.center||x.id,contexts:[...day.state.contexts],value:5,duration:25,sourceClass:'IMPORTED',provenance:'FIELD CURRENT '+(current?.updated||'')+' · '+x.id,fieldRef:'/control/CURRENT.json#active_fronts/'+x.id});render();toast('Adopted into today');return}
 if(frame.kind==='route'){const r=frame.route,h=headForRoute(r.href),nx=h?.next_executable?.objective;addTask({title:nx||('Advance '+(r.title||r.href)),contexts:[...day.state.contexts],value:4,duration:25,sourceClass:'IMPORTED',provenance:'FIELD route explicit adoption · '+r.href,fieldRef:r.href,notes:h?.next_executable?.law||r.role||''});render();toast('Adopted into today')}}
function syncNow(){const prev=day.state.now,next=mh(deviceMinute(day));if(prev===next){toast('NOW already '+next);return}checkpoint('SYNC_NOW');day.state.now=next;event('TIME_SYNC','',prev+' → '+next);saveDay();render();toast('NOW '+next)}
function recordWitness(){frame=chooseFrame();const v=frameView(frame),t=v.task,note=$('#witnessInput').value.trim();if(!t){toast('Accept/adopt an object first');return}if(!note)return;checkpoint('WITNESS');day.evidence.return.push({at:new Date().toISOString(),task:t.id,note,kind:'WITNESS'});event('EVIDENCE','return',t.id);saveDay();$('#witnessInput').value='';render();toast('Witness recorded')}
function lastWitnessFor(id){return[...(day.evidence.return||[])].reverse().find(x=>x.task===id)||null}
function move(label,action,cls=''){return{label,action,cls}}
function hrefMove(label,href,cls='secondary'){return{label,href,cls}}
function movesFor(f){
 const v=frameView(f),out=[];
 if(f.kind==='legacy'){out.push(move('RESET LEGACY SAMPLE',resetLegacy,'primary'));out.push(hrefMove('FIELD NOW ↗','/'));out.push(hrefMove('KEEP / ATLAS ↗','/atlas-dayline/?live=1'));return out}
 if(f.kind==='handoff'){out.push(move(f.handoff.kind==='CONTEXT'?'APPLY CONTEXT':'ADD TO DAY',applyHandoff,'primary'));if(v.route)out.push(hrefMove('OPEN SOURCE ↗',v.route));out.push(move('CLEAR',clearHandoff));return out.slice(0,3)}
 if(f.kind==='task'){const t=f.task;if(t.status==='done')out.push(move('REOPEN',()=>reopenTask(t.id),'primary'));else if(day.state.route.includes(t.id))out.push(move('COMPLETE',()=>completeTask(t.id),'good'));else out.push(move('RUN',()=>runTask(t.id),'primary'));if(v.route)out.push(hrefMove('SOURCE ↗',v.route));out.push(hrefMove('ATLAS ↗','/atlas-dayline/?live=1'));return out.slice(0,3)}
 if(f.kind==='front'||f.kind==='route'){out.push(move('ADOPT TODAY',adoptFrame,'primary'));out.push(hrefMove(f.kind==='route'?'OPEN SOURCE ↗':'FIELD ↗',v.route||'/'));out.push(hrefMove('ATLAS ↗','/atlas-dayline/?live=1'));return out.slice(0,3)}
 out.push(hrefMove('FIELD NOW ↗','/'));out.push(hrefMove('HOUSE ↗','/house/spatial/'));out.push(hrefMove('COMMS ↗','/port/comms/'));return out
}
function renderMoves(xs){const host=$('#moves');host.textContent='';xs.forEach((m,i)=>{if(m.href){const a=document.createElement('a');a.href=m.href;a.className=m.cls||'';a.textContent=String(i+1).padStart(2,'0')+' · '+m.label;host.appendChild(a)}else{const b=document.createElement('button');b.className=m.cls||'';b.textContent=String(i+1).padStart(2,'0')+' · '+m.label;b.onclick=m.action;host.appendChild(b)}});$('#moveCount').textContent=xs.length+'/3'}
function returnPacket(){
 const before=clone(sessionStart),after=core(),delta=day.events.slice(sessionEventStart),changed=hash(before)!==hash(after)||delta.length>0,dev=mh(deviceMinute(day)),held=chooseFrame(),v=frameView(held),last=v.task?lastWitnessFor(v.task.id):null,sourceLink=v.task?.sourceLink&&typeof v.task.sourceLink==='object'?clone(v.task.sourceLink):null;
 return{kind:'poly-atlas-return-f',version:3,carrier:'dayline-confluence/v0.2',returnClass:changed?'WORLD_DELTA':'ORIENTATION_SNAPSHOT',worldKey:'dayline:'+localDateKey(),generatedAt:new Date().toISOString(),clockWitness:{canonicalNow:day.state.now,deviceLocalNow:dev,deltaMinutes:hm(day.state.now)-hm(dev)},focus:{kind:held.kind,title:v.title,owner:v.owner,address:v.address,taskId:v.task?.id||null,sourceRoute:v.route||null,sourceLink},moves:lastMoves.map(x=>x.label),witness:last||null,before,after,afterChecksum:hash(after),eventIds:delta.map(e=>e.id),delta,evidence:clone(day.evidence),nextRoutes:(day.state.route||[]).map(id=>({id,title:taskById(id)?.title||id}))}
}
function publishSourceReturn(packet){
 const link=packet?.focus?.sourceLink,task=packet?.focus?.taskId?taskById(packet.focus.taskId):null;if(!link?.return_to||!link?.source||!task)return null;
 const offer={schema:'atlas-dayline-source-return/v0.1',id:'dayline-return-'+Date.now()+'-'+task.id,created_at:new Date().toISOString(),authority:'OFFER_ONLY',source:clone(link.source),return_to:String(link.return_to),handoff_id:link.handoff_id||null,task:{id:task.id,title:task.title,status:task.status,fieldRef:task.fieldRef||null},witness:{return_class:packet.returnClass,after_checksum:packet.afterChecksum,event_ids:[...(packet.eventIds||[])],clock:clone(packet.clockWitness||null),note:packet.witness?.note||null},proposed_native_state:task.status==='done'?'COVERED':'OPEN',law:'Dayline offers evidence for the held object only; native source explicitly accepts, rejects, defers or ignores any state change.'};
 try{sessionStorage.setItem(SOURCE_RETURN,JSON.stringify({schema:'atlas-dayline-source-return-bundle/v0.1',created_at:new Date().toISOString(),offers:[offer]}))}catch(_){}
 return offer
}
function readSourceReturn(){
 try{const b=JSON.parse(sessionStorage.getItem(SOURCE_RETURN)||'null');if(!b||b.schema!=='atlas-dayline-source-return-bundle/v0.1'||!Array.isArray(b.offers))return null;const age=Date.now()-Date.parse(b.created_at||0);if(!Number.isFinite(age)||age<0||age>43200000){sessionStorage.removeItem(SOURCE_RETURN);return null}return b.offers[0]||null}catch(_){return null}
}
function renderSourceReturn(){const a=$('#returnSourceBtn'),o=readSourceReturn();if(!a)return;if(!o?.return_to){a.hidden=true;a.removeAttribute('href');return}a.hidden=false;a.href=o.return_to;a.textContent='RETURN TO SOURCE ↩'}
async function doReturn(){const packet=returnPacket(),offer=publishSourceReturn(packet),txt=JSON.stringify(packet,null,2);localStorage.setItem(RETURN_STORE,txt);event('RETURN',packet.focus.taskId||'',packet.afterChecksum);saveDay();try{await navigator.clipboard.writeText(txt);toast(offer?'RETURN copied · source offer ready':'RETURN copied')}catch(_){prompt('Copy RETURN:',txt)}$('#returnClass').textContent=packet.returnClass;$('#returnMeta').textContent=packet.afterChecksum+' · '+packet.eventIds.length+' events · source '+(packet.focus.sourceRoute||packet.focus.owner)+(offer?' · OFFER ONLY':'');sessionStart=core();sessionEventStart=day.events.length;render()}
function renderDepth(){const heads=(current?.current_heads||[]).filter(h=>['atlas-dayline','house-spatial','shopping-field','comms','field-index'].includes(h.lineage));$('#depthState').textContent='CURRENT '+(current?.updated||'—')+'\n'+heads.map(h=>h.lineage+' · '+h.version+' · '+h.state).join('\n')}
function render(){
 frame=chooseFrame();const v=frameView(frame),dev=mh(deviceMinute(day)),drift=hm(day.state.now)-hm(dev),last=v.task?lastWitnessFor(v.task.id):null;document.body.dataset.clockDrift=Math.abs(drift)>=10?'1':'0';
 $('#truth').textContent='CURRENT '+(current?.updated||'—')+' · NOW '+day.state.now+(drift?' · clock '+(drift>0?'+':'')+drift+'m':'');
 $('#owner').textContent=v.owner;$('#address').textContent=v.address;$('#focusTitle').textContent=v.title;$('#focusMeta').textContent=v.meta||'';lastMoves=movesFor(frame);renderMoves(lastMoves);
 const witnessable=!!v.task;$('#witnessInput').disabled=!witnessable;$('#witnessBtn').disabled=!witnessable;$('#witnessState').textContent=witnessable?(last?'RECORDED':'READY'):'ACCEPT / ADOPT FIRST';$('#lastWitness').textContent=last?(new Date(last.at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})+' · '+last.note):'';
 const stored=(()=>{try{return JSON.parse(localStorage.getItem(RETURN_STORE)||'null')}catch(_){return null}})();$('#returnClass').textContent=stored?.returnClass||'READY';renderSourceReturn();renderDepth();document.body.dataset.daylineWorkfield='ready'
}
async function boot(){day=loadDay();handoff=safeHandoff();sessionStart=core();sessionEventStart=day.events.length;const [c,m]=await Promise.all([fetch('/control/CURRENT.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null),fetch('/showcase-manifest.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null)]);current=c;manifest=m;render()}
$('#captureForm').onsubmit=e=>{e.preventDefault();const i=$('#captureInput'),title=i.value.trim();if(!title)return;addTask({title,contexts:[...day.state.contexts],duration:25,value:4,provenance:'dayline-confluence direct capture'});i.value='';render();toast('Captured')};
$('#witnessBtn').onclick=recordWitness;$('#returnBtn').onclick=doReturn;$('#syncNowBtn').onclick=syncNow;
window.DaylineConfluence=Object.freeze({snapshot:()=>clone(day),returnPacket:()=>returnPacket(),acceptHandoff:()=>applyHandoff(),sourceReturn:()=>clone(readSourceReturn())});
boot();
})();