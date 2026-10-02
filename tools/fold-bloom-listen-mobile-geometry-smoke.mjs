#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';

const ROOT=process.cwd(),HOST='127.0.0.1',PORT=41791;
function browserBin(){
  for(const name of ['google-chrome-stable','google-chrome','chromium-browser','chromium','brave-browser','brave']){
    const r=spawnSync('which',[name],{encoding:'utf8'});if(r.status===0&&r.stdout.trim())return r.stdout.trim();
  }
  for(const p of ['/Applications/Brave Browser.app/Contents/MacOS/Brave Browser','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/Applications/Chromium.app/Contents/MacOS/Chromium'])if(fs.existsSync(p))return p;
  throw Error('No Chrome/Chromium');
}
function type(p){if(p.endsWith('.html'))return'text/html; charset=utf-8';if(p.endsWith('.js')||p.endsWith('.mjs'))return'text/javascript; charset=utf-8';if(p.endsWith('.json'))return'application/json; charset=utf-8';if(p.endsWith('.css'))return'text/css; charset=utf-8';if(p.endsWith('.mp3'))return'audio/mpeg';return'application/octet-stream'}
function fileFor(url){let clean=decodeURIComponent(String(url||'/').split('?')[0]).replace(/^\/+/, '');if(!clean)clean='index.html';if(clean.endsWith('/'))clean+='index.html';const p=path.normalize(path.join(ROOT,clean));if(!p.startsWith(ROOT))return null;if(fs.existsSync(p)&&fs.statSync(p).isFile())return p;return null}

function probe(){return `<!doctype html><html><body style="margin:0"><img id="hold" src="/__hold" hidden><iframe id="f" style="width:430px;height:900px;border:0;display:block"></iframe><pre id="probeResult">PENDING</pre><script type="module">
const out=document.getElementById('probeResult'),f=document.getElementById('f'),hold=document.getElementById('hold'),rec={};let doneFlag=false;
const done=(ok,data)=>{if(doneFlag)return;doneFlag=true;out.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(data);hold.src='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const wait=async(fn,limit=26000)=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(80)}throw Error('wait timeout')};
const box=el=>{const r=el.getBoundingClientRect();return{x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),right:+r.right.toFixed(1),bottom:+r.bottom.toFixed(1)}};
const hit=(d,el)=>{const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,n=d.elementFromPoint(x,y);return!!n&&(n===el||el.contains(n))};
try{
  f.src='/fold-bloom/listen/';
  await wait(()=>f.contentWindow?.FoldBloomListen?.boot==='ready');
  const w=f.contentWindow,d=w.document,choose=d.getElementById('chooseLabel');
  rec.viewport=[w.innerWidth,w.innerHeight];rec.scrollWidth=d.documentElement.scrollWidth;rec.initialChoose=box(choose);rec.initialChooseHit=hit(d,choose);
  const fixture=await fetch('/fold-bloom/listen/test-fixtures/pulse-120bpm-2s.mp3'),blob=await fixture.blob(),file=new File([blob],'pulse-120bpm-2s.mp3',{type:'audio/mpeg'}),dt=new DataTransfer();dt.items.add(file);const input=d.getElementById('file');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
  await wait(()=>{const s=w.FoldBloomListen?.state?.();return s?.fileMeta?.hash&&s?.map?s:null},26000);await sleep(220);
  const overlay=d.getElementById('overlay'),field=d.getElementById('field'),scope=d.querySelector('.scopeRail'),transport=d.querySelector('.transportBar'),drop=d.getElementById('drop');
  rec.field=box(field);rec.overlay=box(overlay);rec.scope=box(scope);rec.transport=box(transport);rec.clearGap=+(transport.getBoundingClientRect().top-scope.getBoundingClientRect().bottom).toFixed(1);rec.dropHidden=getComputedStyle(drop).display==='none';rec.noOverflow=d.documentElement.scrollWidth<=w.innerWidth+1;
  rec.overlayVisible=rec.overlay.w>=420&&rec.overlay.h>=890;
  rec.controls={};
  for(const id of ['loadBtn','transport','pinBtn','useBtn']){const el=d.getElementById(id),r=box(el);rec.controls[id]={...r,hit:hit(d,el),enabled:!el.disabled}}
  d.getElementById('useBtn').click();await sleep(100);const sheet=d.getElementById('useSheet'),close=d.getElementById('closeUse');rec.useSheet=box(sheet);rec.useCloseHit=hit(d,close);rec.useInsideAperture=sheet.getBoundingClientRect().top>=scope.getBoundingClientRect().bottom-2&&sheet.getBoundingClientRect().bottom<=transport.getBoundingClientRect().top+2;close.click();
  const controlOk=Object.values(rec.controls).every(x=>x.w>=54&&x.h>=40&&x.hit);
  const ok=rec.viewport[0]===430&&rec.noOverflow&&rec.initialChoose.w>=44&&rec.initialChoose.h>=44&&rec.initialChooseHit&&rec.overlayVisible&&rec.dropHidden&&rec.clearGap>=300&&controlOk&&rec.controls.pinBtn.enabled&&rec.controls.useBtn.enabled&&rec.useInsideAperture&&rec.useCloseHit;
  done(ok,rec);
}catch(error){done(false,{error:String(error?.stack||error),...rec})}
setTimeout(()=>done(false,{error:'probe timeout',...rec}),42000);
<\/script></body></html>`}

const holds=new Set();
const server=http.createServer((req,res)=>{
  if(String(req.url).startsWith('/__hold')){holds.add(res);req.on('close',()=>holds.delete(res));return}
  if(String(req.url).startsWith('/__listen_mobile_geometry')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(probe());return}
  const file=fileFor(req.url);if(!file){res.writeHead(404);res.end('not found');return}res.writeHead(200,{'content-type':type(file),'cache-control':'no-store'});fs.createReadStream(file).pipe(res)
});
await new Promise(r=>server.listen(PORT,HOST,r));
const bin=browserBin(),args=['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--hide-scrollbars','--autoplay-policy=no-user-gesture-required','--window-size=520,960','--dump-dom',`http://${HOST}:${PORT}/__listen_mobile_geometry`];
const result=await new Promise((resolve,reject)=>{const p=spawn(bin,args,{stdio:['ignore','pipe','pipe']});let out='',err='';const timer=setTimeout(()=>{p.kill('SIGKILL');reject(Error('timeout'))},50000);p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('close',code=>{clearTimeout(timer);resolve({code,out,err})})});
for(const res of holds){try{res.destroy()}catch(_){}}server.close();
const pass=/id="probeResult">PASS /.test(result.out)&&/"noOverflow":true/.test(result.out)&&/"overlayVisible":true/.test(result.out)&&/"dropHidden":true/.test(result.out)&&/"useInsideAperture":true/.test(result.out)&&/"useCloseHit":true/.test(result.out);
if(!pass){console.error('FOLD BLOOM LISTEN MOBILE GEOMETRY SMOKE FAIL');console.error(result.out.slice(-12000));console.error(result.err.slice(-2600));process.exit(1)}
console.log('FOLD BLOOM LISTEN MOBILE GEOMETRY SMOKE PASS');
