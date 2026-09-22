#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';

const ROOT=process.cwd(),HOST='127.0.0.1',PORT=41761;
function browserBin(){for(const name of ['google-chrome-stable','google-chrome','chromium-browser','chromium']){const r=spawnSync('which',[name],{encoding:'utf8'});if(r.status===0&&r.stdout.trim())return r.stdout.trim()}throw Error('No Chrome/Chromium')}
function type(p){if(p.endsWith('.html'))return'text/html; charset=utf-8';if(p.endsWith('.js')||p.endsWith('.mjs'))return'text/javascript; charset=utf-8';if(p.endsWith('.json'))return'application/json; charset=utf-8';if(p.endsWith('.css'))return'text/css; charset=utf-8';return'application/octet-stream'}
function fileFor(url){let clean=decodeURIComponent(String(url||'/').split('?')[0]).replace(/^\/+/, '');if(!clean)clean='index.html';if(clean.endsWith('/'))clean+='index.html';const p=path.normalize(path.join(ROOT,clean));if(!p.startsWith(ROOT))return null;if(fs.existsSync(p)&&fs.statSync(p).isFile())return p;return null}
function probe(){return '<!doctype html><html><body><iframe id="f" style="width:430px;height:900px;border:0"></iframe><pre id="probeResult">PENDING</pre><script>'+
"const f=document.getElementById('f'),out=document.getElementById('probeResult'),rec={};let doneFlag=false;"+
"const done=(ok,data)=>{if(doneFlag)return;doneFlag=true;out.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(data)};"+
"const sleep=ms=>new Promise(r=>setTimeout(r,ms));const wait=async(fn,limit=16000,label='condition')=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(70)}throw Error('wait timeout '+label)};"+
"(async()=>{f.src='/port/comms/?demo=1';const W=()=>f.contentWindow,D=()=>W().document;"+
"await wait(()=>D().documentElement.dataset.commsSpine==='ready',16000,'ready');rec.messages=D().documentElement.dataset.commsMessages;rec.signals0=Number(D().documentElement.dataset.commsSignals||0);rec.open0=Number(D().documentElement.dataset.commsOpen||0);"+
"const firstClause=D().querySelector('.clause');firstClause.click();D().querySelector('[data-mark=\"NOTE\"]').click();await sleep(120);rec.signals1=Number(D().documentElement.dataset.commsSignals||0);"+
"const ask=[...D().querySelectorAll('.signalCard')].find(x=>x.querySelector('.kind.ASK')&&x.querySelector('.state.OPEN'));if(!ask)throw Error('no open ASK card');ask.querySelector('[data-target]').click();"+
"const draft=D().getElementById('draft');draft.value='I will handle the addressed request without duplicating the other branch.';draft.dispatchEvent(new Event('input',{bubbles:true}));D().getElementById('coverBtn').click();await sleep(140);"+
"const st=W().CommsSpine.state(),covered=st.signals.filter(x=>x.kind==='ASK'&&x.state==='COVERED');rec.covered=covered.length;rec.human=st.signals.filter(x=>x.origin==='HUMAN').length;rec.sourceId=st.sourceId;rec.draft=st.draft.length;rec.overflow=Math.max(D().documentElement.scrollWidth,D().body.scrollWidth)-D().documentElement.clientWidth;rec.packet=W().CommsSpine.buildAgentPacket()?.schema;"+
"done(rec.messages==='4'&&rec.signals0>0&&rec.signals1>rec.signals0&&rec.covered>=1&&rec.human>=1&&/^sha256:/.test(rec.sourceId)&&rec.draft>10&&rec.packet==='comms-spine-agent-packet/v0.1'&&rec.overflow<=1,rec)})().catch(e=>done(false,{error:String(e&&e.stack||e),...rec}));"+
"<\\/script></body></html>'}
const server=http.createServer((req,res)=>{if(String(req.url).startsWith('/__comms')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(probe());return}const file=fileFor(req.url);if(!file){res.writeHead(404);res.end('not found');return}res.writeHead(200,{'content-type':type(file),'cache-control':'no-store'});fs.createReadStream(file).pipe(res)});
await new Promise(r=>server.listen(PORT,HOST,r));
const bin=browserBin(),args=['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--hide-scrollbars','--window-size=520,940','--virtual-time-budget=24000','--dump-dom','http://'+HOST+':'+PORT+'/__comms'];
const result=await new Promise((resolve,reject)=>{const p=spawn(bin,args,{stdio:['ignore','pipe','pipe']});let out='',err='';const timer=setTimeout(()=>{p.kill('SIGKILL');reject(Error('timeout'))},36000);p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('close',code=>{clearTimeout(timer);resolve({code,out,err})})});
server.close();
const pass=/id="probeResult">PASS /.test(result.out)&&/"packet":"comms-spine-agent-packet\/v0.1"/.test(result.out)&&/"human":[1-9]/.test(result.out)&&/"covered":[1-9]/.test(result.out);
if(!pass){console.error('COMMS SPINE SMOKE FAIL');console.error(result.out.slice(-7000));console.error(result.err.slice(-1600));process.exit(1)}
console.log('COMMS SPINE 0.1 PHONE SMOKE PASS');
