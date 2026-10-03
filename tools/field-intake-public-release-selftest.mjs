import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('../field-intake/public-release.js',import.meta.url),'utf8');
const context={URL,encodeURIComponent,decodeURIComponent,console};
context.globalThis=context;
vm.runInNewContext(source,context,{filename:'public-release.js'});
const api=context.FieldIntakePublicRelease;
assert.ok(api,'compiler exported');

const record={
  id:'c:bridge-test-abc12',
  kind:'claim',
  title:'Public bridge claim',
  contexts:['field'],
  tags:['research'],
  refs:['evidence:123'],
  confidence:.62,
  notes:'PRIVATE NOTE MUST NOT PROJECT',
  source:{raw:'PRIVATE RAW MUST NOT PROJECT',evidence:[{token:'secret'}]},
  invented:'DROP ME'
};
const packet=api.packet(record,{stateHash:'PRIVATE STATE FINGERPRINT MUST NOT PROJECT',projectedAt:'2026-10-03T00:00:00.000Z'});
assert.equal(packet.schema,'field/intake-public-release/v0.1');
assert.equal(packet.authority,'DRAFT_ONLY');
assert.equal(packet.effect,'NONE_UNTIL_OPERATOR_SUBMITS');
assert.equal(packet.source.surface,'/field-intake/');
assert.equal(packet.source.record_id,'c:bridge-test-abc12');
assert.equal(packet.source.state_hash,undefined);
assert.equal(packet.record.title,'Public bridge claim');
assert.equal(packet.record.confidence,.62);
assert.equal(packet.record.notes,undefined);
assert.equal(packet.record.source,undefined);
assert.equal(packet.record.invented,undefined);
assert.doesNotMatch(JSON.stringify(packet),/PRIVATE STATE FINGERPRINT/);

const draft=api.issueDraft(packet);
assert.match(draft.url,/^https:\/\/github\.com\/0xxx0\/0xxx0\.github\.io\/issues\/new\?/);
assert.match(draft.title,/^\[FIELD\] CLAIM/);
assert.match(draft.body,/DRAFT_ONLY/);
assert.doesNotMatch(draft.body,/PRIVATE NOTE|PRIVATE RAW|DROP ME|PRIVATE STATE FINGERPRINT/);
assert.match(decodeURIComponent(draft.url),/Public bridge claim/);

assert.throws(()=>api.packet({kind:'claim',title:'missing id'}),/id, kind and title/);
console.log('FIELD INTAKE public-release selftest: PASS');
