import test from 'node:test';
import assert from 'node:assert/strict';
import {ATLAS_SCHEMA,atlasPacket,appendPath,encodeAtlas,decodeAtlas,syntheticAtlas} from './atlas-core.js';

test('atlas path is authored, ordered and unique',()=>{const p=syntheticAtlas();const a=p.entries[0].id,b=p.entries[1].id;assert.deepEqual(appendPath([a],b,p.entries),[a,b]);assert.deepEqual(appendPath([a,b],a,p.entries),[b])});
test('share packet round trips exact source hashes and path',()=>{const p=syntheticAtlas(),q=decodeAtlas(encodeAtlas(p));assert.equal(q.schema,ATLAS_SCHEMA);assert.deepEqual(q.path,p.path);assert.equal(q.entries[3].sourceHash,p.entries[3].sourceHash)});
test('synthetic atlas is explicitly non-source demo evidence',()=>{const p=syntheticAtlas();assert.ok(p.entries.every(x=>x.sourceKind==='SYNTHETIC_DEMO'));assert.equal(p.entries.length,6)});
