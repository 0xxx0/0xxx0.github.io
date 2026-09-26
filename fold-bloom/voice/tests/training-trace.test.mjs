import test from 'node:test';
import assert from 'node:assert/strict';
import {appendVoiceTrace,centsError,logFrequencyY,signedBeatOffsetMs,summarizeVoiceTrace,VOICE_TRACE_SCHEMA} from '../training-trace.js';

test('log-frequency witness aligns low and high frequencies',()=>{
  assert.equal(logFrequencyY(70,{minHz:70,maxHz:6000,height:100}),100);
  assert.equal(logFrequencyY(6000,{minHz:70,maxHz:6000,height:100}),0);
  const a=logFrequencyY(220,{minHz:70,maxHz:6000,height:100}),b=logFrequencyY(440,{minHz:70,maxHz:6000,height:100});
  assert.ok(b<a);
});

test('beat onset error preserves early/late sign around nearest beat',()=>{
  assert.equal(signedBeatOffsetMs(.1,120),50);
  assert.equal(signedBeatOffsetMs(.9,120),-50);
  assert.equal(signedBeatOffsetMs(.5,120),250);
});

test('voice trace preserves bounded target-relative evidence',()=>{
  let trace=[];const target=440;
  trace=appendVoiceTrace(trace,{atMs:0,heardHz:440,targetHz:target,clarity:.9,beatIndex:0,beatPhase:.02,bpm:120,onset:true},3);
  trace=appendVoiceTrace(trace,{atMs:70,heardHz:442,targetHz:target,clarity:.8,beatIndex:0,beatPhase:.16,bpm:120},3);
  trace=appendVoiceTrace(trace,{atMs:140,heardHz:0,targetHz:target,clarity:0,beatIndex:0,beatPhase:.3,bpm:120},3);
  trace=appendVoiceTrace(trace,{atMs:210,heardHz:438,targetHz:target,clarity:.86,beatIndex:0,beatPhase:.44,bpm:120,onset:true},3);
  assert.equal(trace.length,3);
  const summary=summarizeVoiceTrace(trace);
  assert.equal(summary.schema,VOICE_TRACE_SCHEMA);
  assert.equal(summary.voicedFrames,2);
  assert.equal(summary.onsetCount,1);
  assert.ok(Math.abs(centsError(442,440))<15);
  assert.ok(summary.centeredFrames>=1);
});
