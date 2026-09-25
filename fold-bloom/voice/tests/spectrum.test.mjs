import test from 'node:test';
import assert from 'node:assert/strict';
import {logSpectrumBands,spectrumFeatures,VOICE_SPECTRUM_SCHEMA} from '../spectrum.js';

function binsWithPeaks({sampleRate=48000,fftSize=2048,peaks=[]}={}){
  const bins=new Float32Array(fftSize/2).fill(-120);
  for(const [hz,db] of peaks){
    const i=Math.max(1,Math.min(bins.length-1,Math.round(hz*fftSize/sampleRate)));
    bins[i]=db;
  }
  return bins;
}

test('log spectrum compresses FFT bins into bounded display bands',()=>{
  const bins=binsWithPeaks({peaks:[[220,-26],[880,-38],[3200,-46]]});
  const out=logSpectrumBands(bins,48000,2048,{bands:36,minHz:80,maxHz:6000});
  assert.equal(out.length,36);
  assert.ok([...out].every(x=>x>=0&&x<=1));
  assert.ok(Math.max(...out)>.8);
});

test('spectrum features recover peak and bounded brightness without audio bytes',()=>{
  const bins=binsWithPeaks({peaks:[[440,-20],[1800,-35],[4200,-42]]});
  const f=spectrumFeatures(bins,48000,2048,{bands:32,minHz:80,maxHz:6000});
  assert.equal(f.schema,VOICE_SPECTRUM_SCHEMA);
  assert.ok(Math.abs(f.peakHz-445.3125)<30);
  assert.ok(f.centroidHz>400&&f.centroidHz<1800);
  assert.ok(f.brightness>=0&&f.brightness<=1);
  assert.ok(f.rolloffHz>=f.peakHz);
  assert.equal(f.bands.length,32);
});
