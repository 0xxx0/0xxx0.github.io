import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeExperienceSet,decodeExperienceSet} from '../../experience-set/experience-set.js';
import {createExperienceSet,appendSource,seamLaws,setSeamLaw,reorderEntries,setEntryWeight,removeEntry,prepareSet,deriveSetId} from '../set-core.js';

test('sources append as exact refs with seam closure',()=>{
  let s=createExperienceSet('PROOF');
  s=appendSource(s,'sha256:a');s=appendSource(s,'sha256:b');s=appendSource(s,'sha256:c');
  assert.deepEqual(s.entries.map(e=>e.sourceId),['sha256:a','sha256:b','sha256:c']);
  assert.deepEqual(seamLaws(s),['CUT','CUT']);
  assert.equal(s.entries.at(-1).transitionOut,'RETURN');
  assert.equal(s.entries[1].transitionIn,'CUT');
});

test('one seam law is mirrored on both adjoining entries',()=>{
  let s=createExperienceSet('PROOF');s=appendSource(s,'a');s=appendSource(s,'b');
  s=setSeamLaw(s,0,'DISSOLVE');
  assert.equal(s.entries[0].transitionOut,'DISSOLVE');
  assert.equal(s.entries[1].transitionIn,'DISSOLVE');
});

test('reorder preserves seam-position laws and changes derived set identity',()=>{
  let s=createExperienceSet('PROOF');for(const x of ['a','b','c'])s=appendSource(s,x);
  s=setSeamLaw(s,0,'CARRY');s=setSeamLaw(s,1,'RESET');
  const before=s.id;s=reorderEntries(s,2,0);
  assert.deepEqual(s.entries.map(e=>e.sourceId),['c','a','b']);
  assert.deepEqual(seamLaws(s),['CARRY','RESET']);
  assert.notEqual(s.id,before);
  assert.equal(s.id,deriveSetId(s));
});

test('weight edits remain authored state but do not counterfeit source identity',()=>{
  let s=createExperienceSet('PROOF');s=appendSource(s,'sha256:exact');
  s=setEntryWeight(s,0,2.25);
  assert.equal(s.entries[0].sourceId,'sha256:exact');
  assert.equal(s.entries[0].weight,2.25);
});

test('remove repairs seam closure and round-trip stays exact',()=>{
  let s=createExperienceSet('PROOF');for(const x of ['a','b','c'])s=appendSource(s,x);
  s=setSeamLaw(s,0,'DISSOLVE');s=removeEntry(s,1);s=prepareSet(s);
  assert.equal(s.entries.length,2);
  assert.equal(s.entries.at(-1).transitionOut,'RETURN');
  const encoded=encodeExperienceSet(s),decoded=decodeExperienceSet(encoded);
  assert.deepEqual(decoded,s);
  assert.equal(encodeExperienceSet(decoded),encoded);
});
