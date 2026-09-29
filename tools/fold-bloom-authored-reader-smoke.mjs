#!/usr/bin/env node
'use strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';

const ROOT=process.cwd(),HOST='127.0.0.1';let PORT=0;
function browserBin(){for(const n of ['google-chrome-stable','google-chrome','chromium-browser','chromium']){const r=spawnSync('which',[n],{encoding:'utf8'});if(r.status===0&&r.stdout.trim())return r.stdout.trim()}for(const p of ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/Applications/Brave Browser.app/Contents/MacOS/Brave Browser','/Applications/Chromium.app/Contents/MacOS/Chromium','/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge']){if(spawnSync('test',['-x',p]).status===0)return p}throw Error('No Chrome/Chromium')}
function ct(p){if(p.endsWith('.html'))return'text/html; charset=utf-8';if(p.endsWith('.js')||p.endsWith('.mjs'))return'text/javascript; charset=utf-8';if(p.endsWith('.json'))return'application/json; charset=utf-8';if(p.endsWith('.css'))return'text/css; charset=utf-8';if(p.endsWith('.txt')||p.endsWith('.md'))return'text/plain; charset=utf-8';if(p.endsWith('.svg'))return'image/svg+xml';return'application/octet-stream'}
function resolveFile(url){let q=decodeURIComponent(String(url||'/').split('?')[0]).replace(/^\/+/, '');if(!q)q='index.html';if(q.endsWith('/'))q+='index.html';const p=path.normalize(path.join(ROOT,q));if(!p.startsWith(ROOT))return null;if(fs.existsSync(p)&&fs.statSync(p).isFile())return p;if(fs.existsSync(p+'.html'))return p+'.html';return null}
function probe(){return `<!doctype html><html><body style="margin:0"><iframe id="f" style="width:430px;height:900px;border:0"></iframe><pre id="probeResult">PENDING</pre><script>
const f=document.getElementById('f'),out=document.getElementById('probeResult'),rec={};let finished=false;
const HASH='sha256:9b9be4ac4e24cb980d9f65bc948d6b3aaa9c514a84ee44a96142d526b2d25a6e';
const done=(ok,x)=>{if(finished)return;finished=true;out.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(x)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const wait=async(fn,limit=18000,label='condition')=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(60)}throw Error('wait '+label)};
const W=()=>f.contentWindow,D=()=>W().document,same=(a,b)=>a&&b&&Number(a.start)===Number(b.start)&&Number(a.end)===Number(b.end);
(async()=>{try{
  const source=await fetch('/fold-bloom/live/authored/prison-age-2021.txt').then(r=>r.text());
  f.src='/fold-bloom/live/?reader=prison-age-2021';
  await wait(()=>W().FoldBloomLive?.authored?.current?.()?.hash===HASH,18000,'authored reader');
  const api=W().FoldBloomLive,first=api.authored.current(),frame=D().getElementById('authoredReaderFrame');
  rec.entry={hash:first.hash,authority:first.state.source.authority,label:first.state.source.label,kind:first.state.source.kind,mode:api.course.mode(),grain:api.course.grain(),frame:!frame.hidden,subtitle:D().getElementById('liveSubtitle').textContent,sourceText:D().getElementById('lyricText').textContent};
  if(first.state.source.authority!=='RECOVERED_AUTHORED_SOURCE'||first.state.source.kind!=='AUTHORED_RECOVERED_TEXT'||api.course.mode()!=='RELEASE_STEP'||api.course.grain()!=='PARAGRAPH'||frame.hidden)throw Error('reader entry contract');
  if(!/PRISON AGE/.test(rec.entry.sourceText))throw Error('authored text not in primary witness');
  const firstIndex=api.read.current().course.index;
  D().getElementById('readerNext').click();await wait(()=>api.read.current().course.index===firstIndex+1,2000,'direct READ next');
  D().getElementById('readerPrev').click();await wait(()=>api.read.current().course.index===firstIndex,2000,'direct READ prev');
  rec.directRead={next:true,prev:true,index:api.read.current().course.index};

  const release=D().getElementById('releaseBtn'),right=D().getElementById('turnRight');
  let turns=0;while(release.disabled&&turns<14){right.click();turns++;await sleep(45)}
  if(release.disabled)throw Error('could not align release');
  const before=api.read.current(),historyBefore=api.state().history.length;release.click();
  await wait(()=>api.state().history.length===historyBefore+1,4000,'reader release');
  const after=api.read.current();
  rec.release={turns,before:before.course.index,after:after.course.index,verb:api.state().history.at(-1)?.verb,mode:api.course.mode()};
  if(after.course.index!==before.course.index+1)throw Error('RELEASE did not advance exactly one addressed paragraph');

  D().getElementById('readerRecurrenceNext').click();
  await wait(()=>api.authored.current().return.recurrence.jumps.length===1,3000,'first recurrence jump');
  const jump1=api.authored.current();
  rec.recurrence1={progress:jump1.state.course.progress,address:jump1.state.course.address,jumps:jump1.return.recurrence.jumps,label:D().getElementById('readerRecurrenceLabel').textContent,body:D().getElementById('readerRecurrenceBody').textContent};
  if(!/SAME LETTERS/.test(rec.jump1.label)||!/AEGINOPRS/.test(rec.jump1.body))throw Error('recurrence relation not visible');

  D().getElementById('readerRecurrenceNext').click();
  await wait(()=>api.authored.current().return.recurrence.jumps.length===2,3000,'second recurrence jump');
  const jump2=api.authored.current();rec.recurrence2=jump2.return.recurrence.jumps;
  if(jump2.return.recurrence.jumps[1].to!==132)throw Error('exact recurrence offset not preserved');

  D().getElementById('readerProvBtn').click();
  rec.provenance={visible:!D().getElementById('readerProvenance').hidden,title:D().getElementById('readerProvTitle').textContent,body:D().getElementById('readerProvBody').textContent,raw:D().getElementById('readerRawSource').getAttribute('href')};
  if(!rec.provenance.visible||!/2021 GPA EN SCRATCH-1\.pdf/.test(rec.provenance.body)||!/unresolved/.test(rec.provenance.body)||rec.provenance.raw!=='/fold-bloom/live/authored/prison-age-2021.txt')throw Error('provenance projection incomplete');
  D().getElementById('readerProvClose').click();

  const liveReturn=api.authored.showReturn();
  rec.returnOverlay={visible:!D().getElementById('readerReturn').hidden,authority:liveReturn.authority,source:liveReturn.source,jumps:liveReturn.recurrence.jumps.length,releases:liveReturn.live.release_count,route:liveReturn.return.source_reader};
  if(liveReturn.authority!=='EVIDENCE_ONLY'||liveReturn.source.id!==HASH||liveReturn.recurrence.jumps.length!==2||liveReturn.live.release_count<1)throw Error('authored RETURN payload');
  const final={start:liveReturn.traversal.final.start,end:liveReturn.traversal.final.end};

  D().getElementById('readerReturnSource').click();
  await wait(()=>W().location.pathname==='/docs/'&&D().documentElement.dataset.readfieldRideReturn==='accepted',18000,'authored exact source return');
  const returned=D().getElementById('docAperture').snapshot(),stored=JSON.parse(sessionStorage.getItem('fold-bloom.authored-reading.return.v01')||'null');
  rec.sourceReturn={span:returned.span,sourceSame:D().getElementById('text').textContent===source,storedAuthority:stored?.authority,storedHash:stored?.source?.id,href:W().location.pathname+W().location.search};
  if(!same(returned.span,final)||!rec.sourceReturn.sourceSame||stored?.authority!=='EVIDENCE_ONLY'||stored?.source?.id!==HASH)throw Error('exact authored source RETURN failed');

  done(true,rec);
}catch(e){done(false,{...rec,error:String(e?.stack||e),href:(()=>{try{return W().location.href}catch(_){return null}})()})}})();
<\/script></body></html>`}
const server=http.createServer((req,res)=>{if(String(req.url||'').startsWith('/__probe')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(probe());return}const p=resolveFile(req.url);if(!p){res.writeHead(404);res.end('not found');return}res.writeHead(200,{'content-type':ct(p),'cache-control':'no-store'});fs.createReadStream(p).pipe(res)});
function run(bin){return new Promise((resolve,reject)=>{const a=['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--window-size=520,940','--virtual-time-budget=40000','--dump-dom','http://'+HOST+':'+PORT+'/__probe'];const p=spawn(bin,a,{stdio:['ignore','pipe','pipe']});let out='',err='';const tm=setTimeout(()=>{p.kill('SIGKILL');reject(Error('timeout'))},54000);p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',e=>{clearTimeout(tm);reject(e)});p.on('close',code=>{clearTimeout(tm);resolve({code,out,err})})})}
await new Promise((resolve,reject)=>server.listen(PORT,HOST,e=>e?reject(e):resolve()));PORT=server.address().port;
try{const r=await run(browserBin()),m=r.out.match(/id="probeResult"[^>]*>([\s\S]*?)<\/pre>/i),result=(m?.[1]||'').replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim(),fatal=/Uncaught (?:TypeError|ReferenceError|SyntaxError)|net::ERR_|Aw, Snap/i.test(r.err);if(r.code!==0||fatal||!result.startsWith('PASS ')){console.error('FOLD BLOOM AUTHORED READER SMOKE FAIL',result||'(no result)');if(r.err.trim())console.error(r.err.slice(-3200));process.exitCode=1}else console.log('FOLD BLOOM AUTHORED READER SMOKE PASS',result.slice(5))}finally{await new Promise(r=>server.close(()=>r()))}
