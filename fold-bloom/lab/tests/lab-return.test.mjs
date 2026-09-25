import test from 'node:test';
import assert from 'node:assert/strict';
import {appendLabTrace,compileLabReturn,LAB_RETURN_SCHEMA} from '../lab-return.js';

test('lab trace is bounded and deduplicates identical state',()=>{
  let trace=[];
  trace=appendLabTrace(trace,{kind:'MODE',mode:'READ',profile:'CLEAR',address:'text://4:9',source:'TEXT / LOCAL',atMs:10},3);
  trace=appendLabTrace(trace,{kind:'MODE',mode:'READ',profile:'CLEAR',address:'text://4:9',source:'TEXT / LOCAL',atMs:20},3);
  assert.equal(trace.length,1);
  trace=appendLabTrace(trace,{kind:'PROFILE',mode:'READ',profile:'DRIVE',address:'text://4:9',source:'TEXT / LOCAL',atMs:30},3);
  trace=appendLabTrace(trace,{kind:'MODE',mode:'LOCI',profile:'DRIVE',address:'text://20:40',source:'TEXT COURSE / WORDS',atMs:40},3);
  trace=appendLabTrace(trace,{kind:'MODE',mode:'VERSE',profile:'DRIVE',address:'text://41:56',source:'TEXT / VERSE',atMs:50},3);
  assert.equal(trace.length,3);
  assert.deepEqual(trace.map(x=>x.mode),['READ','LOCI','VERSE']);
});

test('field lab return preserves bounded route evidence without source bytes',()=>{
  const packet=compileLabReturn({
    startedAt:1000,endedAt:5000,mode:'VERSE',profile:'TRANCE',address:'text://41:56',source:'TEXT / VERSE',
    trace:[
      {kind:'MODE',mode:'READ',profile:'CLEAR',address:'text://4:9',source:'TEXT / LOCAL',atMs:10},
      {kind:'MODE',mode:'VERSE',profile:'TRANCE',address:'text://41:56',source:'TEXT / VERSE',atMs:4000}
    ],
    projection:{sourceKey:'text:deadbeef',focus:'text://41:56',marks:2}
  });
  assert.equal(packet.schema,LAB_RETURN_SCHEMA);
  assert.equal(packet.authority,'EVIDENCE_ONLY');
  assert.equal(packet.session.durationMs,4000);
  assert.deepEqual(packet.evidence.modes,['READ','VERSE']);
  assert.equal(packet.final.address,'text://41:56');
  assert.equal(packet.projection.sourceKey,'text:deadbeef');
  assert.equal(JSON.stringify(packet).includes('the full source text should never be here'),false);
});
