import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');

test('LIVE exposes source/map/immersion plus remembered-source re-entry without making one remote track sovereign',()=>{
  const root=read('fold-bloom/index.html');
  const html=read('fold-bloom/live/index.html');
  const app=read('fold-bloom/live/app.js');
  assert.match(root,/href="\.\/live\/">ENTER LIVE →<\/a>/);
  assert.doesNotMatch(root,/source=center-mass|PLAY CENTER MASS/);
  assert.match(html,/id="playBtn">PLAY FIELD COURSE →<\/button>/);
  assert.match(html,/id="centerMassBtn">TRY CENTER MASS REMOTE<\/button>/);
  assert.match(html,/id="vaultSelect"/);
  assert.match(html,/data-layer-mode="SOURCE"/);
  assert.match(html,/data-layer-mode="MAP"/);
  assert.match(html,/data-layer-mode="IMMERSION"/);
  assert.match(app,/CENTER_MASS_SOURCE='[0-9a-f-]{36}'/);
  assert.match(app,/sourceOnly=liveTrack\.sourceActive\(\)&&!liveTrack\.mapped\(\)/);
  assert.match(app,/TAP FOR SOURCE/);
  assert.match(app,/REMOTE SOURCE UNAVAILABLE · LIVE READY/);
  assert.match(app,/legacy-center-mass/);
  assert.match(app,/clearSource\(\)/);
  assert.match(app,/dataset\.mode==='SOURCE'/);
  assert.match(app,/putLocalMedia\(/);
  assert.match(app,/listLocalMedia\(/);
});

test('LISTEN makes remembered tracks and Beat Saber pack first-class',()=>{
  const html=read('fold-bloom/listen/index.html');
  const app=read('fold-bloom/listen/app.js');
  const vault=read('fold-bloom/listen/vault-handoff.js');
  assert.match(html,/id="savedSource"/);
  assert.match(html,/id="beatSaberBtn"[^>]*>BEAT SABER PACK<\/button>/);
  assert.match(html,/BEAT SABER · PACK/);
  assert.match(vault,/listLocalMedia/);
  assert.match(app,/buildBeatSaberPack/);
  assert.match(app,/exportBeatSaberPack/);
});


test('LISTEN addressed annotations expose bookmark flag arc and sharing without changing source truth',()=>{
  const html=read('fold-bloom/listen/index.html');
  const app=read('fold-bloom/listen/app.js');
  const lens=read('fold-bloom/listen/stream-lens.js');
  assert.match(html,/id="pinKind"/);
  assert.match(html,/BOOKMARK · point/);
  assert.match(html,/FLAG · point \+ intent/);
  assert.match(html,/ARC · current aperture span/);
  assert.match(html,/id="pinShare"/);
  assert.match(app,/syncPins\(\);updateWorkflow\(\)/);
  assert.match(app,/fold-bloom-annotations\/v0\.1/);
  assert.match(app,/fold-bloom-addressed-message\/v0\.2/);
  assert.match(app,/shareAnnotations:sharePins/);
  assert.match(lens,/endAddress/);
  assert.match(lens,/kind='BOOKMARK'/);
});
