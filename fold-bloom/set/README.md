# FOLD//BLOOM — SET COMPOSITOR 0.1

Status: **MERGED ACTIVE CANDIDATE** via PR #158 · merge `65257b7ed3d8e9afef0324f0775efce90ba8f789` · public-surface-check run 1635 PASS.

Route: `/fold-bloom/set/`

## What it does

- consumes the merged `fold-bloom-experience-set/v0.1` boundary;
- adds exact local source refs by SHA-256 without persisting source bytes;
- authors order, experiential weight and explicit seam laws;
- supports desktop drag and phone long-press drag, plus explicit move buttons;
- imports/exports exact Experience Set JSON;
- persists lightweight authored set state locally.

Interior seams use only `CUT / DISSOLVE / CARRY / RESET`. Final closure remains `RETURN`.

## What it does not do

- no audio concatenation;
- no beatmatching / DJ timeline;
- no source analysis;
- no JOURNEY RIDE yet;
- no SOURCE SPINE app;
- no new Experience Set fields.

The persistent source-spine law remains: identity/address/aperture/authored calibration may travel between projections, but this compositor only owns set authorship.

## Evidence

- core: `/fold-bloom/set/set-core.js`
- tests: `/fold-bloom/set/tests/set-core.test.mjs`
- browser surface: `/fold-bloom/set/?demo=1`
- source schema: `/fold-bloom/experience-set/experience-set.js`

## Stop

Technical promotion is complete: schema tests + phone-sized browser smoke pass. The remaining gate is human: author/reorder a 3–7 source set and decide whether it feels like shaping one journey rather than maintaining a playlist. JOURNEY RIDE 0.1 remains blocked until that receipt.
