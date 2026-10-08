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

/* ---- M1 one registry · M2 one parser/two entry styles · M3 one keydown owner ---- */
const byCmd=new Map(U.COMMANDS.map(c=>[c.id,c]));
const REG_IDS=['root','hold','work','prove','open','return','handoff','run','trace','read','map','recent','up','down','prev','next','heads','desk','reader','hub','calls','digests','fovea','theme','reset','help'];
for(const id of REG_IDS)ok(byCmd.has(id),'registry carries '+id);
ok(!byCmd.has('copy'),'drifted id copy is reconciled into handoff (alias form)');
ok(!byCmd.has('returns'),'drifted id returns is reconciled into return (alias form)');
eq(U.resolveCommand(':returns'),'return',':returns resolves the return command');
eq(U.resolveCommand('returns'),'return','bare returns resolves the return command');
eq(U.resolveCommand(':copy'),'handoff',':copy resolves the handoff command');
eq(U.resolveCommand(':hermes'),'run',':hermes resolves the HERMES command');
eq(U.resolveCommand(':proof'),'prove',':proof alias resolves prove');
eq(U.resolveCommand(':home'),'root',':home alias resolves root');
eq(U.resolveCommand('◎'),'hold','bare glyph resolves its command');
// ONE glyph per id — the operator mapping supersedes both pre-fold tables.
const CANON={root:'⌂',hold:'◎',work:'▽',prove:'◆',open:'↗',return:'↩',handoff:'⎘',run:'▶'};
for(const [id,g] of Object.entries(CANON))eq(byCmd.get(id)?.glyph,g,'operator glyph '+id+' = '+g);
const glyphList=U.COMMANDS.map(c=>c.glyph);
eq(new Set(glyphList).size,glyphList.length,'one glyph per id — no drift pair survives');
// M4 · route commands are registry DATA (plain navigation / copy, no new API).
eq(byCmd.get('desk')?.nav,'/desk/',':desk addresses /desk/');
eq(byCmd.get('return')?.nav,'/returns/',':returns/:return address /returns/');
eq(byCmd.get('reader')?.nav,'/reader/',':reader addresses /reader/');
eq(byCmd.get('digests')?.nav,'/digests/#pp',':digests addresses the passphrase field via its own fragment');
eq(byCmd.get('hub')?.copy,'http://127.0.0.1:8777/hub',':hub copies the reader URL (no site route)');
eq(byCmd.get('calls')?.copy,'http://127.0.0.1:8777/calls',':calls copies the reader URL (no site route)');
ok(U.COMMANDS.every(c=>!c.nav||c.nav.startsWith('/')),'every nav target is a site-relative address');
ok(!U.COMMANDS.some(c=>/--execute|API_KEY|Authorization/.test(JSON.stringify(c))),'registry never carries execution authority or secrets');
// M2 · one parser, two entry styles.
eq(U.parseCommand(':prove'),{query:'',command:'prove',style:'leading'},'leading :cmd parses');
eq(U.parseCommand('/house/ :prove'),{query:'/house/',command:'prove',style:'trailing'},'trailing :cmd parses');
eq(U.parseCommand('/house/ prove'),{query:'/house/ prove',command:null,style:''},'a bare trailing word is not a command (colon is the reserved prefix)');
eq(U.parseCommand('◎'),{query:'',command:'hold',style:'glyph'},'bare glyph parses');
const trail=U.parse('/house/ :prove');
eq(trail.mode,'COMMAND','urlbar accepts the legacy trailing style');eq(trail.command,'prove','trailing command extracted');eq(trail.query,'/house/','trailing target preserved');
eq(U.parse(':desk').mode,'COMMAND','leading style unchanged');
eq(U.parse('中行').mode,'SEARCH','glyph text search never becomes a command');
// M6 · :help registry.
ok(byCmd.get('help'),':help is registered');
for(const c of U.COMMANDS)ok(c.id&&c.glyph&&c.hint,'command renders id+glyph+hint: '+c.id);
// M3 · exactly one document-level entry owner.
ok(urlbar.includes("(e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'"),'urlbar owns document ⌘K');
ok(urlbar.includes("e.key===':'"),"urlbar owns document :");
ok(omni.includes("if(document.getElementById('fieldUrlBar'))return;"),'omnibar keydown is a passthrough while the URLbar owns the line');
ok(!/const COMMANDS\s*=\s*Object\.freeze\(\[/.test(omni),'field-omnibar.js must not carry a second command table');
ok(omni.includes('FieldURLBarCore'),'field-omnibar.js binds the shared registry');

/* ---- G1 · command frecency: rankCommands reads the store noteUse writes ---- */
const noData=U.rankCommands('',26);
eq(noData.map(c=>c.id),noData.map(c=>c.id).slice().sort(),'no usage data = pure alphabetical order');
const seeded={recents:['cmd:theme','cmd:work'],use:{'cmd:theme':{n:1,ts:0},'cmd:work':{n:2,ts:0}}};
const learned=U.rankCommands('',26,seeded);
eq(learned.slice(0,2).map(c=>c.id),['theme','work'],'seeding the store reorders the command list');
eq(learned.slice(2).map(c=>c.id),noData.filter(c=>c.id!=='theme'&&c.id!=='work').map(c=>c.id),'the unlearned tail stays alphabetical');
// equal evidence scores fall back to alphabetical, then to frecency once taught.
eq(U.rankCommands('copy').slice(0,4).map(c=>c.id),['calls','handoff','hub','run'],'equal scores fall back to alphabetical');
const boost={recents:['cmd:run'],use:{'cmd:run':{n:5,ts:0}}};
eq(U.rankCommands('copy',9,boost)[0].id,'run','frecency breaks an evidence TIE');
eq(U.rankCommands('copy',9,boost).map(c=>c.id),U.rankCommands('copy',9,boost).map(c=>c.id),'one store always ranks the same (deterministic)');
const heavyCmd={recents:['cmd:trace'],use:{'cmd:trace':{n:999,ts:0}}};
eq(U.rankCommands('copy',9,heavyCmd).slice(0,4).map(c=>c.id),['calls','handoff','hub','run'],'heavy frecency never outranks a stronger text score');

/* ---- G2 · match highlighting: wrapped in <mark>, escaped BEFORE wrapping ---- */
const marked=U.highlight('PROVE · evidence depth','prov');
ok(marked.startsWith('<mark>PROV</mark>'),'matched characters are wrapped in <mark>');
eq(U.highlight('PROVE',''),'PROVE','an empty query renders plain text');
eq(U.highlight('PROVE','zzz'),'PROVE','a non-match renders plain text');
const nasty='<img src=x onerror=alert(1)>';
const escaped=U.highlight(nasty,'img');
ok(!escaped.includes('<img'),'highlight never injects raw markup (query text is escaped)');
ok(escaped.includes('&lt;<mark>img</mark>'),'row text is escaped before it is wrapped');
ok(urlbar.includes('highlight(r.title||r.href'),'route rows render through the highlighter');
ok(urlbar.includes("highlight(':'+c.id+' · '+c.label"),'command rows render through the highlighter');
ok(urlbar.includes('.fieldUrlRow mark{'),'the highlight ships quiet panel styling');

/* ---- G3 · the 0-match panel teaches instead of dying ---- */
const near=U.nearestCommands('zzzzz');
eq(near.length,2,'a 0-match query offers the 2 nearest commands');
ok(near.every(c=>U.COMMANDS.some(x=>x.id===c.id)),'nearest commands come from the ONE registry');
eq(U.nearestCommands('zzzzz'),near,'nearest commands are deterministic');
eq(U.nearestCommands('qqq'),[],'no evidence at all offers nothing (score > 0 gate)');
const hint=U.emptyHint('zzzzz',0);
ok(hint.includes('no match · :help for all commands'),'empty state teaches the :help handle');
ok(hint.includes('fieldUrlStatus'),'empty state uses the quiet panel styling');
ok(hint.includes('nearest :'),'empty state names the nearest commands');
eq(U.emptyHint('zzzzz',3),'','a non-empty result set renders no hint');
eq(U.emptyHint('',0),'','an empty query never claims no match');
ok(!U.emptyHint('<b>x</b>',0).includes('<b>'),'the hint never echoes raw query markup');
ok(urlbar.includes('emptyHint(currentParsed.query'),'paint() wires the teaching empty state');

if(fail.length){console.error('FIELD URLBAR SELFTEST FAIL · '+fail.join(' · '));process.exit(1)}
console.log('FIELD URLBAR SELFTEST PASS · one URL line → glyph/address/head/turn/Hermes prep · authority NONE · projection-owned mount');
