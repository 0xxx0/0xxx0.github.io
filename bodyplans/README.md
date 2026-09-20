# BODY PLANS

Shared, local-first addressable body geometry for CARE / BODYFIELD-style surfaces.

## Why this exists

CARE 0.2 had inline hand-drawn person/cat silhouettes. BODY experiments had richer geometry but fetched it at runtime. This registry makes body geometry a replaceable local asset rather than UI code or a network dependency.

## Plans

- `human-reference-m` — front/back, 159 addressable fragments across the two views.
- `human-reference-f` — front/back, 158 addressable fragments across the two views.
- `feline-reference` — left/right lateral technical localization plan.

The human plans are **reference renderings**, not personal anatomy. M/F names follow the upstream corpus and do not infer a case subject's sex. CARE stores the selected plan explicitly.

## Contract

Each plan has:

```text
id / kind / label / defaultView
views[view] {
  viewBox
  outlineD
  transform?
  fragments[] { id, label, group, side?, axis?, bbox?, pathData }
}
provenance
```

Stable observation identity uses `plan_id + view + region_id`. Display labels are not identity.

## Runtime rule

No remote image or vector request is required. `registry.js` assigns the registry to `window.BODY_PLAN_REGISTRY` and CARE consumes it locally. Standalone SVGs are included for inspection/reuse.

## Truth boundary

A selected body-plan region says only **where the user/caregiver marked on this reference plan**. It does not assert diagnosis, deep anatomical structure, or registered personal geometry.

See `THIRD_PARTY_NOTICES.md`.
