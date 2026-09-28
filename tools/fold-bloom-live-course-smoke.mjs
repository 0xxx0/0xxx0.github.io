#!/usr/bin/env node
'use strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';

const ROOT=process.cwd(),HOST='127.0.0.1';let PORT=0;
function browserBin(){for(const n of ['google-chrome-stable','google-chrome','chromium-browser','chromium']){const r=spawnSync('which',[n],{encoding:'utf8'});if(r.status===0&&r.stdout.trim())return r.stdout.trim()}for(const p of ['/Applications/Brave Browser.app/Contents/MacOS/Brave Browser','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/Applications/Chromium.app/Contents/MacOS/Chromium']){if(fs.existsSync(p))return p}throw Error('No Chrome/Chromium')}
function ct(p){if(p.endsWith('.html'))return'text/html; charset=utf-8';if(p.endsWith('.js')||p.endsWith('.mjs'))return'text/javascript; charset=utf-8';if(p.endsWith('.json'))return'application/json; charset=utf-8';if(p.endsWith('.css'))return'text/css; charset=utf-8';if(p.endsWith('.mp3'))return'audio/mpeg';return'application/octet-stream'}
function resolveFile(url){let q=decodeURIComponent(String(url||'/').split('?')[0]).replace(/^\/+/, '');if(!q)q='index.html';if(q.endsWith('/'))q+='index.html';let p=path.normalize(path.join(ROOT,q));if(!p.startsWith(ROOT))return null;if(fs.existsSync(p)&&fs.statSync(p).isFile())return p;if(fs.existsSync(p+'.html'))return p+'.html';return null}
function probe(){return `<!doctype html><html><body style="margin:0"><iframe id="f" style="width:430px;height:900px;border:0" src="/fold-bloom/live/?profile=DRIVE"></iframe><pre id="probeResult">PENDING</pre><script>
const f=document.getElementById('f'),o=document.getElementById('probeResult'),rec={};let finished=false;
const done=(ok,data)=>{if(finished)return;finished=true;o.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(data)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const wait=async(fn,limit=12000,label='condition')=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(70)}throw Error('timeout '+label)};
(async()=>{const W=()=>f.contentWindow,D=()=>W().document;
 const api=await wait(()=>W().FoldBloomLive?.boot==='ready'&&W().FoldBloomLive,12000,'LIVE ready');
 const map=D().getElementById('courseMap'),back=D().getElementById('courseBack'),next=D().getElementById('courseNext'),mode=D().getElementById('courseMode'),grain=D().getElementById('courseGrain'),address=D().getElementById('courseAddress'),turnLeft=D().getElementById('turnLeft'),turnRight=D().getElementById('turnRight'),play=D().getElementById('playBtn');
 rec.playControls=!!turnLeft&&!!turnRight&&!!play&&play.textContent.includes('DRIVE FIELD');const rot0=api.state().rotation;turnLeft.click();await sleep(50);const rotL=api.state().rotation;turnRight.click();await sleep(50);const rotR=api.state().rotation;rec.turn=[rot0,rotL,rotR];rec.turnOK=rotL!==rot0&&rotR===rot0;
 const release=D().getElementById('releaseBtn'),history0=api.state().history.length;let turns=0;while(release.disabled&&turns<12){turnRight.click();turns++;await sleep(15)}rec.releaseFound=!release.disabled;rec.turnsToRelease=turns;rec.releaseLabel=release.textContent;if(rec.releaseFound){release.click();await sleep(80)}rec.historyDelta=api.state().history.length-history0;rec.playLoopOK=rec.releaseFound&&rec.historyDelta===1&&/BLOOM|FOLD|SPLIT|RETURN/.test(rec.releaseLabel);
 api.profile.apply('NORMAL',false);play.click();await sleep(120);rec.driveName=api.profile.name();rec.driveOK=rec.driveName==='DRIVE';
 D().getElementById('menuBtn').click();await wait(()=>map.clientWidth>180,3000,'drawer minimap visible');
 rec.controls=!!map&&!!back&&!!next&&!!mode&&!!grain&&!!address;rec.canvasW=map?.clientWidth||0;rec.initialMode=api.course.mode();rec.initialGrain=api.course.grain();
 api.course.setMode('STEP',false);rec.stepMode=api.course.mode();rec.stepText=mode.textContent;rec.address=api.course.address();rec.addressText=address.textContent;
 api.course.cycleGrain();rec.grain=api.course.grain();rec.grainText=grain.textContent;
 api.course.setMode('RELEASE_STEP',false);rec.releaseStep=api.course.mode();rec.releaseStepText=mode.textContent;rec.releasePolicy=D().documentElement.dataset.foldBloomCoursePolicy;rec.releaseLaw=D().getElementById('courseLaw')?.textContent||'';
 api.course.setMode('FLOW',false);rec.flow=api.course.mode();rec.flowText=mode.textContent;rec.flowPolicy=D().documentElement.dataset.foldBloomCoursePolicy;
 const pass=rec.playControls&&rec.turnOK&&rec.playLoopOK&&rec.driveOK&&rec.controls&&rec.canvasW>180&&rec.initialMode==='FLOW'&&rec.initialGrain==='PHRASE'&&rec.stepMode==='STEP'&&rec.stepText==='STEP'&&rec.address===null&&rec.addressText==='course://audio_map/empty'&&rec.grain==='SECTION'&&rec.grainText==='SECTION'&&rec.releaseStep==='RELEASE_STEP'&&rec.releaseStepText==='RELEASE→STEP'&&rec.releasePolicy==='RELEASE_THEN_ONE_ADDRESS'&&/advances exactly one SECTION address/.test(rec.releaseLaw)&&rec.flow==='FLOW'&&rec.flowText==='FLOW'&&rec.flowPolicy==='SOURCE_CLOCK';
 done(pass,rec);
})().catch(e=>done(false,{...rec,error:String(e?.stack||e)}));
<\/script></body></html>`}
const server=http.createServer((req,res)=>{if(String(req.url||'').startsWith('/__probe')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(probe());return}const f=resolveFile(req.url);if(!f){res.writeHead(404);res.end('not found');return}res.writeHead(200,{'content-type':ct(f),'cache-control':'no-store'});fs.createReadStream(f).pipe(res)});
function run(bin){return new Promise((resolve,reject)=>{const a=['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required','--window-size=430,960','--virtual-time-budget=12000','--dump-dom','http://'+HOST+':'+PORT+'/__probe'];const p=spawn(bin,a,{stdio:['ignore','pipe','pipe']});let out='',err='';const tm=setTimeout(()=>{p.kill('SIGKILL');reject(Error('timeout'))},22000);p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',e=>{clearTimeout(tm);reject(e)});p.on('close',code=>{clearTimeout(tm);resolve({code,out,err})})})}
await new Promise((resolve,reject)=>server.listen(PORT,HOST,e=>e?reject(e):resolve()));PORT=server.address().port;
try{const r=await run(browserBin()),m=r.out.match(/id="probeResult"[^>]*>([\s\S]*?)<\/pre>/i),result=(m?.[1]||'').replace(/&quot;/g,'"').replace(/&amp;/g,'&').trim(),fatal=/Uncaught (?:TypeError|ReferenceError|SyntaxError)|net::ERR_|Aw, Snap/i.test(r.err);if(r.code!==0||fatal||!result.startsWith('PASS ')){console.error('LIVE COURSE SMOKE FAIL',result||'(no result)');if(r.err.trim())console.error(r.err.slice(-2200));process.exitCode=1}else console.log('LIVE COURSE SMOKE PASS',result.slice(5))}finally{await new Promise(r=>server.close(()=>r()))}
