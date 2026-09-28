#!/usr/bin/env node
'use strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';

const ROOT=process.cwd(),HOST='127.0.0.1';let PORT=0;
function browserBin(){for(const n of ['google-chrome-stable','google-chrome','chromium-browser','chromium']){const r=spawnSync('which',[n],{encoding:'utf8'});if(r.status===0&&r.stdout.trim())return r.stdout.trim()}for(const p of ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/Applications/Brave Browser.app/Contents/MacOS/Brave Browser','/Applications/Chromium.app/Contents/MacOS/Chromium','/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge']){if(spawnSync('test',['-x',p]).status===0)return p}throw Error('No Chrome/Chromium — checked PATH and /Applications')}
function ct(p){if(p.endsWith('.html'))return'text/html; charset=utf-8';if(p.endsWith('.js')||p.endsWith('.mjs'))return'text/javascript; charset=utf-8';if(p.endsWith('.json'))return'application/json; charset=utf-8';if(p.endsWith('.css'))return'text/css; charset=utf-8';if(p.endsWith('.mp3'))return'audio/mpeg';return'application/octet-stream'}
function resolveFile(url){let q=decodeURIComponent(String(url||'/').split('?')[0]).replace(/^\/+/, '');if(!q)q='index.html';if(q.endsWith('/'))q+='index.html';let p=path.normalize(path.join(ROOT,q));if(!p.startsWith(ROOT))return null;if(fs.existsSync(p)&&fs.statSync(p).isFile())return p;if(fs.existsSync(p+'.html'))return p+'.html';return null}
function probe(){return `<!doctype html><html><body><iframe id="f" style="width:430px;height:900px;border:0" src="/fold-bloom/live/"></iframe><pre id="probeResult">PENDING</pre><script>
const f=document.getElementById('f'),o=document.getElementById('probeResult'),rec={};let finished=false;
const done=(ok,data)=>{if(finished)return;finished=true;o.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(data)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const wait=async(fn,limit=14000,label='condition')=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(70)}throw Error('timeout '+label)};
(async()=>{
 const W=()=>f.contentWindow,D=()=>W().document;
 const api=await wait(()=>W().FoldBloomLive?.boot==='ready'&&W().FoldBloomLive,14000,'LIVE ready');
 api.autopilot.stop();await sleep(120);
 const before=api.steering.context(),verb=before.forecasts?.[0]?.verb;
 if(!verb)throw Error('no native forecasts');
 const expected=before.forecasts.filter(x=>x.verb===verb).length,beforeJson=JSON.stringify(before);
 const view=api.steering.preview(verb);await sleep(80);
 const during=api.steering.current(),status=D().getElementById('status')?.textContent||'',dataset=D().documentElement.dataset.foldBloomSteering,calc=api.calculus?.(),calcLens=D().getElementById('calcSteering')?.textContent||'';
 const afterJson=JSON.stringify(api.steering.context());
 rec.verb=verb;rec.expected=expected;rec.count=view?.candidate_count;rec.authority=view?.authority;rec.commit=view?.commit_operation;rec.status=status;rec.dataset=dataset;rec.same=beforeJson===afterJson;
 const nearest=view?.candidates?.find?.(x=>Number(x.turn_steps)===Number(view?.nearest_turn_steps));
 rec.path={steps:view?.nearest_turn_steps,slots:view?.nearest_slots,delta:nearest?.turn_delta,direction:nearest?.turn_direction,candidates:view?.candidates?.map(x=>({slot:x.slot,delta:x.turn_delta,steps:x.turn_steps,direction:x.turn_direction}))};
 rec.calc={schema:calc?.schema,authority:calc?.authority,nativeAuthority:calc?.native?.authority,steeringAuthority:calc?.steering?.authority,count:calc?.steering?.native_candidate_count,nearestSteps:calc?.steering?.nearest_turn_steps,nearestDelta:calc?.steering?.nearest_turn_delta,nearestDirection:calc?.steering?.nearest_turn_direction,nearestSlots:calc?.steering?.nearest_slots,commit:calc?.steering?.commit_operation,lens:calcLens};
 api.steering.clear();await sleep(60);
 const clearedCalc=api.calculus?.();
 rec.cleared=api.steering.current()===null&&D().documentElement.dataset.foldBloomSteering==='off'&&!String(D().getElementById('status')?.textContent||'').includes('LENS ')&&clearedCalc?.steering===null;
 const pass=!!view?.ok&&view.authority==='PREVIEW'&&view.commit_operation===null&&view.candidate_count===expected&&during?.verb===verb&&Number.isInteger(rec.path.steps)&&rec.path.steps>=0&&rec.path.steps<=6&&Array.isArray(rec.path.slots)&&rec.path.slots.length>0&&['LEFT','RIGHT','HERE'].includes(rec.path.direction)&&rec.path.candidates.every(x=>Number.isInteger(x.delta)&&x.steps===Math.abs(x.delta)&&x.steps<=6&&['LEFT','RIGHT','HERE'].includes(x.direction))&&status.includes('LENS '+verb+' · '+expected+'/'+before.forecasts.length)&&status.includes('GHOST '+rec.path.direction+'×'+rec.path.steps)&&dataset===verb.toLowerCase()&&rec.same&&rec.calc.schema==='fold-bloom-live-calculus/v0.1'&&rec.calc.authority==='WITNESS_ONLY'&&rec.calc.nativeAuthority==='NATIVE_EVIDENCE'&&rec.calc.steeringAuthority==='PREVIEW_ONLY'&&rec.calc.count===expected&&rec.calc.nearestSteps===rec.path.steps&&rec.calc.nearestDelta===rec.path.delta&&rec.calc.nearestDirection===rec.path.direction&&JSON.stringify(rec.calc.nearestSlots)===JSON.stringify(rec.path.slots)&&rec.calc.commit===null&&calcLens.includes(verb+' · '+expected+'/'+before.forecasts.length+' native candidates')&&calcLens.includes('GHOST '+rec.path.direction+'×'+rec.path.steps)&&rec.cleared;
 done(pass,rec);
})().catch(e=>done(false,{...rec,error:String(e?.stack||e)}));
<\/script></body></html>`}
const server=http.createServer((req,res)=>{if(String(req.url||'').startsWith('/__probe')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(probe());return}const f=resolveFile(req.url);if(!f){res.writeHead(404);res.end('not found');return}res.writeHead(200,{'content-type':ct(f),'cache-control':'no-store'});fs.createReadStream(f).pipe(res)});
function run(bin){return new Promise((resolve,reject)=>{const a=['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required','--window-size=430,960','--virtual-time-budget=12000','--dump-dom','http://'+HOST+':'+PORT+'/__probe'];const p=spawn(bin,a,{stdio:['ignore','pipe','pipe']});let out='',err='';const tm=setTimeout(()=>{p.kill('SIGKILL');reject(Error('timeout'))},24000);p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',e=>{clearTimeout(tm);reject(e)});p.on('close',code=>{clearTimeout(tm);resolve({code,out,err})})})}
await new Promise((resolve,reject)=>server.listen(PORT,HOST,e=>e?reject(e):resolve()));PORT=server.address().port;
try{const r=await run(browserBin()),m=r.out.match(/id="probeResult"[^>]*>([\s\S]*?)<\/pre>/i),result=(m?.[1]||'').replace(/&quot;/g,'"').replace(/&amp;/g,'&').trim(),fatal=/Uncaught (?:TypeError|ReferenceError|SyntaxError)|net::ERR_|Aw, Snap/i.test(r.err);if(r.code!==0||fatal||!result.startsWith('PASS ')){console.error('LIVE STEERING SMOKE FAIL',result||'(no result)');if(r.err.trim())console.error(r.err.slice(-2200));process.exitCode=1}else console.log('LIVE STEERING SMOKE PASS',result.slice(5))}finally{await new Promise(r=>server.close(()=>r()))}
