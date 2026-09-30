import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compileDonorField} from './research-donor-field.mjs';

const donors=[
  {
    SOURCE_ID:'MLST 2026-09-26 / Zhengyao Jiang',
    ROLE:'MECHANISM',
    CLAIM_KIND:'OPTIMIZATION',
    CLAIM:'harness adaptation improves a fixed base model',
    DISPOSITION:'TRANSFER',
    CURRENT_HOST:'research-design-loop',
    BASELINE:'current harness',
    FALSIFIER:'held-out gain disappears',
    FIXED:'base model + tools',
    MUTATED:'harness',
    DEV_METRIC:'development fixtures',
    HELD_OUT:'unseen fixtures',
    REWARD_HACK_CHECK:'independent acceptance'
  },
  {
    SOURCE_ID:'AI Search / DeepSeek V4.1 Flash',
    ROLE:'SCOUT',
    CLAIM:'cache/attention compression may reduce local context cost',
    DISPOSITION:'TRANSFER',
    CURRENT_HOST:'Sovereign Node',
    FALSIFIER:'no equal-quality latency or memory gain'
  },
  {
    SOURCE_ID:'Lex Fridman #490 / State of AI in 2026',
    ROLE:'SYNTHESIS',
    CLAIM:'broad orientation map only',
    DISPOSITION:'PARK'
  },
  {
    SOURCE_ID:'paper:complete',
    ROLE:'MECHANISM',
    CLAIM:'bounded operator preserves host invariant',
    DISPOSITION:'TRANSFER',
    CURRENT_HOST:'example-host',
    PRIMARY_REF:'doi:example',
    BASELINE:'existing operator',
    FALSIFIER:'held-out invariant fails',
    REPLICA:{status:'PASS'},
    TRANSFER_TEST:{status:'PASS'},
    EVIDENCE:{refs:['fixture:a','test:b']}
  }
];

const field=compileDonorField(donors);
assert.equal(field.schema,'field/research-donor-field/v0.1');
assert.equal(field.selected,null);
assert.equal(field.selection_required,true,'batch must not select its own priority');
assert.equal(field.counts.RECOVER_PRIMARY,2);
assert.equal(field.counts.PARK,1);
assert.equal(field.counts.READY,1);

const jiang=field.donors[0];
assert.equal(jiang.lane,'RECOVER_PRIMARY');
assert.match(jiang.next_action,/primary paper, code, benchmark, or specification/);

const selected=compileDonorField(donors,{selected_source_id:'MLST 2026-09-26 / Zhengyao Jiang'}).selected;
assert.equal(selected.lane,'RECOVER_PRIMARY');
assert.equal(selected.egress.class,'NEXT','explicit selection should compile one evidence-debt action into existing FIELD NEXT');
assert.equal(selected.action_packet.AUTHORITY.can_select_now,false);
assert.equal(selected.action_packet.AUTHORITY.host_effect,false);
assert.match(selected.action_packet.NEXT.action,/Recover the closest primary/);

const parked=compileDonorField(donors,{selected_source_id:'Lex Fridman #490 / State of AI in 2026'}).selected;
assert.equal(parked.lane,'PARK');
assert.equal(parked.egress.class,'ARCHIVE','explicit PARK has no executable sequel');

const ready=compileDonorField(donors,{selected_source_id:'paper:complete'}).selected;
assert.equal(ready.lane,'READY');
assert.equal(ready.egress.class,'NEXT');
assert.match(ready.action_packet.NEXT.action,/native host acceptance and authority/);

const unresolved=compileDonorField([{SOURCE_ID:'broken',CLAIM:'missing role',DISPOSITION:'TRANSFER'}]);
assert.equal(unresolved.donors[0].lane,'UNRESOLVED');
assert.ok(unresolved.donors[0].blockers.includes('ROLE'));

assert.throws(()=>compileDonorField(donors,{selected_source_id:'not-present'}),/DONOR_FIELD_SELECTION_NOT_FOUND/);

console.log('research donor field PASS · batch does not self-prioritize · selected donor compiles evidence debt into existing FIELD NEXT · PARK archives · READY still requires host authority');

const weco=JSON.parse(fs.readFileSync(new URL('../control/research/WECO_AIDE2_DONOR_2026-09-30.json',import.meta.url),'utf8'));
const wecoField=compileDonorField([weco],{selected_source_id:weco.SOURCE_ID});
assert.equal(wecoField.selected.lane,'REPLICATE','primary recovery should move the real Weco donor beyond RECOVER_PRIMARY');
assert.equal(wecoField.selected.egress.class,'NEXT');
assert.match(wecoField.selected.action_packet.NEXT.action,/Run one bounded replica/);
assert.ok(!wecoField.selected.blockers.includes('PRIMARY_REF'));
assert.ok(wecoField.selected.blockers.includes('REPLICA_PASS'));

console.log('real donor transition PASS · Weco AIDE2 primary evidence moves RECOVER_PRIMARY → REPLICATE without granting transfer');
