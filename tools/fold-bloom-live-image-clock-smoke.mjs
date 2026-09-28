#!/usr/bin/env node
'use strict';
// fold-bloom-live-image-clock-smoke.mjs
//
// PROVES THE FIX FOR "i hate this stupid fucking click advance thing": a declared set
// of LOCAL images advances its addressed position on its own clock, with NO click
// between samples, and with NO audio source loaded (the exact case that failed).
//
// The fixtures are SYNTHETIC PNGs generated in-process by the crc32/zlib writer below
// — never read from the operator's archive, never written to disk, never committed.
// The probe drives the SAME path the picker drives (sha256 → IndexedDB vault →
// remembered declaration → course → clock); it does not reach past it.
//
// Everything else stands on the existing machinery: the address is read from the same
// courseAddressAt used by audio and READ, and the mode laws are asserted, not bypassed.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {spawn,spawnSync} from 'node:child_process';

const ROOT=process.cwd(),HOST='127.0.0.1';let PORT=0;
const FIXTURE_COUNT=Number(process.env.IMAGE_FIXTURE_COUNT||8);
const FIXTURE_W=240,FIXTURE_H=160;

function browserBin(){
  for(const n of ['google-chrome-stable','google-chrome','chromium-browser','chromium']){
    const r=spawnSync('which',[n],{encoding:'utf8'});
    if(r.status===0&&r.stdout.trim())return r.stdout.trim();
  }
  for(const p of ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/Applications/Brave Browser.app/Contents/MacOS/Brave Browser','/Applications/Chromium.app/Contents/MacOS/Chromium']){
    if(fs.existsSync(p))return p;
  }
  throw Error('No Chrome/Chromium for FOLD BLOOM image clock smoke');
}

// ── synthetic fixture PNGs (no deps, no disk, no archive bytes) ──────────────
function crc32(buf){
  let c=~0;
  for(let i=0;i<buf.length;i++){
    c^=buf[i];
    for(let k=0;k<8;k++)c=(c>>>1)^(0xEDB88320&-(c&1));
  }
  return (~c)>>>0;
}
function chunk(type,data){
  const len=Buffer.alloc(4);len.writeUInt32BE(data.length,0);
  const tag=Buffer.from(type,'ascii');
  const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(Buffer.concat([tag,data])),0);
  return Buffer.concat([len,tag,data,crc]);
}
function pngBytes(width,height,pixel){
  const raw=Buffer.alloc((width*3+1)*height);
  let o=0;
  for(let y=0;y<height;y++){
    raw[o++]=0;
    for(let x=0;x<width;x++){const rgb=pixel(x,y);raw[o++]=rgb[0];raw[o++]=rgb[1];raw[o++]=rgb[2]}
  }
  const ihdr=Buffer.alloc(13);
  ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);
  ihdr[8]=8;ihdr[9]=2;ihdr[10]=0;ihdr[11]=0;ihdr[12]=0;
  return Buffer.concat([
    Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),
    chunk('IHDR',ihdr),
    chunk('IDAT',zlib.deflateSync(raw,{level:6})),
    chunk('IEND',Buffer.alloc(0))
  ]);
}
function fixture(index){
  const hue=(index*37)%360;
  const c=Math.round(0.42*255),x=Math.round(0.62*(255-c));
  const base=[Math.round(c+ (hue<120? x:0)),Math.round(c+(hue>=120&&hue<240? x:0)),Math.round(c+(hue>=240? x:0))];
  const bars=index+1;
  return pngBytes(FIXTURE_W,FIXTURE_H,(px,py)=>{
    if(py<26)return [12,14,18];                       // leader header
    if(py>=FIXTURE_H-40&&py<FIXTURE_H-34)return [12,14,18];
    if(py>=FIXTURE_H-34){                             // N bars = this frame's ordinal
      const slot=Math.floor(px/(FIXTURE_W/bars));
      return (slot%2===0)?[242,243,239]:[12,14,18];
    }
    if(px<4||px>=FIXTURE_W-4)return [12,14,18];
    return base;
  });
}
const FIXTURES=Array.from({length:FIXTURE_COUNT},(_,i)=>fixture(i));

function contentType(p){
  if(p.endsWith('.html'))return 'text/html; charset=utf-8';
  if(p.endsWith('.js')||p.endsWith('.mjs'))return 'text/javascript; charset=utf-8';
  if(p.endsWith('.json'))return 'application/json; charset=utf-8';
  if(p.endsWith('.css'))return 'text/css; charset=utf-8';
  if(p.endsWith('.svg'))return 'image/svg+xml';
  if(p.endsWith('.png'))return 'image/png';
  if(p.endsWith('.mp3'))return 'audio/mpeg';
  return 'application/octet-stream';
}
function resolveFile(url){
  let q=decodeURIComponent(String(url||'/').split('?')[0]).replace(/^\/+/,'');
  if(!q)q='index.html';
  if(q.endsWith('/'))q+='index.html';
  const p=path.normalize(path.join(ROOT,q));
  if(!p.startsWith(ROOT))return null;
  if(fs.existsSync(p)&&fs.statSync(p).isFile())return p;
  if(fs.existsSync(p+'.html'))return p+'.html';
  return null;
}

