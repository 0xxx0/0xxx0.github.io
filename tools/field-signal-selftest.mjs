#!/usr/bin/env node
import fs from 'node:fs';import {createRequire} from 'node:module';const require=createRequire(import.meta.url);const F=require('../lib/field-signal.js');
const root=fs.readFileSync('index.html','utf8'),shop=fs.readFileSync('shopping/index.html','utf8'),dayHtml=fs.readFileSync('dayline/index.html','utf8'),dayJs=fs.readFileSync('dayline/app.js','utf8'),css=fs.readFileSync('lib/field-signal.css','utf8'),fail=[],need=(x,m)=>{if(!x)fail.push(m)};
need(F.combine({})==='CLEAR','CLEAR');need(F.combine({changed:true})==='CHANGED','CHANGED');need(F.combine({reality:true})==='REALITY','REALITY');need(F.combine({external:true})==='EXTERNAL','EXTERNAL');need(F.combine({changed:true,reality:true})==='MIXED','MIXED');
for(const t of ['CHANGED','REALITY','EXTERNAL','MIXED'])need(css.includes('data-field-signal="'+t+'"'),t+' CSS');
need(root.includes('./lib/field-signal.css')&&root.includes('fieldSignalBar'),'root consumer');
need(shop.includes('../lib/field-signal.css')&&shop.includes('function evidenceSignal(it)')&&shop.includes('function evidencePanel(it)'),'shopping consumer');
need(shop.includes('evidence_signal:e.token')&&shop.includes('proof_boundary:e.boundary')&&shop.includes('Pattern is projection only'),'shopping boundary');
need(dayHtml.includes('/lib/field-signal.css')&&dayHtml.includes('class="frame fieldSignalBar"'),'dayline signal host');
need(dayJs.includes('function sourceEvidence(f)')&&dayJs.includes("src?.evidence_signal||'CLEAR'")&&dayJs.includes("FieldSignal?.apply"),'dayline source-owned projection');
need(!dayJs.includes('FieldSignal?.combine'),'dayline must not infer/combine source domain signal');
if(fail.length){console.error('FIELD SIGNAL FAIL · '+fail.join(' · '));process.exit(1)}console.log('FIELD SIGNAL PASS · shared pattern grammar → FIELD root + Shopping');