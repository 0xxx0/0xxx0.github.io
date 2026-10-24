#!/usr/bin/env node
// Native AXIAL: 390px touch-sized binding, projection, RETURN and URL re-entry.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {browserBin} from './browser-bin.mjs';
const ROOT=process.cwd(),HOST='127.0.0.1';
const probe=`<!doctype html><html><body><iframe id="f" style="width:390px;height:800px;border:0" src="/foundry/axial/"></iframe><pre id="result">PENDING</pre><script>
const f=document.getElementById('f'),out=document.getElementById('result'),rec={};
const wait=async(fn,label)=>{for(let i=0;i<190;i++){try{const x=fn();if(x)return x}catch(e){}await new Promise(r=>setTimeout(r,70))}throw Error('wait '+label)};
const done=(ok,x)=>out.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(x);
(async()=>{try{
 let w=()=>f.contentWindow,d=()=>w().document;
 await wait(()=>w().AxialFocusAPI?.snapshot()?.rings?.length>=4,'boot');
 const api=w().AxialFocusAPI,initial=api.snapshot(),old=JSON.stringify(initial.rings);
 d().querySelector('[data-bind="kind"]').click();
 rec.bound=api.snapshot().active_ring;
 rec.noMutation=old===JSON.stringify(api.snapshot().rings);
 d().getElementById('bindNext').click();
 let changed=api.snapshot(),kind=changed.rings.find(r=>r.key==='kind');
 rec.value=kind.value;rec.changed=kind.value!==initial.rings.find(r=>r.key==='kind').value;
 d().getElementById('viewStrip').click();
 rec.strip=api.snapshot().projection;
 rec.stillBound=api.snapshot().active_ring;
 d().getElementById('viewRing').click();
 rec.ring=api.snapshot().projection;
 const receipt=api.createReturn();rec.receiptBinding=receipt.active_ring;
 d().getElementById('bindNext').click();
 await api.restoreReturn(0);
 const restored=api.snapshot();
 rec.restore={bind:restored.active_ring,value:restored.rings.find(r=>r.key==='kind').value};
 const link=w().location.href;rec.url=link;
 f.src=link;
 await wait(()=>w().AxialFocusAPI && w().AxialFocusAPI!==api && w().AxialFocusAPI.snapshot()?.rings?.length>=4 && w().AxialFocusAPI.snapshot()?.active_ring==='kind','new document reentry');
 const reloaded=w().AxialFocusAPI.snapshot();
 rec.reentry={bind:reloaded.active_ring,value:reloaded.rings.find(r=>r.key==='kind').value};
 rec.width=d().documentElement.scrollWidth-d().documentElement.clientWidth;
 const pass=rec.bound==='kind'&&rec.noMutation&&rec.changed&&rec.strip==='STRIP'&&rec.stillBound==='kind'&&rec.ring==='RING'&&rec.receiptBinding==='kind'&&rec.restore.bind==='kind'&&rec.restore.value===kind.value&&rec.reentry.bind==='kind'&&rec.reentry.value===kind.value&&rec.width<=2;
 done(pass,rec);
}catch(e){done(false,{...rec,error:String(e?.stack||e)})}})();
<\/script></body></html>`;
const mime=p=>p.endsWith('.html')?'text/html':p.endsWith('.json')?'application/json':p.endsWith('.js')||p.endsWith('.mjs')?'text/javascript':'text/plain';
const server=http.createServer((req,res)=>{
 if(req.url==='/__probe'){res.writeHead(200,{'content-type':'text/html'});res.end(probe);return}
 let p=decodeURIComponent(String(req.url||'/').split('?')[0]).replace(/^\/+/, '');
 if(!p||p.endsWith('/'))p+='index.html';
 const name=path.resolve(ROOT,p);
 if(!name.startsWith(ROOT+path.sep)||!fs.existsSync(name)){res.writeHead(404);res.end('not found');return}
 res.writeHead(200,{'content-type':mime(name)});fs.createReadStream(name).pipe(res);
});
await new Promise(resolve=>server.listen(0,HOST,resolve));
const port=server.address().port;
try{
 const out=await new Promise((resolve,reject)=>{
  const proc=spawn(browserBin(),['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--window-size=900,900','--virtual-time-budget=22000','--dump-dom',`http://${HOST}:${port}/__probe`],{stdio:['ignore','pipe','pipe']});
  let stdout='',stderr='';const timer=setTimeout(()=>{proc.kill('SIGKILL');reject(Error('browser timeout'))},35000);
  proc.stdout.on('data',d=>stdout+=d);proc.stderr.on('data',d=>stderr+=d);proc.on('close',code=>{clearTimeout(timer);resolve({code,stdout,stderr})});proc.on('error',reject);
 });
 const m=out.stdout.match(/id="result"[^>]*>([\s\S]*?)<\/pre>/),result=(m?.[1]||'').replace(/&quot;/g,'"').replace(/&amp;/g,'&');
 if(out.code!==0||!result.startsWith('PASS ')){console.error('FAIL AXIAL binding browser',result||'no result',out.stderr.slice(-800));process.exitCode=1}
 else console.log('PASS AXIAL binding browser',result.slice(5));
}finally{await new Promise(r=>server.close(r))}