const SAMPLE_COUNT=Number(process.env.IMAGE_SAMPLE_COUNT||8);
const SAMPLE_GAP_MS=Number(process.env.IMAGE_SAMPLE_GAP_MS||1500);

function probe(){
  return `<!doctype html><html><body style="margin:0"><iframe id="f" style="width:430px;height:900px;border:0" src="/fold-bloom/live/"></iframe><pre id="probeResult">PENDING</pre><script>
const f=document.getElementById('f'),o=document.getElementById('probeResult'),rec={};let finished=false;
const errors=[];
// Attach to the frame's window as soon as it exists and re-attach if it is replaced.
// Combined with FoldBloomLive only announcing ready at the END of app.js's module
// body, a module-evaluation failure would fail the boot wait rather than pass silently.
const attach=()=>{
  try{
    const w=f.contentWindow;
    if(!w||w.__fbErrHook)return;
    w.__fbErrHook=true;
    w.addEventListener('error',e=>errors.push('uncaught: '+String(e?.message||e)));
    w.addEventListener('unhandledrejection',e=>errors.push('rejection: '+String(e?.reason)));
    const ce=w.console.error.bind(w.console);
    w.console.error=(...a)=>{errors.push('console.error: '+a.map(String).join(' ').slice(0,240));ce(...a)};
  }catch(_){}
};
attach();const errTick=setInterval(attach,5);
const done=(ok,data)=>{if(finished)return;finished=true;o.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(data)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const wait=async(fn,limit=20000,label='condition')=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(60)}throw Error('timeout '+label)};
(async()=>{
 const mark=name=>{if(!finished)o.textContent=name+' mark='+JSON.stringify({t:+(W().performance.now()/1000).toFixed(1),files:rec.fileTypes?.length||0,set:!!rec.declared})};
 const W=()=>f.contentWindow,D=()=>W().document;
 mark('WAIT-BOOT');
 const api=await wait(()=>W().FoldBloomLive?.boot==='ready'&&W().FoldBloomLive,20000,'LIVE ready');
 const root=()=>D().documentElement;
 // Count every human interaction in the frame. The whole point is that this stays 0.
 let interactions=0;
 for(const type of ['pointerdown','pointerup','click','keydown','touchstart'])D().addEventListener(type,()=>{interactions++},true);
 // Build the set the only way the picker can: real File objects, distinct bytes.
 // They must be constructed IN the LIVE frame's realm — local-media-store.js requires
 // a real Blob by identity check, and a parent-realm File would not satisfy it.
 const win=W();
 const files=[];
 mark('FIXTURES');
 for(let i=0;i<${FIXTURE_COUNT};i++){
   const res=await win.fetch('/__smoke/image-fixture/'+i+'.png');
   if(!res.ok)throw Error('fixture '+i+' -> '+res.status);
   const blob=await res.blob();
   files.push(new win.File([blob],'synthetic-frame-'+i+'.png',{type:'image/png',lastModified:0}));
 }
 rec.bytes=files.reduce((n,x)=>n+x.size,0);
 rec.fileTypes=files.map(x=>x.type);
 const sizeIds=new Set(files.map(x=>x.name));
 rec.distinctNames=sizeIds.size;
 mark('DECLARE');
 const set=await api.images.declare(files);
 if(!set)throw Error('declare returned nothing');
 mark('DECLARED');
 rec.declared={setKey:set.setKey,points:set.points,grain:set.grain,running:set.running,summary:set.summary,address:set.address};
 rec.mode=api.course.mode();
 rec.kind=root().dataset.foldBloomCourseKind;
 rec.policy=root().dataset.foldBloomCoursePolicy;
 rec.law=D().getElementById('courseLaw')?.textContent||'';
 const stage=D().getElementById('imageStage');
 rec.stagePresent=!!stage;
 // SAMPLES. No call of any kind between them: the address either moves itself or it does not.
 const samples=[];
 for(let i=0;i<${SAMPLE_COUNT};i++){
   mark('SAMPLE-'+i);
   samples.push({
     t:+(W().performance.now()/1000).toFixed(3),
     api:api.course.address(),
     dom:D().getElementById('courseAddress')?.textContent||null,
     trail:root().dataset.foldBloomImageTrail||null,
     advances:Number(root().dataset.foldBloomImageAdvances||0),
     stageAddress:stage?.dataset?.address||null,
     stageSrc:stage?.getAttribute('src')?String(stage.getAttribute('src')).slice(0,12):null,
     witness:D().getElementById('courseWitness')?.textContent||null
   });
   await sleep(${SAMPLE_GAP_MS});
 }
 rec.samples=samples;
 rec.interactions=interactions;
 rec.distinctAddresses=[...new Set(samples.map(s=>s.api))].length;
 rec.addressMoved=samples.filter((s,i)=>i&&s.api&&s.api!==samples[i-1].api).length;
 rec.captionMoved=[...new Set(samples.map(s=>s.witness))].length;
 // The auditable trail: one entry per address the set actually entered, with the
 // set-clock second it entered it. This is the artifact an independent reader can
 // check without trusting this harness's pass/fail.
 const last=samples[samples.length-1];
 rec.trail=last.trail;
 rec.trailSegments=String(last.trail||'').split(';').filter(Boolean).length;
 rec.trailAdvances=Number(last.advances||0);
 rec.stageDistinct=[...new Set(samples.map(s=>s.stageAddress))].length;
 // FLOW/STEP were not bypassed: STEP holds the set, and one tap moves exactly one address.
 api.course.setMode('STEP',false);
 const heldA=api.course.address();
 await sleep(2600);
 const heldB=api.course.address();
 rec.heldStable=heldA===heldB;
 rec.held=heldB;
 const idx=x=>{const m=/\\/(\\d+)@/.exec(String(x||''));return m?Number(m[1]):-1};
 api.course.step(1);
 rec.stepFrom=idx(heldB);rec.stepTo=idx(api.course.address());
 rec.stepOne=rec.stepTo-rec.stepFrom===1;
 const afterStep=api.course.address();
 await sleep(1200);
 rec.stepHeld=api.course.address()===afterStep;
 api.course.setMode('FLOW',false);
 await sleep(3200);
 rec.resumed=api.course.address()!==afterStep;
 rec.returnedSetRunning=root().dataset.foldBloomImageRunning;
 api.images.clear();
 rec.returnedAddress=D().getElementById('courseAddress')?.textContent||null;
 rec.returnedKind=root().dataset.foldBloomCourseKind;
 clearInterval(errTick);
 rec.consoleErrors=errors.slice(0,8);
 const pass=
   rec.declared.points===${FIXTURE_COUNT}&&rec.declared.grain==='FRAME'&&rec.declared.running===true&&
   rec.declared.summary==='${FIXTURE_COUNT} IMAGES · FRAME · ${FIXTURE_COUNT * 3}s CYCLE'&&
   rec.distinctNames===${FIXTURE_COUNT}&&
   rec.mode==='FLOW'&&rec.policy==='SOURCE_CLOCK'&&rec.kind==='IMAGE_SET'&&
   rec.consoleErrors.length===0&&
   rec.distinctAddresses>=3&&rec.addressMoved>=2&&
   rec.trailSegments>=4&&rec.trailAdvances>=3&&rec.stageDistinct>=3&&
   rec.interactions===0&&
   rec.heldStable===true&&rec.stepOne===true&&rec.stepHeld===true&&rec.resumed===true&&
   rec.stagePresent===true&&
   rec.returnedAddress==='course://audio_map/empty'&&rec.returnedKind==='NONE';
 done(pass,rec);
})().catch(e=>done(false,{...rec,error:String(e?.stack||e)}));
<\/script></body></html>`;
}

