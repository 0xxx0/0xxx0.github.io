import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {harmonicEvidence} from '../harmonic-evidence.js';

test('unmeasured, preview and audio-only sources cannot claim notes or chords',()=>{
  for(const stage of ['PREVIEW','AUDIO_ONLY']){
    const out=harmonicEvidence({stage,key:{label:'C major',confidence:.9,chroma:Array(12).fill(1)}});
    assert.equal(out.kind,'UNMEASURED');assert.equal(out.top.length,0);
  }
  assert.equal(harmonicEvidence({stage:'DEEP',key:{chroma:[]}}).kind,'UNMEASURED');
});
test('deep chroma only reports weighted pitch classes and a qualified estimate',()=>{
  const chroma=Array(12).fill(0);chroma[0]=8;chroma[7]=5;chroma[4]=3;
  const out=harmonicEvidence({stage:'DEEP',key:{label:'C major',confidence:.42,chroma}});
  assert.equal(out.kind,'ESTIMATED');assert.equal(out.confidence,.42);
  assert.deepEqual(out.top.map(x=>x.pitch),['C','G','E']);
  assert.equal(out.top[0].weight,.5);
  assert.match(out.law,/no chord or melody/i);
});
test('FIELD LAB reuses native hosts; no extra engine or source store',()=>{
  const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
  const portal=readFileSync(new URL('../media-portal.js',import.meta.url),'utf8');
  const listen=readFileSync(new URL('../../listen/app.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/id="enterRide">PLAY RIDE HERE/);
  assert.match(html,/id="enterListen">LISTEN \/ GLYPH/);
  assert.match(app,/mountMediaPortal/);
  assert.match(portal,/\?demo=1/);
  assert.match(portal,/native\.release\?\.\(\)/);
  assert.match(portal,/native\.loadFiles\(\[file\]/);
  assert.match(portal,/actual!==expected/);
  assert.match(portal,/audioGlyphRepresentation/);
  assert.ok(listen.includes('sourceFile:()=>sourceBlob&&fileMeta?.hash'));
});
