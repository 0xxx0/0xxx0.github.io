import test from 'node:test';
import assert from 'node:assert/strict';
import {buildBeatSaberPack,buildBeatSaberFiles,classifyBeatSaberAudio,cleanBeatSaberChart,crc32,BEAT_SABER_PACK_SCHEMA} from '../beatsaber-pack.js';

const chart={
  version:'4.0.0',
  colorNotes:[{b:1,r:0,i:0}],
  colorNotesData:[{x:1,y:1,c:0,d:1,a:0}],
  bombNotes:[],bombNotesData:[],obstacles:[],obstaclesData:[],
  arcs:[],arcsData:[],chains:[],chainsData:[],spawnRotations:[],spawnRotationsData:[],
  _foldBloom:{schema:'draft'}
};
const map={duration:8,bpm:120};
const source=new Uint8Array([1,2,3,4,5,6,7,8]);

function namesFromStoreZip(bytes){
  const out=[];let p=0,d=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),td=new TextDecoder();
  while(p+30<=bytes.length&&d.getUint32(p,true)===0x04034b50){
    const size=d.getUint32(p+18,true),nameLen=d.getUint16(p+26,true),extra=d.getUint16(p+28,true);
    const nameStart=p+30,nameEnd=nameStart+nameLen;
    out.push(td.decode(bytes.slice(nameStart,nameEnd)));
    p=nameEnd+extra+size;
  }
  return out;
}

test('audio classification is explicit about OGG readiness',()=>{
  assert.equal(classifyBeatSaberAudio({name:'song.ogg'}).status,'PLAYTEST_READY');
  assert.equal(classifyBeatSaberAudio({name:'song.mp3'}).status,'NEEDS_OGG_CONVERSION');
});

test('game-facing chart drops FOLD BLOOM private metadata',()=>{
  const out=cleanBeatSaberChart(chart);
  assert.equal(out._foldBloom,undefined);
  assert.ok(Array.isArray(out.colorNotes));
  assert.ok(Array.isArray(out.bombNotes));
  assert.ok(Array.isArray(out.obstacles));
});

test('OGG source builds a v4 playtest-ready mapper pack',()=>{
  const built=buildBeatSaberFiles({chart,map,fileMeta:{name:'Test.ogg',type:'audio/ogg',artist:'Tester',hash:'abc',sourceSampleRate:48000},sourceBytes:source});
  assert.equal(built.manifest.schema,BEAT_SABER_PACK_SCHEMA);
  assert.equal(built.manifest.status,'PLAYTEST_READY');
  const byName=Object.fromEntries(built.files.map(x=>[x.name,x.data]));
  const td=new TextDecoder();
  const info=JSON.parse(td.decode(byName['Info.dat']));
  const audio=JSON.parse(td.decode(byName['AudioData.dat']));
  const beatmap=JSON.parse(td.decode(byName['ExpertPlusStandard.dat']));
  assert.equal(info.audio.songFilename,'song.ogg');
  assert.equal(info.audio.audioDataFilename,'AudioData.dat');
  assert.equal(info.difficultyBeatmaps[0].beatmapDataFilename,'ExpertPlusStandard.dat');
  assert.equal(info.difficultyBeatmaps[0].lightshowDataFilename,'Lightshow.dat');
  assert.equal(audio.songFrequency,48000);
  assert.equal(beatmap._foldBloom,undefined);
  assert.deepEqual([...byName['song.ogg']], [...source]);
});

test('MP3 source is preserved but bundle refuses playtest-ready claim',()=>{
  const built=buildBeatSaberFiles({chart,map,fileMeta:{name:'Test.mp3',type:'audio/mpeg'},sourceBytes:source});
  const byName=Object.fromEntries(built.files.map(x=>[x.name,x.data]));
  const info=JSON.parse(new TextDecoder().decode(byName['Info.dat']));
  assert.equal(built.manifest.status,'NEEDS_OGG_CONVERSION');
  assert.equal(info.audio.songFilename,'song.ogg');
  assert.ok(byName['SOURCE.mp3']);
  assert.equal(byName['song.ogg'],undefined);
});

test('pack is deterministic store-zip with all root files',()=>{
  const a=buildBeatSaberPack({chart,map,fileMeta:{name:'Test.ogg',type:'audio/ogg'},sourceBytes:source});
  const b=buildBeatSaberPack({chart,map,fileMeta:{name:'Test.ogg',type:'audio/ogg'},sourceBytes:source});
  assert.deepEqual([...a.bytes],[...b.bytes]);
  assert.equal(new DataView(a.bytes.buffer,a.bytes.byteOffset,a.bytes.byteLength).getUint32(0,true),0x04034b50);
  assert.deepEqual(namesFromStoreZip(a.bytes),[
    'Info.dat','AudioData.dat','ExpertPlusStandard.dat','Lightshow.dat','FOLD_BLOOM_MANIFEST.json','README.txt','song.ogg'
  ]);
  assert.equal(crc32(new TextEncoder().encode('123456789')),0xcbf43926);
});