const server=http.createServer((req,res)=>{
  const url=String(req.url||'');
  const fixtureMatch=/^\/__smoke\/image-fixture\/(\d+)\.png$/.exec(url);
  if(fixtureMatch){
    const i=Number(fixtureMatch[1]);
    if(!(i>=0&&i<FIXTURES.length)){res.writeHead(404);res.end('no fixture');return}
    res.writeHead(200,{'content-type':'image/png','content-length':FIXTURES[i].length,'cache-control':'no-store'});
    res.end(FIXTURES[i]);return;
  }
  if(url.startsWith('/__probe')){
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
    res.end(probe());return;
  }
  const file=resolveFile(url);
  if(!file){res.writeHead(404);res.end('not found');return}
  res.writeHead(200,{'content-type':contentType(file),'cache-control':'no-store'});
  fs.createReadStream(file).pipe(res);
});

function run(bin,{profile=null,url=null,budget=180000}={}){
  return new Promise((resolve,reject)=>{
    const a=['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required','--window-size=430,960','--virtual-time-budget='+budget,'--dump-dom'];
    if(profile)a.push('--user-data-dir='+profile);
    a.push(url||('http://'+HOST+':'+PORT+'/__probe'));
    const p=spawn(bin,a,{stdio:['ignore','pipe','pipe']});
    let out='',err='';
    const tm=setTimeout(()=>{p.kill('SIGKILL');reject(Error('timeout'))},120000);
    p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);
    p.on('error',e=>{clearTimeout(tm);reject(e)});
    p.on('close',code=>{clearTimeout(tm);resolve({code,out,err})});
  });
}

