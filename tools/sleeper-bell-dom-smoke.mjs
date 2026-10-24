import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {browserBin} from './browser-bin.mjs';
const root=process.cwd();
const probe="<!doctype html><iframe id=\"f\" style=\"width:390px;height:800px;border:0\"></iframe><pre id=\"result\">PENDING</pre><script>\nconst f=document.querySelector('#f'),out=document.querySelector('#result'),sleep=n=>new Promise(r=>setTimeout(r,n)),assert=(v,m)=>{if(!v)throw Error(m)};\n(async()=>{try{\n f.src='/sleeper/axis-score.html?bell=1';\n await new Promise((ok,bad)=>{f.onload=ok;f.onerror=bad});\n const d=f.contentDocument;\n assert(d.querySelector('#bellExperience')?.classList.contains('active'),'not inside first-person room');\n assert(d.querySelector('#bellCover').hidden,'setup screen was not bypassed');\n assert(d.querySelector('#bellScene').width>0,'POV canvas did not initialize');\n for(const width of [320,390,1280]){\n   f.style.width=width+'px';await sleep(110);\n   const p=d.querySelector('#bellScene').getBoundingClientRect(),k=d.querySelector('#bellRing').getBoundingClientRect();\n   assert(p.width>0&&p.width<=width+2,'clipped world at '+width);\n   assert(k.width>=80&&k.left>=0&&k.right<=width+2,'clipped AXIS at '+width);\n }\n const key=(type,key)=>d.dispatchEvent(new KeyboardEvent(type,{key,bubbles:true}));\n key('keydown','w');\n let fork=false;\n for(let i=0;i<135;i++){await sleep(55);if(d.querySelector('#bellAction').classList.contains('active')){fork=true;break}}\n key('keyup','w');assert(fork,'POV movement never arrived at the lawful fork');\n key('keydown',' ');await sleep(60);\n const preview=d.querySelector('#bellPreview');\n assert(!preview.hidden,'held CORE did not expose a counterfactual');\n assert(preview.textContent.includes('43')&&preview.textContent.includes('52'),'counterfactual preview does not match collision graph');\n assert(d.querySelector('#bellPhase').textContent.includes('02'),'preview incorrectly committed world mutation');\n key('keyup',' ');await sleep(60);\n assert(preview.hidden,'released core did not clear preview');\n assert(d.querySelector('#bellPhase').textContent.includes('04'),'released core did not enact opened physical law');\n const a=d.querySelector('#bellLens');\n a.click();assert(a.textContent.includes('PLAN'),'PLAN not reachable');\n a.click();assert(a.textContent.includes('CAUSE'),'CAUSE not reachable');\n a.click();assert(a.textContent.includes('POV'),'POV return failed');\n d.querySelector('#bellQuit').click();\n await new Promise((ok,bad)=>{if(f.contentWindow.location.pathname==='/sleeper/')return ok();f.onload=ok;setTimeout(()=>bad(Error('return timeout')),1000)});\n assert(f.contentWindow.location.pathname==='/sleeper/','EXIT did not return to native owner');\n out.textContent='PASS direct POV · 320/390/1280 · hold-preview-release · AXIS apertures · RETURN';\n}catch(e){out.textContent='FAIL '+String(e.stack||e)}})();\n</script>";
const server=http.createServer((req,res)=>{
 if(req.url==='/__probe'){res.setHeader('content-type','text/html');return res.end(probe)}
 let p=path.resolve(root,'.'+decodeURI(req.url.split('?')[0]));
 if(!p.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 if(fs.existsSync(p)&&fs.statSync(p).isDirectory())p=path.join(p,'index.html');
 if(!fs.existsSync(p)){res.writeHead(404);return res.end()}
 res.setHeader('content-type',p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':'text/html');
 fs.createReadStream(p).pipe(res);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
try{
 const result=await new Promise((resolve,reject)=>{
  const p=spawn(browserBin(),['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--window-size=1400,1000','--virtual-time-budget=14000','--dump-dom','http://127.0.0.1:'+server.address().port+'/__probe']);
  let out='',err='';
  const timer=setTimeout(()=>{p.kill('SIGKILL');reject(Error('bell smoke timed out'))},30000);
  p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',reject);
  p.on('close',code=>{clearTimeout(timer);resolve({code,out,err})});
 });
 const match=result.out.match(/<pre id="result">([\s\S]*?)<\/pre>/);
 if(result.code||!match?.[1].startsWith('PASS '))throw Error((match?.[1]||'no DOM result')+'\n'+result.err.slice(-900));
 console.log('SLEEPER BELL DOM',match[1]);
}finally{server.close()}
