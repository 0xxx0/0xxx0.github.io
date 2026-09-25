import {createHost,makePhi,transcribe,splice,translate,ExpressionTape} from './core.mjs';

const CHANNELS=['identity','address','content','depth','authority','evidence','time'];
const PROJECTIONS={
  PAGE:['identity','address','content','depth','authority','evidence','time'],
  LINE:['identity','address','content','time','authority'],
  RING:['identity','address','time','authority'],
  GLYPH:['identity','address'],
  TABLE:['identity','address','content','authority','evidence']
};
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let manifest,current,host,phi,tx,view,focus='/',channelSet=new Set(['identity','address','content','authority','evidence']),projection='PAGE',tape=new ExpressionTape(),branchPacket=null;

function nodeFromRoute(r){
  return {
    id:r.href,
    address:{href:r.href,parent:r.parent??null},
    channels:['identity','address','content','depth','authority','evidence','time'],
    content:{title:r.title,kind:r.kind,state:r.state,operation:r.operation,role:r.role,version:r.version},
    depth:r.parent??null,
    authority:'VIEW',
    evidence:r.receipt||r.evidence||null,
    time:r.index?.updated_at||null,
    operations:[]
  };
}
function rebuildHost(){
  const rev=Number(String(manifest.updated||'').replace(/\D/g,'').slice(-9))||1;
  host=createHost({id:'FIELD',authority:'VIEW',source:{manifest:'/showcase-manifest.json',current:'/control/CURRENT.json'},revision:rev,nodes:(manifest.routes||[]).map(nodeFromRoute)});
  phi=makePhi(host);
}
function matching(){
  const q=$('q').value.trim().toLowerCase();
  return (manifest.routes||[]).filter(r=>!q||[r.title,r.href,r.kind,r.state,r.operation].join(' ').toLowerCase().includes(q)).slice(0,70);
}
function renderRoutes(){
  const xs=matching();$('routeMeta').textContent=xs.length+' shown · '+(manifest.routes||[]).length+' addressed';
  $('routes').innerHTML=xs.map(r=>'<button class="route '+(r.href===focus?'on':'')+'" data-href="'+esc(r.href)+'"><strong>'+esc(r.title||r.href)+'</strong><small>'+esc(r.href)+' · '+esc(r.state||r.kind||'—')+'</small></button>').join('');
  $('routes').querySelectorAll('[data-href]').forEach(b=>b.onclick=()=>{focus=b.dataset.href;express();renderRoutes()});
}
function renderControls(){
  $('channels').innerHTML=CHANNELS.map(ch=>'<button data-ch="'+ch+'" class="'+(channelSet.has(ch)?'on':'')+'">'+ch.toUpperCase()+'</button>').join('');
  $('channels').querySelectorAll('[data-ch]').forEach(b=>b.onclick=()=>{const ch=b.dataset.ch;if(channelSet.has(ch))channelSet.delete(ch);else channelSet.add(ch);express();renderControls()});
  $('projections').innerHTML=Object.keys(PROJECTIONS).map(p=>'<button data-p="'+p+'" class="'+(p===projection?'on':'')+'">'+p+'</button>').join('');
  $('projections').querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{projection=b.dataset.p;express();renderControls()});
}
function express(){
  if(!host?.read(focus))focus='/';
  tx=transcribe(host,phi,{focus,channels:[...channelSet],context:{projection}});
  view=translate(tx,{name:projection,channels:PROJECTIONS[projection]});
  $('hostId').textContent=phi.host;$('hostRev').textContent=phi.revision;$('hostAuth').textContent=phi.authority;$('focusPath').textContent=focus;
  $('txId').textContent=tx.id;$('txMeta').textContent=tx.records.length+' record · '+tx.residue.length+' transcript residue · '+view.residue.length+' translated residue';
  $('transcript').textContent=JSON.stringify(tx,null,2);
  $('translation').textContent=JSON.stringify(view,null,2);
  $('tapeMeta').textContent='tape '+tape.frames.length+' · cursor '+tape.cursor+(branchPacket?' · branch '+branchPacket.label:'');
}
$('checkpoint').onclick=()=>{tape.checkpoint(tx,focus);branchPacket=null;express()};
$('rewind').onclick=()=>{const f=tape.rewind();if(f?.transcript){tx=f.transcript;focus=tx.locus?.focus||focus;projection=tx.context?.projection||projection;view=translate(tx,{name:projection,channels:PROJECTIONS[projection]||[]});$('transcript').textContent=JSON.stringify(tx,null,2);$('translation').textContent=JSON.stringify(view,null,2);$('focusPath').textContent=focus;$('txId').textContent=tx.id;$('txMeta').textContent='REWOUND EXPRESSION · host revision '+host.revision+' unchanged';renderRoutes();renderControls();$('tapeMeta').textContent='tape '+tape.frames.length+' · cursor '+tape.cursor}};
$('forward').onclick=()=>{const f=tape.forward();if(f?.transcript){tx=f.transcript;focus=tx.locus?.focus||focus;projection=tx.context?.projection||projection;view=translate(tx,{name:projection,channels:PROJECTIONS[projection]||[]});$('transcript').textContent=JSON.stringify(tx,null,2);$('translation').textContent=JSON.stringify(view,null,2);renderRoutes();renderControls();$('tapeMeta').textContent='tape '+tape.frames.length+' · cursor '+tape.cursor}};
$('branch').onclick=()=>{branchPacket=tape.branch('WHAT-IF');$('tapeMeta').textContent=branchPacket?'counterfactual from '+branchPacket.transcript.id:'checkpoint first'};
$('q').oninput=renderRoutes;

Promise.all([
  fetch('../../showcase-manifest.json',{cache:'no-store'}).then(r=>r.json()),
  fetch('../../control/CURRENT.json',{cache:'no-store'}).then(r=>r.json())
]).then(([m,c])=>{manifest=m;current=c;rebuildHost();focus=(m.routes||[]).find(r=>r.href==='/')?.href||m.routes?.[0]?.href||'/';renderRoutes();renderControls();express()}).catch(e=>{$('routes').textContent='LOAD FAILURE '+e.message});
