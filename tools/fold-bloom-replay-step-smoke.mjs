#!/usr/bin/env node
'use strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
const ROOT=process.cwd(),HOST='127.0.0.1',PORT=41747;
function browserBin(){for(const n of ['google-chrome-stable','google-chrome','chromium-browser','chromium']){const r=spawnSync('which',[n],{encoding:'utf8'});if(r.status===0&&r.stdout.trim())return r.stdout.trim()}throw Error('No Chrome/Chromium')}
function ct(p){if(p.endsWith('.html'))return'text/html; charset=utf-8';if(p.endsWith('.js')||p.endsWith('.mjs'))return'text/javascript; charset=utf-8';if(p.endsWith('.json'))return'application/json; charset=utf-8';if(p.endsWith('.css'))return'text/css; charset=utf-8';return'application/octet-stream'}
function resolveFile(url){let q=decodeURIComponent(String(url||'/').split('?')[0]).replace(/^\/+/, '');if(!q)q='index.html';if(q.endsWith('/'))q+='index.html';let p=path.normalize(path.join(ROOT,q));if(!p.startsWith(ROOT))return null;if(fs.existsSync(p)&&fs.statSync(p).isFile())return p;if(fs.existsSync(p+'.html'))return p+'.html';return null}
function probe(){return `<!doctype html><html><body><iframe id="f" style="width:430px;height:900px;border:0" src="/fold-bloom/replay/"></iframe><pre id="probeResult">PENDING</pre><script>
const f=document.getElementById('f'),o=document.getElementById('probeResult');let done=false;
const sleep=ms=>new Promise(r=>setTimeout(r,ms)),wait=async(fn,limit=12000)=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(60)}throw Error('timeout')};
(async()=>{const W=()=>f.contentWindow,D=()=>W().document;const api=await wait(()=>W().FoldBloomReplay?.boot==='ready'&&W().FoldBloomReplay);
const b=D().getElementById('stepBack'),n=D().getElementById('stepNext'),scrub=D().getElementById('scrub');
const a=api.step(1),p1=Number(scrub.value),addr1=D().documentElement.dataset.replayCourseAddress||'';
const z=api.step(1),p2=Number(scrub.value),addr2=D().documentElement.dataset.replayCourseAddress||'';
const back=api.step(-1),p3=Number(scrub.value);
const pass=!!b&&!!n&&a.p>0&&z.p>a.p&&p2>p1&&p3<p2&&addr1.startsWith('course://replay_score/')&&addr2.startsWith('course://replay_score/')&&D().documentElement.dataset.replayStep==='ready';
o.textContent=(pass?'PASS ':'FAIL ')+JSON.stringify({a:a.p,z:z.p,back:back.p,p1,p2,p3,addr1,addr2,buttons:!!b&&!!n});
})().catch(e=>{o.textContent='FAIL '+JSON.stringify({error:String(e?.stack||e)})});
<\/script></body></html>`}
const server=http.createServer((req,res)=>{if(String(req.url||'').startsWith('/__probe')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(probe());return}const f=resolveFile(req.url);if(!f){res.writeHead(404);res.end('not found');return}res.writeHead(200,{'content-type':ct(f),'cache-control':'no-store'});fs.createReadStream(f).pipe(res)});
function run(bin){return new Promise((resolve,reject)=>{const a=['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--window-size=430,960','--virtual-time-budget=9000','--dump-dom','http://'+HOST+':'+PORT+'/__probe'];const p=spawn(bin,a,{stdio:['ignore','pipe','pipe']});let out='',err='';const tm=setTimeout(()=>{p.kill('SIGKILL');reject(Error('timeout'))},18000);p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',e=>{clearTimeout(tm);reject(e)});p.on('close',code=>{clearTimeout(tm);resolve({code,out,err})})})}
await new Promise((resolve,reject)=>server.listen(PORT,HOST,e=>e?reject(e):resolve()));
try{const r=await run(browserBin()),m=r.out.match(/id="probeResult"[^>]*>([\s\S]*?)<\/pre>/i),result=(m?.[1]||'').replace(/&quot;/g,'"').replace(/&amp;/g,'&').trim();if(r.code!==0||!result.startsWith('PASS ')){console.error('REPLAY STEP SMOKE FAIL',result);process.exitCode=1}else console.log('REPLAY STEP SMOKE PASS',result.slice(5))}finally{await new Promise(r=>server.close(()=>r()))}
