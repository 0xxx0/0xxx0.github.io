import assert from 'node:assert/strict';
import {compileCrewResponse,crewResponseMarkdown} from '../lib/field-crew-response.mjs';

const handoff={
  schema:'field-crew-handoff/v0.1',
  authority:'NONE / TRANSIENT HANDOFF ONLY',
  context_handle:'crew:0123456789abcdef',
  source:{object_ref:'/docs/'},
  return:{target:'/?focus=%2Fdocs%2F',next_authority:'NONE'}
};

for(const action of ['KEEP','PARK','WRONG_FRAME']){
  const r=compileCrewResponse(handoff,action);
  assert.equal(r.schema,'field-crew-response/v0.1');
  assert.equal(r.authority,'NONE / COORDINATION ONLY');
  assert.equal(r.context_handle,handoff.context_handle);
  assert.equal(r.object_ref,'/docs/');
  assert.equal(r.return.target,'/?focus=%2Fdocs%2F');
  assert.equal(r.return.next_authority,'NONE');
  assert.ok(!JSON.stringify(r).includes('"next":'));
  assert.ok(!JSON.stringify(r).includes('effect_authority'));
}
assert.equal(compileCrewResponse(handoff,'KEEP').state,'FRAME_ACCEPTED');
assert.match(compileCrewResponse(handoff,'KEEP').meaning,/not EFFECT/i);
assert.equal(compileCrewResponse(handoff,'PARK').state,'PARKED_RESIDUE');
assert.equal(compileCrewResponse(handoff,'WRONG_FRAME').state,'SOURCE_REQUIRED');
assert.match(compileCrewResponse(handoff,'WRONG_FRAME').requires[0],/re-SOURCE/i);
assert.match(crewResponseMarkdown(compileCrewResponse(handoff,'KEEP')),/KEEP/);
assert.throws(()=>compileCrewResponse({...handoff,schema:'wrong'},'KEEP'),/HANDOFF_SCHEMA/);
assert.throws(()=>compileCrewResponse({...handoff,context_handle:'bad'},'KEEP'),/CONTEXT_HANDLE/);
assert.throws(()=>compileCrewResponse(handoff,'APPROVE'),/ACTION_APPROVE/);

console.log('FIELD CREW RESPONSE PASS · KEEP/PARK/WRONG_FRAME · same object · authority NONE · next_authority NONE');
