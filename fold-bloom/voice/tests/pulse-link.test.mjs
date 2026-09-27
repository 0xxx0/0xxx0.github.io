import test from 'node:test';
import assert from 'node:assert/strict';
import {voiceLinkState,VOICE_PULSE_LINK_SCHEMA} from '../pulse-link.js';

const live={label:'LAB PULSE',clock:'SYNTH',bpm:96,beatIndex:7};

test('unlinked voice is FREE even when a live pulse exists',()=>{
  const s=voiceLinkState({linked:false,live});
  assert.equal(s.state,'FREE');
  assert.equal(s.display,'FREE');
  assert.equal(s.label,null);
});

test('linked voice with live pulse is LINKED and names source and BPM',()=>{
  const s=voiceLinkState({linked:true,live});
  assert.equal(s.state,'LINKED');
  assert.equal(s.display,'LINKED · LAB PULSE · 96 BPM');
  assert.equal(s.label,'LAB PULSE');
  assert.equal(s.clock,'SYNTH');
  assert.equal(s.bpm,96);
  assert.equal(s.beatIndex,7);
});

test('linked voice without a live pulse waits without claiming a source',()=>{
  const s=voiceLinkState({linked:true,live:null});
  assert.equal(s.state,'WAITING');
  assert.equal(s.display,'WAITING FOR PULSE');
  assert.equal(s.label,null);
  assert.equal(s.bpm,null);
});

test('disconnect returns LINKED to FREE regardless of the clock',()=>{
  const audio={label:'LISTEN',clock:'AUDIO',bpm:120.4,beatIndex:0};
  assert.equal(voiceLinkState({linked:true,live:audio}).state,'LINKED');
  assert.equal(voiceLinkState({linked:false,live:audio}).state,'FREE');
  assert.equal(voiceLinkState({linked:true,live:live}).bpm,96);
  assert.equal(voiceLinkState({linked:true,live:audio}).bpm,120);
});

test('schema constant is stable for receipts',()=>{
  assert.equal(VOICE_PULSE_LINK_SCHEMA,'fold-bloom/voice-pulse-link/v0.1');
});