#!/usr/bin/env node
'use strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';

const ROOT=process.cwd(),HOST='127.0.0.1';let PORT=0;
function browserBin(){for(const n of ['google-chrome-stable','google-chrome','chromium-browser','chromium']){const r=spawnSync('which',[n],{encoding:'utf8'});if(r.status===0&&r.stdout.trim())return r.stdout.trim()}throw Error('No Chrome/Chromium')}
function ct(p){if(p.endsWith('.html'))return'text/html; charset=utf-8';if(p.endsWith('.js')||p.endsWith('.mjs'))return'text/javascript; charset=utf-8';if(p.endsWith('.json'))return'application/json; charset=utf-8';if(p.endsWith('.md')||p.endsWith('.txt'))return'text/plain; charset=utf-8';return'application/octet-stream'}
function resolveFile(url){let q=decodeURIComponent(String(url||'/').split('?')[0]).replace(/^\/+/, '');if(!q)q='index.html';if(q.endsWith('/'))q+='index.html';const p=path.normalize(path.join(ROOT,q));if(!p.startsWith(ROOT))return null;if(fs.existsSync(p)&&fs.statSync(p).isFile())return p;if(fs.existsSync(p+'.html'))return p+'.html';return null}
function probe(){return `<!doctype html><html><body><iframe id="f" style="width:430px;height:900px;border:0"></iframe><pre id="probeResult">PENDING</pre><script>
const f=document.getElementById('f'),out=document.getElementById('probeResult'),rec={};let doneFlag=false;
const done=(ok,x)=>{if(doneFlag)return;doneFlag=true;out.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(x)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const wait=async(fn,limit=18000,label='condition')=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(60)}throw Error('wait '+label)};
const W=()=>f.contentWindow,D=()=>W().document;
(async()=>{try{
 f.src='/prison-age/?passage=1&return=field';
 await wait(()=>W().PrisonAgePassage?.snapshot&&D().getElementById('paPassage')&&!D().getElementById('paPassage').hidden,18000,'passage intro');
 const doors=[...D().querySelectorAll('#papDoors [data-enter]')];rec.intro={doors:doors.length,visible:!D().getElementById('paPassage').hidden,root:D().getElementById('papRootRide')?.textContent||'',law:D().querySelector('.papIntroLaw')?.textContent||''};
 if(doors.length!==4||!/Nothing between fragments is written for you/.test(rec.intro.law))throw Error('passage threshold');

 doors[0].click();
 await wait(()=>W().PrisonAgePassage.snapshot().trail.length===1&&D().getElementById('papRoute').classList.contains('on')&&D().querySelector('#papContext mark'),5000,'verified entry route');
 let snap=W().PrisonAgePassage.snapshot(),packet=W().PrisonAgePassage.packet(),held=packet.nodes.at(-1);
 rec.enter={trail:snap.trail,current:snap.current,source:held.source_id,address:held.address,text:held.text,mark:!!D().querySelector('#papContext mark')};
 if(!rec.enter.mark||!held.address.startsWith('source-echo://'))throw Error('exact addressed context');
 const raw=await fetch(held.path).then(r=>r.text());if(raw.slice(held.start,held.end)!==held.text)throw Error('entry source drift');

 const read=D().getElementById('papRead').getAttribute('href');rec.read=read;
 if(!read.includes('src='+encodeURIComponent(held.path))||!read.includes('ap_char='+held.start)||!read.includes('return='))throw Error('exact READ context');

 const beforeSource=held.source_id;D().getElementById('papCross').click();
 await wait(()=>W().PrisonAgePassage.snapshot().trail.length===2&&D().querySelector('#papContext mark'),5000,'cross echo');
 packet=W().PrisonAgePassage.packet();held=packet.nodes.at(-1);rec.cross={source:held.source_id,transition:packet.transitions[0]?.kind,trail:packet.nodes.map(x=>x.key)};
 if(rec.cross.transition!=='CROSS_ECHO'||held.source_id===beforeSource)throw Error('cross evidence law');

 const turn=[...D().querySelectorAll('#papTurns [data-turn]')][0];if(!turn)throw Error('turn source missing');const crossSource=held.source_id;turn.click();
 await wait(()=>W().PrisonAgePassage.snapshot().trail.length===3&&D().querySelector('#papContext mark'),5000,'turn source');
 packet=W().PrisonAgePassage.packet();held=packet.nodes.at(-1);rec.turn={source:held.source_id,transition:packet.transitions[1]?.kind,trail:packet.nodes.map(x=>x.key)};
 if(rec.turn.transition!=='TURN_SOURCE'||held.source_id!==crossSource)throw Error('same-source turn law');

 const ride=await W().PrisonAgePassage.makeRidePacket();rec.ride={schema:ride.schema,authority:ride.sourceIdentity?.authority,focus:ride.focus?.char_index,source:ride.sourceIdentity?.address,returnAddress:ride.returnAddress,passage:ride.passage?.schema,held:ride.passage?.held,echo:ride.echo?.authority};
 if(ride.schema!=='field-read-ride/v0.1'||ride.sourceIdentity?.authority!=='PRISON_AGE'||ride.focus?.char_index!==held.start||ride.sourceIdentity?.address!==held.path||ride.passage?.schema!=='prison-age.passage-route/v0.1'||ride.echo?.authority!=='EVIDENCE_ONLY')throw Error('LIVE passage handoff');
 if(!ride.returnAddress.includes('passage=1')||!ride.returnAddress.includes('trail='))throw Error('exact passage return');

 W().PrisonAgePassage.renderReturn();await wait(()=>D().getElementById('papReturn').classList.contains('on'),2000,'passage return');
 const returnText=D().getElementById('papReturnBody').textContent,meta=D().getElementById('papReturnMeta').textContent;rec.return={meta,nodes:packet.nodes.length,contains:packet.nodes.every(n=>returnText.includes(n.text)),url:W().PrisonAgePassage.snapshot().url};
 if(!rec.return.contains||!/3 exact source spans/.test(meta)||!/authority EVIDENCE ONLY/.test(meta))throw Error('reader-made return');

 const expectedTrail=packet.nodes.map(x=>x.key),sharePath=W().PrisonAgePassage.snapshot().url,core=W().PrisonAgePassageCore,decoded=core.decodeTrail(new URL(W().location.href).searchParams.get('trail'));rec.share={decoded,valid:core.validateTrail(await fetch('/prison-age/evidence-atlas.json').then(r=>r.json()),decoded).ok,path:sharePath};
 if(decoded.length!==3||!rec.share.valid)throw Error('share route encode');
 f.src=sharePath;
 await wait(()=>W().PrisonAgePassage?.snapshot&&JSON.stringify(W().PrisonAgePassage.snapshot().trail)===JSON.stringify(expectedTrail)&&D().querySelector('#papContext mark'),12000,'shared route reload');
 const restored=W().PrisonAgePassage.packet();rec.share.restored=restored.nodes.map(x=>x.key);rec.share.exact=restored.nodes.every((n,i)=>n.key===packet.nodes[i].key&&n.address===packet.nodes[i].address&&n.text===packet.nodes[i].text);
 if(!rec.share.exact)throw Error('share route exact restore');

 D().getElementById('papClose').click();rec.closed=D().getElementById('paPassage').hidden&&!W().location.search.includes('passage=1');if(!rec.closed)throw Error('return source');
 done(true,rec);
}catch(e){done(false,{...rec,error:String(e?.stack||e)})}})();
<\/script></body></html>`}
const server=http.createServer((req,res)=>{if(String(req.url||'').startsWith('/__probe')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(probe());return}const p=resolveFile(req.url);if(!p){res.writeHead(404);res.end('not found');return}res.writeHead(200,{'content-type':ct(p),'cache-control':'no-store'});fs.createReadStream(p).pipe(res)});
function run(bin){return new Promise((resolve,reject)=>{const a=['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--window-size=470,940','--virtual-time-budget=34000','--dump-dom','http://'+HOST+':'+PORT+'/__probe'];const p=spawn(bin,a,{stdio:['ignore','pipe','pipe']});let out='',err='';const tm=setTimeout(()=>{p.kill('SIGKILL');reject(Error('timeout'))},48000);p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',e=>{clearTimeout(tm);reject(e)});p.on('close',code=>{clearTimeout(tm);resolve({code,out,err})})})}
await new Promise((resolve,reject)=>server.listen(PORT,HOST,e=>e?reject(e):resolve()));PORT=server.address().port;
try{
 const r=await run(browserBin()),m=r.out.match(/id="probeResult"[^>]*>([\s\S]*?)<\/pre>/i),result=(m?.[1]||'').replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim(),fatal=/Uncaught (?:TypeError|ReferenceError|SyntaxError)|net::ERR_|Aw, Snap/i.test(r.err);
 if(r.code!==0||fatal||!result.startsWith('PASS ')){console.error('PRISON AGE PASSAGE SMOKE FAIL',result||'(no result)');if(r.err.trim())console.error(r.err.slice(-3500));process.exitCode=1}else console.log('PRISON AGE PASSAGE SMOKE PASS',result.slice(5));
}finally{await new Promise(r=>server.close(()=>r()))}
