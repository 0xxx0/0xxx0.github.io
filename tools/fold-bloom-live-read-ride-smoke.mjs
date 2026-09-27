#!/usr/bin/env node
'use strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';

const ROOT=process.cwd(),HOST='127.0.0.1',PORT=41764;
function browserBin(){for(const n of ['google-chrome-stable','google-chrome','chromium-browser','chromium']){const r=spawnSync('which',[n],{encoding:'utf8'});if(r.status===0&&r.stdout.trim())return r.stdout.trim()}throw Error('No Chrome/Chromium')}
function ct(p){if(p.endsWith('.html'))return'text/html; charset=utf-8';if(p.endsWith('.js')||p.endsWith('.mjs'))return'text/javascript; charset=utf-8';if(p.endsWith('.json'))return'application/json; charset=utf-8';if(p.endsWith('.css'))return'text/css; charset=utf-8';return'application/octet-stream'}
function resolveFile(url){let q=decodeURIComponent(String(url||'/').split('?')[0]).replace(/^\/+/, '');if(!q)q='index.html';if(q.endsWith('/'))q+='index.html';const p=path.normalize(path.join(ROOT,q));if(!p.startsWith(ROOT))return null;if(fs.existsSync(p)&&fs.statSync(p).isFile())return p;if(fs.existsSync(p+'.html'))return p+'.html';return null}
function probe(){return `<!doctype html><html><body style="margin:0"><pre id="probeResult">PENDING</pre><script>
const out=document.getElementById('probeResult'),rec={};let doneFlag=false;
const done=(ok,x)=>{if(doneFlag)return;doneFlag=true;out.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(x)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const wait=async(fn,limit=15000,label='condition')=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(60)}throw Error('wait '+label)};
(async()=>{try{
 const source='# ONE\\n\\nOpening paragraph.\\n\\nSecond paragraph carries the cursor target.\\n\\n## TWO\\n\\nThird paragraph after the second heading.';
 const focus=source.indexOf('Second paragraph');
 sessionStorage.setItem('fold-bloom.read-ride.handoff.v01',JSON.stringify({
   schema:'field-read-ride/v0.1',created:new Date().toISOString(),source,label:'BOOK TEST',
   sourceIdentity:{hash:'sha256:book-test',kind:'LOCAL_DOCUMENT',format:'MD',authority:'READFIELD'},
   focus:{char_index:focus,source_progress:focus/source.length},from:'/docs/',returnAddress:'/docs/?local=1'
 }));
 const f=document.createElement('iframe');f.id='f';f.style='width:430px;height:900px;border:0;display:block';f.src='/fold-bloom/live/?source=readfield&course=STEP';document.body.prepend(f);
 const W=()=>f.contentWindow,D=()=>W().document;
 await wait(()=>D().documentElement.dataset.foldBloomReadRide==='ready'&&W().FoldBloomLive?.read?.current?.(),15000,'READ ride boot');
 const a=W().FoldBloomLive.read.current();rec.start={label:a.source.label,authority:a.source.authority,grain:a.course.grain,mode:a.course.mode,address:a.course.address,text:a.witness?.text,returnAddress:a.returnAddress};rec.handoffConsumed=!sessionStorage.getItem('fold-bloom.read-ride.handoff.v01');
 const startAddress=a.course.address;W().FoldBloomLive.course.step(1);
 await wait(()=>W().FoldBloomLive.read.current()?.course?.address&&W().FoldBloomLive.read.current().course.address!==startAddress,15000,'paragraph step');
 const b=W().FoldBloomLive.read.current();rec.step={address:b.course.address,text:b.witness?.text,progress:b.course.progress};
 W().FoldBloomLive.course.cycleGrain();await sleep(120);const g=W().FoldBloomLive.read.current();rec.grain={grain:g.course.grain,address:g.course.address,text:g.witness?.text};
 const file=new (W().File)(['# DIRECT\\n\\nAlpha direct.\\n\\nBeta direct.'],'direct.md',{type:'text/markdown'});
 await W().FoldBloomLive.read.loadFile(file);await wait(()=>W().FoldBloomLive.read.current()?.source?.label==='direct.md',15000,'direct file');
 const d=W().FoldBloomLive.read.current();rec.direct={label:d.source.label,authority:d.source.authority,kind:d.source.kind,grain:d.course.grain,address:d.course.address,text:d.witness?.text};
 const root=D().documentElement;rec.dataset={readRide:root.dataset.foldBloomReadRide,authority:root.dataset.foldBloomReadAuthority,courseKind:root.dataset.foldBloomCourseKind,courseMode:root.dataset.foldBloomCourseMode};
 rec.rawAbsent=!JSON.stringify(W().FoldBloomLive.state()).includes('Third paragraph after the second heading');
 const ok=rec.start.label==='BOOK TEST'&&rec.start.authority==='READFIELD'&&rec.start.mode==='STEP'&&rec.start.grain==='PARAGRAPH'&&String(rec.start.address).startsWith('read://')&&/Second paragraph/.test(rec.start.text||'')&&rec.handoffConsumed&&rec.step.address!==rec.start.address&&rec.grain.grain==='SECTION'&&rec.direct.label==='direct.md'&&rec.direct.authority==='LOCAL_FILE'&&rec.direct.grain==='PARAGRAPH'&&rec.dataset.readRide==='ready'&&rec.dataset.courseKind==='READFIELD_TEXT'&&rec.dataset.courseMode==='STEP'&&rec.rawAbsent;
 done(ok,rec);
}catch(e){done(false,{...rec,error:String(e?.stack||e)})}})();
<\/script></body></html>`}
const server=http.createServer((req,res)=>{if(String(req.url||'').startsWith('/__probe')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(probe());return}const p=resolveFile(req.url);if(!p){res.writeHead(404);res.end('not found');return}res.writeHead(200,{'content-type':ct(p),'cache-control':'no-store'});fs.createReadStream(p).pipe(res)});
function run(bin){return new Promise((resolve,reject)=>{const a=['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--window-size=460,980','--virtual-time-budget=15000','--dump-dom','http://'+HOST+':'+PORT+'/__probe'];const p=spawn(bin,a,{stdio:['ignore','pipe','pipe']});let out='',err='';const tm=setTimeout(()=>{p.kill('SIGKILL');reject(Error('timeout'))},26000);p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',e=>{clearTimeout(tm);reject(e)});p.on('close',code=>{clearTimeout(tm);resolve({code,out,err})})})}
await new Promise((resolve,reject)=>server.listen(PORT,HOST,e=>e?reject(e):resolve()));
try{
 const r=await run(browserBin()),m=r.out.match(/id="probeResult"[^>]*>([\s\S]*?)<\/pre>/i),result=(m?.[1]||'').replace(/&quot;/g,'"').replace(/&amp;/g,'&').trim(),fatal=/Uncaught (?:TypeError|ReferenceError|SyntaxError)|net::ERR_|Aw, Snap/i.test(r.err);
 if(r.code!==0||fatal||!result.startsWith('PASS ')){console.error('LIVE READ-RIDE SMOKE FAIL',result||'(no result)');if(r.err.trim())console.error(r.err.slice(-2600));process.exitCode=1}
 else console.log('LIVE READ-RIDE SMOKE PASS',result.slice(5));
}finally{await new Promise(r=>server.close(()=>r()))}
