import test from 'node:test';
import assert from 'node:assert/strict';
import {demoWavBytes} from '../demo-tone.js';
import {decodePcmWavPreview} from '../pcm-wav-preview.js';
import {audioGlyphDescriptor} from '../audio-glyph.js';
import {readFileSync} from 'node:fs';
test('real local 6-second WAV maps offline with source sample rate and nonempty measured energy',()=>{
  const wav=demoWavBytes(),out=decodePcmWavPreview(wav.buffer);
  assert.ok(out);assert.equal(out.duration,6);assert.equal(out.sourceSampleRate,16000);
  assert.equal(out.sampleRate,12000);assert.equal(out.pcm.length,72000);
  assert.ok(out.pcm.slice(1200,4000).some(x=>Math.abs(x)>.08));
});
test('malformed and unsupported streams are rejected, not silently guessed',()=>{
  const wav=demoWavBytes();
  assert.equal(decodePcmWavPreview(new ArrayBuffer(10)),null);
  const bad=wav.slice();new DataView(bad.buffer).setUint16(20,3,true);
  assert.equal(decodePcmWavPreview(bad.buffer),null);
  const truncated=wav.slice(0,200);
  assert.equal(decodePcmWavPreview(truncated.buffer),null);
});
test('unmeasured source glyph has no fabricated energy or tonal chroma',()=>{
  const hash='a'.repeat(64),d=audioGlyphDescriptor({stage:'AUDIO_ONLY',frames:[],sections:[{t:0},{t:6}]},{hash});
  assert.equal(d.sourceHash,hash);assert.deepEqual(d.chroma,Array(12).fill(0));
  assert.equal(d.means.energy,0);assert.equal(d.means.flux,0);
  const preview=audioGlyphDescriptor({stage:'PREVIEW',frames:[{e:.7,f:.4,c:.3}],sections:[{t:0},{t:2}]},{hash});
  assert.deepEqual(preview.chroma,Array(12).fill(0));
});
test('LISTEN worker progress does not swallow result and loading flag is guarded',()=>{
  const src=readFileSync(new URL('../app.js',import.meta.url),'utf8');
  assert.match(src,/if\(e\.data\.type==='progress'\)/);
  assert.doesNotMatch(src,/if\(e\.data\.type='progress'\)/);
  assert.match(src,/sourceLoading=false/);
  assert.match(src,/decodePcmWavPreview/);
});
