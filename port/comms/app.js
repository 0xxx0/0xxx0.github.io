import {
  parseConversation,deriveSignals,createHumanMark,mergeSignals,
  coverageSummary,buildAgentPacket,makeReturn,stateFromReturn,demoConversation,SIGNAL_STATES
} from './core.js';

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const SESSION='human.port.comms-spine.session.v01';
const PINNED='human.port.comms-spine.pinned.v01';
const PORT_SESSION='human.port.object.session.v01';
const enc=new TextEncoder();

let state={
  source:'',sourceId:'',title:'COMMS SPINE',doc:null,humanMarks:[],states:{},
  draft:'',coverageLinks:[],targets:[],currentMessage:0,selectedClause:null,filter:'ALL'
};

const toast=text=>{const el=$('#toast');el.textContent=text;el.classList.remove('on');void el.offsetWidth;el.classList.add('on')};
const nextState=s=>SIGNAL_STATES[(SIGNAL_STATES.indexOf(s)+1)%SIGNAL_STATES.length];
const fmtAddr=(a,b)=>'char '+a+'–'+b;

async function sourceHash(text){
  const hash=await crypto.subtle.digest('SHA-256',enc.encode(String(text)));
  return 'sha256:'+Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
}
function derived(){return state.doc?deriveSignals(state.doc):[]}
function signals(){
  return mergeSignals(derived(),state.humanMarks).map(x=>({...x,state:state.states[x.id]||x.state||'OPEN'}));
}
function persist(){
  const snap={
    source:state.source,sourceId:state.sourceId,title:state.title,humanMarks:state.humanMarks,
    states:state.states,draft:state.draft,coverageLinks:state.coverageLinks,targets:state.targets,
    currentMessage:state.currentMessage,selectedClause:state.selectedClause,filter:state.filter
  };
  try{sessionStorage.setItem(SESSION,JSON.stringify(snap))}catch(_){}
}
function restore(raw){
  try{
    const x=typeof raw==='string'?JSON.parse(raw):raw;
    if(!x?.source)return false;
    state={...state,...x,doc:parseConversation(x.source)};
    state.currentMessage=Math.max(0,Math.min(state.currentMessage,state.doc.messages.length-1));
    return true;
  }catch(_){return false}
}
function portText(){
  try{
    const s=JSON.parse(sessionStorage.getItem(PORT_SESSION)||'null'),obj=s?.obj;
    if(!obj||!['TEXT','JSON'].includes(obj.media_class))return null;
    if(typeof obj.text_payload!=='string'||!obj.text_payload.trim())return null;
    return {text:obj.text_payload,title:obj.label||'HUMAN PORT'};
  }catch(_){return null}
}
function updatePortButtons(){
  const p=portText(),pin=localStorage.getItem(PINNED);
  $('#portBtn').hidden=!p;$('#usePortObject').disabled=!p;$('#usePinned').disabled=!pin;
}
async function loadSource(text,title='COMMS SPINE'){
  const source=String(text||'').trim();
  if(!source){toast('PASTE A THREAD FIRST');return}
  state={
    source,sourceId:await sourceHash(source),title:String(title||'COMMS SPINE').trim()||'COMMS SPINE',
    doc:parseConversation(source),humanMarks:[],states:{},draft:'',coverageLinks:[],targets:[],
    currentMessage:0,selectedClause:null,filter:'ALL'
  };
  state.selectedClause=state.doc.messages[0]?.clauses?.[0]?.id||null;
  persist();hideIntake();render();
}
function showIntake(){
  $('#titleInput').value=state.source?state.title:'';
  $('#sourceInput').value=state.source||'';
  $('#intake').hidden=false;updatePortButtons();setTimeout(()=>$('#sourceInput').focus(),20);
}
function hideIntake(){if(state.source)$('#intake').hidden=true}
function currentMessage(){return state.doc?.messages?.[state.currentMessage]||null}
function currentClause(){
  const m=currentMessage();if(!m)return null;
  return m.clauses.find(c=>c.id===state.selectedClause)||m.clauses[0]||null;
}
function jumpMessage(index,clauseId=null){
  if(!state.doc?.messages?.length)return;
  state.currentMessage=Math.max(0,Math.min(state.doc.messages.length-1,index));
  const m=currentMessage();
  state.selectedClause=clauseId&&m.clauses.some(c=>c.id===clauseId)?clauseId:m.clauses[0]?.id||null;
  persist();renderSource();renderSpine();renderSignals();
}
function jumpSignal(sig){
  const mi=state.doc.messages.findIndex(m=>m.id===sig.messageId);
  if(mi>=0)jumpMessage(mi,sig.clauseId);
}
function renderSpine(){
  const rail=$('#turnRail'),srail=$('#signalRail');
  rail.replaceChildren();srail.replaceChildren();
  if(!state.doc){$('#spineMeta').textContent='NO SOURCE · address survives projection';return}
  const ss=signals(),total=Math.max(1,state.doc.source.length);
  $('#spineMeta').textContent=state.title+' · '+state.doc.messages.length+' turns · '+total+' chars · '+state.sourceId.slice(0,23)+'…';
  state.doc.messages.forEach((m,i)=>{
    const cell=document.createElement('button');cell.className='turnCell '+(m.speaker==='USER'?'user':'assistant')+(i===state.currentMessage?' on':'');
    cell.style.flexGrow=String(Math.max(1,m.end-m.start));cell.style.flexBasis='0';cell.title=m.speaker+' · '+fmtAddr(m.start,m.end);
    cell.innerHTML='<span>'+escapeHtml(m.speaker)+' · '+(i+1)+'</span>';cell.onclick=()=>jumpMessage(i);rail.append(cell);
    const sc=document.createElement('div');sc.className='signalCell';sc.style.flexGrow=String(Math.max(1,m.end-m.start));sc.style.flexBasis='0';
    for(const sig of ss.filter(x=>x.messageId===m.id)){
      const tick=document.createElement('i'),span=Math.max(1,m.end-m.start);
      tick.dataset.kind=sig.kind;tick.style.left=(((sig.start-m.start)/span)*100).toFixed(2)+'%';
      tick.title=sig.kind+' · '+sig.origin;sc.append(tick);
    }
    srail.append(sc);
  });
}
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function renderSource(){
  const m=currentMessage(),wrap=$('#clauses');wrap.replaceChildren();
  if(!m){
    $('#speaker').textContent='NO SOURCE';$('#msgNum').textContent='—';$('#msgRange').textContent='—';$('#sourceAddr').textContent='—';return;
  }
  $('#speaker').textContent=m.speaker;$('#msgNum').textContent='TURN '+(state.currentMessage+1)+' / '+state.doc.messages.length;
  $('#msgRange').textContent=fmtAddr(m.start,m.end);$('#sourceAddr').textContent=state.sourceId.slice(0,18)+'… / '+m.id;
  m.clauses.forEach((c,i)=>{
    const b=document.createElement('button');b.className='clause'+(c.id===state.selectedClause?' on':'');
    b.dataset.index=String(i+1).padStart(2,'0');b.textContent=c.text;b.title=fmtAddr(c.start,c.end);
    b.onclick=()=>{state.selectedClause=c.id;persist();renderSource();renderSignals();};
    wrap.append(b);
  });
  const c=currentClause();$('#markHint').textContent=c?c.id+' · '+fmtAddr(c.start,c.end)+' · HUMAN MARK':'SELECT A CLAUSE → AUTHOR A MARK';
  $('#prevMsg').disabled=state.currentMessage<=0;$('#nextMsg').disabled=state.currentMessage>=state.doc.messages.length-1;
}
function addMark(kind){
  const m=currentMessage(),c=currentClause();if(!m||!c)return;
  const mark=createHumanMark({kind,messageId:m.id,clauseId:c.id,speaker:m.speaker,start:c.start,end:c.end,text:c.text});
  if(!state.humanMarks.some(x=>x.id===mark.id))state.humanMarks.push(mark);
  state.states[mark.id]=state.states[mark.id]||'OPEN';persist();render();toast('HUMAN '+kind+' MARKED');
}
function setState(id,next){
  state.states[id]=next;persist();renderSignals();renderCompose();renderSpine();
}
function toggleTarget(id){
  const set=new Set(state.targets);set.has(id)?set.delete(id):set.add(id);state.targets=[...set];persist();renderSignals();
}
function removeHuman(id){
  state.humanMarks=state.humanMarks.filter(x=>x.id!==id);delete state.states[id];
  state.targets=state.targets.filter(x=>x!==id);state.coverageLinks=state.coverageLinks.filter(x=>x!==id);
  persist();render();
}
function renderSignals(){
  const all=signals(),visible=all.filter(s=>state.filter==='ALL'||s.kind===state.filter),list=$('#signalList');list.replaceChildren();
  $('#signalMeta').textContent=all.length+' SIGNALS · '+all.filter(x=>x.state==='OPEN').length+' OPEN';
  $$('.filters button').forEach(b=>b.classList.toggle('on',b.dataset.filter===state.filter));
  if(!visible.length){list.innerHTML='<div class="signalCard"><div class="signalText">No signals in this projection. Derived labels are intentionally conservative; author a mark from the source fovea when something matters.</div></div>';return}
  for(const sig of visible){
    const card=document.createElement('article'),focused=sig.clauseId===state.selectedClause&&sig.messageId===currentMessage()?.id;
    card.className='signalCard '+sig.origin.toLowerCase()+(focused?' focus':'');
    card.innerHTML='<div class="signalTop"><span class="kind '+sig.kind+'">'+sig.kind+'</span><span class="origin">'+sig.origin+(sig.origin==='DERIVED'?' · '+Math.round(sig.confidence*100)+'%':'')+'</span><button class="state '+sig.state+'" data-state>'+sig.state+'</button></div><div class="signalText"></div><div class="signalAddr"></div><div class="signalActions"><button data-jump>LOCATE</button><button data-target>'+(state.targets.includes(sig.id)?'TARGET ✓':'TARGET')+'</button>'+(sig.origin==='HUMAN'?'<button data-remove>REMOVE MARK</button>':'')+'</div>';
    card.querySelector('.signalText').textContent=sig.text;card.querySelector('.signalAddr').textContent=sig.messageId+' · '+fmtAddr(sig.start,sig.end)+' · '+sig.id;
    card.querySelector('[data-state]').onclick=()=>setState(sig.id,nextState(sig.state));
    card.querySelector('[data-jump]').onclick=()=>jumpSignal(sig);
    const target=card.querySelector('[data-target]');target.classList.toggle('selected',state.targets.includes(sig.id));target.onclick=()=>toggleTarget(sig.id);
    card.querySelector('[data-remove]')?.addEventListener('click',()=>removeHuman(sig.id));
    list.append(card);
  }
}
function applyTargetState(next){
  if(!state.targets.length){toast('TARGET SIGNALS FIRST');return}
  for(const id of state.targets)state.states[id]=next;
  if(next==='COVERED')state.coverageLinks=[...new Set([...state.coverageLinks,...state.targets])];
  if(next==='OPEN')state.coverageLinks=state.coverageLinks.filter(id=>!state.targets.includes(id));
  persist();render();toast(state.targets.length+' → '+next);
}
function renderCompose(){
  const ss=signals(),c=coverageSummary(ss);
  if(document.activeElement!==$('#draft'))$('#draft').value=state.draft;
  $('#coverage').innerHTML=['OPEN','COVERED','DEFERRED','DROPPED'].map(k=>'<div><span>'+k+'</span><b>'+(c[k]||0)+'</b></div>').join('');
  const packet=buildAgentPacket({doc:state.doc,signals:ss,draft:state.draft,title:state.title});
  $('#packetPreview').textContent=JSON.stringify(packet,null,2);
}
function render(){
  if(!state.doc){document.documentElement.dataset.commsSpine='idle';showIntake();renderSpine();renderSource();renderSignals();renderCompose();return}
  hideIntake();renderSpine();renderSource();renderSignals();renderCompose();
  const ss=signals();document.documentElement.dataset.commsSpine='ready';document.documentElement.dataset.commsMessages=String(state.doc.messages.length);document.documentElement.dataset.commsSignals=String(ss.length);document.documentElement.dataset.commsOpen=String(ss.filter(x=>x.state==='OPEN').length);
}
async function copy(text,label='COPIED'){
  try{await navigator.clipboard.writeText(text);toast(label)}catch(_){toast('COPY BLOCKED')}
}
function openLoopsText(){
  const ss=signals().filter(x=>x.state==='OPEN');
  return ss.map(s=>'['+s.kind+'] '+s.text+'\\n  ↳ '+s.messageId+' '+fmtAddr(s.start,s.end)+' · '+s.origin).join('\\n\\n')||'NO OPEN SIGNALS';
}
function returnObject(){
  if(!state.doc)return null;
  return makeReturn({doc:state.doc,sourceId:state.sourceId,signals:signals(),draft:state.draft,coverageLinks:state.coverageLinks,title:state.title,includeSource:true});
}
function loadReturn(value){
  try{
    const next=stateFromReturn(value);
    state={...state,...next};
    persist();hideIntake();render();toast('RETURN RESUMED');
    return true;
  }catch(error){
    toast('RETURN REJECTED · '+String(error?.message||error).slice(0,90));
    return false;
  }
}
async function importReturnFile(file){
  if(!file)return false;
  try{return loadReturn(JSON.parse(await file.text()))}
  catch(error){toast('RETURN REJECTED · INVALID JSON');return false}
}
function exportReturn(){
  if(!state.doc)return;
  const r=returnObject();
  const blob=new Blob([JSON.stringify(r,null,2)],{type:'application/json'}),a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download='comms-spine-return-'+Date.now()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),800);toast('RETURN EXPORTED');
}
function pinLocal(){
  if(!state.doc)return;
  const snap={source:state.source,sourceId:state.sourceId,title:state.title,humanMarks:state.humanMarks,states:state.states,draft:state.draft,coverageLinks:state.coverageLinks,targets:state.targets,currentMessage:state.currentMessage,selectedClause:state.selectedClause,filter:state.filter};
  try{localStorage.setItem(PINNED,JSON.stringify(snap));toast('PINNED IN THIS BROWSER');updatePortButtons()}catch(_){toast('LOCAL PIN FAILED')}
}
function purgeLocal(){
  if(!confirm('Purge COMMS SPINE pinned + session state from this browser?'))return;
  localStorage.removeItem(PINNED);sessionStorage.removeItem(SESSION);
  state={source:'',sourceId:'',title:'COMMS SPINE',doc:null,humanMarks:[],states:{},draft:'',coverageLinks:[],targets:[],currentMessage:0,selectedClause:null,filter:'ALL'};
  updatePortButtons();render();toast('LOCAL COMMS STATE PURGED');
}

