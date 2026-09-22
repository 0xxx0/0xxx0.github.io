# FOLD//BLOOM — EXPERIENCE SET v0.1

Status: bounded pure-schema implementation candidate. No compositor or runtime behavior is introduced here.

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
- convergence PR: `#150`, merge `c04128f826f556bfe7a45ae3102920a2685844d4`
- source spec blob: `c894f611d26893590ca81c5b52c93e763c07ba59`
- local proof command: `node --test fold-bloom/experience-set/tests/experience-set.test.mjs`
- proof: round-trip equality, entry order preservation, detached decode, five-law closure, undeclared-field rejection.

## Stop condition

Stop when the pure schema, fixture, encode/decode round-trip, CI test, and receipt exist and pass. Do not start SET COMPOSITOR, JOURNEY RIDE, SOURCE SHELL, adapter work, or new ExperienceAct/SetProfile ontology in this pass.
