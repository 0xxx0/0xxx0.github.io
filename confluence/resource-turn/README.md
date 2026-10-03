# Confluence Resource Turn — patch-ready specimen

## Purpose

Absorb FI-SHOP as donor tissue without reviving a standalone shopping surface.

The shared object is deliberately thin:

`HOST → ADDRESS → CONTRACT → HOLD → EVIDENCE → RETURN`

Domain truth remains in the host. FIELD only carries the addressed gap, one bounded move,
evidence references, and the resulting capability delta.

## Files

- repository root `/confluence-object.schema.json` — shared addressed instance envelope.
- `/confluence/resource-turn/resource-turn.contract.json` — a capability contract shaped to the repo's existing
  `/capability-contract.schema.json`.
- `esp32-resource-turn.held.json` — recorded ESP32-CAM power gap expressed as a FIELD hold.
- `esp32-resource-turn.return-1.json` — lawful first RETURN after inventory verification.
- `esp32-resource-turn.turn-2.json` — next bounded turn; it is intentionally *not* pre-completed.

## Why two turns?

FIELD law: one bounded move → RETURN → replan; no second move inherits authority.

So:
1. VERIFY exact board/supply/connector inventory → RETURN PARTIAL.
2. Only after replan: run the 24 h brownout test → RETURN CAPABILITY_GAINED or FAILED.

The second return must be populated from observed evidence, not from this fixture.

## Completion rule

A resource does not count because it was found, recommended, bought, or received.

It counts when RETURN can state:

> what became possible that was not possible before

and point to the evidence that establishes that delta.

## Visual lineage

`reference/` preserves two prior Confluence/FIELD atlas images as visual reference material only.
They are not runtime evidence and do not satisfy any RETURN proof gate.

- `reference/confluence-engine-atlas.jpg` — optimized repository copy of `Architectural Atlas of Eight Worlds.png`.
  Original SHA-256: `ccf7e734bf5959db9110c37e50420c1d767c2ed7d58fdad518e34aa60ef59d51`.
- `reference/confluence-design-system-atlas.jpg` — optimized repository copy of `Eight-Panel Sci-Fi Occult Atlas Montage.png`.
  Original SHA-256: `5793c463631642758cc133f13d19ab83c9672cc0cef8d31b98993fa4bc1b48c3`.

The optimized copies exist to keep the repo light while retaining the authored visual lineage.
