import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../../../'+path,import.meta.url),'utf8');

test('LIVE exposes source/map/immersion plus remembered-source re-entry',()=>{
  const html=read('fold-bloom/live/index.html');
  const app=read('fold-bloom/live/app.js');
  assert.match(html,/id="centerMassBtn"/);
  assert.match(html,/id="vaultSelect"/);
  assert.match(html,/data-layer-mode="SOURCE"/);
  assert.match(html,/data-layer-mode="MAP"/);
  assert.match(html,/data-layer-mode="IMMERSION"/);
  assert.match(app,/CENTER_MASS_SOURCE='[0-9a-f-]{36}'/);
  assert.match(app,/sourceOnly=liveTrack\.sourceActive\(\)&&!liveTrack\.mapped\(\)/);
  assert.match(app,/putLocalMedia\(/);
  assert.match(app,/listLocalMedia\(/);
});

test('LISTEN makes remembered tracks and Beat Saber draft first-class',()=>{
  const html=read('fold-bloom/listen/index.html');
  const app=read('fold-bloom/listen/app.js');
  const vault=read('fold-bloom/listen/vault-handoff.js');
  assert.match(html,/id="savedSource"/);
  assert.match(html,/id="beatSaberBtn"[^>]*>BEAT SABER<\/button>/);
  assert.match(html,/BEAT SABER · DRAFT/);
  assert.match(vault,/listLocalMedia/);
  assert.match(app,/ExpertPlusStandard\.dat/);
  assert.match(app,/exportBeatSaberDraft/);
});
