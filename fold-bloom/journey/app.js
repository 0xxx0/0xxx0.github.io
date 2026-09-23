import {decodeExperienceSet} from '../experience-set/experience-set.js';
import {buildJourneyPlan,journeyAddress,nextJourneyIndex,makeJourneyReturn} from './journey-core.js';
import {getLocalMedia,putLocalMedia,normalizeLocalMediaId,requestPersistentLocalStorage} from '../local-media-store.js';
import {buildShareableSeedDemo} from './demo-seed.js';

const $=s=>document.querySelector(s),SET_STORE='fold-bloom.set-compositor.v01',META_STORE='fold-bloom.set-compositor.meta.v01';
const audioA=$('#audioA'),audioB=$('#audioB');
let set=null,meta={},plan=null,records=new Map(),urls=new Map(),index=0,current=audioA,other=audioB,playing=false,transition=null,startedAt=null,completedAt=null,events=[],demo=false,demoWitness=false,demoClock={progress:0,started:0,cellMs:7800},raf=0;

function toast(text){const el=$('#toast');el.textContent=text;el.classList.remove('on');void el.offsetWidth;el.classList.add('on')}
function fmt(value){const t=Math.max(0,Number(value)||0),m=Math.floor(t/60),s=t-m*60;return `${String(m).padStart(2,'0')}:${s.toFixed(1).padStart(4,'0')}`}
function now(){return new Date().toISOString()}
function labelFor(sourceId){return meta[sourceId]?.name||meta[sourceId]?.title||records.get(sourceId)?.name||sourceId}
function roleFor(sourceId){return meta[sourceId]?.role||'SOURCE CELL'}
function setStatus(text){$('#systemState').textContent=text}
function objectUrl(sourceId){
  if(urls.has(sourceId))return urls.get(sourceId);
  const record=records.get(sourceId);if(!record?.blob)return null;
  const url=URL.createObjectURL(record.blob);urls.set(sourceId,url);return url;
}
function cleanupUrls(){for(const url of urls.values())URL.revokeObjectURL(url);urls.clear()}

async function probeDuration(record){
  const hinted=Number(record?.meta?.durationSeconds||record?.meta?.duration||0);if(hinted>0)return hinted;
  return new Promise(resolve=>{
    const audio=document.createElement('audio'),url=URL.createObjectURL(record.blob),done=value=>{URL.revokeObjectURL(url);resolve(Number.isFinite(value)?value:0)};
    const timer=setTimeout(()=>done(0),6000);audio.preload='metadata';audio.onloadedmetadata=()=>{clearTimeout(timer);done(audio.duration)};audio.onerror=()=>{clearTimeout(timer);done(0)};audio.src=url;
  });
}

async function hashFile(file){
  const bytes=await file.arrayBuffer(),hash=await crypto.subtle.digest('SHA-256',bytes);
  return 'sha256:'+Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
}

async function bindFiles(files){
  const xs=[...(files||[])];if(!xs.length)return;
  requestPersistentLocalStorage().catch(()=>false);setStatus(`HASHING ${xs.length} LOCAL SOURCE${xs.length===1?'':'S'}`);
  for(const file of xs){
    try{
      const sourceId=await hashFile(file);
      await putLocalMedia({sourceId,blob:file,name:file.name,type:file.type,size:file.size,lastModified:file.lastModified||0,meta:{origin:'JOURNEY',storedAt:now()}});
    }catch(error){console.warn(error);toast('ONE SOURCE FAILED')}
  }
  await hydrate();toast('LOCAL SOURCES BOUND');
}

function readSetStorage(){
  const raw=localStorage.getItem(SET_STORE);if(!raw)throw new Error('No authored SET found in this browser');
  set=decodeExperienceSet(raw);
  try{meta=JSON.parse(localStorage.getItem(META_STORE)||'{}')||{}}catch(_){meta={}}
  return set;
}

async function importSet(file){
  set=decodeExperienceSet(await file.text());
  try{localStorage.setItem(SET_STORE,JSON.stringify(set))}catch(_){}
  await hydrate();toast('SET IMPORTED');
}

async function hydrate(){
  if(!set){render();return}
  cleanupUrls();records=new Map();
  const bindings=[];
  for(const entry of set.entries){
    const record=await getLocalMedia(entry.sourceId).catch(()=>null);
    if(record){records.set(entry.sourceId,record);bindings.push({sourceId:entry.sourceId,duration:await probeDuration(record),label:labelFor(entry.sourceId),available:true})}
  }
  plan=buildJourneyPlan(set,bindings);index=Math.min(index,Math.max(0,plan.entries.length-1));transition=null;completedAt=null;
  render();
  setStatus(plan.ready?'LOCAL · READY':`LOCAL · ${plan.missing.length} SOURCE${plan.missing.length===1?'':'S'} MISSING`);
}

