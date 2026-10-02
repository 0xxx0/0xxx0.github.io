import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('dayline/index.html','utf8');
const js=fs.readFileSync('dayline/app.js','utf8');
const css=fs.readFileSync('dayline/app.css','utf8');

for(const id of ['flow','flowPosition','prevFocusBtn','flowPrimaryBtn','nextFocusBtn','moveDetails']){
  assert.match(html,new RegExp('id="'+id+'"'),id+' missing');
}
assert.match(html,/<details class="next" id="moveDetails">/,'secondary moves must be collapsed disclosure');
assert.match(js,/function flowTasks\(\)/,'ranked local flow missing');
assert.match(js,/function focusByStep\(delta\)/,'focus traversal missing');
assert.match(js,/function triggerPrimary\(\)/,'single primary action missing');
assert.match(js,/if\(!t\.sourceLink\).*auto-after-done/s,'local completion must auto-advance focus only');
assert.match(js,/setInterval\(\(\)=>\{if\(!document\.hidden\)refreshLive\(\)\},90000\)/,'passive live refresh cadence missing');
assert.match(js,/announce:away>90000/,'AWAKE return-to-tab threshold missing');
assert.match(js,/ArrowDown.*toLowerCase\(\)==='j'/s,'J/down traversal missing');
assert.match(js,/ArrowUp.*toLowerCase\(\)==='k'/s,'K/up traversal missing');
assert.match(js,/e\.key==='Enter'.*triggerPrimary/s,'Enter primary missing');
assert.match(js,/e\.key==='\/'/,'capture shortcut missing');
assert.match(css,/\.flow\{position:sticky/,'FLOW should remain reachable without a new route');
assert.doesNotMatch(js,/setInterval\([^\n]*triggerPrimary/,'refresh must never auto-execute primary effects');

console.log('DAYLINE FLOW source selftest PASS · one held object · one explicit primary · zero-hunt traversal · passive AWAKE refresh');
