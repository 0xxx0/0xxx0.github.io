import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FORM_PUZZLE_VERSION,FORM_SLOTS,formAddress,appendFormVerb,writeFormVerb,
  changedFormSlots,formComplete,formToken,formDelta,formChangeOutcome,formDiversity
} from '../form-puzzle.js';

test('FORM preserves exact LIVE verbs instead of binary compression',()=>{
  let f=[];
  for(const v of ['BLOOM','FOLD','SPLIT','RETURN','BLOOM','FOLD'])f=appendFormVerb(f,v);
  assert.equal(f.length,FORM_SLOTS);
  assert.equal(formComplete(f),true);
  assert.equal(formToken(f),'F[B F S R B F]');
  assert.equal(formDiversity(f),4);
});

test('rotation addresses one of six radial form positions',()=>{
  assert.equal(formAddress(0),0);
  assert.equal(formAddress(5),5);
  assert.equal(formAddress(6),0);
  assert.equal(formAddress(-1),5);
});

test('MORPH writes the actual forecast verb at one addressed slot',()=>{
  const a=['BLOOM','FOLD','SPLIT','RETURN','BLOOM','FOLD'];
  const b=writeFormVerb(a,1,'RETURN');
  assert.deepEqual(b,['BLOOM','RETURN','SPLIT','RETURN','BLOOM','FOLD']);
  assert.deepEqual(changedFormSlots(a,b),[2]);
  assert.equal(formDelta(a,b).token,'F[B F S R B F] Δ{2} → F[B R S R B F]');
});

test('MORPH clears from two persistent changed slots within bounded moves',()=>{
  const a=['BLOOM','FOLD','SPLIT','RETURN','BLOOM','FOLD'];
  let b=writeFormVerb(a,1,'RETURN');
  assert.equal(formChangeOutcome(a,b,1).clear,false);
  b=writeFormVerb(b,4,'SPLIT');
  assert.deepEqual(formChangeOutcome(a,b,2),{complete:true,clear:true,changed:[2,5],label:'FORM MORPHED'});
  assert.deepEqual(formChangeOutcome(a,a,4),{complete:true,clear:false,changed:[],label:'MORPH OPEN'});
  assert.equal(FORM_PUZZLE_VERSION,'FOLD_BLOOM_FORM_0.1');
});
