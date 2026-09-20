# CURRENT — 2026-09-20

**Mode:** execute → prove → return.

## Delta since recovery

Recovery remains sealed. The active work moved through two additional gates:

1. **INGEST V0.1 — DONE**
   - Existing read-only scanner was exercised on a bounded Library staging batch.
   - A Linux portability defect in v0.1 was found before source mutation: GNU `stat -f` silently emitted filesystem information.
   - Scanner hardened to v0.2: explicit BSD/GNU stat paths, no `eval`, deterministic rows, and a hard refusal to write reports inside the scanned source tree.
   - Valid proof: **7 files / 6 byte objects / 1 exact duplicate fixture group / 0 source mutations**.
   - Semantic overlay: **7 tagged records / 6 route proposals / 1 intentional REVIEW_CONFLICT**.

   Receipt: [INGEST_RUN_2026-09-20.json](./INGEST_RUN_2026-09-20.json)

2. **REPRESENTATION 01 — DONE**
   - `state_transform_instrument_v0_3.html` and its README remain two exact byte objects but now compose one semantic artifact identity: `artifact:state-transform-instrument:v0.3`.
   - Print template/build notes are same-lineage siblings, not duplicates.
   - Current [/foundry/axial/](../foundry/axial/) remains a later unequal head, not falsely equated to the donor bytes.

   Object: [REPRESENTATION_01.json](./REPRESENTATION_01.json)

## Active fronts

- **Repo/recovery:** maintenance only; solved families stay closed.
- **Ingest:** proved substrate; repeat on real local ingress when filesystem access exists.
- **Reality / House / Print:** **NEXT NOW**.

## I/O lens

The root FIELD INDEX now has two lawful readings of the same surfaces: **CAPABILITY** and **I/O**. I/O exposes what enters, what exits, and which world-facing path is available/candidate/blocked. Private canon extends this to adapters, House G3, READFIELD, AXIAL physicalization, ENV0 and future observed tools/zones.

Query grammar: **PRODUCES / CONSUMES / CONNECT / REIFY / VERIFY / BOTTLENECK / SALVAGE / MOVE / RETURN**.

A physical RETURN is simply the minimum evidence that a real-world action happened; its next job is to seed the first observed physical row in FIELD INDEX.

## NEXT

Produce **one actual physical/print RETURN**. Preferred bounded candidates already indexed:

- AXIAL print template + build notes; or
- ENV0 P0 A3 build sheet.

Required receipt: **before → instantiate/use → after → evidence → residue → next**.

A render, plan, or another interface does not count as the physical receipt.

Machine state: [CURRENT.json](./CURRENT.json) · Queue: [QUEUE.json](./QUEUE.json)
