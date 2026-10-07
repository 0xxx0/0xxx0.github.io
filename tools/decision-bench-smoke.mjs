#!/usr/bin/env node
// Real Chromium DOM proof. Ephemeral origin/profile; never uses operator storage.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';

const root=process.cwd();
function browserBin(){
  if(process.env.SMOKE_BROWSER){if(!fs.existsSync(process.env.SMOKE_BROWSER))throw Error('SMOKE_BROWSER does not exist');return process.env.SMOKE_BROWSER;}
  for(const name of ['google-chrome-stable','google-chrome','chromium-browser','chromium']){
    const found=spawnSync('which',[name],{encoding:'utf8'});if(found.status===0)return found.stdout.trim();
  }
  for(const name of ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/Applications/Chromium.app/Contents/MacOS/Chromium'])if(fs.existsSync(name))return name;
  throw Error('No Chromium binary; set SMOKE_BROWSER');
}

async function probe(){
  const result=document.getElementById('probeResult'),f=document.getElementById('f');
  const checks=[],runtimeErrors=[],MODEL='decision-bench:model:v1',RETURNS='decision-bench:returns:v1';
  let w,d;
  const pause=ms=>new Promise(r=>setTimeout(r,ms));
  const expect=(ok,message,data)=>{if(!ok)throw Error(message+(data===undefined?'':' '+JSON.stringify(data)));};
  const q=s=>d.querySelector(s),text=id=>d.getElementById(id).textContent;
  const model=()=>JSON.parse(localStorage.getItem(MODEL)),receipts=()=>JSON.parse(localStorage.getItem(RETURNS)||'[]');
  const clone=v=>JSON.parse(JSON.stringify(v));
  function edit(selector,value,event='input'){
    const e=q(selector);expect(e,'Missing input '+selector);e.value=value;e.dispatchEvent(new w.Event(event,{bubbles:true}));
  }
  function click(selector){const e=q(selector);expect(e,'Missing control '+selector);e.click();}
  async function load(state,width=1280,height=800){
    // Tear down prior document before replacing storage: delayed dialog-close
    // handlers from the previous fixture must not write over the next model.
    await new Promise(resolve=>{f.onload=resolve;f.src='about:blank';});
    if(state)localStorage.setItem(MODEL,JSON.stringify(state));else localStorage.removeItem(MODEL);
    f.style.width=width+'px';f.style.height=height+'px';
    await new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>reject(Error('Bench load timeout')),3500);
      f.onload=()=>{clearTimeout(timeout);resolve();};
      f.src='/forward-field-proof/triangle/bench/?smoke='+Math.random();
    });
    w=f.contentWindow;d=w.document;
    w.addEventListener('error',e=>runtimeErrors.push(e.message));
    w.addEventListener('unhandledrejection',e=>runtimeErrors.push(String(e.reason)));
    expect(w.DecisionBenchCore&&text('counts'),'Bench did not initialize');await pause(30);
  }
  async function check(name,fn){try{await fn();checks.push({name,pass:true});}catch(e){checks.push({name,pass:false,error:String(e.stack||e)});}}
  async function importJSON(raw){
    click('#moreBtn');const dt=new w.DataTransfer();dt.items.add(new w.File([raw],'fixture.json',{type:'application/json'}));
    q('#fileInput').files=dt.files;await q('#fileInput').onchange();await pause(20);
  }
  function shape(countAxes=3,countOptions=2){
    const criteria=Array.from({length:countAxes},(_,i)=>({id:'c'+i,label:'Measure '+i,unit:'u',direction:i===1?'max':'min',min:null,max:100}));
    const options=Array.from({length:countOptions},(_,i)=>({id:'o'+i,label:'Option '+i,values:Object.fromEntries(criteria.map((c,j)=>[c.id,j===1?20+i:20+i])),evidence:'Entered fixture measurements',next:'Measure before acting'}));
    return{schema:'decision-bench/v1',id:'fixture',title:'A real constrained comparison',sample:false,context:'Fixture only; no physical result',criteria,options,priority:null,selected:options[0]?.id||null};
  }
  function layout(width,height){
    const problems=[],rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
    const primary=['header','footer','.criteriaSection','.matrixSection','.result','#modelBtn','#moreBtn','#addOption','#returnBtn','#reason','#focus'];
    for(const selector of primary){const e=q(selector),r=rect(e);if(r.w<=0||r.h<=0||r.x<-1||r.y<-1||r.right>width+1||r.bottom>height+1)problems.push({selector,rect:r});}
    for(const e of d.querySelectorAll('#matrix input,#matrix .optionSelect,#criteria input,#criteria .priorityBtn,#axisPager button,#optionPager button')){
      const r=rect(e);if(r.x<-1||r.y<-1||r.right>width+1||r.bottom>height+1||r.h<=0)problems.push({control:e.getAttribute('aria-label')||e.textContent,rect:r});
      const c=d.elementFromPoint(r.x+r.w/2,r.y+r.h/2);if(c&&!e.contains(c)&&!c.contains(e))problems.push({occluded:e.getAttribute('aria-label')||e.textContent,by:c.id||c.className});
    }
    const overflow={width:Math.max(d.documentElement.scrollWidth,d.body.scrollWidth)-width,height:Math.max(d.documentElement.scrollHeight,d.body.scrollHeight)-height};
    if(overflow.width>1||overflow.height>1)problems.push({documentOverflow:overflow});
    const resultRect=rect(q('.result')),focusRect=rect(q('#focus'));
    if(focusRect.bottom>resultRect.bottom+1)problems.push({focusClipped:{resultRect,focusRect}});
    expect(!problems.length,'Primary surface does not fit '+width+'x'+height,{count:problems.length,first:problems.slice(0,6),overflow});
    return{width,height,overflow};
  }
  try{
    localStorage.clear();await load(null);const sample=model();
    await check('Default: two fit, one uncertain, one blocked; interval retained',()=>{
      expect(text('counts')==='2 FIT · 1 ? · 1 OUT','Unexpected initial states',text('counts'));
      expect(JSON.stringify(model().options.find(o=>o.id==='clamp').values.restore)==='[3,5]','Range was collapsed');
      expect(/Clamp board/.test(text('reason')),'Restore priority does not select clamp');
    });
    await check('Hard width cap 80→70 changes exclusions, not measurements',async()=>{
      await load(sample);edit('[data-bound="max"][data-axis="width"]','70');
      expect(text('counts')==='1 FIT · 1 ? · 2 OUT','Threshold did not alter feasibility',text('counts'));
      expect(q('[data-row="current"]').classList.contains('BLOCKED'),'Oversized table not blocked');
      expect(model().options.find(o=>o.id==='current').values.width===80,'Constraint edited measurement');
      click('[data-select="current"]');expect(q('#returnBtn').disabled,'Blocked option may record');
    });
    await check('Main priority changes leader while held focus remains explicit',async()=>{
      await load(sample);click('[data-priority="area"]');expect(/Current table leads/.test(text('reason')),'Area priority did not change leader');
      expect(model().selected==='clamp','Priority silently selected a different option');
      click('[data-priority="restore"]');expect(/Clamp board leads/.test(text('reason')),'Restore priority did not recover leader');
    });
    await check('Invalid entry pauses result/RETURN; UNDO restores exact model',async()=>{
      await load(sample);const before=JSON.stringify(model());edit('[data-option="clamp"][data-axis="width"]','not-a-number');
      expect(text('verdict')==='INVALID INPUT'&&q('#returnBtn').disabled,'Invalid draft permits a result');click('#undoBtn');
      expect(JSON.stringify(model())===before,'Undo did not restore model');expect(!q('#returnBtn').disabled,'Undo left result paused');
    });
    await check('Unknown remains null and cannot become feasible zero',async()=>{
      await load(sample);edit('[data-option="clamp"][data-axis="width"]','?');
      expect(model().options.find(o=>o.id==='clamp').values.width===null,'Unknown became a number');
      expect(q('[data-row="clamp"]').classList.contains('UNCERTAIN'),'Unknown row treated as feasible');
    });
    await check('Entered intervals survive serialization; overlap prevents guaranteed leader',async()=>{
      await load(sample);edit('[data-option="clamp"][data-axis="restore"]','4..6');edit('[data-option="current"][data-axis="restore"]','2..7');
      expect(JSON.stringify(model().options.find(o=>o.id==='clamp').values.restore)==='[4,6]','Entered range was collapsed');
      expect(text('verdict')==='TRADE-OFF REMAINS','Overlapping intervals fabricated a priority winner',text('reason'));
      const before=JSON.stringify(model());await load(model());expect(JSON.stringify(model())===before,'Reload collapsed interval');
    });
    await check('MODEL support count updates and invalid limits pause it',async()=>{
      await load(sample);click('#modelBtn');edit('#cMax','70');expect(/Exact support: 1/.test(text('supportNote')),'Editor support is stale');
      edit('#cMax','bad');expect(/PAUSED/.test(text('supportNote')),'Invalid bound retains support claim');q('#modelDialog').close();await pause(20);
      click('#modelBtn');expect(/PAUSED/.test(text('supportNote')),'Reopening MODEL restores stale support despite invalid draft');q('#modelDialog').close();await pause(20);click('#undoBtn');
    });
    await check('RETURN needs rationale and next; proposed receipt reenters exactly',async()=>{
      await load(sample);localStorage.removeItem(RETURNS);click('#returnBtn');edit('#nextStep','');click('#saveReturn');expect(receipts().length===0,'Saved without required fields');
      edit('#rationale','Smaller footprint and faster reset under entered limits');click('#saveReturn');expect(receipts().length===0,'Saved without next step');
      edit('#nextStep','Measure the clamp footprint');click('#saveReturn');await pause(20);
      const r=receipts()[0];expect(r?.status==='PROPOSED'&&r.observation===null,'Proposal claims observation',r);
      expect(r.authority==='LOCAL REASONING ONLY','Receipt gained authority');
      const expected=JSON.stringify(r.state);await load(model());expect(JSON.stringify(model())===expected,'Reload changed decision state');
      expect(receipts()[0].next==='Measure the clamp footprint','Next step lost on reload');
      edit('#title','Changed after RETURN','change');click('#moreBtn');click('#historyBtn');expect(/PROPOSED/.test(text('historyText')),'Saved receipt is inaccessible');
      click('#restoreReturn');await pause(20);expect(JSON.stringify(model())===expected,'RETURN restore changed saved model');
    });
    await check('Observed outcome requires outcome AND evidence, explicitly user reported',async()=>{
      await load(sample);localStorage.removeItem(RETURNS);click('#returnBtn');edit('#rationale','Test bounded attachment');edit('#nextStep','Remove after test');edit('#outcome','Held for one minute');
      click('#saveReturn');expect(receipts().length===0&&/both outcome and evidence/.test(text('returnError')),'One-sided outcome accepted');
      edit('#outcomeEvidence','Operator reports timed one-minute test');click('#saveReturn');await pause(20);
      const r=receipts()[0];expect(r?.status==='OBSERVATION_REPORTED'&&r.observation.source==='user-reported','Observation classification incorrect',r);
    });
    await check('Final blank TSV column imports as unknown',async()=>{
      await load(sample);click('#moreBtn');click('#pasteBtn');edit('#tableText','Pasted option\t65\t4500\t');click('#applyTable');await pause(20);
      expect(!q('#pasteDialog').open,'Blank last field rejected',text('pasteError'));
      expect(model().options.length===1&&model().options[0].values.restore===null,'Blank last field became zero or vanished');
    });
    await check('Malformed JSON import leaves original model intact',async()=>{
      await load(sample);const before=JSON.stringify(model());await importJSON('{broken');expect(JSON.stringify(model())===before,'Invalid import overwrote model');
      expect(/Import kept your model/.test(text('reason')),'Import failure not visible');
    });
    await check('Unique Pareto frontier needs no invented trade-off',async()=>{
      const s=shape();s.options[0].values={c0:10,c1:30,c2:10};s.options[1].values={c0:20,c1:20,c2:20};await load(s);
      expect(text('verdict')==='ONE NON-DOMINATED OPTION','Unique frontier rendered unresolved',text('verdict'));
      expect(q('[data-row="o1"] .rowState').textContent==='DOMINATED','Inferior option not explained');
    });
    await check('Multiple axes/options page and reload to exact held focus/priority',async()=>{
      const s=shape(8,9);s.selected='o8';s.priority='c7';await load(s);
      expect(q('[data-option="o8"][data-axis="c7"]'),'Saved option/axis not revealed');expect(/AXES 3/.test(text('axisPager'))&&/OPTIONS 3/.test(text('optionPager')),'Wrong reentry pages');
      click('#axisPager button');expect(q('[data-axis="c3"]'),'Previous axes page not usable');
      click('#axisPager button:last-child');expect(q('[data-axis="c7"]'),'Next axes page not usable');
      click('#optionPager button');expect(q('[data-select="o4"]'),'Previous options page not usable');
      click('#optionPager button:last-child');expect(q('[data-select="o8"]'),'Next options page not usable');
      const before=JSON.stringify(model());await load(model());expect(JSON.stringify(model())===before&&q('[data-option="o8"][data-axis="c7"]'),'Paging damaged state or reentry');
    });
    await check('Imported tuple IDs keep unrelated drafts and errors separate',async()=>{
      const s=shape(2,2);s.criteria[0].id='z';s.criteria[1].id='y:z';s.options[0].id='x:y';s.options[1].id='x';s.selected='x:y';s.options.forEach(o=>o.values={z:1,'y:z':2});
      await load(sample);await importJSON(JSON.stringify(s));edit('[data-option="x:y"][data-axis="z"]','bad');edit('[data-option="x"][data-axis="y:z"]','5');
      expect(text('verdict')==='INVALID INPUT','Unrelated edit cleared another error');
      click('[data-select="x"]');expect(q('[data-option="x:y"][data-axis="z"]').value==='bad','Invalid draft moved or disappeared');
      expect(q('[data-option="x"][data-axis="y:z"]').value==='5','Distinct tuple draft collision');
      edit('[data-option="x:y"][data-axis="z"]','1');expect(text('verdict')!=='INVALID INPUT','Corrected draft did not resume');
    });
    await check('Triangle view is off by default: table canonical, no SVG',async()=>{
      await load(sample);
      expect(q('#triBtn')&&!q('#triBtn').disabled,'Triangle control missing or disabled for a 3-axis model');
      expect(q('#triView').hidden&&!q('#triView').querySelector('svg'),'Triangle rendered while the view is off');
      expect(!q('#triView').innerHTML.trim(),'Hidden triangle view holds content');
      expect(!q('#matrix').hidden&&w.getComputedStyle(q('#matrix')).display!=='none','Table hidden while the triangle view is off');
    });
    await check('Triangle toggle swaps in the projection, fits the phone, restores the table',async()=>{
      await load(sample,390,844); click('#triBtn');
      expect(q('#triBtn').getAttribute('aria-pressed')==='true','Toggle state not exposed to assistive tech');
      expect(!q('#triView').hidden&&q('#matrix').hidden&&q('#optionPager').hidden,'Toggle did not swap table for triangle');
      // Assert the COMPUTED display: #matrix{display:flex} outranks the UA [hidden] rule,
      // so the property can be true while the table still renders underneath.
      expect(w.getComputedStyle(q('#matrix')).display==='none','Table still displayed under the triangle view',w.getComputedStyle(q('#matrix')).display);
      expect(w.getComputedStyle(q('#optionPager')).display==='none','Options pager still displayed under the triangle view');
      const svg=q('#triView svg');expect(svg&&svg.querySelectorAll('.dot').length===4,'Sample options not projected',svg&&svg.querySelectorAll('.dot').length);
      expect(svg.querySelectorAll('.axis').length===3,'Three vertex labels expected');
      const svgRect=svg.getBoundingClientRect();
      expect(svgRect.width>=150&&svgRect.height>=120,'Triangle svg did not take over the section',{w:svgRect.width,h:svgRect.height});
      const overflow={width:Math.max(d.documentElement.scrollWidth,d.body.scrollWidth)-390,height:Math.max(d.documentElement.scrollHeight,d.body.scrollHeight)-844};
      const rect=q('#triView').getBoundingClientRect();
      expect(overflow.width<=1&&overflow.height<=1,'Triangle view overflows the document',overflow);
      expect(rect.width>50&&rect.height>50&&rect.right<=391&&rect.bottom<=845,'Triangle view does not fit the viewport',{x:rect.x,y:rect.y,w:rect.width,h:rect.height});
      click('#triBtn');
      expect(!q('#matrix').hidden&&q('#triView').hidden&&!q('#triView').querySelector('svg'),'Table not restored after the toggle');
      expect(w.getComputedStyle(q('#matrix')).display!=='none','Table not visible again after the toggle');
    });
    await check('Triangle projection requires exactly three measurements',async()=>{
      await load(shape(4,3));
      expect(q('#triBtn').disabled,'Triangle offered for a 4-axis model');
      expect(/exactly 3/.test(q('#triBtn').title),'Disabled reason not stated');
      expect(!q('#matrix').hidden&&q('#triView').hidden,'Four-axis model still showed the triangle');
      await load(sample);expect(!q('#triBtn').disabled,'Three-axis model withheld the triangle');
    });
    await check('RETURN receipt records which view was used',async()=>{
      await load(sample);localStorage.removeItem(RETURNS);click('#triBtn');click('#returnBtn');
      edit('#rationale','Projected trade-off reviewed on the triangle view');edit('#nextStep','Measure the clamp footprint');
      click('#saveReturn');await pause(20);
      expect(receipts()[0]?.view==='triangle','Receipt did not record the triangle view',receipts()[0]?.view);
      await load(sample);click('#returnBtn');
      edit('#rationale','Table is canonical for this record');edit('#nextStep','Re-measure the width cap');
      click('#saveReturn');await pause(20);
      expect(receipts()[0]?.view==='table','Receipt did not record the table view',receipts()[0]?.view);
    });
    for(const [width,height] of [[320,568],[390,844],[740,360],[844,390],[1280,800]]){
      await check('No primary scroll/occlusion '+width+'×'+height,async()=>{await load(sample,width,height);layout(width,height);});
      await check('Long source/labels retain primary controls '+width+'×'+height,async()=>{
        const s=clone(sample);s.sample=false;s.context='Long evidence context '.repeat(80);s.title='Long decision '.repeat(30);
        s.options.forEach(o=>{o.label='Long alternative description '.repeat(12);o.next='Executable next step '.repeat(30);});s.criteria.forEach(c=>c.label='Long measurement name '.repeat(10));
        await load(s,width,height);layout(width,height);
      });
    }
    expect(runtimeErrors.length===0,'Browser runtime errors',runtimeErrors);
  }catch(e){checks.push({name:'Harness initialization/runtime',pass:false,error:String(e.stack||e)});}
  result.textContent=JSON.stringify({pass:checks.length>0&&checks.every(c=>c.pass),checks,runtimeErrors});
}

