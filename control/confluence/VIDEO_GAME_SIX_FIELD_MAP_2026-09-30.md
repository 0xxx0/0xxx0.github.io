# SIX GAME DONORS → CURRENT FIELD — 2026-09-30

**State:** current-host convergence / no new app  
**Updated:** 2026-10-03  
**Rule:** GAME DONOR ≠ GAME SKIN. Transfer only an abstract invariant into an existing owner, preserve non-transfer residue, and prove or explicitly bound the claim.

| Donor | FIELD friction | Transferable rule | Current FIELD mechanism | One implementation idea | Status |
|---|---|---|---|---|---|
| **Outer Wilds** | re-entry loses what was learned and what remains unresolved | **WORLD/SESSION RESET ≠ KNOWLEDGE RESET. Re-entry should preserve known structure and surface only declared unresolved edges.** | FIELD held object → collapsed **RESIDUE / MORE HERE** derived only from `evolution.question`, `open_gaps[]`, or unresolved `field.exit_paths[]`; CONTINUITY/RETURN preserve source evidence | Keep unresolved knowledge on the currently held object rather than reviving a quest-log aggregate; selecting a route reveals its known unresolved edge, never priority or obligation | **IMPLEMENTED** |
| **Hades** | failed executor/build attempts can become blank resets or blind retries | **FAILED ATTEMPT → RETURN WITH DIFFERENCE.** A failure earns continuation only if it produces new evidence/residue; otherwise classify duplicate churn | `field-egress-reducer.mjs` recognizes explicit `FAILURE_RETURN` classes and preserves informative failures as RESIDUE while duplicate-no-new-info cannot manufacture NEXT | Emit one of `NEW_EVIDENCE / CHANGED_ASSUMPTION / NARROWED_UNKNOWN / DUPLICATE_NO_NEW_INFO` from bounded runs; the reducer carries the first three forward and suppresses blind retry for the fourth | **IMPLEMENTED CANDIDATE** |
| **Death Stranding** | tools/loadouts are often treated as inventory rather than responses to route/environment friction | **PREPARE FOR THE ROUTE, NOT FOR INVENTORY COMPLETENESS.** Body/load/world are one temporary system | BODY/FIT **LOADOUT → SET OUT → RETURN → PATINA → NEXT CUT** with mass/power/service metadata and purpose-specific kits | Add optional route-friction descriptors to a FIT loadout (`carry / weather / power / install / mobility / duration`) and show only modules whose capabilities answer those frictions; never score the body or infer medical capacity | **CURRENT HOST EXISTS / COUPLING PROPOSED** |
| **Into the Breach** | consequential actions can hide effects until after commit | **INTENT → TELEGRAPH → REVERSIBLE POSITIONING → COMMIT.** Preview effects and uncertainty before authoritative operation | FIELD held-object **FORECAST** derives effect class, native commit boundary, target, source-mutation class and reversibility from declared move metadata; native host owns commit | Keep forecasts bounded to declared action metadata; unknown side effects remain UNKNOWN rather than being predicted as certainty | **IMPLEMENTED** |
| **Hardspace: Shipbreaker** | subtraction/refactor can cut containers without understanding dependents | **DECONSTRUCTION IS A GRAPH OPERATION. CUT ORDER MATTERS.** Survey dependencies/hazards before removing structure | `field-salvage-core.mjs` + salvage audit classify CURRENT heads, donors, aliases, children and live refs; retirement never auto-deletes | Extend salvage output, when needed, from classification to a read-only cut packet: `BLOCKERS → SALVAGEABLE MECHANISM → SAFE DEPENDENT-FIRST ORDER → RETURN`; no automatic delete | **IMPLEMENTED CLASSIFIER / ORDERING PROPOSED** |
| **Terra Nil** | temporary scaffolding tends to become permanent architecture | **SUPPORT SHOULD NAME ITS DISAPPEARANCE CONDITION. SUCCESS MAY REDUCE INFRASTRUCTURE.** | `scaffold_retirement` + safe-salvage contract + FIELD contraction laws | Every temporary shim/proof surface introduced after this point names `retirement_when`; once capability has moved to its native owner, preserve receipt/provenance then remove or fold the scaffold | **CONTRACT + SALVAGE ENFORCEMENT** |

## Why these six fit together

They solve six different failure modes of one FIELD loop:

```text
OUTER WILDS     remember what changed
HADES           make failure informative
DEATH STRANDING prepare against actual terrain/friction
INTO THE BREACH see consequence before commitment
HARDSPACE       subtract without severing what still depends on it
TERRA NIL       remove the support once the capability survives without it
```

Reduced FIELD loop:

```text
KNOWN OBJECT + RESIDUE
→ PREPARE FOR FRICTION
→ PREVIEW EFFECT
→ COMMIT IN NATIVE OWNER
→ SUCCESS OR FAILURE RETURN
→ SALVAGE / RETIRE SUPPORT
→ RE-ENTER WITH KNOWLEDGE
```

## Concrete transfer state

- **Outer Wilds:** held-object residue is live; unresolved knowledge stays attached to the addressed object rather than becoming a quest aggregate.
- **Hades:** failure-return is now executable in packet egress. Informative failure becomes RESIDUE; explicitly duplicate-no-new-info failure cannot mint continuation. No automatic inference from generic failure prose.
- **Death Stranding:** BODY/FIT already has the preparation/return carrier; route-friction coupling remains the one genuinely unfinished donor in this six-set.
- **Into the Breach:** FIELD FORECAST is live and reading-only; native owner remains the commit boundary.
- **Hardspace:** conservative dependency survey/classifier is live; ordered cutting remains deliberately unautomated.
- **Terra Nil:** retirement law is active and feeds the salvage classifier; support removal remains conservative and provenance-preserving.

## Non-transfer residue

Do not import:
- quest logs, XP, streaks, scores or reputation economies;
- copyrighted visuals, fiction, dialogue, levels or branded interaction skin;
- claims of perfect information;
- life/body productivity scoring;
- automatic deletion or procurement;
- a universal "game engine" for FIELD.

## Current proof anchors

- Outer Wilds transfer is owned by FIELD's held-object `focusResidue`.
- Hades transfer is owned by `/lib/field-egress-reducer.mjs` and `tools/field-egress-reducer-selftest.mjs`.
- Into the Breach transfer is owned by the declared held-object FORECAST and `tools/field-action-aperture-selftest.mjs`.
- Hardspace + Terra Nil already produced the conservative safe-salvage classifier and self-test; `RETIRE_CANDIDATE` never grants delete authority.
- Death Stranding already donated the BODY/FIT preparation-return loop; route-friction filtering is the remaining bounded idea, not claimed as shipped.

## Stop

Do not create a GAME route, donor dashboard, game vocabulary layer or universal progression system.

The next donor transfer must name a current friction that these six do not already solve, or finish the one bounded Death-Stranding coupling still explicitly unimplemented.
