import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EXACT_FORM_STATES,HEXAGRAM_STATES,EXACT_FORMS_PER_HEXAGRAM,
  relationPolarity,hexBitsFromForm,hexProjection,hexChangeProjection
} from '../hex-projection.js';

test('HEX is a 64-state quotient over the 4096 exact six-verb forms',()=>{
  assert.equal(EXACT_FORM_STATES,4096);
  assert.equal(HEXAGRAM_STATES,64);
  assert.equal(EXACT_FORMS_PER_HEXAGRAM,64);
});

test('relation distance classes project to solid/broken lines while exact verbs survive',()=>{
  assert.deepEqual(relationPolarity('BLOOM'),{bit:1,line:'━━━',polarity:'YANG',relationClass:'SAME/NEAR'});
  assert.deepEqual(relationPolarity('FOLD'),{bit:1,line:'━━━',polarity:'YANG',relationClass:'SAME/NEAR'});
  assert.deepEqual(relationPolarity('RETURN'),{bit:0,line:'━ ━',polarity:'YIN',relationClass:'FAR/OPPOSITE'});
  assert.deepEqual(relationPolarity('SPLIT'),{bit:0,line:'━ ━',polarity:'YIN',relationClass:'FAR/OPPOSITE'});
});

test('one exact form projects to lower DUI / upper XUN without losing its verbs',()=>{
  const form=['BLOOM','FOLD','SPLIT','RETURN','BLOOM','FOLD'];
  assert.deepEqual(hexBitsFromForm(form),[1,1,0,0,1,1]);
  const p=hexProjection(form);
  assert.equal(p.token,'H[110|011]');
  assert.equal(p.lower.key,'DUI');
  assert.equal(p.lower.han,'兌');
  assert.equal(p.upper.key,'XUN');
  assert.equal(p.upper.han,'巽');
  assert.deepEqual(p.lines.map(x=>x.verb),form);
});

test('many exact forms may share one hexagram, and same-polarity edits do not invent moving lines',()=>{
  const a=['BLOOM','FOLD','SPLIT','RETURN','BLOOM','FOLD'];
  const b=['FOLD','BLOOM','RETURN','SPLIT','FOLD','BLOOM'];
  assert.deepEqual(hexBitsFromForm(a),hexBitsFromForm(b));
  assert.deepEqual(hexChangeProjection(a,b).moving,[]);
});

test('cross-polarity exact edits become traditional moving-line positions',()=>{
  const a=['BLOOM','FOLD','SPLIT','RETURN','BLOOM','FOLD'];
  const b=['RETURN','FOLD','SPLIT','RETURN','SPLIT','FOLD'];
  const c=hexChangeProjection(a,b);
  assert.deepEqual(c.moving,[1,5]);
  assert.equal(c.token,'H[110|011] Δ{1,5} → H[010|001]');
});
