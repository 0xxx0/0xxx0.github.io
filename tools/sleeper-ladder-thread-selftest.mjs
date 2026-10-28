#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const B=require('../sleeper/ladder/thread-bridge.js');
const raw=JSON.parse(readFileSync('sleeper/ladder/source-dhamma.json','utf8'));
let count=0;const check=(message,fn)=>{fn();count++;console.log('PASS '+message)};
const made=B.create(raw);
check('one passage for each real source-derived gate',()=>{
 assert.equal(made.entries.length,8);assert.equal(made.text.split('\n\n').length,8);
 assert.equal(made.schema,'sleeper.ladder-threadwalk-projection/v1');
});
check('source/selection/abridgment authority retained',()=>{
 assert.equal(made.sourceType,'DERIVED_ABRIDGED_PROJECTION_NOT_FULL_BOOK');
 assert.equal(made.originalSelectionSha256,raw.selection.sha256);
 assert.match(made.text,/¶303/);
 assert.ok(!made.text.includes('This is the entire book'));
});
check('all eight excerpts copied directly from the shipped projection',()=>{
 for(let i=0;i<8;i++){
  const e=made.entries[i],f=raw.factors[i];
  assert.equal(e.index,i);assert.equal(e.excerpt,f.line.trim());
  assert.equal(e.name,f.en);assert.equal(e.locator,f.locator);assert.equal(e.act,f.act);
  assert.ok(made.text.includes(f.line.trim()));assert.equal(e.canonical,B.CANONICAL[i]);
  assert.equal(e.references.length,B.REFERENCES[i].length);
  for(const ref of e.references)assert.match(ref.url,/^https:\/\/suttacentral\.net\//);
 }
});
check('five linked book lenses are explicit editorial navigation',()=>{
 assert.equal(B.READING_MAP.length,5);
 assert.deepEqual(B.READING_MAP.map(x=>x.lens),['COMPOSE','CHANGE','CONDITION','DISCERN','PRACTISE']);
 assert.deepEqual(B.READING_MAP.map(x=>x.chapter),['Ch. 1','Ch. 3','Ch. 4','Ch. 15','Ch. 16–18']);
 for(const stage of B.READING_MAP){assert.match(stage.url,/^https:\/\/buddhadhamma\.github\.io\//);assert.ok(stage.question.includes('?'));}
});
check('only exact valid factor indices',()=>{
 assert.equal(B.selectedIndex('0'),0);assert.equal(B.selectedIndex('7'),7);
 for(const x of ['-1','8','NaN','2.4','__proto__'])assert.throws(()=>B.selectedIndex(x),/FACTOR_INDEX_INVALID/);
});
check('negative: changed selected source hash cannot claim known source',()=>{
 const damaged=structuredClone(raw);damaged.selection.sha256='a'.repeat(64);
 assert.throws(()=>B.create(damaged),/PROJECTION_CHANGED/);
});
check('negative: changed factor words cannot claim known source',()=>{
 const damaged=structuredClone(raw);damaged.factors[6].line+=' INTERPOLATED';
 assert.throws(()=>B.create(damaged),/PROJECTION_CHANGED/);
});
check('negative: changed factor order cannot claim known source',()=>{
 const damaged=structuredClone(raw);[damaged.factors[0],damaged.factors[1]]=[damaged.factors[1],damaged.factors[0]];
 assert.throws(()=>B.create(damaged),/PROJECTION_CHANGED|FACTOR_INVALID/);
});
check('negative: bad schema cannot masquerade as LADDER',()=>{
 const damaged=structuredClone(raw);damaged.schema='some-other-doc';
 assert.throws(()=>B.create(damaged),/SOURCE_SLICE_INVALID/);
});
console.log('LADDER THREAD ADAPTER '+count+'/'+count+' PASS');