const html='<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0"><iframe id="f" style="border:0;display:block"></iframe><pre id="probeResult">PENDING</pre><script>('+probe.toString()+')();<\/script></body></html>';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
  try{
    const url=new URL(req.url,'http://local');if(url.pathname==='/__decision_bench_probe'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html);return;}
    let relative=decodeURIComponent(url.pathname).replace(/^\/+/, '');if(!relative||relative.endsWith('/'))relative+='index.html';
    const file=path.resolve(root,relative);if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
    res.writeHead(200,{'Content-Type':(types[path.extname(file)]||'application/octet-stream')+'; charset=utf-8','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
  }catch(error){res.writeHead(500);res.end(String(error));}
});
let profile;
try{
  const binary=browserBin();profile=fs.mkdtempSync(path.join(os.tmpdir(),'decision-bench-smoke-'));
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});const port=server.address().port;
  console.log('Decision Bench browser:',binary);
  const output=await new Promise((resolve,reject)=>{
    const child=spawn(binary,['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-extensions','--user-data-dir='+profile,'--window-size=1500,1000','--virtual-time-budget=22000','--dump-dom','http://127.0.0.1:'+port+'/__decision_bench_probe'],{stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='';child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);
    const timer=setTimeout(()=>{child.kill('SIGKILL');reject(Error('Browser exceeded 40s\n'+stderr.slice(-2000)));},40000);
    child.on('error',e=>{clearTimeout(timer);reject(e);});child.on('close',code=>{clearTimeout(timer);if(code)reject(Error('Browser exit '+code+'\n'+stderr.slice(-3000)));else resolve(stdout);});
  });
  const raw=/<pre id="probeResult">([\s\S]*?)<\/pre>/.exec(output)?.[1];
  if(!raw||raw==='PENDING')throw Error('Browser probe did not finish: '+String(raw));
  const decoded=raw.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
  const report=JSON.parse(decoded);for(const c of report.checks)console.log((c.pass?'PASS ':'FAIL ')+c.name+(c.error?'\n'+c.error:''));
  if(report.runtimeErrors.length)console.log('RUNTIME ERRORS',JSON.stringify(report.runtimeErrors));
  console.log('Decision Bench smoke:',report.checks.filter(c=>c.pass).length+'/'+report.checks.length);
  if(!report.pass)process.exitCode=1;
}catch(error){console.error(String(error.stack||error));process.exitCode=1;}
finally{await new Promise(r=>server.close(r));if(profile)fs.rmSync(profile,{recursive:true,force:true});}