$('#newBtn').onclick=showIntake;$('#closeIntake').onclick=hideIntake;
$('#loadSource').onclick=()=>loadSource($('#sourceInput').value,$('#titleInput').value);
$('#loadDemo').onclick=()=>{$('#sourceInput').value=demoConversation();$('#titleInput').value='COMMS SPINE DEMO'};
$('#prevMsg').onclick=()=>jumpMessage(state.currentMessage-1);$('#nextMsg').onclick=()=>jumpMessage(state.currentMessage+1);
$$('[data-mark]').forEach(b=>b.onclick=()=>addMark(b.dataset.mark));
$$('[data-filter]').forEach(b=>b.onclick=()=>{state.filter=b.dataset.filter;persist();renderSignals()});
$('#draft').oninput=e=>{state.draft=e.target.value;persist();renderCompose()};
$('#selectOpen').onclick=()=>{state.targets=signals().filter(x=>x.state==='OPEN').map(x=>x.id);persist();renderSignals()};
$('#clearTargets').onclick=()=>{state.targets=[];persist();renderSignals()};
$('#coverBtn').onclick=()=>applyTargetState('COVERED');$('#deferBtn').onclick=()=>applyTargetState('DEFERRED');$('#reopenBtn').onclick=()=>applyTargetState('OPEN');
$('#copyOpenBtn').onclick=()=>copy(openLoopsText(),'OPEN LOOPS COPIED');
$('#copyPacketBtn').onclick=()=>state.doc&&copy(JSON.stringify(buildAgentPacket({doc:state.doc,signals:signals(),draft:state.draft,title:state.title}),null,2),'AGENT PACKET COPIED');
$('#exportBtn').onclick=exportReturn;$('#importReturnBtn').onclick=()=>$('#returnFile').click();$('#returnFile').onchange=async e=>{const file=e.target.files?.[0];if(file)await importReturnFile(file);e.target.value=''};$('#pinBtn').onclick=pinLocal;$('#purgeBtn').onclick=purgeLocal;
$('#usePinned').onclick=()=>{const raw=localStorage.getItem(PINNED);if(raw&&restore(raw)){persist();render();toast('PINNED SESSION RESTORED')}};
$('#usePortObject').onclick=()=>{const p=portText();if(p)loadSource(p.text,p.title)};
$('#portBtn').onclick=()=>{const p=portText();if(p)loadSource(p.text,p.title)};

