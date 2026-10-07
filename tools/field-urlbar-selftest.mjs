#!/usr/bin/env node
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const U=require('../field-urlbar.js');

const fail=[];
const ok=(value,label)=>{if(!value)fail.push(label)};
const eq=(a,b,label)=>ok(JSON.stringify(a)===JSON.stringify(b),label+' · got '+JSON.stringify(a)+' expected '+JSON.stringify(b));

const turn=U.parse('> /house/');
eq(turn.mode,'TURN','TURN prefix');eq(turn.query,'/house/','TURN query');
const hermes=U.parse('! /body/');
eq(hermes.mode,'HERMES','HERMES prefix');eq(hermes.query,'/body/','HERMES query');
eq(U.parse('@').mode,'HEADS','HEADS prefix');eq(U.parse('^').mode,'RISE','RISE prefix');eq(U.parse(':prove').mode,'COMMAND','COMMAND prefix');eq(U.parse('中行').query,'中行','glyph query preserved');

const routes=[
 {href:'/zeta/',title:'Zeta',kind:'hub',operation:'ROUTE',state:'ACTIVE',index:{updated_at:'2026-10-06T10:00:00Z'}},
 {href:'/alpha/',title:'Alpha',kind:'hub',operation:'ROUTE',state:'ACTIVE',index:{updated_at:'2026-01-01T10:00:00Z'}},
 {href:'/house/',title:'HOUSE',kind:'system',operation:'ADDRESS',state:'ACTIVE',index:{updated_at:'2026-10-06T12:00:00Z'}},
 {href:'/archive/',title:'Archive',kind:'artifact',operation:'RECOVER',state:'DONOR',index:{updated_at:'2026-10-06T13:00:00Z'}}
];
const heads=new Set(['/zeta/','/alpha/']);
const mnemonic=r=>r.href==='/house/'?'器位':r.href==='/zeta/'?'中行':r.href==='/alpha/'?'中行·A':'物復';
let ranked=U.rank(routes,U.parse('/house/'),{heads,focus:null,mnemonic},9);
eq(ranked[0]?.href,'/house/','exact address outranks partials');
ranked=U.rank(routes,U.parse('器位'),{heads,focus:null,mnemonic},9);
eq(ranked[0]?.href,'/house/','glyph mnemonic resolves route');
ranked=U.rank(routes,U.parse('@'),{heads,focus:null,mnemonic},9);
eq(ranked.map(x=>x.href),['/alpha/','/zeta/'],'empty HEADS is alphabetical, not recency/recorded rank');
ok(!ranked.some(x=>x.href==='/house/'),'HEADS excludes non-heads');
ranked=U.rank(routes,U.parse('house'),{heads,focus:null,mnemonic},9);
eq(ranked[0]?.href,'/house/','title query resolves route');

const commands=U.rankCommands('prove');
eq(commands[0]?.id,'prove','command palette resolves proof command');
const cmd=U.hermesPrepare('/house/');
ok(cmd.includes('tools/field-hermes-run.mjs --source'),'Hermes uses existing bridge');
ok(cmd.includes("'/house/'"),'Hermes source is quoted');
ok(!cmd.includes('--execute'),'URLbar Hermes action must be PREP only');
ok(!cmd.includes('API_SERVER_KEY')&&!cmd.includes('HERMES_API_KEY'),'URLbar never serializes secret names');
const quoted=U.shellQuote("/O'Brien/");
eq(quoted,"'/O'\\''Brien/'",'shell quote apostrophe');

const urlbar=fs.readFileSync(new URL('../field-urlbar.js',import.meta.url),'utf8');
const signal=fs.readFileSync(new URL('../lib/field-signal.js',import.meta.url),'utf8');
const lens=fs.readFileSync(new URL('../field-lens.js',import.meta.url),'utf8');
ok(!urlbar.includes('/v1/runs'),'public URLbar must not call Hermes Runs API directly');
ok(!signal.includes('field-urlbar'),'shared signal grammar must remain presentation-free');
ok(lens.includes("import('./field-urlbar.js')"),'root FIELD lens host must mount the URLbar projection');

/* ---- unified palette: alias-first ranking + recents-first + reset ---- */
const ALIAS_TARGETS={h:'root',o:'hold',w:'work',p:'prove',r:'open'};
eq(U.PALETTE_ALIAS,ALIAS_TARGETS,'glyph aliases are exactly the operator grammar');
for(const [k,v] of Object.entries(ALIAS_TARGETS))eq(U.aliasId(k,routes),v,'alias '+k+' resolves '+v);
// FALSIFIER — an alias must never outrank an exact typed path/address.
eq(U.aliasId('o',[{href:'o',title:'Letter O',kind:'x'}]),null,'exact typed address beats the alias');
eq(U.aliasId('h',[{href:'/h/',title:'H',kind:'x'}]),null,'exact typed address beats the alias (slash form)');
eq(U.aliasId('/nexus/',routes),null,'a path never aliases');
eq(U.aliasId('zz',routes),null,'an unknown letter never aliases');
eq(U.aliasId('',routes),null,'an empty query never aliases');
eq(U.aliasId('h',[{href:'/',title:'FIELD INDEX',kind:'x'}]),'root','a route that is not the typed address does not suppress the alias');

