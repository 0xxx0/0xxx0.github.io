#!/usr/bin/env node
'use strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';

const ROOT=process.cwd(),HOST='127.0.0.1';let PORT=0;
function browserBin(){for(const n of ['google-chrome-stable','google-chrome','chromium-browser','chromium']){const r=spawnSync('which',[n],{encoding:'utf8'});if(r.status===0&&r.stdout.trim())return r.stdout.trim()}for(const p of ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/Applications/Brave Browser.app/Contents/MacOS/Brave Browser','/Applications/Chromium.app/Contents/MacOS/Chromium','/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge']){if(spawnSync('test',['-x',p]).status===0)return p}throw Error('No Chrome/Chromium — checked PATH and /Applications')}
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
   sourceIdentity:{hash:'sha256:'+'b'.repeat(64),kind:'LOCAL_DOCUMENT',format:'MD',authority:'READFIELD'},
   focus:{char_index:focus,source_progress:focus/source.length},from:'/docs/',returnAddress:'/docs/?local=1'
 }));
 const f=document.createElement('iframe');f.id='f';f.style='width:430px;height:900px;border:0;display:block';f.src='/fold-bloom/live/?source=readfield&course=STEP';document.body.prepend(f);
 const W=()=>f.contentWindow,D=()=>W().document;
 await wait(()=>D().documentElement.dataset.foldBloomReadRide==='ready'&&W().FoldBloomLive?.read?.current?.(),15000,'READ ride boot');
 const a=W().FoldBloomLive.read.current();rec.start={label:a.source.label,authority:a.source.authority,grain:a.course.grain,mode:a.course.mode,address:a.course.address,text:a.witness?.text,returnAddress:a.returnAddress,trail:a.trail};rec.handoffConsumed=!sessionStorage.getItem('fold-bloom.read-ride.handoff.v01');
 const mark=D().getElementById('readTrailMark');mark?.click();await sleep(80);const marked=W().FoldBloomLive.read.current();rec.mark={button:!!mark,count:marked.trail?.marks||0,law:marked.trail?.law||'',last:marked.trail?.last||null};
 const quick=D().getElementById('courseQuick');W().FoldBloomLive.course.setMode('RELEASE_STEP',false);W().FoldBloomLive.course.seek(0);await sleep(80);
 const releaseFrom=W().FoldBloomLive.read.current().course.address;let forecast=W().FoldBloomLive.forecast();for(let i=0;i<16&&!forecast;i++){W().FoldBloomLive.step(1);await sleep(25);forecast=W().FoldBloomLive.forecast()}
 if(!forecast)throw Error('no lawful release forecast');
 D().getElementById('releaseBtn').click();
 await wait(()=>W().FoldBloomLive.read.current()?.course?.address&&W().FoldBloomLive.read.current().course.address!==releaseFrom,15000,'release then paragraph step');
 const afterRelease=W().FoldBloomLive.read.current();rec.releaseStep={from:releaseFrom,to:afterRelease.course.address,mode:afterRelease.course.mode,quick:quick?.textContent||'',quickVisible:!!quick&&!quick.hidden,policy:D().documentElement.dataset.foldBloomCoursePolicy,law:D().getElementById('courseLaw')?.textContent||'',verb:forecast.verb};
 const manualFrom=afterRelease.course.address;W().FoldBloomLive.course.step(1);
 await wait(()=>W().FoldBloomLive.read.current()?.course?.address&&W().FoldBloomLive.read.current().course.address!==manualFrom,15000,'manual paragraph step preserves release mode');
 const b=W().FoldBloomLive.read.current();rec.step={address:b.course.address,text:b.witness?.text,progress:b.course.progress,mode:b.course.mode};
 W().FoldBloomLive.course.cycleGrain();await sleep(120);const g=W().FoldBloomLive.read.current();rec.grain={grain:g.course.grain,address:g.course.address,text:g.witness?.text,mode:g.course.mode};
 const file=new (W().File)(['# DIRECT\\n\\nAlpha direct.\\n\\nBeta direct.'],'direct.md',{type:'text/markdown'});
 await W().FoldBloomLive.read.loadFile(file);await wait(()=>W().FoldBloomLive.read.current()?.source?.label==='direct.md',15000,'direct file');
 const d=W().FoldBloomLive.read.current();rec.direct={id:d.source.id,label:d.source.label,authority:d.source.authority,kind:d.source.kind,grain:d.course.grain,address:d.course.address,text:d.witness?.text,trail:d.trail};
 const root=D().documentElement;rec.dataset={readRide:root.dataset.foldBloomReadRide,authority:root.dataset.foldBloomReadAuthority,courseKind:root.dataset.foldBloomCourseKind,courseMode:root.dataset.foldBloomCourseMode};
 rec.rawAbsent=!JSON.stringify(W().FoldBloomLive.state()).includes('Third paragraph after the second heading');
 const ok=rec.start.label==='BOOK TEST'&&rec.start.authority==='READFIELD'&&rec.start.mode==='STEP'&&rec.start.grain==='PARAGRAPH'&&String(rec.start.address).startsWith('read://')&&/Second paragraph/.test(rec.start.text||'')&&rec.handoffConsumed&&rec.start.trail?.schema==='field-source-trail/v0.1'&&rec.start.trail?.storageState==='READY'&&rec.mark.button&&rec.mark.count===1&&/never means read/i.test(rec.mark.law)&&rec.releaseStep.from!==rec.releaseStep.to&&rec.releaseStep.mode==='RELEASE_STEP'&&rec.releaseStep.quickVisible&&/RELEASE→STEP/.test(rec.releaseStep.quick)&&rec.releaseStep.policy==='RELEASE_THEN_ONE_ADDRESS'&&/advances exactly one PARAGRAPH address/.test(rec.releaseStep.law)&&rec.step.mode==='RELEASE_STEP'&&Number(b.trail?.furthest)>=Number(rec.start.trail?.furthest||0)&&rec.grain.grain==='SECTION'&&rec.grain.mode==='RELEASE_STEP'&&rec.direct.label==='direct.md'&&rec.direct.authority==='LOCAL_FILE'&&/^sha256:[a-f0-9]{64}$/.test(rec.direct.id||'')&&rec.direct.trail?.storageState==='READY'&&rec.direct.grain==='PARAGRAPH'&&rec.dataset.readRide==='ready'&&rec.dataset.courseKind==='READFIELD_TEXT'&&rec.dataset.courseMode==='STEP'&&rec.rawAbsent;
 done(ok,rec);
}catch(e){done(false,{...rec,error:String(e?.stack||e)})}})();
<\/script></body></html>`}
const server=http.createServer((req,res)=>{if(String(req.url||'').startsWith('/__probe')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(probe());return}const p=resolveFile(req.url);if(!p){res.writeHead(404);res.end('not found');return}res.writeHead(200,{'content-type':ct(p),'cache-control':'no-store'});fs.createReadStream(p).pipe(res)});
function run(bin){return new Promise((resolve,reject)=>{const a=['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--window-size=460,980','--virtual-time-budget=15000','--dump-dom','http://'+HOST+':'+PORT+'/__probe'];const p=spawn(bin,a,{stdio:['ignore','pipe','pipe']});let out='',err='';const tm=setTimeout(()=>{p.kill('SIGKILL');reject(Error('timeout'))},26000);p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',e=>{clearTimeout(tm);reject(e)});p.on('close',code=>{clearTimeout(tm);resolve({code,out,err})})})}
await new Promise((resolve,reject)=>server.listen(PORT,HOST,e=>e?reject(e):resolve()));PORT=server.address().port;
try{
 const r=await run(browserBin()),m=r.out.match(/id="probeResult"[^>]*>([\s\S]*?)<\/pre>/i),result=(m?.[1]||'').replace(/&quot;/g,'"').replace(/&amp;/g,'&').trim(),fatal=/Uncaught (?:TypeError|ReferenceError|SyntaxError)|net::ERR_|Aw, Snap/i.test(r.err);
 if(r.code!==0||fatal||!result.startsWith('PASS ')){console.error('LIVE READ-RIDE SMOKE FAIL',result||'(no result)');if(r.err.trim())console.error(r.err.slice(-2600));process.exitCode=1}
 else console.log('LIVE READ-RIDE SMOKE PASS',result.slice(5));
}finally{await new Promise(r=>server.close(()=>r()))}
