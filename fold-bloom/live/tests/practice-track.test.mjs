import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPracticeMap,PracticeTrack} from '../practice-track.js';
import {buildTrackfield} from '../trackfield.js';

test('practice course is deterministic and has real musical terrain variation',()=>{
  const a=createPracticeMap(),b=createPracticeMap();
  assert.deepEqual(a,b);
  assert.ok(a.frames.length>1000);
  assert.ok(a.sections.length>=6);
  const energies=a.frames.map(x=>x.e);
  assert.ok(Math.max(...energies)-Math.min(...energies)>.6);
});

test('practice field is still by default and advances only on explicit beats',()=>{
  const p=new PracticeTrack({duration:96,bpm:120});
  assert.equal(p.paused,true);
  assert.equal(p.time(1000),0);
  assert.equal(p.time(9000),0);
  assert.equal(p.transport(9000).playing,false);
  assert.equal(p.advance(1,9000),0.5);
  assert.equal(p.time(20000),0.5);
  assert.equal(p.transport(20000).playing,false);
  p.resume(20000);
  assert.equal(p.transport(20500).playing,true);
  assert.ok(Math.abs(p.time(20500)-1)<1e-9);
  p.pause(20500);
  assert.ok(Math.abs(p.time(26000)-1)<1e-9);
});

test('practice course yields visible climb, descent, turn and velocity variation',()=>{
  const map=createPracticeMap();
  const world=buildTrackfield(map,6,{horizon:13.5,count:56});
  assert.ok(world);
  const grades=world.points.map(p=>p.grade);
  const speeds=world.points.map(p=>p.speed);
  const bends=world.points.map(p=>p.bend);
  assert.ok(Math.max(...grades)>.18);
  assert.ok(Math.min(...grades)<-.18);
  assert.ok(Math.max(...speeds)-Math.min(...speeds)>.35);
  assert.ok(Math.max(...bends)-Math.min(...bends)>.25);
});

test('plain LIVE is quiet-still while explicit demo and sound remain available',()=>{
  const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/id="soundGate"[^>]*>TAP FOR SOUND<\/button>/);
  assert.match(html,/id="playBtn">NO SONG \/ JUST PLAY →<\/button>/);
  assert.match(html,/Add a song if you want the road to move with music/);
  assert.match(html,/AUTOPILOT and generated sound are explicit opt-ins/);
  assert.match(app,/async function enableFieldAudio\(\)/);
  assert.match(app,/advancePracticeField\(1\)/);
  assert.match(app,/renderer\.setMotionActive\(!!linkedTrack\?\.playing\)/);
  assert.match(app,/foldBloomLaunch='still'/);
  assert.match(app,/launchParams\.get\('demo'\)===?'1'[\s\S]*startDemo\(\{preview:true\}\)/);
  assert.doesNotMatch(app,/else setTimeout\(\(\)=>\{if\(\$\('#intro'\)\.classList\.contains\('on'\).*startDemo/);
  const boot=app.match(/\$\('#playBtn'\)\.onclick=\(\)=>\{([^}]+)\}/)?.[1]||'';
  assert.match(boot,/applyRidePreset\('DRIVE',false\)/);
  assert.match(boot,/audio\.setSound\(false\)/);
  assert.match(boot,/practiceTrack\.pause\(\)/);
  assert.match(boot,/courseMode='STEP'/);
  assert.doesNotMatch(boot,/enableFieldAudio|startDemo|toggleAutopilot/);
  assert.match(boot,/DRIVE FIELD · STILL · RELEASE ADVANCES ONE BEAT/);
});
