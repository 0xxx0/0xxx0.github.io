import fs from 'node:fs';
import assert from 'node:assert/strict';

const html=fs.readFileSync('foundry/omnitools/index.html','utf8');
const app=fs.readFileSync('foundry/omnitools/instrument-app.mjs','utf8');
const release=JSON.parse(fs.readFileSync('foundry/omnitools/release.json','utf8'));
const instrument=JSON.parse(fs.readFileSync('foundry/omnitools/instrument.json','utf8'));
const needHtml=(needle,msg=needle)=>assert.ok(html.includes(needle),msg);
const needApp=(needle,msg=needle)=>assert.ok(app.includes(needle),msg);

for(const id of ['sourceToggle','sourceText','sourceHash','benchPane','benchIn','evaluate','trace','copyReturn']) needHtml(`id="${id}"`,`missing ${id}`);
for(const mode of ['bench','scan','read','align','reshape']) needHtml(`data-mode="${mode}"`,`missing mode ${mode}`);
for(const route of ['./pii-lens.html','./text-lens.html','./re-reader.html','./reshaper.html']) needHtml(`src="${route}"`,`missing specialist ${route}`);
needHtml('src="./instrument-app.mjs"','external instrument runtime missing');
needHtml('SOURCE → AXIS → EFFECTOR → TRACE → RETURN','instrument pipeline missing');
needHtml('FORM / FUNCTION / FORTITUDE','FFF bench missing');
needHtml('allow-same-origin','same-origin bounded handoff missing');

needApp("import {parseAndEvaluate,AXES} from './bench.mjs'",'bench core is not imported');
needApp("const KEY='omnitools.work-object.v01'",'one transient source key missing');
needApp("schema:'omnitools-return/v0.1'",'RETURN schema missing');
needApp("authority:'EVIDENCE_ONLY'",'RETURN authority boundary missing');
needApp("'SOURCE != RESULT'",'source/result law missing');
needApp("'BENCH != RANKING'",'bench/ranking law missing');
needApp("sourceToggle.onclick",'mobile source handle is not operable');

assert.ok(!/\bfetch\s*\(/.test(html+app),'carrier must not fetch/network source bytes');
assert.ok(!/XMLHttpRequest|WebSocket|EventSource/.test(html+app),'carrier contains network primitive');
assert.equal(release.version,'0.2','route/bundle version drift');
assert.equal(instrument.bundle_version,'0.2','instrument must remain inside bundle 0.2');
assert.equal(instrument.instrument_revision,'0.3','instrument revision missing');
assert.equal(instrument.authority,'LOCAL_SESSION_CARRIER / ADVISORY_BENCH / NO EFFECT AUTHORITY');
assert.deepEqual(instrument.spine,['SOURCE','AXIS','EFFECTOR','TRACE','RETURN']);
assert.deepEqual(instrument.axes.map(x=>x.id),['bench','scan','read','align','reshape']);
assert.ok(instrument.laws.includes('SOURCE != RESULT'),'instrument source law missing');
assert.ok(instrument.laws.includes('BENCH != RANKING'),'instrument bench law missing');
assert.ok(instrument.laws.includes('PROJECTION != EFFECT'),'instrument effect law missing');
assert.ok(instrument.laws.includes('RETURN PRESERVES EVIDENCE, NOT AUTHORITY'),'instrument return law missing');
assert.equal(instrument.return.authority,'EVIDENCE_ONLY');

console.log('OMNITOOLS WORKBENCH PASS · one source · mobile handle · five unequal axes · evidence-only return');
