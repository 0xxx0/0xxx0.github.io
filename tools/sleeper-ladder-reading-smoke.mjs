import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {browserBin} from './browser-bin.mjs';
const root=process.cwd();
const probe=String.raw`<!doctype html><meta charset="utf-8">
<iframe id="f" style="width:390px;height:840px;border:0"></iframe>
<pre id="result">PENDING</pre>
<script>
const f=document.getElementById('f'),out=document.getElementById('result');
const pause=n=>new Promise(r=>setTimeout(r,n));
const assert=(v,m)=>{if(!v)throw Error(m)};
const wait=async(fn,msg)=>{for(let i=0;i<130;i++){try{if(fn())return;}catch(e){}await pause(60)}throw Error('TIMEOUT '+msg)};
const load=url=>new Promise((ok,bad)=>{f.onload=ok;f.onerror=bad;f.src=url});
const button=(box,txt)=>[...box.querySelectorAll('button')].find(b=>b.textContent.includes(txt));
(async()=>{try{
 await load('/sleeper/axis-score.html?read=1&ladder=3');
 const d=f.contentDocument,w=f.contentWindow;
 await wait(()=>d.querySelector('#readingPlay')?.shadowRoot?.getElementById('ladderGuide')?.querySelector('.question'),'LADDER score reader');
 const host=d.getElementById('readingPlay'),sh=host.shadowRoot,id=x=>sh.getElementById(x);
 const state=w.SleeperReadingBridge.snapshot(),score=w.SleeperLadderThread;
 assert(state.model.nodes.length===8,'8 source rows not mapped to 8 passages');
 assert(state.model.meta.title.includes('LADDER excerpts'),'truncated source label not visible');
 assert(state.model.sha256?.length===64,'derived projection not sealed');
 assert(state.inspected===state.model.nodes[3].id,'deep-linked factor not inspected');
 assert(state.session.focus===state.model.nodes[0].id,'preview must not teleport');
 assert(id('hint').textContent.includes('NOT the unabridged'),'source boundary not named');
 assert(id('ladderGuide').textContent.includes('Whose wellbeing'),'question missing');
 assert(id('ladderGuide').querySelector('a[href*="path-factors-of-virtuous-conduct"]'),'canonical link missing');
 assert(id('ladderGuide').querySelector('a[href*="suttacentral.net"]'),'cross-text link missing');
 assert(!d.getElementById('bellExperience')?.classList.contains('active'),'ASCII maze hijacked reading');
 for(const width of [320,390,1280]){
   f.style.width=width+'px';await pause(140);
   assert(host.getBoundingClientRect().width<=width+2,'reader overflows frame '+width);
   assert(id('app').scrollWidth<=width+3,'reader horizontal overflow '+width+' actual '+id('app').scrollWidth);
   assert(id('passage').querySelectorAll('.sentence').length>0,'reading sentence disappeared '+width);
 }
 // Exact witness of the ABRIDGED projection, not a fabricated reference to the full book.
 id('passage').querySelector('.sentence').click();
 assert(w.SleeperReadingBridge.snapshot().session.selected===state.model.nodes[3].id,'source witness not marked');
 const witness=w.SleeperReadingBridge.snapshot().session.witnesses[state.model.nodes[3].id];
 assert(witness.start>=state.model.nodes[3].start&&witness.end<=state.model.nodes[3].end,'witness not bounded');
 // Compare factor 4 to factor 5; authored link changes lawful route.
 id('rail').querySelectorAll('button')[4].click(); // Use the reader's actual preview control.
 await wait(()=>id('where')?.textContent.includes('5 / 8'),'factor 5 inspection');
 id('passage').querySelector('.sentence').click();
 if(!id('relation'))id('threadToggle').click();
 assert(id('relation')&&id('reason'),'compare editor not exposed');
 id('relation').value='questions';
 id('reason').value='Does refraining from an action automatically make the livelihood that sustains it harmless?';
 button(id('compare'),'MAKE DOOR').click();
 const linked=w.SleeperReadingBridge.snapshot();
 assert(linked.session.links.length===1,'door not committed');
 assert(linked.session.links[0].cites.length===2,'no two exact projection quotes');
 assert(linked.session.links[0].authority==='USER_DECLARED_WITH_EXACT_WITNESSES','semantic authority escalated');
 for(let i=1;i<5;i++)w.SleeperReadingBridge.travel(state.model.nodes[i].id);
 assert(w.SleeperReadingBridge.snapshot().session.moves.some(x=>x.via==='COMMITTED'),'declared door did not change actual route');
 for(let i=3;i>=0;i--)w.SleeperReadingBridge.travel(state.model.nodes[i].id);
 const ret=w.SleeperReadingBridge.returnArtifact();
 assert(ret.source.title.includes('LADDER excerpts'),'RETURN lost derived-source identity');
 assert(ret.verification.semantic==='UNVERIFIED_USER_JUDGMENT','RETURN falsely certifies meaning');
 // The painting remains its own stateful owner, with a bounded source exit.
 await load('/sleeper/ladder/');
 const ld=f.contentDocument;
 await wait(()=>ld.getElementById('ladderRead')&&ld.defaultView.SleeperLadder,'LADDER source link');
 const a=ld.getElementById('ladderRead');
 assert(a.target==='_blank','reader must not erase active LADDER walk');
 a.addEventListener('click',e=>e.preventDefault(),{capture:true});
 a.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
 assert(a.href.includes('axis-score.html?read=1&ladder='),'LADDER did not address reader');
 out.textContent='PASS LADDER → THREADWALK · 8 source factors · 320/390/1280 · two exact witnesses · authored door · RETURN · painting exit';
}catch(e){out.textContent='FAIL '+(e.stack||e)}})();
</script>`;
const server=http.createServer((req,res)=>{
 if(req.url==='/__probe'){res.setHeader('content-type','text/html');res.end(probe);return}
 let file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
 if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
 if(!fs.existsSync(file)){res.writeHead(404);res.end();return}
 const ext=path.extname(file).toLowerCase(),mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'};
 res.setHeader('content-type',mime[ext]||'application/octet-stream');
 fs.createReadStream(file).pipe(res);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
try{
 const {code,out,err}=await new Promise((resolve,reject)=>{
  const p=spawn(browserBin(),['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--window-size=1400,1100','--virtual-time-budget=12000','--dump-dom','http://127.0.0.1:'+server.address().port+'/__probe']);
  let out='',err='';const timer=setTimeout(()=>{p.kill('SIGKILL');reject(Error('LADDER browser timed out'))},45000);
  p.stdout.on('data',x=>out+=x);p.stderr.on('data',x=>err+=x);p.on('error',reject);
  p.on('close',code=>{clearTimeout(timer);resolve({code,out,err})});
 });
 const actual=out.match(/<pre id="result">([\s\S]*?)<\/pre>/)?.[1]||'NO_BROWSER_RESULT';
 if(code||!actual.startsWith('PASS'))throw Error(actual+'\n'+err.slice(-900));
 console.log(actual);
}finally{server.close()}
