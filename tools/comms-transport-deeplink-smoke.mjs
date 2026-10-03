#!/usr/bin/env node
'use strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {browserBin} from './browser-bin.mjs';

const ROOT=process.cwd(),HOST='127.0.0.1';let PORT=0;
function ct(p){if(p.endsWith('.html'))return'text/html; charset=utf-8';if(p.endsWith('.js')||p.endsWith('.mjs'))return'text/javascript; charset=utf-8';if(p.endsWith('.json'))return'application/json';return'application/octet-stream'}
function resolveFile(url){let q=decodeURIComponent(String(url||'/').split('?')[0]).replace(/^\/+/, '');if(!q)q='index.html';if(q.endsWith('/'))q+='index.html';const p=path.normalize(path.join(ROOT,q));if(!p.startsWith(ROOT))return null;if(fs.existsSync(p)&&fs.statSync(p).isFile())return p;if(fs.existsSync(p+'.html'))return p+'.html';return null}
function probe(){return `<!doctype html><html><body><iframe id="f" style="width:440px;height:920px;border:0"></iframe><pre id="probeResult">PENDING</pre><script>
const f=document.getElementById('f'),out=document.getElementById('probeResult');let finished=false;
const done=(ok,x)=>{if(finished)return;finished=true;out.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(x)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const wait=async(fn,limit=18000,label='condition')=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(60)}throw Error('wait '+label)};
const W=()=>f.contentWindow,D=()=>W().document;
(async()=>{try{
 f.src='/port/comms/?demo=1&transport=1';
 await wait(()=>D().documentElement.dataset.commsTransport==='ready',18000,'transport ready');
 await wait(()=>D().getElementById('transportPanel')&&!D().getElementById('transportPanel').hidden,6000,'deep-link panel open');
 await wait(()=>typeof W().CommsSpine?.returnObject==='function'&&W().CommsSpine.returnObject(),12000,'demo return ready');
 const draft=D().getElementById('draft');
 draft.value='Exact source-addressed response ready for one transport release.';
 draft.dispatchEvent(new Event('input',{bubbles:true}));
 await wait(()=>W().CommsSpine.state?.().draft?.length>10,3000,'exact draft state');
 const recipient=['recipient','example.test'].join(String.fromCharCode(64));
 const to=D().getElementById('transportTo'),auth=D().getElementById('transportAuthorize');
 to.value=recipient;auth.click();
 await wait(()=>D().documentElement.dataset.commsTransportState==='released',8000,'human release');
 const st=W().CommsTransport?.state?.(),mail=D().getElementById('transportMail'),status=D().getElementById('transportStatus')?.textContent||'';
 if(!st?.release||st.release.authority!=='HUMAN_RELEASE')throw Error('missing HUMAN_RELEASE');
 if(st.release.destination?.to!==recipient)throw Error('destination drift');
 if(st.release.response?.text!=='Exact source-addressed response ready for one transport release.')throw Error('response drift');
 if(mail?.disabled)throw Error('mail handoff not enabled');
 if(!/NOT YET SENT/.test(status))throw Error('release/send boundary obscured');
 if(D().documentElement.dataset.commsTransportLaunch!=='field')throw Error('FIELD launch witness missing');
 done(true,{route:W().location.pathname,launch:D().documentElement.dataset.commsTransportLaunch,authority:st.release.authority,status});
}catch(e){done(false,{error:String(e?.stack||e),href:(()=>{try{return W().location.href}catch(_){return null}})()})}})();
<\/script></body></html>`}
const server=http.createServer((req,res)=>{if(String(req.url||'').startsWith('/__probe')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(probe());return}const p=resolveFile(req.url);if(!p){res.writeHead(404);res.end('not found');return}res.writeHead(200,{'content-type':ct(p),'cache-control':'no-store'});fs.createReadStream(p).pipe(res)});
function run(bin){return new Promise((resolve,reject)=>{const a=['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--window-size=470,960','--virtual-time-budget=30000','--dump-dom','http://'+HOST+':'+PORT+'/__probe'];const p=spawn(bin,a,{stdio:['ignore','pipe','pipe']});let out='',err='';const tm=setTimeout(()=>{p.kill('SIGKILL');reject(Error('timeout'))},42000);p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',e=>{clearTimeout(tm);reject(e)});p.on('close',code=>{clearTimeout(tm);resolve({code,out,err})})})}
await new Promise((resolve,reject)=>server.listen(PORT,HOST,e=>e?reject(e):resolve()));PORT=server.address().port;
try{const r=await run(browserBin()),m=r.out.match(/id="probeResult"[^>]*>([\s\S]*?)<\/pre>/i),result=(m?.[1]||'').replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim(),fatal=/Uncaught (?:TypeError|ReferenceError|SyntaxError)|net::ERR_|Aw, Snap/i.test(r.err);if(r.code!==0||fatal||!result.startsWith('PASS ')){console.error('COMMS TRANSPORT DEEPLINK SMOKE FAIL',result||'(no result)');if(r.err.trim())console.error(r.err.slice(-3200));process.exitCode=1}else console.log('COMMS TRANSPORT DEEPLINK SMOKE PASS',result.slice(5))}finally{await new Promise(r=>server.close(()=>r()))}
