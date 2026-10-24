#!/usr/bin/env node
// Source circuit browser proof: reader-addressed witness enters the canonical city.
// Does NOT simulate native eight-Gate completion or claim user comprehension.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {browserBin} from './browser-bin.mjs';

const root=process.cwd();
const probe=`<!doctype html><meta charset="utf-8">
<iframe id="f" style="width:390px;height:844px;border:0"></iframe><pre id="result">PENDING</pre>
<script>
const f=document.querySelector('#f'),out=document.querySelector('#result');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const assert=(v,message)=>{if(!v)throw Error(message)};
const wait=async(fn,tag)=>{for(let i=0;i<90;i++){try{if(fn())return}catch(_){}await sleep(60)}throw Error('TIMEOUT '+tag)};
const load=url=>new Promise((ok,bad)=>{f.onload=ok;f.onerror=bad;f.src=url});
(async()=>{try{
 await load('/sleeper/axis-score.html');
 let d=f.contentDocument,w=f.contentWindow;
 const source='A signal appeared in the log. A witness asked for a second reading.\\n\\nThe new reading contradicted the first. The instrument remained unchanged.\\n\\nThe operator recorded uncertainty before taking any action.';
 d.querySelector('#textInput').value=source;
 d.querySelector('#title').value='Actual evidence to revisit';
 d.querySelector('#enter').click();
 await wait(()=>!d.querySelector('#work').classList.contains('hidden'),'AXIS entered');
 d.querySelector('#readBtn').click();
 const evidence=d.querySelector('#evidenceOptions button');
 assert(evidence,'exact witness choice missing');
 evidence.click();
 assert(!d.querySelector('#sendCity').disabled,'source witness did not enable handoff');
 d.querySelector('#sendCity').click();
 await wait(()=>f.contentWindow.location.pathname==='/sleeper/'&&f.contentDocument.querySelector('#sourceApertureStatus'),'native handoff');
 w=f.contentWindow;d=w.document;
 const quoted=d.querySelector('#source').value;
 assert(quoted==='A signal appeared in the log.','wrong source span carried: '+quoted);
 assert(d.querySelector('#sourceApertureStatus').textContent.includes('EXACT WITNESS HELD'),'missing source address');
 assert(!w.location.search.includes(encodeURIComponent(source)),'source leaked into navigation URL');
 assert(w.sessionStorage.getItem('sleeper:source-aperture/back/v1')?.includes('Actual evidence to revisit'),'no source reentry');
 assert(!w.sessionStorage.getItem('sleeper:source-aperture/v1'),'inbound packet not consumed');
 for(const width of [320,390,1280]){
   f.style.width=width+'px';await sleep(65);
   assert(d.documentElement.scrollWidth<=width+2,'boot horizontal overflow '+width);
 }
 d.querySelector('#enter').click();
 await wait(()=>!d.querySelector('#app').classList.contains('hidden'),'native city started');
 assert(d.querySelector('#gateCount').textContent==='0/8','external witness minted Gate credit');
 assert(d.querySelector('#returnBtn').disabled,'external witness unlocked RETURN');
 assert(!d.querySelector('#sourceWitnessPanel').classList.contains('hidden'),'source address not visible in city');
 assert(w.eval('game.proofs.length===0 && game.gates.every(g=>!g.collected) && game.sourceWitness?.worldKey===game.law.key'),'native gate ledger touched');
 const privateSource=w.localStorage.getItem('sleeper:last');
 assert(!privateSource||!privateSource.includes(quoted),'private quoted sentence persisted to sleeper:last');
 w.eval('cancelAnimationFrame(raf)');
 // One reversible early return: no fictitious v2 Gate proof, same exact source.
 d.querySelector('#sourceBackNow').click();
 await wait(()=>f.contentWindow.location.pathname==='/sleeper/axis-score.html'&&f.contentDocument.querySelector('#work')&&!f.contentDocument.querySelector('#work').classList.contains('hidden'),'source early return');
 d=f.contentDocument;w=f.contentWindow;
 assert(d.querySelector('#textInput').value===source,'return replaced source bytes');
 assert(d.querySelector('#error').textContent.includes('EARLY SOURCE RETURN'),'early exit masquerades as completed Gate return');
 assert(!w.location.search.includes(encodeURIComponent(source)),'early return leaked source into URL');
 // Malformed source handoffs reject closed; ordinary boot still works.
 w.sessionStorage.setItem('sleeper:source-aperture/v1','{invalid');
 await load('/sleeper/');
 d=f.contentDocument;
 assert(d.querySelector('#sourceApertureStatus').textContent.includes('SOURCE HANDOFF REJECTED'),'malformed handoff accepted');
 assert(d.querySelector('#enter')&&!d.querySelector('#enter').disabled,'rejected handoff broke native boot');
 out.textContent='PASS EXACT SOURCE → CITY · 320/390/1280 · EARLY EXACT RETURN · NO GATE MUTATION · NO URL/LOCAL LAST LEAK · FAIL CLOSED';
}catch(e){out.textContent='FAIL '+String(e.stack||e)}})();
<\/script>`;
const server=http.createServer((req,res)=>{
 if(req.url==='/__probe'){res.setHeader('content-type','text/html');return res.end(probe)}
 let p=path.resolve(root,'.'+decodeURI(req.url.split('?')[0]));
 if(!p.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 if(fs.existsSync(p)&&fs.statSync(p).isDirectory())p=path.join(p,'index.html');
 if(!fs.existsSync(p)){res.writeHead(404);return res.end()}
 res.setHeader('content-type',p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':'text/html');
 fs.createReadStream(p).pipe(res);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try{
 const result=await new Promise((resolve,reject)=>{
  const p=spawn(browserBin(),['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--window-size=1440,1000','--virtual-time-budget=6500','--dump-dom','http://127.0.0.1:'+server.address().port+'/__probe']);
  let out='',err='';
  const timer=setTimeout(()=>{p.kill('SIGKILL');reject(Error('source smoke timeout'))},30000);
  p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',reject);
  p.on('close',code=>{clearTimeout(timer);resolve({code,out,err})});
 });
 const found=result.out.match(/<pre id="result">([\s\S]*?)<\/pre>/);
 if(result.code||!found?.[1].startsWith('PASS '))throw Error((found?.[1]||'no result')+'\n'+result.err.slice(-1000));
 console.log('SLEEPER SOURCE CIRCUIT BROWSER:',found[1]);
}finally{server.close()}