// empty query: held object first, then surfaces in USE order, then heads alpha.
const palette={recents:['/archive/','/zeta/'],use:{}};
ranked=U.rank(routes,U.parse(''),{heads,focus:null,mnemonic,palette},9);
eq(ranked.map(x=>x.href),['/archive/','/zeta/','/alpha/','/house/'],'empty query lists surfaces in USE order');
ranked=U.rank(routes,U.parse(''),{heads,focus:'/house/',mnemonic,palette},9);
eq(ranked.map(x=>x.href),['/house/','/archive/','/zeta/','/alpha/'],'held object still outranks every recent (never below the fold)');
ranked=U.rank(routes,U.parse(''),{heads,focus:null,mnemonic},9);
eq(ranked.map(x=>x.href),['/alpha/','/zeta/','/archive/','/house/'],'no learning yet = heads alphabetical, unchanged');
eq(U.rank(routes,U.parse('@'),{heads,focus:null,mnemonic,palette},9).map(x=>x.href),['/alpha/','/zeta/'],'HEADS empty stays alphabetical, recents never reorder it');

// frecency is a TIE-break only: evidence still decides the rank.
const tie=[{href:'/aa/',title:'Same',kind:'x'},{href:'/bb/',title:'Same',kind:'x'}];
const use={recents:[],use:{'/bb/':{n:3,ts:Date.now()}}};
eq(U.rank(tie,U.parse('same'),{heads:new Set(),focus:null,mnemonic:()=>'',palette:use},9)[0]?.href,'/bb/','frecency breaks an evidence TIE');
eq(U.rank(tie,U.parse('same'),{heads:new Set(),focus:null,mnemonic:()=>''},9)[0]?.href,'/aa/','without learning a tie falls back to address order');
const skew=[{href:'/house/',title:'HOUSE',kind:'x'},{href:'/other/',title:'Household',kind:'x'}];
const heavy={recents:[],use:{'/other/':{n:999,ts:Date.now()},'/house/':{n:1,ts:Date.now()-86400000}}};
eq(U.rank(skew,U.parse('house'),{heads:new Set(),focus:null,mnemonic:()=>'',palette:heavy},9)[0]?.href,'/house/','heavy frecency never outranks a stronger address score');

// reset affordance + bounds
ok(U.COMMANDS.some(c=>c.id==='reset'),'Reset Ranking is a palette command');
eq(U.PALETTE_RECENTS,8,'recents are bounded to 8');
ok(U.EMPTY_ROWS>=3&&U.EMPTY_ROWS<=6,'empty state stays capped for a 390px screen');

// status spine: counts + as-of stamp come from the board's own bytes
const boardText=fs.readFileSync(new URL('../nexus/board.html',import.meta.url),'utf8');
const b=U.parseBoard(boardText);
ok(b&&Number.isFinite(b.open)&&b.open>=0,'board parses the open count');
ok(b&&Number.isFinite(b.blocked)&&Number.isFinite(b.running),'board parses blocked/running columns');
ok(b&&/^\d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC$/.test(b.stamp),'board carries its own generated stamp');
eq(U.parseBoard('no board here'),null,'an unrecognized board grammar fails LOUD (null), never fake counts');
ok(U.stampMs(b.stamp)>0&&U.ageLabel(3*60000)==='3m'&&U.ageLabel(90*60000)==='2h'&&U.ageLabel(50*3600000)==='2d','age stamp formats minutes/hours/days');

// one grammar: the omnibar owns the alias table, executes every alias target
const omni=fs.readFileSync(new URL('../field-omnibar.js',import.meta.url),'utf8');
for(const [k,v] of Object.entries(ALIAS_TARGETS))ok(omni.includes(k+":'"+v+"'"),'omnibar carries glyph alias '+k+'→'+v);
for(const id of Object.values(ALIAS_TARGETS))ok(omni.includes("case'"+id+"':")||omni.includes("if(cmd==='"+id+"')"),'omnibar executes alias target '+id);
ok(omni.includes("case'reset':"),'omnibar can reset the learned ranking too');
ok(omni.includes('noteUse'),'omnibar feeds the frecency ranking on every use');
ok(omni.includes('auto auto auto'),'the fold reserves a column for the status spine');
// spine + keyboard path on the line
ok(urlbar.includes('fieldUrlSpine'),'status spine is mounted on the URLbar line');
ok(urlbar.includes('/nexus/board.html'),'spine deep-links to its own board');
ok(urlbar.includes('STALE'),'spine says STALE in words, never colour alone');
ok(urlbar.includes("(e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'"),'Ctrl/⌘K still opens the palette');
ok(urlbar.includes(".slice(0,7)")||urlbar.includes('EMPTY_ROWS'),'palette aperture stays bounded');

if(fail.length){console.error('FIELD URLBAR SELFTEST FAIL · '+fail.join(' · '));process.exit(1)}
console.log('FIELD URLBAR SELFTEST PASS · one URL line → glyph/address/head/turn/Hermes prep · authority NONE · projection-owned mount');
