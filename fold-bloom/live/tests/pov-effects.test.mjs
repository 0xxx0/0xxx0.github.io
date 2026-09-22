import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceSkyEvent,releaseSkyDescriptor,opticWitness,dropBurstDescriptor} from '../pov-effects.js';

test('source sky event prefers upcoming macro DROP over section/surge/phrase',()=>{
 const world={currentBend:.1,drop:{id:'drop@4',ahead:2.2,strength:.9,t:4},surge:{ahead:1,impact:1,rise:.3},points:[{ahead:.5,phraseEdge:true,impact:.5,bend:0},{ahead:2,sectionEdge:true,impact:.7,bend:.2}]};
 const e=sourceSkyEvent(world);assert.equal(e.kind,'DROP');assert.equal(e.id,'drop@4');assert.ok(e.strength>.8);
});

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


test('drop burst descriptor keeps source event identity',()=>{
 const d=dropBurstDescriptor({id:'drop@8.2',t:8.2,strength:.77,rise:.5,flux:.9});
 assert.equal(d.kind,'DROP_BURST');assert.equal(d.id,'drop@8.2');assert.equal(d.t,8.2);assert.ok(d.strength>.7);
});
