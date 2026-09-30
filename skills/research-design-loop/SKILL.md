---
name: research-design-loop
description: Run one bounded research → hypothesis → specimen → evidence → disposition loop against a current CONFLUENCE/FIELD head.
version: 0.3.0
platforms: [macos, linux]
metadata:
  hermes:
    tags: [research, design-engineering, experiment, confluence]
    category: research
    requires_toolsets: [terminal, file]
---

# RESEARCH DESIGN LOOP

## Trigger

Use when:
- a current head has an important uncertainty;
- the user asks to explore, experiment, evolve, make delightful, or pursue a hypothesis;
- several plausible interaction/design directions exist and implementation would benefit from evidence;
- a proposed mechanism should be tested before it becomes architecture.

Do not use for:
- a known bounded bug fix;
- straightforward content change;
- pure archaeology;
- tasks already waiting on human/world evidence.

## Invariant

One loop must answer one question well enough to change the next decision.

The loop is:

`RECOVER → QUESTION → HYPOTHESIS → SPECIMEN → ENCOUNTER → EVIDENCE → DISPOSITION → RETURN`

## Procedure

1. Read current authority:
   - `control/CURRENT.json`
   - `control/QUEUE.json`
   - `control/WAITING.json`
   - exact recipient files
   - active branches/PRs/workers.

2. Recover only relevant lineage:
   - strongest donor;
   - nearest prior attempt;
   - explicit user dissatisfaction/desire;
   - source-of-truth boundaries.

3. State:
   - OBJECT
   - QUESTION
   - HYPOTHESIS
   - FALSIFIER
   - BASELINE

4. Choose one specimen:
   - existing host mutation preferred;
   - isolated route/spike if host mutation would create sovereignty;
   - primitives first;
   - deterministic fixture where possible;
   - no unrelated feature work.

5. Define evidence before implementing:
   - machine checks;
   - lived-use check;
   - comparison against baseline;
   - stop condition.

6. Implement the smallest convincing specimen.

7. Run machine checks.

8. If lived use is available, perform/observe it.
   If not, state exactly:
   `ARCHITECTURAL EVIDENCE ONLY — LIVED GATE OPEN`.

9. Decide one disposition:
   - PROMOTE
   - TRANSFER
   - PARK
   - COMPOST
   - RECOVER

10. Write a bounded RETURN if the loop materially changed a head or reusable mechanism.

11. Re-read CURRENT before any second loop.

## External donor / transcript gate

Use this gate when a research loop begins from an external paper, talk, podcast, video, transcript, benchmark report or model review.

The external source is a **donor projection**, not authority over the current host.

Preserve this evidence order:

1. original artifact / paper / code / benchmark / specification;
2. creator-published transcript, captions or show notes;
3. secondary transcript / summary / review;
4. current inference.

Record source identity, publication date and useful timestamps/sections. A transcript may preserve words while still being a derived representation; it does not become source identity.

Classify the source role before extracting:

- **MECHANISM** — near-primary technical material that exposes a transferable operation or falsifiable claim;
- **SCOUT** — fast news/review material used to locate primary artifacts, tests or implementation details;
- **SYNTHESIS** — broad interview/discussion material used to recover heuristics, failure modes and cross-domain questions.

Role never raises evidence class.

Run external material through:

```
SOURCE
→ CLAIM
→ PRIMARY REF
→ REPLICA
→ TRANSFER TEST
→ DISPOSITION
→ RETURN
```

Do not summarize whole channels. Extract only claims that can change one current decision or test.

### Executable admission check

For a machine-readable donor packet, run:

`node tools/research-donor-gate.mjs <packet.json>`

The gate returns `allowed`, `max_disposition`, and explicit `blockers`. It is an evidence gate only: even a passing `TRANSFER` / `PROMOTE` request remains subject to the native host's authority and cannot mint effect permission.

A promotion-shaped request fails closed to `PARK` unless it has a primary reference, baseline, falsifier, passing bounded replica, passing transfer test, and evidence. Optimization claims additionally require FIXED / MUTATED / DEV_METRIC / HELD_OUT / REWARD_HACK_CHECK plus independent held-out acceptance. Representation claims additionally require exact source/address identity outside the projection, an explicit loss declaration, raw baseline, and a passing host-relation test.

`node tools/research-donor-gate-selftest.mjs` pins these boundaries against the current MLST / AI Search / Lex seed donors and positive controls.

### Stateless donor field compiler

When several admitted candidates exist, do not convert them into a backlog or let the batch choose its own priority.

