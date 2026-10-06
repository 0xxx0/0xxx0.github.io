#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseFieldAddress,rankFieldRoutes,normalizeFieldRoute,addressMode} from '../lib/field-address-grammar.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'showcase-manifest.json'),'utf8'));
const routes=(manifest.routes||manifest.entries||[]).filter(x=>x?.href);
const fail=[];const need=(ok,msg)=>{if(!ok)fail.push(msg)};

need(parseFieldAddress('/house/').verb==='ADDRESS','route parses as ADDRESS');
need(parseFieldAddress('位 /house/').verb==='ADDRESS','位 parses as ADDRESS');
need(parseFieldAddress('讀').verb==='READ','讀 parses as READ');
need(parseFieldAddress('驗').verb==='PROVE','驗 parses as PROVE');
need(parseFieldAddress('行').verb==='TURN','行 parses as TURN');
need(parseFieldAddress('回').verb==='RETURN','回 parses as RETURN');
need(parseFieldAddress('復').verb==='RECOVER','復 parses as RECOVER');
need(parseFieldAddress('映').verb==='PROJECT','映 parses as PROJECT');
need(parseFieldAddress(':desk').verb==='DESK',':desk parses as DESK');
need(parseFieldAddress('? house').verb==='SEARCH','? parses as SEARCH');
need(normalizeFieldRoute('house')==='/house/','relative route normalizes');
need(normalizeFieldRoute('/house/')==='/house/','absolute route stays exact');
need(normalizeFieldRoute('https://example.com/house/')===null,'external URL rejected by grammar normalizer');
const house=rankFieldRoutes(routes,'/house/',3);
need(house[0]?.href==='/house/','exact route ranks first');
const desk=rankFieldRoutes(routes,'field desk',3);
need(desk.some(x=>x.href==='/desk/'),'title search finds FIELD DESK');
need(addressMode({verb:'READ'})[0]==='讀','READ mode retains glyph');

const ui=fs.readFileSync(path.join(ROOT,'field-address-line.js'),'utf8');
need(ui.includes("authority:'NONE'"),'UI exposes authority NONE');
need(ui.includes(".axisToken.route[data-value]"),'UI delegates route activation to existing FIELD route tokens');
need(ui.includes("window.FieldZUI?.open?.('WORK'"),'READ delegates to existing WORK depth');
need(ui.includes("window.FieldZUI?.open?.('PROVE'"),'PROVE delegates to existing proof depth');
need(ui.includes("field-address-turn"),'TURN is a reveal event, not an executor');
need(!/eval\s*\(|new Function\s*\(|child_process|spawn\s*\(|exec\s*\(/.test(ui),'address line contains no shell/code execution path');
need(!/localStorage|sessionStorage/.test(ui),'address line creates no persistent state');

const visor=fs.readFileSync(path.join(ROOT,'field-awake-visor.js'),'utf8');
need(visor.startsWith("import './field-address-line.js';"),'root projection bundle loads address line');

if(fail.length){console.error('FIELD ADDRESS LINE SELFTEST FAIL · '+fail.join(' · '));process.exit(1)}
console.log('FIELD ADDRESS LINE SELFTEST PASS · exact address → existing HOLD → bounded projection operations · authority NONE');
