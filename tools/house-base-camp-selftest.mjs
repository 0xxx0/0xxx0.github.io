import assert from 'node:assert/strict';
import fs from 'node:fs';

const base=fs.readFileSync('house/base-camp.js','utf8');
const mini=fs.readFileSync('house/mini.js','utf8');

assert.doesNotThrow(()=>new Function(base),'base-camp.js parses');
assert.match(mini,/\.\/base-camp\.js/,'canonical HOUSE root loads BASE CAMP through existing mini adapter');
assert.match(base,/V\.unshift\('BASE'\)/,'BASE is one projection in the existing HOUSE view grammar');
assert.match(base,/if\(!location\.hash\|\|location\.hash==='\#'\)view='BASE'/,'unaddressed HOUSE root opens BASE while explicit hashes survive');
assert.match(base,/houseBaseCampLocalV01/,'kit/run state is browser-local');
assert.match(base,/atlas-dayline-handoff\/v0\.1/,'SET OUT reuses existing Dayline handoff');
assert.match(base,/house-care-episode\/v0\.1/,'SERVICE/UNKNOWN RETURN reuses HOUSE CARE residue');
assert.match(base,/BODY','GARMENT','HARNESS','SUIT','FURNITURE','ROOM','HOUSE/,'ENV-0 recovered scale ladder retained');
assert.match(base,/CATALOG ≠ INVENTORY ≠ LOADOUT ≠ LOCATION/,'inventory/loadout identities remain unequal');
assert.match(base,/does not prove possession, readiness, presence, or device state/,'truth boundary is visible');
assert.match(base,/RETURN · READY/,'clean return can close without manufacturing maintenance residue');
assert.match(base,/RETURN · SERVICE/,'service return is explicit');
assert.match(base,/RETURN · UNKNOWN/,'unknown return remains representable');
assert.doesNotMatch(base,/\bfetch\s*\(|XMLHttpRequest|new\s+WebSocket/,'BASE CAMP has no network client');
assert.doesNotMatch(base,/HA_TOKEN|HOME_ASSISTANT_TOKEN|SUPERVISOR_TOKEN|service\/call/,'BASE CAMP carries no HA credential/service surface');
assert.doesNotMatch(base,/\bscore\b|\bXP\b|streak/i,'no gamified productivity scoring');

console.log('HOUSE BASE CAMP PASS · one root projection · local kit refs · ENV-0 coupling · Dayline SET OUT · CARE RETURN · no actuation');
