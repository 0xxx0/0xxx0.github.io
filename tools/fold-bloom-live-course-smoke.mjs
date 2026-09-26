#!/usr/bin/env node
'use strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';

const ROOT=process.cwd(),HOST='127.0.0.1',PORT=41751;
function browserBin(){for(const n of ['google-chrome-stable','google-chrome','chromium-browser','chromium']){const r=spawnSync('which',[n],{encoding:'utf8'});if(r.status===0&&r.stdout.trim())return r.stdout.trim()}throw Error('No Chrome/Chromium')}
function ct(p){if(p.endsWith('.html'))return'text/html; charset=utf-8';if(p.endsWith('.js')||p.endsWith('.mjs'))return'text/javascript; charset=utf-8';if(p.endsWith('.json'))return'application/json; charset=utf-8';if(p.endsWith('.css'))return'text/css; charset=utf-8';if(p.endsWith('.mp3'))return'audio/mpeg';return'application/octet-stream'}
function resolveFile(url){let q=decodeURIComponent(String(url||'/').split('?')[0]).replace(/^\/+/, '');if(!q)q='index.html';if(q.endsWith('/'))q+='index.html';let p=path.normalize(path.join(ROOT,q));if(!p.startsWith(ROOT))return null;if(fs.existsSync(p)&&fs.statSync(p).isFile())return p;if(fs.existsSync(p+'.html'))return p+'.html';return null}
function probe(){return `<!doctype html><html><body style="margin:0"><iframe id="f" style="width:430px;height:900px;border:0" src="/fold-bloom/live/?source=example&profile=DRIVE"></iframe><pre id="probeResult">PENDING</pre><script>
const f=document.getElementById('f'),o=document.getElementById('probeResult'),rec={};let finished=false;
const done=(ok,data)=>{if(finished)return;finished=true;o.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(data)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const wait=async(fn,limit=18000,label='condition')=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(70)}throw Error('timeout '+label)};
(async()=>{const W=()=>f.contentWindow,D=()=>W().document;
 const api=await wait(()=>W().FoldBloomLive?.boot==='ready'&&W().FoldBloomLive,12000,'LIVE ready');
 await api.prepareExample();
 await wait(()=>api.course?.strip?.()?.duration>0,18000,'mapped public example');
 const audio=D().getElementById('trackAudio'),map=D().getElementById('courseMap'),back=D().getElementById('courseBack'),next=D().getElementById('courseNext'),mode=D().getElementById('courseMode'),grain=D().getElementById('courseGrain');
 audio.pause();audio.currentTime=0;
 api.course.setMode('STEP',false);
 const before=api.course.strip(),hit=api.course.step(1),after=api.course.strip();
 rec.before=before?.progress;rec.after=after?.progress;rec.hit=hit?.p;rec.paused=audio.paused;rec.mode=api.course.mode();rec.grain=api.course.grain();rec.address=api.course.address();rec.controls=!!map&&!!back&&!!next&&!!mode&&!!grain;rec.canvasW=map?.clientWidth||0;
 const r=map.getBoundingClientRect();map.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:r.left+r.width*.72,clientY:r.top+r.height/2,pointerId:7}));
 await sleep(120);rec.scrub=api.course.strip()?.progress;rec.scrubPaused=audio.paused;
 api.course.setMode('FLOW',false);rec.flow=api.course.mode();
 const pass=rec.controls&&rec.canvasW>180&&rec.mode==='STEP'&&rec.grain==='PHRASE'&&rec.paused&&rec.after>rec.before&&rec.address.startsWith('course://audio_map/')&&rec.scrub>.65&&rec.scrub<.8&&rec.scrubPaused&&rec.flow==='FLOW';
 done(pass,rec);
})().catch(e=>done(false,{...rec,error:String(e?.stack||e)}));
<\/script></body></html>`}
const server=http.createServer((req,res)=>{if(String(req.url||'').startsWith('/__probe')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(probe());return}const f=resolveFile(req.url);if(!f){res.writeHead(404);res.end('not found');return}res.writeHead(200,{'content-type':ct(f),'cache-control':'no-store'});fs.createReadStream(f).pipe(res)});
function run(bin){return new Promise((resolve,reject)=>{const a=['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required','--window-size=430,960','--virtual-time-budget=16000','--dump-dom','http://'+HOST+':'+PORT+'/__probe'];const p=spawn(bin,a,{stdio:['ignore','pipe','pipe']});let out='',err='';const tm=setTimeout(()=>{p.kill('SIGKILL');reject(Error('timeout'))},26000);p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',e=>{clearTimeout(tm);reject(e)});p.on('close',code=>{clearTimeout(tm);resolve({code,out,err})})})}
await new Promise((resolve,reject)=>server.listen(PORT,HOST,e=>e?reject(e):resolve()));
try{const r=await run(browserBin()),m=r.out.match(/id="probeResult"[^>]*>([\s\S]*?)<\/pre>/i),result=(m?.[1]||'').replace(/&quot;/g,'"').replace(/&amp;/g,'&').trim(),fatal=/Uncaught (?:TypeError|ReferenceError|SyntaxError)|net::ERR_|Aw, Snap/i.test(r.err);if(r.code!==0||fatal||!result.startsWith('PASS ')){console.error('LIVE COURSE SMOKE FAIL',result||'(no result)');if(r.err.trim())console.error(r.err.slice(-2200));process.exitCode=1}else console.log('LIVE COURSE SMOKE PASS',result.slice(5))}finally{await new Promise(r=>server.close(()=>r()))}
