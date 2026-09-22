# FOLD//BLOOM — SET COMPOSITOR 0.1.1

Status: implementation candidate over merged SET 0.1. Baseline PR #158 · merge `65257b7ed3d8e9afef0324f0775efce90ba8f789`; state seal PR #159 · merge `f60a9d6d8ba696f9d1223d4814375871a4b2b1b4`.

Route: `/fold-bloom/set/`

## What 0.1 already does

- consumes the merged `fold-bloom-experience-set/v0.1` boundary;
- adds exact local source refs by SHA-256 without persisting source bytes;
- authors order, experiential weight and explicit seam laws;
- supports desktop drag and phone long-press drag, plus explicit move buttons;
- imports/exports exact Experience Set JSON;
- persists lightweight authored set state locally.

Interior seams use only `CUT / DISSOLVE / CARRY / RESET`. Final closure remains `RETURN`.

## 0.1.1 delta — local test packs

The uploaded audio is now represented as **hash-recognized local test evidence**, not repository media.

### Default three-track seed

`preforme` → `THROUGH THE FIRE` → `BY YOUR WILL / 遺志`

Suggested authored arc: `GHOST → FORGE → WILL`.

Suggested seams:

- `preforme` → `CARRY`
- `THROUGH THE FIRE` → `DISSOLVE`
- `BY YOUR WILL / 遺志` → `RETURN`

The suggestion is applied only through an explicit button after all three exact local files are selected. The user may immediately reorder, reweight or change every seam.

### Separate long-form stress source

`Aperiodic geometry stops human model collapse` is kept outside the default music journey. Its useful role is:

- ~39m53s long-form source handling;
- LISTEN address/aperture pressure;
- transcript lookup and future anchor/warp calibration;
- first podcast-adapter evidence.

### Privacy boundary

- catalog stores SHA-256 and bounded descriptive metadata only;
- raw audio bytes are not committed, fetched or embedded;
- hash recognition does not grant authorship, source or analysis authority;
- origin IDs are provenance witnesses, not provider dependencies.

## What it does not do

- no audio concatenation;
- no beatmatching / DJ timeline;
- no source analysis;
- no JOURNEY RIDE yet;
- no SOURCE SPINE app;
- no provider catalog;
- no new Experience Set fields.

The persistent source-spine law remains: identity/address/aperture/authored calibration may travel between projections, but this compositor only owns set authorship.

## Evidence

- set core: `/fold-bloom/set/set-core.js`
- set tests: `/fold-bloom/set/tests/set-core.test.mjs`
- test-pack catalog: `/fold-bloom/test-packs/catalog.json`
- recognition/planning core: `/fold-bloom/test-packs/test-pack-core.js`
- catalog tests: `/fold-bloom/test-packs/tests/test-pack-core.test.mjs`
- generic demo: `/fold-bloom/set/?demo=1`
- hash-only seed demo: `/fold-bloom/set/?demo=seed`
- source schema: `/fold-bloom/experience-set/experience-set.js`

## Stop

Verify pure tests and the existing phone-sized SET browser smoke. Then use the three real local tracks: confirm recognition, explicitly apply the seed arc, alter at least one order/weight/seam, export/re-import, and decide whether the result feels like shaping one journey. JOURNEY RIDE remains blocked until that receipt.
