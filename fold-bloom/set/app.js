import {encodeExperienceSet,decodeExperienceSet} from '../experience-set/experience-set.js';
import {SET_COMPOSITOR_VERSION,createExperienceSet,appendSource,removeEntry,reorderEntries,cycleSeamLaw,setEntryWeight,renameSet,prepareSet,seamLaws} from './set-core.js';

const $=s=>document.querySelector(s),STORE='fold-bloom.set-compositor.v01',META='fold-bloom.set-compositor.meta.v01';
let set=createExperienceSet(),meta={},demo=false;
let drag={pointerId:null,id:null,armed:false,timer:0,startX:0,startY:0};

function toast(s){const e=$('#toast');e.textContent=s;e.classList.remove('on');void e.offsetWidth;e.classList.add('on')}
function readStore(){
  try{const raw=localStorage.getItem(STORE);if(raw)set=decodeExperienceSet(raw)}catch(_){}
  try{meta=JSON.parse(localStorage.getItem(META)||'{}')||{}}catch(_){meta={}}
}
function save(){
  if(demo)return;
  try{localStorage.setItem(STORE,encodeExperienceSet(prepareSet(set)));localStorage.setItem(META,JSON.stringify(meta))}catch(_){}
}
function labelFor(e){return meta[e.sourceId]?.name||e.sourceId.replace(/^sha256:/,'SHA · ').slice(0,34)}
function widthFor(e){return Math.round(190+Math.min(140,Math.max(0,(Number(e.weight)||1)-1)*70))}
function render(){
  set=prepareSet(set);
  const rail=$('#rail'),laws=seamLaws(set);rail.replaceChildren();
  set.entries.forEach((e,i)=>{
    const b=document.createElement('article');b.className='block';b.dataset.entryId=e.id;b.dataset.index=String(i);b.style.setProperty('--w',widthFor(e)+'px');
    b.innerHTML=`<div class="grab"><span class="n">CELL ${String(i+1).padStart(2,'0')}</span><span>⠿ HOLD</span></div><div class="name"></div><code></code><div class="weight"><button data-weight="-1">−</button><b>WEIGHT <span></span></b><button data-weight="1">+</button></div><div class="mini"><button data-move="-1">◀</button><button data-move="1">▶</button><button data-remove>REMOVE</button></div>`;
    b.querySelector('.name').textContent=labelFor(e);b.querySelector('code').textContent=e.sourceId;b.querySelector('.weight span').textContent=Number(e.weight||1).toFixed(2);
    b.querySelectorAll('[data-move]').forEach(x=>x.onclick=()=>{const d=+x.dataset.move,j=Math.max(0,Math.min(set.entries.length-1,i+d));if(j!==i){set=reorderEntries(set,i,j);save();render();toast('MOVED')}});
    b.querySelectorAll('[data-weight]').forEach(x=>x.onclick=()=>{set=setEntryWeight(set,i,(Number(e.weight)||1)+(+x.dataset.weight)*.25);save();render()});
    b.querySelector('[data-remove]').onclick=()=>{delete meta[e.sourceId];set=removeEntry(set,i);save();render();toast('REMOVED')};
    b.querySelector('.grab').onpointerdown=ev=>beginDrag(ev,e.id);
    rail.append(b);
    if(i<set.entries.length-1){
      const seam=document.createElement('div');seam.className='seam';const btn=document.createElement('button');btn.textContent=laws[i]||'CUT';btn.title='Cycle transition law';btn.onclick=()=>{set=cycleSeamLaw(set,i);save();render();toast('SEAM · '+seamLaws(set)[i])};seam.append(btn);rail.append(seam);
    }else{
      const seam=document.createElement('div');seam.className='seam closure';seam.innerHTML='<button disabled>RETURN</button>';rail.append(seam);
    }
  });
  $('#empty').hidden=!!set.entries.length;$('#count').textContent=set.entries.length+' SOURCE'+(set.entries.length===1?'':'S');$('#setId').textContent=set.id;$('#title').value=set.title;
  $('#preview').textContent=JSON.stringify({schema:set.schema,id:set.id,title:set.title,entries:set.entries.map(e=>({sourceId:e.sourceId,weight:e.weight,transitionIn:e.transitionIn||null,transitionOut:e.transitionOut||null}))},null,2);
  document.documentElement.dataset.foldBloomSet='ready';document.documentElement.dataset.setEntries=String(set.entries.length);document.documentElement.dataset.setId=set.id;
}
function beginDrag(ev,id){
  clearTimeout(drag.timer);drag={pointerId:ev.pointerId,id,armed:ev.pointerType==='mouse',timer:0,startX:ev.clientX,startY:ev.clientY};
  if(!drag.armed)drag.timer=setTimeout(()=>{drag.armed=true;document.querySelector('[data-entry-id="'+CSS.escape(id)+'"]')?.classList.add('dragging');navigator.vibrate?.(8)},260);
}
addEventListener('pointermove',ev=>{
  if(drag.pointerId!==ev.pointerId||!drag.id)return;
  if(!drag.armed&&Math.hypot(ev.clientX-drag.startX,ev.clientY-drag.startY)>9){clearTimeout(drag.timer);drag.id=null;return}
  if(!drag.armed)return;
  ev.preventDefault();
  const target=document.elementFromPoint(ev.clientX,ev.clientY)?.closest?.('.block');if(!target)return;
  const from=set.entries.findIndex(e=>e.id===drag.id),to=set.entries.findIndex(e=>e.id===target.dataset.entryId);
  if(from>=0&&to>=0&&from!==to){set=reorderEntries(set,from,to);save();render();document.querySelector('[data-entry-id="'+CSS.escape(drag.id)+'"]')?.classList.add('dragging')}
},{passive:false});
function endDrag(ev){if(drag.pointerId!==ev.pointerId)return;clearTimeout(drag.timer);document.querySelector('.block.dragging')?.classList.remove('dragging');drag={pointerId:null,id:null,armed:false,timer:0,startX:0,startY:0}}
addEventListener('pointerup',endDrag);addEventListener('pointercancel',endDrag);

