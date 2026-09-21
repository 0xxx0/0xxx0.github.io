// Validate public exact-source identity and the bounded media catalogue, without private files.
import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const base='recovery/sleeper/site-source-2026-09-18';
const manifest=JSON.parse(fs.readFileSync(`${base}/manifest.json`));
for(const f of manifest.files){
  assert.ok(!f.path.includes('..'),'unsafe path');
  const bytes=fs.readFileSync('.'+f.path);
  assert.equal(bytes.length,f.bytes,f.path);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),f.sha256,f.path);
}
const catalog=JSON.parse(fs.readFileSync('recovery/media/sleeper-atlas/catalog.json'));
assert.equal(catalog.items.length,13);
assert.equal(new Set(catalog.items.map(x=>x.id)).size,catalog.items.length);
assert.equal(new Set(catalog.items.map(x=>x.sha256)).size,catalog.items.length);
for(const item of catalog.items){
  assert.ok(manifest.files.some(f=>f.path===item.path&&f.sha256===item.sha256));
  assert.equal(item.created_at,null,'do not invent image creation dates');
  assert.ok(item.id.startsWith('sleeper-art:'));
}
const html=fs.readFileSync('recovery/media/sleeper-atlas/index.html','utf8');
assert.equal((html.match(/data-pick=/g)||[]).length,catalog.items.length);
new vm.Script(fs.readFileSync('recovery/media/sleeper-atlas/story.js','utf8'));
assert.equal(catalog.atlas_dayline.adapter,'NOT_IMPLEMENTED');
console.log(`BACKUP RECOVERY PASS: ${manifest.files.length} exact hashes, ${catalog.items.length} distinct media identities, story script syntax.`);
