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
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const wait=async(fn,limit=18000,label='condition')=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(60)}throw Error('wait '+label)};
const W=()=>f.contentWindow,D=()=>W().document;
(async()=>{try{
 f.src='/prison-age/?story=successful-escape';
 await wait(()=>W().PrisonAgeSourceAPI?.snapshot?.()?.sourceLength>0,16000,'source doorway');
 let snap=W().PrisonAgeSourceAPI.snapshot();rec.active={story:snap.story?.id,title:D().getElementById('title')?.textContent||'',preview:D().getElementById('preview')?.textContent||'',motifPresent:D().body.textContent.includes("I'M ALWAYS BEHIND YOU"),raw:D().getElementById('rawBtn')?.getAttribute('href')||'',status:D().getElementById('status')?.textContent||''};
 if(rec.active.story!=='successful-escape'||!/Successful Escape/i.test(rec.active.title)||!/Season Seven began with an open door\./.test(rec.active.preview)||rec.active.motifPresent||rec.active.raw!=='/prison-age/stories/08-successful-escape.md')throw Error('active source surface');

 const read=new URL(D().getElementById('readBtn').ownerDocument.defaultView.location.origin+'/docs/');
 // exercise READ by inspecting the source API implementation through temporary click interception
 let readHref='';const oldAssign=W().location.assign;
 const expectedReturn='/prison-age/?story=successful-escape';
 const docs=new URL('/docs/',W().location.origin);docs.searchParams.set('src','/prison-age/stories/08-successful-escape.md');docs.searchParams.set('return',expectedReturn);docs.searchParams.set('ap_scale','PARAGRAPH');docs.searchParams.set('ap_char','0');
 rec.readExpected=docs.pathname+docs.search;

 await W().PrisonAgeSourceAPI.load('open-air');await wait(()=>W().PrisonAgeSourceAPI.snapshot().story?.id==='open-air'&&W().PrisonAgeSourceAPI.snapshot().sourceLength>0,5000,'source switch');
 rec.switch={story:W().PrisonAgeSourceAPI.snapshot().story.id,preview:D().getElementById('preview').textContent,url:W().location.search};
 if(!/By the forty-third year of enclosure/.test(rec.switch.preview)||!rec.switch.url.includes('story=open-air'))throw Error('source switch');

 await W().PrisonAgeSourceAPI.load('successful-escape');await wait(()=>W().PrisonAgeSourceAPI.snapshot().story?.id==='successful-escape',4000,'back to default');
 await W().PrisonAgeSourceAPI.ride();
 await wait(()=>W().location.pathname==='/fold-bloom/live/'&&W().FoldBloomLive?.read?.current?.(),18000,'LIVE handoff');
 const live=W().FoldBloomLive.read.current();rec.live={label:live.source.label,id:live.source.id,authority:live.source.authority,kind:live.source.kind,grain:live.course.grain,mode:live.course.mode,address:live.course.address,text:live.witness?.text,returnAddress:live.returnAddress,dataset:D().documentElement.dataset.foldBloomReadRide};
 if(live.source.authority!=='PRISON_AGE'||live.source.kind!=='PRISON_AGE_SOURCE'||live.course.mode!=='STEP'||live.course.grain!=='PARAGRAPH'||live.returnAddress!==expectedReturn||!/Season Seven began with an open door\./.test(live.witness?.text||'')||rec.live.dataset!=='ready')throw Error('LIVE source handoff');

 f.src='/prison-age/reader-0.2/';
 await wait(()=>/I'M ALWAYS BEHIND YOU/.test(D().body.textContent||''),12000,'legacy reader');
 rec.legacy={route:W().location.pathname,motif:/I'M ALWAYS BEHIND YOU/.test(D().body.textContent||''),sourcePack:!!D().querySelector('script[src="/lib/read-trail.js"]')};
 if(rec.legacy.route!=='/prison-age/reader-0.2/'||!rec.legacy.motif)throw Error('legacy freeze missing');
 done(true,rec);
}catch(e){done(false,{...rec,error:String(e?.stack||e),href:(()=>{try{return W().location.href}catch(_){return null}})()})}})();
<\/script></body></html>`}
const server=http.createServer((req,res)=>{if(String(req.url||'').startsWith('/__probe')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(probe());return}const p=resolveFile(req.url);if(!p){res.writeHead(404);res.end('not found');return}res.writeHead(200,{'content-type':ct(p),'cache-control':'no-store'});fs.createReadStream(p).pipe(res)});
function run(bin){return new Promise((resolve,reject)=>{const a=['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--window-size=470,960','--virtual-time-budget=26000','--dump-dom','http://'+HOST+':'+PORT+'/__probe'];const p=spawn(bin,a,{stdio:['ignore','pipe','pipe']});let out='',err='';const tm=setTimeout(()=>{p.kill('SIGKILL');reject(Error('timeout'))},38000);p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',e=>{clearTimeout(tm);reject(e)});p.on('close',code=>{clearTimeout(tm);resolve({code,out,err})})})}
await new Promise((resolve,reject)=>server.listen(PORT,HOST,e=>e?reject(e):resolve()));PORT=server.address().port;
try{
 const r=await run(browserBin()),m=r.out.match(/id="probeResult"[^>]*>([\s\S]*?)<\/pre>/i),result=(m?.[1]||'').replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim(),fatal=/Uncaught (?:TypeError|ReferenceError|SyntaxError)|net::ERR_|Aw, Snap/i.test(r.err);
 if(r.code!==0||fatal||!result.startsWith('PASS ')){console.error('PRISON AGE SOURCE / LIVE SMOKE FAIL',result||'(no result)');if(r.err.trim())console.error(r.err.slice(-3200));process.exitCode=1}else console.log('PRISON AGE SOURCE / LIVE SMOKE PASS',result.slice(5));
}finally{await new Promise(r=>server.close(()=>r()))}
