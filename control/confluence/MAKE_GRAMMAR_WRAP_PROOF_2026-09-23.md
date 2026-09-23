# MAKE GRAMMAR + WRAP PROOF — research transfer note (local AXIS → FIELD)

Status: **DONOR NOTE** (research + evidence transfer; not a head, not a new route).
Date: 2026-09-23 · landed by kestrel (Hermes read-only worker) on explicit user request.
Source lane (local, not in this repo): `~/void-anchor/AXIS/work/make-grammar/` — donor implementation + receipts.

## Submission envelope (`/control/SUBMISSION_CONTRACT.json`)

- **source_ref:** user↔kestrel session 2026-09-23 + AXIS `work/make-grammar/` (spike-001-wrap receipts)
- **intent:** give the wrap-proof / MAKE-grammar research an addressed, recoverable home in FIELD so it stops living only in chat
- **object_ref:** UNRESOLVED → host candidates below
- **contribution_class:** DONOR (+ EVIDENCE of one distinction)
- **evidence_class:** RECEIPT (selftests) + BYTES (donor source)
- **delta_or_question:** this note + the prepared spike-landing packet (AXIS `plans/01-wrap-proof-packet.md`)
- **proof_available:** node selftest 16/16; in-browser 7/7; JSON-schema validation PASS (receipts in donor lane)
- **waiting_on:** repo writer for the runnable spike (packet ready; numbering below)
- **residue:** physical fit untested; second schema consumer not yet found (falsifier F1)

## What exists (verified 2026-09-23, donor lane)

1. **Runnable wrap proof** — plane → cylinder → torus in exactly two operations:
   - `IDENTIFY` (topology): declare the two side edges one edge; adjacency wraps; metric untouched (strain before = after = 0).
   - `DEFORM / EMBED` (geometry): TUBE = developable (max edge strain ≈ 0); DONUT k=3 → measured max strain ≈ R/B = 0.333, closure gap ≈ 1e-15. First-order edge metric, central difference h=1e-4. **Physical fit NOT inferred.**
   - Reproduce: `node ~/void-anchor/AXIS/work/make-grammar/spike-001-wrap/selftest.mjs` (16/16); open `spike-001-wrap/index.html?selftest=1` (7/7).
2. **The law it makes executable:** `IDENTIFY ≠ DEFORM`; `TOPOLOGY ≠ GEOMETRY ≠ EMBEDDING`. A quotient is not a bend; a cylinder is not a torus.
3. **Candidate object grammar (throwaway until a second consumer):** `MAKE.schema.json` + `MAKE-EXAMPLE-wrap-proof.json` (validates under draft 2020-12) + spec `MAKE-SCHEMA-0.1.md`. Mapping — one spine only: MAKE object ↔ `kernel/INTERPHASE.schema.json` canonicalObject; each operation ↔ an INTERPHASE event; projections / RETURN reuse existing shapes.
4. **Falsifiers documented** (AXIS `COUNTERFACTUALS-2026-09-23.md`, F1–F6) — kill/shrink rules incl. “no second consumer in 2 material moves → demote schema to donor note”.

## Relation to in-flight work

- `control/confluence/INTERPHASE_EXTENSION_2026-09-23.md` §“Physical MAKE consequence” (in flight; uncommitted at writing) states the same host protocol can address physical objects once the host supplies identity / relations / measured state / lawful operations / irreversible-effect boundaries. This donor is the first **runnable witness** under that sentence.
- `control/confluence/INTERPHASE_ROOM_CONVERGENCE_2026-09-22.md`: ROOM is a projection, not the kernel — consistent: cube / ring / mandala / cylinder stay lawful projections; IDENTIFY / DEFORM are transformations underneath.

## Host candidates (FIELD resolution)

- `/foundry/` — MAKE/RETURN gateway + room lineage (`foundry/room/space-core.js` already treats ports / dock / composites as executable).
- `/fold-bloom/` — FIELD LAB + convergence docs (INTERPHASE extension convergence).
- `/spikes/` — runnable-proof form (copy shape from `spikes/003-one-instrument/`).

## Next bounded mutation (packet ready)

`spikes/00N-wrap-proof/` per AXIS `plans/01-wrap-proof-packet.md` (wrap-core.js + selftest.mjs + index.html + README + route registration + FI touch in the same change). Numbering: `005` is reserved by the union-page packet; whichever lands first takes 005, this takes 006.

## Stop / does not claim

Not a head; no new route / core / schema promotion; no physical or continuum-embedding claims; no operator alphabet beyond IDENTIFY / DEFORM in the spike. Do not build a dashboard around this.