#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
const U=require(path.join(ROOT,'field-urlbar.js'));
const src=fs.readFileSync(path.join(ROOT,'field-urlbar.js'),'utf8');
const lens=fs.readFileSync(path.join(ROOT,'field-lens.js'),'utf8');
const fail=[];
const ok=(v,m)=>{if(!v)fail.push(m)};

ok(U.parse('@/house/').mode==='HOLD'&&U.parse('@/house/').query==='/house/','@ must HOLD an addressed object');
ok(U.parse('/house/').mode==='HOLD'&&U.parse('/house/').implicit===true,'bare route must HOLD, not navigate');
ok(U.parse('? cat').mode==='FIND'&&U.parse('? cat').query==='cat','? must FIND');
ok(U.parse('> open native').mode==='TURN','> must project TURN');
ok(U.parse('!').mode==='TRACE','! must TRACE');
ok(U.parse('<').mode==='RETURN','< must RETURN');
ok(U.parse(':hermes').mode==='COMMAND','colon must address host command layer');
ok(U.parse('house').mode==='FIND','bare text must search rather than act');

for(const raw of ['@/house/','? fold bloom','> TRACE / VERIFY','! /interphase/',':hermes','<']){
  ok(U.fromFragment(U.fragment(raw))===raw,'URL fragment round-trip '+raw);
}

const items=[
  {href:'/house/',title:'HOUSE / FIELD',family:'HOUSE',operation:'OPERATE'},
  {href:'/fold-bloom/',title:'FOLD BLOOM',family:'EXPERIENCE',operation:'RIDE'},
  {href:'/house/design/',title:'HOUSE DESIGN',family:'HOUSE',operation:'REPRESENT'}
];
ok(U.rank('/house/',items,3)[0].href==='/house/','exact route must outrank descendants');
ok(U.rank('fold bloom',items,3)[0].href==='/fold-bloom/','title search must resolve');
ok(U.rank('design',items,3)[0].href==='/house/design/','semantic text match must resolve');

ok(Array.isArray(U.COMMANDS)&&U.COMMANDS.some(x=>x.id==='stage')&&U.COMMANDS.some(x=>x.id==='terminal')&&U.COMMANDS.some(x=>x.id==='hermes'),'native bridge commands must be discoverable');
ok(!src.includes('field-hermes-run.mjs --source '+"'+q(addr)+' --execute"),'URL bar must not synthesize Hermes --execute');
ok(!src.includes('/v1/runs'),'public bar must not call Hermes Runs API');
ok(!src.includes('API_SERVER_KEY')&&!src.includes('HERMES_API_KEY'),'public bar must not know executor secrets');
ok(src.includes("if(authority==='EFFECT')")&&src.includes('EFFECT · NATIVE RELEASE'),'EFFECT must fail closed at native release boundary');
ok(src.includes("win.__fieldAct?.focus?.(href)"),'HOLD must reuse existing FIELD focus owner');
ok(src.includes("win.FieldIndexCarrier?.actionSurface?.()"),'TURN must reuse existing bounded action aperture');
ok(src.includes("doc.getElementById('apTrace')")&&src.includes("doc.getElementById('apProof')"),'TRACE/PROOF must reuse existing FIELD controls');
ok(lens.includes("import('./field-urlbar.js')"),'FIELD root lens host must mount the URL bar');

if(fail.length){
  console.error('FIELD URLBAR SELFTEST FAIL · '+fail.join(' · '));
  process.exit(1);
}
console.log('FIELD URLBAR SELFTEST PASS · @ HOLD · ? FIND · > TURN · ! TRACE · < RETURN · : HOST · URL round-trip · authority NONE');
