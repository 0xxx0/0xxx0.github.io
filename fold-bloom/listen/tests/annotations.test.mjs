import test from 'node:test';
import assert from 'node:assert/strict';
import {annotationPacket,sourceKeyFromAnnotationPacket,marksFromAnnotationPacket,mergeAnnotationMarks,ANNOTATION_SCHEMA} from '../annotations.js';
import {makeStreamPin} from '../stream-lens.js';

const source={key:'abc123',name:'TEST',hash:'abc123',kind:'LOCAL_FILE'};
const bookmark=makeStreamPin({sourceKey:source.key,address:2.5,label:'DROP'});
const flag=makeStreamPin({sourceKey:source.key,address:4,kind:'FLAG',label:'CHECK'});
const arc=makeStreamPin({sourceKey:source.key,address:6,endAddress:11,kind:'ARC',label:'BUILD'});

test('annotation packet embeds source + map witness without source bytes',()=>{
  const packet=annotationPacket({source,marks:[bookmark,flag,arc],map:{duration:20,bpm:120,stage:'DEEP',beats:[0,1],phrases:[{t:0},{t:8},{t:20}],sections:[{t:0},{t:20}]},view:{time:7,scope:'PHRASE',start:4,end:12},createdAt:'2026-09-25T00:00:00Z'});
  assert.equal(packet.schema,ANNOTATION_SCHEMA);
  assert.equal(packet.source.key,source.key);
  assert.equal(packet.mapWitness.bpm,120);
  assert.equal(packet.mapWitness.phraseCount,2);
  assert.equal(packet.view.scope,'PHRASE');
  assert.equal(packet.marks[2].kind,'ARC');
  assert.equal(packet.marks[2].endAddress,11);
  assert.equal('bytes' in packet,false);
});

test('shared marks round-trip from annotation and AUDIO MAP wrappers',()=>{
  const packet=annotationPacket({source,marks:[bookmark,flag,arc]});
  assert.equal(sourceKeyFromAnnotationPacket(packet),source.key);
  assert.deepEqual(marksFromAnnotationPacket(packet).map(x=>x.kind),['BOOKMARK','FLAG','ARC']);
  const wrapped={kind:'FOLD_BLOOM_AUDIO_MAP',annotations:packet,addressedMessage:{source:{key:source.key},path:{cells:[]}}};
  assert.equal(sourceKeyFromAnnotationPacket(wrapped),source.key);
  assert.equal(marksFromAnnotationPacket(wrapped).length,3);
});

test('addressed-message cells import and merge by stable mark id',()=>{
  const packet={kind:'FOLD_BLOOM_ADDRESSED_MESSAGE',source:{key:source.key},path:{cells:[{...bookmark},{...arc}]}};
  const incoming=marksFromAnnotationPacket(packet);
  assert.equal(incoming.length,2);
  const edited={...bookmark,label:'DROP EDITED'};
  const merged=mergeAnnotationMarks([bookmark,flag],[edited,arc],source.key);
  assert.equal(merged.length,3);
  assert.equal(merged.find(x=>x.id===bookmark.id).label,'DROP EDITED');
  assert.equal(merged.find(x=>x.kind==='ARC').endAddress,11);
});
