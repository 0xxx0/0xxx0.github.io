#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';

const ROOT=process.cwd(),HOST='127.0.0.1',PORT=41741;
function browserBin(){for(const name of ['google-chrome-stable','google-chrome','chromium-browser','chromium']){const r=spawnSync('which',[name],{encoding:'utf8'});if(r.status===0&&r.stdout.trim())return r.stdout.trim()}throw Error('No Chrome/Chromium')}
function type(p){if(p.endsWith('.html'))return'text/html; charset=utf-8';if(p.endsWith('.js')||p.endsWith('.mjs'))return'text/javascript; charset=utf-8';if(p.endsWith('.json'))return'application/json; charset=utf-8';if(p.endsWith('.css'))return'text/css; charset=utf-8';return'application/octet-stream'}
function fileFor(url){let clean=decodeURIComponent(String(url||'/').split('?')[0]).replace(/^\/+/, '');if(!clean)clean='index.html';if(clean.endsWith('/'))clean+='index.html';const p=path.normalize(path.join(ROOT,clean));if(!p.startsWith(ROOT))return null;if(fs.existsSync(p)&&fs.statSync(p).isFile())return p;return null}
function probe(){return `<!doctype html><html><body><iframe id="f" style="width:430px;height:900px;border:0"></iframe><pre id="probeResult">PENDING</pre><script>
const out=document.getElementById('probeResult'),f=document.getElementById('f'),rec={};let doneFlag=false;
const done=(ok,data)=>{if(doneFlag)return;doneFlag=true;out.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(data)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const wait=async(fn,limit=18000)=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(80)}throw Error('wait timeout')};
function wav(){const rate=8000,n=rate/2,b=new ArrayBuffer(44+n*2),v=new DataView(b);const s=(o,x)=>{for(let i=0;i<x.length;i++)v.setUint8(o+i,x.charCodeAt(i))};s(0,'RIFF');v.setUint32(4,36+n*2,true);s(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);s(36,'data');v.setUint32(40,n*2,true);for(let i=0;i<n;i++)v.setInt16(44+i*2,Math.sin(i/rate*Math.PI*2*220)*12000,true);return new Blob([b],{type:'audio/wav'})}
setTimeout(()=>{(async()=>{
  const api=await import('/fold-bloom/local-media-store.js'),blob=wav(),buf=await blob.arrayBuffer(),digest=await crypto.subtle.digest('SHA-256',buf),hash='sha256:'+Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');rec.hash=hash;
  await api.putLocalMedia({sourceId:hash,blob,name:'spine-proof.wav',type:'audio/wav',size:blob.size,meta:{durationSeconds:.5}});
  const t=new Date().toISOString(),set={schema:'fold-bloom-experience-set/v0.1',id:'set:spine-proof',title:'SOURCE SPINE PROOF',createdAt:t,updatedAt:t,entries:[{id:'entry:proof',sourceId:hash,weight:1,transitionOut:'RETURN',landmarkIds:[]}]};
  localStorage.setItem('fold-bloom.set-compositor.v01',JSON.stringify(set));localStorage.setItem('fold-bloom.set-compositor.meta.v01',JSON.stringify({[hash]:{name:'SPINE PROOF',role:'ONE SELECT'}}));
  f.src='/fold-bloom/set/';
  const btn=await wait(()=>f.contentWindow?.document?.querySelector('[data-vault-listen]'));
  await wait(()=>btn.textContent.includes('LISTEN')&&f.contentWindow.document.querySelector('.block')?.dataset.localMedia==='ready');rec.setReady=true;btn.click();
  await wait(()=>f.contentWindow?.location?.pathname==='/fold-bloom/listen/');
  await wait(()=>f.contentWindow.document.documentElement.dataset.localVaultSource==='ready',24000);
  const state=f.contentWindow.FoldBloomListen?.state?.();rec.listenHash=state?.fileMeta?.hash||null;rec.vault=f.contentWindow.document.documentElement.dataset.localVaultSource;rec.returnLink=!!f.contentWindow.document.getElementById('vaultReturn');
  const raw=hash.slice(7);rec.listenReady=rec.setReady&&rec.vault==='ready'&&rec.listenHash===raw&&rec.returnLink;
  f.src='/fold-bloom/set/journey.html?demo=1';
  await wait(()=>f.contentWindow?.document?.documentElement?.dataset?.foldBloomJourney==='ready');
  rec.journeyEntries=f.contentWindow.document.documentElement.dataset.journeyEntries;rec.journeyReady=f.contentWindow.document.documentElement.dataset.journeyReady;rec.journeyTitle=f.contentWindow.document.getElementById('journeyTitle')?.textContent||'';rec.journeyOverflow=Math.max(f.contentWindow.document.documentElement.scrollWidth,f.contentWindow.document.body.scrollWidth)-f.contentWindow.document.documentElement.clientWidth;
  done(rec.listenReady&&rec.journeyEntries==='3'&&rec.journeyReady==='true'&&/GHOST/.test(rec.journeyTitle)&&rec.journeyOverflow<=1,rec);
})().catch(e=>done(false,{error:String(e?.stack||e),...rec}))},120);
setTimeout(()=>done(false,{error:'probe timeout',...rec}),28000);
<\/script></body></html>`}
const server=http.createServer((req,res)=>{if(String(req.url).startsWith('/__spine')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(probe());return}const file=fileFor(req.url);if(!file){res.writeHead(404);res.end('not found');return}res.writeHead(200,{'content-type':type(file),'cache-control':'no-store'});fs.createReadStream(file).pipe(res)});
await new Promise(r=>server.listen(PORT,HOST,r));
const bin=browserBin(),args=['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--hide-scrollbars','--window-size=520,940','--virtual-time-budget=30000','--dump-dom',`http://${HOST}:${PORT}/__spine`];
const result=await new Promise((resolve,reject)=>{const p=spawn(bin,args,{stdio:['ignore','pipe','pipe']});let out='',err='';const timer=setTimeout(()=>{p.kill('SIGKILL');reject(Error('timeout'))},40000);p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('close',code=>{clearTimeout(timer);resolve({code,out,err})})});
server.close();
const pass=/id="probeResult">PASS /.test(result.out)&&/"vault":"ready"/.test(result.out)&&/"returnLink":true/.test(result.out)&&/"journeyEntries":"3"/.test(result.out)&&/"journeyReady":"true"/.test(result.out);
if(!pass){console.error('FOLD BLOOM SOURCE SPINE SMOKE FAIL');console.error(result.out.slice(-5000));console.error(result.err.slice(-1800));process.exit(1)}
console.log('FOLD BLOOM SOURCE SPINE + JOURNEY SMOKE PASS');
