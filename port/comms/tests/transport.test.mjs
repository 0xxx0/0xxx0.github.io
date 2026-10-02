import test from 'node:test';
import assert from 'node:assert/strict';
import {parseConversation,makeReturn} from '../core.js';
import {
  TRANSPORT_CANDIDATE_SCHEMA,TRANSPORT_RELEASE_SCHEMA,TRANSPORT_RETURN_SCHEMA,
  prepareEmailCandidate,authorizeTransport,buildMailtoHref,providerReceiptTemplate,verifyProviderReceipt
} from '../transport.js';

function fixture(){
  const doc=parseConversation('User: Please send the finished note when it is ready.');
  return makeReturn({
    doc,
    sourceId:'sha256:source-fixture',
    signals:[],
    draft:'Exact outbound body.\nSecond line.',
    coverageLinks:['h:m01:0-10:ask'],
    title:'Transport fixture',
    includeSource:true
  });
}

test('transport candidate is exact, private, and carries NO_SEND authority',async()=>{
  const source=fixture();
  const candidate=await prepareEmailCandidate({commsReturn:source,to:'recipient@example.com',subject:'Exact subject'});
  assert.equal(candidate.schema,TRANSPORT_CANDIDATE_SCHEMA);
  assert.equal(candidate.authority,'NO_SEND');
  assert.equal(candidate.channel,'email');
  assert.equal(candidate.provider,'gmail');
  assert.equal(candidate.destination.to,'recipient@example.com');
  assert.equal(candidate.response.text,source.response.text);
  assert.ok(candidate.response.sha256.startsWith('sha256:'));
  assert.ok(candidate.candidate_id.startsWith('sha256:'));
  assert.equal(candidate.privacy.source_text_included,false);
  assert.equal(JSON.stringify(candidate).includes(source.source.text),false);
});

test('candidate rejects missing draft or malformed destination',async()=>{
  const source=fixture();
  await assert.rejects(()=>prepareEmailCandidate({commsReturn:source,to:'not-an-email'}),/destination email/);
  source.response.text='   ';
  await assert.rejects(()=>prepareEmailCandidate({commsReturn:source,to:'recipient@example.com'}),/non-empty response/);
});

test('release exists only after an explicit operator gesture',async()=>{
  const candidate=await prepareEmailCandidate({commsReturn:fixture(),to:'recipient@example.com'});
  await assert.rejects(()=>authorizeTransport(candidate,{operatorGesture:false}),/operator gesture/);
  const release=await authorizeTransport(candidate,{operatorGesture:true,releasedAt:'2026-10-03T06:40:00+08:00'});
  assert.equal(release.schema,TRANSPORT_RELEASE_SCHEMA);
  assert.equal(release.authority,'HUMAN_RELEASE');
  assert.equal(release.send.allowed,true);
  assert.equal(release.send.scope,'ONE_EXACT_MESSAGE');
  assert.equal(release.send.response_sha256,release.response.sha256);
  assert.equal(release.send.destination.to,release.destination.to);
  assert.ok(release.release_id.startsWith('sha256:'));
});

test('mailto handoff carries exact subject and body but proves no send',async()=>{
  const candidate=await prepareEmailCandidate({commsReturn:fixture(),to:'recipient@example.com',subject:'A subject'});
  const release=await authorizeTransport(candidate,{operatorGesture:true});
  const href=buildMailtoHref(release);
  assert.ok(href.startsWith('mailto:recipient%40example.com?'));
  assert.ok(href.includes('subject=A+subject'));
  assert.ok(href.includes('body=Exact+outbound+body.'));
  assert.equal(release.authority,'HUMAN_RELEASE');
});

test('provider receipt must match exact release, destination, source, and bytes',async()=>{
  const candidate=await prepareEmailCandidate({commsReturn:fixture(),to:'recipient@example.com',subject:'A subject'});
  const release=await authorizeTransport(candidate,{operatorGesture:true,releasedAt:'2026-10-03T06:40:00+08:00'});
  const receipt=providerReceiptTemplate(release);
  receipt.provider_message_id='provider-message-123';
  receipt.sent_at='2026-10-03T06:41:00+08:00';
  const returned=await verifyProviderReceipt(release,receipt);
  assert.equal(returned.schema,TRANSPORT_RETURN_SCHEMA);
  assert.equal(returned.authority,'EVIDENCE_ONLY');
  assert.equal(returned.result,'SENT_CONFIRMED');
  assert.equal(returned.source.object_id,release.source.object_id);
  assert.equal(returned.receipt.response_sha256,release.response.sha256);
  assert.ok(returned.receipt.evidence_sha256.startsWith('sha256:'));

  await assert.rejects(()=>verifyProviderReceipt(release,{...receipt,release_id:'sha256:other'}),/release mismatch/);
  await assert.rejects(()=>verifyProviderReceipt(release,{...receipt,response_sha256:'sha256:other'}),/response mismatch/);
  await assert.rejects(()=>verifyProviderReceipt(release,{...receipt,destination:{to:'other@example.com'}}),/destination mismatch/);
});

test('provider receipt evidence cannot mutate native COMMS state by itself',async()=>{
  const candidate=await prepareEmailCandidate({commsReturn:fixture(),to:'recipient@example.com'});
  const release=await authorizeTransport(candidate,{operatorGesture:true});
  const receipt={...providerReceiptTemplate(release),provider_message_id:'msg-1',sent_at:new Date().toISOString()};
  const returned=await verifyProviderReceipt(release,receipt);
  assert.equal(returned.authority,'EVIDENCE_ONLY');
  assert.match(returned.law,/Native COMMS alone decides COVERED \/ DEFERRED \/ OPEN/);
  assert.equal('state' in returned,false);
});
