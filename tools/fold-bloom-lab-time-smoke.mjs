#!/usr/bin/env node
'use strict';

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';

const ROOT=process.cwd(),HOST='127.0.0.1',PORT=41747;
function browserBin(){
  for(const name of ['google-chrome-stable','google-chrome','chromium-browser','chromium']){
    const r=spawnSync('which',[name],{encoding:'utf8'});if(r.status===0&&r.stdout.trim())return r.stdout.trim();
  }
  throw Error('No Chrome/Chromium binary found');
}
function type(p){
  if(p.endsWith('.html'))return'text/html; charset=utf-8';if(p.endsWith('.js')||p.endsWith('.mjs'))return'text/javascript; charset=utf-8';
  if(p.endsWith('.json'))return'application/json; charset=utf-8';if(p.endsWith('.css'))return'text/css; charset=utf-8';if(p.endsWith('.svg'))return'image/svg+xml';return'application/octet-stream';
}
function fileFor(url){
  let clean=decodeURIComponent(String(url||'/').split('?')[0]).replace(/^\/+/, '');if(!clean)clean='index.html';if(clean.endsWith('/'))clean+='index.html';
  const p=path.normalize(path.join(ROOT,clean));if(!p.startsWith(ROOT))return null;if(fs.existsSync(p)&&fs.statSync(p).isFile())return p;if(fs.existsSync(p+'.html'))return p+'.html';return null;
}
function probe(){
  return `<!doctype html><html><body><iframe id="f" style="width:430px;height:900px;border:0" src="/fold-bloom/lab/?mode=RIDE"></iframe><pre id="probeResult">PENDING</pre><script>
  const f=document.getElementById('f'),out=document.getElementById('probeResult'),rec={};let doneFlag=false;
  const done=(ok,x)=>{if(doneFlag)return;doneFlag=true;out.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(x)};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const waitFor=async(fn,limit=14000,label='condition')=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(60)}throw Error('waitFor timeout '+label)};
  (async()=>{
    const W=()=>f.contentWindow,D=()=>W().document;
    const api=await waitFor(()=>D().documentElement.dataset.foldBloomFieldLab==='ready'&&W().FoldBloomFieldLab,14000,'Lab ready');
    rec.initial=api.ride();D().getElementById('rideNext').click();D().querySelector('[data-ride-op="BLOOM"]').click();await sleep(80);
    rec.afterTurns=api.ride();D().getElementById('rideScope').click();await sleep(50);rec.sectionScope=api.ride();
    const scrub=D().getElementById('rideScrub');scrub.value='24';scrub.dispatchEvent(new Event('input',{bubbles:true}));await sleep(50);rec.scrubbed=api.ride();
    const rideReturn=api.returnPacket();rec.rideReturn={kind:rideReturn.projection?.kind,projection:rideReturn.projection?.projection,turn:rideReturn.projection?.turn,scope:rideReturn.projection?.scope};

    D().querySelector('[data-mode="VERSE"]').click();await waitFor(()=>api.mode()==='VERSE',4000,'VERSE mode');
    const source=['alpha beta gamma','delta epsilon zeta','eta theta iota'].join('\\n');D().getElementById('verseSource').value=source;D().getElementById('verseBind').click();
    await waitFor(()=>D().querySelectorAll('[data-verse-line]').length===3,4000,'verse lines');D().querySelector('[data-verse-line="1"]').click();
    const focusBefore=api.verse().focus?.address||'';D().getElementById('verseReplayStep').click();await waitFor(()=>api.verse().replay,4000,'inline replay');
    const first=api.verse().replay;D().getElementById('verseReplayStep').click();await sleep(60);const second=api.verse().replay;
    D().getElementById('verseReplayBack').click();await sleep(60);const back=api.verse().replay;
    const verseReturn=api.returnPacket();rec.verse={focusBefore,focusAfter:api.verse().focus?.address||'',first,second,back,returnReplay:verseReturn.projection?.replay||null,rawSourceAbsent:!JSON.stringify(verseReturn).includes(source)};

    rec.mapCanvas=!!D().getElementById('rideMap');rec.sameSeven=D().querySelectorAll('.mode').length===7;
    const pass=rec.initial.turn===1&&rec.afterTurns.turn===3&&rec.afterTurns.operations.at(-1)?.operation==='BLOOM'&&rec.sectionScope.scope==='SECTION'&&rec.scrubbed.turn===25&&rec.rideReturn.kind==='RIDE'&&rec.rideReturn.projection==='STEP'&&rec.rideReturn.scope==='SECTION'&&rec.verse.focusBefore===rec.verse.focusAfter&&second.index===first.index+1&&back.index===first.index&&rec.verse.returnReplay?.steps===24&&rec.verse.rawSourceAbsent&&rec.mapCanvas&&rec.sameSeven;
    done(pass,rec);
  })().catch(e=>done(false,{...rec,error:String(e?.stack||e)}));
  <\/script></body></html>`;
}
const server=http.createServer((req,res)=>{
  if(String(req.url||'').startsWith('/__probe')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(probe());return}
  const p=fileFor(req.url);if(!p){res.writeHead(404);res.end('not found');return}res.writeHead(200,{'content-type':type(p),'cache-control':'no-store'});fs.createReadStream(p).pipe(res);
});
function run(bin){return new Promise((resolve,reject)=>{
  const p=spawn(bin,['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--hide-scrollbars','--window-size=430,980','--virtual-time-budget=12000','--dump-dom','http://'+HOST+':'+PORT+'/__probe'],{stdio:['ignore','pipe','pipe']});
  let out='',err='';const timer=setTimeout(()=>{p.kill('SIGKILL');reject(Error('timeout'))},22000);p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',e=>{clearTimeout(timer);reject(e)});p.on('close',code=>{clearTimeout(timer);resolve({code,out,err})});
})}
function result(dom){const m=String(dom).match(/id="probeResult"[^>]*>([\s\S]*?)<\/pre>/i);return(m?.[1]||'').replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim()}
await new Promise((resolve,reject)=>server.listen(PORT,HOST,e=>e?reject(e):resolve()));
try{
  const r=await run(browserBin()),x=result(r.out),fatal=/Uncaught (?:TypeError|ReferenceError|SyntaxError)|net::ERR_|Aw, Snap/i.test(r.err);
  if(r.code!==0||fatal||!x.startsWith('PASS ')){console.error('FIELD LAB TIME PROOF FAIL',x||'(no result)');if(r.err.trim())console.error(r.err.slice(-2400));process.exitCode=1}
  else console.log('FIELD LAB TIME PROOF PASS',x.slice(5));
}finally{await new Promise(resolve=>server.close(()=>resolve()))}
