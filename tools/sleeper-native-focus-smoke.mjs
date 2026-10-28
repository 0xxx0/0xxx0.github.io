import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {browserBin} from './browser-bin.mjs';
const root=process.cwd();
const probe=[
'<!doctype html><meta charset="utf-8"><iframe id="host" style="width:390px;height:820px;border:0"></iframe><pre id="result">PENDING</pre>',
'<script>',
'const f=document.querySelector("#host"),out=document.querySelector("#result");',
'const sleep=n=>new Promise(r=>setTimeout(r,n));',
'const assert=(x,m)=>{if(!x)throw Error(m)};',
'(async()=>{try{',
' f.src="/sleeper/";await new Promise((ok,fail)=>{f.onload=ok;f.onerror=fail});',
' const w=f.contentWindow,d=f.contentDocument,read=s=>w.eval(s);',
' d.querySelector("#enter").click();await sleep(150);',
' read("cancelAnimationFrame(raf)");',
' const A=w.SleeperFocus;assert(A,"focus adapter exists");',
' assert(!d.querySelector("#focusBtn").hidden,"LOOK button appears within native POV");',
' const stable=()=>read("JSON.stringify({worldKey:game.law.key,position:game.player,steps:game.steps,proofs:game.proofs,counts:game.operatorCounts,grid:game.grid})");',
' const before=stable();',
' for(const width of [320,390,1280]){',
'  f.style.width=width+"px";await sleep(85);',
'  d.querySelector("#focusBtn").click();await sleep(15);',
'  assert(A.state().opened,"focus opened at "+width);',
'  assert(d.documentElement.scrollWidth<=width+2,"viewport width "+width);',
'  const b=d.querySelector("#focusLens").getBoundingClientRect();',
'  assert(b.left>=0&&b.right<=width+2,"lens fits viewport "+width);',
'  assert(d.querySelector("#fPassage").textContent===read("game.law.source"),"exact world text not excerpted");',
'  d.querySelector("#fClose").click();',
' }',
' f.style.width="390px";await sleep(75);d.querySelector("#focusBtn").click();',
' assert(read("uiPaused()"),"native world paused during reading");',
' const source=read("game.law.source");',
' assert(d.querySelectorAll("#fPassage button").length>3,"clickable word-addressed source");',
' d.querySelector("#fNext").click();',
' assert(A.state().index===1,"word position moved");',
' d.querySelector("[data-focus=\\"0\\"]").click();',
' assert(d.querySelector("#fFocus").textContent.length>0,"word focus");',
' d.querySelector("[data-focus=\\"2\\"]").click();',
' assert(d.querySelector("#fFocus").textContent===source,"source-wide aperture");',
' const seek=d.querySelector("#fScrub");seek.value="3";seek.dispatchEvent(new Event("input",{bubbles:true}));',
' assert(A.state().index===3,"scrub is addressable");',
' assert(stable()===before,"scale/scrub cannot mutate native world");',
' read("game.player={...game.gates.find(g=>g.name===\\"TRUTH\\"),direction:0};game.lastMovedAt=performance.now()-10000;frame(performance.now());cancelAnimationFrame(raf)");',
' assert(!read("game.gates.find(g=>g.name===\\"TRUTH\\").collected"),"LOOK cannot award TRUTH stillness");',
' read("game.player={...game.gates.find(g=>g.name===\\"MEASURE\\"),direction:0};game.measureMs=0;frame(performance.now()+20000);cancelAnimationFrame(raf)");',
' assert(!read("game.gates.find(g=>g.name===\\"MEASURE\\").collected"),"LOOK cannot award MEASURE distance");',
' d.querySelector("#fBefore").value="I expect CONCH to leave a native signal trace";',
' d.querySelector("#fTry").click();assert(!A.state().opened&&A.state().pending,"prediction returns to same native world");',
' const wb=stable(),eventBefore=read("game.routeEvents.length");assert(!read("uiPaused()"),"native still paused after fTry: "+d.querySelector("#side").className+" / "+d.querySelector("#modal").className+" / "+A.state().opened);',
' d.querySelector("[data-tool=\\"conch\\"]").click();',
 ' assert(read("game.routeEvents.length")>eventBefore,"a real native tool was enacted");',
' d.querySelector("#focusBtn").click();',
' assert(d.querySelector("#fActual").textContent.includes("conch"),"real native event compared");',
' assert(d.querySelector("#fActual").textContent.includes("Same world: true"),"return is same world");',
' assert(d.querySelector("#fActual").textContent.includes("New native Gate proofs"),"source and native proofs separate");',
' d.querySelector("#fAfter").value="A conch event was recorded; what it reveals still needs inspection.";d.querySelector("#fCarry").click();',
' const packet=A.sidecar();assert(packet.records.length===1&&packet.records[0].before.worldKey===packet.records[0].after.worldKey,"carry exact same-world before/after");',
' assert(packet.records[0].authority==="HUMAN_INTERPRETATION_NOT_GATE_PROOF","no authored Gate credit");',
' assert(packet.records[0].sourceHash===w.SleeperSourceAperture.hash(source),"source identity tied");',
' assert(read("game.gateCount")===0,"reader did not award Gates");',
' d.querySelector("#fClose").click();',
' assert(!read("uiPaused()"),"native world resumed after closing");',
' out.textContent="PASS ONE RETURN POV 320/390/1280 · exact text/address · native pause · RSVP scrub · prediction/action/return · authored sidecar";',
'}catch(e){out.textContent="FAIL "+String(e.stack||e)}})();',
'<\\/script>'
].join('\n').replace('<\\/script>','</script>');
const server=http.createServer((req,res)=>{
 if(req.url==='/__probe'){res.setHeader('content-type','text/html');return res.end(probe)}
 const pathname=decodeURIComponent(req.url.split('?')[0]);
 let file=path.resolve(root,'.'+pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
 if(!fs.existsSync(file)){res.writeHead(404);return res.end()}
 const mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json'};
 res.setHeader('content-type',mime[path.extname(file)]||'text/plain');fs.createReadStream(file).pipe(res);
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
try{
 const result=await new Promise((resolve,reject)=>{
  const p=spawn(browserBin(),['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--window-size=1450,1020','--virtual-time-budget=6000','--dump-dom','http://127.0.0.1:'+server.address().port+'/__probe']);
  let out='',err='';const t=setTimeout(()=>{p.kill('SIGKILL');reject(Error('POV focus smoke timed out'))},35000);
  p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',reject);
  p.on('close',code=>{clearTimeout(t);resolve({code,out,err})});
 });
 const m=result.out.match(/<pre id="result">([\s\S]*?)<\/pre>/);
 if(result.code||!m?.[1]?.startsWith('PASS '))throw Error((m?.[1]||'no browser proof')+'\n'+result.err.slice(-900));
 console.log('SLEEPER POV FOCUS',m[1]);
}finally{server.close()}