#!/usr/bin/env node
'use strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
const ROOT=process.cwd(),HOST='127.0.0.1';let PORT=0;
function browserBin(){for(const n of ['google-chrome-stable','google-chrome','chromium-browser','chromium']){const r=spawnSync('which',[n],{encoding:'utf8'});if(r.status===0&&r.stdout.trim())return r.stdout.trim()}throw Error('No Chrome/Chromium')}
function ct(p){if(p.endsWith('.html'))return'text/html; charset=utf-8';if(p.endsWith('.js')||p.endsWith('.mjs'))return'text/javascript; charset=utf-8';if(p.endsWith('.json'))return'application/json; charset=utf-8';if(p.endsWith('.md')||p.endsWith('.txt'))return'text/plain; charset=utf-8';if(p.endsWith('.css'))return'text/css; charset=utf-8';return'application/octet-stream'}
function resolveFile(url){let q=decodeURIComponent(String(url||'/').split('?')[0]).replace(/^\/+/, '');if(!q)q='index.html';if(q.endsWith('/'))q+='index.html';const p=path.normalize(path.join(ROOT,q));if(!p.startsWith(ROOT))return null;if(fs.existsSync(p)&&fs.statSync(p).isFile())return p;if(fs.existsSync(p+'.html'))return p+'.html';return null}
function probe(){return `<!doctype html><html><body><iframe id="f" style="width:440px;height:920px;border:0"></iframe><pre id="probeResult">PENDING</pre><script>
const f=document.getElementById('f'),out=document.getElementById('probeResult'),rec={};let finished=false;
const done=(ok,x)=>{if(finished)return;finished=true;out.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(x)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const wait=async(fn,limit=20000,label='condition')=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(60)}throw Error('wait '+label)};
const W=()=>f.contentWindow,D=()=>W().document;
(async()=>{try{
 f.src='/?focus=%2Fprison-age%2F';
 await wait(()=>/PRISON AGE/.test(D().getElementById('capHeld')?.textContent||'')&&D().querySelectorAll('#capMoves .capMove').length===3,18000,'FIELD held source set');
 const moves=[...D().querySelectorAll('#capMoves .capMove')].map(a=>({label:a.textContent.trim(),href:a.getAttribute('href')||''}));
 rec.field={held:D().getElementById('capHeld').textContent,moves,ret:D().getElementById('capReturn')?.textContent||''};
 if(moves.map(x=>x.label).join('|')!=='READ|RIDE|SOURCE')throw Error('FIELD native moves');
 if(!moves[0].href.includes('action=read')||!moves[1].href.includes('action=ride')||moves[2].href.includes('action='))throw Error('FIELD action targets');

 f.src='/prison-age/?story=open-air&return=field';
 await wait(()=>W().PrisonAgeSourceAPI?.snapshot?.()?.sourceLength>0,12000,'source resolver');
 const snap=W().PrisonAgeSourceAPI.snapshot(),body=D().body.textContent||'';
 rec.source={story:snap.story?.id,title:D().getElementById('title')?.textContent||'',preview:D().getElementById('preview')?.textContent||'',returnAddress:snap.returnAddress,returnHref:D().getElementById('returnField')?.getAttribute('href')||'',engine:!!D().getElementById('engine'),retired:/reader-0\.2|ALWAYS BEHIND/i.test(body)};
 if(rec.source.story!=='open-air'||!/By the forty-third year of enclosure/.test(rec.source.preview)||rec.source.engine||rec.source.retired)throw Error('source resolver primacy');
 if(rec.source.returnAddress!=='/?focus=%2Fprison-age%2F'||rec.source.returnHref!=='/?focus=%2Fprison-age%2F')throw Error('FIELD exact return');

 f.src='/prison-age/?story=open-air&action=read&return=field';
 await wait(()=>W().location.pathname==='/docs/',16000,'READFIELD action');
 rec.read={path:W().location.pathname,src:new URL(W().location.href).searchParams.get('src'),ret:new URL(W().location.href).searchParams.get('return'),scale:new URL(W().location.href).searchParams.get('ap_scale')};
 if(rec.read.src!=='/prison-age/stories/03-open-air.md'||rec.read.ret!=='/?focus=%2Fprison-age%2F'||rec.read.scale!=='PARA')throw Error('READ exact source/return');

 f.src='/prison-age/?story=open-air&action=ride&return=field';
 await wait(()=>W().location.pathname==='/fold-bloom/live/'&&W().FoldBloomLive?.read?.current?.(),18000,'RIDE LIVE action');
 const live=W().FoldBloomLive.read.current();
 rec.ride={authority:live.source.authority,kind:live.source.kind,mode:live.course.mode,grain:live.course.grain,address:live.course.address,ret:live.returnAddress,text:live.witness?.text||''};
 if(live.source.authority!=='PRISON_AGE'||live.source.kind!=='PRISON_AGE_SOURCE'||live.course.mode!=='STEP'||live.course.grain!=='PARAGRAPH'||live.returnAddress!=='/?focus=%2Fprison-age%2F'||!/By the forty-third year of enclosure/.test(rec.ride.text))throw Error('RIDE exact source/return');
 done(true,rec);
}catch(e){done(false,{...rec,error:String(e?.stack||e),href:(()=>{try{return W().location.href}catch(_){return null}})()})}})();
<\/script></body></html>`}
const server=http.createServer((req,res)=>{if(String(req.url||'').startsWith('/__probe')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(probe());return}const p=resolveFile(req.url);if(!p){res.writeHead(404);res.end('not found');return}res.writeHead(200,{'content-type':ct(p),'cache-control':'no-store'});fs.createReadStream(p).pipe(res)});
function run(bin){return new Promise((resolve,reject)=>{const a=['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--window-size=470,960','--virtual-time-budget=30000','--dump-dom','http://'+HOST+':'+PORT+'/__probe'];const p=spawn(bin,a,{stdio:['ignore','pipe','pipe']});let out='',err='';const tm=setTimeout(()=>{p.kill('SIGKILL');reject(Error('timeout'))},42000);p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',e=>{clearTimeout(tm);reject(e)});p.on('close',code=>{clearTimeout(tm);resolve({code,out,err})})})}
await new Promise((resolve,reject)=>server.listen(PORT,HOST,e=>e?reject(e):resolve()));PORT=server.address().port;
try{
 const r=await run(browserBin()),m=r.out.match(/id="probeResult"[^>]*>([\s\S]*?)<\/pre>/i),result=(m?.[1]||'').replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim(),fatal=/Uncaught (?:TypeError|ReferenceError|SyntaxError)|net::ERR_|Aw, Snap/i.test(r.err);
 if(r.code!==0||fatal||!result.startsWith('PASS ')){console.error('PRISON AGE → FIELD SMOKE FAIL',result||'(no result)');if(r.err.trim())console.error(r.err.slice(-3600));process.exitCode=1}else console.log('PRISON AGE → FIELD SMOKE PASS',result.slice(5));
}finally{await new Promise(r=>server.close(()=>r()))}
