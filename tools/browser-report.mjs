// Test-only completion transport. A report is bytes, never an automatic PASS:
// each caller retains its own native predicate and browser-error checks.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
export function browserReport(){
 let accept=null;
 return {
  read(req,res){
   if(req.url!=='/__probe-report'||req.method!=='POST')return false;
   let body='';req.on('data',d=>{body+=d;if(body.length>1048576)req.destroy()});
   req.on('end',()=>{res.end('received');accept?.(body)});return true;
  },
  run(bin,url,{width=520,height=940,timeout=45000,args=[]}={}){
   if(accept)throw Error('A browser report is already pending');
   return new Promise((resolve,reject)=>{
    const profile=fs.mkdtempSync(path.join(os.tmpdir(),'field-proof-'));
    const p=spawn(bin,['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--hide-scrollbars',`--user-data-dir=${profile}`,`--window-size=${width},${height}`,...args,url],{stdio:['ignore','ignore','pipe']});
    let out=null,err='',failure=null;
    const timer=setTimeout(()=>{failure=Error(`Browser report timeout after ${timeout}ms: ${url}`);p.kill('SIGKILL')},timeout);
    accept=body=>{if(out!==null)return;out=body;p.kill('SIGKILL')};
    p.stderr.on('data',d=>{err=(err+d).slice(-12000)});p.on('error',e=>{failure=e});
    p.on('close',()=>{clearTimeout(timer);accept=null;fs.rmSync(profile,{recursive:true,force:true});
     if(failure)reject(failure);else if(out===null)reject(Error('Browser exited before reporting: '+err));
     else resolve({out,err,code:0}); // transport completed; caller must verify out
    });
   });
  }
 };
}
