import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {browserBin} from '../../tools/browser-bin.mjs';
const root=process.cwd();
const probe=String.raw`<!doctype html><meta charset="utf-8"><iframe id="host" style="width:390px;height:830px;border:0"></iframe><pre id="result">PENDING</pre>
<script>
const f=document.getElementById('host'),out=document.getElementById('result');
const wait=async(fn,label)=>{for(let i=0;i<180;i++){try{const v=fn();if(v)return v}catch{}await new Promise(r=>setTimeout(r,65))}throw Error('TIMEOUT '+label)};
const assert=(x,msg)=>{if(!x)throw Error(msg)};
const stable=s=>({walk:s.walker,moves:s.moves,breath:s.breath,lit:s.lit,witness:s.witness});
(async()=>{try{
 f.src='/sleeper/ladder/?labyrinth=1';
 const L=await wait(()=>f.contentWindow?.SleeperLadder,'native');
 await L.ready;
 const d=f.contentDocument;
 const ascii=await wait(()=>f.contentWindow?.LadderAsciiLens,'ASCII script');
 const pane=await wait(()=>!d.querySelector('#asciiLens')?.hidden&&d.querySelector('#laMap')?.textContent?.includes('@')&&d.querySelector('#laScrub')?.max>0,'ASCII source and map');
 assert(ascii.state().native.distance==='ENTERED','native entered state, no new engine');
 const base=stable(L.state());
 const map=d.querySelector('#laMap').textContent.split(String.fromCharCode(10));
 assert(map.length===11&&map.every(l=>[...l].length===21),'21x11 field from same cells');
 assert(d.querySelector('#laAddress').textContent.includes(base.walk.p?'paragraph ':'paragraph '),'source address shown');
 assert(ascii.state().source===L.state().source.sha256,'exact source fingerprint');
 for(const width of [320,390,1280]){
  f.style.width=width+'px';await new Promise(r=>setTimeout(r,75));
  assert(d.documentElement.scrollWidth<=width+2,'ASCII no horizontal viewport overflow at '+width);
  assert(d.querySelector('#laMap').textContent.includes('@'),'current walker visible at '+width);
 }
 const beforeScale=JSON.stringify(stable(L.state()));
 d.querySelector('#laIn').click();d.querySelector('#laOut').click();
 assert(JSON.stringify(stable(L.state()))===beforeScale,'aperture scale does not move walker or spend breath');
 const slider=d.querySelector('#laScrub'),old=d.querySelector('#laFocus').textContent;
 slider.value='1';slider.dispatchEvent(new Event('input',{bubbles:true}));
 assert(ascii.state().wordIndex===1,'scrub changes word address in excerpt');
 assert(d.querySelector('#laFocus').textContent!==old,'scrubbing changes focus text');
 assert(JSON.stringify(stable(L.state()))===beforeScale,'RSVP does not mutate native route');
 const dirs=L.openSides();
 let moved=false;
 for(const k of dirs){
  const key={N:'U',S:'D',E:'R',W:'L'}[k];
  const before=L.state().moves.length;
  d.querySelector('[data-dir="'+key+'"]').click();
  if(L.state().moves.length>before){moved=true;break;}
 }
 assert(moved,'one real native source-world step via ASCII buttons');
 assert(L.state().breath===base.breath-1,'native breath cost, no separate score');
 assert(d.querySelector('#laMap').textContent.includes('@'),'map follows walker');
 const beforeRead=JSON.stringify(stable(L.state()));
 const address=L.state().walker.y*96+L.state().walker.x;
 const projected=await (await fetch('/sleeper/ladder/source-dhamma.json')).json();
 const currentDistrict=L.state().walker.p;
 const sourceLine=projected.districts[currentDistrict].line;
 d.querySelector('#laThread').click();
 await wait(()=>!d.querySelector('#ladderOverlay')?.hidden,'existing Threadwalk opens');
 const inner=d.querySelector('#ladderFrame');
 const reader=await wait(()=>inner?.contentDocument?.querySelector('#readingPlay')?.shadowRoot,'retained reader');
 await wait(()=>reader.querySelector('#districtContext')?.textContent?.includes('CELL '+address),'reader resolves exact walked cell');
 const context=reader.querySelector('#districtContext');
 assert(context.textContent.includes(projected.districts[currentDistrict].locator),'source paragraph locator comes from verified slice');
 assert(context.textContent.includes(sourceLine),'book excerpt remains the exact published projection line');
 assert(context.textContent.includes('full paragraph and its original byte offsets are not in this source slice'),'no invented full-book offset claim');
 assert(context.querySelector('a[href$="/'+projected.districts[currentDistrict].slug+'.html"]'),'original book chapter link');
 assert(reader.querySelector('#ladderContext')?.textContent?.includes('LADDER'),'same existing Threadwalk factor session retained');
 assert(d.querySelector('#asciiLens').hidden,'ASCII released viewport to native reader');
 assert(JSON.stringify(stable(L.state()))===beforeRead,'reading current cell preserves native movement, breath and Gates');
 d.querySelector('#ladderClose').click();
 d.querySelector('#asciiLaunch').click();
 await wait(()=>!d.querySelector('#asciiLens').hidden,'reenter ASCII');
 assert(JSON.stringify(stable(L.state()))===beforeRead,'same walker and path on return');
 out.textContent='PASS ASCII / native LADDER 320,390,1280: text map, native step cost, exact cell-to-source, AXIS, RSVP scrub, Threadwalk return';
}catch(e){out.textContent='FAIL '+String(e.stack||e)}})();
</script>`;
const server=http.createServer((req,res)=>{
 if(req.url==='/__probe'){res.setHeader('content-type','text/html');return res.end(probe)}
 const pathname=decodeURIComponent(req.url.split('?')[0]);let file=path.resolve(root,'.'+pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
 if(!fs.existsSync(file)){res.writeHead(404);return res.end()}
 const ext=path.extname(file),mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.jpeg':'image/png','.svg':'image/svg+xml'};
 res.setHeader('content-type',mime[ext]||'text/plain');fs.createReadStream(file).pipe(res);
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
try{
 const result=await new Promise((resolve,reject)=>{
  const p=spawn(browserBin(),['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--window-size=1500,1050','--virtual-time-budget=17000','--dump-dom','http://127.0.0.1:'+server.address().port+'/__probe']);
  let out='',err='';const timeout=setTimeout(()=>{p.kill('SIGKILL');reject(Error('ASCII DOM smoke timed out'))},45000);
  p.stdout.on('data',x=>out+=x);p.stderr.on('data',x=>err+=x);p.on('error',reject);
  p.on('close',code=>{clearTimeout(timeout);resolve({code,out,err})});
 });
 const match=result.out.match(/<pre id="result">([\s\S]*?)<\/pre>/);
 if(result.code||!match?.[1]?.startsWith('PASS'))throw Error((match?.[1]||'no DOM result')+'\n'+result.err.slice(-1000));
 console.log('ASCII LADDER DOM',match[1]);
}finally{server.close()}