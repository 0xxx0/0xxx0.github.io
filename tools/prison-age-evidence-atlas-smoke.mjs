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
function probe(){return `<!doctype html><html><body><iframe id="f" style="width:560px;height:980px;border:0"></iframe><pre id="probeResult">PENDING</pre><script>
const f=document.getElementById('f'),out=document.getElementById('probeResult'),rec={};let doneFlag=false;
const done=(ok,x)=>{if(doneFlag)return;doneFlag=true;out.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(x)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const wait=async(fn,limit=16000,label='condition')=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(60)}throw Error('wait '+label)};
const W=()=>f.contentWindow,D=()=>W().document;
(async()=>{try{
 f.src='/prison-age/?atlas=evidence&card=4&return=field';
 await wait(()=>W().PrisonAgeEvidenceAtlas?.snapshot&&D().getElementById('paEvidence')&&!D().getElementById('paEvidence').hidden,16000,'atlas open');
 const snap=W().PrisonAgeEvidenceAtlas.snapshot(),held=snap.held;
 rec.open={visible:snap.visible,n:held?.n,class:held?.class,pair:held?.pair,url:W().location.search,shared:held?.shared,phrases:held?.phrases};
 if(held?.n!==4||!snap.visible||!W().location.search.includes('atlas=evidence'))throw Error('deep link restore');

 const a=held.a,b=held.b;
 const [ar,br]=await Promise.all([fetch(a.path).then(r=>r.text()),fetch(b.path).then(r=>r.text())]);
 rec.exact={a:ar.slice(a.start,a.end)===a.text,b:br.slice(b.start,b.end)===b.text,aAddr:a.address,bAddr:b.address};
 if(!rec.exact.a||!rec.exact.b)throw Error('exact fragment drift');

 const links=[...D().querySelectorAll('#peaFragments a')].map(a=>({text:a.textContent,href:a.getAttribute('href')}));
 rec.links=links;
 if(!links.some(x=>/^READ A/.test(x.text)&&x.href.includes('ap_char='+a.start))||!links.some(x=>/^READ B/.test(x.text)&&x.href.includes('ap_char='+b.start)))throw Error('exact READ links');

 for(const n of [4,8,25,30]){W().PrisonAgeEvidenceAtlas.select(n);W().PrisonAgeEvidenceAtlas.add()}
 const route=W().PrisonAgeEvidenceAtlas.packet(),after=W().PrisonAgeEvidenceAtlas.snapshot();
 rec.route={schema:route.schema,authority:route.authority,cards:route.cards.map(x=>x.n),trail:after.trail};
 if(route.schema!=='prison-age.evidence-route/v0.1'||route.authority!=='EVIDENCE_ONLY'||route.cards.length!==3||after.trail.join(',')!=='8,25,30')throw Error('three-card evidence trail');

 const atlas=await fetch('/prison-age/evidence-atlas.json').then(r=>r.json());
 rec.truth={cards:atlas.cards.length,authority:atlas.authority,classes:[...new Set(atlas.cards.map(x=>x.class))],pairs:[...new Set(atlas.cards.map(x=>x.pair))].length};
 if(atlas.cards.length!==32||atlas.authority!=='EVIDENCE_ONLY'||rec.truth.pairs!==6)throw Error('atlas truth');

 const body=D().getElementById('paEvidence').textContent;
 rec.noGenerated=!/ROLE ENGINE|BOUNDARY ENGINE|ESCAPE RHYTHM ENGINE|AUTHORSHIP ENGINE/.test(body);
 if(!rec.noGenerated)throw Error('generated engine residue');

 D().getElementById('peaClose').click();rec.closed=D().getElementById('paEvidence').hidden&&!W().location.search.includes('atlas=evidence');
 if(!rec.closed)throw Error('return source');

 done(true,rec);
}catch(e){done(false,{...rec,error:String(e?.stack||e)})}})();
<\/script></body></html>`}
const server=http.createServer((req,res)=>{if(String(req.url||'').startsWith('/__probe')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(probe());return}const p=resolveFile(req.url);if(!p){res.writeHead(404);res.end('not found');return}res.writeHead(200,{'content-type':ct(p),'cache-control':'no-store'});fs.createReadStream(p).pipe(res)});
function run(bin){return new Promise((resolve,reject)=>{const a=['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--window-size=600,1000','--virtual-time-budget=24000','--dump-dom','http://'+HOST+':'+PORT+'/__probe'];const p=spawn(bin,a,{stdio:['ignore','pipe','pipe']});let out='',err='';const tm=setTimeout(()=>{p.kill('SIGKILL');reject(Error('timeout'))},36000);p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',e=>{clearTimeout(tm);reject(e)});p.on('close',code=>{clearTimeout(tm);resolve({code,out,err})})})}
await new Promise((resolve,reject)=>server.listen(PORT,HOST,e=>e?reject(e):resolve()));PORT=server.address().port;
try{
 const r=await run(browserBin()),m=r.out.match(/id="probeResult"[^>]*>([\s\S]*?)<\/pre>/i),result=(m?.[1]||'').replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim(),fatal=/Uncaught (?:TypeError|ReferenceError|SyntaxError)|net::ERR_|Aw, Snap/i.test(r.err);
 if(r.code!==0||fatal||!result.startsWith('PASS ')){console.error('PRISON AGE EVIDENCE ATLAS SMOKE FAIL',result||'(no result)');if(r.err.trim())console.error(r.err.slice(-3500));process.exitCode=1}else console.log('PRISON AGE EVIDENCE ATLAS SMOKE PASS',result.slice(5));
}finally{await new Promise(r=>server.close(()=>r()))}
