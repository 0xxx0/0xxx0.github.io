import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const live=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const ecology=readFileSync(new URL('../../ecology/index.html',import.meta.url),'utf8');
const root=readFileSync(new URL('../../index.html',import.meta.url),'utf8');

test('LIVE is the flagship shell, not a reader-only product',()=>{
  assert.match(live,/<title>FOLD\/\/BLOOM — LIVE<\/title>/);
  assert.match(live,/LIVE · RIDE \/ READ \/ GARDEN \/ RETURN/);
  assert.match(live,/ENTER THE/);
  assert.match(live,/GARDEN \/ OBSERVE/);
  assert.match(live,/READ · PRISON AGE 2021/);
  assert.doesNotMatch(live,/Reader mode is the public default/);
});

test('GARDEN is hosted by LIVE while Ecology remains canonical authority',()=>{
  assert.match(live,/id="gardenFrame"/);
  assert.match(live,/data-src="\.\.\/ecology\/\?embedded=live&garden=1"/);
  assert.match(live,/Ecology keeps gene · lineage · law · breeding · GARDEN · RETURN authority/);
  assert.match(app,/authority:'ECOLOGY'/);
  assert.match(app,/sourceClockBridge:false/);
  assert.match(app,/releaseAuthority:false/);
  assert.match(app,/function openGarden/);
  assert.match(app,/function closeGarden/);
  assert.match(app,/FoldBloomLive=\{boot:'ready',version:VERSION,garden:/);
});

test('opening GARDEN holds LIVE clocks and generated sound before Ecology enters',()=>{
  assert.match(app,/sourceWasPlaying=.*trackAudio.*paused/);
  assert.match(app,/imageSet\.clock\.hold\(\)/);
  assert.match(app,/audio\.setSound\(false\)/);
  assert.match(app,/gardenReturn=\{courseMode,sourceWasPlaying,imageWasRunning,audioSoundOn:/);
  assert.match(app,/setCourseMode\(held\.courseMode\|\|'STEP',false\)/);
});

test('public GARDEN enters the LIVE shell; standalone Ecology remains directly recoverable',()=>{
  assert.match(root,/href="\.\/live\/\?garden=1">GARDEN \/ OBSERVE/);
  assert.match(root,/href="\.\/live\/\?garden=1"><span class="verb">GARDEN \/ OBSERVE/);
  assert.match(root,/href="\.\/ecology\/">ECOLOGY<\/a>/);
});

test('canonical Ecology accepts a LIVE-hosted direct GARDEN launch without borrowed authority',()=>{
  assert.match(ecology,/foldBloomEcologyEmbedded/);
  assert.match(ecology,/foldBloomEcologyHost/);
  assert.match(ecology,/foldBloomEcologyLaunch="garden"/);
  assert.match(ecology,/if\(ecologyLaunchGarden\)/);
  assert.match(ecology,/begin\(false,"FLOW",true\)/);
});
