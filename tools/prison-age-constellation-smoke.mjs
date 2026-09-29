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
const HASH='9b9be4ac4e24cb980d9f65bc948d6b3aaa9c514a84ee44a96142d526b2d25a6e';
const FULL='sha256:'+HASH;
const done=(ok,x)=>{if(finished)return;finished=true;out.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(x)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const wait=async(fn,limit=18000,label='condition')=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(60)}throw Error('wait '+label)};
const W=()=>f.contentWindow,D=()=>W().document;
(async()=>{try{
  f.src='/prison-age/';
  await wait(()=>W().PrisonAgeSourceAPI?.snapshot?.()?.root?.hash?.value===HASH,14000,'source constellation');
  const start=W().PrisonAgeSourceAPI.snapshot();
  rec.threshold={brand:D().querySelector('.brand')?.textContent||'',root:D().getElementById('rootWord')?.textContent||'',signature:[...D().querySelectorAll('#signature i')].map(x=>x.textContent).join(''),rootId:start.root?.id,story:start.story?.id,rootText:D().getElementById('rootExact')?.textContent||''};
  if(!/SOURCE CONSTELLATION/.test(rec.threshold.brand)||rec.threshold.root!=='PRISON AGE'||rec.threshold.signature!=='AEGINOPRS'||rec.threshold.rootId!=='proto-root-2021'||!/9 gate cities exist/.test(rec.threshold.rootText))throw Error('threshold/root identity');

  D().getElementById('rearrangeBtn').click();
  await wait(()=>W().PrisonAgeSourceAPI.snapshot().rootVariant==='s i n g a p o r e',1500,'root rearrange');
  rec.rearrange={variant:W().PrisonAgeSourceAPI.snapshot().rootVariant,word:D().getElementById('rootWord').textContent};
  if(rec.rearrange.word!=='s i n g a p o r e')throw Error('rearrangement projection');

  D().getElementById('rootRideBtn').click();
  await wait(()=>W().location.pathname==='/fold-bloom/live/'&&W().FoldBloomLive?.authored?.current?.()?.hash===FULL,18000,'root LIVE');
  const authored=W().FoldBloomLive.authored.current(),read=W().FoldBloomLive.read.current();
  rec.rootRide={authority:authored.state.source.authority,hash:authored.hash,returnAddress:read.returnAddress,sourceQuick:D().getElementById('sourceQuick')?.textContent||'',frame:!D().getElementById('authoredReaderFrame').hidden};
  if(rec.rootRide.authority!=='RECOVERED_AUTHORED_SOURCE'||rec.rootRide.returnAddress!=='/prison-age/?story=proto-root-2021'||rec.rootRide.sourceQuick!=='PROVENANCE'||!rec.rootRide.frame)throw Error('root LIVE authority/return');

  D().getElementById('readerReturnBtn').click();await wait(()=>!D().getElementById('readerReturn').hidden,2500,'root RETURN overlay');
  D().getElementById('readerReturnSource').click();
  await wait(()=>W().location.pathname==='/prison-age/'&&new URL(W().location.href).searchParams.get('story')==='proto-root-2021',16000,'root resolver return');
  rec.rootReturn={href:W().location.pathname+W().location.search,story:new URL(W().location.href).searchParams.get('story'),rideReturn:new URL(W().location.href).searchParams.get('ride_return'),root:W().PrisonAgeSourceAPI?.snapshot?.()?.root?.id};
  if(rec.rootReturn.rideReturn!=='1'||rec.rootReturn.root!=='proto-root-2021')throw Error('root exact re-entry');

  f.src='/prison-age/?intent=ride&return=field';
  await wait(()=>W().PrisonAgeSourceAPI?.snapshot?.()?.intent==='ride',12000,'movement chooser');
  const open=[...D().querySelectorAll('[data-story]')].find(x=>x.dataset.story==='open-air');if(!open)throw Error('open-air chooser absent');open.click();
  await wait(()=>W().location.pathname==='/fold-bloom/live/'&&W().FoldBloomLive?.read?.current?.()?.source?.authority==='PRISON_AGE',18000,'movement LIVE');
  const live=W().FoldBloomLive.read.current();
  rec.movement={id:live.source.id,authority:live.source.authority,returnAddress:live.returnAddress,sourceQuick:D().getElementById('sourceQuick')?.textContent||''};
  if(rec.movement.id!=='open-air'||rec.movement.sourceQuick!=='PRISON AGE / SOURCE'||rec.movement.returnAddress!=='/?focus=%2Fprison-age%2F')throw Error('movement source identity/affordance');
  D().getElementById('sourceQuick').click();
  await wait(()=>W().location.pathname==='/prison-age/'&&new URL(W().location.href).searchParams.get('story')==='open-air',12000,'movement source re-entry');
  rec.movementReturn={story:new URL(W().location.href).searchParams.get('story'),field:new URL(W().location.href).searchParams.get('return')};
  if(rec.movementReturn.field!=='field')throw Error('movement source return lost FIELD context');

  done(true,rec);
}catch(e){done(false,{...rec,error:String(e?.stack||e),href:(()=>{try{return W().location.href}catch(_){return null}})()})}})();
<\/script></body></html>`}
const server=http.createServer((req,res)=>{if(String(req.url||'').startsWith('/__probe')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(probe());return}const p=resolveFile(req.url);if(!p){res.writeHead(404);res.end('not found');return}res.writeHead(200,{'content-type':ct(p),'cache-control':'no-store'});fs.createReadStream(p).pipe(res)});
function run(bin){return new Promise((resolve,reject)=>{const a=['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--window-size=470,960','--virtual-time-budget=36000','--dump-dom','http://'+HOST+':'+PORT+'/__probe'];const p=spawn(bin,a,{stdio:['ignore','pipe','pipe']});let out='',err='';const tm=setTimeout(()=>{p.kill('SIGKILL');reject(Error('timeout'))},50000);p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',e=>{clearTimeout(tm);reject(e)});p.on('close',code=>{clearTimeout(tm);resolve({code,out,err})})})}
await new Promise((resolve,reject)=>server.listen(PORT,HOST,e=>e?reject(e):resolve()));PORT=server.address().port;
try{const r=await run(browserBin()),m=r.out.match(/id="probeResult"[^>]*>([\s\S]*?)<\/pre>/i),result=(m?.[1]||'').replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim(),fatal=/Uncaught (?:TypeError|ReferenceError|SyntaxError)|net::ERR_|Aw, Snap/i.test(r.err);if(r.code!==0||fatal||!result.startsWith('PASS ')){console.error('PRISON AGE CONSTELLATION SMOKE FAIL',result||'(no result)');if(r.err.trim())console.error(r.err.slice(-3600));process.exitCode=1}else console.log('PRISON AGE CONSTELLATION SMOKE PASS',result.slice(5))}finally{await new Promise(r=>server.close(()=>r()))}
