# POLY // Atlas Dayline — Branch I

A local-first radial-linear planning experiment.

## Core loop

`SEE → SIMULATE → COMPARE → ACT → RUN ≤ 3 → RETURN`

- **Atlas**: opportunity field; angle=time, radius=derived activation cost.
- **Plain**: same canonical task IDs and ranking without the spatial claim.
- **Scenario**: counterfactual time/context preview; does not mutate canon until APPLY.
- **TIDE**: hourly non-mutating sweep of which work becomes cheap.
- **RUN FIT**: checks whether the bounded route fits before the next hard anchor.
- **Gap Pack**: proposes up to the remaining RUN capacity, preview-only until ACT.
- **Stress +30/+60**: delay counterfactual exposing misses/cost degradation.
- **Return / Replay**: checksum-backed local receipt and restoration.
- **Capsule**: optionally encodes the current bounded state into the URL fragment for explicit sharing; otherwise state remains in browser localStorage.

## Privacy

The public sample is synthetic. The app has no backend and no analytics. Personal state remains in the browser unless you explicitly export JSON or copy a capsule URL.

## Proof rule

Atlas earns survival only when it reveals useful actionability, reorientation, bundling, or temporal structure that the Plain ablation does not make equally cheap to see.
