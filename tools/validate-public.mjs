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
if(exists('showcase-nav.js')){
  const nav=read('showcase-nav.js');
  try{new Function(nav)}catch(e){fail.push('JS showcase-nav.js: '+e.message)}
  check(nav.includes('tab read'),'shared route adapter missing READFIELD action');
  check(nav.includes('readfield.handoff.v1'),'shared route adapter missing READFIELD handoff');
  check(nav.includes('getSelection'),'READFIELD handoff missing selection-context path');
}
const charters=parse('control/INSTRUMENT_CHARTERS.json');
const apertureRelease=parse('foundry/aperture/release.json');
const axialRelease=parse('foundry/axial/release.json');
const axialContract=parse('foundry/axial/aperture.contract.json');
if(apertureRelease){
  const charter=charters?.instruments?.find(x=>x.id==='field-aperture');
  check(!!charter,'APERTURE instrument charter missing');
  check(apertureRelease.charter==='/control/INSTRUMENT_CHARTERS.json#field-aperture','APERTURE release charter pointer drifted');
  check(apertureRelease.return_contract?.durability==='HOST_OWNED','APERTURE return durability must remain host-owned');
  check(/presentation-only|presentation only/i.test(charter?.PROMISE||''),'APERTURE charter must preserve presentation-only authority boundary');
  check(/does not absorb AXIAL exact-set support/i.test(charter?.PROMISE||''),'APERTURE charter lost Constraint Surface boundary');
  check(/TEST\/ARM\/RUN/i.test(charter?.PROMISE||''),'APERTURE charter lost STATE APERTURE boundary');
  check((apertureRelease.donors||[]).some(x=>x.source==='/recovery/focus-interface-sync-20260921/FU_FOVEATE_RECOVERY_2026-09-21.json'),'READFIELD/APERTURE release missing recovered FU foveate donor');
  check(!/pending PR browser proof/i.test(JSON.stringify(apertureRelease.verification||{})),'READFIELD/APERTURE verification still carries stale pending-PR proof state');
}
if(exists('foundry/aperture/index.html')){
  const ap=read('foundry/aperture/index.html');
  for(const token of ['APERTURE HAS CONVERGED INTO READFIELD','readfield.handoff.v1','/docs/'])check(ap.includes(token),'Aperture compatibility token missing: '+token);
  compileInline('foundry/aperture/index.html');
}
if(exists('field-play.html')){const play=read('field-play.html');check(play.includes('field-presentation.js'),'FIELD PLAY missing shared presentation kernel');check(play.includes('field-glyph.js'),'FIELD PLAY missing shared glyph grammar');}
const ret=parse('return-index.json');
if(ret){
  check(ret.count===ret.items.length,'return-index count mismatch');
  check(ret.receipts_ok===ret.items.filter(x=>x.receipt_ok).length,'return-index receipt count mismatch');
  for(const x of ret.items){check(exists(routeFile(x.href)),'return route missing '+x.href);check(exists(x.receipt.replace(/^\//,'')),'return receipt missing '+x.receipt)}
}
const ingest21=parse('control/INGEST_RUN_2026-09-21.json');
const hermesGoals=parse('control/HERMES_LONG_GOALS.json');
const hermesQueue=parse('control/HERMES_QUEUE.json');
if(ingest21&&ingest21.files_indexed===559){
  const backupGoal=hermesGoals?.goals?.find(x=>x.id==='BACKUP-INTAKE-WARDEN');
  check(!!backupGoal,'verified Sep-21 ingest missing BACKUP-INTAKE-WARDEN');
  check(String(backupGoal?.mode||'').includes('PROVED'),'verified Sep-21 ingest worker state regressed to unproved/dormant');
  check(backupGoal?.current_successor==='/control/packets/INGEST_ONE_FAMILY_2026-09-21.json','verified Sep-21 ingest missing worker successor');
  check(exists('control/packets/INGEST_ONE_FAMILY_2026-09-21.json'),'one-family execution packet missing');
  if(hermesQueue?.schema==='0xxx0/hermes-queue/v0.2'){
    const historical=hermesQueue?.historical_ready_tasks||[];
    const ingestTask=historical.find(x=>x.id==='INGEST-01');
    check(!!ingestTask,'Hermes v0.2 lost historical INGEST-01 successor lineage');
    check(/HISTORICAL/i.test(ingestTask?.disposition||''),'Hermes v0.2 INGEST-01 may self-promote from history');
    const readyIds=(hermesQueue?.ready_tasks||[]).map(x=>x.id);
    check(!readyIds.includes('INGEST-01'),'Hermes v0.2 exposes INGEST-01 as ambient runnable work');
    check(!readyIds.includes('REC-01'),'Hermes v0.2 exposes REC-01 as ambient runnable work');
    const anchored=hermesQueue?.ready_tasks?.find(x=>x.id==='ANCHORED-RECOVERY');
    check(!!anchored,'Hermes v0.2 missing ANCHORED-RECOVERY trigger lane');
    check(/trigger|anchor|CURRENT|MIGRATION_NOW/i.test((anchored?.trigger||'')+' '+(anchored?.task||'')),'Hermes v0.2 recovery lane is not concretely trigger-gated');
  }else{
    const ingestTask=hermesQueue?.ready_tasks?.find(x=>x.id==='INGEST-01');
    check(!!ingestTask,'Hermes queue missing INGEST-01 successor task');
    const broad=hermesQueue?.ready_tasks?.find(x=>x.id==='REC-01');
    check(!broad||/ANCHOR-ONLY/i.test(broad.task||''),'REC-01 regressed to ambient broad census');
  }
}
const hermesDaily=fs.readFileSync('scripts/hermes-daily-prompt.py','utf8');
check(hermesDaily.includes('Read /llms.txt first'),'Hermes daily generator does not start from live machine entrypoint');
check(!hermesDaily.includes('Read /control/prompts/HERMES_ULTRA_MASTER_2026-09-23.md first'),'Hermes daily generator regressed to dated master-prompt bootstrap');
check(hermesDaily.includes("x.get('surface_state', x.get('state','?'))"),'Hermes daily generator does not understand WAITING v0.2 surface_state');
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
const foldLab=read('fold-bloom/lab/index.html');
const foldInk=read('fold-bloom/ink/index.html');
check(/footer a\{[^}]*min-height:34px/.test(foldLab),'FOLD BLOOM LAB footer navigation lost 34px phone target floor');
check(/footer a\{[^}]*min-height:34px/.test(foldInk),'FOLD BLOOM INK footer navigation lost 34px phone target floor');
const daylineApp=read('atlas-dayline/app.js');
const daylineCss=read('atlas-dayline/app.css');
const daylineBridge=read('atlas-dayline/field-bridge.js');
const daylineSw=read('atlas-dayline/sw.js');
check(daylineApp.includes("MOBILE_ACTION_KEY")&&daylineApp.includes("firstMobileAction?'plain'"),'Atlas Dayline lost one-time mobile action-first default');
check(daylineApp.includes("atlas-dayline-feedback/v0.2")&&daylineApp.includes("authority:'NONE'")&&daylineApp.includes("USER_EXPLICIT_COPY"),'Atlas Dayline outbound feedback lost worker authority boundary');
check(daylineBridge.includes("atlas-dayline-handoff/v0.1")&&daylineBridge.includes('REALITY PORT / EXPLICIT EPHEMERAL HANDOFF'),'Atlas Dayline lost current REALITY PORT handoff');
check(daylineBridge.includes('COPY HANDOFF')&&daylineBridge.includes('fl-compact')&&daylineBridge.includes("api().snapshot()"),'Atlas Dayline mobile LIVE contraction/context capture regressed');
check(/#utilityBar button\{min-height:38px/.test(daylineCss)&&/\.plain-actions button\{min-height:38px/.test(daylineCss),'Atlas Dayline mobile primary target floor regressed');
check(/body\[data-projection="plain"\]\{overflow-y:auto/.test(daylineCss),'Atlas Dayline mobile PLAIN scroll lock regressed');
check(daylineApp.includes("syncDeviceNow")&&daylineApp.includes("clockWitness")&&daylineApp.includes("ORIENTATION_SNAPSHOT"),'Atlas Dayline clock/return witness regressed');
check(daylineSw.includes("atlas-dayline-i-v6"),'Atlas Dayline mobile reach cache version not v6');
const showcaseNav=read('showcase-nav.js');
check(/@media\(max-width:820px\)/.test(showcaseNav)&&/\.tab\.nav\{left:auto;right:/.test(showcaseNav),'Shared mobile route adapter returned to bottom-left obstruction');
const workfieldHtml=read('dayline/index.html');
const workfieldJs=read('dayline/app.js');
const workfieldCss=read('dayline/app.css');
check(/DAYLINE \/\/ CONFLUENCE/.test(workfieldHtml)&&workfieldHtml.includes('id="moves"')&&workfieldHtml.includes('id="witnessInput"'),'Dayline Confluence surface missing object/move/witness frame');
check(workfieldJs.includes("poly-atlas-dayline-branch-i-public-v1")&&workfieldJs.includes("atlas.dayline.handoff.v01"),'Dayline Confluence diverged from existing DayState/handoff identity');
check(workfieldJs.includes("slice(0,3)")||workfieldJs.includes("return out.slice(0,3)"),'Dayline Confluence lost <=3 move law');
check(/body\{overflow-y:auto/.test(workfieldCss),'Dayline Confluence ordinary document scrolling regressed');
check(workfieldJs.includes("carrier:'dayline-confluence/v0.1'")&&workfieldJs.includes("poly-atlas-return-f"),'Dayline Confluence RETURN carrier missing');
check(workfieldJs.includes("LEGACY_IDS")&&workfieldJs.includes("RESET LEGACY SAMPLE"),'Dayline Confluence legacy sample migration missing');
const home=read('index.html');
const fi=fiContract;
check(!!fi,'FIELD INDEX contract missing/unreadable');
if(fi){check(fi.schema==='field-index-contract/v0.4','FIELD INDEX contract must be v0.4');check(fi.root_readings?.NOW&&fi.root_readings?.MAP&&fi.root_readings?.OPEN_PORTS&&fi.root_readings?.EVOLVE&&fi.root_readings?.LATEST,'FIELD INDEX readings incomplete');check(fi.truth_grammar?.['Φ']&&fi.truth_grammar?.['φ']&&fi.truth_grammar?.git&&fi.truth_grammar?.manifest,'FIELD INDEX truth grammar incomplete');check(fi.evolution_contract?.schema==='field-evolution/v0.1','FIELD evolution contract missing');}
check(home.includes('href="./returns/"'),'root missing RETURN FIELD link');
check(home.includes('data-mode="STRUCTURE"'),'root missing STRUCTURE map mode');
check(home.includes('data-mode="RECENT"'),'root missing RECENT lens');
check(home.includes('data-mode="EVOLVE"'),'root missing EVOLVE lens');
check(home.includes('FIELD / FOCUS'),'root missing FIELD / FOCUS compositor');
check(home.includes('data-mode="VISUAL"')&&home.includes('data-mode="PULSE"'),'root missing visual/pulse map projections');
check(home.includes('>HEADS / LINEAGES<'),'root missing collapsed HEADS lineage reading');
check(home.includes('MAP / PROJECTIONS'),'root missing MAP reading');
check(home.includes('>PORTS / EXIT STATE<'),'root missing PORTS / EXIT STATE reading');
check(home.includes('ACTIVE / NEEDS YOUR EVIDENCE')&&home.includes('PARKED / NOT NEEDED NOW')&&home.includes('HISTORY / REMOVED'),'root missing WAITING lifecycle split');
if(fi){check(fi.exit_status_taxonomy?.BUILD_PROVE&&fi.exit_status_taxonomy?.PARKED&&fi.ui_contract?.root_ports,'FIELD INDEX port taxonomy contract missing');}
check(home.includes('ROUTES / FIELD SURFACE')&&home.includes('CHANGE / GIT'),'root missing route-first field surface + collapsed exact-change aperture');
check(home.includes('routeGitDrift()')&&home.includes('function tsMs('),'root missing offset-aware INDEX↔GIT drift witness');
check(home.includes('Φ / CURRENT')&&home.includes('id="syncFocus"'),'root missing Φ host / φ focus truth frame');
check(home.includes('ISSUES / REPO OPEN LOOPS'),'root missing ISSUES reading');
check(home.includes('field-glyph.js'),'root missing shared FIELD glyph grammar');
check(home.includes('field-presentation.js'),'root missing FIELD presentation kernel');
check(home.includes('field-aperture.js'),'FIELD root missing reusable Aperture component');
check(home.includes('id="apInspect"')&&home.includes('>READ</button>'),'FIELD root missing focused READFIELD action');
if(exists('port/index.html')){const p=read('port/index.html');check(p.includes('field-aperture.js'),'HUMAN PORT missing reusable Aperture component');check(p.includes('id="inspectBtn"'),'HUMAN PORT missing Aperture intake action');}
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
if(exists('lib/constraint-surface.js')){
  try{new Function(read('lib/constraint-surface.js'))}catch(e){fail.push('JS lib/constraint-surface.js: '+e.message)}
}else fail.push('Constraint Surface shared kernel missing');
check(home.includes('lib/constraint-surface.js'),'FIELD root missing shared Constraint Surface kernel');
check(!home.includes('foundry/axial/focus-core.js'),'FIELD root must not depend on AXIAL presentation core');
const axialPath='foundry/axial/index.html';
const axialLabPath='foundry/axial/lab-0.5.1.html';
const roomPath='foundry/room/index.html';
const roomCorePath='foundry/room/room-core.js';
const spaceCorePath='foundry/room/space-core.js';
const roomRelease=parse('foundry/room/release.json');
if(exists(axialPath)){
  const a=read(axialPath),axialRoute=(manifest?.routes||[]).find(r=>r.href==='/foundry/axial/'),v=axialRelease?.version||axialRoute?.version;
  check(a.includes('../../lib/constraint-surface.js'),'AXIAL missing shared Constraint Surface kernel');
  for(const token of ['FOCUS STACK','FIELD INDEX','HOUSE: SOFA LIGHT','RING','STRIP','RETURN'])check(a.includes(token),'AXIAL focus-stack token missing: '+token);
  if(v){check(a.includes('FOCUS STACK '+v),'AXIAL HTML/version drift: expected '+v);check(axialRoute?.version===v,'AXIAL manifest/release version drift');check(axialContract?.software_head?.name?.includes(v),'AXIAL contract/release version drift');}
  check((axialRelease?.evidence||[]).some(x=>String(x).includes('/recovery/focus-interface-sync-20260921/FU_FOVEATE_RECOVERY_2026-09-21.json')),'AXIAL release missing recovered FU foveate evidence');
  compileInline(axialPath);
}
if(exists(axialLabPath)){
  const a=read(axialLabPath);
  for(const token of ['START 10','AXIAL_PACKET','ARM','RUN','RETURN'])check(a.includes(token),'AXIAL legacy lab token missing: '+token);
  compileInline(axialLabPath);
}

if(exists(roomCorePath)){
  try{new Function(read(roomCorePath))}catch(e){fail.push('JS '+roomCorePath+': '+e.message)}
}else fail.push('INTERPHASE ROOM 0.1 fossil core missing');
if(exists(spaceCorePath)){
  try{new Function(read(spaceCorePath))}catch(e){fail.push('JS '+spaceCorePath+': '+e.message)}
}else fail.push('SPACE SCALE 0.2 fossil core missing');
if(exists(roomPath)){
  const room=read(roomPath),route=(manifest?.routes||[]).find(r=>r.href==='/foundry/room/');
  for(const token of ['ROOM 0.4','MATERIAL DOM','id="program"','data-schema="0xxx0/material-dom/v0.4"','id="compiler"','rel="next"','id="foldBtn"','id="roomSelftest"','MODEL BINDING','DOM = program structure'])check(room.includes(token),'ROOM MATERIAL DOM surface missing token: '+token);
  check(!room.includes('space-core.js'),'ROOM 0.4 current surface must not depend on SPACE SCALE graph core');
  check(exists('foundry/room/html-substrate-0.3.html'),'ROOM HTML SUBSTRATE 0.3 donor missing');
  check(exists('foundry/room/release-0.3.json'),'ROOM HTML SUBSTRATE 0.3 release donor missing');
  check(exists('foundry/room/space-scale-0.2.html'),'SPACE SCALE 0.2 fossil missing');
  check(exists('foundry/room/release-0.2.json'),'SPACE SCALE 0.2 release fossil missing');
  check(exists('foundry/room/room-0.1.html'),'INTERPHASE ROOM 0.1 probe fossil missing');
  check(exists('foundry/room/release-0.1.json'),'INTERPHASE ROOM 0.1 release fossil missing');
  check(route?.state==='CANDIDATE','ROOM MATERIAL DOM must remain CANDIDATE until real-use evidence');
  check(route?.kind==='experiment','ROOM MATERIAL DOM route kind drifted');
  check(route?.operation==='COMPOSE','ROOM MATERIAL DOM operation drifted');
  check(route?.evolution?.host==='/foundry/','ROOM MATERIAL DOM evolution host drifted');
  check(route?.evolution?.generation===4,'ROOM MATERIAL DOM generation drifted');
  check(roomRelease?.version==='0.4','ROOM MATERIAL DOM release version drifted');
  check(roomRelease?.route==='/foundry/room/','ROOM MATERIAL DOM release route drifted');
  check(/not strictly homoiconic|strict homoiconicity/i.test((roomRelease?.boundaries||[]).join(' ')),'ROOM MATERIAL DOM must preserve non-homoiconicity boundary');
  check((roomRelease?.laws||[]).some(x=>/MODEL FIT != PHYSICAL CONTRACT FIT/i.test(String(x))),'ROOM MATERIAL DOM must preserve model/contract separation');
  compileInline(roomPath);
}

if(exists('showcase-selftest/index.html')){
  const st=read('showcase-selftest/index.html');
  for(const token of ["/docs/","/foundry/axial/","/foundry/room/","/port/","const TOTAL=CASES.length*WIDTHS.length","c.adapter!==false"])check(st.includes(token),'showcase self-test missing current-surface coverage: '+token);
  compileInline('showcase-selftest/index.html');
}

for(const p of ['returns/index.html','foundry/index.html','fcm/index.html','router-bench/index.html'])compileInline(p);
if(exists('poetry/map/index.html')){
  const p=read('poetry/map/index.html');
  for(const token of ['POEM MAP 0.2.1','id="fieldNowBtn"','id="focusWheel"','id="pmAperture"','id="guideBtn"','id="importBtn"','id="corpusBtn"','id="formDetails"','id="mapLawDetails"','data-mode="PAGE"','data-mode="MAP"','data-mode="SETS"','ORDER','SOUND','REPEAT','AUTHOR','APERTURE','TRY','ADOPT','LOCK'])check(p.includes(token),'Poem Map capability token missing: '+token);
  check(!/(?:^|[^$])\$\(\s*['"`][^'"`]+['"`]\s*\)\.forEach\s*\(/m.test(p),'Poem Map must not call forEach on single querySelector result');
  compileInline('poetry/map/index.html');
}
if(exists('poetry/index.html')){
  const p=read('poetry/index.html');
  for(const token of ['WRITE / EXPLORE','FIND WORDS / SOLVE','COMPOSE BY PATH','STUDY JUEJU','PLAY / MULTILINGUAL'])check(p.includes(token),'VERSE re-entry option missing: '+token);
}
if(exists('foundry/verse-atlas/app.js')){
  const v=read('foundry/verse-atlas/app.js');
  try{new Function(v)}catch(e){fail.push('JS foundry/verse-atlas/app.js: '+e.message)}
  for(const token of ['stateFromReceipt','applyReceipt','renderStudy','renderParallel','renderGlyph','renderRsvp','exportReceipt'])check(v.includes(token),'Verse Atlas sealed capability missing: '+token);
}
const currentCoord=parse('control/CURRENT.json'),queueCoord=parse('control/QUEUE.json');
if(currentCoord&&queueCoord){
  const active=new Set((currentCoord.active_fronts||[]).map(x=>x.id));
  const queued=(queueCoord.live||[]).map(x=>x.front_id||x.id);
  check(queued.length<=queueCoord.max_live,'QUEUE exceeds max_live');
  check(new Set(queued).size===queued.length,'QUEUE duplicate live front');
  check(queued.length===active.size&&queued.every(id=>active.has(id)),'QUEUE live fronts drift from CURRENT authority');
  const held=new Set((currentCoord.held_fronts||[]).map(x=>x.id));
  check(queued.every(id=>!held.has(id)),'QUEUE schedules a CURRENT-held front');
  const axialHead=currentCoord.current_heads?.find(x=>x.lineage==='axial'),axialHold=currentCoord.held_fronts?.find(x=>x.id==='machine-representation');
  if(axialRelease?.version){check(axialHead?.head?.includes(axialRelease.version),'CURRENT axial head/version drift');check(axialHold?.center?.includes(axialRelease.version),'CURRENT axial hold/version drift');}
  const city=currentCoord.recovery_targets?.find(x=>x.id==='sleeper-deep-lineage');
  if(city?.status==='EXACT_CITY_SOURCE_AND_PAINTING_RUNTIME_RECOVERED'){
    check(!migrationNow?.open_gaps?.some(x=>x.id==='painting-city'),'resolved City/Painting source gap reopened in MIGRATION_NOW');
    for(const id of ['sleeper-one-return-city-engine','sleeper-painting-path']){
      const a=migration?.artifacts?.find(x=>x.id===id);
      check(a?.retrieval_state==='EXACT_SOURCE_RECOVERED_2026-09-21','recovered source contradicts migration ledger: '+id);
    }
  }
}
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
