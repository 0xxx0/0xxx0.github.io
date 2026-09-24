---
name: research-design-loop
description: Run one bounded research → hypothesis → specimen → evidence → disposition loop against a current CONFLUENCE/FIELD head.
version: 0.1.0
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
