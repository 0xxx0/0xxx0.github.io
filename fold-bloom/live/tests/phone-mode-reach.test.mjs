import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Protective static test for the R1 restore (2026-09-29): the phone bar (<=620px)
// hides #modeBtn (.bottom .mode{display:none}) while the law (release.json
// play_shell.mobile_interaction) requires MODE to remain secondary/reachable.
// The lawful reach path is ONE mirror control inside the settings drawer bound to
// the same toggleMode(). This test fails if that path is removed, unbound, or hidden.

const live=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../app.css',import.meta.url),'utf8');

const drawer=(live.match(/<aside class="drawer" id="settings">[\s\S]*?<\/aside>/)||[''])[0];
const bottom=(live.match(/<div class="bottom">[\s\S]*?<\/div>/)||[''])[0];

test('phone MODE toggle keeps a lawful secondary reach inside the settings drawer',()=>{
  assert.ok(drawer,'settings drawer present');
  assert.match(drawer,/id="modeDrawerBtn"/);
  assert.match(drawer,/<div class="row"><button id="modeDrawerBtn" aria-label="[^"]+"/);
  assert.ok(!bottom.includes('modeDrawerBtn'),'drawer mirror is not a primary bar control');
  assert.match(bottom,/<button class="mode" id="modeBtn">RATCHET<\/button>/);
  assert.match(app,/\$\('#modeBtn'\)\.onclick=\(\)=>\{stopDemo\(true\);toggleMode\(\)\}/);
  assert.match(app,/\$\('#modeDrawerBtn'\)\.onclick=\(\)=>\{stopDemo\(true\);toggleMode\(\)\}/);
  assert.match(app,/\$\('#modeBtn'\)\.textContent=state\.mode/);
  assert.match(app,/\$\('#modeDrawerBtn'\)\.textContent=[^;]*state\.mode/);
  assert.match(app,/\$\('#modeDrawerBtn'\)\.setAttribute\('aria-label'/);
});

test('drawer mirror stays tappable under the <=620px bar contraction',()=>{
  assert.match(css,/\.drawer \.row button\{[^}]*min-height:44px\}/);
  assert.match(css,/@media\(max-width:620px\)[\s\S]*?\.drawer \.row button\{min-height:46px\}/);
  assert.match(css,/\.bottom \.mode,\.bottom \.scene\{display:none\}/);
  assert.doesNotMatch(css,/#modeDrawerBtn/);
});