import test from 'node:test';
import assert from 'node:assert/strict';
import {SOURCE_BUNDLE_SCHEMA,sourceBundleFromMeta,sourceBundleSummary} from '../source-bundle.js';

test('source bundle keeps identity origin text and collection unequal',()=>{
  const b=sourceBundleFromMeta({
    hash:'abc',sourceFileName:'song.m4a',size:12,type:'audio/mp4',title:'Song',artist:'A',
    origin:{kind:'SUNO',address:'https://suno.com/song/x',id:'x',resolution:'META_ONLY'},
    collection:{kind:'SUNO_PLAYLIST',name:'Set',address:'https://suno.com/playlist/y',count:4},
    textEvidence:[{kind:'LYRICS',alignment:'TIMED_LRC',chars:22,cueCount:3}]
  });
  assert.equal(b.schema,SOURCE_BUNDLE_SCHEMA);
  assert.equal(b.exact.hash,'abc');
  assert.equal(b.origin.kind,'SUNO');
  assert.equal(b.text.alignment,'TIMED_LRC');
  assert.equal(b.collection.name,'Set');
  assert.equal(sourceBundleSummary(b),'HASH × SUNO × META × TIMED TEXT × SUNO_PLAYLIST');
});
