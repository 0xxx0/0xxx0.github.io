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

// Lineage guard: current Atlas Dayline and the exact recovered painting-backed
// ancestor are deliberately related but authority-distinct objects.
const atlasRelease=JSON.parse(fs.readFileSync('atlas-dayline/release.json','utf8'));
const paintingRecovery=JSON.parse(fs.readFileSync('recovery/semantic-painting-v0.8/recovery.json','utf8'));
const paintingHtml=fs.readFileSync('recovery/semantic-painting-v0.8/index.html','utf8');
assert.equal(atlasRelease.route,'/atlas-dayline/','current Atlas Dayline route drifted');
assert.equal(paintingRecovery.id,'SEMANTIC-PAINTING-V0.8-ATLAS-DAYLINE','painting donor identity drifted');
assert.equal(paintingRecovery.role,'DONOR_EXACT_SOURCE','painting ancestor must remain donor authority');
assert.ok(paintingRecovery.lineage.ancestor_of.includes('/atlas-dayline/'),'painting ancestor must declare current Atlas Dayline descendant');
assert.equal(atlasRelease.historical_donor?.id,paintingRecovery.id,'current release must point back to exact recovered donor');
assert.equal(atlasRelease.historical_donor?.relationship,'EXACT_RECOVERED_ANCESTOR_DONOR','current release must not flatten donor into current authority');
assert.match(paintingHtml,/<title>POLY \/\/ Forward Field — Semantic Painting v0\.8 · Atlas Dayline<\/title>/,'exact recovered painting title missing');
assert.match(paintingHtml,/YOU’RE AWAKE \/\//,'painting-backed source must retain its visible AWAKE identity');
assert.match(paintingHtml,/class="underpainting"/,'painting-backed source must retain literal underpainting layer');
assert.match(paintingRecovery.identity_witness?.boundary||'',/NOT THE CURRENT BRANCH I ATLAS DAYLINE PLANNER/,'recovery boundary must reject current/donor conflation');
assert.match(atlasRelease.historical_donor?.boundary||'',/not this current Branch I planning surface/,'current release must reject painting/current conflation');

console.log('DAYLINE FLOW source selftest PASS · one held object · one explicit primary · zero-hunt traversal · passive AWAKE refresh · painting ancestor authority distinct');