addEventListener('keydown',e=>{
  if(e.target?.matches?.('textarea,input'))return;
  if(e.key==='ArrowLeft'){e.preventDefault();jumpMessage(state.currentMessage-1)}
  else if(e.key==='ArrowRight'){e.preventDefault();jumpMessage(state.currentMessage+1)}
  else if(/^[1-6]$/.test(e.key)){const kinds=['ASK','PROMISE','DECISION','WAITING','CONSTRAINT','NOTE'];addMark(kinds[Number(e.key)-1])}
  else if(e.key.toLowerCase()==='n')showIntake();
});

const params=new URLSearchParams(location.search),session=sessionStorage.getItem(SESSION),pinned=localStorage.getItem(PINNED);
if(session)restore(session);else if(params.get('resume')==='1'&&pinned)restore(pinned);
updatePortButtons();
if(params.get('demo')==='1'&&!state.doc)loadSource(demoConversation(),'COMMS SPINE DEMO');else render();
window.CommsSpine={
  version:'0.1',
  state:()=>({sourceId:state.sourceId,title:state.title,doc:state.doc,signals:signals(),draft:state.draft,coverageLinks:[...state.coverageLinks]}),
  loadSource,loadReturn,returnObject,
  buildAgentPacket:()=>buildAgentPacket({doc:state.doc,signals:signals(),draft:state.draft,title:state.title})
};
