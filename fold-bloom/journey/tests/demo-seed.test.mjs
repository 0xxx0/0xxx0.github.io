import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {buildShareableSeedDemo,SHAREABLE_SEED_PACK_ID} from '../demo-seed.js';
import {assertExperienceSet} from '../../experience-set/experience-set.js';

const catalog=JSON.parse(await fs.readFile(new URL('../../test-packs/catalog.json',import.meta.url),'utf8'));

test('shareable seed demo is exact metadata-only projection of recovered three-track pack',()=>{
  const demo=buildShareableSeedDemo(catalog,{timestamp:'2026-09-22T00:00:00.000Z'});
  assert.equal(demo.packId,SHAREABLE_SEED_PACK_ID);
  assert.equal(demo.mediaBytesIncluded,false);
  assert.equal(demo.audioAuthority,'PRIVATE_LOCAL_ONLY');
  assert.deepEqual(demo.set.entries.map(x=>x.sourceId),[
    'sha256:06ca33eb185845330718d8c9428c29a3a3bcb6d94f64e18270e4adb7400757cc',
    'sha256:ac6c2c5fc654177da675b5d419a16b5430483371a524f5016ca45c7399905f04',
    'sha256:00f41b223138e760e64a08c882606d18f2fcaafcc2e75526396f2c8c4fdfc2bc'
  ]);
  assert.deepEqual(demo.set.entries.map(x=>x.transitionOut),['CARRY','DISSOLVE','RETURN']);
  assert.deepEqual(demo.bindings.map(x=>x.duration),[230.592,424.8,364.872]);
  assert.deepEqual(Object.values(demo.meta).map(x=>x.roleKey),['GHOST','FORGE','WILL']);
  assertExperienceSet(demo.set);
});

test('shareable seed demo never invents or embeds media payloads',()=>{
  const demo=buildShareableSeedDemo(catalog);
  const serialized=JSON.stringify(demo);
  assert.equal(/data:audio|blob:|base64/i.test(serialized),false);
  assert.equal('blob' in demo,false);
});