async function loadSeedDemo(){
  const response=await fetch('../test-packs/catalog.json',{cache:'no-store'});
  if(!response.ok)throw new Error('seed catalog '+response.status);
  const catalog=await response.json(),built=buildShareableSeedDemo(catalog,{timestamp:now()});
  set=built.set;meta=built.meta;plan=buildJourneyPlan(set,built.bindings);
  demo=true;demoWitness=true;index=0;transition=null;startedAt=null;completedAt=null;events=[];
  demoClock={progress:0,started:performance.now(),cellMs:7800};
}

function currentEntry(){return plan?.entries?.[index]||null}
function recordEvent(type,extra={}){
  const entry=currentEntry(),sourceTime=entry?(demoWitness?(entry.duration||0)*demoClock.progress:(current.currentTime||0)):0,address=entry?journeyAddress(plan,index,sourceTime):null;
  events.push({type,entryIndex:index,sourceId:entry?.sourceId||'',sourceTime:address?.sourceTime||0,journeyTime:address?.journeyTime||0,law:extra.law||entry?.law||null,at:now(),...extra});
}
function setAudioSource(player,entry){
  const url=objectUrl(entry.sourceId);if(!url)return false;
  if(player.src!==url)player.src=url;player.preload='auto';return true;
}
function phase(law='IDLE'){$('#stage').dataset.phase=law;$('#seamState').textContent=law}

async function enter(indexValue,{autoplay=false,preserveTime=0}={}){
  if(!plan?.entries?.length)return;
  if(demoWitness){
    index=Math.max(0,Math.min(plan.entries.length-1,Number(indexValue)||0));transition=null;completedAt=null;
    demoClock.progress=0;demoClock.started=performance.now();phase(currentEntry()?.law||'CUT');render();recordEvent('ENTER',{mode:'DEMO_WITNESS'});
    if(autoplay){startedAt ||= now();playing=true}
    return;
  }
  index=Math.max(0,Math.min(plan.entries.length-1,Number(indexValue)||0));transition=null;
  current.pause();other.pause();current.volume=1;other.volume=0;
  const entry=currentEntry(),bound=setAudioSource(current,entry);
  if(bound){try{current.currentTime=Math.max(0,Math.min(entry.duration||0,preserveTime||0))}catch(_){} }
  phase(entry.law);render();recordEvent('ENTER');
  if(autoplay&&bound){startedAt ||= now();await current.play().catch(()=>{});playing=!current.paused}
}

async function advance({manual=false}={}){
  const entry=currentEntry(),next=nextJourneyIndex(plan,index);
  if(next===null){playing=false;completedAt=now();recordEvent('RETURN',{law:'RETURN'});phase('RETURN');render();setStatus(demoWitness?'DEMO RETURNED · AUDIO REMAINED PRIVATE':'RETURNED · JOURNEY COMPLETE');return}
  if(demoWitness){
    recordEvent(manual?'MANUAL_NEXT':'SEAM',{law:entry.law||'CUT',mode:'DEMO_WITNESS'});index=next;demoClock.progress=0;demoClock.started=performance.now();phase(currentEntry()?.law||'CUT');render();return;
  }
  const law=entry.law||'CUT';recordEvent(manual?'MANUAL_NEXT':'SEAM',{law});
  if(law==='RESET'&&!manual){phase('RESET');current.pause();await new Promise(r=>setTimeout(r,650))}
  [current,other]=[other,current];
  await enter(next,{autoplay:playing||!current.paused});
}

async function beginDissolve(){
  if(transition||!playing)return;
  const next=nextJourneyIndex(plan,index);if(next===null)return;
  const nextEntry=plan.entries[next],url=objectUrl(nextEntry.sourceId);if(!url)return;
  transition={from:index,to:next,started:performance.now(),duration:2400};phase('DISSOLVE');
  other.src=url;other.currentTime=0;other.volume=0;await other.play().catch(()=>{});recordEvent('DISSOLVE_START',{law:'DISSOLVE'});
}

function finishDissolve(){
  if(!transition)return;
  current.pause();current.volume=1;other.volume=1;[current,other]=[other,current];index=transition.to;transition=null;recordEvent('DISSOLVE_COMPLETE',{law:'DISSOLVE'});phase(currentEntry()?.law||'CUT');render();
}

