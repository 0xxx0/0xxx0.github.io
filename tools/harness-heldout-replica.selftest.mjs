import assert from 'node:assert/strict';
import fs from 'node:fs';
import {evaluateHarnessFixture,evaluateHarnessCase} from './harness-heldout-replica.mjs';

const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/research/weco-heldout-replica.json',import.meta.url),'utf8'));
const [hack,robust]=evaluateHarnessFixture(fixture);

assert.equal(hack.case_id,'visible-metric-hack');
assert.equal(hack.selected.id,'visible-hack','dev-only selector should prefer the visible-metric winner');
assert.equal(hack.selected.dev.pass_rate,1);
assert.equal(hack.selected.heldout.pass_rate,0.5);
assert.equal(hack.heldout_accepted,false,'independent held-out acceptance must reject the development winner');
assert.equal(hack.reward_hack_detected,true,'visible improvement + held-out regression is the bounded reward-hack signature');
assert.equal(hack.disposition,'REJECT');

assert.equal(robust.case_id,'robust-improvement');
assert.equal(robust.selected.id,'robust');
assert.equal(robust.selected.dev.pass_rate,1);
assert.equal(robust.selected.heldout.pass_rate,1);
assert.equal(robust.heldout_accepted,true);
assert.equal(robust.reward_hack_detected,false);
assert.equal(robust.disposition,'ACCEPT');

assert.throws(()=>evaluateHarnessCase({
  baseline_id:'a',
  arms:[
    {id:'a',dev:[{id:'x',pass:true}],heldout:[{id:'x',pass:true}]},
    {id:'b',dev:[{id:'x',pass:true}],heldout:[{id:'x',pass:true}]}
  ]
}),/HARNESS_DEV_HELDOUT_LEAKAGE/);

assert.throws(()=>evaluateHarnessCase({
  baseline_id:'a',
  arms:[
    {id:'a',dev:[{id:'d1',pass:true}],heldout:[{id:'h1',pass:true}]},
    {id:'b',dev:[{id:'d1',pass:true},{id:'d2',pass:true}],heldout:[{id:'h1',pass:true}]}
  ]
}),/HARNESS_BUDGET_MISMATCH/);

console.log('Weco held-out selection replica PASS · dev-only false positive rejected · robust improvement accepted · leakage/budget drift fail closed');
