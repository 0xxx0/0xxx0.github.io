import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceSkyEvent,releaseSkyDescriptor,opticWitness} from '../pov-effects.js';

test('source sky event prefers upcoming section over surge and phrase',()=>{
 const world={currentSpeed:1,currentGrade:0,currentBend:.2,surge:{ahead:1,impact:1,rise:.3},points:[{ahead:.5,phraseEdge:true,impact:.5,bend:0},{ahead:2,sectionEdge:true,impact:.7,bend:.2}]};
 assert.equal(sourceSkyEvent(world).kind,'SECTION');
});
test('release verbs keep distinct embodied sky identities',()=>{
 assert.equal(releaseSkyDescriptor({verb:'BLOOM'}).kind,'BLOOM');
 assert.equal(releaseSkyDescriptor({verb:'FOLD'}).kind,'CREASE');
 assert.equal(releaseSkyDescriptor({verb:'SPLIT'}).kind,'TWIN');
 assert.equal(releaseSkyDescriptor({verb:'RETURN'}).kind,'CONVERGE');
});
test('optic witness is deterministic for the same world and time',()=>{
 const w={currentSpeed:1.4,currentGrade:.5,currentBend:-.2};
 assert.deepEqual(opticWitness(w,1234,8),opticWitness(w,1234,8));
 assert.equal(opticWitness(w,1234,8).stars.length,8);
});