function renderRail(){
  const rail=$('#rail');rail.replaceChildren();
  if(!plan)return;
  plan.entries.forEach((entry,i)=>{
    const cell=document.createElement('article');cell.className='cell'+(i===index?' on':i<index?' done':'');
    cell.innerHTML=`<span>CELL ${String(i+1).padStart(2,'0')} · WEIGHT ${entry.weight.toFixed(2)}</span><b></b><code></code><button type="button">LISTEN AT SOURCE</button>`;
    cell.querySelector('b').textContent=labelFor(entry.sourceId);cell.querySelector('code').textContent=entry.sourceId;
    cell.querySelector('button').onclick=()=>{const q=new URLSearchParams({source:entry.sourceId,return:location.pathname+location.search});location.assign('../listen/?'+q.toString())};
    cell.onclick=e=>{if(e.target.tagName!=='BUTTON')enter(i,{autoplay:false})};rail.append(cell);
    if(i<plan.entries.length-1){const seam=document.createElement('div');seam.className='seam';seam.textContent=entry.law;rail.append(seam)}
  });
}

function renderReceipt(){
  if(!plan){$('#receipt').textContent='—';return}
  const receipt=makeJourneyReturn({plan,startedAt,completedAt,events});$('#receipt').textContent=JSON.stringify(receipt,null,2);
}

function render(){
  const entry=currentEntry();
  $('#journeyTitle').textContent=set?.title||'NO SET LOADED';$('#setState').textContent=set?set.id:'NONE';
  $('#bindState').textContent=demoWitness&&plan?`DEMO · ${plan.entries.length}`:(plan?`${plan.entries.length-plan.missing.length} / ${plan.entries.length}`:'0 / 0');
  $('#cellState').textContent=entry?`CELL ${index+1} / ${plan.entries.length}`:'CELL —';$('#sourceState').textContent=entry?(demoWitness?'EXACT SEED · MEDIA PRIVATE':(entry.available?'LOCAL BLOB READY':'LOCAL BLOB MISSING')):'SOURCE UNBOUND';
  $('#roleState').textContent=entry?roleFor(entry.sourceId):'WAITING FOR SET';$('#trackState').textContent=entry?labelFor(entry.sourceId):'—';$('#hashState').textContent=entry?.sourceId||'—';
  $('#playBtn').disabled=!entry||(!entry.available&&!demoWitness);$('#prevBtn').disabled=!entry||index===0;$('#nextBtn').disabled=!entry||index>=((plan?.entries.length||1)-1);
  $('#seek').disabled=false;
  $('#demoRibbon').hidden=!demoWitness;
  $('#stage').dataset.demo=demoWitness?'seed':'none';
  $('#stage').dataset.role=entry?(meta[entry.sourceId]?.roleKey||'SOURCE'):'SOURCE';
  renderRail();renderReceipt();
  document.documentElement.dataset.foldBloomJourney='ready';document.documentElement.dataset.journeyEntries=String(plan?.entries.length||0);document.documentElement.dataset.journeyReady=String(!!plan?.ready);document.documentElement.dataset.journeyDemo=demoWitness?'seed':'none';document.documentElement.dataset.journeyDemoAudio=demoWitness?'private':'local';
}

function tick(){
  const entry=currentEntry();
  if(entry){
    let sourceTime=current.currentTime||0;
    if(demoWitness){
      if(playing){
        demoClock.progress=Math.max(0,Math.min(1,(performance.now()-demoClock.started)/demoClock.cellMs));
      }
      sourceTime=(entry.duration||0)*demoClock.progress;
      const stage=$('#stage'),pulse=.22+.18*Math.sin(performance.now()/260);
      stage.style.setProperty('--demo-progress',(demoClock.progress*100).toFixed(2)+'%');
      stage.style.setProperty('--demo-pulse',String(pulse));
      if(entry.law==='DISSOLVE'&&demoClock.progress>.72)phase('DISSOLVE');else if(entry.law==='RETURN'&&demoClock.progress>.9)phase('RETURN');else phase(entry.law||'CUT');
      if(playing&&demoClock.progress>=1){advance();sourceTime=0}
    }
    const address=journeyAddress(plan,index,sourceTime),sourceP=address.sourceProgress*100,journeyP=address.journeyProgress*100;
    $('#sourceTime').textContent=fmt(address.sourceTime);$('#journeyTime').textContent=fmt(address.journeyTime);$('#addressState').textContent=`${index+1}:${address.sourceTime.toFixed(1)}s`;
    $('#sourceBar').style.width=sourceP+'%';$('#journeyBar').style.width=journeyP+'%';$('#seek').value=String(Math.round(address.sourceProgress*1000));
    if(!demoWitness&&playing&&!transition&&entry.law==='DISSOLVE'&&nextJourneyIndex(plan,index)!==null&&(entry.duration-(current.currentTime||0))<=2.4)beginDissolve();
    if(!demoWitness&&transition){const p=Math.max(0,Math.min(1,(performance.now()-transition.started)/transition.duration));current.volume=1-p;other.volume=p;if(p>=1)finishDissolve()}
  }
  $('#playBtn').textContent=demoWitness?(playing?'PAUSE DEMO':'WATCH DEMO'):(playing?'PAUSE':'PLAY');raf=requestAnimationFrame(tick);
}

