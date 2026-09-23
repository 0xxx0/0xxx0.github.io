import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INSTRUMENT_SCHEMA,emptyInstrumentState,bindObject,setFocus,setOperation,setProjection,
  checkpoint,doReturn,supportFor,projectionHref,foldHref,defaultBloomProjection,
  identityDescriptor,normalizeInstrumentState
} from '../instrument-state.js';

test('empty state is small and inert',()=>{
  const s=emptyInstrumentState();
  assert.equal(s.schema,INSTRUMENT_SCHEMA);
  assert.equal(s.object.kind,'EMPTY');
  assert.deepEqual(supportFor(s).projections,['GLYPH']);
});

test('audio source keeps one exact id across MAP and RIDE adapters',()=>{
  const id='sha256:'+'a'.repeat(64);
  let s=bindObject(emptyInstrumentState(),{kind:'AUDIO',id,label:'track.mp3'});
  assert.equal(s.object.id,id);
  assert.equal(defaultBloomProjection(s),'RIDE');
  const map=projectionHref(s,'MAP');
  const ride=projectionHref(s,'RIDE');
  assert.match(map,/\/fold-bloom\/listen\/\?source=sha256%3A/);
  assert.match(ride,/\/fold-bloom\/live\/\?source=sha256%3A/);
  assert.ok(map.includes(encodeURIComponent(id)));
  assert.ok(ride.includes(encodeURIComponent(id)));
  assert.equal(supportFor(s).projections.includes('READ'),false);
});

test('text refuses audio projections and routes READ through explicit handoff',()=>{
  let s=bindObject(emptyInstrumentState(),{kind:'TEXT',id:'sha256:'+'b'.repeat(64),label:'note'});
  assert.throws(()=>setProjection(s,'RIDE'),/unsupported/);
  assert.throws(()=>projectionHref(s,'MAP'),/unsupported/);
  assert.equal(defaultBloomProjection(s),'READ');
  assert.match(projectionHref(s,'READ'),/^\/docs\/\?handoff=1/);
});

test('set folds in SET and rides through current Journey adapter',()=>{
  let s=bindObject(emptyInstrumentState(),{kind:'SET',id:'set:abc123',label:'THREE TRACKS',meta:{entries:3}});
  assert.equal(foldHref(s),'/fold-bloom/set/?return=%2Ffold-bloom%2F');
  assert.match(projectionHref(s,'RIDE'),/^\/fold-bloom\/set\/journey\.html\?/);
  assert.equal(supportFor(s).projections.includes('MAP'),false);
});

test('focus and operation are workspace state, never source identity',()=>{
  const id='sha256:'+'c'.repeat(64);
  let s=bindObject(emptyInstrumentState(),{kind:'AUDIO',id,label:'x'});
  s=setFocus(s,{id:id+'#section:2',label:'SECTION 2',address:'section://2'});
  s=setOperation(s,'BLOOM');
  assert.equal(s.object.id,id);
  assert.equal(s.focus.address,'section://2');
  assert.equal(s.operation,'BLOOM');
});

test('RETURN restores exact workspace frame while preserving stack semantics',()=>{
  let s=bindObject(emptyInstrumentState(),{kind:'AUDIO',id:'sha256:'+'d'.repeat(64),label:'x'});
  s=setFocus(s,{id:'focus:A',address:'beat://8'});
  s=checkpoint(s,'before ride');
  const expected=normalizeInstrumentState({...s,returnStack:[]});
  s=setProjection(s,'RIDE');
  s=setOperation(s,'BLOOM');
  s=setFocus(s,{id:'focus:B',address:'section://3'});
  const returned=doReturn(s);
  assert.equal(returned.object.id,expected.object.id);
  assert.equal(returned.focus.id,expected.focus.id);
  assert.equal(returned.focus.address,expected.focus.address);
  assert.equal(returned.operation,expected.operation);
  assert.equal(returned.projection,expected.projection);
  assert.equal(returned.returnStack.length,0);
});

test('identity descriptor is deterministic and bounded',()=>{
  const a=identityDescriptor('same'),b=identityDescriptor('same'),c=identityDescriptor('other');
  assert.deepEqual(a,b);
  assert.notDeepEqual(a,c);
  assert.ok(a.sides>=3&&a.sides<=8);
  assert.ok(a.inner>=.28&&a.inner<=.71);
});
