#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(),fail=[];
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const exists=p=>fs.existsSync(path.join(root,p));
const check=(ok,msg)=>{if(!ok)fail.push(msg)};
const parse=p=>{try{return JSON.parse(read(p))}catch(e){fail.push('JSON '+p+': '+e.message);return null}};
const routeFile=href=>{
  let p=href.replace(/^\//,'');
  if(!p)return 'index.html';
  if(p.endsWith('/'))return p+'index.html';
  return p;
};
const compileInline=(p)=>{
  if(!p.endsWith('.html')||!exists(p))return;
  const s=read(p),re=/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi;let m,n=0;
  while((m=re.exec(s))){if(!m[1].trim())continue;n++;try{new Function(m[1])}catch(e){fail.push('JS '+p+' #'+n+': '+e.message)}}
};
const manifest=parse('showcase-manifest.json');
if(manifest){
  check(manifest.schema==='showcase-manifest/v1','unexpected manifest schema');
  for(const r of manifest.routes||[]){
    const rf=routeFile(r.href);
    check(exists(rf),'missing route '+r.href+' -> '+rf);
    if(r.receipt)check(exists(r.receipt.replace(/^\//,'')),'missing receipt '+r.receipt);
    compileInline(rf);
  }
  const axial=(manifest.routes||[]).find(r=>r.href==='/foundry/axial/');
  check(!!axial,'AXIAL route absent');
  if(axial)check(axial.showcase_card===false,'AXIAL must remain non-card experiment');
}
const ret=parse('return-index.json');
if(ret){
  check(ret.count===ret.items.length,'return-index count mismatch');
  check(ret.receipts_ok===ret.items.filter(x=>x.receipt_ok).length,'return-index receipt count mismatch');
  for(const x of ret.items){check(exists(routeFile(x.href)),'return route missing '+x.href);check(exists(x.receipt.replace(/^\//,'')),'return receipt missing '+x.receipt)}
}
const home=read('index.html');
const fi=parse('control/FIELD_INDEX_CONTRACT.json');
check(!!fi,'FIELD INDEX contract missing/unreadable');
check(home.includes('href="./returns/"'),'root missing RETURN FIELD link');
check(home.includes('data-sort="UPDATED"'),'root missing UPDATED sort');
check(home.includes('FIELD_INDEX_CONTRACT.json'),'root missing FI contract link');
if(manifest){
  const tracked=new Set(['artifact','experiment','workbench','rendezvous']);
  for(const r of manifest.routes||[]){
    if(!tracked.has(r.kind)||!r.state)continue;
    check(!!r.index?.updated_at,'tracked route missing index.updated_at: '+r.href);
    check(Array.isArray(r.index?.work_modes)&&r.index.work_modes.length>0,'tracked route missing index.work_modes: '+r.href);
  }
}
const axialPath='foundry/axial/index.html';
if(exists(axialPath)){
  const a=read(axialPath);
  for(const token of ['START 10','AXIAL_PACKET','ARM','RUN','RETURN'])check(a.includes(token),'AXIAL contract token missing: '+token);
  compileInline(axialPath);
}
for(const p of ['returns/index.html','foundry/index.html','fcm/index.html','router-bench/index.html'])compileInline(p);
if(fail.length){console.error('PUBLIC SURFACE CHECK FAIL\n- '+fail.join('\n- '));process.exit(1)}
console.log('PUBLIC SURFACE CHECK PASS');
console.log('manifest routes:',manifest?.routes?.length||0);
console.log('FIELD INDEX contract:',fi?.schema||'missing');
console.log('return receipts:',ret?.receipts_ok+'/'+ret?.count);
console.log('AXIAL contract: present / non-card');
