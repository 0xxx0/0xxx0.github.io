import assert from 'node:assert/strict';
import {createState,forecastContext} from './engine.js';
import {liveSteeringPreview,manualSteeringPulse} from './steering-preview.js';

const state=createState(7),before=JSON.stringify(state),ctx=forecastContext(state);
assert.equal(ctx.authority,'NATIVE_EVIDENCE');
assert.ok(Array.isArray(ctx.forecasts)&&ctx.forecasts.length>0);

const verb=ctx.forecasts[0].verb;
const pulse=manualSteeringPulse(verb,{wall:1000});
const view=liveSteeringPreview(state,pulse,{now:1100,maxAgeMs:15000});
assert.equal(view.ok,true);
assert.equal(view.authority,'PREVIEW');
assert.equal(view.verb,verb);
assert.ok(view.candidate_count>0);
assert.deepEqual(view.candidates.map(x=>x.slot),ctx.forecasts.filter(x=>x.verb===verb).map(x=>x.slot));
assert.equal(view.commit_operation,null);
assert.equal(JSON.stringify(state),before);

const stale=liveSteeringPreview(state,pulse,{now:20000,maxAgeMs:15000});
assert.equal(stale.ok,false);
assert.equal(stale.reason,'NO_FRESH_STEERING_PULSE');

console.log(JSON.stringify({status:'PASS',verb,candidates:view.candidate_count,ambiguity:view.candidate_ambiguity_bits},null,2));
