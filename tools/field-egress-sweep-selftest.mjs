import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'field-egress-sweep-'));
fs.writeFileSync(path.join(dir,'a.json'),JSON.stringify({
  packet_id:'gate-a',
  WAITING:{exists:true,external:true,dependency_kind:'REAL_DEVICE'},
  NEXT:'continue'
}));
fs.writeFileSync(path.join(dir,'b.json'),JSON.stringify([
  {packet_id:'delta-b',DELTA:{material:true},EVIDENCE:{sufficient:true}},
  {packet_id:'next-c',NEXT:{exists:true,executable:true,action:'continue'}}
]));

const run=spawnSync(process.execPath,['scripts/reduce-field-egress.mjs','--json',dir],{encoding:'utf8'});
assert.equal(run.status,0,run.stderr);
const out=JSON.parse(run.stdout);
assert.equal(out.schema,'field-egress-sweep/v0.1');
assert.equal(out.file_count,2);
assert.equal(out.packet_count,3);
assert.equal(out.counts.GATE,1);
assert.equal(out.counts.DELTA,1);
assert.equal(out.counts.NEXT,1);

const selected=spawnSync(process.execPath,['scripts/reduce-field-egress.mjs','--json','--selected','next-c','--selected','delta-b',dir],{encoding:'utf8'});
assert.equal(selected.status,0,selected.stderr);
const sel=JSON.parse(selected.stdout);
assert.equal(sel.items.find(x=>x.packet_id==='next-c').class,'NOW');
assert.equal(sel.items.find(x=>x.packet_id==='delta-b').class,'NOW');

// Empirical repository smoke: the actual packet shelf may mix JSON with other
// source material, but a no-context sweep must remain readable and can never
// manufacture NOW from packet contents alone.
const actual=spawnSync(process.execPath,['scripts/reduce-field-egress.mjs','--json','control/packets'],{encoding:'utf8'});
assert.equal(actual.status,0,actual.stderr);
const live=JSON.parse(actual.stdout);
assert.ok(live.file_count>=1,'actual packet shelf must expose at least one JSON file');
assert.ok(live.packet_count>=1,'actual packet shelf must expose at least one packet');
assert.equal(live.items.length,live.packet_count);
assert.ok(live.items.every(x=>['NOW','DELTA','RESIDUE','GATE','NEXT','ARCHIVE'].includes(x.class)));
assert.equal(live.counts.NOW,0,'packet shelf cannot self-authorize NOW without caller context');

fs.rmSync(dir,{recursive:true,force:true});
console.log('FIELD egress sweep PASS · fixture + actual packet shelf + zero self-authorized NOW');
