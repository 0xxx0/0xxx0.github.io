import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateLocalTestPackCatalog,catalogSourceIndex,packProgress,bestPackProgress,buildPackPlan,normalizeSourceId} from '../test-pack-core.js';

const catalog=JSON.parse(fs.readFileSync(new URL('../catalog.json',import.meta.url),'utf8'));
const songIds=catalog.packs.find(x=>x.id==='work-trance-seed-2026-09-22').entries.map(x=>x.sourceId);
const longId=catalog.packs.find(x=>x.id==='aperiodic-longform-stress-2026-09-22').entries[0].sourceId;

test('catalog is closed, hash-addressed and byte-free',()=>{
  assert.doesNotThrow(()=>validateLocalTestPackCatalog(catalog));
  assert.equal(catalog.schema,'fold-bloom-local-test-packs/v0.1');
  assert.ok(catalog.packs.every(pack=>pack.entries.at(-1).transitionOut==='RETURN'));
  const text=JSON.stringify(catalog);
  assert.equal(/audioUrl|filePath|data:audio|rawBytes/i.test(text),false);
});

test('source index recognizes the uploaded exact hashes',()=>{
  const index=catalogSourceIndex(catalog);
  assert.equal(index.size,4);
  assert.equal(index.get(normalizeSourceId(songIds[0]))[0].title,'preforme');
  assert.equal(index.get(normalizeSourceId(longId))[0].packKind,'LONGFORM_STRESS');
});

test('three-song seed is recognized regardless of selection order',()=>{
  const progress=bestPackProgress(catalog,[songIds[2],songIds[0],songIds[1]]);
  assert.equal(progress.id,'work-trance-seed-2026-09-22');
  assert.equal(progress.complete,true);
  assert.equal(progress.matched,3);
});

test('pack plan restores seed order and keeps unrelated sources behind it',()=>{
  const extra='sha256:'+'f'.repeat(64);
  const plan=buildPackPlan(catalog,'work-trance-seed-2026-09-22',[songIds[2],extra,songIds[0],songIds[1]]);
  assert.equal(plan.complete,true);
  assert.deepEqual(plan.orderedSourceIds,[...songIds,extra]);
  assert.deepEqual(plan.entries.map(x=>x.transitionOut),['CARRY','DISSOLVE','RETURN']);
  assert.deepEqual(plan.entries.map(x=>x.weight),[.85,1.2,1]);
});

test('long-form source remains a separate stress pack',()=>{
  const progress=packProgress(catalog,[longId]);
  assert.equal(progress[0].id,'aperiodic-longform-stress-2026-09-22');
  assert.equal(progress[0].complete,true);
  assert.equal(progress.find(x=>x.id==='work-trance-seed-2026-09-22').complete,false);
});
