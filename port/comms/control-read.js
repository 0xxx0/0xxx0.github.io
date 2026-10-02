import {parseConversation,deriveSignals,mergeSignals,coverageSummary} from './core.js';

const SESSION='human.port.comms-spine.session.v01';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

function read(){
  try{
    const s=JSON.parse(sessionStorage.getItem(SESSION)||'null');
    if(!s?.source)return null;
    const doc=parseConversation(s.source);
    const derived=deriveSignals(doc);
    const signals=mergeSignals(derived,s.machineMarks||[],s.humanMarks||[]).map(x=>({...x,state:s.states?.[x.id]||x.state||'OPEN'}));
    return {s,doc,signals};
  }catch(_){return null}
}
function rows(items,n=5){
  if(!items.length)return '<div class="cr-empty">ABSENT</div>';
  return items.slice(0,n).map(x=>'<button class="cr-row" data-mid="'+esc(x.messageId)+'"><i>'+esc(x.kind)+'</i><span>'+esc(x.text)+'</span><small>'+esc(x.origin)+' · '+x.start+'–'+x.end+'</small></button>').join('');
}
function render(){
  const x=read(),host=$('#controlReadBody');
  if(!x){host.innerHTML='<div class="cr-empty">PASTE / IMPORT A THREAD FIRST.</div>';return}
  const live=x.signals.filter(s=>s.state==='OPEN');
  const asks=live.filter(s=>s.kind==='ASK');
  const constraints=x.signals.filter(s=>s.kind==='CONSTRAINT'&&s.state!=='DROPPED');
  const decisions=x.signals.filter(s=>s.kind==='DECISION'&&s.state!=='DROPPED');
  const waits=live.filter(s=>s.kind==='WAITING');
  const promises=live.filter(s=>s.kind==='PROMISE');
  const c=coverageSummary(x.signals);
  const leverage=[...asks,...promises,...waits].filter((v,i,a)=>a.findIndex(z=>z.id===v.id)===i);
  host.innerHTML=
    '<div class="cr-meter"><b>'+live.length+'</b><span>OPEN</span><b>'+c.COVERED+'</b><span>COVERED</span><b>'+c.DEFERRED+'</b><span>DEFERRED</span></div>'+
    '<div class="cr-grid">'+
      '<section><h3>GENERATORS <small>open asks + promises</small></h3>'+rows([...asks,...promises])+'</section>'+
      '<section><h3>CONSTRAINTS <small>non-dropped</small></h3>'+rows(constraints)+'</section>'+
      '<section><h3>COMMITMENTS <small>decisions</small></h3>'+rows(decisions)+'</section>'+
      '<section><h3>LEVERS <small>next unresolved apertures</small></h3>'+rows(leverage)+'</section>'+
    '</div>'+
    (waits.length?'<div class="cr-wait"><b>WAITING</b> '+waits.length+' source-addressed dependency'+(waits.length===1?'':'ies')+'</div>':'');
  host.querySelectorAll('[data-mid]').forEach(b=>b.onclick=()=>{
    const id=b.dataset.mid;
    const turn=[...document.querySelectorAll('.turnCell')].find(el=>el.title&&el.querySelector('span')?.textContent?.includes(id.replace(/^m0*/,'')));
    if(turn)turn.click();
    close();
  });
}
function open(){render();$('#controlRead').hidden=false;document.body.style.overflow='hidden'}
function close(){$('#controlRead').hidden=true;document.body.style.overflow=''}

const style=document.createElement('style');
style.textContent=`
#controlRead[hidden]{display:none}#controlRead{position:fixed;inset:0;z-index:70;background:#06080af7;padding:clamp(10px,3vw,32px);overflow:auto}
.cr-shell{width:min(1120px,100%);margin:auto;border:1px solid #2a353a;background:#080c0e}.cr-head{display:flex;justify-content:space-between;align-items:start;gap:18px;padding:14px;border-bottom:1px solid #2a353a}
.cr-head h2{margin:3px 0 0;font:900 clamp(30px,6vw,62px)/.82 system-ui,sans-serif;letter-spacing:-.06em}.cr-head p{margin:7px 0 0;color:#829096;font:9px/1.45 system-ui,sans-serif}.cr-head button{border:1px solid #2a353a;background:#0d1316;color:#eef2ef;padding:10px}
.cr-meter{display:grid;grid-template-columns:repeat(6,auto);justify-content:start;gap:1px;background:#2a353a;border-bottom:1px solid #2a353a}.cr-meter>*{background:#0b1013;padding:8px 10px}.cr-meter b{font-size:16px}.cr-meter span{color:#77868c;font-size:7px;align-content:center}
.cr-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:1px;background:#2a353a}.cr-grid section{background:#090d10;padding:10px;min-height:180px}.cr-grid h3{margin:0 0 8px;font-size:9px;letter-spacing:.12em}.cr-grid h3 small{color:#718087;font-weight:400}
.cr-row{display:grid;grid-template-columns:72px 1fr auto;width:100%;gap:8px;text-align:left;border:0;border-top:1px solid #1e282d;background:#090d10;color:#b9c3c6;padding:9px}.cr-row:hover{background:#11191d}.cr-row i{font-style:normal;color:#ed7245;font-size:7px}.cr-row span{font:10px/1.4 system-ui,sans-serif}.cr-row small{color:#64747a;font-size:6px}.cr-empty{color:#58666c;font-size:8px;padding:12px}.cr-wait{padding:10px;border-top:1px solid #2a353a;color:#9278d2;font-size:8px}
@media(max-width:700px){.cr-grid{grid-template-columns:1fr}.cr-row{grid-template-columns:62px 1fr}.cr-row small{grid-column:2}.cr-meter{grid-template-columns:repeat(3,auto)}}
`;
document.head.append(style);

const host=document.createElement('div');
host.id='controlRead';host.hidden=true;host.innerHTML='<div class="cr-shell"><div class="cr-head"><div><div class="ey">SOURCE-ADDRESSED / READ ONLY</div><h2>CONTROL<br>READ</h2><p>Generators · constraints · commitments · levers. Compression never replaces source.</p></div><button id="controlReadClose">RETURN ↩</button></div><div id="controlReadBody"></div></div>';
document.body.append(host);
$('#controlReadClose').onclick=close;
$('#controlReadBtn')?.addEventListener('click',open);
host.addEventListener('click',e=>{if(e.target===host)close()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!host.hidden)close()});
