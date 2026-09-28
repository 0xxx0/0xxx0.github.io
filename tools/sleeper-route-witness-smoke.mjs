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
function probe(){return `<!doctype html><html><body style="margin:0"><iframe id="f" style="width:520px;height:940px;border:0;display:block"></iframe><pre id="probeResult">PENDING</pre><script>
const f=document.getElementById('f'),out=document.getElementById('probeResult'),rec={};let doneFlag=false;
const done=(ok,x)=>{if(doneFlag)return;doneFlag=true;out.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(x)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const wait=async(fn,limit=16000,label='condition')=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(60)}throw Error('wait '+label)};
const W=()=>f.contentWindow,D=()=>W().document;
(async()=>{try{
  f.src='/sleeper/one-return/';
  await wait(()=>W().OneReturnAPI?.snapshot&&W().SleeperRouteWitness,16000,'donor boot');
  const original=W().OneReturnAPI.snapshot(),originalGrid=JSON.stringify(original.grid);
  const synthetic=JSON.parse(JSON.stringify(original));
  synthetic.trail=[[1,1],[2,1],[3,1]];
  synthetic.x=3;synthetic.y=2;synthetic.steps=4;synthetic.nextGate=9;
  synthetic.gates=synthetic.gates.map(g=>({...g,status:'done'}));
  synthetic.events=[{id:'ev:0',type:'MOVE',step:1,at:new Date().toISOString(),x:2,y:1},{id:'ev:1',type:'WAIT',step:2,at:new Date().toISOString()},{id:'ev:2',type:'MOVE',step:3,at:new Date().toISOString(),x:3,y:1},{id:'ev:3',type:'MOVE',step:4,at:new Date().toISOString(),x:3,y:2}];
  synthetic.returnLedger=[];synthetic.routeWitnesses=[];synthetic.lastRouteWitness=null;synthetic.returns=0;synthetic.worldEpoch=0;synthetic.ghostTrail=[];synthetic.ghostMode='NONE';synthetic.compareBase=null;
  W().OneReturnAPI.importPacket({world:synthetic});
  await wait(()=>W().OneReturnAPI.snapshot().nextGate===9,3000,'synthetic import');
  D().getElementById('returnBtn').click();
  await wait(()=>W().OneReturnAPI.snapshot().lastRouteWitness?.schema==='sleeper.route-witness/v0.1',5000,'route witness return');
  const afterReturn=W().OneReturnAPI.snapshot(),rw=afterReturn.lastRouteWitness,R=W().SleeperRouteWitness,checked=R.validate(rw);
  rec.returned={valid:checked.ok,worldId:rw.world.id,epoch:rw.world.inputs.epoch,rle:rw.route.rle,movement:rw.route.movementSteps,run:rw.route.runSteps,ghostMode:afterReturn.ghostMode,nextEpoch:afterReturn.worldEpoch,positions:checked.positions};
  if(!checked.ok)throw Error('witness invalid '+checked.errors.join(' / '));
  if(rw.route.rle!=='R2,D1'||rw.route.movementSteps!==3||rw.route.runSteps!==4)throw Error('route witness metrics');
  if(afterReturn.worldEpoch!==1||afterReturn.ghostMode!=='PRIOR_RETURN_RESIDUE')throw Error('ordinary return must advance epoch and label residue');
  const btn=D().getElementById('sameWorldBtn');if(btn.disabled)throw Error('same-world button disabled after return');btn.click();
  await wait(()=>W().OneReturnAPI.snapshot().ghostMode==='SAME_WORLD',5000,'same-world replay');
  const replay=W().OneReturnAPI.snapshot(),live=W().OneReturnAPI.routeWitness(),cmp=R.compare(rw,live);
  rec.replay={epoch:replay.worldEpoch,returns:replay.returns,ghostMode:replay.ghostMode,ghostPoints:replay.ghostTrail.length,gridSame:JSON.stringify(replay.grid)===originalGrid,compare:cmp,meta:D().getElementById('ghostMeta')?.textContent||''};
  if(replay.worldEpoch!==0||replay.returns!==1||replay.ghostMode!=='SAME_WORLD')throw Error('same-world replay identity');
  if(JSON.stringify(replay.grid)!==originalGrid)throw Error('same-world grid mismatch');
  if(replay.ghostTrail.length!==checked.positions.length)throw Error('ghost lost route points');
  if(!cmp.ok||cmp.status!=='SAME_WORLD')throw Error('same-world comparator rejected replay');
  if(!/GHOST · SAME WORLD/.test(rec.replay.meta))throw Error('same-world UI state absent');
  W().OneReturnAPI.importPacket(rw);
  await wait(()=>W().OneReturnAPI.snapshot().ghostMode==='SAME_WORLD',3000,'direct witness import');
  const imported=W().OneReturnAPI.snapshot();rec.imported={epoch:imported.worldEpoch,ghost:imported.ghostTrail.length,worldId:imported.lastRouteWitness?.world?.id};
  const ok=rec.returned.valid&&rec.returned.epoch===0&&rec.returned.nextEpoch===1&&rec.replay.gridSame&&rec.replay.compare.ok&&rec.imported.worldId===rw.world.id;
  done(ok,rec);
}catch(e){done(false,{...rec,error:String(e?.stack||e)})}})();
<\/script></body></html>`}
const server=http.createServer((req,res)=>{if(String(req.url||'').startsWith('/__probe')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(probe());return}const p=resolveFile(req.url);if(!p){res.writeHead(404);res.end('not found');return}res.writeHead(200,{'content-type':ct(p),'cache-control':'no-store'});fs.createReadStream(p).pipe(res)});
function run(bin){return new Promise((resolve,reject)=>{const a=['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--window-size=560,980','--virtual-time-budget=22000','--dump-dom','http://'+HOST+':'+PORT+'/__probe'];const p=spawn(bin,a,{stdio:['ignore','pipe','pipe']});let out='',err='';const tm=setTimeout(()=>{p.kill('SIGKILL');reject(Error('timeout'))},34000);p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',e=>{clearTimeout(tm);reject(e)});p.on('close',code=>{clearTimeout(tm);resolve({code,out,err})})})}
await new Promise((resolve,reject)=>server.listen(PORT,HOST,e=>e?reject(e):resolve()));PORT=server.address().port;
try{
  const r=await run(browserBin()),m=r.out.match(/id="probeResult"[^>]*>([\s\S]*?)<\/pre>/i),result=(m?.[1]||'').replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim(),fatal=/Uncaught (?:TypeError|ReferenceError|SyntaxError)|net::ERR_|Aw, Snap/i.test(r.err);
  if(r.code!==0||fatal||!result.startsWith('PASS ')){console.error('SLEEPER ROUTE WITNESS SMOKE FAIL',result||'(no result)');if(r.err.trim())console.error(r.err.slice(-2600));process.exitCode=1}
  else console.log('SLEEPER ROUTE WITNESS SMOKE PASS',result.slice(5));
}finally{await new Promise(r=>server.close(()=>r()))}
