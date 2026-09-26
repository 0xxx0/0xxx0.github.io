import test from 'node:test';
import assert from 'node:assert/strict';
import {FIELD_DEMO_DURATION,FIELD_DEMO_SAMPLE_RATE,fieldDemoDescriptor,renderFieldDemoPcm} from '../demo-source.js';

function rms(a,start,end){let s=0,n=0;for(let i=start;i<end;i++){s+=a[i]*a[i];n++}return Math.sqrt(s/Math.max(1,n))}
test('generated FIELD audio demo is real bounded PCM, not a tiny placeholder',()=>{
  const d=fieldDemoDescriptor();
  assert.equal(d.duration,FIELD_DEMO_DURATION);
  assert.equal(d.sampleRate,FIELD_DEMO_SAMPLE_RATE);
  assert.equal(d.pcm.length,FIELD_DEMO_DURATION*FIELD_DEMO_SAMPLE_RATE);
  assert.ok(d.bytes.length>600000,'wav bytes '+d.bytes.length);
  assert.equal(String.fromCharCode(...d.bytes.slice(0,4)),'RIFF');
  assert.equal(String.fromCharCode(...d.bytes.slice(8,12)),'WAVE');
});
test('demo has section-scale dynamic variation for map/ride evidence',()=>{
  const pcm=renderFieldDemoPcm(),sr=FIELD_DEMO_SAMPLE_RATE;
  const q=[0,1,2,3].map(i=>rms(pcm,i*4*sr,(i+1)*4*sr));
  assert.ok(Math.max(...q)-Math.min(...q)>.025,'quarter RMS '+q.join(','));
  assert.ok(q[3]>q[0]*1.12,'drop/open section should materially exceed intro');
});
test('demo PCM stays finite and bounded',()=>{
  const pcm=renderFieldDemoPcm({duration:8,sampleRate:8000});
  for(let i=0;i<pcm.length;i+=97){assert.ok(Number.isFinite(pcm[i]));assert.ok(Math.abs(pcm[i])<=1)}
});
