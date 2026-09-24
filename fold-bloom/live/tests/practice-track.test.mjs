import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPracticeMap} from '../practice-track.js';
import {buildTrackfield} from '../trackfield.js';

test('practice course is deterministic and has real musical terrain variation',()=>{
  const a=createPracticeMap(),b=createPracticeMap();
  assert.deepEqual(a,b);
  assert.ok(a.frames.length>1000);
  assert.ok(a.sections.length>=6);
  const energies=a.frames.map(x=>x.e);
  assert.ok(Math.max(...energies)-Math.min(...energies)>.6);
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

test('built-in demo exposes a gesture-safe audio path instead of forcing silence',()=>{
  const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/id="soundGate"[^>]*>TAP FOR SOUND<\/button>/);
  assert.match(app,/async function enableFieldAudio\(\)/);
  assert.match(app,/const toggleAutopilot=async\(\)=>\{[\s\S]*if\(audio\.soundOn\)await ensureAudio\(\)/);
  assert.match(app,/launchParams\.get\('demo'\)===?'1'[\s\S]*syncSoundGate\(!audio\.ctx,'FIELD'\)/);
  assert.doesNotMatch(app,/launchParams\.get\('demo'\)===?'1'[\s\S]{0,240}audio\.setSound\(false\)/);
  assert.doesNotMatch(app,/\#soundBtn'\)\.onclick=async\(\)=>\{stopDemo/);
});
