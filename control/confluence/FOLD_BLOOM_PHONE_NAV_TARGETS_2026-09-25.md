# FOLD//BLOOM PHONE NAV TARGETS — 2026-09-25

## Trigger

The compressed Hermes cross-session census preserved one product-facing claim: some FIELD LAB / INK navigation targets were reportedly 11–23px tall on a 390px phone.

## Re-verification

Current source independently confirms the underlying mismatch:

- LAB buttons and mobile mode cells already use a 34px minimum/control height.
- INK buttons already use a 34px minimum height.
- Both route footers exposed navigation as plain text anchors with no target-height floor.
- The shared showcase route adapter also uses 34px fixed navigation controls.

The exact historical 11–23px measurements are not adopted as current truth; the source-level mismatch is sufficient and reproducible.

## Delta

Only footer navigation anchors in LAB and INK gain the existing compact 34px target floor. No route, label, state store, engine or navigation model changes.

## Why this qualifies as convergence

A reported cross-session residue was not turned into backlog. It was:

`REPORTED → RE-VERIFY AT CURRENT HOST → smallest delta → CI guard → RETURN`.

That is the intended use of the App Atlas / donor / mechanism machinery.

## Stop

The rest of Fold/Bloom phone UX remains evidence-gated. Do not generalize 34px into a universal design law or widen targets elsewhere without direct friction.
