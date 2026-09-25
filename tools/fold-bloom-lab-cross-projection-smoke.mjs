#!/usr/bin/env node
'use strict';

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';

const ROOT=process.cwd();
const HOST='127.0.0.1';
const PORT=41743;

function browserBin(){
  for(const name of ['google-chrome-stable','google-chrome','chromium-browser','chromium']){
    const r=spawnSync('which',[name],{encoding:'utf8'});
    if(r.status===0&&r.stdout.trim())return r.stdout.trim();
  }
  throw new Error('No Chrome/Chromium binary found for FIELD LAB cross-projection proof');
}
function contentType(p){
  if(p.endsWith('.html'))return 'text/html; charset=utf-8';
  if(p.endsWith('.js')||p.endsWith('.mjs'))return 'text/javascript; charset=utf-8';
  if(p.endsWith('.json'))return 'application/json; charset=utf-8';
  if(p.endsWith('.css'))return 'text/css; charset=utf-8';
  if(p.endsWith('.svg'))return 'image/svg+xml';
  return 'application/octet-stream';
}
function resolveFile(urlPath){
  let clean=decodeURIComponent(String(urlPath||'/').split('?')[0]).replace(/^\/+/, '');
  if(!clean)clean='index.html';
  if(clean.endsWith('/'))clean+='index.html';
  const p=path.normalize(path.join(ROOT,clean));
  if(!p.startsWith(ROOT))return null;
  if(fs.existsSync(p)&&fs.statSync(p).isFile())return p;
  if(fs.existsSync(p+'.html'))return p+'.html';
  return null;
}
function probeHtml(){
  return `<!doctype html><html><body style="margin:0;background:#05070b;color:#eee"><iframe id="f" style="width:430px;height:900px;border:0;display:block" src="/fold-bloom/lab/?mode=VERSE"></iframe><pre id="probeResult">PENDING</pre><script>
  const f=document.getElementById('f'),out=document.getElementById('probeResult'),rec={};let finished=false;
  const done=(ok,data)=>{if(finished)return;finished=true;out.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(data)};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const waitFor=async(fn,limit=15000,label='condition')=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(60)}throw new Error('waitFor timeout: '+label)};
  (async()=>{
    const W=()=>f.contentWindow,D=()=>W().document;
    await waitFor(()=>D().documentElement.dataset.foldBloomFieldLab==='ready'&&W().FoldBloomFieldLab?.verse?.(),15000,'FIELD LAB ready');
    const source=['alpha beta gamma','delta epsilon zeta','eta theta iota'].join('\\n');
    const verseSource=D().getElementById('verseSource');
    verseSource.value=source;D().getElementById('verseBind').click();
    await waitFor(()=>D().querySelectorAll('[data-verse-line]').length===3,6000,'VERSE lines');
    D().querySelector('[data-verse-line="1"]').click();await sleep(100);
    const first=W().FoldBloomFieldLab.verse();
    rec.startSource=first.source===source;rec.startAddress=first.focus?.address||'';rec.startLine=first.focus?.line;

    D().getElementById('verseRead').click();
    await waitFor(()=>W().FoldBloomFieldLab.mode()==='READ'&&W().FoldBloomFieldLab.reader()?.scale,8000,'VERSE to READ');
    const read=W().FoldBloomFieldLab.reader();
    rec.readSource=D().getElementById('readSource').value===source;
    rec.readAddress=read?.address||'';rec.readChar=read?.char_index;
    rec.readInFocusedLine=Number(read?.char_index)>=Number(first.focus?.start)&&Number(read?.char_index)<=Number(first.focus?.end);

    D().getElementById('readToLoci').click();
    await waitFor(()=>W().FoldBloomFieldLab.mode()==='LOCI'&&String(D().getElementById('addressRead').textContent||'').startsWith('text://'),8000,'READ to LOCI');
    rec.lociSource=D().getElementById('lociSource').value===source;
    rec.lociAddress=D().getElementById('addressRead').textContent||'';

    D().getElementById('lociToVerse').click();
    await waitFor(()=>W().FoldBloomFieldLab.mode()==='VERSE'&&W().FoldBloomFieldLab.verse()?.focus,8000,'LOCI to VERSE');
    await sleep(100);
    const last=W().FoldBloomFieldLab.verse(),packet=W().FoldBloomFieldLab.returnPacket();
    rec.finalSource=last.source===source;rec.finalAddress=last.focus?.address||'';rec.finalLine=last.focus?.line;
    rec.focusReturned=rec.startAddress===rec.finalAddress&&rec.startLine===rec.finalLine;
    rec.route=packet?.evidence?.modes||[];rec.events=packet?.evidence?.events;
    rec.authority=packet?.authority;rec.projection=packet?.projection?.kind;
    rec.rawSourceAbsent=!JSON.stringify(packet).includes(source);
    rec.trace=W().FoldBloomFieldLab.trace().map(x=>x.mode);
    const pass=rec.startSource&&rec.readSource&&rec.readInFocusedLine&&rec.lociSource&&rec.finalSource&&rec.focusReturned&&rec.route.includes('VERSE')&&rec.route.includes('READ')&&rec.route.includes('LOCI')&&rec.authority==='EVIDENCE_ONLY'&&rec.projection==='VERSE'&&rec.rawSourceAbsent;
    done(pass,rec);
  })().catch(e=>done(false,{...rec,error:String(e?.stack||e)}));
  <\/script></body></html>`;
}

const server=http.createServer((req,res)=>{
  if(String(req.url||'').startsWith('/__probe')){
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
    res.end(probeHtml());return;
  }
  const file=resolveFile(req.url);
  if(!file){res.writeHead(404,{'content-type':'text/plain'});res.end('not found');return}
  res.writeHead(200,{'content-type':contentType(file),'cache-control':'no-store'});
  fs.createReadStream(file).pipe(res);
});
function runChrome(bin){
  return new Promise((resolve,reject)=>{
    const args=['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--hide-scrollbars','--window-size=430,980','--virtual-time-budget=14000','--dump-dom','http://'+HOST+':'+PORT+'/__probe'];
    const p=spawn(bin,args,{stdio:['ignore','pipe','pipe']});let out='',err='';
    const timer=setTimeout(()=>{p.kill('SIGKILL');reject(new Error('FIELD LAB cross-projection proof timeout'))},22000);
    p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);
    p.on('error',e=>{clearTimeout(timer);reject(e)});
    p.on('close',code=>{clearTimeout(timer);resolve({code,out,err})});
  });
}
function resultText(dom){
  const m=String(dom||'').match(/id="probeResult"[^>]*>([\s\S]*?)<\/pre>/i);
  return (m?.[1]||'').replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim();
}

await new Promise((resolve,reject)=>server.listen(PORT,HOST,e=>e?reject(e):resolve()));
try{
  const r=await runChrome(browserBin()),result=resultText(r.out);
  const fatal=/Uncaught (?:TypeError|ReferenceError|SyntaxError)|net::ERR_|Aw, Snap/i.test(r.err);
  if(r.code!==0||fatal||!result.startsWith('PASS ')){
    console.error('FIELD LAB CROSS-PROJECTION PROOF FAIL',result||'(no result)');
    if(r.err.trim())console.error(r.err.slice(-2400));
    process.exitCode=1;
  }else console.log('FIELD LAB CROSS-PROJECTION PROOF PASS',result.slice(5));
}finally{
  await new Promise(resolve=>server.close(()=>resolve()));
}
