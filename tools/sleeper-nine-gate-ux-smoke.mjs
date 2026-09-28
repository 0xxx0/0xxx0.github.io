#!/usr/bin/env node
'use strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';

const ROOT=process.cwd(),HOST='127.0.0.1',PORT=41779;
function browserBin(){for(const n of ['google-chrome-stable','google-chrome','chromium-browser','chromium']){const r=spawnSync('which',[n],{encoding:'utf8'});if(r.status===0&&r.stdout.trim())return r.stdout.trim()}throw Error('No Chrome/Chromium')}
function ct(p){if(p.endsWith('.html'))return'text/html; charset=utf-8';if(p.endsWith('.js')||p.endsWith('.mjs'))return'text/javascript; charset=utf-8';if(p.endsWith('.json'))return'application/json; charset=utf-8';if(p.endsWith('.css'))return'text/css; charset=utf-8';return'application/octet-stream'}
function resolveFile(url){let q=decodeURIComponent(String(url||'/').split('?')[0]).replace(/^\/+/, '');if(!q)q='index.html';if(q.endsWith('/'))q+='index.html';const p=path.normalize(path.join(ROOT,q));if(!p.startsWith(ROOT))return null;if(fs.existsSync(p)&&fs.statSync(p).isFile())return p;if(fs.existsSync(p+'.html'))return p+'.html';return null}
function probe(){return `<!doctype html><html><body><iframe id="f" style="width:560px;height:980px;border:0"></iframe><pre id="probeResult">PENDING</pre><script>
const f=document.getElementById('f'),out=document.getElementById('probeResult'),rec={};let doneFlag=false;
const done=(ok,x)=>{if(doneFlag)return;doneFlag=true;out.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(x)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const wait=async(fn,limit=12000,label='condition')=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(50)}throw Error('wait '+label)};
const W=()=>f.contentWindow,D=()=>W().document;
(async()=>{try{
  f.src='/sleeper/one-return/';
  await wait(()=>W().OneReturnAPI?.snapshot&&D().getElementById('threshold'),16000,'boot');
  rec.threshold={visible:!D().getElementById('threshold').classList.contains('off'),title:D().querySelector('.thresholdTitle')?.textContent||''};
  if(!rec.threshold.visible||!/NINE GATES/.test(rec.threshold.title))throw Error('threshold not visible');
  D().getElementById('enterWorldBtn').click();
  rec.entered=D().getElementById('threshold').classList.contains('off');
  if(!rec.entered)throw Error('threshold did not close');

  const layout=D().getElementById('mainLayout'),ap=D().getElementById('apertureBtn');
  rec.aperture={closed:!layout.classList.contains('aperture-open')};
  ap.click();rec.aperture.open=layout.classList.contains('aperture-open');
  ap.click();rec.aperture.closedAgain=!layout.classList.contains('aperture-open');
  if(!rec.aperture.closed||!rec.aperture.open||!rec.aperture.closedAgain)throw Error('aperture toggle');

  const original=W().OneReturnAPI.snapshot(),synthetic=JSON.parse(JSON.stringify(original));
  synthetic.source=['ALPHA','BETA','GAMMA'];synthetic.adapter='succession';synthetic.x=2;synthetic.y=3;synthetic.nextGate=0;synthetic.steps=0;synthetic.trail=[];synthetic.events=[];synthetic.signal=0;synthetic.noise=0;synthetic.attempts=0;synthetic.correct=0;
  synthetic.gates=synthetic.gates.map((g,i)=>({...g,status:i===0?'current':'locked'}));
  synthetic.gates[0]={...synthetic.gates[0],x:3,y:3,line:'ALPHA',status:'current'};
  for(let y=1;y<=5;y++)for(let x=1;x<=5;x++)if(!(x===3&&y===3))synthetic.grid[y][x]=' ';
  synthetic.grid[3][3]='1';
  W().OneReturnAPI.importPacket({world:synthetic});
  await wait(()=>W().OneReturnAPI.snapshot().x===2&&W().OneReturnAPI.snapshot().y===3,3000,'synthetic gate world');
  const right=[...D().querySelectorAll('[data-move]')].find(b=>b.dataset.move==='1,0');right.click();
  await wait(()=>D().getElementById('challenge').classList.contains('on'),2000,'gate challenge');
  rec.gate={challenge:D().getElementById('challengePrompt').textContent,meta:D().getElementById('challengeMeta').textContent};
  D().getElementById('answer').value='BETA';D().getElementById('answerBtn').click();
  await wait(()=>W().OneReturnAPI.snapshot().nextGate===1,2000,'gate pass');
  const gateWorld=W().OneReturnAPI.snapshot();
  rec.gate.passed=gateWorld.gates[0].status==='done';
  rec.gate.signal=gateWorld.signal;
  rec.gate.omen=D().getElementById('omenTitle').textContent;
  rec.gate.phase=D().body.classList.contains('phase-gate-pass');
  rec.gate.horizonDone=D().querySelectorAll('#gateHorizon .done').length;
  if(!rec.gate.passed||rec.gate.signal!==3||rec.gate.horizonDone<1)throw Error('gate consequence missing');

  const complete=JSON.parse(JSON.stringify(gateWorld));
  complete.trail=[[1,1],[2,1],[3,1]];complete.x=3;complete.y=2;complete.steps=4;complete.nextGate=9;
  complete.gates=complete.gates.map(g=>({...g,status:'done'}));
  complete.events=[{id:'ev:0',type:'MOVE',step:1,at:new Date().toISOString(),x:2,y:1},{id:'ev:1',type:'WAIT',step:2,at:new Date().toISOString()},{id:'ev:2',type:'MOVE',step:3,at:new Date().toISOString(),x:3,y:1},{id:'ev:3',type:'MOVE',step:4,at:new Date().toISOString(),x:3,y:2}];
  complete.returnLedger=[];complete.routeWitnesses=[];complete.lastRouteWitness=null;complete.returns=0;complete.worldEpoch=0;complete.ghostTrail=[];complete.ghostMode='NONE';complete.compareBase=null;
  W().OneReturnAPI.importPacket({world:complete});
  D().getElementById('returnBtn').click();
  await wait(()=>D().getElementById('returnCeremony').classList.contains('on'),4000,'return ceremony');
  const postReturn=W().OneReturnAPI.snapshot(),rw=postReturn.lastRouteWitness;
  rec.return={ceremony:true,steps:D().getElementById('returnSteps').textContent,world:D().getElementById('returnWorld').textContent,route:D().getElementById('returnRoute').textContent,witness:rw?.schema||null};
  if(rw?.schema!=='sleeper.route-witness/v0.1')throw Error('return witness absent');

  D().getElementById('ceremonyCompareBtn').click();
  await wait(()=>W().OneReturnAPI.snapshot().ghostMode==='SAME_WORLD',4000,'same world');
  const theatre=D().getElementById('ghostTheatre'),play=D().getElementById('ghostPlayBtn'),scrub=D().getElementById('ghostScrub');
  if(!theatre.classList.contains('on'))throw Error('ghost theatre absent');
  const before=Number(scrub.value);play.click();await sleep(280);const after=Number(scrub.value);play.click();
  scrub.value=scrub.max;scrub.dispatchEvent(new Event('input',{bubbles:true}));await sleep(80);
  rec.ghost={theatre:true,before,after,scrubbed:Number(scrub.value),max:Number(scrub.max),readout:D().getElementById('ghostReadout').textContent,meta:D().getElementById('ghostMeta').textContent,phase:D().body.classList.contains('phase-compare'),glyph:D().getElementById('city').textContent.includes('¤')};
  if(!(after>before)||Number(scrub.value)!==Number(scrub.max)||!/GHOST · SAME WORLD/.test(rec.ghost.meta))throw Error('ghost temporal controls');
  done(true,rec);
}catch(e){done(false,{...rec,error:String(e?.stack||e)})}})();
<\/script></body></html>`}
const server=http.createServer((req,res)=>{if(String(req.url||'').startsWith('/__probe')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(probe());return}const p=resolveFile(req.url);if(!p){res.writeHead(404);res.end('not found');return}res.writeHead(200,{'content-type':ct(p),'cache-control':'no-store'});fs.createReadStream(p).pipe(res)});
function run(bin){return new Promise((resolve,reject)=>{const a=['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--window-size=600,1000','--virtual-time-budget=22000','--dump-dom','http://'+HOST+':'+PORT+'/__probe'];const p=spawn(bin,a,{stdio:['ignore','pipe','pipe']});let out='',err='';const tm=setTimeout(()=>{p.kill('SIGKILL');reject(Error('timeout'))},34000);p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',e=>{clearTimeout(tm);reject(e)});p.on('close',code=>{clearTimeout(tm);resolve({code,out,err})})})}
await new Promise((resolve,reject)=>server.listen(PORT,HOST,e=>e?reject(e):resolve()));
try{
 const r=await run(browserBin()),m=r.out.match(/id="probeResult"[^>]*>([\s\S]*?)<\/pre>/i),result=(m?.[1]||'').replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim(),fatal=/Uncaught (?:TypeError|ReferenceError|SyntaxError)|net::ERR_|Aw, Snap/i.test(r.err);
 if(r.code!==0||fatal||!result.startsWith('PASS ')){console.error('SLEEPER NINE GATE UX SMOKE FAIL',result||'(no result)');if(r.err.trim())console.error(r.err.slice(-3000));process.exitCode=1}else console.log('SLEEPER NINE GATE UX SMOKE PASS',result.slice(5));
}finally{await new Promise(r=>server.close(()=>r()))}
