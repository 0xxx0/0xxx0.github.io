import test from 'node:test';
import assert from 'node:assert/strict';
import {scoreFromReplayHandoff} from '../handoff-score.js';

test('replay handoff adapter preserves text address and nearest authored mark',()=>{
  const packet={
    source:{id:'text-local:20:abcd',key:'text-local:20:abcd',name:'VERSE / FIELD LAB',kind:'TEXT',duration_ms:10000,address:'text://6:10'},
    interval_ms:[0,10000],position_ms:5200,scope:'TEXT',suggestedMessage:'fallback',
    evidence:{stage:'TEXT',marks:[
      {kind:'BOOKMARK',p:.12,label:'first',address:'text://0:5'},
      {kind:'ARC',p:.5,label:'delta epsilon',address:'text://6:19'}
    ]},
    returnAddress:'/fold-bloom/lab/?mode=VERSE'
  };
  const score=scoreFromReplayHandoff(packet);
  assert.equal(score.source.id,'text-local:20:abcd');
  assert.equal(score.source.address,'text://6:10');
  assert.equal(score.message,'delta epsilon');
  assert.equal(score.returnAddress,'/fold-bloom/lab/?mode=VERSE');
  assert.equal(score.evidence.marks.length,2);
  assert.ok(score.operations.some(x=>x.type==='RETURN'));
});

test('replay handoff adapter uses addressed-message fallback without inventing source authority',()=>{
  const score=scoreFromReplayHandoff({
    source:{id:'source:x',duration_ms:8000,kind:'TEXT'},
    interval_ms:[0,8000],position_ms:0,
    addressedMessage:{path:{cells:[{label:'held word'}]}},
    evidence:{stage:'TEXT'}
  });
  assert.equal(score.message,'held word');
  assert.equal(score.source.kind,'TEXT');
});
