#!/usr/bin/env node
'use strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {browserBin} from './browser-bin.mjs';

const ROOT=process.cwd(),HOST='127.0.0.1';let PORT=0;
function ct(p){if(p.endsWith('.html'))return'text/html; charset=utf-8';if(p.endsWith('.js')||p.endsWith('.mjs'))return'text/javascript; charset=utf-8';if(p.endsWith('.json'))return'application/json; charset=utf-8';if(/\.(?:md|txt)$/.test(p))return'text/plain; charset=utf-8';if(p.endsWith('.css'))return'text/css; charset=utf-8';return'application/octet-stream'}
function resolveFile(url){let q=decodeURIComponent(String(url||'/').split('?')[0]).replace(/^\/+/, '');if(!q)q='index.html';if(q.endsWith('/'))q+='index.html';const p=path.normalize(path.join(ROOT,q));if(!p.startsWith(ROOT))return null;if(fs.existsSync(p)&&fs.statSync(p).isFile())return p;if(fs.existsSync(p+'.html'))return p+'.html';return null}
function probe(){return `<!doctype html><html><body><iframe id="f" style="width:480px;height:960px;border:0"></iframe><pre id="probeResult">PENDING</pre><script>
const f=document.getElementById('f'),out=document.getElementById('probeResult'),rec={};let finished=false;
const done=(ok,x)=>{if(finished)return;finished=true;out.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(x)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const wait=async(fn,limit=18000,label='condition')=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(60)}throw Error('wait '+label)};
const W=()=>f.contentWindow,D=()=>W().document;
(async()=>{try{
  const outer='/?focus=%2Fprison-age%2F';
  f.src='/docs/?src=%2Fprison-age%2Fstories%2F08-successful-escape.md&return='+encodeURIComponent(outer)+'&ap_scale=SENT&ap_char=363&echo=%2Fprison-age%2Fecho-index.json&echo_source=successful-escape';
  await wait(()=>D().documentElement.dataset.readfieldEcho==='shown',16000,'origin echo');
  const originHref=W().location.pathname+W().location.search+W().location.hash,originSnap=D().getElementById('docAperture').snapshot(),echo=D().getElementById('sourceEchoLink');
  rec.origin={href:originHref,focus:originSnap?.focus||'',echo:echo?.textContent||'',echoHref:echo?.getAttribute('href')||'',outer:D().getElementById('returnLink')?.getAttribute('href')||''};
  if(!/door/i.test(rec.origin.echo)||!rec.origin.echoHref.includes('echo_back='))throw Error('origin echo/back missing');
  echo.click();
  await wait(()=>D().documentElement.dataset.readfieldEchoBack==='ready',16000,'target echo back');
  const back=D().getElementById('echoBackLink'),targetSnap=D().getElementById('docAperture').snapshot();
  rec.target={src:new URL(W().location.href).searchParams.get('src'),focus:targetSnap?.focus||'',back:back?.getAttribute('href')||'',outer:D().getElementById('returnLink')?.getAttribute('href')||'',backState:D().documentElement.dataset.readfieldEchoBack};
  if(!rec.target.back.includes('/docs/?')||rec.target.outer!==outer)throw Error('target back/root return mismatch');
  back.click();
  await wait(()=>new URL(W().location.href).searchParams.get('src')==='/prison-age/stories/08-successful-escape.md',12000,'echo back origin');
  await wait(()=>D().documentElement.dataset.readfieldEcho==='shown',8000,'origin echo restored');
  const restored=D().getElementById('docAperture').snapshot(),restoredOuter=D().getElementById('returnLink')?.getAttribute('href')||'';
  rec.restored={focus:restored?.focus||'',charIndex:restored?.char_index,scale:restored?.scale,outer:restoredOuter,echoBack:D().getElementById('echoBackLink')?.hidden===false};
  if(String(restored?.focus||'').trim()!==String(originSnap?.focus||'').trim())throw Error('origin focus not restored');
  if(Number(restored?.char_index)!==Number(originSnap?.char_index))throw Error('origin char index not restored');
  if(restoredOuter!==outer)throw Error('outer FIELD return lost');
  done(true,rec);
}catch(e){done(false,{...rec,error:String(e?.stack||e),href:(()=>{try{return W().location.href}catch(_){return null}})()})}})();
<\/script></body></html>`}
const server=http.createServer((req,res)=>{if(String(req.url||'').startsWith('/__probe')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(probe());return}const p=resolveFile(req.url);if(!p){res.writeHead(404);res.end('not found');return}res.writeHead(200,{'content-type':ct(p),'cache-control':'no-store'});fs.createReadStream(p).pipe(res)});
function run(bin){return new Promise((resolve,reject)=>{const args=['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--window-size=500,980','--virtual-time-budget=30000','--dump-dom','http://'+HOST+':'+PORT+'/__probe'];const p=spawn(bin,args,{stdio:['ignore','pipe','pipe']});let out='',err='';const timer=setTimeout(()=>{p.kill('SIGKILL');reject(Error('timeout'))},43000);p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',e=>{clearTimeout(timer);reject(e)});p.on('close',code=>{clearTimeout(timer);resolve({code,out,err})})})}
await new Promise((resolve,reject)=>server.listen(PORT,HOST,e=>e?reject(e):resolve()));PORT=server.address().port;
try{
 const r=await run(browserBin()),m=r.out.match(/id="probeResult"[^>]*>([\s\S]*?)<\/pre>/i),result=(m?.[1]||'').replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim(),fatal=/Uncaught (?:TypeError|ReferenceError|SyntaxError)|net::ERR_|Aw, Snap/i.test(r.err);
 if(r.code!==0||fatal||!result.startsWith('PASS ')){console.error('READFIELD ECHO DOOR SMOKE FAIL',result||'(no result)');if(r.err.trim())console.error(r.err.slice(-3600));process.exitCode=1}else console.log('READFIELD ECHO DOOR SMOKE PASS',result.slice(5));
}finally{await new Promise(r=>server.close(()=>r()))}
