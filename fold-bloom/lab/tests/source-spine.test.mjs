import test from 'node:test';
import assert from 'node:assert/strict';
import {demoWavBytes} from '../../listen/demo-tone.js';
import {monoPcm16Wav} from '../../listen/pcm-wav.js';
import {holdSource,returnToSource} from '../source-spine.js';
import {LiveTrack} from '../../live/track.js';
import {readFileSync} from 'node:fs';

test('PCM16 local demo produces bounded nonempty source-derived preview without WebAudio',()=>{
  const wav=demoWavBytes(),out=monoPcm16Wav(wav);
  assert.equal(wav.length,192044);assert.equal(out.duration,6);assert.equal(out.sampleRate,12000);
  assert.equal(out.pcm.length,72000);assert.ok(out.pcm.some(x=>Math.abs(x)>.05));
  const broken=wav.slice();broken[0]=0;assert.equal(monoPcm16Wav(broken),null);
  const trunc=wav.slice(0,100);assert.throws(()=>monoPcm16Wav(trunc),/TRUNCATED/);
});
test('continuity witnesses require exact identities and never infer authorship',()=>{
  const a='a'.repeat(64),b='b'.repeat(64);
  const held=holdSource({hash:a,time:2.4,duration:6,scope:'PHRASE',pins:[{id:'mark-1'}],releasesBefore:2});
  assert.equal(held.sourceAddress,2.4);
  const ok=returnToSource(held,{rideHash:a,currentSourceHash:a,releasesAfter:5});
  assert.equal(ok.ok,true);assert.equal(ok.releases,3);assert.equal(ok.time,2.4);
  assert.deepEqual(ok.pinIds,['mark-1']);
  assert.equal(returnToSource(held,{rideHash:b,currentSourceHash:a,releasesAfter:5}).ok,false);
  assert.equal(returnToSource(held,{rideHash:a,currentSourceHash:b,releasesAfter:5}).ok,false);
  assert.equal(holdSource({hash:'made-up'}).ok,false);
});
test('LIVE accepts exact WAV source and builds preview without an AudioContext',async()=>{
  const oldAC=globalThis.AudioContext,oldWorker=globalThis.Worker;
  delete globalThis.AudioContext;delete globalThis.Worker;
  try{
    const player={src:'',paused:true,currentTime:0,addEventListener(){},play:async()=>{},pause(){}};
    const t=new LiveTrack(player,{onState(){},onMap(){}});
    const f=new File([demoWavBytes()],'demo.wav',{type:'audio/wav'});
    const map=await t.load(f);
    assert.equal(map.stage,'PREVIEW');
    assert.equal(t.meta.duration,6);
    assert.match(t.meta.hash,/^[a-f0-9]{64}$/);
    assert.equal(t.map.source.hash,t.meta.hash);
    assert.ok(player.src.startsWith('blob:'));
    t.clearSource();
  }finally{
    if(oldAC===undefined)delete globalThis.AudioContext;else globalThis.AudioContext=oldAC;
    if(oldWorker===undefined)delete globalThis.Worker;else globalThis.Worker=oldWorker;
  }
});
test('native APIs are exact-addressed; LAB owns no duplicate engine',()=>{
  const portal=readFileSync(new URL('../media-portal.js',import.meta.url),'utf8');
  const live=readFileSync(new URL('../../live/app.js',import.meta.url),'utf8');
  assert.match(portal,/holdSource\(/);assert.match(portal,/returnToSource\(/);
  assert.match(portal,/native\.source\?\.seek/);assert.match(portal,/\[data-portal="seek"\]/);
  assert.match(live,/source:\{seek:\(time,hash\)/);
});
