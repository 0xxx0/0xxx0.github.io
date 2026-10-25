#!/usr/bin/env node
// Browser proof for ROOM projection bridge. Uses the real DOM; no simulated graph.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {browserBin} from '../../tools/browser-bin.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
  let relative;
  try{relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/, '');}
  catch{res.writeHead(400).end('Bad path');return}
  if(!relative||relative.endsWith('/'))relative+='index.html';
  const p=path.resolve(root,relative);
  if(!p.startsWith(root+path.sep)){res.writeHead(403).end('Forbidden');return}
  fs.readFile(p,(err,data)=>{
    if(err){res.writeHead(404).end('Not found');return}
    res.writeHead(200,{'Content-Type':(types[path.extname(p)]||'application/octet-stream')+'; charset=utf-8'}).end(data);
  });
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;

async function probe(bin,width){
 const url='http://127.0.0.1:'+port+'/foundry/room/?projectiontest=deep&view=plain';
 const args=['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--force-device-scale-factor=1','--window-size='+width+',844','--virtual-time-budget=2500','--dump-dom',url];
 const child=spawn(bin,args,{stdio:['ignore','pipe','pipe']});
 let out='',err='';
 const cap=chunk=>String(chunk).slice(0,600000);
 child.stdout.on('data',d=>{out+=cap(d)});
 child.stderr.on('data',d=>{err+=cap(d)});
 const code=await new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>{child.kill('SIGKILL');reject(new Error('browser timed out'))},25000);
   child.on('error',e=>{clearTimeout(timeout);reject(e)});
   child.on('close',n=>{clearTimeout(timeout);resolve(n)});
 });
 const found=out.match(/<pre\b(?=[^>]*\bid="projectionTest")[^>]*>([^<]*)<\/pre>/);
 const verdict=found?.[1]||'MISSING PROOF SENTINEL';
 if(code!==0||!verdict.startsWith('PASS · ')||!verdict.includes('"pass":true')){
   throw Error('ROOM '+width+' FAIL · exit '+code+' · '+verdict.slice(0,1100)+' · stderr '+err.slice(-700));
 }
 const boot=out.match(/<body\b[^>]*data-projection="([^"]+)"/);
 if(boot?.[1]!=='plain')throw Error('Expected readable PLAIN return, got '+boot?.[1]);
 console.log('PASS ROOM '+width+' · live DOM FOLD → RUN → DISSOLVE → UNFOLD → edit invalidation');
}
try{
 const bin=browserBin();
 await probe(bin,390);
 await probe(bin,1280);
}finally{await new Promise(resolve=>server.close(resolve))}
