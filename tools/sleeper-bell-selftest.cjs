#!/usr/bin/env node
// SLEEPER / THE BELL — executable source/physics contract.
// Run: node tools/sleeper-bell-selftest.cjs
'use strict';
const assert=require('node:assert/strict');
const B=require('../sleeper/bell-world.js');
let assertions=0;
function ok(x,msg){assert.ok(x,msg);assertions++}
function eq(a,b,msg){assert.deepEqual(a,b,msg);assertions++}
function denied(f,msg){assert.throws(f,/HEAR_FIRST|DECISION_NOT_AVAILABLE/,msg);assertions++}
function walk(s,x,y,limit=600){
  for(let i=0;i<limit;i++){
    if(Math.hypot(s.x-x,s.y-y)<.12)return true;
    // The ring's TURN aperture is allowed to set heading directly.
    s.a=Math.atan2(y-s.y,x-s.x);
    B.step(s,1,0,.04);
  }
  return Math.hypot(s.x-x,s.y-y)<.12;
}
function toFork(){
  const s=B.create();
  denied(()=>B.choose(s,'notice'),'decision before contact');
  ok(!B.openCell(s,18.5,10.5),'lower gate initially closed');
  ok(walk(s,9.5,8.5),'walk to sound');
  ok(s.heard,'contact happened');
  denied(()=>B.choose(s,'notice'),'decision before fork');
  ok(walk(s,14.5,8.5),'walk to fork');
  ok(B.canChoose(s),'fork offers action');
  return s;
}
let s=toFork();
B.choose(s,'follow');
ok(!B.openCell(s,18.5,10.5),'follow does not open gate');
denied(()=>B.choose(s,'notice'),'cannot cut pull before experiencing loop');
ok(walk(s,21.5,8.5),'approach upper turn');
ok(walk(s,21.5,3.5),'reach upper gallery');
walk(s,9.5,3.5);
ok(s.loops>=1,'upper gallery folded to bell');
const fork=s.history.findIndex(p=>B.canChoose(p));
ok(fork>=0,'fork event recorded for rewind');
B.choose(s,'notice');
ok(B.openCell(s,18.5,10.5),'cut opens lower gate');
ok(walk(s,18.5,8.5),'reach lower junction');
ok(walk(s,18.5,13.5),'actually cross lower gate');
walk(s,23.5,13.5);
ok(s.won,'exit reached via real movement');
const out=B.exportState(s);
eq(out.actions.won,true,'return witnesses enacted exit');
eq(out.source.bytesRedistributed,false,'no third-party book bytes exported');
ok(out.actions.loops>=1,'return witnesses the loop');
B.rewind(s,fork);
ok(s.choice===null&&!s.opened&&!s.won,'rewind restores branchable causal state');
ok(!B.openCell(s,18.5,10.5),'rewind re-closes lower gate');
ok(s.ghost.length>0,'abandoned future appears only as ghost');
B.choose(s,'notice');
ok(s.opened&&s.loops===0,'alternate future can open without forced loop');
s=toFork();
B.choose(s,'notice');
ok(walk(s,18.5,8.5),'direct branch can reach gate');
ok(walk(s,18.5,13.5),'direct branch traverses gate');
walk(s,23.5,13.5);
ok(s.won,'direct notice branch completes');
ok(B.grid().length===17&&B.grid()[0].length===25,'source grid dimensions retained');
for(let i=0;i<128;i++){const hit=B.ray(s,i*Math.PI/64);ok(hit.d>0&&Number.isFinite(hit.d),'DDA bounded '+i)}
// AXIS TIME IS NOT IDLE TIME — only enacted changes mint history marks.
const idle=B.create();idle.history.push({...idle});
for(let k=0;k<9000;k++)B.step(idle,0,0,.04);
eq(idle.history.length,1,'six idle minutes do not erase the source origin');
B.step(idle,1,0,.04);
ok(idle.history.length>1,'real movement creates a timeline address');
// The ghost is an alternate history visible from within space, never an opaque X-ray.
const echo=B.create();echo.ghost=[[4.5,8.5],[6.5,8.5],[9.5,8.5]];
const images=B.ghostProjection(echo,390,844);
ok(images.length>0&&images.every(g=>Number.isFinite(g.x)&&g.radius>0),'ghost appears ahead in first-person view');
const occluded=B.create();occluded.ghost=[[23.5,13.5]];
eq(B.ghostProjection(occluded,390,844).length,0,'ghost hidden behind current physical walls');
ok(B.ghostProjection(occluded,0,844).length===0,'zero viewport projects nothing');
// The first-person route itself enacts FOLLOW when the fork is crossed.
const unprompted=toFork();
ok(unprompted.choice===null,'fork has no pre-selected answer');
ok(walk(unprompted,16.2,8.5),'cross fork by moving forward');
eq(unprompted.choice,'follow','continuation physically admits upper loop');
ok(!unprompted.opened,'continuation does not silently open lower gate');
denied(()=>B.choose(unprompted,'notice'),'release not licensed until fold witnessed');
ok(walk(unprompted,21.5,8.5),'natural pull reaches upper turn');
ok(walk(unprompted,21.5,3.5),'natural pull reaches gallery');
walk(unprompted,9.5,3.5);
ok(unprompted.loops>=1,'unprompted continuation physically folds');
B.choose(unprompted,'notice');
ok(B.openCell(unprompted,18.5,10.5),'subsequent deliberate cut changes real topology');
// Ring is an actionable mobile control: 47.6px core diameter at CSS 107px.
eq(B.ringZone(0),'CORE','ring centre selects actual conditional action');
eq(B.ringZone(40),'CORE','full mobile minimum action hit target');
eq(B.ringZone(41),'REWIND','inner dial retains history aperture');
eq(B.ringZone(62),'REWIND','inner and outer regions are distinct');
eq(B.ringZone(63),'TURN','outer dial retains heading aperture');
process.stdout.write('PASS '+assertions+' assertions / enacted route, quiet timeline, spatial ghost, conditional RETURN\n');
