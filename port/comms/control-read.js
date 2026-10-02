import {coverageSummary} from './core.js';

const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

function snapshot(){
  const host=globalThis.CommsSpine;
  const x=host?.state?.();
  if(!x?.doc||!Array.isArray(x.signals))return null;
  const all=x.signals.map(s=>({...s}));
  const eligible=all.filter(s=>s.origin!=='MACHINE');
  const open=eligible.filter(s=>s.state==='OPEN');
  const machine=all.filter(s=>s.origin==='MACHINE'&&s.state!=='DROPPED');
  const unique=xs=>xs.filter((v,i,a)=>a.findIndex(z=>z.id===v.id)===i);
  const generators=unique(open.filter(s=>s.kind==='ASK'||s.kind==='PROMISE'));
  const constraints=eligible.filter(s=>s.kind==='CONSTRAINT'&&s.state!=='DROPPED');
  const decisions=eligible.filter(s=>s.kind==='DECISION'&&s.state!=='DROPPED');
  const waits=open.filter(s=>s.kind==='WAITING');
  const levers=unique([...generators,...waits]).sort((a,b)=>a.start-b.start||a.end-b.end||String(a.id).localeCompare(String(b.id)));
  return {
    sourceId:x.sourceId,title:x.title||'COMMS SPINE',all,eligible,open,machine,
    generators,constraints,decisions,waits,levers,coverage:coverageSummary(all)
  };
}

function row(s){
  return '<button class="crRow" data-signal="'+esc(s.id)+'">'+
    '<i>'+esc(s.kind)+'</i>'+
    '<span>'+esc(s.text)+'</span>'+
    '<small>'+esc(s.origin)+' · '+esc(s.messageId)+' · '+Number(s.start)+'–'+Number(s.end)+'</small>'+
  '</button>';
}
function section(title,sub,items,max=5){
  const shown=items.slice(0,max),rest=Math.max(0,items.length-shown.length);
  return '<section class="crSec"><h3>'+esc(title)+' <small>'+esc(sub)+' · '+items.length+'</small></h3>'+
    (shown.length?shown.map(row).join(''):'<div class="crEmpty">ABSENT</div>')+
    (rest?'<div class="crResidue">+'+rest+' SOURCE-ADDRESSED RESIDUE · OPEN LATTICE TO INSPECT</div>':'')+
  '</section>';
}
function render(){
  const x=snapshot(),body=$('#controlReadBody'),meta=$('#controlReadMeta');
  if(!body||!meta)return;
  if(!x){
    meta.textContent='NO SOURCE · READ ONLY';
    body.innerHTML='<div class="crNoSource"><b>NO CURRENT COMMS OBJECT</b><span>Paste/import a thread first. CONTROL READ never creates a second source.</span></div>';
    return;
  }
  meta.textContent=(x.title||'COMMS SPINE')+' · '+x.sourceId.slice(0,18)+'… · SOURCE ORDER ≠ PRIORITY';
  body.innerHTML=
    '<div class="crMeter">'+
      '<b>'+x.open.length+'</b><span>OPEN ELIGIBLE</span>'+
      '<b>'+x.coverage.COVERED+'</b><span>COVERED</span>'+
      '<b>'+x.coverage.DEFERRED+'</b><span>DEFERRED</span>'+
      '<b>'+x.machine.length+'</b><span>MACHINE HELD OUT</span>'+
    '</div>'+
    (x.machine.length?'<div class="crQuarantine"><b>MACHINE ≠ COMMITMENT.</b> '+x.machine.length+' unresolved machine spot'+(x.machine.length===1?' is':'s are')+' excluded until explicit CONFIRM → HUMAN.</div>':'')+
    '<div class="crGrid">'+
      section('GENERATORS','OPEN ASK + PROMISE',x.generators)+
      section('CONSTRAINTS','NON-DROPPED',x.constraints)+
      section('DECISIONS','NON-DROPPED',x.decisions)+
      section('LEVERS','OPEN ASK / PROMISE / WAITING · SOURCE ORDER',x.levers)+
    '</div>'+
    '<div class="crLaw">SOURCE ≠ CONTROL READ · DERIVED ≠ HUMAN · MACHINE HELD OUT UNTIL CONFIRMED · COMPRESSION RETAINS EXACT ADDRESS · THIS LENS HAS NO EFFECT AUTHORITY</div>';
  body.querySelectorAll('[data-signal]').forEach(b=>b.addEventListener('click',()=>{
    const id=b.dataset.signal;
    const ok=globalThis.CommsSpine?.locateSignal?.(id);
    if(ok)close();
  }));
}
function open(){
  render();
  const host=$('#controlRead');if(!host)return;
  host.hidden=false;
  document.documentElement.dataset.commsControlRead='open';
}
function close(){
  const host=$('#controlRead');if(!host)return;
  host.hidden=true;
  delete document.documentElement.dataset.commsControlRead;
}

