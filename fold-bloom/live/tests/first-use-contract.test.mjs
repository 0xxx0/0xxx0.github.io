import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root=readFileSync(new URL('../../index.html',import.meta.url),'utf8');
const live=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../app.css',import.meta.url),'utf8');
const play=readFileSync(new URL('../play.js',import.meta.url),'utf8');

test('public first contact is action-first without inventing source shortcuts',()=>{
  assert.match(root,/TRY IT FIRST · THE SYSTEM WORDS CAN WAIT/);
  assert.match(root,/TRY A RIDE →/);
  assert.doesNotMatch(root,/source=example/);
  assert.match(root,/href="\.\/live\/\?garden=1">WATCH A GARDEN →/);
});

test('LIVE teaches one turn-release-change loop before deeper vocabulary',()=>{
  assert.match(live,/THE WHOLE LOOP/);
  assert.match(live,/TURN\.<br><span>RELEASE\.<\/span>/);
  assert.match(live,/TRY THE EXAMPLE/);
  assert.match(live,/NO SONG \/ JUST PLAY/);
  assert.match(app,/TURN UNTIL READY/);
  assert.match(play,/TURN ← \/ → UNTIL THE CENTER ACTION LIGHTS/);
});

test('phone primary controls contract to turn-release-turn while depth remains',()=>{
  assert.match(css,/@media\(max-width:620px\)[\s\S]*?\.bottom\{grid-template-columns:48px minmax\(0,1fr\) 48px/);
  assert.match(css,/\.bottom \.mode,\.bottom \.scene\{display:none\}/);
  assert.match(play,/dataset\.fbPrimaryControlSet=innerWidth<=620\?'TURN_RELEASE_TURN':'MODE_RELEASE_WORLD'/);
  assert.match(live,/id="modeBtn"/);
  assert.match(live,/id="sceneBtn"/);
});

test('hosted GARDEN survives the comprehension contraction',()=>{
  assert.match(live,/id="gardenFrame"/);
  assert.match(live,/data-src="\.\.\/ecology\/\?embedded=live&garden=1"/);
  assert.match(live,/id="gardenOpenBtn">WATCH GARDEN/);
  assert.match(app,/sourceClockBridge:false/);
  assert.match(app,/releaseAuthority:false/);
  assert.match(app,/view\.src='about:blank'/);
});
