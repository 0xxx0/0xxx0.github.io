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
function probe(){return `<!doctype html><html><body><iframe id="f" style="width:560px;height:980px;border:0"></iframe><pre id="probeResult">PENDING</pre><script>
const f=document.getElementById('f'),out=document.getElementById('probeResult'),rec={};let finished=false;
const done=(ok,x)=>{if(finished)return;finished=true;out.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(x)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const wait=async(fn,limit=18000,label='condition')=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(60)}throw Error('wait '+label)};
const W=()=>f.contentWindow,D=()=>W().document;
(async()=>{try{
  f.src='/prison-age/?atlas=evidence&card=4&return=field';
  await wait(()=>W().PrisonAgeEvidenceAtlas?.snapshot&&W().PrisonAgeEvidenceRide&&!D().getElementById('paEvidence')?.hidden,16000,'atlas');
  const held=W().PrisonAgeEvidenceAtlas.snapshot().held;
  if(held?.n!==4)throw Error('deep link card');
  const [ar,br]=await Promise.all([fetch(held.a.path).then(r=>r.text()),fetch(held.b.path).then(r=>r.text())]);
  rec.exact={a:ar.slice(held.a.start,held.a.end)===held.a.text,b:br.slice(held.b.start,held.b.end)===held.b.text};
  if(!rec.exact.a||!rec.exact.b)throw Error('exact source drift');

  for(const n of [8,25,30]){W().PrisonAgeEvidenceAtlas.select(n);W().PrisonAgeEvidenceAtlas.add()}
  const trail=W().PrisonAgeEvidenceAtlas.snapshot().trail,share=W().PrisonAgeEvidenceAtlas.sharePath();
  if(trail.join(',')!=='8,25,30'||!share.includes('trail=8%2C25%2C30'))throw Error('trail/share');
  rec.trail={trail,share,readout:D().getElementById('peaTrailReadout')?.textContent||''};
  if(!/6 EXACT FRAGMENTS/.test(rec.trail.readout))throw Error('exact fragment readout');

  f.src=share;
  await wait(()=>W().PrisonAgeEvidenceAtlas?.snapshot?.().trail?.join(',')==='8,25,30'&&!D().getElementById('paEvidence')?.hidden,16000,'share restore');
  const atlas=await fetch('/prison-age/evidence-atlas.json').then(r=>r.json());
  const expected=W().PrisonAgeEvidenceRide.build(atlas,[8,25,30],{returnAddress:share});
  const valid=W().PrisonAgeEvidenceRide.validate(atlas,expected);if(!valid.ok)throw Error('pre-ride '+valid.errors.join(' / '));
  rec.expected={address:expected.sourceIdentity.address,authority:expected.sourceIdentity.authority,hash:expected.sourceIdentity.hash,cards:expected.evidenceRoute.cards.map(x=>x.n),fragments:expected.evidenceRoute.fragments.length};

  D().getElementById('peaRide').click();
  await wait(()=>W().location.pathname==='/fold-bloom/live/'&&W().FoldBloomLive?.read?.current?.(),18000,'LIVE');
  const live=W().FoldBloomLive.read.current(),witness=String(live?.witness?.text||'');
  rec.live={href:W().location.pathname+W().location.search,address:live?.source?.address,authority:live?.source?.authority,kind:live?.source?.kind,returnAddress:live?.returnAddress,witness};
  if(rec.live.address!==expected.sourceIdentity.address||rec.live.authority!=='PRISON_AGE_EVIDENCE_ROUTE'||rec.live.kind!=='PRISON_AGE_EVIDENCE_ROUTE'||!rec.live.returnAddress.includes('trail=8%2C25%2C30')||!witness||!expected.source.includes(witness))throw Error('LIVE route identity');

  const back=D().getElementById('readfieldReturn');if(!back||back.hidden)throw Error('RETURN SOURCE absent');back.click();
  await wait(()=>W().location.pathname==='/prison-age/'&&W().PrisonAgeEvidenceAtlas?.snapshot?.().trail?.join(',')==='8,25,30'&&!D().getElementById('paEvidence')?.hidden,16000,'RETURN');
  rec.returned={href:W().location.pathname+W().location.search,trail:W().PrisonAgeEvidenceAtlas.snapshot().trail,held:W().PrisonAgeEvidenceAtlas.snapshot().held?.n};
  if(!rec.returned.href.includes('atlas=evidence')||rec.returned.trail.join(',')!=='8,25,30')throw Error('RETURN trail');
  done(true,rec);
}catch(e){done(false,{...rec,error:String(e?.stack||e),href:(()=>{try{return W().location.href}catch(_){return null}})()})}})();
<\/script></body></html>`}
function probeScript(){const html=probe(),m=html.match(/<script>([\s\S]*?)<\/script>/i);if(!m)throw Error('probe script missing');return m[1]}
try{new Function(probeScript())}catch(e){console.error('PRISON AGE EVIDENCE ATLAS PROBE PARSE FAIL',e.stack||e);process.exit(1)}
const server=http.createServer((req,res)=>{if(String(req.url||'').startsWith('/__probe')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(probe());return}const p=resolveFile(req.url);if(!p){res.writeHead(404);res.end('not found');return}res.writeHead(200,{'content-type':ct(p),'cache-control':'no-store'});fs.createReadStream(p).pipe(res)});
function run(bin){return new Promise((resolve,reject)=>{const args=['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--window-size=600,1000','--virtual-time-budget=30000','--dump-dom','http://'+HOST+':'+PORT+'/__probe'];const p=spawn(bin,args,{stdio:['ignore','pipe','pipe']});let out='',err='';const timer=setTimeout(()=>{p.kill('SIGKILL');reject(Error('timeout'))},44000);p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',e=>{clearTimeout(timer);reject(e)});p.on('close',code=>{clearTimeout(timer);resolve({code,out,err})})})}
await new Promise((resolve,reject)=>server.listen(PORT,HOST,e=>e?reject(e):resolve()));PORT=server.address().port;
try{const r=await run(browserBin()),m=r.out.match(/id="probeResult"[^>]*>([\s\S]*?)<\/pre>/i),result=(m?.[1]||'').replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim(),fatal=/Uncaught (?:TypeError|ReferenceError|SyntaxError)|net::ERR_|Aw, Snap/i.test(r.err);if(r.code!==0||fatal||!result.startsWith('PASS ')){console.error('PRISON AGE EVIDENCE ATLAS SMOKE FAIL',result||'(no result)');if(r.err.trim())console.error(r.err.slice(-3200));process.exitCode=1}else console.log('PRISON AGE EVIDENCE ATLAS SMOKE PASS',result.slice(5))}finally{await new Promise(r=>server.close(()=>r()))}
