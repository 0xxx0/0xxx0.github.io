#!/usr/bin/env node
'use strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';

const ROOT=process.cwd(),HOST='127.0.0.1',PORT=41766;
function browserBin(){for(const n of ['google-chrome-stable','google-chrome','chromium-browser','chromium']){const r=spawnSync('which',[n],{encoding:'utf8'});if(r.status===0&&r.stdout.trim())return r.stdout.trim()}throw Error('No Chrome/Chromium')}
function ct(p){if(p.endsWith('.html'))return'text/html; charset=utf-8';if(p.endsWith('.js')||p.endsWith('.mjs'))return'text/javascript; charset=utf-8';if(p.endsWith('.json'))return'application/json; charset=utf-8';if(p.endsWith('.css'))return'text/css; charset=utf-8';return'application/octet-stream'}
function resolveFile(url){let q=decodeURIComponent(String(url||'/').split('?')[0]).replace(/^\/+/, '');if(!q)q='index.html';if(q.endsWith('/'))q+='index.html';const p=path.normalize(path.join(ROOT,q));if(!p.startsWith(ROOT))return null;if(fs.existsSync(p)&&fs.statSync(p).isFile())return p;if(fs.existsSync(p+'.html'))return p+'.html';return null}
function probe(){return `<!doctype html><html><body><pre id="probeResult">PENDING</pre><script>
const out=document.getElementById('probeResult'),rec={};let finished=false;
const done=(ok,x)=>{if(finished)return;finished=true;out.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(x)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const wait=async(fn,limit=15000,label='condition')=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(60)}throw Error('wait '+label)};
const frame=src=>{const f=document.createElement('iframe');f.style='width:900px;height:760px;border:0';f.src=src;document.body.prepend(f);return f};
(async()=>{try{
  // READFIELD: JSON is a navigable structure, exact path survives, mark is honest residue.
  let f=frame('/docs/?src=/showcase-manifest.json'),W=()=>f.contentWindow,D=()=>W().document;
  const ap=await wait(()=>{const x=D().getElementById('docAperture');return x?.snapshot?.()?.kind==='JSON'?x:null},15000,'readfield json');
  await wait(()=>D().querySelector('.jsonCard .jsonChild'),15000,'json card');
  const before=ap.snapshot(),child=D().querySelector('.jsonChild'),path=child.dataset.jsonPath;child.click();
  await wait(()=>ap.snapshot()?.address===path,5000,'exact json child');
  const after=ap.snapshot();D().getElementById('markHere').click();const marked=D().getElementById('markHere').textContent;D().getElementById('markHere').click();
  rec.read={kind:after.kind,before:before.address,after:after.address,childPath:path,nodePath:after.node?.path,childCount:after.node?.children?.length??0,marked};
  f.remove();

  // FIELD LAB: eight projections; PULSE free by default; VOICE separate and unlinked by default.
  f=frame('/fold-bloom/lab/?mode=PULSE');W=()=>f.contentWindow;D=()=>W().document;
  await wait(()=>W().FoldBloomFieldLab?.mode?.()==='PULSE',15000,'lab pulse');
  const modes=[...D().querySelectorAll('.mode')].map(x=>x.dataset.mode),pulse0=W().FoldBloomFieldLab.pulse();
  D().getElementById('pulseMode').click();await wait(()=>W().FoldBloomFieldLab.pulse().mode==='TRAIN',3000,'pulse train');
  D().getElementById('pulseMode').click();await wait(()=>W().FoldBloomFieldLab.pulse().mode==='FREE',3000,'pulse free');
  D().querySelector('[data-mode="VOICE"]').click();await wait(()=>W().FoldBloomFieldLab.mode()==='VOICE',3000,'voice mode');
  const voice=W().FoldBloomFieldLab.voice(),coreDisplay=W().getComputedStyle(D().querySelector('.core')).display;
  rec.lab={modes,pulseDefault:pulse0.mode,pulseLane:pulse0.lane,mode:W().FoldBloomFieldLab.mode(),voiceLinked:voice.linked,voicePanel:D().querySelector('[data-controls="VOICE"]').classList.contains('on'),coreDisplay};
  f.remove();

  // REPLAY: active message word is the axial center witness.
  f=frame('/fold-bloom/replay/');W=()=>f.contentWindow;D=()=>W().document;
  await wait(()=>W().FoldBloomReplay?.boot==='ready',15000,'replay boot');
  D().getElementById('pause').click();W().FoldBloomReplay.setPlayhead(.12);
  await wait(()=>D().documentElement.dataset.replayCenterMode==='WORD'&&D().documentElement.dataset.replayCenterText,5000,'replay center word');
  rec.replay={mode:D().documentElement.dataset.replayCenterMode,text:D().documentElement.dataset.replayCenterText,address:D().documentElement.dataset.replayCourseAddress};
  const pass=
    rec.read.kind==='JSON'&&rec.read.after===path&&rec.read.nodePath===path&&/^MARKED/.test(marked)&&
    modes.length===8&&modes.includes('VOICE')&&pulse0.mode==='FREE'&&rec.lab.mode==='VOICE'&&rec.lab.voiceLinked===false&&rec.lab.voicePanel&&coreDisplay==='none'&&
    rec.replay.mode==='WORD'&&rec.replay.text==='MEET';
  done(pass,rec);
}catch(e){done(false,{...rec,error:String(e?.stack||e)})}})();
<\/script></body></html>`}
const server=http.createServer((req,res)=>{if(String(req.url||'').startsWith('/__probe')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(probe());return}const p=resolveFile(req.url);if(!p){res.writeHead(404);res.end('not found');return}res.writeHead(200,{'content-type':ct(p),'cache-control':'no-store'});fs.createReadStream(p).pipe(res)});
function run(bin){return new Promise((resolve,reject)=>{const args=['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--window-size=1000,850','--virtual-time-budget=18000','--dump-dom','http://'+HOST+':'+PORT+'/__probe'];const p=spawn(bin,args,{stdio:['ignore','pipe','pipe']});let out='',err='';const tm=setTimeout(()=>{p.kill('SIGKILL');reject(Error('timeout'))},32000);p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',e=>{clearTimeout(tm);reject(e)});p.on('close',code=>{clearTimeout(tm);resolve({code,out,err})})})}
await new Promise((resolve,reject)=>server.listen(PORT,HOST,e=>e?reject(e):resolve()));
try{
  const r=await run(browserBin()),m=r.out.match(/id="probeResult"[^>]*>([\s\S]*?)<\/pre>/i),result=(m?.[1]||'').replace(/&quot;/g,'"').replace(/&amp;/g,'&').trim(),fatal=/Uncaught (?:TypeError|ReferenceError|SyntaxError)|net::ERR_|Aw, Snap/i.test(r.err);
  if(r.code!==0||fatal||!result.startsWith('PASS ')){console.error('AXIAL APERTURE SMOKE FAIL',result||'(no result)');if(r.err.trim())console.error(r.err.slice(-2600));process.exitCode=1}
  else console.log('AXIAL APERTURE SMOKE PASS',result.slice(5));
}finally{await new Promise(r=>server.close(()=>r()))}
