# REPLICA / REPLAN

Status: **BOUNDED TRANSFER / CONTROL LAW**

This packet records one mechanism transfer into the existing Field Index / CURRENT / Confluence architecture. It does **not** create a new head, runtime, planner, or ontology.

## Source event

A reconstruction test compared two implementations generated from the same durable source packet:

- a monolithic reconstruction over a generalized append-only event/state substrate;
- an explicit Director → Worker → Critic reconstruction.

The monolithic reconstruction better preserved general capability: arbitrary CAPTURE, stable identities, source-only evidence selection, bounded RUN, RETURN creation, compensating reversal, persistence/export and replay. The directed reconstruction was clearer about one useful control behavior: after executing one step it forced an explicit replan before another step could execute.

## Transfer

**Keep the generalized substrate. Transfer only the forced replan gate.**

```
SELECT
→ EXECUTE ONE BOUNDED MOVE
→ MEASURE / OBSERVE
→ RETURN
→ REPLAN FROM RETURNED STATE
```

No second move inherits authority merely because it was already on a route.

A RETURN may carry candidate next routes. Those routes are **attention proposals**, not execution permission.

## Reconstruction gate

For a mechanism that claims to be reusable:

1. redact or hide the final artifact/result;
2. preserve only the durable source/spec/state/evidence that is supposed to carry the mechanism;
3. ask a fresh process to reconstruct the essential behavior;
4. compare behavior, invariants and failure modes;
5. promote only what survives.

This is stronger than prose agreement. A persuasive description can hide a scripted specimen; reconstruction exposes whether the mechanism actually lives in durable state.

## Placement

- **FIELD INDEX** — shows the MOVE GATE but remains orientation, not execution authority.
- **CURRENT** — owns the execution contract and next selected action.
- **CONFLUENCE** — stores this as bounded cross-lineage transfer evidence.
- **RETURN** — closes the just-executed move and supplies evidence for replanning.
- **QUEUE / human selection** — may propose the next move only after RETURN.

## Non-transfer

Do not import:

- the five-view demo taxonomy as canon;
- Director / Worker / Critic personas as mandatory architecture;
- hard-coded task templates;
- localStorage as an architectural requirement;
- a new planner/runtime merely to represent this law.

## Adoption test

The transfer earns promotion only when an existing live lineage can show:

```
same generalized substrate
+ forced RETURN → REPLAN gate
= less accidental route continuation
without losing capture, reversibility, replay or portability
```

Until then, the law is useful and active at the control level, while agent-role choreography remains experimental.

## RETURN

**GAIN** — separates durable capability from elegant scripted control; adds an explicit authority boundary between moves.

**LOSS** — no claim that forced replanning improves every task; no promotion of multi-agent choreography.

**RESIDUE** — test the gate inside an existing live lineage rather than building a dedicated experiment app.

**NEXT** — use the next bounded repository or HUMAN PORT action as the first natural trial: execute once, RETURN, then choose again from returned state.
