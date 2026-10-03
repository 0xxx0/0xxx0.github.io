#!/usr/bin/env node
'use strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {browserBin} from './browser-bin.mjs';

const ROOT=process.cwd(),HOST='127.0.0.1';let PORT=0;
function ct(p){if(p.endsWith('.html'))return'text/html; charset=utf-8';if(p.endsWith('.js')||p.endsWith('.mjs'))return'text/javascript; charset=utf-8';if(p.endsWith('.json'))return'application/json; charset=utf-8';if(p.endsWith('.md')||p.endsWith('.txt'))return'text/plain; charset=utf-8';if(p.endsWith('.css'))return'text/css; charset=utf-8';return'application/octet-stream'}
function resolveFile(url){let q=decodeURIComponent(String(url||'/').split('?')[0]).replace(/^\/+/, '');if(!q)q='index.html';if(q.endsWith('/'))q+='index.html';const p=path.normalize(path.join(ROOT,q));if(!p.startsWith(ROOT))return null;if(fs.existsSync(p)&&fs.statSync(p).isFile())return p;if(fs.existsSync(p+'.html'))return p+'.html';return null}
function probe(){return `<!doctype html><html><body><iframe id="f" style="width:460px;height:940px;border:0"></iframe><pre id="probeResult">PENDING</pre><script>
const f=document.getElementById('f'),out=document.getElementById('probeResult'),rec={};let finished=false;
const done=(ok,x)=>{if(finished)return;finished=true;out.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(x)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const wait=async(fn,limit=20000,label='condition')=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(60)}throw Error('wait '+label)};
const W=()=>f.contentWindow,D=()=>W().document;
(async()=>{try{
  const readUrl='/docs/?src=%2Fprison-age%2Fstories%2F08-successful-escape.md&return=%2F%3Ffocus%3D%252Fprison-age%252F&ap_scale=SENT&ap_char=344&echo=%2Fprison-age%2Fecho-index.json&echo_source=successful-escape';
  f.src=readUrl;
  await wait(()=>D().documentElement.dataset.readfieldEcho==='shown',18000,'READFIELD echo');
  const link=D().getElementById('sourceEchoLink'),basis=D().getElementById('sourceEchoBasis'),snap=W().document.getElementById('docAperture')?.snapshot?.();
  rec.read={focus:snap?.focus||'',scale:snap?.scale||'',echo:link?.textContent||'',href:link?.getAttribute('href')||'',basis:basis?.textContent||'',state:D().documentElement.dataset.readfieldEcho,source:D().documentElement.dataset.readfieldEchoSource};
  if(!/door/i.test(rec.read.echo)||!/exact fragment · evidence only/i.test(rec.read.basis)||rec.read.source==='successful-escape')throw Error('READFIELD echo evidence');

  D().getElementById('rideLive').click();
  await wait(()=>W().location.pathname==='/fold-bloom/live/'&&W().FoldBloomLive?.read?.current?.(),18000,'READ→RIDE LIVE');
  W().FoldBloomLive.course.cycleGrain();W().FoldBloomLive.course.cycleGrain();W().FoldBloomLive.course.seek(344/3674);
  await wait(()=>D().documentElement.dataset.foldBloomSourceEcho==='shown',12000,'LIVE echo');
  const live=W().FoldBloomLive.read.current(),lLink=D().getElementById('sourceEchoLiveLink'),lBasis=D().getElementById('sourceEchoLiveBasis');
  rec.ride={
    authority:live.source?.authority,source:live.source?.address||'',returnAddress:live.returnAddress,
    witness:live.witness?.text||'',echo:lLink?.textContent||'',basis:lBasis?.textContent||'',
    echoState:D().documentElement.dataset.foldBloomSourceEcho,echoSource:D().documentElement.dataset.foldBloomSourceEchoSource
  };
  const rideReturn=new URL(rec.ride.returnAddress,location.origin);const nestedReturn=rideReturn.searchParams.get('return');
  if(rec.ride.authority!=='READFIELD'||rideReturn.pathname!=='/docs/'||rideReturn.searchParams.get('src')!=='/prison-age/stories/08-successful-escape.md'||nestedReturn!=='/?focus=%2Fprison-age%2F'||!/open door/i.test(rec.ride.witness)||!/maintenance door/i.test(rec.ride.echo)||!/evidence only/i.test(rec.ride.basis)||rec.ride.echoSource==='successful-escape')throw Error('LIVE echo carry/return');

  const idx=await fetch('/prison-age/echo-index.json').then(r=>r.json()),raw=await fetch('/prison-age/stories/08-successful-escape.md').then(r=>r.text());
  rec.truth={valid:W().FieldSourceEcho?.sourceValid?.(idx,{sourceId:'successful-escape',text:raw}),stale:W().FieldSourceEcho?.sourceValid?.(idx,{sourceId:'successful-escape',text:raw+'x'}),silent:W().FieldSourceEcho?.rank?.(idx,{sourceId:'successful-escape',text:'quasar plutonium xylophone'}).length};
  if(rec.truth.valid!==true||rec.truth.stale!==false||rec.truth.silent!==0)throw Error('echo truth boundary');

  done(true,rec);
}catch(e){done(false,{...rec,error:String(e?.stack||e),href:(()=>{try{return W().location.href}catch(_){return null}})()})}})();
<\/script></body></html>`}
const server=http.createServer((req,res)=>{if(String(req.url||'').startsWith('/__probe')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(probe());return}const p=resolveFile(req.url);if(!p){res.writeHead(404);res.end('not found');return}res.writeHead(200,{'content-type':ct(p),'cache-control':'no-store'});fs.createReadStream(p).pipe(res)});
function run(bin){return new Promise((resolve,reject)=>{const a=['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--window-size=490,980','--virtual-time-budget=32000','--dump-dom','http://'+HOST+':'+PORT+'/__probe'];const p=spawn(bin,a,{stdio:['ignore','pipe','pipe']});let out='',err='';const tm=setTimeout(()=>{p.kill('SIGKILL');reject(Error('timeout'))},45000);p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',e=>{clearTimeout(tm);reject(e)});p.on('close',code=>{clearTimeout(tm);resolve({code,out,err})})})}
await new Promise((resolve,reject)=>server.listen(PORT,HOST,e=>e?reject(e):resolve()));PORT=server.address().port;
try{
 const r=await run(browserBin()),m=r.out.match(/id="probeResult"[^>]*>([\s\S]*?)<\/pre>/i),result=(m?.[1]||'').replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim(),fatal=/Uncaught (?:TypeError|ReferenceError|SyntaxError)|net::ERR_|Aw, Snap/i.test(r.err);
 if(r.code!==0||fatal||!result.startsWith('PASS ')){console.error('SOURCE ECHO READ→RIDE SMOKE FAIL',result||'(no result)');if(r.err.trim())console.error(r.err.slice(-4200));process.exitCode=1}else console.log('SOURCE ECHO READ→RIDE SMOKE PASS',result.slice(5));
}finally{await new Promise(r=>server.close(()=>r()))}