await new Promise((resolve,reject)=>server.listen(PORT,HOST,e=>e?reject(e):resolve()));
PORT=server.address().port;
// Pre-flight: a syntax error in an inline instrument script otherwise surfaces as a
// bare "PENDING" from a page that never executed, which reads like a timing flake.
for(const [name,builder] of [['probe',probe]]){
  const body=(builder().match(/<script>([\s\S]*?)<\/script>/)||[])[1]||'';
  try{new Function(body)}
  catch(e){console.error('IMAGE CLOCK HARNESS '+name+' inline script does not parse:',String(e.message));process.exit(1)}
}
try{
  const r=await run(browserBin());
  const m=r.out.match(/id="probeResult"[^>]*>([\s\S]*?)<\/pre>/i);
  const result=(m?.[1]||'').replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim();
  const fatal=/Uncaught (?:TypeError|ReferenceError|SyntaxError)|net::ERR_|Aw, Snap/i.test(r.err);
  if(r.code!==0||fatal||!result.startsWith('PASS ')){
    console.error('IMAGE CLOCK SMOKE FAIL',result||'(no result)');
    console.error('IMAGE CLOCK DUMP HEAD',JSON.stringify(String(r.out).slice(0,300)));
    console.error('IMAGE CLOCK DUMP LEN',r.out.length,'EXIT',r.code);
    const probeBody=(probe().match(/<script>([\s\S]*?)<\/script>/)||[])[1]||'';
    try{new Function(probeBody);console.error('IMAGE CLOCK PROBE SYNTAX ok')}
    catch(e){console.error('IMAGE CLOCK PROBE SYNTAX',String(e.message))}
    if(r.err.trim())console.error(r.err.slice(-1200));
    process.exitCode=1;
  }else{
    const parsed=JSON.parse(result.slice(5));
    console.log('IMAGE CLOCK SMOKE PASS',result.slice(5));
    console.log('IMAGE CLOCK TRAIL',parsed.trail);
    console.log('IMAGE CLOCK SAMPLES',JSON.stringify(parsed.samples.map(s=>({t:s.t,address:s.api,witness:s.witness}))));
    // ── PHASE 2: an INDEPENDENT second run of the same instrument ─────────────
    // Same page, smaller virtual-time budget, separate browser process, zero clicks.
    // The set must drive itself a second time — not because anything was carried over,
    // but because the declaration is the only input either run is ever given. Both runs
    // landing on the same set key also proves the declaration is byte-deterministic.
    console.log('IMAGE CLOCK DOM SERIES',JSON.stringify(parsed.samples.map(s=>({t:s.t,dom:s.dom,witness:s.witness}))));
    // IMAGE_SECOND_BUDGET lets a second, independent run use a smaller virtual-time
    // budget; the budget is an instrument parameter, not part of the claim.
    const rerun=await run(browserBin(),{budget:Number(process.env.IMAGE_SECOND_BUDGET||60000)});
    const rm=rerun.out.match(/id="probeResult"[^>]*>([\s\S]*?)<\/pre>/i);
    const rresult=(rm?.[1]||'(no result)').replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim();
    let second=null;
    try{second=JSON.parse(rresult.slice(5))}catch(_){second=null}
    const secondOk=rresult.startsWith('PASS ')&&!!second;
    console.log('IMAGE CLOCK SECOND RUN',JSON.stringify(secondOk?{
      budget:60000,ok:true,setKey:second.declared?.setKey,distinctAddresses:second.distinctAddresses,
      addressMoved:second.addressMoved,interactions:second.interactions,trail:second.trail,
      trailAdvances:second.trailAdvances,stageDistinct:second.stageDistinct,
      heldStable:second.heldStable,stepOne:second.stepOne
    }:{budget:60000,ok:false,result:rresult.slice(0,300)}));
    const ok2=secondOk&&second.interactions===0&&second.distinctAddresses>=3
      &&second.trailAdvances>=3&&second.stageDistinct>=3&&second.heldStable===true&&second.stepOne===true
      &&second.declared?.setKey===parsed.declared?.setKey;
    if(!ok2){
      console.error('IMAGE CLOCK SECOND RUN FAIL');
      process.exitCode=1;
    }else{
      console.log('IMAGE CLOCK REPRODUCED',JSON.stringify({runs:2,sameSetKey:true,trails:[parsed.trail,second.trail]}));
    }
  }
}finally{
  await new Promise(r=>server.close(()=>r()));
}