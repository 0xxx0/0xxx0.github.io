#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {browserBin} from '../tools/browser-bin.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html="<!doctype html><html><meta charset=\"utf-8\"><body><main id=\"app\"></main><pre id=\"probe\">PENDING</pre>\n<script type=\"module\">\nconst output=document.getElementById('probe');\nconst checks=[],assert=(name,cond)=>{checks.push(name+': '+!!cond);if(!cond)throw Error(name)};\nconst pause=()=>new Promise(r=>setTimeout(r,40));\nconst wait=async(f)=>{for(let i=0;i<120;i++){if(f())return;await pause()}throw Error('timed out waiting for source')};\ntry{\n const {mountContinuum}=await import('/interphase/continuum.mjs');\n const api=await mountContinuum(document.getElementById('app'));\n const a='/control/INTERPHASE_MAPPING_CONTRACT.json',b='/control/INTERPHASE_SUCCESSOR.json';\n await api.openPath(a);\n const first=api.snapshot();assert('source A loaded',first.source.address===a);\n document.querySelector('[data-ip=\"link-start\"]').click();\n await api.openPath(b);\n assert('HOLD carried across source switch',!document.querySelector('[data-ip=\"link-end\"]').disabled);\n const second=api.snapshot();\n document.querySelector('[data-ip=\"link-end\"]').click();\n let linked=api.snapshot();\n assert('authored exactly one cross-source DOOR',linked.doors.length===1);\n const record=linked.doors[0];\n assert('DOOR exact endpoints',record.from.hash===first.source.hash&&record.to.hash===second.source.hash&&record.authority==='INTERPRETATION_ONLY');\n const link=[...document.querySelectorAll('.ip-relation')].find(x=>x.textContent.startsWith('DOOR '));\n assert('DOOR appears on original source range',!!link);\n link.click();\n await wait(()=>api.snapshot()?.source.hash===first.source.hash);\n const entered=api.snapshot();\n assert('enter restores destination source address and scope',entered.source.address===a&&entered.attention.char===record.from.start&&entered.attention.scope===record.from.scope);\n assert('crossing records one caller frame',entered.doorFrames.length===1);\n document.querySelector('[data-ip=\"back\"]').click();\n await wait(()=>api.snapshot()?.source.hash===second.source.hash);\n const returned=api.snapshot();\n assert('RETURN exact caller source',returned.source.address===b&&returned.attention.char===second.attention.char&&returned.attention.scope===second.attention.scope);\n assert('RETURN consumes frame',returned.doorFrames.length===0);\n const packet=api.packet();\n assert('portable packet carries authored DOOR',packet.doors.length===1&&packet.source.hash===second.source.hash);\n await api.importPacket(packet);\n assert('valid RETURN round-trip keeps DOOR',api.snapshot().doors.length===1);\n let rejected=false;\n try{await api.importPacket({...packet,doors:[{...packet.doors[0],authority:'EFFECT'}]})}catch{rejected=true}\n assert('import rejects authority escalation without replacing source',rejected&&api.snapshot().source.hash===second.source.hash);\n output.textContent='PASS · '+checks.join(' | ');\n}catch(e){output.textContent='FAIL · '+e.message+' · '+checks.join(' | ')}\n</script></body></html>";
const server=http.createServer((req,res)=>{
 let pathname;
 try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400).end();return}
 if(pathname==='/__door_probe'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(html);return}
 let file=path.resolve(root,'.'+pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 fs.readFile(file,(err,buffer)=>err?res.writeHead(404).end('not found'):res.writeHead(200,{'Content-Type':(/\.m?js$/.test(file)?'text/javascript':/\.css$/.test(file)?'text/css':/\.json$/.test(file)?'application/json':'text/html')+'; charset=utf-8'}).end(buffer));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url='http://127.0.0.1:'+server.address().port+'/__door_probe';
try{
 const bin=browserBin();
 const child=spawn(bin,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--window-size=390,844','--virtual-time-budget=5000','--dump-dom',url],{stdio:['ignore','pipe','pipe']});
 let stdout='',stderr='';
 child.stdout.on('data',d=>stdout+=d.toString());child.stderr.on('data',d=>stderr+=d.toString().slice(-3000));
 const status=await new Promise((resolve,reject)=>{const t=setTimeout(()=>{child.kill('SIGKILL');reject(Error('Chrome timed out'))},30000);child.on('error',e=>{clearTimeout(t);reject(e)});child.on('close',code=>{clearTimeout(t);resolve(code)})});
 const proof=stdout.match(/<pre id="probe">([^<]+)<\/pre>/)?.[1]||'MISSING PROBE';
 if(status||!proof.startsWith('PASS'))throw Error('DOOR browser FAIL: '+proof+' (Chrome '+status+') '+stderr.slice(-500));
 console.log(proof);
}finally{await new Promise(resolve=>server.close(resolve))}