const style=document.createElement('style');
style.textContent=`
#controlRead[hidden]{display:none!important}
#controlRead{position:fixed;inset:0;z-index:80;background:#05080af7;padding:6px}
.crShell{height:calc(100dvh - 12px);max-width:1120px;margin:auto;border:1px solid #2a353a;background:#080c0e;display:grid;grid-template-rows:auto auto minmax(0,1fr) auto;overflow:hidden}
.crHead{display:flex;justify-content:space-between;gap:12px;align-items:start;padding:10px 12px;border-bottom:1px solid #2a353a}
.crHead .ey{font-size:7px;letter-spacing:.16em;color:#d7ae67}.crHead h2{margin:3px 0 2px;font:900 clamp(25px,5vw,50px)/.85 system-ui,sans-serif;letter-spacing:-.05em}.crHead p{margin:0;color:#7d8b91;font:8px/1.4 system-ui,sans-serif}
.crHead button{border:1px solid #344149;background:#0c1114;color:#e7edeb;padding:9px 11px;min-height:38px}
#controlReadMeta{color:#74838a;font:7px/1.3 ui-monospace,monospace;padding:6px 10px;border-bottom:1px solid #20292e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.crMeter{display:grid;grid-template-columns:repeat(8,auto);justify-content:start;gap:1px;background:#283238;border-bottom:1px solid #283238}.crMeter>*{background:#0a0f12;padding:6px 8px}.crMeter b{font-size:14px}.crMeter span{color:#74838a;font-size:6px;align-content:center}
.crQuarantine{padding:6px 10px;border-bottom:1px solid #382e25;color:#b99a7f;font:7px/1.35 ui-monospace,monospace}.crQuarantine b{color:#e0b56f}
.crGrid{min-height:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr));gap:1px;background:#283238}
.crSec{min-height:0;background:#090d10;padding:8px;overflow:hidden}.crSec h3{margin:0 0 5px;font-size:8px;letter-spacing:.11em}.crSec h3 small{color:#69777d;font-weight:400;letter-spacing:.03em}
.crRow{width:100%;display:grid;grid-template-columns:66px minmax(0,1fr);gap:3px 7px;border:0;border-top:1px solid #1d272b;background:transparent;color:#b9c3c6;text-align:left;padding:6px}.crRow:hover,.crRow:focus{background:#11191d;outline:1px solid #33424a}.crRow i{font-style:normal;color:#ed7245;font-size:6px;letter-spacing:.08em}.crRow span{font:9px/1.25 system-ui,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.crRow small{grid-column:2;color:#617177;font-size:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.crEmpty{padding:10px;color:#536168;font-size:7px}.crResidue{padding:5px 6px;color:#66747a;font-size:6px;border-top:1px dotted #263137}
.crLaw{padding:7px 10px;border-top:1px solid #2a353a;color:#647279;font-size:6px;letter-spacing:.04em}.crNoSource{display:grid;place-content:center;gap:6px;min-height:0;text-align:center}.crNoSource b{font-size:14px}.crNoSource span{color:#74838a;font-size:8px}
@media(max-width:700px){
  .crShell{height:calc(100dvh - 8px)}
  #controlRead{padding:4px}.crHead{padding:8px}.crHead h2{font-size:27px}.crHead p{font-size:7px}
  .crMeter{grid-template-columns:repeat(4,auto)}.crMeter>*{padding:5px 6px}.crMeter b{font-size:12px}.crMeter span{font-size:5.5px}
  .crGrid{grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr}.crSec{padding:5px}.crSec h3{font-size:7px}.crRow{grid-template-columns:50px minmax(0,1fr);padding:5px 3px}.crRow span{font-size:8px}.crRow small,.crRow i{font-size:5.5px}
}
`;
document.head.append(style);

const host=document.createElement('div');
host.id='controlRead';host.hidden=true;host.innerHTML=
  '<div class="crShell">'+
    '<div class="crHead"><div><div class="ey">COMMS SPINE · SOURCE-ADDRESSED / READ ONLY</div><h2>CONTROL READ</h2><p>Generators · constraints · decisions · levers. Compression never replaces source.</p></div><button id="controlReadClose" type="button">RETURN ↩</button></div>'+
    '<div id="controlReadMeta">NO SOURCE · READ ONLY</div>'+
    '<div id="controlReadBody"></div>'+
  '</div>';
document.body.append(host);
$('#controlReadClose').addEventListener('click',close);
$('#controlReadBtn')?.addEventListener('click',open);
host.addEventListener('click',e=>{if(e.target===host)close()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!host.hidden)close()});
globalThis.CommsControlRead=Object.freeze({open,close,snapshot});
