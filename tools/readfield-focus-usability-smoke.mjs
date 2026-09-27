#!/usr/bin/env node
'use strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';

const ROOT=process.cwd(),HOST='127.0.0.1',PORT=41766;
function browserBin(){for(const n of ['google-chrome-stable','google-chrome','chromium-browser','chromium']){const r=spawnSync('which',[n],{encoding:'utf8'});if(r.status===0&&r.stdout.trim())return r.stdout.trim()}throw Error('No Chrome/Chromium')}
function ct(p){if(p.endsWith('.html'))return'text/html; charset=utf-8';if(p.endsWith('.js')||p.endsWith('.mjs'))return'text/javascript; charset=utf-8';if(p.endsWith('.json'))return'application/json; charset=utf-8';if(p.endsWith('.css'))return'text/css; charset=utf-8';if(p.endsWith('.svg'))return'image/svg+xml';return'application/octet-stream'}
function resolveFile(url){let q=decodeURIComponent(String(url||'/').split('?')[0]).replace(/^\/+/, '');if(!q)q='index.html';if(q.endsWith('/'))q+='index.html';const p=path.normalize(path.join(ROOT,q));if(!p.startsWith(ROOT))return null;if(fs.existsSync(p)&&fs.statSync(p).isFile())return p;if(fs.existsSync(p+'.html'))return p+'.html';return null}
function probe(){return `<!doctype html><html><body style="margin:0"><iframe id="f" style="width:900px;height:760px;border:0" src="/docs/"></iframe><pre id="probeResult">PENDING</pre><script>
const f=document.getElementById('f'),o=document.getElementById('probeResult'),rec={};let finished=false;
const done=(ok,x)=>{if(finished)return;finished=true;o.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(x)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms)),wait=async(fn,limit=12000,label='condition')=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(60)}throw Error('wait '+label)};
(async()=>{try{
 const W=()=>f.contentWindow,D=()=>W().document;
 await wait(()=>D().getElementById('docAperture')?.load&&typeof W().openLocalText==='function',12000,'READFIELD boot');
 W().openLocalText(JSON.stringify({alpha:{beta:1,gamma:[2,3]},state:{ready:true},question:'what changes?'},null,2),'probe.json','application/json','AUTO',false);
 const A=await wait(()=>{const x=D().getElementById('docAperture');return x?.snapshot?.()?.kind==='JSON'?x:null},6000,'JSON aperture');
 const s=A.snapshot();rec.kind=s.kind;rec.address=s.address;rec.json=!!s.json;rec.jsonPath=s.json?.path;rec.jsonChildren=s.json?.children?.length||0;rec.centerKey=A.shadowRoot?.getElementById('centerWord')?.textContent||'';rec.hover=!!A.hoverDescriptor?.(.3)?.title;
 await wait(()=>D().querySelector('.jsonFocus'),5000,'structured JSON view');
 rec.structured=!!D().querySelector('.jsonFocus');rec.childCards=D().querySelectorAll('.jsonChild').length;rec.thumbs=D().querySelectorAll('.doc .thumb').length;
 const before=A.snapshot().address,child=D().querySelector('.jsonChildren .jsonChild');if(child){child.click();await sleep(100)}rec.childMoved=!!child&&A.snapshot().address!==before;
 D().getElementById('markHere').click();await sleep(100);
 rec.trailText=D().getElementById('focusMeta').textContent||'';rec.marked=D().getElementById('markHere').classList.contains('marked');rec.trailKeys=Object.keys(W().localStorage).filter(k=>k.startsWith('readfield.trail.v01:')).length;
 const pass=rec.kind==='JSON'&&rec.json&&rec.jsonPath&&rec.structured&&rec.childCards>0&&rec.thumbs>=5&&rec.hover&&rec.childMoved&&rec.marked&&rec.trailKeys>0&&/VISITED/.test(rec.trailText);
 done(pass,rec);
}catch(e){done(false,{...rec,error:String(e?.stack||e)})}})();
<\/script></body></html>`}
const server=http.createServer((req,res)=>{if(String(req.url||'').startsWith('/__probe')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(probe());return}const p=resolveFile(req.url);if(!p){res.writeHead(404);res.end('not found');return}res.writeHead(200,{'content-type':ct(p),'cache-control':'no-store'});fs.createReadStream(p).pipe(res)});
function run(bin){return new Promise((resolve,reject)=>{const a=['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--window-size=940,820','--virtual-time-budget=12000','--dump-dom','http://'+HOST+':'+PORT+'/__probe'];const p=spawn(bin,a,{stdio:['ignore','pipe','pipe']});let out='',err='';const tm=setTimeout(()=>{p.kill('SIGKILL');reject(Error('timeout'))},22000);p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',e=>{clearTimeout(tm);reject(e)});p.on('close',code=>{clearTimeout(tm);resolve({code,out,err})})})}
await new Promise((resolve,reject)=>server.listen(PORT,HOST,e=>e?reject(e):resolve()));
try{const r=await run(browserBin()),m=r.out.match(/id="probeResult"[^>]*>([\s\S]*?)<\/pre>/i),result=(m?.[1]||'').replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim(),fatal=/Uncaught (?:TypeError|ReferenceError|SyntaxError)|net::ERR_|Aw, Snap/i.test(r.err);if(r.code!==0||fatal||!result.startsWith('PASS ')){console.error('READFIELD FOCUS USABILITY SMOKE FAIL',result||'(no result)');if(r.err.trim())console.error(r.err.slice(-2200));process.exitCode=1}else console.log('READFIELD FOCUS USABILITY SMOKE PASS',result.slice(5))}finally{await new Promise(r=>server.close(()=>r()))}
