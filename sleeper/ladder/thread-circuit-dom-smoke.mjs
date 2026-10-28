import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {browserBin} from '../../tools/browser-bin.mjs';
const root=process.cwd();
const probe=String.raw`<!doctype html><meta charset="utf-8"><iframe id="host" style="width:390px;height:860px;border:0"></iframe><pre id="result">PENDING</pre>
<script>
const f=document.getElementById('host'),out=document.getElementById('result');
const sleep=n=>new Promise(r=>setTimeout(r,n));
const assert=(v,m)=>{if(!v)throw Error(m)};
const wait=async(fn,label)=>{for(let i=0;i<140;i++){let x;try{x=fn()}catch(e){}if(x)return x;await sleep(55)}throw Error('TIMEOUT '+label)};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function stable(s){return {distance:s.distance,witness:s.witness,walker:s.walker,lit:s.lit,breath:s.breath,moves:s.moves,seed:s.seed};}
(async()=>{try{
 f.src='/sleeper/ladder/';
 const d=await wait(()=>f.contentDocument?.querySelector('#prov'),'Ladder HTML');
 const L=await wait(()=>f.contentWindow?.SleeperLadder,'Ladder API');
 await L.ready;
 assert(L.state().ready,'source and painting load must succeed');
 const read=d.querySelector('#prov');
 const bridge=await wait(()=>f.contentWindow?.SleeperLadderRead,'bridge script loaded');await wait(()=>read.textContent.includes(' · READ '),'READ source address, current='+String(bridge.current())+', text='+read.textContent.slice(-150));assert(read.getAttribute('role')==='button'&&read.tabIndex===0,'provenance is keyboard accessible');
 for(const width of [320,390,1280]){
  f.style.width=width+'px';await sleep(80);
  const r=read.getBoundingClientRect();
  assert(r.width>=70&&r.left>=0&&r.right<=width+2,'read aperture fits '+width);
 }
 f.style.width='390px';await sleep(70);
 const before=stable(L.state());
 read.click();
 const overlay=d.querySelector('#ladderOverlay'),inner=d.querySelector('#ladderFrame');
 assert(overlay&&overlay.isConnected,'reader overlay opened');
 const rd=await wait(()=>inner.contentDocument?.querySelector('#readingPlay')?.shadowRoot,'Threadwalk shadow');
 await wait(()=>rd.querySelector('#ladderContext')?.textContent?.includes('RIGHT VIEW'),'source projection');
 assert(rd.querySelector('#passage')?.textContent.includes('right view'),'factor line visible');
 assert(rd.querySelector('#ladderContext')?.textContent.includes('ABRIDGED DERIVED SELECTION'),'rights and provenance boundary');
 assert(rd.querySelectorAll('#ladderContext a').length>=3,'book and canonical Sutta cross-references');
 assert(rd.querySelector('#ladderContext a').href.startsWith('https://buddhadhamma.github.io/'),'real book link');
 assert(rd.querySelector('#where').textContent.includes('1 / 8'),'entry starts at first gate');
 const sentence=rd.querySelector('#passage button');
 assert(sentence,'source exact sentence available');
 sentence.click();
 await wait(()=>rd.querySelector('#stateStatus')?.textContent.includes('WITNESS'),'hold propagates to existing reader');
 rd.querySelector('#next').click();
 await wait(()=>rd.querySelector('#where')?.textContent.includes('2 / 8'),'real source navigation');
 assert(same(stable(L.state()),before),'reading has not moved walker, spent breath, lit Gate or changed witness');
 rd.querySelector('#exit').click();
 await wait(()=>!d.querySelector('#ladderOverlay'),'source-to-Ladder return message');
 assert(same(stable(L.state()),before),'same native walk after close');
 read.click();
 await wait(()=>!!d.querySelector('#ladderOverlay'),'reopen');
 d.querySelector('#ladderClose').click();
 assert(!d.querySelector('#ladderOverlay'),'explicit close works');
 assert(same(stable(L.state()),before),'reversible close');
 out.textContent='PASS Ladder → source-exact abridged Threadwalk → same Ladder / 320,390,1280 / original law unchanged';
}catch(e){out.textContent='FAIL '+String(e.stack||e)}})();
</script>`;
const server=http.createServer((req,res)=>{
 if(req.url==='/__probe'){res.setHeader('content-type','text/html');return res.end(probe)}
 const pathname=decodeURIComponent(req.url.split('?')[0]);let file=path.resolve(root,'.'+pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
 if(!fs.existsSync(file)){res.writeHead(404);return res.end()}
 const ext=path.extname(file),mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
 res.setHeader('content-type',mime[ext]||'text/plain');fs.createReadStream(file).pipe(res);
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
try{
 const result=await new Promise((resolve,reject)=>{
  const p=spawn(browserBin(),['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--window-size=1500,1050','--virtual-time-budget=13000','--dump-dom','http://127.0.0.1:'+server.address().port+'/__probe']);
  let out='',err='';const timeout=setTimeout(()=>{p.kill('SIGKILL');reject(Error('Ladder reading browser timed out'))},40000);
  p.stdout.on('data',x=>out+=x);p.stderr.on('data',x=>err+=x);p.on('error',reject);
  p.on('close',code=>{clearTimeout(timeout);resolve({code,out,err})});
 });
 const match=result.out.match(/<pre id="result">([\s\S]*?)<\/pre>/);
 if(result.code||!match?.[1]?.startsWith('PASS'))throw Error((match?.[1]||'no DOM proof')+'\n'+result.err.slice(-1000));
 console.log('LADDER READ DOM',match[1]);
}finally{server.close()}
