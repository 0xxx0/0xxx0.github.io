#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
const ROOT=process.cwd();
function browserBin(){
 if(process.env.SMOKE_BROWSER){if(!fs.existsSync(process.env.SMOKE_BROWSER))throw Error('SMOKE_BROWSER does not exist');return process.env.SMOKE_BROWSER;}
 for(const name of ['google-chrome-stable','google-chrome','chromium-browser','chromium']){const r=spawnSync('which',[name],{encoding:'utf8'});if(r.status===0)return r.stdout.trim();}
 throw Error('No Chromium binary; set SMOKE_BROWSER or run exact candidate GitHub Actions browser gate');
}
async function probe(){
 const f=document.getElementById('f'),out=document.getElementById('probeResult'),checks=[],messages=[],errors=[];
 let w,d,cw,cd,copied='';const delay=ms=>new Promise(r=>setTimeout(r,ms));
 const assert=(yes,msg,data)=>{if(!yes)throw Error(msg+(data===undefined?'':' '+JSON.stringify(data)));};
 const wait=async(fn,label,ms=6000)=>{const start=Date.now();while(Date.now()-start<ms){const result=fn();if(result)return result;await delay(30);}throw Error('Timeout: '+label+' '+JSON.stringify(benchSnapshot()));};
 const q=s=>d.querySelector(s),cq=s=>cd.querySelector(s);
 const text=id=>d.getElementById(id).textContent;
 const model=()=>JSON.parse(w.localStorage.getItem('decision-bench:model:v1'));
 function benchSnapshot(){if(!cw||!cd)return null;const held=model()||{},active=cd.activeElement;return{viewport:{carrier:[w.innerWidth,w.innerHeight],child:[cw.innerWidth,cw.innerHeight],frame:JSON.parse(JSON.stringify(q('#benchPane').getBoundingClientRect()))},mode:q('#modeName')?.textContent,hidden:q('#benchPane').hidden,rows:[...cd.querySelectorAll('[data-row]')].map(e=>e.dataset.row),options:held.options?.map(o=>o.id),axes:held.criteria?.map(c=>c.id),selected:held.selected,active:{id:active?.id,option:active?.dataset.option,axis:active?.dataset.axis,bound:active?.dataset.bound}};}
 const check=async(name,fn)=>{try{await fn();checks.push({name,pass:true});}catch(e){checks.push({name,pass:false,error:String(e.stack||e)});}};
 function edit(el,value){assert(el,'Input missing');el.value=value;el.dispatchEvent(new el.ownerDocument.defaultView.Event('input',{bubbles:true}));}
 function drawer(){if(!q('#sourceDock').open)q('#sourceToggle').click();assert(q('#sourceDock').open,'SOURCE/ROUTE reveal did not open');}
 async function choose(mode){drawer();q('nav [data-mode="'+mode+'"]').click();await delay(20);assert(!q('#sourceDock').open,'Route choice leaves obstruction');}
 async function source(value,label='source-A'){drawer();edit(q('#sourceName'),label);edit(q('#sourceText'),value);await wait(()=>text('charCount')===String(value.length),'source digest/count');}
 async function load(value,label,mode='bench'){
  await choose(mode);await source(value,label);const at=messages.length;q('#loadMode').click();
  if(mode==='bench'){
   const msg=await wait(()=>messages.slice(at).find(m=>m.type==='decision-bench:loaded'||m.type==='decision-bench:error'),'native source acknowledgement');assert(msg.type==='decision-bench:loaded','Bench import failed',msg);
  }else await wait(()=>!q('#sourceDock').open,'tool source delivery');
 }
 async function copy(){drawer();copied='';q('#copyReturn').click();await wait(()=>copied,'carrier clipboard');const receipt=JSON.parse(copied);q('#closeSource').click();assert(!q('#sourceDock').open,'Copied receipt leaves modal obstruction');return receipt;}
 async function record(){
  if(q('#sourceDock').open)q('#closeSource').click();const at=messages.length;
  assert(!cq('#returnBtn').disabled,'Native RETURN disabled');cq('#returnBtn').click();edit(cq('#rationale'),'Entered limits and explicit local comparison');edit(cq('#nextStep'),'Measure before committing a physical change');cq('#saveReturn').click();
  const returned=await wait(()=>messages.slice(at).find(m=>m.type==='decision-bench:return'),'new native RETURN bridge');assert(returned.requestId&&returned.receipt?.schema==='decision-bench-return/v1','Recorded RETURN lacks load binding',returned);
 }
 function geometry(width,height){
  const bad=[],r=e=>{const x=e.getBoundingClientRect();return{x:x.x,y:x.y,right:x.right,bottom:x.bottom,w:x.width,h:x.height};};
  for(const selector of ['header','#sourceToggle','#benchPane','.turnRail','#undoSource','#adoptResult','#quickReturn']){const x=r(q(selector));if(x.x<-1||x.y<-1||x.right>width+1||x.bottom>height+1||x.w<=0||x.h<=0)bad.push({selector,rect:x});}
  const frame=q('#benchPane'),outer=r(frame),innerWidth=cw.innerWidth,innerHeight=cw.innerHeight;
  for(const selector of ['header','footer','#modelBtn','#moreBtn','#returnBtn','.criteriaSection','.matrixSection','.result','#focus']){
   const e=cq(selector);if(selector==='#focus'&&!e.childElementCount)continue;const x=r(e);if(x.x<-1||x.y<-1||x.right>innerWidth+1||x.bottom>innerHeight+1||x.w<=0||x.h<=0)bad.push({native:selector,rect:x,innerWidth,innerHeight});
  }
  for(const e of cd.querySelectorAll('#matrix input,#matrix .optionSelect,#criteria input')){
   const x=r(e),top=cd.elementFromPoint(x.x+x.w/2,x.y+x.h/2);if(x.y<-1||x.bottom>innerHeight+1||x.right>innerWidth+1)bad.push({nativeControl:e.getAttribute('aria-label'),rect:x});
   if(top&&!e.contains(top)&&!top.contains(e))bad.push({hidden:e.getAttribute('aria-label'),by:top.id||top.className});
  }
  const overflow={parentX:Math.max(d.body.scrollWidth,d.documentElement.scrollWidth)-width,parentY:Math.max(d.body.scrollHeight,d.documentElement.scrollHeight)-height,childX:Math.max(cd.body.scrollWidth,cd.documentElement.scrollWidth)-innerWidth,childY:Math.max(cd.body.scrollHeight,cd.documentElement.scrollHeight)-innerHeight};
  if(Object.values(overflow).some(x=>x>1))bad.push({overflow});assert(!bad.length,'Integrated primary surface does not fit',{width,height,first:bad.slice(0,8),count:bad.length,outer});
 }
 try{
  localStorage.clear();sessionStorage.clear();f.src='/foundry/omnitools/?tool=bench';
  await wait(()=>f.contentWindow?.document?.getElementById('sourceToggle')?.onclick,'Omnitools boot');w=f.contentWindow;d=w.document;
  w.addEventListener('error',e=>errors.push(e.message));w.addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
  w.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===q('#benchPane').contentWindow)messages.push(e.data);});
  Object.defineProperty(w.navigator,'clipboard',{configurable:true,value:{writeText:async value=>{copied=value;}}});
  await wait(()=>q('#benchPane').contentWindow?.DecisionBenchCore&&q('#benchPane').contentDocument?.getElementById('returnBtn')?.onclick,'native Bench boot');cw=q('#benchPane').contentWindow;cd=cw.document;
  cw.addEventListener('error',e=>errors.push('Bench: '+e.message));cw.addEventListener('unhandledrejection',e=>errors.push('Bench: '+String(e.reason)));
  const input={schema:'decision-bench/v1',id:'omni-test',title:'Compare measured work surfaces',sample:false,context:'Fixture only',criteria:[{id:'width',label:'Width',unit:'cm',direction:'min',min:null,max:80},{id:'area',label:'Area',unit:'cm²',direction:'max',min:4000,max:null},{id:'reset',label:'Reset',unit:'min',direction:'min',min:null,max:15}],options:[{id:'table',label:'Table',values:{width:80,area:4800,reset:12},evidence:'Fixture numbers',next:''},{id:'board',label:'Board',values:{width:65,area:4500,reset:[3,5]},evidence:'Fixture range',next:''},{id:'uncertain',label:'Uncertain',values:{width:[70,90],area:4200,reset:2},evidence:'Fixture range',next:''},{id:'large',label:'Large',values:{width:100,area:6000,reset:40},evidence:'Fixture blocked option',next:''}],priority:'reset',selected:'board'};
  const json=JSON.stringify(input);
  await check('One native Bench, explicit JSON LOAD and mutable criteria',async()=>{
   assert(q('#benchPane').getAttribute('src')==='/forward-field-proof/triangle/bench/?embedded=1','Wrong Bench owner');assert(!q('#benchIn'),'Duplicate Omni evaluator still visible');
   await load(json,'source-A');assert(model().id===input.id,'Generic model lost');assert(cd.getElementById('counts').textContent==='2 FIT · 1 ? · 1 OUT','Native constraint state differs');assert(!q('#sourceDock').open,'Source drawer hides imported result');
  });
  await check('Native recorded decision is source/request-bound and evidence-only',async()=>{
   await record();const r=await copy();assert(r.authority==='EVIDENCE_ONLY','Carrier acquired authority');assert(r.bench?.receipt?.status==='PROPOSED'&&r.bench.requestId,'Native proposal not bound');
   assert(r.bench.receipt.provenance?.label==='source-A','Load provenance label absent',r.bench.receipt.provenance);
   assert(r.source.sha256_12===r.bench.source.sha256_12,'Source identity mismatch');
  });
  await check('Different held source excludes old decision and preview',async()=>{
   await source('new source bytes','source-B');const r=await copy();assert(r.bench===null&&r.projection_preview===null,'Stale evidence attached to new source',r);
   assert(r.trace.some(t=>t.source?.label==='source-A'),'Prior evidence lost its explicit source tag');
  });
  await check('Valid/invalid child edits invalidate cached receipt; invalid remains paused',async()=>{
   await load(json,'source-A');await record();edit(cq('[data-option="board"][data-axis="width"]'),'66');await delay(100);assert((await copy()).bench===null,'Changed model retains prior receipt');
   edit(cq('[data-option="board"][data-axis="width"]'),'bad');await delay(100);assert(cq('#returnBtn').disabled,'Invalid child draft can RETURN');assert((await copy()).bench===null,'Invalid child draft retains receipt');cq('#undoBtn').click();await delay(30);
  });
  await check('Invalid source acknowledgement preserves native model, binds no decision',async()=>{
   const before=JSON.stringify(model());await choose('bench');await source('{broken','bad-source');const start=messages.length;q('#loadMode').click();
   await wait(()=>messages.slice(start).some(m=>m.type==='decision-bench:error'),'invalid source response');assert(JSON.stringify(model())===before,'Rejected source replaced native model');assert((await copy()).bench===null,'Rejected source receives old result');
  });
  await check('Standalone/null-request RETURN cannot bind to held source',async()=>{
   await load(json,'source-A');await record();const r=JSON.parse(w.localStorage.getItem('decision-bench:returns:v1'))[0];
   cw.eval('parent.postMessage('+JSON.stringify({type:'decision-bench:return',requestId:null,receipt:r})+',location.origin)');await delay(100);assert((await copy()).bench===null,'Standalone decision bound to source');
  });
  await check('Same-origin wrong window and foreign origin cannot inject RETURN',async()=>{
   await load(json,'source-A');await record();const before=(await copy()).bench;assert(before?.requestId&&before.receipt?.status==='PROPOSED','Origin guard test has no recorded receipt');
   const fake={type:'decision-bench:changed',valid:false};w.postMessage(fake,location.origin);await delay(50);assert(JSON.stringify((await copy()).bench)===JSON.stringify(before),'Wrong source window admitted');
   w.dispatchEvent(new w.MessageEvent('message',{origin:'https://outside.invalid',source:cw,data:fake}));await delay(50);assert(JSON.stringify((await copy()).bench)===JSON.stringify(before),'Foreign origin admitted');
  });
  await check('Legacy source uses native adapter, uncertainty preserved',async()=>{
   await load('Rail | 82 | 74..88 | 90 | reversible\nUnknown | ? | 95 | 80 | measure form','legacy');assert(model().criteria.length===3&&model().options.length===2,'Legacy rows not adapted');
   assert(model().criteria.every(c=>c.min===null&&c.max===null),'Legacy adapter invents thresholds');assert(model().options.some(o=>Object.values(o.values).includes(null)),'Unknown converted to zero');
  });
  await check('SCAN and READ receive same immutable bytes; source switch excludes preview',async()=>{
   const email=['test','example.com'].join('@'),bytes='contact '+email+' and alpha beta gamma';await load(bytes,'text-A','scan');
   const sd=q('.toolPane[data-mode="scan"]').contentDocument;await wait(()=>/email/i.test(sd.getElementById('out')?.textContent||''),'scan output');
   await wait(()=>/OBSERVED/.test(text('trace')),'observed preview');await delay(330);let r=await copy();assert(r.projection_preview?.mode==='scan'&&r.projection_preview.inputs.in===bytes&&r.projection_preview.observed_at,'Scan snapshot missing',r.projection_preview);
   await load(bytes,'text-A','read');const rd=q('.toolPane[data-mode="read"]').contentDocument;assert(rd.getElementById('in').value===bytes,'READ handoff changed source');await delay(330);
   await source('second bytes','text-B');r=await copy();assert(r.projection_preview===null,'Preview from old source attached to new bytes');
  });
  await check('Plain ALIGN after multilingual JSON clears prior language inputs',async()=>{
   await load(JSON.stringify({ta:'Tamil fixture',zh:'Chinese fixture',en:'English fixture'}),'multi','align');
   await load('Plain English only','plain','align');const ad=q('.toolPane[data-mode="align"]').contentDocument;
   assert(ad.getElementById('ta').value===''&&ad.getElementById('zh').value===''&&ad.getElementById('en').value==='Plain English only','Stale languages attributed to plain source');
   await delay(330);const r=await copy();assert(r.projection_preview?.inputs.ta===''&&r.projection_preview.inputs.zh===''&&r.projection_preview.inputs.en==='Plain English only','ALIGN snapshot is not exact');
  });
  await check('Real utility result becomes the next source with exact RETURN and two-step UNDO',async()=>{
   const csv='name,qty\nrail,2\nclamp,4',label='data-loop';await load(csv,label,'reshape');
   const rw=q('.toolPane[data-mode="reshape"]').contentWindow;
   await wait(()=>rw.OmnitoolsTool?.getResult()&&!q('#adoptResult').disabled,'complete RESHAPE result');const reshaped=rw.OmnitoolsTool.getResult().text;
   const rows=JSON.parse(reshaped);assert(rows.length===2&&rows[0].name==='rail'&&rows[1].qty==='4','Real data transformation lost rows or values',rows);
   q('#adoptResult').click();await wait(()=>q('#sourceText').value===reshaped&&!q('#undoSource').disabled,'result adopted as source');
   let r=await copy();assert(r.source.text===reshaped&&r.turns.length===1&&r.turns[0].before.text===csv&&r.turns[0].after.text===reshaped,'Exact transformation RETURN missing',r.turns);assert(r.turns[0].authority==='LOCAL_SOURCE_ONLY','Transformation gained world authority');
   await load(reshaped,label,'scan');const sw=q('.toolPane[data-mode="scan"]').contentWindow;
   await wait(()=>sw.OmnitoolsTool?.getResult()&&!q('#adoptResult').disabled,'SCAN consumes transformed bytes');assert(sw.document.getElementById('in').value===reshaped,'Second operation used stale source');
   const scanned=sw.OmnitoolsTool.getResult().text;assert(JSON.parse(scanned).findings instanceof Array,'SCAN did not return complete findings');q('#adoptResult').click();await wait(()=>q('#sourceText').value===scanned,'second result adopted');
   r=await copy();assert(r.turns.length===2&&r.turns[1].before.text===reshaped&&r.source.text===scanned,'Two-step provenance lost');
   q('#undoSource').click();await wait(()=>q('#sourceText').value===reshaped,'second turn undo');q('#undoSource').click();await wait(()=>q('#sourceText').value===csv&&q('#undoSource').disabled,'first turn undo');
   r=await copy();assert(r.source.text===csv&&r.source.label===label&&r.turns.length===0,'Undo failed exact original source restoration');
   await load(csv,label,'reshape');edit(rw.document.getElementById('in'),'different child source');await wait(()=>q('#adoptResult').disabled,'edited child cannot attach stale result');assert(q('#sourceText').value===csv,'Child edit silently replaced source');
  });
  await check('Four native utility surfaces fit small portrait and landscape',async()=>{
   for(const [width,height]of [[320,568],[740,360]])for(const mode of ['scan','read','align','reshape']){
    f.style.width=width+'px';f.style.height=height+'px';await load(mode==='reshape'?'name,qty\nrail,2\nclamp,4':'Alpha beta. Gamma delta.',mode+'-fit',mode);await delay(100);
    const child=q('.toolPane[data-mode="'+mode+'"]').contentWindow,doc=child.document,bad=[];
    for(const e of doc.querySelectorAll('main,main textarea,main button,main select,.bar,.strip,.detect,.edit')){
     const r=e.getBoundingClientRect();if(r.width<=0||r.height<=0)continue;
     if(r.x<-1||r.y<-1||r.right>child.innerWidth+1||r.bottom>child.innerHeight+1)bad.push({element:e.id||e.className,rect:{x:r.x,y:r.y,right:r.right,bottom:r.bottom}});
     if(e.matches('button,select,textarea')){const top=doc.elementFromPoint(r.x+r.width/2,r.y+r.height/2);if(!top||(!e.contains(top)&&!top.contains(e)))bad.push({occluded:e.id||e.getAttribute('aria-label'),by:top?.id||top?.className});}
    }
    const overflow={x:Math.max(doc.body.scrollWidth,doc.documentElement.scrollWidth)-child.innerWidth,y:Math.max(doc.body.scrollHeight,doc.documentElement.scrollHeight)-child.innerHeight};
    assert(!bad.length&&overflow.x<=1&&overflow.y<=1,'Native utility primary surface hidden or requires page scroll',{mode,width,height,bad:bad.slice(0,8),overflow});
    for(const id of ['sourceToggle','undoSource','adoptResult','quickReturn']){const r=q('#'+id).getBoundingClientRect();assert(r.x>=-1&&r.right<=width+1&&r.y>=-1&&r.bottom<=height+1,'Carrier action outside utility viewport',{mode,id,width,height});}
   }
  });
  await check('Projection switching preserves native decision without creating state authority',async()=>{
   await load(json,'source-A');const before=JSON.stringify(model());await choose('read');await choose('bench');assert(JSON.stringify(model())===before,'Switching destroyed native model');assert(cd.getElementById('title').value===input.title,'Native view not retained');
  });
  await check('Responsive paging keeps held identity, invalid draft and focused cell',async()=>{
   f.style.width='1280px';f.style.height='800px';f.getBoundingClientRect();await load(json,'source-A');await wait(()=>cw.innerWidth===1280&&cd.querySelectorAll('[data-row]').length===4&&cq('[data-select="large"]'),'expanded page exposes Large before edit');
   cq('[data-select="large"]').click();let cell=cq('[data-option="large"][data-axis="reset"]');cell.focus();edit(cell,'bad');cell.setSelectionRange(1,2);
   const unchanged=JSON.stringify(model());f.style.width='320px';f.style.height='568px';
   await wait(()=>cw.innerWidth===320&&cd.querySelectorAll('[data-row]').length<=2&&cq('[data-option="large"][data-axis="reset"]')===cd.activeElement,'focused small-frame paging');
   cell=cd.activeElement;assert(cell.value==='bad'&&cell.selectionStart===1&&cell.selectionEnd===2,'Resize lost draft or cursor');assert(cell.getAttribute('aria-invalid')==='true'&&cq('#returnBtn').disabled,'Resize accepted invalid draft');geometry(320,568);
   f.style.width='1280px';f.style.height='800px';await wait(()=>cw.innerWidth===1280&&cd.querySelectorAll('[data-row]').length===4&&cq('[data-option="large"][data-axis="reset"]')===cd.activeElement,'focused expanded-frame paging');
   assert(cd.activeElement.value==='bad'&&JSON.stringify(model())===unchanged&&model().selected==='large','Resize changed model or held identity');cq('#undoBtn').click();assert(cd.getElementById('counts').textContent==='2 FIT · 1 ? · 1 OUT','Undo did not restore valid analysis');
   const multi=JSON.parse(json);multi.criteria.push({id:'extra',label:'Extra constraint',unit:'s',direction:'min',min:null,max:10});multi.options.forEach(o=>o.values.extra=1);await load(JSON.stringify(multi),'four-axes');f.style.width='320px';f.style.height='568px';
   await wait(()=>cw.innerWidth===320&&cd.querySelectorAll('[data-row]').length===1,'extra axis pager reserves row space');geometry(320,568);cq('#axisPager button[aria-label="Next AXES"]').click();assert(cq('#criteria input[data-axis="extra"]'),'Fourth axis inaccessible');geometry(320,568);assert(model().criteria.length===4&&model().options.every(o=>o.values.extra===1),'Paging lost hidden constraints');await load(json,'source-A');
  });
  for(const [width,height]of [[320,568],[390,844],[740,360],[844,390],[1280,800]])await check('Integrated mobile fit '+width+'×'+height,async()=>{
   if(q('#sourceDock').open)q('#closeSource').click();await choose('bench');f.style.width=width+'px';f.style.height=height+'px';await delay(180);geometry(width,height);assert(d.querySelectorAll('header button').length===1,'Multiple mandatory route controls');
  });
  assert(!errors.length,'Runtime errors',errors);
 }catch(e){checks.push({name:'Harness initialization/runtime',pass:false,error:String(e.stack||e)});}
 out.textContent=JSON.stringify({pass:checks.length>0&&checks.every(c=>c.pass),checks,errors});
}
const html='<!doctype html><meta charset="utf-8"><body style="margin:0"><iframe id="f" style="width:430px;height:900px;border:0;display:block"></iframe><pre id="probeResult">PENDING</pre><script>('+probe.toString()+')();<\/script>';
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{try{const u=new URL(req.url,'http://local');if(u.pathname==='/__omni_probe'){res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(html);return;}
 let rel=decodeURIComponent(u.pathname).replace(/^\/+/, '');if(!rel||rel.endsWith('/'))rel+='index.html';const file=path.resolve(ROOT,rel);if(!file.startsWith(ROOT+path.sep)){res.writeHead(403);res.end();return;}
 if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}res.writeHead(200,{'content-type':(types[path.extname(file)]||'application/octet-stream')+'; charset=utf-8','cache-control':'no-store'});fs.createReadStream(file).pipe(res);
}catch(e){res.writeHead(500);res.end(String(e));}});
let profile;
try{
 const bin=browserBin();profile=fs.mkdtempSync(path.join(os.tmpdir(),'omnitools-smoke-'));await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});const port=server.address().port;
 console.log('Omnitools browser:',bin);const output=await new Promise((resolve,reject)=>{
  const p=spawn(bin,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-first-run','--disable-background-networking','--user-data-dir='+profile,'--window-size=1500,1000','--virtual-time-budget=26000','--dump-dom','http://127.0.0.1:'+port+'/__omni_probe'],{stdio:['ignore','pipe','pipe']});let out='',err='';
  const timer=setTimeout(()=>{p.kill('SIGKILL');reject(Error('Smoke exceeded 40s\n'+err.slice(-2000)));},40000);p.stdout.on('data',b=>out+=b);p.stderr.on('data',b=>err+=b);p.on('error',e=>{clearTimeout(timer);reject(e);});p.on('close',code=>{clearTimeout(timer);code?reject(Error('Chrome exit '+code+'\n'+err.slice(-3000))):resolve(out);});
 });
 const raw=/<pre id="probeResult">([\s\S]*?)<\/pre>/.exec(output)?.[1];if(!raw||raw==='PENDING')throw Error('No completed Omnitools probe');
 const report=JSON.parse(raw.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&'));
 for(const c of report.checks)console.log((c.pass?'PASS ':'FAIL ')+c.name+(c.error?'\n'+c.error:''));console.log('OMNITOOLS SMOKE',report.checks.filter(c=>c.pass).length+'/'+report.checks.length);if(!report.pass)process.exitCode=1;
}catch(e){console.error(String(e.stack||e));process.exitCode=1;}finally{await new Promise(r=>server.close(r));if(profile)fs.rmSync(profile,{recursive:true,force:true});}
