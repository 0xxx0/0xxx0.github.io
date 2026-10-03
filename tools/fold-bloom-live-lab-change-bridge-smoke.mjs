#!/usr/bin/env node
'use strict';

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {browserBin} from './browser-bin.mjs';

const ROOT=process.cwd(),HOST='127.0.0.1';let PORT=0;
function ct(p){if(p.endsWith('.html'))return'text/html; charset=utf-8';if(p.endsWith('.js')||p.endsWith('.mjs'))return'text/javascript; charset=utf-8';if(p.endsWith('.json'))return'application/json; charset=utf-8';if(p.endsWith('.css'))return'text/css; charset=utf-8';if(p.endsWith('.mp3'))return'audio/mpeg';return'application/octet-stream'}
function resolveFile(url){let q=decodeURIComponent(String(url||'/').split('?')[0]).replace(/^\/+/, '');if(!q)q='index.html';if(q.endsWith('/'))q+='index.html';const p=path.normalize(path.join(ROOT,q));if(!p.startsWith(ROOT))return null;if(fs.existsSync(p)&&fs.statSync(p).isFile())return p;if(fs.existsSync(p+'.html'))return p+'.html';return null}

function probe(){return `<!doctype html><html><body style="margin:0">
<iframe id="lab" style="width:430px;height:900px;border:0" src="/fold-bloom/lab/?mode=DATA"></iframe>
<iframe id="live" style="width:430px;height:900px;border:0" src="/fold-bloom/live/"></iframe>
<pre id="probeResult">PENDING</pre><script>
const lf=document.getElementById('lab'),vf=document.getElementById('live'),o=document.getElementById('probeResult'),rec={};let finished=false;
const done=(ok,x)=>{if(finished)return;finished=true;o.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(x)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const wait=async(fn,limit=16000,label='condition')=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(60)}throw Error('timeout '+label)};
(async()=>{try{
  const LW=()=>lf.contentWindow,LD=()=>LW().document,VW=()=>vf.contentWindow,VD=()=>VW().document;
  await wait(()=>LD().documentElement.dataset.foldBloomFieldLab==='ready'&&LW().FoldBloomFieldLab?.liveChange,16000,'LAB ready');
  const api=await wait(()=>VW().FoldBloomLive?.boot==='ready'&&VW().FoldBloomLive,16000,'LIVE ready');
  api.autopilot.stop();VD().getElementById('mutePlay')?.click();await sleep(100);
  const releases=[];
  for(let i=0;i<6;i++){
    const before=api.state(),beforeHistory=before.history?.length||0,targets=api.choice.targets();
    const target=targets[0];if(!target)throw Error('no lawful target at release '+(i+1));
    const canvas=VD().getElementById('field'),rect=canvas.getBoundingClientRect(),x=rect.left+target.x,y=rect.top+target.y;
    canvas.dispatchEvent(new (VW().PointerEvent)('pointerdown',{bubbles:true,pointerId:30+i,clientX:x,clientY:y,pointerType:'touch',isPrimary:true}));
    canvas.dispatchEvent(new (VW().PointerEvent)('pointerup',{bubbles:true,pointerId:30+i,clientX:x,clientY:y,pointerType:'touch',isPrimary:true}));
    await wait(()=>api.state().forecastContext?.gate===target.slot,2500,'seek '+(i+1));
    const btn=VD().getElementById('releaseBtn');if(btn?.disabled)throw Error('release disabled after seek '+(i+1));
    btn.click();
    await wait(()=>(api.state().history?.length||0)===beforeHistory+1,3000,'release '+(i+1));
    const last=api.state().history?.at(-1);releases.push({verb:last?.verb,slot:last?.slot,id:last?.id});
    await sleep(40);
  }
  await wait(()=>LD().documentElement.dataset.fieldLabLiveChange==='window-ready',5000,'LAB six-release window');
  const lab=LW().FoldBloomFieldLab.liveChange(),liveState=api.state(),liveContext=api.steering.context();
  const liveForm=(liveState.history||[]).slice(-6).map(x=>x.verb),labForm=lab?.live_window?.exact_form||[];
  rec.liveForm=liveForm;rec.labForm=labForm;rec.hex=lab?.live_window?.hex_token;rec.eventRefs=lab?.live_window?.event_refs?.length;
  rec.native={authority:lab?.live_window?.native_after?.authority,candidates:lab?.live_window?.native_after?.candidate_count,target:lab?.live_window?.native_after?.target_type,liveCandidates:liveContext?.forecasts?.length,liveTarget:liveContext?.targetType};
  rec.dataset=LD().documentElement.dataset.fieldLabLiveChange;rec.releases=releases;
  const pass=liveForm.length===6&&labForm.join(',')===liveForm.join(',')&&rec.eventRefs===6&&
    rec.native.authority==='NATIVE_EVIDENCE'&&rec.native.candidates===rec.native.liveCandidates&&rec.native.target===rec.native.liveTarget&&
    rec.dataset==='window-ready';
  done(pass,rec);
}catch(e){done(false,{...rec,error:String(e?.stack||e)})}})();
<\/script></body></html>`}

const server=http.createServer((req,res)=>{if(String(req.url||'').startsWith('/__probe')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(probe());return}const p=resolveFile(req.url);if(!p){res.writeHead(404);res.end('not found');return}res.writeHead(200,{'content-type':ct(p),'cache-control':'no-store'});fs.createReadStream(p).pipe(res)});
function run(bin){return new Promise((resolve,reject)=>{const a=['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required','--window-size=900,980','--virtual-time-budget=15000','--dump-dom','http://'+HOST+':'+PORT+'/__probe'];const p=spawn(bin,a,{stdio:['ignore','pipe','pipe']});let out='',err='';const tm=setTimeout(()=>{p.kill('SIGKILL');reject(Error('timeout'))},30000);p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',e=>{clearTimeout(tm);reject(e)});p.on('close',code=>{clearTimeout(tm);resolve({code,out,err})})})}
await new Promise((resolve,reject)=>server.listen(PORT,HOST,e=>e?reject(e):resolve()));PORT=server.address().port;
try{
  const r=await run(browserBin()),m=r.out.match(/id="probeResult"[^>]*>([\s\S]*?)<\/pre>/i),result=(m?.[1]||'').replace(/&quot;/g,'"').replace(/&amp;/g,'&').trim(),fatal=/Uncaught (?:TypeError|ReferenceError|SyntaxError)|net::ERR_|Aw, Snap/i.test(r.err);
  if(r.code!==0||fatal||!result.startsWith('PASS ')){console.error('LIVE→LAB CHANGE BRIDGE SMOKE FAIL',result||'(no result)');if(r.err.trim())console.error(r.err.slice(-2200));process.exitCode=1}
  else console.log('LIVE→LAB CHANGE BRIDGE SMOKE PASS',result.slice(5));
}finally{await new Promise(r=>server.close(()=>r()))}
