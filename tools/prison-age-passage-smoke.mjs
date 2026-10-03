#!/usr/bin/env node
'use strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {browserBin} from './browser-bin.mjs';

const ROOT=process.cwd(),HOST='127.0.0.1';let PORT=0;
function typeOf(p){if(p.endsWith('.html'))return'text/html; charset=utf-8';if(/\.(?:js|mjs)$/.test(p))return'text/javascript; charset=utf-8';if(p.endsWith('.json'))return'application/json; charset=utf-8';return'text/plain; charset=utf-8'}
function resolveFile(url){let q=decodeURIComponent(String(url||'/').split('?')[0]).replace(/^\/+/, '');if(!q)q='index.html';if(q.endsWith('/'))q+='index.html';const p=path.normalize(path.join(ROOT,q));if(!p.startsWith(ROOT))return null;if(fs.existsSync(p)&&fs.statSync(p).isFile())return p;if(fs.existsSync(p+'.html'))return p+'.html';return null}
function probe(){return `<!doctype html><html><body><iframe id="f" style="width:430px;height:900px;border:0"></iframe><pre id="r">PENDING</pre><script>
const f=document.getElementById('f'),out=document.getElementById('r'),rec={};let finished=false;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const wait=async(fn,limit=12000,label='condition')=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(50)}throw Error('wait '+label)};
const done=(ok,x)=>{if(finished)return;finished=true;out.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(x)};
const W=()=>f.contentWindow,D=()=>W().document,api=()=>W().PrisonAgePassage,held=()=>api().packet().nodes.at(-1);
(async()=>{try{
 f.src='/prison-age/?passage=1&return=field';
 await wait(()=>api()?.snapshot&&D().querySelector('#paPassage:not([hidden])'),18000,'intro');
 const core=W().PrisonAgePassageCore,atlas=await W().fetch('/prison-age/evidence-atlas.json',{cache:'no-store'}).then(r=>r.json()),doors=[...D().querySelectorAll('#papDoors [data-enter]')];
 rec.intro={doors:doors.length,law:D().querySelector('.papIntroLaw')?.textContent||''};if(doors.length!==4||!/Nothing between fragments is written for you/.test(rec.intro.law))throw Error('threshold');
 doors[0].click();await wait(()=>api().snapshot().trail.length===1&&D().querySelector('#papContext mark'),5000,'entry');
 let node=held(),snap=api().snapshot();const raw=await W().fetch(node.path).then(r=>r.text());if(raw.slice(node.start,node.end)!==node.text||!node.address.startsWith('source-echo://'))throw Error('exact entry');
 const read=D().getElementById('papRead').getAttribute('href');if(!read.includes('src='+encodeURIComponent(node.path))||!read.includes('ap_char='+node.start))throw Error('READ address');
 rec.entry={key:node.key,source:node.source_id,address:node.address};
 const firstSource=node.source_id;D().getElementById('papCross').click();
 await wait(()=>api().snapshot().trail.length===2&&api().packet().transitions[0]?.kind==='CROSS_ECHO',5000,'cross');
 node=held();snap=api().snapshot();if(node.source_id===firstSource)throw Error('CROSS source did not change');
 const legal=core.choices(atlas,node.key,snap.trail).turns.map(n=>n.key);if(!legal.length)throw Error('no lawful TURN');
 const turn=await wait(()=>{const xs=[...D().querySelectorAll('#papTurns [data-turn]')],b=xs.find(x=>legal.includes(x.dataset.turn));return b||null},5000,'lawful TURN render');
 rec.cross={key:node.key,source:node.source_id,legalTurns:legal,domTurns:[...D().querySelectorAll('#papTurns [data-turn]')].map(x=>x.dataset.turn)};
 const crossSource=node.source_id,turnKey=turn.dataset.turn;turn.click();
 await wait(()=>api().snapshot().trail.length===3&&api().snapshot().current===turnKey&&api().packet().transitions[1]?.kind==='TURN_SOURCE',5000,'turn');
 node=held();if(node.source_id!==crossSource)throw Error('TURN changed source');rec.turn={key:node.key,source:node.source_id};
 const ride=await api().makeRidePacket();if(ride.schema!=='field-read-ride/v0.1'||ride.sourceIdentity?.authority!=='PRISON_AGE'||ride.sourceIdentity?.address!==node.path||ride.focus?.char_index!==node.start||ride.passage?.schema!=='prison-age.passage-route/v0.1'||ride.echo?.authority!=='EVIDENCE_ONLY')throw Error('RIDE packet');
 api().renderReturn();await wait(()=>D().getElementById('papReturn').classList.contains('on'),2000,'return');const packet=api().packet(),body=D().getElementById('papReturnBody').textContent,meta=D().getElementById('papReturnMeta').textContent;if(!packet.nodes.every(n=>body.includes(n.text))||!/3 exact source spans/.test(meta)||!/authority EVIDENCE ONLY/.test(meta))throw Error('RETURN');
 const expected=packet.nodes.map(n=>n.key),share=api().snapshot().url,decoded=core.decodeTrail(new URL(W().location.href).searchParams.get('trail'));if(decoded.length!==3||!core.validateTrail(atlas,decoded).ok)throw Error('share encoding');
 f.src=share;await wait(()=>api()?.snapshot&&JSON.stringify(api().snapshot().trail)===JSON.stringify(expected)&&D().querySelector('#papContext mark'),12000,'share reload');const restored=api().packet();if(!restored.nodes.every((n,i)=>n.key===packet.nodes[i].key&&n.address===packet.nodes[i].address&&n.text===packet.nodes[i].text))throw Error('share exact restore');
 D().getElementById('papClose').click();if(!D().getElementById('paPassage').hidden||W().location.search.includes('passage=1'))throw Error('close/return');
 done(true,{entry:rec.entry,cross:rec.cross,turn:rec.turn,ride:{schema:ride.schema,authority:ride.sourceIdentity.authority},return:{nodes:packet.nodes.length},share:{trail:expected,exact:true}});
}catch(e){done(false,{...rec,error:String(e?.stack||e)})}})();
<\/script></body></html>`}
const server=http.createServer((req,res)=>{if(String(req.url||'').startsWith('/__probe')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(probe());return}const p=resolveFile(req.url);if(!p){res.writeHead(404);res.end('not found');return}res.writeHead(200,{'content-type':typeOf(p),'cache-control':'no-store'});fs.createReadStream(p).pipe(res)});
function run(bin){return new Promise((resolve,reject)=>{const args=['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--window-size=470,940','--virtual-time-budget=36000','--dump-dom','http://'+HOST+':'+PORT+'/__probe'];const p=spawn(bin,args,{stdio:['ignore','pipe','pipe']});let out='',err='';const timer=setTimeout(()=>{p.kill('SIGKILL');reject(Error('timeout'))},50000);p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',e=>{clearTimeout(timer);reject(e)});p.on('close',code=>{clearTimeout(timer);resolve({code,out,err})})})}
await new Promise((resolve,reject)=>server.listen(0,HOST,e=>e?reject(e):resolve()));PORT=server.address().port;
try{const r=await run(browserBin()),m=r.out.match(/id="r"[^>]*>([\s\S]*?)<\/pre>/i),result=(m?.[1]||'').replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim(),fatal=/Uncaught (?:TypeError|ReferenceError|SyntaxError)|net::ERR_|Aw, Snap/i.test(r.err);if(r.code!==0||fatal||!result.startsWith('PASS ')){console.error('PRISON AGE PASSAGE SMOKE FAIL',result||'(no result)');if(r.err.trim())console.error(r.err.slice(-2500));process.exitCode=1}else console.log('PRISON AGE PASSAGE SMOKE PASS',result.slice(5))}finally{await new Promise(r=>server.close(()=>r()))}
