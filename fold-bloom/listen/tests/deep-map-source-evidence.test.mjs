import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {demoWavBytes} from '../demo-tone.js';
import {monoPcm16Wav} from '../pcm-wav.js';
import {audioGlyphDescriptor} from '../audio-glyph.js';
const source=readFileSync(new URL('../app.js',import.meta.url),'utf8');
test('regression: LISTEN worker progress must never swallow DEEP result',()=>{
  assert.ok(source.includes("if(e.data.type==='progress')"));
  assert.ok(!source.includes("if(e.data.type='progress')"));
  assert.ok(source.includes('sourceLoading'));
  assert.ok(source.includes('monoPcm16Wav(bytes)'));
});
test('offline specimen is map-able without WebAudio; source and resampled rates differ',()=>{
  const d=monoPcm16Wav(demoWavBytes());
  assert.equal(d.duration,6);
  assert.equal(d.sampleRate,12000);
  assert.equal(d.sourceSampleRate,16000);
  assert.ok(d.pcm.some(x=>Math.abs(x)>.05));
});
test('no invented waveform and no synthetic tonal spokes without actual chroma',()=>{
  const hash='a'.repeat(64);
  const raw=audioGlyphDescriptor({stage:'AUDIO_ONLY',frames:[],sections:[{t:0},{t:6}]},{hash});
  assert.deepEqual(raw.chroma,Array(12).fill(0));
  assert.equal(raw.means.energy,0);
  const preview=audioGlyphDescriptor({stage:'PREVIEW',frames:[{e:.5,c:.4,l:.8,m:.4,h:.2}]},{hash});
  assert.deepEqual(preview.chroma,Array(12).fill(0));
  const deep=audioGlyphDescriptor({stage:'DEEP',key:{chroma:[1,...Array(11).fill(0)]}}, {hash});
  assert.equal(deep.chroma[0],1);
});
