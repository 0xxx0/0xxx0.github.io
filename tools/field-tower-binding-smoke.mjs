#!/usr/bin/env node
// FIELD landing: one native source, bound gate, real AXIAL cross-binding, inverse RETURN.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {browserBin} from './browser-bin.mjs';
const root=process.cwd(),host='127.0.0.1';
const html=`<!doctype html><html><body style="margin:0">
<iframe id="field" style="width:390px;height:850px;border:0" src="/"></iframe>
<pre id="result">PENDING</pre>
<script>
const frame=document.getElementById('field'),out=document.getElementById('result'),rec={};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const wait=async(fn,label,ms=24000)=>{const until=Date.now()+ms;while(Date.now()<until){try{const x=fn();if(x)return x}catch(e){}await sleep(100)}throw Error('timeout '+label)};
const done=(ok,x)=>out.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(x);
(async()=>{try{
 const W=()=>frame.contentWindow,D=()=>W().document;
 await wait(()=>W().LandingTower?.state?.().ready&&W().LandingTower?.state?.().source==='field-axes'&&W().FieldIndexReadModel?.aperture,'FIELD boot');
 const api=W().LandingTower,selection=()=>W().FieldAxisSelection(),read=()=>W().FieldIndexReadModel.aperture();
 const before=JSON.stringify(selection()),start=api.state();
 rec.source=start.source;rec.rings=start.rings.map(r=>r.key);
 rec.initialWitness=start.witness;rec.nativeWitness=read();
 rec.gateAtBoot=rec.rings.every(k=>api.state().rings.find(r=>r.key===k).gate===selection()[k]);
 api.bind('operation');
 rec.bound=api.state().focusKey;
 rec.bindNoChange=JSON.stringify(selection())===before;
 rec.shared=W().localStorage.getItem('axial.binding.FIELD');
 const opBefore=selection().operation;
 api.turn(1);
 await wait(()=>api.state().rings.find(r=>r.key==='operation').gate===selection().operation,'native detent');
 rec.opTurn={before:opBefore,after:selection().operation,gate:api.state().rings.find(r=>r.key==='operation').gate};
 rec.afterWitness=api.state().witness;
 rec.hostWitness=read();
 rec.gateText=D().querySelector('#tower .tw-tag')?.textContent||'';
 const hostAfter=JSON.stringify(selection());
 const stage=D().querySelector('#tower .tw-stage');
 const svg=D().querySelector('#tower-svg');
 const rect=svg.getBoundingClientRect();
 stage.dispatchEvent(new (W().PointerEvent)('pointermove',{bubbles:true,clientY:rect.top+rect.height*.2,clientX:rect.left+rect.width*.4}));
 rec.hoverBind=api.state().focusKey;
 rec.hoverNoChange=JSON.stringify(selection())===hostAfter;
 api.bind('route');
 rec.routeBind=api.state().focusKey;
 rec.sharedAfterRoute=W().localStorage.getItem('axial.binding.FIELD');
 api.bind('state');
 rec.sharedAfterState=W().localStorage.getItem('axial.binding.FIELD');
 W().FieldAxisHold('state','ANY');
 await wait(()=>api.state().rings.find(r=>r.key==='state').gate==='ANY','host native sync');
 rec.sync={gate:api.state().rings.find(r=>r.key==='state').gate,bind:api.state().focusKey,host:selection().state};
 const beforeKey=api.state().focusKey,preSelection=JSON.stringify(selection());
 svg.dispatchEvent(new (W().KeyboardEvent)('keydown',{key:'ArrowUp',bubbles:true,cancelable:true}));
 rec.keyboard={before:beforeKey,after:api.state().focusKey,selectionStable:JSON.stringify(selection())===preSelection};
 api.bind('operation');
 const expectedNativeTuple=JSON.stringify(selection()),expectedLive=read().live,expectedFocus=read().focus;
 const actualUrl=W().location.href,oldApi=api;
 frame.src=actualUrl;
 await wait(()=>W().LandingTower?.state?.().source==='field-axes'&&W().LandingTower!==oldApi,'reentry');
 rec.reload={bound:W().LandingTower.state().focusKey,aperture:W().LandingTower.state().witness,native:W().FieldIndexReadModel.aperture(),tuple:W().FieldAxisSelection()};
 rec.width390=D().documentElement.scrollWidth-D().documentElement.clientWidth;
 frame.style.width='320px';await sleep(250);
 rec.width320=D().documentElement.scrollWidth-D().documentElement.clientWidth;
 frame.style.width='1280px';await sleep(250);
 rec.width1280=D().documentElement.scrollWidth-D().documentElement.clientWidth;
 const p=document.createElement('iframe');p.src='/foundry/axial/?bind=operation';p.style='display:none';document.body.append(p);
 await wait(()=>p.contentWindow?.AxialFocusAPI?.snapshot?.()?.rings?.length>=4,'AXIAL receiver',20000);
 rec.nativeAxial=p.contentWindow.AxialFocusAPI.snapshot().active_ring;
 const pass=rec.source==='field-axes'&&rec.rings.length===4&&rec.gateAtBoot&&
   rec.initialWitness?.live===rec.nativeWitness.live&&rec.initialWitness?.total===rec.nativeWitness.total&&
   rec.bound==='operation'&&rec.bindNoChange&&rec.shared==='operation'&&rec.opTurn.after!==rec.opTurn.before&&rec.opTurn.after===rec.opTurn.gate&&
   rec.afterWitness?.live===rec.hostWitness.live&&rec.afterWitness?.total===rec.hostWitness.total&&
   rec.gateText.includes((rec.hostWitness.live===0?'DEAD':'LIVE')+' '+rec.hostWitness.live+'/'+rec.hostWitness.total)&&
   rec.hoverBind==='operation'&&rec.hoverNoChange&&rec.routeBind==='route'&&rec.sharedAfterRoute==='operation'&&rec.sharedAfterState==='state'&&
   rec.sync.gate==='ANY'&&rec.sync.host==='ANY'&&rec.sync.bind==='state'&&rec.keyboard.selectionStable&&rec.keyboard.after!==rec.keyboard.before&&
   rec.reload.bound==='operation'&&rec.reload.aperture?.live===rec.reload.native.live&&
   rec.reload.native.live===expectedLive&&rec.reload.native.focus===expectedFocus&&JSON.stringify(rec.reload.tuple)===expectedNativeTuple&&
   rec.width390<=1&&rec.width320<=1&&rec.width1280<=1&&rec.nativeAxial==='operation';
 done(pass,rec);
}catch(e){done(false,{...rec,error:String(e?.stack||e)})}})();
<\/script></body></html>`;
const ct=p=>p.endsWith('.html')?'text/html':p.endsWith('.js')||p.endsWith('.mjs')?'text/javascript':p.endsWith('.json')?'application/json':p.endsWith('.css')?'text/css':'text/plain';
const server=http.createServer((req,res)=>{
 if(String(req.url||'').startsWith('/__proof')){res.writeHead(200,{'content-type':'text/html;charset=utf-8','cache-control':'no-store'});res.end(html);return}
 let p=decodeURIComponent(String(req.url||'/').split('?')[0]).replace(/^\/+/,'');
 if(!p||p.endsWith('/'))p+='index.html';
 const full=path.resolve(root,p);
 if(!full.startsWith(root+path.sep)||!fs.existsSync(full)||!fs.statSync(full).isFile()){res.writeHead(404);res.end('not found');return}
 res.writeHead(200,{'content-type':ct(full),'cache-control':'no-store'});fs.createReadStream(full).pipe(res)
});
await new Promise(r=>server.listen(0,host,r));const port=server.address().port;
try{
 const x=await new Promise((resolve,reject)=>{
   const proc=spawn(browserBin(),['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--window-size=1350,900','--virtual-time-budget=35000','--dump-dom','http://'+host+':'+port+'/__proof'],{stdio:['ignore','pipe','pipe']});
   let stdout='',stderr='';const tm=setTimeout(()=>{proc.kill('SIGKILL');reject(Error('browser timeout'))},55000);
   proc.stdout.on('data',b=>stdout+=b);proc.stderr.on('data',b=>stderr+=b);
   proc.on('close',code=>{clearTimeout(tm);resolve({code,stdout,stderr})});proc.on('error',reject)
 });
 const m=x.stdout.match(/id="result"[^>]*>([\s\S]*?)<\/pre>/i),result=(m?.[1]||'').replace(/&quot;/g,'"').replace(/&amp;/g,'&').trim();
 if(x.code!==0||!result.startsWith('PASS ')){console.error('FAIL FIELD tower',result||'(missing result)',x.stderr.slice(-700));process.exitCode=1}
 else console.log('PASS FIELD tower',result.slice(5))
}finally{await new Promise(r=>server.close(r))}
