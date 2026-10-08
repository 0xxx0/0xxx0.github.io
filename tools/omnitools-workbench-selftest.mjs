import fs from 'node:fs';
import assert from 'node:assert/strict';
const html=fs.readFileSync('foundry/omnitools/index.html','utf8'),app=fs.readFileSync('foundry/omnitools/instrument-app.mjs','utf8');
const instrument=JSON.parse(fs.readFileSync('foundry/omnitools/instrument.json','utf8'));
for(const id of ['sourceDock','sourceToggle','sourceText','sourceHash','benchPane','loadMode','trace','copyReturn'])assert.ok(html.includes('id="'+id+'"'),'missing '+id);
for(const mode of ['bench','scan','read','align','reshape'])assert.ok(html.includes('data-mode="'+mode+'"'),'missing '+mode);
assert.ok(html.includes('src="/forward-field-proof/triangle/bench/?embedded=1"'),'BENCH must use native host');
for(const route of ['./pii-lens.html','./text-lens.html','./re-reader.html','./reshaper.html'])assert.ok(html.includes('src="'+route+'?embedded=1"'),'specialist route missing '+route);
assert.ok(!/id="(?:benchIn|benchResults|minForm|minFunction|minFortitude)"/.test(html),'duplicate fixed bench UI remains');
assert.ok(!/parseAndEvaluate|evaluateBench|bench\.mjs/.test(app),'carrier owns a competing evaluator');
assert.ok(html.includes('OMNI / v3'),'visible version stale');
assert.ok(html.includes('src="./instrument-app.mjs"'),'module entry missing');
assert.ok(html.includes('SOURCE → AXIS → EFFECTOR → TRACE → RETURN'),'pipeline missing');
assert.ok(app.includes("const KEY='omnitools.work-object.v01'"),'session source key changed');
assert.ok(app.includes("event.origin!==ORIGIN||event.source!==panes.bench.contentWindow"),'bridge origin/source admission missing');
for(const type of ['load','ready','changed','loaded','error','return'])assert.ok(app.includes('decision-bench:'+type),'missing bridge '+type);
assert.ok(app.includes('Object.freeze({...o,sha256:await digest(o.text)})'),'projection snapshot must be immutable');
assert.ok(app.includes('record.source.text===o.text&&record.source.sha256===o.sha256'),'current source equality gate missing');
assert.ok(app.includes('matches(lastBench,o)')&&app.includes('matches(lastPreview,o)'),'carrier includes stale source evidence');
assert.ok(app.includes("schema:'omnitools-return/v0.2'")&&app.includes("authority:'EVIDENCE_ONLY'"),'RETURN boundary missing');
assert.ok(!/\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource/.test(html+app),'carrier contains source-upload network primitive');
assert.equal(instrument.bundle_version,'0.3');assert.equal(instrument.bench.native_route,'/forward-field-proof/triangle/bench/');
assert.equal(instrument.axes[0].owner,instrument.bench.native_route);assert.deepEqual(instrument.axes.map(x=>x.id),['bench','scan','read','align','reshape']);
assert.equal(instrument.return.authority,'EVIDENCE_ONLY');assert.equal(instrument.return.schema,'omnitools-return/v0.2');
assert.deepEqual(instrument.spine,['SOURCE','AXIS','EFFECTOR','TRACE','RETURN']);
// M3 · rack verbs are DATA rows (id, glyph, label, mode, hint): one registry,
// imported once by the host, rendered by the strip — no second table.
assert.ok(Array.isArray(instrument.rack)&&instrument.rack.length===5,'rack registry missing');
assert.deepEqual(instrument.rack.map(x=>x.id),instrument.axes.map(x=>x.id),'rack rows differ from the axes');
for(const row of instrument.rack)for(const key of ['id','glyph','label','mode','hint'])assert.ok(row[key],'rack row '+(row&&row.id)+' lacks '+key);
assert.ok(app.includes("from './instrument.json'")&&app.includes('INSTRUMENT.rack'),'rack registry is not imported from instrument.json');
assert.ok(!/data-verb="[a-z]+"/.test(html),'rack verb buttons are hardcoded instead of rendered');
// M4 · mode-scoped op strip: strip outside the header, one explicit reveal
// handle, rest visibility flips `hidden` in place (focus order never moves).
assert.ok(html.includes('id="rackStrip"')&&html.includes('id="rackVerbs"')&&html.includes('id="rackReveal"'),'op strip missing');
assert.ok(html.indexOf('</header>')<html.indexOf('id="rackStrip"')&&html.indexOf('id="rackStrip"')<html.indexOf('<main'),'rack strip is not its own row between header and workspace');
assert.ok(html.includes('aria-controls="rackVerbs"')&&html.includes('aria-label="Rack operations"'),'reveal handle or strip label missing');
assert.ok(app.includes('b.hidden=!(on||rackRevealed)'),'mode-scoped rest visibility missing');
// M8 · rack actions write receipts through the existing RETURN pattern only.
assert.ok(app.includes("addTrace('RACK'")&&app.includes("addTrace('REVEAL'"),'rack actions write no receipt line');
assert.ok(!/localStorage|indexedDB/.test(app),'rack introduced a new state authority');
console.log('OMNITOOLS WORKBENCH PASS · native Bench · one source · admitted snapshot bridge · matching evidence only · rack verbs as data rows · mode-scoped op strip');
