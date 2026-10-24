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

 // Same exact witness, now complete eight native Gate protocols and return to AXIS.
 assert(!d.querySelector('#sendCity').disabled,'returned witness unavailable');
 d.querySelector('#sendCity').click();
 await wait(()=>f.contentWindow.location.pathname==='/sleeper/'&&f.contentDocument.querySelector('#sourceApertureStatus'),'second city handoff');
 w=f.contentWindow;d=w.document;d.querySelector('#enter').click();
 await wait(()=>!d.querySelector('#app').classList.contains('hidden'),'second city start');
 w.eval('cancelAnimationFrame(raf)');
 const run=code=>w.eval(code);
 const gate=name=>run('JSON.parse(JSON.stringify(game.gates.find(g=>g.name=='+JSON.stringify(name)+')))');
 const walk=(x,y)=>run('(()=>{const target='+JSON.stringify({x,y})+';const end=[Math.floor(target.x),Math.floor(target.y)],origin=[Math.floor(game.player.x),Math.floor(game.player.y)],queue=[origin],seen=new Map([[origin.join(","),null]]);for(let i=0;i<queue.length&&!seen.has(end.join(","));i++)for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const [cx,cy]=queue[i],p=[cx+dx,cy+dy],k=p.join(",");if(game.grid[p[1]]?.[p[0]]===0&&!seen.has(k)){seen.set(k,queue[i]);queue.push(p)}}if(!seen.has(end.join(",")))throw Error("unreachable "+end);let trail=[],p=end;while(p){trail.push(p);p=seen.get(p.join(","))}trail.reverse();for(const p of trail){const dx=p[0]+.5-game.player.x,dy=p[1]+.5-game.player.y,d=Math.hypot(dx,dy);if(d>.001){game.player.direction=Math.atan2(dy,dx);game.keys.add("w");move(performance.now(),d/game.law.figure.movementSpeed*1000);game.keys.clear()}}})()');
 const tick=ms=>run('activeTool=null;updateProofs(performance.now(),'+ms+')');
 const act=tool=>{run('useTool('+JSON.stringify(tool)+')');tick(250)};
 const cut=name=>{const p=run('(()=>{const g=game.gates.find(g=>g.name=='+JSON.stringify(name)+');for(let y=1;y<26;y++)for(let x=1;x<26;x++)if(game.grid[y][x]===0&&Math.hypot(x+.5-g.x,y+.5-g.y)<=2.25)for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])if(game.grid[y+dy][x+dx]>0&&game.grid[y+dy][x+dx]!==9&&x+dx>0&&y+dy>0&&x+dx<26&&y+dy<26)return{x:x+.5,y:y+.5,direction:Math.atan2(dy,dx)};throw Error("no cut approach")})()');walk(p.x,p.y);run('game.player.direction='+p.direction+';game.kerisReadyAt=0');act('keris')};
 let g=gate('PROVENANCE');walk(g.x,g.y);act('conch');
 g=gate('COMPRESSION');walk(g.x,g.y);act('spiral');
 cut('OPERATION');
 g=gate('RETRIEVAL');walk(g.x,g.y);act('w8');
 const far=run('(()=>{for(let y=1;y<26;y++)for(let x=1;x<26;x++)if(game.grid[y][x]===0&&Math.hypot(x+.5-game.anchor.x,y+.5-game.anchor.y)>=3.1)return{x:x+.5,y:y+.5};throw Error("no departure")})()');
 walk(far.x,far.y);tick(250);act('w8');
 g=gate('TRANSFER');if(g.method==='keris')cut('TRANSFER');else{walk(g.x,g.y);act(g.method)}
 g=gate('TRUTH');walk(g.x,g.y);run('activeTool=null;game.lastMovedAt=performance.now()-game.law.figure.truthHoldMs-50');tick(250);
 g=gate('MEASURE');const band=run('(()=>{const g=game.gates.find(g=>g.name==="MEASURE"),f=game.law.figure;for(let y=1;y<26;y++)for(let x=1;x<26;x++){const d=Math.hypot(x+.5-g.x,y+.5-g.y);if(game.grid[y][x]===0&&d>=f.measureMin&&d<=f.measureMax)return{x:x+.5,y:y+.5}}throw Error("no band")})()');
 walk(band.x,band.y);tick(run('game.law.figure.measureHoldMs')+50);
 g=gate('RESILIENCE');walk(g.x,g.y);tick(250);g=gate('RESILIENCE');walk(g.x,g.y);tick(250);
 const final=run('JSON.parse(JSON.stringify({n:game.gateCount,names:game.proofs.map(p=>p.gate),origin:game.start}))');
 assert(final.n===8&&new Set(final.names).size===8,'incomplete native protocols '+JSON.stringify(final));
 walk(final.origin.x,final.origin.y);assert(run('game.finished===true'),'native full RETURN not closed');
 assert(d.querySelector('#backSource'),'full RETURN lacks source action');
 d.querySelector('#backSource').click();
 await wait(()=>f.contentWindow.location.pathname==='/sleeper/axis-score.html'&&!f.contentDocument.querySelector('#work').classList.contains('hidden'),'full source return');
 d=f.contentDocument;w=f.contentWindow;
 assert(d.querySelector('#textInput').value===source,'full RETURN changed source bytes');
 assert(d.querySelector('#cityReturn').textContent.includes('8/8 Gates'),'full native receipt absent');
 assert(d.querySelector('#cityReturn').textContent.includes('native proofs do not establish'),'native proofs became semantic authority');
 assert(!w.sessionStorage.getItem('sleeper:source-aperture/return/v1'),'receipt unconsumed');
 assert(!w.location.search.includes(encodeURIComponent(source)),'return leaked source into URL');

 // Malformed source handoffs reject closed; ordinary boot still works.
 w.sessionStorage.setItem('sleeper:source-aperture/v1','{invalid');
 await load('/sleeper/');
 d=f.contentDocument;
 assert(d.querySelector('#sourceApertureStatus').textContent.includes('SOURCE HANDOFF REJECTED'),'malformed handoff accepted');
 assert(d.querySelector('#enter')&&!d.querySelector('#enter').disabled,'rejected handoff broke native boot');
 // A real recovered source opens directly; no synthetic excerpt or copy ritual.
 await load('/sleeper/axis-score.html?src=%2Frecovery%2Fsleeper%2Fsite-source-2026-09-18%2Fdocs%2FONE_RETURN_V2.md');
 d=f.contentDocument;w=f.contentWindow;
 await wait(()=>!d.querySelector('#work').classList.contains('hidden'),'actual recovered source read');
 assert(d.querySelector('#textInput').value.startsWith('# ONE RETURN City Engine'),'wrong original document loaded');
 assert(d.querySelector('#sourceUrl').value.endsWith('/recovery/sleeper/site-source-2026-09-18/docs/ONE_RETURN_V2.md'),'canonical repository source lost');
 assert(d.querySelector('#readView')&&!d.querySelector('#readView').classList.contains('hidden'),'real source did not start in readable aperture');
 assert(d.querySelector('#evidenceOptions button'),'no source-exact citation in recovered document');
 out.textContent='PASS EXACT SOURCE → CITY · 320/390/1280 · EARLY EXACT RETURN · REAL REPO SOURCE · NO GATE MUTATION · NO URL/LOCAL LAST LEAK · FAIL CLOSED';
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