for(const player of [audioA,audioB]){
  player.onplay=()=>{if(player===current){playing=true;startedAt ||= now();setStatus('RIDING · LOCAL')}};
  player.onpause=()=>{if(player===current&&!transition)playing=false};
  player.onended=()=>{if(player!==current||transition)return;advance()};
}

$('#lastSetBtn').onclick=async()=>{try{readSetStorage();await hydrate();toast('LAST SET LOADED')}catch(error){setStatus(error.message.toUpperCase());toast('NO SET FOUND')}};
$('#importBtn').onclick=()=>$('#setFile').click();$('#setFile').onchange=async e=>{const f=e.target.files?.[0];if(f)await importSet(f).catch(error=>{setStatus(error.message);toast('SET REJECTED')});e.target.value=''};
$('#audioFiles').onchange=e=>bindFiles(e.target.files);
$('#playBtn').onclick=async()=>{if(demoWitness){if(playing){playing=false;recordEvent('DEMO_PAUSE',{mode:'DEMO_WITNESS'})}else{startedAt ||= now();demoClock.started=performance.now()-demoClock.progress*demoClock.cellMs;playing=true;recordEvent('DEMO_PLAY',{mode:'DEMO_WITNESS'})}return}if(!currentEntry()?.available)return;if(playing){current.pause();other.pause();playing=false}else{if(!current.src)await enter(index);startedAt ||= now();await current.play().catch(()=>{});playing=!current.paused}};
$('#prevBtn').onclick=()=>enter(index-1,{autoplay:false});$('#nextBtn').onclick=()=>advance({manual:true});
$('#seek').oninput=e=>{const entry=currentEntry();if(!entry)return;const p=Math.max(0,Math.min(1,Number(e.target.value)/1000));if(demoWitness){demoClock.progress=p;demoClock.started=performance.now()-p*demoClock.cellMs;return}if(!entry.available)return;current.currentTime=p*(entry.duration||0)};
$('#returnBtn').onclick=()=>{if(!plan)return;completedAt ||= playing?null:completedAt;const receipt=makeJourneyReturn({plan,startedAt,completedAt,events}),blob=new Blob([JSON.stringify(receipt,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`fold-bloom-journey-return-${Date.now()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);renderReceipt();toast('RETURN EXPORTED')};
addEventListener('beforeunload',cleanupUrls);

async function boot(){
  const params=new URLSearchParams(location.search),mode=params.get('demo'),requestedSet=params.get('set');
  if(mode==='seed'||mode==='1'){
    try{await loadSeedDemo();render();setStatus('DEMO WITNESS · EXACT RECOVERED SEED · AUDIO PRIVATE');if(params.get('auto')==='1'){startedAt=now();playing=true;demoClock.started=performance.now()}}catch(error){console.warn(error);setStatus('DEMO SEED UNAVAILABLE');render()}
  }else{
    try{
      readSetStorage();
      if(requestedSet&&set?.id!==requestedSet)throw new Error('SET ADDRESS MISMATCH · REQUESTED '+requestedSet+' · CURRENT '+(set?.id||'NONE'));
      await hydrate();
    }catch(error){setStatus(error?.message||'LOCAL · LOAD OR IMPORT A SET');render()}
  }
  requestAnimationFrame(tick);
}
boot();
$('#seedDemoBtn').onclick=()=>location.assign('./journey.html?demo=seed&auto=1');
$('#shareDemoBtn').onclick=async()=>{const url=new URL('./journey.html?demo=seed&auto=1',location.href).href;try{await navigator.clipboard.writeText(url);toast('DEMO LINK COPIED')}catch(_){prompt('COPY DEMO LINK',url)}};
window.FoldBloomJourney={version:'0.1.2',state:()=>({set,plan,index,playing,transition,startedAt,completedAt,events:[...events],demoWitness,demoClock:{...demoClock}}),hydrate,enter,advance};
