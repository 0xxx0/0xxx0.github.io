import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const live=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const ecology=readFileSync(new URL('../../ecology/index.html',import.meta.url),'utf8');
const root=readFileSync(new URL('../../index.html',import.meta.url),'utf8');

test('LIVE may lead with authored reading while preserving READ and hosted GARDEN apertures',()=>{
  assert.match(live,/<title>FOLD\/\/BLOOM — LIVE 0\.13<\/title>/);
  assert.match(live,/LIVE 0\.13 · RIDE \/ READ \/ GARDEN \/ RETURN/);
  assert.match(live,/RECOVERED SOURCE → LIVE TRAVERSAL → RECURRENCE → RETURN/);
  assert.match(live,/READ WHAT<br><span>REARRANGES\.<\/span>/);
  assert.match(live,/id="authoredIntroBtn">ENTER · PRISON AGE 2021/);
  assert.match(live,/OTHER SOURCES \/ PLAY MODES/);
  assert.match(live,/id="gardenOpenBtn">WATCH GARDEN/);
  assert.match(live,/GARDEN keeps Ecology authority/);
});

test('GARDEN is hosted by LIVE while Ecology remains canonical authority',()=>{
  assert.match(live,/id="gardenFrame"/);
  assert.match(live,/id="gardenView"[^>]*data-src="\.\.\/ecology\/\?embedded=live&garden=1"/);
  assert.doesNotMatch(live,/id="gardenView"[^>]*\ssrc=/);
  assert.match(live,/Ecology keeps gene · lineage · law · breeding · GARDEN · RETURN authority/);
  assert.match(app,/authority:'ECOLOGY'/);
  assert.match(app,/canonical:'\/fold-bloom\/ecology\/'/);
  assert.match(app,/sourceClockBridge:false/);
  assert.match(app,/releaseAuthority:false/);
  assert.match(app,/function openGarden/);
  assert.match(app,/function closeGarden/);
  assert.match(app,/view\.src='about:blank'/);
});

test('opening GARDEN holds LIVE source clocks and generated sound',()=>{
  assert.match(app,/sourceWasPlaying=.*trackAudio.*paused/);
  assert.match(app,/imageSet\.clock\.hold\(\)/);
  assert.match(app,/audio\.setSound\(false\)/);
  assert.match(app,/gardenReturn=\{courseMode,sourceWasPlaying,imageWasRunning,audioSoundOn:/);
  assert.match(app,/setCourseMode\(held\.courseMode\|\|'STEP',false\)/);
});

test('public GARDEN enters LIVE while standalone Ecology remains recoverable',()=>{
  assert.match(root,/href="\.\/live\/\?garden=1">WATCH A GARDEN/);
  assert.match(root,/href="\.\/live\/\?garden=1"><span class="verb">GARDEN<\/span>/);
  assert.match(root,/href="\.\/ecology\/">ECOLOGY<\/a>/);
});

test('Ecology recognizes the hosted LIVE launch without borrowed authority',()=>{
  assert.match(ecology,/foldBloomEcologyEmbedded/);
  assert.match(ecology,/foldBloomEcologyHost/);
  assert.match(ecology,/foldBloomEcologyLaunch="garden"/);
  assert.match(ecology,/if\(ecologyLaunchGarden\)/);
  assert.match(ecology,/begin\(false,"FLOW",true\)/);
});
