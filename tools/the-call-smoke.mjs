#!/usr/bin/env node
/* THE CALL — render smoke. Drives the real page in headless Chrome:
   calibrate F (across APAC) → want:both → pace:8, then plays 8 calls to the ending.

   Asserts (render level, beyond the static/node selftest):
   - F-P2: card 1 and card 2 option ORDER equals the rotated canonical deck order
     (right call moved off index 0); letters relabel A,B,C.
   - F-P1: the withheld ending renders "These 8 cards are across APAC …"
     and does NOT say "seven cards".
   - Implicitly: 0 uncaught page errors (the runner fails on Uncaught TypeError/
     ReferenceError/SyntaxError in Chrome stderr).

   Run: SMOKE_PORT=<free port> node tools/the-call-smoke.mjs   (from repo root) */
'use strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {browserBin} from './browser-bin.mjs';

const ROOT=process.cwd(),HOST='127.0.0.1';
let PORT=Number(process.env.SMOKE_PORT||41741)||41741;
function ct(p){if(p.endsWith('.html'))return'text/html; charset=utf-8';if(p.endsWith('.js')||p.endsWith('.mjs'))return'text/javascript; charset=utf-8';if(p.endsWith('.json'))return'application/json; charset=utf-8';if(p.endsWith('.css'))return'text/css; charset=utf-8';if(p.endsWith('.mp3'))return'audio/mpeg';return'application/octet-stream'}
function resolveFile(url){let q=decodeURIComponent(String(url||'/').split('?')[0]).replace(/^\/+/, '');if(!q)q='index.html';if(q.endsWith('/'))q+='index.html';const p=path.normalize(path.join(ROOT,q));if(!p.startsWith(ROOT))return null;if(fs.existsSync(p)&&fs.statSync(p).isFile())return p;if(fs.existsSync(p+'.html'))return p+'.html';return null}
function probe(){return `<!doctype html><html><body><pre id="probeResult">PENDING</pre><script>
const out=document.getElementById('probeResult'),rec={};let finished=false;
const done=(ok,x)=>{if(finished)return;finished=true;out.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(x)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const wait=async(fn,limit=15000,label='condition')=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(50)}throw Error('wait '+label)};
(async()=>{try{
  const f=document.createElement('iframe');f.style='width:1000px;height:800px;border:0';f.src='/20261006-the-call-mcvoid/';document.body.prepend(f);
  const W=()=>f.contentWindow,D=()=>W().document;
  await wait(()=>D().querySelector('#calibopts .call'),15000,'calibrate screen');
  await wait(()=>W().APAC_DECK&&W().APAC_DECK.length>0,10000,'apac deck');
  const pick=async(re,label)=>{const b=[...D().querySelectorAll('#calibopts .call')].find(x=>re.test(x.textContent||''));if(!b)throw Error('calib option missing: '+label);b.click();await sleep(120)};
  await pick(/across APAC/,'face F');
  await pick(/keep them separate/,'want both');
  await pick(/eight\\. the full read/,'pace 8');
  await wait(()=>D().querySelector('#calls .call'),10000,'first card');
  const optTexts=()=>[...D().querySelectorAll('#calls .call')].map(x=>x.querySelector('.t').textContent);
  const optLets=()=>[...D().querySelectorAll('#calls .call')].map(x=>x.querySelector('.k').textContent);
  const deck=W().APAC_DECK,t=(i,j)=>deck[i].calls[j].t;
  const marketOrder=deck.slice(0,8).map(c=>c.market);
  rec.spread={markets:marketOrder,ok:JSON.stringify(marketOrder)===JSON.stringify(['Indonesia','Thailand','Vietnam','Philippines','Singapore','Korea','Japan','Australia'])};
  const c1=optTexts(),l1=optLets();
  rec.card1={letters:l1.join(''),rotated:c1[0]===t(0,1)&&c1[1]===t(0,2)&&c1[2]===t(0,0)&&l1.join('')==='ABC',shown:c1.map(x=>x.slice(0,30)),want:[t(0,1),t(0,2),t(0,0)].map(x=>x.slice(0,30))};
  for(let k=0;k<8;k++){
    if(k===1){const c2=optTexts();rec.card2={rotated:c2[0]===t(1,2)&&c2[1]===t(1,0)&&c2[2]===t(1,1)}}
    D().querySelector('#calls .call[data-i="0"]').click();
    await wait(()=>!D().getElementById('next').disabled,5000,'next enabled card '+(k+1));
    D().getElementById('next').click();
    await sleep(80);
  }
  const end=await wait(()=>{const e=D().getElementById('ending');return e&&/NO DIAGNOSIS/.test(e.textContent||'')?e:null},10000,'ending');
  const et=end.textContent||'';
  rec.ending={hasFaceLine:/These 8 cards are across APAC/.test(et),saysSeven:/seven cards/i.test(et),excerpt:et.slice(0,150)};
  rec.playbookRows=D().querySelectorAll('#pblist .pbrow').length;
  done(rec.card1.rotated&&rec.card2.rotated&&rec.spread.ok&&rec.ending.hasFaceLine&&!rec.ending.saysSeven,rec);
}catch(e){done(false,{...rec,error:String(e?.stack||e)})}})();
<\/script></body></html>`}
const server=http.createServer((req,res)=>{if(String(req.url||'').startsWith('/__probe')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(probe());return}const p=resolveFile(req.url);if(!p){res.writeHead(404);res.end('not found');return}res.writeHead(200,{'content-type':ct(p),'cache-control':'no-store'});fs.createReadStream(p).pipe(res)});
function run(bin){return new Promise((resolve,reject)=>{const args=['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--window-size=1100,900','--virtual-time-budget=20000','--dump-dom','http://'+HOST+':'+PORT+'/__probe'];const p=spawn(bin,args,{stdio:['ignore','pipe','pipe']});let out='',err='';const tm=setTimeout(()=>{p.kill('SIGKILL');reject(Error('timeout'))},36000);p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',e=>{clearTimeout(tm);reject(e)});p.on('close',code=>{clearTimeout(tm);resolve({code,out,err})})})}
await new Promise((resolve,reject)=>server.listen(PORT,HOST,e=>e?reject(e):resolve()));PORT=server.address().port;
try{
  const r=await run(browserBin()),m=r.out.match(/id="probeResult"[^>]*>([\s\S]*?)<\/pre>/i),result=(m?.[1]||'').replace(/&quot;/g,'"').replace(/&amp;/g,'&').trim(),fatal=/Uncaught (?:TypeError|ReferenceError|SyntaxError)|net::ERR_|Aw, Snap/i.test(r.err);
  if(r.code!==0||fatal||!result.startsWith('PASS ')){console.error('THE CALL SMOKE FAIL',result||'(no result)');if(r.err.trim())console.error(r.err.slice(-2600));process.exitCode=1}
  else console.log('THE CALL SMOKE PASS',result.slice(5));
}finally{await new Promise(r=>server.close(()=>r()))}
