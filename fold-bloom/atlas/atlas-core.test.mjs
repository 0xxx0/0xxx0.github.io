import test from 'node:test';
import assert from 'node:assert/strict';
import {ATLAS_SCHEMA,atlasPacket,appendPath,encodeAtlas,decodeAtlas,syntheticAtlas} from './atlas-core.js';

test('atlas path is authored, ordered and unique',()=>{const p=syntheticAtlas();const a=p.entries[0].id,b=p.entries[1].id;assert.deepEqual(appendPath([a],b,p.entries),[a,b]);assert.deepEqual(appendPath([a,b],a,p.entries),[b])});
test('share packet round trips exact source hashes and path',()=>{const p=syntheticAtlas(),q=decodeAtlas(encodeAtlas(p));assert.equal(q.schema,ATLAS_SCHEMA);assert.deepEqual(q.path,p.path);assert.equal(q.entries[3].sourceHash,p.entries[3].sourceHash)});
test('synthetic atlas is explicitly non-source demo evidence',()=>{const p=syntheticAtlas();assert.ok(p.entries.every(x=>x.sourceKind==='SYNTHETIC_DEMO'));assert.equal(p.entries.length,6)});

test('atlas share preserves bounded inspectable source facets without audio bytes',()=>{
  const p=atlasPacket({entries:[{id:'h',name:'Track',sourceHash:'h',sourceKind:'LOCAL_FILE',format:'audio/mp4',album:'A',origin:{kind:'SUNO',address:'https://suno.com/song/x',id:'x'},collection:{kind:'PLAYLIST',name:'Set',count:3},textWitness:{kind:'TRANSCRIPT',alignment:'TIMED_VTT',chars:99,cues:4},glyph:{sourceHash:'h',seed:1,sectionCount:2,means:{energy:.2,flux:.1,brightness:.3},radial:[.2],chroma:[.1]}}]});
  const q=decodeAtlas(encodeAtlas(p)),x=q.entries[0];
  assert.equal(x.origin.kind,'SUNO');assert.equal(x.collection.name,'Set');assert.equal(x.textWitness.cues,4);assert.equal(x.format,'audio/mp4');assert.equal('audio' in x,false);
});
