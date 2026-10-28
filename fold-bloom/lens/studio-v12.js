'use strict';
const $=s=>document.querySelector(s), clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const DOMAINS={TEXT:['LETTER','WORD','PHRASE','SENTENCE','PARAGRAPH','SECTION','CHAPTER','BOOK','LIBRARY'],ATLAS:['PULSE','TASK','ROUTE','SESSION','DAY','WEEK','PROJECT','PROGRAM','FEDERATION'],DAYLINE:['MOMENT','ACTION','BLOCK','ARC','DAY','WEEK','CYCLE','SEASON','HISTORY'],DATADISC:['CELL','FIELD','ROW','RECORD','TABLE','DATASET','CORPUS','WAREHOUSE','ECOSYSTEM'],OBJECT:['TRACE','FEATURE','PART','COMPONENT','MODULE','ASSEMBLY','MACHINE','LINE','FLEET']};
const WINDOWS=[1,2,4,8,16,32,64,128,256], OPS=[['⊙','SELECT'],['↔','ALIGN'],['⊗','COMPOSE'],['⇢','PROPAGATE'],['✓','COMMIT'],['↩','RETURN']];
const DATA_KIND=['CELL','FIELD','ROW','RECORD','TABLE','DATASET','DATASET','DATASET','DATASET'];
let graph=null,map=new Map(),leaves=[],domain='DATADISC',scope=3,selected=0,activeOp='⊙',receipts=[],undoStack=[],receiptSeq=0,displayScope=3,targetScope=3,drag=null;
let inboundLensState=null,labOpen=false,apertureOrigin=null,apertureText='';
const cv=$('#cv'),ctx=cv.getContext('2d');
// Reuse the native controls; bring the work forward and fold inspection depth.
function arrangeWorkspace(){
  const shell=$('.shell'),dock=$('#lensDock'),tools=document.createElement('details');
  tools.id='lensTools';tools.className='panel lensTools';
  const summary=document.createElement('summary');summary.textContent='TOOLS / SOURCE / PROVENANCE';tools.append(summary);
  const work=document.createElement('section');work.id='lensWork';work.className='lensWork';work.setAttribute('aria-label','Current source and held comparisons');
  const reading=document.createElement('div');reading.className='workReading';
  const controls=document.createElement('div');controls.className='workControls';
  const nav=document.createElement('nav');nav.className='workNav';nav.setAttribute('aria-label','Move through source');
  for(const id of ['navPrev','navNext'])nav.append($('#'+id));
  controls.append(nav,$('#scopes'));
  const position=document.createElement('p');position.id='workPosition';position.className='mut';
  const source=$('#sourcePreview').parentElement;source.className='workSource';source.firstElementChild.textContent='CURRENT PASSAGE';
  reading.append(controls,position,source);
  const held=document.createElement('div');held.id='workHeld';held.className='workHeld';work.append(reading,held);dock.after(work);
  const header=shell.querySelector(':scope > header');if(header)tools.append(header);
  for(const node of [dock.querySelector('.dockGrid'),dock.querySelector('.dockTrail'),$('#ops').closest('section'),$('#text').closest('section'),$('#domains').closest('section'),$('#addressNav'),$('#spatialProjection'),$('#undo').closest('section')])if(node)tools.append(node);
  shell.append(tools);tools.ontoggle=()=>{if(tools.open!==labOpen)setLab(tools.open)};
  // Preserve the shared route controls inside the same native tools reveal.
  const tuck=()=>{const route=$('#showcase-route-adapter');if(!route?.shadowRoot)return false;
    const style=document.createElement('style');style.textContent=':host{display:block!important}.tab,.statusMembrane,.panel{position:static!important;margin:4px;box-shadow:none!important}.panel{width:auto!important;max-width:100%}';route.shadowRoot.append(style);tools.append(route);return true};
  if(!tuck()){const observer=new MutationObserver(()=>{if(tuck())observer.disconnect()});observer.observe(document.body,{childList:true})}
  document.body.classList.add('work-first');
}
arrangeWorkspace();
function workScopes(){
  if(graph?.source.format==='text'&&domain==='DATADISC')return [[0,'WORD'],[2,'SENTENCE'],[3,'PARAGRAPH'],[4,'DOCUMENT']];
  return DOMAINS[domain].map((name,i)=>[i,name]).filter(([i])=>domain!=='DATADISC'||graph?.nodes.some(n=>n.kind===DATA_KIND[i])&&i<=5);
}
function nextWorkScope(delta){
 const levels=workScopes().map(([i])=>i),index=levels.indexOf(scope);
 if(index>=0)return levels[clamp(index+delta,0,levels.length-1)];
 return delta>0?(levels.find(i=>i>scope)??levels.at(-1)):([...levels].reverse().find(i=>i<scope)??levels[0]);
}
function renderWork(){
  if(!graph||!leaves.length)return;
  const a=leaves[selected],n=domain==='DATADISC'?ancestorFor(a):a,p=n?.provenance||{},choices=workScopes();
  const name=choices.find(([i])=>i===scope)?.[1]||DOMAINS[domain][scope];
  $('#workPosition').textContent=name+(p.offsetStart!=null?` · CHAR ${p.offsetStart}–${p.offsetEnd}`:p.pointer!=null?' · JSON '+p.pointer:' · '+graph.source.name);
  const value=sourcePreview(n||a);if($('#sourcePreview').textContent!==value)$('#sourcePreview').textContent=value;
  const gs=groups(),i=gs.findIndex(g=>selected>=g.start&&selected<=g.end);$('#navPrev').disabled=i<=0;$('#navNext').disabled=i<0||i>=gs.length-1;
  document.body.classList.toggle('text-work',graph.source.format==='text');
}

