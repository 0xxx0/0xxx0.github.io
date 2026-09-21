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
const duplicateValues=xs=>[...new Set(xs.filter((x,i)=>xs.indexOf(x)!==i))];
const collectInternalPaths=(x,out=[])=>{
  if(typeof x==='string'){if(x.startsWith('/')&&!x.includes(' → ')&&!/\s/.test(x))out.push(x);return out}
  if(Array.isArray(x)){for(const y of x)collectInternalPaths(y,out);return out}
  if(x&&typeof x==='object')for(const y of Object.values(x))collectInternalPaths(y,out);
  return out;
};
const internalExists=v=>{
  const clean=v.split('#')[0].split('?')[0];
  if(clean==='/')return true;
  return exists(routeFile(clean));
};
const compileInline=(p)=>{
  if(!p.endsWith('.html')||!exists(p))return;
  const s=read(p),re=/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi;let m,n=0;
  while((m=re.exec(s))){if(!m[1].trim())continue;n++;try{new Function(m[1])}catch(e){fail.push('JS '+p+' #'+n+': '+e.message)}}
};
const staticLinkTarget=(page,raw)=>{
  const v=String(raw||'').trim();
  if(!v||v.startsWith('#')||/^(?:https?:|mailto:|tel:|sms:|tg:|data:|javascript:)/i.test(v))return null;
  const clean=v.split('#')[0].split('?')[0];
  if(!clean)return null;
  let target=clean.startsWith('/')?clean.slice(1):path.posix.normalize(path.posix.join(path.posix.dirname(page),clean));
  target=target.replace(/^\.\//,'');
  if(!target||target==='.')target='index.html';
  if(target.endsWith('/'))target+='index.html';
  if(exists(target))return target;
  if(exists(target+'.html'))return target+'.html';
  if(exists(path.posix.join(target,'index.html')))return path.posix.join(target,'index.html');
  return false;
};
const scanStaticLinks=(page)=>{
  if(!page.endsWith('.html')||!exists(page))return;
  const html=read(page).replace(/<script\b[\s\S]*?<\/script>/gi,'').replace(/<style\b[\s\S]*?<\/style>/gi,'');
  const re=/\b(?:href|src)\s*=\s*["']([^"']+)["']/gi;let m;
  while((m=re.exec(html))){
    const target=staticLinkTarget(page,m[1]);
    if(target===false)fail.push('broken static link '+page+' -> '+m[1]);
  }
};
const fiContract=parse('control/FIELD_INDEX_CONTRACT.json');
const manifest=parse('showcase-manifest.json');
const runtimeKinds=new Set(['artifact','experiment','workbench','rendezvous','hub','system']);
if(manifest){
  check(manifest.schema==='showcase-manifest/v1','unexpected manifest schema');
  const hrefs=(manifest.routes||[]).map(r=>r.href);
  for(const h of duplicateValues(hrefs))fail.push('duplicate manifest href '+h);
  for(const p of [...new Set(collectInternalPaths(manifest))]){
    check(internalExists(p),'broken internal manifest path '+p);
  }
  for(const r of manifest.routes||[]){
    const rf=routeFile(r.href);
    check(exists(rf),'missing route '+r.href+' -> '+rf);
    if(r.receipt)check(exists(r.receipt.replace(/^\//,'')),'missing receipt '+r.receipt);
    // Exact recovery donors/fossils are evidence, not production runtimes.
    // Validate their route + receipt here; byte/hash fidelity belongs to recovery manifests.
    if(runtimeKinds.has(r.kind)) compileInline(rf);
    const liveLinkKinds=new Set(['artifact','experiment','workbench','rendezvous','hub','system','control','documentation','evidence','validator','alias']);
    if(liveLinkKinds.has(r.kind)&&r.state!=='FROZEN_DONOR'&&r.kind!=='recovery')scanStaticLinks(rf);
  }
  const axial=(manifest.routes||[]).find(r=>r.href==='/foundry/axial/');
  check(!!axial,'AXIAL route absent');
  if(axial)check(axial.showcase_card===false,'AXIAL must remain non-card experiment');
  const port=(manifest.routes||[]).find(r=>r.href==='/port/');
  check(!!port,'canonical HUMAN PORT route absent');
  if(port){check(port.state==='ACTIVE','HUMAN PORT must be ACTIVE');check(Array.isArray(port.owned_surfaces)&&port.owned_surfaces.length>=5,'HUMAN PORT owned surfaces missing');}
  const deprecated=new Set(fiContract?.route_state_contract?.deprecated_states||['EXPERIMENT']);
  const allowedStates=new Set(Object.keys(fiContract?.route_state_contract?.states||{}));
  for(const r of manifest.routes||[]){
    if(deprecated.has(r.state))fail.push('deprecated route.state '+r.state+': '+r.href);
    if(r.state&&allowedStates.size&&!allowedStates.has(r.state))fail.push('unknown route.state '+r.state+': '+r.href);
  }
  const evo=fiContract?.evolution_contract||{};
  const evoFields=evo.required_fields||['host','generation','stage','question','baseline','mutation','evidence_gate','next_if_pass','next_if_fail'];
  const evoStages=new Set(Object.keys(evo.stages||{}));
  const donorStates=new Set(['DONOR','FROZEN_DONOR']);
  for(const r of manifest.routes||[]){
    const liveExperiment=r.kind==='experiment'&&!donorStates.has(r.state);
    if(!liveExperiment)continue;
    check(!!r.evolution,'live experiment missing evolution contract: '+r.href);
    if(!r.evolution)continue;
    for(const k of evoFields)check(r.evolution[k]!==undefined&&r.evolution[k]!==null&&String(r.evolution[k]).trim()!=='','experiment evolution missing '+k+': '+r.href);
    check(Number.isInteger(r.evolution.generation)&&r.evolution.generation>=1,'experiment generation invalid: '+r.href);
    if(evoStages.size)check(evoStages.has(r.evolution.stage),'experiment evolution stage invalid '+r.evolution.stage+': '+r.href);
    check((manifest.routes||[]).some(x=>x.href===r.evolution.host),'experiment evolution host missing from manifest '+r.href+' -> '+r.evolution.host);
  }
  const fcm=(manifest.routes||[]).find(r=>r.href==='/fcm/');
  if(fcm)check(fcm.version==='0.2','FCM current version drifted from 0.2');
  const manifestHrefSet=new Set(hrefs);
  for(const r of manifest.routes||[])if(r.parent)check(manifestHrefSet.has(r.parent),'manifest parent missing '+r.href+' -> '+r.parent);
  for(const r of manifest.routes||[])if(r.kind==='alias'){
    const target=String(r.alias_of||'').split('#')[0].split('?')[0];
    check(!!target,'alias missing alias_of: '+r.href);
    if(target)check(manifestHrefSet.has(target),'alias target absent from manifest '+r.href+' -> '+target);
  }
  const walkDirs=(dir='')=>fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(ent=>{
    if(ent.name==='.git'||ent.name==='node_modules')return [];
    const rel=path.posix.join(dir,ent.name);
    if(ent.isDirectory())return walkDirs(rel);
    if(ent.isFile()&&ent.name==='index.html'&&dir)return ['/'+dir.replace(/\\/g,'/')+'/'];
    return [];
  });
  for(const href of walkDirs())check(manifestHrefSet.has(href),'directory index surface missing manifest address: '+href);
}
const issueSnapshot=parse('control/FIELD_ISSUES.json');
if(issueSnapshot){check(issueSnapshot.schema==='field-repo-issues/v0.1','FIELD issue snapshot schema drifted');check(issueSnapshot.count===issueSnapshot.issues.length,'FIELD issue snapshot count mismatch');}
if(exists('field-glyph.js')){try{new Function(read('field-glyph.js'))}catch(e){fail.push('JS field-glyph.js: '+e.message)}}
if(exists('field-presentation.js')){try{new Function(read('field-presentation.js'))}catch(e){fail.push('JS field-presentation.js: '+e.message)}}
if(exists('field-aperture.js')){try{new Function(read('field-aperture.js'))}catch(e){fail.push('JS field-aperture.js: '+e.message)}}
if(exists('foundry/aperture/index.html')){
  const ap=read('foundry/aperture/index.html');
  for(const token of ['FOUNDRY / APERTURE','field-aperture.js','RSVP','SCALE LENS','TWO DIAL'])check(ap.includes(token),'Aperture surface token missing: '+token);
  compileInline('foundry/aperture/index.html');
}
check(home.includes('field-aperture.js'),'FIELD root missing reusable Aperture component');
check(home.includes('id="apInspect"'),'FIELD root missing focused Aperture action');
if(exists('port/index.html')){const p=read('port/index.html');check(p.includes('field-aperture.js'),'HUMAN PORT missing reusable Aperture component');check(p.includes('id="inspectBtn"'),'HUMAN PORT missing Aperture intake action');}
if(exists('field-play.html')){const play=read('field-play.html');check(play.includes('field-presentation.js'),'FIELD PLAY missing shared presentation kernel');check(play.includes('field-glyph.js'),'FIELD PLAY missing shared glyph grammar');}
const ret=parse('return-index.json');
if(ret){
  check(ret.count===ret.items.length,'return-index count mismatch');
  check(ret.receipts_ok===ret.items.filter(x=>x.receipt_ok).length,'return-index receipt count mismatch');
  for(const x of ret.items){check(exists(routeFile(x.href)),'return route missing '+x.href);check(exists(x.receipt.replace(/^\//,'')),'return receipt missing '+x.receipt)}
}
const migration=parse('control/MIGRATION.json');
if(migration){
  const ids=(migration.artifacts||[]).map(x=>x.id);
  for(const id of duplicateValues(ids))fail.push('duplicate migration artifact id '+id);
  const queue=migration.ingest_queue||[];
  check(queue.length<=10,'migration queue too broad: '+queue.length+' items');
  for(const q of queue)check(!/^ROOM\/FU:\s*DONE/i.test(q),'completed migration queue item remains: '+q);
}
const migrationNow=parse('control/MIGRATION_NOW.json');
if(migrationNow){
  check((migrationNow.now||[]).length<=3,'MIGRATION NOW exceeds three items');
  const nowIds=(migrationNow.now||[]).map(x=>x.id);
  for(const id of duplicateValues(nowIds))fail.push('duplicate MIGRATION NOW id '+id);
}
const home=read('index.html');
const fi=fiContract;
check(!!fi,'FIELD INDEX contract missing/unreadable');
if(fi){check(fi.schema==='field-index-contract/v0.2','FIELD INDEX contract must be v0.2');check(fi.root_readings?.NOW&&fi.root_readings?.MAP&&fi.root_readings?.OPEN_PORTS&&fi.root_readings?.EVOLVE,'FIELD INDEX readings incomplete');check(fi.evolution_contract?.schema==='field-evolution/v0.1','FIELD evolution contract missing');}
check(home.includes('href="./returns/"'),'root missing RETURN FIELD link');
check(home.includes('data-mode="STRUCTURE"'),'root missing STRUCTURE map mode');
check(home.includes('data-mode="RECENT"'),'root missing RECENT lens');
check(home.includes('data-mode="EVOLVE"'),'root missing EVOLVE lens');
check(home.includes('AXIAL / LATEST'),'root missing AXIAL / LATEST compositor');
check(home.includes('data-mode="VISUAL"')&&home.includes('data-mode="PULSE"'),'root missing visual/pulse map projections');
check(home.includes('>HEADS / LINEAGES<'),'root missing collapsed HEADS lineage reading');
check(home.includes('MAP / PROJECTIONS'),'root missing MAP reading');
check(home.includes('>OPEN PORTS<'),'root missing OPEN PORTS reading');
check(home.includes('LATEST / REPO TOUCHES'),'root missing LATEST re-entry reading');
check(home.includes('ISSUES / REPO OPEN LOOPS'),'root missing ISSUES reading');
check(home.includes('field-glyph.js'),'root missing shared FIELD glyph grammar');
check(home.includes('field-presentation.js'),'root missing FIELD presentation kernel');
check(home.includes('id="axialLatest"'),'root missing unified AXIAL latest surface');
check(home.includes('id="apOpen"'),'root missing explicit focus OPEN action');
check(!home.includes('class="nowGrid"'),'root regressed to oversized NOW card grid');
check(home.includes('FIELD_INDEX_CONTRACT.json'),'root missing FI contract link');
compileInline('index.html');
if(manifest){
  const tracked=runtimeKinds;
  for(const r of manifest.routes||[]){
    if(!tracked.has(r.kind)||!r.state)continue;
    check(!!r.index?.updated_at,'tracked route missing index.updated_at: '+r.href);
    check(Array.isArray(r.index?.work_modes)&&r.index.work_modes.length>0,'tracked route missing index.work_modes: '+r.href);
  }
}
const axialPath='foundry/axial/index.html';
const axialLabPath='foundry/axial/lab-0.5.1.html';
if(exists(axialPath)){
  const a=read(axialPath);
  for(const token of ['FOCUS STACK','FIELD INDEX','HOUSE: SOFA LIGHT','RING','STRIP','RETURN'])check(a.includes(token),'AXIAL 0.6 focus-stack token missing: '+token);
  compileInline(axialPath);
}
if(exists(axialLabPath)){
  const a=read(axialLabPath);
  for(const token of ['START 10','AXIAL_PACKET','ARM','RUN','RETURN'])check(a.includes(token),'AXIAL legacy lab token missing: '+token);
  compileInline(axialLabPath);
}
for(const p of ['returns/index.html','foundry/index.html','fcm/index.html','router-bench/index.html'])compileInline(p);
if(fail.length){console.error('PUBLIC SURFACE CHECK FAIL\n- '+fail.join('\n- '));process.exit(1)}
console.log('PUBLIC SURFACE CHECK PASS');
console.log('manifest routes:',manifest?.routes?.length||0);
console.log('FIELD INDEX contract:',fi?.schema||'missing');
console.log('static live/support links: checked');
console.log('return receipts:',ret?.receipts_ok+'/'+ret?.count);
console.log('AXIAL contract: present / non-card');
console.log('migration artifacts:',migration?.artifacts?.length||0);
console.log('migration NOW:',migrationNow?.now?.length||0);
console.log('migration queue:',migration?.ingest_queue?.length||0);
