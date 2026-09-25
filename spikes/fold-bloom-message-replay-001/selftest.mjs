import assert from 'node:assert/strict';
import {defaultScore,decodeScore,encodeScore,packetBytes,retimeOperation,sampleScore,serializeScore,visualSignature} from './score.js';

const a=defaultScore();
const encoded=encodeScore(a),b=decodeScore(encoded);
assert.equal(serializeScore(a),serializeScore(b),'share encoding must round-trip exactly after normalization');
assert.equal(a.source.id,b.source.id,'source identity must survive share round-trip');

const sig1=visualSignature(a,48),sig2=visualSignature(a,48);
assert.equal(sig1,sig2,'same score must produce deterministic replay signature');
assert.ok(packetBytes(a)<1600,'score packet should stay compact');

const changed=retimeOperation(a,'BLOOM',.045);
assert.equal(changed.source.id,a.source.id,'editing presentation timing must not mutate source identity');
assert.notEqual(visualSignature(changed,48),sig1,'one intentional timing edit must produce a perceptible deterministic signature delta');

const atDrop=sampleScore(a,a.source.duration_ms*.48);
const atReturn=sampleScore(a,a.source.duration_ms*.91);
assert.ok(atDrop.weights.DROP>.95,'DROP event should be strongly legible at its address');
assert.ok(atReturn.weights.RETURN>.95,'RETURN event should be strongly legible at its address');
assert.ok(atReturn.fork<sampleScore(a,a.source.duration_ms*.73).fork,'RETURN should collapse prior split residue');

console.log(JSON.stringify({pass:true,proof:'MESSAGE_REPLAY_H1',packet_bytes:packetBytes(a),signature:sig1,changed_signature:visualSignature(changed,48),source_id:a.source.id}));
