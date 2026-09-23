import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeActive,supportFor,defaultBloomProjection,routeFor,foldRoute,identityDescriptor,projectionSpec} from '../instrument-support.js';

test('support map refuses invented adapters',()=>{
  assert.deepEqual(supportFor({kind:'EMPTY'}).projections,['GLYPH']);
  assert.equal(supportFor({kind:'TEXT',id:'t'}).operations.includes('FOLD'),false);
  assert.throws(()=>routeFor({kind:'TEXT',id:'t'},'RIDE'),/unsupported/);
});
test('audio routes preserve exact source id',()=>{
  const id='sha256:'+'a'.repeat(64),a={kind:'AUDIO',id,label:'track'};
  assert.ok(routeFor(a,'MAP').includes(encodeURIComponent(id)));
  assert.ok(routeFor(a,'RIDE').includes(encodeURIComponent(id)));
  assert.ok(foldRoute(a).includes(encodeURIComponent(id)));
  assert.equal(defaultBloomProjection(a),'RIDE');
});
test('set RIDE is exact-addressed, not ambient current set',()=>{
  const u=routeFor({kind:'SET',id:'set:abc',label:'set'},'RIDE');
  assert.ok(u.includes('set=set%3Aabc'));
  assert.equal(defaultBloomProjection({kind:'SET',id:'set:abc'}),'RIDE');
});
test('text owns READ only and handoff stays explicit',()=>{
  const u=routeFor({kind:'TEXT',id:'sha256:'+'b'.repeat(64)},'READ');
  assert.match(u,/^\/docs\/\?handoff=1/);
  assert.equal(defaultBloomProjection({kind:'TEXT',id:'x'}),'READ');
});
test('domain projections declare INTERPHASE channels instead of owning state',()=>{
  const p=projectionSpec();assert.ok(p.MAP.channels.includes('evidence'));assert.ok(p.RIDE.channels.includes('time'));assert.ok(p.READ.channels.includes('depth'));
});
test('identity glyph descriptor is deterministic',()=>{
  assert.deepEqual(identityDescriptor('x'),identityDescriptor('x'));assert.notDeepEqual(identityDescriptor('x'),identityDescriptor('y'));
});
test('invalid active pointer collapses to EMPTY',()=>{assert.equal(normalizeActive({kind:'AUDIO'}).kind,'EMPTY')});