Run:

`node tools/research-donor-field.mjs <batch.json>`

The input may be a JSON array or `{"donors":[...]}`. The compiler returns each donor's current evidence lane:

- `UNRESOLVED` — source / role / claim is incomplete;
- `RECOVER_PRIMARY` — the next move is primary-source recovery;
- `FRAME_TEST` — baseline, falsifier, held-out or representation contract is incomplete;
- `REPLICATE` — framing is sufficient; reproduce one named observable;
- `TRANSFER_TEST` — replica exists; test the mechanism in the named host;
- `READY` — evidence gate passes; native host review is the only lawful next move;
- `PARK` — deliberately retained without continuation.

The batch never selects a winner. To compile one explicitly selected donor into an executable evidence-debt action:

`node tools/research-donor-field.mjs <batch.json> --select "<exact SOURCE_ID>"`

The selected result emits an action packet and runs it through the existing FIELD egress reducer. An actionable selection becomes FIELD `NEXT`; explicit `PARK` becomes `ARCHIVE`. It never emits `NOW`, never raises host effect authority, and does not persist a queue.

This is the usable loop:

```
DONOR BATCH
→ EVIDENCE LANE
→ EXPLICIT SELECTION
→ ONE BOUNDED NEXT
→ REPLICA / TRANSFER EVIDENCE
→ DONOR GATE
→ HOST REVIEW
→ RETURN
```

`node tools/research-donor-field-selftest.mjs` pins the no-self-priority, PARK→ARCHIVE, evidence-debt→NEXT, and READY-without-effect-authority boundaries.

### Replicate before transfer

Before grafting a donor mechanism into FIELD:

1. name one observable the source claims or demonstrates;
2. recover the closest primary reference available;
3. reproduce or approximate that observable on a bounded local fixture;
4. compare against a baseline;
5. state the falsifier before changing the host;
6. transfer only the mechanism that survives.

If replication is impossible, disposition is **PARK** or **DONOR ONLY**, not PROMOTE.

### Optimization / self-improvement gate

For claims that an agent, harness, critic loop, prompt, reducer or scaffold “improves itself,” record:

- **FIXED** — model, tools, data/environment and versions held constant;
- **MUTATED** — harness/prompt/reducer/tool policy actually changed;
- **BASELINE** — comparison condition;
- **DEV_METRIC** — signal used to search or tune;
- **HELD_OUT** — acceptance tasks not used to tune;
- **REWARD_HACK_CHECK** — how metric-gaming or self-scoring is detected;
- **FALSIFIER** — result that would weaken the improvement claim.

A critic score produced inside the same optimization loop is development evidence unless an independent acceptance gate validates it. No held-out evidence means the result remains a donor hypothesis, not a generalized improvement claim.

### Representation-level gate

For claims about latent space, embeddings, abstraction, cache, memory or compressed state:

- preserve exact source/address identity outside the projection;
- compare at least one raw/carrier baseline with the proposed projection;
- declare what information is intentionally lossy;
- test whether the projection preserves the relation needed by the host;
- never let latent/embedding proximity mint identity, provenance or effect authority.

### Harness self-inspection gate

For agent/runtime work, record the executor's visible self-model before asking it to debug or modify its harness:

```
VISIBLE_SOURCE
VISIBLE_DOCS
VISIBLE_TOOLS
MODEL_MODE_IF_EXPOSED
AUTHORITY
MUTABLE_PATHS
RETURN_PATH
```

Unknown fields stay **UNKNOWN**. Better introspection may improve diagnosis; it does not grant new effect authority or bypass native host gates.

## Decision Rules

Prefer experiments that:
- unlock ordinary use;
- reduce control count;
- improve orientation/re-entry;
- improve communication/shareability;
- reveal causal structure;
- provide a strong falsifier;
- create external consequence.

Avoid experiments whose only result is:
- more settings;
- more routes;
- more terminology;
- more receipts;
- visual novelty without causal meaning.

## Verification

A valid loop has:
- one explicit question;
- one falsifier;
- one baseline;
- one bounded specimen;
- evidence separated into machine/lived/unknown;
- one disposition;
- one next step maximum.

## Return

Use the `VISION LOOP RETURN` structure from:
`control/prompts/HERMES_VISION_LOOP_2026-09-24.md`.

## Boundary

This skill does not authorize:
- merge;
- destructive cleanup;
- publication outside existing repo policy;
- external communication;
- credential/security change;
- physical actuation;
- purchase;
- health/medical action.

Those remain subject to the Ultra Master authority rules.
