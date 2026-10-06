#!/usr/bin/env node
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

if(fail.length){console.error('FIELD URLBAR SELFTEST FAIL · '+fail.join(' · '));process.exit(1)}
console.log('FIELD URLBAR SELFTEST PASS · one URL line → glyph/address/head/turn/Hermes prep · authority NONE');
