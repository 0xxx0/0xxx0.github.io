import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const ROOT=process.cwd();
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const page=read('artifacts/interface-genome-01.html');
const index=read('artifacts/index.html');
const catalog=JSON.parse(read('artifacts/catalog.json'));

assert.match(page,/PROJECTION BENCH 0\.2/);
assert.match(page,/\/control\/CURRENT\.json/);
assert.match(page,/\/showcase-manifest\.json/);
assert.match(page,/field-projection-bench-evidence\/v0\.2/);
assert.match(page,/No synthetic fallback is provided/);

for(const token of ['const FIXTURES=','Math.random','BREED 3 DESCENDANTS','SUGGEST FROM TRACE','Maker run','Research return','Home task']){
  assert.equal(page.includes(token),false,'synthetic interface-genome residue: '+token);
}

assert.equal(catalog.schema,'field-artifact-catalog/v0.2');
assert.equal(catalog.policy.unknown_rule,'Unknown stays unknown; no synthetic fallback or narrative completion.');
assert.equal(catalog.entries.length,catalog.count.entries);
assert.equal(catalog.entries.some(x=>x.label==='INTERFACE GENOME 0.1'),false);
const bench=catalog.entries.find(x=>x.label==='PROJECTION BENCH 0.2');
assert.ok(bench,'projection bench catalog entry required');
assert.equal(bench.location,'/artifacts/interface-genome-01.html');
assert.equal(bench.basis,'ROUTE');
for(const e of catalog.entries){
  assert.ok(['ROUTE','LIBRARY_INDEX','RETAINED_NAME','QUARANTINE'].includes(e.basis),'invalid basis '+e.basis);
  if(e.basis!=='ROUTE')assert.equal(e.location,null,'non-route entry may not imply a public location: '+e.label);
}

assert.match(index,/fetch\('\.\/catalog\.json'/);
assert.match(index,/NO EVIDENCE → NO CLAIM/);
assert.match(index,/former “INTERFACE GENOME 0\.1” synthetic breeding demo has been replaced/);

console.log('ARTIFACTS GROUNDING PASS · real FIELD source only · deterministic projections · measured clicks · no synthetic breeding/advice');
