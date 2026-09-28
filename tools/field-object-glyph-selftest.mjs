#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
globalThis.window=globalThis;
globalThis.InterphaseGlyph=require('../lib/interphase-glyph.js');
await import('../field-glyph.js');

const route={
  href:'/fold-bloom/',title:'FOLD BLOOM',kind:'system',state:'ACTIVE',
  operation:'TRANSFORM',parent:'/',role:'convergent instrument'
};
const model=globalThis.FieldGlyph.instrumentModel(route,{
  chain:[{id:'/',label:'FIELD'},{id:'/fold-bloom/',label:'FOLD BLOOM'}],
  children:['/fold-bloom/live/','/fold-bloom/lab/'],
  operations:[{id:'READ',authority:'VIEW'},{id:'OPEN',authority:'EFFECT'}],
  residue:['content','depth','authority','evidence'],
  now:true,head:true
});
assert.ok(model,'held instrument model missing');
assert.equal(model.model.id,'/fold-bloom/');
assert.equal(model.model.depth.count,2,'lineage should become depth rings');
assert.equal(model.residue.length,4,'hidden channels must remain named as residue');
const svg=globalThis.FieldGlyph.instrumentSvg(route,{
  size:96,
  chain:[{id:'/',label:'FIELD'},{id:'/fold-bloom/',label:'FOLD BLOOM'}],
  children:['/fold-bloom/live/'],
  residue:['content','depth','authority','evidence']
});
assert.match(svg,/data-interphase-glyph="interphase-glyph\/v0\.1"/);
assert.match(svg,/class="residue"/,'recoverable hidden detail must remain visible as residue');
assert.match(svg,/class="op /,'operation ring missing');
assert.match(svg,/class="channel /,'channel ring missing');

const html=fs.readFileSync('index.html','utf8');
const ring=html.indexOf('./lib/interphase-ring.js');
const glyph=html.indexOf('./lib/interphase-glyph.js');
const field=html.indexOf('./field-glyph.js');
assert.ok(ring>=0&&glyph>ring&&field>glyph,'INTERPHASE glyph donors must load before FIELD glyph');
assert.match(html,/class="aperture fieldSignalBar" id="aperture" data-field-signal="CLEAR"/,'semantic signal must live on the held object surface');
assert.match(html,/FieldSignal\?\.apply\(\$\('aperture'\),signal\)/,'attention signal not projected onto held object');
assert.match(html,/function heldGlyph\(r\)/,'held glyph compositor missing');
assert.match(html,/instrumentSvg\?\.\(r,/,'held object does not use recursive glyph');
assert.doesNotMatch(html,/id="scaleRail"/,'exposed scale rail regressed');
assert.match(html,/dashed = residue/,'collapsed key does not explain residue witness');

console.log('FIELD OBJECT GLYPH PASS · compact mark → recursive held witness · hidden channels remain residue');
