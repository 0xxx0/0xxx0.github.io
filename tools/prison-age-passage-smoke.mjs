#!/usr/bin/env node
'use strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
const ROOT=process.cwd(),HOST='127.0.0.1';let PORT=0;
function browserBin(){for(const n of ['google-chrome-stable','google-chrome','chromium-browser','chromium']){const r=spawnSync('which',[n],{encoding:'utf8'});if(r.status===0&&r.stdout.trim())return r.stdout.trim()}throw Error('No Chrome/Chromium')}
function ct(p){if(p.endsWith('.html'))return'text/html; charset=utf-8';if(p.endsWith('.js')||p.endsWith('.mjs'))return'text/javascript; charset=utf-8';if(p.endsWith('.json'))return'application/json; charset=utf-8';if(p.endsWith('.md')||p.endsWith('.txt'))return'text/plain; charset=utf-8';if(p.endsWith('.css'))return'text/css; charset=utf-8';return'application/octet-stream'}
function resolveFile(url){let q=decodeURIComponent(String(url||'/').split('?')[0]).replace(/^\/+/, '');if(!q)q='index.html';if(q.endsWith('/'))q+='index.html';const p=path.normalize(path.join(ROOT,q));if(!p.startsWith(ROOT))return null;if(fs.existsSync(p)&&fs.statSync(p).isFile())return p;if(fs.existsSync(p+'.html'))return p+'.html';return null}
function probe(){return `<!doctype html><html><body><iframe id="f" style="width:460px;height:920px;border:0"></iframe><pre id="probeResult">PENDING</pre><script>
const f=document.getElementById('f'),out=document.getElementById('probeResult'),rec={};let finished=false;
const done=(ok,x)=>{if(finished)return;finished=true;out.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(x)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const wait=async(fn,limit=16000,label='condition')=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(60)}throw Error('wait '+label)};
const W=()=>f.contentWindow,D=()=>W().document;
(async()=>{try{
 f.src='/prison-age/?passage=nine&gate=1';
 await wait(()=>W().PrisonAgePassageAPI?.snapshot?.()?.gate===1,16000,'passage boot');
 let snap=W().PrisonAgePassageAPI.snapshot();
 rec.start={gate:snap.gate,role:D().getElementById('ppRole')?.textContent?.trim(),quote:D().getElementById('ppQuote')?.textContent?.replace(/\\s+/g,' ').trim(),order:snap.route.order_authority,authority:snap.route.authority,href:W().location.search};
 if(rec.start.gate!==1||rec.start.role!=='ORIGIN'||!/9 gate cities exist/.test(rec.start.quote)||rec.start.order!=='EDITORIAL_NON_CANON'||!rec.start.authority.includes('EVIDENCE_ONLY'))throw Error('gate 1 source route');

 W().PrisonAgePassageAPI.openGate(2);await sleep(80);snap=W().PrisonAgePassageAPI.snapshot();
 rec.g2={gate:snap.gate,role:D().getElementById('ppRole')?.textContent?.trim(),transition:D().getElementById('ppTransition')?.textContent?.replace(/\\s+/g,' ').trim(),href:W().location.search};
 if(rec.g2.gate!==2||rec.g2.role!=='WEATHER'||!/ECHO \/ EXACT CROSS-SOURCE ECHO/.test(rec.g2.transition)||!/ATLAS 04/.test(rec.g2.transition)||!new URL(W().location.href).searchParams.get('gate')==='2')throw Error('gate 2 echo');
 const read=W().PrisonAgePassageAPI.readUrl(2),readU=new URL(read,W().location.origin);rec.read={src:readU.searchParams.get('src'),char:Number(readU.searchParams.get('ap_char')),ret:readU.searchParams.get('return'),echo:readU.searchParams.get('echo_source')};
 if(rec.read.src!=='/prison-age/stories/03-open-air.md'||!Number.isInteger(rec.read.char)||rec.read.char<1||rec.read.echo!=='open-air'||!rec.read.ret.includes('passage=nine'))throw Error('exact READ address');
 const ride=await W().PrisonAgePassageAPI.ridePacket(2);rec.ride={kind:ride.kind,source:ride.packet?.sourceIdentity?.address,authority:ride.packet?.sourceIdentity?.authority,start:ride.packet?.focus?.span?.start,end:ride.packet?.focus?.span?.end,char:ride.packet?.focus?.char_index,ret:ride.packet?.returnAddress,echo:ride.packet?.echo?.source_id};
 if(ride.kind!=='READ_RIDE_PACKET'||rec.ride.source!==rec.read.src||rec.ride.authority!=='PRISON_AGE'||rec.ride.start!==rec.read.char||rec.ride.char!==rec.read.char||!(rec.ride.end>rec.ride.start)||rec.ride.echo!=='open-air')throw Error('exact RIDE packet');
 const openAir=await fetch('/prison-age/stories/03-open-air.md').then(r=>r.text());if(!/One afternoon, the vent breathed backward\./.test(openAir.slice(rec.ride.start,rec.ride.end)))throw Error('RIDE span source mismatch');

 for(let g=3;g<=9;g++){W().PrisonAgePassageAPI.openGate(g);await sleep(25)}
 snap=W().PrisonAgePassageAPI.snapshot();const packet=W().PrisonAgePassageAPI.returnPacket();
 rec.final={gate:snap.gate,visited:snap.visited,trail:snap.trail,result:packet.result,addresses:packet.visited.length,transitions:packet.transitions_crossed,authority:packet.authority,next:packet.next,field:packet.field_return?.schema||null,residue:packet.residue};
 if(rec.final.gate!==9||rec.final.visited.length!==9||packet.result!=='COMPLETE'||packet.visited.length!==9||packet.authority!=='EVIDENCE_ONLY'||packet.next!=='NONE_UNTIL_REPLAN'||packet.field_return?.schema!=='field-return-envelope/v0.1')throw Error('passage RETURN');
 if(!packet.visited.every(x=>String(x.address).startsWith('source://prison-age/')))throw Error('RETURN exact addresses');
 if(!packet.residue.includes('traversal != comprehension')||!packet.residue.includes('curated order != canon'))throw Error('RETURN residue');
 if(!packet.transitions_crossed.some(x=>x.kind==='ECHO_EXACT_SELECTED'&&/ATLAS 04/.test(x.evidence)))throw Error('RETURN lost ECHO witness');
 done(true,rec);
}catch(e){done(false,{...rec,error:String(e?.stack||e),href:(()=>{try{return W().location.href}catch(_){return null}})()})}})();
<\/script></body></html>`}
const server=http.createServer((req,res)=>{if(String(req.url||'').startsWith('/__probe')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(probe());return}const p=resolveFile(req.url);if(!p){res.writeHead(404);res.end('not found');return}res.writeHead(200,{'content-type':ct(p),'cache-control':'no-store'});fs.createReadStream(p).pipe(res)});
function run(bin){return new Promise((resolve,reject)=>{const a=['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--window-size=500,980','--virtual-time-budget=26000','--dump-dom','http://'+HOST+':'+PORT+'/__probe'];const p=spawn(bin,a,{stdio:['ignore','pipe','pipe']});let out='',err='';const tm=setTimeout(()=>{p.kill('SIGKILL');reject(Error('timeout'))},38000);p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',e=>{clearTimeout(tm);reject(e)});p.on('close',code=>{clearTimeout(tm);resolve({code,out,err})})})}
await new Promise((resolve,reject)=>server.listen(PORT,HOST,e=>e?reject(e):resolve()));PORT=server.address().port;
try{const r=await run(browserBin()),m=r.out.match(/id="probeResult"[^>]*>([\s\S]*?)<\/pre>/i),result=(m?.[1]||'').replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim(),fatal=/Uncaught (?:TypeError|ReferenceError|SyntaxError)|net::ERR_|Aw, Snap/i.test(r.err);if(r.code!==0||fatal||!result.startsWith('PASS ')){console.error('PRISON AGE PASSAGE SMOKE FAIL',result||'(no result)');if(r.err.trim())console.error(r.err.slice(-3600));process.exitCode=1}else console.log('PRISON AGE PASSAGE SMOKE PASS',result.slice(5))}finally{await new Promise(r=>server.close(()=>r()))}
