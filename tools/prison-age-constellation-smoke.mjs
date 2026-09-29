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
const HASH='sha256:9b9be4ac4e24cb980d9f65bc948d6b3aaa9c514a84ee44a96142d526b2d25a6e';
const done=(ok,x)=>{if(finished)return;finished=true;out.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(x)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const wait=async(fn,limit=18000,label='condition')=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(60)}throw Error('wait '+label)};
const W=()=>f.contentWindow,D=()=>W().document;
(async()=>{try{
  f.src='/prison-age/?root=1&return=field';
  await wait(()=>W().PrisonAgeSourceAPI?.snapshot?.()?.protoRoot?.source_hash===HASH,14000,'constellation root');
  const s0=W().PrisonAgeSourceAPI.snapshot();
  rec.threshold={brand:D().querySelector('.brand')?.textContent||'',root:D().getElementById('rootWord')?.textContent||'',signature:[...D().querySelectorAll('#signature i')].map(x=>x.textContent).join(''),story:s0.story?.id,rootId:s0.protoRoot?.id};
  if(!/SOURCE CONSTELLATION/.test(rec.threshold.brand)||rec.threshold.root!=='PRISON AGE'||rec.threshold.signature!=='AEGINOPRS'||rec.threshold.rootId!=='prison-age-2021')throw Error('constellation threshold');

  D().getElementById('rearrangeBtn').click();
  await wait(()=>W().PrisonAgeSourceAPI.snapshot().rootVariant==='s i n g a p o r e',1500,'root rearrange');
  rec.rearrange={variant:W().PrisonAgeSourceAPI.snapshot().rootVariant,word:D().getElementById('rootWord').textContent};
  if(rec.rearrange.word!=='s i n g a p o r e')throw Error('mechanical rearrangement projection');

  D().getElementById('rootRideBtn').click();
  await wait(()=>W().location.pathname==='/fold-bloom/live/'&&W().FoldBloomLive?.authored?.current?.()?.hash===HASH,18000,'root live');
  const authored=W().FoldBloomLive.authored.current(),read=W().FoldBloomLive.read.current();
  rec.rootRide={authority:authored.state.source.authority,hash:authored.hash,returnAddress:read.returnAddress,sourceQuick:D().getElementById('sourceQuick')?.textContent||'',recurrence:!D().getElementById('authoredReaderFrame').hidden};
  if(rec.rootRide.authority!=='RECOVERED_AUTHORED_SOURCE'||rec.rootRide.returnAddress!=='/prison-age/?root=1&return=field'||rec.rootRide.sourceQuick!=='PROVENANCE'||!rec.rootRide.recurrence)throw Error('root LIVE return/provenance contract');

  D().getElementById('readerReturnBtn').click();
  await wait(()=>!D().getElementById('readerReturn').hidden,2000,'root return overlay');
  D().getElementById('readerReturnSource').click();
  await wait(()=>W().location.pathname==='/prison-age/'&&new URL(W().location.href).searchParams.get('root')==='1',16000,'root source return');
  rec.rootReturn={path:W().location.pathname,root:new URL(W().location.href).searchParams.get('root'),field:new URL(W().location.href).searchParams.get('return'),rideReturn:new URL(W().location.href).searchParams.get('ride_return')};
  if(rec.rootReturn.field!=='field'||rec.rootReturn.rideReturn!=='1')throw Error('root exact source return');

  f.src='/prison-age/?intent=ride&return=field';
  await wait(()=>W().PrisonAgeSourceAPI?.snapshot?.()?.intent==='ride',12000,'movement ride chooser');
  const open=[...D().querySelectorAll('[data-story]')].find(x=>x.dataset.story==='open-air');if(!open)throw Error('open-air chooser absent');open.click();
  await wait(()=>W().location.pathname==='/fold-bloom/live/'&&W().FoldBloomLive?.read?.current?.()?.source?.authority==='PRISON_AGE',18000,'movement live');
  rec.movement={sourceQuick:D().getElementById('sourceQuick')?.textContent||'',authority:W().FoldBloomLive.read.current().source.authority,returnAddress:W().FoldBloomLive.read.current().returnAddress};
  if(rec.movement.sourceQuick!=='PRISON AGE / SOURCE'||rec.movement.returnAddress!=='/?focus=%2Fprison-age%2F')throw Error('movement LIVE source affordance');
  D().getElementById('sourceQuick').click();
  await wait(()=>W().location.pathname==='/prison-age/'&&new URL(W().location.href).searchParams.get('story')==='open-air',12000,'movement source re-entry');
  rec.movementSource={story:new URL(W().location.href).searchParams.get('story'),field:new URL(W().location.href).searchParams.get('return')};
  if(rec.movementSource.field!=='field')throw Error('movement source re-entry lost FIELD return');

  done(true,rec);
}catch(e){done(false,{...rec,error:String(e?.stack||e),href:(()=>{try{return W().location.href}catch(_){return null}})()})}})();
<\/script></body></html>`}
const server=http.createServer((req,res)=>{if(String(req.url||'').startsWith('/__probe')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(probe());return}const p=resolveFile(req.url);if(!p){res.writeHead(404);res.end('not found');return}res.writeHead(200,{'content-type':ct(p),'cache-control':'no-store'});fs.createReadStream(p).pipe(res)});
function run(bin){return new Promise((resolve,reject)=>{const a=['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--window-size=470,960','--virtual-time-budget=34000','--dump-dom','http://'+HOST+':'+PORT+'/__probe'];const p=spawn(bin,a,{stdio:['ignore','pipe','pipe']});let out='',err='';const tm=setTimeout(()=>{p.kill('SIGKILL');reject(Error('timeout'))},48000);p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',e=>{clearTimeout(tm);reject(e)});p.on('close',code=>{clearTimeout(tm);resolve({code,out,err})})})}
await new Promise((resolve,reject)=>server.listen(PORT,HOST,e=>e?reject(e):resolve()));PORT=server.address().port;
try{
 const r=await run(browserBin()),m=r.out.match(/id="probeResult"[^>]*>([\s\S]*?)<\/pre>/i),result=(m?.[1]||'').replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim(),fatal=/Uncaught (?:TypeError|ReferenceError|SyntaxError)|net::ERR_|Aw, Snap/i.test(r.err);
 if(r.code!==0||fatal||!result.startsWith('PASS ')){console.error('PRISON AGE CONSTELLATION SMOKE FAIL',result||'(no result)');if(r.err.trim())console.error(r.err.slice(-3600));process.exitCode=1}else console.log('PRISON AGE CONSTELLATION SMOKE PASS',result.slice(5));
}finally{await new Promise(r=>server.close(()=>r()))}
