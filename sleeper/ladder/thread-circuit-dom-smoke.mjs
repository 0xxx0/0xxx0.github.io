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
 const d=await wait(()=>f.contentDocument?.querySelector('#prov')&&f.contentDocument,'Ladder HTML');
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
 const support=rd.querySelector('#pathSupport');
 assert(support&&support.textContent.includes('ONE INTEGRATED PATH'),'reader explicitly rejects eight successive attainments');
 const controls=[...support.querySelectorAll('.quick button')];
 assert(controls.length===3,'same source passage has three interdependent supports');
 assert(controls[0].getAttribute('aria-pressed')==='true','view support starts active');
 const beforeSupports=stable(L.state());
 controls[1].click();
 assert(rd.querySelector('#supportPrompt')?.textContent.includes('one skillful response'),'effort changes the actual reading question');
 assert(rd.querySelector('#supportCitation')?.textContent.includes('RIGHT EFFORT · Ch. 18'),'effort links a source-located factor rather than only switching prompt text');
 assert(rd.querySelector('#supportQuote')?.textContent.length>25,'source-located factor excerpt appears on this lens');
 assert(rd.querySelector('#supportInspect')?.textContent.includes('INSPECT RIGHT EFFORT'),'lens offers lawful inspect-only crossing into its source');
 assert(controls[1].getAttribute('aria-pressed')==='true'&&controls[0].getAttribute('aria-pressed')==='false','support lens has exactly one visible active state');
 controls[2].click();
 assert(rd.querySelector('#supportPrompt')?.textContent.includes('observe next'),'mindfulness changes the reading question');
 assert(same(stable(L.state()),beforeSupports),'three reading supports cannot move native walker or earn gate proof');
 assert(support.textContent.includes('not by itself right view'),'gesture limitation visible next to source');
 assert(support.querySelector('a')?.getAttribute('href')==='https://buddhadhamma.github.io/introduction-to-the-middle-way.html','integrated-path claim opens its canonical Payutto source');
 const example=rd.querySelector('#ladderBellParallel');
 assert(example&&example.querySelector('a')?.getAttribute('href')?.includes('bellAt=4'),'right view has exact Bell inference cross-reading');
 example.open=true;
 assert(example.textContent.includes('gardener')&&example.textContent.includes('NOT A PAYUTTO QUOTE'),'original Bell passage and provenance shown');
 assert(rd.querySelector('#rail')?.textContent.includes('RIGHT VIEW'),'number-only passage rail was not replaced by semantic factor labels');

 assert(rd.querySelector('#ladderContext')?.textContent.includes('ABRIDGED DERIVED SELECTION'),'rights and provenance boundary');
 assert(rd.querySelectorAll('#ladderContext a').length>=3,'book and canonical Sutta cross-references');
 assert(rd.querySelector('#ladderContext a').href.startsWith('https://buddhadhamma.github.io/'),'real book link');
 assert(rd.querySelector('#where').textContent.includes('1 / 8'),'entry starts at first gate');
 assert([...rd.querySelectorAll('#quickThreads a')].some(a=>a.href.includes('suttacentral.net/mn117/')),'path factors must expose the canonical MN 117 cross-reading');
 assert([...rd.querySelectorAll('#quickThreads button')].some(b=>b.textContent.includes('EFFORT · ADJUST')),'right effort is an inspect-only support thread');
 assert([...rd.querySelectorAll('#quickThreads button')].some(b=>b.textContent.includes('MINDFULNESS · CHECK')),'right mindfulness is an inspect-only support thread');

 const sentence=rd.querySelector('#passage button');
 assert(sentence,'source exact sentence available');
 sentence.click();
 await wait(()=>rd.querySelector('#stateStatus')?.textContent.includes('WITNESS'),'hold propagates to existing reader');
 rd.querySelector('#next').click();
 await wait(()=>rd.querySelector('#where')?.textContent.includes('2 / 8'),'real source navigation');
 assert(same(stable(L.state()),before),'reading has not moved walker, spent breath, lit Gate or changed witness');
 // A real RIDE is paused when the painting comes back; the same read frame
 // and its exact source witnesses remain alive across multiple returns.
 rd.querySelector('#actions button:nth-child(2)').click();
 const ride=rd.querySelector('#ridePlay');assert(ride,'RIDE control available');
 ride.click();assert(ride.textContent.includes('PAUSE'),'RIDE actually started');
 rd.querySelector('#exit').click();
 await wait(()=>d.querySelector('#ladderOverlay')?.hidden,'reader hidden by source-to-Ladder return');
 await wait(()=>ride.textContent.includes('RIDE'),'reader RIDE paused on hidden frame');
 assert(same(stable(L.state()),before),'native walker and Gate proofs unchanged by reading');

 read.click();
 await wait(()=>!d.querySelector('#ladderOverlay')?.hidden,'reopen same view');
 assert(d.querySelector('#ladderFrame')===inner,'reader frame identity preserved');
 assert(rd.querySelector('#where')?.textContent.includes('2 / 8'),'reader position survived return');
 rd.querySelector('#rail button:first-child').click();
 await wait(()=>rd.querySelector('#where')?.textContent.includes('1 / 8'),'inspect the original witness again');
 assert(rd.querySelector('#passage button.held'),'held exact witness survived painting return');
 d.querySelector('#ladderClose').click();
 assert(d.querySelector('#ladderOverlay')?.hidden,'explicit close hides source aperture');
 read.click();
 assert(d.querySelector('#ladderFrame')===inner,'repeated open reuses same frame');
 d.querySelector('#ladderClose').click();
 assert(same(stable(L.state()),before),'painting law unchanged after repeated reading');

 // Native 0.6.5 trigger: three early releases on one cited sentence,
 // not a test-only assignment to the Bell switch.
 // FAR has no walker yet. Pick a real cited source cell through the public
 // native startRideAt API; never inject or set the loop flag directly.
 let plan=null;
 for(let candidate=0;candidate<32&&!plan;candidate++)plan=L.startRideAt(candidate);
 assert(plan&&Number.isInteger(plan.words)&&plan.words>=1,'real sentence score engaged');
 const canvas=d.querySelector('#world')||d.querySelector('canvas');
 assert(canvas,'native painting canvas available');
 for(let k=0;k<3;k++){
  canvas.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:40+k}));
  // a release during the 700 ms rewind is ignored on purpose; wait for the
  // clause to finish walking back before the next release
  await new Promise(r=>setTimeout(r,850));
 }
 assert(L.loop(),'three actual early releases enter the native Bell loop');
 bridge.refresh();
 assert(read.textContent.includes('THE LOOP'),'native condition changes the only source aperture');
 read.click();
 await wait(()=>d.querySelector('#bellExperience')?.classList.contains('active'),'native Bell world opens');
 d.querySelector('#bellBegin').click();
 await wait(()=>d.querySelector('#bellCover')?.hidden,'Bell POV starts in the same page');
 assert(d.querySelector('#bellScene'),'Bell POV canvas is live');
 d.querySelector('#bellQuit').click();
 await wait(()=>!d.querySelector('#bellExperience')?.classList.contains('active'),'Bell returns to the same painting');
 const afterBell=stable(L.state());
 assert(afterBell.breath===before.breath&&same(afterBell.walker,before.walker),'the Bell world does not spend breath or move native walker');
 // Other world state may differ only because the real THREE MISSES enacted the loop.
 out.textContent='PASS Ladder ↔ retained Threadwalk ↔ native Bell POV / exact witness, RIDE pause, 320/390/1280 / Gate law unchanged';
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
