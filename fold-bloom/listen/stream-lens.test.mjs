import assert from 'node:assert/strict';
import {STREAM_LENS_SCHEMA,addressFraction,addressAtFraction,scrubByDelta,stepAddress,makeStreamPin,normalizePins,pinsInDomain} from './stream-lens.js';

const range=[10,34];
assert.equal(addressAtFraction(range,0),10);
assert.equal(addressAtFraction(range,1),34);
assert.equal(addressFraction(range,22),.5);
assert.ok(scrubByDelta(range,22,220)>22);
assert.ok(scrubByDelta(range,22,-220)<22);
assert.ok(stepAddress(range,22,1)>22);
assert.ok(stepAddress(range,22,-1)<22);
assert.equal(scrubByDelta([4,4],9,200),4);

const a=makeStreamPin({sourceKey:'abc',address:12.34567,label:'DROP',note:'turn here',scope:'SECTION',features:{energy:.8}});
const b=makeStreamPin({sourceKey:'abc',address:28,label:'RETURN'});
const other=makeStreamPin({sourceKey:'xyz',address:14});
assert.equal(a.schema,STREAM_LENS_SCHEMA);
assert.equal(a.address,12.3457);
assert.deepEqual(normalizePins([b,a], 'abc').map(x=>x.address),[12.3457,28]);
assert.deepEqual(pinsInDomain([b,a,other],[11,20]).map(x=>x.id),[a.id,other.id]);
console.log('STREAM LENS SELFTEST PASS');
