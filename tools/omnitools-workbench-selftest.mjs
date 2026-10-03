import fs from 'node:fs';
import assert from 'node:assert/strict';

const html=fs.readFileSync('foundry/omnitools/index.html','utf8');
const release=JSON.parse(fs.readFileSync('foundry/omnitools/release.json','utf8'));
const need=(needle,msg=needle)=>assert.ok(html.includes(needle),msg);

for(const id of ['sourceText','sourceHash','benchPane','benchIn','evaluate','trace','copyReturn']) need(`id="${id}"`,`missing ${id}`);
for(const mode of ['bench','scan','read','align','reshape']) need(`data-mode="${mode}"`,`missing mode ${mode}`);
for(const route of ['./pii-lens.html','./text-lens.html','./re-reader.html','./reshaper.html']) need(`src="${route}"`,`missing specialist ${route}`);
need("import {parseAndEvaluate,AXES} from './bench.mjs'",'bench core is not imported');
need("const KEY='omnitools.work-object.v01'",'one transient source key missing');
need("schema:'omnitools-return/v0.1'",'RETURN schema missing');
need("authority:'EVIDENCE_ONLY'",'RETURN authority boundary missing');
need("'SOURCE != RESULT'",'source/result law missing');
need("'BENCH != RANKING'",'bench/ranking law missing');
need('SOURCE → AXIS → EFFECTOR → TRACE → RETURN','instrument pipeline missing');
need('FORM / FUNCTION / FORTITUDE','FFF bench missing');
need('allow-same-origin','same-origin bounded handoff missing');

assert.ok(!/\bfetch\s*\(/.test(html),'launcher must not fetch/network source bytes');
assert.ok(!/XMLHttpRequest|WebSocket|EventSource/.test(html),'launcher contains network primitive');
assert.equal(release.version,'0.2','route/bundle version drift');
assert.equal(release.instrument_revision,'0.3','instrument revision missing');
assert.equal(release.authority,'LOCAL_SESSION_CARRIER / ADVISORY_BENCH / NO EFFECT AUTHORITY');
assert.ok(release.tool_versions?.['bench.mjs']==='0.1','bench tool version missing');
assert.ok(release.laws?.includes('SOURCE != RESULT'),'release source law missing');
assert.ok(release.laws?.includes('BENCH != RANKING'),'release bench law missing');
assert.ok(release.laws?.includes('PROJECTION != EFFECT'),'release effect law missing');
assert.ok(release.laws?.includes('RETURN PRESERVES EVIDENCE, NOT AUTHORITY'),'release return law missing');

console.log('OMNITOOLS WORKBENCH PASS · one source · five unequal axes · evidence-only return');
