#!/usr/bin/env node
'use strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';

const ROOT=process.cwd(),HOST='127.0.0.1';let PORT=0;
function browserBin(){for(const n of ['google-chrome-stable','google-chrome','chromium-browser','chromium']){const r=spawnSync('which',[n],{encoding:'utf8'});if(r.status===0&&r.stdout.trim())return r.stdout.trim()}for(const p of ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/Applications/Brave Browser.app/Contents/MacOS/Brave Browser','/Applications/Chromium.app/Contents/MacOS/Chromium','/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge']){if(spawnSync('test',['-x',p]).status===0)return p}throw Error('No Chrome/Chromium')}
function ct(p){if(p.endsWith('.html'))return'text/html; charset=utf-8';if(p.endsWith('.js')||p.endsWith('.mjs'))return'text/javascript; charset=utf-8';if(p.endsWith('.json'))return'application/json; charset=utf-8';if(p.endsWith('.css'))return'text/css; charset=utf-8';return'application/octet-stream'}
function resolveFile(url){let q=decodeURIComponent(String(url||'/').split('?')[0]).replace(/^\/+/, '');if(!q)q='index.html';if(q.endsWith('/'))q+='index.html';const p=path.normalize(path.join(ROOT,q));if(!p.startsWith(ROOT))return null;if(fs.existsSync(p)&&fs.statSync(p).isFile())return p;if(fs.existsSync(p+'.html'))return p+'.html';return null}
function probe(){return `<!doctype html><html><body><iframe id="f" style="width:430px;height:900px;border:0" src="/fold-bloom/live/?garden=1"></iframe><pre id="probeResult">PENDING</pre><script>
const f=document.getElementById('f'),out=document.getElementById('probeResult'),rec={};let finished=false;
const done=(ok,x)=>{if(finished)return;finished=true;out.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(x)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const wait=async(fn,limit=18000,label='condition')=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(60)}throw Error('wait '+label)};
const W=()=>f.contentWindow,D=()=>W().document;
(async()=>{try{
 await wait(()=>W().FoldBloomLive?.garden?.current?.()?.open===true,18000,'LIVE garden open');
 const api=W().FoldBloomLive,frame=D().getElementById('gardenFrame'),view=D().getElementById('gardenView');
 await wait(()=>view?.contentWindow?.document?.documentElement?.dataset?.foldBloomEcologyLaunch==='garden',18000,'Ecology hosted launch');
 const ED=view.contentWindow.document;
 await wait(()=>ED.getElementById('runMode')?.textContent==='GARDEN'||ED.getElementById('modeBadge')?.textContent==='GARDEN',12000,'Ecology GARDEN running');
 rec.open={garden:api.garden.current(),frame:!frame.hidden,host:ED.documentElement.dataset.foldBloomEcologyHost,launch:ED.documentElement.dataset.foldBloomEcologyLaunch,runMode:ED.getElementById('runMode')?.textContent,modeBadge:ED.getElementById('modeBadge')?.textContent};
 if(rec.open.garden.authority!=='ECOLOGY'||rec.open.garden.sourceClockBridge!==false||rec.open.garden.releaseAuthority!==false||!rec.open.frame||rec.open.host!=='FOLD_BLOOM_LIVE')throw Error('GARDEN authority/host contract');
 D().getElementById('gardenClose').click();
 await wait(()=>api.garden.current().open===false&&D().getElementById('gardenFrame').hidden,5000,'RETURN LIVE');
 rec.close={garden:api.garden.current(),dataset:D().documentElement.dataset.foldBloomGarden,subtitle:D().getElementById('liveSubtitle').textContent};
 if(rec.close.dataset!=='closed'||!rec.close.subtitle.includes('RIDE / READ / GARDEN / RETURN'))throw Error('RETURN LIVE contract');
 done(true,rec);
}catch(e){done(false,{...rec,error:String(e?.stack||e)})}})();
<\/script></body></html>`}
const server=http.createServer((req,res)=>{if(String(req.url||'').startsWith('/__probe')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(probe());return}const p=resolveFile(req.url);if(!p){res.writeHead(404);res.end('not found');return}res.writeHead(200,{'content-type':ct(p),'cache-control':'no-store'});fs.createReadStream(p).pipe(res)});
function run(bin){return new Promise((resolve,reject)=>{const a=['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--window-size=520,940','--virtual-time-budget=60000','--dump-dom','http://'+HOST+':'+PORT+'/__probe'];const p=spawn(bin,a,{stdio:['ignore','pipe','pipe']});let out='',err='';const tm=setTimeout(()=>{p.kill('SIGKILL');reject(Error('timeout'))},45000);p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',e=>{clearTimeout(tm);reject(e)});p.on('close',code=>{clearTimeout(tm);resolve({code,out,err})})})}
await new Promise((resolve,reject)=>server.listen(PORT,HOST,e=>e?reject(e):resolve()));PORT=server.address().port;
const probeBody=(probe().match(/<script>([\s\S]*?)<\/script>/)||[])[1]||'';
try{new Function(probeBody)}catch(e){console.error('GARDEN HARNESS INLINE SYNTAX FAIL',String(e.message));process.exit(1)}
try{const r=await run(browserBin()),m=r.out.match(/id="probeResult"[^>]*>([\s\S]*?)<\/pre>/i),result=(m?.[1]||'').replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim(),fatal=/Uncaught (?:TypeError|ReferenceError|SyntaxError)|net::ERR_|Aw, Snap/i.test(r.err);if(r.code!==0||fatal||!result.startsWith('PASS ')){console.error('FOLD BLOOM LIVE GARDEN SMOKE FAIL',result||'(no result)');console.error('GARDEN DUMP HEAD',JSON.stringify(String(r.out).slice(0,600)));console.error('GARDEN DUMP LEN',r.out.length,'EXIT',r.code);if(r.err.trim())console.error(r.err.slice(-2600));process.exitCode=1}else console.log('FOLD BLOOM LIVE GARDEN SMOKE PASS',result.slice(5))}finally{await new Promise(r=>server.close(()=>r()))}
