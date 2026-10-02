#!/usr/bin/env node
'use strict';

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';

const ROOT=process.cwd(),HOST='127.0.0.1';let PORT=0;

function browserBin(){
  for(const n of ['google-chrome-stable','google-chrome','chromium-browser','chromium']){
    const r=spawnSync('which',[n],{encoding:'utf8'});
    if(r.status===0&&r.stdout.trim())return r.stdout.trim();
  }
  // macOS: Chrome/Brave/Edge/Chromium live in /Applications, not on PATH. Without this the
  // smoke could not run on the operator's own machine at all, so it reported a failure that
  // said nothing about the code.
  for(const p of ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
                  '/Applications/Chromium.app/Contents/MacOS/Chromium',
                  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge']){
    if(spawnSync('test',['-x',p]).status===0)return p;
  }
  throw Error('No Chrome/Chromium for FIELD LAB change→INK smoke (checked PATH and /Applications)');
}
function contentType(p){
  if(p.endsWith('.html'))return 'text/html; charset=utf-8';
  if(p.endsWith('.js')||p.endsWith('.mjs'))return 'text/javascript; charset=utf-8';
  if(p.endsWith('.json'))return 'application/json; charset=utf-8';
  if(p.endsWith('.css'))return 'text/css; charset=utf-8';
  return 'application/octet-stream';
}
function resolveFile(url){
  let q=decodeURIComponent(String(url||'/').split('?')[0]).replace(/^\/+/, '');
  if(!q)q='index.html';if(q.endsWith('/'))q+='index.html';
  const p=path.normalize(path.join(ROOT,q));
  if(!p.startsWith(ROOT))return null;
  if(fs.existsSync(p)&&fs.statSync(p).isFile())return p;
  if(fs.existsSync(p+'.html'))return p+'.html';
  return null;
}
function probe(){
  return `<!doctype html><html><body style="margin:0"><iframe id="f" style="width:430px;height:900px;border:0" src="/fold-bloom/lab/?mode=DATA"></iframe><pre id="probeResult">PENDING</pre><script>
  const f=document.getElementById('f'),out=document.getElementById('probeResult'),rec={};let finished=false;
  const done=(ok,x)=>{if(finished)return;finished=true;out.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(x)};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const wait=async(fn,limit=12000,label='condition')=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(60)}throw Error('timeout '+label)};
  (async()=>{
    const W=()=>f.contentWindow,D=()=>W().document;
    await wait(()=>D().documentElement.dataset.foldBloomFieldLab==='ready'&&W().FoldBloomFieldLab?.stateStep?.().path?.ok,12000,'LAB DATA ready');
    const before=W().FoldBloomFieldLab.stateStep();
    rec.beforeMode=W().FoldBloomFieldLab.mode();
    rec.initialPath=before.path.path_address;
    rec.initialOrder=[...(before.path.selected_order||[])];

    D().getElementById('stateTo').value='111|110';
    D().getElementById('stateProject').click();
    await sleep(80);
    rec.stateLensHref=D().getElementById('stateIChing').getAttribute('href')||'';
    rec.reducerStart=D().getElementById('stateReducerRead').textContent||'';
    D().getElementById('stateReduceNext').click();
    await wait(()=>W().FoldBloomFieldLab.stateStep().cursor===1,1500,'reducer NEXT preview');
    rec.reducerAfterNext={cursor:W().FoldBloomFieldLab.stateStep().cursor,read:D().getElementById('stateReducerRead').textContent||'',address:D().getElementById('addressRead').textContent||''};
    D().getElementById('stateReduceReturn').click();
    await wait(()=>W().FoldBloomFieldLab.stateStep().cursor===0,1500,'reducer RETURN');
    rec.reducerAfterReturn={cursor:W().FoldBloomFieldLab.stateStep().cursor,read:D().getElementById('stateReducerRead').textContent||'',address:D().getElementById('addressRead').textContent||''};
    const frontierStart=W().FoldBloomFieldLab.stateStep().frontier;
    rec.frontierStart={current:frontierStart?.current?.token,futures:frontierStart?.current_future_paths,next:(frontierStart?.candidates||[]).map(x=>x.line),buttons:[...D().querySelectorAll('#stateFrontierRead [data-state-next-line]')].map(x=>Number(x.dataset.stateNextLine))};
    const canvas=D().getElementById('field'),box=canvas.getBoundingClientRect(),h=box.height,gap=Math.max(22,Math.min(38,h*.055)),cy=h*.51;
    const tapLine=line=>{
      const y=cy+gap*(2.5-(line-1));
      canvas.dispatchEvent(new (W().PointerEvent)('pointerdown',{bubbles:true,pointerId:3,pointerType:'touch',clientX:box.left+box.width*.5,clientY:box.top+y}));
    };
    tapLine(5);
    await wait(()=>W().FoldBloomFieldLab.stateStep().path?.selected_order?.[0]===5,2500,'steer L5 first');
    D().getElementById('stateStep').click();
    await wait(()=>W().FoldBloomFieldLab.stateStep().cursor===1,1500,'witness prefix');
    const firstSteer=W().FoldBloomFieldLab.stateStep();
    rec.frontierAfterStep={current:firstSteer.frontier?.current?.token,futures:firstSteer.frontier?.current_future_paths,next:(firstSteer.frontier?.candidates||[]).map(x=>x.line),buttons:[...D().querySelectorAll('#stateFrontierRead [data-state-next-line]')].map(x=>Number(x.dataset.stateNextLine))};
    tapLine(3);
    await wait(()=>W().FoldBloomFieldLab.stateStep().path?.selected_order?.[1]===3,2500,'steer L3 second');
    const steered=W().FoldBloomFieldLab.stateStep();
    rec.steering={initial:rec.initialOrder,afterFirst:[...firstSteer.path.selected_order],afterSecond:[...steered.path.selected_order],cursor:steered.cursor,prefix:steered.path.selected_order.slice(0,steered.cursor)};
    rec.stateLensAfterSteer=D().getElementById('stateIChing').getAttribute('href')||'';
    rec.frontierAfterSteer={current:steered.frontier?.current?.token,futures:steered.frontier?.current_future_paths,next:(steered.frontier?.candidates||[]).map(x=>x.line),selected:(steered.frontier?.candidates||[]).find(x=>x.selected_by_current_order)?.line};
    const dataPacket=W().FoldBloomFieldLab.returnPacket();
    rec.frontierReturn=dataPacket?.projection?.stateChange?.frontier;
    rec.pathAddress=steered.path.path_address;
    rec.order=[...steered.path.selected_order];
    D().getElementById('stateInk').click();
    await wait(()=>W().FoldBloomFieldLab.mode()==='INK'&&W().FoldBloomFieldLab.ink?.().guide?.ok,6000,'INK guide');
    const ink=W().FoldBloomFieldLab.ink(),addr=D().getElementById('addressRead').textContent||'';
    rec.afterMode=W().FoldBloomFieldLab.mode();
    rec.guideAuthority=ink.guide.authority;
    rec.guideAddress=ink.guide.address;
    rec.guideStates=ink.guide.points.length;
    rec.address=addr;
    const x=box.left+box.width*.5,y=box.top+box.height*.5;
    canvas.dispatchEvent(new (W().PointerEvent)('pointerdown',{bubbles:true,pointerId:7,pointerType:'pen',clientX:x,clientY:y,pressure:.65}));
    canvas.dispatchEvent(new (W().PointerEvent)('pointermove',{bubbles:true,pointerId:7,pointerType:'pen',clientX:x+32,clientY:y+18,pressure:.58}));
    canvas.dispatchEvent(new (W().PointerEvent)('pointerup',{bubbles:true,pointerId:7,pointerType:'pen',clientX:x+32,clientY:y+18,pressure:.58}));
    await sleep(120);
    const packet=W().FoldBloomFieldLab.returnPacket(),projection=packet?.projection||{};
    rec.returnKind=projection.kind;
    rec.returnGuide=projection.guide;
    rec.pigment=projection.pigment;
    rec.water=projection.water;

    f.src='/fold-bloom/lab/?mode=DATA&stateFrom=010100&stateTo=111110&stateOrder=5%2C3%2C1';
    await wait(()=>D().documentElement.dataset.fieldLabStateLens==='restored'&&W().FoldBloomFieldLab?.stateStep?.().path?.selected_order?.join(',')==='5,3,1',8000,'I Ching → LAB state lens return');
    const restored=W().FoldBloomFieldLab.stateStep();
    rec.stateLensRoundTrip={
      from:D().getElementById('stateFrom').value,
      to:D().getElementById('stateTo').value,
      order:[...(restored.path?.selected_order||[])],
      orderIndex:restored.path?.selected_order_index,
      address:D().getElementById('addressRead').textContent||'',
      source:D().getElementById('sourceRead').textContent||'',
      href:D().getElementById('stateIChing').getAttribute('href')||''
    };
    const frontierOK=rec.frontierStart?.current==='H[010|100]'&&rec.frontierStart?.futures===6&&rec.frontierStart?.next?.join(',')==='1,3,5'&&rec.frontierStart?.buttons?.join(',')==='1,3,5'&&
      rec.frontierAfterStep?.current==='H[010|110]'&&rec.frontierAfterStep?.futures===2&&rec.frontierAfterStep?.next?.join(',')==='1,3'&&rec.frontierAfterStep?.buttons?.join(',')==='1,3'&&
      rec.frontierAfterSteer?.selected===3&&rec.frontierReturn?.current==='H[010|110]'&&rec.frontierReturn?.futurePaths===2&&rec.frontierReturn?.candidates?.length===2;
    const reducerOK=rec.stateLensHref.includes('/iching/#b=010100&to=111110&order=1%2C3%2C5')&&
      rec.reducerStart.includes('k=3')&&rec.reducerStart.includes('V=8')&&rec.reducerStart.includes('E=12')&&rec.reducerStart.includes('CHAINS=6')&&rec.reducerStart.includes('NEXT L1')&&
      rec.reducerAfterNext?.cursor===1&&rec.reducerAfterNext?.read.includes('STEP 1/3')&&rec.reducerAfterNext?.address.includes('/step/1')&&
      rec.reducerAfterReturn?.cursor===0&&rec.reducerAfterReturn?.read.includes('STEP 0/3')&&rec.reducerAfterReturn?.address.includes('/order/0-of-6');
    const roundTripOK=rec.stateLensRoundTrip?.from==='010|100'&&rec.stateLensRoundTrip?.to==='111|110'&&rec.stateLensRoundTrip?.order?.join(',')==='5,3,1'&&
      rec.stateLensRoundTrip?.orderIndex===5&&rec.stateLensRoundTrip?.address.includes('/order/5-of-6')&&rec.stateLensRoundTrip?.source==='STATE / RETURNED FROM I CHING LENS'&&
      rec.stateLensRoundTrip?.href.includes('order=5%2C3%2C1');
    const pass=rec.beforeMode==='DATA'&&reducerOK&&roundTripOK&&frontierOK&&rec.steering.initial.join(',')==='3,5'&&rec.steering.afterFirst.join(',')==='5,1,3'&&rec.steering.afterSecond.join(',')==='5,3,1'&&rec.stateLensAfterSteer.includes('order=5%2C3%2C1')&&rec.steering.cursor===1&&rec.steering.prefix.join(',')==='5'&&rec.afterMode==='INK'&&rec.guideAuthority==='PROJECTION_ONLY'&&
      rec.guideAddress===rec.pathAddress&&rec.address===rec.pathAddress&&rec.guideStates===rec.order.length+1&&
      rec.returnKind==='INK'&&rec.returnGuide?.kind==='CHANGE_PATH'&&rec.returnGuide?.address===rec.pathAddress&&
      Number(rec.pigment)>0&&Number(rec.water)>0;
    done(pass,rec);
  })().catch(e=>done(false,{...rec,error:String(e?.stack||e)}));
  <\/script></body></html>`;
}
const server=http.createServer((req,res)=>{
  if(String(req.url||'').startsWith('/__probe')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(probe());return}
  const p=resolveFile(req.url);if(!p){res.writeHead(404);res.end('not found');return}
  res.writeHead(200,{'content-type':contentType(p),'cache-control':'no-store'});fs.createReadStream(p).pipe(res);
});
function run(bin){return new Promise((resolve,reject)=>{
  const args=['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--window-size=450,980','--virtual-time-budget=16000','--dump-dom','http://'+HOST+':'+PORT+'/__probe'];
  const p=spawn(bin,args,{stdio:['ignore','pipe','pipe']});let stdout='',stderr='';
  const timer=setTimeout(()=>{p.kill('SIGKILL');reject(Error('change→INK smoke timeout'))},28000);
  p.stdout.on('data',d=>stdout+=d);p.stderr.on('data',d=>stderr+=d);
  p.on('error',e=>{clearTimeout(timer);reject(e)});
  p.on('close',code=>{clearTimeout(timer);resolve({code,stdout,stderr})});
})}
function resultText(dom){const m=String(dom||'').match(/id="probeResult"[^>]*>([\s\S]*?)<\/pre>/i);return (m?.[1]||'').replace(/&quot;/g,'"').replace(/&amp;/g,'&').trim()}

await new Promise((resolve,reject)=>server.listen(PORT,HOST,e=>e?reject(e):resolve()));PORT=server.address().port;
try{
  const r=await run(browserBin()),result=resultText(r.stdout),fatal=/Uncaught (?:TypeError|ReferenceError|SyntaxError)|net::ERR_|Aw, Snap/i.test(r.stderr);
  if(r.code!==0||fatal||!result.startsWith('PASS ')){
    console.error('FIELD LAB CHANGE→INK SMOKE FAIL',result||'(no result)');
    if(r.stderr.trim())console.error(r.stderr.slice(-2200));
    process.exitCode=1;
  }else console.log('FIELD LAB CHANGE→INK SMOKE PASS',result.slice(5));
}finally{await new Promise(r=>server.close(()=>r()))}
