import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeLocalMediaId,localMediaFile,LOCAL_MEDIA_SCHEMA} from '../local-media-store.js';

test('local media identity normalizes exact SHA-256 refs',()=>{
  const raw='A'.repeat(64);
  assert.equal(normalizeLocalMediaId(raw),'sha256:'+raw.toLowerCase());
  assert.equal(normalizeLocalMediaId('sha256:'+raw),'sha256:'+raw.toLowerCase());
  assert.throws(()=>normalizeLocalMediaId('sha256:abc'),/64 hex/);
});

test('local media file reconstruction preserves name, type and bytes',async()=>{
  const blob=new Blob(['abc'],{type:'audio/mpeg'}),record={schema:LOCAL_MEDIA_SCHEMA,sourceId:'sha256:'+'a'.repeat(64),blob,name:'proof.mp3',type:'audio/mpeg',lastModified:7};
  const file=localMediaFile(record);
  assert.equal(file.name,'proof.mp3');
  assert.equal(file.type,'audio/mpeg');
  assert.equal(await file.text(),'abc');
});
