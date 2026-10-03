#!/usr/bin/env node
'use strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {browserBin} from './browser-bin.mjs';

const ROOT=process.cwd(),HOST='127.0.0.1';let PORT=0;
function ct(p){if(p.endsWith('.html'))return'text/html; charset=utf-8';if(p.endsWith('.js')||p.endsWith('.mjs'))return'text/javascript; charset=utf-8';if(p.endsWith('.json'))return'application/json; charset=utf-8';if(p.endsWith('.css'))return'text/css; charset=utf-8';return'application/octet-stream'}
function resolveFile(url){let q=decodeURIComponent(String(url||'/').split('?')[0]).replace(/^\/+/, '');if(!q)q='index.html';if(q.endsWith('/'))q+='index.html';const p=path.normalize(path.join(ROOT,q));if(!p.startsWith(ROOT))return null;if(fs.existsSync(p)&&fs.statSync(p).isFile())return p;if(fs.existsSync(p+'.html'))return p+'.html';return null}
function probe(){return `<!doctype html><html><body style="margin:0"><iframe id="f" style="width:430px;height:900px;border:0;display:block"></iframe><pre id="probeResult">PENDING</pre><script>
const f=document.getElementById('f'),out=document.getElementById('probeResult'),rec={};let doneFlag=false;
const done=(ok,x)=>{if(doneFlag)return;doneFlag=true;out.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(x)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const wait=async(fn,limit=16000,label='condition')=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(60)}throw Error('wait '+label)};
const W=()=>f.contentWindow,D=()=>W().document;
(async()=>{try{
 f.src='/foundry/omnitools/?tool=bench';
 await wait(()=>D()?.getElementById('evaluate')?.onclick&&D()?.getElementById('sourceToggle')?.onclick,16000,'instrument boot');
 const d=D(),source=d.getElementById('sourceText'),name=d.getElementById('sourceName'),toggle=d.getElementById('sourceToggle');
 rec.mobile={toggle:getComputedStyle(toggle).display!=='none',width:W().innerWidth};
 if(!rec.mobile.toggle)throw Error('mobile source handle hidden');
 toggle.click();rec.mobile.open=d.getElementById('sourceDock').classList.contains('open');if(!rec.mobile.open)throw Error('mobile source sheet did not open');
 name.value='bench-fixture';name.dispatchEvent(new Event('input',{bubbles:true}));
 source.value='Rail | 82 | 74..88 | 90 | reversible clamp\\nFrame | 70..85 | 93 | 68 | fast deployment\\nUnknown | ? | 95 | 80 | measure form\\nWeak | 50 | 60 | 60 | dominated';source.dispatchEvent(new Event('input',{bubbles:true}));
 d.getElementById('minForm').value='55';d.getElementById('minFunction').value='60';d.getElementById('minFortitude').value='60';d.getElementById('evaluate').click();
 await wait(()=>/FRONT/.test(d.getElementById('benchSummary').textContent)&&d.querySelectorAll('.candidate').length>=4,4000,'bench result');
 rec.bench={summary:d.getElementById('benchSummary').textContent.trim(),front:[...d.querySelectorAll('.candidate.FRONT .candidateHead b')].map(x=>x.textContent),rejected:[...d.querySelectorAll('.candidate.REJECT .candidateHead b')].map(x=>x.textContent),missing:[...d.querySelectorAll('.missing')].map(x=>x.textContent)};
 if(!rec.bench.front.includes('Rail')||!rec.bench.front.includes('Unknown')||!rec.bench.rejected.includes('Frame'))throw Error('bench survivor/reject evidence unexpected');

 source.value='contact test@example.com and alpha beta gamma';source.dispatchEvent(new Event('input',{bubbles:true}));
 d.querySelector('[data-mode="scan"]').click();d.getElementById('loadMode').click();
 await wait(()=>d.querySelector('[data-mode="scan"].toolPane')?.contentDocument?.getElementById('in')?.value===source.value,5000,'scan source handoff');
 const sd=d.querySelector('[data-mode="scan"].toolPane').contentDocument;
 await wait(()=>sd.getElementById('out')?.textContent?.trim(),5000,'scan result');
 rec.scan={same:sd.getElementById('in').value===source.value,result:sd.getElementById('out').textContent.trim().slice(0,100)};
 if(!rec.scan.same)throw Error('scan source identity lost');

 d.querySelector('[data-mode="read"]').click();d.getElementById('loadMode').click();
 await wait(()=>d.querySelector('[data-mode="read"].toolPane')?.contentDocument?.getElementById('in')?.value===source.value,5000,'read source handoff');
 const rd=d.querySelector('[data-mode="read"].toolPane').contentDocument;
 await wait(()=>rd.getElementById('grid')?.textContent?.trim(),5000,'read result');
 rec.read={same:rd.getElementById('in').value===source.value,result:rd.getElementById('grid').textContent.trim().slice(0,100)};
 if(!rec.read.same)throw Error('read source identity lost');

 rec.trace=[...d.querySelectorAll('#trace .traceItem b')].map(x=>x.textContent).slice(0,6);
 rec.overflow=Math.max(d.documentElement.scrollWidth,d.body?.scrollWidth||0)-d.documentElement.clientWidth;
 if(rec.overflow>1)throw Error('horizontal overflow '+rec.overflow);
 if(!rec.trace.some(x=>/OBSERVED · READ/.test(x))||!rec.trace.some(x=>/OBSERVED · SCAN/.test(x)))throw Error('cross-axis trace missing');
 done(true,rec);
}catch(e){done(false,{...rec,error:String(e?.stack||e)})}})();
<\/script></body></html>`}
const server=http.createServer((req,res)=>{if(String(req.url||'').startsWith('/__probe')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(probe());return}const p=resolveFile(req.url);if(!p){res.writeHead(404);res.end('not found');return}res.writeHead(200,{'content-type':ct(p),'cache-control':'no-store'});fs.createReadStream(p).pipe(res)});
function run(bin){return new Promise((resolve,reject)=>{const args=['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--window-size=470,960','--virtual-time-budget=24000','--dump-dom','http://'+HOST+':'+PORT+'/__probe'];const p=spawn(bin,args,{stdio:['ignore','pipe','pipe']});let out='',err='';const tm=setTimeout(()=>{p.kill('SIGKILL');reject(Error('timeout'))},36000);p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',e=>{clearTimeout(tm);reject(e)});p.on('close',code=>{clearTimeout(tm);resolve({code,out,err})})})}
await new Promise((resolve,reject)=>server.listen(PORT,HOST,e=>e?reject(e):resolve()));PORT=server.address().port;
try{
 const r=await run(browserBin()),m=r.out.match(/id="probeResult"[^>]*>([\s\S]*?)<\/pre>/i),result=(m?.[1]||'').replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim(),fatal=/Uncaught (?:TypeError|ReferenceError|SyntaxError)|net::ERR_|Aw, Snap/i.test(r.err);
 if(r.code!==0||fatal||!result.startsWith('PASS ')){console.error('OMNITOOLS SMOKE FAIL',result||'(no result)');if(r.err.trim())console.error(r.err.slice(-3500));process.exitCode=1}else console.log('OMNITOOLS SMOKE PASS',result.slice(5));
}finally{await new Promise(r=>server.close(()=>r()))}
