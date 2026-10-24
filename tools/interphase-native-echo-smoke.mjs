import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
async function nativeEchoProof(){
 const fixtures=new Map();
 for(const [key,file] of [['ride','tools/source-echo-read-ride-smoke.mjs'],['door','tools/readfield-echo-door-smoke.mjs']]){
  const source=fs.readFileSync(file,'utf8'),start=source.indexOf('function probe(){'),end=source.indexOf('\nconst server=',start);
  assert.ok(start>=0&&end>start);fixtures.set(key,vm.runInNewContext('('+source.slice(start,end).trim()+')()'));
 }
 const root=process.cwd(),server=http.createServer((req,res)=>{
  const u=new URL(req.url,'http://local');if(u.pathname==='/__echo-probe'){res.setHeader('Content-Type','text/html');res.end(fixtures.get(u.searchParams.get('case')));return}
  const file=path.join(root,decodeURIComponent(u.pathname),u.pathname.endsWith('/')?'index.html':'');
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);res.end();return}
  res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.json':'application/json','.css':'text/css'})[path.extname(file)]||'text/plain');fs.createReadStream(file).pipe(res);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true});try{
  for(const name of fixtures.keys()){const context=await browser.newContext({viewport:{width:500,height:980}}),page=await context.newPage();await page.goto('http://127.0.0.1:'+server.address().port+'/__echo-probe?case='+name);await page.waitForFunction(()=>/^(PASS|FAIL) /.test(document.getElementById('probeResult').textContent),null,{timeout:45000});const result=await page.locator('#probeResult').textContent();assert.ok(result.startsWith('PASS '),result);console.log('NATIVE ECHO '+name.toUpperCase()+' PASS '+result.slice(5));await context.close()}
 }finally{await browser.close();await new Promise(r=>server.close(r))}
}
await nativeEchoProof();
