#!/usr/bin/env node
'use strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';

const ROOT=process.cwd(),HOST='127.0.0.1',PORT=41772;
const SAMPLE=[
  'Alpha opens the gate, Bravo names the path.',
  'Charlie keeps the address; Delta crosses the seam.',
  'Echo records a witness: Foxtrot preserves return.',
  'Golf checks the source, Hotel closes the loop.',
  'India remains residue. Juliet keeps the origin.',
  'Kilo proves re-entry. Lima ends the fixture.'
].join('\n\n');

function browserBin(){for(const n of ['google-chrome-stable','google-chrome','chromium-browser','chromium']){const r=spawnSync('which',[n],{encoding:'utf8'});if(r.status===0&&r.stdout.trim())return r.stdout.trim()}throw Error('No Chrome/Chromium')}
function ct(p){if(p.endsWith('.html'))return'text/html; charset=utf-8';if(p.endsWith('.js')||p.endsWith('.mjs'))return'text/javascript; charset=utf-8';if(p.endsWith('.json'))return'application/json; charset=utf-8';if(p.endsWith('.css'))return'text/css; charset=utf-8';if(p.endsWith('.svg'))return'image/svg+xml';return'application/octet-stream'}
function resolveFile(url){let q=decodeURIComponent(String(url||'/').split('?')[0]).replace(/^\/+/, '');if(!q)q='index.html';if(q.endsWith('/'))q+='index.html';const p=path.normalize(path.join(ROOT,q));if(!p.startsWith(ROOT))return null;if(fs.existsSync(p)&&fs.statSync(p).isFile())return p;if(fs.existsSync(p+'.html'))return p+'.html';return null}
function probe(){return `<!doctype html><html><body style="margin:0"><iframe id="f" style="width:430px;height:900px;border:0;display:block"></iframe><pre id="probeResult">PENDING</pre><script>
const SAMPLE=${JSON.stringify(SAMPLE)},RETURN_STORE='readfield.read-ride.return.v01';
const f=document.getElementById('f'),out=document.getElementById('probeResult'),rec={};let finished=false;
const done=(ok,x)=>{if(finished)return;finished=true;out.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(x)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const wait=async(fn,limit=18000,label='condition')=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(60)}throw Error('wait '+label)};
const W=()=>f.contentWindow,D=()=>W().document,same=(a,b)=>a&&b&&Number(a.start)===Number(b.start)&&Number(a.end)===Number(b.end);
(async()=>{try{
  f.src='/docs/';
  await wait(()=>D().getElementById('docAperture')?.snapshot&&typeof D().getElementById('readPaste')?.onclick==='function',16000,'READFIELD controller');
  D().getElementById('pasteText').value=SAMPLE;D().getElementById('readPaste').click();
  await wait(()=>D().getElementById('docAperture').snapshot()?.kind==='TEXT',5000,'paste source');
  const ap=D().getElementById('docAperture'),para=ap.scaleIndex('PARA');ap.setScale(para);ap.setPos(0);await sleep(80);
  rec.start=ap.snapshot();rec.sourceText=D().getElementById('text').textContent;
  D().getElementById('rideLive').click();
  await wait(()=>W().location.pathname==='/fold-bloom/live/'&&W().FoldBloomLive?.read?.current?.(),16000,'LIVE handoff');
  const api=W().FoldBloomLive,first=api.read.current();rec.liveStart=first;rec.sourceId=first.source.id;
  for(let i=0;i<3;i++){api.course.step(1);await sleep(100)}
  const end=api.read.current();rec.liveEnd=end;rec.visited=end.traversal?.visited||[];
  if(rec.visited.length!==4)throw Error('visited count '+rec.visited.length);
  const final={start:end.witness.start,end:end.witness.end};
  D().getElementById('readfieldReturn').click();
  await wait(()=>W().location.pathname==='/docs/'&&D().documentElement.dataset.readfieldRideReturn==='accepted',16000,'exact READFIELD return');
  const returned=D().getElementById('docAperture').snapshot();rec.returned=returned;
  if(!same(returned.span,final))throw Error('returned span mismatch');
  if(D().getElementById('text').textContent!==SAMPLE)throw Error('source bytes changed');
  const acceptedHash=rec.sourceId;

  // Stale-source attack: correct-looking address, wrong source identity.
  const beforeStale=D().getElementById('docAperture').snapshot();
  const stale={
    schema:'readfield-course-witness/v0.1',authority:'EVIDENCE_ONLY',
    source_id:'sha256:'+('0'.repeat(64)),source_hash:'sha256:'+('0'.repeat(64)),source_address:null,
    origin:{source_id:'sha256:'+('0'.repeat(64)),start:0,end:1,grain:'PARAGRAPH',address:'read://stale'},
    visited:[{source_id:'sha256:'+('0'.repeat(64)),start:0,end:1,grain:'PARAGRAPH',address:'read://stale'}],
    final:{source_id:'sha256:'+('0'.repeat(64)),start:0,end:1,grain:'PARAGRAPH',address:'read://stale'},
    traversal:{mode:'STEP',steps:0,grains_entered:1},witness:{text:SAMPLE.slice(0,1)},
    return:{route:'/docs/',source_id:'sha256:'+('0'.repeat(64)),cursor:{start:0,end:1}},created_at:new Date().toISOString()
  };
  sessionStorage.setItem(RETURN_STORE,JSON.stringify(stale));W().history.replaceState(null,'','?paste=1&ride_return=1#paste');
  const staleResult=await W().ReadfieldRideReturn.accept();const afterStale=D().getElementById('docAperture').snapshot();
  rec.stale={result:staleResult,before:beforeStale.span,after:afterStale.span};
  if(staleResult.ok||staleResult.reason!=='STALE_SOURCE'||!same(beforeStale.span,afterStale.span))throw Error('stale zero-mutation failed');

  // Malformed visit attack: valid current source id but overlapping/reordered trail.
  const bad=JSON.parse(JSON.stringify(end.returnWitness||{}));
  const template={
    schema:'readfield-course-witness/v0.1',authority:'EVIDENCE_ONLY',source_id:acceptedHash,source_hash:acceptedHash,source_address:null,
    origin:{source_id:acceptedHash,start:rec.visited[0].start,end:rec.visited[0].end,grain:'PARAGRAPH',address:rec.visited[0].address},
    visited:rec.visited.map(x=>({...x,source_id:acceptedHash})),
    final:{source_id:acceptedHash,start:final.start,end:final.end,grain:'PARAGRAPH',address:end.witness.address},
    traversal:{mode:'STEP',steps:3,grains_entered:4},witness:{text:end.witness.text},
    return:{route:'/docs/',source_id:acceptedHash,cursor:{start:final.start,end:final.end}},created_at:new Date().toISOString()
  };
  template.visited[2].start=template.visited[1].start;
  const beforeBad=D().getElementById('docAperture').snapshot();sessionStorage.setItem(RETURN_STORE,JSON.stringify(template));W().history.replaceState(null,'','?paste=1&ride_return=1#paste');
  const badResult=await W().ReadfieldRideReturn.accept();const afterBad=D().getElementById('docAperture').snapshot();
  rec.malformed={result:badResult,before:beforeBad.span,after:afterBad.span};
  if(badResult.ok||badResult.reason!=='MALFORMED_VISIT'||!same(beforeBad.span,afterBad.span))throw Error('malformed zero-mutation failed');

  const ok=rec.visited.length===4&&same(rec.returned.span,final)&&rec.stale.result.reason==='STALE_SOURCE'&&rec.malformed.result.reason==='MALFORMED_VISIT';
  done(ok,{sourceId:rec.sourceId,steps:3,visited:rec.visited,final,returned:rec.returned.span,stale:rec.stale.result,malformed:rec.malformed.result,exact:ok});
}catch(e){done(false,{...rec,error:String(e?.stack||e),href:(()=>{try{return W().location.href}catch(_){return null}})()})}})();
<\/script></body></html>`}
const server=http.createServer((req,res)=>{if(String(req.url||'').startsWith('/__probe')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(probe());return}const p=resolveFile(req.url);if(!p){res.writeHead(404);res.end('not found');return}res.writeHead(200,{'content-type':ct(p),'cache-control':'no-store'});fs.createReadStream(p).pipe(res)});
function run(bin){return new Promise((resolve,reject)=>{const a=['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--window-size=520,940','--virtual-time-budget=36000','--dump-dom','http://'+HOST+':'+PORT+'/__probe'];const p=spawn(bin,a,{stdio:['ignore','pipe','pipe']});let out='',err='';const tm=setTimeout(()=>{p.kill('SIGKILL');reject(Error('timeout'))},48000);p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',e=>{clearTimeout(tm);reject(e)});p.on('close',code=>{clearTimeout(tm);resolve({code,out,err})})})}
await new Promise((resolve,reject)=>server.listen(PORT,HOST,e=>e?reject(e):resolve()));
try{const r=await run(browserBin()),m=r.out.match(/id="probeResult"[^>]*>([\s\S]*?)<\/pre>/i),result=(m?.[1]||'').replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim(),fatal=/Uncaught (?:TypeError|ReferenceError|SyntaxError)|net::ERR_|Aw, Snap/i.test(r.err);if(r.code!==0||fatal||!result.startsWith('PASS ')){console.error('READFIELD → LIVE EXACT RETURN FAIL',result||'(no result)');if(r.err.trim())console.error(r.err.slice(-2600));process.exitCode=1}else console.log('READFIELD → LIVE EXACT RETURN PASS',result.slice(5))}finally{await new Promise(r=>server.close(()=>r()))}
