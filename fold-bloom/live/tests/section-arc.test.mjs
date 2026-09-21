import test from 'node:test';
import assert from 'node:assert/strict';
import {createSectionArc,syncSectionArc,observeSectionRelease,sectionPhase,sectionArcReady,sectionArcLabel} from '../section-arc.js';

const t=(sectionIndex,sectionProgress)=>({sectionIndex,sectionProgress,sectionCount:4});
const ev=(verb,{callMet=true,ops=[verb],timing='FREE'}={})=>({verb,callMet,operations:ops,timing});

test('section arc enters and resets cleanly on section transition',()=>{
  let arc=createSectionArc();
  let x=syncSectionArc(arc,t(0,.1));arc=x.arc;assert.equal(arc.sectionIndex,0);
  arc=observeSectionRelease(arc,ev('BLOOM'),t(0,.2)).arc;
  arc=observeSectionRelease(arc,ev('FOLD'),t(0,.5)).arc;
  assert.equal(arc.hits,2);assert.deepEqual(arc.verbs,['BLOOM','FOLD']);
  x=syncSectionArc(arc,t(1,.01));arc=x.arc;
  assert.equal(x.event.kind,'SECTION_CHANGE');assert.equal(x.event.previous.hits,2);
  assert.equal(arc.sectionIndex,1);assert.equal(arc.hits,0);assert.deepEqual(arc.verbs,[]);
});

test('two call hits with two verbs make an arc ready',()=>{
  let arc=createSectionArc();arc=syncSectionArc(arc,t(0,.1)).arc;
  arc=observeSectionRelease(arc,ev('BLOOM'),t(0,.2)).arc;
  arc=observeSectionRelease(arc,ev('FOLD'),t(0,.5)).arc;
  assert.equal(sectionArcReady(arc),true);
  assert.equal(sectionPhase(t(0,.8)),'RETURN');
  assert.match(sectionArcLabel(arc,t(0,.8)),/CLOSE/);
});

test('RETURN in closing window seals ready arc and grants bounded bonus',()=>{
  let arc=createSectionArc();arc=syncSectionArc(arc,t(2,.05)).arc;
  arc=observeSectionRelease(arc,ev('BLOOM'),t(2,.2)).arc;
  arc=observeSectionRelease(arc,ev('FOLD'),t(2,.55)).arc;
  const out=observeSectionRelease(arc,ev('SPLIT',{callMet:false,ops:['SPLIT','RETURN'],timing:'GOOD'}),t(2,.83));
  assert.equal(out.event.kind,'SECTION_SEAL');assert.equal(out.arc.sealed,true);assert.ok(out.bonus>=100&&out.bonus<300);
  assert.equal(out.arc.hits,2);
});

test('section close never requires a CALL hit on the closing move',()=>{
  let arc=createSectionArc();arc=syncSectionArc(arc,t(0,.1)).arc;
  arc=observeSectionRelease(arc,ev('BLOOM'),t(0,.2)).arc;
  arc=observeSectionRelease(arc,ev('FOLD'),t(0,.5)).arc;
  const out=observeSectionRelease(arc,ev('RETURN',{callMet:false,ops:['RETURN']}),t(0,.95));
  assert.equal(out.arc.sealed,true);
});

test('RETURN without prior variety does not seal or punish',()=>{
  let arc=createSectionArc();arc=syncSectionArc(arc,t(1,.1)).arc;
  arc=observeSectionRelease(arc,ev('BLOOM'),t(1,.3)).arc;
  const out=observeSectionRelease(arc,ev('RETURN',{callMet:false,ops:['RETURN']}),t(1,.9));
  assert.equal(out.arc.sealed,false);assert.equal(out.bonus,0);
});