function hash(s){let h=2166136261;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function h36(s){return hash(s).toString(36)}
function esc(s){return String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]||c))}
function ptr(s){return String(s).replace(/~/g,'~0').replace(/\//g,'~1')}
function scalar(v){if(v===null||v===undefined||v==='')return{type:'null',value:null};if(typeof v==='boolean')return{type:'boolean',value:v};if(typeof v==='number')return{type:Number.isInteger(v)?'integer':'number',value:v};const s=String(v).trim();if(/^(true|false)$/i.test(s))return{type:'boolean',value:/true/i.test(s)};if(/^[+-]?\d+$/.test(s))return{type:'integer',value:Number(s)};if(/^[+-]?(?:\d+\.\d*|\d*\.\d+)$/.test(s))return{type:'number',value:Number(s)};if(/^\d{4}-\d{2}-\d{2}/.test(s)&&!Number.isNaN(Date.parse(s)))return{type:s.includes('T')?'datetime':'date',value:s};return{type:'string',value:s}}
function inferField(name,values){const stats={},uniq=new Set();let nulls=0;for(const v of values){const q=scalar(v);stats[q.type]=(stats[q.type]||0)+1;if(q.type==='null')nulls++;else uniq.add(JSON.stringify(q.value))}const non=Math.max(1,values.length-nulls),types=Object.entries(stats).filter(([t])=>t!=='null').sort((a,b)=>b[1]-a[1]);let type=types[0]?.[0]||'null';if((stats.number||0)&&(stats.integer||0))type='number';const count=(stats[type]||0)+(type==='number'?(stats.integer||0):0),ur=uniq.size/non;return{name,type,confidence:+(count/non).toFixed(2),nullRate:+(nulls/Math.max(1,values.length)).toFixed(2),uniqueRate:+ur.toFixed(2),keyCandidate:/^(id|key|uuid|guid|code|name)$/i.test(name)&&ur>.9}}
function csvRows(text){const rows=[];let row=[],cell='',q=false;for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(q){if(c==='"'&&n==='"'){cell+='"';i++}else if(c==='"')q=false;else cell+=c}else if(c==='"')q=true;else if(c===','){row.push(cell);cell=''}else if(c==='\n'){row.push(cell);rows.push(row);row=[];cell=''}else if(c!=='\r')cell+=c}row.push(cell);if(row.some(Boolean))rows.push(row);return rows}
function builder(text,name,format){const sid='src_'+h36(text),nodes=[],m=new Map(),leafIds=[],tables=[];const source={id:sid,name,format,size:text.length,contentHash:h36(text),originalText:text};const id=(kind,path)=>`obj_${sid}_${kind.toLowerCase()}_${h36(kind+'|'+path)}`;function add(kind,path,label,opt={}){const n={id:id(kind,path),kind,type:opt.type||kind.toLowerCase(),label:String(label??kind).slice(0,120),value:opt.value??null,path,parentId:opt.parentId||null,childrenIds:[],relations:opt.relations||[],provenance:{sourceId:sid,name,format,...(opt.provenance||{})},history:[],hash:hash(kind+'|'+path+'|'+JSON.stringify(opt.value??''))};nodes.push(n);m.set(n.id,n);if(n.parentId&&m.has(n.parentId))m.get(n.parentId).childrenIds.push(n.id);if(opt.leaf)leafIds.push(n.id);return n}return{source,nodes,m,leafIds,tables,id,add}}
function addTable(b,label,path,records,prov={}){const ds=b.m.get(b.id('DATASET','/'))||b.add('DATASET','/','dataset',{provenance:prov});const table=b.add('TABLE',path,label,{parentId:ds.id,provenance:prov});const keys=[];records.forEach(r=>Object.keys(r||{}).forEach(k=>{if(!keys.includes(k))keys.push(k)}));if(!keys.length)keys.push('value');const fields=keys.map((k,j)=>{const f=inferField(k,records.map(r=>r?.[k]));const def=b.add('FIELD_DEF',path+'/schema/'+ptr(k),k,{parentId:table.id,type:f.type,provenance:{...prov,column:j+1}});return{...f,id:def.id}});const key=fields.find(f=>f.keyCandidate);records.forEach((r,ri)=>{const rk=key&&r[key.name]!=null?String(r[key.name]):String(ri),rec=b.add('RECORD',path+'/record/'+ptr(rk),key?`${key.name}=${rk}`:`record ${ri+1}`,{parentId:table.id,provenance:{...prov,row:ri+1,pointer:path+'/'+ri}}),row=b.add('ROW',path+'/record/'+ptr(rk)+'/row','row '+(ri+1),{parentId:rec.id,provenance:{...prov,row:ri+1,pointer:path+'/'+ri}});fields.forEach((f,ci)=>{const raw=r?.[f.name],q=scalar(raw),fld=b.add('FIELD',path+'/record/'+ptr(rk)+'/field/'+ptr(f.name),f.name,{parentId:row.id,type:f.type,provenance:{...prov,row:ri+1,column:ci+1,pointer:path+'/'+ri+'/'+ptr(f.name)},relations:[{kind:'instance-of',target:f.id},{kind:'record',target:rec.id}]});b.add('CELL',fld.path+'/cell',f.name,{parentId:fld.id,type:q.type,value:q.value,leaf:true,provenance:{...prov,row:ri+1,column:ci+1,header:f.name,pointer:path+'/'+ri+'/'+ptr(f.name)},relations:[{kind:'field-definition',target:f.id},{kind:'record',target:rec.id},{kind:'table',target:table.id}]})})});b.tables.push({id:table.id,label,path,fields,keyField:key?.name||null,recordCount:records.length})}
function intakeLineage(data,objectId){const events=(data.events||[]).filter(e=>e.entityId===objectId||e.beforeId===objectId||e.afterId===objectId||(e.removed||[]).includes(objectId)||(e.restored||[]).includes(objectId)),receipts=(data.ingressReceipts||[]).filter(r=>(r.forwardRecords||[]).some(x=>x.id===objectId)||(r.beforeRecords||[]).some(x=>x.id===objectId)||(r.delta?.added||[]).some(x=>x.id===objectId)||(r.delta?.replaced||[]).some(x=>x.beforeId===objectId||x.afterId===objectId));return{eventIds:events.map(e=>e.id),receiptIds:receipts.map(r=>r.receiptId)}}
function bindIntakeIdentity(b,data){const keys=['tasks','anchors','observations','claims','measurements'];let firstCanonicalId=null;for(const key of keys){for(const record of data[key]||[]){if(!record?.id)continue;if(!firstCanonicalId)firstCanonicalId=record.id;const recPath='/'+ptr(key)+'/record/'+ptr(record.id),rec=b.nodes.find(n=>n.kind==='RECORD'&&n.path===recPath);if(!rec)continue;const returnAddress='/field-intake/#record='+encodeURIComponent(record.id),lineage=intakeLineage(data,record.id),upstream={protocol:'poly.ingress/v0.4',kind:record.kind||key.replace(/s$/,''),source:record.source||null,refs:record.refs||[],lineage};for(const n of b.nodes){if(n.id===rec.id||n.path.startsWith(rec.path+'/')){n.canonicalOwnerId=record.id;n.returnAddress=returnAddress;n.upstream=upstream}}}}b.source.protocol='poly.ingress/v0.4';b.source.primaryCanonicalId=firstCanonicalId}
function parseSource(text,name='pasted',forceText=false){text=String(text);let format='text',data=null;if(!forceText)try{data=JSON.parse(text);format='json'}catch(_){const rows=csvRows(text);if(rows.length>1&&rows[0].length>1)format='csv'}const b=builder(text,name,format);if(format==='csv'){const rows=csvRows(text),head=(rows.shift()||[]).map((x,i)=>x.trim()||'field_'+(i+1)),records=rows.map(r=>Object.fromEntries(head.map((h,i)=>[h,r[i]??''])));addTable(b,name,'/table/0',records,{lineStart:1,lineEnd:rows.length+1})}else if(format==='json'){const tables=[];function walk(v,path='/'){if(Array.isArray(v)){tables.push({path,label:path==='/'?'root':path.split('/').pop(),records:v.map(x=>x&&typeof x==='object'&&!Array.isArray(x)?x:{value:x})});v.forEach((x,i)=>{if(x&&typeof x==='object'&&!Array.isArray(x))Object.entries(x).forEach(([k,y])=>{if(Array.isArray(y))walk(y,path.replace(/\/$/,'')+'/'+i+'/'+ptr(k))})})}else if(v&&typeof v==='object'){const arrs=Object.entries(v).filter(([,x])=>Array.isArray(x));if(!arrs.length)tables.push({path,label:path==='/'?'root object':path.split('/').pop(),records:[v]});arrs.forEach(([k,x])=>walk(x,(path==='/'?'':path)+'/'+ptr(k)))}}walk(data);const seen=new Set();tables.forEach(t=>{if(!seen.has(t.path)){seen.add(t.path);addTable(b,t.label,t.path,t.records,{pointer:t.path})}});if(data?.meta?.schema==='poly.ingress/v0.4')bindIntakeIdentity(b,data)}else{const ds=b.add('DATASET','/','text dataset'),table=b.add('TABLE','/document',name,{parentId:ds.id,type:'document',provenance:{offsetStart:0,offsetEnd:text.length}});b.tables.push({id:table.id,label:name,path:'/document',fields:[{name:'token',type:'string',confidence:1,nullRate:0}],recordCount:0});let offset=0,pi=0;for(const ptxt of text.split(/\n\s*\n/)){const start=text.indexOf(ptxt,offset);offset=start+ptxt.length;if(!ptxt.trim())continue;const rec=b.add('RECORD',`/document/paragraph/${pi}`,`paragraph ${pi+1}`,{parentId:table.id,type:'paragraph',provenance:{offsetStart:start,offsetEnd:offset}});let si=0;for(const sm of ptxt.matchAll(/[^.!?\r\n]+(?:[.!?]+|(?=\r?\n|$))/g)){const st=sm[0],ss=start+sm.index;if(!st.trim())continue;const row=b.add('ROW',rec.path+'/sentence/'+si,'sentence '+(si+1),{parentId:rec.id,type:'sentence',provenance:{offsetStart:ss,offsetEnd:ss+st.length}}),fld=b.add('FIELD',row.path+'/tokens','tokens',{parentId:row.id,type:'token-sequence',provenance:{offsetStart:ss,offsetEnd:ss+st.length}});let ti=0;for(const tm of st.matchAll(/\p{L}[\p{L}\p{M}'’\-]*|\d+(?:\.\d+)?|[^\s]/gu)){const token=tm[0],q=scalar(token);b.add('CELL',fld.path+'/token/'+ti,token,{parentId:fld.id,type:/^\p{L}/u.test(token)?'word':q.type,value:q.value,leaf:true,provenance:{offsetStart:ss+tm.index,offsetEnd:ss+tm.index+token.length}});ti++}si++}pi++}b.tables[0].recordCount=pi}return{source:b.source,schema:{format,tables:b.tables},nodes:b.nodes,leafIds:b.leafIds,rootIds:b.nodes.filter(n=>!n.parentId).map(n=>n.id)}}
function indexGraph(){map=new Map(graph.nodes.map(n=>[n.id,n]));leaves=graph.leafIds.map(id=>map.get(id)).filter(Boolean);selected=clamp(selected,0,Math.max(0,leaves.length-1))}
function ancestry(id){const out=[];let n=map.get(id),guard=0;while(n&&guard++<32){out.push(n);n=n.parentId?map.get(n.parentId):null}return out}
function ancestorFor(a,level=scope){if(domain!=='DATADISC')return null;const want=DATA_KIND[level],chain=ancestry(a.id);return chain.find(n=>n.kind===want)||chain[chain.length-1]||a}
function groups(level=scope){if(!leaves.length)return[];if(domain==='DATADISC'){const seen=new Map();leaves.forEach((a,i)=>{const n=ancestorFor(a,level),key=n?.id||a.id;if(!seen.has(key))seen.set(key,{id:key,start:i,end:i,items:[],label:n?.label||a.label,hash:n?.hash||a.hash,node:n});const q=seen.get(key);q.end=i;q.items.push(a)});return[...seen.values()].map(q=>({...q,count:q.items.length}))}const n=WINDOWS[level],out=[];for(let i=0;i<leaves.length;i+=n){const items=leaves.slice(i,i+n);if(items.length)out.push({id:`rng_${graph.source.id}_${i}_${i+items.length-1}`,start:i,end:i+items.length-1,items,label:items[0].label,count:items.length,hash:items.reduce((x,a)=>x^a.hash,0)>>>0})}return out}
function currentGroup(){return groups().find(g=>selected>=g.start&&selected<=g.end)||groups()[0]}
function state(){return{domain,scope,activeOp,selectedId:leaves[selected]?.id||null}}
function applyState(st){if(!st)return;domain=st.domain||domain;scope=targetScope=clamp(st.scope??scope,0,8);activeOp=st.activeOp||activeOp;const i=leaves.findIndex(a=>a.id===st.selectedId);if(i>=0)selected=i;renderAll()}
function receipt(op,subject,result,before=state(),after=state()){const r={id:'r'+(++receiptSeq),at:new Date().toISOString(),op,domain,scope:DOMAINS[domain][scope],subject,result,before,after,returned:false};receipts.push(r);if(receipts.length>80)receipts.shift();const a=leaves[selected];if(a&&!a.history.includes(r.id))a.history.push(r.id);renderReceipts();return r}
function transact(op,subject,fn,result=''){const before=state();fn();const after=state(),r=receipt(op,subject,result,before,after);undoStack.push(r.id);syncHash();renderAll();return r}
function identity(a=leaves[selected]){return a?.canonicalOwnerId||a?.canonicalId||a?.id||null}
function address(a=leaves[selected]){const g=currentGroup()||{start:selected,end:selected};return{identity:identity(a),canonical:`scale://${graph.source.id}/object/${a.id}`,projection:`scale://${graph.source.id}/${domain.toLowerCase()}/${DOMAINS[domain][scope].toLowerCase()}/${g.start}-${g.end}`,range:`rng://${graph.source.id}/${g.start}-${g.end}`,returnAddress:a?.returnAddress||inboundLensState?.returnAddress||null}}
function firstLeaf(id){if(graph.leafIds.includes(id))return id;const q=[...(map.get(id)?.childrenIds||[])],seen=new Set();while(q.length){const x=q.shift();if(seen.has(x))continue;seen.add(x);if(graph.leafIds.includes(x))return x;q.push(...(map.get(x)?.childrenIds||[]))}return null}
function jumpNode(id,subject='jump'){const n=map.get(id);if(!n)return;const lid=firstLeaf(id)||id,i=leaves.findIndex(a=>a.id===lid);if(i<0)return;transact('⊙',subject,()=>{selected=i;if(domain==='DATADISC'){const k=DATA_KIND.indexOf(n.kind);if(k>=0)scope=targetScope=k}},`${n.kind} ${n.label}`)}
function setScope(n,subject='scope'){n=clamp(n,0,8);if(n===scope)return;transact('⇢',subject,()=>{scope=targetScope=n},DOMAINS[domain][n])}
function setDomain(d){if(d===domain)return;transact('↔','project anchor',()=>domain=d,d)}
function moveGroup(delta){const gs=groups(),cur=currentGroup(),i=gs.findIndex(g=>g.id===cur?.id),nx=gs[clamp(i+delta,0,gs.length-1)];if(nx&&nx.id!==cur?.id)transact('⊙',delta<0?'previous sibling':'next sibling',()=>selected=nx.start,nx.label)}
function syncHash(){if(!graph||!leaves[selected])return;const q=new URLSearchParams({focus:leaves[selected].id,domain,scope:String(scope)});history.replaceState(null,'',location.pathname+location.search+'#'+q)}
function applyHash(){if(!location.hash||!graph)return;const q=new URLSearchParams(location.hash.slice(1)),id=q.get('focus'),d=q.get('domain'),s=Number(q.get('scope'));if(d&&DOMAINS[d])domain=d;if(Number.isFinite(s)&&q.has('scope'))scope=targetScope=clamp(s,0,8);const i=leaves.findIndex(a=>a.id===id);if(i>=0)selected=i}
function renderOps(){const b=$('#ops');b.innerHTML='';OPS.forEach(([s,n])=>{const x=document.createElement('button');x.textContent=s+' '+n;x.classList.toggle('on',activeOp===s);x.onclick=()=>transact(s,'operator',()=>activeOp=s,n);b.appendChild(x)})}
function renderDomains(){const b=$('#domains');b.innerHTML='';Object.keys(DOMAINS).forEach(d=>{const x=document.createElement('button');x.textContent=d;x.classList.toggle('on',domain===d);x.onclick=()=>setDomain(d);b.appendChild(x)})}
function renderScopes(){const b=$('#scopes');b.innerHTML='';workScopes().forEach(([i,n])=>{const x=document.createElement('button');x.textContent=n;x.classList.toggle('on',scope===i);x.onclick=()=>setScope(i);b.appendChild(x)})}
function renderAddress(){if(!graph||!leaves.length)return;const a=leaves[selected],addr=address(a),chain=ancestry(a.id).reverse(),crumbs=$('#crumbs');crumbs.innerHTML='';if(domain==='DATADISC'){chain.forEach((n,i)=>{const x=document.createElement('button');x.className='crumb'+(n.id===ancestorFor(a)?.id?' on':'');x.textContent=n.kind;x.title=n.label;x.onclick=()=>jumpNode(n.id,'breadcrumb');crumbs.appendChild(x);if(i<chain.length-1){const s=document.createElement('span');s.textContent='›';crumbs.appendChild(s)}})}else{DOMAINS[domain].forEach((n,i)=>{const x=document.createElement('button');x.className='crumb'+(i===scope?' on':'');x.textContent=n;x.onclick=()=>setScope(i,'breadcrumb');crumbs.appendChild(x)})}$('#identity').textContent=addr.identity||'—';$('#canonical').textContent=addr.canonical;$('#projection').textContent=addr.projection;$('#range').textContent=addr.range;const ret=$('#returnUpstream');ret.hidden=!addr.returnAddress;ret.dataset.href=addr.returnAddress||'';const pr=$('#projectionRail');pr.innerHTML='';Object.keys(DOMAINS).forEach(d=>{const x=document.createElement('button');x.classList.toggle('on',d===domain);x.innerHTML=`<b>${d}</b><span>${DOMAINS[d][scope]}</span>`;x.onclick=()=>setDomain(d);pr.appendChild(x)});const n=domain==='DATADISC'?ancestorFor(a):a,rels=[];(n?.relations||[]).forEach(r=>{const t=map.get(r.target);if(t)rels.push({kind:r.kind,node:t})});if(n?.parentId&&map.get(n.parentId))rels.unshift({kind:'parent',node:map.get(n.parentId)});const p=n?.parentId?map.get(n.parentId):null;(p?.childrenIds||[]).filter(id=>id!==n.id).slice(0,6).forEach(id=>{const t=map.get(id);if(t)rels.push({kind:'sibling',node:t})});const rb=$('#relations');rb.innerHTML='';rels.slice(0,9).forEach(r=>{const x=document.createElement('button');x.innerHTML=`<b>${esc(r.kind)}</b><span>${esc(r.node.kind)} · ${esc(r.node.label)}</span>`;x.onclick=()=>jumpNode(r.node.id,'relation '+r.kind);rb.appendChild(x)});if(!rb.children.length)rb.textContent='No local relation targets.';renderWork();renderHeldRanges()}
function renderHeldRanges(){
  let box=$('#heldRanges');
  if(!apertureOrigin||graph.source.originalText!==apertureText){if(box)box.remove();return}
  if(!box){box=document.createElement('div');box.id='heldRanges';($('#workHeld')||$('#sourcePreview').parentElement).append(box)}
  box.replaceChildren();
  const heading=document.createElement('div');heading.className='mut';heading.textContent='HELD SOURCE RANGES · quotes stay fixed as focus moves';box.append(heading);
  for(const r of apertureOrigin.witnesses){
    const quote=document.createElement('blockquote');quote.textContent=r.quote;
    const button=document.createElement('button');button.textContent=`FOCUS ${r.start}–${r.end}`;
    const leaf=leaves.find(n=>n.provenance?.offsetStart>=r.start&&n.provenance.offsetEnd<=r.end);
    button.disabled=!leaf;button.title=leaf?'Focus the first atom inside this held range':'This range has no mapped atom';
    button.onclick=()=>jumpNode(leaf.id,'held source range');box.append(button,quote);
  }
}
function sourcePreview(a){if(a?.upstream?.source?.raw){const lin=a.upstream.lineage||{eventIds:[],receiptIds:[]};return a.upstream.source.raw+'\n\nUPSTREAM '+a.upstream.protocol+'\nEVENTS '+lin.eventIds.join(', ')+'\nRECEIPTS '+lin.receiptIds.join(', ')}const src=graph.source.originalText,p=a.provenance||{};if(p.offsetStart!=null)return src.slice(p.offsetStart,p.offsetEnd??p.offsetStart);if(p.row!=null){const lines=src.split(/\r?\n/);return lines.slice(Math.max(0,p.row-2),Math.min(lines.length,p.row+1)).join('\n')}return `${p.pointer||''}\n${JSON.stringify(a.value,null,2)}`}
function renderSpec(){const a=leaves[selected],g=currentGroup();if(!a){$('#spec').textContent='No parsed atoms.';return}const addr=address(a),hist=a.history.slice(-5).map(id=>receipts.find(r=>r.id===id)).filter(Boolean);$('#spec').innerHTML=`<div class=row><span>identity</span><b>${esc(identity(a)||'—')}</b></div><div class=row><span>local id</span><b>${esc(a.id)}</b></div><div class=row><span>kind/type</span><b>${esc(a.kind)} · ${esc(a.type)}</b></div><div class=row><span>value</span><b>${esc(a.value??'—')}</b></div><div class=row><span>scope</span><b>${DOMAINS[domain][scope]} · ${g?.start??0}–${g?.end??0}</b></div><div class=row><span>projection</span><b>${esc(addr.projection)}</b></div><div class=row><span>history</span><b>${hist.map(r=>r.id+' '+r.op+' '+r.subject).join('<br>')||'—'}</b></div>`}
function renderSchema(){if(!graph)return;let h=`<div class=row><span>source</span><b>${esc(graph.source.id)} · ${esc(graph.source.name)}</b></div><div class=row><span>format</span><b>${graph.source.format} · ${graph.source.size} bytes</b></div>`;graph.schema.tables.forEach(t=>{h+=`<div><b>${esc(t.label)}</b><span class=tag>${t.recordCount} records</span><div class=schemaGrid><b>FIELD</b><b>TYPE</b><b>CONF</b><b>NULL</b>`;t.fields.forEach(f=>h+=`<span>${esc(f.name)}${f.keyCandidate?' ★':''}</span><span>${esc(f.type)}</span><span>${Math.round((f.confidence||0)*100)}%</span><span>${Math.round((f.nullRate||0)*100)}%</span>`);h+='</div></div>'});$('#schema').innerHTML=h}
function renderIso(){const b=$('#iso');b.innerHTML='';Object.keys(DOMAINS).forEach(d=>{const x=document.createElement('div');x.innerHTML=`<b>${d}</b>${DOMAINS[d][scope]}<br><span>anchor ${esc(leaves[selected]?.id||'—')}</span>`;b.appendChild(x)})}
function renderMetrics(){const vals=[['atoms',leaves.length],['nodes',graph?.nodes.length||0],['groups',groups().length],['tables',graph?.schema.tables.length||0],['format',graph?.source.format||'—'],['scope',DOMAINS[domain][scope]]],b=$('#metrics');b.innerHTML='';vals.forEach(([k,v])=>{const x=document.createElement('div');x.innerHTML=`${k}<b>${v}</b>`;b.appendChild(x)})}
function renderReceipts(){const b=$('#receipts');b.innerHTML='';receipts.slice(-16).reverse().forEach(r=>{const x=document.createElement('div');x.className='receipt'+(r.returned?' returned':'');x.innerHTML=`<b>${r.op}</b><span>${r.scope}</span><span>${r.domain}</span><span>${esc(r.subject)} ${esc(r.result||'')}</span>`;b.appendChild(x)})}
function spatialSnapshot(){if(!graph||!leaves.length)return null;const a=leaves[selected],addr=address(a),chain=ancestry(a.id).reverse();return{source:{id:graph.source.id,name:graph.source.name,format:graph.source.format},identity:identity(a),selectedId:a.id,activeOp,domain,scope,scopeName:DOMAINS[domain][scope],address:addr,chain:chain.map((n,i)=>({id:n.id,kind:n.kind,label:n.label,value:n.value,hash:n.hash,depth:i,canonicalOwnerId:n.canonicalOwnerId||null}))}}
function sharedLensStateSnapshot(){const snap=spatialSnapshot();if(!snap||!window.LensState)return null;const base=LensState.fromScaleSnapshot(snap,{returnAddress:inboundLensState?.returnAddress||''});if(inboundLensState){base.objectId=inboundLensState.objectId||base.objectId;base.returnAddress=inboundLensState.returnAddress||base.returnAddress;base.sourceRefs=[...new Set([...(inboundLensState.sourceRefs||[]),...(base.sourceRefs||[])])];base.meta={...(base.meta||{}),upstreamContract:inboundLensState.meta?.contract||null,upstreamProjection:inboundLensState.projection||null,upstreamAperture:inboundLensState.aperture||null,upstreamLensStack:inboundLensState.lensStack||[],upstreamMeta:inboundLensState.meta||{}}}return LensState.normalize(base)}
function returnTarget(){if(graph&&leaves.length){const a=address();if(a?.returnAddress)return a.returnAddress}return inboundLensState?.returnAddress||'/'}
function returnToCaller(){
  if(apertureOrigin){
    try{
      const saved=JSON.parse(sessionStorage.getItem('interphase.continuum.v1')||'null');
      if(saved?.source?.hash!==apertureOrigin.revision||saved.source.raw!==graph?.source.originalText)throw Error('Caller source changed; return held.');
      const u=new URL(apertureOrigin.returnAddress,location.href);
      if(u.origin!==location.origin||u.searchParams.get('resume')!==apertureOrigin.revision)throw Error('Caller address changed; return held.');
      location.href=u.href;
    }catch(e){alert(e.message)}
    return;
  }
  location.href=returnTarget();
}
function setLab(open){labOpen=!!open;document.body.classList.toggle('lab-open',labOpen);const tools=$('#lensTools');if(tools&&tools.open!==labOpen)tools.open=labOpen;const b=$('#labToggle');if(b){b.setAttribute('aria-pressed',String(labOpen));b.textContent=labOpen?'CLOSE TOOLS':'TOOLS'}if(graph){renderScopes();renderWork()}}
function renderDock(){
  if(!graph||!leaves.length)return;
  const a=leaves[selected],addr=address(a),s=sharedLensStateSnapshot(),upstream=inboundLensState?.lensStack||s?.meta?.upstreamLensStack||[];
  const title=inboundLensState?.meta?.title||inboundLensState?.meta?.route?.title||graph.source?.name||a?.label||'ADDRESSED OBJECT';
  $('#dockTitle').textContent=title;
  $('#dockObject').textContent=title;
  $('#dockIdentity').textContent=s?.objectId||identity(a)||'—';
  $('#dockAperture').textContent=DOMAINS[domain][scope]||'—';
  $('#dockRange').textContent=addr.range||'—';
  $('#dockView').textContent=domain;
  $('#dockProjection').textContent=addr.projection||'—';
  $('#dockStack').textContent=upstream.length?upstream.map(x=>x.lensId).join(' → '):'PLAIN';
  $('#dockStackMeta').textContent=upstream.length+' VIEW LENS'+(upstream.length===1?'':'ES')+(inboundLensState?' · UPSTREAM PROVENANCE':'');
  $('#dockSource').textContent='SOURCE '+(graph.source?.name||graph.source?.id||'—');
  $('#dockFocus').textContent='FOCUS '+(a?.label||a?.id||'—');
  $('#dockReturnPath').textContent='RETURN '+returnTarget();
  const returnLabel=inboundLensState?'↩ RETURN':'↩ FIELD',returnHref=returnTarget();const ret=$('#dockReturn');if(ret){ret.textContent=returnLabel;ret.title=returnHref}const topRet=$('#fieldBtn');if(topRet){topRet.textContent=returnLabel;topRet.title=returnHref}
}
function notifySpatial(){if(typeof window!=='undefined'&&window.ScaleLensSpatialAPI)window.dispatchEvent(new CustomEvent('scale-lens:state',{detail:spatialSnapshot()}))}
function notifyLensState(){const s=sharedLensStateSnapshot();if(s)window.dispatchEvent(new CustomEvent('lens-state:state',{detail:s}))}
function renderAll(){renderOps();renderDomains();renderScopes();renderAddress();renderSpec();renderSchema();renderIso();renderMetrics();renderReceipts();renderDock();notifySpatial();notifyLensState()}
function search(q){q=String(q).trim().toLowerCase();if(!q||!graph)return[];const exact=q.match(/\/object\/([^/?#]+)/)?.[1];if(exact&&map.has(exact))return[map.get(exact)];return graph.nodes.filter(n=>n.id.toLowerCase().includes(q)||String(n.label).toLowerCase().includes(q)||String(n.value??'').toLowerCase().includes(q)||String(n.provenance?.pointer||'').toLowerCase().includes(q)).slice(0,10)}
function renderResults(rs){const b=$('#results');b.innerHTML='';rs.forEach(n=>{const x=document.createElement('button');x.className='result';x.innerHTML=`<b>${esc(n.kind)}</b><span>${esc(n.label)}</span><small>${esc(n.id)}</small>`;x.onclick=()=>jumpNode(n.id,'address search');b.appendChild(x)})}
function load(text,name,forceText=false){try{graph=parseSource(text,name,forceText);map=new Map();leaves=[];selected=0;domain=graph.source.format==='text'?'TEXT':'DATADISC';scope=targetScope=graph.source.format==='text'?1:3;indexGraph();if(forceText&&apertureOrigin){domain='DATADISC';scope=targetScope=2;const ix=leaves.findIndex(n=>n.provenance?.offsetStart<=apertureOrigin.anchor&&n.provenance.offsetEnd>apertureOrigin.anchor);if(ix>=0)selected=ix}if(graph.source.primaryCanonicalId){const upstreamIndex=leaves.findIndex(a=>a.canonicalOwnerId===graph.source.primaryCanonicalId);if(upstreamIndex>=0)selected=upstreamIndex}applyHash();receipt('⊙','parse',`${name} · ${leaves.length} typed atoms`);syncHash();renderAll()}catch(e){console.error(e);alert('Parse failed: '+e.message)}}
function drawLevel(level,alpha){const gs=groups(level),cx=cv.width/2,cy=cv.height/2,r=Math.min(cv.width,cv.height)*.32;ctx.save();ctx.globalAlpha=alpha;gs.slice(0,180).forEach((gr,i)=>{const a=-Math.PI/2+i/Math.max(1,gs.length)*Math.PI*2,rr=r,x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr,rad=4+Math.log2(gr.count+1)*3;ctx.fillStyle='#8793a5';ctx.beginPath();ctx.arc(x,y,rad,0,Math.PI*2);ctx.fill();if(selected>=gr.start&&selected<=gr.end){ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,rad+6,0,Math.PI*2);ctx.stroke()}});ctx.restore()}
function draw(){ctx.fillStyle='#05070b';ctx.fillRect(0,0,cv.width,cv.height);displayScope+=(targetScope-displayScope)*.14;const lo=Math.floor(displayScope),hi=Math.min(8,lo+1),f=displayScope-lo;drawLevel(lo,1-f);if(hi!==lo)drawLevel(hi,f);ctx.fillStyle='rgba(255,255,255,.88)';ctx.textAlign='center';ctx.font='15px ui-monospace';ctx.fillText(`${activeOp} ${DOMAINS[domain][scope]}`,cv.width/2,cv.height/2);ctx.fillStyle='rgba(255,255,255,.4)';ctx.font='11px ui-monospace';ctx.fillText('outline = focus · dot size = atom count · wheel = scope',cv.width/2,cv.height/2+22);$('#hud').textContent=`${graph?.source.format?.toUpperCase()||'—'} · ${domain} · ${leaves.length} atoms · ${groups().length} groups`;requestAnimationFrame(draw)}
function canvasSelect(e){if(!leaves.length)return;const rect=cv.getBoundingClientRect(),x=(e.clientX-rect.left)*cv.width/rect.width,y=(e.clientY-rect.top)*cv.height/rect.height,gs=groups(),cx=cv.width/2,cy=cv.height/2,r=Math.min(cv.width,cv.height)*.32;let best=null,bd=Infinity;gs.forEach((gr,i)=>{const a=-Math.PI/2+i/Math.max(1,gs.length)*Math.PI*2,rr=r,gx=cx+Math.cos(a)*rr,gy=cy+Math.sin(a)*rr,d=(gx-x)**2+(gy-y)**2;if(d<bd){bd=d;best=gr}});if(best)transact('⊙','canvas select',()=>selected=best.start,best.label)}
$('#sample').onclick=()=>{const sample={session:'dayline-demo',events:Array.from({length:18},(_,i)=>({id:'evt-'+String(i+1).padStart(3,'0'),time:`${8+Math.floor(i/4)}:${String((i%4)*15).padStart(2,'0')}`,kind:['observe','make','test','return'][i%4],project:['house','code','cats'][i%3],value:(i*7)%13,ok:i%5!==0}))};const t=JSON.stringify(sample,null,2);$('#text').value=t;load(t,'dayline-sample.json')};
$('#sampleIntake').onclick=()=>{const sample={meta:{schema:'poly.ingress/v0.4',title:'G2 synthetic fixture'},state:{now:'11:10',contexts:[],horizon:180,route:[]},tasks:[],anchors:[],observations:[{id:'o:fixture-alpha-g2',kind:'observation',title:'synthetic fixture present',contexts:['lab'],tags:['g2'],refs:[],notes:'release-safe synthetic interoperability fixture',source:{raw:'[obs] synthetic fixture present @lab #g2 at:11:10 // release-safe synthetic interoperability fixture',evidence:[{field:'kind',token:'[obs]',value:'observation'},{field:'observedAt',token:'at:11:10',value:'11:10'},{field:'context',token:'@lab',value:'lab'},{field:'tag',token:'#g2',value:'g2'}],warnings:[]},observedAt:'11:10'}],claims:[],measurements:[],events:[{id:'event:g2:add',type:'ingress.add',at:'2026-09-18T18:00:00+08:00',patchId:'patch:g2',entityId:'o:fixture-alpha-g2',entityKind:'observation'}],ingressReceipts:[{protocol:'poly.ingress/v0.4',patchId:'patch:g2',baseHash:'synthetic-base',resultHash:'synthetic-result',appliedAt:'2026-09-18T18:00:00+08:00',source:{kind:'capture',raw:'[obs] synthetic fixture present @lab #g2 at:11:10 // release-safe synthetic interoperability fixture'},delta:{added:[{kind:'observation',id:'o:fixture-alpha-g2'}],replaced:[],noops:[],rejected:[],conflicts:[]},forwardRecords:[],beforeRecords:[],receiptId:'receipt:g2'}]};const t=JSON.stringify(sample,null,2);$('#text').value=t;load(t,'field-intake-sample.json')};$('#parseBtn').onclick=()=>load($('#text').value,'pasted');$('#file').onchange=async e=>{const f=e.target.files[0];if(!f)return;const t=await f.text();$('#text').value=t.slice(0,250000);load(t,f.name)};$('#drop').ondragover=e=>{e.preventDefault();$('#drop').classList.add('on')};$('#drop').ondragleave=()=>$('#drop').classList.remove('on');$('#drop').ondrop=async e=>{e.preventDefault();$('#drop').classList.remove('on');const f=e.dataTransfer.files[0];if(!f)return;const t=await f.text();$('#text').value=t.slice(0,250000);load(t,f.name)};
$('#navRise').onclick=()=>setScope(nextWorkScope(1),'rise');$('#navDive').onclick=()=>setScope(nextWorkScope(-1),'dive');$('#navPrev').onclick=()=>moveGroup(-1);$('#navNext').onclick=()=>moveGroup(1);$('#query').oninput=e=>renderResults(search(e.target.value));$('#query').onkeydown=e=>{if(e.key==='Enter'){const r=search(e.target.value);if(r[0])jumpNode(r[0].id,'address jump')}};$('#jump').onclick=()=>{const r=search($('#query').value);if(r[0])jumpNode(r[0].id,'address jump')};$('#returnUpstream').onclick=returnToCaller;$('#copy').onclick=async()=>{if(!graph)return;const a=address(),txt=`${a.canonical}\n${a.projection}\n${location.origin+location.pathname+location.hash}`;try{await navigator.clipboard.writeText(txt);$('#copy').textContent='COPIED';setTimeout(()=>$('#copy').textContent='COPY FOCUS',700)}catch(_){prompt('Copy focus:',txt)}};
$('#undo').onclick=()=>{let r=null;while(undoStack.length&&!r){const id=undoStack.pop(),q=receipts.find(x=>x.id===id);if(q&&!q.returned)r=q}if(r){const now=state();applyState(r.before);r.returned=true;receipt('↩','return receipt',r.id,now,state())}};$('#fieldBtn').onclick=returnToCaller;$('#dockReturn').onclick=returnToCaller;$('#labToggle').onclick=()=>{setLab(!labOpen);if(labOpen)$('#lensTools').scrollIntoView({block:'start'})};
$('#send').onclick=()=>{if(!graph)return;const packet={schema:'scale-lens.packet.v2',at:new Date().toISOString(),source:{id:graph.source.id,name:graph.source.name,format:graph.source.format},schemaModel:graph.schema,domain,scope,operator:activeOp,focus:{...address(),objectId:leaves[selected].id},items:leaves.slice(0,128).map((a,i)=>({id:a.id,identity:identity(a),returnAddress:a.returnAddress||null,upstream:a.upstream||null,label:a.label,value:a.value,type:a.type,kind:a.kind,hash:a.hash,address:{canonical:`scale://${graph.source.id}/object/${a.id}`,projection:`scale://${graph.source.id}/${domain.toLowerCase()}/${DOMAINS[domain][scope].toLowerCase()}/${i}-${i}`,range:`rng://${graph.source.id}/${i}-${i}`},provenance:a.provenance,relations:a.relations,history:a.history})),receipts:receipts.slice(-24)};localStorage.setItem('fb-lens-studio-packet',JSON.stringify(packet));receipt('↩','field',packet.items.length+' addressed atoms');location.href='../two-dial/'};
$('#export').onclick=()=>{if(!graph)return;const p={schema:'scale-lens.return.v3',at:new Date().toISOString(),source:graph.source,schemaModel:graph.schema,nodes:graph.nodes,leafIds:graph.leafIds,domain,scope,operator:activeOp,focus:{...address(),objectId:leaves[selected].id},receipts};const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(p,null,2)],{type:'application/json'}));a.download='scale-lens-return-v3.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);receipt('↩','export','return packet')};
cv.addEventListener('click',canvasSelect);cv.addEventListener('pointerdown',e=>{drag={y:e.clientY,scope,levels:workScopes().map(([i])=>i)};cv.setPointerCapture?.(e.pointerId)});cv.addEventListener('pointermove',e=>{if(!drag)return;const origin=Math.max(0,drag.levels.indexOf(drag.scope)),n=drag.levels[clamp(Math.round(origin+(drag.y-e.clientY)/42),0,drag.levels.length-1)];if(n!==scope){scope=targetScope=n;renderAll()}});cv.addEventListener('pointerup',()=>{if(!drag)return;const from=drag.scope;drag=null;if(from!==scope){const before={...state(),scope:from};const r=receipt('⇢','scope drag',DOMAINS[domain][scope],before,state());undoStack.push(r.id);syncHash()}});cv.addEventListener('wheel',e=>{e.preventDefault();setScope(nextWorkScope(e.deltaY>0?1:-1),'wheel')},{passive:false});addEventListener('hashchange',()=>{applyHash();renderAll()});
function lookupNode(id){
  const n=map.get(id);if(!n)throw Error('LENS_NODE_UNKNOWN:'+id);
  const chain=ancestry(id).reverse();
  return {id:n.id,kind:n.kind,label:n.label,type:n.type,value:n.value,parent:n.parentId||null,children:(n.childrenIds||[]).slice(),
    provenance:{...n.provenance},source:{id:graph.source.id,name:graph.source.name,format:graph.source.format},
    address:{canonical:`scale://${graph.source.id}/object/${n.id}`},chain:chain.map(x=>({id:x.id,kind:x.kind,label:x.label}))};
}
function restoreNative(s){
  if(!s||s.source?.id!==graph?.source.id||!map.has(s.selectedId)||!leaves.some(n=>n.id===s.selectedId)||!DOMAINS[s.domain]||!Number.isInteger(s.scope)||s.scope<0||s.scope>8)throw Error('LENS_RESTORE_INVALID');
  // Validate first, then apply once. Focusing a graph ancestor must not alter the restored scope.
  applyState({domain:s.domain,scope:s.scope,selectedId:s.selectedId,activeOp:s.activeOp||activeOp});syncHash();return spatialSnapshot();
}
window.ScaleLensSpatialAPI=Object.freeze({
  snapshot:spatialSnapshot,
  lookup:lookupNode,
  restore:restoreNative,
  focus:id=>{lookupNode(id);jumpNode(id,'focus ring');return spatialSnapshot()},
  aperture:delta=>{const n=clamp(scope+Number(delta||0),0,8);if(n!==scope)setScope(n,'focus ring aperture');return spatialSnapshot()},
  project:d=>{if(!DOMAINS[d])throw Error('LENS_DOMAIN_UNKNOWN:'+d);setDomain(d);return spatialSnapshot()},
  projections:()=>Object.keys(DOMAINS),
  return:()=>returnToCaller(),
  lensState:()=>sharedLensStateSnapshot()
});
window.ScaleLensStateAPI=Object.freeze({snapshot:sharedLensStateSnapshot});
async function consumeLensHandoff(){
  try{
    if(window.LensState){
      const h=LensState.readHandoff();
      if(!h&&new URLSearchParams(location.search).has('aperture'))throw Error('APERTURE_CARRIER_MISSING');
      if(h){
        const t=String(h.text||''),origin=h.state?.meta?.apertureOrigin;
        if(new URLSearchParams(location.search).has('aperture')&&!origin)throw Error('APERTURE_ORIGIN_REQUIRED');
        if(origin){
          const {hashText}=await import('/lib/id.js');
          if(t.length>250000||origin.schema!=='source-aperture-excursion/v1'||await hashText(t)!==origin.revision||!Number.isInteger(origin.anchor)||origin.anchor<0||origin.anchor>=t.length)throw Error('APERTURE_SOURCE_MISMATCH');
          const ranges=[origin.range,...(origin.witnesses||[])];
          if(!Array.isArray(origin.witnesses)||origin.witnesses.length>16||ranges.some(r=>!r||!Number.isInteger(r.start)||!Number.isInteger(r.end)||r.start<0||r.end>t.length||r.start>=r.end||t.slice(r.start,r.end)!==r.quote))throw Error('APERTURE_RANGE_MISMATCH');
          const saved=JSON.parse(sessionStorage.getItem('interphase.continuum.v1')||'null'),u=new URL(origin.returnAddress,location.href);
          if(saved?.source?.hash!==origin.revision||saved.source.raw!==t||u.origin!==location.origin||u.searchParams.get('resume')!==origin.revision)throw Error('APERTURE_CALLER_MISMATCH');
          apertureOrigin=origin;apertureText=t;
        }
        inboundLensState=h.state;document.body.classList.add('has-handoff');setLab(false);
        if(t){
          $('#text').value=t;load(t,h.title||'lens-handoff',!!origin);
          if(origin){
            domain='DATADISC';scope=targetScope=2;
            const i=leaves.findIndex(n=>n.provenance?.offsetStart<=origin.anchor&&n.provenance.offsetEnd>origin.anchor);
            if(i>=0)selected=i;
            else $('#sourcePreview').title='The caller anchor is whitespace or an unmapped character; its exact range remains held below.';
            syncHash();renderAll();
          }
          sessionStorage.removeItem(LensState.HANDOFF_KEY);sessionStorage.removeItem('scale.lens.handoff.v01');return true;
        }
      }
    }
  }catch(e){if(new URLSearchParams(location.search).has('aperture'))throw e;console.warn('LensState v2 handoff failed',e)}
  try{
    const raw=sessionStorage.getItem('scale.lens.handoff.v01');if(!raw)return false;
    sessionStorage.removeItem('scale.lens.handoff.v01');const h=JSON.parse(raw);if(!h||typeof h.text!=='string')return false;
    if(window.LensState)try{inboundLensState=LensState.fromLegacyHandoff(h)}catch(_){}
    document.body.classList.add('has-handoff');setLab(false);
    const t=h.text.slice(0,250000);$('#text').value=t;load(t,(h.label||'human-port-intake')+'.txt');return true
  }catch(_){return false}
}
consumeLensHandoff().then(loaded=>{if(!loaded){setLab(false);$('#sample').click()}draw()}).catch(e=>{$('#dockTitle').textContent='SOURCE HELD';$('#dockObject').textContent=e.message;console.error(e)});