async function hashFile(file){const buf=await file.arrayBuffer(),h=await crypto.subtle.digest('SHA-256',buf);return 'sha256:'+Array.from(new Uint8Array(h),b=>b.toString(16).padStart(2,'0')).join('')}
async function addFiles(files){
  const xs=[...(files||[])];if(!xs.length)return;
  $('#status').textContent='HASHING '+xs.length+' SOURCE'+(xs.length===1?'':'S');
  for(const file of xs){
    const id=await hashFile(file);meta[id]={name:file.name,size:file.size,type:file.type||'audio'};set=appendSource(set,id);
  }
  save();render();$('#status').textContent='LOCAL · '+xs.length+' ADDED';toast('SOURCE REFS ADDED');
}
$('#files').onchange=e=>addFiles(e.target.files);
const drop=$('#drop');['dragenter','dragover'].forEach(k=>drop.addEventListener(k,e=>{e.preventDefault();drop.classList.add('over')}));['dragleave','drop'].forEach(k=>drop.addEventListener(k,e=>{e.preventDefault();drop.classList.remove('over')}));drop.addEventListener('drop',e=>addFiles(e.dataTransfer.files));
$('#title').onchange=e=>{set=renameSet(set,e.target.value);save();render()};
$('#addRef').onclick=()=>{const id=prompt('SOURCE ID / HASH REFERENCE');if(!id)return;set=appendSource(set,id);save();render();toast('REF ADDED')};
$('#importBtn').onclick=()=>$('#importFile').click();
$('#importFile').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{set=decodeExperienceSet(await f.text());demo=false;save();render();toast('SET IMPORTED')}catch(error){toast('IMPORT REJECTED');$('#status').textContent='IMPORT REJECTED · '+error.message}e.target.value=''};
$('#exportBtn').onclick=()=>{try{set=prepareSet(set);const blob=new Blob([encodeExperienceSet(set)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(set.title||'fold-bloom-set').replace(/[^a-z0-9_-]+/gi,'-').toLowerCase()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),800);save();render();toast('SET RETURN')}catch(error){toast('SET INVALID');$('#status').textContent=error.message}};
$('#clearBtn').onclick=()=>{const armed=$('#clearBtn').dataset.arm;if(!armed){$('#clearBtn').dataset.arm='1';$('#clearBtn').textContent='CONFIRM NEW SET';setTimeout(()=>{delete $('#clearBtn').dataset.arm;$('#clearBtn').textContent='NEW SET'},2500);return}delete $('#clearBtn').dataset.arm;$('#clearBtn').textContent='NEW SET';set=createExperienceSet();meta={};demo=false;save();render();toast('NEW SET')};

readStore();
if(new URLSearchParams(location.search).get('demo')==='1'&&!set.entries.length){
  demo=true;set=createExperienceSet('THREE SOURCE PROOF');
  for(const id of ['sha256:aaaaaaaaaaaaaaaa','sha256:bbbbbbbbbbbbbbbb','sha256:cccccccccccccccc'])set=appendSource(set,id);
  set=cycleSeamLaw(set,0);set=cycleSeamLaw(set,1);meta={'sha256:aaaaaaaaaaaaaaaa':{name:'SOURCE A'},'sha256:bbbbbbbbbbbbbbbb':{name:'SOURCE B'},'sha256:cccccccccccccccc':{name:'SOURCE C'}};
}
render();
window.FoldBloomSet={version:SET_COMPOSITOR_VERSION,state:()=>({set:structuredClone(set),meta:structuredClone(meta),demo}),appendSource:id=>{set=appendSource(set,id);save();render()},reorder:(a,b)=>{set=reorderEntries(set,a,b);save();render()},cycle:i=>{set=cycleSeamLaw(set,i);save();render()},export:()=>prepareSet(set)};
