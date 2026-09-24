import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTextCourse,nodeForProgress,courseReturn,COURSE_SCHEMA} from '../course.js';

test('short text remains direct addressed word loci',()=>{
  const src='one two three four five six seven eight nine ten eleven twelve thirteen';
  const c=buildTextCourse(src,{maxLoci:16});
  assert.equal(c.schema,COURSE_SCHEMA);
  assert.equal(c.strategy,'WORDS');
  assert.equal(c.nodes.length,13);
  assert.equal(c.coveredWords,13);
  assert.match(c.nodes[0].address,/^text:\/\/0:3$/);
});

test('large text groups without silently dropping words',()=>{
  const src=Array.from({length:101},(_,i)=>'word'+i).join(' ');
  const c=buildTextCourse(src,{maxLoci:16});
  assert.equal(c.strategy,'GROUPED_WORDS');
  assert.ok(c.nodes.length<=16);
  assert.equal(c.wordCount,101);
  assert.equal(c.coveredWords,101);
  assert.equal(c.coverage.start,0);
  assert.equal(c.coverage.end,src.length);
  assert.equal(new Set(c.nodes.map(x=>x.address)).size,c.nodes.length);
});

test('source progress resolves to an exact addressed locus',()=>{
  const src=Array.from({length:80},(_,i)=>'w'+i).join(' ');
  const c=buildTextCourse(src,{maxLoci:16});
  const n=nodeForProgress(c,.5);
  assert.ok(n);
  assert.ok(n.start<=src.length*.55&&n.end>=src.length*.4);
  assert.match(n.address,/^text:\/\/\d+:\d+$/);
});

test('LOCI return keeps exact source and measured training residue',()=>{
  const src='alpha beta gamma delta';
  const c=buildTextCourse(src);
  const r=courseReturn(c,{step:2,hits:2,hidden:true});
  assert.equal(r.source.text,src);
  assert.equal(r.evidence.coveredWords,4);
  assert.equal(r.training.hits,2);
  assert.equal(r.training.hidden,true);
});
