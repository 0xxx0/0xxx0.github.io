# FOLD//BLOOM — EXPERIENCE SET v0.1

Status: **MERGED COMPLETE** via PR #152; bookkeeping sealed by PR #154. No compositor or runtime behavior is introduced here.

## Contract

`fold-bloom-experience-set/v0.1` is the higher-order authored journey object specified by `../convergence/EXPERIENCE_COMPILER_SPEC_0.1.md`.

It preserves the existing chain:

`SOURCE → MAP → PROFILE → PROJECTION → HUMAN OPERATION → RETURN`

A set orders source-cell references and authored transition/profile state. It does not contain source bytes, rewrite child source identity, mutate SOURCE MAP evidence, or claim projection/runtime authority.

The only transition laws admitted in v0.1 are `CUT / DISSOLVE / CARRY / RESET / RETURN`.

`acts` and set-level `profile` remain opaque JSON-compatible authored fields because the convergence packet names them but does not yet define additional schema. This implementation deliberately does not invent that ontology.

## Exact paths

- schema + validator + codec: `/fold-bloom/experience-set/experience-set.js`
- fixture: `/fold-bloom/experience-set/fixtures/two-source-set.json`
- tests: `/fold-bloom/experience-set/tests/experience-set.test.mjs`
- evidence receipt: `/returns/FOLD_BLOOM_EXPERIENCE_SET_010_2026-09-22.json`

## Evidence

- baseline: `master@fe5aff346592b514a481bc36db84490a8b61ad17`
- implementation PR: `#152` · merge `8debd93298b29a19b2c0d7f7672a053f56ccbe98`
- merge-state seal: `#154` · merge `0b3ee70c774eaf3ee1a351b4dac5be5108b4f225`
- convergence PR: `#150`, merge `c04128f826f556bfe7a45ae3102920a2685844d4`
- source spec blob: `c894f611d26893590ca81c5b52c93e763c07ba59`
- local proof command: `node --test fold-bloom/experience-set/tests/experience-set.test.mjs`
- proof: round-trip equality, entry order preservation, detached decode, five-law closure, undeclared-field rejection.

## Stop condition

This pass is closed: schema, fixture, encode/decode round-trip, CI test and receipt exist and pass. The successor may now enter SET COMPOSITOR 0.1, while preserving this schema as a pure boundary rather than expanding it opportunistically.
