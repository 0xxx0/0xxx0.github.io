#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {browserBin} from '../../tools/browser-bin.mjs';
// Browser proof: real AXIAL DOM + real source adapter; two viewport widths.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const kinds={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/, '')}catch{res.writeHead(400).end('bad path');return}
 if(!name||name.endsWith('/'))name+='index.html';
 const filename=path.resolve(root,name);
 if(!filename.startsWith(root+path.sep)){res.writeHead(403).end('forbidden');return}
 fs.readFile(filename,(err,data)=>{
  if(err){res.writeHead(404).end('not found');return}
  res.writeHead(200,{'Content-Type':(kinds[path.extname(filename)]||'text/plain')+'; charset=utf-8'}).end(data)
 })
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const port=server.address().port;
async function check(browser,width){
 const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--force-device-scale-factor=1','--window-size='+width+',844','--virtual-time-budget=6500','--dump-dom','http://127.0.0.1:'+port+'/foundry/axial/?inputtest=1'];
 const child=spawn(browser,args,{stdio:['ignore','pipe','pipe']});
 let stdout='',stderr='';
 child.stdout.on('data',d=>stdout+=String(d).slice(0,800000));
 child.stderr.on('data',d=>stderr+=String(d).slice(0,250000));
 const code=await new Promise((yes,no)=>{
  const timer=setTimeout(()=>{child.kill('SIGKILL');no(Error('Browser timeout'))},30000);
  child.once('error',e=>{clearTimeout(timer);no(e)});
  child.once('close',x=>{clearTimeout(timer);yes(x)})
 });
 const verdict=stdout.match(/<pre\b(?=[^>]*\bid="axialInputProof")[^>]*>([^<]*)<\/pre>/)?.[1]||'MISSING';
 if(code!==0||!verdict.startsWith('PASS · ')||!verdict.includes('"pass":true')||!stdout.includes('id="axKnob"'))
  throw Error('AXIAL '+width+' FAIL · '+verdict.slice(0,1600)+' · exit '+code+' · '+stderr.slice(-700));
 console.log('PASS AXIAL '+width+' · native binding, relative ticks, RING/STRIP, restored focus')
}
try{const b=browserBin();await check(b,390);await check(b,1280)}finally{await new Promise(ok=>server.close(ok))}
