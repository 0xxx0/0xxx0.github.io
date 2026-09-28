#!/usr/bin/env node
'use strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';

const ROOT=process.cwd(),HOST='127.0.0.1',PORT=41788;
function browserBin(){for(const n of ['google-chrome-stable','google-chrome','chromium-browser','chromium']){const r=spawnSync('which',[n],{encoding:'utf8'});if(r.status===0&&r.stdout.trim())return r.stdout.trim()}throw Error('No Chrome/Chromium')}
function ct(p){if(p.endsWith('.html'))return'text/html; charset=utf-8';if(p.endsWith('.js')||p.endsWith('.mjs'))return'text/javascript; charset=utf-8';if(p.endsWith('.json'))return'application/json; charset=utf-8';if(p.endsWith('.css'))return'text/css; charset=utf-8';if(p.endsWith('.mp3'))return'audio/mpeg';return'application/octet-stream'}
function resolveFile(url){let q=decodeURIComponent(String(url||'/').split('?')[0]).replace(/^\/+/, '');if(!q)q='index.html';if(q.endsWith('/'))q+='index.html';const p=path.normalize(path.join(ROOT,q));if(!p.startsWith(ROOT))return null;if(fs.existsSync(p)&&fs.statSync(p).isFile())return p;if(fs.existsSync(p+'.html'))return p+'.html';return null}
function probe(){return `<!doctype html><html><body><iframe id="f" style="width:390px;height:720px;border:0"></iframe><pre id="probeResult">PENDING</pre><script>
const f=document.getElementById('f'),out=document.getElementById('probeResult'),rec={};let doneFlag=false;
const done=(ok,x)=>{if(doneFlag)return;doneFlag=true;out.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(x)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const wait=async(fn,limit=16000,label='condition')=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(60)}throw Error('wait '+label)};
const W=()=>f.contentWindow,D=()=>W().document;
async function boot(){f.src='/fold-bloom/live/';await wait(()=>W().FoldBloomLive?.music?.current&&D().getElementById('musicQuick'),18000,'LIVE music API')}
(async()=>{try{
  await boot();
  await W().FoldBloomLive.music.set(false,{announce:false});
  rec.initial=W().FoldBloomLive.music.current();
  const q=D().getElementById('musicQuick');
  rec.quickInitial={text:q.textContent,state:q.dataset.state,pressed:q.getAttribute('aria-pressed')};
  if(rec.initial.wanted||rec.initial.audible||q.dataset.state!=='off')throw Error('music must begin controllably OFF in test');

  await W().FoldBloomLive.music.set(true,{announce:false});
  await wait(()=>W().FoldBloomLive.music.current().wanted,4000,'music wanted');
  rec.on=W().FoldBloomLive.music.current();
  rec.quickOn={text:q.textContent,state:q.dataset.state,pressed:q.getAttribute('aria-pressed')};
  if(!rec.on.wanted||rec.on.layer!=='IMMERSION')throw Error('music intent or immersion missing');
  if(!['audible','wanted'].includes(q.dataset.state))throw Error('visible music state missing');

  W().FoldBloomLive.layers.apply('MAP',false);await sleep(120);
  rec.map=W().FoldBloomLive.music.current();
  rec.quickMap={text:q.textContent,state:q.dataset.state};
  if(!rec.map.wanted||rec.map.audible||rec.map.layer!=='MAP'||!/HELD/.test(q.textContent))throw Error('MAP must hold but preserve music intent');

  W().FoldBloomLive.layers.apply('IMMERSION',false);await sleep(120);
  rec.immersion=W().FoldBloomLive.music.current();
  if(!rec.immersion.wanted||rec.immersion.layer!=='IMMERSION')throw Error('IMMERSION restore intent missing');
  if(rec.on.audible&&!rec.immersion.audible)throw Error('audible music did not restore after MAP');

  W().FoldBloomLive.music.scene('TRANCE');await sleep(120);
  rec.scene=W().FoldBloomLive.music.current();
  if(rec.scene.scene!=='TRANCE')throw Error('scene selection not reflected in music state');
  if(!(rec.scene.energy>=.12&&rec.scene.energy<=1&&rec.scene.density>=.08&&rec.scene.density<=.98&&rec.scene.tension>=0&&rec.scene.tension<=1))throw Error('climate bounds');

  rec.persistBeforeReload=W().localStorage.getItem('fold-bloom.live.field-music.v1');
  if(rec.persistBeforeReload!=='1')throw Error('music intent not persisted');
  const priorDocument=D();
  f.src='/fold-bloom/live/?reload=1';
  await wait(()=>D()!==priorDocument&&W().FoldBloomLive?.music?.current&&D().getElementById('musicQuick'),18000,'reload new document');
  rec.reload=W().FoldBloomLive.music.current();rec.quickReload=D().getElementById('musicQuick').textContent;
  if(!rec.reload.wanted||rec.reload.audible)throw Error('reload must remember intent without autoplaying audio');
  if(!/ARMED|ON/.test(rec.quickReload))throw Error('reload visible armed state missing');

  await W().FoldBloomLive.music.set(false,{announce:false});await sleep(60);
  rec.off=W().FoldBloomLive.music.current();
  if(rec.off.wanted||rec.off.audible||W().localStorage.getItem('fold-bloom.live.field-music.v1')!=='0')throw Error('music off did not persist');

  const rect=D().getElementById('musicQuick').getBoundingClientRect();
  rec.geometry={w:rect.width,h:rect.height,left:rect.left,bottom:rect.bottom,viewport:{w:W().innerWidth,h:W().innerHeight}};
  if(rect.width<100||rect.height<38||rect.left<0||rect.bottom>W().innerHeight)throw Error('music quick control not phone-usable');
  done(true,rec);
}catch(e){done(false,{...rec,error:String(e?.stack||e)})}})();
<\/script></body></html>`}
const server=http.createServer((req,res)=>{if(String(req.url||'').startsWith('/__probe')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(probe());return}const p=resolveFile(req.url);if(!p){res.writeHead(404);res.end('not found');return}res.writeHead(200,{'content-type':ct(p),'cache-control':'no-store'});fs.createReadStream(p).pipe(res)});
function run(bin){return new Promise((resolve,reject)=>{const a=['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required','--window-size=430,800','--virtual-time-budget=26000','--dump-dom','http://'+HOST+':'+PORT+'/__probe'];const p=spawn(bin,a,{stdio:['ignore','pipe','pipe']});let out='',err='';const tm=setTimeout(()=>{p.kill('SIGKILL');reject(Error('timeout'))},38000);p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',e=>{clearTimeout(tm);reject(e)});p.on('close',code=>{clearTimeout(tm);resolve({code,out,err})})})}
await new Promise((resolve,reject)=>server.listen(PORT,HOST,e=>e?reject(e):resolve()));
try{
 const r=await run(browserBin()),m=r.out.match(/id="probeResult"[^>]*>([\s\S]*?)<\/pre>/i),result=(m?.[1]||'').replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim(),fatal=/Uncaught (?:TypeError|ReferenceError|SyntaxError)|net::ERR_|Aw, Snap/i.test(r.err);
 if(r.code!==0||fatal||!result.startsWith('PASS ')){console.error('FOLD BLOOM FIELD MUSIC SMOKE FAIL',result||'(no result)');if(r.err.trim())console.error(r.err.slice(-3000));process.exitCode=1}else console.log('FOLD BLOOM FIELD MUSIC SMOKE PASS',result.slice(5));
}finally{await new Promise(r=>server.close(()=>r()))}
