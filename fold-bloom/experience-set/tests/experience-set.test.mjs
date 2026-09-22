import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {EXPERIENCE_SET_SCHEMA,TRANSITION_LAWS,assertExperienceSet,encodeExperienceSet,decodeExperienceSet} from '../experience-set.js';

const fixture = JSON.parse(fs.readFileSync(new URL('../fixtures/two-source-set.json', import.meta.url),'utf8'));

test('fixture matches v0.1 and round-trips without loss or reordering',()=>{
  assert.equal(fixture.schema,EXPERIENCE_SET_SCHEMA);
  const encoded=encodeExperienceSet(fixture);
  const decoded=decodeExperienceSet(encoded);
  assert.deepEqual(decoded,fixture);
  assert.deepEqual(decoded.entries.map(x=>x.sourceId),['sha256:source-a','sha256:source-b']);
  assert.equal(encodeExperienceSet(decoded),encoded);
});

test('codec is detached and does not mutate authored input',()=>{
  const before=JSON.stringify(fixture);
  const decoded=decodeExperienceSet(encodeExperienceSet(fixture));
  decoded.entries[0].sourceId='changed';
  assert.equal(JSON.stringify(fixture),before);
  assert.equal(fixture.entries[0].sourceId,'sha256:source-a');
});

test('only the five specified transition laws are admitted',()=>{
  for(const law of TRANSITION_LAWS){
    const candidate=structuredClone(fixture);candidate.entries[0].transitionOut=law;
    assert.doesNotThrow(()=>assertExperienceSet(candidate));
  }
  const bad=structuredClone(fixture);bad.entries[0].transitionOut='CROSSFADE';
  assert.throws(()=>assertExperienceSet(bad),/must be one of/);
});

test('schema boundary rejects undeclared fields instead of inventing ontology',()=>{
  const bad=structuredClone(fixture);bad.sourceBytes='AAAA';
  assert.throws(()=>assertExperienceSet(bad),/unknown field sourceBytes/);
});
