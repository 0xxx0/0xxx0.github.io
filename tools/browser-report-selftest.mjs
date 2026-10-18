import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {browserReport} from './browser-report.mjs';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'report-controls-')),report=browserReport();
const server=http.createServer((req,res)=>{if(!report.read(req,res)){res.writeHead(404);res.end()}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${server.address().port}/`;
function fixture(name,code){const p=path.join(dir,name);fs.writeFileSync(p,'#!/usr/bin/env node\n'+code,{mode:0o700});return p}
try{
 const early=fixture('early','process.exit(0)');
 await assert.rejects(report.run(early,url),/exited before reporting/);
 const hold=fixture('hold','setInterval(()=>{},1000)');
 await assert.rejects(report.run(hold,url,{timeout:100}),/timeout/);
 const failure=fixture('failure',"fetch(new URL('/__probe-report',process.argv.at(-1)),{method:'POST',body:process.argv.includes('--autoplay-policy=no-user-gesture-required')?'FAIL fixture':'LOST LAUNCH ARG'});setInterval(()=>{},1000)");
 const result=await report.run(failure,url,{args:['--autoplay-policy=no-user-gesture-required']});
 assert.equal(result.out,'FAIL fixture'); // completion must never relabel failure
 assert.equal(result.out.startsWith('PASS '),false);
 assert.equal((await fetch(url+'unrelated')).status,404);
 console.log('BROWSER REPORT PASS: early exit rejects, watchdog rejects, FAIL bytes retained, unrelated requests excluded');
}finally{server.closeAllConnections();await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true,force:true})}
