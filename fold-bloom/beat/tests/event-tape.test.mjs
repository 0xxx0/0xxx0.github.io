import test from 'node:test';
import assert from 'node:assert/strict';
import {compileEventTape,toBeatSaberV4Draft,EVENT_TAPE_SCHEMA} from '../event-tape.js';

const map={
  duration:8,bpm:120,frameRate:2,
  beats:[0,0.5,1,1.5,2],
  phrases:[{t:0},{t:4},{t:8}],
  sections:[{t:0},{t:8}],
  frames:[
    {energy:.1,flux:.2},{energy:.2,flux:.1},{energy:.4,flux:.6},{energy:.8,flux:.9},
    {energy:.3,flux:.2},{energy:.1,flux:.1},{energy:.2,flux:.2},{energy:.4,flux:.3},
    {energy:.5,flux:.4},{energy:.6,flux:.5},{energy:.7,flux:.6},{energy:.5,flux:.3},
    {energy:.3,flux:.2},{energy:.2,flux:.1},{energy:.1,flux:.1},{energy:.1,flux:.1}
  ]
};

test('event tape preserves measured and authored classes',()=>{
  const tape=compileEventTape(map,{sourceId:'sha256:test',operations:[{t:1.25,op:'BLOOM'}]});
  assert.equal(tape.schema,EVENT_TAPE_SCHEMA);
  assert.equal(tape.sourceId,'sha256:test');
  assert.ok(tape.events.some(x=>x.kind==='BEAT'));
  assert.ok(tape.events.some(x=>x.kind==='PHRASE'));
  assert.ok(tape.events.some(x=>x.kind==='SECTION'));
  assert.ok(tape.events.some(x=>x.kind==='OPERATION'&&x.op==='BLOOM'&&x.authored));
  assert.deepEqual(tape.authority.authored,['OPERATION']);
});

test('Beat Saber v4 draft has required interactable collections',()=>{
  const tape=compileEventTape(map,{operations:[{t:1.25,op:'FOLD'},{t:2.25,op:'RETURN'}]});
  const out=toBeatSaberV4Draft(tape);
  assert.equal(out.version,'4.0.0');
  assert.ok(out.colorNotes.length>0);
  assert.equal(out.colorNotes.length,out.colorNotesData.length);
  assert.deepEqual(out.bombNotes,[]);
  assert.deepEqual(out.obstacles,[]);
  for(const note of out.colorNotes)assert.ok(Number.isFinite(note.b)&&Number.isInteger(note.i));
  for(const d of out.colorNotesData){
    assert.ok(d.x>=0&&d.x<=3);
    assert.ok(d.y>=0&&d.y<=2);
    assert.ok(d.c===0||d.c===1);
    assert.ok(d.d>=0&&d.d<=8);
  }
});

test('export is deterministic',()=>{
  const a=JSON.stringify(toBeatSaberV4Draft(compileEventTape(map)));
  const b=JSON.stringify(toBeatSaberV4Draft(compileEventTape(map)));
  assert.equal(a,b);
});
