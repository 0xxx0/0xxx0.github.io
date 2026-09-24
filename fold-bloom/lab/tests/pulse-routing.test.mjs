import test from 'node:test';
import assert from 'node:assert/strict';
import {transportDescriptor,pulseAge,FIELD_PULSE_TRANSPORT_SOURCES} from '../../../lib/field-pulse.js';

const msg=(source,data={})=>({kind:'transport',source,wall:1000,data:{bpm:96,playing:true,beatPhase:.25,quantum:4,...data}});

test('LISTEN and FIELD LAB are explicit lawful transport clocks',()=>{
  const listen=transportDescriptor(msg('FOLD_BLOOM_LISTEN'));
  const lab=transportDescriptor(msg('FOLD_BLOOM_FIELD_LAB'));
  assert.equal(listen.label,'LISTEN');
  assert.equal(listen.clock,'AUDIO');
  assert.equal(lab.label,'LAB PULSE');
  assert.equal(lab.clock,'SYNTH');
  assert.equal(lab.quantum,4);
  assert.deepEqual(Object.keys(FIELD_PULSE_TRANSPORT_SOURCES).sort(),['FOLD_BLOOM_FIELD_LAB','FOLD_BLOOM_LISTEN']);
});

test('unknown, non-transport and clockless envelopes do not become clocks',()=>{
  assert.equal(transportDescriptor(msg('OTHER')),null);
  assert.equal(transportDescriptor({kind:'focus',source:'FOLD_BLOOM_LISTEN',data:{bpm:96}}),null);
  assert.equal(transportDescriptor(msg('FOLD_BLOOM_LISTEN',{bpm:0})),null);
});

test('freshness uses envelope wall time rather than source authority',()=>{
  assert.equal(pulseAge(msg('FOLD_BLOOM_LISTEN'),1600),600);
  assert.equal(pulseAge({},1600),Infinity);
});
