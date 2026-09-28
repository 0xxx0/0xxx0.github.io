#!/usr/bin/env node
'use strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
const ROOT=process.cwd(),HOST='127.0.0.1',PORT=41783;
function browserBin(){for(const n of ['google-chrome-stable','google-chrome','chromium-browser','chromium']){const r=spawnSync('which',[n],{encoding:'utf8'});if(r.status===0&&r.stdout.trim())return r.stdout.trim()}throw Error('No Chrome/Chromium')}
function ct(p){if(p.endsWith('.html'))return'text/html; charset=utf-8';if(p.endsWith('.js')||p.endsWith('.mjs'))return'text/javascript; charset=utf-8';if(p.endsWith('.json'))return'application/json; charset=utf-8';if(p.endsWith('.md')||p.endsWith('.txt'))return'text/plain; charset=utf-8';if(p.endsWith('.css'))return'text/css; charset=utf-8';return'application/octet-stream'}
function resolveFile(url){let q=decodeURIComponent(String(url||'/').split('?')[0]).replace(/^\/+/, '');if(!q)q='index.html';if(q.endsWith('/'))q+='index.html';const p=path.normalize(path.join(ROOT,q));if(!p.startsWith(ROOT))return null;if(fs.existsSync(p)&&fs.statSync(p).isFile())return p;if(fs.existsSync(p+'.html'))return p+'.html';return null}
function probe(){return `<!doctype html><html><body><iframe id="f" style="width:430px;height:900px;border:0"></iframe><pre id="probeResult">PENDING</pre><script>
const f=document.getElementById('f'),out=document.getElementById('probeResult'),rec={};let doneFlag=false;
const done=(ok,x)=>{if(doneFlag)return;doneFlag=true;out.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(x)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const wait=async(fn,limit=12000,label='condition')=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(50)}throw Error('wait '+label)};
const W=()=>f.contentWindow,D=()=>W().document;
(async()=>{try{
 f.src='/prison-age/';
 await wait(()=>W().PrisonAgeReaderAPI?.snapshot&&D().getElementById('threshold'),16000,'reader boot');
 rec.threshold={visible:!D().getElementById('threshold').classList.contains('off'),title:D().querySelector('.big')?.textContent||'',motif:D().querySelector('.voiceLine')?.textContent||''};
 if(!rec.threshold.visible||!/BEHIND YOU/.test(rec.threshold.title)||rec.threshold.motif!=="I'm always behind you.")throw Error('threshold/motif');
 D().getElementById('enter').click();
 await W().PrisonAgeReaderAPI.goto('open-air',6);
 await wait(()=>W().PrisonAgeReaderAPI.snapshot().idx===6,3000,'goto');
 const before=D().getElementById('paragraph').textContent;
 W().PrisonAgeReaderAPI.advance();await sleep(80);
 const s1=W().PrisonAgeReaderAPI.snapshot(),afterimage=D().getElementById('after').textContent;
 rec.read={before,after:D().getElementById('paragraph').textContent,afterimage,idx:s1.idx};
 if(afterimage!==before||s1.idx!==7)throw Error('afterimage/progression');

 const mid=Math.floor(s1.paragraphs*.45);await W().PrisonAgeReaderAPI.goto('open-air',mid);await sleep(80);
 rec.voice=W().PrisonAgeReaderAPI.snapshot().voice;
 if(rec.voice!=='CAMERA')throw Error('provenance voice did not change');

 D().getElementById('more').click();D().getElementById('markRule').click();await sleep(100);
 const marked=W().PrisonAgeReaderAPI.snapshot();
 rec.mark={label:marked.mark?.label||null,index:marked.mark?.index??null,class:D().getElementById('paragraph').className};
 if(rec.mark.label!=='RULE'||!rec.mark.class.includes('marked'))throw Error('explicit RULE mark');
 const focus=new URL(D().getElementById('focusLink').href);
 rec.focus={path:focus.pathname,src:focus.searchParams.get('src'),returnTo:focus.searchParams.get('return'),char:focus.searchParams.get('ap_char'),scale:focus.searchParams.get('ap_scale')};
 if(rec.focus.path!=='/docs/'||rec.focus.src!=='/prison-age/stories/03-open-air.md'||rec.focus.scale!=='PARAGRAPH'||!(Number(rec.focus.char)>0)||!/prison-age/.test(rec.focus.returnTo||''))throw Error('READFIELD focus handoff');

 await W().PrisonAgeReaderAPI.goto('open-air',marked.paragraphs-1);await sleep(60);W().PrisonAgeReaderAPI.advance();
 await wait(()=>W().PrisonAgeReaderAPI.snapshot().returnOpen,2500,'return');
 const receipt=W().PrisonAgeReaderAPI.receipt();
 rec.return={schema:receipt.schema,prompt:receipt.operatorPrompt,marks:receipt.marks,open:W().PrisonAgeReaderAPI.snapshot().returnOpen};
 if(receipt.schema!=='prison-age.reader-return/v0.2'||!/control been mistaken for care/.test(receipt.operatorPrompt)||!receipt.marks.some(m=>m.kind==='RULE')||receipt.carryCandidate?.kind!=='RULE'||!receipt.path?.pressure)throw Error('return receipt/carry');

 D().getElementById('reread').click();await sleep(80);
 rec.reentry={voice:W().PrisonAgeReaderAPI.snapshot().voice,idx:W().PrisonAgeReaderAPI.snapshot().idx,mark:W().PrisonAgeReaderAPI.snapshot().mark?.label||null};
 if(rec.reentry.voice!=='YOUR PREVIOUS PASS'||rec.reentry.idx!==0)throw Error('previous pass provenance');

 D().getElementById('returner').classList.remove('off');D().getElementById('nextStory').click();
 await wait(()=>W().PrisonAgeReaderAPI.snapshot().storyId==='fandom-court'&&/BEHIND YOU/.test(D().getElementById('behind')?.textContent||''),4000,'next story rendered carry');
 rec.next={story:W().PrisonAgeReaderAPI.snapshot().storyId,source:W().PrisonAgeReaderAPI.snapshot().source,behind:W().PrisonAgeReaderAPI.snapshot().behind,pressure:W().PrisonAgeReaderAPI.snapshot().pressure};
 if(rec.next.source!=='/prison-age/stories/05-fandom-court.md'||rec.next.behind?.kind!=='RULE'||!rec.next.pressure)throw Error('curated path/carry handoff');
 await W().PrisonAgeReaderAPI.goto('last-stall',0);await sleep(80);rec.lastStall={source:W().PrisonAgeReaderAPI.snapshot().source,text:D().getElementById('paragraph').textContent};if(rec.lastStall.source!=='/prison-age/stories/07-last-stall-extract.md')throw Error('Last Stall route');
 D().getElementById('more').click();D().getElementById('clearBehind').click();await sleep(60);rec.clearBehind=W().PrisonAgeReaderAPI.snapshot().behind;if(rec.clearBehind)throw Error('clear behind');
 done(true,rec);
}catch(e){done(false,{...rec,error:String(e?.stack||e)})}})();
<\/script></body></html>`}
const server=http.createServer((req,res)=>{if(String(req.url||'').startsWith('/__probe')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(probe());return}const p=resolveFile(req.url);if(!p){res.writeHead(404);res.end('not found');return}res.writeHead(200,{'content-type':ct(p),'cache-control':'no-store'});fs.createReadStream(p).pipe(res)});
function run(bin){return new Promise((resolve,reject)=>{const a=['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--window-size=460,940','--virtual-time-budget=18000','--dump-dom','http://'+HOST+':'+PORT+'/__probe'];const p=spawn(bin,a,{stdio:['ignore','pipe','pipe']});let out='',err='';const tm=setTimeout(()=>{p.kill('SIGKILL');reject(Error('timeout'))},30000);p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',e=>{clearTimeout(tm);reject(e)});p.on('close',code=>{clearTimeout(tm);resolve({code,out,err})})})}
await new Promise((resolve,reject)=>server.listen(PORT,HOST,e=>e?reject(e):resolve()));
try{
 const r=await run(browserBin()),m=r.out.match(/id="probeResult"[^>]*>([\s\S]*?)<\/pre>/i),result=(m?.[1]||'').replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim(),fatal=/Uncaught (?:TypeError|ReferenceError|SyntaxError)|net::ERR_|Aw, Snap/i.test(r.err);
 if(r.code!==0||fatal||!result.startsWith('PASS ')){console.error('PRISON AGE READER SMOKE FAIL',result||'(no result)');if(r.err.trim())console.error(r.err.slice(-3000));process.exitCode=1}else console.log('PRISON AGE READER SMOKE PASS',result.slice(5));
}finally{await new Promise(r=>server.close(()=>r()))}
