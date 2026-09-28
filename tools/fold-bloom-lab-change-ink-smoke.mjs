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
    tapLine(3);
    await wait(()=>W().FoldBloomFieldLab.stateStep().path?.selected_order?.[1]===3,2500,'steer L3 second');
    const steered=W().FoldBloomFieldLab.stateStep();
    rec.steering={initial:rec.initialOrder,afterFirst:[...firstSteer.path.selected_order],afterSecond:[...steered.path.selected_order],cursor:steered.cursor,prefix:steered.path.selected_order.slice(0,steered.cursor)};
    rec.pathAddress=steered.path.path_address;
    rec.order=[...steered.path.selected_order];
    D().getElementById('stateInk').click();
    await wait(()=>W().FoldBloomFieldLab.mode()==='INK'&&W().FoldBloomFieldLab.ink?.().guide?.ok,6000,'INK guide');
    const ink=W().FoldBloomFieldLab.ink(),addr=D().getElementById('addressRead').textContent||'';
    rec.afterMode=W().FoldBloomFieldLab.mode();
    rec.guideAuthority=ink.guide.authority;
    rec.guideAddress=ink.guide.address;
    rec.guideStates=ink.guide.points.length;
    rec.guideCursor=ink.guide.cursor;
    rec.guideFocus={...ink.guide.focus};
    rec.address=addr;
    rec.pathControlsVisible=!D().getElementById('inkPathControls').hidden;
    rec.expectedFocusAddress=steered.path.steps[0].address;

    D().getElementById('inkPathStep').click();
    await wait(()=>W().FoldBloomFieldLab.ink?.().guide?.cursor===2,2000,'INK path step');
    const steppedInk=W().FoldBloomFieldLab.ink().guide;
    rec.afterInkStep={cursor:steppedInk.cursor,focus:{...steppedInk.focus},address:D().getElementById('addressRead').textContent||''};

    D().getElementById('inkPathReturn').click();
    await wait(()=>W().FoldBloomFieldLab.mode()==='DATA'&&W().FoldBloomFieldLab.stateStep().cursor===2,2000,'INK return to DATA');
    rec.returnedData={mode:W().FoldBloomFieldLab.mode(),cursor:W().FoldBloomFieldLab.stateStep().cursor,address:D().getElementById('addressRead').textContent||''};

    D().getElementById('stateInk').click();
    await wait(()=>W().FoldBloomFieldLab.mode()==='INK'&&W().FoldBloomFieldLab.ink?.().guide?.cursor===2,2000,'DATA re-enter INK same focus');
    rec.reenteredGuide=W().FoldBloomFieldLab.ink().guide;

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
    const pass=rec.beforeMode==='DATA'&&rec.steering.initial.join(',')==='3,5'&&rec.steering.afterFirst.join(',')==='5,1,3'&&rec.steering.afterSecond.join(',')==='5,3,1'&&rec.steering.cursor===1&&rec.steering.prefix.join(',')==='5'&&rec.afterMode==='INK'&&rec.guideAuthority==='PROJECTION_ONLY'&&
      rec.guideAddress===rec.pathAddress&&rec.guideCursor===1&&rec.guideFocus?.token==='H[010|110]'&&rec.guideFocus?.address===rec.expectedFocusAddress&&rec.address===rec.expectedFocusAddress&&rec.pathControlsVisible===true&&rec.guideStates===rec.order.length+1&&
      rec.afterInkStep?.cursor===2&&rec.afterInkStep?.focus?.token==='H[011|110]'&&rec.afterInkStep?.address===steered.path.steps[1].address&&
      rec.returnedData?.mode==='DATA'&&rec.returnedData?.cursor===2&&rec.returnedData?.address===steered.path.steps[1].address&&
      rec.reenteredGuide?.cursor===2&&rec.reenteredGuide?.focus?.address===steered.path.steps[1].address&&
      rec.returnKind==='INK'&&rec.returnGuide?.kind==='CHANGE_PATH'&&rec.returnGuide?.address===rec.pathAddress&&rec.returnGuide?.cursor===2&&rec.returnGuide?.focus?.address===steered.path.steps[1].address&&
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
  const args=['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--window-size=450,980','--virtual-time-budget=11000','--dump-dom','http://'+HOST+':'+PORT+'/__probe'];
  const p=spawn(bin,args,{stdio:['ignore','pipe','pipe']});let stdout='',stderr='';
  const timer=setTimeout(()=>{p.kill('SIGKILL');reject(Error('change→INK smoke timeout'))},22000);
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
